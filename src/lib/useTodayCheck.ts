import { useMemo } from 'react';
import { useActions, dateKey } from '../store/MandaratContext';
import { useUIActions } from '../navigation/ui';
import { check as checkHaptic, tap, uncheck as uncheckHaptic } from './haptics';
import { animateLayout } from './layoutAnim';
import { announce, screenReader } from './useReducedMotion';
import { MAX_NUM, countInfo, round2 } from './kinds';
import { doneOn, doneToday, extraLogKey, kindOf, todayProgress, type TodayItem } from './routine';
import { EXTRA_REMOVED, addedSpeech, checkLabelText, checkedSpeech, goalText, reachesGoal, undoAddText } from './todayCheck';
import type { TodayExtra } from '../types';

/**
 * 오늘 줄의 체크 — 홈과 오늘(목록·보드)이 함께 쓴다. 화면은 이 함수들만 부르고, 촉감·토스트·읽어 주기는 여기서 맡는다.
 *
 * - toggle(it): 실천 줄의 체크. 습관은 오늘 기록, 쌓기는 한 번(step) 더하기 / 이미 더했으면 오늘 더한 것 빼기, 한 번은 칸 달성.
 *   촉감은 check() / uncheck() 하나뿐(하루 마감의 success()는 Root가 울린다).
 *   쌓기를 풀면 '오늘 더한 3권을 뺐어요' + 되돌리기, 이번 체크로 목표에 닿으면 '12권 목표를 달성했어요'.
 *   했는지는 줄(it.done)이 아니라 누르는 순간의 문서와 오늘 날짜로 다시 본다 — 자정을 넘긴 직후 어제 그린 줄을 눌러도
 *   오늘 기준으로 체크·촉감·알림이 맞게.
 * - addStep(it): 쌓기 줄 오른쪽 '+1권' 버튼 — 다 한 줄에서도 한 번 더 더한다(오늘 더한 것을 빼지 않는다).
 * - toggleExtra(x): 직접 추가한 할 일의 체크.
 * - removeExtra(x): 직접 추가한 할 일 지우기 — '할 일을 지웠어요' + 되돌리기(지운 것만 되살린다).
 * - checkLabel(it): 체크 칸의 화면 읽기 이름 — 글 그대로, 쌓기는 '책 읽기, 1권 더하기'.
 * 체크해서 '했어요'가 되면, 화면 읽기가 켜져 있을 때 '물 마시기, 했어요. 오늘 3개 남았어요'를 읽어 준다.
 * 함수들은 누르는 순간의 문서를 읽으므로 앱이 도는 내내 같은 객체다 — 줄(memo)이 체크마다 다시 그려지지 않게.
 * 줄이 내려가는 애니메이션(useSettle · animateLayout)은 화면이 맡는다 — 지우기·되살리기만 여기서 부드럽게 잇는다.
 */
export interface TodayCheck {
  toggle: (it: TodayItem) => void;
  toggleExtra: (x: TodayExtra) => void;
  removeExtra: (x: TodayExtra) => void;
  addStep: (it: TodayItem) => void;
  checkLabel: (it: TodayItem) => string;
}

export function useTodayCheck(): TodayCheck {
  const { getDoc, checkToday, addCount, toggleExtra: flipExtra, removeExtra: dropExtra, restoreExtra } = useActions();
  const { showToast } = useUIActions();

  return useMemo<TodayCheck>(() => {
    const textOf = (it: TodayItem) => getDoc().themes[it.ti]?.actions[it.ai]?.text ?? '';

    // 지금 하나를 '했어요'로 바꾼 뒤 남는 수(바꾸기 전 문서로 센다)
    const leftAfterOne = () => {
      const p = todayProgress(getDoc(), new Date());
      return Math.max(0, p.total - p.done - 1);
    };
    const speakChecked = (text: string) => {
      if (screenReader()) announce(checkedSpeech(text, leftAfterOne()));
    };

    const toggle = (it: TodayItem) => {
      const doc = getDoc();
      const a = doc.themes[it.ti]?.actions[it.ai];
      if (!a) return;
      const tk = dateKey();
      const done = doneToday(doc, a, it.key, tk);
      if (done) uncheckHaptic();
      else checkHaptic();
      if (kindOf(a) === 'count') {
        const c = countInfo(a, tk);
        if (!done && reachesGoal(c)) showToast(goalText(c));
        // 체크를 풀면 그날 더한 것을 한꺼번에 빼므로, 잘못 눌렀을 때 살릴 수 있게
        if (done && c.today > 0) {
          const amount = c.today;
          showToast(undoAddText(amount, c.unit), { label: '되돌리기', onPress: () => addCount(it.ti, it.ai, amount) });
        }
      }
      checkToday(it.ti, it.ai);
      if (!done) speakChecked(a.text);
    };

    const addStep = (it: TodayItem) => {
      const doc = getDoc();
      const a = doc.themes[it.ti]?.actions[it.ai];
      if (!a || kindOf(a) !== 'count') return;
      const tk = dateKey();
      const done = doneToday(doc, a, it.key, tk);
      const c = countInfo(a, tk);
      checkHaptic();
      addCount(it.ti, it.ai, c.step);
      if (reachesGoal(c)) showToast(goalText(c));
      if (!done) speakChecked(a.text);
      else if (screenReader()) announce(addedSpeech(a.text, { ...c, count: Math.min(MAX_NUM, round2(c.count + c.step)) }));
    };

    const toggleExtra = (x: TodayExtra) => {
      // 줄이 그려진 뒤 바뀌었을 수 있어 지금 문서의 것으로 본다
      const cur = getDoc().todayExtra.find((e) => e.id === x.id);
      if (!cur) return;
      if (cur.done) uncheckHaptic();
      else checkHaptic();
      flipExtra(cur.id);
      if (!cur.done) speakChecked(cur.text);
    };

    // 되돌리기는 지운 할 일만 되살린다(그 사이 다른 체크는 그대로)
    const removeExtra = (x: TodayExtra) => {
      const doc = getDoc();
      const index = doc.todayExtra.findIndex((e) => e.id === x.id);
      if (index < 0) return;
      const cur = doc.todayExtra[index];
      const day = dateKey();
      const logged = doneOn(doc.dayLog, extraLogKey(cur.ti, cur.id), day);
      tap();
      animateLayout();
      dropExtra(cur.id);
      showToast(EXTRA_REMOVED, { label: '되돌리기', onPress: () => { animateLayout(); restoreExtra(cur, index, logged, day); } });
    };

    const checkLabel = (it: TodayItem) => {
      const a = getDoc().themes[it.ti]?.actions[it.ai];
      return checkLabelText(textOf(it), it.kind, a && it.kind === 'count' ? countInfo(a) : undefined);
    };

    return { toggle, toggleExtra, removeExtra, addStep, checkLabel };
    // 저장소·화면의 함수들은 고정돼 있다 — 처음 한 번만 만든다
  }, [getDoc, checkToday, addCount, flipExtra, dropExtra, restoreExtra, showToast]);
}
