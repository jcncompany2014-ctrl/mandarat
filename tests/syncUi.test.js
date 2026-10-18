// V5-E 설정 › iCloud · 고르기 시트 · 온보딩 가져오기 — 상태 이름이 언제나 이름공간의 글로 바뀌고,
// 미리 골라 둔 것이 없고, 가져오기 줄은 다른 기기 파일이 있을 때만, 웹에서는 맞추기를 부르지 않는다.
require('./register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { msg, LANGS } = require('../src/i18n');
const view = require('../src/screens/settings/syncView');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PHASES = ['off', 'checking', 'needsChoice', 'syncing', 'idle', 'problem'];
const PROBLEMS = ['noAccount', 'driveOff', 'accountChanged', 'tooLarge', 'ioError', 'newerApp'];
const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);

/** 글이 그 언어 이름공간의 값(또는 그 값으로 만든 글)인가 */
function fromCatalog(t, text) {
  const values = Object.values(t.sync).filter((v) => typeof v === 'string');
  if (values.includes(text)) return true;
  // 함수 글(syncedAt) — 날짜 글을 넣어 만든 것과 같으면
  const d = new Date(NOW - 3 * 60 * 60 * 1000);
  return text === view.syncedAt(d.getTime(), t);
}

test('every phase renders a catalog string (or nothing), in ko, ja and en', () => {
  for (const l of LANGS) {
    const t = msg(l);
    for (const phase of PHASES) {
      for (const at of [undefined, NOW - 10_000, NOW - 3 * 60 * 60 * 1000]) {
        const s = { phase, enabled: true, ...(at !== undefined ? { at } : {}) };
        const line = view.statusLine(s, NOW, t);
        if (phase === 'problem') {
          assert.equal(line, null, 'a problem shows its ruled notice, not a status line');
          continue;
        }
        if (line === null) {
          assert.ok((phase === 'idle' || phase === 'off') && at === undefined, `${l} ${phase}: no line only when never synced`);
          continue;
        }
        assert.ok(fromCatalog(t, line), `${l} ${phase}: ${line}`);
        assert.doesNotMatch(line, /undefined|NaN|\[object/);
      }
    }
    for (const p of PROBLEMS) {
      const pl = view.problemLine(p, t);
      assert.ok(pl && pl.title, `${l} ${p}`);
      assert.ok(Object.values(t.sync).includes(pl.title), `${l} ${p}: ${pl.title}`);
      if (pl.body) assert.ok(Object.values(t.sync).includes(pl.body));
    }
    assert.equal(view.problemLine(undefined, t), null);
  }
});

test('status line: just now, then the date and time; nothing when sync is off', () => {
  const t = msg('ko');
  assert.equal(view.statusLine({ phase: 'idle', enabled: true, at: NOW - 5000 }, NOW, t), '방금 맞췄어요');
  const at = new Date(2026, 9, 14, 21, 0).getTime();
  assert.equal(view.statusLine({ phase: 'idle', enabled: true, at }, at + 2 * 60_000, t), '10월 14일 오후 9:00에 맞췄어요');
  assert.equal(view.statusLine({ phase: 'checking', enabled: true }, NOW, t), '맞추는 중이에요');
  assert.equal(view.statusLine({ phase: 'syncing', enabled: true }, NOW, t), '맞추는 중이에요');
  assert.equal(view.statusLine({ phase: 'off', enabled: false, at: NOW - 5000 }, NOW, t), null, 'off: no time line');
});

test('problem rows: the plan wording; sign-in and Drive open Settings, ioError can retry', () => {
  const t = msg('ko');
  assert.deepEqual(view.problemLine('noAccount', t), { title: 'iCloud에 로그인되어 있지 않아요', body: t.sync.settingsBody, action: 'settings' });
  assert.deepEqual(view.problemLine('driveOff', t), { title: 'iCloud Drive가 꺼져 있어요', body: t.sync.settingsBody, action: 'settings' });
  assert.equal(view.problemLine('accountChanged', t).title, '다른 iCloud 계정이에요 — 다시 켜면 이 계정 기록과 맞춰요');
  assert.equal(view.problemLine('ioError', t).action, 'retry');
  assert.equal(view.problemLine('tooLarge', t).action, undefined);
});

test('the newerApp problem renders its catalog string', () => {
  for (const l of LANGS) {
    const t = msg(l);
    assert.equal(view.problemLine('newerApp', t).title, t.sync.newerApp);
    assert.equal(view.problemLine('newerApp', t).action, undefined, 'nothing to press: update the app');
  }
  assert.equal(msg('ko').sync.newerApp, '다른 기기의 앱이 더 새 버전이에요. 이 기기도 업데이트하면 다시 맞춰요');
});

test('choice sheet: three choices, each with its line, and none preselected', () => {
  assert.deepEqual([...view.CHOICES], ['merge', 'adopt', 'mine']);
  const t = msg('ko');
  assert.deepEqual(view.choiceText('merge', t), { title: '둘을 합쳐요', sub: '같은 칸을 두 기기에서 다르게 고쳤다면 나중에 고친 쪽이 남아요' });
  assert.deepEqual(view.choiceText('adopt', t), { title: 'iCloud 기록으로 바꿔요', sub: '이 기기의 표와 기록은 iCloud 것으로 바뀌어요. 지난 표 보관함은 합쳐요' });
  assert.deepEqual(view.choiceText('mine', t), { title: '이 기기 기록으로 이어 써요', sub: '다른 기기에서 그사이 적은 기록은 이 기기 것으로 바뀌어요' });
  assert.equal(t.sync.copyNote, '고르기 전 모습은 설정 › 저장본에 오늘 날짜로 남아요');

  const sheet = src('src/screens/settings/SyncChoiceSheet.tsx');
  assert.match(sheet, /const \[pick, setPick\] = useState<SyncChoice \| null>\(null\);/, 'nothing picked at first');
  assert.match(sheet, /disabled=\{!pick\}/, 'confirm waits for a pick');
  assert.match(sheet, /<RuledNotice M=\{M\} title=\{t\.sync\.copyNote\} \/>/, 'the safety-copy line is under the choices');
  assert.match(sheet, /accessibilityRole="radio"/);
  assert.match(sheet, /\{CHOICES\.map\(/);
  // 닫으면 고른 것(없으면 null)을 한 번 알린다 — null은 켜지 않기
  assert.match(sheet, /onClose=\{\(\) => onAnswer\(chosen\.current\)\}/);
  assert.match(sheet, /void setChoice\(c\);/);
  assert.match(sheet, /ledgerRows\(/, 'the comparison uses the backup ledger rows');
});

test('the sheet opens only while the engine asks, and not again for an answered question', () => {
  const remote = { onboarded: true };
  const asking = { phase: 'needsChoice', enabled: false, remote };
  assert.equal(view.choiceOpen(asking, null), true);
  assert.equal(view.choiceOpen(asking, view.choiceKey(asking)), false, 'answered: wait for the engine');
  assert.equal(view.choiceOpen({ ...asking, remote: { onboarded: true } }, remote), true, 'a new question opens again');
  const bare = { phase: 'needsChoice', enabled: false };
  assert.equal(view.choiceOpen(bare, null), true, 'no remote doc still asks');
  for (const phase of PHASES.filter((p) => p !== 'needsChoice')) {
    assert.equal(view.choiceOpen({ phase, enabled: true, remote }, null), false, phase);
  }
});

test('the onboarding row appears only when an offer exists', () => {
  assert.equal(view.offerFor({ available: true, files: 1 }), true);
  assert.equal(view.offerFor({ available: true, files: 3 }), true);
  assert.equal(view.offerFor({ available: true, files: 0 }), false);
  assert.equal(view.offerFor({ available: false, files: 2 }), false);
  assert.equal(view.offerFor(null), false);
  assert.equal(view.offerFor(undefined), false);
});

test('Onboarding uses probeRemote, never icloud.list, and imports with adopt', () => {
  const onb = src('src/screens/Onboarding.tsx');
  assert.match(onb, /probeRemote\(\)/);
  assert.match(onb, /setOffer\(offerFor\(p\)\)/);
  assert.match(onb, /setSyncEnabled\(true, 'adopt'\)/);
  assert.match(onb, /testID=\{TID\.onbICloud\}/);
  assert.doesNotMatch(onb, /icloud\.list|\.list\(\)/);
  assert.doesNotMatch(onb, /modules\/icloud-sync/, 'no direct native module use');
  // iOS에서만 살펴본다 — 웹 · 안드로이드는 부르지 않는다
  assert.match(onb, /if \(Platform\.OS !== 'ios'\) return;\s*let live = true;\s*probeRemote\(\)/);
  for (const id of ['onbGoal', 'onbSample', 'onbStart', 'onbNext']) assert.match(onb, new RegExp(`TID\\.${id}\\b`), id);
  assert.match(onb, /TID\.onbTemplate\(/);
});

test('settings section: iOS with the native module only; the toggle and "지금 맞추기" carry their ids', () => {
  assert.equal(view.syncSupported('ios', {}), true);
  assert.equal(view.syncSupported('ios', null), false, 'Expo Go');
  assert.equal(view.syncSupported('web', {}), false);
  assert.equal(view.syncSupported('android', {}), false);
  const sec = src('src/screens/settings/SyncSection.tsx');
  assert.match(sec, /if \(!syncSupported\(Platform\.OS, icloud\)\) \{[\s\S]*?<RuledNotice M=\{M\} title=\{t\.sync\.webNote\} \/>/);
  assert.match(sec, /testID=\{TID\.setICloud\}/);
  assert.match(sec, /testID=\{TID\.setICloudNow\}/);
  assert.match(sec, /void requestSync\(\)/);
  // 처음 고르기 시트는 Root에 하나만 — 어느 화면에서든 묻고, 설정 안에는 두지 않는다(V5-E 넘겨줄 일)
  assert.doesNotMatch(sec, /<SyncChoiceHost/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src/navigation/Root.tsx'), 'utf8'), /<SyncChoiceHost M=\{M\} \/>/);
  // 웹 안내 문장 그대로
  assert.equal(msg('ko').sync.webNote, 'iPhone·iPad 앱에서만 쓸 수 있어요. 다른 기기로 옮길 때는 백업 파일을 써요.');
  // 웹 쪽 갈래에서는 맞추기 함수를 부르지 않는다(구역 머리 · 안내 한 줄만)
  const webBranch = sec.slice(sec.indexOf('export function SyncSection'), sec.indexOf('function SyncRows'));
  assert.doesNotMatch(webBranch, /setSyncEnabled|requestSync|useSyncStatus|probeRemote/);
});

test('no sync call is made on web: without a bound engine every call is a no-op', async () => {
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (req, ...rest) {
    if (req === 'expo') return 'fake-expo';
    return resolve.call(this, req, ...rest);
  };
  require.cache['fake-expo'] = { id: 'fake-expo', filename: 'fake-expo', loaded: true, exports: { requireOptionalNativeModule: () => null } };
  let s;
  try {
    for (const f of ['src/lib/syncStatus.ts', 'modules/icloud-sync/index.ts']) delete require.cache[path.join(ROOT, f)];
    s = require('../src/lib/syncStatus');
    const { icloud } = require('../modules/icloud-sync');
    assert.equal(icloud, null);
    assert.equal(view.syncSupported('web', icloud), false);
  } finally {
    Module._resolveFilename = resolve;
    delete require.cache['fake-expo'];
  }
  await s.setSyncEnabled(true);
  await s.setChoice('merge');
  await s.requestSync();
  assert.deepEqual(await s.probeRemote(), { available: false, files: 0 });
  assert.equal(view.offerFor(await s.probeRemote()), false, 'no offer without iCloud');
  assert.deepEqual(s.getSyncStatus(), { phase: 'off', enabled: false });
});

test('design: no rounded cards, badges, shadows or emoji in the V5-E files', () => {
  for (const f of ['src/screens/settings/SyncSection.tsx', 'src/screens/settings/SyncChoiceSheet.tsx']) {
    const s = src(f);
    assert.doesNotMatch(s, /borderRadius|shadow\(|LinearGradient/, f);
    assert.doesNotMatch(s, /\p{Extended_Pictographic}/u, f);
  }
});
