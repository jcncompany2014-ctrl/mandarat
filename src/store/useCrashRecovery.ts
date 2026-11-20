// 오류가 났을 때 저장소 쪽에서 하는 일 둘.
// - 오류 화면에서 고른 '저장본으로 열기'를 마친다(src/lib/crashRecover.ts가 넘겨준다). 설정 › 저장본과 같은 길이다 —
//   readSnapshot으로 읽어 replaceDoc으로 바꾸고, 같은 되돌리기 토스트를 권한다.
// - 이 기기의 오류 기록(src/lib/crashLog.ts)이 메시지에서 문서의 글을 지울 수 있게, 지금 문서를 읽는 길을 붙인다.
import { useEffect, useState } from 'react';
import { setLogPrivate } from '../lib/crashLog';
import { clearSnapOpen, keepSnapUndo, pendingSnapOpen, takeSnapUndo } from '../lib/crashRecover';
import { fmtDateLong } from '../lib/text';
import { useMsg } from '../i18n/react';
import { useActions } from './MandaratContext';
import { useSnapshotUndo } from './useSnapshotUndo';

/**
 * 문지기(App.tsx Gate)용 — 오류 기록에 지금 문서를 읽는 길을 붙인다. 기록은 그 문서 안의 글을 메시지에서 지우는 데만 쓴다
 * (문서를 어디에도 적지 않는다). 저장소가 내려가도 떼지 않는다 — 마지막 문서로 계속 지운다(오류 화면이 뜬 동안에도).
 */
export function useLogPrivacy(): void {
  const { getDoc } = useActions();
  useEffect(() => {
    setLogPrivate(getDoc);
  }, [getDoc]);
}

/**
 * 문지기(App.tsx Gate)용 — 열어 달라고 한 저장본이 있으면 첫 화면을 그리기 전에 그 저장본으로 바꾼다. 바꾸는 동안 참.
 * 처음 그릴 때부터 참이어야 한다: 한 번이라도 지금 문서로 화면을 그리면 같은 오류가 또 난다.
 */
export function useSnapOpen(ready: boolean): boolean {
  const { readSnapshot, replaceDoc, getDoc } = useActions();
  const [busy, setBusy] = useState(() => pendingSnapOpen() !== null);
  useEffect(() => {
    if (!ready || !busy) return;
    const day = pendingSnapOpen();
    if (!day) {
      setBusy(false);
      return;
    }
    let alive = true;
    readSnapshot(day)
      .catch(() => null)
      .then((saved) => {
        // 그사이 내려갔으면 그대로 둔다 — 다시 뜬 쪽이 같은 날을 다시 읽는다
        if (!alive || pendingSnapOpen() !== day) return;
        clearSnapOpen();
        if (saved) {
          const before = getDoc();
          // 설정(종이 무늬 · 알림 · 마지막 백업 날)은 지금 것을 그대로 — 되돌리는 건 기록이다(설정 › 저장본과 같다)
          replaceDoc({ ...saved, settings: before.settings });
          keepSnapUndo(day, before);
        }
        setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [ready, busy, readSnapshot, replaceDoc, getDoc]);
  return busy;
}

/** 그리지 않는 손잡이(Root) — 오류 화면에서 연 저장본의 되돌리기를 다시 뜬 앱에서 한 번 권한다 */
export function SnapOpenNotice() {
  const offerUndo = useSnapshotUndo();
  const m = useMsg();
  useEffect(() => {
    const u = takeSnapUndo();
    if (u) offerUndo(m.settings.snapRestored({ date: fmtDateLong(u.day) }), u.doc);
  }, [offerUndo, m]);
  return null;
}
