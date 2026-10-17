// 'year' 이름공간 — V1-D · V2-E · V3-D · V4-B가 채운다(docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';

export default {
  // V1-D — 백업 불러오기 장부의 지난 표 줄
  /** 장부 줄 이름 */
  ledgerArchives: '지난 표',
  /** '3장' */
  archiveCount: ({ n }: { n: number }) => `${n}장`,
} satisfies Namespace;
