import type { ChatMessage, ChatOptions, LLMProvider, LLMResponse } from './types';

/** OpenAI 互換 Chat Completions Provider（SDK 非依存・fetch 実装）。 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model || 'gpt-4o-mini';
    this.baseUrl = (opts.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 1200,
        ...(opts?.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI provider error: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as any;
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? this.model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}
