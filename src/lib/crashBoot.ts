// 오류 기록(src/lib/crashLog.ts)의 기기 쪽 — 저장 자리와 전역 손잡이. index.ts가 App보다 먼저 불러온다(값 없이, 불러오는 것만으로 건다):
// 앱 모듈을 불러오다 나는 오류도 남는다. 여기서 던지면 앱이 뜨지 않으므로 하는 일은 모두 감싼다.
//
// 저장 자리(기기 밖으로 나가지 않는다)
// - iOS · 안드로이드: 앱 문서 폴더(Paths.document)의 파일 하나. 쓰기는 곧바로 끝난다(File.write) —
//   멈추는 오류는 앞선 손잡이가 앱을 닫기 전에 다 적혀야 한다. 파일 앱에는 보이지 않는다(문서 공유를 켜지 않았다).
// - 웹: localStorage 열쇠 하나.
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { attachLogStore, installCrashHandlers, setLogOs, type LogStore } from './crashLog';

/** 웹의 localStorage 열쇠 */
const CRASH_LOG_KEY = 'mandarat:crashlog:v1';
/** 기기의 파일 이름 — 문서 폴더 바로 아래 */
const CRASH_LOG_FILE = 'mandarat-crash-log.json';

const webStore: LogStore = {
  read: () => globalThis.localStorage?.getItem(CRASH_LOG_KEY) ?? null,
  write: (text) => globalThis.localStorage?.setItem(CRASH_LOG_KEY, text),
};

const fileStore: LogStore = {
  read: () => {
    const file = new File(Paths.document, CRASH_LOG_FILE);
    return file.exists ? file.textSync() : null;
  },
  write: (text) => {
    const file = new File(Paths.document, CRASH_LOG_FILE);
    if (!file.exists) file.create();
    file.write(text);
  },
};

try {
  setLogOs(`${Platform.OS} ${String(Platform.Version ?? '')}`);
  attachLogStore(Platform.OS === 'web' ? webStore : fileStore);
} catch {
  // 저장 자리를 붙이지 못해도 메모리의 기록과 손잡이는 쓴다
}
installCrashHandlers();
