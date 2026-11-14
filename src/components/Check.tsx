import React, { memo } from 'react';
import { CheckBox, type CheckPaint } from './kit/CheckBox';
import { mix } from '../theme/moods';
import { DARK, LIGHT } from '../theme/tokens';
import { usePalette, type M } from '../theme/usePalette';

/**
 * 빈 체크 칸 모양의 테두리(점선 + 칸 · 빈 양식) — 토큰의 printEdge(밝게 3.35:1, 어둡게 3.94:1),
 * iOS '대비 증가'에서는 ink2(한 단계 진하게). 굵기 1.5(체크 칸과 같다).
 * 테두리를 그리는 화면이 useIncreaseContrast()의 값을 넘긴다.
 */
export function checkEdge(dark: boolean, more: boolean): { color: string; width: number } {
  const T = dark ? DARK : LIGHT;
  return { color: more ? T.ink2 : T.printEdge, width: 1.5 };
}

/** 했어요 칸의 칠 — 종이에 dye를 섞은 wash(밝게 34%, 어둡게 30%; tokens.css의 wash와 같은 비율) */
const WASH_MIX = { light: 0.34, dark: 0.3 } as const;

/**
 * 예전 Check의 color → 새 체크 칸의 모습.
 * - 먹(M.ink · M.btn): 설정 켬처럼 '고름' — 켜면 chosen(칸 안의 작은 먹 획).
 * - 토큰의 영역 색(M.dye · LIGHT.dye · DARK.dye): 그 영역 번호(area) — wash 칠 + dye 테두리.
 * - 그 밖의 색(예전 문서의 영역 색 #478058 …, 포인트 색): 그 색을 테두리로, 종이에 섞은 wash를 칠로(paint).
 * 웨이브 2–3에서 화면이 CheckBox에 영역 번호를 넘기면 이 갈래는 지운다.
 */
export function legacyCheck(M: M, color: string): { chosen: boolean; area?: number; paint?: CheckPaint } {
  if (color === M.ink || color === M.btn) return { chosen: true };
  const c = color.toLowerCase();
  const find = (list: readonly string[]) => list.findIndex((x) => x.toLowerCase() === c);
  const i = [find(M.dye), find(LIGHT.dye), find(DARK.dye)].find((k) => k >= 0);
  if (i !== undefined) return { chosen: false, area: i };
  return { chosen: false, paint: { fill: mix(M.paper, color, M.dark ? WASH_MIX.dark : WASH_MIX.light), edge: color } };
}

/**
 * 수첩 체크 칸 — 예전 이름 · 예전 속성 그대로, 그림은 새 체크 칸(kit/CheckBox).
 * - on: 했어요(영역 색이면 done) 또는 켬(먹이면 chosen). 끄면 빈 칸(open).
 * - size: 아무 크기나(기본 24). dark · seed · muted는 예전 호출과 맞추려고 받기만 한다
 *   (팔레트가 밝기를 알고, 펜 획은 기울이지 않고, 옅게 그리지 않는다 — 끝낸 줄은 제목의 먹선이 말한다).
 * 촉감(check/uncheck)과 화면 읽기 이름은 이 칸을 감싼 버튼이 맡는다(여기는 그림만).
 * 새 코드는 kit의 CheckBox를 쓴다.
 */
export const Check = memo(function Check({
  on, color, size = 24,
}: {
  on: boolean;
  color: string;
  dark: boolean;
  size?: number;
  /** 예전 손그림 기울기 키 — 받기만 한다 */
  seed?: string;
  /** 예전 '옅게' — 받기만 한다 */
  muted?: boolean;
}) {
  const M = usePalette();
  const look = legacyCheck(M, color);
  const state = !on ? 'open' : look.chosen ? 'chosen' : 'done';
  // CheckBox의 크기는 24 · 20 · 14로 적혀 있지만 그림은 아무 크기나 비례로 그린다 — 예전 호출(22 · 28)도 그대로
  return <CheckBox M={M} state={state} area={look.area} paint={look.paint} size={size as 24} />;
});
