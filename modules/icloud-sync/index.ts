// iCloud 맞추기 — 로컬 모듈(ios/ICloudSyncModule.swift)의 JS 얼굴. 기기마다 복제본 파일 하나(Sync/v1/<dev>.jsonz)를
// iCloud 컨테이너의 숨은 Data 자리에 쓰고 읽고 지켜본다. 합치기는 src/lib/sync*.ts(순수 TS)가 한다.
// 웹 · 안드로이드 · Node · Expo Go에는 이 모듈이 없어서 icloud가 null이다 — 부르는 쪽은 늘 null을 먼저 본다(아무 일도 하지 않는다).
import { requireOptionalNativeModule, type NativeModule } from 'expo';

/** 거절(reject)의 code — E_NO_ACCOUNT · E_BAD_NAME · E_NOT_FOUND · E_TIMEOUT · E_CORRUPT · E_IO */
export type ICloudErrorCode = 'E_NO_ACCOUNT' | 'E_BAD_NAME' | 'E_NOT_FOUND' | 'E_TIMEOUT' | 'E_CORRUPT' | 'E_IO';

export interface ICloudStatus {
  /** iCloud 계정이 있고 컨테이너를 찾았다(로그아웃 · iCloud Drive 끔이면 false — 둘은 가려낼 수 없다) */
  available: boolean;
  /** 계정 지문(ubiquityIdentityToken의 SHA-256 앞 16글자) — 계정이 없으면 null. 바뀌면 다른 계정이다 */
  account: string | null;
}

export interface ICloudFile {
  /** 컨테이너 안 상대 경로 "Sync/v1/<dev>.jsonz" — syncFile.ts replicaName/devOfName과 같은 꼴 */
  name: string;
  /** 바뀐 때(ms) */
  modified: number;
  /** 누른 파일 크기(바이트) */
  size: number;
  /** 이 기기에 최신본이 내려와 있다 */
  downloaded: boolean;
}

type ICloudSyncEvents = {
  /** 질의가 모으기를 마쳤을 때와 파일이 바뀔 때마다 — 지금 있는 복제본 이름 전부 */
  onChange: (e: { names: string[] }) => void;
  /** NSUbiquityIdentityDidChange — 로그아웃 · 다른 계정 · iCloud Drive 끔 */
  onAccountChange: (e: ICloudStatus) => void;
};

export declare class ICloudSyncNative extends NativeModule<ICloudSyncEvents> {
  status(): Promise<ICloudStatus>;
  /**
   * 메타데이터 질의를 시작한다(onChange가 온다). 이미 돌고 있으면 지금 가진 이름으로 onChange를 한 번 더 보낸다.
   * 듣기(addListener)를 먼저 걸고 부른다. 컨테이너가 없으면 false.
   */
  start(): Promise<boolean>;
  stop(): Promise<void>;
  /** 질의가 모은 파일 — start 뒤 첫 onChange 전에는 빈 배열이다 */
  list(): Promise<ICloudFile[]>;
  /** [현재 내용, 풀리지 않은 충돌본 내용…] — 내려받기를 최대 10초 기다린다. 모두 decodeReplica로 읽어 합친다 */
  read(name: string): Promise<string[]>;
  /** 눌러서 조율된 원자적 쓰기 — 앱이 뒤로 가도 배경 작업으로 끝난다 */
  write(name: string, json: string): Promise<void>;
  /** 없는 파일이면 그냥 끝난다 */
  remove(name: string): Promise<void>;
  /** 백업에서 빠진 이 기기 열쇠(UUID 소문자) — SyncMeta.vendor와 견주어 다르면 rekey */
  deviceKey(): Promise<string>;
}

export const icloud = requireOptionalNativeModule<ICloudSyncNative>('ICloudSync');
