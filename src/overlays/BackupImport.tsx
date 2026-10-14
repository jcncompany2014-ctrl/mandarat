import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { File } from 'expo-file-system';
import { Text, TextInput } from '../components/AppText';
import { Sheet, LineRow, PrimaryButton, useSheetDismiss } from '../components/common';
import { SheetHead } from '../components/TemplateSheet';
import { alertInk } from '../components/KindBits';
import { NUM, TYPE } from '../theme/type';
import { usePalette, type M } from '../theme/usePalette';
import { useMandarat } from '../store/MandaratContext';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
import { parseBackup, summarize, type BackupSummary, type ParseResult } from '../lib/backup';
import { ledgerRows, nowIsNewer, LEDGER_NONE } from '../lib/backupLedger';
import { fmtDateLong } from '../lib/text';
import { lastBackupAfterImport } from '../lib/lastBackup';
import { pickTextFile } from '../lib/webFile';
import { announce } from '../lib/useReducedMotion';
import { tap, success } from '../lib/haptics';

const READ_OK = '읽을 수 있는 백업이에요';
const FILE_FAILED = '파일을 읽지 못했어요. 다시 골라 주세요';
const NEWER_NOW = '지금 기록이 백업보다 최근이에요 · 바꾸면 최근 기록이 사라져요';
/** 파일 고르기에서 보일 종류 — iOS는 MIME을 UTType으로 바꾸고 모르는 값(public.json)은 버린다. 안드로이드에는 MIME만 */
const PICK_TYPES = Platform.OS === 'ios'
  ? ['application/json', 'public.json', 'text/plain']
  : ['application/json', 'text/plain'];
/** 되돌리기 토스트를 평소보다 길게 — 통째로 바뀐 뒤 무엇이 달라졌는지 둘러볼 시간 */
const UNDO_MS = 10000;

/** '10월 14일 수요일에 만든 백업' — 날짜를 읽지 못하면 빈 글 */
function fmtExported(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${fmtDateLong(d)}에 만든 백업`;
}

/**
 * 백업 불러오기 — 파일을 고르거나(붙여넣기는 그 아래 예비 길) 읽은 뒤,
 * 지금과 백업을 두 줄 장부로 나란히 보여 주고 바꾼다. 바꾼 직후에는 되돌릴 수 있다.
 */
export function BackupImport({ onClose, returnFocusRef }: {
  onClose: () => void;
  /** 닫힌 뒤 스크린리더 초점을 돌려줄 곳(시트를 연 줄) */
  returnFocusRef?: React.RefObject<View | null>;
}) {
  const M = usePalette();
  const { doc, replaceDoc } = useMandarat();
  const offerUndo = useSnapshotUndo();
  const [text, setText] = useState('');
  // 입력이 멈추면 한 번만 읽는다(긴 글을 한 글자씩 고칠 때마다 다시 해석하지 않게)
  const [settled, setSettled] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
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
    const msg = result ? (result.ok ? READ_OK : result.error) : '';
    if (msg && msg !== spoken.current) announce(msg);
    spoken.current = msg;
  }, [result]);

  const onText = useCallback((t: string) => {
    setFileError(null);
    setFromFile(null);
    setText(t);
  }, []);

  /** 파일에서 읽은 글 — 기다리지 않고 바로 읽는다 */
  const takeFile = useCallback((t: string, name = '') => {
    setFileError(null);
    setFromFile({ name });
    setText(t);
    setSettled(t);
  }, []);

  /** 파일 대신 붙여 넣기로 — 읽은 글을 비우고 빈 칸을 다시 연다 */
  const toPaste = useCallback(() => {
    tap();
    setFileError(null);
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
      setFileError(FILE_FAILED);
      announce(FILE_FAILED);
    }
  }, [takeFile]);

  // 한 번만 — 두 번 눌리면 두 번째 스냅샷이 이미 불러온 문서가 되어 되돌리기가 의미를 잃는다
  const applied = useRef(false);
  const apply = useCallback((dismiss: () => void) => {
    if (!result?.ok || applied.current) return;
    applied.current = true;
    success();
    const snapshot = doc; // 되돌리기용
    const last = lastBackupAfterImport(doc.settings.lastBackupAt, result.doc.settings.lastBackupAt, result.summary.exportedAt);
    replaceDoc(last ? { ...result.doc, settings: { ...result.doc.settings, lastBackupAt: last } } : result.doc);
    dismiss();
    // 그사이 다른 기록이 생겼다면 덮어쓰지 않는다(여기서는 토스트를 10초 둔다)
    offerUndo('백업을 불러왔어요', snapshot, { duration: UNDO_MS });
  }, [result, doc, replaceDoc, offerUndo]);

  const now = useMemo(() => summarize(doc), [doc]);
  const backup = result?.ok ? result.summary : null;
  const error = fileError ?? (result && !result.ok ? result.error : null);

  return (
    <Sheet
      M={M}
      onClose={onClose}
      maxHeightPct={0.9}
      ownClose
      returnFocusRef={returnFocusRef}
      footer={<ApplyButton M={M} ready={!!backup} onApply={apply} />}
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <SheetHead M={M} title="백업 불러오기" body="지금 기록이 백업 내용으로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요." />

        {/* 파일을 읽었으면 아랫줄은 바로 밑 '파일에서 읽었어요' 줄의 윗줄이 맡는다 — 두 줄을 겹쳐 긋지 않는다(줄 색이 반투명) */}
        <LineRow
          M={M}
          first
          last={!fromFile}
          title={fromFile ? '다른 백업 파일 고르기' : '백업 파일 고르기'}
          sub="저장해 둔 백업 파일(.json)"
          right="chevron"
          onPress={pickFile}
          accessibilityLabel={fromFile ? '다른 백업 파일 고르기' : '백업 파일 고르기'}
        />

        {fromFile ? (
          <FileRow M={M} name={fromFile.name} onPaste={toPaste} />
        ) : (
          <>
            <Text style={{ fontSize: 12.5, lineHeight: 18, color: M.sub, marginTop: 16 }}>
              메모나 메신저에 보관한 백업 글은 길게 눌러 전체 선택 → 복사한 뒤 여기에 붙여 넣어요
            </Text>
            <TextInput
              value={text}
              onChangeText={onText}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              accessibilityLabel="백업 글 붙여 넣기"
              accessibilityHint={error ?? undefined}
              placeholder="백업 글 전체를 붙여 넣기"
              placeholderTextColor={M.sub}
              style={{
                marginTop: 8, height: 112, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1,
                borderColor: error ? alertInk(M) : M.line, backgroundColor: 'transparent',
                color: M.ink, fontSize: 13, lineHeight: 18, textAlignVertical: 'top',
              }}
            />
          </>
        )}

        {!!error && (
          <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: alertInk(M), marginTop: 8 }}>
            {error}
          </Text>
        )}

        {backup && <Ledger M={M} now={now} backup={backup} />}
      </View>
    </Sheet>
  );
}

/**
 * 파일에서 읽었을 때 붙여 넣기 칸 자리의 괘선 한 줄 — '파일에서 읽었어요' + 파일 이름, 오른쪽에 '붙여 넣기로'(예비 길).
 * 파일 고르기 줄 바로 밑에 붙어 두 줄짜리 괘선 묶음이 된다(사이 빈 띠 · 겹친 줄 없이). 읽은 내용은 바로 아래 지금 | 백업 장부가 보여 준다
 */
function FileRow({ M, name, onPaste }: { M: M; name: string; onPaste: () => void }) {
  return (
    <View
      style={{
        minHeight: 52, paddingVertical: 8, paddingHorizontal: 2, gap: 12,
        borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, flexDirection: 'row', alignItems: 'center',
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }} accessible accessibilityLabel={name ? `파일에서 읽었어요, ${name}` : '파일에서 읽었어요'}>
        <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: M.ink }}>파일에서 읽었어요</Text>
        {!!name && (
          <Text style={{ ...TYPE.caption, color: M.sub, marginTop: 2 }} numberOfLines={1} ellipsizeMode="middle">{name}</Text>
        )}
      </View>
      <Pressable
        onPress={onPaste}
        accessibilityRole="button"
        accessibilityLabel="붙여 넣기로 바꾸기"
        accessibilityHint="파일 대신 백업 글을 붙여 넣어요"
        hitSlop={12}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>붙여 넣기로</Text>
      </Pressable>
    </View>
  );
}

/** 아래에 붙은 주 버튼 — 읽을 수 있는 백업이 있을 때만 누를 수 있다 */
function ApplyButton({ M, ready, onApply }: { M: M; ready: boolean; onApply: (dismiss: () => void) => void }) {
  const dismiss = useSheetDismiss();
  return (
    <PrimaryButton
      M={M}
      label="이 백업으로 바꾸기"
      disabled={!ready}
      onPress={() => onApply(() => dismiss(true))}
    />
  );
}

/** 지금 | 백업 — 괘선 두 칸 장부 */
function Ledger({ M, now, backup }: { M: M; now: BackupSummary; backup: BackupSummary }) {
  const exported = fmtExported(backup.exportedAt);
  const newer = nowIsNewer(now, backup);
  const rows = ledgerRows(now, backup);
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '700', color: M.ink }}>{READ_OK}</Text>
      {!!exported && <Text style={{ ...TYPE.caption, color: M.sub, marginTop: 2 }}>{exported}</Text>}
      {/* 지금 기록이 더 새로우면 — 표 위, 머리 바로 밑에(작은 화면 · 큰 글자에서도 아래로 밀려 가려지지 않게, 화면 읽기도 먼저 읽는다).
          아래 표가 그 근거다(마지막 기록 지금 | 백업) */}
      {newer && (
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '700', color: alertInk(M), marginTop: 6 }}>{NEWER_NOW}</Text>
      )}

      <View style={{ marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: M.line }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={{ width: 84 }} />
          <Text style={[headCell, { color: M.sub }]}>지금</Text>
          <Text style={[headCell, { color: M.sub }]}>백업</Text>
        </View>
        {rows.map((r, i) => (
          <View
            key={r.label}
            accessible
            // 소리로는 '채운 칸, 지금 64칸 중 23칸, 백업 64칸 중 41칸' — '23/64'·'10.3 (토)'를 날짜·소수로 읽지 않게
            accessibilityLabel={`${r.label}, 지금 ${r.nowSay ?? r.now}, 백업 ${r.backupSay ?? r.backup}`}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
              borderTopWidth: i === 0 ? 0 : 1, borderColor: M.line,
            }}
          >
            <Text style={{ width: 84, fontSize: 13, lineHeight: 20, color: M.sub }}>{r.label}</Text>
            <Text style={[valueCell, { color: r.now === LEDGER_NONE ? M.sub : M.ink }, r.text ? null : NUM]} numberOfLines={r.text ? 2 : 1}>
              {r.now}
            </Text>
            <Text style={[valueCell, { color: r.backup === LEDGER_NONE ? M.sub : M.ink }, r.text ? null : NUM]} numberOfLines={r.text ? 2 : 1}>
              {r.backup}
            </Text>
          </View>
        ))}
      </View>

    </View>
  );
}

const headCell = { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700', paddingRight: 8 } as const;
const valueCell = { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', paddingRight: 8 } as const;
