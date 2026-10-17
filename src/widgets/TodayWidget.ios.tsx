// '오늘' 위젯의 모습 — 홈 화면 셋(작게·중간·크게)과 잠금 화면 셋(한 줄·동그라미·네모).
// 'widget' 지시어가 있는 함수는 babel-preset-expo(expo-widgets 플러그인)가 글자로 바꿔 App Group에 넣고,
// 위젯 쪽 JavaScriptCore가 그 글자만 다시 읽어 그린다. 그래서 이 함수는 바깥의 어떤 이름도 쓸 수 없다:
// - 도움 함수는 모두 함수 안에 둔다. 위 import는 타입 검사용일 뿐이다(위젯 쪽에서는 같은 이름이 전역으로 있다).
// - 펼침(...) · ?. · ?? 처럼 babel이 도움 함수로 바꿀 수 있는 문법은 쓰지 않는다(Object.assign · concat · ||).
// - p는 {}일 수 있다(위젯 갤러리 미리보기 · 첫 실행 전) — 모든 값에 기본값을 둔다.
// - 여러 줄을 map으로 그리면 그 배열은 자기 VStack/HStack의 유일한 자식이어야 한다(배열 안의 배열은 위젯이 버린다).
// - 틴트(iOS 18)·잠금 화면(vibrant)은 색을 지우므로 채운 높이·테두리·불투명도로 읽히게 그린다.
// tests/widgetLayout.test.js가 바꾼 글자를 vm에서 돌려 이 약속을 확인한다.
import {
  AccessoryWidgetBackground, Button, HStack, Rectangle, Spacer, Text, VStack, ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel, border, bold, buttonStyle, clipped, containerBackground, font, foregroundStyle, frame, lineLimit,
  monospacedDigit, opacity, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { TodayWidgetLines, TodayWidgetProps, WidgetItem, WidgetOp, WidgetPalette } from '../lib/contracts';

export function TodayLayout(p: Partial<TodayWidgetProps>, env: WidgetEnvironment) {
  'widget';
  const e: Partial<WidgetEnvironment> = env || {};
  const family = e.widgetFamily || 'systemSmall';
  const full = !e.widgetRenderingMode || e.widgetRenderingMode === 'fullColor';
  const pals: Partial<TodayWidgetProps['pal']> = p.pal || {};
  const P: Partial<WidgetPalette> = (e.colorScheme === 'dark' ? pals.dark : pals.light) || {};
  const dark = e.colorScheme === 'dark';
  const paper = P.paper || (dark ? '#0E0D14' : '#FBF9F4');
  const ink = P.ink || (dark ? '#F1EFEA' : '#2B2620');
  const sub = P.sub || (dark ? '#9C9AAA' : '#6F6657');
  const line = P.line || (dark ? '#FFFFFF1C' : '#6E55281F');
  const L: Partial<TodayWidgetLines> = p.lines || {};
  const items: WidgetItem[] = p.items || [];
  const ops: WidgetOp[] = p.ops || [];
  const areas: number[] = p.areas || [];
  const colors: string[] = p.colors || [];
  const done = p.done || 0;
  const total = p.total || 0;
  const left = Math.max(0, total - done);
  const day = p.day || '';
  const url = p.url || 'mandarat://today';
  const pat = p.pat || 'dots';

  /** '{n}' · '{t}' 틀 채우기 */
  function fill(tpl: string | undefined, n: number, t: string) {
    return String(tpl || '').replace('{n}', String(n)).replace('{t}', function () { return t; });
  }
  function status() {
    if (total === 0) return fill(L.empty, 0, '');
    if (left === 0) return fill(L.allDone, 0, '');
    return fill(L.left, left, '');
  }
  function nextItem() {
    for (let i = 0; i < items.length; i++) if (!items[i].d) return items[i];
    return null;
  }
  function root(content: React.JSX.Element) {
    return (
      <ZStack modifiers={[containerBackground(paper, 'widget'), widgetURL(url)]}>
        {content}
      </ZStack>
    );
  }

  // ── 종이 무늬: 모눈(grid)·줄(lines)만 괘선을 긋는다. 점(dots)·민무늬(blank)는 그리지 않는다 ──
  function rules(vertical: boolean) {
    const marks: number[] = [];
    for (let i = 0; i < 30; i++) marks.push(i);
    const rows = marks.map(function (i) {
      return (
        <Rectangle
          key={(vertical ? 'v' : 'h') + i}
          modifiers={[foregroundStyle(line), vertical ? frame({ width: 0.5, maxHeight: 2000 }) : frame({ height: 0.5, maxWidth: 2000 })]}
        />
      );
    });
    return vertical
      ? <HStack spacing={14}>{rows}</HStack>
      : <VStack spacing={14}>{rows}</VStack>;
  }
  function paperLayer() {
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

  // ── 3×3 인쇄된 표: 바깥 8칸은 영역마다 달성/8만큼 아래부터 채우고, 가운데는 오늘 한 수 ──
  function cell(ti: number, s: number) {
    const got = Math.max(0, Math.min(8, areas[ti] || 0));
    const fillColor = full ? (colors[ti] || ink) : ink;
    return (
      <ZStack key={'a' + ti} alignment="bottom" modifiers={[frame({ width: s, height: s }), border({ color: full ? sub : ink, width: 0.75 })]}>
        <Rectangle modifiers={[foregroundStyle(fillColor), opacity(full ? 1 : 0.85), frame({ width: s, height: (s * got) / 8 })]} />
      </ZStack>
    );
  }
  function center(s: number) {
    return (
      <VStack key="c" spacing={0} modifiers={[frame({ width: s, height: s }), border({ color: ink, width: 1.5 })]}>
        <Text modifiers={[font({ size: s > 34 ? 15 : 12, weight: 'bold' }), monospacedDigit(), foregroundStyle(ink), lineLimit(1)]}>
          {String(done) + '/' + String(total)}
        </Text>
        <Text modifiers={[font({ size: 8 }), foregroundStyle(sub), lineLimit(1)]}>{fill(L.today, 0, '')}</Text>
      </VStack>
    );
  }
  function chart(s: number) {
    const slots = [[0, 1, 2], [3, -1, 4], [5, 6, 7]];
    const rows = slots.map(function (row, r) {
      const cells = row.map(function (ti) { return ti < 0 ? center(s) : cell(ti, s); });
      return <HStack key={'r' + r} spacing={2}>{cells}</HStack>;
    });
    return (
      <VStack spacing={2} modifiers={[accessibilityLabel(String(done) + '/' + String(total) + ' ' + fill(L.today, 0, ''))]}>
        {rows}
      </VStack>
    );
  }

  // ── 줄 친 목록: [□] 할 일 — iOS 17부터 네모를 누르면 위젯에서 바로 체크한다 ──
  function press(it: WidgetItem) {
    return function () {
      const on = !it.d;
      const nextItems = items.map(function (x) { return x.k === it.k ? Object.assign({}, x, { d: on }) : x; });
      const op: WidgetOp = { kind: 'check', k: it.k, on: on, day: day, at: Date.now(), t: it.t, src: 'widget' };
      return {
        items: nextItems,
        done: Math.max(0, Math.min(total, done + (on ? 1 : -1))),
        ops: ops.concat([op]).slice(-50),
      };
    };
  }
  function box(on: boolean) {
    return (
      <ZStack modifiers={[frame({ width: 13, height: 13 }), border({ color: ink, width: 1 })]}>
        <Rectangle modifiers={[foregroundStyle(ink), opacity(on ? 1 : 0), frame({ width: 7, height: 7 })]} />
      </ZStack>
    );
  }
  function row(it: WidgetItem) {
    return (
      <VStack key={it.k} spacing={0} alignment="leading">
        <Button
          target={'check:' + it.k}
          onPress={press(it)}
          modifiers={[buttonStyle('plain'), accessibilityLabel(it.d ? fill(L.checked, 0, it.t) : it.t)]}
        >
          <HStack spacing={7} modifiers={[frame({ maxWidth: 2000, minHeight: 22, alignment: 'leading' })]}>
            {box(it.d)}
            <Rectangle modifiers={[foregroundStyle(full ? it.c || ink : ink), opacity(it.d ? 0.4 : 1), frame({ width: 2, height: 11 })]} />
            <Text modifiers={[font({ size: 13 }), foregroundStyle(it.d ? sub : ink), opacity(it.d ? 0.6 : 1), lineLimit(1)]}>{it.t}</Text>
            <Spacer />
          </HStack>
        </Button>
        <Rectangle modifiers={[foregroundStyle(line), frame({ height: 0.5, maxWidth: 2000 })]} />
      </VStack>
    );
  }
  function doubleRule() {
    return (
      <VStack spacing={2}>
        <Rectangle modifiers={[foregroundStyle(ink), frame({ height: 0.75, maxWidth: 2000 })]} />
        <Rectangle modifiers={[foregroundStyle(ink), frame({ height: 0.75, maxWidth: 2000 })]} />
      </VStack>
    );
  }
  function list(max: number) {
    if (total === 0) {
      return (
        <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: 2000, maxHeight: 2000, alignment: 'topLeading' })]}>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(sub)]}>{fill(L.empty, 0, '')}</Text>
          <Spacer />
        </VStack>
      );
    }
    if (left === 0) {
      return (
        <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: 2000, maxHeight: 2000, alignment: 'topLeading' })]}>
          {doubleRule()}
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(ink)]}>{fill(L.allDone, 0, '')}</Text>
          <Spacer />
        </VStack>
      );
    }
    const shown = items.slice(0, max);
    const rest = (p.more || 0) + Math.max(0, items.length - shown.length);
    return (
      <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: 2000, maxHeight: 2000, alignment: 'topLeading' })]}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(ink), lineLimit(1)]}>{fill(L.left, left, '')}</Text>
        <Rectangle modifiers={[foregroundStyle(ink), frame({ height: 0.75, maxWidth: 2000 })]} />
        <VStack alignment="leading" spacing={0}>{shown.map(row)}</VStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(sub), opacity(rest > 0 ? 1 : 0), lineLimit(1)]}>{fill(L.more, rest, '')}</Text>
        <Spacer />
      </VStack>
    );
  }
  function dateLine() {
    return <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(sub), lineLimit(1)]}>{p.date || ''}</Text>;
  }

  // ── 잠금 화면 — 버튼 없음 ──
  if (family === 'accessoryInline') {
    return root(<Text>{status()}</Text>);
  }
  if (family === 'accessoryCircular') {
    return root(
      <ZStack>
        <AccessoryWidgetBackground />
        <VStack spacing={0} modifiers={[accessibilityLabel(status())]}>
          <Text modifiers={[font({ size: 20, weight: 'bold' }), monospacedDigit()]}>{total === 0 ? '0' : String(left)}</Text>
          <Text modifiers={[font({ size: 9 }), lineLimit(1)]}>{fill(total === 0 ? L.today : left > 0 ? L.leftShort : L.doneShort, 0, '')}</Text>
        </VStack>
      </ZStack>
    );
  }
  if (family === 'accessoryRectangular') {
    const n = Math.min(10, total);
    const filled = total <= 10 ? done : Math.round((done * n) / Math.max(1, total));
    const marks: number[] = [];
    for (let i = 0; i < n; i++) marks.push(i);
    const squares = marks.map(function (i) {
      return (
        <ZStack key={'s' + i} modifiers={[frame({ width: 8, height: 8 }), border({ color: ink, width: 1 })]}>
          <Rectangle modifiers={[foregroundStyle(ink), opacity(i < filled ? 1 : 0), frame({ width: 8, height: 8 })]} />
        </ZStack>
      );
    });
    const nx = nextItem();
    return root(
      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 2000, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), lineLimit(1)]}>{status()}</Text>
        <Text modifiers={[font({ size: 12 }), opacity(nx ? 1 : 0), lineLimit(1)]}>{nx ? fill(L.next, 0, nx.t) : ' '}</Text>
        <HStack spacing={3} modifiers={[accessibilityLabel(String(done) + '/' + String(total))]}>{squares}</HStack>
      </VStack>
    );
  }

  // ── 홈 화면 ──
  if (family === 'systemMedium') {
    return root(
      <ZStack>
        {paperLayer()}
        <HStack spacing={12} alignment="top">
          <VStack alignment="leading" spacing={4}>
            {dateLine()}
            {chart(30)}
          </VStack>
          {list(4)}
        </HStack>
      </ZStack>
    );
  }
  if (family === 'systemLarge' || family === 'systemExtraLarge') {
    return root(
      <ZStack>
        {paperLayer()}
        <VStack alignment="leading" spacing={10}>
          <HStack spacing={12} alignment="top">
            {chart(36)}
            <VStack alignment="leading" spacing={4}>
              {dateLine()}
              <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(ink), lineLimit(3)]}>{p.goal || ''}</Text>
              <Spacer />
            </VStack>
          </HStack>
          {list(8)}
        </VStack>
      </ZStack>
    );
  }
  // systemSmall(기본)
  return root(
    <ZStack>
      {paperLayer()}
      <VStack alignment="leading" spacing={4}>
        {dateLine()}
        {chart(32)}
      </VStack>
    </ZStack>
  );
}
