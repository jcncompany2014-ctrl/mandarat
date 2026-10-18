// 알림 기기 쪽(src/lib/notifier*.ts · src/hosts/ReminderSync.tsx) — 소스 검사.
// 앱을 보고 있을 때는 배너·배지 없이, 허락은 사용자가 누를 때만 묻고, 손잡이는 status()만 읽는다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const NATIVE = 'src/lib/notifier.native.ts';
const WEB = 'src/lib/notifier.ts';
const HOST = 'src/hosts/ReminderSync.tsx';

test('기기 쪽: 보고 있을 때는 배너 없이 알림 센터에만, 배지는 묻지도 쓰지도 않는다', () => {
  const s = code(NATIVE);
  assert.match(s, /setNotificationHandler\(/);
  assert.match(s, /shouldShowBanner: false/);
  assert.match(s, /shouldShowList: true/);
  assert.match(s, /shouldSetBadge: false/);
  assert.match(s, /allowBadge: false/);
  assert.match(s, /allowAlert: true/);
  assert.doesNotMatch(s, /shouldShowAlert/, '없어진 이름');
  assert.match(s, /satisfies Notifier/);
});

test('기기 쪽: 앱을 켜게 한 누름은 getLastNotificationResponse(동기)로 읽고 지운다 — …Async는 쓰지 않는다', () => {
  const s = code(NATIVE);
  assert.match(s, /getLastNotificationResponse\(\)/);
  assert.match(s, /clearLastNotificationResponse\(\)/);
  assert.match(s, /addNotificationResponseReceivedListener\(/);
  assert.doesNotMatch(s, /getLastNotificationResponseAsync|clearLastNotificationResponseAsync|useLastNotificationResponse/);
});

test('기기 쪽: 안드로이드 채널을 허락보다 먼저 만들고, 차이만 걸고 지운다', () => {
  const s = code(NATIVE);
  const req = s.indexOf('async function request(');
  assert.ok(req > 0);
  const body = s.slice(req, s.indexOf('\n}', req));
  assert.ok(body.indexOf('ensureChannel()') >= 0 && body.indexOf('ensureChannel()') < body.indexOf('requestPermissionsAsync'), '채널 → 허락');
  assert.match(s, /AndroidImportance\.DEFAULT/);
  assert.match(s, /getAllScheduledNotificationsAsync\(\)/);
  assert.match(s, /diffReminders\(/);
  assert.match(s, /triggerFor\(/);
  assert.doesNotMatch(s, /cancelAllScheduledNotificationsAsync/, '남의 알림까지 지우지 않는다');
});

test('허락을 묻는 곳은 request() 하나 — focusEnd·apply는 묻지 않는다', () => {
  const s = code(NATIVE);
  assert.equal(s.match(/requestPermissionsAsync/g).length, 1);
  for (const fn of ['applyNow', 'focusEnd']) {
    const i = s.indexOf(`async function ${fn}(`);
    assert.ok(i > 0, fn);
    const body = s.slice(i, s.indexOf('\n}', i));
    assert.doesNotMatch(body, /request\(|requestPermissionsAsync/, fn);
  }
});

test('웹·기본 파일은 expo-notifications를 부르지 않는다', () => {
  const s = code(WEB);
  assert.doesNotMatch(s, /['"]expo-notifications['"]/);
  assert.match(s, /supported: false/);
});

test('ReminderSync는 허락을 묻지 않는다 — status()만 읽을 수 있다', () => {
  const s = code(HOST);
  assert.doesNotMatch(s, /\.request\(/);
  assert.doesNotMatch(s, /requestPermissionsAsync/);
  assert.doesNotMatch(s, /expo-notifications/);
  assert.match(s, /planReminders\(/);
  assert.match(s, /planKey\(/);
  assert.match(s, /return null;/);
});

test('expo-notifications는 기기 파일에서만', () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) files.push(p);
    }
  };
  walk('src');
  const users = files.filter((f) => /from 'expo-notifications'/.test(src(f)));
  assert.deepEqual(users, [NATIVE]);
});
