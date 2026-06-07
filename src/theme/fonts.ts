// Font family names (loaded in App.tsx via expo-google-fonts).
// Body copy intentionally uses the system font so Korean (Pretendard-like)
// renders crisply on device; display fonts are used for accents.
import { Platform } from 'react-native';

export const FONTS = {
  // Space Grotesk — numerals / EN labels
  grotesk: 'SpaceGrotesk_600SemiBold',
  groteskBold: 'SpaceGrotesk_700Bold',
  groteskMed: 'SpaceGrotesk_500Medium',
  // Gowun Batang — serif for the core goal
  serif: 'GowunBatang_700Bold',
  serifReg: 'GowunBatang_400Regular',
  // body
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
};
