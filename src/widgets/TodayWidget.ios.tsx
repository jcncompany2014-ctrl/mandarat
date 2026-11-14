// '오늘' 위젯의 모습 — 홈 화면 셋(작게·중간·크게)과 잠금 화면 셋(한 줄·동그라미·네모). 디자인 A(docs/design/mockups/a/widgets.png,
// build-plan §4.1): 작게 = '● 오늘 1/10' + 색 지도(L1), 중간 = '● 오늘 할 일 / 9개 남음' + 체크하는 세 줄,
// 크게 = 지도와 머리 · 날짜 · 목표 + 여섯 줄, 잠금 네모 = 다음 할 일과 체크 상자, 잠금 동그라미 = 오늘 한 몫의 게이지.
// 'widget' 지시어가 있는 함수는 babel-preset-expo(expo-widgets 플러그인)가 글자로 바꿔 App Group에 넣고,
// 위젯 쪽 JavaScriptCore가 그 글자만 다시 읽어 그린다. 그래서 이 함수는 바깥의 어떤 이름도 쓸 수 없다:
// - 도움 함수는 모두 함수 안에 둔다. 위 import는 타입 검사용일 뿐이다(위젯 쪽에서는 같은 이름이 전역으로 있다).
// - 펼침(...) · ?. · ?? · 구조 분해 · for…of처럼 babel이 도움 함수로 바꿀 수 있는 문법은 쓰지 않는다(Object.assign · concat · ||).
// - p는 {}일 수 있고, 예전 앱이 쓴 스냅숏(cells · names · a · r · 새 팔레트가 없다)일 수도 있다 — 모든 값에 기본값을 둔다.
//   기본 색은 토큰(src/theme/tokens.ts LIGHT · DARK)과 같은 값이다(tests/a-n1.test.js가 견준다).
// - 여러 줄을 map으로 그리면 그 배열은 자기 VStack/HStack의 유일한 자식이어야 한다(배열 안의 배열은 위젯이 버린다).
// - 틴트(iOS 18 accented)·잠금 화면(vibrant)·잠금 화면 크기(accessory*)는 색을 지우므로 색 대신 시스템의 단계 색
//   (hierarchical primary · secondary …)과 불투명도로 그린다: 달성 1.0, 적은 칸 0.45, 빈 칸 0.18, 영역 · 가운데 1.0.
// - 글꼴은 시스템 글꼴(Pretendard는 위젯 확장에 넣을 수 없다, §2.7). 틱은 SF Symbol 'checkmark'.
// tests/widgetLayout.test.js · tests/a-n1.test.js가 바꾼 글자를 vm에서 돌려 이 약속을 확인한다.
import {
  AccessoryWidgetBackground, Button, Circle, Gauge, HStack, Image, Rectangle, RoundedRectangle, Spacer, Text, VStack, ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement, accessibilityHidden, accessibilityLabel, buttonStyle, clipped, containerBackground, font, foregroundStyle,
  frame, gaugeStyle, layoutPriority, lineLimit, monospacedDigit, opacity, padding, strikethrough, strokeBorder, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { TodayWidgetLines, TodayWidgetProps, WidgetItem, WidgetOp, WidgetPalette } from '../lib/contracts';

export function TodayLayout(p: Partial<TodayWidgetProps>, env: WidgetEnvironment) {
  'widget';
  const e: Partial<WidgetEnvironment> = env || {};
  const family = e.widgetFamily || 'systemSmall';
  const lock = family === 'accessoryInline' || family === 'accessoryCircular' || family === 'accessoryRectangular';
  // 색을 그대로 쓰는가 — 틴트 · vibrant · 잠금 화면 크기는 단계 색과 불투명도로
  const full = !lock && (!e.widgetRenderingMode || e.widgetRenderingMode === 'fullColor');
  const dark = e.colorScheme === 'dark';
  const pals: Partial<TodayWidgetProps['pal']> = p.pal || {};
  const P: Partial<WidgetPalette> = (dark ? pals.dark : pals.light) || {};
  // 토큰 기본값(LIGHT · DARK) — 팔레트가 없거나 예전 스냅숏일 때
  const paper = P.paper || (dark ? '#121316' : '#FFFFFF');
  const ink = P.ink || (dark ? '#ECEDEF' : '#191B1F');
  const ink2 = P.ink2 || (dark ? '#A3A8B0' : '#5F6670');
  const print = P.print || (dark ? '#9AA0A8' : '#6B727C');
  const printEdge = P.printEdge || (dark ? '#6E747C' : '#868D96');
  const printRule = P.printRule || (dark ? '#24262B' : '#EEF0F2');
  const tile = P.tile || (dark ? '#1D1F23' : '#F3F4F6');
  const signal = P.signal || (dark ? '#E2543F' : '#C4372F');
  const core = P.core || (dark ? '#4A4E55' : '#221F1B');
  const dyes: string[] = P.dye || [];
  const washes: string[] = P.washL1 || [];
  const tints: string[] = P.tint || [];
  const L: Partial<TodayWidgetLines> = p.lines || {};
  const items: WidgetItem[] = p.items || [];
  const ops: WidgetOp[] = p.ops || [];
  const cells = typeof p.cells === 'string' ? p.cells : '';
  const names: string[] = p.names || [];
  const done = p.done || 0;
  const total = p.total || 0;
  const left = Math.max(0, total - done);
  const day = p.day || '';
  const url = p.url || 'mandarat://today';
  const pat = p.pat || 'blank';
  // 앱이 아직 읽지 않은 체크 기록의 상한 — 타임라인 한 칸(하루)마다 따로 쌓인다. 한 건 ≈ 80 B라 300건 ≈ 24 KB(App Group).
  // 50건은 하루에 여러 번 켜고 끄면 닿을 수 있었다(R-1 F5)
  const OPS_MAX = 300;

  /** '{n}' · '{t}' 틀 채우기 */
  function fill(tpl: string | undefined, n: number, t: string) {
    return String(tpl || '').replace('{n}', String(n)).replace('{t}', function () { return t; });
  }
  function status() {
    if (total === 0) return fill(L.empty, 0, '');
    if (left === 0) return fill(L.allDone, 0, '');
    return fill(L.left, left, '');
  }
  /** 한 수의 읽어 주기 — '1/10'의 빗금 대신 말로('오늘 10개 중 1개 했어요') */
  function spoken() {
    if (total === 0) return fill(L.empty, 0, '');
    // 앱을 새로 열기 전의 옛 스냅숏에는 progress가 없다 — 그때는 예전 모양 그대로
    if (!L.progress) return String(done) + '/' + String(total) + ' ' + fill(L.today, 0, '');
    return fill(L.progress, done, String(total));
  }
  function nextItem() {
    for (let i = 0; i < items.length; i++) if (!items[i].d) return items[i];
    return null;
  }
  function areaOf(it: WidgetItem) {
    return typeof it.a === 'number' && 0 <= it.a && it.a <= 7 ? it.a : -1;
  }
  function root(content: React.JSX.Element) {
    return (
      <ZStack modifiers={[containerBackground(paper, 'widget'), widgetURL(url)]}>
        {content}
      </ZStack>
    );
  }

  // ── 색: 그대로(full) 또는 시스템의 단계 색 ──
  /** 글 · 표시의 색 — full이면 c, 아니면 단계(primary · secondary · tertiary · quaternary) */
  function fg(c: string, level: 'primary' | 'secondary' | 'tertiary' | 'quaternary') {
    return full ? foregroundStyle(c) : foregroundStyle({ type: 'hierarchical', style: level });
  }
  function dyeOf(a: number) {
    return (a >= 0 && dyes[a]) || ink2;
  }
  function text(s: string, size: number, weight: 'regular' | 'medium' | 'semibold' | 'bold', c: string, level: 'primary' | 'secondary', more?: ReturnType<typeof frame>[]) {
    const mods = [font({ size: size, weight: weight }), fg(c, level), lineLimit(1)];
    return <Text modifiers={more ? mods.concat(more) : mods}>{s}</Text>;
  }

  // ── 종이 무늬: 모눈(grid)·줄(lines)만 24pt마다 괘선을 긋는다(색 그대로일 때만). 점(dots)·무지(blank)는 그리지 않는다 ──
  // 무늬 선은 줄 사이 괘선(printRule)보다 옅게(0.55) — 같은 굵기면 목록이 두 겹으로 그은 듯 읽힌다
  function rules(vertical: boolean) {
    const marks: number[] = [];
    for (let i = 0; i < 30; i++) marks.push(i);
    const rows = marks.map(function (i) {
      return (
        <Rectangle
          key={(vertical ? 'v' : 'h') + i}
          modifiers={[foregroundStyle(printRule), opacity(0.55), vertical ? frame({ width: 0.5, maxHeight: 2000 }) : frame({ height: 0.5, maxWidth: 2000 })]}
        />
      );
    });
    return vertical
      ? <HStack spacing={23.5}>{rows}</HStack>
      : <VStack spacing={23.5}>{rows}</VStack>;
  }
  function paperLayer() {
    if (!full) return null;
    if (pat === 'lines') return <ZStack modifiers={[frame({ maxWidth: 2000, maxHeight: 2000 }), clipped()]}>{rules(false)}</ZStack>;
    if (pat === 'grid') {
      return (
        <ZStack modifiers={[frame({ maxWidth: 2000, maxHeight: 2000 }), clipped()]}>
          {rules(false)}
          {rules(true)}
        </ZStack>
      );
    }
    return null;
  }

  // ── 색 지도(L1): 81칸. 가운데 = core, 영역 이름 16칸 = dye, 실천 = 달성 washL1 · 적은 칸 tint · 빈 칸 tile ──
  /** 3×3 안의 자리(0~8) → 영역 · 실천 번호(가운데 4는 없다) — theme/chart.ts SLOT_INDEX와 같다 */
  function slotIndex(s: number) {
    return s < 4 ? s : s - 1;
  }
  function mapTile(row: number, col: number, size: number, radius: number) {
    const block = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const slot = (row % 3) * 3 + (col % 3);
    let color = tile;
    let alpha = 1;
    if (block === 4 && slot === 4) {
      color = core;
    } else if (block === 4 || slot === 4) {
      color = dyeOf(slotIndex(block === 4 ? slot : block));
    } else {
      const ti = slotIndex(block);
      const state = cells.charAt(ti * 8 + slotIndex(slot));
      if (state === '2') color = washes[ti] || printEdge;
      else if (state === '1') { color = tints[ti] || tile; alpha = 0.45; }
      else alpha = 0.18;
    }
    const mods = full
      ? [foregroundStyle(color), frame({ width: size, height: size })]
      : [foregroundStyle({ type: 'hierarchical', style: 'primary' }), opacity(alpha), frame({ width: size, height: size })];
    return <RoundedRectangle key={'m' + row + '-' + col} cornerRadius={radius} modifiers={mods} />;
  }
  /** 지도 — 칸 c, 칸 사이 g, 블록 사이 b(pt). 줄마다 블록 셋, 블록마다 칸 셋 */
  function colourMap(c: number, g: number, b: number) {
    const three = [0, 1, 2];
    const radius = Math.max(1.5, 0.14 * c);
    const bands = three.map(function (br) {
      const rows = three.map(function (rr) {
        const row = br * 3 + rr;
        const blocks = three.map(function (bc) {
          const tiles = three.map(function (cc) { return mapTile(row, bc * 3 + cc, c, radius); });
          return <HStack key={'k' + row + '-' + bc} spacing={g}>{tiles}</HStack>;
        });
        return <HStack key={'r' + row} spacing={b}>{blocks}</HStack>;
      });
      return <VStack key={'b' + br} spacing={g}>{rows}</VStack>;
    });
    return <VStack spacing={b} modifiers={[accessibilityHidden(true)]}>{bands}</VStack>;
  }
  /** 지도의 폭(pt) */
  function mapWidth(c: number, g: number, b: number) {
    return 9 * c + 6 * g + 2 * b;
  }

  // ── 머리: 오늘 점(signal 6) + 인쇄된 이름(label 13) … 오른쪽 굵은 수(19) ──
  function todayDot(size: number) {
    return <Circle modifiers={[fg(signal, 'primary'), frame({ width: size, height: size })]} />;
  }
  function headLabel(s: string) {
    return (
      <HStack spacing={6} alignment="center">
        {todayDot(6)}
        {text(s, 13, 'medium', print, 'secondary')}
      </HStack>
    );
  }
  function figure(s: string) {
    return text(s, 19, 'bold', ink, 'primary', [monospacedDigit()]);
  }
  /** '● 오늘 … 1/10' — 작게 · 크게. 읽어 주기는 말로 한 번 */
  function todayHead(width: number) {
    return (
      <HStack
        alignment="firstTextBaseline"
        spacing={4}
        modifiers={[width > 0 ? frame({ width: width }) : frame({ maxWidth: 2000 }), accessibilityElement('ignore'), accessibilityLabel(spoken())]}
      >
        {headLabel(fill(L.today, 0, ''))}
        <Spacer minLength={4} />
        {figure(String(done) + '/' + String(total))}
      </HStack>
    );
  }
  /** '● 오늘 할 일 … 9개 남음' — 남은 수만 굵게, 틀의 앞뒤 글은 작게(ink2) */
  function listHead() {
    const parts = String(L.leftUnit || '{n}').split('{n}');
    const before = parts[0] || '';
    const after = parts.slice(1).join('');
    return (
      <HStack alignment="firstTextBaseline" spacing={4} modifiers={[frame({ maxWidth: 2000 }), accessibilityElement('ignore'), accessibilityLabel(status())]}>
        {headLabel(fill(L.listHead, 0, ''))}
        <Spacer minLength={4} />
        <HStack alignment="firstTextBaseline" spacing={1} modifiers={[opacity(left > 0 ? 1 : 0)]}>
          {before ? text(before, 12, 'medium', ink2, 'secondary') : null}
          {figure(String(left))}
          {after ? text(after, 12, 'medium', ink2, 'secondary') : null}
        </HStack>
      </HStack>
    );
  }

  // ── 체크 상자: 20pt, 둥근 6, 테두리 1.5 printEdge. 한 일 = washL1 칠 + dye 테두리 + checkmark(굵게, ink) ──
  function box(on: boolean, a: number, size: number) {
    const radius = size * 0.3;
    const edge = on ? (full ? dyeOf(a) : '') : full ? printEdge : '';
    const shape = on && full
      ? [foregroundStyle((a >= 0 && washes[a]) || tile)]
      : [fg(paper, 'primary'), opacity(0)];
    const stroke = strokeBorder(edge
      ? { color: edge, style: { lineWidth: 1.5 }, shape: 'roundedRectangle', cornerRadius: radius }
      : { style: { lineWidth: 1.5 }, shape: 'roundedRectangle', cornerRadius: radius });
    return (
      <ZStack modifiers={[frame({ width: size, height: size }), fg(ink, on ? 'primary' : 'secondary')]}>
        <RoundedRectangle cornerRadius={radius} modifiers={shape.concat([stroke])} />
        {on ? <Image systemName="checkmark" modifiers={[font({ size: Math.round(size * 0.6), weight: 'bold' }), fg(ink, 'primary')]} /> : null}
      </ZStack>
    );
  }
  /** 영역 표시 — 8pt 둥근 네모(dye) + 이름(12, ink2) */
  function areaTag(a: number) {
    const name = a >= 0 ? names[a] || '' : '';
    return (
      <HStack spacing={5} alignment="center" modifiers={[layoutPriority(1)]}>
        <RoundedRectangle cornerRadius={2} modifiers={[fg(dyeOf(a), 'primary'), frame({ width: 8, height: 8 })]} />
        {name ? text(name, 12, 'medium', ink2, 'secondary') : null}
      </HStack>
    );
  }

  // ── 줄: [□] 할 일 … 오른쪽(D-2 · 중점 · 영역). iOS 17부터 줄을 누르면 위젯에서 바로 체크한다 ──
  function press(it: WidgetItem) {
    return function () {
      const on = !it.d;
      const nextItems = items.map(function (x) { return x.k === it.k ? Object.assign({}, x, { d: on }) : x; });
      const op: WidgetOp = { kind: 'check', k: it.k, on: on, day: day, at: Date.now(), t: it.t, src: 'widget' };
      return {
        items: nextItems,
        done: Math.max(0, Math.min(total, done + (on ? 1 : -1))),
        ops: ops.concat([op]).slice(-OPS_MAX),
      };
    };
  }
  function right(it: WidgetItem) {
    const r = typeof it.r === 'string' ? it.r : '';
    if (r) return text(r, 13, 'medium', r === L.focus ? print : ink, r === L.focus ? 'secondary' : 'primary', [monospacedDigit(), layoutPriority(1)]);
    return areaOf(it) >= 0 ? areaTag(areaOf(it)) : null;
  }
  // 한 줄 34pt(좁은 위젯에서는 28까지 줄어든다) — 한 일은 체크 · ink2 글 · 가운데 줄. 글에 불투명도를 더 걸지 않는다
  function row(it: WidgetItem, i: number) {
    const title = it.d
      ? text(it.t, 15, 'medium', ink2, 'secondary', [full ? strikethrough({ isActive: true, pattern: 'solid', color: ink2 }) : strikethrough({ isActive: true, pattern: 'solid' })])
      : text(it.t, 15, 'medium', ink, 'primary');
    return (
      <VStack key={it.k} spacing={0} alignment="leading">
        {i > 0 ? <Rectangle modifiers={[fg(printRule, 'quaternary'), frame({ height: 0.5, maxWidth: 2000 }), padding({ leading: 30 })]} /> : null}
        <Button
          target={'check:' + it.k}
          onPress={press(it)}
          modifiers={[buttonStyle('plain'), accessibilityLabel(fill(it.d ? L.checked : L.unchecked || '{t}', 0, it.t))]}
        >
          <HStack spacing={10} modifiers={[frame({ maxWidth: 2000, minHeight: 28, maxHeight: 34, alignment: 'leading' })]}>
            {box(it.d, areaOf(it), 20)}
            {title}
            <Spacer minLength={8} />
            {right(it)}
          </HStack>
        </Button>
      </VStack>
    );
  }
  function list(max: number) {
    if (total === 0) return text(fill(L.empty, 0, ''), 13, 'medium', print, 'secondary');
    if (left === 0) return text(fill(L.allDone, 0, ''), 15, 'semibold', ink, 'primary');
    const shown = items.slice(0, max);
    return <VStack alignment="leading" spacing={0}>{shown.map(row)}</VStack>;
  }

  // ── 잠금 화면 — 색 없이(단계 색). 네모 위젯만 체크 버튼 하나 ──
  if (family === 'accessoryInline') {
    return root(<Text>{status()}</Text>);
  }
  if (family === 'accessoryCircular') {
    // 오늘 한 몫의 게이지(.accessoryCircular — 아래가 열린 고리) 안에 '오늘'과 1/10
    return root(
      <ZStack modifiers={[accessibilityElement('ignore'), accessibilityLabel(spoken())]}>
        <AccessoryWidgetBackground />
        <Gauge value={total > 0 ? Math.min(1, done / total) : 0} modifiers={[gaugeStyle('circular')]} />
        <VStack spacing={0}>
          {text(fill(L.today, 0, ''), 10, 'semibold', ink2, 'secondary')}
          <HStack alignment="firstTextBaseline" spacing={0}>
            {text(String(done), 17, 'bold', ink, 'primary', [monospacedDigit()])}
            {total > 0 ? text('/' + String(total), 11, 'semibold', ink2, 'secondary', [monospacedDigit()]) : null}
          </HStack>
        </VStack>
      </ZStack>
    );
  }
  if (family === 'accessoryRectangular') {
    const nx = nextItem();
    const a = nx ? areaOf(nx) : -1;
    const meta = nx ? [a >= 0 ? names[a] || '' : '', typeof nx.r === 'string' ? nx.r : ''].filter(Boolean).join(' · ') : '';
    const head = (
      <HStack spacing={4} alignment="center">
        {todayDot(5)}
        {text(fill(L.nextHead, 0, ''), 12, 'semibold', ink2, 'secondary')}
      </HStack>
    );
    if (!nx) {
      return root(
        <VStack alignment="leading" spacing={0} modifiers={[frame({ maxWidth: 2000, alignment: 'leading' })]}>
          {head}
          {text(status(), 16, 'semibold', ink, 'primary')}
        </VStack>
      );
    }
    return root(
      <HStack spacing={10} alignment="center" modifiers={[frame({ maxWidth: 2000, alignment: 'leading' })]}>
        <Button
          target={'check:' + nx.k}
          onPress={press(nx)}
          modifiers={[buttonStyle('plain'), accessibilityLabel(fill(L.unchecked || '{t}', 0, nx.t))]}
        >
          {box(false, a, 20)}
        </Button>
        <VStack alignment="leading" spacing={0}>
          {head}
          {text(nx.t, 16, 'semibold', ink, 'primary')}
          {meta ? text(meta, 12, 'medium', ink2, 'secondary') : null}
        </VStack>
      </HStack>
    );
  }

  // ── 홈 화면 ──
  if (family === 'systemMedium') {
    return root(
      <ZStack>
        {paperLayer()}
        <VStack alignment="leading" spacing={8} modifiers={[frame({ maxWidth: 2000, maxHeight: 2000, alignment: 'topLeading' })]}>
          {listHead()}
          {list(3)}
        </VStack>
      </ZStack>
    );
  }
  if (family === 'systemLarge' || family === 'systemExtraLarge') {
    // 지도(칸 12) 옆에 머리 · 날짜 · 목표, 그 아래 여섯 줄
    return root(
      <ZStack>
        {paperLayer()}
        <VStack alignment="leading" spacing={12} modifiers={[frame({ maxWidth: 2000, maxHeight: 2000, alignment: 'topLeading' })]}>
          <HStack alignment="top" spacing={14}>
            {colourMap(12, 1.5, 2)}
            <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: 2000, alignment: 'topLeading' })]}>
              {todayHead(0)}
              {text(p.date || '', 13, 'medium', print, 'secondary')}
              <Text modifiers={[font({ size: 17, weight: 'bold' }), fg(ink, 'primary'), lineLimit(4)]}>{p.goal || ''}</Text>
            </VStack>
          </HStack>
          {list(6)}
        </VStack>
      </ZStack>
    );
  }
  // systemSmall(기본) — 지도 폭에 맞춘 머리 한 줄 + 색 지도(칸 9, 사이 1 · 블록 2)
  return root(
    <ZStack>
      {paperLayer()}
      <VStack alignment="leading" spacing={6}>
        {todayHead(mapWidth(9, 1, 2))}
        {colourMap(9, 1, 2)}
      </VStack>
    </ZStack>
  );
}
