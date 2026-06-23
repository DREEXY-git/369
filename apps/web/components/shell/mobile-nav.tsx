'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV } from './nav';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // ルート遷移で閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 開いている間は背面スクロールを止める / Escで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="rounded-lg p-2 text-foreground/70 transition hover:bg-secondary hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* ドロワー本体 */}
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] animate-fade-in flex-col bg-sidebar text-sidebar-foreground shadow-pop">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black tracking-tight text-white">
                  IK
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-white">IKEZAKI OS</div>
                  <div className="text-[10px] text-sidebar-muted">統合AI経営OS</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="rounded-lg p-2 text-sidebar-muted hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="scrollbar-dark flex-1 overflow-y-auto px-3 pb-6">
              {NAV.map((group) => (
                <div key={group.title} className="mb-4">
                  <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
                    {group.title}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                            active
                              ? 'bg-sidebar-accent font-medium text-white'
                              : 'text-sidebar-foreground hover:bg-white/[0.06] hover:text-white',
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0',
                              active ? 'text-white' : 'text-sidebar-muted group-hover:text-white',
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
