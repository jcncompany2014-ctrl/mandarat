// 화면 모드(자동 · 밝게 · 어둡게)와 그 팔레트 — docs/design/build-plan.md §2.4 · §4.2.
// 기기마다의 고르기(AsyncStorage STORE_KEYS.look)라 문서 · 백업 · iCloud와 따로 논다(언어처럼).
// LookProvider는 MandaratProvider 안, Gate 앞(App.tsx)에 선다 — 저장된 모드를 네이티브 스플래시가 덮고 있는 동안 읽고,
// 이 판을 처음 여는 기기에서는 문서를 다 읽은 뒤 예전 종이 무드(settings.mood)에서 한 번 정해 적어 둔다(lookFromMood).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Appearance, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { STORE_KEYS } from '../lib/contracts';
import { DEFAULT_LOOK, isDark, lookFromMood, parseLook, type Look } from '../lib/look';
import { useActions, useReady } from '../store/MandaratContext';
import { PALETTE, type PaletteValue } from './moods';

const WEB = Platform.OS === 'web';
/** 앱이 뒤로 갈 때 iOS가 잠깐 반대 모드를 알린다(두 모드로 스냅샷을 찍는다) — 그동안은 이만큼 기다렸다 따른다 */
const SCHEME_SETTLE_MS = 150;

// ── 저장 ─────────────────────────────────────────────────────────────────────

let storedRead: Promise<Look | null> | null = null;

/** 저장된 화면 모드 — 없거나 읽지 못하면 null. 한 번만 읽는다(LookProvider가 문서를 기다리는 동안 미리 읽어 둔다) */
export function readStoredLook(): Promise<Look | null> {
  storedRead ??= AsyncStorage.getItem(STORE_KEYS.look).then(parseLook, () => null);
  return storedRead;
}

/**
 * 화면 모드를 읽는다 — 저장된 값이 있으면 그것, 없으면(이 판을 처음 여는 기기) 예전 종이 무드에서 정해 적어 두고 돌려준다.
 * 그 뒤로는 저장된 값만 본다.
 */
export async function readLook(mood: unknown): Promise<Look> {
  const saved = await readStoredLook();
  if (saved) return saved;
  const look = lookFromMood(mood);
  await writeLook(look);
  return look;
}

export async function writeLook(look: Look): Promise<void> {
  storedRead = Promise.resolve(look);
  try {
    await AsyncStorage.setItem(STORE_KEYS.look, look);
  } catch {
    // 저장하지 못해도 이번 실행에서는 고른 모드로 보인다
  }
}

/** 시스템(알림창 · 키보드 · 공유 시트)에도 같은 모드를 — auto는 시스템을 따르게 덮어쓰기를 푼다. 웹에서는 하지 않는다 */
function applyScheme(look: Look): void {
  if (WEB) return;
  try {
    Appearance.setColorScheme(look === 'auto' ? 'unspecified' : look);
  } catch {
    // 지원하지 않는 OS 버전 — 시스템 설정을 그대로 따른다
  }
}

/**
 * 시스템 모드 — 앱이 앞에 있으면 바로 따르고, 뒤에 있는 동안의 바뀜은 잠깐 기다렸다 따른다
 * (iOS가 뒤로 갈 때 반대 모드를 잠깐 알렸다 되돌리는 것을 무시한다).
 */
function useSystemScheme(): 'light' | 'dark' {
  const raw = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [settled, setSettled] = useState<'light' | 'dark'>(raw);
  useEffect(() => {
    if (raw === settled) return;
    if (WEB || AppState.currentState === 'active') {
      setSettled(raw);
      return;
    }
    const t = setTimeout(() => setSettled(raw), SCHEME_SETTLE_MS);
    return () => clearTimeout(t);
  }, [raw, settled]);
  return settled;
}

// ── 공급자 ────────────────────────────────────────────────────────────────────

interface LookValue {
  look: Look;
  setLook: (look: Look) => void;
}

const LookCtx = createContext<LookValue>({ look: DEFAULT_LOOK, setLook: () => {} });
// 팔레트는 따로 — 모드가 바뀔 때만 새 값(PALETTE의 두 객체 중 하나)이라 체크 · 글쓰기에는 화면이 다시 그려지지 않는다
const PaletteCtx = createContext<PaletteValue>(PALETTE.light);

/**
 * 화면 모드를 읽어 팔레트를 내려 준다. 모드를 정하기 전에는 fallback(스플래시)을 그린다.
 * 시스템 쪽: 모드에 맞춰 Appearance 덮어쓰기(웹 제외), 루트 뷰 바탕(SystemUI), 상태 막대 글씨.
 */
export function LookProvider({ fallback = null, children }: { fallback?: React.ReactNode; children: React.ReactNode }) {
  const ready = useReady();
  const { getDoc } = useActions();
  const [look, setLookState] = useState<Look | null>(null);

  useEffect(() => {
    if (look) return;
    let live = true;
    const settle = (l: Look) => {
      if (!live) return;
      applyScheme(l);
      setLookState(l);
    };
    readStoredLook().then((saved) => {
      if (saved) return settle(saved);
      // 이 판을 처음 여는 기기 — 문서(예전 무드)를 다 읽은 뒤 한 번 정한다
      if (!ready || !live) return;
      return readLook(getDoc().settings.mood).then(settle);
    });
    return () => {
      live = false;
    };
  }, [look, ready, getDoc]);

  const setLook = useCallback((l: Look) => {
    // auto로 돌아갈 때는 덮어쓰기를 먼저 풀어야 다음 그림이 시스템 모드를 읽는다(§4.2)
    applyScheme(l);
    setLookState(l);
    void writeLook(l);
  }, []);

  const shown = look ?? DEFAULT_LOOK;
  useEffect(() => {
    applyScheme(shown);
  }, [shown]);

  const scheme = useSystemScheme();
  const dark = isDark(shown, scheme);
  const palette = dark ? PALETTE.dark : PALETTE.light;
  const paper = palette.paper;

  // 루트 뷰 바탕을 지금 종이 색으로 — 키보드 · 시트가 오르내릴 때 드러나는 가장자리가 반대 색으로 튀지 않게
  useEffect(() => {
    if (WEB) return;
    SystemUI.setBackgroundColorAsync(paper).catch(() => {});
  }, [paper]);

  const value = useMemo<LookValue>(() => ({ look: shown, setLook }), [shown, setLook]);

  return (
    <LookCtx.Provider value={value}>
      <PaletteCtx.Provider value={palette}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {look ? children : fallback}
      </PaletteCtx.Provider>
    </LookCtx.Provider>
  );
}

/** 설정 › 보기 › 화면 모드 — 지금 고른 모드와 바꾸는 함수 */
export function useLook(): LookValue {
  return useContext(LookCtx);
}

/** 지금 팔레트 — 화면 모드(또는 시스템 모드)가 바뀔 때만 새 객체. 대비 증가는 usePalette()가 더한다 */
export function usePaletteValue(): PaletteValue {
  return useContext(PaletteCtx);
}
