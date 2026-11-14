// 집중 타이머 Live Activity의 모습 — 잠금 화면 배너와 다이내믹 아일랜드(작게 양쪽·가장 작게·펼침). 디자인 A(build-plan §4.1):
// 목업의 5×5 분 칸은 잠금 화면에서 스스로 바뀌지 못하고(앱 없이 도는 것은 타이머 글과 타이머 진행 막대뿐), 멈춤 버튼은
// 앱까지 다녀오는 App Intent가 필요해 1.0에 넣지 않는다. 그래서 배너는 종이(paper) 위 14pt 안쪽에
// 첫 줄 '25분 집중'(print) + 오른쪽 영역 표시와 이름, 할 일(17), 아래에 스스로 줄어드는 남은 시간(30 굵게) + '남음',
// 스스로 차는 가는 진행 막대(ink). 누르면 mandarat://focus. 아일랜드: 작게 · 가장 작게 = 영역 색 12pt 둥근 네모,
// 오른쪽 = 시간, 펼침 = 할 일 + 시간 + 진행 막대.
// 'widget' 지시어가 있는 함수는 babel-preset-expo(expo-widgets 플러그인)가 글자로 바꿔 App Group에 넣고,
// 위젯 쪽 JavaScriptCore가 그 글자만 다시 읽어 그린다. TodayWidget.ios.tsx와 같은 약속을 지킨다:
// - 도움 함수는 모두 함수 안에 둔다. 위 import는 타입 검사용일 뿐이다(위젯 쪽에서는 같은 이름이 전역으로 있다).
// - 펼침(...) · ?. · ?? · 구조 분해는 쓰지 않는다(babel 도움 함수가 생긴다).
// - p는 {}일 수 있다 — 모든 값에 기본값을 둔다(토큰 LIGHT · DARK와 같은 값). 시각은 ms 숫자로 받아 여기서 Date로 만든다.
// - 글꼴은 시스템 글꼴(Pretendard는 확장에 넣을 수 없다).
// 도는 동안은 SwiftUI 타이머 글(timerInterval)이 앱 없이 스스로 줄어든다. 멈춤은 남은 시간을 굳힌 글, 끝은 lines.done.
// tests/focusActivity.test.js · tests/a-n1.test.js가 바꾼 글자를 vm에서 돌려 이 약속을 확인한다.
import { HStack, ProgressView, RoundedRectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel, activityBackgroundTint, font, foregroundStyle, frame, labelsHidden, lineLimit, monospacedDigit, padding,
  progressViewStyle, tint, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { LiveActivityEnvironment, LiveActivityLayout } from 'expo-widgets';
import type { FocusActivityLines, FocusActivityProps, LivePalette } from '../lib/contracts';

export function FocusLayout(p: Partial<FocusActivityProps>, env: LiveActivityEnvironment): LiveActivityLayout {
  'widget';
  const e: Partial<LiveActivityEnvironment> = env || {};
  const dark = e.colorScheme === 'dark';
  const pals: Partial<FocusActivityProps['pal']> = p.pal || {};
  const P: Partial<LivePalette> = (dark ? pals.dark : pals.light) || {};
  // 다이내믹 아일랜드는 늘 검은 바탕 — 어두운 판의 먹과 영역 색을 쓴다
  const D: Partial<LivePalette> = pals.dark || {};
  const paper = P.paper || (dark ? '#121316' : '#FFFFFF');
  const ink = P.ink || (dark ? '#ECEDEF' : '#191B1F');
  const ink2 = P.ink2 || (dark ? '#A3A8B0' : '#5F6670');
  const print = P.print || (dark ? '#9AA0A8' : '#6B727C');
  const dye = P.dye || p.c || ink2;
  const islandInk = D.ink || '#ECEDEF';
  const islandSub = D.ink2 || '#A3A8B0';
  const islandDye = D.dye || p.c || islandSub;
  const L: Partial<FocusActivityLines> = p.lines || {};
  const total = 25 * 60 * 1000;
  const end = typeof p.end === 'number' ? p.end : 0;
  const start = typeof p.start === 'number' && p.start <= end ? p.start : end - total;
  const done = p.done === true;
  const paused = !done && typeof p.paused === 'number' && p.paused >= 0;
  const leftMs = paused ? p.paused || 0 : 0;
  const area = p.area || '';
  const title = p.t || area || L.focus || '';
  // 첫 줄 — 도는 동안 '25분 집중'(예전 props에는 running이 없어 '집중하는 중'), 멈춤 · 끝은 그 말
  const caption = done ? L.done || '' : paused ? L.paused || '' : L.running || L.focus || '';
  const url = p.url || 'mandarat://focus';

  /** '24:13' — 앱의 fmtClock과 같다 */
  function clockOf(ms: number) {
    const s = Math.max(0, Math.round(ms / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
  }
  /** 영역 표시 — 둥근 네모(모서리 = 한 변의 1/4) */
  function mark(size: number, color: string) {
    return (
      <RoundedRectangle
        cornerRadius={size / 4}
        modifiers={[foregroundStyle(color), frame({ width: size, height: size }), accessibilityLabel(area || title)]}
      />
    );
  }
  /** 남은 시간 — 도는 동안은 스스로 줄어드는 타이머 글, 멈춤·끝은 굳은 글(끝 = 25:00) */
  function clock(size: number, weight: 'semibold' | 'bold', fg: string, dim: string) {
    const mods = [font({ size: size, weight: weight }), monospacedDigit(), lineLimit(1)];
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
  /** 가는 진행 막대 — 25분 동안 먹으로 찬다(앱 없이 timerInterval로 차는 유일한 길). 바탕 길은 시스템의 옅은 회색 */
  function progress(fg: string) {
    const mods = [progressViewStyle('linear'), tint(fg), labelsHidden()];
    if (done || paused) {
      const frac = done ? 1 : Math.min(1, Math.max(0, 1 - leftMs / total));
      return <ProgressView value={frac} modifiers={mods} />;
    }
    return <ProgressView timerInterval={{ lower: new Date(start), upper: new Date(end) }} countsDown={false} modifiers={mods} />;
  }

  const banner = (
    <VStack alignment="leading" spacing={12} modifiers={[padding({ all: 14 }), activityBackgroundTint(paper), widgetURL(url)]}>
      <VStack alignment="leading" spacing={2}>
        <HStack spacing={8} alignment="center">
          <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(print), lineLimit(1)]}>{caption}</Text>
          <Spacer />
          {area
            ? (
              <HStack spacing={5} alignment="center">
                {mark(8, dye)}
                <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(print), lineLimit(1)]}>{area}</Text>
              </HStack>
            )
            : null}
        </HStack>
        <Text modifiers={[font({ size: 17, weight: 'medium' }), foregroundStyle(ink), lineLimit(1)]}>{title}</Text>
      </VStack>
      <VStack alignment="leading" spacing={6}>
        <HStack spacing={3} alignment="lastTextBaseline">
          {clock(30, 'bold', ink, ink)}
          {done ? null : <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(ink2), lineLimit(1)]}>{L.leftShort || ''}</Text>}
          <Spacer />
        </HStack>
        {progress(ink)}
      </VStack>
    </VStack>
  );

  return {
    banner: banner,
    compactLeading: mark(12, islandDye),
    compactTrailing: clock(15, 'semibold', islandInk, islandSub),
    // 가장 작게(36pt 캡슐)는 '24:13'이 잘린다 — 영역 네모 하나로 알아보고, 시간은 한 번 누르면 보인다
    minimal: mark(12, islandDye),
    expandedLeading: (
      <HStack spacing={8} alignment="center" modifiers={[padding({ leading: 4 })]}>
        {mark(12, islandDye)}
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(islandInk), lineLimit(1)]}>{title}</Text>
      </HStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={0} modifiers={[padding({ trailing: 4 })]}>
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(islandSub), lineLimit(1)]}>{done || paused ? caption : L.left || ''}</Text>
        {clock(26, 'bold', islandInk, islandSub)}
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ horizontal: 4 })]}>
        {progress(islandInk)}
      </VStack>
    ),
  };
}
