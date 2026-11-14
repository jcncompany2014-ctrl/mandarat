// 설정 화면의 줄 — 구역 머리(SetSection) · 견본 줄 이름(SwatchHead) · 안내 한 줄(SetNote) · 정보 표 줄 · 확인 대화상자.
// 설정 화면과 구역(src/screens/settings/*)이 같은 모양으로 쓴다. 줄 · 고르기 · 견본은 부품 상자(components/kit)에서.
// 목업 docs/design/mockups/a/settings.html: 구역 사이 24(머리 아래 첫 구역 12), 구역 이름 줄 바로 아래 줄(사이 없음).
import React from 'react';
import { Alert, Platform, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { RowRule, Section } from '../../components/kit';
import { msg } from '../../i18n';
import { NUM, ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';

/** 설정 화면의 자리 수치(목업 settings.html) */
export const SET = {
  /** 구역 사이 · 고정 머리 아래 첫 구역 */
  sectionGap: 24,
  firstGap: 12,
  /** 핵심 목표 줄 — 26/36 제목 한 줄 + 위아래 5 */
  goalH: 46,
  /** 견본 줄 위(구역 이름 줄 아래) · 같은 구역의 두 번째 견본 줄 앞 */
  swatchTop: 10,
  swatchGroupGap: 20,
  /** 목록 아래 안내 한 줄 · 알림 한 장 */
  noteTop: 6,
  noticeTop: 12,
  /** 정보: 마크 · 정보 표 이름 칸 · 링크 줄 */
  mark: 40,
  markTop: 10,
  markBottom: 14,
  colophonLabelW: 72,
  colophonPadY: 10,
  linksTop: 16,
  linksGap: 20,
  linksRowGap: 8,
} as const;

/** 확인 대화상자 — 웹은 window.confirm, 네이티브는 Alert(취소 단추는 지금 언어의 common.cancel) */
export function ask(title: string, message: string, ok: string, onOk: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: msg().common.cancel, style: 'cancel' },
    { text: ok, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

/**
 * 구역 머리 — 인쇄된 구역 이름(section 600 14 printStrong) + 오른쪽 인쇄된 글 하나(note, '화면 모드').
 * 위 24(첫 구역 12), 아래는 바로 줄. 이름은 화면 읽기의 머리(header).
 */
export function SetSection({ M, label, note, first = false }: { M: M; label: string; note?: string; first?: boolean }) {
  return <Section M={M} label={label} note={note} style={{ marginTop: first ? SET.firstGap : SET.sectionGap, marginBottom: 0 }} />;
}

/**
 * 같은 구역의 두 번째 견본 줄 이름 — 첫 줄의 이름('화면 모드')이 구역 머리 오른쪽에 있듯, 오른쪽 끝에 인쇄된 글(label 500 13 print).
 */
export function SwatchHead({ M, label }: { M: M; label: string }) {
  return (
    <View style={{ minHeight: 18, marginTop: SET.swatchGroupGap, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
      <Text style={{ ...ROLE.label, color: M.print }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** 목록 아래 인쇄된 안내 한 줄(note 500 12/18 print) */
export function SetNote({ M, text, live = false }: { M: M; text: string; live?: boolean }) {
  return (
    <Text accessibilityLiveRegion={live ? 'polite' : undefined} style={{ ...ROLE.note, color: M.print, marginTop: SET.noteTop }}>
      {text}
    </Text>
  );
}

/** 정보 표의 한 줄 — 왼쪽 인쇄된 이름(label print) · 오른쪽 값(ledger 500 14 먹). 줄 사이 머리카락 선(x 0부터) */
export function ColophonRow({ M, label, value, first }: { M: M; label: string; value: string; first?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${value}`}
      {...a11yLangProp()}
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: SET.colophonPadY }}
    >
      {!first && <RowRule M={M} inset={0} />}
      <Text style={{ ...ROLE.label, width: SET.colophonLabelW, color: M.print }} numberOfLines={1}>{label}</Text>
      <Text style={{ ...ROLE.ledger, ...NUM, flex: 1, color: M.ink }}>{value}</Text>
    </View>
  );
}
