# Motion, micro-interactions and haptics — reference memo

Research date: 2026-11-14. Scope: how the best apps *feel* (완료 순간, 숫자, 전환, 목록 정리, 당김, 축하, 촉감) and what of that we can build on Expo SDK 56 / React Native 0.85.

How to read the confidence tags used below:

- **[source]** — I read it on a page I fetched in this session (Apple developer pages, GitHub).
- **[search]** — it comes from a search-engine summary of a page I could not open. Treat as secondhand.
- **[recall]** — from my own general knowledge, not checked today. Verify on a device before relying on it.

Research limits that shaped this memo (details in section 7): this session could fetch only `developer.apple.com` and GitHub, and the shared web-search budget ran out after eight queries. The Apple and engineering material is first-hand; the app teardowns (Things, Streaks, Clear, Todoist, Tiimo, Structured, Finch, Opal) are mostly recall and are labelled as such.

---

## 1. Summary

1. **Our motion is careful but timid and partly mis-tuned.** The check-off sequence (fill 120 ms → pen stroke 170 ms → strike 220 ms → hold 700 ms → settle) is already better thought through than most apps. The weak parts are everything around it: transitions are a 14–28 pt fade-slide instead of a real spatial move, gestures are detected on release instead of tracking the finger, and haptics fire on almost every tap.
2. **Three of our four spring tokens sit at or above the bounce level Apple flags for caution.** Converted to Apple's duration/bounce terms, `SPRING.snappy` is bounce 0.44, `SPRING.press` is 0.40 and the unused `SPRING.bouncy` is 0.63. Apple says to start at bounce 0, that 0.3 is already noticeably bouncy, and to be careful above 0.4. A tab indicator that overshoots by 12% contradicts the rule the paper direction wrote for itself in `Check.tsx` ("튀거나 퍼지는 움직임은 없다").
3. **The rule the best sources agree on: bounce only when the finger supplied momentum.** A tap gets a critically damped spring; a flick gets about 80% damping. That one rule would fix most of what feels slightly off.
4. **Frequency decides the budget.** Things done 100+ times a day get no animation; tens of times a day get under 150 ms; rare moments get the "delight budget". We currently spend motion and haptics on frequent things (tab change, row taps) and under-spend on the rare ones (64/64, year close, first chart).
5. **Haptics need a vocabulary, not a sprinkle.** Apple's guidance: use each pattern for its documented meaning, keep a causal link, avoid overuse, make it optional. We use `Light` impact for nearly every tap, `Medium` for a 26 pt checkbox tick, and have no in-app switch.
6. **Reduce Motion should substitute, not delete.** Apple's App Store criteria say meaningful animation should be replaced with a dissolve, highlight fade or colour shift. We mostly `setValue()` to the end state. This matters commercially too: the Accessibility Nutrition Label has a "Reduced Motion" claim we could earn.
7. **Completion can be calm or maximal; both win awards.** Things 3 is the calm pole; (Not Boring) Habits won an Apple Design Award for a checkbox its designer calls "an exercise in more" (hold to check, six or seven layered effects). Our direction should pick a pole on purpose. For a planner used daily, calm per-check plus a strong rare finale is the defensible mix.
8. **Celebrate with the artifact, not with confetti.** Our own chart filling in is the reward. The 64/64 bloom is the right idea; it needs choreography (rhythm, haptic beats, skip) rather than more decoration.
9. **Most of the top 12 moments are feasible today** with built-in `Animated`, `LayoutAnimation`, `expo-haptics` and `react-native-svg`. What is not: drag-to-reorder, pinch on the chart, and truly finger-tracked sheets at 120 Hz. Those need `react-native-reanimated` 4.3.1 + `react-native-gesture-handler` (the versions Expo SDK 56 pins).
10. **Cheap native wins exist already.** `@expo/ui` in SDK 56 exposes SwiftUI's `contentTransition(numericText)`, so the Today widget count and the Live Activity can get system digit rolls without any new dependency.

---

## 2. Where we stand today (honest audit)

Read from the code on 2026-11-14.

| # | Finding | Where | Why it is weak |
|---|---|---|---|
| A1 | Spring tokens are bouncy. `snappy` {damping 18, stiffness 260} = damping ratio 0.56 (bounce 0.44, ~12% overshoot, 0.39 s). `press` {22, 420, mass 0.8} = ratio 0.60 (bounce 0.40). `gentle` {20, 170} = ratio 0.77 (bounce 0.23). `bouncy` {11, 220} = ratio 0.37 (bounce 0.63, unused). | `src/theme/motion.ts`; used by tab indicator, page slide, segmented control, sheet | Apple: default to no bounce; bounce only after a gesture with momentum; above about 0.4 a spring may feel too exaggerated for UI. On a 393 pt wide phone the tab indicator overshoots about 9 pt per tab step. |
| A2 | Screen change = opacity 0→1 (220 ms) + 14 pt (tabs) or 28 pt (push) slide on a bouncy spring. | `src/navigation/Root.tsx` `navOffset` | Reads as a web "fade-up", not as a place you went to. Either commit to a real push (full-width, tracked) or reduce to a plain cross-fade. Tab changes are a 100+/day action and should not slide at all. |
| A3 | Chart block → 3×3 zoom is a 320 ms timed ease-out; close is 220 ms ease-in-out. No pinch, no drag to close. | `src/screens/FullGrid.tsx` | This is the app's signature interaction and it is not interruptible by the finger. Timed curves cannot carry velocity when redirected; springs can. |
| A4 | Swiping between areas in the zoomed 3×3 is recognised only on release (`onPanResponderRelease`); content does not follow the finger. | `src/screens/FullGrid.tsx` `swipe` | Apple, Fluid Interfaces: give continuous feedback; do not detect only at the end. |
| A5 | Sheet: dismiss needs 110 pt or 1.1 pt/ms; release velocity is not handed to the spring; closing is a fixed 220 ms ease-in; dragging up is a hard stop (`Math.max(0, dy)`). | `src/components/common.tsx` | References use about 500 pt/s or 40–50% of travel, hand velocity to the spring, and rubber-band past the edge. Hard stops and ease-in exits are on every "never ship" list. |
| A6 | `tap()` (Light impact) is called on almost every row, link, sheet opener and back action; `select()` on every tab change. | 128 `tap()` call sites; 40 files import `lib/haptics` | Dilutes the check haptic. System navigation does not buzz. HIG: "Avoid overusing haptics." |
| A7 | Check uses `Medium` impact. | `src/lib/haptics.ts` | HIG: Medium = "medium-sized or medium-weight UI objects". A pen tick on paper is small and crisp: `Light` or `Rigid`. |
| A8 | No in-app haptics switch. | Settings | HIG: "Make haptics optional. Let people turn off or mute haptics." |
| A9 | Reduce Motion path jumps to the end state almost everywhere, and sets the row hold to 0 ms so a checked row teleports. | `Check.tsx`, `useSettle.ts`, `Root.tsx`, `FullGrid.tsx` | Apple: keep meaningful feedback as a dissolve/highlight/colour shift. The fill is opacity-only and is safe to keep. |
| A10 | `AnimatedNumber` counts up through intermediate integers over 760 ms via `setState` per frame. | `src/components/AnimatedNumber.tsx` | For 3 → 4 a count-up says nothing, and 760 ms is long. A per-digit roll is the modern pattern and runs on the native driver. |
| A11 | `LayoutAnimation` update uses spring damping 0.82; it is global and cannot be interrupted. | `src/lib/layoutAnim.ts` | Rows wobble slightly when the list closes up; a second check during the 280 ms window cannot retarget. |
| A12 | Focus timer breath is 1.6 s in + 1.6 s out = 0.31 Hz, sustained. | `src/overlays/FocusTimer.tsx` | HIG warns against sustained oscillation, most strongly near 0.2 Hz (written for visionOS, but the comfort logic applies). Keep amplitude tiny and opacity-only. |
| A13 | Good and worth keeping: haptic roles are documented in one file; the day-close `success()` at 650 ms lands exactly when the double rule finishes (230 + 420 ms); milestone haptics are debounced to one per 1.5 s; VoiceOver users keep the row in place. | `haptics.ts`, `Today.tsx`, `Root.tsx`, `useSettle.ts` | This is the "harmony" principle done right. Extend the same discipline to everything else. |

---

## 3. References

### A. Foundations from Apple

#### R1. "Designing Fluid Interfaces" (WWDC 2018) and the sample numbers behind it

What it is: the talk that explains why iPhone X gestures feel the way they do, plus Nathan Gitter's open-source re-implementation, which gives the numbers the talk does not.

What is good, exactly:

- Respond on touch-down, confirm on touch-up: "The button should highlight immediately when I touch down on it… We shouldn't confirm the tap until my touch goes up", with "an extra margin around the tap area". [source]
- Everything redirectable: thought and gesture "happen in parallel"; a launching app can be thrown back home mid-flight. [source]
- Springs described by **damping** and **response** rather than duration; "start with 100% damping, or no overshoot". [source]
- Bounce is a reward for momentum: tapping the Music mini-player opens Now Playing at 100% damping; swiping it away uses 80% "for a little bit of bounce and squish". [source]
- Project momentum to choose where a flick lands; hysteresis before a drag starts "is usually 10 points in iOS"; a double-tap recogniser delays every single tap "by about half a second". [source]
- Sample-code numbers [source: Gitter's Swift files]:
  - Spring conversion: `stiffness = (2π / response)²`, `damping = 4π × dampingRatio / response`, mass 1.
  - Picture-in-picture move: damping 1, response 0.4. Projection: `project(v) = (v / 1000) × d / (1 − d)` with the normal scroll deceleration rate (0.998 [search]), then snap to the corner nearest the projected point. Relative velocity for the spring = `velocity / (target − current)`.
  - Drawer: starts at damping 1, response 0.4; on release with momentum switches to damping 0.8, response 0.3, relative velocity capped at 30.
  - Rubber band: `offset = pow(offset, 0.7)` while dragging; returns with damping 0.6, response 0.3.
  - Calculator key: highlight is instant on touch-down, fades back over 0.5 s ease-out; re-pressing mid-fade snaps the highlight on.
  - Flashlight button: light impact at activation, medium impact at confirmation; return spring damping 0.4, response 0.2.

Sources: https://developer.apple.com/videos/play/wwdc2018/803/ · https://github.com/nathangitter/fluid-interfaces

How we adopt it: rewrite `SPRING` tokens in response/damping terms (section 4.4); make the sheet, the area pager and the chart zoom track the finger and hand velocity to the settle spring; replace distance-only thresholds with projection; rubber-band instead of clamping.

#### R2. "Animate with springs" (WWDC 2023): duration + bounce

What is good, exactly [source]:

- Springs keep velocity continuous when a gesture ends or an animation is retargeted; ease curves cannot start with a velocity.
- Two parameters: perceptual **duration** and **bounce** (−1…1). Bounce 0 is the versatile default; about 0.15 is barely bouncy but feels brisker; about 0.3 is noticeably bouncy; above about 0.4 use caution.
- Choose duration for pacing first, then bounce for character; whether the app is serious or playful should be answered once for the whole app.
- Do not wait for a spring's settling time before the next user-facing change; use the perceptual duration.
- UIKit example: `UIView.animate(duration: 0.6, bounce: 0.2)`.

Note: the page prints the damping formula ambiguously. The physically consistent reading (critical damping at bounce 0, and identical to Gitter's code) is `damping = 4π × (1 − bounce) / duration`.

Source: https://developer.apple.com/videos/play/wwdc2023/10158/

How we adopt it: React Native's `Animated.spring` stiffness/damping/mass model is documented as closely mimicking iOS's `CASpringAnimation` [source: RN docs], so Apple's numbers port directly. See the token table in 4.4.

#### R3. HIG — Motion

Exact guidance worth pinning above the motion tokens [source]:

- "Add motion purposefully… Don't add motion for the sake of adding motion."
- "Aim for brevity and precision in feedback animations."
- "In apps, generally avoid adding motion to UI interactions that occur frequently."
- "Let people cancel motion… don't make people wait for an animation to complete before they can do anything."
- "Make motion optional… supplement visual feedback by also using alternatives like haptics and audio."

Source: https://developer.apple.com/design/human-interface-guidelines/motion.md

How we adopt it: the frequency gate in 4.4; every celebration is skippable by a tap; no animation blocks input.

#### R4. The iOS 18 zoom transition (WWDC 2024)

What it is: the tapped cell morphs into the destination view and the user can grab it at any point, from the start or mid-flight. Apple recommends it for transitions that start from a large cell. Interrupting a push converts it into a pop. Gesture springs: an interactive spring while the finger moves, a final spring on release that carries velocity. [source]

Status in our stack [source]: Expo Router has `Link.AppleZoom` / `Link.AppleZoomTarget` in SDK 55+, marked alpha, iOS 18+, only inside Expo Router's native Stack, with known glitches when screens have headers and a noted delay of about one second on rapid open/dismiss. Reanimated shared element transitions are experimental behind `ENABLE_SHARED_ELEMENT_TRANSITIONS` in 4.2–4.7 (we would be on 4.3.1) and also assume native-stack screens.

Sources: https://developer.apple.com/videos/play/wwdc2024/10145/ · https://raw.githubusercontent.com/expo/expo/sdk-56/docs/pages/router/advanced/zoom-transition.mdx · https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-reanimated/docs/shared-element-transitions/overview.mdx

How we adopt it: we use a hand-rolled navigator, so the system zoom is not available without a navigation rewrite. Do not rewrite before 1.0. Instead copy the *behaviour* in our own zoom (we already scale a block from its slot rect): make it a spring, make it grabbable, and use the same block → destination continuity for chart block → area detail, and Home mini chart → 만다라트 tab.

#### R5. HIG — Playing haptics, and the system vocabulary

Definitions [source]:

| Pattern | Apple's meaning | `expo-haptics` |
|---|---|---|
| Notification success / warning / error | "feedback about the outcome of a task or action" | `notificationAsync(Success / Warning / Error)` |
| Impact light | "collision between small or lightweight UI objects" | `impactAsync(Light)` |
| Impact medium | "medium-sized or medium-weight UI objects" | `impactAsync(Medium)` |
| Impact heavy | "large or heavyweight UI objects" | `impactAsync(Heavy)` |
| Impact rigid | "hard or inflexible UI objects" | `impactAsync(Rigid)` |
| Impact soft | "soft or flexible UI objects" | `impactAsync(Soft)` |
| Selection | "a UI element's values are changing" | `selectionAsync()` |

Best practices [source]: use patterns "according to their documented meanings"; build "a clear, causal relationship between each haptic and the action that causes it"; "match the intensity and sharpness of a haptic with the intensity and sharpness of the animation it accompanies"; "Avoid overusing haptics… Often, the best haptic experience is one that people may not be conscious of, but miss when it's turned off"; "prefer playing short haptics that complement discrete events"; "Make haptics optional."

Related [source]: UIKit generators are impact ("when a user interface object collides with something or snaps into place"), selection, notification, and the newer canvas generator (snapping to guides). SwiftUI's `SensoryFeedback` adds `start`, `stop`, `increase`, `decrease`, `alignment`, `levelChange`, `pathComplete`, and impact with weight/flexibility plus an intensity value. `expo-haptics` exposes none of the newer ones, no intensity and no `prepare()`. It silently does nothing in Low Power Mode, when the user disabled the Taptic Engine, while the camera is active, and during dictation.

Sources: https://developer.apple.com/design/human-interface-guidelines/playing-haptics.md · https://developer.apple.com/tutorials/data/documentation/uikit/uifeedbackgenerator.md · https://developer.apple.com/tutorials/data/documentation/swiftui/sensoryfeedback.md · https://raw.githubusercontent.com/expo/expo/sdk-56/docs/pages/versions/v56.0.0/sdk/haptics.mdx

How we adopt it: the vocabulary in 4.4. Honest caveat: no public source documents which generator Things, Streaks or Todoist call on a check. Anyone who claims to know is guessing. We choose by Apple's semantics and tune on a device.

#### R6. Audio-haptic design principles (WWDC 2019 and 2021)

What is good, exactly [source]:

- **Causality**: it must be obvious what caused the feedback. **Harmony**: "It should feel the way it looks, and the way it sounds." **Utility**: "Don't add feedback just because you can. It can quickly become overwhelming and unpleasant."
- Start haptic, audio and animation in the same function call; latency between them breaks the illusion.
- Apple Pay: two simple taps worked better than a haptic copied from the sound's waveform; sound and haptic may differ in content but share a tempo.
- Imagine the first use, then imagine using the app 100 times, and keep only what still helps.
- Four rapid taps were often felt as three; the first tap acts as a primer that "wakes up the skin".
- A worked example pairs a 500 ms visual with one continuous haptic rather than three transients.

Sources: https://developer.apple.com/videos/play/wwdc2019/810/ · https://developer.apple.com/videos/play/wwdc2021/10278/

How we adopt it: one haptic per semantic event, fired at the frame the visual lands (we already do this for day close). In the 64/64 finale keep beats at least 100 ms apart and expect the first to be half-felt.

#### R7. Reduce Motion: what Apple actually asks for

HIG Accessibility [source]: with Reduce Motion on, reduce "automatic and repetitive animations, including zooming, scaling, and peripheral motion", and:

- "Tightening animation springs to reduce bounce effects"
- "Tracking animations directly with people's gestures"
- "Avoiding animating depth changes in z-axis layers"
- "Replacing transitions in x-, y-, and z-axes with fades to avoid motion"
- "Avoiding animating into and out of blurs"

App Store "Reduced Motion" evaluation criteria [source]: disable or change depth simulation (parallax, animated blur), multi-axis or multi-speed motion, spinning/vortex effects, and ongoing motion such as auto-advancing carousels. Decorative animation may stop entirely. **Meaningful animation should not be removed**: replace it with a motion-reduced alternative such as a dissolve, a highlight fade or a colour shift. Following the system setting is recommended. You may claim support once "common tasks" show no problematic triggers, and must re-check every update.

Also [source]: "Minimize use of time-boxed interface elements" (auto-dismissing views are hard for some people), which is relevant to our fused snackbar.

Sources: https://developer.apple.com/design/human-interface-guidelines/accessibility.md · https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria

How we adopt it: the policy in 4.5.

#### R8. SF Symbols animation vocabulary

What it is: Apple's named set of small state animations. Useful as a shared language even though we draw our own line icons [source]:

- **Draw On / Draw Off** (SF Symbols 7): the symbol is drawn along its path; "to convey progress… or to reinforce the meaning of a symbol".
- **Replace** down-up / up-up / off-up, and **Magic Replace** for related shapes (a slash drawing on, a badge appearing).
- **Bounce** "can help communicate that an action occurred"; **Pulse** and **Breathe** for ongoing activity; **Wiggle** to draw attention to something overlooked.
- "Apply symbol animations judiciously… too many animations can overwhelm an interface."

Source: https://developer.apple.com/design/human-interface-guidelines/sf-symbols.md

How we adopt it: our pen-stroke tick is a Draw On, which is now the system idiom rather than a quirk. Use the same idiom for the strike-through, the day-close rules and the focus ring. Use "replace, down-up" (old glyph scales to 0.9 and fades, new scales from 0.9) for icon state changes such as play/pause in the focus timer.

#### R9. Live Activities and widgets

What is good, exactly [source]:

- Live Activity animations have "a maximum duration of two seconds"; none run on the dimmed Always-On display.
- "use numeric content transitions for score changes or fade a timer in and out when it reaches zero."
- "when animating items in lists, only animate the element that moves to a new position and use fade-in-and-out transitions for the other list items."
- End the activity immediately when the task ends; a custom dismissal time of "15 to 30 minutes is adequate".
- Widgets animate by diffing timeline entries; they get an implicit spring and content transitions; `.contentTransition(.numericText(value:))` gives digit rolls; a `Toggle` in a widget flips optimistically without waiting for the app.

Sources: https://developer.apple.com/design/human-interface-guidelines/live-activities.md · https://developer.apple.com/videos/play/wwdc2023/10028/

How we adopt it: `@expo/ui` in SDK 56 exports `contentTransition` (types `numericText`, `identity`, `opacity`, `interpolate`, with a `countsDown` flag), `symbolEffect`, `matchedGeometryEffect` and `animation` modifiers [source: `packages/expo-ui/src/swift-ui/modifiers/index.ts`]. Add `contentTransition` numeric text to the "left today" numeral in `TodayWidget.ios.tsx` and to the paused/done text in `FocusActivity.ios.tsx`. The list rule above is also the right model for the Today list (R22).

### B. Craft systems with concrete numbers

#### R10. Emil Kowalski's animation rules (open-source skills, including one for Expo)

What it is: the design engineer behind Sonner and Vaul published his rules as machine-readable skills. They are the most number-dense source I found. [source]

- **Frequency gate**: 100+ times/day → no animation (tab switches use `animation: 'none'`); tens of times/day → under 150 ms or nothing; occasional (sheets, toasts) → standard; rare (success, celebration) → the delight budget. Keyboard-initiated actions never animate. Cut any motion you would skip on the 50th use of the day.
- **Durations**: press 100–160 ms; toggles/chips 150–200 ms; dropdowns 150–250 ms; modals and drawers 200–500 ms; general UI under 300 ms; iOS push is 350 ms.
- **Curves**: ease-out `cubic-bezier(0.23, 1, 0.32, 1)`; on-screen movement `cubic-bezier(0.77, 0, 0.175, 1)`; iOS-style sheet `cubic-bezier(0.32, 0.72, 0, 1)` over 500 ms. "Never `ease-in` on UI."
- **Scale**: press to `0.97`; entrances start at 0.9–0.97 with opacity 0, "never `scale(0)`".
- **Springs for React Native** (Reanimated duration + dampingRatio): default settle 400 ms / 1.0; snap back after drag 400 ms / 0.8 with velocity; sheet 300 ms / 0.8 with velocity. Bounce only after a gesture with momentum.
- **Gestures**: dismiss at about 40–50% of travel or velocity above 500 px/s; elastic drag about 0.2 past a boundary; release bounce 0.1–0.3, zero when closed by a button; hit targets 44 pt; rubber-band formula with constant 0.55.
- **Choreography**: stagger 30–80 ms with the whole sequence under about 300 ms; first-run moments 100–150 ms steps on 0.5–0.6 s entrances; exits run together and shorter than entrances; one entrance per container; accents land in the last 20% of the timeline.
- **Haptics on Expo**: `selectionAsync` for value ticks; `Light` for snap, detent, drag commit; `Medium` for heavy landing or destructive action; `Success`/`Error` for outcomes. Fire at the causal moment, one per semantic event, never on scroll or per frame, and never as the only feedback.
- **Reduce Motion**: keep opacity and colour, drop translation, scale, parallax and overshoot; screen transitions become fades.
- **Never ship**: `PanResponder`, distance-only dismissal, hard stops at boundaries, `Easing.in` on UI, per-frame haptics.

Sources: https://github.com/emilkowalski/skill (files `skills/animate`, `skills/animate-expo`, `skills/gestures`, `skills/choreograph`, `skills/apple-design`) · https://emilkowal.ski/ui/7-practical-animation-tips [search]

How we adopt it: our `EASE.out` (0.22, 1, 0.36, 1) already matches his ease-out. Adopt the frequency gate as written. His "never ship PanResponder" is the strongest argument for Reanimated + Gesture Handler after 1.0 (section 4.2).

#### R11. Material 3 motion tokens

What is good, exactly [source]:

- Springs come in pairs: **spatial** (position, size; damping ratio 0.9) and **effects** (colour, opacity; damping ratio 1, because a background's alpha should not overshoot 100%).
- Stiffness by size of the thing moving: fast 1400 / 3800 (small components), default 700 / 1600 (partial screen such as bottom sheets), slow 300 / 800 (full screen). Converted with mass 1, the spatial springs have perceptual durations of about 0.17 s, 0.24 s and 0.36 s.
- Duration scale: short 50/100/150/200, medium 250/300/350/400, long 450/500/550/600, extra-long 700–1000 ms; duration should grow with the area or distance travelled.
- Easing: standard (0.2, 0, 0, 1); emphasized decelerate (0.05, 0.7, 0.1, 1); emphasized accelerate (0.3, 0, 0.8, 0.15).

Source: https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md

How we adopt it: take the two ideas, not the values. Never spring opacity or colour (we do this correctly today). Size the spring to the size of the moving thing: checkbox fast, sheet default, chart zoom slow. Apple's 0.4 s move and Material's 0.36 s full-screen spring agree closely, which is a good sign the range is right.

#### R12. Seed Design (당근) motion tokens

What it is: Karrot's open design system, the one Korean product system whose motion tokens I could read directly. [source]

- Durations in six 50 ms steps: d1 50, d2 100, d3 150, d4 200, d5 250, d6 300 ms. Colour transitions and press scale both use 150 ms.
- Timing functions: `enter` (0, 0, 0.15, 1); `exit` (0.35, 0, 1, 1); `easing` (0.35, 0, 0.35, 1); `enter-expressive` (0.03, 0.4, 0.1, 1); `exit-expressive` (0.35, 0, 0.95, 0.55).

Sources: https://github.com/daangn/seed-design/tree/dev/packages/rootage · https://raw.githubusercontent.com/daangn/seed-design/dev/packages/rootage/duration.yaml · https://raw.githubusercontent.com/daangn/seed-design/dev/packages/rootage/timing-function.yaml

How we adopt it: a product used by most Korean smartphone owners tops out at 300 ms for standard UI. Our `DUR.gentle` 320, `slow` 560 and `count` 760 are long by that standard; keep the long ones only for rare moments.

#### R13. "Family Values" (Benji Taylor): rarer means more theatrical

What it is: the design essay behind the Family wallet. I could only read a third-party restatement. [search/secondhand]

- Three pillars: simplicity (one primary action per view, progressive disclosure), fluidity (no instant show/hide, shared-element continuity, directional consistency), delight.
- "Delight-impact curve": the less often a feature is used, the more delightful it should be; frequent actions stay efficient with light touches.

Source: https://github.com/cristicretu/family-taste-skill (restatement; original at benji.org was not reachable)

How we adopt it: it is the same rule as R10's frequency gate, arrived at independently. It justifies spending real effort on 64/64, year close and the first chart.

### C. Apps: completion and celebration

#### R14. (Not Boring) Habits: the checkbox as "an exercise in more"

What it is: Apple Design Award winner 2022 (Delight and Fun). Apple's editorial is specific. [source]

- The checkbox "can't merely be ticked; you have to intentionally press on the screen for longer than you might think to trigger the animation." Prototyping showed "we needed feedback that told you you needed to keep holding."
- Completion layers "explosive 3D animations, custom sounds, and playful haptics". "We added maybe six or seven things in the checkbox, but most games probably have two or three times that for any one interaction."
- Standard controls stay standard: "fairly off-the-shelf, which makes things very simple and predictable." The app still had to be "a lightweight, quick-launching, scannable daily utility".
- "Minimalism is a fun place to visit for me, but it's not somewhere I want to live."

Source: https://developer.apple.com/news/?id=9ab1g4r3 · https://developer.apple.com/design/awards/2022/

How we adopt it: two lessons. First, a hold needs continuous "keep going" feedback (a line that fills while you hold). Use this for destructive or weighty commits such as year close and "start a new chart", not for daily checks. Second, the count of layers is a design decision: our check has four (fill, stroke, strike, haptic). A fifth and sixth (a soft paper sound, a 1-frame ink bleed) are affordable if the direction moves toward "richer".

#### R15. Things 3: the calm pole

What it is: the reference task manager. I could not open Cultured Code's site or any teardown today.

- A third-party design study describes the checkbox as fill, then checkmark, then a sound, roughly 500 ms in total, after which the row slides away and the list closes the gap. [search: blakecrosley.com/blog/design-study-things, the author's interpretation]
- Cultured Code's release notes mention tuning the haptic timing of checklist items and fixing a drag-and-drop animation glitch. [search: culturedcode.com/things/releasenotes/]
- Completed to-dos linger briefly before leaving, and checking several in a row restarts the wait so they leave together. [recall]
- "Magic Plus": the add button can be dragged to a position in the list or onto the Inbox. Pulling any list down opens Quick Find. A to-do opens in place by growing into a card while the list recedes. [recall]

Sources: https://blakecrosley.com/blog/design-study-things [search] · https://culturedcode.com/things/releasenotes/ [search] · https://www.macstories.net/?p=48965 [search, title only]

How we adopt it: (1) keep our whole check sequence inside about 500 ms of *perceived* response, with the reorder happening later; (2) batch the settle: restart the 700 ms hold on every new check so three quick checks move as one layout change; (3) a pull-down gesture on Today that writes on the next ruled line is our equivalent of Quick Find/Magic Plus (R23).

#### R16. Streaks: hold to complete

What it is: Apple Design Award-winning habit tracker.

- Completion is tap-and-hold; the rim of the circle fills while you hold, which reviewers call tactile and impossible to trigger by accident. A sound plays and "there's a little haptic feedback". [search]
- Criticism in reviews: holding normally implies editing, and there is no easy undo for an accidental completion. [search]

Sources: https://thesweetsetup.com/apps/best-habit-tracking-app-ios/ [search] · https://www.stuff.tv/review/app-of-the-week-streaks-review [search] · https://www.macstories.net/?p=49979 [search]

How we adopt it: do not make daily checks a hold; our list has 5–20 items and we already offer undo. Borrow the filling rim for the focus timer and for hold-to-confirm commits.

#### R17. Clear: gestures are the interface, sound is the reward

- Pull down to add an item; pinch two items apart to insert between them; pinch together to close the list; chimes on completion that reviewers describe as an "achievement unlocked" moment. Clear 2 (2024) kept the gestures and sells sound packs and themes as cosmetics. [search]
- The completion chime rises in pitch as you complete items in a row. [recall; the search could not confirm it]

Sources: https://www.macstories.net/reviews/clear/ [search] · https://www.macrumors.com/2024/01/08/clear-to-do-app-revamp [search]

How we adopt it: pull-to-add on Today (R23). If we ever add sound, a rising interval across consecutive checks is the one idea worth stealing, off by default and respecting the silent switch.

#### R18. Duolingo: reward lives in the characters

- Apple's Behind the Design: the characters' "subtle animations when people get something right are a reward in themselves"; lessons are "brisk and breezy"; "Fun is the most important part of the work we do." [source]
- Duolingo's own post on the streak milestone animation describes doing "multiple passes of rough animation" to try variations before refining "rhythm and energy". [search]
- A secondary site reports that a new streak animation raised seven-day retention of new learners by 1.7%. [search, unverified]

Sources: https://developer.apple.com/news/?id=jhkvppla · https://blog.duolingo.com/streak-milestone-design-animation [search]

How we adopt it: we have no mascot and should not invent one. The equivalent "character" is the chart itself: let the mini chart on Home react to each check (the matching cell inks in), so the reward is visible where the goal lives.

#### R19. Apple Design Award editorial: what Apple praises in words

All [source], from the awards pages:

- **CapWords** (2025 winner, Delight and Fun): "each flash card transition is accompanied by a real-world sound, a little tweak that enhances the sensory experience".
- **Denim** (2025 finalist): "smooth scroll transitions… a joy to play with, thanks to custom haptics".
- **(Not Boring) Camera** (2026 finalist): "giant buttons and haptic scroll wheels that make it fun to dial in… settings".
- **Rytmos** (2024 winner, Interaction): "every completed level adds a new element to an evolving song".
- **Pine Hearts** (2026 winner, Inclusivity): settings that let players "ease both motion and sensory feedback".
- **Structured** is a 2026 Inclusivity finalist; **Moonlitt** (2026 Interaction winner) is praised for "easy onboarding" and its team says "our challenge was to simplify that complexity through a thoughtful interface and spot-on interactions."

Sources: https://developer.apple.com/design/awards/ · https://developer.apple.com/design/awards/2025/ · https://developer.apple.com/design/awards/2024/ · https://developer.apple.com/news/?id=v1nphz91

How we adopt it: Rytmos is the model for our chart: every completed area adds a permanent element to one evolving picture. Pine Hearts and HIG together make the case for a small "움직임과 촉감" section in Settings (haptics on/off; motion follows system).

#### R20. Todoist, Tiimo, Structured, Finch, Opal

I have no source I could open today for these. From recall only, and deliberately brief:

| App | Pattern (recall) | Use for us |
|---|---|---|
| Todoist | Round checkbox fills in the priority colour, the row collapses, an undo toast appears; a "#TodoistZero" illustration when the day is empty. | Undo-in-toast we have; an empty-day state deserves one composed moment. |
| Structured | A vertical timeline; completing a task fills its coloured capsule and the line continues to the next one. | The "line continues" idea maps to our week strip. |
| Tiimo | iPhone App of the Year 2025; soft, slow, low-contrast motion designed for neurodivergent users; a visual countdown that drains. | Calm pacing for the focus timer. |
| Finch | The pet reacts to every completed goal; energy fills a bar that sends the pet on an adventure. | Per-check reaction lives in a character; ours is the chart. |
| Opal | Heavy use of haptics and glossy 3D "gems" for focus sessions. | The opposite pole from paper; useful only as contrast. |

### D. Numbers, lists, pull

#### R21. Number changes: roll digits, do not count

- SwiftUI's numeric text transition rolls only the digits that change, upward for increases and downward for decreases; Apple recommends it for scores in Live Activities. [source: R9]
- NumberFlow is the popular web equivalent ("an animated number component", tagged odometer and accessible); it does not target React Native. [source: https://github.com/barvian/number-flow]
- Emil Kowalski's rule: data people are reading or acting on should not move for style. [source: R10]

How we adopt it: replace count-up with a per-digit roll built on `Animated` (spec in section 5, moment 5). Use the native `contentTransition` in widgets and the Live Activity.

#### R22. List settling

- Apple's list rule: "only animate the element that moves to a new position and use fade-in-and-out transitions for the other list items". [source: R9]
- Reanimated's `LinearTransition` animates position and size together, default 300 ms with `Easing.inOut(Easing.quad)`, optional spring; `FadingTransition` fades out at the old place and in at the new (500 ms default). Under Reduce Motion, entering and layout animations jump to the end and exiting ones are skipped. [source: Reanimated docs]
- React Native's `LayoutAnimation` can animate create/update/delete with opacity or scale, types spring/linear/ease/`keyboard`; it applies to the whole next layout pass. [source: RN docs]

Sources: https://raw.githubusercontent.com/software-mansion/react-native-reanimated/main/docs/docs-reanimated/docs/layout-animations/layout-transitions.mdx · https://raw.githubusercontent.com/facebook/react-native-website/main/docs/layoutanimation.md

How we adopt it: when a checked row leaves for the Done group, fade *it* (opacity) and slide only the rows below it up, with no spring wobble (`easeInEaseOut`, 240–280 ms).

#### R23. Pull and overscroll

- Soft edges tell people the interface is alive: without rubber-banding "you wouldn't know the difference between a frozen phone, and phone that's just at the top of the edge". [source: R1]
- Sample rubber band `x' = x^0.7`. [source: R1] The widely quoted UIScrollView constant 0.55 appears in Emil Kowalski's skill as unattributed code. [source for the formula's existence; the constant's origin is recall]
- Clear's pull-down-to-add. [search: R17]

How we adopt it: iOS already gives the Today scroll view a native bounce with a negative `contentOffset.y`. Drive a "새 줄" affordance from it with `Animated.event` on the native driver: the next ruled line and a pen mark appear as you pull; past 64 pt it arms (one `Light` impact), and releasing opens quick add with the caret already on that line.

---

## 4. The practical side

### 4.1 What our current stack can do

Stack: `Animated` (native driver for transform/opacity), `LayoutAnimation`, `PanResponder`, `expo-haptics`, `react-native-svg`. React Native 0.85 on the New Architecture.

| Pattern | Feasible now? | Notes |
|---|---|---|
| Apple-style springs (response/damping) | Yes | `Animated.spring` stiffness/damping/mass maps 1:1 (R2). |
| Velocity hand-off after a drag | Yes, with care | Pass `velocity` to `Animated.spring`. `PanResponder` gives pt/ms; the spring's rest threshold is documented in pt/s, so multiply by 1000 and verify on a device. |
| Momentum projection, rubber band | Yes | Plain arithmetic in `onPanResponderMove` / `Release`. |
| Finger-tracked sheet and area pager | Yes, 60 Hz at best | `setValue` per move event on the JS thread. Fine while JS is idle; stutters if a re-render lands mid-drag. |
| Per-digit number roll | Yes | Column of 0–9 per digit, `translateY` on the native driver, tabular figures. |
| SVG stroke draw (tick, rules, ring) | Yes, JS-driven | `strokeDashoffset` is not on the native driver; fine for short one-shots, avoid for long loops. Prefer `scaleX` on a plain view for straight lines (we already do for the strike). |
| Hold-to-confirm with filling line | Yes | `onPressIn` starts a linear native-driven `scaleX`; `onPressOut` retracts in 200 ms ease-out. |
| Scroll-linked header, pull-to-add | Yes | `Animated.event` with native driver; threshold haptic from a JS listener. |
| List reflow on check | Yes, coarse | `LayoutAnimation`: global, not interruptible, no per-row choreography. |
| Block → destination zoom | Yes, custom | Measure rects and transform, as `FullGrid` already does. |
| Drag to reorder rows | Not sensibly | Possible with `PanResponder` and manual hit-testing, but fragile. |
| Pinch on the 9×9 chart | No | `PanResponder` has no robust multi-touch recogniser. |
| Custom haptic intensity or patterns | No | `expo-haptics` has fixed patterns only. |
| Shared-element between real screens | No | Needs native-stack screens. |

### 4.2 What adding Reanimated would buy on Expo SDK 56

Facts [source]: SDK 56 pins `react-native-reanimated` 4.3.1 with `react-native-worklets` 0.8.3 and `react-native-gesture-handler` ~2.31.1. Reanimated 4 is New Architecture only (fine, RN 0.85 always is). The Babel plugin is configured by `babel-preset-expo`. Reanimated 4.7 dropped React Native 0.83–0.85, so we must stay on the Expo-pinned line while we are on SDK 56. Web is supported.

What it buys:

1. **Gestures and their animations on the UI thread** (with Gesture Handler): sheets, the area pager, chart pinch and drag-to-close stay smooth at 120 Hz even while JS renders. This is the real gain.
2. **Per-view layout animation**: `entering` / `exiting` / `layout={LinearTransition}` per row instead of one global `LayoutAnimation`; retargetable; `itemLayoutAnimation` for lists. Makes drag-to-reorder and "this row fades, those rows slide" straightforward.
3. **Springs in Apple's terms**: `withSpring({ duration, dampingRatio, velocity })`, with interruption carrying velocity automatically.
4. **SVG on the UI thread**: `useAnimatedProps` for `strokeDashoffset`, and from 4.3 CSS animations on SVG including path morphing. Our tick, rules and rings stop depending on the JS thread.
5. **CSS-style transitions** (`transitionProperty`) for simple state changes, which removes most hand-written `Animated.Value` plumbing.
6. **Reduce Motion built in**: `ReduceMotion.System` per animation. Note its default *jumps to the end*, so we would still write our fade substitutes.
7. **Not** a system zoom or shared elements for us: those are experimental in 4.3 and assume native-stack screens.

Costs: two native dependencies and a rebuild (we already ship native modules, so no new class of risk); every animated component is rewritten rather than patched; Maestro flows need re-timing; risk right before App Store submission.

Recommendation: **ship 1.0 on built-in `Animated` with re-tuned tokens and the specs in section 5; adopt Reanimated + Gesture Handler in 1.1** for the gesture-heavy work (moments 3 and 4 in full, plus reorder and pinch). Do not half-migrate: move the sheet, the pager and the chart zoom together.

### 4.3 Other options worth knowing

- **React Native 0.85's Shared Animation Backend**: lets `Animated` drive layout props (width, height, flex, position) with the native driver. Experimental, opt-in via the experimental release channel, available from 0.85.1. Not for 1.0. [source: https://raw.githubusercontent.com/facebook/react-native-website/main/website/blog/2026-04-07-react-native-0.85.mdx]
- **`@expo/ui` SwiftUI islands**: already a dependency; gives native numeric text transitions and symbol effects in widgets, the Live Activity, and in-app `Host` views. No `sensoryFeedback` modifier is exported. [source]
- **A 30-line local Swift module** for `UIImpactFeedbackGenerator` with `prepare()` and `impactOccurred(intensity:)` would give graded intensity (for a softer uncheck, or a rising series in the finale). We already have the inline-module setup under `native/ios`. [recall for the UIKit API]
- **`expo-ahap`** plays Core Haptics AHAP patterns on iOS 13+. It is a community package with 14 commits and no stated SDK compatibility; treat as a prototype tool, not a 1.0 dependency. [source: https://github.com/EvanBacon/expo-ahap]

### 4.4 Proposed tokens

**Springs** (mass 1; `stiffness = (2π/response)²`, `damping = 4π × ratio / response`):

| Token | Use | Response | Damping ratio | stiffness | damping |
|---|---|---|---|---|---|
| `quick` | small things: indicator bar, segmented thumb, press release | 0.30 s | 1.0 | 439 | 41.9 |
| `move` | sheet present, chart zoom, page settle (no momentum) | 0.40 s | 1.0 | 247 | 31.4 |
| `flick` | release after a drag that had velocity | 0.30 s | 0.8 | 439 | 33.5 |
| `settle` | snap back after a cancelled drag | 0.40 s | 0.8 | 247 | 25.1 |
| `slow` | full-screen and finale moves | 0.50 s | 1.0 | 158 | 25.1 |

Opacity and colour never use springs; they use timing 120–200 ms with `EASE.out`.

**Frequency gate** (from R3, R10, R13):

| How often | Examples in our app | Budget |
|---|---|---|
| 100+/day | tab change, scrolling, typing, back | no motion beyond a ≤120 ms cross-fade; no haptic |
| tens/day | check, uncheck, open a row, segmented control | ≤150 ms response; one light haptic for state changes only |
| a few/day | sheets, toasts, zoom, quick add | 250–400 ms, spring, interruptible |
| daily/weekly | day close, weekly ritual, area 8/8 | up to about 1.2 s, composed, one notification haptic |
| a few times a year | 64/64, year close, first chart | up to about 2.5 s, full choreography, skippable |

**Haptic vocabulary** (replace the current six helpers):

| Event | Pattern | Why |
|---|---|---|
| Check a to-do, ink a cell | `impact Rigid` (test against `Light`) | small, hard, precise: pen on paper |
| Uncheck, undo | `impact Soft` | something lifted or eased back |
| Segmented control, day picker, mood score, area pager commit, pull-to-add arming | `selection` | "values are changing" |
| Quick-add commit, drop after reorder | `impact Light` | a small object placed |
| Stamp landing, drag lift | `impact Medium` | a heavier object |
| Day close, area 8/8, 64/64, focus finished, import/backup done, year closed | `notification Success` | outcome of a task |
| Blocked save, hold released early on a destructive action | `notification Warning` | |
| Failed sync or import | `notification Error` | currently unused |
| Row taps, tab change, opening sheets, back, scroll | **none** | system navigation is silent; keeps the vocabulary meaningful |

Add Settings → "촉감" on/off (default on). Haptics must never be the only signal.

### 4.5 Reduce Motion policy

Replace "jump to the end" with a three-way rule:

1. **Keep** anything that is only opacity or colour: the checkbox fill, text colour change, highlight washes, toasts fading.
2. **Substitute a 150–200 ms cross-fade** for anything that translates, scales or zooms: screen changes, sheet present/dismiss, chart zoom, digit rolls, bloom (cells fade in together or in three groups, no scale).
3. **Remove** anything decorative or continuous: breathing loop, staggered reveals, stroke draws (show the finished line with a 120 ms fade), any overshoot.

Also: keep the 700 ms row hold under Reduce Motion (then fade the row out and in), instead of 0 ms. Keep haptics; they are the non-visual channel Apple asks for. Gesture-tracked movement stays, because it is "tracking animations directly with people's gestures". After this, fill in the "Reduced Motion" item of the App Store accessibility label.

---

## 5. Twelve moments that deserve designed motion or haptics, ranked

Ranking = how often it happens × how much it carries emotionally × how far today's version is from good. "Now" means feasible with the current stack; "RA" means better or only possible with Reanimated + Gesture Handler.

### 1. Checking a to-do (Today, Home, zoomed 3×3) — Now

- Touch-down: the box (not the row) scales to 0.94 in 100 ms ease-out. No haptic yet.
- Touch-up at t = 0: haptic `impact Rigid`; fill 0→1 opacity in 120 ms; pen stroke starts at +30 ms and draws for 170 ms (ease-out cubic); box returns to 1.0 with `quick` (no overshoot).
- +230 ms: strike-through draws left to right in 220 ms; title colour ink → sub in 200 ms.
- Perceived completion by 450 ms. The row then holds 700 ms; **every further check restarts the hold**, so a burst settles as one move.
- Settle: the checked row fades (160 ms), rows below slide up with `easeInEaseOut` 260 ms, no spring.
- When the check achieves a cell, the matching cell in the Home mini chart inks in (opacity + scale 0.92→1, 260 ms) at +230 ms.
- Uncheck: stroke disappears at once, fill fades 120 ms, `impact Soft`.
- Reduce Motion: fill and strike fade in (120 ms), no scale, no draw; hold stays 700 ms; row cross-fades to its new place.

### 2. Day close: the last check of the day (하루 마감) — Now

- t = 0: the normal check (above), no extra haptic.
- +450 ms: first rule draws left to right, 320 ms ease-out. +540 ms: second rule starts, 320 ms. Two strokes, not one doubled line.
- +860 ms (second rule ends): `notification Success`. Total text ("7/7", date) fades up 200 ms, the numeral with a digit roll.
- Variant for a more physical direction: a "마감" stamp lands instead of the second rule: scale 1.12 → 1.0, fixed tilt −5°, opacity 0 → 0.9 in 140 ms ease-out, `impact Medium` at landing, and no Success haptic.
- Under 1.2 s, never blocks the list, never a modal. Reduce Motion: rules and text fade in over 200 ms; haptic stays.

### 3. Chart block ⇄ 3×3 zoom, and paging between areas (만다라트) — Now (tap), RA (pinch, drag)

- Open by tap: the block grows from its slot to the full board with `move` (0.40 s, no bounce). Neighbouring blocks fade out in the first 40%. Small labels fade out by 35%; large labels fade in from 45%, so scaled text is never seen blurred.
- Close by tap: the same spring. Close by pinch-in or drag-down (RA): 1:1 tracking, then `flick` with the gesture velocity.
- Paging: content follows the finger 1:1. On release, `target = dx + vx × 499` (projection with d = 0.998, vx in pt/ms); commit if |target| > half the width. Spring `quick`, or `flick` if released with speed. First and last area rubber-band with `x^0.7`. One `selection` haptic when a page commits.
- No haptic on open or close.
- Reduce Motion: 200 ms cross-fade between 9×9 and 3×3; paging cross-fades.

### 4. Sheets: cell editor, quick add, action sheet — Now (re-tuned), RA (smooth)

- Present: translate from 100% of its own height with `move`; backdrop fades to its final dim in 200 ms (timing, not spring).
- Drag: 1:1 downward; upward rubber-bands (`x^0.7`), never a hard stop.
- Release: dismiss if the projected end point is past 50% of the sheet height or velocity exceeds 0.5 pt/ms. Closing continues at the finger's velocity (spring to closed, clamped, no bounce) instead of a fixed 220 ms ease-in. Otherwise settle back with `settle`.
- Closed by a button: `quick`-length exit with ease-out, no bounce.
- Haptics: none for open or close. `notification Warning` on a blocked save stays.
- Reduce Motion: 200 ms fade, no travel.

### 5. Numbers that change (streak, N/64, "오늘 3개 남음", weekly totals) — Now

- Per-digit roll. Only digits that change move. Increase: old digit moves up 0.6 em and fades (150 ms), new one arrives from below with `quick`. Decrease: mirrored. Changed digits stagger 30 ms from the right. Tabular figures so nothing shifts sideways.
- No count-up for small changes. A count-up is allowed once, on first reveal of the big Stats figures, capped at 600 ms.
- No haptic. Reduce Motion: 150 ms cross-fade.
- Widgets and Live Activity: SwiftUI `contentTransition` numeric text via `@expo/ui`.

### 6. A cell is achieved, and an area reaches 8/8 — Now

- Cell achieved (in the zoomed 3×3 or action sheet): colour bleeds from the centre, opacity 0→1 with scale 0.92→1 in 260 ms; `impact Rigid`.
- Eighth cell of an area: after the cell lands, the block's frame is traced once (stroke draw around the perimeter, 600 ms, starting top-left, clockwise); the area name gets its gold underline (scaleX, 240 ms); `notification Success` when the trace closes.
- If the same check also closes the day, play this first and run moment 2 silently 900 ms later (the existing 1.5 s milestone guard already prevents a double buzz).
- Returning to the 9×9 afterwards, newly achieved cells ink in reading order, 60 ms apart, at most 8 staggered, the rest together.
- Reduce Motion: fades only; the frame appears with a 200 ms fade.

### 7. 64/64, the finale — Now

Rare, so it gets the largest budget. About 2.4 s, skippable with a tap at any time.

- 0–300 ms: cross-fade to a blank sheet with the date.
- 300–2100 ms: cells ink in block by block, clockwise from the top-left block, 28 ms apart, each 260 ms (today's bloom spirals out from the centre, which completes all eight blocks at the very end and leaves nothing to count). When each block's eighth cell lands, about every 225 ms, one `impact Soft`: eight quiet beats that build.
- 2100–2520 ms: the core cell fills in gold (420 ms); at its end `notification Success`; "63/64" rolls to "64/64" on the same beat.
- +400 ms: the streak line and the goal sentence fade in; then the share-poster action.
- No confetti, no particles: the chart is the celebration.
- Reduce Motion: the finished chart fades in over 300 ms; one Success haptic.

### 8. Changing tabs and going deeper — Now

- Tab change: swap content at once with at most a 120 ms cross-fade. No slide, no spring. The indicator bar moves with `quick` (no overshoot). No haptic.
- Push to area detail or settings: a real horizontal push. The new page enters from 100% width while the old one shifts −30% and dims, 350 ms on the iOS curve or `slow`. Edge-swipe back tracks 1:1 and commits by projection.
- Where the destination grows out of a visible source (chart block → area detail, Home mini chart → 만다라트), use the zoom from moment 3 instead of a push.
- Reduce Motion: cross-fade.

### 9. Focus timer: start, pause, finish (25분 집중) — Now

- Start: the progress line begins and `impact Rigid` fires on that frame.
- Running: seconds change without animation (high frequency); only the minute digit rolls. Breathing is opacity-only, low amplitude, and stops under Reduce Motion.
- Pause/resume: icon "replace, down-up" (old to 0.9 and out, new from 0.9) in 160 ms; `impact Light`.
- Finish: `notification Success`, the numerals give way to "완료" with a rule drawn beneath (420 ms). The user is often not looking, so the haptic and the local notification are the primary channel. End the Live Activity at once with a final state and dismiss it after 15–30 minutes.
- Hold-to-cancel a running session: a line fills over 1.2 s (linear) while held; releasing early retracts in 200 ms with `notification Warning`.

### 10. Quick add (담기): committing a new line — Now

- Submit: `impact Light`; the field clears with a 120 ms placeholder cross-fade and stays focused for the next entry.
- In the list behind: the new row fades in and rises 8 pt in 180 ms, then an area-colour wash at 12% fades to 0 over 600 ms to show where it landed.
- Entry from Today by pull (R23): the next ruled line appears as you pull; `selection` tick when it arms at 64 pt; release opens the field on that line.
- Reduce Motion: fade and wash only.

### 11. First run: the chart assembles itself (온보딩) — Now

Seen once, so it may be explanatory and slow.

- The outer frame draws (500 ms); the 3×3 block rules follow 60 ms apart (300 ms each); cell rules fade in (200 ms). About 1.2 s in total.
- As the core goal is typed, the centre cell inks in live. As each of the eight areas is named, its block takes its colour (260 ms) with one `selection` tick.
- "Chart created": `notification Success`, then the zoom from moment 3 carries the user from the onboarding chart into the real 만다라트 tab, so the first navigation teaches the main gesture.
- Reduce Motion: static chart, fades for colour.

### 12. Weekly review and Stats reveal (주간 회고 · 통계) — Now

- Bars grow from the baseline the first time a week is seen: `scaleY` from 0, 400 ms ease-out, 40 ms apart, under 700 ms in total. Never again on later visits.
- The streak figure rolls +1 the first time the app opens after a day close, not on every visit.
- Ritual steps move as horizontal pages that track the finger; finishing the ritual plays one `notification Success` with the same stamp or double rule as day close, so "closing" always looks and feels the same at day, week and year scale.
- Year close uses hold-to-confirm (1.5 s filling line) because it archives the chart.
- Reduce Motion: bars and figures fade in.

Not in the twelve, for 1.1 with Reanimated: drag-to-reorder in Today (lift scale 1.03 with a darker rule instead of a shadow, `impact Medium` on lift, `selection` per row crossed, `impact Light` on drop [recall of iOS convention]); pinch on the 9×9; the undo toast following the finger when swiped away.

---

## 6. Pitfalls to avoid

1. **Bounce without momentum.** Overshoot on a tapped tab, a segmented thumb or a page reads as "toy". Keep bounce for flicks.
2. **Haptic on every tap.** It turns the check haptic into noise. If removing it "feels dead", the visual press state is too weak; fix that instead.
3. **Animating what people are reading.** Stagger-in on every visit to Home or Stats, count-ups on every render, rows that keep sliding: all fail the "50th use of the day" test.
4. **Blocking input during a celebration.** Every sequence must be skippable and must not delay the next check.
5. **`scale(0)` entrances, `ease-in` on UI, hard stops, distance-only dismissal.** All four are named anti-patterns; the sheet has two of them today (ease-in exit, hard stop when dragged up).
6. **Treating Reduce Motion as "off".** Removing meaningful feedback fails Apple's criteria as surely as ignoring the setting does.
7. **Confetti and particle bursts.** Besides being banned by our own direction, they cannot be tied to *this* user's chart. Progress-as-artifact can.
8. **Long continuous haptics or per-frame haptics.** Apple: prefer short haptics on discrete events.
9. **Half-migrating to Reanimated.** Two animation systems driving one screen causes more jank than either alone.
10. **Chasing the system zoom transition before 1.0.** It is alpha in Expo Router, needs a navigation rewrite, and has a reported one-second delay on fast gestures.
11. **Shipping haptics tuned in the simulator.** The simulator plays none. Tune on the oldest supported iPhone, in a release build, with Low Power Mode both on and off.
12. **Sound as an afterthought.** If sound is added later it must be off by default, respect the silent switch, and share the tempo of the haptic.

---

## 7. What I could not verify

- **Blocked hosts.** These must be allowed in the session's network settings before the claims that depend on them can be checked first-hand: `medium.com`, `wwdcnotes.com`, `reactnative.dev`, `culturedcode.com`, `blakecrosley.com`, `blog.duolingo.com`, `www.macstories.net`, `docs.expo.dev`, `apps.apple.com`. (Expo and React Native docs were read from their GitHub sources instead.)
- **Search budget.** The shared web-search allowance ran out after eight queries, before I could search Todoist, Tiimo, Structured, Finch, Opal, or any Korean and Japanese sources (Toss, LINE, Japanese teardown blogs). Seed Design's tokens are the only East Asian source read first-hand.
- **Things 3**: the roughly 500 ms sequence is a third party's reading seen only as a search summary; the batching of completed to-dos, Magic Plus and Quick Find details are recall. No source states which haptic generator Things uses.
- **Streaks**: hold duration unknown. **Clear**: the rising pitch is recall. **Duolingo**: the 1.7% retention figure is secondhand; I did not read the milestone post itself.
- **Todoist, Tiimo, Structured, Finch, Opal** (R20): recall only.
- **"Family Values"**: read only through a third-party restatement.
- **The 0.55 rubber-band constant** and **iOS push = 350 ms**: both appear in Emil Kowalski's skill without attribution; consistent with common knowledge but not confirmed against Apple material.
- **SwiftUI preset values** (`smooth`, `snappy`, `bouncy`): the transcript summary I read did not state them.
- **The damping formula** in the WWDC23 page is printed ambiguously; the version in this memo is the physically consistent one and matches Gitter's code.
- **`Animated.spring` velocity units** with the native driver (pt/s is inferred from the documented rest-speed threshold).
- **Whether `contentTransition` survives `expo-widgets`' `'widget'` serialisation**: the modifier exists in `@expo/ui` for SDK 56, but I did not build it.
- **Binary-size and startup cost of Reanimated 4.3.1** on our app: not measured.
- **UIKit `impactOccurred(intensity:)`**: recall; the UIKit page I fetched lists the generators but not that method.
- Every haptic choice in section 4.4 and every timing in section 5 is a starting value chosen from the principles above. None has been felt on a device.
