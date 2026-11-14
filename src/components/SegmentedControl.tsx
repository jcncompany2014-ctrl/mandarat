import React from 'react';
import type { AccessibilityRole } from 'react-native';
import { Segment, type SegOption } from './kit/Segment';
import type { M } from '../theme/usePalette';

export type { SegOption };

/**
 * 분절 선택기 — 예전 이름 · 예전 속성 그대로, 그림은 kit의 Segment(tile 받침, 고른 칸은 먹 칠 + 종이색 글자).
 * - variant 'track' · 'underline' 모두 받침으로 그린다(디자인 A에는 밑줄 선택기가 없다 — 유형 고르기도 받침).
 * - compact는 받기만 한다(받침은 한 높이 40).
 * role: 'tab'(기본) → iOS 버튼 + 선택됨 / 안드로이드 · 웹 탭 + 탭 목록, 'radio' → 라디오 + 라디오 묶음.
 * 고를 때 짧은 딸깍(select). 새 코드는 kit의 Segment를 쓴다.
 */
export function SegmentedControl<T extends string>({
  M, options, value, onChange, role = 'tab',
}: {
  M: M;
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  role?: AccessibilityRole;
  compact?: boolean;
  variant?: 'track' | 'underline';
}) {
  return <Segment M={M} options={options} value={value} onChange={onChange} role={role} />;
}
