import React, { useRef, useState } from 'react';
import { PixelRatio, Platform, Share, View, useWindowDimensions } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { Text } from '../components/AppText';
import { ChartPoster } from '../components/ChartPoster';
import { CloseBtn, PrimaryButton, Sheet, useSheetDismiss } from '../components/common';
import { SegmentedControl } from '../components/SegmentedControl';
import { tap } from '../lib/haptics';
import { POSTER_H, POSTER_PX, POSTER_W, posterDone } from '../lib/poster';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { Snackbar } from './Snackbar';

type Mode = 'progress' | 'blank';

/** 그림으로 찍어 공유 시트에 건넬 수 있는 곳 — iOS만(웹·안드로이드는 안내 글) */
const CAN_CAPTURE = Platform.OS === 'ios';

/**
 * 만들 그림의 크기(pt). iOS의 view-shot은 이 크기를 화면 배율로 그리므로,
 * 픽셀로 늘 1080×1350이 되게 배율로 나눈다(3배 화면 360×450, 2배 화면 540×675).
 */
function captureSize(): { width: number; height: number } {
  const r = PixelRatio.get() || 1;
  return { width: POSTER_PX.width / r, height: POSTER_PX.height / r };
}

/** 만다라트 표를 인쇄된 한 장의 그림으로 — 진행 표시 · 빈 표 중 골라 이미지로 저장·공유한다. */
export function ShareChart() {
  const { share } = useUI();
  if (!share) return null;
  return <ShareSheet />;
}

function ShareSheet() {
  const M = usePalette();
  const { closeShare } = useUI();
  const [mode, setMode] = useState<Mode>('progress');
  const posterRef = useRef<View>(null);
  return (
    <Sheet
      M={M}
      onClose={closeShare}
      ownClose
      maxHeightPct={0.94}
      overlay={<Snackbar placement="top" />}
      footer={
        CAN_CAPTURE ? (
          <SaveButton M={M} posterRef={posterRef} />
        ) : (
          <Text style={{ fontSize: 13, lineHeight: 19, color: M.sub, paddingVertical: 8 }}>앱에서 이미지로 공유할 수 있어요</Text>
        )
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
  const { doc } = useMandarat();
  const dismiss = useSheetDismiss();
  const { width: winW, height: winH } = useWindowDimensions();
  const now = new Date();
  const blank = mode === 'blank';

  // 미리보기 — 시트 폭에 맞추되, 작은 화면에서도 아래 버튼까지 한 화면에 들도록 높이를 넘지 않게
  const avail = Math.min(winW, 560) - 40;
  const byHeight = Math.max(200, (winH * 0.94 - 250) * (POSTER_W / POSTER_H));
  const pw = Math.floor(Math.min(avail, byHeight));
  const scale = pw / POSTER_W;
  const ph = Math.round(POSTER_H * scale);
  const done = posterDone(doc);

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '800', color: M.ink }}>
          표 이미지
        </Text>
        <CloseBtn M={M} onPress={dismiss} />
      </View>

      {/* 미리보기 — 실제 한 장을 줄여서 보인다(종이 가장자리는 가는 선 하나) */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={blank ? '표 이미지 미리보기, 빈 표' : `표 이미지 미리보기, 64칸 중 ${done}칸 달성`}
        style={{ alignSelf: 'center', width: pw + 2, height: ph + 2, marginTop: 14, borderWidth: 1, borderColor: M.line, overflow: 'hidden' }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', width: POSTER_W, height: POSTER_H,
            left: (pw - POSTER_W) / 2, top: (ph - POSTER_H) / 2,
            transform: [{ scale }],
          }}
        >
          <ChartPoster doc={doc} blank={blank} now={now} gold={M.accent} />
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <SegmentedControl
          M={M}
          variant="underline"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'progress', label: '진행 표시' },
            { value: 'blank', label: '빈 표' },
          ]}
        />
      </View>

      {/* 찍을 원본 — 줄이지 않은 360×450 한 장을 화면 밖에 둔다(미리보기는 줄여 그려 그대로 찍으면 흐리다) */}
      {CAN_CAPTURE && (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', left: -10000, top: 0, width: POSTER_W, height: POSTER_H }}
        >
          <ChartPoster ref={posterRef} doc={doc} blank={blank} now={now} gold={M.accent} />
        </View>
      )}
    </View>
  );
}

function SaveButton({ M, posterRef }: { M: M; posterRef: React.RefObject<View | null> }) {
  const { showToast } = useUI();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const save = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    tap();
    let uri: string | null = null;
    try {
      uri = await captureRef(posterRef, { format: 'png', result: 'tmpfile', ...captureSize() });
    } catch (e) {
      console.warn('[ShareChart] capture failed', e);
    }
    if (!uri) {
      showToast('이미지를 만들지 못했어요');
    } else {
      try {
        // 공유 시트의 '이미지 저장'이 사진 보관함에 더한다(사진 추가 권한 문구는 app.json의 한국어)
        await Share.share({ url: uri });
      } catch (e) {
        console.warn('[ShareChart] share failed', e);
        showToast('이미지를 만들지 못했어요');
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

  return <PrimaryButton M={M} label="이미지 저장·공유" onPress={save} disabled={busy} />;
}
