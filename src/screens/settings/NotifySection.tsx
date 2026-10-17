// 설정 › 알림 — 아침(오늘 할 일) · 저녁(남은 일) · 한 주 돌아보기, 켠 줄 아래 시각 고르기, 이 기기에서 받을지.
// 시각은 문서(settings.reminders)에 있어 기기끼리 맞춰지고, 울릴지는 기기마다(notifyPrefs) 정한다.
// 허락은 누를 때만 묻는다(앱을 열 때나 맞춘 뒤에 저절로 묻지 않는다). 웹·알림이 없는 기기는 안내 한 줄.
import React, { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Text } from '../../components/AppText';
import { Check } from '../../components/Check';
import { LineRow, RuledNotice } from '../../components/common';
import { RemindRow } from '../../components/RemindRow';
import type { NotifyStatus } from '../../lib/contracts';
import { select } from '../../lib/haptics';
import { notifier } from '../../lib/notifier';
import { useNotifyDevice, writeNotifyDevice } from '../../lib/notifyPrefs';
import { REVIEW_HOUR } from '../../lib/reminders';
import { TID } from '../../lib/testIds';
import { announce } from '../../lib/useReducedMotion';
import { useMsg } from '../../i18n/react';
import { useActions, useDoc } from '../../store/MandaratContext';
import type { M } from '../../theme/usePalette';
import type { MandaratDoc, Reminders } from '../../types';
import { Section } from './rows';

type TimedKind = 'morning' | 'evening';
type Kind = TimedKind | 'review';

/** 처음 켤 때의 시각 */
const DEFAULT_TIME: Record<TimedKind, string> = { morning: '08:00', evening: '21:00' };

/** 문서에 이 기기가 울릴 알림이 하나라도 있는가(아침 · 저녁 · 돌아보기 · 습관 시각) */
function hasReminders(doc: Pick<MandaratDoc, 'settings' | 'themes'>): boolean {
  const r = doc.settings.reminders;
  if (r && (r.morning || r.evening || r.review)) return true;
  return doc.themes.some((th) => th.actions.some((a) => a.kind === 'habit' && !!a.remindAt && !!a.text.trim()));
}

/** 켠 것만 남긴다 — 모두 끄면 필드가 없다(types.ts Reminders) */
function cleanSet(r: Reminders): Reminders | undefined {
  const out: Reminders = {};
  if (r.morning) out.morning = r.morning;
  if (r.evening) out.evening = r.evening;
  if (r.review) out.review = true;
  return Object.keys(out).length > 0 ? out : undefined;
}

function hhmm(v: string): { h: number; m: number } {
  const [h, m] = v.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

export function NotifySection({ M }: { M: M }) {
  const t = useMsg();
  if (!notifier.supported) {
    return (
      <>
        <Section M={M} label={t.notify.sectionTitle} />
        <RuledNotice M={M} title={t.common.iosOnly} />
      </>
    );
  }
  return <NotifyRows M={M} />;
}

function NotifyRows({ M }: { M: M }) {
  const t = useMsg();
  const { doc, clock } = useDoc();
  const { getDoc, setSetting } = useActions();
  const device = useNotifyDevice() === true;
  const [status, setStatus] = useState<NotifyStatus | null>(null);
  /** 방금 누른 뒤 거절됐다 — 알림이 아직 하나도 없어도 안내를 보인다 */
  const [refused, setRefused] = useState(false);
  // 끈 줄을 다시 켜면 이번에 쓰던 시각으로
  const lastTime = useRef<Record<TimedKind, string>>({ ...DEFAULT_TIME });

  // 허락 상태는 읽기만 한다 — 앱으로 돌아올 때(clock) 다시 읽는다(기기 설정에서 바꿨을 수 있다)
  useEffect(() => {
    let live = true;
    notifier.status().then((s) => { if (live) setStatus(s); }, () => {});
    return () => { live = false; };
  }, [clock]);

  const rem = doc.settings.reminders ?? {};
  const any = hasReminders(doc);

  /** 누를 때만 — 처음이면 허락을 묻고, 받으면 이 기기를 켠다. 켤 수 있으면 true */
  const allowFromPress = async (): Promise<boolean> => {
    let s = await notifier.status();
    if (s === 'undetermined') s = await notifier.request();
    setStatus(s);
    if (s === 'granted') {
      setRefused(false);
      await writeNotifyDevice(true);
      return true;
    }
    if (s === 'denied') {
      setRefused(true);
      announce(t.notify.denied);
    }
    return false;
  };

  /** 지금 문서 위에 한 가지만 바꿔 저장한다(허락을 기다리는 사이 바뀐 것을 덮지 않게) */
  const save = (patch: Partial<Record<Kind, string | true | undefined>>) => {
    const cur = getDoc().settings.reminders ?? {};
    setSetting('reminders', cleanSet({ ...cur, ...patch } as Reminders));
  };

  const onToggle = (k: Kind) => {
    select();
    const on = !!rem[k];
    if (on) {
      if (k !== 'review' && rem[k]) lastTime.current[k] = rem[k] as string;
      save({ [k]: undefined });
      return;
    }
    void allowFromPress().then((ok) => {
      if (!ok) return;
      save({ [k]: k === 'review' ? true : lastTime.current[k] });
    });
  };

  const onDevice = () => {
    select();
    if (device) {
      void writeNotifyDevice(false);
      return;
    }
    void allowFromPress();
  };

  const onAllow = () => {
    select();
    void allowFromPress();
  };

  const setTime = (k: TimedKind, v: string) => {
    lastTime.current[k] = v;
    save({ [k]: v });
  };

  const timeText = (v: string) => t.fmt.time(hhmm(v));
  const rows: { k: Kind; title: string; sub: string; timeLabel?: string }[] = [
    { k: 'morning', title: t.notify.morning, sub: t.notify.morningSub({ time: timeText(rem.morning ?? lastTime.current.morning) }), timeLabel: t.notify.morningTime },
    { k: 'evening', title: t.notify.evening, sub: t.notify.eveningSub({ time: timeText(rem.evening ?? lastTime.current.evening) }), timeLabel: t.notify.eveningTime },
    { k: 'review', title: t.notify.reviewTitle, sub: t.notify.reviewSub({ dow: t.fmt.dowLong({ i: 0 }), time: t.fmt.time({ h: REVIEW_HOUR, m: 0 }) }) },
  ];

  const showDenied = status === 'denied' && (any || refused);
  const showAsk = !showDenied && status === 'undetermined' && any;
  const showDevice = status === 'granted' && any;

  return (
    <>
      <Section M={M} label={t.notify.sectionTitle} />
      <View>
        {rows.map(({ k, title, sub, timeLabel }, i) => {
          const on = !!rem[k];
          return (
            <React.Fragment key={k}>
              <View testID={TID.setNotify(k)}>
                <LineRow
                  M={M}
                  first={i === 0}
                  last={i === rows.length - 1}
                  title={title}
                  sub={sub}
                  onPress={() => onToggle(k)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${title}, ${sub}`}
                  checked={on}
                  right={<Check on={on} color={M.ink} dark={M.dark} size={22} />}
                />
              </View>
              {on && k !== 'review' && timeLabel && (
                <View style={{ paddingLeft: 2, paddingBottom: 8 }}>
                  <RemindRow M={M} value={rem[k] as string} onChange={(v) => setTime(k, v)} label={timeLabel} testID={TID.setNotify(`${k}-time`)} />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 8 }}>{t.notify.habitNote}</Text>

      {showDevice && (
        <View style={{ marginTop: 12 }} testID={TID.setNotifyDevice}>
          <LineRow
            M={M}
            first
            last
            title={device ? t.notify.device : t.notify.deviceAlso}
            onPress={onDevice}
            accessibilityRole="checkbox"
            accessibilityLabel={device ? t.notify.device : t.notify.deviceAlso}
            checked={device}
            right={<Check on={device} color={M.ink} dark={M.dark} size={22} />}
          />
        </View>
      )}
      {showDenied && (
        <View style={{ marginTop: 12 }}>
          <RuledNotice
            M={M}
            title={t.notify.denied}
            body={t.notify.deniedBody}
            action={{ label: t.common.openSettings, onPress: () => { void Linking.openSettings(); } }}
          />
        </View>
      )}
      {showAsk && (
        <View style={{ marginTop: 12 }}>
          <RuledNotice M={M} title={t.notify.undetermined} action={{ label: t.notify.allow, onPress: onAllow }} />
        </View>
      )}
    </>
  );
}
