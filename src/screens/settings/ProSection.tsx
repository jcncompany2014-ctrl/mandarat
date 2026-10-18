// 설정 › 프로 — '프로'(시트를 연다) · '구입 복원'(iOS에서 늘 보인다).
// 값은 StoreKit의 displayPrice만 쓴다. 웹 · 안드로이드에는 결제가 없어 '구입 복원'이 없다.
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { LineRow } from '../../components/common';
import { useMsg } from '../../i18n/react';
import type { Messages } from '../../i18n';
import { tap } from '../../lib/haptics';
import { proNoteText } from '../../lib/pro';
import { TID } from '../../lib/testIds';
import { announce } from '../../lib/useReducedMotion';
import { useUIActions } from '../../navigation/ui';
import { usePro, useProActions } from '../../store/ProContext';
import type { M } from '../../theme/usePalette';
import { Section } from './rows';

/** iOS · iPadOS만 StoreKit으로 사고 복원한다 */
const STORE = Platform.OS === 'ios';

/** '프로' 줄의 설명 — 열려 있음 · '{값} · 한 번 결제' · 값을 불러오는 중 · 이 기기에서는 살 수 없음 */
export function proRowSub(m: Messages, owned: boolean, price: string | null, store = STORE): string {
  if (owned) return m.pro.rowOpen;
  if (!store) return m.pro.platformNote;
  return price !== null ? m.pro.rowPrice({ price }) : m.pro.busyPrice;
}

export function ProSection({ M }: { M: M }) {
  const m = useMsg();
  const { openPro, showToast } = useUIActions();
  const { owned, phase, price, note } = usePro();
  const { restore, clearNote } = useProActions();
  const sub = proRowSub(m, owned, price);

  // 여기서 누른 '구입 복원'의 결과는 토스트 한 줄로(시트가 없으니) — 그 밖의 안내는 시트가 말한다
  const asked = useRef(false);
  const live = useRef({ showToast, clearNote });
  live.current = { showToast, clearNote };
  useEffect(() => {
    if (!asked.current || !note || phase === 'restoring') return;
    asked.current = false;
    live.current.clearNote();
    live.current.showToast(proNoteText(note));
  }, [note, phase]);

  const onRestore = () => {
    if (phase === 'buying' || phase === 'restoring') return;
    tap();
    asked.current = true;
    announce(m.pro.busyRestoring);
    void restore();
  };

  const restoring = phase === 'restoring';
  return (
    <>
      <Section M={M} label={m.pro.sectionTitle} />
      <View testID={TID.setPro}>
        <LineRow
          M={M}
          first
          last={!STORE}
          title={m.pro.rowPro}
          sub={sub}
          right="chevron"
          accessibilityRole="button"
          accessibilityLabel={`${m.pro.rowPro}, ${sub}`}
          onPress={() => { tap(); openPro(); }}
        />
      </View>
      {STORE && (
        <View testID={TID.setRestore}>
          <LineRow
            M={M}
            last
            title={m.pro.restore}
            sub={restoring ? m.pro.busyRestoring : m.pro.restoreHint}
            accessibilityRole="button"
            accessibilityLabel={`${m.pro.restore}, ${restoring ? m.pro.busyRestoring : m.pro.restoreHint}`}
            accessibilityState={{ busy: restoring }}
            onPress={onRestore}
          />
        </View>
      )}
    </>
  );
}
