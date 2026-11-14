# Direction A, round 2: complete it and perfect it

The owner saw Home and the chart of the three directions and chose **A, 인쇄된 한 장**, with one instruction: "A를 더 완벽하게 만들어봐" (make A more perfect). Directions B and C are closed. Their folders stay as a source of ideas.

Round 1 gave A a real system: `docs/design/mockups/a/direction.md` (the two-ink rule, tokens, type roles, geometry), `tokens.css`, `shared.js`, a kit sheet, and seven screens. Round 2 has two jobs:

1. **Complete it.** Draw the rest of the app in A, so no screen is left to guess when the app is built.
2. **Perfect it.** Critique and fix in rounds until critics find nothing a senior designer would refuse to sign.

Read `docs/design/brief.md` first (the audit summary, the shared skeleton S1–S8, how to build and render). Everything there still holds. Then read `docs/design/mockups/a/direction.md` in full and open `docs/design/mockups/a/_kit.png`. This file adds to them.

## The bar

"Would Apple feature this, and would a Korean user in their twenties or thirties show it to a friend?" The audits' sentence about the old design was "a careful removal of bad taste, not yet an identity". A's identity is the two-ink rule: what the printer made is pale, cool and small; what the owner wrote is dark, warm and large. A screen that does not show that rule at a glance is not finished.

Three things to protect while polishing:
- **Quiet.** Stationery is calm. Do not add decoration to make a screen "richer". Fix hierarchy, rhythm and alignment instead.
- **One hand.** Every screen must look drawn by the same person from the same kit. New parts are built from the tokens and from `shared.js`, never restyled locally.
- **The owner's words win.** On every screen the largest, darkest thing is something the owner wrote or did, never a label.

## Screens to add

Same rules as round 1: 390×844, no status bar, demo data from `/tools/design-mockups/data.json` (invent nothing that contradicts it; where a screen needs data the file lacks, such as a reminder time, use plain realistic values and list them in your report). Each screen names the audit findings it must answer; read those findings before drawing (grep the id in `docs/design/audit/`). Look at the current app's version of the screen first (paths below are in `/tmp/web-smoke` unless they start with `/tmp/design-shots`).

| File | Screen | Must show | Findings to answer | Current app |
|---|---|---|---|---|
| `stats.html` | 통계 | One sentence that interprets the week above its chart; the chart filling in as the page's best picture; streak shown kindly; sections without data collapsed to a line | HL-03, HL-07, FI-16, CD-13, TY-09 | `ko-tab-stats.png`, `/tmp/design-shots/light-tall-tab-stats.png` |
| `onboarding.html` | First run, typing the goal (keyboard up; draw a plain iOS keyboard as a grey block of the right height, 336pt) | The centre cell of a 3×3 in real colours is the input; the eight default areas around it in their dyes; one heading; one button | FI-01, M1 (first-impression), HL-15, TY-12 | `ko-xi-onboarding.png` |
| `editor.html` | 칸 편집 sheet for the habit "11시 취침" (건강) | An inset sheet over the dimmed block; text field first; exactly three kinds of selection control (check box, choice row, segment), each with one job; the area's dye as the only colour; one ink primary button | CI-02, HL-10, FI-17, CI-07 | `ko-xa-editor-habit.png` |
| `sheet.html` | 실천 시트 for "주 3회 운동" | The 3×3 locator; today's check on the leading side; this week as a plain statement plus seven day boxes with weekday letters; two link rows with chevrons; memo lines | HL-16, CI-12, CI-13, M3 (components) | `/tmp/design-shots/light-action-sheet.png` |
| `add.html` | 담기 sheet (keyboard up) | One field on the keyboard; the area picker as eight dye marks with names; recently added lines appear above the field as written lines | CI-01, M3 (motion-feel), M-13 | `/tmp/design-shots/light-quick-add.png` |
| `focus.html` | 25분 집중, 12:41 left, for "이력서 갱신" | The 5×5 minute grid as the hero (about 300pt), the current minute filling; the task name above it; figures in MaruBuri; pause and finish as real buttons | M-11, M5 (motion-feel) | `/tmp/design-shots/light-focus-timer.png` |
| `dayclose.html` | 오늘 with all ten done and the day closed | The finished list folded to a closing line; the ledger double rule; the day's mark; mood and one line as one small module; "enough for today", no nagging | HL-11, M-09, planner-apps takeaway 13 | `ko-xh-closed.png`, `ko-xh-closed-bottom.png`, `ko-xd-list-bottom.png` |
| `settings.html` | 설정 (top of the page) | A pinned header with back; choices as choice rows, not check boxes; appearance options as swatches; the order 핵심 목표, 알림, iCloud와 백업, 보기, 언어, 정보 | HL-13, CI-02, CI-10, M1 (motion-feel), CD-01 | `/tmp/design-shots/light-settings.png`, `/tmp/design-shots/light-tall-settings.png` |
| `year.html` | 한 해 돌아보기 for an archived 2025 | "표가 채워진 모습" as four thumbnails that really differ; four stat tiles at one size; the sheet as the page, not a box | CH-03 (year frames), CH-17, TY-10, HL-14 | `ko-year-review-390.png`, `ko-year-sheet.png` |
| `widgets.html` | A phone Home Screen and Lock Screen with our widgets (canvas 780×844, two phones side by side, plain grey wallpaper) | Small widget (the L1 chart and 오늘 1/10), medium widget (three rows with check boxes), lock-screen rectangular and circular in opaque greys with no hue, the focus Live Activity | TY-20, M4 (components), grid-dataviz "Home thumbnail" | none (never captured) |
| `store.html` | App Store screenshots 1 to 3 (canvas 1290×932: three 6.9" frames at 430×932 each, scaled) | Posters, not captures: a two-line headline in MaruBuri at two to three times the caption size, the screen cropped to its best part, different composition per frame; frame 1 shows the idea (the sheet filling in), not the dense grid | FI-05, store-icon-onboarding memo | `store/screenshots/ko/APP_IPHONE_67/` in the repository |
| `share.html` | The share image, 4:5 (canvas 540×675) | The sheet at near full width, the goal as title, the folio, the L0 mark and wordmark; legible at feed size | CH-12, FI-09 | `ko-share-poster.png` |

## Ideas from B and C worth trying in A's own language

Look at `docs/design/mockups/b/home.png`, `b/chart.png`, `c/home.png`, `c/chart.png`. Take an idea only if it survives the two-ink rule.

- From B: an area glyph beside the area's name wherever an area is named in a row (identity that does not rest on colour alone, CI-05). The app already has eight hand-drawn glyphs in `src/components/AreaIcons.tsx`; redraw them in A's line weight.
- From B: on the chart tab, the space under the sheet holds the eight areas with n/8 in chart position (a 3×3 of names and counts round the L0 mark), instead of blank paper.
- From C: "6개 더 있어요 ›" under the Home list, so the list ends with a door.
- From C: the header of the chart tab carries the two figures (오늘 1/10, 달성 24/64) under the sheet, set large.
- From the type-and-colour memo (`docs/design/refs/type-color.md`): two pairs of area colours are too close (비색 and 오디 under deuteranopia; 쪽빛 and 비색, 황토 and 주홍 for everyone). A kept the current hues. Re-derive the eight within A's limits (cream text on a dye at 4.6:1 or better, ink on a wash at 9:1 or better) so that chart neighbours are distinct, using the memo's "A 미색 고침" or "B 활판" set as the start. Show the old and new sets side by side in `_kit.html` so the owner can see what changed.

## Open questions from round 1 to settle

1. **The seal.** Round 1 gave vermilion a third job: a solid mark for a finished whole (an area at 8/8, a closed day, 64/64). The owner banned "stamps of any kind" earlier, meaning the cute 참 잘했어요 stamp. Draw the finished states so they work **without** a seal (ledger double rule, the name cell's tick, a line of text) and, separately, show the small vermilion seal as an option in `_kit.html`, labelled as an option. The owner decides.
2. **The tick is writing ink**, not vermilion. Round 1's reasoning is sound (34 red ticks would drown "today"). Keep it.
3. **MaruBuri** adds about 2 MB and must be confirmed as OFL on Naver's page before it ships. Design with it; note every place it is used so the cost is visible.

## Art director's notes on round 1

Seen in `a/home.png`, `a/chart.png` and `_kit.png` as they stood when round 2 began. Check each against the current files; some may already be fixed.

1. **Home, hero.** The thumbnail and the two fields are the right idea. Check that the fields' rules register exactly with the thumbnail's top and bottom, that "오늘 1/10" reads before "달성 24/64칸", and that the goal never orphans a syllable when it is longer than the demo's five syllables (try "올해는 몸과 마음을 단단하게 만드는 한 해").
2. **Home, bottom.** The 8개 영역 ledger is cut by the floating bar in the first view. Either end the first view cleanly at the week strip or let the ledger start lower; a half-covered heading looks like an accident.
3. **Chart tab.** About 250pt under "다음 할 일" is blank. Use it (see the idea from B above) or bring the next-step row and the figures into one composed block.
4. **Active tab.** A filled glyph and a bolder label are subtle on a paper capsule. Make the active place unmistakable in A's language (for example an ink underline under the glyph, as a printed index mark), without a pill.
5. **Ghost 正.** The printed ghost of 正 behind the written strokes is this direction's best small idea. Make sure the written strokes sit exactly on the ghost and that the ghost is visible but below 2:1.
6. **Sunday in vermilion** is right for a Korean calendar. Saturday may stay print ink.
7. **Check box.** The done state (wash fill, ink tick that overshoots) is right. The empty box edge must be 3:1 or better on cream.
8. **The 담기 capsule** is the only heavy object on the page. Good. Keep everything else off that weight.

## How round 2 runs

1. Builders draw the new screens from the kit. They do not edit `tokens.css`, `shared.js` or `direction.md`; a part the kit lacks goes in a file of the builder's own and is listed in the report.
2. Critics review every screen through four lenses (craft; concept and user; rules and buildability; one hand across all screens). A finishing designer then fixes, moving new shared parts into the kit.
3. Steps 2 repeats until a round finds no P0 or P1, or three rounds have run.
4. The last pass updates `direction.md` and `_kit.html` so they are the specification the app will be built from.
