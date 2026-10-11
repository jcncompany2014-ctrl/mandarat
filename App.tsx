import React, { useCallback, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { GowunBatang_400Regular, GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang';

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
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    GowunBatang_400Regular,
    GowunBatang_700Bold,
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
