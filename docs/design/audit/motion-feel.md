# Audit: motion, feedback and feel (from code)

Lens: how 만다라트 feels in the hand. Screenshots are static, so this is read from the code: every animation, transition, gesture and haptic.
Bar: Things 3, Structured, Tiimo, Streaks, Toss, NYT Games, and Apple's own sheets and navigation. The question is "would Apple feature this?", not "is it acceptable?".

Evidence base: all of `src/theme/motion.ts`, `src/components/{Pressy,Check,AnimatedNumber,GrowBar,ProgressBar,TodayRow,GridMark,SegmentedControl,MoodRow,Tally,ChartSketch,ChartBoard,Splash,common}.tsx`, `src/lib/{haptics,layoutAnim,useReducedMotion,useSettle,useTodayCheck,overlayQueue}.ts`, `src/navigation/{Root,ui}.tsx`, `src/screens/{FullGrid,Today,TodayModes,Dashboard,Detail,Onboarding}.tsx`, `src/overlays/{ActionSheet,QuickAdd,PickToday,CellEditor,FocusTimer,Celebration,Snackbar,WeekRitual,YearClose}.tsx`, plus 26 screenshots from `/tmp/design-shots` and `/tmp/web-smoke`.

Limits, stated plainly:

- Nothing here was measured on a device. Durations, easings and drivers are facts from the code; "it will feel like X" is a reading of that code.
- The web build cannot show most of this. `animateLayout()` and every haptic return early on web (`src/lib/layoutAnim.ts:9`, `src/lib/haptics.ts:15`), so the screenshot pipeline the team reviews with has never shown row reflow or touch feedback. Motion has had less review than any other part of the design.
- `docs.expo.dev` is not reachable from this session (the host has to be allowed in the session's network settings), so the SDK 56 docs that `AGENTS.md` requires were not read. Library versions below come from `node_modules/expo/bundledNativeModules.json`. Check every API named in a fix against the v56 docs before writing code.

## Verdict

The app has a real motion idea, ink on paper (a tick drawn as a pen stroke, a strike-through, a double ledger rule, a pen circle, 正 tally strokes, stamped cells), and it is built with care: native driver almost everywhere, Reduce Motion and VoiceOver handled better than in most shipping apps.
But the idea lives only in small decorations, while the three things a hand touches hundreds of times a day (moving between screens, pulling a sheet, pressing anything) are hand-rolled in JS with `PanResponder` and instant opacity changes, and they are where it stops feeling like an iOS app: a back-swipe that reveals blank paper and snaps, sheets that pop in 70 pt from their resting place and can only be dragged by a 24 pt strip, and 106 `Pressable`s with eight different dim values against one use of the shared `Pressy` button.
The moments that should pay the user back (a cell of the chart filling in, the day closing, 64/64) are either instant, off-screen or two hairlines and a buzz, so the feel today is "careful and quiet" where the category leaders are "physical and rewarding".

## Strengths to keep

1. **An ownable ink vocabulary.** Tick drawn in one stroke with a per-row ±3° tilt (`Check.tsx:27-33`, `:95`); title struck through left to right after the tick lands (`TodayRow.tsx:76-78`, `:407`); day close as a double ledger rule drawn across the page (`Today.tsx:443-505`, `Dashboard.tsx:480-512`); mood chosen by a pen circle (`MoodRow.tsx:103-110`); 正 strokes per repetition (`Tally.tsx:56-71`); cells stamped in (`FullGrid.tsx:67-81`, `GridMark.tsx:227-263`, `FocusTimer.tsx:366-384`). No competitor has this. Whatever visual direction is chosen next, keep these verbs: draw, strike, stamp, fill.
2. **The tick starts on the frame of the tap.** `useOptimistic` paints the row first and the store write follows in a transition (`TodayRow.tsx:95`, `:141-146`).
3. **Accessibility of motion is exemplary.** One cached Reduce Motion flag read synchronously so no screen flashes (`useReducedMotion.ts:16-51`); every animation has a still end state; checked rows stay under the VoiceOver cursor (`useSettle.ts:29-30`); undo toasts wait for screen-reader users (`Snackbar.tsx:35-38`); focus returns to the opener after a sheet (`common.tsx:311-325`).
4. **Native-driver discipline.** Interpolations are memoised, transforms and opacity run natively, and the dot paper scrolls with the content through a native `Animated.event` with `modulo` (`Root.tsx:263-285`), which costs no JS.
5. **Haptics have an intent model.** Six named functions, `success` reserved for milestones and de-duplicated within 1.5 s (`haptics.ts:4-12`, `Root.tsx:104-111`). The model is right; its use has drifted (M-10).
6. **Snackbar details.** A 1 pt gold fuse shows remaining time, holding a finger on the toast pauses it, and a replaced toast swaps text in place instead of bouncing again (`Snackbar.tsx:117-123`, `:150-162`, `:215-223`; visible in `ko-year-close-done.png`, bottom, gold line under the dark slab).
7. **The zoom starts from the block you tapped.** The 3×3 board grows out of the block's own rectangle (`FullGrid.tsx:636-652`) and the row above keeps a fixed 44 pt height so the table never jumps (`:700`).
8. **Touch-down feedback on the Home chart.** The block under the finger is shaded before release (`GridMark.tsx:269`, `:321-328`).
9. **Small things done right.** Re-tapping the current tab scrolls to top (`Root.tsx:375-379`); scroll position is remembered per tab (`:270-302`); the timer runs on wall-clock time and breathes only on the current box (`FocusTimer.tsx:85-124`, `:191-207`); one modal at a time is guaranteed (`overlayQueue.ts`).

## Inventory: every animation, transition and haptic

Driver: N = native driver, JS = JS thread per frame, none = no animation.

| What | Where | Motion | Driver | Against the best |
|---|---|---|---|---|
| Shared press | `Pressy.tsx:21-43` | scale to 0.97, spring k420 c22 m0.8 (ζ 0.60) | N | Good primitive, used once (`common.tsx:501`) |
| Every other press | 106 `<Pressable>` | instant opacity 0.5 / 0.55 / 0.6 / 0.7 / 0.72 / 0.75 / 0.8 / 0.85, or instant row shade (`common.tsx:46-48`) | none | UIKit fades the highlight out on release; Toss-style apps scale every tappable |
| Check box | `Check.tsx:67-85` | fill = opacity 120 ms; tick = dash offset 170 ms after 60 ms | N + JS | Reads well; no touch-down state, no weight |
| Strike-through | `TodayRow.tsx:394-431` | scaleX from left, 220 ms after 230 ms | N | Good |
| Row reflow | `useSettle.ts`, `layoutAnim.ts` | hold 700 ms per row, then `LayoutAnimation` 280 ms (spring damping 0.82) | native layout | Reminders and Things wait for a pause and move rows together |
| Day close | `Today.tsx:443-505`, `Dashboard.tsx:480-512` | double rule scaleX, 420 ms after 230 ms; success haptic at 650 ms | N | On theme, very quiet |
| Count-up number | `AnimatedNumber.tsx` | 760 ms, `setState` every frame | JS | Used once (`Detail.tsx:148`) |
| Progress bar | `ProgressBar.tsx` | translateX 560 ms on change | N | Used once (`Today.tsx:388`) |
| "GrowBar" | `GrowBar.tsx` | static wrapper | none | Name promises motion that does not exist |
| Mood circle, 正 stroke | `MoodRow.tsx:107`, `Tally.tsx:71` | SVG dash 260 ms | JS | Lovely; JS-driven |
| Cell ink on tab return | `FullGrid.tsx:67-81` | scaleX from left 420 ms, stagger 60 ms | N | Good, but a replay, not a response |
| Mini chart stamp / bloom | `GridMark.tsx:227-263` | scale 0.6→1 + fade, 260 ms, stagger ≤45 ms, spiral order | N | `bloom` used in finale; `fresh` has no caller |
| Chart zoom | `FullGrid.tsx:542-580`, `:636-653` | open 320 ms ease-out, close 220 ms in-out; area switch 220 ms + 24 pt nudge | N | Tap only; no pinch, no finger tracking |
| Screen change | `Root.tsx:316-327`, `:616-627` | new page fades 0→1 in 220 ms and slides 14 pt (tabs) or 28 pt (push) on a spring (ζ 0.56) | N | Not a push: old page is cut, nothing underneath |
| Back swipe | `Root.tsx:332-359` | `PanResponder`, `setValue` per move event | JS → N | Reveals blank paper, snaps on release |
| Tab indicator | `Root.tsx:652-658` | 2×20 pt bar, spring ζ 0.56 | N | Overshoots 12% of travel |
| Segmented underline | `SegmentedControl.tsx:59-67` | spring ζ 0.56 | N | Slides; `TextTabs` and `IndexTabs` do not |
| Sheet | `common.tsx:330-411` | enter: 70 pt rise on spring k170 c20 + backdrop fade; exit: 220 ms ease-in; drag on handle | N + JS | See M-02 |
| Snackbar | `Snackbar.tsx:93-140` | in 180 / 260 ms, out 200 ms, 40 pt travel, linear fuse | N | Good; no swipe to dismiss |
| Focus timer | `FocusTimer.tsx` | system modal fade; current box breathes 1.6 s each way; minute box stamps 260 ms; digits swap twice a second | N | See M-11 |
| 64/64 page | `Celebration.tsx:47`, `:81` | system modal fade; chart blooms over ≤1.8 s, centre last (420 ms) | N | Haptic fires at open, not at the climax |
| Ritual / year pages | `WeekRitual.tsx:79-92`, `YearClose.tsx:89-102` | system slide-up; pages fade + 16 pt from the right | N | Same direction going back; no swipe |
| Onboarding sketch | `ChartSketch.tsx:57-84` | area names reveal 180 ms, stagger 60 ms; caret blink | N | Good |
| Haptics | `haptics.ts` | call sites, roughly: `tap` (Light) 127, `check` (Medium) 17, `select` 16, `uncheck` (Light) 9, `success` 5, `warn` 3 | n/a | Rigid, Soft, Heavy unused; see M-10 |

Screens with no `Animated` code at all: Stats, StatsCharts, Settings, CellEditor, PickToday, WeekStrip, DayPicker, the Year screens, TemplateSheet, EmptyState.

## Findings

### P0

**M-01. Navigation is simulated, and it shows on the first back-swipe.**
Evidence: all seven screens are swapped inside one `ScrollView` (`Root.tsx:400-407`, `:422-446`). A "push" sets the new page to opacity 0 and 28 pt to the right, then fades it in over 220 ms (`:316-327`, `:621`); the page being left is unmounted in the same frame. The left-edge swipe moves the current page with `slide.setValue(dx)` from JS and fades it by `1 - dx/600` (`:347-351`), over nothing, because the previous screen is not mounted. On release past 90 pt it calls `back()` (`:353`), which replaces the page under the finger at +90 pt or more with the previous screen at −28 pt and opacity 0. Tab switches run the same code with a 14 pt offset (`:626`), so every tab change blanks the page and fades it back, and every tab is re-mounted, including all 81 cells of the chart.
Why it matters: the interactive pop is the gesture iOS users make most. Here it shows dotted paper where the previous screen should be and jumps when the finger lifts. Tab bars on iOS switch instantly; a 220 ms fade on the most frequent navigation reads as a web view.
Fix, in two steps:
- Now, without new dependencies: (a) tabs: keep the four tab screens mounted, each with its own scroll view, and switch with no fade and no slide; only the indicator moves. (b) push: slide the deep screen in from the full page width over the tab screen, which stays mounted, shifts −30% and takes an 8% ink dim. (c) back-swipe: drive that same progress value with the finger 1:1, and on release run a spring to 0 or to the page width with the release velocity, calling `back()` in the completion callback, not before.
- Properly: move to native navigation. SDK 56 pins `react-native-screens ~4.26.0` and `expo-router ~56.2.21` (`bundledNativeModules.json:111`, `:76`); neither is installed (`package.json:18-41`). A native stack gives the real interactive pop, and native tabs keep state for free.

**M-02. The bottom sheet, the app's main work surface, does not behave like a sheet.**
Every task runs through `Sheet` (action, quick add, pick, editor, template, share, print, import).
Evidence:
- Entrance: the panel is fully opaque from frame 0 and only travels 70 pt (`common.tsx:401-404`; `enter` starts at 0, `:330`; no opacity on the panel, `:441-452`). A 600 pt sheet appears at once, 70 pt low, then drifts up. It does not come from the bottom edge.
- Drag: pan handlers sit only on the handle strip, 10 + 4 + 10 = 24 pt tall (`:455-469`). The body is a `ScrollView` (`:472-479`), so pulling down on the content rubber-bands inside a sheet that stays put. In `light-action-sheet.png` the handle is the 72×8 px bar at y ≈ 440 px; everything below it is not draggable.
- Physics: the drag is `drag.setValue()` from JS on each move (`:388`). Release ignores velocity: dismissal is a fixed 220 ms ease-in from rest (`:368-371`) and the return spring gets no initial velocity (`:352`), so a flick stalls and restarts. Upward drag is clamped (`Math.max(0, g.dy)`), so there is no rubber band. There are no detents. A leaving sheet cannot be caught (`pointerEvents` none, `:437`).
- Overshoot: the settle spring is underdamped (ζ 0.77, about 2%), so the panel rises 1 to 2 pt above its rest and shows a strip of backdrop under its bottom edge.
Fix:
- Now: enter from the measured sheet height (render once hidden, then spring `height → 0`); critically damped spring, about k 158 / c 25 (0.5 s, no bounce); pass `g.vy` into both the return spring and the dismissal and replace the timing with a spring; accept the pan on the whole header row and, when the inner scroll offset is 0, on the body; let upward drag move at one third of the finger; add a 60 pt same-colour bleed under the panel; fire `selection` once when the drag crosses the dismiss threshold.
- Properly: use native sheet presentation with medium and large detents. `@expo/ui` is already a dependency (`package.json:19`, used only for widgets today) and the installed build ships a SwiftUI `BottomSheet` with `presentationDetents`, `presentationDragIndicator` and `interactiveDismissDisabled` (`node_modules/@expo/ui/build/swift-ui/BottomSheet/index.d.ts`, `modifiers/presentationModifiers.d.ts:24-66`). The alternative is a react-native-screens `formSheet`. Read the v56 docs for either before building on it.
- With detents, open the action sheet at medium: in `light-action-sheet.png` the main control, 오늘 했어요, sits at y ≈ 740 px of 1688 (370 pt from the top), outside the thumb zone, while the bottom 250 px is an empty memo field.

### P1

**M-03. Press feedback is not a system.**
Evidence: `Pressy` says it "unifies the fingertip feel of the whole app" (`Pressy.tsx:16-19`) and is used once, for the close button (`common.tsx:501`). The other 106 `Pressable`s switch instantly between 1 and one of eight opacities (0.5 ×26, 0.6 ×16, 0.55 ×4, 0.85 ×3, 0.7 ×2, 0.8, 0.75, 0.72) or one of three shades (rows 5%/9% ink `common.tsx:46-48`, chart cells 7% `ChartBoard.tsx:32-34`, mini chart 10%/14% `GridMark.tsx:325`). The primary button dims to 0.85 (`common.tsx:582`). The checkbox, the most pressed control in the app, has no pressed style at all (`TodayRow.tsx:323-335`): nothing happens until the finger lifts.
Fix: one `Touchable` with three variants and nothing else allowed. Row: ink shade in at once, fades out over 180 ms on release. Button: scale 0.97 on the existing `SPRING.press` plus a 6% ink overlay. Icon: opacity 0.5 in at once, 150 ms out. Checkbox: scale to 0.92 on touch-down and darken the border; on release, scale back as the fill and tick run.

**M-04. Moving from one overlay to the next is a hard cut and a 380 ms hole.**
Evidence: "25분 집중하기" calls `startFocus` (`ActionSheet.tsx:443`), which sets the sheet state to null (`ui.tsx:281-284`), so the sheet is removed in one frame without its exit animation. The timer is queued behind `OVERLAY_GAP = 380` (`overlayQueue.ts:14`), then fades in. Sheet to editor and sheet to area screen do animate out (`ActionSheet.tsx:69-70`) but wait the same gap: 220 ms out, 380 ms of nothing, then the next sheet.
Why: starting to focus and editing a cell are core flows, and each begins with more than half a second where the app appears to have dropped the tap.
Fix: host sheets, timer and finale in one in-tree overlay layer, not separate RN `Modal`s, so content can cross-fade or the timer can grow from the row that started it. At the very least route `startFocus` through the sheet's `dismiss()`.

**M-05. Checked rows leave on separate 700 ms timers, so the list moves under the thumb.**
Evidence: `useSettle` keeps one timer per row (`useSettle.ts:21-44`). Check three rows half a second apart and the first leaves at 700 ms, shifting every row below it up by about 56 pt while the finger is travelling to the next box.
Fix: one shared timer. Restart it (about 1200 ms) on every check and on any touch-down in the list; when it fires, release all held rows in a single 320 ms layout transition.

**M-06. Lists have no direct manipulation.**
Evidence: the only `PanResponder`s are the sheet handle, the back-swipe, and two release-only swipes (`common.tsx:385`, `Root.tsx:342`, `FullGrid.tsx:619`, `Detail.tsx:103`). Today rows have no swipe actions; removing a typed to-do is a 28 pt × button (`TodayRow.tsx:291-303`). Order cannot be changed by hand. "보드" is three stacked groups advanced by tapping (`TodayModes.tsx:478-493`; `ko-xd-board.png` shows "시작" as text at the right of each row and the hint 누를 때마다 다음 단계로 옮겨요).
Fix: with `react-native-gesture-handler ~2.31.1` and `react-native-reanimated 4.3.1` (the SDK 56 pins): swipe right on a row to check (the tick draws as the finger crosses 72 pt, `selection` at the threshold), swipe left for 내일로 and 지우기; long-press to lift and reorder (scale 1.02, Medium impact on lift, `selection` per slot); on the board, drag between groups. If a board cannot be dragged, do not call it a board.

**M-07. The chart zoom, the signature interaction, is tap-only and its gestures fight iOS.**
Evidence: open and close are timed curves (320 / 220 ms, `FullGrid.tsx:552`, `:562`); there is no pinch. Swiping between areas does nothing until release, then swaps content and nudges it 24 pt (`:568-580`, `:619-626`). A rightward swipe from the left screen edge, the iOS "back" motion, is taken as "previous area" (`gridMemory.ts:51-55`; no edge exclusion in `FullGrid.tsx:620`, unlike `Detail.tsx:104`). The only way out is the 81칸 전체 text button at top-left, x 40–195 px, y 240–278 px in `light-grid-zoom.png`, while the lower 380 px of that screen is blank paper. The whole table fades (`:653`); neighbouring blocks do not move, so it reads as a card appearing, not as moving closer to the paper.
Fix: (1) a camera zoom: scale the whole 9×9 table ×3 around the tapped block on a spring (about 0.42 s, no bounce) so the neighbours leave the frame, cross-fading to the detailed board at about 60%; (2) pinch-in on the board and left-edge swipe both return to 81 cells, tracking the fingers; (3) the eight areas become a real horizontal pager that follows the finger, with `selection` when a page settles; (4) put prev / 81칸 / next in the empty band under the board.

**M-08. Actions do not visibly cause results; the animations already written are not wired up.**
Evidence:
- A cell turning "done" on the 3×3 board is an instant background swap (`ChartBoard.tsx:232`, `:251`).
- The Home chart never stamps a newly done cell: `MiniChart` has a `fresh` mode (`GridMark.tsx:164-165`, `:227-241`) and no caller passes it (`Dashboard.tsx:172-180`).
- The Today numeral (34 pt, `Today.tsx:352`) and its tally boxes (`:376-386`; "1 / 10" and the row of ten squares in `light-tab-today.png`) change in one frame.
- The count sheet's 34 pt number and bar jump on +1 (`ActionSheet.tsx:282-288`, `KindBits.tsx:52-58`).
- `AnimatedNumber` and `ProgressBar` each have one use; `GrowBar` animates nothing.
Fix: one causal chain per check: tick (0–230 ms) → the tally box stamps (120 ms) → the numeral rolls one step (200 ms, vertical slide, tabular figures) → on Home the matching cell of the mini chart stamps in the area colour (pass `fresh`). On the board, ink-fill the cell from the left in 320 ms as the sheet goes down. Roll the count sheet's number and slide its bar with `ProgressBar`.

**M-09. The peak moments are under-directed.**
Evidence: finishing the day is two 1 pt rules drawn over 420 ms and one success haptic (`Today.tsx:443-505`; the result is the double line above "10월 14일 수요일 마감 1 / 1" in `ko-xh-closed.png`). 64/64 is a system fade to a page with a static 72 pt "64/64" (`Celebration.tsx:63`), a bloom, one haptic at the start and not when the centre cell lands (`Root.tsx:212-214` against `GridMark.tsx:238-241`), and a text button "닫기" (`Celebration.tsx:93-102`). Saving the weekly review and starting a new year each get a Light tap and a toast (`WeekRitual.tsx:110`, `YearClose.tsx:109`).
Fix: stay on paper, but give the moments weight. Day close: after the rules, a date stamp (도장) lands at the right end: scale 1.15→1 and −6°→−3° in 140 ms, ink opacity 0→1 in 90 ms, Rigid impact on contact, Success 120 ms later. 64/64: count 63→64, Light ticks as each ring of the spiral fills, Heavy when the centre cell stamps, then Success; add a share action next to 닫기. Weekly review saved and year started: Success, and the same stamp.

**M-10. Haptics are flat and overused.**
Evidence: `tap()` (Light impact) has about 127 call sites, including plain navigation (`Dashboard.tsx:417`, `:454`; `Stats.tsx:88-152`); tab changes fire `selection` (`Root.tsx:381`). `check()` (Medium) is also used for starting focus (`ActionSheet.tsx:443`), postponing (`:327`) and adding to today (`QuickAdd.tsx:89`), so it no longer means "checked". Rigid, Soft and Heavy exist in expo-haptics (`node_modules/expo-haptics/build/Haptics.d.ts:13`) and are unused.
Fix: remove haptics from navigation, tab changes and sheet opening. Then:

| Event | Now | Proposed |
|---|---|---|
| Check | Medium | Rigid |
| Uncheck | Light | Soft |
| Value change (segment, day, score, mood, pager settle, drag threshold) | selection / Light | selection |
| Long-press recognised, row lifted | Light | Medium |
| Blocked or invalid | Warning | Warning + 6 pt horizontal shake of the field |
| Milestone (day close, area 8/8, goal reached, focus done, week saved, year started) | Success, or Light | Rigid on stamp contact, then Success |
| 64/64 | Success at open | Light per ring, Heavy at centre, Success |

**M-11. The focus timer ends silently and barely moves.**
Evidence: at 25:00 in the foreground the only signal is one success haptic and a text change (`FocusTimer.tsx:183-188`); sound exists only on the background notification (`notifier.native.ts:96`). A phone lying on the desk will not be noticed. Within a minute the only motion is an opacity breath on one 40 pt box (`:191-207`, `:385`). Pausing dims the digits in one frame (`:264`). "끝내고 했어요" marks the action done with no haptic and no visual (`:224-230`). Layout, from `light-focus-timer.png` (captured mid-fade: the chart and tab bar show through, although the code sets an opaque background, `:249`): a 56 pt clock (the same size as Home's date) over a 200 pt grid, neither dominant; the task name is 17 pt and sits below the grid at y ≈ 1047 px; 180 pt of empty dark above and below.
Fix: make the 5×5 the hero at about 300 pt wide; fill the current box from the bottom over its 60 seconds (one linear native-driver scaleY) so seconds can be read from it; put the task name above the grid at 22 pt; at the end, stamp all 25 boxes in a 600 ms sweep, play a short chime that respects the silent switch (`expo-audio ~56.0.13` is the pinned version), and fire three haptic pulses; give the finish button the check haptic and let the tick draw before the screen leaves.

**M-12. Onboarding ends with a hard cut.**
Evidence: "시작하기" writes the document and `RootView` returns a different tree (`Onboarding.tsx:77-82`, `Root.tsx:389-398`). The 300 pt sketch with the goal just typed (`ko-xi-onboarding.png`, the 3×3 at y 247–547) disappears and Home appears with a 132 pt chart in another place. No transition runs because `ui.screen` did not change (`Root.tsx:316-327`).
Fix: a 600 ms hand-off: the sketch scales and moves to the Home chart's position while its centre cell becomes the gold core cell, the eight area names turn into colour blocks clockwise (the 60 ms stagger already exists, `ChartSketch.tsx:25-26`), then the rest of Home fades up. Success haptic when the core cell lands.

**M-13. Adding a to-do gives no confirmation.**
Evidence: `submit` fires a Light tap, adds the item and dismisses (`QuickAdd.tsx:80-86`, `:185-191`). There is no toast (only the "pick an existing action" path has one, `:92`), no highlight and no scroll. On Home only three rows show (`Dashboard.tsx:391`), so the new item lands under "6개 더 있어요" and the only change on screen is 1/10 becoming 1/11.
Fix: as the sheet goes down, scroll the list to the new row and let it write itself in: the row's height opens in 200 ms, the text fades in, and a 6% ink wash on the row fades over 900 ms. On Home, show the new row in the visible three for that session.

### P2

**M-14. Spring tuning and token drift.**
`SPRING.snappy` (k260 c18, ζ 0.56) overshoots 12%. On the tab indicator that is 9 pt past the neighbouring tab and about 38 pt on 홈→통계 at 390 pt width, which pushes part of the 20 pt bar past the screen edge (`Root.tsx:657`). The same spring wobbles every screen change by about 3 pt (`:325`). Apple's own "snappy" preset is, as I recall from WWDC23 "Animate with springs", about ζ 0.85, with a warning against going much bouncier in UI. `SPRING.bouncy` has no user. More than twenty durations are declared outside `motion.ts` (120, 160, 170, 180, 200, 220, 260, 280, 420, 460 …), in thirteen files. Fix: indicators k322 c32 (0.35 s, slight bounce); screen and zoom k224 c30; sheet k158 c25; stamp k195 c19.5 (0.45 s, visible bounce, celebrations only). Move every duration into `motion.ts`.

**M-15. Pen strokes and the counting number run on the JS thread while the store is writing.**
The tick (`Check.tsx:71-73`), the mood circle (`MoodRow.tsx:107`) and the 正 stroke (`Tally.tsx:71`) animate `strokeDashoffset` from JS, and `AnimatedNumber` calls `setState` per frame (`AnimatedNumber.tsx:31`), in the same moment as the document update, persistence and widget sync. Fix: reveal a static stroke with a native-driven clip (a wrapper with `overflow: hidden` whose width animates through scaleX, as the strike-through already does), or move them to Reanimated animated props.

**M-16. Selection indicators disagree.**
`SegmentedControl` slides its underline; `TextTabs` and `IndexTabs` jump (`common.tsx:667`, `:725`), although they look the same (목록 · 연속 기록 · 보드 in `light-tab-today.png`). Tab-bar icons change weight and colour in one frame (`Root.tsx:711-716`). Fix: one sliding underline for all three; cross-fade the tab icon over 120 ms.

**M-17. Paging inside flows.**
Weekly review and year close pages enter from the right even when going back (`WeekRitual.tsx:88-92`, `YearClose.tsx:98-102`) and cannot be swiped. Area-to-area paging on the detail screen is release-only (`Detail.tsx:101-112`). Fix: direction-aware offset (±16 pt) now; a finger-tracked pager with the gesture library.

**M-18. Possible one-frame flash on every screen change.**
The page is set to opacity 0 in a passive effect after the new screen has committed (`Root.tsx:316-322`). The team met the same problem in `ChartSketch` and fixed it with a layout effect (`ChartSketch.tsx:56-60`). Fix: `useLayoutEffect` here too; check on device with slow animations.

**M-19. Reduce Motion turns sheets into cuts, and the scrim is the wrong temperature.**
With Reduce Motion on, `enter` starts at 1 and the backdrop appears at once (`common.tsx:330`, `:342`, `:364-367`). iOS replaces slides with cross-fades; it does not remove them. Fix: 150 ms opacity fade for panel and backdrop. Separately, the scrim is `rgba(12,9,22,0.46)` (`common.tsx:428`), a cool violet over warm paper; in `light-action-sheet.png` the dimmed page reads as grey-lavender beside the cream sheet. Use the ink: `rgba(43,38,32,0.40)`.

**M-20. Smaller gaps.**
Snackbar cannot be swiped away (`Snackbar.tsx:184-190`). Editor fields appear and vanish instantly when the type changes, so the sheet height jumps (no `Animated` or `animateLayout` in `CellEditor.tsx`). The primary button goes from outlined to filled in one frame (`common.tsx:552-565`; compare `light-quick-add.png` with `ko-xd-quick.png`). Paper and accent changes in Settings repaint the whole app with no cross-fade. Long-press (380 ms, `ChartBoard.tsx:29`) gives no sign until it fires.

## Moments with no feedback today

| Moment | What happens now | Evidence |
|---|---|---|
| Finger lands on a checkbox | nothing until release | `TodayRow.tsx:323-335` |
| A cell becomes done on the board | colour swaps in one frame | `ChartBoard.tsx:232`, `:251` |
| A cell becomes done, seen from Home | mini chart repaints in one frame | `Dashboard.tsx:172-180` |
| Today count goes up | numeral and tally box swap | `Today.tsx:352`, `:376-386` |
| Count +1 | 34 pt number swaps, bar jumps | `ActionSheet.tsx:282-288` |
| To-do added | sheet closes, nothing points to the new row | `QuickAdd.tsx:80-86` |
| Past day back-filled in the week strip | box swaps (haptic and toast only) | `ActionSheet.tsx:220-224`; no `Animated` in `WeekStrip.tsx` |
| Focus session finished by button | action marked done silently | `FocusTimer.tsx:224-230` |
| Timer reaches 25:00 in foreground | one haptic, no sound | `FocusTimer.tsx:183-188` |
| Timer paused | digits dim in one frame | `FocusTimer.tsx:264` |
| Sheet dragged past the dismiss point | nothing | `common.tsx:389-393` |
| Onboarding completed | hard cut to Home | `Root.tsx:389-398` |
| Weekly review saved, new year started | Light tap + toast | `WeekRitual.tsx:110`, `YearClose.tsx:109` |
| Editor validation fails | Warning haptic + text, field does not move | `CellEditor.tsx:327-331` |
| Tab selected | icon swaps weight and colour instantly | `Root.tsx:711-716` |

## Layout notes on the three static shots

- **Action sheet** (`light-action-sheet.png`, 780×1688 @2x): sheet top at y ≈ 415 px, about 75% of the screen. Primary action 오늘 했어요 at y ≈ 740 px, too high for a thumb. Two near-identical empty squares mean different things: the 56 px box at left ("did it today") and the 44 px box at right of 이 칸 달성하기 ("achieve this cell for good"). The bottom 250 px is an empty ruled memo. A medium detent with the check row near the bottom edge fixes the reach (M-02).
- **Focus timer** (`light-focus-timer.png`): see M-11. Clock 56 pt at y 430–530 px, grid 400 px square at y 583–983 px, buttons at y 1163–1265 px.
- **Quick add** (`light-quick-add.png`, `ko-xd-quick.png`): sheet top at y ≈ 765 px without a keyboard. On device the field has `autoFocus` (`QuickAdd.tsx:111`), so the 70 pt entrance and the keyboard lift are two separate movements; check on device. Three jobs share the sheet (type, choose an area, pick an existing action). A notebook-true alternative is to write on the next empty line of the Today list, with area chips above the keyboard.

## Order of work

Without new dependencies (each is days, not weeks): M-02 entrance, velocity and bleed; M-03; M-05; M-08; M-09; M-10; M-11 end signal; M-12; M-13; M-14; M-16; M-18; M-19.
With `react-native-gesture-handler`, `react-native-reanimated` and `react-native-screens` (the SDK 56 pins): M-01 properly, M-02 detents and body drag, M-04, M-06, M-07, M-15, M-17.
If only three things are done before 1.0: the sheet (M-02), the back-swipe and tab fade (M-01), and one press primitive (M-03). These three account for most of what a hand feels in a session.

## Verification

An independent pass over every finding above. Each cited file and line was opened, the counts were re-run with grep, and the cited screenshots were opened and measured (`light-action-sheet`, `light-grid-zoom`, `light-focus-timer`, `light-tab-today`, `light-tab-dashboard`, `light-quick-add`, `light-tall-settings`, `ko-xd-board`, `ko-xd-quick`, `ko-xh-closed`, `ko-xi-onboarding`, `ko-xa-editor-habit`, `ko-xa-editor-count`).

Same limits as the audit: nothing was run on a device, and `docs.expo.dev` was not read, so every API named in a fix still has to be checked against the v56 docs.
One limit the audit understated: both capture scripts force Reduce Motion (`tools/design-shots/capture.js:47`, `scripts/web-smoke.js:110`, `reducedMotion: 'reduce'`), so no screenshot the team reviews can ever show an animation. Motion needs its own review path (simulator screen recordings of the sheet, back-swipe, check and zoom).

Result: 19 confirmed, 1 overstated, 0 wrong, 0 unchecked. The code facts are accurate almost to the line; the corrections below are about scope and severity.

| ID | Verdict | Note |
|---|---|---|
| M-01 | confirmed | Seven screens swapped in one `ScrollView` (`Root.tsx:400-407`), `fade.setValue(0)` + 220 ms + spring (`:316-327`), 14 / 28 pt offsets (`:616-627`), `back()` on release with no completion animation (`:353`), no navigation library in `package.json`; pins at `bundledNativeModules.json:76,111` are right. Two things to add to the fix: removing the fade exposes the scroll restore, which runs one frame late in `requestAnimationFrame` (`:288-302`); and React 19.2.3 is installed and exports `<Activity>`, which may be the cheap way to keep four tabs mounted without re-rendering hidden ones (verify on RN 0.85). |
| M-02 | confirmed | 70 pt entrance with no panel opacity, 24 pt handle strip, JS `setValue` drag, 220 ms timed exit, return spring without velocity, clamp at 0: all as cited. Two sub-claims are weaker. "Outside the thumb zone": 오늘 했어요 at 370 pt of 844 is mid-screen, a stretch but reachable. The backdrop strip is 2.3% of 70 pt = 1.6 pt for about 100 ms: real, close to invisible. Missed: a tap on the handle strip dismisses the sheet (`common.tsx:386`, `:391`), which no iOS grabber does. Caveat on the native fix: `@expo/ui` is excluded on Android (`package.json` autolinking) and has no web build, so the JS sheet has to stay as a fallback; prototype RN `TextInput` + keyboard inside the SwiftUI host before committing. |
| M-03 | confirmed | Counts reproduce exactly: 0.5 ×26, 0.6 ×16, 0.55 ×4, 0.85 ×3, 0.7 ×2, 0.8, 0.75, 0.72; `Pressy` used once. (The 106 includes one false grep hit, `<PressableProps`; 105 real plus 2 `APressable`.) The checkbox is nested in the row `Pressable`, so the row shade does not show either while the box is held. |
| M-04 | confirmed | `startFocus` → `setSheet(null)` (`ui.tsx:281-284`); gap 380 (`overlayQueue.ts:14`). Worse than stated on sheet → 영역 상세: no modal follows, it is plain navigation, yet it still waits 220 + 380 ms (`ActionSheet.tsx:70`). That gap can go to zero today. |
| M-05 | confirmed | One timer per row key, each with its own `animateLayout` (`useSettle.ts:21-44`). Row pitch measures 55 pt in `light-tab-today.png` (rows at y 510 / 620 / 730 px @2x). |
| M-06 | confirmed | Only four `PanResponder`s in `src`. One detail: the × is 28 pt drawn but has `hitSlop 12`, a 52 pt target, so the gap is the missing gesture, not the size. Reordering is more than a gesture: today's order is computed (`orderedTodayItems`), so it needs an order field in the document. |
| M-07 | confirmed | Timings, release-only swipe, table fade and screenshot coordinates all check out (button x 40-195, y 240-278 px; board ends y ≈ 1180, tab bar starts y ≈ 1562, 382 px blank). "Fights iOS" is slightly strong: 만다라트 is a tab, so there is no system back to hijack, and the zoom layer starts 11 pt in from the edge (`GridScreen.tsx:87`). The real issue is that an edge swipe steps to the previous area where a user expects it to return to 81 cells. |
| M-08 | confirmed | `ChartBoard.tsx:232,251` instant swap; `MiniChart` `fresh` has no caller; `CountBar` is a static width % (`KindBits.tsx:52-58`); `AnimatedNumber`, `ProgressBar` one use each. |
| M-09 | confirmed | `Celebration.tsx:47,63,93-102`; `Root.tsx:212-214`; `tap()` on review save and year start. See M2 below for a worse problem on the same page. |
| M-10 | confirmed | `tap()` has 127 call sites (128 grep hits minus the definition). Medium `check` on focus start, postpone and add-to-today as cited. |
| M-11 | confirmed | Screenshot numbers match (clock y 430-530, grid 400 px at y 583-983, task name y ≈ 1047, buttons y 1163-1265; about 187 pt of empty dark above and below). At 25:00 the last box also stamps, so it is haptic + text + one 40 pt box. See M5 for a larger problem with the timer. |
| M-12 | confirmed | Sketch is 300 pt at y 247-547 (`ko-xi-onboarding.png`), Home chart 132 pt; the transition effect is keyed on `ui.screen`, which does not change. |
| M-13 | confirmed | `submit` = `tap()`, `addExtra`, `dismiss()`, no toast; `visible.slice(0, 3)` on Home; `1/10` and `6개 더 있어요` visible in `light-tab-dashboard.png`. |
| M-14 | confirmed | ζ = 18 / (2·√260) = 0.558, overshoot 12.1%. 홈 → 통계 is 4 slots × 78 pt = 312 pt, overshoot 37.7 pt, so about 9 pt of the 20 pt bar leaves a 390 pt screen. The page wobble is 3.4 pt on push and pop, 1.7 pt on tab changes. The proposed spring values are self-consistent (ζ 0.89 / 1.0 / 1.0 / 0.70). 33 local durations in 13 files. |
| M-15 | confirmed | Four `useNativeDriver: false` in `src`, exactly the four cited. Unmeasured: the fill is native and only the 170 ms stroke is on JS. A scaleX clip suits the tick and the 正 stroke, not the mood ellipse. |
| M-16 | confirmed | `common.tsx:667`, `:725` render the underline only when selected; `SegmentedControl` (underline variant, used in the editor and share sheet) slides. |
| M-17 | confirmed | `translateX` 16 → 0 in both flows regardless of direction; `Detail.tsx:101-112` is release-only. |
| M-18 | overstated | The pattern is there (`useEffect` then `fade.setValue(0)`), but "every screen change" is too wide. React runs passive effects synchronously when the update comes from a discrete input such as a press, so tab presses and the back button most likely set opacity 0 before the frame is shown. The exposed cases are navigations started from a timer: sheet → 영역 상세 through `afterOverlays` (`ActionSheet.tsx:70`). `useLayoutEffect` is still the right fix; confirm on device. |
| M-19 | confirmed | Reduce Motion path as cited. Scrim measured in `light-action-sheet.png`: the dimmed paper is rgb(142,139,142), a neutral grey with a faint magenta cast, against paper rgb(251,249,244). The ink scrim proposed would give about rgb(168,165,159). A small but visible difference. |
| M-20 | confirmed | The editor sheet top moves from y ≈ 88 pt (habit) to y ≈ 200 pt (count) with no animation, a 112 pt jump; outlined vs filled button visible in `light-quick-add.png` and `ko-xd-quick.png`; no `Animated` in `CellEditor.tsx` or `Settings.tsx`. |

### Missed by the audit

**M1 (P1). Settings has no way back once scrolled.**
The header (back chevron and title) is ordinary content inside the one shared `ScrollView` (`Root.tsx:422-446`; `Header` in `common.tsx:79-165`; no `stickyHeaderIndices` anywhere in `src`). Settings also removes the tab bar (`Root.tsx:410`) and is about 2,520 pt long (`light-tall-settings.png`, captured at 390 × 2600 pt), three screens on an 844 pt phone. Every scroll view hides its indicator (`Root.tsx:431`, `:600`, `common.tsx:476`). Halfway down there is no back button, no tab bar, no title and no scroll indicator: the only exits are the invisible 24 pt edge swipe or scrolling back to the top. The tab bar also disappears and returns in one frame on entering and leaving Settings.
Fix: pin a 44 pt bar outside the scroll view on deep screens (back chevron, and a 15 pt title that fades in once the large title has scrolled under it, with a hairline that appears on scroll). Slide the tab bar down with the push progress, or keep it on Settings. Show the scroll indicator on screens longer than two viewports. A native stack gives all of this for free.

**M2 (P1). The 64/64 page can be lost to one stray touch and cannot be seen again.**
A full-screen `Pressable` closes the page on any touch from the first frame (`Celebration.tsx:52`), while the bloom needs up to 2.2 s (`BLOOM_SPAN` 1800 + `CORE_MS` 420, `GridMark.tsx:41-45`). The page opens 0-380 ms after the user's own tap on the 64th cell (`Root.tsx:200-202`, `ui.tsx` `fireCelebrate`), so a double tap or a second check lands on it. It fires only on the 63 → 64 transition and `fireCelebrate` has a single caller: there is no replay. If the 64th cell is achieved inside the action sheet, the page waits until the user closes the sheet, so the peak is detached from the act.
Fix: ignore touches until the centre cell has landed plus 300 ms; after that close only with the buttons (닫기, 공유). Add a 64/64 다시 보기 row in 통계 or 한 해. When the last cell is achieved in the sheet, dismiss the sheet automatically and open the page.

**M3 (P1). Quick add is one-shot: every to-do costs a full sheet round trip.**
`submit` calls `dismiss()` after one item (`QuickAdd.tsx:80-86`, `:185-191`) and the field uses `submitBehavior="blurAndSubmit"` (`:114`), so the keyboard drops as well. Writing three to-dos in the morning is three times: tab bar ＋, sheet up, keyboard up, type, keyboard down, 220 ms sheet down. Things, Reminders and Todoist keep the composer open: return adds the line and stays.
Fix: on return keep the sheet and keyboard, clear the field, and write the new line into a short list above it (pen-stroke tick, selection haptic, running count). 완료 or a pull down closes. This also gives M-13 its confirmation.

**M4 (P1). A tap means three different things on rows that look alike.**
In 목록 a tap on a chart action opens its sheet and only the 26 pt box checks it (`TodayRow.tsx:307-311`, `:323-335`). On a typed to-do in the same list a tap anywhere on the row checks it (`:309`). In 보드 a tap anywhere advances the stage, including 했어요 back to 할 일, and only a 350 ms long-press opens (`TodayModes.tsx:617-619`); 시작 at the right is plain text that looks like a button while the whole row is the target (`ko-xd-board.png`). A check has no undo toast. The hand cannot learn one rule, and a mistaken tap changes a record silently.
Fix: one grammar everywhere. Tap on the body opens; the box (or a real bordered 시작 button on the board) changes state; swipe is the fast path (M-06); long-press lifts the row. Show a 되돌리기 toast for state changes made from the row body.

**M5 (P1). A focus session cannot be left: closing the screen ends it.**
All timer state lives inside the modal component (`FocusTimer.tsx:81-93`). × calls `record()` then `closeFocus()` with no confirmation and no undo (`:219-222`); unmounting ends the Live Activity (`:159-164`) and the next launch clears any leftover (`:40-45`). During a 25-minute session the user cannot look at the chart or check another item without ending the session, and one stray tap on × at minute 20 discards it; reopening starts at 25:00.
Fix: move the session (end time, paused remainder, cell) into the UI store and persist it. × minimises to a 44 pt 집중 중 12:41 bar above the tab bar (tap to return), with the Live Activity still running. Ending is a separate 그만하기 that asks once after the first minute. Restore the session from the stored end time on relaunch. This is how Structured, Tiimo and Session treat a running timer.
