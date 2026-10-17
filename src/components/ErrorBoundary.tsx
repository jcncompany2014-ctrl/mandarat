import React from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Text } from './AppText';
import { GridMark } from './GridMark';
import { releaseNativeSplash } from './Splash';
import { ymd } from '../lib/routine';
import { crash } from '../lib/crash';

interface Props { children: React.ReactNode }
interface State {
  error: Error | null;
  /** 내보내기 뒤 한 줄 — alert면 실패(경고 글씨), 아니면 보조 글씨 */
  exportNote: { text: string; alert: boolean } | null;
}

/** 저장소 열쇠 — MandaratContext의 STORAGE_KEY와 같은 값(그 모듈을 부르지 않으려고 여기 둔다) */
const DOC_KEY = 'mandarat:doc:v1';

// 테마 훅·팔레트가 원인일 수 있어 색은 고정값(밝은 종이 무드)으로 쓴다
const PAPER = '#FBF9F4';
const INK = '#2B2620';
const SUB = '#6F6657';
const GOLD = '#B0883C';
const ALERT = '#A15166';

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
      this.setState({ exportNote: r === 'empty' ? { text: '저장된 기록이 아직 없어요', alert: false } : null });
    } catch {
      this.setState({ exportNote: { text: '기록을 내보내지 못했어요. 한 번 더 눌러 주세요', alert: true } });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { exportNote } = this.state;
    return (
      <View style={{ flex: 1, backgroundColor: PAPER, justifyContent: 'center', paddingHorizontal: 28 }}>
        <GridMark size={32} color={GOLD} />
        <Text accessibilityRole="header" style={{ marginTop: 20, fontSize: 19, lineHeight: 26, fontWeight: '700', color: INK }}>
          화면을 열지 못했어요
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 21, color: SUB }}>
          저장된 기록은 그대로 있어요.{'\n'}다시 시도해 주세요. 같은 화면이 또 나오면 먼저 기록을 내보내 두세요.
        </Text>

        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
          style={({ pressed }) => ({
            marginTop: 28, height: 48, minWidth: 160, alignSelf: 'flex-start', paddingHorizontal: 24,
            borderRadius: 10, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: INK }}>다시 시도</Text>
        </Pressable>

        {Platform.OS !== 'web' && (
          <View style={{ marginTop: 8 }}>
            <Pressable
              onPress={this.exportDoc}
              accessibilityRole="button"
              accessibilityLabel="기록 내보내기"
              style={({ pressed }) => ({
                minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: INK, textDecorationLine: 'underline' }}>기록 내보내기</Text>
            </Pressable>
            {!!exportNote && (
              <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, lineHeight: 18, color: exportNote.alert ? ALERT : SUB }}>
                {exportNote.text}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }
}
