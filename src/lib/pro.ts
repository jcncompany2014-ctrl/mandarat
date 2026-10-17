// 프로(한 번 결제) — 순수 모듈. 사고팔기 상태(reduceProState), 기기 저장값(mandarat:pro:v1), 잠금(isLocked · proValue).
// StoreKit이 진짜 답이고 저장값은 그 답을 기억해 둔 것이다(비행기 모드로 켜도 프로가 열려 있게).
// 규칙(docs/v2/plan.md §2.9):
// - 확인이 실패하면(오프라인 · StoreKit 오류) 프로를 절대 닫지 않는다. 분명한 답(갖지 않음 · 환불)만 닫는다.
// - 사용자가 결제 창을 닫으면(cancelled) 아무 말도 하지 않는다.
// - 무료 기능은 isLocked에 넘기지 않는다. 저장된 프로 선택은 지우지 않고, 프로가 없으면 무료 모양으로 그린다.
import { PRO_FEATURES, type ProFeature } from './contracts';
import { msg, type Lang, type Messages } from '../i18n';

/** 웹 스크린샷 전용 — 늘 프로를 가진 것으로(vercel.json · eas.json은 이 값을 두지 않는다; tests/contracts.test.js) */
export const PREVIEW = process.env.EXPO_PUBLIC_PRO_PREVIEW === '1';

/** 앱이 앞으로 나올 때 다시 묻는 가장 짧은 간격 */
export const RECHECK_MS = 10 * 60 * 1000;

// ── 기기 저장값 ───────────────────────────────────────────────

/** AsyncStorage 'mandarat:pro:v1' — StoreKit이 분명히 답한 마지막 값 */
export interface ProCache {
  v: 1;
  owned: boolean;
  /** 그 답을 받은 때(ms) */
  at: number;
}

/** 저장된 글을 읽는다 — 모르는 모양이면 null(없는 것과 같다) */
export function parseProCache(raw: string | null | undefined): ProCache | null {
  if (typeof raw !== 'string' || raw === '') return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (o.v !== 1 || typeof o.owned !== 'boolean') return null;
  const at = typeof o.at === 'number' && Number.isFinite(o.at) && o.at >= 0 ? Math.floor(o.at) : 0;
  return { v: 1, owned: o.owned, at };
}

export function serializeProCache(c: { owned: boolean; at: number }): string {
  return JSON.stringify({ v: 1, owned: c.owned, at: c.at } satisfies ProCache);
}

// ── 상태 ───────────────────────────────────────────────────

/**
 * 지금 하는 일.
 * boot = 저장값을 읽기 전, idle = 쉬는 중, buying = 결제 창, restoring = 구입 복원 중
 */
export type ProPhase = 'boot' | 'idle' | 'buying' | 'restoring';

/**
 * 화면에 한 줄 남길 일 — 말은 화면이 고른다(msg().pro.note*).
 * bought = 프로를 열었다, restored = 복원했다, restoredNone = 복원할 구입이 없다,
 * pending = 승인을 기다린다(Ask to Buy), unverified = 확인되지 않은 거래,
 * 그 밖에는 오류 갈래(ErrorKind, cancelled 빼고)
 */
export type ProNote = 'bought' | 'restored' | 'restoredNone' | 'pending' | 'unverified' | 'network' | 'notAllowed' | 'unavailable' | 'unknown';

/** 모듈 오류 코드의 갈래 — cancelled는 사용자가 닫은 것이라 말하지 않는다 */
export type ErrorKind = 'network' | 'notAllowed' | 'unavailable' | 'cancelled' | 'unknown';

export type PurchaseOutcome = 'purchased' | 'pending' | 'cancelled' | 'unverified';

export interface ProStatus {
  owned: boolean;
  phase: ProPhase;
  /** StoreKit의 displayPrice — 모르면 null(값을 지어 적지 않는다) */
  price: string | null;
  /** 이 기기에서 살 수 있는가 — 모듈이 있고 결제가 허락됐다 */
  canBuy: boolean;
  note: ProNote | null;
  /** StoreKit이 분명히 답한 마지막 때(ms) — 0이면 아직 없다. 이 값이 바뀔 때만 저장한다 */
  checkedAt: number;
}

export const INITIAL_PRO: ProStatus = { owned: false, phase: 'boot', price: null, canBuy: false, note: null, checkedAt: 0 };

export type ProEvent =
  /** 저장값을 읽었다(없으면 null) — StoreKit이 이미 답했으면 그 답이 이긴다 */
  | { type: 'cache'; cache: ProCache | null }
  /** 모듈이 있는가와 결제가 허락됐는가 */
  | { type: 'store'; available: boolean; canPay: boolean }
  /** 상품 값을 받았다(못 받으면 null) */
  | { type: 'product'; price: string | null }
  /** owned()가 분명히 답했다 — 앞으로 나올 때 · 처음 켤 때 */
  | { type: 'checked'; owned: boolean; at: number }
  /** owned()가 실패했다 — 아무것도 바꾸지 않는다 */
  | { type: 'checkFailed' }
  /** 앱 밖에서 권리가 바뀌었다(Transaction.updates) */
  | { type: 'entitlement'; owned: boolean; at: number }
  | { type: 'buy' }
  | { type: 'bought'; result: PurchaseOutcome; at: number }
  | { type: 'buyFailed'; kind: ErrorKind }
  | { type: 'restore' }
  | { type: 'restored'; owned: boolean; at: number }
  | { type: 'restoreFailed'; kind: ErrorKind }
  | { type: 'clearNote' };

/** 오류 갈래를 화면 한 줄로 — cancelled는 말하지 않는다 */
function failNote(kind: ErrorKind): ProNote | null {
  return kind === 'cancelled' ? null : kind;
}

/** 저장값을 읽은 뒤에는 boot에서 나온다 */
const settled = (p: ProPhase): ProPhase => (p === 'boot' ? 'idle' : p);

export function reduceProState(s: ProStatus, e: ProEvent): ProStatus {
  switch (e.type) {
    case 'cache': {
      // StoreKit이 먼저 답했으면 저장값은 무시한다
      const owned = s.checkedAt > 0 ? s.owned : (e.cache?.owned ?? s.owned);
      return { ...s, owned, phase: settled(s.phase) };
    }
    case 'store': {
      const canBuy = e.available && e.canPay;
      return canBuy === s.canBuy ? s : { ...s, canBuy };
    }
    case 'product':
      return e.price === s.price ? s : { ...s, price: e.price };
    case 'checked':
      return { ...s, owned: e.owned, checkedAt: e.at };
    case 'checkFailed':
      return s;
    case 'entitlement': {
      // 기다리던 승인(Ask to Buy)이 나거나 다른 기기에서 샀다 — 새로 열렸을 때만 알린다
      const note: ProNote | null = e.owned && !s.owned ? 'bought' : s.note;
      return { ...s, owned: e.owned, checkedAt: e.at, note, phase: e.owned && s.phase === 'buying' ? 'idle' : s.phase };
    }
    case 'buy':
      if (s.owned || !s.canBuy || s.phase === 'buying' || s.phase === 'restoring') return s;
      return { ...s, phase: 'buying', note: null };
    case 'bought':
      switch (e.result) {
        case 'purchased':
          return { ...s, owned: true, checkedAt: e.at, phase: 'idle', note: 'bought' };
        case 'pending':
          return { ...s, phase: 'idle', note: 'pending' };
        case 'unverified':
          return { ...s, phase: 'idle', note: 'unverified' };
        case 'cancelled':
        default:
          return { ...s, phase: 'idle', note: null };
      }
    case 'buyFailed':
      return { ...s, phase: 'idle', note: failNote(e.kind) };
    case 'restore':
      if (s.phase === 'buying' || s.phase === 'restoring') return s;
      return { ...s, phase: 'restoring', note: null };
    case 'restored':
      return { ...s, owned: e.owned, checkedAt: e.at, phase: 'idle', note: e.owned ? 'restored' : 'restoredNone' };
    case 'restoreFailed':
      // 복원이 실패해도 갖고 있던 프로는 그대로
      return { ...s, phase: 'idle', note: failNote(e.kind) };
    case 'clearNote':
      return s.note === null ? s : { ...s, note: null };
    default:
      return s;
  }
}

/** 모듈이 거절한 오류(code 'E_…')의 갈래 */
export function errorKind(code: unknown): ErrorKind {
  const c = code && typeof code === 'object' && 'code' in code ? (code as { code: unknown }).code : code;
  switch (c) {
    case 'E_NETWORK':
      return 'network';
    case 'E_NOT_ALLOWED':
      return 'notAllowed';
    case 'E_UNAVAILABLE':
      return 'unavailable';
    case 'E_CANCELLED':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

/** 앞으로 나올 때 다시 물을까 — 지난번에 물은 뒤 RECHECK_MS가 지났으면 */
export function shouldRecheck(lastAsked: number, now: number): boolean {
  return now - lastAsked >= RECHECK_MS || now < lastAsked;
}

// ── 잠금 ───────────────────────────────────────────────────

/** 이 프로 기능이 잠겼는가 — PRO_FEATURES 밖의 것은 잠그지 않는다 */
export function isLocked(f: ProFeature, owned: boolean): boolean {
  return (PRO_FEATURES as readonly string[]).includes(f) && !owned;
}

/**
 * 그릴 값 — 저장된 프로 선택은 남겨 두고, 프로가 없으면 무료 모양(freeDefault)으로 그린다.
 * isPro: 저장값이 프로 선택인가(값 또는 판정 함수). 저장값 자체는 바꾸지 않는다.
 */
export function proValue<T>(stored: T, freeDefault: T, isPro: boolean | ((v: T) => boolean), owned: boolean): T {
  const pro = typeof isPro === 'function' ? isPro(stored) : isPro;
  return pro && !owned ? freeDefault : stored;
}

// ── 말 ─────────────────────────────────────────────────────

const NOTE_KEY = {
  bought: 'noteBought',
  restored: 'noteRestored',
  restoredNone: 'noteRestoredNone',
  pending: 'notePending',
  unverified: 'noteUnverified',
  network: 'noteNetwork',
  notAllowed: 'noteNotAllowed',
  unavailable: 'noteUnavailable',
  unknown: 'noteUnknown',
} as const satisfies Record<ProNote, keyof Messages['pro']>;

/** 화면 한 줄의 말(지금 언어) */
export function proNoteText(note: ProNote, l?: Lang): string {
  return msg(l).pro[NOTE_KEY[note]];
}
