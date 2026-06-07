// mandarat-mandala.jsx — radial Mandala Wheel with bloom drilldown (→ window)
const { useState: useMW } = React;

function ringPositions(c, R, count, startAngle) {
  return Array.from({ length: count }).map((_, i) => {
    const a = startAngle + i * (Math.PI * 2 / count);
    return { i, a, x: c + R * Math.cos(a), y: c + R * Math.sin(a) };
  });
}

function MandalaWheel({ M, done, go }) {
  const [bloom, setBloom] = useMW(null); // theme index or null
  const size = 358, c = size / 2;
  const R = 121, nodeR = 35;
  const totalDone = Object.keys(done).filter(k => done[k]).length;
  const pct = Math.round((totalDone / 64) * 100);
  const pos = ringPositions(c, R, 8, -Math.PI / 2);

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '4px auto 0' }}>
      {/* sacred geometry backdrop */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <MandalaArt size={size} stroke={bloom == null ? M.gold : THEMES[bloom].color} opacity={M.dark ? 0.22 : 0.16} rings={3} petals={24} sw={1} />
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <circle cx={c} cy={c} r={R} fill="none" stroke={bloom == null ? M.gold : THEMES[bloom].color} strokeOpacity={0.34} strokeWidth={1} />
        {pos.map(n => (
          <line key={n.i} x1={c + 58 * Math.cos(n.a)} y1={c + 58 * Math.sin(n.a)}
            x2={n.x - (nodeR - 2) * Math.cos(n.a)} y2={n.y - (nodeR - 2) * Math.sin(n.a)}
            stroke={bloom == null ? M.gold : THEMES[bloom].color} strokeOpacity={0.38} strokeWidth={1} />
        ))}
      </svg>

      {bloom == null ? (
        <div style={{ animation: 'mxPop .3s ease' }}>
          {/* center core */}
          <div style={{ position: 'absolute', left: c - 58, top: c - 58, width: 116, height: 116 }}>
            <Ring pct={pct} size={116} stroke={4} color={M.gold} track={M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}>
              <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', background: M.center, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8,
                boxShadow: '0 8px 22px rgba(20,16,40,0.32)' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MandalaArt size={104} stroke={M.gold} opacity={0.32} rings={2} petals={12} sw={0.8} />
                </div>
                <div style={{ position: 'relative', fontFamily: "'Gowun Batang', serif", fontWeight: 700, fontSize: 14.5,
                  color: '#fff', lineHeight: 1.18, letterSpacing: -0.2, wordBreak: 'keep-all' }}>{CENTER.kr}</div>
                <div style={{ position: 'relative', fontSize: 11, fontWeight: 700, color: M.gold, fontFamily: 'Space Grotesk', marginTop: 3 }}>{pct}%</div>
              </div>
            </Ring>
          </div>
          {/* theme petals */}
          {pos.map(n => {
            const th = THEMES[n.i]; const p = themeProgress(th, done);
            return (
              <button key={n.i} onClick={() => setBloom(n.i)} style={{
                position: 'absolute', left: n.x - nodeR, top: n.y - nodeR, width: nodeR * 2, height: nodeR * 2 + 22,
                border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Ring pct={p.pct} size={nodeR * 2} stroke={3.5} color={th.color} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}>
                  <div style={{ width: nodeR * 2 - 12, height: nodeR * 2 - 12, borderRadius: '50%',
                    background: tint(th.color, M.dark ? 26 : 16, M.dark), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <Icon name={th.icon} size={21} color={th.color} />
                    <div style={{ fontSize: 9, fontWeight: 800, color: th.color, fontFamily: 'Space Grotesk' }}>{p.done}/8</div>
                  </div>
                </Ring>
                <div style={{ marginTop: 5, fontSize: 11, fontWeight: 700, color: M.ink, whiteSpace: 'nowrap', letterSpacing: -0.2 }}>{th.kr}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <BloomLayer M={M} ti={bloom} done={done} c={c} R={R} nodeR={31} onBack={() => setBloom(null)} go={go} />
      )}
    </div>
  );
}

function BloomLayer({ M, ti, done, c, R, nodeR, onBack, go }) {
  const th = THEMES[ti];
  const p = themeProgress(th, done);
  const pos = ringPositions(c, R, 8, -Math.PI / 2);
  return (
    <div style={{ animation: 'mxPop .32s ease' }}>
      {/* action nodes */}
      {pos.map(n => {
        const a = th.actions[n.i]; const isDone = !!done[`${ti}-${n.i}`];
        return (
          <button key={n.i} onClick={() => window.MX.openAction(ti, n.i)} style={{
            position: 'absolute', left: n.x - nodeR, top: n.y - nodeR, width: nodeR * 2, height: nodeR * 2 + 22,
            border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: nodeR * 2, height: nodeR * 2, borderRadius: '50%', position: 'relative',
              background: isDone ? th.color : tint(th.color, M.dark ? 24 : 15, M.dark),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isDone ? `0 3px 12px ${th.color}55` : 'none', border: `1.5px solid ${isDone ? th.color : tint(th.color, 36, M.dark)}` }}>
              {isDone ? <Icon name="check" size={22} color="#fff" sw={2.4} />
                : <span style={{ fontSize: 13, fontWeight: 800, color: th.color, fontFamily: 'Space Grotesk' }}>{n.i + 1}</span>}
            </div>
            <div style={{ marginTop: 5, fontSize: 9.5, fontWeight: 600, color: M.sub, width: 72, textAlign: 'center',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.kr}</div>
          </button>
        );
      })}
      {/* center = theme */}
      <button onClick={onBack} style={{ position: 'absolute', left: c - 58, top: c - 58, width: 116, height: 116,
        border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
        <Ring pct={p.pct} size={116} stroke={4} color={th.color} track={M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}>
          <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', background: th.color, overflow: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8,
            boxShadow: `0 8px 22px ${th.color}66` }}>
            <Icon name={th.icon} size={24} color="#fff" />
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginTop: 3, lineHeight: 1.1, wordBreak: 'keep-all' }}>{th.kr}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'Space Grotesk', marginTop: 2 }}>{p.done}/8 · 닫기</div>
          </div>
        </Ring>
      </button>
      {/* detail link */}
      <button onClick={() => go('detail', ti)} style={{ position: 'absolute', left: '50%', bottom: -2, transform: 'translateX(-50%)',
        border: 'none', cursor: 'pointer', background: tint(th.color, M.dark ? 18 : 11, M.dark), color: th.color,
        fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
        세부 보기 <Icon name="chevR" size={15} color={th.color} />
      </button>
    </div>
  );
}

Object.assign(window, { MandalaWheel });
