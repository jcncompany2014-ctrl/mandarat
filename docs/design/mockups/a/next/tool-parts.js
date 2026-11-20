/* ───────────────────────────────────────────────────────────────────────────
   시안 · 작은 도구 묶음 (tool-*) — small parts the tool-* screens share. Built only from tokens.css
   variables and the A.* / S.* / AP.* calls, in their style. Load after shared.js and parts-sheets.js.

     T.behindBlock(doc, area, opts)   the zoomed block page behind a sheet (as block.html draws it)
     T.minus(size)                    the minus glyph (A.icon has plus only)
     T.countSheet(doc, area, index, c, opts)  the 쌓기 action sheet as the app draws it today
     T.tenWeeks(counts, target, area) the last ten weeks as bars against the weekly target
     T.memoGlyph()                    three written lines, for a memo row
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const T = {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const q = (s) => document.querySelector(s);

  /* T.behindBlock(doc, area, { focus, weekOf })
     The area's page as block.html draws it: header (‹ 만다라트 · name · n/8 · ···), the 3×3 with the
     habit state printed in its cells, the floating bar. Needs #header, #block and #bar in the page.
     focus = index 0..8 inside the block (row-major) of the cell the sheet belongs to. */
  T.behindBlock = function (doc, area, opts) {
    opts = opts || {};
    const a = doc.areas[area];
    A.header('#header', { back: '만다라트', title: a.title, written: true, figure: `${a.done}/${a.of}`, action: 'more' });
    const weekOf = opts.weekOf || {};
    const state = (cell) => {
      if (cell.kind !== 'action' || cell.done || cell.actKind !== 'habit') return '';
      const s = weekOf[cell.text];
      const planned = cell.act.perWeek || (s ? [...s].filter((c) => c !== '·').length : (cell.act.days || []).length);
      const done = s ? [...s].filter((c) => c === 'v' || c === 'V').length : 0;
      return `<div class="t-meta cell-state">이번 주 ${done}/${planned}</div>`;
    };
    A.block('#block', doc, area, { cell: 112, focus: opts.focus, extra: opts.extra || state });
    if (q('#bar')) A.tabBar('#bar', { active: 'chart' });
  };

  T.minus = (size) => `<svg width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true"><path d="M5.5 12h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  T.memoGlyph = () => `<svg width="24" height="24" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  /* T.tenWeeks([1, 2, 3, 0, …, thisWeek], target, area, { h })
     Ten weeks, oldest first, the last one this week. Each week is a 16pt --tile track as tall as the
     plot (the track's top is the weekly target: "against the target" without a rule across the sheet),
     filled from the bottom by count / target. A week that reached the target is filled whole in the
     area's wash (the colour of a done cell); a week short of it in the neutral bar grey; this week in
     ink (as today is on the week strip). A week with none is the empty track. */
  T.tenWeeks = function (counts, target, area, opts) {
    opts = opts || {};
    const h = opts.h || 30;
    const last = counts.length - 1;
    const cols = counts.map((n, i) => {
      const now = i === last;
      const met = n >= target;
      const fill = n ? `<i class="w10-fill${now ? ' is-now' : met ? ' is-met' : ''}" style="height:${met ? h : Math.max(6, Math.round((n / target) * h))}px"></i>` : '';
      return `<div class="w10-col"><div class="w10-track${now ? ' is-now' : ''}">${fill}</div></div>`;
    }).join('');
    return `<div class="w10" style="--h:${h}px;--d:var(--wash-${area + 1})">${cols}</div>`;
  };

  global.T = T;
})(window);
