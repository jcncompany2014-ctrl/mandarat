// 한 해 › 돌아보기 — 표 한 장을 쓴 동안을 인쇄된 수첩 한 쪽처럼(id null: 지금 쓰는 표 · 무료, 지난 표: 프로).
// 큰 해 숫자 · 기간 · 핵심 목표 · 두 줄 밑줄 → 네 숫자 → 한 해 달력 → 표가 채워진 모습 → 닳은 자리 → 돌아본 주 · 회고 → 한 줄 → 인쇄용 PDF.
// 잠긴 지난 표는 보관함 줄 하나와 '프로 알아보기'만.
import React, { memo, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { RowDivider, groupEdge, pressedRow } from '../../components/common';
import { MiniChart } from '../../components/GridMark';
import { ActivityChart, WearLegend } from '../../components/StatsCharts';
import { YearLedger } from '../../components/YearLedger';
import { useWindowDimensions } from '../../lib/screen';
import { NUM, RHYTHM, TYPE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { useUIActions } from '../../navigation/ui';
import { dateKey } from '../../store/MandaratContext';
import { archiveAsDoc, chartRange, yearLabel } from '../../lib/archive';
import { fillFrames, yearCalendar, yearDigest } from '../../lib/yearReview';
import { statValueSize } from './statFit';
import { TID } from '../../lib/testIds';
import { tap } from '../../lib/haptics';
import { useMsg } from '../../i18n/react';
import type { Messages } from '../../i18n';
import type { ArchivedChart, MandaratDoc } from '../../types';

const GUTTER = RHYTHM.gutter;
/** 이 글자 크기부터 네 숫자를 두 줄(2×2)로 */
const STACK_SCALE = 1.35;
/** 네 숫자를 한 줄에 둘 가장 좁은 폭 */
const ROW_MIN_W = 320;
/** 표가 채워진 모습 — 장면 수(분기)와 사이 */
const FRAMES = 4;
const FRAME_GAP = 10;
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

  return (
    <View style={{ paddingBottom: 24 }}>
      <View style={{ paddingHorizontal: GUTTER }}>
        {/* 큰 해 숫자 · 기간 · 핵심 목표 · 두 줄 밑줄 */}
        <Text
          style={[{ fontSize: 46, lineHeight: 52, fontWeight: '800', color: M.ink, letterSpacing: -1.5 }, NUM]}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={STACK_SCALE}
          accessibilityRole="header"
        >
          {yearLabel(from, to)}
        </Text>
        <Text style={[{ ...TYPE.caption, fontWeight: '600', color: M.sub, marginTop: 2 }, NUM]}>
          {archive ? range : `${range}${m.core.dot}${m.year.currentChart}`}
        </Text>
        {!!goal.trim() && (
          <Text style={{ ...TYPE.rowTitle, color: M.ink, marginTop: 12 }}>{goal.trim()}</Text>
        )}
        <DoubleRule M={M} />

        <Numbers M={M} m={m} digest={digest} stacked={stacked} width={contentW} />
      </View>

      <SectionHead M={M} title={m.year.calendarTitle} />
      <View style={{ paddingHorizontal: GUTTER }}>
        <YearLedger M={M} rows={rows} />
      </View>

      <SectionHead M={M} title={m.year.framesTitle} />
      <Frames M={M} m={m} frames={frames} cellShape={view.settings.cellShape} width={contentW} />

      <SectionHead M={M} title={m.year.wearTitle} right={m.year.wearRight} />
      <View style={{ paddingHorizontal: GUTTER }}>
        <ActivityChart M={M} doc={view} activity={wear} width={contentW} />
        <WearLegend M={M} head={m.year.wearLegend} />
      </View>

      {digest.weekNotes.length > 0 && (
        <>
          <SectionHead M={M} title={m.year.weeksTitle} />
          <WeekNotes M={M} m={m} notes={digest.weekNotes} />
        </>
      )}

      <SectionHead M={M} title={m.year.notesTitle} />
      <Reflections M={M} m={m} groups={digest.reflections} />

      {!!note.trim() && (
        <View style={{ paddingHorizontal: GUTTER, marginTop: RHYTHM.sectionTop + 10 }}>
          <View accessible accessibilityLabel={`${m.year.noteLabel}, ${note.trim()}`} {...a11yLangProp()} style={{ paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}>
            <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub }}>{m.year.noteLabel}</Text>
            <Text style={{ fontSize: 16, lineHeight: 23, color: M.ink, marginTop: 4 }}>{note.trim()}</Text>
          </View>
        </View>
      )}

      <View style={{ paddingHorizontal: GUTTER, marginTop: RHYTHM.sectionTop }} testID={TID.yearPrint}>
        <Pressable
          onPress={() => { tap(); openPrint(archive ? { archiveId: archive.id } : undefined); }}
          accessibilityRole="button"
          accessibilityLabel={m.year.printLink}
          {...a11yLangProp()}
          hitSlop={6}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{`${m.year.printLink} ›`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** 장부의 두 줄 밑줄 — 1px 먹선 두 개, 2px 사이(한 주 돌아보기와 같다) */
function DoubleRule({ M }: { M: M }) {
  return (
    <View style={{ marginTop: 14, gap: 2 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: 1, backgroundColor: M.ink }} />
      <View style={{ height: 1, backgroundColor: M.ink }} />
    </View>
  );
}

/** 종이 위 작은 제목 한 줄(카드 없이) — 통계의 구역 머리와 같은 자리 */
function SectionHead({ M, title, right }: { M: M; title: string; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 34, paddingBottom: 12, minHeight: 44 }}>
      <Text style={{ flex: 1, ...TYPE.section, color: M.ink }} accessibilityRole="header">{title}</Text>
      {!!right && <Text style={[{ fontSize: 12.5, fontWeight: '600', color: M.sub }, NUM]}>{right}</Text>}
    </View>
  );
}

// ── 네 숫자 ──────────────────────────────────────────────────────────────────

type Digest = ReturnType<typeof yearDigest>;

/** 괘선 한 줄에 네 칸 — 기록한 날 · 가장 긴 연속 · 달성 · 집중. 큰 글자 · 좁은 화면에서는 2×2 */
function Numbers({ M, m, digest, stacked, width }: { M: M; m: Messages; digest: Digest; stacked: boolean; width: number }) {
  const cells = [
    { key: 'days', label: m.year.statDays, value: m.fmt.days({ n: digest.days }) },
    { key: 'streak', label: m.year.statStreak, value: m.fmt.days({ n: digest.longest }) },
    { key: 'achieved', label: m.year.statAchieved, value: `${digest.achieved}/64`, speech: m.year.achievedSpeech({ n: digest.achieved }) },
    { key: 'focus', label: m.year.statFocus, value: m.fmt.duration({ mins: Math.max(0, digest.focusMins) }) },
  ];
  const lines = stacked ? [cells.slice(0, 2), cells.slice(2)] : [cells];
  // 값은 한 줄 — 칸 안쪽(좌우 여백 16 · 괘선 1을 뺀 폭)에 들어가는 크기로(네이티브의 adjustsFontSizeToFit처럼 칸마다)
  const inner = width / lines[0].length - 17;
  return (
    <View style={{ marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}>
      {lines.map((line, li) => (
        <View key={li} style={{ flexDirection: 'row', borderTopWidth: li ? 1 : 0, borderColor: M.line }}>
          {line.map((c, ci) => (
            <View
              key={c.key}
              accessible
              accessibilityLabel={`${c.label}, ${c.speech ?? c.value}`}
              {...a11yLangProp()}
              style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingLeft: ci ? 10 : 2, paddingRight: 6, borderLeftWidth: ci ? 1 : 0, borderColor: M.line }}
            >
              {/* 숫자를 위에 — 이름이 두 줄로 접혀도 네 숫자의 높이가 맞는다. 긴 값(2시간 5분)도 한 줄 — 값 안에서 줄을 바꾸지 않는다 */}
              <Text
                style={[{ fontSize: statValueSize([c.value], inner), lineHeight: 26, fontWeight: '800', color: M.ink }, NUM]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={STACK_SCALE}
              >
                {c.value}
              </Text>
              <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: '600', color: M.sub, marginTop: 4 }} numberOfLines={3} maxFontSizeMultiplier={STACK_SCALE}>
                {c.label}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── 표가 채워진 모습 ─────────────────────────────────────────────────────────

/** 네 장면 — 분기 끝마다의 작은 표와 그날 */
function Frames({ M, m, frames, cellShape, width }: {
  M: M; m: Messages; frames: ReturnType<typeof fillFrames>; cellShape: MandaratDoc['settings']['cellShape']; width: number;
}) {
  const size = Math.max(40, Math.floor((width - FRAME_GAP * (frames.length - 1)) / Math.max(1, frames.length)));
  return (
    <View style={{ paddingHorizontal: GUTTER, flexDirection: 'row', gap: FRAME_GAP }}>
      {frames.map((f) => {
        const n = f.themes.reduce((s, th) => s + th.actions.filter((a) => a.done).length, 0);
        const label = m.fmt.monthDay({ d: dayOf(f.end) });
        return (
          <View key={f.end} accessible accessibilityLabel={m.year.frameSpeech({ label, n })} {...a11yLangProp()} style={{ width: size }}>
            <MiniChart themes={f.themes} cellShape={cellShape} size={size} />
            <Text style={[{ fontSize: 11.5, lineHeight: 15, fontWeight: '600', color: M.sub, marginTop: 6 }, NUM]} numberOfLines={1}>
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
    <View style={{ paddingHorizontal: GUTTER }}>
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
            style={[groupEdge(M, i === 0, i === notes.length - 1), { paddingVertical: 12, paddingHorizontal: 2 }]}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <Text style={[{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: M.sub }, NUM]}>{range}</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: M.ink, marginTop: 3 }}>{w.note}</Text>
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
      <View style={{ paddingHorizontal: GUTTER }}>
        <View style={[groupEdge(M, true, true), { minHeight: 48, justifyContent: 'center', paddingHorizontal: 2 }]}>
          <Text style={{ ...TYPE.caption, color: M.sub }}>{m.year.notesEmpty}</Text>
        </View>
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
    <View style={{ paddingHorizontal: GUTTER }}>
      {shown.map((g, gi) => {
        const y = Number(g.month.slice(0, 4));
        const mo = Number(g.month.slice(5, 7));
        const lastGroup = gi === shown.length - 1;
        return (
          <View key={g.month} style={{ marginTop: gi ? 14 : 0 }}>
            <Text style={[{ ...TYPE.caption, fontWeight: '700', color: M.ink, paddingBottom: 6 }, NUM]} accessibilityRole="header">
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
                  style={[groupEdge(M, i === 0, i === g.items.length - 1 && !(lastGroup && more)), { paddingVertical: 11, paddingHorizontal: 2 }]}
                >
                  {i > 0 && <RowDivider M={M} inset={0} />}
                  <Text style={[{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: M.sub }, NUM]}>{head}</Text>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: M.ink, marginTop: 3 }}>{e.text}</Text>
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
          style={({ pressed }) => [groupEdge(M, false, true), { minHeight: 44, paddingHorizontal: 2, justifyContent: 'center' }, pressed ? pressedRow(M) : null]}
        >
          <RowDivider M={M} inset={0} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{m.year.more}</Text>
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
    <View style={{ paddingHorizontal: GUTTER }}>
      <View
        accessible
        accessibilityLabel={[label, range, goal, m.common.proMark].filter(Boolean).join(', ')}
        {...a11yLangProp()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 12, paddingHorizontal: 2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[{ ...TYPE.rowTitle, color: M.ink }, NUM]}>{`${label}${m.core.dot}${range}`}</Text>
          {!!goal && <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }} numberOfLines={2}>{goal}</Text>}
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>{m.common.proMark}</Text>
      </View>
      <Text style={{ ...TYPE.caption, color: M.sub, marginTop: 12 }}>{m.year.lockedLine}</Text>
      <Pressable
        onPress={() => { tap(); openPro('archive'); }}
        testID={TID.yearLockedPro}
        accessibilityRole="button"
        accessibilityLabel={m.year.lockedLink}
        {...a11yLangProp()}
        hitSlop={6}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', opacity: pressed ? 0.5 : 1 })}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{`${m.year.lockedLink} ›`}</Text>
      </Pressable>
    </View>
  );
}
