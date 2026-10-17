// 인쇄 글꼴 — Node(그리고 기본 파일): 글꼴 CSS가 없다(인쇄 HTML은 기기 글꼴로 찍힌다).
// 웹은 printFonts.web.ts(글꼴 파일 주소), 기기는 printFonts.native.ts(base64로 박아 넣는다). 세 쪽은 같은 이름 printFonts를 내보낸다.
import type { PrintFonts } from './printSheet';

export const printFonts = {
  fontCss: async () => '',
} satisfies PrintFonts;
