import { PageHeader } from './page-header';

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
        この情報の閲覧は許可されていません（理由: {reason}）。
        {needsReason ? '機密アクセス理由の登録が必要です。' : ''}
      </div>
    </div>
  );
}
