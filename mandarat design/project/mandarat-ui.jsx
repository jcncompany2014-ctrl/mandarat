// mandarat-ui.jsx — Lucide SVG icons + mandala motif + atoms (→ window)

// Map semantic names → Lucide icon keys (rendered from lucide.icons data)
const ICON_LUCIDE = {
  heart: 'Heart', briefcase: 'Briefcase', book: 'BookOpen', people: 'Users',
  coin: 'PiggyBank', palette: 'Palette', lotus: 'Flower2', compass: 'Compass',
  grid: 'Grid3x3', home: 'House', check: 'Check', checkCircle: 'CircleCheck',
  chart: 'ChartColumnBig', plus: 'Plus', chevR: 'ChevronRight', chevL: 'ChevronLeft',
  flame: 'Flame', sparkle: 'Sparkles', target: 'Target', pencil: 'Pencil',
  dots: 'Ellipsis', calendar: 'Calendar', bell: 'Bell', settings: 'SlidersHorizontal',
};
const ICON_FILLED = new Set(['flame', 'sparkle']);

function Icon({ name, size = 22, color = 'currentColor', fill, sw = 1.9, weight, style }) {
  const L = window.lucide && window.lucide.icons;
  const node = L && (L[ICON_LUCIDE[name]] || L[name]);
  const kids = node ? node[2] : [];
  const filled = fill === undefined ? ICON_FILLED.has(name) : fill;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}>
      {kids.map((ch, i) => React.createElement(ch[0], { key: i, ...ch[1] }))}
    </svg>
  );
}

// Circular progress ring
function Ring({ pct, size = 64, stroke = 6, color = '#2FA968', track = 'rgba(0,0,0,0.08)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.4,1.2,.4,1)' }} />
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      )}
    </div>
  );
}

// Animated checkbox
function Check({ on, color, dark }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
      border: on ? 'none' : `1.8px solid ${dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)'}`,
      background: on ? color : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .2s ease',
    }}>
      {on && <Icon name="check" size={16} color="#fff" weight={700} />}
    </div>
  );
}

// ── Mandala line-art motif: concentric rings + lotus petals ──
function MandalaArt({ size = 220, stroke = '#fff', opacity = 0.14, rings = 3, petals = 16, sw = 1, style }) {
  const c = size / 2;
  const els = [];
  for (let i = 1; i <= rings; i++) {
    els.push(<circle key={'c' + i} cx={c} cy={c} r={(c - sw) * (i / rings)} fill="none" stroke={stroke} strokeWidth={sw} />);
  }
  // ring of lotus petals (almond shapes via quadratic paths)
  const pr = c * 0.66, pw = c * 0.16, pl = c * 0.34;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const cx = c + pr * Math.cos(a), cy = c + pr * Math.sin(a);
    const ux = Math.cos(a), uy = Math.sin(a);      // outward
    const vx = -uy, vy = ux;                        // tangent
    const tipX = cx + pl * ux, tipY = cy + pl * uy;
    const baseX = cx - pl * ux, baseY = cy - pl * uy;
    const lX = cx + pw * vx, lY = cy + pw * vy;
    const rX = cx - pw * vx, rY = cy - pw * vy;
    els.push(
      <path key={'p' + i}
        d={`M ${baseX} ${baseY} Q ${lX} ${lY} ${tipX} ${tipY} Q ${rX} ${rY} ${baseX} ${baseY} Z`}
        fill="none" stroke={stroke} strokeWidth={sw} />
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity, ...style }}>{els}</svg>
  );
}

Object.assign(window, { Icon, Ring, Check, MandalaArt });
