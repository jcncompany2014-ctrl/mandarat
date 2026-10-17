// 알림 맞추기 — 문서의 알림 시각으로 앞날 14일 알림을 다시 짠다(notifier.apply).
// 그리지 않는 손잡이 — 늘 null을 돌려주고, 기기 호출은 1.5초 몰아서(debounce) 한다.
// 허락은 묻지 않는다(묻는 것은 설정 화면의 누름뿐). 이 기기에서 받지 않기로 했으면 빈 목록으로 우리 알림을 모두 지운다.
import { useEffect, useRef } from 'react';
import { useDoc } from '../store/MandaratContext';
import { useLang } from '../i18n/react';
import { notifier } from '../lib/notifier';
import { useNotifyDevice } from '../lib/notifyPrefs';
import { planKey, planReminders } from '../lib/reminders';

const DEBOUNCE_MS = 1500;

export function ReminderSync() {
  const { doc, ready, clock } = useDoc();
  const lang = useLang();
  const device = useNotifyDevice();
  // 마지막으로 건 목록의 열쇠 — null이면 앱을 연 뒤 아직 한 번도 걸지 않았다(첫 번은 늘 건다)
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!notifier.supported || !ready || device === null) return;
    let live = true;
    const timer = setTimeout(async () => {
      const plan = device ? planReminders(doc, new Date(), { lang }) : [];
      // 허락 상태도 열쇠에 넣는다 — 기기 설정에서 알림을 다시 켜고 돌아오면(clock이 바뀐다) 같은 목록이라도 다시 건다
      const key = `${await notifier.status()}|${planKey(plan)}`;
      if (!live || key === lastKey.current) return;
      lastKey.current = key;
      void notifier.apply(plan);
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [doc, ready, clock, lang, device]);

  return null;
}
