import { Platform } from 'react-native';

/**
 * 웹 미리보기 전용 전역 스타일.
 * 브라우저 기본 검은 포커스 테두리가 차분한 화면에서 도드라져 보여서, 은은한 골드 링으로 바꾼다.
 * 키보드 사용자를 위해 포커스 표시 자체는 유지한다. 네이티브에서는 아무 일도 하지 않는다.
 */
export function installWebStyles(): void {
  if (Platform.OS !== 'web') return;
  const doc = (globalThis as { document?: any }).document;
  if (!doc || doc.getElementById('mandarat-web-style')) return;
  const el = doc.createElement('style');
  el.id = 'mandarat-web-style';
  el.textContent = 'input:focus, textarea:focus { outline: 2px solid rgba(176,136,60,0.5) !important; outline-offset: 0; }';
  doc.head.appendChild(el);
}
