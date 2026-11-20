// 무거운 3년 문서 — 1,095일 × 체크 10개, 쌓기 칸 64개 × 200일(합치기 · 도장 시간 지킴이가 함께 쓴다).
// years를 주면 그 햇수만큼(같은 밀도로) — 올리기 지킴이는 5~7년 문서로 잰다
require('../register');
const { fullDoc } = require('./docFuzz');
const { migrate, sampleThemes } = require('../../src/data/defaults');
const { ymd } = require('../../src/lib/routine');

function heavyDoc(years = 3) {
  const days = Math.round(365 * years);
  const logged = Math.round((200 * years) / 3);
  const themes = sampleThemes(new Date(2024, 0, 1)).map((t, ti) => ({
    ...t,
    actions: t.actions.map((a, ai) => {
      const log = {};
      for (let i = 0; i < logged; i++) log[ymd(new Date(2024, 0, 1 + i * 5))] = 1 + ((ti + ai + i) % 3);
      return { ...a, text: `칸 ${ti}-${ai}`, kind: 'count', goal: 1000, count: 400, log };
    }),
  }));
  const dayLog = {};
  const dayMeta = {};
  for (let i = 0; i < days; i++) {
    const day = ymd(new Date(2024, 0, 1 + i));
    dayLog[day] = Array.from({ length: 10 }, (_, k) => `${k % 8}-${(i + k) % 8}`).filter((k, j, xs) => xs.indexOf(k) === j);
    if (i % 3 === 0) dayMeta[day] = { mood: i % 5, reflection: '괜찮은 하루' };
  }
  return migrate({ ...fullDoc(), themes, dayLog, dayMeta, focusMinutes: 50000 });
}

module.exports = { heavyDoc };
