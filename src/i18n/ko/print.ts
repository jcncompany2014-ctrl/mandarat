// 'print' 이름공간 — V1-B(인쇄용 HTML의 글) · V2-D(인쇄 시트)가 채운다(docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';

export default {
  /** 인쇄물 머리말 · 문서 제목 */
  sheetTitle: '목표 달성표',
  /** 표지 머리말(표지 + 영역별 8쪽) */
  coverTitle: '영역 한눈에',
  /** 표 아래 — '64칸 중 12칸 달성' */
  achieved: ({ done, total }: { done: number; total: number }) => `${total}칸 중 ${done}칸 달성`,
  /** 이름을 아직 짓지 않은 영역 — '영역 3' */
  areaN: ({ n }: { n: number }) => `영역 ${n}`,
  /** 영역 쪽 머리말 — '영역 3 / 8' */
  areaOf: ({ n, total }: { n: number; total: number }) => `영역 ${n} / ${total}`,
  /** 8칸을 다 달성한 블록의 이름표 아래 */
  finished: '달성',
  memo: '메모',
  /** 영역 쪽 표의 열 머리 */
  colAction: '실천',
  colKind: '유형',
  colTally: '한 달 기록',
  /** 실천 유형 — kinds.ts의 KIND_LABEL과 같은 말 */
  kindOnce: '한 번',
  kindHabit: '습관',
  kindCount: '쌓기',
  kindMind: '마음가짐',
  /** 꼬리말의 앱 이름 */
  appName: '만다라트',
} satisfies Namespace;
