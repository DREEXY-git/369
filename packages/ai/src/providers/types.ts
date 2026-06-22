export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  task?: string;
}

export interface LLMResponse {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface LLMProvider {
  /** "fake" | "openai" | "anthropic" */
  readonly name: string;
  readonly model: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<LLMResponse>;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface TranscriptionInput {
  fileKey?: string;
  text?: string;
  language?: string;
}
export interface TranscriptionSegment {
  speaker: string;
  startSec: number;
  text: string;
}
export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  provider: string;
}
export interface TranscriptionProvider {
  readonly name: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
