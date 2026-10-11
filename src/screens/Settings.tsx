import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Header } from '../components/common';
import { Icon } from '../components/Icon';
import { MandalaArt } from '../components/MandalaArt';
import { FONTS } from '../theme/fonts';
import { MOODS, tint } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { TEMPLATES, templateThemes, type Template } from '../data/templates';
import { tap } from '../lib/haptics';
import { ACCENTS, SEMANTIC } from '../theme/palette';
import { backupFileName, makeBackup, summarize } from '../lib/backup';
import { downloadText } from '../lib/webFile';
import { BackupImport } from '../overlays/BackupImport';
import type { CellShape, IconName, Mgmt, Mood } from '../types';

const APP_VERSION = '1.0.0'; // app.json version과 일치
const MOOD_OPTS: Mood[] = ['연꽃', '크림', '화이트', '파스텔', '다크'];
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

/** 확인 대화상자 — 웹은 window.confirm, 네이티브는 Alert */
function ask(title: string, message: string, ok: string, onOk: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: ok, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

function Row({ M, icon, color, title, sub, onPress, danger }: { M: M; icon: IconName; color: string; title: string; sub: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={sub}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint(color, M.dark ? 22 : 14, M.dark), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: danger ? color : M.ink }}>{title}</Text>
        <Text style={{ fontSize: 12, color: M.sub, marginTop: 1 }}>{sub}</Text>
      </View>
      <Icon name="chevR" size={17} color={M.faint} />
    </Pressable>
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
  const { go, openEditor, showToast } = useUI();
  const { doc, setSetting, loadSample, applyTemplate, resetAll, replaceDoc } = useMandarat();

  const useTemplate = (t: Template) => {
    tap();
    const snapshot = doc; // 되돌리기용
    applyTemplate(t.centerGoal, templateThemes(t));
    go('grid');
    showToast(`‘${t.name}’ 템플릿을 적용했어요`, { label: '되돌리기', onPress: () => replaceDoc(snapshot) });
  };

  const doReset = () => {
    const snapshot = doc; // 되돌리기용 직전 상태
    resetAll();
    showToast('모든 데이터를 초기화했어요', {
      label: '되돌리기',
      onPress: () => replaceDoc(snapshot),
    });
  };

  const confirmReset = () =>
    ask('전체 초기화', '모든 목표와 기록을 지울까요? 초기화 후에도 잠시 되돌릴 수 있어요.', '초기화', doReset, true);

  // 예시로 채우기 — 이미 적어둔 실천이 있으면 먼저 묻고, 바꾼 뒤에도 되돌릴 수 있게
  const doSample = () => {
    const snapshot = doc;
    loadSample();
    showToast('예시 만다라트를 채웠어요', { label: '되돌리기', onPress: () => replaceDoc(snapshot) });
  };
  const confirmSample = () => {
    tap();
    if (summarize(doc).filled === 0) { doSample(); return; }
    ask('예시로 채우기', '지금 적어둔 8영역·실천이 예시로 바뀌어요. 바꾼 뒤 잠시 되돌릴 수 있어요.', '채우기', doSample);
  };

  // 백업 내보내기 — 웹은 .json 파일로 저장, 네이티브는 공유 시트(메모·메신저·파일)로 보낸다
  const exportBackup = async () => {
    tap();
    const now = new Date();
    if (Platform.OS === 'web') {
      if (downloadText(backupFileName(now), makeBackup(doc, now, true))) showToast('백업 파일을 저장했어요');
      else showToast('이 브라우저에서는 저장할 수 없어요');
      return;
    }
    try {
      const r = await Share.share({ title: backupFileName(now), message: makeBackup(doc, now) });
      if (r.action === Share.sharedAction) showToast('백업을 보냈어요 · 안전한 곳에 보관해 주세요');
    } catch {
      showToast('백업을 내보내지 못했어요');
    }
  };
  const [importing, setImporting] = useState(false);

  return (
    <View>
      <Header M={M} en="Settings" kr="설정" onBack={() => go('dashboard')} />

      <Section M={M} label="핵심 목표 / Goal" />
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

      <Section M={M} label="템플릿으로 시작 / Templates" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 11, paddingVertical: 2 }}
      >
        {TEMPLATES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => useTemplate(t)}
            accessibilityRole="button"
            accessibilityLabel={`${t.name} 템플릿 적용`}
            accessibilityHint={t.desc}
            style={[{ width: 168, borderRadius: 18, padding: 15, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(3)]}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 11 }}>
              {t.areas.slice(0, 4).map((a, i) => (
                <View key={i} style={{ width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(M.accent, M.dark ? 20 : 12, M.dark) }}>
                  <Icon name={a.icon} size={15} color={M.accent} />
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: M.ink }} numberOfLines={1}>{t.name}</Text>
            <Text style={{ fontSize: 11.5, color: M.sub, marginTop: 3, lineHeight: 16 }} numberOfLines={2}>{t.desc}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: M.accent }}>적용하기</Text>
              <Icon name="chevR" size={14} color={M.accent} />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Section M={M} label="무드 / Mood" />
      <Card M={M}>
        <Segmented M={M} label="배경 무드" value={doc.settings.mood} options={MOOD_OPTS} onChange={(v) => setSetting('mood', v)} />
        <View>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink, marginBottom: 8 }}>포인트 컬러</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ACCENTS.map(({ color: c, name }) => {
              const on = doc.settings.accent.toLowerCase() === c.toLowerCase();
              return (
                <Pressable
                  key={c}
                  onPress={() => { tap(); setSetting('accent', c); }}
                  accessibilityRole="radio"
                  accessibilityLabel={`포인트 컬러 ${name}`}
                  accessibilityState={{ selected: on }}
                  style={{ flex: 1, alignItems: 'center', gap: 6 }}
                >
                  <View style={{ width: '100%', height: 40, borderRadius: 12, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2.5 : 0, borderColor: M.surface, opacity: on ? 1 : 0.88 }}>
                    {on && <Icon name="check" size={17} color="#fff" sw={3} />}
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: on ? '800' : '600', color: on ? M.ink : M.faint }}>{name}</Text>
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

      <Section M={M} label="데이터 / Data" />
      <Card M={M}>
        <Row
          M={M} icon="download" color={M.accent} title="백업 내보내기"
          sub={Platform.OS === 'web' ? '목표·기록을 파일(.json)로 저장해요' : '목표·기록을 메모나 메신저로 보내 보관해요'}
          onPress={exportBackup}
        />
        <View style={{ height: 1, backgroundColor: M.line }} />
        <Row M={M} icon="restore" color={SEMANTIC.done} title="백업 불러오기" sub="내보낸 백업으로 기록을 되살려요" onPress={() => { tap(); setImporting(true); }} />
        <View style={{ height: 1, backgroundColor: M.line }} />
        <Row M={M} icon="sparkle" color={M.gold} title="예시로 채우기" sub="8영역 · 64실천 샘플을 불러와요" onPress={confirmSample} />
        <View style={{ height: 1, backgroundColor: M.line }} />
        <Row M={M} icon="reset" color={SEMANTIC.danger} title="전체 초기화" sub="모든 목표와 기록을 지워요" onPress={confirmReset} danger />
      </Card>
      <Text style={{ paddingHorizontal: 24, paddingTop: 8, fontSize: 11.5, color: M.faint, lineHeight: 17 }}>
        기록은 이 기기에만 저장돼요. 기기를 바꾸거나 앱을 지우기 전에 백업을 내보내 두세요.
      </Text>

      <Section M={M} label="정보 / About" />
      <Card M={M}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: tint(M.gold, M.dark ? 20 : 12, M.dark) }}>
            <MandalaArt size={44} stroke={M.gold} opacity={0.9} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: M.ink }}>만다라트 · Mandarat</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 2, lineHeight: 18 }}>
              하나의 큰 뜻을 8개의 길과 64개의 실천으로 곱게 펼쳐가는 연꽃 플래너
            </Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: M.line }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>버전</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: M.ink, fontFamily: FONTS.groteskMed }}>{APP_VERSION}</Text>
        </View>
      </Card>

      <Text style={{ textAlign: 'center', color: M.faint, fontSize: 11.5, marginTop: 20, marginBottom: 4, fontFamily: FONTS.groteskMed }}>
        🪷 made with care
      </Text>
      {importing && <BackupImport onClose={() => setImporting(false)} />}
    </View>
  );
}
