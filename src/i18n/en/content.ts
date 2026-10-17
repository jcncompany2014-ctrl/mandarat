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
  balanceArea3: 'Learning',
  balanceArea4: 'Relationships',
  balanceArea5: 'Money',
  balanceArea6: 'Hobbies',
  balanceArea7: 'Mind',
  balanceArea8: 'Challenge',

  healthName: 'Healthy body and mind',
  healthDesc: 'Exercise, food, sleep and mental health',
  healthGoal: 'Get fit and sleep well',
  healthArea1: 'Exercise',
  healthArea2: 'Eating',
  healthArea3: 'Sleep',
  healthArea4: 'Mindfulness',
  healthArea5: 'Energy',
  healthArea6: 'Posture',
  healthArea7: 'Rest',
  healthArea8: 'Health checks',

  careerName: 'Career growth',
  careerDesc: 'Expertise, network and results',
  careerGoal: 'Get a 10% raise',
  careerArea1: 'Expertise',
  careerArea2: 'Network',
  careerArea3: 'Results',
  careerArea4: 'Side project',
  careerArea5: 'Learning',
  careerArea6: 'Portfolio',
  careerArea7: 'Health',
  careerArea8: 'Money',

  learnName: 'Learning and growth',
  learnDesc: 'Reading, courses, languages and notes',
  learnGoal: 'Study 30 minutes a day',
  learnArea1: 'Reading',
  learnArea2: 'Courses',
  learnArea3: 'Languages',
  learnArea4: 'Writing',
  learnArea5: 'Review',
  learnArea6: 'Certification',
  learnArea7: 'Habits',
  learnArea8: 'Reflection',
} satisfies Like<typeof ko>;
