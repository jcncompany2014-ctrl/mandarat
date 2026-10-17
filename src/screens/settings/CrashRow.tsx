// 설정 › 정보 — '오류 기록 보내기' 체크 줄(V4-F). 기기마다(crashPrefs) 정하고, 문서·백업에는 들어가지 않는다.
// iOS · iPadOS에서만 보인다 — 웹·안드로이드는 오류를 보내지 않으므로 줄도 없다.
// 미리보기 빌드(EXPO_PUBLIC_APP_ENV === 'preview')에서만: 줄을 길게 누르면 시험 오류를 보내고, 아래 링크는 네이티브에서 앱을 멈춘다
// (기기 QA). 출시 빌드에는 그 갈래가 없다.
import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { a11yLangProp } from '../../components/AppText';
import { Check } from '../../components/Check';
import { LineRow, pressedRow } from '../../components/common';
import { useMsg } from '../../i18n/react';
import { crash } from '../../lib/crash';
import { useCrashOff, writeCrashOff } from '../../lib/crashPrefs';
import { select, tap } from '../../lib/haptics';
import { TID } from '../../lib/testIds';
import { announce } from '../../lib/useReducedMotion';
import { useUIActions } from '../../navigation/ui';
import { TextLink } from './rows';
import type { M } from '../../theme/usePalette';

/** 오류를 보내는 플랫폼 — Sentry는 iOS 앱에서만 쓴다 */
const SHOWN = Platform.OS === 'ios';
/** 미리보기 빌드 — 길게 눌러 시험 오류 */
const PREVIEW = process.env.EXPO_PUBLIC_APP_ENV === 'preview';

export function CrashRow({ M }: { M: M }) {
  if (!SHOWN) return null;
  return <CrashCheck M={M} />;
}

function CrashCheck({ M }: { M: M }) {
  const t = useMsg();
  const { showToast } = useUIActions();
  // 읽기 전(null)에는 켜진 것으로 — 기본이 켜짐이다
  const on = useCrashOff() !== true;
  const label = `${t.crash.row}, ${t.crash.rowSub}`;

  const onToggle = () => {
    select();
    const next = !on;
    crash.setEnabled(next);
    void writeCrashOff(!next);
  };

  const check = <Check on={on} color={M.ink} dark={M.dark} size={22} />;

  if (PREVIEW) {
    const onLong = () => {
      tap();
      crash.report(new Error('qa-test'), { where: 'crash-row' });
      showToast(t.crash.qaSent);
      announce(t.crash.qaSent);
    };
    return (
      <View style={{ marginTop: 14 }} testID={TID.setCrash}>
        <Pressable
          onPress={onToggle}
          onLongPress={onLong}
          accessibilityRole="checkbox"
          accessibilityLabel={label}
          accessibilityState={{ checked: on }}
          {...a11yLangProp()}
          style={({ pressed }) => (pressed ? pressedRow(M) : null)}
        >
          <LineRow M={M} first last title={t.crash.row} sub={t.crash.rowSub} right={check} />
        </Pressable>
        {/* 네이티브 멈춤 시험 — 설치 번호(user.id) · 기호 풀이를 기기에서 확인한다(RELEASE_CHECKLIST, R-8 #1) */}
        <View style={{ paddingTop: 8 }}>
          <TextLink M={M} label={t.crash.qaNative} onPress={() => crash.qaNativeCrash()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 14 }} testID={TID.setCrash}>
      <LineRow
        M={M}
        first
        last
        title={t.crash.row}
        sub={t.crash.rowSub}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        checked={on}
        right={check}
      />
    </View>
  );
}
