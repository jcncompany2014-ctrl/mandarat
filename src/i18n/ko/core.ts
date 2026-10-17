// 'core' 이름공간 — 여러 화면이 함께 쓰는 바탕 글(탭바 · 시트 · 오류 화면 · 표 읽기 · 요일 칸 · 이름표). X-0가 채운다(docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';
import fmt from './fmt';

const ORD = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'];

export default {
  // 탭바 (src/navigation/Root.tsx)
  tabHome: '홈',
  tabGrid: '만다라트',
  tabToday: '오늘',
  tabStats: '통계',
  /** 가운데 담기 칸 — 보이는 글 · 이름 */
  tabAdd: '담기',
  tabAddHint: '오늘 할 일을 적어 담아요',
  /** 오늘 할 일을 마지막 하나까지 했을 때 */
  todayAllDone: '오늘 할 일을 다 했어요',
  /** 한 영역 8칸을 다 달성했을 때 — 이름이 없으면 영역 번호(n, 1부터) */
  areaAllDone: ({ name, n }: { name: string; n: number }) => `${name ? `${name} 영역` : `영역 ${n}`} 8칸을 모두 달성했어요`,
  /** 되돌리기가 달린 안내를 화면 읽기로 읽을 때 (src/navigation/ui.tsx) */
  undoable: ({ message }: { message: string }) => `${message}. 되돌릴 수 있어요`,
  /** 통째 바꾸기를 되돌리려는데 그사이 다른 기록이 생겼을 때 (src/store/useSnapshotUndo.ts) */
  undoStale: '그사이 바뀐 게 있어 되돌릴 수 없어요',

  // 공용 부품 (src/components/common.tsx)
  back: '뒤로 가기',
  sheetHandle: '시트 닫기',
  sheetHandleHint: '아래로 끌어내려도 닫혀요',
  /** 색인 탭 이름 + 개수 */
  labelCount: ({ label, n }: { label: string; n: number }) => `${label}, ${n}개`,

  // 오류 화면 (src/components/ErrorBoundary.tsx)
  crashTitle: '화면을 열지 못했어요',
  crashBody: '저장된 기록은 그대로 있어요.\n다시 시도해 주세요. 같은 화면이 또 나오면 먼저 기록을 내보내 두세요.',
  crashExport: '기록 내보내기',
  crashExportEmpty: '저장된 기록이 아직 없어요',
  crashExportFailed: '기록을 내보내지 못했어요. 한 번 더 눌러 주세요',

  // 반복 요일 고르기 (src/components/DayPicker.tsx) — i: 0 = 일요일
  repeatDow: ({ i }: { i: number }) => `${fmt.dowLong({ i })} 반복`,
  /** 매일 · 평일 · 주말 빠른 선택의 이름 */
  repeatLabel: ({ label }: { label: string }) => `${label} 반복`,
  noRepeat: '반복 안 함',

  // 표 읽기 (src/lib/chartSpeech.ts)
  /** 고유어 서수 — '세'(번째). 8을 넘으면 숫자 */
  ordinal: ({ n }: { n: number }) => ORD[n - 1] ?? `${n}`,
  /** 화면 읽기 목록의 쉼표 */
  listSep: ', ',
  cellEmpty: '비어 있음',
  cellDidToday: '오늘 했어요',
  cellOnToday: '오늘 할 일',
  cellAchieved: '달성',
  /** 영역 이름표 — 적은 칸이 없을 때 */
  areaUnwritten: ({ name }: { name: string }) => `${name}, 실천을 아직 적지 않았어요`,
  /** 영역 이름표 — 8칸 중 done칸 달성, 오늘 할 일 n칸(0이면 뺀다) */
  areaSummary: ({ name, done, n }: { name: string; done: number; n: number }) =>
    `${name}, 8칸 중 ${done}칸 달성${n > 0 ? `, 오늘 ${n}칸` : ''}`,

  // 주간 칸 (src/lib/marks.ts) — 하루 상태의 말
  dayDoneToday: '오늘 함',
  dayDone: '함',
  dayToday: '오늘',
  dayMissed: '놓침',
  dayPlanned: '예정',
  dayRestToday: '오늘 쉬는 날',
  dayRest: '쉬는 날',
  /** 주간 칸 한 줄 읽기의 하루 — '월 함' (i: 0 = 일요일) */
  stripDay: ({ i, word }: { i: number; word: string }) => `${fmt.dowShort({ i })} ${word}`,
  /** 요일 칸 하나의 이름 — '수요일 오늘' */
  dayState: ({ i, word }: { i: number; word: string }) => `${fmt.dowLong({ i })} ${word}`,
  /** 지난 요일 칸 버튼 — 기록 지우기 */
  dayClear: ({ i }: { i: number }) => `${fmt.dowLong({ i })} 기록 지우기`,
  /** 지난 요일 칸 버튼 — 했어요로 남기기 */
  dayMark: ({ i }: { i: number }) => `${fmt.dowLong({ i })} 했어요로 남기기`,

  // 표시 이름 (src/lib/copy.ts) — 저장값은 그대로, 화면에는 이 이름만
  mgmtList: '목록',
  mgmtStreak: '연속 기록',
  mgmtBoard: '보드',
  shapeRound: '둥글게',
  shapeSquare: '반듯하게',
  paperIvory: '미색',
  paperCream: '크림',
  paperGray: '회색',
  paperLavender: '연보라',
  paperDark: '다크',
  mood0: '힘듦',
  mood1: '별로',
  mood2: '보통',
  mood3: '좋음',
  mood4: '최고',

  // 포인트 색 이름 (src/theme/palette.ts)
  accentGold: '골드',
  accentRouge: '연지',
  accentMugwort: '쑥',
  accentIndigo: '쪽빛',
  accentMulberry: '오디',

  // 81칸에 들어가는지 (src/theme/chart.ts)
  fitAll: '81칸에 다 들어가요',
  fitLines: ({ max }: { max: number }) => `81칸에서는 ${max}줄까지만 보여요`,
} satisfies Namespace;
