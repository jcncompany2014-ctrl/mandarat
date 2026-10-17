// testID 목록 — Maestro 흐름(.maestro)과 스토어 스크린샷 도구(tools/store-shots)가 같은 이름으로 찾는다.
// 이름은 바꾸지 않는다(바꾸면 흐름과 스크린샷이 깨진다). V5-B 전에는 리드만 고친다.

export const TID = {
  // 탭
  tab: (id: string) => `tab-${id}`,
  tabAdd: 'tab-add',

  // 홈
  homeSettings: 'home-settings',
  homeYearPrompt: 'home-year-prompt',
  homeRitual: 'home-ritual',

  // 시작하기
  onbGoal: 'onb-goal',
  onbNext: 'onb-next',
  onbSample: 'onb-sample',
  onbTemplate: (id: string) => `onb-template-${id}`,
  onbStart: 'onb-start',
  onbICloud: 'onb-icloud',

  // 오늘
  todayRow: (key: string) => `today-row-${key}`,
  todayCheck: (key: string) => `today-check-${key}`,
  todayModes: 'today-modes',

  // 만다라트 표
  gridTable: 'grid-table',
  gridCell: (ti: number, ai: number) => `grid-cell-${ti}-${ai}`,
  gridShare: 'grid-share',

  // 영역 페이지
  detailBack: 'detail-back',

  // 칸 편집
  editorText: 'editor-text',
  editorSave: 'editor-save',
  editorKind: (k: string) => `editor-kind-${k}`,
  editorRemind: 'editor-remind',

  // 실천 시트
  sheetCheck: 'sheet-check',
  sheetFocus: 'sheet-focus',
  sheetEdit: 'sheet-edit',

  // 집중 타이머
  focusPause: 'focus-pause',
  focusFinish: 'focus-finish',
  focusClose: 'focus-close',

  // 설정
  setLang: (pref: string) => `set-lang-${pref}`,
  setNotify: (kind: string) => `set-notify-${kind}`,
  setNotifyDevice: 'set-notify-device',
  setICloud: 'set-icloud',
  setICloudNow: 'set-icloud-now',
  setPro: 'set-pro',
  setRestore: 'set-restore',
  setYearClose: 'set-year-close',
  setYearShelf: 'set-year-shelf',
  setPaper: (p: string) => `set-paper-${p}`,
  setCrash: 'set-crash',
  setExport: 'set-export',

  // 기록 · 한 해
  statsYear: 'stats-year',
  yearPage: 'year-page',
  yearShelfRow: (id: string) => `year-shelf-row-${id}`,
  yearSheet: 'year-sheet',
  yearPrint: 'year-print',

  // 한 해 닫기
  yearCloseNext: 'year-close-next',
  yearCloseStart: 'year-close-start',

  // 프로
  proBuy: 'pro-buy',
  proRestore: 'pro-restore',
  proClose: 'pro-close',

  // 인쇄
  printPaper: (p: string) => `print-paper-${p}`,
  printLayout: (l: string) => `print-layout-${l}`,
  printBlank: 'print-blank',
  printGo: 'print-go',
  printPdf: 'print-pdf',

  // 공유
  sharePrint: 'share-print',

  // 한 주 돌아보기
  ritualNext: 'ritual-next',
  ritualDone: 'ritual-done',

  // 아이패드
  spreadLeft: 'spread-left',
  spreadRight: 'spread-right',
} as const;
