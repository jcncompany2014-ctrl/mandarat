// 'editor' 이름공간 — X-A가 채운다(docs/v2/plan.md 부록 B).
// 칸 편집 창(CellEditor) · 유형 정보 조각(KindBits) · 템플릿 고르기(TemplateSheet) · 시트의 읽는 말(sheetSpeech).
import { josa } from './josa';
import fmt from './fmt';
import type { Namespace } from '../types';

/** 끝소리가 있으면 '이에요', 없으면 '예요' — '3권이에요' · '2예요' (src/lib/sheetSpeech.ts가 다시 내보낸다) */
export function ieyo(word: string): string {
  return josa(word, '은/는').endsWith('은') ? `${word}이에요` : `${word}예요`;
}

export default {
  // ── 편집 창 머리 ──
  /** 핵심 목표 칸의 제목(읽는 말도 같다) */
  centerTitle: '핵심 목표',
  centerPlaceholder: '예) 첫 마라톤 완주하기',
  /** 영역 이름 칸의 제목 — '영역 3 이름' */
  themeTitle: ({ n }: { n: number }) => `영역 ${n} 이름`,
  themePlaceholder: '예) 건강',
  /** 실천 칸의 제목 — '건강 · 실천 3/8' */
  actionTitle: ({ area, n }: { area: string; n: number }) => `${area} · 실천 ${n}/8`,
  /** 예시 자리 글 — '예) 하루 30분 걷기' */
  example: ({ text }: { text: string }) => `예) ${text}`,
  /** 이름이 빈 영역 — '영역 3' */
  areaN: ({ n }: { n: number }) => `영역 ${n}`,

  // ── 저장 · 버리기 ──
  /** 영역의 마지막 빈 칸까지 적었을 때 — '건강은 실천 8개를 다 적었어요' */
  allWritten: ({ area }: { area: string }) => `${josa(area, '은/는')} 실천 8개를 다 적었어요`,
  /** 다음 영역 이름 칸으로 넘어갈 때 읽어 주는 말 — '영역 3 이름을 적어요' */
  nextTheme: ({ n }: { n: number }) => `영역 ${n} 이름을 적어요`,
  cleared: '칸을 비웠어요',
  discardAsk: '고친 내용을 버릴까요?',
  keepEditing: '계속 고치기',
  discard: '버리기',
  clearCell: '칸 비우기',
  save: '저장',
  saveNextArea: '저장하고 다음 영역',
  saveNextCell: '저장하고 다음 칸',

  // ── 쓰던 글 ──
  draftFound: '적던 내용이 있어요',
  draftDiscardA11y: '적던 내용 버리기',
  draftResume: '이어서 쓰기',
  draftResumeA11y: '적던 내용 이어서 쓰기',
  draftRestored: '적던 내용을 다시 올렸어요',

  // ── 내용 줄 ──
  textLabel: '내용',
  helpPlaceholder: '직접 적거나 아래에서 골라요',
  /** 글자 수를 읽는 말 — '60자 중 12자' */
  charCount: ({ n, max }: { n: number; max: number }) => `${max}자 중 ${n}자`,
  helpTitle: '이런 실천은 어때요',
  helpHint: '누르면 내용에 적어요',

  // ── 유형 ──
  kindLabel: '유형',
  /** 유형 고르기 한 칸을 읽는 말 — '유형 습관' */
  kindA11y: ({ label }: { label: string }) => `유형 ${label}`,
  /** 글을 보고 유형을 골라 둔 때 안내 앞에 붙는 말 */
  autoPicked: '글을 보고 골랐어요 · ',
  /** 다른 유형 제안 — 굵은 유형 이름 앞 · 뒤 글('습관으로 바꿀까요?') */
  offerBefore: '',
  offerAfter: ({ label }: { label: string }) => `${josa(label, '으로/로').slice(label.length)} 바꿀까요?`,
  offerKeep: '그대로',
  offerKeepA11y: '지금 유형 그대로 두기',
  offerTake: '바꾸기',
  offerTakeA11y: ({ label }: { label: string }) => `${josa(label, '으로/로')} 바꾸기`,

  // ── 습관 ──
  repeat: '반복',
  byDays: '요일마다',
  byCount: '횟수로',
  perWeekLabel: '횟수',
  perWeekA11y: '주간 횟수',
  /** '주 3회' */
  perWeek: ({ n }: { n: number }) => `주 ${n}회`,
  /** 화면 읽기 값 — 보이는 말이 기호 꼴인 언어(en '3x a week')만 다르다 */
  perWeekSay: ({ n }: { n: number }) => `주 ${n}회`,
  perWeekLess: '주 1회 줄이기',
  perWeekMore: '주 1회 늘리기',
  days: '요일',

  // ── 쌓기 ──
  goal: '목표',
  unit: '단위',
  unitPlaceholder: '권·km·만 원',
  step: '한 번에 더할 양',
  sofar: '지금까지',
  /** '5권 남았어요' */
  left: ({ n, unit }: { n: number; unit: string }) => `${fmt.count({ n, unit })} 남았어요`,
  reached: '목표에 닿았어요 · 저장하면 달성돼요',
  needGoal: '목표 숫자를 적어 주세요',
  tooBig: '숫자는 10억까지 적을 수 있어요',
  stepNumbers: '한 번에 더할 양에는 숫자만 적어 주세요',
  sofarNumbers: '지금까지에는 숫자만 적어 주세요',

  // ── 마감 ──
  due: '마감',
  /** 마감 고르기 칩을 읽는 말 — '마감 3개월 뒤, 2027년 1월 14일 목요일' */
  dueChipA11y: ({ label, date }: { label: string; date: string }) => `마감 ${label}, ${date}`,
  date: '날짜',
  /** 정한 마감을 읽는 말 — '10월 21일 수요일, 마감 7일 남음' */
  dueA11y: ({ date, left }: { date: string; left: string }) => `${date}, ${left}`,
  dueClear: '마감 없애기',
  weekEarlier: '−1주',
  dayEarlier: '−1일',
  dayLater: '+1일',
  weekLater: '+1주',
  weekEarlierA11y: '마감 1주 앞당기기',
  dayEarlierA11y: '마감 하루 앞당기기',
  dayLaterA11y: '마감 하루 미루기',
  weekLaterA11y: '마감 1주 미루기',
  noDue: '마감 없음',

  // ── 마음가짐 점수(KindBits) ──
  /** 보기만 하는 점수 — '오늘 기분 4점' · '오늘 기분 점수 없음' */
  ratingValue: ({ label, n }: { label: string; n: number }) => `${label} ${n}점`,
  ratingNone: ({ label }: { label: string }) => `${label} 점수 없음`,
  /** 매기는 점수 한 칸 — '오늘 기분 4점, 좋아요' */
  ratingOption: ({ label, n, word }: { label: string; n: number; word: string }) => `${label} ${n}점, ${word}`,
  ratingClearHint: '다시 누르면 점수를 지워요',

  // ── 템플릿 고르기 ──
  templateTitle: '템플릿 고르기',
  templateBody: '영역 8개를 골라 둔 시작점이에요. 실천 칸은 비어 있어요.',
  templateA11y: ({ name, desc }: { name: string; desc: string }) => `${name}, ${desc}`,
  /** 영역 이름을 잇는 구분자(읽는 말) */
  listSep: ', ',
  templateAreasHint: ({ areas }: { areas: string }) => `영역: ${areas}`,

  // ── 시트·편집 창의 읽는 말(sheetSpeech) ──
  /** 편집 창 제목을 읽는 말 — '건강 영역, 8칸 중 세 번째 칸' (차트 칸과 같은 고유어 서수) */
  cellTitleSpeech: ({ area, n }: { area: string; n: number }) => `${area} 영역, 8칸 중 ${fmt.ordinalCell({ n })}`,
  /** '저장하고 다음 칸' 뒤에 — '건강 영역 네 번째 칸을 적어요' */
  nextCellSpeech: ({ area, n }: { area: string; n: number }) => `${area} 영역 ${josa(fmt.ordinalCell({ n }), '을/를')} 적어요`,
  /** 마감까지 — '마감 3일 남음' · '오늘 마감' · '마감 2일 지남' */
  dueSpeech: ({ days }: { days: number }) => (days > 0 ? `마감 ${days}일 남음` : days === 0 ? '오늘 마감' : `마감 ${-days}일 지남`),
  /** 이번 주 습관 횟수 — '이번 주 3회 중 2회' */
  weekCountSpeech: ({ done, total }: { done: number; total: number }) => `이번 주 ${total}회 중 ${done}회`,
  /** 쌓기 — '12권 중 7권이에요' (숫자는 묶어 적은 글) */
  countNowSpeech: ({ goalText, nowText, unit }: { goalText: string; nowText: string; unit: string }) => `${goalText}${unit} 중 ${ieyo(`${nowText}${unit}`)}`,
  /** 한 주 돌아보기의 쪽 — '3쪽 중 2쪽' */
  pageSpeech: ({ n, total }: { n: number; total: number }) => `${total}쪽 중 ${n}쪽`,
  /** 습관 장부 한 줄 — '7번 중 5번' */
  ledgerHabitSpeech: ({ done, total }: { done: number; total: number }) => `${total}번 중 ${done}번`,
} satisfies Namespace;
