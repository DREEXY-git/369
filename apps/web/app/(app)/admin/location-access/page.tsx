import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewLocation, PolicyDenied } from '@/lib/security/policy';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, EmptyState } from '@/components/ui';
import { formatDateTime } from '@hokko/shared';
import { seedDemoLocationsAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function LocationAccessPage({ searchParams }: { searchParams: Promise<{ reveal?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const canManage = hasPermission(user, 'admin', 'update');
  if (!hasPermission(user, 'admin', 'read') && !canManage) {
    return (
      <div>
        <PageHeader title="位置情報アクセス" />
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">閲覧権限がありません。</div>
      </div>
    );
  }

  // 最新の従業員位置ログ（ユーザーごと）
  const logs = await prisma.employeeLocationLog.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { recordedAt: 'desc' },
    take: 50,
  });
  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({ where: { tenantId: user.tenantId, id: { in: userIds } }, select: { id: true, name: true } });
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id.slice(0, 8);
  const latestByUser = new Map<string, (typeof logs)[number]>();
  for (const l of logs) if (!latestByUser.has(l.userId)) latestByUser.set(l.userId, l);

  // 閲覧要求（reveal）があれば ABAC（同意＋勤務時間）判定。許可時のみ座標を表示。
  let revealed: { userId: string; lat: number; lng: number; address: string } | null = null;
  let deniedReason: string | null = null;
  if (sp.reveal) {
    try {
      await assertCanViewLocation(user, { targetUserId: sp.reveal, purpose: '勤務中の所在確認' });
      const l = latestByUser.get(sp.reveal);
      if (l) revealed = { userId: sp.reveal, lat: l.lat, lng: l.lng, address: l.address };
    } catch (e) {
      if (e instanceof PolicyDenied) deniedReason = e.decision.reason;
      else throw e;
    }
  }

  const accessLogs = await prisma.locationAccessLog.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return (
    <div>
      <PageHeader
        title="位置情報アクセス（勤務中の所在）"
        description="同意がある場合のみ・勤務時間内のみ閲覧可。閲覧は必ずログに記録されます。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: '位置情報アクセス', href: '#' }]}
        action={canManage ? (<form action={seedDemoLocationsAction}><Button type="submit" variant="outline">デモ位置を投入</Button></form>) : null}
      />

      {revealed ? (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {nameOf(revealed.userId)} の所在: {revealed.address}（{revealed.lat.toFixed(4)}, {revealed.lng.toFixed(4)}）— 閲覧をログに記録しました。
        </div>
      ) : null}
      {deniedReason ? (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          位置情報の閲覧は許可されていません（理由: {deniedReason}）。
          {deniedReason === 'consent-required' ? '「同意管理」で対象従業員の位置情報取得同意を登録してください。' : ''}
          {deniedReason === 'outside-business-hours' ? '勤務時間外のため閲覧できません。' : ''}
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader><CardTitle>従業員の最新位置</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead><tr><Th>従業員</Th><Th>記録日時</Th><Th>勤務時間内</Th><Th>所在</Th><Th></Th></tr></thead>
            <tbody>
              {latestByUser.size === 0 ? (
                <tr><Td colSpan={5}><EmptyState title="位置ログがありません" hint="「デモ位置を投入」で作成できます。" /></Td></tr>
              ) : (
                [...latestByUser.values()].map((l) => (
                  <tr key={l.id} className="hover:bg-secondary/50">
                    <Td className="text-sm font-medium">{nameOf(l.userId)}</Td>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(l.recordedAt)}</Td>
                    <Td>{l.withinWorkingHours ? <Badge tone="green">勤務中</Badge> : <Badge tone="slate">時間外</Badge>}</Td>
                    <Td className="text-xs">{sp.reveal === l.userId && revealed ? l.address : '••• 非表示（要閲覧）'}</Td>
                    <Td><Link href={`/admin/location-access?reveal=${l.userId}`} className="text-xs text-primary hover:underline">位置を閲覧</Link></Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>位置情報 閲覧ログ</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <thead><tr><Th>日時</Th><Th>閲覧者</Th><Th>対象</Th><Th>判定</Th><Th>同意</Th></tr></thead>
            <tbody>
              {accessLogs.length === 0 ? (
                <tr><Td colSpan={5}><EmptyState title="閲覧ログがありません" /></Td></tr>
              ) : (
                accessLogs.map((a) => (
                  <tr key={a.id}>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</Td>
                    <Td className="text-xs">{a.actorId?.slice(0, 8) ?? '-'}</Td>
                    <Td className="text-xs">{nameOf(a.targetUserId ?? '')}</Td>
                    <Td><Badge tone={a.decision === 'allow' ? 'green' : 'red'}>{a.decision}</Badge></Td>
                    <Td className="text-xs text-muted-foreground">{a.consentStatus}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
