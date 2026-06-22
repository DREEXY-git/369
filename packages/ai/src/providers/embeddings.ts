import type { EmbeddingProvider } from './types';

const DIMS = 64;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[、。・,.!?\n\r]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * APIキー不要の決定論的 Embedding。
 * バッグ・オブ・ワード方式で次元へハッシュ投影 → L2 正規化。
 * 似たテキストは似たベクトルになり、デモのコサイン類似検索が成立する。
 */
export class FakeEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'fake';
  readonly dimensions = DIMS;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const vec = new Array(DIMS).fill(0);
      // 文字 2-gram も使い、日本語の分かち書き無しでも類似が出るようにする
      const tokens = tokenize(text);
      for (const t of tokens) vec[hashString(t) % DIMS] += 1;
      for (let i = 0; i < text.length - 1; i++) {
        const bigram = text.slice(i, i + 2);
        vec[hashString(bigram) % DIMS] += 0.5;
      }
      const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
      return vec.map((v) => v / norm);
    });
  }
}

/** OpenAI 互換 Embedding（キーがある場合のみ使用）。 */
export class ExternalEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions = 1536;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(opts: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model || 'text-embedding-3-small';
    this.baseUrl = (opts.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) throw new Error(`Embedding error: ${res.status}`);
    const data = (await res.json()) as any;
    return data.data.map((d: any) => d.embedding as number[]);
  }
}
