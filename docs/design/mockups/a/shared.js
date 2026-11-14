/* ───────────────────────────────────────────────────────────────────────────
   방향 A · 인쇄된 한 장 — shared drawing code for every screen of this direction.
   Needs tokens.css (all colours come from its CSS variables, so dark mode needs no code change).

   Start a screen like this:
     <script src="/docs/design/mockups/a/shared.js"></script>
     <script>
       A.ready().then((doc) => {            // data.json loaded and fonts ready (text is measured)
         A.header('#header', { eyebrow: '2026 · 42주 · D-78', title: '10월 14일 수요일', action: 'settings' });
         A.chart('#chart', doc, { level: 'L1', cell: 20 });
         A.tabBar('#bar', { active: 'home' });
       });
     </script>

   What is here (each has a usage comment above it):
     A.ready()            load data, wait for fonts
     A.cells(doc)         the 81 cells of the 9×9 with kind / area / done / today
     A.blankDoc(doc)      the first-run document: goal and eight areas, 0 of 64 written
     A.chart()            L2 sheet (text) and L1 thumbnail (no text), same drawing
     A.block()            one block zoomed to a 3×3 page
     A.mark()             L0 mark (logo, icon, tiny sizes)
     A.header()           the one header anatomy
     A.tabBar()           floating capsule (four places) + the separate 담기 button
     A.row() / A.todayRow()  a list row with its check box
     A.check()            the check box alone
     A.tally() / A.weekStrip()  the 正 tally and the week strip
     A.ledger()           the eight areas as a compact table
     A.icon()             the glyph set (tab glyphs are drawn on the chart's geometry)
     A.seal()             the vermilion seal for a finished whole (area 8/8, day closed, 64/64)
     A.keep()             Korean line-break helper (no single syllable alone on a line)
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = {};
  const DATA_URL = '/tools/design-mockups/data.json';
  const NBSP = ' ';

  const el = (t) => (typeof t === 'string' ? document.querySelector(t) : t);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dpr = () => global.devicePixelRatio || 2;

  /* A.ready() → Promise<doc>
     Fetches the demo document and waits for Pretendard and MaruBuri, because the chart measures
     its labels. Always start from this. */
  A.ready = async function () {
    const doc = await (await fetch(DATA_URL)).json();
    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load('500 10px Pretendard', '가'),
        document.fonts.load('700 10px Pretendard', '가'),
        document.fonts.load('400 26px MaruBuri', '가1'),
        document.fonts.load('600 30px MaruBuri', '가1'),
      ]).catch(() => {});
      await document.fonts.ready;
    }
    return doc;
  };

  /* A.areaIndex(doc, '건강') → 0..7. Dye n in tokens.css is --dye-(index + 1). */
  A.areaIndex = (doc, title) => doc.areas.findIndex((a) => a.title === title);
  const dye = (i) => `var(--dye-${i + 1})`;
  const wash = (i, l1) => `var(--wash-${l1 ? 'l1-' : ''}${i + 1})`;

  /* A.keep('책 12권 읽기') → '책·12권 읽기' with a no-break space at the dot.
     Binds a one-syllable word to its neighbour so no syllable stands alone on a line
     ("새 친구", "300만 원", "주 3회"). Use it on any Korean label that may wrap. */
  A.keep = function (text) {
    const w = String(text).split(' ');
    if (w.length < 2) return String(text);
    let out = w[0];
    for (let i = 1; i < w.length; i++) {
      const prevShort = [...w[i - 1]].length === 1;
      const lastShort = i === w.length - 1 && [...w[i]].length === 1;
      out += (prevShort || lastShort ? NBSP : ' ') + w[i];
    }
    return out;
  };

  /* A.cells(doc) → 81 objects, row-major:
       { row, col, block, kind: 'core' | 'ring' | 'head' | 'action', area, text, done, today, index, actKind }
     ring = the eight area names round the core; head = the area name in the centre of its own block.
     today = this action is one of doc.view.today.rows. */
  A.cells = function (doc) {
    const rows = (doc.view && doc.view.today && doc.view.today.rows) || [];
    const today = new Set(rows.map((r) => r.area + '|' + r.text));
    const out = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const block = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const i = (row % 3) * 3 + (col % 3);
        let c;
        if (block === 4) {
          if (i === 4) c = { kind: 'core', text: doc.coreGoal };
          else { const a = i < 4 ? i : i - 1; c = { kind: 'ring', area: a, text: doc.areas[a].title }; }
        } else {
          const a = block < 4 ? block : block - 1;
          const area = doc.areas[a];
          if (i === 4) c = { kind: 'head', area: a, text: area.title, done: area.done, of: area.of };
          else {
            const k = i < 4 ? i : i - 1;
            const act = area.actions[k] || {};
            c = { kind: 'action', area: a, index: k, text: act.text || '', done: !!act.done, actKind: act.kind, act, today: !!act.text && today.has(area.title + '|' + act.text) };
          }
        }
        out.push(Object.assign(c, { row, col, block }));
      }
    }
    return out;
  };

  /* A.blankDoc(doc) → a copy for the first run: the goal and the eight default areas stay,
     every action is empty, 0 of 64. Pass it to A.chart() / A.block() for first.html. */
  A.blankDoc = function (doc) {
    const d = JSON.parse(JSON.stringify(doc));
    d.areas.forEach((a) => { a.done = 0; a.actions = a.actions.map(() => ({ text: '', done: false })); });
    d.view.progress = { done: 0, of: 64 };
    d.view.today = Object.assign({}, d.view.today, { done: 0, of: 0, rows: [] });
    d.view.weekFocus = [];
    d.view.week = Object.assign({}, d.view.week, { total: '0번', days: d.view.week.days.map((x) => [x[0], null].concat(x[2] ? [x[2]] : [])) });
    return d;
  };

  /* ── marks ─────────────────────────────────────────────────────────────── */

  // The pen tick, in a 1 × 1 box. It is written, not printed: round caps, a slight curve.
  const TICK = 'M.04 .52 C.16 .62 .28 .78 .36 .93 C.5 .6 .72 .28 1 .04';
  const tickPath = (x, y, s, w) =>
    `<path d="${TICK}" transform="translate(${x} ${y}) scale(${s})" fill="none" style="stroke:var(--tick)" stroke-width="${w / s}" stroke-linecap="round" stroke-linejoin="round"/>`;

  /* ── the chart ─────────────────────────────────────────────────────────── */

  // Rule weights and positions in whole device pixels, so every hairline is crisp.
  function grid(n, cellPt, w, groupEvery) {
    const c = Math.round(cellPt * dpr());
    const xs = [];
    let x = w.frame;
    for (let i = 0; i < n; i++) {
      xs.push(x);
      x += c;
      if (i < n - 1) x += groupEvery && i % groupEvery === groupEvery - 1 ? w.block : w.hair;
    }
    return { c, xs, total: x + w.frame };
  }

  function rulesSvg(g, n, w, groupEvery) {
    const { c, xs, total } = g;
    let hair = '', block = '';
    for (let i = 0; i < n - 1; i++) {
      const isBlock = groupEvery && i % groupEvery === groupEvery - 1;
      const t = isBlock ? w.block : w.hair;
      if (!t) continue;
      const p = xs[i] + c;
      const r = `<rect x="${p}" y="${w.frame}" width="${t}" height="${total - 2 * w.frame}"/><rect x="${w.frame}" y="${p}" width="${total - 2 * w.frame}" height="${t}"/>`;
      if (isBlock) block += r; else hair += r;
    }
    const f = w.frame;
    const frame = f ? `<rect x="0" y="0" width="${total}" height="${f}"/><rect x="0" y="${total - f}" width="${total}" height="${f}"/><rect x="0" y="0" width="${f}" height="${total}"/><rect x="${total - f}" y="0" width="${f}" height="${total}"/>` : '';
    return `<g style="fill:var(--rule-cell)">${hair}</g><g style="fill:var(${w.blockVar || '--rule-block'})">${block}</g><g style="fill:var(--rule-frame)">${frame}</g>`;
  }

  /* A.chart(target, doc, opts) → { el, size, cellSize, cells }
     The 9×9, one drawing at two levels of detail. target = element or selector (its content is replaced
     and it is sized to the chart). size is the outer width in pt.

     opts.level  'L2' (default): the printed sheet with all 81 texts. Use cell 41 on a 390 screen
                 (sheet = 377pt; centre it, which leaves 6.5pt margins).
                 'L1': the thumbnail, no text. cell 7–26 (64–240pt). Cell rules and today corners
                 appear from cell 11 (about 100pt), as the skeleton asks.
     opts.cell   cell size in pt (default 41 for L2, 20 for L1).
     opts.tick   draw the pen tick on done cells (default: true at L2, false at L1).
     opts.today  draw the today corners (default: true).

     What it draws (the same at both levels):
       structure  core = ink, the 16 area-name cells = solid dye. Constant from day 1 to day 365.
       done       a wash of the area's dye inside the cell, text still ink, a pen tick top-right
                  (skipped when the label has three lines).
       today      a vermilion corner, top-left.
       empty      paper. No plus sign.
     Fills are inset from the rules, so the pale printed lattice runs unbroken across the sheet. */
  A.chart = function (target, doc, opts) {
    opts = opts || {};
    const L1 = opts.level === 'L1';
    const d = dpr();
    const cellPt = opts.cell || (L1 ? 20 : 41);
    const px = (pt) => Math.max(1, Math.round(pt * d));
    const w = L1
      ? { frame: px(1), block: px(0.5), hair: cellPt >= 11 ? px(0.5) : 0, inset: px(0.5), blockVar: '--rule-frame' }
      : { frame: px(1.5), block: px(1), hair: px(0.5), inset: px(1) };
    if (L1 && !w.hair) w.block = px(1);
    const g = grid(9, cellPt, w, 3);
    const { c, xs, total } = g;
    const cells = A.cells(doc);
    const showTick = opts.tick !== undefined ? opts.tick : !L1;
    const showToday = opts.today !== false && cellPt >= 11;

    let fills = '', marks = '';
    const leg = Math.round((L1 ? cellPt * 0.34 : 8) * d);
    cells.forEach((cell) => {
      const x = xs[cell.col], y = xs[cell.row];
      const fx = x + w.inset, fy = y + w.inset, fs = c - 2 * w.inset;
      if (cell.kind === 'core') {
        fills += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:var(--core)"/>`;
        fills += `<rect x="${fx + 0.5 * px(0.5)}" y="${fy + 0.5 * px(0.5)}" width="${fs - px(0.5)}" height="${fs - px(0.5)}" fill="none" style="stroke:var(--core-edge)" stroke-width="${px(0.5)}"/>`;
      } else if (cell.kind === 'ring' || cell.kind === 'head') {
        fills += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:${dye(cell.area)}"/>`;
      } else if (cell.done) {
        fills += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:${wash(cell.area, L1)}"/>`;
      }
      if (cell.kind === 'action' && cell.today && showToday) {
        marks += `<path data-today d="M${x} ${y}h${leg}l${-leg} ${leg}z" style="fill:var(--signal)"/>`;
      }
      if (cell.kind === 'action' && cell.done && showTick) {
        const s = 5.5 * d;
        marks += `<g data-tick="${cell.row}-${cell.col}">${tickPath(x + c - w.inset - s - 1.5 * d, y + w.inset + 1.5 * d, s, 1.1 * d)}</g>`;
      }
    });

    const size = total / d;
    const host = el(target);
    host.classList.add('a-chart');
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    let html = `<svg width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" aria-hidden="true">${rulesSvg(g, 9, w, 3)}${fills}<g shape-rendering="geometricPrecision">${marks}</g></svg>`;
    if (!L1 && opts.text !== false) {
      cells.forEach((cell) => {
        if (!cell.text) return;
        const cls = cell.kind === 'core' ? ' is-core' : cell.kind === 'action' ? '' : ' is-head';
        html += `<div class="a-cell${cls}" data-rc="${cell.row}-${cell.col}" style="left:${xs[cell.col] / d}px;top:${xs[cell.row] / d}px;width:${c / d}px;height:${c / d}px;padding:0 1.5px"><span>${esc(A.keep(cell.text))}</span></div>`;
      });
    }
    host.innerHTML = html;
    // a tick needs the top-right corner free: drop it where the label runs to three lines
    if (!L1 && showTick) {
      host.querySelectorAll('.a-cell').forEach((n) => {
        const span = n.firstElementChild;
        if (span && span.offsetHeight > 12 * 2 + 2) {
          const t = host.querySelector(`[data-tick="${n.dataset.rc}"]`);
          if (t) t.remove();
        }
      });
    }
    return { el: host, size, cellSize: c / d, cells };
  };

  /* A.block(target, doc, areaIndex, opts) → { el, size, cellSize, cells: [{ el, cell }] }
     One block zoomed to a 3×3 page, in the same drawing as the sheet: head cell = solid dye,
     done = wash + pen tick, today = vermilion corner, empty = paper.
     areaIndex 0..7, or 'core' for the centre block (the goal and the eight area names).
     opts.cell   cell size in pt (default 114, which makes a 345pt block inside the 24pt gutters).
     opts.extra  (cell) => HTML string, laid along the bottom of that cell (habit state, a count, D-day).
     Labels are 16/24 Medium (the owner's words, at least 15pt as the brief asks); the head is 18/24 Bold.
     Each returned cells[i].el is the cell's own box if you need to add more. */
  A.block = function (target, doc, areaIndex, opts) {
    opts = opts || {};
    const d = dpr();
    const cellPt = opts.cell || 114;
    const px = (pt) => Math.max(1, Math.round(pt * d));
    const w = { frame: px(1.5), block: px(1), hair: px(0.5), inset: px(1.5) };
    const g = grid(3, cellPt, w, 0);
    const { c, xs, total } = g;
    const all = A.cells(doc);
    const blockNo = areaIndex === 'core' ? 4 : areaIndex < 4 ? areaIndex : areaIndex + 1;
    const cells = all.filter((x) => x.block === blockNo);
    let fills = '', marks = '';
    const leg = 12 * d;
    cells.forEach((cell) => {
      const col = cell.col % 3, row = cell.row % 3;
      const x = xs[col], y = xs[row];
      const fx = x + w.inset, fy = y + w.inset, fs = c - 2 * w.inset;
      if (cell.kind === 'core') {
        fills += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:var(--core)"/><rect x="${fx + px(0.25)}" y="${fy + px(0.25)}" width="${fs - px(0.5)}" height="${fs - px(0.5)}" fill="none" style="stroke:var(--core-edge)" stroke-width="${px(0.5)}"/>`;
      } else if (cell.kind !== 'action') {
        fills += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:${dye(cell.area)}"/>`;
      } else if (cell.done) {
        fills += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" style="fill:${wash(cell.area)}"/>`;
        const s = 13 * d;
        marks += tickPath(x + c - w.inset - s - 7 * d, y + w.inset + 6 * d, s, 1.75 * d);
      }
      if (cell.kind === 'action' && cell.today) marks += `<path d="M${x} ${y}h${leg}l${-leg} ${leg}z" style="fill:var(--signal)"/>`;
    });
    const size = total / d;
    const host = el(target);
    host.classList.add('a-chart');
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    let html = `<svg width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" aria-hidden="true">${rulesSvg(g, 3, w, 0)}${fills}<g shape-rendering="geometricPrecision">${marks}</g></svg>`;
    cells.forEach((cell, i) => {
      const col = cell.col % 3, row = cell.row % 3;
      const kind = cell.kind === 'core' ? ' is-core' : cell.kind === 'action' ? '' : ' is-head';
      const font = cell.kind === 'core' ? 'font:600 20px/30px var(--serif)' : cell.kind === 'action' ? 'font:500 16px/24px var(--sans);letter-spacing:-0.01em' : 'font:700 18px/24px var(--sans);letter-spacing:-0.01em';
      const extra = opts.extra ? opts.extra(cell) || '' : '';
      html += `<div class="a-cell${kind}" data-i="${i}" style="left:${xs[col] / d}px;top:${xs[row] / d}px;width:${c / d}px;height:${c / d}px;padding:0 10px;${font}"><span>${esc(A.keep(cell.text))}</span>${extra ? `<div style="position:absolute;left:10px;right:10px;bottom:9px">${extra}</div>` : ''}</div>`;
    });
    host.innerHTML = html;
    return { el: host, size, cellSize: c / d, cells: cells.map((cell, i) => ({ cell, el: host.querySelector(`[data-i="${i}"]`) })) };
  };

  /* A.mark(target, opts) → { el, size }
     L0: the mark. No text, no data: it is the part of the chart that never changes.
     opts.size     outer size in pt (default 64).
     opts.variant  'sheet' (default): 3×3 blocks; each outer block shows its solid dye centre, the middle
                   block shows the ring of eight dyes round the ink core. Good from about 40pt up
                   (app icon, splash, colophon).
                   'heart': the middle block alone, eight dye cells round the ink core. For 16–40pt.
     opts.frame    false = no frame and no rules, dyes only (default true). For an app icon that must fill
                   the square, draw your own paper ground and pass frame: false or a pad.
     opts.pad      paper margin inside the size, in pt (default 0). */
  A.mark = function (target, opts) {
    opts = opts || {};
    const size = opts.size || 64;
    const pad = opts.pad || 0;
    const frameOn = opts.frame !== false;
    const s = size - 2 * pad;
    const u = s / 9; // one cell of the 9×9
    let out = '';
    const rect = (x, y, w, fill) => { out += `<rect x="${(pad + x).toFixed(3)}" y="${(pad + y).toFixed(3)}" width="${w.toFixed(3)}" height="${w.toFixed(3)}" style="fill:${fill}"/>`; };
    if (opts.variant === 'heart') {
      const gap = Math.max(0.5, s * 0.035), t = (s - 2 * gap) / 3;
      for (let i = 0; i < 9; i++) {
        const a = i < 4 ? i : i - 1;
        rect((i % 3) * (t + gap), Math.floor(i / 3) * (t + gap), t, i === 4 ? 'var(--core)' : dye(a));
      }
    } else {
      const inset = frameOn ? Math.max(0.5, u * 0.08) : u * 0.06;
      for (let b = 0; b < 9; b++) {
        const bx = (b % 3) * 3 * u, by = Math.floor(b / 3) * 3 * u;
        if (b === 4) {
          for (let i = 0; i < 9; i++) {
            const a = i < 4 ? i : i - 1;
            rect(bx + (i % 3) * u + inset, by + Math.floor(i / 3) * u + inset, u - 2 * inset, i === 4 ? 'var(--core)' : dye(a));
          }
        } else {
          rect(bx + u + inset, by + u + inset, u - 2 * inset, dye(b < 4 ? b : b - 1));
        }
      }
      if (frameOn) {
        const f = Math.max(0.5, s / 128), r = Math.max(0.5, s / 256);
        let lines = '';
        [3, 6].forEach((k) => {
          lines += `<rect x="${pad + k * u - r / 2}" y="${pad}" width="${r}" height="${s}"/><rect x="${pad}" y="${pad + k * u - r / 2}" width="${s}" height="${r}"/>`;
        });
        out = `<g style="fill:var(--rule-block)">${lines}</g>` + out + `<rect x="${pad + f / 2}" y="${pad + f / 2}" width="${s - f}" height="${s - f}" fill="none" style="stroke:var(--rule-frame)" stroke-width="${f}"/>`;
      }
    }
    const host = el(target);
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    host.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block" aria-hidden="true">${out}</svg>`;
    return { el: host, size };
  };

  /* ── glyphs ────────────────────────────────────────────────────────────── */

  /* A.icon(name, opts) → SVG string. 24 × 24 box, 1.5pt stroke, square joins: drawn on the chart's
     own geometry (a square module), not a stock set.
     Tab glyphs: 'home' (a page with its masthead rule), 'chart' (3×3 with the core), 'today' (a check
     box with the tick overshooting), 'stats' (three bars of cells). opts.active fills one part with ink.
     Others: 'plus', 'settings', 'share', 'edit', 'more', 'chevron', 'back', 'close'.
     opts.size (default 24). Colour is currentColor. */
  A.icon = function (name, opts) {
    opts = opts || {};
    const s = opts.size || 24, on = !!opts.active;
    const P = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"';
    const F = 'fill="currentColor" stroke="none"';
    const body = {
      home: `<rect x="4.75" y="3.75" width="14.5" height="16.5" rx="1" ${P}/>` +
        (on ? `<rect x="4.75" y="3.75" width="14.5" height="5.5" ${F}/><path d="M8.25 13h7.5M8.25 16.5h4.5" ${P}/>` : `<path d="M4.75 9.25h14.5" ${P}/><path d="M8.25 13h7.5M8.25 16.5h4.5" ${P} stroke-width="1.25"/>`),
      chart: `<rect x="3.75" y="3.75" width="16.5" height="16.5" rx="1" ${P}/><path d="M9.25 4.5v15M14.75 4.5v15M4.5 9.25h15M4.5 14.75h15" ${P} stroke-width="1" stroke-linecap="butt"/>` +
        (on ? `<rect x="9.25" y="9.25" width="5.5" height="5.5" ${F}/>` : ''),
      today: on
        ? `<rect x="4" y="6" width="14" height="14" rx="1" ${F}/><path d="M7.4 12.6c1.2 1 2.1 2.2 2.8 3.5 1.5-3 3.4-5.9 5.4-8.3" fill="none" style="stroke:var(--paper)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 5c.9-1 1.8-1.9 2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`
        : `<rect x="4.75" y="6.75" width="12.5" height="12.5" rx="1" ${P}/><path d="M7.6 12.6c1.2 1 2.1 2.2 2.8 3.5 2.6-5.200 6-9.600 10.400-13.900" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
      stats: on
        ? `<rect x="4" y="12" width="4.500" height="8" ${F}/><rect x="9.750" y="4" width="4.500" height="16" ${F}/><rect x="15.500" y="8" width="4.500" height="12" ${F}/>`
        : `<rect x="4.75" y="12.75" width="3.5" height="6.5" ${P}/><rect x="10.25" y="4.75" width="3.5" height="14.5" ${P}/><rect x="15.75" y="8.75" width="3.5" height="10.5" ${P}/>`,
      plus: `<path d="M12 5.500v13M5.500 12h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>`,
      settings: `<path d="M3.5 7.75h17M3.5 16.25h17" ${P} stroke-linecap="butt"/><rect x="13.75" y="5" width="5.5" height="5.5" style="fill:var(--paper)" stroke="currentColor" stroke-width="1.5"/><rect x="4.75" y="13.5" width="5.5" height="5.5" style="fill:var(--paper)" stroke="currentColor" stroke-width="1.5"/>`,
      share: `<path d="M8.500 9.750H5.750v10.500h12.500V9.750H15.500" ${P} stroke-linecap="butt"/><path d="M12 14.500V3.750M8.250 7.250 12 3.500l3.750 3.750" ${P} stroke-linecap="butt"/>`,
      edit: `<path d="M5 19l1-4.250L16.250 4.500l3.250 3.250L9.250 18z" ${P}/><path d="M13.750 7l3.250 3.250" ${P} stroke-linecap="butt"/>`,
      more: `<rect x="4" y="10.500" width="3" height="3" ${F}/><rect x="10.500" y="10.500" width="3" height="3" ${F}/><rect x="17" y="10.500" width="3" height="3" ${F}/>`,
      chevron: `<path d="M9 5.500l6.500 6.500L9 18.500" ${P} stroke-linecap="butt"/>`,
      back: `<path d="M15 5.500 8.500 12l6.500 6.500" ${P} stroke-linecap="butt"/>`,
      close: `<path d="M6 6l12 12M18 6 6 18" ${P} stroke-linecap="butt"/>`,
    }[name] || '';
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>`;
  };

  /* A.seal(opts) → SVG string. The vermilion seal: the third job of the signal colour, for a finished
     whole only (an area at 8/8, a closed day, 64/64). Abstract on purpose: a stamped ring, turned −6°.
     opts.size (default 20). Never put it on a single task; a task gets the pen tick. */
  A.seal = function (opts) {
    const s = (opts && opts.size) || 20;
    return `<svg width="${s}" height="${s}" viewBox="0 0 20 20" style="display:block;flex:none" aria-hidden="true"><g transform="rotate(-6 10 10)" fill="none" style="stroke:var(--signal)"><rect x="2.500" y="2.500" width="15" height="15" rx="2" stroke-width="1.75"/><path d="M6.200 10.300c1.100.900 1.900 1.900 2.500 3 1.300-2.600 3-5 4.900-7" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
  };

  /* ── header ────────────────────────────────────────────────────────────── */

  /* A.header(target, opts)
     The one header anatomy for every tab: an eyebrow line (always reserved), a title, one trailing
     action; 72pt high with the masthead rule under it, so the title sits at the same y on every tab.
     opts.eyebrow  text for the printed eyebrow line (folio, date, "핵심 목표").
     opts.title    the title text.
     opts.written  true when the title is the owner's own words (the goal): writing ink, SemiBold.
                   false (default) for printed titles (the date, 오늘, 통계): print ink, Regular.
     opts.action   one glyph name from A.icon ('settings', 'share', 'edit', 'more', 'close') or null.
     opts.back     a label: puts "‹ label" in the eyebrow line instead of the eyebrow text
                   (the way back on a zoomed or pushed page).
     opts.figure   optional short written figure on the title line, before the action (e.g. '1/10'). */
  A.header = function (target, opts) {
    opts = opts || {};
    const host = el(target);
    host.classList.add('a-header');
    const eyebrow = opts.back
      ? `<div class="t-folio"><span class="a-header-back">${A.icon('back', { size: 16 })}${esc(opts.back)}</span></div>`
      : `<div class="t-folio">${esc(opts.eyebrow || '') || NBSP}</div>`;
    const figure = opts.figure ? `<span class="t-figure" style="position:absolute;right:${opts.action ? 44 : 0}px;top:30px;font-size:22px">${esc(opts.figure)}</span>` : '';
    host.innerHTML = `${eyebrow}<div class="t-title${opts.written ? ' is-written' : ''}"${opts.figure ? ' style="padding-right:120px"' : ''}>${esc(opts.title || '')}</div>${figure}${opts.action ? `<div class="a-header-action">${A.icon(opts.action)}</div>` : ''}`;
    return host;
  };

  /* ── floating navigation ───────────────────────────────────────────────── */

  /* A.tabBar(target, opts)
     The floating layer: a paper capsule holding the four places, and 담기 as its own ink button
     beside it. It positions itself at the bottom of .a-page (absolute); content scrolls under it.
     opts.active  'home' | 'chart' | 'today' | 'stats'. */
  A.tabBar = function (target, opts) {
    opts = opts || {};
    const tabs = [['home', '홈'], ['chart', '만다라트'], ['today', '오늘'], ['stats', '통계']];
    const host = el(target);
    host.classList.add('a-bar');
    const veil = `<svg class="a-bar-veil" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="a-veil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--paper);stop-opacity:0"/><stop offset="0.42" style="stop-color:var(--paper);stop-opacity:0.96"/><stop offset="1" style="stop-color:var(--paper);stop-opacity:1"/></linearGradient></defs><rect width="10" height="10" fill="url(#a-veil)"/></svg>`;
    host.innerHTML = `${veil}<div class="a-bar-capsule">${tabs.map(([k, label]) => `<div class="a-tab${k === opts.active ? ' is-active' : ''}">${A.icon(k, { active: k === opts.active })}<span>${label}</span></div>`).join('')}</div><div class="a-bar-add">${A.icon('plus')}<span>담기</span></div>`;
    return host;
  };

  /* ── rows ──────────────────────────────────────────────────────────────── */

  /* A.check(opts) → SVG string. The one check box: a printed square with a 3:1 edge.
     opts.done   true = filled with the area's wash, edged in its dye, with the pen tick in writing ink
                 overshooting the top-right corner.
     opts.area   area index 0..7 (the dye used when done). Without it, done uses ink.
     opts.size   24 in rows (default), 20 for trailing use. */
  A.check = function (opts) {
    opts = opts || {};
    const s = opts.size || 24;
    const a = opts.area;
    const box = opts.done
      ? `<rect x=".75" y=".75" width="22.5" height="22.5" rx="2" style="fill:${a >= 0 ? wash(a) : 'var(--print-rule)'};stroke:${a >= 0 ? dye(a) : 'var(--ink)'}" stroke-width="1.5"/>`
      : `<rect x=".75" y=".75" width="22.5" height="22.5" rx="2" fill="none" style="stroke:var(--print-edge)" stroke-width="1.5"/>`;
    const tick = opts.done ? `<path d="M5.600 12.400C8 14.200 9.600 16.200 10.800 18.600 14.600 11 19.800 3.600 27.200-3" fill="none" style="stroke:var(--tick)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return `<svg class="a-check" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${box}${tick}</svg>`;
  };

  /* A.row(doc, r) → HTML string for one list row (48pt, hairline under it; wrap rows in .a-list).
     One title, one line of metadata, at most one thing on the right.
     r.text     the title (the owner's words).
     r.area     area title ('건강'): shown as a dye mark + the name at the start of the meta line.
     r.meta     one more piece of metadata after the area ('이번 주 0/3회').
     r.right    a short written figure on the right ('D-2'), or
     r.rightPrint  a short printed word on the right ('중점').
     r.done     true = ticked box, title struck through. The box is always on the leading side. */
  A.row = function (doc, r) {
    const a = r.area ? A.areaIndex(doc, r.area) : -1;
    const meta = [r.area ? `<i class="a-dye" style="--d:${a >= 0 ? dye(a) : 'var(--ink)'}"></i>${esc(r.area)}` : '', r.meta ? esc(r.meta) : ''].filter(Boolean).join(' · ');
    const right = r.right ? `<div class="a-row-right">${esc(r.right)}</div>` : r.rightPrint ? `<div class="a-row-right is-print">${esc(r.rightPrint)}</div>` : '';
    return `<div class="a-row${r.done ? ' is-done' : ''}">${A.check({ done: !!r.done, area: a })}<div class="a-row-main"><div class="a-row-title">${esc(r.text)}</div>${meta ? `<div class="a-row-meta">${meta}</div>` : ''}</div>${right}</div>`;
  };

  /* A.todayRow(doc, row, extra) → HTML string. A row straight from doc.view.today.rows[i]:
     area + its meta as the one metadata line, right = row.right (D-2), done = row.doneToday.
     extra overrides or adds fields (e.g. { rightPrint: '중점' }). */
  A.todayRow = function (doc, row, extra) {
    return A.row(doc, Object.assign({ text: row.text, area: row.area, meta: row.meta, right: row.right, done: !!row.doneToday }, extra || {}));
  };

  /* ── 正 ────────────────────────────────────────────────────────────────── */

  /* A.tally(n, opts) → SVG string. The 正 tally: one stroke per time, five strokes to a character.
     The whole character is printed pale (the form), and the strokes made so far are inked over it.
     n           how many (null or 0 = only the printed ghost). More than 5 draws a second character.
     opts.size   height in pt (default 22).
     opts.ghost  false = no printed ghost under the strokes (default true). */
  A.tally = function (n, opts) {
    opts = opts || {};
    const s = opts.size || 22;
    n = n || 0;
    const strokes = ['M3.500 4.500H18.500', 'M11 4.500V18', 'M11 11h6', 'M6 10.500V18', 'M2.500 18h17'];
    const chars = Math.max(1, Math.ceil(n / 5));
    let out = '';
    for (let k = 0; k < chars; k++) {
      const inked = Math.max(0, Math.min(5, n - k * 5));
      const g = strokes.map((d, i) => {
        if (i < inked) return `<path d="${d}" style="stroke:var(--ink)" stroke-width="1.75"/>`;
        return opts.ghost === false ? '' : `<path d="${d}" style="stroke:var(--print-rule)" stroke-width="1.5"/>`;
      }).join('');
      out += `<g transform="translate(${k * 22} 0)" fill="none" stroke-linecap="round">${g}</g>`;
    }
    return `<svg width="${(s * (chars * 22)) / 22}" height="${s}" viewBox="0 0 ${chars * 22} 22" style="display:block" aria-hidden="true">${out}</svg>`;
  };

  /* A.weekStrip(target, week)
     The week as seven printed cells: weekday letter (Sunday in vermilion), the 正 tally of that day,
     and the today corner on today's cell. week = doc.view.week ({ days: [['월', 3], ['수', 1, 'today'], …] }). */
  A.weekStrip = function (target, week) {
    const host = el(target);
    host.classList.add('a-week');
    host.innerHTML = week.days.map((day) => {
      const cls = (day[2] === 'today' ? ' is-today' : '') + (day[0] === '일' ? ' is-sunday' : '');
      return `<div class="a-week-day${cls}"><span class="t-label">${esc(day[0])}</span>${A.tally(day[1])}</div>`;
    }).join('');
    return host;
  };

  /* A.ledger(target, doc)
     The eight areas as a compact two-column table (booktabs: rule on top, hairlines, no boxes):
     dye mark, name, n/8 right-aligned. Reads down the left column, then the right. */
  A.ledger = function (target, doc) {
    const host = el(target);
    host.classList.add('a-ledger');
    const order = [0, 4, 1, 5, 2, 6, 3, 7];
    host.innerHTML = order.map((i) => {
      const a = doc.areas[i];
      return `<div class="a-ledger-row"><span><i class="a-dye" style="--d:${dye(i)}"></i>${esc(a.title)}</span><b>${a.done}/${a.of}</b></div>`;
    }).join('');
    return host;
  };

  global.A = A;
})(window);
