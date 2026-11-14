import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { File } from 'expo-file-system';
import { Text, a11yLangProp } from '../components/AppText';
import { Button, QuietAction, RuledNotice, Sheet, useSheetDismiss } from '../components/common';
import { SheetHead } from '../components/TemplateSheet';
import { Field, LinkRow, ROW, RowRule, RowTitle } from '../components/kit';
import { PRETENDARD } from '../theme/fonts';
import { NUM, ROLE } from '../theme/type';
import { usePalette, type M } from '../theme/usePalette';
import { useMandarat } from '../store/MandaratContext';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
import { parseBackup, summarize, type BackupError, type BackupSummary, type ParseResult } from '../lib/backup';
import { ledgerRows, nowIsNewer } from '../lib/backupLedger';
import { lastBackupAfterImport } from '../lib/lastBackup';
import { unionArchives } from '../lib/archive';
import { pickTextFile } from '../lib/webFile';
import { announce } from '../lib/useReducedMotion';
import { tap, success } from '../lib/haptics';
import type { Messages } from '../i18n';
import { useMsg } from '../i18n/react';

/** parseBackup의 오류 코드 → m.backup의 글 */
const ERROR_KEY = {
  empty: 'errEmpty',
  notFound: 'errNotFound',
  broken: 'errBroken',
  notOurs: 'errNotOurs',
  newer: 'errNewer',
} as const satisfies Record<BackupError, keyof Messages['backup']>;
/** 파일 고르기에서 보일 종류 — iOS는 MIME을 UTType으로 바꾸고 모르는 값(public.json)은 버린다. 안드로이드에는 MIME만 */
const PICK_TYPES = Platform.OS === 'ios'
  ? ['application/json', 'public.json', 'text/plain']
  : ['application/json', 'text/plain'];
/** 되돌리기 토스트를 평소보다 길게 — 통째로 바뀐 뒤 무엇이 달라졌는지 둘러볼 시간 */
const UNDO_MS = 10000;
/** 붙여 넣기 칸의 높이 — 긴 백업 글이 시트를 밀어 내지 않게 고정(안에서 스크롤) */
const PASTE_H = 112;
/** 장부의 이름 칸 폭(설정 › iCloud 고르기 시트와 같은 84) · 줄 위아래 */
const LEDGER_LABEL_W = 84;
const LEDGER_PAD_Y = 10;

/** '10월 14일 수요일에 만든 백업' — 날짜를 읽지 못하면 빈 글 */
function fmtExported(b: Messages['backup'], iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return b.exportedOn({ d });
}

/**
 * 백업 불러오기 — 부품 상자의 시트(안쪽 24, 떠 있는 판): 머리(SheetHead) · 파일 고르기 줄(LinkRow)
 * · 붙여 넣기 칸(tile 메모 칸, 예비 길) · 지금 | 백업 장부 · 주 단추 하나. 바꾼 직후에는 되돌릴 수 있다.
 */
export function BackupImport({ onClose, returnFocusRef }: {
  onClose: () => void;
  /** 닫힌 뒤 스크린리더 초점을 돌려줄 곳(시트를 연 줄) */
  returnFocusRef?: React.RefObject<View | null>;
}) {
  const M = usePalette();
  const m = useMsg();
  const b = m.backup;
  const { doc, replaceDoc, getDoc } = useMandarat();
  const offerUndo = useSnapshotUndo();
  const [text, setText] = useState('');
  // 입력이 멈추면 한 번만 읽는다(긴 글을 한 글자씩 고칠 때마다 다시 해석하지 않게)
  const [settled, setSettled] = useState('');
  const [fileError, setFileError] = useState(false);
  // 파일에서 읽었으면 붙여 넣기 칸 대신 '파일에서 읽었어요' 한 줄 — 긴 JSON 글을 칸에 쏟아 놓지 않는다(글은 상태로만 둔다).
  // name: 고른 파일 이름(웹의 파일 고르기는 이름을 알려 주지 않아 빈 글)
  const [fromFile, setFromFile] = useState<{ name: string } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setSettled(text), 180);
    return () => clearTimeout(t);
  }, [text]);
  const result = useMemo<ParseResult | null>(() => (settled.trim() ? parseBackup(settled) : null), [settled]);

  // 읽은 결과는 한 번만 소리로 알린다(같은 결과를 고쳐 쓰는 동안 되풀이하지 않게)
  const spoken = useRef('');
  useEffect(() => {
    const said = result ? (result.ok ? b.readOk : b[ERROR_KEY[result.error]]) : '';
    if (said && said !== spoken.current) announce(said);
    spoken.current = said;
  }, [result, b]);

  const onText = useCallback((t: string) => {
    setFileError(false);
    setFromFile(null);
    setText(t);
  }, []);

  /** 파일에서 읽은 글 — 기다리지 않고 바로 읽는다 */
  const takeFile = useCallback((t: string, name = '') => {
    setFileError(false);
    setFromFile({ name });
    setText(t);
    setSettled(t);
  }, []);

  /** 파일 대신 붙여 넣기로 — 읽은 글을 비우고 빈 칸을 다시 연다 */
  const toPaste = useCallback(() => {
    tap();
    setFileError(false);
    setFromFile(null);
    setText('');
    setSettled('');
  }, []);

  const pickFile = useCallback(async () => {
    tap();
    try {
      if (Platform.OS === 'web') {
        const t = await pickTextFile();
        if (t != null) takeFile(t.text, t.name);
        return;
      }
      const picked = await File.pickFileAsync({ mimeTypes: PICK_TYPES });
      if (picked.canceled) return;
      takeFile(await picked.result.text(), picked.result.name);
    } catch {
      setFileError(true);
      announce(b.fileFailed);
    }
  }, [takeFile, b]);

  // 한 번만 — 두 번 눌리면 두 번째 스냅샷이 이미 불러온 문서가 되어 되돌리기가 의미를 잃는다
  const applied = useRef(false);
  const apply = useCallback((dismiss: () => void) => {
    if (!result?.ok || applied.current) return;
    applied.current = true;
    success();
    const snapshot = doc; // 되돌리기용
    const last = lastBackupAfterImport(doc.settings.lastBackupAt, result.doc.settings.lastBackupAt, result.summary.exportedAt);
    const imported = last ? { ...result.doc, settings: { ...result.doc.settings, lastBackupAt: last } } : result.doc;
    // 지난 표는 합친다 — 이전 백업(지난 표 없음 · 표를 닫기 전)을 불러와도 지금 있는 지난 표가 사라지지 않게
    replaceDoc({ ...imported, archives: unionArchives(getDoc().archives, imported.archives) });
    dismiss();
    // 그사이 다른 기록이 생겼다면 덮어쓰지 않는다(여기서는 토스트를 10초 둔다)
    offerUndo(b.applied, snapshot, { duration: UNDO_MS });
  }, [result, doc, replaceDoc, getDoc, offerUndo, b]);

  const now = useMemo(() => summarize(doc), [doc]);
  const backup = result?.ok ? result.summary : null;
  const error = fileError ? b.fileFailed : result && !result.ok ? b[ERROR_KEY[result.error]] : null;

  return (
    <Sheet
      M={M}
      onClose={onClose}
      maxHeightPct={0.9}
      ownClose
      pad
      returnFocusRef={returnFocusRef}
      footer={<ApplyButton M={M} label={b.apply} ready={!!backup} onApply={apply} />}
    >
      <View style={{ paddingBottom: 12 }}>
        <SheetHead M={M} title={b.sheetTitle} body={b.sheetBody} />

        {/* 파일 고르기 — 글리프(가져오기) · 제목 · 설명 · 꺾쇠. 파일을 읽었으면 바로 밑에 '파일에서 읽었어요' 줄이 붙는다 */}
        <LinkRow
          M={M}
          glyph="import"
          title={fromFile ? b.pickOther : b.pickFile}
          meta={b.pickSub}
          onPress={pickFile}
          accessibilityLabel={fromFile ? b.pickOther : b.pickFile}
        />

        {fromFile ? (
          <FileRow M={M} name={fromFile.name} onPaste={toPaste} />
        ) : (
          <>
            <Text style={{ ...ROLE.noteSheet, color: M.print, marginTop: 16 }}>
              {b.pasteHelp}
            </Text>
            <Field
              M={M}
              variant="memo"
              value={text}
              onChangeText={onText}
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              accessibilityLabel={b.pasteLabel}
              accessibilityHint={error ?? undefined}
              placeholder={b.pastePlaceholder}
              style={{ marginTop: 8, height: PASTE_H }}
              inputStyle={{ height: PASTE_H }}
            />
          </>
        )}

        {/* 읽지 못했으면 칸 바로 밑에 한 줄 — 테두리 · 경고색 없이 먹 600 */}
        {!!error && (
          <Text style={{ ...ROLE.label, fontFamily: PRETENDARD[600], color: M.ink, marginTop: 8 }}>
            {error}
          </Text>
        )}

        {backup && <Ledger M={M} now={now} backup={backup} />}
      </View>
    </Sheet>
  );
}

/**
 * 파일에서 읽었을 때 붙여 넣기 칸 자리의 줄 — 파일 고르기 줄 바로 밑에 붙어(사이 머리카락 선, x 38부터) 같은 박자로 선다.
 * 빈 상자 칸 · '파일에서 읽었어요' + 파일 이름 · 오른쪽에 조용한 '붙여 넣기로'(예비 길). 읽은 내용은 바로 아래 장부가 보여 준다
 */
function FileRow({ M, name, onPaste }: { M: M; name: string; onPaste: () => void }) {
  const b = useMsg().backup;
  return (
    <View style={{ minHeight: ROW.h, flexDirection: 'row', alignItems: 'center', gap: ROW.gap }}>
      <RowRule M={M} />
      <View style={{ width: ROW.box }} />
      <View style={{ flex: 1, minWidth: 0 }} accessible accessibilityLabel={name ? b.fromFileSay({ name }) : b.fromFile} {...a11yLangProp()}>
        <RowTitle M={M} text={b.fromFile} />
        {!!name && (
          <Text style={{ ...ROLE.rowMeta, color: M.ink2 }} numberOfLines={1} ellipsizeMode="middle">{name}</Text>
        )}
      </View>
      <QuietAction M={M} label={b.toPaste} onPress={onPaste} accessibilityLabel={b.toPasteLabel} accessibilityHint={b.toPasteHint} />
    </View>
  );
}

/** 아래에 붙은 주 단추 — 읽을 수 있는 백업이 있을 때만 누를 수 있다 */
function ApplyButton({ M, label, ready, onApply }: { M: M; label: string; ready: boolean; onApply: (dismiss: () => void) => void }) {
  const dismiss = useSheetDismiss();
  return (
    <Button
      M={M}
      label={label}
      disabled={!ready}
      onPress={() => onApply(() => dismiss(true))}
    />
  );
}

/** 지금 | 백업 — 인쇄된 머리 줄 + 줄 사이 머리카락 선의 두 칸 장부(이름 label print · 값 ledger 먹, 없으면 ink2) */
function Ledger({ M, now, backup }: { M: M; now: BackupSummary; backup: BackupSummary }) {
  const b = useMsg().backup;
  const exported = fmtExported(b, backup.exportedAt);
  const newer = nowIsNewer(now, backup);
  const rows = ledgerRows(now, backup);
  const value = (v: string, text?: boolean) => [
    { ...ROLE.ledger, flex: 1, paddingRight: 8, color: v === b.none ? M.ink2 : M.ink },
    text ? null : NUM,
  ];
  return (
    <View style={{ marginTop: 24 }}>
      <Text accessibilityRole="header" style={{ ...ROLE.section, color: M.printStrong }}>{b.readOk}</Text>
      {!!exported && <Text style={{ ...ROLE.label, color: M.print, marginTop: 2 }}>{exported}</Text>}
      {/* 지금 기록이 더 새로우면 — 표 위, 머리 바로 밑에 알림 한 장(작은 화면 · 큰 글자에서도 아래로 밀려 가려지지 않게, 화면 읽기도 먼저 읽는다).
          아래 표가 그 근거다(마지막 기록 지금 | 백업) */}
      {newer && (
        <View style={{ marginTop: 12 }}>
          <RuledNotice M={M} title={b.newerNow} />
        </View>
      )}

      <View style={{ marginTop: 12 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6 }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={{ width: LEDGER_LABEL_W }} />
          <Text style={{ ...ROLE.label, flex: 1, paddingRight: 8, color: M.print }}>{b.colNow}</Text>
          <Text style={{ ...ROLE.label, flex: 1, paddingRight: 8, color: M.print }}>{b.colBackup}</Text>
        </View>
        {rows.map((r) => (
          <View
            key={r.label}
            accessible
            // 소리로는 '채운 칸, 지금 64칸 중 23칸, 백업 64칸 중 41칸' — '23/64'·'10.3 (토)'를 날짜·소수로 읽지 않게
            accessibilityLabel={b.rowSay({ label: r.label, now: r.nowSay ?? r.now, backup: r.backupSay ?? r.backup })}
            {...a11yLangProp()}
            style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: LEDGER_PAD_Y }}
          >
            <RowRule M={M} inset={0} />
            <Text style={{ ...ROLE.label, width: LEDGER_LABEL_W, color: M.print }}>{r.label}</Text>
            <Text style={value(r.now, r.text)} numberOfLines={r.text ? 2 : 1}>{r.now}</Text>
            <Text style={value(r.backup, r.text)} numberOfLines={r.text ? 2 : 1}>{r.backup}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
