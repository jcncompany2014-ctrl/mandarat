# V4-E — i18n platform (type, measuring, language setting)

Branch `mp/v2-v4-e`. Korean behaviour is unchanged: every new code path is behind `lang() !== 'ko'`, and the old ko tests pass unchanged (`text`, `chart`, `labelFit`, `dx-2-sketch`, `release`).

## 1. Implemented (step → change)

| Step | File | Change |
|---|---|---|
| 1 Typeset | `src/components/AppText.tsx` | `typeset(style, nested, bold, ctx?)` is now an exported pure helper. `ctx = { lang, os, latin }`; leaving it out gives ko, which is the old output byte for byte.<br>• **ja** (only text that contains kana, kanji, CJK punctuation or full-width forms):<br>&nbsp;&nbsp;– iOS: `fontFamily: 'Hiragino Sans'`;<br>&nbsp;&nbsp;– web: the stack `JA_WEB_STACK`;<br>&nbsp;&nbsp;– Android: `'sans-serif'` (the system font);<br>&nbsp;&nbsp;– `letterSpacing: 0` everywhere.<br>• **ja weights:** the weight comes from the same one-step-lighter `faceFor` mapping, Bold Text included. On iOS, Hiragino has only W3, W6 and W7, so Regular → `'400'` (W3), Medium/SemiBold → `'600'` (W6) and Bold → `'700'` (W7). Web and Android get 400–700 as is.<br>• **ja line breaking:** iOS `lineBreakStrategyIOS` `'standard'`; web `wordBreak: normal` plus `lineBreak: strict`.<br>• **en:** Pretendard and the same typeset as ko. Line breaking is `'standard'` on iOS and `wordBreak: normal` on web.<br>• **Pretendard kept:** text with no kana or kanji uses Pretendard in every language. That covers ASCII, digits and Korean.<br>• **Korean breaking kept:** text with Hangul but no kana or kanji keeps the Korean rules (`hangul-word` / `keep-all`) in ja and en too. See `breakLang`.<br>• `TextInput` in ja always uses the Japanese face. |
| 2 a11y language | `AppText.tsx`, `Pressy.tsx` | `accessibilityLanguage={a11yLang(l)}`. It is set on iOS only, and only when the app language differs from `getLocales()[0].languageCode`; a caller's own value wins. Nested `Text` doesn't repeat it. |
| 3 Measuring | `src/lib/labelFit.ts` | • `breakUnits(para, l)` is the single splitter.<br>&nbsp;&nbsp;– ko: whitespace words, exactly as before.<br>&nbsp;&nbsp;– ja/en: kana and kanji split one character at a time, with kinsoku. `、。」』）ー`, the small kana and other closing marks join the previous unit; opening brackets join the next one. Latin/digit runs and Hangul words stay whole. Each unit has a `gap` flag (whether a space separates it from the previous unit).<br>• `textWidth(s, fs, g, l)`:<br>&nbsp;&nbsp;– ko: unchanged;<br>&nbsp;&nbsp;– ja/en: kana and kanji 1.0 em, Hangul `g.wide`, and printable ASCII from a **Pretendard Bold hmtx table** (read from `node_modules/pretendard`), scaled by `g.narrow / 0.6` (so the SVG table stays 3% generous).<br>• `fitLabel` and `labelLines` take `l`. In ja/en, `labelLines` splits at the unit boundary nearest the visual middle, even without a space. |
| 3 | `src/lib/text.ts` | • `longestWord` and `fitBox` take `l` and use `breakUnits`.<br>• `cellBreak` takes `l`. In ja/en, text that contains CJK is returned as is: per-character breaking means gluing words protects nothing.<br>• `noOrphan` is unchanged. |
| 3 | `src/theme/chart.ts` | `estimateLines(text, width, fs, g?, l?)` walks `breakUnits` and adds a space only where `gap` is set. `fitFontSize` and `chartFit` pick this up through the default `l = lang()`. |
| 3 pins | tests | `'毎日お水を2リットル飲む'` gets 15 pt in a 60×60 cell (`fitBox`, sizes 18…10, 4 lines), against the plan's "12 or more". `'Drink 2 liters of water daily'` gets 12 pt, against "11 or more". Both pass with the Pretendard and the SVG table. |
| 4 Settings | `src/screens/settings/LanguageSection.tsx` | • Section `m.lang.sectionTitle`, then 4 ruled radio rows:<br>&nbsp;&nbsp;– `system` → `m.lang.system`;<br>&nbsp;&nbsp;– `ko`, `ja`, `en` → `LANG_NAMES`, each read in its own voice on iOS.<br>• Each row has a square `Check`, `accessibilityRole="radio"`, a checked/selected state and `testID={TID.setLang(p)}`. Below the rows is the footnote `m.lang.footnote`.<br>• Choosing a row:<br>&nbsp;&nbsp;1. `select()` haptic;<br>&nbsp;&nbsp;2. `chooseLang(p)`;<br>&nbsp;&nbsp;3. `announce(msg(to).lang.changed({ name }))`, in the new language.<br>• The current pref is read from `readLangPref()`.<br>• Gate: `languageSectionShown(I18N_READY, __DEV__, process.env.EXPO_PUBLIC_APP_ENV)`. It is true when ready, in dev, or in `preview`/`e2e`. |
| 4 | `src/i18n/{ko,ja,en}/lang.ts` | `sectionTitle`, `system`, `footnote`, `changed({ name })`. ko uses `josa(name, '으로/로')`. |
| Tests | `tests/i18nPlatform.test.js` (new, 13) | • Per-language typeset; `AppText.tsx` is transpiled with stubs for react, react-native and expo-localization.<br>• Web breaking, `a11yLang`, `breakLang`.<br>• Kinsoku units, ja/en measuring and the two pins.<br>• `labelLines` in ja.<br>• `resolveLang` with ja-first, en-first and fr-only locale lists, both with `auto=true` and with the default (all ko).<br>• The web `?lang` override.<br>• Section source shape, the gate and the catalog output. |
| Tests | `tests/labelFit.test.js` (+3) | ja/en glyph widths and ja/en ellipsis and two-line cases. |
| Smoke | `scripts/smoke/v4-e.js` (new, `needsDev`) | Settings shows the 4 rows and the footnote. Choosing another language re-renders in that language and changes `<html lang>`. The scene then restores the seeded pref. Shots: `<lang>-v4e-language.png` and `<lang>-v4e-language-<to>.png`. |

Line-owned guard tests (`release`, `text`, `chart`) needed no change. Their assertions still hold: `faceFor(weight, bold)` and `useBoldText()` are still called twice.

**Gates**
- `npm run typecheck` is clean.
- `npm test` passes 859 tests.
- `npm run prebuild-check` passes, and no `ios/` folder is left.
- `npm run web-smoke` (ko/ja/en, production) passes all scenes.
- `npm run web-smoke -- --dev` passes, including `v4-e` and `links`.
- At 375 pt, ja and en (`--width 375`) pass. The screenshots of the four tabs show no clipped labels; the UI text there is still Korean until the X waves.

## 2. Deviations

1. **Hangul text keeps Korean breaking in ja/en (`breakLang`).** The plan gives ja/en `wordBreak: normal` for every text. At 375 pt in ja, the Korean demo chart broke mid-word ("1만보 걷/기"). Text with Hangul but no kana or kanji is user-written Korean, so it keeps `keep-all` / `hangul-word`. The measuring already treats Hangul words as whole units, so the two agree.
2. **"ASCII-only keeps Pretendard" became "no kana or kanji keeps Pretendard".** Hangul-only text (Korean user content in a ja app) also stays in Pretendard. Hiragino has no Hangul, so iOS would fall back to a system font anyway.
3. **Hiragino weights.** iOS ships only W3, W6 and W7, so Medium (500) maps to W6, not to a distinct weight.
4. **`cellBreak` in ja.** CJK text is returned unchanged. Kinsoku comes from the native breaker (iOS `standard`, web `line-break: strict`), and the measuring models it. There is no Japanese no-orphan gluing; a word joiner was judged too risky for glyph rendering.
5. **Measuring takes `l` with a default of `lang()`.** All callers (ChartBoard, ChartPoster, ChartSketch, FullGrid, TodayModes) follow the app language without being edited.
6. **`LanguageSection` builds its own radio rows** instead of `rows.tsx` `RadioRow`. `RadioRow` takes no `testID` or `accessibilityLanguage`, and `rows.tsx` isn't mine. The look is the same: `rowBase`, the 16/600 label and `Check` at 22.
7. **`accessibilityLanguage` is iOS-only** (it is an iOS prop). On web, `<html lang>` already carries the language.
8. **New smoke scene** `scripts/smoke/v4-e.js`. It is a new file, as V2-A and V3-E did. It is `needsDev` because the section is hidden in a production export until `I18N_READY`.

## 3. APIs for later waves (X-* extraction, V8-A)

```ts
// src/components/AppText.tsx
typeset(style, nested, bold, ctx?: { lang: Lang; os: string; latin: boolean }): TextStyle | null
needsJaFace(text): boolean          // kana/kanji/CJK punctuation present
breakLang(l, text): Lang            // 'ko' for Hangul text without kana/kanji
lineBreakFor(l), webBreakFor(l), plainText(children), a11yLang(l?, os?, device?)
JA_WEB_STACK
// src/lib/labelFit.ts
breakUnits(para, l?): { t: string; gap: boolean }[]   // the one splitter for line estimates
isCjk(ch): boolean
textWidth(s, fs, g?, l?), fitLabel(s, max, fs?, l?), labelLines(s, max, fs?, l?)
// src/lib/text.ts
cellBreak(text, width, fs, g?, l?), longestWord(text, fs, g?, l?),
fitBox(text, width, height, sizes, maxLines, lineRatio?, g?, l?)
// src/theme/chart.ts
estimateLines(text, width, fs, g?, l?)
// src/screens/settings/LanguageSection.tsx
LANG_PREFS, languageSectionShown(ready, dev, env), LanguageSection
// catalog
msg().lang.{sectionTitle, system, footnote, changed({ name })}
```

**Notes for X-E (chart) and the other X-* packages**
- Never shorten Korean to fix ja/en overflow. Measure with the helpers above, which follow `lang()` by default.
- For a fixed box, use `fitBox`. For a label, use `labelLines`.
- Pass `l` explicitly in pure tests.
- `chartFitHint` (in `theme/chart.ts`, X-E's text) still holds Korean literals; X-E moves them.

## 4. Handoffs

1. **V4-D (owns `App.tsx` in wave 4), or the lead: the language-change resume hint is lost.**
   - **Where:** `App.tsx:60`, `<UIProvider initialScreen={takeResumeHint()}>`.
   - **Problem:** the hint is read while `Shell` renders. That render happens before the language changes, so the hint is `undefined` then. When `LangRoot` remounts on the new key, it reuses the element `Shell` already built, so the hint set by `chooseLang` is never read.
   - **Result:** after a language change, the app lands on Home instead of Settings.
   - **Exact change:** read the hint inside a child that remounts under `LangRoot`:

   ```tsx
   // App.tsx
   function Resume({ children }: { children: React.ReactNode }) {
     const [hint] = useState(takeResumeHint);   // runs again on every LangRoot remount
     return <UIProvider initialScreen={hint}>{children}</UIProvider>;
   }
   // Shell: <LangRoot><Resume> … </Resume></LangRoot>  (replacing <UIProvider initialScreen={takeResumeHint()}>)
   ```

   - **After the fix:** `scripts/smoke/v4-e.js` can drop its "re-open Settings if needed" branch and assert that Settings stays open.
2. **V8-A:**
   - When `I18N_READY` flips to `true`, `languageSectionShown` returns true in every build. No change is needed in `LanguageSection`.
   - The `tests/i18nPlatform.test.js` case "resolveLang … 기본값" asserts `resolveLang('system', list) === 'ko'` for all lists. Update it together with `tests/i18n-runtime.test.js`.
3. **V5-B (testIDs):** `TID.setLang(pref)` is already used on the four rows.

## 5. Device-QA items (EAS `preview` build)

- [ ] **Japanese glyphs.** With the device in Korean and the app in 日本語, kanji are drawn in Hiragino Sans (Japanese forms, e.g. 直 and 骨), not in Apple SD Gothic Neo.
- [ ] **Hiragino weights.** Row titles are W6 and big numbers W7. With Bold Text on, everything is one step heavier.
- [ ] **Line breaking in Japanese.** No line starts with 、。」ー or a small kana, and none ends with 「（.
- [ ] **Mixed content.** Korean user content in a ja/en app breaks by word, and Latin-only labels (numbers, `24 / 64`) stay in Pretendard.
- [ ] **VoiceOver in Japanese.** VoiceOver reads Japanese labels with a Japanese voice when the device is in Korean, and the rows 日本語 and English in their own voices.
- [ ] **Language switch.** Settings › 언어 → 日本語 redraws the app in Japanese. VoiceOver announces 「日本語に切り替えました。」. Until handoff 1 lands, the app returns to Home rather than Settings.
- [ ] **Section visibility.** The section shows in `preview` and `e2e` builds, and not in `production` until V8-A.
- [ ] **Per-app language.** The per-app language from iOS Settings is honoured, but only after V8-A sets `I18N_READY`. Until then, `system` resolves to ko by design.
- [ ] **Android.** Japanese text uses the system font (Noto Sans CJK JP) with the right weights.
