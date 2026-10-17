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
} satisfies Namespace;
