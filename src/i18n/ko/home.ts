// 'home' 이름공간 — 홈(수첩의 오늘 쪽), lib/home · lib/a11y의 홈 말, 실천 점검 줄(GuideChips)의 글(X-H, docs/v2/plan.md 부록 B).
// 한국어는 뽑기 전 글과 글자 하나까지 같다(tests/i18n-home.test.js).
import type { Namespace } from '../types';

export default {
  // ── 머리 ──
  /** 큰 날짜 숫자 옆 달 — '10월' (n은 1~12) */
  month: ({ n }: { n: number }) => `${n}월`,
  settings: '설정',

  // ── 핵심 목표 + 81칸 ──
  chartHint: '만다라트를 펼쳐요',
  coreGoal: '핵심 목표',
  setGoal: '핵심 목표를 정해 주세요',
  setGoalHint: '핵심 목표 정하기',
  setGoalText: '핵심 목표를\n정해 주세요',
  /** '64칸 중 **12칸** 달성했어요' — 굵은 수 앞 · 굵은 수 · 뒤 */
  doneBefore: '64칸 중 ',
  doneCount: ({ n }: { n: number }) => `${n}칸`,
  doneAfter: ' 달성했어요',

  // ── 저장 알림 ──
  saveFailTitle: '기록을 저장하지 못했어요',
  saveFailBody: '기기 저장 공간을 확인해 주세요. 바꾸는 대로 다시 저장해 볼게요.',
  saveFailAction: '백업 내보내기',

  // ── 한 주 돌아보기 · 이번 주 중점 ──
  ritualTitle: '한 주 돌아보기',
  ritualSub: ({ range }: { range: string }) => `${range} · 3분이면 돼요`,
  priorityTitle: '이번 주 중점',
  areaFallback: ({ n }: { n: number }) => `영역 ${n}`,
  actionHint: '실천 자세히 보기',

  // ── 오늘 할 일 ──
  todayTitle: '오늘 할 일',
  openToday: '오늘 화면 열기',
  todayHeadLabel: ({ total, done }: { total: number; done: number }) => `오늘 할 일 ${total}개 중 ${done}개 했어요, 오늘 화면 열기`,
  more: ({ n }: { n: number }) => `${n}개 더 있어요`,
  moreLabel: ({ n }: { n: number }) => `${n}개 더 있어요, 오늘 화면 열기`,
  pickMore: '실천에서 더 고르기',
  pickMoreLink: '실천에서 더 고르기 ›',
  addToday: '오늘 할 일 담기',
  /** 장부 마감의 읽는 말 — 보이는 글은 today.closeLeft */
  closeLabel: ({ day, n }: { day: string; n: number }) => `${day} 마감, ${n}개 중 ${n}개 했어요`,

  // ── 이번 주 正 ──
  weekTitle: '이번 주',
  weekDay: ({ day, n }: { day: string; n: number }) => `${day} ${n}번`,
  weekDayToday: ({ day, n }: { day: string; n: number }) => `${day} ${n}번, 오늘`,

  // ── 8개 영역 ──
  areasTitle: '8개 영역',
  areaRowLabel: ({ name, line, n }: { name: string; line: string; n: number }) => `${name}, ${line}, 8칸 중 ${n}칸 달성`,
  areaAllDone: '8칸 모두 달성했어요',
  areaNext: ({ text }: { text: string }) => `다음 · ${text}`,
  areaBlank: ({ n }: { n: number }) => `빈 칸 ${n}개`,

  // ── 시작하기 ──
  guideTitle: '시작하기',
  guideProgress: ({ total, done }: { total: number; done: number }) => `${total}단계 중 ${done}단계`,
  guideFillLabel: ({ label, done, total }: { label: string; done: number; total: number }) => `${label} · ${done}/${total}`,
  guideFillSpeech: ({ label, done, total }: { label: string; done: number; total: number }) => `${label}, ${total}칸 중 ${done}칸`,
  guideStep: ({ n, text }: { n: number; text: string }) => `${n}단계 ${text}`,
  guideDone: '끝냄',
  guideNext: '다음에 할 일',
  ctaSet: '정하기',
  ctaFill: '채우기',
  ctaPick: '고르기',

  // ── 화면 읽기 한 문장(lib/a11y) ──
  /** 문장 사이 — 한국어·영어는 빈칸, 일본어는 붙여 쓴다 */
  sentSep: ' ',
  sumDate: ({ day }: { day: string }) => `${day}.`,
  sumGoal: ({ goal }: { goal: string }) => `핵심 목표, ${goal}.`,
  sumNoGoal: '핵심 목표를 아직 정하지 않았어요.',
  sumDone: ({ n }: { n: number }) => `64칸 중 ${n}칸 달성.`,
  sumNone: '오늘 할 일은 아직 없어요.',
  sumAllDone: '오늘 할 일을 다 했어요.',
  sumLeft: ({ n }: { n: number }) => `오늘 할 일 ${n}개 남았어요.`,
  todayNone: '오늘 할 일이 아직 없어요',
  todayAll: ({ total }: { total: number }) => `오늘 할 일 ${total}개를 다 했어요`,
  todayOf: ({ total, done }: { total: number; done: number }) => `오늘 할 일 ${total}개 중 ${done}개 했어요`,

  // ── 실천 점검 줄(GuideChips) ──
  chipWhat: '무엇을',
  chipHowMuch: '얼마나',
  chipWhen: '언제·어디서',
  chipHint: '구체적일수록 실천하기 쉬워요',
  chipHas: ({ label }: { label: string }) => `${label} 있음`,
  chipMissing: ({ label }: { label: string }) => `${label} 없음`,
  chipSpeech: ({ spoken, hint }: { spoken: string; hint: string }) => `${spoken}. ${hint}`,
} satisfies Namespace;
