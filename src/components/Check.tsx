import React from 'react';
import { View } from 'react-native';
import { Icon } from './Icon';

/** Round checkbox dot. */
export function Check({ on, color, dark }: { on: boolean; color: string; dark: boolean }) {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: on ? 0 : 1.8,
        borderColor: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)',
        backgroundColor: on ? color : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on && <Icon name="check" size={16} color="#fff" sw={3} />}
    </View>
  );
}
