// 칸 글에서 실천 유형을 알아본다 — 규칙 기반(AI 호출 없음), 단위 테스트로 고정.
// "주 3회 운동" → 주 3회 습관, "책 12권 읽기" → 12권 쌓기, "감사 표현하기" → 마음가짐 …
// 글의 글자로 규칙을 고른다: 한글이 있으면 한국어, 가나·한자가 있으면 일본어, 그 밖은 영어.
// 규칙의 말 무리는 src/i18n/<언어>/kindSuggest.data.ts에 있다. 이름(label)은 글의 언어가 아니라 앱 언어(msg().kinds)로 붙는다.
// 확실하지 않으면 아무것도 고르지 않는다(null) — 사람이 고르면 된다.
import type { KindConfig } from './kinds';
import { parseNum } from './kinds';
import { normalizeDays } from './routine';
import { lang as appLang, msg, type Lang } from '../i18n';
import * as KO from '../i18n/ko/kindSuggest.data';
import * as JA from '../i18n/ja/kindSuggest.data';
import * as EN from '../i18n/en/kindSuggest.data';

export interface KindSuggestion extends KindConfig {
  /** '주 3회 습관' · '매일 습관' · '12권 쌓기' · '한 번 하는 일' · '마음가짐' — 'X 같아요'·josa(X, '으로/로') 문장에 그대로 들어간다 */
  label: string;
}

/** 이름이 붙기 전의 제안 — 언어별 규칙이 돌려준다 */
type Guess = Omit<KindSuggestion, 'label'>;

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const KANA_KANJI = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;

const habitDays = (days: number[]): Guess => ({ kind: 'habit', days: normalizeDays(days) });
const perWeek = (n: number): Guess => (n >= 7 ? habitDays(EVERY_DAY) : { kind: 'habit', perWeek: n });
const counted = (n: number, unit: string): Guess => ({ kind: 'count', goal: n, unit, step: 1, count: 0 });
const own = <T>(o: Readonly<Record<string, T>>, k: string): T | undefined => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);

/** 글의 글자 → 규칙의 언어 */
export function textLang(text: string): Lang {
  if (HANGUL.test(text)) return 'ko';
  if (KANA_KANJI.test(text)) return 'ja';
  return 'en';
}

/** 제안에 앱 언어의 이름을 붙인다 */
function named(p: Guess, l: Lang): KindSuggestion {
  const k = msg(l).kinds;
  const label =
    p.kind === 'habit' ? (p.perWeek ? k.suggestPerWeek({ n: p.perWeek }) : k.suggestDays({ dows: p.days ?? EVERY_DAY }))
      : p.kind === 'count' ? k.suggestCount({ n: p.goal ?? 0, unit: p.unit ?? '' })
        : p.kind === 'once' ? k.suggestOnce
          : k.suggestMind;
  return { ...p, label };
}

/**
 * 칸 글 → 유형 제안. 이름은 l(기본: 지금 앱 언어)로 붙는다.
 * 규칙의 언어는 글의 글자로 고른다(textLang) — 일본어 화면에서 한국어로 적어도 한국어 규칙이 읽는다.
 */
export function suggestKind(text: string, l: Lang = appLang()): KindSuggestion | null {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const tl = textLang(t);
  const p = tl === 'ko' ? suggestKo(t) : tl === 'ja' ? suggestJa(t) : suggestEn(t);
  return p ? named(p, l) : null;
}

// ── 한국어 ────────────────────────────────────────────────────────────────────

/** '일요일' · '월·수·금' · '화/목요일' · '월수금'(세 글자 이상) — 요일로 읽히는 부분만 */
function weekdaysKo(t: string): number[] {
  const found = new Set<number>();
  for (const m of t.matchAll(KO.DOW_NAME)) found.add(KO.DOW[m[1]]);
  for (const m of t.matchAll(KO.DOW_LIST)) {
    for (const ch of m[1].replace(KO.DOW_LIST_SEP, '')) found.add(KO.DOW[ch]);
  }
  // 붙여 쓴 요일: 세 글자 이상, 또는 뒤에 요일·마다가 붙은 두 글자 — '가족 화목' 같은 말은 건너뛴다
  for (const m of t.matchAll(KO.DOW_RUN)) {
    const letters = m[1];
    if (new Set(letters).size !== letters.length) continue; // '일일' 같은 말
    if (letters.length < 3 && !m[2]) continue;
    for (const ch of letters) found.add(KO.DOW[ch]);
  }
  return [...found];
}

function suggestKo(t: string): Guess | null {
  // 1) 주 N회
  const pw = t.match(KO.PER_WEEK);
  if (pw) {
    const n = Number(pw[1]);
    if (n >= 1) return perWeek(n);
  }
  if (KO.MONTHLY.test(t)) return null;

  // 2) 요일 — 평일·주말·요일 이름
  if (KO.WEEKDAYS.test(t)) return habitDays([1, 2, 3, 4, 5]);
  if (KO.WEEKENDS.test(t)) return habitDays([0, 6]);
  const wd = weekdaysKo(t);
  if (wd.length > 0) return habitDays(wd);

  // 3) 날마다
  if (KO.DAILY_WORDS.test(t)) return habitDays(EVERY_DAY);
  const hours = t.match(KO.HOURS);
  if (hours && Number(hours[1]) < 10) return habitDays(EVERY_DAY);
  if (KO.DAILY_HINTS.some((re) => re.test(t))) return habitDays(EVERY_DAY);
  if (KO.WEEKLY.test(t)) return perWeek(1);

  // 4) 숫자 + 단위 → 쌓기 (1이면 한 번)
  const cm = t.match(KO.COUNT_UNIT);
  if (cm) {
    const n = parseNum(cm[1]);
    const raw = cm[2].replace(/\s+/g, '').toLowerCase();
    const unit = KO.MONEY_SPACE.get(raw) ?? KO.UNIT_ALIAS.get(raw) ?? raw;
    if (n !== undefined && n > 0) {
      if (n === 1 && KO.SINGLE_UNITS.has(unit)) return { kind: 'once' };
      if (unit === 'km' && n < KO.SHORT_KM) return null;
      return counted(n, unit);
    }
  }

  // 5) 마음가짐 — 태도와 생각
  if (KO.MIND.test(t)) return { kind: 'mind' };
  // 6) 끝이 있는 일
  if (KO.ONCE.test(t)) return { kind: 'once' };
  return null;
}

// ── 日本語 ────────────────────────────────────────────────────────────────────

/** '日曜' · '月・水・金' · '火/木' · '月水金'（3字以上）· '火木に' */
function weekdaysJa(t: string): number[] {
  const found = new Set<number>();
  for (const m of t.matchAll(JA.DOW_NAME)) found.add(JA.DOW[m[1]]);
  for (const m of t.matchAll(JA.DOW_LIST)) {
    for (const ch of m[1].replace(JA.DOW_LIST_SEP, '')) found.add(JA.DOW[ch]);
  }
  for (const m of t.matchAll(JA.DOW_RUN)) {
    const letters = m[1];
    if (new Set(letters).size !== letters.length) continue;
    if (letters.length < 3 && !m[2]) continue;
    for (const ch of letters) found.add(JA.DOW[ch]);
  }
  return [...found];
}

function suggestJa(text: string): Guess | null {
  const t = text.normalize('NFKC');
  // 1) 週N回
  const pw = t.match(JA.PER_WEEK);
  if (pw) {
    const n = own(JA.KANJI_NUM, pw[1]) ?? Number(pw[1]);
    if (n >= 1) return perWeek(n);
  }
  if (JA.MONTHLY.test(t)) return null;

  // 2) 曜日
  if (JA.WEEKDAYS.test(t)) return habitDays([1, 2, 3, 4, 5]);
  if (JA.WEEKENDS.test(t)) return habitDays([0, 6]);
  const wd = weekdaysJa(t);
  if (wd.length > 0) return habitDays(wd);

  // 3) 毎日
  if (JA.DAILY_WORDS.test(t)) return habitDays(EVERY_DAY);
  const hours = t.match(JA.HOURS);
  if (hours && Number(hours[1]) < 10) return habitDays(EVERY_DAY);
  if (JA.DAILY_HINTS.some((re) => re.test(t))) return habitDays(EVERY_DAY);
  if (JA.WEEKLY.test(t)) return perWeek(1);

  // 4) 数 + 単位 → 積み上げ（1なら一度きり）
  const cm = t.match(JA.COUNT_UNIT);
  if (cm) {
    const n = parseNum(cm[1]);
    let unit = cm[2].toLowerCase();
    if (unit === 'キロメートル') unit = 'km';
    else if (unit === 'キログラム') unit = 'kg';
    else if (unit === 'キロ') unit = JA.KG_CONTEXT.test(t) ? 'kg' : JA.KM_CONTEXT.test(t) ? 'km' : unit;
    if (n !== undefined && n > 0) {
      if (n === 1 && JA.SINGLE_UNITS.has(unit)) return { kind: 'once' };
      if (unit === 'km' && n < JA.SHORT_KM) return null;
      return counted(n, unit);
    }
  }

  // 5) 心がけ
  if (JA.MIND.test(t)) return { kind: 'mind' };
  // 6) 終わりのあること
  if (JA.ONCE.test(t)) return { kind: 'once' };
  return null;
}

// ── English ──────────────────────────────────────────────────────────────────

/** A spelled-out or written number: '12' · '1,000' · 'twelve' */
function numberEn(s: string, k?: string): number | undefined {
  const n = own(EN.NUM_WORDS, s) ?? parseNum(s);
  return n === undefined ? undefined : k ? n * 1000 : n;
}

/** Day names: 'Sunday' · 'Mon/Wed/Fri' · 'Mon-Fri' · 'MWF' */
function weekdaysEn(t: string, original: string): number[] {
  const found = new Set<number>();
  const range = t.match(EN.DAY_RANGE);
  if (range) {
    const a = own(EN.DAY_SHORT, range[1].slice(0, 3));
    const b = own(EN.DAY_SHORT, range[2].slice(0, 3));
    if (a !== undefined && b !== undefined) {
      // Mon-Fri, Sat-Sun, Fri-Mon (wrapping through the weekend)
      for (let d = a; ; d = (d + 1) % 7) {
        found.add(d);
        if (d === b) break;
      }
      return [...found];
    }
  }
  for (const [re, d] of EN.DAY_FULL) if (re.test(t)) found.add(d);
  for (const m of t.matchAll(EN.DAY_SHORT_LIST)) {
    for (const w of m[0].matchAll(EN.DAY_SHORT_WORD)) {
      const d = own(EN.DAY_SHORT, w[0]);
      if (d !== undefined) found.add(d);
    }
  }
  for (const [re, days] of EN.DAY_LETTERS) if (re.test(original)) for (const d of days) found.add(d);
  return [...found];
}

function suggestEn(original: string): Guess | null {
  const t = original.toLowerCase();
  // 1) N times a week
  const pw = t.match(EN.PER_WEEK);
  if (pw) {
    const n = pw[1] !== undefined ? numberEn(pw[1]) : own(EN.TIMES_WORDS, pw[2]);
    if (n !== undefined && n >= 1) return perWeek(n);
  }
  if (EN.MONTHLY.test(t)) return null;

  // 2) Days of the week
  if (EN.WEEKDAYS.test(t)) return habitDays([1, 2, 3, 4, 5]);
  if (EN.WEEKENDS.test(t)) return habitDays([0, 6]);
  const wd = weekdaysEn(t, original);
  if (wd.length > 0) return habitDays(wd);

  // 3) Every day
  if (EN.DAILY_WORDS.test(t)) return habitDays(EVERY_DAY);
  const hours = t.match(EN.HOURS);
  if (hours && Number(hours[1]) < 10) return habitDays(EVERY_DAY);
  if (EN.DAILY_HINTS.some((re) => re.test(t))) return habitDays(EVERY_DAY);
  if (EN.WEEKLY.test(t)) return perWeek(1);

  // 4) A number and a unit → count (1 → one-time)
  const money = t.match(EN.MONEY);
  if (money) {
    const n = numberEn(money[2], money[3]);
    if (n !== undefined && n > 0) return counted(n, own(EN.MONEY_UNIT, money[1]) ?? money[1]);
  }
  const cm = t.match(EN.COUNT_UNIT);
  if (cm) {
    const n = numberEn(cm[1], cm[2]);
    const unit = own(EN.UNIT_ALIAS, cm[3]) ?? cm[3];
    if (n !== undefined && n > 0) {
      if (n === 1 && EN.SINGLE_UNITS.has(unit)) return { kind: 'once' };
      const short = own(EN.SHORT_DISTANCE, unit);
      if (short !== undefined && n < short) return null;
      return counted(n, unit);
    }
  }

  // 5) Mindset — attitudes and thoughts
  if (EN.MIND.test(t)) return { kind: 'mind' };
  // 6) Things that end
  if (EN.ONCE.test(t)) return { kind: 'once' };
  return null;
}
