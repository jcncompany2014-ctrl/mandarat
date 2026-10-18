# App Store metadata (V8-B)

The App Store text and screenshots live in `store.config.json` (EAS Metadata, `configVersion: 0`). `eas metadata:push` uploads them. The final wording per locale, and what the owner still has to fill in, are in `docs/v2/V8-B.md`.

## Layout

- `apple.info.ko`, `apple.info.ja` and `apple.info.en-US` each have:
  - `title`, `subtitle`, `promoText`, `description`, `keywords` and `releaseNotes` (What's New);
  - `privacyPolicyUrl` and `supportUrl`;
  - `screenshots.APP_IPHONE_67` and `screenshots.APP_IPAD_PRO_3GEN_129`.
- The screenshots are `store/screenshots/<ko|ja|en>/<display>/<nn>-<scene>.png`, copied from `tools/store-shots/out/` (`docs/v2/store-shots.md`). The `en` folder serves `en-US`.

## Limits (checked by `tests/storeMetadata.test.js`)

| Field | Limit |
|---|---|
| Name (`title`) | 30 |
| Subtitle | 30 |
| Promotional text (`promoText`) | 170 |
| Description | 4000 |
| What's New (`releaseNotes`) | 4000 |
| Keywords, joined with commas | 100 |
| URLs | 255 |

The test also checks:
- the voice: no exclamation marks, emoji, years, "beta" or ranking claims;
- the ja/en banned words from `src/i18n/glossary.ts`;
- that each description names the shipped features;
- that the 36 PNGs exist at the right size as 8-bit RGB, with nothing extra under `store/screenshots/`.

## Editing

1. Change the text in `store.config.json`. Keep the three locales saying the same things in their own words. Follow the glossary and voice in `src/i18n/glossary.ts`: です・ます in ja with full-width punctuation, and sentence case in en.
2. `node --test tests/storeMetadata.test.js`
3. `npx eas-cli@latest metadata:lint`
4. `npx eas-cli@latest metadata:push`. It needs `eas init` once and the app record in App Store Connect.

Promotional text can be changed at any time without a new review. All the other fields go out with the next version.
