// 말 바꾸기(i18n) — 지금 언어를 하나 두고, msg()가 그 언어의 바구니를 돌려준다. 순수 모듈(React·RN 없음).
// 화면은 src/i18n/react.tsx의 useMsg(), 순수 모듈은 함수 안에서 msg()를 부른다(모듈 맨 위에서 부르지 않는다).
import ko from './ko';
import ja from './ja';
import en from './en';
import type { Lang, LangPref, Like } from './types';

export type { Lang, LangPref } from './types';

/** 바구니의 모양 — 한국어가 원본, 다른 언어는 같은 키·같은 매개변수 */
export type Messages = { readonly [N in keyof typeof ko]: Like<(typeof ko)[N]> };

const CATALOGS: Readonly<Record<Lang, Messages>> = { ko, ja, en };

export const LANGS: readonly Lang[] = ['ko', 'ja', 'en'];
/** 기기 언어에 ko·ja·en이 없을 때 */
export const FALLBACK: Lang = 'ko';
/**
 * 번역이 끝났는가 — 끝나기 전에는 'system'이 늘 한국어로 열린다(반쯤 한국어인 앱을 ja·en 기기에 보이지 않게).
 * 직접 고른 언어와 웹의 ?lang=은 그대로 따른다. V8-A가 이 한 줄만 true로 바꾼다.
 */
export const I18N_READY = false;

let current: Lang = FALLBACK;
const listeners = new Set<(l: Lang) => void>();

export function isLang(v: unknown): v is Lang {
  return v === 'ko' || v === 'ja' || v === 'en';
}

/** 지금 언어 */
export function lang(): Lang {
  return current;
}

/** 언어를 바꾸고 구독자에게 알린다(같으면 아무것도 하지 않는다) */
export function setLang(l: Lang): void {
  if (!isLang(l) || l === current) return;
  current = l;
  for (const cb of [...listeners]) cb(l);
}

/** 언어가 바뀔 때마다 — 돌려준 함수로 그만 듣는다 */
export function subscribeLang(cb: (l: Lang) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 그 언어의 바구니 — 기본은 지금 언어 */
export function msg(l: Lang = current): Messages {
  return CATALOGS[isLang(l) ? l : FALLBACK];
}

/** 웹 주소의 ?lang=ko|ja|en (없거나 모르는 값이면 null) */
export function langFromQuery(search: string | null | undefined): Lang | null {
  const m = /[?&]lang=([^&#]*)/.exec(search ?? '');
  const v = m ? decodeURIComponent(m[1]).toLowerCase() : null;
  return isLang(v) ? v : null;
}

/**
 * 쓸 언어 정하기.
 * 1) override(웹 ?lang=)가 있으면 그것 — 저장하지 않는다.
 * 2) 직접 고른 언어(ko·ja·en)면 그것.
 * 3) 'system'이면 기기 언어 목록(languageTag 'ja-JP' 또는 languageCode 'ja')을 차례로 보고 처음 나오는 ko·ja·en,
 *    없으면 FALLBACK. 단 auto(=I18N_READY)가 거짓이면 'system'은 늘 FALLBACK이다.
 */
export function resolveLang(pref: LangPref | null | undefined, locales: readonly (string | null | undefined)[], auto: boolean = I18N_READY, override?: Lang | null): Lang {
  if (override && isLang(override)) return override;
  if (isLang(pref)) return pref;
  if (!auto) return FALLBACK;
  for (const tag of locales) {
    const code = (tag ?? '').toLowerCase().split(/[-_]/)[0];
    if (isLang(code)) return code;
  }
  return FALLBACK;
}
