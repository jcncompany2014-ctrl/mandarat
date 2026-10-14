// 글을 파일로 내보내기 — iOS는 .json 파일을 공유 시트로('파일에 저장'·AirDrop·메일),
// 웹은 내려받기, 안드로이드는 글로 공유한다(머리말을 붙여, 붙여 넣기만 하면 불러올 수 있게).
import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import type { MandaratDoc } from '../types';
import { backupFileName, makeBackup } from './backup';
import { backupTextPrefix } from './backupNote';
import { ymd } from './routine';
import { downloadText } from './webFile';

/** 글로 공유한다(파일을 쓸 수 없을 때). 공유했으면 true */
async function shareAsText(text: string, now: Date): Promise<boolean> {
  const r = await Share.share({ message: backupTextPrefix(now) + text });
  return r.action === Share.sharedAction;
}

/**
 * name 이름의 파일로 text를 내보낸다. 보냈거나 저장했으면 true, 닫았거나 실패하면 false.
 * - iOS: 캐시 폴더에 파일을 쓰고 공유 시트에 파일로 건넨다. 파일을 쓰지 못하면 글로 보낸다.
 * - 웹: 파일로 내려받는다.
 * - 안드로이드: 글로 공유한다(공유 창을 닫아도 '공유됨'으로 알려 오므로 결과를 믿지 않는 쪽은 부르는 곳).
 */
export async function shareTextFile(name: string, text: string, now = new Date()): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return downloadText(name, text);
    if (Platform.OS === 'ios') {
      let uri: string | null = null;
      try {
        const file = new File(Paths.cache, name);
        file.create({ overwrite: true });
        file.write(text);
        uri = file.uri;
      } catch (e) {
        console.warn('[shareFile] write failed', e);
      }
      if (!uri) return await shareAsText(text, now);
      const r = await Share.share({ url: uri, title: name });
      return r.action === Share.sharedAction;
    }
    return await shareAsText(text, now);
  } catch (e) {
    console.warn('[shareFile] share failed', e);
    return false;
  }
}

/**
 * 백업 내보내기 — mandarat-backup-YYYY-MM-DD.json. 보냈으면 onSaved(오늘 'YYYY-MM-DD')를 부르고 true.
 * (마지막 백업 날은 settings.lastBackupAt에 남긴다 — 부르는 쪽이 setSetting으로)
 */
export async function exportBackup(doc: MandaratDoc, now: Date, onSaved?: (day: string) => void): Promise<boolean> {
  const ok = await shareTextFile(backupFileName(now), makeBackup(doc, now, true), now);
  if (ok) onSaved?.(ymd(now));
  return ok;
}
