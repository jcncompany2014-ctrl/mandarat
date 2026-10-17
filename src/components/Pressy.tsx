import React, { useRef } from 'react';
import { Animated, Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { SPRING } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';
import { lang } from '../i18n';
import { a11yLang } from './AppText';

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** 눌렀을 때 줄어드는 정도 — 버튼 0.96, 카드 0.98 */
  scaleTo?: number;
};

/**
 * 눌렀을 때 살짝 들어갔다가 탄력 있게 돌아오는 공통 버튼.
 * 앱 전체의 손끝 감촉을 하나로 맞춘다. (style에 transform을 넣지 말 것 — 눌림 크기가 덮어쓴다)
 * 앱 언어가 기기 언어와 다르면 iOS 화면 읽기에 앱 언어를 알려 준다(버튼 이름표도 그 언어 목소리로).
 */
export function Pressy({ style, scaleTo = 0.97, onPressIn, onPressOut, children, accessibilityLanguage, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => {
    if (reducedMotion()) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, ...SPRING.press }).start();
  };
  return (
    <APressable
      {...rest}
      accessibilityLanguage={accessibilityLanguage ?? a11yLang(lang())}
      onPressIn={(e: GestureResponderEvent) => {
        to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        to(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </APressable>
  );
}
