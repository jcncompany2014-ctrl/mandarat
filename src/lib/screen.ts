import { createContext, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions as useRNWindowDimensions, type ModalProps, type ScaledSize, type ViewStyle } from 'react-native';

// 화면 크기 — 웹 미리보기에서는 넓은 브라우저에서도 앱을 폰 한 장 폭으로 가운데에 세운다.
// 아이패드(넓은 창)에서는 종이 한 단(최대 640pt)을 가운데에 세운다 — layoutFor가 창 크기로 고른다.
// 폭에 맞춰 크기를 정하는 화면(81칸 표·통계·편집 창…)은 react-native 대신 이 훅을 쓴다 — 그래야 틀 밖으로 넘치지 않는다.

/** 웹에서 앱이 그려지는 폭의 상한(pt) */
export const WEB_MAX_W = 480;
/** 넓은 창(아이패드)에서 종이 한 단의 폭 상한(pt) */
export const COLUMN_MAX_W = 640;
/** 시트처럼 아래에 붙는 판의 폭 상한(pt) — 창이 PANEL_MIN_WINDOW 이상일 때 가운데에 */
export const PANEL_MAX_W = 560;
/** 이보다 좁은 창은 폰 — 시트도 창 폭 그대로 */
export const PHONE_MAX_W = 600;
/** 이보다 넓고(그리고 높이가 PHONE_MAX_W 이상이면) 두 쪽 펼침(V5-A) */
export const SPREAD_MIN_W = 960;

const WEB = Platform.OS === 'web';

/** 웹 미리보기에서 `?layout=device`면 기기처럼 창 크기로 고른다(아이패드 모양 확인용) — 처음 한 번만 읽는다 */
const DEVICE_LAYOUT = WEB && typeof location !== 'undefined' && /(?:^\?|&)layout=device(?:&|$)/.test(location.search ?? '');

/** 전체 화면 Modal이 돌아갈 수 있는 네 방향 — 아이패드에서 창을 연 채 돌려도 닫히거나 갇히지 않게 */
export const MODAL_ORIENTATIONS: NonNullable<ModalProps['supportedOrientations']> = [
  'portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right',
];

export type LayoutKind = 'phone' | 'column' | 'spread';
/** kind와 한 단(쪽)의 폭 — spread는 V5-A가 두 쪽으로 펼치기 전까지 column처럼 한 단으로 그린다 */
export type Layout = { kind: LayoutKind; width: number };

/**
 * 창 크기 → 배치.
 * - 웹(`?layout=device` 아님): 폰 한 장 폭(480)
 * - 폭 < 600: 폰(창 폭 그대로)
 * - 폭 < 960 또는 높이 < 600: 한 단, min(폭, 640)
 * - 그 밖: 펼침(지금은 한 단 폭)
 */
export function layoutFor(w: number, h: number, { web = WEB, device = DEVICE_LAYOUT }: { web?: boolean; device?: boolean } = {}): Layout {
  if (web && !device) return { kind: 'phone', width: Math.min(w, WEB_MAX_W) };
  if (w < PHONE_MAX_W) return { kind: 'phone', width: w };
  const width = Math.min(w, COLUMN_MAX_W);
  if (w < SPREAD_MIN_W || h < PHONE_MAX_W) return { kind: 'column', width };
  return { kind: 'spread', width };
}

/** 지금 창의 배치 — 창 크기(분할 화면·스테이지 매니저·회전)가 바뀌면 다시 고른다 */
export function useLayout(): Layout {
  const { width, height } = useRNWindowDimensions();
  const { kind, width: w } = layoutFor(width, height);
  return useMemo(() => ({ kind, width: w }), [kind, w]);
}

/** 한 쪽(종이 한 단·시트 판)의 폭 — 이 안에서 useWindowDimensions()는 창이 아니라 쪽의 폭을 돌려준다 */
export const PageSize = createContext<{ width: number } | null>(null);

/** useWindowDimensions와 같지만, 쪽(PageSize) 안에서는 쪽의 폭을, 쪽 밖의 웹에서는 WEB_MAX_W로 묶은 폭을 */
export function useWindowDimensions(): ScaledSize {
  const d = useRNWindowDimensions();
  const page = useContext(PageSize);
  if (page) return page.width === d.width ? d : { ...d, width: page.width };
  return WEB && d.width > WEB_MAX_W ? { ...d, width: WEB_MAX_W } : d;
}

/**
 * 시트처럼 아래에 붙는 판의 폭 — min(560, 지금 단 폭)으로 가운데에.
 * 폰(창 폭 600 미만, 웹 아님)에서는 null — 판이 창 폭 그대로(예전과 같다).
 */
export function usePanelStyle(): ViewStyle | null {
  const layout = useLayout();
  const max = Math.min(PANEL_MAX_W, layout.width);
  return useMemo(
    () => (WEB || layout.kind !== 'phone' ? { width: '100%', maxWidth: max, alignSelf: 'center' } : null),
    [layout.kind, max],
  );
}

/** 웹 넓은 화면에서 폰 한 장 폭으로 가운데에 세우는 틀 스타일 — 네이티브에서는 null */
export const WEB_COLUMN: ViewStyle | null = WEB ? { flex: 1, width: '100%', maxWidth: WEB_MAX_W, alignSelf: 'center' } : null;

/** 시트처럼 아래에 붙는 판을 같은 폭으로 — 네이티브에서는 null (새 코드는 usePanelStyle) */
export const WEB_PANEL: ViewStyle | null = WEB ? { width: '100%', maxWidth: WEB_MAX_W, alignSelf: 'center' } : null;
