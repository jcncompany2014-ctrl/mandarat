// 찍기 — 웹: 숨긴 <iframe srcdoc>에 HTML을 싣고, 다 읽히면 그 창의 print()를 부른다. 끝나면 iframe을 치운다.
// expo-print는 웹에서 부르지 않는다(지금 페이지 전체를 찍는다). PDF는 브라우저 인쇄 창의 'PDF로 저장'이 맡는다.
import { esc, type ExportPdfResult, type PrintNowResult, type Printer } from './printSheet';

/** 인쇄 창이 끝내 열리지 않을 때 기다리는 한도 */
const LOAD_TIMEOUT = 15000;

let busy = false;

function printInFrame(html: string): Promise<PrintNowResult> {
  if (typeof document === 'undefined') return Promise.resolve('failed');
  if (busy) return Promise.resolve('cancelled');
  busy = true;
  return new Promise<PrintNowResult>((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    // 화면 밖에 둔다(display:none이면 몇몇 브라우저가 인쇄하지 않는다)
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', opacity: '0', pointerEvents: 'none' });
    let done = false;
    const finish = (r: PrintNowResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      busy = false;
      // 인쇄 창이 닫힌 뒤에 치운다(print()는 창이 닫힐 때까지 멈추는 브라우저가 많다 — 아닌 곳을 위해 조금 기다린다)
      setTimeout(() => frame.remove(), 1000);
      resolve(r);
    };
    const timer = setTimeout(() => finish('failed'), LOAD_TIMEOUT);
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) return finish('failed');
      const go = () => {
        try {
          win.focus();
          win.print();
          finish('printed');
        } catch (e) {
          console.warn('[print] web print failed', e);
          finish('failed');
        }
      };
      // 글꼴을 다 읽은 뒤에 찍는다(먼저 찍으면 대체 글꼴로 나온다)
      const fonts = frame.contentDocument?.fonts;
      if (fonts?.ready) fonts.ready.then(go, go);
      else go();
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

export const printer = {
  printNow: (html: string, _size: { w: number; h: number }) => printInFrame(html),
  // 브라우저 인쇄 창에서 'PDF로 저장'을 고른다 — 저장할 파일 이름은 문서 제목을 따르므로 제목을 파일 이름으로 바꿔 둔다
  exportPdf: async (html: string, _size: { w: number; h: number }, name: string): Promise<ExportPdfResult> => {
    const titled = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(name.replace(/\.pdf$/i, ''))}</title>`);
    const r = await printInFrame(titled);
    return r === 'printed' ? 'shared' : r;
  },
} satisfies Printer;
