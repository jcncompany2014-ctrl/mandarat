// O4 · 25분 집중(docs/design/build-plan.md §1 focus, §3 O4) — 목업 docs/design/mockups/a/focus.png.
// 종이 한 장: 머리(영역 · 25분 집중 / 실천 글 / 아래 꺾쇠), 5×5 분 칸(MinuteGrid), 남은 시간 · 끝나는 시각, 멈추기 · 끝내기 · 그만하기.
// 시계 · 기록 · 알림 · Live Activity의 행동은 tests/focusActivity.test.js · focusClock.test.js가 지킨다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { clockParts, finishLabel } = require('../src/lib/focusClock');
const { LIGHT, DARK, moreContrast } = require('../src/theme/tokens');
const { contrast } = require('../src/theme/palette');
const { msg, LANGS } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FILE = 'src/overlays/FocusTimer.tsx';

test('끝나는 시각 — 그 언어의 시계 글을 숫자와 오전·오후로 가른다', () => {
  const at = new Date(2026, 9, 14, 14, 35).getTime();
  assert.deepEqual(clockParts(at, 'ko'), { pre: '오후', time: '2:35', post: '', text: '오후 2:35' });
  assert.deepEqual(clockParts(at, 'ja'), { pre: '', time: '14:35', post: '', text: '14:35' });
  assert.deepEqual(clockParts(at, 'en'), { pre: '', time: '2:35', post: 'PM', text: '2:35 PM' });
  const midnight = new Date(2026, 9, 14, 0, 5).getTime();
  assert.deepEqual(clockParts(midnight, 'ko'), { pre: '오전', time: '12:05', post: '', text: '오전 12:05' });
  // 망가진 값에도 던지지 않는다
  assert.equal(typeof clockParts(Number.NaN, 'ko').time, 'string');
});

test('글 — 세 언어에 같은 새 낱말(머리 위 줄 · 남은 시간 · 끝나는 시각 · 그만하기 · 안내)', () => {
  for (const l of LANGS) {
    const f = msg(l).focus;
    for (const k of ['left', 'endsAt', 'stop', 'footnote', 'cuePaused', 'cueDone', 'pause', 'resume']) {
      assert.ok(typeof f[k] === 'string' && f[k].length > 0, `${l}.focus.${k}`);
    }
    assert.ok(f.eyebrow({ area: 'X' }).includes('X'), `${l} eyebrow`);
    assert.ok(f.eyebrow({ area: 'X' }).includes('25'), `${l} eyebrow 25`);
    assert.ok(f.endsAtA11y({ time: '2:35' }).includes('2:35'), `${l} endsAtA11y`);
  }
  assert.equal(msg('ko').focus.eyebrow({ area: '커리어' }), '커리어 · 25분 집중');
  assert.equal(msg('ko').focus.left, '남은 시간');
  assert.equal(msg('ko').focus.endsAt, '끝나는 시각');
  assert.equal(msg('ko').focus.stop, '그만하기');
  assert.equal(finishLabel('check', false, 'ko'), '끝내고 했어요');
});

test('그림 — 종이 위 한 장, 색은 토큰 · 글자는 ROLE, 손으로 적은 색 없음', () => {
  const s = src(FILE);
  assert.match(s, /<PaperColumn bg=\{M\.paper\}>/);
  assert.match(s, /backgroundColor: M\.paper, paddingTop: insets\.top/);
  assert.doesNotMatch(s, /#[0-9A-Fa-f]{3,8}\b|rgba?\(/, '색은 토큰으로만');
  assert.doesNotMatch(s, /M\.center|M\.onCore|\blight\b=|tone="inverse"/, '예전 어두운 판');
  assert.doesNotMatch(s, /Tally|breath/, '예전 표와 숨');
  for (const role of ['folio', 'title', 'label', 'clock', 'figureField', 'note']) assert.match(s, new RegExp(`ROLE\\.${role}\\b`), role);
});

test('머리 — 영역 표시 + 위 줄, 제목은 실천 글, 오른쪽 아래 꺾쇠는 닫기(기록은 남긴다)', () => {
  const s = src(FILE);
  assert.match(s, /<DyeMark M=\{M\} area=\{ti\} \/>/);
  assert.match(s, /m\.focus\.eyebrow\(\{ area: areaName \}\)/);
  assert.match(s, /accessibilityRole="header"[^>]*ROLE\.title/);
  assert.match(s, /noOrphan\(a\.text \|\| m\.focus\.textFallback\)/);
  assert.match(s, /<IconBtn M=\{M\} name="down" label=\{m\.common\.close\} onPress=\{close\} \/>/);
  assert.match(s, /const close = \(\) => \{\s*record\(\);\s*closeFocus\(\);/);
});

test('분 칸 — G의 MinuteGrid: 영역의 wash, 다 채운 분, 지금 분은 분이 바뀔 때·멈추고 이을 때만 새로', () => {
  const s = src(FILE);
  assert.match(s, /import \{ MinuteGrid \} from '\.\.\/components\/chart';/);
  assert.match(s, /<MinuteGrid\s+width=\{gridW\}\s+area=\{ti\}\s+done=\{filled\}\s+frac=\{frac\}\s+running=\{running\}/);
  assert.match(s, /const filled = finished \? TALLY_BOXES : filledBoxes\(elapsed\);/);
  assert.match(s, /useMemo\(\(\) => \(finished \? 0 : \(elapsed % 60\) \/ 60\), \[filled, run, finished\]\)/);
  assert.match(s, /accessibilityLabel=\{m\.focus\.tallyA11y\(\{ n: filled \}\)\}/);
  // 폭: 본문 폭, 520을 넘지 않고, 낮은 화면에서는 남은 시간 · 안내가 들어가게 줄인다
  assert.match(s, /Math\.min\(measure, GRID_MAX, fitH\)/);
  assert.match(s, /const GRID_MAX = 520;/);
});

test('시계 — 남은 시간(이름표가 상태를 말한다), 멈추면 ink2, 끝나는 시각은 도는 동안만', () => {
  const s = src(FILE);
  assert.match(s, /const cue = finished \? m\.focus\.cueDone : run \? m\.focus\.left : m\.focus\.cuePaused;/);
  assert.match(s, /accessibilityLiveRegion="polite"/);
  assert.match(s, /\.\.\.ROLE\.clock, color: running \|\| finished \? M\.ink : M\.ink2/);
  assert.match(s, /accessibilityRole="timer"\s+accessibilityLabel=\{clockA11y\}/);
  assert.match(s, /const ends = running && endsAt > 0 \? clockParts\(endsAt, lang\) : null;/);
  // 끝나는 시각은 벽시계가 정한 끝(endAtRef)에서 — 돌기 시작 · 다시 이을 때 한 번
  assert.match(s, /endAtRef\.current = Date\.now\(\) \+ remainingMsRef\.current;\s*setEndsAt\(endAtRef\.current\);/);
  // 멈춘 숫자도 종이 위에서 읽힌다(밝게 · 어둡게 · 대비 높이기)
  for (const T of [LIGHT, DARK, moreContrast(LIGHT), moreContrast(DARK)]) {
    const c = contrast(T.ink2, T.paper);
    assert.ok(c >= 4.5, `${T.dark ? 'dark' : 'light'} ink2/paper ${c.toFixed(2)}`);
    assert.ok(contrast(T.ink, T.paper) > c, '도는 숫자가 더 진하다');
  }
});

test('단추 — 멈추기(옅은 면 · ‖) · 끝내고 했어요(먹) · 그만하기(조용히), testID는 그대로', () => {
  const s = src(FILE);
  assert.match(s, /import \{ Button, IconBtn, QuietAction \} from '\.\.\/components\/common';/);
  assert.match(s, /variant="tint"\s+glyph=\{run \? 'pause' : undefined\}\s+label=\{run \? m\.focus\.pause : m\.focus\.resume\}\s+onPress=\{toggleRun\}\s+testID=\{TID\.focusPause\}/);
  assert.match(s, /label=\{label\}\s+onPress=\{finish\}\s+testID=\{TID\.focusFinish\}/);
  assert.match(s, /label=\{finished \? m\.common\.close : m\.focus\.stop\}\s+onPress=\{close\}\s+testID=\{TID\.focusClose\}/);
  // 다 채운 뒤 끝내기가 이미 '닫기'면 그만하기를 두 번 적지 않는다(자리는 남긴다)
  assert.match(s, /const showQuiet = !\(finished && outcome === 'time'\);/);
  assert.match(s, /minHeight: 44/);
  // 큰 글자에서는 위아래로
  assert.match(s, /flexDirection: stack \? 'column' : 'row'/);
  // 접근성: 두 손가락 두 번 톡톡 = 멈춤·계속, 문지르기 = 닫기
  assert.match(s, /onMagicTap=\{toggleRun\}/);
  assert.match(s, /onAccessibilityEscape=\{close\}/);
});

test('Live Activity — 영역 번호(ti)를 넘기고 무드 · 포인트 컬러 · 영역 색 글자는 넘기지 않는다', () => {
  const s = src(FILE);
  assert.match(s, /focusProps\(\{\s*text: textRef\.current, area: info\.area, ti: info\.ti, lang: info\.lang,/);
  assert.match(s, /liveInfo\.current = \{ area: areaName, ti, lang \};/);
  assert.doesNotMatch(s, /\bmood\b|\baccent\b|settings\.mood|settings\.accent|th0\?\.color|\.color\b/);
});
