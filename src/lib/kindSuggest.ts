// 칸 글에서 실천 유형을 알아본다 — 규칙 기반(AI 호출 없음), 단위 테스트로 고정.
// "주 3회 운동" → 주 3회 습관, "책 12권 읽기" → 쌓기 12권, "감사 표현하기" → 마음가짐 …
// 확실하지 않으면 아무것도 고르지 않는다(null) — 사람이 고르면 된다.
import type { KindConfig } from './kinds';
import { fmtNum, parseNum } from './kinds';
import { daysLabel, normalizeDays } from './routine';

export interface KindSuggestion extends KindConfig {
  /** '주 3회 습관' · '매일 습관' · '쌓기 12권' · '한 번' · '마음가짐' */
  label: string;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const DOW: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

const habitDays = (days: number[]): KindSuggestion => {
  const d = normalizeDays(days);
  return { kind: 'habit', days: d, label: `${daysLabel(d)} 습관` };
};

/** '일요일' · '월·수·금' · '화/목요일' · '월수금'(세 글자 이상) — 요일로 읽히는 부분만 */
function weekdays(t: string): number[] {
  const found = new Set<number>();
  // '…요일'
  for (const m of t.matchAll(/([월화수목금토일])요일/g)) found.add(DOW[m[1]]);
  // 구분점으로 이은 요일들(뒤에 요일·마다·에가 붙어도 된다): 화·목, 월/수/금
  for (const m of t.matchAll(/(?:^|[^가-힣])([월화수목금토일](?:\s*[·,\/]\s*[월화수목금토일])+)(?=요일|마다|에|$|[^가-힣])/g)) {
    for (const ch of m[1].replace(/[\s·,\/]/g, '')) found.add(DOW[ch]);
  }
  // 붙여 쓴 요일: 세 글자 이상(월수금), 또는 뒤에 요일·마다가 붙은 두 글자(화목마다) — '가족 화목' 같은 말은 건너뛴다
  for (const m of t.matchAll(/(?:^|[^가-힣])([월화수목금토일]{2,7})(요일|마다)?(?=$|[^가-힣])/g)) {
    const letters = m[1];
    if (new Set(letters).size !== letters.length) continue; // '일일' 같은 말
    if (letters.length < 3 && !m[2]) continue;
    for (const ch of letters) found.add(DOW[ch]);
  }
  return [...found];
}

/** 날마다 하는 일로 읽히는 말 */
const DAILY_WORDS = /매일|날마다|하루|아침마다|저녁마다|밤마다|자기\s*전|잠들기\s*전|일어나(?:서|자마자)|매\s*끼|식후|출근\s*(?:길|전|후)|퇴근\s*(?:길|전|후)|점심\s*(?:후|시간)|아침에|저녁에|매일매일/;
/** 시간 길이·시각·걸음·물·일기 — 대개 날마다 */
const DAILY_HINTS = [
  /\d+\s*분(?!기|량|야)/, // 10분 (분기·분량 제외)
  /\d+\s*시\s*(?:전|이전|까지)?\s*(?:에\s*)?(?:자기|잠들기|취침|기상|일어나기)/,
  /취침|기상/,
  /\d[\d,]*\s*(?:만\s*)?(?:보|걸음)/, // 1만보, 8000걸음
  /물\s*\d/,
  /일기|저널/,
  /\d+\s*(?:쪽|페이지)/,
];

const MIND = /감사|경청|긍정|배려|존중|겸손|칭찬|미소|웃는|웃기|인사|친절|여유|태도|마음가짐|화내지|화\s*안|불평|험담|비교하지|조급|침착|솔직|정직|예의|너그럽|공감|용서|감정/;
const ONCE = /취득|합격|따기|등록|신청|갱신|완성|출간|출시|마련|구입|구매|장만|예약|이사|검진|접종|완주|완강|수료|졸업|도전|찾기|가기|다녀오기|떠나기|보기|정리|끝내기|마치기|성공/;

/** 쌓기로 읽히는 단위 — 앞의 것이 먼저 맞는다(개국 > 개) */
const COUNT_UNIT = /(\d[\d,]*(?:\.\d+)?)\s*(만\s*원|천\s*원|원|개국|권|곳|군데|가지|개(?!월)|편|곡|명|장|통|그루|건|번|회|km|킬로미터|kg|킬로그램|시간)/i;
/** 한 번이면 끝나는 단위('발표 1회', '기술 1개') */
const SINGLE_UNITS = new Set(['번', '회', '개', '곳', '군데', '가지', '편', '권', '건', '통']);

export function suggestKind(text: string): KindSuggestion | null {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return null;

  // 1) 주 N회 · 일주일에 N번 · 한 주에 N번 · 주 1통화 · 주 3~4회(적은 쪽을 목표로)
  const pw = t.match(/(?:주|일주일에?|1주일에?|한\s*주에?|매주)\s*(\d)(?:\s*[~\-–]\s*\d)?\s*(?:회|번|통|차례)/);
  if (pw) {
    const n = Number(pw[1]);
    if (n >= 7) return habitDays(EVERY_DAY);
    if (n >= 1) return { kind: 'habit', perWeek: n, label: `주 ${n}회 습관` };
  }
  // 한 달 단위는 아직 다루지 않으니 고르지 않는다(월 50만 원 저축, 한 달 한 권)
  if (/매월|매달|한\s*달에|한\s*달\s*한|(?:^|\s)월\s*\d/.test(t)) return null;

  // 2) 요일 — 평일·주말·요일 이름
  if (/평일/.test(t)) return habitDays([1, 2, 3, 4, 5]);
  if (/주말/.test(t)) return habitDays([0, 6]);
  const wd = weekdays(t);
  if (wd.length > 0) return habitDays(wd);

  // 3) 날마다
  if (DAILY_WORDS.test(t)) return habitDays(EVERY_DAY);
  // '공부 2시간'처럼 짧은 시간은 날마다, '봉사 20시간'처럼 긴 시간은 쌓기
  const hours = t.match(/(\d+(?:\.\d+)?)\s*시간/);
  if (hours && Number(hours[1]) < 10) return habitDays(EVERY_DAY);
  if (DAILY_HINTS.some((re) => re.test(t))) return habitDays(EVERY_DAY);
  if (/매주/.test(t)) return { kind: 'habit', perWeek: 1, label: '주 1회 습관' };

  // 4) 숫자 + 단위 → 쌓기 (1이면 한 번)
  const cm = t.match(COUNT_UNIT);
  if (cm) {
    const n = parseNum(cm[1]);
    let unit = cm[2].replace(/\s+/g, '').toLowerCase();
    unit = unit === '만원' ? '만 원' : unit === '천원' ? '천 원' : unit === '킬로미터' ? 'km' : unit === '킬로그램' ? 'kg' : unit;
    if (n !== undefined && n > 0) {
      if (n === 1 && SINGLE_UNITS.has(unit)) return { kind: 'once', label: '한 번' };
      // 짧은 거리는 한 번 뛰는 양인지 쌓을 양인지 알 수 없어 고르지 않는다
      if (unit === 'km' && n < 30) return null;
      return { kind: 'count', goal: n, unit, step: 1, count: 0, label: `쌓기 ${fmtNum(n)}${unit}` };
    }
  }

  // 5) 마음가짐 — 태도와 생각
  if (MIND.test(t)) return { kind: 'mind', label: '마음가짐' };

  // 6) 끝이 있는 일
  if (ONCE.test(t)) return { kind: 'once', label: '한 번' };
  return null;
}
