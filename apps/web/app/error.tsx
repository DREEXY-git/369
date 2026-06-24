'use client';

// アプリ全体の実行時例外フォールバック。生の「Application error / Digest」ではなく、
// 原因の手がかりと再試行導線を日本語で提示する（特に本番のDB未接続/未初期化時）。
import { useEffect } from 'react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // サーバログに残す（Vercel の Functions ログで確認可能）。
    console.error('[app/error] runtime exception:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-background to-amber-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-card p-8 shadow-pop">
        <h1 className="text-lg font-bold text-foreground">問題が発生しました</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ページの読み込み中にサーバー側エラーが発生しました。一時的な問題の可能性があります。再試行しても解消しない場合は、以下をご確認ください。
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>データベース接続（環境変数 <code className="rounded bg-secondary px-1">DATABASE_URL</code> / <code className="rounded bg-secondary px-1">DIRECT_URL</code>）が正しいか</li>
          <li>初回デプロイ時にマイグレーション/シードが実行されたか</li>
          <li>外部サービス（DB/メール等）が稼働しているか</li>
        </ul>
        {error?.digest ? (
          <p className="mt-3 text-xs text-muted-foreground">エラー識別子: <code className="rounded bg-secondary px-1">{error.digest}</code></p>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            再試行
          </button>
          <a
            href="/login"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary"
          >
            ログインへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
