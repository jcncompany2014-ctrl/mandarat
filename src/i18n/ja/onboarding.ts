// 'onboarding' namespace — the first screen (src/screens/Onboarding.tsx, X-I).
// The goal examples ex1–ex3 are concrete goals with a number (no year), and never repeat the placeholder.
import type ko from '../ko/onboarding';
import type { Like } from '../types';

export default {
  recoveredTitle: '保存した記録を読み込めませんでした',
  recoveredBody: '読み込めなかった記録は消さずに、別に保管してあります。',

  heading: '今年かなえたい目標を\nひとつ書いてください',
  goalLabel: '中心の目標',
  goalPlaceholder: '例）初めてのマラソンを完走',
  exampleMark: '例）',
  ex1: '体重を5kg落とす',
  ex2: 'TOEICで800点を取る',
  ex3: '転職を成功させる',
  exampleHint: '例・入力欄に入れます',

  templateAreas: ({ name }) => `「${name}」の8分野で始めます`,
  defaultAreas: '基本の8分野で始めます',
  defaultCaption: '基本の8分野で始めます。あとで変えられます',
  unpick: '元に戻す',
  unpickHint: '基本の分野に戻します',

  startTemplate: 'この表で始める',
  startTemplateHint: ({ name }) => `「${name}」の表で始めます`,
  start: '始める',
  startHint: 'この目標で始めます',
  later: '目標はあとで書きます',
  laterHint: '目標はあとで決めて、先に始めます',
  otherTemplate: 'ほかのテンプレートを選ぶ',
  fromTemplate: 'テンプレートで始める',
} satisfies Like<typeof ko>;
