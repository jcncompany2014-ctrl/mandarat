// 프로(한 번 결제) — 문서와 따로 둔 공급자. 사고팔기 상태가 바뀌어도 문서를 읽는 화면은 다시 그려지지 않는다.
// StoreKit 모듈(modules/pro-store)이 진짜 답이고, 기기 저장값(mandarat:pro:v1)은 그 답을 기억해 둔 것이다.
// 상태 바꾸기는 모두 src/lib/pro.ts의 reduceProState가 맡는다(확인이 실패해도 프로를 닫지 않는다).
// 웹 · 안드로이드에는 모듈이 없다 — 저장값만 읽고 canBuy는 false다.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRO_PRODUCT_ID, STORE_KEYS, type ProFeature } from '../lib/contracts';
import { crash } from '../lib/crash';
import {
  INITIAL_PRO,
  PREVIEW,
  errorKind,
  isLocked,
  parseProCache,
  reduceProState,
  serializeProCache,
  shouldRecheck,
  type ProEvent,
  type ProNote,
  type ProPhase,
  type ProStatus,
} from '../lib/pro';
import { proStore } from '../../modules/pro-store';

export interface ProState {
  /** 프로를 가졌는가(EXPO_PUBLIC_PRO_PREVIEW=1이면 늘 true) */
  owned: boolean;
  phase: ProPhase;
  /** StoreKit의 displayPrice — 모르면 null */
  price: string | null;
  /** 이 기기에서 살 수 있는가 */
  canBuy: boolean;
  /** 화면에 한 줄 남길 일 — 말은 proNoteText(note) */
  note: ProNote | null;
}

export interface ProActions {
  /** 결제 창을 연다 — 이미 가졌거나 다른 일을 하는 중이면 아무것도 하지 않는다 */
  buy(): Promise<void>;
  /** 구입 복원 */
  restore(): Promise<void>;
  /** 지금 다시 묻는다(값 · 갖고 있는지) — 10분 제한 없이 */
  refresh(): Promise<void>;
  clearNote(): void;
}

const PRO_NONE: ProState = { owned: PREVIEW, phase: 'boot', price: null, canBuy: false, note: null };
const noop = async () => {};
const ACTIONS_NONE: ProActions = { buy: noop, restore: noop, refresh: noop, clearNote: () => {} };

const ProCtx = createContext<ProState>(PRO_NONE);
const ProActionsCtx = createContext<ProActions>(ACTIONS_NONE);

export function ProProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reduceProState, INITIAL_PRO);
  // 액션이 막 바뀐 상태를 보게(두 번 누름에 결제 창이 두 번 뜨지 않게)
  const stateRef = useRef<ProStatus>(s);
  stateRef.current = s;
  /** owned()를 마지막으로 물은 때 — 앞으로 나올 때 10분에 한 번만 */
  const lastAsk = useRef(0);

  /** 상태를 바꿀 일이면 true — 줄이개가 그대로 돌려주면(무시) false */
  const send = useCallback((e: ProEvent): boolean => {
    const next = reduceProState(stateRef.current, e);
    if (next === stateRef.current) return false;
    stateRef.current = next;
    dispatch(e);
    return true;
  }, []);

  const check = useCallback(async () => {
    if (!proStore) return;
    lastAsk.current = Date.now();
    try {
      const owned = await proStore.owned(PRO_PRODUCT_ID);
      send({ type: 'checked', owned, at: Date.now() });
    } catch {
      send({ type: 'checkFailed' });
    }
  }, [send]);

  const loadStore = useCallback(async () => {
    if (!proStore) return;
    let canPay = false;
    try {
      canPay = proStore.canPay();
    } catch {
      // 모르면 살 수 없는 것으로
    }
    send({ type: 'store', available: true, canPay });
    try {
      const p = await proStore.product(PRO_PRODUCT_ID);
      send({ type: 'product', price: p.displayPrice || null });
    } catch {
      send({ type: 'product', price: null });
    }
  }, [send]);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEYS.pro).then(
      (raw) => send({ type: 'cache', cache: parseProCache(raw) }),
      () => send({ type: 'cache', cache: null }),
    );
    if (!proStore) return;
    const store = proStore;
    void check();
    void loadStore();
    const sub = store.addListener('onEntitlementChange', (e) => {
      if (e.id === PRO_PRODUCT_ID) send({ type: 'entitlement', owned: e.owned, at: Date.now() });
    });
    const app = AppState.addEventListener('change', (st) => {
      if (st !== 'active' || !shouldRecheck(lastAsk.current, Date.now())) return;
      void check();
      // 값을 아직 못 받았으면(오프라인으로 켰을 때) 다시
      if (stateRef.current.price === null) void loadStore();
    });
    return () => {
      sub.remove();
      app.remove();
    };
  }, [check, loadStore, send]);

  // 분명한 답을 받았을 때만 저장한다 — 실패는 저장값을 건드리지 않는다
  useEffect(() => {
    if (s.checkedAt === 0) return;
    AsyncStorage.setItem(STORE_KEYS.pro, serializeProCache({ owned: s.owned, at: s.checkedAt })).catch(() => {});
    crash.tag('pro', s.owned ? 'y' : 'n');
  }, [s.checkedAt, s.owned]);

  useEffect(() => {
    crash.crumb('pro', s.phase);
  }, [s.phase]);

  const actions = useMemo<ProActions>(() => ({
    buy: async () => {
      if (!proStore || !send({ type: 'buy' })) return;
      try {
        const result = await proStore.purchase(PRO_PRODUCT_ID);
        send({ type: 'bought', result, at: Date.now() });
      } catch (e) {
        send({ type: 'buyFailed', kind: errorKind(e) });
      }
    },
    restore: async () => {
      if (!proStore || !send({ type: 'restore' })) return;
      lastAsk.current = Date.now();
      try {
        const owned = await proStore.restore(PRO_PRODUCT_ID);
        send({ type: 'restored', owned, at: Date.now() });
      } catch (e) {
        send({ type: 'restoreFailed', kind: errorKind(e) });
      }
    },
    refresh: async () => {
      await Promise.all([check(), loadStore()]);
    },
    clearNote: () => {
      send({ type: 'clearNote' });
    },
  }), [check, loadStore, send]);

  const owned = PREVIEW || s.owned;
  const value = useMemo<ProState>(
    () => ({ owned, phase: s.phase, price: s.price, canBuy: s.canBuy, note: s.note }),
    [owned, s.phase, s.price, s.canBuy, s.note],
  );

  return (
    <ProActionsCtx.Provider value={actions}>
      <ProCtx.Provider value={value}>{children}</ProCtx.Provider>
    </ProActionsCtx.Provider>
  );
}

export function usePro(): ProState {
  return useContext(ProCtx);
}

/** 사기 · 복원 — 값이 바뀌지 않아서 이것만 읽는 화면은 다시 그려지지 않는다 */
export function useProActions(): ProActions {
  return useContext(ProActionsCtx);
}

/** 이 기능이 잠겼는가 — 무료 기능은 여기에 넘기지 않는다(docs/v2/plan.md §2.9) */
export function useLocked(feature: ProFeature): boolean {
  return isLocked(feature, useContext(ProCtx).owned);
}
