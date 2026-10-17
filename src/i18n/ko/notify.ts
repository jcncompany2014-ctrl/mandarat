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
} satisfies Namespace;
