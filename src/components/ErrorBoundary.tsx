import React from 'react';
import { Alert, Appearance, Clipboard, Platform, Pressable, Share, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Text } from './AppText';
import { GridMark } from './GridMark';
import { releaseNativeSplash } from './Splash';
import { ymd } from '../lib/routine';
import { crash } from '../lib/crash';
import { logText } from '../lib/crashLog';
import { failStreak, pickSnapDay, requestSnapOpen, snapDays, triedSnapDays } from '../lib/crashRecover';
import { fmtDateLong } from '../lib/text';
import { msg } from '../i18n';
import { DARK, LIGHT } from '../theme/tokens';
import { ROLE } from '../theme/type';

interface Props { children: React.ReactNode }
interface State {
  error: Error | null;
  /** 내보내기 · 복사 뒤 한 줄 — alert면 실패(먹 글씨), 아니면 보조 글씨 */
  exportNote: { text: string; alert: boolean } | null;
  /** 잇달아 멈춘 횟수 — '다시 시도' 뒤 곧바로 또 멈추면 2부터(lib/crashRecover failStreak). 2부터 나가는 길을 더 보인다 */
  streak: number;
  /** 열어 볼 수 있는 저장본의 날('YYYY-MM-DD') — 없거나 아직 찾지 않았으면 null */
  snapDay: string | null;
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

/** 확인을 묻는다 — 웹은 window.confirm, 기기는 Alert(설정의 ask와 같은 꼴 — 설정 화면 모듈을 부르지 않으려고 여기 둔다) */
function askFirst(title: string, message: string, ok: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: msg().common.cancel, style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}

/** 오류 화면의 조용한 글 동작 한 줄(손끝 44) */
function Exit({ color, label, onPress }: { color: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text style={{ ...ROLE.quietFoot, color }}>{label}</Text>
    </Pressable>
  );
}

/**
 * 앱 트리에서 예기치 못한 렌더 오류가 나면 흰/검은 화면 대신 종이 한 장에 안내를 적고,
 * 다시 시도하거나(같은 화면이 또 나오면) 기록을 먼저 내보낼 수 있게 한다.
 * 화면 하나 · 시트 하나의 오류는 아래 ScreenBoundary · OverlayBoundary가 먼저 받는다 — 여기는 마지막 그물이다.
 * 다시 시도한 뒤 곧바로 또 멈추면(문서 때문에 되풀이되는 오류) 나가는 길을 둘 더 보인다:
 * 하루 저장본으로 열기(설정 › 저장본과 같은 되돌리기)와 오류 내용 복사(이 기기에 남은 기록 — lib/crashLog).
 * 위아래 가운데에 놓은 왼쪽 정렬 묶음이라 안전 영역 제공자 없이도 가려지지 않는다.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, exportNote: null, streak: 0, snapDay: null };
  /** 마지막으로 '다시 시도'를 누른 때(ms) */
  private retriedAt = 0;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 실행 중 오류가 나면 네이티브 시작 화면을 바로 걷어 안내 화면이 보이게 한다.
    releaseNativeSplash();
    console.warn('Mandarat crashed', error);
    // 이 기기의 오류 기록에 남긴다(lib/crashLog) — 컴포넌트 위치만, 사용자가 적은 글은 남기지 않는다
    crash.report(error, { componentStack: info.componentStack ?? '' });
    const streak = failStreak(this.state.streak, this.retriedAt, Date.now());
    this.setState({ streak });
    if (streak >= 2) void this.findSnapshot();
  }

  reset = () => {
    this.retriedAt = Date.now();
    this.setState({ error: null, exportNote: null });
  };

  /** 열어 볼 저장본 — 이번 실행에서 아직 열어 보지 않은 것 가운데 가장 새것 */
  findSnapshot = async () => {
    let day: string | null = null;
    try {
      day = pickSnapDay(snapDays(await AsyncStorage.getAllKeys()), triedSnapDays());
    } catch {
      // 찾지 못하면 그 줄을 보이지 않는다
    }
    this.setState({ snapDay: day });
  };

  /** 저장본으로 열기 — 묻고, 어느 날 것을 열지 적어 둔 뒤 다시 띄운다. 바꾸는 일은 다시 뜬 저장소가 한다(store/useCrashRecovery) */
  openSnapshot = () => {
    const day = this.state.snapDay;
    if (!day) return;
    const st = msg().settings;
    askFirst(st.snapAskTitle, st.snapAskBody, st.snapAskOk, () => {
      requestSnapOpen(day);
      this.setState({ snapDay: null });
      this.reset();
    });
  };

  copyLog = () => {
    try {
      Clipboard.setString(logText());
      this.setState({ exportNote: { text: msg().core.crashCopied, alert: false } });
    } catch {
      this.setState({ exportNote: { text: msg().core.crashCopyFailed, alert: true } });
    }
  };

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
    const { exportNote, streak, snapDay } = this.state;
    const more = streak >= 2;
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

        <View style={{ marginTop: 8 }}>
          {Platform.OS !== 'web' && <Exit color={T.ink} label={m.core.crashExport} onPress={this.exportDoc} />}
          {more && !!snapDay && (
            <Exit color={T.ink} label={m.core.crashOpenSnap({ date: fmtDateLong(snapDay) })} onPress={this.openSnapshot} />
          )}
          {more && <Exit color={T.ink} label={m.core.crashCopyLog} onPress={this.copyLog} />}
          {!!exportNote && (
            <Text accessibilityLiveRegion="polite" style={{ ...ROLE.noteSheet, color: exportNote.alert ? T.ink : T.ink2 }}>
              {exportNote.text}
            </Text>
          )}
        </View>
      </View>
    );
  }
}

// ── 화면 하나 · 시트 하나의 경계(src/navigation/Root.tsx) ──────────────────────────

interface ScreenBoundaryProps {
  /** 기록에 남길 자리 이름 — 화면 이름 */
  name: string;
  /** 이 값이 바뀌면(다른 화면 · 다른 영역으로 옮기면) 오류를 잊고 다시 그린다 */
  resetKey: string;
  /** 오류가 났을 때 그 자리에 그릴 것 — retry를 부르면 화면을 다시 그려 본다 */
  fallback: (retry: () => void) => React.ReactNode;
  children: React.ReactNode;
}
interface ScreenBoundaryState { error: Error | null; key: string }

/**
 * 화면 하나의 오류를 그 쪽 안에서 받는다 — 탭 막대와 다른 화면은 그대로 쓸 수 있다.
 * 다른 화면으로 옮기면(resetKey) 저절로 풀린다.
 */
export class ScreenBoundary extends React.Component<ScreenBoundaryProps, ScreenBoundaryState> {
  state: ScreenBoundaryState = { error: null, key: this.props.resetKey };

  static getDerivedStateFromProps(props: ScreenBoundaryProps, state: ScreenBoundaryState): Partial<ScreenBoundaryState> | null {
    return props.resetKey === state.key ? null : { error: null, key: props.resetKey };
  }

  static getDerivedStateFromError(error: Error): Partial<ScreenBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    crash.report(error, { where: `screen:${this.props.name}`, componentStack: info.componentStack ?? '' });
  }

  retry = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.retry) : this.props.children;
  }
}

interface OverlayBoundaryProps {
  /** 기록에 남길 자리 이름 — 시트 이름 */
  name: string;
  /** 이 시트가 지금 열려 있는지(화면 상태) */
  open: boolean;
  /** 열린 채 멈췄을 때 — 시트를 닫고 한 줄로 알린다 */
  onFail?: () => void;
  children: React.ReactNode;
}
interface OverlayBoundaryState { failed: boolean; wasOpen: boolean }

/**
 * 시트 · 겹쳐 뜨는 것 하나의 오류 — 그 시트만 내리고(onFail이 닫고 알린다) 화면은 그대로 둔다.
 * 멈춘 뒤에는 아무것도 그리지 않다가, 다시 열 때 한 번 더 그려 본다(스스로 다시 그리지는 않는다 — 되풀이해 멈추지 않게).
 */
export class OverlayBoundary extends React.Component<OverlayBoundaryProps, OverlayBoundaryState> {
  state: OverlayBoundaryState = { failed: false, wasOpen: this.props.open };

  static getDerivedStateFromProps(props: OverlayBoundaryProps, state: OverlayBoundaryState): Partial<OverlayBoundaryState> | null {
    if (props.open === state.wasOpen) return null;
    return props.open ? { failed: false, wasOpen: true } : { wasOpen: false };
  }

  static getDerivedStateFromError(): Partial<OverlayBoundaryState> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    crash.report(error, { where: `overlay:${this.props.name}`, componentStack: info.componentStack ?? '' });
    if (this.props.open) this.props.onFail?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
