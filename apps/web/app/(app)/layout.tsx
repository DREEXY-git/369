import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // WIP-5（roadmap66 追補）: 承認待ち件数はテナント全体の承認業務の存在シグナル（金額・人事等の
  // 承認案件数を含む）。リンク先 /approvals のページゲート（approval:approve・Phase 1-19）と
  // 入口条件を一致させ、開けないページへの行き止まり導線（READ_ONLY）を作らない。
  // DEPARTMENT_MANAGER は approve 保持のためバッジ維持。
  const canViewApprovals = hasPermission(user, 'approval', 'approve');
  const [notifications, approvals] = await Promise.all([
    prisma.notification.count({ where: { tenantId: user.tenantId, userId: user.userId, readAt: null } }),
    canViewApprovals
      ? prisma.approvalRequest.count({ where: { tenantId: user.tenantId, status: 'PENDING' } })
      : Promise.resolve(0),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} notifications={notifications} approvals={approvals} showApprovals={canViewApprovals} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
