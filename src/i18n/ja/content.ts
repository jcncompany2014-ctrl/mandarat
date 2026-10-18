// 'content' namespace — filled by X-J (docs/v2/plan.md Appendix B).
// テンプレート（src/data/templates.ts）の名前・ひと言の説明・中心の目標・分野8つ。訳ではなく、日本語で書き起こした内容。
import type ko from '../ko/content';
import type { Like } from '../types';

export default {
  balanceName: 'バランスのいい暮らし',
  balanceDesc: '体・心・人間関係・仕事のバランス',
  balanceGoal: '仕事と暮らしを両立する',
  balanceArea1: '健康',
  balanceArea2: '仕事',
  balanceArea3: '学び',
  balanceArea4: '人間関係',
  balanceArea5: 'お金',
  balanceArea6: '趣味',
  balanceArea7: '心',
  balanceArea8: '挑戦',

  healthName: '健やかな体と心',
  healthDesc: '運動・食事・睡眠・メンタルが中心',
  healthGoal: '体力をつけてぐっすり眠る',
  healthArea1: '運動',
  healthArea2: '食生活',
  healthArea3: '睡眠',
  healthArea4: '心を整える',
  healthArea5: '活力',
  healthArea6: '姿勢と体型',
  healthArea7: '休息',
  healthArea8: '健康管理',

  careerName: 'キャリアアップ',
  careerDesc: '専門性・人脈・成果が中心',
  careerGoal: '年収を10%上げる',
  careerArea1: '専門性',
  careerArea2: '人脈',
  careerArea3: '成果',
  careerArea4: '副業',
  careerArea5: '学習',
  careerArea6: '実績',
  careerArea7: '健康',
  careerArea8: 'お金',

  learnName: '学びと成長',
  learnDesc: '読書・講座・語学・記録',
  learnGoal: '毎日30分勉強する',
  learnArea1: '読書',
  learnArea2: '講座',
  learnArea3: '語学',
  learnArea4: '書く',
  learnArea5: '復習',
  learnArea6: '資格',
  learnArea7: '習慣',
  learnArea8: 'ふりかえり',
} satisfies Like<typeof ko>;
