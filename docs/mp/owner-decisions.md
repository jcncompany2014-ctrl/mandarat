# Owner decisions (override plan.md where they conflict)

Answered by the owner on 2026-10-13:

1. Scope: implement ALL waves; deliver a patch after each wave.
2. D1 CONFIRMED — remove the mandala wheel; the 만다라트 tab is the printed 81-cell table (block zoom replaces the bloom).
3. D2 REJECTED — KEEP the 포인트 컬러 (accent color) choice.
   - Do NOT migrate stored accents to GOLD (W1-A step 2a: keep the existing migrateAccent behavior). Drop the "accent → GOLD" migrate tests.
   - W1-D: keep the ACCENTS list and migrateAccent as they are (you may fix an accent that fails contrast, keeping its hue). Any "goldInk" text token must be derived from the CURRENT accent (e.g. accentInk(M): a darkened/lightened M.accent that reaches 4.5:1 on M.bg), so text in the accent color stays readable for every accent choice. Keep GOLD as the default.
   - W1-C: remove '포인트 컬러' from BANNED_COPY.
   - W2-G Settings: KEEP the 포인트 컬러 row, restyled in the ruled-paper language (a ruled radio list or a row of plain swatches with a square check; no pill chips, no tinted tiles).
   - D3 primary buttons: fill M.accent with readableOn(M.accent) text (works for any accent).
4. D12 CONFIRMED — Stats: radar, InsightCard and ranked ledger are replaced by the wear map (the user's 81-cell chart inked by the last 4 weeks of practice).
5. D9 (keep the three Today modes, renamed 목록 · 연속 기록 · 보드) — not objected; proceed.
6. W1-I: KEEP the app.json "scheme": "mandarat" (needed later for widget/deep links); everything else in W1-I stands.
7. Store name / PRIVACY_URL / SUPPORT_EMAIL / copyright: not provided yet. Leave constants empty with TODO comments (links hidden while empty, as planned).
