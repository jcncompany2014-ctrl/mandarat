// V5-D — 앱스토어 스크린샷 도구(tools/store-shots): 기기 크기 계산, 언어마다 같은 설명 키, 예시 문서가 migrate를 그대로 통과하는지,
// 예시 문서에 프로 미리보기가 없는지, RGB PNG(알파 없음)를 쓰고 검사하는지, 시간대 벽시계가 맞는지.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, '..', 'tools', 'store-shots');
const { DEVICES, pickDevices } = require(path.join(TOOL, 'devices'));
const { SCENES, pickScenes, finishDay, unreviewed } = require(path.join(TOOL, 'scenes'));
const { msg } = require('../src/i18n');
const { encodeRGB, decode, readHeader, toRGB } = require(path.join(TOOL, 'png'));
const { checkFile, verifyDir } = require(path.join(TOOL, 'verify'));
const { zonedEpoch, composeHtml, viewOf } = require(path.join(TOOL, 'shoot'));
const CAPTIONS = require(path.join(TOOL, 'captions.json'));
const { migrate } = require('../src/data/defaults');
const { TID } = require('../src/lib/testIds');

const LANGS = ['ko', 'ja', 'en'];
const fixture = (l) => require(path.join(TOOL, 'fixtures', l)).fixture();

test('기기: 논리 크기 × 배율 = 내보내는 크기, App Store 크기와 표시 형식', () => {
  const want = {
    'iphone-6.9': [1320, 2868, 'APP_IPHONE_67'],
    'iphone-6.3': [1206, 2622, 'APP_IPHONE_61'],
    'iphone-6.5': [1284, 2778, 'APP_IPHONE_65'],
    'ipad-13': [2064, 2752, 'APP_IPAD_PRO_3GEN_129'],
  };
  assert.deepEqual(DEVICES.map((d) => d.id), Object.keys(want));
  for (const d of DEVICES) {
    assert.deepEqual(d.out, [d.width * d.scale, d.height * d.scale], d.id);
    assert.deepEqual([...d.out, d.displayType], want[d.id], d.id);
    assert.ok(d.band > 0 && d.band < d.height / 4, `${d.id}: 설명 띠는 화면의 1/4보다 작게`);
  }
  assert.equal(DEVICES.find((d) => d.id === 'ipad-13').query, 'layout=device');
  assert.deepEqual(pickDevices('iphone-6.9,ipad-13').map((d) => d.id), ['iphone-6.9', 'ipad-13']);
  assert.equal(pickDevices('all').length, 4);
  assert.throws(() => pickDevices('iphone-se'));
});

test('장면: 여섯, 정한 순서, 고르면 순서를 지킨다', () => {
  assert.deepEqual(SCENES.map((s) => s.id), ['chart', 'today', 'home', 'stats', 'ritual', 'year']);
  assert.deepEqual(pickScenes('year,chart').map((s) => s.id), ['chart', 'year']);
  assert.throws(() => pickScenes('settings'));
});

test('장면은 testID로만 찾는다 — 글자(getByText · :has-text)로 찾지 않고, 쓰는 TID는 모두 목록에 있다', () => {
  const src = fs.readFileSync(path.join(TOOL, 'scenes.js'), 'utf8');
  assert.doesNotMatch(src, /getByText|has-text|text=|aria-label/);
  const used = [...src.matchAll(/h\.TID\.(\w+)/g)].map((m) => m[1]);
  // statsWear는 V5-B에 요청한 것 — 없으면 statsYear의 스크롤 판에서 앱 문구로 머리를 찾고, 그것도 없으면 거리로 내린다
  for (const id of used) if (id !== 'statsWear') assert.ok(id in TID, `TID.${id}`);
  // 글로 찾는 곳은 그 한 군데뿐이고, 글은 손으로 쓴 말이 아니라 앱 문구(msg().stats.secAreas)
  assert.match(src, /scrollToHead\(page, h\.TID\.statsYear, msg\(h\.lang\)\.stats\.secAreas\)/);
  assert.equal((src.match(/textContent/g) || []).length, 1);
  for (const l of LANGS) assert.ok(msg(l).stats.secAreas.length > 0, l);
});

test('아이패드 한 주 돌아보기는 704pt 창 — PNG 크기는 그대로, 배율만 오른다(R-6 D-12)', () => {
  const ritual = SCENES.find((s) => s.id === 'ritual');
  assert.equal(ritual.padWidth, 704);
  // 704pt는 한 단 배치(600 이상 960 미만) — 한 단 640pt + 양옆 종이 32pt
  assert.ok(ritual.padWidth >= 600 && ritual.padWidth < 960);
  for (const d of DEVICES) {
    const v = viewOf(d, ritual);
    const appH = d.height - d.band;
    if (d.width < 700) {
      assert.deepEqual(v, { width: d.width, height: appH, scale: d.scale }, `${d.id}: 폰은 그대로`);
      continue;
    }
    assert.equal(v.width, 704);
    assert.ok(Math.abs(v.width * v.scale - d.width * d.scale) < 1e-9, `${d.id}: PNG 폭 ${d.out[0]}`);
    assert.ok(Math.abs(v.height * v.scale - appH * d.scale) <= v.scale / 2 + 1e-9, `${d.id}: PNG 높이`);
  }
  // padWidth가 없는 장면은 어느 기기든 그대로
  for (const d of DEVICES) assert.deepEqual(viewOf(d, SCENES[0]), { width: d.width, height: d.height - d.band, scale: d.scale });
});

test('설명: 언어마다 같은 키, 장면마다 하나, 짧게', () => {
  assert.deepEqual(Object.keys(CAPTIONS).sort(), [...LANGS].sort());
  const keys = SCENES.map((s) => s.id).sort();
  for (const l of LANGS) {
    assert.deepEqual(Object.keys(CAPTIONS[l]).sort(), keys, l);
    for (const [k, v] of Object.entries(CAPTIONS[l])) {
      assert.ok(v.trim() === v && v.length > 0 && v.length <= 34, `${l}.${k}: ${v}`);
      assert.doesNotMatch(v, /[\u{1F300}-\u{1FAFF}☀-➿!]/u, `${l}.${k}: 이모지 · 느낌표 없이`);
    }
  }
  assert.equal(CAPTIONS.ko.chart, '81칸에 한 해 계획을 적어요');
  assert.equal(CAPTIONS.ko.ritual, '일요일엔 한 주를 돌아봐요');
});

for (const l of LANGS) {
  test(`예시 문서(${l}): migrate를 그대로 통과하고 JSON 왕복에도 같다`, () => {
    const f = fixture(l);
    assert.deepStrictEqual(migrate(f), f);
    assert.deepStrictEqual(migrate(JSON.parse(JSON.stringify(f))), f);
    // 장면이 고친 문서도
    assert.deepStrictEqual(migrate(finishDay(f)), finishDay(f));
    assert.deepStrictEqual(migrate(unreviewed(f)), unreviewed(f));
  });

  test(`예시 문서(${l}): 70일 기록 · 회고 · 돌아본 주, 지난 표 한 장, 점 종이`, () => {
    const f = fixture(l);
    const days = Object.keys(f.dayLog).sort();
    assert.equal(days.length, 70);
    assert.equal(days[0], '2026-08-06');
    assert.equal(days[days.length - 1], '2026-10-14');
    assert.equal(f.chartStart, '2026-08-06');
    assert.ok(Object.values(f.dayMeta).filter((m) => m.reflection).length >= 10, '한 줄 회고');
    assert.ok(Object.keys(f.reviews).length >= 8, '돌아본 주');
    assert.deepEqual(f.reviews['2026-10-05'].next.length, 3, '이번 주 중점');
    assert.equal(f.archives.length, 1);
    assert.equal(f.settings.paper, undefined);
    assert.equal(f.onboarded, true);
    assert.ok(f.themes.every((t) => t.title && t.actions.every((a) => a.text.trim() !== '')), '64칸이 모두 적혀 있다');
  });

  test(`예시 문서(${l}): 실행마다 같다(고정한 시드)`, () => {
    assert.deepStrictEqual(fixture(l), fixture(l));
  });
}

test('예시 문서는 언어마다 그 언어로 쓴다', () => {
  const words = (f) => [f.centerGoal, ...f.themes.flatMap((t) => [t.title, ...t.actions.map((a) => a.text)])].join(' ');
  assert.match(words(fixture('ko')), /[가-힣]/);
  assert.doesNotMatch(words(fixture('ja')), /[가-힣]/);
  assert.match(words(fixture('ja')), /[぀-ヿ]/);
  assert.doesNotMatch(words(fixture('en')), /[가-힣぀-ヿ一-鿿]/);
});

test('예시 문서와 도구에 프로 미리보기(EXPO_PUBLIC_PRO_PREVIEW)가 없다', () => {
  const files = ['fixtures/build.js', 'fixtures/ko.js', 'fixtures/ja.js', 'fixtures/en.js', 'scenes.js', 'devices.js'];
  for (const f of files) assert.doesNotMatch(fs.readFileSync(path.join(TOOL, f), 'utf8'), /EXPO_PUBLIC_PRO_PREVIEW/, f);
  for (const l of LANGS) assert.doesNotMatch(JSON.stringify(fixture(l)), /PRO_PREVIEW/);
});

test('장면 고치기: 홈은 오늘을 다 해 마감, 돌아보기는 지난주 돌아보기를 비운다', () => {
  const f = fixture('ko');
  const done = finishDay(f);
  assert.ok(done.closedDays.includes('2026-10-14'));
  assert.ok(done.dayLog['2026-10-14'].length > f.dayLog['2026-10-14'].length);
  assert.ok(f.reviews['2026-10-05']);
  assert.equal(unreviewed(f).reviews['2026-10-05'], undefined);
  assert.ok(f.reviews['2026-10-05'], '원본은 그대로');
});

test('PNG: RGBA를 알파 없는 RGB(색 형식 2)로, 반투명은 종이색 위에', () => {
  const zlib = require('zlib');
  // 2×2 RGBA를 손으로 만든다(거르기 0)
  const px = [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 0], [10, 20, 30, 255]];
  const raw = Buffer.from([0, ...px[0], ...px[1], 0, ...px[2], ...px[3]]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const { crc32 } = require(path.join(TOOL, 'png'));
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
    return Buffer.concat([len, Buffer.from(type), data, crc]);
  };
  const rgba = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  assert.equal(readHeader(rgba).colorType, 6);
  const out = toRGB(rgba, [251, 249, 244]);
  const h = readHeader(out);
  assert.deepEqual([h.width, h.height, h.bitDepth, h.colorType], [2, 2, 8, 2]);
  assert.deepEqual([...decode(out).rgb], [255, 0, 0, 0, 255, 0, 251, 249, 244, 10, 20, 30]);
});

test('PNG: 거르기(위)를 쓴 RGB도 그대로 돌아온다', () => {
  const width = 7;
  const height = 5;
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37 + (i % 9) * 11) & 0xff;
  for (let i = width * 3; i < width * 6; i++) rgb[i] = rgb[i - width * 3]; // 같은 줄 → 위 거르기
  assert.deepEqual(decode(encodeRGB({ width, height, rgb })).rgb, rgb);
});

test('verify: 크기와 색 형식을 본다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-'));
  const dev = DEVICES.find((d) => d.id === 'iphone-6.9');
  const good = path.join(dir, 'ko', dev.id);
  fs.mkdirSync(good, { recursive: true });
  const [w, h] = dev.out;
  fs.writeFileSync(path.join(good, '01-chart.png'), encodeRGB({ width: w, height: h, rgb: Buffer.alloc(w * h * 3, 250) }));
  assert.deepEqual(verifyDir(dir).problems, []);
  fs.writeFileSync(path.join(good, '02-today.png'), encodeRGB({ width: 10, height: 10, rgb: Buffer.alloc(300) }));
  assert.equal(checkFile(path.join(good, '02-today.png'), dev).length, 1);
  assert.equal(verifyDir(dir).problems.length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('시계: 기기 시간대의 벽시계(서울 · 도쿄 · 로스앤젤레스 여름 시간)', () => {
  assert.equal(new Date(zonedEpoch('2026-10-14T09:30:00', 'Asia/Seoul')).toISOString(), '2026-10-14T00:30:00.000Z');
  assert.equal(new Date(zonedEpoch('2026-10-14T09:30:00', 'Asia/Tokyo')).toISOString(), '2026-10-14T00:30:00.000Z');
  assert.equal(new Date(zonedEpoch('2026-10-14T09:30:00', 'America/Los_Angeles')).toISOString(), '2026-10-14T16:30:00.000Z');
});

test('설명 띠: 종이색 · 먹색 · 왼쪽 맞춤, 그라데이션 · 그림자 · 둥근 테두리 없음, 일본어는 Hiragino', () => {
  const png = Buffer.from('x');
  const html = composeHtml({ device: DEVICES[0], lang: 'ja', caption: 'a<b', folio: '01 / 06', png });
  assert.match(html, /Hiragino Sans/);
  assert.match(html, /a&lt;b/);
  assert.match(html, /#FBF9F4/);
  assert.doesNotMatch(html, /gradient|box-shadow|border-radius|text-align:\s*center/);
  assert.doesNotMatch(composeHtml({ device: DEVICES[0], lang: 'ko', caption: 'x', folio: '', png }), /Hiragino/);
});
