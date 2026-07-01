import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireUser();
  const t = user.tenantId;
  const [users, integrations, settings, suppression, backups, exportsCount] = await Promise.all([
    prisma.user.count({ where: { tenantId: t } }),
    prisma.integrationConnection.findMany({ where: { tenantId: t } }),
    prisma.systemSetting.findMany({ where: { tenantId: t } }),
    prisma.suppressionList.count({ where: { tenantId: t } }),
    prisma.backupJob.count({ where: { tenantId: t } }),
    prisma.exportJob.count({ where: { tenantId: t } }),
  ]);
  const externalSend = settings.find((s) => s.key === 'external_send_enabled')?.value;

  return (
    <div>
      <PageHeader title="管理コンソール" description="ユーザー・権限・セキュリティ・連携・バックアップを管理します。" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="ユーザー" value={users} />
        <Stat label="配信停止登録" value={suppression} />
        <Stat label="バックアップ" value={backups} />
        <Stat label="エクスポート" value={exportsCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>セキュリティ状況</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="外部メール送信" value={<Badge tone={externalSend ? 'green' : 'amber'}>{externalSend ? '有効' : '無効（既定・安全）'}</Badge>} />
            <Row label="RBAC / 機密ラベル" value={<Badge tone="green">有効</Badge>} />
            <Row label="監査ログ / AI参照ログ" value={<Badge tone="green">有効</Badge>} />
            <Row label="外部LLMマスキング" value={<Badge tone="green">有効</Badge>} />
            <Row label="AI注入検出 / PIIマスク" value={<Badge tone="green">全AI経路で有効</Badge>} />
            <Row label="AIによる外部送信" value={<Badge tone="red">禁止</Badge>} />
            <div className="flex flex-wrap gap-3 pt-1 text-xs">
              <Link href="/admin/audit" className="text-primary hover:underline">監査ログ →</Link>
              <Link href="/admin/ai-safety" className="text-primary hover:underline">AI安全ログ →</Link>
              <Link href="/admin/ai-outputs" className="text-primary hover:underline">AI出力ログ →</Link>
              <Link href="/admin/usage" className="text-primary hover:underline">利用量監査 →</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>外部連携</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {integrations.length === 0 ? (
              <span className="text-muted-foreground">連携は未設定です（MockProvider で動作）。</span>
            ) : integrations.map((i) => (
              <Row key={i.id} label={i.provider} value={<Badge tone={i.isMock ? 'slate' : 'green'}>{i.isMock ? 'Mock' : i.status}</Badge>} />
            ))}
            <div className="pt-1 text-xs text-muted-foreground">Gmail/Outlook/LINE/Slack/会計ソフト等は Provider interface + MockProvider を実装済み。</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span>{value}</div>;
}
