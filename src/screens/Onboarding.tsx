import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from '../lib/screen';
import { Text, a11yLangProp } from '../components/AppText';
import { Button, RuledNotice, useKeyboardHeight } from '../components/common';
import { Field, Row, TextLink } from '../components/kit';
import { MAP_LABEL, Mark, keepWords, mapLabel } from '../components/chart';
import { Icon } from '../components/Icon';
import { PaperDots } from '../components/PaperDots';
import { TemplateSheet } from '../components/TemplateSheet';
import { usePalette, type M } from '../theme/usePalette';
import { ROLE } from '../theme/type';
import { GEO } from '../theme/tokens';
import { PRETENDARD } from '../theme/fonts';
import { alpha } from '../theme/moods';
import { CHART_POS, CLOCKWISE } from '../theme/chart';
import { EASE } from '../theme/motion';
import { fitBox, longestWord } from '../lib/text';
import { PRETENDARD_GLYPHS } from '../lib/labelFit';
import { lang, type Lang } from '../i18n';
import { useMandarat } from '../store/MandaratContext';
import { templateThemes, type Template } from '../data/templates';
import { tap } from '../lib/haptics';
import { announce, reducedMotion, useReducedMotion } from '../lib/useReducedMotion';
import { getSyncStatus, probeRemote, setSyncEnabled } from '../lib/syncStatus';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';
import { offerFor, problemLine } from './settings/syncView';

/**
 * 쪽의 박자(목업 docs/design/mockups/a/onboarding.html, 390 × 844).
 * 작은 화면(높이 700 미만 — 375 × 667)은 사이를 조금 좁히고 미리보기 칸을 56으로 — 키보드가 없을 때 한 화면에 든다.
 */
const RHYTHM = {
  tall: { top: 18, offer: 24, question: 36, sub: 10, field: 28, preview: 34 },
  short: { top: 8, offer: 16, question: 24, sub: 8, field: 20, preview: 24 },
} as const;
const SHORT_H = 700;

/** 브랜드 줄 — 24 높이, 마크(L0 heart) 18 + 8 + '만다라트' */
const BRAND = { h: 24, mark: 18, gap: 8 } as const;

/** 목표 칸 위 이름표와 칸 사이 8 · 칸과 예시 줄 사이 10 · 예시 낱말의 누르는 자리(20 + 12 × 2 = 44) */
const FIELD_BLOCK = { label: 8, examples: 10, hit: 12, markGap: 4 } as const;

/** 미리보기 3×3 — 낱칸 64(작은 화면 56) · 사이 6 · 모서리 12 · 글 안쪽 4, 아래 알림까지 12. 누를 수 없다 */
const PREVIEW = { tile: 64, tileShort: 56, gap: 6, radius: GEO.rField, pad: 4, note: 12 } as const;

/** 미리보기 칸 글(목업 .cell 600 13/17 −0.02em · 가운데 700) — 영역 이름 3줄, 목표 4줄까지, 큰 크기부터 */
const TILE_TEXT = {
  head: { sizes: [13, 12, 11, 10], lines: 3, weight: 600 },
  core: { sizes: [13, 12, 11, 10, 9], lines: 4, weight: 700 },
  lineRatio: 17 / 13,
  tracking: -0.02,
} as const;

/** 아래 막대 — 위 8, 단추와 글 링크 사이 14, 아래 24(홈 표시줄이 있으면 그 높이 · 작은 화면 16 · 키보드 위 12) */
const BAR = { top: 8, gap: 14, bottom: 24, bottomShort: 16, onKeyboard: 12 } as const;

/** 키보드가 올라와 목표 칸을 가릴 때 — 칸 아래(예시 줄까지)에서 이만큼 더 보이게 스크롤 */
const KEYBOARD_ROOM = 8;

const face = (w: 400 | 500 | 600 | 700, fontSize: number, lineHeight: number): TextStyle => ({
  fontFamily: PRETENDARD[w], fontSize, lineHeight, letterSpacing: 0,
});

/** ROLE에 없는 글자 모양(목업 onboarding.html) — 웨이브 4(R2)가 ROLE로 옮긴다 */
const ONB_TYPE = {
  /** 질문 아래 한 줄 400 15/24 ink2 */
  sub: face(400, 15, 24),
  /** 예시 한 줄 400 13/20 print */
  example: face(400, 13, 20),
} as const;

interface TileLabel { text: string; fs: number; lh: number; lines: number }

/**
 * 미리보기 칸 하나의 글 — 큰 크기부터 어절을 끊지 않고 들어가는 크기(Pretendard 폭, 한 음절 낱말은 옆 낱말에 붙여서).
 * 가장 작은 크기에서도 칸보다 긴 낱말(Relationships)은 지도의 맞추기(mapLabel)를 이 칸 크기로 늘려 써서
 * 자연스러운 자리에서 붙임표로 나눈다.
 */
function tileLabel(text: string, kind: 'head' | 'core', tile: number, l: Lang): TileLabel {
  const t = text.trim();
  const spec = TILE_TEXT[kind];
  const inner = tile - 2 * PREVIEW.pad;
  const kept = keepWords(t);
  const f = fitBox(kept, inner, inner, spec.sizes, spec.lines, TILE_TEXT.lineRatio, PRETENDARD_GLYPHS, l);
  if (longestWord(kept, f.fs, PRETENDARD_GLYPHS, l) <= inner) return { text: kept, ...f };
  const k = spec.sizes[0] / MAP_LABEL[kind].sizes[0];
  const fit = mapLabel(t, kind, inner / k + 2 * MAP_LABEL.pad, inner / k, l);
  return { text: fit.text, fs: fit.fs * k, lh: Math.round(fit.lh * k), lines: fit.lines };
}

/** 영역 이름이 하나씩 나타나는 간격 · 한 칸의 시간(템플릿을 고를 때) */
const REVEAL_STAGGER = 60;
const REVEAL_MS = 180;

/**
 * 가운데 블록 미리보기(목업 .grid) — 둘레 여덟 칸은 옅은 영역 색(tint) 위에 영역 이름(dyeText),
 * 가운데 칸은 먹(core) 위에 적고 있는 목표(onCore). 진한 영역 색 칸은 쓰지 않는다(표의 16칸만 진하다).
 * 그림 하나로 읽힌다(누를 수 없다). 템플릿을 고르면(revealKey) 영역 이름이 왼쪽 위부터 시계 방향으로 나타난다.
 */
const GoalPreview = memo(function GoalPreview({
  M, goal, emptyCore, areas, tile, revealKey, label,
}: {
  M: M;
  goal: string;
  /** 목표가 비었을 때 가운데 칸에 옅게 적는 말(핵심 목표) */
  emptyCore: string;
  areas: readonly string[];
  tile: number;
  revealKey: string;
  label: string;
}) {
  const l = lang();
  const reduced = useReducedMotion();
  const names = Array.from({ length: 8 }, (_, ti) => areas[ti]?.trim() ?? '');
  const nameKey = names.join('\n');
  const heads = useMemo(() => nameKey.split('\n').map((n) => tileLabel(n, 'head', tile, l)), [nameKey, tile, l]);
  const core = useMemo(() => tileLabel(goal || emptyCore, 'core', tile, l), [goal, emptyCore, tile, l]);

  // 영역 이름 — 처음엔 보이는 채로. 새 이름이 한 프레임 먼저 보였다가 사라지지 않게 그리기 전에(layout effect) 감춘다
  const shown = useRef(Array.from({ length: 8 }, () => new Animated.Value(1))).current;
  const firstKey = useRef(revealKey);
  useLayoutEffect(() => {
    if (revealKey === firstKey.current) return;
    firstKey.current = revealKey;
    if (reduced) { shown.forEach((v) => v.setValue(1)); return; }
    shown.forEach((v) => v.setValue(0));
    const anim = Animated.stagger(
      REVEAL_STAGGER,
      CLOCKWISE.map((ti) => Animated.timing(shown[ti], { toValue: 1, duration: REVEAL_MS, easing: EASE.out, useNativeDriver: true })),
    );
    anim.start();
    return () => anim.stop();
  }, [revealKey, reduced, shown]);

  const size = tile * 3 + PREVIEW.gap * 2;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size }}>
      {Array.from({ length: 9 }, (_, slot) => {
        const box = {
          position: 'absolute' as const,
          left: (slot % 3) * (tile + PREVIEW.gap), top: Math.floor(slot / 3) * (tile + PREVIEW.gap),
          width: tile, height: tile, borderRadius: PREVIEW.radius, padding: PREVIEW.pad,
          alignItems: 'center' as const, justifyContent: 'center' as const,
        };
        if (slot === 4) {
          return (
            <View key="core" style={[box, { backgroundColor: M.core }]}>
              <TileText lab={core} kind="core" color={goal ? M.onCore : alpha(M.onCore, 0.6)} />
            </View>
          );
        }
        const ti = CHART_POS.indexOf(slot);
        return (
          <Animated.View key={slot} style={[box, { backgroundColor: M.tint[ti], opacity: shown[ti] }]}>
            <TileText lab={heads[ti]} kind="head" color={M.dyeText[ti]} />
          </Animated.View>
        );
      })}
    </View>
  );
});

function TileText({ lab, kind, color }: { lab: TileLabel; kind: 'head' | 'core'; color: string }) {
  if (!lab.text) return null;
  return (
    <Text
      style={{
        fontFamily: PRETENDARD[TILE_TEXT[kind].weight], fontSize: lab.fs, lineHeight: lab.lh,
        letterSpacing: Math.round(TILE_TEXT.tracking * lab.fs * 100) / 100, color, textAlign: 'center',
      }}
      numberOfLines={lab.lines}
      maxFontSizeMultiplier={1}
    >
      {lab.text}
    </Text>
  );
}

/**
 * 처음 화면(docs/design/build-plan.md §1 onboarding) — 질문 하나, 목표 칸 하나, 가운데 블록의 작고 차분한 미리보기, 주 단추 하나.
 * 위에서부터: 브랜드 줄(마크 + 만다라트) · (iOS) iCloud 기록 가져오기 · 질문 · 한 줄 설명 · 핵심 목표 칸 · 예시 한 줄 ·
 * 3×3 미리보기(영역은 옅은 색 + 영역 색 글자, 가운데는 먹 위의 목표) · 알림 한 줄.
 * 아래 막대(스크롤 밖, 키보드 위): 주 단추 — 비어 있으면 '목표는 나중에 쓸게요', 적으면 '시작하기', 템플릿을 고르면 '이 표로 시작하기' —
 * 와 글 링크 '템플릿으로 시작하기'. 키보드가 올라와 목표 칸을 가리면 칸이 보이게 스크롤한다(375 × 667에서도).
 */
export function Onboarding() {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const short = winH < SHORT_H;
  const R = short ? RHYTHM.short : RHYTHM.tall;
  const tile = short ? PREVIEW.tileShort : PREVIEW.tile;
  const keyboard = useKeyboardHeight();
  const { doc, completeOnboarding, applyTemplate, recoveredCopy, dismissRecovered } = useMandarat();
  const [goal, setGoal] = useState('');
  const [focused, setFocused] = useState(false);
  // 고른 템플릿 — 바로 시작하지 않고 미리보기에 영역을 먼저 보여 준다
  const [picked, setPicked] = useState<Template | null>(null);
  const [sheet, setSheet] = useState(false);
  const t = useMsg();
  const o = t.onboarding;
  /** 목표 예시 — 숫자가 들어간 구체적인 목표(연도는 넣지 않는다). 누르면 입력칸만 채운다 */
  const examples = [o.ex1, o.ex2, o.ex3];
  // iCloud에 다른 기기 기록이 있나 — iOS에서만, 맞추기를 켜지 않고 한 번 본다(묻는 창은 없다)
  const [offer, setOffer] = useState(false);
  const [importing, setImporting] = useState<'busy' | 'failed' | null>(null);
  const [failNote, setFailNote] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let live = true;
    probeRemote().then((p) => { if (live) setOffer(offerFor(p)); }, () => {});
    return () => { live = false; };
  }, []);

  // 가져오기 — 맞추기를 'iCloud 기록으로'(adopt) 켠다. 가져온 문서가 시작을 마친 문서라 그대로 첫 화면으로 넘어간다
  const importICloud = () => {
    if (importing === 'busy') return;
    tap();
    Keyboard.dismiss();
    setImporting('busy');
    announce(t.sync.onbBusy);
    void setSyncEnabled(true, 'adopt').then(() => {
      const s = getSyncStatus();
      if (s.phase === 'problem' || !s.enabled) {
        setFailNote(problemLine(s.problem, t)?.title);
        setImporting('failed');
        announce(t.sync.onbFailed);
      } else setImporting(null);
    }, () => {
      setFailNote(undefined);
      setImporting('failed');
      announce(t.sync.onbFailed);
    });
  };

  const typed = goal.trim();

  const start = () => {
    tap();
    Keyboard.dismiss();
    if (picked) applyTemplate(typed || picked.centerGoal, templateThemes(picked));
    else completeOnboarding(goal);
  };

  // 템플릿 시트가 닫히면 스크린리더 초점을 그 시트를 연 글 링크로 돌려준다
  const templateBtn = useRef<View>(null);

  const pickTemplate = (tpl: Template, close: () => void) => {
    tap();
    // 목표를 아직 안 적었으면(또는 앞서 고른 템플릿의 목표 그대로면) 이 템플릿의 목표를 넣어 둔다 — 고쳐 쓸 수 있다
    if (!typed || typed === picked?.centerGoal) setGoal(tpl.centerGoal);
    setPicked(tpl);
    announce(o.templateAreas({ name: tpl.name }));
    close();
  };

  const unpick = () => {
    tap();
    if (picked && typed === picked.centerGoal) setGoal('');
    setPicked(null);
    announce(o.defaultAreas);
  };

  const areas = picked ? picked.areas.map((a) => a.title) : doc.themes.map((th) => th.title);
  const previewLabel = t.chart.sketchSay({
    goal: typed || t.chart.sketchEmpty,
    areas: areas.map((a) => a.trim()).filter(Boolean).join(t.chart.sep),
  });

  // 스크린리더 이름은 보이는 글 그대로(음성 제어로 부를 수 있게) — 덧붙일 말은 힌트로
  let cta: { label: string; hint: string };
  if (picked) cta = { label: o.startTemplate, hint: o.startTemplateHint({ name: picked.name }) };
  else if (typed) cta = { label: o.start, hint: o.startHint };
  else cta = { label: o.later, hint: o.laterHint };

  // 키보드가 올라와(스크롤 창이 줄어) 목표 칸이 가려지면 칸 아래 끝(예시 줄까지)이 보이게 올린다 — 칸 위가 넘어가지 않을 만큼만
  const scroller = useRef<ScrollView>(null);
  const scrollTop = useRef(0);
  const fieldBlock = useRef({ y: 0, h: 0 });
  const [viewH, setViewH] = useState(0);
  useEffect(() => {
    if (!focused || viewH <= 0) return;
    const { y, h } = fieldBlock.current;
    const need = y + h + KEYBOARD_ROOM - viewH;
    if (need > scrollTop.current) scroller.current?.scrollTo({ y: Math.min(need, y), animated: !reducedMotion() });
  }, [focused, viewH]);

  const exampleText = [ONB_TYPE.example, { color: M.print }];

  return (
    <View style={{ flex: 1, backgroundColor: M.paper }}>
      <PaperDots M={M} offsetY={insets.top} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: GEO.gutter, paddingTop: R.top, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
          onScroll={(e) => { scrollTop.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={32}
        >
          {/* 브랜드 줄 — 마크(그림은 화면 읽기에서 숨는다) + 앱 이름 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: BRAND.gap, height: BRAND.h }}>
            <Mark size={BRAND.mark} />
            <Text style={[ROLE.section, { color: M.printStrong }]} numberOfLines={1}>{o.brand}</Text>
          </View>

          {recoveredCopy != null && (
            <View style={{ marginTop: R.offer }}>
              <RuledNotice
                M={M}
                title={o.recoveredTitle}
                body={o.recoveredBody}
                action={{ label: t.common.close, onPress: dismissRecovered }}
              />
            </View>
          )}

          {/* iCloud 기록 가져오기(iOS, 다른 기기 기록이 있을 때만) — 질문 위 한 줄 */}
          {offer && (
            <View style={{ marginTop: R.offer }} testID={TID.onbICloud}>
              <Row
                M={M}
                lead={<Icon name="import" size={24} color={M.ink} />}
                title={t.sync.onbOffer}
                meta={importing === 'busy' ? t.sync.onbBusy : importing === 'failed' ? t.sync.onbFailed : t.sync.onbSub}
                right={t.sync.onbImport}
                trailing={<Icon name="chevR" size={16} color={M.ink} style={{ marginRight: -4 }} />}
                titleLines={2}
                onPress={importICloud}
                accessibilityRole="button"
                accessibilityLabel={`${t.sync.onbOffer}, ${t.sync.onbImport}`}
                accessibilityHint={t.sync.onbSub}
                accessibilityState={{ busy: importing === 'busy' }}
              />
              {importing === 'failed' && !!failNote && (
                <Text style={[ROLE.noteSheet, { color: M.ink2, marginTop: 4 }]}>{failNote}</Text>
              )}
            </View>
          )}

          <Text accessibilityRole="header" style={[ROLE.title, { color: M.ink, marginTop: R.question }]}>
            {o.heading}
          </Text>
          <Text style={[ONB_TYPE.sub, { color: M.ink2, marginTop: R.sub }]}>{o.sub}</Text>

          {/* 핵심 목표 — 이름표 · 칸 · 예시 한 줄(낱말마다 누르면 칸을 채운다) */}
          <View
            style={{ marginTop: R.field }}
            onLayout={(e) => { fieldBlock.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }; }}
          >
            <Text
              style={[ROLE.label, { color: M.print, marginBottom: FIELD_BLOCK.label }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {o.goalLabel}
            </Text>
            <Field
              M={M}
              testID={TID.onbGoal}
              value={goal}
              onChangeText={setGoal}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              accessibilityLabel={o.goalLabel}
              placeholder={o.goalPlaceholder}
              maxLength={40}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={() => { if (typed) start(); else Keyboard.dismiss(); }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: FIELD_BLOCK.examples }}>
              <Text
                style={[...exampleText, { marginRight: FIELD_BLOCK.markGap }]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {o.exampleMark}
              </Text>
              {examples.map((s, i) => (
                <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    testID={i === 0 ? TID.onbSample : undefined}
                    onPress={() => { tap(); setGoal(s); }}
                    hitSlop={{ top: FIELD_BLOCK.hit, bottom: FIELD_BLOCK.hit }}
                    accessibilityRole="button"
                    accessibilityLabel={s}
                    {...a11yLangProp()}
                    accessibilityHint={o.exampleHint}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Text style={exampleText}>{s}</Text>
                  </Pressable>
                  {i < examples.length - 1 && (
                    <Text style={exampleText} accessibilityElementsHidden importantForAccessibility="no">{t.core.dot}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* 가운데 블록 미리보기 — 화면 가운데, 아래 알림 한 줄(템플릿을 골랐으면 그 이름 + 되돌리기) */}
          <View style={{ marginTop: R.preview, alignItems: 'center' }}>
            <GoalPreview
              M={M}
              goal={typed}
              emptyCore={o.goalLabel}
              areas={areas}
              tile={tile}
              revealKey={picked?.id ?? 'scaffold'}
              label={previewLabel}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 10, marginTop: PREVIEW.note }}>
              <Text style={[ROLE.noteSheet, { color: M.print, textAlign: 'center' }]}>
                {picked ? o.templateAreas({ name: picked.name }) : o.defaultCaption}
              </Text>
              {picked && <TextLink M={M} label={o.unpick} hint={o.unpickHint} onPress={unpick} icon={null} />}
            </View>
          </View>
        </ScrollView>

        {/* 아래 막대 — 스크롤 밖, 키보드 위에 붙는다 */}
        <View
          style={{
            paddingHorizontal: GEO.gutter, paddingTop: BAR.top, alignItems: 'center', gap: BAR.gap,
            paddingBottom: keyboard > 0 ? BAR.onKeyboard : Math.max(short ? BAR.bottomShort : BAR.bottom, insets.bottom),
          }}
        >
          {/* 적었거나 템플릿을 골랐으면 '시작', 비어 있으면 '다음'(목표는 나중에) */}
          <Button
            testID={typed || picked ? TID.onbStart : TID.onbNext}
            M={M}
            label={cta.label}
            accessibilityHint={cta.hint}
            onPress={start}
            style={{ alignSelf: 'stretch' }}
          />
          <View ref={templateBtn} collapsable={false}>
            <TextLink
              M={M}
              testID={TID.onbTemplate(picked ? picked.id : 'pick')}
              label={picked ? o.otherTemplate : o.fromTemplate}
              onPress={() => { tap(); Keyboard.dismiss(); setSheet(true); }}
              icon={null}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {sheet && <TemplateSheet M={M} onClose={() => setSheet(false)} onPick={pickTemplate} returnFocusRef={templateBtn} />}
    </View>
  );
}
