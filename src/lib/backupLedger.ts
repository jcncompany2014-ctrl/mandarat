// 백업 불러오기의 '지금 | 백업' 장부 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
import type { BackupSummary } from './backup';
import { fmtDateShort, fmtDateSpeech } from './text';
import { lang, msg, subscribeLang, type Lang } from '../i18n';

export interface LedgerRow {
  label: string;
  now: string;
  backup: string;
  /** 글(핵심 목표) — 숫자처럼 자릿수를 맞추지 않고 두 줄까지 */
  text?: boolean;
  /**
   * 화면 읽기가 말할 값(없으면 now · backup 그대로) — '23/64'는 날짜로, '10.3 (토)'는 소수로 읽히므로
   * '64칸 중 23칸' · '2026년 10월 3일 토요일'처럼 소리 말로
   */
  nowSay?: string;
  backupSay?: string;
}

/**
 * 값이 없는 칸의 표기(m.backup.none) — 화면은 이것과 같은지로 흐린 글자를 고른다(BackupImport · SyncChoiceSheet).
 * 언어를 따르는 살아 있는 값: 언어가 바뀌면 다시 적는다(ESM live binding).
 */
export let LEDGER_NONE: string = msg().backup.none;
subscribeLang((l) => {
  LEDGER_NONE = msg(l).backup.none;
});

/**
 * 핵심 목표 · 채운 칸 · 달성 · 기록 일수 · 마지막 기록(+ 지난 표가 있으면 지난 표 수) — 지금과 백업을 나란히.
 * today: 마지막 기록을 소리로 말할 때 해가 다르면 해까지 붙이는 기준(백업은 다른 해의 것일 수 있다)
 */
export function ledgerRows(now: BackupSummary, backup: BackupSummary, today = new Date(), l: Lang = lang()): LedgerRow[] {
  const m = msg(l);
  const b = m.backup;
  const none = b.none;
  const day = (d?: string) => (d ? fmtDateShort(d, l) : none);
  const daySay = (d?: string) => (d ? fmtDateSpeech(d, today, l) : none);
  const rows: LedgerRow[] = [
    { label: b.rowGoal, now: now.goal || none, backup: backup.goal || none, text: true },
    {
      label: b.rowFilled, now: `${now.filled}/64`, backup: `${backup.filled}/64`,
      nowSay: b.filledSay({ n: now.filled }), backupSay: b.filledSay({ n: backup.filled }),
    },
    { label: b.rowDone, now: m.fmt.cells({ n: now.done }), backup: m.fmt.cells({ n: backup.done }) },
    { label: b.rowDays, now: m.fmt.days({ n: now.days }), backup: m.fmt.days({ n: backup.days }) },
    {
      label: b.rowLast, now: day(now.lastLog), backup: day(backup.lastLog),
      nowSay: daySay(now.lastLog), backupSay: daySay(backup.lastLog),
    },
  ];
  // 지난 표 — 어느 쪽이든 있을 때만. 불러와도 지금 있는 지난 표는 남는다(백업에 없는 것도, archive.unionArchives)
  const nowArch = now.archives ?? 0;
  const backArch = backup.archives ?? 0;
  if (nowArch > 0 || backArch > 0) {
    const y = m.year;
    rows.push({ label: y.ledgerArchives, now: y.archiveCount({ n: nowArch }), backup: y.archiveCount({ n: backArch }) });
  }
  return rows;
}

/** 지금 기록이 백업보다 최근인가 — 바꾸면 그 사이 기록이 사라진다. 백업에 기록이 없고 지금은 있으면 그것도 최근 */
export function nowIsNewer(now: Pick<BackupSummary, 'lastLog'>, backup: Pick<BackupSummary, 'lastLog'>): boolean {
  if (!now.lastLog) return false;
  return !backup.lastLog || backup.lastLog < now.lastLog;
}
