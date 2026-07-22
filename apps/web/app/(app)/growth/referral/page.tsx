import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';
import {
  REFERRAL_CHANNELS,
  classifyReferralSource,
  buildReferralDraft,
  REFERRAL_PR_DISCLOSURE,
  type ReferralCandidate,
} from '@hokko/shared';

export const dynamic = 'force-dynamic';

// C22 Growth Channels — 紹介・リファラルの read-only 分析（v7.2 Lane B・roadmap76/83 §4・schema-free）。
// 候補の算出と決定論的 Fake 下書きの内部プレビューまで。外部招待・紹介メール送信・報酬付与・支払・公開・
// 実 LLM・外部 API・schema 変更は一切行わない（すべて封印中・人間 Gate）。
// PII 最小化: 判定は非 PII 射影のみ・下書きはプレースホルダ差し込み（実名を本文へ複製しない）・
// DataAccessLog は metadata-only。顧客名の表示は customer:read 保持者のみ（fail-closed）。

const CUID_RE = /^c[a-z0-9]{20,32}$/i;
// 「成約以降」とみなす Deal stage（DealStage に WON は無いため契約以降の実測 stage で判定）。
const CLOSED_WON_STAGES = ['CONTRACT', 'DELIVERY', 'INVOICE', 'FOLLOW_UP'] as const;

export default async function ReferralPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'read')) {
    return (
      <AccessDenied
        title="紹介・リファラル分析"
        reason="紹介チャネル分析の閲覧にはマーケティング閲覧権限（marketing:read）が必要です"
        breadcrumb={[{ label: '紹介・リファラル', href: '/growth/referral' }]}
      />
    );
  }
  const sp = (await searchParams) ?? {};
  const previewParam = typeof sp.preview === 'string' ? sp.preview : '';
  // 顧客名の表示は customer:read 保持者のみ（marketing:read だけでは名前を新規開示しない・PII 経路を増やさない）。
  const canReadCustomerNames = hasPermission(user, 'customer', 'read');

  // tenant スコープ＋可視ラベル（fail-closed）で最小 select（連絡先・住所・notes は取得しない）。
  // v7.2 R2（Codex CHANGE_REQUEST_V72_C22 P2-1）: 顧客名は取得段階で customer:read 保持者のみに限定する
  // （描画時に伏せるのではなく DB から取得しない）。marketing:read だけでは name を新規開示しない。
  const customers = await prisma.customer.findMany({
    where: { tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
    select: {
      id: true,
      name: canReadCustomerNames, // 取得段階ゲート（false のとき DB は name を返さない）
      rank: true,
      status: true,
      satisfaction: true,
      churnRisk: true,
      lastContactAt: true,
      label: true,
      deals: { select: { stage: true } },
    },
    orderBy: [{ rank: 'asc' }, { updatedAt: 'desc' }],
    take: 50,
  });
  const now = new Date();
  const NAME_REDACTED = '（顧客名は customer:read 権限で表示）';
  const classified = customers.map((c) => ({
    name: canReadCustomerNames ? ((c as { name?: string }).name ?? NAME_REDACTED) : NAME_REDACTED,
    label: c.label,
    result: classifyReferralSource(
      {
        customerId: c.id,
        rank: c.rank,
        status: c.status,
        satisfaction: c.satisfaction,
        churnRisk: c.churnRisk,
        wonDeals: c.deals.filter((d) => (CLOSED_WON_STAGES as readonly string[]).includes(d.stage)).length,
        lastContactAt: c.lastContactAt,
      },
      now,
    ),
  }));
  const candidates = classified
    .filter((c) => c.result.eligible)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, 8);

  // v7.2 R2（Codex CHANGE_REQUEST_V72_C22 P2-3）: 候補一覧は satisfaction / churnRisk / 成約実績（機密射影）を
  // 読んで理由・注意表示に使うため、一覧閲覧自体を metadata-only で監査する（名前・本文・sentinel は入れない）。
  if (customers.length > 0) {
    await writeDataAccess({
      tenantId: user.tenantId,
      actorId: user.userId,
      // 候補一覧は AI ロールも閲覧できる（下書きプレビューのみ人間限定）。責任主体を固定 'user' にすると
      // AI 閲覧が人間の記録として残る。既存作法（lib/security/policy.ts）に合わせ isAi で分岐する。
      actorType: user.isAi ? 'ai_agent' : 'user',
      entityType: 'ReferralAnalysis',
      action: 'read',
      label: 'INTERNAL',
      purpose: 'referral_candidate_list',
      metadata: {
        scanned: customers.length,
        candidates: candidates.length,
        fields: ['rank', 'status', 'satisfaction', 'churnRisk', 'wonDeals'],
        namesDisclosed: canReadCustomerNames,
      },
    });
  }

  // 下書きプレビュー（内部専用・read-only・外部送信不可）。生成は人間のみ（AI ロールは拒否）。
  let preview: { customerId: string; displayName: string; channel: 'referral' | 'business_network'; draft: { subject: string; body: string } } | null = null;
  let previewDenied = false;
  let previewNotFound = false;
  if (previewParam) {
    if (user.isAi) {
      previewDenied = true; // AI は下書きプレビューを生成できない（閲覧分析までは可）
    } else if (!CUID_RE.test(previewParam)) {
      previewNotFound = true;
    } else {
      const hit = classified.find((c) => c.result.customerId === previewParam);
      if (!hit) {
        previewNotFound = true; // 不存在・別 tenant・不可視ラベルは同一応答（存在シグナルなし）
      } else {
        // 機密参照の記録（metadata-only・顧客名/連絡先/下書き本文は記録しない）。
        await writeDataAccess({
          tenantId: user.tenantId,
          actorId: user.userId,
          // このプレビュー分岐は人間のみ到達（AI は上流で previewDenied）だが、責任主体の記録作法を
          // 一覧側と統一しておく（将来 AI 到達経路が増えても誤帰属しない・fail-safe）。
          actorType: user.isAi ? 'ai_agent' : 'user',
          entityType: 'Customer',
          entityId: hit.result.customerId,
          label: hit.label,
          action: 'read',
          purpose: 'referral_draft_preview',
          metadata: { fields: ['rank', 'status', 'wonDeals'], channel: hit.result.suggestedChannel },
        });
        preview = {
          customerId: hit.result.customerId,
          displayName: hit.name, // 取得段階で redaction 済み（customer:read 保持者のみ実名）
          channel: hit.result.suggestedChannel,
          draft: buildReferralDraft(hit.result.suggestedChannel),
        };
      }
    }
  }

  const candidateCountByChannel = new Map<string, number>();
  for (const c of candidates) {
    candidateCountByChannel.set(c.result.suggestedChannel, (candidateCountByChannel.get(c.result.suggestedChannel) ?? 0) + 1);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="紹介・リファラル分析（read-only）"
        description="既存の顧客・成約データから紹介元候補を分析します。候補の算出と下書きプレビューまでで、紹介依頼の送信・報酬の付与・外部連携はすべて封印中です（人間の承認 Gate）。"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/growth/referral/records" className="text-primary underline" data-testid="referral-records-link">→ 受けた紹介の記録・追跡（受領→商談→成約）へ</Link>
      </div>

      {previewDenied ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900" data-testid="referral-preview-denied">
          AI ロールは下書きプレビューを生成できません（閲覧分析までは可能です・生成は人間のみ）。
        </div>
      ) : null}
      {previewNotFound ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="referral-preview-notfound">
          指定された候補は見つかりませんでした（対象外・権限外・または既に候補ではありません）。
        </div>
      ) : null}

      <Card className="mb-4" data-testid="referral-channel-board">
        <CardHeader><CardTitle>紹介系チャネルの状態（外部運用はすべて封印中）</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REFERRAL_CHANNELS.map((ch) => (
              <div key={ch.key} className="rounded-md border p-3" data-testid={`referral-channel-${ch.key}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{ch.label}</span>
                  <Badge tone="slate">封印中</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{ch.description}</p>
                <div className="mt-2 text-xs">
                  {ch.dataSource === 'internal' ? (
                    <span>候補 {candidateCountByChannel.get(ch.key) ?? 0} 件（実測由来・確定は人間）</span>
                  ) : (
                    <span className="text-muted-foreground">対象データなし（外部連携が封印中のため候補 0 件が正しい表示です）</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4" data-testid="referral-candidates">
        <CardHeader><CardTitle>紹介元候補（実測由来・候補まで）</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            成約実績のある active 顧客から決定論的に算出した候補です。満足度・解約リスクが未計測の場合は
            未計測として明示し、推測の成果・ROI は表示しません。候補の確定・紹介依頼の送信は人間の判断と
            既存の承認導線が必要です。
          </p>
          {candidates.length === 0 ? (
            <div data-testid="referral-empty">
              <EmptyState
                title="紹介元候補はまだありません"
                hint="成約実績（契約以降の商談）を持つ active 顧客が対象になります。"
              />
            </div>
          ) : (
            candidates.map(({ name, result }) => (
              <CandidateRow
                key={result.customerId}
                name={name}
                candidate={result}
                showPreviewLink={!user.isAi}
                showCustomerLink={canReadCustomerNames}
              />
            ))
          )}
        </CardContent>
      </Card>

      {preview ? (
        <Card className="mb-4" id="draft-preview" data-testid="referral-preview">
          <CardHeader><CardTitle>紹介依頼文の下書きプレビュー（内部専用・送信不可）</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="purple">Fake 下書き</Badge>
              <Badge tone="slate">外部送信 封印中</Badge>
              <span className="text-xs text-muted-foreground">
                対象: {preview.displayName}（チャネル: {preview.channel === 'business_network' ? 'ビジネスネットワーク' : '顧客紹介'}）
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              実名・連絡先は本文へ複製せず、送付時の差し込みプレースホルダ（{'{お客様名}'} 等）のまま表示しています。
              送信する場合は既存の営業メール承認導線（人間承認必須）だけが経路です。この画面から送信はできません。
            </p>
            <div className="rounded-md border bg-secondary/40 p-3">
              <div className="font-medium">件名: {preview.draft.subject}</div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed" data-testid="referral-preview-body">{preview.draft.body}</pre>
            </div>
            <p className="text-xs text-amber-800" data-testid="referral-pr-note">
              PR 表記「{REFERRAL_PR_DISCLOSURE}」は削除できない固定文言です（ステマ防止・roadmap76 §3）。
            </p>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        本画面は read-only です。紹介コードの発行・報酬の確定・アフィリエイト/クリエイター連携は schema と外部
        連携の人間承認（`SCHEMA_CHANGE_APPROVAL_REQUIRED` ほか）が完了するまで実装されません。
      </p>
    </div>
  );
}

function CandidateRow({
  name,
  candidate,
  showPreviewLink,
  showCustomerLink,
}: {
  name: string;
  candidate: ReferralCandidate;
  showPreviewLink: boolean;
  /** 顧客詳細（PII を含む画面）への導線は customer:read 保持者のみ（P2-1・取得段階遮断と一致）。 */
  showCustomerLink: boolean;
}) {
  return (
    <div className="rounded-md border p-3" id={`candidate-${candidate.customerId}`} data-testid={`referral-candidate-${candidate.customerId}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{name}</span>
        <Badge tone={candidate.suggestedChannel === 'business_network' ? 'blue' : 'green'}>
          {candidate.suggestedChannel === 'business_network' ? 'ビジネスネットワーク候補' : '顧客紹介候補'}
        </Badge>
        <Badge tone="slate">score {candidate.score}</Badge>
      </div>
      <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
        {candidate.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {candidate.cautionFlags.length > 0 ? (
        <ul className="mt-1 list-inside list-disc text-xs text-amber-800">
          {candidate.cautionFlags.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        {showCustomerLink ? (
          <Link href={`/customers/${candidate.customerId}`} className="text-blue-700 underline" data-testid={`referral-customer-link-${candidate.customerId}`}>
            顧客詳細を開く
          </Link>
        ) : null}
        {showPreviewLink ? (
          <Link
            href={`/growth/referral?preview=${candidate.customerId}#draft-preview`}
            className="text-blue-700 underline"
            data-testid={`referral-preview-link-${candidate.customerId}`}
          >
            下書きプレビュー（送信不可）
          </Link>
        ) : null}
      </div>
    </div>
  );
}
