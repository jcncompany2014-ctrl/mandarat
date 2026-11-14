/* ───────────────────────────────────────────────────────────────────────────
   방향 A · parts the kit lacks, drawn for focus.html and dayclose.html. KIT REQUEST: move into shared.js.
   Needs shared.js loaded first (uses nothing from it but the same colour tokens and the same
   whole-device-pixel rule geometry as A.chart / A.block).

     A.minutes(target, opts)   the 25-minute form: a 5×5 printed lattice, one box per minute
     A.glyph(name)             two glyphs A.icon lacks: 'down' (minimise), 'pause'
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const dpr = () => global.devicePixelRatio || 2;

  /* A.minutes(target, opts) → { el, size, cellSize }
     One box per minute, read like text (left to right, top to bottom). It is the same drawing as the
     chart: frame 1.5pt in --rule-frame, hairlines in --rule-cell, fills inset 1pt so the lattice is
     unbroken, the "now" box gets the vermilion corner (the signal's job is today and now).
     opts.cell     box size in pt (default 59: 5 × 59 + 4 hairlines + 2 frames = 300pt).
     opts.area     area index 0..7: the focused action's area. Its wash fills a finished minute.
     opts.done     whole minutes finished (0..25).
     opts.frac     how far the current minute has run, 0..1. The current box fills from the bottom;
                   the level is a 1pt line of the area's dye (in the app: one native scaleY over 60 s).
     opts.marks    true = print the minute count (5, 10, 15, 20, 25) as a ruler in a 36pt column to the
                   right of the frame (outside the returned size), bottom-aligned with each row. Default true. */
  A.minutes = function (target, opts) {
    opts = opts || {};
    const d = dpr();
    const px = (pt) => Math.max(1, Math.round(pt * d));
    const cellPt = opts.cell || 59;
    const c = Math.round(cellPt * d);
    const w = { frame: px(1.5), hair: px(0.5), inset: px(1) };
    const xs = [];
    let x = w.frame;
    for (let i = 0; i < 5; i++) { xs.push(x); x += c; if (i < 4) x += w.hair; }
    const total = x + w.frame;
    const area = opts.area >= 0 ? opts.area : 1;
    // finished minutes take the stronger wash (--wash-l1): 25 boxes of 34% read as grey at this size
    const wash = `var(--wash-l1-${area + 1})`, dye = `var(--dye-${area + 1})`;

    let rules = '', fills = '', marks = '';
    for (let i = 0; i < 4; i++) {
      const p = xs[i] + c;
      rules += `<rect x="${p}" y="${w.frame}" width="${w.hair}" height="${total - 2 * w.frame}"/><rect x="${w.frame}" y="${p}" width="${total - 2 * w.frame}" height="${w.hair}"/>`;
    }
    const f = w.frame;
    const frame = `<rect x="0" y="0" width="${total}" height="${f}"/><rect x="0" y="${total - f}" width="${total}" height="${f}"/><rect x="0" y="0" width="${f}" height="${total}"/><rect x="${total - f}" y="0" width="${f}" height="${total}"/>`;

    const done = opts.done || 0;
    const frac = Math.max(0, Math.min(1, opts.frac || 0));
    for (let m = 0; m < 25; m++) {
      const bx = xs[m % 5], by = xs[Math.floor(m / 5)];
      const fx = bx + w.inset, fy = by + w.inset, fs = c - 2 * w.inset;
      if (m < done) {
        fills += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:${wash}"/>`;
      } else if (m === done && done < 25) {
        const h = Math.round(fs * frac);
        if (h > 0) {
          fills += `<rect x="${fx}" y="${fy + fs - h}" width="${fs}" height="${h}" style="fill:${wash}"/>`;
          fills += `<rect x="${fx}" y="${fy + fs - h}" width="${fs}" height="${px(1)}" style="fill:${dye}"/>`;
        }
        const leg = Math.round(11 * d);
        marks += `<path d="M${bx} ${by}h${leg}l${-leg} ${leg}z" style="fill:var(--signal)"/>`;
      }
    }

    const size = total / d;
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.classList.add('a-chart');
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    let html = `<svg width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" aria-hidden="true"><g style="fill:var(--rule-cell)">${rules}</g>${fills}<g style="fill:var(--rule-frame)">${frame}</g><g shape-rendering="geometricPrecision">${marks}</g></svg>`;
    // the ruler is printed outside the frame, on paper, so it keeps its 5.3:1 against any fill
    if (opts.marks !== false) {
      for (let r = 0; r < 5; r++) {
        html += `<span class="t-label" style="position:absolute;left:${size + 6}px;width:36px;top:${(xs[r] + c) / d - 16}px;text-align:right;line-height:12px">${(r + 1) * 5}</span>`;
      }
    }
    host.innerHTML = html;
    return { el: host, size, cellSize: c / d };
  };

  /* A.glyph(name) → SVG string in A.icon's grammar (24 box, 1.5 stroke, square joins). */
  A.glyph = function (name, size) {
    const s = size || 24;
    const P = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="butt"';
    const body = {
      down: `<path d="M5.5 9 12 15.5 18.5 9" ${P}/>`,
      pause: `<rect x="7" y="5.5" width="3" height="13" fill="currentColor"/><rect x="14" y="5.5" width="3" height="13" fill="currentColor"/>`,
    }[name] || '';
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>`;
  };
})(window);
