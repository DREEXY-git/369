import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { AccessDenied } from '@/components/access-denied';
import { getAiWorkforceReadModel } from '@/lib/domains/ai-workforce/read-model';
import { AiOffice } from '@/components/ai-office/ai-office';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

// 3D バーチャルオフィス（Phase 4 Stream B v0・roadmap71）。
// read-only 運用可視化のみ。実行・承認・削除・外部送信の導線は本画面に存在しない。
// 状態は AIAgentRun / AIApprovalGate 等の証拠から導出し、証拠がなければ「計測なし」と表示する。

export default async function AiOfficePage() {
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
  const model = await getAiWorkforceReadModel(user.tenantId);

  return (
    <div>
      <PageHeader
        title="3D バーチャルオフィス（AI社員・read-only）"
        description="AI社員の稼働状態を証拠（実行記録・承認ゲート）から可視化します。この画面から実行・承認・削除は行えません。"
        action={<Badge tone="slate">データ基準: {model.generatedAtLabel} UTC</Badge>}
      />
      <AiOffice model={model} />
    </div>
  );
}
