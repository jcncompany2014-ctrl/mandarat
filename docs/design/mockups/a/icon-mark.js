/* 방향 A · the app-icon drawing of the L0 mark. Only icon.html (and _icon-study.html) use it.
   Needs shared.js loaded first (for nothing but the dye variables in tokens.css).

   AI.printed(target, opts) — the heart of the sheet (the core in ink, the eight areas round it in their
   dyes) drawn as a printed 3×3 form: a print-ink frame, pale printed cell rules, and each fill inset
   from the rules so a line of paper runs round every cell, exactly as on the L2 sheet.
     opts.size   outer size in pt (the square; iOS crops the corners, so the paper fills it).
     opts.pad    paper margin as a fraction of size (default 0.2).
     opts.rules  false = no frame and no cell rules (default true).
   Proportions are fractions of the 3×3, so the same drawing works from 512 down to 29. */
(function (global) {
  'use strict';
  const AI = {};
  AI.printed = function (target, opts) {
    opts = opts || {};
    const S = opts.size || 512;
    const pad = S * (opts.pad !== undefined ? opts.pad : 0.2);
    const g = S - 2 * pad;                 // the 3×3
    const frame = g * 0.03;                // print-ink frame
    const rule = g * 0.012;                // pale cell rules
    const inset = g * 0.028;               // paper between a fill and the rules
    const inner = g - 2 * frame;
    const cell = (inner - 2 * rule) / 3;
    const rulesOn = opts.rules !== false;
    let out = '';
    const at = (i) => pad + frame + i * (cell + rule);
    for (let i = 0; i < 9; i++) {
      const a = i < 4 ? i : i - 1;
      const x = at(i % 3) + inset, y = at(Math.floor(i / 3)) + inset, w = cell - 2 * inset;
      out += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${w.toFixed(2)}" style="fill:${i === 4 ? 'var(--core)' : `var(--dye-${a + 1})`}"/>`;
    }
    if (rulesOn) {
      let r = '';
      [1, 2].forEach((k) => {
        const p = pad + frame + k * cell + (k - 1) * rule;
        r += `<rect x="${p.toFixed(2)}" y="${pad}" width="${rule.toFixed(2)}" height="${g}"/><rect x="${pad}" y="${p.toFixed(2)}" width="${g}" height="${rule.toFixed(2)}"/>`;
      });
      out = `<g style="fill:var(--rule-cell)">${r}</g>${out}<rect x="${(pad + frame / 2).toFixed(2)}" y="${(pad + frame / 2).toFixed(2)}" width="${(g - frame).toFixed(2)}" height="${(g - frame).toFixed(2)}" fill="none" style="stroke:var(--rule-frame)" stroke-width="${frame.toFixed(2)}"/>`;
    }
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.style.width = S + 'px';
    host.style.height = S + 'px';
    host.innerHTML = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="display:block" aria-hidden="true"><rect width="${S}" height="${S}" style="fill:var(--paper)"/>${out}</svg>`;
    return { el: host, size: S };
  };
  /* AI.crop(target, opts) — the icon as a crop of the printed sheet itself: a 5×5 window centred on the
     core. The heart (ink core + eight dye cells) sits inside the block rule, exactly as on the L2 sheet;
     pale cell rules run on to the edges of the square, so the paper and its print fill the whole icon
     and the corner mask cuts the form, not the drawing.
     opts.size   outer size (default 512).
     opts.n      cells across the window (default 5; the heart is always the middle 3).
     opts.hair / opts.block / opts.inset  as fractions of one cell (defaults 0.02 / 0.045 / 0.05). */
  AI.crop = function (target, opts) {
    opts = opts || {};
    const S = opts.size || 512;
    const n = opts.n || 5;
    const c = S / n;
    const hair = c * (opts.hair || 0.02), block = c * (opts.block || 0.045), inset = c * (opts.inset !== undefined ? opts.inset : 0.05);
    const lo = (n - 3) / 2;               // first cell of the heart
    let rules = '', heavy = '', fills = '';
    for (let k = 1; k < n; k++) {
      const p = k * c;
      if (k === lo || k === lo + 3) {
        // the block rule only frames the centre block; outside it the line continues as a hair
        const a = lo * c - block / 2, len = 3 * c + block;
        heavy += `<rect x="${(p - block / 2).toFixed(2)}" y="${a.toFixed(2)}" width="${block.toFixed(2)}" height="${len.toFixed(2)}"/><rect x="${a.toFixed(2)}" y="${(p - block / 2).toFixed(2)}" width="${len.toFixed(2)}" height="${block.toFixed(2)}"/>`;
      }
      rules += `<rect x="${(p - hair / 2).toFixed(2)}" y="0" width="${hair.toFixed(2)}" height="${S}"/><rect x="0" y="${(p - hair / 2).toFixed(2)}" width="${S}" height="${hair.toFixed(2)}"/>`;
    }
    for (let i = 0; i < 9; i++) {
      const a = i < 4 ? i : i - 1;
      const col = lo + (i % 3), row = lo + Math.floor(i / 3);
      // every fill the same size, centred in its cell, so the gaps read even whatever the rule beside them
      const w = c - block - 2 * inset, h = w;
      const x = col * c + (c - w) / 2, y = row * c + (c - h) / 2;
      fills += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" style="fill:${i === 4 ? 'var(--core)' : `var(--dye-${a + 1})`}"/>`;
      if (i === 4) fills += `<rect x="${(x + hair / 2).toFixed(2)}" y="${(y + hair / 2).toFixed(2)}" width="${(w - hair).toFixed(2)}" height="${(h - hair).toFixed(2)}" fill="none" style="stroke:var(--core-edge)" stroke-width="${hair.toFixed(2)}"/>`;
    }
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.style.width = S + 'px';
    host.style.height = S + 'px';
    host.innerHTML = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="display:block" aria-hidden="true"><rect width="${S}" height="${S}" style="fill:var(--paper)"/><g style="fill:var(--rule-cell)">${rules}</g><g style="fill:var(--rule-block)">${heavy}</g>${fills}</svg>`;
    return { el: host, size: S };
  };
  global.AI = AI;
})(window);
