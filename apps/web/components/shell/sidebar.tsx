'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from './nav';
import { cn } from '@/lib/utils';

export function Sidebar({ allowedHrefs }: { allowedHrefs?: string[] }) {
  const pathname = usePathname();
  // 権限フィルタ（roadmap74 §9）: allowedHrefs 未指定時は従来どおり全表示（後方互換）。
  const allowed = allowedHrefs ? new Set(allowedHrefs) : null;
  const groups = NAV.map((g) => ({
    ...g,
    items: allowed ? g.items.filter((i) => allowed.has(i.href)) : g.items,
  })).filter((g) => g.items.length > 0);
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black tracking-tight text-white shadow-lg shadow-indigo-900/40">
          IK
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">IKEZAKI OS</div>
          <div className="text-[10px] text-sidebar-muted">統合AI経営OS</div>
        </div>
      </div>

      <nav className="scrollbar-dark flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
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
                    className={cn(
                      'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                      active
                        ? 'bg-sidebar-accent font-medium text-white shadow-sm shadow-indigo-950/30'
                        : 'text-sidebar-foreground hover:bg-white/[0.06] hover:text-white',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors',
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

      <div className="border-t border-white/10 px-4 py-3 text-[10px] text-sidebar-muted">
        © IKEZAKI OS
      </div>
    </aside>
  );
}
