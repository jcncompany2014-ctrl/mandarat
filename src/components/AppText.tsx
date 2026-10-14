import React, { createContext, forwardRef, useContext } from 'react';
import {
  Animated, Platform, StyleSheet, Text as RNText, TextInput as RNTextInput,
  type TextInputProps, type TextProps, type TextStyle,
} from 'react-native';
import { faceFor, heavierFace, isPretendard } from '../theme/fonts';
import { useBoldText } from '../lib/useReducedMotion';

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
 */
const Nested = createContext(false);

// 웹 미리보기용 — RN 스타일 타입에는 없지만 react-native-web이 그대로 CSS로 넘긴다
const KEEP_ALL = Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as unknown as TextStyle) : null;
const MAX_SCALE = 2;
const SMALL_SCALE = 1.3;
const scaleCap = (style: TextProps['style']) => {
  const fs = (StyleSheet.flatten(style) ?? {}).fontSize;
  return typeof fs === 'number' && fs <= 11 ? SMALL_SCALE : MAX_SCALE;
};

function typeset(style: TextProps['style'], nested: boolean, bold: boolean): TextStyle | null {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fam = flat.fontFamily;
  if (fam && !isPretendard(fam)) return null;
  const weight = flat.fontWeight;
  // 굵기를 따로 주지 않은 중첩 글자는 부모 서체를 물려받는다(부모가 이미 굵은 텍스트를 따랐다)
  if (nested && !fam && weight == null) return null;
  const out: TextStyle = {
    fontFamily: weight != null || !fam ? faceFor(weight, bold) : bold ? heavierFace(fam) : fam,
    fontWeight: 'normal',
  };
  if (!nested && flat.letterSpacing == null && typeof flat.fontSize === 'number') {
    if (flat.fontSize >= 20) out.letterSpacing = -0.4;
    else if (flat.fontSize >= 15) out.letterSpacing = -0.2;
  }
  return out;
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, children, lineBreakStrategyIOS = 'hangul-word', maxFontSizeMultiplier, ...rest }, ref) {
  const nested = useContext(Nested);
  const bold = useBoldText();
  const extra = typeset(style, nested, bold);
  return (
    <RNText
      ref={ref}
      {...rest}
      lineBreakStrategyIOS={lineBreakStrategyIOS}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? scaleCap(style)}
      style={[KEEP_ALL && !nested ? KEEP_ALL : null, style, extra]}
    >
      {nested ? children : <Nested.Provider value>{children}</Nested.Provider>}
    </RNText>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, maxFontSizeMultiplier = MAX_SCALE, ...rest }, ref) {
  const bold = useBoldText();
  const extra = typeset(style as TextProps['style'], false, bold);
  return <RNTextInput ref={ref} {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier} style={extra ? [style, extra] : style} />;
});

export const AnimatedText = Animated.createAnimatedComponent(Text);
