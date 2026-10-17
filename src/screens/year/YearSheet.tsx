// 한 해 › 지난 표 한 장 — 보관함에서 연 지난 표를 인쇄된 표처럼. V4-B가 채운다(그때까지는 괘선 한 줄).
import React, { memo } from 'react';
import type { M } from '../../theme/usePalette';
import type { YearView } from '../../lib/contracts';
import { useMsg } from '../../i18n/react';
import { RuledLine } from './YearShelf';

export const YearSheet = memo(function YearSheet({ M }: { M: M; id: string; onOpen: (v: YearView) => void }) {
  const m = useMsg();
  return <RuledLine M={M} text={m.year.loading} />;
});
