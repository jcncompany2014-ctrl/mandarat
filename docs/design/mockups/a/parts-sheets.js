/* ───────────────────────────────────────────────────────────────────────────
   방향 A · parts for the two inset sheets (editor.html, sheet.html). Round 2, builder's own file.
   Every part here is a KIT REQUEST: built only from tokens.css variables and shared.js calls, so it
   can move into shared.js / tokens.css as it stands. Load after shared.js.

     S.locator(doc, area, index, opts)  the block as a tiny 3×3: where this cell sits
     S.head(doc, area, index)           sheet header: locator + printed "건강 · 실천 3/8" + close (44pt, no circle)
     S.segment(options, selected)       2–5 exclusive options. Ink fill = chosen.
     S.days(days)                       weekday letters over seven boxes (chosen / done / open / later / none)
     S.choice(r)                        choice row: one of many, trailing pen tick on the chosen row
     S.linkRow(r)                       a row that opens something: leading glyph, title, chevron
     S.memo(n, placeholder)             ruled memo lines
     S.icon(name)                       two glyphs the kit lacks: 'focus' (the 5×5 minute grid), 'bell'

   The three selection controls, one job each (CI-02):
     check box  independent yes/no. Two filled states, never confused:
                chosen = paper box, ink edge, small ink tick inside the box ("yes, this one");
                done   = A.check({ done }) wash + dye edge + pen tick that overshoots ("I did it").
     choice row one of many, as a list. Chosen = Medium title + trailing ink pen tick. No box.
     segment    one of 2–5, inline. Chosen = ink fill, paper text.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const S = {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dpr = () => global.devicePixelRatio || 2;

  /* S.locator(doc, area, index, opts) → SVG string.
     The area's block as a 3×3 at mark size (default 36pt): head = solid dye, done = wash, this cell =
     ink frame (selection is ink). Printed frame 1pt in --print, hairlines between cells. */
  S.locator = function (doc, area, index, opts) {
    opts = opts || {};
    const d = dpr();
    const size = opts.size || 36;
    const px = (pt) => Math.max(1, Math.round(pt * d));
    const f = px(1), h = px(0.5), ins = px(1);
    const total = Math.round(size * d);
    const c = (total - 2 * f - 2 * h) / 3;
    const xs = [f, f + c + h, f + 2 * (c + h)].map(Math.round);
    const cw = Math.round(c);
    const a = doc.areas[area];
    let out = '';
    for (let i = 0; i < 9; i++) {
      const x = xs[i % 3], y = xs[Math.floor(i / 3)];
      const k = i < 4 ? i : i - 1;
      const fx = x + ins, fy = y + ins, fs = cw - 2 * ins;
      if (i === 4) out += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:var(--dye-${area + 1})"/>`;
      else if (a.actions[k] && a.actions[k].done) out += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:var(--wash-l1-${area + 1})"/>`;
      if (i !== 4 && k === index) {
        const t = px(1.5);
        out += `<rect x="${fx + t / 2}" y="${fy + t / 2}" width="${fs - t}" height="${fs - t}" fill="none" style="stroke:var(--ink)" stroke-width="${t}"/>`;
      }
    }
    let rules = '';
    [1, 2].forEach((j) => {
      const p = xs[j] - h;
      rules += `<rect x="${p}" y="${f}" width="${h}" height="${total - 2 * f}"/><rect x="${f}" y="${p}" width="${total - 2 * f}" height="${h}"/>`;
    });
    const frame = `<rect x="0" y="0" width="${total}" height="${f}"/><rect x="0" y="${total - f}" width="${total}" height="${f}"/><rect x="0" y="0" width="${f}" height="${total}"/><rect x="${total - f}" y="0" width="${f}" height="${total}"/>`;
    return `<svg width="${total / d}" height="${total / d}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" style="display:block;flex:none" aria-hidden="true"><g style="fill:var(--rule-cell)">${rules}</g><g style="fill:var(--print)">${frame}</g>${out}</svg>`;
  };

  /* S.head(doc, area, index) → HTML. The sheet's one header line: where (locator + printed words),
     and one action, close. The × is an ink glyph in a 44pt target, no circle (CI-13). */
  S.head = function (doc, area, index) {
    const a = doc.areas[area];
    return `<div class="s-head">${S.locator(doc, area, index)}<div class="s-head-where"><span class="t-label"><i class="a-dye" style="--d:var(--dye-${area + 1})"></i>${esc(a.title)}</span><span class="t-label">실천 ${index + 1}/8</span></div><div class="s-head-close">${A.icon('close')}</div></div>`;
  };

  /* S.segment(['한 번', '습관', …], '습관') → HTML. One printed box divided into equal cells. */
  S.segment = function (options, selected) {
    return `<div class="s-seg" style="--n:${options.length}">${options.map((o) => `<span class="${o === selected ? 'is-on' : ''}">${esc(o)}</span>`).join('')}</div>`;
  };

  /* chosen: the printed box (same edge as an empty one) with an ink tick written inside it.
     Two inks: the box is the printer's, the tick is the owner's. Not a done mark: no wash, no overshoot. */
  S.chosenBox = function (size) {
    const s = size || 24;
    return `<svg class="a-check" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><rect x=".75" y=".75" width="22.5" height="22.5" rx="2" fill="none" style="stroke:var(--print-edge)" stroke-width="1.5"/><path d="M6.4 12.6C8 13.8 9.2 15.2 10.2 17 12.4 12.6 15 9.2 18 6.6" fill="none" style="stroke:var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };
  /* later: a day that has not come yet. The box is printed faint: you cannot tick tomorrow. */
  S.laterBox = function (size) {
    const s = size || 24;
    return `<svg class="a-check" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><rect x=".75" y=".75" width="22.5" height="22.5" rx="2" fill="none" style="stroke:var(--print-rule)" stroke-width="1.5"/></svg>`;
  };

  /* S.days([{ d: '월', s: 'chosen' | 'done' | 'open' | 'later' | 'none', today, area }]) → HTML.
     Seven printed cells, weekday letter over a 24pt box (the cell is the 44pt target).
     Sunday's letter is vermilion and today's cell carries the today corner, as in A.weekStrip. */
  S.days = function (days) {
    return `<div class="s-days">${days.map((x) => {
      const box = x.s === 'chosen' ? S.chosenBox() : x.s === 'done' ? A.check({ done: true, area: x.area }) : x.s === 'open' ? A.check() : x.s === 'later' ? S.laterBox() : '<span class="s-days-none"></span>';
      return `<div class="s-day${x.today ? ' is-today' : ''}${x.d === '일' ? ' is-sunday' : ''}"><span class="t-label">${esc(x.d)}</span>${box}</div>`;
    }).join('')}</div>`;
  };

  // the pen tick alone, for a chosen choice row (18pt, writing ink)
  const penTick = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true"><path d="M3.5 13C6 14.8 7.8 17 9.2 19.8 12.4 12.8 16.4 7.4 21.5 3.2" fill="none" style="stroke:var(--ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* S.choice({ title, meta, on }) → HTML. A 48pt ruled row; the chosen one is Medium with a pen tick. */
  S.choice = function (r) {
    return `<div class="a-row s-choice${r.on ? ' is-on' : ''}"><div class="a-row-main"><div class="a-row-title">${esc(r.title)}</div>${r.meta ? `<div class="a-row-meta">${esc(r.meta)}</div>` : ''}</div>${r.on ? penTick(18) : ''}</div>`;
  };

  /* S.linkRow({ icon, title, meta }) → HTML. Opens something: glyph in the check-box column, chevron right. */
  S.linkRow = function (r) {
    return `<div class="a-row s-link"><span class="s-link-glyph">${S.icon(r.icon) || A.icon(r.icon)}</span><div class="a-row-main"><div class="a-row-title">${esc(r.title)}</div>${r.meta ? `<div class="a-row-meta">${esc(r.meta)}</div>` : ''}</div>${A.icon('chevron', { size: 18 })}</div>`;
  };

  /* S.memo(n, placeholder) → HTML. n ruled lines, 30pt apart; the placeholder sits on the first, in print. */
  S.memo = function (n, placeholder) {
    let out = '';
    for (let i = 0; i < n; i++) out += `<div class="s-memo-line">${i === 0 && placeholder ? `<span class="t-note">${esc(placeholder)}</span>` : ''}</div>`;
    return `<div class="s-memo">${out}</div>`;
  };

  /* S.icon(name) → SVG string or ''. Same drawing rules as A.icon (24 box, 1.5 stroke, square joins). */
  S.icon = function (name) {
    const P = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter"';
    const body = {
      // the focus timer's own picture: its minute grid (drawn 4×4 so it reads at 24pt), filling row by row
      focus: (() => {
        let r = `<rect x="3.75" y="3.75" width="16.5" height="16.5" rx="1" ${P}/>`;
        r += `<path d="M7.875 4.5v15M12 4.5v15M16.125 4.5v15M4.5 7.875h15M4.5 12h15M4.5 16.125h15" ${P} stroke-width="1" stroke-linecap="butt"/>`;
        for (let i = 0; i < 3; i++) r += `<rect x="${3.75 + (i % 4) * 4.125}" y="${3.75 + Math.floor(i / 4) * 4.125}" width="4.125" height="4.125" fill="currentColor"/>`;
        return r;
      })(),
      bell: `<path d="M6.75 16.25V11a5.25 5.25 0 0 1 10.5 0v5.25l1.5 1.5H5.25z" ${P}/><path d="M10 20.25h4" ${P}/>`,
    }[name];
    return body ? `<svg width="24" height="24" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>` : '';
  };

  global.S = S;
})(window);
