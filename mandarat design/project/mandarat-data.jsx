// mandarat-data.jsx — example Mandalart content + palettes + helpers (→ window)

// ── 8 theme colors (positional order: TL, T, TR, L, R, BL, B, BR) ──
const THEMES = [
  {
    key: 'health', kr: '건강', en: 'Health', color: '#2FA968', icon: 'heart',
    actions: [
      { kr: '주 3회 운동', en: 'Workout 3×/week', done: true },
      { kr: '하루 물 2L', en: '2L water daily', done: true },
      { kr: '11시 취침', en: 'Sleep by 11pm', done: false },
      { kr: '1만보 걷기', en: '10k steps', done: true },
      { kr: '단 음식 줄이기', en: 'Less sugar', done: false },
      { kr: '정기 건강검진', en: 'Health checkup', done: true },
      { kr: '스트레칭 10분', en: '10min stretch', done: true },
      { kr: '야식 끊기', en: 'No late snacks', done: false },
    ],
  },
  {
    key: 'career', kr: '커리어', en: 'Career', color: '#4F6BED', icon: 'briefcase',
    actions: [
      { kr: '사이드 프로젝트', en: 'Side project', done: true },
      { kr: '발표 1회', en: 'Give a talk', done: false },
      { kr: '멘토 찾기', en: 'Find a mentor', done: true },
      { kr: '이력서 갱신', en: 'Update resume', done: false },
      { kr: '새 기술 1개', en: 'Learn 1 skill', done: true },
      { kr: '업계 네트워킹', en: 'Network', done: false },
      { kr: '성과 기록', en: 'Track wins', done: false },
      { kr: '자격증 취득', en: 'Get certified', done: false },
    ],
  },
  {
    key: 'learning', kr: '자기계발', en: 'Learning', color: '#E8A33D', icon: 'book',
    actions: [
      { kr: '책 12권 읽기', en: 'Read 12 books', done: true },
      { kr: '온라인 강의', en: 'Online course', done: true },
      { kr: '영어 회화', en: 'English speaking', done: false },
      { kr: '매일 글쓰기', en: 'Write daily', done: true },
      { kr: '새 언어 배우기', en: 'New language', done: false },
      { kr: '다큐 시청', en: 'Watch docs', done: true },
      { kr: '메모 정리', en: 'Organize notes', done: false },
      { kr: '강연 참석', en: 'Attend talks', done: false },
    ],
  },
  {
    key: 'relationship', kr: '관계', en: 'Relationships', color: '#E5547F', icon: 'people',
    actions: [
      { kr: '부모님 주 1통화', en: 'Call parents', done: true },
      { kr: '친구 모임', en: 'See friends', done: false },
      { kr: '감사 표현하기', en: 'Show gratitude', done: true },
      { kr: '데이트 나이트', en: 'Date night', done: false },
      { kr: '새 친구 사귀기', en: 'New friends', done: false },
      { kr: '손편지 쓰기', en: 'Write letters', done: false },
      { kr: '경청 연습', en: 'Listen better', done: false },
      { kr: '봉사활동', en: 'Volunteer', done: false },
    ],
  },
  {
    key: 'finance', kr: '재정', en: 'Finance', color: '#159E9E', icon: 'coin',
    actions: [
      { kr: '가계부 쓰기', en: 'Track budget', done: true },
      { kr: '비상금 마련', en: 'Emergency fund', done: true },
      { kr: '투자 공부', en: 'Study investing', done: false },
      { kr: '구독 정리', en: 'Cut subscriptions', done: true },
      { kr: '수입 20% 저축', en: 'Save 20%', done: false },
      { kr: '부수입 만들기', en: 'Side income', done: false },
      { kr: '소비 점검', en: 'Review spending', done: false },
      { kr: '연금 점검', en: 'Check pension', done: false },
    ],
  },
  {
    key: 'hobby', kr: '취미', en: 'Hobby', color: '#8B5CF6', icon: 'palette',
    actions: [
      { kr: '사진 찍기', en: 'Photography', done: true },
      { kr: '요리 10가지', en: 'Cook 10 dishes', done: true },
      { kr: '악기 배우기', en: 'Learn instrument', done: false },
      { kr: '그림 그리기', en: 'Draw', done: true },
      { kr: '등산 가기', en: 'Go hiking', done: false },
      { kr: '식물 키우기', en: 'Grow plants', done: true },
      { kr: '보드게임', en: 'Board games', done: false },
      { kr: '캠핑 가기', en: 'Go camping', done: false },
    ],
  },
  {
    key: 'mind', kr: '마음챙김', en: 'Mindfulness', color: '#4DA3E0', icon: 'lotus',
    actions: [
      { kr: '명상 10분', en: 'Meditate 10min', done: true },
      { kr: '감사일기', en: 'Gratitude journal', done: true },
      { kr: '디지털 디톡스', en: 'Digital detox', done: false },
      { kr: '호흡 연습', en: 'Breathwork', done: true },
      { kr: '산책하기', en: 'Daily walk', done: true },
      { kr: '일기 쓰기', en: 'Journaling', done: false },
      { kr: '요가', en: 'Yoga', done: true },
      { kr: '감정 체크', en: 'Mood check', done: false },
    ],
  },
  {
    key: 'adventure', kr: '모험', en: 'Adventure', color: '#F4793B', icon: 'compass',
    actions: [
      { kr: '새 도시 3곳', en: '3 new cities', done: true },
      { kr: '혼자 여행', en: 'Solo trip', done: false },
      { kr: '번지점프', en: 'Bungee jump', done: false },
      { kr: '콘서트 가기', en: 'Go to a concert', done: false },
      { kr: '새 음식 도전', en: 'Try new food', done: false },
      { kr: '일출 보기', en: 'Watch sunrise', done: false },
      { kr: '외국어 대화', en: 'Speak a language', done: false },
      { kr: '별 보기 캠핑', en: 'Stargazing', done: false },
    ],
  },
];

const CENTER = { kr: '2026 최고의 나', en: 'My Best 2026' };

// today's curated picks — [themeIndex, actionIndex] · mix of done & not-done
const TODAY_PICKS = [
  [0, 0], [6, 0], [2, 2], [1, 1], [4, 0], [0, 2], [3, 1], [5, 5],
];

// per-theme habit streaks + last-7-day rings (1=done)
const STREAKS = [
  { cur: 12, best: 21, week: [1, 1, 1, 1, 1, 1, 0] },
  { cur: 4, best: 9, week: [0, 1, 1, 0, 1, 1, 1] },
  { cur: 7, best: 15, week: [1, 1, 0, 1, 1, 1, 1] },
  { cur: 2, best: 6, week: [0, 0, 1, 1, 0, 1, 1] },
  { cur: 5, best: 11, week: [1, 0, 1, 1, 1, 0, 1] },
  { cur: 9, best: 14, week: [1, 1, 1, 0, 1, 1, 1] },
  { cur: 16, best: 16, week: [1, 1, 1, 1, 1, 1, 1] },
  { cur: 1, best: 4, week: [0, 0, 0, 1, 0, 1, 1] },
];

// ── mood palettes (vibe exploration) ──
// gold = sacred accent · center = deep mandala core · hero = night-sky gradient
const MOODS = {
  '크림': { bg: '#F4EEE3', surface: '#FFFFFF', card: '#FFFFFF', ink: '#211F1A', sub: '#6E695E', faint: '#A39C8C', line: 'rgba(40,34,20,0.08)', tabBg: 'rgba(247,242,233,0.86)', dark: false, gold: '#B58A3A', center: '#221F2E', hero: 'linear-gradient(155deg,#2D2747 0%,#211B33 60%,#1A1528 100%)' },
  '화이트': { bg: '#EEEFF3', surface: '#FFFFFF', card: '#FFFFFF', ink: '#16171C', sub: '#6B6E78', faint: '#A2A5B0', line: 'rgba(20,22,30,0.07)', tabBg: 'rgba(245,246,250,0.86)', dark: false, gold: '#A8842F', center: '#1A1A26', hero: 'linear-gradient(155deg,#262442 0%,#1A1930 60%,#14132450 100%)' },
  '파스텔': { bg: '#F0ECFA', surface: '#FFFFFF', card: '#FFFFFF', ink: '#272040', sub: '#6E6794', faint: '#A89FC8', line: 'rgba(50,36,90,0.07)', tabBg: 'rgba(244,240,252,0.84)', dark: false, gold: '#9B82C4', center: '#271F44', hero: 'linear-gradient(155deg,#3A2F66 0%,#2A2150 60%,#221A42 100%)' },
  '다크': { bg: '#0E0D14', surface: '#191824', card: '#1C1B28', ink: '#F1EFEA', sub: '#9C9AAA', faint: '#615F72', line: 'rgba(255,255,255,0.09)', tabBg: 'rgba(20,19,30,0.82)', dark: true, gold: '#CBA352', center: '#14121E', hero: 'linear-gradient(155deg,#221F33 0%,#17152340 60%,#100E1A 100%)' },
};

// ── helpers ──
function tint(color, amt, dark) {
  const base = dark ? '#1C1C22' : '#ffffff';
  return `color-mix(in srgb, ${color} ${amt}%, ${base})`;
}
function themeProgress(theme, done) {
  const n = theme.actions.filter((a, i) => done[`${THEMES.indexOf(theme)}-${i}`]).length;
  return { done: n, total: theme.actions.length, pct: Math.round((n / theme.actions.length) * 100) };
}
function initialDone() {
  const d = {};
  THEMES.forEach((t, ti) => t.actions.forEach((a, ai) => { if (a.done) d[`${ti}-${ai}`] = true; }));
  return d;
}

Object.assign(window, { THEMES, CENTER, TODAY_PICKS, STREAKS, MOODS, tint, themeProgress, initialDone });
