# Audit: components, iconography and affordances

Lens: component craft only (checkboxes, rows, buttons, tabs, sheets, inputs, tab bar, icons, marks, touch targets, pressed and disabled states).
Bar: "would Apple feature this?", measured against Things 3, Structured, Tiimo, Streaks, Toss, NYT Games.
Material reviewed: about 60 screenshots from `/tmp/design-shots` (@2x) and `/tmp/web-smoke` (@1x; ko, plus en/ja spot checks, dark, SE, iPad), and the code in `src/components`, `src/navigation`, `src/overlays`, `src/screens`, `src/theme`.
Coordinates below are pixels in the named file. Contrast ratios are computed from the tokens in `src/theme/moods.ts` and `src/theme/palette.ts` on the default paper `#FBF9F4`.

## Verdict

The engineering under the components is better than the components look: hit areas, accessibility roles, contrast-tested borders and the pen-drawn check are careful work, and the ruled rows, 正 tally and "circle one" mood line are real ideas. But the parts are not one family: selection is drawn six ways in a single sheet, interactive text is styled exactly like captions, 14 corner radii and 8 pressed opacities have no token, and the icons are unmodified Lucide while the eight bespoke area glyphs are never shown. The three things a reviewer touches first (the tab bar's dashed 담기 box, the grey outline checkbox, the mustard 저장 slab) are the most generic objects in the app, so the product reads as a well-built prototype, not a finished one.

## Strengths to keep

1. **Ruled rows (괘선 줄).** `LineRow` / `groupEdge` / `RowDivider` (`src/components/common.tsx:37-53, 759-838`): hairline dividers that start at the text inset, a 52–54pt row tied to the 18pt dot grid (`RHYTHM.row`, `src/theme/type.ts:50`). Settings, sheets and Today all sit on the same lines (`light-tall-settings.png`).
2. **The check motion.** Fill 120ms, then a tick drawn as one pen stroke over 170ms, each row tilted a fixed ±3°, then an ink strike-through drawn left to right (`Check.tsx:22-27, 95`, `TodayRow.tsx:394-432`). Reduced motion is respected. This is the best-crafted interaction in the app.
3. **正 tally on Home (`Tally.tsx`).** One stroke per completion, 正 for ko/ja and a five-bar gate for en (`light-tall-tab-dashboard.png` y≈1190–1250). Culturally specific and ownable. No competitor has it.
4. **Mood as "circle one" (`MoodRow.tsx`).** A pen ellipse drawn around the chosen word. The idea is right; it needs a resting affordance (see CI-03).
5. **Touch-target discipline in code.** Check 26 + hitSlop 10 = 46pt (`TodayRow.tsx:325`), chips 40 + 8 (`common.tsx:613`), close 32 + 12 (`common.tsx:507`), text tabs 30 + 14 (`common.tsx:657`), rating 36 + 8 (`KindBits.tsx:125`). I found no primary control under 44pt. The problem in this audit is visual affordance, not target size.
6. **Accessibility plumbing.** Checkbox / radio / tab roles, custom actions on rows, large-content viewer on the tab bar (`Root.tsx:706`), increase-contrast variants (`Check.tsx:17-20`), contrast values pinned by tests (`lib/marks.ts:34`).
7. **Area colour tags are consistent.** The same small square plus name appears on every list row, tab and sheet, and "area colour fill = done" holds in the chart, the check and the week boxes.
8. **Sheet mechanics and header pattern.** Drag to dismiss with a guard, keyboard-aware backdrop, fixed footer with one full-width action above a hairline (`common.tsx:278-492`). All eight sheets reviewed use title left, close right.
9. **The 3×3 locator in the action-sheet header** (`light-action-sheet.png` x≈40–112, y≈472–545): a tiny block that shows which cell you opened. A genuinely good contextual component; promote it, do not lose it.
10. **Tokens survive every paper.** Dark, 크림, 화이트, 파스텔 all render the same components correctly (`dark-tab-today.png`, `mood-파스텔-tab-dashboard.png`).

## Findings

### P0: looks unfinished, or hurts the first impression

**CI-01 · Tab bar · The centre 담기 button is a dashed placeholder**

- Problem: the app's main action is drawn as a dashed rounded square with a plus. Dashed outlines mean "empty slot", "drop zone" or "missing image" everywhere else in software, and here too: the same dashed box is used for four different things. It is also the only always-ink object in the bar, so it competes with the active tab while its own label stays grey.
- Evidence: `light-tab-today.png` bottom bar, x≈390, y≈1608: a 56×56px (28pt) box, radius ≈14px, 1.6pt dashed ink line, 16pt plus; label "담기" in grey `#6F6657`. Same in `dark-tab-today.png`, `se-tab-today.png`, `ko-spread-1194x834.png`. Code `src/navigation/Root.tsx:739-753`. Reuse of the dashed box: "실천에서 더 고르기" row (`Today.tsx:214`, `Dashboard.tsx:440`), empty-state bullets with no plus (`EmptyState.tsx:52`), and tappable suggestion rows in quick add with no plus (`QuickAdd.tsx:163`; `light-quick-add.png` x≈62, y≈1370 and y≈1465).
- Fix: make the centre slot the one filled object in the bar: a 36×36pt ink (`M.ink`) square, radius from the control token (CI-14), paper-colour plus (20pt glyph, stroke 2), label "담기" in ink 600. Press = scale 0.94 plus a light haptic. For "add" rows use a bare 18pt plus in the 26pt check column with ink 15/700 text. Quick-add suggestions use the real `Check` (they select). Keep the dashed box only for `EmptyState` placeholders. Reference: Things 3's Magic Plus and Structured's filled plus are the single most saturated object on screen.

**CI-02 · Cell editor, Settings, Print, Today · Selection is drawn six ways**

- Problem: there is no rule for "how a choice looks". One sheet mixes six selection idioms, single-choice lists use the checkbox glyph, and the same glyph is also an independent toggle a few rows later. The same chip shape means "choose" in one row and "nudge the date" in the next.
- Evidence: `ko-xa-editor-habit.png`, top to bottom: (1) y≈254 three 10pt boxes "무엇을 / 얼마나 / 언제·어디서" that cannot be tapped (`GuideChips.tsx:11`); (2) y≈323 underline segments "한 번 / 습관 / 쌓기 / 마음가짐" (`CellEditor.tsx:719`, variant `underline`); (3) y≈453 ink-filled chips "요일마다 / 횟수로" (`common.tsx:599`); (4) y≈545 seven 44pt cells filled indigo `#5068AB` (`DayPicker.tsx:62`); (5) y≈597 chips again "매일 / 평일 / 주말"; (6) y≈682 and y≈727 a 22pt checkbox at the right acting as a radio. `ko-xa-editor-once.png` y≈593 and y≈718: one chip style for choices ("이번 주", "이번 달") and for steppers ("−1주", "+1일"). `ko-print.png`: "종이 크기" (5 radios), "구성" (2 radios) and "빈 표로" (an on/off toggle, `PrintSheet.tsx:234`) all show the same 22pt box. `light-settings.png` y≈660–1650: 종이, 칸 모서리 radios drawn as checkboxes (`settings/rows.tsx:53` `RadioRow` renders `<Check>`). `ko-xd-list-bottom.png` y≈385–540: rating 1–5 as fifteen outlined 36pt boxes that read as pagination (`KindBits.tsx:73`). Colour collision: a colour-filled day means "scheduled" in the editor picker and "done" in the sheet week strip (`WeekStrip.tsx:151`). Note that the proper segmented look (`SegmentedControl` variant `track`) is implemented but used nowhere.
- Fix: three controls, one job each.
  1. **Check** (box): independent yes/no and "done" only.
  2. **Choice row**: one of many. No box. The selected row gets a trailing 18pt ink tick and an 800-weight title; other rows show nothing on the right. Apply to Settings, Print, YearClose and editor reminders.
  3. **Segment**: 2–5 inline exclusive options. One look: 1pt border at ink 55%, control radius, selected segment ink-filled with paper text. Use for 유형, 반복, Today view modes, share variant and the 1–5 rating (one five-cell strip per row).
  
  Day picker: selected day = ink fill, so "ink = chosen, area colour = done" holds everywhere. Presets and ±date steppers become small secondary buttons (CI-07). Replace the three 10pt guide boxes with a plain text line; nothing box-shaped that cannot be tapped.

**CI-03 · Today, Board, action sheet, onboarding · Nothing looks tappable**

- Problem: interactive text uses the caption style (13pt, weight 600, grey `M.sub`). A status label and an action share one component. The paper direction removed fills, borders and colour from actions and put nothing in their place, so a new user cannot tell print from control.
- Evidence: `light-tab-today.png` x≈706, y≈257: "고르기", the entry to choosing today's list, is 13/600 grey (`Today.tsx:369`), the same as the row caption "건강 · 이번 주 0/3회" below it (`TodayRow.tsx:355`). `ko-xd-board.png` x≈358: the only action on each of nine rows is a grey "시작" (`TodayModes.tsx:669`). `light-action-sheet.png`: y≈1140 right text "저절로 담겨 있어요" (status) and y≈1244 "시작 ›" (action) come from one `RightText` (`ActionSheet.tsx:142-144`). `ko-xd-list-bottom.png` y≈646: mood options are five bare grey words (`MoodRow.tsx:80`). `ko-xi-onboarding.png` y≈810: "템플릿으로 시작하기" grey 13pt. `ko-xa-editor-once.png` x≈333, y≈674: "마감 없애기" grey. Seven text-action styles exist: underlined ink 13/600 (`settings/rows.tsx:114`, `ShareChart.tsx:207`, `Onboarding.tsx:217`), grey 13/600 (above), ink 14/700 (`ActionSheet.tsx:146`, `common.tsx:867`), ink 13.5/700 (`Detail.tsx:334`), ink 16/600 (`YearClose.tsx:156`), ink 15/700 with "›" (`EmptyState.tsx:73`), rose "칸 비우기" (`ko-xa-editor-habit.png` x≈46, y≈802).
- Fix: rule: grey is never interactive. One `TextAction`: ink 15/700, 44pt minimum height, a trailing 14pt chevron icon when it opens something; a `quiet` variant (ink 13/700 with a 1pt underline at ink 40%) for inline links. Replace all seven. Row status text stays grey with no chevron. "고르기" becomes a small secondary button (CI-07). Board rows get a leading stage box and a trailing small button "시작". Mood becomes a five-cell ruled strip, 44pt high, words inside, and the chosen cell keeps the pen ellipse.

### P1: clearly below best in class

**CI-04 · Tab bar, headers · Stock Lucide icons, an Android share glyph, generic tab icons**

- Problem: the direction banned gradients and pills to avoid a generic look, but the icons are the default set of most generated UIs, unmodified, in the most-seen places. The share icon is the Android convention on an iOS-first app. The Today tab is a circle check in an app whose checkbox is a square, and the Mandalart tab is the stock table icon although the app owns a mark.
- Evidence: `LineIcons.tsx:2-7` ("lucide 아이콘 24개만 옮겨 그린 것 … 모양은 원본 그대로"). `light-tab-today.png` bar: house, grid-3x3, circle-check, chart-column-big (`Root.tsx:81-85`). `light-tab-grid.png` x≈608, y≈60: three connected nodes (Lucide share-2, `LineIcons.tsx:155`) beside the pencil. `GridMark.tsx:20` (3×3 with a solid centre) exists, but per its own comment it is used only on the splash, onboarding, about and error screens. `ko-ipad-834x1194-sheet.png` licence list: "Lucide 아이콘 도형".
- Fix: (a) on iOS use SF Symbols for system verbs (share = `square.and.arrow.up`, close, chevrons, settings, edit), keeping SVG fallbacks for web; check the symbol API against the Expo SDK 56 docs before adopting. (b) Draw five tab glyphs on the chart's geometry (square module, 1.75pt stroke, 2pt corners): 홈 = a page with a date rule, 만다라트 = 3×3 with a solid centre cell, 담기 = filled cell with plus, 오늘 = square check, 통계 = bars. Active = ink plus one filled cell, not a heavier stroke.

**CI-05 · Home ledger, Today rows, filters · The eight area glyphs are never shown**

- Problem: the app already has eight hand-drawn area icons, and they are dead code. On screen an area is only a 7–9pt colour square, so identity is colour-only at a size where two pairs of the palette are indistinguishable for many people. This is also the cheapest source of personality the app has.
- Evidence: `AreaIcons.tsx:22-105` (맥박, 서류함, 책, 두 사람, 엽전, 붓, 숨, 산), mapped in `Icon.tsx:16-17`, stored in `data/defaults.ts:45-77`; no file in `src/screens`, `src/overlays` or `src/components` renders a theme icon (grep for `.icon`: only tab bar, `KindBits.tsx:43`, `RemindRow.tsx:95`, `CellEditor.tsx:905`, `SegmentedControl.tsx:157`). Area mark sizes: 7×7pt (`TodayRow.tsx:354`, `common.tsx:212, 715`), 9×9pt (`Dashboard.tsx:263, 355`); see `light-tab-today.png` rows and `ko-xh-home-bottom.png` x≈33. 쑥 `#478058` vs 청자 `#2F7D79` have a luminance contrast of 1.04:1; 쪽빛 `#5068AB` vs 비색 `#3A77A5`, 1.12:1.
- Fix: show the glyph wherever an area is named in text of 13pt or more: Home ledger (16pt glyph in area ink in the 26pt column), Today row meta (13pt glyph instead of the square), index tabs, quick-add area picker, action-sheet header, the head cell of a zoomed block. Keep the square only inside dense marks (week boxes, mini chart). Redraw the eight glyphs in the same pass as CI-04 so caps, corners and weight match. Reference: Streaks and Structured make the item icon the anchor of every row.

**CI-06 · Today, Board, action sheet · The checkbox is generic, in five sizes and two positions**

- Problem: the hero control looks like a default web form checkbox: a soft grey outline squircle. It contradicts the stated "square checkboxes", comes in five sizes, and changes side between views of the same item.
- Evidence: radius = size × 0.28 (`Check.tsx:98`, 7.3pt at 26pt); border 1.6pt at ink 55% = `#89857F`, 3.49:1. `light-tab-today.png` x≈40–92: nine identical empty boxes down the left edge. Sizes: 26 (`TodayRow.tsx:67`), 28 (`ActionSheet.tsx:177`), 22 (`ActionSheet.tsx:440, 459`, `PrintSheet.tsx:234`), 20 (`TodayModes.tsx:686`), 10 (`GuideChips.tsx:11`). Position: left in the list (`ko-xd-list-bottom.png` x≈38, y≈255), right in Board for the same item (`ko-xd-board-bottom.png` x≈360, y≈258). `light-action-sheet.png`: a 28pt box on the left ("오늘 했어요", y≈742) and a 22pt box on the right ("이 칸 달성하기", y≈1362) with different meanings.
- Fix: two sizes, 24pt (rows) and 20pt (trailing). Radius from the control token so the 칸 모서리 setting governs checks as well as the chart. Border 1.75pt at ink 70% (`#696560`, 5.5:1). Signature: keep the pen tick and let it overshoot the box at the top right by about 3pt, as a tick written on paper. The check for a done item is always on the leading edge, in Board too. "이 칸 달성하기" is a one-time milestone: make it a full-width secondary button, not a second checkbox.

**CI-07 · All sheets, onboarding, focus timer · Buttons: a mustard slab, six geometries, and disabled looks like secondary**

- Problem: the primary button is a flat gold rectangle whose label barely passes AA. Six button geometries exist without a scale. A disabled primary turns into an outline that is the same kind of object as the enabled quiet button, and nearly disappears.
- Evidence: `ko-xa-editor-habit.png` y≈775–828: "저장", `#B0883C`, 52pt, radius 12, ink label = 4.59:1; gold on paper = 3.10:1. Disabled = transparent, 1pt `M.line` border, `M.faint` label (`common.tsx:552-555`), the same geometry as tone `quiet` (`common.tsx:563`): compare `ko-xk-import.png` y≈802 "이 백업으로 바꾸기" (disabled) with `ko-xi-onboarding.png` y≈757 "목표는 나중에 쓸게요" (enabled quiet) and `light-quick-add.png` y≈1604. Disabled label `#AAA08D` = 2.46:1, border 1.19:1. Other geometries: 32pt radius 8 ("정하기", `Dashboard.tsx:589`, `ko-xh-guide.png` x≈339, y≈320); 30pt radius 6 outline ("+1권", `TodayRow.tsx:274`); 52×52 radius 12 outline minus (`ActionSheet.tsx:302`); 44×44 radius 6 steppers (`CellEditor.tsx:901`, `ko-xa-editor-habit-count.png` y≈600); a hand-rolled white-outline pause button (`FocusTimer.tsx:304`).
- Fix: one `Button`: size L (52pt, radius 12, 16/700) or S (32pt, radius 6, 13/700) × tone primary / secondary / danger text. Primary = ink fill with paper label (14.25:1), which is also the most "printed" option; the accent colour moves to marks (today dot, focus underline, progress) where 3:1 is enough. Secondary = 1.25pt outline at ink 55% with ink label. Disabled = the same button at 35% opacity, so it keeps its identity. One `Stepper` for the editor and the sheet. The focus timer uses `Button` with an on-dark flag. Reference: Toss and NYT Games use one tall, high-contrast action per screen.

**CI-08 · Editor, sheets, guide · The divider hairline is used as a control boundary**

- Problem: the row divider colour (1.19:1) is also the only edge of pressable and fillable controls, so their shapes are almost invisible and fail the 3:1 non-text contrast expected of control boundaries.
- Evidence: `M.line` = `rgba(110,85,40,0.12)` → `#EAE5DC` on `#FBF9F4` = 1.19:1 (`moods.ts:27`). Used as the border of the off-state chip (`common.tsx:620`; `ko-xa-editor-once.png` y≈593 "이번 주 / 이번 달 / 3개월 뒤 / 올해 안" and y≈718 "−1주 … +1주": outlines barely visible), steppers (`ActionSheet.tsx:302`, `CellEditor.tsx:901`), quiet and disabled buttons (`common.tsx:554, 563`), the import textarea (`BackupImport.tsx:183`, `ko-xk-import.png` y≈642–752), guide steps 2–5 (`Dashboard.tsx:578`, `ko-xh-guide.png` x≈32, y≈373–535).
- Fix: two line tokens. `rule` = `M.line`, dividers only. `edge` = ink 55% (3.49:1; already defined as `CHECK_BORDER` in `lib/marks.ts:36`), for anything that can be pressed or filled.

**CI-09 · App-wide · Pressed and disabled states have no system**

- Problem: touch feedback differs from control to control and is mostly too weak to see. The component written to unify it is used once.
- Evidence: `Pressy.tsx:18` ("앱 전체의 손끝 감촉을 하나로 맞춘다") has one call site (`common.tsx:501`, the close button). There are 108 raw `<Pressable>` in `src` with eight pressed opacities: 0.5 ×30, 0.55 ×4, 0.6 ×17, 0.7 ×2, 0.72, 0.75, 0.8, 0.85 ×3. Row press = paper mixed 5% toward ink (`common.tsx:46-48`) = `#F1EEE9`, 1.10:1 against the page. Primary button press = opacity 0.85 only (`common.tsx:582`). Disabled is 0.45 (`common.tsx:623`), 0.4 (`ActionSheet.tsx:303`), 0.35 (`CellEditor.tsx:902`) or an outline (`common.tsx:552`).
- Fix: one primitive with three recipes: `row` (background ink 10–12%, instant in, 150ms out), `control` (scale 0.97 spring plus an ink 8% overlay; primary adds a light haptic), `icon` (36pt backdrop at ink 10%, control radius). One disabled recipe: 35% opacity. Migrate every `Pressable`.

**CI-10 · Settings, sheets, year screens · Chevrons come in three renderings**

- Problem: disclosure is sometimes an icon and sometimes a typed character, in different weights and colours, and the most common one is too faint to see.
- Evidence: (a) icon chevR, 16pt, `M.faint` `#AAA08D` = 2.46:1, rendered stroke 1.9 × 16/24 = 1.27px: `light-settings.png` x≈720, y≈380 (`common.tsx:787`, `Settings.tsx:319`, `GridScreen.tsx:54`). (b) the same icon in `M.sub`: `light-tab-dashboard.png` x≈724, y≈874 (`Dashboard.tsx:55, 166`). (c) the character "›" typed into strings: `i18n/ko/home.ts:41`, `sheet.ts:61, 83`, `print.ts:59`, `today.ts:51`, `stats.ts:29`, `EmptyState.tsx:73`, `Detail.tsx:211-212` (and the ja/en equivalents): grey and regular in `light-action-sheet.png` x≈706, y≈1244; bold ink in `ko-year-shelf-390.png` x≈364, y≈148 and `ko-year-sheet.png` x≈364, y≈690. Expanded state is the character "⌄" (`ko-year-sheet-area.png` x≈364, y≈690). Back is "‹ 이전" (`ko-year-close-2.png` x≈308, y≈23).
- Fix: one `Disclosure` icon (right, down, left), 16pt, stroke 2, `M.sub` (5.37:1). Remove ›, ‹ and ⌄ from all strings in the three languages.

**CI-11 · Today, editor, share · Four tab components, two stacked on Today**

- Problem: view mode and area filter use the same underline idiom one above the other, with two rows of tiny squares around them, so the top of Today is five thin layers before the first task. A real segmented control is not on screen anywhere.
- Evidence: `light-tab-today.png`: y≈170 `TextTabs` "목록 · 연속 기록 · 보드" (14/700, 2pt ink underline, `common.tsx:637`); y≈318 ten 10pt progress boxes (`Today.tsx:331`); y≈368 `IndexTabs` "■ 전체 10 ■ 건강 5 …" (13pt, 2pt underline, `common.tsx:689`); y≈428 weekday caption. Underline segments again in the editor (`CellEditor.tsx:721`) and share sheet (`ShareChart.tsx:122`, `ko-share-poster.png` y≈708). `SegmentedControl` variant `track` has no call site.
- Fix: view mode becomes the Segment from CI-02, or a single icon menu at the right of the header. Area filter keeps `IndexTabs` (with glyphs, CI-05). Delete `TextTabs` and the underline variant.

**CI-12 · Today rows · The week-dot strip is glyph soup**

- Problem: five states are encoded in 9pt boxes with no legend, and the most common habit type (N times a week) renders as a row of dots that says nothing. The caption above is smaller than the app's own type floor.
- Evidence: `light-tab-today.png` x≈578–740: row "11시 취침" (y≈728) shows two slashed boxes, one ink box, one grey box, two 3pt dots, one grey box; row "주 3회 운동" (y≈618) shows two dots, one box, four dots. At 1x (`ko-tab-today.png`) the slash is a one-pixel smear. Five states at 9pt: `WeekStrip.tsx:28-34`, `lib/marks.ts:82`. Caption "월 화 수 목 금 토 일" is 10pt (`WeekStrip.tsx:244`; also `TodayModes.tsx:273`) while `type.ts:34` says of 11pt "이보다 작게 쓰지 않는다".
- Fix: the row strip shows three states: filled = done, outlined = scheduled (today's outline is 1.5pt ink), nothing = not scheduled; a past empty outline at ink 30% reads as missed. Boxes 10pt, caption 11pt. N-per-week habits show N pips (■□□ for 1 of 3). Keep slashes only in the 40pt sheet strip.

**CI-13 · Sheets, year close · Three ways to close or go back**

- Problem: back is an icon, sheet close is a grey circle (the only circular control in the app), and the year-close flow uses words. In the action sheet two neighbouring header actions have different containers, sizes and colours.
- Evidence: `light-settings.png` x≈62, y≈60: chevL 22pt ink (`common.tsx:58-77`). Sheets: 32pt circle, fill ink 6% (`#EFECE7`, 1.12:1), × 18pt grey (`common.tsx:498-516`). `light-action-sheet.png` y≈508: bare 22pt ink pencil at x≈624 beside the circled grey × at x≈708. `ko-year-close-2.png`: "닫기" 16/600 at x≈33, "‹ 이전" at x≈308 (`YearClose.tsx:148-170`).
- Fix: sheet header actions all use `IconBtn` (44pt target, 22pt glyph, ink); the × loses its circle. Full-screen flows use the standard `Header`: × at left, "2 / 3" at right, back as a chevL icon button.

### P2: polish

**CI-14 · App-wide · Fourteen corner radii, no token**

- Problem: radius is typed by hand at each call site, and the user's 칸 모서리 setting changes the chart but not the controls beside it.
- Evidence: literal radii in `src`: 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, size × 0.28, 8, 10, 12, 16 (grep `borderRadius`); `src/theme` has no radius scale. One sheet (`ko-xa-editor-habit.png`) shows 16 (close circle), 6 (chips), 4 (day cells), about 6 (22pt check), 12 (button). 칸 모서리 (`light-settings.png` y≈1465–1650) drives only `frameRadius` in `theme/chart.ts`.
- Fix: `theme/radius.ts`: mark 2 (≤12pt), control 6 (20–44pt), button 12 (≥48pt), sheet 16, chart 0 or frame. Control radius follows 칸 모서리 (6 ↔ 2).

**CI-15 · Editor, quick add, import · Inputs: placeholder equals value, one boxed outlier**

- Problem: empty and filled fields look the same, focus is marked in a colour that barely reaches 3:1, and one textarea ignores the underline family.
- Evidence: `placeholderTextColor={M.sub}` in all nine inputs (`CellEditor.tsx:554, 922`, `QuickAdd.tsx:110`, `Onboarding.tsx:169`, `Today.tsx:587`, `ActionSheet.tsx:526`, `WeekRitual.tsx:390`, `YearClose.tsx:315`, `BackupImport.tsx:181`). `ko-xa-editor-count.png` y≈588–695: "권·km·만 원" (placeholder), "1" and "0" are the same grey; only the focused "12" is ink. Focus underline is gold, 3.10:1 (y≈560). `ko-xk-import.png` y≈642–752: a boxed textarea, radius 8, 1.19:1 border.
- Fix: one `Field`: value ink 16/600; placeholder at ink 55% (`#89857F`) and always phrased "예) …" as onboarding does; focus = 1.5pt ink underline; error = `alertInk` underline plus message. The import textarea becomes ruled lines like 메모 (`light-action-sheet.png` y≈1500–1650).

**CI-16 · All sheets · The handle is nearly invisible, and a tap on it closes the sheet**

- Evidence: `common.tsx:468`: 36×4pt, radius 2, `M.line` (1.19:1); `light-action-sheet.png` x≈390, y≈440. Tap closes: `common.tsx:390-391`.
- Fix: 36×5pt at ink 25% (`#C7C4BF`, 1.65:1). Touch: drag only. Keep the accessibility action for screen readers.

**CI-17 · App-wide · Nine icon sizes and seven stroke values**

- Problem: icon weight drifts between places, and the active tab glyph visibly swells.
- Evidence: 23 `<Icon>` call sites use sizes 10, 13, 14, 15, 16, 18, 20, 22, 24 and strokes 1.8, 1.9, 2, 2.1, 2.2, 2.4, 2.6 (grep), so the rendered stroke runs from 1.27px (chevR 16 at 1.9) to 2.1px (active tab 24 at 2.1). Active tab: `sw={on ? 2.1 : 1.8}` (`Root.tsx:711`); in `light-tab-today.png` the "오늘" glyph (x≈545, y≈1608) is fatter than its neighbours.
- Fix: three sizes (16 inline, 20 row, 24 bar and header) with a fixed stroke table (2.4, 2.0, 1.75 in 24-unit terms, about 1.6–1.75px rendered). `Icon` takes `size: 'sm' | 'md' | 'lg'` and no free stroke prop.

## Target kit (what the fixes add up to)

| Part | Spec | Replaces |
|---|---|---|
| Check | 24 / 20pt, edge ink 70%, pen tick that overshoots, leading edge | 5 sizes, right-side checks |
| Choice row | trailing ink tick, no box | checkbox-as-radio |
| Segment | ruled track, ink-filled selection | TextTabs, underline segments, toggle chips, rating boxes |
| Button | L 52 / S 32; primary ink, secondary outline ink 55%; disabled 35% | gold slab and 5 ad hoc geometries |
| TextAction | ink 15/700 + chevron icon; quiet underlined variant | 7 link styles, grey actions |
| Disclosure | one chevron icon, `M.sub` | "›" "‹" "⌄" in strings, faint chevrons |
| Field | ink value, 55% placeholder, ink focus rule | 9 hand-styled inputs |
| Press | row / control / icon recipes | 108 Pressables, 8 opacities |
| Tokens | radius 2 / 6 / 12 / 16; lines `rule` and `edge`; icon sm / md / lg | 14 radii, 1 line colour, 9 icon sizes |
| Icons | 5 own tab glyphs + 8 area glyphs on screen; SF Symbols for system verbs on iOS | stock Lucide |

## Verification

Second pass, 2026-11-14. Every cited screenshot was opened (with enlarged crops where size or colour mattered), every cited code line was read, and the contrast ratios and grep counts were recomputed.

Result: 16 of 17 findings confirmed, 1 overstated (CI-15), none wrong, none unchecked.

Caveat on the evidence base: both screenshot folders are react-native-web renders (the gold focus underline comes from `src/lib/webStyle.ts:16`; Settings shows "iPhone·iPad 앱에서 쓸 수 있어요" rows). Nothing native was looked at: widgets, the Live Activity, system alerts, pickers, the keyboard, the real tab bar on a device. See M4.

### Verdicts

| ID | Verdict | Note |
|---|---|---|
| CI-01 | confirmed | `Root.tsx:739-753` is as quoted (28pt, radius 7, 1.6pt dashed ink, 16pt plus, grey label). All four reuse sites exist. Stronger than stated: on Home two dashed plus boxes with different actions are visible at once (`light-tab-dashboard.png` y≈1395 opens the pick sheet, y≈1608 opens quick add). On the fix: a filled square in the centre slot is still an action inside a navigation bar, and on iPad the phone bar is reused as a ~450px cluster in a 1376px strip (`ko-ipad-1376x1032.png` y≈990). Consider moving the action out of the bar, and read the Expo SDK 56 native tabs docs before rebuilding a custom one. |
| CI-02 | confirmed | All six idioms are in `ko-xa-editor-habit.png`; `RadioRow`, `PrintSheet`, `KindBits` are as cited; `SegmentedControl` has two call sites, both `underline`. Corrections: the editor's radio check is 20pt (`CellEditor.tsx:886`), not 22. The three 10pt guide boxes tick themselves ("무엇을" is ticked in the shot), so they read as tiny checkboxes. The day picker's off state also uses `M.line` (`DayPicker.tsx:63`). |
| CI-03 | confirmed | The text-action evidence holds. The headline is too broad: checks, the gold button, chips and tabs do read as controls. Corrections: the grey actions are 12.5pt ("마감 없애기", `CellEditor.tsx:999`), 13pt ("고르기") and 14pt ("템플릿으로 시작하기", `Onboarding.tsx:238`), so there are more than seven styles. The Board "시작" is a label, the whole row is the target (`TodayModes.tsx:669`), and the next stage shows "끝내기" in ink 13/800: one control, two styles. |
| CI-04 | confirmed | Lucide shapes unchanged per `LineIcons.tsx:2-7`; `Share2` at `:155`; tab icons at `Root.tsx:81-85`. `GridMark` has two call sites (`ErrorBoundary.tsx:92`, `Settings.tsx:405`). Add: the only entry to Settings is Lucide sliders-horizontal, a filter glyph (`light-tab-dashboard.png` x≈718, y≈60; `Dashboard.tsx:142`). |
| CI-05 | confirmed | No screen renders an area glyph; the icon keys only travel through data. Ratios recomputed (1.04, 1.12). These are lightness ratios: the pairs differ by hue alone, which is what fails at 7pt and for colour-blind users. |
| CI-06 | confirmed | `Check` sizes in use are 28, 26, 24 (`PickToday.tsx:22`), 22, 20: five without the 10pt guide box, which is a separate drawing. Radius × 0.28 and the 55% ink border are as cited (crop of `light-tab-today.png` x≈40-92). Side swap and the two meanings in the action sheet are visible. |
| CI-07 | confirmed | Ratios recomputed (4.59, 3.10, 2.46, 1.19). Disabled and quiet differ only in label colour (`M.faint` vs `M.sub`). One more geometry: 54pt on onboarding (`Onboarding.tsx:228`). Gold is only the default accent; see M5. |
| CI-08 | confirmed | All cited uses of `M.line` as a control edge are real. WCAG 1.4.11 does not strictly require a boundary where a text label identifies the control, so for chips this is a craft failure; for the icon-only steppers and the textarea it is both. |
| CI-09 | confirmed | `Pressy` has one call site. I count 106 `<Pressable` (not 108) and the same eight opacity values with the same counts. Row press is 1.10:1. |
| CI-10 | confirmed | Two detail errors: the "›" in the year shelf and sheet is grey `M.sub` 18/700 (sampled `#6F6657`; `YearShelf.tsx:146`, `YearSheet.tsx:160`), not ink; the expanded mark is that same "›" rotated 90°, not a typed "⌄". More typed chevrons: `YearReview.tsx:159, 387`, `YearSheet.tsx:179`, `Onboarding.tsx:144`. |
| CI-11 | confirmed | In `light-tab-today.png` the first task row starts at y≈455 after title, tabs, counter, ten boxes, index tabs and weekday caption. |
| CI-12 | confirmed | Enlarged crop shows the five states as described; rest days are ~3pt squares in a divider-like tint. The "1x smear" is a capture artefact (devices are 2x/3x) and should not be used as evidence. The 11pt floor is also broken at 9-9.5pt chart cells and the 8pt "done" tag (`FullGrid.tsx:128, 157`) and at 9-10.5pt in `StatsCharts.tsx`. |
| CI-13 | confirmed | As cited. |
| CI-14 | confirmed | 13 literal radii plus computed ones, no token file; `frameRadius` is used by chart components only. |
| CI-15 | overstated | Only the boxed textarea holds as written. (1) Values are ink and placeholders are `M.sub` (`CellEditor.tsx:922, 926`); in `ko-xa-editor-count.png` the grey "1" and "0" are placeholders (`CellEditor.tsx:948-949`), not values. The real defect is the reverse: numeric placeholders at 5.37:1 and weight 600 read as filled-in defaults. (2) The gold focus underline is web-only CSS (`src/lib/webStyle.ts:16`). On iOS quick add uses a 1.5pt ink underline (`QuickAdd.tsx:120`) and editor rows have no focus state (`CellEditor.tsx:661`). The proposed `Field` is still the right fix. |
| CI-16 | confirmed | Add: the pan handlers sit on the handle strip only (`common.tsx:455-456`), about 24pt tall, so that strip is the sheet's only drag surface. |
| CI-17 | confirmed | Nine sizes; strokes 1.8, 1.9 (default), 2, 2.1, 2.2, 2.4, 2.6. |

### Missed in this lens

**M1 · P1 · 만다라트 chart · The chart cell, the signature component, was not audited**

- Problem: a cell carries six micro-marks and the legend explains three. "Today" is drawn five ways across the app.
- Evidence: `light-tab-grid.png`: 4pt gold square at the cell's top left (x≈35, y≈316; white on filled cells; `FullGrid.tsx:162`); 1.5pt gold underline under "이력서 갱신" for due soon (x≈272-344, y≈471; `:145`); pale 2pt partial bars at the foot of done habit cells (x≈106-140, y≈397; `:160`); 2.5pt progress bars on area cells (`:159`); an 8pt gold "done" word (`:157`). Legend at y≈1214 lists 달성 / 영역 이름 / 오늘 only (`:809-834`). `light-grid-zoom.png`: today becomes the word "오늘" plus a 2pt gold bar on the cell's left edge (x≈27, y≈322-592), and the week strip shrinks to ~5pt marks (x≈335-440, y≈570). Elsewhere today is an ink outline box (`WeekStrip`), an ink bar above the tab (`Root.tsx:662`) and an 800-weight weekday letter. The only cue for the core gesture is a grey 12.5pt line shown until the first zoom (`:835-837`).
- Fix: a written cell-mark spec. At 81-cell size, three marks at most: done = area fill, today = one corner tab (the same shape in strips and the tab bar), progress = foot bar on area cells only. Due date and weekly count move to the zoomed cell as text ("D-2", "2/3"). The zoomed cell uses the same 10pt strip as Today rows. The legend lists every mark that is drawn.

**M2 · P1 · Home, Stats, Settings · A row does not say whether it can be tapped**

- Problem: the same ruled row is a static fact, a link, a sheet opener or an expander, and only some links carry a cue.
- Evidence: `light-tab-stats.png` y≈940-1270: "습관", "마음가짐", "집중" are plain Views (`Stats.tsx:339-352`) and look the same as the pressable "10월 5일 – 11일" row at y≈1450 (`Stats.tsx:370-387`, no chevron). `light-tab-dashboard.png`: the "이번 주 중점" rows at y≈640 and y≈745 open the action sheet (`Dashboard.tsx:248-265`) with no cue; "6개 더 있어요" at y≈1298 is a button drawn as a caption. `ko-xh-home-bottom.png` y≈320-740: eight area rows navigate (`Dashboard.tsx:342`) and show only "4/8", while "오늘 할 일 1/10" has a chevron. `LineRow` draws pressable and static rows alike (`common.tsx:810-836`); 13 of its 30 uses pass a chevron.
- Fix: the trailing slot is the contract. Navigates or opens a sheet: Disclosure chevron, always. Toggles: check or switch. Performs: TextAction. Static: nothing, title weight 600, no press state. `LineRow` requires an explicit trailing kind whenever `onPress` is set.

**M3 · P1 · Pick sheet, action sheet, quick add · The "done" check also means "put on today's list"**

- Problem: in the pick sheet the box fills with the area colour and takes the pen tick exactly like a finished task. CI-01's fix (real `Check` for quick-add suggestions) would add a third case.
- Evidence: `ko-xd-pick.png` x≈32, y≈240-575: seven empty 24pt boxes identical to Today's rows (`PickToday.tsx:188`). `light-action-sheet.png`: "오늘 할 일에 담기" uses a 22pt area-colour `Check` for the same "on the list" meaning (`ActionSheet.tsx:440`), beside "이 칸 달성하기" (`ActionSheet.tsx:459`).
- Fix: area fill plus pen tick means completed and nothing else. "On today's list" gets its own control: a leading plus that turns into an unfilled ink-outlined box with a small ink tick, or a trailing small button 담기 / 담김. Use it in the pick sheet, quick-add suggestions and the action-sheet row.

**M4 · P1 · Widgets and Live Activity · The most-seen surface has a third checkbox and was never looked at**

- Problem: the widget draws its own check, area mark and row, and no native surface is in the evidence.
- Evidence: `src/widgets/TodayWidget.ios.tsx:152-158`: 13pt sharp square, 1pt full-ink border, done = a 7pt ink square inside (no tick, no area colour); the area is a 2×11pt bar (`:170`); interactive rows have a 22pt minimum height (`:164-168`). The app: 26pt, radius 7.3, 55% ink border, area fill and pen tick (`Check.tsx:98-121`). Neither screenshot folder holds a widget or Live Activity image.
- Fix: capture the widget families and the Live Activity on a simulator and audit them. Put check geometry, area mark and today mark in one shared spec (`src/lib/marks.ts` is already free of React Native) used by app and widget. Widget rows at least 28pt high, box at least 18pt.

**M5 · P2 · 포인트 컬러, primary buttons, chart marks · Four of five accents are area colours**

- Problem: the accent stops meaning "primary" or "today" once the user changes it, and one option is the danger hue.
- Evidence: `palette.ts:17-23` accents = gold, `#B35A72`, `#478058`, `#5068AB`, `#7E60A8`; the same four are area colours (`palette.ts:8`), and `#478058` / `#B35A72` are also `SEMANTIC.done` / `danger` (`palette.ts:28-31`). `withAccent` copies the accent into `M.gold` (`moods.ts:143-147`), which paints the primary button (`common.tsx:557`), the chart's today square and due underline (`FullGrid.tsx:117, 145, 162`) and the Stats bars (`StatsCharts.tsx:44`). With 연지, "저장" and the destructive "칸 비우기" next to it (`CellEditor.tsx:498`, `#A15166`) share a hue; with 쑥, today marks and Stats bars are the 건강 green. Swatches: `light-settings.png` y≈1250-1330.
- Fix: if the primary button becomes ink (CI-07), the accent is a mark colour only. Offer accents outside the area palette, never the danger hue, and add a test beside `tests/contrast.test.js` that an accent is not an area colour.
