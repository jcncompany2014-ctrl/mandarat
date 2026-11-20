/* ───────────────────────────────────────────────────────────────────────────
   시안 · 월 N회 습관 (month-*) — small parts the month-* screens share. Built only from tokens.css
   variables and the A.* / S.* calls, in their style. Load after shared.js and parts-sheets.js.

     MO.withMonthly(doc)              the demo document with one monthly habit: 관계 · 월 2회 독서 모임
     MO.behindBlock(doc, area, opts)  the zoomed block page behind a sheet (as block.html draws it)
     MO.glyph('minus' | 'plus')       16pt stepper glyphs
     MO.stepper(label)                the app's 횟수 stepper (− 월 2회 +)
     MO.weeks(list)                   the weeks of the month as boxes (S.days grammar, five columns)
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const MO = {};
  const q = (s) => document.querySelector(s);

  /* The monthly habit of every month-* screen. 관계's fourth cell (데이트 나이트 in the demo record)
     becomes '월 2회 독서 모임': a habit, twice a month, done once so far this month (10월 8일). */
  MO.AREA = 3;
  MO.INDEX = 3;
  MO.TEXT = '월 2회 독서 모임';
  MO.withMonthly = function (doc, opts) {
    const d = JSON.parse(JSON.stringify(doc));
    d.areas[MO.AREA].actions[MO.INDEX] = Object.assign({ text: MO.TEXT, done: false, kind: 'habit', perMonth: 2, monthDone: 1 }, opts || {});
    return d;
  };

  /* MO.behindBlock(doc, area, { focus, extra })  as tool-parts' T.behindBlock: block.html's page. */
  MO.behindBlock = function (doc, area, opts) {
    opts = opts || {};
    const a = doc.areas[area];
    A.header('#header', { back: '만다라트', title: a.title, written: true, figure: `${a.done}/${a.of}`, action: 'more' });
    const state = (cell) => {
      if (cell.kind !== 'action' || cell.done || cell.actKind !== 'habit') return '';
      if (cell.act.perMonth) return `<div class="t-meta cell-state">이번 달 ${cell.act.monthDone}/${cell.act.perMonth}</div>`;
      const planned = cell.act.perWeek || (cell.act.days || []).length;
      return `<div class="t-meta cell-state">이번 주 0/${planned}</div>`;
    };
    A.block('#block', doc, area, { cell: 112, focus: opts.focus, extra: opts.extra || state });
    if (q('#bar')) A.tabBar('#bar', { active: 'chart' });
  };

  MO.glyph = (name) => `<svg width="16" height="16" viewBox="0 0 24 24" style="display:block" aria-hidden="true"><path d="${name === 'plus' ? 'M12 5.5v13M5.5 12h13' : 'M5.5 12h13'}" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"/></svg>`;

  MO.stepper = (label) => `<div class="m-step"><i>${MO.glyph('minus')}</i><b>${label}</b><i>${MO.glyph('plus')}</i></div>`;

  /* MO.weeks([{ d: '1주', s: 'done' | 'open' | 'later', today, area }]) → HTML.
     The weeks of this month, drawn with S.days (a printed word over a 24pt soft box, no dividers):
     done = the area's wash and the pen tick, a week gone by or under way = the open box (it can still
     be ticked), a week to come = the tile. This week carries the 5pt vermilion dot, as today does. */
  MO.weeks = (list) => global.S.days(list);

  global.MO = MO;
})(window);
