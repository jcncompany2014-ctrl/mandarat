// iCloud 맞추기 — 기기마다 복제본 파일 하나(Sync/v1/<dev>.jsonz)를 iCloud 컨테이너의 숨은 Data 자리(Documents 밖)에
// 쓰고 읽고 지켜본다. 합치기(HLC · LWW · PN)는 모두 순수 TS(src/lib/sync*.ts)가 한다 — 여기는 파일만 옮긴다.
// JS 쪽은 modules/icloud-sync/index.ts(requireOptionalNativeModule('ICloudSync')). 설명 · 기기 확인 목록은 docs/v2/V3-F.md.
//
// 줄(queue):
// - 파일 IO와 컨테이너 주소(url(forUbiquityContainerIdentifier:) — 오래 막힐 수 있다)는 모두 이 모듈의 직렬 줄 `io`에서
//   돈다(.runOnQueue(io)). 컨테이너 주소는 main 줄에서 찾지 않는다.
// - NSMetadataQuery는 run loop가 필요해서 main 줄에서 만들고 · 시작하고 · 멈춘다.
// - io 줄은 main 줄을 기다릴 수 있지만(onMain) main 줄은 io 줄을 기다리지 않는다 — 서로 기다리다 멈추는 일이 없다.
//
// 파일 꼴: "MZ01" 4바이트 + zlib(Compression 틀, raw DEFLATE)로 누른 UTF-8 JSON(V2-F encodeReplica의 결과 그대로).
// 오류 코드: E_NO_ACCOUNT · E_BAD_NAME · E_NOT_FOUND · E_TIMEOUT · E_CORRUPT · E_IO
import CryptoKit
import ExpoModulesCore
import Foundation
import UIKit

struct ICloudStatusRecord: Record {
  @Field var available: Bool = false
  /// iCloud 계정 지문(ubiquityIdentityToken의 SHA-256 앞 16글자) — 로그인하지 않았으면 nil
  @Field var account: String? = nil
}

struct ICloudFileRecord: Record {
  /// 컨테이너 안 상대 경로 — "Sync/v1/<dev>.jsonz"
  @Field var name: String = ""
  /// 바뀐 때(ms)
  @Field var modified: Double = 0
  /// 누른 파일 크기(바이트)
  @Field var size: Double = 0
  /// 이 기기에 최신본이 내려와 있는가
  @Field var downloaded: Bool = false
}

/// main 줄에서 모은 파일 정보(줄을 건너는 값)
struct ICloudFileInfo: Sendable {
  let name: String
  let modified: Double
  let size: Double
  let downloaded: Bool
}

public class ICloudSyncModule: Module {
  static let containerId = "iCloud.com.jcncompany.mandarat"  // src/lib/contracts.ts ICLOUD_CONTAINER
  static let dir = "Sync/v1"  // src/lib/syncFile.ts REPLICA_DIR
  static let magic = Data("MZ01".utf8)
  static let downloadWait: TimeInterval = 10

  /// 파일 IO 전용 직렬 줄
  private let io = DispatchQueue(label: "com.jcncompany.mandarat.icloud-sync", qos: .utility)
  /// io 줄에서만 읽고 쓴다. 찾았을 때만 기억한다 — 나중에 로그인하면 다시 찾는다
  private var containerURL: URL?
  /// main 줄에서만
  private var query: NSMetadataQuery?
  private var queryObservers: [NSObjectProtocol] = []
  private var identityObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ICloudSync")

    Events("onChange", "onAccountChange")

    OnCreate {
      // 로그아웃 · 다른 계정 · iCloud Drive 끔 — 기억한 컨테이너를 버리고 새 상태를 알린다
      self.identityObserver = NotificationCenter.default.addObserver(
        forName: .NSUbiquityIdentityDidChange, object: nil, queue: nil
      ) { [weak self] _ in
        guard let self else { return }
        self.io.async {
          self.containerURL = nil
          let status = self.currentStatus()
          self.sendEvent("onAccountChange", ["available": status.available, "account": status.account])
        }
      }
    }

    OnDestroy {
      if let observer = self.identityObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      self.identityObserver = nil
      DispatchQueue.main.async { self.stopQuery() }
    }

    /// { available, account } — available은 계정이 있고 컨테이너를 찾았을 때만 true
    AsyncFunction("status") { () -> ICloudStatusRecord in
      let status = self.currentStatus()
      var record = ICloudStatusRecord()
      record.available = status.available
      record.account = status.account
      return record
    }.runOnQueue(io)

    /// 메타데이터 질의를 시작한다. 컨테이너를 io 줄에서 먼저 찾고(질의가 결과를 내려면 한 번은 찾아야 한다)
    /// 질의는 main 줄에서 연다. 이미 돌고 있으면 지금 가진 이름으로 onChange를 한 번 더 보낸다.
    /// 컨테이너가 없으면(로그인 안 함 · iCloud Drive 끔) false.
    AsyncFunction("start") { () -> Bool in
      guard self.resolveContainer() != nil else { return false }
      DispatchQueue.main.async { self.startQuery() }
      return true
    }.runOnQueue(io)

    AsyncFunction("stop") { () in
      self.stopQuery()
    }.runOnQueue(.main)

    /// 질의가 모은 복제본 파일 — 질의가 돌기 전(또는 모으기 전)에는 빈 배열이다
    AsyncFunction("list") { () -> [ICloudFileRecord] in
      guard let query = self.query else { return [] }
      return ICloudSyncModule.collect(query).map { info in
        var record = ICloudFileRecord()
        record.name = info.name
        record.modified = info.modified
        record.size = info.size
        record.downloaded = info.downloaded
        return record
      }
    }.runOnQueue(.main)

    /// [현재 내용, 풀리지 않은 충돌본 내용…] — 내려받기(최대 10초) → 조율된 읽기 → 풀기.
    /// 충돌본은 읽은 뒤 풀린 것으로 표시하고 지운다(합치기는 JS가 한다 — 같은 기기의 복제본끼리라 합쳐도 안전하다).
    AsyncFunction("read") { (name: String) throws -> [String] in
      return try ICloudSyncModule.guarded {
        let url = try self.fileURL(name)
        try ICloudSyncModule.download(url)
        var out = [try ICloudSyncModule.inflate(try ICloudSyncModule.coordinatedRead(url))]
        let conflicts = NSFileVersion.unresolvedConflictVersionsOfItem(at: url) ?? []
        for version in conflicts {
          // 읽지 못한 충돌본은 건너뛴다 — 그 기기가 다음에 쓸 때 같은 내용(그 이상)을 다시 올린다
          if let data = try? Data(contentsOf: version.url), let json = try? ICloudSyncModule.inflate(data) {
            out.append(json)
          }
        }
        if !conflicts.isEmpty {
          ICloudSyncModule.resolve(conflicts, of: url)
        }
        return out
      }
    }.runOnQueue(io)

    /// 누른 뒤 조율된 .forReplacing 쓰기(원자적). 앱이 뒤로 가도(V4-A가 background에서 밀어 올린다) 끝나도록
    /// UIApplication 배경 작업 안에서 돈다.
    AsyncFunction("write") { (name: String, json: String) throws in
      try ICloudSyncModule.guarded {
        let url = try self.fileURL(name)
        let data = try ICloudSyncModule.deflate(json)
        let task = BackgroundTask.begin("icloud-sync write")
        defer { task.end() }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try ICloudSyncModule.coordinatedWrite(url, options: .forReplacing) { target in
          try data.write(to: target, options: .atomic)
        }
      }
    }.runOnQueue(io)

    /// 조율된 지우기 — 없는 파일이면 그냥 끝난다
    AsyncFunction("remove") { (name: String) throws in
      try ICloudSyncModule.guarded {
        let url = try self.fileURL(name)
        try ICloudSyncModule.coordinatedWrite(url, options: .forDeleting) { target in
          do {
            try FileManager.default.removeItem(at: target)
          } catch let error as CocoaError where error.code == .fileNoSuchFile {
            // 이미 없다
          }
        }
      }
    }.runOnQueue(io)

    /// 이 기기 열쇠 — Application Support/icloud-sync/device의 UUID(처음 부를 때 만든다).
    /// 백업에서 빠진다(isExcludedFromBackup) — 앱을 고쳐 깔아도 남지만 백업 복원 · 새 폰으로 옮기기에는 따라가지 않는다.
    /// IDFV(기기 판매사 아이디) 대신 쓴다(복원 · 옮기기 때 IDFV가 어떻게 되는지는 확인할 수 없다).
    AsyncFunction("deviceKey") { () throws -> String in
      return try ICloudSyncModule.guarded { try ICloudSyncModule.loadDeviceKey() }
    }.runOnQueue(io)
  }

  // MARK: - 계정 · 컨테이너 (io 줄)

  private func currentStatus() -> (available: Bool, account: String?) {
    guard let token = FileManager.default.ubiquityIdentityToken else { return (false, nil) }
    return (resolveContainer() != nil, ICloudSyncModule.accountHash(token))
  }

  /// 컨테이너 주소 — 처음 한 번은 오래 걸릴 수 있어 io 줄에서만 부른다
  private func resolveContainer() -> URL? {
    dispatchPrecondition(condition: .onQueue(io))
    if let url = containerURL { return url }
    guard FileManager.default.ubiquityIdentityToken != nil,
          let url = FileManager.default.url(forUbiquityContainerIdentifier: ICloudSyncModule.containerId) else {
      return nil
    }
    containerURL = url
    return url
  }

  /// 이름을 검사한 뒤 컨테이너 안 주소로. 이름은 "Sync/v1/<소문자 · 숫자>.jsonz"만 받는다(경로 넘나들기 막기)
  private func fileURL(_ name: String) throws -> URL {
    guard ICloudSyncModule.isValidName(name) else {
      throw ICloudSyncModule.error("E_BAD_NAME", "Not a replica file name: \(name)")
    }
    guard let container = resolveContainer() else {
      throw ICloudSyncModule.error("E_NO_ACCOUNT", "The iCloud container is not available")
    }
    return container.appendingPathComponent(name, isDirectory: false)
  }

  static func isValidName(_ name: String) -> Bool {
    return name.range(of: #"^Sync/v1/[0-9a-z]{1,64}\.jsonz$"#, options: .regularExpression) != nil
  }

  /// 계정 지문 — 토큰을 보관 꼴(archive)로 만든 바이트의 SHA-256 앞 16글자. 계정 자체는 알 수 없다
  static func accountHash(_ token: Any) -> String? {
    guard let data = try? NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: false) else {
      return nil
    }
    let hex = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    return String(hex.prefix(16))
  }

  // MARK: - 메타데이터 질의 (main 줄)

  private func startQuery() {
    if let running = query {
      emitNames(running)
      return
    }
    let q = NSMetadataQuery()
    q.searchScopes = [NSMetadataQueryUbiquitousDataScope]
    q.predicate = NSPredicate(format: "%K LIKE %@", NSMetadataItemPathKey, "*/\(ICloudSyncModule.dir)/*.jsonz")
    let handler: (Notification) -> Void = { [weak self] _ in
      self?.emitNames(q)
    }
    let center = NotificationCenter.default
    queryObservers = [
      center.addObserver(forName: .NSMetadataQueryDidFinishGathering, object: q, queue: .main, using: handler),
      center.addObserver(forName: .NSMetadataQueryDidUpdate, object: q, queue: .main, using: handler),
    ]
    query = q
    if !q.start() {
      stopQuery()
    }
  }

  private func stopQuery() {
    for observer in queryObservers {
      NotificationCenter.default.removeObserver(observer)
    }
    queryObservers = []
    query?.stop()
    query = nil
  }

  /// 모으기를 마쳤을 때와 바뀔 때마다 — 지금 있는 복제본 이름 전부를 보낸다
  private func emitNames(_ q: NSMetadataQuery) {
    let names = ICloudSyncModule.collect(q).map { $0.name }
    sendEvent("onChange", ["names": names])
  }

  /// 질의 결과 → 파일 정보. Sync/v1 바로 아래의 올바른 이름만, 이름 차례로
  static func collect(_ q: NSMetadataQuery) -> [ICloudFileInfo] {
    q.disableUpdates()
    defer { q.enableUpdates() }
    var out: [ICloudFileInfo] = []
    for case let item as NSMetadataItem in q.results {
      guard let url = item.value(forAttribute: NSMetadataItemURLKey) as? URL else { continue }
      let parent = url.deletingLastPathComponent()
      guard parent.lastPathComponent == "v1", parent.deletingLastPathComponent().lastPathComponent == "Sync" else { continue }
      let name = "\(dir)/\(url.lastPathComponent)"
      guard isValidName(name) else { continue }
      let changed = item.value(forAttribute: NSMetadataItemFSContentChangeDateKey) as? Date
      let size = (item.value(forAttribute: NSMetadataItemFSSizeKey) as? NSNumber)?.doubleValue ?? 0
      let status = item.value(forAttribute: NSMetadataUbiquitousItemDownloadingStatusKey) as? String
      out.append(ICloudFileInfo(
        name: name,
        modified: ((changed?.timeIntervalSince1970 ?? 0) * 1000).rounded(),
        size: size,
        downloaded: status == NSMetadataUbiquitousItemDownloadingStatusCurrent
      ))
    }
    return out.sorted { $0.name < $1.name }
  }

  // MARK: - 파일 (io 줄)

  /// 최신본이 없으면 내려받기를 시작하고 최대 10초 기다린다. 시간이 다 돼도 예전 사본(.downloaded)이 있으면 그것을 읽는다
  /// — 합치기는 단조라서 예전 복제본을 읽어도 잃는 것이 없다.
  static func download(_ url: URL) throws {
    if try downloadStatus(url) == .current { return }
    try FileManager.default.startDownloadingUbiquitousItem(at: url)
    let deadline = Date().addingTimeInterval(downloadWait)
    var status = try downloadStatus(url)
    while status != .current && Date() < deadline {
      Thread.sleep(forTimeInterval: 0.25)
      status = try downloadStatus(url)
    }
    if status != .current && status != .downloaded {
      throw error("E_TIMEOUT", "Download did not finish in \(Int(downloadWait)) s")
    }
  }

  /// iCloud 파일이 아니면(로컬 파일) 있으면 .current로 본다
  static func downloadStatus(_ url: URL) throws -> URLUbiquitousItemDownloadingStatus? {
    var fresh = url
    fresh.removeAllCachedResourceValues()
    let values: URLResourceValues
    do {
      values = try fresh.resourceValues(forKeys: [.isUbiquitousItemKey, .ubiquitousItemDownloadingStatusKey])
    } catch {
      throw self.error("E_NOT_FOUND", "No replica at \(url.lastPathComponent)")
    }
    if values.isUbiquitousItem != true {
      guard FileManager.default.fileExists(atPath: url.path) else {
        throw self.error("E_NOT_FOUND", "No replica at \(url.lastPathComponent)")
      }
      return .current
    }
    return values.ubiquitousItemDownloadingStatus
  }

  static func coordinatedRead(_ url: URL) throws -> Data {
    var coordinationError: NSError?
    var result: Result<Data, Error> = .failure(error("E_IO", "Coordinated read did not run"))
    NSFileCoordinator(filePresenter: nil).coordinate(readingItemAt: url, options: [], error: &coordinationError) { target in
      result = Result { try Data(contentsOf: target) }
    }
    if let coordinationError {
      throw mapped(coordinationError)
    }
    return try result.get()
  }

  static func coordinatedWrite(_ url: URL, options: NSFileCoordinator.WritingOptions, _ body: (URL) throws -> Void) throws {
    var coordinationError: NSError?
    var inner: Error?
    NSFileCoordinator(filePresenter: nil).coordinate(writingItemAt: url, options: options, error: &coordinationError) { target in
      do {
        try body(target)
      } catch {
        inner = error
      }
    }
    if let coordinationError {
      throw mapped(coordinationError)
    }
    if let inner {
      throw mapped(inner)
    }
  }

  /// 읽은 충돌본만 풀린 것으로 표시하고 지운다 — 읽은 뒤에 새로 생긴 충돌본은 다음 읽기에서 다룬다
  static func resolve(_ versions: [NSFileVersion], of url: URL) {
    try? coordinatedWrite(url, options: .forMerging) { _ in
      for version in versions {
        version.isResolved = true
        try? version.remove()
      }
    }
  }

  static func deflate(_ json: String) throws -> Data {
    guard let packed = try? (Data(json.utf8) as NSData).compressed(using: .zlib) as Data else {
      throw error("E_IO", "Could not compress the replica")
    }
    return magic + packed
  }

  static func inflate(_ data: Data) throws -> String {
    guard data.count > magic.count, data.prefix(magic.count) == magic else {
      throw error("E_CORRUPT", "Not a replica file")
    }
    let body = Data(data.dropFirst(magic.count))
    guard let raw = try? (body as NSData).decompressed(using: .zlib) as Data,
          let json = String(data: raw, encoding: .utf8) else {
      throw error("E_CORRUPT", "Could not decompress the replica")
    }
    return json
  }

  static func loadDeviceKey() throws -> String {
    let fm = FileManager.default
    let support = try fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    var dir = support.appendingPathComponent("icloud-sync", isDirectory: true)
    var file = dir.appendingPathComponent("device", isDirectory: false)
    var excluded = URLResourceValues()
    excluded.isExcludedFromBackup = true
    if let data = try? Data(contentsOf: file),
       let text = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
       UUID(uuidString: text) != nil {
      try? dir.setResourceValues(excluded)
      return text.lowercased()
    }
    try fm.createDirectory(at: dir, withIntermediateDirectories: true)
    try dir.setResourceValues(excluded)
    let key = UUID().uuidString.lowercased()
    // 잠긴 채 깨어나도(배경) 읽을 수 있게 — 첫 잠금 해제 뒤로
    try Data(key.utf8).write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    try file.setResourceValues(excluded)
    return key
  }

  // MARK: - 오류

  static func error(_ code: String, _ description: String) -> Exception {
    return Exception(name: "ICloudSyncError", description: description, code: code)
  }

  static func mapped(_ error: Error) -> Exception {
    if let exception = error as? Exception {
      return exception
    }
    return self.error("E_IO", error.localizedDescription)
  }

  /// 몸통에서 나온 오류를 모두 JS가 읽는 코드로
  static func guarded<T>(_ body: () throws -> T) throws -> T {
    do {
      return try body()
    } catch {
      throw mapped(error)
    }
  }
}

// MARK: - 배경 작업

/// UIApplication 배경 작업 하나 — 앱이 멈춰도 쓰기가 끝나도록. id는 main 줄에서만 만진다
final class BackgroundTask: @unchecked Sendable {
  private var id: UIBackgroundTaskIdentifier = .invalid

  static func begin(_ name: String) -> BackgroundTask {
    let task = BackgroundTask()
    onMain {
      // 시간이 다 되면(expiration, main 줄) 스스로 끝낸다 — 끝내지 않으면 시스템이 앱을 죽인다
      task.id = UIApplication.shared.beginBackgroundTask(withName: name) { task.end() }
    }
    return task
  }

  func end() {
    onMain {
      guard self.id != .invalid else { return }
      UIApplication.shared.endBackgroundTask(self.id)
      self.id = .invalid
    }
  }
}

/// main 줄에서 바로 돌린다 — io 줄에서 부르면 main을 기다린다(main은 io를 기다리지 않으니 막히지 않는다)
func onMain(_ body: @MainActor () -> Void) {
  if Thread.isMainThread {
    MainActor.assumeIsolated(body)
  } else {
    DispatchQueue.main.sync { MainActor.assumeIsolated(body) }
  }
}
