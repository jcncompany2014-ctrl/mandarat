/* 방향 A · parts that settings.html needs and the kit (shared.js) does not have yet.
   Each one is listed in the round-2 report as a kit request. They are built from tokens.css and from
   the shared.js calls (A.check, A.icon, A.row's classes); nothing here sets a colour of its own except
   the night swatch, which needs the dark stock's values while the page itself is light (see S.swatch).

     S.check(on)      the check box as a switch: printed box, the owner's tick when on.
     S.toggleRow(o)   an on/off setting: leading check box (CI-02 "check = independent yes/no"),
                      title, meta, one written value on the right (a time, in a soft tinted field
                      because it opens a picker). Unlike A.row, a ticked setting is not struck
                      through: it is switched on, not finished.
     S.linkRow(o)     a row that opens something: leading printed glyph in the check-box column,
                      title, meta, trailing chevron in ink (CI-10: one chevron, 16pt, never grey).
     S.choiceRow(o)   one of many (CI-02): no box. The chosen row has a heavier title and a trailing
                      pen tick in writing ink; the others show nothing on the right.
     S.swatch(o)      an appearance option drawn as a tiny page of the notebook in that stock.
     S.glyph(name)    printed glyphs for the backup rows: 'export', 'import', 'copies'.
     S.tick(size)     the pen tick alone (the same stroke as the tick in the check box). */
(function (global) {
  'use strict';
  const S = {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // the pen tick, the same shape as A.check's (written, round caps, a slight curve)
  S.tick = function (size) {
    const s = size || 18;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none;overflow:visible" aria-hidden="true"><path d="M3.5 12.6C6.2 14.5 8 16.7 9.3 19.4 12.6 12.6 16.6 6.6 21.5 2.2" fill="none" style="stroke:var(--tick)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };

  S.glyph = function (name) {
    const P = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
    const body = {
      // a page leaving its tray (내보내기)
      export: `<path d="M8.5 9.75H5.75v10.5h12.5V9.75H15.5" ${P}/><path d="M12 14.5V3.75M8.25 7.25 12 3.5l3.75 3.75" ${P}/>`,
      // a page coming into its tray (불러오기)
      import: `<path d="M8.5 9.75H5.75v10.5h12.5V9.75H15.5" ${P}/><path d="M12 3.5v10.75M8.25 10.5 12 14.25l3.75-3.75" ${P}/>`,
      // two sheets stacked (저장본: one copy a day)
      copies: `<rect x="4.75" y="8.25" width="11" height="11" rx="2.5" ${P}/><path d="M8.25 4.75h8.5a2.5 2.5 0 0 1 2.5 2.5v8.5" ${P}/>`,
    }[name] || '';
    return `<svg width="24" height="24" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>`;
  };

  /* S.check(on) — the check box as a switch. The box is printed and stays print ink (3.3:1 edge,
     paper inside); "on" is the owner's pen tick over it, overshooting the top-right corner exactly as
     in A.check (same 6pt corners). No wash and no ink edge: those mean "done" on a task, and a setting
     is not done. */
  S.check = function (on) {
    const box = `<rect x=".75" y=".75" width="22.5" height="22.5" rx="6" fill="none" style="stroke:var(--print-edge)" stroke-width="1.5"/>`;
    const tick = on ? `<path d="M5.600 12.400C8 14.200 9.600 16.200 10.800 18.600 14.600 11 19.800 3.600 27.200-3" fill="none" style="stroke:var(--tick)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return `<svg class="a-check" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">${box}${tick}</svg>`;
  };

  S.toggleRow = function (o) {
    const right = o.right ? `<div class="a-row-right s-time">${esc(o.right)}</div>` : '';
    return `<div class="a-row s-row${o.on ? ' is-on' : ''}">${S.check(!!o.on)}<div class="a-row-main"><div class="a-row-title">${esc(o.title)}</div>${o.meta ? `<div class="a-row-meta">${esc(o.meta)}</div>` : ''}</div>${right}</div>`;
  };

  S.linkRow = function (o) {
    return `<div class="a-row s-row"><span class="s-slot">${o.glyph ? S.glyph(o.glyph) : ''}</span><div class="a-row-main"><div class="a-row-title">${esc(o.title)}</div>${o.meta ? `<div class="a-row-meta">${esc(o.meta)}</div>` : ''}</div>${o.value ? `<div class="a-row-right">${esc(o.value)}</div>` : ''}<span class="s-chev">${A.icon('chevron', { size: 16 })}</span></div>`;
  };

  S.choiceRow = function (o) {
    return `<div class="a-row s-row s-choice${o.on ? ' is-on' : ''}"><div class="a-row-main"><div class="a-row-title">${esc(o.title)}</div>${o.meta ? `<div class="a-row-meta">${esc(o.meta)}</div>` : ''}</div>${o.on ? `<span class="s-tick">${S.tick(18)}</span>` : ''}</div>`;
  };

  /* S.swatch({ mode: 'auto' | 'day' | 'night', label, on })
     A tiny page: the stock, the goal's first syllable in writing ink (MaruBuri) and two soft printed
     lines of text, round-ended. 'auto' is the day page and the night page side by side. The chosen
     swatch gets the ink selection ring (selection is always ink) and a heavier label. */
  S.swatch = function (o) {
    const page = (night) => `<div class="s-page${night ? ' is-night' : ''}"><b class="s-page-word">가</b><i class="s-page-line"></i><i class="s-page-line is-short"></i></div>`;
    const body = o.mode === 'auto' ? `<div class="s-split">${page(false)}${page(true)}</div>` : page(o.mode === 'night');
    return `<div class="s-swatch${o.on ? ' is-on' : ''}"><div class="s-swatch-frame">${body}</div><div class="s-swatch-label">${esc(o.label)}</div></div>`;
  };

  global.S = S;
})(window);
