// 출시 전 감사에서 나온 위젯 · 저장소 고침의 지킴이.
// 1. 위젯이 지난 칸에 머문다 — 타임라인 30칸 + 닫는 칸, 지난 칸에서는 목록 대신 한 줄 · 체크를 받지 않는다(src/widgets/TodayWidget.ios.tsx)
// 2. 위젯 · Siri의 한 번 · 직접 추가한 할 일 체크가 앱을 연 날로 적힌다 — 체크한 그날로(src/lib/widgetOps.ts)
// 3. 템플릿으로 바꾸면 아직 안 한 직접 추가한 할 일까지 지운다 — 남긴다(src/store/MandaratContext.tsx applyTemplate)
// 4. 켤 때마다 바뀌지 않은 문서를 다시 쓴다 — 읽은 그대로면 쓰지 않는다(같은 파일의 저장 효과)
// 위젯 모습은 tests/helpers/widgetVm.js의 vm에서 돌린다 — 지금(now)을 따로 주어 앱을 오래 열지 않은 날을 흉내 낸다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { blankDoc, migrate, sampleThemes } = require('../src/data/defaults');
const { msg, LANGS } = require('../src/i18n');
const { widgetTimeline, WIDGET_DAYS } = require('../src/lib/widgetSnapshot');
const { planOps, checkOnceOn, checkExtraOn, STALE_DAYS } = require('../src/lib/widgetOps');
const { activeStreak, toggleCellDone } = require('../src/lib/history');
const { rolloverToday, todayProgress, ymd } = require('../src/lib/routine');
const { openStored } = require('../src/lib/syncEnvelope');
const { serializeStored } = require('../src/lib/syncCommitBase');
const { newSyncMeta } = require('../src/lib/syncMeta');
const webCommit = require('../src/lib/syncCommit');
const { extractLayout, widgetRuntime, walk } = require('./helpers/widgetVm');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const rt = widgetRuntime(extractLayout());
const FAMILIES = ['systemSmall', 'systemMedium', 'systemLarge', 'accessoryInline', 'accessoryCircular', 'accessoryRectangular'];

const texts = (node) => { const out = []; walk(node, (n) => { if (n.type === 'TextView' && n.props.text) out.push(n.props.text); }); return out; };
const buttons = (node) => { const out = []; walk(node, (n) => { if (n.type === 'Button') out.push(n.props.target); }); return out; };
/** 수정자 하나의 인자(없으면 null) — vm 안에서 만든 값은 원형(prototype)이 달라 JSON으로 옮겨 견준다 */
const modArgs = (n, type) => { const m = (n.props.modifiers || []).find((x) => x.$type === type); return m ? JSON.parse(JSON.stringify(m.args)) : null; };
const said = (node) => { const out = []; walk(node, (n) => { const a = modArgs(n, 'accessibilityLabel'); if (a) out.push(a[0]); }); return out; };

// ── 1. 위젯: 지난 칸 ─────────────────────────────────────────────────────────

/** 감사의 장면 — 앱을 11월 21일(토) 09:00에 마지막으로 열었다. 한 번 하나 · 날마다 습관 하나 · 직접 추가한 할 일 하나 */
function scene(lang = 'en') {
  const d = blankDoc();
  d.themes[0].actions[0] = { text: 'Renew passport', note: '', done: false, kind: 'once', due: '2026-11-24' };
  d.themes[0].actions[1] = { text: 'Stretch', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6], since: '2026-11-01' };
  const doc = { ...d, onboarded: true, centerGoal: 'A steady year', todayDate: '2026-11-21', todayExtra: [{ id: 'e1', ti: 1, text: 'Buy stamps', done: false }] };
  const timeline = widgetTimeline(doc, new Date(2026, 10, 21, 9), { pat: 'blank', lang });
  /** WidgetKit이 지금 보이는 칸 — 시각이 지난 마지막 칸(마지막 칸이 지나면 그 칸에 머문다) */
  const shown = (now) => { let i = 0; timeline.forEach((e, j) => { if (e.date <= now.getTime()) i = j; }); return i; };
  /** 그 칸의 env — date는 지금이 아니라 칸의 시각이다(expo-widgets EntryView.swift) */
  const env = (i, family = 'systemLarge') => ({ widgetFamily: family, date: new Date(timeline[i].date) });
  const render = (now, family, i = shown(now)) => rt.render(timeline[i].props, env(i, family), now);
  /** expo-widgets AppIntent처럼 — 누른 칸만 고친다. 아무것도 돌려주지 않으면 쓰지 않는다 */
  const press = (now, key, family, i = shown(now)) => {
    const out = rt.press(timeline[i].props, env(i, family), `check:${key}`, now);
    if (out) timeline[i] = { ...timeline[i], props: { ...timeline[i].props, ...out } };
    return out;
  };
  const ops = () => timeline.flatMap((e) => e.props.ops);
  return { doc, timeline, shown, env, render, press, ops };
}

test('위젯 1: 타임라인은 30칸 — 앱을 열지 않아도 30일 동안 그날의 칸이 보이고, 체크는 그날로 적힌다', () => {
  const s = scene();
  assert.equal(WIDGET_DAYS, 30);
  assert.equal(s.timeline.length, 31, '30일 + 닫는 칸');
  for (const e of s.timeline.slice(0, 30)) assert.equal(e.props.day, ymd(new Date(e.date)), '칸의 날은 칸의 시각의 날');
  assert.equal(s.timeline[29].props.day, '2026-12-20');
  // 8칸일 때: 11월 30일에도 28일 칸이 보여 28일로 적혔고, 12월 1 · 2일에는 이미 한 것으로 보여 체크할 수 없었다
  for (const [m, d, want] of [[10, 30, '2026-11-30'], [11, 1, '2026-12-01'], [11, 2, '2026-12-02'], [11, 20, '2026-12-20']]) {
    const now = new Date(2026, m, d, 8);
    assert.equal(s.timeline[s.shown(now)].props.day, want);
    const row = s.timeline[s.shown(now)].props.items.find((i) => i.k === '0-1');
    assert.equal(row.d, false, `${want}: 그날 아침에는 아직 안 한 것으로 보인다`);
    const out = s.press(now, '0-1');
    assert.ok(out, `${want}: 체크가 들어간다`);
    assert.deepEqual({ k: out.ops.at(-1).k, day: out.ops.at(-1).day, on: out.ops.at(-1).on, at: out.ops.at(-1).at }, { k: '0-1', day: want, on: true, at: now.getTime() });
  }
  // 12월 2일에 체크한 한 번은 12월 2일로 적히고, 6일에 앱을 열어도 버려지지 않는다(전에는 11월 28일로 적혀 7일 밖이라 버려졌다)
  assert.ok(s.press(new Date(2026, 11, 2, 9), '0-0'));
  assert.deepEqual(s.ops().map((o) => `${o.k}@${o.day}`), ['0-1@2026-11-30', '0-1@2026-12-01', '0-1@2026-12-02', '0-0@2026-12-02', '0-1@2026-12-20']);
  assert.deepEqual(planOps(s.ops().slice(0, 4), s.doc, new Date(2026, 11, 6, 9)), [
    { kind: 'toggleHabitOn', ti: 0, ai: 1, day: '2026-11-30' },
    { kind: 'toggleHabitOn', ti: 0, ai: 1, day: '2026-12-01' },
    { kind: 'toggleHabitOn', ti: 0, ai: 1, day: '2026-12-02' },
    { kind: 'checkOnceOn', ti: 0, ai: 0, day: '2026-12-02' },
  ]);
  // 타임라인이 담는 날만큼 지난 체크를 들인다 — 8칸을 가정한 7일이 남아 있으면 보름 뒤에 연 앱이 한 번 · 할 일 체크를 버린다
  assert.equal(STALE_DAYS, WIDGET_DAYS - 1);
  assert.match(src('src/lib/widgetOps.ts'), /export const STALE_DAYS = WIDGET_DAYS - 1;/);
  assert.equal(planOps(s.ops(), s.doc, new Date(2026, 11, 28, 9)).filter((c) => c.kind === 'checkOnceOn').length, 1, '26일 전의 한 번 체크');
});

test('위젯 1: 마지막 날이 지나면 목록 · 수 대신 앱을 열어 달라는 한 줄 — 버튼이 없고, 눌러도 아무것도 적히지 않는다', () => {
  const s = scene();
  const line = msg('en').widget.stale;
  // 닫는 칸 — 마지막 날(12월 20일)이 끝나는 자정부터 보인다. 날은 마지막 날 그대로, 목록은 비어 있다
  const closing = s.timeline[30];
  assert.equal(closing.date, new Date(2026, 11, 21).getTime());
  assert.deepEqual({ expired: closing.props.expired, day: closing.props.day, items: closing.props.items, total: closing.props.total }, { expired: true, day: '2026-12-20', items: [], total: 0 });
  // Siri(TodayStore.current)는 시각이 지난 마지막 칸의 day가 오늘일 때만 읽는다 — 닫는 칸은 어느 날에도 오늘로 읽히지 않는다
  for (const now of [new Date(2026, 11, 21, 0, 0, 1), new Date(2026, 11, 25, 8)]) assert.notEqual(s.timeline[s.shown(now)].props.day, ymd(now));
  // WidgetKit은 앱을 연 직후 이 칸도 미리 그려 둔다(칸의 시각 > 지금) — 그때 이미 한 줄이어야 자정에 제때 바뀐다
  const ahead = s.render(new Date(2026, 10, 21, 9, 0, 1), 'systemMedium', 30);
  assert.deepEqual(buttons(ahead), []);
  assert.ok(texts(ahead).includes(line));
  // which: 닫는 칸(30) · 닫는 칸 없이 마지막 날의 칸(29)이 머문 채 다시 그려질 때(위젯이 스스로 날짜를 견준다) — 둘 다 같은 모습
  for (const [now, which] of [
    [new Date(2026, 11, 21, 0, 0, 1), 30], [new Date(2026, 11, 21, 8), 30], [new Date(2026, 11, 25, 8), 30], [new Date(2027, 1, 3, 8), 30],
    [new Date(2026, 11, 21, 0, 0, 1), 29], [new Date(2026, 11, 25, 8), 29],
  ]) {
    assert.equal(s.shown(now), 30, '마지막 날이 지나면 닫는 칸이 보인다');
    for (const family of FAMILIES) {
      const node = s.render(now, family, which);
      const label = `${family} @ ${now.toDateString()} 칸 ${which}`;
      assert.deepEqual(buttons(node), [], `${label}: 버튼 없음`);
      const t = texts(node);
      // 그날의 목록 · 수 · 날짜는 보이지 않는다
      for (const gone of ['Renew passport', 'Stretch', 'Buy stamps', '0/3', 'Sun, Dec 20']) assert.ok(!t.includes(gone), `${label}: ${gone}`);
      // 동그라미는 글 자리가 없다 — 빈 고리에 '오늘'만, 읽어 주기가 한 줄을 말한다
      if (family === 'accessoryCircular') {
        assert.deepEqual(t, ['Today'], label);
        assert.deepEqual(said(node), [line], label);
        walk(node, (n) => { if (n.type === 'GaugeView') assert.equal(n.props.value, 0, `${label}: 빈 고리`); });
      } else {
        assert.equal(t.filter((x) => x === line).length, 1, `${label}: 한 줄, 한 번만`);
        assert.ok(!said(node).includes(line), `${label}: 머리가 같은 줄을 또 읽지 않는다`);
      }
      // 누르면 앱이 열린다 — 위젯 전체의 주소는 그대로
      const url = modArgs(node, 'widgetURL');
      assert.deepEqual(url, ['mandarat://today'], label);
      for (const x of t) assert.doesNotMatch(x, /undefined|NaN|\{[nt]\}/, label);
    }
    // 중간 위젯의 남은 수는 자리만 남기고 보이지 않는다
    walk(s.render(now, 'systemMedium', which), (n) => {
      if (n.type === 'HStackView' && modArgs(n, 'opacity') && texts(n).includes(' left')) assert.deepEqual(modArgs(n, 'opacity'), [0]);
    });
    // 눌러도(그리기 전에 누른 것처럼 target을 직접 대도) 아무것도 돌려주지 않는다 → AppIntent는 타임라인을 쓰지 않는다
    for (const family of ['systemMedium', 'systemLarge', 'accessoryRectangular']) {
      for (const k of ['0-0', '0-1', 'x:e1']) assert.equal(s.press(now, k, family, which), undefined, `${family} ${k}`);
    }
  }
  assert.deepEqual(s.ops(), [], '지난 칸에서는 체크가 하나도 적히지 않는다');
});

test('위젯 1: 제때 보이는 칸과 미리 그려 두는 앞날의 칸은 그대로 그린다 — env.date는 칸의 시각이지 지금이 아니다', () => {
  const s = scene();
  // 앱을 연 직후 WidgetKit이 서른 칸을 모두 미리 그린다(지금 = 11월 21일 09:00, 칸의 시각은 앞날)
  const opened = new Date(2026, 10, 21, 9, 0, 1);
  for (const i of [0, 1, 7, 29]) {
    const node = rt.render(s.timeline[i].props, s.env(i), opened);
    assert.ok(buttons(node).length > 0, `칸 ${i}: 목록을 그린다`);
    assert.ok(!texts(node).includes(msg('en').widget.stale), `칸 ${i}`);
  }
  // 그 칸의 날 안에서는 언제 그려도(자정 직후 · 밤) 목록
  for (const now of [new Date(2026, 10, 27, 0, 0, 0), new Date(2026, 10, 27, 23, 59, 59)]) {
    assert.equal(s.timeline[s.shown(now)].props.day, '2026-11-27');
    assert.ok(buttons(s.render(now)).length > 0);
  }
  // 위젯 고르기 화면의 미리 보기는 늘 첫 칸이다(expo-widgets getSnapshot → entries.first) — 앱을 연 지 나흘 뒤에 위젯을 골라도
  // 한 줄이 아니라 목록의 모습을 보인다. 그 칸을 누르는 것은(시계 · 시간대가 바뀌어 첫 칸이 다른 날에 보일 때) 받지 않는다
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'node_modules/expo-widgets/ios/Widgets/TimelineProvider.swift'), 'utf8'), /getSnapshot\([\s\S]*?completion\(entries\.first \?\?/);
  const later = new Date(2026, 10, 25, 15);
  assert.equal(s.timeline[0].props.first, true);
  for (const family of FAMILIES) {
    const preview = rt.render(s.timeline[0].props, s.env(0, family), later);
    assert.ok(!texts(preview).includes(msg('en').widget.stale), `${family}: 미리 보기`);
  }
  assert.ok(texts(rt.render(s.timeline[0].props, s.env(0, 'systemMedium'), later)).includes('Stretch'));
  assert.equal(rt.press(s.timeline[0].props, s.env(0, 'systemMedium'), 'check:0-1', later), undefined);
  // 날이 없는 props({} — 위젯 갤러리 · 온보딩 전)는 견줄 것이 없다
  assert.deepEqual(texts(rt.render({}, { widgetFamily: 'systemMedium' }, new Date(2030, 0, 1))).filter((t) => /undefined/.test(t)), []);
  // 모습은 지금을 new Date()로 읽는다 — env.date로 견주면 칸의 날과 늘 같아 지난 칸을 알 수 없다
  const layout = src('src/widgets/TodayWidget.ios.tsx');
  assert.match(layout, /const now = new Date\(\);\s*const upcoming = !!e\.date && typeof e\.date\.getTime === 'function' && e\.date\.getTime\(\) > now\.getTime\(\);\s*const stale = !!p\.expired \|\| \(!p\.first && day !== '' && !upcoming && day !== localDay\(now\)\);/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'node_modules/expo-widgets/ios/Widgets/EntryView.swift'), 'utf8'), /env\["timestamp"\] = Int\(entry\.date\.timeIntervalSince1970 \* 1000\)/);
});

test('위젯 1: 누르는 순간의 날짜가 칸의 날이 아니면 체크하지 않는다 — 그린 뒤 자정이 지났거나 시계 · 시간대가 바뀌었을 때', () => {
  const s = scene();
  // 11월 26일 칸(칸 5). 밤 23:59에는 체크가 되고, 자정이 지나 27일 칸으로 넘어가기 전(다시 그려지기 전)이라도 26일 칸은 받지 않는다
  assert.ok(rt.press(s.timeline[5].props, s.env(5), 'check:0-1', new Date(2026, 10, 26, 23, 59)));
  assert.equal(rt.press(s.timeline[5].props, s.env(5), 'check:0-1', new Date(2026, 10, 27, 0, 0, 30)), undefined);
  // 시계를 뒤로 돌렸다(칸의 시각 > 지금 → 미리 그리는 칸과 구별할 수 없어 목록은 그린다) — 그래도 날이 다르면 누름은 받지 않는다
  const back = new Date(2026, 10, 25, 22);
  assert.ok(buttons(rt.render(s.timeline[5].props, s.env(5), back)).length > 0);
  assert.equal(rt.press(s.timeline[5].props, s.env(5), 'check:0-1', back), undefined);
  // 시간대를 옮겼다 — 칸의 시각은 지났는데 칸의 날이 이 기기의 오늘보다 하루 앞선다: 지난 칸과 같이 한 줄
  const ahead = { ...s.timeline[1].props }; // 11월 22일 칸
  const landed = new Date(2026, 10, 21, 12);
  const node = rt.render(ahead, { widgetFamily: 'systemMedium', date: new Date(2026, 10, 21, 10) }, landed);
  assert.deepEqual(buttons(node), []);
  assert.ok(texts(node).includes(msg('en').widget.stale));
  assert.equal(rt.press(ahead, { widgetFamily: 'systemMedium', date: new Date(2026, 10, 21, 10) }, 'check:0-1', landed), undefined);
  // Siri와 같은 규칙 — 칸의 날이 오늘일 때만(native/ios/TodayStore.swift)
  assert.match(src('native/ios/TodayStore.swift'), /guard let day = props\["day"\] as\? String, day == localDay\(now\) else \{ return \.stale \}/);
  assert.match(src('src/widgets/TodayWidget.ios.tsx'), /return function \(\) \{\s*if \(day !== localDay\(new Date\(\)\)\) return undefined;/);
});

test('위젯 1: 한 줄은 ko · ja · en 문구에서 — 차분하게, 틀 없이. 옛 스냅숏(문구 없음)도 깨지지 않는다', () => {
  const lines = Object.fromEntries(LANGS.map((l) => [l, msg(l).widget.stale]));
  assert.equal(lines.ko, '앱을 열면 오늘 할 일이 보여요');
  assert.equal(lines.ja, 'アプリを開くと今日やることを表示します');
  assert.equal(lines.en, "Open the app to see Today's list");
  for (const l of LANGS) {
    assert.doesNotMatch(lines[l], /[!！{}]/, l);
    const s = scene(l);
    assert.equal(s.timeline[0].props.lines.stale, lines[l], `${l}: 타임라인이 문구를 싣는다`);
    for (const family of ['systemSmall', 'systemMedium', 'systemLarge', 'accessoryInline', 'accessoryRectangular']) {
      assert.ok(texts(s.render(new Date(2026, 11, 25, 8), family)).includes(lines[l]), `${l} ${family}`);
    }
  }
  assert.match(lines.ko, /요$/);
  assert.match(lines.ja, /ます$/);
  // 작은 위젯은 지도 폭(91pt)에 묶어 두 줄까지, 좁으면 줄여 맞춘다
  const s = scene('ja');
  let note = null;
  walk(s.render(new Date(2026, 11, 25, 8), 'systemSmall'), (n) => { if (n.type === 'TextView' && n.props.text === lines.ja) note = n; });
  assert.deepEqual(modArgs(note, 'frame'), [{ width: 91, alignment: 'leading' }]);
  assert.deepEqual(modArgs(note, 'lineLimit'), [2]);
  assert.deepEqual(modArgs(note, 'minimumScaleFactor'), [0.7]);
  assert.deepEqual(modArgs(note, 'font'), [{ size: 13, weight: 'medium' }]);
  // 문구가 없는 옛 스냅숏 — 글은 비지만 그려지고, 버튼은 없다
  const en = scene('en');
  const { stale, ...oldLines } = en.timeline[29].props.lines;
  const old = { ...en.timeline[29].props, lines: oldLines };
  for (const family of FAMILIES) {
    const node = rt.render(old, en.env(29, family), new Date(2026, 11, 25, 8));
    assert.deepEqual(buttons(node), [], family);
    for (const t of texts(node)) assert.doesNotMatch(t, /undefined|NaN|\{[nt]\}/, family);
  }
});

test('위젯 1: 30칸의 크기 — 예시 표로 100 KB 아래, 팔레트는 한 번만 만든다', () => {
  const NOW = new Date(2026, 10, 20, 9);
  const doc = migrate({ ...blankDoc(), onboarded: true, centerGoal: '단단한 한 해', themes: sampleThemes(NOW, 'ko'), todayDate: '2026-11-20' });
  const tl = widgetTimeline(doc, NOW, { pat: 'blank', lang: 'ko' });
  assert.equal(tl.length, 31);
  const bytes = tl.reduce((n, e) => n + Buffer.byteLength(JSON.stringify(e.props)), 0);
  assert.ok(bytes < 100 * 1024, `30칸 + 닫는 칸 ${bytes} B`);
  assert.ok(Math.max(...tl.map((e) => Buffer.byteLength(JSON.stringify(e.props)))) < 4 * 1024, '한 칸 4 KB 아래');
  // 날과 상관없는 팔레트는 서른 칸이 같은 것을 쓴다(칸마다 66색을 다시 만들지 않는다)
  assert.equal(tl[0].props.pal, tl[29].props.pal);
  assert.equal(tl[30].props.pal, tl[0].props.pal);
  assert.equal(widgetTimeline(doc, NOW, { pat: 'grid', lang: 'en' })[3].props.pal, tl[0].props.pal);
});

// ── 2. 위젯 · Siri 체크는 체크한 그날의 기록으로 ─────────────────────────────────

/** 목요일 23:10에 위젯에서 한 번 하나 · 직접 추가한 할 일 하나를 체크하고, 금요일 08:00에 앱을 연다 */
function thursdayNight(extra = {}) {
  const d = blankDoc();
  d.themes[0].actions[0] = { text: 'Send the tax form', note: '', done: false, kind: 'once', due: '2026-11-20' };
  d.themes[0].actions[1] = { text: 'Call the bank', note: '', done: false, kind: 'once' };
  const doc = {
    ...d, onboarded: true, todayDate: '2026-11-19', dayLog: { '2026-11-18': ['1-1'] },
    todayExtra: [{ id: 'e1', ti: 1, text: 'Buy stamps', done: false }], ...extra,
  };
  const at = new Date(2026, 10, 19, 23, 10).getTime();
  const op = (k, o = {}) => ({ kind: 'check', k, on: true, day: '2026-11-19', at, t: '', src: 'widget', ...o });
  return { doc, op, fri: new Date(2026, 10, 20, 8) };
}
/** 손잡이(WidgetSync.run)가 저장소에 시키는 일을 순수하게 — 저장소의 checkOnceOn · checkExtraOn은 이 두 함수를 dateKey()와 함께 부른다 */
function runCommands(doc, cmds, todayKey) {
  let d = doc;
  for (const c of cmds) {
    if (c.kind === 'checkOnceOn') d = checkOnceOn(d, c.ti, c.ai, c.day, todayKey);
    else if (c.kind === 'checkExtraOn') d = checkExtraOn(d, c.id, c.day, todayKey);
    else if (c.kind === 'checkToday') d = toggleCellDone(d, c.ti, c.ai, todayKey);
    else assert.fail(`unexpected ${c.kind}`);
  }
  return d;
}

test('위젯 2: 목요일 밤의 체크는 금요일에 앱을 열어도 목요일의 기록 — 금요일은 비어 있고 연속 기록이 이어진다', () => {
  const { doc, op, fri } = thursdayNight();
  const ops = [op('0-0'), op('x:e1', { at: op('x').at + 1 })];
  const opened = rolloverToday(doc, '2026-11-20'); // 저장소: 앱을 열면 하루 정리가 먼저 돈다
  const cmds = planOps(ops, opened, fri);
  assert.deepEqual(cmds, [
    { kind: 'checkOnceOn', ti: 0, ai: 0, day: '2026-11-19' },
    { kind: 'checkExtraOn', id: 'e1', day: '2026-11-19' },
  ]);
  const after = runCommands(opened, cmds, '2026-11-20');
  // 전에는 {"2026-11-18":[…],"2026-11-20":["0-0","1-xe1"]} — 목요일은 빈 날, 금요일 08:00에 2/2
  assert.deepEqual(after.dayLog, { '2026-11-18': ['1-1'], '2026-11-19': ['0-0', '1-xe1'] });
  assert.equal(after.themes[0].actions[0].done, true);
  assert.deepEqual(after.todayExtra, [], '끝낸 할 일은 날을 넘기며 목록에서 빠진다(하루 정리와 같게)');
  assert.deepEqual(todayProgress(after, fri), { done: 0, total: 0 }, '금요일 아침에 다 한 것으로 보이지 않는다');
  assert.equal(activeStreak(after.dayLog, fri), 2, '수 · 목 이틀 — 목요일이 구멍이 되지 않는다');
  // 다시 읽어도(쓰기 전에 늘 읽는다) 아무것도
  assert.deepEqual(planOps(ops, after, fri), []);
  assert.deepEqual(planOps([...ops, ...ops], after, fri), []);
});

test('위젯 2: 직접 담아 둔 한 번은 오늘 목록에서도 빠진다 — 남으면 금요일에 한 것으로 센다', () => {
  const { doc, op, fri } = thursdayNight({ todayKeys: ['0-1'] });
  const opened = rolloverToday(doc, '2026-11-20');
  assert.deepEqual(opened.todayKeys, ['0-1'], '아직 안 한 한 번은 날을 넘어 남아 있다');
  const cmds = planOps([op('0-1')], opened, fri);
  assert.deepEqual(cmds, [{ kind: 'checkOnceOn', ti: 0, ai: 1, day: '2026-11-19' }]);
  const after = runCommands(opened, cmds, '2026-11-20');
  assert.deepEqual(after.todayKeys, []);
  assert.deepEqual(after.dayLog['2026-11-19'], ['0-1']);
  assert.equal(after.dayLog['2026-11-20'], undefined);
  const p = todayProgress(after, fri);
  assert.equal(p.done, 0);
  // 같은 날(오늘) 체크는 목록의 체크 그대로 — 한 것으로 목록에 남는다
  const same = checkOnceOn(opened, 0, 1, '2026-11-20', '2026-11-20');
  assert.deepEqual(same.todayKeys, ['0-1']);
  assert.deepEqual(same.dayLog['2026-11-20'], ['0-1']);
  const sameX = checkExtraOn(opened, 'e1', '2026-11-20', '2026-11-20');
  assert.deepEqual(sameX.todayExtra, [{ id: 'e1', ti: 1, text: 'Buy stamps', done: true }]);
  assert.deepEqual(sameX.dayLog['2026-11-20'], ['1-xe1']);
});

test('위젯 2: 목요일에 켜고 금요일에 또 켠 것은 목요일에 한 것 — 위젯의 다음 날 칸은 어제 켠 한 번을 다시 안 한 것으로 그린다', () => {
  const { doc, op } = thursdayNight();
  const sat = new Date(2026, 10, 21, 9);
  const opened = rolloverToday(doc, '2026-11-21');
  const again = (k) => [op(k), op(k, { day: '2026-11-20', at: new Date(2026, 10, 20, 7).getTime() })];
  assert.deepEqual(planOps([...again('0-0'), ...again('x:e1')], opened, sat), [
    { kind: 'checkOnceOn', ti: 0, ai: 0, day: '2026-11-19' },
    { kind: 'checkExtraOn', id: 'e1', day: '2026-11-19' },
  ]);
  // 금요일에 앱을 열었을 때도(오늘의 op가 가장 늦다) 한 날은 목요일
  assert.deepEqual(planOps(again('0-0'), rolloverToday(doc, '2026-11-20'), new Date(2026, 10, 20, 8)), [{ kind: 'checkOnceOn', ti: 0, ai: 0, day: '2026-11-19' }]);
  // 목요일에 껐다가 금요일에 켠 것은 금요일에 한 것
  const off = op('0-0', { on: false, at: op('x').at + 5 });
  assert.deepEqual(planOps([op('0-0'), off, op('0-0', { day: '2026-11-20', at: off.at + 9 })], rolloverToday(doc, '2026-11-20'), new Date(2026, 10, 20, 8)), [{ kind: 'checkToday', ti: 0, ai: 0 }]);
});

test('위젯 2: 지난 날의 끔은 달성을 남겼던 날의 기록을 뺀다 · 바꿀 것이 없으면 같은 문서', () => {
  const { doc, op, fri } = thursdayNight();
  // 수요일에 앱에서 달성한 한 번을 목요일 밤 위젯에서 풀었다
  const done = toggleCellDone(doc, 0, 0, '2026-11-18');
  assert.deepEqual(done.dayLog['2026-11-18'], ['1-1', '0-0']);
  const opened = rolloverToday(done, '2026-11-20');
  const cmds = planOps([op('0-0', { on: false })], opened, fri);
  assert.deepEqual(cmds, [{ kind: 'checkToday', ti: 0, ai: 0 }]);
  const after = runCommands(opened, cmds, '2026-11-20');
  assert.equal(after.themes[0].actions[0].done, false);
  assert.deepEqual(after.dayLog, { '2026-11-18': ['1-1'] });
  // 이미 달성 · 한 번이 아닌 칸 · 빈 칸 · 앞날 · 날짜가 아닌 것 → 그대로(같은 객체)
  assert.equal(checkOnceOn(done, 0, 0, '2026-11-19', '2026-11-20'), done);
  const habit = { ...doc, themes: doc.themes.map((t, i) => (i === 0 ? { ...t, actions: t.actions.map((a, j) => (j === 0 ? { ...a, kind: 'habit', days: [1] } : a)) } : t)) };
  assert.equal(checkOnceOn(habit, 0, 0, '2026-11-19', '2026-11-20'), habit);
  assert.equal(checkOnceOn(doc, 5, 5, '2026-11-19', '2026-11-20'), doc);
  assert.equal(checkOnceOn(doc, 0, 0, '2026-11-21', '2026-11-20'), doc);
  assert.equal(checkOnceOn(doc, 0, 0, 'yesterday', '2026-11-20'), doc);
  // 없는 할 일 · 이미 끝낸 것 · 앞날
  assert.equal(checkExtraOn(doc, 'gone', '2026-11-19', '2026-11-20'), doc);
  const finished = { ...doc, todayExtra: [{ id: 'e1', ti: 1, text: 'Buy stamps', done: true }] };
  assert.equal(checkExtraOn(finished, 'e1', '2026-11-19', '2026-11-20'), finished);
  assert.equal(checkExtraOn(doc, 'e1', '2026-11-21', '2026-11-20'), doc);
});

test('위젯 2: 저장소 · 손잡이 — checkOnceOn · checkExtraOn은 그날(day)과 오늘(dateKey())을 넘겨 그 두 함수를 부른다', () => {
  const s = src('src/store/MandaratContext.tsx');
  assert.match(s, /import \{ checkExtraOn as extraOn, checkOnceOn as onceOn \} from '\.\.\/lib\/widgetOps';/);
  assert.match(s, /checkOnceOn: \(ti: number, ai: number, day: string\) => void;/);
  assert.match(s, /checkExtraOn: \(id: string, day: string\) => void;/);
  assert.match(s, /const checkOnceOn = useCallback\(\s*\(ti: number, ai: number, day: string\) => update\(\(d\) => onceOn\(d, ti, ai, day, dateKey\(\)\)\),/);
  assert.match(s, /const checkExtraOn = useCallback\(\s*\(id: string, day: string\) => update\(\(d\) => extraOn\(d, id, day, dateKey\(\)\)\),/);
  assert.equal((s.match(/^\s*checkOnceOn, checkExtraOn,$/gm) || []).length, 2, '함수 묶음과 그 의존성 목록');
  const host = src('src/hosts/WidgetSync.tsx');
  assert.match(host, /cmd\.kind === 'checkOnceOn'\) actions\.checkOnceOn\(cmd\.ti, cmd\.ai, cmd\.day\)/);
  assert.match(host, /cmd\.kind === 'checkExtraOn'\) actions\.checkExtraOn\(cmd\.id, cmd\.day\)/);
  // 손잡이는 planOps가 내는 모든 명령을 안다 — 모르는 것은 마지막 else(오늘 열기)로 떨어진다
  const kinds = [...src('src/lib/widgetOps.ts').matchAll(/^\s*\| \{ kind: '(\w+)'/gm)].map((m) => m[1]);
  assert.deepEqual(kinds, ['checkToday', 'toggleHabitOn', 'addCountOn', 'checkOnceOn', 'toggleExtra', 'checkExtraOn', 'focus', 'open']);
  for (const k of kinds.filter((x) => x !== 'open')) assert.ok(host.includes(`cmd.kind === '${k}'`), k);
});

// ── 3. 템플릿으로 바꿔도 아직 안 한 직접 추가한 할 일은 남는다 ─────────────────────

test('저장소 3: 템플릿으로 바꾸기는 아직 안 한 직접 추가한 할 일을 남긴다 — 예시로 채우기 · 새 표와 같게', () => {
  const s = src('src/store/MandaratContext.tsx');
  const tpl = s.slice(s.indexOf('const applyTemplate = useCallback('), s.indexOf('const replaceDoc = useCallback('));
  assert.match(tpl, /todayKeys: \[\],\s*todayExtra: d\.todayExtra\.filter\(\(x\) => !x\.done\),\s*dayLog: archiveAllCells\(d\.dayLog, Date\.now\(\)\),/);
  assert.doesNotMatch(s, /todayExtra: \[\]/, '저장소는 직접 추가한 할 일을 통째로 비우지 않는다');
  // 새 표(archive.startNewChart)와 같은 식 · 예시로 채우기는 목록을 건드리지 않는다
  assert.match(src('src/lib/archive.ts'), /todayExtra: doc\.todayExtra\.filter\(\(x\) => !x\.done\),/);
  const sample = s.slice(s.indexOf('const loadSample = useCallback('), s.indexOf('const resetUndo = useRef'));
  assert.doesNotMatch(sample, /todayExtra/);
  // 그 식이 하는 일
  const d = { ...blankDoc(), todayDate: '2026-11-20', todayExtra: [{ id: 'a', ti: 0, text: '우체국', done: false }, { id: 'b', ti: 3, text: '전화', done: true }, { id: 'c', ti: 7, text: '장보기', done: false }] };
  assert.deepEqual(d.todayExtra.filter((x) => !x.done).map((x) => x.id), ['a', 'c']);
  // 되돌리기는 바꾸기 전 문서를 통째로 넣는다(replaceDoc → 같은 날이면 하루 정리는 그대로 돌려준다) — 끝낸 할 일까지 그대로 돌아온다
  assert.equal(rolloverToday(d, '2026-11-20'), d);
  assert.match(src('src/screens/Settings.tsx'), /const snapshot = d; \/\/ 되돌리기용[\s\S]{0,260}applyTemplate\([\s\S]{0,120}offerUndo\(st\.templateDone\(\{ name: t\.name \}\), snapshot\);/);
  assert.match(s, /const replaceDoc = useCallback\(\(d: MandaratDoc\) => \{\s*dropEditorDraft\(\);\s*revRef\.current \+= 1;\s*commit\(rolloverToday\(d, dateKey\(\)\)\);/);
});

// ── 4. 켤 때 읽은 그대로면 다시 쓰지 않는다 ─────────────────────────────────────

/** 앱이 쓰던 문서 — 오늘 몇 가지를 한 뒤 저장된 모습 */
function usedDoc(todayKey) {
  let d = migrate({ ...blankDoc(), onboarded: true, centerGoal: '단단한 한 해', themes: sampleThemes(new Date(2026, 10, 20), 'ko') });
  d = rolloverToday(d, todayKey);
  d = toggleCellDone(d, 0, 0, todayKey);
  return { ...d, todayKeys: ['0-2'], todayExtra: [{ id: 'e1', ti: 1, text: '우체국', done: true }, { id: 'e2', ti: 2, text: '전화', done: false }], dayMeta: { [todayKey]: { mood: 3, reflection: '괜찮은 하루' } } };
}

test('저장소 4: 읽은 값과 다시 쓸 값이 글자까지 같으면 켤 때 쓰지 않는다 — 날이 넘어갔거나 메타가 새로 생기면 쓴다', () => {
  const TK = '2026-11-20';
  const wall = new Date(2026, 10, 20, 9).getTime();
  for (const [name, makeMeta, open] of [['ios', () => newSyncMeta(Math.random), openStored], ['web', null, webCommit.openStored]]) {
    // 한 번 열어 저장한 값(앱이 실제로 쓰는 모양)
    const first = open(serializeStored(usedDoc(TK), makeMeta ? makeMeta() : null), TK, wall, makeMeta);
    const stored = serializeStored(first.doc, first.meta);
    // 같은 날 다시 켠다 — 저장소가 견주는 그대로: serializeStored(읽은 문서, 읽은 메타) === 읽은 값
    const again = open(stored, TK, wall + 60_000, makeMeta);
    assert.equal(serializeStored(again.doc, again.meta), stored, `${name}: 바뀐 것이 없으면 같은 글자 → 쓰지 않는다`);
    // 다음 날 켠다 — 하루 정리(끝낸 할 일 빼기 · 날짜)가 바꿨으니 쓴다
    const next = open(stored, '2026-11-21', wall + 86_400_000, makeMeta);
    assert.notEqual(serializeStored(next.doc, next.meta), stored, `${name}: 날이 넘어가면 쓴다`);
    assert.deepEqual(next.doc.todayExtra.map((x) => x.id), ['e2']);
    // 옛 모양(정리가 고치는 값)이면 쓴다
    const legacy = JSON.stringify({ ...JSON.parse(stored), todayKeys: ['0-2', '0-2', '9-9'] });
    const fixed = open(legacy, TK, wall, makeMeta);
    assert.notEqual(serializeStored(fixed.doc, fixed.meta), legacy, `${name}: 정리로 바뀌면 쓴다`);
  }
  // iOS: 저장본에 메타가 없으면(처음 맞추기를 넣은 판) 새 메타를 써야 한다 — 기기 번호가 켤 때마다 바뀌지 않게
  const bare = serializeStored(usedDoc(TK), null);
  const withMeta = openStored(bare, TK, wall, () => newSyncMeta(Math.random));
  assert.ok(withMeta.meta);
  assert.notEqual(serializeStored(withMeta.doc, withMeta.meta), bare);
});

test('저장소 4: 저장 효과 — 켤 때 한 번만 건너뛰고, 하루 저장본은 같은 때(300ms 뒤)에 그대로 챙긴다', () => {
  const s = src('src/store/MandaratContext.tsx');
  // 읽은 뒤: persist가 쓸 짝(latest · metaRef)을 읽은 값과 견준다. 저장본이 없던 첫 실행(loaded === null)은 늘 쓴다
  const load = s.slice(s.indexOf('// load once'), s.indexOf('// debounced persist'));
  assert.match(load, /if \(loaded\) commit\(loaded\.doc, 'none'\);\s*\/\/[^\n]*\n\s*launchSame\.current = loaded !== null && read\.ok && serializeStored\(latest\.current, metaRef\.current\) === read\.raw;/);
  assert.ok(load.indexOf('launchSame.current =') < load.indexOf('setReady(true)'), '준비됐다고 알리기 전에 정한다');
  const effect = s.slice(s.indexOf('// debounced persist'), s.indexOf('// 내려갈 때(오류 화면 등)'));
  // 건너뛰는 것은 한 번 — 그 뒤(문서 · 메타가 바뀌면)는 보통 저장. 되돌리기로 읽은 문서와 같은 객체가 돌아와도 쓴다
  assert.match(effect, /if \(!ready \|\| blockSave\.current\) return;\s*(\/\/[^\n]*\n\s*)*if \(launchSame\.current\) \{\s*launchSame\.current = false;\s*const snap = setTimeout\(\(\) => snapshot\(latest\.current\), 300\);\s*return \(\) => clearTimeout\(snap\);\s*\}\s*if \(saveTimer\.current\) clearTimeout\(saveTimer\.current\);\s*pendingSave\.current = true;/);
  assert.match(effect, /\}, \[doc, saveTick, ready, persist, snapshot\]\);/);
  assert.equal((s.match(/launchSame\.current = /g) || []).length, 2, '읽을 때 정하고, 효과가 한 번 내린다');
  // 하루 저장본은 예전처럼 저장 뒤에도 남긴다(그날 처음 한 번 — snapshot이 날을 기억한다)
  assert.match(s, /setSaveFailed\(false\);\s*snapshot\(d\);/);
  assert.match(s, /const snapshot = useCallback\(\(d: MandaratDoc\) => \{\s*const day = dateKey\(\);\s*if \(!d\.onboarded \|\| snapDay\.current === day\) return;/);
  // 위젯 타임라인 · 맞추기는 이 저장에 기대지 않는다: 위젯은 처음 한 번 늘 쓰고(lastSig가 null), 메타만 바뀌면 saveTick이 저장을 부른다
  assert.match(src('src/hosts/WidgetSync.tsx'), /const lastSig = useRef<string \| null>\(null\);/);
  assert.match(s, /setMeta: \(m\) => \{\s*metaRef\.current = m;\s*setSaveTick\(\(t\) => t \+ 1\);/);
});
