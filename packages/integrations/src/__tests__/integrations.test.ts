import { describe, it, expect } from 'vitest';
import { DemoMapProvider } from '../maps/demo';
import { isUrlAllowed, scanHtml } from '../web/fetcher';
import { getMapsProvider } from '../maps/index';

describe('DemoMapProvider', () => {
  it('札幌市の美容室デモリードを生成する', async () => {
    const p = new DemoMapProvider();
    const leads = await p.search({ region: '札幌市', industry: '美容室', limit: 20 });
    expect(leads.length).toBeGreaterThan(0);
    expect(leads.length).toBeLessThanOrEqual(20);
    for (const l of leads) {
      expect(l.source).toBe('DEMO');
      expect(l.city).toBe('札幌市');
      expect(l.lat).toBeGreaterThan(42);
      expect(l.lat).toBeLessThan(44);
      expect(l.placeId).toMatch(/^demo_/);
      expect(l.reviews.length).toBeGreaterThan(0);
    }
  });

  it('決定論的（同条件で同じ結果）', async () => {
    const p = new DemoMapProvider();
    const a = await p.search({ region: '札幌市', industry: '歯科医院', limit: 5 });
    const b = await p.search({ region: '札幌市', industry: '歯科医院', limit: 5 });
    expect(a.map((x) => x.name)).toEqual(b.map((x) => x.name));
  });

  it('フィルタ（Webサイトなし）が効く', async () => {
    const p = new DemoMapProvider();
    const leads = await p.search({ region: '札幌市', industry: '飲食店', limit: 20, hasWebsite: false });
    for (const l of leads) expect(l.website_hints.hasWebsite).toBe(false);
  });

  it('既定では DemoMapProvider を返す', () => {
    expect(getMapsProvider({} as NodeJS.ProcessEnv).name).toBe('DEMO');
  });
});

describe('safeFetch SSRF ガード', () => {
  it('内部/予約レンジを拒否', () => {
    expect(isUrlAllowed('http://localhost:5432')).toBe(false);
    expect(isUrlAllowed('http://127.0.0.1/admin')).toBe(false);
    expect(isUrlAllowed('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isUrlAllowed('http://192.168.1.1')).toBe(false);
    expect(isUrlAllowed('file:///etc/passwd')).toBe(false);
  });
  it('公開URLは許可、allowlist も尊重', () => {
    expect(isUrlAllowed('https://example.com')).toBe(true);
    expect(isUrlAllowed('https://evil.com', ['example.com'])).toBe(false);
    expect(isUrlAllowed('https://shop.example.com', ['example.com'])).toBe(true);
  });
});

describe('scanHtml', () => {
  it('連絡先と改善余地ヒントを抽出', () => {
    const html =
      '<html><head><title>テスト美容室</title><meta name="viewport" content="width=device-width"></head><body><form>お問い合わせ</form>info@test.example.jp <a href="https://instagram.com/test">IG</a></body></html>';
    const s = scanHtml(html, 'https://test.example.jp');
    expect(s.ssl).toBe(true);
    expect(s.mobile).toBe(true);
    expect(s.hasContactForm).toBe(true);
    expect(s.emails).toContain('info@test.example.jp');
    expect(s.title).toBe('テスト美容室');
  });
});
