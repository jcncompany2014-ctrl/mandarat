import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

/**
 * 앱 트리에서 예기치 못한 렌더 오류가 나도 흰/검은 화면 대신 친절한 안내를
 * 보여주고 다시 시도할 수 있게 한다. (테마 훅이 원인일 수 있어 색은 고정값 사용)
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn('Mandarat crashed', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#14121E', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 42, marginBottom: 14 }}>🪷</Text>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', textAlign: 'center' }}>잠시 길을 잃었어요</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 21 }}>
            예상치 못한 문제가 생겼어요.{'\n'}다시 시도하면 대부분 해결돼요.
          </Text>
          <Pressable
            onPress={this.reset}
            accessibilityRole="button"
            accessibilityLabel="다시 시도"
            style={{ marginTop: 24, backgroundColor: '#B0883C', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 30 }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
