// 설정 › 언어 — 기기 설정 따르기 · 한국어 · 日本語 · English 중 하나(고르기 줄: 상자 칸 없이, 고른 줄만 오른쪽 펜 획).
// 기기 설정 따르기를 골랐으면 그 줄 아래에 지금 쓰는 언어를 적는다('지금은 한국어').
// 고르면 저장하고 앱을 그 언어로 다시 그린다(LangRoot) — 다시 그린 뒤에도 설정 화면에 머문다(takeResumeHint).
// 고르기는 기기마다(AsyncStorage) — 백업·iCloud에는 들어가지 않는다.
// 번역이 끝나기 전(I18N_READY 거짓)에는 개발 번들과 preview · e2e 빌드에서만 보인다(반쯤 번역된 앱을 내보이지 않게).
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { a11yLang } from '../../components/AppText';
import { ChoiceTick, KIT_TYPE, ROW, RowMeta, RowRule, RowTitle } from '../../components/kit';
import { select } from '../../lib/haptics';
import { TID } from '../../lib/testIds';
import { announce } from '../../lib/useReducedMotion';
import { I18N_READY, lang, msg } from '../../i18n';
import { LANG_NAMES } from '../../i18n/names';
import { readLangPref } from '../../i18n/prefs';
import { chooseLang, useMsg } from '../../i18n/react';
import type { Lang, LangPref } from '../../i18n/types';
import type { M } from '../../theme/usePalette';
import { SetNote, SetSection } from './rows';

/** 줄 순서 — 기기 설정이 맨 위 */
export const LANG_PREFS: readonly LangPref[] = ['system', 'ko', 'ja', 'en'];

/** 이 빌드에서 언어 고르기를 보이는가 — 번역이 끝났거나, 개발 번들이거나, preview · e2e 빌드 */
export function languageSectionShown(ready: boolean, dev: boolean, env: string | undefined): boolean {
  return ready || dev || env === 'preview' || env === 'e2e';
}

const SHOWN = languageSectionShown(I18N_READY, typeof __DEV__ !== 'undefined' && __DEV__, process.env.EXPO_PUBLIC_APP_ENV);

export function LanguageSection({ M }: { M: M }) {
  if (!SHOWN) return null;
  return <LanguageRows M={M} />;
}

function LanguageRows({ M }: { M: M }) {
  const m = useMsg();
  const [pref, setPref] = useState<LangPref | null>(null);

  useEffect(() => {
    let live = true;
    readLangPref().then((p) => { if (live) setPref(p); });
    return () => { live = false; };
  }, []);

  const choose = (p: LangPref) => {
    select();
    setPref(p);
    // 언어가 바뀌면 이 화면은 새 언어로 다시 그려진다 — 알림은 새 언어로 읽는다
    chooseLang(p).then((to: Lang) => announce(msg(to).lang.changed({ name: LANG_NAMES[to] })), () => {});
  };

  return (
    <>
      <SetSection M={M} label={m.lang.sectionTitle} />
      <View accessibilityRole="radiogroup">
        {LANG_PREFS.map((p, i) => {
          const on = pref === p;
          const label = p === 'system' ? m.lang.system : LANG_NAMES[p];
          const meta = p === 'system' && on ? m.lang.systemNow({ name: LANG_NAMES[lang()] }) : undefined;
          // 고르기 줄(부품 상자 ChoiceRow의 모양)을 여기서 짠다 — 언어 이름은 그 언어 목소리로 읽어야 해서(iOS) 읽기 언어를 줄마다 정한다
          return (
            <Pressable
              key={p}
              testID={TID.setLang(p)}
              onPress={() => { if (!on) choose(p); }}
              accessibilityRole="radio"
              accessibilityLabel={meta ? `${label}${m.core.listSep}${meta}` : label}
              // 언어 이름은 그 언어 목소리로 읽는다(iOS) — '시스템' 줄은 앱 언어로
              accessibilityLanguage={Platform.OS === 'ios' && p !== 'system' ? p : a11yLang()}
              accessibilityState={{ checked: on, selected: on }}
              aria-checked={on}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h,
                backgroundColor: pressed && !on ? M.tile : undefined,
              })}
            >
              {i > 0 && <RowRule M={M} inset={0} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <RowTitle M={M} text={label} style={on ? KIT_TYPE.choiceOn : KIT_TYPE.choice} />
                {!!meta && <RowMeta M={M} text={meta} />}
              </View>
              {on && <ChoiceTick M={M} />}
            </Pressable>
          );
        })}
      </View>
      {/* 알림 허락 창 · 홈 화면 이름은 iPhone에만 있는 이야기 — 웹 · 안드로이드에서는 적지 않는다 */}
      {Platform.OS === 'ios' && (
        <SetNote M={M} text={m.lang.footnote} />
      )}
    </>
  );
}
