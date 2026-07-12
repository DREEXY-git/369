import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import {
  parseWorkflowInput,
  dryRunWorkflow,
  WORKFLOW_TRIGGERS,
  WORKFLOW_INPUT_LIMITS,
  type WorkflowPlan,
  type DryRunResult,
} from '@hokko/shared';

export const dynamic = 'force-dynamic';

// Workflow Dry Run（v7.2 Lane D・read-only・roadmap86）。
// 入力（フォーム/自然言語）から業務フロー案を決定論的に組み立て、dry-run（仮想実行）の結果だけを表示する。
// **GET のみで完結し、DB 更新・queue enqueue・Server Action 実行・外部送信・実 LLM・課金は一切行わない**
// （このページに変更系 action は存在しない）。危険 Action は必ず BLOCKED、人間承認 Action は
// REQUIRES_APPROVAL で停止表示（承認なしで先へ進む仮想結果を作らない）。

const STATUS_BADGE: Record<string, { tone: string; label: string }> = {
  SIMULATED: { tone: 'green', label: '仮想実行' },
  REQUIRES_APPROVAL: { tone: 'amber', label: 'REQUIRES_APPROVAL' },
  BLOCKED: { tone: 'red', label: 'BLOCKED' },
  NOT_REACHED: { tone: 'slate', label: '未到達' },
  SKIPPED_UNRECOGNIZED: { tone: 'slate', label: '対象外' },
};

export default async function WorkflowDryRunPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="ワークフロー設計（Dry Run）"
        reason="ワークフロー設計の閲覧にはダッシュボード閲覧権限（dashboard:read）が必要です"
        breadcrumb={[{ label: 'ワークフロー', href: '/workflows' }]}
      />
    );
  }
  const sp = (await searchParams) ?? {};
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const submitted = Boolean(get('name') || get('actionsText'));

  let errors: string[] = [];
  let plan: WorkflowPlan | null = null;
  let result: DryRunResult | null = null;
  let aiDenied = false;
  if (submitted) {
    if (user.isAi) {
      // フロー案の生成は人間のみ（AI の再帰的な自動化設計を作らない）。閲覧・フォーム表示までは可。
      aiDenied = true;
    } else {
      const parsed = parseWorkflowInput({
        name: get('name'),
        trigger: get('trigger') || 'manual',
        conditionText: get('conditionText'),
        actionsText: get('actionsText'),
      });
      if (parsed.ok) {
        plan = parsed.plan;
        result = dryRunWorkflow(parsed.plan);
      } else {
        errors = parsed.errors;
      }
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="ワークフロー設計（Dry Run・read-only）"
        description="やりたい業務フローを入力すると、Trigger・条件・Action・承認ステップ・リスクの案と仮想実行（dry-run）の結果を表示します。実際の実行・保存・外部送信は一切行いません。"
      />

      {aiDenied ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900" data-testid="wf-ai-denied">
          AI ロールはフロー案の生成を実行できません（閲覧のみ・生成は人間のみ）。
        </div>
      ) : null}
      {errors.length > 0 ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="wf-errors">
          <ul className="list-inside list-disc">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card data-testid="wf-form">
          <CardHeader><CardTitle>フローの入力（保存されません）</CardTitle></CardHeader>
          <CardContent>
            {/* GET フォーム＝URL だけで完結する純表示。変更系 Server Action は存在しない。 */}
            <form method="get" action="/workflows" className="space-y-3 text-sm">
              <div>
                <label htmlFor="wf-name" className="mb-1 block text-xs font-medium">フロー名（{WORKFLOW_INPUT_LIMITS.name}文字まで）</label>
                <Input id="wf-name" name="name" defaultValue={get('name')} placeholder="例: 新規リードの初動フロー" />
              </div>
              <div>
                <label htmlFor="wf-trigger" className="mb-1 block text-xs font-medium">きっかけ（Trigger・選択式）</label>
                <select
                  id="wf-trigger"
                  name="trigger"
                  defaultValue={get('trigger') || 'manual'}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {WORKFLOW_TRIGGERS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="wf-condition" className="mb-1 block text-xs font-medium">条件（任意・1行1条件・{WORKFLOW_INPUT_LIMITS.conditionText}文字まで）</label>
                <textarea
                  id="wf-condition"
                  name="conditionText"
                  defaultValue={get('conditionText')}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                  placeholder="例: 金額が10万円以上"
                />
              </div>
              <div>
                <label htmlFor="wf-actions" className="mb-1 block text-xs font-medium">
                  やりたいこと（1行1ステップ・{WORKFLOW_INPUT_LIMITS.maxSteps}行/{WORKFLOW_INPUT_LIMITS.actionsText}文字まで）
                </label>
                <textarea
                  id="wf-actions"
                  name="actionsText"
                  defaultValue={get('actionsText')}
                  rows={5}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                  placeholder={'例:\nお礼メールの下書きを作成\n顧客へメール送信\n対応内容を台帳に記録'}
                />
              </div>
              <Button type="submit" data-testid="wf-submit">フロー案を作成して Dry Run</Button>
              <p className="text-xs text-muted-foreground">
                実行・保存・外部送信はできません。危険な操作は BLOCKED、人間の承認が必要な操作は
                REQUIRES_APPROVAL と表示されます。
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card data-testid="wf-plan">
            <CardHeader><CardTitle>フロー案（Trigger / Condition / Action / Approval / Risk）</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!plan ? (
                <EmptyState title="フロー案はまだありません" hint="左のフォームに入力して Dry Run を実行してください。" />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">Trigger</Badge>
                    <span>{plan.trigger.label}</span>
                  </div>
                  {plan.conditions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="slate">Condition</Badge>
                      <span className="text-xs text-muted-foreground">{plan.conditions.join(' ／ ')}</span>
                    </div>
                  ) : null}
                  {plan.steps.map((s) => (
                    <div key={s.index} className="rounded-md border p-2.5" data-testid={`wf-step-${s.index}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={s.classification === 'BLOCKED' ? 'red' : s.classification === 'REQUIRES_APPROVAL' ? 'amber' : s.classification === 'UNRECOGNIZED' ? 'slate' : 'green'}>
                          {s.classification}
                        </Badge>
                        <Badge tone="slate">risk: {s.risk}</Badge>
                        <span className="font-medium">{s.actionLabel}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">入力: {s.sourceLine}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{s.reason}</div>
                      {s.approvalStep ? (
                        <div className="mt-1 text-xs text-amber-800" data-testid={`wf-approval-step-${s.index}`}>
                          ここに人間の承認ステップ（/approvals）が挿入されます。
                        </div>
                      ) : null}
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="wf-dryrun">
            <CardHeader><CardTitle>Dry Run 結果（仮想実行のみ）</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!result ? (
                <EmptyState title="Dry Run 結果はまだありません" />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={result.outcome === 'completed' ? 'green' : result.outcome === 'paused_for_approval' ? 'amber' : 'red'} data-testid="wf-outcome">
                      {result.outcome}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{result.summary}</span>
                  </div>
                  {result.steps.map((s) => (
                    <div key={s.index} className="flex flex-wrap items-center gap-2 rounded-md border p-2" data-testid={`wf-result-${s.index}`}>
                      <Badge tone={STATUS_BADGE[s.status]?.tone ?? 'slate'}>{STATUS_BADGE[s.status]?.label ?? s.status}</Badge>
                      <span>{s.actionLabel}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{s.note}</span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
