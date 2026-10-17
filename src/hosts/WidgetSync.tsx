// 위젯 맞추기 — 오늘 목록으로 위젯 타임라인을 쓰고, 위젯·Siri가 남긴 체크를 읽어 들인다.
// 그리지 않는 손잡이 — 늘 null을 돌려주고, 문서가 바뀌면 1초 몰아서(debounce) 한다.
//
// 쓰기 전에 늘 읽는다: updateTimeline은 저장된 배열을 통째로 바꾸는데, 위젯 버튼(expo-widgets AppIntent)과
// Siri(V3-B)는 다른 프로세스에서 아무 때나 그 배열의 props.ops에 체크를 덧붙인다. 그래서 모든 쓰기는 한 줄의
// 약속 사슬(chain) 위에서 readOps() → planOps → 명령 돌리기 → 그 뒤 문서로 만든 타임라인 쓰기, 한 덩어리로 돈다.
// 그냥 쓰면 앱이 뒤에 열려 있는 동안 위젯에서 한 체크를 지워 버린다.
// 온보딩을 마치기 전에는 읽지도 쓰지도 않는다 — 위젯 모습의 {} 기본값이 빈 모습을 그린다.
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useActions, useDoc } from '../store/MandaratContext';
import { useUIActions } from '../navigation/ui';
import { usePro } from '../store/ProContext';
import { useLang } from '../i18n/react';
import type { WidgetPattern } from '../lib/contracts';
import { crash } from '../lib/crash';
import { proValue } from '../lib/pro';
import { opId, planOps, type WidgetCommand } from '../lib/widgetOps';
import { toWidgetEntries, widgetTimeline } from '../lib/widgetSnapshot';
import { widgetBridge } from '../widgets/bridge';

const DEBOUNCE_MS = 1000;
/** 위젯은 iOS에만 있다 — 웹·Android에서는 타임라인을 세지도 않는다(다리도 아무것도 하지 않는다) */
const HAS_WIDGET = Platform.OS === 'ios';

export function WidgetSync() {
  const { doc, ready, clock } = useDoc();
  const actions = useActions();
  const { startFocus, go } = useUIActions();
  const { owned } = usePro();
  const lang = useLang();
  const onboarded = doc.onboarded;
  // 종이 무늬는 프로 — 없으면 점(아무것도 그리지 않는다). 저장된 선택은 그대로 둔다
  const pat: WidgetPattern = proValue<WidgetPattern>(doc.settings.paper ?? 'dots', 'dots', (p) => p !== 'dots', owned);

  // 사슬 안에서 읽는 지금 값 — 사슬은 렌더보다 늦게 돌 수 있다
  const live = useRef({ ready, onboarded, pat, lang, startFocus, go });
  live.current = { ready, onboarded, pat, lang, startFocus, go };
  const chain = useRef<Promise<void>>(Promise.resolve());
  // 마지막으로 쓴 타임라인의 모양 — 같으면 다시 쓰지 않는다(위젯 다시 그리기는 하루 횟수가 정해져 있다)
  const lastSig = useRef<string | null>(null);
  // 이미 돌린 집중·열기 op — 상태와 견줄 수 없어 기억해 둔다(쓰기가 실패해 같은 op를 또 읽어도 한 번만)
  const seen = useRef(new Set<string>());

  const run = useCallback(
    (cmd: WidgetCommand) => {
      if (cmd.kind === 'checkToday') actions.checkToday(cmd.ti, cmd.ai);
      else if (cmd.kind === 'toggleHabitOn') actions.toggleHabitOn(cmd.ti, cmd.ai, cmd.day);
      else if (cmd.kind === 'toggleExtra') actions.toggleExtra(cmd.id);
      else if (cmd.kind === 'focus') live.current.startFocus(cmd.ti, cmd.ai);
      else live.current.go('today');
    },
    [actions],
  );

  /** 읽기 → 돌리기 → 쓰기, 한 덩어리를 사슬 끝에 건다 */
  const sync = useCallback(() => {
    chain.current = chain.current
      .then(async () => {
        if (!live.current.ready || !live.current.onboarded) return;
        const ops = await widgetBridge.readOps();
        if (ops.length > 0) {
          crash.crumb('widget', `ops ${ops.length}`);
          const cmds = planOps(ops, actions.getDoc(), new Date(), seen.current);
          for (const op of ops) if (op.kind !== 'check') seen.current.add(opId(op));
          for (const cmd of cmds) run(cmd);
        }
        // 명령을 돌린 뒤의 문서(update는 곧바로 getDoc에 보인다)
        const d = actions.getDoc();
        if (!d.onboarded) return;
        const { pat: p, lang: l } = live.current;
        const timeline = widgetTimeline(d, new Date(), { pat: p, lang: l });
        // 첫 칸의 시각(now)은 늘 달라서 빼고 견준다 — 날짜는 props.day가 담는다
        const sig = JSON.stringify(timeline.map((e) => e.props));
        // 읽은 ops가 있으면 모양이 같아도 쓴다(쓰면서 ops를 비운다)
        if (ops.length === 0 && sig === lastSig.current) return;
        widgetBridge.writeTimeline(toWidgetEntries(timeline));
        lastSig.current = sig;
      })
      .catch((e) => crash.report(e, { where: 'widgetSync' }));
  }, [actions, run]);

  // 문서·언어·무늬·시계(자정 · 앱으로 돌아옴)가 바뀌면 1초 몰아서
  useEffect(() => {
    if (!HAS_WIDGET || !ready || !onboarded) return;
    const timer = setTimeout(sync, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [doc, ready, onboarded, clock, lang, pat, sync]);

  // 처음(저장본을 읽고 온보딩을 마친 뒤)과 앱이 앞으로 나올 때는 곧바로 — 위젯에서 한 체크를 먼저 들인다.
  // 앞으로 나올 때는 한 박자 늦춘다: 문서의 하루 정리(같은 'active'에서 돈다)가 먼저 끝나게
  useEffect(() => {
    if (!HAS_WIDGET || !ready || !onboarded) return;
    sync();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(sync, 0);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [ready, onboarded, sync]);

  return null;
}
