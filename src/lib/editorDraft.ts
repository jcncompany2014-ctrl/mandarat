import type { KindConfig } from './kinds';

/**
 * 편집 창의 쓰던 글 — 앱이 뒤로 가는 순간(AppState 'background') 고친 내용이 있으면 한 벌 적어 두고,
 * 같은 칸을 다시 열 때 '이어서 쓰기'로 되살린다. 저장·버리기 때 지운다. 한 번에 한 칸만 둔다.
 * 저절로 저장하지 않는다 — 되살린 뒤에도 저장은 사람이 누른다.
 */
export const EDITOR_DRAFT_KEY = 'mandarat.editorDraft.v1';

export interface DraftNums {
  goal: string;
  unit: string;
  step: string;
  count: string;
}

export interface EditorDraft {
  /** 편집 대상 키 — 'c' · 't3' · 'a2-5' */
  key: string;
  text: string;
  cfg: KindConfig;
  nums: DraftNums;
  /**
   * 적어 둘 때 칸에 저장돼 있던 글 — 다시 열 때 저장된 글이 이것과 다르면(그 사이 칸을 비웠거나 예시·템플릿·백업으로
   * 문서를 바꿨으면) 이 글은 지난 칸의 것이라 권하지 않는다. 없으면(이전 판의 적어 둔 글) 따지지 않는다.
   */
  base?: string;
}

const KINDS = new Set(['once', 'habit', 'count', 'mind']);
const isStr = (v: unknown): v is string => typeof v === 'string';

export function serializeDraft(d: EditorDraft): string {
  return JSON.stringify({ key: d.key, text: d.text, cfg: d.cfg, nums: d.nums, base: d.base });
}

/** 저장된 글 → 쓰던 글(모양이 어긋나면 null). key를 주면 그 칸의 것일 때만 */
export function parseDraft(raw: string | null | undefined, key?: string): EditorDraft | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!isStr(o.key) || !isStr(o.text)) return null;
  if (key != null && o.key !== key) return null;
  const cfg = o.cfg as Record<string, unknown> | null;
  if (!cfg || typeof cfg !== 'object' || !KINDS.has(cfg.kind as string)) return null;
  const n = o.nums as Record<string, unknown> | null;
  if (!n || typeof n !== 'object' || !isStr(n.goal) || !isStr(n.unit) || !isStr(n.step) || !isStr(n.count)) return null;
  return {
    key: o.key,
    text: o.text,
    cfg: cfg as unknown as KindConfig,
    nums: { goal: n.goal, unit: n.unit, step: n.step, count: n.count },
    ...(isStr(o.base) ? { base: o.base } : {}),
  };
}

/** 지금 칸에 이어 쓸 글인가 — 적어 둘 때의 저장된 글(base)이 지금 저장된 글과 같을 때만(base가 없으면 그렇다고 본다) */
export function draftFits(d: EditorDraft, savedText: string): boolean {
  return d.base == null || d.base.trim() === savedText.trim();
}

/** 되살릴 만한가 — 지금 저장된 것과 글이나 설정이 다를 때만 */
export function draftDiffers(d: EditorDraft, savedText: string, savedCfg: KindConfig, same: (a: KindConfig, b: KindConfig) => boolean): boolean {
  return d.text.trim() !== savedText.trim() || !same(d.cfg, savedCfg);
}
