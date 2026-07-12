# roadmap83 — C19 承認ブリッジ schema Gate（案A/B 比較・実装可能状態）＋ C22 前進判定 v1

> 種別: docs-only（schema 適用は行わない・`SCHEMA_CHANGE_APPROVAL_REQUIRED` の人間承認材料）。
> 親: roadmap81 §3/§11（C19 停止判定）・v7.0 指令 §10。

## 1. C19 現状（回帰確認済み）

- 既存の read-only 分析（`/marketing/ads`・`summarizeAdsMetrics`・channel 状態盤）と AI 改善案下書き
  （`generateAdsImprovementDraftAction`・人間のみ・外部送信なし）は v7.0 フル E2E（145/0）で回帰 green。
- 未実装なのは「改善案 → 内部承認」ブリッジのみ。roadmap81 §11 のとおり、`MarketingSuggestion` に可変
  status 列がなく `ApprovalRequest` に unique 制約もないため、**重複 PENDING の原子的防止**が既存 schema
  では不可能（check-then-create = TOCTOU）で停止中。

## 2. schema 案の比較

| | 案A: `MarketingSuggestion.approvalStatus` 列追加 | 案B: `ApprovalRequest` 部分 unique index |
| --- | --- | --- |
| Prisma 差分 | `approvalStatus String @default("none")` を1列追加＋`@@index([tenantId, approvalStatus])` | Prisma schema では部分 unique（`WHERE status='PENDING'`）を表現できず **raw SQL migration が必要** |
| 原子性の実現 | C21 で**実 PostgreSQL 証拠12件により実証済みの status CAS パターンをそのまま再利用** | insert 時の unique violation を catch する新パターン（実証なし・エラー処理系が増える） |
| 影響範囲 | MarketingSuggestion のみ・既存 read 経路は列を無視（後方互換） | ApprovalRequest 全体に影響（全 type の PENDING 挙動に波及リスク） |
| rollback | 列 drop のみ（データ損失は approvalStatus のみ） | index drop のみ（ただし依存コードの分岐が残る） |
| backfill | `UPDATE ... SET approvalStatus='none'`（default で自動・実質不要） | 不要（ただし既存重複 PENDING があると index 作成が失敗 → 事前重複解消が必要） |

**推奨 = 案A**。理由: C21 と同型（`draft/rejected → pending` 相当の CAS）で、transaction 正本
（`content-review-bridge.ts`）とテスト（契約12件＋実 PG 12件）の設計をほぼコピーで再利用でき、
検証済みパターンの再適用は新規実装より事故率が低い。案B は Prisma 外の raw migration と
未実証のエラー処理パターンを持ち込み、ApprovalRequest 全体へ影響が及ぶ。

## 3. 案A の実装可能状態（承認後に別サイクルで実行）

- **Prisma 差分**:
  ```prisma
  model MarketingSuggestion {
    // 既存: id / tenantId / title / detail / createdAt
    approvalStatus String @default("none") // none | pending | approved | rejected
    @@index([tenantId, approvalStatus])
  }
  ```
- **migration**: `prisma migrate dev --name c19_suggestion_approval_status`（加法的・破壊なし）。
  適用は使い捨て/CI DB で検証後、人間 GO で本番系列へ（本 Gate の外）。
- **状態遷移**（shared 純ロジック・content-approval.ts と同型）:
  `none/rejected →(申請CAS)→ pending →(人間 approve/reject)→ approved / rejected（rejected は再申請可）`
- **transaction**: 申請 = suggestion CAS → `ApprovalRequest(type='ad_suggestion_review')` → 監査 →
  DataAccessLog を単一 $transaction。決定 = ApprovalRequest CAS → suggestion 更新 `count===1` → 監査。
  （content-review-bridge の requestCore/decideCore を汎用化 or 併設）
- **rollback**: revert = 列 drop migration＋bridge コード revert（縦切り1commit 単位）。
- **テスト計画**: 契約 unit（mock db）＋実 PG 12ケース（並行2申請/失敗注入 rollback/並行決定/冪等/
  対象消失/cross-tenant/AI 拒否/正常系/他 type 非干渉/PII 非保存/外部作用0）＋E2E（/marketing/ads
  申請→/approvals 決定→バッジ反映）。**広告実変更・予算変更・外部送信は一切接続しない**（承認は社内状態のみ）。
- **release Gate**: 実装後も `EXTERNAL_CONNECTOR_GO_REQUIRED` は不変。Codex 独立監査＋人間 Preview 必須。

## 4. C22 前進判定（v7.0 §10）

- **依存関係**: 紹介レコード（referrer/referred/consent/status/reward-candidate）＋二重紹介防止キーは
  **schema 必須**（roadmap76/81 §7 の結論を維持）→ 本体は `SCHEMA_CHANGE_APPROVAL_REQUIRED`。
- **schema-free 縦切りの可否**: 「既存 Customer/Deal/GrowthEvent からの紹介候補 read-only 分析＋
  Fake AI 下書き（既存 `ContentAsset(type='review_request')` 生成経路の再利用）」は既存 schema で成立し
  安全（外部送信なし・下書きのみ）。**本サイクルでは release-blocking Lane（R1/R2/P4/P4Q）を優先したため
  未実装**。次サイクルの自動実行可能タスクとして固定（別 Draft PR・封印: 外部公開/紹介送信/実LLM/課金）。
- **受入条件**: tenant/RBAC/監査/同意必須・報酬は候補まで（実支払 = `BILLING_GO_REQUIRED`）・
  ステマ防止 PR 表記・PII 非複製・外部送信は既存 outreach 承認経路に相乗り（新経路を作らない）。
- **再開条件**: ①schema-free 分析縦切り = いつでも可（人間の着手指示のみ）②本体 = schema 承認後。
- **責任者**: 実装 = Claude／独立監査 = Codex／schema・公開・報酬確定 = 人間。

## 5. 次 Wave 候補（削除しない・依存と受入のみ更新）

| 候補 | 依存 | 受入条件の骨子 |
| --- | --- | --- |
| Salesforce 級 CRM 拡張 | 既存 CRM 境界（PII 経路台帳）維持 | tenant/RBAC/監査・外部 sync は connector Gate |
| MoneyForward/freee 級 会計 | P5-ACC-01（schema 要） | 実会計連携なし・税務断定なし・仕訳は人間確定 |
| 電子帳簿保存 | P5-EBK-01（schema 要・保管方針） | 原本外部送信なし・要件は方針記録まで |
| HR/労務 | P5-HR-01（schema 要・労務方針） | 採否/評価/支給 `HUMAN_ONLY`・断定助言なし |

## 6. 安全宣言

本書は docs-only。schema 適用・migration 実行・外部作用は含まない。「脆弱性ゼロ」「完全無欠」「全機能完成」は宣言しない。
