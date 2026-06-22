export type MapsSource = 'DEMO' | 'GOOGLE_PLACES' | 'OPENSTREETMAP';

export interface PlaceReviewData {
  author: string;
  rating: number;
  text: string;
}

export interface WebsiteHints {
  hasWebsite: boolean;
  url?: string;
  ssl?: boolean;
  mobile?: boolean;
  hasBooking?: boolean;
  hasLine?: boolean;
  hasContactForm?: boolean;
  hasRecruit?: boolean;
  emails?: string[];
}

export interface SocialHints {
  instagram?: string;
  facebook?: string;
  x?: string;
  line?: string;
  youtube?: string;
}

export interface PlaceResult {
  name: string;
  industry: string;
  prefecture: string;
  city: string;
  address: string;
  phone?: string;
  website?: string;
  email?: string;
  contactForm?: string;
  rating?: number;
  reviewCount?: number;
  openingHours?: string;
  lat: number;
  lng: number;
  googleMapsUrl?: string;
  placeId?: string;
  source: MapsSource;
  attributionRequired: boolean;
  fetchedAt: string;
  expiresAt?: string;
  cachePolicy: string;
  reviews: PlaceReviewData[];
  website_hints: WebsiteHints;
  social: SocialHints;
}

export interface MapsSearchParams {
  region: string;
  industry: string;
  limit?: number;
  minRating?: number;
  maxRating?: number;
  minReviews?: number;
  hasWebsite?: boolean;
}

export interface MapsProvider {
  readonly name: MapsSource;
  /** Google 由来データかどうか（地図表示の帰属/混在制御に使用）。 */
  readonly isGoogle: boolean;
  search(params: MapsSearchParams): Promise<PlaceResult[]>;
}
