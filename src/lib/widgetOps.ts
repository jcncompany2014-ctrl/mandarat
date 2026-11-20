// 위젯·Siri가 남긴 체크(ops)를 문서에 옮길 명령으로 바꾼다(순수) — 손잡이는 src/hosts/WidgetSync.tsx.
// - 같은 (k, at)은 한 번만, 시각(at) 순으로. 같은 칸·같은 날에 여러 번 눌렀으면 마지막 것(on)이 바라는 모습이다.
// - 지금 문서와 견주어 다른 것만 명령으로 낸다. 그래서 같은 ops를 두 번 읽어도(쓰기 전에 늘 읽는다) 두 번째는 아무것도 하지 않는다.
// - 지난 날의 ops(앱을 그날 열지 않았다) — 습관은 정한 날(since) ~ 어제의 그날 체크로 옮긴다.
//   한 번 · 쌓기 · 직접 추가한 할 일은 타임라인이 담는 날 수(STALE_DAYS) 안의 것만, 모두 체크한 그날의 기록으로:
//   한 번은 그날 달성(checkOnceOn), 쌓기는 그날에 한 번(step) 더하기(켬일 때만), 직접 추가한 할 일은 아직 오늘 목록에
//   남아 있을 때 그날 끝낸 것으로(checkExtraOn — 끝내지 않은 것은 날을 넘어 남는다). 위젯이 이미 한 것으로 그려 보였다.
//   앱을 연 날의 기록으로 넣지 않는다 — 목요일 밤의 체크가 금요일 아침의 '오늘 다 했어요'가 되고 목요일은 빈 날이 된다.
// - 모르는 칸 · 글이 없는 칸 · 마음가짐은 버린다.
import type { MandaratDoc } from '../types';
import type { WidgetOp } from './contracts';
import { toggleCellDone } from './history';
import { doneOn, doneToday, extraLogKey, kindOf, setDayLog, ymd } from './routine';
import { addDays, countInfo } from './kinds';
import { WIDGET_DAYS, WIDGET_URL } from './widgetSnapshot';

export type WidgetCommand =
  /** 목록의 체크 — 한 번 · 쌓기 · 오늘의 습관(useActions().checkToday) */
  | { kind: 'checkToday'; ti: number; ai: number }
  /** 지난 날의 습관 체크(useActions().toggleHabitOn) */
  | { kind: 'toggleHabitOn'; ti: number; ai: number; day: string }
  /** 지난 날의 쌓기 — 그날 기록에 더한다(useActions().addCountOn) */
  | { kind: 'addCountOn'; ti: number; ai: number; delta: number; day: string }
  /** 지난 날에 달성한 한 번 — 그날 기록에 남긴다(useActions().checkOnceOn) */
  | { kind: 'checkOnceOn'; ti: number; ai: number; day: string }
  /** 직접 추가한 할 일(useActions().toggleExtra) */
  | { kind: 'toggleExtra'; id: string }
  /** 지난 날에 끝낸 직접 추가한 할 일 — 그날 기록에 남기고 오늘 목록에서 뺀다(useActions().checkExtraOn) */
  | { kind: 'checkExtraOn'; id: string; day: string }
  /** 집중 타이머 열기(useUIActions().startFocus) */
  | { kind: 'focus'; ti: number; ai: number }
  /** 앱의 한 곳 열기 — 지금은 오늘(useUIActions().go('today')) */
  | { kind: 'open'; url: string };

type OpsDoc = Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayExtra'>;

const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const CELL_RE = /^([0-7])-([0-7])$/;
const OP_KINDS: readonly WidgetOp['kind'][] = ['check', 'focus', 'open'];
/** 지난 날의 한 번 · 쌓기 · 직접 추가한 할 일을 들이는 날 수 — 타임라인이 담는 날(지금 + 다음 자정 WIDGET_DAYS - 1번)만큼 */
export const STALE_DAYS = WIDGET_DAYS - 1;

/** op 하나를 가리키는 열쇠 — 같은 누름이 두 번 읽혀도 한 번만 */
export function opId(op: Pick<WidgetOp, 'k' | 'at'>): string {
  return `${op.k}@${op.at}`;
}

/** 다른 프로세스(위젯·Siri)가 쓴 값이라 모양부터 확인한다 */
function validOp(op: unknown): op is WidgetOp {
  if (!op || typeof op !== 'object') return false;
  const o = op as Partial<WidgetOp>;
  return (
    OP_KINDS.includes(o.kind as WidgetOp['kind']) && typeof o.k === 'string' && typeof o.on === 'boolean' &&
    typeof o.day === 'string' && typeof o.at === 'number' && Number.isFinite(o.at)
  );
}

/** 'ti-ai' → 글이 있는 칸, 아니면 null */
function cellOf(doc: OpsDoc, k: string) {
  const m = CELL_RE.exec(k);
  if (!m) return null;
  const ti = Number(m[1]);
  const ai = Number(m[2]);
  const a = doc.themes[ti]?.actions[ai];
  return a && a.text.trim() ? { ti, ai, a } : null;
}

/**
 * ops → 순서대로 돌릴 명령. today: 지금(기기 시계).
 * seen: 이미 돌린 집중 · 열기 op의 opId — 상태와 견줄 수 없는 것이라 앱이 기억해 두고 다시 돌리지 않는다.
 */
export function planOps(ops: readonly unknown[], doc: OpsDoc, today: Date, seen: ReadonlySet<string> = new Set()): WidgetCommand[] {
  const tk = ymd(today);
  // 같은 (k, at)은 하나만 — 앞의 것을 남긴다
  const byId = new Map<string, { op: WidgetOp; i: number }>();
  ops.forEach((op, i) => {
    if (validOp(op) && !byId.has(opId(op))) byId.set(opId(op), { op, i });
  });
  const sorted = [...byId.values()].sort((x, y) => x.op.at - y.op.at || x.i - y.i).map((x) => x.op);

  // 같은 칸·같은 날의 체크는 마지막 것만, 집중·열기는 가장 늦은 하나만
  const lastCheck = new Map<string, WidgetOp>();
  let focus: WidgetOp | null = null;
  let open: WidgetOp | null = null;
  for (const op of sorted) {
    if (op.kind === 'check') {
      const key = `${op.k}|${op.day}`;
      lastCheck.delete(key); // 다시 넣어 맨 뒤(가장 늦은 시각)로
      lastCheck.set(key, op);
    } else if (op.kind === 'focus') focus = op;
    else open = op;
  }

  // 날에 묶이지 않는 것(한 번 · 직접 추가한 할 일)은 날이 달라도 칸마다 가장 늦은 하나만 — 어제 켜고 오늘 끄면 끈 것.
  // 버릴 것(앞날 · 날짜가 아닌 것 — 시계를 되돌린 기기)은 견주지 않는다: 그것이 더 늦어도 오늘의 체크를 가리지 않게
  const lastOfKey = new Map<string, number>();
  for (const op of lastCheck.values()) {
    if (DAY_RE.test(op.day) && op.day <= tk && op.at >= (lastOfKey.get(op.k) ?? -Infinity)) lastOfKey.set(op.k, op.at);
  }
  // 그 칸을 켠 채로 둔 것이 시작된 날 — 한 번 · 직접 추가한 할 일을 한 날이다. 목요일에 켜고 금요일에 또 켰으면 목요일:
  // 앱을 열지 않으면 위젯의 다음 날 칸은 어제 켠 것을 다시 안 한 것으로 그려서(미리 써 둔 칸) 한 번 더 누르게 된다
  const onSince = new Map<string, string>();
  for (const op of sorted) {
    if (op.kind !== 'check' || !DAY_RE.test(op.day) || op.day > tk) continue;
    if (!op.on) onSince.delete(op.k);
    else if (!onSince.has(op.k)) onSince.set(op.k, op.day);
  }
  const out: { at: number; cmd: WidgetCommand }[] = [];
  for (const op of lastCheck.values()) {
    const cmd = checkCommand(op, doc, tk, lastOfKey.get(op.k) === op.at, onSince.get(op.k) ?? op.day);
    if (cmd) out.push({ at: op.at, cmd });
  }
  if (focus && focus.day === tk && !seen.has(opId(focus))) {
    const c = cellOf(doc, focus.k);
    if (c) out.push({ at: focus.at, cmd: { kind: 'focus', ti: c.ti, ai: c.ai } });
  }
  if (open && open.day === tk && !seen.has(opId(open))) out.push({ at: open.at, cmd: { kind: 'open', url: WIDGET_URL } });
  return out.sort((x, y) => x.at - y.at).map((x) => x.cmd);
}

/**
 * 체크 하나 — 지금 모습과 다를 때만 명령.
 * since: 그 칸을 켠 채로 둔 것이 시작된 날(planOps onSince) — 한 번 · 직접 추가한 할 일의 켬은 그날의 기록이 된다
 */
function checkCommand(op: WidgetOp, doc: OpsDoc, tk: string, latest: boolean, since: string): WidgetCommand | null {
  // 앞날 · 날짜가 아닌 것은 버린다. 지난 날은 습관 밖에는 STALE_DAYS 안의 것만
  if (!DAY_RE.test(op.day) || op.day > tk) return null;
  const recent = op.day >= addDays(tk, -STALE_DAYS);
  if (op.k.startsWith('x:')) {
    if (!recent || !latest) return null;
    const id = op.k.slice(2);
    const x = doc.todayExtra.find((e) => e.id === id);
    if (!x || x.done === op.on) return null;
    // 지난 날에 끝낸 것은 그날의 기록으로. 오늘 켠 것 · 끔은 목록의 체크 그대로(끝낸 채 목록에 있는 것은 오늘 끝낸 것이다)
    return op.on && since < tk ? { kind: 'checkExtraOn', id, day: since } : { kind: 'toggleExtra', id };
  }
  const c = cellOf(doc, op.k);
  if (!c) return null;
  const kind = kindOf(c.a);
  if (kind === 'mind') return null;
  // 한 번 — 달성은 날에 묶이지 않아 칸마다 가장 늦은 것만 본다. 지난 날에 켠 것은 그날의 기록으로,
  // 오늘 켠 것 · 끔은 목록의 체크로(끔은 달성을 남겼던 날의 기록을 뺀다 — history.toggleCellDone)
  if (kind === 'once') {
    if (!latest || !recent || !!c.a.done === op.on) return null;
    return op.on && since < tk ? { kind: 'checkOnceOn', ti: c.ti, ai: c.ai, day: since } : { kind: 'checkToday', ti: c.ti, ai: c.ai };
  }
  if (op.day === tk) return doneToday(doc, c.a, op.k, tk) !== op.on ? { kind: 'checkToday', ti: c.ti, ai: c.ai } : null;
  // 지난 날 — 습관은 정한 날 ~ 어제
  if (kind === 'habit') {
    if (c.a.since && op.day < c.a.since) return null;
    return doneOn(doc.dayLog, op.k, op.day) !== op.on ? { kind: 'toggleHabitOn', ti: c.ti, ai: c.ai, day: op.day } : null;
  }
  if (!recent) return null;
  // 쌓기 — 위젯의 체크는 한 번(step) 더하기. 그날 아직 더한 게 없을 때 켬만 들인다(그날 것을 되돌리는 끔은 버린다)
  const info = countInfo(c.a, op.day);
  return op.on && info.today === 0 ? { kind: 'addCountOn', ti: c.ti, ai: c.ai, delta: info.step, day: op.day } : null;
}

/**
 * 지난 날(day)에 위젯 · Siri에서 달성한 '한 번'을 그날의 기록으로 넣은 새 문서(저장소 checkOnceOn).
 * 달성은 day의 기록에 남고, 직접 담아 둔 칸이면 오늘 목록에서 뺀다 — 그날 앱에서 체크했다면 다음 날의 하루 정리가 했을 일이다
 * (남겨 두면 오늘 한 것으로 세어 오늘이 '다 했어요'가 된다). 마감이 다가와 저절로 담긴 칸은 오늘 기록이 없어 스스로 빠진다.
 * day가 오늘이면 목록의 체크와 같다. 이미 달성 · 한 번이 아닌 칸 · 글이 없는 칸 · 앞날 · 날짜가 아니면 그대로(같은 객체).
 */
export function checkOnceOn<T extends Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys'>>(doc: T, ti: number, ai: number, day: string, todayKey: string): T {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || !a.text.trim() || kindOf(a) !== 'once' || a.done || !DAY_RE.test(day) || day > todayKey) return doc;
  const next = toggleCellDone(doc, ti, ai, day);
  const key = `${ti}-${ai}`;
  return day < todayKey && next.todayKeys.includes(key) ? { ...next, todayKeys: next.todayKeys.filter((k) => k !== key) } : next;
}

/**
 * 지난 날(day)에 위젯 · Siri에서 끝낸 직접 추가한 할 일을 그날의 기록으로 넣은 새 문서(저장소 checkExtraOn).
 * 기록은 day에 남기고 오늘 목록에서는 뺀다 — 끝낸 할 일은 날을 넘기며 빠진다(하루 정리와 같게). day가 오늘이면 한 것으로 목록에 남는다.
 * 없는 할 일 · 이미 끝낸 것 · 앞날 · 날짜가 아니면 그대로(같은 객체).
 */
export function checkExtraOn<T extends Pick<MandaratDoc, 'dayLog' | 'todayExtra'>>(doc: T, id: string, day: string, todayKey: string): T {
  const x = doc.todayExtra.find((e) => e.id === id);
  if (!x || x.done || !DAY_RE.test(day) || day > todayKey) return doc;
  const todayExtra = day < todayKey ? doc.todayExtra.filter((e) => e.id !== id) : doc.todayExtra.map((e) => (e.id === id ? { ...e, done: true } : e));
  return { ...doc, todayExtra, dayLog: setDayLog(doc.dayLog, extraLogKey(x.ti, x.id), day, true) };
}
