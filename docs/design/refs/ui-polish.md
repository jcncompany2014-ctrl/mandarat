# UI craft: what separates premium from amateur, as a checklist we can audit against

Research date: 2026-11-14. Scope: general interface craft (spacing, alignment, hierarchy, colour restraint, lines, radii, elevation, icons, tab bar, empty and loading states, density, depth and delight), turned into rules with a measurable test each. Platform language (Liquid Glass, iOS 27) is owned by `ios-design-language.md`, motion by `motion-feedback.md`, paper and print by `stationery-print.md`. This memo links to them instead of repeating them.

**How to read the labels**

- **[S]** = read in a source during this session (link given). Quotes came through a fetch tool that summarises pages, so spot-check any quote before it goes into public copy.
- **[R]** = recalled from general knowledge (to mid-2026), not opened this session. No link is given for these, on purpose.
- **[M]** = measured today in this repo (a grep or arithmetic on our tokens).
- **[A]** = taken from our own audits in `docs/design/audit/` (IDs such as HL-01, CI-09).
- **[P]** = my proposal. Thresholds in proposals are mine, not sourced.

**Source limits (important).** The shared web-search budget was already used up, so I ran no searches at all. Of the hosts I tried, only `developer.apple.com` resolved; `medium.com`, `www.learnui.design`, `linear.app`, `anthonyhobday.com` and `interfaces.rauno.me` did not. So every Apple statement below is [S] and everything from Refactoring UI, Erik Kennedy, Anthony Hobday, Rauno Freiberg, Vercel, Linear, Things, Arc, Airbnb, Material Design, NN/g, Tufte and Few is [R]. I saw no screenshot of any other app. Apple's HIG pages render with JavaScript, so links of the form `…/tutorials/data/design/human-interface-guidelines/<page>.json` are the data behind the public HIG page of the same name.

---

## 1. Summary

1. **The build does not fail on taste. It fails on system.** The counts are the finding: 29 font sizes [A], 25 spacing values across 606 literal declarations and no spacing tokens [M], 13 literal corner radii plus one computed [M], 9 icon sizes with 7 stroke values [A], 8 pressed opacities [A], 6 row heights [A], 6 ways to draw a selection in one sheet [A], 4 header anatomies on 4 tabs [A], and 1 rule weight used 20 to 43 times per page [A]. Every source in this memo, Apple's included, describes premium as a small fixed set of values applied without exception. Section 2 sets our counts beside the norm.
2. **Apple's 2026 wording is aimed straight at our direction.** "When we say simple, we don't mean minimal." "Clarity is built with hierarchy, using order, spacing, and contrast to guide people to what's most important." [S] Our bans removed decoration, which was right, but they also removed surface contrast, line contrast and most size contrast, and put nothing in their place. Of Apple's three tools we use one (order).
3. **Hierarchy should come from weight and tone before size.** Apple: "Adjust font weight, size, and color as needed to emphasize important information" and "Use style — not size — to visually distinguish the preferred choice among multiple options." [S] Refactoring UI makes the same point as its first rule [R]. Today grey 13pt text is both caption and action [A CI-03], which breaks the one rule that makes tone-based hierarchy work: grey is never interactive.
4. **Colour needs one job each and a budget.** "Avoid using the same color to mean different things." "When every element is tinted, nothing stands out." [S] Gold currently means today, primary action, Stats fill and focus [A]; an area colour means "scheduled" in the editor and "done" in the week strip [A CI-02].
5. **Lines need a hierarchy, and fewer of them.** Apple lists three grouping tools: "negative space, container shapes, or separator lines" [S]. We use only the third, at one weight and 1.19:1 contrast [A].
6. **Shapes: three or four radii, nested concentrically.** "…concentric shapes calculate their radius by subtracting padding from the parent's." [S] A square content layer is concentric for free; the scattered rounded controls are where we break it.
7. **Depth without kitsch is available and sourced:** a tone step between two papers, one real shadow reserved for things that truly float, content passing beneath a floating bar, and press states that answer on touch-down. None of these is a gradient or a glow (section 5).
8. **Tab bar:** destinations only, and Apple warns specifically about a Home tab that repeats the other tabs: "If this is your app, consider removing the Home tab altogether." [S] Our Home repeats Today, Stats and the chart [A HL-06].
9. **Empty, sparse and dense states are where amateur shows first.** Stats draws three cells in the corner of a 350×220pt area for any new user [A HL-03] and runs past 2,600pt with ten equal sections [A HL-07]. Apple: "only the most important information should become a chart" and "Design for a variety of scenarios in your data." [S]
10. **Two honest gaps.** The HIG text does not publish iOS list row heights, bar heights or screen margins (I checked the layout, lists, tab bar and UIKit margin pages) [S]; the familiar 44 / 49 / 16–20pt figures are [R] and pre-date iOS 26. And the non-Apple teardown literature the brief asked for (Linear, Things, Arc, Airbnb) could not be opened, so those entries are recall and marked as such.

---

## 2. Where we stand, as counts

| Dimension | Today | Norm in the sources | Our source for "today" |
|---|---|---|---|
| Font sizes | 29 in code; 8, 9, 10 and 15 on the four tabs; smallest 9pt | System scale has 10 sizes at the default setting; minimum 11pt [S] | audit/typography |
| Text without a line height | 162 of 320 declarations | Every style is a size plus a leading [S] | audit/typography |
| Spacing values | 25 distinct (0–40) in 606 literals; tokens: `dot 18, row 54, gutter 20, sectionTop 24` | One scale of about 8–10 steps [R] | [M] grep of `padding*`, `margin*`, `gap` |
| Row heights | 44, 48, 52, 54, 56, 60 | 2 | HL-20 |
| Left edges | chart at x=11, body at 20, display numerals at 23–28 | 1 gutter [S, R] | HL-17, HL-19 |
| Header anatomy | title top at y=12, 16, 18, 31 on the four tabs | identical | HL-05 |
| Rule weights | 1 (`line`, 1.19:1), 20–43 full-width rules per page | 3 levels; control edges at 3:1 or more [R, P] | HL-01, CI-08 |
| Corner radii | 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, size×0.28 | 3 shape types [S] | [M] grep, CI-14 |
| Surface tones (light) | paper `#FBF9F4` vs surface `#FFFFFF` = 1.05:1 | a visible step between levels [S, R] | [M] from `moods.ts` |
| Hue of chrome | paper 43°, ink 33°, sub 38°, gold 39° | each ink has a job (stationery memo) | [M] from hex values |
| Icon sizes / strokes | 9 / 7; rendered stroke 1.27–2.1px | "the same stroke weight in every icon" [S] | CI-17 |
| Pressed states | 108 raw `Pressable`, 8 opacities | "Always include a press state", instantly [S] | CI-09 |
| Selection idioms | 6 in the cell editor | "things that look the same should behave the same" [S] | CI-02 |
| Text-action styles | 7, several in caption grey | 1–2 | CI-03 |
| Page length | Stats over 2,600pt, Settings about 2,600pt | sessions of "a minute or two" [S] | HL-07, HL-13 |

---

## 3. References

### 3A. Verified this session (Apple)

#### R1. "Principles of great design" (WWDC26, session 250) [S]

- **What it is.** Apple's current statement of principles: Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight. It is the most recent first-party definition of "craft" we can cite.
- **What exactly is good.**
  - Simplicity: "When we say simple, we don't mean minimal." "If you bury all your functionality inside a single place, that might make your interface look more minimal, but it doesn't make it simple." "In a simple interface, every element earns its place."
  - Hierarchy: "Clarity is built with hierarchy, using order, spacing, and contrast to guide people to what's most important." "When your hierarchy is strong, the most important item on the screen is always the most obvious one." A clear screen answers: "What do I pay attention to? What can I interact with? And how do I interact?"
  - Craft: "Craft is the attention to detail that tells people you really care about the experience you're giving them." The amateur tells it names: "You tap a button and you just have to wait for it do something. Scrolling is jittery. Icons are misaligned. You rotate your phone, and the layout gets all messed up."
  - Delight: "The way to make a design delightful isn't by adding confetti or tacking on extra flourishes at the end of your process." It comes from "identifying the emotion you want your audience to feel" and reinforcing it.
  - Familiarity: "Simply put, things that look the same should behave the same."
- **Link.** https://developer.apple.com/videos/play/wwdc2026/250/
- **How we adopt.** Use the three questions as a per-screen review: on Home, the 9×9, the 3×3, Today and Stats, write down the one thing to look at, mark every tappable element, and check a stranger can tell them apart. Today the answer to the second question fails across the app [A CI-03]. Pick one emotion for the product (the awards memo suggests calm, non-punishing progress) and test each designed moment against it.

#### R2. HIG Typography and "The details of UI typography" (WWDC20) [S]

- **What it is.** The numbers for type on iOS and the reasoning behind them.
- **What exactly is good.**
  - Sizes: default 17pt, minimum 11pt. "In general, avoid light font weights": prefer Regular, Medium, Semibold or Bold. "Minimize the number of typefaces you use."
  - The system scale at the default setting, size/leading: Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3 20/25, Headline 17/22 (Semibold), Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18, Caption 1 12/16, Caption 2 11/13. That is 10 sizes for a whole operating system. The leading ratio rises as the size falls: 1.21 at 34pt, 1.29 at 17pt, 1.38 at 13pt (my arithmetic on Apple's table).
  - Dynamic Type range: Body runs 14/19 (xSmall) to 53/62 (AX5); Caption 2 runs 11/13 to 40/48; Large Title 31/38 to 60/70.
  - Hierarchy without new sizes: "Emphasized text styles like these allow you to use the same text style sizes with a different weight."
  - Tracking: "If you have to work with custom tracking in your UI, remember that it should be size specific, otherwise a tracking you provided for small sizes may not look good on large sizes." Apple's own SF table changes at every point size (for example 11pt +0.06pt, 17pt −0.43pt, 20pt −0.45pt, 28pt +0.38pt, 80pt 0). The numbers are specific to SF; the principle is not.
  - Leading: "tight leading decreases the line height by two points, while loose leading increases the line spacing by two points." Body at 20pt line height was "too tight for such a long paragraph"; 24pt "does look much better".
  - Scaling: "don't truncate text as it grows", "scale glyphs that appear next to text" (WWDC19 session 244). HIG Accessibility: "give people the option to enlarge text by at least 200 percent."
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json · https://developer.apple.com/videos/play/wwdc2020/10175/ · https://developer.apple.com/videos/play/wwdc2019/244/
- **How we adopt.** The seven-step scale in `src/theme/type.ts` (56/26/18/16/13/11) is sound; enforcement is the problem. Three concrete moves: every text style carries an explicit line height (162 do not [A]); nothing below 11pt, including weekday captions at 10pt [A CI-12]; replace the two-step tracking rule (−0.4 from 20pt, −0.2 from 15pt) with a table per type role. For reference, Inter's published "dynamic metrics" curve, which Pretendard's Latin follows, is tracking(em) = −0.0223 + 0.185·e^(−0.1745·size) [R]; that gives about −0.18pt at 16, −0.26pt at 18, −0.53pt at 26 and −1.25pt at 56, so our current values are already close for Latin. Hangul leading and tracking are covered in `korea-japan.md` section E.

#### R3. HIG Accessibility and "UI Design Dos and Don'ts" [S]

- **What it is.** The measurable floor.
- **What exactly is good.**
  - Controls: 44×44pt default, 28×28pt minimum on iOS. "Consider spacing between controls as important as size": "about 12 points of padding around elements that include a bezel. For elements without a bezel, about 24 points of padding works well around the element's visible edges."
  - Contrast (the values Accessibility Inspector uses): 4.5:1 for text up to 17pt, 3:1 from 18pt or for bold. Dark Mode page: "strive for a contrast ratio of 7:1, especially in small text."
  - "Convey information with more than color alone."
  - Dos and Don'ts: 44pt targets, 11pt text, "Align text, images, and buttons to show users how information is related", "puts controls close to the content they modify".
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json · https://developer.apple.com/design/tips/ · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/dark-mode.json
- **How we adopt.** Target sizes already pass [A]. What fails is the edge of controls (1.19:1 where 3:1 is the usual non-text threshold [R: WCAG 1.4.11]). The spacing rule has not been measured; a likely fail is the action-sheet header, where the bare pencil and the close circle are roughly 15pt apart by my arithmetic on the coordinates in CI-13 (re-measure before acting).

#### R4. HIG Layout and "Design foundations from idea to interface" (WWDC25, session 359) [S]

- **What it is.** Apple's rules for ordering, aligning and grouping, with a worked before/after on a fictional app.
- **What exactly is good.**
  - "…place the most important items near the top and leading side of the window or display."
  - "Align elements to make them easier to scan, and use indentation to convey hierarchy… People assume that aligned items are related to each other, and conversely, they perceive indented items as subordinate."
  - "Group related items… you might use negative space, container shapes, or separator lines."
  - "Use progressive disclosure to make layouts cleaner and easier to interact with."
  - The session's diagnosis of its own first draft: "What's missing here is visual hierarchy." The fix: "making what's most important larger or higher in contrast, so it naturally draws attention first."
  - Lists over grids for structured text: a list "takes up less vertical space than images, which means more items can fit on the screen at once."
  - Tabs: "each extra tab means one more decision for people to make"; "tabs are for navigation, not for taking action."
  - Testing: "Preview your app on multiple devices, using different size classes, localizations, and text sizes… first testing versions of your experience that use the largest and the smallest layouts."
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json · https://developer.apple.com/videos/play/wwdc2025/359/
- **How we adopt.** We group with one of the three tools. Add the other two: negative space (more room around a group than inside it) and a container shape that the app already owns, the 2px ink frame of the chart [A HL-01 proposes this]. Indentation is free hierarchy for the 8 areas → 64 actions relationship and is not used on Home's ledger.
- **Note.** The HIG layout page states no iOS margin or row-height numbers; it defers to system layout guides. Apple's design kit is the place to take them from (`ios-design-language.md` B1).

#### R5. "Get to know the new design system" (WWDC25, 356), "Build a SwiftUI app with the new design" (323), "Adopting Liquid Glass" [S]

- **What it is.** The geometry rules of the current system.
- **What exactly is good.**
  - "Instead of relying on decoration, hierarchy should be expressed through layout and grouping."
  - Three shape types: "fixed shapes have a constant corner radius. Capsules use a radius that's half the height of the container. And concentric shapes calculate their radius by subtracting padding from the parent's." "The concentric value adapts when nested, and the fallback kicks in when the component stands alone."
  - Optical correction is part of the system: "views are mathematically centered when it makes sense — and subtly offset when it doesn't."
  - Fewer hard lines: scroll edge effects are "replacing hard dividers with subtle blur to reduce clutter and keep UI legible."
  - On custom chrome: "We've all added extra backgrounds or borders to give buttons the right weight… making customizations like these unnecessary." "If your bar is feeling too crowded, use it as a cue to remove anything unnecessary."
  - Tint: "use this to convey meaning, like a call to action or next step, but not just for visual effect."
  - Sheets: "check for content and controls that might appear too close to rounder sheet corners."
  - The same rule in widgets and Live Activities: widget margins "16 points for most widgets", 11 when tight; "Shape corners that sit close to the edges of your widget should appear concentric with the widgets corner radius"; Live Activity margin 14pt with "even, matching margins between rounded shapes and the edges". "We recommend only including a max of four pieces of information in the small widget size."
- **Links.** https://developer.apple.com/videos/play/wwdc2025/356/ · https://developer.apple.com/videos/play/wwdc2025/323/ · https://developer.apple.com/tutorials/data/documentation/technologyoverviews/adopting-liquid-glass.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/widgets.json · https://developer.apple.com/videos/play/wwdc2020/10103/ · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/live-activities.json
- **How we adopt.** A radius token file with three kinds only: paper (0–2), tool (capsule, or one fixed value), nested (outer minus gap, floor 0). Concentricity only matters when a child sits closer to the parent's corner than the parent's radius; for a child far from any corner the fixed fallback applies. Check in particular: a selected-tab highlight inside the bar, a button near a sheet corner, the check box inside a rounded row highlight, and every shape near a widget corner.

#### R6. Colour restraint: HIG Color, HIG Branding, "Meet Liquid Glass" (WWDC25, 219), "Communicate your brand identity on iOS" (WWDC26, 251) [S]

- **What it is.** The platform's rules for how much colour, where, and meaning what.
- **What exactly is good.**
  - "Avoid using the same color to mean different things… if you use your brand color to indicate that a borderless button is interactive, using the same or similar color to stylize noninteractive text is confusing."
  - "Apply your app's accent color judiciously. Using your brand color too broadly can overwhelm your interface and dilute its impact. Minimize its use on controls and instead use it intentionally for primary actions or status indicators."
  - "Tinting should only be used to bring emphasis to primary elements and actions in the UI." "Avoid tinting all your elements. When every element is tinted, nothing stands out." "To emphasize primary actions, apply color to the background rather than to symbols or text."
  - Size matters: "Prefer using color in bold text and large areas. Color in lightweight text or small areas can make them harder to see and understand." (written for visionOS; the reasoning is general)
  - The other half, from 2026: "Aim to use color in ways that create meaning such as portraying hierarchy, groupings, or indicating interaction." "Don't be afraid to use color in your app!" "use it sparingly and with intention so it has the biggest impact." Colour belongs in the content layer.
  - "Avoid offering an app-specific appearance setting."
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/color.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/branding.json · https://developer.apple.com/videos/play/wwdc2025/219/ · https://developer.apple.com/videos/play/wwdc2026/251/
- **How we adopt.** Write a one-line contract per colour and audit every screen against it [P]: ink = text and "chosen"; one signal colour = today/now only; area colour = which area, and filled = done; red-family = destructive only. Move the primary button to ink (14.25:1) as CI-07 proposes, so the signal colour is rare enough to mean something. Show area colour at sizes where it can be seen: cell fills, the zoomed 3×3 header, index tabs. A 7–9pt square is exactly the "small area" Apple warns about, and two of our pairs differ by 1.04:1 and 1.12:1 in luminance [A CI-05]. Our five in-app "종이" themes, one of them dark, are an app-specific appearance setting; decide deliberately whether dark follows the system.

#### R7. Icons as a family: HIG Icons, HIG SF Symbols, "Designing Glyphs" (WWDC17, 823) [S]

- **What it is.** How to make a set of glyphs read as one hand.
- **What exactly is good.**
  - "All interface icons in your app need to use a consistent size, level of detail, stroke thickness (or weight), and perspective. Depending on the visual weight of an icon, you may need to adjust its dimensions to ensure that it appears visually consistent." Figure caption: "use the same stroke weight in every icon."
  - "In general, match the weights of interface icons and adjacent text."
  - Optical centring: "Some icons — especially asymmetric ones — can look unbalanced when you center them geometrically instead of optically… Adjustments for optical centering are typically very small, but they can have a big impact." The session's method: "you can bake this padding right into the asset."
  - Optical size: "Because the elliptical shape of messages and the narrow shape of phone have less surface area, we can use scale to achieve this optical balance."
  - What a mixed set looks like: "because they don't share a consistent line weight, some look more emphasized than others… they just don't family well."
  - Variants: fill gives "more visual emphasis, making it a good choice for iOS tab bars and swipe actions"; outline "works well in toolbars, lists, and other places where you display a symbol alongside text"; an enclosing shape "can improve legibility at small sizes".
  - Standard verbs keep standard glyphs: the share "sharrow" (WWDC17 session 802), "Use the standard Back and Close buttons" (HIG Toolbars), and taking "creative liberty with the delete icon" loses "that immediate recognition" (WWDC26 session 250).
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/icons.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sf-symbols.json · https://developer.apple.com/videos/play/wwdc2017/823/ · https://developer.apple.com/videos/play/wwdc2017/802/
- **How we adopt.** Three sizes (16 inline, 20 row, 24 bar) with a stroke table that keeps the rendered stroke equal, as CI-17 proposes; no free stroke prop. The selected tab becomes a filled variant, not a fatter stroke. Our row titles are SemiBold to Bold, so a 1.3px chevron beside them is a weight mismatch by Apple's rule. Draw the five tab glyphs and eight area glyphs in one sitting on one grid so they "family".

#### R8. Tab bar: HIG Tab bars, "Explore navigation design for iOS" (WWDC22, 10001), "Intentional Design" (WWDC18, 802) [S]

- **What it is.** The behavioural rules; `ios-design-language.md` B1 covers the floating-capsule look.
- **What exactly is good.**
  - "Use a tab bar to support navigation, not to provide actions." "Don't disable or hide tab bar buttons, even when their content is unavailable." "Use single words whenever possible." "Prefer filled symbols or icons for consistency with the platform." Badges only for critical information.
  - Balance: "the first tab of apps tend to be loaded heaviest with features. Try to create balance in your interface by distributing functionality throughout your tabs."
  - The Home problem: "Home becomes the tab where every feature is fighting for real estate, because the tab is trying to solve a problem of discoverability." "If this is your app, consider removing the Home tab altogether." And from 2018: "an app isn't a frame containing god knows what."
  - "Never force someone to change tabs automatically." "Always keep the tab bar persistent throughout your app."
  - A chevron must push: "When a chevron initiates a different transition, there's a disconnect between what the UI represents and the interaction that follows."
  - Titles: "Don't title windows with your app name." Keep titles "under 15 characters".
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/tab-bars.json · https://developer.apple.com/videos/play/wwdc2022/10001/ · https://developer.apple.com/videos/play/wwdc2018/802/ · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/toolbars.json
- **How we adopt.** Four checks. (1) 담기 leaves the row of destinations (also CI-01, HL-22). (2) Home must have content of its own, or go: today's plate and the 正 week strip are its own; the repeated task list, week bars and area ledger are the "fighting for real estate" case [A HL-06]. (3) Find every row on Home that jumps to another tab ("1/10 ›" and similar) and decide whether it should push a detail instead. (4) The 만다라트 tab is titled with the app name at 26pt while the user's goal is 17pt [A HL-08]; the title should be the goal.
- **A conflict with our own audit.** HL-23 proposes hiding the tab bar on every pushed screen. Apple says the opposite: "When using a push transition, it's really important that the tab bar remains persistently anchored to the bottom of the screen", and the HIG allows hiding only "when a modal view covers the tab bar". The consistent rule is: keep the bar on every push; if Settings should cover it, present Settings as a modal.
- **Metrics.** Not in the HIG text. Pre-iOS 26 convention [R]: 49pt bar plus the home-indicator inset, glyphs about 25pt, 10pt medium labels. Take current values from Apple's kit.

#### R9. Control vocabulary: HIG Buttons, Segmented controls, Sheets, Lists and tables; "The Life of a Button" (WWDC18, 804) [S]

- **What it is.** What each control is for and how it must answer a finger.
- **What exactly is good.**
  - Buttons: "a hit region of at least 44x44 pt". "Always include a press state for a custom button. Without a press state, a button can feel unresponsive, making people wonder if it's accepting their input." "Keep the number of prominent buttons to one or two per view." "Use style — not size — to visually distinguish the preferred choice among multiple options." "Don't assign the primary role to a button that performs a destructive action, even if that action is the most likely choice."
  - Touch-down: "you might be tempted to animate the button, to have it fade in or grow very slowly, but this can make things feel unresponsive." "…we're just going to highlight it instantaneously, make it feel a little bit faster." On release: "is there a slight delay so that even fast taps can be seen?" Hit area "a little bit larger than the visual size". Dragging off cancels. "Details are designed even if they seem obvious, even if they're as simple as a button."
  - Affordance: "just a rectangle floating on a black background might not be enough"; the cue can be "the shape of the button, the manner in which is rendered or if it's used consistently enough just the color of text."
  - Segmented controls: "no more than about five segments on iPhone", equal widths, "either text or images — not a mix", nouns as labels, and never mix selection with actions in one control.
  - Lists: a list of options "highlights a row only briefly before adding an image — such as a checkmark — indicating that the item is selected."
  - Sheets: "Include a grabber in a resizable sheet." "Display only one sheet at a time from the main interface." "If you provide a Done button, always pair it with a Cancel button…" "Support swiping to dismiss a sheet."
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/buttons.json · https://developer.apple.com/videos/play/wwdc2018/804/ · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/segmented-controls.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/lists-and-tables.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sheets.json
- **How we adopt.** This is the sourced backing for the audit's target kit [A]: one press primitive, highlight on touch-down with no fade-in, a short hold on release; a single-choice row that shows a trailing tick and no box; one segment look with five options at most; one filled button per sheet. "Consistently enough just the color of text" is the condition under which a flat text action works, and it is the condition we break by using grey for both captions and actions.

#### R10. Empty and loading states: HIG Writing, "Writing for interfaces" (WWDC22, 10037), `ContentUnavailableView`, HIG Loading, HIG Onboarding [S]

- **What it is.** Apple's pattern for a screen with nothing on it yet.
- **What exactly is good.**
  - "Provide clear next steps on any blank screens." "An empty screen can be daunting if it isn't obvious what to do next, so guide people on actions they can take, and give them a button or link to do so if possible." "Remember that empty states are usually temporary, so don't show crucial information that could then disappear."
  - The model copy: "No Saved Episodes" followed by "Save episodes you want to listen to later, and they'll show up here." The anti-model: "Nothing strike your fancy?" (an idiom, and no guidance).
  - The system component has a fixed anatomy: label (title plus symbol), description, actions. Apple's sample: "No Mail" / "New mails you receive will appear here."
  - Loading: "Show something as soon as possible… consider showing placeholder text, graphics, or animations as content loads." Widgets: placeholder content made of "semi-opaque shapes that stand in for dynamic content".
  - Onboarding: "fast, fun, and optional"; "Teach through interactivity."
  - Tone: "interjections like 'oops!' or 'uh-oh' can sound patronizing"; avoid "we".
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/writing.json · https://developer.apple.com/videos/play/wwdc2022/10037/ · https://developer.apple.com/tutorials/data/documentation/swiftui/contentunavailableview.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/loading.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json
- **How we adopt.** List every surface that can be empty or thin and give each three fixtures (empty, sparse, full): Today with no tasks, a chart with 64 blank cells (today "a table of 64 plus signs" [A first-impression]), a zoomed 3×3 with one action, Stats in week one, the archive before the first year closes, each widget family before first launch. Copy formula: a noun-phrase title, one sentence saying how it fills, one action. The app is local-first, so a spinner should never appear; the craft test is that the first frame after the splash is the final layout.

#### R11. Charts and density: HIG Charting data, "Design an effective chart" and "Design app experiences with charts" (WWDC22), "Essential Design Principles" (WWDC17, 802) [S]

- **What it is.** Apple's case against the dashboard, and the density trade-off stated both ways.
- **What exactly is good.**
  - "Not every collection of data needs to be displayed in a chart." "…only the most important information should become a chart." "Resist the temptation to pack as much data as possible into a chart."
  - "An effective chart focuses on a few key pieces of information." "Too many grid lines and labels can be distracting… having seven horizontal grid lines might be overwhelming." "Some charts don't need grid lines and labels at all."
  - Headline first: a title like "Sales in the Past 30 Days" "labels the elements of the chart but doesn't communicate anything more"; better is the interpretation, "Sales for the past 30 days are up 12%, totaling 1,234 pancakes."
  - Small then large: "Use a small static chart higher in the navigation hierarchy to offer a path to expanded versions of the chart." Small charts "don't require grid lines, labels, or interactivity".
  - "When your app includes more than one chart, you've created a chart design system." "Differences matter, and the variations between charts are a signal that something has changed."
  - "It's important to test your designs with real data early." "Remember to design for a variety of scenarios in your data."
  - Category colour: "When choosing colors for categories, balance visual weight"; colour "added on top of the symbols", not alone.
  - The trade-off: "Densely packed interfaces can be overwhelming and they can slow decision-making, especially for people who are new to your app." But also: "Removing that information might reduce clutter… but it would greatly reduce usability." "Too much progressive disclosure can make work flows inefficient."
  - The iPhone context (HIG "Designing for iOS"): people often "spend just a minute or two" in an app, so "help people concentrate on primary tasks and content by limiting the number of onscreen controls while making secondary details and actions discoverable with minimal interaction."
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/charting-data.json · https://developer.apple.com/videos/play/wwdc2022/110340/ · https://developer.apple.com/videos/play/wwdc2022/110342/ · https://developer.apple.com/videos/play/wwdc2017/802/ · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/designing-for-ios.json
- **How we adopt.** Stats: one sentence plus two numbers as the hero, then scopes (이번 주 / 10주 / 올해) as HL-07 proposes, each chart with a sentence headline (the screen already does this once, "건강은 5번 챙겼고, 커리어는 아직이에요" [A]). Every chart gets a rule for too little data, because that is what every new user sees. The eight area colours having similar lightness is right by Apple's "balance visual weight"; it means identity must also be carried by a glyph or a position.

#### R12. Depth by tone: HIG Dark Mode, HIG Materials, "What's New in iOS Design" (WWDC19, 808), "Meet Liquid Glass" [S]

- **What it is.** How the system shows that one thing is above another without decoration.
- **What exactly is good.**
  - Two background sets, "base" and "elevated": "The base colors are dimmer, making background interfaces appear to recede, and the elevated colors are brighter, making foreground interfaces appear to advance."
  - A ladder of roles, not ad hoc greys: system background primary, secondary, tertiary; four label levels ("primary elements like titles, secondary for subtitles, tertiary for placeholder text, quaternary for disabled text"); fills and one separator that are semi-transparent so they "contrast well against variable background colors".
  - Materials "establish visual hierarchy to help people more easily retain a sense of place." "Thicker materials… provide better contrast for text"; thinner ones keep context.
  - Shadows that respond to context: Liquid Glass "increases the opacity of its shadow when it is over text" and "lowers the opacity of its shadow when it is over a solid light background."
  - A modal should leave "this little peek of what's in the background".
- **Links.** https://developer.apple.com/tutorials/data/design/human-interface-guidelines/dark-mode.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json · https://developer.apple.com/videos/play/wwdc2019/808/ · https://developer.apple.com/videos/play/wwdc2025/219/
- **How we adopt.** Name three surface levels as tokens (desk, page, sheet) and make the step visible. Dark already has one (`bg #0E0D14`, `surface #191824`, `card #1C1B28`); light does not (`#FBF9F4` to `#FFFFFF` is 1.05:1 [M]). Our rule colour is already semi-transparent, which is the right construction; it needs two more strengths.

#### R13. "Behind the Design: Flighty" [S]

- **What it is.** Apple's interview with the 2023 Interaction winner. It does not discuss type or colour; its value is the standard it sets for information design.
- **What exactly is good.** "We want Flighty to work so well that it feels almost boringly obvious." "Those airport boards have one line per flight, and that's a good guiding light — they've had 50 years of figuring out what's important." The process: 20 ideas per problem because "it's what fits on a sheet of paper"; "You get to six or seven ideas and think, 'OK, that's it'… then you try it and it's not bad at all." "We really have to shine when things go awry."
- **Link.** https://developer.apple.com/news/?id=970ncww4
- **How we adopt.** We have the same kind of 50-year-old real-world object: the printed Mandal-Art sheet and the ruled checklist. "One line per flight" translates to one line per action on Today, with exactly the fields that matter (name, area, this week's progress) and nothing repeated. The 20-ideas rule is the right antidote to the first-idea problem this redesign exists to fix: 20 thumbnails each for the Home plate, the tab bar and the check box before any is built.

#### R14. "The Qualities of Great Design" (WWDC18, 801) and "Design with SwiftUI" (WWDC23, 10115) [S]

- **What it is.** Designers on what craft is, and Apple's Maps team on how they tune it.
- **What exactly is good.** "It's often the little things that are the telltale signs about craftsmanship… if there's variable separation or variable width of that gap, you just get the sense that it wasn't well crafted." "If something is quality, it implies that there is nothing random about it." Polish is "things lining up just the way you intend them to be, including how it feels… swipe animations lining right up with those swipe gestures." On blind spots: "after you've used your own work for some amount of time, you naturally develop some blind spots." From the Maps team: details such as "how an image should look when it's loading or how a button appears when it's pressed… are easily hidden in static design tools"; they tuned on device with real data and found a flat route "looked much more extreme than it actually was".
- **Links.** https://developer.apple.com/videos/play/wwdc2018/801/ · https://developer.apple.com/videos/play/wwdc2023/10115/
- **How we adopt.** "Nothing random" is the test behind most of section 8: if a value cannot be named as a token, it is random. Judge mockups on a device with real Korean, Japanese and English content and with empty, typical and full data, never on a static artboard with sample text.

### 3B. Recalled, not opened this session [R]

No links are given below because none was fetched. Treat specifics as leads to re-check.

#### R15. Refactoring UI (Adam Wathan and Steve Schoger, 2018) [R]

- **What it is.** A book of tactical rules for people who are not trained designers. It is the most checklist-shaped source in the field.
- **What is good.**
  - Hierarchy: "size isn't everything"; use two or three text colours and two weights before a new size; emphasise by de-emphasising what competes; labels are a last resort (show "12 left in stock", not "In stock: 12"); do not use grey text on a coloured background, pick a colour of the same hue instead; button hierarchy is solid, then outline or low-contrast, then plain text.
  - Spacing: start with too much white space, then remove; a fixed scale where neighbouring steps differ by at least about 25% (4, 8, 12, 16, 24, 32, 48, 64, 96…); avoid ambiguous spacing, meaning more space around a group than within it.
  - Type: a hand-picked scale (12, 14, 16, 18, 20, 24, 30, 36, 48…); line height falls as size rises; align mixed sizes on the baseline, not the centre; tighten headlines, loosen all-caps; no weights under 400 in UI.
  - Colour: define the whole ramp up front (8–10 greys, 5–10 shades per colour); greys can be tinted warm or cool.
  - Depth: light comes from above; a raised object has a lighter top edge and a small shadow below; shadows have two parts (a tight dark contact shadow and a larger soft one); elevation is a small fixed set; "even flat designs can have depth" by making nearer things lighter, by solid shadows with no blur, and by overlapping elements.
  - Finishing: use fewer borders (try a shadow, a second background tone, or more space); accent borders add colour to a bland block; do not overlook empty states; do not blow up icons that were drawn small.
  - Personality lives in typeface, colour, radius and language; no radius reads as formal.
- **How we adopt.** Nearly every item maps to a row in section 8. Two are especially useful under our constraints: "even flat designs can have depth" gives three devices that respect the ban on glow (tone, hard offset, overlap), and "labels are a last resort" is the cure for Today showing the same count three times in 85pt [A HL-04].

#### R16. Erik Kennedy, "7 Rules for Creating Gorgeous UI" and his iOS guidelines sheet [R]

- **What it is.** A widely used primer by an independent designer (Learn UI Design).
- **What is good.** Light comes from the sky. Black and white first: design in greyscale, then add one colour. Double your whitespace. Make text pop and un-pop with weight, colour, size, caps and spacing together. Only use good fonts. His iOS sheet gives working numbers (pre-iOS 26): 16pt side margins, 44pt minimum rows and navigation bar, 49pt tab bar plus a 34pt home-indicator inset, 17pt body, 34pt bold large title, 10pt tab labels.
- **How we adopt.** The greyscale pass is a cheap review step: a screen whose hierarchy disappears in greyscale has no hierarchy. Ours largely survives that test already, which shows the problem is contrast between levels, not colour.

#### R17. Anthony Hobday, "Visual design rules you can safely follow every time" [R]

- **What it is.** About two dozen single-line rules, several with numbers.
- **What is good.** Near-black and near-white, never pure. Saturate neutrals slightly, all warm or all cool. Everything aligns with something else. Optical alignment beats mathematical alignment. Measurements are mathematically related. Outer padding is the same as or more than inner padding. Lower letter spacing and line height as text grows. Container borders must contrast with both the container and the background. Drop-shadow blur is twice its distance. Nest corners properly (inner radius = outer radius − gap). Do not put two hard divides next to each other. Button horizontal padding is twice the vertical. Put simple on complex or complex on simple.
- **How we adopt.** "Two hard divides" is the paper-pattern problem [A HL-24]: 18pt dot or line paper running behind list rules that sit 4–10pt off it. Either the rows snap to the paper module or the pattern goes.

#### R18. Web interface guidelines: Rauno Freiberg, Vercel, Jakub Krehel [R]

- **What it is.** Three engineer-designers' lists of details. Written for the web, but mostly about touch and perception.
- **What is good.** No dead zones between adjacent tappable items (grow the padding, not the gap). Weight must not change on press or selection, because it shifts layout. No weights under 400. Tabular figures wherever numbers change in place. Interaction feedback under about 200ms; scale on press near 0.96–0.98, never 0.8; frequent, low-novelty actions get no extra animation. Feedback appears where the action happened (an inline check, not a toast). Hover, press and focus states have more contrast than rest. Nested radii are concentric. Shadows in at least two layers. Loading indicators appear after a short delay and stay for a minimum time so they never flash. Design the empty, sparse, dense and error state of every view.
- **How we adopt.** "Weight must not change on selection" argues against bolding the selected tab label or choice row if it changes width; use ink versus grey, or reserve the bold width. "Feedback where the action happened" matches the pen tick and strike-through we already have.

#### R19. Shadows and elevation done well: Josh Comeau, Tobias Ahlin, Material Design 3 [R]

- **What it is.** The standard recipes for believable shadows, and Google's alternative of expressing elevation by tone.
- **What is good.** One light direction for the whole app, so every shadow has the same offset ratio. As elevation rises, offset and blur grow and opacity falls. Stack several low-opacity layers (for example 1, 2, 4, 8, 16pt) instead of one heavy one. Tint the shadow toward the surface's hue instead of grey-black. Material 3 expresses level mainly through "surface container" tones (five steps, lowest to highest) and defines state layers as fixed overlays: about 8% hover, 10% focus and press, 16% drag; disabled content at 38%. Its list rows are 56 / 72 / 88dp for one, two and three lines; minimum target 48dp.
- **How we adopt.** Our `shadow()` helper already has one light direction, a warm tint (`#1E180C`) and a cap at 7% opacity [M]. The gap is the level system: define page, raised and overlay, with tone first and shadow only on overlay. Fixed-percentage ink overlays are the cleanest press recipe for a paper UI: 8–10% ink on press, the same everywhere.

#### R20. Linear [R]

- **What it is.** The issue tracker most often named as "premium" in 2023–2025, and its redesign write-ups.
- **What is good.** Recalled from its redesign posts: themes generated in a perceptual colour space (LCH) from three inputs (base, accent, contrast) so every surface and text step is derived, not hand-picked; a display cut of the typeface for headings and the text cut for body; a pass devoted only to alignment of labels, icons and buttons in the sidebar and tabs; less chrome colour over time, toward neutral. Dense rows, small type, and almost no borders: separation by tone.
- **The caution.** The "Linear look" (dark ground, one glow, thin borders) was copied until it became a template. That is the same thing that happened to the purple-gradient look, and it is what is now happening to cream-plus-serif. A look that can be described in five tokens will be reproduced; a behaviour or a structure is harder to copy.
- **How we adopt.** Derive, do not pick: generate the neutral ramp, the three rule strengths and the pressed overlays from ink and paper by fixed mixes, so that all five papers stay consistent. `moods.ts` already mixes colours in code [M], so this is an extension, not a rewrite.

#### R21. Things 3 (Cultured Code) [R]

- **What it is.** The task manager most often cited as the benchmark for calm premium on iOS. Sources for its colour discipline are in `stationery-print.md` D1.
- **What is good.** Almost no chrome: a white page, type, and small coloured list glyphs. Exactly one elevation moment: a to-do opens in place into a white card with a soft shadow while its neighbours move apart. Exactly one saturated control: the round blue Magic Plus, which can be dragged to the position where the new to-do should go. Headings inside a project are a bold line over a thin rule. Empty lists show the list's own glyph, large and pale. Apple's own example of forgiving input is from this app: typing June 31 gives July 1 instead of an error [S, WWDC17 session 802].
- **How we adopt.** The lesson is the budget: one elevation, one saturated control, one heading style. Candidates for ours: the 3×3 block lifting off the chart as the one elevation; 담기 as the one filled control; the masthead double rule as the one ornamental line.

#### R22. Airbnb and Arc [R, low confidence]

- **What it is.** Two products that moved away from flat.
- **What is good.** Airbnb's 2025 redesign replaced flat tab and category glyphs with small dimensional, animated icons, and its founder argued publicly that purely flat design had run its course; brand colour stays confined to the primary action and the saved heart. Arc gave each Space a user-chosen colour with a fine grain over it, so large colour fields looked like material, not plastic.
- **How we adopt.** Neither look fits a paper notebook. The transferable points: (1) dimension was spent in very few places, on the things people tap most; (2) a large colour field needs some physical irregularity or it reads as a flat fill. Our equivalent of grain is the dot or line pattern, which should then be registered to the layout.

#### R23. Usability and information-design research: NN/g, Tufte, Few [R]

- **What it is.** The evidence behind two of the critiques in section 4.
- **What is good.** NN/g's 2017 eye-tracking study of flat interfaces (71 participants) found that pages with weak or absent click signifiers took about 22% longer and drew more fixations: people had to hunt for what was tappable. NN/g on empty states: say what the state is, teach what will appear, give a direct path to the first action. Tufte: maximise the share of ink that carries data; two lines create a third object, the space between them ("1+1=3"), so rules should be as light and as few as will do the job. Rutter and Ström on tables: left-align text, right-align numbers, tabular figures, as few rules as possible, no boxes. Few's list of dashboard mistakes includes running past a single screen, giving numbers without context, and meaningless variety between charts.
- **How we adopt.** See section 4.

---

## 4. Two critiques

### 4.1 "Flat beige minimal"

What the sources say against it:

- "When we say simple, we don't mean minimal." [S, R1]
- A flat object needs some signifier: "just a rectangle floating on a black background might not be enough." [S, R9] Unfamiliar interactions need "words or on-screen elements that help people understand what to do." [S, WWDC21 "Discoverable design", https://developer.apple.com/videos/play/wwdc2021/10126/]
- Weak signifiers cost time and certainty. [R, NN/g]
- The 2022 Delight winner's designer, quoted in `apple-awards.md`: "minimalism is a fun place to visit for me, but it's not somewhere I want to live." [S there]
- `korea-japan.md` section G: by 2026 "off-white, hairlines, one accent, small radius" is itself what a careful AI pass produces. And `stationery-print.md` D9: cream with a warm accent is strongly associated with one AI product.

How our build shows the problem, measured:

- **One hue.** Paper 43°, ink 33°, secondary text 38°, gold 39° [M]. The whole chrome sits inside a 10° band of brown. The stationery memo's rule is that "dull beige happens when all four [inks] are shades of brown."
- **No surface step.** Paper to white is 1.05:1 [M]. Nothing can be "on" anything.
- **One line.** 1.19:1, used for row dividers, section breaks and control edges alike [A].
- **No signifier for actions.** Grey 13pt text is both caption and button [A CI-03].
- **The accent is close to the ground.** Gold on paper is 3.10:1 [A], so even the one colour is quiet.

The direction is not wrong; it is unfinished. Print is a high-contrast medium: black ink, heavy and light rules, large numerals, a spot colour that is plainly not the paper. What we built is the paper without the printing.

### 4.2 Over-dense dashboards

What the sources say:

- "…only the most important information should become a chart." "Resist the temptation to pack as much data as possible into a chart." [S, R11]
- "Densely packed interfaces can be overwhelming and they can slow decision-making, especially for people who are new to your app." [S, R11]
- A dashboard that scrolls, shows numbers without context, or varies chart types for no reason is making the classic mistakes. [R, Few]
- The opposite failure is also named: "Too much progressive disclosure can make work flows inefficient." [S] Hiding everything is not the fix.

How our build shows it [A]:

- Stats is ten sections under identical heads and more than 2,600pt long (HL-07).
- Today shows the same count three times within 85pt, and puts seven header layers and 226pt before the first task (HL-04).
- Home restates Today, Stats and the chart (HL-06).
- Charts are sized for full data and look broken with three data points (HL-03).

The fix is the same on all three screens: one hero, one sentence, then scope tabs or disclosure, and a designed state for too little data.

---

## 5. Depth and delight without gradients or glow: a menu [P]

Each item is compatible with the earlier bans. Numbers are starting points for mockups.

1. **Two papers.** A desk tone and a sheet tone that differ visibly (aim for about 1.08–1.12:1, against 1.05:1 today). Hero plates, sheets and the zoomed 3×3 sit on the lighter one. Basis: base/elevated [S, R12], "nearer is lighter" [R, R15].
2. **Three rules.** Frame (about 1.5–2pt ink), group (1pt ink at about 35%), row (1pt at the current 12%). Section breaks use the group rule or space, never another row rule. Basis: grouping tools [S, R4], HL-01.
3. **One real shadow.** Only for what truly floats: sheets, the lifted 3×3, the snackbar. Two layers, one direction, warm tint. Basis: [R, R19]; Things' single elevation [R, R21].
4. **Paper thickness without blur.** A raised control gets a 1pt darker bottom edge, or a hard 0/2/0 offset in ink at about 15%. It reads as card stock, not as glow. Basis: "solid shadows with no blur" [R, R15].
5. **Content passes beneath the bar.** A floating bar with the page scrolling under it gives real depth for free. Basis: [S, R5]; design in `ios-design-language.md` B1–B2.
6. **Ink responds to touch.** Press = an 8–10% ink overlay, applied on touch-down with no fade-in, held for about 100–150ms on release, plus a 0.97 scale on buttons. Basis: [S, R9]; overlay percentages [R, R19].
7. **Overlap.** The centre cell overlapping its neighbours by a point or two, a stamp overlapping a rule, a tick overshooting its box. Overlap is depth with no shadow at all. Basis: [R, R15]; `stationery-print.md` on marks.
8. **One large number per screen.** Tabular only where it changes in place, flush to the gutter, with its unit small beside it. Basis: [S, R2]; HL-17.
9. **Colour at full size, rarely.** An area's colour filling the header of its 3×3, or the year-review page. "Don't be afraid to use color", and put it in content. [S, R6]
10. **Rare moments get the budget.** Checking a box: a mark and a haptic. Closing a day, finishing 8/8, 64/64: the designed moment. Basis: "avoid adding motion to UI interactions that occur frequently" (cited in `ios-design-language.md` B9); details in `motion-feedback.md`.

---

## 6. Pitfalls to avoid

1. **Treating a ban list as a design.** Removing gradients, shadows, cards and pills is subtraction. Each removed device did a job (grouping, elevation, affordance); name its replacement or the job goes undone.
2. **Fixing hierarchy by adding sizes.** We already have 29. Use tone and weight first.
3. **Fixing blandness with more accent.** More gold makes gold mean less. Give it one job.
4. **Hairlines as the answer to everything.** Twenty identical rules are noise. Space groups first, then use a heavier rule, then a row rule.
5. **Low-contrast control edges.** A divider may be faint. The edge of something pressable may not.
6. **Grey for actions.** The moment grey means both "secondary information" and "tap me", neither reading is safe.
7. **Rounded controls scattered in a square world.** Either the content layer is square and the tool layer is capsule, or it is noise. Nested rounded shapes must be concentric.
8. **Geometric centring of asymmetric glyphs and tabular display numerals.** Both look misaligned when they are mathematically correct.
9. **Designing for full data.** New users have none. Sparse states are the first impression.
10. **A Home tab that summarises the other tabs.** Apple calls this out by name.
11. **Fake glass.** A blur with a white overlay is not the material. Use the real one or an honest opaque bar (`ios-design-language.md`).
12. **Paper as texture.** Grain, fibres and curl are skeuomorphism. Rules, modules and ink behaviour are the metaphor (`stationery-print.md`).
13. **Dimension everywhere.** Airbnb and Things spend depth in one or two places. Depth on every row is the card soup we banned.
14. **Web numbers on iOS.** Hover states, 24px targets and 16px inputs come from the web lists in R18. Only the perception rules transfer.
15. **Pre-iOS 26 metrics.** 49pt tab bars and edge-attached sheets are the old system. Take current values from Apple's kit.
16. **Unverified third-party detail.** Section 3B is recall. Do not quote it in a spec without opening the source.
17. **Implementing before reading the SDK docs.** `AGENTS.md` requires the Expo SDK 56 docs before code; `docs.expo.dev` was not reachable here, so nothing in this memo is an API recommendation.

---

## 7. What I could not verify

- **No web search ran.** The shared budget was spent before I started. Nothing here was found by searching; Apple URLs were opened directly.
- **Refactoring UI, Erik Kennedy, Anthony Hobday, Rauno Freiberg, Vercel, Jakub Krehel, Josh Comeau, Tobias Ahlin, Material Design 3, Linear, Things 3, Airbnb, Arc, NN/g, Tufte, Rutter, Few:** recall only. Specific numbers (25% scale steps, blur = 2× offset, 22% and 71 participants, state-layer percentages, Inter's tracking constants, M3 row heights) need re-checking at the source.
- **Mobbin-style pattern write-ups:** none opened; nothing in this memo depends on them.
- **Korean and Japanese sources:** none opened for this topic. `korea-japan.md` covers them.
- **HIG metrics.** I looked for iOS list row heights, navigation and tab bar heights and default screen margins in the HIG layout, lists-and-tables, tab-bars and toolbars pages and in the UIKit layout-margin documentation. None states a number. The 44pt row, 44pt navigation bar, 49pt tab bar and 16/20pt margin figures are recall and pre-iOS 26.
- **Screenshots.** I saw none of any reference app. Every description of how Things, Linear, Airbnb, Arc or Flighty looks is recall or Apple's words.
- **Quotes.** All Apple quotes were extracted by a summarising fetch tool from transcripts and HIG data files. They read correctly, but I did not see the raw text.
- **Our own numbers.** Rows marked [A] are from the audits and were not re-measured. Rows marked [M] (spacing literals, radii, hue angles, the 1.05:1 surface step) I measured today. Checklist items 2, 19 and 28 have no current measurement.
- **The 3:1 rule for control edges** is WCAG 1.4.11 from recall; Apple's table covers text only.

---

## 8. The 30-item checklist

Format: the rule; **Test** (pass condition, measurable on screenshots or by grep); **Basis**; **Today**. Thresholds are proposals unless a source is quoted. Screens are checked at 393×852 with the Korean sample data unless stated.

### Layout and spacing

1. **One spacing scale.**
   **Test:** every `padding*`, `margin*` and `gap` value comes from a token set of 10 steps or fewer; zero literals outside `src/theme`. If the 18pt dot paper stays, derive the scale from 6 (6, 12, 18, 24, 36, 54, 72) so rows land on dots; otherwise 4, 8, 12, 16, 24, 32, 48, 64.
   **Basis:** R15, R17, R14 ("nothing random").
   **Today:** fail. 25 values in 606 literals [M].
2. **Inner space is smaller than outer space.**
   **Test:** for every section, gap above the head ÷ gap below the head ≥ 2; gap between groups ÷ gap between rows in a group ≥ 2.
   **Basis:** R4 (negative space groups), R15, R17.
   **Today:** not measured. Heads sit 24, 28 or 34pt below the previous block depending on the screen [A HL-20].
3. **Two row heights.**
   **Test:** list rows use exactly two minimum heights (compact 44, standard 54 or 56), both ≥ 44pt.
   **Basis:** R3 (44pt).
   **Today:** fail. 44, 48, 52, 54, 56, 60 [A HL-20].
4. **One gutter.**
   **Test:** the left edge of every element is either the gutter (20pt) or the screen edge (full bleed), within 1pt, on all screens.
   **Basis:** R4, R3 ("Align text, images, and buttons").
   **Today:** fail. Chart at x=11 [A HL-19].
5. **One header anatomy.**
   **Test:** the top of the title glyphs is at the same y on all four tabs (difference 0pt); pushed screens share a second, single anatomy.
   **Basis:** R1 (things that look the same), R14.
   **Today:** fail. y = 12, 16, 18, 31 [A HL-05].
6. **One hero per screen, high on the screen.**
   **Test:** (a) blur a screenshot by 12px: the largest dark shape is the intended hero; (b) the screen's primary content starts within 200pt of the safe-area top; (c) a stranger names the hero in 3 seconds.
   **Basis:** R1 ("the most important item on the screen is always the most obvious one"), R4.
   **Today:** fail. Home's hero is the date; first task at y=473. Today's first task at y=238 [A HL-02, HL-04].

### Alignment

7. **Everything aligns with something.**
   **Test:** at most 4 distinct left x-positions per screen; in any row with mixed sizes, texts share a baseline (offset 0pt), not a centre.
   **Basis:** R4, R15, R17.
   **Today:** fail. Home header has four vertical anchors [A HL-18]; the editor mixes label-left (x=84) and label-above (x=20) [A HL-10].
8. **Optical corrections are applied.**
   **Test:** the left ink edge of every display numeral is within 1pt of the gutter; asymmetric glyphs (chevron, play, share) are centred by eye with the offset stored in the asset; the tick overshoots its box by a fixed amount.
   **Basis:** R5 ("subtly offset when it doesn't"), R7.
   **Today:** fail. Numerals start 3–8pt inside the gutter [A HL-17].

### Typography

9. **Seven sizes, none under 11pt.**
   **Test:** computed styles show ≤ 7 font sizes app-wide and ≤ 5 on any one screen (chart cells counted); minimum 11pt.
   **Basis:** R2 (minimum 11pt; 10 sizes for the whole system).
   **Today:** fail. 29 in code, up to 15 on one tab, minimum 9pt [A].
10. **Hierarchy by weight and tone.**
    **Test:** ≤ 3 weights in use, none under 400; exactly 3 text tones (primary, secondary, disabled) plus area inks; zero interactive elements in the secondary tone; one text-action style plus one quiet variant.
    **Basis:** R2, R9 ("style — not size"), R15.
    **Today:** fail. Five weights written; seven text-action styles, several grey [A CI-03].
11. **Leading and tracking are set per size.**
    **Test:** zero text styles without an explicit line height; line-height ratio is about 1.1–1.25 at 26pt and above and 1.35–1.5 for multi-line body; tracking comes from a per-role table; stacked or changing numbers use tabular figures, single display numerals do not.
    **Basis:** R2 ("it should be size specific").
    **Today:** partial. 162 of 320 declarations have no line height [A]; tracking is a two-step rule [M]; tabular figures are applied 57 times [A].
12. **Text scales to 200% without loss.**
    **Test:** at 200% and at AX5 (Body 53/62), no label on the four tabs is truncated; rows wrap and grow; glyphs beside text scale with it.
    **Basis:** R2, R3.
    **Today:** partial. Body scales to 200%; fixed-size text is capped at 1.3× [A].

### Colour

13. **One meaning per colour.**
    **Test:** a written table maps each hue to one role; a screenshot review finds no hue used for a second role.
    **Basis:** R6 ("Avoid using the same color to mean different things").
    **Today:** fail. Gold has four roles; a filled area colour means "scheduled" in one place and "done" in another [A CI-02].
14. **An accent budget.**
    **Test:** at most one accent-filled control per screen or sheet, at most two prominent buttons in any view, and no destructive action in the primary style.
    **Basis:** R6, R9.
    **Today:** partial. One gold button per sheet, but seven indigo weekday blocks outweigh it in the editor [A HL-10].
15. **Contrast floors.**
    **Test:** all text ≥ 4.5:1 (≥ 3:1 from 18pt or bold); edges of pressable or fillable controls ≥ 3:1; small text in dark aims for 7:1; dividers exempt.
    **Basis:** R3.
    **Today:** fail on edges (1.19:1) and on chevrons (2.46:1); three area colours as text are under 4.5 [A CI-08, CI-10; `ios-design-language.md` B10].
16. **Never colour alone.**
    **Test:** in a greyscale screenshot, done / scheduled / missed are still distinct, and an area can be identified by glyph, name or position wherever its colour is shown.
    **Basis:** R3, R6, R11.
    **Today:** fail. Areas are 7–9pt squares; two pairs are 1.04:1 and 1.12:1 apart [A CI-05].

### Lines, shapes, depth

17. **A hierarchy of rules.**
    **Test:** exactly 3 rule tokens with written roles; in any viewport at least 70% of visible rules are the lightest and at most 2 are the heaviest; no two parallel rules closer than 12pt; no section separated only by a row rule; if a paper pattern is on, list rules coincide with it within 1pt.
    **Basis:** R4, R5 ("replacing hard dividers"), R17, R23.
    **Today:** fail. One weight, 20–43 per page; paper lines 4–10pt off list rules [A HL-01, HL-24].
18. **Radius tokens.**
    **Test:** `borderRadius` literals outside `src/theme` = 0; tokens are paper (0–2), tool (capsule or one fixed value) and sheet.
    **Basis:** R5 (three shape types).
    **Today:** fail. 13 literal values plus one computed [M].
19. **Concentric nesting and standard margins.**
    **Test:** for every rounded child nearer to its parent's corner than the parent's radius, |r_child − (r_parent − gap)| ≤ 1pt; widget content uses 16pt margins (11 for tight groups), Live Activity 14pt, and shapes near their corners are container-relative.
    **Basis:** R5.
    **Today:** not measured. One sheet shows radii 16, 12, 6, 4 with no relation [A CI-14].
20. **Three levels of elevation, tone first.**
    **Test:** tokens exist for page, raised and overlay; adjacent levels differ by at least about 1.08:1 in light mode; a shadow appears only on overlay; all shadows share x=0 and a positive y; in dark mode a higher level is lighter.
    **Basis:** R12, R15, R19.
    **Today:** partial. Dark has three tones; light has 1.05:1 [M]. One shadow recipe with a single direction exists [M].

### Icons

21. **One icon system.**
    **Test:** icon call sites use only 3 sizes (16, 20, 24) and no free stroke prop; rendered stroke varies by ≤ 0.25px across the app; caps, joins and corner treatment are the same in every glyph.
    **Basis:** R7 ("the same stroke weight in every icon").
    **Today:** fail. 9 sizes, 7 strokes, 1.27–2.1px [A CI-17].
22. **Standard verbs, standard glyphs.**
    **Test:** share, close, back, add, delete, edit and settings use the iOS-conventional shapes; the selected tab is a filled variant, not a heavier stroke; no disclosure arrows typed as characters in strings; icon weight visibly matches the adjacent text weight.
    **Basis:** R7, R8.
    **Today:** fail. Android-style share glyph; "›", "‹", "⌄" typed into strings; selected tab = stroke 2.1 against 1.8 [A CI-04, CI-10].

### Controls and navigation

23. **Targets and their spacing.**
    **Test:** every control has a hit area ≥ 44×44pt; adjacent bezelled controls are ≥ 12pt apart and adjacent bare text or icon actions ≥ 24pt apart.
    **Basis:** R3, R9.
    **Today:** size passes [A]; spacing not measured (the action-sheet header is a likely fail, see R3).
24. **Press and disabled states.**
    **Test:** every pressable goes through one primitive with ≤ 3 recipes (row, control, icon); the pressed state is visible on the first frame after touch-down, with no fade-in, and stays ≥ 100ms after release; dragging off cancels; one disabled recipe; checking a box completes its feedback in ≤ 300ms.
    **Basis:** R9 ("highlight it instantaneously"), R18.
    **Today:** fail. 108 raw `Pressable`, 8 opacities, row press at 1.10:1, four disabled looks [A CI-09].
25. **One look per kind of choice.**
    **Test:** independent on/off = check box only; one-of-many in a list = trailing tick, no box; inline exclusive options = one segment style with ≤ 5 equal-width segments, text or icons but not both; nothing box-shaped that cannot be tapped.
    **Basis:** R9, R1.
    **Today:** fail. Six idioms in one sheet [A CI-02].
26. **The tab bar holds destinations only.**
    **Test:** ≤ 5 items, all destinations, one-word labels; no action in the row; visible on every non-modal screen; no control switches tabs on the user's behalf; no tab or screen is titled with the app's name; Home contains at least one module that exists nowhere else and no function that is only a copy of another tab's.
    **Basis:** R8.
    **Today:** fail. 담기 is in the row; pushed screens disagree about hiding the bar; the 만다라트 title is the app name; Home repeats three tabs [A CI-01, HL-23, HL-08, HL-06].

### States and density

27. **Empty and sparse states are designed.**
    **Test:** an inventory lists every list, chart and widget; each has screenshot fixtures for empty, sparse (1–3 items, or under 2 weeks of data) and full; each empty state has a title, one sentence and one action; no chart draws with fewer than 3 data points; no empty area larger than 40% of the screen on a finished page.
    **Basis:** R10, R11 ("a variety of scenarios in your data").
    **Today:** fail. Stats charts look broken in week one; year-close pages are 43–59% blank [A HL-03, HL-14].
28. **No blank frame, no shift.**
    **Test:** on a cold start, the first frame after the splash is the final layout of Home; no element moves more than 1pt during the first second; no spinner appears for local data; widgets show placeholder shapes that match the final layout.
    **Basis:** R10 ("Show something as soon as possible"), R18.
    **Today:** not measured.
29. **Density is chosen, not accumulated.**
    **Test:** each tab's default scope is ≤ 2 viewports long (about 1,500pt of content) with typical data; the same figure appears at most once per viewport; every chart sits under a sentence that states its finding; ≤ 4 grid lines per chart; anything beyond is behind a scope tab or a disclosure row.
    **Basis:** R11, R1 ("every element earns its place").
    **Today:** fail. Stats > 2,600pt in ten equal sections; Today shows one count three times in 85pt; Settings about 2,600pt [A HL-07, HL-04, HL-13].

### Process

30. **The system is enforced and tested at the extremes.**
    **Test:** lint fails on literal font sizes, radii, colours and spacing outside `src/theme`; a screenshot matrix runs for the four tabs, the 3×3, the editor and the widgets across the smallest and largest phone, light and dark, Increase Contrast, AX5 text, Korean, Japanese and English with real content in each language, and empty, typical and full data; a new screen cannot merge without its row in the matrix.
    **Basis:** R4 ("first testing versions… that use the largest and the smallest layouts"), R11 ("test your designs with real data early"), R14.
    **Today:** fail. 320 raw font sizes against 75 token uses; the smoke screenshots seed Korean content in all three languages, so no English or Japanese chart has been looked at [A typography audit].
