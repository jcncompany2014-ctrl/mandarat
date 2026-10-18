// 인쇄 글꼴 — 기기: Pretendard 파일을 읽어 base64 data: 주소로 @font-face에 박아 넣는다.
// 인쇄 웹뷰는 앱 묶음의 파일을 읽지 못할 수 있어(baseURL이 다르다) 글꼴을 HTML 안에 싣는다. 한 번 만들면 메모리에 둔다.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { fontFaceCss, type PrintFonts } from './printSheet';

let pending: Promise<string> | null = null;

async function base64Of(mod: number): Promise<string> {
  const asset = await Asset.fromModule(mod).downloadAsync();
  if (!asset.localUri) throw new Error('font asset has no localUri');
  return new File(asset.localUri).base64();
}

async function build(): Promise<string> {
  const [medium, bold] = await Promise.all([
    base64Of(require('pretendard/dist/public/static/Pretendard-Medium.otf')),
    base64Of(require('pretendard/dist/public/static/Pretendard-Bold.otf')),
  ]);
  return fontFaceCss(`data:font/otf;base64,${medium}`, `data:font/otf;base64,${bold}`);
}

export const printFonts = {
  fontCss: () => {
    if (!pending) {
      pending = build().catch((e) => {
        // 글꼴 없이도 찍는다(기기 글꼴) — 다음에 다시 시도한다
        console.warn('[printFonts] font embed failed', e);
        pending = null;
        return '';
      });
    }
    return pending;
  },
} satisfies PrintFonts;
