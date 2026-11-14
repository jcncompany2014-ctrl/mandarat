/* ───────────────────────────────────────────────────────────────────────────
   방향 A · parts the kit lacks, for the system surfaces: widgets, the Lock Screen, the focus
   Live Activity and the Dynamic Island. Used by widgets.html and store.html.
   Needs tokens.css and shared.js (A.*) loaded first. Every colour is a token; the Lock Screen and
   the Dynamic Island redefine a few tokens on their own container (.lock and .island in
   parts-widgets.css), the same way dark mode does, so the kit functions draw in greys.

   KIT REQUESTS (each part below should move into shared.js / tokens.css):
     W.small()     small widget: the L1 colour map and 오늘 n/m
     W.medium()    medium widget: three rows with 20pt check boxes, head says what is left (n개 남음)
     W.wRow()      the compact row (34pt) used in widgets
     W.lockRect()  Lock Screen rectangular: leading check box + next action (no count: the gauge has it)
     W.lockGauge() Lock Screen circular: today's done share as a ring + n/m in figures (no 正)
     W.lockAdd()   Lock Screen circular: 담기
     W.minutes()   the 5×5 minute grid as soft tiles (one tile per minute of a 25-minute focus)
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

  /* W.icon('pause') — the glyph A.icon lacks. Two bars with round ends on the 24 box. */
  W.icon = function (name, opts) {
    const s = (opts && opts.size) || 24;
    const body = { pause: '<rect x="7" y="5.5" width="3.5" height="13" rx="1.25" fill="currentColor"/><rect x="13.5" y="5.5" width="3.5" height="13" rx="1.25" fill="currentColor"/>' }[name] || '';
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>`;
  };

  /* the head line every widget shares: a printed label with the today dot, the written figure right
     (Pretendard Bold; pass unit to set a small unit after the figure, as .t-figure small) */
  const head = (label, figure, unit) =>
    `<div class="w-head"><span class="t-label"><i class="a-today"></i>${esc(label)}</span><span class="w-fig">${esc(figure)}${unit ? `<small>${esc(unit)}</small>` : ''}</span></div>`;

  /* W.small(target, doc) — 158 × 158. The colour map in miniature (A.chart L1: solid dye for the 16
     area cells, wash = done, pale tint = written, --tile = empty; 96pt) under one head line:
     • 오늘 … 1/10. The column is the map's width, so label, figure and map share two edges. At L1
     the map shows no today dots (A's L1 rule); the dot beside 오늘 carries today. */
  W.small = function (target, doc) {
    const t = doc.view.today;
    const host = el(target);
    host.classList.add('w', 'w-small');
    host.innerHTML = `<div class="w-col">${head('오늘', `${t.done}/${t.of}`)}<div class="w-sheet"></div></div>`;
    A.chart(host.querySelector('.w-sheet'), doc, { level: 'L1', cell: 11, width: 96 });
    return host;
  };

  /* W.wRow(doc, r) — a row at widget size: 34pt, 20pt check box, 15pt title, one thing on the right.
     r = { text, area, right, rightPrint, done } as in A.row. Without right/rightPrint the right side is
     the area (dye mark + name), so the area still has a word beside its colour. */
  W.wRow = function (doc, r) {
    const a = r.area ? A.areaIndex(doc, r.area) : -1;
    const right = r.right ? `<span class="w-row-right">${esc(r.right)}</span>`
      : r.rightPrint ? `<span class="w-row-right is-print">${esc(r.rightPrint)}</span>`
      : r.area ? `<span class="w-row-area"><i class="a-dye" style="--d:var(--dye-${a + 1})"></i>${esc(r.area)}</span>` : '';
    return `<div class="w-row${r.done ? ' is-done' : ''}">${A.check({ done: !!r.done, area: a, size: 20 })}<span class="w-row-title"><span class="w-strike">${esc(r.text)}</span></span>${right}</div>`;
  };

  /* W.medium(target, doc, rows) — 338 × 158. Head line, then three rows (no rule on top of the list).
     rows = array of W.wRow inputs. Not the small widget scaled up: this one is for ticking, so its
     head says what is left (9개 남음) while the small one says 오늘 1/10 (no duplicate counts side by
     side, art director's decision 4). */
  W.medium = function (target, doc, rows) {
    const t = doc.view.today;
    const host = el(target);
    host.classList.add('w', 'w-medium');
    host.innerHTML = `${head('오늘 할 일', `${t.of - t.done}`, '개 남음')}<div class="w-list">${rows.map((r) => W.wRow(doc, r)).join('')}</div>`;
    return host;
  };

  /* Lock Screen (vibrant rendering). The system draws these in opaque greys of one hue-less ramp;
     the container .lock sets --ink / --ink-2 / --print / --print-rule / --print-edge to those greys,
     so A.check draws itself in grey. Meaning never rests on colour: today is the dot, done is the
     tick, a count is a number. */

  /* W.lockRect(target, doc) — 156 × 72. Leading check box (tap = done), the next action, its fact.
     The label says what this is (다음 할 일); the count lives once, in the gauge beside it. */
  W.lockRect = function (target, doc) {
    const t = doc.view.today, n = doc.view.nextStep;
    const row = t.rows.find((r) => r.text === n.text) || {};
    const host = el(target);
    host.classList.add('lock-rect');
    host.innerHTML = `${A.check({ size: 20 })}<div class="lock-rect-main"><div class="lock-k"><i class="a-today"></i>다음 할 일</div><div class="lock-t">${esc(n.text)}</div><div class="lock-m">${esc(n.area)}${row.right ? ' · ' + esc(row.right) : ''}</div></div>`;
    return host;
  };

  /* W.lockGauge(target, doc) — 72 circle (accessoryCircular as a Gauge). A ring of today's done
     share (round caps, the empty track one step down the grey ramp) round 오늘 and n/m in figures.
     Replaces the 正 tally: a count is a number. */
  W.lockGauge = function (target, doc) {
    const t = doc.view.today;
    const host = el(target);
    host.classList.add('lock-circ', 'lock-gauge');
    const S = 72, r = 30, w = 4, c = 2 * Math.PI * r;
    // the ring opens at the bottom (a 300° arc, as the system's gauge), so it reads as a dial
    const arc = 300 / 360, track = c * arc, on = track * Math.min(1, t.done / Math.max(1, t.of));
    const ring = (len, col) => `<circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" style="stroke:${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${c.toFixed(2)}" transform="rotate(120 ${S / 2} ${S / 2})"/>`;
    host.innerHTML = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" aria-hidden="true">${ring(track, 'var(--lock-3)')}${ring(on, 'var(--lock-1)')}</svg><span class="lock-gauge-k">오늘</span><span class="lock-gauge-n">${t.done}<small>/${t.of}</small></span>`;
    return host;
  };

  /* W.lockAdd(target) — 72 circle. 담기, the one action that has its own button in the app too. */
  W.lockAdd = function (target) {
    const host = el(target);
    host.classList.add('lock-circ');
    host.innerHTML = `${A.icon('plus', { size: 24 })}<span class="lock-circ-n">담기</span>`;
    return host;
  };

  /* W.minutes(target, opts) — the 5×5 minute grid of a 25-minute focus, drawn as A draws the chart:
     soft tiles with a small gap and round corners, no frame and no rules.
       done minutes     the area's stronger wash (--wash-l1: done = wash, as everywhere)
       the current one  the tile tint, the wash rising from the bottom by the seconds gone, and the
                        6pt vermilion dot top-left (now = the signal's job, the same dot as today)
       the rest         the tile tint (an empty cell of the chart)
     opts.size (pt, outer), opts.area (0..7), opts.elapsed (whole minutes), opts.part (0..1 of the
     current minute), opts.tiles = true: the island version (20–30pt) in its own greys, no dot. */
  W.minutes = function (target, opts) {
    opts = opts || {};
    const d = dpr();
    const px = (pt) => Math.max(1, Math.round(pt * d));
    const a = (opts.area || 0) + 1;
    const elapsed = opts.elapsed || 0, part = opts.part || 0;
    const island = !!opts.tiles;
    const gap = px(opts.gap || (island ? 1 : 3));
    const t = Math.floor((px(opts.size || 110) - 4 * gap) / 5);
    const W2 = 5 * t + 4 * gap;
    const rx = island ? 0.9 * d : Math.max(2, t / d * 0.13) * d;
    let fills = '', marks = '';
    for (let i = 0; i < 25; i++) {
      const x = (i % 5) * (t + gap), y = Math.floor(i / 5) * (t + gap);
      if (island) {
        const fill = i < elapsed ? 'var(--isl-done)' : i === elapsed ? 'var(--signal)' : 'var(--isl-rest)';
        fills += `<rect x="${x}" y="${y}" width="${t}" height="${t}" rx="${rx}" style="fill:${fill}"/>`;
        continue;
      }
      if (i < elapsed) {
        fills += `<rect x="${x}" y="${y}" width="${t}" height="${t}" rx="${rx}" style="fill:var(--wash-l1-${a})"/>`;
      } else {
        fills += `<rect x="${x}" y="${y}" width="${t}" height="${t}" rx="${rx}" style="fill:var(--tile)"/>`;
        if (i === elapsed) {
          // the wash rises inside the tile: clipped to the tile so its corners stay round
          const h = Math.round(t * part);
          fills += `<clipPath id="w-now-${i}"><rect x="${x}" y="${y}" width="${t}" height="${t}" rx="${rx}"/></clipPath><rect x="${x}" y="${y + t - h}" width="${t}" height="${h}" clip-path="url(#w-now-${i})" style="fill:var(--wash-l1-${a})"/>`;
          const o = Math.min(5.5, t / d * 0.28) * d;
          marks += `<circle cx="${x + o}" cy="${y + o}" r="${2.5 * d}" style="fill:var(--signal)"/>`;
        }
      }
    }
    const size = W2 / d;
    const host = el(target);
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    host.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${W2} ${W2}" style="display:block" aria-hidden="true">${fills}${marks}</svg>`;
    return { el: host, size };
  };

  /* the focus session the screens show: 25 minutes, 12:41 left, so 12 whole minutes gone and the
     13th 19 seconds in. Task and area from the demo data (the next step, 커리어). */
  W.focus = function (doc) {
    const total = 25 * 60, left = 12 * 60 + 41, gone = total - left;
    return { task: doc.view.nextStep.text, area: A.areaIndex(doc, doc.view.nextStep.area), areaName: doc.view.nextStep.area, left: '12:41', elapsed: Math.floor(gone / 60), part: (gone % 60) / 60 };
  };

  /* W.live(target, doc) — the focus Live Activity on the Lock Screen, 358 wide. A white ground
     (activityBackgroundTint), 14pt margins. The minute grid is the picture; beside it the printed
     label, the task in writing ink, the time left in Pretendard Bold, and one control (pause). */
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
