// FX-E — 시트·편집 창·한 주 돌아보기의 읽는 말, 편집 창 쓰던 글 보관, 글 검사
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  ieyo, cellTitleSpeech, nextCellSpeech, dueSpeech, weekCountSpeech, countNowSpeech, pageSpeech, ledgerHabitSpeech,
} = require('../src/lib/sheetSpeech');
const { EDITOR_DRAFT_KEY, parseDraft, serializeDraft, draftDiffers } = require('../src/lib/editorDraft');

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
  assert.equal(cellTitleSpeech('건강', 2), '건강 영역, 8칸 중 3번째 칸');
  assert.equal(nextCellSpeech('건강', 3), '건강 영역 4번째 칸을 적어요');
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
