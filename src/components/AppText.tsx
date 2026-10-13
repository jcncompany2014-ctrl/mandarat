import React, { createContext, forwardRef, useContext } from 'react';
import {
  Animated, Platform, StyleSheet, Text as RNText, TextInput as RNTextInput,
  type TextInputProps, type TextProps, type TextStyle,
} from 'react-native';
import { faceFor, isPretendard } from '../theme/fonts';

/**
 * 앱 전체 글자 — fontWeight를 그 굵기의 Pretendard 파일로 바꿔 끼운다.
 * (커스텀 서체는 굵기마다 파일이 달라, 그냥 fontWeight만 주면 안드로이드에서 가짜 굵게가 되거나 웹·iOS에서 엉뚱한 굵기가 된다)
 * - 다른 서체를 직접 지정하면 그대로 둔다.
 * - 중첩된 글자에 굵기를 따로 주지 않으면 부모 서체를 그대로 물려받는다.
 * - 큰 글자는 살짝 좁게(-0.2 ~ -0.4) — 한글 제목이 단단해 보이도록. 직접 준 자간이 있으면 그것을 따른다.
 * - 한글은 어절 단위로 줄을 바꾼다("다정/한 나" 대신 "다정한 나"). 한 줄에 다 안 들어가는 긴 어절만 글자 단위로 끊긴다.
 * - 시스템 글자 크기(더 큰 텍스트)를 따르되 1.35배까지 — 표준 크기 단계는 모두 반영하고,
 *   손쉬운 사용의 아주 큰 단계에서 격자 칸·탭바·버튼처럼 크기가 정해진 곳이 깨지지 않게 한다.
 */
const Nested = createContext(false);

// 웹 미리보기용 — RN 스타일 타입에는 없지만 react-native-web이 그대로 CSS로 넘긴다
const KEEP_ALL = Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as unknown as TextStyle) : null;
const MAX_SCALE = 1.35;

function typeset(style: TextProps['style'], nested: boolean): TextStyle | null {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fam = flat.fontFamily;
  if (fam && !isPretendard(fam)) return null;
  const weight = flat.fontWeight;
  if (nested && !fam && weight == null) return null;
  const out: TextStyle = {
    fontFamily: weight != null || !fam ? faceFor(weight) : fam,
    fontWeight: 'normal',
  };
  if (!nested && flat.letterSpacing == null && typeof flat.fontSize === 'number') {
    if (flat.fontSize >= 20) out.letterSpacing = -0.4;
    else if (flat.fontSize >= 15) out.letterSpacing = -0.2;
  }
  return out;
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, children, lineBreakStrategyIOS = 'hangul-word', maxFontSizeMultiplier = MAX_SCALE, ...rest }, ref) {
  const nested = useContext(Nested);
  const extra = typeset(style, nested);
  return (
    <RNText
      ref={ref}
      {...rest}
      lineBreakStrategyIOS={lineBreakStrategyIOS}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[KEEP_ALL && !nested ? KEEP_ALL : null, style, extra]}
    >
      {nested ? children : <Nested.Provider value>{children}</Nested.Provider>}
    </RNText>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, maxFontSizeMultiplier = MAX_SCALE, ...rest }, ref) {
  const extra = typeset(style as TextProps['style'], false);
  return <RNTextInput ref={ref} {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier} style={extra ? [style, extra] : style} />;
});

export const AnimatedText = Animated.createAnimatedComponent(Text);
