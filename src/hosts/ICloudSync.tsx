// iCloud 맞추기 — 이 기기의 복제본을 쓰고 다른 기기의 것을 합친다(엔진: src/lib/syncEngine.ts, 규칙: docs/v2/V4-A.md).
// 그리지 않는 손잡이 — 늘 null을 돌려준다. iOS에서 기기 모듈(icloud)과 저장소 손잡이(useSyncPort)가 있을 때만 움직이고,
// 웹 · 안드로이드 · Expo Go에서는 아무것도 하지 않는다(맞추기 상태는 'off').
// 때: 처음(열쇠 견주기 → 켜져 있으면 받고 올리기) · 질의의 onChange와 앱이 앞으로 올 때 받기 ·
// 이 기기에서 고친 뒤 5초 몰아서 올리기 · 뒤로 갈 때 곧바로 올리기. 스스로 묻지 않는다(고르기는 화면이 연다).
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { icloud } from '../../modules/icloud-sync';
import { useDoc, useSyncPort } from '../store/MandaratContext';
import { crash } from '../lib/crash';
import { createSyncEngine, PUSH_DEBOUNCE_MS, type SyncEngine, type SyncIO } from '../lib/syncEngine';
import { bindSyncDriver, publishSyncStatus } from '../lib/syncStatus';

const HAS_SYNC = Platform.OS === 'ios' && icloud !== null;

export function ICloudSync() {
  const port = useSyncPort();
  const { doc } = useDoc();
  const engine = useRef<SyncEngine | null>(null);

  useEffect(() => {
    const native = icloud;
    if (!HAS_SYNC || !port || !native) return;
    const io: SyncIO = {
      status: () => native.status(),
      deviceKey: () => native.deviceKey(),
      start: () => native.start(),
      stop: () => native.stop(),
      list: () => native.list(),
      read: (name) => native.read(name),
      write: (name, json) => native.write(name, json),
      remove: (name) => native.remove(name),
      now: () => Date.now(),
    };
    const e = createSyncEngine({
      port,
      io,
      random: Math.random,
      emit: publishSyncStatus,
      crumb: (phase) => crash.crumb('sync', phase),
    });
    engine.current = e;
    // 듣기를 먼저 건다 — start()의 첫 모으기를 놓치지 않게
    const subs = [
      native.addListener('onChange', () => e.changed()),
      native.addListener('onAccountChange', (s) => void e.accountChanged(s)),
    ];
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void e.foreground();
      else if (state === 'background') void e.background();
    });
    const unbind = bindSyncDriver(e);
    void e.boot();
    return () => {
      for (const s of subs) s.remove();
      app.remove();
      unbind();
      engine.current = null;
      void e.dispose();
    };
  }, [port]);

  // 이 기기에서 고쳤다(받아 합친 것도) — 5초 몰아서 올린다. 같은 내용이면 엔진이 쓰지 않는다
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const t = setTimeout(() => void e.local(), PUSH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [doc]);

  return null;
}
