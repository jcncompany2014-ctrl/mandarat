// 찍기 — 기기: expo-print. iOS는 AirPrint 창, PDF는 파일로 만들어 이름을 바꾼 뒤 공유 시트로 건넨다.
// 안드로이드의 PDF는 인쇄 창의 'PDF로 저장'이 맡는다. expo-print는 인쇄를 겹쳐 부르면 던지므로 한 번에 하나씩 줄 세운다.
import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import type { ExportPdfResult, PrintNowResult, Printer } from './printSheet';

type Size = { w: number; h: number };

/** 사용자가 인쇄 창을 닫았다 — iOS PrintIncompleteException('ERR_PRINT_INCOMPLETE'), 안드로이드는 취소 문구 */
function isCancel(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  const text = `${code ?? ''} ${(e as { message?: unknown } | null)?.message ?? ''}`;
  return /PRINT_INCOMPLETE|did not complete|cancel/i.test(text);
}

/** 종이 크기 — 안드로이드는 정수만 받는다 */
function dims(size: Size): { width: number; height: number } {
  return Platform.OS === 'android' ? { width: Math.round(size.w), height: Math.round(size.h) } : { width: size.w, height: size.h };
}

let queue: Promise<unknown> = Promise.resolve();

/** 앞의 인쇄가 끝난 뒤에 fn을 부른다 */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function printOnce(html: string, size: Size): Promise<PrintNowResult> {
  try {
    await Print.printAsync({ html, ...dims(size) });
    return 'printed';
  } catch (e) {
    if (isCancel(e)) return 'cancelled';
    console.warn('[print] printAsync failed', e);
    return 'failed';
  }
}

async function exportOnce(html: string, size: Size, name: string): Promise<ExportPdfResult> {
  // 안드로이드 — 시스템 인쇄 창이 'PDF로 저장'을 고를 수 있다
  if (Platform.OS !== 'ios') {
    const r = await printOnce(html, size);
    return r === 'printed' ? 'shared' : r;
  }
  let uri: string;
  try {
    const out = await Print.printToFileAsync({ html, ...dims(size) });
    const made = new File(out.uri);
    const dest = new File(Paths.cache, name);
    await made.move(dest, { overwrite: true });
    uri = dest.uri;
  } catch (e) {
    console.warn('[print] printToFileAsync failed', e);
    return 'failed';
  }
  try {
    const r = await Share.share({ url: uri, title: name });
    return r.action === Share.sharedAction ? 'shared' : 'cancelled';
  } catch (e) {
    console.warn('[print] share failed', e);
    return 'failed';
  }
}

export const printer = {
  printNow: (html: string, size: Size) => serial(() => printOnce(html, size)),
  exportPdf: (html: string, size: Size, name: string) => serial(() => exportOnce(html, size, name)),
} satisfies Printer;
