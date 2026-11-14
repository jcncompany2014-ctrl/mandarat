# Apple Design Awards & App Store Awards — what Apple rewards, and what 만다라트 has to show

Research date: 2026-11-14. Scope: Apple Design Award (ADA) winners and finalists 2022–2026, App Store Award winners 2022–2025, Apple's own featuring criteria, and the platform rules the winners visibly follow. Focus: planner, productivity, lifestyle, health and journaling apps.

**How to read the labels**

- **[S]** = read in a source during this session (link given).
- **[R]** = recalled from general knowledge, not verified this session. Treat as a lead, not a fact.
- **[P]** = my proposal for 만다라트. Sizes and timings in proposals are suggestions, not sourced numbers.

**Source limits (important).** Only `developer.apple.com` could be fetched from this session. `www.apple.com` (newsroom), MacRumors, TechCrunch, Daring Fireball, Business Wire and tiimoapp.com were blocked, and the shared web-search budget ran out before the Korean and Japanese searches could run. I could not see any screenshot of any reference app: every visual description below comes from words in Apple's editorial text or developer interviews, or is marked [R]. See section 8.

---

## 1. Summary

1. **Apple rewards one describable idea, executed completely.** Every planner-adjacent winner can be summed up in one sentence that names a visual idea and a feeling. Tiimo, iPhone App of the Year 2025: "By turning our chaotic calendars into a timeline of soothing colors, Tiimo did the unthinkable: It made tackling our to-dos a calming activity." [S] Our current build is tidy and coherent, but nobody could write that sentence about it yet.
2. **The small-team odds are good.** grug (2026 Delight and Fun winner) is 2 people, Bears Gratitude (2024 winner) is a married couple, Crouton, Guitar Wiz and Tide Guide are solo developers, Moonlitt is 3 people. [S] Team size is not the barrier; an unfinished idea is.
3. **"Calm, kind, non-punishing" is the tone Apple keeps picking in this category**: Tiimo ("calming"), Structured ("prioritizes downtime as much as productivity"), Gentler Streak ("powered not by insistent reminders but an optimistic and encouraging vibe"), Bears Gratitude ("warm and welcoming"). [S] Our muted dye palette and paper are compatible with this. Our streak and "13/13" bookkeeping need checking against it.
4. **Restraint alone does not win Delight.** The 2022 Delight winner's designer says it plainly: "minimalism is a fun place to visit for me, but it's not somewhere I want to live… I want to live where there's richness and texture and fun." [S] Our ban list (no gradients, shadows, emoji, illustration, pills, cards) removed the generic look, but a list of prohibitions is not an identity. What is left has to carry all the character, and today it does not carry much.
5. **Commit to the medium or drop it.** grug's makers: "If we had compromised on the handwritten engine early, grug would probably feel like a quote app with a cute font." Their lesson text appears "not like a font fading in but like ink appearing on paper." [S] Our paper is currently a background pattern plus ruled lines. Either the ink behaves like ink everywhere (checks, 正 tally strokes, cell fills, the date), or the metaphor reads as a skin.
6. **In 2026 Apple visibly rewards adoption of the new design (Liquid Glass) in the chrome.** Moonlitt (Interaction winner): "best-in-class Liquid Glass integration". Tide Guide (Visuals and Graphics winner): "integrates the new design and Liquid Glass". [S] Our tab bar is a custom JS view with line icons and a dashed "+" box (`src/navigation/Root.tsx`). On iOS 26 that is the clearest "not a native app" tell in the product. Noteshelf shows the reconciliation: glass on toolbars and tab bars, "while keeping the writing canvas calm and distraction-free." [S]
7. **Platform breadth is named in almost every citation**: widgets, Live Activities, Dynamic Island, Siri Shortcuts, iCloud sync, Apple Watch. Flighty's citation lists five of them in one sentence. [S] We already have widgets, a Live Activity, Siri shortcuts and iCloud. That is a strong hand; it is not visible in our screenshots or copy.
8. **Accessibility is a scoring line, not a courtesy.** It is one of Apple's seven published featuring factors, a field in the nomination form, an ADA category, and now a public product-page label set (Accessibility Nutrition Labels). [S] The codebase already has broad VoiceOver labelling and Reduce Motion handling. The gap: text scaling is capped at 1.2–1.4× in several components, which rules out the "Larger Text" label (it requires 200% or more). [S for the rule, verified in code for the caps]
9. **The first three screenshots and one sentence decide discovery.** "The first one to three images will appear in search results… make sure these highlight the essence of your app." [S] Our first screenshot is the densest screen in the app (81 cells of 11 pt text).
10. **Timing is now.** Apple asks for nominations at least 3 weeks ahead (help page) and "up to three months in advance" for wider featuring. [S] A goal-setting chart is a New-Year product; a January feature needs an App Launch nomination filed this month. [P; the existence of a New-Year editorial theme is R]

---

## 2. Honest read of the current build

Based on `store/screenshots/ko/APP_IPHONE_67/01-chart.png`, `02-today.png`, `03-home.png`, `src/theme/*`, `src/navigation/Root.tsx` and `docs/MASTERPIECE_BACKLOG.md`.

**What is genuinely good and should survive any redesign**

- The printed 9×9 chart is a real object with a real cultural history, not a metaphor invented for the app. This is the "uniqueness" Apple asks for ("a fresh approach to a familiar category").
- The 正 tally on the week strip is the single most distinctive detail in the app. It is culturally specific to Korea, Japan and China, it is functional, and no competitor has it. This is exactly what "culturally relevant" localization means.
- The copy is short and plain. The type scale is disciplined (7 roles), contrast is computed in code, and motion tokens exist.
- Free, no account, local-first. Apple praised exactly this in grug: "no login, no cloud syncing, nothing extraneous." [S]

**What is weak**

| Area | What is wrong today | Which Apple signal it fails |
|---|---|---|
| Tab bar | Custom opaque bar, thin line icons, a dashed-box "+" in the middle. 담기 is an action sitting among destinations. | "tabs are for navigation, not for taking action" (WWDC25) [S]; Liquid Glass chrome is what 2026 winners are praised for [S] |
| Home hierarchy | After the "14", seven sections follow at the same weight (18 pt bold title + rule). "13/13" appears twice. The mini 9×9 is too small to read and too detailed to be an icon. Nothing answers "what do I do right now?" in the first screen. | "guiding the eye through the screen, so it notices the different design elements in order of importance" [S]; Headspace's Today tab: "one-tap access" [S] |
| Chart | 81 cells at about 11 pt, two-line wraps, on a phone. It is the HIG minimum size, used for the main content. Good as a poster, hard as a daily screen. | iOS default 17 pt, minimum 11 pt [S]; Structured: "easy to scan" [S] |
| Today list | Three separate micro-glyph systems on one screen: the progress squares, the area legend, and the per-row week dots (filled, outlined, hatched, dotted) at roughly 8–10 pt. Meaning depends on colour and tiny shape differences. | "Convey information with more than color alone" [S]; Crouton: "Everything… is easy to find and right where you need it" [S] |
| Character | No voice, no sound, no signature moment. The check is the most repeated action in the app and it has no memorable feedback. | Delight and Fun: "memorable, engaging, and satisfying experiences" [S]; (Not Boring): 6–7 layers of feedback on one checkbox [S] |
| Paper metaphor | Dots and rules only. Nothing is written, nothing dries, nothing prints. | grug: ink "appearing on paper" [S] |
| Text scaling | `maxFontSizeMultiplier` 1.2–1.4 in TodayRow, KindBits, DayPicker, WeekStrip. | Larger Text label = "200% or more" [S] |
| Store page | Caption + raw screenshot on the same beige. First image is the dense chart. No widget, Live Activity, print or dark-mode shot. The name 만다라트 is the generic category word. | First 1–3 images; "Avoid names that use generic terms"; include a Dark Mode screenshot [S] |
| App icon | Flat PNGs (light, dark, tinted); the layered Liquid Glass icon is deferred in the backlog. | HIG: provide the icon in Icon Composer format; avoid thin lines [S] |

The short version: the current design is a careful removal of bad taste. Apple's winners are not defined by what they removed.

---

## 3. Apple's stated criteria

### 3.1 The six ADA categories (verbatim) [S]

Source: https://developer.apple.com/design/awards/

- **Delight and Fun**: "memorable, engaging, and satisfying experiences enhanced by Apple technologies."
- **Inclusivity**: "a great experience for all by reflecting a variety of backgrounds, abilities, and languages."
- **Innovation**: "a state‑of‑the‑art experience through a novel use of Apple technologies that sets them apart in their genre."
- **Interaction**: "intuitive interfaces and effortless controls that are perfectly tailored to their platform."
- **Social Impact**: "improve lives in a meaningful way and shine a light on crucial issues."
- **Visuals and Graphics**: "stunning imagery, skillfully drawn interfaces, and high-quality animations with a distinctive and cohesive theme."

Realistic targets for a planner: **Interaction** (the chart zoom, the check, the daily list) and **Visuals and Graphics** ("skillfully drawn interfaces… distinctive and cohesive theme" is our stated goal). Inclusivity is where Tiimo and Structured were placed.

### 3.2 The seven featuring factors (verbatim) [S]

Source: https://developer.apple.com/app-store/getting-featured/ . Apple says there is "no checklist of requirements for getting featured", then lists what editors consider:

| Factor | Apple's wording | Where 만다라트 stands |
|---|---|---|
| User experience | "Cohesive, efficient, and valuable functionality that's helpful and easy to use." | Cohesive yes. "Efficient": Home does not surface the next action. |
| UI design | "Great usability, appeal, and overall quality, such as beautiful visuals or intuitive gestures and controls." | Usable. "Appeal" and "intuitive gestures" are thin. |
| Innovation | "New technologies that solve a unique problem and provide an enhanced user experience." | Widgets, Live Activity, Siri, iCloud, print exist. Not shown. |
| Uniqueness | "A fresh approach to a familiar category that stands out from the crowd or defines a new genre." | Strongest card: chart-first planning, 正 tally, print. |
| Accessibility | "A great experience for a broad range of users with well integrated features." | Good groundwork; text-size caps block a full claim. |
| Localization | "High-quality support for multiple languages with culturally relevant and appropriate content." | ko, ja, en. Needs native review of ja and culturally fitted examples. |
| App Store product page | "Compelling screenshots, app previews, and descriptions, as well as positive ratings and reviews." | Weakest today. |

Lead time: "please give our team a minimum of two weeks notice. For wider featuring consideration, we recommend submitting a nomination up to three months in advance."

### 3.3 The nomination form [S]

Source: https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring/ and the WWDC24 session https://developer.apple.com/videos/play/wwdc2024/10063/

- Three types: **App Launch** ("launch or pre-order of your new app"), **App Enhancements** ("new features, functionality, or other significant updates"), **New Content**.
- Fields: name, detailed description, publish date ("minimum lead time of 3 weeks"), platforms, countries or regions, localizations, up to 5 **Supplemental Materials** URLs ("additional documents, files, art assets, and even TestFlight public links"), and **Helpful Details**: "details about accessibility, inclusivity, level of priority of your nomination, or any unique aspects of your app or team".
- WWDC24: "There's more to your app than the software people interact with. There are the values you live by and the story of how you create your app."
- Nominations are considered "across any of our platforms or regions." So a Korea-first and Japan-first story is a legitimate pitch, not a handicap.

### 3.4 Product page rules [S]

Source: https://developer.apple.com/app-store/product-page/

- Name up to 30 characters: "Be distinctive. Avoid names that use generic terms or are too similar to existing app names."
- Subtitle up to 30 characters; avoid "world's best app" style claims; "highlight features or typical uses".
- Up to 10 screenshots. "The first one to three images will appear in search results when no app preview is available, so make sure these highlight the essence of your app. Focus each subsequent screenshot on a main benefit or feature." "If your app supports Dark Mode, consider including at least one screenshot that showcases what the experience looks like."
- Up to 3 app previews, up to 30 seconds each, autoplay muted: "make sure the first few seconds of your video are visually compelling."
- Promotional text up to 170 characters, editable without a new build. Keywords 100 characters.
- Rating prompt at most 3 times per 365 days; the HIG adds: let people experience the app before prompting.

### 3.5 Accessibility Nutrition Labels [S]

Source: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/

Nine labels: VoiceOver, Voice Control, Larger Text ("Increases the text size in the app to 200% or more"), Dark Interface, Differentiate Without Color Alone ("Uses shapes or text, in addition to or instead of color, to distinguish key information"), Sufficient Contrast, Reduced Motion, Captions, Audio Descriptions.

The bar: "users must be able to complete all of the common tasks of your app using that feature." Common tasks include the primary functionality plus first launch and settings. Apple's test: "ask yourself whether you'd ship an urgent fix if users were blocked from completing this task."

For us, seven of the nine are relevant and reachable. Each one we can honestly declare is a visible line on the product page and a line in the nomination's Helpful Details.

### 3.6 Platform rules the winners follow

**Liquid Glass (iOS 26)** [S] — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json and https://developer.apple.com/videos/play/wwdc2025/356/

- Glass "forms a distinct functional layer for controls and navigation elements — like tab bars and sidebars — that floats above the content layer."
- "**Don't use Liquid Glass in the content layer.**" "Use Liquid Glass effects sparingly."
- "If you've customized your bars, now's the time to clean them up." "Instead of relying on decoration, hierarchy should be expressed through layout and grouping."
- Tint only primary actions. Typography is "now bolder and left-aligned" in alerts and onboarding.
- Corners should be concentric: inner radius = parent radius minus padding.

This is good news for a paper design: the rule set says content stays calm and flat, chrome floats. Paper sheet below, glass tools above is the system's own model.

**Structure** [S] — https://developer.apple.com/videos/play/wwdc2025/359/

- An app should answer at a glance: where am I, what can I do, where can I go next.
- "tabs are for navigation, not for taking action."
- Progressive disclosure: "showing only what's necessary upfront… then revealing more as they interact."
- Lists over grids for scanning; group by time, progress or pattern.
- "Use a limited, cohesive palette"; accent colours "sparingly, for buttons, controls, and selection states."

**Widgets** [S] — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/widgets.json

- "Prefer dynamic information that changes throughout the day." "Look for opportunities to surprise and delight."
- Standard margin 16 pt (11 pt for tight groups). Text 11 pt or larger. Custom font for the large text, SF Pro for small text.
- "Avoid mirroring your widget's appearance within your app."
- In tinted and clear Home Screen appearances the system desaturates the widget. "Convey meaning without relying on specific colors." Our eight area colours disappear in those modes, so areas need a second code (position in the 3×3, initial, or pattern).
- Description starts with an action verb. "Offer simple, relevant functionality and reserve complexity for your app."

**Live Activities** [S] — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/live-activities.json

- For tasks with "a defined beginning and end" that "don't exceed eight hours". A 25-minute focus session is the textbook case.
- "Use large, heavier-weight text — a medium weight or higher." Lock Screen margin 14 pt. Animations up to 2 seconds.
- "Always end a Live Activity immediately when the task or event ends." Custom dismissal: "15 to 30 minutes is adequate."
- "Don't use push notifications alongside Live Activities for the same updates."
- Offer an in-app control to turn it off, and an App Shortcut to start it.

**App icon** [S] — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/app-icons.json

- "Provide your icon in the Icon Composer format." Layers: one background plus one or more foreground layers; "prefer clearly defined edges"; "consider basing your icon design around filled, overlapping shapes."
- "Embrace simplicity": one core concept "with a minimal number of shapes." Avoid "extremely thin line weights and sharp corners"; "avoid replicating UI components."
- From a flat PNG, the system only applies glass to "large, simple shapes", not to "text and thin lines". A 9×9 hairline grid is the worst case for this. A 3×3 of filled squares with one inked centre is the best case.
- Keep features consistent across default, dark, clear and tinted.

**Onboarding** [S] — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json

- "fast, fun, and optional." "Teach through interactivity." "Postpone nonessential setup." Prefer contextual tips to one long flow. Ask for permissions when the feature is first used.

**Type, touch, contrast** [S] — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json

- iOS default 17 pt, minimum 11 pt. Large Title 34, Title 1 28, Title 2 22, Title 3 20, Body 17, Footnote 13, Caption 2 11.
- "Avoid light font weights." Custom fonts must implement Dynamic Type and Bold Text behaviour. "Reduce the number of columns when the font size increases."
- Controls 44×44 pt default, 28×28 minimum. Contrast 4.5:1 up to 17 pt, 3:1 at 18 pt or bold.
- Reduce Motion: replace slides and zooms with fades; "tighten animation springs."

**Haptics** [S] — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/playing-haptics.json

- "build a clear, causal relationship between each haptic and the action that causes it." Match haptic sharpness to the animation. "Often, the best haptic experience is one that people may not be conscious of, but miss when it's turned off." "Make haptics optional."

**Charts** [S] — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/charting-data.json

- "Keep a chart simple, letting people choose when they want additional details." Add a headline that states the takeaway (Weather: "Chance of light rain in the next hour"). Prefer bar and line charts. If the chart is novel, teach how to read it.

**Writing** [S] — https://developer.apple.com/videos/play/wwdc2025/404/

- Remove filler, avoid repetition, lead with the why ("To get reservation updates, enter your phone number"), keep a word list. We already keep a word list in `src/lib/copy.ts`; that is ahead of most apps.

---

## 4. References: what was awarded and what we can take

### R1. Tiimo — iPhone App of the Year 2025; ADA Inclusivity finalist 2024

- **Apple's words [S]**: "By turning our chaotic calendars into a timeline of soothing colors, Tiimo did the unthinkable: It made tackling our to-dos a calming activity." Finalists it beat: BandLab, LADDER.
- **The team [S]**: 15 people, Copenhagen. "Tiimo is designed with the neurodivergent brain in mind… but we've found that approach can also be universal." Many users "don't identify as neurodivergent and love the way that we represent time." They rewrote the app in SwiftUI partly because "you get so much out of the box from SwiftUI in terms of accessibility, animations, transitions." They adopted the State of Mind API so planning connects to "feelings and energy levels."
- **Design traits from secondary sources [S, search summaries only]**: icon-based labels, colour coding and minimal text as deliberate responses to time blindness; a focus timer that starts directly from a task. User reviews also report bugs and that heavy customisation slows down basic entry.
- **Details I recall but did not verify [R]**: a vertical day timeline of rounded colour blocks, each with an icon; a round visual countdown that drains; soft pastel palette; a Live Activity for the current task.
- **Sources**: https://developer.apple.com/app-store/app-store-awards-2025/ , https://developer.apple.com/articles/tiimo/ , https://www.getinflow.io/post/best-alternatives-tiimo-adhd
- **Adopt [P]**
  - Write our own editor's sentence first, then design until it is true. Shape: [what we transform] + [the visual idea] + [the feeling]. Draft: "By folding a year-sized wish into 64 small boxes on one sheet, 만다라트 makes a big goal something you can tick off today."
  - Home: the first screen should show the calm result (today's few actions, area-coloured, large), not the bookkeeping (week number, days left in the year, 13/13 twice).
  - Focus timer: start it from a Today row in one tap; show time as a shape that fills or drains, not only digits.
  - Do not copy the pastel timeline. That look is now Tiimo's and Structured's.

### R2. Structured — ADA Inclusivity finalist 2026; iPad App of the Year finalist 2025

- **Apple's words [S]**: "Visually sharp and easy to scan, this SwiftUI-built daily planner prioritizes downtime as much as productivity. It excels not just at optimizing open slots on your calendar, but also at helping you find time to take breaks. Members of the neurodivergent community have praised Structured for its simple layout and the way it incorporates the Foundation Models framework to suggest and pre-fill tasks."
- **The founder [S]**: Leo Mehlig did "design, coding, customer support, and marketing" alone for almost three years. "You have to focus on what's important. The product becomes more focused, which in the case of consumer apps is usually a good thing."
- **Recalled [R]**: a single vertical line through the day with a coloured capsule and icon per task, a large friendly date header, an inbox for unscheduled tasks.
- **Sources**: https://developer.apple.com/design/awards/ , https://developer.apple.com/articles/start-small-code-big/ , https://www.iphone-ticker.de/apple-design-awards-deutsche-app-structured-im-finale-278138/
- **Adopt [P]**
  - "Easy to scan" is the bar for the Today list: one glyph system per row, not three. Replace the per-row 7-dot week strip with one readable statement ("이번 주 1/3") and move the dot history into the row's detail.
  - "Prioritizes downtime": the week strip and streak mode should treat a planned rest day as a valid mark, not an empty box.
  - Pre-filling: when a new area is named (건강, 돈, 배움), offer 3–5 example actions to tap in, so the 64 cells are not 64 blank inputs. This can be a static list; it does not need a model.

### R3. grug — ADA Delight and Fun winner 2026

- **Apple's words [S]**: "it's the scribbled design that really pops; it's a little masterpiece of clever simplicity that never takes itself too seriously. (Check out the app's hand-drawn status bar, and its release notes.) … there's no login, no cloud syncing, nothing extraneous."
- **The makers [S]** (2 people): existing handwriting fonts "looked too clean and polished", so they built a drawing canvas and "a rendering engine that could use those drawings as a custom type system." They went all-in: "rendering, layout, animation, sizing, icons, and interaction states around our own stroke data." The lesson is written "not like a font fading in but like ink appearing on paper." "The imperfection is intentional." Goal: "make the useful thing feel small enough to start." Users began "speaking back to us in grug's voice."
- **Source**: https://developer.apple.com/design/awards/ , https://developer.apple.com/news/?id=ux44ymcr
- **Adopt [P]**
  - Decide whether paper is the concept or the wallpaper. If it is the concept, ink must behave like ink in every state change: a check is a pen stroke drawn in about 200 ms (the pen stroke from W1-G is the seed), each completion adds one stroke to the day's 正 (five strokes, drawn in stroke order), a finished cell fills like ink soaking in from the stroke, the big date is set like a printed numeral rather than faded in.
  - Carry the voice to the edges Apple's editors actually look at: release notes, empty states, the widget placeholder, the App Store description.
  - "Small enough to start" is the right brief for onboarding: one goal, then one 3×3, then stop.
  - Say "no account, no ads, no purchase, your data stays on your device" in the first lines of the product page. Apple treated that as a virtue here.

### R4. Tide Guide — ADA Visuals and Graphics winner 2026 (also Interaction finalist 2026 and 2023)

- **Apple's words [S]**: "integrates the new design and Liquid Glass, adding extra polish to data presentation and custom animations — and tying nicely into the aquatic theme. Tide Guide's rich full-screen charts present a boatload of weather data… in a crisp, clear manner that's easily understood by even the most landlocked, and its powerful widgets help swimmers and boat captains save a step right from the Home Screen. The app's palette is even designed to match the color of the sky throughout the day."
- **The developer [S]** (solo, self-taught): he moved away from "crazy elements, non-standard navigation" toward the platform's language. "The more time you spend with it, the more you can dig into different layers." The Overview stacks a tide curve, arc charts, a moon card, an hourly strip and a multi-day forecast; a red dot marks "now" on the curve.
- **Source**: https://developer.apple.com/design/awards/ , https://developer.apple.com/news/?id=4r9b23wx
- **Adopt [P]**
  - Theme tied to subject: their glass fits water. Ours: the chart is paper, the tools above it are glass, like a sheet under a desk mat or loupe.
  - Palette that follows the day: paper white in the morning (#FBF9F4), slightly warmer lamp-lit paper in the evening, a true dark "night desk". Small shifts, never a gradient.
  - Stats: one full-width chart per question, each with a one-line headline that states the finding. A "now" marker on every time-based chart.
  - Layers of depth: Home shows today; one tap shows the block; one more shows history. Do not show all layers at once.

### R5. Moonlitt, Sunlitt, Lumy — ADA Interaction winner 2026; ADA finalists 2024 and 2025; Lumy was Apple Watch App of the Year 2024

- **Apple's words [S]**: Moonlitt "brings a simple elegance… With broad platform support… best-in-class Liquid Glass integration, and easy onboarding, it's an intuitive and beautiful way to keep your eyes on the skies." Lumy: "With a simple design, carefully curated color palette, and elegant widgets and Live Activities, Lumy offers a quick and intuitive way to get celestial information."
- **The team [S]** (3 people, met at the Apple Developer Academy in Naples): "the goal was never to make people feel the complexity." With Liquid Glass "everything felt much more alive. It was like the interface was breathing." Sunlitt's core metaphor: "we decided to place a monolith on the screen and let it cast a shadow"; colours "mimicked the sky". They built eclipse features after one App Store review pointed out the gap.
- **Source**: https://developer.apple.com/design/awards/ , https://developer.apple.com/design/awards/2025/ , https://developer.apple.com/news/?id=v1nphz91 , https://developer.apple.com/articles/sunlitt/
- **Adopt [P]**
  - One object on screen that explains the whole app. Sunlitt has the monolith and its shadow. Ours is the 3×3 block: centre goal, eight around it. Make the 3×3, not the 9×9, the hero object on Home and in onboarding, and let the 9×9 be the zoomed-out poster view.
  - Utility apps win Interaction with "simple elegance" plus "easy onboarding" plus platform fit. No gimmick is required.
  - Widgets and Live Activities are named in the citation. Treat ours as first-class design surfaces with their own review, not ports.

### R6. Bears Gratitude — ADA Delight and Fun winner 2024

- **Apple's words [S]**: "a warm and welcoming way to establish — and, just as crucially, maintain — a daily gratitude practice… the bears… turn up in delightfully unexpected places. But they also serve as a welcoming way into the content. And with its thoughtfully considered touchpoints…"
- **The makers [S]** (2 people): "The art is the heart of everything we do… The art drives everything." No sign-in: "We wanted people to go straight into the experience and start writing." "Our design approach was almost bizarrely linear… We designed it in the same order that users experience it." Prompts are written in the user's first person "as if we were the only ones using it." "Instead of trying to set our app apart, how do we make it ours?"
- **Source**: https://developer.apple.com/design/awards/2024/ , https://developer.apple.com/news/?id=i74v3f4r
- **Adopt [P]**
  - Design onboarding in the order it is lived: first screen is an empty centre cell and a cursor. No feature tour.
  - Example goals and area names in first person and small: "올해 나는 아침을 되찾는다", not "건강 관리".
  - "Delightfully unexpected places": our equivalent without illustration is the chart itself appearing where it is not expected: as the progress indicator, as the widget, as the year-end poster, as the loading state, as the app icon.
  - A character works for them because the art existed first. Do not add a mascot to fix a personality gap.

### R7. Gentler Streak — ADA Social Impact winner 2024, Visuals finalist 2023, Apple Watch App of the Year 2022

- **Apple's words [S]**: "powered not by insistent reminders but an optimistic and encouraging vibe… relies on a subtle and consistently pleasing design language. Its health data is smartly organized, and its Monthly Summary view — which shows how you're doing in relation to your history — is less about hard comparisons and more about progress." 2022: "A fitness tracker that encouraged us to tune in to our bodies—and take a rest when we needed."
- **The team [S]** (8 people): "Statistics are just numbers. Without knowing how to interpret them, they are meaningless." The mascot Yorhart exists to interpret data in a sentence ("Good news from Yorhart…"). The founder's original need: "I needed something that let me know when it was enough." Korean and Japanese were added in spring 2024.
- **Source**: https://developer.apple.com/design/awards/2024/ , https://developer.apple.com/news/?id=3m0ht22s , https://developer.apple.com/news/?id=c6jwep5j
- **Adopt [P]**
  - Every number on Stats gets an interpretation line in plain Korean: "지난달보다 6칸 더 채웠어요", "이번 주는 쉬는 주였어요".
  - Compare only with the user's own past. No targets the user did not set.
  - Add "enough" states: when today's picked actions are done, the list closes like a ledger page and stops asking for more. The current "13/13 마감" is the start of this; make it the emotional high point of the day, not a table row.
  - Streak mode: a missed day should not break a visual chain in red. Use the tally and gaps.

### R8. Crouton and Mela — ADA Interaction winner 2024; Interaction finalist 2025

- **Apple's words [S]**: Crouton: "Recipe apps rise and fall on their organization and information hierarchy… Everything in Crouton, from the next recipe step to the name of that missing spice, is easy to find and right where you need it. And its effortless series of interactions mean people can keep their focus on the counter rather than their screen." Mela: "all about getting the details right. When the app's sharp-looking cooking mode is activated, recipe steps, measurements, and timing details are subtly dimmed and highlighted at the proper time. Timers integrate with the Dynamic Island…"
- **The developer [S]** (Crouton, solo): "How quickly can I get you back to preparing the meal, rather than reading?" "I spent a lot of time figuring out what to leave out rather than bring in." The cooking view shows only the current step, its ingredients and measures.
- **Source**: https://developer.apple.com/design/awards/2024/ , https://developer.apple.com/design/awards/2025/ , https://developer.apple.com/news/?id=9x75y43e
- **Adopt [P]**
  - Our version of the question: how quickly can we get the user back to doing the thing rather than managing the list?
  - Today as a "cook mode": the next undone action is full ink and large; done actions dim to about 40% and collapse; everything else is quiet. One row is always clearly "now".
  - Zoomed 3×3: the focused block is full contrast and the other eight blocks dim, so the eye knows where it is.
  - Focus timer in the Dynamic Island, named in Mela's citation, is something we already have. Polish it to that standard.

### R9. Flighty — ADA Interaction winner 2023

- **Apple's words [S]**: "key information where you need it most, an intuitive interface… and a look that mirrors time-honored airport design conventions… an incredible example of thorough and thoughtful use of Apple technologies, with best-in-class support for widgets, Siri shortcuts, Apple Maps, and Calendar integration. iCloud sync means it's available on every device."
- **The founder [S]**: "We want Flighty to work so well that it feels almost boringly obvious." "Those airport boards have one line per flight, and that's a good guiding light — they've had 50 years of figuring out what's important." Process: 20 design ideas per problem, because "it's what fits on a sheet of paper"; "You get to six or seven ideas and think, 'OK, that's it'… then you try it and it's not bad at all." "We really have to shine when things go awry."
- **Source**: https://developer.apple.com/design/awards/2023/ , https://developer.apple.com/news/?id=970ncww4
- **Adopt [P]**
  - This is the closest precedent for our direction: a look borrowed from a decades-old real-world information format. The lesson is to borrow the format's rules of information, not its texture. A printed Mandal-Art sheet has rules: centre first, eight around it, one phrase per cell, nothing else on the sheet. A ledger has rules: one line per entry, totals at the foot.
  - Apply "one line per flight" to Today: one line per action, with exactly one piece of secondary data.
  - Lock Screen and Dynamic Island should look like a line from the same sheet: heavy numerals, one rule, one area mark.
  - Process for the next round: 20 thumbnails for Home before choosing. The owner's question ("is this the best?") is answered by showing the 20.

### R10. (Not Boring) Habits and (Not Boring) Camera — ADA Delight and Fun winner 2022; Visuals finalist 2026

- **Apple's words [S]**: 2022: "sensational designs, playful haptics, and elegant gamification—your life-hack adventure plays out as an inspiring journey through forests and mountains". 2026: "the (Not Boring) team has mastered the secret behind its big, bold designs: Ensure the products excel in all other areas too… a tactile throwback to the cameras of the '70s and '80s, all giant buttons and haptic scroll wheels."
- **The designer [S]**: the checkbox is "an interactive event" with press-and-hold, particles, custom sound and haptics: "We added maybe six or seven things in the checkbox." "There were thousands of iterations." "Big teams will always have more features than we do… But design is difficult to copy." "You can write a to-do list on a piece of paper and it works just the same, right?" Habits is built on 66 days: "a video game with 66 levels." Standard controls are kept: "We didn't have to rethink how a button or a popover works."
- **Source**: https://developer.apple.com/design/awards/2022/ , https://developer.apple.com/design/awards/ , https://developer.apple.com/news/?id=9ab1g4r3
- **Adopt [P]**
  - Put the craft budget into the three moments that repeat or matter most, and layer them: (1) checking an action, (2) completing a block of 8, (3) completing the sheet of 64.
  - Check, layered within our rules: pen stroke draws (about 200 ms, `DUR.base`), a light impact haptic lands at the end of the stroke, a soft pencil sound (optional, off with the silent switch), the row's text settles to a lighter ink, the day's 正 gains a stroke, the count ticks. Five to six layers, all in ink, no particles.
  - Block of 8: the 3×3 gets its outer frame inked in one continuous stroke plus a success haptic.
  - Sheet of 64: a full-screen "printing" of the finished chart, ready to share or print. This is our Summit.
  - The 64 cells are already a level structure. Show position on it ("27번째 칸") rather than an abstract percentage.
  - Keep standard controls standard, as they did.

### R11. Any Distance — ADA Visuals and Graphics winner 2023

- **Apple's words [S]**: "delivers workout stats in a variety of eye-popping and easily shareable formats: dynamic charts and graphs, rotating 3D maps… And its in-app collectibles provide a fun incentive to go that extra mile."
- **The makers [S]**: the share card grew from the founder's own posts: "a photo in a mask… with the route and stats in a fun font. But people would ask, 'What app is making those?'" Privacy by default: route clipping on; an eye icon under each metric chooses what is shared. "We're building something for everyone, not just athletes."
- **Source**: https://developer.apple.com/design/awards/2023/ , https://developer.apple.com/news/?id=uiiopcl8
- **Adopt [P]**
  - The shared chart image (1080×1350) is our growth loop and our "what app made that?" moment. Give it poster-grade typography and a small, consistent signature.
  - Per-cell privacy when sharing: tap cells to blank them (the eye-icon idea), since goals are personal.
  - Year close: one collectible per year, the finished sheet with a printed date line (no stamp graphic), kept in the archive like a bound notebook.

### R12. Duolingo and Headspace — ADA Delight and Fun winner 2023; ADA Social Impact winner 2023

- **Apple's words [S]**: Duolingo: "a comprehensive redesign of both interface and content, making it even easier and more enjoyable to start". Headspace: "thoughtful design decisions, an incredible UI, and a recognizable, comfortable illustration style… remarkably easy to navigate (collections are clearly labeled with understandable purposes)".
- **The teams [S]**: Duolingo replaced a tree of many routes with one path: "Two people could spend the same number of hours… but end up in different places." "We're not an education company. We're a fun and motivation company." Headspace removed its category tabs after research, to "strip away that complexity"; the Today tab gives "one-tap access to activities… for morning, afternoon, and night". "There's still simplicity at the surface. But there's an incredible depth of content underneath."
- **Source**: https://developer.apple.com/design/awards/2023/ , https://developer.apple.com/news/?id=jhkvppla , https://developer.apple.com/news/?id=fkfnhq8u
- **Adopt [P]**
  - Both winners simplified navigation in the year they won. We have five tabs and one of them is an action. Test four destinations (홈, 만다라트, 오늘, 통계) plus a separate add control, and test whether 홈 and 오늘 should be one screen.
  - One path: after onboarding, the app should always know the next unfilled or undone thing and offer exactly that.
  - Headspace groups by time of day. Our Today could group by 아침, 낮, 저녁 only when the user has many items; otherwise stay flat.

### R13. Vocabulary, iA Writer, Guitar Wiz — the "quiet excellence" and accessibility references

- **Apple's words [S]**: Vocabulary (Visuals finalist 2025): "A subtle example of excellence… charming, consistent illustrations that create a clean visual style and rhythm throughout. Typography and iconography feel modern and balanced, themes are nicely varied, and the use of haptics is a nice touch. A lovely instance of an app that quietly does everything right." iA Writer (Interaction finalist 2025): "an array of intuitive interactions — like swiping right to access your library and left to preview a document". Guitar Wiz (Inclusivity winner 2026, solo developer): "Robust VoiceOver integration… also supports Dynamic Type, Increased Contrast, and Differentiate Without Color".
- **The developer [S]** (Guitar Wiz): with Increase Contrast on, the app "renders chord diagrams in black and white, maximizing contrast while keeping every note and finger position easy to read." Goal: "make the app feel inclusive without making accessibility feel separate from the main design." Klemens Strasser (Art of Fauna, Inclusivity winner 2025) recommends testing with Screen Curtain: "Forcing yourself to use your own app without looking at the screen can completely change your perspective."
- **Source**: https://developer.apple.com/design/awards/2025/ , https://developer.apple.com/design/awards/ , https://developer.apple.com/news/?id=5zi5a25j , https://developer.apple.com/news/?id=dgmr27r7
- **Adopt [P]**
  - "Quietly does everything right" is a legitimate route to a Visuals nomination. It names four things: consistent rhythm, balanced type and icons, varied themes, haptics. We have rhythm tokens; themes and haptics are underused.
  - Increase Contrast mode for the chart: pure black rules on white, area shown by a text initial or a corner pattern rather than a tint. This also solves Differentiate Without Color and the tinted-widget problem with one system.
  - VoiceOver on the 9×9: read a cell as "건강, 3번째 실천, 주 3회 운동, 이번 주 1/3" and offer block-level navigation (rotor or headings per block) so 81 cells are not 81 swipes.
  - Gestures like iA Writer's: swipe horizontally between the nine blocks in the zoomed 3×3; pinch out to return to the sheet.

### R14. CapWords, Opal, Denim, Focus Friend — small sensory details Apple names

- **Apple's words [S]**: CapWords (Delight winner 2025): "each flash card transition is accompanied by a real-world sound, a little tweak that enhances the sensory experience (and helps the word stick)." Opal (Social Impact finalist 2025): "fun touches like haptics when unlocking 'gems' deliver a charming way to create focus" and "widgets, Shortcuts, and easy-to-set-up customizations". Denim (Delight finalist 2025): "smooth scroll transitions and elegant text and mesh gradients… custom haptics". Focus Friend (Cultural Impact winner 2025): "this app's adorable cartoon Bean (who has some serious knitting skills)."
- **The makers [S]** (CapWords): "grounded in real-world physics: sound, touch, and sight cues." A confirmation micro-animation hides network latency.
- **Source**: https://developer.apple.com/design/awards/2025/ , https://developer.apple.com/articles/capwords/ , https://developer.apple.com/app-store/app-store-awards-2025/
- **Adopt [P]**
  - Apple's editors write about sound and haptics by name. We have `expo-haptics` in about 20 components and no sound. Add two or three real paper sounds (a pencil stroke, a page turn for the year change, a soft notebook-closing sound for the ledger close), all optional.
  - Focus Friend's lesson [R for the mechanic]: the 25 minutes produce something. Ours could ink one cell border slowly over the session, so the session leaves a visible mark on the sheet.
  - Use animation to cover waits (iCloud sync, PDF render) the way CapWords covers its API call.

### R15. Halide Mark II and Slopes — 2022 winners that use a physical or activity metaphor well

- **Apple's words [S]**: Halide (Visuals winner 2022): "its uncluttered, smartly organized UI mimics a film camera, and its every gesture will feel familiar to longtime photographers while remaining clear to those finding their way". Slopes (Interaction winner 2022): "Packed with a mountain of data but as easy to navigate as a nice green run".
- **The developer [S]** (Slopes, solo): "It's really easy to overwhelm with stats. You really have to pick what matters to tell the story." "I designed Slopes to be as human as possible because I view it as a journal for your memories."
- **Source**: https://developer.apple.com/design/awards/2022/ , https://developer.apple.com/news/?id=wq48r7mj
- **Adopt [P]**
  - Halide's test for a physical metaphor: would someone who has used the real object find every gesture familiar? Someone who has filled in a paper Mandal-Art sheet should recognise ours immediately: centre first, then the eight, copy each of the eight out to its own block. The automatic copy from the centre block to each outer block's centre is the moment that paper cannot do; animate it as the app's signature.
  - Stats as "a journal for your memories": year review should read like pages, not a dashboard.

### R16. Noteshelf — developer story 2026 (not an ADA winner; the closest material precedent)

- **The founder [S]**: shaped by 12 years in Japan and its stationery culture: "minimalist, yet incredibly well-crafted. Every item seemed designed to make writing, sketching, or planning more enjoyable." The design question: "How can we bring the essence of high-quality stationery into an app, while using the flexibility and power of modern technology?" They are "experimenting with ways to present this content the way you'd browse in a real stationery shop, while avoiding an overly skeuomorphic design." Liquid Glass shipped within days of iOS 26 on "toolbars, tab bars, buttons, and interface surfaces", for "an interface that feels lighter and more fluid while keeping the writing canvas calm and distraction-free."
- **Source**: https://developer.apple.com/news/?id=u8qjidrk
- **Adopt [P]**
  - This is the answer to "paper or modern?": both, in separate layers. Paper is the content layer; glass is the tool layer.
  - "The essence of high-quality stationery" is a better brief than "paper notebook". Good stationery is known for paper weight, ruling precision, a restrained two-colour print, and one beautiful detail (a ribbon, a corner). Pick our one detail.
  - Apple chose to publish a story about Japanese stationery culture in 2026. An editor will understand a Mandal-Art sheet pitched in the same terms.

### R17. Copilot Money — ADA Innovation finalist 2024

- **The team [S]**: "The app is fully native; we've just managed to take core UIKit components and mold them to what we want them to look like. That's why the app has such a unique look and feel. It's all native; we just tweak it a lot." "all the data is kept locally, so the app is really responsive." They used Swift Charts for interactive charts rather than building from scratch.
- **Source**: https://developer.apple.com/design/awards/2024/ , https://developer.apple.com/articles/copilot-money/
- **Adopt [P]**
  - The model for a distinctive look that still feels like iOS: native components, heavily tuned. For a React Native app this means native tab bar, native sheets with detents, native context menus and native navigation transitions, then our type and colour on top. Check the Expo SDK 56 docs for what is available before designing around it.
  - Local-first responsiveness is a selling point; say it.

### R18. App Store Awards 2022–2025 — what the yearly picks have in common

| Year | iPhone App of the Year | Other winners relevant to us | Apple's wording |
|---|---|---|---|
| 2025 [S] | Tiimo | Focus Friend, StoryGraph (Cultural Impact); Strava (Watch); Structured (iPad finalist) | Tiimo: "a timeline of soothing colors… a calming activity". StoryGraph: "rooted in… authenticity". |
| 2024 [S, search summaries] | Kino | Lumy (Watch); Moises (iPad); Oko, DailyArt, EF Hello, NYT Games among Cultural Impact | Lumy "helps users embrace the patterns of the sun and find the magic in each day." |
| 2023 [S, search summaries] | AllTrails | SmartGym (Watch); Pok Pok, Proloquo, Finding Hannah among Cultural Impact | Not read verbatim. |
| 2022 [S] | BeReal | GoodNotes 5 (iPad); Gentler Streak (Watch); How We Feel, Waterllama, Locket Widget (Cultural Impact) | GoodNotes: "the gold standard of digital notetaking got even better". Waterllama: "gentle guidance and adorable characters". How We Feel: "engage more deeply with our emotions". |

Sources: https://developer.apple.com/app-store/app-store-awards-2025/ , https://developer.apple.com/news/?id=c6jwep5j , https://9to5mac.com/2024/12/11/app-store-awards-winners-2024/ , https://www.tomsguide.com/computing/mobile-apps/nyt-games-recognized-in-apple-app-store-awards-2024-see-all-the-winners-here , https://9to5mac.com/2023/11/29/2023-app-store-award-winners/

Patterns:

- The App Store Awards describe **how an app made people feel that year** ("calming", "authentic", "gentle", "magic in each day"), more than features. The ADA text describes craft.
- A planner won the top iPhone award in 2025, and a second planner was a finalist on iPad. The category is currently in favour, and also crowded with two strong incumbents that share a look.
- The path is multi-year: Tiimo was an ADA finalist in 2024, then App of the Year in 2025. Structured was a 2025 App Store finalist, then a 2026 ADA finalist. Gentler Streak: 2022 Watch App of the Year, 2023 ADA finalist, 2024 ADA winner. Sustained updates matter.
- Apple avoided crowning a chatbot each year, while praising quiet on-device AI inside otherwise human products (Structured's task pre-fill, Harvee, Hearing Buddy). [S for the citations; the "avoided" framing is from press coverage summaries]

---

## 5. ADA results at a glance, planner-adjacent apps only [S]

| Year | App | Result | Trait Apple named |
|---|---|---|---|
| 2022 | (Not Boring) Habits | Delight and Fun winner; Visuals finalist | "playful haptics, and elegant gamification" |
| 2022 | Halide Mark II | Visuals winner | "mimics a film camera" yet "uncluttered" |
| 2022 | Slopes | Interaction winner | "Packed with… data but as easy to navigate as a nice green run" |
| 2023 | Flighty | Interaction winner | "mirrors time-honored airport design conventions" |
| 2023 | Headspace | Social Impact winner | "recognizable, comfortable illustration style" |
| 2023 | Duolingo | Delight and Fun winner | "comprehensive redesign" |
| 2023 | Any Distance | Visuals winner | "eye-popping and easily shareable formats" |
| 2023 | Gentler Streak | Visuals finalist | (no description on page) |
| 2024 | Bears Gratitude | Delight and Fun winner | "thoughtfully considered touchpoints" |
| 2024 | Crouton | Interaction winner | "organization and information hierarchy" |
| 2024 | Gentler Streak | Social Impact winner | "subtle and consistently pleasing design language" |
| 2024 | Tiimo | Inclusivity finalist | (no description on page) |
| 2024 | How We Feel, Ahead | Social Impact finalists | (no description on page) |
| 2024 | Sunlitt | Visuals finalist | (no description on page) |
| 2024 | Copilot Money | Innovation finalist | (no description on page) |
| 2025 | Vocabulary | Visuals finalist | "quietly does everything right" |
| 2025 | Lumy | Delight finalist | "carefully curated color palette, and elegant widgets and Live Activities" |
| 2025 | iA Writer, Mela | Interaction finalists | swipe interactions; cooking mode dims and highlights |
| 2025 | Opal, Evolve | Social Impact finalist; Inclusivity finalist | haptics on "gems"; "friendly and straightforward tone, inclusive language" |
| 2026 | grug | Delight and Fun winner | "scribbled design… clever simplicity" |
| 2026 | Moonlitt | Interaction winner | "best-in-class Liquid Glass integration, and easy onboarding" |
| 2026 | Tide Guide | Visuals winner | "palette… designed to match the color of the sky" |
| 2026 | Guitar Wiz | Inclusivity winner | VoiceOver, Dynamic Type, Increased Contrast, Differentiate Without Color |
| 2026 | Structured | Inclusivity finalist | "Visually sharp and easy to scan" |
| 2026 | (Not Boring) Camera | Visuals finalist | "giant buttons and haptic scroll wheels" |

Sources: https://developer.apple.com/design/awards/ , https://developer.apple.com/design/awards/2025/ , https://developer.apple.com/design/awards/2024/ , https://developer.apple.com/design/awards/2023/ , https://developer.apple.com/design/awards/2022/

---

## 6. Checklist: what a small planner must show to be feature-worthy

Grouped by Apple's own seven factors. Each line is a yes or no question. Items marked ● are not true of 만다라트 today.

**A. Uniqueness and story**

- [ ] ● One sentence in the Tiimo shape exists, and the first screen proves it.
- [ ] ● One hero object that explains the product (the 3×3 block) appears on Home, in onboarding, in the icon, in the widget and in the first screenshot.
- [ ] A real-world reference with its own rules (the printed sheet, the ledger, the 正 tally) is used for information design, not only texture.
- [ ] ● A signature interaction that paper cannot do (centre block copying itself out to the eight blocks; a block inking closed at 8/8).
- [ ] The maker's story is written down for the nomination: who, why a Mandal-Art sheet, why free and local.

**B. User experience**

- [ ] ● Home answers "what now?" above the fold with at most 3–5 actions.
- [ ] ● Tab bar holds destinations only; adding is a separate control.
- [ ] ● One glyph system per screen; every secondary datum earns its place.
- [ ] Onboarding is the product: write the centre goal within 10 seconds of first launch, no account, no tour.
- [ ] A clear "enough for today" state.
- [ ] Empty, error, sync-conflict and offline states are designed ("we really have to shine when things go awry").

**C. UI design and craft**

- [ ] ● Native iOS 26 chrome: system tab bar and sheets with Liquid Glass; no glass in the content layer; custom bar backgrounds removed.
- [ ] ● Layered feedback on the check (stroke, haptic, sound, tally, count), on 8/8 and on 64/64.
- [ ] Motion follows tokens; Reduce Motion swaps movement for fades.
- [ ] ● Body text at or near 17 pt in lists; 11 pt only for labels inside chart cells; the daily screen is not built on the minimum size.
- [ ] Haptics have one meaning each and can be turned off.
- [ ] ● A dark appearance that is designed as a "night desk", not inverted paper.
- [ ] ● Layered Icon Composer icon built from a few filled shapes; holds up in default, dark, clear and tinted.

**D. Apple technologies ("Innovation")**

- [ ] Widgets in at least small and medium, with dynamic content, 16 pt margins, text 11 pt or larger, legible in tinted and clear modes without colour.
- [ ] ● Widget is not a mini copy of the app; it shows today's next action or the 3×3 of the focus area.
- [ ] Live Activity for the focus timer: heavy numerals, ends immediately, 15–30 minute dismissal, in-app off switch, App Shortcut to start.
- [ ] Siri and Shortcuts: "오늘 할 일 보여줘", "집중 시작", "실천 체크".
- [ ] iCloud sync that is invisible when it works and honest when it does not.
- [ ] iPad layout that uses the width (sheet and list side by side), not a stretched phone.
- [ ] Print and PDF as a first-class output with real print typography.

**E. Accessibility**

- [ ] VoiceOver: all common tasks, including the 9×9 with block-level navigation.
- [ ] Voice Control: every control has a speakable name.
- [ ] ● Larger Text: 200% or more across common tasks, with layouts that reflow (chart cells truncate into a list view at large sizes) instead of caps.
- [ ] Dark Interface.
- [ ] ● Differentiate Without Color: areas identified by position, initial or pattern as well as colour.
- [ ] Sufficient Contrast, including an Increase Contrast variant of the chart.
- [ ] Reduced Motion.
- [ ] Labels declared in App Store Connect and repeated in the nomination's Helpful Details.

**F. Localization**

- [ ] ko, ja, en reviewed by native readers; no translated-from-Korean phrasing in ja or en.
- [ ] ● Culturally fitted examples and screenshots per market (the Mandal-Art chart is widely known in Japan through a famous baseball player's school-age chart [R]; use that familiarity in the ja product page without naming or implying endorsement).
- [ ] 正 tally explained once for en users, kept as is for ko and ja.
- [ ] Localized screenshots, subtitle, keywords and preview for each language.

**G. Product page and nomination**

- [ ] ● A distinctive name; the generic word goes in the subtitle or keywords.
- [ ] ● Screenshot 1 = the idea (one goal becoming a 3×3 becoming today's list), not the densest screen. Screenshots 2–3 = Today and the finished sheet. Then widget and Lock Screen, focus Live Activity, print, iPad, dark mode.
- [ ] ● A 15–30 second preview whose first 3 seconds show the sheet filling in.
- [ ] Subtitle within 30 characters naming the use, not a superlative.
- [ ] First sentence of the description carries the whole pitch.
- [ ] ● App Launch nomination filed at least 3 weeks before release, with description, regions (KR, JP first), a TestFlight public link, a short press page and the accessibility and team notes.
- [ ] A second nomination (App Enhancements) planned for the first substantial update.
- [ ] Rating prompt only after a meaningful success (a block completed), never on first days.

---

## 7. Pitfalls

1. **Imitating Tiimo or Structured.** Pastel timeline planners are now two incumbents deep. Apple's factor is "a fresh approach to a familiar category." Our difference is the sheet.
2. **Treating the ban list as the design direction.** Removing gradients, cards and emoji prevents the generic look. It does not create appeal. Something has to be added back on our own terms: ink behaviour, sound, one signature motion, one colour moment.
3. **Half skeuomorphism.** Paper texture bitmaps, torn edges, fake shadows under sheets. Noteshelf, a stationery app, explicitly avoids "an overly skeuomorphic design". Borrow the rules and the behaviour of paper, not photographs of it.
4. **Fake glass.** A JS blur behind a custom tab bar, or glass panels inside content. HIG: "Don't use Liquid Glass in the content layer." Use the system's bars or stay flat.
5. **Capping Dynamic Type and then claiming accessibility.** The Larger Text label has a number (200%). Either reflow or do not claim it.
6. **Colour as the only code.** Eight area colours fail in tinted widgets, in Increase Contrast, for colour-blind users, and in the Lock Screen's vibrant mode.
7. **Streak shaming.** The awarded tone is Gentler Streak's. Red gaps, broken chains and guilt notifications work against the pitch.
8. **A mascot or illustrations bolted on for "delight".** In every awarded case the character has a job (Yorhart interprets data, the Bean is the timer) or the art came first (Bears).
9. **AI as award bait.** Apple praised small, on-device assistance inside human products. A chat panel in a paper planner would cut against our own story.
10. **Haptics and sound everywhere.** HIG: a haptic "can feel just right when it happens occasionally, but become tiresome when it plays frequently." Reserve the strong ones for 8/8 and 64/64.
11. **Leading the store page with the 81-cell grid.** It is our most impressive screen to us and the least legible at search-result size.
12. **Widgets that mirror the app, or Live Activities that linger.** Both are called out in the HIG.
13. **Over-reading Apple's editorial copy.** The citations are short marketing paragraphs. They show what Apple chooses to praise; they are not a rubric, and Apple says there is "no checklist".
14. **Novelty navigation.** Tide Guide's developer credits moving away from "crazy elements, non-standard navigation." Bears Gratitude's card flip is "definitely a nonstandard UX" and worked because it was the first thing users did anyway. Break convention only where testing shows people already reach for it.

---

## 8. What I could not verify

- **Apple Newsroom pages** for the 2022–2026 ADA and 2022–2025 App Store Awards (`www.apple.com`) were blocked. ADA facts come from `developer.apple.com/design/awards/` (current page = 2026) and its year pages, which I did read. The 2026 page lists Tide Guide as Visuals and Graphics winner and Interaction finalist; one automated read described it as winning both, which I believe is a reading error.
- **App Store Awards 2023 and 2024**: the developer-site year pages now redirect to 2025, so winners for those two years (AllTrails; Kino, Lumy, Moises and the Cultural Impact lists) come from search-result summaries, not Apple's text. The 2024 Cultural Impact list differed between sources.
- **Finalist descriptions for ADA 2022–2024** are not on Apple's pages. Tiimo's 2024 finalist text, How We Feel, Ahead, Sunlitt and Copilot Money therefore have no verbatim Apple wording here.
- **Visual specifics of Tiimo and Structured** (timeline shape, icon capsules, countdown disc, palettes) are recalled, not read. No designer-written teardown with sizes or colours turned up before the search budget ended.
- **No screenshots were seen** for any reference app. Nothing here is a first-hand visual observation except the three 만다라트 screenshots.
- **Korean and Japanese sources were not searched** (the shared search budget was exhausted). Missing: Korean and Japanese indie developers' accounts of being featured on 오늘의 앱 / Today, local App Store editorial habits, and how Mandal-Art apps are positioned in the Japanese store. This is the largest gap for a ko and ja first launch.
- **A New-Year "goals" editorial theme** on the App Store is my recollection of a recurring seasonal pattern, not something read this session.
- **The claim that the Mandal-Art chart is widely known in Japan via a baseball player's chart** is recalled, not checked.
- **How ADA finalists are chosen** (no public entry form; Apple selects) is recalled, not read.
- **John Gruber's commentary** on the 2025 App Store Award winners (https://daringfireball.net/2025/12/2025_app_store_award_winners) appeared in search results but could not be opened; it may contain critical views of the winners' design quality that would balance this memo.
- **Expo SDK 56 support for native tab bars, Liquid Glass and Icon Composer icons** was not checked against the versioned Expo docs. Section 4 R17 and the checklist assume it is feasible; confirm before committing.
- **Focus Friend's mechanic** (a bean that knits while you focus) is partly from Apple's one-line citation and partly recalled.

---

## 9. Source list

Apple, read directly:

- ADA 2026 winners and finalists, category definitions: https://developer.apple.com/design/awards/
- ADA 2025: https://developer.apple.com/design/awards/2025/
- ADA 2024: https://developer.apple.com/design/awards/2024/
- ADA 2023: https://developer.apple.com/design/awards/2023/
- ADA 2022: https://developer.apple.com/design/awards/2022/
- App Store Awards 2025: https://developer.apple.com/app-store/app-store-awards-2025/
- App Store Awards 2022: https://developer.apple.com/news/?id=c6jwep5j
- Getting featured: https://developer.apple.com/app-store/getting-featured/
- Nominate your app for featuring: https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring/
- Product page: https://developer.apple.com/app-store/product-page/
- Accessibility Nutrition Labels: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/
- Developer stories index: https://developer.apple.com/developer-stories/
- Tiimo: https://developer.apple.com/articles/tiimo/
- Structured founder (solo developers): https://developer.apple.com/articles/start-small-code-big/
- grug: https://developer.apple.com/news/?id=ux44ymcr
- Tide Guide: https://developer.apple.com/news/?id=4r9b23wx
- Moonlitt: https://developer.apple.com/news/?id=v1nphz91
- Sunlitt: https://developer.apple.com/articles/sunlitt/
- Bears Gratitude: https://developer.apple.com/news/?id=i74v3f4r
- Gentler Streak: https://developer.apple.com/news/?id=3m0ht22s
- Crouton: https://developer.apple.com/news/?id=9x75y43e
- Flighty: https://developer.apple.com/news/?id=970ncww4
- (Not Boring): https://developer.apple.com/news/?id=9ab1g4r3
- Any Distance: https://developer.apple.com/news/?id=uiiopcl8
- Duolingo: https://developer.apple.com/news/?id=jhkvppla
- Headspace: https://developer.apple.com/news/?id=fkfnhq8u
- Guitar Wiz: https://developer.apple.com/news/?id=5zi5a25j
- Art of Fauna: https://developer.apple.com/news/?id=dgmr27r7
- CapWords: https://developer.apple.com/articles/capwords/
- Slopes: https://developer.apple.com/news/?id=wq48r7mj
- Noteshelf: https://developer.apple.com/news/?id=u8qjidrk
- Copilot Money: https://developer.apple.com/articles/copilot-money/
- Sago Mini Jinja's Garden (restraint): https://developer.apple.com/news/?id=3t6o5jec
- Jordi Bruin (scope): https://developer.apple.com/news/?id=77glyihi
- Monzo (Liquid Glass on day one): https://developer.apple.com/news/?id=1q3azf1j
- Going global: https://developer.apple.com/articles/global-success/
- WWDC25 Design foundations from idea to interface: https://developer.apple.com/videos/play/wwdc2025/359/
- WWDC25 Get to know the new design system: https://developer.apple.com/videos/play/wwdc2025/356/
- WWDC25 Make a big impact with small writing changes: https://developer.apple.com/videos/play/wwdc2025/404/
- WWDC24 What's new in App Store Connect: https://developer.apple.com/videos/play/wwdc2024/10063/
- HIG data read: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/widgets.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/live-activities.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/app-icons.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/playing-haptics.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/charting-data.json

Seen in search results only (not opened):

- https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/
- https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/
- https://www.macstories.net/news/2026-apple-design-awards-winners-announced/
- https://www.macrumors.com/2025/12/04/apple-announces-2025-app-store-award-winners/
- https://9to5mac.com/2024/12/11/app-store-awards-winners-2024/
- https://www.tomsguide.com/computing/mobile-apps/nyt-games-recognized-in-apple-app-store-awards-2024-see-all-the-winners-here
- https://9to5mac.com/2023/11/29/2023-app-store-award-winners/
- https://www.macstories.net/news/apple-announces-the-2022-app-store-awards/
- https://www.getinflow.io/post/best-alternatives-tiimo-adhd
- https://www.iphone-ticker.de/apple-design-awards-deutsche-app-structured-im-finale-278138/
- https://daringfireball.net/2025/12/2025_app_store_award_winners
- https://www.tiimoapp.com/resource-hub/tiimo-winner-2025-app-store-awards
