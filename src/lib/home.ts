// 홈 — 수첩의 오늘 쪽에 쓰는 작은 계산들 (React·RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 머리의 해·주 표기, 正 세기, 영역 줄의 '다음' 한 줄, 처음 쓰는 사람에게 무엇을 보여 줄지.
import type { Theme } from '../types';
import { lang, msg, type Lang } from '../i18n';
import { GUIDE_FILL_TARGET } from './pick';

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

/** 正 한 자에 긋는 획 수 */
export const TALLY_MAX = 5;

/** 正 세기 — 그을 획 수(최대 5)와 넘친 수('+n') */
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
