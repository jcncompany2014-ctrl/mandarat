// 설정 › iCloud · 고르기 시트 · 온보딩 가져오기 줄이 보일 글을 고른다 — React Native 없이 Node에서 시험한다(tests/syncUi.test.js).
// 엔진은 상태와 까닭을 이름(code)으로만 알린다(syncEngine.ts). 그 이름을 'sync' 이름공간의 글로 바꾸는 곳이 여기 하나다.
import type { Messages } from '../../i18n';
import type { RemoteProbe, SyncChoice, SyncProblem, SyncStatus } from '../../lib/syncEngine';

/** 이만큼 안에 맞췄으면 '방금' */
export const JUST_NOW_MS = 60_000;

/** 고르기 시트의 순서 — 미리 골라 둔 것은 없다 */
export const CHOICES: readonly SyncChoice[] = ['merge', 'adopt', 'mine'];

/** 이 기기에서 iCloud 맞추기를 쓸 수 있나 — iOS이고 기기 모듈이 있을 때만(웹 · 안드로이드 · Expo Go는 안내 한 줄) */
export function syncSupported(os: string, nativeModule: unknown): boolean {
  return os === 'ios' && nativeModule != null;
}

/** 상태 줄 — 켜져 있지 않거나 할 말이 없으면 null */
export function statusLine(s: SyncStatus, now: number, t: Messages): string | null {
  switch (s.phase) {
    case 'checking':
    case 'syncing':
      return t.sync.syncing;
    case 'needsChoice':
      return t.sync.needsChoice;
    case 'idle':
    case 'off':
      if (!s.enabled || s.at === undefined) return null;
      if (now - s.at < JUST_NOW_MS) return t.sync.justNow;
      return syncedAt(s.at, t);
    case 'problem':
      return null;
  }
}

/** '10월 14일 오후 9:00에 맞췄어요' */
export function syncedAt(at: number, t: Messages): string {
  const d = new Date(at);
  return t.sync.syncedAt({ day: t.fmt.monthDay({ d }), time: t.fmt.time({ h: d.getHours(), m: d.getMinutes() }) });
}

/** 문제 줄 — 설정 앱으로 보내야 하는 것(로그인 · iCloud Drive)은 settings, 다시 해 볼 수 있는 것은 retry */
export interface ProblemLine {
  title: string;
  body?: string;
  action?: 'settings' | 'retry';
}

export function problemLine(p: SyncProblem | undefined, t: Messages): ProblemLine | null {
  switch (p) {
    case 'noAccount':
      return { title: t.sync.noAccount, body: t.sync.settingsBody, action: 'settings' };
    case 'driveOff':
      return { title: t.sync.driveOff, body: t.sync.settingsBody, action: 'settings' };
    case 'accountChanged':
      return { title: t.sync.accountChanged };
    case 'newerApp':
      return { title: t.sync.newerApp };
    case 'tooLarge':
      return { title: t.sync.tooLarge };
    case 'ioError':
      return { title: t.sync.ioError, action: 'retry' };
    default:
      return null;
  }
}

/** 고르기 하나의 제목과 설명 한 줄 */
export function choiceText(c: SyncChoice, t: Messages): { title: string; sub: string } {
  if (c === 'merge') return { title: t.sync.merge, sub: t.sync.mergeSub };
  if (c === 'adopt') return { title: t.sync.adopt, sub: t.sync.adoptSub };
  return { title: t.sync.mine, sub: t.sync.mineSub };
}

/** 물음 하나를 가리키는 열쇠 — 엔진은 물을 때마다 iCloud 문서(remote)를 새로 읽어 싣는다 */
export function choiceKey(s: SyncStatus): object {
  return s.remote ?? s;
}

/** 고르기 시트를 보일 때 — 고르는 중이고, 이 물음에 아직 답하지 않았다(답한 뒤 엔진이 넘어가기 전에 다시 뜨지 않게) */
export function choiceOpen(s: SyncStatus, answered: object | null): boolean {
  return s.phase === 'needsChoice' && choiceKey(s) !== answered;
}

/** 온보딩의 '가져오기' 줄을 보일까 — iCloud가 쓸 수 있고 다른 기기 파일이 하나라도 있을 때만 */
export function offerFor(probe: RemoteProbe | null | undefined): boolean {
  return !!probe && probe.available && probe.files > 0;
}
