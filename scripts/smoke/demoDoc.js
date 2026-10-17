// 웹 스모크의 예시 문서 — 고정한 날(2026-10-14 수요일, 서울) 기준으로 sampleThemes()에서 만든다.
// 스크린샷 비교(--compare)가 실행마다 같도록 날짜·기록을 모두 고정한다. 시계도 web-smoke.js가 같은 날로 고정한다.
require('../../tests/register');
const { blankDoc, sampleThemes } = require('../../src/data/defaults');

/** 고정한 오늘 — 시계와 같은 날 */
const DEMO_DAY = new Date(2026, 9, 14, 9, 30);

function demoDoc() {
  const themes = sampleThemes(DEMO_DAY);
  return {
    ...blankDoc(),
    onboarded: true,
    areasSet: true,
    centerGoal: '단단한 한 해',
    themes,
    todayDate: '2026-10-14',
    todayKeys: ['1-3'],
    dayLog: {
      '2026-10-12': ['0-1', '0-3', '6-0'],
      '2026-10-13': ['0-1', '0-3', '2-3'],
      '2026-10-14': ['0-1'],
    },
    dayMeta: { '2026-10-13': { mood: 3, reflection: '조금씩' } },
    focusMinutes: 125,
    settings: { ...blankDoc().settings, lastBackupAt: '2026-10-12' },
    reviews: { '2026-10-05': { at: '2026-10-11', next: ['0-2', '3-1'], note: '아침 운동부터' } },
    chartStart: '2026-01-01',
    focusStart: 0,
  };
}

module.exports = { demoDoc, DEMO_DAY };
