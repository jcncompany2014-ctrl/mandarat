// 한 해 › 돌아보기 — 표 한 장을 쓴 동안(디자인 A · year.png). id null: 지금 쓰는 표 · 무료, 지난 표: 프로.
// 인쇄된 한 줄(2025년 한 해 돌아보기 / 기간) → 색 지도(L2) → 표가 채워진 모습(액자 넷) → 네 숫자(한 크기) →
// 한 해 달력 → 닳은 자리 → 돌아본 주 · 회고 → 한 줄 → 인쇄용 PDF. 잠긴 지난 표는 보관함 줄 하나와 '프로 알아보기'만.
import React, { memo, useMemo, useState } from 'react';
import { PixelRatio, Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { RowDivider, pressedRow } from '../../components/common';
import { Icon } from '../../components/Icon';
import { InLink, Section } from '../../components/kit';
import { ColourMap, MAP_MAX } from '../../components/chart';
import { ActivityChart, Figure, WearLegend } from '../../components/StatsCharts';
import { YearLedger } from '../../components/YearLedger';
import { useWindowDimensions } from '../../lib/screen';
import { GEO } from '../../theme/tokens';
import { ROLE } from '../../theme/type';
import { PRETENDARD } from '../../theme/fonts';
import type { M } from '../../theme/usePalette';
import { useUIActions } from '../../navigation/ui';
import { dateKey } from '../../store/MandaratContext';
import { archiveAsDoc, chartRange, yearLabel } from '../../lib/archive';
import { fillFrames, yearCalendar, yearDigest } from '../../lib/yearReview';
import { figureSize, frameCell } from './statFit';
import { TID } from '../../lib/testIds';
import { tap } from '../../lib/haptics';
import { useMsg } from '../../i18n/react';
import type { Messages } from '../../i18n';
import type { ArchivedChart, MandaratDoc } from '../../types';

const GUTTER = GEO.gutter;
/** 구역 사이(build-plan Wave 2) */
const SECTION_GAP = GEO.sectionGap;
/** 이 글자 크기부터 네 숫자를 두 줄(2×2)로 */
const STACK_SCALE = 1.35;
/** 네 숫자를 한 줄에 둘 가장 좁은 폭 */
const ROW_MIN_W = 320;
/** 네 숫자 사이 */
const FIG_GAP = 8;
/** 표가 채워진 모습 — 장면 수(분기) */
const FRAMES = 4;
/** 회고를 처음에 몇 줄까지 */
const NOTE_ROWS = 12;
/** 닳은 자리의 기준 — 4주(28일)에 한 날 수 */
const WEAR_SPAN = 28;

/** 'YYYY-MM-DD' → 그날 0시 */
function dayOf(key: string): Date {
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

function spanDays(from: string, to: string): number {
  return Math.max(1, Math.round((dayOf(to).getTime() - dayOf(from).getTime()) / 86400000) + 1);
}

/**
 * 닳은 자리 칸 값 — 기간 내내 한 날 수를 4주에 한 날 수(평균)로 줄인다. 그대로 넘기면 한 해 동안 쓴 칸은 모두 가장 진한 단계가 된다.
 * 한 번이라도 한 칸은 1 이상(빈칸과 갈리게).
 */
export function wearActivity(cellDays: readonly (readonly number[])[], days: number): number[][] {
  const k = WEAR_SPAN / Math.max(WEAR_SPAN, days);
  return cellDays.map((row) => row.map((n) => (n > 0 ? Math.max(1, Math.round(n * k)) : 0)));
}

export const YearReview = memo(function YearReview({ M, doc, archive, locked }: {
  M: M;
  /** 지금 문서 — 지금 쓰는 표(archive null)이거나, 지난 표를 그릴 때의 보기 설정 */
  doc: MandaratDoc;
  archive: ArchivedChart | null;
  locked: boolean;
}) {
  if (archive && locked) return <LockedLine M={M} archive={archive} />;
  return <ReviewPage M={M} doc={doc} archive={archive} />;
});

function ReviewPage({ M, doc, archive }: { M: M; doc: MandaratDoc; archive: ArchivedChart | null }) {
  const m = useMsg();
  const { openPrint } = useUIActions();
  const { width: winW, fontScale } = useWindowDimensions();
  const contentW = Math.max(0, winW - GUTTER * 2);
  const day = dateKey(new Date());

  // 그릴 표 · 기간 · 집중 — 지난 표는 문서 모양으로 바꿔 통계 코드가 그대로 읽는다
  const src = useMemo(() => {
    if (archive) {
      return { view: archiveAsDoc(archive, doc.settings), from: archive.from, to: archive.to, focus: archive.focusMinutes, goal: archive.centerGoal, note: archive.note ?? '' };
    }
    const { from, to } = chartRange(doc, new Date());
    return { view: doc, from, to, focus: (doc.focusMinutes ?? 0) - (doc.focusStart ?? 0), goal: doc.centerGoal, note: '' };
  }, [archive, doc, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const { view, from, to, focus, goal, note } = src;

  const digest = useMemo(() => yearDigest(view, from, to, focus), [view, from, to, focus]);
  const rows = useMemo(() => yearCalendar(view.dayLog, from, to), [view.dayLog, from, to]);
  const frames = useMemo(() => fillFrames(view, from, to, FRAMES), [view, from, to]);
  const wear = useMemo(() => wearActivity(digest.cellDays, spanDays(from, to)), [digest, from, to]);

  const range = m.fmt.range({ from: dayOf(from), to: dayOf(to) });
  const stacked = fontScale >= STACK_SCALE || contentW < ROW_MIN_W;
  // 지도는 본문 폭(아이패드는 520까지), 온 픽셀 자리에 가운데
  const mapW = Math.min(contentW, MAP_MAX);
  const mapLeft = PixelRatio.roundToNearestPixel((contentW - mapW) / 2);

  return (
    <View style={{ paddingBottom: 24 }}>
      <View style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
        {/* 인쇄된 한 줄 — 무엇의 돌아보기인지 · 기간(지금 쓰는 표면 그렇다고). 좁으면 기간이 아래 줄로 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 12 }}>
          <Text style={[ROLE.label, { color: M.print }]} accessibilityRole="header">
            {m.year.folio({ label: yearLabel(from, to) })}
          </Text>
          <Text style={[ROLE.label, { color: M.print }]}>
            {archive ? range : `${range}${m.core.dot}${m.year.currentChart}`}
          </Text>
        </View>
        {/* 표 한 장 — 색 지도(이름과 목표만, 읽기만) */}
        <View style={{ marginTop: 12, marginLeft: mapLeft }}>
          <ColourMap themes={view.themes} goal={goal} level="L2" width={mapW} />
        </View>

        <View testID={TID.yearFrames}>
          <Section M={M} label={m.year.framesTitle} style={{ marginTop: SECTION_GAP, marginBottom: 10 }} />
          <Frames M={M} m={m} frames={frames} width={contentW} />
        </View>

        <Numbers M={M} m={m} digest={digest} stacked={stacked} width={contentW} />

        <Section M={M} label={m.year.calendarTitle} style={{ marginTop: SECTION_GAP, marginBottom: 10 }} />
        <YearLedger M={M} rows={rows} />

        <Section M={M} label={m.year.wearTitle} note={m.year.wearRight} style={{ marginTop: SECTION_GAP, marginBottom: 10 }} />
        <View style={{ marginLeft: mapLeft }}>
          <ActivityChart M={M} doc={view} activity={wear} width={mapW} />
        </View>
        <WearLegend M={M} head={m.year.wearLegend} />

        {digest.weekNotes.length > 0 && (
          <>
            <Section M={M} label={m.year.weeksTitle} style={{ marginTop: SECTION_GAP }} />
            <WeekNotes M={M} m={m} notes={digest.weekNotes} />
          </>
        )}

        <Section M={M} label={m.year.notesTitle} style={{ marginTop: SECTION_GAP }} />
        <Reflections M={M} m={m} groups={digest.reflections} />

        {!!note.trim() && (
          <View
            accessible
            accessibilityLabel={`${m.year.noteLabel}, ${note.trim()}`}
            {...a11yLangProp()}
            style={{ marginTop: SECTION_GAP }}
          >
            <Section M={M} label={m.year.noteLabel} />
            <Text style={[ROLE.body, { color: M.ink }]}>{note.trim()}</Text>
          </View>
        )}

        <View style={{ marginTop: SECTION_GAP, alignSelf: 'flex-start' }} testID={TID.yearPrint}>
          <InLink M={M} label={m.year.printLink} onPress={() => openPrint(archive ? { archiveId: archive.id } : undefined)} />
        </View>
      </View>
    </View>
  );
}

// ── 네 숫자 ──────────────────────────────────────────────────────────────────

type Digest = ReturnType<typeof yearDigest>;

/**
 * 네 숫자, 한 크기(목업 .figs) — 기록한 날 · 가장 긴 연속 · 달성 · 집중. 이름(label) 위, 숫자(figureField 22/30) + 작은 단위 아래.
 * 괘선 · 상자 없이 넷이 한 줄에. 큰 글자 · 좁은 화면에서는 2×2. 숫자 크기는 넷 모두 같게 — 가장 긴 값이 칸에 한 줄로 들어가는 크기.
 */
function Numbers({ M, m, digest, stacked, width }: { M: M; m: Messages; digest: Digest; stacked: boolean; width: number }) {
  const cells = [
    { key: 'days', label: m.year.statDays, value: m.fmt.days({ n: digest.days }) },
    { key: 'streak', label: m.year.statStreak, value: m.fmt.days({ n: digest.longest }) },
    { key: 'achieved', label: m.year.statAchieved, value: m.stats.heroCells({ done: digest.achieved }), speech: m.year.achievedSpeech({ n: digest.achieved }) },
    { key: 'focus', label: m.year.statFocus, value: m.fmt.duration({ mins: Math.max(0, digest.focusMins) }) },
  ];
  const lines = stacked ? [cells.slice(0, 2), cells.slice(2)] : [cells];
  const per = lines[0].length;
  // 값은 한 줄 — 칸 폭에 들어가는 크기로(네이티브의 adjustsFontSizeToFit처럼, 웹에는 그것이 없다)
  const size = figureSize(cells.map((c) => c.value), (width - FIG_GAP * (per - 1)) / per);
  return (
    <View style={{ marginTop: 28, gap: 18 }}>
      {lines.map((line, li) => (
        <View key={li} style={{ flexDirection: 'row', gap: FIG_GAP }}>
          {line.map((c) => (
            <View
              key={c.key}
              accessible
              accessibilityLabel={`${c.label}, ${c.speech ?? c.value}`}
              {...a11yLangProp()}
              style={{ flex: 1, minWidth: 0, gap: 2 }}
            >
              <Text style={[ROLE.label, { color: M.print }]} numberOfLines={2} maxFontSizeMultiplier={STACK_SCALE}>{c.label}</Text>
              {/* 숫자는 한 줄 — 값 안에서 줄을 바꾸지 않는다(2시간 5분도 한 줄) */}
              <Figure M={M} text={c.value} size={size} adjust maxScale={STACK_SCALE} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── 표가 채워진 모습 ─────────────────────────────────────────────────────────

/** 네 장면 — 분기 끝마다의 작은 지도(L1)와 그날. 마지막(닫은 날 · 오늘)은 날짜를 먹으로 */
function Frames({ M, m, frames, width }: { M: M; m: Messages; frames: ReturnType<typeof fillFrames>; width: number }) {
  const cell = frameCell(width, frames.length);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {frames.map((f, i) => {
        const n = f.themes.reduce((s, th) => s + th.actions.filter((a) => a.done).length, 0);
        const label = m.fmt.monthDay({ d: dayOf(f.end) });
        const last = i === frames.length - 1;
        return (
          <View key={f.end} accessible accessibilityLabel={m.year.frameSpeech({ label, n })} {...a11yLangProp()} style={{ gap: 8, alignItems: 'flex-start' }}>
            {/* 지도 넷은 첫 화면 다음 프레임에(§4.6) */}
            <ColourMap themes={f.themes} level="L1" cell={cell} defer />
            <Text
              style={[ROLE.label, { lineHeight: 16, color: last ? M.ink : M.print }, last ? { fontFamily: PRETENDARD[600] } : null]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── 돌아본 주 · 회고 ─────────────────────────────────────────────────────────

function WeekNotes({ M, m, notes }: { M: M; m: Messages; notes: Digest['weekNotes'] }) {
  return (
    <View>
      {notes.map((w, i) => {
        const start = dayOf(w.week);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
        const range = m.fmt.range({ from: start, to: end });
        return (
          <View
            key={w.week}
            accessible
            accessibilityLabel={`${range}, ${w.note}`}
            {...a11yLangProp()}
            style={{ paddingVertical: 12 }}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <Text style={[ROLE.meta, { color: M.ink2 }]}>{range}</Text>
            <Text style={[ROLE.body, { color: M.ink, marginTop: 2 }]}>{w.note}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** 그날의 한 줄 — 달마다 묶어 오래된 것부터. 처음에는 NOTE_ROWS줄, '더 보기'로 그 자리에서 펼친다 */
function Reflections({ M, m, groups }: { M: M; m: Messages; groups: Digest['reflections'] }) {
  const [all, setAll] = useState(false);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  if (total === 0) {
    return (
      <View style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={[ROLE.note, { color: M.print }]}>{m.year.notesEmpty}</Text>
      </View>
    );
  }
  let left = all ? total : NOTE_ROWS;
  const shown = groups
    .map((g) => {
      const items = g.items.slice(0, Math.max(0, left));
      left -= items.length;
      return { month: g.month, items };
    })
    .filter((g) => g.items.length > 0);
  const more = !all && total > NOTE_ROWS;
  return (
    <View>
      {shown.map((g, gi) => {
        const y = Number(g.month.slice(0, 4));
        const mo = Number(g.month.slice(5, 7));
        return (
          <View key={g.month} style={{ marginTop: gi ? 14 : 4 }}>
            <Text style={[ROLE.label, { color: M.print, paddingBottom: 2 }]} accessibilityRole="header">
              {m.year.monthLong({ y, m: mo })}
            </Text>
            {g.items.map((e, i) => {
              const head = m.fmt.monthDayDow({ d: dayOf(e.date) });
              return (
                <View
                  key={e.date}
                  accessible
                  accessibilityLabel={`${m.fmt.dateLong({ d: dayOf(e.date) })}, ${e.text}`}
                  {...a11yLangProp()}
                  style={{ paddingVertical: 10 }}
                >
                  {i > 0 && <RowDivider M={M} inset={0} />}
                  <Text style={[ROLE.meta, { color: M.ink2 }]}>{head}</Text>
                  <Text style={[ROLE.body, { color: M.ink, marginTop: 2 }]}>{e.text}</Text>
                </View>
              );
            })}
          </View>
        );
      })}
      {more && (
        <Pressable
          onPress={() => { tap(); setAll(true); }}
          accessibilityRole="button"
          accessibilityLabel={m.year.notesMore({ n: total - NOTE_ROWS })}
          {...a11yLangProp()}
          style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed ? pressedRow(M) : null]}
        >
          <RowDivider M={M} inset={0} />
          <Text style={[ROLE.quiet, { color: M.ink }]}>{m.year.more}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── 잠긴 지난 표 ─────────────────────────────────────────────────────────────

/** 보관함 줄 하나(해 · 기간 · 핵심 목표 · '프로')와 '프로 알아보기' — 내용은 그리지 않는다 */
function LockedLine({ M, archive }: { M: M; archive: ArchivedChart }) {
  const m = useMsg();
  const { openPro } = useUIActions();
  const label = yearLabel(archive.from, archive.to);
  const range = m.fmt.range({ from: dayOf(archive.from), to: dayOf(archive.to) });
  const goal = archive.centerGoal.trim();
  return (
    <View style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
      <View
        accessible
        accessibilityLabel={[label, range, goal, m.common.proMark].filter(Boolean).join(', ')}
        {...a11yLangProp()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: GEO.row, paddingVertical: 8 }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ROLE.rowTitle, { color: M.ink }]}>{`${label}${m.core.dot}${range}`}</Text>
          {!!goal && <Text style={[ROLE.rowMeta, { color: M.ink2 }]} numberOfLines={2}>{goal}</Text>}
        </View>
        <Text style={[ROLE.rowRight, { color: M.print }]}>{m.common.proMark}</Text>
      </View>
      <Text style={[ROLE.note, { color: M.print, marginTop: 8 }]}>{m.year.lockedLine}</Text>
      <Pressable
        onPress={() => { tap(); openPro('archive'); }}
        testID={TID.yearLockedPro}
        accessibilityRole="button"
        accessibilityLabel={m.year.lockedLink}
        {...a11yLangProp()}
        hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
        style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', opacity: pressed ? 0.5 : 1 })}
      >
        <Text style={[ROLE.link, { color: M.ink }]}>{m.year.lockedLink}</Text>
        <Icon name="chevR" size={16} color={M.ink} style={{ marginRight: -4 }} />
      </Pressable>
    </View>
  );
}
