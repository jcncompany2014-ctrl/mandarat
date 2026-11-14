// 'stats' 이름공간 — 통계 화면 · 그 그림 넷 · statsView의 글(X-F, docs/v2/plan.md 부록 B).
// 날짜·요일·횟수는 fmt로 적은 글을 받는다(date · day). 목록을 잇는 쉼표는 core.listSep.
import type { Namespace } from '../types';
import fmt from './fmt';
import { josa } from './josa';

/** 줄인 이름 + 조사 — 조사는 원래 이름의 끝소리로 고른다('건강하고 활기찬…는') */
const topic = (name: string, full: string) => name + josa(full, '은/는').slice(full.length);

export default {
  screenTitle: '통계',
  /** 기록이 없을 때 화면 맨 위 한 줄 */
  empty: '하나 하면 여기부터 기록돼요',

  // ── 큰 숫자 ──
  heroStreak: '연속',
  /** 연속 큰 숫자 뒤 단위 — en은 n에 따라 day/days */
  heroDays: (_: { n: number }) => '일',
  heroDone: '달성',
  heroOf64: '64칸 중',
  streakStart: '하나 하면 시작돼요',
  streakKept: '오늘까지 이어 왔어요',
  /** 오늘 하면 n일째 — n은 오늘 포함 */
  streakNext: ({ n }: { n: number }) => `오늘 하나 하면 ${n}일째`,
  streakSay: ({ n }: { n: number }) => `연속 ${n}일`,
  streakSayPending: ({ n }: { n: number }) => `연속 ${n}일, 오늘은 아직`,
  recordNow: '지금이 최고 기록',
  recordBest: ({ n }: { n: number }) => `최고 기록 ${n}일`,
  recordMonth: ({ n }: { n: number }) => `이번 달 달성 ${n}칸`,

  // ── 이번 주 ──
  secWeek: '이번 주',
  reviewLink: '돌아보기 ›',
  reviewLinkSay: '한 주 돌아보기',
  weekDid: ({ n }: { n: number }) => `이번 주 ${n}번 했어요`,
  /** 했지만 달성한 칸이 없을 때 — 달성이 무엇인지 */
  weekNoDone: ({ n }: { n: number }) => `이번 주 ${n}번 했어요. 칸은 한 번짜리 일을 끝내거나 목표 수에 닿으면 달성돼요.`,
  deltaSame: '지난주 이맘때와 같아요',
  deltaMore: ({ n }: { n: number }) => `지난주 이맘때보다 +${n}번`,
  deltaLess: ({ n }: { n: number }) => `지난주 이맘때보다 −${n}번`,
  /** 막대 줄 읽기의 하루 — '월 5번' (i: 0 = 일요일) */
  barDaySay: ({ i, n }: { i: number; n: number }) => `${fmt.dowNarrow({ i })} ${n}번`,
  barTodaySay: ({ i, n }: { i: number; n: number }) => `${fmt.dowNarrow({ i })} ${n}번 오늘`,
  barFutureSay: ({ i }: { i: number }) => `${fmt.dowLong({ i })}부터는 아직`,

  // ── 이번 주 장부 ──
  ledgerAdded: '쌓은 것',
  ledgerFocus: '집중',
  ledgerNone: '없음',
  /** 장부 한 줄 읽기 — '습관 9번 중 5번' */
  ledgerSay: ({ label, value }: { label: string; value: string }) => `${label} ${value}`,
  habitValue: ({ done, total }: { done: number; total: number }) => `${done}/${total}번`,
  habitFromToday: '오늘부터 세요',
  habitAll: '이번 주 다 했어요',
  habitMissed: ({ n }: { n: number }) => `${n}번 놓침`,
  habitLeft: ({ n }: { n: number }) => `${n}번 남음`,
  mindRatedOf: ({ total, done }: { total: number; done: number }) => `${total}개 중 ${done}개 매겼어요`,
  mindNotYet: '이번 주는 아직 매기지 않았어요',
  soFar: '지금까지',

  // ── 돌아본 주 ──
  secReviewed: '돌아본 주',
  weeksN: ({ n }: { n: number }) => `${n}주`,
  reviewHabit: ({ pct }: { pct: number }) => `습관 ${pct}%`,
  /** avg는 '3.5'처럼 적은 글 */
  reviewMind: ({ avg }: { avg: string }) => `마음가짐 ${avg}`,
  openReview: '돌아본 기록 보기',
  moreWeeks: ({ n }: { n: number }) => `돌아본 주 ${n}개 더 보기`,
  more: '더 보기',

  // ── 최근 10주 ──
  secTenWeeks: '최근 10주',
  since: ({ date }: { date: string }) => `${date}부터`,
  /** 달 이름(n: 1~12) */
  monthLabel: ({ n }: { n: number }) => `${n}월`,
  bestNone: '아직 기록이 없어요',
  bestDay: ({ date, n }: { date: string; n: number }) => `가장 많이 한 날 ${date} · ${n}번`,
  thisWeek: '이번 주',
  heatSay: ({ n }: { n: number }) => `최근 10주 중 ${n}일 실천`,
  heatBestSay: ({ date, n }: { date: string; n: number }) => `가장 많이 한 날 ${date} ${n}번`,
  heatHint: '위아래로 쓸어 하루씩 옮겨요',
  pastAction: '지난 실천',
  namesMore: ({ names, n }: { names: string; n: number }) => `${names} 외 ${n}개`,
  pickedHead: ({ date, n }: { date: string; n: number }) => `${date} · ${n}번`,
  pickedSay: ({ date, n }: { date: string; n: number }) => `${date}, ${n}번`,
  noPick: '고른 날 없음',

  // ── 숫자 목표 · 마음가짐 ──
  secCount: '숫자 목표',
  countRight: '지금까지 / 목표',
  secMind: '마음가짐',
  last8w: '최근 8주',
  /** 이 속도면 언제 닿는지 — date는 적은 날짜 */
  pace: ({ date }: { date: string }) => `이 속도면 ${date}`,
  monthZero: ({ unit }: { unit: string }) => `이번 달 아직 0${unit}`,
  goalReached: '목표 달성',
  /** num은 묶어 적은 수 */
  weekAdded: ({ num, unit }: { num: string; unit: string }) => `이번 주 +${num}${unit}`,
  mindAvg: ({ n, avg }: { n: number; avg: string }) => `매긴 ${n}주 평균 ${avg}점`,
  mindNoWeeks: '아직 매긴 주가 없어요',
  mindWeekSay: ({ n }: { n: number }) => `이번 주 ${n}점`,
  mindWeekNone: '이번 주 점수 없음',
  mindOf8Say: ({ sub }: { sub: string }) => `최근 8주 중 ${sub}`,

  // ── 8개 영역 ──
  secAreas: '8개 영역',
  areasRight: '최근 4주 실천',
  openArea: '영역 보기',
  wearSay: ({ n }: { n: number }) => `최근 4주 ${n}일`,
  wearNone: '최근 4주 기록 없음',
  legendLast4: '최근 4주 ·',
  /** 범례 끝 칸 — '5+일'(최근 4주 동안 한 날 수) */
  legendTimes: ({ label }: { label: string }) => `${label}일`,

  // ── 회고 ──
  secReflect: '회고',
  last14d: '최근 14일',
  reflectEmpty: '오늘 화면에서 한 줄 남기면 여기에 모여요',
  moreNotes: ({ n }: { n: number }) => `한 줄 회고 ${n}개 더 보기`,
  moodNoneSay: ({ days }: { days: number }) => `최근 ${days}일 기분 기록 없음`,
  moodSay: ({ days, n }: { days: number; n: number }) => `최근 ${days}일 중 기분을 남긴 날 ${n}일`,
  moodDaySay: ({ date, word }: { date: string; word: string }) => `${date} ${word}`,

  // ── 디자인 A(build-plan S4) ──
  /** 머리 위 줄 — '2026 · 42주 · D-78' (y · w: ISO 주, days: 올해 남은 날) */
  eyebrow: ({ y, w, days }: { y: number; w: number; days: number }) => `${fmt.weekNo({ y, w })} · ${fmt.dueShort({ days })}`,
  /** 히어로 달성 아래 — '이번 달 3칸' */
  monthCells: ({ n }: { n: number }) => `이번 달 ${n}칸`,
  /** 범위 줄 — 한 번에 한 기간 */
  scopeWeek: '이번 주',
  scopeTen: '10주',
  scopeYear: '올해',
  /**
   * 이번 주를 읽는 한 줄 — 가장 많이 챙긴 영역(top)과 가장 적게 챙긴 영역(low, 적어 둔 영역 중).
   * top · low는 줄인 이름, topFull · lowFull은 조사를 고를 원래 이름. low가 ''이면 top만.
   * '건강은 5번 챙겼고, 커리어는 아직이에요' · '건강은 5번, 재정은 1번 챙겼어요' · '건강은 5번 챙겼어요'
   */
  reading: ({ top, topFull, n, low, lowFull, lowN }: { top: string; topFull: string; n: number; low: string; lowFull: string; lowN: number }) => {
    if (!low) return `${topic(top, topFull)} ${n}번 챙겼어요`;
    if (!(lowN > 0)) return `${topic(top, topFull)} ${n}번 챙겼고, ${topic(low, lowFull)} 아직이에요`;
    return `${topic(top, topFull)} ${n}번, ${topic(low, lowFull)} ${lowN}번 챙겼어요`;
  },
  /** 적어 둔 영역을 모두 같은 수만큼 — '3개 영역을 2번씩 챙겼어요' */
  readingEven: ({ k, n }: { k: number; n: number }) => `${k}개 영역을 ${n}번씩 챙겼어요`,
  /** 읽는 줄 아래 — '모두 7번' */
  weekAll: ({ n }: { n: number }) => `모두 ${n}번`,
  /** 이번 주에 했지만 달성한 칸이 없을 때 — 달성이 무엇인지 */
  doneHint: '칸은 한 번짜리 일을 끝내거나 목표 수에 닿으면 달성돼요.',
  /** 막대 아래 영역 표 한 칸을 읽는 말 — '건강 5번' */
  areaCountSay: ({ name, n }: { name: string; n: number }) => `${name} ${n}번`,
  /** 유형 줄 — 기록이 없는 유형은 한 줄 + 링크 */
  habitNone: '정한 습관이 없어요',
  mindNone: '마음가짐 칸이 없어요',
  focusNone: '아직 집중한 시간이 없어요',
  /** 링크 — 만다라트에서 정하기 · 그 칸 열어 점수 매기기 · 오늘에서 집중 시작하기 */
  linkSet: '정하기',
  linkSetHint: '만다라트에서 칸의 유형을 정해요',
  linkRate: '매기기',
  linkRateHint: '이번 주 점수를 매길 칸을 열어요',
  linkToday: '오늘 보기',
  linkTodayHint: '오늘 할 일에서 25분 집중을 시작할 수 있어요',
} satisfies Namespace;
