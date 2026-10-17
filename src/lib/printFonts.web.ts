// 인쇄 글꼴 — 웹: 앱과 함께 내보낸 Pretendard 파일의 주소로 @font-face를 만든다(인쇄 iframe은 같은 출처라 그대로 읽는다).
import { Asset } from 'expo-asset';
import { fontFaceCss, type PrintFonts } from './printSheet';

let cached: string | null = null;

/** 자산 주소 → 절대 주소(srcdoc iframe 안에서도 같은 파일을 가리키게) */
function absolute(uri: string): string {
  try {
    return new URL(uri, window.location.href).href;
  } catch {
    return uri;
  }
}

export const printFonts = {
  fontCss: async () => {
    if (cached != null) return cached;
    try {
      const medium = Asset.fromModule(require('pretendard/dist/public/static/Pretendard-Medium.otf')).uri;
      const bold = Asset.fromModule(require('pretendard/dist/public/static/Pretendard-Bold.otf')).uri;
      cached = fontFaceCss(absolute(medium), absolute(bold));
    } catch (e) {
      console.warn('[printFonts] web font urls failed', e);
      return '';
    }
    return cached;
  },
} satisfies PrintFonts;
