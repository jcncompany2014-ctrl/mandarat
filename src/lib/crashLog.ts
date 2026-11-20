// 오류 기록 — 이 기기에만 남는 마지막 20건. 앱 곳곳의 crash.report · crumb · tag(src/lib/crash.ts)와 전역 손잡이가 여기로 모인다.
// 어디에도 보내지 않는다(통신 코드가 없다): 사용자가 설정 › 문의하기의 메일에 붙여 직접 보내거나, 오류 화면에서 복사할 때만 기기 밖으로 나간다.
//
// 사용자가 적은 글(목표 · 칸 · 할 일 · 메모 · 한 줄 기록)은 남기지 않는다:
// - 남기는 것은 오류 이름 · 메시지 한 줄 · 스택의 함수 이름과 파일 · 줄 번호 · 컴포넌트 이름뿐이다.
//   스택의 첫 줄은 메시지를 되풀이하므로 버리고, 자리(frame) 꼴인 줄만 다시 짜서 남긴다.
// - 넣은 값을 되받아 적는 오류(JSON 읽기 등)는 메시지의 고정된 앞머리만 남긴다.
// - 그 밖의 메시지도 따옴표 안은 식별자 꼴일 때만, 주소는 ? 앞까지만, 영문 · 숫자 · 기호 밖의 글자는 모두 뺀다. 길이는 늘 자른다.
// - Error가 아닌 값(문자열 · 객체로 던진 것)은 값의 종류만 적는다.
// - 부스러기(crumb) · 태그는 코드가 정한 낱말만 받는다 — 부르는 자리는 tests/crashLog.test.js가 세어 둔다.
//
// RN 의존 없는 순수 모듈. 저장 자리(기기: 파일 · 웹: localStorage)와 손잡이 걸기는 crashBoot.ts가 맡는다.
import appJson from '../../app.json';

/** 남기는 기록 수 — 넘치면 오래된 것부터 버린다 */
export const LOG_MAX = 20;
/** 다음 기록에 붙일 부스러기 수 */
export const CRUMB_MAX = 10;
/** 길이 막음 */
export const LOG_CAP = { name: 40, msg: 160, echo: 48, frames: 6, frame: 96, comps: 8, comp: 40, crumb: 48, tag: 24, where: 32 } as const;

/** render: 경계가 잡은 그리기 오류 · fatal/error: 전역 손잡이 · promise: 받지 않은 거절 · report: 코드가 직접 알린 것 */
export type CrashKind = 'render' | 'fatal' | 'error' | 'promise' | 'report';

export interface CrashEntry {
  /** 난 때(ms) */
  at: number;
  /** 앱 판 */
  v: string;
  /** OS와 그 판 — 'ios 18.1' */
  os: string;
  lang?: string;
  /** 그때의 화면(+ 떠 있던 시트) — 'today+quick' */
  screen?: string;
  /** 그 밖의 태그 — 'layout=spread pro=n' */
  tags?: string;
  kind: CrashKind;
  /** 어디서 잡았는지 — 'screen:today' · 'overlay:quick' · 'widgetSync' */
  where?: string;
  name: string;
  msg: string;
  stack: string[];
  /** 컴포넌트 이름(안쪽부터) */
  comp?: string[];
  crumbs?: string[];
  /** 같은 오류가 잇달아 난 횟수 — 2부터 적는다 */
  n?: number;
}

/** 저장 자리 — 둘 다 곧바로 끝나야 한다(멈추는 오류는 쓰기를 기다려 주지 않는다). 던져도 된다(기록기가 받는다) */
export interface LogStore {
  read(): string | null;
  write(text: string): void;
}

// ── 글 거르기 ─────────────────────────────────────────────────────────────────

/** 영문 · 숫자와 몇 가지 기호만 — 코드가 정한 낱말(태그 · 부스러기 · 함수 이름)용 */
function word(s: unknown, max: number): string {
  return (typeof s === 'string' ? s : '').replace(/[^\w$.:<>+=/ -]+/g, '').trim().slice(0, max);
}

/** 영문 · 숫자 · 기호 밖의 글자(한글 · 가나 · 한자 · 그림 글자 …)는 * 하나로 — 띄어 쓴 낱말들도 한 덩이로 */
function ascii(s: string): string {
  return s.replace(/[^\x20-\x7E]+/g, '*').replace(/\*(?: ?\*)+/g, '*');
}

/** 거르기 전에 들여다보는 길이 — 한 줄 · 스택 전체. 실제 자리(frame) 한 줄은 이보다 한참 짧다 */
const SCAN = { line: 600, stack: 20_000 } as const;
const NAME_RE = /^[A-Za-z_$][\w$.]*$/;
const IDENT_RE = /^[A-Za-z_$][\w$]{0,31}$/;
/** 넣은 값을 되받아 적는 오류 — 메시지에 문서의 글이 섞일 수 있어 고정된 앞머리만 남긴다 */
const ECHO_RE = /JSON|Unexpected (?:token|end|number|string|identifier|character)|not valid|on string|operator|regular expression|RegExp|malformed/i;

export function scrubName(name: unknown): string {
  return typeof name === 'string' && name.length <= LOG_CAP.name && NAME_RE.test(name) ? name : 'Error';
}

export function scrubMessage(name: string, message: unknown): string {
  if (typeof message !== 'string') return '';
  // 첫 줄만, 그것도 앞부분만 본다(아주 긴 메시지에서 거르는 데 시간을 쓰지 않게)
  const line = message.slice(0, SCAN.line).split(/\r?\n/, 1)[0];
  if (name === 'SyntaxError' || ECHO_RE.test(line)) return ascii(line.split(/["'`:,(]/, 1)[0]).trim().slice(0, LOG_CAP.echo);
  const s = line
    // 주소는 ? 앞까지만(React의 축약 오류 주소 · mailto의 본문)
    .replace(/((?:[a-z][a-z0-9+.-]*:\/\/|mailto:)[^\s?]*)\?\S*/gi, '$1')
    // 따옴표 안은 식별자 꼴(속성 · 함수 이름)일 때만
    .replace(/(["'`])(.*?)\1/g, (all: string, q: string, inner: string) => (IDENT_RE.test(inner) ? all : `${q}*${q}`));
  return ascii(s).trim().slice(0, LOG_CAP.msg);
}

// '    at fn (address at /…/main.jsbundle:1:2345)' (Hermes) · '    at fn (https://…/index.js:1:2)' (V8) · '    at https://…:1:2'
const FRAME_AT = /^\s*at (?:(.*?) \()?(?:address at )?([^()]*?):(\d+):(\d+)\)?\s*$/;
// 'fn@https://…/index.js:1:2' (JavaScriptCore · Firefox)
const FRAME_ALT = /^\s*([^@\s]*)@(.*?):(\d+):(\d+)\s*$/;

function frame(line: string): string | null {
  const m = FRAME_AT.exec(line) ?? FRAME_ALT.exec(line);
  if (!m) return null;
  const file = word((m[2].split(/[\\/]/).pop() ?? '').split('?')[0], 40);
  return `${word(m[1], 48) || '?'} (${file}:${m[3]}:${m[4]})`.slice(0, LOG_CAP.frame);
}

/**
 * 스택의 위쪽 자리 몇 개 — 함수 이름 · 파일 이름 · 줄:칸만(폴더 경로는 버린다).
 * 스택 머리에 되풀이된 메시지(여러 줄일 수 있다)는 먼저 잘라 낸다 — 그 줄이 자리 꼴로 읽히지 않게.
 */
export function scrubStack(stack: unknown, message?: unknown): string[] {
  if (typeof stack !== 'string') return [];
  const at = typeof message === 'string' && message ? stack.indexOf(message) : -1;
  const body = (at >= 0 ? stack.slice(at + (message as string).length) : stack).slice(0, SCAN.stack);
  const out: string[] = [];
  for (const line of body.split('\n')) {
    if (line.length > SCAN.line) continue;
    const f = frame(line);
    if (f) out.push(f);
    if (out.length >= LOG_CAP.frames) break;
  }
  return out;
}

/** 컴포넌트 스택 — 이름만, 안쪽부터 몇 개 ('    at Dashboard (…)' · '    in Dashboard (created by …)') */
export function scrubComponents(componentStack: unknown): string[] {
  if (typeof componentStack !== 'string') return [];
  const out: string[] = [];
  for (const line of componentStack.slice(0, SCAN.stack).split('\n')) {
    const m = /^\s*(?:at|in) ([A-Za-z_$][\w$.]*)/.exec(line);
    if (m) out.push(m[1].slice(0, LOG_CAP.comp));
    if (out.length >= LOG_CAP.comps) break;
  }
  return out;
}

// ── 기록 ─────────────────────────────────────────────────────────────────────

let entries: CrashEntry[] = [];
let crumbs: string[] = [];
let tags: Record<string, string> = {};
let os = '';
let store: LogStore | null = null;
/** 저장된 기록을 아직 읽지 않았다 — 처음 쓰거나 읽을 때 한 번 읽어 앞에 잇는다 */
let unread = false;

const KINDS: readonly CrashKind[] = ['render', 'fatal', 'error', 'promise', 'report'];
const strs = (v: unknown, n: number, max: number): string[] =>
  (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string').slice(0, n).map((x) => ascii(x).slice(0, max));
const optStr = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v ? ascii(v).slice(0, max) : undefined);

/** 저장된 글 → 기록들. 모양이 다른 것은 버리고, 길이는 다시 자른다(파일은 믿지 않는다) */
export function parseLog(raw: string | null): CrashEntry[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = (data as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(list)) return [];
  const out: CrashEntry[] = [];
  for (const x of list as Record<string, unknown>[]) {
    if (!x || typeof x !== 'object' || typeof x.at !== 'number' || !Number.isFinite(x.at)) continue;
    const kind = KINDS.find((k) => k === x.kind);
    if (!kind || typeof x.name !== 'string' || typeof x.msg !== 'string') continue;
    const e: CrashEntry = {
      at: x.at,
      v: optStr(x.v, 16) ?? '',
      os: optStr(x.os, LOG_CAP.tag) ?? '',
      kind,
      name: scrubName(x.name),
      msg: ascii(x.msg).slice(0, LOG_CAP.msg),
      stack: strs(x.stack, LOG_CAP.frames, LOG_CAP.frame),
    };
    const lang = optStr(x.lang, 8);
    const screen = optStr(x.screen, LOG_CAP.where);
    const tagLine = optStr(x.tags, 64);
    const where = optStr(x.where, LOG_CAP.where);
    const comp = strs(x.comp, LOG_CAP.comps, LOG_CAP.comp);
    const crumbList = strs(x.crumbs, CRUMB_MAX, LOG_CAP.crumb);
    if (lang) e.lang = lang;
    if (screen) e.screen = screen;
    if (tagLine) e.tags = tagLine;
    if (where) e.where = where;
    if (comp.length > 0) e.comp = comp;
    if (crumbList.length > 0) e.crumbs = crumbList;
    if (typeof x.n === 'number' && x.n > 1) e.n = Math.floor(x.n);
    out.push(e);
  }
  return out.slice(-LOG_MAX);
}

function load(): void {
  if (!unread) return;
  unread = false;
  try {
    // 저장된 것이 더 오래됐다 — 읽기 전에 난 것(지금 메모리)을 뒤에 잇는다
    entries = [...parseLog(store?.read() ?? null), ...entries].slice(-LOG_MAX);
  } catch {
    // 읽지 못해도 기록은 이어 간다
  }
}

function save(): void {
  try {
    store?.write(JSON.stringify({ v: 1, entries }));
  } catch {
    // 쓰지 못해도 메모리의 기록은 남는다
  }
}

/** 저장 자리를 붙인다 — 저장된 기록은 처음 쓰거나 읽을 때 읽는다(앱을 여는 길에는 읽지 않는다) */
export function attachLogStore(s: LogStore | null): void {
  store = s;
  unread = s !== null;
}

/** OS와 그 판 — 'ios 18.1' */
export function setLogOs(text: string): void {
  os = word(text, LOG_CAP.tag);
}

/** 지금 상태 한 가지(lang · screen · overlay · layout · pro) — 값이 비면 지운다 */
export function logTag(key: string, value: string): void {
  try {
    const k = word(key, 16);
    const v = word(value, LOG_CAP.tag);
    if (!k) return;
    if (v) tags[k] = v;
    else delete tags[k];
  } catch {
    // 기록기는 던지지 않는다
  }
}

/** 지나온 자리 하나 — 마지막 몇 개만 메모리에 두고 다음 기록에 붙인다 */
export function logCrumb(category: string, message: string): void {
  try {
    const text = `${word(category, 12)}:${word(message, 32)}`.slice(0, LOG_CAP.crumb);
    crumbs = [...crumbs, text].slice(-CRUMB_MAX);
  } catch {
    // 기록기는 던지지 않는다
  }
}

function sameError(a: CrashEntry, b: CrashEntry): boolean {
  return a.kind === b.kind && a.name === b.name && a.msg === b.msg && a.where === b.where && a.stack[0] === b.stack[0];
}

/** 오류 하나를 남긴다 — 결코 던지지 않는다 */
export function record(e: unknown, o: { kind?: CrashKind; where?: string; componentStack?: string } = {}): void {
  try {
    const err = typeof e === 'object' && e !== null ? (e as { name?: unknown; message?: unknown; stack?: unknown }) : null;
    const isError = e instanceof Error || (err !== null && typeof err.message === 'string');
    // Error가 아닌 값은 종류만 — 값 자체는 사용자가 적은 글일 수 있다
    const name = isError ? scrubName(err?.name) : 'NonError';
    const comp = scrubComponents(o.componentStack);
    const { lang, screen, overlay, ...rest } = tags;
    const entry: CrashEntry = {
      at: Date.now(),
      v: String(appJson.expo.version).slice(0, 16),
      os,
      kind: o.kind ?? (comp.length > 0 ? 'render' : 'report'),
      name,
      msg: isError ? scrubMessage(name, err?.message) : e === null ? 'null' : typeof e,
      stack: isError ? scrubStack(err?.stack, err?.message) : [],
    };
    if (lang) entry.lang = lang;
    const shown = [screen, overlay].filter(Boolean).join('+');
    if (shown) entry.screen = shown;
    const tagLine = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join(' ').slice(0, 64);
    if (tagLine) entry.tags = tagLine;
    const where = word(o.where, LOG_CAP.where);
    if (where) entry.where = where;
    if (comp.length > 0) entry.comp = comp;
    if (crumbs.length > 0) entry.crumbs = [...crumbs];

    load();
    const last = entries[entries.length - 1];
    if (last && sameError(last, entry)) {
      // 되풀이되는 같은 오류는 세기만 한다 — 기록 20건을 한 가지로 채우지 않고, 쓰기도 가끔만
      last.n = (last.n ?? 1) + 1;
      last.at = entry.at;
      if (last.n > 3 && last.n % 20 !== 0) return;
    } else {
      entries = [...entries, entry].slice(-LOG_MAX);
    }
    save();
  } catch {
    // 기록기는 던지지 않는다
  }
}

/** 지금 기록(오래된 것부터) — 복사본 */
export function logEntries(): CrashEntry[] {
  load();
  return entries.map((e) => ({ ...e }));
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** 기록 하나를 글로 — 머리 줄(때 · 판 · OS · 언어 · 종류 · 자리 · 화면) + 오류 + 스택 */
export function entryText(e: CrashEntry): string {
  const d = new Date(e.at);
  const when = Number.isNaN(d.getTime()) ? '?' : `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const head = [when, `v${e.v}`, e.os, e.lang, e.kind, e.where, e.screen ? `@${e.screen}` : '', e.tags, e.n ? `x${e.n}` : ''].filter(Boolean).join(' ');
  const lines = [head, e.msg ? `${e.name}: ${e.msg}` : e.name, ...e.stack.map((f) => `  ${f}`)];
  if (e.comp?.length) lines.push(`  in ${e.comp.join(' < ')}`);
  if (e.crumbs?.length) lines.push(`  crumbs ${e.crumbs.join(' > ')}`);
  return lines.join('\n');
}

/** 기록 전체를 글로 — 새것부터. 비어 있으면 '' */
export function logText(): string {
  load();
  return [...entries].reverse().map(entryText).join('\n\n');
}

// ── 전역 손잡이 ───────────────────────────────────────────────────────────────

type Handler = (error: unknown, isFatal?: boolean) => void;

/** 손잡이를 거는 전역 — RN의 ErrorUtils · Hermes의 거절 추적 · 웹의 window */
export interface CrashGlobals {
  ErrorUtils?: { getGlobalHandler?: () => Handler | undefined; setGlobalHandler?: (h: Handler) => void };
  HermesInternal?: {
    enablePromiseRejectionTracker?: (o: {
      allRejections: boolean;
      onUnhandled: (id: number, rejection: unknown) => void;
      onHandled: (id: number) => void;
    }) => void;
  };
  document?: unknown;
  addEventListener?: (type: string, cb: (ev: { error?: unknown; reason?: unknown }) => void) => void;
}

/**
 * 전역 손잡이를 건다 — 한 번만 부른다(index.ts가 App보다 먼저 불러오는 crashBoot.ts).
 * - RN: 지금 걸린 손잡이를 감싼다. 기록한 뒤 그 손잡이를 그대로 부르므로 개발 판의 빨간 화면 · 출시 판의 종료는 달라지지 않는다.
 * - Hermes(출시 판만): 받지 않은 약속 거절을 기록만 한다. 개발 판은 RN이 이미 추적을 켜 경고를 띄우므로 건드리지 않는다
 *   (node_modules/react-native/Libraries/Core/polyfillPromise.js — 추적은 __DEV__에서만 켜진다).
 * - 웹: window의 error · unhandledrejection을 기록만 한다.
 */
export function installCrashHandlers(
  g: CrashGlobals = globalThis as CrashGlobals,
  dev: boolean = typeof __DEV__ !== 'undefined' && !!__DEV__,
): void {
  try {
    const eu = g.ErrorUtils;
    if (eu && typeof eu.getGlobalHandler === 'function' && typeof eu.setGlobalHandler === 'function') {
      const prev = eu.getGlobalHandler();
      eu.setGlobalHandler((error, isFatal) => {
        record(error, { kind: isFatal ? 'fatal' : 'error' });
        if (prev) prev(error, isFatal);
      });
    }
  } catch {
    // 손잡이를 걸지 못해도 앱은 뜬다
  }
  if (!dev) {
    try {
      g.HermesInternal?.enablePromiseRejectionTracker?.({
        allRejections: true,
        onUnhandled: (_id, rejection) => record(rejection, { kind: 'promise' }),
        onHandled: () => {},
      });
    } catch {
      // 추적을 켜지 못해도 앱은 뜬다
    }
  }
  try {
    if (g.document && typeof g.addEventListener === 'function') {
      g.addEventListener('error', (ev) => record(ev?.error, { kind: 'error' }));
      g.addEventListener('unhandledrejection', (ev) => record(ev?.reason, { kind: 'promise' }));
    }
  } catch {
    // 듣지 못해도 앱은 뜬다
  }
}

/** 테스트용 — 메모리의 기록 · 부스러기 · 태그 · 저장 자리를 처음으로 */
export function resetLogForTest(): void {
  entries = [];
  crumbs = [];
  tags = {};
  os = '';
  store = null;
  unread = false;
}
