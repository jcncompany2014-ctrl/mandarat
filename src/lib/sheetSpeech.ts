import { ORDINAL } from './chartSpeech';
import { josa } from './text';

/**
 * 시트·편집 창에서 소리로 읽을 말. '3/8' · '6/12권' · 'D-3' · '1/3쪽'은 VoiceOver가 날짜·'디 마이너스'로
 * 읽으므로, 화면에 보이는 표기와 따로 읽을 말을 만든다(KindLine.speech와 같은 꼴).
 */

/** 끝소리가 있으면 '이에요', 없으면 '예요' — '3권이에요' · '2예요' */
export function ieyo(word: string): string {
  return josa(word, '은/는').endsWith('은') ? `${word}이에요` : `${word}예요`;
}

/**
 * 편집 창 제목을 읽는 말 — '건강 영역, 8칸 중 세 번째 칸'.
 * 차트 칸(chartSpeech.cellLabel)과 같은 고유어 서수 — '3번째'는 '삼번째'로 읽혀서 같은 칸이 두 가지로 들리지 않게
 */
export function cellTitleSpeech(area: string, ai: number): string {
  return `${area} 영역, 8칸 중 ${ORDINAL[ai] ?? `${ai + 1}`} 번째 칸`;
}

/** '저장하고 다음 칸' 뒤에 알려 줄 말 — '건강 영역 네 번째 칸을 적어요' (고유어 서수) */
export function nextCellSpeech(area: string, ai: number): string {
  return `${area} 영역 ${ORDINAL[ai] ?? `${ai + 1}`} 번째 칸을 적어요`;
}

/** 마감까지 남은 날을 읽는 말 — '마감 3일 남음' · '오늘 마감' · '마감 2일 지남' */
export function dueSpeech(days: number): string {
  const n = Math.round(days);
  return n > 0 ? `마감 ${n}일 남음` : n === 0 ? '오늘 마감' : `마감 ${-n}일 지남`;
}

/** 이번 주 습관 횟수 — '이번 주 3회 중 2회' */
export function weekCountSpeech(done: number, planned: number): string {
  return `이번 주 ${planned}회 중 ${done}회`;
}

/** 쌓기 더하기·빼기 뒤 — '12권 중 7권이에요' (숫자는 fmtNum으로 적은 글을 받는다) */
export function countNowSpeech(goal: string, count: string, unit: string): string {
  return `${goal}${unit} 중 ${ieyo(`${count}${unit}`)}`;
}

/** 한 주 돌아보기의 쪽 — '3쪽 중 2쪽' */
export function pageSpeech(index: number, total: number): string {
  return `${total}쪽 중 ${index + 1}쪽`;
}

/** 습관 장부 한 줄 — '7번 중 5번' */
export function ledgerHabitSpeech(done: number, due: number): string {
  return `${due}번 중 ${done}번`;
}
