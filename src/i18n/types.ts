// 말 바구니(카탈로그)의 모양 — 한국어가 원본이고, 일본어·영어는 같은 키를 같은 꼴로 갖는다(Like).

export type Lang = 'ko' | 'ja' | 'en';
/** 언어 고르기 — 'system'은 기기 언어를 따른다 */
export type LangPref = 'system' | Lang;

/** 말 한 줄 — 글자, 또는 값을 받아 글자를 돌려주는 함수 */
export type Leaf = string | ((p: never) => string);
/** 한 이름공간 — 키마다 말 한 줄 */
export type Namespace = Readonly<Record<string, Leaf>>;
/** 한국어 이름공간과 같은 키·같은 매개변수를 가진 다른 언어의 이름공간 */
export type Like<T extends Namespace> = { readonly [K in keyof T]: T[K] extends (p: infer P) => string ? (p: P) => string : string };
