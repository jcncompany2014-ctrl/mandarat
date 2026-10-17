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
  // ── 인쇄 시트(V2-D) ──
  sheetHead: '인쇄용 PDF',
  paperHead: '종이 크기',
  paperA4: 'A4',
  paperLetter: '레터',
  paperA3: 'A3',
  paperA5: 'A5',
  paperB5: 'B5',
  /** 종이 크기 줄의 설명 — '210 × 297 mm' */
  paperMm: ({ w, h }: { w: number; h: number }) => `${w} × ${h} mm`,
  /** 잠긴 선택의 오른쪽 글씨 */
  pro: '프로',
  /** 잠긴 줄의 화면 읽기 이름 — 'A3, 297 × 420 mm, 프로 기능' */
  lockedSay: ({ name }: { name: string }) => `${name}, 프로 기능`,
  /** 잠긴 줄의 화면 읽기 도움말 — 누르면 시트가 닫히고 프로 안내가 열린다 */
  lockedHint: '누르면 프로 안내가 열려요',
  layoutHead: '구성',
  layoutChart: '표 한 장',
  layoutAreas: '표지 + 영역별 8쪽',
  blank: '빈 표로',
  blankSub: '손으로 채워 쓰게 실천 칸을 비워요',
  /** 고른 것 한 줄 — 'A4 · 1쪽' */
  summary: ({ paper, n }: { paper: string; n: number }) => `${paper} · ${n}쪽`,
  printGo: '인쇄하기',
  exportPdf: 'PDF로 내보내기',
  /** 웹·안드로이드 — 따로 내보내기 버튼이 없다 */
  webNote: '인쇄 창에서 PDF로 저장할 수 있어요',
  busy: 'PDF를 만드는 중이에요',
  failed: 'PDF를 만들지 못했어요',
  /** 표 이미지 시트 아래 글자 링크 */
  shareLink: '인쇄용 PDF ›',
  shareLinkSay: '인쇄용 PDF',
} satisfies Namespace;
