import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IKEZAKI OS — 統合AI経営OS',
  description: '中小企業の経営・営業・顧客対応・会計・人事・在庫・AI社員を統合する経営OS + LeadMap AI',
};

const themeInit = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
