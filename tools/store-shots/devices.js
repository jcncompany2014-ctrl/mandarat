// 스크린샷을 만드는 기기 — 포스터의 논리 크기(pt) × 배율 = 내보내는 PNG 크기(px). displayType은 EAS Metadata(store.config.json)의 이름.
// 포스터의 뼈대(여백 · 글씨 크기 · 그림 자리)는 poster.js layout()이 이 크기에서 정한다.
// query: 앱을 띄울 때 주소에 붙인다 — 아이패드는 ?layout=device로 열어, 640pt 창이 웹의 폰 한 단(480)이 아니라 아이패드의 한 단으로 그려진다.
const DEVICES = [
  { id: 'iphone-6.9', name: '6.9" iPhone', width: 440, height: 956, scale: 3, out: [1320, 2868], displayType: 'APP_IPHONE_67', query: '' },
  { id: 'iphone-6.3', name: '6.3" iPhone', width: 402, height: 874, scale: 3, out: [1206, 2622], displayType: 'APP_IPHONE_61', query: '' },
  { id: 'iphone-6.5', name: '6.5" iPhone', width: 428, height: 926, scale: 3, out: [1284, 2778], displayType: 'APP_IPHONE_65', query: '' },
  { id: 'ipad-13', name: '13" iPad', width: 1032, height: 1376, scale: 2, out: [2064, 2752], displayType: 'APP_IPAD_PRO_3GEN_129', query: 'layout=device' },
];

/** 이름 목록('all' 또는 'iphone-6.9,ipad-13') → 기기들 */
function pickDevices(list) {
  if (!list || list === 'all') return DEVICES;
  const ids = list.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.map((id) => {
    const d = DEVICES.find((x) => x.id === id);
    if (!d) throw new Error(`모르는 기기: ${id} (있는 것: ${DEVICES.map((x) => x.id).join(', ')})`);
    return d;
  });
}

module.exports = { DEVICES, pickDevices };
