import { CapacitorConfig } from '@capacitor/cli';

const config = {
  appId: 'com.example.khatawali',
  appName: 'Khatawali',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    minWebViewVersion: 122
  }
};

export default config satisfies CapacitorConfig;
