export interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}

export type SendStatus = 'logged' | 'sent' | 'failed' | 'suppressed';

export interface SendResult {
  status: SendStatus;
  provider: string;
  id?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(params: SendEmailParams): Promise<SendResult>;
}
