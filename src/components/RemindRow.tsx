// 알림 시각 한 줄 — tile 받침 위에 [−] 오전 8:00 [+], 10분씩(자정을 넘으면 돌아간다).
// 설정 › 알림(시각 칩을 누르면 그 아래에 열린다)과 편집 창의 습관 알림이 같은 모양으로 쓴다. 화면 읽기에서는 한 줄 — 위아래로 쓸어 바꾼다.
// 그림(build-plan §3 S6): tile 받침(모서리 12), 바탕 없는 −/+ 글리프, 손끝 44, 가운데 시각은 먹(숫자 고정폭).
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from './AppText';
import { Icon } from './Icon';
import { useMsg } from '../i18n/react';
import { tap } from '../lib/haptics';
import { GEO } from '../theme/tokens';
import { NUM, ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';

/** 한 번에 움직이는 분 */
export const REMIND_STEP = 10;
const DAY_MIN = 24 * 60;

/** 'HH:MM' → 자정부터 분(틀린 글이면 0) */
export function timeToMin(v: string): number {
  const hit = /^(\d{2}):(\d{2})$/.exec(v);
  if (!hit) return 0;
  const h = Number(hit[1]);
  const m = Number(hit[2]);
  return h < 24 && m < 60 ? h * 60 + m : 0;
}

/** 분 → 'HH:MM'(하루를 넘으면 돌아간다) */
export function minToTime(n: number): string {
  const v = ((Math.round(n) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`;
}

/** 10분 앞뒤로 — 23:50 다음은 00:00, 00:00 앞은 23:50 */
export function stepTime(v: string, dir: 1 | -1): string {
  return minToTime(timeToMin(v) + dir * REMIND_STEP);
}

/** 가운데 시각 칸의 최소 폭 — '오후 12:50' · '午後12:50' · '12:50 PM'이 흔들리지 않게 */
const TIME_MIN_W = 104;

export function RemindRow({ M, value, onChange, label, testID }: {
  M: M;
  /** 'HH:MM' */
  value: string;
  onChange: (v: string) => void;
  /** 화면 읽기 이름 — '아침 알림 시각' */
  label: string;
  testID?: string;
}) {
  const t = useMsg();
  const n = timeToMin(value);
  const shown = t.fmt.time({ h: Math.floor(n / 60), m: n % 60 });
  const step = (dir: 1 | -1) => {
    tap();
    onChange(stepTime(value, dir));
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      {...a11yLangProp()}
      accessibilityValue={{ text: shown }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const name = e.nativeEvent.actionName;
        if (name === 'increment') step(1);
        else if (name === 'decrement') step(-1);
      }}
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: GEO.rField, backgroundColor: M.tile }}
    >
      <StepBtn M={M} icon="minus" label={t.notify.earlier} onPress={() => step(-1)} />
      <Text
        style={{ ...ROLE.rowTitle, ...NUM, color: M.ink, minWidth: TIME_MIN_W, textAlign: 'center' }}
        accessibilityLiveRegion="polite"
        numberOfLines={1}
      >
        {shown}
      </Text>
      <StepBtn M={M} icon="plus" label={t.notify.later} onPress={() => step(1)} />
    </View>
  );
}

/** 한 단계 — 받침 위 바탕 없는 글리프(먹 16), 손끝 44. 누르면 잠깐 흐려진다 */
function StepBtn({ M, icon, label, onPress }: { M: M; icon: 'plus' | 'minus'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...a11yLangProp()}
      style={({ pressed }) => ({
        width: 44, height: 44,
        alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name={icon} size={16} color={M.ink} />
    </Pressable>
  );
}
