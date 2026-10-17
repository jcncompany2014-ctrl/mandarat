// 단축어 · Siri(V3-B)가 읽고 쓰는 '오늘' — 위젯과 같은 App Group 타임라인(expo-widgets가 저장한 배열)을 그대로 쓴다.
// 앱(WidgetSync)이 8칸(지금 + 다음 자정 7번)을 쓰고, 위젯 버튼과 Siri는 그 칸의 props.ops에 덧붙인다.
// 앱이 다음에 앞으로 나올 때 ops를 읽어 문서에 반영하고 타임라인을 다시 쓴다(src/hosts/WidgetSync.tsx, src/lib/widgetOps.ts).
// 열쇠와 모양은 src/lib/contracts.ts(APP_GROUP · WIDGET_TIMELINE_KEY · TodayWidgetProps · WidgetOp) — tests/shortcuts.test.js가 지킨다.
import Foundation
import WidgetKit

/// 타임라인 한 칸(props)에서 읽은 오늘 — 쓸 때는 index 칸을 고쳐 다시 저장한다
struct TodaySnapshot {
  let index: Int
  let props: [String: Any]
  let day: String
  let items: [[String: Any]]
  let done: Int
  let total: Int
  let more: Int
  let lines: [String: String]

  var left: Int { max(0, total - done) }

  /// 아직 안 한 첫 줄(위젯 목록은 남은 것부터 늘어선다)
  var firstUndone: [String: Any]? { items.first { ($0["d"] as? Bool) != true } }

  /// 집중할 수 있는 첫 줄 — 할 일 칸('ti-ai')만, 덤(x:<id>)은 빼고
  var firstUndoneAction: [String: Any]? {
    items.first { ($0["d"] as? Bool) != true && TodayStore.isActionKey($0["k"] as? String ?? "") }
  }

  /// lines의 틀('{n}' · '{t}')을 채운다
  func line(_ key: String, n: Int? = nil, t: String? = nil) -> String {
    var s = lines[key] ?? ""
    if let n { s = s.replacingOccurrences(of: "{n}", with: String(n)) }
    if let t { s = s.replacingOccurrences(of: "{t}", with: t) }
    return s
  }
}

enum TodayRead {
  case ok(TodaySnapshot)
  /// 타임라인이 없다(앱을 아직 안 열었거나 온보딩 전) — "open_app_first"
  case missing
  /// 가장 새 칸이 오늘이 아니다(앱을 7일 넘게 안 열었다) — "open_app_first"
  case stale
}

enum TodayStore {
  static let appGroup = "group.com.jcncompany.mandarat"
  static let widgetKind = "TodayWidget"
  static let timelineKey = "__expo_widgets_TodayWidget_timeline"
  static let maxOps = 300

  private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  /// 'ti-ai' — 한 자리 영역 · 한 자리 칸(contracts WidgetItem.k)
  static func isActionKey(_ k: String) -> Bool {
    k.range(of: #"^\d-\d$"#, options: .regularExpression) != nil
  }

  /// 이 기기 시간대의 날짜 'YYYY-MM-DD' — 앱의 ymd()(src/lib/routine.ts)와 같은 꼴
  static func localDay(_ date: Date = Date()) -> String {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone.current
    let c = cal.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
  }

  private static func number(_ v: Any?) -> Int? {
    (v as? NSNumber)?.intValue
  }

  private static func timeline() -> [[String: Any]]? {
    defaults?.array(forKey: timelineKey) as? [[String: Any]]
  }

  /// 지금 보이는 칸 — timestamp ≤ now인 마지막 칸, 그 props.day가 오늘일 때만.
  /// 하루 지난 칸으로 남은 일을 읽거나 체크하지 않는다(앱을 7일 넘게 안 열면 가장 새 칸도 지난날이다).
  static func current(now: Date = Date()) -> TodayRead {
    guard let entries = timeline(), !entries.isEmpty else { return .missing }
    let nowMs = Int(now.timeIntervalSince1970 * 1000)
    var found: (Int, [String: Any])?
    for (i, entry) in entries.enumerated() {
      guard let ts = number(entry["timestamp"]), ts <= nowMs, let props = entry["props"] as? [String: Any] else { continue }
      found = (i, props)
    }
    guard let hit = found else { return .stale }
    let index = hit.0, props = hit.1
    guard let day = props["day"] as? String, day == localDay(now) else { return .stale }
    let rawLines = props["lines"] as? [String: Any] ?? [:]
    var lines: [String: String] = [:]
    for (k, v) in rawLines { if let s = v as? String { lines[k] = s } }
    return .ok(TodaySnapshot(
      index: index,
      props: props,
      day: day,
      items: props["items"] as? [[String: Any]] ?? [],
      done: number(props["done"]) ?? 0,
      total: number(props["total"]) ?? 0,
      more: number(props["more"]) ?? 0,
      lines: lines
    ))
  }

  /// 위젯 버튼과 같은 op 한 줄(contracts WidgetOp) — src는 늘 'siri'
  static func op(kind: String, k: String, on: Bool, day: String, t: String, at: Date = Date()) -> [String: Any] {
    ["kind": kind, "k": k, "on": on, "day": day, "at": Int(at.timeIntervalSince1970 * 1000), "t": t, "src": "siri"]
  }

  /// snapshot의 칸에 op를 덧붙여(마지막 300개 — 위젯 버튼의 OPS_MAX와 같다, R-1 F5) 다시 쓴다. checked가 있으면 그 줄을 했음으로, done을 하나 올린다.
  /// 쓰기 바로 전에 다시 읽는다 — 그 사이 위젯 버튼이나 앱이 쓴 것을 덮지 않게.
  @discardableResult
  static func appendOp(_ op: [String: Any], to snapshot: TodaySnapshot, checked: String? = nil) -> Bool {
    guard let defaults, var entries = timeline(), entries.indices.contains(snapshot.index) else { return false }
    var entry = entries[snapshot.index]
    guard var props = entry["props"] as? [String: Any], (props["day"] as? String) == snapshot.day else { return false }
    if let checked {
      var items = props["items"] as? [[String: Any]] ?? []
      var changed = false
      for i in items.indices where (items[i]["k"] as? String) == checked && (items[i]["d"] as? Bool) != true {
        items[i]["d"] = true
        changed = true
      }
      if changed {
        props["items"] = items
        let total = number(props["total"]) ?? 0
        props["done"] = min(total, (number(props["done"]) ?? 0) + 1)
      }
    }
    var ops = props["ops"] as? [[String: Any]] ?? []
    ops.append(op)
    props["ops"] = Array(ops.suffix(maxOps))
    entry["props"] = props
    entries[snapshot.index] = entry
    defaults.set(entries, forKey: timelineKey)
    return true
  }

  static func reload() {
    WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
  }
}
