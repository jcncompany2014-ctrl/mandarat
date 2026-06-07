import { useMandarat } from '../store/MandaratContext';
import { MOODS, Palette } from './moods';

export type M = Palette & { accent: string };

/** Active palette derived from the user's mood + accent settings. */
export function usePalette(): M {
  const { doc } = useMandarat();
  return { ...MOODS[doc.settings.mood], accent: doc.settings.accent };
}
