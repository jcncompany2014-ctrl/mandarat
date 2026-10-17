// '한 해' 화면 — 돌아보기 · 보관함 · 지난 표 한 장(ui.yearView). V3-D가 돌아보기를, V4-B가 보관함과 지난 표를 채운다.
// 화면 안에서 쪽을 넘기면(보관함 → 지난 표 → 그 해 돌아보기) 안쪽 뒤로 가기 줄에 쌓고,
// 뒤로 가기(머리의 ‹ · 가장자리 밀기 · VoiceOver 문지르기)는 그 줄을 먼저 하나씩 되짚는다.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Header } from '../components/common';
import { usePalette } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useDoc } from '../store/MandaratContext';
import { usePro } from '../store/ProContext';
import { archiveAccess } from '../lib/archive';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';
import type { Messages } from '../i18n';
import type { YearView } from '../lib/contracts';
import { YearReview } from './year/YearReview';
import { YearShelf } from './year/YearShelf';
import { YearSheet } from './year/YearSheet';

function viewTitle(m: Messages, v: YearView): string {
  if (v.kind === 'review') return m.year.pageReview;
  if (v.kind === 'shelf') return m.year.shelf;
  return m.year.sheetTitle;
}

/** 두 쪽이 같은가 — 바깥에서 같은 쪽을 다시 열면 쌓지 않는다 */
function sameView(a: YearView, b: YearView): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'shelf') return true;
  return (a as { id: string | null }).id === (b as { id: string | null }).id;
}

export const Year = memo(function Year() {
  const M = usePalette();
  const m = useMsg();
  const { yearView } = useUIState();
  const { back, setYearView, setBackGuard } = useUIActions();
  const { doc } = useDoc();
  const { owned } = usePro();
  const access = archiveAccess(owned);

  // 안쪽 뒤로 가기 줄 — 화면 안에서 연 쪽만 쌓는다. 바깥(통계 · 설정 · 링크)에서 openYear로 바뀐 쪽이면 줄을 비운다.
  // 줄은 ref에 두고(뒤로 가기가 바로 읽는다), 깊이만 상태로 둬서 가드를 걸고 걷는다
  const stackRef = useRef<YearView[]>([]);
  const [depth, setDepth] = useState(0);
  const expected = useRef<YearView | null>(null);
  const shown = useRef<YearView>(yearView);
  useEffect(() => {
    const mine = expected.current !== null && sameView(expected.current, yearView);
    expected.current = null;
    if (!mine && !sameView(shown.current, yearView)) {
      stackRef.current = [];
      setDepth(0);
    }
    shown.current = yearView;
  }, [yearView]);

  /** 이 화면 안에서 다른 쪽으로 — 지금 쪽을 줄에 쌓는다(V4-B 보관함 · 지난 표가 부른다) */
  const open = useCallback((next: YearView) => {
    const cur = shown.current;
    if (sameView(cur, next)) return;
    stackRef.current = [...stackRef.current, cur];
    setDepth(stackRef.current.length);
    expected.current = next;
    setYearView(next);
  }, [setYearView]);

  /** 안쪽 줄 하나 되짚기 — 되짚었으면 true(뒤로 가기가 화면을 떠나지 않는다) */
  const popInner = useCallback((): boolean => {
    const s = stackRef.current;
    const prev = s[s.length - 1];
    if (!prev) return false;
    stackRef.current = s.slice(0, -1);
    setDepth(stackRef.current.length);
    expected.current = prev;
    setYearView(prev);
    return true;
  }, [setYearView]);

  // 줄이 비어 있지 않을 때만 뒤로 가기 앞에 묻는다. 화면을 떠나면 늘 걷는다
  useEffect(() => {
    setBackGuard(depth > 0 ? () => popInner() : null);
  }, [depth, popInner, setBackGuard]);
  useEffect(() => () => setBackGuard(null), [setBackGuard]);

  let body: React.ReactNode;
  if (yearView.kind === 'shelf') body = <YearShelf M={M} onOpen={open} />;
  else if (yearView.kind === 'sheet') body = <YearSheet M={M} id={yearView.id} onOpen={open} />;
  else if (yearView.id === null) body = <YearReview M={M} doc={doc} archive={null} locked={false} />;
  else {
    const a = (doc.archives ?? []).find((x) => x.id === yearView.id);
    // 없는 지난 표(지워졌거나 다른 기기의 링크) — 보관함을 보인다
    body = a
      ? <YearReview M={M} doc={doc} archive={a} locked={!access.review} />
      : <YearShelf M={M} onOpen={open} />;
  }

  return (
    <View testID={TID.yearPage}>
      <Header M={M} kr={viewTitle(m, yearView)} onBack={back} focusTitle stacked />
      {body}
    </View>
  );
});
