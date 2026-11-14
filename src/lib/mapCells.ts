// 색 지도(L2 · L1) · 크게 본 블록 · 위치 표시가 함께 읽는 81칸의 값 — RN 의존 없는 순수 모듈(단위 테스트 대상).
// 칸의 자리는 theme/chart.ts의 chartCell 한 곳에서 가져온다. 색은 여기서 정하지 않는다(그리는 쪽이 토큰으로).
// docs/design/build-plan.md §3 G · §4.1(위젯의 64칸 문자열).
import { chartCell } from '../theme/chart';
import { todayItems } from './routine';
import type { MandaratDoc, Theme } from '../types';

/** 칸의 종류 — 가운데(핵심 목표) · 가운데 블록 둘레의 영역 이름(ring) · 바깥 블록 가운데의 영역 이름(head) · 실천 */
export type MapCellKind = 'core' | 'ring' | 'head' | 'action';

/** 칸의 상태 — 비었다 · 적었다 · 달성했다(실천만 달성이 있다) */
export type MapCellState = 'empty' | 'written' | 'done';

export interface MapCell {
  kind: MapCellKind;
  /** 9×9의 줄 · 칸(0~8) */
  row: number;
  col: number;
  /** 영역 번호 0~7(핵심 목표는 -1) — 색은 dye[ti] · wash[ti] … */
  ti: number;
  /** 실천 번호 0~7(실천이 아니면 -1) */
  ai: number;
  state: MapCellState;
  /** 오늘 할 일인 실천 — 색 지도는 그리지 않고(목업: 오늘 표시 없음), 크게 본 블록이 점으로 그린다 */
  today: boolean;
  /** 칸의 글 — 핵심 목표 · 영역 이름 · 실천 글(다듬지 않은 그대로) */
  text: string;
}

/** 영역 여덟만 — 화면은 문서 통째 대신 doc.themes를 넘긴다(읽기만 한다) */
export type MapThemes = { themes: readonly Theme[] };

/** 지도에 필요한 문서 조각 — 오늘을 날짜로 넘길 때만 dayLog · todayKeys가 쓰인다 */
export type MapDoc = MapThemes & Partial<Pick<MandaratDoc, 'centerGoal' | 'dayLog' | 'todayKeys'>>;

const NO_TODAY: ReadonlySet<string> = new Set();

/** 오늘 할 일 'ti-ai' — Set · 목록을 그대로, 날짜면 그날의 오늘 목록(routine.todayItems)을 센다 */
function todaySet(doc: MapDoc, today: ReadonlySet<string> | Iterable<string> | Date | null | undefined): ReadonlySet<string> {
  if (!today) return NO_TODAY;
  if (today instanceof Date) {
    const d = { themes: doc.themes as Theme[], dayLog: doc.dayLog ?? {}, todayKeys: doc.todayKeys ?? [] };
    return new Set(todayItems(d, today).map((it) => it.key));
  }
  if (today instanceof Set) return today;
  return new Set(today);
}

/** 실천 하나의 상태 — 달성이 먼저(글을 지운 달성 칸도 달성으로 칠한다, 예전 작은 표와 같다) */
export function actionState(a: { text?: string; done?: boolean } | undefined): MapCellState {
  if (!a) return 'empty';
  if (a.done) return 'done';
  return a.text?.trim() ? 'written' : 'empty';
}

/**
 * 81칸, 줄 우선(row-major: 0번이 왼쪽 위, 80번이 오른쪽 아래).
 * today: 오늘 할 일 'ti-ai'의 Set(또는 목록), 또는 날짜(그날의 오늘 목록을 센다). 없으면 오늘 표시 없음.
 */
export function mapCells(doc: MapDoc, today?: ReadonlySet<string> | Iterable<string> | Date | null): MapCell[] {
  const tk = todaySet(doc, today);
  const out: MapCell[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const c = chartCell(row, col)!;
      if (c.kind === 'core') {
        const text = doc.centerGoal ?? '';
        out.push({ kind: 'core', row, col, ti: -1, ai: -1, state: text.trim() ? 'written' : 'empty', today: false, text });
        continue;
      }
      const th = doc.themes[c.ti];
      if (c.kind === 'head') {
        const text = th?.title ?? '';
        out.push({ kind: c.block === 4 ? 'ring' : 'head', row, col, ti: c.ti, ai: -1, state: text.trim() ? 'written' : 'empty', today: false, text });
        continue;
      }
      const a = th?.actions[c.ai];
      const state = actionState(a);
      out.push({ kind: 'action', row, col, ti: c.ti, ai: c.ai, state, today: state !== 'empty' && tk.has(`${c.ti}-${c.ai}`), text: a?.text ?? '' });
    }
  }
  return out;
}

const STATE_CHAR: Record<MapCellState, string> = { empty: '0', written: '1', done: '2' };

/**
 * 81칸의 모양 열쇠(81글자, 줄 우선) — 실천은 0 빈 칸 · 1 적은 칸 · 2 달성, 핵심 목표 C · 둘레 이름 R · 바깥 이름 H.
 * 색 지도의 칸들은 이 열쇠가 같으면 다시 셀 필요가 없다(이름 · 목표 글은 따로 본다). memo의 비교 값.
 */
export function mapKey(doc: MapThemes): string {
  let s = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const c = chartCell(row, col)!;
      if (c.kind === 'core') s += 'C';
      else if (c.kind === 'head') s += c.block === 4 ? 'R' : 'H';
      else s += STATE_CHAR[actionState(doc.themes[c.ti]?.actions[c.ai])];
    }
  }
  return s;
}

/**
 * 실천 64칸의 상태(64글자, 영역 우선: ti * 8 + ai) — 0 빈 칸 · 1 적은 칸 · 2 달성.
 * 위젯 스냅숏(TodayWidgetProps.cells, build-plan §4.1)이 이 문자열을 그대로 싣는다.
 */
export function actionStates(doc: MapThemes): string {
  let s = '';
  for (let ti = 0; ti < 8; ti++) {
    for (let ai = 0; ai < 8; ai++) s += STATE_CHAR[actionState(doc.themes[ti]?.actions[ai])];
  }
  return s;
}

/** 블록(바깥 블록은 영역 번호 0~7, 가운데 블록은 'core')의 아홉 칸 — 블록 안 자리(0~8, 줄 우선) 순서 */
export function blockCells(cells: readonly MapCell[], block: number | 'core'): MapCell[] {
  const b = block === 'core' ? 4 : block < 4 ? block : block + 1;
  const r0 = Math.floor(b / 3) * 3;
  const c0 = (b % 3) * 3;
  const out: MapCell[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(cells[(r0 + r) * 9 + c0 + c]);
  return out;
}

/** 영역 하나의 수 — 적은 칸 · 달성한 칸 · 오늘 할 일 칸(화면 읽기 말 areaLabel에) */
export function areaCounts(cells: readonly MapCell[], ti: number): { written: number; done: number; today: number } {
  let written = 0;
  let done = 0;
  let today = 0;
  for (const c of cells) {
    if (c.kind !== 'action' || c.ti !== ti) continue;
    if (c.state !== 'empty') written++;
    if (c.state === 'done') done++;
    if (c.today) today++;
  }
  return { written, done, today };
}
