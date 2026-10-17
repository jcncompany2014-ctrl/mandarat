// 'pro' 이름공간 — V1-E · V3-C가 채운다(docs/v2/plan.md 부록 B).
// note*: src/lib/pro.ts의 ProNote마다 한 줄(proNoteText가 고른다). 값과 돈 단위는 적지 않는다 — StoreKit의 displayPrice만 쓴다.
import type { Namespace } from '../types';

export default {
  noteBought: '프로를 열었어요. 고마워요.',
  noteRestored: '구입을 복원했어요. 프로가 열려 있어요.',
  noteRestoredNone: '이 Apple 계정으로 산 프로가 없어요.',
  notePending: '승인을 기다리고 있어요. 승인되면 프로가 열려요.',
  noteUnverified: '구입을 확인하지 못했어요. 잠시 뒤 구입 복원을 눌러 주세요.',
  noteNetwork: '인터넷에 연결되어 있지 않아요. 연결한 뒤 다시 시도해 주세요.',
  noteNotAllowed: '이 기기에서는 결제가 막혀 있어요. 스크린 타임 설정을 확인해 주세요.',
  noteUnavailable: '지금은 프로를 살 수 없어요. 나중에 다시 시도해 주세요.',
  noteUnknown: '결제를 마치지 못했어요. 다시 시도해 주세요.',
} satisfies Namespace;
