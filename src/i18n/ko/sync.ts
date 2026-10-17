// 'sync' 이름공간 — 설정 › iCloud · 고르기 시트 · 온보딩의 가져오기 줄(V5-E, docs/v2/plan.md 부록 B).
import type { Namespace } from '../types';

export default {
  // ── 설정 › iCloud ──
  /** 구역 제목 */
  sectionTitle: 'iCloud',
  toggle: 'iCloud로 기기끼리 맞추기',
  toggleSub: '같은 Apple 계정의 iPhone·iPad끼리 기록을 맞춰요',
  /** 상태 줄 — 1분 안에 맞췄을 때 */
  justNow: '방금 맞췄어요',
  /** 상태 줄 — '10월 14일 오후 9:00에 맞췄어요'(day는 fmt.monthDay, time은 fmt.time) */
  syncedAt: ({ day, time }: { day: string; time: string }) => `${day} ${time}에 맞췄어요`,
  /** 살펴보는 중 · 받고 올리는 중 */
  syncing: '맞추는 중이에요',
  /** 고르기 시트가 떠 있는 동안 */
  needsChoice: '어떻게 맞출지 골라 주세요',
  noAccount: 'iCloud에 로그인되어 있지 않아요',
  driveOff: 'iCloud Drive가 꺼져 있어요',
  /** 로그인 · iCloud Drive 줄의 설명(설정 열기와 함께) */
  settingsBody: '기기 설정에서 iCloud를 켜면 다시 맞춰요',
  accountChanged: '다른 iCloud 계정이에요 — 다시 켜면 이 계정 기록과 맞춰요',
  newerApp: '다른 기기의 앱이 더 새 버전이에요. 이 기기도 업데이트하면 다시 맞춰요',
  /** 경고일 뿐 맞추기는 이어진다 */
  tooLarge: '기록이 많아서 맞추는 데 시간이 걸릴 수 있어요',
  ioError: '이번에는 맞추지 못했어요. 잠시 뒤 다시 맞춰요',
  now: '지금 맞추기',
  /** 웹 · 안드로이드 */
  webNote: 'iPhone·iPad 앱에서만 쓸 수 있어요. 다른 기기로 옮길 때는 백업 파일을 써요.',

  // ── 고르기 시트(처음 켤 때 양쪽에 기록이 있으면) ──
  choiceTitle: 'iCloud에 다른 기기 기록이 있어요',
  choiceBody: '이 기기와 iCloud의 기록을 어떻게 맞출지 골라 주세요',
  /** 장부 머리 */
  here: '이 기기',
  cloud: 'iCloud',
  merge: '둘을 합쳐요',
  mergeSub: '같은 칸을 두 기기에서 다르게 고쳤다면 나중에 고친 쪽이 남아요',
  adopt: 'iCloud 기록으로 바꿔요',
  adoptSub: '이 기기의 표와 기록은 iCloud 것으로 바뀌어요. 지난 표 보관함은 합쳐요',
  mine: '이 기기 기록으로 이어 써요',
  mineSub: '다른 기기에서 그사이 적은 기록은 이 기기 것으로 바뀌어요',
  /** 고르기 아래 괘선 한 줄 — 엔진이 고르기 전에 오늘 저장본을 남긴다(keepCopy) */
  copyNote: '고르기 전 모습은 설정 › 저장본에 오늘 날짜로 남아요',
  confirm: '이대로 맞추기',
  /** 아직 고르지 않았을 때 버튼의 힌트 */
  confirmHint: '먼저 하나를 골라 주세요',

  // ── 온보딩 ──
  onbOffer: 'iCloud에 기록이 있어요',
  onbImport: '가져오기',
  onbSub: '다른 iPhone·iPad에서 쓰던 표를 이 기기로 가져와요',
  onbBusy: '가져오는 중이에요',
  onbFailed: '가져오지 못했어요',
} satisfies Namespace;
