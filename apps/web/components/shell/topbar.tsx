import Link from 'next/link';
import { Bell, CheckSquare, LogOut, Search } from 'lucide-react';
import { Badge } from '@/components/ui';
import { logoutAction } from '@/app/login/actions';
import { ROLE_LABEL, primaryRole, type CurrentUser } from '@/lib/auth/current-user';

export function Topbar({
  user,
  notifications,
  approvals,
}: {
  user: CurrentUser;
  notifications: number;
  approvals: number;
}) {
  const role = primaryRole(user.roles);
  const initial = (user.name ?? '?').trim().slice(0, 1) || '?';
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      {/* モバイル用ブランド */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black text-white">
          369
        </div>
      </div>

      <form action="/knowledge/search" className="relative hidden flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          placeholder="顧客・案件・ナレッジを横断検索…"
          className="h-9 w-full max-w-md rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </form>
      <div className="flex-1 md:hidden" />

      <Link
        href="/approvals"
        className="relative rounded-lg p-2 text-foreground/70 transition hover:bg-secondary hover:text-foreground"
        title="承認待ち"
      >
        <CheckSquare className="h-5 w-5" />
        {approvals > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white ring-2 ring-card">
            {approvals}
          </span>
        ) : null}
      </Link>

      <Link
        href="/notifications"
        className="relative rounded-lg p-2 text-foreground/70 transition hover:bg-secondary hover:text-foreground"
        title="通知"
      >
        <Bell className="h-5 w-5" />
        {notifications > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-card">
            {notifications}
          </span>
        ) : null}
      </Link>

      <div className="flex items-center gap-2.5 border-l border-border pl-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${
            user.isAi
              ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600'
              : 'bg-gradient-to-br from-indigo-500 to-violet-600'
          }`}
          title={user.name}
        >
          {initial}
        </div>
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium leading-tight">{user.name}</div>
          <div className="text-[11px] leading-tight text-muted-foreground">{user.email}</div>
        </div>
        <Badge tone={user.isAi ? 'purple' : 'primary'}>{ROLE_LABEL[role]}</Badge>
        <form action={logoutAction}>
          <button
            className="rounded-lg p-2 text-foreground/70 transition hover:bg-secondary hover:text-foreground"
            title="ログアウト"
            type="submit"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
