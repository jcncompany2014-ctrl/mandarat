/* 방향 A · the app-icon drawing of the L0 mark. Only icon.html, widgets.html, store.html (and
   _icon-study.html) use it. Needs shared.js loaded first (for nothing but the dye variables in tokens.css).

   Clean round (owner: "어어 훨 낫다 좋다"): the icon is AI.app — the heart alone, the ink core and the
   eight dyes as soft tiles, centred on white with a wide margin. No ring of empty tiles, no crop, no
   frame, no rules. AI.printed and AI.crop are the earlier drawings, kept only for _icon-study.html.

   AI.app(target, opts) — the app icon.
     opts.size   outer size in pt (default 512). iOS masks the corners, so the white fills the square.
     opts.pad    white margin each side, as a fraction of size (default 0.215: the 3×3 is 57% of the
                 icon, inside the mask's safe area with air to spare).
     opts.gap    white between tiles, as a fraction of size (default 0.03; never under 1pt, so the
                 tiles stay apart at 29pt).
     opts.r      tile corner radius as a fraction of a tile (default 0.24: soft, the same family as the
                 iOS mask, rounder than the chart's 0.16 because there are only nine tiles).
   Proportions are fractions of the size, so the same drawing works from 1024 down to 29.

   AI.printed(target, opts) — the heart of the sheet (the core in ink, the eight areas round it in their
   dyes) as a 3×3 of soft tiles on paper.
     opts.size   outer size in pt (the square; iOS crops the corners, so the paper fills it).
     opts.pad    paper margin as a fraction of size (default 0.2).
     opts.rules  accepted for older calls and ignored (there are no rules any more).
   Proportions are fractions of the 3×3, so the same drawing works from 512 down to 29. */
(function (global) {
  'use strict';
  const AI = {};
  AI.app = function (target, opts) {
    opts = opts || {};
    const S = opts.size || 512;
    const pad = S * (opts.pad !== undefined ? opts.pad : 0.215);
    const g = S - 2 * pad;
    const gap = Math.max(1, S * (opts.gap !== undefined ? opts.gap : 0.03));
    const t = (g - 2 * gap) / 3;
    const rx = t * (opts.r !== undefined ? opts.r : 0.24);
    let out = '';
    for (let i = 0; i < 9; i++) {
      const a = i < 4 ? i : i - 1;
      const x = pad + (i % 3) * (t + gap), y = pad + Math.floor(i / 3) * (t + gap);
      out += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${t.toFixed(2)}" height="${t.toFixed(2)}" rx="${rx.toFixed(2)}" style="fill:${i === 4 ? 'var(--core)' : `var(--dye-${a + 1})`}"/>`;
    }
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.style.width = S + 'px';
    host.style.height = S + 'px';
    host.innerHTML = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="display:block" aria-hidden="true"><rect width="${S}" height="${S}" style="fill:var(--paper)"/>${out}</svg>`;
    return { el: host, size: S };
  };
  AI.printed = function (target, opts) {
    opts = opts || {};
    const S = opts.size || 512;
    const pad = S * (opts.pad !== undefined ? opts.pad : 0.2);
    const g = S - 2 * pad;                 // the 3×3
    const gap = g * 0.035;                 // paper between tiles
    const t = (g - 2 * gap) / 3;
    const rx = t * 0.12;
    let out = '';
    for (let i = 0; i < 9; i++) {
      const a = i < 4 ? i : i - 1;
      const x = pad + (i % 3) * (t + gap), y = pad + Math.floor(i / 3) * (t + gap);
      out += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${t.toFixed(2)}" height="${t.toFixed(2)}" rx="${rx.toFixed(2)}" style="fill:${i === 4 ? 'var(--core)' : `var(--dye-${a + 1})`}"/>`;
    }
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.style.width = S + 'px';
    host.style.height = S + 'px';
    host.innerHTML = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="display:block" aria-hidden="true"><rect width="${S}" height="${S}" style="fill:var(--paper)"/>${out}</svg>`;
    return { el: host, size: S };
  };
  /* AI.crop(target, opts) — the icon as a window on the softened sheet, centred on its heart: the ink
     core and the eight dye cells as soft tiles (small gap, gentle corners), and round them the first
     ring of the sheet's empty tiles in the tile tint, cut by the icon's edge, so the paper and the
     sheet run on past the square. No frame, no lines.
     opts.size   outer size (default 512).
     opts.n      cells across the window (default 5; the heart is always the middle 3).
     opts.gap       gap between the heart's tiles, as a fraction of one cell (default 0.06).
     opts.blockGap  gap between the heart and the ring, as a fraction of one cell (default 0.16).
     (opts.hair / block / inset, the rule weights of the ruled drawing, are accepted and ignored.)
     opts.ring   false = the heart alone on paper (default true).
     opts.show   how much of a ring tile shows inside the square, 0..1 (default 0.5). */
  AI.crop = function (target, opts) {
    opts = opts || {};
    const S = opts.size || 512;
    const n = opts.n || 5;
    const c = S / n;
    const gi = c * (opts.gap !== undefined ? opts.gap : 0.06);
    const gb = c * (opts.blockGap !== undefined ? opts.blockGap : 0.16);
    const show = opts.show !== undefined ? opts.show : 0.5;
    const ring = opts.ring !== false;
    // tile size: the ring tile shows `show` of its width inside the square (with a ring), or the heart
    // fills the middle three cells of the window (without one)
    const t = ring ? (S / 2 - gi - gb) / (1.5 + show) : (3 * c - 2 * gi) / 3;
    const rx = t * 0.12;
    const H = 3 * t + 2 * gi;
    const o = (S - H) / 2;                               // the heart's top-left
    const tileAt = (k) => (k < 0 ? o - gb - t : k > 2 ? o + H + gb : o + k * (t + gi));
    const rect = (x, y, fill) => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${t.toFixed(2)}" height="${t.toFixed(2)}" rx="${rx.toFixed(2)}" style="fill:${fill}"/>`;
    let tiles = '', fills = '';
    if (ring) {
      for (let row = -1; row <= 3; row++) for (let col = -1; col <= 3; col++) {
        if (row >= 0 && row <= 2 && col >= 0 && col <= 2) continue;
        // the ring is the neighbouring blocks' edge cells: a block gap runs between them only where a
        // block boundary does (at the heart's edges), so ring tiles beside each other keep the small gap
        tiles += rect(tileAt(col), tileAt(row), 'var(--tile)');
      }
    }
    for (let i = 0; i < 9; i++) {
      const a = i < 4 ? i : i - 1;
      const x = tileAt(i % 3), y = tileAt(Math.floor(i / 3));
      fills += rect(x, y, i === 4 ? 'var(--core)' : `var(--dye-${a + 1})`);
      if (i === 4) {
        const ce = Math.max(0.5, t / 40);
        fills += `<rect x="${(x + ce / 2).toFixed(2)}" y="${(y + ce / 2).toFixed(2)}" width="${(t - ce).toFixed(2)}" height="${(t - ce).toFixed(2)}" rx="${(rx - ce / 2).toFixed(2)}" fill="none" style="stroke:var(--core-edge)" stroke-width="${ce.toFixed(2)}"/>`;
      }
    }
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.style.width = S + 'px';
    host.style.height = S + 'px';
    // the ring is cut by the square on purpose (data-bleed tells the renderer's overflow check so)
    const clip = `ai-crop-${(AI._n = (AI._n || 0) + 1)}`;
    host.innerHTML = `<svg data-bleed width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="display:block" aria-hidden="true"><defs><clipPath id="${clip}"><rect width="${S}" height="${S}"/></clipPath></defs><rect width="${S}" height="${S}" style="fill:var(--paper)"/><g clip-path="url(#${clip})">${tiles}</g>${fills}</svg>`;
    return { el: host, size: S };
  };
  global.AI = AI;
})(window);
