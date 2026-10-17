// 프로(한 번 결제) — 문서와 따로 둔 공급자. 사고팔기 상태가 바뀌어도 문서를 읽는 화면은 다시 그려지지 않는다.
// V1-E가 StoreKit 모듈(modules/pro-store)로 채운다. Wave 0에서는 늘 '갖지 않음'이고 잠금은 모두 잠겨 있다.
import React, { createContext, useContext, type ReactNode } from 'react';
import type { ProFeature } from '../lib/contracts';

export interface ProState {
  /** 프로를 가졌는가 */
  owned: boolean;
}

const ProCtx = createContext<ProState>({ owned: false });

export function ProProvider({ children }: { children: ReactNode }) {
  return <ProCtx.Provider value={PRO_NONE}>{children}</ProCtx.Provider>;
}

const PRO_NONE: ProState = { owned: false };

export function usePro(): ProState {
  return useContext(ProCtx);
}

/** 이 기능이 잠겼는가 — 무료 기능은 여기에 넘기지 않는다(docs/v2/plan.md §2.9) */
export function useLocked(_feature: ProFeature): boolean {
  return !useContext(ProCtx).owned;
}
