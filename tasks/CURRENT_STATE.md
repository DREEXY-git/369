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
- **現在の Phase: Phase X（短期品質フェーズ・人間判断で選定）**。品質改善・検証基盤・本番スモーク・E2E環境・UI確認・ドキュメント整合を短期で固める。
- **Phase 8（実課金・Stripe・usage billing・credits・cap/alert）には進まない**（Phase X 完了後も別設計・別承認が前提）。

## 最新の本番確認GO済みプロダクト基準

- 最新の本番確認 GO 済みプロダクト基準: **Phase 1-44**
- 内容: **Phase 1-43 read-only UsageEvent 利用量サマリー（`/admin/usage`）の本番確認 GO 記録**
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

## Phase X（短期品質フェーズ）の残タスク

> Phase 1 の残タスク表はクローズ（履歴は `tasks/PROGRESS.md`・記録は `docs/audit/25_phase1_completion_record.md`）。以下は Phase X の初期計画。X-02 以降は Phase X-01 の結果を見て確定する。

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase X-01 | 本番スモーク / E2E / 検証基盤整理（`docs/audit/26_phase_x01_verification_baseline.md`・GO） | 棚卸し完了（反映状態は git refs を正とする） |
| Phase X-02 | E2E smoke 実行の実証（`docs/audit/27_phase_x02_e2e_smoke_result.md`・環境GREEN／smoke 11本RED・原因特定済み） | 実証完了（反映状態は git refs を正とする） |
| Phase X-03 | E2E red の修正方針決定＋最小修正＋smoke 再実行（案A: ログインフォームの label 関連付け付与が推奨候補） | 次（候補・別承認） |
| Phase X-04 | 本番スモーク定型化／検証準備 script 化／残り E2E 段階実行 | 候補（X-03 後に確定） |

## 次にやること（1つだけ）

- **Phase X-03: E2E red の修正方針決定＋最小修正＋smoke 再実行**（案A=`/login` フォーム等の label に `htmlFor`＋input に `id` を付与〈アクセシビリティ改善込み・推奨候補〉／案B=テスト側セレクタ変更。人間がどちらかを選択 → 最小修正 → verify → smoke 11本再実行で green 確認）。別承認。

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
