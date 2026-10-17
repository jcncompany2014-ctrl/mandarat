// 'widget' namespace — filled by V1-C · V2-C (docs/v2/plan.md Appendix B).
// Templates with '{n}' / '{t}', not functions: the widget fills them outside the app.
import type ko from '../ko/widget';
import type { Like } from '../types';

export default {
  left: '{n} left today',
  allDone: 'All done for today',
  empty: 'Nothing on Today yet',
  more: '{n} more',
  leftShort: 'left',
  doneShort: 'done',
  today: 'Today',
  next: 'Next: {t}',
  checked: '{t} — done',
  galleryName: 'Today',
  galleryDesc: "Shows Today's list and how many are left.",
} satisfies Like<typeof ko>;
