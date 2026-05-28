export type AppPlatform = 'ios' | 'android' | 'universal' | 'web' | 'unknown';

export interface AppStoreDetails {
  id: string;
  name: string;
  url: string;
  platform: AppPlatform;
  packageName?: string;
}

export interface UniversalRedirectConfig {
  appName: string;
  iosUrl: string;
  androidUrl: string;
  fallbackUrl: string;
  description?: string;
  logoType: 'none' | 'ios' | 'android' | 'custom';
  customLogoUrl?: string;
}

export interface QRStyle {
  darkColor: string;
  lightColor: string;
  margin: number;
  logoType: 'none' | 'appstore' | 'playstore' | 'download' | 'custom';
  customLogo?: string;
  logoSize: number; // percentage of QR size (0.15 to 0.3)
}

export interface HistoryItem {
  id: string;
  type: 'scan' | 'generate';
  timestamp: number;
  title: string;
  url: string;
  platform: AppPlatform;
  universalDetails?: {
    appName: string;
    iosUrl: string;
    androidUrl: string;
    fallbackUrl: string;
  };
}
