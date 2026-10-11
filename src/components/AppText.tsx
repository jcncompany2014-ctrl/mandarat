import React, { createContext, forwardRef, useContext } from 'react';
import {
  Animated, StyleSheet, Text as RNText, TextInput as RNTextInput,
  type TextInputProps, type TextProps, type TextStyle,
} from 'react-native';
import { faceFor, isPretendard } from '../theme/fonts';

/**
 * 앱 전체 글자 — fontWeight를 그 굵기의 Pretendard 파일로 바꿔 끼운다.
 * (커스텀 서체는 굵기마다 파일이 달라, 그냥 fontWeight만 주면 안드로이드에서 가짜 굵게가 되거나 웹·iOS에서 엉뚱한 굵기가 된다)
 * - 다른 서체를 직접 지정하면 그대로 둔다.
 * - 중첩된 글자에 굵기를 따로 주지 않으면 부모 서체를 그대로 물려받는다.
 * - 큰 글자는 살짝 좁게(-0.2 ~ -0.4) — 한글 제목이 단단해 보이도록. 직접 준 자간이 있으면 그것을 따른다.
 */
const Nested = createContext(false);

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

export const Text = forwardRef<RNText, TextProps>(function Text({ style, children, ...rest }, ref) {
  const nested = useContext(Nested);
  const extra = typeset(style, nested);
  return (
    <RNText ref={ref} {...rest} style={extra ? [style, extra] : style}>
      {nested ? children : <Nested.Provider value>{children}</Nested.Provider>}
    </RNText>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const extra = typeset(style as TextProps['style'], false);
  return <RNTextInput ref={ref} {...rest} style={extra ? [style, extra] : style} />;
});

export const AnimatedText = Animated.createAnimatedComponent(Text);
