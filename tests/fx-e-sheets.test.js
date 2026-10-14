// FX-E — 시트·편집 창·한 주 돌아보기의 읽는 말, 편집 창 쓰던 글 보관, 글 검사
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  ieyo, cellTitleSpeech, nextCellSpeech, dueSpeech, weekCountSpeech, countNowSpeech, pageSpeech, ledgerHabitSpeech,
} = require('../src/lib/sheetSpeech');
const { EDITOR_DRAFT_KEY, parseDraft, serializeDraft, draftDiffers, draftFits } = require('../src/lib/editorDraft');

const ROOT = path.join(__dirname, '..');
const OWNED = ['src/overlays/ActionSheet.tsx', 'src/overlays/CellEditor.tsx', 'src/overlays/WeekRitual.tsx', 'src/components/DayPicker.tsx'];

test('이에요/예요 — 끝소리를 따른다', () => {
  assert.equal(ieyo('7권'), '7권이에요');
  assert.equal(ieyo('3'), '3이에요');
  assert.equal(ieyo('2'), '2예요');
  assert.equal(ieyo('5'), '5예요');
});

test('읽는 말에는 3/8 · D-3 · 1/3쪽 같은 표기가 없다', () => {
  const said = [
    cellTitleSpeech('건강', 2), nextCellSpeech('건강', 3), dueSpeech(3), dueSpeech(0), dueSpeech(-2),
    weekCountSpeech(2, 3), countNowSpeech('12', '7', '권'), pageSpeech(0, 3), ledgerHabitSpeech(5, 7),
  ];
  for (const s of said) assert.doesNotMatch(s, /\d\s*\/\s*\d|D[-+]\d|D-day/, s);
  // 차트 칸(chartSpeech)과 같은 우리말 서수 — '3번째'는 '삼번째'로 읽힌다 (FX-VERIFY NEW-2/NEW-5)
  assert.equal(cellTitleSpeech('건강', 2), '건강 영역, 8칸 중 세 번째 칸');
  assert.equal(nextCellSpeech('건강', 3), '건강 영역 네 번째 칸을 적어요');
  assert.equal(cellTitleSpeech('건강', 0), '건강 영역, 8칸 중 첫 번째 칸');
  assert.equal(nextCellSpeech('건강', 7), '건강 영역 여덟 번째 칸을 적어요');
  for (const s of said) assert.doesNotMatch(s, /\d번째/, s);
  assert.equal(pageSpeech(1, 3), '3쪽 중 2쪽');
  assert.equal(countNowSpeech('12', '7', '권'), '12권 중 7권이에요');
  assert.equal(weekCountSpeech(2, 3), '이번 주 3회 중 2회');
  assert.equal(dueSpeech(3), '마감 3일 남음');
  assert.equal(dueSpeech(0), '오늘 마감');
  assert.equal(dueSpeech(-2), '마감 2일 지남');
});

test('쓰던 글 — 적고 읽으면 그대로, 다른 칸·깨진 글은 null', () => {
  const d = { key: 'a2-5', text: '책 읽기', cfg: { kind: 'count', goal: 12, unit: '권' }, nums: { goal: '12', unit: '권', step: '', count: '' } };
  const raw = serializeDraft(d);
  assert.deepEqual(parseDraft(raw), d);
  assert.deepEqual(parseDraft(raw, 'a2-5'), d);
  assert.equal(parseDraft(raw, 'a2-6'), null);
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft('{'), null);
  assert.equal(parseDraft(JSON.stringify({ key: 'c', text: 'x', cfg: { kind: 'nope' }, nums: d.nums })), null);
  assert.equal(parseDraft(JSON.stringify({ key: 'c', text: 'x', cfg: { kind: 'once' } })), null);
  assert.equal(typeof EDITOR_DRAFT_KEY, 'string');
});

test('쓰던 글 — 저장된 것과 같으면 권하지 않는다', () => {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const d = { key: 'c', text: ' 마라톤 ', cfg: { kind: 'once' }, nums: { goal: '', unit: '', step: '', count: '' } };
  assert.equal(draftDiffers(d, '마라톤', { kind: 'once' }, same), false);
  assert.equal(draftDiffers(d, '마라톤 완주', { kind: 'once' }, same), true);
  assert.equal(draftDiffers(d, '마라톤', { kind: 'habit' }, same), true);
});

test('쓰던 글 — 적어 둘 때의 저장된 글(base)을 함께 남기고, 그 사이 칸이 바뀌었으면 권하지 않는다 (FX-VERIFY NEW-1)', () => {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const nums = { goal: '', unit: '', step: '', count: '' };
  const d = { key: 'a0-7', text: '야식 끊기 — 밤 9시 이후 금식', cfg: { kind: 'once' }, nums, base: '야식 끊기' };
  const back = parseDraft(serializeDraft(d), 'a0-7');
  assert.deepEqual(back, d, 'base도 그대로 돌아온다');
  // 같은 칸이 그대로면 이어 쓰기를 권한다
  assert.equal(draftFits(back, '야식 끊기'), true);
  assert.equal(draftFits(back, ' 야식 끊기 '), true);
  // 칸 비우기 · 예시 · 템플릿 · 백업으로 저장된 글이 바뀌었으면 권하지 않는다(글이 달라 draftDiffers는 true여도)
  assert.equal(draftDiffers(back, '', { kind: 'once' }, same), true);
  assert.equal(draftFits(back, ''), false);
  assert.equal(draftFits(back, '물 2L 마시기'), false);
  // base가 없는 이전 판의 글은 따지지 않는다
  const old = parseDraft(JSON.stringify({ key: 'a0-7', text: 'x', cfg: { kind: 'once' }, nums }));
  assert.ok(!('base' in old));
  assert.equal(draftFits(old, ''), true);
  // 숫자·객체 등 깨진 base는 버린다
  assert.ok(!('base' in parseDraft(JSON.stringify({ ...d, base: 3 }))));
  // 편집 창: 칸 비우기도 적어 둔 글을 지우고, 다시 열 때 base를 따진다. 적어 둘 때 base를 함께 남긴다
  const ed = fs.readFileSync(path.join(ROOT, 'src/overlays/CellEditor.tsx'), 'utf8');
  const clearCell = ed.slice(ed.indexOf('const clearCell = () =>'), ed.indexOf('// ── 닫기 전 확인'));
  assert.match(clearCell, /undoable\('칸을 비웠어요', snapshot\);[\s\S]*clearDraft\(key\);[\s\S]*close\(\);/);
  assert.match(ed, /live\.current = \{ key, text, cfg, nums, base: m\.initial \}/);
  assert.match(ed, /draftFits\(d, savedText\) && draftDiffers\(/);
  // 문서를 통째로 바꾸는 저장소 함수(예시·초기화·템플릿·바꾸기)는 적어 둔 글을 지운다
  const store = fs.readFileSync(path.join(ROOT, 'src/store/MandaratContext.tsx'), 'utf8');
  for (const fn of ['loadSample', 'resetAll', 'applyTemplate', 'replaceDoc']) {
    const body = store.slice(store.indexOf(`const ${fn} = useCallback`), store.indexOf(`const ${fn} = useCallback`) + 700);
    assert.match(body, /dropEditorDraft\(\)/, fn);
  }
});

test('편집 창 — 비우는 저장이면 리턴 키·버튼 모두 다음 칸으로 가지 않는다 (FX-VERIFY NEW-6)', () => {
  const ed = fs.readFileSync(path.join(ROOT, 'src/overlays/CellEditor.tsx'), 'utf8');
  assert.match(ed, /const goesNext = !!next && !clearing;/);
  assert.match(ed, /returnKeyType=\{goesNext \? 'next' : 'done'\}/);
  assert.match(ed, /submitBehavior=\{goesNext \? 'submit' : 'blurAndSubmit'\}/);
  assert.match(ed, /onSubmitEditing=\{goesNext \? saveAndNext : saveAndClose\}/);
  assert.match(ed, /onPress=\{goesNext \? saveAndNext : saveAndClose\}/);
  assert.doesNotMatch(ed, /returnKeyType=\{next \?|onSubmitEditing=\{next \?|\{next && !clearing/);
});

test('마감 고르기 칩은 해까지 또박또박 읽는다(점 찍은 짧은 표기 없이) (FX-VERIFY HANDOFF-A6)', () => {
  const ed = fs.readFileSync(path.join(ROOT, 'src/overlays/CellEditor.tsx'), 'utf8');
  assert.match(ed, /accessibilityLabel=\{`마감 \$\{p\.label\}, \$\{fmtDateSpeech\(p\.date, now\)\}`\}/);
  assert.doesNotMatch(ed, /\bdateText\(/);
  const { duePresets } = require('../src/lib/kinds');
  const { fmtDateSpeech } = require('../src/lib/text');
  const now = new Date(2026, 9, 14);
  const said = duePresets(now).map((p) => `마감 ${p.label}, ${fmtDateSpeech(p.date, now)}`);
  for (const s of said) assert.doesNotMatch(s, /\d\.\d|\(/, s);
  assert.ok(said.some((s) => s.includes('2027년 1월 14일 목요일')), said.join(' | '));
});

test('맡은 파일에 쓰지 않기로 한 말이 없다', () => {
  const stems = ['완료', '탭해', '이뤘', '이룬', '셉니다'];
  for (const f of OWNED) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const s of stems) assert.ok(!src.includes(s), `${f}: ${s}`);
    assert.doesNotMatch(src, /칸을\s*(다\s*)?채웠/, f);
    assert.doesNotMatch(src, /8칸을 다/, f);
  }
});

test('맡은 파일의 읽기 라벨에 n/m 표기를 그대로 넣지 않는다', () => {
  for (const f of OWNED) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const labels = src.match(/accessibilityLabel=\{`[^`]*`\}|announce\(`[^`]*`\)/g) ?? [];
    for (const l of labels) assert.doesNotMatch(l, /\}\s*\/\s*\$\{|\d\/\d|D-/, `${f}: ${l}`);
  }
});
