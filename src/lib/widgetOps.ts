// 위젯·Siri가 남긴 체크(ops)를 문서에 옮길 명령으로 바꾼다(순수) — 손잡이는 src/hosts/WidgetSync.tsx.
// - 같은 (k, at)은 한 번만, 시각(at) 순으로. 같은 칸·같은 날에 여러 번 눌렀으면 마지막 것(on)이 바라는 모습이다.
// - 지금 문서와 견주어 다른 것만 명령으로 낸다. 그래서 같은 ops를 두 번 읽어도(쓰기 전에 늘 읽는다) 두 번째는 아무것도 하지 않는다.
// - 오늘이 아닌 날의 ops는 버린다 — 단, 습관을 정한 날(since) ~ 오늘 사이의 습관은 그날 체크로 옮긴다.
// - 모르는 칸 · 글이 없는 칸 · 마음가짐은 버린다.
import type { MandaratDoc } from '../types';
import type { WidgetOp } from './contracts';
import { doneOn, doneToday, kindOf, ymd } from './routine';
import { WIDGET_URL } from './widgetSnapshot';

export type WidgetCommand =
  /** 목록의 체크 — 한 번 · 쌓기 · 오늘의 습관(useActions().checkToday) */
  | { kind: 'checkToday'; ti: number; ai: number }
  /** 지난 날의 습관 체크(useActions().toggleHabitOn) */
  | { kind: 'toggleHabitOn'; ti: number; ai: number; day: string }
  /** 직접 추가한 할 일(useActions().toggleExtra) */
  | { kind: 'toggleExtra'; id: string }
  /** 집중 타이머 열기(useUIActions().startFocus) */
  | { kind: 'focus'; ti: number; ai: number }
  /** 앱의 한 곳 열기 — 지금은 오늘(useUIActions().go('today')) */
  | { kind: 'open'; url: string };

type OpsDoc = Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayExtra'>;

const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const CELL_RE = /^([0-7])-([0-7])$/;
const OP_KINDS: readonly WidgetOp['kind'][] = ['check', 'focus', 'open'];

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

  const out: { at: number; cmd: WidgetCommand }[] = [];
  for (const op of lastCheck.values()) {
    const cmd = checkCommand(op, doc, tk);
    if (cmd) out.push({ at: op.at, cmd });
  }
  if (focus && focus.day === tk && !seen.has(opId(focus))) {
    const c = cellOf(doc, focus.k);
    if (c) out.push({ at: focus.at, cmd: { kind: 'focus', ti: c.ti, ai: c.ai } });
  }
  if (open && open.day === tk && !seen.has(opId(open))) out.push({ at: open.at, cmd: { kind: 'open', url: WIDGET_URL } });
  return out.sort((x, y) => x.at - y.at).map((x) => x.cmd);
}

/** 체크 하나 — 지금 모습과 다를 때만 명령 */
function checkCommand(op: WidgetOp, doc: OpsDoc, tk: string): WidgetCommand | null {
  if (op.k.startsWith('x:')) {
    if (op.day !== tk) return null;
    const id = op.k.slice(2);
    const x = doc.todayExtra.find((e) => e.id === id);
    return x && x.done !== op.on ? { kind: 'toggleExtra', id } : null;
  }
  const c = cellOf(doc, op.k);
  if (!c) return null;
  const kind = kindOf(c.a);
  if (op.day === tk) {
    if (kind === 'mind') return null;
    return doneToday(doc, c.a, op.k, tk) !== op.on ? { kind: 'checkToday', ti: c.ti, ai: c.ai } : null;
  }
  // 지난 날 — 습관을 정한 날 ~ 어제의 습관만
  if (kind !== 'habit' || !DAY_RE.test(op.day) || op.day > tk || (c.a.since && op.day < c.a.since)) return null;
  return doneOn(doc.dayLog, op.k, op.day) !== op.on ? { kind: 'toggleHabitOn', ti: c.ti, ai: c.ai, day: op.day } : null;
}
