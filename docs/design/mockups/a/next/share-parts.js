/* ───────────────────────────────────────────────────────────────────────────
   방향 A · next · parts for the share images with words (share-*.html). Builder's own file.
   Built only from tokens.css variables and shared.js calls. Load after shared.js.

     SH.doc(doc)                     the demo document with seven cells lengthened (2–16 characters)
     SH.textChart(target, doc, o)    the 9×9 with the words in every cell, at image size
     SH.poster(target, doc, o)       the 4:5 share image (540 × 675 pt = 1080 × 1350 px): 색만 / 글자 넣기 / 빈 표
     SH.story(target, doc, o)        the same picture as a 9:16 story (540 × 960 pt = 1080 × 1920 px)
     SH.wallpaper(target, doc, o)    the same picture as a Lock Screen wallpaper (430 × 932 pt = 1290 × 2796 px)
     SH.lockScreen(target, date)     the system's Lock Screen furniture over a wallpaper (clock, buttons)

   The words in a cell (SH.textChart):
     · one type size per block. A block is set in the normal size; if any of its eight cells would
       need a fourth line or would have to break a word, the whole block steps down to the compact size.
     · lines break between words only (어절 단위), balanced, never a syllable alone on a line.
     · three lines at most. A text that still does not fit ends after its last whole word with "…".
     · grounds are the map's: name cells solid dye + white, done = wash, written = pale tint, empty = tile.
       Every pair is 4.5:1 or better (ink on a tint 13:1+, ink on a wash 9.2:1+, white on a dye 4.6:1+).
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const A = global.A;
  const SH = {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (t) => (typeof t === 'string' ? document.querySelector(t) : t);
  const dpr = () => global.devicePixelRatio || 2;

  const css = `
  /* the 4:5 image: the frame of share.html (the approved poster), unchanged */
  .sh-poster { position: relative; width: 540px; height: 675px; padding: 0 36px; background: var(--paper); overflow: hidden; }
  .sh-eyebrow { padding-top: 34px; font: 600 15px/20px var(--sans); color: var(--print); }
  .sh-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-top: 4px; }
  .sh-goal { font: 700 44px/54px var(--sans); letter-spacing: -0.035em; color: var(--ink); white-space: nowrap; }
  .sh-fig { font: 700 24px/30px var(--sans); letter-spacing: -0.02em; color: var(--ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .sh-fig small { font: 600 14px/18px var(--sans); color: var(--ink-2); margin-left: 3px; letter-spacing: 0; }
  .sh-sheet { margin-top: 22px; }
  .sh-sheet .a-cell.is-head { font-size: 13px; line-height: 16px; }
  .sh-sheet .a-cell.is-core { font-size: 13.5px; line-height: 16px; }
  .sh-foot { position: absolute; left: 36px; right: 36px; bottom: 19px; height: 22px; display: flex; align-items: center; justify-content: space-between; }
  .sh-brand { display: flex; align-items: center; gap: 8px; }
  .sh-word { font: 700 16px/20px var(--sans); letter-spacing: -0.01em; color: var(--print-strong); }
  .sh-date { font: 500 14px/20px var(--sans); color: var(--print); font-variant-numeric: tabular-nums; }

  /* the 9:16 story: the same picture, the same measure, with the story's own margins top and bottom */
  .sh-story { position: relative; width: 540px; height: 960px; padding: 0 36px; background: var(--paper); overflow: hidden; }
  .sh-story .sh-eyebrow { padding-top: 168px; }
  .sh-story .sh-foot { bottom: 164px; }

  /* the wallpaper: the sheet alone in the lower two thirds, the mark and the date under it */
  .sh-wall { position: relative; width: 430px; height: 932px; background: var(--paper); overflow: hidden; }
  .sh-wall .sh-sheet { position: absolute; margin: 0; }
  .sh-wall .sh-foot { left: auto; right: auto; bottom: auto; height: 20px; }
  .sh-wall .sh-word { font-size: 14px; line-height: 18px; }
  .sh-wall .sh-date { font-size: 12.5px; line-height: 18px; }

  /* the words on the sheet */
  .sh-chart { position: relative; flex: none; }
  .sh-chart svg { position: absolute; left: 0; top: 0; display: block; }
  .sh-c {
    position: absolute; display: flex; align-items: center; justify-content: center; text-align: center;
    font-family: var(--sans); font-weight: 500; letter-spacing: -0.02em; color: var(--ink); white-space: nowrap;
  }
  .sh-c.is-head { font-weight: 700; letter-spacing: -0.03em; color: var(--on-dye); }
  .sh-c.is-core { font-weight: 700; letter-spacing: -0.02em; color: var(--on-core); }
  .sh-measure { position: absolute; left: -9999px; top: 0; visibility: hidden; white-space: nowrap; font-family: var(--sans); font-weight: 500; letter-spacing: -0.02em; }

  /* the Lock Screen's own furniture: the system's, in neutral greys with no hue (as widgets.html) */
  .sh-lock { position: absolute; inset: 0; pointer-events: none; --lk: #1C1C1E; --lk-disc: rgba(60, 60, 67, 0.12); }
  @media (prefers-color-scheme: dark) { .sh-lock { --lk: #F2F2F2; --lk-disc: rgba(235, 235, 245, 0.16); } }
  .sh-lock-date { position: absolute; left: 0; right: 0; top: 76px; text-align: center; font: 600 20px/26px var(--sans); color: var(--lk); }
  .sh-lock-time { position: absolute; left: 0; right: 0; top: 100px; text-align: center; font: 700 106px/114px var(--sans); letter-spacing: -0.02em; color: var(--lk); font-variant-numeric: tabular-nums; }
  .sh-lock-btn { position: absolute; bottom: 48px; width: 54px; height: 54px; border-radius: 50%; background: var(--lk-disc); display: flex; align-items: center; justify-content: center; color: var(--lk); }
  .sh-lock-ind { position: absolute; left: 50%; bottom: 8px; width: 148px; height: 5px; margin-left: -74px; border-radius: 3px; background: var(--lk); }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const dye = (i) => `var(--dye-${i + 1})`;
  const wash = (i) => `var(--wash-${i + 1})`;

  /* SH.doc(doc) → a copy with seven cells lengthened, so the sheet carries what people really write:
     from two syllables (요가) to a sixteen-character sentence. Done flags are untouched. */
  SH.doc = function (doc) {
    const d = JSON.parse(JSON.stringify(doc));
    const set = (area, i, text) => { d.areas[A.areaIndex(d, area)].actions[i].text = text; };
    set('건강', 7, '밤 10시 이후 야식 끊기');
    set('커리어', 1, '사내 발표 한 번 하기');
    set('자기계발', 2, '퇴근 후 30분 영어 회화하기');
    set('자기계발', 6, '읽은 책 한 줄로 남기기');
    set('재정', 4, '월급날 20% 저축하기');
    set('취미', 4, '한 달에 한 번 등산 가기');
    set('마음챙김', 5, '자기 전 세 줄 일기 쓰기');
    return d;
  };

  /* ── measuring and breaking ────────────────────────────────────────────── */
  let ruler = null;
  const widths = new Map();
  function widthOf(text, size, weight, ls) {
    const key = size + '|' + weight + '|' + ls + '|' + text;
    if (widths.has(key)) return widths.get(key);
    if (!ruler) { ruler = document.createElement('span'); ruler.className = 'sh-measure'; document.body.appendChild(ruler); }
    ruler.style.fontSize = size + 'px';
    ruler.style.fontWeight = weight;
    ruler.style.letterSpacing = ls + 'em';
    ruler.textContent = text;
    const w = ruler.getBoundingClientRect().width - size * Math.abs(ls);   // no tracking after the last glyph
    widths.set(key, w);
    return w;
  }
  const syllables = (s) => [...s.replace(/\s/g, '')].length;
  // one-syllable words that lean on the word before them: counters and bound nouns
  const BACK = new Set('번 줄 잔 권 개 곳 명 분 원 회 장 편 끼 통 살 쪽 전 후 뒤 때 중 안 밖 것 수 등'.split(' '));

  /* breakLines(words, measure, max, maxLines) → lines or null.
     Every way to break between words is tried (a cell holds at most a dozen words): fewest lines first,
     never a syllable alone on a line, then the most even lines. */
  function breakLines(words, measure, max, maxLines) {
    const n = words.length;
    if (n > 12) return null;
    let best = null;
    for (let mask = 0; mask < 1 << (n - 1); mask++) {
      const lines = [];
      let cur = words[0];
      for (let i = 1; i < n; i++) {
        if (mask & (1 << (i - 1))) { lines.push(cur); cur = words[i]; } else cur += ' ' + words[i];
      }
      lines.push(cur);
      if (lines.length > maxLines) continue;
      const ws = lines.map(measure);
      const widest = Math.max(...ws);
      if (widest > max) continue;
      let cost = lines.length * 100 + ((widest - Math.min(...ws)) / max) * 10 + (widest / max) * 4;
      if (lines.length > 1) lines.forEach((l, k) => {
        if (syllables(l) === 1) cost += 1000;                       // a syllable alone on a line
        const w = l.split(' ');
        const last = w[w.length - 1], first = w[0];
        // a one-syllable word belongs to a neighbour: a counter or a bound noun to the word before it
        // (한 번 · 세 줄 · 자기 전), anything else to the word after it (새 친구 · 주 3회 · 단 음식)
        if (k < lines.length - 1 && [...last].length === 1 && !BACK.has(last)) cost += 40;
        if (k > 0 && BACK.has(first)) cost += 40;
      });
      if (!best || cost < best.cost) best = { lines, cost };
    }
    return best && best.lines;
  }

  /* fit(text, sizes, max, maxLines) → { lines, step, cut } with the first size at which the text
     breaks cleanly; at the last size a text that still does not fit is cut after a whole word. */
  function fitText(text, size, max, maxLines, weight, ls) {
    const words = String(text).trim().split(/\s+/);
    const measure = (s) => widthOf(s, size, weight, ls);
    return breakLines(words, measure, max, maxLines);
  }
  function cutText(text, size, max, maxLines, weight, ls) {
    const words = String(text).trim().split(/\s+/);
    const measure = (s) => widthOf(s, size, weight, ls);
    for (let k = words.length - 1; k >= 1; k--) {
      const part = words.slice(0, k);
      part[k - 1] += '…';
      const lines = breakLines(part, measure, max, maxLines);
      if (lines) return lines;
    }
    return [words[0]];
  }

  // an area name of four or more syllables in one word (자기계발, 마음챙김) sets as two lines of two, as on the map
  function headLines(t) {
    const s = String(t);
    if (s.includes(' ')) return null;
    const ch = [...s];
    return ch.length >= 4 ? [ch.slice(0, Math.ceil(ch.length / 2)).join(''), ch.slice(Math.ceil(ch.length / 2)).join('')] : [s];
  }

  /* SH.textChart(target, doc, o) → { el, size, compact: [area…] }
     The sheet with its words. Geometry is given in device pixels so every tile lands on a whole pixel.
     o.d       device pixels per pt of the canvas (2 for the 1080 images, 3 for the wallpaper)
     o.cell    cell side in device px; o.gap between cells; o.block between blocks
     o.radius  tile corner in pt
     o.pad     air between a tile's edge and its words, in pt (each side)
     o.sizes   [[size, lineHeight], [compactSize, compactLineHeight]] in pt for the 64 action cells
     o.head    [size, lineHeight] for the 16 name cells; o.core for the goal
     o.blank   true = names and the goal only (빈 표)
     o.words   false = colour only (색만) */
  SH.textChart = function (target, doc, o) {
    const d = o.d || dpr();
    const xs = [];
    let x = 0;
    for (let i = 0; i < 9; i++) { xs.push(x); x += o.cell; if (i < 8) x += i % 3 === 2 ? o.block : o.gap; }
    const total = x;
    const cellPt = o.cell / d;
    const inner = cellPt - 2 * o.pad;
    const cells = A.cells(doc);
    const rx = o.radius * d;

    // one size per block
    const step = new Array(8).fill(0);
    const laid = new Map();
    for (let a = 0; a < 8; a++) {
      const mine = cells.filter((c) => c.kind === 'action' && c.area === a && c.text && !o.blank);
      let s = 0;
      for (; s < o.sizes.length; s++) {
        if (mine.every((c) => fitText(c.text, o.sizes[s][0], inner, 3, 500, -0.02))) break;
      }
      if (s === o.sizes.length) s = o.sizes.length - 1;
      step[a] = s;
      mine.forEach((c) => {
        const size = o.sizes[s][0];
        laid.set(c, fitText(c.text, size, inner, 3, 500, -0.02) || cutText(c.text, size, inner, 3, 500, -0.02));
      });
    }

    let fills = '', html = '';
    cells.forEach((c) => {
      const px = xs[c.col], py = xs[c.row];
      const written = c.kind === 'action' && c.text && !o.blank;
      const fill = c.kind === 'core' ? 'var(--core)' : c.kind !== 'action' ? dye(c.area) : !written ? 'var(--tile)' : c.done ? wash(c.area) : A.tint(c.area);
      fills += `<rect x="${px}" y="${py}" width="${o.cell}" height="${o.cell}" rx="${rx}" style="fill:${fill}"/>`;
      if (o.words === false && c.kind === 'action') return;
      let lines, font, cls = '';
      if (c.kind === 'core') { lines = fitText(c.text, o.core[0], cellPt - 6, 3, 700, -0.02) || [c.text]; font = o.core; cls = ' is-core'; }
      else if (c.kind !== 'action') { lines = headLines(c.text) || fitText(c.text, o.head[0], cellPt - 4, 3, 700, -0.03) || [c.text]; font = o.head; cls = ' is-head'; }
      else if (written) { lines = laid.get(c); font = o.sizes[step[c.area]]; }
      else return;
      html += `<div class="sh-c${cls}" style="left:${px / d}px;top:${py / d}px;width:${cellPt}px;height:${cellPt}px;font-size:${font[0]}px;line-height:${font[1]}px"><span>${lines.map(esc).join('<br>')}</span></div>`;
    });

    const host = el(target);
    host.classList.add('sh-chart');
    host.style.width = total / d + 'px';
    host.style.height = total / d + 'px';
    host.innerHTML = `<svg width="${total / d}" height="${total / d}" viewBox="0 0 ${total} ${total}" aria-hidden="true">${fills}</svg>${html}`;
    return { el: host, size: total / d, compact: step.map((s, i) => (s ? i : -1)).filter((i) => i >= 0) };
  };

  // the sheet at 1080: 96px cells, 6px between cells, 18px between blocks = 936px (468pt)
  SH.IMAGE = { d: 2, cell: 96, gap: 6, block: 18, radius: 5, pad: 5, sizes: [[10, 13], [8.5, 11]], head: [12, 15], core: [12.5, 15] };
  // the sheet on the wallpaper at 1290: 120px cells, 8px, 22px = 1172px (390.67pt)
  SH.WALL = { d: 3, cell: 120, gap: 8, block: 22, radius: 4.33, pad: 4, sizes: [[8.5, 11], [7.25, 9.5]], head: [10, 12.5], core: [10.5, 13] };

  function footHtml() { return `<div class="sh-foot"><div class="sh-brand"><span data-mark></span><span class="sh-word">만다라트</span></div><span class="sh-date" data-date></span></div>`; }
  function fillFoot(host, doc, markSize) {
    const d = doc.view.date;
    A.mark(host.querySelector('[data-mark]'), { size: markSize, variant: 'heart' });
    host.querySelector('[data-date]').textContent = `${d.year}. ${parseInt(d.month, 10)}. ${d.day}.`;
  }
  function drawSheet(node, doc, mode, geo) {
    if (mode === 'text') return SH.textChart(node, doc, geo);
    // 색만 and 빈 표 are the approved poster's map, drawn by the kit as share.html does
    return A.chart(node, mode === 'blank' ? A.blankDoc(doc) : doc, { level: 'L2', map: true, cell: 48, width: 468 });
  }
  function frame(host, cls, doc, o) {
    const mode = o.mode || 'text';
    const d = doc.view.date, p = doc.view.progress;
    host.innerHTML = `<div class="${cls}"${o.zoom ? ` style="zoom:${o.zoom}"` : ''}>
      <div class="sh-eyebrow">${d.year} 핵심 목표</div>
      <div class="sh-head"><div class="sh-goal">${esc(doc.coreGoal)}</div>${mode === 'blank' ? '' : `<div class="sh-fig">${p.done}/${p.of}<small>칸</small></div>`}</div>
      <div class="sh-sheet"></div>
      ${footHtml()}
    </div>`;
    const out = drawSheet(host.querySelector('.sh-sheet'), doc, mode, SH.IMAGE);
    fillFoot(host, doc, 22);
    return out;
  }

  /* SH.poster(target, doc, { mode: 'map' | 'text' | 'blank', zoom }) — the 4:5 image.
     zoom draws the whole image smaller with real type sizes (the sheet's preview), as the app does. */
  SH.poster = function (target, doc, o) { return frame(el(target), 'sh-poster', doc, o || {}); };

  /* SH.story(target, doc, { mode, zoom }) — 9:16. The top 250px and the bottom 300px of a story are the
     host app's (name, reply field), so the picture sits between them on the same 468pt measure. */
  SH.story = function (target, doc, o) { return frame(el(target), 'sh-story', doc, o || {}); };

  /* SH.wallpaper(target, doc, { mode, zoom }) — the Lock Screen wallpaper, 430 × 932 pt at 3x.
     The top third belongs to the clock and the widgets; the sheet starts at y = 352 and the mark and
     the date close it at y = 772, clear of the two buttons at the foot (from y = 830). No title: the
     goal is the centre of the sheet, and the clock is the only large thing on a Lock Screen. */
  SH.wallpaper = function (target, doc, o) {
    o = o || {};
    const host = el(target);
    const g = SH.WALL;
    const total = (9 * g.cell + 6 * g.gap + 2 * g.block) / g.d;
    const left = Math.floor((430 * g.d - total * g.d) / 2) / g.d;
    host.innerHTML = `<div class="sh-wall"${o.zoom ? ` style="zoom:${o.zoom}"` : ''}><div class="sh-sheet" style="left:${left}px;top:352px"></div>${footHtml()}</div>`;
    const out = o.mode === 'map' || o.mode === 'blank'
      ? SH.textChart(host.querySelector('.sh-sheet'), doc, Object.assign({}, g, { words: false, blank: o.mode === 'blank' }))
      : SH.textChart(host.querySelector('.sh-sheet'), doc, g);
    const foot = host.querySelector('.sh-foot');
    foot.style.left = left + 'px';
    foot.style.width = total + 'px';
    foot.style.top = 352 + total + 20 + 'px';
    fillFoot(host, doc, 18);
    return out;
  };

  /* SH.lockScreen(target, { date, time }) — the clock, the two buttons and the home indicator, laid
     over a wallpaper so the fit can be judged. Not ours to design: plain, neutral, no hue. */
  SH.lockScreen = function (target, o) {
    const host = el(target);
    host.classList.add('sh-lock');
    host.innerHTML = `<div class="sh-lock-date">${esc(o.date)}</div><div class="sh-lock-time">${esc(o.time)}</div>
      <div class="sh-lock-btn" style="left:48px"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M8 3.75h8v3.5l-2 3v10h-4v-10l-2-3z"/><path d="M12 13v2.5" stroke-linecap="round"/></svg></div>
      <div class="sh-lock-btn" style="right:48px"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3.75 7.75h4l1.5-2.5h5.5l1.5 2.5h4v11h-16.5z"/><circle cx="12" cy="13" r="3.25"/></svg></div>
      <div class="sh-lock-ind"></div>`;
    return host;
  };

  global.SH = SH;
})(window);
