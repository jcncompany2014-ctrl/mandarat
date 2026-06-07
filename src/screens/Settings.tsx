import React from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { Header } from '../components/common';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme/fonts';
import { MOODS, tint } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import type { CellShape, Mgmt, Mood } from '../types';

const MOOD_OPTS: Mood[] = ['크림', '화이트', '파스텔', '다크'];
const ACCENTS = ['#F4793B', '#4F6BED', '#2FA968', '#8B5CF6'];
const MGMT_OPTS: Mgmt[] = ['일일 체크', '습관 스트릭', '칸반'];
const SHAPE_OPTS: CellShape[] = ['둥근', '각진'];

function Section({ M, label }: { M: M; label: string }) {
  return (
    <Text style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: M.faint, textTransform: 'uppercase' }}>
      {label}
    </Text>
  );
}

function Card({ M, children }: { M: M; children: React.ReactNode }) {
  return (
    <View style={[{ marginHorizontal: 20, borderRadius: 18, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line, padding: 14, gap: 12 }, M.dark ? null : shadow(3)]}>
      {children}
    </View>
  );
}

function Segmented<T extends string>({ M, label, value, options, onChange }: { M: M; label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <View>
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 4, backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)', padding: 4, borderRadius: 12 }}>
        {options.map((o) => {
          const on = o === value;
          return (
            <Pressable key={o} onPress={() => onChange(o)} style={[{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: on ? M.surface : 'transparent' }, on && !M.dark ? shadow(2) : null]}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? M.ink : M.sub }}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Settings() {
  const M = usePalette();
  const { go, openEditor } = useUI();
  const { doc, setSetting, loadSample, resetAll } = useMandarat();

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('모든 데이터를 초기화할까요? 되돌릴 수 없습니다.')) resetAll();
      return;
    }
    Alert.alert('전체 초기화', '모든 데이터를 초기화할까요? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '초기화', style: 'destructive', onPress: resetAll },
    ]);
  };

  return (
    <View>
      <Header M={M} en="Settings" kr="설정" onBack={() => go('dashboard')} />

      <Section M={M} label="핵심 목표" />
      <Card M={M}>
        <Pressable onPress={() => openEditor({ kind: 'center' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint(M.accent, M.dark ? 22 : 14, M.dark), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="target" size={20} color={M.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }} numberOfLines={1}>{doc.centerGoal || '핵심 목표 입력'}</Text>
            <Text style={{ fontSize: 12, color: M.sub, marginTop: 1 }}>탭하여 수정</Text>
          </View>
          <Icon name="pencil" size={17} color={M.faint} />
        </Pressable>
      </Card>

      <Section M={M} label="무드 / Mood" />
      <Card M={M}>
        <Segmented M={M} label="배경 무드" value={doc.settings.mood} options={MOOD_OPTS} onChange={(v) => setSetting('mood', v)} />
        <View>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink, marginBottom: 8 }}>포인트 컬러</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {ACCENTS.map((c) => {
              const on = doc.settings.accent === c;
              return (
                <Pressable key={c} onPress={() => setSetting('accent', c)} style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 3 : 0, borderColor: M.surface, opacity: on ? 1 : 0.85 }}>
                  {on && <Icon name="check" size={18} color="#fff" sw={3} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Section M={M} label="관리 방식 / Manage" />
      <Card M={M}>
        <Segmented M={M} label="오늘 화면" value={doc.settings.mgmt} options={MGMT_OPTS} onChange={(v) => setSetting('mgmt', v)} />
      </Card>

      <Section M={M} label="그리드 / Grid" />
      <Card M={M}>
        <Segmented M={M} label="셀 모양" value={doc.settings.cellShape} options={SHAPE_OPTS} onChange={(v) => setSetting('cellShape', v)} />
      </Card>

      <Section M={M} label="데이터" />
      <Card M={M}>
        <Pressable onPress={loadSample} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint('#E8A33D', M.dark ? 22 : 14, M.dark), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={20} color="#E8A33D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>예시로 채우기</Text>
            <Text style={{ fontSize: 12, color: M.sub, marginTop: 1 }}>8영역 · 64실천 샘플을 불러옵니다</Text>
          </View>
          <Icon name="chevR" size={17} color={M.faint} />
        </Pressable>
        <View style={{ height: 1, backgroundColor: M.line }} />
        <Pressable onPress={confirmReset} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint('#E5547F', M.dark ? 22 : 14, M.dark), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="reset" size={20} color="#E5547F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#E5547F' }}>전체 초기화</Text>
            <Text style={{ fontSize: 12, color: M.sub, marginTop: 1 }}>모든 목표와 기록을 지웁니다</Text>
          </View>
          <Icon name="chevR" size={17} color={M.faint} />
        </Pressable>
      </Card>

      <Text style={{ textAlign: 'center', color: M.faint, fontSize: 12, marginTop: 22, fontFamily: FONTS.groteskMed }}>
        Mandarat · v1.0
      </Text>
    </View>
  );
}
