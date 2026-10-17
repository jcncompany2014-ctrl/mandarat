import React, { memo, useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SystemUI from 'expo-system-ui';

import { MandaratProvider, usePaletteValue, useReady } from './src/store/MandaratContext';
import { UIProvider } from './src/navigation/ui';
import { Root } from './src/navigation/Root';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { PAPER, Splash, SplashFade, holdNativeSplash, nativeSplashUp, releaseNativeSplash } from './src/components/Splash';
import { installWebStyles } from './src/lib/webStyle';
import { PaperColumn } from './src/components/WebColumn';
import { mix } from './src/theme/moods';
import { crash } from './src/lib/crash';
import { ProProvider } from './src/store/ProContext';
import { LangBoot, LangRoot, takeResumeHint } from './src/i18n/react';

// 오류 수집은 가장 먼저 — 기기에서만 Sentry(src/lib/crash.native.ts), 웹·Node는 아무것도 하지 않는다
crash.init();

// 서체·저장소가 준비될 때까지 iOS 런치 스크린을 붙잡아 둔다 — 컴포넌트 안에서 부르면 이미 걷힌 뒤일 수 있다
holdNativeSplash();
installWebStyles();

// Pretendard — 쓰는 굵기 4개(400·500·600·700). 이름은 src/theme/fonts.ts의 PRETENDARD와 같아야 한다.
// (800은 화면을 한 단계 가볍게 그리는 faceFor에서 Bold로 그려서 파일을 싣지 않는다)
const FONT_FILES = {
  'Pretendard-Regular': require('pretendard/dist/public/static/Pretendard-Regular.otf'),
  'Pretendard-Medium': require('pretendard/dist/public/static/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
  'Pretendard-Bold': require('pretendard/dist/public/static/Pretendard-Bold.otf'),
};

function Gate() {
  // 준비됐는지만 읽는다 — 문서가 바뀌어도 문지기는 다시 그려지지 않는다
  const ready = useReady();
  // 종이 색은 무드가 바뀔 때만 바뀌는 팔레트에서
  const paper = usePaletteValue().bg ?? PAPER;
  // 루트 뷰 바탕을 지금 종이 색으로 — 키보드·시트가 오르내릴 때 드러나는 가장자리가 흰색/검은색으로 튀지 않게
  useEffect(() => {
    if (Platform.OS === 'web') return;
    SystemUI.setBackgroundColorAsync(paper).catch(() => {});
  }, [paper]);
  if (!ready) return <Splash />;
  return <Shell />;
}

/**
 * 언어를 바꾸고 LangRoot가 다시 마운트될 때마다 돌아올 화면(설정)을 읽는다.
 * Shell이 그릴 때 읽으면 바꾸기 전에 읽혀 비어 있다 — 다시 마운트되는 이 자식 안에서 읽어야 한다(V4-E 넘겨줄 일).
 */
function Resume({ children }: { children: React.ReactNode }) {
  const [hint] = useState(takeResumeHint);
  return <UIProvider initialScreen={hint}>{children}</UIProvider>;
}

/** 준비가 끝난 뒤 처음 마운트된다 — 스플래시를 어떻게 걷을지 이때 한 번 정한다 */
const Shell = memo(function Shell() {
  // 네이티브 스플래시가 아직 덮고 있으면 첫 레이아웃 뒤 그것을 페이드로 걷고(JS 페이드 없음),
  // 웹이거나 이미 걷혔으면 같은 모양의 JS 스플래시를 첫 화면 위에서 걷는다.
  const [jsFade, setJsFade] = useState(() => !nativeSplashUp());
  const endFade = useCallback(() => setJsFade(false), []);
  // 넓은 창(웹 미리보기·아이패드): 종이 한 단을 가운데에 — 바깥은 종이보다 한 톤 짙은 책상, 가장자리에 가는 괘선.
  // 단 폭은 PaperColumn이 창 크기로 고르고(layoutFor) PageSize로 내려 준다 — 두 쪽 펼침(spread)은 V5-A
  const P = usePaletteValue();
  // 언어를 바꾸면 LangRoot 아래를 통째로 다시 그린다 — 문서는 그대로, 화면은 설정으로 돌아온다(Resume)
  return (
    <LangRoot>
      <Resume>
        <View style={{ flex: 1 }} onLayout={releaseNativeSplash}>
          <PaperColumn bg={mix(P.bg, P.ink, 0.05)} edge={P.line}>
            <Root />
          </PaperColumn>
          {jsFade && <SplashFade onDone={endFade} />}
        </View>
      </Resume>
    </LangRoot>
  );
});

function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);

  // 서체를 불러오는 동안만 스플래시 — 불러오기에 실패해도(fontError) 갇히지 않고 시스템 서체로 연다
  if (!fontsLoaded && !fontError) return <Splash />;

  // 언어는 문서 저장소보다 먼저 정한다 — 처음 여는 날 blankDoc()이 영역 이름을 그 언어로 적는다
  return (
    <LangBoot fallback={<Splash />}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <ProProvider>
            <MandaratProvider>
              <Gate />
            </MandaratProvider>
          </ProProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </LangBoot>
  );
}

export default crash.wrap(App);
