// 'kinds' namespace — 行動の種類の名前・説明・一行（KindLine）・種類の提案（X-B）。
import type ko from '../ko/kinds';
import type { Like } from '../types';
import { groupNum } from '../num';
import fmt from './fmt';

/** 曜日の習慣の一行 — 毎日 · 平日 · 毎週末 · 毎週日曜日 · 月・水・金（2日以上は「毎週」を付けず、行を短く保つ） */
function repeatDays(dows: readonly number[]): string {
  const label = fmt.daysLabel({ dows });
  const days = [...new Set(dows)].sort((a, b) => a - b);
  if (!label || label === '毎日' || label === '平日') return label;
  if (days.join() === '0,6') return '毎週末';
  return days.length === 1 ? `毎週${label}` : label;
}

export default {
  labelOnce: '単発',
  labelHabit: '習慣',
  labelCount: '累計',
  labelMind: '心がけ',
  hintOnce: '締め切りの3日前から「今日」に入ります',
  hintHabit: '決めた曜日ごとに「今日」に入ります。週に何回と決めると、その回数をこなすまで毎日入ります。',
  hintCount: '数を積み上げていく行動です。目標の数に届くと、マスが達成になります。',
  hintMind: '週に一度、1〜5点でふりかえります',
  presetWeek: '今週中',
  presetMonth: '今月中',
  preset3Months: '3か月後',
  presetYear: '年内',
  dateOtherYear: ({ d, y }) => `${y}/${fmt.dateShort({ d })}`,
  rating1: 'ほとんど守れませんでした',
  rating2: '少し守れました',
  rating3: '半分くらい守れました',
  rating4: 'よく守れました',
  rating5: 'とてもよく守れました',
  weekShort: ({ done, total }) => `今週 ${done}/${total}`,
  weekLong: ({ done, total }) => `今週 ${done}/${total}回`,
  weekPlan: ({ n }) => `週${n}回`,
  weekSpeech: ({ done, total }) => `今週${total}回のうち${done}回`,
  daysShort: ({ dows }) => fmt.daysLabel({ dows }),
  daysLong: ({ dows }) => repeatDays(dows),
  countText: ({ count, total, unit }) => `${groupNum(count)}/${groupNum(total)}${unit}`,
  countSpeech: ({ count, total, unit }) => `${groupNum(total)}${unit}のうち${groupNum(count)}${unit}`,
  countToday: ({ text, n }) => `${text}・今日 +${groupNum(n)}`,
  countTodaySpeech: ({ said, n, unit }) => `${said}、今日${groupNum(n)}${unit}足しました`,
  dueSpeech: ({ days }) => (days > 0 ? `締め切りまであと${days}日` : days === 0 ? '今日が締め切り' : `締め切りを${-days}日過ぎています`),
  mindShort: ({ n }) => `心がけ ${n}点`,
  mindLong: ({ n }) => `心がけ・今週${n}点`,
  mindSpeech: ({ n }) => `心がけ、今週${n}点`,
  suggestPerWeek: ({ n }) => `週${n}回の習慣`,
  suggestDays: ({ dows }) => `${fmt.daysLabel({ dows })}の習慣`,
  suggestCount: ({ n, unit }) => `${groupNum(n)}${unit}の積み上げ`,
  suggestOnce: '一度きりの行動',
  suggestMind: '心がけ',
} satisfies Like<typeof ko>;
