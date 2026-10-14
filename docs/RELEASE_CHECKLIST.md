# Release checklist — 만다라트 1.0 (iOS, App Store)

This is the owner's list for submitting 1.0. Work top to bottom.
**Release is blocked** while any item under "Blocking" is open. `npm run release-check` enforces the first two automatically: it exits 1 while `PRIVACY_URL` or `SUPPORT_EMAIL` is empty. Run it right before `eas build --profile production`.

Status key: **OPEN** = the owner still has to decide or do this · done = already in the repo.

---

## 1. Blocking — owner inputs

| # | Item | Status | Where it goes |
|---|---|---|---|
| B1 | **Privacy policy URL.** Publish a one-page 개인정보 처리방침 (text in §2), then set `PRIVACY_URL` (https) in `src/lib/appInfo.ts`. | **OPEN — `PRIVACY_URL = ''`** | `src/lib/appInfo.ts`, App Store Connect › App 정보 › 개인정보 처리방침 URL |
| B2 | **Support contact.** Set `SUPPORT_EMAIL` in `src/lib/appInfo.ts`. App Store Connect also needs a **Support URL**: use the same page as B1 (it carries the 문의 address), or a separate page. | **OPEN — `SUPPORT_EMAIL = ''`** | `src/lib/appInfo.ts`, App Store Connect › 지원 URL |
| B3 | **App Store name.** '만다라트' is **already taken** on the App Store (id6444119494), so it cannot be the store name. Pick one. Candidate: **'만다라트 노트 - 81칸 목표 계획표'** (≤ 30 chars). Before you commit to it, run a KIPRIS trademark search (kipris.or.kr) for the name. | **OPEN — owner must pick** | App Store Connect › 이름 |
| B4 | **Copyright holder** (person or company name), e.g. `© 2026 <holder>`. | **OPEN** | App Store Connect › 저작권 |

While B1/B2 are empty, Settings hides 개인정보 처리방침 and 문의하기 (W2-G). They appear on their own once the constants are filled. No code change is needed.

## 2. App Store Connect — metadata

| Field | Value | Status |
|---|---|---|
| Name | see B3 | **OPEN** |
| Subtitle | '목표 하나를 64개 실천으로' | ready |
| Home-screen name | Keep **만다라트** (`ios.infoPlist.CFBundleDisplayName`, already set). Only the store listing changes. | done |
| Settings colophon | `src/screens/Settings.tsx` shows '이름 — 만다라트'. Leave it as the home-screen name, or change it to the store name if you prefer that. | decide with B3 |
| Primary language | 한국어 (the bundle declares `ko` only; W1-I) | done in repo; set in ASC |
| Category | Primary **생산성**, secondary **라이프스타일** | set in ASC |
| Availability | **대한민국 only** at launch. This skips the EU DSA trader-status disclosure. Widen it later if you want. | set in ASC |
| Age rating | Answer the **new age-rating questionnaire** (2025 format). No user content sharing, no web, no ads, no mature themes → lowest rating. | set in ASC |
| App Privacy | **Data Not Collected** (데이터를 수집하지 않음). The app has no server, analytics or ads. Records stay on the device and in the user's own iCloud device backup. | set in ASC |
| Encryption | `ITSAppUsesNonExemptEncryption: false` is already in app.json | done |
| Price | Free (owner to confirm) | **OPEN** |

**개인정보 처리방침 text (one page, publish as-is and add the contact):**

> 만다라트는 개인정보를 수집하거나 서버로 보내지 않습니다. 기록은 이 기기와 사용자의 iCloud 백업에만 저장됩니다. 문의: <SUPPORT_EMAIL>

### Screenshots (release-u5, deferred to the owner)

These can't be taken on the Linux build host. Capture them from the iOS simulator or a device on the preview build:
- **6.9" iPhone** (1320 × 2868 portrait) is required. ASC scales it down for the smaller sizes. `supportsTablet` is false, so no iPad shots are needed.
- 5 shots, light 미색 paper, sample chart filled (설정 › 예시 채우기):
  1. 홈 — chart hero, 正 week, today's list;
  2. 만다라트 — the printed 81-cell table;
  3. 오늘 — list mode with the day-close double rule;
  4. 통계 — wear map;
  5. 표 이미지 공유 — the 1080×1350 printed sheet.
- No device frames with text overlays in English. Captions in Korean if any.

## 3. Build

- Expo Go **cannot** run SDK 56 builds of this app (feas-10). Use the internal **`preview`** profile (`eas build -p ios --profile preview`) or TestFlight for every device check below.
- Production: `npm run release-check && eas build -p ios --profile production`, then `eas submit -p ios --latest`. `eas.json` has `production.autoIncrement` with the remote app version.
- Never commit `ios/` or `android/` (CNG).
- Before the build: `npm ci`, `npm run typecheck`, `npm test` (copy lint is enforced), `npx expo-doctor`.
- **Owner decision — Hermes memory regression.** As of 2026-10-14, `npx expo-doctor` flags expo@56.0.23 / RN 0.85 (Hermes V1 250829098.0.10) for a known memory regression. The fix ships in Hermes 250829098.0.16, which comes with Expo SDK 57 (expo ≥ 57.0.9) / RN 0.86.2. Either ship 1.0 on SDK 56 and watch memory in TestFlight (long sessions on the 81-cell tab and Stats), or upgrade to SDK 57 first, which means a full re-test. The other two doctor failures on the build host were network-only (exp.host and React Native Directory unreachable).

## 4. Device QA (preview build or TestFlight)

Tick each one on a real iPhone. Also run one pass on an iPhone SE (small screen) and one in 다크.
The groups follow the wave notes in `docs/mp/W*.md`, where each item has its full detail.

### Release-level (plan W4-B step 6)
- [ ] Edge-swipe back from the area page, Settings and the ritual. Vertical scroll still works.
- [ ] VoiceOver through the cell editor, the action sheet, the 64/64 celebration and the toasts (each toast read once).
- [ ] Magic Tap (two-finger double tap) on the focus timer toggles pause/resume.
- [ ] Focus timer across a phone lock: unlocking shows the right elapsed time, and the screen doesn't auto-lock while it runs.
- [ ] Share → 이미지 저장: the first save shows the Korean add-only photo prompt.
- [ ] The text edit menu is Korean (붙여넣기 …).
- [ ] 설정 › Apple 계정 › iCloud › 저장 공간 관리 › 백업 lists 만다라트 > 0 KB.
- [ ] Cold start: cream launch screen → app, with no white or black frame.
- [ ] **Bold Text** on (설정 › 손쉬운 사용 › 디스플레이 및 텍스트 크기 › 굵은 텍스트): every label renders one weight heavier (400 → SemiBold, 500/600 → Bold). Toggle it while the app is open; text updates without a restart. Nothing clips at the heavier weight (tab bar, 81-cell table, the timer numeral).
- [ ] **Increase Contrast** on (same page, 대비 증가): rules and hairlines are visibly darker, faint captions read as gray body text, the dot paper is darker, and empty check boxes and rating boxes get a 2pt darker border. Check it in 다크 too. Toggling updates live.

### W1-I — release config
- [ ] Cold start cream → app; iCloud backup listing; edit menu Korean (as above).

### W2-A — today row
- [ ] Haptics: medium on check, light on un-check; one success only after the last item (from Root).
- [ ] Tick draws, then the strike grows ~230ms later. Instant with Reduce Motion. The strike sits at x-height and spans only the text, including 1-line truncated titles.
- [ ] Count row: `+1권` adds a step; crossing the goal toasts `12권 목표를 이뤘어요` once; un-checking toasts `오늘 더한 N권을 뺐어요`, and 되돌리기 restores it.
- [ ] VoiceOver: checkbox label + hint, row body, rotor `자세히 보기`, the extra's `지우기` action, `… 완료, 오늘 N개 남았어요` then Root's `오늘 할 일을 다 했어요`.
- [ ] The extra × is easy to hit without toggling the row; 지우기 → 되돌리기 restores it in place.
- [ ] `transformOrigin: 'left'` scale works on iOS.

### W2-B — 81-cell tab
- [ ] The tab opens straight on the table (no wheel, no toggle).
- [ ] Zoom swipe: horizontal steps between areas; vertical still scrolls; a flick works; taps open the sheet.
- [ ] Reduce Motion: no zoom scale, slide or coloring-in. Coloring-in plays once after completing a cell, never on cold launch.
- [ ] VoiceOver: block labels, 9 cells per block, double-tap zoom with announcement, 'longpress' actions inside the zoom, hidden table not reachable while zoomed.
- [ ] Large Content Viewer on 9pt cells at AX sizes. `hangul-word` breaks in 9pt cells.
- [ ] Haptics on open, close, step and cell press. The next-step row hides while zoomed.

### W2-C — area page
- [ ] Board taps open the sheet (no fill); long-press opens the editor; the center opens the theme editor.
- [ ] `once` check haptics; habit/count/mind squares open the sheet.
- [ ] Left-edge swipe goes back; a swipe from further in pages areas.
- [ ] VoiceOver paging announces '이름, 영역 n/8'; two-finger Z goes back; the `once` rotor action works.
- [ ] Largest Dynamic Type: 'N / 8 달성' caps at 1.35×; footer names truncate; the title wraps to 2 lines. Dark mode squares visible.

### W2-D — cell editor
- [ ] Return saves and moves to the next empty cell with the keyboard up. On the last cell it closes with '건강 8칸을 다 채웠어요'.
- [ ] Return never inserts a newline. With edits, ×/drag/two-finger Z ask '고친 내용을 버릴까요?'.
- [ ] A backdrop tap with the keyboard up only lowers the keyboard.
- [ ] VoiceOver reaches every field: counter, kind radios, chips, stepper, count-field errors.
- [ ] SE + keyboard: the save button stays pinned; every count field scrolls into view.
- [ ] Opening from the action sheet's pencil presents on iOS (afterOverlays). '칸 비우기' + 되돌리기. The decimal pad on the number fields.

### W2-E — action sheet
- [ ] Pencil, title tap and '마감 없음 · 정하기' open the editor after the sheet slides away. The locator opens the area page. '25분 집중하기' opens the timer.
- [ ] Memo typing doesn't lag; the text sits on the rules; the memo survives swipe-down and ×.
- [ ] Toasts sit in the dim band above the sheet. Back-filling and '어제도 했어요' + 되돌리기.
- [ ] Haptics: medium/light/selection; success only on reaching a count goal.
- [ ] VoiceOver: '오늘 했어요, checkbox, checked'; the rows '오늘 할 일에 담기' and '이 칸 달성' read as checkboxes with their checked state (now `LineRow`, W4-B); week-strip day labels; locator label.
- [ ] Dark mode locator/memo/bars visible. SE: the sheet scrolls and the memo stays above the keyboard.

### W2-F — quick add & pick
- [ ] QuickAdd opens with the keyboard up; the footer stays above the keyboard on SE; the underline turns ink on focus.
- [ ] Return adds and closes (does nothing when empty). Area preselection from an area page vs Home/Today.
- [ ] '빈 칸에 적기' writes into the first empty cell with a suggested kind; 되돌리기 restores it.
- [ ] Pick sheet: tick + haptic, live footer count, the '중점' label after a weekly review.
- [ ] VoiceOver: headers, checkbox rows with state, one '닫기'.
- [ ] Empty chart → '만다라트 채우기' opens the zoomed tab (no stacked modal).

### W2-G — settings
- [ ] 백업 내보내기: the share sheet offers 파일에 저장/AirDrop with `mandarat-backup-YYYY-MM-DD.json`; the toast and '마지막 백업 · 오늘' appear; cancelling does nothing. The file re-imports.
- [ ] Template over a filled chart: the native Alert; 취소 keeps the sheet; 바꾸기 + undo.
- [ ] 저장본 restore + undo. 전체 초기화 with the red 지우기 + undo.
- [ ] VoiceOver: focus on '설정', two-finger Z back, radio rows with state, colophon rows, the license link.
- [ ] Haptics; largest Dynamic Type wraps the swatch labels; the accent row fits on SE.
- [ ] After B1/B2: 개인정보 처리방침 opens Safari; 문의하기 opens Mail with the subject '만다라트 문의 1.0.0'.

### W2-H — backup import & crash page
- [ ] '백업 파일 고르기' opens Files; JSON and plain text can be picked; cancel is silent; a pasted backup with surrounding text parses.
- [ ] VoiceOver announcements once; ledger rows read as one sentence.
- [ ] '백업을 불러왔어요 · 되돌리기' ~10s, and the stale-undo message after any new check. The newer-records warning is readable in light and dark.
- [ ] The pinned footer is reachable with the keyboard up.
- [ ] Crash page (dev build, forced error): paper page, '다시 시도' re-renders, '기록 내보내기' shares the backup, which re-imports. Largest Dynamic Type.

### W2-I — onboarding
- [ ] The bottom bar rides above the keyboard; Return behavior; the underline on focus.
- [ ] Example tap fills the sketch's center live; long goals shrink to 3 lines; the caret blinks (steady with Reduce Motion).
- [ ] Template sheet: area names appear clockwise, the CTA '이 표로 시작하기', the VoiceOver announcement, 되돌리기.
- [ ] VoiceOver reading order; empty-goal CTA label; empty-goal start lands on Home.
- [ ] The recovered-store notice. SE + largest Dynamic Type.

### W2-J — focus timer & 64/64 finale
- [ ] Lock for 2 min → about 2 min and 2 boxes on unlock, with no lag. No auto-lock while running; auto-lock works again after pause, close and finish.
- [ ] × after 10 min records +10 (also Android back and two-finger Z). A paused minute isn't counted; the buttons don't jump.
- [ ] A full 25 min: one success haptic, `25분 집중을 마쳤어요`, the finish button by kind.
- [ ] Magic Tap pause/resume. Reduce Motion: static box. Largest Dynamic Type layout.
- [ ] 64/64: the paper page after sheets close, one haptic, the spiral inking, closes by tap/닫기, VoiceOver focus contained, dark + SE (닫기 not clipped).

### W2-K — weekly close (한 주 돌아보기)
- [ ] Full-screen slide up (none with Reduce Motion); readable status bar; presents while another sheet closes.
- [ ] Android back / two-finger Z go back a page, then close.
- [ ] VoiceOver page turns, numeral, ledger rows, rating radiogroup, pick checkboxes.
- [ ] Haptics including the 4th-pick warning + toast. The '한 줄 메모' scrolls above the keyboard.
- [ ] After '마치기' the toast shows and `reviews[week]` survives a restart. Largest Dynamic Type.

### W3-A — Home
- [ ] Fresh user: header, hero and guide only; the empty goal opens the center editor; one CTA.
- [ ] Hero block → Detail; center → 만다라트 tab; rotor area actions.
- [ ] Last check: the double rule draws with Root's success haptic, the gold underline and the new 正 stroke. Instant with Reduce Motion; static on revisit.
- [ ] '한 주 돌아보기' timing; '이번 주 중점' picks open their sheets.
- [ ] Largest Dynamic Type column layout; VoiceOver header/week cells/area rows; the save-failure notice.

### W3-B — Today
- [ ] The `한 줄` field scrolls above the keyboard and saves on kill/background and across midnight.
- [ ] The last check draws the double rule (one haptic total); un-check retracts it; deleting the last pending extra shows it without animation.
- [ ] VoiceOver counter, tabs, '완료 N개' header, day-close element, Magic Tap checks the top item.
- [ ] Index filter falls back to 전체 with no empty flash. The overdue red margin rule.
- [ ] Mode switch keeps mood + 한 줄; the mode survives a restart. SE: ≥ 6 rows visible.

### W3-C — Today modes
- [ ] 연속 기록: an off-day check doesn't grow the run; growing runs; caption alignment at the largest size.
- [ ] Kanban: tap advances, long-press opens the sheet only, '25분 집중'. VoiceOver heads + rotor.
- [ ] Overdue meta legible on all papers + dark. MindWeek boxes on SE. The last-week link.

### W3-D — Stats
- [ ] VoiceOver: hero numbers, week bars and heatmap each as one image; wear-map cell labels; legends skipped.
- [ ] AX sizes: the hero stacks; numerals fit; grids hold.
- [ ] 10-week square tap/untap; wear-map taps (sheet / area page / nothing).
- [ ] '돌아보기 ›' timing; read-only reviews; '더 보기'.
- [ ] Every 포인트 컬러 in light and dark. Fresh install. SE width with no horizontal scroll.

### W3-E — chart image share
- [ ] The share icon ('표 이미지로 공유') waits for open overlays. '이미지 저장·공유' → 이미지 저장 with the first-time prompt.
- [ ] The PNG is exactly 1080×1350 on a 3× and a 2× (SE) device, crisp, with even paper in 다크.
- [ ] The offscreen capture is not blank (fallback noted in W3-E.md). '빈 표' has no fills/bars/frames/count.
- [ ] The failure toast sits above the sheet; cancel is silent. Largest Dynamic Type. Empty and very long goals. A non-gold accent on the frame.

## 5. Deferred to after 1.0 (with reasons)

| Id | What | Why it waits |
|---|---|---|
| feas-6/7/8/14, feas-u3 | Notifications and reminders | Need expo-notifications, a permission flow and a 64-request planner. Planned for 1.1. No push entitlement is needed for 1.0. |
| feas-11, feas-u4, ref-u5, release-u6 | Home-screen widgets, focus Live Activity | Need expo-widgets, an App Group, a dev client and signing checks. Planned for 1.1. |
| feas-u6 | A4 print / PDF | Needs expo-print. The image share with a 빈 표 option covers 1.0. |
| perf-9, perf-up-1 | Tab keep-alive (React Activity) | Needs device verification. Per-tab scroll memory covers what users see. |
| perf-up-6 | Tiled paper bitmap | A memory tweak that needs device checks; the single screen-size SVG stays. |
| perf-7 (part), perf-up-3 (part) | Embedding fonts via the expo-font plugin | Waits for a device check of named weights. Fonts load at startup behind the native splash. |
| release-u2 | Weekly Files-app backups | Document types and URL handling need device verification. iCloud backup, file export and daily snapshots cover 1.0. |
| release-u3 | Splash tile animating into Home | Waits until the native splash has been verified on device. |
| release-u4 | Layered Liquid Glass icon | Needs Icon Composer on macOS. The light/dark/tinted PNG set stays. |
| release-u5 | App Store screenshots | No iOS simulator on the build host. The spec is in §2. |
| ref-u4 | 31-column monthly routine table | Doesn't fit 375pt. The 연속 기록 list covers the need. |
| ref-u6 | 3-step onboarding with transfer animation | Superseded by the printed 3×3 sketch. |
| ref-u7 | Picking tomorrow | Needs a new model and rollover rules. The weekly 중점 covers planning ahead. |
| ref-u9 | Year in pixels | Mostly empty for new users. The 10-week squares stay. |
| grid-up-3 | Spatial zoom with neighbor slivers | A risky animation rewrite. Zoom swipe fixes the defects. |
| ovl-up-5 | Month-calendar due picker | Presets plus ±day/±week reach any date. |
| flow-up-1 | Inline write-through in the 81 zoom | Duplicates the sequential editor (W2-D). |
| today-up-6 | 正 tally in count rows | Competes with '+1권'. 正 is used once, on Home. |
| stats-U2 | Area % chart | Superseded by the wear map. |
| stats-U6 | Week-sheet image | One share path for 1.0: the chart image. |
| corr-up-1 | Stable action IDs | A schema migration of every dayLog key. Archived positional history fixes the visible bugs. |
| corr-up-3 | Two-slot checksummed writes | Guards a near-impossible failure. Daily snapshots keep a good copy. |
| corr-up-5 | Per-day focus log | A model change for a minor display. |
| perf-up-5 | Memoized ledger index | Unnecessary after the themeStreak rewrite and W4-A memoization. |
