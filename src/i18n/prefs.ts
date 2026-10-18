// 언어 고르기 저장 — 기기마다(AsyncStorage 'mandarat:lang:v1'). 백업·iCloud에는 들어가지 않는다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORE_KEYS } from '../lib/contracts';
import type { LangPref } from './types';

function isPref(v: unknown): v is LangPref {
  return v === 'system' || v === 'ko' || v === 'ja' || v === 'en';
}

/** 저장된 고르기 — 없거나 읽지 못하면 'system' */
export async function readLangPref(): Promise<LangPref> {
  try {
    const v = await AsyncStorage.getItem(STORE_KEYS.lang);
    return isPref(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export async function writeLangPref(pref: LangPref): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEYS.lang, pref);
  } catch {
    // 저장하지 못해도 이번 실행에서는 고른 언어로 보인다
  }
}
