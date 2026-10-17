// 위젯 확장의 현지화 문자열(ko · ja · en)을 넣는 설정 플러그인 — 위젯 고르기 화면의 이름과 설명.
// app.json에서 expo-widgets보다 앞에 둔다: 모드는 거꾸로 돌고, expo-widgets는 자기 대상 폴더를 지우고 다시 만든다.
// 그래서 이 플러그인의 모드는 expo-widgets 뒤에 돈다(폴더도, ExpoWidgetsTarget 대상도 이미 있다).
//
// - expo-widgets는 Swift에 .configurationDisplayName("오늘") · .description("…")을 글자 그대로 쓴다. SwiftUI는 이것을
//   LocalizedStringKey로 읽어 위젯 확장의 Localizable.strings에서 찾는다 — 열쇠는 한국어 원문, 값은 기기 언어의 말.
// - 말은 src/i18n/{ko,ja,en}/widget.ts의 galleryName · galleryDesc(TS를 그 자리에서 바꿔 읽는다).
// - expo-widgets는 ExpoWidgetsTarget에 Resources 빌드 단계를 만들지 않는다(addBuildPhases: Sources · Frameworks ·
//   본 앱의 Copy Files뿐). 그래서 여기서 PBXResourcesBuildPhase를 만들고 Localizable.strings 변형 묶음(variant group)을
//   넣고, 프로젝트 knownRegions에 ko · ja · en을 더한다. 여러 번 돌아도 한 벌만 남는다.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const TARGET = 'ExpoWidgetsTarget';
const LANGS = ['ko', 'ja', 'en'];
const STRINGS = 'Localizable.strings';
const ROOT = path.join(__dirname, '..');

/** src/i18n/<lang>/widget.ts의 기본 내보내기 — 타입만 불러오는 파일이라 TS를 바꿔 그 자리에서 돌린다 */
function loadCatalog(lang, root = ROOT) {
  const ts = require('typescript');
  const file = path.join(root, 'src', 'i18n', lang, 'widget.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const mod = { exports: {} };
  const req = (id) => {
    throw new Error(`withWidgetStrings: ${file} imports '${id}' — widget catalogs may only use type imports`);
  };
  new Function('exports', 'require', 'module', outputText)(mod.exports, req, mod);
  return mod.exports.default;
}

/** .strings 따옴표 안에 넣을 수 있게 — 역빗금 · 따옴표 · 줄바꿈 */
function escapeStrings(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

/** [열쇠, 값] 쌍 → Localizable.strings 내용 */
function buildStrings(pairs) {
  return pairs.map(([k, v]) => `"${escapeStrings(k)}" = "${escapeStrings(v)}";\n`).join('');
}

/** 언어마다 Localizable.strings 내용 — 열쇠는 ko 원문(app.json의 displayName · description과 같다) */
function widgetStrings(catalogs = Object.fromEntries(LANGS.map((l) => [l, loadCatalog(l)]))) {
  const ko = catalogs.ko;
  const out = {};
  for (const l of LANGS) {
    const c = catalogs[l];
    out[l] = buildStrings([[ko.galleryName, c.galleryName], [ko.galleryDesc, c.galleryDesc]]);
  }
  return out;
}

/** app.json의 expo-widgets TodayWidget 설정(없으면 null) */
function widgetConfig(config) {
  const entry = (config.plugins || []).find((p) => (Array.isArray(p) ? p[0] : p) === 'expo-widgets');
  const widgets = Array.isArray(entry) && entry[1] && entry[1].widgets;
  return (widgets || []).find((w) => w.name === 'TodayWidget') || null;
}

const unquote = (s) => (typeof s === 'string' ? s.replace(/^"(.*)"$/, '$1') : s);

/** ExpoWidgetsTarget에 Resources 단계 + Localizable.strings 변형 묶음 + knownRegions — 이미 있으면 그대로 */
function addWidgetStrings(project) {
  const objects = project.hash.project.objects;
  const targetKey = project.findTargetKey(TARGET);
  if (!targetKey) throw new Error(`withWidgetStrings: no ${TARGET} target — keep this plugin before expo-widgets in app.json`);
  const target = objects.PBXNativeTarget[targetKey];

  // 위젯 파일 묶음(expo-widgets가 name·path = ExpoWidgetsTarget으로 만든다)
  const groups = objects.PBXGroup;
  const groupKey = Object.keys(groups).find(
    (k) => !k.endsWith('_comment') && (unquote(groups[k].name) === TARGET || unquote(groups[k].path) === TARGET),
  );
  if (!groupKey) throw new Error(`withWidgetStrings: no ${TARGET} group`);
  const group = groups[groupKey];

  // 변형 묶음 Localizable.strings — ko · ja · en 파일을 하나씩
  objects.PBXVariantGroup = objects.PBXVariantGroup || {};
  const variants = objects.PBXVariantGroup;
  let variantKey = (group.children || []).map((c) => c.value).find((k) => variants[k] && unquote(variants[k].name) === STRINGS);
  if (!variantKey) {
    variantKey = project.generateUuid();
    variants[variantKey] = { isa: 'PBXVariantGroup', children: [], name: STRINGS, sourceTree: '"<group>"' };
    variants[`${variantKey}_comment`] = STRINGS;
    group.children.push({ value: variantKey, comment: STRINGS });
  }
  const variant = variants[variantKey];
  const refs = objects.PBXFileReference;
  for (const l of LANGS) {
    if (variant.children.some((c) => unquote(refs[c.value] && refs[c.value].name) === l)) continue;
    const ref = project.generateUuid();
    refs[ref] = { isa: 'PBXFileReference', lastKnownFileType: 'text.plist.strings', name: l, path: `"${l}.lproj/${STRINGS}"`, sourceTree: '"<group>"' };
    refs[`${ref}_comment`] = l;
    variant.children.push({ value: ref, comment: l });
  }

  // 빌드 파일 하나 → 위젯 대상의 Resources 단계
  const buildFiles = objects.PBXBuildFile;
  let buildKey = Object.keys(buildFiles).find((k) => !k.endsWith('_comment') && buildFiles[k].fileRef === variantKey);
  if (!buildKey) {
    buildKey = project.generateUuid();
    buildFiles[buildKey] = { isa: 'PBXBuildFile', fileRef: variantKey, fileRef_comment: STRINGS };
    buildFiles[`${buildKey}_comment`] = `${STRINGS} in Resources`;
  }
  const phases = objects.PBXResourcesBuildPhase || {};
  let phase = (target.buildPhases || []).map((p) => phases[p.value]).find(Boolean);
  if (!phase) phase = project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetKey).buildPhase;
  if (!phase.files.some((f) => f.value === buildKey)) phase.files.push({ value: buildKey, comment: `${STRINGS} in Resources` });

  for (const l of LANGS) project.addKnownRegion(l);
  return project;
}

const withWidgetStrings = (config) => {
  const strings = widgetStrings();
  // 열쇠가 Swift 글자와 다르면 조용히 번역되지 않는다 — 프리빌드에서 멈춘다
  const w = widgetConfig(config);
  const ko = loadCatalog('ko');
  if (w && (w.displayName !== ko.galleryName || w.description !== ko.galleryDesc)) {
    throw new Error('withWidgetStrings: app.json expo-widgets displayName/description must equal ko widget.galleryName/galleryDesc');
  }
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, TARGET);
      for (const l of LANGS) {
        fs.mkdirSync(path.join(dir, `${l}.lproj`), { recursive: true });
        fs.writeFileSync(path.join(dir, `${l}.lproj`, STRINGS), strings[l]);
      }
      return cfg;
    },
  ]);
  return withXcodeProject(config, (cfg) => {
    addWidgetStrings(cfg.modResults);
    return cfg;
  });
};

module.exports = withWidgetStrings;
module.exports.widgetStrings = widgetStrings;
module.exports.buildStrings = buildStrings;
module.exports.escapeStrings = escapeStrings;
module.exports.loadCatalog = loadCatalog;
module.exports.addWidgetStrings = addWidgetStrings;
