// R2a · 웨이브 4 정리 — 화면들이 부품 상자에 없어 제 파일에 지었던 부품을 부품 상자(kit · common · ROLE)로 옮겼다
// (docs/design/build-plan.md §6). 새 속성이 제 일을 하는지, 화면이 옮긴 부품을 쓰는지 소스로 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const KIT = 'src/components/kit';

// ── 고르기 줄 ──────────────────────────────────────────────────────────────────

test('ChoiceRow: 줄마다 읽는 언어 · 여러 줄 제목과 정보 줄 · 웹의 aria-checked가 줄(Row)까지 간다', () => {
  const choice = code(`${KIT}/ChoiceRow.tsx`);
  assert.match(choice, /titleLines=\{titleLines\}\s+metaLines=\{metaLines\}/);
  assert.match(choice, /accessibilityLanguage=\{accessibilityLanguage\}/);
  assert.match(choice, /aria-checked=\{on\}/);
  const row = code(`${KIT}/Row.tsx`);
  // Row는 받은 aria-checked를 누르는 줄 · 읽기만 하는 줄 모두에 단다(예전에는 받기만 하고 버렸다)
  assert.equal((row.match(/aria-checked=\{ariaChecked\}/g) || []).length, 2);
  // 읽는 언어: 줄이 주면 그 언어, 아니면 앱 언어
  assert.equal((row.match(/accessibilityLanguage=\{accessibilityLanguage \?\? a11yLang\(\)\}/g) || []).length, 2);
  // 정보 줄: 기본 한 줄, 0이면 다 보인다
  assert.match(row, /numberOfLines=\{lines > 0 \? lines : undefined\}/);
  assert.match(row, /<RowMeta M=\{M\} area=\{area\} text=\{metaText\} lines=\{metaLines\} \/>/);
});

test('설정 › 언어 · iCloud 고르기 시트는 부품 상자의 ChoiceRow — 제 파일에 지은 고르기 줄이 없다', () => {
  const lang = code('src/screens/settings/LanguageSection.tsx');
  assert.match(lang, /import \{ ChoiceRow \} from '\.\.\/\.\.\/components\/kit';/);
  assert.match(lang, /accessibilityLanguage=\{Platform\.OS === 'ios' && p !== 'system' \? p : a11yLang\(\)\}/);
  const sync = code('src/screens/settings/SyncChoiceSheet.tsx');
  assert.match(sync, /import \{ ChoiceRow \} from '\.\.\/\.\.\/components\/kit';/);
  assert.match(sync, /meta=\{sub\}/);
  for (const s of [lang, sync]) assert.doesNotMatch(s, /ChoiceTick|RowTitle|RowRule|<Pressable/);
});

// ── 분절 선택기 ────────────────────────────────────────────────────────────────

test('Segment: 묶음(라디오 묶음 · 탭 목록)에 이름 — 무엇을 고르는지 함께 읽힌다, 쓰는 곳마다 단다', () => {
  const seg = code(`${KIT}/Segment.tsx`);
  assert.match(seg, /accessibilityRole=\{roles\.group\}\s+accessibilityLabel=\{accessibilityLabel\}\s+\{\.\.\.a11yLangProp\(\)\}/);
  // 라디오면 묶음은 radiogroup(웹의 role="radiogroup"), 탭이면 iOS 밖에서 tablist
  assert.match(seg, /group: radio \? 'radiogroup' : role === 'tab' && !IOS \? 'tablist' : undefined/);
  const mood = code('src/components/MoodRow.tsx');
  assert.match(mood, /<Segment[\s\S]*?accessibilityLabel=\{m\.today\.moodTitle\}\s*\/>/);
  assert.doesNotMatch(mood, /<View/, '이름을 달려고 감싼 칸이 없다');
  const ed = code('src/overlays/CellEditor.tsx');
  for (const k of ['kindLabel', 'repeat', 'due']) assert.match(ed, new RegExp(`accessibilityLabel=\\{ed\\.${k}\\}\\s*/>`), k);
  assert.match(code('src/overlays/ShareChart.tsx'), /<Segment[\s\S]*?accessibilityLabel=\{m\.chart\.shareTitle\}\s*\/>/);
});
