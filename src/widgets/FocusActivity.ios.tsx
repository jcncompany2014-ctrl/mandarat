// 집중 타이머 Live Activity의 모습 — 잠금 화면 배너와 다이내믹 아일랜드(작게 양쪽·가장 작게·펼침).
// 'widget' 지시어가 있는 함수는 babel-preset-expo(expo-widgets 플러그인)가 글자로 바꿔 App Group에 넣고,
// 위젯 쪽 JavaScriptCore가 그 글자만 다시 읽어 그린다. TodayWidget.ios.tsx와 같은 약속을 지킨다:
// - 도움 함수는 모두 함수 안에 둔다. 위 import는 타입 검사용일 뿐이다(위젯 쪽에서는 같은 이름이 전역으로 있다).
// - 펼침(...) · ?. · ??는 쓰지 않는다(babel 도움 함수가 생긴다).
// - p는 {}일 수 있다 — 모든 값에 기본값을 둔다. 시각은 ms 숫자로 받아 여기서 Date로 만든다.
// - 둥근 모서리·그림자 없이 종이 위 먹 한 가지: 영역 색은 네모 한 칸에만.
// 도는 동안은 SwiftUI 타이머 글(timerInterval)이 앱 없이 스스로 줄어든다. 멈춤은 남은 시간을 굳힌 글, 끝은 lines.done.
// tests/focusActivity.test.js가 바꾼 글자를 vm에서 돌려 이 약속을 확인한다.
import { HStack, ProgressView, Rectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel, activityBackgroundTint, font, foregroundStyle, frame, lineLimit, monospacedDigit, padding,
  progressViewStyle, tint, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { LiveActivityEnvironment, LiveActivityLayout } from 'expo-widgets';
import type { FocusActivityLines, FocusActivityProps, WidgetPalette } from '../lib/contracts';

export function FocusLayout(p: Partial<FocusActivityProps>, env: LiveActivityEnvironment): LiveActivityLayout {
  'widget';
  const e: Partial<LiveActivityEnvironment> = env || {};
  const dark = e.colorScheme === 'dark';
  const pals: Partial<FocusActivityProps['pal']> = p.pal || {};
  const P: Partial<WidgetPalette> = (dark ? pals.dark : pals.light) || {};
  // 다이내믹 아일랜드는 늘 검은 바탕 — 어두운 판의 먹을 쓴다
  const D: Partial<WidgetPalette> = pals.dark || {};
  const paper = P.paper || (dark ? '#0E0D14' : '#FBF9F4');
  const ink = P.ink || (dark ? '#F1EFEA' : '#2B2620');
  const sub = P.sub || (dark ? '#9C9AAA' : '#6F6657');
  const islandInk = D.ink || '#F1EFEA';
  const islandSub = D.sub || '#9C9AAA';
  const L: Partial<FocusActivityLines> = p.lines || {};
  const total = 25 * 60 * 1000;
  const end = typeof p.end === 'number' ? p.end : 0;
  const start = typeof p.start === 'number' && p.start <= end ? p.start : end - total;
  const done = p.done === true;
  const paused = !done && typeof p.paused === 'number' && p.paused >= 0;
  const leftMs = paused ? p.paused || 0 : 0;
  const color = p.c || ink;
  const area = p.area || '';
  const title = p.t || area || L.focus || '';
  const caption = done ? L.done || '' : paused ? L.paused || '' : L.focus || '';
  const url = p.url || 'mandarat://focus';

  /** '24:13' — 앱의 fmtClock과 같다 */
  function clockOf(ms: number) {
    const s = Math.max(0, Math.round(ms / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
  }
  /** 영역 색 네모 한 칸 */
  function square(size: number) {
    return <Rectangle modifiers={[foregroundStyle(color), frame({ width: size, height: size }), accessibilityLabel(area || title)]} />;
  }
  /** 남은 시간 — 도는 동안은 스스로 줄어드는 타이머 글, 멈춤·끝은 굳은 글 */
  function clock(size: number, fg: string, dim: string) {
    const mods = [font({ size: size, weight: 'semibold' }), monospacedDigit(), lineLimit(1)];
    if (done) return <Text modifiers={mods.concat([foregroundStyle(dim)])}>{clockOf(total)}</Text>;
    if (paused) return <Text modifiers={mods.concat([foregroundStyle(dim)])}>{clockOf(leftMs)}</Text>;
    return (
      <Text
        timerInterval={{ lower: new Date(start), upper: new Date(end) }}
        countsDown
        modifiers={mods.concat([foregroundStyle(fg)])}
      />
    );
  }
  /** 가는 진행 막대 — 25분 동안 먹으로 찬다 */
  function progress(fg: string) {
    const mods = [progressViewStyle('linear'), tint(fg)];
    if (done || paused) {
      const frac = done ? 1 : Math.min(1, Math.max(0, 1 - leftMs / total));
      return <ProgressView value={frac} modifiers={mods} />;
    }
    return <ProgressView timerInterval={{ lower: new Date(start), upper: new Date(end) }} countsDown={false} modifiers={mods} />;
  }

  const banner = (
    <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint(paper), widgetURL(url)]}>
      <HStack spacing={12} alignment="center">
        {square(14)}
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(ink), lineLimit(1)]}>{title}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(sub), lineLimit(1)]}>{caption}</Text>
        </VStack>
        <Spacer />
        {clock(34, ink, sub)}
      </HStack>
      {progress(ink)}
    </VStack>
  );

  return {
    banner: banner,
    compactLeading: square(12),
    compactTrailing: clock(14, islandInk, islandSub),
    minimal: clock(12, islandInk, islandSub),
    expandedLeading: (
      <HStack spacing={8} alignment="center" modifiers={[padding({ leading: 4 })]}>
        {square(12)}
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(islandInk), lineLimit(1)]}>{title}</Text>
      </HStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={0} modifiers={[padding({ trailing: 4 })]}>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(islandSub), lineLimit(1)]}>{done ? caption : paused ? caption : L.left || ''}</Text>
        {clock(26, islandInk, islandSub)}
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ horizontal: 4 })]}>
        {progress(islandInk)}
      </VStack>
    ),
  };
}
