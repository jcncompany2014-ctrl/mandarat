/* ───────────────────────────────────────────────────────────────────────────
   한 주 돌아보기 연결 (week-*) — the scenes and the two screens the week mockups share.
   Needs shared.js first. Draws only with the kit (A.header, A.chart, A.row, A.todayRow, A.weekStrip,
   A.ledger, A.tabBar); a screen is built into an .a-page element, so one page can hold several
   (week-compare.html).

     WK.scene(doc, name)        the demo document moved to one day of the story
     WK.home(page, doc, opts)   Home
     WK.today(page, doc, opts)  오늘

   The story (the demo document's own week, 10월 12일 – 18일 = 42주):
     10월 11일 일  the review of 10월 5일 – 11일 picked three 중점 for the coming week:
                   주 3회 운동 (건강, 주 3회 습관) · 친구 모임 (관계, 한 번) · 손편지 쓰기 (관계, 한 번)
     'mon'  10월 12일 월  nothing done yet. 중점 0/3.
     'wed'  10월 14일 수  the demo document's day. 운동 on 월 and 화 (이번 주 2/3회), 손편지 쓰기 done
                          on 월 (so 달성 25/64). Today: 하루 물 2L and 1만보 걷기. 중점 1/3.
     'late' 10월 21일 수  the week was never reviewed. No 중점 this week; last week's review still waits.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const WK = {};
  const q = (root, sel) => root.querySelector(sel);

  WK.scene = function (base, name) {
    const d = JSON.parse(JSON.stringify(base));
    const v = d.view;
    const row = (t) => v.today.rows.find((r) => r.text === t);
    const action = (area, t) => d.areas[A.areaIndex(d, area)].actions.find((x) => x.text === t);
    const finish = (area, t) => { action(area, t).done = true; d.areas[A.areaIndex(d, area)].done += 1; v.progress.done += 1; };
    v.weekFocus = [
      { text: '주 3회 운동', area: '건강' },
      { text: '친구 모임', area: '관계' },
      { text: '손편지 쓰기', area: '관계' },
    ];
    if (name === 'mon') {
      v.date = Object.assign({}, v.date, { day: 12, weekday: '월요일', left: '올해 80일 남음' });
      v.today.rows.forEach((r) => { delete r.doneToday; });
      v.today.done = 0;
      row('이력서 갱신').right = 'D-4';
      v.week = { label: '이번 주', total: '0번', days: [['월', 0, 'today'], ['화', null], ['수', null], ['목', null], ['금', null], ['토', null], ['일', null]] };
    }
    if (name === 'wed') {
      row('주 3회 운동').meta = '이번 주 2/3회';
      row('1만보 걷기').doneToday = true;
      v.today.done = 2;
      v.weekFocus[2].doneOn = '월요일';
      finish('관계', '손편지 쓰기');
      // 월 5 = 물 · 걷기 · 명상 · 운동 · 손편지, 화 4 = 물 · 걷기 · 글쓰기 · 운동, 수 2 = 물 · 걷기
      v.week = { label: '이번 주', total: '11번', days: [['월', 5], ['화', 4], ['수', 2, 'today'], ['목', null], ['금', null], ['토', null], ['일', null]] };
    }
    if (name === 'late') {
      v.date = Object.assign({}, v.date, { day: 21, week: '43주', left: '올해 71일 남음' });
      v.weekFocus = [];
      finish('관계', '손편지 쓰기');
      finish('커리어', '이력서 갱신');
      Object.assign(row('이력서 갱신'), { text: '발표 1회', right: 'D-9' });
      row('주 3회 운동').meta = '이번 주 1/3회';
      v.week = { label: '이번 주', total: '10번', days: [['월', 4], ['화', 5], ['수', 1, 'today'], ['목', null], ['금', null], ['토', null], ['일', null]] };
    }
    return d;
  };

  /* one 중점 row with its check box.
       a habit that is due today   → today's own row: the box ticks today's time, the meta carries the week
                                     (건강 · 이번 주 2/3회)
       a one-time 실천             → a box that finishes it; once done it stays, ticked, for the week
                                     (관계 · 월요일에 했어요) */
  const focusRow = function (doc, f) {
    const r = doc.view.today.rows.find((x) => x.text === f.text);
    if (f.doneOn) return A.row(doc, { text: f.text, area: f.area, meta: `${f.doneOn}에 했어요`, done: true });
    return r ? A.todayRow(doc, r) : A.row(doc, { text: f.text, area: f.area });
  };
  const focusCount = (doc) => `${doc.view.weekFocus.filter((f) => f.doneOn).length}/${doc.view.weekFocus.length}`;
  const focusSection = (doc) =>
    `<section class="sec"><div class="a-section"><span class="t-label is-section">이번 주 중점</span><span class="sec-fig">${focusCount(doc)}</span></div>` +
    `<div class="a-list">${doc.view.weekFocus.map((f) => focusRow(doc, f)).join('')}</div></section>`;

  // the calendar glyph of the app's review row, in A.icon's grammar (24 box, 1.5 stroke, round)
  const CALENDAR = '<svg width="24" height="24" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.75" y="5.25" width="16.5" height="15" rx="3"/><path d="M3.75 10.25h16.5M8.25 3.25v4M15.75 3.25v4"/></g></svg>';

  /* WK.home(page, doc, opts)
     opts.focus   'group'  the proposal: 이번 주 중점 as its own small group, every pick with a box
                  'pinned' the app today: picks at the top of 오늘 할 일 with the tag 중점, no box unless due today
     opts.rows    how many rows of 오늘 할 일 to draw (default 5)
     opts.review  { title, meta, skip } the 한 주 돌아보기 row above the lists; skip = the quiet line under it */
  WK.home = function (page, doc, opts) {
    opts = opts || {};
    const v = doc.view, d = v.date, rows = v.today.rows;
    const focus = new Set(v.weekFocus.map((f) => f.text));
    const group = opts.focus === 'group' && v.weekFocus.length > 0;
    const n = opts.rows || 5;

    let list;
    if (group) {
      list = rows.filter((r) => !focus.has(r.text)).slice(0, n).map((r) => A.todayRow(doc, r));
    } else {
      const pinned = v.weekFocus.map((f) => {
        const r = rows.find((x) => x.text === f.text);
        return r ? A.todayRow(doc, r, { rightPrint: '중점' }) : A.row(doc, { text: f.text, area: f.area, meta: '이번 주', check: false, rightPrint: '중점' });
      });
      const rest = rows.filter((r) => !focus.has(r.text));
      const done = rest.find((r) => r.doneToday);
      const open = rest.filter((r) => !r.doneToday).slice(0, n - pinned.length - (done ? 1 : 0));
      list = pinned.concat(open.map((r) => A.todayRow(doc, r)), done ? [A.todayRow(doc, done)] : []);
    }

    const rv = opts.review;
    const review = rv
      ? `<div class="review"><div class="a-row">${CALENDAR}<div class="a-row-main"><div class="a-row-title">${rv.title}</div><div class="a-row-meta">${rv.meta}</div></div><div class="a-row-right is-icon">${A.icon('chevron', { size: 16 })}</div></div>${rv.skip ? `<div class="review-skip"><span>${rv.skip}</span></div>` : ''}</div>`
      : '';

    page.innerHTML =
      `<div class="js-header"></div><div class="a-body">` +
      `<div class="hero-row"><div class="hero-fields">` +
      `<div class="hero-field"><div class="t-label">오늘</div><div class="t-figure is-field">${v.today.done}/${v.today.of}</div></div>` +
      `<div class="hero-field"><div class="t-label">달성</div><div class="t-figure is-field">${v.progress.done}/${v.progress.of}<small>칸</small></div></div>` +
      `<div class="hero-field"><div class="t-label">남은 날</div><div class="t-figure is-field">${d.left.replace(/\D/g, '')}<small>일</small></div></div>` +
      `</div><div class="js-chart"></div></div>` +
      review +
      (group ? focusSection(doc) : '') +
      `<section class="sec"><div class="a-section"><span class="t-label is-section">오늘 할 일</span><span class="a-link">전체 보기${A.icon('chevron', { size: 16 })}</span></div><div class="a-list">${list.join('')}</div></section>` +
      `<section class="sec"><div class="a-section"><span class="t-label is-section">${v.week.label}</span><span class="sec-fig">${v.week.total}</span></div><div class="js-week"></div></section>` +
      `<section class="sec"><div class="a-section"><span class="t-label is-section">8개 영역</span></div><div class="js-ledger"></div></section>` +
      `</div><div class="js-bar"></div>`;

    A.header(q(page, '.js-header'), { eyebrow: `${d.month} ${d.day}일 ${d.weekday} · ${d.week}`, title: doc.coreGoal, headline: true, action: 'settings' });
    A.chart(q(page, '.js-chart'), doc, { level: 'L1', cell: 20 });
    A.weekStrip(q(page, '.js-week'), v.week);
    A.ledger(q(page, '.js-ledger'), doc);
    A.tabBar(q(page, '.js-bar'), { active: 'home' });
  };

  /* WK.today(page, doc, opts)
     opts.focus   'group'  the proposal: 이번 주 중점 first, then 오늘 할 일, each under its label
                  'pinned' the app today: picks that are due today first with the tag 중점; the others are not here
     The header figure and the filter counts are today's own (see week-notes.md): a habit pick that is due
     today is one of the ten wherever it is drawn; a one-time pick joins the count when it is ticked. */
  WK.today = function (page, doc, opts) {
    opts = opts || {};
    const v = doc.view, d = v.date, rows = v.today.rows;
    const focus = new Set(v.weekFocus.map((f) => f.text));
    const group = opts.focus === 'group' && v.weekFocus.length > 0;

    const filters = v.today.filters.map(([name, n], i) => {
      const a = A.areaIndex(doc, name);
      const mark = a >= 0 ? `<i class="a-dye" style="--d:var(--dye-${a + 1})"></i>` : '';
      return `<span class="filter${i === 0 ? ' is-on' : ''}">${mark}${name}${i === 0 ? '' : `<b>${n}</b>`}</span>`;
    }).join('');
    const more = `<div class="more"><span class="slot">${A.icon('plus', { size: 18 })}</span><span style="flex:1">실천에서 더 고르기</span>${A.icon('chevron', { size: 16 })}</div>`;

    let body;
    if (group) {
      const rest = rows.filter((r) => !focus.has(r.text)).map((r) => A.todayRow(doc, r)).join('');
      body = `<div class="groups">${focusSection(doc)}<section class="sec"><div class="a-section"><span class="t-label is-section">오늘 할 일</span></div><div class="a-list">${rest}</div>${more}</section></div>`;
    } else {
      const order = rows.filter((r) => focus.has(r.text)).concat(rows.filter((r) => !focus.has(r.text)));
      body = `<div class="a-list">${order.map((r) => A.todayRow(doc, r, focus.has(r.text) && !r.right ? { rightPrint: '중점' } : {})).join('')}</div>${more}`;
    }

    page.innerHTML = `<div class="js-header"></div><div class="filters" data-bleed>${filters}</div><div class="a-body">${body}</div><div class="js-bar"></div>`;
    A.header(q(page, '.js-header'), { eyebrow: `${d.month} ${d.day}일 ${d.weekday}`, title: '오늘', figure: `${v.today.done}/${v.today.of}`, action: 'more' });
    A.tabBar(q(page, '.js-bar'), { active: 'today' });
  };

  WK.CALENDAR = CALENDAR;
  global.WK = WK;
})(window);
