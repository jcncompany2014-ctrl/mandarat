// 프로 시트 — 잠긴 기능 또는 설정 › 프로에서 열린다(ui.pro). 스스로 열리는 일은 없다(docs/v2/plan.md §2.9).
// 판매를 끈 동안(src/lib/pro.ts STORE_OPEN = false, 1.0)에는 설정에 프로 구역이 없어 열 길이 없다.
// 부품 상자의 시트(안쪽 24, 떠 있는 판): 머리(SheetHead) · 설명 한 줄 · 번호 매긴 차례 네 줄 · 값 한 줄 · 주 단추 하나 · 조용한 구입 복원 · 글자 링크.
// 값은 StoreKit의 displayPrice만 쓴다(값 · 돈 단위를 적지 않는다). 사고팔기 상태는 ProContext(V1-E)가 맡는다.
// 웹 · 안드로이드에는 결제가 없다 — 차례와 'iPhone·iPad 앱에서 살 수 있어요' 한 줄만, 버튼 없이.
import React, { useEffect, useRef } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Text, a11yLangProp } from '../components/AppText';
import { PrimaryButton, QuietAction, RuledNotice, Sheet, useSheetDismiss } from '../components/common';
import { SheetHead } from '../components/TemplateSheet';
import { ROW, RowRule, RowTitle, Section, TextLink } from '../components/kit';
import { useMsg } from '../i18n/react';
import { lang, type Messages } from '../i18n';
import { PRIVACY_URL, privacyLink } from '../lib/appInfo';
import { PRO_FEATURES, type ProFeature } from '../lib/contracts';
import { success, tap } from '../lib/haptics';
import { proNoteText } from '../lib/pro';
import { TID } from '../lib/testIds';
import { announce } from '../lib/useReducedMotion';
import { useUIActions, useUIState } from '../navigation/ui';
import { usePro, useProActions } from '../store/ProContext';
import { PRETENDARD } from '../theme/fonts';
import { GEO } from '../theme/tokens';
import { NUM, ROLE } from '../theme/type';
import { usePalette, type M } from '../theme/usePalette';
import { Snackbar } from './Snackbar';

/** 이 기기에서 결제 창을 열 수 있는 곳 — iOS · iPadOS만(StoreKit) */
const STORE = Platform.OS === 'ios';
/** 이 시트를 연 기능의 줄 — 옅은 면(tile)을 줄 밖으로 12씩 넓혀 깐다(글은 다른 줄과 같은 x) */
const HERE_BLEED = 12;

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
    <Sheet M={M} onClose={onClose} ownClose pad maxHeightPct={0.94} overlay={<Snackbar placement="top" />}>
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
    Linking.openURL(privacyLink(lang())).catch(() => showToast(m.pro.linkFailed));
  };

  const busy = phase === 'buying' || phase === 'restoring';
  const canPress = STORE && canBuy && phase === 'idle' && price !== null;
  const label = buyLabel(m, phase, price);
  // 결제가 막힌 기기(스크린 타임) — 값은 왔는데 살 수 없을 때 한 줄 알린다
  const blocked = STORE && !owned && !canBuy && price !== null && phase !== 'boot';
  const shownNote = note && note !== 'bought' ? proNoteText(note) : blocked ? proNoteText('notAllowed') : null;
  const hereAt = PRO_FEATURES.findIndex((f) => f === from);

  return (
    <View style={{ paddingBottom: 8 }}>
      <SheetHead M={M} title={m.pro.sheetHead} body={owned ? undefined : m.pro.sheetBody} closeTestID={TID.proClose} />

      {owned && (
        <View accessible style={{ marginBottom: 20 }}>
          <Text style={{ ...ROLE.rowTitle, fontFamily: PRETENDARD[600], color: M.ink }}>{m.pro.ownedHead}</Text>
          <Text style={{ ...ROLE.noteSheet, color: M.print, marginTop: 2 }}>{m.pro.ownedBody}</Text>
        </View>
      )}

      {/* 차례 — 번호 매긴 네 줄(상자 칸에 번호). 이 시트를 연 기능의 줄은 옅은 면 위에, 제목 600 */}
      <Section M={M} label={m.pro.listHead} style={{ marginTop: 4 }} />
      <View>
        {PRO_FEATURES.map((f, i) => {
          const { name, sub } = featureText(m, f);
          const here = f === from;
          // 줄 사이 선은 옅은 면의 위 · 아래에는 긋지 않는다
          const divider = i > 0 && !here && i - 1 !== hereAt;
          return (
            <View
              key={f}
              accessible
              accessibilityLabel={here ? m.pro.featureSayHere({ name, sub }) : m.pro.featureSay({ name, sub })}
              {...a11yLangProp()}
              style={[
                { flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h, paddingVertical: 8 },
                here ? { backgroundColor: M.tile, borderRadius: GEO.rField, marginHorizontal: -HERE_BLEED, paddingHorizontal: HERE_BLEED } : null,
              ]}
            >
              {divider && <RowRule M={M} />}
              <Text style={{ ...ROLE.rowTitle, ...NUM, width: ROW.box, textAlign: 'center', color: here ? M.ink : M.ink2 }}>{i + 1}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RowTitle M={M} text={name} lines={2} style={here ? ROLE.choiceOn : undefined} />
                <Text style={{ ...ROLE.rowMeta, color: M.ink2 }}>{sub}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {!owned && STORE && (
        <>
          {/* 값 한 줄 — StoreKit이 준 그대로(그 나라 돈으로). 모르면 불러오는 중이라고만 */}
          <Text style={{ ...ROLE.label, ...NUM, color: M.print, marginTop: 24 }}>
            {price !== null ? m.pro.priceRow({ price }) : m.pro.busyPrice}
          </Text>
          <PrimaryButton M={M} label={label} onPress={onBuy} disabled={!canPress} testID={TID.proBuy} style={{ marginTop: 10 }} />
          <QuietAction
            M={M}
            testID={TID.proRestore}
            label={phase === 'restoring' ? m.pro.busyRestoring : m.pro.restore}
            accessibilityHint={m.pro.restoreHint}
            onPress={() => { if (!busy) onRestore(); }}
            style={{ alignSelf: 'center', marginTop: 6, paddingHorizontal: 16 }}
          />
        </>
      )}

      {!STORE && !owned && (
        <Text style={{ ...ROLE.noteSheet, color: M.print, marginTop: 24 }}>{m.pro.platformNote}</Text>
      )}

      {/* 결과 한 줄 — 옅은 면의 알림 한 장. 화면 읽기는 바뀔 때 읽는다 */}
      <View accessibilityLiveRegion="polite" style={{ marginTop: shownNote ? 18 : 0 }}>
        {shownNote ? <RuledNotice M={M} title={shownNote} /> : null}
      </View>

      {!!PRIVACY_URL && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, marginTop: 24 }}>
          <TextLink M={M} label={m.pro.privacy} onPress={openPrivacy} />
        </View>
      )}
    </View>
  );
}
