import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { isExternalSendEnabled, isGoogleMapsEnabled } from '@hokko/integrations';
import { isExternalLlmEnabled } from '@hokko/ai';

export const dynamic = 'force-dynamic';

// M2「実運用（実送信 / 実LLM / 実Maps を ON）」への準備状況を read-only で棚卸しする管理画面。
// このページは**何も切り替えない**（表示のみ）。本番 ON は EXTERNAL_SEND_ENABLED=true 等の
// デプロイ設定＋人間承認が揃った時のみ・別の人間判断（Human Gate）で行う。
// - 送信/LLM/Maps のマスタースイッチ（既定 OFF＝安全）を env ヘルパで判定（値＝秘密は一切表示しない・真偽のみ）。
// - 同意/配信停止の土台データ件数（コンプライアンスの前提）。
// - AIの外部送信ブロック回数（AIは送信主体になれない、の実測の安全実績）。
// - 送信の途中状態（write-ahead claim = pending_send）件数で exactly-once の健全性を可視化（通常 0）。
// 権限は管理コンソールの閲覧（admin:read）。schema 非変更。

// マスタースイッチ行（OFF＝安全側なので OFF を緑・ON を黄で「本番送信が有効」と警告表示）。
function SwitchRow({ label, on, hint }: { label: string; on: boolean; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Badge tone={on ? 'amber' : 'green'}>{on ? 'ON（実運用）' : 'OFF（既定・安全）'}</Badge>
    </div>
  );
}

export default async function M2ReadinessPage() {
  const user = await requireUser();
  if (!hasPermission(user, 'admin', 'read')) {
    return (
      <AccessDenied
        title="M2 実運用 準備状況"
        reason="この画面の閲覧には管理コンソールの閲覧権限（admin:read）が必要です"
        breadcrumb={[{ label: '管理', href: '/admin' }]}
      />
    );
  }

  const t = user.tenantId;
  // デプロイ全体のスイッチ（テナント非依存・真偽のみ・秘密値は読まない）。
  const sendOn = isExternalSendEnabled();
  const llmOn = isExternalLlmEnabled();
  const mapsOn = isGoogleMapsEnabled();

  // テナント単位の土台データ・安全実績（すべて tenantId でスコープ・件数のみ＝PII 非取得）。
  const [suppression, consentTotal, consentTrue, sendLogByStatus, pendingSendClaims, blockedSends] = await Promise.all([
    prisma.suppressionList.count({ where: { tenantId: t } }),
    prisma.consentRecord.count({ where: { tenantId: t } }),
    prisma.consentRecord.count({ where: { tenantId: t, consent: true } }),
    prisma.outreachSendLog.groupBy({ by: ['status'], where: { tenantId: t }, _count: { _all: true } }),
    // exactly-once の write-ahead claim（invoice-send E-01）。pending_send は「送信は起動したが finalize 未了」。
    // 通常 0。>0 が滞留していれば finalize の再実行（provider は再送しない）を要確認。
    prisma.financeEvent.count({ where: { tenantId: t, status: 'pending_send' } }),
    // AIの外部送信を遮断した回数（AIは送信主体になれない多重防御の実測）。
    prisma.aIAgentAction.count({ where: { tenantId: t, type: 'external_send_blocked' } }),
  ]);
  const sendCount = (s: string) => sendLogByStatus.find((x) => x.status === s)?._count._all ?? 0;
  const sent = sendCount('sent');
  const logged = sendCount('logged');
  const suppressed = sendCount('suppressed');
  const failed = sendCount('failed');

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="M2 実運用 準備状況（実送信・実LLM・実Maps）"
        description="本番の外部送信/実LLM/実Maps を ON にする前の「準備できているか」を表示のみで棚卸しします。この画面では何も切り替えません。"
        breadcrumb={[{ label: '管理', href: '/admin' }, { label: 'M2 準備', href: '#' }]}
      />

      <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
        現在は安全な既定（外部送信 OFF・Fake/Demo プロバイダ）で動作しています。実運用への切替は、デプロイ設定
        （<code>EXTERNAL_SEND_ENABLED=true</code> 等）と人間承認が揃った時のみ・別の人間判断で行います（このページは表示専用）。
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="配信停止 登録" value={suppression} sub="送信前チェックの対象" tone="slate" />
        <Stat label="同意記録（有効/全体）" value={`${consentTrue} / ${consentTotal}`} tone={consentTrue > 0 ? 'emerald' : 'slate'} />
        <Stat label="送信中クレーム（要確認）" value={pendingSendClaims} sub={pendingSendClaims === 0 ? '滞留なし（正常）' : '滞留あり・finalize 未了'} tone={pendingSendClaims === 0 ? 'emerald' : 'amber'} />
        <Stat label="AI外部送信ブロック" value={blockedSends} sub="AIの送信を遮断した実績" tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* マスタースイッチ（デプロイ全体・既定 OFF＝安全） */}
        <Card>
          <CardHeader><CardTitle>マスタースイッチ（デプロイ全体・既定 OFF）</CardTitle></CardHeader>
          <CardContent className="space-y-1 divide-y">
            <SwitchRow label="外部メール送信" on={sendOn} hint="EXTERNAL_SEND_ENABLED。OFF の間は送信せず監査ログのみ。" />
            <SwitchRow label="実LLM（外部AI）" on={llmOn} hint="LLM_PROVIDER + APIキー。未設定なら FakeLLM で全機能デモ可。" />
            <SwitchRow label="実Google Maps/Places" on={mapsOn} hint="MAPS_PROVIDER=google + APIキー。未設定なら DemoMap。" />
            <p className="pt-2 text-[11px] text-muted-foreground">秘密値（APIキー）は表示しません。ON/OFF の状態のみを判定しています。</p>
          </CardContent>
        </Card>

        {/* 送信ログの内訳（既存 OutreachSendLog の実データ） */}
        <Card>
          <CardHeader><CardTitle>営業メール送信ログの内訳</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">実送信（sent）</span><Badge tone={sent > 0 ? 'green' : 'slate'}>{sent}件</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">記録のみ（logged・未送信）</span><Badge tone="slate">{logged}件</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">抑止（suppressed）</span><Badge tone={suppressed > 0 ? 'amber' : 'slate'}>{suppressed}件</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">失敗（failed）</span><Badge tone={failed > 0 ? 'red' : 'slate'}>{failed}件</Badge></div>
            <p className="pt-1 text-[11px] text-muted-foreground">OFF の間は実送信されず logged として記録されます。送信は承認導線（/approvals）経由のみ。</p>
          </CardContent>
        </Card>
      </div>

      {/* 本番 ON 前の宿題（Human Gate チェックリスト） */}
      <Card className="mt-4">
        <CardHeader><CardTitle>本番 ON 前の宿題（Human Gate チェックリスト）</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2"><Badge tone="green">済</Badge><span>外部送信は既定 OFF（<code>EXTERNAL_SEND_ENABLED</code> 未設定＝安全）。ON でも送信は承認後のみ。</span></li>
            <li className="flex items-start gap-2"><Badge tone="green">済</Badge><span>AI は外部送信・承認・削除の主体になれない（RBAC＋<code>assertAiToolAllowed</code> の多重防御）。上のブロック実績が証跡。</span></li>
            <li className="flex items-start gap-2"><Badge tone="green">済</Badge><span>外部送信の3経路（請求書 E-01・営業メール E-04・督促 dunning）はすべて exactly-once（write-ahead claim → provider → finalize の3相）で二重送信ゼロ。送信中クレームは上のカードで監視。</span></li>
            <li className="flex items-start gap-2"><Badge tone="green">済</Badge><span>送信前に配信停止（SuppressionList）・同意（ConsentRecord）を確認。配信停止希望は自動で抑止リストへ。</span></li>
            <li className="flex items-start gap-2"><Badge tone="amber">残</Badge><span>実LLM/実Maps は API キー投入とレート/課金の上限設計が前提（コスト・規約の人間判断）。</span></li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2 text-xs">
            <Link href="/approvals" className="text-primary hover:underline">承認待ち（送信はここを通す）→</Link>
            <Link href="/admin/compliance/consents" className="text-primary hover:underline">同意・配信停止 →</Link>
            <Link href="/admin/danger-actions" className="text-primary hover:underline">危険操作ログ →</Link>
            <Link href="/admin/ai-safety" className="text-primary hover:underline">AI安全ログ →</Link>
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground">この画面は表示専用です。実運用の ON/OFF はデプロイ設定と人間承認でのみ変更されます。</p>
        </CardContent>
      </Card>
    </div>
  );
}
