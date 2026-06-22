import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, EmptyState } from '@/components/ui';
import { isGoogleMapsEnabled } from '@hokko/integrations';

export const dynamic = 'force-dynamic';

export default async function LeadmapSettingsPage() {
  const user = await requireUser();
  const [suppression, consents] = await Promise.all([
    prisma.suppressionList.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.consentRecord.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const mapsGoogle = isGoogleMapsEnabled();
  const externalSend = process.env.EXTERNAL_SEND_ENABLED === 'true';

  return (
    <div>
      <PageHeader title="LeadMap 設定" description="データソース・コンプライアンス・配信停止リストを管理します。" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>プロバイダ設定</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="地図プロバイダ" value={<Badge tone={mapsGoogle ? 'green' : 'slate'}>{mapsGoogle ? 'Google Places API' : 'Demo（APIキー未設定）'}</Badge>} />
            <Row label="外部メール送信" value={<Badge tone={externalSend ? 'green' : 'amber'}>{externalSend ? '有効' : '無効（既定・安全）'}</Badge>} />
            <p className="pt-2 text-xs text-muted-foreground">
              Google Maps APIキーを設定すると公式 Places API を使用します。規約違反のスクレイピングは行いません。
              外部送信は EXTERNAL_SEND_ENABLED=true かつ人間承認がある場合のみ実行されます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>同意レコード</CardTitle></CardHeader>
          <CardContent>
            {consents.length === 0 ? <EmptyState title="同意レコードがありません" /> : (
              <div className="space-y-1 text-sm">
                {consents.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="truncate">{c.subject}</span>
                    <Badge tone={c.consent ? 'green' : 'red'}>{c.consent ? '同意あり' : '同意なし'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>配信停止リスト（Suppression List）</CardTitle></CardHeader>
        <CardContent>
          {suppression.length === 0 ? <EmptyState title="配信停止リストは空です" /> : (
            <Table>
              <thead><tr><Th>チャネル</Th><Th>宛先</Th><Th>理由</Th></tr></thead>
              <tbody>
                {suppression.map((s) => (
                  <tr key={s.id}><Td><Badge>{s.channel}</Badge></Td><Td className="font-mono text-xs">{s.value}</Td><Td className="text-muted-foreground">{s.reason}</Td></tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {value}
    </div>
  );
}
