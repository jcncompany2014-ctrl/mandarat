import { Platform, useWindowDimensions as useRNWindowDimensions, type ScaledSize, type ViewStyle } from 'react-native';

// 화면 크기 — 웹 미리보기에서는 넓은 브라우저에서도 앱을 폰 한 장 폭으로 가운데에 세운다.
// 폭에 맞춰 크기를 정하는 화면(81칸 표·통계·편집 창…)은 react-native 대신 이 훅을 쓴다 — 그래야 틀 밖으로 넘치지 않는다.

/** 웹에서 앱이 그려지는 폭의 상한(pt) */
export const WEB_MAX_W = 480;

const WEB = Platform.OS === 'web';

/** useWindowDimensions와 같지만, 웹에서는 폭을 WEB_MAX_W로 묶는다(네이티브는 그대로) */
export function useWindowDimensions(): ScaledSize {
  const d = useRNWindowDimensions();
  return WEB && d.width > WEB_MAX_W ? { ...d, width: WEB_MAX_W } : d;
}

/** 웹 넓은 화면에서 폰 한 장 폭으로 가운데에 세우는 틀 스타일 — 네이티브에서는 null */
export const WEB_COLUMN: ViewStyle | null = WEB ? { flex: 1, width: '100%', maxWidth: WEB_MAX_W, alignSelf: 'center' } : null;

/** 시트처럼 아래에 붙는 판을 같은 폭으로 — 네이티브에서는 null */
export const WEB_PANEL: ViewStyle | null = WEB ? { width: '100%', maxWidth: WEB_MAX_W, alignSelf: 'center' } : null;
