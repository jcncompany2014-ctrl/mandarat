// 말 고르기 — 화면 글의 낱말장과 표시 이름 (RN 의존 없는 순수 모듈).
//
// 낱말장 (모든 화면이 이 뜻으로만 쓴다)
// - 실천        만다라트 칸에 적힌 내용. '항목'·'할 일 카드' 같은 말은 쓰지 않는다.
// - 칸          만다라트의 한 자리(셀). '셀'은 쓰지 않는다.
// - 채우기/적기  칸에 글을 쓰는 일. '칸을 채웠어요'처럼 달성으로 읽히는 말에는 쓰지 않는다.
// - 달성        칸이 끝난 것(한 번 끝냄 · 쌓기 목표 도달 · 직접 표시). '이루다'는 목표에만 쓴다.
// - 했어요      그날의 체크. '완료 처리' 같은 말은 쓰지 않는다.
// - 담기        실천을 '오늘'에 넣는 일.
// - 더하기      쌓기 숫자를 늘리는 일에만 쓴다(오늘에 넣는 일은 담기).
// - 고치기      글·설정을 바꾸는 일.
// - 연속        하루도 빠짐없이 이어 온 날(스트릭).
// 그 밖: '탭' 대신 '누르기', 연도는 글에 박아 넣지 않는다(날짜는 lib/text.ts의 표기 함수로).
//
// 저장값(Mood · Mgmt · CellShape)은 이전 저장본과 백업 호환을 위해 그대로 두고, 화면에는 아래 이름만 보인다.
import type { CellShape, Mgmt, Mood } from '../types';
import { msg } from '../i18n';
import { liveList, liveRecord } from '../i18n/live';

/**
 * 오늘 화면 보기 — 목록 · 연속 기록 · 보드 (지금 언어의 core.mgmt*)
 * @deprecated msg().core.mgmtList · mgmtStreak · mgmtBoard를 쓴다(V8-A가 지운다).
 */
export const MGMT_LABEL: Record<Mgmt, string> = liveRecord(() => {
  const c = msg().core;
  return { '일일 체크': c.mgmtList, '습관 스트릭': c.mgmtStreak, '칸반': c.mgmtBoard };
});

/**
 * 칸 모서리 (core.shape*)
 * @deprecated msg().core.shapeRound · shapeSquare를 쓴다(V8-A가 지운다).
 */
export const SHAPE_LABEL: Record<CellShape, string> = liveRecord(() => {
  const c = msg().core;
  return { '둥근': c.shapeRound, '각진': c.shapeSquare };
});

/**
 * 종이 색 (core.paper*)
 * @deprecated msg().core.paperIvory … paperDark를 쓴다(V8-A가 지운다).
 */
export const MOOD_LABEL: Record<Mood, string> = liveRecord(() => {
  const c = msg().core;
  return { '연꽃': c.paperIvory, '크림': c.paperCream, '화이트': c.paperGray, '파스텔': c.paperLavender, '다크': c.paperDark };
});

/**
 * 오늘 기분 — dayMeta.mood 0~4의 이름(얼굴 그림 없이 낱말로, core.mood0~4)
 * @deprecated msg().core.mood0 … mood4를 쓴다(V8-A가 지운다).
 */
export const MOOD_WORDS: readonly string[] = liveList(() => {
  const c = msg().core;
  return [c.mood0, c.mood1, c.mood2, c.mood3, c.mood4];
});

// 화면 글에 쓰지 않는 말(BANNED_COPY · BANNED_COPY_RE)은 src/i18n/glossary.ts로 옮겼다 — 이 이름으로 그대로 쓴다
export { BANNED_COPY, BANNED_COPY_RE } from '../i18n/glossary';
