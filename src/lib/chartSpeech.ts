// 표(81칸 · 영역 보드)의 화면 읽기 말 — 칸 값을 이미 고른 쪽이 문서를 다시 훑지 않고 말을 만든다.
// 오늘 할 일 수는 부르는 쪽이 한 번 센 것을 받고, 유형 한 줄은 KindLine.speech('이번 주 3회 중 2회' · '마감 3일 남음')를 쓴다.
// 고유어 서수(ORDINAL)도 여기 한 곳 — 영역 넘기기(areaPage)·편집 창(sheetSpeech)·81칸이 같은 말을 쓴다. RN 의존 없는 순수 모듈.

/** 블록 안 자리 — '3번째'는 '삼번째'로 읽혀서 고유어 서수로 쓴다 */
export const ORDINAL = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'] as const;

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
export function cellLabel(r: CellSpeechInput): string {
  const pos = `${ORDINAL[r.ai] ?? `${r.ai + 1}`} 번째 칸`;
  if (!r.text) return `${pos}, 비어 있음`;
  const parts = [pos, r.text];
  if (r.meta) parts.push(r.meta.speech);
  if (r.isToday) parts.push(r.didIt ? '오늘 했어요' : '오늘 할 일');
  if (r.done) parts.push('달성');
  return parts.join(', ');
}

/** 영역 이름표 — '건강, 8칸 중 3칸 달성, 오늘 2칸' · 적은 칸이 없으면 '건강, 실천을 아직 적지 않았어요' */
export function areaLabel(name: string, written: number, done: number, today: number): string {
  if (written === 0) return `${name}, 실천을 아직 적지 않았어요`;
  return `${name}, 8칸 중 ${done}칸 달성${today > 0 ? `, 오늘 ${today}칸` : ''}`;
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
