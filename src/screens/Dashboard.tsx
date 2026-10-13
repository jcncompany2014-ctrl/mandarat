import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { IconBtn, RowDivider, groupEdge, pressedRow } from '../components/common';
import { Icon } from '../components/Icon';
import { Check } from '../components/Check';
import { MiniChart } from '../components/GridMark';
import { FONTS } from '../theme/fonts';
import { fade, tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { SEMANTIC, readableOn } from '../theme/palette';
import { useMandarat, themeProgress, totalDone } from '../store/MandaratContext';
import { DOW_KR, todayItems, todayProgress, weekCounts, ymd } from '../lib/routine';
import { josa } from '../lib/text';
import { countInfo, fmtNum, kindLine } from '../lib/kinds';
import { useSettle } from '../lib/useSettle';
import { GUIDE_FILL_TARGET, firstAreaWithEmpty, guideSteps, pickSections } from '../lib/pick';
import { showGridAt } from './gridMemory';
import { noOrphan } from '../lib/text';
import { success, tap } from '../lib/haptics';
import type { MandaratDoc } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 섹션 머리 — 종이 위 작은 제목 한 줄(카드 없이). 오른쪽엔 보조 정보나 '더 보기' */
function SectionHead({ M, title, right, onPress, a11y }: { M: M; title: string; right?: string; onPress?: () => void; a11y?: string }) {
  const head = <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }} accessibilityRole="header">{title}</Text>;
  const note = !!right && <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>{right}</Text>;
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 10 };
  if (!onPress) return <View style={style}>{head}{note}</View>;
  // 줄 어디를 눌러도 되지만, 화면 읽기에서는 제목(머리말)과 오른쪽 버튼을 따로 읽는다
  return (
    <Pressable onPress={onPress} accessible={false} style={style}>
      {head}
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? title} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {note}
        <Icon name="chevR" size={16} color={M.faint} />
      </Pressable>
    </Pressable>
  );
}

/**
 * 홈 — 수첩의 오늘 쪽. 맨 위는 큰 날짜, 그 아래 올해 만다라트 81칸 모자이크,
 * 이어서 오늘 할 일·이번 주·8개 영역을 종이 위에 줄만 그어 늘어놓는다(카드 없이).
 */
export function Dashboard() {
  const M = usePalette();
  const { go, openEditor } = useUI();
  const { doc, storageError } = useMandarat();

  const done = totalDone(doc);
  const pct = Math.round((done / 64) * 100);
  const now = new Date();
  const { done: todayDoneCount, total: todayTotal } = todayProgress(doc, now);
  const week = weekCounts(doc.dayLog, now);
  const weekTotal = week.reduce((s, d) => s + d.count, 0);
  // 핵심 목표는 길어도 다 보이게 — 길면 조금 작게, 세 줄까지
  const goalLen = doc.centerGoal.length;
  const goalSize = !doc.centerGoal ? 18 : goalLen > 22 ? 17 : goalLen > 12 ? 19 : 21;

  return (
    <View>
      {/* 날짜 — 수첩 쪽 머리의 큰 숫자 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 6 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }} accessible accessibilityRole="header" accessibilityLabel={`${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`}>
          <Text style={{ fontSize: 56, lineHeight: 60, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk, letterSpacing: -2.5, fontVariant: ['tabular-nums'] }}>
            {now.getDate()}
          </Text>
          <View style={{ paddingBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }}>{now.getMonth() + 1}월</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub, marginTop: 1 }}>{WEEKDAYS[now.getDay()]}요일</Text>
          </View>
        </View>
        <View style={{ paddingTop: 6 }}>
          <IconBtn M={M} name="settings" label="설정" onPress={() => go('settings')} />
        </View>
      </View>

      {storageError && (
        // 저장소를 읽지 못한 실행 — 기존 기록을 덮어쓰지 않으려고 저장을 멈춘 상태를 알린다
        <View accessibilityRole="alert" style={{ marginHorizontal: 20, marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: tint(SEMANTIC.danger, M.dark ? 16 : 9, M.dark), borderWidth: 1, borderColor: tint(SEMANTIC.danger, 30, M.dark) }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: SEMANTIC.danger }}>기록을 불러오지 못했어요</Text>
          <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 3, lineHeight: 18 }}>
            기존 기록을 지키려고 이번에는 저장하지 않아요. 앱을 완전히 닫았다가 다시 열어 주세요.
          </Text>
        </View>
      )}

      {/* 올해의 만다라트 — 81칸이 차오르는 모자이크 + 핵심 목표 */}
      <Pressable
        // 목표가 아직 없으면 바로 쓰게, 있으면 만다라트로
        onPress={() => { tap(); if (doc.centerGoal.trim()) go('grid'); else openEditor({ kind: 'center' }); }}
        accessibilityRole="button"
        accessibilityLabel={`핵심 목표 ${doc.centerGoal || '미설정'}, 64칸 중 ${done}칸 달성 ${pct}%`}
        accessibilityHint={doc.centerGoal.trim() ? '만다라트 펼치기' : '핵심 목표 쓰기'}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18, marginHorizontal: 12, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 16 }, pressed ? pressedRow(M) : null]}
      >
        <MiniChart doc={doc} size={128} dark={M.dark} ink={M.dark ? M.ink : '#23211C'} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: M.sub }}>올해의 핵심 목표</Text>
          <Text style={{ fontSize: goalSize, fontWeight: '800', color: doc.centerGoal ? M.ink : M.sub, marginTop: 4, lineHeight: Math.round(goalSize * 1.3) }} numberOfLines={3}>
            {doc.centerGoal ? noOrphan(doc.centerGoal) : '핵심 목표를\n정해 주세요'}
          </Text>
          <Text style={{ fontSize: 13, color: M.sub, marginTop: 8, fontWeight: '500' }}>
            64칸 중 <Text style={{ color: M.ink, fontWeight: '800' }}>{done}칸</Text> 이뤘어요
          </Text>
        </View>
      </Pressable>

      {/* 처음 쓰는 사람의 네 단계 — 다 끝내면 사라진다 */}
      <StartGuide M={M} doc={doc} />

      {/* 오늘 할 일 — 바로 체크 */}
      <TodaySection M={M} doc={doc} todayDoneCount={todayDoneCount} todayTotal={todayTotal} />

      {/* 이번 주 — 한 날마다 동그라미가 채워진다 */}
      <SectionHead M={M} title="이번 주" right={weekTotal > 0 ? `${weekTotal}번 해냈어요` : '아직 기록이 없어요'} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 14 }} accessible accessibilityLabel={`이번 주 ${weekTotal}번 실천`}>
        {week.map((d) => (
          <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                // 한 날은 포인트 색으로 채우고(많이 한 날일수록 진하게), 오늘은 점선, 남은 날은 옅은 빈 칸
                backgroundColor: d.count > 0 ? fade(M.accent, 26 + Math.min(4, d.count) * 16) : 'transparent',
                borderWidth: d.count > 0 ? 0 : 1.4,
                borderStyle: d.isToday ? 'dashed' : 'solid',
                borderColor: d.isToday ? M.ink : M.line,
              }}
            >
              {d.count > 0 && <Text style={{ fontSize: 13, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>{d.count}</Text>}
            </View>
            <Text style={{ fontSize: 11, fontWeight: d.isToday ? '800' : '500', color: d.isToday ? M.ink : M.sub }}>{DOW_KR[d.dow]}</Text>
          </View>
        ))}
      </View>

      {/* 8개 영역 — 장부처럼 한 줄씩: 이름 · 8칸 · 수 */}
      <SectionHead M={M} title="8개 영역" right="만다라트" onPress={() => { tap(); go('grid'); }} a11y="만다라트 펼치기" />
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        {doc.themes.map((th, ti) => {
          const p = themeProgress(th);
          const first = ti === 0;
          return (
            <Pressable
              key={ti}
              onPress={() => { tap(); go('detail', ti); }}
              accessibilityRole="button"
              accessibilityLabel={`${th.title || `영역 ${ti + 1}`}, 8칸 중 ${p.done}개 달성`}
              style={({ pressed }) => [
                groupEdge(M, first, ti === doc.themes.length - 1),
                { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 2 },
                pressed ? pressedRow(M) : null,
              ]}
            >
              {!first && <RowDivider M={M} inset={0} />}
              <View style={{ width: 9, height: 9, borderRadius: 2.5, backgroundColor: th.color }} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: M.ink }} numberOfLines={1}>{th.title || `영역 ${ti + 1}`}</Text>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {th.actions.map((a, ai) => (
                  <View
                    key={ai}
                    style={{
                      width: 9, height: 9, borderRadius: 2,
                      backgroundColor: a.done ? th.color : 'transparent',
                      borderWidth: a.done ? 0 : 1, borderColor: a.text.trim() ? tint(th.color, 55, M.dark) : M.line,
                    }}
                  />
                ))}
              </View>
              <Text style={{ width: 30, textAlign: 'right', fontSize: 12.5, fontWeight: '700', color: M.sub, fontFamily: FONTS.grotesk }}>{p.done}/8</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 오늘 할 일 — 남은 일 3개를 바로 체크한다(카드 없이 줄만) */
function TodaySection({ M, doc, todayDoneCount, todayTotal }: { M: M; doc: MandaratDoc; todayDoneCount: number; todayTotal: number }) {
  const { go, openAction, openQuick, openPick } = useUI();
  const { checkToday, toggleExtra, addCount } = useMandarat();
  const { showToast } = useUI();
  const { held, hold } = useSettle();
  const now = new Date();

  type Row = { key: string; text: string; ti: number; done: boolean; sub: string; onCheck: () => void; onOpen?: () => void };
  const rows: Row[] = [
    ...todayItems(doc, now).map((it) => {
      const a = doc.themes[it.ti].actions[it.ai];
      return {
        key: it.key, text: a.text, ti: it.ti, done: it.done,
        sub: kindLine(doc, it.ti, it.ai, now)?.long ?? '',
        onCheck: () => {
          // 쌓기: 이번 체크로 목표에 닿으면 알려 주고, 해제(그날 더한 것 모두 되돌림)는 되살릴 수 있게
          if (it.kind === 'count') {
            const c = countInfo(a, ymd(now));
            if (!it.done && !c.reached && c.count + c.step >= c.goal) showToast(`목표 ${fmtNum(c.goal)}${c.unit}에 닿았어요 · 칸을 채웠어요`);
            if (it.done && c.today > 0) {
              const amount = c.today;
              showToast(`오늘 더한 ${josa(`${fmtNum(amount)}${c.unit}`, '을/를')} 되돌렸어요`, { label: '되돌리기', onPress: () => addCount(it.ti, it.ai, amount) });
            }
          }
          checkToday(it.ti, it.ai);
        },
        onOpen: () => openAction(it.ti, it.ai),
      };
    }),
    ...doc.todayExtra.map((x) => ({ key: `x${x.id}`, text: x.text, ti: x.ti, done: x.done, sub: '직접 추가', onCheck: () => toggleExtra(x.id) })),
  ];
  // 남은 일 + 방금 체크한 일(잠깐 머물렀다 사라짐)
  const visible = rows.filter((r) => !r.done || held.has(r.key));
  const canPick = useMemo(() => pickSections(doc, new Date()).some((sec) => sec.rows.some((r) => r.state === 'off')), [doc]);
  const shown = visible.slice(0, 3);
  const more = visible.length - shown.length;
  const allDone = todayTotal > 0 && todayDoneCount === todayTotal && held.size === 0;
  const left = todayTotal - todayDoneCount;

  const check = (r: Row) => {
    tap();
    if (!r.done) success();
    hold(r.key);
    r.onCheck();
  };

  // 한 묶음의 줄들: 남은 일 · (더 보기) · (비었을 때 고르기 / 다 했을 때 끝냄 표시)
  type Line = { key: string; node: (first: boolean, last: boolean) => React.ReactNode };
  const lines: Line[] = shown.map((r) => ({
    key: r.key,
    node: (first, last) => {
      const th = doc.themes[r.ti];
      return (
        <View key={r.key} style={[groupEdge(M, first, last), { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }]}>
          {!first && <RowDivider M={M} inset={36} />}
          <Pressable onPress={() => check(r)} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: r.done }} accessibilityLabel={`${r.text} 완료`}>
            <Check on={r.done} color={th.color} dark={M.dark} size={24} />
          </Pressable>
          <Pressable
            onPress={() => (r.onOpen ? (tap(), r.onOpen()) : check(r))}
            // 실천은 자세히 보기, 직접 추가한 할 일은 글자를 눌러도 체크된다
            accessibilityRole={r.onOpen ? 'button' : 'checkbox'}
            accessibilityState={r.onOpen ? undefined : { checked: r.done }}
            accessibilityHint={r.onOpen ? '실천 항목 자세히 보기' : undefined}
            accessibilityLabel={`${r.text}, ${th.title || `영역 ${r.ti + 1}`}`}
            style={{ flex: 1, minWidth: 0 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: r.done ? M.faint : M.ink, textDecorationLine: r.done ? 'line-through' : 'none' }} numberOfLines={1}>
              {r.text}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 1.5, backgroundColor: th.color }} />
              <Text style={{ flexShrink: 1, fontSize: 11.5, color: M.sub, fontWeight: '500' }} numberOfLines={1}>{th.title || `영역 ${r.ti + 1}`}{r.sub ? ` · ${r.sub}` : ''}</Text>
            </View>
          </Pressable>
        </View>
      );
    },
  }));
  if (more > 0) {
    lines.push({
      key: 'more',
      node: (first, last) => (
        <Pressable key="more" onPress={() => { tap(); go('today'); }} accessibilityRole="button" accessibilityLabel={`남은 할 일 ${more}개 더 보기`} style={({ pressed }) => [groupEdge(M, first, last), { paddingVertical: 11, paddingLeft: 36 }, pressed ? pressedRow(M) : null]}>
          {!first && <RowDivider M={M} inset={36} />}
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.sub }}>{more}개 더 있어요</Text>
        </Pressable>
      ),
    });
  }
  if (todayTotal === 0) {
    lines.push({
      key: 'pick',
      node: (first, last) => (
        // 만다라트에 고를 실천이 있으면 거기서 고르고, 없으면 오늘만 할 일을 바로 적는다
        <Pressable
          key="pick"
          onPress={() => { tap(); if (canPick) openPick(); else openQuick(); }}
          accessibilityRole="button"
          accessibilityLabel={canPick ? '실천에서 오늘 할 일 고르기' : '오늘 할 일 더하기'}
          style={({ pressed }) => [groupEdge(M, first, last), { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, pressed ? pressedRow(M) : null]}
        >
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1.6, borderStyle: 'dashed', borderColor: M.faint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={13} color={M.sub} sw={2.4} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: M.sub }}>{canPick ? '실천에서 오늘 할 일 고르기' : '오늘 할 일 더하기'}</Text>
        </Pressable>
      ),
    });
  }
  if (allDone) {
    lines.push({
      key: 'all',
      node: (first, last) => (
        <View key="all" style={[groupEdge(M, first, last), { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }]}>
          <Check on color={M.accent} dark={M.dark} size={24} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>오늘 할 일을 모두 끝냈어요</Text>
        </View>
      ),
    });
  }

  return (
    <>
      <SectionHead
        M={M}
        title="오늘 할 일"
        right={todayTotal === 0 ? undefined : left === 0 ? `${todayTotal}개 다 했어요` : `${left}개 남았어요`}
        onPress={() => { tap(); go('today'); }}
        a11y={`오늘 할 일, ${todayDoneCount}/${todayTotal} 완료, 오늘 화면 열기`}
      />
      <View style={{ paddingHorizontal: 20 }}>
        {lines.map((l, i) => l.node(i === 0, i === lines.length - 1))}
      </View>
    </>
  );
}

const GUIDE_LABEL = ['핵심 목표 정하기', `실천 칸 ${GUIDE_FILL_TARGET}개 채우기`, '오늘 할 일 고르기', '하나 해내고 체크하기'] as const;
const GUIDE_CTA = ['쓰기', '채우기', '고르기', '오늘 보기'] as const;

/**
 * 시작하기 — 핵심 목표 → 실천 칸 → 오늘 할 일 → 첫 체크.
 * 다음 단계에만 버튼을 달아 지금 할 일 하나만 보이게 하고, 네 단계를 다 하면 사라진다.
 */
function StartGuide({ M, doc }: { M: M; doc: MandaratDoc }) {
  const { openEditor, openPick, go } = useUI();
  const g = guideSteps(doc);
  if (g.next < 0) return null;
  const doneCount = g.steps.filter((st) => st.done).length;
  const run = (i: number) => {
    tap();
    if (i === 0) openEditor({ kind: 'center' });
    else if (i === 1) {
      // 81칸에서 빈 칸이 있는 첫 영역을 크게 연 채로 — 바로 '채우기'를 누를 수 있게
      const ti = firstAreaWithEmpty(doc);
      showGridAt(ti >= 0 ? ti : null);
      go('grid');
    } else if (i === 2) openPick();
    else go('today');
  };
  return (
    <>
      <SectionHead M={M} title="시작하기" right={`${doneCount}/4`} />
      <View style={{ paddingHorizontal: 20 }}>
        {g.steps.map((st, i) => {
          const isNext = i === g.next;
          const label = i === 1 ? `${GUIDE_LABEL[1]} · ${Math.min(g.filled, GUIDE_FILL_TARGET)}/${GUIDE_FILL_TARGET}` : GUIDE_LABEL[i];
          const first = i === 0;
          return (
            <Pressable
              key={st.key}
              onPress={() => run(i)}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1}단계 ${label}${st.done ? ', 끝냄' : isNext ? ', 다음에 할 일' : ''}`}
              style={({ pressed }) => [groupEdge(M, first, i === g.steps.length - 1), { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }, pressed ? pressedRow(M) : null]}
            >
              {!first && <RowDivider M={M} inset={36} />}
              {st.done ? (
                <Check on color={M.accent} dark={M.dark} size={24} />
              ) : (
                <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.6, borderColor: isNext ? M.ink : M.line }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isNext ? M.ink : M.sub, fontFamily: FONTS.grotesk }} maxFontSizeMultiplier={1.2}>{i + 1}</Text>
                </View>
              )}
              <Text style={{ flex: 1, fontSize: 15, fontWeight: isNext ? '800' : '500', color: st.done ? M.sub : isNext ? M.ink : M.sub, textDecorationLine: st.done ? 'line-through' : 'none' }} numberOfLines={1}>
                {label}
              </Text>
              {isNext && (
                <View style={{ paddingHorizontal: 13, paddingVertical: 6, borderRadius: 10, backgroundColor: M.accent }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: readableOn(M.accent) }}>{GUIDE_CTA[i]}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
