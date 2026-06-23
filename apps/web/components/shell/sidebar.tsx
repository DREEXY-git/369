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
  Inbox,
  Scale,
  BadgePercent,
  PartyPopper,
  Shield,
  ScrollText,
  Search,
  Route,
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
      { label: '顧客CRM', href: '/customers', icon: Users },
      { label: '案件管理', href: '/deals', icon: Briefcase },
      { label: '営業パイプライン', href: '/deals/kanban', icon: KanbanSquare },
    ],
  },
  {
    title: 'リードマップAI（地図営業）',
    items: [
      { label: 'キャンペーン', href: '/leadmap/campaigns', icon: Megaphone },
      { label: 'リード一覧', href: '/leadmap/leads', icon: Users },
      { label: '地図CRM', href: '/leadmap/map', icon: MapPin },
      { label: 'パイプライン', href: '/leadmap/pipeline', icon: KanbanSquare },
      { label: '訪問ルート', href: '/leadmap/routes', icon: Route },
    ],
  },
  {
    title: '見積・契約・請求',
    items: [
      { label: '見積書', href: '/quotes', icon: FileText },
      { label: '契約', href: '/contracts', icon: ScrollText },
      { label: '請求書', href: '/invoices', icon: Receipt },
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
      { label: 'コミュニケーション', href: '/communications/inbox', icon: Inbox },
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
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-lg shadow-indigo-900/40">
          369
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">統合AI経営OS</div>
          <div className="text-[10px] text-sidebar-muted">＋ LeadMap AI</div>
        </div>
      </div>

      <nav className="scrollbar-dark flex-1 overflow-y-auto px-3 pb-4">
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
        © 369 統合AI経営OS
      </div>
    </aside>
  );
}
