// 웹 전용 파일 저장/열기 도우미. 네이티브에서는 아무것도 하지 않고 false/null을 돌려준다.
import { Platform } from 'react-native';

const isWeb = () => Platform.OS === 'web' && typeof document !== 'undefined';

/** 글을 파일로 내려받는다. 성공하면 true. */
export function downloadText(name: string, text: string, mime = 'application/json'): boolean {
  if (!isWeb()) return false;
  try {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}

/** 파일 선택 창을 열어 고른 파일의 글을 읽는다. 취소·실패 시 null. */
export function pickTextFile(accept = '.json,application/json,text/plain'): Promise<{ text: string; name: string } | null> {
  if (!isWeb()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) { resolve(null); return; }
      f.text().then((text) => resolve({ text, name: f.name }), () => resolve(null));
    };
    input.click();
  });
}
