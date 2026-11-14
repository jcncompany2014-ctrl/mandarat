import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Keyboard, Linking, Platform, Pressable, ScrollView, View, type TextInput as RNTextInput, type TextStyle, type ViewStyle } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, a11yLangProp } from '../components/AppText';
import { Icon } from '../components/Icon';
import {
  Button, QuietAction, Sheet, SheetHeader, useKeyboardHeight, useSheetDismiss, type SheetDismissFn,
} from '../components/common';
import { ChoiceRow, Field, Row, SECTION, Segment, hitFor } from '../components/kit';
import { Locator } from '../components/chart';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { GEO } from '../theme/tokens';
import { NUM, ROLE } from '../theme/type';
import { PRETENDARD } from '../theme/fonts';
import { useUIActions, useUIState, type EditorTarget } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import type { ActionKind, MandaratDoc } from '../types';
import { tap, warn } from '../lib/haptics';
import { GuideChips } from '../components/GuideChips';
import { daysBetween, normalizeDays, ymd } from '../lib/routine';
import {
  KIND_LABEL, MAX_NUM, addDays, configOf, duePresets, parseNum, sameConfig, type KindConfig,
} from '../lib/kinds';
import { fmtDateLong, fmtDateSpeech, fmtDue } from '../lib/text';
import { suggestActions } from '../lib/suggest';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
import { suggestKind, type KindSuggestion } from '../lib/kindSuggest';
import { announce, reducedMotion } from '../lib/useReducedMotion';
import { cellTitleSpeech, dueSpeech, nextCellSpeech } from '../lib/sheetSpeech';
import { EDITOR_DRAFT_KEY, draftDiffers, draftFits, parseDraft, serializeDraft, type EditorDraft } from '../lib/editorDraft';
import { Snackbar } from './Snackbar';
import { DayPicker, DayPresets } from '../components/DayPicker';
import { CLOCKWISE, chartFitHint } from '../theme/chart';
import { RemindRow, timeToMin } from '../components/RemindRow';
import { useMsg } from '../i18n/react';
import { msg } from '../i18n';
import { notifier } from '../lib/notifier';
import { writeNotifyDevice } from '../lib/notifyPrefs';
import { TID } from '../lib/testIds';

const KIND_ORDER: ActionKind[] = ['once', 'habit', 'count', 'mind'];

const IS_WEB = Platform.OS === 'web';

/** 습관 알림을 처음 정할 때의 시각 */
const HABIT_REMIND_DEFAULT = '08:00';

/**
 * 편집 시트의 박자(editor.png · parts-sheets.css) — 머리 아래 입력 칸 6, 무리(유형 · 반복 · 알림) 사이 24,
 * 무리 이름 아래 8, 안내 위 8, 분절 선택기와 요일 칸 사이 12, 숫자 칸 두 줄 사이 16 · 두 칸 사이 12,
 * 본문 끝 12(+ 바닥 줄 위 12 = 24), 바닥 줄 낱말 사이 24.
 */
const SP = { field: 6, group: 24, label: 8, note: 8, under: 12, pair: 16, pairGap: 12, end: 12, foot: 24 } as const;

/** 무리 이름 — 입력 칸의 이름처럼 label 600 13/18 print(목업 .s-group .t-label:first-child) */
const GROUP_LABEL: TextStyle = { ...ROLE.label, fontFamily: PRETENDARD[600] };

/** 18 높이의 무리 이름 줄 안의 조용한 글 — 손끝은 44(위아래로 넘쳐 눌린다) */
const IN_LABEL_ROW: ViewStyle = { marginVertical: -hitFor(SECTION.h) };

/** 단계 칸(주 N회) — 받침 위 바탕 없는 글리프 44, 가운데 글의 최소 폭('Once a week'가 흔들리지 않게) */
const STEP = { hit: 44, glyph: 16, valueW: 96 } as const;

/** 잘못 적은 숫자 칸 — 먹 테두리 1.5(색이 아니라 테 두께로 알린다) */
const INVALID_RING = 1.5;

function meta(target: EditorTarget, doc: MandaratDoc) {
  const t = msg().editor;
  if (target.kind === 'center') {
    return { title: t.centerTitle, speech: t.centerTitle, placeholder: t.centerPlaceholder, initial: doc.centerGoal, multiline: true, max: 40 };
  }
  const theme = doc.themes[target.ti];
  if (target.kind === 'theme') {
    const title = t.themeTitle({ n: target.ti + 1 });
    return { title, speech: title, placeholder: t.themePlaceholder, initial: theme.title, multiline: false, max: 18 };
  }
  const list = suggestActions(theme.title);
  return {
    title: t.actionTitle({ area: areaName(doc, target.ti), n: target.ai + 1 }),
    // '3/8'은 날짜로 읽힌다 — 소리로는 '건강 영역, 8칸 중 세 번째 칸'(차트 칸과 같은 우리말 서수)
    speech: cellTitleSpeech(areaName(doc, target.ti), target.ai),
    placeholder: t.example({ text: list[target.ai % list.length] }),
    initial: theme.actions[target.ai].text,
    multiline: true,
    max: 60,
  };
}

function areaName(doc: MandaratDoc, ti: number): string {
  return doc.themes[ti].title.trim() || msg().editor.areaN({ n: ti + 1 });
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
  const e = msg().editor;
  if (!(cfg.goal && cfg.goal > 0)) return { field: 'goal', message: e.needGoal };
  if (cfg.goal > MAX_NUM) return { field: 'goal', message: e.tooBig };
  const step = parseNum(t.step);
  if (t.step.trim() && !(step != null && step > 0)) return { field: 'step', message: e.stepNumbers };
  if (step != null && step > MAX_NUM) return { field: 'step', message: e.tooBig };
  const count = parseNum(t.count);
  if (t.count.trim() && count == null) return { field: 'count', message: e.sofarNumbers };
  if (count != null && count > MAX_NUM) return { field: 'count', message: e.tooBig };
  return null;
}

/** 확인 대화상자 — 웹은 window.confirm, 네이티브는 Alert */
function confirmDiscard(onDiscard: () => void) {
  const e = msg().editor;
  if (IS_WEB) {
    if (typeof window !== 'undefined' && window.confirm(e.discardAsk)) onDiscard();
    return;
  }
  Alert.alert(e.discardAsk, undefined, [
    { text: e.keepEditing, style: 'cancel' },
    { text: e.discard, style: 'destructive', onPress: onDiscard },
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

/**
 * 칸 편집(editor.png) — 떠 있는 시트 한 장: 머리(위치 표 · 영역 · 실천 3/8 · 닫기), 입력 칸(글자 수) + 안내,
 * 유형(분절 선택기) + 한 줄 안내, 그 유형에 필요한 무리만 펼친다(습관: 반복 · 알림, 한 번: 마감, 쌓기: 숫자 칸).
 * 고르기는 세 가지뿐 — 분절 선택기(유형 · 반복 · 마감), 요일 칸, 고르기 줄(알림). 색은 이 영역의 색(표시 · 위치 표)뿐.
 * 바닥: 조용한 글(칸 비우기 · 저장) + 먹 주 단추 하나. 핵심 목표 · 영역 이름은 같은 시트에 입력 칸만.
 */
function Editor({ editor }: { editor: EditorTarget }) {
  const M = usePalette();
  const ed = useMsg().editor;
  const { width: winW } = useWindowDimensions();
  const { closeEditor, openEditor, showToast } = useUIActions();
  const { doc, setCenterGoal, setThemeTitle, markAreasSet, setActionText, setActionConfig, clearAction } = useMandarat();
  const undoable = useSnapshotUndo();
  const kb = useKeyboardHeight();
  const kbRef = useRef(kb);
  kbRef.current = kb;

  const key = targetKey(editor);
  const m = meta(editor, doc);
  const action = editor.kind === 'action' ? doc.themes[editor.ti].actions[editor.ai] : null;

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
          undoable(ed.cleared, snapshot);
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
      showToast(ed.allWritten({ area: areaName(doc, editor.ti) }));
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
    else if (next.kind === 'theme') announce(ed.nextTheme({ n: next.ti + 1 }));
  };

  const clearCell = () => {
    if (editor.kind !== 'action' || !action?.text.trim()) return;
    tap();
    const snapshot = doc;
    clearAction(editor.ti, editor.ai);
    undoable(ed.cleared, snapshot);
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
    announce(ed.draftRestored);
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

  // 81칸에 어떻게 보이는지 — 이 기기의 실제 칸 폭으로(머리 칸 3줄 · 가운데 칸 3줄까지 보인다)
  const preview = editor.kind === 'action' ? null : chartFitHint(text, editor.kind, winW);
  const filledAction = !!action && !!action.text.trim();

  // 바닥 — 조용한 글(칸 비우기 · 저장하고 닫기) + 먹 주 단추 하나
  const footer = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.foot }}>
      {filledAction && <QuietAction M={M} foot label={ed.clearCell} onPress={clearCell} />}
      {goesNext && <QuietAction M={M} foot label={ed.save} onPress={saveAndClose} />}
      <Button
        M={M}
        label={goesNext ? (editor.kind === 'theme' ? ed.saveNextArea : ed.saveNextCell) : ed.save}
        onPress={goesNext ? saveAndNext : saveAndClose}
        style={{ flex: 1 }}
        testID={TID.editorSave}
      />
    </View>
  );

  return (
    <Sheet
      M={M}
      pad
      ownClose
      header={<EditorHead M={M} editor={editor} doc={doc} speech={m.speech} />}
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
      <View style={{ paddingTop: SP.field, paddingBottom: SP.end }}>
        {restore && (
          <AskLine
            M={M}
            style={{ marginBottom: SP.label }}
            text={ed.draftFound}
            actions={[
              { label: ed.discard, a11y: ed.draftDiscardA11y, onPress: dropRestore },
              { label: ed.draftResume, a11y: ed.draftResumeA11y, onPress: takeRestore },
            ]}
          />
        )}

        <Field
          ref={inputRef}
          M={M}
          testID={TID.editorText}
          value={text}
          onChangeText={setText}
          count={`${text.length}/${m.max}`}
          accessibilityLabel={m.speech}
          accessibilityHint={ed.charCount({ n: text.length, max: m.max })}
          // 아래에 고를 실천이 나오면 그중 하나를 예로 다시 들지 않는다
          placeholder={help.length > 0 ? ed.helpPlaceholder : m.placeholder}
          autoFocus={autoFocus}
          multiline={m.multiline}
          maxLength={m.max}
          // 비우는 저장이면 리턴 키도 done(닫기) — '다음'이라고 해 놓고 창을 닫지 않게
          returnKeyType={goesNext ? 'next' : 'done'}
          submitBehavior={goesNext ? 'submit' : 'blurAndSubmit'}
          // 웹(react-native-web)은 submitBehavior를 모른다 — Enter로 보내려면 blurOnSubmit이 있어야 한다
          {...(IS_WEB ? { blurOnSubmit: true } : null)}
          onSubmitEditing={goesNext ? saveAndNext : saveAndClose}
        />
        {action ? <GuideChips M={M} text={text} /> : preview ? <Note M={M} text={preview} live /> : null}

        {help.length > 0 && (
          <Group M={M} label={ed.helpTitle}>
            <View>
              {help.map((s, i) => (
                <Row key={s} M={M} bare title={s} divider={i > 0} onPress={() => takeHelp(s)} accessibilityHint={ed.helpHint} />
              ))}
            </View>
          </Group>
        )}

        {action && (
          <KindRows
            key={key}
            M={M}
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
    </Sheet>
  );
}

// ── 머리 · 무리 · 안내 ──────────────────────────────────────────────────────────

/**
 * 시트 머리(S.head, common SheetHeader) — 위치 표(이 칸에 먹 테두리) + 인쇄된 두 줄(■ 영역 · 실천 3/8) + 닫기(×, 44).
 * 핵심 목표는 가운데 블록의 위치 표 + '핵심 목표' 한 줄. 화면 읽기에서는 한 덩어리의 머리 —
 * '3/8'은 날짜로 읽히므로 소리는 '건강 영역, 8칸 중 세 번째 칸'(meta().speech).
 */
function EditorHead({ M, editor, doc, speech }: { M: M; editor: EditorTarget; doc: MandaratDoc; speech: string }) {
  const ed = useMsg().editor;
  const ti = editor.kind === 'center' ? null : editor.ti;
  const title = editor.kind === 'center' ? ed.centerTitle : areaName(doc, editor.ti);
  const sub = editor.kind === 'action' ? ed.actionN({ n: editor.ai + 1 }) : editor.kind === 'theme' ? ed.themeSub : '';
  return (
    <SheetHeader
      M={M}
      leading={<Locator themes={doc.themes} block={ti ?? 'core'} at={editor.kind === 'action' ? editor.ai : 'head'} />}
      title={title}
      area={ti ?? undefined}
      sub={sub}
      accessibilityLabel={speech}
      closeTestID={TID.editorClose}
    />
  );
}

/** 무리(.s-group) — 위 24, 인쇄된 이름(label 600) 줄 18 + 오른쪽 하나(조용한 글), 아래 8. 선 없이 빈자리로 나눈다 */
function Group({ M, label, right, children }: { M: M; label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: SP.group }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.pairGap, minHeight: SECTION.h, marginBottom: SP.label }}>
        <Text accessibilityRole="header" style={[GROUP_LABEL, { color: M.print, flexShrink: 1 }]} numberOfLines={1}>{label}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** 인쇄된 안내 한 줄(시트 안내 400 13/18 print) — strong이면 먹 600(막힌 숫자처럼 꼭 읽어야 할 말) */
function Note({ M, text, live = false, strong = false }: { M: M; text: string; live?: boolean; strong?: boolean }) {
  return (
    <Text
      accessibilityLiveRegion={live ? 'polite' : undefined}
      style={[ROLE.noteSheet, { marginTop: SP.note, color: strong ? M.ink : M.print }, strong ? { fontFamily: PRETENDARD[600] } : null]}
    >
      {text}
    </Text>
  );
}

/** 묻는 줄 — 먹 글 한 줄 + 조용한 글 동작 하나 둘(이어서 쓰기 · 유형 바꾸기 · 설정 열기) */
function AskLine({ M, text, children, actions, style }: {
  M: M;
  text?: string;
  children?: React.ReactNode;
  actions: { label: string; a11y?: string; onPress: () => void }[];
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SP.pairGap }, style]}>
      <Text style={[ROLE.label, { flex: 1, color: M.ink }]} accessibilityLiveRegion="polite">
        {children ?? text}
      </Text>
      {actions.map((a) => (
        <QuietAction key={a.label} M={M} label={a.label} accessibilityLabel={a.a11y} onPress={a.onPress} />
      ))}
    </View>
  );
}

// ── 유형 고르기 + 유형별 무리 ─────────────────────────────────────────────────────

function KindRows({
  M, cfg, nums, setCfg, setNum, onKind, auto, offer, onTakeOffer, onDismissOffer, issue, onFocusBottom, onReveal,
}: {
  M: M;
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
  const ed = useMsg().editor;
  const note = cfg.kind === 'habit'
    ? (normalizeDays(cfg.days).length === 0 ? ed.noteHabitWeek : ed.noteHabitDays)
    : cfg.kind === 'once' ? ed.noteOnce : cfg.kind === 'count' ? ed.noteCount : ed.noteMind;
  return (
    <>
      <Group M={M} label={ed.kindLabel}>
        <Segment
          M={M}
          role="radio"
          value={cfg.kind}
          onChange={onKind}
          options={KIND_ORDER.map((k) => ({ value: k, label: KIND_LABEL[k], a11yLabel: ed.kindA11y({ label: KIND_LABEL[k] }), testID: TID.editorKind(k) }))}
          accessibilityLabel={ed.kindLabel}
        />
        <Note M={M} text={`${auto ? ed.autoPicked : ''}${note}`} />
        {offer && (
          <AskLine
            M={M}
            style={{ marginTop: SP.note }}
            actions={[
              { label: ed.offerKeep, a11y: ed.offerKeepA11y, onPress: onDismissOffer },
              { label: ed.offerTake, a11y: ed.offerTakeA11y({ label: offer.label }), onPress: onTakeOffer },
            ]}
          >
            {ed.offerBefore}<Text style={{ fontFamily: PRETENDARD[700] }}>{offer.label}</Text>
            {ed.offerAfter({ label: offer.label })}
          </AskLine>
        )}
      </Group>

      {cfg.kind === 'habit' && <HabitRows M={M} cfg={cfg} setCfg={setCfg} onReveal={onReveal} />}
      {cfg.kind === 'count' && <CountRows M={M} cfg={cfg} nums={nums} setNum={setNum} issue={issue} onFocus={onFocusBottom} />}
      {cfg.kind === 'once' && <DueRows M={M} cfg={cfg} setCfg={setCfg} onReveal={onReveal} />}
    </>
  );
}

/** 반복 — 매일 · 평일 · 주말(조용한 글) · 요일마다 / 횟수로(분절 선택기) · 요일 칸 또는 주 N회. 그리고 알림 */
function HabitRows({ M, cfg, setCfg, onReveal }: {
  M: M; cfg: KindConfig; setCfg: (fn: (c: KindConfig) => KindConfig) => void; onReveal: () => void;
}) {
  const ed = useMsg().editor;
  const days = normalizeDays(cfg.days);
  const byWeek = days.length === 0;
  const lastDays = useRef(days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6]);
  if (days.length > 0) lastDays.current = days;
  const n = cfg.perWeek && cfg.perWeek >= 1 && cfg.perWeek <= 6 ? cfg.perWeek : 3;
  const step = (d: number) => setCfg((c) => ({ ...c, perWeek: Math.max(1, Math.min(6, n + d)) }));
  const pickMode = (mode: 'days' | 'week') => {
    if (mode === 'days') {
      if (!byWeek) return;
      setCfg((c) => ({ ...c, days: lastDays.current }));
    } else {
      if (byWeek) return;
      setCfg((c) => ({ ...c, days: [], perWeek: n }));
    }
    onReveal();
  };
  return (
    <>
      <Group
        M={M}
        label={ed.repeat}
        right={<DayPresets M={M} onPick={(p) => { setCfg((c) => ({ ...c, days: p })); onReveal(); }} />}
      >
        <Segment
          M={M}
          role="radio"
          value={byWeek ? 'week' : 'days'}
          onChange={pickMode}
          options={[{ value: 'days', label: ed.byDays }, { value: 'week', label: ed.byCount }]}
          accessibilityLabel={ed.repeat}
        />
        <View style={{ marginTop: SP.under }}>
          {byWeek ? (
            // 화면 읽기에서는 한 줄 — 위아래로 쓸어 늘리고 줄인다
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={ed.perWeekA11y}
              {...a11yLangProp()}
              accessibilityValue={{ text: ed.perWeekSay({ n }) }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => {
                const d = e.nativeEvent.actionName === 'increment' ? 1 : e.nativeEvent.actionName === 'decrement' ? -1 : 0;
                if (!d || (d > 0 && n >= 6) || (d < 0 && n <= 1)) return;
                tap();
                step(d);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: GEO.rField, backgroundColor: M.tile }}
            >
              <StepBtn M={M} icon="minus" label={ed.perWeekLess} disabled={n <= 1} onPress={() => step(-1)} />
              <Text style={[ROLE.rowTitle, NUM, { color: M.ink, minWidth: STEP.valueW, textAlign: 'center' }]} accessibilityLiveRegion="polite" numberOfLines={1}>
                {ed.perWeek({ n })}
              </Text>
              <StepBtn M={M} icon="plus" label={ed.perWeekMore} disabled={n >= 6} onPress={() => step(1)} />
            </View>
          ) : (
            // 습관은 요일이 하나는 있어야 한다 — 마지막 요일은 끌 수 없다
            <DayPicker M={M} days={days} keepOne onChange={(d) => { if (d.length > 0) setCfg((c) => ({ ...c, days: d })); }} />
          )}
        </View>
      </Group>
      <RemindRows M={M} cfg={cfg} setCfg={setCfg} onReveal={onReveal} />
    </>
  );
}

/** 습관 알림 — '없음' / '시각 정하기' 고르기 줄 두 개와, 고르면 10분씩 바꾸는 시각 줄. 저장은 편집 창의 저장(remindAt)과 함께 */
function RemindRows({ M, cfg, setCfg, onReveal }: {
  M: M; cfg: KindConfig; setCfg: (fn: (c: KindConfig) => KindConfig) => void; onReveal: () => void;
}) {
  const t = useMsg();
  const on = !!cfg.remindAt;
  // 껐다가 다시 고르면 이번에 쓰던 시각으로
  const last = useRef(cfg.remindAt ?? HABIT_REMIND_DEFAULT);
  if (cfg.remindAt) last.current = cfg.remindAt;
  const [refused, setRefused] = useState(false);

  /** 누를 때만 — 처음이면 허락을 묻고, 받으면 이 기기를 켠다. 알림이 없는 웹은 시각만 적어 둔다(아이폰에서 울린다) */
  const onPickTime = async () => {
    if (on) return;
    tap();
    if (notifier.supported) {
      let s = await notifier.status();
      if (s === 'undetermined') s = await notifier.request();
      if (s !== 'granted') {
        if (s === 'denied') {
          setRefused(true);
          announce(t.notify.denied);
        }
        return;
      }
      setRefused(false);
      await writeNotifyDevice(true);
    }
    setCfg((c) => ({ ...c, remindAt: last.current }));
    onReveal();
  };

  const onPickNone = () => {
    if (!on) return;
    tap();
    setRefused(false);
    setCfg((c) => ({ ...c, remindAt: undefined }));
  };

  // 고른 줄의 정보 — '오후 10:30 · 정한 요일마다'
  const at = timeToMin(cfg.remindAt ?? '');
  const when = normalizeDays(cfg.days).length === 0 ? t.editor.remindWeek : t.editor.remindDays;
  const pickMeta = on ? `${t.fmt.time({ h: Math.floor(at / 60), m: at % 60 })}${t.core.dot}${when}` : undefined;

  return (
    <Group M={M} label={t.notify.sectionTitle}>
      <View accessibilityRole="radiogroup">
        <ChoiceRow M={M} title={t.notify.editorNone} accessibilityLabel={t.notify.editorNoneA11y} on={!on} onPress={onPickNone} />
        <ChoiceRow
          M={M}
          divider
          title={t.notify.editorPick}
          meta={pickMeta}
          accessibilityLabel={pickMeta ? `${t.notify.editorPickA11y}${t.core.listSep}${pickMeta}` : t.notify.editorPickA11y}
          on={on}
          onPress={() => { void onPickTime(); }}
        />
      </View>
      {on && cfg.remindAt && (
        <View style={{ marginTop: SP.note }}>
          <RemindRow M={M} value={cfg.remindAt} onChange={(v) => setCfg((c) => ({ ...c, remindAt: v }))} label={t.notify.habitTime} testID={TID.editorRemind} />
          {!notifier.supported && <Note M={M} text={t.common.iosOnly} />}
        </View>
      )}
      {refused && !on && (
        <AskLine
          M={M}
          style={{ marginTop: SP.note }}
          text={t.notify.denied}
          actions={[{ label: t.common.openSettings, onPress: () => { void Linking.openSettings(); } }]}
        />
      )}
    </Group>
  );
}

/** 주 N회 한 단계 — 받침 위 바탕 없는 글리프(먹 16), 손끝 44. 끝에 닿으면 글리프가 흐려진다(ink3) */
function StepBtn({ M, icon, label, disabled, onPress }: { M: M; icon: 'plus' | 'minus'; label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { if (!disabled) { tap(); onPress(); } }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...a11yLangProp()}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({ width: STEP.hit, height: STEP.hit, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <Icon name={icon} size={STEP.glyph} color={disabled ? M.ink3 : M.ink} />
    </Pressable>
  );
}

/** 쌓기 숫자 칸 하나 — 인쇄된 이름(위) + 한 줄 칸(tile 54). 막힌 칸은 먹 테 1.5 */
function NumField({ M, label, value, onChange, placeholder, keyboard = 'decimal-pad', issue, onFocus, maxLength = 12 }: {
  M: M; label: string; value: string; onChange: (t: string) => void; placeholder?: string;
  keyboard?: 'decimal-pad' | 'default'; issue?: string; onFocus?: () => void; maxLength?: number;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={[GROUP_LABEL, { color: issue ? M.ink : M.print, marginBottom: SP.label }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Field
        M={M}
        variant="small"
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        keyboardType={keyboard}
        placeholder={placeholder}
        accessibilityLabel={label}
        accessibilityHint={issue}
        maxLength={maxLength}
        inputStyle={keyboard === 'decimal-pad' ? NUM : undefined}
        style={{ borderWidth: INVALID_RING, borderColor: issue ? M.ink : 'transparent' }}
      />
    </View>
  );
}

/** 쌓기 — 목표 · 단위 / 한 번에 더할 양 · 지금까지(두 칸씩 두 줄) + 남은 양 또는 막힌 까닭 한 줄 */
function CountRows({ M, cfg, nums, setNum, issue, onFocus }: {
  M: M; cfg: KindConfig; nums: NumTexts; setNum: (field: keyof NumTexts, t: string) => void; issue: CountIssue | null; onFocus: () => void;
}) {
  const ed = useMsg().editor;
  const goalN = cfg.goal ?? 0;
  const left = goalN > 0 ? Math.max(0, goalN - (cfg.count ?? 0)) : 0;
  const note = issue
    ? issue.message
    : goalN > 0 && goalN <= MAX_NUM
      ? left > 0 ? ed.left({ n: left, unit: cfg.unit ?? '' }) : ed.reached
      : null;
  const at = (f: NumField) => (issue?.field === f ? issue.message : undefined);
  const pair = { flexDirection: 'row', gap: SP.pairGap } as const;
  return (
    <View style={{ marginTop: SP.group, gap: SP.pair }}>
      <View style={pair}>
        <NumField M={M} label={ed.goal} value={nums.goal} onChange={(t) => setNum('goal', t)} placeholder="12" issue={at('goal')} onFocus={onFocus} />
        <NumField M={M} label={ed.unit} value={nums.unit} onChange={(t) => setNum('unit', t)} placeholder={ed.unitPlaceholder} keyboard="default" onFocus={onFocus} maxLength={8} />
      </View>
      <View style={pair}>
        <NumField M={M} label={ed.step} value={nums.step} onChange={(t) => setNum('step', t)} placeholder="1" issue={at('step')} onFocus={onFocus} />
        <NumField M={M} label={ed.sofar} value={nums.count} onChange={(t) => setNum('count', t)} placeholder="0" issue={at('count')} onFocus={onFocus} />
      </View>
      {note != null && <Note M={M} text={note} live strong={!!issue} />}
    </View>
  );
}

/** 마감 — 빠른 고르기(분절 선택기: 이번 주 · 이번 달 · 3개월 뒤 · 올해 안) + 정한 날짜 한 줄과 하루 · 한 주 당기기/미루기 */
function DueRows({ M, cfg, setCfg, onReveal }: {
  M: M; cfg: KindConfig; setCfg: (fn: (c: KindConfig) => KindConfig) => void; onReveal: () => void;
}) {
  const { editor: ed, core, kinds } = useMsg();
  const now = new Date();
  const today = ymd(now);
  const presets = duePresets(now);
  // 네 칸에 들어가는 짧은 이름(영어 'In 3 months'는 375 폭의 한 칸을 넘는다) — 읽는 말은 긴 이름 그대로
  const short: Record<string, string> = {
    [kinds.presetWeek]: ed.dueWeek, [kinds.presetMonth]: ed.dueMonth, [kinds.preset3Months]: ed.due3Months, [kinds.presetYear]: ed.dueYear,
  };
  const due = cfg.due;
  const set = (d: string | undefined) => setCfg((c) => ({ ...c, due: d && d < today ? today : d }));
  const days = due ? daysBetween(today, due) : 0;
  return (
    <Group
      M={M}
      label={ed.due}
      right={due ? <QuietAction M={M} label={ed.dueClear} onPress={() => { tap(); set(undefined); }} style={IN_LABEL_ROW} /> : null}
    >
      {/* 고른 날짜가 빠른 고르기의 날짜와 같을 때만 그 칸이 먹 — 하루씩 옮기면 아무 칸도 고르지 않은 모습 */}
      <Segment
        M={M}
        role="radio"
        value={due ?? ''}
        onChange={(d) => { set(d); onReveal(); }}
        options={presets.map((p) => ({
          value: p.date,
          label: short[p.label] ?? p.label,
          // 소리로는 '마감 3개월 뒤, 2027년 1월 14일 목요일' — 점 찍은 짧은 표기('1.14 (목)')는 소수로 읽힌다
          a11yLabel: ed.dueChipA11y({ label: p.label, date: fmtDateSpeech(p.date, now) }),
        }))}
        accessibilityLabel={ed.due}
      />
      {due ? (
        <View style={{ marginTop: SP.under }}>
          <Text
            style={[ROLE.rowTitle, NUM, { color: M.ink }]}
            accessibilityLiveRegion="polite"
            accessibilityLabel={ed.dueA11y({ date: fmtDateSpeech(due, now), left: dueSpeech(days) })}
          >
            {`${fmtDateLong(due)}${core.dot}${fmtDue(days, 'long')}`}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: SP.foot }}>
            {([[-7, ed.weekEarlier, ed.weekEarlierA11y], [-1, ed.dayEarlier, ed.dayEarlierA11y], [1, ed.dayLater, ed.dayLaterA11y], [7, ed.weekLater, ed.weekLaterA11y]] as const).map(([d, t, a11y]) => (
              <QuietAction key={t} M={M} label={t} accessibilityLabel={a11y} onPress={() => { tap(); set(addDays(due, d)); }} />
            ))}
          </View>
        </View>
      ) : (
        <Note M={M} text={ed.noDue} />
      )}
    </Group>
  );
}
