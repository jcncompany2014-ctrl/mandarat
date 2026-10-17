// 'year' namespace — filled by V1-D · V2-E · V3-D · V4-B (docs/v2/plan.md Appendix B).
import type ko from '../ko/year';
import type { Like } from '../types';

const MONTH_JA = (m: number) => `${m}月`;

export default {
  // V1-D — backup import ledger row for past charts
  ledgerArchives: '過去の表',
  archiveCount: ({ n }) => `${n}枚`,

  // V2-E — year close (overlay · settings rows · home prompt)
  pageReview: '一年のふりかえり',
  pageNew: '新しい表',
  pageStart: '締めくくり',
  pageSpeech: ({ n, total }) => `${total}ページ中${n}ページ目`,
  next: '次へ',
  statDays: '記録した日',
  statLongest: 'いちばん長く続いた日数',
  statAchieved: '達成',
  statFocus: '集中',
  achievedSpeech: ({ n }) => `64マス中${n}マス`,
  ledgerTitle: '月ごとの記録した日',
  monthShort: ({ m }) => MONTH_JA(m),
  monthLong: ({ y, m }) => `${y}年${MONTH_JA(m)}`,
  monthSpeech: ({ label, n }) => (n > 0 ? `${label}、記録した日${n}日` : `${label}、記録なし`),
  noteLabel: '一年をひとことで',
  noteCount: ({ n, max }) => `${max}文字中${n}文字`,
  modeContinue: '行動はそのまま',
  modeContinueSub: '達成と記録は空にします',
  modeAreas: '分野だけ残します',
  modeAreasSub: '行動のマスは空にします',
  modeBlank: '白紙の表',
  modeBlankSub: '分野から決め直します',
  goalLabel: '新しい表の中心の目標',
  goalHint: '空のままなら今の目標をそのまま使います',
  keepNote: '今の表は保管庫にそのまま残ります',
  keepSub: '記録もいっしょに残るので、いつでも見返せます',
  start: '新しい表を始める',
  started: '新しい表を始めました',
  sameDay: '今日始めた表は、明日から締めくくれます',
  settingsHead: '一年',
  shelf: '過去の表の保管庫',
  shelfEmpty: 'まだありません',
  homePrompt: '今年の表を締めくくる時期です',
  homePromptAction: '一年のふりかえり',
} satisfies Like<typeof ko>;
