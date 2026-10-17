// 'paper' 이름공간 — V4-C(docs/v2/plan.md 부록 B). 설정 › 보기 › 종이 무늬.
import type { Namespace } from '../types';

export default {
  head: '종이 무늬',
  dots: '점 (기본)',
  grid: '모눈',
  lines: '줄',
  blank: '무지',
  pro: '프로',
  /** 저장된 프로 무늬 — 프로가 없어 점으로 그리는 중 */
  keptNote: '프로를 열면 이 무늬로 그려져요',
  /** 읽어 주는 말 — '종이 무늬 모눈' */
  say: ({ name }: { name: string }) => `종이 무늬 ${name}`,
  /** 잠긴 무늬 — '종이 무늬 모눈, 프로' */
  sayLocked: ({ name }: { name: string }) => `종이 무늬 ${name}, 프로`,
  lockedHint: '프로 안내를 열어요',
} satisfies Namespace;
