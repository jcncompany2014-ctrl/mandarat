// 백업 내보내기/불러오기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// 형식: { app: 'mandarat', schema: BACKUP_SCHEMA, exportedAt, doc } 를 JSON 한 덩어리로.
// 불러올 때는 앞뒤에 다른 글이 붙어 있어도(메신저로 보낸 경우 등) 첫 '{' ~ 마지막 '}'만 읽고,
// migrate()로 모든 필드를 검증해 손상된 값은 안전한 기본값으로 바꾼다.
import type { MandaratDoc } from '../types';
import { migrate } from '../data/defaults';
import { isRoutine, ymd } from './routine';

export const BACKUP_APP = 'mandarat';
// 2: 실천 유형 값(kind·count·log·ratings·due …)이 생긴 문서 — 이전 앱은 '새 버전 백업'으로 알아보고 값을 조용히 잃지 않는다
// 3: 한 주 돌아보기(reviews)·영역을 정했는지(areasSet)·마지막 백업 날(settings.lastBackupAt)이 생긴 문서.
//    이전 앱은 더 새로운 백업을 거절한다(불러오면 이 값들을 조용히 잃으므로).
export const BACKUP_SCHEMA = 3;

export interface BackupSummary {
  goal: string;
  /** 글자가 적힌 실천 칸 수 (0~64) */
  filled: number;
  /** 달성한 칸 수 (0~64) */
  done: number;
  /** 실천 기록이 있는 날 수 */
  days: number;
  /** 습관(요일·주 N회) 실천 수 */
  routines: number;
  /** 백업을 만든 시각 (ISO) — 백업 형식으로 감싼 경우에만 */
  exportedAt?: string;
  /** 마지막 실천 기록이 있는 날 'YYYY-MM-DD' — 기록이 없으면 없다 */
  lastLog?: string;
}

export type ParseResult =
  | { ok: true; doc: MandaratDoc; summary: BackupSummary }
  | { ok: false; error: string };

export function makeBackup(doc: MandaratDoc, now = new Date(), pretty = false): string {
  const data = { app: BACKUP_APP, schema: BACKUP_SCHEMA, exportedAt: now.toISOString(), doc };
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * 백업 파일 이름 'mandarat-backup-YYYY-MM-DD.json' — 한글 이름 대신 일부러 영문·숫자만 쓴다.
 * 파일 앱·메일·메신저·PC로 옮길 때 한글 파일 이름이 깨지거나(NFD/NFC 차이, 첨부 이름 인코딩)
 * 다시 찾기 어려워지는 일을 피하려는 것이다(ErrorBoundary의 비상 백업도 같은 이름).
 */
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
      if (a.text.trim() && isRoutine(a)) routines++;
    }
  }
  let days = 0;
  let lastLog: string | undefined;
  for (const [day, list] of Object.entries(doc.dayLog)) {
    if (list.length === 0) continue;
    days++;
    if (!lastLog || day > lastLog) lastLog = day;
  }
  return { goal: doc.centerGoal.trim(), filled, done, days, routines, ...(lastLog ? { lastLog } : {}) };
}

const MAX_STEPS = 2_000_000; // 글자 훑기 상한 — 아주 긴·이상한 입력에도 멈추지 않게
const MAX_CANDIDATES = 40;

/** 만다라트 백업(감싼 형식) 또는 문서 자체로 보이는 객체인가 */
function looksOurs(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return r.app === BACKUP_APP || Array.isArray(r.themes);
}

/**
 * 글에서 바깥쪽 {…} 덩어리를 찾는다(문자열 안의 괄호는 무시). 끝까지 닫히지 않는 덩어리는
 * 그 안쪽에서 다시 찾아, 겉 포장이 잘려도 안쪽 문서를 살릴 수 있게 한다.
 */
function blocks(t: string): { spans: [number, number][]; unclosed: boolean } {
  const spans: [number, number][] = [];
  let unclosed = false;
  let steps = 0;
  let i = t.indexOf('{');
  while (i >= 0 && spans.length < MAX_CANDIDATES && steps < MAX_STEPS) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let j = i; j < t.length && steps < MAX_STEPS; j++, steps++) {
      const c = t[j];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        end = j;
        break;
      }
    }
    if (end >= 0) {
      spans.push([i, end]);
      i = t.indexOf('{', end + 1);
    } else {
      unclosed = true;
      i = t.indexOf('{', i + 1);
    }
  }
  return { spans, unclosed };
}

const NOT_FOUND = '백업 내용을 찾지 못했어요. 내보낸 글 전체를 붙여넣어 주세요';
const BROKEN = '백업 내용이 잘렸거나 손상됐어요. 처음부터 끝까지 다시 복사해 주세요';
const NOT_OURS = '만다라트 백업 형식이 아니에요';

export function parseBackup(text: string): ParseResult {
  const t = text.trim();
  if (!t) return { ok: false, error: '붙여넣은 내용이 없어요' };
  const { spans, unclosed } = blocks(t);
  let found: Record<string, unknown> | undefined;
  let parsedAny = false;
  for (const [a, b] of spans) {
    try {
      const v: unknown = JSON.parse(t.slice(a, b + 1));
      parsedAny = true;
      if (looksOurs(v)) {
        found = v;
        break;
      }
    } catch {
      /* 다음 덩어리 */
    }
  }
  if (!found) {
    // 우리 백업의 흔적이 있는데 읽지 못했다면 잘린 것, 다른 JSON이면 형식이 다른 것
    if (/"app"\s*:\s*"mandarat"|"themes"\s*:/.test(t) || (unclosed && !parsedAny)) return { ok: false, error: BROKEN };
    return { ok: false, error: parsedAny ? NOT_OURS : NOT_FOUND };
  }
  const r = found;
  const wrapped = r.app === BACKUP_APP;
  if (wrapped && typeof r.schema === 'number' && r.schema > BACKUP_SCHEMA) {
    return { ok: false, error: '더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 불러와 주세요' };
  }
  const candidate = wrapped ? r.doc : r;
  if (!candidate || typeof candidate !== 'object' || !Array.isArray((candidate as { themes?: unknown }).themes)) {
    return { ok: false, error: NOT_OURS };
  }
  // 불러온 문서는 이미 시작한 사용자의 것이므로 온보딩을 다시 띄우지 않는다
  const doc: MandaratDoc = { ...migrate(candidate), onboarded: true };
  const exportedAt = wrapped && typeof r.exportedAt === 'string' ? r.exportedAt : undefined;
  return { ok: true, doc, summary: { ...summarize(doc), ...(exportedAt ? { exportedAt } : {}) } };
}
