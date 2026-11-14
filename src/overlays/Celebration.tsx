import React, { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PaperColumn } from '../components/WebColumn';
import { MODAL_ORIENTATIONS, useWindowDimensions } from '../lib/screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/AppText';
import { Button } from '../components/common';
import { ColourMap } from '../components/chart';
import { GEO } from '../theme/tokens';
import { NUM, ROLE } from '../theme/type';
import { usePalette, type M as Palette } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useDoc, overallStreak } from '../store/MandaratContext';
import { fmtDateLong, noOrphan } from '../lib/text';
import { announce } from '../lib/useReducedMotion';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';

/** 큰 지도의 가장 큰 폭(아이패드 단에서도 min(본문, 520)) · 낮은 창에서도 지키는 가장 작은 폭 */
const MAP_MAX = 520;
const MAP_MIN = 160;
/**
 * 지도 밖의 높이 — 위 12 · 위 줄 18 · 숫자 6+56 · 문장 4+30 · 한 줄 2+36 · 지도 위 28 · 단추 위 24 · 단추 52 · 아래 24.
 * 남는 높이가 본문 폭보다 작으면(가로로 든 폰) 지도를 그만큼 줄인다.
 */
const CHROME_H = 12 + 18 + 6 + 56 + 4 + 30 + 2 + 36 + 28 + 24 + 52 + 24;

/**
 * 64칸을 모두 달성한 날의 마무리 — 탭 막대 없이 종이 한 장(dayclose.png의 한 장면).
 * 큰 숫자 64/64와 한 문장, 다 채운 표의 색 지도(L2), 주 단추 하나. 색종이 · 꽃가루 · 도장 같은 꾸밈은 없다.
 * 하루 마감은 모달이 아니다(오늘 화면의 마감이 맡는다).
 * 성공 진동은 Root가 이 페이지가 뜰 때 한 번 울린다 — 여기서 또 울리지 않는다. 어디를 눌러도 닫힌다.
 */
export function Celebration() {
  const { celebrate } = useUIState();
  if (celebrate !== 'bloom') return null;
  return <FinalePage />;
}

function FinalePage() {
  const M = usePalette();
  const { closeCelebrate } = useUIActions();
  const title = useMsg().sheet.finaleTitle;

  useEffect(() => {
    announce(title);
  }, [title]);

  return (
    <Modal visible animationType="fade" onRequestClose={closeCelebrate} statusBarTranslucent supportedOrientations={MODAL_ORIENTATIONS}>
      <PaperColumn bg={M.paper} edge={M.printRule}>
        <Finale M={M} onClose={closeCelebrate} />
      </PaperColumn>
    </Modal>
  );
}

/** 종이 한 장의 내용 — 단(PaperColumn) 안에서 폭을 잰다 */
function Finale({ M, onClose }: { M: Palette; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { doc } = useDoc();
  const m = useMsg();
  const goal = doc.centerGoal.trim();
  const streak = overallStreak(doc);
  // 한 줄 — 핵심 목표 · 연속 n일째(있는 것만)
  const note = [goal ? m.sheet.finaleGoal({ goal }) : '', streak > 0 ? m.sheet.finaleStreak({ n: streak }) : '']
    .filter(Boolean)
    .join(m.core.dot);
  const room = height - insets.top - insets.bottom - CHROME_H;
  const mapW = Math.floor(Math.min(width - GEO.gutter * 2, MAP_MAX, Math.max(MAP_MIN, room)));

  return (
    <View style={{ flex: 1, backgroundColor: M.paper }} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1, paddingTop: insets.top + 12, paddingHorizontal: GEO.gutter, paddingBottom: Math.max(GEO.sheet.pad, insets.bottom),
        }}
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={false}
      >
        {/* 어디를 눌러도 닫힌다 — 화면 읽기는 아래 단추로 */}
        <Pressable onPress={onClose} accessible={false} importantForAccessibility="no" style={StyleSheet.absoluteFill} />

        <View pointerEvents="none">
          <Text style={{ ...ROLE.folio, color: M.print }} numberOfLines={1} maxFontSizeMultiplier={1.4}>{fmtDateLong(new Date())}</Text>
          <Text
            style={{ ...ROLE.closeFigure, ...NUM, color: M.ink, marginTop: 6 }}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            accessibilityLabel={m.sheet.finaleCountA11y}
          >
            64/64
          </Text>
          <Text accessibilityRole="header" style={{ ...ROLE.prompt, color: M.ink, marginTop: 4 }}>
            {noOrphan(m.sheet.finaleTitle)}
          </Text>
          {!!note && (
            <Text style={{ ...ROLE.note, color: M.print, marginTop: 2 }} numberOfLines={2}>{note}</Text>
          )}

          <View style={{ marginTop: 28 }}>
            <ColourMap themes={doc.themes} goal={doc.centerGoal} level="L2" width={mapW} fade />
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} pointerEvents="none" />

        <Button M={M} label={m.common.close} onPress={onClose} testID={TID.celebrateClose} />
      </ScrollView>
    </View>
  );
}
