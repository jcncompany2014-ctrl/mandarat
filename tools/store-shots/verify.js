#!/usr/bin/env node
// 스크린샷 검사 — out/<언어>/<기기>/<nn>-<장면>.png마다 PNG 머리(IHDR)의 크기가 그 기기의 내보내는 크기와 같고
// 색 형식이 2(RGB, 알파 없음) · 8비트인지 본다. 하나라도 틀리면 1로 끝난다.
// 쓰는 법: node verify.js [폴더(기본 out)]
const fs = require('fs');
const path = require('path');
const { DEVICES } = require('./devices');
const { readHeader } = require('./png');

/** 파일 하나 → 문제 목록(없으면 빈 배열) */
function checkFile(file, device) {
  const problems = [];
  let h;
  try {
    h = readHeader(fs.readFileSync(file));
  } catch (e) {
    return [`${file}: ${e.message}`];
  }
  const [w, hh] = device.out;
  if (h.width !== w || h.height !== hh) problems.push(`${file}: ${h.width}×${h.height} — ${device.id}는 ${w}×${hh}`);
  if (h.colorType !== 2) problems.push(`${file}: 색 형식 ${h.colorType} — 2(RGB, 알파 없음)여야 해요`);
  if (h.bitDepth !== 8) problems.push(`${file}: 비트 깊이 ${h.bitDepth} — 8이어야 해요`);
  return problems;
}

/** 폴더 전체 → { files, problems } */
function verifyDir(dir) {
  const files = [];
  const problems = [];
  if (!fs.existsSync(dir)) return { files, problems: [`${dir}가 없어요`] };
  for (const locale of fs.readdirSync(dir).sort()) {
    const ld = path.join(dir, locale);
    if (!fs.statSync(ld).isDirectory()) continue;
    for (const dev of fs.readdirSync(ld).sort()) {
      const dd = path.join(ld, dev);
      if (!fs.statSync(dd).isDirectory()) continue;
      const device = DEVICES.find((d) => d.id === dev);
      if (!device) {
        problems.push(`${dd}: 모르는 기기 폴더`);
        continue;
      }
      for (const f of fs.readdirSync(dd).filter((x) => x.endsWith('.png')).sort()) {
        const file = path.join(dd, f);
        if (!/^\d\d-[a-z]+\.png$/.test(f)) problems.push(`${file}: 이름이 <nn>-<장면>.png가 아니에요`);
        files.push(file);
        problems.push(...checkFile(file, device));
      }
    }
  }
  if (files.length === 0) problems.push(`${dir}에 PNG가 없어요`);
  return { files, problems };
}

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, 'out'));
  const { files, problems } = verifyDir(dir);
  if (problems.length > 0) {
    console.error(`verify 실패 (${problems.length}):\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`verify: ${files.length}장 모두 크기 · RGB(알파 없음) 맞아요`);
}

module.exports = { checkFile, verifyDir };
