#!/usr/bin/env node
// iOS 프리빌드 검사 — expo prebuild로 ios/를 만들어 Info.plist · 권한(entitlements) · Xcode 프로젝트 · Podfile을 읽고,
// scripts/prebuild-checks/*.js(꾸러미마다 한 파일)의 검사를 돌린 뒤 ios/를 지운다. 이 저장소는 CNG라 ios/를 올리지 않는다.
// 쓰는 법: npm run prebuild-check  (실패하면 종료 코드 1)
//
// - ios/가 이미 있으면 시작하지 않는다(손으로 만든 것을 지우지 않게).
// - 끝나면 늘 ios/를 지우고 package.json을 읽은 그대로 되돌린다(prebuild가 ios·android 스크립트를 고쳐 쓸 수 있다).
//   git checkout은 쓰지 않는다 — 올리지 않은 고침을 조용히 되돌린다.
// 검사 파일 꼴: module.exports = (ctx, assert) => { … }  — ctx는 아래 load()가 돌려주는 것, assert는 node:assert/strict.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const IOS = path.join(ROOT, 'ios');
const PKG = path.join(ROOT, 'package.json');
const CHECKS = path.join(__dirname, 'prebuild-checks');

const env = { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' };
const run = (args, opts = {}) => execFileSync('npx', args, { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });

/** ios/ 아래 파일을 모두(상대 경로 → 내용) — 글자 파일만 */
function readTree(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(IOS, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
    }
  };
  walk(dir);
  return out;
}

function load() {
  const plist = require('@expo/plist').default;
  const read = (rel) => fs.readFileSync(path.join(IOS, rel), 'utf8');
  const exists = (rel) => fs.existsSync(path.join(IOS, rel));
  return {
    root: ROOT,
    ios: IOS,
    read,
    exists,
    infoPlist: plist.parse(read('Mandarat/Info.plist')),
    entitlements: plist.parse(read('Mandarat/Mandarat.entitlements')),
    pbxproj: read('Mandarat.xcodeproj/project.pbxproj'),
    podfile: read('Podfile'),
    podfileProperties: JSON.parse(read('Podfile.properties.json')),
    widgetFiles: readTree(path.join(IOS, 'ExpoWidgetsTarget')),
    expoConfig: JSON.parse(run(['expo', 'config', '--type', 'prebuild', '--json'])),
    autolinking: JSON.parse(run(['expo-modules-autolinking', 'resolve', '--platform', 'apple', '--json'])),
    plist,
  };
}

function main() {
  if (fs.existsSync(IOS)) {
    console.error('ios/가 이미 있어요 — 지우거나 옮긴 뒤 다시 실행해 주세요(이 검사는 만든 ios/를 끝에 지운다).');
    process.exit(2);
  }
  const pkgBytes = fs.readFileSync(PKG);
  let failed = 0;
  try {
    console.log('› expo prebuild --platform ios --no-install --clean');
    run(['expo', 'prebuild', '--platform', 'ios', '--no-install', '--clean'], { stdio: 'inherit' });
    const ctx = load();
    const files = fs.readdirSync(CHECKS).filter((f) => f.endsWith('.js')).sort();
    for (const f of files) {
      const check = require(path.join(CHECKS, f));
      try {
        check(ctx, assert);
        console.log(`✔ ${f}`);
      } catch (e) {
        failed++;
        console.error(`✘ ${f}\n${e && e.message ? e.message : e}`);
      }
    }
  } catch (e) {
    failed++;
    console.error(e && e.message ? e.message : e);
  } finally {
    fs.rmSync(IOS, { recursive: true, force: true });
    if (!fs.readFileSync(PKG).equals(pkgBytes)) {
      fs.writeFileSync(PKG, pkgBytes);
      console.log('› package.json을 읽은 그대로 되돌렸어요');
    }
  }
  if (failed > 0) {
    console.error(`prebuild-check: ${failed}곳 실패`);
    process.exit(1);
  }
  console.log('prebuild-check: 모두 통과');
}

if (require.main === module) main();
module.exports = { load };
