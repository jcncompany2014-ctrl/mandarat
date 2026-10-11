// 백업 내보내기/불러오기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// 형식: { app: 'mandarat', schema: 1, exportedAt, doc } 를 JSON 한 덩어리로.
// 불러올 때는 앞뒤에 다른 글이 붙어 있어도(메신저로 보낸 경우 등) 첫 '{' ~ 마지막 '}'만 읽고,
// migrate()로 모든 필드를 검증해 손상된 값은 안전한 기본값으로 바꾼다.
import type { MandaratDoc } from '../types';
import { migrate } from '../data/defaults';
import { ymd } from './routine';

export const BACKUP_APP = 'mandarat';
export const BACKUP_SCHEMA = 1;

export interface BackupSummary {
  goal: string;
  /** 글자가 적힌 실천 칸 수 (0~64) */
  filled: number;
  /** 달성한 칸 수 (0~64) */
  done: number;
  /** 실천 기록이 있는 날 수 */
  days: number;
  /** 반복 요일이 있는 실천 수 */
  routines: number;
  /** 백업을 만든 시각 (ISO) — 백업 형식으로 감싼 경우에만 */
  exportedAt?: string;
}

export type ParseResult =
  | { ok: true; doc: MandaratDoc; summary: BackupSummary }
  | { ok: false; error: string };

export function makeBackup(doc: MandaratDoc, now = new Date(), pretty = false): string {
  const data = { app: BACKUP_APP, schema: BACKUP_SCHEMA, exportedAt: now.toISOString(), doc };
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

export function backupFileName(now = new Date()): string {
  return `mandarat-backup-${ymd(now)}.json`;
}

export function summarize(doc: MandaratDoc): BackupSummary {
  let filled = 0;
  let done = 0;
  let routines = 0;
  for (const t of doc.themes) {
    for (const a of t.actions) {
      if (a.text.trim()) filled++;
      if (a.done) done++;
      if (a.days && a.days.length > 0) routines++;
    }
  }
  const days = Object.values(doc.dayLog).filter((l) => l.length > 0).length;
  return { goal: doc.centerGoal.trim(), filled, done, days, routines };
}

const MAX_TRIES = 200;

/** 만다라트 백업(감싼 형식) 또는 문서 자체로 보이는 객체인가 */
function looksOurs(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return r.app === BACKUP_APP || Array.isArray(r.themes);
}

/**
 * 붙여넣은 글에서 백업 JSON을 찾는다. 앞뒤에 {중괄호}가 섞인 글이 붙어 있어도 되도록
 * '{"app"' 위치를 먼저, 그다음 각 '{'에서 시작해 뒤쪽 '}'부터 차례로 맞춰 본다.
 */
function extractBackup(t: string): { found?: Record<string, unknown>; parsedAny: boolean } {
  const starts: number[] = [];
  const anchor = t.search(/\{\s*"app"\s*:/);
  if (anchor >= 0) starts.push(anchor);
  for (let i = t.indexOf('{'); i >= 0 && starts.length < 24; i = t.indexOf('{', i + 1)) if (i !== anchor) starts.push(i);
  const ends: number[] = [];
  for (let j = t.lastIndexOf('}'); j >= 0 && ends.length < 24; j = t.lastIndexOf('}', j - 1)) ends.push(j);
  let tries = 0;
  let parsedAny = false;
  for (const s of starts) {
    for (const e of ends) {
      if (e <= s || tries++ >= MAX_TRIES) break;
      try {
        const v: unknown = JSON.parse(t.slice(s, e + 1));
        parsedAny = true;
        if (looksOurs(v)) return { found: v, parsedAny };
      } catch {
        /* 다음 후보 */
      }
    }
  }
  return { parsedAny };
}

export function parseBackup(text: string): ParseResult {
  const t = text.trim();
  if (!t) return { ok: false, error: '붙여넣은 내용이 없어요' };
  if (t.indexOf('{') < 0) {
    return { ok: false, error: '백업 내용을 찾지 못했어요. 내보낸 글 전체를 붙여넣어 주세요' };
  }
  const { found, parsedAny } = extractBackup(t);
  if (!found) {
    // 우리 백업의 흔적이 있는데 읽지 못했다면 잘린 것 — 아니면 다른 형식
    const ours = /"app"\s*:\s*"mandarat"|"themes"\s*:/.test(t);
    return ours || !parsedAny
      ? { ok: false, error: '백업 내용이 잘렸거나 손상됐어요. 처음부터 끝까지 다시 복사해 주세요' }
      : { ok: false, error: '만다라트 백업 형식이 아니에요' };
  }
  const r = found;
  const wrapped = r.app === BACKUP_APP;
  if (wrapped && typeof r.schema === 'number' && r.schema > BACKUP_SCHEMA) {
    return { ok: false, error: '더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 불러와 주세요' };
  }
  const candidate = wrapped ? r.doc : r;
  if (!candidate || typeof candidate !== 'object' || !Array.isArray((candidate as { themes?: unknown }).themes)) {
    return { ok: false, error: '만다라트 백업 형식이 아니에요' };
  }
  // 불러온 문서는 이미 시작한 사용자의 것이므로 온보딩을 다시 띄우지 않는다
  const doc: MandaratDoc = { ...migrate(candidate), onboarded: true };
  const exportedAt = wrapped && typeof r.exportedAt === 'string' ? r.exportedAt : undefined;
  return { ok: true, doc, summary: { ...summarize(doc), ...(exportedAt ? { exportedAt } : {}) } };
}
