import React, { memo, useEffect, useMemo } from 'react';
import { PanResponder, View } from 'react-native';
import { AreaPage } from './area/AreaPage';
import { useUIActions } from '../navigation/ui';
import { useDoc } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { announce, screenReader } from '../lib/useReducedMotion';
import { neighborArea, pageSpeech } from '../lib/areaPage';
import { TID } from '../lib/testIds';

/** 왼쪽 가장자리 쓸기는 Root의 '뒤로'가 받는다 — 이 안에서 시작한 쓸기로는 영역을 넘기지 않는다 */
const EDGE = 28;

/**
 * 이전·다음(넘기기 줄 또는 쓸기)으로 넘겨 온 영역 — 다음 영역 화면이 그려질 때 한 번 읽어 준다.
 * Root가 영역마다 이 화면을 새로 그리므로(key = ti) 화면 밖에 둔다.
 */
let pagedTo: number | null = null;

/**
 * 영역 화면 — 만다라트 탭의 크게 보기와 같은 영역 화면(AreaPage): 머리(‹ 온 곳 · 영역 이름 · 4/8 · ···) · 블록 ·
 * 넘기기 줄 · 이번 주 습관 · 그 밖의 실천. 홈 · 오늘 · 통계에서 영역을 눌러 들어온다.
 * embedded: 펼침(V5-A)의 오른쪽 쪽에 곁들인 영역 화면 — 왼쪽 만다라트 탭이 크게 보는 블록을 따라간다.
 * 뒤로 가기·제목으로 초점 옮기기·이전/다음(넘기기 줄·쓸기)·블록이 없다 — 블록과 넘기기는 왼쪽 쪽에 있다.
 */
export const Detail = memo(function Detail({ ti, embedded = false }: { ti: number; embedded?: boolean }) {
  const { doc } = useDoc();
  const { go, back } = useUIActions();

  // 넘겨 온 영역이면 제목으로 초점이 옮겨진 뒤(Header focusTitle) 어느 영역인지 읽어 준다
  useEffect(() => {
    if (pagedTo !== ti) return;
    pagedTo = null;
    if (screenReader()) announce(pageSpeech(doc, ti));
    // 처음 그려질 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = (dir: -1 | 1) => {
    tap();
    const to = neighborArea(ti, dir);
    pagedTo = to;
    go('detail', to);
  };

  // 좌우로 쓸어 이전·다음 영역으로 (세로 스크롤은 그대로)
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.x0 >= EDGE && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -60 || g.vx < -0.6) page(1);
          else if (g.dx > 60 || g.vx > 0.6) page(-1);
        },
      }),
    // page는 ti·go만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ti, go],
  );

  return (
    <View {...(embedded ? null : swipe.panHandlers)} onAccessibilityEscape={embedded ? undefined : back}>
      <AreaPage
        ti={ti}
        part={embedded ? 'rest' : 'all'}
        onBack={embedded ? undefined : back}
        backTestID={TID.detailBack}
        onStep={embedded ? undefined : page}
        focusTitle={!embedded}
      />
    </View>
  );
});
