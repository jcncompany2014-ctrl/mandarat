// 스크린샷을 찍는 기기 — 논리 크기(pt) × 배율 = 내보내는 PNG 크기(px). displayType은 EAS Metadata(store.config.json)의 이름.
// 화면 위쪽 band(pt)에는 짧은 설명을 얹고, 앱은 그 아래(높이 − band)에 그대로 그린다(기기 테두리·그림자 없음).
// statsLift: 통계 장면에서 '8개 영역'(닳은 자리) 머리가 TID.statsYear보다 위에 있는 거리(pt) — 그 표에 testID가 생기면(V5-B) 안 쓴다.
// 아이패드는 웹 미리보기가 폰 폭으로 묶지 않게 ?layout=device로 연다.
const DEVICES = [
  { id: 'iphone-6.9', name: '6.9" iPhone', width: 440, height: 956, scale: 3, out: [1320, 2868], displayType: 'APP_IPHONE_67', band: 176, statsLift: 974, query: '' },
  { id: 'iphone-6.3', name: '6.3" iPhone', width: 402, height: 874, scale: 3, out: [1206, 2622], displayType: 'APP_IPHONE_61', band: 164, statsLift: 936, query: '' },
  { id: 'iphone-6.5', name: '6.5" iPhone', width: 428, height: 926, scale: 3, out: [1284, 2778], displayType: 'APP_IPHONE_65', band: 172, statsLift: 962, query: '' },
  { id: 'ipad-13', name: '13" iPad', width: 1032, height: 1376, scale: 2, out: [2064, 2752], displayType: 'APP_IPAD_PRO_3GEN_129', band: 232, statsLift: 1174, query: 'layout=device' },
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
