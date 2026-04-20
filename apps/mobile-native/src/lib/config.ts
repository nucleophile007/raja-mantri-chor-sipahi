import { Platform } from 'react-native';

const defaultApiBase = __DEV__
  ? Platform.select({
    ios: 'http://localhost:3000',
    android: 'http://localhost:3000', // 10.0.2.2 is how Android emulator connects to localhost
    default: 'http://localhost:3000',
  })
  : 'https://www.desiarcade.games'; // This URL will be used in your APK automatically

export const API_BASE_URL = defaultApiBase || 'https://www.desiarcade.games';
