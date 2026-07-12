# roadmap84 — C22 read-only 縦切り v1（v7.2 Lane B・schema-free）

> 種別: 実装（read-only 分析＋Fake 下書き内部プレビューまで）。roadmap76（設計 Gate）と roadmap83 §4
> （schema-free 縦切りの再開条件）に基づく。branch `claude/c22-readonly-analysis-v1`（base = PR #18 `fa04e74`）。

## 1. スコープ（作ったもの）

- **shared 純ロジック** `packages/shared/src/referral.ts`:
  - `REFERRAL_CHANNELS`（紹介/アフィリエイト/クリエイター/ビジネスネットワークの4チャネル・全チャネル外部運用封印中）。
    affiliate/creator は `dataSource='external'` = 外部連携封印中のため**候補 0 件が正しい表示**（未計測を捏造しない）。
  - `classifyReferralSource`: 既存 Customer/Deal の**非 PII 射影のみ**から紹介元候補を決定論導出
    （成約実績必須・満足度 null は「未計測」明示・解約リスク/非接触は caution flag＝自動除外しない）。
  - `buildReferralDraft`: プレースホルダ差し込みの決定論 Fake 下書き。**PR 表記（ステマ防止）と税務注記は
    末尾固定連結＝削除経路なし**（roadmap76 §3）。実名・連絡先を受け取る引数が存在しない（PII 非複製）。
- **`/growth/referral`**（marketing:read・read-only）: チャネル状態盤（全封印表示）＋候補一覧（実測根拠・
  caution・/customers deep link）＋下書き内部プレビュー（人間のみ・`?preview=` GET・送信導線なし）。
  導線は NAV 67 契約を変更せず **/growth ダッシュボードからの deep link**（契約 churn 回避・Lane E と非干渉）。
- **境界**: 顧客一覧は tenant＋`visibleCustomerLabels`（fail-closed）・最小 select（連絡先/住所/notes 非取得）。
  顧客名表示は customer:read 保持者のみ（marketing:read 単独へ名前を新規開示しない＝PII 経路を増やさない）。
  プレビューは AI 拒否（分析閲覧は可）・`writeDataAccess`（metadata-only: fields/channel のみ）・
  malformed/不存在/別 tenant は同一の notfound 応答（存在シグナルなし）。

## 2. 作っていないもの（封印・人間 Gate）

- 紹介レコード/紹介コード/報酬候補の**永続化**（schema 必須 = `SCHEMA_CHANGE_APPROVAL_REQUIRED`・roadmap83 §4）。
  既存安全モデルへ適切に保存できないため永続化せず、分析＋プレビューまでに留めた（v7.2 Lane B 指示どおり）。
- 外部招待・紹介メール送信（既存 outreach 承認経路のみが将来の送信経路・新経路は作らない）・報酬付与・支払・
  公開・実 LLM・外部 API・広告/予算変更。

## 3. 受入条件と証拠

- unit: `referral.test.ts`（決定論・実績必須・未計測明示・PR 表記1回/末尾固定・PII 引数なし・4チャネル区分）。
- E2E: `referral_readonly.spec.ts`（封印表示・候補・deep link・プレビュー PR 表記/placeholder/実名非複製・
  DataAccessLog metadata-only・外部送信 0・AI の生成拒否＋DataAccess 0・marketing:read なし遮断・
  malformed 安全・mobile 390 overflow 0＋要素 screenshot 3枚）。
- 全電池: unit/typecheck/lint/build/safety/フル E2E・exact-head CI・artifact。

## 4. 次の縦切り（再開条件つき・削除しない）

| 候補 | 依存 |
| --- | --- |
| 下書きの ContentAsset 保存＋C21 review bridge 相乗り | 人間の着手指示のみ（schema 不要） |
| 紹介台帳（紹介コード・成果候補・報酬候補）本体 | schema 承認（roadmap76 §2 の設計固定済み） |
| 紹介依頼の実送信 | 既存 outreach 承認経路への接続＋`EXTERNAL_SEND_ENABLED` 人間 Gate |

本書は「脆弱性ゼロ」「完全無欠」「全機能完成」を宣言しない。
