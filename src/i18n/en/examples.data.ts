// English "what to write" examples — used by src/lib/suggest.ts (action examples in the square editor) and src/lib/coach.ts (what · how much · when/where).
// Language data, not messages (script check only). Written for English speakers, not translated. Pinned by tests/i18n-content.test.js.
import type { ExampleGroup } from '../ko/examples.data';

/** Matched as whole words (a trailing s/es is allowed) against the area name, together with the ko and ja keys */
export const GROUPS: readonly ExampleGroup[] = [
  { id: 'health', keys: ['health', 'fitness', 'exercise', 'workout', 'gym', 'running', 'diet', 'body'], items: ['30 min of cardio 3x a week', 'Drink 8 glasses of water a day', 'Stretch 10 min before bed', 'Take the stairs every day'] },
  { id: 'study', keys: ['study', 'studies', 'learning', 'learn', 'reading', 'book', 'self-improvement', 'school'], items: ['Read 30 min a day', 'Finish one online course', 'Learn 20 new words a day', 'Write up what I learned once a week'] },
  { id: 'career', keys: ['career', 'work', 'job', 'project', 'growth', 'professional'], items: ['Pick 3 priorities every morning', 'Update my portfolio once a week', 'Note one thing to improve every day'] },
  { id: 'money', keys: ['money', 'finance', 'saving', 'savings', 'budget', 'investing', 'wealth'], items: ['Log every expense daily', 'Review my budget every Sunday', 'Set up automatic savings of 10%', 'Clean out 3 unused subscriptions'] },
  { id: 'people', keys: ['relationship', 'family', 'friend', 'people', 'social', 'partner'], items: ['Call a friend or family member once a week', 'Say thank you to someone every day', 'Book a dinner with friends'] },
  { id: 'hobby', keys: ['hobby', 'hobbies', 'fun', 'leisure', 'play', 'creative'], items: ['Make time for a hobby once a week', 'Sign up for one beginner class', 'Read 12 books on my hobby'] },
  { id: 'mind', keys: ['mind', 'mental', 'meditation', 'mindfulness', 'emotion', 'calm', 'rest', 'stress', 'wellbeing'], items: ['Meditate 5 min every morning', 'Write 3 lines in a gratitude journal', 'Take 5 deep breaths every day'] },
  { id: 'adventure', keys: ['adventure', 'new things', 'challenge', 'experience', 'travel', 'explore'], items: ['Visit one place I have never been', 'Finish one bucket list item', 'Try something new once a week'] },
];

/** When no group matches */
export const GENERIC: readonly string[] = ['Put in 10 minutes a day', 'Do it 3 times a week', 'Try it for just 10 minutes'];

// ── What · how much · when/where (coach). Matched on lowercased text ─────────
export const QTY = /(\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|a dozen|a few|a couple|twice|once)\b)/;
export const FREQ = /(\bdaily\b|\bweekly\b|\bevery\b|\beach\b|\bonce\b|\btwice\b|\ba day\b|\ba week\b|\bper (?:day|week)\b|\/(?:day|week)\b|\bweekdays?\b|\bweekends?\b|\bmon(?:day)?s?\b|\btue(?:sday)?s?\b|\bwed(?:nesday)?s?\b|\bthu(?:rsday)?s?\b|\bfri(?:day)?s?\b|\bsat(?:urday)?s?\b|\bsun(?:day)?s?\b)/;
export const WHEN = /(\bmorning|\bnoon\b|\blunch|\bafternoon|\bevening|\bnight|\bbedtime\b|\bbefore\b|\bafter\b|\bat \d|\bwake\b|\bwaking\b|\bcommute|\bbreakfast|\bdinner)/;
export const WHERE = /(\bhome\b|\boffice\b|\bat work\b|\bschool\b|\bgym\b|\bpark\b|\bcaf[eé]\b|\blibrary\b|\bin bed\b|\bdesk\b|\boutside\b|\boutdoors\b|\bonline\b)/;
