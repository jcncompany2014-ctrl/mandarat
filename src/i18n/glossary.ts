// 낱말장 — 세 언어가 같은 뜻을 같은 말로 쓰게(docs/v2/plan.md §2.6). 쓰지 않는 말 목록도 여기 둔다.
// tests/copy.test.js가 이 목록으로 src와 src/i18n의 글을 검사한다. 이 파일 자체는 검사에서 빠진다.

/** 낱말 한 줄 — 한국어 · 일본어 · 영어 */
export interface GlossaryRow { ko: string; ja: string; en: string }

export const GLOSSARY: readonly GlossaryRow[] = [
  { ko: '만다라트', ja: 'マンダラート', en: 'the chart (Mandalart)' },
  { ko: '칸', ja: 'マス', en: 'square' },
  { ko: '실천', ja: '行動', en: 'action' },
  { ko: '영역', ja: '分野', en: 'area' },
  { ko: '핵심 목표', ja: '中心の目標', en: 'core goal' },
  { ko: '했어요', ja: 'できた / できました', en: 'Done' },
  { ko: '달성', ja: '達成', en: 'achieved' },
  { ko: '담기', ja: '今日に入れる', en: 'add to Today' },
  { ko: '더하기', ja: '足す', en: 'log' },
  { ko: '오늘 할 일', ja: '今日やること', en: "Today's list" },
  { ko: '연속', ja: '連続', en: 'streak' },
  { ko: '한 주 돌아보기', ja: '週のふりかえり', en: 'Weekly review' },
  { ko: '보관함', ja: '保管庫', en: 'Archive' },
  { ko: '한 해', ja: '一年', en: 'the year' },
  { ko: '새 표', ja: '新しい表', en: 'new chart' },
  { ko: '프로', ja: 'プロ', en: 'Pro' },
  { ko: '알림', ja: '通知', en: 'Reminders' },
  { ko: '맞추기', ja: '同期', en: 'Sync' },
];

/** 말투 — 언어마다 지키는 것 */
export const VOICE = {
  ko: '해요체. 낱말장(src/lib/copy.ts)대로. 조사는 josa()로 붙인다.',
  ja: 'です・ます、短く。「！」と絵文字は使わない。データではなく記録。UIの名前は「」で囲む。全角の、。・、数字は半角で助数詞の前に空白を入れない。',
  en: 'Sentence case. No exclamation marks, no "Awesome / Great job / journey". US spelling. "Today" is capitalised as a place. Use · as the separator.',
} as const;

/**
 * 한국어 화면 글에 쓰지 않는 말 — tests/copy.test.js가 src의 문자열에서 찾아낸다.
 * '탭하여/탭하면'(→ 누르면), '셀 모양'(→ 칸 모서리), '데이터를'(→ 기록을), '추가됨'(→ 담았어요),
 * 연도 숫자, '칸을 채웠'·'채워져요'(달성과 헷갈림), '나의 핵심 목표'(빈 목표 자리 글), '길을 잃'(시적인 말),
 * '완료 처리'(→ 했어요), '일시정지됨'(→ 멈춤), 영문 이름 'Mandarat',
 * '탭해'(→ 눌러), '완료'(→ 했어요·달성), '이뤘'·'이룬'(→ 달성 — 이루다는 핵심 목표에만), '셉니다'(합니다체 → 세요).
 * 활용형('8칸을 다 채웠어요')은 BANNED_COPY_RE로 잡는다.
 */
export const BANNED_COPY = [
  '탭하여', '탭하면', '셀 모양', '데이터를', '추가됨', '2026', '칸을 채웠', '채워져요',
  '나의 핵심 목표', '길을 잃', '완료 처리', '일시정지됨', 'Mandarat',
  '탭해', '완료', '이뤘', '이룬', '셉니다',
] as const;

/** 낱말 사이에 다른 말이 끼는 금지 꼴 — '칸을 채웠어요' · '8칸을 다 채웠어요' */
export const BANNED_COPY_RE: readonly RegExp[] = [/칸을\s*(다\s*)?채웠/];

/** 일본어 글에 쓰지 않는 말 — セル(→マス, キャンセル은 괜찮다) · タスク(→行動) · データ(→記録) · ストリーク(→連続) · 完了(→できた) · 感嘆符 · 英語名 · 西暦 */
export const BANNED_JA: readonly (string | RegExp)[] = [/(?<!キャン)セル/, 'タスク', 'データ', 'ストリーク', '完了', '！', '!', 'Mandarat', 'マンダラチャート', /20\d\d/];

/** 영어 글에 쓰지 않는 말 — cell(→square) · task(→action) · data(→record) · complete(→done) · 느낌표 · 영문 이름 · 연도 */
export const BANNED_EN: readonly (string | RegExp)[] = [
  /\bcells?\b/i, /\btasks?\b/i, /\bdata\b/i, /\bcomplete(d)?\b/i, '!', 'Mandarat', 'Mandal-Art', /\b20\d\d\b/,
];
