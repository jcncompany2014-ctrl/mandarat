import React from 'react';
import Svg, { Circle, Line, Polygon, Text as SvgText, TSpan } from 'react-native-svg';
import { PRETENDARD } from '../theme/fonts';
import { labelLines } from '../lib/labelFit';

export interface RadarDatum { pct: number; color: string; label?: string }

const LABEL_FS = 11.5;
// 축 끝 이름이 들어갈 바깥 여백(한글 4자 + 여유)
const LABEL_MARGIN = 60;
const LABEL_GAP = 10;

/**
 * 8영역 균형을 보여주는 만다라형 8각 레이더.
 * 각 축의 길이는 해당 영역 달성률(0~100)에 비례한다.
 * label이 있으면 축 끝에 영역 이름을 영역 색으로 적어, 점과 이름이 바로 이어지게 한다.
 */
export function LotusRadar({
  size = 220, data, accent, line, dot = true,
}: {
  size?: number;
  data: RadarDatum[]; // length 8
  accent: string;
  line: string;
  dot?: boolean;
}) {
  const C = size / 2;
  const hasLabels = data.some((d) => !!d.label);
  const maxR = C - (hasLabels ? LABEL_MARGIN : 18);
  const N = 8;
  const angle = (i: number) => (-90 + i * (360 / N)) * (Math.PI / 180);
  const pt = (i: number, r: number) => [C + r * Math.cos(angle(i)), C + r * Math.sin(angle(i))] as const;

  const ring = (r: number) =>
    Array.from({ length: N }, (_, i) => pt(i, r).join(',')).join(' ');

  const valuePts = data
    .slice(0, N)
    .map((d, i) => pt(i, maxR * Math.max(0.02, Math.min(1, d.pct / 100))).join(','))
    .join(' ');

  return (
    <Svg width={size} height={size}>
      {/* grid rings */}
      {[0.34, 0.67, 1].map((f, i) => (
        <Polygon key={i} points={ring(maxR * f)} fill="none" stroke={line} strokeWidth={1} />
      ))}
      {/* spokes */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = pt(i, maxR);
        return <Line key={i} x1={C} y1={C} x2={x} y2={y} stroke={line} strokeWidth={1} />;
      })}
      {/* value area */}
      <Polygon points={valuePts} fill={accent} fillOpacity={0.22} stroke={accent} strokeWidth={2} />
      {/* per-area dots */}
      {dot && data.slice(0, N).map((d, i) => {
        const [x, y] = pt(i, maxR * Math.max(0.02, Math.min(1, d.pct / 100)));
        return <Circle key={i} cx={x} cy={y} r={3.4} fill={d.color} />;
      })}
      {/* area labels — 좌우 끝 이름이 캔버스 밖으로 잘리지 않도록 남은 폭에 맞춰 줄인다 */}
      {hasLabels && data.slice(0, N).map((d, i) => {
        if (!d.label) return null;
        const [x, y] = pt(i, maxR + LABEL_GAP);
        const cos = Math.cos(angle(i));
        const sin = Math.sin(angle(i));
        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
        const room = anchor === 'start' ? size - x - 3 : anchor === 'end' ? x - 3 : Math.min(2 * Math.min(x, size - x) - 6, LABEL_FS * 9);
        const lines = labelLines(d.label, room, LABEL_FS);
        const lh = Math.round(LABEL_FS * 1.2);
        // 두 줄이면 위쪽 이름은 위로, 옆 이름은 반 줄 위로 올려 축 끝에서 균형 있게
        const lift = lines.length > 1 ? (sin < -0.3 ? lh : sin > 0.3 ? 0 : lh / 2) : 0;
        const dy = (sin > 0.3 ? 11 : sin < -0.3 ? -3 : 4) - lift;
        return (
          <SvgText key={`l${i}`} x={x} y={y + dy} fill={d.color} fontSize={LABEL_FS} fontWeight="700" fontFamily={PRETENDARD[700]} textAnchor={anchor}>
            {lines.length === 1
              ? lines[0]
              : lines.map((l, li) => (
                  <TSpan key={li} x={x} dy={li === 0 ? 0 : lh}>{l}</TSpan>
                ))}
          </SvgText>
        );
      })}
    </Svg>
  );
}
