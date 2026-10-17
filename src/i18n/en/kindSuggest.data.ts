// English patterns for reading an action kind from a square's text — used by the English rules in src/lib/kindSuggest.ts
// (data, not messages). The text is lowercased first, except where a pattern says otherwise. Pinned by tests/kindSuggest.en.test.js.

/** Number words up to twelve, plus the round ones people write out */
export const NUM_WORDS: Readonly<Record<string, number>> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  twenty: 20, thirty: 30, fifty: 50, hundred: 100,
};
/** once / twice / thrice → 1 / 2 / 3 */
export const TIMES_WORDS: Readonly<Record<string, number>> = { once: 1, twice: 2, thrice: 3 };

const N = '(\\d+|one|two|three|four|five|six|seven)';
/**
 * 3x a week · 3 times a week · 3x/week · 3 days per week · 3-4 times a week (the lower one) · 3 times weekly ·
 * twice a week · once a week
 */
export const PER_WEEK = new RegExp(
  `\\b(?:${N}(?:\\s*[-–~]\\s*\\d+)?\\s*(?:x|×|times?|days?|sessions?)|(once|twice|thrice))\\s*(?:a|per|each|every|\\/|in a)?\\s*(?:week|weekly|wk)\\b`,
);
/** Monthly is not handled yet, so nothing is picked ('save $500 a month', 'one book a month'); 'in a month' is a deadline */
export const MONTHLY = /\bmonthly\b|(?<!\b(?:in|within)\s)\b(?:a|per|each|every)\s+month\b|\/\s*month\b/;
export const WEEKDAYS = /\bweekdays?\b|\bwork\s?days?\b/;
export const WEEKENDS = /\bweekends?\b/;
export const WEEKLY = /\bweekly\b|\bevery week\b|\bonce a week\b/;

/** Full day names count anywhere: 'Sunday review', 'every Tuesday' */
export const DAY_FULL: readonly [RegExp, number][] = [
  [/\bsundays?\b/, 0], [/\bmondays?\b/, 1], [/\btuesdays?\b/, 2], [/\bwednesdays?\b/, 3],
  [/\bthursdays?\b/, 4], [/\bfridays?\b/, 5], [/\bsaturdays?\b/, 6],
];
/** Short names, only in a list of two or more ('Mon/Wed/Fri', 'tue & thu', 'mon, wed and fri') — 'sun' and 'sat' alone are words */
export const DAY_SHORT: Readonly<Record<string, number>> = {
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
};
const SHORT = '(?:sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)';
export const DAY_SHORT_LIST = new RegExp(`\\b${SHORT}\\.?(?:\\s*(?:\\/|,|&|\\+|and)\\s*${SHORT}\\.?)+\\b`, 'g');
/** A range of days: 'Mon-Fri', 'Monday to Friday', 'tue through thu' — every day from the first to the last */
const ANY_DAY = '(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)';
export const DAY_RANGE = new RegExp(`\\b${ANY_DAY}\\.?\\s*(?:-|–|to|through|thru)\\s*${ANY_DAY}\\b`);
export const DAY_SHORT_WORD = new RegExp(`\\b${SHORT}\\b`, 'g');
/** Letter shorthand, matched on the original case: MWF · M/W/F · TTh · T/Th · TuTh */
export const DAY_LETTERS: readonly [RegExp, number[]][] = [
  [/\bM\s*\/?\s*W\s*\/?\s*F\b/, [1, 3, 5]],
  [/\bTu?\s*\/?\s*Th\b/, [2, 4]],
];

/** Words that read as every day */
export const DAILY_WORDS = /\bevery\s?day\b|\bdaily\b|\beach day\b|\b(?:a|per) day\b(?!\s+(?:off|trip))|\b(?:every|each) (?:morning|evening|night)\b|\bnightly\b|\bin the (?:morning|evening)\b|\bbefore (?:bed|bedtime|sleep|sleeping|work)\b|\bat bedtime\b|\bafter (?:waking|waking up|breakfast|lunch|dinner|meals?|work)\b|\bon (?:my|the) commute\b|\bmornings\b|\bevenings\b|\bday by day\b/;
/** 'study 2 hours' is daily; 'volunteer 20 hours' is a count */
export const HOURS = /(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)\b/;
/** Durations, clock times, steps, water, journaling — usually daily */
export const DAILY_HINTS: readonly RegExp[] = [
  /\b\d+\s*(?:min|mins|minutes?)\b/, // meditate 10 minutes
  /\b(?:wake up|get up|up|bed|sleep|lights out)\s+(?:by|at|before)\s+\d/, // in bed by 11, wake up at 6
  /\bwake[- ]up time\b|\bbedtime\b|\bearly riser\b/,
  /\b\d[\d,]*\s*k?\s*steps\b/, // 10k steps, 8,000 steps
  /\b\d+(?:\.\d+)?\s*(?:l|liters?|litres?|glasses|cups|oz)\b.*\bwater\b|\bwater\b.*\b\d+(?:\.\d+)?\s*(?:l|liters?|litres?|glasses|cups|oz)\b/,
  /\bjournal(?:ing)?\b|\bdiary\b/,
  /\b\d+\s*pages?\b/,
];

export const MIND = /\bgratitude\b|\bgrateful\b|\bthankful\b|\bthank\b|\bactive listening\b|\blisten (?:more|well|carefully|first)\b|\bpositiv(?:e|ity)\b|\bkindness\b|\bbe kind\b|\brespect\b|\bhumble\b|\bhumility\b|\bcompliments?\b|\bpraise\b|\bsmile\b|\bgreet\b|\bpatien(?:t|ce)\b|\bcalm\b|\battitude\b|\bmindset\b|\bmindful(?:ness)?\b|\b(?:don'?t|do not|never|no|stop) (?:complain|complaining|compare|comparing|gossip|gossiping|yell|yelling|rush|rushing|get angry|lose my temper)\b|\bhonest(?:y)?\b|\bpolite(?:ness)?\b|\bempathy\b|\bforgiv(?:e|eness|ing)\b|\bemotions?\b|\boptimis(?:m|tic)\b|\bgenerous\b|\bcompassion(?:ate)?\b|\bopen[- ]minded\b/;
export const ONCE = /\bpass\b|\bcertif(?:y|ied|ication|icate)\b|\b(?:driver'?s )?licen[sc]e\b|\bregister\b|\bsign up\b|\bapply (?:for|to)\b|\brenew\b|\bfinish\b|\bpublish\b|\blaunch\b|\bbuy\b|\bpurchase\b|\bbook (?:a|an|the|my)\b|\breserve\b|\bmove (?:to|into|house|out)\b|\bcheck-?up\b|\bphysical exam\b|\bvaccin|\bflu shot\b|\bgraduate\b|\bvisit\b|\bgo to\b(?! (?:the )?(?:gym|bed|work|class|church|school))|\bsee (?:a|an|the)\b|\bclimb\b|\btravel to\b|\btrip to\b|\bfind (?:a|an|my|the)\b|\bset up\b|\bdeclutter\b|\bclean out\b|\borgani[sz]e (?:my|the)\b|\bwrite (?:a|my) (?:book|novel|will|thesis)\b|\bachieve\b|\bwin\b|\bget (?:a|my) (?:job|promotion|license|licence|degree)\b|\bemergency fund\b|\bmarathon\b/;

/**
 * A number, an optional adjective, then a unit word: 'read 12 books', 'visit 3 new countries', '100 km', '$5,000'.
 * Units that come first in the list win. Each unit maps to how it is stored (plural, short form).
 */
export const COUNT_UNIT = /(\d[\d,]*(?:\.\d+)?)\s*(k\b)?\s*(?:(?:new|more|different|good|great|classic|short|long|local|foreign|national|state)\s+)?(books?|novels?|countries|country|cities|city|places?|parks?|museums?|recipes?|dishes|dish|songs?|people|person|friends?|letters?|trees?|courses?|classes|class|marathons?|races?|posts?|articles?|blog posts?|videos?|movies?|films?|skills?|poems?|stories|story|paintings?|drawings?|photos?|concerts?|languages?|projects?|trips?|hikes?|restaurants?|episodes?|podcasts?|lessons?|sessions?|km|kms|kilometers?|kilometres?|miles?|mi|kg|kgs|kilos?|kilograms?|lbs?|pounds|hours?|hrs?|times|dollars?|euros?|bucks)\b/;
/** Money written with a sign: $5,000 · $10k · €2,000 · £500 */
export const MONEY = /([$€£])\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b)?/;
export const MONEY_UNIT: Readonly<Record<string, string>> = { $: 'dollars', '€': 'euros', '£': 'pounds' };
/** Stored unit for each matched word (anything not listed is stored as written) */
export const UNIT_ALIAS: Readonly<Record<string, string>> = {
  book: 'books', novel: 'novels', country: 'countries', city: 'cities', place: 'places', park: 'parks', museum: 'museums',
  recipe: 'recipes', dish: 'dishes', song: 'songs', person: 'people', friend: 'friends', letter: 'letters', tree: 'trees',
  course: 'courses', class: 'classes', marathon: 'marathons', race: 'races', post: 'posts', article: 'articles', 'blog post': 'blog posts',
  'blog posts': 'blog posts', video: 'videos', movie: 'movies', film: 'films', skill: 'skills', poem: 'poems', story: 'stories',
  painting: 'paintings', drawing: 'drawings', photo: 'photos', concert: 'concerts', language: 'languages', project: 'projects',
  trip: 'trips', hike: 'hikes', restaurant: 'restaurants', episode: 'episodes', podcast: 'podcasts', lesson: 'lessons', session: 'sessions',
  kms: 'km', kilometer: 'km', kilometers: 'km', kilometre: 'km', kilometres: 'km', mile: 'miles', mi: 'miles',
  kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg', lb: 'lb', lbs: 'lb', pounds: 'lb',
  hour: 'hours', hr: 'hours', hrs: 'hours', dollar: 'dollars', euro: 'euros', bucks: 'dollars',
};
/** With 1, these end in one go ('give 1 talk' is not a count): 1 book, 1 course, 1 marathon … */
export const SINGLE_UNITS: ReadonlySet<string> = new Set([
  'books', 'novels', 'countries', 'cities', 'places', 'parks', 'museums', 'recipes', 'dishes', 'songs', 'courses', 'classes',
  'marathons', 'races', 'posts', 'articles', 'blog posts', 'videos', 'movies', 'films', 'skills', 'poems', 'stories', 'paintings',
  'drawings', 'photos', 'concerts', 'languages', 'projects', 'trips', 'hikes', 'restaurants', 'episodes', 'podcasts', 'lessons',
  'sessions', 'times', 'letters', 'trees',
]);
/** Short distances could be one run or a total, so nothing is picked below these */
export const SHORT_DISTANCE: Readonly<Record<string, number>> = { km: 30, miles: 20 };
