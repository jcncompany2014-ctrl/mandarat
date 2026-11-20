/* ───────────────────────────────────────────────────────────────────────────
   시안 · 살아 있는 지도 (map-*.html) — shared drawing for this feature's screens.
   Needs tokens.css, shared.js and map-parts.css. Nothing here hard-codes a colour.

   The proposal in one line: a cell on the colour map is filled not only when it is achieved for
   good, but also while a habit is being kept this week (and, on Home only, when it was ticked today).

     M.veteran(doc)        the demo document three months in (the audit's j3-01): 64 written,
                           17 achieved, no habit cell marked "achieved" by hand. Friday, week 47.
     M.tick(doc, [texts])  the same document after ticking these actions today.
     M.state(doc, act)     'done' | 'week' | 'today' | 'written' | 'empty' for one action.
     M.chart(target, doc, opts)   A.chart with opts.mode:
                             'now'  today's app: only achieved cells are filled
                             'a'    kept-this-week cells take the same fill as achieved (one tone)
                             'b'    kept-this-week cells take a lighter step (three tones)
                           opts.home = true: cells ticked today are filled too (Home's map only).
     M.home(target, doc, opts)    the whole Home screen (as home.html) with the map in opts.mode.
     M.chartTab(target, doc, opts) the whole 만다라트 tab (as chart.html) with the caption.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const M = {};
  const q = (t) => (typeof t === 'string' ? document.querySelector(t) : t);

  /* This week on Friday morning, 월…일 (v = done, x = missed, T = today, o = still to come, · = not planned).
     The day totals are the audit's week strip: 월 4 · 화 4 · 수 5 · 목 5 = 18번. */
  const WEEK = {
    '주 3회 운동':     { s: '··vvT··', per: 3 },
    '하루 물 2L':      { s: 'vvvvToo' },
    '11시 취침':       { s: 'xxxx··o' },
    '1만보 걷기':      { s: 'vvvvToo' },
    '스트레칭 10분':   { s: 'xvxxT··' },
    '영어 회화':       { s: '·v··T··', per: 2 },
    '아침 글쓰기':     { s: 'v·v·T··' },
    '부모님 주 1통화': { s: '···v···', per: 1 },
    '가계부 쓰기':     { s: '······o' },
    '명상 10분':       { s: 'vxvvToo' },
  };
  /* this week's rating of the mindset cells (1–5); a cell with 4 or 5 counts as kept */
  const MIND = { '감사 표현하기': 4, '경청 연습': 3 };

  const count = (s, ch) => [...s].filter((c) => c === ch).length;
  /* kept this week = the week target is met: n/n for a count habit, or every planned day so far
     (and at least one) for a day habit. Today does not count against it until midnight. */
  const kept = (w, tickedToday) => {
    const done = count(w.s, 'v') + (tickedToday ? 1 : 0);
    if (w.per) return done >= w.per;
    return done > 0 && count(w.s, 'x') === 0;
  };

  M.veteran = function (doc) {
    const d = JSON.parse(JSON.stringify(doc));
    d.areas.forEach((area) => {
      area.actions.forEach((act) => {
        // in the app a habit or mindset cell is "achieved" only by hand; three months in, none is
        if (act.kind === 'habit' || act.kind === 'mind') act.done = false;
        act.week = WEEK[act.text] || null;
        act.rating = MIND[act.text] || 0;
        act.ticked = false;
      });
      area.done = area.actions.filter((x) => x.done).length;
    });
    const v = d.view;
    v.date = { day: 20, month: '11월', weekday: '금요일', year: 2026, week: '47주', left: '올해 41일 남음' };
    v.progress = { done: d.areas.reduce((n, a) => n + a.done, 0), of: 64 };
    v.weekFocus = [{ text: '주 3회 운동', area: '건강' }, { text: '친구 모임', area: '관계' }];
    v.today = {
      done: 0, of: 8,
      rows: [
        { text: '주 3회 운동', area: '건강', meta: '이번 주 2/3회' },
        { text: '이력서 갱신', area: '커리어', meta: '', right: 'D-2' },
        { text: '하루 물 2L', area: '건강', meta: '매일 반복' },
        { text: '1만보 걷기', area: '건강', meta: '매일 반복' },
        { text: '스트레칭 10분', area: '건강', meta: '평일 반복' },
        { text: '아침 글쓰기', area: '자기계발', meta: '월·수·금 반복' },
        { text: '명상 10분', area: '마음챙김', meta: '매일 반복' },
        { text: '영어 회화', area: '자기계발', meta: '이번 주 1/2회' },
      ],
    };
    v.week = { label: '이번 주', total: '18번', days: [['월', 4], ['화', 4], ['수', 5], ['목', 5], ['금', 0, 'today'], ['토', null], ['일', null]] };
    v.nextStep = { text: '이력서 갱신', area: '커리어' };
    return d;
  };

  M.tick = function (doc, texts) {
    const d = JSON.parse(JSON.stringify(doc));
    const set = new Set(texts);
    d.areas.forEach((area) => area.actions.forEach((act) => { if (set.has(act.text)) act.ticked = true; }));
    const v = d.view;
    v.today.rows.forEach((r) => {
      if (!set.has(r.text)) return;
      r.doneToday = true;
      const m = /이번 주 (\d+)\/(\d+)회/.exec(r.meta || '');
      if (m) r.meta = `이번 주 ${+m[1] + 1}/${m[2]}회`;
    });
    v.today.done = v.today.rows.filter((r) => r.doneToday).length;
    v.week.days = v.week.days.map((x) => (x[2] === 'today' ? [x[0], v.today.done, 'today'] : x));
    v.week.total = `${v.week.days.reduce((n, x) => n + (x[1] || 0), 0)}번`;
    return d;
  };

  M.state = function (act) {
    if (!act.text) return 'empty';
    if (act.done) return 'done';
    if (act.week && kept(act.week, act.ticked)) return 'week';
    if (act.rating >= 4) return 'week';
    if (act.ticked) return 'today';
    return 'written';
  };
  /* how many habits are being kept this week (the quiet second line on Home) */
  M.keptHabits = (doc) => doc.areas.reduce((n, a) => n + a.actions.filter((x) => x.week && !x.done && kept(x.week, x.ticked)).length, 0);

  /* option B's third step: the area's dye mixed into the page, between the pale tint (14%) and the
     achieved wash. Same recipe as A.tint, so it follows the page into dark by itself. */
  const weekFill = (i) => `color-mix(in oklab, var(--dye-${i + 1}) var(--week-mix), var(--paper))`;

  M.chart = function (target, doc, opts) {
    opts = Object.assign({ mode: 'a', home: false }, opts);
    const d = JSON.parse(JSON.stringify(doc));
    const lighter = [];            // cells to repaint in option B
    d.areas.forEach((area, ai) => area.actions.forEach((act, k) => {
      const s = M.state(act);
      const live = s === 'week' || (s === 'today' && opts.home);
      if (opts.mode === 'a' && live) act.done = true;
      if (opts.mode === 'b' && live) lighter.push([ai, k]);
    }));
    const out = A.chart(target, d, opts);
    if (lighter.length) {
      // A.chart emits one <rect> per cell in row-major order (the core emits two)
      const rects = out.el.querySelectorAll('svg > rect');
      const want = new Set(lighter.map(([a, k]) => a + ':' + k));
      out.cells.forEach((cell, i) => {
        if (cell.kind !== 'action' || !want.has(cell.area + ':' + cell.index)) return;
        rects[i < 40 ? i : i + 1].style.fill = weekFill(cell.area);
      });
    }
    return out;
  };

  /* ── Home (home.html, with the second figure as two facts) ─────────────── */
  M.home = function (target, doc, opts) {
    opts = Object.assign({ mode: 'a' }, opts);
    const v = doc.view, d = v.date;
    const host = q(target);
    const n = M.keptHabits(doc);
    const second = opts.mode === 'now' ? '' : `<div class="hero-week">이번 주 지킨 습관 <b>${n}</b></div>`;
    host.innerHTML = `
      <div id="header"></div>
      <div class="a-body">
        <div class="hero-row">
          <div class="hero-fields${second ? ' has-week' : ''}">
            <div class="hero-field"><div class="t-label">오늘</div><div class="t-figure is-field">${v.today.done}/${v.today.of}</div></div>
            <div class="hero-field"><div class="t-label">달성</div><div class="t-figure is-field">${v.progress.done}/${v.progress.of}<small>칸</small></div>${second}</div>
            <div class="hero-field"><div class="t-label">남은 날</div><div class="t-figure is-field">${d.left.replace(/\D/g, '')}<small>일</small></div></div>
          </div>
          <div id="chart"></div>
        </div>
        <section class="sec">
          <div class="a-section"><span class="t-label is-section">오늘 할 일</span><span class="a-link">전체 보기${A.icon('chevron', { size: 16 })}</span></div>
          <div class="a-list" id="rows"></div>
        </section>
        <section class="sec">
          <div class="a-section"><span class="t-label is-section">${v.week.label}</span><span class="t-meta" style="color:var(--ink)">${v.week.total}</span></div>
          <div id="week"></div>
        </section>
      </div>
      <div id="bar"></div>`;
    A.header(host.querySelector('#header'), { eyebrow: `${d.month} ${d.day}일 ${d.weekday} · ${d.week}`, title: doc.coreGoal, headline: true, action: 'settings' });
    M.chart(host.querySelector('#chart'), doc, { level: 'L1', cell: 20, mode: opts.mode, home: true });

    // the list as Home draws it: this week's focus pinned first, then what is next, done rows last
    const rows = v.today.rows;
    const find = (t) => rows.find((r) => r.text === t);
    const focus = new Set(v.weekFocus.map((f) => f.text));
    const pinned = v.weekFocus.map((f) => {
      const r = find(f.text);
      return r ? A.todayRow(doc, r, { rightPrint: '중점' }) : A.row(doc, { text: f.text, area: f.area, meta: '이번 주', check: false, rightPrint: '중점' });
    });
    const rest = rows.filter((r) => !focus.has(r.text));
    const open = rest.filter((r) => !r.doneToday), done = rest.filter((r) => r.doneToday);
    const room = 5 - pinned.length;
    const shown = open.slice(0, room - Math.min(done.length, 1)).concat(done.slice(0, 1));
    host.querySelector('#rows').innerHTML = pinned.concat(shown.map((r) => A.todayRow(doc, r))).join('');
    A.weekStrip(host.querySelector('#week'), v.week);
    A.tabBar(host.querySelector('#bar'), { active: 'home' });
    return host;
  };

  /* ── 만다라트 tab (chart.html, with the caption that says what a filled cell is) ── */
  M.chartTab = function (target, doc, opts) {
    opts = Object.assign({ mode: 'a' }, opts);
    const v = doc.view;
    const host = q(target);
    const n = v.nextStep, a = A.areaIndex(doc, n.area);
    const note = opts.mode === 'now' ? '영역을 누르면 실천 여덟 칸이 보여요' : '칠한 칸은 달성했거나 이번 주에 지킨 칸이에요';
    host.innerHTML = `
      <div id="header"></div>
      <div class="sheet">
        <div class="sheet-line"><span class="t-label">${v.date.year} 만다라트</span><span class="t-label">달성 <b>${v.progress.done}/${v.progress.of}칸</b></span></div>
        <div id="chart"></div>
        <div class="sheet-line"><span class="t-note">${note}</span></div>
      </div>
      <div class="a-body next">
        <div class="a-section"><span class="t-label is-section">다음 할 일</span></div>
        <div class="a-list"><div class="a-row"><div class="a-row-main"><div class="a-row-title">${n.text}</div><div class="a-row-meta"><i class="a-dye" style="--d:var(--dye-${a + 1})"></i>${n.area}</div></div><div class="a-row-right">${A.icon('chevron', { size: 20 })}</div></div></div>
      </div>
      <div id="bar"></div>`;
    A.header(host.querySelector('#header'), { eyebrow: '핵심 목표', title: doc.coreGoal, written: true, action: 'share' });
    M.chart(host.querySelector('#chart'), doc, { level: 'L2', map: true, width: 342, mode: opts.mode, home: false });
    A.tabBar(host.querySelector('#bar'), { active: 'chart' });
    return host;
  };

  global.M = M;
})(window);
