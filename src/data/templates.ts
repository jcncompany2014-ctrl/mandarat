import type { Action, Theme } from '../types';
import { PILLAR_COLORS } from '../theme/palette';
import { lang, msg, type Lang } from '../i18n';
import { liveList } from '../i18n/live';

// 8 슬롯 색 팔레트 (THEME_SEEDS와 동일한 연꽃 팔레트)
const COLORS = PILLAR_COLORS;

export interface Template {
  id: string;
  name: string;
  desc: string;
  centerGoal: string;
  areas: { title: string; icon: Theme['icon'] }[]; // length 8
}

type TemplateId = 'balance' | 'health' | 'career' | 'learn';
type AreaNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** 템플릿의 뼈대 — 고정 id와 영역 아이콘. 글(이름 · 설명 · 목표 · 영역 이름)은 content 바구니에서 언어별로 */
const SHAPES: readonly { id: TemplateId; icons: Theme['icon'][] }[] = [
  { id: 'balance', icons: ['heart', 'briefcase', 'book', 'people', 'coin', 'palette', 'lotus', 'compass'] },
  { id: 'health', icons: ['heart', 'repeat', 'lotus', 'compass', 'target', 'target', 'palette', 'book'] },
  { id: 'career', icons: ['book', 'people', 'target', 'briefcase', 'pencil', 'palette', 'heart', 'coin'] },
  { id: 'learn', icons: ['book', 'calendar', 'people', 'pencil', 'compass', 'target', 'repeat', 'lotus'] },
];

/** 목적별 사전 구성 만다라트(l: 기본은 지금 언어). 8영역의 제목·아이콘만 채우고 실천은 비워 둔다. */
export function templates(l: Lang = lang()): Template[] {
  const c = msg(l).content;
  return SHAPES.map(({ id, icons }) => ({
    id,
    name: c[`${id}Name`],
    desc: c[`${id}Desc`],
    centerGoal: c[`${id}Goal`],
    areas: icons.map((icon, i) => ({ title: c[`${id}Area${(i + 1) as AreaNo}`], icon })),
  }));
}

/** @deprecated templates()를 쓴다 — 읽을 때마다 지금 언어로 보이는 보기(V8-A가 쓰는 곳이 없어지면 지운다) */
export const TEMPLATES: readonly Template[] = liveList(() => templates());

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
