'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
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

  return (
    <button
      type="button"
      onClick={toggle}
      title={mounted && dark ? 'ライトモードに切替' : 'ダークモードに切替'}
      aria-label="テーマ切替"
      className="rounded-lg p-2 text-foreground/70 transition hover:bg-secondary hover:text-foreground"
    >
      {mounted && dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
