# Build plan: design A "clean" into the app

Status: approved by the owner, to be built, then released on the App Store.
Audience: the engineers who build it, in parallel, without being able to ask. Where this plan decides something, it says so; follow it.

## 0. Ground rules (every package)

**What is true, in order.** (1) The PNGs in `docs/design/mockups/a/`. (2) The values in `tokens.css` (not its header history). (3) The drawing code in `shared.js` and `parts-*.js|css`. (4) `docs/design/brief-a2.md` › "Clean round". Ignore `direction.md`, `chart-text.png` (except for print, §2.7), `_fonts.png` and the seal (`A.seal`) and the 正 tally (`A.tally`): not used anywhere. MaruBuri is never loaded.

**Expo v56 docs.** docs.expo.dev cannot be reached from the sandbox. Read the API facts from the installed packages: `node_modules/expo-widgets/{README.md,build/*.d.ts}`, `node_modules/@expo/ui/build/swift-ui/**/*.d.ts`, `node_modules/expo-splash-screen/plugin/build/types.d.ts`, `node_modules/expo-status-bar/build/types.d.ts`, `node_modules/expo-system-ui/build/*.d.ts`, `node_modules/react-native/Libraries/Utilities/Appearance.d.ts`, `node_modules/react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts`. Facts this plan relies on (checked there): RN 0.85 `boxShadow` accepts a CSS string with several shadows (react-native-web 0.21 passes it through); `Appearance.setColorScheme('light' | 'dark' | 'unspecified')`; the splash plugin takes `dark: { image, backgroundColor }`; `@expo/ui` has `RoundedRectangle`, `Circle`, `Capsule`, `Gauge`, `Image systemName`, and the modifiers `cornerRadius`, `strokeBorder`, `strikethrough`, `font({ family, size, weight })`, but no custom path shape and no `gaugeStyle`; expo-widgets has no font bundling for the extension.

**Do not.** Add dependencies. Change data behaviour (what a tap does, what is stored) unless this plan says so. Rename or remove a `testID` (`src/lib/testIds.ts`) except the two §2.4 removes; a control that moves keeps its TID. Change accessibility roles or labels except to fit a new layout. Hard-code a colour or a size outside `src/theme`. Put a string in a component: every new string goes into `src/i18n/{ko,ja,en}/<namespace>.ts` in the same commit (`tests/i18n-catalog`, `tests/i18n-hardcoded` enforce it). Break a `memo` boundary that `tests/renderPerf.test.js` pins.

**Shared registries.** `src/lib/testIds.ts` is append-only for every package (add in your screen's group of the object); only S6 removes two entries. Each package adds strings only to the i18n namespace files it owns (listed per package); no package adds a namespace (that would touch every `index.ts`).

**Kit first.** Wave 2+ packages build only from the wave-1 kit (§3). If a part is missing, build it inside your own files, name it in your PR, and wave 4 cleanup folds it into the kit. Never edit a kit or chrome file outside its wave.

**Tests policy.** Many tests pin old visual values by regex on the source. In the package that owns the file:
- a block that pins behaviour (data, migration, sync, a11y labels, i18n, TIDs, memo, platform splits) must keep passing; if code moves, update the path or regex, not the meaning;
- a block that pins only a look (hex, size, radius, a layout regex) may be deleted; list each deleted block (file › test name) in the PR;
- new assertions go in a new file `tests/a-<package>.test.js` (package ids below), so parallel packages never edit the same lines. In shared test files, delete or edit only blocks about files you own.

**Gates.** Before every merge, in this order: `npm run typecheck`, `npm test`, `npm run web-smoke`, `npm run web-smoke -- --dev`, `npm run prebuild-check`, `npm run release-check`. Screen packages also run `npm run web-smoke -- --no-export --width 375 --langs ja,en`. Smoke screenshots land in `/tmp/web-smoke/<lang>-<name>.png`.

**Comparing with the design.** Render the mockups: `node tools/design-mockups/render.js docs/design/mockups/a --only home,chart` (PNGs next to the HTML, 2x). Capture the app: web-smoke (light) and `node tools/design-shots/capture.js --out /tmp/design-shots` (tall pages, dark, block zoom, sheet, focus, 375×667). Put them side by side at the same scale; spacing within 2pt, every colour from a token, type role exact.

**Merging.** One branch per package off the wave's base. Merge a wave only when all its packages pass the gates together on the merged tree. The plan's numbering is the merge order inside a wave when it matters.

---

## 1. What changes, screen by screen

| Mockup | Drawn today by | Must draw |
|---|---|---|
| `home.png`, `home-dark.png` | `src/screens/Dashboard.tsx`: 56pt date masthead, `MiniChart` (`GridMark.tsx`) + goal + "24칸", 이번 주 중점, today rows (`TodayRow`), 正 week tally (`Tally.tsx`), 8 areas, start guide, year/ritual prompts | Header: eyebrow "10월 14일 수요일 · 42주", the goal as the 30/40 headline, settings glyph. Hero: three fields (오늘 1/10 · 달성 24/64칸 · 남은 날 78일) left, the L1 colour map (cell 20) right. 오늘 할 일 with "전체 보기 ›": week-focus rows first (right "중점"; a focus item not due today has no box, meta "이번 주"), then the next undone, then the one done today; at most 5. 이번 주 + total ("7번") + seven bars. 8개 영역 two-column ledger. Start guide, year-close and ritual prompts stay, as link rows above 오늘 할 일. |
| `chart.png` | `GridScreen.tsx` + `FullGrid.tsx` (81 ruled text cells via `ChartBoard.tsx`, legend, `NextStepRow`) | Header eyebrow 핵심 목표, the goal as title (written), share glyph. Folio line "2026 만다라트" / "달성 **24/64칸**". The L2 colour map at the content width: names and the goal only, no action text. Note "영역을 누르면 실천 여덟 칸이 보여요". 다음 할 일: one 60pt row with chevron. |
| `first.png` | same files, empty chart + Home start guide | While fewer than 8 cells are written (`GUIDE_FILL_TARGET`): action = edit glyph (opens the goal editor); folio "쓴 칸 0/64"; the next empty cell framed in ink; then "■ 건강 · 1번 칸부터", the prompt "건강을 위해 무엇을 해 볼까요?", the note, three suggestion tiles (`suggestActions(areaTitle)`; tap = `setActionText` into the framed cell and move the frame on), primary "직접 쓰기" (opens the editor on that cell, `seq: true`). |
| `block.png` | the zoom state of `FullGrid.tsx` (+ `ChartBoard`) and `Detail.tsx` | One `AreaPage` for both: header back "‹ 만다라트" (from Detail: the screen it came from), area name as title (written), figure "4/8", more glyph. The zoomed block (3×3 tiles, text). Pager "‹ 모험 · locator 1/8 · 커리어 ›". 이번 주 습관: the area's habits as a week tracker (rows = habit cells in block order; columns 월…일; boxes only on planned days; today's column tinted; tap a box on today or a past day = `toggleHabitOn`). Under it, if the area has once/count/mind cells: their rows with the existing status line (`lib/areaPage` `rowStatus`). |
| `today.png` | `Today.tsx` (+ `TodayModes.tsx`, `IndexTabs`, `Counter`) | Header eyebrow date, title 오늘, figure "1/10", more glyph (keeps `TID.todayModes`; opens a small sheet with the three views 목록 · 연속 기록 · 보드 as choice rows). One filter line (전체 · ■건강 5 · …, scrolls sideways). Rows: week focus first, done rows stay in place. "+ 실천에서 더 고르기 ›" as a row in the box column. Below: 오늘 기분, 한 줄, 이번 주 as in `dayclose.png`. |
| `dayclose.png` | `Today.tsx` `DayClose`, `DoneHead`, `DayBlock`, `MoodRow` | When the day is closed: hero "10/10" (48/56), "오늘은 여기까지예요.", note with closing time; the list folds to one row ("이력서 갱신, 주 3회 운동 외 8개" + area marks) with "펼치기 ⌄"; 오늘 기분 as five tiles; 한 줄 field; 이번 주 bars. No double rule. |
| `stats.png` | `Stats.tsx` + `StatsCharts.tsx` (big numbers, bars, 10-week heat, wear map, ledgers, reviews, reflections, year link) | Header eyebrow "2026 · 42주 · D-78", title 통계. Hero like Home: 연속 3일 + "오늘까지 이어 왔어요", 달성 24/64칸 + "이번 달 0칸", L1 map right. Scope line 이번 주 · 10주 · 올해 + range. 이번 주: one reading sentence (prompt 20/30) + meta, seven stacked bars (washes of the areas done that day, largest area at the base), area key with counts, kind lines (습관 · 쌓기 if any · 마음가짐 · 집중; a kind with no data is one line with a link). 10주: the heat map and the wear map in tile style. 올해: year link row, count ledger, mind ledger, mood strip, reflections, past reviews. Nothing the current page shows is lost. |
| `onboarding.png` | `Onboarding.tsx` + `ChartSketch.tsx` | Brand line (L0 heart mark 24 + "만다라트"), question 26/36, sub, label 핵심 목표, the tile field (56), examples as one printed line (each example tappable, fills the field; first keeps `TID.onbSample`), the 3×3 preview (64pt tiles, 6 gap, 12 radius: areas as tint + dye text, goal on core), note, primary 시작하기 (empty field: the existing "later" label), link 템플릿으로 시작하기. iCloud offer stays (iOS) above the question. |
| `editor.png` | `overlays/CellEditor.tsx` (+ `DayPicker`, `RemindRow`, `GuideChips`, `SegmentedControl`, `KindBits`) | Inset sheet over the dimmed page, the edited cell framed in ink behind. Sheet header (locator · area · 실천 3/8 · close). Field with count "6/60" + note. 유형 segment (한 번 · 습관 · 쌓기 · 마음가짐) + one-line note. 반복 (habit only) with quiet presets 매일 · 평일 · 주말, segment 요일마다 · 횟수로, seven day boxes (chosen state; Sunday letter vermilion). 알림 as choice rows (없음 · 시각 정하기 + time). Footer: quiet "칸 비우기" + primary 저장. Opens with field + 유형 only; 반복 and 알림 unfold when the kind needs them. Count/mind/once controls follow the same parts. |
| `sheet.png` | `overlays/ActionSheet.tsx` (+ `WeekStrip` sheet variant, `CountBar`, `RatingBoxes`) | Sheet header; the cell text as 26/36 title; meta "습관 · 주 3회 · 오늘 할 일에 저절로 담겨요"; "오늘 했어요" check row; 이번 주 + range; "0/3회 남은 날 5일"; seven day boxes (open for past + today, later for future, today dot); "이 칸 달성하기" check row with note; link rows 25분 집중하기 ›, 칸 편집하기 ›; 메모 field. |
| `add.png` | `overlays/QuickAdd.tsx` | Inset sheet sitting on the keyboard (bottom = keyboard height + 8), grabber. Line "오늘 할 일 **1/12**" + quiet 완료. Lines added in this sheet as rows above. "어느 영역의 일인가요?" + link "커리어 실천에서 고르기 ›". Area picker 4×2. Field with the small 담기 button inside (off while empty). The last area used stays chosen. |
| `focus.png` | `overlays/FocusTimer.tsx` (local tally, `Pill`, `PrimaryButton`) | Full-screen page, no tab bar. Eyebrow "■ 커리어 · 25분 집중", title = task, down glyph (minimise). The 5×5 minute grid (342). 남은 시간 + clock 52/60; 끝나는 시각 "오후 2:35" right; note. Buttons: tint "‖ 멈추기" + primary "끝내고 했어요"; quiet "그만하기". |
| `year.png` | `Year.tsx`, `year/YearReview.tsx`, `YearShelf.tsx`, `YearSheet.tsx` (+ `ChartBoard`, `ChartPoster`, `YearLedger`) | Back "‹ 통계", the archived goal as title, share glyph. Folio "2025 한 해 돌아보기" / range. The L2 map. 표가 채워진 모습: four L1 frames (cell 16) with dates (last one ink 600). Four figures at one size (22/30). Shelf and sheet pages use the same parts. |
| `settings.png` | `Settings.tsx` + `settings/*.tsx` | Pinned header (back "홈", title 설정). Sections in this order: 핵심 목표 (goal 26/36 + chevron), 알림 (check-box rows + time chip), iCloud와 백업 (toggle row, link rows 내보내기 · 불러오기 · 저장본 with glyphs, storage note), 보기 (화면 모드: 자동 · 밝게 · 어둡게 swatches; 종이 무늬: 무지 · 점 · 모눈 · 줄 swatches, same drawing), 언어 (choice rows), 한 해 (`YearRows`), 다시 시작 (template · sample · reset rows), 프로 (hidden while `STORE_OPEN` is false), 정보 (L0 mark 40 + colophon rows + links). Paper colours, 포인트 컬러, 칸 모서리 rows are removed. |
| `widgets.png` | `src/widgets/TodayWidget.ios.tsx`, `FocusActivity.ios.tsx`, `src/lib/widgetSnapshot.ts`, `src/lib/focusActivity.ts` | §4.1. Small: "● 오늘 1/10" + L1 map. Medium: "● 오늘 할 일" / "9개 남음" + three tickable rows. Lock rectangular: next action with box; circular: gauge 1/10. Live Activity: §4.1 (cannot be drawn as the mockup). |
| `store.png` | `tools/store-shots` (caption band + full capture) | Posters: eyebrow + two-line headline (700, 2–3× the eyebrow), the screen cropped to its best part, a different composition per frame (§3 R1). |
| `share.png` | `overlays/ShareChart.tsx`, `components/ChartPoster.tsx`, `lib/poster.ts` | 4:5 (540×675pt, 1080×1350px): eyebrow "2026 핵심 목표", goal title, "24/64칸" right; the L2 map at 466; foot: L0 mark + "만다라트", date right. Always the light tokens. The blank variant = the first-run map. |
| `icon.png` | `assets/icon*.png`, `public/*.png` (cream printed sheet, gold centre) | The heart: core + eight dyes as soft tiles on white, 60% of the square (§3 N2). |

---

## 2. Tokens and settings

### 2.1 `src/theme/tokens.ts` (new; exact values)

Area index `i` (0..7) is `doc.themes[i]`; dye `i` is `--dye-(i+1)`. Nothing draws from `theme.color` any more (see 2.5). `tint` (written cell on a map, chosen area) and `dyeText` (a dye used as text on its tint or on paper, ≥ 4.6:1) are precomputed here; RN has no `color-mix`.

```ts
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
```

`tokens.ts`, `type.ts` and `lib/look.ts` stay free of `react-native` imports (tests `require` them in Node). Hairlines use `StyleSheet.hairlineWidth` at the use site.

Contrast (checked; `tests/a-tokens.test.js` must assert each): light print/paper 4.86, ink2/tile 5.27, printEdge/paper 3.35 (control edge), signal/paper 5.34, onDye/dye 5.20–5.37, ink/wash 9.69–10.20, dyeText/tint ≥ 4.6, dyeText/paper ≥ 5.58. Dark print/paper 7.05, signal/paper 4.93, printEdge/paper 3.94, onDye/dye 5.24–5.30, ink/wash ≥ 11.09, dyeText/tint ≥ 4.6, dyeText/paper ≥ 5.08. A dye as a mark on dark paper is 3.2:1 (marks only, never text).

### 2.2 Type roles (`src/theme/type.ts`, new export `ROLE`)

Each role sets `fontFamily` to the Pretendard file directly (`PRETENDARD[400|500|600|700]` from `fonts.ts`), plus `fontSize`, `lineHeight`, `letterSpacing` (always set, 0 when none, so `AppText` adds nothing). Setting the family bypasses `faceFor`'s one-step-lighter mapping, so old screens keep their look and new code gets the mockup weight; Bold Text and Japanese still work through `typeset()` (`heavierFace`, `jaFace`). `em` → pt: −0.02em at 26 = −0.52.

| Role | Face / size / line / tracking | Colour |
|---|---|---|
| folio, label | 500 13/18 | print, tabular |
| section | 600 14/18 | printStrong |
| title (also the owner's words as title) | 700 26/36 −0.52 | ink |
| headline (goal on Home) | 700 30/40 −0.75 | ink |
| figure | 700 26/34 −0.52, tabular | ink |
| figureField | 700 22/30 −0.44 | ink |
| figureHeader | 700 22/30 −0.44 (header title line) | ink |
| unit (after a figure: 칸, 일, 번) | 500 13/18, margin-left 2 | ink2 |
| rowTitle | 500 16/23 | ink (done: ink2) |
| rowMeta | 400 13/18 tabular | ink2 |
| rowRight | 500 13/18 tabular | ink, or print for a printed word (중점) |
| meta | 500 12/18 tabular | ink2 |
| body | 500 14/24 | ink |
| note | 500 12/18 (sheet notes 400 13/18) | print |
| prompt | 600 20/30 −0.4 | ink |
| link | 700 13/18 (+ chevron 16) | ink |
| tab / tabOn | 500 11/12 / 700 11/12 | print / ink |
| button / buttonSmall | 700 16/24 / 700 13/18 | onBtn |
| quiet | 700 13/18 (footer 14) | ink |
| fieldText (owner's main words) | 600 19/26 −0.38 | ink; placeholder 400 print |
| fieldTextSmall (add, one line) | 500 17/24 | ink |
| segment / segmentOn | 500 14/18 / 600 14/18 | ink / paper |
| weekN | 600 12/14 tabular | ink2 (today ink) |
| weekDay | 500 13/16 | print (Sunday signal, today ink 700) |
| mapHead / mapCore | 700 10/12 −0.4 / 700 11/13 −0.22 | onDye / onCore |
| blockAction / blockHead / blockCore | 500 16/24 −0.16 / 700 18/24 −0.18 / 700 20/28 −0.4 | ink / onDye / onCore |
| clock (focus) | 700 52/60 −1.56 tabular | ink |
| closeFigure (day close) | 700 48/56 −1.44 tabular | ink |
| ledger | 500 14/18; figure 500 13/18 | ink; ink2 |

Keep `TYPE`, `NUM`, `RHYTHM` exported unchanged until wave 4 (old screens use them). New code uses `ROLE`, `NUM`, `GEO`.

### 2.3 The palette object `M`

`usePalette()` keeps its name and identity rules but returns `Tokens` plus the legacy fields, so every old screen compiles and takes the new colours at once:

`bg = paper`, `surface = paper`, `card = paper`, `ink = ink`, `sub = ink2`, `faint = ink3`, `line = printRule`, `tabBg = capsule`, `gold = signal`, `goldInk = ink`, `center = core`, `accent = btn`, `dark`.

`contrastEdition` becomes `moreContrast` (plus the legacy fields mapped again). New code reads only token names. Wave 4 removes the legacy names that nothing reads.

### 2.4 One look: light / dark / auto, and what happens to the old settings

- New device-local preference, like the language: `STORE_KEYS.look = 'mandarat:look:v1'` (`src/lib/contracts.ts`), values `'auto' | 'light' | 'dark'`, default `'auto'`. Not in the document, not in backups, not synced (iPhone and iPad may differ, as with language). `src/lib/look.ts` (pure): `parseLook(raw)`, `lookFromMood(mood)`, `isDark(look, scheme)`. Reading and writing AsyncStorage (`readLook(mood)`, `writeLook(look)`, try/catch as in `src/i18n/prefs.ts`) live in `src/theme/look.tsx`.
- First launch of this version: the key is missing, so `readLook` derives it once from the synced `settings.mood` and writes it: `'다크'` → `dark`; `'크림' | '화이트' | '파스텔'` (a light paper the user chose) → `light`; `'연꽃'` (the default, never touched) or anything else → `auto`. After that the key alone decides. This keeps every user's explicit choice and gives everyone else the designed default.
- `src/theme/look.tsx` (new): `LookProvider` (inside `MandaratProvider`, before `Gate`, in `App.tsx`) reads the key while the native splash is held, takes `useColorScheme()`, and provides the palette (`usePaletteValue` moves here; `MandaratContext` stops computing `withAccent(MOODS[mood], accent)`). Effect: `Appearance.setColorScheme(look === 'auto' ? 'unspecified' : look)` (not on web), `SystemUI.setBackgroundColorAsync(paper)`, `<StatusBar style={dark ? 'light' : 'dark'} />`. `useLook()` returns `{ look, setLook }` for Settings.
- `settings.mood`, `settings.accent`, `settings.cellShape` stay in `Settings`, in `migrate()` and in the sync projection (`syncProject.ts`, `syncLocal.ts`) exactly as they are, so older app versions on another device keep working. The new app never writes them and never draws from them. Their Settings rows go (S6). `TID.setMood` and `TID.setShape` are removed (no smoke scene or Maestro flow uses them; checked); `TID.setLook(look)` and `TID.setPaper(p)` are used.
- Importing an old backup does not change the look (it is device-local). Documented in the release notes.
- Share image, print and store frames always use `LIGHT`.

### 2.5 Area colours

Draw by index: `M.dye[ti]` etc. `theme.color` stays in the data (types, migrate, sync, backup) untouched; nothing reads it for drawing after wave 3 (the widget snapshot sends index-based colours, §4.1). `PILLAR_COLORS` becomes `LIGHT.dye` so new documents and templates store the new values; `migrateAreaColor` is not extended (stored values are inert, no sync churn).

### 2.6 Paper patterns (종이 무늬)

Stay, all free in 1.0 (`STORE_OPEN` is false). Default becomes 무지, as the approved screens show (brief-a2 decision 1):
- `PaperPattern` gains `'dots'`: `'dots' | 'grid' | 'lines' | 'blank'`; `PAPER_OPTS` lists all four. `storedPattern(undefined)` → `'blank'`. `patternSetting(p)` stores `p` (explicit, also `'blank'` and `'dots'`). Older app versions drop `'dots'` in their migrate and draw dots, which is the same picture. `isProPattern` = grid or lines.
- Drawn subtly, on the page ground only (never in tiles, sheets or the bar): module 24pt, a dot or line column on the 24pt gutter, rows registered to the header bottom. Dots: r 0.8 in `printMid`; grid and lines: 0.5pt in `printRule`. Increase Contrast: dots `printEdge`, lines `printMid`.

### 2.7 Things that keep their own drawing

- Print (`lib/printSheet.ts`): a sheet is for writing, so it keeps all 81 texts. Draw it as `chart-text.png`: soft tiles, dye heads with white text, core, done = wash, empty = white with a `printMid` 0.5pt edge (no grey ink on paper), Pretendard, no accent, finished blocks marked by a 1.5pt ink inset frame.
- Widgets and Live Activity use the system font (expo-widgets cannot bundle Pretendard into the extension).

---

## 3. Work packages

Waves in order. The app builds and every gate passes after each wave.

```
Wave 1a  T  tokens, type roles, look
Wave 1b  K  controls kit   C  chrome   G  chart & marks
Wave 2   S1 Home  S2 Chart & area  S3 Today  S4 Stats & year  S5 Onboarding  S6 Settings  N1 Widgets & Live Activity  N2 Icon & splash
Wave 3   O1 Editor  O2 Action sheet  O3 Add & pick  O4 Focus  O5 Share & print  O6 Rituals & small sheets
Wave 4   R2 Cleanup (merge first)  R1 Store screenshots   → release (§5)
```

The owner's first device check (§5) can run after wave 2.

### Wave 1a

**T · Tokens, type, look** (one engineer, merges before wave 1b; wave 1b may start from §2.1–2.3 of this plan in parallel)
- Goal: §2.1–2.4 and 2.6 in code; the whole app takes the new colours through the legacy fields; dark follows the system.
- Owns: `src/theme/tokens.ts` (new), `src/theme/look.tsx` (new), `src/lib/look.ts` (new), `src/theme/palette.ts`, `src/theme/moods.ts`, `src/theme/chart.ts` (colour functions only: `coreBg`, `coreInk`, `headBg`, `writtenBg`, `headTrack`, `ruleColor`, `legibleMark` read tokens; positions, `RULE`, `frameRadius` and the fit helpers untouched), `src/theme/shadow.ts` (returns `{ boxShadow: M.float }` for e ≥ 8), `src/theme/type.ts`, `src/theme/usePalette.ts`, `src/lib/contracts.ts` (`STORE_KEYS` only), `src/store/MandaratContext.tsx` (palette lines and `PaletteValue` only), `App.tsx`, `app.json` (`backgroundColor`, `web.themeColor`/`backgroundColor`, `android.adaptiveIcon.backgroundColor` → `#FFFFFF`; splash `backgroundColor` `#FFFFFF` + `dark.backgroundColor` `#121316`; `infoPlist.UIStatusBarStyle` → `UIStatusBarStyleDefault`), `public/manifest.webmanifest` + `public/index.html` colours, `src/components/WebColumn.tsx` (outside the column: `tile`; dark `#0B0C0E`), `src/components/PaperDots.tsx`, `src/lib/paper.ts`, `src/types.ts` (`PaperPattern`), `src/data/defaults.ts` (`PAPER_OPTS`), `src/components/Splash.tsx` (colours only), `tools/design-shots/capture.js` (dark sessions set `mandarat:look:v1` = `dark`; drop the mood sessions).
- Must not touch: any screen, overlay or component layout.
- Tests: rewrite `contrast.test.js`, `palette.test.js`, colour blocks of `chart.test.js`, `fx-d-copy.test.js`, `paper.test.js`, `releaseConfig.test.js` (paper `#FFFFFF`, status bar), `app-icon.test.js` colour block, `v2-scaffold.test.js` provider order (add `<LookProvider>`), `migrate.test.js` (paper). New `tests/a-tokens.test.js`: every value of §2.1, every contrast line, `lookFromMood` table, `isDark`, `moreContrast` identity, paper default and round trip.
- Check: `npm run web-smoke` passes; `/tmp/web-smoke/ko-home.png` is white with ink buttons and vermilion today marks; capture.js dark shots use the dark tokens.

### Wave 1b (three in parallel)

**K · Controls kit**
- Goal: every small control in the mockups, as components, plus the shared rows re-skinned in place.
- Owns: `src/components/kit/` (new: `CheckBox.tsx`, `Row.tsx`, `DyeMark.tsx`, `Section.tsx`, `Segment.tsx`, `Field.tsx`, `ChoiceRow.tsx`, `ToggleRow.tsx`, `LinkRow.tsx`, `DayBoxes.tsx`, `AreaPicker.tsx`, `FilterLine.tsx`, `Swatch.tsx`, `index.ts`), in place: `src/components/Check.tsx`, `TodayRow.tsx`, `SegmentedControl.tsx`, `KindBits.tsx`, `WeekStrip.tsx`, `src/lib/marks.ts`, `src/i18n/{ko,ja,en}/common.ts`.
- Specs (sizes in pt):
  - `CheckBox` `state: 'open' | 'done' | 'chosen' | 'later'`, `area?`, `size 24 | 20 | 14`. Box radius 6, edge 1.5 `printEdge`. done: fill `wash[area]` (no area: `tile`), edge `dye[area]` (no area: `printEdge`), pen tick `tick` 2pt overshooting the top-right corner (path in `marks.ts`: `M5.6 12.4C8 14.2 9.6 16.2 10.8 18.6 14.6 11 19.8 3.6 27.2 -3`, 24 box). chosen: edge only + inner tick `M6.4 12.6C8 13.8 9.2 15.2 10.2 17 12.4 12.6 15 9.2 18 6.6` in `ink`. later: `tile` fill, no edge. Draw the tick in its own absolutely placed `Svg` larger than the box (iOS clips an Svg to its frame). 44pt hit area.
  - `Row` (A.row): 54 high, gap 14, leading 24 box column (box, empty slot, or glyph), title `rowTitle` one line, meta line (`DyeMark` + area · meta) `rowMeta`, right (`rowRight` on the title line, margin-top 7; icon right is centred). Hairline `printRule` between rows from x 38 (from x 0 when there is no box column), none above the first or under the last. Done: title `ink2` + a 1pt `ink2` strike drawn as a View at y 12 across the measured text width (`onTextLayout`), not `textDecorationLine`.
  - `DyeMark` 8×8 radius 2, margin-right 6.
  - `Section`: label row 18 high (`section` or `label` role) + one right item: `TextLink` (`link` + chevron 16, hitSlop 13 above and below) or a `meta` figure.
  - `Segment`: track 40 high, padding 3, radius 12, `tile`, gap 2, cells radius 9, chosen = `ink` fill + `segmentOn` in `paper`. Variant `tiles`: separate 44-high tiles, radius 12, gap 6 (day-close mood). Labels `numberOfLines 1`, `adjustsFontSizeToFit`, `minimumFontScale 0.85`.
  - `Field`: `tile`, radius 12, min height 56, padding 0 16, `fieldText`; `small` = 54 high `fieldTextSmall`; count at the right end (`label`, right 16); `memo` = min 84, padding 14/16, 14/20; optional trailing small button. Placeholder `print`.
  - `ChoiceRow`: no box, title 400 (chosen 600), chosen = pen tick 18 `ink` at the right; hairline from x 0.
  - `ToggleRow`: chosen-state `CheckBox` + title/meta + optional `TimeChip` (`tile`, radius 10, padding 6/10, 500 14/18 `ink`; when off `ink2`). Not struck through.
  - `LinkRow`: 24 glyph in the box column, title/meta, chevron 16 `ink`.
  - `DayBoxes` (S.days): seven columns, letter `weekDay` over a 24 box (gap 6), today = 5pt `signal` dot under the box; states per day = `CheckBox` states or none. 44 column targets.
  - `AreaPicker`: 4×2, gap 6, tiles 44 high radius 12 `tile`, `DyeMark` + name 500 14; chosen = `tint[i]` fill, name in `dyeText[i]` 700.
  - `FilterLine`: 44 high, horizontal `ScrollView`, gap 18 (scopes: 24), words 500 14 `ink`, chosen 700 with a 1pt `ink` underline 9 above the bottom, count 400 12 `ink2`, optional `DyeMark`.
  - `Swatch`: tiny page in a `tile` well (frame padding 3, radius 15; well padding 8 8 0, radius 12; page 46 high, top radius 7, word "가" 700 14, two 3pt lines `printMid`, short one 55%); night page = `ink` page, `paper` word, `ink2` lines; auto = both halves; chosen = 1.5 `ink` ring + label 700 `ink`. Pattern swatches draw the pattern on the page.
  - Re-skins: `TodayRow` = `Row` anatomy (drop its mini week strip; the meta says "이번 주 0/3회"); `Check` wraps `CheckBox` keeping its export names and props; `SegmentedControl` delegates to `Segment`; `KindBits` (`CountBar` = 4pt `tile` track with `dye` fill, radius 2; `RatingBoxes` = `Segment` tiles 1–5); `WeekStrip` = `DayBoxes`.
- Must not touch: screens, overlays, `common.tsx`, `Root.tsx`, `Icon.tsx` (use `Icon` through its current props; C keeps them).
- Tests: Check/TodayRow/KindBits blocks of `dx-verify`, `fx-verify`, `dx-1-today`, `release.test.js`; `marks.test.js`. New `tests/a-kit.test.js` (tick paths, states, row inset 38, strike position, a11y roles: checkbox checked state, radio for choice rows).
- Check: `_kit.png` (rows, check states, link, week strip, buttons) and the rows in `today.png`; ja/en at 375.

**C · Chrome**
- Goal: header, floating tab bar with 담기, sheets, buttons, toast and glyphs.
- Owns: `src/components/common.tsx`, `Pressy.tsx`, `TemplateSheet.tsx` (`SheetHead` + template list), `EmptyState.tsx`, `ErrorBoundary.tsx`, `Icon.tsx`, `LineIcons.tsx`, `src/navigation/Root.tsx`, `src/navigation/ui.tsx`, `src/overlays/Snackbar.tsx`, `src/i18n/{ko,ja,en}/core.ts` (only if a chrome string is needed).
- Specs:
  - `Header` (A.header), new props `eyebrow`, `back` (label), `title`, `written`, `headline`, `figure`, `action` (`{ glyph, onPress, label, testID }`), `pinned`; legacy props keep working. Top = safe-area top. Height 72 (min; grows with a wrapped headline): padding-top 12, eyebrow `folio` (always reserved), title `title` or `headline` (wraps, `noOrphan`, `lineBreakStrategyIOS hangul-word`; max 2 lines for title, 3 for headline), back = back glyph 16 + label `link` 13/18 700 in the eyebrow line, figure `figureHeader` right of the title before the action, action glyph 24 in a 44 target at right −10, top 26 (headline: 28). No rule under it.
  - Screen frame: gutter 24; scroll content padding-bottom = bar h + bar bottom + 24.
  - Tab bar (Root): absolute, left/right 16, bottom `max(18, insets.bottom − 4)`, height 58, gap 10. Capsule: `capsule`, radius 29, padding 0 6, `boxShadow: M.float`; four tabs (홈 · 만다라트 · 오늘 · 통계): glyph 24 + `tab` label, active = filled glyph + `tabOn`. 담기: 66 wide, `add` fill, `onAdd` plus glyph (2pt stroke) + 700 11/12 label, radius 29, float shadow, `TID.tabAdd`. Veil behind the bar: `react-native-svg` `LinearGradient` of `paper`, alpha 0 → 1 at 34.5%, from 40 above the bar to the screen bottom. Tab labels `numberOfLines 1`, `adjustsFontSizeToFit`, `minimumFontScale 0.8` (ja マンダラート at 375). iPad and spread: bar max width 560, centred (`SPREAD_TABS_W`). Keep roles (`tabbar` / `tab`), TIDs, haptics, re-tap = scroll top. Remove the `Appearance.setColorScheme` effect (T's `LookProvider` owns it). Remove the 5-slot bar.
  - `Sheet` (re-skin, keep every behaviour: gestures, guard, keyboard, queue, focus return): inset 8 left/right/bottom, radius 28 all corners, `paper`, `boxShadow: M.float`, padding 24 (top 6 when the sheet has a header line), bottom padding `max(24, insets.bottom)`, scrim `M.scrim` over everything including the tab bar, grabber 36×4 radius 2 `printMid` only on drag-to-close sheets (`ownClose` false), max width 560 on iPad. New `SheetHeader` (48 high: `leading` slot for a locator, two printed lines (first `ink` 600 with optional `DyeMark`, second `print`), close glyph in a 44 target, no circle).
  - Buttons (export `Button`; `PrimaryButton` becomes a wrapper): primary 52 high radius 26 `btn` / `onBtn` `button`; secondary transparent with 1.25 inset edge `printEdge`; tint `tile` fill `ink` text; small 36 high radius 18 `buttonSmall`; `QuietAction` `quiet` with a 44 target. Never `signal`.
  - `IconBtn`, `CloseBtn`: glyph only, 44 target, no circle. `Pill`/`AreaTag`: `DyeMark` + name. `TextTabs`/`IndexTabs`: `FilterLine` look (draw it here; do not import K). `LineRow`/`RowDivider`/`groupEdge`: hairline rows, no cards.
  - Toast (`Snackbar`): capsule `capsule` + float shadow, radius 29, 13/18 500 `ink`, action `quiet` `ink`; sits 10 above the tab bar.
  - Glyphs (`Icon.tsx`): redraw from `A.icon` (24 box, 1.5 stroke, round caps and joins, `currentColor`): `home`, `grid` (= chart), `checkCircle` (= today), `chart` (= stats) each with an `active` variant; `plus` (2pt), `settings` (two sliders), `share` (tray + arrow), `pencil`, `dots` (three 3×3 squares), `chevR`, `chevL`, `close`, `bell`. Add UI-only glyphs outside `ICON_NAMES` (do not change that persisted list): `down`, `pause`, `export`, `import`, `copies`, `focus` (from `parts-sheets.js`, `parts-settings.js`, `parts-focus-dayclose.js`).
- Must not touch: screens, overlays other than `Snackbar`, kit files.
- Tests: `dx-4-design` (tab indicator block), `renderPerf` (Root pins: keep), `v2-scaffold` (Root, ui), `spread.test.js` (Root block), `ipadLayout`, `web-column`, `f2-year-a11y` (Root block), `release.test.js` (common/Icon blocks), `icons.test.js` (unchanged list). New `tests/a-chrome.test.js` (bar geometry, sheet inset, header heights, glyph names).
- Smoke: `base.js` (tab TIDs), `v4-d.js`, `v5-a.js` (iPad bar width).
- Check: header and bar in every PNG; `editor.png` / `sheet.png` sheet frame; `home-dark.png` capsule.

**G · Chart and marks**
- Goal: the colour map (L2, L1), the zoomed block, the locator, the L0 mark, week bars, minute grid; fast and pixel-exact.
- Owns: `src/lib/mapCells.ts` (new, pure), `src/components/chart/` (new: `ColourMap.tsx`, `BlockGrid.tsx`, `Locator.tsx`, `Mark.tsx`, `WeekBars.tsx`, `MinuteGrid.tsx`, `geometry.ts` (pure)), the fit section of `src/theme/chart.ts` (`chartFit`, `chartFitHint`, `CHART_HEAD_FS`: measure the map's head cell, 10pt, at window width − 48, so the editor's "fits in the chart" hint matches what the map draws; fix `fx3-cellScale`, `labelFit`, `i18n-content`, `i18n-editor` where they pin the old numbers), in place `src/components/GridMark.tsx` (`GridMark` → `Mark`, `MiniChart` → `ColourMap` L1, same props; `animate` = a 220ms fade, none with reduced motion), `src/components/Splash.tsx` (drawing: the L0 heart on `paper`, `Appearance.getColorScheme()` picks the tokens).
- Specs:
  - `mapCells(doc, today)`: 81 cells row-major `{ kind: 'core' | 'ring' | 'head' | 'action', ti, ai, state: 'empty' | 'written' | 'done', today }` (positions from `theme/chart.ts` `chartCell`), and `mapKey(doc)` (81-char string) for `memo`.
  - Geometry (`geometry.ts`): work in device pixels (`PixelRatio.get()`), then divide; the cells take whatever is left after the gaps, the spare pixels go to the middle cells (col/row 4, then 3 and 5 alternately), so the outer size equals the requested width exactly at @2x and @3x. L2 map of width W (s = W/342): block gap `round(11.5s)`, cell gap `round(3.7s)`, radius `6.5s`. L1 of cell c: W = 9c + (c ≥ 11 ? 6 : 4), block gap c ≥ 14 ? 4 : 2, cell gap c ≥ 11 ? 1.5 : 0.75, radius max(1.5, 0.14c). Block: width = content measure, gap 6, radius 10. Minute grid: 5 tiles, gap 5.5, radius 8, tile = (W − 22)/5.
  - Colours: core `core`; ring and head `dye[ti]`; action done `wash[ti]` (L2, block) / `washL1[ti]` (L1, locator); written `tint[ti]` (map, locator) / `tile` (block); empty `tile`. Focus: 1.5 (block 2) `ink` inset ring. Map: no ticks, no today marks. Block: tick 13pt, 1.75 stroke, top-right inset 10 (path from `shared.js` `TICK`); today dot r 3.5 at (14,14) `signal`; `extra` line at bottom 9, inset 10.
  - Labels: map heads `mapHead`, core `mapCore`, padding 1.5, centred, fitted with the existing helpers (`theme/chart` `fitFontSize`/`estimateLines`, `lib/labelFit`, `lib/text` `cellBreak`) to sizes [10, 9, 8], max 3 lines (core 4), then ellipsis; `maxFontSizeMultiplier 1`. A one-word Korean name of 4+ syllables breaks 2+2 (`headText` in `shared.js`). Block labels `blockAction` / `blockHead` / `blockCore`, padding 10, `A.keep` no-orphan rule (`noOrphan`).
  - Drawing: absolutely positioned `View`s (no flex, no Svg except ticks and the bar veil); memo on `mapKey + width + dark`. Taps: nine block `Pressable`s, each an accessibility element labelled with `lib/chartSpeech` `areaLabel` (the map has no action text, so the label must carry it); block cells use `cellLabel`.
  - `Locator` 36 (3×3, gap 2, radius 2.5; this cell ringed). Pager mark 22 (3×3 of blocks: this block `dye`, centre `core`, others `printRule`).
  - `Mark`: `heart` (16–40: eight dyes round the core, gap 0.06, radius 0.22 of a tile) and `app` (AI.app: pad 0.2 of size (0.17 at ≤ 40), gap max(1, 0.025 size), radius 0.22 tile, `paper` ground). Export the numbers for N2.
  - `WeekBars` (A.weekStrip): plot 64, bar 16 wide radius 6 `printMid`, height max(6, round(n/max·44)), max = max(5, counts), today bar `ink`; count `weekN` above; later day = 4pt dot `printMid`; `weekDay` under (gap 8). Variant `stack`: plot 84, segments 28×18 radius 6 gap 3 in `washL1` of their areas, largest at the base.
  - `MinuteGrid`: done minutes `wash[area]`, the current minute fills from the bottom (one native `scaleY` from 0 to 1 over 60s, `transformOrigin: 'bottom'`, clipped by the tile's radius with `overflow: hidden`), now dot r 3 at (12,12) `signal`; reduced motion = step once a minute.
- Must not touch: screens (they adopt in wave 2), `ChartBoard.tsx`, `ChartPoster.tsx`.
- Tests: `dx-2-sketch` and `fx-c-chart` GridMark blocks, `app-icon.test.js` / `releaseConfig.test.js` Splash blocks. New `tests/a-chart.test.js`: `mapCells` on `scripts/smoke/demoDoc.js`; geometry sums to W for W ∈ {327, 342, 366, 466, 520} at ratios 2 and 3; L1 for c ∈ {7, 9, 12, 13, 16, 18, 20}; en and ja default area names fit (`Relationships`, `人間関係`, `自己成長`) at 327.
- Check: `chart.png` (map), `home.png` (L1), `block.png` (block), `_kit.png` (marks, week strip), `focus.png` (grid).

### Wave 2 (eight in parallel)

All screen packages: page = `Header` + gutter 24 + sections separated by 30 (hero 32); compare light and dark (capture.js) and ja/en at 375.

**S1 · Home** — Owns `src/screens/Dashboard.tsx`, `src/lib/home.ts`, `src/components/Tally.tsx` (delete), `src/i18n/*/home.ts`, `scripts/smoke/x-h.js`. Draw §1 Home. Hero fields: label `label`, figure `figureField` + `unit`; the column is `space-between` over the map height; map L1 cell 20 (18 when the measure < 330), tap = `onChartBlock` as today. Ledger: two columns gap 28, rows 38, read down the left column first. Remove the 56pt date masthead, the 正 tally, the double rules. Tests: `i18n-home` (Tally blocks: delete), Dashboard blocks of `dx-1-today`, `dx-verify`, `fx-verify`, `fx-c-chart`, `yearClose.test.js`; `renderPerf` Dashboard (keep). Check: `home.png`, `home-dark.png`.

**S2 · Chart and area page** — Owns `src/screens/GridScreen.tsx`, `FullGrid.tsx`, `Detail.tsx`, `gridMemory.ts`, `src/screens/area/` (new: `AreaPage.tsx`, `HabitWeek.tsx`), `src/lib/areaWeek.ts` (new, pure: habit rows × 7 days → `'done' | 'open' | 'later' | 'none'` and n/m), `src/lib/areaPage.ts`, `src/lib/nextStep.ts`, `src/lib/chartSpeech.ts`, `src/components/AnimatedNumber.tsx`, `src/i18n/*/chart.ts`, `scripts/smoke/x-j.js`, `v5-a.js`. Draw §1 chart, first, block. The zoom is the grid tab's own state (`gridMemory.focus`, swipe and pager as today); `Detail` renders `AreaPage` with its own back. Week tracker: columns 30 wide, name column flexible, figure column 40; head row 26, rows 40, hairlines between rows; today's column = `tile` rounded 8 behind the boxes; boxes `CheckBox` 14 (done/open/later). Area "···" opens a small sheet with link rows for the existing area actions (rename area = the existing theme editor). Stop using `ChartBoard` (do not delete it: `YearSheet` still uses it until S4). Tests: `dx-2-sketch` (FullGrid/GridScreen), `fx-c-chart`, `spread.test.js` (FullGrid/Detail/GridScreen), `final-integration` (FullGrid), `areaPage.test.js`, `a11y.test.js`, `gridMemory.test.js`, `nextStep.test.js`, Detail/FullGrid blocks of `dx-verify` and `fx-verify`; maestro `11-full-grid.yaml` TIDs stay (`gridTable`, `gridCell`). New `tests/a-s2.test.js` (`areaWeek`). Check: `chart.png`, `first.png` (demo doc with actions cleared), `block.png`.

**S3 · Today and day close** — Owns `src/screens/Today.tsx`, `TodayModes.tsx`, `src/components/MoodRow.tsx`, `ProgressBar.tsx`, `src/lib/todayModes.ts`, `src/lib/todayList.ts`, `src/i18n/*/today.ts`, `scripts/smoke/x-d.js`. Draw §1 today and dayclose; streak and board views use the same rows, `DayBoxes` and tiles (no cards). Mood = `Segment` tiles with the existing five words; 한 줄 = `Field` 52 (placeholder `print`). Day-close timing and the closed flag come from the existing logic (`ui.closedDay`, `closedDays`). Tests: Today/TodayModes blocks of `dx-1-today`, `dx-verify`, `fx-verify`; `todayModes.test.js`, `todayList.test.js`. Check: `today.png`, `dayclose.png`.

**S4 · Stats and year** — Owns `src/screens/Stats.tsx`, `Year.tsx`, `src/screens/year/*`, `src/components/StatsCharts.tsx`, `YearLedger.tsx`, `GrowBar.tsx`, `src/lib/statsView.ts`, `src/lib/weekStack.ts` (new, pure: per day, the areas done, sorted by the week's count), `src/i18n/*/stats.ts`, `year.ts`, `scripts/smoke/x-f.js`, `year.js`, `yearSheet.js` (except the `share-poster` shot, which O5 re-baselines). Draw §1 stats and year. The reading sentence ("건강은 5번 챙겼고, 커리어는 아직이에요") is a new i18n function per language from the week's most- and least-done areas; with no data it is `emptyLine`. Heat and wear maps: tiles radius 3, steps `tile` → `printMid` → `printEdge` → `ink2` → `ink` (heat) and `tint` → `washL1` → `dye` (wear). `YearSheet` moves from `ChartBoard`/`ChartPoster` to `ColourMap`/`BlockGrid` for display (its share/print buttons keep calling `ChartPoster` until O5). Tests: `dx-4-design` (Stats blocks), `f2-year-a11y`, `yearScreen`, `yearSheet`, `statsView`, `i18n-stats`, `yearReview`. Check: `stats.png`, `year.png`.

**S5 · Onboarding** — Owns `src/screens/Onboarding.tsx`, `src/components/ChartSketch.tsx` (delete), `src/i18n/*/onboarding.ts`, `scripts/smoke/x-i.js`. Draw §1 onboarding. Keep every TID (`onbGoal`, `onbNext`/`onbStart`, `onbSample`, `onbTemplate`, `onbICloud`) and the iCloud import flow. The preview tiles are not tappable. Tests: `dx-2-sketch` (Onboarding/ChartSketch blocks), `syncUi`, `syncEnvelope` (Onboarding pins: keep meaning), `web-column` (ChartSketch block). Maestro `01-onboarding.yaml`, `common/onboard.yaml`, `common/sample.yaml` (text "예시로 채우기": keep the string or update the flow). Check: `onboarding.png`.

**S6 · Settings** — Owns `src/screens/Settings.tsx`, `src/screens/settings/*`, `src/components/RemindRow.tsx`, `src/lib/testIds.ts` (remove `setMood`, `setShape`; add `setLook`), `src/i18n/*/settings.ts`, `paper.ts`, `lang.ts`, `sync.ts`, `scripts/smoke/paper.js`, `v2-a.js`, `v4-e.js`, `v5-e.js`, `x-g.js`, `v4-f.js`. Draw §1 settings. Header pinned outside the scroll. 화면 모드 swatches call `useLook().setLook`; 종이 무늬 swatches call `setSetting('paper', p)`. Reminder time chip: tap toggles an inline stepper row under it (the existing `RemindRow` logic, restyled: `tile` track, `−`/`+` glyphs, 44 targets); no new picker. Destructive rows stay `ink` (vermilion has three jobs only) and keep their confirm dialogs. `SyncChoiceSheet` uses the kit sheet. Tests: `x-g-settings`, `dx-4-design` (Settings blocks), `f-1-copy`, `privacyPage`, `crash.test.js`, `syncUi`, `v2-scaffold` (Settings/rows), `paper.test.js` (PaperRows block), `f2-year-a11y` (settings rows), `remindUi`, `testIds.test.js`, `maestro.test.js` (`05-language`, `06-reminders`, `common/settings.yaml`). Check: `settings.png`.

**N1 · Widgets and Live Activity** — Owns `src/widgets/*`, `src/lib/widgetSnapshot.ts`, `src/lib/focusActivity.ts`, `src/lib/contracts.ts` (widget and live types only), `src/hosts/WidgetSync.tsx`, `src/i18n/*/widget.ts`, `live.ts`. Spec §4.1. Keep `focusProps(...)` callable with its current arguments (ignore `mood`/`accent`, add optional `ti`), so `FocusTimer.tsx` compiles until O4. Tests: `widgetLayout.test.js` (vm-run every family, light/dark, fullColor/accented/vibrant, `{}` props), `widgetSnapshot.test.js`, `focusActivity.test.js`, `shortcuts.test.js`, `contracts.test.js`, `widgetOps.test.js`. Check: `widgets.png` (by reading the vm tree; on device in §5).

**N2 · App icon and splash** — Owns `assets/*.png`, `public/*.png`, `app.json` (splash `image`, `dark.image`, `imageWidth`), `tools/icons/render.js` (new: Playwright, already installed globally, draws `Mark` `app` numbers from tokens; writes PNGs, then strips alpha where required with `tools/store-shots/png.js`). Files: `icon.png` 1024 RGB (white ground); `icon-dark.png` 1024 RGBA (transparent ground, `DARK.dye`, core `DARK.core`); `icon-tinted.png` 1024 RGB (black ground, dyes as one mid grey `#9A9A9A`, core white); `splash-icon.png` + new `splash-icon-dark.png` 1024 RGBA (heart, `imageWidth` 160); `favicon.png` 64; `public/apple-touch-icon.png` 180, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (pad 0.28); Android adaptive foreground/background/monochrome 1024. Tests: `app-icon.test.js` (formats unchanged; replace the "printed 3×3, gold" assertions), `releaseConfig.test.js` (splash). Check: `icon.png` at 1024, and at 180/87/60/40/29 on white, mid grey and dark grounds.

### Wave 3 (six in parallel)

**O1 · Editor** — Owns `src/overlays/CellEditor.tsx`, `src/components/DayPicker.tsx`, `GuideChips.tsx`, `src/lib/editorDraft.ts`, `src/i18n/*/editor.ts`, `scripts/smoke/x-a.js`. Draw §1 editor; centre-goal and area-title editing use the same sheet with the field only. Keep every `editor*` TID, the draft guard and the kind-suggest logic (`kindSuggest`, `coach`). The page behind dims; the cell being edited gets the ink ring (pass `focus` to the page's map or block). Tests: `i18n-editor`, `actionSheet.test.js` (CellEditor pins), `dx-3-sheets` (CellEditor), `fx-e-sheets`. Maestro `03-cell-edit.yaml` (text "Morning.*"). Check: `editor.png`.

**O2 · Action sheet** — Owns `src/overlays/ActionSheet.tsx`, `src/lib/actionSheet.ts`, `src/lib/sheetSpeech.ts`, `src/i18n/*/sheet.ts`. Draw §1 sheet; count and mind cells use `CountBar` and `Segment` tiles in the same slots. Keep `sheetCheck`, `sheetFocus`, `sheetEdit`. Tests: `actionSheet.test.js`, `dx-3-sheets`, ActionSheet blocks of `dx-verify`, `fx-verify`, `webInputs`, `release.test.js`, `i18n-sheet`. Check: `sheet.png`.

**O3 · Add and pick** — Owns `src/overlays/QuickAdd.tsx`, `PickToday.tsx`, `src/lib/quickAdd.ts`, `src/lib/pick.ts`, `src/i18n/*/today.ts` (S3 is done), `scripts/smoke/x-d.js` (the `xd-quick`, `xd-pick` parts). Draw §1 add. Pick sheet: kit sheet, `FilterLine` by area, rows with chosen boxes, primary 담기. Tests: `quickAdd.test.js`, `pick.test.js`, `i18n-today`, PickToday blocks of `dx-3-sheets`, `fx-verify`. Check: `add.png`.

**O4 · Focus** — Owns `src/overlays/FocusTimer.tsx`, `src/lib/focusClock.ts`, `src/i18n/*/focus.ts`. Draw §1 focus with `MinuteGrid`. Pass `ti` to `focusProps`, drop `mood`/`accent`. Keep `focusPause`, `focusFinish`, `focusClose`, keep-awake, notifications and the Live Activity calls. Tests: `focusActivity.test.js` (FocusTimer pins), `dx-3-sheets` (FocusTimer), `focusClock.test.js`, maestro `04-focus.yaml`. Check: `focus.png`.

**O5 · Share and print** — Owns `src/components/ChartPoster.tsx`, `src/overlays/ShareChart.tsx`, `PrintSheet.tsx`, `src/lib/poster.ts`, `printSheet.ts`, `print*.ts`, `printPrefs.ts`, `src/i18n/*/print.ts`, `chart.ts` (S2 is done), `scripts/smoke/print.js`, the `share-poster` shot in `yearSheet.js`. Draw §1 share (map labels scaled by cell/41 so they read at feed size) and §2.7 print. The mode switch uses `Segment`. Tests: `printSheet`, `printUi`, `poster`, `i18n-chart`. Check: `share.png`; print PDF against `chart-text.png`'s drawing.

**O6 · Rituals and small sheets** — Owns `src/overlays/WeekRitual.tsx`, `YearClose.tsx`, `Celebration.tsx`, `BackupImport.tsx`, `ProSheet.tsx`, `src/i18n/*/ritual.ts`, `backup.ts`, `pro.ts`, `scripts/smoke/x-l.js`, `x-k.js`, `yearClose.js`, `pro.js`. No mockups: build from the kit with `sheet.png` (sheet anatomy), `dayclose.png` (a closing moment) and `year.png` (a finished sheet) as references. Celebration (64/64) = the L2 map + one prompt + one primary button, no confetti. Tests: `yearClose.test.js`, `archive.test.js` (BackupImport), `proSheet.test.js`, `dx-3-sheets` (WeekRitual), `renderPerf` (BackupImport, Celebration: keep), `i18n-ritual`, `ritualView`. Check: kit rules; dark; ja/en at 375.

### Wave 4

**R2 · Cleanup** (merge before R1's final run) — Owns everything nobody else holds in wave 4: delete what nothing imports (`ChartBoard.tsx`, `SegmentedControl.tsx` if unused, `MOODS`, `ACCENTS`, `GOLD`, `withAccent`, `accentInk`, `TYPE`/`RHYTHM` if unused, `lib/home.ts` tally helpers, legacy `M` fields that no file reads); delete dead i18n keys in all three languages (`core.paper*`, `core.accent*`, `core.shape*`, `settings.subAccent`, `subShape`, …); fold the parts listed in wave 2–3 PRs into the kit; `docs/RELEASE_CHECKLIST.md` (add the §5 device checks); `docs/v2/device-tests.md` (dark, widgets, icon items). Run every gate, then review every mockup against the app in ko/ja/en, 390 and 375, light and dark, and file fixes as small commits.

**R1 · Store screenshots** — Owns `tools/store-shots/*`, `store/screenshots/**`, `docs/v2/store-shots.md`, `tests/storeShots.test.js`. Compose posters instead of a caption band: eyebrow 13→ scaled, headline 700 two lines at 2–3× the eyebrow, left-aligned on 32pt margins; frame 1 white ground: the chart tab's map (crop by `TID.gridTable` bounds) with its folio line and the brand mark at the foot; frame 2 `tile` ground: the Today page placed as a white sheet with round top corners running off the bottom; frame 3 grey ground (`#D5D9DE`): the small and medium widgets drawn in HTML from the fixture with `docs/design/mockups/a/parts-widgets.css` + the token values (a depiction, as Apple allows) and the app icon; frames 4–6 (home, stats, ritual or year) in the same grammar, each a different crop. Fixture keeps `settings.paper` unset (now 무지). Same devices and sizes, RGB PNGs (`verify.js`). Check: `store.png`.

---

## 4. Risks and decisions

### 4.1 Native pieces (cannot be seen in this sandbox)

Widgets (N1), from `@expo/ui` parts only:
- Props (`TodayWidgetProps`, still `v: 1`, new fields optional so old snapshots draw): `cells` = 64 chars from `lib/mapCells`, ti-major, `0` empty · `1` written · `2` done; `WidgetItem` gains `a` (area index) and `r` (right text: `D-2`, `중점`, or ''); `pal.light` / `pal.dark` become `{ paper, ink, ink2, print, printRule, tile, signal, core, dye[8], washL1[8], tint[8] }` from `LIGHT`/`DARK` (hex only, `widgetHex`). Every field keeps a default inside the layout (`p` may be `{}`). Swift (`native/ios/TodayStore.swift`) reads untyped dictionaries; new keys are safe (checked).
- systemSmall: head "● 오늘" (`signal` dot 6, `label`) + "1/10" (700 19/24), L1 map of `RoundedRectangle`s (81 views, cell 9, gaps 1/2), core + 16 area cells solid. systemMedium: head "● 오늘 할 일" / "**9**개 남음", three rows 34 high: box 20 (`RoundedRectangle` `strokeBorder` `printEdge`; done = `washL1` fill + `dye` edge + `Image systemName="checkmark"` bold `ink`: no custom tick path), title 15/20 (done `ink2` + `strikethrough`), right `r` or area mark + name; hairlines from x 30. Buttons keep the current `press()` op logic. systemLarge (no mockup): small's head and map (cell 12) beside the date and goal, then six rows. accessoryRectangular: "● 다음 할 일", title 16/22 600, meta "커리어 · D-2", box as a `Button` that checks it (same op); drop the box if it misbehaves on device. accessoryCircular: `Gauge(value: done/total)` with "오늘" and "1/10"; if the default style draws a linear gauge on device, fall back to today's number-only circle. accessoryInline: unchanged.
- Tinted and vibrant rendering (`widgetRenderingMode` ≠ `fullColor`): no hue; done 1.0, written 0.45, empty 0.18 opacity; area and core cells 1.0.
- System font (Pretendard cannot be bundled into the extension): accepted.
- The Lock Screen "＋ 담기" circle in `widgets.png` needs a second widget kind (a new extension target entry); not in 1.0. The `mandarat://add` link already exists if the owner wants it later.

Live Activity (N1): the 5×5 minute grid in the mockup cannot update itself on the Lock Screen (no background execution; only `Text(timerInterval:)` and `ProgressView(timerInterval:)` tick by themselves). Build instead: `paper` ground, padding 14; line 1 "25분 집중" (`print`) + area mark and name right; task 17/24 500; bottom: self-updating time 30/36 700 tabular + "남음", and a self-updating linear progress in `ink` on a `tile` track. No pause button (it would need an App Intent round trip into the timer); tapping opens `mandarat://focus`. Dynamic Island: compact leading and minimal = a 12pt rounded square in the area's dye, trailing = time; expanded = title + time + progress.

App icon (N2): light, dark and tinted variants are new drawings; their look on the Home Screen (dark with a `#4A4E55` core on black, tinted greys) is a device decision. Splash: light and dark images.

### 4.2 Dark mode following the system
- `Appearance.setColorScheme` overrides what `useColorScheme` returns; `LookProvider` must set `'unspecified'` for auto before reading the scheme. iOS briefly reports the other scheme when the app goes to the background (it snapshots both); debounce scheme changes by 150ms while `AppState` is not `active`.
- Widgets and the Live Activity follow the system, not the in-app choice (WidgetKit cannot read the app's override). Accepted.
- The JS splash uses the system scheme (the stored choice is not read yet). A forced-light user in dark system sees a dark splash for a moment. Accepted.
- Every screen must be checked in dark (capture.js dark sessions); nothing may hard-code a colour.

### 4.3 Japanese and English
Longer area names in 33pt map cells (`Relationships`, `人間関係`): fit sizes 10→8, 3 lines, then ellipsis; accessibility labels carry the full name. Tab label `マンダラート`: auto-shrink to 0.8. Stats reading sentence: one i18n function per language (no string concatenation). Units after figures come from the existing counters (`i18n/ja/counter.ts`, `en/plural.ts`). Week letters from `fmt.dowNarrow` (en M T W T F S S). Run smoke at 375 for ja and en in every screen package.

### 4.4 iPad
Same phone layout in the 640 column and in each page of the two-page spread (`lib/spread.ts`). Map width min(measure, 520); block width min(measure, 480); tab bar and sheets max 560, centred. Smoke `v4-d.js`, `v5-a.js`; Maestro `.maestro/ipad`.

### 4.5 The 375pt phone
Measure 327: map cells ≈ 31, L1 hero cell 18, block cells ≈ 105, minute tiles ≈ 61, tab capsule 267 (four 66pt tabs). Header titles wrap to two lines rather than shrink. Filter lines scroll. Check every screen with `--width 375` and capture.js `se-*` (375×667).

### 4.6 Chart performance
81 absolutely positioned Views per map, geometry memoised per width, cells memoised on `mapKey` so a tick redraws one map, not the screen (Home re-renders on every check). No Svg per cell. Year draws one L2 and four L1 maps (≈ 400 Views): render the L1 frames after the first frame (`InteractionManager.runAfterInteractions`). Keep the `memo` boundaries `renderPerf.test.js` pins. Device check: scroll Home and Year on the oldest supported iPhone.

### 4.7 Mockup details that React Native cannot draw as written
| Mockup | Instead |
|---|---|
| `color-mix(in oklab, …)` tints | precomputed `tint` / `dyeText` (§2.1) |
| `text-wrap: balance` (headline, prompts) | `noOrphan` / `A.keep` binding + `lineBreakStrategyIOS: 'hangul-word'` |
| strike through the middle of Hangul | a 1pt View over the measured text (K) |
| tick overshooting its box (`overflow: visible`) | a separate, larger Svg layered over the box |
| capsule `backdrop-filter: blur` | not needed: the capsule is opaque `capsule` |
| multi-layer `box-shadow` | RN 0.85 `boxShadow` string (New Architecture, web passes through) |
| the bar's gradient veil | `react-native-svg` `LinearGradient` |
| minute tile filling from the bottom | `scaleY` with `transformOrigin: 'bottom'` inside an `overflow: hidden` rounded tile |
| widget tick, custom shapes | SF Symbol `checkmark`, `RoundedRectangle` |
| widget and Live Activity Pretendard | system font |
| Live Activity minute grid, pause button | self-updating progress bar, tap to open (§4.1) |
| Lock Screen 담기 circle | deferred (second widget kind) |
| the system keyboard and status bar drawn as blocks | real system UI; the add sheet sits on the keyboard height |
| the seal, 正 tally, MaruBuri in the kit | not used |

### 4.8 Other decisions taken here (owner may reverse later)
Paper default 무지 (§2.6). Look is device-local (§2.4). Print keeps text (§2.7). Destructive actions stay ink. The Detail screen and the grid zoom are one `AreaPage`. Nothing in the data model is removed.

---

## 5. Owner (Mac) and sandbox checks

### What can be checked here
`npm run typecheck`, `npm test` (incl. the widget and Live Activity layouts run in a vm: `tests/helpers/widgetVm.js`), `npm run web-smoke` and `-- --dev` (ko, ja, en; add `--width 375`), `npm run prebuild-check` (Info.plist status bar style, widget target, strings), `npm run release-check`, mockup vs app screenshots (render.js, web-smoke, capture.js light and dark), icon PNG sizes and formats. The Vercel web build is the same bundle; check the PR's Vercel preview in a browser in light and dark.

### What the owner does on the Mac
After wave 2 merges (first device look), and again after wave 4 (release):
1. `git pull && npm ci`. If not done before: `npx eas-cli@latest login`, `npx eas-cli@latest init` (send the `app.json` diff back), as in `docs/RELEASE_CHECKLIST.md` v2-2.
2. Build: `npx eas-cli build -p ios --profile preview`; install on an iPhone (and an iPad) from the build page.
3. On the device:
   - every tab, sheet and the focus page against the PNGs; Settings › 보기 auto / light / dark; switch dark mode in Control Centre with the app open and in the background; 종이 무늬 four choices;
   - Increase Contrast, Bold Text, Larger Text (Accessibility › Larger Text, two steps up), VoiceOver on the map (each block reads its area and its cells), Reduce Motion;
   - widgets: add small, medium, large to the Home Screen and the three Lock Screen widgets; tick a row in the medium widget, open the app, check it is ticked; tinted Home Screen (iOS 18 › Customize › Tinted); light and dark wallpaper;
   - Live Activity: start a focus, lock the phone (banner counts down), Dynamic Island compact and expanded, finish;
   - icon light, dark, tinted on the Home Screen, in Settings and Spotlight; splash light and dark;
   - an upgrade install over the previous build: the earlier mood choice became the right look (§2.4), data intact, iCloud sync between iPhone and iPad still works.
4. Maestro on a simulator: `maestro test .maestro/phone` and `.maestro/ipad` (or `npx eas-cli@latest workflow:run .eas/workflows/e2e-ios.yml`), see `docs/v2/device-tests.md`.
5. Release: decide the version in `app.json`; `npm run release-check`; `npx eas-cli build -p ios --profile production`; `npx eas-cli submit -p ios`; upload the new screenshots from `store/screenshots/` (App Store Connect or `eas metadata:push`); the decisions in §4.8 and the deferred items in §4.1 go into the release notes for the owner's record.

## 6. Handoff notes (added by the lead as waves finish)

From T (wave 1a):
- C: T removed Root's `Appearance.setColorScheme` effect (auto must follow the system). Root still passes `gap={RHYTHM.dot}` to the paper; switch it to 24 with `offsetY={insets.top}`. `ErrorBoundary` still hard-codes the old cream colours.
- S6 (Settings): `paper.ko.dots` still says "점 (기본)"; the default is now 무지. `scripts/smoke/paper.js` was edited to end on the default.
- N1 (Widgets): `WidgetSync` still treats an unset paper as 'dots'.
- New: `src/theme/tokens.ts` (+ `desk()`), `src/lib/look.ts`, `src/theme/look.tsx` (`LookProvider`, `useLook`, `usePaletteValue`, `readLook`, `writeLook`); `type.ts` exports `ROLE`; `moods.ts` exports `PaletteValue`, `paletteOf`, `PALETTE`, `contrastPalette`; `shadow.ts` returns `{ boxShadow: float }`; `PILLAR_COLORS = LIGHT.dye`.

From K (wave 1b, controls kit, `src/components/kit/`):
- Exports: `CheckBox` {M, state, area?, size 24|20|14, onPress?}; `Row` {M, title, area?, areaName?, meta?, lead?, bare?, done?, right?, rightTone?, trailing?, divider?, onPress?} + `RowTitle`, `RowMeta`, `RowRight`, `RowRule`; `DyeMark`; `Section` {M, label, tone?, link?|meta?|note?|right?}; `TextLink`; `Segment` {M, options, value, onChange, onReselect?, role?, variant 'track'|'tiles'}; `Field` {variant 'main'|'small'|'memo', count?, button?, …TextInput}; `ChoiceRow`; `ToggleRow` {…, time?} + `TimeChip`; `LinkRow` {glyph?|lead?, title, meta?, value?, onPress}; `DayBoxes` {M, days, area?, todayIndex?, onPressDay?, canPress?}; `AreaPicker`; `FilterLine` {items, value, onChange, variant?, bleed?, trailing?}; `Swatch` {kind {look}|{pattern}, label, on, onPress}; `metrics.ts`; `index.ts`.
- `TODAY_ROW_INSET` is 38. `TodayRow` has `rightPrint` (for 중점); its mini week strip is gone. Old `Check` maps legacy colours (ink → chosen, area colour → done). `KIT_TYPE` holds text styles missing from `ROLE` (fold in during wave 4).

From N2 (app icon and splash): `tools/icons/render.js` draws every icon PNG from the tokens (sizes from G's `markTiles`, splash heart size from `Splash.tsx` `MARK`); `assets/splash-icon-dark.png` is new; app.json splash `imageWidth` 160 and `dark.image`. Owner device checks: light, dark and tinted icons on the Home Screen, in Settings and in Spotlight (the dark icon's core is dim: acceptable?); light and dark splash fade to the JS splash without a jump.

From G (chart and marks, `src/components/chart/`, `src/lib/mapCells.ts`):
- `ColourMap` {themes, goal?, level 'L2'|'L1', width?, cell?, focus?:[row,col], todayKeys?, doneToday?, onPressBlock?, accessibilityHint?, fade?, defer?, testID?, blockTestID?}
- `BlockGrid` {themes, goal?, block: ti|'core', width, todayKeys?, doneToday?, focus?: slot, extra?, print?, speech?, onCell?, onCellLong?, onHead?, onHeadLong?, onRing?, cellHint?, headRef?, cellTestID?}
- `Locator` {themes, block, at?: ai|'head', size=36}; `PagerMark` {block, size=22}; `Mark` {variant 'heart'|'app', size, tokens?}
- `WeekBars` {days: [{label, n|null, today?, sunday?, stack?}], variant 'bars'|'stack', accessibilityLabel?} — pre-sort the stack; the screen gives the a11y label.
- `MinuteGrid` {width, area, done, frac?, running?}
- `mapCells(doc, today?)`, `mapKey`, `actionStates` (64 chars, for widgets), `blockCells`, `areaCounts`.
- `GridMark`, `MiniChart` keep their props; `Splash` draws the heart (`MARK = 84`); `CHART_HEAD_FS` is 10.
- Pass `themes`, not the doc; place maps on whole pixels; the year page puts `defer` on its four small maps. On phones the map's centre cell holds 3 lines and long goals end in "…"; the ja/en goal placeholders in the editor do not fit (O1).

From N1 (widgets and Live Activity): small = "● 오늘 1/10" + the 81-cell colour map; medium = "● 오늘 할 일 / 9개 남음" + three tickable rows (focus items first); large = map beside head/date/goal + six rows; Lock rectangular = next action with a check button; circular = ring gauge "오늘 1/10"; inline unchanged; tinted and Lock Screen use system greys only. Live Activity: self-counting time + progress bar, no pause button; Dynamic Island shows the area square and the time. `WidgetSync` treats unset paper as 무지. Owner device checks: circular ring shape (`gaugeStyle` exists in the installed @expo/ui), box tap on the Lock Screen, no duplicate time under the Live Activity bar, large widget on an SE, tinted mode.

From C (chrome): `Header` adds `eyebrow, back, title, written, headline, figure, action{glyph,onPress,label,testID}, pinned` (old props still work; `pinned` keeps it outside the scroll; a back label defaults to the tab you came from; headers are 72, so `GridScreen` `HEADER_H = 64` is stale for S2). `Sheet` adds `header?, pad?`; `SheetHeader {leading, title, dye, sub, onClose, closeTestID}` — new sheets pass `pad` and `header`. `Button {variant: primary|secondary|tint, small, glyph, disabled, height, style}`; `PrimaryButton` wraps it. `QuietAction {label, onPress, foot}`. `Icon` adds `active, ground` and glyphs `down pause export import copies focus`; `minus` matches `plus`. `IndexTabs` adds `bleed` (default 20). `ui.tsx` exports `tabBarBottom, tabBarTop, tabClearance, useOptionalUIState`. `groupEdge` now returns `{}`.

From S6 (Settings): sections 핵심 목표 → 알림 → iCloud와 백업 → 보기 (화면 모드, 종이 무늬) → 언어 → 한 해 → 새로 시작 → 프로 (hidden) → 정보; header pinned. `TID.setMood`/`setShape` removed, `setLook` added; `mood`/`accent`/`cellShape` are never written and stay in the doc. Old strings stay for R2. For R2 (wave 4): kit `Swatch` has no aria-checked (wrapped locally in settings); `ChoiceRow` lacks per-row reading language and multi-line meta (built locally) — fold both into the kit.

From S5 (Onboarding): `ChartSketch.tsx` deleted; preview is a 3×3 of 64pt pale tiles (56 on 375×667); examples are one printed line (the first keeps `onbSample`); iCloud offer sits above the question. For R2: two text styles not in `ROLE` (sub 400 15/24, examples 400 13/20) are local to `Onboarding.tsx`.

From S1 (Home): `Tally.tsx` deleted; `lib/home.ts` adds `HOME`, `heroMapCell`, `homeEyebrow`, `homeList`. Year-close, weekly review and start guide are tappable rows; a finished day shows one printed line. For R2: `Header` has no accessibility-label override and no tappable title, so Home wraps it and draws settings outside it.

From O4 (Focus): `focusClock.clockParts` is new; `focusProps` gets `ti`. Minimising the session to a bar needs C's files, so the down glyph closes the page and keeps the minutes (as the old ×); `focusClose` sits on 그만하기. For R2: decide whether to add the minimised bar.

From O6 (rituals and small sheets): WeekRitual and YearClose share `PageHead` (exported from `WeekRitual.tsx`) and a local `Figure`; Celebration is 64/64 + one sentence + the L2 map + one button. For R2: fold `PageHead` and `Figure` into the kit; look at these sheets in light, dark, ja and en at 375.

From S3 (Today and day close): the ··· header action (keeps `TID.todayModes`) opens a sheet with the three views; one filter line; pick row is a + row; mood, one-line and week bars below. Day close: 48pt "10/10", sentence and note, list folded to one row with 펼치기; the closing time shows only when the day was closed on this screen (not stored). For R2: `Header` needs a `figureLabel` prop (VoiceOver reads "1/10" instead of the old spoken summary); kit `Segment` needs a group label; `ProgressBar` is unused; a few today keys are dead.

From O1 (editor): header = locator · area · 실천 n/8 · ×; field with count and a coaching note; type segment; habit opens 반복 (presets, 요일마다/횟수로, day boxes) and 알림 choice rows; footer quiet 칸 비우기 + ink 저장. Centre goal and area name show the field only. ja/en goal placeholders shortened. Open: the ink ring on the cell behind needs S2 to pass `focus` from `useUIState().editor` (asked of S2).

From O3 (add and pick), accepted by the lead: 완료 became 닫기 (the glossary bans 완료/完了; keeps `TID.sheetClose`); the pick button keeps "오늘 n개 · 다 골랐어요" because a tap already puts the action on today; the three inline suggestion rows are gone — "건강 실천에서 고르기 ›" opens the pick sheet filtered to that area, and "빈 칸에 적기" joins that line once text is typed. Quick add keeps the sheet open after each line and shows the last three lines above the field.

From O5 (share and print): share image 540×675 (1080×1350 px), always light; area names 13/16 (scaled from share.png); share sheet switch is a `Segment`; print follows chart-text.png with every text/ground pair at 4.5:1 or more; print sheet rebuilt from the kit; new `share-poster-blank` smoke shot. Two share strings live in `print.ts`. For R2: `ChartPoster` draws its own map because `ColourMap` takes no colour set or text scale — fold into the kit.

From O2 (action sheet): header locator + "■ 건강 / 실천 1/8" + × (locator and words open the area page); title + plan line; 오늘 했어요; 이번 주 range, "0/3회 남은 날 5일", seven day boxes (past days tap to log or clear); 이 칸 달성하기, 25분 집중하기 ›, 칸 편집하기 ›, memo tile. 어제도 했어요 shows only on Mondays. `lib/actionSheet.ts`: `sheetWeek`, `weekNote`, `yesterdayButton`; `memoRules` removed. For R2: the header is local (kit `SheetHeader` has no tappable area link, and VoiceOver reads "1/8" as a date) — fold in.

From S4 (Stats and year): scope line 이번 주 · 10주 · 올해 (one at a time); reading sentence `stats.reading` / `readingEven`; stacked bars via `lib/weekStack.ts`; year pages: goal as title, folio, L2 map, four L1 frames (cell 8), four figures at one size; shelf and sheet use the colour map; `GrowBar.tsx` deleted; testIds `statsScope(k)` and `yearShare` added. For the lead: `stats-year` now sits under the 올해 scope — `.maestro/phone/09-deeplink.yaml` must tap `stats-scope-year` first, and R1's stats/year store-shot scenes too. For R2: `STATS_TYPE` and `InLink` are local parts to fold into the kit.

From S2 (chart and area page): chart tab = goal header with share, folio "2026 만다라트 / 달성 24/64칸", colour map, note, one 60pt next-step row. First run (under 8 cells written): edit glyph, "쓴 칸 0/64", ink frame on the next empty cell, three suggestion tiles, "직접 쓰기". Zoom and Detail share `AreaPage` (back, "4/8", ··· sheet, block, pager, week tracker, other actions); iPad spread puts the block left and the rest right. The edited cell carries the ink ring. New `TID.gridBlock(b)`; `gridTable` also on the zoomed block. For R2: Header `figure` needs an accessibility label (S2 and S3 both hit this); switching map ↔ zoom does not scroll to top; Maestro flows 03 and 11 must tap `grid-block-*` before `grid-cell-*`; `AnimatedNumber` and old chart keys are unused.
