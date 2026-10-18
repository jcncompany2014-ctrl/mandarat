// 말 바꾸기 — React 쪽. 앱을 열 때 언어를 한 번 정하고(LangBoot), 언어가 바뀌면 그 아래를 통째로 다시 그린다(LangRoot).
// 화면은 const m = useMsg(); 한 번 부르고 m.<이름공간>.<키>를 읽는다.
import React, { Fragment, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { crash } from '../lib/crash';
import { lang, langFromQuery, msg, resolveLang, setLang, subscribeLang, I18N_READY, type Messages } from './index';
import { readLangPref, writeLangPref } from './prefs';
import type { Lang, LangPref } from './types';

/** 기기 언어 목록(languageTag 'ja-JP' …) — 읽지 못하면 빈 목록 */
function deviceLocales(): string[] {
  try {
    return getLocales().map((l) => l.languageTag || l.languageCode || '');
  } catch {
    return [];
  }
}

/** 웹 주소의 ?lang= — 웹에서만, 저장하지 않는다 */
function queryLang(): Lang | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return langFromQuery(window.location?.search);
}

/** 웹: <html lang="…">과 탭 제목(앱 이름)을 지금 언어로 */
function markDocument(l: Lang): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.lang = l;
  document.title = msg(l).settings.appName;
}

// 앱을 여는 순간 읽기 시작한다 — 서체를 불러오는 동안 같이 돈다(App.tsx가 crash.init() 옆에서 부른다)
let prefRead: Promise<LangPref> | null = null;

/** 저장된 언어 고르기 — 처음 부를 때 한 번만 읽고, 다음부터는 같은 약속을 돌려준다 */
export function prefetchLangPref(): Promise<LangPref> {
  return (prefRead ??= readLangPref());
}

/** 지금 언어 — 바뀌면 다시 그린다 */
export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, lang, lang);
}

/** 지금 언어의 바구니 */
export function useMsg(): Messages {
  return msg(useLang());
}

/**
 * 앱을 열 때 저장된 고르기·기기 언어·?lang=으로 언어를 정한 뒤에야 children을 그린다(그동안 fallback).
 * 문서 저장소(MandaratProvider)보다 바깥에 둔다 — 처음 여는 날 blankDoc()이 영역 이름을 이 언어로 적는다.
 */
export function LangBoot({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    prefetchLangPref().then((pref) => {
      if (!alive) return;
      const l = resolveLang(pref, deviceLocales(), I18N_READY, queryLang());
      setLang(l);
      markDocument(l);
      crash.tag('lang', l);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return <>{ready ? children : fallback ?? null}</>;
}

/** 언어가 바뀌면 아래를 통째로 다시 그린다(key = 언어) — 문서 저장소 아래, UI 위 */
export function LangRoot({ children }: { children: ReactNode }) {
  const l = useLang();
  return <Fragment key={l}>{children}</Fragment>;
}

// ── 사용자가 언어를 고를 때 ─────────────────────────────────────────────────
type Chosen = (from: Lang, to: Lang) => void;
const chosenListeners = new Set<Chosen>();
let resumeHint: 'settings' | undefined;

/**
 * 사용자가 언어를 골랐을 때만 — 기본 영역 이름 바꾸기(X-I) 같은 일을 여기에 건다.
 * 앱을 열 때 정하는 언어(LangBoot)에는 부르지 않는다. 돌려준 함수로 그만 듣는다.
 */
export function onLangChosen(cb: Chosen): () => void {
  chosenListeners.add(cb);
  return () => {
    chosenListeners.delete(cb);
  };
}

/** 다시 그린 뒤 돌아갈 화면 — 한 번 읽으면 지운다(UIProvider initialScreen) */
export function takeResumeHint(): 'settings' | undefined {
  const h = resumeHint;
  resumeHint = undefined;
  return h;
}

/**
 * 설정에서 언어를 고른다 — 저장 → 돌아올 화면을 설정으로 → 언어 바꾸기(LangRoot가 다시 그린다) → 웹 <html lang> → 오류 수집 태그.
 * 고른 결과 언어가 같으면 저장만 한다.
 */
export async function chooseLang(pref: LangPref): Promise<Lang> {
  await writeLangPref(pref);
  const from = lang();
  const to = resolveLang(pref, deviceLocales(), I18N_READY);
  if (to === from) return to;
  resumeHint = 'settings';
  setLang(to);
  markDocument(to);
  crash.tag('lang', to);
  for (const cb of [...chosenListeners]) cb(from, to);
  return to;
}
