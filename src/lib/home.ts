// 홈 — 수첩의 오늘 쪽에 쓰는 작은 계산들 (React·RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 머리 위 줄(날짜 · 주), 히어로 지도 칸 크기, 오늘 할 일에 놓을 줄, 영역 줄의 '다음' 한 줄, 처음 쓰는 사람에게 무엇을 보여 줄지.
// 디자인 A(docs/design/build-plan.md §1 Home · S1, 목업 docs/design/mockups/a/home.png).
import type { Theme } from '../types';
import { lang, msg, type Lang } from '../i18n';
import { GUIDE_FILL_TARGET } from './pick';
import { fmtDateLong } from './text';

/**
 * 홈의 자리 수치(pt) — 목업 home.html의 값. 색은 토큰, 글자는 ROLE, 화면 여백 · 구역 사이는 GEO.
 * - 히어로: 머리 아래 18, 숫자 칸과 지도 사이 24, 히어로 아래 32, 숫자 칸 위아래 2, 이름과 숫자 사이 2.
 * - 지도: L1 칸 20, 본문 폭이 330보다 좁으면(375pt 폰) 18.
 * - 8개 영역: 두 단 사이 28, 줄 38(누르는 자리는 위아래 3씩 더해 44).
 * - 오늘 할 일: 다섯 줄까지(이번 주 중점은 셋까지 맨 위).
 */
export const HOME = {
  heroTop: 18,
  heroGap: 24,
  heroBelow: 32,
  heroPadY: 2,
  fieldGap: 2,
  mapCell: 20,
  mapCellNarrow: 18,
  narrowMeasure: 330,
  ledgerGap: 28,
  ledgerRow: 38,
  rows: 5,
  focus: 3,
  /** 히어로가 숫자 칸 셋 → 지도 순서로 위아래로 쌓이는 글자 배율(더 큰 텍스트) */
  stackScale: 1.35,
} as const;

/** 히어로 지도(L1)의 칸 크기 — 본문 폭(화면 폭 − 여백 둘) 330 미만이면 18, 아니면 20 */
export function heroMapCell(measure: number): number {
  return measure < HOME.narrowMeasure ? HOME.mapCellNarrow : HOME.mapCell;
}

/** 머리 위 줄 — '10월 14일 수요일 · 42주' (ja '10月14日 水曜日・第42週', en 'Wednesday, October 14 · Week 42') */
export function homeEyebrow(d: Date, l: Lang = lang()): string {
  return msg(l).home.eyebrow({ day: fmtDateLong(d, l), w: isoWeek(d).week });
}

/**
 * 홈 '오늘 할 일'에 놓을 줄 — 이번 주 중점이 먼저(셋까지), 그다음 남은 일, 끝에 오늘 한 일 하나. 모두 max(5)줄까지.
 * - pinned: 중점 칸 키 순서대로. 오늘 목록에 있으면 그 줄(row), 오늘 할 일이 아니면 null(체크 칸 없는 줄, '이번 주').
 * - shown: 중점이 아닌 오늘 줄 — 남은 일(이 화면에서 체크한 줄 kept는 제자리에 남는다), 자리가 둘 이상 남으면 끝에 이미 한 줄 하나.
 */
export function homeList<R extends { key: string; done: boolean }>(
  rows: readonly R[],
  focus: readonly string[],
  kept: ReadonlySet<string> = new Set(),
  max: number = HOME.rows,
): { pinned: { key: string; row: R | null }[]; shown: R[] } {
  const byKey = new Map(rows.map((r) => [r.key, r] as const));
  const pinned = [...new Set(focus)].slice(0, Math.min(HOME.focus, max)).map((key) => ({ key, row: byKey.get(key) ?? null }));
  const pin = new Set(pinned.map((p) => p.key));
  const rest = rows.filter((r) => !pin.has(r.key));
  const room = Math.max(0, max - pinned.length);
  const open = rest.filter((r) => !r.done || kept.has(r.key));
  const doneOne = rest.find((r) => r.done && !kept.has(r.key));
  const reserve = doneOne && room >= 2 ? 1 : 0;
  const shown = open.slice(0, Math.max(0, room - reserve));
  if (doneOne && shown.length < room) shown.push(doneOne);
  return { pinned, shown };
}

/** ISO 8601 주 번호와 그 주의 해 — 월요일 시작, 그해 첫 목요일이 든 주가 1주 */
export function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // 그 주의 목요일로 옮겨 해를 정한다
  const dow = (t.getDay() + 6) % 7; // 월 0 … 일 6
  t.setDate(t.getDate() - dow + 3);
  const year = t.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const jan4Dow = (jan4.getDay() + 6) % 7;
  const week1Thu = new Date(year, 0, 4 - jan4Dow + 3);
  const week = 1 + Math.round((t.getTime() - week1Thu.getTime()) / (7 * 86400000));
  return { year, week };
}

/** 올해 남은 날 — 오늘은 빼고 12월 31일까지(12월 31일이면 0) */
export function daysLeftInYear(d: Date): number {
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), 11, 31);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

/** 머리 오른쪽 두 줄 — '2026 · 42주' / '올해 78일 남음' */
export function headerMeta(d: Date, l: Lang = lang()): { week: string; left: string } {
  const w = isoWeek(d);
  const f = msg(l).fmt;
  return { week: f.weekNo({ y: w.year, w: w.week }), left: f.daysLeftYear({ n: daysLeftInYear(d) }) };
}

/** 正 한 자에 긋는 획 수 — 홈은 正를 그리지 않는다(디자인 A). 웨이브 4(R2)가 지운다 */
export const TALLY_MAX = 5;

/** 正 세기 — 그을 획 수(최대 5)와 넘친 수('+n'). 웨이브 4(R2)가 지운다 */
export function tallyMarks(n: number): { strokes: number; extra: number } {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return { strokes: Math.min(v, TALLY_MAX), extra: Math.max(0, v - TALLY_MAX) };
}

/**
 * 영역 줄의 한 줄 — 무엇이 다음인지.
 * 8칸 다 달성 → '8칸 모두 달성했어요' · 적어 두고 아직 달성하지 않은 첫 칸 → '다음 · {글}' · 그 밖 → '빈 칸 n개'
 */
export function areaLine(th: Pick<Theme, 'actions'>, l: Lang = lang()): string {
  const t = msg(l).home;
  const done = th.actions.filter((a) => a.done).length;
  if (done >= 8) return t.areaAllDone;
  const next = th.actions.find((a) => a.text.trim() && !a.done);
  if (next) return t.areaNext({ text: next.text.trim() });
  const blank = th.actions.filter((a) => !a.text.trim()).length;
  return t.areaBlank({ n: blank });
}

/**
 * 시작 가이드가 남아 있는 동안 아래 구역을 보일지 — 빈 '0칸'·빈 주·0/8 줄 여덟 개를 늘어놓지 않는다.
 * 가이드를 다 끝내면 모두 보인다.
 */
export function homeGate(o: { guideActive: boolean; todayTotal: number; weekTotal: number; filled: number }): {
  today: boolean; week: boolean; areas: boolean;
} {
  if (!o.guideActive) return { today: true, week: true, areas: true };
  return { today: o.todayTotal > 0, week: o.weekTotal > 0, areas: o.filled >= GUIDE_FILL_TARGET };
}
