// 테스트 전용 로더: React Native에 의존하지 않는 순수 .ts 모듈을 Node에서 바로 require할 수 있게
// 프로젝트에 이미 있는 TypeScript로 즉석 변환한다(추가 의존성 없음). 타입 검사는 `npm run typecheck`가 맡는다.
const fs = require('fs');
const ts = require('typescript');

require.extensions['.ts'] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
};
