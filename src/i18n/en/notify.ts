// 'notify' namespace — filled by V1-A (reminder text) · V2-A (settings text) (docs/v2/plan.md Appendix B).
import type ko from '../ko/notify';
import type { Like } from '../types';
import { plural } from './plural';

export default {
  channel: 'Reminders',
  sep: ' · ',
  more: ({ n }) => `and ${n} more`,
  amTitle: ({ n }) => `${n} ${plural(n, 'thing', 'things')} on Today's list`,
  pmTitle: ({ n }) => `${n} ${plural(n, 'thing', 'things')} left for today`,
  habitBody: ({ area }) => (area ? `${area} · A habit for today` : 'A habit for today'),
  habitsTitle: ({ n }) => `${n} ${plural(n, 'habit', 'habits')}`,
  reviewTitle: 'Weekly review',
  reviewBody: ({ range }) => `${range} · Takes 3 minutes`,

  sectionTitle: 'Reminders',
  morning: "Morning: Today's list",
  morningSub: ({ time }) => `Every day at ${time} · Only on days with something planned`,
  evening: "Evening: what's left",
  eveningSub: ({ time }) => `${time} · Only when something is left`,
  reviewSub: ({ dow, time }) => `${dow}, ${time}`,
  habitNote: 'Set a time for each habit where you edit the action',
  deviceAlso: 'Get reminders on this device too',
  device: 'Get reminders on this device',
  denied: 'Notifications are off on this device',
  deniedBody: 'Turn them on in the device settings to get reminders',
  undetermined: "Notifications aren't allowed on this device yet",
  allow: 'Allow notifications',
  earlier: '10 minutes earlier',
  later: '10 minutes later',
  morningTime: 'Morning reminder time',
  eveningTime: 'Evening reminder time',
  habitTime: 'Habit reminder time',
  editorNone: 'None',
  editorPick: 'Set a time',
  editorNoneA11y: 'No reminder',
  editorPickA11y: 'Set a reminder time',
  habitHint: 'Only on the days you do this habit',
} satisfies Like<typeof ko>;
