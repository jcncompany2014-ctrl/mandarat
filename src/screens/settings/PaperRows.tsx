// 설정 › 보기 — 종이 무늬: 점(기본, 무료) · 모눈 · 줄 · 무지(프로).
// 잠긴 무늬는 오른쪽에 '프로'를 적고, 누르면 프로 시트를 연다(openPro('paper')) — 저장값은 바꾸지 않는다.
// 프로 없이 저장된 프로 무늬(환불 · 다른 기기에서 고름)는 고른 것으로 보이고, '프로를 열면 이 무늬로 그려져요'를 덧붙인다.
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/AppText';
import { Check } from '../../components/Check';
import { RowDivider, pressedRow } from '../../components/common';
import { useMsg } from '../../i18n/react';
import { select, tap } from '../../lib/haptics';
import { PAPER_CHOICES, isProPattern, patternSetting, storedPattern, type DrawnPattern } from '../../lib/paper';
import { TID } from '../../lib/testIds';
import { useUIActions } from '../../navigation/ui';
import { useActions, useDoc } from '../../store/MandaratContext';
import { useLocked } from '../../store/ProContext';
import type { M } from '../../theme/usePalette';
import { SubHead, rowBase } from './rows';

/** 무늬 견본 — 지금 종이 바탕 위 그 무늬의 한 귀퉁이(점 여섯 · 모눈 · 줄 셋 · 빈 종이) */
function PatternSwatch({ M, p }: { M: M; p: DrawnPattern }) {
  const ink = M.faint;
  return (
    <View
      style={{
        width: 44, height: 30, borderRadius: 3, borderWidth: 1, borderColor: M.line,
        backgroundColor: M.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {p === 'dots' && (
        <View style={{ width: 22, flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, columnGap: 8 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: ink }} />
          ))}
        </View>
      )}
      {(p === 'grid' || p === 'lines') && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          {[6, 14, 22].map((y) => (
            <View key={`h${y}`} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 1, backgroundColor: ink }} />
          ))}
          {p === 'grid' && [7, 15, 23, 31, 39].map((x) => (
            <View key={`v${x}`} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1, backgroundColor: ink }} />
          ))}
        </View>
      )}
    </View>
  );
}

export function PaperRows({ M }: { M: M }) {
  const m = useMsg();
  const chosen = storedPattern(useDoc().doc.settings.paper);
  const { setSetting } = useActions();
  const { openPro } = useUIActions();
  const proLocked = useLocked('paper');

  return (
    <>
      <SubHead M={M} label={m.paper.head} />
      <View accessibilityRole="radiogroup">
        {PAPER_CHOICES.map((p, i) => {
          const on = chosen === p;
          const locked = proLocked && isProPattern(p);
          const first = i === 0;
          const last = i === PAPER_CHOICES.length - 1;
          const name = m.paper[p];
          // 고른 무늬인데 프로가 없어 점으로 그리는 중
          const kept = on && locked;
          const label = locked ? m.paper.sayLocked({ name }) : m.paper.say({ name });
          const onPress = () => {
            if (locked) { tap(); openPro('paper'); return; }
            if (on) return;
            select();
            setSetting('paper', patternSetting(p));
          };
          return (
            <Pressable
              key={p}
              testID={TID.setPaper(p)}
              onPress={onPress}
              accessibilityRole="radio"
              accessibilityLabel={kept ? `${label}, ${m.paper.keptNote}` : label}
              accessibilityHint={locked ? m.paper.lockedHint : undefined}
              accessibilityState={{ checked: on, selected: on }}
              aria-checked={on}
              style={({ pressed }) => [rowBase(M, first, last), pressed && (locked || !on) ? pressedRow(M) : null]}
            >
              {!first && <RowDivider M={M} inset={0} />}
              <PatternSwatch M={M} p={p} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: '600', color: M.ink }} numberOfLines={1}>
                  {name}
                </Text>
                {kept && (
                  <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }}>{m.paper.keptNote}</Text>
                )}
              </View>
              {locked && (
                <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }} numberOfLines={1}>{m.paper.pro}</Text>
              )}
              {(!locked || on) && <Check on={on} color={M.ink} dark={M.dark} size={22} />}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
