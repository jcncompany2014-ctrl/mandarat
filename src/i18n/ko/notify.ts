// 'notify' 이름공간 — V1-A(알림 글) · V2-A(설정 화면 글)가 채운다(docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';

export default {
  /** 안드로이드 알림 채널 이름(기기 설정에 보인다) */
  channel: '할 일 알림',
  /** 알림 본문에서 할 일을 잇는 구분자 */
  sep: ' · ',
  /** 남은 수 — '외 3개' */
  more: ({ n }: { n: number }) => `외 ${n}개`,
  /** 아침: '오늘 할 일 5개' */
  amTitle: ({ n }: { n: number }) => `오늘 할 일 ${n}개`,
  /** 저녁: '오늘 남은 일 2개' */
  pmTitle: ({ n }: { n: number }) => `오늘 남은 일 ${n}개`,
  /** 습관 하나: 본문 '건강 · 오늘 할 습관이에요'(영역 이름이 없으면 뒤만) */
  habitBody: ({ area }: { area: string }) => (area ? `${area} · 오늘 할 습관이에요` : '오늘 할 습관이에요'),
  /** 같은 시각 습관 여럿: '습관 3개' */
  habitsTitle: ({ n }: { n: number }) => `습관 ${n}개`,
  /** 한 주 돌아보기 */
  reviewTitle: '한 주 돌아보기',
  /** '10월 12일 – 18일 · 3분이면 돼요' — range는 fmt.range로 만든 글 */
  reviewBody: ({ range }: { range: string }) => `${range} · 3분이면 돼요`,

  // ── 설정 › 알림 · 편집 창 알림 줄(V2-A) ──
  /** 구역 제목 · 편집 창의 줄 이름 */
  sectionTitle: '알림',
  morning: '아침에 오늘 할 일',
  /** '매일 오전 8:00 · 할 일이 있는 날만' — time은 fmt.time으로 만든 글 */
  morningSub: ({ time }: { time: string }) => `매일 ${time} · 할 일이 있는 날만`,
  evening: '저녁에 남은 일',
  eveningSub: ({ time }: { time: string }) => `${time} · 남은 일이 있는 날만`,
  /** '일요일 오후 6:00' — dow는 fmt.dowLong */
  reviewSub: ({ dow, time }: { dow: string; time: string }) => `${dow} ${time}`,
  habitNote: '습관마다 알림 시각은 실천을 고치는 화면에서 정해요',
  /** 이 기기는 아직 받지 않을 때 */
  deviceAlso: '이 기기에서도 알림 받기',
  /** 이 기기에서 받고 있을 때(끌 수 있다) */
  device: '이 기기에서 알림 받기',
  denied: '이 기기에서는 알림이 꺼져 있어요',
  deniedBody: '기기 설정에서 알림을 켜면 울려요',
  undetermined: '이 기기에서는 알림을 아직 허락하지 않았어요',
  allow: '알림 허락하기',
  /** 시각 고르기(10분씩) */
  earlier: '10분 앞당기기',
  later: '10분 늦추기',
  morningTime: '아침 알림 시각',
  eveningTime: '저녁 알림 시각',
  habitTime: '습관 알림 시각',
  /** 편집 창(습관) — 고르기 두 줄 */
  editorNone: '없음',
  editorPick: '시각 정하기',
  editorNoneA11y: '알림 없음',
  editorPickA11y: '알림 시각 정하기',
  habitHint: '이 습관을 하는 날에만 울려요',
} satisfies Namespace;
