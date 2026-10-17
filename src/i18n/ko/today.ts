// 'today' 이름공간 — 오늘 화면(목록 · 연속 기록 · 보드 · 마음가짐 · 하루 마감 · 기분 · 한 줄),
// 오늘 할 일 담기 · 고르기 시트, 고르기 판단(lib/pick)의 글(X-D, docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';

export default {
  // ── 머리 · 목록 ──
  /** 화면 머리 */
  screenTitle: '오늘',
  /** 영역 색인의 첫 칸 */
  all: '전체',
  /** 이름이 빈 영역 — n은 1부터 */
  areaFallback: ({ n }: { n: number }) => `영역 ${n}`,
  areaEmpty: '이 영역은 오늘 할 일이 없어요',
  pickMore: '실천에서 더 고르기',
  /** '했어요 3' 묶음 머리(보이는 글) */
  doneHead: ({ n }: { n: number }) => `했어요 ${n}`,
  /** 묶음 머리의 화면 읽기 */
  doneHeadLabel: ({ n }: { n: number }) => `했어요 ${n}개`,
  expand: '펼치기',
  collapse: '접기',
  /** 집계 옆 '고르기' */
  pick: '고르기',
  pickHint: '만다라트 실천에서 오늘 할 일을 골라요',
  allDone: '오늘 다 했어요',

  // ── 빈 목록 ──
  emptyFill: '만다라트 칸을 채우면 여기 담겨요',
  fillChart: '만다라트 채우기',
  emptyPick: '오늘 할 일을 아직 담지 않았어요',
  pickFromActions: '실천에서 고르기',
  emptyAllIn: '오늘 할 일을 다 담았어요',

  // ── 하루 마감(day는 fmt.dateLong) ──
  closeLeft: ({ day }: { day: string }) => `${day} 마감`,
  closeSpeech: ({ day, n }: { day: string; n: number }) => `${day} 마감, 오늘 할 일 ${n}개를 다 했어요`,

  // ── 모든 보기 아래 ──
  moodTitle: '오늘 기분',
  lineTitle: '한 줄',
  /** 한 줄 칸의 이름 · 자리 글 */
  linePlaceholder: '오늘 한 줄',

  // ── 이번 주 마음가짐 ──
  mindTitle: '이번 주 마음가짐',
  /** '4개 중 1개 매겼어요' */
  mindProgress: ({ total, done }: { total: number; done: number }) => `${total}개 중 ${done}개 매겼어요`,
  mindIntro: '한 주 동안 얼마나 지켰는지 1~5점으로 매겨요',
  rateLastWeek: '지난주 점수 매기기',
  rateLastWeekHint: '한 주 돌아보기를 열어요',
  /** 보이는 줄 — 끝에 '›' */
  rateLastWeekLink: '지난주 점수 매기기 ›',
  /** 점수 칸 묶음의 이름 */
  mindRateLabel: ({ text }: { text: string }) => `${text} 이번 주 점수`,
  openHint: '실천 자세히 보기',
  /** 화면 읽기 동작 이름 */
  openAction: '자세히 보기',

  // ── 연속 기록 ──
  streakEmpty: '습관으로 정한 실천이 여기에 모여요',
  streakNow: '지금 연속',
  /** 큰 숫자 뒤 단위(n은 en의 단수·복수용) */
  unitDay: (_: { n: number }) => '일',
  unitWeek: (_: { n: number }) => '주',
  /** 기록 — '5일' · '3주'(줄 오른쪽 칸 · 최고 · 화면 읽기에 같은 글) */
  runDays: ({ n }: { n: number }) => `${n}일`,
  runWeeks: ({ n }: { n: number }) => `${n}주`,
  /** 줄 오른쪽 칸은 좁아 짧은 꼴 — ko는 runDays · runWeeks와 같다 */
  runDaysShort: ({ n }: { n: number }) => `${n}일`,
  runWeeksShort: ({ n }: { n: number }) => `${n}주`,
  /** '최고 9일' */
  streakBest: ({ run }: { run: string }) => `최고 ${run}`,
  streakStart: '오늘 하나 하면 시작돼요',
  /** 요일 머리글 오른쪽 기록 칸 머리 */
  streakCol: '연속',
  runNone: '연속 기록 아직 없음',
  runLabel: ({ run }: { run: string }) => `연속 ${run}`,
  streakLabel: ({ run, text, bestRun }: { run: string; text: string; bestRun: string }) => `지금 연속 ${run}, ${text}. 최고 ${bestRun}`,
  streakNone: '아직 이어 가는 기록이 없어요. 오늘 하나 하면 시작돼요',
  /** 주 N회 습관의 이번 주 — '이번 주 3회 중 2회' */
  weekCount: ({ total, done }: { total: number; done: number }) => `이번 주 ${total}회 중 ${done}회`,
  doneToday: '오늘 했어요',
  undoDone: '했어요 지우기',
  markDone: '했어요로 남기기',

  // ── 보드 ──
  colTodo: '할 일',
  colDoing: '진행 중',
  colDone: '했어요',
  /** 칸 머리의 화면 읽기 — '진행 중 2개' */
  columnHead: ({ label, n }: { label: string; n: number }) => `${label} ${n}개`,
  boardHint: '누를 때마다 다음 단계로 옮겨요',
  boardEmpty: '오늘 할 일이 여기에 카드로 놓여요',
  boardEmptySub: '습관으로 정한 실천은 그날 저절로 담겨요',
  writeTodo: '할 일 적기',
  emptyColumn: '비어 있음',
  /** 집중 타이머 기본 길이(FocusTimer의 첫 값) */
  focus25: '25분 집중',
  toDoing: '진행 중으로 옮기기',
  toDone: '했어요로 옮기기',
  toTodo: '할 일로 되돌리기',
  movedDoing: ({ text }: { text: string }) => `${text}, 진행 중으로 옮겼어요`,
  movedBack: ({ text }: { text: string }) => `${text}, 할 일로 되돌렸어요`,
  /** 직접 적은 할 일 카드 */
  extraTag: ({ area }: { area: string }) => `${area} · 직접 적음`,
  cardStart: '시작',
  cardFinish: '다 했어요',

  // ── 오늘 할 일 담기 시트 ──
  quickTitle: '오늘 할 일 담기',
  quickField: '오늘 할 일',
  quickPlaceholder: '예) 서류 제출하기',
  quickCount: ({ n, max }: { n: number; max: number }) => `${n}자, 최대 ${max}자`,
  quickAreaAsk: '어느 영역의 일인가요?',
  quickPicks: '이 영역 실천 담기',
  quickPickHint: '오늘 할 일에 담아요',
  quickAdded: '오늘 할 일에 담았어요',
  quickSubmit: '오늘 할 일에 담기',
  quickWriteCell: ({ area }: { area: string }) => `${area} 빈 칸에 적기`,
  /** n은 1부터 */
  quickWriteCellHint: ({ area, n }: { area: string; n: number }) => `만다라트 ${area} 영역의 ${n}번 칸에 적어요`,
  quickWroteCell: ({ area, n }: { area: string; n: number }) => `${area} ${n}번 칸에 적었어요`,

  // ── 오늘 할 일 고르기 시트 ──
  pickTitle: '오늘 할 일 고르기',
  pickSub: '고르는 대로 오늘 목록에 담겨요',
  pickDone: ({ n }: { n: number }) => `오늘 ${n}개 · 다 골랐어요`,
  pickDoneLabel: ({ n }: { n: number }) => `오늘 ${n}개, 다 골랐어요`,
  pickNoneLeft: '고를 실천이 남아 있지 않아요',
  pickNoneFilled: '아직 채운 실천이 없어요',
  pickSectionLabel: ({ name, n }: { name: string; n: number }) => `${name}, 오늘 ${n}개`,
  pickSectionCount: ({ n }: { n: number }) => `오늘 ${n}`,
  /** 저절로 담긴 줄 — '저절로 담김 3 · 아침 스트레칭, 물 2L 외 1' (names는 listSep으로 이은 글) */
  autoLine: ({ n, names }: { n: number; names: string }) => `저절로 담김 ${n} · ${names}`,
  autoMore: ({ n }: { n: number }) => ` 외 ${n}`,
  listSep: ', ',
  autoLineLabel: ({ line }: { line: string }) => `${line}. 반복이나 마감으로 오늘 할 일에 이미 있어요`,
  weekFocus: '이번 주 중점',
  weekFocusMark: '중점',

  // ── 저절로 담긴 까닭(lib/pick whyAuto) ──
  whyOverdue: '마감이 지나 ‘오늘’에 이미 있어요',
  whyDueSoon: '마감이 가까워 ‘오늘’에 이미 있어요',
  whyWeekLeft: ({ n }: { n: number }) => `이번 주 ${n}회 남아 ‘오늘’에 이미 있어요`,
  whyWeekDone: ({ n }: { n: number }) => `이번 주 ${n}회를 오늘 다 했어요`,
  whyRepeat: '반복하는 날이라 ‘오늘’에 이미 있어요',

  // ── 시작 가이드 단계(lib/pick guideSteps) ──
  guideGoal: '핵심 목표 정하기',
  guideAreas: '영역 8개 정하기',
  guideFill: ({ n }: { n: number }) => `실천 칸 ${n}개 채우기`,
  guideToday: '오늘 할 일 고르기',
  guideCheck: '하나 해 보기',
} satisfies Namespace;
