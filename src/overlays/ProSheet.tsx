// 프로 시트 — 잠긴 기능 또는 설정 › 프로에서 열린다(ui.pro). 스스로 열리는 일은 없다(docs/v2/plan.md §2.9).
// 종이 수첩의 한 쪽처럼: 제목 · 설명 한 단락 · 번호 매긴 차례 네 줄 · 값 한 줄 · 버튼 하나 · 밑줄 글자 링크.
// 값은 StoreKit의 displayPrice만 쓴다(값 · 돈 단위를 적지 않는다). 사고팔기 상태는 ProContext(V1-E)가 맡는다.
// 웹 · 안드로이드에는 결제가 없다 — 차례와 'iPhone·iPad 앱에서 살 수 있어요' 한 줄만, 버튼 없이.
import React, { useEffect, useRef } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Text } from '../components/AppText';
import { CloseBtn, PrimaryButton, RuledNotice, Sheet, useSheetDismiss } from '../components/common';
import { useMsg } from '../i18n/react';
import type { Messages } from '../i18n';
import { PRIVACY_URL } from '../lib/appInfo';
import { PRO_FEATURES, type ProFeature } from '../lib/contracts';
import { success, tap } from '../lib/haptics';
import { proNoteText } from '../lib/pro';
import { TID } from '../lib/testIds';
import { announce } from '../lib/useReducedMotion';
import { useUIActions, useUIState } from '../navigation/ui';
import { usePro, useProActions } from '../store/ProContext';
import { NUM, TYPE } from '../theme/type';
import { usePalette, type M } from '../theme/usePalette';
import { TextLink } from '../screens/settings/rows';
import { Snackbar } from './Snackbar';

/** 이 기기에서 결제 창을 열 수 있는 곳 — iOS · iPadOS만(StoreKit) */
const STORE = Platform.OS === 'ios';

/** 차례 한 줄의 이름과 설명 */
export function featureText(m: Messages, f: ProFeature): { name: string; sub: string } {
  if (f === 'paper') return { name: m.pro.featurePaper, sub: m.pro.featurePaperSub };
  if (f === 'widgetStyle') return { name: m.pro.featureWidgetStyle, sub: m.pro.featureWidgetStyleSub };
  if (f === 'printSize') return { name: m.pro.featurePrintSize, sub: m.pro.featurePrintSizeSub };
  return { name: m.pro.featureArchive, sub: m.pro.featureArchiveSub };
}

/** 주 버튼의 글 — 결제 창을 여는 중 · 값을 모름 · '{값}에 프로 열기' */
export function buyLabel(m: Messages, phase: string, price: string | null): string {
  if (phase === 'buying') return m.pro.busyBuying;
  if (price === null) return m.pro.busyPrice;
  return m.pro.buy({ price });
}

export function ProSheet() {
  const { pro } = useUIState();
  if (!pro) return null;
  return <ProPanel from={pro} />;
}

function ProPanel({ from }: { from: ProFeature | 'menu' }) {
  const M = usePalette();
  const { closePro } = useUIActions();
  const { clearNote } = useProActions();
  // 닫히면 ui.pro를 비운다(인쇄 시트 같은 다음 시트가 기다리지 않게) — 남은 안내 한 줄도 함께 지운다
  const onClose = () => {
    clearNote();
    closePro();
  };
  return (
    <Sheet M={M} onClose={onClose} ownClose maxHeightPct={0.94} overlay={<Snackbar placement="top" />}>
      <ProBody M={M} from={from} />
    </Sheet>
  );
}

function ProBody({ M, from }: { M: M; from: ProFeature | 'menu' }) {
  const m = useMsg();
  const dismiss = useSheetDismiss();
  const { showToast } = useUIActions();
  const { owned, phase, price, canBuy, note } = usePro();
  const { buy, restore, clearNote } = useProActions();

  // 안내가 바뀔 때만 움직인다 — 그 밖의 것은 늘 최신 값을 본다
  const live = useRef({ m, dismiss, showToast, clearNote });
  live.current = { m, dismiss, showToast, clearNote };

  // 시트를 열기 전에 남은 안내(지난번 결과)는 지운다 — 이 시트에서 일어난 일만 말한다
  const opened = useRef(false);
  useEffect(() => {
    const { m, dismiss, showToast, clearNote } = live.current;
    if (!opened.current) {
      opened.current = true;
      if (note) clearNote();
      return;
    }
    if (!note) return;
    if (note === 'bought') {
      // 샀다 — 시트를 내리고 고맙다는 한 줄(축하 장식 없이)
      success();
      clearNote();
      dismiss(true);
      showToast(m.pro.noteBought);
      return;
    }
    announce(proNoteText(note));
  }, [note]);

  const onBuy = () => {
    tap();
    void buy();
  };
  const onRestore = () => {
    tap();
    announce(m.pro.busyRestoring);
    void restore();
  };
  const openPrivacy = () => {
    Linking.openURL(PRIVACY_URL).catch(() => showToast(m.pro.linkFailed));
  };

  const busy = phase === 'buying' || phase === 'restoring';
  const canPress = STORE && canBuy && phase === 'idle' && price !== null;
  const label = buyLabel(m, phase, price);
  // 결제가 막힌 기기(스크린 타임) — 값은 왔는데 살 수 없을 때 한 줄 알린다
  const blocked = STORE && !owned && !canBuy && price !== null && phase !== 'boot';
  const shownNote = note && note !== 'bought' ? proNoteText(note) : blocked ? proNoteText('notAllowed') : null;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }}>{m.pro.sheetHead}</Text>
        <View testID={TID.proClose}>
          <CloseBtn M={M} onPress={() => dismiss()} />
        </View>
      </View>

      {owned ? (
        <View accessible style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, lineHeight: 21, fontWeight: '700', color: M.ink }}>{m.pro.ownedHead}</Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 4 }}>{m.pro.ownedBody}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginBottom: 16 }}>{m.pro.sheetBody}</Text>
      )}

      {/* 차례 — 번호 매긴 네 줄. 이 시트를 연 기능의 줄은 먹색 굵은 줄로 긋는다 */}
      <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub, paddingBottom: 6 }}>{m.pro.listHead}</Text>
      <View style={{ borderTopWidth: 1, borderColor: M.line }}>
        {PRO_FEATURES.map((f, i) => {
          const { name, sub } = featureText(m, f);
          const here = f === from;
          return (
            <View
              key={f}
              accessible
              accessibilityLabel={here ? m.pro.featureSayHere({ name, sub }) : m.pro.featureSay({ name, sub })}
              style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 52, paddingVertical: 11, paddingHorizontal: 2,
                borderBottomWidth: here ? 2 : 1, borderColor: here ? M.ink : M.line,
              }}
            >
              <Text style={{ width: 18, fontSize: 15, lineHeight: 21, fontWeight: '700', color: M.ink, ...NUM }}>{i + 1}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, lineHeight: 21, fontWeight: here ? '800' : '600', color: M.ink }}>{name}</Text>
                <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }}>{sub}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {!owned && STORE && (
        <>
          {/* 값 한 줄 — StoreKit이 준 그대로(그 나라 돈으로). 모르면 불러오는 중이라고만 */}
          <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: '600', color: M.ink, marginTop: 18, ...NUM }}>
            {price !== null ? m.pro.priceRow({ price }) : m.pro.busyPrice}
          </Text>
          <View testID={TID.proBuy} style={{ marginTop: 12 }}>
            <PrimaryButton M={M} label={label} onPress={onBuy} disabled={!canPress} />
          </View>
          <View testID={TID.proRestore} style={{ marginTop: 14, alignSelf: 'flex-start' }}>
            <TextLink
              M={M}
              label={phase === 'restoring' ? m.pro.busyRestoring : m.pro.restore}
              hint={m.pro.restoreHint}
              onPress={() => { if (!busy) onRestore(); }}
            />
          </View>
        </>
      )}

      {!STORE && !owned && (
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: M.sub, marginTop: 18 }}>{m.pro.platformNote}</Text>
      )}

      {/* 결과 한 줄 — 괘선 사이에. 화면 읽기는 바뀔 때 읽는다 */}
      <View accessibilityLiveRegion="polite" style={{ marginTop: shownNote ? 18 : 0 }}>
        {shownNote ? <RuledNotice M={M} title={shownNote} /> : null}
      </View>

      {!!PRIVACY_URL && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, marginTop: 18 }}>
          <TextLink M={M} label={m.pro.privacy} onPress={openPrivacy} />
        </View>
      )}
    </View>
  );
}
