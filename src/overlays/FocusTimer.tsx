import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ring } from '../components/Ring';
import { MandalaArt } from '../components/MandalaArt';
import { Pill, CloseBtn } from '../components/common';
import { FONTS } from '../theme/fonts';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { success } from '../lib/haptics';

const TOTAL = 25 * 60;

export function FocusTimer() {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { focus, closeFocus } = useUI();
  const { doc, toggleDone } = useMandarat();
  const [left, setLeft] = useState(TOTAL);
  const [run, setRun] = useState(true);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!run || left <= 0) return;
    const id = setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000);
    return () => clearInterval(id);
  }, [run, left]);

  useEffect(() => {
    if (left <= 0 && !firedRef.current) {
      firedRef.current = true;
      success();
    }
  }, [left]);

  if (!focus) return null;
  const th = doc.themes[focus.ti];
  const a = th.actions[focus.ai];
  const pct = (1 - left / TOTAL) * 100;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const finished = left <= 0;

  const finish = () => {
    if (!a.done) toggleDone(focus.ti, focus.ai);
    closeFocus();
  };

  return (
    <Modal visible animationType="fade" onRequestClose={closeFocus} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: M.center, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <MandalaArt size={360} stroke={th.color} opacity={0.18} rings={3} petals={24} sw={1} />
        </View>
        <View style={{ position: 'absolute', top: insets.top + 16, right: 22 }}>
          <CloseBtn M={M} onPress={closeFocus} light />
        </View>

        <Pill M={M} color={th.color}>{th.title || `영역 ${focus.ti + 1}`}</Pill>
        <View style={{ marginTop: 22, marginBottom: 8 }}>
          <Ring pct={pct} size={232} stroke={6} color={th.color} track="rgba(255,255,255,0.12)">
            <Text style={{ fontSize: 56, fontWeight: '700', color: '#fff', fontFamily: FONTS.grotesk }}>
              {finished ? '완료' : `${mm}:${ss}`}
            </Text>
            <Text style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginTop: 4, maxWidth: 170, textAlign: 'center' }} numberOfLines={2}>
              {a.text || '집중'}
            </Text>
          </Ring>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          {!finished && (
            <Pressable onPress={() => setRun((r) => !r)} style={{ paddingHorizontal: 26, paddingVertical: 13, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{run ? '일시정지' : '계속'}</Text>
            </Pressable>
          )}
          <Pressable onPress={finish} style={{ paddingHorizontal: 26, paddingVertical: 13, borderRadius: 30, backgroundColor: th.color }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{finished ? '완료 처리' : '끝내고 완료'}</Text>
          </Pressable>
        </View>
        <Text style={{ marginTop: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}>한 가지에만 머무르는 25분</Text>
      </View>
    </Modal>
  );
}
