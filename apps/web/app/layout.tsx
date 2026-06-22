import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '369 統合AI経営OS',
  description: '中小企業の経営・営業・顧客対応・会計・人事・在庫・AI社員を統合する経営OS + LeadMap AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
