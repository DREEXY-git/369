import { DemoMapProvider } from './demo.js';
import { GooglePlacesProvider } from './google.js';
import type { MapsProvider } from './types.js';

export * from './types.js';
export { DemoMapProvider, GooglePlacesProvider };

/**
 * 環境変数から Maps Provider を解決。
 * MAPS_PROVIDER=google かつ GOOGLE_MAPS_API_KEY がある場合のみ Google。
 * それ以外は必ず DemoMapProvider（デモが常に動く）。
 */
export function getMapsProvider(env: NodeJS.ProcessEnv = process.env): MapsProvider {
  const provider = (env.MAPS_PROVIDER || 'demo').toLowerCase();
  if (provider === 'google' && env.GOOGLE_MAPS_API_KEY) {
    return new GooglePlacesProvider({ apiKey: env.GOOGLE_MAPS_API_KEY });
  }
  return new DemoMapProvider();
}

export function isGoogleMapsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.MAPS_PROVIDER || 'demo').toLowerCase() === 'google' && !!env.GOOGLE_MAPS_API_KEY;
}
