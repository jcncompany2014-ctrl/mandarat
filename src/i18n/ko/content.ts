// 'content' 이름공간 — X-J가 채운다(docs/v2/plan.md 부록 B).
// 템플릿(src/data/templates.ts)의 이름 · 한 줄 설명 · 핵심 목표 · 영역 8개. 키는 `${템플릿 id}${부분}`.
// v1 글 그대로 — 한국어는 바이트까지 같다.
import type { Namespace } from '../types';

export default {
  balanceName: '균형 잡힌 삶',
  balanceDesc: '몸·마음·관계·일의 균형',
  balanceGoal: '일과 삶 균형 맞추기',
  balanceArea1: '건강',
  balanceArea2: '커리어',
  balanceArea3: '배움',
  balanceArea4: '관계',
  balanceArea5: '재정',
  balanceArea6: '취미',
  balanceArea7: '마음',
  balanceArea8: '도전',

  healthName: '건강한 몸과 마음',
  healthDesc: '운동·식습관·수면·멘탈 중심',
  healthGoal: '체력 키우고 푹 자기',
  healthArea1: '운동',
  healthArea2: '식습관',
  healthArea3: '수면',
  healthArea4: '마음챙김',
  healthArea5: '활력',
  healthArea6: '자세·체형',
  healthArea7: '휴식',
  healthArea8: '건강관리',

  careerName: '커리어 성장',
  careerDesc: '전문성·네트워크·성과 중심',
  careerGoal: '연봉 한 단계 올리기',
  careerArea1: '전문성',
  careerArea2: '네트워크',
  careerArea3: '성과',
  careerArea4: '사이드 프로젝트',
  careerArea5: '학습',
  careerArea6: '포트폴리오',
  careerArea7: '건강',
  careerArea8: '재정',

  learnName: '배움과 성장',
  learnDesc: '독서·강의·언어·기록',
  learnGoal: '매일 30분 공부하기',
  learnArea1: '독서',
  learnArea2: '강의',
  learnArea3: '언어',
  learnArea4: '글쓰기',
  learnArea5: '복습',
  learnArea6: '자격증',
  learnArea7: '습관',
  learnArea8: '회고',
} satisfies Namespace;
