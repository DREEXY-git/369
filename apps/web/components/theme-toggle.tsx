'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// v7.0 R2（Codex P2 comment 4951029653）: <sm では topbar から theme を外したため、
// mobile drawer 内へ「明確な操作」として復旧する。variant='drawer' はラベル付きの行ボタン
// （drawer の暗色配色）、variant='icon' は従来どおり topbar のアイコンボタン。
export function ThemeToggle({
  variant = 'icon',
  testId = 'theme-toggle',
}: {
  variant?: 'icon' | 'drawer';
  testId?: string;
}) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* localStorage 不可環境は無視 */
    }
    setDark(next);
  };

  if (variant === 'drawer') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="テーマ切替"
        data-testid={testId}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        {mounted && dark ? (
          <Sun className="h-[18px] w-[18px] shrink-0 text-sidebar-muted" />
        ) : (
          <Moon className="h-[18px] w-[18px] shrink-0 text-sidebar-muted" />
        )}
        <span>{mounted && dark ? 'ライトモードに切替' : 'ダークモードに切替'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={mounted && dark ? 'ライトモードに切替' : 'ダークモードに切替'}
      aria-label="テーマ切替"
      data-testid={testId}
      className="rounded-lg p-2 text-foreground/70 transition hover:bg-secondary hover:text-foreground"
    >
      {mounted && dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
