# 22. 状態管理ドキュメントの役割定義 — Phase 1-47

> docs-only の運用ルール固定。**コード実装・emit 追加・schema/migration・課金・決済・認証/RBAC 変更は含まない。**
> フェーズ: Phase 1-47 / 種別: docs-only / 現在位置は git refs（`git rev-parse` 等）を正とする。

---

## 1. 非エンジニア向け要約

- **なぜ今回この整理が必要か**: これまでの品質低下の主因は、`PROGRESS.md` などに「push未実施」「人間承認待ち」のような**その瞬間しか正しくない状態**を書いてしまい、次の作業で古くなって現在地が分からなくなることでした。Phase 1 を安全に閉じるため、「どの文書に・何を・いつ書くか」を1回だけ決めて固定します。
- **各文書の違い（ひとこと）**:
  - `tasks/CURRENT_STATE.md` = **今どこにいるか**（現在地の1枚サマリー）
  - `tasks/PROGRESS.md` = **何をやってきたか**（履歴・判断ログ）
  - `docs/audit/usage_event_emit_matrix.md` = **利用量記録の一覧**（emit 8種類の正本）
  - `docs/audit/14_release_stabilization.md` = **本番で確認できた事実**（GO/HOLD 記録）
  - `docs/audit/15_monetization_usage_design.md` = **UsageEvent/Monetization の詳細設計史**
  - `369-vault/` = **なぜそうするか**（思想・プロンプト・知識）
- **今後迷ったら**: 「今の状態」→ CURRENT_STATE＋git、「経緯」→ PROGRESS、「利用量の種類」→ matrix、「本番確認」→ doc14、「設計理由」→ doc15、「考え方・プロンプト」→ 369-vault。

## 2. 目的

- Phase 1 終盤で状態管理を崩さない（陳腐化・矛盾・迷子情報を作らない）。
- **一時状態の永続化を防ぐ**（一時状態は最終報告で扱い、永続 docs に固定しない）。
- Phase 1-48（最終監査）→ 1-49（完了判定）→ 1-50（完了記録）を安全に進められる情報構造にする。

## 3. 各ドキュメントの役割

| ドキュメント | 役割 | 書くもの | 書かないもの |
|---|---|---|---|
| `tasks/CURRENT_STATE.md` | 現在地の1枚サマリー | 最新の本番確認GO済みプロダクト基準（実装/完了基準 commit）、UsageEvent emit 対象、安全境界、残タスク、次にやること | 現在HEADなどの固定 commit 値、「push未実施」等の一時状態、履歴の羅列 |
| `tasks/PROGRESS.md` | 履歴・判断ログ | Phase ごとの実施内容・判断・結果（確定した事実） | 次回セッションで古くなる一時状態、未確定の予定を完了扱いする記述 |
| `docs/audit/usage_event_emit_matrix.md` | UsageEvent emit 対象8種類の**正本一覧** | eventType / category / sourceType / metadata固定キー / idempotencyKey方式 / billing(usage_only) / 本番GO | 実データ、PII、金額、secret、raw metadata |
| `docs/audit/15_monetization_usage_design.md` | UsageEvent / Monetization の詳細設計履歴 | Phase ごとの設計・実装・判定（§番号で蓄積） | 現在HEADなどの一時状態 |
| `docs/audit/14_release_stabilization.md` | 本番確認記録 | **利用者実測に基づく** GO / HOLD / NG（AIは本番接続確認できない旨を明記） | 実測していない成功、推測GO |
| `369-vault/**` | 思想・プロンプト・知識ベース（why） | 思想、判断の理由、プロンプトの型、用語、落とし穴 | 現在HEAD固定値、secret、PII、本番データ、危険指示 |

## 4. 更新タイミング

| ドキュメント | 更新タイミング |
|---|---|
| CURRENT_STATE | **大きな節目のみ**（Phase クローズ・基準 commit 更新時。毎コミットでは更新しない） |
| PROGRESS | **Phase ごと**（そのPhaseの確定事実を1回で記録） |
| emit matrix | **emit 対象が変わる時のみ**（追加・削除・仕様変更。それ以外は触らない） |
| doc14 | **本番確認の実測値が揃った時のみ**（空欄・未確認なら HOLD で書かない） |
| doc15 | UsageEvent / Monetization 関連の Phase 実施時 |
| 369-vault | 思想・プロンプト・知識が増えた時（追記時は index からリンク＋危険文言/secret チェック必須） |

## 5. 禁止表現・禁止運用

以下は**原則として永続 docs に書かない**（書くのは本節のような「禁止例の列挙」としてのみ）。

- 「push未実施」「人間承認待ち」「ローカル実装完了」等の一時状態を状態行に書くこと
- 現在HEAD・現在origin/main・現在ブランチ等の**その時点の固定値**を本文に書くこと（固定してよいのは「実装 commit」「完了基準 commit」だけ）
- 未確認のGO（実測値なしの本番確認記録）
- secret / credential の実値、DB接続文字列
- PII（顧客名・email・電話・住所）・本文・raw metadata
- 課金額・請求額（UsageEvent は非課金。金額を書く場所ではない）

## 6. Source of Truth（迷ったらここ）

- **現在の git 反映状態** = git refs が正（`git rev-parse --short HEAD` / `git rev-parse --short origin/main` / `git log --oneline origin/main..HEAD` / `git status --short`）
- **現在地サマリー** = `tasks/CURRENT_STATE.md`
- **履歴** = `tasks/PROGRESS.md`
- **emit 一覧** = `docs/audit/usage_event_emit_matrix.md`
- **本番確認** = `docs/audit/14_release_stabilization.md`
- **詳細設計** = `docs/audit/15_monetization_usage_design.md`
- **思想・プロンプト・知識** = `369-vault/`（CLAUDE.md の同期ルールに従い、知識更新時は vault にも反映）

## 7. Phase 1 終盤の運用

| フェーズ | 内容 |
|---|---|
| Phase 1-48 | Phase 1 最終セキュリティ・権限・非課金監査（tenant分離 / RBAC / metadata非表示 / 金額なし / 課金なし / schema不変の横断確認） |
| Phase 1-49 | Phase 1 完了判定レポート（完了済み / 未完了 / 証拠不足 / Phase 2 以降へ送るもの） |
| Phase 1-50 | Phase 1 完了記録・次 Phase 選定 |
| それ以降 | **実課金は Phase 1 完了後・別設計・別承認**（usage_only の非課金原則は Phase 1 中は不変） |

## 8. GO / HOLD 判定

- **判定: GO（docs-only の役割固定として）**。
- 実装なし・emit 追加なし（**8種類のまま**）・課金なし・決済なし・schema/migration なし・認証/RBAC 変更なし。
- 変更ファイルは docs/tasks/vault のみ。コード挙動は不変。
- 次は Phase 1-48（最終セキュリティ監査）。別承認。

> 注: 本書は運用ルールの固定であり実装ではない。各文書の役割を変更する場合は、本書を先に更新してから行う。
