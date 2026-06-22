// ナレッジ: テキスト分割（チャンク化）とベクトル類似度（pgvector 移行可能）。

export function chunkText(text: string, size = 400, overlap = 60): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;
  const step = Math.max(1, size - overlap);
  while (start < clean.length) {
    chunks.push(clean.slice(start, start + size));
    start += step;
  }
  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface ScoredChunk<T> {
  item: T;
  score: number;
}

export function rankByEmbedding<T extends { embedding: number[] }>(
  query: number[],
  items: T[],
  topK = 5,
): ScoredChunk<T>[] {
  return items
    .map((item) => ({ item, score: cosineSimilarity(query, item.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
