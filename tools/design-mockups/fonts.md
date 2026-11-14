# Mockup fonts

Candidate typefaces for the direction mockups. They are **not** in the app and **not** in git (`tools/design-mockups/fonts/` is ignored). The app ships Pretendard only. If a direction is chosen that uses one of these, it is added to the app as a pinned dependency in that change, with the licence checked again.

All are SIL Open Font License 1.1. Files were unpacked from these npm packages:

| Family (CSS name in `fonts.css`) | Package and version | Covers |
|---|---|---|
| MaruBuri | `@kfonts/maruburi-otf` 0.1.0 (Naver 마루 부리) | Korean serif, Latin |
| RIDIBatang | `@kfonts/ridi-batang` 0.2.0 | Korean serif, one weight |
| Hahmlet | `@expo-google-fonts/hahmlet` 0.4.1 | Korean serif |
| SUIT | `@sun-typeface/suit` 2.0.5 | Korean sans, variable |
| Instrument Serif, Fraunces, Newsreader, DM Serif Display | `@expo-google-fonts/*` 0.4.1 | Latin serif (numerals, English) |
| Barlow Condensed, Big Shoulders Display, Sofia Sans Extra Condensed, Bricolage Grotesque | `@expo-google-fonts/*` 0.4.1 | Latin display (numerals) |
| IBM Plex Mono | `@expo-google-fonts/ibm-plex-mono` 0.4.1 | Latin mono (numerals) |

To restore the folder on a new machine: `npm pack <package>@<version>`, unpack, and copy the files named in `fonts.css` into `tools/design-mockups/fonts/`.

Latin-only faces have no Hangul. Use them for digits and Latin only, and set the fallback to Pretendard in the same `font-family` list.
