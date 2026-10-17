import React, { createContext, forwardRef, useContext } from 'react';
import {
  Animated, Platform, StyleSheet, Text as RNText, TextInput as RNTextInput,
  type TextInputProps, type TextProps, type TextStyle,
} from 'react-native';
import { getLocales } from 'expo-localization';
import { faceFor, heavierFace, isPretendard, PRETENDARD } from '../theme/fonts';
import { useBoldText } from '../lib/useReducedMotion';
import { lang, type Lang } from '../i18n';

/**
 * 앱 전체 글자 — fontWeight를 그 굵기의 Pretendard 파일로 바꿔 끼운다.
 * (커스텀 서체는 굵기마다 파일이 달라, 그냥 fontWeight만 주면 안드로이드에서 가짜 굵게가 되거나 웹·iOS에서 엉뚱한 굵기가 된다)
 * - 다른 서체를 직접 지정하면 그대로 둔다.
 * - 중첩된 글자에 굵기를 따로 주지 않으면 부모 서체를 그대로 물려받는다.
 * - 큰 글자는 살짝 좁게(-0.2 ~ -0.4) — 한글 제목이 단단해 보이도록. 직접 준 자간이 있으면 그것을 따른다.
 * - 한글은 어절 단위로 줄을 바꾼다("다정/한 나" 대신 "다정한 나"). 한 줄에 다 안 들어가는 긴 어절만 글자 단위로 끊긴다.
 * - 시스템 글자 크기(더 큰 텍스트)는 본문을 2배까지 따른다(WCAG 200%).
 *   11pt 이하 작은 글자는 대부분 크기가 정해진 자리(탭바·링·격자 칸·배지)에 있어 1.3배까지만 — 칸이 깨지지 않게.
 *   그 밖에 정해진 칸 안의 글자는 쓰는 곳에서 maxFontSizeMultiplier를 직접 준다.
 * - iOS '굵은 텍스트'가 켜지면 모든 글자가 한 단계 굵은 파일로(faceFor의 bold) — 앱 서체는 OS가 굵게 해 주지 않는다.
 * - 언어(lang())마다 짜는 법이 다르다 — 한국어는 위 그대로.
 *   일본어: 가나·한자가 든 글은 일본어 서체(iOS Hiragino Sans · 웹 글꼴 목록 · 안드로이드 시스템 서체)에 같은 한 단계 가벼운 굵기,
 *   자간 0, 줄바꿈은 iOS 'standard' · 웹 word-break normal + line-break strict(금칙).
 *   영어: Pretendard 그대로, 줄바꿈만 iOS 'standard' · 웹 word-break normal.
 *   영문·숫자만 있는 글(가나·한자가 없는 글)은 어느 언어에서나 Pretendard.
 *   가나·한자 없이 한글이 든 글(사용자가 쓴 한국어)은 어느 언어에서나 한국어처럼 어절로 줄을 바꾼다(breakLang).
 * - 앱 언어가 기기 언어와 다르면 iOS 화면 읽기에 앱 언어를 알려 준다(accessibilityLanguage).
 * - 언어를 바꾸면 LangRoot가 그 아래를 통째로 다시 그리므로, 글자마다 언어를 구독하지 않고 그릴 때 lang()을 읽는다.
 */
const Nested = createContext(false);

// 웹 미리보기용 — RN 스타일 타입에는 없지만 react-native-web이 그대로 CSS로 넘긴다
const webStyle = (v: Record<string, string>) => v as unknown as TextStyle;
const KEEP_ALL = Platform.OS === 'web' ? webStyle({ wordBreak: 'keep-all' }) : null;
/** 웹의 언어별 줄바꿈 — 한국어는 어절(keep-all), 일본어는 글자마다 끊되 금칙을 지키고(strict), 영어는 단어 */
const WEB_BREAK: Record<Lang, TextStyle | null> = {
  ko: KEEP_ALL,
  ja: Platform.OS === 'web' ? webStyle({ wordBreak: 'normal', lineBreak: 'strict' }) : null,
  en: Platform.OS === 'web' ? webStyle({ wordBreak: 'normal' }) : null,
};
const MAX_SCALE = 2;
const SMALL_SCALE = 1.3;
const scaleCap = (style: TextProps['style']) => {
  const fs = (StyleSheet.flatten(style) ?? {}).fontSize;
  return typeof fs === 'number' && fs <= 11 ? SMALL_SCALE : MAX_SCALE;
};

/** 웹의 일본어 글꼴 목록 — 맥·iOS Hiragino, 그다음 Noto Sans JP, 윈도 Yu Gothic UI · Meiryo */
export const JA_WEB_STACK = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic UI",Meiryo,sans-serif';

/** 가나·한자·일본어 문장부호·전각 기호 — 이것이 든 글만 일본어 서체로 짠다 */
const JA_SCRIPT = /[\u3000-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;

/** 글자 안의 글(중첩 글자까지) — 무엇인지 알 수 없는 아이는 빈 글로 본다 */
export function plainText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(plainText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return plainText((children.props as { children?: React.ReactNode }).children);
  }
  return '';
}

/** 일본어 서체가 필요한 글인가(가나·한자가 있다) — 영문·숫자·한글만 있으면 Pretendard */
export function needsJaFace(text: string): boolean {
  return JA_SCRIPT.test(text);
}

const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;

/**
 * 줄바꿈을 정할 언어 — 가나·한자 없이 한글이 든 글(사용자가 쓴 한국어)은 어느 언어에서나 한국어처럼 어절로 바꾼다
 * (일본어·영어 앱에서 '1만보 걷 / 기'가 되지 않게). labelFit의 breakUnits도 한글 어절은 끊지 않는다.
 */
export function breakLang(l: Lang, text: string): Lang {
  return l !== 'ko' && !needsJaFace(text) && HANGUL.test(text) ? 'ko' : l;
}

/** 언어마다 짜는 법 — lang: 앱 언어, os: Platform.OS, latin: 가나·한자가 없는 글(Pretendard를 지킨다) */
export type TypesetCtx = { lang: Lang; os: string; latin: boolean };
const KO_CTX: TypesetCtx = { lang: 'ko', os: Platform.OS, latin: true };

/** Pretendard 파일 → 그 굵기(400·500·600·700) */
const FACE_WEIGHT: Record<string, number> = {
  [PRETENDARD[400]]: 400, [PRETENDARD[500]]: 500, [PRETENDARD[600]]: 600, [PRETENDARD[700]]: 700,
};

/**
 * 일본어 서체 — Pretendard에서 고른 굵기(이미 한 단계 가벼운 굵기)를 그대로 옮긴다. 자간은 0.
 * iOS Hiragino Sans는 W3 · W6 · W7 세 굵기뿐 — Regular → W3, Medium·SemiBold → W6, Bold → W7.
 */
function jaFace(face: string, os: string): TextStyle {
  const w = FACE_WEIGHT[face] ?? 400;
  if (os === 'ios') return { fontFamily: 'Hiragino Sans', fontWeight: w >= 700 ? '700' : w >= 500 ? '600' : '400', letterSpacing: 0 };
  const fontWeight = String(w) as TextStyle['fontWeight'];
  if (os === 'web') return { fontFamily: JA_WEB_STACK, fontWeight, letterSpacing: 0 };
  return { fontFamily: 'sans-serif', fontWeight, letterSpacing: 0 };
}

/**
 * 글자 한 덩어리의 서체·굵기·자간(순수 — 테스트 대상). 덮어쓸 것이 없으면 null.
 * ctx를 주지 않으면 한국어(예전 그대로).
 */
export function typeset(style: TextProps['style'], nested: boolean, bold: boolean, ctx: TypesetCtx = KO_CTX): TextStyle | null {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fam = flat.fontFamily;
  if (fam && !isPretendard(fam)) return null;
  const weight = flat.fontWeight;
  // 굵기를 따로 주지 않은 중첩 글자는 부모 서체를 물려받는다(부모가 이미 굵은 텍스트를 따랐다)
  if (nested && !fam && weight == null) return null;
  const face = weight != null || !fam ? faceFor(weight, bold) : bold ? heavierFace(fam) : fam;
  if (ctx.lang === 'ja' && !ctx.latin) return jaFace(face, ctx.os);
  const out: TextStyle = { fontFamily: face, fontWeight: 'normal' };
  if (!nested && flat.letterSpacing == null && typeof flat.fontSize === 'number') {
    if (flat.fontSize >= 20) out.letterSpacing = -0.4;
    else if (flat.fontSize >= 15) out.letterSpacing = -0.2;
  }
  return out;
}

/** 언어마다 iOS 줄바꿈 — 한국어는 어절(hangul-word), 일본어·영어는 기본(standard) */
export function lineBreakFor(l: Lang): TextProps['lineBreakStrategyIOS'] {
  return l === 'ko' ? 'hangul-word' : 'standard';
}

/** 웹의 언어별 줄바꿈 스타일(웹이 아니면 null) */
export function webBreakFor(l: Lang): TextStyle | null {
  return WEB_BREAK[l];
}

let device: string | null | undefined;
/** 기기의 첫 언어(languageCode) — 한 번만 읽는다 */
function deviceLang(): string | null {
  if (device === undefined) {
    try {
      device = getLocales()[0]?.languageCode ?? null;
    } catch {
      device = null;
    }
  }
  return device;
}

/**
 * iOS 화면 읽기에 알려 줄 언어 — 앱 언어가 기기의 첫 언어와 다를 때만(같으면 undefined).
 * 일본어 앱을 한국어 기기에서 쓸 때 일본어 목소리로 읽게 한다. iOS에만 있는 속성이라 다른 곳에서는 undefined.
 */
export function a11yLang(l: Lang = lang(), os: string = Platform.OS, dev: string | null = deviceLang()): Lang | undefined {
  return os === 'ios' && l !== dev ? l : undefined;
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, children, lineBreakStrategyIOS, maxFontSizeMultiplier, accessibilityLanguage, ...rest }, ref) {
  const nested = useContext(Nested);
  const bold = useBoldText();
  const l = lang();
  const text = l === 'ko' ? '' : plainText(children);
  const ctx: TypesetCtx = l === 'ko' ? KO_CTX : { lang: l, os: Platform.OS, latin: !needsJaFace(text) };
  const extra = typeset(style, nested, bold, ctx);
  const bl = l === 'ko' ? l : breakLang(l, text);
  const brk = nested ? null : WEB_BREAK[bl];
  return (
    <RNText
      ref={ref}
      {...rest}
      accessibilityLanguage={accessibilityLanguage ?? (nested ? undefined : a11yLang(l))}
      lineBreakStrategyIOS={lineBreakStrategyIOS ?? lineBreakFor(bl)}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? scaleCap(style)}
      style={[brk, style, extra]}
    >
      {nested ? children : <Nested.Provider value>{children}</Nested.Provider>}
    </RNText>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, maxFontSizeMultiplier = MAX_SCALE, accessibilityLanguage, ...rest }, ref) {
  const bold = useBoldText();
  const l = lang();
  // 입력 칸은 무엇을 쓸지 모른다 — 일본어 앱이면 일본어 서체로(한자가 한국식 글자로 그려지지 않게)
  const extra = typeset(style as TextProps['style'], false, bold, l === 'ko' ? KO_CTX : { lang: l, os: Platform.OS, latin: false });
  return (
    <RNTextInput
      ref={ref}
      {...rest}
      accessibilityLanguage={accessibilityLanguage ?? a11yLang(l)}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={extra ? [style, extra] : style}
    />
  );
});

export const AnimatedText = Animated.createAnimatedComponent(Text);
