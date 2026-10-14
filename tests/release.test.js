// 출시 마무리(W4-B) — 굵은 텍스트·대비 증가, 지운 코드가 돌아오지 않는지, 출시 막음 검사.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { faceFor, heavierFace, PRETENDARD } = require('../src/theme/fonts');
const { MOODS, contrastEdition, withAccent } = require('../src/theme/moods');
const { MOOD_WORDS } = require('../src/lib/copy');
const { releaseProblems } = require('../scripts/releaseCheck');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const alphaOf = (rgba) => Number(rgba.match(/,\s*([\d.]+)\s*\)$/)[1]);

test('굵은 텍스트: 한 단계 굵게 — 400 → SemiBold, 500·600 → Bold, 700 이상 → Bold', () => {
  for (const w of [undefined, 'normal', '100', '300', '400']) assert.equal(faceFor(w, true), PRETENDARD[600], String(w));
  for (const w of ['500', '600', '700', 'bold', '800', '900']) assert.equal(faceFor(w, true), PRETENDARD[700], String(w));
  // 꺼져 있으면 예전 그대로(한 단계 가벼운 매핑)
  assert.equal(faceFor('400'), PRETENDARD[400]);
  assert.equal(faceFor('600'), PRETENDARD[500]);
  assert.equal(faceFor('700'), PRETENDARD[600]);
  assert.equal(faceFor('800'), PRETENDARD[700]);
  // 켜면 어느 굵기든 꺼진 때보다 가볍지 않다
  const rank = (f) => Object.values(PRETENDARD).indexOf(f);
  for (const w of ['400', '500', '600', '700', '800']) assert.ok(rank(faceFor(w, true)) > rank(faceFor(w)) || faceFor(w) === PRETENDARD[700], w);
});

test('굵은 텍스트: 직접 고른 Pretendard 파일도 같은 폭으로, 다른 서체는 그대로', () => {
  assert.equal(heavierFace(PRETENDARD[400]), PRETENDARD[600]);
  assert.equal(heavierFace(PRETENDARD[500]), PRETENDARD[700]);
  assert.equal(heavierFace(PRETENDARD[600]), PRETENDARD[700]);
  assert.equal(heavierFace(PRETENDARD[700]), PRETENDARD[700]);
  assert.equal(heavierFace('Menlo'), 'Menlo');
  // 굵게 바꿔도 실린 네 파일 밖으로 나가지 않는다
  const loaded = new Set(Object.values(PRETENDARD));
  for (const w of ['100', '400', '500', '600', '700', '900', 'bold']) assert.ok(loaded.has(faceFor(w, true)), w);
});

test('AppText와 TextInput 모두 굵은 텍스트를 따른다', () => {
  const src = read('src/components/AppText.tsx');
  assert.equal((src.match(/useBoldText\(\)/g) || []).length, 2);
  assert.match(src, /faceFor\(weight, bold\)/);
});

test('대비 증가: 괘선 알파 2배, 흐린 글씨는 보조 글씨로, 나머지는 그대로', () => {
  for (const [name, P] of Object.entries(MOODS)) {
    const M = withAccent(P, '#B0883C');
    const E = contrastEdition(M);
    assert.ok(Math.abs(alphaOf(E.line) - Math.min(1, alphaOf(P.line) * 2)) < 1e-9, `${name} line`);
    assert.equal(E.faint, P.sub, `${name} faint`);
    for (const k of ['bg', 'surface', 'card', 'ink', 'sub', 'tabBg', 'dark', 'gold', 'goldInk', 'center', 'accent']) {
      assert.equal(E[k], M[k], `${name} ${k}`);
    }
    assert.notEqual(E, M, '새 객체(원래 팔레트는 건드리지 않는다)');
    assert.equal(M.faint, P.faint);
  }
});

test('대비 증가: 도트 종이·체크 칸 테두리가 진해진다', () => {
  const dots = read('src/components/PaperDots.tsx');
  assert.match(dots, /useIncreaseContrast\(\)/);
  assert.match(dots, /more \? 0\.2 : 0\.11/);
  const check = read('src/components/Check.tsx');
  assert.match(check, /rgba\(43,38,32,0\.70\)/);
  assert.match(check, /width: 2/);
  const pal = read('src/theme/usePalette.ts');
  assert.match(pal, /useIncreaseContrast\(\)/);
  assert.match(pal, /WeakMap/);
  const flags = read('src/lib/useReducedMotion.ts');
  for (const s of ['isBoldTextEnabled', "'boldTextChanged'", 'isDarkerSystemColorsEnabled', "'darkerSystemColorsChanged'"]) assert.ok(flags.includes(s), s);
});

test('지운 코드가 돌아오지 않는다 — 히어로 색·기분 얼굴·주 N회 칸·옛 빈 상태·lucide', () => {
  for (const P of Object.values(MOODS)) {
    for (const k of ['hero', 'heroInk', 'heroSub', 'heroLight']) assert.equal(P[k], undefined, k);
  }
  for (const f of ['WeekDots.tsx', 'MoodFaces.tsx', 'Ring.tsx', 'Reveal.tsx']) {
    assert.ok(!fs.existsSync(path.join(ROOT, 'src', 'components', f)), f);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'src', 'screens', 'MandalaWheel.tsx')));
  assert.doesNotMatch(read('src/components/Icon.tsx'), /MOOD_FACES|MoodFaces/);
  assert.doesNotMatch(read('src/components/KindBits.tsx'), /WeekSlots/);
  assert.doesNotMatch(read('src/components/EmptyState.tsx'), /CenterEmpty|variant\?: 'center'/);
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies['lucide-react-native'], undefined);
});

test('기분 줄은 copy.ts의 낱말을 쓰고, 쌓기 줄은 알약 모양이 아니다', () => {
  const mood = read('src/components/MoodRow.tsx');
  assert.match(mood, /MOOD_WORDS\.map/);
  assert.doesNotMatch(mood, /'힘듦'/);
  assert.deepEqual([...MOOD_WORDS], ['힘듦', '별로', '보통', '좋음', '최고']);
  assert.match(read('src/components/KindBits.tsx'), /borderRadius: Math\.min\(2, height \/ 2\)/);
});

test('액션 시트의 줄은 LineRow — 체크 상태를 함께 읽는다', () => {
  const sheet = read('src/overlays/ActionSheet.tsx');
  assert.doesNotMatch(sheet, /function SheetRow\(/);
  assert.equal((sheet.match(/<LineRow/g) || []).length, 5);
  assert.equal((sheet.match(/accessibilityRole="checkbox"/g) || []).length >= 2, true);
  const common = read('src/components/common.tsx');
  assert.match(common, /accessibilityState=\{a11yState\}/);
});

test('출시 막음: 개인정보 처리방침 주소·문의 메일이 비면 막는다', () => {
  assert.equal(releaseProblems({ PRIVACY_URL: '', SUPPORT_EMAIL: '' }).length, 2);
  assert.equal(releaseProblems({ PRIVACY_URL: 'https://example.com/privacy', SUPPORT_EMAIL: '' }).length, 1);
  assert.equal(releaseProblems({ PRIVACY_URL: 'http://example.com/privacy', SUPPORT_EMAIL: 'a@b.co' }).length, 1);
  assert.equal(releaseProblems({ PRIVACY_URL: 'https://example.com/privacy', SUPPORT_EMAIL: 'not-mail' }).length, 1);
  assert.deepEqual(releaseProblems({ PRIVACY_URL: 'https://example.com/privacy', SUPPORT_EMAIL: 'help@example.com' }), []);
  const list = read('docs/RELEASE_CHECKLIST.md');
  for (const s of ['PRIVACY_URL', 'SUPPORT_EMAIL', 'npm run release-check', 'id6444119494']) assert.ok(list.includes(s), s);
});
