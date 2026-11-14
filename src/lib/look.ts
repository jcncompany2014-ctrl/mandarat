// 화면 모드(밝게 · 어둡게 · 자동) — 순수 모듈(docs/design/build-plan.md §2.4).
// 기기마다의 고르기다(언어처럼): 문서 · 백업 · iCloud에는 들어가지 않는다. 저장 키는 STORE_KEYS.look('mandarat:look:v1').
// 읽고 쓰기(AsyncStorage)는 src/theme/look.tsx가 맡는다.

export type Look = 'auto' | 'light' | 'dark';

export const LOOKS: readonly Look[] = ['auto', 'light', 'dark'];

/** 처음 쓰는 기기의 화면 모드 — 시스템을 따른다 */
export const DEFAULT_LOOK: Look = 'auto';

/** 저장된 글 → 화면 모드. 모르는 값 · 없음은 null(아직 정하지 않은 것) */
export function parseLook(raw: unknown): Look | null {
  return raw === 'auto' || raw === 'light' || raw === 'dark' ? raw : null;
}

/**
 * 이 판을 처음 여는 날, 동기화되는 예전 종이 무드(settings.mood)에서 화면 모드를 한 번 정한다.
 * - '다크' → dark
 * - '크림' · '화이트' · '파스텔'(사용자가 고른 밝은 종이) → light
 * - '연꽃'(기본값, 손대지 않음) · 그 밖 → auto
 * 그 뒤로는 저장된 화면 모드만 본다(무드는 더 읽지 않는다).
 */
export function lookFromMood(mood: unknown): Look {
  if (mood === '다크') return 'dark';
  if (mood === '크림' || mood === '화이트' || mood === '파스텔') return 'light';
  return 'auto';
}

/** 지금 어둡게 그리는가 — auto는 시스템(scheme)을 따른다 */
export function isDark(look: Look, scheme: string | null | undefined): boolean {
  return look === 'dark' || (look === 'auto' && scheme === 'dark');
}
