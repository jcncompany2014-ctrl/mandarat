// 디자인 A '깨끗한 한 장'의 토큰 — 밝게 · 어둡게 두 벌의 색과 자리 수치(docs/design/build-plan.md §2.1).
// 값은 docs/design/mockups/a/tokens.css와 같다. 영역 i(0~7)는 doc.themes[i], dye[i]는 --dye-(i+1).
// RN에는 color-mix가 없어 tint(쓴 칸 · 고른 영역)와 dyeText(영역 색을 글씨로, 4.6:1 이상)를 여기서 미리 정해 둔다.
// react-native를 들이지 않는다(테스트가 Node에서 그대로 require한다). 머리카락 선은 쓰는 곳에서 StyleSheet.hairlineWidth.

export interface Tokens {
  dark: boolean;
  paper: string; paperVeil: string;
  ink: string; ink2: string; ink3: string;
  printStrong: string; print: string; printEdge: string; printMid: string; printRule: string; ghost: string; tile: string;
  signal: string;
  dye: readonly string[]; wash: readonly string[]; washL1: readonly string[]; tint: readonly string[]; dyeText: readonly string[];
  onDye: string; core: string; onCore: string; tick: string;
  btn: string; onBtn: string; add: string; onAdd: string; capsule: string;
  float: string; scrim: string;
}

export const LIGHT: Tokens = {
  dark: false,
  paper: '#FFFFFF', paperVeil: 'rgba(255,255,255,0.94)',
  ink: '#191B1F', ink2: '#5F6670', ink3: '#9AA0A8',
  printStrong: '#4B5059', print: '#6B727C', printEdge: '#868D96', printMid: '#D5D9DE', printRule: '#EEF0F2', ghost: '#D5D9DE', tile: '#F3F4F6',
  signal: '#C4372F',
  dye:     ['#447753', '#5068AB', '#916329', '#A35468', '#2E7773', '#7C5FA5', '#38719B', '#A65633'],
  wash:    ['#AFCFB6', '#B0C2EE', '#DFC09F', '#ECB7C1', '#A4CDCA', '#CDBCEA', '#A7C9E5', '#EDB7A1'],
  washL1:  ['#9BBAA2', '#9BADD8', '#CBAD8C', '#D8A4AE', '#8FB7B4', '#B8A7D4', '#92B4CF', '#D8A38D'],
  tint:    ['#E4EBE5', '#E5E9F4', '#F0E8E0', '#F3E6E8', '#E2EBEA', '#ECE8F3', '#E2EAF1', '#F4E7E1'],
  dyeText: ['#427250', '#4E65A5', '#8B5F29', '#9B5164', '#2D726F', '#765B9D', '#366C94', '#9F5332'],
  onDye: '#FFFFFF', core: '#221F1B', onCore: '#FFFFFF', tick: '#191B1F',
  btn: '#191B1F', onBtn: '#FFFFFF', add: '#191B1F', onAdd: '#FFFFFF', capsule: '#FFFFFF',
  float: '0 0 0 0.5px rgba(25,27,31,0.06), 0 1px 2px rgba(25,27,31,0.06), 0 8px 24px rgba(25,27,31,0.10)',
  scrim: 'rgba(25,27,31,0.32)',
};

export const DARK: Tokens = {
  dark: true,
  paper: '#121316', paperVeil: 'rgba(18,19,22,0.92)',
  ink: '#ECEDEF', ink2: '#A3A8B0', ink3: '#6B7078',
  printStrong: '#C6CAD0', print: '#9AA0A8', printEdge: '#6E747C', printMid: '#33363C', printRule: '#24262B', ghost: '#33363C', tile: '#1D1F23',
  signal: '#E2543F',
  dye:     ['#40704D', '#4D64A3', '#885D26', '#9A4F62', '#2C706D', '#75599A', '#356A92', '#9C5231'],
  wash:    ['#253426', '#282D3F', '#3F2E19', '#46292E', '#1E3430', '#362B3E', '#22323D', '#44291C'],
  washL1:  ['#2E4732', '#354061', '#553C1D', '#5F343E', '#234744', '#4B3A5C', '#284358', '#603623'],
  tint:    ['#181F1D', '#1A1D27', '#211D1A', '#231B20', '#171F21', '#1E1C26', '#181E25', '#231C1B'],
  dyeText: ['#6A8F74', '#7285B6', '#A28156', '#B07685', '#5D918F', '#937EB0', '#618BAA', '#B37A60'],
  onDye: '#F4F5F6', core: '#4A4E55', onCore: '#F4F5F6', tick: '#ECEDEF',
  btn: '#ECEDEF', onBtn: '#121316', add: '#ECEDEF', onAdd: '#121316', capsule: '#1D1F23',
  float: '0 0 0 0.5px rgba(236,230,216,0.10), 0 8px 24px rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.55)',
};

/** iOS Increase Contrast: same object per palette (WeakMap), as usePalette does today */
export const moreContrast = (t: Tokens): Tokens =>
  ({ ...t, printRule: t.printMid, printEdge: t.ink2, print: t.printStrong, ink3: t.ink2 });

export const GEO = {
  gutter: 24, row: 54, header: 72, sectionGap: 30,
  rCheck: 6, rTag: 2, rField: 12, rSegCell: 9, rChip: 10, rTool: 29, rSheet: 28, rBlock: 10,
  bar: { h: 58, side: 16, bottom: 18, gap: 10, addW: 66, veil: 40 },
  sheet: { inset: 8, pad: 24 },
  dye: 8, rule: 1, ruleHeavy: 1.5,
} as const;

/** 넓은 창(웹 · 아이패드)에서 종이 단 바깥의 책상 — 밝게는 tile, 어둡게는 종이보다 한 톤 깊게 */
export const desk = (t: Pick<Tokens, 'dark' | 'tile'>): string => (t.dark ? '#0B0C0E' : t.tile);
