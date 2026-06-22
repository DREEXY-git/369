// コミュニケーション同期の Mock コネクタ。
// Gmail/Outlook/LINE/Slack/Chatwork 等の Adapter interface とデモ実装。

export interface IncomingMessage {
  externalId: string;
  channel: string;
  sender: string;
  subject: string;
  body: string;
  sentAt: string;
  hasAttachment: boolean;
}

export interface CommunicationConnector {
  readonly provider: string;
  readonly isMock: boolean;
  fetchRecent(limit?: number): Promise<IncomingMessage[]>;
}

const DEMO_MESSAGES: Omit<IncomingMessage, 'channel'>[] = [
  {
    externalId: 'm1',
    sender: 'tanaka@city-hall.example.jp',
    subject: '夏祭り会場設営の見積について',
    body: 'お世話になっております。夏祭りの会場設営の見積をお願いできますでしょうか。テントと音響を希望します。',
    sentAt: new Date().toISOString(),
    hasAttachment: false,
  },
  {
    externalId: 'm2',
    sender: 'info@beauty-salon.example.jp',
    subject: 'Webサイト改善の相談',
    body: '先日のご提案ありがとうございました。予約導線の改善について、もう少し詳しく相談したいです。',
    sentAt: new Date().toISOString(),
    hasAttachment: false,
  },
  {
    externalId: 'm3',
    sender: 'friend@personal.example.com',
    subject: '週末の予定',
    body: '今度の家族での飲み会だけど、土曜は空いてる？個人的な相談です。',
    sentAt: new Date().toISOString(),
    hasAttachment: false,
  },
  {
    externalId: 'm4',
    sender: 'procurement@school.example.jp',
    subject: '備品レンタルの請求書の件',
    body: '先月の学校イベントの請求書がまだ届いていないようです。ご確認をお願いします。',
    sentAt: new Date().toISOString(),
    hasAttachment: true,
  },
];

export class MockCommunicationConnector implements CommunicationConnector {
  readonly isMock = true;
  constructor(public readonly provider: string = 'gmail') {}

  async fetchRecent(limit = 10): Promise<IncomingMessage[]> {
    return DEMO_MESSAGES.slice(0, limit).map((m) => ({ ...m, channel: this.provider }));
  }
}
