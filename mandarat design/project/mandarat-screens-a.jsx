// mandarat-screens-a.jsx — Grid, Dashboard, Detail (→ window)
const { useState: useStateA } = React;

// ── shared header ──
function Header({ M, kr, en, right, onBack }) {
  return (
    <div style={{ padding: '54px 20px 12px', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2,
          color: M.ink, marginLeft: -4,
        }}>
          <Icon name="chevL" size={20} color={M.ink} sw={2.2} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
          color: M.faint, fontFamily: 'Space Grotesk, sans-serif', marginBottom: 1 }}>{en}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: M.ink, letterSpacing: -0.5, lineHeight: 1.1 }}>{kr}</div>
      </div>
      {right}
    </div>
  );
}

function IconBtn({ M, name, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      width: 42, height: 42, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
      background: M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.ink,
    }}>
      <Icon name={name} size={21} color={M.ink} />
      {badge && <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7,
        borderRadius: 4, background: '#F4793B', border: `2px solid ${M.surface}` }} />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  MANDALART 9×9 GRID
// ─────────────────────────────────────────────────────────────
// cell slots for a block: returns 9 entries (idx 4 is center)
function blockSlots(kind, ti, done) {
  // kind: 'center' | 'theme'
  const ring = [0, 1, 2, 3, null, 4, 5, 6, 7]; // map cellpos -> ring index (null=center)
  return ring.map((r, pos) => {
    if (pos === 4) {
      return kind === 'center'
        ? { type: 'main', label: CENTER.kr }
        : { type: 'name', label: THEMES[ti].kr, color: THEMES[ti].color };
    }
    if (kind === 'center') {
      const th = THEMES[r];
      return { type: 'theme', label: th.kr, color: th.color, ti: r };
    }
    return { type: 'action', label: THEMES[ti].actions[r].kr, color: THEMES[ti].color,
      done: !!done[`${ti}-${r}`] };
  });
}

function Block({ kind, ti, done, M, t, onTap }) {
  const cellR = t.cellShape === '각진' ? 2 : 6;
  const slots = blockSlots(kind, ti, done);
  return (
    <div onClick={() => onTap && onTap(kind, ti)} style={{
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2.5,
      cursor: kind === 'theme' ? 'pointer' : 'default',
    }}>
      {slots.map((s, i) => {
        let bg, col, fw = 500, fs = 7.4;
        if (s.type === 'main') { bg = M.dark ? '#2A2731' : '#23211C'; col = '#fff'; fw = 800; fs = 8.2; }
        else if (s.type === 'name') { bg = s.color; col = '#fff'; fw = 800; fs = 8.6; }
        else if (s.type === 'theme') { bg = s.color; col = '#fff'; fw = 700; fs = 8.2; }
        else { // action
          bg = s.done ? s.color : tint(s.color, M.dark ? 24 : 16, M.dark);
          col = s.done ? '#fff' : (M.dark ? 'rgba(255,255,255,0.82)' : 'rgba(20,18,12,0.78)');
        }
        return (
          <div key={i} style={{
            aspectRatio: '1', borderRadius: cellR, background: bg, color: col,
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            fontSize: fs, fontWeight: fw, lineHeight: 1.04, padding: '1px 2px', overflow: 'hidden',
            letterSpacing: -0.2, position: 'relative', wordBreak: 'keep-all',
            boxShadow: s.type === 'action' && s.done ? `0 1px 4px ${s.color}55` : 'none',
          }}>
            {s.type === 'action' && s.done && (
              <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6,
                borderRadius: 4, background: 'rgba(255,255,255,0.9)' }} />
            )}
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

function GridScreen({ M, t, done, go }) {
  const [view, setView] = useStateA('mandala'); // mandala | full
  const blockOrder = [0, 1, 2, 3, 'c', 4, 5, 6, 7];
  const blockR = t.cellShape === '각진' ? 3 : 12;

  return (
    <div>
      <Header M={M} en="Mandal-Art" kr="만다라트"
        right={<IconBtn M={M} name="pencil" />} />

      {/* view toggle */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', gap: 4, background: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)',
          padding: 4, borderRadius: 13 }}>
          {[['mandala', '만다라 휠'], ['full', '격자 81칸']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{
              flex: 1, padding: '9px 0', border: 'none', borderRadius: 10, cursor: 'pointer',
              fontSize: 13.5, fontWeight: 700, letterSpacing: -0.2,
              background: view === k ? M.surface : 'transparent',
              color: view === k ? M.ink : M.sub,
              boxShadow: view === k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {view === 'mandala' ? (
        <div style={{ padding: '4px 12px 8px' }}>
          <MandalaWheel M={M} done={done} go={go} />
          <p style={{ textAlign: 'center', fontSize: 12.5, color: M.faint, marginTop: 20, fontWeight: 500 }}>
            중심의 큰 뜻을 8개의 길이 에워쌉니다 · 탭하여 펼치기
          </p>
        </div>
      ) : (
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ background: M.surface, borderRadius: blockR + 6, padding: 7,
            boxShadow: M.dark ? 'none' : '0 6px 22px rgba(30,24,12,0.07)',
            border: `1px solid ${M.line}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {blockOrder.map((b, i) => (
                <div key={i} style={{ background: b === 'c' ? (M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(35,33,28,0.04)') : 'transparent',
                  borderRadius: blockR, padding: b === 'c' ? 3 : 0, outline: b === 'c' ? `1.5px solid ${M.dark ? 'rgba(255,255,255,0.12)' : 'rgba(35,33,28,0.14)'}` : 'none' }}>
                  <Block kind={b === 'c' ? 'center' : 'theme'} ti={b === 'c' ? null : b}
                    done={done} M={M} t={t} onTap={(kind, ti) => kind === 'theme' && go('detail', ti)} />
                </div>
              ))}
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 12.5, color: M.faint, marginTop: 12, fontWeight: 500 }}>
            컬러 블록을 탭해 세부 목표를 열어보세요
          </p>
        </div>
      )}
    </div>
  );
}

// big center 3×3 — main goal + 8 themes
function FocusGrid({ M, t, done, go }) {
  const cellR = t.cellShape === '각진' ? 4 : 16;
  const cells = [0, 1, 2, 3, 'c', 4, 5, 6, 7];
  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
        {cells.map((c, i) => {
          if (c === 'c') {
            return (
              <div key={i} style={{ aspectRatio: '1', borderRadius: cellR, background: M.dark ? '#2A2731' : '#23211C',
                color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: 8, gap: 4 }}>
                <Icon name="target" size={20} color="rgba(255,255,255,0.7)" />
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.15, wordBreak: 'keep-all' }}>{CENTER.kr}</div>
                <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'Space Grotesk' }}>{CENTER.en}</div>
              </div>
            );
          }
          const th = THEMES[c];
          const p = themeProgress(th, done);
          return (
            <button key={i} onClick={() => go('detail', c)} style={{
              aspectRatio: '1', borderRadius: cellR, border: 'none', cursor: 'pointer',
              background: tint(th.color, M.dark ? 22 : 14, M.dark), color: M.ink,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', padding: 6, gap: 3, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: th.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={th.icon} size={17} color="#fff" />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.05, color: M.dark ? '#fff' : '#211F1A', wordBreak: 'keep-all' }}>{th.kr}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: th.color, fontFamily: 'Space Grotesk' }}>{p.done}/8</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────────
function Dashboard({ M, t, done, go, tx }) {
  const totalDone = Object.keys(done).filter(k => done[k]).length;
  const totalAll = 64;
  const pct = Math.round((totalDone / totalAll) * 100);
  const todayTotal = tx ? tx.tTotal : TODAY_PICKS.length;
  const todayDone = tx ? tx.tDone : TODAY_PICKS.filter(([ti, ai]) => done[`${ti}-${ai}`]).length;

  return (
    <div>
      <Header M={M} en="June 7 · Sat" kr="안녕하세요 👋"
        right={<IconBtn M={M} name="bell" badge />} />

      {/* hero — main goal */}
      <div style={{ padding: '0 20px 16px' }}>
        <div onClick={() => go('grid')} style={{
          borderRadius: 26, padding: 22, cursor: 'pointer', position: 'relative', overflow: 'hidden',
          background: M.hero, color: '#fff', boxShadow: '0 16px 34px rgba(24,18,44,0.28)',
          border: `1px solid ${M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'}` }}>
          <div style={{ position: 'absolute', right: -40, top: '50%', transform: 'translateY(-50%)' }}>
            <MandalaArt size={210} stroke={M.gold} opacity={0.3} rings={3} petals={20} sw={1} />
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18 }}>
            <Ring pct={pct} size={90} stroke={6} color={M.gold} track="rgba(255,255,255,0.14)">
              <Icon name="target" size={30} color={M.gold} />
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase', fontFamily: 'Space Grotesk' }}>My Core Goal</div>
              <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: -0.3, marginTop: 5, lineHeight: 1.12,
                fontFamily: "'Gowun Batang', serif" }}>{CENTER.kr}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 9, fontWeight: 500 }}>
                81칸 중 <b style={{ color: M.gold }}>{totalDone}개</b> 달성 · {pct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* today focus strip */}
      <div style={{ padding: '0 20px 18px' }}>
        <div onClick={() => go('today')} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderRadius: 20, cursor: 'pointer',
          background: M.surface, border: `1px solid ${M.line}`, boxShadow: M.dark ? 'none' : '0 4px 16px rgba(30,24,12,0.05)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: tint(M.accent, M.dark ? 22 : 14, M.dark),
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={22} color={M.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: M.ink }}>오늘의 실천</div>
            <div style={{ fontSize: 12.5, color: M.sub, marginTop: 1 }}>{todayDone}/{todayTotal} 완료 · 잘하고 있어요</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ring pct={(todayDone / todayTotal) * 100} size={34} stroke={4} color={M.accent} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'} />
            <Icon name="chevR" size={18} color={M.faint} />
          </div>
        </div>
      </div>

      {/* theme cards */}
      <div style={{ padding: '0 20px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: M.ink, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>8가지 핵심 영역</div>
        <div style={{ fontSize: 13, color: M.faint, fontWeight: 600, fontFamily: 'Space Grotesk', whiteSpace: 'nowrap' }}>8 Pillars</div>
      </div>
      <div style={{ padding: '10px 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {THEMES.map((th, ti) => {
          const p = themeProgress(th, done);
          return (
            <button key={ti} onClick={() => go('detail', ti)} style={{
              textAlign: 'left', border: `1px solid ${M.line}`, cursor: 'pointer',
              background: M.surface, borderRadius: 20, padding: 15, position: 'relative', overflow: 'hidden',
              boxShadow: M.dark ? 'none' : '0 4px 14px rgba(30,24,12,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: tint(th.color, M.dark ? 24 : 15, M.dark),
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={th.icon} size={21} color={th.color} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: th.color, fontFamily: 'Space Grotesk' }}>{p.done}<span style={{ color: M.faint }}>/8</span></div>
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: M.ink, letterSpacing: -0.3 }}>{th.kr}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: M.faint, fontFamily: 'Space Grotesk', marginBottom: 11, letterSpacing: 0.2 }}>{th.en.toUpperCase()}</div>
              <div style={{ height: 6, borderRadius: 3, background: M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p.pct}%`, background: th.color, borderRadius: 3, transition: 'width .6s ease' }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Header, IconBtn, GridScreen, Dashboard });
