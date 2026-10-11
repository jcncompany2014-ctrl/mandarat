import React, { useCallback, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

import { MandaratProvider, useMandarat } from './src/store/MandaratContext';
import { UIProvider } from './src/navigation/ui';
import { Root } from './src/navigation/Root';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Splash, SplashFade } from './src/components/Splash';
import { installWebStyles } from './src/lib/webStyle';

installWebStyles();

function Gate() {
  const { ready } = useMandarat();
  const [splashGone, setSplashGone] = useState(false);
  const hideSplash = useCallback(() => setSplashGone(true), []);
  // calm lotus splash while the store hydrates — then it fades away over the first screen
  if (!ready) return <Splash />;
  return (
    <UIProvider>
      <Root />
      {!splashGone && <SplashFade onDone={hideSplash} />}
    </UIProvider>
  );
}

export default function App() {
  // Pretendard — 굵기별 파일(400·500·600·700·800). 이름은 src/theme/fonts.ts의 PRETENDARD와 같아야 한다.
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('pretendard/dist/public/static/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('pretendard/dist/public/static/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('pretendard/dist/public/static/Pretendard-ExtraBold.otf'),
  });

  // Render once fonts resolve; the lotus splash avoids a flash of unstyled text.
  if (!fontsLoaded) return <Splash />;

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
