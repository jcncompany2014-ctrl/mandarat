import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../AppText';
import { DyeMark } from './DyeMark';
import { AREA, KIT_TYPE } from './metrics';
import type { M } from '../../theme/usePalette';
import { select } from '../../lib/haptics';

/**
 * 영역 고르기(AP.areaPicker) — 여덟 영역을 4 × 2 낱칸으로(사이 6, 44 높이, 모서리 12, tile).
 * 낱칸마다 영역 표시 + 이름(500 14). 고른 영역은 제 tint 칠 + 이름을 dyeText 700으로 — 표시가 남아 색만으로 고르지 않는다.
 * 이름이 길면(Relationships · 人間関係) 한 줄 안에서 70%까지 줄인다.
 * 화면 읽기: 라디오 묶음 + 라디오(선택됨). 고를 때 짧은 딸깍(select).
 */
export function AreaPicker({
  M, names, value, onChange, label, testID,
}: {
  M: M;
  /** 영역 이름 여덟(doc.themes 순서) */
  names: readonly string[];
  /** 고른 영역 번호(없으면 null) */
  value: number | null;
  onChange: (i: number) => void;
  /** 묶음의 화면 읽기 이름 — '어느 영역의 일인가요?' */
  label?: string;
  testID?: (i: number) => string;
}) {
  const rows = [names.slice(0, AREA.cols), names.slice(AREA.cols, AREA.cols * 2)];
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} {...a11yLangProp()} style={{ gap: AREA.gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: AREA.gap }}>
          {row.map((name, c) => {
            const i = r * AREA.cols + c;
            const on = i === value;
            return (
              <Pressable
                key={i}
                testID={testID?.(i)}
                onPress={() => {
                  if (on) return;
                  select();
                  onChange(i);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={name}
                {...a11yLangProp()}
                style={({ pressed }) => ({
                  flex: 1, minWidth: 0, minHeight: AREA.h, borderRadius: AREA.radius, paddingHorizontal: AREA.padX,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? M.tint[i] ?? M.tile : M.tile, opacity: pressed && !on ? 0.7 : 1,
                })}
              >
                <DyeMark M={M} area={i} />
                <Text
                  style={[on ? KIT_TYPE.areaOn : KIT_TYPE.area, { flexShrink: 1, color: on ? M.dyeText[i] ?? M.ink : M.ink }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={AREA.minScale}
                  maxFontSizeMultiplier={1.3}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
