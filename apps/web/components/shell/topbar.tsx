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
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <form action="/knowledge/search" className="relative hidden flex-1 md:block">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          placeholder="顧客・案件・ナレッジを横断検索…"
          className="h-9 w-full max-w-md rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>
      <div className="flex-1 md:hidden" />

      <Link href="/approvals" className="relative rounded-md p-2 hover:bg-secondary" title="承認待ち">
        <CheckSquare className="h-5 w-5" />
        {approvals > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {approvals}
          </span>
        ) : null}
      </Link>

      <Link href="/notifications" className="relative rounded-md p-2 hover:bg-secondary" title="通知">
        <Bell className="h-5 w-5" />
        {notifications > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {notifications}
          </span>
        ) : null}
      </Link>

      <div className="flex items-center gap-2 border-l pl-3">
        <div className="text-right">
          <div className="text-sm font-medium leading-tight">{user.name}</div>
          <div className="text-[11px] text-muted-foreground leading-tight">{user.email}</div>
        </div>
        <Badge tone={user.isAi ? 'purple' : 'primary'}>{ROLE_LABEL[role]}</Badge>
        <form action={logoutAction}>
          <button className="rounded-md p-2 hover:bg-secondary" title="ログアウト" type="submit">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
