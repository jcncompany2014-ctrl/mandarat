import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { CloseBtn, LineRow, Sheet, useSheetDismiss } from './common';
import { TEMPLATES, type Template } from '../data/templates';
import type { M } from '../theme/usePalette';

/**
 * 템플릿 고르기 — 설정(템플릿으로 새로 쓰기)과 온보딩이 함께 쓰는 종이 시트.
 * 템플릿마다 괘선 한 줄: 이름 · 한 줄 설명 · 영역 8개 이름(두 줄까지). 아이콘은 두지 않는다.
 *
 * 고르면 onPick(t, close)만 부른다 — 확인은 부르는 쪽이 한다(지울 것이 있으면 묻기).
 * 시트는 그대로 떠 있으므로, 확인 창을 취소하면 다른 템플릿을 고를 수 있다.
 * 진행하기로 했으면 close()를 부르면 시트가 아래로 미끄러져 내려간 뒤 onClose가 불린다.
 */
export function TemplateSheet({
  M, onClose, onPick, returnFocusRef,
}: {
  M: M;
  onClose: () => void;
  onPick: (t: Template, close: () => void) => void;
  /** 닫힌 뒤 스크린리더 초점을 돌려줄 곳(시트를 연 버튼) */
  returnFocusRef?: React.RefObject<View | null>;
}) {
  return (
    <Sheet M={M} onClose={onClose} ownClose returnFocusRef={returnFocusRef}>
      <TemplateList M={M} onPick={onPick} />
    </Sheet>
  );
}

/**
 * 종이 시트의 머리 — 제목(17/'800') + 닫기(×) 한 줄, 그 아래 설명 한 줄을 시트 폭 그대로.
 * 템플릿 고르기 · 설정의 저장본·라이선스 · 백업 불러오기가 같은 머리를 쓴다. 시트 안에서만 쓴다(×가 시트를 내린다).
 */
export function SheetHead({ M, title, body }: { M: M; title: string; body?: string }) {
  const dismiss = useSheetDismiss();
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }}>{title}</Text>
        <CloseBtn M={M} onPress={() => dismiss()} />
      </View>
      {!!body && <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginBottom: 16 }}>{body}</Text>}
    </>
  );
}

/** 시트 안쪽 — useSheetDismiss는 시트 안에서만 닿는다 */
function TemplateList({ M, onPick }: { M: M; onPick: (t: Template, close: () => void) => void }) {
  const dismiss = useSheetDismiss();
  const close = () => dismiss();
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <SheetHead M={M} title="템플릿 고르기" body="영역 8개를 골라 둔 시작점이에요. 실천 칸은 비어 있어요." />
      {TEMPLATES.map((t, i) => {
        const areas = t.areas.map((a) => a.title).join(' · ');
        return (
          <LineRow
            key={t.id}
            M={M}
            first={i === 0}
            last={i === TEMPLATES.length - 1}
            title={t.name}
            sub={
              <>
                <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }}>{t.desc}</Text>
                <Text style={{ fontSize: 12, lineHeight: 17, fontWeight: '600', color: M.sub, marginTop: 4 }} numberOfLines={2}>
                  {areas}
                </Text>
              </>
            }
            accessibilityLabel={`${t.name}, ${t.desc}`}
            accessibilityHint={`영역: ${t.areas.map((a) => a.title).join(', ')}`}
            onPress={() => onPick(t, close)}
          />
        );
      })}
    </View>
  );
}
