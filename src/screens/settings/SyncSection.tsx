// 설정 › iCloud와 백업의 iCloud 줄 — 켜고 끄는 줄 하나(정보 줄에 상태: 방금 · 언제 맞췄는지 · 맞추는 중), 문제가 있으면 알림 한 장,
// 켜져 있으면 '지금 맞추기'. 처음 켤 때 양쪽에 기록이 있으면 엔진이 묻고, 그 물음은 고르기 시트(SyncChoiceSheet)가 받는다.
// 구역 머리(iCloud와 백업)와 백업 줄은 설정 화면이 그린다 — 이 구역은 그 머리 바로 아래 iCloud 몫만.
// 웹 · 안드로이드 · Expo Go에는 iCloud가 없다 — 안내 한 장(백업 파일로 옮긴다)만. 저절로 묻거나 켜지 않는다.
import React from 'react';
import { Linking, Platform, View } from 'react-native';
import { icloud } from '../../../modules/icloud-sync';
import { RuledNotice } from '../../components/common';
import { Row, ToggleRow } from '../../components/kit';
import { select } from '../../lib/haptics';
import { requestSync, setSyncEnabled, useSyncStatus } from '../../lib/syncStatus';
import { TID } from '../../lib/testIds';
import { announce } from '../../lib/useReducedMotion';
import { useMsg } from '../../i18n/react';
import { useDoc } from '../../store/MandaratContext';
import type { M } from '../../theme/usePalette';
import { SET } from './rows';
import { problemLine, statusLine, syncSupported } from './syncView';

/** 이 기기에 iCloud 줄이 있는가 — 없으면(웹 · 안드로이드 · Expo Go) 안내 한 장이고, 설정 화면의 백업 줄이 그 아래 첫 줄이 된다 */
export const SYNC_ROWS = syncSupported(Platform.OS, icloud);

export function SyncSection({ M }: { M: M }) {
  const t = useMsg();
  if (!syncSupported(Platform.OS, icloud)) {
    return (
      <View style={{ marginTop: SET.noteTop, marginBottom: SET.noteTop }}>
        <RuledNotice M={M} title={t.sync.webNote} />
      </View>
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
  // 정보 줄 — 켜져 있으면 맞춘 때(목업: '오늘 9:12에 맞췄어요'), 할 말이 없거나 꺼져 있으면 무엇을 하는 줄인지
  const meta = (on && line) || t.sync.toggleSub;

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
      <ToggleRow
        M={M}
        title={t.sync.toggle}
        meta={meta}
        on={on}
        onToggle={onToggle}
        testID={TID.setICloud}
        accessibilityLabel={`${t.sync.toggle}, ${meta}`}
      />
      {on && (
        <Row
          M={M}
          divider
          title={t.sync.now}
          titleStyle={busy ? { color: M.ink2 } : undefined}
          onPress={busy ? undefined : onNow}
          // 맞추는 중에도 '흐린 버튼'으로 읽히게 — onPress가 없으면 Row는 읽기만 하는 줄이 된다
          accessibilityRole="button"
          accessibilityLabel={t.sync.now}
          accessibilityState={{ disabled: busy }}
          testID={TID.setICloudNow}
        />
      )}
      {problem && (
        <View style={{ marginTop: SET.noteTop, marginBottom: SET.noteTop }}>
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
