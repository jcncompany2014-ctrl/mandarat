// 'settings' 이름공간 — 설정 화면의 줄 · 종이와 포인트 컬러 고르기 · 템플릿 확인 · 백업 줄 · 저장본 · 판권면 · 확인 대화상자(X-G, docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';

/** '이 iPhone과' · '이 iPad와' — 아이패드에서도 iPhone이라 적지 않게(device는 'iPhone' | 'iPad') */
const thisDevice = (device: string) => (device === 'iPad' ? '이 iPad와' : '이 iPhone과');

export default {
  /** 화면 제목 */
  screenTitle: '설정',

  // ── 핵심 목표 ──
  secGoal: '핵심 목표',
  goalEmpty: '핵심 목표를 정해 주세요',
  goalLabel: ({ goal }: { goal: string }) => `핵심 목표, ${goal}`,
  goalHint: '고치기',

  // ── 보기 ──
  secView: '보기',
  subPaper: '종이',
  /** 종이 줄의 화면 읽기 이름 — name은 core.paper* */
  paperLabel: ({ name }: { name: string }) => `종이 ${name}`,
  /** 종이 견본 안의 먹색 글자 한 자 */
  swatchGlyph: '가',
  subAccent: '포인트 컬러',
  accentLabel: ({ name }: { name: string }) => `포인트 컬러 ${name}`,
  subShape: '칸 모서리',
  shapeLabel: ({ name }: { name: string }) => `칸 모서리 ${name}`,

  // ── 기록 › 백업 ──
  secRecords: '기록',
  subBackup: '백업',
  exportTitle: '백업 내보내기',
  /** age는 backupAgeLabel(마지막 백업 · 오늘 …) */
  exportHint: ({ age }: { age: string }) => `${age}. 기록을 파일로 내보내요`,
  exportSaved: '백업 파일을 저장했어요',
  exportWebFail: '이 브라우저에서는 저장할 수 없어요',
  exportDone: '백업을 내보냈어요',
  importTitle: '백업 불러오기',
  importSub: '내보낸 백업으로 기록을 되살려요',

  // ── 저장본(하루 한 번 남기는 기록 사본) ──
  snapTitle: '저장본',
  snapSub: '최근 7일, 하루 한 번 저절로 남겨요',
  snapBody: '최근 7일, 하루 한 번 저절로 남겨요. 고르면 그날의 기록으로 되돌려요.',
  snapLoading: '저장본을 찾는 중이에요',
  snapEmpty: '아직 남은 저장본이 없어요. 하루 중 처음 기록할 때 한 벌씩 남겨요.',
  /** date는 fmt.dateLong */
  snapRow: ({ date }: { date: string }) => `${date} 저장본`,
  /** n은 채운 칸 수, days는 기록한 날 수 */
  snapRowSub: ({ n, days }: { n: number; days: number }) => `채운 칸 ${n} · 기록 ${days}일`,
  snapHint: '이 저장본으로 되돌리기',
  snapAskTitle: '이 저장본으로 되돌릴까요?',
  snapAskBody: '지금 기록이 이 저장본으로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.',
  snapAskOk: '되돌리기',
  snapReadFail: '저장본을 읽지 못했어요',
  snapRestored: ({ date }: { date: string }) => `${date} 저장본으로 되돌렸어요`,

  // ── 저장 위치(백업 줄 아래 안내 · 판권면) ──
  /** 안드로이드 · 웹 — 이 기기에만 */
  storageNoteLocal: '기록은 이 기기에 저장돼요. 기기를 바꾸기 전에 백업을 내보내 두세요.',
  storagePlaceLocal: '이 기기',
  /** iPhone · iPad, iCloud로 맞추기 꺼짐 — iCloud 기기 백업 */
  storageNoteBackup: ({ device }: { device: string }) =>
    `기록은 ${thisDevice(device)} iCloud 백업에 저장돼요. iCloud 백업을 꺼 두었다면 기기를 바꾸기 전에 백업을 내보내 두세요.`,
  storagePlaceBackup: ({ device }: { device: string }) => `${thisDevice(device)} iCloud 백업`,
  /** iPhone · iPad, iCloud로 맞추기 켜짐 */
  storageNoteSync: ({ device }: { device: string }) =>
    `기록은 ${thisDevice(device)} iCloud에 저장되고, 같은 Apple 계정의 iPhone·iPad끼리 맞춰요. 안드로이드나 웹으로 옮길 때는 백업을 내보내 두세요.`,
  storagePlaceSync: ({ device }: { device: string }) => `${thisDevice(device)} iCloud`,

  // ── 기록 › 새로 시작 ──
  subRestart: '새로 시작',
  templateRow: '템플릿으로 새로 쓰기',
  templateRowSub: ({ n }: { n: number }) => `템플릿 ${n}가지 중에서 골라요`,
  templateAskTitle: '템플릿으로 바꿀까요?',
  /** n은 지금 적어 둔 실천 수, name은 템플릿 이름 */
  templateAskBody: ({ n, name }: { n: number; name: string }) =>
    `지금 적어 둔 실천 ${n}개와 오늘 할 일이 지워지고, 영역 8개가 ‘${name}’ 영역으로 바뀌어요. 핵심 목표와 지난 기록은 그대로예요. 바꾼 직후에는 되돌릴 수 있어요.`,
  templateAskOk: '바꾸기',
  templateDone: ({ name }: { name: string }) => `‘${name}’ 템플릿으로 바꿨어요`,
  sampleRow: '예시로 채우기',
  sampleRowSub: '8개 영역 · 64칸 실천 예시를 채워요',
  sampleAskTitle: '예시로 채울까요?',
  sampleAskBody: '지금 적어 둔 영역과 실천이 예시로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.',
  sampleAskOk: '채우기',
  sampleDone: '예시로 채웠어요',
  resetRow: '전체 초기화',
  resetRowSub: '모든 목표와 기록을 지워요',
  resetAskTitle: '모든 기록을 지울까요?',
  resetAskBody: '핵심 목표, 실천 64칸, 했어요 기록이 모두 지워져요. 지운 직후에는 되돌릴 수 있어요.',
  resetAskOk: '지우기',
  resetDone: '모든 기록을 지웠어요',

  // ── 정보(판권면) ──
  secInfo: '정보',
  colName: '이름',
  appName: '만다라트',
  colVersion: '판',
  colFont: '서체',
  /** 판권 줄의 서체 값 — 글꼴 이름과 라이선스 */
  colFontValue: 'Pretendard · SIL OFL 1.1',
  colPlace: '저장 위치',
  privacy: '개인정보 처리방침',
  contact: '문의하기',
  contactHint: '메일 앱이 열려요',
  licenses: '오픈소스 라이선스',
  licensesBody: '이 앱은 아래 오픈소스를 쓰고 있어요.',
  /** LICENSES의 Lucide 줄 이름 — 다른 이름은 고유 이름이라 그대로 */
  licLucide: 'Lucide 아이콘 도형',
  /** 문의 메일 제목 — version은 app.json의 판 */
  mailSubject: ({ version }: { version: string }) => `만다라트 문의 ${version}`,
  openFail: '열 수 없어요',
} satisfies Namespace;
