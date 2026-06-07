// mandarat-app.jsx — shell, tab bar, tweaks, routing
const { useState: useApp, useRef: useRefApp, useEffect: useEffectApp } = React;

const TABS = [
  { id: 'dashboard', icon: 'home', label: '홈' },
  { id: 'grid', icon: 'grid', label: '만다라트' },
  { id: 'today', icon: 'checkCircle', label: '오늘' },
  { id: 'stats', icon: 'chart', label: '통계' },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mood": "크림",
  "mgmt": "일일 체크",
  "cellShape": "둥근",
  "accent": "#F4793B"
}/*EDITMODE-END*/;

function TabBar({ M, active, onTab }) {
  return (
    <div style={{
      position: 'relative', zIndex: 30, paddingBottom: 26, paddingTop: 9,
      background: M.tabBg, backdropFilter: 'blur(18px) saturate(180%)', WebkitBackdropFilter: 'blur(18px) saturate(180%)',
      borderTop: `1px solid ${M.line}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    }}>
      {TABS.map(tab => {
        const on = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onTab(tab.id)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 14px', flex: 1,
          }}>
            <Icon name={tab.icon} size={24} color={on ? M.accent : M.faint} sw={on ? 2.1 : 1.8} />
            <span style={{ fontSize: 10.5, fontWeight: on ? 800 : 600, color: on ? M.accent : M.faint, letterSpacing: -0.2 }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useApp({ screen: 'dashboard', ti: 0 });
  const [done, setDone] = useApp(() => initialDone());
  // power state
  const [sheet, setSheet] = useApp(null);     // { ti, ai }
  const [focus, setFocus] = useApp(null);     // { ti, ai }
  const [quick, setQuick] = useApp(false);
  const [notes, setNotes] = useApp({});
  const [todayExtra, setTodayExtra] = useApp([]); // { id, ti, text, done }
  const [todayKeys, setTodayKeys] = useApp(() => new Set(TODAY_PICKS.map(p => p.join('-'))));
  const [mood, setMood] = useApp(null);
  const [reflection, setReflection] = useApp('');
  const [celebrate, setCelebrate] = useApp(false);
  const scrollRef = useRefApp(null);
  const prevComplete = useRefApp(true);

  const M = { ...MOODS[t.mood], accent: t.accent };
  const go = (screen, ti = 0) => setRoute({ screen, ti });
  const toggle = (ti, ai) => setDone(d => { const k = `${ti}-${ai}`; return { ...d, [k]: !d[k] }; });

  // power handlers
  const openAction = (ti, ai) => setSheet({ ti, ai });
  const startFocus = (ti, ai) => { setSheet(null); setFocus({ ti, ai }); };
  const setNote = (key, v) => setNotes(o => ({ ...o, [key]: v }));
  const getNote = (key) => notes[key];
  const inToday = (key) => todayKeys.has(key);
  const toggleToday = (key) => setTodayKeys(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const addCustom = (ti, text) => setTodayExtra(a => [...a, { id: Date.now(), ti, text: text.trim(), done: false }]);
  const toggleExtra = (id) => setTodayExtra(a => a.map(x => x.id === id ? { ...x, done: !x.done } : x));
  window.MX = { openAction, startFocus, getNote, inToday };

  // today aggregation + celebration
  const todayList = [...todayKeys].map(k => k.split('-').map(Number));
  const tDone = todayList.filter(([ti, ai]) => done[`${ti}-${ai}`]).length + todayExtra.filter(x => x.done).length;
  const tTotal = todayList.length + todayExtra.length;
  useEffectApp(() => {
    const complete = tTotal > 0 && tDone === tTotal;
    if (complete && !prevComplete.current) setCelebrate(true);
    prevComplete.current = complete;
  }, [tDone, tTotal]);

  useEffectApp(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [route.screen, route.ti]);

  const activeTab = route.screen === 'detail' ? 'grid' : route.screen;
  const tx = { list: todayList, extra: todayExtra, toggleExtra, mood, setMood, reflection, setReflection,
    openAction, done, toggle, tDone, tTotal };

  let screen;
  if (route.screen === 'dashboard') screen = <Dashboard M={M} t={t} done={done} go={go} tx={tx} />;
  else if (route.screen === 'grid') screen = <GridScreen M={M} t={t} done={done} go={go} />;
  else if (route.screen === 'detail') screen = <Detail M={M} t={t} done={done} toggle={toggle} go={go} ti={route.ti} />;
  else if (route.screen === 'today') screen = <Today M={M} t={t} done={done} toggle={toggle} go={go} tx={tx} />;
  else if (route.screen === 'stats') screen = <Stats M={M} t={t} done={done} go={go} />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 30% 20%, #eceae4, #d9d6cf)', padding: 24 }}>
      <IOSDevice>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: M.bg, color: M.ink,
          position: 'relative', fontFamily: 'Pretendard, -apple-system, system-ui, sans-serif' }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div key={route.screen + route.ti} className="mx-screen">{screen}</div>
            <div style={{ height: 12 }} />
          </div>
          <TabBar M={M} active={activeTab} onTab={(id) => go(id)} />

          <FAB M={M} onClick={() => setQuick(true)} />
          {sheet && <ActionSheet M={M} item={sheet} done={done} toggle={toggle} getNote={getNote} setNote={setNote}
            inToday={inToday} toggleToday={toggleToday} onFocus={startFocus} onClose={() => setSheet(null)} />}
          {focus && <FocusTimer M={M} item={focus} done={done} toggle={toggle} onClose={() => setFocus(null)} />}
          {quick && <QuickAdd M={M} onAdd={addCustom} onClose={() => setQuick(false)} />}
          {celebrate && <Celebration M={M} count={tTotal} onClose={() => setCelebrate(false)} />}
        </div>
      </IOSDevice>

      <TweaksPanel>
        <TweakSection label="무드 / Mood" />
        <TweakRadio label="배경 무드" value={t.mood} options={['크림', '화이트', '파스텔', '다크']}
          onChange={v => setTweak('mood', v)} />
        <TweakColor label="포인트 컬러" value={t.accent}
          options={['#F4793B', '#4F6BED', '#2FA968', '#8B5CF6']}
          onChange={v => setTweak('accent', v)} />
        <TweakSection label="관리 방식 / Manage" />
        <TweakRadio label="오늘 화면" value={t.mgmt} options={['일일 체크', '습관 스트릭', '칸반']}
          onChange={v => setTweak('mgmt', v)} />
        <TweakSection label="그리드 / Grid" />
        <TweakRadio label="셀 모양" value={t.cellShape} options={['둥근', '각진']}
          onChange={v => setTweak('cellShape', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
