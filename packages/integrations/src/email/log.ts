import type { EmailProvider, SendEmailParams, SendResult } from './types.js';

/**
 * LogEmailProvider — 既定。ネットワーク送信を一切行わず、送信内容をログとして残すのみ。
 * 「初期状態では外部送信は無効」というポリシーの既定実装。
 */
export class LogEmailProvider implements EmailProvider {
  readonly name = 'log';

  async send(params: SendEmailParams): Promise<SendResult> {
    // 実運用では監査ログ/送信ログに記録する。ここでは標準出力のみ。
    // eslint-disable-next-line no-console
    console.info(
      `[email:log] to=${params.to} from=${params.from} subject="${params.subject}" (送信はされていません)`,
    );
    return { status: 'logged', provider: this.name, id: `log_${Date.now()}` };
  }
}
