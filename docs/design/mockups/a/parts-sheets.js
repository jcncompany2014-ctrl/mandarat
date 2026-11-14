/* ───────────────────────────────────────────────────────────────────────────
   방향 A · parts for the two inset sheets (editor.html, sheet.html). Round 2, builder's own file.
   Every part here is a KIT REQUEST: built only from tokens.css variables and shared.js calls, so it
   can move into shared.js / tokens.css as it stands. Load after shared.js.

     S.locator(doc, area, index, opts)  the block as a tiny 3×3: where this cell sits
     S.head(doc, area, index)           sheet header: locator + printed "건강 · 실천 3/8" + close (44pt, no circle)
     S.segment(options, selected)       2–5 exclusive options on a soft track. Ink fill = chosen.
     S.days(days)                       weekday letters over seven soft boxes (chosen / done / open / later / none)
     S.choice(r)                        choice row: one of many, trailing pen tick on the chosen row
     S.linkRow(r)                       a row that opens something: leading glyph, title, chevron
     S.memo(n, placeholder)             the memo as a soft tinted field
     S.icon(name)                       two glyphs the kit lacks: 'focus' (the minute tiles), 'bell'

   Clean round (white paper, Pretendard only): no frames, rules or dividers in any part; tiles with
   small gaps and round corners; inputs and segments are --tile fields with 12pt corners. The locator
   is the colour map in miniature: solid dye only for the area's own cell, pale tint = written,
   wash = done, --tile = empty.

   The three selection controls, one job each (CI-02):
     check box  independent yes/no. Two filled states, never confused:
                chosen = paper box, ink edge, small ink tick inside the box ("yes, this one");
                done   = A.check({ done }) wash + dye edge + pen tick that overshoots ("I did it").
     choice row one of many, as a list. Chosen = Medium title + trailing ink pen tick. No box.
     segment    one of 2–5, inline. Chosen = ink fill, paper text.
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const S = {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dpr = () => global.devicePixelRatio || 2;

  /* S.locator(doc, area, index, opts) → SVG string.
     The area's block as a 3×3 at mark size (default 36pt), drawn as the colour map is: soft tiles
     with a small gap and round corners, no frame and no rules. head = solid dye (one of the chart's
     16 area cells), done = the L1 wash, written = the pale tint (A.tint), empty = --tile, this cell
     = an ink ring (selection is ink). */
  S.locator = function (doc, area, index, opts) {
    opts = opts || {};
    const d = dpr();
    const size = opts.size || 36;
    const total = Math.round(size * d);
    const gap = Math.round(2 * d);
    const c = Math.floor((total - 2 * gap) / 3);
    const spare = total - 3 * c - 2 * gap;
    const cw = [c, c + spare, c];
    const xs = [0, c + gap, 2 * c + spare + 2 * gap];
    const rx = 2.5 * d;
    const a = doc.areas[area];
    let out = '';
    for (let i = 0; i < 9; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = xs[col], y = xs[row], w = cw[col], h = cw[row];
      const k = i < 4 ? i : i - 1;
      const act = a.actions[k] || {};
      const fill = i === 4 ? `var(--dye-${area + 1})` : act.done ? `var(--wash-l1-${area + 1})` : act.text ? A.tint(area) : 'var(--tile)';
      out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" style="fill:${fill}"/>`;
      if (i !== 4 && k === index) {
        const t = Math.round(1.5 * d);
        out += `<rect x="${x + t / 2}" y="${y + t / 2}" width="${w - t}" height="${h - t}" rx="${rx - t / 2}" fill="none" style="stroke:var(--ink)" stroke-width="${t}"/>`;
      }
    }
    return `<svg width="${total / d}" height="${total / d}" viewBox="0 0 ${total} ${total}" style="display:block;flex:none" aria-hidden="true">${out}</svg>`;
  };

  /* S.head(doc, area, index) → HTML. The sheet's one header line: where (locator + printed words),
     and one action, close. The × is an ink glyph in a 44pt target, no circle (CI-13). */
  S.head = function (doc, area, index) {
    const a = doc.areas[area];
    return `<div class="s-head">${S.locator(doc, area, index)}<div class="s-head-where"><span class="t-label"><i class="a-dye" style="--d:var(--dye-${area + 1})"></i>${esc(a.title)}</span><span class="t-label">실천 ${index + 1}/8</span></div><div class="s-head-close">${A.icon('close')}</div></div>`;
  };

  /* S.segment(['한 번', '습관', …], '습관') → HTML. A soft tinted track (10pt corners) divided into
     equal cells with no dividers; the chosen one is an ink fill inside it. */
  S.segment = function (options, selected) {
    return `<div class="s-seg" style="--n:${options.length}">${options.map((o) => `<span class="${o === selected ? 'is-on' : ''}">${esc(o)}</span>`).join('')}</div>`;
  };

  /* chosen: the printed box (same edge as an empty one) with an ink tick written inside it.
     Two inks: the box is the printer's, the tick is the owner's. Not a done mark: no wash, no overshoot. */
  S.chosenBox = function (size) {
    const s = size || 24;
    return `<svg class="a-check" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><rect x=".75" y=".75" width="22.5" height="22.5" rx="6" fill="none" style="stroke:var(--print-edge)" stroke-width="1.5"/><path d="M6.4 12.6C8 13.8 9.2 15.2 10.2 17 12.4 12.6 15 9.2 18 6.6" fill="none" style="stroke:var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };
  /* later: a day that has not come yet. No edge, only the tile tint: you cannot tick tomorrow. */
  S.laterBox = function (size) {
    const s = size || 24;
    return `<svg class="a-check" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><rect x="0" y="0" width="24" height="24" rx="6" style="fill:var(--tile)"/></svg>`;
  };

  /* S.days([{ d: '월', s: 'chosen' | 'done' | 'open' | 'later' | 'none', today, area }]) → HTML.
     Seven days, weekday letter over a 24pt soft box (the column is the 44pt target), no dividers.
     Sunday's letter is vermilion and today carries the 5pt vermilion dot under its box. */
  S.days = function (days) {
    return `<div class="s-days">${days.map((x) => {
      const box = x.s === 'chosen' ? S.chosenBox() : x.s === 'done' ? A.check({ done: true, area: x.area }) : x.s === 'open' ? A.check() : x.s === 'later' ? S.laterBox() : '<span class="s-days-none"></span>';
      return `<div class="s-day${x.today ? ' is-today' : ''}${x.d === '일' ? ' is-sunday' : ''}"><span class="t-label">${esc(x.d)}</span>${box}</div>`;
    }).join('')}</div>`;
  };

  // the pen tick alone, for a chosen choice row (18pt, writing ink)
  const penTick = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true"><path d="M3.5 13C6 14.8 7.8 17 9.2 19.8 12.4 12.8 16.4 7.4 21.5 3.2" fill="none" style="stroke:var(--ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* S.choice({ title, meta, on }) → HTML. A 54pt row (hairline between rows starts at the text);
     the chosen one is SemiBold with a pen tick. */
  S.choice = function (r) {
    return `<div class="a-row s-choice${r.on ? ' is-on' : ''}"><div class="a-row-main"><div class="a-row-title">${esc(r.title)}</div>${r.meta ? `<div class="a-row-meta">${esc(r.meta)}</div>` : ''}</div>${r.on ? penTick(18) : ''}</div>`;
  };

  /* S.linkRow({ icon, title, meta }) → HTML. Opens something: glyph in the check-box column, chevron right. */
  S.linkRow = function (r) {
    return `<div class="a-row s-link"><span class="s-link-glyph">${S.icon(r.icon) || A.icon(r.icon)}</span><div class="a-row-main"><div class="a-row-title">${esc(r.title)}</div>${r.meta ? `<div class="a-row-meta">${esc(r.meta)}</div>` : ''}</div>${A.icon('chevron', { size: 18 })}</div>`;
  };

  /* S.memo(n, placeholder) → HTML. A soft tinted field n lines tall (28pt a line), the placeholder
     printed in it. No ruled lines. */
  S.memo = function (n, placeholder) {
    return `<div class="s-memo" style="min-height:${n * 28}px">${placeholder ? `<span class="t-note">${esc(placeholder)}</span>` : ''}</div>`;
  };

  /* S.icon(name) → SVG string or ''. Same drawing rules as A.icon (24 box, 1.5 stroke, round caps and joins). */
  S.icon = function (name) {
    const P = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
    const body = {
      // the focus timer's own picture: its minute tiles (drawn 3×3 so it reads at 24pt), filling row by
      // row: four minutes gone in full ink, the rest as pale tiles (the tile tint of the chart)
      focus: (() => {
        let r = '';
        for (let i = 0; i < 9; i++) {
          const x = 3 + (i % 3) * 6.25, y = 3 + Math.floor(i / 3) * 6.25;
          r += `<rect x="${x}" y="${y}" width="5.5" height="5.5" rx="1.5" fill="currentColor"${i < 4 ? '' : ' fill-opacity="0.22"'}/>`;
        }
        return r;
      })(),
      bell: `<path d="M6.75 16.25V11a5.25 5.25 0 0 1 10.5 0v5.25l1.5 1.5H5.25z" ${P}/><path d="M10 20.25h4" ${P}/>`,
    }[name];
    return body ? `<svg width="24" height="24" viewBox="0 0 24 24" style="display:block;flex:none" aria-hidden="true">${body}</svg>` : '';
  };

  global.S = S;
})(window);
