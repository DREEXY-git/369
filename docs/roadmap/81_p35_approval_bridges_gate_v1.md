# roadmap81 — Phase 3.5 承認ブリッジ実装 Gate（C21 SEO/Content・C19 広告改善案）v1

> 種別: docs-only（設計・受入・依存・rollback の固定）。実装は本 Gate 承認後に別サイクルで。
> ブランチ: `claude/p35-approval-bridges-v1`（PR #14・Codex 監査 head は変更しない）。
> 位置づけ: Codex `CODEX_PASS_V67` 待ち時間の並列 Track。ここでの結論は「**AI 下書き → 内部 ApprovalRequest → 人間 approve/reject → 元下書きへ deep link**」までの **review-only** 接続を、**既存 schema のみ**で成立させる設計。

## 0. スコープと絶対禁止（この Gate の外）

- **含む（review-only）**: 下書き（C21 ContentAsset / C19 MarketingSuggestion）から内部 `ApprovalRequest` を作成し、人間が `/approvals` で approve/reject し、承認/却下状態と元下書きへの deep link を可視化するところまで。
- **含まない（別 Gate の人間承認が必須）**: 公開 / CMS 投稿 / 広告の実変更 / 予算変更 / 外部送信 / 実 LLM 呼び出し / 自動実行。承認は「下書きが人間に承認された」という**社内状態**に留め、外部作用は一切起こさない。
  - `EXTERNAL_CONNECTOR_GO_REQUIRED`（広告/CMS/メール等の実接続）
  - `REAL_LLM_GO_REQUIRED`（実 LLM）／`BILLING_GO_REQUIRED`（課金）／`SCHEMA_CHANGE_APPROVAL_REQUIRED`（schema/migration）
- AI は approve/delete/external_send を持たない（`ROLE_PERMISSIONS` の AI_AGENT/AI_ASSISTANT 不変）。承認は必ず人間。

## 1. SCHEMA_CHANGE 判定（結論: 変更不要）

| 対象 | 既存 schema | 承認状態の持ち方 | schema 変更 |
| --- | --- | --- | --- |
| C21 SEO/Content | `ContentAsset`（`status` draft/pending_approval/approved/rejected・`approvalStatus` none/pending/approved/rejected・`aiOutputId`・`label`・`generatedByAi`・`safetyFlag`） | 既存 `approvalStatus` 列を決定時に更新 | **不要** |
| C19 広告改善案 | `MarketingSuggestion`（`id/title/detail/tenantId` のみ） | **状態列を追加せず**、`ApprovalRequest(entityType='marketing_suggestion', entityId=suggestion.id)` を単一正本として承認状態を**導出**（read model 側で JOIN/参照） | **不要** |
| 承認本体 | `ApprovalRequest`（`type/entityType/entityId/status/payload/requestedForAction/executedAt/executionStatus/decidedAt/decisionNote…`）＋`ApprovalStatus`(PENDING/APPROVED/REJECTED/CANCELLED) | そのまま利用 | **不要** |

→ **review-only ブリッジは既存 schema のみで成立**。`MarketingSuggestion` に列を足さず ApprovalRequest から状態導出することで C19 側も schema 変更を回避する。
→ もし将来「承認済み下書きの版管理・差分・resume 実行機構」まで踏み込むなら、そこは **`SCHEMA_CHANGE_APPROVAL_REQUIRED`** として本 Gate の外（別承認）。

## 2. C21 SEO/Content 承認ブリッジ（実装可能状態）

### 2.1 Server Action（新規・`apps/web/app/(app)/marketing/content/actions.ts` 想定）
`requestContentApprovalAction(formData)`:
1. `requireUser()` → 認証。
2. `hasPermission(user, 'marketing', 'update')`（下書きの承認申請は marketing 権限者。AI ロールは wildcard でも actions 側で人間専用化）。
3. Zod 相当の入力検証: `{ contentAssetId: cuid }`。
4. 対象 `ContentAsset` を **tenantId スコープ**で取得（別 tenant / 不存在は拒否・存在を漏らさない）。`status` が `draft`/`rejected` のみ申請可（`pending_approval`/`approved` は再申請不可＝**重複申請防止**）。
5. **idempotency / 重複申請防止**: 同一 `tenantId`＋`entityType='content_asset'`＋`entityId`＋`status=PENDING` の `ApprovalRequest` が既にあれば新規作成しない（既存を返す）。
6. `ApprovalRequest` 作成: `type='content_review'`・`entityType='content_asset'`・`entityId=contentAssetId`・`title`（安全のためタイトルのみ・本文は payload に入れない）・`summary`（機密でない要約）・`requestedById=user.id`・`requestedForAction`（`approval.ts` の該当アクション）・`riskLevel`・`status=PENDING`・`payload`=**メタのみ**（type/campaignId/generatedByAi・本文/PII/secret は入れない）。
7. `ContentAsset.status='pending_approval'`・`approvalStatus='pending'` へ更新。
8. `writeAudit`（action=create・entity=approval_request）＋機密ラベル参照時は `writeDataAccess`（**メタのみ**）。
9. `revalidatePath('/marketing/content')`＋`revalidatePath('/approvals')`。

### 2.2 決定（既存 `decideApprovalAction` 拡張・`approvals/actions.ts`）
- `type==='content_review'` の分岐を追加。approve/reject は**人間のみ**（`hasPermission(user,'approval','approve')`）。
- **冪等化**: `executionStatus` を `executing`→`executed` で二重実行防止（既存の Phase 1-7 パターン）。CAS（`updateMany` count 判定）で競合時は再実行しない。
- approve → `ContentAsset.approvalStatus='approved'`・`status='approved'`（**公開はしない**・社内承認状態のみ）。reject → `'rejected'`＋`decisionNote`。
- **外部作用ゼロ**: CMS/公開/送信の呼び出しを一切追加しない（この分岐は状態遷移＋監査のみ）。
- `writeAudit`（decision）。

### 2.3 UI / deep link
- `/marketing/content`（既存）: 各下書きに「承認申請」ボタン（`status` により活性/非活性）＋現在の `approvalStatus` バッジ。
- `/approvals`（既存一覧）: `content_review` 項目に**元下書きへの deep link**（`/marketing/content?highlight=<id>` 等）。実行ボタンは置かない（read-only 決定のみ）。
- 逆 deep link: 下書き→対応する承認申請へ。

## 3. C19 広告改善案 承認ブリッジ（実装可能状態）
- `requestAdSuggestionApprovalAction`: C21 と同型。`entityType='marketing_suggestion'`・`entityId=suggestion.id`・`type='ad_suggestion_review'`。`MarketingSuggestion` に状態列を足さないため、承認状態は `ApprovalRequest` を正本に **read model で導出**（`/marketing/ads` 表示時に該当 entityId の最新 ApprovalRequest.status を参照）。
- 重複申請防止・idempotency・deep link・監査は C21 と同一規約。
- **広告の実変更・予算・配信は一切行わない**（`EXTERNAL_CONNECTOR_GO_REQUIRED`）。承認済み＝「人間が改善案を承認した」社内記録のみ。

## 4. 横断要件（DoD）
- **tenant**: 全 query が `tenantId` スコープ。別 tenant の下書き/承認は参照・決定不可（404/deny）。
- **RBAC**: 申請＝marketing 権限者、決定＝approval:approve、AI ロールは actions 側で一律拒否。
- **入力検証**: Zod 相当で id 形式・種別を検証。過剰フィールド無視。
- **監査**: 申請/決定で `writeAudit`。機密ラベル参照は `writeDataAccess`（メタのみ・本文/PII/secret 非記録）。
- **idempotency**: `executionStatus` の CAS で決定の二重実行防止。
- **重複申請防止**: 同一 entity の PENDING 重複を作らない。
- **否定テスト（必須）**: (a) AI ロールは申請/決定不可、(b) 別 tenant の下書きに申請/決定不可、(c) approval:approve 無しは決定不可、(d) 重複申請は新規を作らない、(e) reject 後の状態、(f) 決定の冪等（二重 submit で1回のみ反映）。
- **E2E**: 下書き作成→承認申請→/approvals で approve→下書きが approved 表示→deep link 往復。reject 経路も。
- **外部作用ゼロの証明**: 承認経路に外部送信/CMS/実 LLM/課金の呼び出しが存在しないことをコード検査＋テストで担保（`EXTERNAL_SEND_ENABLED=false`/FakeLLM のまま挙動不変）。

## 5. 依存・前提
- 既存 `ApprovalRequest` / `ContentAsset` / `MarketingSuggestion` / `decideApprovalAction` / `hasPermission` / `writeAudit` / `writeDataAccess` / `approval.ts`。
- schema/migration/seed **不要**（§1）。resume 機構不要（決定は同期・冪等）。

## 6. rollback 条件
- 承認経路のいずれかで外部作用（送信/公開/課金）が観測されたら即 revert。
- 二重実行・重複 PENDING・別 tenant 参照が再現したら該当 action を無効化して revert。
- 状態遷移不整合（approved のまま再申請可能等）が出たら revert。
- rollback 単位はコミット単位（server action ＋ UI ＋ tests を1縦切りで独立 revert 可能に）。

## 7. C22 紹介機能（schema 前提の実装可能設計）
- 既存 `docs/roadmap/76_c22_referral_gate_design_candidate.md` を親とし、**schema が要る**ため本体は `SCHEMA_CHANGE_APPROVAL_REQUIRED`。
- 実装可能状態に必要な確定事項（本 Gate で固定）: 紹介レコード（referrer/referred/consent/status/reward-candidate）・二重紹介防止キー・同意（ConsentRecord 連携）・報酬は候補まで（実支払は `BILLING_GO_REQUIRED`）・外部送信は既存 outreach 承認経路に相乗り（新経路を作らない）。
- 受入: tenant/RBAC/監査/同意必須・報酬確定は人間・実支払禁止。→ schema 承認後に薄い縦切りで実装。

## 8. Phase 5 Wave 1（会計・電子帳簿・人事労務）Function ID 具体化（docs-only）
薄い縦切り＝「重要テーブル→read-only 可視化→人間書き込み最小→AI 参照＋ログ」。各々 schema 要 → `SCHEMA_CHANGE_APPROVAL_REQUIRED`。

| Function ID（案） | 概要 | 薄い縦切り | 受入（DoD 骨子） | 依存 |
| --- | --- | --- | --- | --- |
| P5-ACC-01 勘定科目/仕訳基盤 | Chart of Accounts＋Journal（既存は `SCHEMA_ONLY`） | 科目 read-only→人間仕訳最小→AI 参照ログ | tenant/RBAC/監査・実会計連携なし・税務断定なし | schema |
| P5-EBK-01 電子帳簿保存 | 証憑メタ＋改ざん検知メタ（原本は保持のみ） | 証憑一覧 read-only→人間紐付け→検索 | 原本外部送信なし・保存要件は方針記録に留める | schema・保管方針 |
| P5-HR-01 人事労務基盤 | 従業員/勤怠/給与の枠（値は人間入力） | read-only→人間入力最小→AI は下書き/確認観点のみ | 採否/評価/支給は `HUMAN_ONLY`・断定助言なし | schema・労務方針 |

- いずれも Evidence 語彙は `ROADMAP_ONLY`/`DEFERRED`（実装未着手）。`NOT_PLANNED` にしない（段階的完全実装方針）。

## 9. 次アクション
1. 本 Gate を人間確認（docs-only・コード/schema 変更なし）。
2. §2/§3（C21・C19 review-only ブリッジ）は **schema 変更不要につき実装可能**。承認後に薄い縦切りで実装＋テスト（別サイクル）。
3. §7/§8 は `SCHEMA_CHANGE_APPROVAL_REQUIRED`。

## 10. 安全宣言
「脆弱性ゼロ」「完全無欠」「全機能完成」は宣言しない。本 Gate は設計固定のみで、コード・schema・migration・外部作用は一切含まない。
