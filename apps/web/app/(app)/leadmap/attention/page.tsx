import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Stat, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { LEAD_STAGE_LABEL } from '@/components/badges';
import {
  LEAD_STALL_BUCKETS,
  LEAD_STALL_BUCKET_LABEL,
  LEAD_STALL_THRESHOLD_DAYS,
  stagesForLeadStallBucket,
  leadStallCutoff,
  classifyLeadStall,
  formatDate,
  type LeadStallBucket,
  type LeadStage,
} from '@hokko/shared';

export const dynamic = 'force-dynamic';

// 取りこぼし検知ボード（LeadMap 中核・薄い縦切り）: アクティブなリードを「今どの段階で止まっているか」で
// 4バケットに分け、最終活動（lastContactAt ?? updatedAt）から一定日数 動きが無い＝要対応 を炙り出す。
// 追客ボード（送信後の未反応のみ）を補完し、①返信後放置 ②送信後未反応 ③下書き未送信（承認漏れ）④未着手 の
// 取りこぼしを1画面に。schema 変更なし（既存 stage/priority/updatedAt/lastContactAt を read するだけ）。権限は leadmap:read。

const BUCKET_TONE: Record<LeadStallBucket, string> = {
  hot_cooling: 'red',
  awaiting_response: 'amber',
  draft_pending: 'purple',
  unworked: 'slate',
};

const BUCKET_HINT: Record<LeadStallBucket, string> = {
  hot_cooling: '返信・商談まで進んだのに動きが止まっています。最優先で連絡を。',
  awaiting_response: '送信したまま反応がありません。追客メールや電話で一押しを。',
  draft_pending: 'AIが下書きしたのに送っていません。承認・送信の取りこぼしです。',
  unworked: '抽出したまま着手していません。AI分析→下書きへ進めましょう。',
};

const LIST_PER_BUCKET = 12;

export default async function LeadAttentionPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'leadmap', 'read')) {
    return (
      <AccessDenied
        title="取りこぼし検知"
        reason="リードの閲覧にはリードマップの閲覧権限（leadmap:read）が必要です"
        breadcrumb={[{ label: 'リードマップAI', href: '/leadmap/leads' }]}
      />
    );
  }

  const now = new Date();
  const t = user.tenantId;

  // 各バケットの「放置」条件（stage ∈ バケット and 最終活動 < cutoff）で件数＋上位リストを取得。
  // 最終活動 = lastContactAt があればそれ、無ければ updatedAt（= classifyLeadStall と同じ規律）。
  const buckets = await Promise.all(
    LEAD_STALL_BUCKETS.map(async (bucket) => {
      const stages = stagesForLeadStallBucket(bucket) as LeadStage[];
      const cutoff = leadStallCutoff(now, bucket);
      const where = {
        tenantId: t,
        stage: { in: stages },
        OR: [{ lastContactAt: { lt: cutoff } }, { lastContactAt: null, updatedAt: { lt: cutoff } }],
      };
      const [count, leads] = await Promise.all([
        prisma.localBusinessLead.count({ where }),
        prisma.localBusinessLead.findMany({
          where,
          orderBy: [{ priority: 'desc' }, { lastContactAt: 'asc' }, { updatedAt: 'asc' }],
          take: LIST_PER_BUCKET,
          select: { id: true, name: true, industry: true, city: true, stage: true, priority: true, updatedAt: true, lastContactAt: true },
        }),
      ]);
      return { bucket, count, leads };
    }),
  );
  const totalStale = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div>
      <PageHeader
        title="取りこぼし検知"
        description="連絡が止まっているリードを「返信後・送信後・下書き未送信・未着手」に分けて炙り出します。放置＝せっかくの見込み客の取りこぼしです。"
        breadcrumb={[{ label: 'リードマップAI', href: '/leadmap/leads' }, { label: '取りこぼし検知', href: '/leadmap/attention' }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/leadmap/followup" className="text-primary underline">← 追客ボード（送信後の追客）へ</Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {buckets.map((b) => (
          <Stat
            key={b.bucket}
            label={LEAD_STALL_BUCKET_LABEL[b.bucket]}
            value={`${b.count}件`}
            sub={`${LEAD_STALL_THRESHOLD_DAYS[b.bucket]}日以上 動きなし`}
            tone={b.count > 0 ? BUCKET_TONE[b.bucket] : 'emerald'}
          />
        ))}
      </div>

      {totalStale === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="取りこぼしのリードはありません"
              hint="すべてのアクティブなリードが最近 動いています。この調子で送信・追客・商談化を進めましょう。"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {buckets.filter((b) => b.count > 0).map((b) => (
            <Card key={b.bucket}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Badge tone={BUCKET_TONE[b.bucket]}>{LEAD_STALL_BUCKET_LABEL[b.bucket]}</Badge>
                  <span className="text-sm font-normal text-muted-foreground">{b.count}件</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{BUCKET_HINT[b.bucket]}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {b.leads.map((l) => {
                  const meta = LEAD_STAGE_LABEL[l.stage];
                  const staleDays = classifyLeadStall({ stage: l.stage, updatedAt: l.updatedAt, lastContactAt: l.lastContactAt }, now)?.staleDays ?? null;
                  return (
                    <div key={l.id} className="flex flex-col gap-1 rounded-md border p-2 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/leadmap/leads/${l.id}`} className="truncate font-medium hover:underline">{l.name}</Link>
                          <Badge tone={meta.tone}>{meta.text}</Badge>
                          <span className="text-xs text-muted-foreground">優先度 {l.priority}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {l.industry}{l.city ? `・${l.city}` : ''}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        <Badge tone={BUCKET_TONE[b.bucket]}>{staleDays != null ? `${staleDays}日放置` : '放置'}</Badge>
                        <span className="text-muted-foreground">最終: {l.lastContactAt ? formatDate(l.lastContactAt) : `更新 ${formatDate(l.updatedAt)}`}</span>
                      </div>
                    </div>
                  );
                })}
                {b.count > b.leads.length ? (
                  <p className="pt-1 text-xs text-muted-foreground">ほか {b.count - b.leads.length}件（優先度の高い順に{LIST_PER_BUCKET}件を表示）。<Link href="/leadmap/leads" className="text-primary underline">リード一覧</Link>で確認できます。</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
