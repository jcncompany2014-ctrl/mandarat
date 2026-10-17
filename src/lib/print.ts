// 찍기 — Node(그리고 기본 파일): 찍을 곳이 없다. 늘 'failed'를 돌려주고 아무것도 하지 않는다.
// 웹은 print.web.ts(숨긴 iframe), 기기는 print.native.ts(expo-print). 세 쪽은 같은 이름 printer를 내보낸다.
import type { ExportPdfResult, PrintNowResult, Printer } from './printSheet';

export const printer = {
  printNow: async (_html: string, _size: { w: number; h: number }): Promise<PrintNowResult> => 'failed',
  exportPdf: async (_html: string, _size: { w: number; h: number }, _name: string): Promise<ExportPdfResult> => 'failed',
} satisfies Printer;
