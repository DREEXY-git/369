import type { ChatMessage, ChatOptions, LLMProvider, LLMResponse } from './types';

/**
 * APIキー不要のデモ用 LLM。
 * 実際の構造化生成は各 AI タスク側の fake 実装が担うため、
 * ここでは汎用的なエコー/要約のみを返す（タスクから直接呼ばれることは少ない）。
 */
export class FakeLLMProvider implements LLMProvider {
  readonly name = 'fake';
  readonly model = 'fake-llm-1';

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<LLMResponse> {
    const user = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const text = opts?.json
      ? JSON.stringify({ note: 'FakeLLM 構造化出力プレースホルダ', echo: user.slice(0, 200) })
      : `【FakeLLM】要点: ${user.slice(0, 160)}`;
    return {
      text,
      model: this.model,
      promptTokens: Math.ceil(user.length / 3),
      completionTokens: Math.ceil(text.length / 3),
    };
  }
}
