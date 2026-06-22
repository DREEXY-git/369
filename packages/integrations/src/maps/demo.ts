import type {
  MapsProvider,
  MapsSearchParams,
  PlaceResult,
  PlaceReviewData,
} from './types.js';

// 決定論的擬似乱数（同じ条件なら同じデモリードを再現）。
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WARDS: { name: string; lat: number; lng: number }[] = [
  { name: '中央区', lat: 43.055, lng: 141.34 },
  { name: '北区', lat: 43.09, lng: 141.34 },
  { name: '東区', lat: 43.077, lng: 141.37 },
  { name: '白石区', lat: 43.045, lng: 141.4 },
  { name: '豊平区', lat: 43.03, lng: 141.37 },
  { name: '西区', lat: 43.07, lng: 141.3 },
  { name: '手稲区', lat: 43.12, lng: 141.24 },
  { name: '厚別区', lat: 43.04, lng: 141.47 },
];

interface IndustryDef {
  match: string[];
  names: string[];
  suffix: string[];
  praise: string[];
  complaints: string[];
  domains: string[];
}

const GENERIC_PRAISE = [
  '丁寧な対応でとても満足しました',
  '接客が親切で雰囲気も良いです',
  'スタッフの技術が高く安心できました',
  '清潔感があり居心地が良いです',
  'また利用したいと思える内容でした',
];

const INDUSTRIES: IndustryDef[] = [
  {
    match: ['美容室', '美容院', 'ヘアサロン'],
    names: ['Lien', 'CALM', 'feliz', 'muik', 'GRACE', 'cocoro', 'Atelier', 'Sourire', 'noix', 'lumo'],
    suffix: ['hair', 'beauty', 'hair&make', 'salon'],
    praise: ['カットの技術が上手で仕上がりが好み', 'スタイリストさんの対応が丁寧', GENERIC_PRAISE[0]!],
    complaints: ['人気で予約が取りづらい', '電話がつながりにくいことがある', '料金がやや高め'],
    domains: ['hair-salon.example.jp', 'beauty.example.jp'],
  },
  {
    match: ['歯科', '歯医者', 'デンタル'],
    names: ['さっぽろ', '大通', '北の杜', 'すずらん', 'みらい', '青空', 'ひまわり', 'しらかば'],
    suffix: ['歯科クリニック', 'デンタルクリニック', '歯科医院'],
    praise: ['説明が丁寧で安心して通えます', '痛みに配慮してくれる', GENERIC_PRAISE[2]!],
    complaints: ['電話予約が繋がりにくい', '初診の予約が取りづらい', '待ち時間が長いことがある'],
    domains: ['dental.example.jp', 'clinic.example.jp'],
  },
  {
    match: ['飲食', '焼肉', '居酒屋', 'カフェ', 'レストラン', '食堂', 'ラーメン'],
    names: ['炭火', 'すすきの', '北海道', '大通', '味処', '海鮮', '酒場', '麺屋'],
    suffix: ['焼肉店', '居酒屋', '食堂', 'ダイニング', 'カフェ'],
    praise: ['料理が美味しくて満足', '雰囲気が良く接客も丁寧', GENERIC_PRAISE[4]!],
    complaints: ['人気で待ち時間が長い', 'ネット予約ができず電話のみ', '休日は混雑する'],
    domains: ['dining.example.jp', 'gourmet.example.jp'],
  },
  {
    match: ['整体', '整骨', 'カイロ', 'リラク'],
    names: ['そら', 'てあて', '杜', 'すこやか', 'リフレ', '癒し', 'ぽかぽか', '健康'],
    suffix: ['整体院', '整骨院', 'カイロプラクティック'],
    praise: ['施術後に身体が軽くなった', '丁寧にカウンセリングしてくれる', GENERIC_PRAISE[1]!],
    complaints: ['予約の枠が少ない', 'Webサイトが古い印象', '場所が少し分かりにくい'],
    domains: ['seitai.example.jp', 'relax.example.jp'],
  },
  {
    match: ['税理士', '会計', '士業', '行政書士', '社労士'],
    names: ['さっぽろ', '大通', '北海道', 'みらい', '信頼', '誠', '明和', '青葉'],
    suffix: ['税理士事務所', '会計事務所', '税理士法人'],
    praise: ['対応が早く相談しやすい', '節税の提案が的確', GENERIC_PRAISE[0]!],
    complaints: ['Webサイトに料金の記載が少ない', '問い合わせフォームがない', '初回の連絡が電話のみ'],
    domains: ['tax.example.jp', 'kaikei.example.jp'],
  },
];

function pickIndustry(industry: string): IndustryDef {
  return (
    INDUSTRIES.find((d) => d.match.some((m) => industry.includes(m))) ?? {
      match: [],
      names: ['さっぽろ', '北海道', '大通', 'みらい', '青空'],
      suffix: ['商会', 'サービス', '事業所'],
      praise: GENERIC_PRAISE,
      complaints: ['Webサイトが古い', '予約導線が弱い', '問い合わせしづらい'],
      domains: ['example.jp'],
    }
  );
}

function romaize(n: number): string {
  return `shop${n.toString(36)}`;
}

/**
 * DemoMapProvider — APIキー不要。札幌市の業種別デモリードを決定論的に生成。
 * すべて source=DEMO（規約違反スクレイピングは一切行わない）。
 */
export class DemoMapProvider implements MapsProvider {
  readonly name = 'DEMO' as const;
  readonly isGoogle = false;

  async search(params: MapsSearchParams): Promise<PlaceResult[]> {
    const limit = params.limit ?? 20;
    const def = pickIndustry(params.industry);
    const region = params.region || '札幌市';
    const results: PlaceResult[] = [];

    for (let i = 0; i < limit; i++) {
      const seed = hash(`${region}|${params.industry}|${i}`);
      const rnd = mulberry32(seed);
      const ward = WARDS[Math.floor(rnd() * WARDS.length)]!;
      const nm = def.names[Math.floor(rnd() * def.names.length)]!;
      const sf = def.suffix[Math.floor(rnd() * def.suffix.length)]!;
      const name = /[A-Za-z]/.test(nm) ? `${nm} ${sf}` : `${nm}${sf}`;

      const rating = Math.round((3.4 + rnd() * 1.5) * 10) / 10;
      const reviewCount = Math.floor(5 + rnd() * 280);
      const hasWebsite = rnd() > 0.25;
      const mobile = hasWebsite && rnd() > 0.45;
      const hasBooking = hasWebsite && rnd() > 0.6;
      const hasLine = rnd() > 0.7;
      const hasContactForm = hasWebsite && rnd() > 0.5;
      const hasRecruit = hasWebsite && rnd() > 0.65;
      const hasInstagram = rnd() > 0.4;

      const domain = def.domains[Math.floor(rnd() * def.domains.length)]!;
      const slug = romaize(seed % 100000);
      const website = hasWebsite ? `https://${slug}.${domain}` : undefined;
      const email = hasWebsite && rnd() > 0.5 ? `info@${slug}.${domain}` : undefined;

      const lat = Math.round((ward.lat + (rnd() - 0.5) * 0.03) * 1e6) / 1e6;
      const lng = Math.round((ward.lng + (rnd() - 0.5) * 0.03) * 1e6) / 1e6;
      const phone = `011-${String(200 + Math.floor(rnd() * 799)).padStart(3, '0')}-${String(
        Math.floor(rnd() * 9999),
      ).padStart(4, '0')}`;

      const reviews: PlaceReviewData[] = [];
      const nReviews = 2 + Math.floor(rnd() * 2);
      for (let r = 0; r < nReviews; r++) {
        const positive = rnd() > 0.4;
        const pool = positive ? def.praise : def.complaints;
        reviews.push({
          author: `利用者${String.fromCharCode(65 + r)}`,
          rating: positive ? 4 + Math.round(rnd()) : 2 + Math.round(rnd()),
          text: pool[Math.floor(rnd() * pool.length)]!,
        });
      }

      results.push({
        name,
        industry: params.industry,
        prefecture: '北海道',
        city: region,
        address: `北海道${region}${ward.name}${1 + Math.floor(rnd() * 30)}-${1 + Math.floor(rnd() * 20)}`,
        phone,
        website,
        email,
        contactForm: hasContactForm ? `${website}/contact` : undefined,
        rating,
        reviewCount,
        openingHours: '10:00-19:00',
        lat,
        lng,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        placeId: `demo_${seed.toString(16)}`,
        source: 'DEMO',
        attributionRequired: false,
        fetchedAt: new Date().toISOString(),
        cachePolicy: 'demo',
        reviews,
        website_hints: {
          hasWebsite,
          url: website,
          ssl: hasWebsite,
          mobile,
          hasBooking,
          hasLine,
          hasContactForm,
          hasRecruit,
          emails: email ? [email] : [],
        },
        social: {
          instagram: hasInstagram ? `https://instagram.com/${slug}` : undefined,
          line: hasLine ? `https://line.me/R/ti/p/@${slug}` : undefined,
        },
      });
    }

    // フィルタ適用
    return results.filter((r) => {
      if (params.minRating !== undefined && (r.rating ?? 0) < params.minRating) return false;
      if (params.maxRating !== undefined && (r.rating ?? 0) > params.maxRating) return false;
      if (params.minReviews !== undefined && (r.reviewCount ?? 0) < params.minReviews) return false;
      if (params.hasWebsite !== undefined && r.website_hints.hasWebsite !== params.hasWebsite)
        return false;
      return true;
    });
  }
}
