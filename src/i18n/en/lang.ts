// 'lang' namespace — filled by V4-E (docs/v2/plan.md Appendix B). Settings › Language.
import type ko from '../ko/lang';
import type { Like } from '../types';

export default {
  sectionTitle: 'Language',
  system: 'Use device setting',
  footnote: 'The notification prompt and the Home Screen name follow your device language.',
  changed: ({ name }) => `Switched to ${name}`,
} satisfies Like<typeof ko>;
