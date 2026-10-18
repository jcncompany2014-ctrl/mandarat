// X-E — 'chart' 바구니: 한국어는 옮기기 전 글과 글자 하나까지 같고, 일본어·영어는 같은 자리에서 그 언어의 말.
// 81칸(FullGrid) · 만다라트 탭(GridScreen) · 영역 화면(Detail · areaPage) · 표 이미지(poster · ChartPoster · ShareChart) · 작은 표(GridMark · ChartSketch).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { msg } = require('../src/i18n');
const { ORDINAL } = require('../src/lib/chartSpeech');
const { areaTitle, rowStatus, rowLabel, rowLabelFor, pageSpeech } = require('../src/lib/areaPage');
const { posterCells, posterDate } = require('../src/lib/poster');

const ko = msg('ko').chart;
const ja = msg('ja').chart;
const en = msg('en').chart;

test('ko: 옮기기 전 글 그대로', () => {
  const same = {
    done: '달성', sep: ', ', coreGoal: '핵심 목표', goalPrompt: '핵심 목표를 정해 주세요', prevArea: '이전 영역', nextArea: '다음 영역',
    today: '오늘', editAreaName: '영역 이름 고치기', coreUnsetSay: '핵심 목표를 아직 정하지 않았어요',
    centerBlockSay: '가운데 블록, 핵심 목표와 8개 영역', blockHint: '위아래로 쓸어 칸을 하나씩 읽어요. 두 번 누르면 크게 봐요',
    zoomCenterSay: '가운데 블록을 크게 봐요', wholeSay: '81칸 전체를 봐요', wholeBtnSay: '81칸 전체 보기', wholeBtn: '81칸 전체',
    centerBlock: '가운데 블록', legendSay: '칠한 칸은 달성, 옅게 깔린 칸은 영역 이름, 작은 색 네모는 오늘 할 일', legendArea: '영역 이름',
    firstHint: '블록을 누르면 크게 볼 수 있어요', tabTitle: '만다라트', shareSay: '표 이미지로 공유', editGoal: '핵심 목표 고치기',
    next: '다음 할 일', edit: '고치기', ofEightDone: ' / 8 달성', boardTitle: '실천 보드', emptyHint: '칸을 눌러 실천 8개를 채워요',
    actionsTitle: '실천 8개', undoDone: '달성 풀기', markDone: '달성으로 표시', rowHint: '자세히 봐요', editText: '글자 고치기',
    posterTitle: '목표 달성표', brand: '만다라트', shareTitle: '표 이미지', shareWebOnly: '앱에서 이미지로 공유할 수 있어요',
    previewBlankSay: '표 이미지 미리보기, 빈 표', modeProgress: '진행 표시', modeBlank: '빈 표', making: '이미지를 만드는 중이에요',
    makeFailed: '이미지를 만들지 못했어요', shareFailed: '공유하지 못했어요', saveShare: '이미지 저장·공유', sketchEmpty: '비어 있음',
  };
  for (const [k, v] of Object.entries(same)) assert.equal(ko[k], v, k);

  assert.equal(ko.areaN({ n: 3 }), '영역 3');
  assert.equal(ko.fillAction({ n: 3 }), '실천 3 채우기');
  ORDINAL.forEach((w, i) => assert.equal(ko.areaOrdinalSay({ n: i + 1 }), `8개 영역 중 ${w} 번째`));
  assert.equal(ko.areaOrdinalSay({ n: 9 }), '8개 영역 중 9 번째');
  assert.equal(ko.coreSay({ goal: '건강한 한 해' }), '핵심 목표, 건강한 한 해');
  assert.equal(ko.blockSay({ name: '건강' }), '건강 블록');
  assert.equal(ko.coreCellSay({ goal: '', done: 3 }), '핵심 목표, 아직 정하지 않았어요, 64칸 중 3칸 달성, 고치기');
  assert.equal(ko.coreCellSay({ goal: '건강', done: 0 }), '핵심 목표, 건강, 64칸 중 0칸 달성, 고치기');
  assert.equal(ko.zoomHeadSay({ label: '건강, 8칸 중 3칸 달성' }), '건강, 8칸 중 3칸 달성, 블록 크게 보기');
  assert.equal(ko.zoomBlockSay({ name: '건강' }), '건강 블록을 크게 봐요');
  assert.equal(ko.editGoalSay({ goal: '건강' }), '핵심 목표, 건강, 고치기');
  assert.equal(ko.doneOf64Say({ done: 12 }), '64칸 중 12칸 달성');
  assert.equal(ko.doneOf64({ done: 12 }), '12 / 64칸');
  assert.equal(ko.nextBlanks({ n: 12, area: '건강' }), '빈 칸 12 · 건강부터 채우기');
  assert.equal(ko.nextStepSay({ title: '빈 칸 12 · 건강부터 채우기' }), '다음 할 일, 빈 칸 12 · 건강부터 채우기');
  assert.equal(ko.nextStepAreaSay({ title: '물 2L', area: '건강' }), '다음 할 일, 물 2L, 건강');
  assert.equal(ko.areaOf({ n: 3 }), '영역 3 / 8');
  assert.equal(ko.areaDoneSay({ done: 3, days: 0 }), '8칸 중 3칸 달성');
  assert.equal(ko.areaDoneSay({ done: 3, days: 4 }), '8칸 중 3칸 달성, 4일 연속');
  assert.equal(ko.streak({ n: 4 }), '4일 연속');
  assert.equal(ko.prevAreaSay({ name: '건강' }), '이전 영역, 건강');
  assert.equal(ko.nextAreaSay({ name: '건강' }), '다음 영역, 건강');
  assert.equal(ko.weekCount({ done: 2, total: 3 }), '이번 주 2/3');
  assert.equal(ko.points({ n: 4 }), '4점');
  assert.equal(ko.posterDone({ done: 7 }), '64칸 중 7칸');
  assert.equal(ko.posterDate({ y: 2026, m: 10, n: 13 }), '2026. 10. 13.');
  assert.equal(ko.previewSay({ done: 7 }), '표 이미지 미리보기, 64칸 중 7칸 달성');
  assert.equal(ko.markSay({ done: 7 }) + ko.markTodaySay({ total: 5, done: 2 }), '내 만다라트 81칸, 64칸 중 7칸 달성, 오늘 할 일 5개 중 2개 했어요');
  assert.equal(ko.areaView({ name: '건강' }), '건강 보기');
  assert.equal(ko.sketchSay({ goal: '비어 있음', areas: '건강, 재정' }), '만다라트 표, 가운데 칸 비어 있음, 영역 건강, 재정');
});

test('이름 없는 영역 — 영역 3 · 分野3 · Area 3 (표 · 영역 화면 · 표 이미지가 같은 말)', () => {
  const doc = { centerGoal: '', themes: Array.from({ length: 8 }, () => ({ title: '', color: '#478058', actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })) })) };
  for (const [l, want] of [['ko', '영역 3'], ['ja', '分野3'], ['en', 'Area 3']]) {
    assert.equal(areaTitle(doc, 2, l), want);
    const head = posterCells(doc, false, l).find((c) => c.kind === 'head' && c.ti === 2);
    assert.equal(head.text, want);
    assert.equal(head.unnamed, true);
  }
});

test('서수 — ko 고유어 · ja 3番目 · en third', () => {
  const doc = { themes: [{ title: '건강' }, { title: '' }, { title: '재정' }] };
  assert.equal(pageSpeech(doc, 0, 'ko'), '건강, 8개 영역 중 첫 번째');
  assert.equal(pageSpeech(doc, 1, 'ko'), '영역 2, 8개 영역 중 두 번째');
  assert.equal(pageSpeech(doc, 2, 'ja'), '재정、8つの分野のうち3番目');
  assert.equal(pageSpeech(doc, 2, 'en'), '재정, third of 8 areas');
  assert.equal(pageSpeech(doc, 1, 'en'), 'Area 2, second of 8 areas');
  assert.equal(ja.areaOrdinalSay({ n: 3 }), '8つの分野のうち3番目');
  assert.equal(en.areaOrdinalSay({ n: 8 }), 'eighth of 8 areas');
});

test('영역 화면의 줄 — 상태 · 이름이 그 언어로', () => {
  const now = new Date(2026, 9, 14, 9);
  const doc = {
    themes: [{
      title: '健康', color: '#478058',
      actions: [
        { text: '水2L', note: '', done: true },
        { text: '感謝', note: '', done: false, kind: 'mind', ratings: { '2026-10-12': 4 } },
        { text: '', note: '', done: false },
      ],
    }],
    dayLog: {},
  };
  assert.equal(rowStatus(doc, 0, 0, now, 'ja'), '達成');
  assert.equal(rowStatus(doc, 0, 0, now, 'en'), 'Achieved');
  assert.equal(rowStatus(doc, 0, 1, now, 'ja'), '4点');
  assert.equal(rowStatus(doc, 0, 1, now, 'en'), '4/5');
  assert.equal(rowLabel(doc, 0, 2, now, 'ja'), '行動3を書く');
  assert.equal(rowLabel(doc, 0, 2, now, 'en'), 'Write action 3');
  assert.equal(rowLabelFor(doc.themes[0].actions[0], 0, null, 'ja'), '水2L、達成');
  assert.equal(rowLabelFor(doc.themes[0].actions[0], 0, null, 'en'), '水2L, Achieved');
  assert.equal(rowLabelFor(doc.themes[0].actions[0], 0, null, 'ko'), '水2L, 달성');
});

test('표 이미지 날짜 — ko 2026. 10. 13. · ja 2026年10月13日 · en Oct 13, 2026', () => {
  const d = new Date(2026, 9, 13);
  assert.equal(posterDate(d), '2026. 10. 13.');
  assert.equal(posterDate(d, 'ja'), '2026年10月13日');
  assert.equal(posterDate(d, 'en'), 'Oct 13, 2026');
});

test('ja · en — 낱말장대로(マス · 分野 · 中心の目標 / square · area · core goal), 셈 낱말은 그 언어의 꼴', () => {
  assert.equal(ja.coreGoal, '中心の目標');
  assert.equal(en.coreGoal, 'Core goal');
  assert.equal(ja.doneOf64Say({ done: 12 }), '64マス中12マス達成');
  assert.equal(en.doneOf64Say({ done: 12 }), '12 of 64 squares achieved');
  assert.equal(ja.markTodaySay({ total: 12, done: 3 }), '、今日やること12個のうち3つできました');
  assert.equal(en.areaDoneSay({ done: 1, days: 1 }), '1 of 8 squares achieved, 1-day streak');
  assert.equal(ja.sep, '、');
});
