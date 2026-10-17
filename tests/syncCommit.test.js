// R-8 #5 — 맞추기 손잡이의 플랫폼 나누기(src/lib/syncCommit.ios.ts · syncCommit.ts).
// - 두 파일은 같은 이름을 내보내고, 웹 쪽 빈 손잡이는 메타 없이 iOS 쪽과 같은 문서를 읽고 쓴다.
// - 웹에서 불러오는 파일을 따라가도(웹 꼬리표 → 꼬리표 없음 순) 합치기 · 도장 · 엔진 파일에 닿지 않는다.
// - 내보낸 웹 번들이 있으면(WEB_BUNDLE=<expo export 폴더>) 그 안에 syncMerge의 이름(mergeAll · adoptMerged)이 없다.
require('./register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { rng, fuzzDoc } = require('./helpers/docFuzz');
const { blankDoc, migrate } = require('../src/data/defaults');
const { newSyncMeta } = require('../src/lib/syncMeta');
const env = require('../src/lib/syncEnvelope');
const web = require('../src/lib/syncCommit');
const ios = require('../src/lib/syncCommit.ios');

const ROOT = path.join(__dirname, '..');

test('syncCommit.ts and syncCommit.ios.ts export the same names', () => {
  assert.deepEqual(Object.keys(web).sort(), Object.keys(ios).sort());
  // 함수는 함수로 — 웹에서 만들지 않는 것(새 메타 · 엔진)만 null
  for (const k of Object.keys(ios)) {
    if (typeof ios[k] === 'function') assert.ok(typeof web[k] === 'function' || (web[k] === null && ['makeSyncMeta', 'createSyncEngine'].includes(k)), k);
    else assert.equal(typeof web[k], typeof ios[k], k);
  }
  // 같은 값(봉투의 JSON · 시간 · 꺼진 상태)은 한 곳(syncCommitBase)에서
  for (const k of ['docOnlyJson', 'serializeStored', 'OFF_STATUS', 'PUSH_DEBOUNCE_MS', 'EPOCH_PUSH_DEBOUNCE_MS']) assert.equal(web[k], ios[k], k);
  assert.equal(ios.serializeStored, env.serializeStored);
  assert.equal(ios.commitMeta, env.commitMeta);
  assert.equal(ios.makeSyncPort, env.makeSyncPort);
});

test('web stubs: no meta anywhere, and the doc reads exactly as on iOS without a meta', () => {
  assert.equal(web.makeSyncMeta, null);
  assert.equal(web.createSyncEngine, null);
  const m = ios.makeSyncMeta();
  assert.equal(m.enabled, false, 'a fresh iOS meta never turns sync on by itself');
  const r = rng(5);
  for (let i = 0; i < 40; i++) {
    const doc = fuzzDoc(r);
    const day = i % 2 ? doc.todayDate || '2026-10-17' : '2030-01-01';
    // 웹에 남은 봉투(_sync)가 있어도 문서만
    const raw = i % 3 === 0 ? web.serializeStored(doc, newSyncMeta(r)) : web.serializeStored(doc, null);
    assert.deepEqual(web.openStored(raw, day, 0, null), env.openStored(raw, day, 0, null));
  }
  assert.throws(() => web.openStored('{nope', '2026-10-17', 0, null));
  const doc = migrate({ ...blankDoc(), onboarded: true });
  const next = { ...doc, centerGoal: 'x' };
  assert.equal(web.stampPending(doc, next, null, 0), null);
  assert.deepEqual(web.commitMeta(doc, next, null, doc, 'epoch', 0), { meta: null, stamped: doc });
  assert.equal(web.undoResetMeta({ before: m, epoch: '' }, m), null, 'web always falls back to replaceDoc');
  assert.equal(web.makeSyncPort({}), null);
});

test('web stubs: probe says unavailable without asking anything', async () => {
  assert.deepEqual(await web.probe({ status() { throw new Error('not called'); } }, { running: () => false }), { available: false, files: 0 });
});

// ── 웹이 불러오는 파일 ───────────────────────────────────────────────────────

const EXTS = ['.tsx', '.ts', '.jsx', '.js'];

/** Metro(웹)처럼 고른다 — '.web' 꼬리표 먼저, 그다음 꼬리표 없이. .ios · .native는 고르지 않는다 */
function resolveWeb(from, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  const tries = [];
  for (const e of EXTS) tries.push(`${base}.web${e}`);
  for (const e of EXTS) tries.push(`${base}${e}`);
  for (const e of EXTS) tries.push(path.join(base, `index.web${e}`), path.join(base, `index${e}`));
  if (path.extname(base)) tries.unshift(base);
  return tries.find((f) => fs.existsSync(f) && fs.statSync(f).isFile()) ?? null;
}

/** 값으로 부르는 경로 — import type · 타입만 고른 import · typeof import()는 번들에 남지 않으므로 뺀다 */
function valueSpecifiers(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const visit = (n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const c = n.importClause;
      const typeOnly = c && (c.isTypeOnly || (!c.name && c.namedBindings && ts.isNamedImports(c.namedBindings)
        && c.namedBindings.elements.length > 0 && c.namedBindings.elements.every((e) => e.isTypeOnly)));
      if (!typeOnly) out.push(n.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      if (!n.isTypeOnly) out.push(n.moduleSpecifier.text);
    } else if (ts.isCallExpression(n) && n.arguments[0] && ts.isStringLiteral(n.arguments[0])
      && ((ts.isIdentifier(n.expression) && n.expression.text === 'require') || n.expression.kind === ts.SyntaxKind.ImportKeyword)) {
      out.push(n.arguments[0].text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function webGraph(entry) {
  const seen = new Set();
  const from = new Map();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const spec of valueSpecifiers(f)) {
      const r = resolveWeb(f, spec);
      if (r && !r.includes(`${path.sep}node_modules${path.sep}`) && !seen.has(r)) {
        if (!from.has(r)) from.set(r, f);
        stack.push(r);
      }
    }
  }
  return { files: [...seen].map((f) => path.relative(ROOT, f).split(path.sep).join('/')), from };
}

/** 웹 번들에 들어가면 안 되는 맞추기 코드 */
const IOS_ONLY = ['syncEnvelope', 'syncEngine', 'syncLocal', 'syncMerge', 'syncFile', 'syncProject', 'syncStamp', 'syncMeta', 'syncCommit.ios'];

test('the web import graph (from index.ts) reaches no merge, stamping or engine code — only syncCommit(.ts) and its base', () => {
  const { files, from } = webGraph(path.join(ROOT, 'index.ts'));
  assert.ok(files.includes('App.tsx') && files.includes('src/store/MandaratContext.tsx') && files.includes('src/hosts/ICloudSync.tsx'), 'the walk reaches the app');
  assert.ok(files.includes('src/lib/syncCommit.ts') && files.includes('src/lib/syncCommitBase.ts') && files.includes('src/lib/syncStatus.ts'));
  const bad = files.filter((f) => IOS_ONLY.some((n) => f === `src/lib/${n}.ts`));
  const why = bad.map((f) => {
    const chain = [f];
    let cur = path.join(ROOT, f);
    while (from.has(cur)) { cur = from.get(cur); chain.push(path.relative(ROOT, cur)); }
    return chain.join(' ← ');
  });
  assert.deepEqual(why, []);
});

test('the iOS side still reaches the real sync code through syncCommit.ios.ts', () => {
  const s = fs.readFileSync(path.join(ROOT, 'src/lib/syncCommit.ios.ts'), 'utf8');
  assert.match(s, /export \{ commitMeta, makeSyncPort, openStored, stampPending, undoResetMeta \} from '\.\/syncEnvelope';/);
  assert.match(s, /export \{ createSyncEngine, probe \} from '\.\/syncEngine';/);
  for (const f of ['src/store/MandaratContext.tsx', 'src/hosts/ICloudSync.tsx', 'src/lib/syncStatus.ts']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(t, /from '\.\.?\/(lib\/)?syncCommit';/, f);
  }
});

test('an exported web bundle (WEB_BUNDLE=<dir>) contains no syncMerge code', { skip: !process.env.WEB_BUNDLE && 'set WEB_BUNDLE to an `expo export --platform web` folder' }, () => {
  const dir = path.join(process.env.WEB_BUNDLE, '_expo', 'static', 'js', 'web');
  const js = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  assert.ok(js.length > 0);
  for (const f of js) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    // syncMerge만 내보내는 이름 — 모듈이 들어가면 내보내기 이름으로 남는다
    for (const marker of ['mergeAll', 'adoptMerged', 'joinStates']) assert.equal(text.includes(marker), false, `${f} has ${marker}`);
  }
});
