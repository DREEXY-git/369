'use client';

import { useState, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, EmptyState } from '@/components/ui';
import {
  parseWorkflowInput,
  dryRunWorkflow,
  WORKFLOW_TRIGGERS,
  WORKFLOW_INPUT_LIMITS,
  type WorkflowPlan,
  type DryRunResult,
} from '@hokko/shared';

// Workflow Dry Run のクライアント本体（v7.2 R2・Codex CHANGE_REQUEST_V72_WORKFLOW P2-2）。
// 入力（フロー名・条件・やりたいこと）は **client-local state のみ**で処理し、URL / 履歴 / access log へ
// 業務文を一切残さない（旧 GET フォームは query string に全文が載っていた）。dry-run は純関数
// （parseWorkflowInput / dryRunWorkflow）をブラウザ内で実行するだけで、DB 更新・queue・Server Action・
// 外部送信・実 LLM・課金は行わない。生成はページ側で人間のみに限定（AI は isAi で遮断）。

const STATUS_BADGE: Record<string, { tone: string; label: string }> = {
  SIMULATED: { tone: 'green', label: '仮想実行' },
  REQUIRES_APPROVAL: { tone: 'amber', label: 'REQUIRES_APPROVAL' },
  BLOCKED: { tone: 'red', label: 'BLOCKED' },
  NOT_REACHED: { tone: 'slate', label: '未到達' },
  REQUIRES_HUMAN_REVIEW: { tone: 'amber', label: 'REQUIRES_HUMAN_REVIEW' },
};

function outcomeTone(outcome: DryRunResult['outcome']): string {
  if (outcome === 'completed') return 'green';
  if (outcome === 'blocked') return 'red';
  return 'amber'; // paused_for_approval / needs_human_review
}

export function WorkflowDryRunClient({ isAi }: { isAi: boolean }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<string>('manual');
  const [conditionText, setConditionText] = useState('');
  const [actionsText, setActionsText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [plan, setPlan] = useState<WorkflowPlan | null>(null);
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [aiDenied, setAiDenied] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault(); // URL / 履歴へ入力を載せない（GET 送信しない）
    setErrors([]);
    setPlan(null);
    setResult(null);
    if (isAi) {
      // フロー案の生成は人間のみ（AI の再帰的な自動化設計を作らない）。閲覧・フォーム表示までは可。
      setAiDenied(true);
      return;
    }
    setAiDenied(false);
    const parsed = parseWorkflowInput({ name, trigger, conditionText, actionsText });
    if (parsed.ok) {
      setPlan(parsed.plan);
      setResult(dryRunWorkflow(parsed.plan));
    } else {
      setErrors(parsed.errors);
    }
  }

  return (
    <>
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
          <CardHeader><CardTitle>フローの入力（保存されません・URL にも残りません）</CardTitle></CardHeader>
          <CardContent>
            {/* client-local state のみ・onSubmit は preventDefault で URL へ入力を載せない。 */}
            <form onSubmit={onSubmit} className="space-y-3 text-sm">
              <div>
                <label htmlFor="wf-name" className="mb-1 block text-xs font-medium">フロー名（{WORKFLOW_INPUT_LIMITS.name}文字まで）</label>
                <Input id="wf-name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 新規リードの初動フロー" />
              </div>
              <div>
                <label htmlFor="wf-trigger" className="mb-1 block text-xs font-medium">きっかけ（Trigger・選択式）</label>
                <select
                  id="wf-trigger"
                  name="trigger"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
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
                  value={conditionText}
                  onChange={(e) => setConditionText(e.target.value)}
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
                  value={actionsText}
                  onChange={(e) => setActionsText(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                  placeholder={'例:\nお礼メールの下書きを作成\n顧客へメール送信\n対応内容を台帳に記録'}
                />
              </div>
              <Button type="submit" data-testid="wf-submit">フロー案を作成して Dry Run</Button>
              <p className="text-xs text-muted-foreground">
                実行・保存・外部送信はできません。危険な操作は BLOCKED、人間の承認が必要な操作は
                REQUIRES_APPROVAL、対応表に無い操作は REQUIRES_HUMAN_REVIEW と表示され停止します。
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
                    <Badge tone={outcomeTone(result.outcome)} data-testid="wf-outcome">
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
    </>
  );
}
