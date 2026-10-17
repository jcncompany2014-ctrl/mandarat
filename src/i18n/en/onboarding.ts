// 'onboarding' namespace — the first screen (src/screens/Onboarding.tsx, X-I).
// The goal examples ex1–ex3 are concrete goals with a number (no year), and never repeat the placeholder.
import type ko from '../ko/onboarding';
import type { Like } from '../types';

export default {
  recoveredTitle: "Couldn't read your saved records",
  recoveredBody: "The records that couldn't be read weren't deleted. They're kept aside.",

  heading: 'Write down one goal\nfor this year',
  goalLabel: 'Core goal',
  goalPlaceholder: 'e.g. Finish my first marathon',
  exampleMark: 'e.g.',
  ex1: 'Lose 5 kg',
  ex2: 'Read 24 books',
  ex3: 'Land a new job',
  exampleHint: 'Example · fills in the goal',

  templateAreas: ({ name }) => `Starting with the 8 areas of “${name}”`,
  defaultAreas: 'Starting with 8 default areas',
  defaultCaption: 'Starting with 8 default areas · change them anytime',
  unpick: 'Undo',
  unpickHint: 'Goes back to the default areas',

  startTemplate: 'Start with this chart',
  startTemplateHint: ({ name }) => `Starts with the “${name}” chart`,
  start: 'Start',
  startHint: 'Starts with this goal',
  later: "I'll write my goal later",
  laterHint: 'Start now and set your goal later',
  otherTemplate: 'Choose another template',
  fromTemplate: 'Start from a template',
} satisfies Like<typeof ko>;
