import { AnthropicCompatibleProvider } from './anthropic';
import { ExternalEmbeddingProvider, FakeEmbeddingProvider } from './embeddings';
import { FakeLLMProvider } from './fake-llm';
import { OpenAICompatibleProvider } from './openai';
import { FakeTranscriptionProvider } from './transcription';
import type { EmbeddingProvider, LLMProvider, TranscriptionProvider } from './types';

export * from './types';
export {
  FakeLLMProvider,
  OpenAICompatibleProvider,
  AnthropicCompatibleProvider,
  FakeEmbeddingProvider,
  ExternalEmbeddingProvider,
  FakeTranscriptionProvider,
};

/**
 * 環境変数から LLM Provider を解決。
 * キー未設定・未指定なら必ず FakeLLM にフォールバック（デモが常に動く）。
 */
export function getLLMProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const provider = (env.LLM_PROVIDER || 'fake').toLowerCase();
  const model = env.LLM_MODEL || undefined;
  if (provider === 'openai' && env.OPENAI_API_KEY) {
    return new OpenAICompatibleProvider({
      apiKey: env.OPENAI_API_KEY,
      model,
      baseUrl: env.OPENAI_BASE_URL,
    });
  }
  if (provider === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return new AnthropicCompatibleProvider({
      apiKey: env.ANTHROPIC_API_KEY,
      model,
      baseUrl: env.ANTHROPIC_BASE_URL,
    });
  }
  return new FakeLLMProvider();
}

export function getEmbeddingProvider(env: NodeJS.ProcessEnv = process.env): EmbeddingProvider {
  const provider = (env.EMBEDDING_PROVIDER || 'fake').toLowerCase();
  if (provider === 'openai' && env.OPENAI_API_KEY) {
    return new ExternalEmbeddingProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.EMBEDDING_MODEL,
      baseUrl: env.OPENAI_BASE_URL,
    });
  }
  return new FakeEmbeddingProvider();
}

export function getTranscriptionProvider(
  _env: NodeJS.ProcessEnv = process.env,
): TranscriptionProvider {
  // MVP は常に Fake（文字起こし済みテキスト前提）。本番で Whisper 等へ差し替え。
  return new FakeTranscriptionProvider();
}

export function isExternalLlmEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return getLLMProvider(env).name !== 'fake';
}
