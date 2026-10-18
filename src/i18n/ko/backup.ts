// 'backup' 이름공간 — 백업 불러오기 시트 · 장부 · 설정의 마지막 백업 줄 · 글 백업 머리말(X-K, docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';
import fmt from './fmt';

export default {
  // ── 불러오기 오류(parseBackup의 코드) ──
  errEmpty: '붙여넣은 내용이 없어요',
  errNotFound: '백업 내용을 찾지 못했어요. 내보낸 글 전체를 붙여넣어 주세요',
  errBroken: '백업 내용이 잘렸거나 손상됐어요. 처음부터 끝까지 다시 복사해 주세요',
  errNotOurs: '만다라트 백업 형식이 아니에요',
  errNewer: '더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 불러와 주세요',
  /** 파일 고르기에서 읽지 못했을 때 */
  fileFailed: '파일을 읽지 못했어요. 다시 골라 주세요',

  // ── 백업 불러오기 시트 ──
  sheetTitle: '백업 불러오기',
  sheetBody: '지금 기록이 백업 내용으로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.',
  pickFile: '백업 파일 고르기',
  pickOther: '다른 백업 파일 고르기',
  pickSub: '저장해 둔 백업 파일(.json)',
  pasteHelp: '메모나 메신저에 보관한 백업 글은 길게 눌러 전체 선택 → 복사한 뒤 여기에 붙여 넣어요',
  pasteLabel: '백업 글 붙여 넣기',
  pastePlaceholder: '백업 글 전체를 붙여 넣기',
  /** 파일에서 읽었을 때 붙여 넣기 칸 자리의 줄 */
  fromFile: '파일에서 읽었어요',
  fromFileSay: ({ name }: { name: string }) => `파일에서 읽었어요, ${name}`,
  toPaste: '붙여 넣기로',
  toPasteLabel: '붙여 넣기로 바꾸기',
  toPasteHint: '파일 대신 백업 글을 붙여 넣어요',
  /** 아래 주 버튼 */
  apply: '이 백업으로 바꾸기',
  /** 바꾼 뒤 되돌리기 토스트 */
  applied: '백업을 불러왔어요',
  readOk: '읽을 수 있는 백업이에요',
  /** '10월 14일 수요일에 만든 백업' */
  exportedOn: ({ d }: { d: Date }) => `${fmt.dateLong({ d })}에 만든 백업`,
  newerNow: '지금 기록이 백업보다 최근이에요 · 바꾸면 최근 기록이 사라져요',

  // ── 지금 | 백업 장부(설정 › iCloud 고르기 시트도 같은 줄을 쓴다) ──
  colNow: '지금',
  colBackup: '백업',
  /** 값이 없는 칸 */
  none: '없음',
  rowGoal: '핵심 목표',
  rowFilled: '채운 칸',
  rowDone: '달성',
  rowDays: '기록 일수',
  rowLast: '마지막 기록',
  /** 채운 칸을 소리로 — '23/64'를 날짜로 읽지 않게 */
  filledSay: ({ n }: { n: number }) => `64칸 중 ${n}칸`,
  /** 장부 한 줄을 소리로 — '채운 칸, 지금 64칸 중 23칸, 백업 64칸 중 41칸' */
  rowSay: ({ label, now, backup }: { label: string; now: string; backup: string }) => `${label}, 지금 ${now}, 백업 ${backup}`,

  // ── 설정 › 백업 내보내기 아래 한 줄 ──
  ageNever: '아직 백업하지 않았어요',
  ageToday: '마지막 백업 · 오늘',
  ageDays: ({ n }: { n: number }) => `마지막 백업 · ${n}일 전`,

  /** 글로 보내는 백업의 머리말 — 중괄호 없이(불러오기는 첫 '{'부터 읽는다) */
  textPrefix: ({ d, y }: { d: Date; y: number }) => `만다라트 백업 · ${fmt.year({ y })} ${fmt.monthDay({ d })}\n설정 › 백업 불러오기에 이 글 전체를 붙여 넣으면 돼요.\n\n`,
} satisfies Namespace;
