// 인쇄 시트 — 종이 크기 · 구성 · 빈 표를 고르고 인쇄하거나 PDF로 내보낸다(ui.print).
// HTML은 printSheet.ts, 찍기는 print(.web/.native).ts, 글꼴은 printFonts(.web/.native).ts가 맡는다.
// A4 · 레터의 표 한 장은 늘 무료 — 나머지 종이·표지 + 영역별 8쪽·지난 표는 프로(printLock).
// 디자인 A의 시트(sheet.png 해부): 머리 줄(이름 · 고른 것 한 줄) · 고르기 줄(ChoiceRow) · 켜고 끄는 줄(ToggleRow) · 바닥의 단추.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { getLocales } from 'expo-localization';
import { Text } from '../components/AppText';
import { Button, Sheet, SheetHeader, useSheetDismiss } from '../components/common';
import { ChoiceRow, Section, ToggleRow } from '../components/kit';
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
import { GEO } from '../theme/tokens';
import { ROLE } from '../theme/type';
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

/** 시트 한 장 — 고른 것(저장값)과 찍는 중인지를 들고, 머리 줄 · 고르기 · 바닥 단추에 나눠 준다 */
function PrintPanel({ source }: { source: MandaratDoc }) {
  const M = usePalette();
  const m = useMsg();
  const { closePrint, showToast } = useUIActions();
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
      const { html, size } = printHtml(source, { ...chosen, now, lang: lang(), fontCss });
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

  // 고른 것 한 줄 — 종이 · 쪽 수(머리 줄의 둘째 줄, 단추의 화면 읽기 이름에도)
  const summary = m.print.summary({ paper: m.print[`paper${opts.paper}`], n: printPages(opts.layout) });

  return (
    <Sheet
      M={M}
      onClose={closePrint}
      ownClose
      pad
      maxHeightPct={0.94}
      header={<SheetHeader M={M} title={m.print.sheetHead} sub={summary} />}
      overlay={<Snackbar placement="top" />}
      footer={<PrintActions M={M} busy={busy} summary={summary} onRun={(k) => void run(k)} />}
    >
      <PrintChoices M={M} opts={opts} stored={stored} owned={owned} save={save} />
    </Sheet>
  );
}

function PrintChoices({ M, opts, stored, owned, save }: {
  M: M;
  opts: PrintOptions;
  stored: StoredPrint;
  owned: boolean;
  save: (next: StoredPrint) => void;
}) {
  const m = useMsg();
  const dismiss = useSheetDismiss();
  const { openPro } = useUIActions();

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
  /** 잠긴 줄의 설명 끝에 '프로' — 배지 · 자물쇠 없이 인쇄된 낱말 하나 */
  const withPro = (sub: string, locked: boolean) => (locked ? `${sub}${m.core.dot}${m.print.pro}` : sub);

  return (
    <View style={{ paddingBottom: 8 }}>
      <Section M={M} label={m.print.paperHead} style={{ marginTop: 8 }} />
      <View accessibilityRole="radiogroup">
        {PRINT_PAPERS.map((p, i) => {
          const locked = isProPaper(p) && isLocked('printSize', owned);
          const on = !locked && opts.paper === p;
          const [w, h] = PAPER_MM[p];
          const sub = m.print.paperMm({ w, h });
          const name = `${paperName(p)}, ${sub}`;
          return (
            <ChoiceRow
              key={p}
              M={M}
              testID={TID.printPaper(p)}
              title={paperName(p)}
              meta={withPro(sub, locked)}
              on={on}
              divider={i > 0}
              accessibilityLabel={locked ? m.print.lockedSay({ name }) : name}
              accessibilityHint={locked ? m.print.lockedHint : undefined}
              onPress={() => pickPaper(p)}
            />
          );
        })}
      </View>

      <Section M={M} label={m.print.layoutHead} style={{ marginTop: GEO.sectionGap }} />
      <View accessibilityRole="radiogroup">
        {LAYOUTS.map((l, i) => {
          const locked = l === 'areas' && isLocked('printSize', owned);
          const on = !locked && opts.layout === l;
          const sub = m.print.summary({ paper: paperName(opts.paper), n: printPages(l) });
          const name = `${layoutName(l)}, ${sub}`;
          return (
            <ChoiceRow
              key={l}
              M={M}
              testID={TID.printLayout(l)}
              title={layoutName(l)}
              meta={withPro(sub, locked)}
              on={on}
              divider={i > 0}
              accessibilityLabel={locked ? m.print.lockedSay({ name }) : name}
              accessibilityHint={locked ? m.print.lockedHint : undefined}
              onPress={() => pickLayout(l)}
            />
          );
        })}
      </View>

      <View style={{ marginTop: GEO.sectionGap }}>
        <ToggleRow
          M={M}
          testID={TID.printBlank}
          title={m.print.blank}
          meta={m.print.blankSub}
          on={opts.blank}
          onToggle={toggleBlank}
        />
      </View>
    </View>
  );
}

/** 바닥 — 인쇄하기(주 단추) · PDF로 내보내기(iOS, 둘째 단추) 또는 웹 · 안드로이드의 안내 한 줄 */
function PrintActions({ M, busy, summary, onRun }: { M: M; busy: boolean; summary: string; onRun: (kind: 'print' | 'pdf') => void }) {
  const m = useMsg();
  return (
    <View style={{ gap: 10 }}>
      <Button
        M={M}
        testID={TID.printGo}
        label={busy ? m.print.busy : m.print.printGo}
        accessibilityLabel={busy ? m.print.busy : `${m.print.printGo}, ${summary}`}
        onPress={() => onRun('print')}
        disabled={busy}
      />
      {CAN_EXPORT ? (
        <Button
          M={M}
          testID={TID.printPdf}
          variant="secondary"
          label={m.print.exportPdf}
          accessibilityLabel={`${m.print.exportPdf}, ${summary}`}
          onPress={() => onRun('pdf')}
          disabled={busy}
        />
      ) : (
        <Text style={[ROLE.noteSheet, { color: M.print, textAlign: 'center', paddingBottom: 4 }]}>{m.print.webNote}</Text>
      )}
    </View>
  );
}
