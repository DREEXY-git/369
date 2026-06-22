import nodemailer from 'nodemailer';
import type { EmailProvider, SendEmailParams, SendResult } from './types';

/**
 * SmtpEmailProvider — 開発は Mailhog/Mailpit(localhost:1025)、本番は SMTP に差し替え。
 * 実際の送信は EXTERNAL_SEND_ENABLED と人間承認を満たした場合のみ呼ばれる。
 */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private transport: nodemailer.Transporter;

  constructor(opts: { host: string; port: number; user?: string; pass?: string }) {
    this.transport = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: false,
      auth: opts.user ? { user: opts.user, pass: opts.pass ?? '' } : undefined,
    });
  }

  async send(params: SendEmailParams): Promise<SendResult> {
    try {
      const info = await this.transport.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return { status: 'sent', provider: this.name, id: info.messageId };
    } catch (e) {
      return { status: 'failed', provider: this.name, error: (e as Error).message };
    }
  }
}
