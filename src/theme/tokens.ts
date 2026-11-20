// 디자인 A '깨끗한 한 장'의 토큰 — 밝게 · 어둡게 두 벌의 색과 자리 수치(docs/design/build-plan.md §2.1).
// 값은 docs/design/mockups/a/tokens.css와 같다. 영역 i(0~7)는 doc.themes[i], dye[i]는 --dye-(i+1).
// RN에는 color-mix가 없어 tint(쓴 칸 · 고른 영역)와 dyeText(영역 색을 글씨로, 4.6:1 이상)를 여기서 미리 정해 둔다.
// 칸의 사다리(OKLab 밝기): 종이 → tile(빈 칸) → tint(쓴 칸) → wash(달성) → washL1 → dye(이름 칸). 두 벌 모두 이 차례로
// 한 방향이다(밝게는 어두워지고 어둡게는 밝아진다) — 쓴 칸이 빈 칸과 같아 보이거나 더 가라앉지 않게, tint는 tile에서
// ΔE(OKLab × 100) 5.4쯤 떨어뜨렸다(tests/a-tokens '칸의 사다리').
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
  printStrong: '#4B5059', print: '#686F79', printEdge: '#868D96', printMid: '#D5D9DE', printRule: '#EEF0F2', ghost: '#D5D9DE', tile: '#F3F4F6',
  signal: '#C4372F',
  dye:     ['#447753', '#5068AB', '#916329', '#A35468', '#2E7773', '#7C5FA5', '#38719B', '#A65633'],
  wash:    ['#AFCFB6', '#B0C2EE', '#DFC09F', '#ECB7C1', '#A4CDCA', '#CDBCEA', '#A7C9E5', '#EDB7A1'],
  washL1:  ['#9BBAA2', '#9BADD8', '#CBAD8C', '#D8A4AE', '#8FB7B4', '#B8A7D4', '#92B4CF', '#D8A38D'],
  tint:    ['#DAE7DD', '#DCE3F5', '#EEE1D4', '#F3DDE1', '#D7E7E6', '#E6DFF2', '#D8E5F1', '#F4DED5'],
  dyeText: ['#3C6F4C', '#4961A3', '#885A1F', '#994B60', '#256F6B', '#72559A', '#306992', '#9C4D2A'],
  onDye: '#FFFFFF', core: '#221F1B', onCore: '#FFFFFF', tick: '#191B1F',
  btn: '#191B1F', onBtn: '#FFFFFF', add: '#191B1F', onAdd: '#FFFFFF', capsule: '#FFFFFF',
  float: '0 0 0 0.5px rgba(25,27,31,0.06), 0 1px 2px rgba(25,27,31,0.06), 0 8px 24px rgba(25,27,31,0.10)',
  scrim: 'rgba(25,27,31,0.32)',
};

export const DARK: Tokens = {
  dark: true,
  paper: '#121316', paperVeil: 'rgba(18,19,22,0.92)',
  ink: '#ECEDEF', ink2: '#B4B9C0', ink3: '#6B7078',
  printStrong: '#C6CAD0', print: '#ABB1B9', printEdge: '#6E747C', printMid: '#33363C', printRule: '#24262B', ghost: '#33363C', tile: '#1D1F23',
  signal: '#EB6A54',
  dye:     ['#40704D', '#4D64A3', '#885D26', '#9A4F62', '#2C706D', '#75599A', '#356A92', '#9C5231'],
  wash:    ['#2B4131', '#2F3A58', '#4B371F', '#522F37', '#24413F', '#413452', '#263E51', '#543122'],
  washL1:  ['#37523E', '#3B496D', '#5D4529', '#663C46', '#2F5250', '#514266', '#314E64', '#683E2C'],
  tint:    ['#202F23', '#222A3E', '#362817', '#3B2228', '#1B2F2E', '#2E263B', '#1C2D3A', '#3C2419'],
  dyeText: ['#789C80', '#7E92C3', '#AF8D66', '#BD818E', '#6D9D9A', '#9D89BC', '#7198B8', '#BF846B'],
  onDye: '#F4F5F6', core: '#4A4E55', onCore: '#F4F5F6', tick: '#ECEDEF',
  btn: '#ECEDEF', onBtn: '#121316', add: '#ECEDEF', onAdd: '#121316', capsule: '#1D1F23',
  float: '0 0 0 0.5px rgba(236,230,216,0.10), 0 8px 24px rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.55)',
};

/** 두 색의 가운데(#RRGGBB) — 대비 증가 판에서 washL1을 한 단 올릴 때 */
const midway = (a: string, b: string): string =>
  `#${[1, 3, 5].map((i) => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/**
 * iOS Increase Contrast: same object per palette (WeakMap), as usePalette does today.
 * 괘선 · 가장자리 · 인쇄 글씨를 한 단계 진하게, 칸의 칠도 한 단씩 올린다(쓴 칸 tint → wash, 달성 wash → washL1,
 * washL1 → washL1과 dye의 가운데) — 옅은 색 셋(빈 칸 · 쓴 칸 · 달성)만으로 가르던 상태가 더 벌어지고, 사다리는 그대로 한 방향.
 * 영역 색 글씨(dyeText)는 먹으로(올린 칠 위에서도 9:1 이상). 올린 washL1 위에는 글을 놓지 않는다(막대 · 작은 지도의 칠).
 */
export const moreContrast = (t: Tokens): Tokens => ({
  ...t, printRule: t.printMid, printEdge: t.ink2, print: t.printStrong, ink3: t.ink2,
  tint: t.wash, wash: t.washL1, washL1: t.washL1.map((w, i) => midway(w, t.dye[i])), dyeText: t.dyeText.map(() => t.ink),
});

export const GEO = {
  gutter: 24, row: 54, header: 72, sectionGap: 30,
  rCheck: 6, rTag: 2, rField: 12, rSegCell: 9, rChip: 10, rTool: 29, rSheet: 28, rBlock: 10,
  bar: { h: 58, side: 16, bottom: 18, gap: 10, addW: 66, veil: 40 },
  sheet: { inset: 8, pad: 24 },
  dye: 8, rule: 1, ruleHeavy: 1.5,
} as const;

/** 넓은 창(웹 · 아이패드)에서 종이 단 바깥의 책상 — 밝게는 tile, 어둡게는 종이보다 한 톤 깊게 */
export const desk = (t: Pick<Tokens, 'dark' | 'tile'>): string => (t.dark ? '#0B0C0E' : t.tile);
