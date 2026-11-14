// V5-D · R1 — 앱스토어 스크린샷 도구(tools/store-shots): 포스터 여섯 장(머리말 · 두 줄 제목 · 그림 하나, build-plan §3 R1),
// 기기 크기, 언어마다 같은 글 키, 장면은 testID로만, 그림의 자리와 배율, 위젯 그림, 예시 문서가 migrate를 그대로 통과하는지,
// 프로 미리보기가 없는지, RGB PNG(알파 없음)를 쓰고 검사하는지, 시간대 벽시계가 맞는지.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, '..', 'tools', 'store-shots');
const { DEVICES, pickDevices } = require(path.join(TOOL, 'devices'));
const { SCENES, pickScenes, finishDay } = require(path.join(TOOL, 'scenes'));
const { encodeRGB, decode, readHeader, toRGB } = require(path.join(TOOL, 'png'));
const { checkFile, verifyDir } = require(path.join(TOOL, 'verify'));
const { zonedEpoch, wallDate } = require(path.join(TOOL, 'shoot'));
const { layout, composeHtml, widgetMap, tickThird, homeGrid, widgetsBlock, GROUNDS } = require(path.join(TOOL, 'poster'));
const CAPTIONS = require(path.join(TOOL, 'captions.json'));
const { migrate } = require('../src/data/defaults');
const { TID } = require('../src/lib/testIds');
const { LIGHT } = require('../src/theme/tokens');
const { widgetProps } = require('../src/lib/widgetSnapshot');

const LANGS = ['ko', 'ja', 'en'];
const IDS = ['chart', 'today', 'widgets', 'home', 'stats', 'year'];
const fixture = (l) => require(path.join(TOOL, 'fixtures', l)).fixture();
const src = (f) => fs.readFileSync(path.join(TOOL, f), 'utf8');

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
  }
  assert.equal(DEVICES.find((d) => d.id === 'ipad-13').query, 'layout=device');
  assert.deepEqual(pickDevices('iphone-6.9,ipad-13').map((d) => d.id), ['iphone-6.9', 'ipad-13']);
  assert.equal(pickDevices('all').length, 4);
  assert.throws(() => pickDevices('iphone-se'));
});

test('장면: 여섯, 정한 순서(지도 · 오늘 · 위젯 · 홈 · 통계 · 한 해), 바탕은 종이 · tile · mid가 두 번', () => {
  assert.deepEqual(SCENES.map((s) => s.id), IDS);
  assert.deepEqual(SCENES.map((s) => s.ground), ['paper', 'tile', 'mid', 'paper', 'tile', 'mid']);
  assert.deepEqual(GROUNDS, { paper: LIGHT.paper, tile: LIGHT.tile, mid: LIGHT.printMid });
  assert.equal(GROUNDS.mid, '#D5D9DE');
  // 브랜드 마크는 1번 아래에만, 위젯은 앱을 찍지 않고 그린다
  assert.deepEqual(SCENES.filter((s) => s.brand).map((s) => s.id), ['chart']);
  assert.deepEqual(SCENES.filter((s) => s.widgets).map((s) => s.id), ['widgets']);
  for (const s of SCENES) if (!s.widgets) for (const k of ['run', 'plan', 'crop']) assert.equal(typeof s[k], 'function', `${s.id}.${k}`);
  assert.deepEqual(pickScenes('year,chart').map((s) => s.id), ['chart', 'year']);
  assert.throws(() => pickScenes('ritual'));
});

test('장면은 testID로만 찾는다 — 글자로 찾지 않고, 쓰는 TID는 모두 목록에 있다', () => {
  const s = src('scenes.js');
  assert.doesNotMatch(s, /getByText|has-text|text=|aria-label|textContent|innerText/);
  const used = [...s.matchAll(/h\.TID\.(\w+)/g)].map((m) => m[1]);
  for (const id of used) assert.ok(id in TID, `TID.${id}`);
  for (const id of ['gridTable', 'todayModes', 'homeHero', 'todayRow', 'statsScope', 'statsYear', 'yearFrames']) assert.ok(used.includes(id), id);
  // 한 해 쪽은 올해 범위 안에 있다 — 올해를 누른 다음에 한 해 줄(build-plan §6 From S4)
  const year = s.slice(s.indexOf("id: 'year'"));
  assert.ok(year.indexOf("statsScope('year')") >= 0 && year.indexOf("statsScope('year')") < year.indexOf('TID.statsYear'));
});

test('도구는 예전 무드 테마(MOODS · ACCENTS · GOLD · TYPE · RHYTHM)에 기대지 않는다 — 색은 토큰(LIGHT)', () => {
  for (const f of ['shoot.js', 'poster.js', 'scenes.js', 'devices.js']) {
    assert.doesNotMatch(src(f), /theme[/\\]moods|\bMOODS\b|\bACCENTS\b|\bGOLD\b|\bRHYTHM\b|\bTYPE\b/, f);
  }
  assert.match(src('poster.js'), /theme', 'tokens'/);
});

test('뼈대: 폰은 32pt 여백, 제목은 두 줄 · 머리말의 2~3배, 그림은 제목 아래', () => {
  for (const d of DEVICES) {
    const L = layout(d);
    assert.equal(L.W, d.width);
    assert.equal(L.H, d.height);
    if (!L.pad) assert.equal(L.m, 32, d.id);
    const ratio = L.head.size / L.eyebrow.size;
    assert.ok(ratio >= 2 && ratio <= 3, `${d.id}: ${ratio}`);
    assert.ok(L.head.top >= L.eyebrow.top + L.eyebrow.line, d.id);
    assert.ok(L.pic >= L.head.top + 2 * L.head.line + 40, d.id);
    assert.ok(L.pic < L.H / 2, d.id);
  }
});

test('그림의 자리: 캔버스 안, 제목 아래, 아이패드 창은 600pt 아래(한 단 둘레의 괘선이 찍히지 않게)', () => {
  for (const d of DEVICES) {
    const L = layout(d);
    for (const s of SCENES.filter((x) => !x.widgets)) {
      const P = s.plan(L);
      const tag = `${d.id} ${s.id}`;
      assert.ok(P.zoom > 0.85 && P.zoom < 2.2, `${tag}: zoom ${P.zoom}`);
      assert.ok(P.view.width >= 320, tag);
      if (L.pad) assert.ok(P.view.width < 600, `${tag}: ${P.view.width}`);
      assert.ok(P.at.y >= L.pic, tag);
      assert.ok(P.at.x >= 0 && P.at.x < L.W / 2, tag);
      if (P.sheet) {
        assert.ok(P.sheet.y === L.pic && P.sheet.x >= 0, tag);
        assert.ok(['top', 'tl', 'tr'].includes(P.sheet.round), tag);
        // 종이가 캔버스 밖으로 이어진다(아래로) — 그림은 종이 안에서 시작한다
        assert.ok(P.at.y >= P.sheet.y && P.at.x >= P.sheet.x, tag);
      } else {
        // 바탕에 그대로 놓는 그림(앱 본문 폭 = 창 − 48)은 글 여백 안
        const w = (P.view.width - 48) * P.zoom;
        assert.ok(P.at.x === L.m && P.at.x + w <= L.W - L.m + 1, `${tag}: ${P.at.x + w}`);
      }
    }
  }
});

test('글: 언어마다 같은 키, 장면마다 머리말 하나와 두 줄 제목, 짧게, 느낌표 · 이모지 없이, 앱 이름', () => {
  assert.deepEqual(Object.keys(CAPTIONS).sort(), [...LANGS].sort());
  const max = { ko: 12, ja: 10, en: 21 };
  for (const l of LANGS) {
    assert.deepEqual(Object.keys(CAPTIONS[l]).sort(), [...IDS, 'brand'].sort(), l);
    for (const id of IDS) {
      const c = CAPTIONS[l][id];
      const tag = `${l}.${id}`;
      assert.ok(typeof c.eyebrow === 'string' && c.eyebrow.trim() === c.eyebrow && c.eyebrow.length > 0 && c.eyebrow.length <= 20, tag);
      assert.equal(c.head.length, 2, `${tag}: 두 줄`);
      for (const line of c.head) {
        assert.ok(line.trim() === line && line.length > 0 && [...line].length <= max[l], `${tag}: ${line}`);
        assert.doesNotMatch(line, /[\u{1F300}-\u{1FAFF}☀-➿!！]/u, `${tag}: 이모지 · 느낌표 없이`);
      }
      assert.doesNotMatch(c.eyebrow, /[\u{1F300}-\u{1FAFF}☀-➿!！]/u, tag);
    }
  }
  assert.equal(CAPTIONS.ko.brand, '만다라트 플래너');
  assert.equal(CAPTIONS.ja.brand, 'マンダラート プランナー');
  assert.equal(CAPTIONS.en.brand, 'Mandalart Planner');
  // 승인된 목업(store.png)의 1 · 2 · 3번 글
  assert.deepEqual(CAPTIONS.ko.chart, { eyebrow: '만다라트 계획표', head: ['한 해 목표를', '한 장에 채워요'] });
  assert.deepEqual(CAPTIONS.ko.today.head, ['표에 적은 일이', '오늘 할 일이 돼요']);
  assert.deepEqual(CAPTIONS.ko.widgets.head, ['홈 화면에서', '바로 체크해요']);
  // 일본어 · 영어 글은 일본어 · 영어로만
  for (const id of IDS) {
    assert.doesNotMatch(CAPTIONS.ja[id].head.join('') + CAPTIONS.ja[id].eyebrow, /[가-힣]/, id);
    assert.doesNotMatch(CAPTIONS.en[id].head.join('') + CAPTIONS.en[id].eyebrow, /[가-힣぀-ヿ一-鿿]/, id);
  }
});

for (const l of LANGS) {
  test(`예시 문서(${l}): migrate를 그대로 통과하고 JSON 왕복에도 같다`, () => {
    const f = fixture(l);
    assert.deepStrictEqual(migrate(f), f);
    assert.deepStrictEqual(migrate(JSON.parse(JSON.stringify(f))), f);
    // 장면이 고친 문서도
    assert.deepStrictEqual(migrate(finishDay(f)), finishDay(f));
  });

  test(`예시 문서(${l}): 70일 기록 · 회고 · 돌아본 주, 지난 표 한 장, 무지(종이 무늬 없음)`, () => {
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

  test(`위젯 그림(${l}): 위젯이 받는 값(widgetProps) 그대로, 셋째 줄만 막 체크한 모습`, () => {
    const p = widgetProps(fixture(l), wallDate('2026-10-14T09:30:00'), { pat: 'blank', lang: l });
    assert.ok(p.items.length >= 3 && !p.items[2].d, '셋째 줄은 아직 안 한 일');
    const t = tickThird(p);
    assert.deepEqual(t.items.map((x) => x.k), p.items.map((x) => x.k), '줄 순서 그대로');
    assert.equal(t.items[2].d, true);
    assert.equal(t.done, p.done + 1);
    assert.equal(p.items[2].d, false, '원본은 그대로');
    const html = composeHtml({ device: DEVICES[0], lang: l, scene: SCENES[2], caption: CAPTIONS[l].widgets, widgets: p, icon: Buffer.from('x') });
    for (const it of p.items.slice(0, 3)) assert.ok(html.includes(it.t.replace(/&/g, '&amp;')), it.t);
    assert.match(html, /class="w w-small"/);
    assert.match(html, /class="w w-medium"/);
    assert.match(html, /\.w-row \+ \.w-row::before/, 'parts-widgets.css를 그대로 쓴다');
    assert.ok(html.includes(`${t.done}/${t.total}`));
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
  const files = ['fixtures/build.js', 'fixtures/ko.js', 'fixtures/ja.js', 'fixtures/en.js', 'scenes.js', 'devices.js', 'poster.js'];
  for (const f of files) assert.doesNotMatch(src(f), /EXPO_PUBLIC_PRO_PREVIEW/, f);
  for (const l of LANGS) assert.doesNotMatch(JSON.stringify(fixture(l)), /PRO_PREVIEW/);
});

test('장면 고치기: 통계는 오늘을 다 한 하루(원본은 그대로)', () => {
  const f = fixture('ko');
  const done = finishDay(f);
  assert.ok(done.closedDays.includes('2026-10-14'));
  assert.ok(done.dayLog['2026-10-14'].length > f.dayLog['2026-10-14'].length);
  assert.ok(!(f.closedDays || []).includes('2026-10-14') || f.dayLog['2026-10-14'].length < done.dayLog['2026-10-14'].length);
  assert.equal(SCENES.find((s) => s.id === 'stats').prepare, finishDay);
});

test('위젯의 색 지도: 81칸, 위젯과 같은 수(칸 9 · 사이 1 · 블록 2), 가운데 core · 영역 dye · 달성 washL1 · 적은 칸 tint · 빈 칸 tile', () => {
  const cells = '2'.repeat(8) + '1'.repeat(8) + '0'.repeat(48);
  const svg = widgetMap(cells);
  assert.equal((svg.match(/<rect /g) || []).length, 81);
  assert.match(svg, /width="91"/);
  assert.ok(svg.includes(`fill="${LIGHT.core}"`));
  for (let i = 0; i < 8; i++) assert.ok(svg.includes(`fill="${LIGHT.dye[i]}"`), `dye ${i}`);
  assert.ok(svg.includes(`fill="${LIGHT.washL1[0]}"`));
  assert.ok(svg.includes(`fill="${LIGHT.tint[1]}"`));
  assert.ok(svg.includes(`fill="${LIGHT.tile}"`));
  // 홈 화면: 폰은 네 칸, 아이패드는 여섯 칸 줄. 위젯 블록은 캔버스 안
  assert.ok(homeGrid(false, 1).width < homeGrid(true, 1).width);
  const p = widgetProps(fixture('ko'), wallDate('2026-10-14T09:30:00'), { pat: 'blank', lang: 'ko' });
  for (const d of DEVICES) {
    const L = layout(d);
    const { k, grid } = widgetsBlock(L, p, 'data:,');
    assert.ok(L.pic + grid.height * k <= L.H - L.bottom + 1, d.id);
    assert.ok(grid.width * k <= L.W - 2 * 24, d.id);
  }
});

test('포스터 HTML: 토큰 색 · Pretendard(일본어는 Noto Sans JP), 그라데이션 · 이모지 없음, 종이는 위 모서리만 둥글다', () => {
  const png = Buffer.from('x');
  const dev = DEVICES[0];
  const L = layout(dev);
  for (const s of SCENES.filter((x) => !x.widgets)) {
    const plan = s.plan(L);
    for (const l of LANGS) {
      const html = composeHtml({ device: dev, lang: l, scene: s, caption: CAPTIONS[l][s.id], brand: CAPTIONS[l].brand, plan, picture: { png, w: 100, h: 100 }, icon: png });
      const tag = `${s.id} ${l}`;
      assert.doesNotMatch(html, /gradient|text-align:\s*center/, tag);
      assert.ok(html.includes(`background: ${GROUNDS[s.ground]}`), tag);
      assert.ok(html.includes(CAPTIONS[l][s.id].head[0]), tag);
      assert.match(html, l === 'ja' ? /noto-sans-jp\.css/ : /Pretendard-Bold\.woff2/, tag);
      assert.equal(html.includes(CAPTIONS[l].brand), !!s.brand, `${tag}: 앱 이름은 1번에만`);
      if (plan.sheet) {
        const r = plan.sheet.radius;
        const want = { top: `${r}px ${r}px 0 0`, tl: `${r}px 0 0 0`, tr: `0 ${r}px 0 0` }[plan.sheet.round];
        assert.ok(html.includes(`border-radius:${want}`), tag);
      }
    }
  }
  assert.match(composeHtml({ device: dev, lang: 'ko', scene: SCENES[1], caption: { eyebrow: 'a<b', head: ['x', 'y'] }, plan: SCENES[1].plan(L), picture: { png, w: 1, h: 1 }, icon: png }), /a&lt;b/);
});

test('PNG: RGBA를 알파 없는 RGB(색 형식 2)로, 반투명은 바탕색 위에', () => {
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
  const out = toRGB(rgba, [243, 244, 246]);
  const h = readHeader(out);
  assert.deepEqual([h.width, h.height, h.bitDepth, h.colorType], [2, 2, 8, 2]);
  assert.deepEqual([...decode(out).rgb], [255, 0, 0, 0, 255, 0, 243, 244, 246, 10, 20, 30]);
});

test('PNG: 거르기(위)를 쓴 RGB도 그대로 돌아온다', () => {
  const width = 7;
  const height = 5;
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37 + (i % 9) * 11) & 0xff;
  for (let i = width * 3; i < width * 6; i++) rgb[i] = rgb[i - width * 3]; // 같은 줄 → 위 거르기
  assert.deepEqual(decode(encodeRGB({ width, height, rgb })).rgb, rgb);
});

test('verify: 크기와 색 형식, 이름(<nn>-<장면>.png)을 본다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-'));
  const dev = DEVICES.find((d) => d.id === 'iphone-6.9');
  const good = path.join(dir, 'ko', dev.id);
  fs.mkdirSync(good, { recursive: true });
  const [w, h] = dev.out;
  fs.writeFileSync(path.join(good, '03-widgets.png'), encodeRGB({ width: w, height: h, rgb: Buffer.alloc(w * h * 3, 250) }));
  assert.deepEqual(verifyDir(dir).problems, []);
  fs.writeFileSync(path.join(good, '02-today.png'), encodeRGB({ width: 10, height: 10, rgb: Buffer.alloc(300) }));
  assert.equal(checkFile(path.join(good, '02-today.png'), dev).length, 1);
  assert.equal(verifyDir(dir).problems.length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('시계: 기기 시간대의 벽시계(서울 · 도쿄 · 로스앤젤레스 여름 시간), 위젯 값은 같은 벽시계의 지역 날짜', () => {
  assert.equal(new Date(zonedEpoch('2026-10-14T09:30:00', 'Asia/Seoul')).toISOString(), '2026-10-14T00:30:00.000Z');
  assert.equal(new Date(zonedEpoch('2026-10-14T09:30:00', 'Asia/Tokyo')).toISOString(), '2026-10-14T00:30:00.000Z');
  assert.equal(new Date(zonedEpoch('2026-10-14T09:30:00', 'America/Los_Angeles')).toISOString(), '2026-10-14T16:30:00.000Z');
  const d = wallDate('2026-10-14T21:40:00');
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2026, 9, 14, 21, 40]);
});
