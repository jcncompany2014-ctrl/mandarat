// 들어오는 링크 — mandarat:// 주소를 읽어(parseLink) 문서와 지금 시각으로 할 일을 정하고(resolveLink) 화면 손잡이로 돌린다(runCommand).
// React·RN 의존 없는 순수 모듈 — 단위 테스트 대상(tests/links.test.js). 주소 표는 docs/v2/plan.md §2.8.
//
// - new URL을 쓰지 않는다(RN의 URL은 사용자 정의 scheme을 제대로 읽지 못한다) — 정규식 하나로 읽는다.
// - mandarat://today(호스트 꼴)와 mandarat:///today(경로 꼴)를 둘 다 받는다. scheme은 대소문자를 가리지 않는다.
// - 영역 번호·칸 번호·월요일 키·지난 표 아이디를 검사하고, 나머지는 모두 null(개발 클라이언트 exp+mandarat://…, https://… 포함).
import type { MandaratDoc } from '../types';
import type { PrintTarget, YearView } from './contracts';
import { LINK_SCHEME } from './contracts';
import { isMondayKey } from '../data/defaults';
import { ritualTarget } from './ritual';

/** 읽어 낸 링크 — 화면 이름이 아니라 주소 그대로의 뜻 */
export type LinkTarget =
  | { to: 'home' }
  | { to: 'today' }
  | { to: 'grid' }
  | { to: 'area'; ti: number }
  | { to: 'focus' }
  | { to: 'focus'; ti: number; ai: number }
  | { to: 'ritual' }
  | { to: 'ritual'; week: string }
  | { to: 'stats' }
  | { to: 'year' }
  | { to: 'year'; id: string }
  | { to: 'add' }
  | { to: 'share' }
  | { to: 'print' };

/** 링크로 할 일 — runCommand가 화면 손잡이(UIActions)로 돌린다 */
export type LinkCommand =
  | { kind: 'none' }
  | { kind: 'go'; screen: 'dashboard' | 'today' | 'grid' | 'stats' }
  | { kind: 'detail'; ti: number }
  | { kind: 'focus'; ti: number; ai: number }
  | { kind: 'ritual'; week: string; readOnly: boolean }
  | { kind: 'year'; view: YearView }
  | { kind: 'quick' }
  | { kind: 'share' }
  | { kind: 'print' };

/** 링크를 받을 때 화면 쪽 사정 — 집중 타이머가 이미 떠 있는지 */
export interface LinkState {
  focusOpen: boolean;
}

// mandarat: 뒤에 빗금 둘(호스트 꼴) 또는 셋(경로 꼴), 그 뒤 경로. ?·# 뒤는 버린다
const LINK_RE = new RegExp(`^${LINK_SCHEME}:\\/\\/\\/?([^?#]*)(?:[?#].*)?$`, 'i');
const AREA_RE = /^[0-7]$/;
const CELL_RE = /^([0-7])-([0-7])$/;
// 지난 표 아이디 — 문서의 아이디 꼴(src/data/defaults.ts ID_RE)과 같다
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

// 덧붙는 것 없이 이름만 있는 주소
const BARE = ['home', 'today', 'grid', 'stats', 'add', 'share', 'print', 'focus', 'ritual', 'year'] as const;

/** mandarat:// 주소 → 링크(모르는 주소는 null) */
export function parseLink(url: unknown): LinkTarget | null {
  if (typeof url !== 'string') return null;
  const m = LINK_RE.exec(url.trim());
  if (!m) return null;
  // 끝의 빗금은 없는 것으로 본다(mandarat://today/)
  const parts = m[1].replace(/\/+$/, '').split('/');
  const [head, arg, ...rest] = parts;
  if (rest.length > 0) return null;
  const name = head.toLowerCase();
  if (name === '') return arg === undefined ? { to: 'home' } : null;
  if (arg === undefined) {
    return (BARE as readonly string[]).includes(name) ? ({ to: name } as LinkTarget) : null;
  }
  if (name === 'area') return AREA_RE.test(arg) ? { to: 'area', ti: Number(arg) } : null;
  if (name === 'focus') {
    const c = CELL_RE.exec(arg);
    return c ? { to: 'focus', ti: Number(c[1]), ai: Number(c[2]) } : null;
  }
  if (name === 'ritual') return isMondayKey(arg) ? { to: 'ritual', week: arg } : null;
  if (name === 'year') return ID_RE.test(arg) ? { to: 'year', id: arg } : null;
  return null;
}

/** 링크 → 늘 같은 꼴의 주소(호스트 꼴, 소문자 scheme) */
export function linkFor(target: LinkTarget): string {
  const base = `${LINK_SCHEME}://`;
  switch (target.to) {
    case 'home':
      return `${base}home`;
    case 'area':
      return `${base}area/${target.ti}`;
    case 'focus':
      return 'ti' in target ? `${base}focus/${target.ti}-${target.ai}` : `${base}focus`;
    case 'ritual':
      return 'week' in target ? `${base}ritual/${target.week}` : `${base}ritual`;
    case 'year':
      return 'id' in target ? `${base}year/${target.id}` : `${base}year`;
    default:
      return `${base}${target.to}`;
  }
}

/**
 * 링크 → 할 일. 문서와 지금 시각으로 정한다.
 * - focus/<ti>-<ai>: 칸에 글이 있고 집중 타이머가 떠 있지 않으면 오늘 화면에서 타이머, 아니면 표.
 * - ritual: 지금 돌아볼 주가 있으면 그 주, 없으면 통계.
 * - ritual/<월요일>: 돌아본 주는 읽기만, 지금 돌아볼 주는 돌아보기, 그 밖은 통계.
 * - year/<아이디>: 지난 표에 있으면 그 표의 돌아보기, 없으면 보관함.
 */
export function resolveLink(
  target: LinkTarget,
  doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'reviews' | 'archives'>,
  now: Date,
  state: LinkState = { focusOpen: false },
): LinkCommand {
  switch (target.to) {
    case 'home':
      return { kind: 'go', screen: 'dashboard' };
    case 'today':
    case 'grid':
    case 'stats':
      return { kind: 'go', screen: target.to };
    case 'area':
      return { kind: 'detail', ti: target.ti };
    case 'focus': {
      // 타이머(Live Activity · 끝 알림)에서 온 것 — 앱이 앞으로 나오면 도는 타이머가 이미 보인다
      if (!('ti' in target)) return { kind: 'none' };
      const text = doc.themes[target.ti]?.actions[target.ai]?.text ?? '';
      if (text.trim() !== '' && !state.focusOpen) return { kind: 'focus', ti: target.ti, ai: target.ai };
      return { kind: 'go', screen: 'grid' };
    }
    case 'ritual': {
      const due = ritualTarget(doc, now);
      if (!('week' in target)) return due ? { kind: 'ritual', week: due, readOnly: false } : { kind: 'go', screen: 'stats' };
      if (doc.reviews?.[target.week]) return { kind: 'ritual', week: target.week, readOnly: true };
      if (due === target.week) return { kind: 'ritual', week: target.week, readOnly: false };
      return { kind: 'go', screen: 'stats' };
    }
    case 'year': {
      if (!('id' in target)) return { kind: 'year', view: { kind: 'review', id: null } };
      const known = (doc.archives ?? []).some((a) => a.id === target.id);
      return { kind: 'year', view: known ? { kind: 'review', id: target.id } : { kind: 'shelf' } };
    }
    case 'add':
      return { kind: 'quick' };
    case 'share':
      return { kind: 'share' };
    case 'print':
      return { kind: 'print' };
  }
}

/** runCommand가 쓰는 화면 손잡이 — src/navigation/ui.tsx UIActions의 일부 */
export interface LinkActions {
  go: (screen: 'dashboard' | 'today' | 'grid' | 'stats' | 'detail', ti?: number) => void;
  afterOverlays: (fn: () => void) => void;
  startFocus: (ti: number, ai: number) => void;
  openRitual: (week: string, readOnly?: boolean) => void;
  openYear: (view?: YearView) => void;
  openQuick: (ti?: number) => void;
  openShare: () => void;
  openPrint: (target?: PrintTarget) => void;
}

/** 할 일을 화면 손잡이로 — 시트를 여는 것은 모두 대기열을 거친다(열린 시트가 닫힌 뒤에 뜬다) */
export function runCommand(cmd: LinkCommand, ui: LinkActions): void {
  switch (cmd.kind) {
    case 'none':
      return;
    case 'go':
      ui.go(cmd.screen);
      return;
    case 'detail':
      ui.go('detail', cmd.ti);
      return;
    case 'focus':
      ui.go('today');
      ui.startFocus(cmd.ti, cmd.ai);
      return;
    case 'ritual':
      ui.openRitual(cmd.week, cmd.readOnly || undefined);
      return;
    case 'year':
      ui.openYear(cmd.view);
      return;
    case 'quick':
      // openQuick만 대기열을 거치지 않는다 — 다른 시트 위에 겹쳐 뜨지 않게
      ui.afterOverlays(() => ui.openQuick());
      return;
    case 'share':
      ui.openShare();
      return;
    case 'print':
      ui.openPrint();
  }
}
