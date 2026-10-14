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

/** 준비가 끝난 뒤 처음 마운트된다 — 스플래시를 어떻게 걷을지 이때 한 번 정한다 */
const Shell = memo(function Shell() {
  // 네이티브 스플래시가 아직 덮고 있으면 첫 레이아웃 뒤 그것을 페이드로 걷고(JS 페이드 없음),
  // 웹이거나 이미 걷혔으면 같은 모양의 JS 스플래시를 첫 화면 위에서 걷는다.
  const [jsFade, setJsFade] = useState(() => !nativeSplashUp());
  const endFade = useCallback(() => setJsFade(false), []);
  return (
    <UIProvider>
      <View style={{ flex: 1 }} onLayout={releaseNativeSplash}>
        <Root />
        {jsFade && <SplashFade onDone={endFade} />}
      </View>
    </UIProvider>
  );
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);

  // 서체를 불러오는 동안만 스플래시 — 불러오기에 실패해도(fontError) 갇히지 않고 시스템 서체로 연다
  if (!fontsLoaded && !fontError) return <Splash />;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <MandaratProvider>
          <Gate />
        </MandaratProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
