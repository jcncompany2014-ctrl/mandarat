# Current iOS design language (Liquid Glass and after): the bar a late-2026 app is judged against

Research date: 2026-11-14. Scope: the iOS 26 "Liquid Glass" language, what iOS 27 (WWDC, June 8, 2026) and the autumn 2026 hardware changed, how Apple tells branded apps to adopt it, and what Expo SDK 56 / React Native 0.85 give us.

**How to read this memo.**

- The shared web-search budget was already used up when I started, so I ran no searches. I could open only `developer.apple.com` and the npm registry. `docs.expo.dev`, `expo.dev` and `www.apple.com` did not resolve in this session.
- So every **[source]** below is one of two things: an Apple page I fetched today (HIG pages, developer documentation, WWDC session pages with transcripts, release notes), or package source I read today (the installed `node_modules`, plus npm tarballs of `expo-glass-effect`, `expo-router` and `react-native-screens`). **[recall]** means my general knowledge up to mid-2026, not checked today.
- Apple's HIG and documentation pages render with JavaScript, so I read their data files. A link like `…/tutorials/data/design/human-interface-guidelines/tab-bars.json` is the data behind `developer.apple.com/design/human-interface-guidelines/tab-bars`.
- I saw no screenshots of other apps. Descriptions of how third-party apps look are Apple's words, not mine. I did look at our own store screenshots and icon in the repo.
- Numbers in "How we adopt" lines are my proposals unless a source is quoted.

## Summary

1. **Liquid Glass is still the language. iOS 27 refined it and did not replace it.** Apple's 2026 session says "Liquid Glass has a refined look and automatically responds to the new Liquid Glass slider to adjust its tint", and the HIG change logs for June 8, 2026 read "Refined guidance for Liquid Glass" and "Updated terminology and art". There is no new visual era to wait for.
2. **The opt-out is closing.** `UIDesignRequiresCompatibility` is ignored "when you build for iOS 27 or later". Uploads have had to use Xcode 26 since April 28, 2026. The upcoming-requirements page lists no Xcode 27 deadline yet.
3. **The rule that decides our case is the two-layer model.** Glass is for the navigation and control layer that floats above content; Apple says "Don't use Liquid Glass in the content layer". Apple's 2026 branding session tells branded apps to express identity in the content layer and keep navigation familiar. So a paper-notebook *content* layer is compatible with the platform. What reads as dated is our *chrome*.
4. **What is dated in our app today, specifically:**
   - The tab bar is full-width, opaque, attached to the bottom edge, with a 1pt top rule that slices the content (visible on the Home store screenshot, where "8개 영역" is cut in half).
   - It holds an action (담기) among destinations, which the HIG rules out.
   - Its icons are outlines; the HIG prefers filled.
   - Sheets are edge-attached with a 16pt top radius and a top rule.
   - Nothing scrolls beneath anything.
   - The app icon is a thin-line grid with sharp corners on near-white, which is close to a list of what Apple's icon guidance says to avoid.
5. **The layout bar moved too.** iPhone Duo, the first folding iPhone, was documented on September 9, 2026: its outer display is "wider and shorter", and system tab bars and toolbars move to the side. In iOS 27 "our iPhone app becomes resizable too". A fixed bottom bar and a chart sized from screen width alone are now assumptions to re-check.
6. **Our stack is two SDKs behind.** npm `latest` for `expo` is 58.0.25 (React Native 0.88.1); we are on 56 (0.85.3). SDK 56 already has what we need for real glass (`expo-glass-effect`, `@expo/ui` `glassEffect`). The first packages that know about the iOS 27 SDK are the 58 line.
7. **Recommendation.** Do not move to native tabs before 1.0. Keep the content paper-flat and square, and give the floating layer the platform's geometry and behaviour: a floating capsule bar, a separate 담기 button, content passing beneath, inset sheets. Real glass via `GlassView` is an option on top of that, not the point. Rebuild the icon as layers in Icon Composer. Test widgets in clear and tinted modes.

## References

### A. What the platform is now

**A1. The two-layer model (Liquid Glass 층과 콘텐츠 층)** [source]
- What it is: Apple's definition of the material. "Liquid Glass forms a distinct functional layer for controls and navigation elements — like tab bars and sidebars — that floats above the content layer."
- What it says:
  - "Don't use Liquid Glass in the content layer." The session's example is a table view: making it glass "would make it compete with other elements and muddy the hierarchy".
  - "always avoid glass on glass."
  - Two variants that "should never be mixed": regular (default, adaptive) and clear (only over media, with "a dark dimming layer of 35% opacity" when the content is bright).
  - "Tinting should only be used to bring emphasis to primary elements and actions."
  - "In steady states, such as when an app first launches, avoid intersections between content and Liquid Glass."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json · https://developer.apple.com/videos/play/wwdc2025/219/
- How we adopt: write the split down as a rule. Content layer: the 9×9 chart, the zoomed 3×3, the Today list, the ledger, Stats charts. These stay opaque, flat and square. Control layer: tab bar, 담기, sheet chrome, snackbar, the top-right actions. Only these may float, round off, or use glass. A short name for the rule: 종이는 각지게, 도구는 둥글게 (paper is square, tools are round).

**A2. iOS 27 changed details, not the language** [source]
- What it is: the WWDC 2026 sessions and the iOS 27 release notes.
- What changed:
  - Glass: "the Liquid Glass design automatically takes on its updated appearance", plus a user-facing Liquid Glass slider for tint.
  - Scroll edge: "the .automatic style no longer switches between the existing soft and hard styles but provides its own visuals for additional clarity."
  - Tab bars: a `prominent` tab that sits "on the bottom trailing edge of the screen" and "is always visible, even when the tab bar collapses during scrolling". iPhone apps can opt into a sidebar when there is room.
  - Bars: navigation bars and toolbars can minimise on scroll (`toolbarMinimizationBehavior`), with an overflow menu and visibility priorities.
  - Menus: on iPad and Mac menu bars "a reduced set of menu item images". This is a pull-back from the 2025 advice to add icons to menus.
  - Sheets: a `crossFade` transition "to have a sheet appear by fading in over content".
  - Windows: iPhone apps become resizable.
- Links: https://developer.apple.com/videos/play/wwdc2026/269/ · https://developer.apple.com/videos/play/wwdc2026/278/ · https://developer.apple.com/tutorials/data/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes.json · https://developer.apple.com/tutorials/data/documentation/updates/swiftui.json · https://developer.apple.com/design/whats-new/
- How we adopt: design to the 26 language with confidence; it is not about to be replaced. Two iOS 27 patterns map directly to us: the prominent trailing tab (our 담기) and bar minimising on scroll (Today and Stats are long lists).

**A3. The compatibility switch and submission rules** [source]
- What it is: the Info.plist key that kept the pre-26 look, and Apple's requirements page.
- What it says:
  - "Temporarily use this key while reviewing and refining your app's UI." "The system ignores this key when you build for iOS 27 or later."
  - "Apps uploaded to App Store Connect must be built with Xcode 26 or later" (since April 28, 2026).
  - Built with the 27 SDK, an app must use the scene-based life cycle "or they fail to launch", and must include a launch screen.
- Links: https://developer.apple.com/tutorials/data/documentation/bundleresources/information-property-list/uidesignrequirescompatibility.json · https://developer.apple.com/news/upcoming-requirements/ · https://developer.apple.com/tutorials/data/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes.json
- How we adopt: we do not set the key (I grepped `app.json`, `plugins`, `src`), and we draw our own bars, so nothing flips for us. But every system piece we do use already shows the new look next to our flat UI: `Switch` (4 references in `src`), `Alert.alert` (2), `Share.share` (6), the keyboard and text menus. That the system pieces change is Apple's statement ("your interface picks up the latest look"); that React Native's wrappers follow is my inference.

**A4. iPhone Duo and resizable iPhone windows** [source]
- What it is: a new HIG page (September 9, 2026) for the first folding iPhone, plus the iOS 27 resizing change.
- What it says:
  - "Because the outer display is wider and shorter than the display on other iPhone devices, the system moves controls to the side."
  - "A compact width layout for the outer display and a regular width layout for the inner display give you the fundamentals for every pose."
  - "In a grid-style layout, prefer an even number of columns so content divides cleanly."
  - "Avoid extreme layout changes as people fold the device."
  - UIKit added `UIView.ReservedRegion` and a hinge interaction for the folding region.
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/designing-for-iphone-duo.json · https://developer.apple.com/tutorials/data/documentation/updates/uikit.json
- How we adopt:
  - The 9×9 chart has an odd column count, so the fold would run through the core-goal column. Never span the chart across the fold. Use the two-page layout we already have for iPad (`src/lib/spread`): chart on one page, companion (Today list or the zoomed 3×3) on the other. A notebook that opens like a book is the one place our metaphor is ahead of the platform.
  - On a short, wide window, a bottom bar takes height the chart needs. Proposal: chart side = min(available width, available height), and when the height cannot hold the chart plus the bar, move the four tabs to a side rail.
  - I could not find the Duo's point sizes or how a custom-drawn app is treated on it (see "Not verified").

**A5. The criticism, and how Apple answered it** [source for Apple's answers, recall for the criticism]
- The criticism [recall]: from the first 2025 beta, reviewers and usability researchers said text and icons on glass lost contrast over busy or bright content, that bars drew attention away from content, and that tab bars which shrink and move hurt predictability. Nielsen Norman Group published a critical review in autumn 2025. I could not re-read any of it today.
- Apple's answers [source]:
  - A user setting. The HIG now says the variants "can differ … if people choose a preferred look for Liquid Glass in their device's settings". iOS 27 adds a slider.
  - A more opaque default scroll edge: the automatic style "provides a more opaque visual separation for top toolbars that contain a large number of controls, text that appears outside of Liquid Glass controls, and pinned table headers".
  - Accessibility modes that come for free with the real material: Reduce Transparency "makes Liquid Glass frostier", Increase Contrast "makes elements predominantly black or white and highlights them with a contrasting border".
  - Less decoration in menus (A2).
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/scroll-views.json · https://developer.apple.com/videos/play/wwdc2025/219/
- How we adopt: the lesson is that legibility won every argument. A paper-coloured capsule with a 1pt ink edge is what the system itself draws for glass under Increase Contrast, so an opaque version of the floating bar is a legitimate reading of the language, not a refusal of it. If we use glass, use the real material so the user's slider and accessibility settings apply. Never imitate glass with a blur and a white overlay.

### B. Component rules

**B1. Tab bars** [source]
- What it says:
  - "A tab bar floats above content at the bottom of the screen. Its items rest on a Liquid Glass background that allows content beneath to peek through."
  - "Use a tab bar to support navigation, not to provide actions."
  - "Prefer filled symbols or icons for consistency with the platform."
  - "Use single words whenever possible."
  - "Don't disable or hide tab bar buttons."
  - A bar "can include a dedicated search tab at the trailing end", and it can minimise on scroll.
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/tab-bars.json
- What is weak in ours (`src/navigation/Root.tsx`, `TabBar`): `borderTopWidth: 1` on an opaque `tabBg`, pinned to left/right/bottom 0; a dashed-square 담기 action in the middle slot; outline icons whose selected state is a darker colour and a slightly heavier stroke (2.1 against 1.8), not a filled glyph; a 2pt indicator bar at the top edge.
- How we adopt (proposal, for Home, 만다라트, 오늘, 통계):
  - Four destinations in one floating capsule, inset from the screen edges by our 20pt gutter, with 담기 as its own circle at the trailing side. That is the grammar iOS uses for a search tab and, in 27, for a prominent tab.
  - Selected tab: filled glyph in ink plus the label in ink. Unselected: outline in `sub`. Drop the top indicator bar; the filled glyph does that job.
  - Labels stay one word: 홈 · 만다라트 · 오늘 · 통계.
  - Take exact heights, insets and gaps from Apple's iOS 27 Figma kit (published September 17, 2026) instead of guessing. I could not find these metrics in HIG text.

**B2. Scroll edge effect instead of divider lines** [source]
- What it says:
  - "Instead of applying a solid or semi-opaque background color beneath controls, use a scroll edge effect to visually elevate controls above content."
  - "Scroll edge effects reinforce that boundary, replacing hard dividers with subtle blur."
  - "Scroll edge effects aren't decorative."
  - "Only use a scroll edge effect when a scroll view is behind floating interface elements." "Apply one scroll edge effect per view."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/scroll-views.json · https://developer.apple.com/videos/play/wwdc2025/356/
- How we adopt: let every scrolling screen run to the bottom of the display, under the floating bar. Replace the top rule with a short fade of the paper colour behind the bar (proposal: about 32pt, paper at 0% to about 90%). This is the one gradient worth allowing: it is functional, it is what the platform does, and it is invisible when nothing is beneath the bar. Keep the earlier ban on gradients for decoration.

**B3. Concentric shapes** [source]
- What it says:
  - "We use three shape types to build concentric layouts: fixed shapes have a constant corner radius. Capsules use a radius that's half the height of the container. And concentric shapes calculate their radius by subtracting padding from the parent's."
  - "For phone layouts, use a capsule with extra margin to create space near the screen edge."
  - Bordered buttons "now have a capsule shape by default".
- Links: https://developer.apple.com/videos/play/wwdc2025/356/ · https://developer.apple.com/videos/play/wwdc2025/323/
- What is weak in ours: radii are scattered (a grep of `src` finds 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16) with no rule connecting them.
- How we adopt: three values only.
  - Paper: 0–2pt (chart cells, checkboxes, ledger boxes).
  - Tools: capsule, radius = height / 2 (tab bar, 담기, primary buttons, snackbar).
  - Nested tools: inner radius = outer radius minus padding (a selected-tab highlight inside the bar; a button inside a sheet).

**B4. Sheets** [source]
- What it says:
  - "On iOS 26, partial height sheets are inset by default with a Liquid Glass background." "When transitioning to a full height sheet, the glass background gradually transitions, becoming opaque and anchoring to the edge of the screen."
  - "Include a grabber in a resizable sheet." "Support swiping to dismiss a sheet."
  - Button placement, updated March 24, 2026: "the Cancel button belongs on the leading edge of the top toolbar. When present, the Done button belongs on the trailing edge." "If you provide a Done button, always pair it with a Cancel button."
  - Action sheets now spring "from the action itself".
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sheets.json · https://developer.apple.com/videos/play/wwdc2025/323/ · https://developer.apple.com/tutorials/data/documentation/technologyoverviews/adopting-liquid-glass.json
- What is weak in ours (`src/components/common.tsx`): edge-attached, `borderTopLeftRadius: 16`, a top rule, a drop shadow, a fixed 46% backdrop.
- How we adopt (CellEditor, QuickAdd, PickToday, WeekRitual, PrintSheet):
  - Partial-height sheets float inset from the left, right and bottom edges with all four corners rounded far more than 16pt. Proposal: 8pt inset; take the radius from the Figma kit.
  - Full-height sheets attach to the edges and round only the top.
  - Header: close (xmark) at the leading edge, confirm (checkmark) at the trailing edge in the accent colour. Never a lone 완료.
  - Our own ActionSheet should open next to the control that triggered it, not always from the bottom.
  - Alternative for simple sheets: `@expo/ui` `BottomSheet`, which is the real system sheet (see D3).

**B5. Top-of-screen actions** [source]
- What it says:
  - "Group toolbar items logically by function and frequency of use." "In general, aim for a maximum of three" groups.
  - "Use the .prominent style for key actions such as Done or Submit … Only specify one primary action, and put it on the trailing side."
  - "Prefer system-provided symbols without borders." "don't mix text and icons across items that share a background."
  - "Use a large title to help people stay oriented as they navigate and scroll."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/toolbars.json · https://developer.apple.com/tutorials/data/documentation/technologyoverviews/adopting-liquid-glass.json
- How we adopt: our screens have a large left-aligned title and bare icons at top right (share and pencil on 만다라트, sliders on Home). That already matches the large-title pattern. If these actions should stay reachable while scrolling, pin them as one small floating group at top right with the same capsule treatment as the tab bar. One group, icons only, at most one tinted action per screen.

**B6. Colour on and around glass, and brand colour** [source]
- What it says:
  - "Apply color sparingly to the Liquid Glass material, and to symbols or text on the material." "To emphasize primary actions, apply color to the background rather than to symbols or text." "Refrain from adding color to the background of multiple controls."
  - Branding, refined September 9, 2026: "Apply your app's accent color judiciously … To express your brand through color, consider moving it into the content layer, where it scrolls beneath Liquid Glass controls and gets picked up dynamically."
  - "Even if your app ships in a single appearance mode, provide both light and dark colors to support Liquid Glass adaptivity."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/color.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/branding.json
- How we adopt: we are already close. Chrome is ink monochrome and the eight area colours live in the content. Tighten it: gold fills exactly one primary control per screen (담기, or a sheet's confirm) and marks selection. Never use gold as small text on paper; it measures 3.10:1 there (B10).

**B7. Typography** [source]
- What it says:
  - iOS default text 17pt, minimum 11pt. "In general, avoid light font weights."
  - iOS 26 type is "now bolder and left-aligned to improve readability in key moments like alerts and onboarding".
  - Text styles at the default size: Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3 20/25, Headline and Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18, Caption 1 12/16, Caption 2 11/13.
  - Custom fonts: "It can work well to use a custom font for headlines and subheadings while using system fonts for body copy." "The primary thing to be aware of when using custom fonts on iOS is how they scale."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json · https://developer.apple.com/videos/play/wwdc2025/356/ · https://developer.apple.com/videos/play/wwdc2026/251/
- How we adopt: our scale (`src/theme/type.ts`: 56 / 26 / 18 / 16 / 13 / 11) is near the system's, and bold left-aligned titles match the current direction. Two checks. First, body and row titles are 16 where the platform default is 17; try 17 on the Today list and Settings rows, the screens that sit closest to system lists. Second, Pretendard everywhere means Dynamic Type and Bold Text are our job; test the largest accessibility sizes on Today and the 3×3. The 56pt date numeral is a legitimate "memorable moment" use of display type, in the sense the brand session describes.

**B8. Interface icons** [source]
- What it says:
  - "Maintain visual consistency across all interface icons in your app": size, detail, stroke weight, perspective.
  - "Match the weights of interface icons and adjacent text."
  - Standard meanings: `checkmark` Done, `xmark` Cancel, `plus` Add, `ellipsis` More, `square.and.arrow.up` Share, `square.and.pencil` Compose, `trash` Delete.
  - WWDC26: "if you take creative liberty with the delete icon. People don't get that immediate recognition."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/icons.json · https://developer.apple.com/videos/play/wwdc2026/250/
- How we adopt: keep our own line set; Apple's NYT Cooking example does the same. Two changes. Draw filled variants of the four tab glyphs for the selected state. And check the share icon: the 만다라트 screen uses the three-connected-dots glyph, which is the Android and web convention. The session's point about NYT Cooking is that its share icon follows each platform's own pattern, which on iOS is the arrow leaving a box.

**B9. Motion** [source]
- What it says: "Aim for brevity and precision in feedback animations." "In apps, generally avoid adding motion to UI interactions that occur frequently." "Let people cancel motion." With Reduce Motion: "Replace transitions in x-, y-, and z-axes with fades" and "Avoid animating into and out of blurs."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json
- How we adopt: checking a box happens dozens of times a day, so it gets a short mark and a haptic, nothing more. Save choreography for rare moments: closing the week (WeekRitual), closing the year (YearClose), finishing a whole 3×3 block.

**B10. Accessibility numbers** [source for the rules, measured today for our palette]
- What it says: contrast 4.5:1 for text up to 17pt, 3:1 for 18pt and up or bold. Controls 44×44pt by default, 28×28pt minimum. About 12pt of padding around bezelled elements. In Dark Mode "strive for a contrast ratio of 7:1, especially in small text". "Avoid offering an app-specific appearance setting."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/dark-mode.json
- Our palette on paper `#FBF9F4`, computed today from `src/theme`:

  | Token | Ratio | Verdict |
  |---|---|---|
  | ink `#2B2620` | 14.25 | passes |
  | sub `#6F6657` | 5.37 | passes |
  | faint `#AAA08D` | 2.46 | fails for any text |
  | gold `#B0883C` | 3.10 | large or bold text and fills only |
  | rule `rgba(110,85,40,0.12)` | 1.19 | 1.43 in our high-contrast edition |
  | area colours as text | 4.32–5.11 | 연지, 황토, 쑥 are under 4.5 |
  | white on area colours | 4.54–5.37 | passes |

- How we adopt: stop using `faint` for anything that must be read (the weekday letters and "+5" counts on Home look like this tier). The 1.19:1 rule is the numeric form of the "메리하리가 없다" complaint in the competitor memo: structure in the chart needs a second, darker rule weight for 3×3 block edges. Confirm `areaInk()` is used wherever an area colour becomes text.

**B11. App icon and Icon Composer** [source]
- What it says:
  - Icons are layered: "a background layer and one or more foreground layers". Appearances: default, dark, clear light, clear dark, tinted light, tinted dark, on a 1024×1024 canvas.
  - "Consider basing your icon design around filled, overlapping shapes." Outline-only shapes are shown as the incorrect example.
  - "Ideally, sharp edges and thin lines should be avoided." Use the system light and dark gradients "instead of pure white or black backgrounds", and "we actually recommend leaning more into colored backgrounds".
  - Added October 28, 2026: a flat bitmap is split by the system into two layers, and Liquid Glass applies to large, simple foreground shapes, not to "text and thin lines". "Provide your icon in the Icon Composer format for more flexibility and control."
  - Organise layers into "a maximum of four groups". Export SVG layers without blurs, shadows or backgrounds.
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/app-icons.json · https://developer.apple.com/tutorials/data/documentation/xcode/creating-your-app-icon-using-icon-composer.json · https://developer.apple.com/videos/play/wwdc2025/220/
- What is weak in ours (`assets/icon.png`): a 3×3 grid drawn in ink lines with a gold centre on flat off-white. The mark fills only about 55% of the canvas width, every corner is sharp, the shapes are outlines, and the background is near-white. In clear and tinted modes the lines are what remains.
- How we adopt: keep the idea (nine cells, the centre is the goal) and redraw it as filled shapes.
  - Background: paper as a soft light-to-dark gradient, or a full-bleed ink or gold ground for separation on light wallpapers.
  - Group 1: eight filled cells with slightly rounded corners, varied in opacity for depth.
  - Group 2: the centre cell in gold, larger, overlapping its neighbours.
  - Ship it as a `.icon` file. SDK 56 accepts that when `ios.icon` is a string path: `withIosIcons.js` in the installed `@expo/prebuild-config` warns that "Liquid glass icons (.icon) should be provided as a string to the "ios.icon" property, not as an object", and today `app.json` passes an object of three PNGs.

**B12. Widgets in clear and tinted modes** [source]
- What it says:
  - In those modes the system "renders your widget in the accented rendering mode", "tints primary and accented content white in iOS and macOS", and "removes the background and replaces it with a themed glass or tinted color effect".
  - Margins: "16 points for most widgets", 11 when tight. Text "at 11 points or larger".
  - "Try your widgets in full color, tinted, and clear mode."
  - New in iOS 27: the extra-large portrait family.
- Links: https://developer.apple.com/tutorials/data/documentation/widgetkit/optimizing-your-widget-for-accented-rendering-mode-and-liquid-glass.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/widgets.json · https://developer.apple.com/videos/play/wwdc2026/277/
- How we adopt: `TodayWidget.ios.tsx` already branches on `widgetRenderingMode` and declares `containerBackground`, which is the right base. In clear and tinted modes the area colours disappear, so the mini-chart must read by fill against outline alone. Make that a named test case and add both modes to the screenshot set. `@expo/ui` 56 exposes `widgetAccentedRenderingMode` (for images) but I found no `widgetAccentable` in it or in `expo-widgets` 56; on iPhone both groups are tinted white anyway, so nothing is lost there.

**B13. Live Activity** [source]
- What it says: Lock Screen margin 14pt. "Use large, heavier-weight text — a medium weight or higher." Added October 13, 2026: "adapt your compact and minimal presentations to fit inside a 28pt-diameter circle. Use a short abbreviation or graphic representation instead of a full text string." Animations at most two seconds.
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/live-activities.json
- How we adopt: the 25-minute focus timer needs a limited-width form. A two-digit minutes numeral or a ring fits a 28pt circle; "24:13" does not.

### C. Apps Apple holds up, and what they did

**C1. "Communicate your brand identity on iOS" (WWDC26 session 251)** [source]
- What it is: Apple's own answer to "how do I keep my identity inside Liquid Glass", with named apps.
- What is good:
  - The premise: the content layer "is the best opportunity to express your brand identity". Custom versions of utilitarian elements "don't usually reinforce a brand" and "can make the product appear less native - or even dated".
  - Slack: a custom top toolbar that keeps native button sizes, placement and popover behaviour; tint only for primary actions, unread badges and the selected tab.
  - NYT Cooking: its own sharp, line-weight icon set; the logo only on Home, fading on scroll; zoom transitions from the tapped item.
  - Crumbl: its own typeface in large headers only, with layouts that reflow at large text sizes instead of truncating.
  - Gentler Streak: system fonts only, with identity from illustration and data visualisation.
  - Closing line: "forcing your brand can compromise the user experience."
- Links: https://developer.apple.com/videos/play/wwdc2026/251/
- How we adopt: this is the template for our decision. Notebook identity goes into the chart, the lists, the date numeral, the 正 tally marks and the copy. Chrome behaves like iOS. For a custom-drawn app that means copying behaviour and geometry exactly: sizes, placement, what scrolls under what, how sheets move.

**C2. Moonlitt and Tide Guide (Apple Design Awards 2026)** [source]
- What is good: Moonlitt won Interaction for "best-in-class Liquid Glass integration, and easy onboarding". The brand session adds that its custom lunar calendar uses Liquid Glass, a primary dismiss action and edges concentric with the hardware, over edge-to-edge night-sky content (the session summary's wording, not a direct quote). Tide Guide won Visuals and Graphics: it "integrates the new design and Liquid Glass, adding extra polish to data presentation and custom animations", has "rich full-screen charts", widgets that "save a step right from the Home Screen", and a palette "designed to match the color of the sky throughout the day".
- Links: https://developer.apple.com/design/awards/
- How we adopt: both are data utilities whose hero is a custom, full-bleed visualisation with glass controls over it. Ours is the chart. Let the 9×9 run edge to edge on the 만다라트 tab with the bar floating over its bottom margin, instead of boxing it between a title block and an opaque bar.

**C3. grug (Apple Design Award 2026, Delight and Fun)** [source]
- What it is: a two-person daily-wisdom app with an entirely hand-drawn interface, including the status bar.
- What is good: it won in the Liquid Glass year with no glass in sight. The team rejected ready-made handwriting fonts ("they looked too clean and polished"), built their own stroke-based type engine, and animated text "like ink appearing on paper". Their warning applies to us: "If we had compromised on the handwritten engine early, grug would probably feel like a quote app with a cute font." Apple's note: "no login, no cloud syncing, nothing extraneous." Their advice: "Build with the platform, not against it."
- Links: https://developer.apple.com/news/?id=ux44ymcr · https://developer.apple.com/design/awards/
- How we adopt: a strong authored look can win now, but only when it is carried all the way through. Ours currently stops halfway. The paper is there (dots, rules, tally marks), yet the tab bar, sheets and icon are generic flat UI rather than either notebook or iOS. Pick per element: fully authored (the chart, the tally marks, a pen-stroke check) or fully platform (bars, sheets). The in-between is the weak spot.

**C4. Structured and Tiimo (the planner neighbours)** [source]
- What is good: Structured (ADA 2026 finalist, 2025 iPad App of the Year finalist) is described as a "SwiftUI-built daily planner" that is "visually sharp and easy to scan". Tiimo (2025 iPhone App of the Year): "By turning our chaotic calendars into a timeline of soothing colors, Tiimo did the unthinkable: It made tackling our to-dos a calming activity."
- Links: https://developer.apple.com/design/awards/ · https://developer.apple.com/app-store/app-store-awards/
- How we adopt: the planners Apple rewards are praised for scanning speed and calm colour, not for feature count. Two tests for our Today list and week strip: can you read today's state in one second, and do the eight area colours feel calming or busy at list density.

**C5. Design principles, reintroduced June 8, 2026** [source]
- What it says: eight principles: Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight. The lines that bear on our earlier bans: "Simplicity isn't minimalism." "Don't mistake delight for decoration." "Keep your interface current with the latest platform capabilities and design patterns." And from the session: "When your hierarchy is strong, the most important item on the screen is always the most obvious one."
- Links: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/design-principles.json · https://developer.apple.com/videos/play/wwdc2026/250/
- How we adopt: the earlier ban list (no gradients, shadows, rounded cards, pills) defined the design by what it avoids. Replace it with positive rules per layer (A1, B3) and a hierarchy test per screen: name the single most important item, then check it is the most obvious one. On Home today the 56pt date wins, while the core goal and today's to-dos are quieter.

### D. Our stack

**D1. `expo-glass-effect`** [source: npm tarballs 56.0.4 and 58.0.5]
- What it is: `GlassView` and `GlassContainer`, the real `UIGlassEffect` in a React Native view. Not installed in our project.
- API in 56.0.4: `glassEffectStyle` (`'regular' | 'clear' | 'none'`, or a config with `animate`), `tintColor`, `isInteractive`, `colorScheme`; `GlassContainer` with `spacing`; `isLiquidGlassAvailable()` and `isGlassEffectAPIAvailable()`.
- Behaviour: "This package only supports iOS 26+. On unsupported platforms, it will fallback to a regular View." Availability is true only when built with Xcode 26, running on iOS 26 or later, and `UIDesignRequiresCompatibility` is not set.
- Known issues from its changelog: glass did not render when a view "fades in from low opacity" (fixed only in 58.0.2 and 58.0.5); `isLiquidGlassAvailable` was corrected for the iOS 27 SDK in 58.0.0.
- How we adopt: if we want real glass on the tab bar, 담기 and the snackbar, this is the smallest way in. Give the same view our paper style as its fallback for iOS 16.4–18 and for Reduce Transparency. On SDK 56, never animate the opacity of a `GlassView` or its parents; move or scale it instead. Put the bar and 담기 in one `GlassContainer`, because "glass can not sample other glass".

**D2. `expo-router` native tabs** [source: npm tarballs 56.2.22 and 58.0.31]
- What it is: the system tab bar, through `react-native-screens`. In SDK 56 the import is `expo-router/unstable-native-tabs`; SDK 58 also exports `expo-router/native-tabs`.
- What it offers in 56: SF Symbol or image icons with a selected icon, badges, `minimizeBehavior` (iOS 26+), `NativeTabs.BottomAccessory`, `role` including `search`, `sidebarAdaptable`.
- What 58 adds: `prominent` ("Shows the tab on its own surface in the tab bar, which stays visible when the tab bar minimizes", iOS 27+), `preferredPlacement` for the sidebar, and the note that "On iOS 26 and later, the system draws the tab bar background and this prop has no effect".
- How we adopt: not for 1.0. We have neither `expo-router` nor `react-native-screens` installed, and navigation is a hand-written 756-line `Root.tsx` with our own two-page spread. Native tabs would give system glass, minimising and, I expect, the iPhone Duo side placement for free. They would also end the paper-coloured bar, since the background cannot be set on iOS 26 and later. Revisit after launch together with the SDK 58 upgrade.

**D3. `@expo/ui` SwiftUI views** [source: installed 56.0.26]
- What it is: SwiftUI components and modifiers hosted in React Native. Already a dependency; we use it only for the widget and the Live Activity.
- Relevant pieces: `glassEffect({ glass: { variant, interactive, tint }, shape, cornerRadius })`, `glassEffectId`, `GlassEffectContainer`, `ConcentricRectangle`, `buttonStyle('glass' | 'glassProminent')`, `BottomSheet` with `presentationDetents`, `presentationDragIndicator` and `presentationBackgroundInteraction`, `Menu`, `ContextMenu`, `ConfirmationDialog`, `Picker`, `DatePicker`, and `RNHostView` for React Native content inside SwiftUI. Its `TabView` comment says to prefer `expo-router/unstable-native-tabs` for routed tabs.
- How we adopt: use it where the system component is the right answer and custom drawing adds nothing. A real `BottomSheet` for short sheets gives the iOS 26 inset, corner radius, detents and grabber without us measuring anything. System `Menu` and `ContextMenu` suit long-press on a chart cell. `ConfirmationDialog` suits destructive confirms because it anchors to its source. `AGENTS.md` requires reading the v56 docs before writing this code; I could not open them today.

**D4. `react-native-screens`** [source: npm tarball 4.30.1]
- What it is: the native navigation layer under React Navigation and expo-router. Not installed. Current `latest` is 4.30.1, and expo-router 56 needs `^4.26.0`.
- Relevant: a `scrollEdgeEffects` prop per edge that maps to `UIScrollEdgeEffect`, with the note that using `blurEffect` and `scrollEdgeEffects` together on iOS 26 "may cause overlapping effects".
- How we adopt: nothing now. It matters only if we take D2.

**D5. SDK currency** [source: npm registry, queried today]
- What it is: `expo` dist-tags are `latest` 58.0.25, `sdk-57` 57.0.33, `sdk-56` 56.0.24. Bare templates pin React Native 0.85.3 for SDK 56, 0.86.3 for 57 and 0.88.1 for 58.
- Why it matters: A3. Once we build with the 27 SDK, the compatibility key is ignored, the scene life cycle and a launch screen are required, and the refined glass and new scroll edge visuals apply to every system piece in the app.
- How we adopt: ship 1.0 on 56 with Xcode 26. Plan the 58 upgrade as the first post-launch task, and do the chrome work in D1/B1 so that it survives that upgrade. Use `GlassView`, not a hand-made blur.

### E. Putting it together: what a custom-drawn app should do

**E1. Geometry and behaviour first, material second** [my synthesis of B1–B4 and C1]
- A full-width opaque bar with a hairline reads as iOS 7–18 at thumbnail size, in the App Store screenshots before anyone opens the app. A floating capsule with content passing beneath reads as current even when it is opaque paper.
- So, in order of value for effort:
  1. Float the bar and separate 담기 (B1).
  2. Let content scroll beneath, with a fade instead of a rule (B2).
  3. Inset the partial sheets and fix their buttons (B4).
  4. Three-value radius system (B3).
  5. Filled selected icons (B8).
  6. Optional real glass via `GlassView` (D1).
  7. Icon in Icon Composer (B11).
  8. Widget and Live Activity checks (B12, B13).
- Decide the system `Switch` controls on purpose. For sliders and toggles the HIG says "the element takes on a Liquid Glass appearance to emphasize its interactivity when a person activates it", and the system switch is a round control sitting inside a UI of square checkboxes. Either accept it as a platform control, or replace it with our square check for consistency. The HIG allows the second if behaviour stays familiar.
- Retake the six store screenshots after items 1–3. They are where the dated bar is most visible.

## Pitfalls

- **Glass in the content layer.** A glass chart cell, list row or stats card is the mistake Apple names first. It also kills legibility on dot paper.
- **Fake glass.** A blur plus a white overlay ignores Reduce Transparency, Increase Contrast and the iOS 27 slider, and it will look wrong beside the real keyboard and share sheet.
- **Glass on glass, or two variants at once.** One `GlassContainer`, regular variant only. Clear is for media backgrounds, which we do not have.
- **Tinting everything.** "When every element is tinted, nothing stands out." Gold on one control per screen.
- **Keeping the blanket ban on round shapes.** Applied to chrome, it is now what makes the app look old. Scope the ban to the content layer.
- **Actions in the tab bar.** 담기 inside the row of destinations breaks the one tab bar rule Apple states first.
- **Fading a `GlassView` in on SDK 56.** The fix exists only in 58.0.2 and later.
- **Custom share and delete glyphs.** Familiar actions need familiar icons.
- **Sizing the chart from screen width only.** iPhone windows resize in iOS 27 and the Duo's outer display is short.
- **An appearance toggle that fights the system.** "Avoid offering an app-specific appearance setting." If the mood palettes include a dark one that ignores the system setting, check it against this rule.
- **Rewriting navigation right before 1.0.** Native tabs are the long-term answer to several of these points and the wrong thing to start now.
- **Dating the screenshots.** If we frame them, Apple posted new bezels for the iPhone 18 models and iPhone Duo on September 18, 2026.

## Not verified

- **Anything from a web search.** No third-party teardowns, press, designer posts, App Store reviews, or Korean and Japanese sources. The search budget was spent before I started. Everything external here is Apple's own text.
- **The Expo documentation site.** `docs.expo.dev` and `expo.dev` are not reachable from this session. Expo facts come from package source and changelogs, not from the v56 docs or the SDK 56/57/58 release posts. Whoever implements D1–D3 must read the versioned docs, as `AGENTS.md` requires, once those hosts are allowed.
- **Exact system metrics.** The height, insets and gaps of the iOS 26/27 tab bar, the inset and corner radius of partial sheets, and device corner radii are not in the HIG text I read. Measure them in Apple's iOS 27 Figma kit before fixing numbers.
- **iPhone Duo specifics.** Point sizes of the two displays, how a custom-drawn or iOS 26-SDK app is presented on it, and whether a JS-drawn bottom bar is left at the bottom. That native tabs would move to the side on the Duo is my inference from the HIG, not something an Expo source says.
- **The criticism in A5.** The NN/g review, beta-period changes, and the iOS 26.1 Clear/Tinted setting are from memory. The 26.1 release notes I fetched do not mention the setting. The HIG does confirm that a user preference exists, and WWDC26 confirms the iOS 27 slider.
- **How React Native's `Switch`, `Alert` and `Modal` look on iOS 26/27.** Inferred from Apple's statement that standard UIKit components pick up the new look. Check on a device.
- **Which Xcode our EAS builds use,** and whether SDK 56 would satisfy the iOS 27 SDK launch requirements.
- **How widely third-party apps adopted glass.** Apple's examples are a curated set. I have no numbers.
- **Leadership context.** From memory, Apple's design leadership changed in December 2025. Apple's 2026 materials show the direction continuing, which is all this memo relies on.
- **2026 App Store Awards.** Apple's awards page still shows the 2025 winners.
