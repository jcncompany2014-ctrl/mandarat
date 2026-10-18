// 언어를 바꿀 때 기본 글만 새 언어로 — 순수 모듈(docs/v2/plan.md X-I).
// 바꾸는 것: 아직 그 자리의 기본 영역 이름 그대로인 영역 이름, 아직 예시 글 그대로인 예시 칸, 예시 목표 그대로인 핵심 목표.
// 견주는 것은 '바꾸기 전 언어'의 기본 글과 글자 하나까지 같은지(같은 자리끼리)뿐 — 한 글자라도 고쳤으면 그대로 둔다.
// 메모 · 직접 추가한 할 일 · 지난 표 · 기록은 건드리지 않는다.
import type { Action, MandaratDoc, Theme } from '../types';
import { sampleCell, sampleGoal, seedTitles } from '../data/defaults';
import type { Lang } from '../i18n';

/**
 * 예시 칸 하나 — 글이 바꾸기 전 언어의 예시 글 그대로일 때만 새 언어로.
 * 쌓기 칸의 단위는 예시 단위 그대로일 때만, 목표 수는 언어마다 다른 칸(비상금)에서
 * 목표가 예시 그대로이고 더한 기록(log)이 없으며 지금 수도 예시 그대로(또는 0)일 때만 바꾼다.
 */
function relocalizeAction(a: Action, ti: number, ai: number, from: Lang, to: Lang): Action {
  const old = sampleCell(ti, ai, from);
  const next = sampleCell(ti, ai, to);
  if (!old || !next || !old.text || a.text !== old.text) return a;
  const out: Action = { ...a, text: next.text };
  if (a.kind === 'count') {
    if (old.unit && a.unit === old.unit && next.unit) out.unit = next.unit;
    const sameGoal = old.goal !== undefined && next.goal !== undefined && a.goal === old.goal;
    if (sameGoal && old.goal !== next.goal && !a.log && (a.count === old.count || !a.count)) {
      out.goal = next.goal;
      out.count = a.count === old.count ? next.count ?? 0 : 0;
    }
  }
  return out;
}

/** 8영역 — 바뀐 것이 없으면 같은 배열을 돌려준다 */
export function relocalizeThemes(themes: Theme[], from: Lang, to: Lang): Theme[] {
  if (from === to) return themes;
  const oldTitles = seedTitles(from);
  const newTitles = seedTitles(to);
  let changed = false;
  const out = themes.map((t, ti) => {
    const title = oldTitles[ti] !== undefined && t.title === oldTitles[ti] ? newTitles[ti] : t.title;
    let actionsChanged = false;
    const actions = t.actions.map((a, ai) => {
      const b = relocalizeAction(a, ti, ai, from, to);
      if (b !== a) actionsChanged = true;
      return b;
    });
    if (title === t.title && !actionsChanged) return t;
    changed = true;
    return { ...t, title, actions: actionsChanged ? actions : t.actions };
  });
  return changed ? out : themes;
}

/** 문서 — 영역 · 예시 칸 · 예시 목표. 바뀐 것이 없으면 같은 문서를 돌려준다 */
export function relocalizeDoc(d: MandaratDoc, from: Lang, to: Lang): MandaratDoc {
  if (from === to) return d;
  const themes = relocalizeThemes(d.themes, from, to);
  const centerGoal = d.centerGoal !== '' && d.centerGoal === sampleGoal(from) ? sampleGoal(to) : d.centerGoal;
  if (themes === d.themes && centerGoal === d.centerGoal) return d;
  return { ...d, themes, centerGoal };
}
