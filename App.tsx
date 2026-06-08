import React from 'react';
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
import { Splash } from './src/components/Splash';

function Gate() {
  const { ready } = useMandarat();
  // calm lotus splash while the store hydrates
  if (!ready) return <Splash />;
  return (
    <UIProvider>
      <Root />
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
