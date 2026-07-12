import { PageHeader } from './page-header';

// evaluatePolicy（shared/policy.ts）の拒否理由コード → 日本語（UI は日本語ルール・WIP-4 追補）。
// 未知のコードやページ側が渡す日本語文はそのまま表示する。
const REASON_LABEL: Record<string, string> = {
  'label-denied': '対象の機密ラベルを閲覧できるロールではありません',
  'sensitive-reason-required': '機密アクセス理由の登録が必要です',
  'approval-required': '承認が必要です',
  'consent-required': '本人の同意が確認できません',
  'ai-forbidden-action': 'AI には許可されていない操作です',
  'outside-business-hours': '業務時間外のアクセスは許可されていません',
  'retention-expired': '保持期限を過ぎたデータです',
};

/** ABAC で拒否された際の共通表示（500にせず理由を提示）。 */
export function AccessDenied({
  title,
  reason,
  needsReason,
  breadcrumb,
}: {
  title: string;
  reason: string;
  needsReason?: boolean;
  breadcrumb?: { label: string; href: string }[];
}) {
  return (
    <div>
      <PageHeader title={title} breadcrumb={breadcrumb} />
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        この情報の閲覧は許可されていません（理由: {REASON_LABEL[reason] ?? reason}）。
        {needsReason ? '機密アクセス理由の登録が必要です。' : ''}
      </div>
    </div>
  );
}
