/* ───────────────────────────────────────────────────────────────────────────
   방향 A · parts for writing screens (onboarding.html, add.html).
   KIT REQUEST: these are parts the kit lacks. They are built only from tokens.css variables and
   the A.* functions in shared.js, so they can move into shared.js / tokens.css as they are.

   Load after shared.js:
     <script src="/docs/design/mockups/a/shared.js"></script>
     <script src="/docs/design/mockups/a/parts-input.js"></script>

     AP.keyboard(target)                the system keyboard, 336pt, as a plain grey block (not ours to draw)
     AP.field(target, opts)             the one text field: a --tile field (12pt corners), the ink caret
     AP.areaPicker(target, doc, opts)   the eight areas as 4 × 2 soft tiles: dye mark + name,
                                        the chosen one in its pale tint with the name in its dye
     AP.caret()                         the text caret (ink, or paper on an ink cell)
     .ap-grabber                        the grabber at the top of an inset sheet (CSS only)
   ─────────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  const AP = {};
  const el = (t) => (typeof t === 'string' ? document.querySelector(t) : t);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const css = `
  /* the system keyboard: a stand-in, not a design. Korean 2-beolsik with the predictive row = 336pt. */
  .ap-kb { position: absolute; left: 0; right: 0; bottom: 0; height: 336px; background: #D2D5DB; z-index: 20; }
  @media (prefers-color-scheme: dark) { .ap-kb { background: #2C2C2E; } }

  /* the caret: a 2pt bar in the colour of the text it follows */
  .ap-caret { display: inline-block; width: 2px; height: 1.05em; margin-left: 2px; vertical-align: -0.14em; background: currentColor; border-radius: 1px; }

  /* the text field, as on onboarding: a --tile field with 12pt corners, no outline.
     Placeholder = printed example (print ink), typed text = writing ink. Focus is the ink caret.
     The small button sits inside the field's right end. */
  .ap-field { display: flex; align-items: center; gap: 12px; height: 54px; padding: 0 8px 0 16px; border-radius: 12px; background: var(--tile); }
  .ap-field-text { flex: 1; min-width: 0; font: 500 17px/24px var(--sans); color: var(--ink); white-space: nowrap; overflow: hidden; }
  .ap-field-text.is-empty { color: var(--print); font-weight: 400; }
  .ap-field-text.is-empty .ap-caret { background: var(--ink); margin: 0 3px 0 0; }
  .ap-field .a-btn.is-small { flex: none; }
  .ap-field .a-btn.is-off { background: transparent; color: var(--ink-3); box-shadow: none; }

  /* the grabber of an inset sheet: a printed bar, "pull down to close" */
  .ap-grabber { width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: var(--print-mid); }

  /* area picker: eight soft tiles, 4 × 2, 6pt gaps, 12pt corners, no rules. Each is a 44pt target:
     dye mark + name on the neutral --tile. The chosen area takes its own pale tint (A.tint) with the
     name in its dye and Bold, as the areas on onboarding: one colour on the sheet, never a solid block.
     The mark stays, so the choice does not rest on colour alone (CI-05). */
  .ap-areas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .ap-area {
    height: 44px; display: flex; align-items: center; justify-content: center; gap: 0; padding: 0 4px;
    border-radius: 12px; background: var(--tile);
    font: 500 14px/18px var(--sans); color: var(--ink); letter-spacing: -0.01em; white-space: nowrap;
  }
  .ap-area .a-dye { width: 8px; height: 8px; margin-right: 6px; }
  .ap-area.is-on { font-weight: 700; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  AP.caret = () => '<i class="ap-caret"></i>';

  AP.keyboard = function (target) {
    const host = el(target);
    host.classList.add('ap-kb');
    host.setAttribute('aria-hidden', 'true');
    return host;
  };

  /* AP.field(target, opts)
     opts.value        typed text (writing ink), or empty
     opts.placeholder  printed example shown when empty
     opts.button       label of the small ink button at the right (null = none). Off while empty. */
  AP.field = function (target, opts) {
    opts = opts || {};
    const host = el(target);
    host.classList.add('ap-field');
    const empty = !opts.value;
    const text = empty
      ? `<div class="ap-field-text is-empty">${AP.caret()}${esc(opts.placeholder || '')}</div>`
      : `<div class="ap-field-text">${esc(opts.value)}${AP.caret()}</div>`;
    const btn = opts.button ? `<div class="a-btn is-small${empty ? ' is-off' : ''}">${esc(opts.button)}</div>` : '';
    host.innerHTML = text + btn;
    return host;
  };

  /* AP.areaPicker(target, doc, opts)
     opts.selected  area index 0..7 (the chosen one: its pale tint, the name in its dye, Bold). */
  AP.areaPicker = function (target, doc, opts) {
    opts = opts || {};
    const host = el(target);
    host.classList.add('ap-areas');
    host.innerHTML = doc.areas.map((a, i) => {
      const on = i === opts.selected;
      const style = on ? ` style="background:${global.A.tint(i)};color:var(--dye-${i + 1})"` : '';
      return `<div class="ap-area${on ? ' is-on' : ''}"${style}><i class="a-dye" style="--d:var(--dye-${i + 1})"></i>${esc(a.title)}</div>`;
    }).join('');
    return host;
  };

  global.AP = AP;
})(window);
