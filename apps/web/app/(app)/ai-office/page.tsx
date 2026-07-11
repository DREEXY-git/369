import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { AccessDenied } from '@/components/access-denied';
import { getAiWorkforceReadModel } from '@/lib/domains/ai-workforce/read-model';
import { getHumanWorkInboxReadModel } from '@/lib/domains/ai-workforce/inbox';
import { getOutcomeLedgerReadModel } from '@/lib/domains/ai-workforce/outcomes';
import { AiOffice } from '@/components/ai-office/ai-office';
import { Badge } from '@/components/ui';
import { OUTCOME_EVIDENCE_LABEL } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// AI Work Evidence Cockpit（Phase 4 Stream C1・roadmap75）。
// タブ = 3D オフィス / 人間の作業インボックス / 成果台帳。すべて read-only 可視化のみで、
// 実行・承認・削除・外部送信の導線は本画面に存在しない（Inbox は deep link のみ）。
// 状態・成果は証拠から導出し、証拠がなければ「計測なし」と表示する（捏造しない）。

const TABS = [
  { key: 'office', label: '3Dオフィス' },
  { key: 'inbox', label: '人間の作業インボックス' },
  { key: 'outcomes', label: '成果台帳' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default async function AiOfficePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; agent?: string }>;
}) {
  const user = await requireUser();
  // ページ基礎権限: 経営運用の可視化として dashboard:read（/growth・/dashboard と同一規約）。
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="3D バーチャルオフィス"
        reason="この画面の閲覧にはダッシュボードの閲覧権限（dashboard:read）が必要です"
      />
    );
  }
  const sp = await searchParams;
  const tab: TabKey = sp.tab === 'inbox' || sp.tab === 'outcomes' ? sp.tab : 'office';

  // 権限で内容が変わるのは Inbox の承認案件（approval:approve・/approvals ゲートと同一条件）と
  // 成果台帳の財務行（finance:read）。判定はサーバーで行い、取得段階から遮断する。
  const canViewApprovals = hasPermission(user, 'approval', 'approve');
  const canViewFinance = hasPermission(user, 'finance', 'read');

  // タブごとに必要な read model だけを1回取得する。
  let generatedAtLabel: string;
  let content: React.ReactNode;
  if (tab === 'office') {
    const m = await getAiWorkforceReadModel(user.tenantId);
    generatedAtLabel = m.generatedAtLabel;
    // /ai-agents からの deep link（?agent=<id>）で初期選択する。存在しない/別テナント id は
    // read model に無いので無視され、AiOffice 側の既定（先頭選択）にフォールバックする（存在を漏らさない）。
    const initialAgentId = sp.agent && m.agents.some((a) => a.id === sp.agent) ? sp.agent : null;
    content = <AiOffice model={m} initialAgentId={initialAgentId} />;
  } else if (tab === 'inbox') {
    const m = await getHumanWorkInboxReadModel(user.tenantId, { canViewApprovals });
    generatedAtLabel = m.generatedAtLabel;
    content = <InboxView model={m} />;
  } else {
    const m = await getOutcomeLedgerReadModel(user.tenantId, { includeFinance: canViewFinance });
    generatedAtLabel = m.generatedAtLabel;
    content = <OutcomesView model={m} />;
  }

  return (
    <div>
      <PageHeader
        title="3D バーチャルオフィス（AI社員・read-only）"
        description="AI社員の稼働・人間の作業・成果を証拠から可視化します。この画面から実行・承認・削除は行えません。"
        action={<Badge tone="slate">データ基準: {generatedAtLabel} UTC</Badge>}
      />

      {/* タブ（サーバー側で内容を切替・リンク遷移のみ） */}
      <div className="mb-4 flex flex-wrap gap-1.5" data-testid="ai-office-tabs">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'office' ? '/ai-office' : `/ai-office?tab=${t.key}`}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              tab === t.key
                ? 'border-indigo-500 bg-indigo-500/10 font-medium text-indigo-600 dark:text-indigo-300'
                : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
            aria-current={tab === t.key ? 'page' : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {content}
    </div>
  );
}

function InboxView({ model }: { model: Awaited<ReturnType<typeof getHumanWorkInboxReadModel>> }) {
  return (
    <div className="space-y-3" data-testid="human-work-inbox">
      <div className="rounded-md border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        人間がやるべきことの一覧です。この画面では実行できません（各項目のリンク先で判断・操作します）。
      </div>
      {model.items.length === 0 ? (
        <div className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
          現在、人間の対応が必要な項目はありません。
        </div>
      ) : (
        model.items.map((item) => (
          <div key={item.key} className="rounded-md border p-3" data-testid={`inbox-item-${item.key}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{item.title}</div>
              <Badge tone={item.count > 0 ? 'amber' : 'slate'}>{item.count}件</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            <Link href={item.href} className="mt-2 inline-block text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300">
              {item.linkLabel} →
            </Link>
          </div>
        ))
      )}
    </div>
  );
}

function OutcomesView({ model }: { model: Awaited<ReturnType<typeof getOutcomeLedgerReadModel>> }) {
  return (
    <div className="space-y-3" data-testid="outcome-ledger">
      <div className="rounded-md border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        成果はすべて証拠区分付きで表示します（実測/自己申告/推定/未検証/計測なし）。根拠のない値は表示しません。
        集計期間: {model.periodLabel}。
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">項目</th>
              <th className="px-3 py-2">値</th>
              <th className="px-3 py-2">証拠区分</th>
              <th className="px-3 py-2">証拠元・注記</th>
            </tr>
          </thead>
          <tbody>
            {model.entries.map((e) => (
              <tr key={e.key} className="border-b last:border-0 align-top" data-testid={`outcome-${e.key}`}>
                <td className="px-3 py-2 font-medium">{e.label}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {e.value == null ? <span className="text-muted-foreground">—</span> : `${e.value} ${e.unit}`}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Badge tone={e.evidenceClass === 'measured' ? 'green' : e.evidenceClass === 'unavailable' ? 'slate' : 'amber'}>
                    {OUTCOME_EVIDENCE_LABEL[e.evidenceClass]}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  <div>{e.evidenceSource}</div>
                  <div>{e.periodLabel}・{e.denominatorNote}</div>
                  {e.confidence != null ? <div>信頼度: {e.confidence}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
