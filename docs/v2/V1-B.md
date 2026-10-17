# V1-B — Print core: what landed

Branch `mp/v2-v1-b`, from the wave-0 merge (`864e46b`). This implements `docs/v2/plan.md` §6 "#### V1-B", with `docs/v2/owner-decisions.md` taking precedence.
`docs.expo.dev` can't be reached from the sandbox, so every native API below was checked against the installed sources in `node_modules`: expo-print 56.0.4 (`build/*.d.ts`, `build/Print.js`, `ios/*.swift`, `android/**/*.kt`), expo-file-system (`build/internal/NativeFileSystem.types.d.ts`, `build/Paths.d.ts`) and expo-asset (`build/Asset.d.ts`).

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean (all 7 print files are in the program) |
| `npm test` | 557 tests: 556 pass, 1 skipped (the same skip as the W0 baseline); 16 of them are new |
| `npm run prebuild-check` | passes; `ios/` is deleted afterwards |
| `npm run web-smoke` (ko, ja, en) | passes, no page errors |
| Acceptance (SA) | `printHtml` rendered to HTML, printed with Playwright `page.pdf()`; page sizes and page counts checked with `pdfinfo`; PNGs in `docs/v2/V1-B/` |

## 1. What was done, per step

| Step | Change |
|---|---|
| 1 `printSheet.ts` (pure) | `PAGE_PT` (exact pt sizes from the plan). `printHtml(doc, opts)` returns `{ html, pages, size }`. **Chart page:** a header (`print.sheetTitle` and `fmt.dateLong(now)`), the goal (or a ruled line to write on), then the 9×9 table. In the table, achieved cells use the area colour with `DONE_INK`, label cells use `headBg` with the progress bar, the core uses `coreBg`/`coreInk`, and count actions get a bottom bar. Rules are frame 1.5 > block 1 > cell 0.5 (× scale). Finished blocks get a gold inner frame (`legibleMark(accent, white)`) and a `print.finished` mark under both label cells. Below the table: `print.achieved` (`64칸 중 n칸 달성`), 5 ruled memo lines, and a footer with the GridMark drawn in SVG plus the app name. **`areas` layout:** a cover (goal, 3×3 grid of area titles with number and `n/8`, date) and 8 area pages. Each area page has the area as a 3×3 board, then 8 ruled rows: check square, action text, kind label, and 31 day squares with day numbers. **`blank`:** label cells and the goal only; no action text, fills, bars, count or frames. Everything is ink on white, with `-webkit-print-color-adjust: exact`, `@page { size: Wpt Hpt; margin: 0 }`, `<html lang>` and the plan's font stack. All user text goes through `esc()`. `printFileName(now)` returns `mandarat-chart-YYYY-MM-DD.pdf`. |
| 2 `printFonts.native.ts` | `Asset.fromModule(require('pretendard/…/Pretendard-{Medium,Bold}.otf')).downloadAsync()` loads the fonts, then `new File(asset.localUri).base64()` reads them into `@font-face` with `data:font/otf;base64,…` (500 and 700). The promise is cached in memory; a failure resolves `''` and retries on the next call. |
| 3 `printFonts.web.ts` / `printFonts.ts` | Web builds the same CSS from `Asset.fromModule(…).uri`, made absolute against `location.href` so it resolves inside a `srcdoc` iframe, and caches it. Node returns `''`. |
| 4 `print.native.ts` | `printNow` calls `Print.printAsync({ html, width, height })`. A cancel (`ERR_PRINT_INCOMPLETE` from iOS `PrintIncompleteException`) resolves `'cancelled'`. `exportPdf` on iOS runs `printToFileAsync`, then `File.move(new File(Paths.cache, name), { overwrite: true })`, then `Share.share({ url, title: name })`, and returns `'shared' \| 'cancelled' \| 'failed'`. On Android, `exportPdf` calls `printNow`, whose dialog offers "Save as PDF", and maps `'printed'` to `'shared'`. Calls are serialised through a promise queue, because `Print.printAsync` throws "Another print request is already in progress". Android sizes are rounded, since `PrintOptions.width/height` are `Int` in Kotlin. |
| 5 `print.web.ts` | A hidden off-screen `<iframe srcdoc>`. On load, after `document.fonts.ready`, it calls `contentWindow.print()` and removes the iframe after 1 s. A load timeout gives `'failed'`; a second call while one is open gives `'cancelled'`. `exportPdf` does the same, but first replaces `<title>` with the file name (minus `.pdf`), because Chrome and Safari name the saved PDF after the title. Checked in Chromium: the print runs on the loaded document, the concurrent call is refused, and the iframe is removed. |
| 6 `print.ts` | The Node default: both calls return `'failed'`. |
| i18n | `src/i18n/{ko,ja,en}/print.ts`: `sheetTitle`, `coverTitle`, `achieved({done,total})`, `areaN({n})`, `areaOf({n,total})`, `finished`, `memo`, `colAction`, `colKind`, `colTally`, `kindOnce/Habit/Count/Mind`, `appName`. The en `achieved` uses `plural()`. Wording follows the glossary (マス/行動/分野/達成, square/action/area/achieved). |
| Tests | `tests/printSheet.test.js` covers every item in the plan's list, plus no Hangul in ja/en output apart from user text. `tests/print.test.js`: only `print.native.ts` imports `expo-print`; web uses `iframe srcdoc` → `print()` → `remove()` and sets the title; the native call shapes, cancel and share; the Node no-ops; the same export names on every side; base64 fonts cached once; and no suffixed file imports its own unsuffixed base name. |

## 2. Deviations

1. **`Printer` / `PrintFonts` interfaces live in `src/lib/printSheet.ts`, not `contracts.ts`.** `contracts.ts` defines no print interface, and only the lead may change it. This follows W0 deviation 7. The interfaces sit in `printSheet.ts` rather than `print.ts`, because `print.native.ts` importing from `'./print'` would resolve to itself under Metro (the same holds for `printFonts`). The shared `fontFaceCss` helper is there for the same reason.
2. **`fontCss()` is async** (`Promise<string>`) on all three sides. Native has to read files; the plan only gave the name `fontCss()`.
3. **Result types.** `printNow` returns `'printed' | 'cancelled' | 'failed'`; `exportPdf` returns `'shared' | 'cancelled' | 'failed'`, as in the plan. On web, `printNow` cannot tell print from cancel, so it is always `'printed'` once the dialog closes; V2-D should show no success toast for print.
4. **Header date** is `fmt.dateLong` exactly, as in the plan, so it has no year (the `fmt` namespace is frozen).
5. **Unnamed areas.** `posterCells` returns the Korean `영역 n` (poster.ts:57, X-E's file). `printSheet` ignores that text when `unnamed` is set and prints `msg().print.areaN` instead, so ja and en never contain Hangul.
6. **Kind labels** are duplicated in `print.kind*`. `KIND_LABEL` in `kinds.ts` is Korean-only until X-B.
7. **CSS units are `pt`.** This matches `@page` exactly in Chromium, and Playwright confirmed 1 page for `chart` and 9 for `areas` on every paper. How iOS WebKit scales `pt` in `printToFileAsync` / AirPrint can't be checked here (see device QA). Each `.page` is 1 pt shorter than the paper, so rounding never spills onto a blank page.

## 3. APIs for later waves

```ts
// src/lib/printSheet.ts (pure)
PAGE_PT: Record<PrintPaper, { w; h }>; PRINT_FONT
printHtml(doc: Pick<MandaratDoc,'centerGoal'|'themes'>,
          opts: PrintOptions & { now: Date; lang: Lang; fontCss: string; accent: string })
  → { html: string; pages: number; size: { w: number; h: number } }
printFileName(now?) → 'mandarat-chart-YYYY-MM-DD.pdf'
esc(s), fontFaceCss(mediumSrc, boldSrc)
interface Printer { printNow(html, size): Promise<PrintNowResult>; exportPdf(html, size, name): Promise<ExportPdfResult> }
interface PrintFonts { fontCss(): Promise<string> }
type PrintNowResult = 'printed' | 'cancelled' | 'failed'; type ExportPdfResult = 'shared' | 'cancelled' | 'failed'

// platform splits — import the bare path; Metro picks the side
import { printer } from '../lib/print';         // print.ts · print.web.ts · print.native.ts
import { printFonts } from '../lib/printFonts'; // printFonts.ts · .web.ts · .native.ts

// usage (V2-D)
const { html, size } = printHtml(doc, { ...opts, now, lang: lang(), fontCss: await printFonts.fontCss(), accent: accentColour });
const r = await printer.exportPdf(html, size, printFileName(now));   // or printer.printNow(html, size)
```

`msg().print.*` keys are listed in §1. V2-D adds its sheet strings to the same three files in wave 2.

## 4. Handoffs

- **V2-D** (`src/overlays/PrintSheet.tsx`, `src/i18n/*/print.ts`): use the calls above. `accent` is the current accent hex; `printHtml` makes it legible on white itself. Treat `'cancelled'` as silent and show "PDF를 만들지 못했어요" only on `'failed'`. Give `printNow` on web no success feedback (Deviation 3). Append keys to `src/i18n/{ko,ja,en}/print.ts` after `appName` (ko line 28) without renaming the V1-B keys.
- **Lead (optional)**: to make the print interfaces contracts, move `PrintFonts`, `Printer`, `PrintNowResult` and `ExportPdfResult` from `src/lib/printSheet.ts:29-44` into `src/lib/contracts.ts`. Then change the `import type` lines in `src/lib/print{,.web,.native}.ts` and `src/lib/printFonts{,.web,.native}.ts` to `'./contracts'`.
- **X-E** (`src/lib/poster.ts:57`): when `영역 ${c.ti + 1}` is extracted, `printSheet` needs no change, because it already uses `print.areaN` for unnamed heads.
- **X-B** (`src/lib/kinds.ts:9`): `KIND_LABEL` could reuse `msg().print.kind*`, or keep its own `kinds.*` keys. The wording is identical in ko.

## 5. Device QA (EAS `preview` build)

- [ ] **AirPrint (iPhone and iPad).** The dialog opens; cancel is silent (no toast, no error).
- [ ] **Page scale on iOS.** In `printToFileAsync` and AirPrint, an A4 chart is exactly 1 page and fills the paper like `docs/v2/V1-B/a4-chart-ko-1.png`. It must not shrink to about 75% or spill onto 2 pages; the `areas` layout gives 9 pages. If WebKit scales `pt`, the fix is in `printSheet.ts` `css()`, where the unit helper `pt()` is used.
- [ ] **PDF file name** in the share sheet is `mandarat-chart-YYYY-MM-DD.pdf`.
- [ ] **Glyphs.** Hangul renders in Pretendard (embedded). Kanji and kana fall back to Hiragino Sans in ja. No tofu.
- [ ] **Paper sizes.** A3, A5 and B5 (515.91 × 728.5 pt) are correct in the Files preview.
- [ ] **Colours.** Area colours and the gold frame print in colour (`print-color-adjust: exact`).
- [ ] **Android.** The print dialog's "Save as PDF" works; the paper size follows the chosen paper.
- [ ] **Font memory.** The second print is instant (fonts cached) and memory does not grow per print.
