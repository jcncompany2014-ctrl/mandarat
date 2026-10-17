// iCloud 고르기 시트 — 처음 켤 때(또는 오래 맞추지 않았을 때) 이 기기와 iCloud 양쪽에 기록이 있으면 엔진이 묻는다(phase 'needsChoice').
// 두 장부(이 기기 | iCloud)를 보이고, 괘선 세 줄에서 하나를 고른 뒤 버튼으로 정한다. 미리 골라 둔 것은 없다.
// 어느 쪽을 골라도 엔진이 먼저 오늘 저장본을 남긴다(keepCopy) — 고르기 아래 한 줄이 그것을 알린다.
// 닫으면(고르지 않고) 맞추기를 켜지 않는다(setChoice(null)).
import React, { memo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { Check } from '../../components/Check';
import { PrimaryButton, RowDivider, RuledNotice, Sheet, pressedRow, useSheetDismiss } from '../../components/common';
import { SheetHead } from '../../components/TemplateSheet';
import { summarize, type BackupSummary } from '../../lib/backup';
import { ledgerRows, LEDGER_NONE } from '../../lib/backupLedger';
import { tap } from '../../lib/haptics';
import { useWindowDimensions } from '../../lib/screen';
import { setChoice, useSyncStatus, type SyncChoice } from '../../lib/syncStatus';
import { useMsg } from '../../i18n/react';
import { useDoc } from '../../store/MandaratContext';
import { NUM } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import type { MandaratDoc } from '../../types';
import { rowBase } from './rows';
import { CHOICES, choiceKey, choiceOpen, choiceText } from './syncView';

/** 두 장부를 나란히 놓는 쪽 폭 — 그보다 좁으면(폰) 위아래로 */
const SIDE_BY_SIDE = 520;

/**
 * 엔진이 물을 때만 시트를 띄운다. 답한 물음은 엔진이 다음으로 넘어갈 때까지 다시 띄우지 않는다.
 * 설정 › iCloud 구역이 붙인다(Root에 붙이면 어느 화면에서든 뜬다 — docs/v2/V5-E.md 넘겨줄 일).
 */
export const SyncChoiceHost = memo(function SyncChoiceHost({ M }: { M: M }) {
  const status = useSyncStatus();
  const [answered, setAnswered] = useState<object | null>(null);
  if (!choiceOpen(status, answered)) return null;
  const key = choiceKey(status);
  return (
    <SyncChoiceSheet
      M={M}
      remote={status.remote ?? null}
      onAnswer={(c) => {
        setAnswered(key);
        void setChoice(c);
      }}
    />
  );
});

export function SyncChoiceSheet({ M, remote, onAnswer }: {
  M: M;
  /** iCloud에 있는 기록(다른 기기 것을 모두 합친 문서) */
  remote: MandaratDoc | null;
  /** 시트가 닫힌 뒤 한 번 — 고른 것, 또는 고르지 않고 닫았으면 null */
  onAnswer: (choice: SyncChoice | null) => void;
}) {
  // 확인 버튼으로 닫을 때 고른 것을 여기에 두고, 닫힘(onClose)에서 한 번만 알린다
  const chosen = useRef<SyncChoice | null>(null);
  return (
    <Sheet M={M} ownClose onClose={() => onAnswer(chosen.current)}>
      <Body M={M} remote={remote} onConfirm={(c) => { chosen.current = c; }} />
    </Sheet>
  );
}

/** 시트 안쪽 — useSheetDismiss는 시트 안에서만 닿는다 */
function Body({ M, remote, onConfirm }: { M: M; remote: MandaratDoc | null; onConfirm: (c: SyncChoice) => void }) {
  const t = useMsg();
  const dismiss = useSheetDismiss();
  const { doc } = useDoc();
  const [pick, setPick] = useState<SyncChoice | null>(null);
  const confirm = () => {
    if (!pick) return;
    tap();
    onConfirm(pick);
    dismiss(true);
  };
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SheetHead M={M} title={t.sync.choiceTitle} body={t.sync.choiceBody} />
      <Ledgers M={M} here={summarize(doc)} cloud={remote ? summarize(remote) : null} />

      <View style={{ marginTop: 20 }} accessibilityRole="radiogroup">
        {CHOICES.map((c, i) => {
          const { title, sub } = choiceText(c, t);
          const on = pick === c;
          return (
            <Pressable
              key={c}
              onPress={() => { if (!on) { tap(); setPick(c); } }}
              accessibilityRole="radio"
              accessibilityLabel={`${title}, ${sub}`}
              {...a11yLangProp()}
              accessibilityState={{ checked: on, selected: on }}
              style={({ pressed }) => [rowBase(M, i === 0, i === CHOICES.length - 1), { alignItems: 'flex-start', paddingVertical: 12 }, pressed && !on ? pressedRow(M) : null]}
            >
              {i > 0 && <RowDivider M={M} inset={0} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: '700', color: M.ink }}>{title}</Text>
                <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }}>{sub}</Text>
              </View>
              <View style={{ paddingTop: 1 }}>
                <Check on={on} color={M.ink} dark={M.dark} size={22} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 14 }}>
        <RuledNotice M={M} title={t.sync.copyNote} />
      </View>

      <View style={{ marginTop: 20 }}>
        <PrimaryButton
          M={M}
          label={t.sync.confirm}
          accessibilityHint={pick ? undefined : t.sync.confirmHint}
          disabled={!pick}
          onPress={confirm}
        />
      </View>
    </View>
  );
}

/** 이 기기 · iCloud — 두 장부. 넓으면 나란히, 폰에서는 위아래로 */
function Ledgers({ M, here, cloud }: { M: M; here: BackupSummary; cloud: BackupSummary | null }) {
  const t = useMsg();
  const { width } = useWindowDimensions();
  const side = width >= SIDE_BY_SIDE;
  // 장부의 이름표와 값은 백업 불러오기와 같은 줄(backupLedger) — 지금 | 백업 자리에 이 기기 | iCloud
  const rows = ledgerRows(here, cloud ?? here);
  return (
    <View style={{ flexDirection: side ? 'row' : 'column', gap: side ? 20 : 14, marginTop: 6 }}>
      <Ledger M={M} head={t.sync.here} rows={rows.map((r) => ({ label: r.label, value: r.now, say: r.nowSay, text: r.text }))} />
      {cloud && (
        <Ledger M={M} head={t.sync.cloud} rows={rows.map((r) => ({ label: r.label, value: r.backup, say: r.backupSay, text: r.text }))} />
      )}
    </View>
  );
}

function Ledger({ M, head, rows }: {
  M: M;
  head: string;
  rows: { label: string; value: string; say?: string; text?: boolean }[];
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text accessibilityRole="header" style={{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: M.sub, paddingBottom: 6 }}>{head}</Text>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}>
        {rows.map((r, i) => (
          <View
            key={r.label}
            accessible
            accessibilityLabel={`${head}, ${r.label}, ${r.say ?? r.value}`}
            {...a11yLangProp()}
            style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderColor: M.line }}
          >
            <Text style={{ width: 84, fontSize: 13, lineHeight: 20, color: M.sub }}>{r.label}</Text>
            <Text
              style={[{ flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: r.value === LEDGER_NONE ? M.sub : M.ink }, r.text ? null : NUM]}
              numberOfLines={r.text ? 2 : 1}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
