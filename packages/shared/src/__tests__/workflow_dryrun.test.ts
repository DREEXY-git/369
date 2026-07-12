import { describe, expect, it } from 'vitest';
import {
  parseWorkflowInput,
  dryRunWorkflow,
  WORKFLOW_INPUT_LIMITS,
  WORKFLOW_ACTION_CATALOG,
} from '../workflow-dryrun';

// Workflow Dry Run（v7.2 Lane D）の純ロジック契約。
// 決定論・allowlist・危険 Action は必ず BLOCKED・承認 Action は REQUIRES_APPROVAL で停止・
// サイズ上限・malformed 拒否・巨大入力でも高速（timeout 相当の性能境界）。

const BASE = { name: 'テストフロー', trigger: 'lead_created', conditionText: '', actionsText: '下書きを作成' };

function plan(actionsText: string, over: Partial<typeof BASE> = {}) {
  const r = parseWorkflowInput({ ...BASE, actionsText, ...over });
  if (!r.ok) throw new Error(`parse failed: ${r.errors.join()}`);
  return r.plan;
}

describe('parseWorkflowInput — Zod 検証・allowlist・上限', () => {
  it('malformed（空名・不正 trigger・空アクション）は型付きエラーで拒否', () => {
    expect(parseWorkflowInput({ name: '', trigger: 'lead_created', conditionText: '', actionsText: 'x' }).ok).toBe(false);
    expect(parseWorkflowInput({ name: 'a', trigger: 'evil_trigger', conditionText: '', actionsText: 'x' }).ok).toBe(false);
    expect(parseWorkflowInput({ name: 'a', trigger: 'manual', conditionText: '', actionsText: '   ' }).ok).toBe(false);
    expect(parseWorkflowInput(null).ok).toBe(false);
    expect(parseWorkflowInput({ name: 123, trigger: 'manual', actionsText: [] }).ok).toBe(false);
  });

  it('サイズ上限: name/condition/actions の超過とステップ数超過を黙って切り詰めず拒否', () => {
    expect(parseWorkflowInput({ ...BASE, name: 'あ'.repeat(WORKFLOW_INPUT_LIMITS.name + 1) }).ok).toBe(false);
    expect(parseWorkflowInput({ ...BASE, conditionText: 'あ'.repeat(WORKFLOW_INPUT_LIMITS.conditionText + 1) }).ok).toBe(false);
    expect(parseWorkflowInput({ ...BASE, actionsText: 'あ'.repeat(WORKFLOW_INPUT_LIMITS.actionsText + 1) }).ok).toBe(false);
    const tooMany = Array.from({ length: WORKFLOW_INPUT_LIMITS.maxSteps + 1 }, (_, i) => `記録 ${i}`).join('\n');
    const r = parseWorkflowInput({ ...BASE, actionsText: tooMany });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain(`${WORKFLOW_INPUT_LIMITS.maxSteps}行まで`);
  });

  it('allowlist に無い操作は UNRECOGNIZED（推測で実行可能と表示しない）', () => {
    const p = plan('謎の外部システムを操作する');
    expect(p.steps[0]!.classification).toBe('UNRECOGNIZED');
    expect(p.steps[0]!.risk).toBe('UNKNOWN');
    expect(p.steps[0]!.actionKey).toBeNull();
  });

  it('危険キーワード（支払/削除/予算/公開）は緩い語より先勝ちで BLOCKED に分類される', () => {
    // 「支払のメールを送信」— 送信(REQUIRES_APPROVAL) より 支払(BLOCKED) が先に評価される。
    const p = plan('支払のメールを送信する');
    expect(p.steps[0]!.actionKey).toBe('payment_execute');
    expect(p.steps[0]!.classification).toBe('BLOCKED');
    for (const kw of ['データを削除', '広告予算を増額', 'SNSに公開']) {
      expect(plan(kw).steps[0]!.classification, kw).toBe('BLOCKED');
    }
  });

  it('決定論: 同一入力は常に同一プラン', () => {
    const text = '下書きを作成\n顧客へメール送信\n台帳に記録';
    expect(plan(text)).toEqual(plan(text));
  });

  it('trigger は allowlist ラベルへ解決・条件は行分割される', () => {
    const p = plan('記録する', { trigger: 'invoice_overdue', conditionText: '金額が10万円以上\n担当が営業部' });
    expect(p.trigger.label).toContain('入金期日');
    expect(p.conditions).toEqual(['金額が10万円以上', '担当が営業部']);
  });
});

describe('dryRunWorkflow — 外部作用ゼロの仮想実行', () => {
  it('内部 Action のみなら completed（すべて SIMULATED・実行はしていない旨を明記）', () => {
    const r = dryRunWorkflow(plan('下書きを作成\n台帳に記録\n担当へタスク割当'));
    expect(r.outcome).toBe('completed');
    expect(r.steps.every((s) => s.status === 'SIMULATED')).toBe(true);
    expect(r.steps[0]!.note).toContain('実際には何も実行していません');
  });

  it('人間承認 Action で必ず停止し、以降は NOT_REACHED（承認なしで進む結果を作らない）', () => {
    const r = dryRunWorkflow(plan('下書きを作成\n顧客へメール送信\n台帳に記録'));
    expect(r.outcome).toBe('paused_for_approval');
    expect(r.steps.map((s) => s.status)).toEqual(['SIMULATED', 'REQUIRES_APPROVAL', 'NOT_REACHED']);
  });

  it('危険 Action は必ず BLOCKED で停止', () => {
    const r = dryRunWorkflow(plan('台帳に記録\nデータを削除\n通知する'));
    expect(r.outcome).toBe('blocked');
    expect(r.steps.map((s) => s.status)).toEqual(['SIMULATED', 'BLOCKED', 'NOT_REACHED']);
  });

  it('UNRECOGNIZED は除外して次へ進む（実行計画に含めない）', () => {
    const r = dryRunWorkflow(plan('謎の操作\n台帳に記録'));
    expect(r.steps.map((s) => s.status)).toEqual(['SKIPPED_UNRECOGNIZED', 'SIMULATED']);
    expect(r.outcome).toBe('completed');
  });

  it('性能境界（timeout 相当）: 上限いっぱいの入力でも 1 秒未満で決定論的に完了', () => {
    const text = Array.from({ length: WORKFLOW_INPUT_LIMITS.maxSteps }, () => 'あ'.repeat(90) + '記録').join('\n').slice(0, WORKFLOW_INPUT_LIMITS.actionsText);
    const started = performance.now();
    const r = dryRunWorkflow(plan(text));
    expect(performance.now() - started).toBeLessThan(1000);
    expect(r.steps.length).toBeGreaterThan(0);
  });
});

describe('WORKFLOW_ACTION_CATALOG — 危険 Action の網羅', () => {
  it('支払・削除・広告予算・外部公開は catalog 上で BLOCKED として固定されている', () => {
    for (const key of ['payment_execute', 'data_delete', 'ad_budget_change', 'external_publish']) {
      expect(WORKFLOW_ACTION_CATALOG.find((e) => e.key === key)?.classification, key).toBe('BLOCKED');
    }
  });
  it('外部送信・請求正式化・見積発行は REQUIRES_APPROVAL', () => {
    for (const key of ['customer_email_send', 'invoice_finalize', 'quote_issue']) {
      expect(WORKFLOW_ACTION_CATALOG.find((e) => e.key === key)?.classification, key).toBe('REQUIRES_APPROVAL');
    }
  });
});
