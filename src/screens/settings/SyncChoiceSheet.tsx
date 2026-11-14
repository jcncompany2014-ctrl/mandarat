// iCloud 고르기 시트 — 처음 켤 때(또는 오래 맞추지 않았을 때) 이 기기와 iCloud 양쪽에 기록이 있으면 엔진이 묻는다(phase 'needsChoice').
// 두 장부(이 기기 | iCloud)를 보이고, 고르기 줄 셋에서 하나를 고른 뒤 단추로 정한다. 미리 골라 둔 것은 없다.
// 어느 쪽을 골라도 엔진이 먼저 오늘 저장본을 남긴다(keepCopy) — 고르기 아래 알림 한 장이 그것을 알린다.
// 닫으면(고르지 않고) 맞추기를 켜지 않는다(setChoice(null)).
// 시트는 부품 상자의 시트(안쪽 24, 떠 있는 판) · 머리(SheetHead) · 고르기 줄(펜 획) · 검은 단추.
import React, { memo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { Button, RuledNotice, Sheet, useSheetDismiss } from '../../components/common';
import { ChoiceTick, KIT_TYPE, ROW, RowRule, RowTitle } from '../../components/kit';
import { SheetHead } from '../../components/TemplateSheet';
import { summarize, type BackupSummary } from '../../lib/backup';
import { ledgerRows, LEDGER_NONE } from '../../lib/backupLedger';
import { tap } from '../../lib/haptics';
import { useWindowDimensions } from '../../lib/screen';
import { setChoice, useSyncStatus, type SyncChoice } from '../../lib/syncStatus';
import { useMsg } from '../../i18n/react';
import { useDoc } from '../../store/MandaratContext';
import { NUM, ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import type { MandaratDoc } from '../../types';
import { CHOICES, choiceKey, choiceOpen, choiceText } from './syncView';

/** 두 장부를 나란히 놓는 쪽 폭 — 그보다 좁으면(폰) 위아래로 */
const SIDE_BY_SIDE = 520;
/** 장부 이름 칸 · 줄 위아래 · 고르기 줄 위아래 · 묶음 사이 */
const LEDGER_LABEL_W = 84;
const LEDGER_PAD_Y = 8;
const CHOICE_PAD_Y = 10;
const GAP = 20;

/**
 * 엔진이 물을 때만 시트를 띄운다. 답한 물음은 엔진이 다음으로 넘어갈 때까지 다시 띄우지 않는다.
 * Root가 붙인다 — 어느 화면에서든 묻는다(docs/v2/V5-E.md 넘겨줄 일).
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
    <Sheet M={M} ownClose pad onClose={() => onAnswer(chosen.current)}>
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
    <View>
      <SheetHead M={M} title={t.sync.choiceTitle} body={t.sync.choiceBody} />
      <Ledgers M={M} here={summarize(doc)} cloud={remote ? summarize(remote) : null} />

      <View style={{ marginTop: GAP }} accessibilityRole="radiogroup">
        {CHOICES.map((c, i) => {
          const { title, sub } = choiceText(c, t);
          const on = pick === c;
          // 고르기 줄(부품 상자 ChoiceRow의 모양) — 설명이 길어 여러 줄로 둔다
          return (
            <Pressable
              key={c}
              onPress={() => { if (!on) { tap(); setPick(c); } }}
              accessibilityRole="radio"
              accessibilityLabel={`${title}, ${sub}`}
              {...a11yLangProp()}
              accessibilityState={{ checked: on, selected: on }}
              aria-checked={on}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h, paddingVertical: CHOICE_PAD_Y,
                backgroundColor: pressed && !on ? M.tile : undefined,
              })}
            >
              {i > 0 && <RowRule M={M} inset={0} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <RowTitle M={M} text={title} lines={2} style={on ? KIT_TYPE.choiceOn : KIT_TYPE.choice} />
                <Text style={{ ...ROLE.rowMeta, color: M.ink2 }}>{sub}</Text>
              </View>
              {on && <ChoiceTick M={M} />}
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 14 }}>
        <RuledNotice M={M} title={t.sync.copyNote} />
      </View>

      <View style={{ marginTop: GAP }}>
        <Button
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
    <View style={{ flexDirection: side ? 'row' : 'column', gap: side ? GAP : 14, marginTop: 6 }}>
      <Ledger M={M} head={t.sync.here} rows={rows.map((r) => ({ label: r.label, value: r.now, say: r.nowSay, text: r.text }))} />
      {cloud && (
        <Ledger M={M} head={t.sync.cloud} rows={rows.map((r) => ({ label: r.label, value: r.backup, say: r.backupSay, text: r.text }))} />
      )}
    </View>
  );
}

/** 장부 하나 — 인쇄된 머리(section) · 줄 사이 머리카락 선 · 이름(label print) · 값(ledger 먹, 없으면 ink2) */
function Ledger({ M, head, rows }: {
  M: M;
  head: string;
  rows: { label: string; value: string; say?: string; text?: boolean }[];
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text accessibilityRole="header" style={{ ...ROLE.section, color: M.printStrong, paddingBottom: 4 }}>{head}</Text>
      {rows.map((r, i) => (
        <View
          key={r.label}
          accessible
          accessibilityLabel={`${head}, ${r.label}, ${r.say ?? r.value}`}
          {...a11yLangProp()}
          style={{
            flexDirection: 'row', alignItems: 'flex-start', paddingVertical: LEDGER_PAD_Y,
            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderColor: M.printRule,
          }}
        >
          <Text style={{ ...ROLE.label, width: LEDGER_LABEL_W, color: M.print }}>{r.label}</Text>
          <Text
            style={[{ ...ROLE.ledger, flex: 1, color: r.value === LEDGER_NONE ? M.ink2 : M.ink }, r.text ? null : NUM]}
            numberOfLines={r.text ? 2 : 1}
          >
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
