// 'onboarding' 이름공간 — 처음 화면(src/screens/Onboarding.tsx, X-I).
// 목표 예시 ex1~ex3은 숫자가 들어간 구체적인 목표(연도는 넣지 않는다), 입력칸 안내(placeholder)와 겹치지 않게.
import type { Namespace } from '../types';

export default {
  recoveredTitle: '저장된 기록을 읽지 못했어요',
  recoveredBody: '읽지 못한 기록은 지우지 않고 따로 보관해 두었어요.',

  heading: '올해 꼭 이루고 싶은\n목표 하나를 적어 주세요',
  goalLabel: '핵심 목표',
  goalPlaceholder: '예) 첫 마라톤 완주하기',
  exampleMark: '예)',
  ex1: '몸무게 5kg 줄이기',
  ex2: '토익 900점 넘기',
  ex3: '이직 성공하기',
  exampleHint: '예시 · 입력칸에 넣어요',

  templateAreas: ({ name }: { name: string }) => `‘${name}’ 영역 8개로 시작해요`,
  defaultAreas: '기본 영역 8개로 시작해요',
  defaultCaption: '기본 영역 8개로 시작해요 · 내 목표에 맞게 바꿀 수 있어요',
  unpick: '되돌리기',
  unpickHint: '기본 영역으로 되돌려요',

  startTemplate: '이 표로 시작하기',
  startTemplateHint: ({ name }: { name: string }) => `‘${name}’ 표로 시작해요`,
  start: '시작하기',
  startHint: '이 목표로 시작해요',
  later: '목표는 나중에 쓸게요',
  laterHint: '목표는 나중에 정하고 시작해요',
  otherTemplate: '다른 템플릿 고르기',
  fromTemplate: '템플릿으로 시작하기',
} satisfies Namespace;
