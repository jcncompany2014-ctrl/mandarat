# 만다라트 v2 — support page (ko · ja · en)

> The App Store listing needs a Support URL that leads to a page with contact information (App Review Guideline 1.5). This is that page.
>
> **Published:** https://mandarat-delta.vercel.app/support (`?lang=ko|ja|en`), `SUPPORT_URL` in `src/lib/appInfo.ts`. The page `public/support.html` is generated from the three sections below by `npm run support-page` (`scripts/support-page.js`, shared frame in `scripts/site-page.js`). Edit this file, then regenerate; `tests/supportPage.test.js` fails if the page is stale.
>
> Placeholders the generator fills:
> - `<SUPPORT_EMAIL>`: `SUPPORT_EMAIL` in `src/lib/appInfo.ts`. A line that holds only this placeholder becomes the e-mail button.
> - `<PRIVACY_URL>`: `PRIVACY_URL` with `?lang=` for the section's language.
>
> Rules for the text:
> - Menu names are the ones the app shows in that language (`src/i18n/<lang>/settings.ts`, `sync.ts`, `notify.ts`, `widget.ts`, `year.ts`). The test checks the names listed in `tests/supportPage.test.js`; if a catalog name changes, change it here too.
> - Each answer is backed by the code. The table at the end lists the sources. If the behaviour changes, update this file.
> - Voice as in `src/i18n/glossary.ts` (`VOICE`): 해요체, です・ます, plain English; no exclamation marks, no emoji. Do not name other mobile platforms (App Review Guideline 2.3.10).

---

## 한국어 — 도움말과 문의

쓰다가 막히는 곳이 있으면 아래 자주 묻는 질문을 먼저 살펴보세요. 답을 찾지 못했다면 메일로 알려 주세요.

### 문의하기

`<SUPPORT_EMAIL>`

아래 내용을 함께 적어 주시면 더 빨리 살펴볼 수 있어요.
- 쓰는 기기(예: iPhone 15, iPad Air)
- iOS 또는 iPadOS 버전
- 앱 버전(앱의 설정 › 정보에 있는 ‘판’)
- 어느 화면에서 무엇을 했을 때 생긴 일인지

앱의 설정 › 정보 › 문의하기를 누르면 제목에 앱 버전이 적힌 메일이 바로 열려요.

### 자주 묻는 질문

> 아래에서 ‘설정’은 앱 안의 설정 화면이에요. 기기의 설정 앱은 ‘iPhone 설정’이라고 적었고, iPad에서도 같아요.

#### 위젯에 오류가 보이거나 아무것도 나오지 않아요
위젯은 앱이 열릴 때 준비해 둔 오늘 목록을 보여 줘요. 앱을 설치하고 아직 한 번도 열지 않았다면 보여 줄 내용이 없어요. 앱을 한 번 열어 첫 화면을 마친 다음 위젯을 추가해 주세요. 이미 추가한 위젯이 그대로라면 지웠다가 다시 추가해 보세요.

‘오늘 담은 일이 없어요’라고 나온다면 오류가 아니에요. 오늘 목록에 할 일이 생기면 위젯에도 나타나요.

#### iPhone과 iPad에서 같은 기록을 보고 싶어요
설정 › iCloud와 백업에서 ‘iCloud로 기기끼리 맞추기’를 켜 주세요. 처음에는 꺼져 있어요. 두 기기가 같은 Apple 계정으로 로그인되어 있고, 양쪽 모두 iCloud Drive가 켜져 있어야 해요(iPhone 설정 › Apple 계정 › iCloud › iCloud Drive).

두 기기에 이미 기록이 있다면 처음 켤 때 어떻게 맞출지 물어봐요. 둘을 합칠 수도 있고, 한쪽 기록으로 바꿀 수도 있어요. 고르기 전 모습은 설정 › 저장본에 남아요.

#### 기기마다 기록이 달라요
- 두 기기에서 모두 앱을 열어 주세요. 앱을 열 때와 기록을 고친 뒤에 맞춰요.
- 설정 › iCloud와 백업에서 ‘지금 맞추기’를 눌러 보세요. 문제가 있으면 바로 아래에 까닭이 나와요.
- 두 기기가 같은 Apple 계정을 쓰는지, iCloud Drive가 켜져 있는지 확인해 주세요.
- 두 기기의 앱을 모두 최신 버전으로 업데이트해 주세요.

같은 칸을 두 기기에서 다르게 고쳤다면 나중에 고친 쪽이 남아요.

#### 기록을 옮기거나 따로 보관하고 싶어요
설정 › iCloud와 백업 › 백업 내보내기를 누르면 기록이 파일 하나(.json)로 만들어져요. 공유 창에서 ‘파일에 저장’을 고르거나 AirDrop, 메일로 보내 보관해 두세요.

되살릴 때는 설정 › iCloud와 백업 › 백업 불러오기에서 그 파일을 고르면 돼요. 지금 기록이 백업 내용으로 바뀌고, 바꾼 직후에는 되돌릴 수 있어요.

새 iPhone으로 바꿀 때 iCloud 백업에서 복원하면 기록도 함께 옮겨져요. iCloud 백업을 꺼 두었다면 바꾸기 전에 백업을 내보내 두세요.

#### 며칠 전 기록으로 되돌리고 싶어요
설정 › iCloud와 백업 › 저장본을 열어 보세요. 앱이 하루에 한 번, 최근 7일치 기록을 저절로 남겨 둬요. 날짜를 고르면 그날의 기록으로 되돌리고, 되돌린 직후에는 원래대로 돌릴 수 있어요.

#### 기록을 모두 지우고 싶어요
설정 › 새로 시작 › 전체 초기화를 누르면 핵심 목표, 실천 64칸, 했어요 기록이 지워져요. 지운 직후에는 되돌릴 수 있어요. iCloud로 맞추고 있다면 다른 기기에서도 지워져요.

지난 표 보관함에 넣어 둔 표와 최근 저장본은 남아요. 하나도 남기지 않으려면 앱을 삭제해 주세요. 앱을 삭제하면 기기 안의 기록이 모두 지워져요.

iCloud에 맞춰 둔 기록은 iPhone 설정 › Apple 계정 › iCloud › 저장 공간 관리에서 만다라트를 골라 지울 수 있어요.

#### 알림이 오지 않아요
- iPhone 설정 › 알림 › 만다라트에서 ‘알림 허용’이 켜져 있는지 확인해 주세요.
- 설정 › 알림을 열어 보세요. 이 기기에서 알림이 꺼져 있으면 목록 아래에 안내와 버튼이 나와요. 알림을 받을지는 기기마다 따로 정해요.
- ‘아침에 오늘 할 일’은 할 일이 있는 날에만, ‘저녁에 남은 일’은 남은 일이 있는 날에만 와요.
- 알림은 서버에서 보내는 것이 아니라, 앱이 이 기기에 최대 2주치를 미리 걸어 두는 방식이에요. 2주 넘게 앱을 열지 않았다면 한 번 열어 주세요.

#### 계정을 만들거나 돈을 내야 하나요
아니요. 계정도 로그인도 없고, 모든 기능이 무료예요. 결제도 광고도 없어요. 기록은 기기 안에 저장되고, iCloud로 맞추기를 켰을 때만 내 iCloud에 올라가요. 더 자세한 내용은 [개인정보 처리방침](<PRIVACY_URL>)에 있어요.

---

## 日本語 — サポート

使っていて困ったときは、まず下の「よくある質問」をご覧ください。解決しない場合は、メールでお知らせください。

### お問い合わせ

`<SUPPORT_EMAIL>`

次の内容を書き添えていただくと、早く確認できます。
- お使いの端末（例：iPhone 15、iPad Air）
- iOSまたはiPadOSのバージョン
- アプリのバージョン（アプリの「設定」›「情報」にある「版」）
- どの画面で、何をしたときに起きたか

アプリの「設定」›「情報」›「お問い合わせ」を押すと、件名にアプリのバージョンが入ったメールが開きます。

### よくある質問

> 以下の「設定」は、アプリの中の設定画面を指します。端末の設定アプリは「iPhoneの設定」と書いています。iPadでも同じです。

#### ウィジェットにエラーが出る、何も表示されない
ウィジェットは、アプリを開いたときに用意される今日のリストを表示します。インストールしてから一度も開いていないと、表示する内容がありません。アプリを一度開いて最初の画面を終えてから、ウィジェットを追加してください。追加済みのウィジェットが変わらないときは、いったん削除してから追加し直してください。

「今日やることはありません」と表示されるのは、エラーではありません。今日のリストにやることが入ると、ウィジェットにも表示されます。

#### iPhoneとiPadで同じ記録を使いたい
「設定」›「iCloudとバックアップ」で「iCloudで端末どうしを同期」をオンにしてください。初期状態ではオフです。両方の端末で同じAppleアカウントにサインインし、iCloud Driveをオンにしておく必要があります（「iPhoneの設定」›「Appleアカウント」›「iCloud」›「iCloud Drive」）。

両方の端末にすでに記録がある場合は、初めてオンにするときに同期のしかたを選びます。両方をまとめることも、どちらかの記録に切り替えることもできます。選ぶ前の状態は「設定」›「保存コピー」に残ります。

#### 端末によって記録が違う
- 両方の端末でアプリを開いてください。同期は、アプリを開いたときと、記録を変えたあとに行います。
- 「設定」›「iCloudとバックアップ」の「今すぐ同期」を押してください。問題があるときは、すぐ下に理由が表示されます。
- 両方の端末が同じAppleアカウントを使っているか、iCloud Driveがオンになっているかを確認してください。
- 両方の端末で、アプリを最新のバージョンにアップデートしてください。

同じマスを2つの端末で別々に編集した場合は、あとで編集したほうが残ります。

#### 記録を移したい、手元に残しておきたい
「設定」›「iCloudとバックアップ」›「バックアップを書き出す」を押すと、記録が1つのファイル（.json）になります。共有シートで「“ファイル”に保存」を選ぶか、AirDropやメールで送って保管してください。

戻すときは、「設定」›「iCloudとバックアップ」›「バックアップを読み込む」でそのファイルを選びます。今の記録がバックアップの内容に置き換わり、置き換えた直後なら元に戻せます。

新しいiPhoneに替えるときは、iCloudバックアップから復元すれば記録も一緒に移ります。iCloudバックアップをオフにしている場合は、替える前にバックアップを書き出しておいてください。

#### 数日前の記録に戻したい
「設定」›「iCloudとバックアップ」›「保存コピー」を開いてください。アプリが1日1回、直近7日分の記録を自動で残しています。日付を選ぶとその日の記録に戻り、戻した直後なら元に戻せます。

#### 記録をすべて消したい
「設定」›「新しく始める」›「すべてリセット」を押すと、中心の目標、行動64マス、できた記録が消えます。消した直後なら元に戻せます。iCloudで同期している場合は、ほかの端末でも消えます。

「過去の表の保管庫」に入れた表と、最近の保存コピーは残ります。何も残したくない場合は、アプリを削除してください。アプリを削除すると、端末内の記録はすべて消えます。

iCloudに同期した記録は、「iPhoneの設定」›「Appleアカウント」›「iCloud」›「ストレージを管理」でマンダラートを選んで削除できます。

#### 通知が届かない
- 「iPhoneの設定」›「通知」›「マンダラート」で、「通知を許可」がオンになっているか確認してください。
- 「設定」›「通知」を開いてください。この端末で通知がオフになっているときは、リストの下に案内とボタンが表示されます。通知を受け取るかどうかは、端末ごとに決めます。
- 「朝に今日やること」はやることがある日だけ、「夜に残っていること」は残りがある日だけ届きます。
- 通知はサーバーから送るものではなく、アプリがこの端末に最大2週間分を予約しておくしくみです。2週間以上アプリを開いていない場合は、一度開いてください。

#### アカウントの登録や支払いは必要ですか
いいえ。アカウントもログインもなく、すべての機能を無料で使えます。課金も広告もありません。記録は端末の中に保存され、iCloud同期をオンにしたときだけ、ご自身のiCloudに保存されます。詳しくは[プライバシーポリシー](<PRIVACY_URL>)をご覧ください。

---

## English — Support

If something isn't working, the common questions below may help. If they don't, send us an email.

### Contact

`<SUPPORT_EMAIL>`

We can look into it faster if you include:
- Your device (for example, iPhone 15 or iPad Air)
- Your iOS or iPadOS version
- The app version (Settings › About › Version in the app)
- Which screen you were on and what you did

In the app, Settings › About › Contact us opens an email with the app version already in the subject.

### Common questions

> Below, Settings means the Settings screen inside the app. The device's own Settings app is written as iPhone Settings, and it works the same on iPad.

#### The widget shows an error or stays empty
The widget shows Today's list, which the app prepares when it opens. If you haven't opened the app since installing it, there is nothing to show yet. Open the app once, finish the first screen, then add the widget. If a widget you already added doesn't change, remove it and add it again.

“Nothing on Today yet” is not an error. Once something is on Today's list, the widget shows it too.

#### I want the same records on my iPhone and iPad
Turn on “Sync devices with iCloud” under Settings › iCloud and backup. It is off to begin with. Both devices need to be signed in to the same Apple Account with iCloud Drive turned on (iPhone Settings › Apple Account › iCloud › iCloud Drive).

If both devices already have records, the app asks how to sync the first time you turn it on. You can combine both or switch to one side's records. A copy from before your choice is kept in Settings › Saved copies.

#### My devices show different records
- Open the app on both devices. It syncs when you open it and after you change something.
- Tap “Sync now” under Settings › iCloud and backup. If something is wrong, the reason appears just below.
- Check that both devices use the same Apple Account and have iCloud Drive turned on.
- Update the app to the latest version on both devices.

If the same square was changed differently on two devices, the later change stays.

#### I want to move my records or keep a copy
Settings › iCloud and backup › Export backup turns your records into a single file (.json). In the share sheet, choose Save to Files, or send it by AirDrop or Mail to keep it somewhere safe.

To bring your records back, choose that file under Settings › iCloud and backup › Import backup. Your current records are replaced by the backup, and you can undo right after.

When you move to a new iPhone, restoring from iCloud Backup brings your records along. If iCloud Backup is off, export a backup before you switch.

#### I want to go back to an earlier day
Open Settings › iCloud and backup › Saved copies. The app keeps a copy once a day, for the last 7 days. Choose a date to go back to that day's records. You can undo right after.

#### I want to delete all my records
Settings › Start over › Reset everything erases your core goal, all 64 action squares and your Done history. You can undo right after. If you sync with iCloud, they are erased on your other devices too.

Past charts in the Archive and recent saved copies stay. To leave nothing behind, delete the app. Deleting the app removes every record on the device.

Records synced to iCloud can be deleted in iPhone Settings › Apple Account › iCloud › Manage Storage, under Mandalart.

#### Reminders aren't arriving
- In iPhone Settings › Notifications › Mandalart, check that Allow Notifications is on.
- Open Settings › Reminders. If notifications are off for this device, a note and a button appear below the list. Each device decides for itself whether to show reminders.
- “Morning: Today's list” only arrives on days with something planned, and “Evening: what's left” only when something is left.
- Reminders are not sent from a server. The app schedules up to two weeks of them on the device. If you haven't opened the app for more than two weeks, open it once.

#### Do I need an account, or do I have to pay?
No. There is no account and no sign-in, and every feature is free. There are no purchases and no ads. Your records are stored on your device, and only go to your own iCloud if you turn on iCloud sync. The [privacy policy](<PRIVACY_URL>) has the details.

---

## For the reviewer: where each answer comes from

| Answer | Source in the repo |
|---|---|
| Contact: the version is under Settings › 정보, and 문의하기 opens a mail with the version in the subject | `src/screens/Settings.tsx` (정보 section: `ColophonRow` `colVersion` = `APP_VERSION`; `TextLink` `contact` opens `supportMailto()`), `src/lib/appInfo.ts` (`mailSubject({ version })`). |
| Widget: open the app once, then add it | `src/widgets/bridge.ios.ts`: `createWidget` writes the widget layout to the App Group when the app first loads, so a widget added before the first launch has nothing to draw. `src/hosts/WidgetSync.tsx` writes the timeline only after onboarding. The empty line is `widget.empty` (`src/widgets/TodayWidget.ios.tsx`). Also in `docs/v2/review-notes.md`. |
| iCloud sync: off by default, same Apple Account, iCloud Drive on, first-time choice | `src/screens/settings/SyncSection.tsx` (toggle `sync.toggle` under `settings.secCloud`, row `sync.now` while on), `src/screens/settings/syncView.ts` (`noAccount`, `driveOff`, `accountChanged`, `newerApp` notices under the rows), `src/screens/settings/SyncChoiceSheet.tsx` (`merge` · `adopt` · `mine`, `copyNote`). |
| Devices differ: when it syncs, later change stays | `src/hosts/ICloudSync.tsx` (pull at boot and on foreground, push 5 s after an edit and on background), `sync.mergeSub`, `docs/v2/V4-A.md`. |
| Backup export and import | `src/lib/shareFile.ts` (`mandarat-backup-YYYY-MM-DD.json` through the share sheet), `src/overlays/BackupImport.tsx` (choose a file or paste the text; `backup.sheetBody`: replaced, undo right after). Device backup: `RCTAsyncStorageExcludeFromBackup: false` in `app.json`, `settings.storageNoteBackup`. |
| Saved copies: once a day, 7 kept | `src/store/MandaratContext.tsx` (`mandarat:snap:YYYY-MM-DD`, `SNAP_KEEP = 7`), `settings.snapBody`, `snapAskBody`. |
| Reset: what it erases, what stays, other devices | `settings.resetAskBody`; `resetDoc` in `src/lib/archive.ts` keeps `settings` and `archives`; saved copies are separate keys and are not touched; with sync on the reset is a new epoch that the other devices follow (`src/lib/syncLocal.ts` `epochReset`, `docs/v2/V4-A.md`). iCloud container `iCloud.com.jcncompany.mandarat`. |
| Reminders: permission, per device, only when there is something, two weeks | `src/screens/settings/NotifySection.tsx` (`denied` · `undetermined` notices, `device` · `deviceAlso` row), `src/lib/reminders.ts` (`REMINDER_DAYS = 14`, morning and evening skip empty days), `src/lib/notifier.native.ts` (local schedule only). |
| No account, no payment, no ads | No login code; `STORE_OPEN = false` in `src/lib/pro.ts`; no ad or analytics SDK in `package.json`. Same as `docs/v2/privacy.md`. |
