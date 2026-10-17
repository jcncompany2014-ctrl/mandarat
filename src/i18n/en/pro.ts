// 'pro' namespace — filled by V1-E · V3-C (docs/v2/plan.md Appendix B).
import type ko from '../ko/pro';
import type { Like } from '../types';

export default {
  noteBought: 'Pro is unlocked. Thank you.',
  noteRestored: 'Purchase restored. Pro is unlocked.',
  noteRestoredNone: 'No Pro purchase was found for this Apple Account.',
  notePending: 'Waiting for approval. Pro unlocks once it is approved.',
  noteUnverified: "The purchase couldn't be verified. Try Restore Purchase in a moment.",
  noteNetwork: "You're offline. Connect to the internet and try again.",
  noteNotAllowed: 'Payments are restricted on this device. Check your Screen Time settings.',
  noteUnavailable: "Pro can't be bought right now. Try again later.",
  noteUnknown: "The payment didn't go through. Try again.",
} satisfies Like<typeof ko>;
