# V8-C — Release docs, privacy and review notes

Branch `mp/v2-v8-c`, base `fdcb054` (after X-L).

**Gates:**
- `npm run typecheck`: clean.
- `npm test`: passes, including `tests/release.test.js`, which reads the checklist.
- `npm run prebuild-check`: passes.
- `npm run web-smoke`: passes.

These docs need no code change. No source, `package.json`, `package-lock.json`, `app.json` or `eas.json` was touched.

## 1. What was produced

| File | Content |
|---|---|
| `docs/v2/privacy.md` (new) | A privacy policy **draft** in ko, ja and en, marked for owner and legal review. It covers:<br>• local-first storage, and inclusion in the device's iCloud Backup;<br>• opt-in iCloud sync to the user's own container, with no server;<br>• Sentry crash reports: what is sent and what is not, no PII, no user text, IPs not stored, and the opt-out row;<br>• the IAP, handled by Apple;<br>• local-only notifications;<br>• the widget, Siri and App Group data that stays on the device;<br>• no tracking or analytics, add-only Photos access, deletion, children and changes.<br>A reviewer table maps every statement to the code. It ends with the matching App Privacy answers. |
| `docs/v2/review-notes.md` (new) | App Review notes:<br>• an **English** paste block: no login, where 프로 is (Home › Settings › Pro, Restore Purchase), a 7-step test path, widgets with the "open the app once" note, the Live Activity, Siri phrases in en, ko and ja (no SiriKit entitlement), iCloud needing two devices, and privacy;<br>• a short **IAP** review-notes block;<br>• a **Korean** summary for the owner;<br>• a facts table. |
| `docs/RELEASE_CHECKLIST.md` | A new **v2** section on top, with the v1 list kept below as history. The v2 section is one ordered list:<br>• v2-0 blocking inputs;<br>• v2-1 Apple capabilities;<br>• v2-2 EAS init, env and secrets;<br>• v2-3 the Sentry project, DSN, token and IP setting;<br>• v2-4 App Store Connect: agreements, app record, IAP, Family Sharing, sandbox testers, localizations, screenshots, the privacy questionnaire, availability and review notes;<br>• v2-5 build profiles, build and submit;<br>• v2-6 Maestro runs;<br>• v2-7 device QA grouped by feature (plan §8 merged with every package's items, each group tagged with its source packages);<br>• v2-8 the native-speaker string review.<br>The v1 App Privacy row is marked as superseded. The strings asserted by `tests/release.test.js` are kept. |
| `README.md` | A v2 feature table (free or pro per feature), the new scripts (`web-smoke`, `prebuild-check`, `store-shots`), the tools (Maestro and EAS Workflows, store-shots, EAS profiles), the v2 native stack, and corrected release facts (iPad, ko/ja/en, the new privacy label). |

`src/lib/appInfo.ts` was **not** changed. The plan does not give it to V8-C. Its `PRIVACY_URL` and `SUPPORT_EMAIL` placeholders, and their `TODO(owner)` comments, already exist. `release-check` behaviour is unchanged.

## 2. Open owner inputs

1. `PRIVACY_URL`: publish `docs/v2/privacy.md` after legal review. Fill in `<OPERATOR>`, `<EFFECTIVE_DATE>` and `<SUPPORT_EMAIL>`.
2. `SUPPORT_EMAIL`, and a Support URL.
3. `SENTRY_DSN` in `src/lib/crash.native.ts`, plus `SENTRY_AUTH_TOKEN` as an EAS secret, plus Sentry's "Prevent Storing of IP Addresses". The privacy text claims that last setting; if it is not turned on, delete that sentence.
4. The store name (ko is taken) and the ja/en trademark check. If the names change, update the Siri phrases in `review-notes.md`.
5. Owner confirmations 2–5, the version bump to 2.0.0, and the copyright holder.
6. In App Store Connect: the IAP price and localizations, Family Sharing, sandbox testers, availability (v1 was Korea only), and the App Privacy answer, which changes from "Data Not Collected" to Crash Data.
7. `eas login` and `eas init`, then send the `app.json` diff to the lead.

## 3. Notes for the lead

- `store.config.json` (V8-B) holds `privacyPolicyUrl` and `supportUrl` placeholders. They must point at the same pages as `PRIVACY_URL` and `SUPPORT_EMAIL`.
- After the widget QA item "added before the first launch", decide whether the review-notes sentence "open the app once" stays.
- The privacy text says Sentry receives a "screen layout" tag (`layout`) and breadcrumbs with screen names. If a fix package adds tags or breadcrumbs, update `privacy.md` and the reviewer table.
