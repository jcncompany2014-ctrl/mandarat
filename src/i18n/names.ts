// 언어 이름 — 저마다 제 글자로 적는다(고르는 사람이 자기 말을 알아보게). 한글 검사에서 빠지는 파일.
import type { Lang } from './types';

export const LANG_NAMES: Readonly<Record<Lang, string>> = { ko: '한국어', ja: '日本語', en: 'English' };
