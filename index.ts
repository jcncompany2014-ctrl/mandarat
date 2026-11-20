import { registerRootComponent } from 'expo';
// 오류 기록(이 기기에만 남는다)의 손잡이를 앱보다 먼저 건다 — App을 불러오다 나는 오류도 남게, 반드시 './App'보다 앞에 둔다
import './src/lib/crashBoot';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
