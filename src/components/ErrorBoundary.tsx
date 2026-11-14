import React from 'react';
import { Appearance, Platform, Pressable, Share, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Text } from './AppText';
import { GridMark } from './GridMark';
import { releaseNativeSplash } from './Splash';
import { ymd } from '../lib/routine';
import { crash } from '../lib/crash';
import { msg } from '../i18n';
import { DARK, LIGHT } from '../theme/tokens';
import { ROLE } from '../theme/type';

interface Props { children: React.ReactNode }
interface State {
  error: Error | null;
  /** 내보내기 뒤 한 줄 — alert면 실패(먹 글씨), 아니면 보조 글씨 */
  exportNote: { text: string; alert: boolean } | null;
}

/** 저장소 열쇠 — MandaratContext의 STORAGE_KEY와 같은 값(그 모듈을 부르지 않으려고 여기 둔다) */
const DOC_KEY = 'mandarat:doc:v1';

/**
 * 오류 화면의 색 — 화면 모드 공급자(LookProvider)·팔레트 훅이 원인일 수 있어 훅을 거치지 않고 토큰 두 벌에서 바로 고른다.
 * 시스템(또는 LookProvider가 맞춰 둔) 밝기를 따른다.
 */
function tokens() {
  return Appearance.getColorScheme() === 'dark' ? DARK : LIGHT;
}

/**
 * 저장된 문서 원문을 그대로 공유한다. iOS는 .json 파일로('파일에 저장'),
 * 파일을 만들지 못하거나 다른 플랫폼이면 글로. 원문이 없으면 'empty'.
 * (지금 화면의 상태는 믿지 않는다 — 마지막 편집이 오류의 원인일 수 있어 저장소에 있는 것만 내보낸다)
 */
async function exportStoredDoc(): Promise<'shared' | 'empty'> {
  const raw = await AsyncStorage.getItem(DOC_KEY);
  if (!raw) return 'empty';
  if (Platform.OS === 'ios') {
    try {
      // 파일 이름은 일부러 ASCII — 한글 파일 이름은 메일 첨부·일부 클라우드·윈도우 압축에서 깨지거나 %인코딩으로 보인다.
      // 설정의 백업 내보내기(lib/backup.ts)와 같은 이름 규칙을 쓴다(둘 다 같은 불러오기로 읽힌다).
      const file = new File(Paths.cache, `mandarat-backup-${ymd(new Date())}.json`);
      file.create({ overwrite: true });
      file.write(raw);
      await Share.share({ url: file.uri, title: file.name });
      return 'shared';
    } catch {
      // 파일이 안 되면 글로
    }
  }
  await Share.share({ message: raw });
  return 'shared';
}

/**
 * 앱 트리에서 예기치 못한 렌더 오류가 나면 흰/검은 화면 대신 종이 한 장에 안내를 적고,
 * 다시 시도하거나(같은 화면이 또 나오면) 기록을 먼저 내보낼 수 있게 한다.
 * 위아래 가운데에 놓은 왼쪽 정렬 묶음이라 안전 영역 제공자 없이도 가려지지 않는다.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, exportNote: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 실행 중 오류가 나면 네이티브 시작 화면을 바로 걷어 안내 화면이 보이게 한다.
    releaseNativeSplash();
    console.warn('Mandarat crashed', error);
    // 오류 수집(기기에서만, 끈 사람은 보내지 않는다) — 컴포넌트 위치만, 기록 내용은 보내지 않는다
    crash.report(error, { componentStack: info.componentStack ?? '' });
  }

  reset = () => this.setState({ error: null, exportNote: null });

  exportDoc = async () => {
    try {
      const r = await exportStoredDoc();
      this.setState({ exportNote: r === 'empty' ? { text: msg().core.crashExportEmpty, alert: false } : null });
    } catch {
      this.setState({ exportNote: { text: msg().core.crashExportFailed, alert: true } });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { exportNote } = this.state;
    // 공급자(LangRoot) 바깥에서도 그려지므로 훅 대신 지금 언어의 바구니를 바로 읽는다
    const m = msg();
    const T = tokens();
    return (
      <View style={{ flex: 1, backgroundColor: T.paper, justifyContent: 'center', paddingHorizontal: 24 }}>
        <GridMark size={32} color={T.ink} />
        <Text accessibilityRole="header" style={{ ...ROLE.prompt, marginTop: 20, color: T.ink }}>
          {m.core.crashTitle}
        </Text>
        <Text style={{ ...ROLE.body, marginTop: 8, color: T.ink2 }}>
          {m.core.crashBody}
        </Text>

        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel={m.common.retry}
          style={({ pressed }) => ({
            marginTop: 28, minHeight: 52, minWidth: 160, alignSelf: 'flex-start', paddingHorizontal: 24,
            borderRadius: 26, backgroundColor: T.btn, alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ ...ROLE.button, color: T.onBtn }}>{m.common.retry}</Text>
        </Pressable>

        {Platform.OS !== 'web' && (
          <View style={{ marginTop: 8 }}>
            <Pressable
              onPress={this.exportDoc}
              accessibilityRole="button"
              accessibilityLabel={m.core.crashExport}
              style={({ pressed }) => ({
                minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text style={{ ...ROLE.quietFoot, color: T.ink }}>{m.core.crashExport}</Text>
            </Pressable>
            {!!exportNote && (
              <Text accessibilityLiveRegion="polite" style={{ ...ROLE.noteSheet, color: exportNote.alert ? T.ink : T.ink2 }}>
                {exportNote.text}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }
}
