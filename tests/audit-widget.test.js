// 출시 전 감사에서 나온 위젯 · 저장소 고침의 지킴이.
// 1. 위젯이 지난 칸에 머문다 — 타임라인 30칸, 지난 칸에서는 목록 대신 한 줄 · 체크를 받지 않는다(src/widgets/TodayWidget.ios.tsx)
// 2. 위젯 · Siri의 한 번 · 직접 추가한 할 일 체크가 앱을 연 날로 적힌다 — 체크한 그날로(src/lib/widgetOps.ts)
// 3. 템플릿으로 바꾸면 아직 안 한 직접 추가한 할 일까지 지운다 — 남긴다(src/store/MandaratContext.tsx applyTemplate)
// 4. 켤 때마다 바뀌지 않은 문서를 다시 쓴다 — 읽은 그대로면 쓰지 않는다(같은 파일의 저장 효과)
// 위젯 모습은 tests/helpers/widgetVm.js의 vm에서 돌린다 — 지금(now)을 따로 주어 앱을 오래 열지 않은 날을 흉내 낸다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { blankDoc, migrate, sampleThemes } = require('../src/data/defaults');
const { msg, LANGS } = require('../src/i18n');
const { widgetTimeline, WIDGET_DAYS } = require('../src/lib/widgetSnapshot');
const { planOps, checkOnceOn, checkExtraOn, STALE_DAYS } = require('../src/lib/widgetOps');
const { activeStreak, toggleCellDone } = require('../src/lib/history');
const { rolloverToday, todayProgress, ymd } = require('../src/lib/routine');
const { openStored } = require('../src/lib/syncEnvelope');
const { serializeStored } = require('../src/lib/syncCommitBase');
const { newSyncMeta } = require('../src/lib/syncMeta');
const webCommit = require('../src/lib/syncCommit');
const { extractLayout, widgetRuntime, walk } = require('./helpers/widgetVm');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const rt = widgetRuntime(extractLayout());
const FAMILIES = ['systemSmall', 'systemMedium', 'systemLarge', 'accessoryInline', 'accessoryCircular', 'accessoryRectangular'];

const texts = (node) => { const out = []; walk(node, (n) => { if (n.type === 'TextView' && n.props.text) out.push(n.props.text); }); return out; };
const buttons = (node) => { const out = []; walk(node, (n) => { if (n.type === 'Button') out.push(n.props.target); }); return out; };
/** 수정자 하나의 인자(없으면 null) — vm 안에서 만든 값은 원형(prototype)이 달라 JSON으로 옮겨 견준다 */
const modArgs = (n, type) => { const m = (n.props.modifiers || []).find((x) => x.$type === type); return m ? JSON.parse(JSON.stringify(m.args)) : null; };
const said = (node) => { const out = []; walk(node, (n) => { const a = modArgs(n, 'accessibilityLabel'); if (a) out.push(a[0]); }); return out; };

// ── 3. 템플릿으로 바꿔도 아직 안 한 직접 추가한 할 일은 남는다 ─────────────────────

test('저장소 3: 템플릿으로 바꾸기는 아직 안 한 직접 추가한 할 일을 남긴다 — 예시로 채우기 · 새 표와 같게', () => {
  const s = src('src/store/MandaratContext.tsx');
  const tpl = s.slice(s.indexOf('const applyTemplate = useCallback('), s.indexOf('const replaceDoc = useCallback('));
  assert.match(tpl, /todayKeys: \[\],\s*todayExtra: d\.todayExtra\.filter\(\(x\) => !x\.done\),\s*dayLog: archiveAllCells\(d\.dayLog, Date\.now\(\)\),/);
  assert.doesNotMatch(s, /todayExtra: \[\]/, '저장소는 직접 추가한 할 일을 통째로 비우지 않는다');
  // 새 표(archive.startNewChart)와 같은 식 · 예시로 채우기는 목록을 건드리지 않는다
  assert.match(src('src/lib/archive.ts'), /todayExtra: doc\.todayExtra\.filter\(\(x\) => !x\.done\),/);
  const sample = s.slice(s.indexOf('const loadSample = useCallback('), s.indexOf('const resetUndo = useRef'));
  assert.doesNotMatch(sample, /todayExtra/);
  // 그 식이 하는 일
  const d = { ...blankDoc(), todayDate: '2026-11-20', todayExtra: [{ id: 'a', ti: 0, text: '우체국', done: false }, { id: 'b', ti: 3, text: '전화', done: true }, { id: 'c', ti: 7, text: '장보기', done: false }] };
  assert.deepEqual(d.todayExtra.filter((x) => !x.done).map((x) => x.id), ['a', 'c']);
  // 되돌리기는 바꾸기 전 문서를 통째로 넣는다(replaceDoc → 같은 날이면 하루 정리는 그대로 돌려준다) — 끝낸 할 일까지 그대로 돌아온다
  assert.equal(rolloverToday(d, '2026-11-20'), d);
  assert.match(src('src/screens/Settings.tsx'), /const snapshot = d; \/\/ 되돌리기용[\s\S]{0,260}applyTemplate\([\s\S]{0,120}offerUndo\(st\.templateDone\(\{ name: t\.name \}\), snapshot\);/);
  assert.match(s, /const replaceDoc = useCallback\(\(d: MandaratDoc\) => \{\s*dropEditorDraft\(\);\s*revRef\.current \+= 1;\s*commit\(rolloverToday\(d, dateKey\(\)\)\);/);
});
