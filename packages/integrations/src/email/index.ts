import { LogEmailProvider } from './log';
import { SmtpEmailProvider } from './smtp';
import type { EmailProvider } from './types';

export * from './types';
export { LogEmailProvider, SmtpEmailProvider };

/**
 * 環境変数からメール Provider を解決。既定は log（外部送信なし）。
 * MAIL_PROVIDER=smtp の場合のみ SMTP を返す（実送信はさらに承認ゲートを通す）。
 */
export function getEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  const provider = (env.MAIL_PROVIDER || 'log').toLowerCase();
  if (provider === 'smtp') {
    return new SmtpEmailProvider({
      host: env.SMTP_HOST || 'localhost',
      port: Number(env.SMTP_PORT || 1025),
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    });
  }
  return new LogEmailProvider();
}

/** 外部送信のマスタースイッチ。既定 false。 */
export function isExternalSendEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.EXTERNAL_SEND_ENABLED === 'true';
}
