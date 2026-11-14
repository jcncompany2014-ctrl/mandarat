/* ───────────────────────────────────────────────────────────────────────────
   방향 A · parts the kit lacks, drawn for focus.html and dayclose.html. KIT REQUEST: move into shared.js.
   Needs shared.js loaded first (uses nothing from it but the same colour tokens and the same
   soft-tile drawing as A.chart / A.block).

     A.minutes(target, opts)   the 25-minute form: 5×5 soft tiles, one per minute
     A.glyph(name)             two glyphs A.icon lacks: 'down' (minimise), 'pause'
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const dpr = () => global.devicePixelRatio || 2;

  /* A.minutes(target, opts) → { el, size, cellSize }
     One tile per minute, read like text (left to right, top to bottom). The same drawing as the
     colour map: no frame and no rules, tiles on paper with a small gap and round corners. An
     empty minute is the map's empty tile (--tile), a finished one the area's wash (done, as on the
     map), and the "now" tile carries the vermilion dot (the signal's job is today and now).
     opts.cell     tile size in pt (default 64: 5 × 64 + 4 gaps of 5.5 = 342pt, the content measure).
     opts.gap      gap between tiles in pt (default 5.5).
     opts.area     area index 0..7: the focused action's area. Its wash fills a finished minute.
     opts.done     whole minutes finished (0..25).
     opts.frac     how far the current minute has run, 0..1. The current tile fills from the bottom,
                   clipped to the tile's round corners (in the app: one native scaleY over 60 s).
     opts.marks    true = print the minute count (5, 10, 15, 20, 25) as a ruler 8pt to the
                   right of the tiles (outside the returned size). Default false: the clock under
                   the grid already says the time, and a printed ruler is furniture. */
  A.minutes = function (target, opts) {
    opts = opts || {};
    const d = dpr();
    const cellPt = opts.cell || 64;
    const c = Math.round(cellPt * d);
    const gap = Math.round((opts.gap === undefined ? 5.5 : opts.gap) * d);
    const rx = 8 * d;
    const xs = [];
    for (let i = 0; i < 5; i++) xs.push(i * (c + gap));
    const total = 5 * c + 4 * gap;
    const area = opts.area >= 0 ? opts.area : 1;
    // finished minutes take the area's wash, the map's "done": pale on white, never a solid dye block
    const wash = `var(--wash-${area + 1})`;

    let defs = '', fills = '', marks = '';
    const done = opts.done || 0;
    const frac = Math.max(0, Math.min(1, opts.frac || 0));
    for (let m = 0; m < 25; m++) {
      const bx = xs[m % 5], by = xs[Math.floor(m / 5)];
      if (m < done) {
        fills += `<rect x="${bx}" y="${by}" width="${c}" height="${c}" rx="${rx}" style="fill:${wash}"/>`;
        continue;
      }
      fills += `<rect x="${bx}" y="${by}" width="${c}" height="${c}" rx="${rx}" style="fill:var(--tile)"/>`;
      if (m === done && done < 25) {
        const h = Math.round(c * frac);
        if (h > 0) {
          defs += `<clipPath id="a-min-now"><rect x="${bx}" y="${by}" width="${c}" height="${c}" rx="${rx}"/></clipPath>`;
          fills += `<rect x="${bx}" y="${by + c - h}" width="${c}" height="${h}" clip-path="url(#a-min-now)" style="fill:${wash}"/>`;
        }
        // now: the 6pt vermilion dot, top-left, as on a today cell of the zoomed block
        marks += `<circle cx="${bx + 12 * d}" cy="${by + 12 * d}" r="${3 * d}" style="fill:var(--signal)"/>`;
      }
    }

    const size = total / d;
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.classList.add('a-chart');
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    let html = `<svg width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" aria-hidden="true"><defs>${defs}</defs>${fills}<g>${marks}</g></svg>`;
    // the ruler is printed outside the tiles, on paper, so it keeps its contrast against any fill
    if (opts.marks) {
      for (let r = 0; r < 5; r++) {
        html += `<span class="t-label" style="position:absolute;left:${size + 8}px;width:24px;top:${(xs[r] + c) / d - 16}px;text-align:left;line-height:12px">${(r + 1) * 5}</span>`;
      }
    }
    host.innerHTML = html;
    return { el: host, size, cellSize: c / d };
  };

  /* A.glyph(name) → SVG string in A.icon's grammar (24 box, 1.5 stroke, round caps and joins). */
  A.glyph = function (name, size) {
    const s = size || 24;
    const P = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
    const body = {
      down: `<path d="M5.5 9 12 15.5 18.5 9" ${P}/>`,
      pause: `<rect x="7" y="5.5" width="3" height="13" rx="1.2" fill="currentColor"/><rect x="14" y="5.5" width="3" height="13" rx="1.2" fill="currentColor"/>`,
    }[name] || '';
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>`;
  };
})(window);
