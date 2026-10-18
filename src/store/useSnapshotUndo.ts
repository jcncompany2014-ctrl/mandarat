import { useCallback } from 'react';
import { useUIActions, type ToastOptions } from '../navigation/ui';
import type { MandaratDoc } from '../types';
import { useActions } from './MandaratContext';
import { useMsg } from '../i18n/react';

/** 되돌리기 토스트 — 그 사이 다른 기록이 생겼으면 restore를 부르지 않고 알려 준다 */
function useUndoToast(restore: (snapshot: MandaratDoc) => void) {
  const { revision } = useActions();
  const { showToast } = useUIActions();
  const m = useMsg();
  return useCallback(
    (message: string, snapshot: MandaratDoc, opts?: ToastOptions) => {
      const rev = revision();
      showToast(message, {
        label: m.common.undo,
        onPress: () => {
          if (revision() === rev) restore(snapshot);
          else showToast(m.core.undoStale);
        },
      }, opts);
    },
    [revision, restore, showToast, m],
  );
}

/**
 * 통째로 바꾸는 동작(템플릿·초기화·예시·백업 불러오기)의 되돌리기 토스트.
 * 그 사이 다른 기록이 생겼다면 스냅샷으로 덮어써 잃지 않도록 되돌리지 않고 알려 준다.
 * 동작을 실행한 직후(같은 이벤트 안에서) 부를 것. opts는 토스트에 그대로 넘긴다(보이는 시간 등).
 */
export function useSnapshotUndo() {
  return useUndoToast(useActions().replaceDoc);
}

/**
 * 처음부터 다시(resetAll)의 되돌리기 토스트 — 되돌리면 undoReset: 새 판을 아직 올리지 않았으면 맞추기 판까지 거둔다(R-1 F2).
 * snapshot은 resetAll 직전의 getDoc(). 그 밖은 useSnapshotUndo와 같다.
 */
export function useResetUndo() {
  return useUndoToast(useActions().undoReset);
}
