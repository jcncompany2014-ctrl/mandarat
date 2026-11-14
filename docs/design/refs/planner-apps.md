# Best-in-class planner, to-do and habit apps — the craft bar, and what 만다라트 should take from it

Research date: 2026-11-14. Scope: Things 3, Structured, Tiimo, Streaks, (Not Boring) Habits, Todoist, TickTick, Timepage, Fantastical, Sunsama, Daylio, Gentler Streak, Day One, Bear and Craft, Clear, with short notes on Finch, Opal, Focus Friend, Habitify, Amie, Sorted, Tangerine and Ladder. Patterns are extracted by area (section 4) and end in 15 patterns mapped to our screens (section 5).

**How to read the labels**

- **[S]** = read in a source during this session (link given).
- **[R]** = recalled from my general knowledge of the app (training data to mid-2026), not verified this session. Sizes written as "about" are estimates from memory, not measurements. Treat every [R] as a lead to check with the app installed.
- **[P]** = my proposal for 만다라트. Sizes and timings in proposals are suggestions.
- **[C]** = checked in our code or our own screenshots.

**Source limits (read this first).**

- The shared web-search budget for this run (200 calls across all agents) was already used up before my first query. I ran zero searches, in any language.
- `WebFetch` could reach only `developer.apple.com`. `culturedcode.com`, `structured.app`, `www.andy.works` and `apps.apple.com` all failed because they are outside this session's network allowlist, and I stopped probing other hosts after that.
- So every [S] in this memo is Apple: developer stories, Apple Design Award pages, the HIG and WWDC transcripts. Apple's own stories about Things, Tiimo, Structured, Streaks and Fantastical turned out to be about engineering or business and contain almost no UI description.
- The consequence: **nearly all app-specific UI description here is [R].** I know these apps well, but nothing visual was verified, no screenshot of any reference app was seen, and no teardown article was read. Section 7 lists what to check and which hosts to allow for a follow-up pass.
- Third-party links for Things, Timepage, Bear and (Not Boring) that sibling agents found through search are in `docs/design/refs/stationery-print.md` (D1, D2, D4, D8). I did not open them and do not repeat the URLs here.

---

## 1. Summary

1. **None of the best apps has a "home dashboard". They open on the working surface.** Things opens on a list, Streaks on its six rings, Structured and Tiimo on today's timeline, Clear on the list itself [R]. Headspace's award story is about removing four category tabs in favour of one Today tab [S]. Our 홈 is a digest of the other three tabs (seven stacked sections, "13/13" printed twice [C]). In my judgement that pattern belongs to the feature-heavy tier of this category (TickTick), not the premium tier.
2. **Each premium app has exactly one hero interaction, and most of the craft budget is spent there.** Things: the to-do that opens in place, and the draggable Magic Plus. Streaks: press and hold until the ring closes. (Not Boring) Habits: a checkbox with "six or seven things" layered into it after "thousands of iterations" [S]. Clear: swipe to complete with a rising tone. Fantastical and Todoist: text that parses as you type [R]. We have none. Our check is a careful 230 ms fill-and-stroke [C], which is a good base, but nothing in the app is memorable to do.
3. **Rows are calm: one title, at most one line of metadata, one control.** In Things the to-do title is regular weight, there are no separators, and the only bold thing on screen is the list title [R]. Our Today row carries a title, an area square, a kind line, a D-day label and a 7-glyph week strip with four glyph states, under a header with a 13-box tally and an 8-item filter row [C]. The user's own words are not the loudest thing on the page.
4. **Shape tells you the level.** Things: square box = to-do, circle with a pie fill = project [R]. Activity rings mean one thing only, and Apple forbids reusing them for anything else [S]. We have a strong native shape (cell, 3×3 block, 9×9 sheet) and do not use it as a progress language: progress is shown as bars, tally boxes, percentages and dots as well.
5. **Colour has one job per hue.** Things is almost neutral with colour reserved for list identity and deadlines [R]. Halide marks an active feature with a single yellow highlight [S]. HIG: "Avoid using the same color to mean different things" [S]. Our gold marks today, the primary button, Stats fills and focus, and sits next to the 황토 area colour (the stationery memo measured this).
6. **Depth is used once, for the thing in your hand.** Things lifts the open to-do as a card with a soft shadow and keeps everything else flat [R]. Our total ban on shadow and elevation removed the cheapest way to say "this is the object you are editing". Lift the ban for exactly one case (section 5, pattern 6) and let the system's glass handle chrome.
7. **A small closed set pulls people to finish it.** Streaks' developer: "I found if I did four or five tasks, a sixth — even if it was completely unrelated — needed to be done too" [S]. A 3×3 block is a closed set of eight. We show today's picks as an open-ended list of 13.
8. **The awarded tone is "enough", not "more".** Gentler Streak's designer: "I needed something that let me know when it was enough" [S]. Sunsama's daily shutdown and Things' empty Today do the same job [R]. Our closed day is a table row ("10월 14일 수요일 마감 13 / 13") followed by a link to pick more [C].
9. **Standard controls stay standard, including in the loudest apps.** (Not Boring): "We didn't have to rethink how a button or a popover works" [S]. Fantastical, moving to a new platform, kept its design language and used system-provided colours as far as possible [S, paraphrased]. Our tab bar, sheets and headers are all custom JS.
10. **Performance is part of the look.** Notion's mobile lead: "Performance is everything… when we improve performance, all metrics go up" [S]. WWDC18: "people are really, really sensitive to latency… Everything needs to respond instantly" [S]. A check that waits for a JS-driven SVG stroke on a busy list is a design problem, not only an engineering one.

---

## 2. Honest read of today's build against this category

Based on `store/screenshots/ko/APP_IPHONE_67/01-chart.png`, `02-today.png`, `03-home.png`, `04-stats.png`, `src/components/Check.tsx`, `src/lib/haptics.ts`, `src/theme/type.ts`, `src/theme/motion.ts` and the four audits in `docs/design/audit/`.

**Good, and at the category's level already**

- The check itself: 120 ms area-colour fill, then a 170 ms pen stroke with a per-row tilt, Reduce Motion and Increase Contrast handled [C]. This is the right seed for a hero interaction.
- A haptic vocabulary with one meaning per haptic, and `success` reserved for milestones [C]. That is the HIG rule [S, via the sibling memo] and better than most apps.
- The 正 tally week strip. No app in this survey has anything like it.
- The chart drawn as one object across tab, thumbnail, poster and archive.
- Motion tokens exist (`DUR`, `SPRING`) and done rows are held briefly before they sink [C], which is the Things behaviour.

**Weak, measured against the references**

| Area | Today in 만다라트 [C] | What the references do |
|---|---|---|
| Opening screen | 홈: date numeral, mini chart, 이번 주 중점, 오늘 할 일, 이번 주, 8개 영역. First task below the fold on small phones (audit HL-02). | Open on the working list. No digest screen. (Things, Streaks, Structured, Tiimo [R]; Headspace Today [S]) |
| Row | 2 lines + week-dot strip + D-day; 16 pt semibold title; dot paper and hairline rules together. | 1 line, 17 pt regular, whitespace or one rule, metadata as tiny glyphs. (Things [R]) |
| Header of 오늘 | 7 layers and about 226 pt before the first task (audit HL-04); the count shown three ways. | Title, then the list. (Things, Todoist [R]) |
| Hero interaction | None. No sound at all (`package.json` has no audio module). | One per app, layered. ((Not Boring) [S]; Streaks, Clear, Things [R]) |
| Progress language | Bars, 13 tally boxes, n/8 text, percentages, dots, 正, cell tint: seven systems. | One shape per level, reused everywhere. (Things pie, Streaks ring [R]; Activity rings [S]) |
| Add | 담기 is the centre tab, drawn as a dashed box. | A floating button, or text entry that parses. Tabs are for places. (Things, Todoist [R]; HIG [S]) |
| Type weights | Five to ten bold 18 pt section heads per screen; `'800'` titles; user text at 16. | Two weights per screen; the user's words are the darkest repeated element. (Things, Bear [R]) |
| Chrome | Custom tab bar, custom sheets, four different header anatomies (audit HL-05). | System bars and sheets, tuned. ((Not Boring), Fantastical, Notion [S]) |
| End of day | A ledger row, then "실천에서 더 고르기 ›". | A clear, quiet stop. (Gentler Streak [S]; Sunsama, Things [R]) |

Short version: we removed bad taste carefully and then filled every screen with small, equally weighted bookkeeping. The best apps in this category look empty by comparison, and spend their effort on one object and one gesture.

---

## 3. References

### R1. Things 3 (Cultured Code) — the quiet benchmark

- **What it is.** Paid to-do app on iPhone, iPad, Mac, Watch and Vision Pro. Team of 11 in Stuttgart; Apple Design Award 2009 and 2017 [S].
- **What Apple's story says [S].** It calls Things a "two-time Apple Design Award winner" with a "decade-old standing as a rock-solid utility". When the team replaced the whole sync backend, the goal was that nobody would notice: "Maybe a few people noticed it was faster… But otherwise, the impact on users was really nothing." The article's screenshots are plain checkbox lists on a white background, and the text says nothing else about the UI.
- **What exactly is good [R].**
  - The top level is a short list of lists (Inbox, Today, Upcoming, Anytime, Someday, Logbook), each with one small coloured glyph (a yellow star for Today, a red calendar for Upcoming). Everything else is black and grey on white. Colour means "which list" or "deadline" and nothing else.
  - Today is a large bold title with its star, calendar events as compact grey lines, then to-dos, then a "This Evening" group under a moon glyph. No statistics, no greeting, no progress meter.
  - Rows: a single-line title in regular weight at about 17 pt, no separator lines (rows are divided by whitespace only), and small grey glyphs after the title when a to-do has notes, a checklist or a reminder.
  - Checkbox: a small rounded square, about 20 pt with a hairline grey stroke, inside a 44 pt row. A project uses a circle that fills like a pie as its to-dos are completed. Shape tells you the level before you read a word.
  - Completion: the box fills with the blue accent and a white tick is drawn; the title greys; the row stays where it is for a beat so a mistake can be undone, then leaves for the Logbook. No strike-through.
  - Opening a to-do expands it in place into a white card with a soft shadow; neighbours move apart and dim. Notes, checklist, date, tags and deadline live inside as small icons along the card's lower edge. This is the only place the app uses depth.
  - Magic Plus: a round blue button at bottom right. Tap for a new to-do; drag it into the list to insert exactly there; drag it to the bottom-left corner to send to Inbox.
  - Upcoming: one section per day, each led by a large bold day number with a small grey weekday.
  - Pull down on any list to search. Swipe a row right to schedule, left to select.
  - An empty list shows the list's own glyph, large and very faint, centred, with no text.
  - I believe Cultured Code shipped a Liquid Glass refresh for iOS 26 in autumn 2025; not verified.
- **Source.** https://developer.apple.com/articles/things/ . Third-party teardowns: see `stationery-print.md` D1 (not opened by me).
- **Adopt [P].**
  - 오늘 list: decide on one separator system. On the notebook concept that is the ruled line, so remove the dot field behind lists (dots and rules together are two grids; audit HL-24 found them out of register).
  - Shape = level (pattern 4), open in place (pattern 6), floating add (pattern 8), date numerals as list markers (pattern 11), empty state as a faint object (pattern 15).
  - Row title to 17 pt and a lighter weight; section heads down to a small label, so the user's words carry the page.

### R2. Structured — "visually sharp and easy to scan"

- **What it is.** Day planner built on a vertical timeline. ADA Inclusivity finalist 2026; iPad App of the Year finalist 2025 [S].
- **Apple's words [S].** "Visually sharp and easy to scan, this SwiftUI-built daily planner prioritizes downtime as much as productivity. It excels not just at optimizing open slots on your calendar, but also at helping you find time to take breaks. Members of the neurodivergent community have praised Structured for its simple layout and the way it incorporates the Foundation Models framework to suggest and pre-fill tasks." The founder worked alone for almost three years: "You have to focus on what's important. The product becomes more focused, which in the case of consumer apps is usually a good thing."
- **What exactly is good [R].**
  - One vertical line down the left of the day. Each task is a coloured capsule on that line holding one icon; its height follows its duration. Title and time range sit to the right, and a round check sits at the far right of the row.
  - The header is the date set large, with a 7-day strip under it; each day in the strip shows tiny marks for that day's tasks, and the selected day is a filled circle.
  - The app suggests an icon from the words typed into the title.
  - A new day is never blank: it starts with two default anchors ("Rise and Shine", "Wind Down"), and gaps between tasks carry a short friendly line about free time.
  - One warm accent (a coral pink by default) plus per-task colours; unscheduled tasks live in an Inbox sheet; one round add button floats at bottom right.
- **Source.** https://developer.apple.com/design/awards/ , https://developer.apple.com/app-store/app-store-awards-2025/ , https://developer.apple.com/articles/start-small-code-big/
- **Adopt [P].**
  - The week strip that both reports and navigates (pattern 10).
  - Never show a blank object: the first chart a new user sees has its centre typed and one sample block filled (ties to audit HL-15).
  - Pre-fill: when an area is named, offer 3–5 tappable example actions (the sibling memo proposes the same from Apple's citation).
  - Do not copy the pastel timeline. Two incumbents own that look.

### R3. Tiimo — iPhone App of the Year 2025

- **What it is.** Visual planner designed for neurodivergent users; 15 people in Copenhagen; ADA finalist 2024 [S].
- **Apple's words [S].** "By turning our chaotic calendars into a timeline of soothing colors, Tiimo did the unthinkable: It made tackling our to-dos a calming activity." Cofounder: "Tiimo is designed with the neurodivergent brain in mind, but we've found that approach can also be universal… many of our users don't identify as neurodivergent and love the way that we represent time." The story's screenshots show a to-do list on white, a day's calendar on black, and a widget with a workout timer above three list items (warmup, weightlifting, cardio). The iOS lead describes the designer sitting beside him saying "Maybe add a little more shadow here" and "What if we switch this shape to something else?" while the SwiftUI preview updates.
- **What exactly is good [R].** Time shown as shapes instead of numbers: pastel blocks on a day timeline, each with an icon; a round countdown that drains during a focus session; routines broken into checkable steps; a rounded, friendly display face; very little text per screen.
- **Source.** https://developer.apple.com/app-store/app-store-awards-2025/ , https://developer.apple.com/articles/tiimo/
- **Adopt [P].**
  - Represent the thing as a shape before a number. Our shape is the cell: "13 / 64칸" should be seen as 13 inked cells first and read second.
  - The widget in Apple's own screenshot is a timer plus a three-step list. Ours can be the focus area's 3×3 with today's cells marked, which is richer than a text list and still glanceable.
  - The designer-next-to-developer loop is how small details get tuned. For us that means tuning the check, the zoom and the hold on a device, not in web screenshots.

### R4. Streaks — a hard limit as the product

- **What it is.** Habit tracker; ADA 2016; syncs "across iPhone, iPad, Apple Watch, and Mac via iCloud" [S].
- **Apple's words [S].** The app "tracks the number of consecutive days you've completed a task" and "gamifies your to-do list: Can you hit all six tasks every day?" Developer: "I found if I did four or five tasks, a sixth — even if it was completely unrelated — needed to be done too… So I would put the more difficult one at the end." "There are probably 500 icons the app will suggest based on what you type as your task." The first prototype "looks pretty much as Streaks does now, just without the colors and icons."
- **What exactly is good [R].**
  - The whole screen is six large rings in a 2×3 grid on one saturated theme colour. Each ring holds a white icon; the name sits under it in capitals with the streak count.
  - Completing is press and hold: the ring draws itself closed under your finger, then confirms with a haptic. Letting go early cancels.
  - Tapping a ring flips it to that task's statistics. There is no separate dashboard.
  - Later versions raised the limit (12, then 24, on further pages) but kept six per page.
  - A theme is one colour. Changing it recolours the entire app.
- **Source.** https://developer.apple.com/news/?id=67dti69d
- **Adopt [P].**
  - Make the small closed set visible. Today's picks could be laid out as a 3×3 block (up to eight actions around the date or the goal) so the last empty cell pulls. This is the Streaks effect using our own object, and it is the strongest candidate for a Home that looks like no other planner (pattern 1, option B).
  - Hold to complete, with progress under the finger, for the rarer and heavier act of achieving a cell for good (pattern 7). Keep the daily check a tap.
  - The object flips to its own history; statistics live with the thing they describe.

### R5. (Not Boring) Habits — one interaction, layered

- **What it is.** Habit builder by Andy Works (two people). ADA Delight and Fun winner 2022 [S].
- **Apple's words [S].** The checkbox is "no mere tappable square — it's an interactive event replete with explosive 3D animations, custom sounds, and playful haptics", and it "can't merely be ticked; you have to intentionally press on the screen for longer than you might think". Allen: "After prototyping, we found we had to make it much more intentional; we needed feedback that told you you needed to keep holding." "We added maybe six or seven things in the checkbox, but most games probably have two or three times that for any one interaction." "There were thousands of iterations." The structure: "it takes 66 days to build a new habit; in certain ways, it's a video game with 66 levels", with named stages (Karat, Summit, a "final battle"). Standard controls are "fairly off-the-shelf… We didn't have to rethink how a button or a popover works." Dawson: "Big teams will always have more features than we do — we just can't compete there. But design is difficult to copy." Allen: "minimalism is a fun place to visit for me, but it's not somewhere I want to live." The whole app "was developed in all of two months."
- **Source.** https://developer.apple.com/news/?id=9ab1g4r3 , https://developer.apple.com/design/awards/2022/
- **Adopt [P].**
  - Count our layers. Today the check has three (fill, stroke, haptic). Add three in our own material: a quiet pencil sound, the title's ink settling, and the matching cell inking on the chart (pattern 3).
  - "Feedback that told you you needed to keep holding" is the rule for pattern 7: the frame must start drawing the instant the finger lands.
  - 64 cells are our 66 levels. Name the stages on the way (first cell, first block of 8, half the sheet, the full sheet) and give each one a distinct, designed moment.
  - Leave buttons, popovers, sheets and bars standard.

### R6. Todoist — quick add and recovery

- **What it is.** Cross-platform task manager. No Apple source this session; everything below is [R].
- **What exactly is good [R].**
  - Quick Add: one text line attached to the keyboard. As you type, recognised fragments ("tomorrow 4pm", "#Work", "p1", "every Monday") highlight inline and become structured fields; a row of small action chips sits under the field. Korean and Japanese date phrases are recognised.
  - Checkbox: a circle whose outline colour is the priority. Completing it gives a short pop, the row collapses, and an Undo toast appears at the bottom for a few seconds.
  - Today: large title with the date and task count beneath; overdue items form one group with a single "Reschedule" action instead of a warning on every row.
  - Upcoming: a scrollable week strip on top of a day-grouped list.
  - Empty Today ("Todoist Zero") is an illustration with a line of praise and the day's goal status.
  - Brand red is used for the add button and overdue dates and almost nowhere else.
- **Adopt [P].**
  - Parse as you type in 담기 (pattern 9).
  - Undo as a visible affordance. We already hold the row and have `Snackbar.tsx`; show "완료 · 되돌리기" for about 4 seconds on the first few checks a user ever makes, then rely on the hold.
  - One overdue group with one action, not a mark on every row.

### R7. TickTick — the counter-example with usable parts

- **What it is.** Tasks, calendar, habits, Pomodoro, Eisenhower matrix and countdowns in one app. All [R].
- **What exactly is good [R].** The habit page puts a 7-day header across the top so each habit row needs no strip of its own. The Pomodoro screen is one large ring and a start button. The tab bar is user-configurable, which is their answer to having too many modules.
- **What is weak [R].** Every module is finished to the same medium level and none is memorable. Statistics, themes and modes are everywhere. It reads as a capable tool, never as a crafted object.
- **Adopt [P].**
  - One shared 7-day header for the whole list instead of a week strip in every row (pattern 10).
  - Our 오늘 has three modes (목록, 연속 기록, 보드) and a mood row and a 마음가짐 rating and a one-line journal. That is the TickTick shape. Cut or hide before launch (audit HL-12 reaches the same conclusion from the layout).

### R8. Timepage (Moleskine) — a paper brand without paper

- **What it is.** Calendar by Moleskine and Bonobo. My knowledge and the sibling memo's sources are from 2015–2019; the app's 2026 state is unknown.
- **What exactly is good [R].**
  - The agenda is a continuous list in which each day is a row led by a large day numeral and a small weekday, events to the right.
  - The month view is a "heat map": a grid of dots whose strength shows how full each day is.
  - One theme colour floods the whole interface; the user picks it from a named palette. No paper texture anywhere.
  - Light geometric capitals for labels (reviewers disliked the all-caps, per the sibling memo).
- **Adopt [P].**
  - Date numerals as row markers in lists (pattern 11).
  - The heat-map month is what our Stats "최근 10주" lattice and tinted chart already do. It is a known, liked pattern; make it the hero of Stats and fix its empty state (audit HL-03).

### R9. Fantastical — the strip and the parser

- **What it is.** Calendar by Flexibits, 13 years old [S].
- **Apple's words [S].** Paraphrasing the interview: bringing it to a new platform, the team made legibility of type and controls the first concern, stayed consistent with their existing design language and used system-provided colours as far as possible. Michael Simmons calls the result "the best version we've ever made." Five months from first device to submission: three to learn, two to polish.
- **What exactly is good [R].**
  - DayTicker: a horizontal strip of days, each showing small coloured bars for its events, locked to the list below. Scrolling either one moves the other. Pulling the strip down turns it into a full month.
  - Natural-language entry: while you type "Lunch with Kim Friday 1pm", the words animate out of the sentence into the event's fields. The parse is shown, not just performed.
- **Source.** https://developer.apple.com/news/?id=you1yc2h
- **Adopt [P].**
  - Week strip that expands in place into the 10-week lattice when pulled down (pattern 10).
  - Show the parse in 담기 (pattern 9).
  - Two-fifths of their schedule was polish. Budget ours the same way.

### R10. Sunsama — the ritual as a product

- **What it is.** Daily planner built around guided rituals. All [R].
- **What exactly is good [R].**
  - Daily planning is a sequence of single-question steps: what do you want to do today (yesterday's leftovers are offered first), how long will each take, is the total realistic (it warns when planned hours exceed your usual capacity), in what order.
  - Daily shutdown: a list of what got done, one reflection field, then the app tells you the day is over.
  - Weekly review and weekly planning follow the same pattern with objectives.
  - Focus mode shows one task alone with a timer.
  - The voice argues for doing less.
- **Adopt [P].**
  - Weekly review and year close as one question per screen (pattern 14).
  - A capacity nudge when picking for today: past eight, say "오늘은 여덟 개까지가 좋아요" once, do not block.
  - 하루 마감 as a real ending (pattern 13).

### R11. Daylio — a year on one screen

- **What it is.** Mood and activity diary. All [R].
- **What exactly is good [R].**
  - "Year in Pixels": one small square per day, 12 columns by 31 rows, coloured by mood. The whole year is one image, and people share it.
  - "Days in a row": the last five days as five circles with the longest chain as a number beside them. A short window, not an ever-growing counter.
  - Two-tap entry, with "Today / Yesterday / Other day" offered the moment you add.
  - The add button sits in the middle of the tab bar. Apple's HIG says the opposite: "Use a tab bar to support navigation, not to provide actions" [S].
- **Adopt [P].**
  - Our year review as cells: 52 weeks × 7 days in the chart's own cell language, exportable as the poster (pattern 5).
  - Streak as a short window ("최근 7일 중 5일") before a lifetime count (pattern 13).
  - "어제도 했어요" as a first-class option in the action sheet, not bare bold text (audit HL-16).

### R12. Gentler Streak — the tone Apple keeps choosing

- **What it is.** Fitness tracker from Slovenia. ADA Social Impact winner 2024 [S]; Watch App of the Year 2022 and a team of eight according to the sibling memo `apple-awards.md`.
- **Apple's words [S].** "powered not by insistent reminders but an optimistic and encouraging vibe… relies on a subtle and consistently pleasing design language. Its health data is smartly organized, and its Monthly Summary view — which shows how you're doing in relation to your history — is less about hard comparisons and more about progress." The designer: "My problem wasn't that I lacked motivation… I needed something that let me know when it was enough." His prototype "guided but it didn't push. And it wasn't based on numbers; it was more explanatory." CEO: "Statistics are just numbers. Without knowing how to interpret them, they are meaningless." A screenshot caption reads "Good news from Yorhart: This user's needs and capabilities are being met perfectly." Korean and Japanese were added in spring 2024.
- **What exactly is good [R].** The Activity Path: a soft band across recent days that marks your own sustainable range, with each day's dot inside, above or below it. Rest days keep the streak. The first thing on screen is a sentence about today.
- **Source.** https://developer.apple.com/news/?id=3m0ht22s , https://developer.apple.com/design/awards/2024/
- **Adopt [P].** Pattern 13 in full: a sentence before a number, comparison only with the user's own past, planned rest as a valid mark, and a designed "enough".

### R13. Day One — time made visible in a list

- **What it is.** Journal. All [R].
- **What exactly is good [R].** The timeline's left gutter carries the date as a small weekday over a large day number, with the entry to the right, so scrolling is reading a calendar. "On This Day" resurfaces entries from earlier years. A calendar view fills a dot for every day written. The journal can be ordered as a printed book.
- **Adopt [P].**
  - Left-gutter date numerals for the 회고 log, the weekly review history and the archive (pattern 11).
  - After a year of use, the weekly review can open with "작년 이 주".
  - The printed book is their proof of permanence. Our PDF is ours; the sibling memo already argues it should be the best-designed object we ship.

### R14. Bear and Craft — notes apps that set the type and depth bar

- **What they are.** Bear: Markdown notes by Shiny Frog. Craft: documents; ADA Interaction finalist 2021 [S].
- **What exactly is good [R].**
  - Bear: one red accent on a warm white page, its own typeface since Bear 2, in-note to-dos as rounded squares that fill with the accent, themes named like materials. I believe the note list shows a small progress mark for notes containing to-dos; not sure.
  - Craft: pages as cards with soft shadows and generous corners, and a page that opens by growing out of its own card.
- **Source.** https://developer.apple.com/design/awards/2021/ (Craft's finalist listing only; the page has no citation text for finalists).
- **Adopt [P].** One accent is enough when the type is good. A cell that opens by growing from its own position is the transition for pattern 6.

### R15. Clear — gesture, colour and sound as the whole interface

- **What it is.** A list app from 2012, relaunched as Clear 2 around 2023–24. All [R], and possibly outdated.
- **What exactly is good [R].**
  - No buttons. Pull down to add, pinch apart to insert between two rows, swipe right to complete, swipe left to delete, pinch together to go up a level.
  - Rows are full-width colour bands; position sets the colour, so the list is its own priority heat map.
  - Completing several items in a row plays notes that climb in pitch.
- **Adopt [P].**
  - The climbing notes, mapped to the five strokes of 正 (pattern 3).
  - Pinch as a second way to move between the sheet and a block, always alongside the visible tap.
  - Order in the list is the only priority system; no flags or stars.
- **Do not adopt.** Gesture-only navigation. It was famous and also famously undiscoverable.

### R16. Short notes

- **Finch [R].** A pastel pet that receives energy from every completed goal. Lesson: a check should visibly produce something somewhere else. Ours: the matching cell inks on the chart at the same moment.
- **Opal [S for the citation, R for the look].** ADA finalist 2025: "fun touches like haptics when unlocking 'gems' deliver a charming way to create focus", plus "widgets, Shortcuts, and easy-to-set-up customizations". From memory: a dark interface with glassy rendered gems and one headline focus score. Lesson: one collectible per milestone. Ours is the finished block and the finished sheet. Source: https://developer.apple.com/design/awards/2025/
- **Focus Friend [S].** Cultural Impact winner 2025: "this app's adorable cartoon Bean (who has some serious knitting skills)". The session makes an object. Source: https://developer.apple.com/app-store/app-store-awards-2025/
- **Habitify [R].** Habits grouped by time of day; swipe a row for done, skip or fail; "skip" is a legitimate state that does not break the streak.
- **Amie [R, possibly outdated; the product moved toward AI meeting notes around 2024–25].** A calendar with to-dos, known for a sound on every check and for dragging a to-do onto the calendar.
- **Sorted³ [R, thin].** Swipe across several rows to select them, then shift all their times together. Batch editing by gesture; not a priority for us.
- **Tangerine [S].** "a habit tracker, mood tracker, and journal all in one", built to "correlate users' habits with how they're feeling". Lesson for our 기분 row: keep it only if we show that correlation ("기분이 좋았던 날에는 건강 칸을 두 배 했어요"); otherwise it is a fourth app inside the app. Source: https://developer.apple.com/news/?id=m2dgav2r
- **Ladder [S].** Apple's caption for its habit screen: "Build better habits by keeping track of your streaks and filling in that pleasingly color-coded chart." That sentence describes our product. Source: https://developer.apple.com/news/?id=arg8zngm

### R17. Apple's own rules for the same surfaces [S]

These are the conventions every app above follows or deliberately bends. All read this session.

- **Tab bar.** "Use a tab bar to support navigation, not to provide actions." "Prefer filled symbols or icons for consistency with the platform." "Use single words whenever possible." "Don't disable or hide tab bar buttons." The bar "floats above content… on a Liquid Glass background", and with colourful content you should "prefer a monochromatic appearance for tab bars". — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/tab-bars.json
- **Titles and bars.** "Use a large title to help people stay oriented as they navigate and scroll"; it "transitions to a standard title as people begin scrolling". "Don't title windows with your app name." "keep the title under 15 characters". One primary action, "on the trailing side". "Reduce the use of toolbar backgrounds and tinted controls." — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/toolbars.json
- **Lists.** "Keep item text succinct so row content is comfortable to read." If items carry a lot, "list item titles only, letting people choose an item to reveal its content in a detail view." A list of options "highlights a row only briefly before adding an image — such as a checkmark". — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/lists-and-tables.json
- **Sheets.** "consider supporting the medium detent to allow progressive disclosure". "Include a grabber in a resizable sheet." "Support swiping to dismiss." "Display only one sheet at a time." Cancel on the leading edge, Done on the trailing edge; "always pair" Done with Cancel or Back. On iPad "prefer… page or form sheet". — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sheets.json
- **Buttons and toggles.** Hit region "at least 44x44 pt". "Always include a press state for a custom button." "Keep the number of prominent buttons to one or two per view." For a custom toggle, "Make sure the visual differences in a toggle's state are obvious… add or remove a color fill, show or hide the background shape, or change the inner details you display — like a checkmark… Avoid relying solely on different colors". — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/buttons.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/toggles.json
- **Colour and dark mode.** "Avoid using the same color to mean different things." "Avoid relying solely on color". "Avoid offering an app-specific appearance setting." In dark mode depth comes from "base and elevated" backgrounds, not shadow. Contrast "no lower than 4.5:1… strive for a contrast ratio of 7:1, especially in small text." — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/color.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/dark-mode.json
- **Layout.** "place the most important items near the top and leading side". Group with "negative space, container shapes, or separator lines". "Use progressive disclosure". "Differentiate controls from content." — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json
- **Motion.** "Aim for brevity and precision in feedback animations." "In apps, generally avoid adding motion to UI interactions that occur frequently." "Let people cancel motion… don't make people wait for an animation to complete". — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json
- **Springs (WWDC23).** Two parameters, duration and bounce. "A bounce of 0 feels like a smooth, gradual change. A small bounce, like around 15%, doesn't feel very bouncy yet, but… a little more brisk. And for larger bounce values like 30%, you do start to feel some noticeable bounciness." "be cautious about using values higher than around 0.4". "When you're not sure, use a spring with bounce 0." — https://developer.apple.com/videos/play/wwdc2023/10158/
- **Fluid interfaces (WWDC18).** "Everything needs to respond instantly." "the button should highlight immediately when I touch down on it." "having our UI respond during the gesture is critical". "It should have a consistent offscreen path as it enters and leaves." "we recommend starting with 100% damping, or no overshoot"; Music uses 80% for the one dismiss that has momentum. — https://developer.apple.com/videos/play/wwdc2018/803/
- **Symbols that draw (SF Symbols 7, iOS 26).** Draw On and Draw Off animate a symbol "along a path through a set of guide points… You might use the draw animation to convey progress… or to reinforce the meaning of a symbol". Apple now ships pen-stroke animation as a system behaviour, which makes our drawn tick platform-native in spirit. "Apply symbol animations judiciously." — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sf-symbols.json
- **Progress.** "Be as accurate as possible"; "Display a progress indicator in a consistent location." Activity rings: "Don't replicate or modify Activity rings for other purposes." So no ring-shaped triple meter for us; our meter must be our own shape. — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/progress-indicators.json , https://developer.apple.com/tutorials/data/design/human-interface-guidelines/activity-rings.json
- **Charts (WWDC22).** A title that states the takeaway ("Total Sales: 1,234 Pancakes") "grounds our chart with a concrete value". "around four horizontal grid lines". For bars, "fix the lower bound to 0". Touch targets stretched "to the full height of the chart". Colour "as an addition… not the only means". — https://developer.apple.com/videos/play/wwdc2022/110340/
- **Settings.** "Minimize the number of settings you offer." "prefer letting people modify task-specific options without going to your settings area." "Avoid using settings to ask for setup information you can get in other ways." — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/settings.json
- **Empty states.** The system's pattern is a label, a description and an optional action: "a network error, a list without items, a search that returns no results". Apple's example copy says what will appear, not what is missing: "New mails you receive will appear here." — https://developer.apple.com/tutorials/data/documentation/swiftui/contentunavailableview.json
- **Notifications.** Declare an interruption level honestly; "Time Sensitive… only for notifications that are relevant in the moment"; people must be able to "manage their notification settings within your app". — https://developer.apple.com/tutorials/data/design/human-interface-guidelines/managing-notifications.json

### R18. Apple developer stories with craft lessons the other memos did not use [S]

- **Dynamic Island spotlight.** SmartGym tried heart rate and calories in its Live Activity and cut them: "When someone's working out, they need to do what they need to do without realizing the app is there… I had to focus on staying out of the way." Flighty removes information the moment it stops being relevant. Wakeout's passive reminders dismiss themselves "like a ship in the night", while the one that matters is "a big state change on screen". — https://developer.apple.com/news/?id=mis6swzt . For our focus Live Activity: time left and the action's name; nothing else.
- **Halide.** One yellow highlight marks whatever is active; nothing else is coloured. "We need to have consistent gestures… without changing buttons around all the time." A real failure (a whole trip shot in the wrong mode) taught them that colour alone did not show which mode was on, and they redrew the button so each state has a distinct shape. — https://developer.apple.com/news/?id=x6bv1a36 . Our area filter and mode tabs rely on a colour square and an underline.
- **Pok Pok Playroom.** Sound rules for something heard many times a day: "calming sounds… something that could be heard a number of times without becoming fatiguing"; consistency ("The color blue is always a C"); real recorded objects ("That rolling sound is just me rolling over the edges of a soup can"). A three-colour palette as a constraint. "everything could jitter a little bit." — https://developer.apple.com/news/?id=5bcex7xf . This is the brief for our check sound: recorded pencil on paper, quiet, one meaning per sound.
- **CARROT Weather.** The Watch forced the redesign: "I couldn't really have long jokes on the Watch, so I had to focus on making a really good weather app… I started over from scratch." The result focuses on a few key data points and uses colour for the rest; personality is a dial people can turn off and "you'll still get the fun animations". — https://developer.apple.com/news/?id=kf623ldf . Design the widget first; let it tell us what Home's three facts are.
- **Notion.** "The app now launches at least twice as fast." "Performance is everything." — https://developer.apple.com/news/?id=tejokjnx
- **Headspace.** Removed the meditation, focus, movement and sleep tabs; Today gives "one-tap access" by time of day; "There's still simplicity at the surface. But there's an incredible depth of content underneath." — https://developer.apple.com/news/?id=fkfnhq8u
- **Knotwords.** "the only thing that's fun in a game is the process of getting better… What's the journey that people are going through and how can we make that journey fun?" — https://developer.apple.com/news/?id=ti9czxni . The article has nothing on grid legibility, which is what I hoped to find for the 9×9.

---

## 4. Patterns by area

App behaviour in this section is [R] unless a line says otherwise. "Ours" is [C].

### 4.1 Home or Today composition

- **Best practice.** The first screen is the list you act on. Above it: where you are in time (a title or date) and nothing else. Things: title, events, to-dos, evening group. Structured: date, week strip, timeline. Streaks: the six rings. Headspace Today: a short set of one-tap items by time of day [S].
- **Ours.** Seven modules of equal weight; the date is the hero; today's work starts around y = 470 pt (audit HL-02).
- **Gap.** We built a dashboard for an app whose value is one sheet and one list.

### 4.2 Rows and checkboxes

- **Shape.** Square with a small radius for a to-do (Things, Bear); circle for a task in Reminders, Todoist and Structured; ring for a habit (Streaks). Square is right for us: it is a cell.
- **Size.** Box about 20–24 pt, row at least 44 pt, hit region at least 44×44 pt [S for 44]. Ours is 26 pt in a 54 pt row, which is fine.
- **Title.** About 17 pt, regular or medium. Ours is 16 pt semibold.
- **Metadata.** One quiet line or a couple of 12 pt glyphs. Ours: area square, kind text, D-day and a seven-glyph strip.
- **Completion.** Fill and tick in roughly 0.3–0.5 s; the title greys; the row waits about a second and then leaves; undo is offered. Some apps add a sound (Clear, Amie, TickTick, Todoist optionally). Nobody strikes through and leaves a crossed-out list as the default view.
- **Swipe.** One action per side at most (Things: schedule or select; Habitify: done, skip, fail).

### 4.3 Progress and streaks

- **One shape per level, reused.** Things' pie on every project; Streaks' ring; Daylio's pixel; Timepage's heat dot; Gentler Streak's band.
- **Short windows beat lifetime counters.** Daylio's last five days; Gentler Streak's path; Structured's week strip. Streaks itself is the exception and it is the whole product.
- **A sentence first.** Gentler Streak [S]; WWDC22 on chart titles [S].
- **Ours.** Seven visual systems for progress (section 2). The chart tint ("자주 한 칸일수록 짙어져요") is the best of them and is on the fourth tab.

### 4.4 Week views

- **Strip of seven with status per day**, tap to move the list, swipe for other weeks, pull down for the month (Structured, Todoist Upcoming, Fantastical's DayTicker).
- **One strip per screen**, not one per row (TickTick's habit header).
- **Ours.** A 正 strip on Home that does not navigate, and a seven-glyph strip on every Today row with a column legend above the list.

### 4.5 Headers and large titles

- **One anatomy across tabs**; a large title that collapses on scroll [S]; the title is the content's name, never the app's name [S].
- **A date as the title** on day screens (Structured, Fantastical), and date numerals as section markers in lists (Things Upcoming, Day One, Timepage).
- **Ours.** Four anatomies; the Chart tab's title is "만다라트", the app name (audit HL-08); the 56 pt numeral is spent on Home's date.

### 4.6 Quick add

- **Always one tap away, never a destination.** A floating button (Things, Structured, Todoist) that knows where you are.
- **Type first, structure appears.** Todoist and Fantastical parse; Structured suggests an icon; Streaks suggests from "probably 500 icons" [S].
- **Placement by gesture.** Things' draggable button.
- **Ours.** A tab in the middle of the bar, drawn as a dashed box, lighter than its neighbours (audit HL-22).

### 4.7 Empty states

- **The object, faint, plus at most one sentence and one action.** Things shows the list's glyph. Todoist rewards with an illustration. Structured pre-fills two anchors so the day is never blank. Apple's pattern: label, description, action [S].
- **Ours.** Stats shows charts that look broken with little data (audit HL-03); first-run Home has a clear five-step guide (a strength).

### 4.8 Settings

- **Short.** Things' settings fit on about one screen. HIG: "Minimize the number of settings you offer" and no app-specific appearance switch [S].
- **Options that belong to a screen live on that screen** [S].
- **Ours.** About 2,600 pt, a third of it appearance (five papers, corner style, four paper patterns, accent colour, language) (audit HL-13). The references sell one look with conviction.

### 4.9 Colour and type

- **Neutral interface, colour for identity** (Things), **or one colour for everything** (Streaks, Timepage). Both are decisive. Ours is eight muted hues plus gold at similar lightness, which reads as undecided.
- **Two weights per screen.** The list's title is bold; the user's words are regular. Bear and iA put the identity into the typeface itself.
- **System type is fine.** Things, Streaks, Todoist and Fantastical use the system face or something close. Pretendard is the right equivalent for Korean; the gain is in weights and sizes, not in a new font.

### 4.10 Depth and shadow

- **Flat lists; one lifted object** (Things' open card, Craft's pages); floating add button; system materials for bars.
- **Dark mode expresses depth by a lighter surface**, not a shadow [S].
- **Ours.** No elevation anywhere, so an open editor is a bottom sheet with no visible link to the cell it edits.

### 4.11 Signature details

| App | The detail people remember | Confidence |
|---|---|---|
| Things 3 | To-do opens in place as a card; Magic Plus can be dragged to a position | R |
| Streaks | Hold until the ring closes; only six | R; six is S |
| (Not Boring) Habits | The checkbox as an event: hold, particles, sound, haptics | S |
| Structured | The day as one coloured line; a day that is never blank | R |
| Tiimo | Time as soft coloured shapes | S for "timeline of soothing colors", R for the rest |
| Clear | Notes that climb as you clear the list | R |
| Fantastical | A sentence that sorts itself into an event | R |
| Todoist | Type "tomorrow 4pm p1" and it is filed | R |
| Timepage | The month as a heat map of dots | R |
| Daylio | Year in Pixels | R |
| Gentler Streak | A range instead of a target; a mascot that reads the data aloud | S for the tone and mascot, R for the path |
| Day One | Dates down the gutter; On This Day | R |
| Opal | Gems with haptics | S |
| **만다라트** | **Nothing yet.** Candidates: the 正 tally, the cell inking on the sheet, the centre block copying itself outward. | C |

---

## 5. The 15 patterns most worth adopting

Each is [P]. "From" names the reference; "Where" names our screen; specs are starting points to tune on a device.

**1. Open on today's work.** From: Things, Structured, Streaks, Headspace. Where: 홈 (and the tab structure).
- Option A (safe): 홈 becomes a real Today. Title "10월 14일 수요일" with eyebrow "42주 · 78일 남음"; one line for the goal; then today's actions, first row within about 200 pt of the top; the 正 week strip under the list; a one-row doorway to the chart. 이번 주 중점 becomes pinned rows inside the list. 8개 영역 moves to the chart tab.
- Option B (distinctive): today's picks are drawn as a 3×3 block, up to eight actions around a centre cell holding the date. Tap a cell to check it; the block inks in through the day; a full block is the closed day. Below it, the same items as a plain list for long titles and accessibility. This is the Streaks grid built from our own object.
- Either way, test three destinations (오늘, 만다라트, 통계) with a separate add control, since 홈 and 오늘 currently show the same list twice.
- Also: App Store screenshot 1 and the medium widget should be this screen.

**2. The calm row.** From: Things, Reminders, Todoist. Where: 오늘 list, Home list, area detail.
- Title 17 pt, weight 500, one line with tail truncation (two lines only at larger Dynamic Type sizes). Under it one caption: area name plus one fact ("건강 · 이번 주 1/3"). Right side: nothing, or one D-day.
- The seven-glyph week strip leaves the row and appears in the action sheet and under pattern 10's shared strip.
- Section heads drop from 18 pt bold to a 13 pt label; at most one `'800'` element per screen.
- Remove the dot field behind lists; keep the rule.

**3. A layered check.** From: (Not Boring) Habits, Things, Clear, Pok Pok. Where: every check row; `Check.tsx`.
- Touch down: box scales to 0.94 within 80 ms (press state [S]).
- Touch up: fill 120 ms, stroke 170 ms after 60 ms (as now), `check` haptic timed to the end of the stroke (about 230 ms).
- Sound: a recorded pencil tick, about 80 ms, quiet, off with the silent switch and with a setting. Five pitches in a rising sequence, one per stroke of the day's 正; the sixth check starts a new character and returns to the first pitch. This joins Clear's climbing notes to our tally.
- The title's ink settles to 55% over 220 ms; no strike-through in the default list.
- Elsewhere: the matching cell inks in on the mini chart or today block, and the day's 正 gains a stroke, both within the same 300 ms.
- The row holds for 1.2 s, then moves to the done group on a spring with bounce 0 [S]. Uncheck reverses without sound.
- Everything must run on the UI thread; the stroke currently animates in JS [C].

**4. Shape = level.** From: Things (square and pie), Activity rings' exclusivity. Where: 홈 area ledger, 오늘 filters, Stats, widgets, app icon.
- Action = one square (the check). Area = a small 3×3 glyph, about 18–20 pt, whose eight outer cells fill as its actions are achieved (our "pie"). Goal = the 9×9.
- Use the area glyph wherever an area is named: filter tabs, the eight-area ledger, the widget, Stats rows. It replaces the plain colour square and the "n/8" text in most places, and it carries meaning without colour (position and fill), which the tinted widget mode and Differentiate Without Color need.
- App icon: a 3×3 of filled squares is this same glyph.

**5. The chart is the meter.** From: Daylio's Year in Pixels, Timepage's heat map, Tiimo's shapes. Where: 통계, year review, Home doorway, App Store screenshots.
- Stats leads with the tinted 9×9 under a one-sentence finding. Bars and dot plots move below or go.
- Year review: one cell per day, 7 rows by 53 columns, in the chart's cell style, exportable with the poster.
- Remove the 13-box tally and the 3 pt progress bar from 오늘; the count is text beside the title.
- The Home thumbnail stops trying to be a legible 81-cell chart at 132 pt. It becomes nine block glyphs (pattern 4).

**6. Open in place, with the one allowed elevation.** From: Things, Craft. Where: zoomed 3×3 → cell editor.
- Tapping a cell in the zoomed block grows that cell into the editor from its own frame: spring about 0.38 s, bounce 0 [S]; the other eight cells dim to about 35%.
- The card is paper white with a 2 px ink frame and a single soft shadow (suggest y 8, blur 24, ink at 10–12%). In dark mode use a lighter "elevated" surface instead of a shadow [S].
- It closes along the same path it opened [S]. Nothing else in the app gets a shadow.
- On iPad the same motion targets the right-hand page.

**7. Hold to ink the big moments.** From: Streaks, (Not Boring) Habits. Where: "이 칸 달성하기" in the action sheet and the zoomed 3×3; closing a block at 8/8.
- Press and hold about 0.6 s. The cell's frame draws clockwise from the top-left from the first frame of the press [S: feedback during the gesture]. Light haptic ticks at a quarter, half and three quarters; `success` at the end; the cell floods with its area colour.
- Releasing early retracts the frame in 140 ms with no penalty.
- Provide a plain button for VoiceOver, Switch Control and Reduce Motion.
- The daily check stays a tap. HIG: avoid extra motion on frequent interactions [S].

**8. A floating add, out of the tab bar.** From: Things' Magic Plus, Structured, Todoist; HIG. Where: all four tabs; `Root.tsx`.
- 담기 leaves the tab bar. The bar holds places only.
- One add control floats above the bar at the trailing side: an ink square with a paper-coloured plus, about 52 pt, the same vocabulary as the chart's centre cell (audit HL-22 proposes the same mark).
- It is context-aware: on 오늘 it adds to today; on a zoomed block it adds to that block's first empty cell.
- Later: drag it onto a block or cell to add exactly there. Ship tap first.
- Check what Expo SDK 56 offers for a native tab bar with a separate accessory before designing the final geometry.

**9. Parse as you type.** From: Todoist, Fantastical, Streaks' suggestions. Where: 담기 sheet, cell editor.
- One text line attached to the keyboard, medium detent [S].
- Recognise a small, fixed vocabulary in ko, ja and en: frequency ("매일", "평일", "주 3회", "월수금", "毎日", "週3回", "every day", "3x a week"), amount ("30분", "2L", "10쪽") and an area name.
- Show the parse: the recognised words get a highlighter stroke in the area colour (on-concept, and not a pill chip), and the matching field below fills in with a short move. A tap on the highlight undoes it.
- No model needed. If nothing is recognised, it is a plain one-off.

**10. One week strip that reports and navigates.** From: Structured, Fantastical's DayTicker, TickTick's shared header. Where: top of 오늘 (and 홈 if it survives).
- Seven columns, each at least 44 pt wide: weekday letter, date, and that day's 正.
- Today is outlined in 1.5 px ink; the selected day is filled paper-dark. Tapping a day shows that day's list (past days read-only with "어제도 했어요" available). Swipe sideways for other weeks.
- Pull the strip down to open the 10-week lattice in place; pull up to close.
- Per-row week glyphs and the weekday legend above the list go away.

**11. One header anatomy; numerals as markers.** From: HIG large titles, Things Upcoming, Day One, Timepage. Where: all tabs; weekly review history, 회고 log, archive.
- Every tab: a reserved 16 pt eyebrow, a large title that collapses to an inline title on scroll, one trailing action. Same top position on all tabs (audit HL-05).
- Titles: the date on 오늘, the goal on 만다라트 (not the app name), "통계" on Stats.
- The 56 pt numeral stops being Home decoration. Use large date numerals where they order a list: one per day in the 회고 log, one per week in review history, one per year on the archive shelf.

**12. One colour, one job.** From: Things, Halide, HIG. Where: `src/theme/palette.ts` and every screen.
- Ink: text and the frame. Area colours: identity of an area, only on cells, glyphs and fills. One signal colour: today and now (the stationery memo argues for a hotter one than the present gold). Nothing else is coloured.
- The primary button is ink, not the signal colour. Weekday pickers are ink, not the area colour (audit HL-10).
- Audit each screen: a hue that means two things on one screen is a bug.
- Every colour-coded state also has a shape or text code [S].

**13. "Enough", and a gentle streak.** From: Gentler Streak, Sunsama, Daylio, Habitify. Where: end of 오늘, Home, Stats streak, notifications.
- When today's picks are done, the list folds into one closing line with the day's 正 and one sentence ("오늘은 여기까지예요"). The "실천에서 더 고르기" link moves into the add control; the app does not ask for more.
- Streak shown as a window first ("최근 7일 중 5일"), lifetime count second.
- A planned rest day is its own mark and does not break anything. A missed day is an empty box, never red.
- Stats numbers each get one sentence comparing only with the user's own past.
- Reminders at the Active or Passive interruption level, not Time Sensitive (Apple reserves that for things "relevant in the moment" [S]), and off until the user chooses a time.

**14. Rituals as guided steps.** From: Sunsama, Bears Gratitude (via the sibling memo), Headspace. Where: 주간 회고, 연말 마감, onboarding.
- One question per screen, three to four screens, about a minute. Weekly: (1) what you did, shown as the week's inked cells with one sentence; (2) pick one to three cells for next week, tapped directly on the chart; (3) one line, optional; (4) close.
- Progress as four small squares, not a bar. Back and close always present; multi-step sheet buttons as the HIG specifies [S].
- Year close shows the finished sheet as the hero of the last step (audit HL-14).
- Onboarding is the same pattern with one job: type the centre goal into the real centre cell.

**15. Empty states that show the object.** From: Things, Structured, ContentUnavailableView. Where: empty 오늘, new-user 통계, empty block, search.
- Empty 오늘: a faint 3×3 with the user's goal in the centre, one sentence that says what will appear ("고른 실천이 여기에 놓여요"), one ink button.
- New-user Stats: the lattice drawn as empty outlines so it reads as a calendar from day one (audit HL-03), with a sentence instead of a broken chart.
- An empty cell in a zoomed block shows only a small plus in the corner. No placeholder prose in 64 cells.
- The same voice in the widget placeholder and the first release notes.

**Not in the 15 but worth doing: shorten Settings.** From: Things, HIG. Offer one paper and one pattern well instead of twenty combinations, or show the options as one swatch row each (audit HL-13). Remove any in-app light or dark switch if one exists [S]. Language follows the system.

---

## 6. Pitfalls

1. **Copying a look instead of a behaviour.** Things' white and blue, Structured's pastel line and Streaks' orange rings are owned. What transfers is behaviour: open in place, hold to close, a closed set, one meaning per colour.
2. **Adding the hero interaction to everything.** HIG: "generally avoid adding motion to UI interactions that occur frequently" [S]. The daily check must stay under about 300 ms and never block the next tap. The long, loud versions belong to cells, blocks and the sheet.
3. **Sound that tires.** Pok Pok's rule is "heard a number of times without becoming fatiguing" [S]. One recorded, quiet sound, a clear off switch, silence when the phone is silent. No synthesised chimes.
4. **A dashboard by another name.** If 홈 becomes Today and then regains a goal card, a streak card and an area card, we are back where we started. Three facts at most: the date, the next actions, how far along.
5. **Feature parity with TickTick.** Three Today modes, mood, mindset rating, journal, focus timer, board. Each one costs the others polish. (Not Boring): "Big teams will always have more features than we do… But design is difficult to copy" [S].
6. **Gesture-only anything.** Clear's lesson. Pinch, drag-to-place and hold must each have a visible, tappable equivalent, for discoverability and for VoiceOver.
7. **A custom tab bar with an action in it.** Against the HIG [S] and the clearest non-native tell on iOS 26. Daylio and many habit apps do it; the premium tier does not.
8. **Lifting the shadow ban everywhere.** One elevation, for the open cell. Cards with shadows as list containers would bring back the generic look the ban was written to prevent, and Things does not use them either.
9. **Streak pressure.** Lifetime counters and broken chains work against the tone Apple rewards (Gentler Streak) and against a year-long product where missed weeks are certain.
10. **Mood and journaling without a payoff.** Tangerine's point: the value is the correlation [S]. If we do not show one, cut the inputs.
11. **Trusting this memo's [R] details as specifications.** Sizes, timings and colours of other apps here are recollections. Measure on a device before quoting them in a design review.
12. **Treating Apple's stories as design documentation.** Most contain two or three usable sentences; the Things, Tiimo and Structured stories contain almost none about UI.
13. **Parsing that surprises.** Todoist-style parsing fails badly when it guesses wrong in a second language. Keep the vocabulary tiny, show the parse, and make undoing it one tap.
14. **Performance as an afterthought.** A JS-driven stroke plus a list re-sort plus a chart update on one tap can drop frames on older phones. If it stutters, the layered check is worse than the plain one.

---

## 7. What I could not verify

- **Everything marked [R].** That is nearly all of the description of Things 3, Structured, Tiimo, Streaks' interface, Todoist, TickTick, Timepage, Fantastical's interface, Sunsama, Daylio, Gentler Streak's Activity Path, Day One, Bear, Craft, Clear, Finch, Habitify, Amie and Sorted. No screenshot, product page, App Store listing, review or teardown was read for any of them.
- **Specific numbers for other apps** (Things' checkbox at about 20 pt, title at about 17 pt, completion at 0.3–0.5 s, Streaks' hold time, Daylio's grid dimensions). These are estimates from memory.
- **Current state in late 2026.** Timepage (sources are 2015–2019), Clear 2, Amie (pivot), Things' iOS 26 refresh, Streaks' current task limit, Todoist's current tab layout, Structured's tab names and default accent, Tiimo's current feature names.
- **Structured details I am less sure of**: the "Rise and Shine" and "Wind Down" default tasks, the wording of the free-time lines, and whether the connector line blends between task colours.
- **Bear's to-do progress mark in the note list**, and Craft as Mac App of the Year 2021 (recalled; only its 2021 ADA finalist listing was read).
- **Whether any of these apps publishes its design rationale.** Cultured Code's blog, Andy Works' essays, Doist's design posts, Bear's Bear 2 posts and Tiimo's resource hub probably do; none could be opened.
- **Korean and Japanese sources.** Not searched at all: local reviews of these apps, Korean planner apps (for example 투두메이트, 마이루틴, 열품타) and Japanese ones, and how local users describe "premium" in this category. This is a real gap for a ko and ja first launch.
- **User reviews.** No App Store reviews were read for any reference app, so there is no evidence here about what users praise or resent.
- **Expo SDK 56 feasibility** of a native tab bar with a floating accessory, native sheet detents, shared-element style transitions, UI-thread SVG stroke animation and short audio playback. Not checked against the versioned Expo docs, which the repository requires before any code is written.
- **The 24me developer spotlight** (a planner app) could not be read: the URL returned Apple's general news list.
- **Hosts a follow-up pass would need allowed** in this session's network settings: `culturedcode.com`, `structured.app`, `www.tiimoapp.com`, `crunchybagel.com`, `notbor.ing`, `www.andy.works`, `todoist.com`, `doist.com`, `ticktick.com`, `www.sunsama.com`, `flexibits.com`, `daylio.net`, `gentler.app`, `bear.app`, `blog.bear.app`, `dayoneapp.com`, `www.craft.do`, `apps.apple.com`, `www.macstories.net`, `thesweetsetup.com`. A new search budget is also needed; this run had none left.

---

## 8. Sources read this session

All on `developer.apple.com`.

Stories about apps in scope:

- Things, "How Things came to server-side Swift": https://developer.apple.com/articles/things/
- Tiimo, "Way more with less code": https://developer.apple.com/articles/tiimo/
- Structured's founder, "Start small, code big": https://developer.apple.com/articles/start-small-code-big/
- Streaks, developer spotlight (2021): https://developer.apple.com/news/?id=67dti69d
- (Not Boring) Habits, Behind the Design (2022): https://developer.apple.com/news/?id=9ab1g4r3
- Gentler Streak, Behind the Design (2024): https://developer.apple.com/news/?id=3m0ht22s
- Fantastical on Apple Vision Pro (2024): https://developer.apple.com/news/?id=you1yc2h
- Headspace, Behind the Design (2023): https://developer.apple.com/news/?id=fkfnhq8u
- Tangerine, developer spotlight (2021): https://developer.apple.com/news/?id=m2dgav2r
- Ladder, developer spotlight (2021): https://developer.apple.com/news/?id=arg8zngm

Craft stories from adjacent apps:

- Spotlight on the Dynamic Island (2022): https://developer.apple.com/news/?id=mis6swzt
- Halide Mark II, Behind the Design (2022): https://developer.apple.com/news/?id=x6bv1a36
- Pok Pok Playroom, Behind the Design (2021): https://developer.apple.com/news/?id=5bcex7xf
- CARROT Weather (2021): https://developer.apple.com/news/?id=kf623ldf
- Notion and SwiftUI (2026): https://developer.apple.com/news/?id=tejokjnx
- Knotwords (2024): https://developer.apple.com/news/?id=ti9czxni
- Developer stories index: https://developer.apple.com/developer-stories/

Awards pages:

- Apple Design Awards 2026: https://developer.apple.com/design/awards/
- 2025: https://developer.apple.com/design/awards/2025/
- 2024: https://developer.apple.com/design/awards/2024/
- 2022: https://developer.apple.com/design/awards/2022/
- 2021: https://developer.apple.com/design/awards/2021/
- App Store Awards 2025: https://developer.apple.com/app-store/app-store-awards-2025/

HIG data and documentation:

- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/lists-and-tables.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/tab-bars.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sheets.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/toolbars.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/buttons.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/toggles.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/color.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/dark-mode.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/progress-indicators.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/activity-rings.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/settings.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sf-symbols.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/managing-notifications.json
- https://developer.apple.com/tutorials/data/documentation/swiftui/contentunavailableview.json

WWDC transcripts:

- WWDC23, Animate with springs: https://developer.apple.com/videos/play/wwdc2023/10158/
- WWDC18, Designing Fluid Interfaces: https://developer.apple.com/videos/play/wwdc2018/803/
- WWDC22, Design an effective chart: https://developer.apple.com/videos/play/wwdc2022/110340/

Tried and failed (blocked by the session's network allowlist): `culturedcode.com`, `structured.app`, `www.andy.works`, `apps.apple.com`. Web search: not available (budget exhausted).
