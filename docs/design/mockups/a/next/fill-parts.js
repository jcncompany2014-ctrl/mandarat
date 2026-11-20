/* ───────────────────────────────────────────────────────────────────────────
   시안 · 64칸까지 이어 쓰기 (fill-*.html) — shared drawing for this feature's screens.
   Needs tokens.css, shared.js and fill-parts.css. Nothing here hard-codes a colour.

   The proposal in one line: the guide that helps you write does not stop at 8 of 64. While any
   area has empty cells, one row under the map leads to the next empty cell.

     F.docAt(doc, written, done)   the demo document with only the first written[i] cells of area i
                                   written, and the named cells achieved.
     F.doc8(doc) / F.doc40(doc)    day one after the first area (8/64) · mid-way (40/64, 6 achieved)
     F.blanks(doc)                 { written, done, blanks, area, index, row, col } — next empty cell
     F.chartTab(target, doc, opts) the 만다라트 tab. opts.coach 'folded' | 'open'; opts.now = today's
                                   app; opts.toast = { text, action }
     F.home(target, doc, opts)     Home. opts.guide 'steps' | 'slim'; opts.scroll in pt; opts.now
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const F = {};
  const q = (t) => (typeof t === 'string' ? document.querySelector(t) : t);
  const chev = (s) => A.icon('chevron', { size: s || 16 });
  // the fold glyph, in A.icon's grammar (as 펼치기 on dayclose.html)
  const fold = (open, s) => `<svg width="${s || 20}" height="${s || 20}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true"><path d="${open ? 'M5.5 15 12 8.5 18.5 15' : 'M5.5 9 12 15.5 18.5 9'}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  // Korean particles after an area's name (받침이 있으면 앞의 것)
  const josa = (word, pair) => {
    const c = word.charCodeAt(word.length - 1);
    const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return word + (has ? a : b);
  };

  F.docAt = function (doc, written, done) {
    const d = JSON.parse(JSON.stringify(doc));
    const ok = new Set(done || []);
    // what the coach suggests for an area: the demo document's own words for its still-empty cells
    d.suggest = d.areas.map((area, i) => area.actions.slice(written[i]).map((x) => x.text));
    d.areas.forEach((area, i) => {
      area.actions = area.actions.map((act, k) => (k < written[i] ? Object.assign(act, { done: ok.has(act.text) }) : { text: '', done: false }));
      area.done = area.actions.filter((x) => x.done).length;
      area.written = area.actions.filter((x) => x.text).length;
    });
    d.view.progress = { done: d.areas.reduce((n, a) => n + a.done, 0), of: 64 };
    return d;
  };

  /* day one: the first area is written, nothing is done yet */
  F.doc8 = function (doc) {
    const d = F.docAt(doc, [8, 0, 0, 0, 0, 0, 0, 0], []);
    const v = d.view;
    v.weekFocus = [];
    v.today = { done: 0, of: 5, rows: [
      { text: '주 3회 운동', area: '건강', meta: '이번 주 0/3회' },
      { text: '하루 물 2L', area: '건강', meta: '매일 반복' },
      { text: '11시 취침', area: '건강', meta: '월·화·수·목·일 반복' },
      { text: '1만보 걷기', area: '건강', meta: '매일 반복' },
      { text: '스트레칭 10분', area: '건강', meta: '평일 반복' },
    ] };
    v.week = { label: '이번 주', total: '0번', days: [['월', null], ['화', null], ['수', 0, 'today'], ['목', null], ['금', null], ['토', null], ['일', null]] };
    v.nextStep = { text: '주 3회 운동', area: '건강' };
    return d;
  };

  /* mid-way: five areas written or begun, three still to write; six cells achieved */
  F.doc40 = function (doc) {
    const d = F.docAt(doc, [8, 8, 8, 8, 5, 3, 0, 0], ['정기 건강검진', '사이드 프로젝트', '멘토 찾기', '온라인 강의', '비상금 300만 원', '구독 정리']);
    const v = d.view;
    v.weekFocus = [];
    v.today = { done: 1, of: 7, rows: [
      { text: '이력서 갱신', area: '커리어', meta: '', right: 'D-2' },
      { text: '주 3회 운동', area: '건강', meta: '이번 주 0/3회' },
      { text: '11시 취침', area: '건강', meta: '월·화·수·목·일 반복' },
      { text: '1만보 걷기', area: '건강', meta: '매일 반복' },
      { text: '스트레칭 10분', area: '건강', meta: '평일 반복' },
      { text: '영어 회화', area: '자기계발', meta: '이번 주 0/2회' },
      { text: '하루 물 2L', area: '건강', meta: '매일 반복', doneToday: true },
    ] };
    v.nextStep = { text: '이력서 갱신', area: '커리어' };
    return d;
  };

  F.blanks = function (doc) {
    const written = doc.areas.reduce((n, a) => n + a.actions.filter((x) => x.text).length, 0);
    const ai = doc.areas.findIndex((a) => a.actions.some((x) => !x.text));
    const out = { written, done: doc.view.progress.done, blanks: 64 - written, ai };
    if (ai < 0) return out;
    const k = doc.areas[ai].actions.findIndex((x) => !x.text);
    const b = ai < 4 ? ai : ai + 1, i = k < 4 ? k : k + 1;
    return Object.assign(out, { area: doc.areas[ai].title, index: k, row: Math.floor(b / 3) * 3 + Math.floor(i / 3), col: (b % 3) * 3 + (i % 3) });
  };

  /* the right end of the line above the map.
     now:      쓴 칸 n/64 before the 8th cell, then 달성 d/64칸 (the written count disappears)
     proposed: 쓴 칸 n/64 until all 64 are written; 달성 d칸 joins it once anything is achieved;
               at 64 written the line is 달성 d/64칸 again, as approved. */
  const folio = (b, now) => {
    if (now) return b.written < 8 ? `쓴 칸 <b>${b.written}/64</b>` : `달성 <b>${b.done}/64칸</b>`;
    if (b.written >= 64) return `달성 <b>${b.done}/64칸</b>`;
    return `쓴 칸 <b>${b.written}/64</b>` + (b.done ? `<i class="f-sep">·</i>달성 <b>${b.done}칸</b>` : '');
  };

  /* ── 만다라트 tab ──────────────────────────────────────────────────────── */
  F.chartTab = function (target, doc, opts) {
    opts = Object.assign({ coach: 'folded', now: false, toast: null, next: true }, opts);
    const v = doc.view, b = F.blanks(doc);
    const host = q(target);
    const open = !opts.now && opts.coach === 'open';
    const n = v.nextStep, na = A.areaIndex(doc, n.area);

    let under;
    if (opts.now || b.ai < 0) {
      under = `<div class="sheet-line"><span class="t-note">영역을 누르면 실천 여덟 칸이 보여요</span></div>`;
    } else {
      // the coach, folded to one row: how much is left, and where writing goes on
      const picks = doc.suggest[b.ai].slice(0, 3);
      under = `<div class="f-coach${open ? ' is-open' : ''}">
        <div class="f-coach-row"><span class="f-coach-text"><span class="f-coach-count">빈칸 ${b.blanks}개</span><i class="f-sep">·</i>${b.area}부터 이어 쓰기</span>${fold(open)}</div>
        ${open ? `<div class="a-section f-coach-head"><span class="t-label is-section"><i class="a-dye" style="--d:var(--dye-${b.ai + 1})"></i>${josa(b.area, '을/를')} 위해 무엇을 해 볼까요?</span><span class="a-link">직접 쓰기${chev()}</span></div>
        <div class="a-list f-picks">${picks.map((t) => `<div class="a-row no-meta"><span class="f-pick-plus">${A.icon('plus', { size: 18 })}</span><div class="a-row-main"><div class="a-row-title">${t}</div></div></div>`).join('')}</div>` : ''}
      </div>`;
    }
    const next = !opts.next ? '' : `<div class="a-body next${opts.now || b.ai < 0 ? '' : ' after-coach'}">
        <div class="a-section"><span class="t-label is-section">다음 할 일</span></div>
        <div class="a-list"><div class="a-row"><div class="a-row-main"><div class="a-row-title">${n.text}</div><div class="a-row-meta"><i class="a-dye" style="--d:var(--dye-${na + 1})"></i>${n.area}</div></div><div class="a-row-right">${chev(20)}</div></div></div>
      </div>`;
    const toast = opts.toast ? `<div class="f-toast"><span class="f-toast-text">${opts.toast.text}</span>${opts.toast.action ? `<span class="f-toast-action">${opts.toast.action}</span>` : ''}<i class="f-toast-fuse"></i></div>` : '';

    host.innerHTML = `
      <div id="header"></div>
      <div class="sheet">
        <div class="sheet-line"><span class="t-label">${v.date.year} 만다라트</span><span class="t-label f-folio">${folio(b, opts.now)}</span></div>
        <div id="chart"></div>
        ${under}
      </div>
      ${next}
      ${toast}
      <div id="bar"></div>`;
    A.header(host.querySelector('#header'), { eyebrow: '핵심 목표', title: doc.coreGoal, written: true, action: 'share' });
    A.chart(host.querySelector('#chart'), doc, { level: 'L2', map: true, width: 342, focus: open ? [b.row, b.col] : undefined });
    A.tabBar(host.querySelector('#bar'), { active: 'chart' });
    return host;
  };

  /* ── Home ──────────────────────────────────────────────────────────────── */
  const ledger = (doc, now) => [0, 4, 1, 5, 2, 6, 3, 7].map((i) => {
    const a = doc.areas[i];
    const unwritten = !now && !a.actions.some((x) => x.text);
    return `<div class="a-ledger-row"><span><i class="a-dye" style="--d:var(--dye-${i + 1})"></i>${a.title}</span>${unwritten ? `<span class="a-link">쓰기${chev()}</span>` : `<b>${a.done}/${a.of}</b>`}</div>`;
  }).join('');

  const step = (s) => {
    const right = s.cta ? `<span class="a-link">${s.cta}${chev()}</span>` : '';
    return `<div class="a-row no-meta${s.done ? ' is-done' : ''}">${A.check({ done: !!s.done })}<div class="a-row-main"><div class="a-row-title"><span class="a-strike">${s.text}</span></div></div>${right}</div>`;
  };

  F.home = function (target, doc, opts) {
    opts = Object.assign({ guide: 'slim', scroll: 0, now: false, rows: 5, steps: [] }, opts);
    const v = doc.view, d = v.date, b = F.blanks(doc);
    const host = q(target);
    const fillText = opts.now ? `실천 칸 8개 채우기 · ${Math.min(8, b.written)}/8` : `실천 칸 채우기 · ${b.written}/64`;
    let guide = '';
    if (opts.guide === 'steps') {
      const steps = opts.steps.map((s) => (s.fill ? Object.assign({ text: fillText, done: opts.now && b.written >= 8, cta: opts.now ? '' : '이어 쓰기' }, s.done === undefined ? {} : { done: s.done }) : s));
      guide = `<section class="sec"><div class="a-section"><span class="t-label is-section">시작하기</span><span class="t-meta" style="color:var(--ink)">${steps.filter((s) => s.done).length}/${steps.length}</span></div><div class="a-list">${steps.map(step).join('')}</div></section>`;
    } else if (opts.guide === 'slim' && !opts.now && b.ai >= 0) {
      guide = `<div class="f-slim"><span class="f-slim-text">실천 칸 채우기<i class="f-sep">·</i><b>${b.written}/64</b></span><span class="a-link">이어 쓰기${chev()}</span></div>`;
    }
    host.innerHTML = `
      <div class="f-scroll" style="transform:translateY(${-opts.scroll}px)">
        <div id="header"></div>
        <div class="a-body">
          <div class="hero-row">
            <div class="hero-fields">
              <div class="hero-field"><div class="t-label">오늘</div><div class="t-figure is-field">${v.today.done}/${v.today.of}</div></div>
              <div class="hero-field"><div class="t-label">달성</div><div class="t-figure is-field">${v.progress.done}/${v.progress.of}<small>칸</small></div></div>
              <div class="hero-field"><div class="t-label">남은 날</div><div class="t-figure is-field">${d.left.replace(/\D/g, '')}<small>일</small></div></div>
            </div>
            <div id="chart"></div>
          </div>
          ${guide}
          <section class="sec">
            <div class="a-section"><span class="t-label is-section">오늘 할 일</span><span class="a-link">전체 보기${chev()}</span></div>
            <div class="a-list" id="rows"></div>
          </section>
          <section class="sec">
            <div class="a-section"><span class="t-label is-section">${v.week.label}</span><span class="t-meta" style="color:var(--ink)">${v.week.total}</span></div>
            <div id="week"></div>
          </section>
          <section class="sec">
            <div class="a-section"><span class="t-label is-section">8개 영역</span></div>
            <div class="a-ledger">${ledger(doc, opts.now)}</div>
          </section>
        </div>
      </div>
      <div id="bar"></div>`;
    A.header(host.querySelector('#header'), { eyebrow: `${d.month} ${d.day}일 ${d.weekday} · ${d.week}`, title: doc.coreGoal, headline: true, action: 'settings' });
    A.chart(host.querySelector('#chart'), doc, { level: 'L1', cell: 20 });
    const rows = v.today.rows;
    const openRows = rows.filter((r) => !r.doneToday), doneRows = rows.filter((r) => r.doneToday);
    const shown = openRows.slice(0, opts.rows - Math.min(1, doneRows.length)).concat(doneRows.slice(0, 1));
    host.querySelector('#rows').innerHTML = shown.map((r) => A.todayRow(doc, r)).join('');
    A.weekStrip(host.querySelector('#week'), v.week);
    A.tabBar(host.querySelector('#bar'), { active: 'home' });
    return host;
  };

  global.F = F;
})(window);
