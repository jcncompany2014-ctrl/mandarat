# V8-B — Store screenshots and App Store metadata

Branch `mp/v2-v8-b`, from the wave-8 base (`fdcb054`).

## Produced

| Path | What |
|---|---|
| `store.config.json` | EAS Metadata (`configVersion: 0`) for `ko`, `ja` and `en-US`: name, subtitle, promotional text, description, keywords, What's New, privacy and support URL placeholders, and 12 screenshots per locale. Categories: Productivity, Lifestyle. |
| `store/screenshots/<l>/APP_IPHONE_67/01-chart … 06-year.png` | 6.9" iPhone, 1320×2868, for `ko`, `ja` and `en` (the `en` folder serves `en-US`). |
| `store/screenshots/<l>/APP_IPAD_PRO_3GEN_129/01-chart … 06-year.png` | 13" iPad, 2064×2752. |
| `tools/store-shots/captions.json` | Final captions (below). |
| `tools/store-shots/fixtures/ja.js` | The ja area 「人」 is now 「つながり」. 「人」はまだです read oddly in the weekly-review sentence. |
| `tests/storeMetadata.test.js` | 16 tests: App Store limits, schema keys, tone and banned words, feature coverage, URLs, default names, and the 36 committed screenshots (size, RGB, listed in the config). |
| `docs/v2/store-metadata.md` | How to edit, check and push the metadata. |

36 PNGs, about 10 MB in total. 6 scenes × 2 displays × 3 locales, as the plan says. The 6.3" and 6.5" renders stay in the git-ignored `tools/store-shots/out/`.

## Screenshots

- **Full run:** `npm run store-shots -- --locales ko,ja,en --devices all` wrote 72 PNGs, and `verify` passed on all of them. All six scenes ran, including `ritual`, now that V5-B's testIDs are in.
- **Re-shoot:** after the caption and fixture fixes, the 6.9" and 13" sets were shot again, and then the two scenes whose captions changed once more. `verify` passed on all 72.
- **Checked by eye:**
  - every 6.9" shot in all three languages;
  - the ja iPad set;
  - the en ritual shot and the ja iPad stats shot after the last fix.

  The app chrome is fully localized in ja and en after waves 6 and 7. I found no clipped labels in the screens.

**Captions.** Each one is a short line in its own language and fits on one line: no gradient, frame or emoji.

| nn | ko | ja | en |
|---|---|---|---|
| 01 chart | 81칸에 한 해 계획을 적어요 | 81マスに一年の計画を書く | Plan your year in 81 squares |
| 02 today | 오늘 할 일은 저절로 담겨요 | 今日やることが自然にそろう | Today’s list fills itself in |
| 03 home | 하루를 수첩처럼 닫아요 | 一日を手帳のように締める | Close each day like a ledger |
| 04 stats | 자주 한 칸일수록 짙어져요 | よく続けたマスほど濃くなる | Busy squares grow darker |
| 05 ritual | 일요일엔 한 주를 돌아봐요 | 日曜日に一週間をふりかえる | Look back every Sunday |
| 06 year | 한 해를 한 장으로 돌아봐요 | 一年を一枚でふりかえる | Your year on a single page |

**Caption changes from V5-D:**
- **en:** home, stats, ritual and year were shortened. The old lines wrapped onto a second line with one word left over ("Your whole year on one / page").
- **ja:** uses the glossary spelling ふりかえる (not ふり返る), and 締める for the day close, as in X-D.
- **ko:** stats now reads 자주 한 칸일수록 짙어져요.

## Metadata per locale

Rules followed:
- The glossary terms: マス / square, 行動 / action, 分野 / area, 週のふりかえり / Weekly review, 保管庫 / Archive, 同期 / Sync.
- The banned words (`BANNED_JA`, `BANNED_EN`, so no データ / data and no 完了 / complete).
- No exclamation marks, emoji, years or ranking claims.

The descriptions name only features that exist in this build:
- the 81-square chart, Today, the day close, records, the weekly review and the year review;
- reminders, Home Screen and Lock Screen widgets, the focus timer Live Activity, and Siri and Shortcuts. The quoted Siri phrases are the real `AppShortcuts.strings` ones;
- printing on A4/Letter, which is free;
- iCloud sync on the same Apple Account, and the two-page iPad spread;
- no sign-in, and the three languages;
- the Pro list, exactly as in `pro.ts`: paper patterns, widget paper, A3/A5/B5 and area pages, and the archive.

Each description also says that everything that is free now stays free (owner decision 3). App names are left out of the keywords: Apple already indexes the name, and leaving them out also keeps the keywords clear of the trademark question.

### ko (한국어)

| Field | Text | Length / limit |
|---|---|---|
| Name (`title`) | 만다라트 | 4 / 30 |
| Subtitle | 81칸에 적는 한 해 계획 | 14 / 30 |
| Promotional text (`promoText`) | 가운데에 목표 하나, 둘레에 영역 여덟, 바깥에 실천 64. 한 해 계획을 81칸 한 장에 적고, 오늘 할 일부터 하나씩 해 나가요. | 74 / 170 |
| Keywords | 목표,체크리스트,계획,습관,플래너,다이어리,루틴,회고,투두,수첩,위젯,연간계획 | 43 / 100 |

**Description** (995 / 4000)

```text
가운데 칸에 한 해의 핵심 목표를 적고, 둘레 여덟 칸에 영역을, 그 바깥 64칸에 실천을 적어요. 종이에 그리던 만다라트 표를 그대로 옮겨, 81칸 한 장으로 한 해를 계획합니다.

표를 다 채운 다음에는 날마다 쓰는 수첩이 돼요.

오늘 할 일
반복하는 습관과 마감이 다가온 실천이 오늘 목록에 저절로 담겨요. 필요한 것은 직접 골라 담을 수도 있어요.

하루 마감
다 하면 장부처럼 두 줄을 긋고 하루를 닫아요. 한 줄 메모도 남길 수 있어요.

기록
자주 한 칸일수록 표가 짙어져, 어느 영역에 힘을 썼고 어디가 비었는지 한눈에 보여요. 연속 기록과 영역별 실천 수도 함께 볼 수 있어요.

한 주 돌아보기
일요일 저녁, 몇 분이면 지난주를 돌아보고 다음 주 중점을 골라요.

한 해 돌아보기
한 해의 기록을 한 장으로 돌아보고, 다 쓴 표는 닫아서 보관해요.

그 밖에
• 알림: 아침에 오늘 할 일, 저녁에 남은 일, 일요일에 한 주 돌아보기를 알려 줘요.
• 위젯: 홈 화면과 잠금 화면에서 오늘 할 일을 보고 바로 체크해요.
• 집중 타이머: 25분 동안 한 가지에 집중하고, 잠금 화면에서 남은 시간을 봐요.
• Siri와 단축어: “만다라트 오늘 보기”, “만다라트 다음 할 일 체크”처럼 말로 열고 체크해요.
• 인쇄: 81칸 표를 A4(미국·캐나다는 레터) PDF로 만들어 인쇄하거나 공유해요.
• iCloud: 같은 Apple 계정의 아이폰과 아이패드끼리 기록을 맞춰요.
• 아이패드: 넓은 화면에서는 펼친 수첩처럼 두 쪽을 나란히 보여 줘요.
• 한국어, 일본어, 영어

로그인은 없어요. 기록은 기기 안에 저장되고, iCloud 맞추기를 켜면 본인의 iCloud에만 올라가요.

프로
지금 쓸 수 있는 기능은 모두 무료예요. 프로는 한 번 결제로 아래를 더 열어요.
• 모눈 · 줄 · 무지 종이 무늬
• 고른 종이 무늬를 그리는 위젯
• A3 · A5 · B5 인쇄와 영역별 페이지
• 지난 표 보관함: 지난 표와 그해 돌아보기를 다시 열고 인쇄하기
```

**What’s New** (`releaseNotes`, 239 / 4000)

```text
버전 2.0
• 일본어와 영어를 더했어요.
• 아이패드에서도 써요. 넓은 화면에서는 두 쪽을 펼쳐 보여 줘요.
• 홈 화면 · 잠금 화면 위젯과 알림이 생겼어요.
• 한 해 돌아보기와 지난 표 보관함이 생겼어요.
• 81칸 표를 PDF로 인쇄해요.
• 같은 Apple 계정의 아이폰과 아이패드끼리 iCloud로 기록을 맞춰요.
• 집중 타이머가 잠금 화면에 남은 시간을 보여 줘요.
• Siri와 단축어로 오늘 할 일을 열어요.
```

### ja (日本語)

| Field | Text | Length / limit |
|---|---|---|
| Name (`title`) | マンダラート | 6 / 30 |
| Subtitle | 81マスで立てる一年の計画 | 13 / 30 |
| Promotional text (`promoText`) | まん中に目標をひとつ、まわりに分野を8つ、その外に行動を64。一年の計画を81マスの一枚に書き、今日やることからひとつずつ進めます。 | 66 / 170 |
| Keywords | 目標,チェックリスト,目標達成,計画,習慣,手帳,プランナー,ルーティン,ふりかえり,ToDo,ウィジェット,年間計画 | 59 / 100 |

**Description** (910 / 4000)

```text
まん中のマスに一年の中心の目標を、まわりの8マスに分野を、その外の64マスに行動を書きます。紙に書いていたマンダラートの表をそのまま、81マスの一枚で一年を計画します。

表ができあがったら、毎日使う手帳になります。

今日やること
くり返す習慣と締め切りの近い行動が、今日のリストに自然に入ります。自分で選んで入れることもできます。

一日の締め
ぜんぶ終えたら、帳簿のように二本線を引いて一日を締めます。ひとことメモも残せます。

記録
よく取り組んだマスほど表が濃くなり、どの分野に力を注ぎ、どこが手つかずかがひと目でわかります。連続記録や分野ごとの回数も見られます。

週のふりかえり
日曜の夜、数分で先週をふりかえり、来週の重点を選びます。

一年のふりかえり
一年の記録を一枚でふりかえり、使い終えた表は閉じて保管します。

そのほか
・通知：朝は今日やること、夜は残り、日曜は週のふりかえりをお知らせします。
・ウィジェット：ホーム画面とロック画面で今日やることを見て、その場でチェックできます。
・集中タイマー：25分間ひとつのことに集中し、残り時間をロック画面で確認できます。
・Siriとショートカット：「マンダラートで今日を見る」「マンダラートで次をできたにする」のように声で開いたり、チェックしたりできます。
・印刷：81マスの表をA4（米国・カナダはレター）のPDFにして、印刷や共有ができます。
・iCloud：同じApple AccountのiPhoneとiPadのあいだで記録を同期します。
・iPad：広い画面では、開いた手帳のように2ページを並べて表示します。
・日本語、韓国語、英語

ログインはありません。記録は端末の中に保存され、iCloud同期をオンにしたときだけ、ご自身のiCloudに保存されます。

プロ
いま使える機能はすべて無料です。プロは一度の購入で、次の機能が使えるようになります。
・方眼・罫線・無地の紙の柄
・選んだ紙の柄で描くウィジェット
・A3・A5・B5の印刷と分野ごとのページ
・過去の表の保管庫：過去の表とその年のふりかえりを開き直し、印刷できます
```

**What’s New** (`releaseNotes`, 240 / 4000)

```text
バージョン2.0
・日本語と英語に対応しました。
・iPadに対応しました。広い画面では2ページを開いて表示します。
・ホーム画面とロック画面のウィジェット、通知が加わりました。
・一年のふりかえりと過去の表の保管庫が加わりました。
・81マスの表をPDFで印刷できます。
・同じApple AccountのiPhoneとiPadのあいだで、iCloudで記録を同期します。
・集中タイマーの残り時間をロック画面に表示します。
・Siriとショートカットで今日やることを開けます。
```

### en-US (English)

| Field | Text | Length / limit |
|---|---|---|
| Name (`title`) | Mandalart | 9 / 30 |
| Subtitle | Plan your year in 81 squares | 28 / 30 |
| Promotional text (`promoText`) | One goal in the middle, eight areas around it, 64 actions around those. Write your year on a single 81-square chart, then work through it one day at a time. | 156 / 170 |
| Keywords | goals,checklist,goal setting,planner,habit,yearly plan,notebook,routine,review,to do,widget | 91 / 100 |

**Description** (1928 / 4000)

```text
Write your core goal for the year in the center square, eight areas around it, and 64 actions around those. It is the Mandalart chart you may have drawn on paper, kept as one page of 81 squares.

Once the chart is filled in, it becomes a notebook you use every day.

Today
Repeating habits and actions that are coming due land on Today’s list on their own. You can add anything else yourself.

Close the day
When everything is done, draw two lines under it like a ledger and close the day. Leave a one-line note if you like.

Records
The squares you work on most grow darker, so you can see where your effort went and which areas are still empty. Streaks and counts per area are there too.

Weekly review
On Sunday evening, take a few minutes to look back on the week and pick next week’s focus.

Year review
See your whole year on one page, then close the chart and keep it.

Also
• Reminders: Today’s list in the morning, what’s left in the evening, and the weekly review on Sunday.
• Widgets: see Today’s list on the Home Screen and Lock Screen and check things off there.
• Focus timer: 25 minutes on one thing, with the time left on the Lock Screen.
• Siri and Shortcuts: say “Show Today in Mandalart” or “Check off the next one in Mandalart”.
• Print: turn the 81-square chart into a Letter or A4 PDF to print or share.
• iCloud: keep your records in sync between iPhone and iPad on the same Apple Account.
• iPad: on a wide screen, two pages side by side like an open notebook.
• English, Japanese and Korean

There is no sign-in. Your records are stored on your device, and only go to your own iCloud if you turn on iCloud sync.

Pro
Everything you can use now is free. Pro is a one-time purchase that adds:
• Grid, lined and plain paper patterns
• Widgets drawn on the paper pattern you chose
• A3, A5 and B5 print sizes, with a page per area
• Archive of past charts: open, review and print the charts of earlier years
```

**What’s New** (`releaseNotes`, 408 / 4000)

```text
Version 2.0
• Now in Japanese and English.
• Works on iPad, with a two-page spread on wide screens.
• Home Screen and Lock Screen widgets, and reminders.
• A year review, and an archive for past charts.
• Print the 81-square chart as a PDF.
• iCloud sync between iPhone and iPad on the same Apple Account.
• The focus timer shows the time left on the Lock Screen.
• Open Today’s list with Siri and Shortcuts.
```

## The owner must fill in or confirm

1. **Names (plan §1.3, confirmation 1).** The defaults are `만다라트`, `マンダラート` and `Mandalart`. "マンダラート" / "Mandal-Art" are reported to be registered trademarks of クローバ経営研究所 in Japan. Check them before submitting. If they must change, change `title` in `store.config.json` and the names in `locales/ja.json` / `locales/en.json` together. The descriptions also say マンダラート / Mandalart in the Siri phrase and in the chart's name.
2. **URLs.** `privacyPolicyUrl` and `supportUrl` are `https://TODO.invalid/privacy` and `https://TODO.invalid/support` in all three locales. Replace them with the real pages. They should be the same pages as `PRIVACY_URL` / `SUPPORT_EMAIL` in `src/lib/appInfo.ts`, and the privacy text comes from V8-C's `docs/v2/privacy.md`. App Store Connect rejects the `.invalid` hosts, so the push fails until they are set. Optional: `marketingUrl`.
3. **Version in What's New.** The notes start with "버전 2.0 / バージョン2.0 / Version 2.0", following the proposed `2.0.0` in plan §1.2. Change the first line if the release version differs.
4. **Category.** Primary `PRODUCTIVITY`, secondary `LIFESTYLE` (from V5-D). Change them in `apple.categories` if you prefer.
5. **Japanese caption font.** The sandbox has no Hiragino, so the ja captions were drawn in the fallback Japanese font. For the final Hiragino Sans W6 look, re-run on a Mac (below) before pushing. The ko/en captions use Pretendard and need no re-shoot.
6. **Not in `store.config.json`:** the App Privacy questionnaire (Crash Data via Sentry, §1.2), age rating, price and the in-app purchase. Set these in App Store Connect.

## How to push

```sh
npx eas-cli@latest login
npx eas-cli@latest init                 # once: writes extra.eas.projectId and owner into app.json (send the diff to the lead)
# fill in the TODO URLs in store.config.json
npx eas-cli@latest metadata:lint        # validates the config locally
npx eas-cli@latest metadata:push        # uploads text and screenshots to the app's draft version in App Store Connect
```

- `metadata:push` needs the app record in App Store Connect (plan §1.2) and an Apple sign-in or an App Store Connect API key.
- It writes to the version being prepared. Check the result in App Store Connect before submitting.
- The ja and en localizations are created if they don't exist.

To re-shoot after a UI change:

```sh
npm --prefix tools/store-shots ci
npm run store-shots -- --locales ko,ja,en --devices iphone-6.9,ipad-13
# copy out/<l>/iphone-6.9 → store/screenshots/<l>/APP_IPHONE_67 and out/<l>/ipad-13 → store/screenshots/<l>/APP_IPAD_PRO_3GEN_129
node --test tests/storeMetadata.test.js
```

## Verification

- `npx eas-cli@25.1.1 metadata:lint` (from a scratch install, not added to the repo): "✅ Store configuration is valid."
- `npm --prefix tools/store-shots run verify`: all 72 PNGs have the right size and are RGB with no alpha.
- `npm run typecheck`, `npm test`, `npm run prebuild-check` and `npm run web-smoke`: see the gate results in the commit/PR notes.

## Handoffs

- **V5-D tool (`scenes.js`, not owned here):** on the 13" iPad the `stats` scene scrolls the left page so that its top shows the end of the mind-rating rows above the wear map. It is acceptable, but a `TID.statsWear` scroll target would frame it cleanly.
- **App (not owned here):** on the year page the focus figure wraps onto two lines on 6.9" (`19시간 45분`, `19時間45分`, `19 hr 45 min`).

## Device QA

- Run `eas metadata:push` once and confirm that App Store Connect accepts all 36 RGB PNGs at both display types and every text field in the three locales.
- Compare `03-home` on the 6.9" iPhone with the EAS preview build.
