// 'sheet' 이름공간 — 실천 시트 · 오늘 줄의 체크 · 64칸 축하 페이지(X-C, docs/v2/plan.md 부록 B).
// 숫자는 groupNum으로 묶는다(src/lib/text.ts fmtNum과 같은 결과). 단위(unit)는 사용자가 적은 글 그대로 숫자에 붙인다.
import { groupNum } from '../num';
import { josa } from './josa';
import type { Namespace } from '../types';

type Amount = { n: number; unit: string };
const amt = ({ n, unit }: Amount) => `${groupNum(n)}${unit}`;

export default {
  // ── 실천 시트 머리 ──
  /** 영역 이름이 비었을 때 — '영역 3' */
  areaFallback: ({ n }: { n: number }) => `영역 ${n}`,
  /** 머리(작은 3×3 + 영역 이름) 버튼 — ordinal은 fmt.ordinalCell('세 번째 칸') */
  headA11y: ({ area, ordinal }: { area: string; ordinal: string }) => `${area} 영역, ${ordinal}, 영역 보기`,
  edit: '글과 유형 고치기',
  /** 실천 글이 비었을 때 */
  actionFallback: '실천',
  titleA11y: ({ text, subtitle }: { text: string; subtitle: string }) => `${text}, ${subtitle}, 글과 유형 고치기`,
  /** 제목 아래 한 줄 — 쌓기 '한 번에 1권' · 마음가짐 '한 주에 한 번' (앞의 유형 이름은 kinds의 이름) */
  perStep: (p: Amount) => `한 번에 ${amt(p)}`,
  onceAWeek: '한 주에 한 번',

  // ── 체크 줄 · 습관 ──
  checkHint: '다시 누르면 해제돼요',
  doneToday: '오늘 했어요',
  thisWeek: '이번 주',
  /** 이번 주 머리 오른쪽 — '2/3회' */
  weekCount: ({ count, total }: { count: number; total: number }) => `${count}/${total}회`,
  yesterdayToo: '어제도 했어요',
  yesterdayTooA11y: '어제도 했어요, 어제 기록 남기기',
  /** 지난 날을 눌러 남기거나 지웠을 때 — dow는 fmt.dowLong('화요일') */
  backfillDone: ({ dow }: { dow: string }) => `${dow}에 한 걸로 남겼어요`,
  backfillCleared: ({ dow }: { dow: string }) => `${dow} 기록을 지웠어요`,

  // ── 쌓기 ──
  countPlus: (p: Amount) => `${amt(p)} 더하기`,
  countMinus: (p: Amount) => `${amt(p)} 빼기`,
  /** 큰 숫자 묶음 — said는 kindLine의 읽을 말 */
  countA11y: ({ said, pct }: { said: string; pct: number }) => `지금까지 ${said}, ${pct}%`,
  countWeek: (p: Amount) => `이번 주 +${amt(p)}`,
  countReached: '목표에 닿았어요',
  countLeft: (p: Amount) => `${amt(p)} 남았어요`,
  /** 쌓기 목표에 닿은 순간 — '12권 목표에 닿았어요' */
  countGoal: (p: Amount) => `${amt(p)} 목표에 닿았어요`,
  /** 오늘 줄의 '+1권' 버튼 */
  plusShort: (p: Amount) => `+${amt(p)}`,

  // ── 한 번 ──
  onceDone: '다 했어요',
  dueOn: ({ date }: { date: string }) => `마감 ${date}`,
  postponeTomorrow: '내일로',
  postponeNextWeek: '다음 주로',
  postponeTomorrowA11y: '마감 내일로 옮기기',
  postponeNextWeekA11y: '마감 다음 주로 옮기기',
  postponeTomorrowToast: '마감을 내일로 옮겼어요',
  postponeNextWeekToast: '마감을 다음 주로 옮겼어요',
  noDue: '마감 없음',
  setDue: '정하기 ›',
  noDueA11y: '마감 없음, 마감 정하기',

  // ── 마음가짐 ──
  mindAsk: '이번 주 얼마나 지켰나요?',
  mindScore: '이번 주 점수',
  mindPrompt: '떠오르는 대로 매겨요',
  mindHistory: ({ n, list }: { n: number; list: string }) => `최근 ${n}주 점수 ${list}`,
  mindPoint: ({ n }: { n: number }) => `${n}점`,
  mindNone: '없음',
  /** 지난 점수 막대의 첫 이름표 — '7주 전' */
  weeksAgo: ({ n }: { n: number }) => `${n}주 전`,

  // ── 아래 줄들 ──
  todayAlready: '오늘 할 일에 이미 있어요',
  todayRemoved: '오늘 할 일에서 뺐어요',
  todayAdded: '오늘 할 일에 담았어요',
  todayRow: '오늘 할 일에 담기',
  todayAuto: '저절로 담겨 있어요',
  todayAutoA11y: '오늘 할 일에 담기, 저절로 담겨 있어요',
  todayAutoHint: '왜 담겼는지 알려 줘요',
  focusRow: '25분 집중하기',
  focusStart: '시작 ›',
  focusRowA11y: '25분 집중하기, 시작',
  unachieveHint: '다시 누르면 달성을 풀어요',
  achieveHabitHint: '몸에 뱄다면 눌러 주세요',
  achieveMindHint: '자리 잡았다면 눌러 주세요',
  achieved: '달성한 칸이에요',
  achieve: '이 칸 달성하기',
  achieveA11y: '이 칸 달성',
  memo: '메모',

  // ── 오늘 줄(TodayRow) · 체크(todayCheck) ──
  rowDone: '했어요',
  rowUnlog: '오늘 더한 것 빼기',
  rowUndone: '했어요 지우기',
  rowMarkDone: '했어요로 남기기',
  rowWeek: ({ count, total }: { count: number; total: number }) => `이번 주 ${total}회 중 ${count}회`,
  rowDelete: '지우기',
  rowOpenHint: '실천 자세히 보기',
  rowOpen: '자세히 보기',
  /** 직접 추가한 할 일의 정보 줄 — '건강 · 직접 적음' */
  rowWritten: '직접 적음',
  /** 쌓기 체크를 풀어 오늘 더한 것을 뺐을 때 */
  undoAdd: (p: Amount) => `오늘 더한 ${josa(amt(p), '을/를')} 뺐어요`,
  extraRemoved: '할 일을 지웠어요',
  hintMark: '했어요로 남겨요',
  hintUnlog: '오늘 더한 것을 빼요',
  hintUndone: '했어요를 지워요',
  /** 체크하고 읽어 주는 한 문장 */
  checkedLeft: ({ text, n }: { text: string; n: number }) => `${text}, 했어요. 오늘 ${n}개 남았어요`,
  checked: ({ text }: { text: string }) => `${text}, 했어요`,
  /** 쌓기를 한 번 더 더했을 때 — '책 읽기, 12권 중 7권' ('7/12'는 날짜로 읽히므로 말로) */
  addedSpeech: ({ text, count, total, unit }: { text: string; count: number; total: number; unit: string }) =>
    `${text}, ${amt({ n: total, unit })} 중 ${amt({ n: count, unit })}`,

  // ── 64칸 축하 페이지 ──
  finaleTitle: '64칸을 모두 달성했어요',
  finaleCountA11y: '64칸 중 64칸',
  finaleGoal: ({ goal }: { goal: string }) => `핵심 목표 · ${goal}`,
  finaleStreak: ({ n }: { n: number }) => `연속 ${n}일째`,
} satisfies Namespace;
