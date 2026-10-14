import React, { forwardRef, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { MOODS, alpha, type Palette } from '../theme/moods';
import { GOLD } from '../theme/palette';
import { CHART_POS, DONE_INK, coreBg, coreInk, frameRadius, headBg, headTrack, legibleMark } from '../theme/chart';
import { NUM } from '../theme/type';
import { noOrphan } from '../lib/text';
import { textWidth } from '../lib/labelFit';
import { POSTER_H, POSTER_W, posterCells, posterDate, posterDone, posterFinished, type PosterCell } from '../lib/poster';
import type { MandaratDoc } from '../types';

/** 종이 여백 · 표 한 변 · 칸 한 변 */
const MARGIN = 20;
const TABLE = POSTER_W - MARGIN * 2;
const CELL = TABLE / 9;
/** 인쇄 괘선(pt) — 화면의 표보다 한 단계 가늘게: 바깥 테두리 · 블록 사이 · 칸 사이 */
const RULE_FRAME = 1.5;
const RULE_BLOCK = 1;
const RULE_CELL = 0.5;
/** 칸 글자 — 7.5pt 세 줄(크기를 줄여 맞추지 않는다. 넘치면 말줄임표) */
const FS = 7.5;
const FS_HEAD = 8;
const LH = 9;
const PAD = 2.5;
const TEXT_W = CELL - PAD * 2;
/** 머리말 줄 · 목표(두 줄까지) 자리 높이 — 표가 늘 같은 자리에 오도록 고정 */
const HEAD_H = 70;

/** 화면 크기 설정과 상관없이 늘 같은 크기로 찍힌다(그림 한 장) */
const FIXED = { maxFontSizeMultiplier: 1, allowFontScaling: false } as const;

/** 좁은 칸의 글 — 끝 두 어절을 붙이되(noOrphan), 붙인 두 어절이 칸보다 길면 붙이지 않는다(어절 가운데서 끊기지 않게) */
function fitCell(text: string, fs: number): string {
  const joined = noOrphan(text);
  if (joined === text.trimEnd()) return joined;
  const words = text.trim().split(/\s+/);
  return textWidth(words.slice(-2).join(' '), fs) <= TEXT_W ? joined : text.trim();
}

function Cell({ c, P, blank, finished, gold }: { c: PosterCell; P: Palette; blank: boolean; finished: boolean; gold: string }) {
  const core = c.kind === 'core';
  const head = c.kind === 'head';
  const bg = blank ? 'transparent' : core ? coreBg(P) : head ? headBg(c.color, P) : c.done ? c.color : 'transparent';
  // 이름 없는 '영역 n'도 먹 글씨(가늘게) — 보조 글씨는 이름표 바탕 위 4.5:1이 안 된다
  const ink = !blank && core ? coreInk(P) : c.done ? DONE_INK : P.ink;
  const fs = core || head ? FS_HEAD : FS;
  return (
    <View
      style={{
        position: 'absolute', left: c.col * CELL, top: c.row * CELL, width: CELL, height: CELL,
        padding: PAD, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: bg,
      }}
    >
      {c.text !== '' && (
        <Text
          {...FIXED}
          numberOfLines={finished && head ? 2 : 3}
          ellipsizeMode="tail"
          style={{ fontSize: fs, lineHeight: LH, fontWeight: head && c.unnamed ? '500' : core || head ? '800' : c.done ? '700' : '600', color: ink, textAlign: 'center', letterSpacing: 0 }}
        >
          {fitCell(c.text, fs)}
        </Text>
      )}
      {finished && head && (
        <Text {...FIXED} style={{ fontSize: 7, lineHeight: 8.5, fontWeight: '800', color: legibleMark(gold, bg, P, 4.5), letterSpacing: 0 }}>달성</Text>
      )}
      {c.headPct != null && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: headTrack(c.color) }}>
          <View style={{ width: `${c.headPct}%`, height: '100%', backgroundColor: c.color }} />
        </View>
      )}
      {c.barPct != null && (
        <View style={{ position: 'absolute', left: 0, bottom: 0, width: `${c.barPct}%`, height: 2, backgroundColor: c.color }} />
      )}
    </View>
  );
}

/** 표 안쪽 괘선 — 칸 사이는 가늘게, 세 칸마다(블록 사이) 굵게. 바깥 테두리는 따로 */
function Rules({ P }: { P: Palette }) {
  const lines: React.ReactNode[] = [];
  for (let i = 1; i < 9; i++) {
    const block = i % 3 === 0;
    const t = block ? RULE_BLOCK : RULE_CELL;
    const color = block ? alpha(P.ink, 0.55) : alpha(P.ink, 0.22);
    const at = i * CELL - t / 2;
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
 */
export const ChartPoster = forwardRef<View, {
  doc: Pick<MandaratDoc, 'centerGoal' | 'themes' | 'settings'>;
  blank?: boolean;
  now: Date;
  paper?: Palette;
  gold?: string;
}>(function ChartPoster({ doc, blank = false, now, paper = MOODS['연꽃'], gold = GOLD }, ref) {
  const P = paper;
  const cells = useMemo(() => posterCells(doc, blank), [doc, blank]);
  const finished = useMemo(() => posterFinished(doc, blank), [doc, blank]);
  const done = posterDone(doc);
  const goal = doc.centerGoal.trim();
  const mark = legibleMark(gold, P.bg, P);
  const radius = Math.min(2, frameRadius(doc.settings.cellShape));

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width: POSTER_W, height: POSTER_H, padding: MARGIN, backgroundColor: P.bg }}
    >
      <View style={{ height: HEAD_H, justifyContent: 'space-between', paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text {...FIXED} style={{ flex: 1, fontSize: 12, lineHeight: 15, fontWeight: '600', color: P.sub }}>목표 달성표</Text>
          <Text {...FIXED} style={[{ fontSize: 12, lineHeight: 15, fontWeight: '600', color: P.sub }, NUM]}>{posterDate(now)}</Text>
        </View>
        {goal ? (
          <Text {...FIXED} numberOfLines={2} style={{ fontSize: 22, lineHeight: 25, fontWeight: '800', color: P.ink }}>
            {noOrphan(goal)}
          </Text>
        ) : (
          // 목표를 아직 정하지 않았으면 손으로 적을 밑줄 한 줄
          <View style={{ height: 25, borderBottomWidth: 0.75, borderBottomColor: alpha(P.ink, 0.35) }} />
        )}
      </View>

      <View style={{ width: TABLE, height: TABLE, borderRadius: radius, overflow: 'hidden', backgroundColor: P.bg }}>
        {cells.map((c) => (
          <Cell key={`${c.row}-${c.col}`} c={c} P={P} blank={blank} finished={c.kind === 'head' && finished.includes(c.ti)} gold={gold} />
        ))}
        <Rules P={P} />
        {/* 가운데 블록은 핵심 목표 자리 — 블록 괘선과 같은 굵기로 한 번 더 감싼다 */}
        <View
          style={{
            position: 'absolute', left: 3 * CELL - RULE_BLOCK / 2, top: 3 * CELL - RULE_BLOCK / 2,
            width: 3 * CELL + RULE_BLOCK, height: 3 * CELL + RULE_BLOCK, borderWidth: RULE_FRAME, borderColor: alpha(P.ink, 0.85),
          }}
        />
        {finished.map((ti) => {
          // 8칸을 다 달성한 블록 — 괘선 안쪽에 금색 줄을 한 겹 더(바깥 테두리·블록 괘선에 가리지 않게 안으로 들인다)
          const slot = CHART_POS[ti];
          const col = slot % 3;
          const row = Math.floor(slot / 3);
          const inL = col === 0 ? RULE_FRAME : RULE_BLOCK / 2;
          const inT = row === 0 ? RULE_FRAME : RULE_BLOCK / 2;
          const inR = col === 2 ? RULE_FRAME : RULE_BLOCK / 2;
          const inB = row === 2 ? RULE_FRAME : RULE_BLOCK / 2;
          return (
            <View
              key={`f${ti}`}
              style={{
                position: 'absolute', left: col * 3 * CELL + inL, top: row * 3 * CELL + inT,
                width: 3 * CELL - inL - inR, height: 3 * CELL - inT - inB, borderWidth: 1.5, borderColor: mark,
              }}
            />
          );
        })}
        <View
          style={{
            position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
            borderWidth: RULE_FRAME, borderColor: alpha(P.ink, 0.85), borderRadius: radius,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 7 }}>
        <Text {...FIXED} style={[{ flex: 1, fontSize: 10, lineHeight: 13, fontWeight: '600', color: P.sub }, NUM]}>
          {blank ? '' : `64칸 중 ${done}칸`}
        </Text>
        <Text {...FIXED} style={{ fontSize: 10, lineHeight: 13, fontWeight: '700', color: P.sub }}>만다라트</Text>
      </View>
    </View>
  );
});
