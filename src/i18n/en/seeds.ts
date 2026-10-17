// 'seeds' namespace — the 8 default areas of a first chart, and the goal and 64 squares of the sample (X-I).
// Keys: area<area> · s<area><square> · unit<area><square> (the unit of a count square). Numbers and kinds live in SLOTS in src/data/defaults.ts.
import type ko from '../ko/seeds';
import type { Like } from '../types';

export default {
  area0: 'Health',
  area1: 'Career',
  area2: 'Growth',
  area3: 'Relationships',
  area4: 'Money',
  area5: 'Hobbies',
  area6: 'Mind',
  area7: 'Adventure',

  sampleGoal: 'Take care of health, work and people',

  s00: 'Work out 3x a week', s01: 'Drink 2L of water', s02: 'In bed by 11', s03: 'Walk 10,000 steps',
  s04: 'Cut back on sweets', s05: 'Annual checkup', s06: 'Stretch 10 min', s07: 'No late-night snacks',

  s10: 'Side project', s11: 'Give one talk', s12: 'Find a mentor', s13: 'Update my résumé',
  s14: 'Learn one new skill', s15: 'Industry networking', s16: 'Log my wins', s17: 'Earn a certification',

  s20: 'Read 12 books', s21: 'Online course', s22: 'Spanish conversation', s23: 'Morning pages',
  s24: 'Pick up a new language', s25: 'Watch documentaries', s26: 'Tidy up my notes', s27: 'Go to a talk',

  s30: 'Call my parents weekly', s31: 'Meet up with friends', s32: 'Say thank you', s33: 'Date night',
  s34: 'Make a new friend', s35: 'Write a letter by hand', s36: 'Listen more', s37: 'Volunteer',

  s40: 'Keep a budget', s41: 'Emergency fund $2,000', s42: 'Learn about investing', s43: 'Trim subscriptions',
  s44: 'Save 20% of income', s45: 'Start a side income', s46: 'Review spending', s47: 'Check retirement savings',

  s50: 'Take photos', s51: 'Cook 10 new dishes', s52: 'Learn an instrument', s53: 'Draw',
  s54: 'Go hiking', s55: 'Grow plants', s56: 'Board games', s57: 'Go camping',

  s60: 'Meditate 10 min', s61: 'Gratitude journal', s62: 'Digital detox', s63: 'Breathing practice',
  s64: 'Take a walk', s65: 'Keep a diary', s66: 'Yoga', s67: 'Check in with myself',

  s70: 'Visit 3 new cities', s71: 'Travel solo', s72: 'Bungee jump', s73: 'Go to a concert',
  s74: 'Try a new cuisine', s75: 'Watch a sunrise', s76: 'Talk in another language', s77: 'Stargazing camp-out',

  unit20: 'books',
  unit41: 'dollars',
  unit51: 'dishes',
  unit70: 'cities',
} satisfies Like<typeof ko>;
