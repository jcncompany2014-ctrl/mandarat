import React from 'react';
import { View } from 'react-native';
import { Text } from '../AppText';
import { IconBtn } from '../common';
import { GEO } from '../../theme/tokens';
import { ROLE } from '../../theme/type';
import { noOrphan } from '../../lib/text';
import type { M } from '../../theme/usePalette';

/**
 * 전체 화면 쪽의 머리(A.header 뼈대, 72) — 위 줄(인쇄된 한 줄, 또는 lead: '‹ 이전') · 제목(title 26/36)
 * · 오른쪽 닫기 글리프(44 손끝, 오른쪽 −10 · 위 26). 쪽 수는 위 줄 오른쪽에 인쇄된 숫자로(읽을 때는 '3쪽 중 1쪽').
 * 탭 막대 없이 화면을 덮는 쪽(한 주 돌아보기 · 한 해 마무리)이 쓴다 — 탭 화면은 common의 Header.
 */
export function PageHead({ M, eyebrow, lead, title, page, pageSay, onClose, closeLabel, closeTestID }: {
  M: M;
  /** 위 줄 왼쪽의 인쇄된 한 줄 */
  eyebrow?: string;
  /** 위 줄 왼쪽을 대신할 것('‹ 이전') — 있으면 eyebrow 대신 */
  lead?: React.ReactNode;
  title: string;
  /** 쪽 수('1/3') — 한 쪽뿐이면 비운다 */
  page?: string;
  /** 쪽 수를 읽는 말('3쪽 중 1쪽') */
  pageSay?: string;
  onClose: () => void;
  closeLabel: string;
  closeTestID?: string;
}) {
  return (
    <View style={{ marginHorizontal: GEO.gutter, minHeight: GEO.header, paddingTop: 12 }}>
      <View style={{ height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {lead ? (
          <View style={{ flexShrink: 1 }}>{lead}</View>
        ) : (
          <Text style={{ ...ROLE.folio, color: M.print, flexShrink: 1 }} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {eyebrow ?? ''}
          </Text>
        )}
        {!!page && (
          <Text style={{ ...ROLE.folio, color: M.print }} accessibilityLabel={pageSay} maxFontSizeMultiplier={1.4}>
            {page}
          </Text>
        )}
      </View>
      <Text accessibilityRole="header" style={{ ...ROLE.title, color: M.ink, paddingRight: 48 }} numberOfLines={2}>
        {noOrphan(title)}
      </Text>
      <View style={{ position: 'absolute', right: -10, top: 26 }}>
        <IconBtn M={M} name="close" label={closeLabel} onPress={onClose} testID={closeTestID} />
      </View>
    </View>
  );
}
