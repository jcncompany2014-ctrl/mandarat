import { useCallback } from 'react';
import { useUIActions, type ToastOptions } from '../navigation/ui';
import type { MandaratDoc } from '../types';
import { useActions } from './MandaratContext';

/**
 * 통째로 바꾸는 동작(템플릿·초기화·예시·백업 불러오기)의 되돌리기 토스트.
 * 그 사이 다른 기록이 생겼다면 스냅샷으로 덮어써 잃지 않도록 되돌리지 않고 알려 준다.
 * 동작을 실행한 직후(같은 이벤트 안에서) 부를 것. opts는 토스트에 그대로 넘긴다(보이는 시간 등).
 */
export function useSnapshotUndo() {
  const { revision, replaceDoc } = useActions();
  const { showToast } = useUIActions();
  return useCallback(
    (message: string, snapshot: MandaratDoc, opts?: ToastOptions) => {
      const rev = revision();
      showToast(message, {
        label: '되돌리기',
        onPress: () => {
          if (revision() === rev) replaceDoc(snapshot);
          else showToast('그사이 바뀐 게 있어 되돌릴 수 없어요');
        },
      }, opts);
    },
    [revision, replaceDoc, showToast],
  );
}
