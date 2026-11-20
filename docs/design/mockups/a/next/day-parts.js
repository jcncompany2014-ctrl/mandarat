/* ───────────────────────────────────────────────────────────────────────────
   하루의 끝과 시작 (day-*) — the scenes and the screens the day mockups share.
   Needs shared.js and parts-focus-dayclose.js (A.glyph) first. Draws only with the kit; a screen is
   built into an .a-page element, so one page can hold several (day-compare.html).

     D.scene(doc, name)           the demo document moved to one moment of the story
     D.today(page, doc, opts)     오늘, the open list from the top
     D.todayEnd(page, doc, opts)  오늘, scrolled to where the list ends
     D.closed(page, doc, opts)    오늘, the day closed

   The story (from the demo document's day, 10월 14일 수요일):
     'eve'     수 저녁  7 of 10 done. Left: 이력서 갱신 (커리어, 한 번, D-2) and two typed to-dos
                        (치과 예약 · 엄마 생신 선물). The other seven are the day's habits. To make room
                        for the two typed to-dos, 영어 회화 and 부모님 주 1통화 are not on this day's list.
     'ten'     수 저녁  the demo document's own ten, all done (= dayclose.html).
     'morning' 목 아침  10월 15일. The three left over are back, with the day's habits (아침 글쓰기 is
                        월·수·금, so it is not here). 0/9.
     'return'  일       10월 18일, the first open since 수요일. Sunday's habits and the same three. 0/10.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const D = {};
  const q = (root, sel) => root.querySelector(sel);

  D.scene = function (base, name) {
    const d = JSON.parse(JSON.stringify(base));
    const v = d.view;
    const pick = (t, extra) => Object.assign({}, v.today.rows.find((r) => r.text === t), { doneToday: false }, extra || {});
    const typed = (text, area, meta) => ({ text, area, meta: meta || '직접 적음', typed: true });
    const count = (rows) => {
      const n = {};
      rows.forEach((r) => { n[r.area] = (n[r.area] || 0) + 1; });
      return [['전체', rows.length]].concat(d.areas.filter((a) => n[a.title]).map((a) => [a.title, n[a.title]]));
    };
    const set = (rows) => {
      v.today.rows = rows;
      v.today.of = rows.length;
      v.today.done = rows.filter((r) => r.doneToday).length;
      v.today.filters = count(rows);
    };
    const weekOf = (days) => { v.week = { label: '이번 주', total: `${days.reduce((t, x) => t + (x[1] || 0), 0)}번`, days }; };
    const done = { doneToday: true };

    if (name === 'eve') {
      set([
        pick('이력서 갱신'),
        pick('주 3회 운동', Object.assign({ meta: '이번 주 1/3회' }, done)),
        pick('11시 취침', done), pick('1만보 걷기', done), pick('스트레칭 10분', done),
        pick('아침 글쓰기', done), pick('명상 10분', done), pick('하루 물 2L', done),
        typed('치과 예약', '건강'), typed('엄마 생신 선물', '관계'),
      ]);
      weekOf([['월', 3], ['화', 3], ['수', 7, 'today'], ['목', null], ['금', null], ['토', null], ['일', null]]);
    }
    if (name === 'ten') {
      set(v.today.rows.map((r) => Object.assign({}, r, done)));
      weekOf([['월', 3], ['화', 3], ['수', 10, 'today'], ['목', null], ['금', null], ['토', null], ['일', null]]);
    }
    if (name === 'morning') {
      v.date = Object.assign({}, v.date, { day: 15, weekday: '목요일', left: '올해 77일 남음' });
      set([
        pick('이력서 갱신', { meta: '어제부터', right: 'D-1' }),
        pick('주 3회 운동', { meta: '이번 주 1/3회' }),
        pick('11시 취침'), pick('1만보 걷기'), pick('스트레칭 10분'), pick('명상 10분'), pick('하루 물 2L'),
        typed('치과 예약', '건강', '어제부터'), typed('엄마 생신 선물', '관계', '어제부터'),
      ]);
      weekOf([['월', 3], ['화', 3], ['수', 7], ['목', 0, 'today'], ['금', null], ['토', null], ['일', null]]);
    }
    if (name === 'return') {
      v.date = Object.assign({}, v.date, { day: 18, weekday: '일요일', left: '올해 74일 남음' });
      set([
        pick('이력서 갱신', { meta: '수요일부터', right: 'D+2' }),
        pick('주 3회 운동', { meta: '이번 주 1/3회' }),
        pick('11시 취침'), pick('1만보 걷기'), pick('영어 회화'),
        { text: '가계부 쓰기', area: '재정', meta: '일요일 반복' },
        pick('명상 10분'), pick('하루 물 2L'),
        typed('치과 예약', '건강', '수요일부터'), typed('엄마 생신 선물', '관계', '수요일부터'),
      ]);
      weekOf([['월', 3], ['화', 3], ['수', 7], ['목', 0], ['금', 0], ['토', 0], ['일', 0, 'today']]);
    }
    return d;
  };

  // a row of today's list; a typed to-do carries the × that takes it off the list (as in the app)
  const rowHtml = function (doc, r) {
    const h = A.todayRow(doc, r);
    return r.typed ? h.replace(/<\/div>$/, `<div class="a-row-right is-icon is-x">${A.icon('close', { size: 16 })}</div></div>`) : h;
  };
  const filtersHtml = (doc) => doc.view.today.filters.map(([name, n], i) => {
    const a = A.areaIndex(doc, name);
    const mark = a >= 0 ? `<i class="a-dye" style="--d:var(--dye-${a + 1})"></i>` : '';
    return `<span class="filter${i === 0 ? ' is-on' : ''}">${mark}${name}${i === 0 ? '' : `<b>${n}</b>`}</span>`;
  }).join('');
  const moreHtml = () => `<div class="more"><span class="slot">${A.icon('plus', { size: 18 })}</span><span style="flex:1">실천에서 더 고르기</span>${A.icon('chevron', { size: 16 })}</div>`;
  const MOODS = ['힘듦', '별로', '보통', '좋음', '최고'];
  // the evening module and the week, exactly as dayclose.html draws them under the folded list
  const eveningHtml = (doc, mood) =>
    `<section class="module"><div class="t-label">오늘 기분</div><div class="a-seg">${MOODS.map((m, i) => `<div class="a-seg-cell${i === mood ? ' is-on' : ''}">${m}</div>`).join('')}</div>` +
    `<div class="gap"></div><div class="t-label">한 줄</div><div class="a-line"><span class="ph">오늘 한 줄</span></div></section>` +
    `<section class="week"><div class="a-section"><span class="t-label is-section">${doc.view.week.label}</span><span class="t-meta" style="color:var(--ink)">${doc.view.week.total}</span></div><div class="js-week"></div></section>`;

  /* D.today(page, doc, opts)
     opts.line  { say, do }  the one line under the title on the first open of the day: a printed sentence
                             and, at most, one written action on its right */
  D.today = function (page, doc, opts) {
    opts = opts || {};
    const v = doc.view, d = v.date;
    const line = opts.line ? `<div class="dayline"><span class="say">${opts.line.say}</span>${opts.line.do ? `<span class="do">${opts.line.do}</span>` : ''}</div>` : '';
    page.innerHTML =
      `<div class="js-header"></div>${line}<div class="filters" data-bleed>${filtersHtml(doc)}</div>` +
      `<div class="a-body"><div class="a-list">${v.today.rows.map((r) => rowHtml(doc, r)).join('')}</div>${moreHtml()}</div><div class="js-bar"></div>`;
    A.header(q(page, '.js-header'), { eyebrow: `${d.month} ${d.day}일 ${d.weekday}`, title: '오늘', figure: `${v.today.done}/${v.today.of}`, action: 'more' });
    A.tabBar(q(page, '.js-bar'), { active: 'today' });
  };

  /* D.todayEnd(page, doc, opts)
     The same page scrolled until the list's end is in view: its last rows, 실천에서 더 고르기, then the
     evening (오늘 기분 · 한 줄 · 이번 주) as on the closed day.
     opts.from  index of the first row in view (default 5)
     opts.link  true = the proposal: 오늘은 여기까지 하기 where the list ends */
  D.todayEnd = function (page, doc, opts) {
    opts = opts || {};
    const v = doc.view;
    const rows = v.today.rows.slice(opts.from === undefined ? 5 : opts.from);
    const link = opts.link ? `<div class="endday"><span>오늘은 여기까지 하기</span></div>` : '';
    page.innerHTML =
      `<div class="a-body" style="padding-top:8px"><div class="a-list">${rows.map((r) => rowHtml(doc, r)).join('')}</div>${moreHtml()}${link}${eveningHtml(doc, -1)}</div><div class="js-bar"></div>`;
    A.weekStrip(q(page, '.js-week'), v.week);
    A.tabBar(q(page, '.js-bar'), { active: 'today' });
  };

  /* D.closed(page, doc, opts)
     dayclose.html, for any count: the figure, the sentence, one printed line, the list folded to the
     row of what was done, then the evening. Nothing but the figure and opts.note differs between a
     day closed at 7/10 and one closed at 10/10. */
  D.closed = function (page, doc, opts) {
    opts = opts || {};
    const v = doc.view, d = v.date;
    const did = v.today.rows.filter((r) => r.doneToday);
    const areas = v.today.filters.slice(1).map(([name]) => name).filter((name) => did.some((r) => r.area === name));
    const marks = areas.map((name) => `<span><i class="a-dye" style="--d:var(--dye-${A.areaIndex(doc, name) + 1})"></i>${name}</span>`).join('');
    page.innerHTML =
      `<div class="js-header"></div><div class="a-body">` +
      `<section class="close"><div class="close-fig">${did.length}/${v.today.rows.length}</div><div class="t-prompt">오늘은 여기까지예요.</div><div class="t-note">${opts.note}</div></section>` +
      `<section class="sec"><div class="a-section"><span class="t-label is-section">오늘 할 일</span><span class="fold-open">펼치기${A.glyph('down', 16)}</span></div>` +
      `<div class="a-list fold"><div class="a-row">${A.check({ done: true })}<div class="a-row-main"><div class="a-row-title">${did[0].text}, ${did[1].text} 외 ${did.length - 2}개</div><div class="a-row-meta">${marks}</div></div></div></div></section>` +
      eveningHtml(doc, 3) +
      `</div><div class="js-bar"></div>`;
    A.header(q(page, '.js-header'), { eyebrow: `${d.month} ${d.day}일 ${d.weekday}`, title: '오늘', action: 'more' });
    A.weekStrip(q(page, '.js-week'), v.week);
    A.tabBar(q(page, '.js-bar'), { active: 'today' });
  };

  global.D = D;
})(window);
