// 'ritual' namespace — filled by X-L (docs/v2/plan.md Appendix B).
// 週のふりかえり (WeekRitual), its page copy (ritualView) and the one-line week summary (review.weekSentence).
import type ko from '../ko/ritual';
import { tsu } from './counter';
import { groupNum } from '../num';
import type { Like } from '../types';

export default {
  areaN: ({ n }) => `分野${n}`,

  pageWeek: 'この一週間',
  pageMind: '心がけ',
  pageNext: '来週の重点',
  pageSay: ({ title, page }) => `${title}、${page}`,
  next: '次へ',
  finish: '終える',
  finishWith: ({ n }) => `重点${n}マス・終える`,
  finishWithSay: ({ n }) => `重点を${n}マス選びました、終える`,

  total: ({ n }) => `${n}回`,
  totalSay: ({ range, n }) => `${range}、合計${n}回`,
  deltaMore: ({ n }) => `先週より${n}回多くできました`,
  deltaLess: ({ n }) => `先週より${n}回少なめです`,
  deltaSame: '先週と同じです',
  rowHabit: '習慣',
  rowAdded: '積み上げた分',
  rowMind: '心がけ',
  rowSay: ({ label, value }) => `${label}、${value}`,
  rowNone: 'なし',
  habitValue: ({ done, total }) => `${done}/${total}回`,
  addedValue: ({ n, unit }) => `+${groupNum(n)}${unit}`,
  addedSep: '・',
  addedSay: ({ n, unit }) => `${groupNum(n)}${unit}足しました`,
  addedSaySep: '、',
  mindValue: ({ n }) => `平均${n}点`,
  pickSay: ({ area, text }) => `${area}、${text}`,
  noteSay: ({ note }) => `ひとことメモ、${note}`,

  mindHint: 'その週を思い出して1〜5点で',

  nextHint: ({ n }) => `来週力を入れるマスを${tsu(n)}まで選びます`,
  pickedSay: ({ n }) => `${tsu(n)}選びました`,
  pickMax: ({ n }) => `選べるのは${tsu(n)}までです`,
  note: 'ひとことメモ',

  finishPicked: ({ n }) => `来週の重点を${n}マス決めました`,
  finishNone: '一週間をふりかえりました',

  sentenceAll: '8つの分野すべてに1回以上取り組みました',
  sentenceTop: ({ area, n }) => `「${area}」に${n}回取り組みました`,
  sentenceTopLow: ({ area, n, low }) => `「${area}」に${n}回取り組み、「${low}」はまだです`,
} satisfies Like<typeof ko>;
