// 테스트 도우미 — RN에 기대는 .tsx 하나를 Node에서 불러온다: 기기 모듈은 가짜(stubs)로 바꾸고, 그 밖의 경로는 평소대로(tests/register).
// React 트리를 그리지는 않는다 — 클래스의 정적 함수 · 메서드와 render()가 돌려주는 요소를 직접 본다.
require('../register');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

/** file: 저장소 뿌리에서의 경로. stubs: { '불러오는 경로 그대로': 대신 줄 것 } */
function loadTsx(file, stubs) {
  const abs = path.join(__dirname, '..', '..', file);
  const orig = Module._load;
  Module._load = function load(req, parent, isMain) {
    if (parent && parent.filename === abs && Object.prototype.hasOwnProperty.call(stubs, req)) return stubs[req];
    return orig.call(this, req, parent, isMain);
  };
  try {
    const { outputText } = ts.transpileModule(fs.readFileSync(abs, 'utf8'), {
      fileName: abs,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    });
    const m = new Module(abs, module);
    m.filename = abs;
    m.paths = Module._nodeModulePaths(path.dirname(abs));
    m._compile(outputText, abs);
    return m.exports;
  } finally {
    Module._load = orig;
  }
}

/** render()가 돌려준 요소 나무를 훑어 조건에 맞는 요소들을 모은다 */
function findElements(node, pred, out = []) {
  if (Array.isArray(node)) {
    for (const n of node) findElements(n, pred, out);
    return out;
  }
  if (!node || typeof node !== 'object' || !node.props) return out;
  if (pred(node)) out.push(node);
  findElements(node.props.children, pred, out);
  return out;
}

module.exports = { loadTsx, findElements };
