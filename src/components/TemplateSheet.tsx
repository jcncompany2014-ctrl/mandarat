import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { CloseBtn, LineRow, Sheet, useSheetDismiss } from './common';
import { TEMPLATES, type Template } from '../data/templates';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';
import { ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';

/**
 * 템플릿 고르기 — 설정(템플릿으로 새로 쓰기)과 온보딩이 함께 쓰는 떠 있는 시트.
 * 템플릿마다 한 줄: 이름 · 한 줄 설명 · 영역 8개 이름(두 줄까지). 아이콘은 두지 않는다.
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
    <Sheet M={M} onClose={onClose} ownClose pad returnFocusRef={returnFocusRef}>
      <TemplateList M={M} onPick={onPick} />
    </Sheet>
  );
}

/**
 * 제목이 있는 시트의 머리 — 제목(prompt 20/30) + 닫기 글리프(44 손끝, 동그라미 없음) 한 줄, 그 아래 인쇄된 설명(13/18)을 시트 폭 그대로.
 * 템플릿 고르기 · 설정의 저장본·라이선스 · 백업 불러오기가 같은 머리를 쓴다. 시트 안에서만 쓴다(×가 시트를 내린다).
 * 위치가 있는 시트(칸 · 영역)는 common.tsx의 SheetHeader를 쓴다.
 */
export function SheetHead({ M, title, body, closeTestID = TID.sheetClose }: {
  M: M;
  title: string;
  body?: string;
  /** 닫기(×)의 testID — 기본은 TID.sheetClose */
  closeTestID?: string;
}) {
  const dismiss = useSheetDismiss();
  return (
    <>
      <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: body ? 4 : 8 }}>
        <Text accessibilityRole="header" style={{ ...ROLE.prompt, flex: 1, color: M.ink }}>{title}</Text>
        <View style={{ marginRight: -10 }}>
          <CloseBtn M={M} onPress={() => dismiss()} testID={closeTestID} />
        </View>
      </View>
      {!!body && <Text style={{ ...ROLE.noteSheet, color: M.print, marginBottom: 16 }}>{body}</Text>}
    </>
  );
}

/** 시트 안쪽 — useSheetDismiss는 시트 안에서만 닿는다 */
function TemplateList({ M, onPick }: { M: M; onPick: (t: Template, close: () => void) => void }) {
  const dismiss = useSheetDismiss();
  const close = () => dismiss();
  const m = useMsg();
  const ed = m.editor;
  return (
    <View style={{ paddingBottom: 8 }}>
      <SheetHead M={M} title={ed.templateTitle} body={ed.templateBody} />
      {TEMPLATES.map((t, i) => {
        const areas = t.areas.map((a) => a.title).join(m.core.dot);
        return (
          <LineRow
            key={t.id}
            M={M}
            first={i === 0}
            last={i === TEMPLATES.length - 1}
            title={t.name}
            sub={
              <>
                <Text style={{ ...ROLE.rowMeta, color: M.ink2 }}>{t.desc}</Text>
                <Text style={{ ...ROLE.meta, color: M.ink2, marginTop: 2 }} numberOfLines={2}>
                  {areas}
                </Text>
              </>
            }
            accessibilityLabel={ed.templateA11y({ name: t.name, desc: t.desc })}
            accessibilityHint={ed.templateAreasHint({ areas: t.areas.map((a) => a.title).join(ed.listSep) })}
            onPress={() => onPick(t, close)}
            testID={TID.onbTemplate(t.id)}
          />
        );
      })}
    </View>
  );
}
