import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Pressy } from '../components/Pressy';
import { Reveal } from '../components/Reveal';
import { readableOn, SEMANTIC } from '../theme/palette';
import { shadow } from '../theme/shadow';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, overallStreak } from '../store/MandaratContext';
import { success } from '../lib/haptics';
import { useReducedMotion } from '../lib/useReducedMotion';

/** 3×3 — 아홉 칸이 차례로 영역 색으로 채워진다(오늘을 다 채웠다는 뜻) */
function FilledGrid({ colors, animate }: { colors: string[]; animate: boolean }) {
  const cells = useRef(colors.map(() => new Animated.Value(animate ? 0 : 1))).current;
  useEffect(() => {
    if (!animate) return;
    // 가운데부터, 이어서 바깥 칸을 시계 방향으로
    const order = [4, 0, 1, 2, 5, 8, 7, 6, 3];
    Animated.stagger(55, order.map((i) => Animated.spring(cells[i], { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 220 }))).start();
  }, [animate, cells]);
  return (
    <View style={{ width: 96, height: 96, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {colors.map((c, i) => (
        <Animated.View
          key={i}
          style={{
            width: 28, height: 28, borderRadius: 8, backgroundColor: c,
            opacity: cells[i],
            transform: [{ scale: cells[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          }}
        />
      ))}
    </View>
  );
}

export function Celebration({ count }: { count: number }) {
  const M = usePalette();
  const { celebrate, closeCelebrate } = useUI();
  const { doc } = useMandarat();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (celebrate) success();
  }, [celebrate]);

  if (!celebrate) return null;
  const bloom = celebrate === 'bloom';
  const streak = overallStreak(doc);
  // 가운데는 핵심 목표(포인트 색), 바깥 8칸은 각 영역 색
  const colors = [0, 1, 2, 3, -1, 4, 5, 6, 7].map((a) => (a < 0 ? M.accent : doc.themes[a].color));

  return (
    <Modal visible animationType="fade" transparent onRequestClose={closeCelebrate} statusBarTranslucent>
      <Pressable
        onPress={closeCelebrate}
        accessibilityRole="button"
        accessibilityLabel="닫기"
        style={{ flex: 1, backgroundColor: 'rgba(14,12,20,0.52)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
      >
        <Pressable onPress={() => {}} accessible={false}>
          <Reveal from={16} duration={420}>
            <View style={[{ width: 300, borderRadius: 28, paddingTop: 30, paddingBottom: 20, paddingHorizontal: 22, backgroundColor: M.surface, alignItems: 'center' }, shadow(14, '#000', 0.18)]}>
              <FilledGrid colors={colors} animate={!reduceMotion} />
              <Text style={{ fontSize: 21, fontWeight: '800', color: M.ink, marginTop: 22, textAlign: 'center', lineHeight: 28 }}>
                {bloom ? '64칸을 모두 채웠어요' : '오늘 할 일을\n모두 끝냈어요'}
              </Text>
              <Text style={{ fontSize: 14, color: M.sub, marginTop: 8, fontWeight: '600', textAlign: 'center' }}>
                {bloom ? '핵심 목표를 이뤘어요' : `${count}개 완료${streak > 1 ? ` · ${streak}일 연속` : ''}`}
              </Text>
              <Pressy
                onPress={closeCelebrate}
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel="확인"
                style={{ alignSelf: 'stretch', marginTop: 22, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: bloom ? SEMANTIC.done : M.accent }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: readableOn(bloom ? SEMANTIC.done : M.accent) }}>확인</Text>
              </Pressy>
            </View>
          </Reveal>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
