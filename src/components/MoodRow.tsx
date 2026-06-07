import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MOOD_FACES } from './Icon';
import { tint } from '../theme/moods';
import type { M } from '../theme/usePalette';

export function MoodRow({ M, value, onPick }: { M: M; value?: number; onPick: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {MOOD_FACES.map((m, i) => {
        const on = value === i;
        const Face = m.ic;
        return (
          <Pressable
            key={i}
            onPress={() => onPick(i)}
            style={{
              flex: 1, paddingTop: 11, paddingBottom: 9, borderRadius: 15, alignItems: 'center', gap: 4,
              borderWidth: 1.5, borderColor: on ? m.c : M.line,
              backgroundColor: on ? tint(m.c, M.dark ? 18 : 11, M.dark) : 'transparent',
            }}
          >
            <Face size={24} color={on ? m.c : M.faint} strokeWidth={1.9} />
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: on ? m.c : M.faint }}>{m.kr}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
