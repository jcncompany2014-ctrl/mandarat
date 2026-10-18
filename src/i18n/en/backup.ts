// 'backup' namespace — the import sheet, the now | backup ledger, the last-backup line in Settings and the text-backup header (X-K).
import type ko from '../ko/backup';
import type { Like } from '../types';
import fmt from './fmt';
import { plural } from './plural';

export default {
  errEmpty: 'Nothing pasted yet',
  errNotFound: "Couldn't find a backup here. Please paste the whole exported text",
  errBroken: 'This backup is cut off or damaged. Please copy it again from start to end',
  errNotOurs: "This isn't a Mandalart backup",
  errNewer: 'This backup was made by a newer version of the app. Please update the app, then import it',
  fileFailed: "Couldn't read the file. Please choose it again",

  sheetTitle: 'Import backup',
  sheetBody: 'Your current records will be replaced by the backup. You can undo right after.',
  pickFile: 'Choose a backup file',
  pickOther: 'Choose another backup file',
  pickSub: 'A backup file you saved (.json)',
  pasteHelp: 'If you kept a backup as text in Notes or a chat, press and hold, Select All, Copy, then paste it here',
  pasteLabel: 'Paste backup text',
  pastePlaceholder: 'Paste the whole backup text',
  fromFile: 'Loaded from a file',
  fromFileSay: ({ name }) => `Loaded from a file, ${name}`,
  toPaste: 'Paste instead',
  toPasteLabel: 'Switch to pasting',
  toPasteHint: 'Paste backup text instead of using a file',
  apply: 'Replace with this backup',
  applied: 'Backup imported',
  readOk: 'This backup can be imported',
  exportedOn: ({ d }) => `Backup made on ${fmt.dateLong({ d })}`,
  newerNow: 'Your current records are newer than this backup. Replacing them removes your recent changes.',

  colNow: 'Current',
  colBackup: 'Backup',
  none: 'None',
  rowGoal: 'Core goal',
  rowFilled: 'Filled',
  rowDone: 'Achieved',
  rowDays: 'Days logged',
  rowLast: 'Last record',
  filledSay: ({ n }) => `${n} of 64 squares`,
  rowSay: ({ label, now, backup }) => `${label}, current ${now}, backup ${backup}`,

  ageNever: 'No backup yet',
  ageToday: 'Last backup · today',
  ageDays: ({ n }) => `Last backup · ${n} ${plural(n, 'day', 'days')} ago`,

  textPrefix: ({ d, y }) => `Mandalart backup · ${fmt.monthDay({ d })}, ${fmt.year({ y })}\nTo restore, paste all of this text into Settings › Import backup.\n\n`,
} satisfies Like<typeof ko>;
