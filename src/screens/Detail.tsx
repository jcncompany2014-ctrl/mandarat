import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { Text } from '../components/AppText';
import { Header, RowDivider, groupEdge, pressedRow } from '../components/common';
import { Check, checkEdge } from '../components/Check';
import { ChartBoard } from '../components/ChartBoard';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { alertInk } from '../components/KindBits';
import { NUM, RHYTHM, TYPE } from '../theme/type';
import { legibleMark } from '../theme/chart';
import { usePalette, type M as Palette } from '../theme/usePalette';
import { useUIActions } from '../navigation/ui';
import { useActions, useDoc, dateKey, themeProgress, themeStreak } from '../store/MandaratContext';
import { tap, check as checkHaptic, uncheck as uncheckHaptic } from '../lib/haptics';
import { kindLine, type KindLine } from '../lib/kinds';
import { kindOf } from '../lib/routine';
import { announce, screenReader, useIncreaseContrast } from '../lib/useReducedMotion';
import { areaTitle, neighborArea, pageSpeech, rowStatus } from '../lib/areaPage';
import type { Action } from '../types';

/**
 * 줄의 화면 읽기 이름 — '하루 물 2L, 달성, 매일 반복' · '책 읽기, 12권 중 6권'.
 * areaPage.rowLabel과 같은 말이되 유형 줄은 소리 말(KindLine.speech) — '6/12권'·'D-3'을 날짜·글자로 읽지 않게.
 */
function rowSpeech(a: Action, ai: number, line: KindLine | null): string {
  if (!a.text.trim()) return `실천 ${ai + 1} 채우기`;
  return `${a.text.trim()}${a.done ? ', 달성' : ''}${line ? `, ${line.speech}` : ''}`;
}

/** 왼쪽 표시(체크 칸·상태 네모) 한 변 */
const MARK = 22;
/** 왼쪽 가장자리 쓸기는 Root의 '뒤로'가 받는다 — 이 안에서 시작한 쓸기로는 영역을 넘기지 않는다 */
const EDGE = 28;

/**
 * 이전·다음 버튼(또는 쓸기)으로 넘겨 온 영역 — 다음 영역 화면이 그려질 때 한 번 읽어 준다.
 * Root가 영역마다 이 화면을 새로 그리므로(key = ti) 화면 밖에 둔다.
 */
let pagedTo: number | null = null;

/**
 * 영역 화면 — 이 영역에서 무엇을 얼마나 달성했는지 보는 곳.
 * 보드와 목록은 습관·쌓기·마음가짐을 체크하지 않는다(하루 체크는 오늘·홈·실천 시트에서).
 * 목록에서 바로 바꿀 수 있는 건 '한 번' 실천의 달성뿐이다.
 */
export const Detail = memo(function Detail({ ti }: { ti: number }) {
  const M = usePalette();
  const { doc } = useDoc();
  const { toggleDone } = useActions();
  const { go, back, openAction, openEditor } = useUIActions();
  const th = doc.themes[ti];
  const p = themeProgress(th);
  // 영역 연속 기록은 기록 전체를 한 번 훑는다 — 기록(dayLog)이나 날짜가 바뀔 때만 다시 센다
  const day = dateKey();
  const streak = useMemo(() => themeStreak(doc, ti), [doc.dayLog, ti, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const now = new Date();
  const title = areaTitle(doc, ti);
  const prevTi = neighborArea(ti, -1);
  const nextTi = neighborArea(ti, 1);

  // 넘겨 온 영역이면 제목으로 초점이 옮겨진 뒤(Header focusTitle) 어느 영역인지 읽어 준다
  useEffect(() => {
    if (pagedTo !== ti) return;
    pagedTo = null;
    if (screenReader()) announce(pageSpeech(doc, ti));
    // 처음 그려질 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = (dir: -1 | 1) => {
    tap();
    const to = neighborArea(ti, dir);
    pagedTo = to;
    go('detail', to);
  };

  /** 칸·줄을 눌렀을 때 — 쓴 칸은 실천 시트, 빈 칸은 바로 쓰기 */
  const open = (ai: number) => {
    if (th.actions[ai].text.trim()) openAction(ti, ai);
    else openEditor({ kind: 'action', ti, ai });
  };

  const toggleOnce = (a: Action, ai: number) => {
    if (a.done) uncheckHaptic();
    else checkHaptic();
    toggleDone(ti, ai);
  };

  // 줄에 넘기는 함수는 고정 — 최신 open · toggleOnce · 칸을 ref로 읽는다(줄이 체크마다 다시 그려지지 않게)
  const latest = useRef({ open, toggleOnce, th });
  latest.current = { open, toggleOnce, th };
  const onRowOpen = useCallback((ai: number) => { tap(); latest.current.open(ai); }, []);
  const onRowToggle = useCallback((ai: number) => {
    const a = latest.current.th.actions[ai];
    if (a) latest.current.toggleOnce(a, ai);
  }, []);
  // 보드도 같은 고정 함수로(보드는 칸마다 memo — ChartBoard가 함수도 ref로 읽지만, 보드 자체도 다시 그리지 않게)
  const onBoardCell = onRowOpen;
  const onBoardLong = useCallback((ai: number) => openEditor({ kind: 'action', ti, ai }), [openEditor, ti]);
  const onBoardHead = useCallback(() => openEditor({ kind: 'theme', ti }), [openEditor, ti]);

  // 좌우로 쓸어 이전·다음 영역으로 (세로 스크롤은 그대로)
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.x0 >= EDGE && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -60 || g.vx < -0.6) page(1);
          else if (g.dx > 60 || g.vx > 0.6) page(-1);
        },
      }),
    // page는 ti·go만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ti, go],
  );

  const sectionHead = { ...TYPE.section, color: M.ink, paddingHorizontal: RHYTHM.gutter } as const;

  return (
    <View {...swipe.panHandlers} onAccessibilityEscape={back}>
      <Header
        M={M}
        sub={`영역 ${ti + 1} / 8`}
        kr={title}
        onBack={back}
        stacked
        focusTitle
        right={
          <Pressable
            onPress={() => openEditor({ kind: 'theme', ti })}
            accessibilityRole="button"
            accessibilityLabel="고치기"
            accessibilityHint="영역 이름 고치기"
            hitSlop={4}
            style={({ pressed }) => ({ minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>고치기</Text>
          </Pressable>
        }
      />

      {/* 달성 수 — 큰 숫자 하나 */}
      <View
        accessible
        accessibilityLabel={`8칸 중 ${p.done}칸 달성${streak.cur > 0 ? `, ${streak.cur}일 연속` : ''}`}
        style={{ paddingHorizontal: RHYTHM.gutter, paddingBottom: 20, flexDirection: 'row', alignItems: 'baseline', gap: 10 }}
      >
        <Text style={{ ...TYPE.title, ...NUM, color: M.ink }} maxFontSizeMultiplier={1.35}>
          <AnimatedNumber value={p.done} />
          <Text style={{ ...TYPE.rowTitle, ...NUM, color: M.sub }} maxFontSizeMultiplier={1.35}> / 8 달성</Text>
        </Text>
        <View style={{ flex: 1 }} />
        {streak.cur > 0 && (
          <Text style={{ ...TYPE.caption, ...NUM, color: M.sub }}>{`${streak.cur}일 연속`}</Text>
        )}
      </View>

      {/* 실천 보드 — 81칸의 크게 보기와 같은 보드 */}
      <Text accessibilityRole="header" style={sectionHead}>실천 보드</Text>
      <View style={{ paddingHorizontal: RHYTHM.gutter, paddingTop: 10, paddingBottom: RHYTHM.sectionTop }}>
        <ChartBoard
          M={M}
          doc={doc}
          ti={ti}
          onCell={onBoardCell}
          onCellLong={onBoardLong}
          onHead={onBoardHead}
        />
      </View>

      {p.filled === 0 ? (
        // 아직 쓴 칸이 없으면 빈 줄 8개 대신 한 줄만
        <View style={{ marginHorizontal: RHYTHM.gutter, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, minHeight: RHYTHM.row, justifyContent: 'center' }}>
          <Text style={{ ...TYPE.body, color: M.sub }}>칸을 눌러 실천 8개를 채워요</Text>
        </View>
      ) : (
        <>
          <Text accessibilityRole="header" style={sectionHead}>실천 8개</Text>
          {/* 한 면에 8줄 — 카드 없이 가는 선으로만 나눈다 */}
          <View style={{ paddingHorizontal: RHYTHM.gutter, paddingTop: 10 }}>
            {th.actions.map((a, ai) => {
              const line = kindLine(doc, ti, ai, now);
              return (
                <ActionRow
                  key={ai}
                  M={M}
                  a={a}
                  ai={ai}
                  first={ai === 0}
                  last={ai === th.actions.length - 1}
                  color={th.color}
                  seed={`${ti}-${ai}`}
                  status={rowStatus(doc, ti, ai, now)}
                  overdue={!!line?.alert}
                  label={rowSpeech(a, ai, line)}
                  onOpen={onRowOpen}
                  onToggle={onRowToggle}
                />
              );
            })}
          </View>
        </>
      )}

      {/* 이웃 영역 — 괘선 바닥줄 */}
      <View
        style={{
          marginTop: RHYTHM.sectionTop, marginHorizontal: RHYTHM.gutter, height: 56,
          borderTopWidth: 1, borderColor: M.line, flexDirection: 'row', alignItems: 'stretch',
        }}
      >
        <FooterLink M={M} label={`‹ ${areaTitle(doc, prevTi)}`} speech={`이전 영역, ${areaTitle(doc, prevTi)}`} align="left" onPress={() => page(-1)} />
        <FooterLink M={M} label={`${areaTitle(doc, nextTi)} ›`} speech={`다음 영역, ${areaTitle(doc, nextTi)}`} align="right" onPress={() => page(1)} />
      </View>
    </View>
  );
});

/**
 * 실천 한 줄 — 왼쪽 표시 · 글 · 오른쪽 상태.
 * - 한 번: 누를 수 있는 체크 칸(칸 달성을 바꾼다).
 * - 습관·쌓기·마음가짐: 누를 수 없는 상태 네모(달성이면 영역 색으로 칠, 아니면 테두리만). 하루 체크는 여기서 하지 않는다.
 * - 빈 칸: 표시 없이 '실천 n 채우기'.
 * 줄을 누르면 쓴 칸은 실천 시트, 빈 칸은 쓰기.
 */
/** 실천 한 줄 — 칸(a)과 값이 그대로면 다시 그리지 않는다. onOpen · onToggle은 칸 번호를 받는 고정된 함수 */
const ActionRow = memo(function ActionRow({
  M, a, ai, first, last, color, seed, status, overdue, label, onOpen: openAt, onToggle: toggleAt,
}: {
  M: Palette;
  a: Action;
  ai: number;
  first: boolean;
  last: boolean;
  color: string;
  seed: string;
  status: string;
  overdue: boolean;
  label: string;
  onOpen: (ai: number) => void;
  onToggle: (ai: number) => void;
}) {
  const onOpen = () => openAt(ai);
  const onToggle = () => toggleAt(ai);
  const has = !!a.text.trim();
  const once = has && kindOf(a) === 'once';
  const struck = once && a.done;
  const edge = checkEdge(M.dark, useIncreaseContrast());

  const actions = once ? [{ name: 'toggle', label: a.done ? '달성 풀기' : '달성으로 표시' }] : undefined;
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'toggle') onToggle();
    else if (e.nativeEvent.actionName === 'activate') onOpen();
  };

  let mark: React.ReactNode = <View style={{ width: MARK, height: MARK }} />;
  if (once) {
    mark = (
      <Pressable
        onPress={onToggle}
        hitSlop={11}
        // 줄 전체가 화면 읽기의 한 덩어리 — 체크는 동작 목록('달성으로 표시')으로 한다
        accessible={false}
        importantForAccessibility="no"
      >
        <Check on={a.done} color={color} dark={M.dark} size={MARK} seed={seed} />
      </Pressable>
    );
  } else if (has) {
    mark = (
      <View
        style={{
          width: MARK, height: MARK, borderRadius: MARK * 0.28,
          ...(a.done
            ? { backgroundColor: legibleMark(color, M.bg, M) }
            : { borderWidth: edge.width, borderColor: edge.color }),
        }}
      />
    );
  }

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="자세히 봐요"
      accessibilityActions={actions ? [{ name: 'activate' }, ...actions] : undefined}
      onAccessibilityAction={actions ? onAction : undefined}
      style={({ pressed }) => [
        groupEdge(M, first, last),
        { minHeight: RHYTHM.row, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
        pressed ? pressedRow(M) : null,
      ]}
    >
      {!first && <RowDivider M={M} inset={MARK + 14} />}
      {mark}
      <Text
        style={{
          ...TYPE.rowTitle, flex: 1, minWidth: 0,
          color: has && !struck ? M.ink : M.sub,
          fontWeight: has ? TYPE.rowTitle.fontWeight : '500',
          textDecorationLine: struck ? 'line-through' : 'none',
        }}
        numberOfLines={2}
      >
        {has ? a.text : `실천 ${ai + 1} 채우기`}
      </Text>
      {!!status && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: overdue ? alertInk(M) : M.sub, ...NUM }} numberOfLines={1}>
          {status}
        </Text>
      )}
    </Pressable>
  );
});

/** 바닥줄의 이웃 영역 글자 버튼 — 반쪽씩 */
function FooterLink({
  M, label, speech, align, onPress,
}: {
  M: Palette;
  label: string;
  speech: string;
  align: 'left' | 'right';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={speech}
      style={({ pressed }) => ({
        flex: 1, minWidth: 0, justifyContent: 'center',
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
