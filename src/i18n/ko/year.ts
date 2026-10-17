// 'year' 이름공간 — V1-D · V2-E · V3-D · V4-B가 채운다(docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';

export default {
  // V1-D — 백업 불러오기 장부의 지난 표 줄
  /** 장부 줄 이름 */
  ledgerArchives: '지난 표',
  /** '3장' */
  archiveCount: ({ n }: { n: number }) => `${n}장`,

  // V2-E — 한 해 마무리(오버레이 · 설정 줄 · 홈 안내)
  /** 쪽 제목 */
  pageReview: '한 해 돌아보기',
  pageNew: '새 표',
  pageStart: '마무리',
  /** 쪽 번호를 읽는 말 */
  pageSpeech: ({ n, total }: { n: number; total: number }) => `${total}쪽 중 ${n}쪽`,
  next: '다음',
  /** 한 해 돌아보기의 네 숫자 */
  statDays: '기록한 날',
  statLongest: '가장 길게 이어 온 날',
  statAchieved: '달성',
  statFocus: '집중',
  /** '64칸 중 12칸' */
  achievedSpeech: ({ n }: { n: number }) => `64칸 중 ${n}칸`,
  /** 기록 장부 */
  ledgerTitle: '달마다 기록한 날',
  /** 장부 줄 머리 '10월' */
  monthShort: ({ m }: { m: number }) => `${m}월`,
  /** '2026년 10월' */
  monthLong: ({ y, m }: { y: number; m: number }) => `${y}년 ${m}월`,
  /** 장부 한 줄을 읽는 말 */
  monthSpeech: ({ label, n }: { label: string; n: number }) => (n > 0 ? `${label}, 기록한 날 ${n}일` : `${label}, 기록 없음`),
  noteLabel: '한 해를 한 줄로',
  /** 메모 글자 수를 읽는 말 */
  noteCount: ({ n, max }: { n: number; max: number }) => `${max}자 중 ${n}자`,
  /** 새 표 고르기 */
  modeContinue: '실천은 그대로',
  modeContinueSub: '달성·기록은 비워요',
  modeAreas: '영역만 남겨요',
  modeAreasSub: '실천 칸은 비워요',
  modeBlank: '빈 표',
  modeBlankSub: '영역부터 다시 정해요',
  goalLabel: '새 표의 핵심 목표',
  goalHint: '비워 두면 지금 목표를 그대로 써요',
  /** 마무리 쪽 */
  keepNote: '지금 표는 보관함에 그대로 남아요',
  keepSub: '기록도 함께 담아 두니 언제든 다시 볼 수 있어요',
  start: '새 표 시작하기',
  started: '새 표를 시작했어요',
  sameDay: '오늘 시작한 표는 내일부터 마무리할 수 있어요',
  /** 설정 › 기록 */
  settingsHead: '한 해',
  shelf: '지난 표 보관함',
  shelfEmpty: '아직 없어요',
  /** 홈 — 12월 15일 ~ 1월 31일 */
  homePrompt: '올해 표를 마무리할 때예요',
  homePromptAction: '한 해 돌아보기',

  // V3-D — 한 해 화면(돌아보기 · 통계의 한 해 구역)
  /** 화면 머리 — 보관함에서 연 지난 표 한 장 */
  sheetTitle: '지난 표',
  /** 보관함 · 지난 표 쪽을 채우기 전의 괘선 한 줄(V4-B가 채운다) */
  loading: '아직 준비 중이에요',
  /** 지금 쓰는 표의 돌아보기 — 기간 아래 작은 줄 */
  currentChart: '지금 쓰는 표',
  /** 네 숫자 중 하나 — 좁은 칸에 들어가게 짧게 */
  statStreak: '가장 긴 연속',
  calendarTitle: '한 해 달력',
  framesTitle: '표가 채워진 모습',
  /** 네 장면 중 하나를 읽는 말 — label은 '3월 31일' */
  frameSpeech: ({ label, n }: { label: string; n: number }) => `${label}까지, 64칸 중 ${n}칸 달성`,
  wearTitle: '닳은 자리',
  /** 닳은 자리 오른쪽 — 칸마다 4주에 한 날 수의 평균으로 칠한다 */
  wearRight: '4주 평균',
  weeksTitle: '돌아본 주',
  notesTitle: '회고',
  notesEmpty: '이 표를 쓰는 동안 남긴 한 줄이 없어요',
  /** '회고 12개 더 보기' */
  notesMore: ({ n }: { n: number }) => `회고 ${n}개 더 보기`,
  more: '더 보기',
  printLink: '인쇄용 PDF',
  /** 잠긴 지난 표 — 보관함 줄 오른쪽 */
  lockedLine: '지난 표의 한 해 돌아보기는 프로에서 볼 수 있어요',
  lockedLink: '프로 알아보기',
  /** 통계 › 한 해 */
  statsShelf: ({ n }: { n: number }) => `보관함 ${n}장`,

  // V4-B — 보관함(지난 표 목록) · 지난 표 한 장
  /** 보관함이 비었을 때 */
  shelfNone: '아직 보관한 표가 없어요',
  shelfNoneSub: '한 해를 마무리하면 그 표가 여기에 남아요',
  /** 보관함 한 줄의 셋째 줄 — '64칸 중 24칸 달성 · 120일 기록' */
  shelfLine: ({ n, days }: { n: number; days: number }) => `64칸 중 ${n}칸 달성 · ${days}일 기록`,
  /** 보관함 아래 — '지난 표 24장 더 보기' */
  shelfMore: ({ n }: { n: number }) => `지난 표 ${n}장 더 보기`,
  /** 잠긴 줄을 누르면 무엇을 하는지(화면 읽기) */
  shelfLockedHint: '프로에서 펼쳐 볼 수 있어요',
  /** 지난 표 한 장 — 표 그림을 읽는 말 */
  sheetSpeech: ({ label, goal, n }: { label: string; goal: string; n: number }) => (goal ? `${label} 표, ${goal}, 64칸 중 ${n}칸 달성` : `${label} 표, 64칸 중 ${n}칸 달성`),
  /** 영역 장부 */
  areasTitle: '영역별로 보기',
  /** 이름을 짓지 않은 영역 */
  areaUnnamed: ({ n }: { n: number }) => `영역 ${n}`,
  /** 영역 한 줄 오른쪽 — '8칸 중 3칸 달성' */
  areaLine: ({ n, of }: { n: number; of: number }) => `${of}칸 중 ${n}칸 달성`,
  /** 영역 줄을 누르면(화면 읽기) */
  areaOpenHint: '이 영역의 아홉 칸을 펼쳐요',
  areaCloseHint: '아홉 칸을 접어요',
  /** 아래 두 링크 */
  sheetReview: '이 해 돌아보기',
  /** 잠긴 지난 표 한 장 */
  sheetLocked: '지난 표를 펼쳐 보는 건 프로에서 할 수 있어요',
} satisfies Namespace;
