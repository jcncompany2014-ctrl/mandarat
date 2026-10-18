// 들어오는 링크 — mandarat:// 주소(위젯·Live Activity·사파리·단축어)와 알림 누르기를 화면 이동으로 바꾼다.
// 그리지 않는 손잡이 — 늘 null. 시작하기를 마친 갈래(Root)에만 붙으므로 시작하기 동안의 링크는 받지 않는다.
//
// - 앱을 연 주소(Linking.getInitialURL)는 프로세스마다 한 번만 읽는다(모듈 깃발) — 다시 붙어도 같은 주소로 또 옮기지 않는다.
// - 켜져 있는 동안의 주소는 Linking 'url', 알림 누르기는 notifier.onOpen(꺼져 있다 켜진 때도 한 번).
// - 웹 개발 번들에서는 window.__ui.openLink(url)로 부를 수 있다(scripts/smoke/links.js).
import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { useActions } from '../store/MandaratContext';
import { useUIActions, useUIState } from '../navigation/ui';
import { notifier } from '../lib/notifier';
import { crash } from '../lib/crash';
import { parseLink, resolveLink, runCommand } from '../lib/links';

/** 앱을 연 주소를 이미 읽었는지 — 프로세스마다 한 번 */
let initialTaken = false;

export function Inbound() {
  const ui = useUIActions();
  const { getDoc } = useActions();
  // 집중 타이머가 떠 있는지만 본다(focus/<칸> 링크가 도는 타이머를 바꾸지 않게)
  const { focus } = useUIState();
  const focusOpen = useRef(focus !== null);
  focusOpen.current = focus !== null;

  const run = useRef((url: string) => {
    const target = parseLink(url);
    if (!target) return;
    try {
      crash.crumb('link', target.to);
      runCommand(resolveLink(target, getDoc(), new Date(), { focusOpen: focusOpen.current }), ui);
    } catch (e) {
      crash.report(e, { where: 'inbound' });
    }
  }).current;

  useEffect(() => {
    let alive = true;
    if (!initialTaken) {
      initialTaken = true;
      Linking.getInitialURL()
        .then((url) => {
          if (alive && url) run(url);
        })
        .catch(() => {});
    }
    const sub = Linking.addEventListener('url', (e) => run(e.url));
    const off = notifier.onOpen(run);
    const g = globalThis as { __ui?: Record<string, unknown> };
    if (Platform.OS === 'web' && __DEV__) g.__ui = { ...(g.__ui ?? {}), openLink: run };
    return () => {
      alive = false;
      sub.remove();
      off();
      if (g.__ui?.openLink === run) delete g.__ui.openLink;
    };
  }, [run]);

  return null;
}
