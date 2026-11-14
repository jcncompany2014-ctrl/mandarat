import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView,
  StyleSheet, View, type AccessibilityRole, type AccessibilityState, type StyleProp, type Text as RNText, type ViewStyle,
} from 'react-native';
import { MODAL_ORIENTATIONS, PANEL_MAX_W, PageSize, useLayout } from '../lib/screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, a11yLangProp } from './AppText';
import { DUR, EASE, SPRING } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';
import { Icon, type IconProps } from './Icon';
import { shadow } from '../theme/shadow';
import { alpha } from '../theme/moods';
import { GEO } from '../theme/tokens';
import { PRETENDARD } from '../theme/fonts';
import { ROLE } from '../theme/type';
import { noOrphan } from '../lib/text';
import { useOptionalUIActions, useOptionalUIState, type Screen } from '../navigation/ui';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';
import type { M } from '../theme/usePalette';

// 화면의 틀(chrome) — 머리 · 시트 · 단추 · 줄 · 글자 탭(docs/design/build-plan.md §3 C, 목업 docs/design/mockups/a).
// 색은 모두 토큰(M의 토큰 이름), 글자는 ROLE, 자리 수치는 GEO. 카드 · 둥근 상자 · 괘선 묶음 없이, 줄 사이 머리카락 선과 여백으로 묶는다.

/** iOS는 버튼 + 선택됨으로 읽히는 쪽이 자연스럽고, 안드로이드·웹은 탭/탭 목록이 맞다 */
const IOS = Platform.OS === 'ios';
const TAB_ROLE: AccessibilityRole = IOS ? 'button' : 'tab';
const TABLIST_ROLE: AccessibilityRole | undefined = IOS ? undefined : 'tablist';

/** 글리프 이름 — 저장 아이콘 이름 + 화면 글리프(down · pause · export · import · copies · focus) */
export type GlyphName = IconProps['name'];

/** 영역 색 작은 네모(8×8, 모서리 2) — 이름 앞에 찍는 물감 표시. 색만으로 뜻을 전하지 않게 늘 이름과 함께 */
function Dye({ color, size = GEO.dye }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: GEO.rTag, backgroundColor: color, marginRight: 6 }} />;
}

// ── 줄(괘선 없이 머리카락 선만) ─────────────────────────────────────────────────

/**
 * 묶음 목록 줄의 가장자리 — 예전엔 묶음 처음에 윗줄 · 끝에 진한 아랫줄을 그었다.
 * 이제 묶음은 여백으로 가른다: 위 · 아래 선 없이(줄 사이의 가는 선은 RowDivider). 부르는 곳을 위해 이름만 남긴다.
 */
export function groupEdge(_M: M, _first: boolean, _last: boolean, _radius = 18): ViewStyle {
  return {};
}

/** 줄을 누르고 있을 때의 바탕 — 종이 위 옅은 면(tile) */
export function pressedRow(M: M): ViewStyle {
  return { backgroundColor: M.tile };
}

/** 줄 사이의 머리카락 선 — 글자가 시작하는 곳부터(체크 칸이 있으면 38, 없으면 0). 첫 줄 위 · 끝 줄 아래에는 긋지 않는다 */
export function RowDivider({ M, inset }: { M: M; inset: number }) {
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: inset, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: M.printRule }} />;
}

// ── 화면 머리 ─────────────────────────────────────────────────────────────────

/** 머리 오른쪽의 동작 하나 — 글리프만(44 손끝) */
export interface HeaderAction {
  glyph: GlyphName;
  onPress: () => void;
  label: string;
  testID?: string;
}

/**
 * 고정 머리 자리 — Root가 스크롤 밖(화면 위)에 그려 줄 곳. pinned 머리는 여기로 올라가고, 자리가 없으면(곁 쪽 · 시트) 제자리에 그린다.
 * Root가 스크롤 위 여백을 머리 높이만큼 늘린다.
 */
export const PinnedHeaderSlot = createContext<((node: React.ReactNode) => void) | null>(null);

/** 탭 화면 → 뒤로 가기 옆에 적는 이름 */
const TAB_LABEL: Partial<Record<Screen, 'tabHome' | 'tabGrid' | 'tabToday' | 'tabStats'>> = {
  dashboard: 'tabHome', grid: 'tabGrid', today: 'tabToday', stats: 'tabStats',
};

/** 뒤로 가기 — 머리 위 줄(eyebrow)에 ‹ + 돌아갈 곳의 이름. 이름을 주지 않으면 온 곳(탭)의 이름 */
function BackLink({ M, label, onPress, testID }: { M: M; label?: string; onPress: () => void; testID?: string }) {
  const m = useMsg();
  const ui = useOptionalUIState();
  const key = ui ? TAB_LABEL[ui.from] : undefined;
  const text = label ?? (key ? m.core[key] : m.common.back);
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={m.core.back}
      {...a11yLangProp()}
      hitSlop={{ top: 13, bottom: 13, left: 10, right: 10 }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -4, alignSelf: 'flex-start', opacity: pressed ? 0.5 : 1 })}
    >
      <Icon name="chevL" size={16} color={M.ink} />
      <Text style={{ ...ROLE.link, color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.4}>{text}</Text>
    </Pressable>
  );
}

type HeaderProps = {
  /** 뒤로 가기의 testID(src/lib/testIds.ts) */
  backTestID?: string;
  M: M;
  /** 제목(예전 이름) — title과 같다 */
  kr?: string;
  /** 제목 — 26/36(주인이 쓴 말이어도 같은 글자) */
  title?: string;
  /** 제목 위 인쇄된 한 줄(날짜 · 핵심 목표 · 2026 · 42주) — 비어 있어도 자리는 늘 둔다 */
  eyebrow?: string;
  /** eyebrow의 예전 이름 */
  sub?: string;
  /** 뒤로 가기 옆 이름('홈' · '만다라트') — onBack이 있을 때. 없으면 온 곳(탭)의 이름 */
  back?: string;
  onBack?: () => void;
  /** 제목이 주인이 쓴 말(핵심 목표 · 영역 이름) — 깨끗한 판에서는 같은 글자로 그린다(뜻만 적어 둔다) */
  written?: boolean;
  /** 홈의 핵심 목표 — 30/40, 세 줄까지 */
  headline?: boolean;
  /** 제목 줄 오른쪽의 숫자(1/10 · 4/8) */
  figure?: string;
  /** 숫자를 읽는 말 — '1/10'은 날짜로 읽혀서('오늘 할 일 10개 중 1개 했어요' · '8칸 중 4칸 달성') */
  figureLabel?: string;
  /**
   * 머리 한 덩어리의 읽는 말 — 주면 위 줄 · 제목 · 숫자를 한 번에 이 말로 읽는다(머리 역할, 홈: 날짜 · 핵심 목표 · 달성 · 남은 할 일).
   * 뒤로 가기 · 제목 단추 · 오른쪽 동작은 따로 읽힌다.
   */
  accessibilityLabel?: string;
  /** 제목을 누르면 — 홈의 '핵심 목표를 정해 주세요'(편집 창). 제목 자리 위에 단추를 놓는다(동작 자리는 비킨다) */
  onTitlePress?: () => void;
  /** 제목 단추의 읽는 말 · 도움말(읽는 말이 없으면 제목 그대로) */
  titleLabel?: string;
  titleHint?: string;
  /** 오른쪽 동작 하나(글리프) */
  action?: HeaderAction;
  /** 예전 오른쪽 자리 — 아무 요소나(action이 있으면 그것을 쓴다) */
  right?: React.ReactNode;
  /** 스크롤 밖에 고정(설정) — Root가 화면 위에 그리고 내용은 그 아래에서 스크롤한다 */
  pinned?: boolean;
  /** 예전 배치(버튼 줄을 위에) — 새 머리는 늘 뒤로 가기를 위 줄에 두므로 아무 일도 하지 않는다 */
  stacked?: boolean;
  /**
   * 화면이 처음 그려질 때 스크린리더 초점을 제목으로 옮긴다(상세·설정처럼 밀려 들어오는 화면).
   * 처음 한 번만 — 같은 화면 안에서 제목만 바뀔 때(이전/다음 영역)는 누르던 자리에 초점을 둔다.
   */
  focusTitle?: boolean;
};

/**
 * 화면 머리(A.header) — 모든 탭이 같은 뼈대: 인쇄된 위 줄(늘 자리를 둔다) + 제목 + 오른쪽 동작 하나. 아래 선 없음.
 * 높이 72(제목이 접히면 늘어난다): 위 12 · 위 줄 18 · 제목 36. 좌우는 화면 여백(24).
 * 뒤로 가기는 위 줄에 '‹ 이름'. 숫자(figure)는 제목 줄 오른쪽, 동작 앞. 동작은 44 손끝에 글리프 24(오른쪽 −10, 위 26 · 헤드라인 28).
 * 화면 읽기: 제목은 머리(header), 숫자는 figureLabel로. accessibilityLabel을 주면 위 줄 · 제목 · 숫자가 그 말 한 덩어리.
 */
export function Header({ backTestID, pinned, ...rest }: HeaderProps) {
  const setPinned = useContext(PinnedHeaderSlot);
  const pin = !!pinned && !!setPinned;
  const body = <HeaderBody backTestID={backTestID} {...rest} />;
  // 고정 머리는 Root의 자리로 올린다 — 그릴 때마다 최신 머리를 넘기고, 화면이 사라지면 비운다
  useLayoutEffect(() => {
    if (pin) setPinned?.(body);
  });
  useLayoutEffect(() => () => {
    if (pin) setPinned?.(null);
  }, [pin, setPinned]);
  return pin ? null : body;
}

function HeaderBody({
  backTestID, M, kr, title, eyebrow, sub, back, onBack, headline, figure, figureLabel, accessibilityLabel,
  onTitlePress, titleLabel, titleHint, action, right, focusTitle,
}: HeaderProps) {
  const titleRef = useRef<RNText>(null);
  const groupRef = useRef<View>(null);
  const [rightW, setRightW] = useState(44);
  const grouped = accessibilityLabel != null;

  useEffect(() => {
    if (!focusTitle || Platform.OS === 'web') return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (!on || !alive) return;
        // 화면 전환이 끝나 제목이 자리 잡은 뒤에 옮겨야 VoiceOver가 놓치지 않는다(한 덩어리로 읽는 머리면 그 덩어리로)
        timer = setTimeout(() => {
          const node = grouped ? groupRef.current : titleRef.current;
          if (alive && node) AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
        }, 150);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []); // 처음 그려질 때만(위 설명)

  const legacyRight = !action && right != null && right !== false ? right : null;
  const hasAction = !!action || legacyRight != null;
  const top = headline ? 28 : 26;
  // 제목이 동작 · 숫자 밑으로 들어가지 않게(A.header: 동작 48, 숫자 120)
  const padRight = figure ? 120 : hasAction ? Math.max(48, rightW + 4) : 0;
  const words = title ?? kr ?? '';
  const eyebrowText = eyebrow ?? sub ?? '';

  return (
    <View style={{ marginHorizontal: GEO.gutter, minHeight: GEO.header, paddingTop: 12 }}>
      {onBack && (
        <View style={{ height: 18, justifyContent: 'center' }}>
          <BackLink M={M} label={back} onPress={onBack} testID={backTestID} />
        </View>
      )}
      {/* 위 줄 · 제목 · 숫자 — accessibilityLabel을 주면 이 덩어리가 그 말로 한 번에 읽힌다(뒤로 가기 · 단추는 밖에) */}
      <View
        ref={groupRef}
        accessible={grouped}
        accessibilityRole={grouped ? 'header' : undefined}
        accessibilityLabel={accessibilityLabel}
        {...a11yLangProp()}
      >
        {!onBack && (
          <View style={{ height: 18, justifyContent: 'center' }}>
            {!!eyebrowText && (
              <Text style={{ ...ROLE.folio, color: M.print }} numberOfLines={1} maxFontSizeMultiplier={1.4}>{eyebrowText}</Text>
            )}
          </View>
        )}
        <Text
          ref={titleRef}
          accessibilityRole="header"
          style={{ ...(headline ? ROLE.headline : ROLE.title), color: M.ink, paddingRight: padRight }}
          numberOfLines={headline ? 3 : 2}
        >
          {noOrphan(words)}
        </Text>
        {!!figure && (
          <Text
            accessibilityLabel={figureLabel}
            // 제목 줄 위(머리 위에서 30) — 위 줄이 이 덩어리 안에 있으면 18 아래, 뒤로 가기 줄이 밖에 있으면 맨 위
            style={{ ...ROLE.figureHeader, color: M.ink, position: 'absolute', top: onBack ? 0 : 18, right: hasAction ? 44 : 0 }}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {figure}
          </Text>
        )}
      </View>
      {onTitlePress && (
        // 제목 자리의 단추 — 동작 · 숫자 자리는 비킨다
        <Pressable
          onPress={onTitlePress}
          accessibilityRole="button"
          accessibilityLabel={titleLabel ?? words}
          accessibilityHint={titleHint}
          {...a11yLangProp()}
          style={{ position: 'absolute', left: 0, right: padRight, top: 30, bottom: 0 }}
        />
      )}
      {action && (
        <View style={{ position: 'absolute', right: -10, top }}>
          <IconBtn M={M} name={action.glyph} label={action.label} onPress={action.onPress} testID={action.testID} />
        </View>
      )}
      {legacyRight != null && (
        <View
          onLayout={(e) => setRightW(Math.round(e.nativeEvent.layout.width) - 10)}
          style={{ position: 'absolute', right: -10, top, flexDirection: 'row', alignItems: 'center' }}
        >
          {legacyRight}
        </View>
      )}
    </View>
  );
}

/**
 * 글리프 단추 — 바탕 · 동그라미 없이 글리프 24만, 손끝 44. 누르면 잠깐 흐려진다.
 * 이름표가 없고 누를 수도 없으면 스크린리더에서 숨긴다.
 */
export function IconBtn({
  testID, M, name, onPress, badge, label, active, color,
}: {
  /** src/lib/testIds.ts의 이름 — Maestro·스크린샷 도구가 찾는다 */
  testID?: string;
  M: M;
  name: GlyphName;
  onPress?: () => void;
  /** 알림 점(먹 6pt) */
  badge?: boolean;
  label?: string;
  /** 고른 모양의 글리프(탭 넷) */
  active?: boolean;
  /** 글리프 색 — 기본 먹 */
  color?: string;
}) {
  const hidden = !label && !onPress;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...a11yLangProp()}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no' : 'yes'}
      style={({ pressed }) => ({
        width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name={name} size={24} color={color ?? M.ink} active={active} ground={M.paper} />
      {badge && <View style={{ position: 'absolute', top: 9, right: 9, width: 6, height: 6, borderRadius: 3, backgroundColor: M.ink }} />}
    </Pressable>
  );
}

/**
 * 영역 이름표 — 물감 네모(8×8) + 먹색 이름. 색은 네모가 맡고 글씨는 먹색으로 둔다.
 * light: 늘 어두운 바탕(집중 타이머) 위 — 글씨를 그 위의 글자 색(onCore)으로.
 */
export function Pill({ M, color, children, light }: { M: M; color: string; children: React.ReactNode; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%' }}>
      <Dye color={color} />
      <Text style={{ ...ROLE.label, flexShrink: 1, color: light ? M.onCore : M.ink }} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

/** Pill의 새 이름 — 하는 일(영역 이름표)대로 부른다 */
export const AreaTag = Pill;

// ── 떠 있는 시트 ──────────────────────────────────────────────────────────────

/** 시트를 닫는다. force가 정확히 true일 때만 guard를 건너뛴다(onPress={dismiss}로 넘어온 이벤트는 강제가 아니다) */
export type SheetDismissFn = (force?: boolean) => void;

const SheetDismiss = createContext<SheetDismissFn>(() => {});

/** 시트 안(본문·footer)에서 부르면, guard를 물어본 뒤 아래로 미끄러져 내려가며 닫힌다. dismiss(true)는 묻지 않고 닫는다 */
export function useSheetDismiss(): SheetDismissFn {
  return useContext(SheetDismiss);
}

/** 시트 바탕 — 종이 한 장(밝게 · 어둡게 모두 paper) */
export function sheetBg(M: M): string {
  return M.paper;
}

/**
 * 지금 올라와 있는 키보드 높이(pt, 없으면 0).
 * iOS는 올라오기 시작할 때(keyboardWillShow/Hide), 안드로이드는 다 올라온 뒤(keyboardDidShow/Hide) 알린다. 웹은 늘 0.
 */
export function useKeyboardHeight(): number {
  const [h, setH] = useState(() => {
    if (Platform.OS === 'web') return 0;
    try {
      return Keyboard.isVisible() ? Keyboard.metrics()?.height ?? 0 : 0;
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(IOS ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setH(e?.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(IOS ? 'keyboardWillHide' : 'keyboardDidHide', () => setH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return h;
}

/** 시트 판의 폭 — 단(또는 창) 폭에서 좌우 8씩 띄우고, 넓은 창(아이패드)에서는 560에서 멈춘다 */
export function sheetWidth(layoutWidth: number): number {
  return Math.min(PANEL_MAX_W, layoutWidth - 2 * GEO.sheet.inset);
}

const APressable = Animated.createAnimatedComponent(Pressable);

/**
 * 떠 있는 종이 시트(A .a-sheet) — 화면 가장자리에서 8 띄워(좌 · 우 · 아래) 네 모서리 모두 28로 둥글게, 종이 바탕 + 떠 있는 그림자.
 * 어두운 막(scrim)이 탭 막대까지 모두 덮는다. 넓은 창에서는 560 폭으로 가운데.
 * - 위 손잡이 줄(testID sheet-handle): 끌어내리거나 톡 건드리면 닫힌다. 손잡이 막대(36×4)는 끌어 닫는 시트(ownClose 아님)에만 그린다.
 * - header: 시트의 머리 줄(SheetHeader) — 스크롤 밖 위에 고정, 위 여백은 6.
 * - pad: 안쪽 여백 24를 시트가 준다(새 시트). 예전 시트는 본문이 좌우 20을 스스로 둔다.
 * - 부드럽게 올라오고, 닫을 땐(바깥 탭·닫기·뒤로 가기·두 손가락 Z) 아래로 미끄러져 내려간다. 덜 끌면 제자리로 돌아온다.
 * - footer: 스크롤 밖 맨 아래에 고정되는 줄(저장 버튼 등) — 본문이 길어도 늘 보인다.
 * - guard: 닫기 전에 묻는다(고친 내용 버리기 확인 등). false면 닫지 않고 제자리로. 받은 dismiss(true)로 나중에 닫을 수 있다.
 * - 키보드가 올라와 있을 때 바깥을 누르면 키보드만 내린다(쓰던 글이 한 번의 헛손질로 사라지지 않게). 시트는 키보드 위 8에 앉는다.
 * - 떠 있는 동안 UI 대기열에 열린 모달로 센다(화면이 자기 상태로 연 시트도) — 그 위에 다른 모달이 뜨지 않게.
 * - returnFocusRef: 닫힌 뒤 스크린리더 초점을 돌려줄 곳(시트를 연 버튼). iOS는 대개 스스로 돌려주고, 안드로이드는 이것이 맡는다.
 */
export function Sheet({
  M, onClose, children, maxHeightPct = 0.9, ownClose = false, overlay, footer, guard, scrollRef, keyboardDismissMode,
  returnFocusRef, header, pad = false,
}: {
  M: M;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightPct?: number;
  /** 시트 안에 닫기(×) 버튼이 따로 있으면 true — 손잡이 막대를 그리지 않고 스크린리더에서 숨겨 '닫기'가 두 번 읽히지 않게 */
  ownClose?: boolean;
  /** 시트 위에 떠야 하는 것(안내 토스트) — 모달 밖에 두면 시트에 가려진다 */
  overlay?: React.ReactNode;
  /** 스크롤 밖 맨 아래에 고정되는 줄 */
  footer?: React.ReactNode;
  /** 닫아도 되면 true. false면 시트가 제자리로 돌아온다. 인자로 받은 dismiss(true)는 다시 묻지 않고 닫는다 */
  guard?: (dismiss: SheetDismissFn) => boolean;
  /** 본문 스크롤 — 고른 뒤 맨 아래로 내려 보여 줄 때(scrollToEnd) */
  scrollRef?: React.Ref<ScrollView>;
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
  /** 닫힌 뒤 스크린리더 초점을 돌려줄 곳(시트를 연 버튼) */
  returnFocusRef?: React.RefObject<React.ComponentRef<typeof View> | null>;
  /** 시트의 머리 줄(SheetHeader) — 스크롤 밖에 고정 */
  header?: React.ReactNode;
  /** 안쪽 좌우 여백 24를 시트가 준다(새 시트는 true) */
  pad?: boolean;
}) {
  const m = useMsg();
  const insets = useSafeAreaInsets();
  // 판의 폭 = 단 폭 − 16(넓은 창은 560) — 시트 안의 폭(PageSize)도 이 폭
  const layout = useLayout();
  const sheetW = sheetWidth(layout.width);
  const panel = useMemo<ViewStyle>(() => ({ width: sheetW, alignSelf: 'center', marginBottom: GEO.sheet.inset }), [sheetW]);
  const page = useMemo(() => ({ width: sheetW }), [sheetW]);
  const uiActions = useOptionalUIActions();
  const register = uiActions?.registerOverlay;
  // 마운트된 동안(내려가는 애니메이션까지) 열린 모달 하나로 센다
  useEffect(() => (register ? register() : undefined), [register]);
  const focusBack = useRef(returnFocusRef);
  focusBack.current = returnFocusRef;
  useEffect(() => () => {
    if (Platform.OS === 'web') return;
    const ref = focusBack.current;
    if (!ref) return;
    // 모달이 다 내려간 뒤에 옮겨야 스크린리더가 놓치지 않는다
    setTimeout(() => {
      const node = ref.current;
      if (!node) return;
      AccessibilityInfo.isScreenReaderEnabled()
        .then((on) => { if (on && ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus'); })
        .catch(() => {});
    }, 400);
  }, []);
  const kb = useKeyboardHeight();
  const kbRef = useRef(kb);
  kbRef.current = kb;

  const enter = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current; // 0 → 1 등장
  const drag = useRef(new Animated.Value(0)).current; // 끌어내린 거리 · 퇴장 거리
  const height = useRef(560);
  const closing = useRef(false);
  // 내려가는 동안에는 손을 대도 반응하지 않게(같은 버튼을 두 번 누르는 사고 방지)
  const [leaving, setLeaving] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const guardRef = useRef(guard);
  guardRef.current = guard;

  useEffect(() => {
    if (reducedMotion()) return;
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, ...SPRING.gentle }).start();
  }, [enter]);

  /** 끌던 시트를 제자리로 */
  const settle = useCallback(() => {
    if (reducedMotion()) {
      drag.setValue(0);
      return;
    }
    Animated.spring(drag, { toValue: 0, useNativeDriver: true, ...SPRING.gentle }).start();
  }, [drag]);

  const dismiss = useCallback<SheetDismissFn>((force) => {
    if (closing.current) return;
    // 정확히 true일 때만 강제 — onPress={dismiss}로 넘어온 이벤트 객체는 묻는 쪽으로
    if (force !== true && guardRef.current && !guardRef.current(dismiss)) {
      settle();
      return;
    }
    closing.current = true;
    setLeaving(true);
    if (reducedMotion()) {
      onCloseRef.current();
      return;
    }
    Animated.parallel([
      Animated.timing(drag, { toValue: height.current + 40, duration: DUR.base, easing: EASE.in, useNativeDriver: true }),
      Animated.timing(enter, { toValue: 0, duration: DUR.base, easing: EASE.in, useNativeDriver: true }),
    ]).start(() => onCloseRef.current());
  }, [drag, enter, settle]);

  /** 바깥(어두운 막) 탭 — 키보드가 올라와 있으면 키보드만 내린다 */
  const onBackdrop = useCallback(() => {
    if (kbRef.current > 0) {
      Keyboard.dismiss();
      return;
    }
    dismiss();
  }, [dismiss]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 3 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          // 거의 움직이지 않았으면 톡 건드린 것 — 닫는다
          if (Math.abs(g.dy) < 6 && Math.abs(g.dx) < 6) dismiss();
          else if (g.dy > 110 || g.vy > 1.1) dismiss();
          else settle();
        },
        onPanResponderTerminate: () => settle(),
      }),
    [drag, dismiss, settle],
  );

  // 같은 Animated.Value에서 나온 계산 노드는 한 번만 만든다(그릴 때마다 새로 만들면 네이티브 쪽에 다시 붙는다)
  const translateY = useMemo(
    () => Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }), drag),
    [enter, drag],
  );
  const backdrop = useMemo(
    () => Animated.multiply(
      enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
      drag.interpolate({ inputRange: [0, 320], outputRange: [1, 0.25], extrapolate: 'clamp' }),
    ),
    [enter, drag],
  );

  const side = pad ? GEO.sheet.pad : 0;
  // 위 여백 — 머리 줄이 있으면 6, 끌어 닫는 시트는 손잡이 막대(8 + 4 + 12), 그 밖은 24
  const grabber = !ownClose;
  const topPad = header != null ? 6 : GEO.sheet.pad;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={() => dismiss()}
      statusBarTranslucent
      supportedOrientations={MODAL_ORIENTATIONS}
    >
      {/* 바깥 — 스크린리더에서는 없는 것으로(닫기는 × 버튼·손잡이·두 손가락 Z로) */}
      <APressable
        onPress={onBackdrop}
        accessible={false}
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={[StyleSheet.absoluteFill, { backgroundColor: M.scrim, opacity: backdrop }]}
      />
      {/* iOS 키보드가 시트의 입력칸을 가리지 않도록 함께 밀어 올린다(안드로이드는 키보드 높이만큼 아래를 비운다) */}
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={IOS ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: Platform.OS === 'android' ? kb : 0 }}
      >
        <Animated.View
          pointerEvents={leaving ? 'none' : 'auto'}
          accessibilityViewIsModal
          onAccessibilityEscape={() => dismiss()}
          onLayout={(e) => { height.current = e.nativeEvent.layout.height; }}
          style={[
            {
              backgroundColor: sheetBg(M),
              borderRadius: GEO.rSheet,
              paddingBottom: kb > 0 ? 16 : Math.max(GEO.sheet.pad, insets.bottom),
              maxHeight: `${maxHeightPct * 100}%`,
              transform: [{ translateY }],
            },
            panel,
            shadow(8, '#000', 0, M),
          ]}
        >
          {/* 손잡이 줄 — 끌어내리거나 톡 건드리면 닫힌다(막대는 끌어 닫는 시트에만) */}
          <View
            {...pan.panHandlers}
            testID={TID.sheetHandle}
            accessible={!ownClose}
            importantForAccessibility={ownClose ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={ownClose}
            accessibilityRole="button"
            accessibilityLabel={m.core.sheetHandle}
            {...a11yLangProp()}
            accessibilityHint={m.core.sheetHandleHint}
            onAccessibilityTap={() => dismiss()}
            style={{ height: topPad, paddingTop: 8, alignItems: 'center' }}
          >
            {grabber && header == null && <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: M.printMid }} />}
          </View>
          <PageSize.Provider value={page}>
          <SheetDismiss.Provider value={dismiss}>
            {header != null && <View style={{ paddingHorizontal: GEO.sheet.pad }}>{header}</View>}
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={keyboardDismissMode}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={side ? { paddingHorizontal: side } : undefined}
            >
              {children}
            </ScrollView>
            {footer != null && footer !== false && (
              <View style={{ flexShrink: 0, paddingTop: 12, paddingHorizontal: pad ? GEO.sheet.pad : 20 }}>
                {footer}
              </View>
            )}
          </SheetDismiss.Provider>
          </PageSize.Provider>
        </Animated.View>
      </KeyboardAvoidingView>
      {overlay}
    </Modal>
  );
}

/**
 * 시트의 머리 줄(S.head) — 48 높이: 앞 자리(위치 표 · locator) + 인쇄된 두 줄(첫 줄 먹 600, 물감 네모 선택 · 둘째 줄 인쇄 색)
 * + 닫기 글리프(44 손끝, 동그라미 없음). Sheet의 header로 넘기면 스크롤 밖 위에 고정된다.
 * - accessibilityLabel: 앞 자리와 두 줄을 이 말 한 덩어리로 읽는다 — '실천 3/8'은 날짜로 읽혀서 말로('건강 영역, 8칸 중 세 번째 칸').
 *   누를 수 없으면 머리(header)로 읽힌다.
 * - onPress: 앞 자리와 두 줄이 한 단추 — 실천 시트에서 '어디'(위치 표 + ■ 건강 / 실천 1/8)를 누르면 그 영역 쪽으로.
 */
export function SheetHeader({
  closeTestID, M, leading, title, dye, area, sub, onClose, onPress, accessibilityLabel, accessibilityHint,
}: {
  /** 닫기(×)의 testID — 기본은 TID.sheetClose */
  closeTestID?: string;
  M: M;
  /** 앞 자리(위치 표 36 등) */
  leading?: React.ReactNode;
  /** 첫 줄(먹 600) — 영역 이름 등 */
  title?: string;
  /** 첫 줄 앞 물감 네모의 색 */
  dye?: string;
  /** 첫 줄 앞 물감 네모 — 영역 번호로(그 영역의 dye). dye를 주면 그것 */
  area?: number;
  /** 둘째 줄(인쇄 색) — '실천 3/8' */
  sub?: string;
  /** 닫기 — 기본은 시트 닫기(guard를 거친다) */
  onClose?: () => void;
  /** 앞 자리 · 두 줄을 누르면(영역 쪽으로 가는 '어디' 단추) */
  onPress?: () => void;
  /** 앞 자리 · 두 줄을 한 번에 읽는 말 */
  accessibilityLabel?: string;
  /** 단추일 때의 도움말 */
  accessibilityHint?: string;
}) {
  const dismiss = useSheetDismiss();
  const mark = dye ?? (area != null ? M.dye[area] : undefined);
  const lines = (
    <>
      {!!title && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!!mark && <Dye color={mark} />}
          <Text style={{ ...ROLE.label, fontFamily: PRETENDARD[600], lineHeight: 17, color: M.ink, flexShrink: 1 }} numberOfLines={1}>{title}</Text>
        </View>
      )}
      {!!sub && <Text style={{ ...ROLE.label, lineHeight: 17, color: M.print }} numberOfLines={1}>{sub}</Text>}
    </>
  );
  return (
    <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          {...a11yLangProp()}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.6 : 1 })}
        >
          {leading}
          <View style={{ flex: 1, minWidth: 0 }}>{lines}</View>
        </Pressable>
      ) : (
        <>
          {leading}
          <View
            style={{ flex: 1, minWidth: 0 }}
            accessible={!!(title || sub)}
            accessibilityRole={accessibilityLabel ? 'header' : undefined}
            accessibilityLabel={accessibilityLabel}
            {...a11yLangProp()}
          >
            {lines}
          </View>
        </>
      )}
      <View style={{ marginRight: -10 }}>
        <CloseBtn M={M} onPress={onClose ?? (() => dismiss())} testID={closeTestID ?? TID.sheetClose} />
      </View>
    </View>
  );
}

/**
 * 닫기(×) — 글리프만, 동그라미 없이 44 손끝. light: 늘 어두운 바탕(집중 타이머) 위 — 그 위의 글자 색으로.
 */
export function CloseBtn({ testID, M, onPress, light }: { testID?: string; M: M; onPress: () => void; light?: boolean }) {
  const m = useMsg();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={m.common.close}
      {...a11yLangProp()}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <Icon name="close" size={24} color={light ? M.onCore : M.ink} />
    </Pressable>
  );
}

// ── 단추 ──────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'tint';

type ButtonColors = { bg: string; fg: string; edge?: string };

function ButtonBase({
  testID, label, onPress, disabled, colors, small, height, glyph, accessibilityLabel, accessibilityHint, style,
}: {
  testID?: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
  colors: ButtonColors;
  small: boolean;
  height?: number;
  glyph?: GlyphName;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const h = height ?? (small ? 36 : 52);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          minHeight: h, borderRadius: h / 2, paddingHorizontal: small ? 16 : 24, paddingVertical: 6,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          backgroundColor: colors.bg,
          borderWidth: colors.edge ? 1.25 : 0, borderColor: colors.edge,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {glyph && <Icon name={glyph} size={small ? 16 : 20} color={colors.fg} />}
      <Text style={{ ...(small ? ROLE.buttonSmall : ROLE.button), color: colors.fg, textAlign: 'center', flexShrink: 1 }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * 단추(A .a-btn) — 한 가지 뼈대, 세 가지 칠. 영역 색 · 신호색(signal)은 쓰지 않는다.
 * - primary: 먹 바탕(btn) + 종이 글씨(onBtn), 52 높이 · 모서리 26
 * - secondary: 바탕 없이 1.25 가장자리(printEdge) + 먹 글씨
 * - tint: 옅은 면(tile) + 먹 글씨(멈추기)
 * - small: 36 높이 · 모서리 18 · 13/18
 * - disabled: 옅은 면 + 인쇄 색 글씨(비활성 글씨는 WCAG 대비 예외)
 * 글자를 크게 키우면 두 줄까지 늘어나며 단추도 함께 커진다(잘리지 않게).
 */
export function Button({
  testID, M, label, onPress, variant = 'primary', small = false, disabled = false, glyph, height, accessibilityLabel, accessibilityHint, style,
}: {
  /** src/lib/testIds.ts의 이름 */
  testID?: string;
  M: M;
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  small?: boolean;
  disabled?: boolean;
  /** 글자 앞 글리프(멈추기의 ‖ 등) */
  glyph?: GlyphName;
  /** 기본 52(작게 36) */
  height?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** 바깥 배치(flex·폭·여백)만 — 색·모양은 variant가 정한다 */
  style?: StyleProp<ViewStyle>;
}) {
  const colors: ButtonColors = disabled
    ? { bg: M.tile, fg: M.print }
    : variant === 'secondary'
      ? { bg: 'transparent', fg: M.ink, edge: M.printEdge }
      : variant === 'tint'
        ? { bg: M.tile, fg: M.ink }
        : { bg: M.btn, fg: M.onBtn };
  return (
    <ButtonBase
      testID={testID} label={label} onPress={onPress} disabled={disabled} colors={colors} small={small} height={height}
      glyph={glyph} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} style={style}
    />
  );
}

export type PrimaryTone = 'accent' | 'inverse' | 'quiet';

/**
 * 예전 주 단추 — Button으로 그린다. accent = primary, quiet = secondary,
 * inverse = 늘 어두운 집중 화면(core 바탕) 위 — 그 위의 글자 색(onCore)으로 칠하고 글씨는 core.
 */
export function PrimaryButton({
  testID, M, label, onPress, disabled = false, tone = 'accent', accessibilityLabel, accessibilityHint, height = 52, style,
}: {
  /** src/lib/testIds.ts의 이름 */
  testID?: string;
  M: M;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: PrimaryTone;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** 기본 52 — 온보딩 아래 막대처럼 조금 더 큰 자리에서만 바꾼다 */
  height?: number;
  /** 바깥 배치(flex·폭·여백)만 — 색·모양은 tone이 정한다 */
  style?: StyleProp<ViewStyle>;
}) {
  if (tone === 'inverse') {
    const colors: ButtonColors = disabled
      ? { bg: 'transparent', fg: alpha(M.onCore, 0.5), edge: alpha(M.onCore, 0.3) }
      : { bg: M.onCore, fg: M.core };
    return (
      <ButtonBase
        testID={testID} label={label} onPress={onPress} disabled={disabled} colors={colors} small={false} height={height}
        accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} style={style}
      />
    );
  }
  return (
    <Button
      testID={testID} M={M} label={label} onPress={onPress} disabled={disabled} variant={tone === 'quiet' ? 'secondary' : 'primary'}
      height={height} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} style={style}
    />
  );
}

/**
 * 조용한 글 동작(.s-quiet) — 굵은 먹 글씨만, 밑줄 없이(먹은 누르는 것, 회색은 누르지 않는 것). 손끝 44.
 * 완료 · 그만하기 · 칸 비우기처럼 무언가를 열지 않는 동작. foot: 시트 바닥(14/18).
 */
export function QuietAction({
  testID, M, label, onPress, foot = false, disabled = false, accessibilityLabel, accessibilityHint, style,
}: {
  testID?: string;
  M: M;
  label: string;
  onPress: () => void;
  foot?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={{ left: 8, right: 8 }}
      style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.5 : 1 }, style]}
    >
      <Text style={{ ...(foot ? ROLE.quietFoot : ROLE.quiet), color: disabled ? M.print : M.ink }} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

/**
 * 고르는 칩(요일 묶음 · 마감 바로 고르기) — 옅은 면(tile) · 모서리 10. 고른 것은 먹으로 칠하고 글씨를 종이 색으로(세그먼트와 같은 고름).
 * 높이 40 + 위아래 hitSlop 4 = 손끝 48. 햅틱은 부르는 쪽에서(칩마다 같은 촉감을 강요하지 않는다).
 */
export function PaperChip({
  M, label, on = false, onPress, accessibilityLabel, disabled = false,
}: {
  M: M;
  label: string;
  on?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityState={{ selected: on, disabled }}
      style={({ pressed }) => ({
        minHeight: 40, paddingHorizontal: 12, borderRadius: GEO.rChip,
        backgroundColor: on ? M.ink : M.tile,
        alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ ...(on ? ROLE.segmentOn : ROLE.segment), color: on ? M.paper : M.ink }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── 글자 탭(FilterLine 모양) ───────────────────────────────────────────────────

/** 줄 높이 44 — 고른 낱말 아래 1pt 먹 밑줄이 바닥에서 9 위 */
const FILTER_H = 44;

function FilterWord({ M, label, on, count, dye, a11y, onPress }: {
  M: M;
  label: string;
  on: boolean;
  count?: number;
  dye?: string;
  a11y: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { if (!on) onPress(); }}
      accessibilityRole={TAB_ROLE}
      accessibilityLabel={a11y}
      {...a11yLangProp()}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ height: FILTER_H, flexDirection: 'row', alignItems: 'center', opacity: pressed && !on ? 0.6 : 1 })}
    >
      {!!dye && <Dye color={dye} />}
      <Text style={{ ...(on ? ROLE.wordOn : ROLE.word), color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.6}>{label}</Text>
      {count != null && (
        <Text style={{ ...ROLE.wordNum, color: M.ink2, marginLeft: 4 }} maxFontSizeMultiplier={1.6}>{count}</Text>
      )}
      {on && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 9, height: 1, backgroundColor: M.ink }} />}
    </Pressable>
  );
}

/**
 * 글자 탭(범위 줄: 목록 · 연속 기록 · 보드) — 바탕 · 테두리 없이 낱말만, 고른 것은 굵게 + 1pt 먹 밑줄. 낱말 사이 24.
 * 저장 값(options)과 보이는 이름(labels)을 나눠, 이름을 바꿔도 저장된 값은 그대로.
 */
export function TextTabs<T extends string>({
  testID, M, options, value, onChange, labels,
}: {
  /** 탭 줄 전체의 testID(src/lib/testIds.ts) */
  testID?: string;
  M: M;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <View accessibilityRole={TABLIST_ROLE} testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, minHeight: FILTER_H }}>
      {options.map((o) => {
        const label = labels?.[o] ?? o;
        return <FilterWord key={o} M={M} label={label} a11y={label} on={o === value} onPress={() => onChange(o)} />;
      })}
    </View>
  );
}

export interface IndexTabItem {
  key: string;
  label: string;
  /** 영역 색(없으면 '전체'처럼 물감 네모 없이) */
  color?: string;
  /** 이름 옆 개수(고정폭 숫자) */
  count?: number;
}

/**
 * 거르기 줄(FilterLine) — 낱말(+ 영역 물감 네모 · 개수)이 한 줄로 흐르고 옆으로 스크롤한다. 낱말 사이 18.
 * 고른 것은 굵게 + 바닥에서 9 위 1pt 먹 밑줄. 기본은 화면 끝까지 닿는 한 줄(좌우 -bleed / 안쪽 bleed),
 * wrap이면 여러 줄로 접는다(영역 8개를 다 보여 줄 때).
 */
export function IndexTabs({
  M, items, value, onChange, wrap = false, bleed = 20,
}: {
  M: M;
  items: readonly IndexTabItem[];
  value: string;
  onChange: (key: string) => void;
  wrap?: boolean;
  /** 화면 여백 — 이만큼 바깥으로 내밀어 끝까지 스크롤한다(예전 화면 20, 새 화면 24) */
  bleed?: number;
}) {
  const m = useMsg();
  const row = items.map((it) => (
    <FilterWord
      key={it.key}
      M={M}
      label={it.label}
      dye={it.color}
      count={it.count}
      a11y={it.count != null ? m.core.labelCount({ label: it.label, n: it.count }) : it.label}
      on={it.key === value}
      onPress={() => onChange(it.key)}
    />
  ));

  if (wrap) {
    return (
      <View accessibilityRole={TABLIST_ROLE} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
        {row}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole={TABLIST_ROLE}
      style={{ marginHorizontal: -bleed, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: bleed, gap: 18 }}
    >
      {row}
    </ScrollView>
  );
}

// ── 줄·알림 ──────────────────────────────────────────────────────────────────

/**
 * 한 줄(설정 · 템플릿 목록) — 체크 칸 없는 줄(A.row): 제목(16/23) + 설명(13/18 ink2) + 오른쪽 값(13/18) 또는 꺾쇠.
 * 54 높이, 줄 사이에만 머리카락 선(x 0부터). 묶음 위 · 아래 선 없음. 누르는 동안 옅은 면.
 * right: 글자·숫자면 오른쪽 값(제목 줄에 맞춘다), 'chevron'이면 먹색 꺾쇠 16, 그 밖의 요소는 그대로.
 * sub: 글자면 설명 한 줄 모양으로, 요소면 그대로(두 줄짜리 설명 등).
 * checked: 체크 칸이 있는 줄(accessibilityRole 'checkbox')의 상태 — 화면 읽기가 '선택됨'을 함께 읽는다.
 * danger: 되돌리기 어려운 일 — 글씨는 그대로 먹(신호색을 쓰지 않는다). 확인 창은 부르는 쪽이 띄운다.
 */
export function LineRow({
  testID, M, title, sub, right, onPress, first = false, last: _last = false, danger: _danger = false,
  accessibilityLabel, accessibilityHint, accessibilityRole, accessibilityState, checked, titleLines = 2, pressRef,
}: {
  /** src/lib/testIds.ts의 이름 */
  testID?: string;
  M: M;
  title: string;
  sub?: React.ReactNode;
  right?: React.ReactNode | 'chevron';
  onPress?: () => void;
  first?: boolean;
  last?: boolean;
  danger?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  /** 체크 상태 — accessibilityState.checked의 줄임(둘 다 주면 합친다) */
  checked?: boolean;
  titleLines?: number;
  /** 누르는 줄의 ref — 이 줄이 연 시트가 닫힌 뒤 스크린리더 초점을 여기로 돌려준다(Sheet의 returnFocusRef) */
  pressRef?: React.Ref<View>;
}) {
  const a11yState =
    checked === undefined ? accessibilityState : { ...accessibilityState, checked };
  const rightNode =
    right === 'chevron' ? <Icon name="chevR" size={16} color={M.ink} />
    : typeof right === 'string' || typeof right === 'number' ? (
      <Text style={{ ...ROLE.rowRight, color: M.ink, maxWidth: '45%' }} numberOfLines={1}>
        {right}
      </Text>
    )
    : right ?? null;

  const content = (
    <>
      {!first && <RowDivider M={M} inset={0} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...ROLE.rowTitle, color: M.ink }} numberOfLines={titleLines}>
          {title}
        </Text>
        {typeof sub === 'string' ? (
          sub ? <Text style={{ ...ROLE.rowMeta, color: M.ink2 }}>{sub}</Text> : null
        ) : sub}
      </View>
      {rightNode}
    </>
  );

  const base: ViewStyle = {
    minHeight: GEO.row, flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 8,
  };

  if (!onPress) {
    return (
      <View style={base} testID={testID} accessible accessibilityLabel={accessibilityLabel} {...a11yLangProp()} accessibilityHint={accessibilityHint} accessibilityRole={accessibilityRole} accessibilityState={a11yState}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      ref={pressRef}
      onPress={onPress}
      testID={testID}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={a11yState}
      accessibilityLabel={accessibilityLabel}
      {...a11yLangProp()}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, pressed ? pressedRow(M) : null]}
    >
      {content}
    </Pressable>
  );
}

/**
 * 알림 한 장 — 옅은 면(tile, 모서리 12) 위에 제목 · 설명, 필요하면 조용한 글 동작 하나. 테두리 · 괘선 없음.
 * (저장 실패, 읽지 못한 기록 보관 같은 알림)
 */
export function RuledNotice({
  M, title, body, action,
}: {
  M: M;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
}) {
  return (
    <View style={{ backgroundColor: M.tile, borderRadius: GEO.rField, paddingHorizontal: 16, paddingTop: 14, paddingBottom: action ? 2 : 14 }}>
      <View accessible>
        <Text style={{ ...ROLE.rowTitle, fontFamily: PRETENDARD[600], color: M.ink }}>{title}</Text>
        {!!body && <Text style={{ ...ROLE.rowMeta, color: M.ink2, marginTop: 2 }}>{body}</Text>}
      </View>
      {action && (
        <QuietAction
          M={M}
          label={action.label}
          onPress={action.onPress}
          accessibilityLabel={action.accessibilityLabel}
          style={{ alignSelf: 'flex-start' }}
        />
      )}
    </View>
  );
}
