// 설정 › 보기 › 종이 무늬 — 무지(기본) · 점 · 모눈 · 줄 견본 넷(build-plan §2.6). 견본 쪽에 그 무늬를 그대로 그린다.
// 모눈 · 줄은 프로 — 판매를 끈 1.0(STORE_OPEN 거짓)은 모두 열려 있다. 판매를 켜면 잠긴 견본은 이름 뒤에 '프로'를 적고,
// 누르면 프로 시트를 연다(openPro('paper')) — 저장값은 바꾸지 않는다.
// 프로 없이 저장된 프로 무늬(환불 · 다른 기기에서 고름)는 고른 것으로 보이고, 그 아래 '프로를 열면 이 무늬로 그려져요'(누르면 프로 시트).
import React from 'react';
import { View } from 'react-native';
import { SWATCH, Swatch, TextLink } from '../../components/kit';
import { useMsg } from '../../i18n/react';
import { select, tap } from '../../lib/haptics';
import { PAPER_CHOICES, isProPattern, patternSetting, storedPattern } from '../../lib/paper';
import { TID } from '../../lib/testIds';
import { useUIActions } from '../../navigation/ui';
import { useActions, useDoc } from '../../store/MandaratContext';
import { useLocked } from '../../store/ProContext';
import type { M } from '../../theme/usePalette';
import { SET, SwatchHead } from './rows';

export function PaperRows({ M }: { M: M }) {
  const m = useMsg();
  const chosen = storedPattern(useDoc().doc.settings.paper);
  const { setSetting } = useActions();
  const { openPro } = useUIActions();
  const proLocked = useLocked('paper');
  // 고른 무늬인데 프로가 없어 무지로 그리는 중
  const keptLocked = proLocked && isProPattern(chosen);

  return (
    <>
      <SwatchHead M={M} label={m.paper.head} />
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: SWATCH.gap, paddingTop: SET.swatchTop }}>
        {PAPER_CHOICES.map((p) => {
          const on = chosen === p;
          const locked = proLocked && isProPattern(p);
          const name = m.paper[p];
          const kept = on && locked;
          const label = locked ? m.paper.sayLocked({ name }) : m.paper.say({ name });
          const onPress = () => {
            if (locked) { tap(); openPro('paper'); return; }
            if (on) return;
            select();
            setSetting('paper', patternSetting(p));
          };
          return (
            // testID와 aria-checked는 견본을 감싼 칸에 — 웹 읽기 도구 · 스모크(scripts/smoke/paper.js)가 고른 견본을 안다
            <View key={p} testID={TID.setPaper(p)} aria-checked={on} style={{ flex: 1, minWidth: 0 }}>
              <Swatch
                M={M}
                kind={{ pattern: p }}
                label={locked ? `${name}${m.core.dot}${m.paper.pro}` : name}
                on={on}
                onPress={onPress}
                accessibilityLabel={kept ? `${label}${m.core.listSep}${m.paper.keptNote}` : label}
              />
            </View>
          );
        })}
      </View>
      {keptLocked && (
        <View style={{ marginTop: SET.noteTop, alignSelf: 'flex-start' }}>
          <TextLink M={M} label={m.paper.keptNote} hint={m.paper.lockedHint} onPress={() => { tap(); openPro('paper'); }} />
        </View>
      )}
    </>
  );
}
