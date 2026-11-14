// 설정(목업 docs/design/mockups/a/settings.png · build-plan §1 settings · §3 S6).
// 머리는 스크롤 밖에 고정(<Header pinned> — Root가 화면 위에 그린다). 구역 차례:
// 핵심 목표 · 알림 · iCloud와 백업 · 보기(화면 모드 · 종이 무늬) · 언어 · 한 해 · 새로 시작 · 프로(판매를 켰을 때만) · 정보.
// 한 가지 조작에 한 가지 일: 체크 칸 = 켜고 끄기(알림 · iCloud), 견본 = 보기 고르기, 고르기 줄 = 말로 하나 고르기(언어).
// 무엇을 여는 줄은 먹 꺾쇠 하나로 끝난다. 되돌리기 어려운 줄(초기화)도 먹 — 확인 대화상자가 묻는다.
// 예전의 종이 색 · 포인트 컬러 · 칸 모서리 줄은 없다 — 값(settings.mood · accent · cellShape)은 문서와 맞추기에 그대로 남고, 이 판은 쓰지도 그리지도 않는다.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Header, LineRow, Sheet, useSheetDismiss } from '../components/common';
import { Mark } from '../components/chart';
import { Icon } from '../components/Icon';
import { LinkRow, TextLink } from '../components/kit';
import { SheetHead, TemplateSheet } from '../components/TemplateSheet';
import { TEMPLATES, templateThemes, type Template } from '../data/templates';
import { APP_VERSION, LICENSES, PRIVACY_URL, SUPPORT_EMAIL, privacyLink, supportMailto } from '../lib/appInfo';
import { summarize } from '../lib/backup';
import { backupAgeLabel } from '../lib/backupNote';
import { tap } from '../lib/haptics';
import { exportBackup } from '../lib/shareFile';
import { useSyncEnabled } from '../lib/syncStatus';
import { fmtDateLong } from '../lib/text';
import { useMsg } from '../i18n/react';
import { lang, type Messages } from '../i18n';
import { useUIActions } from '../navigation/ui';
import { BackupImport } from '../overlays/BackupImport';
import { useMandarat, type SnapshotInfo } from '../store/MandaratContext';
import { useResetUndo, useSnapshotUndo } from '../store/useSnapshotUndo';
import { GEO } from '../theme/tokens';
import { ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { ColophonRow, SET, SetNote, SetSection, ask } from './settings/rows';
import { LookRows } from './settings/LookRows';
import { PaperRows } from './settings/PaperRows';
import { LanguageSection } from './settings/LanguageSection';
import { NotifySection } from './settings/NotifySection';
import { SYNC_ROWS, SyncSection } from './settings/SyncSection';
import { YearRows } from './settings/YearRows';
import { ProSection } from './settings/ProSection';
import { STORE_OPEN } from '../lib/pro';
import { TID } from '../lib/testIds';

/** 기록이 저장되는 곳 — iCloud 기기 백업은 iPhone·iPad에만 있다(안드로이드·웹에서는 이 기기에만) */
const IOS = Platform.OS === 'ios';
const DEVICE = IOS && (Platform as { isPad?: boolean }).isPad === true ? 'iPad' : 'iPhone';

/** 백업 줄 아래 안내와 판권면의 저장 위치 — iCloud로 맞추기가 켜져 있으면 iCloud도 적는다(켜기는 iOS에만 있다) */
function storageText(st: Messages['settings'], synced: boolean): { note: string; place: string } {
  if (!IOS) return { note: st.storageNoteLocal, place: st.storagePlaceLocal };
  if (synced) return { note: st.storageNoteSync({ device: DEVICE }), place: st.storagePlaceSync({ device: DEVICE }) };
  return { note: st.storageNoteBackup({ device: DEVICE }), place: st.storagePlaceBackup({ device: DEVICE }) };
}

/** 저장본 목록 — 고르면 묻고, 되돌리기로 했으면 시트가 내려간 뒤 onRestore(day) */
function SnapshotList({ M, list, onPick }: { M: M; list: SnapshotInfo[] | null; onPick: (day: string, close: () => void) => void }) {
  const dismiss = useSheetDismiss();
  const st = useMsg().settings;
  return (
    <View style={{ paddingBottom: 8 }}>
      <SheetHead M={M} title={st.snapTitle} body={st.snapBody} />
      {list === null ? (
        <Text style={{ ...ROLE.noteSheet, color: M.print, paddingVertical: 14 }}>{st.snapLoading}</Text>
      ) : list.length === 0 ? (
        <Text style={{ ...ROLE.noteSheet, color: M.print, paddingVertical: 14 }}>{st.snapEmpty}</Text>
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
    <View style={{ paddingBottom: 8 }}>
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
    // 문서의 설정(종이 무늬 · 알림 · 마지막 백업 날 · 예전 보기 값)은 지금 것을 그대로 둔다 — 되돌리는 건 기록이다
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
  const backupAge = backupAgeLabel(doc.settings.lastBackupAt, new Date());

  return (
    <View onAccessibilityEscape={back}>
      {/* 머리는 스크롤 밖에 고정 — 뒤로 가기('‹ 홈')는 위 줄, 제목은 그 아래 */}
      <Header M={M} title={st.screenTitle} onBack={back} focusTitle pinned backTestID={TID.setBack} />

      <View style={{ paddingHorizontal: GEO.gutter }}>
        {/* 핵심 목표 — 주인이 쓴 말이 이 쪽에서 가장 크고 진한 글 */}
        <SetSection M={M} label={st.secGoal} first />
        <Pressable
          onPress={() => { tap(); openEditor({ kind: 'center' }); }}
          testID={TID.setGoal}
          accessibilityRole="button"
          accessibilityLabel={goal ? st.goalLabel({ goal }) : st.goalEmpty}
          accessibilityHint={st.goalHint}
          style={({ pressed }) => ({
            minHeight: SET.goalH, flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: pressed ? M.tile : undefined,
          })}
        >
          <Text style={{ flex: 1, minWidth: 0, ...ROLE.title, color: goal ? M.ink : M.print }} numberOfLines={2}>
            {goal || st.goalEmpty}
          </Text>
          <Icon name="chevR" size={16} color={M.ink} style={{ marginRight: -4 }} />
        </Pressable>

        <NotifySection M={M} />

        {/* iCloud와 백업 — iCloud 줄(iOS) 아래 백업 셋, 저장 위치 안내는 그 바로 아래 */}
        <SetSection M={M} label={st.secCloud} />
        <SyncSection M={M} />
        <LinkRow
          M={M}
          glyph="export"
          divider={SYNC_ROWS}
          title={st.exportTitle}
          meta={backupAge}
          accessibilityLabel={st.exportTitle}
          accessibilityHint={st.exportHint({ age: backupAge })}
          onPress={onExport}
          testID={TID.setExport}
        />
        <LinkRow M={M} glyph="import" divider title={st.importTitle} meta={st.importSub} onPress={() => { tap(); setImporting(true); }} accessibilityLabel={st.importTitle} pressRef={importRow} testID={TID.setImport} />
        <LinkRow M={M} glyph="copies" divider title={st.snapTitle} meta={st.snapSub} onPress={() => { tap(); setSnapsOpen(true); }} accessibilityLabel={st.snapTitle} accessibilityHint={st.snapSub} testID={TID.setSnapshots} />
        <SetNote M={M} text={storage.note} />

        {/* 보기 — 화면 모드(기기마다) · 종이 무늬(문서). 견본 줄의 이름은 그 위 줄 오른쪽에 */}
        <SetSection M={M} label={st.secView} note={st.subLook} />
        <LookRows M={M} />
        <PaperRows M={M} />

        <LanguageSection M={M} />
        <YearRows M={M} />

        {/* 새로 시작 — 통째로 새로 쓰는 줄. 모두 확인 대화상자를 거치고, 지운 직후 되돌릴 수 있다 */}
        <SetSection M={M} label={st.subRestart} />
        <LineRow M={M} first title={st.templateRow} sub={st.templateRowSub({ n: TEMPLATES.length })} right="chevron" onPress={() => { tap(); setPicking(true); }} accessibilityLabel={st.templateRow} pressRef={templateRow} testID={TID.setTemplate} />
        <LineRow M={M} title={st.sampleRow} sub={st.sampleRowSub} right="chevron" onPress={confirmSample} accessibilityLabel={st.sampleRow} testID={TID.setSample} />
        <LineRow M={M} last danger title={st.resetRow} sub={st.resetRowSub} onPress={confirmReset} accessibilityLabel={st.resetRow} accessibilityHint={st.resetRowSub} testID={TID.setReset} />

        {/* 프로 판매를 켰을 때만(lib/pro STORE_OPEN) — 1.0은 모든 기능이 무료라 이 구역이 없다 */}
        {STORE_OPEN && <ProSection M={M} />}

        {/* 정보 — 마크(L0) 한 장, 판권 줄, 링크 */}
        <SetSection M={M} label={st.secInfo} />
        <View style={{ paddingTop: SET.swatchTop, marginBottom: SET.markBottom }}>
          <Mark size={SET.mark} />
        </View>
        <ColophonRow M={M} first label={st.colName} value={st.appName} />
        <ColophonRow M={M} label={st.colVersion} value={APP_VERSION} />
        <ColophonRow M={M} label={st.colFont} value={st.colFontValue} />
        <ColophonRow M={M} label={st.colPlace} value={storage.place} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: SET.linksGap, rowGap: 8, marginTop: SET.linksTop }}>
          {!!PRIVACY_URL && <TextLink M={M} label={st.privacy} onPress={() => openLink(privacyLink(lang()))} />}
          {!!SUPPORT_EMAIL && !!mailto && <TextLink M={M} label={st.contact} hint={st.contactHint} onPress={() => openLink(mailto)} />}
          <TextLink M={M} label={st.licenses} onPress={() => { tap(); setLicensesOpen(true); }} />
        </View>
      </View>

      {importing && <BackupImport onClose={() => setImporting(false)} returnFocusRef={importRow} />}
      {picking && <TemplateSheet M={M} onClose={onTemplateSheetClosed} onPick={pickTemplate} returnFocusRef={templateRow} />}
      {snapsOpen && (
        <Sheet M={M} onClose={onSnapSheetClosed} ownClose pad>
          <SnapshotList M={M} list={snaps} onPick={pickSnapshot} />
        </Sheet>
      )}
      {licensesOpen && (
        <Sheet M={M} onClose={() => setLicensesOpen(false)} ownClose pad>
          <LicenseList M={M} />
        </Sheet>
      )}
    </View>
  );
}
