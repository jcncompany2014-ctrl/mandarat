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

// ── 화면 머리 ──────────────────────────────────────────────────────────────────

test('Header: figureLabel(숫자를 읽는 말) · accessibilityLabel(머리 한 덩어리) · onTitlePress(제목 단추)', () => {
  const c = code('src/components/common.tsx');
  const props = c.slice(c.indexOf('type HeaderProps = {'), c.indexOf('export function Header('));
  for (const k of ['figureLabel', 'accessibilityLabel', 'onTitlePress', 'titleLabel', 'titleHint']) assert.match(props, new RegExp(`\\b${k}\\?: `), k);
  const body = c.slice(c.indexOf('function HeaderBody('), c.indexOf('export function IconBtn('));
  // 숫자: 보이는 '1/10' 대신 읽는 말
  assert.match(body, /<Text\s+accessibilityLabel=\{figureLabel\}/);
  // 한 덩어리: 위 줄 · 제목 · 숫자를 감싼 칸이 머리 역할 + 그 말(뒤로 가기 · 제목 단추 · 동작은 그 밖)
  assert.match(body, /accessible=\{grouped\}\s+accessibilityRole=\{grouped \? 'header' : undefined\}\s+accessibilityLabel=\{accessibilityLabel\}\s+\{\.\.\.a11yLangProp\(\)\}/);
  const group = body.slice(body.indexOf('ref={groupRef}'), body.indexOf('{onTitlePress && ('));
  assert.doesNotMatch(group, /BackLink|IconBtn|onTitlePress/);
  // 제목 단추: 제목 자리(위 30부터) — 동작 · 숫자 자리(padRight)는 비킨다
  assert.match(body, /onPress=\{onTitlePress\}\s+accessibilityRole="button"\s+accessibilityLabel=\{titleLabel \?\? words\}\s+accessibilityHint=\{titleHint\}/);
  assert.match(body, /style=\{\{ position: 'absolute', left: 0, right: padRight, top: 30, bottom: 0 \}\}/);
  // 처음 초점: 한 덩어리면 그 덩어리로
  assert.match(body, /const node = grouped \? groupRef\.current : titleRef\.current;/);
});

test('머리를 쓰는 화면 — 홈은 감싼 칸 없이 Header 하나, 숫자가 있는 머리는 읽는 말을 단다', () => {
  const home = code('src/screens/Dashboard.tsx');
  assert.match(home, /accessibilityLabel=\{summary\}\s+action=\{action\}\s+onTitlePress=\{goal \? undefined : onSetGoal\}/);
  assert.doesNotMatch(home, /<View accessible accessibilityRole="header"/);
  assert.match(code('src/screens/Today.tsx'), /figureLabel=\{figureLabel\}/);
  // 만다라트 탭: 가운데 블록 크게 보기의 '24/64' · 영역 쪽의 '4/8'
  assert.match(code('src/screens/GridScreen.tsx'), /figureLabel=\{m\.chart\.doneOf64Say\(\{ done: totalDone\(doc\) \}\)\}/);
  assert.match(code('src/screens/area/AreaPage.tsx'), /figureLabel=\{m\.chart\.areaDoneSay\(\{ done: p\.done, days: 0 \}\)\}/);
  assert.match(code('src/screens/Stats.tsx'), /accessibilityLabel=\{headSay\}/);
  const { msg } = require('../src/i18n');
  assert.equal(msg('ko').home.todayOf({ total: 10, done: 1 }), '오늘 할 일 10개 중 1개 했어요');
  assert.equal(msg('ko').chart.areaDoneSay({ done: 4, days: 0 }), '8칸 중 4칸 달성');
  assert.equal(msg('ko').chart.doneOf64Say({ done: 24 }), '64칸 중 24칸 달성');
  const { headerMeta } = require('../src/lib/home');
  assert.equal(headerMeta(new Date(2026, 9, 14), 'ko').left, '올해 78일 남음');
});

// ── 시트 머리 ──────────────────────────────────────────────────────────────────

test("SheetHeader: '어디'(위치 표 + ■ 건강 / 실천 1/8)가 영역 쪽으로 가는 한 단추 · 읽는 말은 '실천 8칸 중 첫 번째 칸'", () => {
  const c = code('src/components/common.tsx');
  const head = c.slice(c.indexOf('export function SheetHeader('), c.indexOf('export function CloseBtn('));
  for (const k of ['onPress', 'accessibilityLabel', 'accessibilityHint', 'area']) assert.match(head, new RegExp(`\\b${k}\\?: `), k);
  // 누르면: 앞 자리와 두 줄이 한 Pressable(44 손끝), 닫기는 그 밖
  assert.match(head, /<Pressable\s+onPress=\{onPress\}\s+accessibilityRole="button"\s+accessibilityLabel=\{accessibilityLabel\}/);
  assert.match(head, /minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed \? 0\.6 : 1/);
  assert.match(head, /\{leading\}\s+<View style=\{\{ flex: 1, minWidth: 0 \}\}>\{lines\}<\/View>\s+<\/Pressable>/);
  // 누를 수 없으면: 두 줄이 그 말 한 덩어리의 머리
  assert.match(head, /const mark = dye \?\? \(area != null \? M\.dye\[area\] : undefined\);/);
  const sheet = code('src/overlays/ActionSheet.tsx');
  assert.match(sheet, /onPress=\{toArea\}/);
  assert.match(sheet, /accessibilityLabel=\{m\.sheet\.headA11y\(\{ area, ordinal: m\.fmt\.ordinalCell\(\{ n: ai \+ 1 \}\) \}\)\}/);
  assert.doesNotMatch(sheet, /CloseBtn|const HEAD\b/);
  // 편집 창의 머리도 같은 부품
  assert.match(code('src/overlays/CellEditor.tsx'), /<SheetHeader\b[\s\S]{0,400}accessibilityLabel=\{speech\}\s+closeTestID=\{TID\.editorClose\}/);
  // 'n/8'을 날짜로 읽지 않게 — 세 언어 모두 '8칸 중 몇 번째 칸'
  const { msg } = require('../src/i18n');
  const say = (l, area) => msg(l).sheet.headA11y({ area, ordinal: msg(l).fmt.ordinalCell({ n: 1 }) });
  assert.equal(say('ko', '건강'), '건강 영역, 실천 8칸 중 첫 번째 칸, 영역 보기');
  assert.equal(say('ja', '健康'), '分野「健康」、行動8マスのうち1番目のマス、分野を開く');
  assert.equal(say('en', 'Health'), 'Health area, first square of 8, open area');
  for (const l of ['ko', 'ja', 'en']) assert.doesNotMatch(say(l, 'x'), /\d\/8/, l);
});
