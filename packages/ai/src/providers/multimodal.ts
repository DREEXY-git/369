// マルチモーダル AI Provider の interface と Fake 実装。Phase 1-5（将来OSへの準備）。
// OCR(請求/領収書)・音声(通話要約)・テキスト生成を差し替え可能にする抽象。
// env 未設定では常に Fake にフォールバックし、APIキー無しでもデモが動く方針を踏襲する。
import { FakeLLMProvider } from './fake-llm';
import type { ChatMessage } from './types';

// ============ TextAIProvider ============

export interface TextAIProvider {
  readonly name: string;
  readonly model: string;
  generateText(prompt: string, opts?: { system?: string; maxTokens?: number }): Promise<string>;
  summarize(text: string, opts?: { maxSentences?: number }): Promise<string>;
  classify(text: string, labels: string[]): Promise<{ label: string; confidence: number }>;
  extractJson<T = Record<string, unknown>>(text: string, schemaHint: string): Promise<T>;
}

export class FakeTextAIProvider implements TextAIProvider {
  readonly name = 'fake';
  readonly model = 'fake-text-1';
  private llm = new FakeLLMProvider();

  async generateText(prompt: string, opts: { system?: string; maxTokens?: number } = {}): Promise<string> {
    const messages: ChatMessage[] = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: prompt });
    const res = await this.llm.chat(messages, { maxTokens: opts.maxTokens });
    return res.text;
  }

  async summarize(text: string, opts: { maxSentences?: number } = {}): Promise<string> {
    const max = opts.maxSentences ?? 3;
    const sentences = text
      .split(/[。\n.!?！？]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (sentences.length === 0) return '';
    return sentences.slice(0, max).join('。') + '。';
  }

  async classify(text: string, labels: string[]): Promise<{ label: string; confidence: number }> {
    if (labels.length === 0) return { label: '', confidence: 0 };
    // 各ラベル語を含むかで簡易スコアリング（決定論）。
    let best = labels[0]!;
    let hit = false;
    for (const label of labels) {
      if (text.includes(label)) {
        best = label;
        hit = true;
        break;
      }
    }
    return { label: best, confidence: hit ? 0.8 : 0.4 };
  }

  async extractJson<T = Record<string, unknown>>(text: string, _schemaHint: string): Promise<T> {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* JSON でなければ空オブジェクト */
      }
    }
    return {} as T;
  }
}

// ============ OCRProvider ============

export interface OcrTextResult {
  text: string;
  pages: number;
  provider: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceFields {
  vendor: string;
  invoiceNumber: string;
  issueDate: string; // ISO (YYYY-MM-DD)
  dueDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  lineItems: InvoiceLineItem[];
}

export interface OCRProvider {
  readonly name: string;
  extractTextFromImage(input: { fileKey?: string; dataUrl?: string }): Promise<OcrTextResult>;
  extractTextFromPdf(input: { fileKey?: string; dataUrl?: string }): Promise<OcrTextResult>;
  extractInvoiceFields(input: { fileKey?: string; text?: string }): Promise<InvoiceFields>;
}

export class FakeOCRProvider implements OCRProvider {
  readonly name = 'fake';

  async extractTextFromImage(_input: { fileKey?: string; dataUrl?: string }): Promise<OcrTextResult> {
    return { text: '（Fake OCR）画像から抽出したテキストのサンプル。', pages: 1, provider: this.name };
  }

  async extractTextFromPdf(_input: { fileKey?: string; dataUrl?: string }): Promise<OcrTextResult> {
    return { text: '（Fake OCR）PDFから抽出したテキストのサンプル。', pages: 1, provider: this.name };
  }

  async extractInvoiceFields(_input: { fileKey?: string; text?: string }): Promise<InvoiceFields> {
    // 決定論のサンプル請求書フィールド（OCR結果は必ず下書き。仕訳確定は人間承認後）。
    const subtotal = 100000;
    const tax = Math.round(subtotal * 0.1);
    return {
      vendor: '株式会社サンプル商事',
      invoiceNumber: 'INV-2026-0001',
      issueDate: new Date().toISOString().slice(0, 10),
      subtotal,
      tax,
      total: subtotal + tax,
      currency: 'JPY',
      lineItems: [{ description: '機材レンタル一式', quantity: 1, unitPrice: subtotal, amount: subtotal }],
    };
  }
}

// ============ VoiceProvider ============

export interface DiarizedSegment {
  speaker: string;
  startSec: number;
  endSec: number;
  text: string;
}

export type CallSentiment = 'positive' | 'neutral' | 'negative';

export interface CallSummary {
  summary: string;
  sentiment: CallSentiment;
  actionItems: string[];
  nextStep: string;
}

export interface VoiceProvider {
  readonly name: string;
  transcribe(input: { fileKey?: string; text?: string }): Promise<{ text: string; provider: string }>;
  diarize(input: { fileKey?: string; text?: string }): Promise<DiarizedSegment[]>;
  summarizeCall(transcript: string): Promise<CallSummary>;
}

export class FakeVoiceProvider implements VoiceProvider {
  readonly name = 'fake';

  async transcribe(input: { fileKey?: string; text?: string }): Promise<{ text: string; provider: string }> {
    return { text: input.text ?? '（Fake音声）通話内容の文字起こしサンプル。', provider: this.name };
  }

  async diarize(input: { fileKey?: string; text?: string }): Promise<DiarizedSegment[]> {
    const base = input.text ?? 'お世話になります。ご提案の件いかがでしょうか。前向きに検討します。';
    const parts = base
      .split(/[。\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.map((text, i) => ({
      speaker: i % 2 === 0 ? '担当者' : '顧客',
      startSec: i * 15,
      endSec: i * 15 + 14,
      text,
    }));
  }

  async summarizeCall(transcript: string): Promise<CallSummary> {
    const positive = /前向き|検討|ありがとう|いいですね|お願い/.test(transcript);
    const negative = /不要|結構です|高い|見送り|クレーム/.test(transcript);
    return {
      summary: transcript.slice(0, 120),
      sentiment: positive ? 'positive' : negative ? 'negative' : 'neutral',
      actionItems: ['通話内容をCRMに記録', '次回フォロー日程を調整'],
      nextStep: positive ? '提案書を送付し訪問日程を打診' : '状況を見て再アプローチ',
    };
  }
}

// ============ Resolvers（env 未設定で Fake） ============

export function getTextAIProvider(_env: NodeJS.ProcessEnv = process.env): TextAIProvider {
  // 本番では env で OpenAI/Anthropic ラッパーへ差し替え。MVP は Fake。
  return new FakeTextAIProvider();
}

export function getOCRProvider(_env: NodeJS.ProcessEnv = process.env): OCRProvider {
  // 本番では Google Document AI / Azure OCR 等へ差し替え。MVP は Fake。
  return new FakeOCRProvider();
}

export function getVoiceProvider(_env: NodeJS.ProcessEnv = process.env): VoiceProvider {
  // 本番では Whisper / 電話基盤の音声へ差し替え。MVP は Fake。
  return new FakeVoiceProvider();
}
