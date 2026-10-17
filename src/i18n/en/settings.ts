// 'settings' namespace — Settings rows, paper and accent choosers, template confirm, backup rows, saved copies, colophon and alerts (X-G).
import type ko from '../ko/settings';
import type { Like } from '../types';
import { plural } from './plural';

/** "this iPhone" / "this iPad" */
const thisDevice = (device: string) => (device === 'iPad' ? 'this iPad' : 'this iPhone');

export default {
  screenTitle: 'Settings',

  secGoal: 'Core goal',
  goalEmpty: 'Set your core goal',
  goalLabel: ({ goal }) => `Core goal, ${goal}`,
  goalHint: 'Edit',

  secView: 'Appearance',
  subPaper: 'Paper',
  paperLabel: ({ name }) => `Paper, ${name}`,
  swatchGlyph: 'A',
  subAccent: 'Accent color',
  accentLabel: ({ name }) => `Accent color, ${name}`,
  subShape: 'Square corners',
  shapeLabel: ({ name }) => `Square corners, ${name}`,

  secRecords: 'Records',
  subBackup: 'Backup',
  exportTitle: 'Export backup',
  exportHint: ({ age }) => `${age}. Saves your records to a file`,
  exportSaved: 'Backup file saved',
  exportWebFail: "This browser can't save files",
  exportDone: 'Backup exported',
  importTitle: 'Import backup',
  importSub: 'Restore your records from an exported backup',

  snapTitle: 'Saved copies',
  snapSub: 'Kept automatically once a day for 7 days',
  snapBody: "Kept automatically once a day for the last 7 days. Choose one to go back to that day's records.",
  snapLoading: 'Looking for saved copies',
  snapEmpty: 'No saved copies yet. One is kept the first time you write something each day.',
  snapRow: ({ date }) => `Saved copy, ${date}`,
  snapRowSub: ({ n, days }) => `${n} ${plural(n, 'square', 'squares')} filled · ${days} ${plural(days, 'day', 'days')} recorded`,
  snapHint: 'Go back to this saved copy',
  snapAskTitle: 'Go back to this saved copy?',
  snapAskBody: 'Your current records will be replaced with this saved copy. You can undo right after.',
  snapAskOk: 'Go back',
  snapReadFail: "Couldn't read the saved copy",
  snapRestored: ({ date }) => `Went back to the saved copy from ${date}`,

  storageNoteLocal: 'Your records are saved on this device. Export a backup before you switch devices.',
  storagePlaceLocal: 'This device',
  storageNoteBackup: ({ device }) =>
    `Your records are saved on ${thisDevice(device)} and in iCloud Backup. If iCloud Backup is off, export a backup before you switch devices.`,
  storagePlaceBackup: ({ device }) => `${device === 'iPad' ? 'This iPad' : 'This iPhone'} and iCloud Backup`,
  storageNoteSync: ({ device }) =>
    `Your records are saved on ${thisDevice(device)} and in iCloud, and stay in sync across iPhone and iPad with the same Apple Account. To move to Android or the web, export a backup.`,
  storagePlaceSync: ({ device }) => `${device === 'iPad' ? 'This iPad' : 'This iPhone'} and iCloud`,

  subRestart: 'Start over',
  templateRow: 'Start from a template',
  templateRowSub: ({ n }) => `Choose from ${n} ${plural(n, 'template', 'templates')}`,
  templateAskTitle: 'Switch to this template?',
  templateAskBody: ({ n, name }) =>
    `Your ${n} written ${plural(n, 'action', 'actions')} and Today's list will be cleared, and the 8 areas will become the ‘${name}’ areas. Your core goal and past records stay. You can undo right after.`,
  templateAskOk: 'Switch',
  templateDone: ({ name }) => `Switched to the ‘${name}’ template`,
  sampleRow: 'Fill in examples',
  sampleRowSub: 'Example actions for 8 areas and 64 squares',
  sampleAskTitle: 'Fill in examples?',
  sampleAskBody: 'Your areas and actions will be replaced with examples. You can undo right after.',
  sampleAskOk: 'Fill in',
  sampleDone: 'Filled in examples',
  resetRow: 'Reset everything',
  resetRowSub: 'Erase all goals and records',
  resetAskTitle: 'Erase all records?',
  resetAskBody: 'Your core goal, all 64 action squares and your Done history will be erased. You can undo right after.',
  resetAskOk: 'Erase',
  resetDone: 'All records erased',

  secInfo: 'About',
  colName: 'Name',
  appName: 'Mandalart',
  colVersion: 'Version',
  colFont: 'Font',
  colPlace: 'Storage',
  privacy: 'Privacy policy',
  contact: 'Contact us',
  contactHint: 'Opens your mail app',
  licenses: 'Open-source licenses',
  licensesBody: 'This app uses the following open-source software.',
  licLucide: 'Lucide icon shapes',
  mailSubject: ({ version }) => `Mandalart support ${version}`,
  openFail: "Couldn't open",
} satisfies Like<typeof ko>;
