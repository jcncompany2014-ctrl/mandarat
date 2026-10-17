// 'pro' 이름공간 — V1-E · V3-C가 채운다(docs/v2/plan.md 부록 B).
// note*: src/lib/pro.ts의 ProNote마다 한 줄(proNoteText가 고른다). 값과 돈 단위는 적지 않는다 — StoreKit의 displayPrice만 쓴다.
import type { Namespace } from '../types';

export default {
  noteBought: '프로를 열었어요. 고마워요.',
  noteRestored: '구입을 복원했어요. 프로가 열려 있어요.',
  noteRestoredNone: '이 Apple 계정으로 산 프로가 없어요.',
  notePending: '승인을 기다리고 있어요. 승인되면 프로가 열려요.',
  noteUnverified: '구입을 확인하지 못했어요. 잠시 뒤 ‘구입 복원’을 눌러 주세요.',
  noteNetwork: '인터넷에 연결되어 있지 않아요. 연결한 뒤 다시 시도해 주세요.',
  noteNotAllowed: '이 기기에서는 결제가 막혀 있어요. 스크린 타임 설정을 확인해 주세요.',
  noteUnavailable: '지금은 프로를 살 수 없어요. 나중에 다시 시도해 주세요.',
  noteUnknown: '결제를 마치지 못했어요. 다시 시도해 주세요.',

  // 프로 시트(V3-C) — 종이 수첩의 한 쪽. 값은 늘 StoreKit의 displayPrice({price})만 넣는다.
  sheetHead: '프로',
  sheetBody: '한 번만 결제하면 이 Apple 계정의 iPhone·iPad에서 계속 열려요. 지금 쓰는 기능은 그대로 무료예요.',
  ownedHead: '프로가 열려 있어요',
  ownedBody: '이 Apple 계정의 iPhone·iPad에서 아래 기능을 모두 쓸 수 있어요.',
  listHead: '프로로 여는 것',
  featurePaper: '종이 무늬 더 고르기',
  featurePaperSub: '모눈·줄·무지',
  featureWidgetStyle: '위젯 꾸미기',
  featureWidgetStyleSub: '고른 종이 무늬로 위젯을 그려요',
  featurePrintSize: '인쇄 판형',
  featurePrintSizeSub: 'A5·B5 수첩 속지, 영역별 쪽',
  featureArchive: '지난 표 보관함',
  featureArchiveSub: '지난 표를 열고, 돌아보고, 인쇄해요',
  featureSay: ({ name, sub }: { name: string; sub: string }) => `${name}, ${sub}`,
  featureSayHere: ({ name, sub }: { name: string; sub: string }) => `${name}, ${sub}, 방금 고른 기능`,
  priceRow: ({ price }: { price: string }) => `값 · ${price} · 한 번 결제`,
  buy: ({ price }: { price: string }) => `${price}에 프로 열기`,
  busyBuying: '결제 창을 여는 중이에요',
  busyPrice: '가격을 불러오는 중이에요',
  busyRestoring: '구입 기록을 찾는 중이에요',
  restore: '구입 복원',
  restoreHint: '같은 Apple 계정으로 산 프로를 다시 열어요',
  platformNote: 'iPhone·iPad 앱에서 살 수 있어요',
  privacy: '개인정보 처리방침',
  linkFailed: '열 수 없어요',
  // 설정 › 프로
  sectionTitle: '프로',
  rowPro: '프로',
  rowOpen: '열려 있어요',
  rowPrice: ({ price }: { price: string }) => `${price} · 한 번 결제`,
} satisfies Namespace;
