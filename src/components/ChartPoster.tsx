// 표 이미지 한 장 — 디자인 A share.png(build-plan §1 share). 화면을 찍은 것이 아니라 피드에 올릴 한 장:
// 머리 '2026 핵심 목표' · 핵심 목표가 제목 · 오른쪽 '24/64칸' · L2 색 지도(실천 64칸은 색만 — 남에게 보일 글은 영역 이름과 목표뿐)
// · 발에 마크 + '만다라트' · 날짜. 오늘 표시 · 체크는 없다(보는 사람에게 '오늘'은 뜻이 없다).
// 늘 밝은 토큰(LIGHT) — 다크 모드에서도 흰 종이 한 장. 빈 표(blank)는 첫 화면의 지도(실천 칸이 모두 비었다).
// 자리 · 글자 크기는 lib/poster.ts(POSTER · posterMetrics · posterGoal · POSTER_LABEL), 지도는 G의 ColourMap(늘 LIGHT · 피드 크기 이름).
import React, { forwardRef, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { ColourMap, Mark, keepWords } from './chart';
import { LIGHT, type Tokens } from '../theme/tokens';
import { PRETENDARD } from '../theme/fonts';
import { NUM } from '../theme/type';
import {
  POSTER_LABEL, POSTER_MAP, POSTER_RATIO, posterDate, posterDone, posterFigure, posterGoal, posterMetrics, type PosterMetrics,
} from '../lib/poster';
import type { MandaratDoc } from '../types';
import type { Lang } from '../i18n';
import { useLang } from '../i18n/react';
import { msg } from '../i18n';

/** 화면 크기 설정과 상관없이 늘 같은 크기로 찍힌다(그림 한 장) */
const FIXED = { maxFontSizeMultiplier: 1, allowFontScaling: false } as const;

/** 늘 밝은 종이 */
const T: Tokens = LIGHT;

/** 제목 줄 — 핵심 목표(한 줄에 들도록 44~28, 그래도 넘치면 두 줄)와 오른쪽 '24/64칸'(빈 표에는 없다) */
function TitleLine({ goal, figure, unit, k, scale, l }: {
  goal: string;
  figure: string;
  unit: string;
  k: PosterMetrics;
  scale: number;
  l: Lang;
}) {
  const fit = posterGoal(goal, figure, unit, l);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: k.figGap, marginTop: k.headGap }}>
      {goal ? (
        <Text
          {...FIXED}
          numberOfLines={fit.lines}
          ellipsizeMode="tail"
          style={{
            flex: 1, minWidth: 0, fontFamily: PRETENDARD[700], fontSize: fit.fs * scale, lineHeight: fit.lh * scale,
            letterSpacing: fit.letterSpacing * scale, color: T.ink,
          }}
        >
          {keepWords(goal)}
        </Text>
      ) : (
        // 목표를 아직 정하지 않았으면 손으로 적을 밑줄 한 줄
        <View style={{ flex: 1, height: fit.lh * scale * 0.8, borderBottomWidth: k.underline, borderBottomColor: T.printMid }} />
      )}
      {!!figure && (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            {...FIXED}
            style={[{ fontFamily: PRETENDARD[700], fontSize: k.figFs, lineHeight: k.figLh, letterSpacing: k.figTracking, color: T.ink }, NUM]}
          >
            {figure}
          </Text>
          <Text
            {...FIXED}
            style={{ fontFamily: PRETENDARD[600], fontSize: k.unitFs, lineHeight: k.unitLh, letterSpacing: 0, color: T.ink2, marginLeft: k.unitGap }}
          >
            {unit}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * 공유용 표 이미지 한 장 — 540×675pt(1080×1350으로 찍는다), 늘 밝은 토큰.
 * blank: 첫 화면의 지도(실천 칸은 모두 빈 칸, 숫자 없음) — 이름표와 목표만.
 * scale: 그림 배율(기본 1 = 공유 이미지 그대로) — 모든 치수가 posterMetrics(scale)에서 나온다(시트의 미리보기).
 * 강조색(예전 금색 줄)은 없다(§2.7).
 */
export const ChartPoster = forwardRef<View, {
  doc: Pick<MandaratDoc, 'centerGoal' | 'themes'>;
  blank?: boolean;
  now: Date;
  scale?: number;
}>(function ChartPoster({ doc, blank = false, now, scale = 1 }, ref) {
  const l = useLang();
  const m = msg(l);
  const k = useMemo(() => posterMetrics(scale), [scale]);
  const goal = doc.centerGoal.trim();
  const figure = blank ? '' : posterFigure(posterDone(doc));

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: k.width, height: k.height, paddingHorizontal: k.pad, paddingTop: k.top, paddingBottom: k.bottom,
        backgroundColor: T.paper, overflow: 'hidden',
      }}
    >
      <Text {...FIXED} numberOfLines={1} style={{ fontFamily: PRETENDARD[600], fontSize: k.eyebrowFs, lineHeight: k.eyebrowLh, letterSpacing: 0, color: T.print }}>
        {m.print.posterEyebrow({ y: now.getFullYear() })}
      </Text>
      <TitleLine goal={goal} figure={figure} unit={m.print.posterUnit} k={k} scale={scale} l={l} />

      {/* 색 지도(L2) — 화면의 지도와 같은 칸 · 색이지만 늘 LIGHT, 이름은 피드 크기로(POSTER_LABEL).
          칸 자리는 배율 1이면 그림의 픽셀(2배)에, 다른 배율(미리보기)이면 기기 픽셀에 맞추고, 이름의 줄은 배율 1의 칸에서 나눈다 */}
      <View style={{ marginTop: k.mapTop }}>
        <ColourMap
          themes={doc.themes}
          goal={goal}
          level="L2"
          width={POSTER_MAP}
          scale={scale}
          ratio={POSTER_RATIO}
          tokens={T}
          blank={blank}
          textScale={POSTER_LABEL}
          picture
        />
      </View>

      <View style={{ marginTop: 'auto', height: k.footH, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: k.markGap }}>
          <Mark variant="heart" size={k.mark} tokens={T} />
          <Text {...FIXED} style={{ fontFamily: PRETENDARD[700], fontSize: k.wordFs, lineHeight: k.wordLh, letterSpacing: k.wordTracking, color: T.printStrong }}>
            {m.chart.brand}
          </Text>
        </View>
        <Text {...FIXED} style={[{ fontFamily: PRETENDARD[500], fontSize: k.dateFs, lineHeight: k.dateLh, letterSpacing: 0, color: T.print }, NUM]}>
          {posterDate(now, l)}
        </Text>
      </View>
    </View>
  );
});
