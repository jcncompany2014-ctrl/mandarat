// O6 · 의식과 작은 시트(docs/design/build-plan.md §3 O6) — 한 주 돌아보기 · 한 해 마무리 · 64칸 마무리 · 백업 불러오기 · 프로 시트.
// 목업이 없는 화면이라 부품 상자(kit) · 틀(chrome) · 표(chart)로만 그린다: sheet.png(시트 뼈대) · dayclose.png(마감의 한 장면) · year.png(다 채운 표).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { TID } = require('../src/lib/testIds');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 — 주석의 낱말로 통과하지 않게 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const FILES = {
  ritual: 'src/overlays/WeekRitual.tsx',
  year: 'src/overlays/YearClose.tsx',
  finale: 'src/overlays/Celebration.tsx',
  backup: 'src/overlays/BackupImport.tsx',
  pro: 'src/overlays/ProSheet.tsx',
};

test('O6 공통: 색은 토큰 이름, 글자는 ROLE — 손으로 쓴 색 · 예전 이름 · 꾸밈이 없다(깨끗한 판)', () => {
  for (const f of Object.values(FILES)) {
    const s = code(f);
    assert.doesNotMatch(s, /#[0-9A-Fa-f]{3,8}\b|rgba?\(/, `${f}: 손으로 쓴 색`);
    assert.doesNotMatch(s, /\bTYPE\b|\bRHYTHM\b/, `${f}: 예전 글자 단계`);
    assert.doesNotMatch(s, /M\.(bg|sub|faint|line|surface|card|gold|accent|center)\b/, `${f}: 예전 팔레트 이름`);
    assert.doesNotMatch(s, /alertInk|PaperDots|MiniChart|groupEdge|LineRow/, `${f}: 예전 부품`);
    assert.doesNotMatch(s, /shadow\(|LinearGradient|confetti|\p{Extended_Pictographic}/u, `${f}: 꾸밈`);
    for (const m of s.matchAll(/borderRadius:\s*(\d+)/g)) assert.ok(Number(m[1]) <= 12, `${f} borderRadius ${m[1]}`);
    assert.doesNotMatch(s, /fontSize:\s*\d|fontWeight:/, `${f}: 글자 크기 · 굵기는 ROLE에서`);
  }
});

test('한 주 돌아보기: 머리(PageHead) · 마감의 한 장면(큰 숫자 · 한 문장 · 일곱 날) · 장부', () => {
  const s = code(FILES.ritual);
  // 머리 — 위 줄에 그 주, 오른쪽 위에 쪽 수(읽을 때는 '3쪽 중 1쪽'), 닫기 글리프(TID 그대로)
  assert.match(s, /export function PageHead\(/);
  assert.match(s, /eyebrow=\{fmtRange\(week\)\}/);
  assert.match(s, /pageSay=\{pageSpeech\(index, pages\.length\)\}/);
  assert.match(s, /closeTestID=\{TID\.ritualClose\}/);
  assert.match(s, /<IconBtn M=\{M\} name="close" label=\{closeLabel\} onPress=\{onClose\} testID=\{closeTestID\} \/>/);
  // 1쪽 — closeFigure의 큰 숫자(단위는 unit) · prompt 한 문장 · note · WeekBars
  assert.match(s, /const face = size === 'close' \? ROLE\.closeFigure : ROLE\.figureField;/);
  assert.match(s, /<Figure M=\{M\} text=\{t\.total\(\{ n: r\.total \}\)\} \/>/);
  assert.match(s, /accessibilityLabel=\{t\.totalSay\(\{ range, n: r\.total \}\)\}/);
  assert.match(s, /\.\.\.ROLE\.prompt, color: M\.ink/);
  assert.match(s, /<WeekBars days=\{bars\} \/>/);
  // 장부 세 줄은 읽는 말 그대로
  assert.match(s, /speech=\{ledgerHabitSpeech\(r\.routineDone, r\.routineDue\)\}/);
  assert.match(s, /speech=\{addedSpeech\(r\.added\)\}/);
  assert.match(s, /accessibilityLabel=\{t\.rowSay\(\{ label, value: empty \? t\.rowNone : speech \?\? value \}\)\}/);
});

test('한 주 돌아보기: 마음가짐은 Segment 낱칸(RatingBoxes fill), 중점은 고른 상자(chosen) 줄 · 메모는 Field', () => {
  const s = code(FILES.ritual);
  assert.match(s, /<RatingBoxes M=\{M\} fill value=\{value\} label=\{a\.text\.trim\(\)\} onRate=\{\(score\) => onRate\(ti, ai, score, sunday\)\} \/>/);
  // 중점 고르기 — 줄(Row) 전체가 체크 상자(화면 읽기 checkbox + checked), 상자는 '이것으로 고름'(chosen)
  assert.match(s, /lead=\{<CheckBox M=\{M\} state=\{on \? 'chosen' : 'open'\} area=\{g\.ti\} \/>\}/);
  assert.match(s, /onPress=\{\(\) => onPick\(key\)\}\s*accessibilityRole="checkbox"\s*accessibilityState=\{\{ checked: on \}\}/);
  assert.match(s, /<Field\s+M=\{M\}\s+variant="small"\s+value=\{note\}/);
  assert.match(s, /maxLength=\{NOTE_MAX\}/);
  // 단추 하나 — testID 그대로(마지막 쪽 ritualDone)
  assert.match(s, /testID=\{last \? TID\.ritualDone : TID\.ritualNext\}/);
  assert.ok(TID.ritualDone && TID.ritualNext && TID.ritualClose);
  // 저장은 그대로 — saveReview(week, { at, next, note? }) 뒤 토스트 · 닫기
  assert.match(s, /saveReview\(week, \{ at: ymd\(new Date\(\)\), next, \.\.\.\(memo \? \{ note: memo \} : \{\}\) \}\);\s*tap\(\);\s*showToast\(finishToast\(next\.length\)\);\s*closeRitual\(\);/);
});

test('한 해 마무리: 같은 머리 · 다 채운 표(L2 지도 · 네 숫자) · 고르기 줄 셋 · 마무리의 작은 지도', () => {
  const s = code(FILES.year);
  assert.match(s, /import \{ Figure, PageHead \} from '\.\/WeekRitual';/);
  assert.match(s, /eyebrow=\{range\}/);
  assert.match(s, /pageSay=\{m\.year\.pageSpeech\(\{ n: index \+ 1, total: PAGES\.length \}\)\}/);
  // 1쪽 — 이 표의 색 지도(본문 폭, 최대 520) · 네 숫자(figureField, 단위는 unit)
  assert.match(s, /const mapW = Math\.max\(0, Math\.floor\(Math\.min\(MAP_MAX, width - GEO\.gutter \* 2\)\)\);/);
  assert.match(s, /<ColourMap themes=\{doc\.themes\} goal=\{doc\.centerGoal\} level="L2" width=\{mapW\} fade \/>/);
  assert.match(s, /<Figure M=\{M\} text=\{f\.value\} size="field" \/>/);
  assert.match(s, /speech: m\.year\.achievedSpeech\(\{ n: digest\.achieved \}\)/);
  // 2쪽 — 고르기 줄(라디오) 셋 · 새 목표 칸(Field, 자리 글은 지금 목표)
  assert.match(s, /<ChoiceRow key=\{x\} M=\{M\} title=\{t\.title\} meta=\{t\.sub\} on=\{x === mode\} onPress=\{\(\) => onMode\(x\)\} divider=\{i > 0\} \/>/);
  assert.match(s, /placeholder=\{doc\.centerGoal\.trim\(\) \|\| undefined\}/);
  // 3쪽 — 보관함에 들어갈 표(L1) · 한 문장 · 고른 새 표 · 같은 날이면 알림 한 장
  assert.match(s, /<ColourMap themes=\{doc\.themes\} level="L1" cell=\{SHELF_CELL\} fade \/>/);
  assert.match(s, /\.\.\.ROLE\.prompt, color: M\.ink, marginTop: 20 \}\}>\{m\.year\.keepNote\}/);
  assert.match(s, /disabled=\{last && blocked\}/);
});

test('64칸 마무리: 큰 숫자 · 한 문장 · L2 지도 · 주 단추 하나 — 꽃가루 없이, 어디를 눌러도 닫힌다', () => {
  const s = code(FILES.finale);
  assert.match(s, /\.\.\.ROLE\.closeFigure/);
  assert.match(s, /accessibilityLabel=\{m\.sheet\.finaleCountA11y\}/);
  assert.match(s, /accessibilityRole="header" style=\{\{ \.\.\.ROLE\.prompt/);
  assert.match(s, /<ColourMap themes=\{doc\.themes\} goal=\{doc\.centerGoal\} level="L2" width=\{mapW\} fade \/>/);
  // 단추는 하나(먹) — testID 그대로
  assert.equal((s.match(/<Button\b/g) ?? []).length, 1);
  assert.match(s, /<Button M=\{M\} label=\{m\.common\.close\} onPress=\{onClose\} testID=\{TID\.celebrateClose\} \/>/);
  assert.match(s, /<Pressable onPress=\{onClose\} accessible=\{false\}/);
  // 낮은 창(가로 폰)에서도 단추가 화면에 남게 — 지도 폭을 남는 높이로 줄이고, 그래도 모자라면 스크롤
  assert.match(s, /const mapW = Math\.floor\(Math\.min\(width - GEO\.gutter \* 2, MAP_MAX, Math\.max\(MAP_MIN, room\)\)\);/);
  // 소리로 한 번, 진동은 Root가
  assert.match(s, /announce\(title\);/);
  assert.doesNotMatch(s, /success\(\)|haptics/);
});

test('백업 불러오기: 시트 뼈대(안쪽 24 · 머리) · 파일 고르기 줄 · tile 붙여 넣기 칸 · 장부 · 주 단추', () => {
  const s = code(FILES.backup);
  assert.match(s, /<Sheet\s+M=\{M\}\s+onClose=\{onClose\}\s+maxHeightPct=\{0\.9\}\s+ownClose\s+pad\s+returnFocusRef=\{returnFocusRef\}/);
  assert.match(s, /<LinkRow\s+M=\{M\}\s+glyph="import"\s+title=\{fromFile \? b\.pickOther : b\.pickFile\}/);
  assert.match(s, /<Field\s+M=\{M\}\s+variant="memo"\s+value=\{text\}/);
  assert.match(s, /placeholder=\{b\.pastePlaceholder\}/);
  assert.match(s, /accessibilityLabel=\{b\.pasteLabel\}/);
  // 읽지 못한 글은 칸 밑 먹 한 줄, 더 최근 기록 경고는 알림 한 장
  assert.match(s, /\{!!error && \(\s*<Text style=\{\{ \.\.\.ROLE\.label, fontFamily: PRETENDARD\[600\], color: M\.ink/);
  assert.match(s, /<RuledNotice M=\{M\} title=\{b\.newerNow\} \/>/);
  // 주 단추 — 읽을 수 있을 때만, 한 번만
  assert.match(s, /<Button\s+M=\{M\}\s+label=\{label\}\s+disabled=\{!ready\}/);
  assert.match(s, /if \(!result\?\.ok \|\| applied\.current\) return;/);
});

test('프로 시트: 시트 머리(닫기 TID) · 번호 차례 · 값 한 줄 · 주 단추 · 조용한 구입 복원 · 글자 링크', () => {
  const s = code(FILES.pro);
  assert.match(s, /<Sheet M=\{M\} onClose=\{onClose\} ownClose pad /);
  assert.match(s, /<SheetHead M=\{M\} title=\{m\.pro\.sheetHead\} body=\{owned \? undefined : m\.pro\.sheetBody\} closeTestID=\{TID\.proClose\} \/>/);
  assert.match(s, /<Section M=\{M\} label=\{m\.pro\.listHead\}/);
  assert.match(s, /<QuietAction\s+M=\{M\}\s+testID=\{TID\.proRestore\}/);
  assert.match(s, /<PrimaryButton M=\{M\} label=\{label\} onPress=\{onBuy\} disabled=\{!canPress\} testID=\{TID\.proBuy\}/);
  // 글자 링크는 부품 상자의 것(설정 화면의 줄 모양을 빌리지 않는다)
  assert.match(s, /import \{ KIT_TYPE, ROW, RowRule, RowTitle, Section, TextLink \} from '\.\.\/components\/kit';/);
  assert.doesNotMatch(s, /screens\/settings/);
});

test('O6는 새 글이 없다 — 쓰는 말은 모두 세 언어 바구니에 이미 있다', () => {
  const { msg } = require('../src/i18n');
  for (const l of ['ko', 'ja', 'en']) {
    const m = msg(l);
    for (const k of ['finaleTitle', 'finaleCountA11y']) assert.equal(typeof m.sheet[k], 'string', `${l} sheet.${k}`);
    for (const k of ['finaleGoal', 'finaleStreak']) assert.equal(typeof m.sheet[k], 'function', `${l} sheet.${k}`);
    for (const k of ['pageWeek', 'pageMind', 'pageNext', 'mindHint', 'note', 'rowNone']) assert.ok(m.ritual[k], `${l} ritual.${k}`);
    for (const k of ['pickFile', 'pickOther', 'pickSub', 'pasteHelp', 'pastePlaceholder', 'fromFile', 'toPaste', 'apply', 'readOk', 'newerNow']) {
      assert.ok(m.backup[k], `${l} backup.${k}`);
    }
    assert.ok(m.common.back && m.common.close, l);
  }
});
