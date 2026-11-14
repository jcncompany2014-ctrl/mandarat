import React, { memo, useMemo } from 'react';
import { PixelRatio, Pressable, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Text, a11yLangProp } from './AppText';
import { Icon } from './Icon';
import { DyeMark } from './kit';
import { MAP_LABEL, mapGeometry, mapLabel } from './chart';
import { ROLE } from '../theme/type';
import { PRETENDARD } from '../theme/fonts';
import type { M } from '../theme/usePalette';
import { kindOf } from '../lib/routine';
import { countInfo } from '../lib/kinds';
import { DAY_BIN_LABELS, dayBin } from '../lib/review';
import { HEAT_TONES, WEAR_TONES, figureParts, type HeatMap, type MoodDay } from '../lib/statsView';
import { mapCells } from '../lib/mapCells';
import { themeProgress } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import type { MandaratDoc } from '../types';
import { lang } from '../i18n';
import { useMsg } from '../i18n/react';
import type { Messages } from '../i18n';

// 통계 · 한 해 쪽의 부품(디자인 A, build-plan S4 · 목업 stats.png · year.png).
// 히어로 칸(이름 · 숫자 + 단위 · 한 줄) · 숫자 글(큰 숫자 + 작은 단위) · 앱 안 링크 · 최근 10주(타일) · 닳은 자리(타일 지도) · 범례 · 기분 줄.
// 색은 토큰 이름으로만(칸 진하기는 lib/statsView HEAT_TONES · WEAR_TONES), 글자는 ROLE. 카드 · 괘선 묶음 없이.

const areaName = (m: Messages, doc: Pick<MandaratDoc, 'themes'>, ti: number) => doc.themes[ti]?.title.trim() || m.chart.areaN({ n: ti + 1 });

/** 화면 읽기에서 숨기는 장식 — 범례처럼 이미 글로 읽은 것 */
const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/** 숫자와 단위 사이 — 머리카락 빈칸(U+200A) */
const HAIR = '\u200A';

/** 타일 모서리 — 최근 10주 · 닳은 자리 · 범례(build-plan S4) */
export const TILE_RADIUS = 3;

// ── 숫자 글 ──────────────────────────────────────────────────────────────────

/**
 * 숫자 + 작은 단위('120일' · '2시간 5분' · '24/64칸') — 숫자는 role(기본 figureField 22/30 먹), 단위는 unit(500 13/18 ink2).
 * 단위 글자 크기는 숫자 크기에 맞춰 줄어든다(size로 숫자를 줄일 때).
 */
export function Figure({
  M, text, role = ROLE.figureField, size, unitStyle, numberOfLines = 1, adjust = false, maxScale, style,
}: {
  M: M;
  text: string;
  role?: TextStyle;
  /** 숫자 글자 크기 — 칸에 맞춰 줄일 때(웹은 adjustsFontSizeToFit이 없다) */
  size?: number;
  unitStyle?: TextStyle;
  numberOfLines?: number;
  adjust?: boolean;
  maxScale?: number;
  style?: StyleProp<TextStyle>;
}) {
  const parts = figureParts(text);
  const base = role.fontSize ?? 22;
  const k = size ? size / base : 1;
  const unit = unitStyle ?? ROLE.unit;
  return (
    <Text
      style={[role, { color: M.ink }, size ? { fontSize: size, lineHeight: Math.round((role.lineHeight ?? base) * k) } : null, style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjust}
      minimumFontScale={adjust ? 0.7 : undefined}
      maxFontSizeMultiplier={maxScale}
    >
      {parts.map((p, i) => (p.unit ? (
        <Text key={i} style={[unit, { color: M.ink2, fontSize: Math.max(9, (unit.fontSize ?? 13) * Math.min(1, k)), letterSpacing: 0 }]}>
          {/* 숫자 바로 뒤 단위는 머리카락 빈칸 하나 띄운다(목업 small margin-left 2 — 글 안의 글은 여백을 받지 않는다) */}
          {i > 0 && !/^\s/.test(p.t) ? `${HAIR}${p.t}` : p.t}
        </Text>
      ) : p.t))}
    </Text>
  );
}

// ── 히어로 칸 ────────────────────────────────────────────────────────────────

/**
 * 히어로 칸 하나(목업 .hero-field) — 이름(label print) · 숫자 + 단위(figureField) · 한 줄(meta ink2).
 * 칸 전체가 한 번에 읽힌다(이름 · 소리 말 · 한 줄).
 */
export const HeroField = memo(function HeroField({ M, label, value, note, extra, extraStrong, speech, sep, maxScale }: {
  M: M;
  label: string;
  value: string;
  note?: string;
  /** 한 줄 아래 한 줄 더(최고 기록) */
  extra?: string;
  extraStrong?: boolean;
  /** 숫자를 소리로 */
  speech: string;
  /** 읽기 글을 잇는 쉼표(core.listSep) */
  sep: string;
  maxScale?: number;
}) {
  return (
    <View accessible accessibilityLabel={[label, speech, note, extra].filter(Boolean).join(sep)} {...a11yLangProp()} style={{ gap: 2 }}>
      <Text style={[ROLE.label, { color: M.print }]} maxFontSizeMultiplier={maxScale}>{label}</Text>
      <Figure M={M} text={value} maxScale={maxScale} />
      {!!note && <Text style={[ROLE.meta, { color: M.ink2 }]} maxFontSizeMultiplier={maxScale}>{note}</Text>}
      {!!extra && (
        <Text style={[ROLE.meta, { color: extraStrong ? M.ink : M.ink2 }, extraStrong ? { fontFamily: PRETENDARD[600] } : null]} maxFontSizeMultiplier={maxScale}>
          {extra}
        </Text>
      )}
    </View>
  );
});

// ── 앱 안 링크 ───────────────────────────────────────────────────────────────

/**
 * 앱 안으로 가는 글 링크(A.link) — link 700 13/18 먹 + 꺾쇠 16. 화면 안으로 가므로 button 역할(R-6 A-6),
 * 18 높이로 그리고 위아래 13씩 더 눌린다(44).
 */
export function InLink({ M, label, onPress, hint, testID, accessibilityLabel, style }: {
  M: M;
  label: string;
  onPress: () => void;
  hint?: string;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityHint={hint}
      hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 18, opacity: pressed ? 0.5 : 1 }, style]}
    >
      <Text style={[ROLE.link, { color: M.ink }]} numberOfLines={1}>{label}</Text>
      <Icon name="chevR" size={16} color={M.ink} style={{ marginRight: -4 }} />
    </Pressable>
  );
}

// ── 이번 주 영역 표 ──────────────────────────────────────────────────────────

/** 막대 아래 영역 표(목업 .wk-key) — 영역 표시 + 이름(meta ink2) + 수(600 ink). 한 덩어리로 읽힌다 */
export const WeekAreaKey = memo(function WeekAreaKey({ M, items, names, label }: {
  M: M;
  items: readonly { ti: number; n: number }[];
  names: readonly string[];
  label: string;
}) {
  if (items.length === 0) return null;
  return (
    <View accessible accessibilityLabel={label} {...a11yLangProp()} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
      {items.map(({ ti, n }) => (
        <View key={ti} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <DyeMark M={M} area={ti} />
          <Text style={[ROLE.meta, { color: M.ink2 }]} numberOfLines={1}>{names[ti]}</Text>
          <Text style={[ROLE.meta, { color: M.ink, fontFamily: PRETENDARD[600], marginLeft: 4 }]}>{n}</Text>
        </View>
      ))}
    </View>
  );
});

// ── 최근 10주 ────────────────────────────────────────────────────────────────

const HEAT_GAP = 3;
const HEAT_LABEL_W = 24;
/** 줄 이름을 적는 요일(월 · 수 · 금, 0 = 일요일) — 나머지 줄은 비운다 */
const HEAT_ROW_DOWS = [1, null, 3, null, 5, null, null] as const;
/** 오늘 점 · 고른 날 고리 */
const TODAY_DOT = 5;
const PICK_RING = 1.5;
const PICK_OUT = 2.5;
const LEGEND_CELL = 11;

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

/** 진하기 범례 — '1 · 2 · 3 · 5+' 앞에 칸 하나씩(타일). 화면 읽기에서는 숨긴다(그림이 글로 읽힌다) */
function TileLegend({ M, tones, head, last }: { M: M; tones: readonly string[]; head?: string; last?: (label: string) => string }) {
  return (
    <View {...HIDDEN} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 12 }}>
      {!!head && <Text style={[ROLE.meta, { color: M.print, marginRight: 2 }]} maxFontSizeMultiplier={1.2}>{head}</Text>}
      {DAY_BIN_LABELS.map((label, i) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: i ? 3 : 0 }}>
          <View style={{ width: LEGEND_CELL, height: LEGEND_CELL, borderRadius: TILE_RADIUS, backgroundColor: tones[i] }} />
          <Text style={[ROLE.meta, { color: M.print }]} maxFontSizeMultiplier={1.2}>
            {i === DAY_BIN_LABELS.length - 1 && last ? last(label) : label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * 최근 10주 달력 — 열 = 주(월~일), 행 = 요일. 타일(모서리 3): 지난 빈 날 tile, 한 날은 횟수 구간마다
 * printMid → printEdge → ink2 → ink(HEAT_TONES). 쓰기 전 날과 아직 안 온 날은 그리지 않는다.
 * 오늘은 가운데 signal 점, 가장 많이 한 날은 칸 안 아래에 짧은 줄, 고른 날은 칸 밖 먹 고리. 칸을 누르면 그날을 고르고, 다시 누르면 푼다.
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
  const msgs = useMsg();
  const cell = heatCellSize(width, map.cols.length);
  // 칸 한 변을 내림한 나머지는 요일 라벨 자리로 — 마지막 열이 본문 오른쪽 끝에 닿게
  const labelW = Math.max(HEAT_LABEL_W, Math.floor(width) - cell * map.cols.length - HEAT_GAP * (map.cols.length - 1));
  const days = useMemo(() => pickableDays(map), [map]);
  const tones = HEAT_TONES.map((t) => M[t]);
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
      {...a11yLangProp()}
      accessibilityValue={{ text: pickedText }}
      accessibilityHint={msgs.stats.heatHint}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') step(1);
        else if (e.nativeEvent.actionName === 'decrement') step(-1);
      }}
    >
      {/* 달 이름 — 새 달이 시작되는 주 위에 */}
      <View style={{ flexDirection: 'row', height: 18, marginBottom: 4 }}>
        <View style={{ width: labelW }} />
        {map.months.map((mo, w) => (
          <View key={w} style={{ width: cell, marginLeft: w ? HEAT_GAP : 0, overflow: 'visible' }}>
            {!!mo && (
              <Text style={[ROLE.meta, { position: 'absolute', left: 0, width: cell * 3 + HEAT_GAP * 2, color: M.print }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {mo}
              </Text>
            )}
          </View>
        ))}
      </View>
      {HEAT_ROW_DOWS.map((dow, d) => (
        <View key={d} style={{ flexDirection: 'row', alignItems: 'center', marginTop: d ? HEAT_GAP : 0 }}>
          <Text style={[ROLE.meta, { width: labelW, color: M.print }]} maxFontSizeMultiplier={1.2}>{dow == null ? '' : msgs.fmt.dowNarrow({ i: dow })}</Text>
          {map.cols.map((col, w) => {
            const c = col[d];
            const box = { width: cell, height: cell, marginLeft: w ? HEAT_GAP : 0, borderRadius: TILE_RADIUS };
            if (c.state === 'none') return <View key={w} style={box} />;
            const on = picked === c.date;
            const bin = c.state === 'ink' ? c.bin : 0;
            return (
              <Pressable
                key={w}
                onPress={() => { tap(); onPick(on ? null : c.date); }}
                hitSlop={HEAT_SLOP}
                style={[box, { backgroundColor: tones[bin], alignItems: 'center', justifyContent: 'center' }]}
              >
                {c.today && (
                  <View pointerEvents="none" style={{ width: TODAY_DOT, height: TODAY_DOT, borderRadius: TODAY_DOT / 2, backgroundColor: M.signal }} />
                )}
                {c.best && (
                  <View pointerEvents="none" style={{ position: 'absolute', left: 3, right: 3, bottom: 2, height: 2, borderRadius: 1, backgroundColor: bin >= 3 ? M.paper : M.ink }} />
                )}
                {on && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute', left: -PICK_OUT, top: -PICK_OUT, right: -PICK_OUT, bottom: -PICK_OUT,
                      borderWidth: PICK_RING, borderColor: M.ink, borderRadius: TILE_RADIUS + PICK_OUT,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
      {/* 범례 — 실제 횟수 구간(적게/많이 대신) */}
      <TileLegend M={M} tones={tones.slice(1)} />
    </View>
  );
}

// ── 8개 영역 = 닳은 자리 ─────────────────────────────────────────────────────

/** 쌓기 칸 진행 줄 — 칸 안쪽 아래(좌우 · 아래 4), 2 높이 */
const BAR_INSET = 4;

/**
 * 8개 영역 — 내 만다라트 81칸을 색 지도(L2)와 같은 자리의 타일(모서리 3)로 그리고, 실천 칸마다 최근 4주 동안 한 날 수만큼
 * 그 영역 색을 진하게(WEAR_TONES: tile → tint → wash → washL1 → dye — 자주 한 칸일수록 진하게, 손때 묻은 자리).
 * 영역 이름 칸은 영역 색에 이름, 가운데는 core에 전체 달성률(달성한 칸이 하나도 없으면 비운다), 쌓기 칸은 아래 2pt 진행 줄.
 * 칸을 누르면 그 실천을, 이름 칸을 누르면 그 영역을 연다(onCell · onArea가 있을 때).
 *
 * activity는 review.cellActivity(doc, today, 28) — [영역][칸] 한 날 수. 기록이 없으면 빈 지도(빈 양식)로 그려진다.
 */
export function ActivityChart({
  M, doc, activity, width, onCell, onArea,
}: {
  M: M;
  doc: Pick<MandaratDoc, 'themes' | 'centerGoal'>;
  activity: number[][];
  width: number;
  onCell?: (ti: number, ai: number) => void;
  onArea?: (ti: number) => void;
}) {
  const m = useMsg();
  const l = lang();
  const side = Math.max(0, Math.floor(width));
  const g = mapGeometry({ level: 'L2', width: side, ratio: PixelRatio.get() });
  const done = doc.themes.reduce((s, t) => s + t.actions.filter((a) => a.done).length, 0);
  const overall = Math.round((done / 64) * 100);
  // 아직 달성한 칸이 하나도 없으면 빈 양식 — 가운데에 '0%'를 찍지 않는다(화면 읽기 이름은 그대로)
  const blank = done === 0;
  const cells = useMemo(() => mapCells({ themes: doc.themes, centerGoal: doc.centerGoal }), [doc.themes, doc.centerGoal]);
  /** 칸 진하기(0~4) · 영역 → 색(tile, 그다음은 그 영역의 tint · wash · washL1 · dye) */
  const wearFill = (bin: number, ti: number): string => {
    const t = WEAR_TONES[bin] ?? 'tile';
    return t === 'tile' ? M.tile : M[t][ti] ?? M.tile;
  };

  return (
    <View style={{ width: g.size, height: g.size }}>
      {cells.map((c) => {
        const x = g.pos[c.col];
        const y = g.pos[c.row];
        const w = g.cells[c.col];
        const h = g.cells[c.row];
        const box: ViewStyle = { position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: TILE_RADIUS };
        const key = `${c.row}-${c.col}`;

        if (c.kind === 'core') {
          return (
            <View
              key={key}
              accessible
              accessibilityLabel={[m.chart.coreGoal, m.chart.doneOf64Say({ done }), `${overall}%`].join(m.core.listSep)}
              {...a11yLangProp()}
              style={[box, { backgroundColor: M.core, alignItems: 'center', justifyContent: 'center' }]}
            >
              {!blank && (
                <Text style={[ROLE.mapCore, { color: M.onCore, fontVariant: ['tabular-nums'] }]} maxFontSizeMultiplier={1}>{overall}%</Text>
              )}
            </View>
          );
        }

        if (c.kind !== 'action') {
          const ti = c.ti;
          const p = themeProgress(doc.themes[ti]);
          const name = areaName(m, doc, ti);
          const lab = mapLabel(name, 'head', w, h, l);
          return (
            <Pressable
              key={key}
              onPress={onArea ? () => { tap(); onArea(ti); } : undefined}
              disabled={!onArea}
              accessibilityRole={onArea ? 'button' : undefined}
              accessibilityLabel={`${name} ${p.pct}%${onArea ? `${m.core.listSep}${m.stats.openArea}` : ''}`}
              {...a11yLangProp()}
              // 지도 글은 글자 크기를 따라 커지지 않는다 — 길게 누르면 큰 글자로 보여 준다
              accessibilityShowsLargeContentViewer
              accessibilityLargeContentTitle={`${name} ${p.pct}%`}
              style={({ pressed }) => [box, { backgroundColor: M.dye[ti], paddingHorizontal: MAP_LABEL.pad, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }]}
            >
              <Text
                style={[ROLE.mapHead, { fontSize: lab.fs, lineHeight: lab.lh, letterSpacing: lab.letterSpacing, color: M.onDye, textAlign: 'center' }]}
                numberOfLines={Math.max(1, lab.lines)}
                maxFontSizeMultiplier={1}
                accessible={false}
              >
                {lab.text}
              </Text>
            </Pressable>
          );
        }

        const a = doc.themes[c.ti]?.actions[c.ai];
        const text = a?.text.trim() ?? '';
        if (!text || !a) {
          return <View key={key} {...HIDDEN} style={[box, { backgroundColor: M.tile }]} />;
        }
        const n = activity[c.ti]?.[c.ai] ?? 0;
        const count = kindOf(a) === 'count' ? countInfo(a) : null;
        const ti = c.ti;
        const ai = c.ai;
        return (
          <Pressable
            key={key}
            onPress={onCell ? () => { tap(); onCell(ti, ai); } : undefined}
            disabled={!onCell}
            accessibilityRole={onCell ? 'button' : undefined}
            accessibilityLabel={[text, n > 0 ? m.stats.wearSay({ n }) : m.stats.wearNone, a.done ? m.chart.done : '', count ? `${count.pct}%` : ''].filter(Boolean).join(m.core.listSep)}
            {...a11yLangProp()}
            style={({ pressed }) => [box, { backgroundColor: wearFill(dayBin(n), ti), opacity: pressed ? 0.7 : 1 }]}
          >
            {/* 진행 줄은 칸 안쪽에 띄운다 */}
            {count && (
              <View pointerEvents="none" style={{ position: 'absolute', left: BAR_INSET, right: BAR_INSET, bottom: BAR_INSET, height: 2, borderRadius: 1, backgroundColor: M.paper }}>
                <View style={{ width: `${Math.max(0, Math.min(100, count.pct))}%`, height: '100%', borderRadius: 1, backgroundColor: M.ink }} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * 닳은 자리 범례 — '최근 4주 · ■1 ■2 ■3 ■5+일'. 칸 색은 영역마다 다르므로 범례는 같은 밝기 차례의 회색 타일로
 * (printRule → printMid → printEdge → ink2 — 진할수록 자주 한 칸).
 * head — 범례 앞 머리말(기본 '최근 4주 ·'). 한 해 돌아보기는 제목 줄과 같은 '4주 평균 ·'을 준다
 */
export function WearLegend({ M, head }: { M: M; head?: string }) {
  const m = useMsg();
  return (
    <TileLegend
      M={M}
      tones={[M.printRule, M.printMid, M.printEdge, M.ink2]}
      head={head ?? m.stats.legendLast4}
      last={(label) => m.stats.legendTimes({ label })}
    />
  );
}

// ── 기분 줄 ──────────────────────────────────────────────────────────────────

const MOOD_ROW = 12;
const MOOD_DOT = 5;
const MOOD_SCALE_W = 26;

/**
 * 최근 14일 기분 — 다섯 칸 세로 눈금 위에 그날 고른 자리에 먹 점 하나(얼굴·색 없이).
 * 바닥 머리카락 선 아래에 요일 한 글자(오늘은 먹 700). 기분을 남기지 않은 날은 비워 둔다. 줄 전체가 글 하나로 읽힌다.
 */
export function MoodStrip({ M, days, speech }: { M: M; days: readonly MoodDay[]; speech: string }) {
  const m = useMsg();
  const last = days.length - 1;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={speech} {...a11yLangProp()}>
      <View style={{ flexDirection: 'row' }}>
        {/* 눈금 이름 폭은 최소 MOOD_SCALE_W — 긴 낱말(ja · en)이면 그만큼 넓힌다 */}
        <View {...HIDDEN} style={{ minWidth: MOOD_SCALE_W, paddingRight: 4, height: MOOD_ROW * 5, justifyContent: 'space-between' }}>
          <Text style={[ROLE.note, { fontSize: 10, lineHeight: 12, color: M.print }]} maxFontSizeMultiplier={1}>{m.core.mood4}</Text>
          <Text style={[ROLE.note, { fontSize: 10, lineHeight: 12, color: M.print }]} maxFontSizeMultiplier={1}>{m.core.mood0}</Text>
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
          <View style={{ height: 1, backgroundColor: M.printRule }} />
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {days.map((d, i) => (
              <Text
                key={d.date}
                style={[i === last ? ROLE.weekDayToday : ROLE.weekDay, { flex: 1, textAlign: 'center', fontSize: 10, lineHeight: 12, color: i === last ? M.ink : M.print }]}
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
