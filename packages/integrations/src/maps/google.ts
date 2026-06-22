import type { MapsProvider, MapsSearchParams, PlaceResult } from './types.js';

/**
 * GooglePlacesProvider — 公式 Places API (New) Text Search を利用。
 * コンプライアンス:
 *  - 規約違反のスクレイピングは行わない（公式APIのみ）。
 *  - source/placeId/fetchedAt/expiresAt/attributionRequired/cachePolicy を必ず保持。
 *  - Google 由来データは Google Map 上に帰属表示付きで表示する（非Google地図に混在しない）。
 *  - APIキーが無い場合はこのプロバイダを選択しない（Demo にフォールバック）。
 */
export class GooglePlacesProvider implements MapsProvider {
  readonly name = 'GOOGLE_PLACES' as const;
  readonly isGoogle = true;
  private apiKey: string;

  constructor(opts: { apiKey: string }) {
    this.apiKey = opts.apiKey;
  }

  async search(params: MapsSearchParams): Promise<PlaceResult[]> {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.regularOpeningHours,places.reviews',
      },
      body: JSON.stringify({
        textQuery: `${params.region} ${params.industry}`,
        languageCode: 'ja',
        regionCode: 'JP',
        maxResultCount: Math.min(params.limit ?? 20, 20),
      }),
    });
    if (!res.ok) throw new Error(`Google Places error: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as any;
    const fetchedAt = new Date();
    // Places のコンテンツキャッシュは最小限。place_id 以外の鮮度を短く保つ。
    const expiresAt = new Date(fetchedAt.getTime() + 24 * 3600 * 1000);

    return (data.places ?? []).map((p: any): PlaceResult => {
      const website: string | undefined = p.websiteUri;
      return {
        name: p.displayName?.text ?? '(名称不明)',
        industry: params.industry,
        prefecture: '',
        city: params.region,
        address: p.formattedAddress ?? '',
        phone: p.nationalPhoneNumber,
        website,
        rating: p.rating,
        reviewCount: p.userRatingCount ?? 0,
        openingHours: p.regularOpeningHours?.weekdayDescriptions?.join(' / '),
        lat: p.location?.latitude ?? 0,
        lng: p.location?.longitude ?? 0,
        googleMapsUrl: p.googleMapsUri,
        placeId: p.id,
        source: 'GOOGLE_PLACES',
        attributionRequired: true,
        fetchedAt: fetchedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        cachePolicy: 'google-short-cache',
        reviews: (p.reviews ?? []).slice(0, 5).map((r: any) => ({
          author: r.authorAttribution?.displayName ?? '',
          rating: r.rating ?? 0,
          text: r.text?.text ?? r.originalText?.text ?? '',
        })),
        website_hints: { hasWebsite: !!website, url: website },
        social: {},
      };
    });
  }
}
