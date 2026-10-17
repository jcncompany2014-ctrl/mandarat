import type ko from '../ko/common';
import type { Like } from '../types';

export default {
  close: 'Close',
  cancel: 'Cancel',
  retry: 'Try again',
  openSettings: 'Open Settings',
  on: 'On',
  off: 'Off',
  later: 'Later',
  undo: 'Undo',
  proMark: 'Pro',
  iosOnly: 'Available in the iPhone and iPad app',
} satisfies Like<typeof ko>;
