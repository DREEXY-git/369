import type { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma, writeAudit } from '@/lib/db';
import { hasPermission } from '@/lib/auth/current-user';
import { recordUsageEvent } from '@/lib/usage-events';
import { LEAD_STAGE_LABEL } from '@/components/badges';
import type { LeadStage } from '@hokko/shared';

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** LeadMap リード一覧のCSVエクスポート（要 leadmap:export 権限・監査記録）。 */
export async function GET(req: NextRequest) {
  const user = await readSession();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!hasPermission(user, 'leadmap', 'export')) {
    return new Response('Forbidden: leadmap:export 権限が必要です', { status: 403 });
  }

  const campaignId = req.nextUrl.searchParams.get('campaign');
  const leads = await prisma.localBusinessLead.findMany({
    where: { tenantId: user.tenantId, ...(campaignId ? { campaignId } : {}) },
    orderBy: { priority: 'desc' },
    take: 1000,
  });

  const header = [
    '店舗名', '業種', '都道府県', '市区', '住所', '評価', '口コミ数', '営業優先度', 'ステージ',
    '電話', 'Webサイト', 'メール', '問い合わせ', '緯度', '経度', 'GoogleマップURL',
    'データソース', 'placeId', '取得日時', 'キャッシュ期限',
  ];
  const lines = [header.join(',')];
  for (const l of leads) {
    lines.push(
      [
        l.name, l.industry, l.prefecture, l.city, l.address, l.rating, l.reviewCount, l.priority,
        LEAD_STAGE_LABEL[l.stage as LeadStage]?.text ?? l.stage,
        l.phone, l.website, l.email, l.contactForm, l.lat, l.lng, l.googleMapsUrl,
        l.source, l.placeId, l.fetchedAt?.toISOString() ?? '', l.expiresAt?.toISOString() ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  // Excel が UTF-8 を正しく読むよう BOM を付与
  const body = '﻿' + lines.join('\r\n');

  const exportJob = await prisma.exportJob.create({
    data: { tenantId: user.tenantId, requestedById: user.userId, scope: 'leadmap_leads', format: 'csv', status: 'completed', fileKey: null },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'export',
    entityType: 'LocalBusinessLead',
    summary: `リード一覧をCSVエクスポート（${leads.length}件）`,
  });

  // Phase 1-23: 非課金の利用量記録（export が1回発生したという事実のみ）。
  // 課金ではない。billing=usage_only 固定。metadata は非PIIのみ（campaignId 実値・件数・顧客情報・CSV本文は入れない）。
  // 記録失敗は CSV export 本処理を壊さない（recordUsageEvent は例外を投げず ok:false を返すだけ）。
  await recordUsageEvent({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'user',
    eventType: 'export.generated',
    category: 'export',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'ExportJob',
    sourceId: exportJob.id,
    idempotencyKey: `usage:export.generated:${exportJob.id}`,
    metadata: { scope: 'leadmap_leads', format: 'csv', hasCampaignFilter: Boolean(campaignId) },
  });

  const filename = `leadmap-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}
