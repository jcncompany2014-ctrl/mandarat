# Icon, App Store page, onboarding, empty states, widgets — reference memo

Research date: 2026-11-14. Scope: the surfaces that decide whether anyone installs 만다라트 and stays.

## How to read this memo (evidence levels)

Every claim carries one of three labels.

- **[Apple, read]** — I fetched the page or session transcript on developer.apple.com in this session and read the text. This is the bulk of the memo and it is current (several pages are dated June–October 2026 and describe iOS 27).
- **[search summary]** — the link came back from a web search and I only saw the search tool's summary of the page, not the page itself. Treat numbers and details as second-hand.
- **[recall]** — general knowledge from before this session. Not checked today. Do not build on it without looking.

Two limits shaped this research and you should know about them. First, in this session only `developer.apple.com` could be fetched directly; MacStories, screensdesign, lazyweb, Cultured Code, the App Store itself and docs.expo.dev were all blocked by the network allowlist. Second, the shared web-search budget ran out after 16 queries. So the Apple material is deep and verified, and the third-party teardowns (Structured, Tiimo, Finch, Opal, Duolingo, Headspace, Things, Streaks, Fantastical, Widgetsmith, Korean store pages) are thin. Section 8 lists exactly what is missing.

I also looked at what we ship today: `assets/icon*.png`, five of the six Korean iPhone store screenshots, `src/screens/Onboarding.tsx`, `src/widgets/TodayWidget.ios.tsx`, `src/widgets/FocusActivity.ios.tsx`, `store.config.json`.

Sibling memos in this folder cover neighbouring ground and I did not repeat them: `mandalart-apps.md` (competitors, including the app-name risk), `korea-japan.md`, `apple-awards.md`, `stationery-print.md`.

---

## 1. Summary

1. **The icon is the weakest of the five surfaces.** A thin ink 3×3 line grid on off-white with one small gold cell breaks four pieces of current Apple guidance at once (thin lines, sharp corners, a pale background, a flat single bitmap that gets no Liquid Glass treatment), and a line grid is not ownable: it reads as sudoku, tic-tac-toe or a photo-grid tool. Keep the idea (one centre among eight) and redraw it as nine filled, rounded tiles on a coloured ground, built as a layered Icon Composer `.icon` file. Expo SDK 56 accepts that file directly.
2. **The store screenshots are raw screen captures with a small caption on the same paper colour.** Nothing separates caption from UI, the first frame is the densest screen in the app (81 cells of 12 pt text) and a "01 / 06" counter sits where the headline should be. In a search result each frame is about a quarter of its real size, so the UI is unreadable and only the caption survives. Rebuild the first three frames as one sentence (write, do, it builds up) with enlarged crops of real UI.
3. **iOS 27 added two store placements we do not use yet:** a product page header (21:9) and a custom search-result image or video (3:2) that replaces the default screenshot strip in search. For an app whose core object is a dense grid, a designed search asset is the single biggest store-page win available. Assets can be approved in advance and swapped without a new build, which suits a New Year push.
4. **Onboarding is already close to what Apple asks for** (one screen, interactive, optional, no permission wall). Its gap is what happens next: the user lands in an app with 1 of 81 cells filled and an empty Today list. Add two short, skippable beats so the first session ends with one action checked off. Do not copy the long quiz flows of Opal or Finch; those exist to set up a paywall, which we do not have.
5. **Widgets are functional but not glanceable.** The small widget shows a 3×3 progress glyph and a 9 pt label instead of the next thing to do; text runs below Apple's 11 pt floor; list rows are 22 pt tall with a 13 pt box. The Live Activity's minimal presentation is a bare coloured square where Apple asks for live information, and iOS 27 now shows the Dynamic Island in landscape with a 28 pt width limit our compact timer text will not fit.
6. **A cross-cutting finding.** The earlier bans (no rounded corners, no gradients, no shadows) were written for the in-app look. On the icon, the widgets and the Dynamic Island they collide with platform geometry that Apple documents explicitly: rounder corners, concentric shapes, gradient icon grounds. On those surfaces the ban does not read as craft; it reads as a foreign object. Apple's 2026 guidance draws the line cleanly: brand lives in the content layer, platform conventions rule the system surfaces, and "each of these placements should consider the context. They shouldn't default to being the same."

---

## 2. Icon

### 2.1 What we ship today (viewed)

`assets/icon.png`: off-white ground; an ink line grid about 560 px wide on the 1024 canvas (about 55%); outer stroke about 30 px, inner strokes about 16 px; centre cell filled gold, about 156 px. `icon-dark.png` is the same grid in pale lines on a transparent/black ground with a brighter gold centre. `icon-tinted.png` is grey lines on pure black with a white centre. `app.json` passes three PNGs (`light`, `dark`, `tinted`); there is no layered file and no clear variant.

At Home Screen size (60 pt, 180 px) the inner lines are under 3 px; at Settings size (29 pt) about 1.4 px; at notification size (20 pt) under 1 px.

### 2.2 References

**R1. Apple HIG, App icons (change log: 28 Oct 2026, 8 Jun 2026)** [Apple, read]
https://developer.apple.com/design/human-interface-guidelines/app-icons
What it says that bears on us, in Apple's words:
- "avoid extremely thin line weights and sharp corners, because they tend to lose detail and crispness in smaller icon sizes".
- "Consider basing your icon design around filled, overlapping shapes."
- "If your app has an interface that people recognize, don't just replicate standard UI components or use app screenshots in your icon."
- "Prefer a simple background, such as a solid color or gradient". For dark: "Color backgrounds generally offer the greatest contrast in dark icons."
- If you supply a bitmap, "the system attempts to segment your icon" into two layers, and "doesn't automatically apply Liquid Glass effects to smaller, more complex elements in an icon like text and thin lines." A thin-line grid PNG is exactly the case that gets nothing.
- "Keep your icon's features consistent across appearances." Six appearances exist on iOS: default, dark, clear light, clear dark, tinted light, tinted dark.
- "Include text only when it's essential", though "a mnemonic like the first letter of your app's name can help".
Adopt: every bullet above is a requirement for the redraw in 2.3.

**R2. WWDC25 220, "Say hello to the new look of app icons"** [Apple, read]
https://developer.apple.com/videos/play/wwdc2025/220/
- "Ideally, sharp edges and thin lines should be avoided." "Using rounder corners makes it easier for the light to seamlessly travel on the edges of an element." "It helps to use bolder line weights as it will preserve details at a smaller scale."
- Use Apple's System Light and System Dark gradients "instead of pure white or black backgrounds", and "we actually recommend leaning more into colored backgrounds, so that there is a nicer distinction when switching between modes."
- "Softer light-to-dark gradients harmonize best with the direction of light."
- "By reducing the amount of overlapping, we now allow for the intersections and reflective edges of our material to really shine." Remove baked-in shadows and bevels; the material supplies them.
- Frontal, flat artwork; the material adds the nuance.
Adopt: coloured ground, rounded filled tiles, no baked effects. Our pure-black tinted asset and near-white default are both called out.

**R3. WWDC25 361 and the Icon Composer documentation** [Apple, read]
https://developer.apple.com/videos/play/wwdc2025/361/
https://developer.apple.com/tutorials/data/documentation/xcode/creating-your-app-icon-using-icon-composer.json
- Workflow: draw flat, opaque vector layers at the full 1024 canvas, one layer per colour, export SVG (text outlined), no mask, no background; add background, blur, shadow, specular and translucency in Icon Composer. At most four groups: "this number provides the right bounds for how much visual complexity an icon should have."
- Annotate three appearances: Default, Dark, Mono. Clear and Tinted are generated from Mono. For Mono: "Setting at least one element of your icon to be white, usually the most prominent or recognizable part", the rest mapped to greys.
- Dark: change fills when something "gets lost against black".
Adopt: two foreground groups (eight outer tiles; centre tile) plus a background fill.

**R4. WWDC26 8012, "Icon Composer for Beginners" group lab** [Apple, read] — the iOS 27 update
https://developer.apple.com/kr/videos/play/wwdc2026/8012/
- An existing `.icon` file gets the iOS 27 rendering automatically: "sharper rendering, a new look without having modified the annotations or your artwork at all", without recompiling.
- Apple reduced translucency in several of its own icons this year; that is a manual review item, not automatic.
- Legacy PNG icons are auto-segmented into a default Icon Composer document and may look different from what you drew.
- In clear mode the glass no longer follows the system transparency slider; it is fixed for legibility. Contrast is your job in the Mono annotation: widen the tonal range.
- Tinted: keep at least part of the foreground "white or close to white".
- "Stick to really … powerful but simple vector shapes." Test on a device: smallest size, largest size, inside a folder, outdoors, next to other icons.
- Colour-blind users: "you wouldn't want to depend on people's ability to be able to see color, to get meaning out of the icon."
Adopt: our icon's only idea, the gold centre, is carried by colour alone. It must also survive as shape or tone.

**R5. WWDC17 822, "App Icon Design"** [Apple, read; old, principles still cited by Apple]
https://developer.apple.com/videos/play/wwdc2017/822/
- Tests: Home Screen, a folder, Settings; "squint your eyes"; next to other apps in your category.
- "Be careful if you decide to represent your user interface in your icon. Clear is a great example of doing this really, really well": a UI motif reduced to a bold graphic, not a miniature screenshot.
- Lineage: change the icon rarely and deliberately.
Adopt: the nine-tile mark is an abstraction of our chart in the Clear sense; an 81-cell or line-grid drawing is a miniature screenshot.

**R6. How clear and tinted modes landed with users** [search summary]
https://tidbits.com/2026/06/23/do-you-use-it-clear-and-tinted-icons/
https://www.techradar.com/phones/iphone/im-a-huge-ios-26-fan-but-liquid-glass-has-totally-ruined-one-of-the-iphones-most-important-features
https://www.macstories.net/stories/ios-and-ipados-26-the-macstories-review/4
The summaries say: readers find apps hard to tell apart when everything is a clear or tinted squircle; icons with white backgrounds and bright colours suffer most under the system treatment; people find apps mainly by colour. I could not open the pages.
Adopt: do not rely on a pale ground; make the silhouette (nine tiles, one different) carry recognition when colour is stripped.

**R7. The category around us** [search summary for the list; recall for icon colours]
Korean store: MandaAct (Today / Mandalart / Report tabs, free, iOS only), 반다라트 (a 5×5 simplification), MandalaChart 공식 앱 (3×3 and 9×9, no account, Google Drive sync, "10,000+ users"), 만다라트 계획표 / 9칸 계획표 (reviews complain about ads), 마이만다라트. Japanese store: 無限マンダラシート (4.8), Grid ToDo Lite (4.5, colour-coded cells), マンダラチャート 公式アプリ (4.3), ポケット9マス思考, AI目標達成マンダラチャート.
https://news.hada.io/topic?id=26663
https://apps.apple.com/us/app/mandalachart-%EA%B3%B5%EC%8B%9D-%EC%95%B1/id1622352017?l=ko
https://apps.apple.com/kr/app/%EB%A7%8C%EB%8B%A4%EB%9D%BC%ED%8A%B8-%EA%B3%84%ED%9A%8D%ED%91%9C/id6449396679
https://app-liv.jp/business/all/2009/
I could not see any of their icons. It is a fair guess that most use a 3×3 or 9×9 grid, which is one more reason a plain grid will not stand out, but that is a guess.
Adopt: before finalising, put our candidates in a row with these apps' real icons and with Things, Todoist, Structured, Tiimo, Notion and Reminders.

**R8. Expo SDK 56 accepts Icon Composer files** [read locally in `node_modules`]
`@expo/config-types` (ExpoConfig.d.ts, `ios.icon`): "You can also provide a path to a .icon directory." `@expo/prebuild-config` warns that a `.icon` must be given as a string to `ios.icon`, not inside the light/dark/tinted object. I could not open docs.expo.dev v56 to read the guide; check it before implementation, as AGENTS.md requires.

### 2.3 Recommendation for our icon

Keep the concept. One cell among nine is the whole Mandal-Art idea and it is already ours. Change the drawing.

- **Form:** nine filled tiles in a 3×3, not a line grid. On the 1024 canvas: tiles about 184 px, gaps about 40 px, mark about 632 px wide (about 62% of the canvas), tile corner radius about 44 px (about a quarter of the tile). At 20 pt the gaps are still over 2 px. Check against the grid in Apple's icon template.
- **Layers:** background fill set in Icon Composer; group 1 = eight outer tiles (one SVG, slightly translucent so the ground shows through); group 2 = centre tile (opaque, the one element with a stronger specular and a soft system shadow). No baked shadow, bevel or gradient in the artwork.
- **Ground:** move off paper white. My pick to test first is a warm ochre ground from our gold (#B0883C, darker towards the bottom) with eight paper-white tiles and an ink centre tile; dark appearance inverts to an ink ground (a dark warm gradient, not #000) with dim paper tiles and a gold centre. That gives the "nicer distinction when switching between modes" Apple asks for while both stay on-palette. White on #B0883C is only about 3.3:1, so the ground probably needs to go a step deeper.
- **Mono (drives clear and tinted):** centre tile white, outer tiles a mid grey (roughly 55–65% luminance). The idea then survives with no colour at all.
- **Two alternatives worth drawing before choosing:**
  - *ㅁ.* A thick rounded square ring with the centre tile inside. ㅁ is the first consonant of 만다라트 and it is literally a square, so the mnemonic and the motif are the same shape. Simplest silhouette of the three; risk is that it reads as a "stop" or "record" glyph.
  - *Dyed mosaic.* Eight outer tiles in the eight area colours around an ink centre, on paper. Closest to what the chart looks like in the app and the most cheerful; risk is the pale ground (R6), eight colours collapsing to one in mono, and a resemblance to generic colour-grid icons.
- **Rejected:** any 81-cell drawing (too fine), the word 만다라트 or "81" (text), anything referring to Ohtani (a celebrity name; see pitfalls).
- **Process:** judge candidates at 20, 29, 40 and 60 pt, in a folder, squinting, on light and dark wallpapers in all six appearances in Icon Composer, and beside the category neighbours. Product page optimization can test alternative icons against each other after launch [Apple, read: "different icons, screenshots, and app previews"].

---

## 3. App Store product page

### 3.1 What we ship today (viewed)

Six Korean iPhone frames at 1320×2868. Each is a full-screen capture pushed down, with "01 / 06" in small grey type and a one-line caption of roughly 36–38 pt above it, on the same #FBF9F4 as the app. Order: chart, Today, Home, Stats, weekly review, year. The first five captions: "81칸에 한 해 계획을 적어요", "오늘 할 일은 저절로 담겨요", "하루를 수첩처럼 닫아요", "자주 한 칸일수록 짙어져요", "일요일엔 한 주를 돌아봐요".

What is good: the captions are plain, verb-led and in one consistent voice; the data is realistic; nothing is faked.

What is weak:
- Caption and UI are the same colour and weight class, so the frame has no focal point.
- Frame 1 is the hardest screen in the app to read small. In search each portrait frame is shown at about a quarter scale; the 81 cell labels become texture.
- "01 / 06" spends the best position on a page number.
- Frame 3 is captured mid-scroll and cuts a heading in half at the bottom edge.
- All six frames have the same layout, so the set has no rhythm and nothing is ever enlarged.
- No widget or Lock Screen frame, no dark frame, no print frame, although widgets, the Live Activity and PDF printing are real differentiators.
- No app preview video, no product page header, no search asset.
- Frame 1's caption states the mechanism (81 cells), not what the person gets.

### 3.2 References

**R9. Apple, "Creating your product page"** [Apple, read]
https://developer.apple.com/app-store/product-page/
- Name up to 30 characters; subtitle up to 30, shown under the name everywhere, avoid generic claims; promotional text up to 170 characters, editable at any time without a new version, not used for search ranking; keywords 100 characters.
- Up to 10 screenshots; "the first one to three images will appear in search results when no app preview is available, so make sure these highlight the essence of your app." "Focus each subsequent screenshot on a main benefit or feature."
- "If your app supports Dark Mode, consider including at least one screenshot" of it.
- First sentence of the description is what people see before "more".
- Product page optimization tests icons, screenshots and previews on live traffic; custom product pages can carry different screenshots, previews and promotional text per URL.

**R10. iOS 27 creative assets: header and search results** [Apple, read] — new in 2026
https://developer.apple.com/videos/play/wwdc2026/205/
https://developer.apple.com/app-store/asset-best-practices/
https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications
https://developer.apple.com/app-store/whats-new/
- A product page can now have a **header**: images or video "outside of your app screenshots and previews", "the first visual element people will see".
- **Search results:** "Instead of showing the default app screenshots, you can use an impactful image or video." Without one, events, previews and screenshots appear as before.
- Specs: header 21:9, 3840×1646, art safe area 1646×661; search 3:2, 1920×1280 to 3840×2560; universal asset 16:9, 5244×2950 PNG that serves both. Video 5–30 s, 30 or 60 fps, loops, muted in search.
- Best practices in Apple's words: header, "Focus on a single, clear idea. Visually dense or cluttered assets dilute your impact." Search, "State the obvious" and "Showcase the firsthand experience." Text, "Use a short phrase that enhances your visual rather than describes it." Do not include pricing, discounts, URLs, awards you did not win, Apple accolades, or other platforms' logos. Assets must meet a 4+ rating.
- **Asset Library:** upload and get assets approved in advance, then swap header and search assets "without a new submission". The session's own example swaps a summer header for a winter one. A preview tool shows the page and search result before submitting, in dark mode and per device.
- Screenshots: "Show what people can expect", "Lead with your best features" and sequence them "as a cohesive story"; do not spend a whole frame on accolades or a call to action.
Adopt: see 3.3. This is the placement where a dense-grid app gains most, because we control the scale of what is shown.

**R11. Apple, app previews** [Apple, read]
https://developer.apple.com/app-store/app-previews/
Up to three, each up to 30 s, captured footage only, no hands or over-the-shoulder shots, autoplay muted on the page and in search, so "consider using copy to add additional context"; choose a poster frame that works alone; no dates, seasons or prices; touch hotspots are allowed; simple dissolves and fades.

**R12. Screenshot specifications, current** [Apple, read]
https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/
1 to 10 per size, JPEG or PNG, no alpha. iPad 13-inch (2064×2752 or 2048×2732) is required if the app runs on iPad. Two things to act on: the page's "Required device sizes" line names "iPhone with Dynamic Island (medium display)" (1179×2556 or 1206×2622), while our set is the large size (1320×2868), so confirm in App Store Connect whether the large set is accepted alone; and "Starting in April 2027, screenshots will be required" for iPhone Duo (1398×2034 outer, 2007×2853 inner) for apps built with the iOS 27.1 SDK or later.

**R13. Apple marketing guidelines: device frames and Home Screens** [Apple, read]
https://developer.apple.com/app-store/marketing/guidelines/
If you show a device, use Apple-provided bezels, latest generation, unmodified: no tilt, no added reflections or shadows, nothing entering or leaving the screen, no copy on top of the device. A Home Screen may be shown only to show your own widget, with no third-party content. Status bar: full signal, Wi-Fi and battery.
Adopt: go frameless (the page is our "sheet"), or use the stock bezel straight on. Never a custom, tilted or 3D phone.

**R14. What the ASO trade says about the first three frames** [search summary; vendor blogs, weak evidence]
https://www.apptweak.com/en/aso-blog/how-to-optimize-your-app-screenshots
https://appscreenshotstudio.com/blog/first-three-app-store-screenshots-2026-conversion-playbook
https://theapplaunchpad.com/blog/app-store-screenshot-guidelines
Consistent direction across sources: most people never scroll past the first three; one idea per frame; captions of four to eight words that state an outcome; type that is readable at thumbnail size; localise at least the first frames; a "five-person, three-second" test (show the first three frames for three seconds, ask what the app does). Quoted lifts (18–31%, "70% of conversion weight") come from vendors and I would not repeat them.

**R15. Korean-market specifics** [search summary, thin] [recall]
https://www.apptweak.com/ko/aso-blog/app-store-conversion-rate
The Korean sources found repeat the general advice. I found no verified teardown of Korean store pages. From recall, unverified: successful Korean utility and planner listings tend to use very large bold Hangul headlines on a solid colour, 해요체 endings, frameless or simple straight-on device shots, and say "광고 없음 / 무료" early. Please look at five live listings (for example 투두메이트, 마이루틴, 열품타, 타임스프레드, 토스) before locking the style.

### 3.3 Recommendation for the first three screenshots and the page

**System for all frames**
- Drop "01 / 06".
- Caption zone is the top 22–26% of the frame. Two lines at most, about 12 Hangul syllables per line, Pretendard Bold or ExtraBold at 132–156 px on the 1320 px canvas (44–52 pt at 3×), which stays about 11–13 pt in a search thumbnail.
- Give the caption its own ground so it separates from the UI: ink (#2B2620) with paper-coloured type and one phrase in gold is my first choice, because three ink frames side by side will stand apart from a pastel category. Store art is not the app; the paper rules do not have to bind it.
- Below the caption, show real UI as a paper sheet, cropped and enlarged 1.3–1.6× so its text is readable. No tab bar, no status bar unless the frame is about the whole screen.
- Frameless, or the stock Apple bezel straight on (R13).

**The first three frames read as one sentence: 적고, 하고, 쌓여요.**
1. **"한 해 목표를 / 81칸 한 장에"** — the full 9×9 chart, edge to edge, with filled colour cells. This is the recognition frame for anyone who typed 만다라트. Reduce the number of visible words: let the nine block centres be legible and the rest read as coloured cells.
2. **"오늘 할 일은 / 저절로 담기고"** — three or four Today rows at large scale, one being checked, with the area colour chips visible so the link to frame 1 is obvious.
3. **"한 만큼 / 표가 짙어져요"** — the same chart as frame 1, now as the Stats heat view, darker where work was done. The repetition of the chart at both ends is what makes the three frames one story.

**Frames 4 to 8**
4. Home Screen and Lock Screen with our widgets and the focus Live Activity: "홈 화면에서 바로 체크해요".
5. Day close and weekly review with the double rule: "하루를 닫고, 한 주를 돌아봐요".
6. The printed A4 sheet: "인쇄해서 벽에 붙여요". This is the frame no competitor description mentioned and it ties straight to the paper identity.
7. Privacy and price in words: "로그인 없이. 광고 없이. 기록은 내 기기에." One frame, last or second to last, not the opener.
8. One dark mode frame (R9).

**Search asset and header (iOS 27)**
- One universal 16:9 PNG to start. Content: the nine-tile mark logic at chart scale, a 3×3 with a real goal in the centre and eight area names, large enough to read in a search row, plus a three-word phrase. "State the obvious": it should say "goal chart" to someone who has never heard the word 만다라트.
- Later, a 6–10 s looping header video: the chart filling in cell by cell as days pass. It loops cleanly by nature.
- Use the Asset Library to hold a New Year variant ("2027년 목표") and swap it in for December and January without a build. Keep dates out of screenshots and previews.

**App preview (one, 18–22 s, muted-first)**
Type a goal (2 s); the 3×3 blooms into the 9×9 (2 s); zoom a block and fill one cell (4 s); cut to Today, check two rows (4 s); day close with the double rule (3 s); widget on the Home Screen checked off (3 s). One short caption per beat. Poster frame = the filled chart.

**Text fields**
- Subtitle today: "81칸에 적는 한 해 계획" (mechanism). Alternatives to weigh: "목표 하나를 오늘 할 일로" (outcome), "81칸 목표 계획표와 오늘 할 일" (keywords). A subtitle change needs a new version, so decide before 1.0.
- Promotional text is the only field we can change freely. Put the free / no ads / no account line and the seasonal hook there.
- The description's first sentence currently explains how to fill the chart. Lead with what the person gets.

---

## 4. Onboarding

### 4.1 What we ship today (read in code)

One screen. Heading "올해 꼭 이루고 싶은 목표 하나를 적어 주세요"; an underlined input; three tappable example goals; a live 3×3 whose centre fills as you type and whose eight cells show the starting areas; one button that changes between "목표는 나중에 쓸게요", "시작하기" and "이 표로 시작하기"; a template sheet; an iCloud restore row that only appears when another device's data is found. Notification permission is asked later, when the person sets a reminder in the cell editor or in Settings.

This is a good screen. It asks one question, teaches by doing, can be skipped, and asks for no permission.

### 4.2 References

**R16. Apple HIG, Onboarding; Offering help** [Apple, read]
https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json
https://developer.apple.com/tutorials/data/design/human-interface-guidelines/offering-help.json
"Design a flow that's fast, fun, and optional." "Teach through interactivity." "Consider providing a collection of context-specific tips instead of a single onboarding flow." "Postpone nonessential setup flows or customization steps. Provide reasonable default settings." "Prefer letting people experience your app … before prompting them for ratings or purchases." Tips: one or two sentences, for features that take three actions or fewer, with eligibility rules and a cadence such as once per 24 hours.

**R17. WWDC26 250, "Principles of great design"** [Apple, read]
https://developer.apple.com/videos/play/wwdc2026/250/
Agency: "Instead of guiding someone down a pre-determined path, let them dive right into your experience." Responsibility, on a pattern Apple criticises by name: apps that "throw permission prompts the second you launch them. Long before you've figured out what the app actually does." Delight: "isn't by adding confetti … You create a delightful interface by identifying the emotion you want your audience to feel."

**R18. Apple, asking permission for notifications** [Apple, read]
https://developer.apple.com/tutorials/data/documentation/usernotifications/asking-permission-to-use-notifications.json
Ask in context: "In a task-tracking app that sends reminder notifications, you might make the request after the person schedules a first task." And **provisional authorization**: no prompt at all; notifications arrive quietly in Notification Center with Keep and Turn Off buttons, so people judge a real notification instead of a promise.
Adopt: we already ask in context. Consider provisional delivery for the morning "오늘 할 일" digest so the first one arrives without any dialog.

**R19. Duolingo: value before account** [search summary]
https://taplytics.com/blog/duolingo-ab-test-onboarding
https://screensdesign.com/articles/duolingo-onboarding-design/
Sign-up is not requested until after the first lesson, when it is framed as saving progress. An executive's recollection ties moving the sign-up back to about a 20% lift in daily users; that is an anecdote, not data. The setup questions (purpose, level, daily commitment) lead straight into practice.
Adopt: the principle, not the screens. Our "account" equivalent is effort: get one action done before asking for sixty-four.

**R20. Finch: end onboarding with a starter plan** [search summary; sources disagree on details]
https://screensdesign.com/articles/finch-app-onboarding-design/
https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/
Name and customise the bird, answer a few questions, then receive a "starter plan" checklist of simple daily goals, so the first real screen already has things to do.
Adopt: the starter plan. Leave the mascot.

**R21. Opal: the long personalised flow, and why not to copy it** [search summary] + [Apple, read]
https://lazyweb.com/canvas/flows/opal/onboarding
https://screensdesign.com/apps/opal-screen-time-control/
https://developer.apple.com/design/awards/2025/
About 19 steps: profile questions, a "Focus Report" projecting lifetime phone time (one screen shows "35 years"), Screen Time permission, pick up to three distracting apps, notifications, then a soft paywall with a seven-day trial. Apple's own note on Opal (2025 Design Award finalist) praises something else: "widgets, Shortcuts, and easy-to-set-up customizations. And fun touches like haptics".
Adopt: one small trick only, the truthful personal projection. After the first habit is chosen: "오늘부터 매일 하면 올해 안에 48번." It personalises with arithmetic instead of a quiz. Everything else in that flow is paywall staging.

**R22. Structured and Tiimo: what Apple praised** [Apple, read] + [search summary]
https://developer.apple.com/design/awards/
https://developer.apple.com/app-store/app-store-awards-2025/
https://www.lazyweb.com/flow/structured-daily-planner/onboarding
https://screensdesign.com/apps/structured-daily-planner/?vs=135528
Structured (2026 Design Award finalist, Inclusivity): "Visually sharp and easy to scan … prioritizes downtime as much as productivity", praised for "its simple layout" and for suggesting and pre-filling tasks. Its onboarding is reported as 14 screens with a paywall about two minutes in [search summary]. Tiimo (iPhone App of the Year 2025): "By turning our chaotic calendars into a timeline of soothing colors, Tiimo did the unthinkable: It made tackling our to-dos a calming activity."
Adopt: pre-filling is the idea to take. Our equivalent is suggested areas and suggested first actions from the template and suggestion data we already have. Note the emotion Apple names for both apps is calm, which our paper direction is well placed to deliver.

**R23. Things: a tutorial that is a real project** [search summary]
https://culturedcode.com/things/support/articles/2803553
At first launch Things offers a project called "Meet Things" made of ordinary to-dos you tick off to learn the app; it can be re-added later from Help or Settings.
Adopt: offer "예시 표 둘러보기", a filled sample chart built from our real components (the screenshot data, "흔들리지 않는 한 해", already exists), reachable again from Settings.

**R24. Moonlitt** [Apple, read]
https://developer.apple.com/design/awards/
https://developer.apple.com/news/?id=v1nphz91
2026 Design Award winner for Interaction, praised for "best-in-class Liquid Glass integration, and easy onboarding". Apple does not describe the flow. The developers' stated goal: "the goal was never to make people feel the complexity."
Adopt: the sentence. An 81-cell chart is our complexity; the first run should not make people feel it.

### 4.3 Recommendation for our onboarding

Keep screen 1. Add what comes after it. Three screens at most, under a minute, every step skippable, no permission, no account.

1. **Goal** (exists). One change: in November and December, "올해" is the wrong year for most people. Ask or infer which year the chart is for.
2. **Bloom, then one area.** On "시작하기", animate the 3×3 opening into the 9×9 (about 0.6–0.9 s) so the structure is taught by motion, not text. Then "어느 영역부터 시작할까요?": tapping one of the eight areas zooms into its 3×3, which teaches the app's main gesture by using it.
3. **One action for today.** Three suggested actions for that area as tappable lines plus a free field. The chosen one lands in Today as a single unchecked row. Checking it draws the first mark and says something small and true: "첫 칸이에요. 64칸 중 1칸."

Then leave the rest to context:
- After the first day close, one inline tip about the Home Screen widget.
- Notification permission stays where it is (when a reminder time is set). Optionally send the first morning digest provisionally.
- "예시 표 둘러보기" as a quiet link on screen 1 and in Settings.
- A rule for day 0: no first-run screen is blank. Home shows the mini chart and the one action; Today shows that action or three suggestions; Stats shows a ghost chart with its existing line.

---

## 5. Empty states

**R25. Apple HIG, Writing; WWDC22 "Writing for interfaces"; WWDC24 "Add personality to your app through UX writing"** [Apple, read]
https://developer.apple.com/tutorials/data/design/human-interface-guidelines/writing.json
https://developer.apple.com/videos/play/wwdc2022/10037/
https://developer.apple.com/videos/play/wwdc2024/10140/
- "Provide clear next steps on any blank screens … guide people on actions they can take, and give them a button or link to do so if possible. Remember that empty states are usually temporary, so don't show crucial information that could then disappear."
- The model example is Apple Podcasts: title "No Saved Episodes", then "Save episodes you want to listen to later, and they'll show up here." The bad example is a joke ("Nothing strike your fancy?") that does not translate and gives no next step.
- Empty states are "for education or celebration", depending on context.
- Voice stays constant, tone moves with the moment; personality belongs in "special moments"; exclamation marks sparingly.

**R26. The Calendar widget's end-of-day behaviour** [Apple, read]
https://developer.apple.com/videos/play/wwdc2020/10103/
When the day is nearly over the Calendar widget shows tomorrow's events "rather than just showing a blank widget".

**Where we stand and what to do**
Our lines already follow the Podcasts pattern: "만다라트 칸을 채우면 여기 담겨요", "하나 하면 여기부터 기록돼요", "칸을 눌러 실천 8개를 채워요". Three gaps:
- **Add the action.** Each first-use empty state should carry one text link that does the thing ("칸 채우러 가기 ›"), not only a sentence.
- **Split the two kinds.** First-use empty (teach, with a link) and all-done empty (celebrate). The all-done state, the double rule and "오늘 할 일을 다 했어요", is our signature; make it the richest moment in the app and add tomorrow's count beneath it, in the app and in the widget.
- **The chart is the largest empty state we have:** 72 blank cells on day 0. "비어 있음" labels describe the problem. Show one ghost example in the first empty cell of a zoomed block ("예) 주 3회 운동") and leave the others quiet.

---

## 6. Widgets and Live Activity

### 6.1 What we ship today (read in code)

One widget kind, "오늘", in small, medium, large, and Lock Screen inline, circular and rectangular. Small: an 11 pt date and a 3×3 chart of 32 pt cells that fill from the bottom per area, with "3/10" at 12 pt bold and "오늘" at 9 pt in the centre. Medium: that chart plus four list rows (13 pt text, a 13×13 pt checkbox, 22 pt minimum row height). Large: chart, goal, eight rows. Rows are interactive buttons. A paper pattern can be drawn behind. Tinted and vibrant modes are handled by fill height and borders, which is thoughtful. Circular Lock Screen: a 20 pt number and a 9 pt word.

Live Activity (25-minute focus): banner with a 14 pt area square, title, caption, a 34 pt countdown and a linear bar, 16 pt padding; compact = 12 pt square and 14 pt countdown; minimal = the 12 pt square alone.

### 6.2 References

**R27. Apple HIG, Widgets** [Apple, read]
https://developer.apple.com/design/human-interface-guidelines/widgets
- "Small widgets use their limited space to typically show a single piece of information." "Avoid expanding a smaller widget's content to simply fill a larger area."
- "Prefer dynamic information that changes throughout the day." "Replicating an app icon offers little additional value."
- Margins: 16 pt standard, 11 pt for tight groupings; use `ContainerRelativeShape` so inner shapes are concentric with the widget's corners.
- "In general, display text using fonts at 11 points or larger." Custom font for the large text, system font for small text.
- "Convey meaning without relying on specific colors."
- StandBy and CarPlay use the small widget, background removed and scaled up: "Glanceable information and large text are especially important", "Limit usage of rich images or color to convey meaning in StandBy."
- Interactivity: "avoid creating app-like layouts"; targets people "can tap … with confidence".
- Gallery description starts with an action verb and never says "This widget shows…".
- Lock Screen: "don't treat it as an additional way for people to launch into your app"; support the Always-On display with enough grey contrast.

**R28. WWDC20 10103, "Design great widgets"** [Apple, read]
https://developer.apple.com/videos/play/wwdc2020/10103/
Personal, informational, contextual. Small: "the most useful piece of content from your app", at most "four pieces of information". "Make sure not to scale up your smaller widget into your larger widget." No logo, no app name, no instructional text, no "last updated". Every widget needs a placeholder.

**R29. Accented and clear rendering, iOS 26 and 27** [Apple, read]
https://developer.apple.com/videos/play/wwdc2025/278/
https://developer.apple.com/tutorials/data/documentation/widgetkit/optimizing-your-widget-for-accented-rendering-mode-and-liquid-glass.json
https://developer.apple.com/videos/play/wwdc2026/277/
When the Home Screen is clear or tinted, the widget is rendered in accented mode: all content tinted white, transparent content keeps its opacity and turns white, and "the widget's background is removed and replaced with a themed glass or tinted color effect." Group views into primary and accent with `widgetAccentable`; show full-colour or semi-transparent decoration only in full-colour mode. Test in full colour, tinted and clear, and as a remote widget on a Mac. 2026 advice on scope: "Keep configuration fast — one or two parameters", "don't require configuration up front", provide several timeline entries, and reload when the app goes to the background.
For us: in clear mode the paper ground disappears and the pattern lines become white hairlines on glass. Draw the pattern only in full-colour mode.

**R30. WWDC23 10028, "Bring widgets to life"; WWDC21 10048** [Apple, read]
https://developer.apple.com/videos/play/wwdc2023/10028/
https://developer.apple.com/videos/play/wwdc2021/10048/
Interactive widgets are "accelerators" for "the most important actions in your app". Toggles update optimistically; buttons wait for a reload, so mark the value that will change with `invalidatableContent`. Use `numericText` transitions for counts. "The first widget listed is your hero use case."

**R31. Apple HIG, Live Activities; WWDC23 10194; WWDC26 223** [Apple, read]
https://developer.apple.com/design/human-interface-guidelines/live-activities
https://developer.apple.com/videos/play/wwdc2023/10194/
https://developer.apple.com/videos/play/wwdc2026/223/
- Minimal: "If possible, display updated information rather than just a logo … the Timer app's minimal Live Activity presentation displays the remaining time instead of a static icon."
- iOS 27: "Live Activities are visible in the Dynamic Island, when in portrait and landscape." In landscape, compact and minimal views must "fit inside a 28pt-diameter circle"; "use a short abbreviation or graphic representation instead of a full text string", or leave trailing empty.
- "Use large, heavier-weight text — a medium weight or higher."
- Lock Screen margin is 14 pt. Dynamic Island: "extra rounded, thicker shapes", content concentric with the island, snug to the camera, leading and trailing read as one piece of information.
- Buttons only for essentials such as pause and resume; "prefer limiting it to a single element".
- "Always end a Live Activity immediately when the task or event ends"; choose a dismissal time proportional to the activity, 15–30 minutes in most cases.
- In StandBy the Lock Screen view is scaled to 200%; check Night Mode contrast. Apple Watch and CarPlay get the compact pair, or a custom layout via the small supplemental family.

**R32. Things widgets** [search summary]
https://culturedcode.com/things/support/articles/2803567/
https://culturedcode.com/things/support/articles/5015936/
Widgets show a chosen list (Today, Tomorrow, a saved view). Interactive since 3.19, with a per-widget "Checkbox" setting to turn it off. Lock Screen set: a List, a Progress ring that fills as you check things off, and a New To-Do button. The extra-large "Up Next" is deliberately not interactive.
Adopt: the Lock Screen trio (list, progress, add) maps one to one onto ours; and the option to turn checkboxes off for people who tap by accident.

**R33. Streaks 6 widgets** [search summary of a MacStories review]
https://www.macstories.net/reviews/streaks-6-brings-habit-tracking-to-your-home-screen-with-extensively-customizable-widgets/
A widget that is essentially the app's mark as a ring that fills as tasks are completed; every widget lets you choose a theme (match the app, light, dark, automatic) and a flat or gradient background.
Adopt: the mark as a live progress object. Our nine tiles filling through the day is the same idea and connects widget and icon.

**R34. Widgets Apple singled out** [Apple, read]
https://developer.apple.com/design/awards/
https://developer.apple.com/design/awards/2025/
https://developer.apple.com/videos/play/wwdc2026/251/
Tide Guide (2026 winner, Visuals and Graphics): "its powerful widgets help swimmers and boat captains save a step right from the Home Screen." Lumy (2025 finalist): "a simple design, carefully curated color palette, and elegant widgets and Live Activities". Crumbl, used as the widget example in Apple's 2026 brand session: "branded with their pastel color palette and distinct imagery … immediately recognizable." Mela (2025 finalist): "Timers integrate with the Dynamic Island."
Adopt: "save a step" is the test. Our small widget saves no step today.

**R35. WWDC26 251, "Communicate your brand identity on iOS"** [Apple, read]
https://developer.apple.com/videos/play/wwdc2026/251/
Two layers: the content layer "is the best opportunity to express your brand identity"; the UI layer should "lean into what's already familiar". Utilitarian custom controls "can make the product appear less native - or even dated." Colour: "exercise restraint"; move brand colour into the scrolling content. Type: a custom face for headers and memorable moments, tested with Dynamic Type; Gentler Streak gets distinct character from system fonts alone by mixing widths and SF Rounded. "Each of these placements should consider the context. They shouldn't default to being the same." "Forcing your brand can compromise the user experience."

**R36. Committing to one authored idea: grug and (Not Boring)** [Apple, read]
https://developer.apple.com/news/?id=ux44ymcr
https://developer.apple.com/design/awards/
grug (2026 winner, Delight and Fun) drew its own letterforms and built a renderer for them: "If we had compromised on the handwritten engine early, grug would probably feel like a quote app with a cute font. Instead, it feels like its own little world." Apple on (Not Boring) Camera: "the secret behind its big, bold designs: Ensure the products excel in all other areas too."
Why it is here: this is the nearest Apple-endorsed answer to "how do we not look generic". Neither app got there by banning things. Each picked one idea and carried it all the way through, including into its widgets.

**Not covered by any source this session:** Structured's, Fantastical's and Widgetsmith's widgets. From recall only: Fantastical offers many widget kinds per size (up next, month with events, date); Widgetsmith made user-styled fonts, colours and photos the product, and Home Screen decoration is a strong habit among Korean iPhone users. Unverified.

### 6.3 Recommendation for our widgets

1. **Make the small widget answer "what next".** Left count as a large numeral (about 40 pt, bold, monospaced digits), the next action's title beneath (15–16 pt semibold, two lines), and a thin strip of nine tiles as progress. Nothing under 12 pt; Hangul needs it. This layout also survives StandBy and CarPlay, where the background is removed and colour should not carry meaning.
2. **Keep the chart, as a second kind.** "표" (the 3×3 filling by area) is a good object but it is a picture of progress, not the next step. List "오늘" first in the gallery.
3. **Consider a third kind later: "목표".** The core goal sentence set large, with days left in the year. It is personal, changes daily, and is the one people would arrange a Home Screen around.
4. **List metrics.** Rows at least 26–28 pt tall, checkbox 18–20 pt, text 15 pt. Medium shows three or four rows, large six or seven. Offer a setting to turn checkboxes off.
5. **Margins and corners.** 16 pt outside, 11 pt inside groups, and make the outermost drawn shape concentric with the widget corner. A square-cornered table sitting 12 pt from a rounded glass corner is the visible clash today.
6. **Three rendering modes on purpose.** Full colour: paper, dyes, pattern. Accented (tinted and clear): no pattern, no reliance on hue, count and next action marked as the accent group. Vibrant (Lock Screen): opaque greys at full opacity. `widgetRenderingMode` is already read in our code; whether `expo-widgets` exposes `widgetAccentable` needs checking.
7. **Lock Screen.** Circular becomes a gauge around the left count. Rectangular leads with the next action. Add a third: a "담기" add button.
8. **States.** Empty links to 담기. All done shows the double rule and tomorrow's count. Placeholder is the layout with redacted bars.
9. **Gallery.** Realistic sample goals in the preview, a verb-led description ("오늘 할 일을 보고 바로 체크해요"), and the Add button tinted gold.
10. **Live Activity.** Minimal and compact-leading become a small circular countdown ring in the area colour; provide a limited-width compact for landscape on iOS 27; lift 11–12 pt regular captions to medium weight; 14 pt banner margin; one pause and resume control; end at zero and dismiss within a few minutes; soften the square's corners a little so it sits concentrically in the island.

---

## 7. Pitfalls to avoid

1. **Do not use Ohtani's name or image** in the icon, name, subtitle, keywords, screenshots or header. Apple's keyword rules prohibit "celebrity names, and other protected words", and call improper keywords "a common reason for App Store rejections" [Apple, read].
2. **No long quiz onboarding, no feature carousel, no permission at launch.** Apple's 2026 session criticises launch-time permission prompts directly. Quiz flows are paywall machinery.
3. **Do not ship the icon as a flat PNG.** It will be auto-segmented, its thin lines get no glass, and it may be re-rendered in ways we did not draw.
4. **No pure white or pure black icon ground; no thin lines; no sharp corners; no baked shadows or bevels.**
5. **Do not let colour alone carry meaning** in the icon, in tinted or clear widgets, on the Lock Screen or in StandBy Night Mode.
6. **No custom, tilted or 3D phone mock-ups** in store art, and no Home Screen containing other apps' content.
7. **No prices, discounts, URLs, awards or dates** in header or search assets; no seasonal references in previews. Seasonal copy goes in promotional text and swappable Asset Library assets.
8. **Do not open the store page with the densest screen at full-screen scale.**
9. **Do not repeat one widget layout at three sizes,** and do not put the app icon, app name or instructions in a widget.
10. **Do not leave the Live Activity's minimal view as a static mark,** and do not let it outlive the timer.
11. **Do not extend the in-app bans to system surfaces.** Icon, widgets and the Dynamic Island have their own geometry.
12. **Do not treat vendor conversion percentages as facts.**
13. **Do not make widget or onboarding copy cute.** Apple's bad empty-state example is a joke that does not translate; we ship in three languages.

---

## 8. What I could not verify

- **Third-party pages were not opened.** Everything marked [search summary] rests on the search tool's summary. Hosts that would need to be allowed for a second pass: macstories.net, screensdesign.com, lazyweb.com, culturedcode.com, tidbits.com, apptweak.com, apps.apple.com, apple.com (newsroom), docs.expo.dev.
- **The search budget ran out** before I could look for: Headspace, Fantastical and Widgetsmith; teardowns of top productivity listings; Korean and Japanese store-page examples; notification opt-in data; device frame versus frameless tests.
- **I saw no competitor icon or screenshot.** Section 2's claim that a line grid is common in this category is an inference.
- **Onboarding details for Structured, Tiimo, Headspace and Moonlitt** (order of screens, where permissions fall) are unknown. Finch and Opal step counts differ between sources.
- **Korean-market conventions** in R15 are recall.
- **Screenshot size requirement:** the help page's "Required device sizes" names the medium Dynamic Island size; confirm in App Store Connect that our 1320×2868 set is enough.
- **Whether "만다라트" is available** as an exact app name in the Korean, Japanese and US stores. It is the category's generic word and several apps use it in their names. `mandalart-apps.md` raises the same risk.
- **Expo specifics:** that `.icon` works end to end in an SDK 56 prebuild (I read the type definition and the plugin source, not the guide); that `expo-widgets` exposes `widgetAccentable`, circular timer progress, gauges, `isDynamicIslandLimitedInWidth` and supplemental activity families.
- **Widget timeline behaviour** at midnight and the Live Activity's end and dismissal timing were not read in code.
- **Which year the chart is for** when someone installs in November or December.
- **Icon measurements** in 2.1 are estimated by eye from the PNG.
- **Colour picks** for the icon ground are a starting point; contrast was calculated only for white on #B0883C.
