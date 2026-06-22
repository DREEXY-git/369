'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Crown,
  Sunrise,
  AlertTriangle,
  CheckSquare,
  Users,
  Briefcase,
  KanbanSquare,
  MapPin,
  Megaphone,
  FileText,
  Receipt,
  Wallet,
  TrendingDown,
  Boxes,
  CalendarClock,
  Video,
  Upload,
  ListTodo,
  Bot,
  MessagesSquare,
  Scale,
  BadgePercent,
  PartyPopper,
  Shield,
  ScrollText,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };
type Group = { title: string; items: Item[] };

const NAV: Group[] = [
  {
    title: '経営',
    items: [
      { label: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
      { label: '社長コックピット', href: '/dashboard/ceo', icon: Crown },
      { label: 'AI朝礼レポート', href: '/reports/morning', icon: Sunrise },
      { label: 'アラート', href: '/alerts', icon: AlertTriangle },
      { label: '承認待ち', href: '/approvals', icon: CheckSquare },
    ],
  },
  {
    title: '営業・顧客',
    items: [
      { label: '顧客 CRM', href: '/customers', icon: Users },
      { label: '案件', href: '/deals', icon: Briefcase },
      { label: '営業パイプライン', href: '/deals/kanban', icon: KanbanSquare },
    ],
  },
  {
    title: 'LeadMap AI',
    items: [
      { label: 'キャンペーン', href: '/leadmap/campaigns', icon: Megaphone },
      { label: 'リード一覧', href: '/leadmap/leads', icon: Users },
      { label: '地図CRM', href: '/leadmap/map', icon: MapPin },
      { label: 'パイプライン', href: '/leadmap/pipeline', icon: KanbanSquare },
      { label: '訪問ルート', href: '/leadmap/routes', icon: MapPin },
    ],
  },
  {
    title: '見積・請求',
    items: [
      { label: '見積', href: '/quotes', icon: FileText },
      { label: '契約', href: '/contracts', icon: ScrollText },
      { label: '請求', href: '/invoices', icon: Receipt },
    ],
  },
  {
    title: '会計・財務',
    items: [
      { label: '財務サマリー', href: '/finance', icon: Wallet },
      { label: '資金繰り', href: '/finance/cashflow', icon: CalendarClock },
      { label: '利益漏れ検知', href: '/finance/profit-leaks', icon: TrendingDown },
    ],
  },
  {
    title: '在庫・リース',
    items: [
      { label: '在庫・商品', href: '/inventory', icon: Boxes },
      { label: 'リース予約', href: '/inventory/lease', icon: CalendarClock },
      { label: '商品収益性', href: '/inventory/profitability', icon: TrendingDown },
    ],
  },
  {
    title: '会議・ナレッジ',
    items: [
      { label: '会議・議事録', href: '/meetings', icon: Video },
      { label: '議事録の取込', href: '/meetings/upload', icon: Upload },
      { label: 'タスク', href: '/tasks', icon: ListTodo },
      { label: 'ナレッジ検索', href: '/knowledge/search', icon: Search },
    ],
  },
  {
    title: 'AI・組織',
    items: [
      { label: 'AI社員', href: '/ai-agents', icon: Bot },
      { label: '報連相', href: '/horenso', icon: MessagesSquare },
    ],
  },
  {
    title: '専門家・支援',
    items: [
      { label: '士業連携', href: '/experts', icon: Scale },
      { label: '補助金・助成金', href: '/subsidies', icon: BadgePercent },
      { label: 'プランニングホッコー', href: '/planning-hokko', icon: PartyPopper },
    ],
  },
  {
    title: '管理',
    items: [
      { label: '管理コンソール', href: '/admin', icon: Shield },
      { label: 'ユーザー・権限', href: '/admin/users', icon: Users },
      { label: '監査ログ', href: '/admin/audit', icon: ScrollText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="text-xl font-black text-primary">369</span>
        <span className="text-xs text-muted-foreground">統合AI経営OS</span>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {NAV.map((group) => (
          <div key={group.title} className="mb-3">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </div>
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
                    'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition',
                    active
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-foreground/80 hover:bg-secondary',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
