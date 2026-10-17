import React, { forwardRef, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { MOODS, alpha, type Palette } from '../theme/moods';
import { GOLD } from '../theme/palette';
import { CHART_POS, DONE_INK, coreBg, coreInk, frameRadius, headBg, headTrack, legibleMark } from '../theme/chart';
import { NUM } from '../theme/type';
import { cellBreak, noOrphan } from '../lib/text';
import { POSTER_H, POSTER_W, posterCells, posterDate, posterDone, posterFinished, type PosterCell } from '../lib/poster';
import type { MandaratDoc } from '../types';

/**
 * 그림의 치수(pt) — 모두 scale에서 나온다. scale 1이 공유 이미지(360×450, 1080×1350으로 찍는다)의 원래 값 그대로,
 * 보관함의 지난 표처럼 더 크게 그릴 때는 글자·괘선까지 같은 비율로 키운다(transform으로 늘리지 않아 글자가 흐려지지 않는다).
 */
export function posterMetrics(scale = 1) {
  const s = scale;
  /** 종이 여백 · 표 한 변 · 칸 한 변 */
  const margin = 20 * s;
  const table = POSTER_W * s - margin * 2;
  const cell = table / 9;
  /** 칸 글자 — 7.5pt 세 줄(크기를 줄여 맞추지 않는다. 넘치면 말줄임표) */
  const pad = 2.5 * s;
  return {
    width: POSTER_W * s,
    height: POSTER_H * s,
    margin,
    table,
    cell,
    /** 인쇄 괘선(pt) — 화면의 표보다 한 단계 가늘게: 바깥 테두리 · 블록 사이 · 칸 사이 */
    ruleFrame: 1.5 * s,
    ruleBlock: 1 * s,
    ruleCell: 0.5 * s,
    fs: 7.5 * s,
    fsHead: 8 * s,
    lh: 9 * s,
    pad,
    textW: cell - pad * 2,
    /** 머리말 줄 · 목표(두 줄까지) 자리 높이 — 표가 늘 같은 자리에 오도록 고정 */
    headH: 70 * s,
    headGap: 8 * s,
    /** 머리말 · 날짜 */
    fsTop: 12 * s,
    lhTop: 15 * s,
    /** 핵심 목표(두 줄까지)와 목표가 없을 때의 밑줄 */
    fsGoal: 22 * s,
    lhGoal: 25 * s,
    underline: 0.75 * s,
    /** 다 이룬 블록 이름표 아래 '달성' */
    fsMark: 7 * s,
    lhMark: 8.5 * s,
    /** 쌓기 · 이름표 막대 */
    bar: 2 * s,
    /** 다 이룬 블록의 안쪽 금색 줄 */
    finishLine: 1.5 * s,
    /** 표 모서리(칸 모서리 설정, 2pt까지) */
    radiusMax: 2 * s,
    /** 아래 줄 '64칸 중 n칸' · '만다라트' */
    footGap: 7 * s,
    fsFoot: 10 * s,
    lhFoot: 13 * s,
  };
}

/** 공유 이미지 한 장(scale 1)의 치수 */
const BASE = posterMetrics(1);
type Metrics = typeof BASE;

/** 화면 크기 설정과 상관없이 늘 같은 크기로 찍힌다(그림 한 장) */
const FIXED = { maxFontSizeMultiplier: 1, allowFontScaling: false } as const;

function Cell({ c, P, k, blank, finished, gold }: { c: PosterCell; P: Palette; k: Metrics; blank: boolean; finished: boolean; gold: string }) {
  const core = c.kind === 'core';
  const head = c.kind === 'head';
  const bg = blank ? 'transparent' : core ? coreBg(P) : head ? headBg(c.color, P) : c.done ? c.color : 'transparent';
  // 이름 없는 '영역 n'도 먹 글씨(가늘게) — 보조 글씨는 이름표 바탕 위 4.5:1이 안 된다
  const ink = !blank && core ? coreInk(P) : c.done ? DONE_INK : P.ink;
  const fs = core || head ? k.fsHead : k.fs;
  return (
    <View
      style={{
        position: 'absolute', left: c.col * k.cell, top: c.row * k.cell, width: k.cell, height: k.cell,
        padding: k.pad, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: bg,
      }}
    >
      {c.text !== '' && (
        <Text
          {...FIXED}
          numberOfLines={finished && head ? 2 : 3}
          ellipsizeMode="tail"
          style={{ fontSize: fs, lineHeight: k.lh, fontWeight: head && c.unnamed ? '500' : core || head ? '800' : c.done ? '700' : '600', color: ink, textAlign: 'center', letterSpacing: 0 }}
        >
          {cellBreak(c.text, k.textW, fs)}
        </Text>
      )}
      {finished && head && (
        <Text {...FIXED} style={{ fontSize: k.fsMark, lineHeight: k.lhMark, fontWeight: '800', color: legibleMark(gold, bg, P, 4.5), letterSpacing: 0 }}>달성</Text>
      )}
      {c.headPct != null && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: k.bar, backgroundColor: headTrack(c.color) }}>
          <View style={{ width: `${c.headPct}%`, height: '100%', backgroundColor: c.color }} />
        </View>
      )}
      {c.barPct != null && (
        <View style={{ position: 'absolute', left: 0, bottom: 0, width: `${c.barPct}%`, height: k.bar, backgroundColor: c.color }} />
      )}
    </View>
  );
}

/** 표 안쪽 괘선 — 칸 사이는 가늘게, 세 칸마다(블록 사이) 굵게. 바깥 테두리는 따로 */
function Rules({ P, k }: { P: Palette; k: Metrics }) {
  const lines: React.ReactNode[] = [];
  for (let i = 1; i < 9; i++) {
    const block = i % 3 === 0;
    const t = block ? k.ruleBlock : k.ruleCell;
    const color = block ? alpha(P.ink, 0.55) : alpha(P.ink, 0.22);
    const at = i * k.cell - t / 2;
    lines.push(<View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: at, width: t, backgroundColor: color }} />);
    lines.push(<View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: at, height: t, backgroundColor: color }} />);
  }
  return <>{lines}</>;
}

/**
 * 공유용 표 이미지 한 장 — 360×450pt(1080×1350으로 찍는다). 다크 모드에서도 늘 밝은 미색 종이(기본 무드의 색).
 * 머리말 '목표 달성표'와 날짜 · 핵심 목표 · 81칸 표 · 아래 '64칸 중 n칸'과 '만다라트'.
 * blank: 글만 찍고 칠·막대를 모두 뺀 빈 표(인쇄해 손으로 채우기).
 * gold: 8칸을 다 달성한 블록의 테두리 색(지금 포인트 컬러) — 종이 위에서 3:1이 되게 맞춘다.
 * scale: 그림 배율(기본 1 = 공유 이미지 그대로) — 모든 치수가 posterMetrics(scale)에서 나온다. 보관함의 지난 표는 쪽 폭에 맞춘다.
 */
export const ChartPoster = forwardRef<View, {
  doc: Pick<MandaratDoc, 'centerGoal' | 'themes' | 'settings'>;
  blank?: boolean;
  now: Date;
  paper?: Palette;
  gold?: string;
  scale?: number;
}>(function ChartPoster({ doc, blank = false, now, paper = MOODS['연꽃'], gold = GOLD, scale = 1 }, ref) {
  const P = paper;
  const k = useMemo(() => (scale === 1 ? BASE : posterMetrics(scale)), [scale]);
  const cells = useMemo(() => posterCells(doc, blank), [doc, blank]);
  const finished = useMemo(() => posterFinished(doc, blank), [doc, blank]);
  const done = posterDone(doc);
  const goal = doc.centerGoal.trim();
  const mark = legibleMark(gold, P.bg, P);
  const radius = Math.min(k.radiusMax, frameRadius(doc.settings.cellShape) * scale);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width: k.width, height: k.height, padding: k.margin, backgroundColor: P.bg }}
    >
      <View style={{ height: k.headH, justifyContent: 'space-between', paddingBottom: k.headGap }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text {...FIXED} style={{ flex: 1, fontSize: k.fsTop, lineHeight: k.lhTop, fontWeight: '600', color: P.sub }}>목표 달성표</Text>
          <Text {...FIXED} style={[{ fontSize: k.fsTop, lineHeight: k.lhTop, fontWeight: '600', color: P.sub }, NUM]}>{posterDate(now)}</Text>
        </View>
        {goal ? (
          <Text {...FIXED} numberOfLines={2} style={{ fontSize: k.fsGoal, lineHeight: k.lhGoal, fontWeight: '800', color: P.ink }}>
            {noOrphan(goal)}
          </Text>
        ) : (
          // 목표를 아직 정하지 않았으면 손으로 적을 밑줄 한 줄
          <View style={{ height: k.lhGoal, borderBottomWidth: k.underline, borderBottomColor: alpha(P.ink, 0.35) }} />
        )}
      </View>

      <View style={{ width: k.table, height: k.table, borderRadius: radius, overflow: 'hidden', backgroundColor: P.bg }}>
        {cells.map((c) => (
          <Cell key={`${c.row}-${c.col}`} c={c} P={P} k={k} blank={blank} finished={c.kind === 'head' && finished.includes(c.ti)} gold={gold} />
        ))}
        <Rules P={P} k={k} />
        {/* 가운데 블록은 핵심 목표 자리 — 블록 괘선과 같은 굵기로 한 번 더 감싼다 */}
        <View
          style={{
            position: 'absolute', left: 3 * k.cell - k.ruleBlock / 2, top: 3 * k.cell - k.ruleBlock / 2,
            width: 3 * k.cell + k.ruleBlock, height: 3 * k.cell + k.ruleBlock, borderWidth: k.ruleFrame, borderColor: alpha(P.ink, 0.85),
          }}
        />
        {finished.map((ti) => {
          // 8칸을 다 달성한 블록 — 괘선 안쪽에 금색 줄을 한 겹 더(바깥 테두리·블록 괘선에 가리지 않게 안으로 들인다)
          const slot = CHART_POS[ti];
          const col = slot % 3;
          const row = Math.floor(slot / 3);
          const inL = col === 0 ? k.ruleFrame : k.ruleBlock / 2;
          const inT = row === 0 ? k.ruleFrame : k.ruleBlock / 2;
          const inR = col === 2 ? k.ruleFrame : k.ruleBlock / 2;
          const inB = row === 2 ? k.ruleFrame : k.ruleBlock / 2;
          return (
            <View
              key={`f${ti}`}
              style={{
                position: 'absolute', left: col * 3 * k.cell + inL, top: row * 3 * k.cell + inT,
                width: 3 * k.cell - inL - inR, height: 3 * k.cell - inT - inB, borderWidth: k.finishLine, borderColor: mark,
              }}
            />
          );
        })}
        <View
          style={{
            position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
            borderWidth: k.ruleFrame, borderColor: alpha(P.ink, 0.85), borderRadius: radius,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: k.footGap }}>
        <Text {...FIXED} style={[{ flex: 1, fontSize: k.fsFoot, lineHeight: k.lhFoot, fontWeight: '600', color: P.sub }, NUM]}>
          {blank ? '' : `64칸 중 ${done}칸`}
        </Text>
        <Text {...FIXED} style={{ fontSize: k.fsFoot, lineHeight: k.lhFoot, fontWeight: '700', color: P.sub }}>만다라트</Text>
      </View>
    </View>
  );
});
