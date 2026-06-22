import type { ChatMessage, ChatOptions, LLMProvider, LLMResponse } from './types.js';

/** Anthropic Messages API 互換 Provider（SDK 非依存・fetch 実装）。 */
export class AnthropicCompatibleProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model || 'claude-3-5-haiku-latest';
    this.baseUrl = (opts.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<LLMResponse> {
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const rest = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        system: opts?.json ? `${system}\n\n必ず有効な JSON のみを出力してください。` : system,
        messages: rest,
        max_tokens: opts?.maxTokens ?? 1500,
        temperature: opts?.temperature ?? 0.3,
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic provider error: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as any;
    const text = (data.content ?? [])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');
    return {
      text,
      model: data.model ?? this.model,
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
    };
  }
}
