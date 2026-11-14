// 설정 › 보기 › 화면 모드 — 자동 · 밝게 · 어둡게 견본 셋(build-plan §2.4).
// 고르기는 기기마다(theme/look: AsyncStorage 'mandarat:look:v1') — 문서 · 백업 · iCloud에는 들어가지 않는다.
// 예전 종이 무드(settings.mood)는 문서에 그대로 남고, 이 판은 쓰지도 그리지도 않는다(처음 한 번 화면 모드를 정할 때만 읽는다).
import React from 'react';
import { View } from 'react-native';
import { SWATCH, Swatch } from '../../components/kit';
import { useMsg } from '../../i18n/react';
import { select } from '../../lib/haptics';
import { LOOKS, type Look } from '../../lib/look';
import { TID } from '../../lib/testIds';
import { useLook } from '../../theme/look';
import type { M } from '../../theme/usePalette';
import { SET } from './rows';

export function LookRows({ M }: { M: M }) {
  const st = useMsg().settings;
  const { look, setLook } = useLook();
  const names: Record<Look, string> = { auto: st.lookAuto, light: st.lookLight, dark: st.lookDark };
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: SWATCH.gap, paddingTop: SET.swatchTop }}>
      {LOOKS.map((l) => {
        const on = look === l;
        return (
          // testID와 aria-checked는 견본을 감싼 칸에 — 웹 읽기 도구 · 스모크가 고른 견본을 안다(견본은 accessibilityState만 단다)
          <View key={l} testID={TID.setLook(l)} aria-checked={on} style={{ flex: 1, minWidth: 0 }}>
            <Swatch
              M={M}
              kind={{ look: l }}
              label={names[l]}
              on={on}
              onPress={() => { select(); setLook(l); }}
              accessibilityLabel={st.lookLabel({ name: names[l] })}
            />
          </View>
        );
      })}
    </View>
  );
}
