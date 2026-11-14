// 'chart' 이름공간 — X-E가 채운다(docs/v2/plan.md 부록 B).
// 81칸(FullGrid) · 블록 크게 보기 · 만다라트 탭(GridScreen) · 영역 화면(Detail · areaPage) · 표 이미지(ChartPoster · ShareChart) · 작은 표(GridMark · ChartSketch).
import type { Namespace } from '../types';
import { josa } from './josa';

/** 고유어 서수 — '3번째'는 '삼번째'로 읽혀서(chartSpeech.ORDINAL과 같은 말) */
const ORD = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'];

export default {
  // ── 함께 쓰는 말 ──
  /** 이름을 아직 짓지 않은 영역 — '영역 3' */
  areaN: ({ n }: { n: number }) => `영역 ${n}`,
  /** 칠한 칸 · 8칸을 다 달성한 블록의 이름표 아래 */
  done: '달성',
  /** 빈 실천 칸 — '실천 3 채우기' */
  fillAction: ({ n }: { n: number }) => `실천 ${n} 채우기`,
  /** 화면 읽기의 말 사이 */
  sep: ', ',
  coreGoal: '핵심 목표',
  goalPrompt: '핵심 목표를 정해 주세요',
  /** '8개 영역 중 세 번째' */
  areaOrdinalSay: ({ n }: { n: number }) => `8개 영역 중 ${ORD[n - 1] ?? `${n}`} 번째`,
  editAreaName: '영역 이름 고치기',

  // ── 81칸(FullGrid) ──
  coreSay: ({ goal }: { goal: string }) => `핵심 목표, ${goal}`,
  coreUnsetSay: '핵심 목표를 아직 정하지 않았어요',
  centerBlockSay: '가운데 블록, 핵심 목표와 8개 영역',
  zoomCenterSay: '가운데 블록을 크게 봐요',
  zoomBlockSay: ({ name }: { name: string }) => `${name} 블록을 크게 봐요`,
  wholeSay: '81칸 전체를 봐요',
  doneOf64Say: ({ done }: { done: number }) => `64칸 중 ${done}칸 달성`,
  centerBlock: '가운데 블록',

  // ── 만다라트 탭(GridScreen) ──
  tabTitle: '만다라트',
  shareSay: '표 이미지로 공유',
  editGoal: '핵심 목표 고치기',
  next: '다음 할 일',
  /** 빈 칸이 남았을 때 — '빈 칸 12 · 건강부터 채우기' */
  nextBlanks: ({ n, area }: { n: number; area: string }) => `빈 칸 ${n} · ${area}부터 채우기`,
  nextStepSay: ({ title }: { title: string }) => `다음 할 일, ${title}`,
  nextStepAreaSay: ({ title, area }: { title: string; area: string }) => `다음 할 일, ${title}, ${area}`,
  /** 지도 위 줄 왼쪽 — '2026 만다라트' */
  formName: ({ y }: { y: number }) => `${y} 만다라트`,
  /** 처음(쓴 칸이 8칸 전) 지도 위 줄 오른쪽 — '쓴 칸 0/64' */
  writtenFolio: '쓴 칸',
  /** 지도 위 줄의 숫자 — '24/64칸' */
  of64: ({ n }: { n: number }) => `${n}/64칸`,
  writtenOf64Say: ({ n }: { n: number }) => `64칸 중 ${n}칸 썼어요`,
  /** 지도 아래 한 줄 */
  mapNote: '영역을 누르면 실천 여덟 칸이 보여요',
  /** 지도 블록의 화면 읽기 도움말 */
  mapBlockHint: '두 번 누르면 실천 여덟 칸을 봐요',
  /** 처음 — 먹 테두리 칸이 어디인지: '건강 · 1번 칸부터' */
  startFrom: ({ area, n }: { area: string; n: number }) => `${area} · ${n}번 칸부터`,
  startPrompt: ({ area }: { area: string }) => `${josa(area, '을/를')} 위해 무엇을 해 볼까요?`,
  startNote: '한 칸에 한 가지씩. 여덟 칸을 채우면 한 영역이 완성돼요.',
  startWrite: '직접 쓰기',
  /** 권하는 글 낱칸 — '주 3회 운동, 1번 칸에 쓰기' */
  suggestSay: ({ text, n }: { text: string; n: number }) => `${text}, ${n}번 칸에 쓰기`,
  /** 영역 화면 — 이번 주 습관 표 */
  habitWeek: '이번 주 습관',
  habitTimes: '횟수',
  /** 습관 표 아래 — 한 번 · 쌓기 · 마음가짐 칸 */
  otherActions: '그 밖의 실천',
  /** 영역 화면 머리의 ··· */
  areaMore: '이 영역 메뉴',

  // ── 영역 화면(Detail · areaPage) ──
  areaOf: ({ n }: { n: number }) => `영역 ${n} / 8`,
  /** '8칸 중 3칸 달성, 4일 연속' — days가 0이면 연속은 빼고 */
  areaDoneSay: ({ done, days }: { done: number; days: number }) => `8칸 중 ${done}칸 달성${days > 0 ? `, ${days}일 연속` : ''}`,
  emptyHint: '칸을 눌러 실천 8개를 채워요',
  prevAreaSay: ({ name }: { name: string }) => `이전 영역, ${name}`,
  nextAreaSay: ({ name }: { name: string }) => `다음 영역, ${name}`,
  undoDone: '달성 풀기',
  markDone: '달성으로 표시',
  rowHint: '자세히 봐요',
  /** 습관 줄 오른쪽 — '이번 주 2/3' */
  weekCount: ({ done, total }: { done: number; total: number }) => `이번 주 ${done}/${total}`,
  /** 마음가짐 줄 오른쪽 — '4점' */
  points: ({ n }: { n: number }) => `${n}점`,
  /** 넘긴 뒤 읽어 줄 말 — '건강, 8개 영역 중 첫 번째' */
  pageSay: ({ name, n }: { name: string; n: number }) => `${name}, 8개 영역 중 ${ORD[n - 1] ?? `${n}`} 번째`,

  // ── 표 이미지(ChartPoster · ShareChart) ──
  /** 표 이미지 머리의 날짜 — '2026. 10. 13.' (y 해 · m 달 · n 날) */
  posterDate: ({ y, m, n }: { y: number; m: number; n: number }) => `${y}. ${m}. ${n}.`,
  brand: '만다라트',
  shareTitle: '표 이미지',
  shareWebOnly: '앱에서 이미지로 공유할 수 있어요',
  previewBlankSay: '표 이미지 미리보기, 빈 표',
  previewSay: ({ done }: { done: number }) => `표 이미지 미리보기, 64칸 중 ${done}칸 달성`,
  modeProgress: '진행 표시',
  modeBlank: '빈 표',
  making: '이미지를 만드는 중이에요',
  makeFailed: '이미지를 만들지 못했어요',
  shareFailed: '공유하지 못했어요',
  saveShare: '이미지 저장·공유',

  // ── 작은 표(GridMark · ChartSketch) ──
  markSay: ({ done }: { done: number }) => `내 만다라트 81칸, 64칸 중 ${done}칸 달성`,
  /** markSay 뒤에 붙는 오늘 — ', 오늘 할 일 5개 중 2개 했어요' */
  markTodaySay: ({ total, done }: { total: number; done: number }) => `, 오늘 할 일 ${total}개 중 ${done}개 했어요`,
  sketchSay: ({ goal, areas }: { goal: string; areas: string }) => `만다라트 표, 가운데 칸 ${goal}, 영역 ${areas}`,
  sketchEmpty: '비어 있음',
} satisfies Namespace;
