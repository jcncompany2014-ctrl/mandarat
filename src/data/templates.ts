import type { Action, Theme } from '../types';
import { PILLAR_COLORS } from '../theme/palette';

// 8 슬롯 색 팔레트 (THEME_SEEDS와 동일한 연꽃 팔레트)
const COLORS = PILLAR_COLORS;

export interface Template {
  id: string;
  name: string;
  desc: string;
  centerGoal: string;
  areas: { title: string; icon: Theme['icon'] }[]; // length 8
}

/** 목적별 사전 구성 만다라트. 8영역의 제목·아이콘만 채우고 실천은 비워 둔다. */
export const TEMPLATES: Template[] = [
  {
    id: 'balance', name: '균형 잡힌 삶', desc: '몸·마음·관계·일의 균형', centerGoal: '일과 삶 균형 맞추기',
    areas: [
      { title: '건강', icon: 'heart' }, { title: '커리어', icon: 'briefcase' }, { title: '배움', icon: 'book' },
      { title: '관계', icon: 'people' }, { title: '재정', icon: 'coin' }, { title: '취미', icon: 'palette' },
      { title: '마음', icon: 'lotus' }, { title: '도전', icon: 'compass' },
    ],
  },
  {
    id: 'health', name: '건강한 몸과 마음', desc: '운동·식습관·수면·멘탈 중심', centerGoal: '체력 키우고 푹 자기',
    areas: [
      { title: '운동', icon: 'heart' }, { title: '식습관', icon: 'repeat' }, { title: '수면', icon: 'lotus' },
      { title: '마음챙김', icon: 'compass' }, { title: '활력', icon: 'target' }, { title: '자세·체형', icon: 'target' },
      { title: '휴식', icon: 'palette' }, { title: '건강관리', icon: 'book' },
    ],
  },
  {
    id: 'career', name: '커리어 성장', desc: '전문성·네트워크·성과 중심', centerGoal: '연봉 한 단계 올리기',
    areas: [
      { title: '전문성', icon: 'book' }, { title: '네트워크', icon: 'people' }, { title: '성과', icon: 'target' },
      { title: '부업', icon: 'briefcase' }, { title: '학습', icon: 'pencil' }, { title: '포트폴리오', icon: 'palette' },
      { title: '건강', icon: 'heart' }, { title: '재정', icon: 'coin' },
    ],
  },
  {
    id: 'learn', name: '배움과 성장', desc: '독서·강의·언어·기록', centerGoal: '매일 30분 공부하기',
    areas: [
      { title: '독서', icon: 'book' }, { title: '강의', icon: 'calendar' }, { title: '언어', icon: 'people' },
      { title: '글쓰기', icon: 'pencil' }, { title: '복습', icon: 'compass' }, { title: '자격증', icon: 'target' },
      { title: '습관', icon: 'repeat' }, { title: '회고', icon: 'lotus' },
    ],
  },
];

function emptyActions(): Action[] {
  return Array.from({ length: 8 }, () => ({ text: '', note: '', done: false }));
}

export function templateThemes(t: Template): Theme[] {
  return t.areas.map((a, i) => ({
    title: a.title,
    icon: a.icon,
    color: COLORS[i % COLORS.length],
    actions: emptyActions(),
  }));
}
