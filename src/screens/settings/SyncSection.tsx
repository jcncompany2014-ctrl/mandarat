// 설정 › iCloud — 켜기 · 끄기 한 줄, 그 아래 상태 한 줄(방금 · 언제 맞췄는지 · 맞추는 중), 문제가 있으면 괘선 알림,
// 켜져 있으면 '지금 맞추기'. 처음 켤 때 양쪽에 기록이 있으면 엔진이 묻고, 그 물음은 고르기 시트(SyncChoiceSheet)가 받는다.
// 웹 · 안드로이드 · Expo Go에는 iCloud가 없다 — 안내 한 줄(백업 파일로 옮긴다)만. 저절로 묻거나 켜지 않는다.
import React from 'react';
import { Linking, Platform, View } from 'react-native';
import { icloud } from '../../../modules/icloud-sync';
import { Text } from '../../components/AppText';
import { Check } from '../../components/Check';
import { LineRow, RuledNotice } from '../../components/common';
import { select } from '../../lib/haptics';
import { requestSync, setSyncEnabled, useSyncStatus } from '../../lib/syncStatus';
import { TID } from '../../lib/testIds';
import { announce } from '../../lib/useReducedMotion';
import { useMsg } from '../../i18n/react';
import { useDoc } from '../../store/MandaratContext';
import type { M } from '../../theme/usePalette';
import { Section } from './rows';
import { problemLine, statusLine, syncSupported } from './syncView';

export function SyncSection({ M }: { M: M }) {
  const t = useMsg();
  if (!syncSupported(Platform.OS, icloud)) {
    return (
      <>
        <Section M={M} label={t.sync.sectionTitle} />
        <RuledNotice M={M} title={t.sync.webNote} />
      </>
    );
  }
  return <SyncRows M={M} />;
}

function SyncRows({ M }: { M: M }) {
  const t = useMsg();
  const s = useSyncStatus();
  // 앱으로 돌아올 때마다(clock) 다시 그려 '방금'이 시각으로 바뀐다
  useDoc();
  const on = s.enabled;
  const line = statusLine(s, Date.now(), t);
  const problem = s.phase === 'problem' ? problemLine(s.problem, t) : null;
  const busy = s.phase === 'checking' || s.phase === 'syncing';

  const onToggle = () => {
    select();
    if (on) {
      void setSyncEnabled(false);
      return;
    }
    announce(t.sync.syncing);
    void setSyncEnabled(true);
  };

  const onNow = () => {
    select();
    void requestSync();
  };

  // 다시 해 보기 — 켜져 있으면 지금 맞추기, 켜다가 멈췄으면(저장본을 남기지 못함) 다시 켜기
  const onRetry = () => {
    select();
    void (on ? requestSync() : setSyncEnabled(true));
  };

  return (
    <>
      <Section M={M} label={t.sync.sectionTitle} />
      <View testID={TID.setICloud}>
        <LineRow
          M={M}
          first
          last={!on}
          title={t.sync.toggle}
          sub={t.sync.toggleSub}
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityLabel={`${t.sync.toggle}, ${t.sync.toggleSub}`}
          checked={on}
          right={<Check on={on} color={M.ink} dark={M.dark} size={22} />}
        />
      </View>
      {on && (
        <View testID={TID.setICloudNow}>
          <LineRow
            M={M}
            last
            title={t.sync.now}
            onPress={busy ? undefined : onNow}
            accessibilityLabel={t.sync.now}
            accessibilityState={{ disabled: busy }}
          />
        </View>
      )}
      {!!line && (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 8 }}>{line}</Text>
      )}
      {problem && (
        <View style={{ marginTop: 12 }}>
          <RuledNotice
            M={M}
            title={problem.title}
            body={problem.body}
            action={
              problem.action === 'settings' ? { label: t.common.openSettings, onPress: () => { void Linking.openSettings(); } }
              : problem.action === 'retry' ? { label: t.common.retry, onPress: onRetry }
              : undefined
            }
          />
        </View>
      )}
    </>
  );
}
