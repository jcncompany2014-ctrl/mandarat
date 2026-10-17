// 프로(한 번 결제) — StoreKit 2 로컬 모듈(ios/ProStoreModule.swift)의 JS 얼굴.
// 웹 · 안드로이드 · Expo Go에는 이 모듈이 없어서 proStore가 null이다 — 부르는 쪽은 늘 null을 먼저 본다.
import { requireOptionalNativeModule, type NativeModule } from 'expo';

/** purchase가 돌려주는 것 — 오류(E_NETWORK · E_NOT_ALLOWED · E_UNAVAILABLE · E_CANCELLED · E_UNKNOWN)는 거절로 온다 */
export type PurchaseResult = 'purchased' | 'pending' | 'cancelled' | 'unverified';

export interface ProProduct {
  id: string;
  /** 앱 스토어 나라의 돈으로 적힌 값 — 화면에 보이는 값은 이것뿐이다 */
  displayPrice: string;
  displayName: string;
}

/** 앱 밖에서 권리가 바뀌었다(Ask to Buy 승인 · 다른 기기에서 산 것 · 환불) */
export interface EntitlementChange {
  id: string;
  owned: boolean;
}

type ProStoreEvents = {
  onEntitlementChange: (e: EntitlementChange) => void;
};

export declare class ProStoreNative extends NativeModule<ProStoreEvents> {
  /** 이 기기에서 결제할 수 있는가(스크린 타임 제한이면 false) */
  canPay(): boolean;
  product(id: string): Promise<ProProduct>;
  purchase(id: string): Promise<PurchaseResult>;
  /** 확인된 권리 가운데 환불되지 않은 이 상품이 있는가 */
  owned(id: string): Promise<boolean>;
  /** AppStore.sync() 뒤 owned */
  restore(id: string): Promise<boolean>;
}

export const proStore = requireOptionalNativeModule<ProStoreNative>('ProStore');
