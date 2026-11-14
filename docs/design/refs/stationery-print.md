# Stationery, print and "paper done right" in software

Reference research for the 만다라트 design upgrade. Written 2026-11-14.

## How to read this memo

Every claim carries one of four tags, because the research conditions were poor and the difference matters.

- **[S]** read in a web-search result this session; the link is given. These are search summaries and snippets, not full pages.
- **[R]** my recall from general knowledge; not verified this session.
- **[C]** my own calculation (colour maths, mm-to-pt conversion). The script is not kept; the numbers are reproducible from the hex values.
- **[O]** my own observation of this repo: `store/screenshots/ko/APP_IPHONE_67/*.png` and `src/theme/*`, `src/components/Check.tsx`, `src/components/PaperDots.tsx`.

Two limits shaped the result. `WebFetch` could not resolve any host in this session (1101.com, wikipedia.org, jetpens.com and thejournalshop.com all failed with `ENOTFOUND`), so no page was read in full. And the shared web-search budget ran out after about 45 queries (the limit is shared with the other research agents in this run), before I reached Traveler's Notebook, Müller-Brockmann, ledger conventions, Good Sudoku, NYT Games, Puzzmo, GoodNotes, Day One and Kinopio. MUJI got one search with a thin result. Those appear as [R] or in the last section.

## Summary

The paper direction is the right one for this product. A Mandal-Art is a printed form, and the best planners in the world are Japanese paper products with twenty years of refinement behind them. But today's build takes the look of paper (cream, dots, rules) and misses most of what makes real stationery feel made. Five findings carry the memo.

1. **Printed stationery is quiet where we are loud.** On a Hobonichi or Stalogy page the printed furniture is tiny and pale, and the owner's writing is the loudest thing. Our screens invert this: the form labels ("이번 주 중점", "오늘 할 일", "8개 영역") are 18pt Bold black, heavier than the user's own goals at 16pt [O].
2. **Real grids are printed in a coloured ink, not in a darker shade of the paper.** MD Paper uses pale blue on cream, Rhodia violet on white, Stalogy light grey, Hobonichi a different soft colour each month [S]. Ours is brown at 11% on cream, plus brown rules, brown-black text and a gold accent [O]. That is one hue family from top to bottom, which is the recipe for "dull beige".
3. **Our default palette is, numerically, the Claude interface.** `#FBF9F4` paper, `#2B2620` ink and an earthy accent sit within a rounding error of Anthropic's brand colours `#FAF9F5`, `#141413`, `#D97757` (OKLCH lightness 0.982 for both papers, chroma 0.0069 against 0.0054) [C]. Gradients and emoji were banned to avoid an "AI-made" look, but the colour scheme converged on the most recognisable AI product cream of 2025–26.
4. **There is no signal colour.** Gold `#B0883C` reaches only 3.1:1 on the paper and sits 11° of hue from the 황토 area colour `#9C6A2A` at the same chroma [C]. Stationery and the best "paper" software keep one hot colour for one job: red Sundays and seals, Rhodia orange, Bear's red, Teenage Engineering's orange, Claude's clay.
5. **Premium paper in software comes from constraints and behaviour, not texture.** A module everything registers to, three pixel-exact rule weights, two inks with separate jobs, marks that behave like pen and stamp, and page furniture that tells you where you are in the year. None of that needs grain, shadows or page curls.

The fifteen moves near the end turn these into concrete changes. The three with the most leverage are: redraw the 9×9 chart as a printed form instead of a filled heat map (move 10), split "print ink" from "writing ink" and shrink the printed labels (move 3), and replace gold with one vermilion signal while giving the calendar its red Sundays (moves 5 and 6).

## What is weak today

This is the honest reading of the store screenshots and theme files, so the references below have something to attach to [O].

| Where | What I see | Why it reads as "app", not "paper" |
|---|---|---|
| All screens | One family (Pretendard), titles at weight 800 rendered Bold, section titles 18pt Bold | No typographic voice. Printed forms use small quiet labels; the weight belongs to the owner's words |
| All screens | Dots `rgba(60,45,20,0.11)`, rules `rgba(110,85,40,0.12)`, ink `#2B2620`, gold `#B0883C` | Everything is hue 70–90°. Nothing looks printed in a second ink |
| All screens | Dot pitch 18pt, rows 54pt (3 dots), but line-heights 60/32/24/21/22/18/14 | Rows register to the dots, text cannot. The grid works as wallpaper |
| Chart | Cells look white (`surface #FFFFFF`) on `#FBF9F4`; done cells are solid area colour with white text | A white table pasted on cream (contrast 1.05:1, a faint card). Filled cells read as buttons or a spreadsheet heat map |
| Chart | Corner squares for "today", bottom progress bars, underlines, tints, fills | Five kinds of micro-mark in one 46pt cell |
| Chart, checkbox | Rules 0.75pt and 1.5pt, checkbox edge 1.6pt; no `roundToNearestPixel` anywhere in `src` | 2.25px, 4.5px and 4.8px on a @3x screen: soft edges where print would be crisp |
| Today | Checkbox 26pt with radius `size × 0.28` = 7.3pt; separators inset from the left | iOS Reminders geometry. A printed check box is a small sharp square |
| Home | "14" at 56pt Bold with a gold bar under the numeral; double rule under the header and again under "오늘 할 일" | Dashboard number. The double rule is a ledger sign for a final total, used here as decoration |
| Home, week strip | Weekday labels all grey | A Korean or Japanese printed calendar always has a red Sunday |
| Stats | 8-area tinted grid, "13%" repeated in every cell | Units belong in a header once |

Things that already work and should survive: the three-level rule hierarchy on the chart, the 正 tally in the week strip, the pen-stroke tick with a per-row tilt, tabular numerals, the week-number and days-left line on Home, and the printable PDF.

## Physical scale: paper pitches in iPhone points

Current iPhones are 460 ppi at @3x, so 1 mm is 6.04pt and 1pt is 0.166 mm [C]. iPhone SE (326 ppi @2x) gives 6.4pt per mm and iPad (264 ppi @2x) 5.2pt per mm, so these are iPhone figures.

| Paper standard | mm | pt on iPhone | Note |
|---|---|---|---|
| Kokuyo Jibun Techo grid | 3.0 [R] | 18.1 | Our current dot pitch of 18pt is physically this fine |
| Hobonichi monthly calendar | 3.45 [S] | 20.8 | |
| Hobonichi Weeks | 3.55 [S] | 21.4 | |
| Hobonichi Original and Cousin | 3.7 [S] | 22.3 | Two squares are 44.7pt, Apple's 44pt minimum target [R] |
| Stalogy Editor's Series; Hobonichi English Planner | 4.0 [S] | 24.2 | Two squares are 48pt |
| Field Notes graph (3/16") | 4.7 [S] | 28.4 | |
| Midori MD, Leuchtturm1917, Rhodia dot | 5.0 [S] | 30.2 | The Western "standard" grid |
| Kokuyo Campus B rule | 6.0 [S] | 36.2 | |
| Field Notes ruled (1/4") | 6.4 [S] | 38.6 | |
| Kokuyo Campus A rule | 7.0 [S] | 42.3 | |
| Our list row today | 8.9 [C] | 54 | Wider than any common ruled paper |

Our rule weights convert to 0.12 mm (0.75pt), 0.25 mm (1.5pt) and 0.33 mm (2pt) [C], which is the right physical range for print. The problem is pixel alignment, not weight.

## Analog references

### A1. Hobonichi Techo (ほぼ日手帳)

**What it is.** The benchmark one-page-per-day planner, A6, on thin Tomoe River paper, redesigned a little every year since the 2002 edition.

**What exactly is good.**

- The grid pitch was reached by trial: 4 mm, then 3.45 mm, then 3.7 mm [S]. It is printed "in a light colour" (うすく印刷) so it guides and then disappears [S].
- **Month colour.** Each month has its own tab colour on the page edge, "like a dictionary" thumb index, readable "even when the book is closed"; the 2027 guide calls them twelve gentle, calm colours. The page itself is also printed in a different colour each month [S]. Time has a colour, and you can see the year's shape from the closed book.
- **The secret line (秘密の縦ライン).** One faint vertical line splits the page into a narrow left zone and a wide right zone, schedule and notes, or to-do and details. It is printed lightly enough to ignore when you want the whole page [S].
- **Page furniture with a job.** A 24-hour timeline with a dot per hour and a tick per half hour; the day's number counted from 1 January (日番号); moon phase with ○ and ● for full and new; a mini calendar of the month on each daily page; a small to-do area; one quote at the foot of each page or spread (日々の言葉) [S].
- Holidays are printed large but in light ink, to make it easy to write over them [S]. Print yields to handwriting.
- Bonus pages include a 365-day check-off sheet and "My 100" [S].
- The related grid notebook changes grid ink every 60 pages (A6) or 72 pages (A5) through red, blue, green and purple, so sections can be found by colour [S].

**Sources.** [2026 Original guide](https://www.1101.com/store/techo/en/2026/all_about/original/), [2027 Original guide](https://www.1101.com/store/techo/en/2027/all_about/original/), [2027 guide, Japanese](https://www.1101.com/store/techo/ja/2027/all_about/original/), [2025 guide](https://www.1101.com/store/techo/en/2025/all_about/original/), [Day-Free secret line](https://www.1101.com/store/techo/en/2023/all_about/dayfree/about04.html), [daily page, 2020](https://www.1101.com/store/techo/ja/2020/all_about/original/about04.html), [grid notebook news, Impress Watch](https://www.watch.impress.co.jp/docs/news/1187619.html), [The Journal Shop guide](https://www.thejournalshop.com/blogs/guides/how-to-use-the-hobonichi-techo).

**How we adopt.**

- Month ink and a thumb index (move 7).
- A secret line on Home, Today and Settings (move 13).
- The Home header as real page furniture: day number, week number and days left are already computed; set them as an 11pt tabular folio instead of two caption lines (move 8).
- A footer line on Today that echoes the user's own words (last week's review note, or the core goal), in the position Hobonichi gives its daily quote. Not a stock motivational quote.
- The 365-day check-off sheet is the model for the year view in Stats and for the Year archive.

### A2. Stalogy Editor's Series 365 Days Notebook

**What it is.** A Japanese notebook that can be an undated planner: 4 mm grid in light grey on thin paper [S].

**What exactly is good.** The whole "planner" is a header of very small printed month numbers, weekdays and the numbers 1 to 31 that you circle to date the page, plus, according to one secondary source, hour numbers down the side [S]. It is the purest example of furniture that is present only if you look for it. Retailers stress that the grey grid "does not disrupt your writing" [S]. From memory the header type is about 5 to 6pt in pale grey [R].

**Sources.** [Gentleman Stationer listing](https://www.gentlemanstationer.com/curated-paper/stalogy-018-editors-365-day), [Paperwhisper listing](https://paperwhisper.com/products/stalogy-editors-series-365-days-notebook-a5), [Luiban spec](https://luiban.com/en/Notebooks-Planners/LB14116-stalogy-notebook-018-editor-s-series-365-days-squared-yellow-b6).

**How we adopt.** This is the argument for a 24pt module (4 mm) and for demoting every printed label to 11 to 12pt in print ink (moves 1 and 3). The week strip on Home and the "월 화 수 목 금 토 일" header on Today can be drawn the Stalogy way: all seven letters printed pale, today's one circled or inked.

### A3. Midori MD Paper

**What it is.** Cream writing paper (MD Paper Cream, launched 2006) in a notebook with a blank cream cover, exposed cheesecloth spine and glassine wrap [S].

**What exactly is good.**

- The stated philosophy is that the best tools disappear in use; the paper is the product and decoration is removed [S].
- The 5 mm grid is pale blue on cream, described by one buyer as a tin blue-grey, and the squares are not closed: lines stop short of the crossings, with small dots at the page edges for counting [S]. A cool ink on warm paper is what makes it look printed. Open crossings avoid the dark knots that appear where lines meet.
- The ruled version carries a single centre line dividing the page [S].

**Sources.** [MD "Commitment to Craft"](https://md.midori-japan.co.jp/en/feature/note), [MD brand guide](https://www.thejournalshop.com/blogs/guides/midori-md-paper-brand-guide), [Pen Addict review](https://www.penaddict.com/blog/2017/8/18/the-midori-md-notebook-a5-gridded-a-review), [Mountain of Ink review](https://mountainofink.com/blog/midori-md-notebook).

**How we adopt.** Print ink in a cool hue (move 3). If the paper pattern setting keeps a grid option, draw it MD-style with gaps at the crossings. In the 9×9 chart, test stopping the thin cell rules 1pt short of the block rules, so crossings stay clean.

### A4. Kokuyo Campus dotted ruled line (ドット入り罫線)

**What it is.** Japan's default school notebook; the dotted-rule version came out of joint research with the author of a book on Tokyo University entrants' notebooks, and passed its tenth anniversary in 2018 [S].

**What exactly is good.** A-rule is 7 mm and B-rule 6 mm, and small dots sit on every line at the same interval as the line spacing [S]. A ruled page therefore hides a square grid: you can align indents, columns and diagrams vertically without the visual weight of a full grid.

**Sources.** [Kokuyo product page](https://www.kokuyo.com/en/stationery/category/notebook-paper/notebook/7326), [Kokuyo release via ReseMom](https://resemom.jp/release/prtimes/20181024/48241.html).

**How we adopt.** This is the best model for the Today list and Settings: full-width rules at row pitch, with dots on the rule at module pitch, instead of a dot field with separate inset separators. The dots give the secret line and the checkbox column something to register to.

### A5. Kokuyo Jibun Techo (ジブン手帳)

**What it is.** A three-booklet life-log planner (DIARY, LIFE, IDEA) built around a 24-hour vertical week, supervised by an advertising creative, with every page on a grid [S]. The Biz edition keeps the format with calmer colours and typefaces [S].

**What exactly is good.** Density without mess: a very fine grid (3 mm [R]), tiny pictograms for weather and meals [R], and a strict column structure. It shows how far a small module and pale ink can be pushed. The LIFE booklet, kept across years, holds lists such as life goals [R], which is the nearest mainstream paper cousin of a Mandal-Art.

**Sources.** [DIME](https://dime.jp/genre/2143819/), [Lifehacker Japan](https://www.lifehacker.jp/article/2212_lht_schedule_and_todo_management_matome/?page=2), [Kokuyo store blog](https://www.kokuyostore.com/en_IN/blog57-journaling-jibuntecho-wp-finewriter.html).

**How we adopt.** A warning as much as a model. Our 18pt dot is physically Jibun-fine (3 mm), yet our content is large and sparse. Either the module grows to match the content (move 1), or the content gets denser. The board mode of Today and the Stats weekly bars are where Jibun-style density would pay.

### A6. Leuchtturm1917

**What it is.** The European bullet-journal notebook: 249 numbered pages, a blank table of contents, 5 mm dots on 80 g ivory paper, two ribbons, and stickers for labelling and archiving the spine [S].

**What exactly is good.** The archive is designed in from page one. Page numbers and an index turn a notebook into a reference, and the spine stickers assume you will shelve it.

**Sources.** [Goulet Pens listing](https://www.gouletpens.com/products/leuchtturm1917-medium-a5-notebook-black-dot-grid), [Blick listing](https://www.dickblick.com/products/leuchtturm1917-dotted-hardbound-notebooks).

**How we adopt.** Year close and archive: each closed year becomes a volume with a spine label (year, core goal, cells done), and the archive is a shelf of spines, not a list of rows. A folio in the corner of dated screens ("287 / 365") gives the app page numbers.

### A7. Rhodia

**What it is.** The French pad with the orange cover, unchanged since 1934, on 80 g Clairefontaine vellum [S].

**What exactly is good.** White paper with a violet 5×5 grid [S]. Violet is distinct from both blue and black writing ink, so the grid never competes with what you write. All of the brand's colour is on the cover; the page is strictly two-tone.

**Sources.** [Rhodia brand page](https://rhodiapads.com/brand.php), [Goldspot listing](https://goldspot.com/products/rhodia-bloc-rhodia-orange-le-carre-80f-agrafees-80g-5-3-4x5-3-4-q-5x5), [Cult Pens](https://cultpens.com/collections/rhodia-dotpad-notepads).

**How we adopt.** Supports move 3 (grid in a hue that is not the text hue) and move 5 (one loud colour kept for one place). If we take the whiter-paper route in move 4, Rhodia is the reference.

### A8. Field Notes

**What it is.** The American pocket memo book, 3.5 × 5.5 in, 48 pages, three staples [S].

**What exactly is good.**

- One typeface family for everything: Futura [S]. Total consistency is the brand.
- The inside covers carry "Specifications" and "Practical Applications" [S]. The specifications name the cover stock (French Dur-O-Tone 80#C "Packing Brown Wrap"), the ink ("Dachshund Nose" black soy-based Toyo ink), the printer and the grid (3/16 in) [S]. A colophon is where the personality lives, so the working pages can stay plain.

**Source.** [Original Kraft product page](https://fieldnotesbrand.com/products/original-kraft).

**How we adopt.** A colophon in Settings › About and at the foot of the PDF (move 15). App Store screenshots laid out like a stationery spec sheet: the object, then small labelled facts ("81칸 · 모눈 4 mm · A4 인쇄 · iCloud").

### A9. Bullet Journal notation

**What it is.** Ryder Carroll's rapid-logging key.

**What exactly is good.** State is shown by transforming one mark: `•` task, `×` done, `>` migrated forward, `<` scheduled, `○` event, `–` note, with a few signifiers in front for priority [S]. Nothing is deleted. Migration is a ritual with its own glyph.

**Sources.** [bulletjournal.com on rapid logging](https://bulletjournal.com/blogs/faq/what-is-rapid-logging-understand-rapid-logging-bullets-and-signifiers), [101 Planners key](https://www.101planners.com/bullet-journal-key).

**How we adopt.** The weekly review is a migration ritual already. Use `>` for "moved to next week" and `×` for done in the review and in the per-row week history on Today, replacing the five box styles there now [O] (move 12).

### A10. East Asian grids: 원고지, 方眼, 正

**What they are.** Manuscript paper (원고지, 原稿用紙), section paper (方眼紙) and the five-stroke tally.

**What exactly is good.**

- 원고지 is 20 columns by 10 rows for 200 characters, or 20 by 20 for 400; B5 landscape 200-character sheets are the common Korean form, and Hangul's built-in templates come in red, black and green [S]. One square per syllable is a native Korean and Japanese idea of "a form you write in".
- Section paper prints three line weights (every 1, 5 and 10 mm) [R]. The Mandal-Art's cell, block and frame is the same idea, which the chart already follows [O].
- The 正 tally is already in our week strip [O] and is the right kind of cultural detail: functional, not decorative.

**Sources.** [원고지 template notes](https://foxcg.com/원고지-양식-아래한글-워드-pdf-파일-다운로드/), [manuscript converter with 200 and 400 rules](https://tools.devcomma.com/tools/manuscript-paper-converter).

**How we adopt.** In the cell editor, show the remaining room as a short strip of 원고지 squares under the field instead of the "fits in N lines" sentence. Keep 正 for Korean and Japanese; use a Western five-bar gate tally for English.

### A11. The printed ancestors: マンダラ手帳 and Korean study planners

**What they are.** The Mandala Chart was published in 1979 by Matsumura Yasuo; his company still sells a paper Mandala Techo (the 2026 edition went on sale on 8 September 2025 with an AI chatbot and weekly review sessions) [S]. In Korea the 모트모트 텐미닛 플래너 divides the day into ten-minute cells, in 31-day, 100-day and half-year books [S].

**What exactly is good.** Both show that our users already own paper versions of this idea. The ten-minute planner is a colouring-in habit: time cells filled with highlighter [R].

**Sources.** [Mandala Techo 2026 release](https://newscast.jp/smart/news/7018659), [Mandala Chart history, Lucid](https://lucid.co/ja/blog/mandala-chart), [모트모트 listing](https://www.11st.co.kr/products/8604356160), [ten-minute planner note](https://tilnote.io/pages/6abfcd381bc5b55a948982cd).

**How we adopt.** The highlighter habit supports one of the "done" treatments in move 10 (a marker band behind the text, not a filled cell). I could not retrieve the Mandala Techo's page layout; someone should look at it before the chart is redrawn.

### A12. MUJI and Traveler's Notebook

Only one fact was retrieved: MUJI's bound notebooks signal their ruling type by the colour of the cover and spine cloth [S, from a search summary over a [MUJI staff article](https://www.muji.com/jp/ja/store/articles/staff-blog/shopping/1646007) and a [HugKum round-up](https://hugkum.sho.jp/400476)]. From memory, MUJI planners use grey rules on unbleached paper with no visible branding, and the Traveler's Notebook system numbers its refills and lets wear on the cover be the decoration [R]. The usable idea is identification by a strip of colour on the edge of an object, not by filling it. That is how the 8 areas should show up outside the chart: a 3pt edge or a 6pt chip.

## Print and editorial references

### P1. Tables to be read: Tufte, Rutter, booktabs

**What exactly is good.**

- Tufte: maximise the share of ink that carries data; dark grid lines compete with the data, so grids should be light or absent; he suggests using the reverse side of graph paper so the grid shows through faintly [S]. Two dark lines side by side create a third shape between them, the "1 + 1 = 3" effect [S].
- Richard Rutter, "Web Typography: Designing Tables to be Read, Not Looked At": few or no rules, white space to separate columns, right-aligned numbers with the same number of decimals, left-aligned text, headings aligned with their data, tabular lining figures switched on deliberately [S].
- booktabs: never vertical rules; a heavier rule at top and bottom, a lighter one under the headings (defaults 0.08em and 0.05em, a ratio of 1.6 to 1) [S].

**Sources.** [Rutter, A List Apart](https://alistapart.com/article/web-typography-tables/), [Ström, "Design better data tables"](https://mattstromawn.com/writing/tables/), [Wilke, "Balance the data and the context"](https://clauswilke.com/dataviz/balance-data-context), [layering and separation commentary](https://cms633.github.io/Fall-2018/commentary/layering-and-separation.html), [gridlines guideline](https://maxmasnick.nfshost.com/projects/datatips/guidelines/gridlines-in-graphs), [booktabs manual](https://ctan.math.washington.edu/tex-archive/macros/latex/contrib/booktabs/booktabs.pdf), [booktabs defaults](https://www.contextgarden.net/Tables/Tutorials/Creating_booktabs-like_tables_with_xtable).

**How we adopt.** Stats and the Home ledger of 8 areas become booktabs tables (move 14). The "1 + 1 = 3" effect is why the Home double rule and the chart's five micro-marks feel busy. Alpha-blended rules that darken where they cross are the same fault at pixel scale (move 2).

### P2. Ledger and calendar conventions [R]

Not retrieved this session; stated from general knowledge.

- In bookkeeping a single rule above a figure means a subtotal and a double rule beneath means a final total. A double rule is a statement, not an ornament.
- Korean and Japanese printed calendars set Sundays and public holidays in red and Saturdays in blue.
- Seals (도장, 判子) are stamped in vermilion (인주, 朱肉), slightly rotated and unevenly inked.

**How we adopt.** Keep the double rule for totals only: the year-close page, the Stats total row, "64 / 64". Red Sundays in every calendar surface (move 6). The stamp is the model for "done" on the chart (move 10).

### P3. Swiss baseline grid [R]

Not retrieved this session. Müller-Brockmann's rule is that every text size shares one baseline increment, so captions, body and headings align across columns, and that margins and gutters are multiples of the same unit. This is the print discipline behind move 1. Our line-heights (60, 32, 24, 21, 22, 18, 14) share no unit [O].

### P4. Paper tones and inks

**Paper tones.** OKLCH values are my calculation [C]. Hex values marked "est." are eyeballed from memory, not measured.

| Paper | Hex | L | C | Source |
|---|---|---|---|---|
| Our 미색 | `#FBF9F4` | 0.982 | 0.007 | [O] |
| Anthropic and Claude light | `#FAF9F5` | 0.982 | 0.005 | Anthropic brand-guidelines skill installed in this environment |
| Notion warm surface | `#F7F6F3` | 0.973 | 0.004 | [S] third-party, [Notion colours](https://matthiasfrank.de/en/notion-colors/) |
| Our 크림 mood | `#F4EEE3` | 0.951 | 0.016 | [O] |
| Apple Books sepia | `#F8F1E3` | 0.960 | 0.020 | [S] user gist, may be outdated: [gist](https://gist.github.com/adaptivegarage/aef95223fab9a39db45f) |
| Solarized base3 | `#FDF6E3` | 0.974 | 0.026 | [R] |
| Kindle sepia (text `#5F4B32`) | `#FBF0D9` | 0.958 | 0.033 | [S] forum report: [MobileRead](https://www.mobileread.com/forums/showthread.php?p=1418607) |
| MD Paper Cream | about `#F4EDDC` est. | 0.95 | 0.02 | [R] |
| Tomoe River white | about `#FBFAF7` est. | 0.99 | 0.003 | [R] |
| Field Notes kraft cover | about `#B8956A` est. | | | [R] |

The reading: our default sits in the no-man's-land with Claude and Notion, too warm to be white paper and too pale to be cream. The cream references in the table have three to five times the chroma. Hobonichi itself uses white Tomoe River in the A6 Original and a cream stock in the Weeks [S, a Reddit thread surfaced by search: [paper test on the 2025 Weeks](https://nyc1.lr.ggtyler.dev/r/hobonichi/comments/1gefc25/testing_the_paper_on_my_2025_weeks)], so both are legitimate, but they are different products.

**Inks.** Pilot publishes no hex values for Iroshizuku. The only dataset found describes its own values as approximate and I could not read them [S, [R-bloggers, August 2026](https://www.r-bloggers.com/2026/08/a-tiny-iroshizuku-ink-shop-in-r/)]; community palettes found by search were visibly wrong. The values below are my own approximations from memory of swatches and must not be treated as measurements.

| Ink | Name | Approx. hex | Character |
|---|---|---|---|
| 竹炭 Take-sumi | bamboo charcoal | `#2B2B2D` | neutral black |
| 深海 Shin-kai | deep sea | `#30435A` | blue-black, greys as it dries |
| 月夜 Tsuki-yo | moonlit night | `#1F4F60` | teal blue-black [S: described as a dark teal-blue] |
| 紺碧 Kon-peki | deep azure | `#1F6FBF` | summer-sky blue [S: described as deep clear-sky blue] |
| 山葡萄 Yama-budo | wild grape | `#8E2B6C` | magenta-purple [S: described as purple to magenta] |
| 紅葉 Momiji | autumn leaves | `#C52B3C` | red |
| 冬柿 Fuyu-gaki | winter persimmon | `#DF5A2C` | orange-red |
| 稲穂 Ina-ho | rice ear | `#B49239` | golden ochre, close to our gold |
| 霧雨 Kiri-same | drizzle | `#8B8E90` | grey |
| 深緑 Shin-ryoku | deep green | `#1F6A50` | forest green |

What is worth taking is the system, not the hex values: each ink is named after a season or a natural scene [S, [Gentleman Stationer survey](https://www.gentlemanstationer.com/blog/2021/4/14/workhorse-inks-exploring-iroshizuku-in-full-as-in-the-entire-line)]. Our eight dye names (쑥, 쪽빛, 황토, 연지, 청자, 오디, 비색, 주홍) are already in this tradition and deserve to be visible to the user as ink names in the colour picker.

**Our eight area colours** all sit at lightness 0.53 to 0.58 and chroma 0.08 to 0.12 [C]. That was done for AA contrast under white text, and it works. The side effect is that a chart full of them is one flat value, and the gold accent (L 0.65, C 0.105, hue 81°) is not distinguishable in kind from them.

## Digital references

### D1. Things 3 (Cultured Code)

**What exactly is good.** The interface is close to 95% neutral, and colour is reserved for meaning: yellow for Today, red for deadlines, indigo for This Evening [S]. Completing a task is a short sequence (fill, then tick, about half a second in one teardown, though that figure is the author's reconstruction) [S]. The studio's line is "we believe simple is hard" [S].

**Sources.** [MacStories review](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/), [design study](https://blakecrosley.com/guides/design/things), [Pratt design critique](https://ixd.prattsi.org/2020/02/design-critique-things-3-ios-app/), [third-party token gallery](https://www.oppadu.com/tools/design-systems-site/brand/things.html).

**How we adopt.** Assign each colour a single meaning and audit every screen against it. Vermilion means today and done. Area colours mean which area. Nothing else is coloured.

### D2. Timepage by Moleskine (Bonobo)

**What exactly is good.** The planner is a continuous timeline, not a month grid, and reviewers said it "feels like turning the pages of a digital day planner" without any drawn leather or paper [S]. MacStories praised the 3.0 update for restraint, "one of the rarest and most valuable principles" [S]. Critics disliked the all-caps labels [S]. These reviews date from 2015 to 2019; I did not check the app's state in 2026.

**Sources.** [MacStories on 3.0](https://www.macstories.net/reviews/timepage-30-key-refinements-for-a-mature-calendar-app/), [MacStories first review](https://www.macstories.net/reviews/timepage-a-beautiful-and-clever-calendar-app/), [Paste review](https://pastemagazine.com/tech/ios/moleskine-timepage-ios-app-review-digital-paper), [TechRadar](https://www.techradar.com/reviews/timepage-calendar-app).

**How we adopt.** A notebook brand made its app with typography, one theme colour and page-like movement, and no texture. Day-to-day navigation on Today should be a horizontal page change with a 1px gutter rule, not a date picker.

### D3. iA Writer

**What exactly is good.** The typeface is the product. iA built Duospace in 2017 on IBM Plex, giving m and w 150% width so monospace reads better, then Quattro for a less rigid feel, and released both free [S]. From memory the screen has one accent, the blue caret, and nothing else coloured [R].

**Sources.** [iA, "In Search of the Perfect Writing Font"](https://ia.net/topics/in-search-of-the-perfect-writing-font), [Duospace notes](https://ia.net/topics/tag/duospace).

**How we adopt.** Supports adding one typeface with a reason (move 9) and tuning numerals. Pretendard exposes OpenType features including a Korean-context stylistic set, `ss05`, added in v1.3.0 [S, [Pretendard releases](https://github.com/orioncactus/pretendard/releases)]; the full feature list should be read from the font before the type scale is redone.

### D4. Bear

**What exactly is good.** The default theme is called Red Graphite: graphite text on white with one red accent (about `#DD4C4F` by a third-party measurement) [S]. Themes are named like materials.

**Sources.** [Bear themes FAQ](https://bear.app/faq/about-free-and-pro-themes-in-bear/), [Bear blog on themes](https://blog.bear.app/2018/10/write-your-way-with-beautiful-themes-and-bear-pro/), [third-party tokens](https://www.shadcn.io/design/bear).

**How we adopt.** Proof that a warm, quiet writing app carries a red accent well. Our moods could be named as paper and ink pairs (미색 · 먹 · 주홍) and shown as swatches of both.

### D5. reMarkable

**What exactly is good.** There is no home page; the page you are working on is home. The team says it shifted the balance so content is "front and center", and the interface is deliberately bare [S]. The paper feel comes from the physical surface, so the software draws no fake texture [S].

**Sources.** [Domus review](https://domusweb.it/en/news/gallery/2024/09/18/new-remarkable-paper-pro-review.html), [Inside reMarkable 2](https://medium.com/blog-getremarkable-com/inside-remarkable-2-chapter-2-the-user-experience-66646f7cfcae), [reMarkable on paper feel](https://remarkable.com/using-remarkable/paper-like-writing-and-reading/why-remarkable-paper-pro-feels-like-writing-on-paper).

**How we adopt.** A glass phone cannot be paper to the touch. Haptics and sound are the only honest substitutes for texture (move 11). And opening the app should land on today's page with no dashboard feel.

### D6. Teenage Engineering

**What exactly is good.** Accent colours are product and status colours only (record, battery, error) and never touch chrome or backgrounds; 1px grey lines divide the catalogue "like a technical spec sheet"; labels are small, lowercase and thin [S]. The orange is reported as `#F05A24` or `#FF6600` depending on the source [S].

**Sources.** [design guide](https://blakecrosley.com/guides/design/teenage-engineering), [token study](https://www.shadcn.io/design/teenage-engineering), [Kombai study](https://kombai.com/examples/design-systems/teenage-kombai), [SFMOMA interview](https://www.sfmoma.org/read/stay-curious-stay-naive-an-interview-with-teenage-engineering-jesper-kouthoofd/).

**How we adopt.** The spec-sheet look is the print look: hairlines, small labels, one hot colour. It supports moves 2, 3 and 5.

### D7. Paper by FiftyThree (now WeTransfer)

**What exactly is good.** Reviewers noted it had "zero onscreen buttons or controls". It kept the realism that did work (journals you open, pages you turn) and removed chrome. The team built hundreds of prototypes to tune ink smoothing, blending and speed response [S]. John Gruber called it skeuomorphic and argued the metaphor fitted the function [S]. Andy Allen's ten-year retrospective says the same principles survived every rewrite [S].

**Sources.** ["Paper at 10"](https://notbor.ing/words/paper-at-10), [MacStories on the anniversary](https://www.macstories.net/linked/papers-10th-anniversary/), [MacStories, "The (Semi)Skeuomorphism"](https://www.macstories.net/stories/the-semiskeuomorphism/), [FiftyThree prototyping notes](https://medium.com/fiftythree-space-to-create/prototyping-paper-on-iphone-part-i-41fa79d5f76e), [Engadget on the iPhone version](https://www.engadget.com/2015/09/21/the-making-of-fiftythrees-beloved-paper-app-for-the-iphone/).

**How we adopt.** Spend the effort on the mark, not the surface. Our tick already tilts per row. Tune the stamp, the tick and the strike-through to that standard, on a device.

### D8. (Not Boring) apps (Andy Works)

**What exactly is good.** The "No more boring apps" essay argues product design has become formulaic. The Habits app won an Apple Design Award in 2022; its check-off is a long press that charges up, with sound treated as part of the experience [S]. The studio's business argument is that design is hard to copy while features are not [S].

**Sources.** ["No more boring apps"](https://notbor.ing/words/no-more-boring-apps), [App Store developer story](https://apps.apple.com/us/story/id1591100111), [Muse podcast](https://museapp.com/podcast/16-no-more-boring-apps), [RevenueCat interview, 2026](https://www.revenuecat.com/blog/growth/andy-allen-not-boring-software-launched-podcast-2026), [Mynavi on the Habits award](https://news.mynavi.jp/techplus/article/svalley-925/).

**How we adopt.** A free app with no purchases has only craft to compete on. One memorable gesture is enough: stamping a cell as done.

### D9. Notion and Claude: warm neutrals

**What exactly is good.** Notion's text is `#37352F`, not black, and its greys carry a yellow-brown undertone on a white page [S]. Anthropic's palette is `#FAF9F5` with `#141413` text and a clay accent `#D97757`, and the brand sets body text in a serif (Lora) with a geometric sans for headings (from the Anthropic brand-guidelines skill installed in this environment).

**Sources.** [Notion colours](https://matthiasfrank.de/en/notion-colors/), [Notion design summary](https://webdesignhot.com/design.md/notion/), [Claude palette, community](https://www.designpieces.com/palette/claude-color-palette-hex-and-rgb/).

**How we adopt.** Two lessons. Cream works for Claude because it comes with a high-chroma accent (C 0.131 against our gold's 0.105, at a hue far from brown) and a serif [C]. And because that combination is now strongly associated with one AI product, we should move off it on purpose (move 4).

### D10. Hobonichi's own app (2025)

Hobonichi launched an official app on 15 October 2025, free with a premium tier at ¥550 a month or ¥4,980 a year, and went global on 26 January 2026. Its concept is the same "LIFE の BOOK" as the paper book: the day's phone records become one page per day, and a premium feature prints photos sized to paste into the paper techo [S, [Impress K-tai Watch](https://k-tai.watch.impress.co.jp/docs/news/2035677.html), [DIME](https://dime.jp/genre/2015129/)]. I found no evidence that it redraws the paper grid on screen. If that is right, the company with the strongest claim to the paper look carried over the concept and the print link, not the texture. Someone should install it and check.

### D11. iOS 26 Liquid Glass

Commentary through 2025 and 2026 describes Apple as treating the interface as a material again, with complaints centred on legibility [S, [Tapptic](https://tapptic.com/interface-as-material-the-liquid-glass-turning-point/), [TechRadar](https://www.techradar.com/phones/iphone/apples-new-liquid-glass-design-puts-the-spotlight-on-skeuomorphism-for-the-first-time-since-ios-6-and-im-all-for-it), [Web Designer Depot](https://webdesignerdepot.com/how-apple-quietly-brought-skeuomorphism-back-to-life/)]. The same writing gives the best test for a material metaphor: older skeuomorphism was justified where the metaphor solved a usability problem and failed where it was decoration [S, [HackerNoon](https://hackernoon.com/when-copying-the-physical-world-helps-the-ui-and-when-it-doesnt)]. For us this is a decision to make deliberately: system glass bars floating over a paper page (a glass paperweight on a notebook) can look intentional, while a hand-drawn paper tab bar on an OS made of glass can look dated. I did not research the HIG; another memo should own this.

### D12. GoodNotes, Day One, Kinopio [R]

No sources retrieved; recall only. GoodNotes treats paper as a template the user chooses (dotted, squared, ruled, Cornell; white, yellow or dark). Day One shows journals as coloured books, resurfaces "On This Day", and will print your journal as a bound book. Kinopio gets its handmade feel from behaviour and odd details, with no texture. The Day One point matters most here: our printable PDF is the one place where we are literally paper, and it should be the best-designed object we ship.

## What separates premium "paper" from skeuomorphism and from dull beige

1. **Structure over surface.** Real stationery is a module, a hierarchy of rules and a small set of inks. Hobonichi iterated the grid pitch three times; nobody iterated a paper texture. Cheap paper UIs add grain and shadows to an ordinary layout.
2. **Print is quiet; the owner is loud.** Stalogy's header, Hobonichi's pale holidays and Tufte's muted grid all say the same thing. If the printed labels are heavier than the user's words, it is a form, not a notebook.
3. **Each ink has a job.** Print ink for furniture, writing ink for the owner's words, one signal ink for today and done, area inks for identity. Dull beige happens when all four are shades of brown.
4. **Registration.** Print aligns to its grid within a hair. A dot field that the content ignores is the fastest way to look fake.
5. **Marks behave like marks.** Ticks overshoot boxes, stamps sit slightly rotated, strike-throughs are drawn, done things stay on the page. Behaviour carries the metaphor; pictures of paper do not.
6. **The object knows where it is in time.** Month colours, thumb indexes, day numbers, a book that fills up. A planner in November should look different from one in January.
7. **Honesty about the medium.** No fibres, no curls, no tape, no handwriting fonts. Where the screen cannot be paper, use what it has: haptics, sound, crisp pixels, and a real PDF.

## Fifteen moves

Each move names where it applies. Sizes are starting points for mockups, not final values.

1. **Make the grid structural.** Choose one module and register everything to it. I recommend 24pt (3.98 mm on current iPhones, the Stalogy and English Hobonichi Planner pitch) over the present 18pt, with a 6pt sub-unit. Rows 48pt, gutter 24pt, line-heights 12, 18, 24, 36 and 72 only, section gaps of one or two modules. Add a dev overlay and accept no screen where a rule or a row misses a module line. Applies to every screen. Scale the module with Dynamic Type so registration survives large text.
2. **Three pixel-exact rule weights in opaque ink.** On @3x use 2px (0.67pt), 4px (1.33pt) and 6px (2pt) for cell, block and frame; on @2x use 1px, 2px and 4px. Route every width through `PixelRatio.roundToNearestPixel`. Use solid mixed colours, not alpha, so crossings do not darken. Applies to the chart, lists, checkbox, week strip, widgets and the PDF, which should use the same ratios in millimetres.
3. **Split print ink from writing ink, and shrink the print.** Printed furniture (dots, rules, labels, column heads, weekday letters, the folio) moves to a cool blue-grey: label text about `#55657A` (5.7:1 on 미색), rules about `#C9D3E0`, dots about `#AEBBCB` [C]. Section titles drop from 18pt Bold ink to 11 to 12pt Medium print ink with +4% tracking. The user's own words keep `ink` and gain the size and weight. Applies to Home, Today, Stats and Settings.
4. **Commit the paper tone and remove the white cards.** Prototype two papers side by side: a white stock (about `#FCFCFA`) with a coloured grid, Hobonichi and Rhodia style, and a true cream (about `#F6F1E4`, chroma about 0.018) with a pale blue grid, MD style. Do not ship `#FBF9F4`. Set every surface to the page colour; cells and rows are paper, never `#FFFFFF` on cream. Applies to all moods and the chart.
5. **One signal colour: vermilion (주홍, 朱).** A candidate is `#C4372F` (5.1:1 on 미색, 4.7:1 on the cream above, chroma 0.18) [C]. It has three jobs only: today, Sundays and holidays, and the done stamp. Gold stops being an interface colour and becomes foil, used once for rare ceremonies such as 64 / 64 and year close. Applies everywhere the accent is used now, and to the icon.
6. **Give the calendar its conventions.** Sunday and public holidays in vermilion, Saturday in a blue from the area set, on the week strip, day picker, Stats axes, Year view and widgets. All seven weekday letters print pale; today's is inked and circled, Stalogy style. Applies to Home, Today, Stats and Year.
7. **Month ink and a thumb index.** Twelve quiet colours, one per month. The month's ink colours the printed furniture only (dots, header rule, the date numeral). On Year, Stats and the archive, draw twelve small tabs down the right edge in those inks with the current month extended; tap to jump. Never use month ink on data. Applies to Home, Year, Stats and the lock-screen widget.
8. **Set the date as page furniture.** The numeral at 60/72 in Regular weight, or in the serif from move 9, in month ink, with no bar beneath it. Beside it the weekday. On the right a three-part folio in 11pt tabular print ink, for example "W42 · 287 / 365 · D-78". One 4px rule under the whole header. Applies to Home, the Today header, the PDF header and the medium widget.
9. **Add one serif for the owner's big words.** Maru Buri (Naver, OFL, five weights from ExtraLight to Bold, Korean and Latin only) [S, [Sandoll Cloud](https://www.sandollcloud.com/free-font/16193/Maru-Buri)]; for Japanese use the system Hiragino Mincho [R] since the app already falls back to Hiragino Sans there [O]. Use it for the core goal, the date numeral if it tests well, weekly-review prompts, the year-close page, onboarding headlines and App Store captions. Never in lists, buttons or settings. Two weights at most.
10. **Redraw the 9×9 as a printed form.** Cells are paper. Area identity lives in the eight head cells (tint kept) and the centre cell. An action cell is ink text on paper. Done is a mark over the text, with text staying ink-coloured. Prototype three marks and choose one: a seal ring 60% of the cell, 2px, in area ink, rotated ±3° with slight opacity variation; a highlighter band of area colour at about 30% behind the text lines only; or a 45° hatch at 4px pitch. "Today" becomes a 6pt vermilion corner. Remove the bottom progress bars from the 81-cell view and show "n / 8" as numerals in the head cell. Applies to the chart, the zoomed 3×3, the Home mini chart, the share image, the PDF and the icon.
11. **Checkbox as one printed square, tick as pen.** A 24pt box, radius 2pt (today 7.3pt), 2px outline in print ink, the whole 48pt row as the target. The tick is drawn in writing ink and overshoots the box by 2 to 3pt. A 1.33pt strike-through is drawn left to right across the title in about 180 ms. Done rows stay in place, struck through, until the day closes. One light haptic on the tick; one soft, short sound for a stamp, with a setting to turn it off. Applies to Today, Home and the zoomed 3×3.
12. **Bullet-journal marks for history and migration.** In the weekly review and in each row's week history, use `×` done, `•` open, `>` moved to next week and `–` skipped, in tabular print ink, replacing the present mix of filled, empty, hatched and dotted squares. The review's "carry over" action is named and drawn as `>`. Applies to Today rows, the weekly review and Stats.
13. **A secret line.** One vertical alignment at gutter plus two modules (72pt from the edge). Left of it only marks: checkbox, area chip, time, weekday. Right of it only words. Draw it at about 8% print ink on Today and Home; hold to it without drawing it in Settings and sheets. Applies to every list.
14. **Tables set to be read.** Stats, the Home ledger of 8 areas and the Year ledger follow booktabs: a 4px rule at top and bottom, a 2px rule under the column heads, no vertical rules, no zebra, labels left, numerals right and tabular, units once in the header. The double rule appears only under a final total. Applies to Stats, Home, Year and the PDF.
15. **A colophon, bound volumes and a PDF that matches the screen.** Settings › About becomes a colophon listing paper, grid pitch, typefaces, inks and edition, with a short "쓰임새" list in the Field Notes manner. Closed years become volumes with a spine label on a shelf in the archive. The PDF uses the same module, rule ratios, inks and folio as the screen, and carries the colophon line at the foot. Applies to Settings, year close, the archive, the PDF and the App Store screenshots, which should be laid out as a stationery spec sheet.

## Pitfalls

- **Texture kitsch.** Grain, fibres, deckled edges, page curls, drop shadows under "sheets", washi tape, coffee rings and handwriting fonts. None of the admired references uses any of them.
- **Dull beige.** Warm paper with warm grey text, a brown grid and a gold accent. It needs a cool printed ink and one hot signal, or it reads as unfinished.
- **The AI cream.** `#FAF9F5`-range paper with near-black warm text and an earthy accent is Claude's look. Staying there invites the comparison the earlier bans were meant to avoid.
- **Grid as wallpaper.** If move 1 is not carried through, remove the dots. An unregistered grid is worse than none.
- **Copying furniture without its function.** Moon phases, rokuyo and stock quotes are informative in a Japanese paper planner and decorative in our app. Each printed element must answer a question the user has.
- **Too many micro-marks.** One cell or row should carry at most two kinds of mark. Today's chart carries five.
- **Month inks fighting area inks.** Twelve plus eight hues is too many unless month ink is confined to furniture at low chroma.
- **Red on names.** In Korea, writing a person's name in red is a taboo associated with death [R]. Vermilion is for marks and numerals only, never for user-entered text.
- **Vermilion against the 주홍 and 연지 areas.** The candidate sits at hue 28°, between 연지 (4°) and the 주홍 area (43°) [C]. It separates by chroma and by form (a mark, not a chip), but this needs a colour-blind check, and the 주홍 area may need to move toward brown.
- **School stamps.** "참 잘했어요" or "たいへんよくできました" stamp imagery is infantilising. The done mark should be abstract.
- **正 outside East Asia.** Use a five-bar gate tally in English.
- **Sub-pixel rules on @2x.** iPad and iPhone SE have 2px per point; weights tuned in thirds of a point will blur there. Define rules in device pixels.
- **Print-sized type.** Real planner labels are 5 to 7pt. On screen the floor stays at 11pt, and print ink must still reach 4.5:1 when it is text.
- **Serif cost and fallback.** Maru Buri has no Japanese; a bundled Mincho would be large. Check app size, test Dynamic Type and Bold Text, and make sure Korean, Japanese and English get an equivalent voice.
- **Dark mode as inverted paper.** White ink on black paper is a chalkboard. Design it as a dark stock with a pale printed grid, and re-pick the signal colour for it.
- **Glass against paper.** Decide how the page meets iOS 26 system bars before drawing a custom tab bar.
- **Screen and PDF drifting apart.** If the PDF and the app use different rules and type, the "paper" claim fails where it is most checkable.
- **SVG pattern cost.** A denser registered grid must not bring back the Android bitmap problem noted in `PaperDots.tsx` [O].

## What I could not verify

- **No page was read in full.** `WebFetch` failed for every host tried, so all [S] claims rest on search summaries. To allow fetching, the session's network settings would need to permit at least `www.1101.com`, `en.wikipedia.org`, `www.jetpens.com`, `www.thejournalshop.com`, `blakecrosley.com`, `notbor.ing`, `ia.net` and `alistapart.com`.
- **Search stopped early.** No sources at all for Traveler's Notebook, MUJI planner design, Müller-Brockmann, ledger and calendar conventions, Good Sudoku, NYT Games, Puzzmo, GoodNotes, Day One, Kinopio, Kokuyo rule colours, or Korean and Japanese traditional colour values. Good Sudoku and the NYT crossword are worth a follow-up, since both are 9×9-style grids in software with a print heritage.
- **Hobonichi details.** The exact twelve month colours, the typeface and weight of the date numeral, and whether the grid ink itself changes monthly in the dated books (the official text says the page is printed in a different colour each month; I could not see it).
- **Jibun Techo.** The 3 mm grid, its colours and pictograms are from memory.
- **Stalogy.** The size and tone of the header numerals are from memory.
- **Rhodia dot colour.** One search summary called the dot grid pale violet; I remember grey. Unresolved.
- **Field Notes inner ink.** I remember the inside pages being printed in a light brown soy ink named "Double Knee Duck Canvas"; the search did not confirm it.
- **Paper and ink hex values.** MD, Tomoe River and kraft tones and every Iroshizuku hex are my estimates. Kindle and Apple Books sepia values are old user reports.
- **Third-party tokens.** Things blue, Bear red, Teenage Engineering orange and Notion greys come from reverse-engineered sites that disagree with each other. The Things 500 ms completion figure is one author's reconstruction.
- **Timepage.** All sources are from 2015 to 2019.
- **The Hobonichi app's visual design** and **the Mandala Techo's page layout** were not seen.
- **Pretendard's feature list.** Only `ss05` was confirmed; `fontTools` is not installed here, so I could not inspect the bundled OTF files.
- **System fonts.** Hiragino Mincho on iOS for the Japanese serif is from memory.
- **Fractional border rendering.** That 0.75pt and 1.5pt rules render soft on device is reasoning from pixel arithmetic; confirm with a zoomed device screenshot.
- **Dot registration today.** I could confirm from the type scale that text cannot register to an 18pt module, but not whether the rules land on dot rows on each screen. An overlay audit would settle it.
- **Colour-blind and contrast checks** for the proposed vermilion and print inks beyond the WCAG ratios given.
