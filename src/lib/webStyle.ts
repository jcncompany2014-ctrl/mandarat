import { Platform } from 'react-native';

/**
 * 웹 미리보기 전용 전역 스타일.
 * 쓰는 칸의 포커스 표시는 상자가 아니라 칸 아래 먹 줄 — 칸들은 글만 놓이게(좌우 여백 0) 짜여 있어서,
 * 상자 테두리를 두르면 글이 테두리에 딱 붙는다.
 * 줄의 색은 그 칸의 글자 색(currentColor) — 쓰는 칸의 글은 늘 먹(ink 토큰)이라 밝게 · 어둡게 모두 먹 줄이 된다
 * (예전의 골드 포인트 색은 깨끗한 판에서 없앴다). 키보드 사용자를 위해 포커스 표시 자체는 유지한다(2px).
 * 네이티브에서는 아무 일도 하지 않는다.
 */
export function installWebStyles(): void {
  if (Platform.OS !== 'web') return;
  const doc = (globalThis as { document?: any }).document;
  if (!doc || doc.getElementById('mandarat-web-style')) return;
  const el = doc.createElement('style');
  el.id = 'mandarat-web-style';
  el.textContent = [
    'input:focus, textarea:focus { outline: none !important; box-shadow: inset 0 -2px 0 currentColor !important; }',
    // 괘선 종이 위의 칸(실천 시트 메모) — 종이의 괘선이 곧 쓰는 자리라 밑줄을 더하지 않는다
    'textarea[data-ruled]:focus { box-shadow: none !important; }',
  ].join('\n');
  doc.head.appendChild(el);
}
