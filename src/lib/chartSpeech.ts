// 표(81칸 · 영역 보드)의 화면 읽기 말 — 칸 값을 이미 고른 쪽이 문서를 다시 훑지 않고 말을 만든다.
// 오늘 할 일 수는 부르는 쪽이 한 번 센 것을 받고, 유형 한 줄은 KindLine.speech('이번 주 3회 중 2회' · '마감 3일 남음')를 쓴다.
// 고유어 서수(ORDINAL)도 여기 한 곳 — 영역 넘기기(areaPage)·편집 창(sheetSpeech)·81칸이 같은 말을 쓴다. RN 의존 없는 순수 모듈.
import { lang, msg, type Lang } from '../i18n';
import { liveList } from '../i18n/live';

/**
 * 블록 안 자리 — '3번째'는 '삼번째'로 읽혀서 고유어 서수로 쓴다(지금 언어의 core.ordinal).
 * @deprecated 칸 자리는 msg().fmt.ordinalCell({ n }), 서수 낱말은 msg().core.ordinal({ n })(V8-A가 지운다).
 */
export const ORDINAL: readonly string[] = liveList(() => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => msg().core.ordinal({ n })));

export type CellSpeechInput = {
  ai: number;
  /** 빈 칸이면 '' */
  text: string;
  /** 유형 한 줄(달성한 칸은 없음) — speech만 읽는다 */
  meta: { speech: string } | null;
  isToday: boolean;
  /** 오늘 할 일이고 오늘 했다 */
  didIt: boolean;
  done: boolean;
};

/** 칸 하나 — '세 번째 칸, 하루 물 2L, 이번 주 3회 중 2회, 오늘 할 일, 달성' · 빈 칸은 '세 번째 칸, 비어 있음' */
export function cellLabel(r: CellSpeechInput, l: Lang = lang()): string {
  const m = msg(l);
  const c = m.core;
  const pos = m.fmt.ordinalCell({ n: r.ai + 1 });
  if (!r.text) return [pos, c.cellEmpty].join(c.listSep);
  const parts = [pos, r.text];
  if (r.meta) parts.push(r.meta.speech);
  if (r.isToday) parts.push(r.didIt ? c.cellDidToday : c.cellOnToday);
  if (r.done) parts.push(c.cellAchieved);
  return parts.join(c.listSep);
}

/** 영역 이름표 — '건강, 8칸 중 3칸 달성, 오늘 2칸' · 적은 칸이 없으면 '건강, 실천을 아직 적지 않았어요' */
export function areaLabel(name: string, written: number, done: number, today: number, l: Lang = lang()): string {
  const c = msg(l).core;
  return written === 0 ? c.areaUnwritten({ name }) : c.areaSummary({ name, done, n: today });
}

/** 오늘 할 일 칸 'ti-ai'들을 영역마다 센다 — 한 번 세어 블록·이름표가 나눠 쓴다 */
export function areaTodayCounts(keys: Iterable<string>, areas = 8): number[] {
  const out = new Array<number>(areas).fill(0);
  for (const k of keys) {
    const ti = Number(k.slice(0, k.indexOf('-')));
    if (Number.isInteger(ti) && ti >= 0 && ti < areas) out[ti]++;
  }
  return out;
}
