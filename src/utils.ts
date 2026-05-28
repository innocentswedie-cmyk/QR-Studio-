import { AppPlatform, UniversalRedirectConfig } from './types';

// Detect platform type from a given download URL
export function detectPlatformFromUrl(url: string): AppPlatform {
  if (!url) return 'unknown';
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('apps.apple.com') || lowerUrl.includes('itunes.apple.com')) {
    return 'ios';
  }
  
  if (lowerUrl.includes('play.google.com') || lowerUrl.includes('market://') || lowerUrl.endsWith('.apk')) {
    return 'android';
  }
  
  if (lowerUrl.includes('github.com') || lowerUrl.includes('gitlab.com')) {
    return 'web';
  }
  
  return 'unknown';
}

// Attempt to parse metadata out of a store URL
export function parseAppStoreUrl(url: string): { name: string; id: string; platform: AppPlatform } | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    const platform = detectPlatformFromUrl(url);

    if (platform === 'ios') {
      // e.g. https://apps.apple.com/us/app/google-maps/id585027354
      const pathParts = parsed.pathname.split('/');
      const idIndex = pathParts.findIndex(part => part.startsWith('id'));
      const id = idIndex !== -1 ? pathParts[idIndex] : 'unknown';
      let name = 'App Store App';
      
      const appIndex = pathParts.indexOf('app');
      if (appIndex !== -1 && appIndex + 1 < pathParts.length) {
        name = pathParts[appIndex + 1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      return { name, id, platform };
    } 
    
    if (platform === 'android') {
      // e.g. https://play.google.com/store/apps/details?id=com.google.android.apps.maps
      const id = parsed.searchParams.get('id') || 'unknown';
      let name = 'Google Play App';
      
      if (id && id !== 'unknown') {
        const d = id.split('.');
        if (d.length >= 2) {
          name = d[d.length - 1].charAt(0).toUpperCase() + d[d.length - 1].slice(1);
          if (name.length < 3 && d.length >= 3) {
            name = d[d.length - 2].charAt(0).toUpperCase() + d[d.length - 2].slice(1) + ' ' + name;
          }
        }
      }
      return { name, id, platform };
    }
  } catch (e) {
    // If invalid URL, return null
  }
  
  return null;
}

// Detect client User Agent to redirect accordingly
export function detectUserOS(): 'ios' | 'android' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Checking iPad/iPhone
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'ios';
  }
  
  // Checking Android
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  return 'desktop';
}

// Encode a Universal Redirect Configuration into a safe base64 URL parameter
export function encodeUniversalConfig(config: UniversalRedirectConfig): string {
  try {
    const jsonStr = JSON.stringify(config);
    // Safe conversion supporting UTF-8 strings
    return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (e) {
    console.error('Error encoding config', e);
    return '';
  }
}

// Decode base64 URL parameter back to Universal Redirect Configuration
export function decodeUniversalConfig(str: string): UniversalRedirectConfig | null {
  try {
    const decoded = decodeURIComponent(atob(str).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(decoded) as UniversalRedirectConfig;
  } catch (e) {
    console.error('Error decoding config', e);
    return null;
  }
}
