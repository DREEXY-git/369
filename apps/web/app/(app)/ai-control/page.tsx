import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Stat, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { getControlPlaneModel } from '@/lib/domains/ai-workforce/control-plane';
import { formatDateTime, AI_WORKFORCE_STATE_LABEL } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// Phase 4 Control Plane（v7.2 Lane C・read-only・roadmap85）。
// AI Native Inbox / Execution Receipt / AI社員別実測を1画面に集約する。実行・承認・削除・外部送信の
// 導線は存在しない（判断は /approvals のみ）。状態は deriveAgentState（一覧・詳細・3D と同じ canonical 値）。
// 設定値（autonomy 等）と実測値（run 集計）と未計測（null）を分離し、推測 ROI・架空成果は表示しない。

export default async function AiControlPlanePage() {
  const user = await requireUser();
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="AI Control Plane"
        reason="AI Control Plane の閲覧にはダッシュボード閲覧権限（dashboard:read）が必要です"
        breadcrumb={[{ label: 'AI Control Plane', href: '/ai-control' }]}
      />
    );
  }
  // 承認由来セクション（Inbox のゲート・Receipt）は承認権限者かつ人間のみ（WIP-5 承認シグナル遮断＋
  // v7.0 R2 AI 閲覧境界と同一規律・取得段階で遮断）。
  const canSeeApprovalSections = hasPermission(user, 'approval', 'approve') && !user.isAi;
  const model = await getControlPlaneModel(user.tenantId, { includeApprovalSections: canSeeApprovalSections });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Control Plane（read-only）"
        description="AI社員の判断待ち・再開待ち・実行結果を証拠から1画面に集約します。この画面から実行・承認・削除はできません（判断は /approvals・詳細は各AI社員ページ）。"
        action={
          <div className="flex items-center gap-3">
            {/* Workflow Dry Run（v7.2 Lane D）: NAV 67 契約は変更せず deep link で導線を張る。 */}
            <Link href="/workflows" className="text-sm text-blue-700 underline" data-testid="cp-workflows-link">
              ワークフロー設計（Dry Run）
            </Link>
            <Link href="/ai-office" className="text-sm text-blue-700 underline">3D オフィスへ</Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5" data-testid="cp-summary">
        <Stat label="AI社員" value={model.workforce.agents.length} />
        <Stat
          label="判断待ちゲート"
          value={model.counts.pendingGates ?? '権限者のみ'}
          tone={model.counts.pendingGates ? 'amber' : 'slate'}
          sub={canSeeApprovalSections ? '判断は /approvals' : '承認権限で表示'}
        />
        <Stat label="承認済み・再開待ち" value={model.counts.queuedResume} tone="blue" sub="実行はまだ行われていません" />
        <Stat label="stale（断定不能）" value={model.counts.staleActive} tone={model.counts.staleActive ? 'amber' : 'slate'} sub="実行中と断定できない記録" />
        <Stat label={`失敗（${model.windowDays}日）`} value={model.counts.failedRecent} tone={model.counts.failedRecent ? 'red' : 'slate'} sub="実測" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card data-testid="cp-inbox">
          <CardHeader><CardTitle>AI Native Inbox（人間の判断・確認が必要な項目）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {model.inbox == null ? (
              <p className="text-xs text-muted-foreground" data-testid="cp-inbox-restricted">
                承認待ち・判断レシートは承認権限者（人間）のみ表示されます（承認シグナルの遮断）。
              </p>
            ) : model.inbox.length === 0 ? (
              <EmptyState title="判断・確認が必要な項目はありません" />
            ) : (
              model.inbox.map((item) => (
                <div key={item.testId} className="rounded-md border p-2.5 text-sm" data-testid={item.testId}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        item.kind === 'pending_gate' ? 'purple'
                        : item.kind === 'queued_resume' ? 'blue'
                        : item.kind === 'failed_recent' ? 'red'
                        : 'amber'
                      }
                    >
                      {item.kind === 'pending_gate' ? '判断待ち'
                        : item.kind === 'queued_resume' ? '再開待ち'
                        : item.kind === 'failed_recent' ? '失敗'
                        : 'stale'}
                    </Badge>
                    {item.stale ? <Badge tone="amber">stale</Badge> : null}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.detail}</div>
                  <div className="mt-1 text-xs">
                    <Link href={item.href} className="text-blue-700 underline">
                      {item.kind === 'pending_gate' ? '承認一覧で判断する' : '対象の AI 社員を開く'}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card data-testid="cp-receipts">
          <CardHeader><CardTitle>Execution Receipt（判断の相関レシート・時系列）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              人間の判断1件ごとに、決定レコード（ApprovalRequest）・監査（AuditLog）・run 記録（AIAgentAction）の
              相関を可視化します。承認は「再開待ち」の記録であり、実行済みではありません。
            </p>
            {model.receipts == null ? (
              <p className="text-xs text-muted-foreground" data-testid="cp-receipts-restricted">
                承認権限者（人間）のみ表示されます。
              </p>
            ) : model.receipts.length === 0 ? (
              <EmptyState title="判断レシートはまだありません" />
            ) : (
              model.receipts.map((r) => (
                <div key={`${r.gateId}-${r.decidedAt?.getTime() ?? 0}`} className="rounded-md border p-2.5 text-sm" data-testid={`cp-receipt-${r.gateId}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.decision === 'approved' ? 'blue' : 'red'}>{r.decision === 'approved' ? '承認' : '却下'}</Badge>
                    {r.staleConfirmed ? <Badge tone="amber">stale を再確認して承認</Badge> : null}
                    <span className="font-medium">{r.action}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{r.decidedAt ? formatDateTime(r.decidedAt) : '時刻記録なし'}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {r.outcomeLabel}／判断者: {r.decidedByName ?? '記録なし'}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    <Badge tone="green">決定レコード ✓</Badge>
                    <Badge tone={r.correlated.audit ? 'green' : 'red'}>監査 {r.correlated.audit ? '✓' : '欠落'}</Badge>
                    {r.decision === 'approved' && r.runId ? (
                      <Badge tone={r.correlated.runAction ? 'green' : 'red'}>run 記録 {r.correlated.runAction ? '✓' : '欠落'}</Badge>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4" data-testid="cp-agent-stats">
        <CardHeader><CardTitle>AI社員別の実測（直近{model.windowDays}日・設定値と実測値を分離）</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-2">AI社員</th>
                  <th className="py-1.5 pr-2">状態（実測・canonical）</th>
                  <th className="py-1.5 pr-2">設定（autonomy）</th>
                  <th className="py-1.5 pr-2">処理</th>
                  <th className="py-1.5 pr-2">成功/失敗</th>
                  <th className="py-1.5 pr-2">再開待ち</th>
                  <th className="py-1.5 pr-2">平均処理時間</th>
                </tr>
              </thead>
              <tbody>
                {model.workforce.agents.map((a) => {
                  const s = model.statsByAgent[a.id];
                  return (
                    <tr key={a.id} className="border-b last:border-0" data-testid={`cp-agent-${a.id}`}>
                      <td className="py-1.5 pr-2">
                        <Link href={`/ai-agents/${a.id}`} className="text-blue-700 underline">{a.name}</Link>
                      </td>
                      {/* 一覧・詳細・3D と同じ canonical ラベル正本（AI_WORKFORCE_STATE_LABEL）を使用。 */}
                      <td className="py-1.5 pr-2" data-agent-state={a.state} data-testid={`cp-agent-state-${a.id}`}>
                        {AI_WORKFORCE_STATE_LABEL[a.state] ?? a.state}
                        {a.stale ? <Badge tone="amber" className="ml-1">stale</Badge> : null}
                      </td>
                      <td className="py-1.5 pr-2 text-xs text-muted-foreground">{a.autonomy}（設定値）</td>
                      <td className="py-1.5 pr-2">{s?.total ?? 0} 件</td>
                      <td className="py-1.5 pr-2">
                        <span className="text-emerald-700">{s?.succeeded ?? 0}</span> / <span className="text-red-700">{s?.failed ?? 0}</span>
                      </td>
                      <td className="py-1.5 pr-2">{s?.queuedWaitingResume ?? 0} 件</td>
                      <td className="py-1.5 pr-2" data-testid={`cp-agent-avg-${a.id}`}>
                        {s?.avgDurationMinutes != null ? `${s.avgDurationMinutes} 分（実測 ${s.measuredCount} 件）` : '未計測'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            処理時間は開始・終了の両方が記録された終了済み run のみの実測です。記録が無いものは「未計測」と
            表示し、推測値・削減時間・金額換算は表示しません。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
