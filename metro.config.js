// Sentry가 소스맵에 디버그 ID를 넣도록 Expo 기본 설정을 감싼다(오류 수집, V4-F)
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
