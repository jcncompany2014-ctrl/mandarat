import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { PaperColumn } from '../components/WebColumn';
import { MODAL_ORIENTATIONS } from '../lib/screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/AppText';
import { PaperDots } from '../components/PaperDots';
import { MiniChart } from '../components/GridMark';
import { NUM } from '../theme/type';
import { usePalette } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useDoc, overallStreak } from '../store/MandaratContext';
import { fmtDateLong } from '../lib/text';
import { announce } from '../lib/useReducedMotion';

const TITLE = '64칸을 모두 달성했어요';
/** 왼쪽 여백 — 종이 페이지 한 장의 여백 */
const GUTTER = 24;

/**
 * 64칸을 모두 달성한 날의 마무리 페이지 — 카드가 아니라 종이 한 장.
 * 내 만다라트 81칸이 가운데부터 차례로 잉크로 찍힌다. 하루 마감은 모달이 아니다(목록 아래 마감 줄이 맡는다).
 * 성공 진동은 Root가 이 페이지가 뜰 때 한 번 울린다 — 여기서 또 울리지 않는다.
 */
export function Celebration() {
  const { celebrate } = useUIState();
  if (celebrate !== 'bloom') return null;
  return <FinalePage />;
}

function FinalePage() {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { closeCelebrate } = useUIActions();
  const { doc } = useDoc();
  const streak = overallStreak(doc);
  const goal = doc.centerGoal.trim();

  useEffect(() => {
    announce(TITLE);
  }, []);

  return (
    <Modal visible animationType="fade" onRequestClose={closeCelebrate} statusBarTranslucent supportedOrientations={MODAL_ORIENTATIONS}>
      <PaperColumn bg={M.bg} edge={M.line}>
      <View style={{ flex: 1, backgroundColor: M.bg }}>
        <PaperDots M={M} offsetY={insets.top} />
        {/* 어디를 눌러도 닫힌다 — 화면 읽기는 아래 '닫기' 버튼으로 */}
        <Pressable onPress={closeCelebrate} accessible={false} style={StyleSheet.absoluteFill} />

        <View
          pointerEvents="box-none"
          accessibilityViewIsModal
          onAccessibilityEscape={closeCelebrate}
          style={{ flex: 1, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 12, paddingHorizontal: GUTTER }}
        >
          <View pointerEvents="none">
            <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: M.sub }}>{fmtDateLong(new Date())}</Text>
            <Text
              style={{ marginTop: 6, fontSize: 72, lineHeight: 80, fontWeight: '800', letterSpacing: -2, color: M.ink, ...NUM }}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
              accessibilityLabel="64칸 중 64칸"
            >
              64/64
            </Text>
            <Text accessibilityRole="header" style={{ marginTop: 10, fontSize: 22, lineHeight: 30, fontWeight: '800', color: M.ink }}>
              {TITLE}
            </Text>
            {!!goal && (
              <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 22, color: M.sub }} numberOfLines={3}>
                {`핵심 목표 · ${goal}`}
              </Text>
            )}

            <View style={{ marginTop: 28 }}>
              <MiniChart themes={doc.themes} cellShape={doc.settings.cellShape} size={240} animate="bloom" />
            </View>

            {streak > 0 && (
              <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, fontWeight: '600', color: M.sub, ...NUM }}>
                {`연속 ${streak}일째`}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }} pointerEvents="none" />

          <Pressable
            onPress={closeCelebrate}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            hitSlop={8}
            style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, minWidth: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: M.ink }}>닫기</Text>
          </Pressable>
        </View>
      </View>
      </PaperColumn>
    </Modal>
  );
}
