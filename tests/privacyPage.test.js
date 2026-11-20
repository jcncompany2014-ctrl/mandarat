// 개인정보 처리방침 페이지 — docs/v2/privacy.md에서 만든 public/privacy.html이 최신이고, 앱의 주소 · 문의 메일과 맞는다
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { build, section, EFFECTIVE } = require('../scripts/privacy-page');
const { PRIVACY_URL, SUPPORT_EMAIL, privacyLink } = require('../src/lib/appInfo');
const { msg, LANGS } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'public/privacy.html'), 'utf8');

test('public/privacy.html은 privacy.md에서 지금 만든 것과 같다(고치면 npm run privacy-page)', () => {
  assert.equal(page, build());
});

test('세 언어 · 11개 항목 · 문의 메일 — 틀 자리(<…>)나 검토용 표는 실리지 않는다', () => {
  for (const l of ['ko', 'ja', 'en']) assert.match(page, new RegExp(`<section id="${l}" lang="${l}">`));
  assert.equal((page.match(/<h3>/g) ?? []).length, 33);
  assert.equal((page.match(new RegExp(`href="mailto:${SUPPORT_EMAIL.replace(/[.]/g, '\\.')}"`, 'g')) ?? []).length, 3);
  assert.doesNotMatch(page, /<(SUPPORT_EMAIL|EFFECTIVE_DATE|OPERATOR)>|DRAFT|For the reviewer/);
  // 1.0은 오류 기록을 보내지 않는다 — Sentry · 끄기 줄이 없다
  assert.doesNotMatch(page, /Sentry|오류 기록 보내기|Send error reports/);
  assert.match(page, /오류 기록을 보내지 않아요/);
  // 바깥 글꼴 · 스크립트를 부르지 않는다
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+stylesheet/);
});

const HEADS = { ko: '한국어', ja: '日本語', en: 'English' };
const md = fs.readFileSync(path.join(ROOT, 'docs/v2/privacy.md'), 'utf8');
/** 한 언어의 n번째 항목(번호 머리 다음 ~ 다음 번호 머리 앞) */
function item(l, n) {
  const text = section(md, HEADS[l]);
  const at = text.indexOf(`**${n}. `);
  assert.ok(at >= 0, `${l}: ${n}항`);
  const rest = text.slice(text.indexOf('\n', at) + 1);
  const end = rest.search(/\n\*\*(\d+\.|[^*\n]+:\*\*)/);
  return end < 0 ? rest : rest.slice(0, end);
}

test('시행일 — 글을 고친 날이 세 언어로 실린다(11항: 바뀌면 새 시행일과 함께 올린다)', () => {
  // 방침의 글을 고치면 이 날짜도 그날로 바꾼다(scripts/privacy-page.js EFFECTIVE)
  assert.equal(EFFECTIVE, '2026-11-20');
  for (const d of ['시행일: 2026년 11월 20일', '施行日: 2026年11月20日', 'Effective: November 20, 2026']) assert.ok(page.includes(`<p class="meta">${d}</p>`), d);
  assert.doesNotMatch(page, /11월 8일|11月8日|November 8,/);
  for (const l of LANGS) assert.match(item(l, 11), /새 시행일|新しい施行日|new effective date/, `${l}: 11항`);
});

test('2 · 9항 — 메뉴 이름은 앱이 그 언어로 보이는 이름이고, 전체 초기화는 지금 쓰는 표와 그 기록만 지운다고 적는다', () => {
  for (const l of LANGS) {
    const m = msg(l);
    // 2항: 켜는 곳(설정 › iCloud와 백업)과 켜는 줄의 이름
    const two = item(l, 2);
    for (const n of [m.settings.screenTitle, m.settings.secCloud, m.sync.toggle]) assert.ok(two.includes(n), `${l} 2항: '${n}'`);
    // 9항: 설정 › 새로 시작 › 전체 초기화, 남는 것은 지난 표 보관함과 저장본
    const nine = item(l, 9);
    for (const n of [m.settings.screenTitle, m.settings.subRestart, m.settings.resetRow, m.year.shelf]) assert.ok(nine.includes(n), `${l} 9항: '${n}'`);
    assert.ok(nine.toLowerCase().includes(m.settings.snapTitle.toLowerCase()), `${l} 9항: ${m.settings.snapTitle}`);
  }
  // 예전 말 — 없는 길(설정 › iCloud) · 맞추기 · 保存版 · Appleアカウント · '기기의 기록을 (모두) 지운다'
  assert.doesNotMatch(page, /설정&nbsp;› iCloud에서|맞추|맞춰|保存版|Appleアカウント|設定&nbsp;› iCloudで同期|Settings&nbsp;› iCloud,/);
  assert.doesNotMatch(page, /전체 초기화로 기기의 기록을|すべてリセットで端末の記録を|Reset everything deletes the records on the device/);
  // 글이 기대는 코드 — 초기화는 설정과 지난 표를 남긴다
  const archive = fs.readFileSync(path.join(ROOT, 'src/lib/archive.ts'), 'utf8');
  assert.match(archive, /return \{ \.\.\.blankDoc\(\), settings: d\.settings, \.\.\.\(d\.archives && d\.archives\.length > 0 \? \{ archives: d\.archives \} : \{\}\) \};/);
});

test('앱의 처리방침 주소는 그 페이지(https · cleanUrls)이고, 앱 언어로 연다', () => {
  assert.match(PRIVACY_URL, /^https:\/\/[^/]+\/privacy$/);
  assert.match(SUPPORT_EMAIL, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).cleanUrls, true);
  assert.equal(privacyLink('ja'), `${PRIVACY_URL}?lang=ja`);
  assert.equal(privacyLink('ko', ''), '');
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  assert.match(src('src/screens/Settings.tsx'), /openLink\(privacyLink\(lang\(\)\)\)/);
  assert.match(src('src/overlays/ProSheet.tsx'), /Linking\.openURL\(privacyLink\(lang\(\)\)\)/);
});
