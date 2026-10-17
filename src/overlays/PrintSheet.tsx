// 인쇄 시트 — 종이 크기 · 구성 · 빈 표를 고르고 인쇄하거나 PDF로 내보낸다(ui.print).
// HTML은 printSheet.ts, 찍기는 print(.web/.native).ts, 글꼴은 printFonts(.web/.native).ts가 맡는다.
// A4 · 레터의 표 한 장은 늘 무료 — 나머지 종이·표지 + 영역별 8쪽·지난 표는 프로(printLock).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { getLocales } from 'expo-localization';
import { Text } from '../components/AppText';
import { Check } from '../components/Check';
import { LineRow, PrimaryButton, Sheet, useSheetDismiss } from '../components/common';
import { SheetHead } from '../components/TemplateSheet';
import { SubHead } from '../screens/settings/rows';
import { lang } from '../i18n';
import { useMsg } from '../i18n/react';
import { archiveAccess, archiveAsDoc } from '../lib/archive';
import { PRINT_PAPERS, type PrintLayout, type PrintOptions, type PrintPaper, type PrintTarget, type ProFeature } from '../lib/contracts';
import { tap } from '../lib/haptics';
import { printer } from '../lib/print';
import { printFonts } from '../lib/printFonts';
import {
  defaultPaper, isProPaper, peekPrintPrefs, printPages, readPrintPrefs, resolvePrintOptions, writePrintPrefs, type StoredPrint,
} from '../lib/printPrefs';
import { printFileName, printHtml } from '../lib/printSheet';
import { isLocked } from '../lib/pro';
import { TID } from '../lib/testIds';
import { announce } from '../lib/useReducedMotion';
import { useUIActions, useUIState } from '../navigation/ui';
import { useDoc } from '../store/MandaratContext';
import { usePro } from '../store/ProContext';
import type { MandaratDoc } from '../types';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { Snackbar } from './Snackbar';

/** 따로 'PDF로 내보내기'가 있는 곳 — iOS만(웹·안드로이드는 인쇄 창이 PDF 저장을 맡는다) */
const CAN_EXPORT = Platform.OS === 'ios';

/** 종이 크기(mm) — 줄의 설명 */
const PAPER_MM: Readonly<Record<PrintPaper, [number, number]>> = {
  A4: [210, 297], Letter: [216, 279], A3: [297, 420], A5: [148, 210], B5: [182, 257],
};

const LAYOUTS: readonly PrintLayout[] = ['chart', 'areas'];

/** 기기의 첫 지역 — 읽지 못하면 null(A4) */
function deviceRegion(): string | null {
  try {
    return getLocales()[0]?.regionCode ?? null;
  } catch {
    return null;
  }
}

export function PrintSheet() {
  const { print } = useUIState();
  if (!print) return null;
  return <PrintGate target={print} />;
}

/** 지난 표를 찍을 수 없으면(프로 없음) 열지 않고 프로 시트로 — 프로 상태를 읽기 전에는 아무것도 그리지 않는다 */
function PrintGate({ target }: { target: PrintTarget }) {
  const { owned, phase } = usePro();
  const { closePrint, openPro } = useUIActions();
  const { doc } = useDoc();
  const archive = target.archiveId ? doc.archives?.find((a) => a.id === target.archiveId) ?? null : null;
  const denied = !!target.archiveId && phase !== 'boot' && !archiveAccess(owned).print;
  const missing = !!target.archiveId && !archive;

  useEffect(() => {
    if (denied) {
      closePrint();
      openPro('archive');
    } else if (missing) {
      closePrint();
    }
  }, [denied, missing, closePrint, openPro]);

  if (target.archiveId && (phase === 'boot' || denied || !archive)) return null;
  return <PrintPanel source={archive ? archiveAsDoc(archive, doc.settings) : doc} />;
}

function PrintPanel({ source }: { source: MandaratDoc }) {
  const M = usePalette();
  const { closePrint } = useUIActions();
  return (
    <Sheet M={M} onClose={closePrint} ownClose maxHeightPct={0.94} overlay={<Snackbar placement="top" />}>
      <PrintBody M={M} source={source} />
    </Sheet>
  );
}

function PrintBody({ M, source }: { M: M; source: MandaratDoc }) {
  const m = useMsg();
  const dismiss = useSheetDismiss();
  const { openPro, showToast } = useUIActions();
  const { owned } = usePro();
  const freePaper = useMemo(() => defaultPaper(deviceRegion()), []);
  const [stored, setStored] = useState<StoredPrint>(() => peekPrintPrefs() ?? {});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let live = true;
    void readPrintPrefs().then((p) => { if (live) setStored(p); });
    return () => { live = false; };
  }, []);

  const opts = resolvePrintOptions(stored, freePaper, owned);

  const save = (next: StoredPrint) => {
    setStored(next);
    void writePrintPrefs(next);
  };

  /** 잠긴 선택 — 이 시트를 내리고 프로 시트를 연다(한 번에 시트 하나) */
  const toPro = (f: ProFeature) => {
    dismiss(true);
    openPro(f);
  };

  const pickPaper = (p: PrintPaper) => {
    if (isProPaper(p) && isLocked('printSize', owned)) return toPro('printSize');
    tap();
    save({ ...stored, paper: p });
  };
  const pickLayout = (l: PrintLayout) => {
    if (l === 'areas' && isLocked('printSize', owned)) return toPro('printSize');
    tap();
    save({ ...stored, layout: l });
  };
  const toggleBlank = () => {
    tap();
    save({ ...stored, blank: !opts.blank });
  };

  const paperName = (p: PrintPaper) => m.print[`paper${p}`];
  const layoutName = (l: PrintLayout) => (l === 'areas' ? m.print.layoutAreas : m.print.layoutChart);

  const run = async (kind: 'print' | 'pdf') => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    tap();
    // 버튼이 흐려진 것만으로는 화면 읽기가 아무 말이 없다 — 무엇을 기다리는지 알린다
    announce(m.print.busy);
    let result = 'failed';
    try {
      const now = new Date();
      const chosen: PrintOptions = { ...opts };
      const fontCss = await printFonts.fontCss();
      const { html, size } = printHtml(source, { ...chosen, now, lang: lang(), fontCss, accent: M.accent });
      result = kind === 'pdf'
        ? await printer.exportPdf(html, size, printFileName(now))
        : await printer.printNow(html, size);
    } catch (e) {
      console.warn('[PrintSheet] print failed', e);
    }
    // 취소는 조용히 — 실패만 알린다(웹의 인쇄는 결과를 알 수 없어 성공 알림도 없다)
    if (result === 'failed') showToast(m.print.failed);
    busyRef.current = false;
    setBusy(false);
  };

  const summary = m.print.summary({ paper: paperName(opts.paper), n: printPages(opts.layout) });

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SheetHead M={M} title={m.print.sheetHead} />

      <SubHead M={M} label={m.print.paperHead} first />
      <View accessibilityRole="radiogroup">
        {PRINT_PAPERS.map((p, i) => {
          const locked = isProPaper(p) && isLocked('printSize', owned);
          const on = !locked && opts.paper === p;
          const [w, h] = PAPER_MM[p];
          const sub = m.print.paperMm({ w, h });
          const name = `${paperName(p)}, ${sub}`;
          return (
            <View key={p} testID={TID.printPaper(p)}>
              <LineRow
                M={M}
                title={paperName(p)}
                sub={sub}
                first={i === 0}
                last={i === PRINT_PAPERS.length - 1}
                accessibilityRole="radio"
                accessibilityLabel={locked ? m.print.lockedSay({ name }) : name}
                checked={on}
                right={locked ? <ProMark M={M} label={m.print.pro} /> : <Check on={on} color={M.ink} dark={M.dark} size={22} />}
                onPress={() => pickPaper(p)}
              />
            </View>
          );
        })}
      </View>

      <SubHead M={M} label={m.print.layoutHead} />
      <View accessibilityRole="radiogroup">
        {LAYOUTS.map((l, i) => {
          const locked = l === 'areas' && isLocked('printSize', owned);
          const on = !locked && opts.layout === l;
          const sub = m.print.summary({ paper: paperName(opts.paper), n: printPages(l) });
          const name = `${layoutName(l)}, ${sub}`;
          return (
            <View key={l} testID={TID.printLayout(l)}>
              <LineRow
                M={M}
                title={layoutName(l)}
                sub={sub}
                first={i === 0}
                last={i === LAYOUTS.length - 1}
                accessibilityRole="radio"
                accessibilityLabel={locked ? m.print.lockedSay({ name }) : name}
                checked={on}
                right={locked ? <ProMark M={M} label={m.print.pro} /> : <Check on={on} color={M.ink} dark={M.dark} size={22} />}
                onPress={() => pickLayout(l)}
              />
            </View>
          );
        })}
      </View>

      <View testID={TID.printBlank} style={{ marginTop: 20 }}>
        <LineRow
          M={M}
          title={m.print.blank}
          sub={m.print.blankSub}
          first
          last
          accessibilityRole="checkbox"
          accessibilityLabel={`${m.print.blank}, ${m.print.blankSub}`}
          checked={opts.blank}
          right={<Check on={opts.blank} color={M.ink} dark={M.dark} size={22} />}
          onPress={toggleBlank}
        />
      </View>

      {/* 고른 것 한 줄 — 종이 · 쪽 수 */}
      <Text
        accessibilityLiveRegion="polite"
        style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: M.sub, marginTop: 16, fontVariant: ['tabular-nums'] }}
      >
        {summary}
      </Text>

      <View style={{ marginTop: 12, gap: 10 }}>
        <View testID={TID.printGo}>
          <PrimaryButton
            M={M}
            label={busy ? m.print.busy : m.print.printGo}
            accessibilityLabel={busy ? m.print.busy : `${m.print.printGo}, ${summary}`}
            onPress={() => void run('print')}
            disabled={busy}
          />
        </View>
        {CAN_EXPORT ? (
          <View testID={TID.printPdf}>
            <PrimaryButton
              M={M}
              tone="quiet"
              label={m.print.exportPdf}
              accessibilityLabel={`${m.print.exportPdf}, ${summary}`}
              onPress={() => void run('pdf')}
              disabled={busy}
            />
          </View>
        ) : (
          <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, textAlign: 'center', paddingBottom: 4 }}>{m.print.webNote}</Text>
        )}
      </View>
    </View>
  );
}

/** 잠긴 선택의 오른쪽 — 꾸밈 없는 보조색 글씨 하나(배지·자물쇠 없음) */
function ProMark({ M, label }: { M: M; label: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>{label}</Text>;
}
