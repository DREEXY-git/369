# CURRENT_STATE — IKEZAKI OS

> 現在地の「1枚サマリー」。今の真実だけを書きます。長い経緯は `tasks/PROGRESS.md`、詳細監査は `docs/audit/` を参照。

## 状態管理ルール

- このファイルは**現在地の1枚サマリー**であり、履歴の集積ではありません。
- **push 反映状態は git refs（`git rev-parse HEAD` / `git rev-parse origin/main` / `git log origin/main`）を正**とします。
- `PROGRESS.md` は**履歴・判断メモ**であり、現在地の唯一の正ではありません（現在地はこのファイルと git refs）。
- 一時的な状態（未push・承認待ち 等）は**原則として永続表現に残しません**。必要なときは最終報告で扱います。
- このファイルは**大きな節目ごと**に更新します（毎コミットでは更新しません）。

## Git 反映状態の扱い

- **現在の HEAD ／ origin/main ／ 未push有無 ／ 作業ツリー状態は、常に git コマンドの結果を正**とします。このファイルには、コミットごとに変わる現在値を固定しません（このファイル自身を更新すると位置が変わるため、固定値を書くと即座に古くなります）。
- 反映状態を確認するコマンド:
  - `git rev-parse --short HEAD`
  - `git rev-parse --short origin/main`
  - `git log --oneline origin/main..HEAD`（未pushの一覧。空なら未pushなし）
  - `git status --short`（作業ツリー。空なら clean）
- 現在の作業ブランチも `git branch --show-current` を正とし、このファイルには固定しません。
- **このファイルに固定してよい commit は、「Phase 完了基準」と「最新の本番確認GO済みプロダクト基準」の基準 commit だけ**です。現在 HEAD・origin/main・作業ブランチ・未push などの現在位置は git を参照してください。

## Phase の現在地

- **Phase 1: 正式完了（Phase 1-50・判定根拠は doc24 の GO）。完了基準 commit: `e95f887`**（※現在 HEAD ではなく完了基準。詳細 `docs/audit/25_phase1_completion_record.md`）。
- **Phase X: 完了済み（Phase X-CLOSE-01・判定 GO）。完了基準 commit: `70d4d06`**（※現在 HEAD ではなく完了基準。詳細 `docs/audit/32_phase_x_completion_record.md`）。恒久資産=E2E smoke green 回帰ゲート（11/11）＋roadmap 9本＋Feature Registry＋各種 Matrix＋Phase 2 entry review。
- **現在地: Phase 2-A 進行中 — 2-A-3a（Company Brain read-only 可視化）まで完了**。seed に架空デモデータ（CompanyPolicy 5件＋ProductCatalogItem 8件・全件 externalAiAllowed=false・PII/secret/実価格なし）が入り、read-only 一覧2画面（`/brain/policies`・`/brain/catalog`・knowledge:read＋tenantId スコープ）とナビ1行（会社の頭脳）が実装済み（記録: doc36）。**smoke は12本体制で 12/12 green（既存11本回帰なし）**。schema・migration・RBAC・labels は 2-A-2 から無変更。**作成・編集・Server Action・writeAudit/writeDataAccess の本実装は 2-A-3b の個別人間承認まで行わない**（read-only 可視化完了、作成/編集は 2-A-3b 承認待ち）。前段: 2-A-2 schema 変更＋本番確認 GO（doc34・doc35・doc14 §38）。
- **2-A-3a の本番確認は 一度 HOLD → 再実測 GO で解消済み（利用者実測・2026-07-03・記録: doc38＋doc14 §40）**: 初回実測ではナビ「会社の頭脳」と `/brain/*` 2画面が本番未確認/NG で HOLD（doc37＋doc14 §39・記録として保持）。ハードリロード/開き直し後の再実測で、ナビ・2画面・作成/編集/削除ボタン無し・既存画面すべて GO を確認し解消。前回NGの原因はキャッシュ/反映タイミングの可能性が高いが断定しない。**Phase 2-A-3a は本番確認まで完全クローズ**。
- **2-A-3b-1（CompanyPolicy 書き込み最小実装）＋安全補正＋本番確認GO 完了（記録: doc39＋doc40＋doc41）**: 会社方針のみに作成・編集・アーカイブの3操作を実装（Server Action＋入力検証＋writeAudit・物理削除なし・externalAiAllowed は UI で変更不可）。安全補正で **AIロールは権限にかかわらず会社方針の mutation を一律拒否（rbac 無変更・actions 側で人間専用化）**・**扱える label は NORMAL / INTERNAL のみ（高機密ラベルは writeDataAccess 実装時まで保留）**。**smoke は13本体制で 13/13 green（既存12本回帰なし）**。**本番確認も利用者実測で GO（2026-07-04・doc41＋doc14 §41）＝書き込み第一段は完全クローズ**。**ProductCatalogItem の書き込みと writeDataAccess は 2-A-3b-2 以降の個別人間承認まで行わない**。ENSHiN OS の外部発信・口コミ・SNS・顧客の声公開・許諾管理実装は未着手。
- **Phase 8（実課金・Stripe・usage billing・credits・cap/alert）には進まない**（別設計・別承認が前提）。

## 最新の本番確認GO済みプロダクト基準

- 最新の本番確認 GO 済みプロダクト基準: **Phase 2-A-3b-1**
- 内容: **CompanyPolicy（会社方針）の作成・編集・アーカイブ（書き込み最小実装＋安全補正）の本番確認 GO 記録**
- Phase 2-A-3b-1 基準 commit（本番確認 GO 済み基準）: `706358e`（実装 `9eea086`＋安全補正 `706358e`。※現在 HEAD ではなく基準 commit。現在位置は git を参照）
- 本番確認: 利用者の Vercel Production / 本番画面実測による **GO（2026-07-04）**。AI が本番接続確認したものではない。作成・編集・アーカイブ・機密ラベル2択（通常/社内限のみ）・監査ログ・既存画面すべて GO。
- 詳細: `docs/audit/41_phase2a3b1_production_confirmation.md`・`docs/audit/14_release_stabilization.md` §41
- （前基準: Phase 2-A-3a = Company Brain read-only 可視化の本番確認 GO（一度 HOLD → 再実測で解消）。以下は当時の記録として保持）
- Phase 2-A-3a 実装 commit: `9533488`
- 本番確認: 利用者実測による **GO（2026-07-03・HOLD解消の再実測）**。詳細: `docs/audit/38_phase2a3a_hold_resolution_go.md`・doc14 §40（HOLD の経緯は doc37・§39）
- （前々基準: Phase 2-A-2 = Company Brain schema 変更の本番確認 GO。以下は当時の記録として保持）
- Phase 2-A-2 実装 commit: `ca18450`
- 本番確認: 利用者の Vercel Production / 本番画面実測による **GO（2026-07-02）**。AI が本番接続確認したものではない。
- 詳細: `docs/audit/35_phase2a2_production_confirmation.md`・`docs/audit/14_release_stabilization.md` §38
- （前々基準: Phase 1-44 = Phase 1-43 `/admin/usage` の本番確認 GO。以下は当時の記録として保持）
- Phase 1-43 実装 commit: `ce858c7`
- Phase 1-44 完了基準 commit（本番確認 GO 記録）: `3e3409f`（※これは「現在 HEAD」ではなく Phase 1-44 の完了基準 commit。現在位置は git を参照）
- 本番確認: 利用者の Vercel Production `main` / CI / 本番画面確認による **GO（2026-07-01）**。AI が本番接続確認したものではない。
- 詳細:
  - `docs/audit/14_release_stabilization.md` §37
  - `docs/audit/15_monetization_usage_design.md` §33.1
  - `tasks/PROGRESS.md` Phase 1-43

## UsageEvent emit 対象（8種類・すべて本番 GO）

| # | 対象 | eventType | category | 本番GO |
|---|------|-----------|----------|--------|
| 1 | LeadMap export | `export.generated` | export | GO |
| 2 | AIOutput（apps/web） | `ai.output.generated` | ai | GO |
| 3 | admin danger-actions export | `export.generated` | export | GO |
| 4 | approvals outreach | `external_send.outreach` | external_send | GO |
| 5 | invoice-send | `external_send.invoice` | external_send | GO |
| 6 | dunning | `external_send.dunning` | external_send | GO |
| 7 | Webhook success | `webhook.delivered` | webhook | GO |
| 8 | worker 朝礼AI出力 | `ai.output.generated` | ai | GO |

- billing は全件 `usage_only`（**非課金記録**）。金額カラムなし。metadata は固定の非PIIキーのみ。
- 可視化は `/admin/usage`（read-only・audit:read ガード・tenantId スコープ・件数と quantity 合計のみ）。

## 現在の安全境界

- 課金なし
- 決済なし
- サブスクなし
- billable_candidate runtime 使用なし
- never_billable runtime 使用なし
- schema / migration / package / lock 変更なし
- 本番DB操作なし
- Prisma migrate 手動実行なし
- 外部送信なし
- 実メール送信なし
- Webhook 実送信なし
- worker / queue / outbox dispatch 手動実行なし

## Phase X（短期品質フェーズ）のタスク一覧（クローズ済み）

> **Phase X の残タスク表はクローズ**（完了記録は `docs/audit/32_phase_x_completion_record.md`・履歴は `tasks/PROGRESS.md`）。以下は完了実績の一覧。X-04 のみ任意候補として残る。

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase X-01 | 本番スモーク / E2E / 検証基盤整理（`docs/audit/26_phase_x01_verification_baseline.md`・GO） | 棚卸し完了（反映状態は git refs を正とする） |
| Phase X-02 | E2E smoke 実行の実証（`docs/audit/27_phase_x02_e2e_smoke_result.md`・環境GREEN／smoke 11本RED・原因特定済み） | 実証完了（反映状態は git refs を正とする） |
| Phase X-RM-01 | 長期構想17領域の非破壊統合＋Phase 2 ロードマップ／Feature Registry／各種 Matrix 作成（`docs/roadmap/00〜08`・`docs/audit/28_long_term_strategy_integration.md`） | 統合完了（反映状態は git refs を正とする） |
| Phase X-RM-02 | Roadmap Review / Gap Reconciliation（追加構想リストとの突合・IKEZAKI MCP/API Gateway 表記統一・分類23項目と Enshin OS 表記ルールの明文化。`docs/audit/29_phase_x_rm_02_roadmap_review.md`） | レビュー完了（反映状態は git refs を正とする） |
| Phase X-03 | E2E smoke green 化（X-03: label関連付け＋X-03b: セレクタ明確化。`docs/audit/30_phase_x03_e2e_green.md`・**smoke 11/11 green**） | green化完了（反映状態は git refs を正とする） |
| Phase X-RM-03 | Phase 2 入口条件の最終確定（`docs/audit/31_phase_x_rm_03_phase2_entry_review.md`・**入口レビュー READY/GO・Phase 2-A 実装は人間承認待ち HOLD**） | 判定完了（反映状態は git refs を正とする） |
| Phase X-CLOSE | Phase X 完了記録（`docs/audit/32_phase_x_completion_record.md`・**Phase X 完了 GO**） | 記録完了（反映状態は git refs を正とする） |
| Phase 2-A | Company Brain foundation の設計準備（doc31 §5 準備メモあり。三段承認: 設計docs→schema→実装） | 候補（**人間の個別承認待ち**） |
| Phase X-04 | 本番スモーク定型化／検証準備 script 化／残り E2E 11スペックの段階実行 | 任意候補・品質追加候補（別承認） |

## 次にやること（人間が選択）

1. **Phase 2-A-3b-1-PROD の main 反映（push-only・別承認）**（本番確認GO記録 doc41＋doc14 §41 の反映）。
2. **Phase 2-A-3b-2: ProductCatalogItem の作成・編集・アーカイブの実装承認判断**（2-A-3b-1 と同じ型の水平展開。AI mutation禁止・label 2択を最初から組み込む）。別承認。
3. **Phase X-04: 本番スモーク定型化・残り E2E 段階実行 または Enshin OS 資料の提供**（任意の品質追加候補・2-A と並行可／Phase 2-F の入力。Enshin は証拠不足のため棚卸し未開始）。別承認。
- いずれの場合も **2-A-3b-2 承認前の追加書き込み実装・writeDataAccess 本実装・Phase 8 実課金には進まない**。

## 今は絶対にやらないこと

- 実課金
- Stripe 等の決済連携
- billable_candidate / never_billable の runtime 使用
- usage cap / alert
- tenant 横断 usage dashboard
- raw metadata viewer
- 個人情報・本文・金額の表示
- schema / migration
- 外部送信
- AI 自動実行範囲の拡張
