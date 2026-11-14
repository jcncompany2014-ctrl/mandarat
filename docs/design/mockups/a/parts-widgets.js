/* ───────────────────────────────────────────────────────────────────────────
   방향 A · parts the kit lacks, for the system surfaces: widgets, the Lock Screen, the focus
   Live Activity and the Dynamic Island. Used by widgets.html and store.html.
   Needs tokens.css and shared.js (A.*) loaded first. Every colour is a token; the Lock Screen and
   the Dynamic Island redefine a few tokens on their own container (.lock and .island in
   parts-widgets.css), the same way dark mode does, so the kit functions draw in greys.

   KIT REQUESTS (each part below should move into shared.js / tokens.css):
     W.small()     small widget: the L1 sheet and 오늘 n/m
     W.medium()    medium widget: three rows with 20pt check boxes
     W.wRow()      the compact row (34pt) used in widgets
     W.lockRect()  Lock Screen rectangular: leading check box + next action
     W.lockTally() Lock Screen circular: the 正 of today's done count + n/m
     W.lockAdd()   Lock Screen circular: 담기
     W.minutes()   the 5×5 minute grid (one cell per minute of a 25-minute focus)
     W.live()      the focus Live Activity on the Lock Screen
     W.island()    the Dynamic Island, compact presentation of the same activity
     W.icon(...)   'pause' glyph (24 box, 1.5 stroke) — missing from A.icon
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const W = {};
  const el = (t) => (typeof t === 'string' ? document.querySelector(t) : t);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dpr = () => global.devicePixelRatio || 2;

  /* W.icon('pause') — the glyph A.icon lacks. Two printed bars on the 24 box. */
  W.icon = function (name, opts) {
    const s = (opts && opts.size) || 24;
    const body = { pause: '<rect x="7" y="5.5" width="3.5" height="13" fill="currentColor"/><rect x="13.5" y="5.5" width="3.5" height="13" fill="currentColor"/>' }[name] || '';
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>`;
  };

  /* the head line every widget shares: a printed label with the today corner, the written figure right */
  const head = (label, figure) =>
    `<div class="w-head"><span class="t-label"><i class="a-today"></i>${esc(label)}</span><span class="w-fig">${esc(figure)}</span></div>`;

  /* W.small(target, doc) — 158 × 158. The sheet in miniature (A.chart L1, cell 10 = 94pt) under one
     head line: ◤ 오늘 … 1/10. The column is the sheet's width, so label, figure and frame share
     two edges. Under 100pt the sheet drops cell rules and today corners (A's L1 rule); the corner
     beside 오늘 carries today. */
  W.small = function (target, doc) {
    const t = doc.view.today;
    const host = el(target);
    host.classList.add('w', 'w-small');
    host.innerHTML = `<div class="w-col">${head('오늘', `${t.done}/${t.of}`)}<div class="w-sheet"></div></div>`;
    A.chart(host.querySelector('.w-sheet'), doc, { level: 'L1', cell: 10 });
    return host;
  };

  /* W.wRow(doc, r) — a row at widget size: 32pt, 20pt check box, 15pt title, one thing on the right.
     r = { text, area, right, rightPrint, done } as in A.row. Without right/rightPrint the right side is
     the area (dye mark + name), so the area still has a word beside its colour. */
  W.wRow = function (doc, r) {
    const a = r.area ? A.areaIndex(doc, r.area) : -1;
    const right = r.right ? `<span class="w-row-right">${esc(r.right)}</span>`
      : r.rightPrint ? `<span class="w-row-right is-print">${esc(r.rightPrint)}</span>`
      : r.area ? `<span class="w-row-area"><i class="a-dye" style="--d:var(--dye-${a + 1})"></i>${esc(r.area)}</span>` : '';
    return `<div class="w-row${r.done ? ' is-done' : ''}">${A.check({ done: !!r.done, area: a, size: 20 })}<span class="w-row-title">${esc(r.text)}</span>${right}</div>`;
  };

  /* W.medium(target, doc, rows) — 338 × 158. Head line, the list's 1pt top rule, three rows.
     rows = array of W.wRow inputs. Not the small widget scaled up: this one is for ticking. */
  W.medium = function (target, doc, rows) {
    const t = doc.view.today;
    const host = el(target);
    host.classList.add('w', 'w-medium');
    host.innerHTML = `${head('오늘 할 일', `${t.done}/${t.of}`)}<div class="w-list">${rows.map((r) => W.wRow(doc, r)).join('')}</div>`;
    return host;
  };

  /* Lock Screen (vibrant rendering). The system draws these in opaque greys of one hue-less ramp;
     the container .lock sets --ink / --ink-2 / --print / --print-rule / --print-edge to those greys,
     so A.check and A.tally draw themselves in grey. Meaning never rests on colour: today is the
     corner shape, done is the tick. */

  /* W.lockRect(target, doc) — 156 × 72. Leading check box (tap = done), the next action, its fact. */
  W.lockRect = function (target, doc) {
    const t = doc.view.today, n = doc.view.nextStep;
    const row = t.rows.find((r) => r.text === n.text) || {};
    const host = el(target);
    host.classList.add('lock-rect');
    host.innerHTML = `${A.check({ size: 20 })}<div class="lock-rect-main"><div class="lock-k"><i class="a-today"></i>오늘 ${t.done}/${t.of}</div><div class="lock-t">${esc(n.text)}</div><div class="lock-m">${esc(n.area)}${row.right ? ' · ' + esc(row.right) : ''}</div></div>`;
    return host;
  };

  /* W.lockTally(target, doc) — 72 circle. Today's done count as the 正 (ghost printed, strokes inked
     over it, A.tally) and the count in figures under it. */
  W.lockTally = function (target, doc) {
    const t = doc.view.today;
    const host = el(target);
    host.classList.add('lock-circ');
    host.innerHTML = `${A.tally(t.done, { size: 26 })}<span class="lock-circ-n">${t.done}/${t.of}</span>`;
    return host;
  };

  /* W.lockAdd(target) — 72 circle. 담기, the one action that has its own button in the app too. */
  W.lockAdd = function (target) {
    const host = el(target);
    host.classList.add('lock-circ');
    host.innerHTML = `${A.icon('plus', { size: 24 })}<span class="lock-circ-n">담기</span>`;
    return host;
  };

  /* W.minutes(target, opts) — the 5×5 minute grid of a 25-minute focus, drawn as A draws a block:
     print frame (1.5pt), pale cell rules, fills inset from the rules.
       done minutes     the area's wash (done = wash, as everywhere)
       the current one  the wash filling left to right by the seconds gone, and the vermilion corner
                        (now = the signal's job, the same corner as today on the chart)
       the rest         paper
     opts.size (pt, outer), opts.area (0..7), opts.elapsed (whole minutes), opts.part (0..1 of the
     current minute), opts.tiles = true: no rules, tiles with gaps (for 20–30pt, e.g. the island). */
  W.minutes = function (target, opts) {
    opts = opts || {};
    const d = dpr();
    const px = (pt) => Math.max(1, Math.round(pt * d));
    const a = (opts.area || 0) + 1;
    const n = 5, elapsed = opts.elapsed || 0, part = opts.part || 0;
    let svg = '', W2 = 0;
    if (opts.tiles) {
      const gap = px(opts.gap || 1);
      const t = Math.floor((px(opts.size || 20) - 4 * gap) / 5);
      W2 = 5 * t + 4 * gap;
      for (let i = 0; i < 25; i++) {
        const x = (i % 5) * (t + gap), y = Math.floor(i / 5) * (t + gap);
        const fill = i < elapsed ? 'var(--isl-done)' : i === elapsed ? 'var(--signal)' : 'var(--isl-rest)';
        svg += `<rect x="${x}" y="${y}" width="${t}" height="${t}" style="fill:${fill}"/>`;
      }
    } else {
      const f = px(1.5), h = px(0.5), ins = px(opts.inset || 1);
      const c = Math.floor((px(opts.size || 110) - 2 * f - 4 * h) / 5);
      const xs = []; let x = f;
      for (let i = 0; i < n; i++) { xs.push(x); x += c + (i < n - 1 ? h : 0); }
      W2 = x + f;
      let rules = '';
      for (let i = 0; i < n - 1; i++) {
        const p = xs[i] + c;
        rules += `<rect x="${p}" y="${f}" width="${h}" height="${W2 - 2 * f}"/><rect x="${f}" y="${p}" width="${W2 - 2 * f}" height="${h}"/>`;
      }
      let fills = '', marks = '';
      const leg = px(Math.max(5, (c / d) * 0.3));
      for (let i = 0; i < 25; i++) {
        const cx = xs[i % 5], cy = xs[Math.floor(i / 5)];
        const fs = c - 2 * ins;
        if (i < elapsed) fills += `<rect x="${cx + ins}" y="${cy + ins}" width="${fs}" height="${fs}" style="fill:var(--wash-${a})"/>`;
        if (i === elapsed) {
          fills += `<rect x="${cx + ins}" y="${cy + ins}" width="${Math.round(fs * part)}" height="${fs}" style="fill:var(--wash-${a})"/>`;
          marks += `<path d="M${cx} ${cy}h${leg}l${-leg} ${leg}z" style="fill:var(--signal)"/>`;
        }
      }
      svg = `<g style="fill:var(--rule-cell)">${rules}</g>${fills}<g style="fill:var(--rule-frame)"><rect x="0" y="0" width="${W2}" height="${f}"/><rect x="0" y="${W2 - f}" width="${W2}" height="${f}"/><rect x="0" y="0" width="${f}" height="${W2}"/><rect x="${W2 - f}" y="0" width="${f}" height="${W2}"/></g><g shape-rendering="geometricPrecision">${marks}</g>`;
    }
    const size = W2 / d;
    const host = el(target);
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    host.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${W2} ${W2}" shape-rendering="crispEdges" style="display:block" aria-hidden="true">${svg}</svg>`;
    return { el: host, size };
  };

  /* the focus session the screens show: 25 minutes, 12:41 left, so 12 whole minutes gone and the
     13th 19 seconds in. Task and area from the demo data (the next step, 커리어). */
  W.focus = function (doc) {
    const total = 25 * 60, left = 12 * 60 + 41, gone = total - left;
    return { task: doc.view.nextStep.text, area: A.areaIndex(doc, doc.view.nextStep.area), areaName: doc.view.nextStep.area, left: '12:41', elapsed: Math.floor(gone / 60), part: (gone % 60) / 60 };
  };

  /* W.live(target, doc) — the focus Live Activity on the Lock Screen, 358 wide. A paper ground
     (activityBackgroundTint), 14pt margins. The minute grid is the picture; beside it the printed
     label, the task in writing ink, the time left in MaruBuri, and one control (pause). */
  W.live = function (target, doc) {
    const f = W.focus(doc);
    const host = el(target);
    host.classList.add('live');
    host.innerHTML = `<div class="live-grid"></div><div class="live-main"><div><div class="t-label live-k"><span>25분 집중</span><span><i class="a-dye" style="--d:var(--dye-${f.area + 1})"></i>${esc(f.areaName)}</span></div><div class="live-task">${esc(f.task)}</div></div><div class="live-foot"><span class="live-time">${f.left}<small>남음</small></span><span class="a-btn is-small live-btn">${W.icon('pause', { size: 18 })}멈춤</span></div></div>`;
    W.minutes(host.querySelector('.live-grid'), { size: 110, area: f.area, elapsed: f.elapsed, part: f.part });
    return host;
  };

  /* W.island(target, doc) — the Dynamic Island, compact: leading = the minute grid as tiles (no rules
     under 9pt a cell), trailing = the time left. The island is always black, so .island sets its own
     --isl-done (the area's L1 wash, light enough on black) and --isl-rest. */
  W.island = function (target, doc) {
    const f = W.focus(doc);
    const host = el(target);
    host.classList.add('island');
    host.style.setProperty('--isl-done', `var(--wash-l1-${f.area + 1})`);
    host.innerHTML = `<div class="island-lead"></div><span class="island-time">${f.left}</span>`;
    W.minutes(host.querySelector('.island-lead'), { size: 24, tiles: true, gap: 1, elapsed: f.elapsed });
    return host;
  };

  global.W = W;
})(window);
