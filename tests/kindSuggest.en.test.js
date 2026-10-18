// English rules for reading an action kind from a square's text (src/lib/kindSuggest.ts, src/i18n/en/kindSuggest.data.ts).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { suggestKind } = require('../src/lib/kindSuggest');

const pick = (text) => {
  const s = suggestKind(text, 'en');
  if (!s) return null;
  if (s.kind === 'habit') return s.perWeek ? `habit:w${s.perWeek}` : `habit:${s.days.join('')}`;
  if (s.kind === 'count') return `count:${s.goal} ${s.unit}`;
  return s.kind;
};

test('N times a week → a habit N times a week (before durations and numbers)', () => {
  assert.equal(pick('Gym 3x a week'), 'habit:w3');
  assert.equal(pick('3x/week strength training'), 'habit:w3');
  assert.equal(pick('Run 3 times a week, 30 min'), 'habit:w3');
  assert.equal(pick('Swim twice a week'), 'habit:w2');
  assert.equal(pick('Call my parents once a week'), 'habit:w1');
  assert.equal(pick('Yoga 2-3 times per week'), 'habit:w2', 'the lower end of a range');
  assert.equal(pick('Cook at home 4 days a week'), 'habit:w4');
  assert.equal(pick('Spanish class three times weekly'), 'habit:w3');
  assert.equal(pick('Walk 7 days a week'), 'habit:0123456');
});

test('Days of the week → a habit on those days', () => {
  assert.equal(pick('Mon/Wed/Fri swim'), 'habit:135');
  assert.equal(pick('Gym on mon, wed and fri'), 'habit:135');
  assert.equal(pick('Tue & Thu yoga'), 'habit:24');
  assert.equal(pick('MWF piano'), 'habit:135');
  assert.equal(pick('Weekly review every Sunday'), 'habit:0');
  assert.equal(pick('Saturday deep clean'), 'habit:6');
  assert.equal(pick('Read on weekday mornings'), 'habit:12345');
  assert.equal(pick('Hike on weekends'), 'habit:06');
  assert.equal(pick('Run Mon-Fri'), 'habit:12345');
});

test('Words that look like days but are not are skipped', () => {
  assert.equal(pick('Watch the sun rise'), null);
  assert.equal(pick('Sat exam prep'), null);
  assert.equal(pick('Try something new once a month'), null, 'monthly is not picked');
  assert.equal(pick('Save $500 a month'), null);
  assert.equal(pick('One book per month'), null);
});

test('Things done every day → a daily habit', () => {
  for (const t of ['Drink 2L of water a day', 'Write every day', 'In bed by 11', '10k steps', 'Stretch 10 minutes', 'Meditate 10 min',
    'Gratitude journal', 'No phone before bed', 'Wake up at 6', 'Study 2 hours', 'Read 10 pages before bed', 'Walk after lunch',
    'Every morning: make the bed', 'Floss daily']) {
    assert.equal(pick(t), 'habit:0123456', t);
  }
});

test('A number and a unit → a count; 1 → one-time', () => {
  assert.equal(pick('Read 12 books'), 'count:12 books');
  assert.equal(pick('Visit 3 new countries'), 'count:3 countries');
  assert.equal(pick('Learn 10 recipes'), 'count:10 recipes');
  assert.equal(pick('Save $10,000'), 'count:10000 dollars');
  assert.equal(pick('Save $5k for a trip'), 'count:5000 dollars');
  assert.equal(pick('Volunteer 20 hours'), 'count:20 hours');
  assert.equal(pick('Lose 10 lbs'), 'count:10 lb');
  assert.equal(pick('Lose 5 kilos'), 'count:5 kg');
  assert.equal(pick('Give blood 10 times'), 'count:10 times');
  assert.equal(pick('Make 5 new friends'), 'count:5 friends');
  assert.equal(pick('Run 500 km'), 'count:500 km');
  assert.equal(pick('Run 1 marathon'), 'once');
  assert.equal(pick('Take 1 course'), 'once');
  assert.equal(pick('Run 5 km'), null, 'a short distance could be one run');
  assert.equal(pick('Pass the exam in 3 months'), 'once', 'months is not a unit');
});

test('Attitudes and thoughts → mindset', () => {
  for (const t of ['Gratitude', 'Express thanks', 'Practice active listening', 'Think positive', 'Greet people warmly', 'Respect the referee',
    "Don't get angry", 'Stay calm under pressure']) {
    assert.equal(pick(t), 'mind', t);
  }
});

test('Things that end → one-time', () => {
  for (const t of ['Pass the exam', 'Get certified', 'Annual check-up', 'Renew my passport', 'Find a mentor', 'Go to a concert',
    'Finish a marathon', 'Build an emergency fund', 'See the sunrise at the beach']) {
    assert.equal(pick(t), 'once', t);
  }
});

test('Unsure → nothing is picked', () => {
  for (const t of ['', '  ', 'Side project', 'English conversation', 'Volunteering', 'Cut back on sweets', 'Go to the gym', '42']) {
    assert.equal(pick(t), null, t);
  }
});

test('The suggestion is named in the app language (msg().kinds)', () => {
  assert.equal(suggestKind('Gym 3x a week', 'en').label, 'a habit, 3 times a week');
  assert.equal(suggestKind('Call my parents once a week', 'en').label, 'a weekly habit');
  assert.equal(suggestKind('Mon/Wed/Fri swim', 'en').label, 'a Mon, Wed, Fri habit');
  assert.equal(suggestKind('Write every day', 'en').label, 'a daily habit');
  assert.equal(suggestKind('Hike on weekends', 'en').label, 'a weekend habit');
  assert.equal(suggestKind('Weekly review every Sunday', 'en').label, 'a Sunday habit');
  assert.equal(suggestKind('Read 12 books', 'en').label, 'a count to 12 books');
  assert.equal(suggestKind('Pass the exam', 'en').label, 'a one-time action');
  assert.equal(suggestKind('Gratitude', 'en').label, 'a mindset');
  // English text in a Korean or Japanese app
  assert.equal(suggestKind('Read 12 books', 'ko').label, '12books 쌓기');
  assert.equal(suggestKind('Gym 3x a week', 'ja').label, '週3回の習慣');
  // Korean text in an English app
  assert.equal(suggestKind('책 12권 읽기', 'en').label, 'a count to 12권');
  assert.equal(suggestKind('주 3회 운동', 'en').label, 'a habit, 3 times a week');
});
