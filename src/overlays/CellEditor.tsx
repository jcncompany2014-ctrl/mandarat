import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Keyboard, Platform, Pressable, ScrollView, View, type TextInput as RNTextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput } from '../components/AppText';
import { Icon } from '../components/Icon';
import {
  CloseBtn, PaperChip, PrimaryButton, Sheet, useKeyboardHeight, useSheetDismiss, type SheetDismissFn,
} from '../components/common';
import { alertInk } from '../components/KindBits';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUIActions, useUIState, type EditorTarget } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import type { ActionKind, MandaratDoc } from '../types';
import { tap, warn } from '../lib/haptics';
import { GuideChips } from '../components/GuideChips';
import { daysBetween, normalizeDays, ymd } from '../lib/routine';
import {
  KIND_HINT, KIND_LABEL, MAX_NUM, addDays, configOf, duePresets, fmtNum, parseNum, sameConfig, type KindConfig,
} from '../lib/kinds';
import { fmtDateLong, fmtDateSpeech, fmtDue, josa } from '../lib/text';
import { fitLabel, textWidth } from '../lib/labelFit';
import { suggestActions } from '../lib/suggest';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
import { suggestKind, type KindSuggestion } from '../lib/kindSuggest';
import { announce, reducedMotion } from '../lib/useReducedMotion';
import { cellTitleSpeech, dueSpeech, nextCellSpeech } from '../lib/sheetSpeech';
import { EDITOR_DRAFT_KEY, draftDiffers, draftFits, parseDraft, serializeDraft, type EditorDraft } from '../lib/editorDraft';
import { Snackbar } from './Snackbar';
import { DayPicker } from '../components/DayPicker';
import { SegmentedControl } from '../components/SegmentedControl';
import { CLOCKWISE } from '../theme/chart';

const KIND_ORDER: ActionKind[] = ['once', 'habit', 'count', 'mind'];

/** 괘선 줄 — 최소 높이와 왼쪽 이름 칸 폭(색인 카드처럼) */
const ROW_H = 52;
const LABEL_W = 64;

/** 81칸 표의 칸 하나에 한 줄로 들어가는 폭 — 한글 6자(6자 안쪽이면 다 보인다) */
const CHART_FS = 10;
const CHART_W = textWidth('가나다라마바', CHART_FS);

const IS_WEB = Platform.OS === 'web';

function meta(target: EditorTarget, doc: MandaratDoc) {
  if (target.kind === 'center') {
    return { title: '핵심 목표', speech: '핵심 목표', placeholder: '예) 첫 마라톤 완주하기', initial: doc.centerGoal, multiline: true, max: 40 };
  }
  const theme = doc.themes[target.ti];
  if (target.kind === 'theme') {
    const title = `영역 ${target.ti + 1} 이름`;
    return { title, speech: title, placeholder: '예) 건강', initial: theme.title, multiline: false, max: 18 };
  }
  const list = suggestActions(theme.title);
  return {
    title: `${areaName(doc, target.ti)} · 실천 ${target.ai + 1}/8`,
    // '3/8'은 날짜로 읽힌다 — 소리로는 '건강 영역, 8칸 중 세 번째 칸'(차트 칸과 같은 우리말 서수)
    speech: cellTitleSpeech(areaName(doc, target.ti), target.ai),
    placeholder: `예) ${list[target.ai % list.length]}`,
    initial: theme.actions[target.ai].text,
    multiline: true,
    max: 60,
  };
}

function areaName(doc: MandaratDoc, ti: number): string {
  return doc.themes[ti].title.trim() || `영역 ${ti + 1}`;
}

/** 같은 영역에서 이 칸 다음(시계 방향)으로 비어 있는 칸 — 없으면 null */
function nextEmptyCell(doc: MandaratDoc, ti: number, ai: number): number | null {
  const start = CLOCKWISE.indexOf(ai);
  for (let k = 1; k < CLOCKWISE.length; k++) {
    const j = CLOCKWISE[(start + k) % CLOCKWISE.length];
    if (j !== ai && !doc.themes[ti].actions[j].text.trim()) return j;
  }
  return null;
}

/** 저장하고 이어서 쓸 다음 자리 — 실천은 같은 영역의 빈 칸, 영역 이름은 차례로 쓰는 중일 때 다음 영역(8번까지) */
function nextTarget(doc: MandaratDoc, t: EditorTarget): EditorTarget | null {
  if (t.kind === 'action') {
    const j = nextEmptyCell(doc, t.ti, t.ai);
    return j == null ? null : { kind: 'action', ti: t.ti, ai: j, ...(t.seq ? { seq: true } : {}) };
  }
  if (t.kind === 'theme' && t.seq && t.ti < 7) return { kind: 'theme', ti: t.ti + 1, seq: true };
  return null;
}

function targetKey(t: EditorTarget): string {
  return t.kind === 'center' ? 'c' : t.kind === 'theme' ? `t${t.ti}` : `a${t.ti}-${t.ai}`;
}

/** 글에서 알아본 유형을 지금 설정 위에 얹는다(다른 유형의 값은 그대로 둔다) */
function withSuggestion(c: KindConfig, s: KindSuggestion): KindConfig {
  if (s.kind === 'habit') return { ...c, kind: 'habit', days: s.days ?? [], perWeek: s.perWeek ?? c.perWeek };
  if (s.kind === 'count') return { ...c, kind: 'count', goal: s.goal, unit: s.unit };
  return { ...c, kind: s.kind };
}

/** 쌓기 숫자 칸에 적힌 글자 그대로(‘1.’ 같은 중간 상태도) */
interface NumTexts {
  goal: string;
  unit: string;
  step: string;
  count: string;
}

function numTexts(c: KindConfig): NumTexts {
  return {
    goal: c.goal ? String(c.goal) : '',
    unit: c.unit ?? '',
    step: c.step && c.step !== 1 ? String(c.step) : '',
    count: c.count ? String(c.count) : '',
  };
}

type NumField = 'goal' | 'step' | 'count';
interface CountIssue {
  field: NumField;
  message: string;
}

/** 쌓기 숫자 검사 — 막히는 첫 문제(없으면 null) */
function countIssueOf(cfg: KindConfig, t: NumTexts): CountIssue | null {
  if (!(cfg.goal && cfg.goal > 0)) return { field: 'goal', message: '목표 숫자를 적어 주세요' };
  if (cfg.goal > MAX_NUM) return { field: 'goal', message: '숫자는 10억까지 적을 수 있어요' };
  const step = parseNum(t.step);
  if (t.step.trim() && !(step != null && step > 0)) return { field: 'step', message: '한 번에 더할 양에는 숫자만 적어 주세요' };
  if (step != null && step > MAX_NUM) return { field: 'step', message: '숫자는 10억까지 적을 수 있어요' };
  const count = parseNum(t.count);
  if (t.count.trim() && count == null) return { field: 'count', message: '지금까지에는 숫자만 적어 주세요' };
  if (count != null && count > MAX_NUM) return { field: 'count', message: '숫자는 10억까지 적을 수 있어요' };
  return null;
}

/** 81칸에서 어떻게 보이는지 한 줄 — 영역 이름·핵심 목표 */
function fitPreview(text: string): string | null {
  const v = text.trim();
  if (!v) return null;
  const fitted = fitLabel(v, CHART_W, CHART_FS);
  if (fitted === v) return '81칸에 다 들어가요';
  const particle = josa(fitted, '으로/로').slice(fitted.length);
  return `81칸에서는 ‘${fitted}’${particle} 보여요 · 6자 안쪽이면 다 보여요`;
}

/** 확인 대화상자 — 웹은 window.confirm, 네이티브는 Alert */
function confirmDiscard(onDiscard: () => void) {
  if (IS_WEB) {
    if (typeof window !== 'undefined' && window.confirm('고친 내용을 버릴까요?')) onDiscard();
    return;
  }
  Alert.alert('고친 내용을 버릴까요?', undefined, [
    { text: '계속 고치기', style: 'cancel' },
    { text: '버리기', style: 'destructive', onPress: onDiscard },
  ]);
}

/** 이 칸의 쓰던 글을 지운다(다른 칸의 것이면 그대로 둔다) — 저장·버리기 때 */
function clearDraft(key: string) {
  AsyncStorage.getItem(EDITOR_DRAFT_KEY)
    .then((raw) => {
      if (raw == null) return;
      const d = parseDraft(raw);
      if (!d || d.key === key) return AsyncStorage.removeItem(EDITOR_DRAFT_KEY);
    })
    .catch(() => {});
}

/** 시트 안에서만 얻을 수 있는 dismiss를 바깥(편집 창)으로 건넨다 */
function DismissBridge({ into }: { into: React.MutableRefObject<SheetDismissFn | null> }) {
  const dismiss = useSheetDismiss();
  useEffect(() => {
    into.current = dismiss;
  }, [dismiss, into]);
  return null;
}

export function CellEditor() {
  const { editor } = useUIState();
  if (!editor) return null;
  // 편집하는 동안 시트는 하나 — 다음 칸으로 넘어가도 다시 그리지 않아 키보드가 그대로 있다
  return <Editor editor={editor} />;
}

function Editor({ editor }: { editor: EditorTarget }) {
  const M = usePalette();
  const { closeEditor, openEditor, showToast } = useUIActions();
  const { doc, setCenterGoal, setThemeTitle, markAreasSet, setActionText, setActionConfig, clearAction } = useMandarat();
  const undoable = useSnapshotUndo();
  const kb = useKeyboardHeight();
  const kbRef = useRef(kb);
  kbRef.current = kb;

  const key = targetKey(editor);
  const m = meta(editor, doc);
  const action = editor.kind === 'action' ? doc.themes[editor.ti].actions[editor.ai] : null;
  const color = editor.kind === 'action' ? doc.themes[editor.ti].color : M.accent;

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<RNTextInput>(null);
  const dismissRef = useRef<SheetDismissFn | null>(null);

  // ── 편집 상태 — 다른 칸으로 넘어가면(같은 시트에서) 그 칸 값으로 새로 ─────────
  const fresh = () => {
    const cfg0: KindConfig = action ? configOf(action) : { kind: 'once' };
    return {
      text: m.initial,
      cfg: cfg0,
      nums: numTexts(cfg0),
      // 새 칸(글도 유형도 없던 칸)은 적는 대로 유형을 맞춰 준다 — 유형을 직접 고르면 그때부터는 그대로 둔다
      autoKind: !!action && !action.text.trim() && action.kind == null,
    };
  };
  const [stateKey, setStateKey] = useState(key);
  const [text, setText] = useState(m.initial);
  const [cfg, setCfg] = useState<KindConfig>(() => fresh().cfg);
  const [nums, setNums] = useState<NumTexts>(() => fresh().nums);
  const [autoKind, setAutoKind] = useState(() => fresh().autoKind);
  const [touched, setTouched] = useState(false);
  const [issue, setIssue] = useState<CountIssue | null>(null);
  const countTouched = useRef(!!fresh().cfg.count);
  // 처음 열 때 글이 있던 실천 칸은 키보드를 바로 올리지 않는다(유형·마감만 고치러 온 경우가 많다)
  const [autoFocus] = useState(() => editor.kind !== 'action' || !m.initial.trim());

  if (stateKey !== key) {
    // 그리는 중에 바로 바꾼다 — 이전 칸의 글이 한 번이라도 새 제목 아래 보이지 않게
    const f = fresh();
    setStateKey(key);
    setText(f.text);
    setCfg(f.cfg);
    setNums(f.nums);
    setAutoKind(f.autoKind);
    setTouched(false);
    setIssue(null);
    countTouched.current = !!f.cfg.count;
  }

  // 다음 칸으로 넘어가면 같은 입력칸에 다시 초점(키보드가 내려가지 않게) + 맨 위로
  const firstKey = useRef(key);
  useEffect(() => {
    if (firstKey.current === key) return;
    firstKey.current = key;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // 웹은 Enter 뒤에 입력칸을 한 번 놓으므로(blur) 그다음에 다시 잡는다
    const t = setTimeout(() => inputRef.current?.focus(), IS_WEB ? 30 : 0);
    return () => clearTimeout(t);
  }, [key]);

  const suggestion = useMemo(() => (action ? suggestKind(text) : null), [action, text]);

  /** 제안(글에서 알아본 유형)을 설정과 숫자 칸에 함께 입힌다 */
  const applySuggestion = useCallback((s: KindSuggestion | null, wasDone: boolean) => {
    setCfg((c) => {
      if (!s) return { ...c, kind: 'once' };
      const n = withSuggestion(c, s);
      // 이미 달성한 칸을 쌓기로 바꾸면 지금까지를 목표만큼 채워 둔다 — 달성이 풀리지 않게
      return wasDone && n.kind === 'count' && !n.count && !countTouched.current ? { ...n, count: n.goal } : n;
    });
    if (s?.kind === 'count') {
      setNums((t) => ({
        ...t,
        goal: s.goal ? String(s.goal) : '',
        unit: s.unit ?? '',
        ...(wasDone && !countTouched.current && s.goal ? { count: String(s.goal) } : {}),
      }));
    }
  }, []);

  useEffect(() => {
    if (!autoKind) return;
    applySuggestion(suggestion, false);
  }, [autoKind, suggestion, applySuggestion]);

  // 이미 있던 칸은 다른 유형으로 읽히면 한 번 물어본다 — 유형을 직접 정해 둔 칸은 글을 고쳤을 때만
  const offerable = !!action && (action.kind == null || text.trim() !== action.text.trim());
  const offer = offerable && !autoKind && !touched && suggestion && !sameConfig(withSuggestion(cfg, suggestion), cfg) ? suggestion : null;

  const toBottom = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: !reducedMotion() }), 60);

  const editCfg = (fn: (c: KindConfig) => KindConfig) => {
    setAutoKind(false);
    setCfg(fn);
  };

  const pickKind = (k: ActionKind) => {
    setAutoKind(false);
    setTouched(true);
    setIssue(null);
    setCfg((c) => ({ ...c, kind: k }));
    toBottom();
  };

  const setNum = (field: keyof NumTexts, t: string) => {
    setNums((n) => ({ ...n, [field]: t }));
    if (issue && issue.field === field) setIssue(null);
    if (field === 'unit') {
      editCfg((c) => ({ ...c, unit: t }));
    } else if (field === 'goal') {
      const g = parseNum(t);
      const fillCount = !!action?.done && !countTouched.current && !!g;
      editCfg((c) => ({ ...c, goal: g, ...(fillCount ? { count: g } : {}) }));
      if (fillCount) setNums((n) => ({ ...n, count: String(g) }));
    } else if (field === 'step') {
      const s = parseNum(t);
      editCfg((c) => ({ ...c, step: s && s > 0 ? s : 1 }));
    } else {
      countTouched.current = true;
      editCfg((c) => ({ ...c, count: parseNum(t) ?? 0 }));
    }
  };

  // ── 저장 ────────────────────────────────────────────────────────────────
  const next = nextTarget(doc, editor);

  /** 바뀐 것만 저장한다. 쌓기 숫자가 막히면 false(창은 그대로) */
  const commit = (): boolean => {
    const v = text.trim();
    if (action && v && cfg.kind === 'count') {
      const found = countIssueOf(cfg, nums);
      if (found) {
        warn();
        setIssue(found);
        announce(found.message);
        toBottom();
        return false;
      }
    }
    tap();
    // 아무것도 안 바꾼 저장이 다른 되돌리기를 막지 않게 — 바뀐 것만
    if (editor.kind === 'center') {
      if (v !== doc.centerGoal) setCenterGoal(v);
    } else if (editor.kind === 'theme') {
      // 기본 이름 그대로 저장해도 '이 영역으로 정했다'는 뜻 — 시작하기의 '영역 8개 정하기'가 끝난다
      if (v !== doc.themes[editor.ti].title) setThemeTitle(editor.ti, v);
      else markAreasSet();
    } else if (action) {
      if (!v) {
        // 칸을 비우면 유형별 값·기록·달성까지 떼어 둔다(다음 실천이 이어받지 않게) — 잠시 되돌릴 수 있다
        if (action.text.trim()) {
          const snapshot = doc;
          clearAction(editor.ti, editor.ai);
          undoable('칸을 비웠어요', snapshot);
        }
      } else {
        if (v !== action.text) setActionText(editor.ti, editor.ai, v);
        setActionConfig(editor.ti, editor.ai, cfg);
      }
    }
    clearDraft(key);
    return true;
  };

  const close = () => {
    const d = dismissRef.current;
    if (d) d(true);
    else closeEditor();
  };

  const saveAndClose = () => {
    if (!commit()) return;
    // 영역의 마지막 빈 칸까지 적었다면 한 번 알려 준다
    if (action && editor.kind === 'action' && !action.text.trim() && text.trim() && next == null) {
      showToast(`${josa(areaName(doc, editor.ti), '은/는')} 실천 8개를 다 적었어요`);
    }
    close();
  };

  // 적혀 있던 칸을 비우는 저장 — '다음 칸'으로 넘어가지 않고 닫는다. 다음 칸을 저장하면 문서가 바뀌어
  // '칸을 비웠어요 · 되돌리기'가 더는 되돌리지 못하므로(useSnapshotUndo), 닫아서 되돌리기를 지켜 준다
  const clearing = !!action && !!action.text.trim() && !text.trim();
  /** 저장하고 다음 칸으로 가는가 — 비우는 저장은 닫는다. 버튼 이름·키보드 리턴 키가 모두 이것을 따른다 */
  const goesNext = !!next && !clearing;

  const saveAndNext = () => {
    if (!next || !goesNext) {
      saveAndClose();
      return;
    }
    if (!commit()) return;
    openEditor(next);
    // 초점은 입력칸에 그대로 있다 — 제목이 바뀐 것을 한 번 읽어 준다
    if (next.kind === 'action') announce(nextCellSpeech(areaName(doc, next.ti), next.ai));
    else if (next.kind === 'theme') announce(`영역 ${next.ti + 1} 이름을 적어요`);
  };

  const clearCell = () => {
    if (editor.kind !== 'action' || !action?.text.trim()) return;
    tap();
    const snapshot = doc;
    clearAction(editor.ti, editor.ai);
    undoable('칸을 비웠어요', snapshot);
    // 칸 비우기도 저장 — 적어 둔 글을 지운다(비운 칸을 다시 열 때 지난 글을 권하지 않게)
    clearDraft(key);
    close();
  };

  // ── 닫기 전 확인 ─────────────────────────────────────────────────────────
  const dirty = text.trim() !== m.initial.trim() || (!!action && !sameConfig(cfg, configOf(action)));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const keyRef = useRef(key);
  keyRef.current = key;
  const guard = useCallback((dismiss: SheetDismissFn) => {
    if (!dirtyRef.current) return true;
    // 쓰던 글이 한 번의 헛손질로 사라지지 않게 — 키보드부터 내리고 묻는다
    if (kbRef.current > 0) Keyboard.dismiss();
    confirmDiscard(() => {
      clearDraft(keyRef.current);
      dismiss(true);
    });
    return false;
  }, []);

  // ── 쓰던 글 — 앱이 뒤로 갈 때 적어 두고(앱이 그대로 끝나도 남게), 같은 칸을 다시 열면 이어서 쓰기를 권한다 ──
  // base: 적어 둘 때 저장돼 있던 글 — 그 사이 칸이 바뀌었으면(비우기·예시·템플릿·백업) 지난 글을 권하지 않는다
  const live = useRef<EditorDraft>({ key, text, cfg, nums, base: m.initial });
  live.current = { key, text, cfg, nums, base: m.initial };
  const stashed = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') {
        if (!dirtyRef.current) return;
        stashed.current = true;
        AsyncStorage.setItem(EDITOR_DRAFT_KEY, serializeDraft(live.current)).catch(() => {});
      } else if (s === 'active' && stashed.current) {
        // 앱이 살아 돌아왔다면 창이 그대로 있다 — 적어 둔 것은 지운다(다시 뒤로 가면 다시 적는다)
        stashed.current = false;
        AsyncStorage.removeItem(EDITOR_DRAFT_KEY).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  const [restore, setRestore] = useState<EditorDraft | null>(null);
  useEffect(() => {
    setRestore(null);
    let alive = true;
    const savedCfg: KindConfig = action ? configOf(action) : { kind: 'once' };
    const savedText = m.initial;
    AsyncStorage.getItem(EDITOR_DRAFT_KEY)
      .then((raw) => {
        const d = parseDraft(raw, key);
        if (alive && d && draftFits(d, savedText) && draftDiffers(d, savedText, savedCfg, sameConfig)) setRestore(d);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 적어 둔 글을 창에 다시 올린다 — 저장은 하지 않는다(고친 상태라 닫을 때 그대로 묻는다) */
  const takeRestore = () => {
    if (!restore) return;
    tap();
    setText(restore.text);
    setCfg(restore.cfg);
    setNums(restore.nums);
    setAutoKind(false);
    setTouched(true);
    setIssue(null);
    countTouched.current = !!restore.cfg.count;
    setRestore(null);
    announce('적던 내용을 다시 올렸어요');
  };
  const dropRestore = () => {
    tap();
    setRestore(null);
    clearDraft(key);
  };

  // ── 그리기 ──────────────────────────────────────────────────────────────
  const emptyAction = !!action && !action.text.trim();
  const help = useMemo(() => {
    if (editor.kind !== 'action' || !emptyAction || text.trim()) return [];
    const theme = doc.themes[editor.ti];
    const taken = new Set(theme.actions.map((a) => a.text.trim()).filter(Boolean));
    return suggestActions(theme.title).filter((s) => !taken.has(s)).slice(0, 3);
  }, [editor, emptyAction, text, doc.themes]);

  const takeHelp = (s: string) => {
    tap();
    setText(s);
    setAutoKind(true);
    inputRef.current?.focus();
  };

  const preview = editor.kind === 'action' ? null : fitPreview(text);
  const filledAction = !!action && !!action.text.trim();

  const footer = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {filledAction && (
        <TextBtn M={M} label="칸 비우기" color={alertInk(M)} onPress={clearCell} />
      )}
      {goesNext && <TextBtn M={M} label="저장" color={M.ink} onPress={saveAndClose} />}
      <PrimaryButton
        M={M}
        label={goesNext ? (editor.kind === 'theme' ? '저장하고 다음 영역' : '저장하고 다음 칸') : '저장'}
        onPress={goesNext ? saveAndNext : saveAndClose}
        style={{ flex: 1 }}
      />
    </View>
  );

  return (
    <Sheet
      M={M}
      ownClose
      maxHeightPct={0.94}
      guard={guard}
      footer={footer}
      // '칸을 비웠어요 · 되돌리기' 같은 알림이 편집 창에 가려지지 않게, 시트 위 어두운 띠에 띄운다
      overlay={<Snackbar placement="top" />}
      onClose={closeEditor}
      scrollRef={scrollRef}
      keyboardDismissMode="on-drag"
    >
      <DismissBridge into={dismissRef} />
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <Text accessibilityRole="header" accessibilityLabel={m.speech} numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }}>
            {m.title}
          </Text>
          <CloseBtn M={M} onPress={() => dismissRef.current?.()} />
        </View>

        {restore && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, borderTopWidth: 1, borderColor: M.line }}>
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: M.ink }} accessibilityLiveRegion="polite">
              적던 내용이 있어요
            </Text>
            <TextBtn M={M} label="버리기" a11y="적던 내용 버리기" color={M.sub} onPress={dropRestore} size={13.5} />
            <TextBtn M={M} label="이어서 쓰기" a11y="적던 내용 이어서 쓰기" color={M.ink} onPress={takeRestore} size={13.5} />
          </View>
        )}

        <View style={{ marginTop: 8, borderTopWidth: 1, borderColor: M.line }}>
          {/* 내용 */}
          <Row M={M} label="내용">
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              accessibilityLabel={m.speech}
              placeholder={m.placeholder}
              placeholderTextColor={M.sub}
              autoFocus={autoFocus}
              multiline={m.multiline}
              maxLength={m.max}
              // 비우는 저장이면 리턴 키도 done(닫기) — '다음'이라고 해 놓고 창을 닫지 않게
              returnKeyType={goesNext ? 'next' : 'done'}
              submitBehavior={goesNext ? 'submit' : 'blurAndSubmit'}
              // 웹(react-native-web)은 submitBehavior를 모른다 — Enter로 보내려면 blurOnSubmit이 있어야 한다
              {...(IS_WEB ? { blurOnSubmit: true } : null)}
              onSubmitEditing={goesNext ? saveAndNext : saveAndClose}
              style={{
                color: M.ink, fontSize: 17, fontWeight: '600', paddingVertical: 14, paddingHorizontal: 0,
                minHeight: ROW_H, textAlignVertical: 'top',
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingBottom: 10 }}>
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: M.sub }} accessibilityLiveRegion="polite">
                {preview ?? ''}
              </Text>
              <Text
                style={{ fontSize: 11, fontWeight: '600', color: text.length >= m.max ? alertInk(M) : M.sub, fontVariant: ['tabular-nums'] }}
                accessibilityLabel={`${m.max}자 중 ${text.length}자`}
              >
                {text.length}/{m.max}
              </Text>
            </View>
            {action && text.trim() ? <View style={{ paddingBottom: 12, marginTop: -6 }}><GuideChips M={M} text={text} /></View> : null}
          </Row>

          {help.length > 0 && (
            <View style={{ borderBottomWidth: 1, borderColor: M.line, paddingTop: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: M.sub, marginBottom: 2 }}>이런 실천은 어때요</Text>
              {help.map((s, i) => (
                <Pressable
                  key={s}
                  onPress={() => takeHelp(s)}
                  accessibilityRole="button"
                  accessibilityLabel={s}
                  accessibilityHint="누르면 내용에 적어요"
                  style={({ pressed }) => ({
                    minHeight: 44, justifyContent: 'center',
                    borderTopWidth: i === 0 ? 0 : 1, borderColor: M.line,
                    opacity: pressed ? 0.55 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: M.ink }} numberOfLines={1}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {action && (
            <KindRows
              key={key}
              M={M}
              color={color}
              cfg={cfg}
              nums={nums}
              setCfg={editCfg}
              setNum={setNum}
              onKind={pickKind}
              auto={autoKind && !!suggestion}
              offer={offer}
              onTakeOffer={() => {
                if (!offer) return;
                tap();
                setTouched(true);
                applySuggestion(offer, !!action.done);
                toBottom();
              }}
              onDismissOffer={() => { tap(); setTouched(true); }}
              issue={issue}
              onFocusBottom={toBottom}
              onReveal={toBottom}
            />
          )}
        </View>
      </View>
    </Sheet>
  );
}

// ── 괘선 줄·글자 버튼 ────────────────────────────────────────────────────────

/**
 * 색인 카드 한 줄 — 왼쪽 64pt 이름 칸 + 내용, 아래 1px 괘선. invalid면 이름과 괘선이 경고 색.
 * stack이면 이름을 위에 두고 내용을 한 줄 너비로(요일 일곱 칸이 손끝 44pt에 가깝게)
 */
function Row({ M, label, children, invalid = false, center = false, stack = false }: {
  M: M; label: string; children: React.ReactNode; invalid?: boolean; center?: boolean; stack?: boolean;
}) {
  const ink = invalid ? alertInk(M) : M.sub;
  if (stack) {
    return (
      <View style={{ minHeight: ROW_H, borderBottomWidth: 1, borderColor: invalid ? alertInk(M) : M.line }}>
        <Text
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={{ paddingTop: 14, fontSize: 12, lineHeight: 16, fontWeight: '700', color: ink }}
        >
          {label}
        </Text>
        {children}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', minHeight: ROW_H, borderBottomWidth: 1, borderColor: invalid ? alertInk(M) : M.line, alignItems: center ? 'center' : 'flex-start' }}>
      <Text
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={{ width: LABEL_W, paddingTop: center ? 0 : 18, paddingRight: 8, fontSize: 12, lineHeight: 16, fontWeight: '700', color: ink }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}

/** 바탕 없는 글자 버튼 — 손끝 44pt */
function TextBtn({ M, label, color, onPress, a11y, size = 14 }: {
  M: M; label: string; color: string; onPress: () => void; a11y?: string; size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <Text style={{ fontSize: size, fontWeight: '700', color }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// ── 유형 고르기 + 유형별 줄 ─────────────────────────────────────────────────────

function KindRows({
  M, color, cfg, nums, setCfg, setNum, onKind, auto, offer, onTakeOffer, onDismissOffer, issue, onFocusBottom, onReveal,
}: {
  M: M;
  color: string;
  cfg: KindConfig;
  nums: NumTexts;
  setCfg: (fn: (c: KindConfig) => KindConfig) => void;
  setNum: (field: keyof NumTexts, t: string) => void;
  onKind: (k: ActionKind) => void;
  /** 글을 보고 유형을 저절로 골라 둔 상태 */
  auto: boolean;
  /** 이미 있던 칸에 제안할 유형 */
  offer: KindSuggestion | null;
  onTakeOffer: () => void;
  onDismissOffer: () => void;
  issue: CountIssue | null;
  onFocusBottom: () => void;
  /** 고른 뒤 아래에 새 줄이 생겼을 때 — 맨 아래까지 보여 준다 */
  onReveal: () => void;
}) {
  return (
    <>
      <Row M={M} label="유형">
        <View style={{ marginTop: 4 }}>
          <SegmentedControl
            M={M}
            variant="underline"
            role="radio"
            value={cfg.kind}
            onChange={onKind}
            options={KIND_ORDER.map((k) => ({ value: k, label: KIND_LABEL[k], a11yLabel: `유형 ${KIND_LABEL[k]}` }))}
          />
        </View>
        <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2, marginBottom: 12 }}>
          {auto ? '글을 보고 골랐어요 · ' : ''}{KIND_HINT[cfg.kind]}
        </Text>
        {offer && (
          <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: M.line, paddingVertical: 2, marginBottom: 4 }}>
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500', color: M.ink }} accessibilityLiveRegion="polite">
              <Text style={{ fontWeight: '800' }}>{offer.label}</Text>
              {josa(offer.label, '으로/로').slice(offer.label.length)} 바꿀까요?
            </Text>
            <TextBtn M={M} label="그대로" a11y="지금 유형 그대로 두기" color={M.sub} onPress={onDismissOffer} size={13.5} />
            <TextBtn M={M} label="바꾸기" a11y={`${josa(offer.label, '으로/로')} 바꾸기`} color={M.ink} onPress={onTakeOffer} size={13.5} />
          </View>
        )}
      </Row>

      {cfg.kind === 'habit' && <HabitRows M={M} color={color} cfg={cfg} setCfg={setCfg} onReveal={onReveal} />}
      {cfg.kind === 'count' && <CountRows M={M} cfg={cfg} nums={nums} setNum={setNum} issue={issue} onFocus={onFocusBottom} />}
      {cfg.kind === 'once' && <DueRows M={M} cfg={cfg} setCfg={setCfg} onReveal={onReveal} />}
    </>
  );
}

function HabitRows({ M, color, cfg, setCfg, onReveal }: {
  M: M; color: string; cfg: KindConfig; setCfg: (fn: (c: KindConfig) => KindConfig) => void; onReveal: () => void;
}) {
  const days = normalizeDays(cfg.days);
  const byWeek = days.length === 0;
  const lastDays = useRef(days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6]);
  if (days.length > 0) lastDays.current = days;
  const n = cfg.perWeek && cfg.perWeek >= 1 && cfg.perWeek <= 6 ? cfg.perWeek : 3;
  const step = (d: number) => setCfg((c) => ({ ...c, perWeek: Math.max(1, Math.min(6, n + d)) }));
  return (
    <>
      <Row M={M} label="반복" stack>
        <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 8 }}>
          <PaperChip M={M} label="요일마다" on={!byWeek} onPress={() => { if (!byWeek) return; tap(); setCfg((c) => ({ ...c, days: lastDays.current })); onReveal(); }} />
          <PaperChip M={M} label="횟수로" on={byWeek} onPress={() => { if (byWeek) return; tap(); setCfg((c) => ({ ...c, days: [], perWeek: n })); onReveal(); }} />
        </View>
      </Row>
      {byWeek ? (
        <Row M={M} label="횟수" center>
          {/* 화면 읽기에서는 한 줄 — 위아래로 쓸어 늘리고 줄인다 */}
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="주간 횟수"
            accessibilityValue={{ text: `주 ${n}회` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              const d = e.nativeEvent.actionName === 'increment' ? 1 : e.nativeEvent.actionName === 'decrement' ? -1 : 0;
              if (!d || (d > 0 && n >= 6) || (d < 0 && n <= 1)) return;
              tap();
              step(d);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
          >
            <StepBtn M={M} icon="minus" label="주 1회 줄이기" disabled={n <= 1} onPress={() => step(-1)} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: M.ink, minWidth: 72, textAlign: 'center', fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">
              주 {n}회
            </Text>
            <StepBtn M={M} icon="plus" label="주 1회 늘리기" disabled={n >= 6} onPress={() => step(1)} />
          </View>
        </Row>
      ) : (
        <Row M={M} label="요일" stack>
          <View style={{ paddingVertical: 10 }}>
            {/* 습관은 요일이 하나는 있어야 한다 — 마지막 요일은 끌 수 없다 */}
            <DayPicker M={M} days={days} color={color} onChange={(d) => { if (d.length > 0) setCfg((c) => ({ ...c, days: d })); }} hideClear />
          </View>
        </Row>
      )}
    </>
  );
}

/** 주 N회 한 단계 — 바탕 없는 44pt 네모 칸(가는 테두리) */
function StepBtn({ M, icon, label, disabled, onPress }: { M: M; icon: 'plus' | 'minus'; label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { if (!disabled) { tap(); onPress(); } }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: M.line,
        alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : pressed ? 0.55 : 1,
      })}
    >
      <Icon name={icon} size={16} color={M.ink} sw={2.2} />
    </Pressable>
  );
}

function NumRow({ M, label, value, onChange, placeholder, keyboard = 'decimal-pad', issue, onFocus, maxLength = 12 }: {
  M: M; label: string; value: string; onChange: (t: string) => void; placeholder?: string;
  keyboard?: 'decimal-pad' | 'default'; issue?: string; onFocus?: () => void; maxLength?: number;
}) {
  return (
    <Row M={M} label={label} invalid={!!issue} center>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={M.sub}
        accessibilityLabel={label}
        accessibilityHint={issue}
        maxLength={maxLength}
        style={{ color: M.ink, fontSize: 16, fontWeight: '600', minHeight: ROW_H, paddingVertical: 12, paddingHorizontal: 0, fontVariant: ['tabular-nums'] }}
      />
    </Row>
  );
}

function CountRows({ M, cfg, nums, setNum, issue, onFocus }: {
  M: M; cfg: KindConfig; nums: NumTexts; setNum: (field: keyof NumTexts, t: string) => void; issue: CountIssue | null; onFocus: () => void;
}) {
  const goalN = cfg.goal ?? 0;
  const left = goalN > 0 ? Math.max(0, goalN - (cfg.count ?? 0)) : 0;
  const msg = issue
    ? issue.message
    : goalN > 0 && goalN <= MAX_NUM
      ? left > 0 ? `${fmtNum(left)}${cfg.unit ?? ''} 남았어요` : '목표에 닿았어요 · 저장하면 달성돼요'
      : null;
  const at = (f: NumField) => (issue?.field === f ? issue.message : undefined);
  return (
    <>
      <NumRow M={M} label="목표" value={nums.goal} onChange={(t) => setNum('goal', t)} placeholder="12" issue={at('goal')} onFocus={onFocus} />
      <NumRow M={M} label="단위" value={nums.unit} onChange={(t) => setNum('unit', t)} placeholder="권·km·만 원" keyboard="default" onFocus={onFocus} maxLength={8} />
      <NumRow M={M} label="한 번에 더할 양" value={nums.step} onChange={(t) => setNum('step', t)} placeholder="1" issue={at('step')} onFocus={onFocus} />
      <NumRow M={M} label="지금까지" value={nums.count} onChange={(t) => setNum('count', t)} placeholder="0" issue={at('count')} onFocus={onFocus} />
      {msg != null && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: 13, lineHeight: 18, marginTop: 10, fontWeight: issue ? '700' : '500', color: issue ? alertInk(M) : M.sub }}
        >
          {msg}
        </Text>
      )}
    </>
  );
}

function DueRows({ M, cfg, setCfg, onReveal }: {
  M: M; cfg: KindConfig; setCfg: (fn: (c: KindConfig) => KindConfig) => void; onReveal: () => void;
}) {
  const now = new Date();
  const today = ymd(now);
  const presets = duePresets(now);
  const due = cfg.due;
  const set = (d: string | undefined) => setCfg((c) => ({ ...c, due: d && d < today ? today : d }));
  const days = due ? daysBetween(today, due) : 0;
  return (
    <>
      <Row M={M} label="마감" center>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 8 }}>
          {presets.map((p) => (
            <PaperChip
              key={p.label}
              M={M}
              label={p.label}
              on={due === p.date}
              // 소리로는 '마감 3개월 뒤, 2027년 1월 14일 목요일' — 점 찍은 짧은 표기('1.14 (목)')는 소수로 읽힌다
              accessibilityLabel={`마감 ${p.label}, ${fmtDateSpeech(p.date, now)}`}
              onPress={() => { tap(); set(p.date); onReveal(); }}
            />
          ))}
        </View>
      </Row>
      {due ? (
        <Row M={M} label="날짜">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{ flex: 1, fontSize: 15, fontWeight: '700', color: M.ink, paddingVertical: 15, fontVariant: ['tabular-nums'] }}
              accessibilityLiveRegion="polite"
              accessibilityLabel={`${fmtDateSpeech(due, now)}, ${dueSpeech(days)}`}
            >
              {fmtDateLong(due)} · {fmtDue(days, 'long')}
            </Text>
            <TextBtn M={M} label="마감 없애기" color={M.sub} size={12.5} onPress={() => { tap(); set(undefined); }} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 10 }}>
            {([[-7, '−1주', '마감 1주 앞당기기'], [-1, '−1일', '마감 하루 앞당기기'], [1, '+1일', '마감 하루 미루기'], [7, '+1주', '마감 1주 미루기']] as const).map(([d, t, a11y]) => (
              <PaperChip key={t} M={M} label={t} accessibilityLabel={a11y} onPress={() => { tap(); set(addDays(due, d)); }} />
            ))}
          </View>
        </Row>
      ) : (
        <Row M={M} label="날짜" center>
          <Text style={{ fontSize: 15, fontWeight: '500', color: M.sub }}>마감 없음</Text>
        </Row>
      )}
    </>
  );
}
