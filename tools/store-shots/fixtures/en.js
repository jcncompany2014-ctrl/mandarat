// English sample — a year in the life of someone around thirty. The words are hand-written; build.js makes the shape and the logs.
const { buildDoc } = require('./build');

const L = {
  seed: 3014,
  goal: 'A steady year',
  prevGoal: 'A year of looking after myself',
  archiveNote: 'The workouts stuck. Spanish, try again. Next year: protect the mornings.',
  lastReviewNote: 'Finish the résumé this week',
  areas: [
    { title: 'Health', actions: ['Work out 3× a week', 'Drink 2 L of water', 'In bed by 11', 'Walk 7,000 steps', 'Quit soda', 'Annual checkup', 'Morning stretch', 'Fewer late snacks'] },
    { title: 'Work', actions: ['Give one talk', 'Quarterly report', 'Lunch with a mentor', 'Update my résumé', 'Learn one new tool', 'Run a team retro', 'Friday work log', 'Certification exam'] },
    { title: 'Learning', actions: [{ text: 'Read 12 books', unit: 'books' }, 'Finish the data course', 'Spanish class', 'Morning pages', 'Try Korean basics', 'Weekly news notes', 'Go to one lecture', 'Notes on what I learn'] },
    { title: 'People', actions: ['Call my parents', 'See an old friend', 'Say thank you', 'Sister’s birthday', 'Host a dinner', 'Write a letter', 'Listen to the end', 'One day volunteering'] },
    { title: 'Money', actions: ['Sunday budget', { text: 'Emergency fund $3,000', unit: '$', goal: 3000, step: 300 }, 'Learn index funds', 'Cancel subscriptions', 'Save 20% of pay', 'Review insurance', 'Weekly spending check', 'Check retirement'] },
    { title: 'Play', actions: ['Shoot a roll of film', { text: 'Cook 10 new dishes', unit: 'dishes' }, 'Five guitar chords', 'See an exhibition', 'Go on a hike', 'Saturday baking', 'Board game night', 'Go camping'] },
    { title: 'Mind', actions: ['Meditate 10 min', 'Three good things', 'Screen-free Sunday', 'Breathing practice', 'Evening walk', 'Buy a journal', 'Start yoga', 'Check in with myself'] },
    { title: 'Travel', actions: [{ text: 'Visit 3 new cities', unit: 'cities' }, 'Travel solo', 'Sunrise by the sea', 'Plan a month away', 'Night train', 'Go stargazing', 'A local market', 'Renew passport'] },
  ],
  reflections: [
    'Rain, so stretching instead of a walk', 'First draft of the talk done', '2 L of water is still hard', 'Long call with Mom',
    'Three morning pages', 'Worked late, still in bed by 11', 'The Saturday bread rose well', 'Finished another book',
    'Caught the sunset on my walk', 'A bit tired this week', 'Body feels light after the gym', 'Caught up on the budget',
  ],
  reviewNotes: ['Start again with morning workouts', 'Keep the water bottle on the desk', 'Resting on weekends is fine', 'Chip away at the report early', 'More early nights', 'Read on the commute'],
  prevReviewNotes: ['Start again in spring', 'Early mornings in summer', 'More books this fall', 'Rest at year end'],
};

module.exports = { L, fixture: () => buildDoc(L) };
