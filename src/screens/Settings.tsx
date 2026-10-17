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
import { MOOD_LABEL, SHAPE_LABEL } from '../lib/copy';
import { select, tap } from '../lib/haptics';
import { exportBackup } from '../lib/shareFile';
import { fmtDateLong } from '../lib/text';
import { useUIActions } from '../navigation/ui';
import { BackupImport } from '../overlays/BackupImport';
import { useMandarat, type SnapshotInfo } from '../store/MandaratContext';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
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

const MOOD_OPTS: readonly Mood[] = ['연꽃', '크림', '화이트', '파스텔', '다크'];
const SHAPE_OPTS: readonly CellShape[] = ['둥근', '각진'];
/** 기록이 저장되는 곳 — iCloud 기기 백업은 iPhone에만 있다(안드로이드·웹에서는 이 기기에만) */
const IOS = Platform.OS === 'ios';
const STORAGE_NOTE = IOS
  ? '기록은 이 iPhone과 iCloud 백업에 저장돼요. iCloud 백업을 꺼 두었다면 기기를 바꾸기 전에 백업을 내보내 두세요.'
  : '기록은 이 기기에 저장돼요. 기기를 바꾸기 전에 백업을 내보내 두세요.';
const STORAGE_PLACE = IOS ? '이 iPhone과 iCloud 백업' : '이 기기';

/** 종이 견본 — 그 종이의 바탕 · 점 여섯 개 · 먹색 '가' */
function PaperSwatch({ M, mood }: { M: M; mood: Mood }) {
  const p = MOODS[mood];
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
      <Text style={{ fontSize: 15, lineHeight: 18, fontWeight: '700', color: p.ink }} maxFontSizeMultiplier={1}>가</Text>
    </View>
  );
}

/**
 * 포인트 컬러 — 색 견본 다섯 개를 한 줄로(알약·옅은 바탕 없이 그 색 그대로의 네모).
 * 고른 견본은 먹색 네모 테두리로 두르고 안에 체크를 긋는다. 이름은 견본 아래에.
 */
function AccentRow({ M, value, onChange }: { M: M; value: string; onChange: (c: string) => void }) {
  const cur = value.toLowerCase();
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
            accessibilityLabel={`포인트 컬러 ${name}`}
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
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SheetHead M={M} title="저장본" body="최근 7일, 하루 한 번 저절로 남겨요. 고르면 그날의 기록으로 되돌려요." />
      {list === null ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, paddingVertical: 14 }}>저장본을 찾는 중이에요</Text>
      ) : list.length === 0 ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}>
          아직 남은 저장본이 없어요. 하루 중 처음 기록할 때 한 벌씩 남겨요.
        </Text>
      ) : (
        list.map((s, i) => {
          const title = `${fmtDateLong(s.day)} 저장본`;
          const sub = `채운 칸 ${s.summary.filled} · 기록 ${s.summary.days}일`;
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
              accessibilityHint="이 저장본으로 되돌리기"
              onPress={() => onPick(s.day, () => dismiss(true))}
            />
          );
        })
      )}
    </View>
  );
}

function LicenseList({ M }: { M: M }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SheetHead M={M} title="오픈소스 라이선스" body="이 앱은 아래 오픈소스를 쓰고 있어요." />
      {LICENSES.map((l, i) => (
        <LineRow key={l.name} M={M} first={i === 0} last={i === LICENSES.length - 1} title={l.name} right={l.license} accessibilityLabel={`${l.name}, ${l.license}`} />
      ))}
    </View>
  );
}

export function Settings() {
  const M = usePalette();
  const { go, back, openEditor, showToast } = useUIActions();
  const { doc, setSetting, loadSample, applyTemplate, resetAll, replaceDoc, listSnapshots, readSnapshot } = useMandarat();
  const offerUndo = useSnapshotUndo();

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
    offerUndo(`‘${t.name}’ 템플릿으로 바꿨어요`, snapshot);
  }, [applyTemplate, go, offerUndo]);

  const pickTemplate = (t: Template, close: () => void) => {
    tap();
    const proceed = () => { pendingTemplate.current = t; close(); };
    const { filled } = summarize(doc);
    if (filled > 0 || goal) {
      ask(
        '템플릿으로 바꿀까요?',
        `지금 적어 둔 실천 ${filled}개와 오늘 할 일이 지워지고, 영역 8개가 ‘${t.name}’ 영역으로 바뀌어요. 핵심 목표와 지난 기록은 그대로예요. 바꾼 직후에는 되돌릴 수 있어요.`,
        '바꾸기', proceed, true,
      );
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
    ask(
      '이 저장본으로 되돌릴까요?',
      '지금 기록이 이 저장본으로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.',
      '되돌리기',
      () => { pendingSnap.current = day; close(); },
      true,
    );
  };

  const restoreSnapshot = useCallback(async (day: string) => {
    const saved = await readSnapshot(day);
    if (!saved) {
      showToast('저장본을 읽지 못했어요');
      return;
    }
    const snapshot = docRef.current; // 되돌리기용
    // 보기 설정(종이·포인트 컬러·마지막 백업 날)은 지금 것을 그대로 둔다 — 되돌리는 건 기록이다
    replaceDoc({ ...saved, settings: snapshot.settings });
    offerUndo(`${fmtDateLong(day)} 저장본으로 되돌렸어요`, snapshot);
  }, [readSnapshot, replaceDoc, offerUndo, showToast]);

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
    offerUndo('예시로 채웠어요', snapshot);
  };
  const confirmSample = () => {
    tap();
    if (summarize(doc).filled === 0) { doSample(); return; }
    ask('예시로 채울까요?', '지금 적어 둔 영역과 실천이 예시로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.', '채우기', doSample);
  };

  const doReset = () => {
    const snapshot = doc; // 되돌리기용 직전 상태
    resetAll();
    offerUndo('모든 기록을 지웠어요', snapshot);
  };
  const confirmReset = () => {
    tap();
    ask('모든 기록을 지울까요?', '핵심 목표, 실천 64칸, 했어요 기록이 모두 지워져요. 지운 직후에는 되돌릴 수 있어요.', '지우기', doReset, true);
  };

  // ── 백업 ──
  const onExport = async () => {
    if (exporting) return;
    tap();
    setExporting(true);
    const ok = await exportBackup(doc, new Date(), (day) => setSetting('lastBackupAt', day));
    setExporting(false);
    if (Platform.OS === 'web') showToast(ok ? '백업 파일을 저장했어요' : '이 브라우저에서는 저장할 수 없어요');
    // 안드로이드는 공유 창을 닫아도 '공유됨'으로 알려 오므로 iOS에서만 완료를 알린다
    else if (Platform.OS === 'ios' && ok) showToast('백업을 내보냈어요');
  };

  const openLink = (url: string) => {
    tap();
    Linking.openURL(url).catch(() => showToast('열 수 없어요'));
  };
  const mailto = supportMailto();

  return (
    <View onAccessibilityEscape={back}>
      {/* 제목은 뒤로 가기 아래 줄에 — 다른 화면처럼 20pt 왼쪽 끝에서 시작한다 */}
      <Header M={M} kr="설정" onBack={back} focusTitle stacked backTestID={TID.setBack} />

      <View style={{ paddingHorizontal: 20 }}>
        <Section M={M} label="핵심 목표" />
        <Pressable
          onPress={() => { tap(); openEditor({ kind: 'center' }); }}
          testID={TID.setGoal}
          accessibilityRole="button"
          accessibilityLabel={goal ? `핵심 목표, ${goal}` : '핵심 목표를 정해 주세요'}
          accessibilityHint="고치기"
          style={({ pressed }) => [rowBase(M, true, true), pressed ? pressedRow(M) : null]}
        >
          <Text style={{ flex: 1, ...TYPE.rowTitle, color: goal ? M.ink : M.sub }} numberOfLines={2}>
            {goal || '핵심 목표를 정해 주세요'}
          </Text>
          <Icon name="chevR" size={16} color={M.faint} />
        </Pressable>

        <Section M={M} label="보기" />
        <SubHead M={M} label="종이" first />
        <View accessibilityRole="radiogroup">
          {MOOD_OPTS.map((mood, i) => (
            <RadioRow
              key={mood}
              M={M}
              label={MOOD_LABEL[mood]}
              a11yLabel={`종이 ${MOOD_LABEL[mood]}`}
              on={doc.settings.mood === mood}
              first={i === 0}
              last={i === MOOD_OPTS.length - 1}
              onPress={() => { select(); setSetting('mood', mood); }}
              lead={<PaperSwatch M={M} mood={mood} />}
              testID={TID.setMood(mood)}
            />
          ))}
        </View>

        <SubHead M={M} label="포인트 컬러" />
        <AccentRow M={M} value={doc.settings.accent} onChange={(c) => { select(); setSetting('accent', c); }} />

        <SubHead M={M} label="칸 모서리" />
        <View accessibilityRole="radiogroup">
          {SHAPE_OPTS.map((shape, i) => (
            <RadioRow
              key={shape}
              M={M}
              label={SHAPE_LABEL[shape]}
              a11yLabel={`칸 모서리 ${SHAPE_LABEL[shape]}`}
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
        <Section M={M} label="기록" />
        <SubHead M={M} label="백업" first />
        <LineRow
          M={M} first title="백업 내보내기"
          sub={backupAgeLabel(doc.settings.lastBackupAt, new Date())}
          right="chevron"
          accessibilityLabel="백업 내보내기"
          accessibilityHint={`${backupAgeLabel(doc.settings.lastBackupAt, new Date())}. 기록을 파일로 내보내요`}
          onPress={onExport}
          testID={TID.setExport}
        />
        <LineRow M={M} title="백업 불러오기" sub="내보낸 백업으로 기록을 되살려요" right="chevron" onPress={() => { tap(); setImporting(true); }} accessibilityLabel="백업 불러오기" pressRef={importRow} testID={TID.setImport} />
        <LineRow M={M} last title="저장본" sub="최근 7일, 하루 한 번 저절로 남겨요" right="chevron" onPress={() => { tap(); setSnapsOpen(true); }} accessibilityLabel="저장본" accessibilityHint="최근 7일, 하루 한 번 저절로 남겨요" testID={TID.setSnapshots} />
        <Text style={{ marginTop: 10, fontSize: 12.5, lineHeight: 18, color: M.sub }}>
          {STORAGE_NOTE}
        </Text>
        <YearRows M={M} />

        <SubHead M={M} label="새로 시작" />
        <LineRow M={M} first title="템플릿으로 새로 쓰기" sub={`템플릿 ${TEMPLATES.length}가지 중에서 골라요`} right="chevron" onPress={() => { tap(); setPicking(true); }} accessibilityLabel="템플릿으로 새로 쓰기" pressRef={templateRow} testID={TID.setTemplate} />
        <LineRow M={M} title="예시로 채우기" sub="8개 영역 · 64칸 실천 예시를 채워요" right="chevron" onPress={confirmSample} accessibilityLabel="예시로 채우기" testID={TID.setSample} />
        <LineRow M={M} last danger title="전체 초기화" sub="모든 목표와 기록을 지워요" onPress={confirmReset} accessibilityLabel="전체 초기화" accessibilityHint="모든 목표와 기록을 지워요" testID={TID.setReset} />

        <ProSection M={M} />

        <Section M={M} label="정보" />
        <ColophonRow M={M} first label="이름" value="만다라트" />
        <ColophonRow M={M} label="판" value={APP_VERSION} />
        <ColophonRow M={M} label="서체" value="Pretendard · SIL OFL 1.1" />
        <ColophonRow M={M} label="저장 위치" value={STORAGE_PLACE} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, marginTop: 14 }}>
          {!!PRIVACY_URL && <TextLink M={M} label="개인정보 처리방침" onPress={() => openLink(PRIVACY_URL)} />}
          {!!SUPPORT_EMAIL && !!mailto && <TextLink M={M} label="문의하기" hint="메일 앱이 열려요" onPress={() => openLink(mailto)} />}
          <TextLink M={M} label="오픈소스 라이선스" onPress={() => { tap(); setLicensesOpen(true); }} />
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
