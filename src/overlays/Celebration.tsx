import React, { useEffect } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Pressy } from '../components/Pressy';
import { Reveal } from '../components/Reveal';
import { readableOn, SEMANTIC } from '../theme/palette';
import { shadow } from '../theme/shadow';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, overallStreak } from '../store/MandaratContext';
import { success } from '../lib/haptics';
import { MiniChart } from '../components/GridMark';

export function Celebration({ count }: { count: number }) {
  const M = usePalette();
  const { celebrate, closeCelebrate } = useUI();
  const { doc } = useMandarat();

  useEffect(() => {
    if (celebrate) success();
  }, [celebrate]);

  if (!celebrate) return null;
  const bloom = celebrate === 'bloom';
  const streak = overallStreak(doc);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={closeCelebrate} statusBarTranslucent>
      <Pressable
        onPress={closeCelebrate}
        accessibilityRole="button"
        accessibilityLabel="닫기"
        style={{ flex: 1, backgroundColor: 'rgba(14,12,20,0.52)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
      >
        <Pressable onPress={() => {}} accessible={false}>
          <Reveal animate from={16} duration={420}>
            <View style={[{ width: 300, borderRadius: 28, paddingTop: 30, paddingBottom: 20, paddingHorizontal: 22, backgroundColor: M.surface, alignItems: 'center' }, shadow(14, '#000', 0.18)]}>
              {/* 내 만다라트 81칸 — 지금까지 채운 만큼 색이 들어 있다 */}
              <MiniChart doc={doc} size={132} dark={M.dark} ink={M.dark ? M.ink : '#23211C'} />
              <Text style={{ fontSize: 21, fontWeight: '800', color: M.ink, marginTop: 18, textAlign: 'center', lineHeight: 28 }}>
                {bloom ? '64칸을 모두 채웠어요' : '오늘 할 일을\n모두 끝냈어요'}
              </Text>
              <Text style={{ fontSize: 14, color: M.sub, marginTop: 8, fontWeight: '600', textAlign: 'center' }}>
                {bloom ? '핵심 목표를 이뤘어요' : streak > 1 ? `${count}개를 해냈고, ${streak}일째 이어 가는 중이에요` : `${count}개를 다 해냈어요`}
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
