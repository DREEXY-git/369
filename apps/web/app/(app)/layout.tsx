import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [notifications, approvals] = await Promise.all([
    prisma.notification.count({ where: { tenantId: user.tenantId, userId: user.userId, readAt: null } }),
    prisma.approvalRequest.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} notifications={notifications} approvals={approvals} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
