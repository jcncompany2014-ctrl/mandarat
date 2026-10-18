import { Platform } from 'react-native';

/**
 * 웹 미리보기 전용 전역 스타일.
 * 쓰는 칸의 포커스 표시는 상자가 아니라 칸 아래 골드 줄 — 칸들은 괘선 위에 글만 놓이게(좌우 여백 0) 짜여 있어서,
 * 상자 테두리를 두르면 글이 테두리에 딱 붙는다. 괘선이 있는 칸은 그 줄이 골드로 바뀐 것처럼 보인다.
 * 키보드 사용자를 위해 포커스 표시 자체는 유지한다(2px). 네이티브에서는 아무 일도 하지 않는다.
 */
export function installWebStyles(): void {
  if (Platform.OS !== 'web') return;
  const doc = (globalThis as { document?: any }).document;
  if (!doc || doc.getElementById('mandarat-web-style')) return;
  const el = doc.createElement('style');
  el.id = 'mandarat-web-style';
  el.textContent = [
    'input:focus, textarea:focus { outline: none !important; box-shadow: inset 0 -2px 0 rgba(176,136,60,0.75) !important; }',
    // 괘선 종이 위의 칸(실천 시트 메모) — 종이의 괘선이 곧 쓰는 자리라 밑줄을 더하지 않는다
    'textarea[data-ruled]:focus { box-shadow: none !important; }',
  ].join('\n');
  doc.head.appendChild(el);
}
