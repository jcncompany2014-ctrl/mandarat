// mandarat-power.jsx — interactive overlays & power features (→ window)
const { useState: useP, useEffect: useEP, useRef: useRP } = React;

// ── bottom sheet shell (slide-up + scrim, CSS-driven) ──
function Sheet({ M, onClose, children, maxH = '88%' }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 55, display: 'flex', alignItems: 'flex-end',
      background: 'rgba(12,9,22,0.46)', animation: 'mxFade .26s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: M.surface, color: M.ink, borderRadius: '28px 28px 0 0',
        padding: '10px 0 30px', animation: 'mxSlideUp .34s cubic-bezier(.25,.9,.3,1)',
        boxShadow: '0 -12px 44px rgba(0,0,0,0.28)', maxHeight: maxH, overflowY: 'auto',
        border: `1px solid ${M.line}`, borderBottom: 'none' }}>
        <div style={{ width: 42, height: 5, borderRadius: 3, background: M.line, margin: '0 auto 8px' }} />
        {typeof children === 'function' ? children(onClose) : children}
      </div>
    </div>
  );
}

function Pill({ M, color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
      color, background: tint(color, M.dark ? 18 : 12, M.dark), padding: '5px 11px', borderRadius: 20 }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />{children}
    </span>
  );
}

// ── Action sheet: note · today · focus · complete ──
function ActionSheet({ M, item, done, toggle, getNote, setNote, inToday, toggleToday, onFocus, onClose }) {
  const { ti, ai } = item;
  const th = THEMES[ti], a = th.actions[ai], key = `${ti}-${ai}`;
  const isDone = !!done[key];
  const [note, setLocal] = useP(getNote(key) || '');
  const onToday = inToday(key);
  const writeNote = (v) => { setLocal(v); setNote(key, v); };

  return (
    <Sheet M={M} onClose={onClose}>
      {(close) => (
        <div style={{ padding: '4px 20px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Pill M={M} color={th.color}>{th.kr}</Pill>
            <button onClick={close} style={{ border: 'none', background: M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
              width: 30, height: 30, borderRadius: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.sub }}>
              <Icon name="plus" size={18} color={M.sub} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>
          <div style={{ fontSize: 23, fontWeight: 800, color: M.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>{a.kr}</div>
          <div style={{ fontSize: 13, color: M.faint, fontFamily: 'Space Grotesk', marginTop: 2 }}>{a.en}</div>

          {/* complete toggle */}
          <button onClick={() => toggle(ti, ai)} style={{
            width: '100%', marginTop: 18, padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            background: isDone ? tint(th.color, M.dark ? 22 : 14, M.dark) : th.color,
            color: isDone ? th.color : '#fff', fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>
            <Icon name={isDone ? 'checkCircle' : 'check'} size={20} color={isDone ? th.color : '#fff'} />
            {isDone ? '완료됨 · 탭하여 해제' : '완료로 표시'}
          </button>

          {/* row toggles */}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={() => toggleToday(key)} style={{
              flex: 1, padding: '13px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              border: `1.5px solid ${onToday ? th.color : M.line}`, background: onToday ? tint(th.color, M.dark ? 14 : 7, M.dark) : 'transparent' }}>
              <Icon name="sparkle" size={18} color={onToday ? th.color : M.faint} />
              <div style={{ fontSize: 13.5, fontWeight: 700, color: M.ink, marginTop: 6, whiteSpace: 'nowrap' }}>오늘 할 일</div>
              <div style={{ fontSize: 11, color: M.sub, fontWeight: 600 }}>{onToday ? '추가됨' : '추가하기'}</div>
            </button>
            <button onClick={() => onFocus(ti, ai)} style={{
              flex: 1, padding: '13px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              border: `1.5px solid ${M.line}`, background: 'transparent' }}>
              <Icon name="target" size={18} color={M.gold} />
              <div style={{ fontSize: 13.5, fontWeight: 700, color: M.ink, marginTop: 6, whiteSpace: 'nowrap' }}>집중 25분</div>
              <div style={{ fontSize: 11, color: M.sub, fontWeight: 600 }}>몰입 타이머</div>
            </button>
          </div>

          {/* note */}
          <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: M.sub }}>메모</div>
          <textarea value={note} onChange={e => writeNote(e.target.value)} placeholder="떠오르는 생각을 적어두세요…" rows={3}
            style={{ width: '100%', marginTop: 7, padding: '12px 14px', borderRadius: 14, resize: 'none',
              border: `1px solid ${M.line}`, background: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              color: M.ink, fontSize: 14, lineHeight: 1.5, outline: 'none' }} />
        </div>
      )}
    </Sheet>
  );
}

// ── Focus timer: calm full-cover countdown ──
function FocusTimer({ M, item, done, toggle, onClose }) {
  const { ti, ai } = item;
  const th = THEMES[ti], a = th.actions[ai], key = `${ti}-${ai}`;
  const TOTAL = 25 * 60;
  const [left, setLeft] = useP(TOTAL);
  const [run, setRun] = useP(true);
  useEP(() => {
    if (!run || left <= 0) return;
    const id = setInterval(() => setLeft(l => (l <= 1 ? 0 : l - 1)), 1000);
    return () => clearInterval(id);
  }, [run, left]);
  const pct = (1 - left / TOTAL) * 100;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const finished = left <= 0;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: M.center, color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28,
      animation: 'mxPop .3s ease' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
        <MandalaArt size={360} stroke={th.color} opacity={0.18} rings={3} petals={24} sw={1} />
      </div>
      <button onClick={onClose} style={{ position: 'absolute', top: 56, right: 22, border: 'none', cursor: 'pointer',
        background: 'rgba(255,255,255,0.12)', width: 40, height: 40, borderRadius: 20, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={22} color="#fff" style={{ transform: 'rotate(45deg)' }} />
      </button>

      <Pill M={M} color={th.color}>{th.kr}</Pill>
      <div style={{ position: 'relative', margin: '22px 0 8px' }}>
        <Ring pct={pct} size={232} stroke={6} color={th.color} track="rgba(255,255,255,0.12)">
          <div style={{ fontSize: 56, fontWeight: 700, fontFamily: 'Space Grotesk', letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>
            {finished ? '완료' : `${mm}:${ss}`}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginTop: 4, maxWidth: 170, textAlign: 'center', lineHeight: 1.3 }}>{a.kr}</div>
        </Ring>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {!finished && (
          <button onClick={() => setRun(r => !r)} style={{ padding: '13px 26px', borderRadius: 30, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 15, fontWeight: 700 }}>{run ? '일시정지' : '계속'}</button>
        )}
        <button onClick={() => { if (!done[key]) toggle(ti, ai); onClose(); }} style={{
          padding: '13px 26px', borderRadius: 30, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          background: th.color, color: '#fff', fontSize: 15, fontWeight: 800 }}>
          {finished ? '완료 처리' : '끝내고 완료'}
        </button>
      </div>
      <div style={{ marginTop: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontWeight: 500, whiteSpace: 'nowrap' }}>한 가지에만 머무르는 25분</div>
    </div>
  );
}

// ── Celebration: all today done ──
function Celebration({ M, onClose, count }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 65, background: M.center, color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, cursor: 'pointer', animation: 'mxPop .35s ease' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'mxPulse 3s ease-in-out infinite' }}>
        <MandalaArt size={420} stroke={M.gold} opacity={0.5} rings={4} petals={32} sw={1} />
      </div>
      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 300 }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', margin: '0 auto 18px', background: M.gold,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 50px ${M.gold}` }}>
          <Icon name="sparkle" size={40} color={M.center} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, color: M.gold, fontFamily: 'Space Grotesk', textTransform: 'uppercase' }}>Today Complete</div>
        <div style={{ fontSize: 27, fontWeight: 700, fontFamily: "'Gowun Batang', serif", marginTop: 12, lineHeight: 1.4 }}>
          <div style={{ whiteSpace: 'nowrap' }}>오늘의 만다라를</div>
          <div style={{ whiteSpace: 'nowrap' }}>완성했어요</div>
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 16, fontWeight: 500, whiteSpace: 'nowrap' }}>{count}가지 실천 · 중심에 한 걸음 더</div>
        <div style={{ marginTop: 26, fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>탭하여 닫기</div>
      </div>
    </div>
  );
}

// ── Mood row ──
const MOODS_FACE = [
  { ic: 'Angry', kr: '힘듦', c: '#E5547F' },
  { ic: 'Frown', kr: '별로', c: '#F4793B' },
  { ic: 'Meh', kr: '보통', c: '#E8A33D' },
  { ic: 'Smile', kr: '좋음', c: '#2FA968' },
  { ic: 'Laugh', kr: '최고', c: '#4DA3E0' },
];
function MoodRow({ M, value, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {MOODS_FACE.map((m, i) => {
        const on = value === i;
        return (
          <button key={i} onClick={() => onPick(i)} style={{
            flex: 1, padding: '11px 0 9px', borderRadius: 15, cursor: 'pointer',
            border: `1.5px solid ${on ? m.c : M.line}`, background: on ? tint(m.c, M.dark ? 18 : 11, M.dark) : 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all .15s' }}>
            <Icon name={m.ic} size={24} color={on ? m.c : M.faint} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: on ? m.c : M.faint }}>{m.kr}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Quick-add FAB + sheet ──
function FAB({ M, onClick }) {
  return (
    <button onClick={onClick} style={{ position: 'absolute', right: 18, bottom: 96, zIndex: 38,
      width: 56, height: 56, borderRadius: 20, border: 'none', cursor: 'pointer', background: M.accent,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      boxShadow: `0 8px 22px ${M.accent}66, 0 2px 6px rgba(0,0,0,0.2)` }}>
      <Icon name="plus" size={28} color="#fff" sw={2.4} />
    </button>
  );
}
function QuickAdd({ M, onAdd, onClose }) {
  const [ti, setTi] = useP(0);
  const [text, setText] = useP('');
  const add = (close) => { if (text.trim()) { onAdd(ti, text); close(); } };
  return (
    <Sheet M={M} onClose={onClose}>
      {(close) => (
        <div style={{ padding: '4px 20px 4px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: M.ink, letterSpacing: -0.3 }}>오늘 할 일 추가</div>
          <div style={{ fontSize: 12.5, color: M.sub, marginTop: 2, fontWeight: 500 }}>어떤 영역의 실천인가요?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 14 }}>
            {THEMES.map((th, i) => {
              const on = ti === i;
              return (
                <button key={i} onClick={() => setTi(i)} style={{ padding: '11px 4px 9px', borderRadius: 14, cursor: 'pointer',
                  border: `1.5px solid ${on ? th.color : M.line}`, background: on ? tint(th.color, M.dark ? 18 : 11, M.dark) : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <Icon name={th.icon} size={20} color={th.color} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: M.ink, whiteSpace: 'nowrap' }}>{th.kr}</span>
                </button>
              );
            })}
          </div>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="실천 항목을 입력하세요"
            onKeyDown={e => { if (e.key === 'Enter') add(close); }}
            style={{ width: '100%', marginTop: 14, padding: '14px 16px', borderRadius: 14, border: `1px solid ${M.line}`,
              background: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 15, outline: 'none' }} />
          <button onClick={() => add(close)} style={{ width: '100%', marginTop: 12, padding: '15px', borderRadius: 16, border: 'none',
            cursor: 'pointer', background: text.trim() ? THEMES[ti].color : M.line, color: '#fff', fontSize: 16, fontWeight: 800 }}>추가하기</button>
        </div>
      )}
    </Sheet>
  );
}

// ── Stats: contribution heatmap (70 days) ──
function Heatmap({ M }) {
  const weeks = 10, days = 7;
  // deterministic pseudo-intensity
  const cell = (w, d) => { const x = Math.sin((w * 7 + d) * 12.9898) * 43758.5453; const f = x - Math.floor(x); return Math.floor(f * 5); };
  const dayLabels = ['', '월', '', '수', '', '금', ''];
  return (
    <div style={{ display: 'flex', gap: 7 }}>
      <div style={{ display: 'grid', gridTemplateRows: `repeat(7, 1fr)`, gap: 4, paddingTop: 1 }}>
        {dayLabels.map((l, i) => <div key={i} style={{ fontSize: 9, color: M.faint, fontWeight: 600, height: 13, lineHeight: '13px' }}>{l}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks}, 1fr)`, gap: 4, flex: 1 }}>
        {Array.from({ length: weeks }).map((_, w) => (
          <div key={w} style={{ display: 'grid', gridTemplateRows: `repeat(${days}, 1fr)`, gap: 4 }}>
            {Array.from({ length: days }).map((_, d) => {
              const v = (w === weeks - 1 && d > 5) ? 0 : cell(w, d);
              const op = [0.06, 0.28, 0.5, 0.72, 1][v];
              return <div key={d} style={{ aspectRatio: '1', borderRadius: 4,
                background: v === 0 ? (M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : `color-mix(in srgb, ${M.accent} ${op * 100}%, transparent)` }} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({ M, done }) {
  const ranked = THEMES.map((th, ti) => ({ th, p: themeProgress(th, done).pct })).sort((a, b) => b.p - a.p);
  const top = ranked[0], low = ranked[ranked.length - 1];
  return (
    <div style={{ borderRadius: 22, padding: 18, background: M.hero, color: '#fff', position: 'relative', overflow: 'hidden',
      boxShadow: '0 12px 28px rgba(24,18,44,0.24)' }}>
      <div style={{ position: 'absolute', right: -30, top: -20 }}><MandalaArt size={150} stroke={M.gold} opacity={0.28} rings={2} petals={16} sw={1} /></div>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
        letterSpacing: 1.5, color: M.gold, fontFamily: 'Space Grotesk', textTransform: 'uppercase' }}>
        <Icon name="sparkle" size={14} color={M.gold} /> Insight
      </div>
      <div style={{ position: 'relative', fontSize: 16, fontWeight: 700, marginTop: 8, lineHeight: 1.45, letterSpacing: -0.2 }}>
        <b style={{ color: M.gold }}>{top.th.kr}</b> 영역이 가장 빛나고 있어요.<br />
        이번 주엔 <b style={{ color: '#fff' }}>{low.th.kr}</b>에 한 걸음 더 내딛어 볼까요?
      </div>
    </div>
  );
}

Object.assign(window, { Sheet, Pill, ActionSheet, FocusTimer, Celebration, MoodRow, FAB, QuickAdd, Heatmap, InsightCard });
