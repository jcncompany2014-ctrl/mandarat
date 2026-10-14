// 백업 안내 글 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
import { daysBetween, ymd } from './routine';

/** 설정 › 백업 내보내기 아래 한 줄 — '마지막 백업 · 3일 전' · '마지막 백업 · 오늘' · '아직 백업하지 않았어요' */
export function backupAgeLabel(lastBackupAt: string | undefined, now: Date): string {
  if (!lastBackupAt) return '아직 백업하지 않았어요';
  const n = daysBetween(lastBackupAt, ymd(now));
  // 같은 날, 또는 기기 시계가 뒤로 간 경우(미래의 백업 날)는 '오늘'로
  return n <= 0 ? '마지막 백업 · 오늘' : `마지막 백업 · ${n}일 전`;
}

/**
 * 파일로 보낼 수 없을 때(안드로이드 등) 글로 보내는 백업의 머리말 — 중괄호 없이,
 * 백업 불러오기는 첫 '{'부터 읽으므로 이 머리말이 붙어 있어도 그대로 불러올 수 있다.
 */
export function backupTextPrefix(now: Date): string {
  return `만다라트 백업 · ${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일\n설정 › 백업 불러오기에 이 글 전체를 붙여 넣으면 돼요.\n\n`;
}
