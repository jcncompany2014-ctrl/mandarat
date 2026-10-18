// 'sync' namespace — Settings › iCloud, the choice sheet and the onboarding offer (V5-E).
import type ko from '../ko/sync';
import type { Like } from '../types';

export default {
  sectionTitle: 'iCloud',
  toggle: 'Sync devices with iCloud',
  toggleSub: 'Keeps your records the same on iPhone and iPad with the same Apple Account',
  justNow: 'Synced just now',
  syncedAt: ({ day, time }) => `Synced ${day}, ${time}`,
  syncing: 'Syncing',
  needsChoice: 'Choose how to sync',
  noAccount: 'Not signed in to iCloud',
  driveOff: 'iCloud Drive is off',
  settingsBody: 'Turn on iCloud in Settings and syncing picks up again',
  accountChanged: 'This is a different iCloud account. Turn sync on again to sync with its records',
  newerApp: 'Another device has a newer version of the app. Update this one to sync again',
  tooLarge: 'Your records are large, so syncing may take a while',
  ioError: "Couldn't sync this time. It will try again shortly",
  now: 'Sync now',
  webNote: 'Only in the iPhone and iPad app. To move to another device, use a backup file.',

  choiceTitle: 'iCloud has records from another device',
  choiceBody: 'Choose how to sync this device with iCloud',
  here: 'This device',
  cloud: 'iCloud',
  merge: 'Combine both',
  mergeSub: 'If the same square was changed differently on two devices, the later change stays',
  adopt: 'Switch to the iCloud records',
  adoptSub: "This device's chart and records are replaced with the ones in iCloud. Past charts in the Archive are combined",
  mine: "Keep going with this device's records",
  mineSub: "Anything written on other devices in the meantime is replaced with this device's records",
  copyNote: "A copy from before your choice is kept in Settings › Saved copies, under today's date",
  confirm: 'Sync this way',
  confirmHint: 'Choose one first',

  onbOffer: 'Your records are in iCloud',
  onbImport: 'Bring them in',
  onbSub: 'Bring in the chart you used on another iPhone or iPad',
  onbBusy: 'Bringing in your records',
  onbFailed: "Couldn't bring in the records",
} satisfies Like<typeof ko>;
