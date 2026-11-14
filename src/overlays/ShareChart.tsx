import React, { useRef, useState } from 'react';
import { PixelRatio, Platform, Share, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { Text, a11yLangProp } from '../components/AppText';
import { ChartPoster } from '../components/ChartPoster';
import { Button, Sheet, SheetHeader, useSheetDismiss } from '../components/common';
import { Segment, TextLink } from '../components/kit';
import { tap } from '../lib/haptics';
import { POSTER_H, POSTER_PX, POSTER_W, posterDone } from '../lib/poster';
import { GEO } from '../theme/tokens';
import { ROLE } from '../theme/type';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useDoc } from '../store/MandaratContext';
import { announce } from '../lib/useReducedMotion';
import { Snackbar } from './Snackbar';
import { useMsg } from '../i18n/react';
import { TID } from '../lib/testIds';

type Mode = 'progress' | 'blank';

/** 그림으로 찍어 공유 시트에 건넬 수 있는 곳 — iOS만(웹·안드로이드는 안내 글) */
const CAN_CAPTURE = Platform.OS === 'ios';

/** 미리보기 아래위로 시트가 쓰는 높이(머리 줄 · 고르기 · 단추 · 링크 · 여백) — 작은 화면에서도 단추까지 한 화면에 */
const SHEET_CHROME = 270;

/**
 * 만들 그림의 크기(pt). iOS의 view-shot은 이 크기를 화면 배율로 그리므로,
 * 픽셀로 늘 1080×1350이 되게 배율로 나눈다(3배 화면 360×450, 2배 화면 540×675).
 */
function captureSize(): { width: number; height: number } {
  const r = PixelRatio.get() || 1;
  return { width: POSTER_PX.width / r, height: POSTER_PX.height / r };
}

/** 만다라트를 피드에 올릴 한 장의 그림으로 — 진행 표시 · 빈 표 중 골라 이미지로 저장·공유한다(디자인 A share.png). */
export function ShareChart() {
  const { share } = useUIState();
  if (!share) return null;
  return <ShareSheet />;
}

function ShareSheet() {
  const M = usePalette();
  const m = useMsg();
  const { closeShare } = useUIActions();
  const [mode, setMode] = useState<Mode>('progress');
  const posterRef = useRef<View>(null);
  return (
    <Sheet
      M={M}
      onClose={closeShare}
      ownClose
      pad
      maxHeightPct={0.94}
      header={<SheetHeader M={M} title={m.chart.shareTitle} />}
      overlay={<Snackbar placement="top" />}
      footer={
        <>
          {CAN_CAPTURE ? (
            <SaveButton M={M} posterRef={posterRef} />
          ) : (
            <Text style={[ROLE.noteSheet, { color: M.print, paddingVertical: 8 }]}>{m.chart.shareWebOnly}</Text>
          )}
          <PrintLink M={M} />
        </>
      }
    >
      <ShareBody M={M} mode={mode} setMode={setMode} posterRef={posterRef} />
    </Sheet>
  );
}

function ShareBody({ M, mode, setMode, posterRef }: {
  M: M;
  mode: Mode;
  setMode: (m: Mode) => void;
  posterRef: React.RefObject<View | null>;
}) {
  const { doc } = useDoc();
  const m = useMsg();
  // 시트 안에서는 시트 판의 폭(lib/screen PageSize)
  const { width: sheetW, height: winH } = useWindowDimensions();
  const now = new Date();
  const blank = mode === 'blank';

  // 미리보기 — 시트 본문 폭에 맞추되, 작은 화면에서도 아래 단추까지 한 화면에 들도록 높이를 넘지 않게.
  // 줄인 그림도 치수로 그린다(scale) — transform으로 줄이지 않아 글자가 또렷하다
  const avail = sheetW - GEO.sheet.pad * 2;
  const byHeight = Math.max(200, (winH * 0.94 - SHEET_CHROME) * (POSTER_W / POSTER_H));
  const pw = Math.floor(Math.min(avail, byHeight));
  const scale = pw / POSTER_W;
  const ph = POSTER_H * scale;
  const done = posterDone(doc);

  return (
    <View style={{ paddingBottom: 4 }}>
      {/* 미리보기 — 실제 한 장을 그 배율로(흰 종이의 가장자리는 머리카락 선 하나) */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={blank ? m.chart.previewBlankSay : m.chart.previewSay({ done })}
        {...a11yLangProp()}
        style={{ alignSelf: 'center', width: pw, height: ph, marginTop: 4, borderRadius: GEO.rBlock, overflow: 'hidden' }}
      >
        <View pointerEvents="none">
          <ChartPoster doc={doc} blank={blank} now={now} scale={scale} />
        </View>
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: GEO.rBlock, borderWidth: StyleSheet.hairlineWidth, borderColor: M.printMid }]}
        />
      </View>

      <Segment
        M={M}
        value={mode}
        onChange={setMode}
        style={{ marginTop: 16 }}
        options={[
          { value: 'progress', label: m.chart.modeProgress },
          { value: 'blank', label: m.chart.modeBlank },
        ]}
      />

      {/* 찍을 원본 — 줄이지 않은 540×675 한 장을 화면 밖에 둔다(미리보기는 줄여 그려 그대로 찍으면 흐리다) */}
      {CAN_CAPTURE && (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', left: -10000, top: 0, width: POSTER_W, height: POSTER_H }}
        >
          <ChartPoster ref={posterRef} doc={doc} blank={blank} now={now} />
        </View>
      )}
    </View>
  );
}

function SaveButton({ M, posterRef }: { M: M; posterRef: React.RefObject<View | null> }) {
  const m = useMsg();
  const { showToast } = useUIActions();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const save = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    tap();
    // VoiceOver는 버튼이 흐려진 것만으로는 아무 말이 없다 — 무엇을 기다리는지 알린다
    announce(m.chart.making);
    let uri: string | null = null;
    try {
      uri = await captureRef(posterRef, { format: 'png', result: 'tmpfile', ...captureSize() });
    } catch (e) {
      console.warn('[ShareChart] capture failed', e);
    }
    if (!uri) {
      showToast(m.chart.makeFailed);
    } else {
      try {
        // 공유 시트의 '이미지 저장'이 사진 보관함에 더한다(사진 추가 권한 문구는 app.json의 한국어)
        await Share.share({ url: uri });
      } catch (e) {
        console.warn('[ShareChart] share failed', e);
        showToast(m.chart.shareFailed);
      }
      try {
        releaseCapture(uri);
      } catch {
        // 임시 파일은 앱이 닫히면 어차피 지워진다
      }
    }
    busyRef.current = false;
    setBusy(false);
  };

  return <Button M={M} label={m.chart.saveShare} onPress={save} disabled={busy} />;
}

/** 단추 아래 누르는 글 — 이 시트를 내리고 인쇄 시트를 연다(한 번에 시트 하나) */
function PrintLink({ M }: { M: M }) {
  const m = useMsg();
  const dismiss = useSheetDismiss();
  const { openPrint } = useUIActions();
  return (
    <View style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4 }}>
      <TextLink
        M={M}
        label={m.print.shareLinkSay}
        testID={TID.sharePrint}
        onPress={() => {
          tap();
          dismiss(true);
          openPrint();
        }}
      />
    </View>
  );
}
