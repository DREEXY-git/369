# 177 顧客離反予兆ボード F 独立監査

日付: 2026-07-23
対象: PR #127 / branch `claude/customer-churn-watch-v1`
対象 head: `91d445d1fcb7111d9ffe97c51943a5971399ccba`
比較元 main: `563e4ad0059845e3c3cabd3eedfb0cc71138dea0`
監査者: F-CODEX（テナント分離 / RBAC）

## Verdict

`CHANGES_REQUIRED`

テナント境界と RBAC の主経路は概ね守られているが、要件で明示された「範囲外シグナルでは根拠を捏造しない」と「status 固定による取りこぼし」に実害がある。

## 確認した範囲

- `packages/shared/src/customer-health.ts`
- `packages/shared/src/__tests__/customer_health.test.ts`
- `apps/web/app/(app)/customers/churn/page.tsx`
- `apps/web/app/(app)/customers/page.tsx`
- `apps/web/app/(app)/customers/actions.ts`
- `apps/web/app/(app)/customers/[id]/edit/page.tsx`
- `apps/web/lib/security/customer-visibility.ts`
- `packages/db/prisma/schema.prisma`

## Findings

### [MEDIUM] 範囲外の `churnRisk` / `satisfaction` が「危険根拠」に変換される

`classifyCustomerChurn` はコメント上「数値でない/範囲外の入力は無視」としているが、実装は `clamp0to100` で範囲外値を丸めてから評価する。

- `churnRisk: 200` は `100` に丸められ、`critical` かつ「離反リスク指標が高い（100）」になる。
- `satisfaction: -1` は `0` に丸められ、「満足度が低い（0）」の根拠になる。
- `packages/shared/src/__tests__/customer_health.test.ts` も `churnRisk: 200` を `100` と期待しており、要件と逆向きに固定している。

これは「全シグナル null/範囲外で stable・根拠空（捏造しない）」という依頼条件に反する。さらに `Customer.satisfaction` / `Customer.churnRisk` は Prisma schema 上 `Int?` で DB 制約がなく、`updateCustomerAction` も `Number.isFinite` のみで 0-100 を強制していない。HTML input の `min/max` はサーバ境界ではないため、範囲外値が保存される経路は残る。

推奨修正:

- 純関数側で `0 <= n <= 100` の有限数だけ採用し、範囲外は `null` 同等に無視する。
- `updateCustomerAction` でも 0-100 を検証し、範囲外は保存しないか validation error にする。
- テストは `churnRisk: 200`、`satisfaction: -1`、両方範囲外のケースで `stable` / `reasons: []` を期待する。

### [MEDIUM] `status: 'active'` 固定により、既存 UI が持つ `dormant` 顧客を離反予兆から落とす

churn ボードの取得条件は `where: { tenantId, label: { in: visibleLabels }, status: 'active' }` 固定だが、顧客編集画面は `active` / `prospect` / `dormant` / `churned` を既存ステータス語彙として提示している。

`churned` を除外するのは妥当だが、`dormant` は「休眠」であり、離反予兆の検知対象として扱うべき高リスク・長期未接触・未対応クレーム顧客を含みうる。現実に `dormant` 顧客が存在すると、顧客名や機密情報が漏れるわけではないものの、フォロー対象から完全に消えるため、ボードの目的に対して危険側の取りこぼしになる。

推奨修正:

- 対象 status を `active` だけに固定するなら、画面文言を「取引中顧客のみ」に明確化し、`dormant` は別ボード/別フィルタで見る設計にする。
- 離反予兆として扱うなら `status: { in: ['active', 'dormant'] }` など、除外する status を明示する。
- `churned` / `prospect` を含めるかは業務判断だが、少なくとも `dormant` の扱いは仕様として固定し、テストに入れる。

## Pass / Non-finding

- `customer:read` はデータ取得前に判定され、拒否時は `AccessDenied` を返す。
- 主 customer query は `tenantId: user.tenantId` と `label: { in: visibleLabels }` を持つ。
- `CustomerComplaint` は `customerId` 単独 FK だが、nested read でも `where: { tenantId: user.tenantId, status: 'open' }` を併記しており、別テナント complaint の混入は defense-in-depth で抑えられている。
- 不可視 label の顧客は DB クエリ段階で除外されるため、名前・満足度・離反リスク・クレーム件数・統計件数に出ない。
- `visibleCustomerLabels` は非マネージャに高機密ラベルを fail-closed で不可視にし、一覧では所有者例外を出さない既存規約と整合している。
- stable 以外の表示順は `score desc`、同点 `id asc` で入力順に依存しない。
- `complaints` は `select: { id: true }` のみで、クレーム本文・タイトル・severity は表示根拠へ流れていない。

## 検証

read-only 監査として実コードを読み、DB・本番・Secrets・外部送信・課金には触れていない。依存取得や DB/Playwright は実行していない。
