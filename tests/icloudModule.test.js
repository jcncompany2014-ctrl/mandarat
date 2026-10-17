// V3-F iCloud 로컬 모듈 — 설정 · podspec · JS 얼굴(index.ts)의 모양, Swift가 쓰는 Apple API와 줄(queue) 규칙,
// 앱 설정이 컨테이너 폴더를 파일 앱에 드러내지 않는지. Swift는 여기서 빌드할 수 없어 소스 글자로 지킨다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const { ICLOUD_CONTAINER } = require('../src/lib/contracts');
const { REPLICA_DIR, replicaName } = require('../src/lib/syncFile');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SWIFT = 'modules/icloud-sync/ios/ICloudSyncModule.swift';
const PODSPEC = 'modules/icloud-sync/ios/ICloudSync.podspec';
const INDEX = 'modules/icloud-sync/index.ts';

/** Swift에서 주석을 뺀 글자 — 주석에 적힌 낱말로 검사가 통과하지 않게 */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

test('modules/icloud-sync: 설정 · podspec', () => {
  assert.deepEqual(JSON.parse(src('modules/icloud-sync/expo-module.config.json')), { platforms: ['apple'], apple: { modules: ['ICloudSyncModule'] } });
  const pod = src(PODSPEC);
  assert.match(pod, /s\.name\s+= 'ICloudSync'/);
  assert.match(pod, /:ios => '16\.4'/);
  assert.match(pod, /s\.swift_version\s+= '5\.9'/);
  assert.match(pod, /s\.dependency 'ExpoModulesCore'/);
  assert.match(pod, /s\.source_files = "\*\*\/\*\.\{h,m,swift\}"/);
  assert.doesNotMatch(pod, /File.read|package\.json/, 'package.json을 읽지 않는다(없다)');
  assert.equal(fs.existsSync(path.join(ROOT, 'modules/icloud-sync/package.json')), false);
  // 모듈 이름(JS 이름 · Swift 클래스 · pod)이 맞물린다
  const sw = src(SWIFT);
  const names = [/Name\("([^"]+)"\)/.exec(sw)[1], /public class (\w+): Module/.exec(sw)[1], /s\.name\s+= '([^']+)'/.exec(pod)[1]];
  assert.deepEqual(names, ['ICloudSync', 'ICloudSyncModule', 'ICloudSync']);
});

test('index.ts: requireOptionalNativeModule — 웹 · Node · 안드로이드에서는 null(아무 일도 하지 않는다)', () => {
  const idx = src(INDEX);
  assert.match(idx, /export const icloud = requireOptionalNativeModule<ICloudSyncNative>\('ICloudSync'\);/);
  assert.match(idx, /from 'expo'/);
  // 'expo'를 가짜로 바꿔 실제로 불러 본다 — 기기 모듈이 없으면 icloud === null
  const asked = [];
  const fake = { requireOptionalNativeModule: (n) => (asked.push(n), null) };
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (req, ...rest) {
    if (req === 'expo') return 'fake-expo';
    return resolve.call(this, req, ...rest);
  };
  require.cache['fake-expo'] = { id: 'fake-expo', filename: 'fake-expo', loaded: true, exports: fake };
  try {
    const file = path.join(ROOT, INDEX);
    delete require.cache[file];
    const mod = require(file);
    assert.equal(mod.icloud, null);
    assert.deepEqual(asked, ['ICloudSync']);
  } finally {
    Module._resolveFilename = resolve;
    delete require.cache['fake-expo'];
  }
});

test('index.ts: 함수 · 이벤트 계약', () => {
  const sf = ts.createSourceFile(INDEX, src(INDEX), ts.ScriptTarget.ES2022, true);
  const cls = sf.statements.find((s) => ts.isClassDeclaration(s) && s.name?.text === 'ICloudSyncNative');
  assert.ok(cls, 'ICloudSyncNative');
  const sig = Object.fromEntries(cls.members.filter(ts.isMethodDeclaration).map((m) => [
    m.name.getText(sf),
    `(${m.parameters.map((p) => p.getText(sf)).join(', ')}) => ${m.type.getText(sf)}`,
  ]));
  assert.deepEqual(sig, {
    status: '() => Promise<ICloudStatus>',
    start: '() => Promise<boolean>',
    stop: '() => Promise<void>',
    list: '() => Promise<ICloudFile[]>',
    read: '(name: string) => Promise<string[]>',
    write: '(name: string, json: string) => Promise<void>',
    remove: '(name: string) => Promise<void>',
    deviceKey: '() => Promise<string>',
  });
  assert.match(cls.heritageClauses[0].getText(sf), /extends NativeModule<ICloudSyncEvents>/);
  const events = sf.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === 'ICloudSyncEvents');
  assert.deepEqual(events.type.members.map((m) => m.name.getText(sf)), ['onChange', 'onAccountChange']);
  assert.match(events.type.members[0].type.getText(sf), /\{ names: string\[\] \}/);
  // 모든 Swift 함수가 JS 쪽에 있고, 그 반대도
  const sw = src(SWIFT);
  const swiftFns = [...sw.matchAll(/AsyncFunction\("(\w+)"\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(swiftFns, Object.keys(sig).sort());
  assert.match(sw, /Events\("onChange", "onAccountChange"\)/);
  // ICloudFile · ICloudStatus의 키 = Swift Record의 필드
  const fields = (rec) => [...new RegExp(`struct ${rec}: Record \\{([\\s\\S]*?)\\n\\}`).exec(sw)[1].matchAll(/@Field var (\w+)/g)].map((m) => m[1]);
  const keys = (name) => sf.statements.find((s) => ts.isInterfaceDeclaration(s) && s.name.text === name).members.map((m) => m.name.getText(sf));
  assert.deepEqual(fields('ICloudFileRecord'), keys('ICloudFile'));
  assert.deepEqual(fields('ICloudStatusRecord'), keys('ICloudStatus'));
});

test('ICloudSyncModule.swift: 쓰는 Apple API', () => {
  const sw = code(src(SWIFT));
  for (const w of [
    'NSFileCoordinator', 'coordinate(readingItemAt:', 'coordinate(writingItemAt:', '.forReplacing', '.forDeleting',
    'NSMetadataQuery()', 'NSMetadataQueryUbiquitousDataScope', 'NSMetadataQueryDidFinishGathering', 'NSMetadataQueryDidUpdate',
    'runOnQueue', 'NSUbiquityIdentityDidChange', 'ubiquityIdentityToken', 'SHA256.hash',
    'isExcludedFromBackup', 'beginBackgroundTask', 'endBackgroundTask',
    'startDownloadingUbiquitousItem', 'unresolvedConflictVersionsOfItem', 'isResolved = true',
    'compressed(using: .zlib)', 'decompressed(using: .zlib)', '.atomic', 'applicationSupportDirectory', 'UUID()',
  ]) assert.ok(sw.includes(w), w);
  assert.doesNotMatch(src(SWIFT), /identifierForVendor/, 'IDFV를 쓰지 않는다(deviceKey가 대신한다)');
  assert.doesNotMatch(sw, /NSUbiquitousContainers/);
  // 컨테이너 · 자리는 JS 계약과 같다
  assert.ok(sw.includes(`containerId = "${ICLOUD_CONTAINER}"`), 'ICLOUD_CONTAINER');
  assert.equal(REPLICA_DIR, 'Sync/v1/');
  assert.ok(sw.includes('dir = "Sync/v1"'), 'REPLICA_DIR');
  // 질의 조건 Sync/v1/*.jsonz — 이름으로 고르고 collect가 Sync/v1 바로 아래만 남긴다
  assert.ok(sw.includes('"%K LIKE %@", NSMetadataItemFSNameKey, "*.jsonz"'), '질의 조건 *.jsonz');
  assert.match(sw, /parent\.lastPathComponent == "v1", parent\.deletingLastPathComponent\(\)\.lastPathComponent == "Sync"/);
  // 오류 코드는 index.ts의 ICloudErrorCode와 같다
  const swCodes = [...new Set([...sw.matchAll(/error\("(E_[A-Z_]+)"/g)].map((m) => m[1]))].sort();
  const tsCodes = [.../export type ICloudErrorCode = ([^;]+);/.exec(src(INDEX))[1].matchAll(/'(E_[A-Z_]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(swCodes, tsCodes);
  assert.match(sw, /Exception\(name: "ICloudSyncError", description: description, code: code\)/);
});

test('ICloudSyncModule.swift: 이름 검사는 syncFile.replicaName과 맞물린다', () => {
  const sw = src(SWIFT);
  const re = new RegExp(/name\.range\(of: #"(.+?)"#, options: \.regularExpression\)/.exec(sw)[1]);
  assert.ok(re.test(replicaName('k3j9x0a1b2c3d4e5')));
  for (const bad of ['Sync/v1/../x.jsonz', 'Sync/v1/a/b.jsonz', '/Sync/v1/a.jsonz', 'Sync/v1/A.jsonz', 'Sync/v1/a.json', 'Documents/a.jsonz', 'Sync/v1/.jsonz']) {
    assert.ok(!re.test(bad), bad);
  }
});

test('ICloudSyncModule.swift: 줄 — 파일 IO는 직렬 io 줄, 질의는 main 줄, 컨테이너 주소는 main 밖', () => {
  const sw = code(src(SWIFT));
  assert.match(sw, /private let io = DispatchQueue\(label: "[^"]+", qos: \.utility\)/, '직렬 줄(attributes: .concurrent 없음)');
  assert.doesNotMatch(sw, /\.concurrent/);
  // 함수마다 줄
  const queueOf = (fn) => {
    const at = sw.indexOf(`AsyncFunction("${fn}")`);
    const next = sw.indexOf('AsyncFunction(', at + 1);
    const body = sw.slice(at, next === -1 ? sw.indexOf('// MARK', at) : next);
    return /\.runOnQueue\(([^)]+)\)/.exec(body)?.[1];
  };
  for (const fn of ['status', 'start', 'read', 'write', 'remove', 'deviceKey']) assert.equal(queueOf(fn), 'io', fn);
  for (const fn of ['stop', 'list']) assert.equal(queueOf(fn), '.main', fn);
  // url(forUbiquityContainerIdentifier:)는 한 곳(resolveContainer)뿐이고, 그곳은 io 줄을 다짐한다
  assert.equal(sw.split('url(forUbiquityContainerIdentifier:').length - 1, 1);
  const resolve = /private func resolveContainer\(\) -> URL\? \{([\s\S]*?)\n {2}\}/.exec(sw)[1];
  assert.match(resolve, /dispatchPrecondition\(condition: \.onQueue\(io\)\)/);
  // 계정은 기억한 주소보다 먼저 본다 — 로그아웃 뒤에는 E_NO_ACCOUNT(기억한 주소로 쓰다 E_IO가 되지 않게)
  assert.ok(resolve.indexOf('ubiquityIdentityToken != nil else') < resolve.indexOf('if let url = containerURL'), '계정 먼저');
  assert.match(resolve, /ubiquityIdentityToken != nil else \{\s*containerURL = nil\s*return nil/);
  // 뒤로 갈 때 io 줄에 쌓인 일을 배경 작업 하나로 덮는다
  assert.match(sw, /OnAppEntersBackground \{\s*let task = BackgroundTask\.begin\("icloud-sync drain"\)\s*self\.io\.async \{ task\.end\(\) \}/);
  // 질의는 main 줄에서 연다
  assert.match(sw, /guard self\.resolveContainer\(\) != nil else \{ return false \}\s*DispatchQueue\.main\.async \{ self\.startQuery\(\) \}/);
  assert.match(sw, /addObserver\(forName: \.NSMetadataQueryDidFinishGathering, object: q, queue: \.main/);
  assert.match(sw, /addObserver\(forName: \.NSMetadataQueryDidUpdate, object: q, queue: \.main/);
  // 계정이 바뀌면 기억한 컨테이너를 io 줄에서 버린다
  assert.match(sw, /\.NSUbiquityIdentityDidChange[\s\S]*?self\.io\.async \{\s*self\.containerURL = nil/);
  // main 줄은 io 줄을 기다리지 않는다
  assert.doesNotMatch(sw, /io\.sync/);
});

test('ICloudSyncModule.swift: 읽기 · 쓰기 · 열쇠의 차례', () => {
  const sw = code(src(SWIFT));
  const fn = (name) => {
    const at = sw.indexOf(`AsyncFunction("${name}")`);
    return sw.slice(at, sw.indexOf('.runOnQueue(', at));
  };
  // 읽기: 내려받기(10초) → 조율된 읽기(남은 시간까지, 충돌본도 그 안에서) → 풀기 → 풀림 표시
  const read = fn('read');
  const order = ['= try ICloudSyncModule.download(url)', 'coordinatedRead(url, limit: max(1, deadline.timeIntervalSinceNow))', 'inflate(data)', 'resolve(conflicts'];
  const at = order.map((w) => read.indexOf(w));
  assert.ok(at.every((i) => i >= 0), `${order} in read`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, '차례');
  assert.match(sw, /static let downloadWait: TimeInterval = 10/);
  // 조율된 읽기는 limit 뒤에 그만둔다(cancel) — 그러면 이 기기의 사본을, 없으면 E_TIMEOUT. 끝없이 io 줄을 막지 않는다
  const cread = sw.slice(sw.indexOf('static func coordinatedRead('), sw.indexOf('static func coordinatedWrite('));
  const c = ['DispatchWorkItem { coordinator.cancel() }', 'asyncAfter(deadline: .now() + limit, execute: timer)', 'coordinate(readingItemAt:', 'timer.cancel()', 'unresolvedConflictVersionsOfItem(at: target)', 'NSUserCancelledError', 'try? Data(contentsOf: url)', 'error("E_TIMEOUT"'];
  const cat = c.map((x) => cread.indexOf(x));
  assert.ok(cat.every((i) => i >= 0), `${c} in coordinatedRead`);
  assert.deepEqual([...cat].sort((a, b) => a - b), cat, '차례');
  // 너무 큰 복제본은 풀지 않는다
  assert.match(sw, /guard data\.count < maxPacked else \{\s*throw error\("E_CORRUPT"/);
  // 쓰기: 누르기 → 배경 작업 안에서 조율된 .forReplacing 원자적 쓰기
  const write = fn('write');
  const w = ['deflate(json)', 'BackgroundTask.begin(', 'defer { task.end() }', 'coordinatedWrite(url, options: .forReplacing)', 'data.write(to: target, options: .atomic)'];
  const wat = w.map((x) => write.indexOf(x));
  assert.ok(wat.every((i) => i >= 0), `${w} in write`);
  assert.deepEqual([...wat].sort((a, b) => a - b), wat, '차례');
  // 배경 작업은 시간이 다 되면 스스로 끝낸다
  assert.match(sw, /beginBackgroundTask\(withName: name\) \{ task\.end\(\) \}/);
  // 열쇠: Application Support/icloud-sync/device, 백업에서 뺀다(폴더와 파일 모두)
  const key = /static func loadDeviceKey\(\) throws -> String \{([\s\S]*?)\n {2}\}/.exec(sw)[1];
  assert.match(key, /appendingPathComponent\("icloud-sync", isDirectory: true\)/);
  assert.match(key, /appendingPathComponent\("device", isDirectory: false\)/);
  assert.match(key, /excluded\.isExcludedFromBackup = true/);
  assert.match(key, /try dir\.setResourceValues\(excluded\)/);
  assert.match(key, /try file\.setResourceValues\(excluded\)/);
  // 계정 지문은 SHA-256 앞 16글자
  assert.match(sw, /String\(hex\.prefix\(16\)\)/);
});

test('app.json: NSUbiquitousContainers가 없다(파일 앱에 폴더가 보이지 않는다) · 권한에 컨테이너', () => {
  const app = JSON.parse(src('app.json'));
  assert.equal(app.expo.ios.infoPlist.NSUbiquitousContainers, undefined);
  assert.doesNotMatch(src('app.json'), /NSUbiquitousContainers/);
  const e = app.expo.ios.entitlements;
  assert.deepEqual(e['com.apple.developer.ubiquity-container-identifiers'], [ICLOUD_CONTAINER]);
  assert.deepEqual(e['com.apple.developer.icloud-container-identifiers'], [ICLOUD_CONTAINER]);
  assert.deepEqual(e['com.apple.developer.icloud-services'], ['CloudDocuments']);
});

test('prebuild-checks/icloud.js: 자동 연결 · 권한을 본다', () => {
  const check = require('../scripts/prebuild-checks/icloud');
  const container = ICLOUD_CONTAINER;
  const ctx = {
    autolinking: { modules: [{ packageName: 'icloud-sync', modules: [{ class: 'ICloudSyncModule' }], pods: [{ podName: 'ICloudSync', podspecDir: '/x/modules/icloud-sync/ios' }] }] },
    entitlements: {
      'com.apple.developer.icloud-container-identifiers': [container],
      'com.apple.developer.ubiquity-container-identifiers': [container],
      'com.apple.developer.icloud-services': ['CloudDocuments'],
    },
    infoPlist: {},
  };
  check(ctx, assert);
  assert.throws(() => check({ ...ctx, autolinking: { modules: [] } }, assert));
  assert.throws(() => check({ ...ctx, infoPlist: { NSUbiquitousContainers: {} } }, assert));
  assert.throws(() => check({ ...ctx, entitlements: { ...ctx.entitlements, 'com.apple.developer.icloud-services': [] } }, assert));
});
