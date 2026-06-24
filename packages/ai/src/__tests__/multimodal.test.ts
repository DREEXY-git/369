import { describe, it, expect } from 'vitest';
import {
  getTextAIProvider,
  getOCRProvider,
  getVoiceProvider,
  FakeTextAIProvider,
  FakeOCRProvider,
  FakeVoiceProvider,
} from '../providers/index';

describe('TextAIProvider (Fake)', () => {
  const p = getTextAIProvider();
  it('resolves to fake and generates text', async () => {
    expect(p).toBeInstanceOf(FakeTextAIProvider);
    const text = await p.generateText('美容室の営業切り口を提案して', { system: '簡潔に' });
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });
  it('summarizes within sentence cap', async () => {
    const s = await p.summarize('一文目。二文目。三文目。四文目。', { maxSentences: 2 });
    expect(s.split('。').filter(Boolean).length).toBeLessThanOrEqual(2);
  });
  it('classifies by label hit and falls back to first label', async () => {
    const hit = await p.classify('これはクレームです', ['クレーム', '問い合わせ']);
    expect(hit.label).toBe('クレーム');
    expect(hit.confidence).toBeGreaterThan(0.5);
    const miss = await p.classify('xxxxx', ['A', 'B']);
    expect(miss.label).toBe('A');
    expect(miss.confidence).toBeLessThan(0.5);
  });
  it('extracts json best-effort', async () => {
    const obj = await p.extractJson<{ a: number }>('前置き {"a": 5} 後置き', 'a:number');
    expect(obj.a).toBe(5);
    const empty = await p.extractJson('no json here', 'x');
    expect(empty).toEqual({});
  });
});

describe('OCRProvider (Fake)', () => {
  const p = getOCRProvider();
  it('resolves to fake and extracts text/invoice fields', async () => {
    expect(p).toBeInstanceOf(FakeOCRProvider);
    const img = await p.extractTextFromImage({ fileKey: 'k' });
    expect(img.pages).toBe(1);
    expect(img.provider).toBe('fake');
    const inv = await p.extractInvoiceFields({ text: 'dummy' });
    expect(inv.total).toBe(inv.subtotal + inv.tax);
    expect(inv.currency).toBe('JPY');
    expect(inv.lineItems.length).toBeGreaterThan(0);
  });
});

describe('VoiceProvider (Fake)', () => {
  const p = getVoiceProvider();
  it('resolves to fake, diarizes and summarizes sentiment', async () => {
    expect(p).toBeInstanceOf(FakeVoiceProvider);
    const segs = await p.diarize({ text: '担当者の発言。顧客の発言。' });
    expect(segs.length).toBeGreaterThanOrEqual(2);
    expect(segs[0]!.speaker).toBe('担当者');
    const pos = await p.summarizeCall('前向きに検討します。ありがとうございます。');
    expect(pos.sentiment).toBe('positive');
    const neg = await p.summarizeCall('今回は見送りで結構です。');
    expect(neg.sentiment).toBe('negative');
    expect(pos.actionItems.length).toBeGreaterThan(0);
  });
});
