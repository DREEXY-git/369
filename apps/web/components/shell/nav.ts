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
  Eye,
  ShieldCheck,
  Activity,
  FileCheck,
  ShieldAlert,
  Cog,
  TrendingUp,
  Cpu,
  Siren,
  Sparkles,
  ClipboardCheck,
  Warehouse,
  Truck,
  ClipboardList,
  ShoppingCart,
  PackageSearch,
  Send,
  PlayCircle,
  ArrowLeftRight,
  BookText,
  Brain,
  BookMarked,
  Radar,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};
export type NavGroup = { title: string; items: NavItem[] };

// サイドバー（PC）とモバイルドロワーで共用するナビゲーション定義。
export const NAV: NavGroup[] = [
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
    title: 'Growth・DX OS',
    items: [
      { label: '成長ダッシュボード', href: '/growth', icon: TrendingUp },
      { label: 'Growthコントロールタワー', href: '/growth/control-tower', icon: Radar },
      { label: '成長イベント台帳', href: '/growth/events', icon: Activity },
      { label: 'Marketing OS', href: '/marketing', icon: Megaphone },
      { label: 'DX OS', href: '/dx', icon: Cpu },
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
      { label: 'Finance Bridge', href: '/finance/bridge', icon: ArrowLeftRight },
      { label: '仕訳候補', href: '/finance/journal-candidates', icon: BookText },
      { label: '請求候補', href: '/finance/invoice-candidates', icon: Receipt },
      { label: '資金繰り', href: '/finance/cashflow', icon: CalendarClock },
      { label: '利益漏れ検知', href: '/finance/profit-leaks', icon: TrendingDown },
    ],
  },
  {
    title: 'Operations OS',
    items: [
      { label: '経営資産ダッシュボード', href: '/operations', icon: Warehouse },
      { label: 'イベント案件', href: '/operations/events', icon: PartyPopper },
      { label: '在庫移動台帳', href: '/operations/inventory-movements', icon: Truck },
      { label: '棚卸', href: '/operations/stocktakes', icon: ClipboardList },
      { label: '発注管理', href: '/operations/purchase-orders', icon: ShoppingCart },
      { label: '発注点・候補', href: '/operations/reorder', icon: PackageSearch },
      { label: '配送・設営・回収', href: '/operations/logistics', icon: Send },
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
      { label: '会社の頭脳', href: '/brain/policies', icon: Brain },
      { label: '営業プレイブック', href: '/brain/playbooks', icon: BookText },
      { label: '顧客事例', href: '/brain/case-studies', icon: BookMarked },
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
      { label: '機密参照ログ', href: '/admin/data-access-logs', icon: Eye },
      { label: 'AI安全ログ', href: '/admin/ai-safety', icon: Siren },
      { label: 'AI出力ログ', href: '/admin/ai-outputs', icon: Sparkles },
      { label: 'ポリシー判定', href: '/admin/policy-decisions', icon: ShieldCheck },
      { label: 'イベント連動', href: '/admin/events', icon: Activity },
      { label: '同意管理', href: '/admin/compliance/consents', icon: FileCheck },
      { label: '危険操作ゲート', href: '/admin/danger-actions', icon: ShieldAlert },
      { label: 'ジョブ実行', href: '/admin/jobs', icon: Cog },
      { label: '位置情報アクセス', href: '/admin/location-access', icon: MapPin },
      { label: 'Operations準備', href: '/admin/operations-readiness', icon: ClipboardCheck },
      { label: 'Operations実行', href: '/admin/operations-actions', icon: PlayCircle },
    ],
  },
];
