/*
 * 여덟 빛깔 (direction B) — shared drawing code for the mockups. Everything hangs off window.B.
 * Needs tokens.css (same folder) for colours and the .b-* classes.
 *
 *   <link rel="stylesheet" href="/tools/design-mockups/kit.css">
 *   <link rel="stylesheet" href="/docs/design/mockups/b/tokens.css">
 *   <script src="/docs/design/mockups/b/shared.js"></script>
 *   <script>
 *     B.load().then((doc) => {
 *       const screen = B.screen();                       // 390 × 844 frame, appended to <body>
 *       screen.append(B.header({ eyebrow: '…', title: doc.coreGoal, action: 'settings' }));
 *       screen.append(B.chart(doc, { tile: 36 }));       // L1 mosaic, 350pt
 *       screen.append(B.tabBar({ active: 'home' }));
 *     });
 *   </script>
 *
 * Every function returns a DOM node (never a string). Nodes are plain divs and inline SVG, laid out with
 * flexbox and absolute positions only, so each maps to a React Native View / react-native-svg element.
 *
 * Index:
 *   B.load()                      data.json plus the derived 81 cells
 *   B.screen()                    the phone frame
 *   B.chart(doc, opts)            the 9×9: L1 mosaic (no text) or L2 map (area names)
 *   B.mark(opts)                  L0: eight dyes round the core, 3×3, no text (icon, logo, tab glyph size)
 *   B.block(doc, which, opts)     one block zoomed to a 3×3 page with text
 *   B.locator(which, opts)        tiny 3×3 that shows which block you are in (the way back from a zoom)
 *   B.miniBlock(doc, area, opts)  one block as nine small tiles, no text
 *   B.header(opts)                S3 header: eyebrow, title, one trailing action
 *   B.tabBar(opts)                S4 floating capsule and the separate 담기 button
 *   B.row(opts) / B.todayRow(doc, row, opts)   S5 list row with its check box
 *   B.check(opts)                 the check box alone
 *   B.tally(n, opts)              正 tally
 *   B.week(week, opts)            seven-day 正 strip
 *   B.figure(opts)                label over a number
 *   B.section(title, link)        section head
 *   B.areaTile(doc, area, opts)   area tile for a 2×4 grid
 *   B.dot(size)                   the today dot
 *   B.glyph(area, size)           the eight area glyphs
 *   B.icon(name, size)            line icons for tools
 *   B.tabGlyph(name, size)        the four tab glyphs
 *   B.tick(size)                  pen tick
 *   B.el(tag, cls, kids)          small DOM helper
 */
(function () {
  const B = {};
  const NS = 'http://www.w3.org/2000/svg';

  /** The eight dye names, in area order. */
  B.DYES = ['쑥', '쪽빛', '황토', '연지', '청자', '오디', '비색', '주홍'];

  /* ───────────── helpers ───────────── */

  /**
   * B.el('div', 'b-row a0', [child, 'text'])  → element.
   * cls may be a string or an object of attributes ({ class, style, … }). kids: node, string or array.
   */
  function el(tag, cls, kids) {
    const n = document.createElement(tag);
    if (typeof cls === 'string') n.className = cls;
    else if (cls) for (const k of Object.keys(cls)) { if (k === 'style' && typeof cls[k] === 'object') Object.assign(n.style, cls[k]); else n.setAttribute(k, cls[k]); }
    for (const k of [].concat(kids === undefined || kids === null ? [] : kids)) if (k !== null && k !== undefined && k !== false) n.append(k);
    return n;
  }
  B.el = el;

  function svg(size, viewBox, inner, w, h) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', w || size);
    s.setAttribute('height', h || size);
    s.setAttribute('viewBox', viewBox);
    s.setAttribute('fill', 'none');
    s.innerHTML = inner;
    return s;
  }
  const px = (v) => `${v}px`;
  const half = (v) => Math.round(v * 2) / 2; // whole device pixels at @2x
  /** Tile radius: 8.5% of the tile, 1.5 to 10pt. A 36pt tile gets 3, a 40pt tile 3.5, a 112pt cell 9.5. */
  B.radius = (t) => Math.max(1.5, Math.min(10, half(t * 0.085)));

  /* ───────────── data ───────────── */

  /**
   * B.load() → Promise<doc>. doc is data.json with two additions:
   *   doc.cells  81 cells, row-major: { row, col, kind: 'core' | 'ring' | 'name' | 'action', area, action, text, done, today, doneToday }
   *              (ring = the eight area tiles round the core, name = the centre of an outer block)
   *   doc.areaIndex(title) → 0..7
   * 'today' is true for the cells that are in doc.view.today.rows.
   */
  B.load = function () {
    return fetch('/tools/design-mockups/data.json').then((r) => r.json()).then(B.prepare);
  };

  /** B.prepare(doc) adds doc.cells and doc.areaIndex to a document you built yourself (for example a first-run document). */
  B.prepare = function (doc) {
    doc.areaIndex = (title) => doc.areas.findIndex((a) => a.title === title);
    const today = new Map();
    for (const r of (doc.view && doc.view.today && doc.view.today.rows) || []) today.set(`${r.area}|${r.text}`, r);
    doc.cells = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const b = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const k = (row % 3) * 3 + (col % 3);
        const skip = (i) => (i < 4 ? i : i - 1);
        let cell;
        if (b === 4 && k === 4) cell = { kind: 'core', area: -1, text: doc.coreGoal };
        else if (b === 4) cell = { kind: 'ring', area: skip(k), text: doc.areas[skip(k)].title };
        else if (k === 4) cell = { kind: 'name', area: skip(b), text: doc.areas[skip(b)].title };
        else {
          const area = skip(b), action = skip(k);
          const a = doc.areas[area].actions[action] || {};
          const t = today.get(`${doc.areas[area].title}|${a.text}`);
          cell = { kind: 'action', area, action, text: a.text || '', done: !!a.done, today: !!t, doneToday: !!(t && t.doneToday), data: a };
        }
        doc.cells.push(Object.assign(cell, { row, col }));
      }
    }
    return doc;
  };

  /**
   * B.blank(doc) → a copy of the document as it is right after onboarding: the goal and the eight area names stay,
   * all 64 actions are unwritten, nothing is done, nothing is due today. Use it for first.html.
   */
  B.blank = function (doc) {
    const copy = JSON.parse(JSON.stringify(doc, (k, v) => (k === 'cells' ? undefined : v)));
    for (const a of copy.areas) { a.done = 0; a.actions = a.actions.map(() => ({ text: '', done: false, kind: 'once' })); }
    copy.view.today = { done: 0, of: 0, rows: [] };
    copy.view.progress = { done: 0, of: 64 };
    return B.prepare(copy);
  };

  /* ───────────── the chart ───────────── */

  /** Break an area name into balanced lines for a map tile: up to 3 syllables on one line, 4 → 2+2, 5–6 → 3+3. */
  B.balance = function (name) {
    const s = String(name).trim();
    if (s.includes(' ')) {
      const words = s.split(/\s+/);
      let best = 1, diff = Infinity;
      for (let i = 1; i < words.length; i++) {
        const d = Math.abs(words.slice(0, i).join('').length - words.slice(i).join('').length);
        if (d < diff) { diff = d; best = i; }
      }
      return s.replace(/\s+/g, '').length <= 3 ? s : `${words.slice(0, best).join(' ')}\n${words.slice(best).join(' ')}`;
    }
    if (s.length <= 3) return s;
    const cut = Math.ceil(s.length / 2);
    return `${s.slice(0, cut)}\n${s.slice(cut)}`;
  };

  /**
   * B.fit(width) → { tile, gap, blockGap, size } for the widest crisp 9×9 that fits in `width`.
   *   B.fit(350) → tile 36, gap 2, blockGap 7 (size 350).   B.fit(386) → tile 40, gap 2, blockGap 7.
   * Below 110pt the gaps tighten (gap 1, blockGap 3) and you should also pass today: false to B.chart.
   */
  B.fit = function (width) {
    const gap = width >= 240 ? 2 : width >= 110 ? 1.5 : 1;
    const blockGap = width >= 240 ? 7 : width >= 110 ? 4.5 : 3;
    const tile = Math.floor(((width - 6 * gap - 2 * blockGap) / 9) * 2) / 2;
    return { tile, gap, blockGap, size: 9 * tile + 6 * gap + 2 * blockGap };
  };

  /**
   * B.chart(doc, opts) → the 9×9 as tiles with gaps. One drawing for L1 and L2; the only difference is the labels.
   *   opts.tile      tile side in pt (default 36 → a 350pt chart). Or spread B.fit(width): B.chart(doc, { ...B.fit(168) }).
   *   opts.gap       gap between tiles (default 2)
   *   opts.blockGap  gap between the nine blocks (default 7)
   *   opts.labels    'none' (default, L1 mosaic) | 'names' (L2 map: the area name on each outer block's centre tile)
   *                  | 'all' (also on the eight ring tiles and the goal on the core; needs tile ≥ 38)
   *   opts.today     draw the today dots (default true; pass false under 110pt)
   *   opts.pick      area index 0..7 or 'center': that block gets the ink selection frame on every tile
   * Tile states come from doc.cells: core (ink), ring and name (pigment), done action (tint), any other action (wash).
   * There is no "written" state and no plus sign: an empty tile is wash. For the first-run chart pass B.blank(doc).
   * The node is exactly size × size, where size = 9·tile + 6·gap + 2·blockGap (also on node.dataset.size).
   */
  B.chart = function (doc, opts) {
    const o = Object.assign({ tile: 36, gap: 2, blockGap: 7, labels: 'none', today: true, pick: null }, opts);
    const { tile: t, gap: g, blockGap: G } = o;
    const size = 9 * t + 6 * g + 2 * G;
    const pos = (i) => i * t + (i - Math.floor(i / 3)) * g + Math.floor(i / 3) * G;
    const r = B.radius(t);
    const root = el('div', { class: 'b-chart', style: { width: px(size), height: px(size) } });
    root.dataset.size = size;
    const dot = Math.max(5, Math.round(t * 0.2)), inset = Math.max(2, Math.round(t * 0.13));
    const fs = t >= 38 ? 11.5 : 11;
    for (const c of doc.cells) {
      const block = Math.floor(c.row / 3) * 3 + Math.floor(c.col / 3);
      const picked = o.pick !== null && (o.pick === 'center' ? block === 4 : block !== 4 && (block < 4 ? block : block - 1) === o.pick);
      const cls = ['b-tile', `is-${c.kind}`, c.area >= 0 ? `a${c.area}` : '', c.done ? 'is-done' : '', picked ? 'is-pick' : ''].join(' ');
      const tileEl = el('div', { class: cls, style: { left: px(pos(c.col)), top: px(pos(c.row)), width: px(t), height: px(t), borderRadius: px(r) } });
      const labelled = (o.labels === 'names' && c.kind === 'name') || (o.labels === 'all' && c.kind !== 'action');
      if (labelled) {
        const text = B.balance(c.text);
        tileEl.append(el('span', { class: 'b-tile__label t-label', style: { fontSize: px(c.kind === 'core' ? 10 : fs), lineHeight: px(c.kind === 'core' ? 12 : fs + 1.5) } }, text));
      }
      if (o.today && c.today) tileEl.append(el('i', { class: 'b-dot', style: { width: px(dot), height: px(dot), right: px(inset), top: px(inset) } }));
      root.append(tileEl);
    }
    return root;
  };

  /**
   * B.mark(opts) → L0, the mark: eight dye tiles round the ink core, no text. It is the centre block of the chart,
   * so the colours sit where they sit in the 9×9. Use it for the app icon, the logo, a splash, a small widget.
   *   opts.size   outer size in pt (default 64). The gap is 6% of the size and the tiles fill the rest.
   *   opts.tile / opts.gap   set both instead of size for exact geometry.
   *   opts.radius corner radius of a tile (default 8.5% of the tile; pass 0 for square tiles)
   * For the 512 icon: B.mark({ tile: 136, gap: 16 }) is 440pt; centre it on a paper-coloured square.
   */
  B.mark = function (opts) {
    const o = Object.assign({ size: 64 }, opts);
    const g = o.gap !== undefined ? o.gap : Math.max(1, half(o.size * 0.06));
    const t = o.tile !== undefined ? o.tile : (o.size - 2 * g) / 3;
    const size = 3 * t + 2 * g;
    const r = o.radius !== undefined ? o.radius : Math.max(1, t * 0.085);
    const root = el('div', { class: 'b-chart b-mark', style: { width: px(size), height: px(size) } });
    for (let k = 0; k < 9; k++) {
      const area = k < 4 ? k : k - 1;
      root.append(el('div', { class: k === 4 ? 'b-tile is-core' : `b-tile is-ring a${area}`, style: { left: px((k % 3) * (t + g)), top: px(Math.floor(k / 3) * (t + g)), width: px(t), height: px(t), borderRadius: px(r) } }));
    }
    return root;
  };

  /**
   * B.miniBlock(doc, area, opts) → one outer block as nine small tiles, no text: pigment centre, tint for done, and
   * paper-coloured tiles for the rest (so it also reads on a wash band).
   *   opts.tile (default 14), opts.gap (default 3), opts.pick  action index 0..7 to frame in ink ("this one").
   */
  B.miniBlock = function (doc, area, opts) {
    const o = Object.assign({ tile: 14, gap: 3, pick: null }, opts);
    const { tile: t, gap: g } = o;
    const root = el('div', { class: `b-chart a${area}`, style: { width: px(3 * t + 2 * g), height: px(3 * t + 2 * g) } });
    for (let k = 0; k < 9; k++) {
      const j = k < 4 ? k : k - 1;
      const a = doc.areas[area].actions[j] || {};
      const cls = k === 4 ? 'b-tile is-name' : `b-tile ${a.done ? 'is-done' : ''} ${o.pick === j ? 'is-pick' : ''}`;
      const n = el('div', { class: cls, style: { left: px((k % 3) * (t + g)), top: px(Math.floor(k / 3) * (t + g)), width: px(t), height: px(t), borderRadius: px(B.radius(t)) } });
      if (k !== 4 && !a.done) n.style.background = 'var(--paper)';
      root.append(n);
    }
    return root;
  };

  /**
   * B.locator(which, opts) → a tiny 3×3 that shows where you are: the current block in its pigment, the others neutral.
   * In a zoomed block it is the way back to the 9×9 and the way to jump to a neighbour.
   *   which       area index 0..7, or 'center'
   *   opts.size   outer size (default 28)
   */
  B.locator = function (which, opts) {
    const o = Object.assign({ size: 28 }, opts);
    const g = 2, t = (o.size - 2 * g) / 3;
    const root = el('div', { class: 'b-chart b-locator', style: { width: px(o.size), height: px(o.size) } });
    for (let k = 0; k < 9; k++) {
      const area = k < 4 ? k : k - 1;
      const on = which === 'center' ? k === 4 : k !== 4 && area === which;
      const cls = on ? (k === 4 ? 'b-tile is-core' : `b-tile is-name a${area}`) : 'b-tile is-off';
      root.append(el('div', { class: cls, style: { left: px((k % 3) * (t + g)), top: px(Math.floor(k / 3) * (t + g)), width: px(t), height: px(t), borderRadius: px(1.5) } }));
    }
    return root;
  };

  /** Default one-line meta for a zoomed cell, from the action's kind. Returns '' when there is nothing to say. */
  B.cellMeta = function (a) {
    const days = ['일', '월', '화', '수', '목', '금', '토']; // data.json counts days from Sunday = 0
    if (!a || !a.text) return '';
    if (a.kind === 'habit' && a.perWeek) return `주 ${a.perWeek}회`;
    if (a.kind === 'habit' && a.days) {
      if (a.days.length === 7) return '매일';
      if (a.days.join() === '1,2,3,4,5') return '평일';
      return a.days.slice().sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)).map((d) => days[d]).join('·'); // Monday first
    }
    if (a.kind === 'mind') return '마음가짐';
    return '';
  };

  /**
   * B.block(doc, which, opts) → one block zoomed to a 3×3 page. This is where all 64 action texts live.
   *   which        area index 0..7, or 'center' (the index page: eight area tiles with their counts round the goal)
   *   opts.size    outer size (default 350)
   *   opts.gap     gap between cells (default 7 → 112pt cells at 350)
   *   opts.meta    (action, index) → string for the bottom line of a cell (default B.cellMeta: 주 3회 / 매일 / 평일 …)
   *   opts.placeholder  (index) → string shown in an unwritten cell (default '' = an empty wash cell). For first-run
   *                invitations pass for example (i) => i === 0 ? '첫 실천 쓰기' : ''.
   *   opts.pick    action index 0..7 to frame in ink (the cell being edited, or the next empty one)
   * Cell states: centre = pigment with the area name (20pt) and its count; done = tint with a pen tick at top left;
   * today = the dot at top right; text is always ink, 16pt (.t-cell), up to three lines of about six syllables.
   */
  B.block = function (doc, which, opts) {
    const o = Object.assign({ size: 350, gap: 7, meta: B.cellMeta, placeholder: () => '', pick: null }, opts);
    const g = o.gap, t = (o.size - 2 * g) / 3;
    const root = el('div', { class: 'b-chart b-block', style: { width: px(o.size), height: px(o.size) } });
    for (let k = 0; k < 9; k++) {
      const j = k < 4 ? k : k - 1;
      const place = { left: px((k % 3) * (t + g)), top: px(Math.floor(k / 3) * (t + g)), width: px(t), height: px(t) };
      let cell;
      if (which === 'center') {
        if (k === 4) cell = el('div', { class: 'b-cell is-core', style: place }, el('span', 'b-cell__goal', doc.coreGoal));
        else cell = el('div', { class: `b-cell is-ring a${j}`, style: place }, [el('span', 'b-cell__name', doc.areas[j].title), el('span', 'b-cell__count', `${doc.areas[j].done}/${doc.areas[j].of}`)]);
      } else if (k === 4) {
        const a = doc.areas[which];
        cell = el('div', { class: `b-cell is-name a${which}`, style: place }, [el('span', 'b-cell__name', a.title), el('span', 'b-cell__count', `${a.done}/${a.of}`)]);
      } else {
        const c = doc.cells.find((x) => x.kind === 'action' && x.area === which && x.action === j);
        const blank = !c.text;
        cell = el('div', { class: `b-cell a${which} ${c.done ? 'is-done' : ''} ${blank ? 'is-blank' : ''} ${o.pick === j ? 'is-pick' : ''}`, style: place });
        cell.append(el('span', 'b-cell__text t-cell', blank ? o.placeholder(j) : c.text));
        const meta = blank ? '' : o.meta(c.data, j);
        if (meta) cell.append(el('span', 'b-cell__meta', meta));
        if (c.done) cell.append(el('span', 'b-cell__tick', B.tick(18)));
        if (c.today) cell.append(B.dot(12));
      }
      root.append(cell);
    }
    return root;
  };

  /* ───────────── marks ───────────── */

  /** B.dot(size = 8) → the today dot: 치자 fill, 1px ring. The only signal shape; do not draw today any other way. */
  B.dot = function (size) {
    const s = size || 8;
    return el('i', { class: 'b-dot', style: { width: px(s), height: px(s) } });
  };

  /** B.tick(size = 18) → pen tick (stroke in currentColor). For done cells and anywhere a finished thing is marked. */
  B.tick = function (size) {
    return svg(size || 18, '0 0 18 18', '<path d="M3.2 9.6 L7.2 13.8 C9.4 9.6 12.2 6 15.6 3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');
  };

  /**
   * B.check(opts) → the check box (S5): a 24pt tile, always on the leading side of a row.
   *   opts.area  0..7 (edge in the area's pigment, wash inside), or null for a neutral box
   *   opts.done  tint fill and an ink pen tick that overshoots the box at the top right
   *   opts.small 20pt version for trailing use
   */
  B.check = function (opts) {
    const o = Object.assign({ area: null, done: false, small: false }, opts);
    const box = el('span', `b-check ${o.area === null ? 'a-none' : `a${o.area}`} ${o.done ? 'is-done' : ''} ${o.small ? 'b-check--sm' : ''}`);
    if (o.done) box.append(svg(32, '0 0 32 32', '<path d="M6.6 19.6 L11.6 25 C15 18.4 20.4 11.6 28.2 5.2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'));
    return box;
  };

  /** 正, five strokes in writing order on a 22 box (the app's own geometry, src/components/Tally.tsx). */
  const STROKES = ['M3 3.5H19', 'M11 3.5V18.5', 'M11 11H17', 'M5 11V18.5', 'M2.5 18.5H19.5'];

  /**
   * B.tally(n, opts) → 正 tally for a count: one stroke per time, five strokes make 正. Over five it draws one 正
   * per five (side by side) and the rest as strokes of the next one.
   *   opts.size   height of one 正 (default 22)   opts.stroke  stroke width on the 22 box (default 1.8)
   * n = 0 returns an empty box of the same size, so rows keep their rhythm.
   */
  B.tally = function (n, opts) {
    const o = Object.assign({ size: 22, stroke: 1.8 }, opts);
    const count = Math.max(0, n || 0);
    const glyphs = Math.max(1, Math.ceil(count / 5));
    let inner = '';
    for (let gi = 0; gi < glyphs; gi++) {
      const strokes = Math.min(5, count - gi * 5);
      for (let s = 0; s < strokes; s++) inner += `<path transform="translate(${gi * 24} 0)" d="${STROKES[s]}" stroke="currentColor" stroke-width="${o.stroke}" stroke-linecap="round"/>`;
    }
    const w = glyphs * 22 + (glyphs - 1) * 2;
    const s = svg(o.size, `0 0 ${w} 22`, inner, (o.size * w) / 22, o.size);
    s.setAttribute('class', 'b-tally');
    return s;
  };

  /**
   * B.week(week, opts) → the seven-day 正 strip. `week` is doc.view.week ({ days: [[letter, count | null, 'today'?], …] }).
   * Each day is a small tile with that day's 正 strokes and its letter below. Today's tile has the ink frame and the dot.
   * A day with null is still to come: an empty tile.
   *   opts.tile  tile side (default 22 → the strip is 172pt wide)   opts.gap (default 3)
   */
  B.week = function (week, opts) {
    const o = Object.assign({ tile: 22, gap: 3 }, opts);
    const root = el('div', { class: 'b-week', style: { gap: px(o.gap) } });
    for (const [letter, count, flag] of week.days) {
      const isToday = flag === 'today';
      const tileEl = el('div', { class: 'b-week__tile', style: { width: px(o.tile), height: px(o.tile), borderRadius: px(B.radius(o.tile) + 0.5) } }, count ? B.tally(count, { size: Math.round(o.tile * 0.64), stroke: 2.2 }) : null);
      const day = el('div', { class: `b-week__day ${isToday ? 'is-today' : ''}`, style: { width: px(o.tile) } }, [tileEl, el('span', 'b-week__letter', letter)]);
      if (isToday) day.append(B.dot(8));
      root.append(day);
    }
    return root;
  };

  /* ───────────── glyphs and icons ───────────── */

  /** The app's eight area glyphs (src/components/AreaIcons.tsx): 맥박 서류함 책 두 사람 엽전 붓 숨 산. 24 grid. */
  const AREA_GLYPHS = [
    '<path d="M3 13 H8.5 L10.7 6.5 L13.8 17.5 L15.8 13 H21"/>',
    '<path d="M4.5 8.5 h15 a1.5 1.5 0 0 1 1.5 1.5 v7 a1.5 1.5 0 0 1 -1.5 1.5 h-15 a1.5 1.5 0 0 1 -1.5 -1.5 v-7 a1.5 1.5 0 0 1 1.5 -1.5 Z"/><path d="M9 8.5 V7 a1.5 1.5 0 0 1 1.5 -1.5 h3 a1.5 1.5 0 0 1 1.5 1.5 v1.5"/><path d="M3 12.5 h18"/>',
    '<path d="M12 7.5 V19"/><path d="M12 7.5 C9.7 6.3 6.3 6.6 4.7 7 V17.4 C6.3 17 9.7 16.7 12 18"/><path d="M12 7.5 C14.3 6.3 17.7 6.6 19.3 7 V17.4 C17.7 17 14.3 16.7 12 18"/>',
    '<circle cx="8.6" cy="8.4" r="2.4"/><circle cx="15.4" cy="8.4" r="2.4"/><path d="M4.5 18 C4.5 14.4 7 13 8.6 13 C10.2 13 11.5 13.9 12 15"/><path d="M12 15 C12.5 13.9 13.8 13 15.4 13 C17 13 19.5 14.4 19.5 18"/>',
    '<circle cx="12" cy="12" r="8.5"/><path d="M10 10 h4 v4 h-4 Z"/>',
    '<path d="M19 5 L12.5 11.5"/><path d="M11.2 10.2 L13.8 12.8"/><path d="M11.8 11.2 C9.6 12.8 7 16 5.5 19 C8.5 17.5 11.7 14.9 13.3 12.7 Z"/>',
    '<path d="M6 7 C8 5.3 10 5.3 12 7 S16 8.7 18 7"/><path d="M6 12 C8 10.3 10 10.3 12 12 S16 13.7 18 12"/><path d="M6 17 C8 15.3 10 15.3 12 17 S16 18.7 18 17"/>',
    '<circle cx="16.5" cy="6.5" r="1.6"/><path d="M3 18.5 L9 9 L12.5 14 L15.5 9.5 L21 18.5 Z"/>',
  ];

  /**
   * B.glyph(area, size = 14) → the area's glyph, stroked in currentColor. Colour always comes with this shape or
   * the area's name (S6). Inside an .aN element set color: var(--aink) on paper or wash, var(--on-pigment) on pigment.
   */
  B.glyph = function (area, size) {
    const s = size || 14;
    return svg(s, '0 0 24 24', `<g stroke="currentColor" stroke-width="${s <= 16 ? 2.2 : 1.9}" stroke-linecap="round" stroke-linejoin="round">${AREA_GLYPHS[area]}</g>`);
  };

  const ICONS = {
    settings: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
    share: '<path d="M12 15V4M8 7.5 12 3.5l4 4M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-1"/>',
    chevron: '<path d="M9.5 6l6 6-6 6"/>',
    back: '<path d="M14.5 6l-6 6 6 6"/>',
    down: '<path d="M6 9.5l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    more: '<circle cx="5.5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor"/>',
    edit: '<path d="M4.5 19.5l1-4L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5z"/>',
    pin: '<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/>',
    list: '<path d="M9 7h11M9 12h11M9 17h11"/><path d="M4 7h1M4 12h1M4 17h1"/>',
  };

  /**
   * B.icon(name, size = 20) → line icon in currentColor for tools: settings, share, chevron, back, down, plus, close,
   * more, edit, pin, list. System verbs; in the app these become SF Symbols on iOS.
   */
  B.icon = function (name, size) {
    const s = size || 20;
    return svg(s, '0 0 24 24', `<g stroke="currentColor" stroke-width="${s <= 16 ? 2.2 : 1.75}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</g>`);
  };

  /** B.tool(name) → a 40pt round tool button with an icon (header action, close, back). */
  B.tool = function (name) {
    return el('span', 'b-tool', B.icon(name, 20));
  };

  /* Tab glyphs: drawn from the chart's tiles (6pt tiles, 2pt gaps, on a 24 box). Filled in both states;
     the state is carried by colour and the capsule highlight. */
  const TILE = (x, y, w, h, extra) => `<rect x="${x}" y="${y}" width="${w === undefined ? 6 : w}" height="${h === undefined ? 6 : h}" rx="1.6" ${extra || ''}/>`;
  const TAB_GLYPHS = {
    // a house standing on the tile module: square body, pitched roof, a tile for the door
    home: '<path fill="currentColor" fill-rule="evenodd" d="M12.9 2.9a1.4 1.4 0 0 0-1.8 0L3.5 9.3A1.4 1.4 0 0 0 3 10.4v9.2A1.4 1.4 0 0 0 4.4 21h15.2a1.4 1.4 0 0 0 1.4-1.4v-9.2a1.4 1.4 0 0 0-.5-1.1zM9.6 13.2a.8.8 0 0 1 .8-.8h3.2a.8.8 0 0 1 .8.8V21H9.6z"/>',
    // L0: eight tiles round the core. The ring is lighter so the centre reads as the heart
    chart: `<g fill="currentColor"><g opacity="0.5">${[0, 1, 2, 3, 5, 6, 7, 8].map((k) => TILE(1 + (k % 3) * 8, 1 + Math.floor(k / 3) * 8)).join('')}</g>${TILE(9, 9)}</g>`,
    // the app's own check box: a tile with the pen tick overshooting it
    today: '<rect x="2.5" y="5.5" width="16" height="16" rx="3.4" fill="currentColor"/><path d="M6.6 13.4 L10 17 C12 12.8 15.6 8 21.6 2.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.6 13.4 L10 17 C11.6 13.6 14.2 9.8 18 6.2" stroke="var(--glyph-cut, var(--paper))" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    // bars stacked from tiles
    stats: `<g fill="currentColor">${TILE(1, 17)}${TILE(9, 17)}${TILE(9, 9)}${TILE(17, 17)}${TILE(17, 9)}${TILE(17, 1)}</g>`,
  };

  /** B.tabGlyph(name, size = 24) → one of the four tab glyphs: 'home' | 'chart' | 'today' | 'stats'. currentColor. */
  B.tabGlyph = function (name, size) {
    return svg(size || 24, '0 0 24 24', TAB_GLYPHS[name]);
  };

  /* ───────────── page furniture ───────────── */

  /** B.screen() → the 390 × 844 frame, already appended to <body>. Append the header first, the tab bar last. */
  B.screen = function () {
    const s = el('div', 'b-screen');
    document.body.append(s);
    return s;
  };

  /**
   * B.header(opts) → the one header anatomy (S3). 84pt tall on every tab, title baseline at the same height.
   *   opts.eyebrow  string or node. The line is reserved even when empty, so the title never jumps.
   *   opts.today    true puts the today dot before the eyebrow (use it on the line that carries today's date)
   *   opts.title    string. One line; on 홈 and 만다라트 it is the user's goal.
   *   opts.action   icon name for the single trailing tool ('settings', 'share', 'more', 'list', 'close' …), a node, or null
   *   opts.leading  node placed before the eyebrow text (for example B.locator(0) in a zoomed block)
   */
  B.header = function (opts) {
    const o = Object.assign({ eyebrow: '', title: '', action: null, today: false, leading: null }, opts);
    const eyebrow = el('div', 't-eyebrow b-header__eyebrow', [o.leading, o.today ? B.dot(8) : null, typeof o.eyebrow === 'string' ? el('span', null, o.eyebrow) : o.eyebrow]);
    const head = el('header', 'b-header', [eyebrow, el('h1', 't-title b-header__title', o.title)]);
    head.querySelector('h1').style.marginBlock = '4px 0';
    if (o.action) head.append(el('div', 'b-header__action', typeof o.action === 'string' ? B.tool(o.action) : o.action));
    return head;
  };

  /**
   * B.tabBar(opts) → floating navigation (S4): a capsule with the four places and, beside it, 담기 as its own solid
   * ink button. Absolutely placed at the bottom of .b-screen; content runs underneath.
   *   opts.active  'home' | 'chart' | 'today' | 'stats'
   */
  B.tabBar = function (opts) {
    const o = Object.assign({ active: 'home' }, opts);
    const tabs = [['home', '홈'], ['chart', '만다라트'], ['today', '오늘'], ['stats', '통계']];
    const capsule = el('div', 'b-tabbar__capsule', tabs.map(([key, label]) => {
      const item = el('div', `b-tabbar__item ${o.active === key ? 'is-active' : ''}`, [B.tabGlyph(key, 24), el('span', 't-tab', label)]);
      if (o.active === key) item.style.setProperty('--glyph-cut', 'var(--raised-2)');
      return item;
    }));
    const add = el('div', { class: 'b-tabbar__add', 'aria-label': '담기' }, B.icon('plus', 26));
    add.querySelector('g').setAttribute('stroke-width', '2.2');
    return el('nav', 'b-tabbar', [capsule, add]);
  };

  /**
   * B.section(title, link) → section head. `link` (optional string) becomes an ink link with a chevron on the right.
   * Tappable text is always ink; grey is never interactive (S5).
   */
  B.section = function (title, link) {
    return el('div', 'b-section', [el('h2', { class: 't-head', style: { margin: '0' } }, title), link ? el('span', 'b-link', [link, B.icon('chevron', 14)]) : null]);
  };

  /**
   * B.figure(opts) → a label over a confident number.
   *   opts.label  '오늘'     opts.value  '1'     opts.of  '10' (drawn as /10 in ink-2)     opts.unit  '칸'
   */
  B.figure = function (opts) {
    const o = Object.assign({ label: '', value: '', of: null, unit: null }, opts);
    return el('div', 'b-figure', [
      el('span', 'b-figure__label t-caption', o.label),
      el('span', 'b-figure__value t-figure', [String(o.value), o.of !== null ? el('span', 'b-figure__of', `/${o.of}`) : null, o.unit ? el('span', 'b-figure__unit', o.unit) : null]),
    ]);
  };

  /**
   * B.row(opts) → a list row (S5).
   *   opts.area    0..7 or null. Colours the check box and puts the area's glyph and name at the start of the meta line.
   *   opts.title   one line, Medium
   *   opts.meta    string after the area name (for example '이번 주 0/3회'); '' for none
   *   opts.right   string or node: the one thing on the right (D-2, a figure, a chevron). Leave out for nothing.
   *   opts.quiet   true draws `right` as a quiet label (ink-2, Medium) and not as a figure
   *   opts.done    done row: checked box, title struck through in ink-2
   *   opts.check   false leaves the box out (for rows that are not tasks); the title then starts at the gutter
   *   opts.areaName  override the area name shown (default doc-independent: pass it yourself, or use B.todayRow)
   */
  B.row = function (opts) {
    const o = Object.assign({ area: null, title: '', meta: '', right: null, quiet: false, done: false, check: true, areaName: '' }, opts);
    const metaKids = [];
    if (o.area !== null && o.areaName) metaKids.push(el('span', 'b-row__area', [B.glyph(o.area, 14), o.areaName]));
    if (o.meta) metaKids.push(el('span', null, (metaKids.length ? '· ' : '') + o.meta));
    const body = el('div', 'b-row__body', [el('div', 't-row b-row__title', o.title), metaKids.length ? el('div', 't-meta b-row__meta', metaKids) : null]);
    const right = o.right ? el('div', `b-row__right ${o.quiet ? 'b-row__right--quiet' : ''}`, o.right) : null;
    return el('div', `b-row ${o.area === null ? 'a-none' : `a${o.area}`} ${o.done ? 'is-done' : ''}`, [o.check ? B.check({ area: o.area, done: o.done }) : null, body, right]);
  };

  /**
   * B.todayRow(doc, row, opts) → B.row for one entry of doc.view.today.rows ({ text, area, meta, right, doneToday }).
   * opts are passed on to B.row and win (for example { right: '이번 주 중점', quiet: true } for a pinned row).
   */
  B.todayRow = function (doc, row, opts) {
    return B.row(Object.assign({ area: doc.areaIndex(row.area), areaName: row.area, title: row.text, meta: row.meta || '', right: row.right || null, done: !!row.doneToday }, opts));
  };

  /**
   * B.areaTile(doc, area, opts) → an area as a tile for a 2×4 grid (Home's eight areas, Stats): wash ground, glyph and
   * name in the area's ink, the count, and either eight pips or the next action.
   *   opts.width / opts.height  size (default 83 × 83; four across with 6pt gaps fill 350)
   *   opts.next   true shows the area's next action (doc.view.areaLedger) in place of the pips. One line, so give
   *               the tile at least 130pt of width (two across) when you use it.
   */
  B.areaTile = function (doc, area, opts) {
    const o = Object.assign({ width: 83, height: 83, next: false }, opts);
    const a = doc.areas[area];
    const ledger = (doc.view.areaLedger || [])[area] || [];
    const foot = o.next ? el('div', 'b-area__next', ledger[2] || '') : el('div', 'b-pips', a.actions.map((x) => el('i', x.done ? 'is-done' : '')));
    return el('div', { class: `b-area a${area}`, style: { width: px(o.width), height: px(o.height) } }, [
      el('div', 'b-area__name', [B.glyph(area, 14), a.title]),
      el('div', null, [el('div', 'b-area__count', [String(a.done), el('span', null, `/${a.of}`)]), el('div', { style: { height: '5px' } }), foot]),
    ]);
  };

  window.B = B;
})();
