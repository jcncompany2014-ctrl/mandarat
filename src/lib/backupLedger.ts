// 백업 불러오기의 '지금 | 백업' 장부 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
import type { BackupSummary } from './backup';
import { fmtDateShort } from './text';

export interface LedgerRow {
  label: string;
  now: string;
  backup: string;
  /** 글(핵심 목표) — 숫자처럼 자릿수를 맞추지 않고 두 줄까지 */
  text?: boolean;
}

/** 값이 없는 칸의 표기 */
export const LEDGER_NONE = '없음';

/** 핵심 목표 · 채운 칸 · 달성 · 기록 일수 · 마지막 기록 — 지금과 백업을 나란히 */
export function ledgerRows(now: BackupSummary, backup: BackupSummary): LedgerRow[] {
  const day = (d?: string) => (d ? fmtDateShort(d) : LEDGER_NONE);
  return [
    { label: '핵심 목표', now: now.goal || LEDGER_NONE, backup: backup.goal || LEDGER_NONE, text: true },
    { label: '채운 칸', now: `${now.filled}/64`, backup: `${backup.filled}/64` },
    { label: '달성', now: `${now.done}칸`, backup: `${backup.done}칸` },
    { label: '기록 일수', now: `${now.days}일`, backup: `${backup.days}일` },
    { label: '마지막 기록', now: day(now.lastLog), backup: day(backup.lastLog) },
  ];
}

/** 지금 기록이 백업보다 최근인가 — 바꾸면 그 사이 기록이 사라진다. 백업에 기록이 없고 지금은 있으면 그것도 최근 */
export function nowIsNewer(now: Pick<BackupSummary, 'lastLog'>, backup: Pick<BackupSummary, 'lastLog'>): boolean {
  if (!now.lastLog) return false;
  return !backup.lastLog || backup.lastLog < now.lastLog;
}
