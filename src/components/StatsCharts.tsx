import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { GrowBar } from './GrowBar';
import { alpha, fade } from '../theme/moods';
import { NUM } from '../theme/type';
import {
  CENTER_SLOT, RULE, SLOT_INDEX, coreBg, coreInk, frameRadius, headBg, headTrack, legibleMark, ruleColor,
} from '../theme/chart';
import type { M } from '../theme/usePalette';
import { DOW_KR, kindOf } from '../lib/routine';
import { countInfo } from '../lib/kinds';
import { DAY_BIN_LABELS, dayBin, type WeekDay } from '../lib/review';
import { barHeight, weekBarsSpeech, type HeatMap, type MoodDay } from '../lib/statsView';
import { themeProgress, totalDone } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import type { MandaratDoc } from '../types';

// 통계 화면의 그림 넷 — 이번 주 막대 · 최근 10주 · 8개 영역(닳은 자리) · 기분 줄.
// 모두 종이 위에 바로 인쇄한 모양: 카드·그림자·둥근 알약 없이, 바닥선과 네모 칸만.

const areaName = (doc: MandaratDoc, ti: number) => doc.themes[ti]?.title.trim() || `영역 ${ti + 1}`;

/** 화면 읽기에서 숨기는 장식 — 범례처럼 이미 글로 읽은 것 */
const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

// ── 이번 주 막대 ──────────────────────────────────────────────────────────────

const BAR_FULL = 72;

/**
 * 이번 주 월~일 막대 — 바닥선 하나 위에 한 날만 막대를 세운다(0인 날은 막대도 숫자도 없이 비워 둔다).
 * 오늘은 요일 글자를 먹색으로 굵게 + 아래 짧은 먹 줄. 아직 안 온 날은 요일만 흐리게.
 * 줄 전체가 그림 하나로 읽힌다('월 5번, 화 1번, 수 2번 오늘, 목요일부터는 아직').
 */
export function WeekBars({ M, days }: { M: M; days: readonly WeekDay[] }) {
  const max = Math.max(1, ...days.map((d) => (d.future ? 0 : d.count)));
  // 막대는 불투명한 포인트 색 — 면(card) 위 3:1 이상으로(옅게 비친 색은 모든 포인트 색에서 3:1에 못 미친다)
  const fill = legibleMark(M.accent, M.card, M);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={weekBarsSpeech(days)}>
      <View style={{ flexDirection: 'row', gap: 9, height: BAR_FULL + 20, alignItems: 'flex-end' }}>
        {days.map((d, i) => {
          const h = d.future ? 0 : barHeight(d.count, max, BAR_FULL);
          return (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              {h > 0 && (
                <>
                  <Text style={[{ fontSize: 12, lineHeight: 15, fontWeight: '600', color: M.sub, marginBottom: 4 }, NUM]} maxFontSizeMultiplier={1.2}>
                    {d.count}
                  </Text>
                  <GrowBar height={h} index={i}>
                    <View style={{ flex: 1, backgroundColor: fill }} />
                  </GrowBar>
                </>
              )}
            </View>
          );
        })}
      </View>
      {/* 바닥선 — 일곱 날을 가로지르는 한 줄 */}
      <View style={{ height: 1, backgroundColor: alpha(M.ink, 0.3) }} />
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 7 }}>
        {days.map((d) => (
          <View key={d.date} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{ fontSize: 11, lineHeight: 14, fontWeight: d.isToday ? '800' : '600', color: d.isToday ? M.ink : M.sub, opacity: d.future ? 0.45 : 1 }}
              maxFontSizeMultiplier={1.2}
            >
              {DOW_KR[d.dow]}
            </Text>
            {d.isToday && <View style={{ width: 12, height: 2, marginTop: 3, backgroundColor: M.ink }} />}
          </View>
        ))}
      </View>
    </View>
  );
}

// ── 최근 10주 ────────────────────────────────────────────────────────────────

const HEAT_FILL = [0, 30, 50, 70, 90] as const;
const HEAT_GAP = 3;
const HEAT_LABEL_W = 24;
const HEAT_ROW_LABELS = ['월', '', '수', '', '금', '', ''];

/** 칸 한 변(pt) — 요일 라벨 자리와 칸 사이를 뺀 폭을 10주로 나눈다 */
export function heatCellSize(width: number, weeks = 10): number {
  return Math.max(8, Math.floor((width - HEAT_LABEL_W - (weeks - 1) * HEAT_GAP) / weeks));
}

/** 칸 사이의 절반 — 누르는 자리를 이만큼 넓힌다(이웃 칸과 겹치지 않는 데까지, 칸 사이에 죽은 자리가 없게) */
const HEAT_SLOP = HEAT_GAP / 2;

/** 고를 수 있는 날(그린 칸)을 날짜 순서대로 — 화면 읽기의 위·아래 쓸기로 하루씩 옮길 때 */
function pickableDays(map: HeatMap): string[] {
  const out: string[] = [];
  for (const col of map.cols) for (const c of col) if (c.state !== 'none') out.push(c.date);
  return out;
}

/**
 * 최근 10주 달력 — 열 = 주(월~일), 행 = 요일. 네모 칸, 한 날은 포인트 색(횟수 구간마다 진하게) +
 * 1pt 포인트 색 테두리(가장 옅은 칸도 '한 날'로 보이게 — 색 농도는 덧붙인 정보), 지난 빈 날은 가는 회색 테두리,
 * 쓰기 전 날과 아직 안 온 날은 그리지 않는다. 오늘은 먹색 테두리, 가장 많이 한 날은 칸 안 아래에 먹색 밑줄.
 * 칸을 누르면 그날을 고르고(테두리), 다시 누르면 푼다.
 *
 * 화면 읽기: 그림 전체가 조절 가능한 요소 하나 — 이름은 요약(speech), 값은 고른 날(pickedText),
 * 위·아래로 쓸면 하루씩 옮긴다(고른 날이 없으면 오늘부터).
 */
export function TenWeeks({
  M, map, width, picked, onPick, speech, pickedText,
}: {
  M: M;
  map: HeatMap;
  /** 그림이 쓸 수 있는 폭(pt) */
  width: number;
  picked: string | null;
  onPick: (date: string | null) => void;
  /** 그림 전체를 한 번에 읽는 글 */
  speech: string;
  /** 고른 날을 읽는 글(고른 날이 없으면 안내) */
  pickedText: string;
}) {
  const cell = heatCellSize(width, map.cols.length);
  const legendCell = 11;
  const days = useMemo(() => pickableDays(map), [map]);
  const inkEdge = legibleMark(M.accent, M.card, M);
  const step = (dir: 1 | -1) => {
    if (days.length === 0) return;
    const i = picked ? days.indexOf(picked) : -1;
    const next = i < 0 ? days.length - 1 : Math.max(0, Math.min(days.length - 1, i + dir));
    if (days[next] !== picked) onPick(days[next]);
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={speech}
      accessibilityValue={{ text: pickedText }}
      accessibilityHint="위아래로 쓸어 하루씩 옮겨요"
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') step(1);
        else if (e.nativeEvent.actionName === 'decrement') step(-1);
      }}
    >
      {/* 달 이름 — 새 달이 시작되는 주 위에 */}
      <View style={{ flexDirection: 'row', height: 16, marginBottom: 3 }}>
        <View style={{ width: HEAT_LABEL_W }} />
        {map.months.map((m, w) => (
          <View key={w} style={{ width: cell, marginLeft: w ? HEAT_GAP : 0, overflow: 'visible' }}>
            {!!m && (
              <Text style={[{ position: 'absolute', left: 0, width: cell * 2 + HEAT_GAP, fontSize: 11, lineHeight: 14, fontWeight: '600', color: M.sub }, NUM]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {m}
              </Text>
            )}
          </View>
        ))}
      </View>
      {HEAT_ROW_LABELS.map((label, d) => (
        <View key={d} style={{ flexDirection: 'row', alignItems: 'center', marginTop: d ? HEAT_GAP : 0 }}>
          <Text style={{ width: HEAT_LABEL_W, fontSize: 11, lineHeight: 14, fontWeight: '600', color: M.sub }} maxFontSizeMultiplier={1.2}>{label}</Text>
          {map.cols.map((col, w) => {
            const c = col[d];
            const on = picked === c.date;
            const box = { width: cell, height: cell, marginLeft: w ? HEAT_GAP : 0, borderRadius: 2 };
            if (c.state === 'none') return <View key={w} style={box} />;
            const ink = c.state === 'ink';
            const outline = on ? 2 : c.today ? 1.5 : 1;
            return (
              <Pressable
                key={w}
                onPress={() => { tap(); onPick(on ? null : c.date); }}
                hitSlop={HEAT_SLOP}
                style={[
                  box,
                  {
                    backgroundColor: ink ? fade(M.accent, HEAT_FILL[c.bin]) : 'transparent',
                    borderWidth: outline,
                    borderColor: on || c.today ? M.ink : ink ? inkEdge : M.line,
                  },
                ]}
              >
                {c.best && (
                  <View pointerEvents="none" style={{ position: 'absolute', left: 3, right: 3, bottom: 2, height: 2, backgroundColor: M.ink }} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
      {/* 범례 — 실제 횟수 구간(적게/많이 대신) */}
      <View {...HIDDEN} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 12 }}>
        {DAY_BIN_LABELS.map((l, i) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: i ? 4 : 0 }}>
            <View style={{ width: legendCell, height: legendCell, borderRadius: 2, borderWidth: 1, borderColor: inkEdge, backgroundColor: fade(M.accent, HEAT_FILL[i + 1]) }} />
            <Text style={[{ fontSize: 10.5, lineHeight: 13, fontWeight: '600', color: M.sub }, NUM]} maxFontSizeMultiplier={1.2}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── 8개 영역 = 닳은 자리 ─────────────────────────────────────────────────────

/** 칸 진하기 0~4 → 영역 색 농도(%) */
const WEAR_FILL = [0, 25, 45, 65, 85] as const;

/** 블록 자리(0~8)마다 블록 사이 괘선 — 오른쪽·아래만(가운데 블록 둘레는 바깥 테두리 굵기) */
function blockEdges(M: M, slot: number) {
  const row = Math.floor(slot / 3);
  const col = slot % 3;
  const block = ruleColor(M, 'block');
  const frame = ruleColor(M, 'frame');
  const coreRight = row === 1 && col === 0;
  const coreBottom = col === 1 && row === 0;
  const fromCoreRight = row === 1 && col === 1;
  const fromCoreBottom = col === 1 && row === 1;
  return {
    borderRightWidth: col === 2 ? 0 : coreRight || fromCoreRight ? RULE.frame : RULE.block,
    borderBottomWidth: row === 2 ? 0 : coreBottom || fromCoreBottom ? RULE.frame : RULE.block,
    borderRightColor: coreRight || fromCoreRight ? frame : block,
    borderBottomColor: coreBottom || fromCoreBottom ? frame : block,
  };
}

/**
 * 8개 영역 — 내 만다라트 81칸을 인쇄된 표 그대로 그리고, 칸마다 최근 4주 동안 한 날 수만큼 영역 색을 입힌다
 * (자주 한 칸일수록 진하게 — 손때 묻은 자리). 이름표 칸은 영역 이름과 달성률, 쌓기 칸은 맨 아래 2pt 진행 막대,
 * 가운데는 핵심 목표 자리에 전체 달성률. 칸을 누르면 그 실천을, 이름표를 누르면 그 영역을 연다.
 *
 * activity는 review.cellActivity(doc, today, 28) — [영역][칸] 한 날 수. 기록이 없으면 빈 표(빈 양식)로 그려진다.
 */
export function ActivityChart({
  M, doc, activity, width, onCell, onArea,
}: {
  M: M;
  doc: MandaratDoc;
  activity: number[][];
  width: number;
  onCell?: (ti: number, ai: number) => void;
  onArea?: (ti: number) => void;
}) {
  const cellRule = ruleColor(M, 'cell');
  const side = Math.max(0, Math.floor(width));
  const overall = Math.round((totalDone(doc) / 64) * 100);

  const head = (ti: number) => {
    const th = doc.themes[ti];
    const p = themeProgress(th);
    const name = areaName(doc, ti);
    return (
      <Pressable
        onPress={onArea ? () => { tap(); onArea(ti); } : undefined}
        disabled={!onArea}
        accessibilityRole={onArea ? 'button' : undefined}
        accessibilityLabel={`${name} ${p.pct}%${onArea ? ', 영역 보기' : ''}`}
        // 9pt 이름은 글자 크기를 따라 커지지 않는다 — 길게 누르면 큰 글자로 보여 준다
        accessibilityShowsLargeContentViewer
        accessibilityLargeContentTitle={`${name} ${p.pct}%`}
        style={({ pressed }) => ({ flex: 1, backgroundColor: headBg(th.color, M), opacity: pressed ? 0.75 : 1 })}
      >
        <View style={{ flex: 1, padding: 2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 9, lineHeight: 11, fontWeight: '800', color: M.ink, textAlign: 'center' }} numberOfLines={2} maxFontSizeMultiplier={1}>
            {name}
          </Text>
          <Text style={[{ fontSize: 9, lineHeight: 11, fontWeight: '600', color: M.ink }, NUM]} maxFontSizeMultiplier={1}>{p.pct}%</Text>
        </View>
      </Pressable>
    );
  };

  const action = (ti: number, ai: number) => {
    const th = doc.themes[ti];
    const a = th.actions[ai];
    const text = a?.text.trim() ?? '';
    if (!text) return <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
    const n = activity[ti]?.[ai] ?? 0;
    const bin = dayBin(n);
    const count = kindOf(a) === 'count' ? countInfo(a) : null;
    return (
      <Pressable
        onPress={onCell ? () => { tap(); onCell(ti, ai); } : undefined}
        disabled={!onCell}
        accessibilityRole={onCell ? 'button' : undefined}
        accessibilityLabel={`${text}, 최근 4주 ${n > 0 ? `${n}일` : '기록 없음'}${a.done ? ', 달성' : ''}${count ? `, ${count.pct}%` : ''}`}
        style={({ pressed }) => ({ flex: 1, backgroundColor: bin ? fade(th.color, WEAR_FILL[bin]) : 'transparent', opacity: pressed ? 0.7 : 1 })}
      >
        {count && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: headTrack(th.color) }}>
            <View style={{ width: `${Math.max(0, Math.min(100, count.pct))}%`, height: '100%', backgroundColor: th.color }} />
          </View>
        )}
      </Pressable>
    );
  };

  const core = (
    <View
      accessible
      accessibilityLabel={`핵심 목표, 64칸 중 ${totalDone(doc)}칸 달성, ${overall}%`}
      style={{ flex: 1, backgroundColor: coreBg(M), alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={[{ fontSize: 11, lineHeight: 14, fontWeight: '800', color: coreInk(M) }, NUM]} maxFontSizeMultiplier={1}>{overall}%</Text>
    </View>
  );

  /** 블록(자리 b) 안 칸(자리 s) */
  const cellAt = (b: number, s: number) => {
    const ti = SLOT_INDEX[b];
    if (ti == null) return s === CENTER_SLOT ? core : head(SLOT_INDEX[s] as number);
    return s === CENTER_SLOT ? head(ti) : action(ti, SLOT_INDEX[s] as number);
  };

  return (
    <View
      style={{
        width: side, height: side, borderWidth: RULE.frame, borderColor: ruleColor(M, 'frame'),
        borderRadius: frameRadius(doc.settings.cellShape), overflow: 'hidden', backgroundColor: M.bg,
      }}
    >
      {[0, 1, 2].map((br) => (
        <View key={br} style={{ flex: 1, flexDirection: 'row' }}>
          {[0, 1, 2].map((bc) => {
            const b = br * 3 + bc;
            return (
              <View key={bc} style={[{ flex: 1 }, blockEdges(M, b)]}>
                {[0, 1, 2].map((r) => (
                  <View key={r} style={{ flex: 1, flexDirection: 'row', borderTopWidth: r ? RULE.cell : 0, borderColor: cellRule }}>
                    {[0, 1, 2].map((c) => (
                      <View key={c} style={{ flex: 1, borderLeftWidth: c ? RULE.cell : 0, borderColor: cellRule }}>
                        {cellAt(b, r * 3 + c)}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** 닳은 자리 범례 — '최근 4주 · ■1 ■2 ■3 ■5+번' (색은 영역마다 다르므로 먹색 농도로 보인다) */
export function WearLegend({ M }: { M: M }) {
  return (
    <View {...HIDDEN} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 10 }}>
      <Text style={{ fontSize: 10.5, lineHeight: 13, fontWeight: '600', color: M.sub, marginRight: 2 }} maxFontSizeMultiplier={1.2}>최근 4주 ·</Text>
      {DAY_BIN_LABELS.map((l, i) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: i ? 3 : 0 }}>
          <View style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: alpha(M.ink, WEAR_FILL[i + 1] / 100) }} />
          <Text style={[{ fontSize: 10.5, lineHeight: 13, fontWeight: '600', color: M.sub }, NUM]} maxFontSizeMultiplier={1.2}>
            {i === DAY_BIN_LABELS.length - 1 ? `${l}번` : l}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── 기분 줄 ──────────────────────────────────────────────────────────────────

const MOOD_ROW = 12;
const MOOD_DOT = 5;
const MOOD_SCALE_W = 26;

/**
 * 최근 14일 기분 — 다섯 칸 세로 눈금 위에 그날 고른 자리에 먹색 점 하나(얼굴·색 없이).
 * 바닥선 아래에 요일 한 글자. 기분을 남기지 않은 날은 비워 둔다. 줄 전체가 글 하나로 읽힌다.
 */
export function MoodStrip({ M, days, speech }: { M: M; days: readonly MoodDay[]; speech: string }) {
  const last = days.length - 1;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={speech}>
      <View style={{ flexDirection: 'row' }}>
        <View {...HIDDEN} style={{ width: MOOD_SCALE_W, height: MOOD_ROW * 5, justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 10, lineHeight: 12, fontWeight: '600', color: M.sub }} maxFontSizeMultiplier={1}>최고</Text>
          <Text style={{ fontSize: 10, lineHeight: 12, fontWeight: '600', color: M.sub }} maxFontSizeMultiplier={1}>힘듦</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', height: MOOD_ROW * 5 }}>
            {days.map((d) => (
              <View key={d.date} style={{ flex: 1, alignItems: 'center' }}>
                {d.mood !== null && (
                  <View
                    style={{
                      position: 'absolute', top: (4 - d.mood) * MOOD_ROW + (MOOD_ROW - MOOD_DOT) / 2,
                      width: MOOD_DOT, height: MOOD_DOT, borderRadius: MOOD_DOT / 2, backgroundColor: M.ink,
                    }}
                  />
                )}
              </View>
            ))}
          </View>
          <View style={{ height: 1, backgroundColor: M.line }} />
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {days.map((d, i) => (
              <Text
                key={d.date}
                style={{ flex: 1, textAlign: 'center', fontSize: 10, lineHeight: 12, fontWeight: i === last ? '800' : '600', color: i === last ? M.ink : M.sub }}
                maxFontSizeMultiplier={1}
              >
                {d.dow}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
