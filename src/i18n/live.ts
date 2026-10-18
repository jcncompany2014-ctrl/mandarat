// 살아 있는 보기 — 모듈 맨 위의 낱말 상수(예: MGMT_LABEL)를 언어가 바뀌어도 그 언어로 읽히게 하는 Proxy.
// 추출 꾸러미(X 웨이브)가 이름과 타입을 지킨 채 바구니로 옮길 때 쓰고, V8-A가 쓰는 곳이 없어지면 지운다.
// Object.keys · entries · 펼치기(...) · for…of · length가 그대로 동작한다(tests/i18n-runtime.test.js).

/** 키가 고정된 기록 — 읽을 때마다 get()의 지금 값을 본다 */
export function liveRecord<T extends object>(get: () => T): T {
  return new Proxy({} as T, {
    get: (_t, k) => Reflect.get(get(), k),
    has: (_t, k) => Reflect.has(get(), k),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_t, k) => {
      const d = Reflect.getOwnPropertyDescriptor(get(), k);
      return d ? { ...d, configurable: true } : undefined;
    },
    set: () => false,
    deleteProperty: () => false,
  });
}

/** 목록 — 읽을 때마다 get()의 지금 배열을 본다(length · 번호 · for…of · 배열 메서드) */
export function liveList<T>(get: () => readonly T[]): readonly T[] {
  return new Proxy([] as T[], {
    get: (_t, k) => {
      const arr = get();
      const v = Reflect.get(arr, k);
      return typeof v === 'function' ? v.bind(arr) : v;
    },
    has: (_t, k) => Reflect.has(get(), k),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_t, k) => {
      if (k === 'length') return { value: get().length, writable: true, enumerable: false, configurable: false };
      const d = Reflect.getOwnPropertyDescriptor(get(), k);
      return d ? { ...d, configurable: true } : undefined;
    },
    set: () => false,
    deleteProperty: () => false,
  });
}
