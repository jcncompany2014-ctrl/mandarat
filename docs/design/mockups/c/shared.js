/* ─────────────────────────────────────────────────────────────────────────────
   C. 먹과 주홍 — shared drawing code for the direction mockups (not app code).
   Needs: kit.css, fonts.css, tokens.css (this folder). Every colour is a CSS
   variable from tokens.css, so the same calls draw the dark screen.

   Quick start (see home.html, chart.html and _kit.html for working pages):

     <body class="c-screen"><main id="page" class="c-page"></main>
     <script src="/docs/design/mockups/c/shared.js"></script>
     <script>
       C.load().then((data) => {
         const page = document.getElementById('page');
         page.append(C.header({ eyebrow: '10월 14일 수요일', title: '오늘', action: 'more' }));
         const sec = C.section({ title: '오늘 할 일' });
         sec.append(C.row({ title: '이력서 갱신', area: '커리어', color: data.color('커리어'), right: 'D-2' }));
         page.append(sec, C.tabBar({ active: 'today' }));
       });
     </script>

   Every function returns a DOM element (nothing is appended for you).
   Index: load · header · section · row · check · tick · flag · area · figure ·
          textAction · tally · weekStrip · tabBar · glyph · chartL0 · chartL1 ·
          chartL2 · chartCells
   ───────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var DATA_URL = '/tools/design-mockups/data.json';
  var DPR = global.devicePixelRatio || 2; // rules are computed in device pixels so they land on whole pixels

  /* h('div.a.b', {style: {...}, html: '…', any-attribute: '…'}, ...children) → element. Internal helper, also exported as C.h. */
  function h(sel, props) {
    var parts = sel.split('.');
    var el = document.createElement(parts[0] || 'div');
    if (parts.length > 1) el.className = parts.slice(1).join(' ');
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { if (s.indexOf('--') === 0) el.style.setProperty(s, v[s]); else el.style[s] = v[s]; });
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'class') el.className += ' ' + v;
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) kid.forEach(function (k) { add(el, k); });
    else el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  function px(devicePixels) { return devicePixels / DPR + 'px'; }

  /* C.load() → Promise<data>. Fetches the shared demo document and waits for the faces, so text can be
     measured. Adds data.color(areaTitle) → the area's hex. Call once, then draw. */
  function load() {
    var faces = ['500 16px Pretendard', '800 28px Pretendard', '600 20px "Barlow Condensed"'];
    return Promise.all([
      fetch(DATA_URL).then(function (r) { return r.json(); }),
      Promise.all(faces.map(function (f) { return document.fonts.load(f, '0123456789가'); })),
    ]).then(function (res) {
      var data = res[0];
      data.color = function (title) {
        var a = data.areas.filter(function (x) { return x.title === title; })[0];
        return a ? a.color : 'var(--ink-3)';
      };
      return data;
    });
  }

  /* ── glyphs ───────────────────────────────────────────────────────────────
     Drawn on the chart's geometry: a 24 unit square, 2 unit ink strokes, butt caps, mitred corners,
     and one filled cell where it helps. Not Lucide.
     C.glyph(name, size = 24) → <svg>. Names: home, chart, today, stats (the four tabs), add (담기),
     settings, more, edit, chevron, back, close. Colour follows `color` of the parent. */
  var GLYPHS = {
    home: '<path d="M4 11.4 12 4.4l8 7V20H4z"/><rect class="f" x="9.5" y="13" width="5" height="5"/>',
    chart: '<rect x="4" y="4" width="16" height="16"/><path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" stroke-width="1.2"/><rect class="f" x="9.33" y="9.33" width="5.34" height="5.34"/>',
    today: '<path d="M18 11.5V20H4V6h10.5"/><path d="M7.8 12.4l3.3 3.5L20.8 3.6"/>',
    stats: '<path d="M5 5h14M12 5v14M12 12h6.5M7.5 11.5V19M4 19h16"/>',
    add: '<path d="M12 4v16M4 12h16" stroke-width="2.5"/>',
    settings: '<path d="M4 8h7M17 8h3M4 16h3M13 16h7"/><rect x="11.5" y="5.5" width="5" height="5"/><rect x="7.5" y="13.5" width="5" height="5"/>',
    more: '<rect class="f" x="3.5" y="10.5" width="3" height="3"/><rect class="f" x="10.5" y="10.5" width="3" height="3"/><rect class="f" x="17.5" y="10.5" width="3" height="3"/>',
    edit: '<path d="M5 19h4L19.5 8.5l-4-4L5 15z"/><path d="M13 7l4 4" stroke-width="1.2"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    close: '<path d="M5 5l14 14M19 5L5 19"/>',
  };
  function glyph(name, size) {
    size = size || 24;
    return h('span', {
      style: { display: 'inline-flex', width: size + 'px', height: size + 'px', flex: 'none' },
      html: '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter">' +
        '<style>.f{fill:currentColor;stroke:none}</style>' + (GLYPHS[name] || '') + '</svg>',
    });
  }

  /* ── marks ───────────────────────────────────────────────────────────────── */

  /* C.tick({ size = 24, color = 'var(--signal)' }) → <svg>. The pen tick. `size` is the box it belongs to:
     the stroke leaves the box at the top right by about a fifth of the size. Vermilion on the day it is
     made (check boxes, a cell done today); pass color: 'var(--ink)' for a tick from an earlier day. */
  var TICK = 'M4.2 12.7 6.3 10.5 10.5 15.2C15.6 8.2 21.2 1.2 28.2-4.6L29.4-3.2C22.3 3.8 16.6 11.6 11.3 20.6z';
  function tick(o) {
    o = o || {};
    var size = o.size || 24;
    return h('span', { html: '<svg class="c-tick" width="' + size + '" height="' + size + '" viewBox="0 0 24 24"><path d="' + TICK + '" fill="' + (o.color || 'var(--signal)') + '"/></svg>' }).firstChild;
  }

  /* C.flag(size = 8) → <svg>. Today: one vermilion corner, always at the top left of the thing it marks
     (a chart cell, a week-strip cell, beside the word 오늘). Legs: 8 on the 9×9, 14 in a zoomed block, 5 at L1. */
  function flag(size) {
    size = size || 8;
    return h('span', { html: '<svg class="c-flag" width="' + size + '" height="' + size + '" viewBox="0 0 8 8"><path d="M0 0h8L0 8z" fill="var(--signal)"/></svg>' }).firstChild;
  }

  /* C.check({ done = false, small = false }) → element. One printed square: 24pt in rows, 20pt when `small`.
     Done keeps the ink outline and adds the vermilion tick; the box is never filled. */
  function check(o) {
    o = o || {};
    var size = o.small ? 20 : 24;
    return h('span.c-check' + (o.small ? '.c-check--s' : ''), { role: 'checkbox', 'aria-checked': o.done ? 'true' : 'false' }, o.done ? tick({ size: size }) : null);
  }

  /* C.area({ name, color }) → element. The 8pt colour mark and the area's name, always together.
     This and the chart's head cells are the only places an area colour is allowed. */
  function area(o) {
    return h('span.c-area', {}, h('span.c-area__mark', { style: { '--a': o.color } }), o.name);
  }

  /* C.figure({ label, value, of, unit, size = 'xl' | 'l' | 'm', mark = 'today' | 'done' | null }) → element.
     A small heavy label over a condensed numeral: value in ink, "/of" in grey, unit in Pretendard.
     mark 'today' puts the vermilion corner before the label; 'done' puts a wash cell with an ink tick. */
  function figure(o) {
    var size = o.size || 'xl';
    var mark = null;
    if (o.mark === 'today') mark = flag(8);
    if (o.mark === 'done') mark = h('span', { style: { position: 'relative', width: '10px', height: '10px', background: 'var(--wash)', flex: 'none' } }, h('span', { style: { position: 'absolute', left: '1.5px', top: '1.5px', display: 'block' } }, tick({ size: 7, color: 'var(--ink)' })));
    return h('div.c-figure', {},
      h('div.c-figure__label.c-label', {}, mark, o.label),
      h('div.c-figure__value', {},
        h('span.c-fig.c-fig-' + size, {}, String(o.value), o.of != null ? h('span.c-figure__of', {}, '/' + o.of) : null),
        o.unit ? h('span.c-unit', {}, o.unit) : null));
  }

  /* C.textAction(label, { back = false }) → element. Tappable text is ink, bold, with a chevron. */
  function textAction(label, o) {
    o = o || {};
    return h('span.c-textaction.c-action', { role: 'button' }, o.back ? glyph('back', 14) : null, label, o.back ? null : glyph('chevron', 14));
  }

  /* C.tally(n, { size = 20, color = 'currentColor' }) → element. 正 tally: one stroke per time, five strokes
     make one 正, a sixth starts the next. n = 0 or null draws nothing (an empty day is paper). */
  var STROKES = ['M2 3h16', 'M10 3v14', 'M10 10h6.5', 'M5 9.5V17', 'M1 17h18'];
  function tally(n, o) {
    o = o || {};
    var size = o.size || 20;
    var wrap = h('span.c-week__tally', { style: { height: size + 'px', color: o.color || 'currentColor' }, 'aria-label': (n || 0) + '번' });
    n = n || 0;
    for (var g = 0; g < Math.ceil(n / 5); g++) {
      var k = Math.min(5, n - g * 5);
      wrap.append(h('span', { html: '<svg class="c-tally" width="' + size + '" height="' + size + '" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="' + STROKES.slice(0, k).join('') + '"/></svg>' }).firstChild);
    }
    return wrap;
  }

  /* ── page furniture ──────────────────────────────────────────────────────── */

  /* C.header({ eyebrow, title, action = 'settings' | 'more' | 'edit' | 'close' | null, bar = true }) → element.
     The one header anatomy (S3): a reserved 16pt eyebrow line, a 28pt title, one trailing action, and the
     3pt ink bar at y = 80. Same height on every tab. Pass bar: false when a chart frame starts at y = 80
     (the frame is the bar). eyebrow may be a string or a node; it is reserved even when empty. */
  function header(o) {
    return h('header.c-header' + (o.bar === false ? '.c-header--nobar' : ''), {},
      h('div.c-header__eyebrow.c-eyebrow', {}, o.eyebrow || ' '),
      h('h1.c-header__title.c-title', {}, o.title),
      o.action ? h('div.c-header__action', { role: 'button', 'aria-label': o.action }, glyph(o.action, 24)) : null,
      o.bar === false ? null : h('div.c-header__bar'));
  }

  /* C.section({ title, trailing }) → element. A 2pt ink rule, then a 40pt head with a small heavy label.
     Append rows (or anything) to the returned element. `trailing` is an optional node or string on the
     right of the head: a figure or a C.textAction. Omit `title` to get the rule alone. */
  function section(o) {
    o = o || {};
    return h('section.c-sec', {},
      o.title ? h('div.c-sec__head', {}, h('h2.c-section', { style: { margin: 0 } }, o.title), o.trailing ? h('div.c-sec__trail', {}, o.trailing) : null) : null);
  }

  /* C.row({ title, area, color, meta, strong, right, done, check = true, chevron = false }) → element.
     One list row (S5): check box on the leading side, one title (Medium), one meta line, at most one thing
     on the right.
       area + color → the colour mark and area name at the start of the meta line
       meta         → plain statement after it ("이번 주 0/3회", "매일 반복")
       strong       → a last meta item in ink bold ("이번 주 중점")
       right        → a short figure such as "D-2" (set in the condensed face), or a node
       done         → vermilion tick, title struck through in grey
       check: false → no check box (navigation rows); chevron: true → trailing chevron */
  function row(o) {
    var metaBits = [];
    if (o.area) metaBits.push(area({ name: o.area, color: o.color }));
    if (o.meta) metaBits.push(h('span', {}, o.meta));
    if (o.strong) metaBits.push(h('span.c-strong', {}, o.strong));
    var meta = [];
    metaBits.forEach(function (b, i) { if (i) meta.push(h('span.c-dot', {}, '·')); meta.push(b); });
    var right = null;
    if (o.right) right = typeof o.right === 'string' ? h('span.c-fig.c-fig-m', {}, o.right) : o.right;
    return h('div.c-row' + (o.done ? '.c-row--done' : ''), {},
      o.check === false ? null : check({ done: o.done }),
      h('div.c-row__text', {},
        h('div.c-row__title.c-body', {}, o.title),
        meta.length ? h('div.c-row__meta.c-meta', {}, meta) : null),
      right || o.chevron ? h('div.c-row__right', {}, right, o.chevron ? glyph('chevron', 16) : null) : null);
  }

  /* C.weekStrip(week) → element. `week` is data.view.week: { days: [[name, count | null, 'today'?], …] }.
     Seven printed cells (the chart's own cell): weekday letter, 正 tally. Today carries the vermilion corner
     and an ink letter; days with nothing are paper. Put it inside a C.section({ title: week.label, … }). */
  function weekStrip(week) {
    return h('div.c-week', {}, week.days.map(function (d) {
      var today = d[2] === 'today';
      return h('div.c-week__day' + (today ? '.c-week__day--today' : ''), {},
        today ? flag(8) : null,
        h('span.c-week__name.c-label', {}, d[0]),
        tally(d[1], { size: 20 }));
    }));
  }

  /* C.tabBar({ active = 'home' | 'chart' | 'today' | 'stats' }) → element (S4). Absolutely positioned at
     the bottom of the screen: an ink capsule holding the four places, and 담기 as its own ink circle on the
     trailing side. The selected place is a paper pill inside the capsule (inner radius = outer − 4).
     Content scrolls beneath both; there is no rule and no backdrop. Append it last, to the page. */
  var TABS = [['home', '홈'], ['chart', '만다라트'], ['today', '오늘'], ['stats', '통계']];
  function tabBar(o) {
    o = o || {};
    return h('nav.c-tabbar', {},
      h('div.c-tabbar__capsule', {}, TABS.map(function (t) {
        return h('div.c-tabbar__tab' + (t[0] === o.active ? '.c-tabbar__tab--on' : ''), { role: 'tab', 'aria-selected': t[0] === o.active ? 'true' : 'false' },
          glyph(t[0], 22), h('span.c-label', {}, t[1]));
      })),
      h('div.c-tabbar__add', { role: 'button', 'aria-label': '담기' }, glyph('add', 26)));
  }

  /* ── the chart (S1): one drawing at three levels of detail ──────────────────
     Marks, and there are only three:
       structure  the core (ink) and the 16 area-name cells (solid area colour). Constant from day 1.
       done       an ink wash under the text, and a small pen tick at the top right
       today      a vermilion corner at the top left of a cell on today's list. When that cell is
                  ticked today, the corner goes and the tick is vermilion until the day closes.
     Empty cells are paper. No plus signs, no bars, no legend. */

  /* C.chartCells(data) → 9 rows × 9 cells: { kind: 'core' | 'head' | 'action', area, color, text, done,
     today: 'todo' | 'done' | null }. The layout rule from data.json's note, in one place. Use it when you
     draw a zoomed block yourself: block b of the 3×3 is rows 3·⌊b/3⌋… and columns 3·(b mod 3)…. */
  function chartCells(data) {
    var todayMap = {};
    ((data.view && data.view.today && data.view.today.rows) || []).forEach(function (r) { todayMap[r.area + '|' + r.text] = r.doneToday ? 'done' : 'todo'; });
    var rows = [];
    for (var r = 0; r < 9; r++) {
      var line = [];
      for (var c = 0; c < 9; c++) {
        var block = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        var pos = (r % 3) * 3 + (c % 3);
        var cell;
        if (block === 4) {
          if (pos === 4) cell = { kind: 'core', text: data.coreGoal || '' };
          else { var a = data.areas[pos < 4 ? pos : pos - 1]; cell = { kind: 'head', area: a.title, color: a.color, text: a.title }; }
        } else {
          var ar = data.areas[block < 4 ? block : block - 1];
          if (pos === 4) cell = { kind: 'head', area: ar.title, color: ar.color, text: ar.title };
          else {
            var act = (ar.actions || [])[pos < 4 ? pos : pos - 1] || { text: '' };
            cell = { kind: 'action', area: ar.title, color: ar.color, text: act.text || '', done: !!act.done, today: todayMap[ar.title + '|' + act.text] || null };
          }
        }
        line.push(cell);
      }
      rows.push(line);
    }
    return rows;
  }

  // widths in device pixels → positions of nine cells with hairlines between cells and block rules between blocks
  function lattice(total, frame, block, hair) {
    var cell = Math.floor((total - 2 * frame - 2 * block - 6 * hair) / 9);
    var pos = [];
    var x = frame;
    for (var i = 0; i < 9; i++) { pos.push(x); x += cell; if (i < 8) x += i % 3 === 2 ? block : hair; }
    return { cell: cell, pos: pos, size: x + frame, frame: frame, block: block, hair: hair };
  }
  function drawRules(root, g) {
    for (var pass = 0; pass < 2; pass++) { // hairlines first, block rules on top
      for (var i = 0; i < 8; i++) {
        var isBlock = i % 3 === 2;
        if ((pass === 0) === isBlock) continue;
        var w = isBlock ? g.block : g.hair;
        if (!w) continue;
        var at = g.pos[i] + g.cell;
        var colour = isBlock ? 'var(--chart-block)' : 'var(--chart-hair)';
        root.append(h('div.c-chart__rule', { style: { left: px(at), top: px(g.frame), width: px(w), height: px(g.size - 2 * g.frame), background: colour } }));
        root.append(h('div.c-chart__rule', { style: { top: px(at), left: px(g.frame), height: px(w), width: px(g.size - 2 * g.frame), background: colour } }));
      }
    }
    root.append(h('div.c-chart__rule', { style: { inset: 0, border: px(g.frame) + ' solid var(--chart-frame)' } }));
  }
  function cellBox(g, r, c, cls, extra) {
    var style = { left: px(g.pos[c]), top: px(g.pos[r]), width: px(g.cell), height: px(g.cell) };
    if (extra) Object.keys(extra).forEach(function (k) { style[k] = extra[k]; });
    return h('div.c-chart__cell' + cls, { style: style });
  }

  /* C.chartL2(data, { width = 382 }) → element. The sheet: 9×9 with all 81 texts in ink, 10pt.
     Rules are ink in three weights: frame 3pt, block 2pt, cell 1 device pixel. At 382pt the cells are
     41pt. The real width (snapped to pixels) is on el.dataset.size. Lines break by word, numbers stay
     with their units, and no syllable is left alone on a last line. */
  function chartL2(data, o) {
    o = o || {};
    var g = lattice(Math.round((o.width || 382) * DPR), 3 * DPR, 2 * DPR, 1);
    var root = h('div.c-chart.c-chart--l2', { style: { width: px(g.size), height: px(g.size) }, 'data-size': g.size / DPR, role: 'img', 'aria-label': '만다라트 9×9' });
    var inner = g.cell / DPR - 4; // 2pt of air on each side
    var measure = measurer(root);
    chartCells(data).forEach(function (line, r) {
      line.forEach(function (cell, c) {
        var cls = cell.kind === 'core' ? '.c-chart__cell--core' : cell.kind === 'head' ? '.c-chart__cell--head' : cell.done ? '.c-chart__cell--done' : '';
        var box = cellBox(g, r, c, cls, cell.kind === 'head' ? { '--a': cell.color } : null);
        if (cell.kind === 'head') box.style.setProperty('--a', cell.color);
        var lines = cell.text ? breakLines(cell.text, inner, function (s) { return measure(s, cell.kind !== 'action'); }, 3) : [];
        if (lines.length) box.append(h('div.c-chart__text', { html: lines.map(escapeHtml).join('<br>') }));
        if (cell.kind === 'action') {
          if (cell.today === 'todo') box.append(h('span.c-chart__flag', {}, flag(8)));
          var showTick = (cell.done || cell.today === 'done') && lines.length <= 2;
          if (showTick) box.append(h('span.c-chart__tick', { style: { right: '3.5px', top: '3px' } }, tick({ size: 8, color: cell.today === 'done' ? 'var(--signal)' : 'var(--ink)' })));
        }
        root.append(box);
      });
    });
    measure.done();
    drawRules(root, g);
    return root;
  }

  /* C.chartL1(data, { size = 180 }) → element. The thumbnail: the same sheet with no text, 64–240pt.
     Same cells, same colours: solid heads, ink core, wash for done, paper for the rest. Cell hairlines
     and today's corners appear from 100pt. Real size on el.dataset.size (180 → 180, 168 → 171). */
  function chartL1(data, o) {
    o = o || {};
    var size = o.size || 180;
    var frame = size >= 150 ? 2 * DPR : size >= 100 ? Math.round(1.5 * DPR) : DPR;
    var block = size >= 100 ? DPR : 1;
    var hair = size >= 100 ? 1 : 0;
    var g = lattice(Math.round(size * DPR), frame, block, hair);
    var root = h('div.c-chart.c-chart--l1', { style: { width: px(g.size), height: px(g.size) }, 'data-size': g.size / DPR, role: 'img', 'aria-label': '만다라트' });
    var legs = size >= 150 ? 5 : 4;
    chartCells(data).forEach(function (line, r) {
      line.forEach(function (cell, c) {
        var cls = cell.kind === 'core' ? '.c-chart__cell--core' : cell.kind === 'head' ? '.c-chart__cell--head' : (cell.done || cell.today === 'done') ? '.c-chart__cell--done' : '';
        var box = cellBox(g, r, c, cls);
        if (cell.kind === 'head') box.style.setProperty('--a', cell.color);
        if (cell.kind === 'action' && cell.today === 'todo' && size >= 100) box.append(h('span.c-chart__flag', {}, flag(legs)));
        root.append(box);
      });
    });
    drawRules(root, g);
    return root;
  }

  /* C.chartL0({ size = 32, variant = 'color' | 'ink', colors, frame, rule }) → element. The mark, 16–64pt
     (and the app icon): the centre block alone, eight solid area cells round the ink core.
       variant 'color'  the logo: pass colors = data.areas.map(a => a.color)
       variant 'ink'    one colour (currentColor): lattice and core only, for a footer or a glyph
     frame / rule are the outer and inner rule weights in pt; by default size/16 and size/32. */
  function chartL0(o) {
    o = o || {};
    var size = o.size || 32;
    var total = Math.round(size * DPR);
    var frame = Math.max(1, Math.round((o.frame != null ? o.frame : size / 16) * DPR));
    var rule = Math.max(1, Math.round((o.rule != null ? o.rule : size / 32) * DPR));
    var cell = Math.floor((total - 2 * frame - 2 * rule) / 3);
    var real = 3 * cell + 2 * frame + 2 * rule;
    var ink = o.variant === 'ink';
    var lineColour = ink ? 'currentColor' : 'var(--chart-frame)';
    var root = h('div.c-chart.c-chart--l0', { style: { width: px(real), height: px(real), background: ink ? 'transparent' : 'var(--paper)' }, 'data-size': real / DPR, role: 'img', 'aria-label': '만다라트' });
    for (var i = 0; i < 9; i++) {
      var x = frame + (i % 3) * (cell + rule);
      var y = frame + Math.floor(i / 3) * (cell + rule);
      var style = { left: px(x), top: px(y), width: px(cell), height: px(cell) };
      var cls = '';
      if (i === 4) { if (ink) style.background = 'currentColor'; else cls = '.c-chart__cell--core'; }
      else if (ink) style.background = 'transparent';
      else { cls = '.c-chart__cell--head'; style['--a'] = (o.colors || [])[i < 4 ? i : i - 1] || 'var(--ink-3)'; }
      root.append(h('div.c-chart__cell' + cls, { style: style }));
    }
    for (var k = 1; k < 3; k++) {
      var at = frame + k * cell + (k - 1) * rule;
      root.append(h('div.c-chart__rule', { style: { left: px(at), top: 0, width: px(rule), height: '100%', background: lineColour } }));
      root.append(h('div.c-chart__rule', { style: { top: px(at), left: 0, height: px(rule), width: '100%', background: lineColour } }));
    }
    root.append(h('div.c-chart__rule', { style: { inset: 0, border: px(frame) + ' solid ' + lineColour } }));
    return root;
  }

  /* ── fitting Korean into a cell ──────────────────────────────────────────── */
  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function measurer(root) {
    var a = h('span.c-chart__text', { style: { position: 'absolute', visibility: 'hidden', left: '-999px' } });
    var b = h('span.c-chart__cell--head', { style: { position: 'absolute', visibility: 'hidden', left: '-999px' } }, h('span.c-chart__text'));
    document.body.append(a, b);
    var fn = function (s, heavy) { var el = heavy ? b.firstChild : a; el.textContent = s; return el.getBoundingClientRect().width; };
    fn.done = function () { a.remove(); b.remove(); };
    return fn;
  }
  // a number stays with its unit ("주 3회", "300만 원")
  function bindUnits(text) {
    return text
      .replace(/(^|\s)주 (\d)/g, '$1주 $2')
      .replace(/(\d[\d,.]*[만천백억]?) (원|개|권|곳|회|분|번|명|통|가지)(?=\s|$)/g, '$1 $2');
  }
  /* C.breakLines(text, maxWidth, measure, maxLines = 3) → string[]. Word-based, balanced: the fewest lines
     that fit, then the split with the shortest longest line; never one syllable alone on the last line
     when another split exists. `measure(str)` returns a width in px. */
  function breakLines(text, maxW, measure, maxLines) {
    var words = bindUnits(text).split(' ').filter(Boolean);
    var best = null;
    for (var k = 1; k <= Math.min(maxLines || 3, words.length); k++) {
      var found = null;
      splits(words, k).forEach(function (lines) {
        var widths = lines.map(measure);
        var widest = Math.max.apply(null, widths);
        var orphan = lines.length > 1 && lines[lines.length - 1].length === 1;
        var score = widest + (orphan ? 1000 : 0) + (widest > maxW ? 10000 + widest : 0);
        if (!found || score < found.score) found = { lines: lines, score: score, fits: widest <= maxW && !orphan };
      });
      if (found && (!best || found.score < best.score)) best = found;
      if (found && found.fits) return found.lines;
    }
    return best ? best.lines : [text];
  }
  function splits(words, k) {
    if (k === 1) return [[words.join(' ')]];
    var out = [];
    for (var i = 1; i <= words.length - (k - 1); i++) {
      var head = words.slice(0, i).join(' ');
      splits(words.slice(i), k - 1).forEach(function (rest) { out.push([head].concat(rest)); });
    }
    return out;
  }

  global.C = {
    h: h, load: load, glyph: glyph, tick: tick, flag: flag, check: check, area: area, figure: figure,
    textAction: textAction, tally: tally, header: header, section: section, row: row, weekStrip: weekStrip,
    tabBar: tabBar, chartCells: chartCells, chartL0: chartL0, chartL1: chartL1, chartL2: chartL2, breakLines: breakLines,
  };
})(window);
