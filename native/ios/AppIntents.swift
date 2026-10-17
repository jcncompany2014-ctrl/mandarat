// 단축어 · Siri(V3-B) — App Intents 넷과 AppShortcutsProvider. SDK 56 experiments.inlineModules로 본 앱 대상에 함께 컴파일된다.
// JS 다리 없이 위젯과 같은 App Group 타임라인을 읽고 쓴다(TodayStore.swift). 문서는 앱이 다음에 앞으로 나올 때 ops로 고친다.
// 제목 · 설명 · 짧은 이름 · 안내 말은 Localizable.strings 열쇠, 부르는 말은 AppShortcuts.strings(ko · ja · en, 열쇠가 같다).
// 남은 수 · 다음 할 일 · 했어요 말은 앱이 쓴 props.lines(앱 언어)를 채워 읽는다.
import Foundation
import AppIntents

@available(iOS 16.0, *)
enum SiriReply {
  /// 타임라인이 없거나 지난날이다 — 앱을 한 번 열어 오늘을 쓰게 한다
  static var openAppFirst: IntentDialog { "dialog.openAppFirst" }
  /// 위젯 목록에 안 한 줄이 안 보인다(그 밖에 n개) — 앱에서 고르게 한다
  static var openAppList: IntentDialog { "dialog.openAppList" }

  static func text(_ s: String) -> IntentDialog { "\(s)" }

  /// 남은 수 한 줄 — 0개면 다 했어요, 담은 게 없으면 빈 말
  static func left(_ s: TodaySnapshot) -> String {
    if s.total == 0 { return s.line("empty") }
    if s.left == 0 { return s.line("allDone") }
    return s.line("left", n: s.left)
  }
}

/// 오늘 보기 — 앱을 열고 '오늘'로 간다(op 'open')
@available(iOS 16.0, *)
struct ShowTodayIntent: AppIntent {
  static let title: LocalizedStringResource = "intent.showToday.title"
  static let description = IntentDescription("intent.showToday.desc")
  static let openAppWhenRun: Bool = true

  init() {}

  @MainActor
  func perform() async throws -> some IntentResult {
    if case .ok(let s) = TodayStore.current() {
      TodayStore.appendOp(TodayStore.op(kind: "open", k: "today", on: true, day: s.day, t: ""), to: s)
    }
    return .result()
  }
}

/// 오늘 남은 일 — 앱을 열지 않고 남은 수와 다음 할 일을 말한다
@available(iOS 16.0, *)
struct TodayLeftIntent: AppIntent {
  static let title: LocalizedStringResource = "intent.todayLeft.title"
  static let description = IntentDescription("intent.todayLeft.desc")
  static let openAppWhenRun: Bool = false

  init() {}

  func perform() async throws -> some IntentResult & ProvidesDialog {
    guard case .ok(let s) = TodayStore.current() else { return .result(dialog: SiriReply.openAppFirst) }
    var say = SiriReply.left(s)
    if s.left > 0, let next = s.firstUndone, let t = next["t"] as? String, !t.isEmpty {
      say += "\n" + s.line("next", t: t)
    }
    return .result(dialog: SiriReply.text(say))
  }
}

/// 다음 할 일 체크 — 안 한 첫 줄을 했음으로, 위젯을 바로 다시 그린다(op 'check', src 'siri')
@available(iOS 16.0, *)
struct CheckNextIntent: AppIntent {
  static let title: LocalizedStringResource = "intent.checkNext.title"
  static let description = IntentDescription("intent.checkNext.desc")
  static let openAppWhenRun: Bool = false

  init() {}

  func perform() async throws -> some IntentResult & ProvidesDialog {
    guard case .ok(let s) = TodayStore.current() else { return .result(dialog: SiriReply.openAppFirst) }
    if s.left == 0 { return .result(dialog: SiriReply.text(SiriReply.left(s))) }
    guard let next = s.firstUndone, let k = next["k"] as? String else { return .result(dialog: SiriReply.openAppList) }
    let t = next["t"] as? String ?? ""
    guard TodayStore.appendOp(TodayStore.op(kind: "check", k: k, on: true, day: s.day, t: t), to: s, checked: k) else {
      return .result(dialog: SiriReply.openAppFirst)
    }
    TodayStore.reload()
    let after: String
    if case .ok(let fresh) = TodayStore.current() { after = SiriReply.left(fresh) } else { after = "" }
    let say = after.isEmpty ? s.line("checked", t: t) : s.line("checked", t: t) + "\n" + after
    return .result(dialog: SiriReply.text(say))
  }
}

/// 집중 시작 — 앱을 열고 안 한 첫 할 일 칸('ti-ai')으로 집중 타이머를 켠다(op 'focus'). 없으면 '오늘'만 연다
@available(iOS 16.0, *)
struct StartFocusIntent: AppIntent {
  static let title: LocalizedStringResource = "intent.startFocus.title"
  static let description = IntentDescription("intent.startFocus.desc")
  static let openAppWhenRun: Bool = true

  init() {}

  @MainActor
  func perform() async throws -> some IntentResult {
    guard case .ok(let s) = TodayStore.current() else { return .result() }
    if let item = s.firstUndoneAction, let k = item["k"] as? String {
      TodayStore.appendOp(TodayStore.op(kind: "focus", k: k, on: true, day: s.day, t: item["t"] as? String ?? ""), to: s)
    } else {
      TodayStore.appendOp(TodayStore.op(kind: "open", k: "today", on: true, day: s.day, t: ""), to: s)
    }
    return .result()
  }
}

/// 단축어 앱 · Siri에 미리 놓이는 넷 — 부르는 말마다 앱 이름(\(.applicationName))이 들어간다
@available(iOS 16.0, *)
struct MandaratShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ShowTodayIntent(),
      phrases: ["Show Today in \(.applicationName)", "Open Today in \(.applicationName)"],
      shortTitle: "shortcut.showToday",
      systemImageName: "checklist"
    )
    AppShortcut(
      intent: CheckNextIntent(),
      phrases: ["Check off the next one in \(.applicationName)", "Mark the next one done in \(.applicationName)"],
      shortTitle: "shortcut.checkNext",
      systemImageName: "checkmark.square"
    )
    AppShortcut(
      intent: TodayLeftIntent(),
      phrases: ["What's left today in \(.applicationName)", "How many are left in \(.applicationName)"],
      shortTitle: "shortcut.todayLeft",
      systemImageName: "list.bullet"
    )
    AppShortcut(
      intent: StartFocusIntent(),
      phrases: ["Start focus in \(.applicationName)", "Start a focus timer in \(.applicationName)"],
      shortTitle: "shortcut.startFocus",
      systemImageName: "timer"
    )
  }
}
