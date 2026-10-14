import { ymd } from './routine';

/**
 * 불러온 문서의 '마지막 백업' — 지금 기록의 날짜와 백업을 만든 날 중 늦은 쪽.
 * 백업 파일은 내보내기 직전의 문서라 그 안의 lastBackupAt은 그 백업 자신을 모른다(불러오면 '아직 백업하지 않았어요'로 돌아가지 않게).
 */
export function lastBackupAfterImport(current: string | undefined, imported: string | undefined, exportedAt: string | undefined): string | undefined {
  let made: string | undefined;
  if (exportedAt) {
    const d = new Date(exportedAt);
    if (!Number.isNaN(d.getTime())) made = ymd(d);
  }
  const all = [current, imported, made].filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x));
  return all.length ? all.sort()[all.length - 1] : undefined;
}
