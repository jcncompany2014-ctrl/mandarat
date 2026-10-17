import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Header, LineRow, RowDivider, Sheet, pressedRow, useSheetDismiss } from '../components/common';
import { GridMark } from '../components/GridMark';
import { Icon } from '../components/Icon';
import { SheetHead, TemplateSheet } from '../components/TemplateSheet';
import { TEMPLATES, templateThemes, type Template } from '../data/templates';
import { APP_VERSION, LICENSES, PRIVACY_URL, SUPPORT_EMAIL, supportMailto } from '../lib/appInfo';
import { summarize } from '../lib/backup';
import { backupAgeLabel } from '../lib/backupNote';
import { select, tap } from '../lib/haptics';
import { exportBackup } from '../lib/shareFile';
import { useSyncEnabled } from '../lib/syncStatus';
import { fmtDateLong } from '../lib/text';
import { useMsg } from '../i18n/react';
import type { Messages } from '../i18n';
import { useUIActions } from '../navigation/ui';
import { BackupImport } from '../overlays/BackupImport';
import { useMandarat, type SnapshotInfo } from '../store/MandaratContext';
import { useResetUndo, useSnapshotUndo } from '../store/useSnapshotUndo';
import { MOODS } from '../theme/moods';
import { ACCENTS, GOLD, readableOn } from '../theme/palette';
import { TYPE } from '../theme/type';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import type { CellShape, Mood } from '../types';
import { ColophonRow, RadioRow, Section, SubHead, TextLink, ask, rowBase } from './settings/rows';
import { PaperRows } from './settings/PaperRows';
import { LanguageSection } from './settings/LanguageSection';
import { NotifySection } from './settings/NotifySection';
import { SyncSection } from './settings/SyncSection';
import { YearRows } from './settings/YearRows';
import { ProSection } from './settings/ProSection';
import { CrashRow } from './settings/CrashRow';
import { TID } from '../lib/testIds';

type Core = Messages['core'];
/** 종이 — 저장값과 그 이름(core.paper*) */
const MOOD_OPTS: readonly { mood: Mood; name: (c: Core) => string }[] = [
  { mood: '연꽃', name: (c) => c.paperIvory },
  { mood: '크림', name: (c) => c.paperCream },
  { mood: '화이트', name: (c) => c.paperGray },
  { mood: '파스텔', name: (c) => c.paperLavender },
  { mood: '다크', name: (c) => c.paperDark },
];
/** 칸 모서리 — 저장값과 그 이름(core.shape*) */
const SHAPE_OPTS: readonly { shape: CellShape; name: (c: Core) => string }[] = [
  { shape: '둥근', name: (c) => c.shapeRound },
  { shape: '각진', name: (c) => c.shapeSquare },
];
/** 기록이 저장되는 곳 — iCloud 기기 백업은 iPhone·iPad에만 있다(안드로이드·웹에서는 이 기기에만) */
const IOS = Platform.OS === 'ios';
const DEVICE = IOS && (Platform as { isPad?: boolean }).isPad === true ? 'iPad' : 'iPhone';

/** 백업 줄 아래 안내와 판권면의 저장 위치 — iCloud로 맞추기가 켜져 있으면 iCloud도 적는다(켜기는 iOS에만 있다) */
function storageText(st: Messages['settings'], synced: boolean): { note: string; place: string } {
  if (!IOS) return { note: st.storageNoteLocal, place: st.storagePlaceLocal };
  if (synced) return { note: st.storageNoteSync({ device: DEVICE }), place: st.storagePlaceSync({ device: DEVICE }) };
  return { note: st.storageNoteBackup({ device: DEVICE }), place: st.storagePlaceBackup({ device: DEVICE }) };
}

/** 종이 견본 — 그 종이의 바탕 · 점 여섯 개 · 먹색 '가' */
function PaperSwatch({ M, mood }: { M: M; mood: Mood }) {
  const p = MOODS[mood];
  const glyph = useMsg().settings.swatchGlyph;
  return (
    <View
      style={{
        width: 44, height: 30, borderRadius: 3, borderWidth: 1, borderColor: M.line,
        backgroundColor: p.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 6,
      }}
    >
      {/* 3×2 점 — 점 종이 한 귀퉁이 */}
      <View style={{ width: 14, flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, columnGap: 4 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: p.faint }} />
        ))}
      </View>
      <Text style={{ fontSize: 15, lineHeight: 18, fontWeight: '700', color: p.ink }} maxFontSizeMultiplier={1}>{glyph}</Text>
    </View>
  );
}

/**
 * 포인트 컬러 — 색 견본 다섯 개를 한 줄로(알약·옅은 바탕 없이 그 색 그대로의 네모).
 * 고른 견본은 먹색 네모 테두리로 두르고 안에 체크를 긋는다. 이름은 견본 아래에.
 */
function AccentRow({ M, value, onChange }: { M: M; value: string; onChange: (c: string) => void }) {
  const cur = value.toLowerCase();
  const st = useMsg().settings;
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, paddingVertical: 14 }}
    >
      {ACCENTS.map(({ color, name }) => {
        const on = cur === color.toLowerCase();
        return (
          <Pressable
            key={color}
            onPress={() => { if (!on) onChange(color); }}
            accessibilityRole="radio"
            accessibilityLabel={st.accentLabel({ name })}
            accessibilityState={{ checked: on, selected: on }}
            style={({ pressed }) => ({ minWidth: 52, alignItems: 'center', gap: 6, opacity: pressed && !on ? 0.6 : 1 })}
          >
            <View style={{ width: 44, height: 44, borderRadius: 4, borderWidth: 1.5, borderColor: on ? M.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                {on && <Icon name="check" size={18} color={readableOn(color)} sw={2.6} />}
              </View>
            </View>
            <Text style={{ fontSize: 13, lineHeight: 16, fontWeight: on ? '700' : '500', color: on ? M.ink : M.sub }} numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 저장본 목록 — 고르면 묻고, 되돌리기로 했으면 시트가 내려간 뒤 onRestore(day) */
function SnapshotList({ M, list, onPick }: { M: M; list: SnapshotInfo[] | null; onPick: (day: string, close: () => void) => void }) {
  const dismiss = useSheetDismiss();
  const st = useMsg().settings;
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SheetHead M={M} title={st.snapTitle} body={st.snapBody} />
      {list === null ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, paddingVertical: 14 }}>{st.snapLoading}</Text>
      ) : list.length === 0 ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}>
          {st.snapEmpty}
        </Text>
      ) : (
        list.map((s, i) => {
          const title = st.snapRow({ date: fmtDateLong(s.day) });
          const sub = st.snapRowSub({ n: s.summary.filled, days: s.summary.days });
          return (
            <LineRow
              key={s.day}
              M={M}
              first={i === 0}
              last={i === list.length - 1}
              title={title}
              sub={sub}
              right="chevron"
              accessibilityLabel={`${title}, ${sub}`}
              accessibilityHint={st.snapHint}
              onPress={() => onPick(s.day, () => dismiss(true))}
            />
          );
        })
      )}
    </View>
  );
}

function LicenseList({ M }: { M: M }) {
  const st = useMsg().settings;
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SheetHead M={M} title={st.licenses} body={st.licensesBody} />
      {LICENSES.map((l, i) => (
        <LineRow key={l.name} M={M} first={i === 0} last={i === LICENSES.length - 1} title={l.name} right={l.license} accessibilityLabel={`${l.name}, ${l.license}`} />
      ))}
    </View>
  );
}

export function Settings() {
  const M = usePalette();
  const { go, back, openEditor, showToast } = useUIActions();
  const { doc, getDoc, setSetting, loadSample, applyTemplate, resetAll, replaceDoc, listSnapshots, readSnapshot } = useMandarat();
  const offerUndo = useSnapshotUndo();
  const offerResetUndo = useResetUndo();
  const m = useMsg();
  const st = m.settings;
  // 켜짐만 본다 — 맞추기 단계가 바뀔 때마다 설정 화면 전체가 다시 그려지지 않게(R-8 #9)
  const storage = storageText(st, useSyncEnabled());

  const [importing, setImporting] = useState(false);
  const [picking, setPicking] = useState(false);
  // 시트가 닫히면 스크린리더 초점을 그 시트를 연 줄로 돌려준다
  const importRow = useRef<View>(null);
  const templateRow = useRef<View>(null);
  const [snapsOpen, setSnapsOpen] = useState(false);
  const [snaps, setSnaps] = useState<SnapshotInfo[] | null>(null);
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 시트에서 고른 일은 시트가 다 내려간 뒤에 한다(화면을 옮기거나 문서를 통째로 바꾸므로)
  const pendingTemplate = useRef<Template | null>(null);
  const pendingSnap = useRef<string | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const goal = doc.centerGoal.trim();

  // ── 템플릿 ──
  const runTemplate = useCallback((t: Template) => {
    const d = docRef.current;
    const snapshot = d; // 되돌리기용
    // 템플릿은 영역·실천만 바꾸고, 적어 둔 핵심 목표는 그대로 둔다(비어 있을 때만 템플릿 목표)
    applyTemplate(d.centerGoal.trim() ? '' : t.centerGoal, templateThemes(t));
    go('grid');
    offerUndo(st.templateDone({ name: t.name }), snapshot);
  }, [applyTemplate, go, offerUndo, st]);

  const pickTemplate = (t: Template, close: () => void) => {
    tap();
    const proceed = () => { pendingTemplate.current = t; close(); };
    const { filled } = summarize(doc);
    if (filled > 0 || goal) {
      ask(st.templateAskTitle, st.templateAskBody({ n: filled, name: t.name }), st.templateAskOk, proceed, true);
    } else proceed();
  };

  const onTemplateSheetClosed = () => {
    setPicking(false);
    const t = pendingTemplate.current;
    pendingTemplate.current = null;
    if (t) runTemplate(t);
  };

  // ── 저장본 ──
  useEffect(() => {
    if (!snapsOpen) return;
    let alive = true;
    setSnaps(null);
    listSnapshots().then((l) => { if (alive) setSnaps(l); });
    return () => { alive = false; };
  }, [snapsOpen, listSnapshots]);

  const pickSnapshot = (day: string, close: () => void) => {
    tap();
    ask(st.snapAskTitle, st.snapAskBody, st.snapAskOk, () => { pendingSnap.current = day; close(); }, true);
  };

  const restoreSnapshot = useCallback(async (day: string) => {
    const saved = await readSnapshot(day);
    if (!saved) {
      showToast(st.snapReadFail);
      return;
    }
    const snapshot = docRef.current; // 되돌리기용
    // 보기 설정(종이·포인트 컬러·마지막 백업 날)은 지금 것을 그대로 둔다 — 되돌리는 건 기록이다
    replaceDoc({ ...saved, settings: snapshot.settings });
    offerUndo(st.snapRestored({ date: fmtDateLong(day) }), snapshot);
  }, [readSnapshot, replaceDoc, offerUndo, showToast, st]);

  const onSnapSheetClosed = () => {
    setSnapsOpen(false);
    const day = pendingSnap.current;
    pendingSnap.current = null;
    if (day) void restoreSnapshot(day);
  };

  // ── 예시 · 초기화 ──
  const doSample = () => {
    const snapshot = doc;
    loadSample();
    offerUndo(st.sampleDone, snapshot);
  };
  const confirmSample = () => {
    tap();
    if (summarize(doc).filled === 0) { doSample(); return; }
    ask(st.sampleAskTitle, st.sampleAskBody, st.sampleAskOk, doSample);
  };

  const doReset = () => {
    // 되돌리기용 직전 상태 — 저장소의 지금 문서(초기화가 기억한 것과 같은 객체여야 맞추기 판까지 거둔다)
    const snapshot = getDoc();
    resetAll();
    offerResetUndo(st.resetDone, snapshot);
  };
  const confirmReset = () => {
    tap();
    ask(st.resetAskTitle, st.resetAskBody, st.resetAskOk, doReset, true);
  };

  // ── 백업 ──
  const onExport = async () => {
    if (exporting) return;
    tap();
    setExporting(true);
    const ok = await exportBackup(doc, new Date(), (day) => setSetting('lastBackupAt', day));
    setExporting(false);
    if (Platform.OS === 'web') showToast(ok ? st.exportSaved : st.exportWebFail);
    // 안드로이드는 공유 창을 닫아도 '공유됨'으로 알려 오므로 iOS에서만 완료를 알린다
    else if (Platform.OS === 'ios' && ok) showToast(st.exportDone);
  };

  const openLink = (url: string) => {
    tap();
    Linking.openURL(url).catch(() => showToast(st.openFail));
  };
  const mailto = supportMailto();

  return (
    <View onAccessibilityEscape={back}>
      {/* 제목은 뒤로 가기 아래 줄에 — 다른 화면처럼 20pt 왼쪽 끝에서 시작한다 */}
      <Header M={M} kr={st.screenTitle} onBack={back} focusTitle stacked backTestID={TID.setBack} />

      <View style={{ paddingHorizontal: 20 }}>
        <Section M={M} label={st.secGoal} />
        <Pressable
          onPress={() => { tap(); openEditor({ kind: 'center' }); }}
          testID={TID.setGoal}
          accessibilityRole="button"
          accessibilityLabel={goal ? st.goalLabel({ goal }) : st.goalEmpty}
          accessibilityHint={st.goalHint}
          style={({ pressed }) => [rowBase(M, true, true), pressed ? pressedRow(M) : null]}
        >
          <Text style={{ flex: 1, ...TYPE.rowTitle, color: goal ? M.ink : M.sub }} numberOfLines={2}>
            {goal || st.goalEmpty}
          </Text>
          <Icon name="chevR" size={16} color={M.faint} />
        </Pressable>

        <Section M={M} label={st.secView} />
        <SubHead M={M} label={st.subPaper} first />
        <View accessibilityRole="radiogroup">
          {MOOD_OPTS.map(({ mood, name }, i) => (
            <RadioRow
              key={mood}
              M={M}
              label={name(m.core)}
              a11yLabel={st.paperLabel({ name: name(m.core) })}
              on={doc.settings.mood === mood}
              first={i === 0}
              last={i === MOOD_OPTS.length - 1}
              onPress={() => { select(); setSetting('mood', mood); }}
              lead={<PaperSwatch M={M} mood={mood} />}
              testID={TID.setMood(mood)}
            />
          ))}
        </View>

        <SubHead M={M} label={st.subAccent} />
        <AccentRow M={M} value={doc.settings.accent} onChange={(c) => { select(); setSetting('accent', c); }} />

        <SubHead M={M} label={st.subShape} />
        <View accessibilityRole="radiogroup">
          {SHAPE_OPTS.map(({ shape, name }, i) => (
            <RadioRow
              key={shape}
              M={M}
              label={name(m.core)}
              a11yLabel={st.shapeLabel({ name: name(m.core) })}
              on={doc.settings.cellShape === shape}
              first={i === 0}
              last={i === SHAPE_OPTS.length - 1}
              onPress={() => { select(); setSetting('cellShape', shape); }}
              testID={TID.setShape(shape)}
            />
          ))}
        </View>
        <PaperRows M={M} />

        <LanguageSection M={M} />
        <NotifySection M={M} />
        <SyncSection M={M} />

        {/* 기록 — 안전한 백업 줄과 통째로 새로 쓰는 줄을 떼어 둔다. 저장 위치 안내는 백업 바로 아래에 */}
        <Section M={M} label={st.secRecords} />
        <SubHead M={M} label={st.subBackup} first />
        <LineRow
          M={M} first title={st.exportTitle}
          sub={backupAgeLabel(doc.settings.lastBackupAt, new Date())}
          right="chevron"
          accessibilityLabel={st.exportTitle}
          accessibilityHint={st.exportHint({ age: backupAgeLabel(doc.settings.lastBackupAt, new Date()) })}
          onPress={onExport}
          testID={TID.setExport}
        />
        <LineRow M={M} title={st.importTitle} sub={st.importSub} right="chevron" onPress={() => { tap(); setImporting(true); }} accessibilityLabel={st.importTitle} pressRef={importRow} testID={TID.setImport} />
        <LineRow M={M} last title={st.snapTitle} sub={st.snapSub} right="chevron" onPress={() => { tap(); setSnapsOpen(true); }} accessibilityLabel={st.snapTitle} accessibilityHint={st.snapSub} testID={TID.setSnapshots} />
        <Text style={{ marginTop: 10, fontSize: 12.5, lineHeight: 18, color: M.sub }}>
          {storage.note}
        </Text>
        <YearRows M={M} />

        <SubHead M={M} label={st.subRestart} />
        <LineRow M={M} first title={st.templateRow} sub={st.templateRowSub({ n: TEMPLATES.length })} right="chevron" onPress={() => { tap(); setPicking(true); }} accessibilityLabel={st.templateRow} pressRef={templateRow} testID={TID.setTemplate} />
        <LineRow M={M} title={st.sampleRow} sub={st.sampleRowSub} right="chevron" onPress={confirmSample} accessibilityLabel={st.sampleRow} testID={TID.setSample} />
        <LineRow M={M} last danger title={st.resetRow} sub={st.resetRowSub} onPress={confirmReset} accessibilityLabel={st.resetRow} accessibilityHint={st.resetRowSub} testID={TID.setReset} />

        <ProSection M={M} />

        <Section M={M} label={st.secInfo} />
        <ColophonRow M={M} first label={st.colName} value={st.appName} />
        <ColophonRow M={M} label={st.colVersion} value={APP_VERSION} />
        <ColophonRow M={M} label={st.colFont} value="Pretendard · SIL OFL 1.1" />
        <ColophonRow M={M} label={st.colPlace} value={storage.place} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, marginTop: 14 }}>
          {!!PRIVACY_URL && <TextLink M={M} label={st.privacy} onPress={() => openLink(PRIVACY_URL)} />}
          {!!SUPPORT_EMAIL && !!mailto && <TextLink M={M} label={st.contact} hint={st.contactHint} onPress={() => openLink(mailto)} />}
          <TextLink M={M} label={st.licenses} onPress={() => { tap(); setLicensesOpen(true); }} />
        </View>
        <CrashRow M={M} />
        {/* 판권면 아래 작은 인쇄소 표 — 타일·가운데 영웅 없이 왼쪽 아래에 */}
        <View style={{ marginTop: 24, marginBottom: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <GridMark size={16} color={GOLD} />
        </View>
      </View>

      {importing && <BackupImport onClose={() => setImporting(false)} returnFocusRef={importRow} />}
      {picking && <TemplateSheet M={M} onClose={onTemplateSheetClosed} onPick={pickTemplate} returnFocusRef={templateRow} />}
      {snapsOpen && (
        <Sheet M={M} onClose={onSnapSheetClosed} ownClose>
          <SnapshotList M={M} list={snaps} onPick={pickSnapshot} />
        </Sheet>
      )}
      {licensesOpen && (
        <Sheet M={M} onClose={() => setLicensesOpen(false)} ownClose>
          <LicenseList M={M} />
        </Sheet>
      )}
    </View>
  );
}
