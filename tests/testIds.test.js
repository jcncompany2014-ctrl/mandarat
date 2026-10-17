// V5-B testID 목록 — 목록의 이름은 모두 src에서 testID={TID.…}로 쓰이고, 겹치지 않으며, 글자 그대로 쓰는 testID는 없다
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TID } = require('../src/lib/testIds');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = walk(SRC).map((p) => ({ rel: path.relative(ROOT, p), text: fs.readFileSync(p, 'utf8') }));

// 같은 웨이브(5)의 다른 묶음이 자기 파일에 붙이는 이름 — 그 묶음이 합쳐지기 전에는 src에 없을 수 있다.
// 합쳐진 뒤에는 아래 '모두 쓰인다' 검사가 이 이름들도 잡는다(찾으면 통과). 리드가 웨이브 5를 합친 뒤 지운다.
const PENDING = {
  gridTable: 'V5-A src/screens/FullGrid.tsx',
  gridShare: 'V5-A src/screens/GridScreen.tsx',
  detailBack: 'V5-A src/screens/Detail.tsx',
  spreadLeft: 'V5-A src/navigation/Root.tsx',
  spreadRight: 'V5-A src/navigation/Root.tsx',
  onbGoal: 'V5-E src/screens/Onboarding.tsx',
  onbNext: 'V5-E src/screens/Onboarding.tsx',
  onbSample: 'V5-E src/screens/Onboarding.tsx',
  onbStart: 'V5-E src/screens/Onboarding.tsx',
  onbICloud: 'V5-E src/screens/Onboarding.tsx',
  setICloud: 'V5-E src/screens/settings/SyncSection.tsx',
  setICloudNow: 'V5-E src/screens/settings/SyncSection.tsx',
};

/** testID 자리(testID={…} 또는 옵션의 testID: …)에서 TID.<name>을 쓰는 줄이 있는 파일들 */
function usedAt(name) {
  const re = new RegExp(`[tT]estID\\s*[=:][^\\n]*\\bTID\\.${name}\\b(?![\\w$])`);
  return files.filter((f) => f.text.split('\n').some((l) => re.test(l))).map((f) => f.rel);
}

const entries = Object.entries(TID);
const statics = entries.filter(([, v]) => typeof v === 'string');
const fns = entries.filter(([, v]) => typeof v === 'function');

test('목록의 이름은 모두 src에서 testID로 쓰인다(다른 묶음 몫은 합쳐진 뒤)', () => {
  const missing = entries.map(([k]) => k).filter((k) => !PENDING[k] && usedAt(k).length === 0);
  assert.deepEqual(missing, []);
});

test('기다리는 이름은 목록에 있고, 그 주인 파일이 있다', () => {
  for (const [k, owner] of Object.entries(PENDING)) {
    assert.ok(k in TID, `${k}는 목록에 없다`);
    const file = owner.split(' ')[1];
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file}가 없다`);
  }
});

test('이름 함수는 같은 꼴(줄임-무엇-값)의 글을 돌려준다', () => {
  const sample = { tab: ['grid'], onbTemplate: ['study'], todayRow: ['0-1'], todayCheck: ['0-1'], gridCell: [2, 5] };
  for (const [k, f] of fns) {
    const out = f(...(sample[k] ?? ['x']));
    assert.equal(typeof out, 'string', k);
    assert.match(out, /^[a-z]+(-[a-zA-Z0-9]+)+$/, `${k} → ${out}`);
  }
  assert.equal(TID.gridCell(2, 5), 'grid-cell-2-5');
  assert.equal(TID.todayCheck('0-1'), 'today-check-0-1');
});

test('고정 이름은 겹치지 않고, 이름 함수의 결과와도 겹치지 않는다', () => {
  const vals = statics.map(([, v]) => v);
  assert.equal(new Set(vals).size, vals.length);
  for (const v of vals) assert.match(v, /^[a-z]+(-[a-z0-9]+)*$/, v);
  // 실제로 쓰는 값으로 만든 이름이 고정 이름과 같으면 안 된다(예: tab('add') ≠ tabAdd)
  const real = {
    tab: ['home', 'today', 'grid', 'stats'],
    setLang: ['system', 'ko', 'ja', 'en'],
    setNotify: ['morning', 'evening', 'review', 'morning-time', 'evening-time'],
    setPaper: ['dots', 'grid', 'lines', 'blank'],
    editorKind: ['once', 'habit', 'count', 'mind'],
    printPaper: ['A4', 'Letter', 'A3', 'A5', 'B5'],
    printLayout: ['chart', 'areas'],
  };
  for (const [k, args] of Object.entries(real)) {
    for (const a of args) assert.ok(!vals.includes(TID[k](a)), `${k}(${a})`);
  }
});

test('글자 그대로 쓰는 testID가 없다 — 늘 TID에서', () => {
  const bad = [];
  for (const f of files) {
    f.text.split('\n').forEach((l, i) => {
      if (/testID\s*=\s*["'`]/.test(l) || /testID\s*=\s*\{\s*["'`]/.test(l) || /testID\s*:\s*["'`]/.test(l)) bad.push(`${f.rel}:${i + 1}`);
    });
  }
  assert.deepEqual(bad, []);
});

test('공통 부품은 testID를 넘겨받는다', () => {
  const common = fs.readFileSync(path.join(SRC, 'components/common.tsx'), 'utf8');
  for (const fn of ['IconBtn', 'PrimaryButton', 'LineRow', 'CloseBtn', 'TextTabs', 'Header']) {
    const start = common.indexOf(`export function ${fn}`);
    assert.ok(start >= 0, fn);
    const head = common.slice(start, common.indexOf('{', common.indexOf(')', start)) + 1);
    assert.match(head, /testID|backTestID/, fn);
  }
  const rows = fs.readFileSync(path.join(SRC, 'screens/settings/rows.tsx'), 'utf8');
  assert.match(rows.slice(rows.indexOf('export function RadioRow'), rows.indexOf('export function ColophonRow')), /testID=\{testID\}/);
  // Pressy는 나머지 속성을 그대로 넘긴다(testID 포함)
  const pressy = fs.readFileSync(path.join(SRC, 'components/Pressy.tsx'), 'utf8');
  assert.match(pressy, /\{\.\.\.rest\}/);
  const tsheet = fs.readFileSync(path.join(SRC, 'components/TemplateSheet.tsx'), 'utf8');
  assert.match(tsheet, /closeTestID = TID\.sheetClose/);
});
