# Korean and Japanese consumer app design — reference memo

Research date: 2026-11-14. Scope: what Korean (and Japanese) users expect from a well-made app in 2025–2026, and which concrete patterns 만다라트 can adopt.

## How this was researched (read this first)

- **Most pages could not be opened.** This session's network policy blocked WebFetch for toss.tech, toss.im, brunch.co.kr, yozm.wishket.com, ditoday.com, apps.apple.com, zenn.dev and jobplanet. Only GitHub was reachable. The shared web-search budget also ran out part-way through.
- So every item below carries one of three labels:
  - **[fetched]** I read the file itself (GitHub: design-token files, READMEs, a sourced catalogue of Korean design systems).
  - **[search]** I only saw the search tool's summary of the page. The wording may be imprecise; the URL is real.
  - **[recall]** General knowledge, not checked in this session.
- I could not see any screenshot of any third-party app. Every statement about how another app *looks* is from text or recall.
- I did look at our own three Korean store screenshots (`store/screenshots/ko/APP_IPHONE_67/01–03`) and at `src/theme/type.ts`, `src/theme/palette.ts`, `src/components/AppText.tsx`, so the "where we stand" notes are first-hand.

## Summary

1. **The bar in Korea is Toss, and it is a bar of behaviour more than of looks.** One message per screen, an answer the user can give in three seconds, value before cost, no waiting, copy in 해요체 with every spare word removed. Korean users now treat this as the default grammar of an app, not as a style.
2. **Our typography and copy foundations already meet that bar.** Pretendard with per-weight files, 어절 line breaking (`hangul-word`), tabular figures, a seven-step scale that is almost identical to 당근's, 해요체 throughout with no exclamation marks. This is not where the weakness is.
3. **The weakness is hierarchy and meaning, not ornament.** Home shows six sections at near-equal weight with the date as hero; Today uses a private glyph language for week history; numbers appear without saying what they mean. Banning gradients, emoji and cards removed the "AI look", but the absence of AI tells is not the presence of craft.
4. **The paper direction is defensible in Korea, but only if it is committed and quiet.** Loved Korean planners win on "심플한데 귀엽다" (투두메이트), on a single charming signature (하루콩's beans), or on a strict analogue idea (DayGram's E-Ink screen). None of them wins on texture.
5. **Japan needs its own settings, not a translation.** Looser line height, です/ます copy, customisation presented as きせかえ, and a trademark check on the product name before launch.

## Where we stand today (first-hand, three store screenshots)

| Area | What I see | Why it reads as weak against the references below |
|---|---|---|
| Home | Hero is the date "14" at 56pt. Below it: mini chart, 이번 주 중점, 오늘 할 일, 이번 주, 8개 영역, all with 18pt Bold titles. | Six messages on one page; the hero is information the lock screen already shows. Toss: one message per screen, value first. |
| Home | "13/13" appears twice within 100pt ("오늘 할 일 13/13 ›" and "13 / 13"). "正 +5" under each weekday. | Repetition is what Toss calls a weed. "+5" is a number without a meaning. |
| Today | Each row ends in a strip of 7 tiny marks (filled, outlined, hatched, dot), keyed to one small weekday header at the top of the list. | A private notation the user must learn. Fails "answer in 3 seconds". |
| Today | "고르기" alone at top right. | A label that does not predict the next screen (Toss: predictable hint). |
| Chart | 81 cells of 11–12pt text, filled = done, tinted = area name, small gold square = today, plus a legend to explain it. | It works, and it looks like a printed chart. But needing a legend means the encoding is not self-evident. |
| All | Dot grid runs behind every list row and every line of text. | Texture competes with text. In the references, paper feeling comes from restraint, not from a visible pattern everywhere. |
| All | Bold everywhere: section titles, row titles, numerals. | Korean systems build hierarchy from size and three or four grey levels, with Bold reserved. |
| Tab bar | The 담기 tab is a dashed square. | Dashed outlines read as an empty placeholder. |
| Store shots | Same off-white panel six times; caption line 1 is "01 / 06"; top third is blank. | No rhythm, no hook, and the most valuable caption line is spent on a page number. |

Strengths to keep: the 正 tally (legible in Korea and Japan), "올해 78일 남음" and "D-2" (Korean users ask for D-day counters), the big-numeral-plus-small-unit pattern ("2 / 13"), the muted area palette, the copy.

---

## References

### A. Toss

**1. Toss product principles — "One Thing per One Page" and friends** [search]
- What it is: Toss's internal product principles. The list in Toss's own post is Casual Concept, Simple Policy, Value First, Clear Action, Context Based, Easy to Answer, Explain Why, One Thing, No More Loading, Minimum Features. A newsletter summary adds Tap & Scroll.
- What is good, exactly:
  - *One Thing per One Page*: one screen carries one message. In sign-up, every screen asks for exactly one thing and has exactly one next button.
  - *Easy to Answer*: any question the product asks should be answerable in 3 seconds; the product looks up what the user cannot remember.
  - *Value First, Cost Later*: show what the user gets before asking for input.
  - *Tap & Scroll*: the core flow uses only taps and vertical scroll, not sideways swipes.
  - *No More Loading*: never make the user wait; policy, flow and technology all serve this.
- Sources: https://toss.im/tossfeed/article/tossproductprinciples · https://maily.so/eddy/posts/knrjvlp1rld · https://toss.tech/article/value-first-cost-later · https://toss.im/tossfeed/article/importance-simplicity
- Adopt:
  - **Home**: pick one hero message. Candidates: today's progress as a sentence ("오늘 13개 중 2개 했어요") or the remaining-days count. Move the date to a one-line header. Everything else goes below the fold in a fixed order.
  - **Onboarding**: one question per screen, written as a question ("올해 꼭 이루고 싶은 한 가지는 뭔가요?"), one bottom button. Show a filled example chart *before* asking the user to type (value first).
  - **Cell editor and weekly review**: one decision per step.
  - **Do not apply it to the 9×9 chart.** The chart is a canvas whose density is the product. The principle is for flows.

**2. Toss's eight writing principles** [search]
- What it is: the published list. Predictable hint, Weed cutting, Remove empty sentences, Focus on key message, Easy to speak, Suggest than force, Universal words, Find hidden emotion.
- What is good, exactly:
  - *Weed cutting*: delete words that do not change the meaning. Toss's own example: "앞으로 받을 배당금" becomes "받을 배당금".
  - *Remove empty sentences*: delete sentences added only to fill a gap, and do not say the same thing twice on one screen.
  - *Predictable hint*: buttons, links, list items and banners say what the next screen is.
  - *Easy to speak*: read it aloud; it should come out in one breath.
  - *Universal words*: no slang, memes or in-group words; wit without trend words.
- Companion rules from the Apps in Toss developer guide: every string in 해요체 regardless of context; active voice; positive phrasing ("~하면 할 수 있어요" instead of "안 돼요"); passive only when reporting a result such as a cancellation.
- Sources: https://toss.tech/article/8-writing-principles-of-toss · https://developers-apps-in-toss.toss.im/design/ux-writing.html · https://brunch.co.kr/@1dayliterature/559 · https://weeklyuxuichallenge.oopy.io/0ad48209-9ef8-4eba-a986-67d42e2a81f3
- Adopt: our copy is already 해요체 with no exclamation marks, so this is an editing pass, not a rewrite.
  - Home: remove the duplicate "13/13"; drop the "핵심 목표" eyebrow if the goal sits beside the chart.
  - Today: "고르기" becomes "할 일 고르기".
  - Legends and helper lines ("블록을 누르면 크게 볼 수 있어요") are candidates for removal once the affordance is visible.

**3. TDS typography scale (official)** [search]
- What it is: Toss Design System's published mobile type tokens.
- Exact values (size / line height): Typography 1 30/40 · 2 26/35 · 3 22/31 · 4 20/29 · 5 17/25.5 · 6 15/22.5 · 7 13/19.5; sub-typography 10 is 16/24. Body sizes sit at 1.5; large titles tighten to about 1.33. TDS asks teams not to hard-code these because the tokens scale with the user's larger-text setting (110% turns 30 into 33).
- Source: https://tossmini-docs.toss.im/tds-mobile/foundation/typography/
- Adopt: see the comparison table in section E. Short version: add a looser "read" line height for paragraphs, and loosen the 26pt title when it can wrap.

**4. TDS colour: cool greys, one accent, no pure black** [fetched, third-party catalogue quoting the published `@toss/tds-colors` package]
- Exact values marked as published: grey-50 #F9FAFB, 100 #F2F4F6, 200 #E5E8EB, 300 #D1D6DB, 400 #B0B8C1, 500 #8B95A1, 600 #6B7684, 700 #4E5968, 800 #333D4B, 900 #191F28; blue-500 #3182F6; red-500 #F04452.
- What is good: body text is grey-900, not #000. Secondary text is grey-700. One accent hue for everything interactive. In 2025 Toss rebuilt the whole palette on a perceptually uniform colour space (OKLCH named) so that the same step number gives the same contrast in every hue.
- Sources: https://raw.githubusercontent.com/CaesiumY/ko-design-md/main/services/toss.md · https://toss.tech/article/tds-color-system-update [search]
- Adopt:
  - Keep ink #2B2620 and a single accent (gold).
  - Define an explicit ink ladder of four steps (text, secondary, tertiary, disabled) and use it instead of weight for hierarchy.
  - Check the eight area colours for equal perceived lightness in OKLCH, so no area looks louder than another on the chart.

**5. The Toss "feel": flat, one filled button, big number with small unit** [fetched from the same catalogue; values marked there as "bundle", meaning not officially published] plus a developer write-up [search]
- Exact patterns:
  - One filled call-to-action per screen; secondary buttons are grey-100 fill with dark text.
  - Bottom-fixed CTA 56pt high; do not show a second primary button on the same screen.
  - Shadows only on floating surfaces (menus, toasts, dialogs). Pressed state is a dark overlay, not a shadow.
  - Disabled state is the whole component at 30% opacity.
  - Bar charts: bars grey, only the highlighted bar in the accent, no axis lines, 6px rounded tops.
  - Motion 120ms (press), 200ms (toggle), 320ms (sheet); no bounce, no parallax, no skeleton shimmer.
  - Bottom sheet is the first choice over a dialog.
  - Key number large, unit about half its size (a developer's analysis gives 48px to 24px).
- Sources: https://raw.githubusercontent.com/CaesiumY/ko-design-md/main/services/toss.md · https://dev.to/kiwibreaksme/dijaineo-eobsi-baibeukodingeuro-toseugeub-ui-mandeuneun-beob-5c0g
- Adopt:
  - **Stats**: weekly bars in a light ink tint, this week or today in gold, no axes, the value printed above the highlighted bar.
  - **Sheets**: every confirm or pick uses a bottom sheet with one filled button.
  - **Numbers**: we already do large numeral plus small unit; make it the rule on Stats too.
  - Treat the pixel values as a starting point only. They are a third party's reconstruction.

**6. Apps in Toss: "a first-time user should not get lost"** [search]
- What it is: Toss's recent guidance to outside developers building mini-apps (publication date not confirmed).
- What is good, exactly: if title, description and result are similar in size, the user does not know where to look, so make one element dominant. A result screen should state what the result *means*, not only the value: not "72점" alone but the score against an average. The post says these are the points most often missed in apps built quickly with AI tools or templates. The UI guide adds: at most one main graphic per screen.
- Sources: https://toss.im/apps-in-toss/blog/mini-app-ux-screen-design-guide · https://developers-apps-in-toss.toss.im/landing-page/landing-page-en/design/consumer-ux-guide
- Adopt:
  - **Stats and Home**: every number gets its meaning. "이번 주 32번" becomes "지난주보다 5번 더 했어요". "64칸 중 16칸" becomes a statement about pace or about which area is ahead.
  - **Year review**: lead with one sentence, then the chart.

**7. The criticism of Toss** [search]
- What it says: Toss's friendly tone and motion are now "the basic grammar" of Korean finance apps; flat simple UX has spread so far that apps "feel like they come from one vendor"; over-simplification has been criticised for hiding risk; one essay is titled "무작정 토스처럼 말 걸지 마라".
- Sources: https://ditoday.com/?p=151644 · https://meeco.kr/free/25110562 · https://brunch.co.kr/@greening/29
- Adopt: take Toss's discipline, not its skin. A white screen with a blue button would delete the one thing that makes this app recognisable.

### B. Other Korean design systems (primary token data)

**8. 당근 SEED Design** [fetched: token files in the public repo]
- Exact values:
  - Type (size/line height): 11/15, 12/16, 13/18, 14/19, 16/22, 18/24, 20/27, 22/30, 24/32, 26/35. About 1.35 throughout. Weights 400, 500, 700 only.
  - Durations 50, 100, 150, 200, 250, 300ms. Colour transitions and press feedback use 150ms.
  - Easing: enter (0, 0, 0.15, 1), exit (0.35, 0, 1, 1), standard (0.35, 0, 0.35, 1), enter-expressive (0.03, 0.4, 0.1, 1).
  - Press scale 0.95 / 0.97 / 0.98; with reduced motion the scale is 1.
  - Radius 2, 4, 6, 8, 10, 12, 14, 16, 20, 24.
  - Text colours: #1a1c20 (text), #555d6d (muted), #868b94 (subtle), #b0b3ba (placeholder), #d1d3d8 (disabled). Hairlines are black at about 5–6% alpha.
- Principles (from a catalogue that cites seed-design.io): depth comes from surface colour first, shadow only for the few most prominent elements; contrast measured with APCA, minimum Lc 75 for readable text; no divider after the last item; system fonts; error messages say what the user can do next.
- Sources: https://github.com/daangn/seed-design · https://raw.githubusercontent.com/daangn/seed-design/dev/packages/rootage/font-size.yaml · https://raw.githubusercontent.com/daangn/seed-design/dev/packages/rootage/line-height.yaml · https://raw.githubusercontent.com/daangn/seed-design/dev/packages/rootage/duration.yaml · https://raw.githubusercontent.com/daangn/seed-design/dev/packages/rootage/timing-function.yaml · https://raw.githubusercontent.com/daangn/seed-design/dev/packages/rootage/color.yaml · https://raw.githubusercontent.com/CaesiumY/ko-design-md/main/services/seed-design.md
- Adopt:
  - Our scale (16/22, 13/18, 18/24) is 당근's scale. It is correct for dense UI text.
  - Take the motion tokens as they are for `src/theme/motion.ts`: press 150ms to scale 0.97–0.98 with (0, 0, 0.15, 1); sheet in 300ms enter curve, out 200ms exit curve.
  - Take the five-step text ladder idea; ours should be warm, on #FBF9F4.
  - Remove the divider under the last row of every ruled list.

**9. 원티드 Montage: letter-spacing that changes with size** [fetched: catalogue stating 56 of 57 values match the official table]
- Exact values (Pretendard JP; size / weight / line height / tracking in em):
  - 56 / 700 / 1.286 / −0.0319
  - 28 / 700 / 1.358 / −0.0236
  - 24 / 700 / 1.334 / −0.0230
  - 20 / 700 / 1.400 / −0.0120
  - 18 / 600 / 1.445 / −0.0020
  - 17 / 600 / 1.412 / 0
  - 16 / 500 / 1.500 / +0.0057, with a "read" variant at 1.625
  - 15 / 500 / 1.467 / +0.0096, read 1.600
  - 14 / 500 / 1.429 / +0.0145, read 1.571
  - 13 / 500 / 1.385 / +0.0194
  - 11 / 500 / 1.273 / +0.0311
- What is good: tracking is negative above 18, zero at 17, positive below. Body weight is 500, not 400. There are two line heights for the same size: one for UI, one for reading.
- Text opacity ladder: 0.88 primary, 0.61 secondary, 0.43 tertiary, 0.28 disabled.
- Sources: https://raw.githubusercontent.com/CaesiumY/ko-design-md/main/services/wanted.md · https://montage.wanted.co.kr/docs/foundations/base-material/typography (cited there; not opened)
- Adopt:
  - Add a `read` role (16/26 or 15/24) for any text that runs to two lines or more: onboarding body, weekly review prompts, year close, empty states, settings footnotes.
  - Try positive tracking on 11pt and 13pt (+0.3 and +0.25pt). Small Hangul on a textured background is where we are least legible.
  - Try Medium (500) for row titles instead of SemiBold.

**10. KRDS (정부 디자인 시스템) and Pretendard GOV** [fetched: official token JSON] plus [fetched: catalogue citing krds.go.kr]
- Exact values: font Pretendard GOV; body 19 / 17 / 15 / 13px, with 17px the base; mobile headings 28, 24, 22, 19, 17, 15; letter-spacing token 0. The official typography page is cited as requiring line height of at least 150%. Radius tops out at 12. Contrast convention: steps 40, 50, 70, 90 of any ramp give 3:1, 4.5:1, 7:1, 15:1.
- Sources: https://raw.githubusercontent.com/KRDS-uiux/krds-uiux/main/tokens/transformed_tokens.json · https://raw.githubusercontent.com/CaesiumY/ko-design-md/main/services/krds.md · https://www.krds.go.kr/html/site/style/style_03.html (cited there; not opened)
- Adopt: the public-sector baseline for Korean reading text is 17px at 150%. Our `body` is 16/22 (137.5%). Fine for a row; too tight for a paragraph.

**11. Pretendard itself** [fetched: README]
- What it says: built on Inter (Latin), 본고딕 (Hangul) and M PLUS 1p (kana); nine weights plus a variable font; the author states no extra work is needed for legibility or optical correction. Variants: Pretendard JP (for Japanese, and Korean Hanja), Std (Latin), GOV (public services). OpenType features are documented in a separate post.
- Sources: https://raw.githubusercontent.com/orioncactus/pretendard/main/packages/pretendard/README.md · https://github.com/orioncactus/pretendard · https://cactus.tistory.com/306 (feature list; not opened)
- Adopt:
  - Test Pretendard JP for the Japanese build. Today Japanese text switches to Hiragino Sans, which has only W3/W6/W7 on iOS and changes the texture of mixed Korean–Japanese screens.
  - Read the feature post before choosing numeral alternates for the 56pt date and the Stats figures.

**12. 배달의민족: personality from typeface and words, not from chrome** [fetched: catalogue citing designcompass, design.co.kr, brandbrief]
- What is good, exactly: the brand voice is "쉽고 명확하고 위트있게" (CCO 한명수). The founder's stated taste is "예쁘지는 않지만 사랑스럽다". Display faces (한나체 and others) are used for headlines only, never at body size, in lines of 4–7 characters set like verse. UI text is a neutral sans. No emoji in the UI; illustration and characters do that job. No gradients on chips, no bouncy springs; about 200ms ease-out.
- Sources: https://raw.githubusercontent.com/CaesiumY/ko-design-md/main/services/baemin.md · https://designcompass.org/en/2025/07/23/baemin-2-rebranding/ (cited there; not opened)
- Adopt: this is the Korean precedent for an app with character and no gradients or emoji. Our equivalent is one display treatment used in very few places (the date numeral, the core-goal cell, the year-close page), with everything else neutral. If the owner wants more warmth, the route is one distinctive display face for those few places, not decoration everywhere.

### C. Korean planner and habit apps

**13. 투두메이트** [search]
- Facts: Korean App Store 4.8 with over 100,000 ratings; the listing claims "300만 MZ세대가 선택한".
- Why people like it, in their words: "심플한데 필요한 기능은 다 있고 귀엽기까지 해서 매우 만족합니다"; "카테고리별로 색이 달라 지난 한달, 1년간 어떤 일을 하며 살아왔는지 확인하기 좋아요". Each task carries its category colour, so the month calendar fills with colour as a record. Friends react to finished tasks with emoji.
- What people dislike: a redesign moved the calendar above the checklist and broke the one-screen view; no D-day feature (asked for repeatedly); no way to hide routines on off days; growing social features dilute the planner.
- Sources: https://apps.apple.com/KR/app/id1505220130 · https://www.jobplanet.co.kr/contents/news-1899
- Adopt:
  - Our eight area colours can do the same job: a month or year view where each day is tinted by the areas worked on. This is the natural form of **Stats** and of the **year review**.
  - Surface D-day prominently (Home header, widget, lock screen). We already compute "올해 78일 남음" and "D-2".
  - Hide what is not due today.

**14. 마이루틴** [search]
- Facts: routine, to-do and schedule on one screen; a "루틴 신호등" that shows the day's state at a glance; daily, weekly, monthly statistics; badges and stamps; widget and Watch support named in the app title itself ("알람・워치・계획・기록").
- Source: https://apps.apple.com/KR/app/id1518956326
- Adopt: Korean planner listings put 위젯 and 워치 in the title, which shows they are purchase criteria. Treat the widget as a first-class screen. A one-glance day state (three states, not a percentage) is a better Home hero than a date.

**15. 루티너리** [search]
- Facts: Korean App Store 4.8 (about 6,500 ratings); its listing cites App Store "오늘의 앱" 2025 and a Forbes Health ADHD pick 2024. The core idea is execution: a "다음 할 일" guide walks the user through one step at a time with a timer and voice. A teardown praises routine creation that starts from suggested tasks by category rather than a blank screen. A behavioural-science critique faults its copy and UX details.
- Sources: https://apps.apple.com/kr/app/%EA%B0%93%EC%83%9D-%EB%A3%A8%ED%8B%B4-%EB%A3%A8%ED%8B%B0%EB%84%88%EB%A6%AC-%ED%95%98%EB%A3%A8-%EC%8A%B5%EA%B4%80-%EA%B3%84%ED%9A%8D%ED%91%9C-%ED%88%AC%EB%91%90%EB%A6%AC%EC%8A%A4%ED%8A%B8/id1450486923 · https://screensdesign.com/showcase/routine-planner-habit-tracker · https://www.thebehavioralscientist.com/articles/routinery-product-critique
- Adopt:
  - **Onboarding and empty chart**: never show 64 blank cells. Offer area and action suggestions per area so the first chart is mostly picked, not typed.
  - **Focus timer**: show one action, full screen, nothing else.

**16. 열품타** [search]
- Facts: over 5 million downloads (December 2025); 4.5 with about 41,000 ratings. Statistics colour the calendar darker the more you study. A home redesign drew complaints because the old home showed the day's and each subject's study time large, without tapping; the developer promised a "classic" home option.
- Source: https://apps.apple.com/KR/app/id1441909643
- Adopt:
  - The darker-with-use calendar is the same idea as our heat on the chart. It is a proven, understood Korean pattern; keep it and make it the centre of Stats.
  - Key numbers must be readable on Home without a tap.
  - Settle the Home layout before 1.0. Two of the biggest Korean planner apps were punished for moving things afterwards.

**17. 하루콩** [search]
- Facts: five mood "beans", each a colour and a face; a monthly calendar that shows the month's moods at once; Korean App Store 4.8; reported 10 million downloads with over 80% overseas; Google Play awards in Japan and France (2021). Press describes it as "귀여운 디자인과 직관적인 인터페이스".
- Sources: https://apps.apple.com/KR/app/id1553223828 · https://www.tech42.co.kr/?p=63474 · https://www.venturesquare.net/961398
- Adopt: one small, ownable mark repeated consistently is enough to make an app feel designed. Ours already exists: the 正 tally and the filled cell. Use them everywhere a count or a completion appears (widget, Live Activity, Stats, share image) instead of inventing new glyphs per screen.

**18. 무다 (MOODA) and 다꾸 감성** [search]
- Facts: handwriting fonts, paper backgrounds (속지), stickers for decorating, a room to furnish, a monthly "무드볼"; Korean rating 4.6. Reviews praise the look. The move from paid to free-with-ads caused a backlash, with users reporting lost data and lost paid features.
- Sources: https://apps.apple.com/KR/app/id6449689589 · https://ditoday.com/?p=43881 · https://mwm.ai/ko/apps/mooda/6449689589
- Adopt: 다꾸 means the *user* decorates. It needs a large asset library and a young audience. It is the wrong model for a yearly goal chart. What transfers is smaller: let the user choose accent and paper tone, and make the printed PDF and the share image beautiful, because that is where our users "decorate". The monetisation lesson: "free, no ads, no account" is a selling point Korean reviewers notice.

**19. DayGram and 씀: the quiet analogue precedent** [search]
- Facts: DayGram describes itself as an "E-Ink 스타일" minimal diary with a paper-like interface, one line a day, no ads, no subscription; Korean rating 4.2 (about 1,600 ratings). 씀 gives one writing prompt twice a day and lets users bind their writing into a book.
- Sources: https://apps.apple.com/kr/app/daygram/id977949232 · https://ditoday.com/?p=18578 · https://apps.apple.com/app/id1118780107 · https://ditoday.com/?p=21520
- Adopt: the analogue idea works in Korea when it is a constraint on the whole product (monochrome, one line, one prompt), not a background image. For us that means fewer inks and fewer rules on screen, not more paper effects.

**20. Korean 만다라트 apps** [search]
- Facts: 만다린 (nine charts, daily-reset habit cards), MandaPlan (AI suggestions, to-do list, widget), MandaAct ("9×9 만다라트를 매일 아침 체크리스트로", up to three charts, weekly report, core features free), 마만다 (four chart layouts, ₩4,400, 16 ratings at 4.8), AI 만다라트 계획표 (iPad, colour customisation). A community post judged one of them "오타니 쇼헤이만큼 디테일하지는 않지만".
- Sources: https://apps.apple.com/kr/app/%EB%A7%8C%EB%8B%A4%EB%A6%B0/id6455374816 · https://mandaact.vercel.app/ · https://apps.apple.com/kr/app/%EB%A7%88%EB%A7%8C%EB%8B%A4-mymanda-%EB%AA%A9%ED%91%9C-%EC%8B%9C%EA%B0%84%EA%B4%80%EB%A6%AC-%EB%A7%8C%EB%8B%A4%EB%9D%BC%ED%8A%B8/id6502872345 · https://bbs.ruliweb.com/community/board/300143/read/69454034
- Adopt: the category is small, low-rated in volume, and nobody in it is known for design. "Chart becomes a daily checklist" is no longer unique (MandaAct says the same), so the difference has to be visible quality. A sibling memo in this folder covers these apps in depth.

**21. Tiimo, iPhone App of the Year 2025** [search]
- Fact: Apple's Korean newsroom describes the winner as a visual planner that turns intentions into action. The planner category is in Apple's spotlight. Tiimo is not Korean; it is listed here only for that context.
- Sources: https://www.apple.com/kr/newsroom/2025/12/apple-unveils-the-winners-of-the-2025-app-store-awards/ · https://designcompass.org/2025/12/05/apple-unveils-the-winners-of-the-2025-app-store-awards/

### D. Japan

**22. Lifebear** [search]
- Facts: over 3,000 stamps to place on dates; きせかえ themes offered "like a 手帳 cover"; users choose text size, colour and display format. An early review called its UI close to a real 手帳 (that review is from 2012 and is outdated). A 2025 review lists the small number of free stamps and themes as a weakness.
- Sources: https://apps.apple.com/jp/app/id538340426 · https://dime.jp/genre/1519904/ · https://www.lifehacker.jp/article/120814todolifebear/
- Adopt: Japanese 手帳 users expect to make the book theirs. Present our accent and paper choices as きせかえ in the Japanese settings, and offer text-size and density options for the chart.

**23. ジョルテ** [search]
- Facts: fonts, wallpapers and themes can be changed; some themes and icons are paid; users call きせかえ "かわいい"; complaints about confusing widget sizes and post-update bugs.
- Sources: https://app-liv.jp/680086/ · https://mwm.ai/ja/apps/jorte-calendar/570556349
- Adopt: same as Lifebear. Also: describe each widget size clearly in the widget gallery.

**24. 継続する技術 (bondavi)** [search]
- Facts: one of Japan's best-known habit apps; the listing claims first place in Japan by downloads and App Store rating. Completely free, no ads. The company explains that an app for focus or for beating three-day quitting helps more without ads that take attention. Income is donations, sold as buying "ムダな機能" (useless features). Coverage credits a simple UI and humour. The method lowers the bar ("just five minutes") and allows no exception days.
- Sources: https://apps.apple.com/JP/app/id1120239484 · https://www.lifehacker.jp/article/2211_work_adventure_bondavi_01/ · https://bondavi.jp/ · https://studyhacker.net/daisuke-toda-interview01 · https://forbesjapan.com/articles/detail/63840
- Adopt: our business model is the same (free, no ads, no account). In Japan this is a headline, not a footnote. Put 完全無料・広告なし・アカウント不要 in the first screenshot and the subtitle. A single dry, human sentence in the right place (after a missed day, at day close) does more than any illustration.

**25. みんチャレ** [search]
- Facts: habit teams of at most five people; the company tested team size and found five kept habits best; a mascot character.
- Sources: https://apps.apple.com/jp/app/id1047462806 · https://app-liv.jp/articles/151113/
- Adopt: nothing visual. It shows that Japanese habit apps lean on mechanism and character rather than on minimal UI.

**26. Japanese マンダラチャート apps, and the name** [search]
- Facts:
  - The official app offers both 3×3 (A型) and 9×9 (B型), three display densities (標準, シンプル, ミニマム), drag-and-drop to swap cells, and Excel or text export.
  - ポケット9マス思考 is tap-to-fill from the centre out, with HTML or screenshot export.
  - AI目標達成マンダラチャート has AI suggestions, a progress heat map and switchable colour themes.
  - **"マンダラチャート" is a registered trademark** of 一般社団法人マンダラチャート協会 (registered by クローバ経営研究所 in 2006). The association publishes usage rules: write マンダラチャート® at first mention, and commercial use needs a licence.
  - The method was devised by 松村寧雄 in 1979; "マンダラート" is 今泉浩晃's separate 1987 method.
  - Japanese articles tie the 9×9 sheet to 大谷翔平's high-school 目標達成シート.
- Sources: https://app-liv.jp/5343832/ · https://app-liv.jp/5352420/ · https://mandalachart.jp/specification_regulations · https://www.issoh.co.jp/column/details/9243/ · https://www.lifehacker.jp/article/2401-matome-ohtani-shohei-goal/
- Adopt:
  - Chart density options and cell swapping by drag are table stakes in Japan.
  - Our Japanese store title is "マンダラート". Check both marks on J-PlatPat before launch (see pitfalls).

**27. LINE Design System (LDSG)** [fetched: catalogue citing designsystem.line.me]
- Facts: language packs for EN, JP, TC, TH with system-native fonts per language; text line height about 1.5; no gradients, neon or decorative accents; states shown by opacity (normal 100, pressed 50); no emoji in UI chrome; no exclamation marks in informational copy ("errors state, they do not shout"); placeholder text is an example value, not a label; toast disappears after about 4 seconds and is never used for something the user must confirm.
- Sources: https://raw.githubusercontent.com/CaesiumY/ko-design-md/main/services/line-design-system.md · https://designsystem.line.me/LDSG (cited there; not opened)
- Adopt: the Japanese build should follow the same restraint. Our Korean rules (no emoji, no "!") already match.

**28. Japanese text setting** [fetched: Digital Agency (デジタル庁) Tailwind plugin migration note] plus [recall]
- Facts: Japan's Digital Agency design system ships line-height tokens of 100, 120, 130, 140, 150, 160, 170 and 175%. [recall] Its standard body style is 170%, with dense UI styles at 120–130%.
- Source: https://raw.githubusercontent.com/digital-go-jp/tailwind-theme-plugin/main/MIGRATION.md
- Adopt: Japanese with kanji needs more leading than Korean. Give `read` text 1.6–1.7 in the Japanese build and keep 1.35–1.4 for single-line UI text.

### E. Korean typography conventions, side by side

| Role | Ours now | 당근 SEED | Toss TDS | 원티드 | KRDS |
|---|---|---|---|---|---|
| Big title | 26 / 32 | 26 / 35 | 26 / 35 | 28 / 38, 24 / 32 | 24 (mobile) |
| Section | 18 / 24 Bold | 18 / 24 | 20 / 29, 17 / 25.5 | 18 / 26 SemiBold | 19 |
| Row or body | 16 / 22, 16 / 21 | 16 / 22 | 16 / 24, 17 / 25.5 | 16 / 24 Medium; read 16 / 26 | 17 at ≥150% |
| Caption | 13 / 18 | 13 / 18 | 13 / 19.5 | 13 / 18 | 13 |
| Micro | 11 / 14 | 11 / 15 | none below 13 in the main set | 11 / 14 | none |
| Tracking, large | −0.4pt at ≥20 (−0.015em at 26) | none (system font) | not published | −0.023em at 24–28 | −0.01 to −0.02em |
| Tracking, body | −0.2pt at ≥15 (−0.0125em at 16) | none | not published | +0.006em at 16 | 0 |
| Tracking, small | 0 | none | not published | +0.02 to +0.03em | 0 |

Reading of the table:
- Our UI scale is sound and close to 당근's.
- There are two schools for body line height: 당근 at about 1.35 (dense lists) and Toss, 원티드, KRDS at 1.5 or more (reading). We only have the first. Add the second for paragraphs.
- Our 26pt title is the tightest of the four when it wraps. Hangul fills the em box with no descender gap, so two stacked lines at 32 look cramped. Use 26/34 or 26/35 where a title can wrap.
- The KRDS tracking figures in the table are the catalogue's "bundle" values; the official token file only defines 0 and 1px.
- Tracking evidence conflicts: Pretendard's author says no adjustment is needed, RIDI uses a flat −0.01em ([fetched: catalogue] https://raw.githubusercontent.com/CaesiumY/ko-design-md/main/services/ridi.md), 원티드 uses a size curve. Our values are inside the range real Korean products ship. The one clear gap is small text, where 원티드 opens the tracking and we do not. Compare on a device before changing.

Line breaking and numerals:
- Korean should break between 어절, never inside one. On the web that is `word-break: keep-all` plus an overflow rule for long tokens; on iOS it is the `hangul-word` line-break strategy; and `CFBundleDevelopmentRegion` affects iOS behaviour. [search] https://developer.mozilla.org/ko/docs/Web/CSS/Reference/Properties/word-break · https://daleseo.com/css-text-wrap/ · https://developer.apple.com/forums/thread/661665
- We already do all three (`AppText.tsx`, `app.json`). What is left is the last-line orphan: a heading whose final line is one short word. On the web, `text-wrap: balance` handles this; in React Native it has to be handled per string, by editing copy or inserting a manual break in the few large headings (onboarding, screenshots, year close).
- An older survey of Korean mobile sites found body text at 17px with −0.02em tracking. [search] https://lqez.github.io/blog/hangul-typography-on-mobile-web.html (dated; context only)
- Numerals: tabular for anything that updates or stacks in a column, proportional for a single emphasised figure (the Toss catalogue states this as a rule; "bundle" level). Our `NUM` helper covers the first half. The 56pt date and the "2 / 13" hero should be proportional.

### F. Korean App Store screenshots

- What the guides say [search]:
  - Use all ten slots.
  - One message per screenshot; captions of about five words.
  - Action-and-result captions ("2분 만에 하루 계획 세우기") beat adjectives; "편리한", "강력한", "직관적인" carry no information.
  - Shrink the image to search-result size; if the caption cannot be read, it fails.
  - Order the first three as value, benefit, proof.
  - Localise both the caption and the UI language shown.
  - Use real captures; avoid hands holding phones.
- Sources: https://asoworld.com/kr/insight/for-aso-beginners-how-to-optimize-ios-app-screenshots-for-apple-app-store · https://developer.apple.com/app-store/marketing/guidelines/kr · https://asomobile.net/en/blog/screenshots-for-app-store-and-google-play-in-2025-a-complete-guide/ · https://www.mobileaction.co/guide/app-screenshot-sizes-and-guidelines-for-the-app-store/
- Korean practice [recall]: a two-line Bold headline at the top in 해요체 or a noun phrase, a device or a cropped UI below, a strong flat background colour that changes between panels, and proof lines (downloads, "오늘의 앱"). 투두메이트's listing leads with a user count [search].
- Japanese practice [recall]: more text per panel, badges for 無料 and 広告なし, ranking claims.
- Adopt:
  - Delete "01 / 06".
  - Panel 1 is the hook: the full chart with a claim such as "목표 하나를 81칸으로".
  - Panel 2 is the daily use: "오늘 할 일은 저절로 담겨요" (already good).
  - Add a panel we do not have: "가입 없이, 광고 없이, 무료로".
  - Add widget and lock-screen panels.
  - Alternate paper, ink and gold backgrounds so the row has rhythm at thumbnail size.
  - Set captions at a size that survives the search-result thumbnail.

### G. What Korean developers now call "AI 티"

- The lists [search]: purple-to-blue gradient backgrounds, glowing buttons, an emoji on every menu item, rounded cards with soft shadows repeated three or four across, a card inside a card, one highlighted word in a headline, coloured status pills with 🟢🟠🔴. The fixes people publish: white ground, 1px lines, one accent, small radius, symbols and coloured text instead of emoji. One guide adds that the test is not "is it purple" but "did it arrive as a default with no product reason".
- Sources: https://github.com/swunion-200-OK/BeforeAI-FE/pull/11 · https://github.com/bin7335/vibe-taste · https://tilnote.io/en/pages/6a9355cface8bd2da70ebf6a · https://aisparkup.com/posts/16959
- Adopt: our bans are the same list, so keep them. But by 2026 the cleaned-up look (off-white, hairlines, one accent, small radius) is itself what a careful AI pass produces. It no longer signals a human hand. What signals it: a clear hero per screen, numbers with meaning, one signature moment, and typographic care in the Korean.

---

## What makes a Korean user say "이 앱 진짜 잘 만들었다"

Synthesis of the references above; the last two are recall.

1. **It answers before being asked.** Home says what to do today in one sentence. No tap needed to see the key number (열품타).
2. **Nothing waits, nothing shouts.** No spinner, no alert box where a sheet would do, no exclamation marks (Toss, LINE).
3. **The words are right.** 해요체, no jargon, no repeated sentence, buttons that say where they lead (Toss).
4. **The Korean is set properly.** No word split across lines, no lone syllable on the last line, numbers that do not jitter, hierarchy from size and grey rather than from Bold (TDS, 원티드, 당근).
5. **Simple, and one thing is charming.** "심플한데 귀엽기까지" (투두메이트), the beans (하루콩). For us: the tally, the filled cell, the double rule at day close.
6. **My record becomes a picture.** Colour by category across a month or a year (투두메이트, 열품타). Our chart heat already is this; make it the centrepiece of Stats and year review.
7. **It lives outside the app.** Widget, lock screen, Watch, D-day (마이루틴's title, 투두메이트's reviews).
8. **It is honest.** Free, no ads, no login, and it stays that way (MOODA's backlash, bondavi's praise).
9. [recall] **Touch feels considered.** A light haptic and a 150ms press response on every check, and one richer moment when the day closes.
10. [recall] **Dark mode is designed, not inverted.**

## What reads as dated or amateur

Partly sourced (items 1–6), partly recall (7–12).

1. Equal-weight sections stacked on Home with no hero (Apps in Toss guidance).
2. A number with no meaning beside it.
3. Emoji as icons, gradient fills, card inside card, coloured pills (the "AI 티" lists).
4. Bouncy spring animation on ordinary controls; skeleton shimmer; long fades (Toss catalogue, KRDS, 원티드, 배민 all exclude bounce).
5. A legend needed to read the main screen.
6. Layout that moves between versions (투두메이트, 열품타).
7. Mixed speech levels (해요체 next to 합니다체), translated-sounding Korean ("당신의", "~을 가지고 있습니다").
8. Hangul broken mid-word, or body text at 1.2–1.3 line height in paragraphs.
9. Skeuomorphic leather, stitched paper, page-curl. In 2012 this was praised (Lifebear); now it reads as old.
10. Hairline boxes around everything with small grey text inside.
11. A feature carousel before the user has seen any value.
12. System alert dialogs for routine confirmations.

## Recommendations by screen

- **Home**
  - One hero. Either today's state as a sentence with the count emphasised, or the remaining-days number with its label.
  - Date moves to a single header line with week number and D-day.
  - Remove the duplicate count. Give every figure its meaning.
  - Section titles drop to SemiBold in secondary ink.
  - Dot grid only behind the header area, or not at all behind lists.
- **9×9 chart**
  - Keep the density.
  - Make the three cell states distinguishable without a legend. For example: done is a solid fill, area name is Bold on a tint, today is an inked corner.
  - Balance area colours in OKLCH.
  - Offer density options and drag-to-swap, which the Japanese official app has.
- **Zoomed 3×3**
  - Treat as a flow screen: one block, one primary action.
  - Area suggestions when a cell is empty.
- **Today**
  - Replace the seven-mark strip with a plain statement on the second line ("이번 주 1/3회") and move history to the streak mode.
  - Hide items not due today.
  - "할 일 고르기" for the picker.
  - Press scale 0.97 and haptic on check; row titles Medium.
- **Stats**
  - Lead with one sentence of meaning.
  - Month and year heat by area colour.
  - Bars with a single highlighted bar and no axes.
- **Onboarding**
  - Show a finished example chart first.
  - Then one question per screen, in question form, with one bottom button.
  - Suggestions instead of blank cells.
  - `read` line height for body copy.
- **Settings**
  - Accent and paper choice grouped as a theme section (きせかえ in Japanese).
  - Text size and chart density.
  - Footnotes at `read` line height.
- **Sheets**
  - Bottom sheet for every pick and confirm; one filled button.
  - Enter 300ms on (0, 0, 0.15, 1); exit 200ms on (0.35, 0, 1, 1).
- **Widgets and Live Activity**
  - Design as standalone products.
  - Small: mini heat chart plus "오늘 2/13". Lock screen: D-day or remaining count.
  - Use the tally and the filled cell as the only marks.
- **Icon**
  - A 3×3 grid with the centre cell in gold on paper or ink.
  - No Hangul, no gradient.
  - Check it at home-screen size beside 투두메이트 and 마이루틴. (Our suggestion; not from a source.)
- **Store screenshots**: see section F.
- **Type tokens**
  - Add `read`.
  - Loosen wrapping titles to 26/34–35.
  - Align `rowTitle` to 16/22.
  - Test positive tracking at 11 and 13.
  - Test Pretendard JP for Japanese.
  - Japanese `read` at 1.6–1.7.

## Pitfalls to avoid

1. **Becoming a Toss clone.** Toss's look is the market's default and is criticised as homogenising. Its quality also depends on motion and 3D assets we do not have. Take the principles.
2. **Applying "one thing per page" to the chart.** Toss has been criticised for hiding information. The 81 cells are the product.
3. **Going 다꾸.** Stickers and handwriting fonts need a large asset library and skew young; they fight a serious yearly plan.
4. **More texture.** Paper feeling should come from fewer inks and steadier rhythm. Visible patterns behind text and any skeuomorphic binding read as 2012.
5. **Friendly copy without context.** "무작정 토스처럼 말 걸지 마라". Keep 해요체 informational; no memes or trend words.
6. **Changing Home after launch.** Decide the layout now.
7. **Trademarks and names in Japan.** "マンダラチャート" is registered and has published usage rules. Our Japanese title "マンダラート" is the name of a different originator's method, and I could not confirm its trademark status. Check both on J-PlatPat, and consider a neutral title built on "目標達成シート" or "81マス". Do not use an athlete's name in store text without legal advice.
8. **Copying numbers from other systems blindly.** Toss's values are for Toss Product Sans, 당근's for system fonts, 원티드's for Pretendard JP. The Toss "bundle" figures in the catalogue are not official. Test on a device.
9. **Shipping Korean leading and tone in Japanese.** Japanese needs looser lines and です/ます.
10. **Inventing social proof.** We have no download numbers at 1.0. Lead with what is true: free, no ads, no account, widgets, print.
11. **Treating the ban list as the design.** The bans remove the AI look. They do not add hierarchy, meaning or a signature.

## What I could not verify

- **Pages not opened.** Everything marked [search] rests on the search tool's summary: all Toss pages, App Store listings and reviews, 브런치, 요즘IT, 디지털 인사이트, Japanese media. Quotes may be paraphrased by the tool.
- **Not researched at all** because the search budget ran out: 챌린저스, "데일리" (I could not even identify which app is meant), 뉴트로 as a UI trend, Pinterest collections, 디자인 나침반 articles on planner apps, Korean-specific screenshot case studies, みんチャレ's and ジョルテ's visual design, any 2026 change from iOS 26 Liquid Glass in Korean apps.
- **No screenshots seen** of any third-party app. Descriptions of 투두메이트, 하루콩, MOODA, DayGram, Lifebear and the Japanese chart apps are from store text, reviews or recall.
- **Toss details.** Motion timings, radii, button heights and the bar-chart rule come from a third-party catalogue's "bundle" values, not from Toss. The "48px number, 24px unit" ratio is one developer's analysis. The claim that TDS line heights for 22, 20, 15, 13 are 31, 29, 22.5, 19.5 was confirmed only by the search tool against the official page.
- **KRDS line height of 150%** is quoted by the catalogue from the official page; the token JSON I fetched has no line-height tokens.
- **Pretendard OpenType features** (which stylistic sets exist) were not read; the post is at cactus.tistory.com/306.
- **Digital Agency body line height of 170%** is recall; I only confirmed that the token set runs from 100 to 175.
- **"マンダラート" trademark status** and the eight life areas of the マンダラ手帳 are not confirmed.
- **Ratings and download counts** are as reported in search summaries and will have moved.
- **Trends named in the brief** (텍스트힙, 필사, 홈 화면 꾸미기, 갓생) are widely reported in Korea but I did not source them here; I have not relied on them for any recommendation.
- **The contrast of our secondary and tertiary inks on #FBF9F4** was not measured.
