// mandarat-screens-b.jsx — Detail, Today (3 variants), Stats (→ window)
const { useState: useStateB } = React;

// ─────────────────────────────────────────────────────────────
//  THEME DETAIL
// ─────────────────────────────────────────────────────────────
function Detail({ M, t, done, toggle, go, ti }) {
  const th = THEMES[ti];
  const p = themeProgress(th, done);
  const cellR = t.cellShape === '각진' ? 4 : 14;
  const ring = [0, 1, 2, 3, null, 4, 5, 6, 7];

  return (
    <div>
      <Header M={M} en={th.en} kr={th.kr} onBack={() => go('grid')}
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <IconBtn M={M} name="chevL" onClick={() => go('detail', (ti + 7) % 8)} />
            <IconBtn M={M} name="chevR" onClick={() => go('detail', (ti + 1) % 8)} />
          </div>
        } />

      {/* hero */}
      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ borderRadius: 24, padding: 20, display: 'flex', alignItems: 'center', gap: 18,
          background: tint(th.color, M.dark ? 20 : 12, M.dark), border: `1px solid ${tint(th.color, 30, M.dark)}` }}>
          <Ring pct={p.pct} size={84} stroke={8} color={th.color} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: th.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={th.icon} size={22} color="#fff" />
            </div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: M.ink, letterSpacing: -0.5, fontFamily: 'Space Grotesk' }}>
              {p.done}<span style={{ fontSize: 18, color: M.faint }}> / 8</span>
            </div>
            <div style={{ fontSize: 13.5, color: M.sub, fontWeight: 600, marginTop: 2 }}>실천 항목 달성</div>
            <div style={{ fontSize: 12, color: th.color, fontWeight: 700, marginTop: 6, whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: 4, background: M.surface, padding: '3px 9px', borderRadius: 20 }}>
              <Icon name="flame" size={13} color={th.color} /> {STREAKS[ti].cur}일 연속
            </div>
          </div>
        </div>
      </div>

      {/* mini 3×3 */}
      <div style={{ padding: '0 20px 6px', fontSize: 14, fontWeight: 800, color: M.ink }}>실천 보드</div>
      <div style={{ padding: '10px 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
          {ring.map((r, pos) => {
            if (pos === 4) {
              return (
                <div key={pos} style={{ aspectRatio: '1', borderRadius: cellR, background: th.color, color: '#fff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 6, gap: 4 }}>
                  <Icon name={th.icon} size={20} color="rgba(255,255,255,0.85)" />
                  <div style={{ fontSize: 14, fontWeight: 800, wordBreak: 'keep-all', lineHeight: 1.1 }}>{th.kr}</div>
                </div>
              );
            }
            const a = th.actions[r];
            const isDone = !!done[`${ti}-${r}`];
            return (
              <button key={pos} onClick={() => toggle(ti, r)} style={{
                aspectRatio: '1', borderRadius: cellR, border: 'none', cursor: 'pointer',
                background: isDone ? th.color : tint(th.color, M.dark ? 20 : 12, M.dark),
                color: isDone ? '#fff' : M.ink, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 7, gap: 5,
                position: 'relative', transition: 'all .2s', wordBreak: 'keep-all' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.12,
                  color: isDone ? '#fff' : (M.dark ? '#fff' : '#211F1A') }}>{a.kr}</div>
                {isDone && <span style={{ position: 'absolute', top: 6, right: 6 }}><Icon name="check" size={13} color="#fff" sw={2.6} /></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* action list */}
      <div style={{ padding: '0 20px 4px', fontSize: 14, fontWeight: 800, color: M.ink }}>체크리스트</div>
      <div style={{ padding: '10px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {th.actions.map((a, ai) => {
          const isDone = !!done[`${ti}-${ai}`];
          return (
            <div key={ai} onClick={() => window.MX.openAction(ti, ai)} style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 16, cursor: 'pointer',
              border: `1px solid ${M.line}`, background: isDone ? tint(th.color, M.dark ? 14 : 7, M.dark) : M.surface, textAlign: 'left' }}>
              <button onClick={(e) => { e.stopPropagation(); toggle(ti, ai); }} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex' }}>
                <Check on={isDone} color={th.color} dark={M.dark} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: isDone ? M.sub : M.ink,
                  textDecoration: isDone ? 'line-through' : 'none', letterSpacing: -0.2 }}>{a.kr}</div>
                <div style={{ fontSize: 11.5, color: M.faint, fontFamily: 'Space Grotesk', marginTop: 1 }}>{a.en}</div>
              </div>
              {window.MX.getNote(`${ti}-${ai}`) && <Icon name="pencil" size={14} color={M.faint} />}
              <Icon name="chevR" size={17} color={M.faint} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TODAY  (3 management styles)
// ─────────────────────────────────────────────────────────────
function Today({ M, t, done, toggle, go, tx }) {
  const right = <IconBtn M={M} name="calendar" />;
  return (
    <div>
      <Header M={M} en="Today · June 7" kr="오늘의 실천" right={right} />
      {/* mgmt-style switch hint */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
          color: M.sub, background: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', padding: '6px 11px', borderRadius: 20 }}>
          <Icon name="sparkle" size={13} color={M.sub} /> 관리 방식 · {t.mgmt}
        </div>
      </div>
      {t.mgmt === '습관 스트릭' ? <TodayStreak M={M} done={done} go={go} />
        : t.mgmt === '칸반' ? <TodayKanban M={M} t={t} done={done} toggle={toggle} />
          : <TodayChecklist M={M} t={t} done={done} toggle={toggle} go={go} tx={tx} />}
    </div>
  );
}

function TodayChecklist({ M, done, toggle, tx }) {
  const { list, extra, toggleExtra, mood, setMood, reflection, setReflection, openAction, tDone, tTotal } = tx;
  const pct = tTotal ? Math.round((tDone / tTotal) * 100) : 0;
  return (
    <div style={{ padding: '0 20px 16px' }}>
      {/* progress banner */}
      <div style={{ borderRadius: 22, padding: 20, marginBottom: 16, color: '#fff',
        background: 'linear-gradient(135deg,#F4793B,#E5547F)', boxShadow: '0 10px 26px rgba(229,84,127,0.28)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, whiteSpace: 'nowrap' }}>오늘의 진행</div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, fontFamily: 'Space Grotesk', marginTop: 2, whiteSpace: 'nowrap' }}>
              {tDone}<span style={{ fontSize: 20, opacity: 0.7 }}>/{tTotal}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{pct}%</div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.28)', marginTop: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 4, transition: 'width .5s ease' }} />
        </div>
      </div>

      {/* mood + reflection */}
      <div style={{ borderRadius: 20, padding: 16, marginBottom: 18, background: M.surface, border: `1px solid ${M.line}`,
        boxShadow: M.dark ? 'none' : '0 4px 14px rgba(30,24,12,0.04)' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: M.ink, marginBottom: 11 }}>오늘의 기분</div>
        <MoodRow M={M} value={mood} onPick={setMood} />
        <input value={reflection} onChange={e => setReflection(e.target.value)} placeholder="한 줄 회고를 남겨보세요…"
          style={{ width: '100%', marginTop: 12, padding: '12px 14px', borderRadius: 13, border: `1px solid ${M.line}`,
            background: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 14, outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(([ti, ai], i) => {
          const th = THEMES[ti]; const a = th.actions[ai]; const isDone = !!done[`${ti}-${ai}`];
          return (
            <div key={'b' + i} onClick={() => openAction(ti, ai)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, cursor: 'pointer',
              border: `1px solid ${M.line}`, background: isDone ? tint(th.color, M.dark ? 14 : 7, M.dark) : M.surface, textAlign: 'left',
              boxShadow: M.dark ? 'none' : '0 3px 12px rgba(30,24,12,0.04)' }}>
              <button onClick={(e) => { e.stopPropagation(); toggle(ti, ai); }} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex' }}>
                <Check on={isDone} color={th.color} dark={M.dark} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: isDone ? M.sub : M.ink,
                  textDecoration: isDone ? 'line-through' : 'none', letterSpacing: -0.2 }}>{a.kr}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, whiteSpace: 'nowrap' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: th.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: M.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>{th.kr}</span>
                </div>
              </div>
              <Icon name="chevR" size={17} color={M.faint} />
            </div>
          );
        })}

        {/* custom tasks */}
        {extra.map((x) => {
          const th = THEMES[x.ti];
          return (
            <button key={'x' + x.id} onClick={() => toggleExtra(x.id)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
              border: `1px dashed ${tint(th.color, 40, M.dark)}`, background: x.done ? tint(th.color, M.dark ? 14 : 7, M.dark) : M.surface }}>
              <Check on={x.done} color={th.color} dark={M.dark} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: x.done ? M.sub : M.ink,
                  textDecoration: x.done ? 'line-through' : 'none', letterSpacing: -0.2 }}>{x.text}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, whiteSpace: 'nowrap' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: th.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: M.sub, fontWeight: 600 }}>{th.kr} · 직접 추가</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TodayStreak({ M, done, go }) {
  const totalCur = STREAKS.reduce((s, x) => s + x.cur, 0);
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <div style={{ borderRadius: 22, padding: 22, marginBottom: 18, color: '#fff', textAlign: 'center',
        background: 'linear-gradient(135deg,#F4793B,#F4B43B)', boxShadow: '0 10px 26px rgba(244,121,59,0.3)' }}>
        <Icon name="flame" size={40} color="#fff" style={{ margin: '0 auto' }} />
        <div style={{ fontSize: 40, fontWeight: 800, fontFamily: 'Space Grotesk', letterSpacing: -1, marginTop: 4 }}>16<span style={{ fontSize: 18, opacity: 0.8 }}>일</span></div>
        <div style={{ fontSize: 13.5, fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>최장 연속 달성 · 마음챙김 🔥</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {THEMES.map((th, ti) => {
          const s = STREAKS[ti];
          return (
            <div key={ti} onClick={() => go('detail', ti)} style={{ display: 'flex', alignItems: 'center', gap: 13,
              padding: '13px 15px', borderRadius: 18, border: `1px solid ${M.line}`, background: M.surface, cursor: 'pointer' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: tint(th.color, M.dark ? 24 : 15, M.dark),
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={th.icon} size={20} color={th.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: M.ink, whiteSpace: 'nowrap' }}>{th.kr}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {s.week.map((d, di) => (
                    <div key={di} style={{ width: 14, height: 14, borderRadius: 5,
                      background: d ? th.color : (M.dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)') }} />
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 17, fontWeight: 800, color: th.color, fontFamily: 'Space Grotesk' }}>
                  <Icon name="flame" size={15} color={th.color} />{s.cur}
                </div>
                <div style={{ fontSize: 10.5, color: M.faint, fontWeight: 600, whiteSpace: 'nowrap' }}>최고 {s.best}일</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TodayKanban({ M, t, done, toggle }) {
  // derive 3 columns from today picks + a couple extra
  const items = [...TODAY_PICKS, [7, 0], [5, 0]];
  const [stage, setStage] = useStateB(() => {
    const init = {};
    items.forEach(([ti, ai], i) => { init[`${ti}-${ai}`] = done[`${ti}-${ai}`] ? 2 : (i % 3 === 0 ? 1 : 0); });
    return init;
  });
  const cols = [['할 일', 0], ['진행 중', 1], ['완료', 2]];
  const advance = (key) => setStage(s => ({ ...s, [key]: Math.min(2, (s[key] ?? 0) + 1) }));
  return (
    <div style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {cols.map(([label, ci]) => {
        const list = items.filter(([ti, ai]) => (stage[`${ti}-${ai}`] ?? 0) === ci);
        return (
          <div key={ci}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 8px' }}>
              <span style={{ width: 9, height: 9, borderRadius: 5, flexShrink: 0, background: ci === 0 ? '#A39C8C' : ci === 1 ? '#F4793B' : '#2FA968' }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: M.ink, whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: M.faint, fontFamily: 'Space Grotesk', whiteSpace: 'nowrap' }}>{list.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map(([ti, ai], i) => {
                const th = THEMES[ti]; const a = th.actions[ai]; const key = `${ti}-${ai}`;
                return (
                  <div key={i} onClick={() => advance(key)} style={{ display: 'flex', alignItems: 'center', gap: 11,
                    padding: '12px 14px', borderRadius: 14, background: M.surface, border: `1px solid ${M.line}`, cursor: 'pointer',
                    borderLeft: `3px solid ${th.color}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: M.ink,
                        textDecoration: ci === 2 ? 'line-through' : 'none', opacity: ci === 2 ? 0.6 : 1 }}>{a.kr}</div>
                      <div style={{ fontSize: 11, color: M.sub, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{th.kr} · {a.en}</div>
                    </div>
                    {ci < 2 ? <Icon name="chevR" size={17} color={M.faint} />
                      : <Icon name="checkCircle" size={20} color="#2FA968" />}
                  </div>
                );
              })}
              {list.length === 0 && (
                <div style={{ fontSize: 12.5, color: M.faint, padding: '10px 14px', fontWeight: 500 }}>비어 있음</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  STATS
// ─────────────────────────────────────────────────────────────
function Stats({ M, t, done, go }) {
  const totalDone = Object.keys(done).filter(k => done[k]).length;
  const pct = Math.round((totalDone / 64) * 100);
  const week = [4, 6, 3, 7, 5, 8, 6];
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const maxW = Math.max(...week);
  const ranked = THEMES.map((th, ti) => ({ th, ti, p: themeProgress(th, done) })).sort((a, b) => b.p.pct - a.p.pct);

  return (
    <div>
      <Header M={M} en="Progress" kr="통계" right={<IconBtn M={M} name="sparkle" />} />

      {/* insight */}
      <div style={{ padding: '0 20px 16px' }}>
        <InsightCard M={M} done={done} />
      </div>

      {/* top stats */}
      <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
        <div style={{ borderRadius: 22, padding: 18, background: M.surface, border: `1px solid ${M.line}`,
          display: 'flex', alignItems: 'center', gap: 14, boxShadow: M.dark ? 'none' : '0 4px 16px rgba(30,24,12,0.05)' }}>
          <Ring pct={pct} size={70} stroke={7} color={M.accent} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}>
            <div style={{ fontSize: 18, fontWeight: 800, color: M.ink, fontFamily: 'Space Grotesk' }}>{pct}%</div>
          </Ring>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: M.ink, fontFamily: 'Space Grotesk', letterSpacing: -0.5, whiteSpace: 'nowrap' }}>{totalDone}<span style={{ fontSize: 15, color: M.faint }}>/64</span></div>
            <div style={{ fontSize: 12.5, color: M.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>전체 달성</div>
          </div>
        </div>
        <div style={{ borderRadius: 22, padding: 18, background: M.surface, border: `1px solid ${M.line}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, boxShadow: M.dark ? 'none' : '0 4px 16px rgba(30,24,12,0.05)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="flame" size={20} color="#F4793B" />
            <span style={{ fontSize: 26, fontWeight: 800, color: M.ink, fontFamily: 'Space Grotesk' }}>16</span>
          </div>
          <div style={{ fontSize: 12.5, color: M.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>최장 연속일</div>
        </div>
      </div>

      {/* weekly activity */}
      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ borderRadius: 22, padding: 20, background: M.surface, border: `1px solid ${M.line}`, boxShadow: M.dark ? 'none' : '0 4px 16px rgba(30,24,12,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: M.ink, whiteSpace: 'nowrap' }}>이번 주 실천</span>
            <span style={{ fontSize: 12.5, color: M.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>총 {week.reduce((a, b) => a + b, 0)}회</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, height: 96 }}>
            {week.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${(v / maxW) * 78}px`, borderRadius: 7,
                  background: i === 5 ? 'linear-gradient(#F4793B,#E5547F)' : (M.dark ? 'rgba(255,255,255,0.13)' : 'rgba(35,33,28,0.13)') }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: i === 5 ? '#F4793B' : M.faint }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* contribution heatmap */}
      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ borderRadius: 22, padding: 20, background: M.surface, border: `1px solid ${M.line}`, boxShadow: M.dark ? 'none' : '0 4px 16px rgba(30,24,12,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: M.ink, whiteSpace: 'nowrap' }}>최근 70일 실천</span>
            <span style={{ fontSize: 12.5, color: M.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>꾸준함의 무늬</span>
          </div>
          <Heatmap M={M} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
            <span style={{ fontSize: 10.5, color: M.faint, fontWeight: 600 }}>적음</span>
            {[0.06, 0.28, 0.5, 0.72, 1].map((o, i) => (
              <span key={i} style={{ width: 11, height: 11, borderRadius: 3,
                background: o === 0.06 ? (M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : `color-mix(in srgb, ${M.accent} ${o * 100}%, transparent)` }} />
            ))}
            <span style={{ fontSize: 10.5, color: M.faint, fontWeight: 600 }}>많음</span>
          </div>
        </div>
      </div>

      {/* ranked theme bars */}
      <div style={{ padding: '0 20px 6px', fontSize: 16, fontWeight: 800, color: M.ink }}>영역별 달성률</div>
      <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        {ranked.map(({ th, ti, p }) => (
          <div key={ti} onClick={() => go('detail', ti)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: th.color }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: M.ink, flex: 1 }}>{th.kr}</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: th.color, fontFamily: 'Space Grotesk' }}>{p.pct}%</span>
            </div>
            <div style={{ height: 9, borderRadius: 5, background: M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.055)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${p.pct}%`, background: th.color, borderRadius: 5, transition: 'width .6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Detail, Today, Stats });
