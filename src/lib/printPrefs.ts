// 인쇄 시트의 마지막 선택(종이·구성·빈 표) — 기기마다(AsyncStorage 'mandarat:print:v1'). 문서·백업·iCloud에는 들어가지 않는다.
// 어느 선택이 프로인지(printLock)와 저장값을 그릴 값으로 바꾸는 일(resolvePrintOptions)도 여기서 — 순수 함수라 Node 테스트 대상.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_PAPERS, PRINT_PAPERS, STORE_KEYS, type PrintLayout, type PrintOptions, type PrintPaper, type PrintTarget, type ProFeature } from './contracts';
import { proValue } from './pro';

const LAYOUTS: readonly PrintLayout[] = ['chart', 'areas'];

/** 저장해 둔 선택 — 고르지 않은 것은 없다 */
export type StoredPrint = Partial<PrintOptions>;

/** 미국·캐나다는 레터, 그 밖은 A4 — 기기의 첫 지역 코드로 정한다 */
export function defaultPaper(region?: string | null): PrintPaper {
  const r = (region ?? '').toUpperCase();
  return r === 'US' || r === 'CA' ? 'Letter' : 'A4';
}

/** 'mandarat:print:v1'의 값 — 깨졌거나 모르는 값은 버리고, 읽은 것만 남긴다 */
export function parsePrintPrefs(raw: unknown): StoredPrint {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const o = v as Record<string, unknown>;
  const out: StoredPrint = {};
  if (typeof o.paper === 'string' && (PRINT_PAPERS as readonly string[]).includes(o.paper)) out.paper = o.paper as PrintPaper;
  if (typeof o.layout === 'string' && (LAYOUTS as readonly string[]).includes(o.layout)) out.layout = o.layout as PrintLayout;
  if (typeof o.blank === 'boolean') out.blank = o.blank;
  return out;
}

export function serializePrintPrefs(p: StoredPrint): string {
  return JSON.stringify(parsePrintPrefs(p));
}

/** 이 종이가 프로인가 — A4 · 레터는 늘 무료 */
export function isProPaper(p: PrintPaper): boolean {
  return !FREE_PAPERS.includes(p);
}

/**
 * 이대로 찍으려면 필요한 프로 기능 — 없으면 null.
 * - 지난 표(archiveId)를 찍으면 'archive'.
 * - A3 · A5 · B5, 또는 표지 + 영역별 8쪽이면 'printSize'.
 * - A4 · 레터의 표 한 장은 빈 표든 채운 표든 늘 null(무료 인쇄 — 테스트가 지킨다).
 */
export function printLock(opts: PrintOptions, target?: PrintTarget | null): ProFeature | null {
  if (target?.archiveId) return 'archive';
  if (isProPaper(opts.paper) || opts.layout === 'areas') return 'printSize';
  return null;
}

/**
 * 그릴 선택 — 저장된 프로 선택은 남겨 두고, 프로가 없으면 무료 모양(기본 종이 · 표 한 장)으로 그린다.
 * freePaper: defaultPaper(지역).
 */
export function resolvePrintOptions(stored: StoredPrint, freePaper: PrintPaper, owned: boolean): PrintOptions {
  return {
    paper: proValue(stored.paper ?? freePaper, freePaper, isProPaper, owned),
    layout: proValue<PrintLayout>(stored.layout ?? 'chart', 'chart', (l) => l === 'areas', owned),
    blank: stored.blank ?? false,
  };
}

/** 쪽 수 — 표 한 장 1쪽, 표지 + 영역별 8쪽은 9쪽 */
export function printPages(layout: PrintLayout): number {
  return layout === 'areas' ? 9 : 1;
}

// ── 저장소 ────────────────────────────────────────────────

let cache: StoredPrint | null = null;
let loading: Promise<StoredPrint> | null = null;

/** 읽어 둔 값(아직 안 읽었으면 null) */
export function peekPrintPrefs(): StoredPrint | null {
  return cache;
}

/** 저장된 선택 — 없거나 읽지 못하면 {}. 처음 한 번만 저장소를 읽는다 */
export function readPrintPrefs(): Promise<StoredPrint> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = AsyncStorage.getItem(STORE_KEYS.print)
      .then((v) => parsePrintPrefs(v), () => ({}))
      .then((p) => {
        // 읽는 사이에 writePrintPrefs가 먼저 값을 정했으면 그것을 따른다
        if (!cache) cache = p;
        return cache;
      });
  }
  return loading;
}

export async function writePrintPrefs(p: StoredPrint): Promise<void> {
  cache = parsePrintPrefs(p);
  try {
    await AsyncStorage.setItem(STORE_KEYS.print, serializePrintPrefs(cache));
  } catch {
    // 저장하지 못해도 이번 실행에서는 고른 대로 찍는다
  }
}
