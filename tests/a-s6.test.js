// 패키지 S6(설정) — docs/design/build-plan.md 웨이브 2 · §1 settings · §2.4 · §2.6, 목업 docs/design/mockups/a/settings.png.
// 머리는 스크롤 밖에 고정, 구역 차례, 화면 모드 견본(useLook) · 종이 무늬 견본(settings.paper), 알림은 켜고 끄는 줄 + 시각 칩(누르면 시각 줄),
// 예전 종이 색 · 포인트 컬러 · 칸 모서리 줄은 없고 그 값은 문서에 그대로 남는다. testID setMood · setShape는 지우고 setLook을 더했다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { TID } = require('../src/lib/testIds');
const { LOOKS } = require('../src/lib/look');
const { PAPER_CHOICES, DEFAULT_PATTERN, storedPattern } = require('../src/lib/paper');
const { msg, LANGS } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스(주석 속 낱말에 걸리지 않게) */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const SETTINGS = 'src/screens/Settings.tsx';
const DIR = 'src/screens/settings';
const OWN = [
  SETTINGS, 'src/components/RemindRow.tsx',
  ...fs.readdirSync(path.join(ROOT, DIR)).filter((f) => f.endsWith('.tsx')).map((f) => `${DIR}/${f}`),
];

test('testID: setMood · setShape는 없고 setLook(auto · light · dark)이 견본에 달린다', () => {
  assert.equal(TID.setMood, undefined);
  assert.equal(TID.setShape, undefined);
  assert.deepEqual(LOOKS.map((l) => TID.setLook(l)), ['set-look-auto', 'set-look-light', 'set-look-dark']);
  const look = code(`${DIR}/LookRows.tsx`);
  assert.match(look, /<View key=\{l\} testID=\{TID\.setLook\(l\)\} aria-checked=\{on\}/);
  for (const f of OWN) assert.doesNotMatch(src(f), /setMood|setShape/, f);
});

test('머리는 스크롤 밖에 고정(pinned) — 뒤로 가기(setBack) · 제목, 설정 안에 스크롤이 따로 없다', () => {
  const s = code(SETTINGS);
  assert.match(s, /<Header M=\{M\} title=\{st\.screenTitle\} onBack=\{back\} focusTitle pinned backTestID=\{TID\.setBack\} \/>/);
  assert.doesNotMatch(s, /ScrollView/);
});

test('구역 차례 — 핵심 목표 · 알림 · iCloud와 백업 · 보기 · 언어 · 한 해 · 새로 시작 · 프로 · 정보', () => {
  const s = code(SETTINGS);
  const at = (needle) => {
    const i = s.indexOf(needle);
    assert.ok(i >= 0, needle);
    return i;
  };
  const order = [
    'label={st.secGoal} first', 'testID={TID.setGoal}', '<NotifySection M={M} />',
    'label={st.secCloud}', '<SyncSection M={M} />', 'testID={TID.setExport}', 'testID={TID.setImport}', 'testID={TID.setSnapshots}', 'text={storage.note}',
    'label={st.secView} note={st.subLook}', '<LookRows M={M} />', '<PaperRows M={M} />',
    '<LanguageSection M={M} />', '<YearRows M={M} />',
    'label={st.subRestart}', 'testID={TID.setTemplate}', 'testID={TID.setSample}', 'testID={TID.setReset}',
    '{STORE_OPEN && <ProSection M={M} />}', 'label={st.secInfo}', '<Mark size={SET.mark} />', 'label={st.colName}', 'label={st.licenses}',
  ].map(at);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  // 정보: 마크(L0) 40
  assert.match(code(`${DIR}/rows.tsx`), /mark: 40,/);
  // 백업 셋은 글리프 줄(내보내기 · 불러오기 · 저장본), 웹(iCloud 줄 없음)에서는 내보내기 위에 선을 긋지 않는다
  for (const g of ['export', 'import', 'copies']) assert.match(s, new RegExp(`<LinkRow[^>]*glyph="${g}"`), g);
  assert.match(s, /glyph="export"\s+glyphTone="print"\s+divider=\{SYNC_ROWS\}/);
  // 백업 줄의 글리프는 인쇄 회색(목업 .s-slot), 꺾쇠는 먹(LinkRow)
  assert.equal((s.match(/glyphTone="print"/g) ?? []).length, 3);
  assert.match(code(`${DIR}/SyncSection.tsx`), /export const SYNC_ROWS = syncSupported\(Platform\.OS, icloud\);/);
});

test('예전 보기 값(종이 색 · 포인트 컬러 · 칸 모서리)은 그리지도 쓰지도 않고, 문서 · 맞추기에 그대로 남는다', () => {
  for (const f of OWN) {
    const s = code(f);
    assert.doesNotMatch(s, /setSetting\('(mood|accent|cellShape)'/, f);
    assert.doesNotMatch(s, /settings\.(mood|accent|cellShape)\b/, f);
    assert.doesNotMatch(s, /\b(MOODS|ACCENTS|GOLD|readableOn)\b/, f);
  }
  const types = src('src/types.ts');
  for (const k of ['mood', 'accent', 'cellShape']) assert.match(types, new RegExp(`\\b${k}\\??:`), `Settings.${k}는 타입에 남는다`);
  // 저장본으로 되돌려도 지금 문서의 설정(예전 값 포함)은 그대로
  assert.match(code(SETTINGS), /replaceDoc\(\{ \.\.\.saved, settings: snapshot\.settings \}\);/);
});

test('화면 모드 견본 — useLook().setLook, 세 견본(LOOKS 차례), 이름과 화면 읽기는 settings 바구니', () => {
  const s = code(`${DIR}/LookRows.tsx`);
  assert.match(s, /const \{ look, setLook \} = useLook\(\);/);
  assert.match(s, /LOOKS\.map\(/);
  assert.match(s, /kind=\{\{ look: l \}\}/);
  assert.match(s, /onPress=\{\(\) => \{ select\(\); setLook\(l\); \}\}/);
  assert.match(s, /accessibilityLabel=\{st\.lookLabel\(\{ name: names\[l\] \}\)\}/);
  // 기기마다의 고르기 — 문서에 쓰지 않는다
  assert.doesNotMatch(s, /setSetting|useMandarat|useActions/);
  const ko = msg('ko').settings;
  assert.deepEqual([ko.subLook, ko.lookAuto, ko.lookLight, ko.lookDark], ['화면 모드', '자동', '밝게', '어둡게']);
  assert.equal(ko.lookLabel({ name: ko.lookDark }), '화면 모드 어둡게');
  for (const l of LANGS) {
    const t = msg(l).settings;
    for (const k of ['subLook', 'lookAuto', 'lookLight', 'lookDark', 'secCloud']) assert.ok(t[k].length > 0, `${l}.${k}`);
  }
});

test('종이 무늬 견본 — 무지 · 점 · 모눈 · 줄(무지가 기본), 고르면 setSetting(\'paper\', p)', () => {
  assert.deepEqual([...PAPER_CHOICES], ['blank', 'dots', 'grid', 'lines']);
  assert.equal(DEFAULT_PATTERN, 'blank');
  assert.equal(storedPattern(undefined), 'blank');
  const s = code(`${DIR}/PaperRows.tsx`);
  assert.match(s, /PAPER_CHOICES\.map\(/);
  assert.match(s, /setSetting\('paper', patternSetting\(p\)\)/);
  assert.match(s, /<Swatch\s+M=\{M\}\s+kind=\{\{ pattern: p \}\}/);
  // 견본 이름에 '기본'을 적지 않는다(기본이 무지로 바뀌었다)
  assert.equal(msg('ko').paper.dots, '점');
});

test('알림 — 켜고 끄는 줄(ToggleRow) + 시각 칩, 칩을 누르면 그 줄 아래 시각 줄이 열리고 닫힌다', () => {
  const s = code(`${DIR}/NotifySection.tsx`);
  assert.match(s, /<ToggleRow\s+M=\{M\}\s+title=\{title\}\s+meta=\{meta\}\s+on=\{on\}\s+onToggle=\{\(\) => onToggle\(k\)\}/);
  assert.match(s, /const onChip = \(k: TimedKind\) => \{\s*tap\(\);\s*setOpen\(\(o\) => \(o === k \? null : k\)\);\s*\};/);
  // 끄면 열린 시각 줄도 닫는다
  assert.match(s, /if \(open === k\) setOpen\(null\);/);
  // 돌아보기의 칩은 시각을 적기만 한다(REVIEW_HOUR, 누르지 않는다)
  assert.match(s, /const timed = k !== 'review' && on && !!timeLabel;/);
  assert.match(s, /k: 'review'[\s\S]{0,120}time: reviewTime/);
  // 화면 읽기는 예전처럼 시각까지 한 줄로
  assert.match(s, /accessibilityLabel=\{`\$\{title\}, \$\{say\}`\}/);
  const ko = msg('ko').settings;
  assert.equal(ko.notifyMorningMeta, '할 일이 있는 날만');
  assert.equal(ko.notifyEveningMeta, '남은 일이 있는 날만');
  assert.equal(ko.notifyReviewMeta({ dow: msg('ko').fmt.dowLong({ i: 0 }) }), '매주 일요일');
  assert.equal(msg('en').settings.notifyReviewMeta({ dow: msg('en').fmt.dowLong({ i: 0 }) }), 'Every Sunday');
});

test('시각 줄(RemindRow) — tile 받침(모서리 12), 테두리 없는 −/+ 글리프, 손끝 44', () => {
  const s = code('src/components/RemindRow.tsx');
  assert.match(s, /borderRadius: GEO\.rField, backgroundColor: M\.tile/);
  assert.doesNotMatch(s, /borderWidth|M\.line\b/);
  assert.match(s, /width: 44, height: 44,/);
  assert.match(s, /<Icon name=\{icon\} size=\{16\} color=\{M\.ink\} \/>/);
});

test('언어 — 고르기 줄(펜 획), 기기 설정 따르기를 고른 줄에만 지금 언어', () => {
  const s = code(`${DIR}/LanguageSection.tsx`);
  assert.match(s, /const meta = p === 'system' && on \? m\.lang\.systemNow\(\{ name: LANG_NAMES\[lang\(\)\] \}\) : undefined;/);
  assert.match(s, /\{on && <ChoiceTick M=\{M\} \/>\}/);
  assert.equal(msg('ko').lang.systemNow({ name: '한국어' }), '지금은 한국어');
  assert.equal(msg('ja').lang.systemNow({ name: '日本語' }), '今は日本語');
});

test('iCloud — 켜고 끄는 줄의 정보 줄에 맞춘 때, 고르기 시트는 부품 상자의 시트 · 검은 단추', () => {
  const sec = code(`${DIR}/SyncSection.tsx`);
  assert.match(sec, /const meta = \(on && line\) \|\| t\.sync\.toggleSub;/);
  assert.match(sec, /<ToggleRow[\s\S]{0,200}testID=\{TID\.setICloud\}/);
  const sheet = code(`${DIR}/SyncChoiceSheet.tsx`);
  assert.match(sheet, /<Sheet M=\{M\} ownClose pad onClose=/);
  assert.match(sheet, /<Button\s+M=\{M\}\s+label=\{t\.sync\.confirm\}/);
  assert.match(sheet, /\{on && <ChoiceTick M=\{M\} \/>\}/);
});

test('되돌리기 어려운 줄은 먹(신호색 없음), 확인 대화상자를 거친다 · 색은 모두 토큰', () => {
  const s = code(SETTINGS);
  assert.match(s, /<LineRow M=\{M\} last danger title=\{st\.resetRow\}[^\n]*onPress=\{confirmReset\}/);
  assert.match(s, /ask\(st\.resetAskTitle, st\.resetAskBody, st\.resetAskOk, doReset, true\)/);
  for (const f of OWN) {
    const c = code(f);
    assert.doesNotMatch(c, /M\.(signal|gold|accent)\b/, `${f}: 신호색`);
    assert.doesNotMatch(c, /['"]#[0-9a-fA-F]{3,8}['"]|rgba?\(/, `${f}: 색 글자`);
  }
});
