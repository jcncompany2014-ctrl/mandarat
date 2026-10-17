// 'content' namespace — filled by X-J (docs/v2/plan.md Appendix B).
// Template (src/data/templates.ts) names, one-line descriptions, core goals and the 8 areas. Written for English speakers, not translated.
import type ko from '../ko/content';
import type { Like } from '../types';

export default {
  balanceName: 'A balanced life',
  balanceDesc: 'Body, mind, people and work in balance',
  balanceGoal: 'Balance work and life',
  balanceArea1: 'Health',
  balanceArea2: 'Career',
  balanceArea3: 'Study',
  balanceArea4: 'Family & friends',
  balanceArea5: 'Money',
  balanceArea6: 'Fun',
  balanceArea7: 'Mind',
  balanceArea8: 'New things',

  healthName: 'Healthy body and mind',
  healthDesc: 'Exercise, food, sleep and mental health',
  healthGoal: 'Get fit and sleep well',
  healthArea1: 'Fitness',
  healthArea2: 'Eating',
  healthArea3: 'Sleep',
  healthArea4: 'Inner calm',
  healthArea5: 'Energy',
  healthArea6: 'Body',
  healthArea7: 'Rest',
  healthArea8: 'Health checks',

  careerName: 'Career growth',
  careerDesc: 'Skills, people and impact',
  careerGoal: 'Get a 10% raise',
  careerArea1: 'Skills',
  careerArea2: 'People',
  careerArea3: 'Impact',
  careerArea4: 'Side project',
  careerArea5: 'Study',
  careerArea6: 'My work',
  careerArea7: 'Health',
  careerArea8: 'Money',

  learnName: 'Learning and growth',
  learnDesc: 'Books, classes, a language and notes',
  learnGoal: 'Study 30 minutes a day',
  learnArea1: 'Books',
  learnArea2: 'Online class',
  learnArea3: 'French',
  learnArea4: 'Notes',
  learnArea5: 'Review',
  learnArea6: 'Exams',
  learnArea7: 'Habits',
  learnArea8: 'Reflect',
} satisfies Like<typeof ko>;
