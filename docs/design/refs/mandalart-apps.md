# Mandalart / mandala-chart apps: the competitive bar

Research date: 2026-11-14. Scope: 만다라트 / マンダラチャート / マンダラート / Mandalart apps on iOS, Android and the web in Korea, Japan and globally, the Ohtani chart and printable templates, and adjacent goal-breakdown apps.

**How to read this memo.** I could not open any page directly: `WebFetch` failed for `apps.apple.com` and `dev.to` (hosts not allowed in this session), so every fact below comes from web-search result extracts of the linked pages, not from reading the full page, and never from seeing a screenshot. The shared search budget also ran out before I finished (see "Not verified"). Each reference is marked **[source]** (read in a search extract of the linked page) or **[recall]** (my general knowledge, not checked today). Numbers in the "How we adopt" lines are my proposals, not something a competitor published.

## Summary

1. **The bar inside this category is low, and nobody owns it.** The largest rating base I found anywhere is the Japanese official app at about 81 ratings (4.5–4.6). In Korea the best-rated app has 16 ratings (마만다, 4.8) and the best-known one has 13 (플랜빌더, 3.3). Most listings say "not enough ratings to display".
2. **The category is filling with small, look-alike apps, many AI-built.** About ten of the listings I found look new since late 2024 (MandaAct, MandaPlan, AI - 만다라트 계획표, Madarart, Mandalart - Habit Tracker, Mandalart Daily, Mandala Goal, 만다, 만다라트 AI…); for some I am inferring the date from release notes or the App Store ID range. MandaAct's maker says outright that a non-developer built it with Claude Code. "AI fills the 81 cells for you" is now the default pitch, so it no longer differentiates.
3. **The complaints are about the grid itself, and they are the same everywhere.** Text too thin to read on a phone (플랜빌더), 3×3 blocks hard to tell apart and "no contrast, hard to check at a glance" (Japanese official app), small input fields, hard-to-hit buttons for moving between blocks, an editor that loses the context of the surrounding cells.
4. **This is a warning for our current direction, not only an opening.** A hairline-ruled table in muted colours on off-white is exactly the recipe that earned the official app its "メリハリがない" (no visual emphasis) verdict. If we keep the paper look, hierarchy has to come from rule weight, tint and type weight, deliberately.
5. **What the best ones do that we do not (from a quick grep of `src`, not a full audit):** free pinch-zoom with a 9-block minimap (Madarart), lighter chart shapes for people who find 64 actions heavy (반다라트 5×5, 마만다 cross / short types), per-cell progress %, photos and links (official app, 마만다, マンダラボード), on-device import of a paper chart by photo (MandaAct), and a stamp or mark for "achieved" (目標ノート, Notion templates).
6. **Our real opening:** craft and legibility of the 81 cells on a phone, print-quality output, platform depth (widgets, Live Activity, Siri, iPad spread), free with no ads, no account and no data collected, and a whole-year arc (weekly review, year close, archive). I found no competitor that advertises a print-ready PDF, a Live Activity, or a year archive.
7. **Store-name risk:** an app titled exactly "만다라트" already exists on the App Store (id6444119494). Our Korean title is the same string. See "Names already taken".

## Market table

| App | Market | Rating (count) | Price model | Confidence |
|---|---|---|---|---|
| 플랜빌더-만다라트,TODO | KR iOS | 3.3 (13) | Free, premium ₩2,500/month ($1.99) | source |
| 마만다 MyManda | KR iOS, iPad | 4.8 (16) | Paid ₩4,400 (US$7.99) | source |
| 반다라트 (Bandalart, Nexters) | KR iOS, Android | not enough ratings | Free | source |
| Mandal-Act : 목표와 실천의 관리 | KR iOS | none shown | Paid $2.99, "no subscription" | source |
| MandaAct | KR/global iOS | not enough ratings | Free, premium $2.99/month | source |
| 만다라트 (Jinjihan Company) | KR iOS | not found | Free | source |
| MandaPlan - 만다라트 AI 추천 | KR iOS | not found | Free | source |
| 만다린 | KR iOS, Android | not found (about 2,100 Android installs) | Free | source |
| 하고만다 | KR iOS | not enough ratings | Free | source |
| Madarart: 9x9 Goal Planner | global iOS | not found | Free, one banner ad under the grid | source |
| 만달 | KR Android | 10K+ installs, last updated 2020–2023 | Free | source |
| マンダラチャート 公式アプリ | JP iOS, Android | 4.5–4.6 (about 81); Android 10K+ installs | Free, Pro ¥100 | source |
| 無限マンダラシート | JP iOS | 4.1 (72) | Free | source |
| ポケット9マス思考 | JP iOS | 4.3 (10) | Free | source |
| 目標ノート | JP iOS | not found; ranked 1st in 360life's test | Free, paid ad removal | source |
| MandalArt (inventor's official app) | JP iOS | not found | Paid ¥980 | source |
| Mandala AI / MandalaChart AI | global | 3.6 on a tracker site | Free, AI-points subscription | source |

## References

### A. Korea

**1. 플랜빌더-만다라트,TODO (Plan Builder)** [source]
- What it is: the longest-standing Korean iOS mandalart app (developer Jiyeon Lee). Central goal plus detailed plans, themes to decorate the chart, a widget, image export. iPhone only.
- What to learn: its one quoted review is the clearest design brief in the category: "텍스트가 너무 얇아 핸드폰으로 봤을때 잘 안읽힘" (the text is too thin to read on a phone). It charges a monthly subscription for themes and has 3.3 from 13 ratings.
- Links: https://apps.apple.com/kr/app/%ED%94%8C%EB%9E%9C%EB%B9%8C%EB%8D%94-%EB%A7%8C%EB%8B%A4%EB%9D%BC%ED%8A%B8-todo/id1641606151 · https://apptail.io/app/todo-Okgc/south-korea
- How we adopt: set a floor for chart text. On a 393pt-wide iPhone a cell in the 9×9 is about 40pt, in the zoomed 3×3 about 120pt. Proposal: in the 9×9, never draw running text below 11pt and never below Pretendard Medium (500); if a label does not fit two lines at 11pt, show a 2-character abbreviation or a tone fill and leave reading to the 3×3. In the 3×3, body 15pt Medium, area name 17pt SemiBold.

**2. 반다라트 (Bandalart) by Nexters** [source]
- What it is: "복잡한 9x9 만다라트는 이제 안녕, 5x5 반다라트". A 5×5 chart that fits one screen, live completion rate, a memo per task, theme colour plus one emoji per chart, share as image. Free, no data collected. Open-source Kotlin Multiplatform repo with design issues still active in September 2026.
- What to learn: (a) the positioning word "부담 없는" (no pressure): a full 9×9 is felt as a burden. (b) Their open issues are a free list of traps: on wide screens the square-cell table grows taller than the screen and needs scrolling (#434); a daily "reset checks" action must confirm that goal text stays and only checks clear, and automatic reset should start the next day (#393); the weekly review notification is off by default so it does not retain anyone, so they add a "turn on" banner inside the weekly review sheet (#470).
- Links: https://apps.apple.com/us/app/%EB%B0%98%EB%8B%A4%EB%9D%BC%ED%8A%B8-%EB%B6%80%EB%8B%B4-%EC%97%86%EB%8A%94-%EB%A7%8C%EB%8B%A4%EB%9D%BC%ED%8A%B8-%EA%B3%84%ED%9A%8D%ED%91%9C/id6743101965?l=ko · https://github.com/Nexters/BandalArt-KMP · https://github.com/Nexters/BandalArt-KMP/issues/434 · https://github.com/Nexters/BandalArt-KMP/issues/393 · https://github.com/Nexters/BandalArt-KMP/issues/470
- How we adopt: (a) Onboarding and empty states should say "1 goal and 3 areas is enough to start"; draw unwritten cells as quiet paper, not as missing work, and count "23 / 81칸" instead of a percentage. (b) iPad and landscape: chart side = min(available width, available height), never scroll the chart. (c) Put the notification opt-in inside the Sunday review sheet (WeekRitual), where the reason is obvious.

**3. 마만다 MyManda** [source]
- What it is: paid-up-front app (₩4,400), iPhone and iPad. Multiple charts, final / main / sub goals, a record per sub-goal with photos, a user-set achievement %, achievements by date drawn on a chart in the main goal's colour, light and dark themes, custom colours, borders and fonts. Four chart shapes: full, cross, short, xmark.
- What to learn: the only Korean app with a review praising the interface ("여러 만다라트 앱을 비교했을 때 사용성이나 UI 면에서 제일 좋은 것 같다"), and it got there with customisation and partial chart shapes, not with AI. Its complaint is iPhone-to-iPad sync.
- Link: https://apps.apple.com/kr/app/%EB%A7%88%EB%A7%8C%EB%8B%A4-mymanda-%EB%AA%A9%ED%91%9C-%EC%8B%9C%EA%B0%84%EA%B4%80%EB%A6%AC-%EB%A7%8C%EB%8B%A4%EB%9D%BC%ED%8A%B8/id6502872345
- How we adopt: (a) offer a "cross" start (4 areas: top, bottom, left, right) that grows to 8, as a gentler first chart. (b) Colour by area on the calendar / week strip: a day's mark takes the colour of the area that was worked on. (c) Make iCloud sync status visible and boring ("오늘 09:12에 맞춤"), because sync is where the best-liked competitor loses stars.

**4. MandaAct** [source]
- What it is: free iOS app (premium $2.99/month) built with React Native / Expo by a non-developer using Claude Code and Antigravity. Three tabs: Today, Mandalart, Report. Actions are typed Routine / Mission / Mind. Photo OCR turns a handwritten chart into 3×3 blocks. A "focus" filter asks "What is the ONE thing you can do today?" and reduces the grid to a short list. Weekly AI report on Mondays, gamification, up to 3 charts free.
- What to learn: the maker's diagnosis is the right one and matches our product: Notion templates "became static pages"; the goal lived in one tool and the to-do list in another. It is our closest functional rival (chart to daily checklist), and it leans on AI and gamification, not on craft.
- Links: https://apps.apple.com/app/mandaact/id6756198473 · https://mandaact.vercel.app/ · https://dev.to/marcus_jh/i-built-an-ios-app-that-turns-mandalart-9x9-into-gtd-actions-v10-1586 · https://news.hada.io/topic?id=26663
- How we adopt: (a) Home: one line above today's list, "오늘의 한 칸", a single action set larger than the rest (proposal: 20pt SemiBold against 16pt list rows). (b) Paper import as a later feature: on-device text recognition of a photographed chart fits "local-first, no account". (c) App Store copy should say what we are not: no AI writing your goals, no points.

**5. Mandal-Act : 목표와 실천의 관리** [source]
- What it is: paid $2.99, explicitly "no subscription, single purchase". Multiple charts, charts become daily checklists, theme and text size set per chart, iCloud sync.
- What to learn: **text size per chart** is a setting a competitor thought worth listing. It is the cheap answer to the thin-text complaint.
- Link: https://apps.apple.com/kr/app/mandal-act-%EB%AA%A9%ED%91%9C%EC%99%80-%EC%8B%A4%EC%B2%9C%EC%9D%98-%EA%B4%80%EB%A6%AC/id1634146689
- How we adopt: honour Dynamic Type in the 3×3 and add a chart text size control (작게 / 보통 / 크게) in Settings and in the print sheet.

**6. Madarart: 9x9 Goal Planner (Peppertree)** [source]
- What it is: 2026 iOS app, English / Korean / Japanese / Chinese. Pinch to zoom 0.5×–5× and pan, one-tap "fit", a 9-section minimap to jump between blocks, a later update so the grid fits an iPhone SE, a share card (goal title, full grid, small app mark), a reminder time picker, a check-in streak, two layouts (classic table and standard 9×9). Free with one banner ad under the grid.
- What to learn: the best chart navigation I found in text: free zoom plus a persistent locator plus one tap home. Also note the name: "Madarart" / "mandarart" is one letter away from our slug.
- Links: https://apps.apple.com/au/app/madarart-9x9-goal-planner/id6762742456 · https://chrome-stats.com/d/id6762742456
- How we adopt: keep our tap-a-block zoom, and add (a) pinch-out on the 9×9 to enter the block under the fingers and pinch-in to return, (b) a 3×3 minimap in the zoomed header (proposal: 30pt square, nine 8pt cells, current block filled with its area colour, tap any cell to jump), (c) one "전체 보기" control in a fixed place. Test on the 375pt-wide iPhone SE first.

**7. 만다린** [source]
- What it is: habit-first mandalart. One tap records a habit, extra taps record going over the minimum unit. Every night between 23:30 and 02:00 it "settles" the day and issues a short report with a score. One miss is a warning; two misses delete the card.
- What to learn: a daily closing ritual with a fixed time. Its punishment mechanic is the opposite of our tone.
- Links: https://apps.apple.com/kr/app/%EB%A7%8C%EB%8B%A4%EB%A6%B0/id6455374816 · https://appwisp.com/app/android/com.pallang.mandarin
- How we adopt: our "하루 마감" (double rule under the day) is the gentle version of this; give it a default evening time and a one-line receipt ("오늘 5칸"), no score.

**8. 하고만다 (ADHD routines)** [source]
- What it is: 4 goals × 3 routines ("클로버 심기"). A clover gets darker the more you practise, weekly clover cards are collected, a golden clover marks a perfect week, a mascot cheers, an AI guide rewrites routines into doable sentences.
- What to learn: a single, ownable progress object that deepens in colour. We already shade cells by frequency; they prove the idea reads.
- Link: https://apps.apple.com/kr/app/%ED%95%98%EA%B3%A0%EB%A7%8C%EB%8B%A4-adhd%EB%A5%BC-%EC%9C%84%ED%95%9C-%EB%A3%A8%ED%8B%B4-%EC%8A%B5%EA%B4%80-%EB%A7%8C%EB%8B%A4%EB%9D%BC%ED%8A%B8/id6738084853
- How we adopt: make the shaded 9×9 the hero of Stats and the widget, with a legend of 4 steps (proposal: area colour at 12 / 28 / 48 / 72% on paper).

**9. 만다 (Android, MandaGo)** [source]
- What it is: 9×9 with an eight-axis radar chart of achievement per area, data kept only in a local database, dark and light modes.
- What to learn: "balance across 8 areas" is the statistic users expect. They also sell "stored only on your device".
- Link: https://play.google.com/store/apps/details?id=com.mandagolab.manda&hl=en_US
- How we adopt: show area balance in Stats in chart position (a 3×3 of eight small bars around the core), not as a radar; position is identity in a mandalart.

**10. The AI wave: MandaPlan, AI - 만다라트 계획표, 만다라트 AI: 오타니 목표 달성 계획표 & 루틴, Mandala AI, Mandalart AI** [source]
- What they are: enter one goal and AI drafts 8 sub-goals and 64 actions. MandaPlan adds a to-do list and a home-screen widget. Mandala AI converts PDF / text / images / audio into a chart and sells "AI points". Mandalart AI on Product Hunt has about 4 followers.
- What to learn: AI drafting is now table stakes among newcomers and none of them has traction. A commenter on a similar tool (MirAIgrid) wished the suggestions were "more tailored".
- Links: https://apps.apple.com/us/app/mandaplan-%EB%A7%8C%EB%8B%A4%EB%9D%BC%ED%8A%B8-ai-%EC%B6%94%EC%B2%9C/id6755219983?l=ko&platform=tv · https://apps.apple.com/us/app/ai-%EB%A7%8C%EB%8B%A4%EB%9D%BC%ED%8A%B8-%EA%B3%84%ED%9A%8D%ED%91%9C/id6740394585?l=ko · https://apps.apple.com/us/app/mandala-ai/id6737715499 · https://www.producthunt.com/products/mandalart-ai · https://www.producthunt.com/products/miraigrid
- How we adopt: do not chase it for 1.0. Answer the blank-page problem with written examples and templates (we have four) shown as finished charts, which also works offline.

### B. Japan

**11. マンダラチャート 公式アプリ (MandalaChart)** [source]
- What it is: the "only official app", supervised by クローバ経営研究所 (the originator of マンダラチャート). 3×3 and 9×9, each cell has a title and a detail, per-cell progress %, colour and link, drag-and-drop reordering, three display modes (標準 / シンプル / ミニマム), Excel and text export; image insertion and export are Pro (¥100). Android version syncs through Google Drive.
- What is good: free essentials (reviewers thank it for that), and "it becomes clear what to do now".
- What is bad, in reviewers' and testers' words: "UIは洗練されていなくて古臭さを感じる"; small input fields; the buttons for moving between 3×3 blocks are hard to press; "表示にメリハリがなくパッと確認がしづらい"; "各3×3の区分けがやや見にくい"; in the detail editor the surrounding cells are shown only as numbers, so you lose track of what to write.
- Links: https://apps.apple.com/jp/app/id1622352017 · https://app-liv.jp/5343832/ · https://360life.shinyusha.co.jp/articles/-/50163
- How we adopt: this is the checklist for our 9×9. (a) Block separation: 1.5pt ink rule between the nine blocks, 0.5pt hairline inside a block, and a tint (area colour at about 14%) on each block's centre cell and on the matching cell of the core block. (b) Cell editor: show a 3×3 locator with the current cell filled and the area name above the field; show the neighbouring cells' text, never numbers. (c) Display density: offer two chart densities (text / marks only) instead of asking one rendering to do both.

**12. 目標ノート 目標達成サポート 思考整理とtodo管理** [source]
- What it is: 9×9 goal app ranked first in 360life's hands-on test, with 5.00 for overall and 5.00 for 見やすさ (legibility). Users pick a colour and an icon per cell, put a "達成" mark on finished cells, and filled cells show overall progress. Views: whole, partial, list. Folders (10 free, 5 sheets each). Free with paid ad removal.
- What to learn: the app that wins on legibility does it with strong per-cell state (colour, icon, achieved mark), the opposite of an even grey table.
- Links: https://360life.shinyusha.co.jp/articles/-/50163 · https://appmatch.jp/1572641813-2/ · https://applion.jp/%E7%9B%AE%E6%A8%99%E3%83%8E%E3%83%BC%E3%83%88/ipad-1572641813/
- How we adopt: give "done" a mark that reads from arm's length in a 40pt cell. Proposal in our paper language: a 도장 (seal) in vermilion, about 18pt, rotated −8°, pressed in with a 120ms scale from 1.15 to 1.0 and a light haptic; a finished block gets one larger seal on its centre cell. It is a functional mark, not decoration, and it is the one thing on the sheet allowed to be saturated.

**13. 無限マンダラシート, マンダラボード, ポケット9マス思考** [source]
- What they are: 無限マンダラシート (4.1 from 72) lets any cell open a new sheet without limit, with custom fonts and cell colours. マンダラボード adds list and tree views beside 3×3 and 9×9, and memo, to-do, photos and files per cell, with a photo as a cell background. ポケット9マス思考 is a bare 9-cell sheet with HTML / screenshot export.
- What to learn: Japanese users treat the chart as a thinking tool (deepen, attach, re-view as a list) more than as a tracker.
- Links: https://apps.apple.com/jp/app/%E7%84%A1%E9%99%90%E3%83%9E%E3%83%B3%E3%83%80%E3%83%A9%E3%82%B7%E3%83%BC%E3%83%88/id1637240861 · https://apps.apple.com/us/app/id6547856497 · https://smartlog.jp/178232 · https://app-liv.jp/business/all/2009/
- How we adopt: keep one chart, but let an area open as a ruled list page (we have the ledger of 8 areas); this is also the VoiceOver and large-text path.

**14. AI目標達成マンダラチャート** [source]
- What it is: "Nextアクション" plus a "4ステップ振り返り": できたこと / 学んだこと / 課題 / 次に試すこと, saved as cards, with a progress heatmap.
- What to learn: a four-prompt reflection is a compact, proven structure.
- Link: https://apps.apple.com/jp/app/ai%E7%9B%AE%E6%A8%99%E9%81%94%E6%88%90todo%E3%83%AA%E3%82%B9%E3%83%88-%E7%BF%92%E6%85%A3%E5%8C%96-%E7%B6%9A-%E6%8C%AF%E3%82%8A%E8%BF%94%E3%82%8A/id6744336094
- How we adopt: the Sunday ritual becomes four ruled lines (한 일 / 배운 것 / 걸린 것 / 다음 주에 해볼 것), each optional, and each week's page stays in the ledger.

**15. MandalArt, the inventor's app (ヒロアートディレクションズ, 今泉浩晃)** [source]
- What it is: the official iPhone app of the original マンダラート method. ¥980 once, no ads, described as simple and easy to operate, exports images and OPML. Old complaints: stopped working after an iOS upgrade, "rough", requests for an outline view and landscape.
- What to learn: the originator charges once and stays plain; and the two Japanese words are each tied to an originator (see "Names").
- Links: https://applion.jp/iphone/app/866939399/ · https://smartlog.jp/178232 · https://navi.dropbox.jp/mandal-art

### C. Global and web

**16. Harada.app (HaradaPlan)** [source]
- What it is: web planner for the Harada method's 64-chart. AI plan generation, grid editor with auto-save, an AI coach with "next step suggestions", a pillars view, a "Key Tasks" counter, focus mode (full grid or focused views). Its `/ohtani` page lets anyone fill Ohtani's chart as an interactive template with no account, saved in the browser.
- What to learn: the famous filled chart is the best onboarding there is: people understand the method in five seconds by reading it.
- Links: https://harada.app/ · https://harada.app/ohtani · https://news.ycombinator.com/item?id=45946885 · https://www.producthunt.com/products/harada-app
- How we adopt: first screen of onboarding is a complete, readable example chart in our own rendering, zooming from 9×9 into one block and back (proposal: 600ms, ease-in-out), before any text field appears.

**17. An open-source mandala chart app that hides the 9×9 on phones** [source]
- What it is: a web project whose pull request removes the grid view on phones and small screens "to avoid exposing the dense 9×9 matrix" and shows a map or table instead.
- What to learn: an honest developer verdict that 81 cells of text do not work at phone size.
- Link: https://github.com/ylnyorulmaz/mandala-chart/pull/21
- How we adopt: decide what the phone 9×9 is for. It is a map (where am I, how full, how dark), and the 3×3 is the page you read. Design each for its job.

**18. Printable templates: 유가크루 PDF, 마이라이프노트 web tool, Miro's Harada OW64 board, Notion templates** [source]
- What they are: 유가크루's free 4-page PDF has a blank 9×9 with the centre 3×3 border emphasised and each block's centre cell colour-marked, a page on writing order, a 3×3 starter sheet and a 4-week practice checklist. 마이라이프노트 is a browser tool that prints A4 landscape or saves a PDF and keeps data in the browser. Miro's template is laid out in A4 / A3 ratio for printing. The best-selling Korean Notion template (about 1,600 sales, 4.9) bundles a habit tracker and daily dashboard and keeps the automatic achievement rate and the "도장" stamp for its Pro version.
- What to learn: the paper convention is settled: heavy frame on the centre block, colour on the nine centre cells, everything else plain. People pay for stamps and an automatic completion rate.
- Links: https://www.yugacrew.com/crewletter/mandalart-template-printable · https://blog.mylifenote.ai/ko/mandalart-ko/ · https://miro.com/templates/harada-open-window-chart/ · https://byinches.gumroad.com/l/notion-mandalart
- How we adopt: our PDF should be the best free template on the Korean web: page 1 the 81-cell sheet, then one page per area, plus an optional 4-week check sheet. Use the same rule weights as on screen so the app looks like the print and the print looks like the app.

**19. The Ohtani chart** [source for content, recall for appearance]
- What it is: written at 花巻東 high school, where every player fills one in on joining. Centre: "ドラ1 8球団" (first-round pick by 8 teams). The eight areas around it include body, mental, breaking balls, 人間性 (character) and 運 (luck) [source]; control and speed are the ones I add from memory [recall]. Physical items carry numeric targets, and the plan goes as far as picking up litter (under luck, as I recall). It follows 原田隆史's Open Window 64; Harada says Ohtani wrote about 15 more charts later. Sources disagree on first versus second year.
- Appearance [recall]: the version the press reproduces is a typeset black-and-white table, thin rules, short noun phrases of 2–8 characters per cell, with only the centre block and the eight repeated area cells shaded. Its authority comes from density and plainness, not decoration.
- Links: https://dime.jp/genre/567495/2/ · https://www.lifehacker.jp/article/2507-shohei-ohtani-goal-realization/ · https://limo.media/articles/-/27831 · https://weekly.khan.co.kr/article/201804161445561
- How we adopt: write our examples in that voice (short, concrete, numeric: "주 3회 5km"), and let the editor's placeholder teach it.

### D. Adjacent goal-breakdown apps

**20. Griply** [source]
- What it is: Life Area → Vision → Goal → Subgoal → Project → Task / Habit. Widgets for the Today list, habits and goals, with habits checked off from the widget; a Gantt-style goal timeline. Free for 2 goals and 2 habits, then $5.99/month, $49.99/year or $149.99 lifetime.
- What to learn: every habit shows which goal it serves. That link is the whole value of a mandalart-to-checklist app.
- Links: https://griply.app/help/features · https://griply.app/compare/best-goal-tracking-apps
- How we adopt: in the Today list, each row carries its area as a 3pt colour bar on the left edge plus the area name in 12pt, so the chart is present in every row.

**21. Goalscape** [source]
- What it is: a circular goal map. Main goal in the centre, sub-goals around it, slice size = importance, darker shading fills toward the centre as progress is made. The vendor itself admits label readability is a problem and tells users to collapse outer levels.
- What to learn: "what is large and still pale needs attention" is a strong one-glance reading; and radial text fails, which is why the square grid is worth keeping.
- Links: https://goalscape-website.pages.dev/how-to/ · https://www.g2.com/products/goalscape/reviews

**22. Bucket-list apps on the Korean store: 버킷스, 스파크리스트: 100가지 꿈과 목표, 와나리스트, Söka** [source]
- What they are: list-of-dreams apps with categories and an achievement graph (버킷스), a "100" framing (스파크리스트), a scratch map and home-screen progress widget (Söka, 4.6 from 39).
- What to learn: a fixed number (100 dreams, 81 squares) is a hook people remember.
- Links: https://apps.apple.com/kr/app/%EB%B2%84%ED%82%B7%EC%8A%A4-%EA%BF%88%EC%9D%84-%EC%9D%B4%EB%A3%A8%EB%8A%94-%EB%B2%84%ED%82%B7%EB%A6%AC%EC%8A%A4%ED%8A%B8/id6741350409 · https://apps.apple.com/kr/app/%EC%8A%A4%ED%8C%8C%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8-100%EA%B0%80%EC%A7%80-%EA%BF%88%EA%B3%BC-%EB%AA%A9%ED%91%9C/id6447095453 · https://apps.apple.com/us/app/s%C3%B6ka-%EB%B2%84%ED%82%B7%EB%A6%AC%EC%8A%A4%ED%8A%B8-%EC%83%9D%EC%84%B1%EA%B8%B0/id6446223795?l=ko
- How we adopt: "81칸" is our number. It is in our subtitle already; make it the first App Store screenshot and the icon idea (a 3×3 or 9×9 mark).

## What the best of them do better than us

Based on a quick grep of `src` (tap-to-zoom and swipe exist; no pinch, no minimap, no photos, no radar), not a screen audit.

1. **Chart navigation.** Madarart: pinch 0.5×–5×, one-tap fit, 9-block minimap. We have tap and swipe only.
2. **A lighter way in.** 반다라트 (5×5) and 마만다 (cross / short shapes) accept that 64 actions scare people. We present the full 81 from the start.
3. **Strong cell state.** 目標ノート won a legibility test with colour, icon and an achieved mark per cell. Our direction is deliberately quiet; quiet is what the official app is criticised for.
4. **Richer cells.** Progress %, link, photo, memo per cell (official app, 마만다, マンダラボード).
5. **Text size control.** Mandal-Act sets text size per chart.
6. **Paper to app.** MandaAct imports a photographed handwritten chart.
7. **A blank-page answer.** AI drafting (five or more apps) and the Ohtani template (harada.app). We have four templates; they need to be shown as finished charts.

## Where all of them are weak (our opening)

1. **Legibility and hierarchy of the grid on a phone.** Thin text, weak block boundaries, cramped inputs, editors without context. Nobody has solved it; several avoided it (5×5, hiding the grid).
2. **Visual identity.** I found no competitor described as having a distinctive look. The described features are the same set everywhere: themes, colours, emoji, dark mode. A printed-chart look with real typographic discipline would be alone in the category, provided it has contrast.
3. **Traction and trust.** No app has 100 ratings. Many are a year old or abandoned (만달: last update 2020–2023; 플랜빌더: about a year without updates in the cached listing).
4. **Money friction.** A subscription for themes (₩2,500/month), AI points, a banner ad under the grid, ₩4,400 up front. We are free, with no ads and no purchases.
5. **Privacy.** One Korean app's label says location may be used for tracking; AI apps send goals to a server. We collect nothing.
6. **Platform depth.** Among mandalart apps, only 플랜빌더 and MandaPlan mention a widget. I found no mandalart app mentioning a Live Activity, Siri shortcuts, lock-screen widgets or an iPad two-page layout; 반다라트's wide-screen layout is still an open issue.
7. **Print.** Print-ready A4 / A3 output exists only in web tools and Miro. No native app advertises it.
8. **The year arc.** Weekly reflection exists in two apps (MandaAct's AI report, AI目標達成's four steps). Nobody describes closing a year and archiving the chart.
9. **Languages.** Most are single-language. Madarart is the exception with four.

## Names already taken on the Korean App Store

Titles as returned by search (the text after the dash is part of the app name, not the separate subtitle field, which I could not read):

- **만다라트** (seller Jinjihan Company, id6444119494, © 2022 MandalArt) — identical to our Korean title.
- 플랜빌더-만다라트,TODO
- 반다라트 - 부담 없는 만다라트 계획표 (English: Bandalart: Simple Goal Planner)
- 마만다 MyManda - 목표, 시간관리, 만다라트
- 마이만다라트
- AI - 만다라트 계획표
- MandaPlan - 만다라트 AI 추천
- 만다린 (tagline: 만다라트를 통한 목표달성과 습관관리 앱)
- 하고만다 - ADHD를 위한 루틴, 습관, 만다라트
- Mandal-Act : 목표와 실천의 관리
- MandaAct:Turn Goal into Action (Korean tagline on its site: 목표를 실천으로 바꾸는 만다라트 트래커)
- MandalaChart 공식 앱
- Mandalart - Habit Tracker · Madarart: 9x9 Goal Planner · Mandalart Daily: Goals · Mandala Goal: 3x3 & 9x9 Grid · Mandala AI
- Google Play: 만다 - 기필코 이루는 만다라트 목표 관리 · 만달 - 만다라트 기반 목표 관리 · 도닦기 - 만다라트 목표관리, 투두리스트, 성취 트래커 · 만다라트 목표관리 - 3x3 계획표, 목표설정,습관관리 · 만다라트 AI: 오타니 목표 달성 계획표 & 루틴 · 만다라트 캘린더 · 만다린 · MandaWrite(만다라이트)

Phrases already worn out: 계획표, 목표 관리, 목표 달성, 실천, 습관관리, 부담 없는, 기필코 이루는, AI 추천, 오타니. Phrases I did not see in any title: 81칸, 수첩, 한 해, 한 장, 인쇄. Our subtitle "81칸에 적는 한 해 계획" is clear of all of them.

Three naming risks to check before submission:
1. **Korean title "만다라트".** App Store Connect rejects an app name that another app already uses [recall]. If so, we need a suffix, for example "만다라트 수첩" or "만다라트 · 81칸 수첩".
2. **English title "Mandalart".** "MandalArt" (the inventor's app, id866939399) and "Mandalart - Habit Tracker" exist. Same uniqueness question.
3. **Japanese title "マンダラート".** マンダラート is tied to 今泉浩晃 / ヒロアートディレクションズ and マンダラチャート to クローバ経営研究所, and both are, as far as I recall, registered trademarks in Japan [recall]. The pattern in Japanese store names supports this: independent apps call themselves マンダラシート, マンダラボード, 9マス思考, 目標達成シート, マンダラ型. Check J-PlatPat before shipping the Japanese listing.

## Pitfalls to avoid

1. **Quiet to the point of flat.** Hairlines, muted dyes and off-white together reproduce the "メリハリがない" complaint. Keep the paper, but spend contrast on three things: block boundaries, the nine centre cells, and done state.
2. **Thin type in small cells.** Never Regular weight under 12pt on the chart; never below 11pt at all. This is the one review quote Korean users left.
3. **Pretending 81 cells of sentences are readable at 40pt.** Decide that the 9×9 is a map and the 3×3 is the page.
4. **An editor without context.** Show where the cell sits and what its neighbours say.
5. **Celebrity in metadata.** Several apps put 오타니 in the title. A person's name in the app name or keywords invites rejection and is not ours to use; keep Ohtani to in-app explanation and blog copy.
6. **Punishment and scores.** 만다린 deletes cards after two misses. Our ledger tone (double rule, one-line note) is the better instinct.
7. **Charging for basics.** Themes behind a subscription sit at 3.3 stars. Our "free, no ads" line is a feature; say it in a screenshot.
8. **Sync that surprises.** The best-liked Korean app loses stars on iPhone-to-iPad sync. Show sync state plainly.
9. **Tables that outgrow the screen** on iPad and landscape (반다라트 #434).
10. **AI as the headline.** Five or more newcomers lead with it and none has traction; it also conflicts with no-account and local-first.
11. **Emoji and theme pickers as "design".** That is the category's default answer and part of why the apps look alike.

## Not verified

- **No page was read in full and no screenshot was seen.** `apps.apple.com` and `dev.to` could not be fetched from this session; they need to be allowed in the session's network settings. Everything is from search-result extracts. I cannot describe any competitor's actual colours, type, spacing or icon.
- **The shared search budget ran out** before I covered: mandara.cloud and Canva's chart maker; Chinese-language 九宫格 / 曼陀羅 apps; physical planners (マンダラ手帳, Korean 만다라트 다이어리); Reddit and Korean blog reviews; a proper look at OKR and vision-board apps.
- Ratings and prices can be stale or region-specific. 플랜빌더's 3.3 (13) and 마만다's 4.8 (16) are Korean-store figures from search extracts; other storefronts showed "not enough ratings". The official Japanese app's price appears as both "Pro ¥100" and "¥100/month".
- The review quotes (플랜빌더 "텍스트가 너무 얇아…", 마만다 "UI 면에서 제일 좋은 것 같다", the Japanese official app quotes) came through search summaries; one follow-up search could not find the 플랜빌더 quote again.
- Actual App Store **subtitles** (the 30-character field) of every competitor.
- The seller of the app named "만다라트": one extract says Jinjihan Company, another calls it "woori 개발".
- Madarart's pinch-zoom and minimap details came from one search extract of its listing; a second search did not reproduce them.
- The GitHub pull request about hiding the grid on phones came from one extract; a follow-up search did not find it.
- App-name uniqueness on App Store Connect and the Japanese trademark status are from memory.
- How the original Ohtani sheet looks (handwriting, colour) is from memory; today's sources described only its content.
- "What they do better than us" rests on a grep of `src`, not on running our app.
