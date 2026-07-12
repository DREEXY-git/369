import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { AccessDenied } from '@/components/access-denied';
import { WorkflowDryRunClient } from './dry-run-client';

export const dynamic = 'force-dynamic';

// Workflow Dry Run（v7.2 Lane D・read-only・roadmap86）。
// 入力から業務フロー案を決定論的に組み立て、dry-run（仮想実行）の結果だけを表示する。
// v7.2 R2（Codex CHANGE_REQUEST_V72_WORKFLOW P2-2）: 入力は client-local state のみで処理し、
// URL / 履歴 / access log へ業務文を残さない（旧 GET フォームは query string に全文が載っていた）。
// **DB 更新・queue enqueue・Server Action 実行・外部送信・実 LLM・課金は一切行わない**
// （このページに変更系 action は存在しない）。危険 Action は必ず BLOCKED、人間承認 Action は
// REQUIRES_APPROVAL、対応表外は REQUIRES_HUMAN_REVIEW で停止（承認・確認なしで完了扱いにしない）。

export default async function WorkflowDryRunPage() {
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="ワークフロー設計（Dry Run・read-only）"
        description="やりたい業務フローを入力すると、Trigger・条件・Action・承認ステップ・リスクの案と仮想実行（dry-run）の結果を表示します。入力は保存されず URL にも残りません。実際の実行・外部送信は一切行いません。"
      />
      <WorkflowDryRunClient isAi={user.isAi} />
    </div>
  );
}
