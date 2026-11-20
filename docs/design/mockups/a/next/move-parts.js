/* ───────────────────────────────────────────────────────────────────────────
   방향 A · next · parts for 칸 자리 바꾸기 · 옮기기 (move-*.html). Builder's own file.
   Built only from tokens.css variables, shared.js and parts-sheets.js. Load after both.

     MV.doc(doc)                     the demo document with two of 커리어's cells left empty (a place to land)
     MV.areaPage(target, doc, a, o)  an area's page as the app draws it (block.html + the list under it);
                                     o.swap = the same page in 자리 바꾸기 mode
     MV.corePage(target, doc, o)     the centre block's page (the goal and the eight areas)
     MV.ring(block, index)           the selection ring on one tile of an A.block (ink; on a dye tile the
                                     ring gets a paper line inside it so it reads on any of the eight dyes)
     MV.menu(doc, a, rows)           the "···" sheet's content: where (locator + two printed words) and rows
     MV.row({ icon, title })         one row of that sheet (S.linkRow with this file's glyphs)
     MV.toast(text, action)          the capsule toast above the tab bar, with its one written action
     MV.icon(name)                   'swap' (two arrows passing each other)

   자리 바꾸기 mode, in one sentence: tapping a tile selects it instead of opening it. The header's first
   line (where ‹ 만다라트 was) carries the one-line instruction and 완료 takes the place of ···. The page
   under the block (the pager, the week's habits, the other cells) steps aside until 완료: those lists
   are this block's cells in order, so they would shuffle under every tap. One printed line stands in
   their place: what travels with a cell.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A, S = global.S;
  const MV = {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (t) => (typeof t === 'string' ? document.querySelector(t) : t);

  const css = `
  /* the area page: block.html's own rules, unchanged */
  .mv-block { margin-top: 18px; }
  .mv-pager { display: flex; align-items: center; justify-content: space-between; height: 44px; margin-top: 6px; }
  .mv-pager .a-link { font-size: 14px; height: 44px; }
  .mv-pager .a-link.is-prev svg { margin-left: -6px; margin-right: 0; }
  .mv-pager-where { display: flex; align-items: center; gap: 8px; }
  .mv-sec { margin-top: 20px; }
  .mv-wk { position: relative; }
  .mv-wk-row { position: relative; display: grid; grid-template-columns: 1fr repeat(7, 30px) 40px; align-items: center; height: 40px; }
  .mv-wk-row + .mv-wk-row:not(.is-first)::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: var(--hair); background: var(--print-rule); }
  .mv-wk-row.is-head { height: 26px; }
  .mv-wk-row > * { display: flex; justify-content: center; align-items: center; height: 100%; position: relative; }
  .mv-wk-row > .mv-wk-name { justify-content: flex-start; font: 500 14px/18px var(--sans); color: var(--ink); white-space: nowrap; }
  .mv-wk-row > .mv-wk-fig { justify-content: flex-end; font: 400 13px/18px var(--sans); color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .mv-wk-row.is-head .t-label { line-height: 24px; }
  .mv-wk-day.is-sunday .t-label { color: var(--signal); }
  .mv-wk-day.is-today .t-label { color: var(--ink); font-weight: 700; }
  .mv-wk-today { position: absolute; top: 0; bottom: 0; width: 30px; border-radius: 8px; background: var(--tile); }
  .mv-state { text-align: center; }
  .mv-rest .a-section { margin-bottom: 0; }

  /* 자리 바꾸기 mode: the header's one action is a written word, set on the title line */
  .mv-done {
    position: absolute; right: 0; top: 26px; height: 44px; padding-left: 16px;
    display: flex; align-items: center; font: 700 15px/20px var(--sans); color: var(--ink);
  }
  .mv-say { color: var(--print-strong); }   /* the instruction: printed words that must read first */
  /* the selection ring: 2pt ink, inside the tile's edge (A.block's own focus frame). On a dye tile a
     1.5pt paper line runs inside it, so the ring reads on all eight dyes (ink alone is 3:1 on 연지). */
  .mv-ring { position: absolute; border-radius: 10px; box-shadow: inset 0 0 0 2px var(--ink); pointer-events: none; }
  .mv-ring.on-dye { box-shadow: inset 0 0 0 2px var(--ink), inset 0 0 0 3.5px var(--paper); }
  /* the 44pt line under a block: the pager's place on an area's page, the block's name on the centre page */
  .mv-under { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; margin-top: 6px; }

  /* the toast: the app's own (Snackbar): the tab bar's capsule, 10pt above the bar, 13/18 ink, one quiet
     written action, the fuse line along its foot */
  .mv-toast {
    position: absolute; left: 16px; right: 16px; bottom: 86px; min-height: 48px; z-index: 12;
    display: flex; align-items: center; gap: 8px; padding: 8px 20px;
    border-radius: 24px; background: var(--capsule); box-shadow: var(--float-shadow); overflow: hidden;
  }
  .mv-toast .t-label { flex: 1; color: var(--ink); }
  .mv-toast i { position: absolute; left: 0; bottom: 0; height: 1px; width: 82%; background: var(--print-mid); }

  /* the "···" sheet and the move sheet */
  .mv-rows { margin-top: 6px; }
  .mv-title { margin-top: 10px; }
  .mv-title + .t-meta { display: block; margin-top: 2px; }
  .mv-to { display: flex; align-items: center; gap: 12px; height: 48px; margin-top: 14px; }
  .mv-quiets { display: flex; align-items: center; justify-content: space-between; height: 44px; margin-top: 20px; }
  .mv-quiets .s-quiet { display: inline-flex; align-items: center; gap: 2px; height: 44px; font-size: 14px; }
  .mv-quiets .s-quiet svg { margin-right: -4px; }
  .mv-save { margin-top: 8px; }
  .mv-stepper { display: flex; align-items: center; justify-content: space-between; width: 184px; height: 44px; padding: 0 14px; border-radius: 12px; background: var(--tile); font: 500 15px/20px var(--sans); color: var(--ink); font-variant-numeric: tabular-nums; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* MV.doc(doc) → a copy in which 커리어 has two cells still unwritten (the 7th and the 8th), so a cell
     moved there has a first empty place to land in. Nothing else differs from the demo document. */
  MV.doc = function (doc) {
    const d = JSON.parse(JSON.stringify(doc));
    const c = d.areas[A.areaIndex(d, '커리어')];
    c.actions[6] = { text: '', done: false };
    c.actions[7] = { text: '', done: false };
    return d;
  };

  /* MV.icon(name) → SVG string, the kit's drawing rules (24 box, 1.5 stroke, round caps and joins). */
  MV.icon = function (name) {
    const P = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
    const body = {
      swap: `<path d="M4.5 8.25h14.5M15.5 4.75l3.5 3.500-3.500 3.500" ${P}/><path d="M19.5 15.750H5M8.500 12.250 5 15.750l3.500 3.500" ${P}/>`,
    }[name];
    return body ? `<svg width="24" height="24" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>` : '';
  };

  /* MV.row({ icon, title, meta }) → one 54pt row that opens something: glyph in the check-box column,
     title, chevron (S.linkRow's anatomy; icon may be one of this file's or the kit's). */
  MV.row = function (r) {
    const glyph = MV.icon(r.icon) || S.icon(r.icon) || A.icon(r.icon);
    return `<div class="a-row s-link"><span class="s-link-glyph">${glyph}</span><div class="a-row-main"><div class="a-row-title">${esc(r.title)}</div>${r.meta ? `<div class="a-row-meta">${esc(r.meta)}</div>` : ''}</div>${A.icon('chevron', { size: 18 })}</div>`;
  };

  /* MV.menu(doc, area, rows) → the content of the "···" sheet: where (the block's locator with no cell
     marked + the area's name + "영역 3 / 8"), close, then the rows. */
  MV.menu = function (doc, area, rows) {
    const a = doc.areas[area];
    return `<div class="s-head">${S.locator(doc, area, -1)}<div class="s-head-where"><span class="t-label"><i class="a-dye" style="--d:var(--dye-${area + 1})"></i>${esc(a.title)}</span><span class="t-label">영역 ${area + 1} / 8</span></div><div class="s-head-close">${A.icon('close')}</div></div>
      <div class="a-list mv-rows">${rows.map(MV.row).join('')}</div>`;
  };

  MV.toast = function (text, action) {
    return `<div class="mv-toast"><span class="t-label">${esc(text)}</span>${action ? `<span class="s-quiet">${esc(action)}</span>` : ''}<i></i></div>`;
  };

  /* MV.ring(block, index) — block is what A.block returned; index 0..8 row-major. */
  MV.ring = function (block, index) {
    const c = block.cells[index];
    const r = document.createElement('div');
    r.className = 'mv-ring' + (c.cell.kind === 'action' ? '' : ' on-dye');
    r.style.cssText = `left:${c.el.style.left};top:${c.el.style.top};width:${c.el.style.width};height:${c.el.style.height}`;
    block.el.appendChild(r);
    return r;
  };

  function header(host, o) {
    if (!o.swap) return A.header(host, { back: '만다라트', title: o.title, written: true, figure: o.figure, action: o.action || 'more' });
    // the mode's header: the instruction where the way back was, the title unchanged, 완료 for the action
    host.classList.add('a-header');
    host.innerHTML = `<div class="t-folio mv-say">${esc(o.swap)}</div><div class="t-title is-written">${esc(o.title)}</div><div class="mv-done">완료</div>`;
    return host;
  }

  // this week's marks for the two habits of 자기계발, from the demo record (v done · x missed · T today ·
  // o planned · · not planned · e done on a day that was not planned): 영어 회화 is 주 2회 (no fixed days),
  // 아침 글쓰기 is 월·수·금 with one done on 화, which the app shows ticked and does not count (0/3)
  const WEEK = { '영어 회화': '··T····', '아침 글쓰기': 'xeT·o··', '주 3회 운동': '··T····', '하루 물 2L': 'vvVoooo', '11시 취침': 'xxTo··o', '1만보 걷기': 'vvToooo', '스트레칭 10분': 'xxToo··' };
  const tally = (s) => ({ done: [...s].filter((c) => c === 'v' || c === 'V').length, planned: [...s].filter((c) => c !== '·' && c !== 'e').length });

  // the habit's week figure inside its cell, where the cell is not done yet (block.html)
  const weekState = (cell) => {
    if (cell.kind !== 'action' || cell.done || cell.actKind !== 'habit') return '';
    const t = cell.act.perWeek ? { done: 0, planned: cell.act.perWeek } : tally(WEEK[cell.text] || '');
    return `<div class="t-meta mv-state">이번 주 ${t.done}/${t.planned}</div>`;
  };

  /* MV.areaPage(target, doc, area, o) → { block }
     target is the .a-page. Draws the header, the block (with the habit's week figure in its cell), the
     pager, 이번 주 습관 and 그 밖의 실천, and the tab bar: the page the app shows for an area.
     o.swap   the instruction line: draws the page in 자리 바꾸기 mode (header, block, one note)
     o.pick   index 0..8 in the block: that tile carries the selection ring
     o.focus  index 0..8: A.block's own focus frame (the cell an open sheet is about)
     o.rest   false = leave out 그 밖의 실천 (for a page whose foot is under a sheet anyway) */
  MV.areaPage = function (target, doc, area, o) {
    o = o || {};
    const host = el(target);
    const a = doc.areas[area];
    if (o.swap) {
      host.insertAdjacentHTML('afterbegin', `<div data-h></div><div class="a-body"><div class="mv-block" data-b></div><div class="mv-under"><span class="t-label">${esc(o.under || '칸에 딸린 기록도 함께 옮겨져요')}</span></div></div><div data-bar></div>`);
      header(host.querySelector('[data-h]'), { title: a.title, swap: o.swap });
      const blk = A.block(host.querySelector('[data-b]'), doc, area, { cell: 112, extra: weekState });
      if (o.pick != null) MV.ring(blk, o.pick);
      A.tabBar(host.querySelector('[data-bar]'), { active: 'chart' });
      return { block: blk };
    }
    host.insertAdjacentHTML('afterbegin', `<div data-h></div><div class="a-body"><div class="mv-block" data-b></div>
      <div class="mv-pager"><span class="a-link is-prev" data-prev></span><span class="mv-pager-where" data-where></span><span class="a-link" data-next></span></div>
      <section class="mv-sec"><div class="a-section"><span class="t-label is-section">이번 주 습관</span><span class="t-label">10월 12일 – 18일</span></div><div class="mv-wk" data-wk></div></section>
      ${o.rest === false ? '' : '<section class="mv-sec mv-rest"><div class="a-section"><span class="t-label is-section">그 밖의 실천</span></div><div class="a-list" data-rest></div></section>'}
    </div><div data-bar></div>`);
    const q = (s) => host.querySelector(s);
    header(q('[data-h]'), { title: a.title, figure: `${a.done}/${a.of}`, swap: o.swap });

    const block = A.block(q('[data-b]'), doc, area, { cell: 112, extra: weekState, focus: o.focus });
    if (o.pick != null) MV.ring(block, o.pick);

    const prev = doc.areas[(area + 7) % 8], next = doc.areas[(area + 1) % 8];
    q('[data-prev]').innerHTML = `${A.icon('back', { size: 16 })}${prev.title}`;
    q('[data-next]').innerHTML = `${next.title}${A.icon('chevron', { size: 16 })}`;
    const u = 6, gap = 2;
    let m = '';
    for (let b = 0; b < 9; b++) {
      const x = (b % 3) * (u + gap), y = Math.floor(b / 3) * (u + gap);
      const fill = b === 4 ? 'var(--core)' : b === (area < 4 ? area : area + 1) ? `var(--dye-${area + 1})` : 'var(--print-rule)';
      m += `<rect x="${x}" y="${y}" width="${u}" height="${u}" rx="1.5" style="fill:${fill}"/>`;
    }
    q('[data-where]').innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" style="display:block" aria-hidden="true">${m}</svg><span class="t-label">${area + 1} / 8</span>`;

    // 이번 주 습관: one row per habit cell, in the block's order
    const days = doc.view.week.days;
    let html = `<div class="mv-wk-row is-head"><span></span>${days.map((d) => `<span class="mv-wk-day${d[2] === 'today' ? ' is-today' : ''}${d[0] === '일' ? ' is-sunday' : ''}"><span class="t-label">${d[0]}</span></span>`).join('')}<span class="mv-wk-fig"><span class="t-label">횟수</span></span></div>`;
    const mark = (c) => (c === 'v' || c === 'V' || c === 'e' ? A.check({ done: true, area, size: 14 }) : c === '·' ? '' : A.check({ size: 14 }));
    a.actions.filter((x) => x.kind === 'habit' && x.text).forEach((x, n) => {
      const s = WEEK[x.text] || '·······';
      const t = x.perWeek ? { done: 0, planned: x.perWeek } : tally(s);
      html += `<div class="mv-wk-row${n === 0 ? ' is-first' : ''}"><span class="mv-wk-name">${esc(x.text)}</span>${[...s].map((c) => `<span>${mark(c)}</span>`).join('')}<span class="mv-wk-fig">${t.done}/${t.planned}</span></div>`;
    });
    const wk = q('[data-wk]');
    wk.innerHTML = html;
    const today = wk.querySelector('.mv-wk-day.is-today');
    if (today) {
      const col = document.createElement('div');
      col.className = 'mv-wk-today';
      col.style.left = today.offsetLeft + 'px';
      wk.prepend(col);
    }

    // 그 밖의 실천: the cells that are not habits, in the block's order (the app's area page)
    if (q('[data-rest]')) q('[data-rest]').innerHTML = a.actions.filter((x) => x.kind !== 'habit' && x.text).map((x) => {
      const box = x.kind === 'count' ? '<span class="a-row-slot"></span>' : A.check({ done: x.done, area });
      const right = x.kind === 'count' ? '<div class="a-row-right">7/12권</div>' : x.done ? '<div class="a-row-right is-print">달성</div>' : '';
      return `<div class="a-row no-meta">${box}<div class="a-row-main"><div class="a-row-title">${esc(x.text)}</div></div>${right}</div>`;
    }).join('');

    A.tabBar(q('[data-bar]'), { active: 'chart' });
    return { block };
  };

  /* MV.corePage(target, doc, o) → { block }. The centre block's page: the goal in the middle, the
     eight areas round it in their dyes. o.swap / o.pick as on MV.areaPage; o.under = HTML for the 44pt
     line under the block (the app prints the block's place there). */
  MV.corePage = function (target, doc, o) {
    o = o || {};
    const host = el(target);
    const p = doc.view.progress;
    host.insertAdjacentHTML('afterbegin', `<div data-h></div><div class="a-body"><div class="mv-block" data-b></div><div class="mv-under" data-u></div></div><div data-bar></div>`);
    const q = (s) => host.querySelector(s);
    header(q('[data-h]'), { title: doc.coreGoal, figure: `${p.done}/${p.of}`, swap: o.swap, action: o.action || 'edit' });
    const block = A.block(q('[data-b]'), doc, 'core', { cell: 112 });
    if (o.pick != null) MV.ring(block, o.pick);
    if (o.under) q('[data-u]').innerHTML = o.under;
    else {
      const u = 6, gap = 2;
      let m = '';
      for (let b = 0; b < 9; b++) m += `<rect x="${(b % 3) * (u + gap)}" y="${Math.floor(b / 3) * (u + gap)}" width="${u}" height="${u}" rx="1.5" style="fill:${b === 4 ? 'var(--core)' : 'var(--print-rule)'}"/>`;
      q('[data-u]').innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" style="display:block" aria-hidden="true">${m}</svg><span class="t-label">가운데 블록</span>`;
    }
    A.tabBar(q('[data-bar]'), { active: 'chart' });
    return { block };
  };

  global.MV = MV;
})(window);
