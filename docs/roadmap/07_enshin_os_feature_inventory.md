# 07. Enshin OS Feature Inventory（Enshin OS 機能棚卸し） — Phase X-RM-01

> 既存プロンプト非破壊・docs-only。**Enshin OS Feature Assimilation Program** の枠組み文書。
> **重要**: 本リポジトリ内に Enshin OS の詳細仕様・機能一覧は存在しない（Phase X-RM-01 時点で未確認）。したがって本書は**インベントリの「枠組みと分類基準」**を固定し、個別機能は「詳細未確認（証拠不足）」として扱う。**推測で Enshin OS の機能を断定しない。**

---

## 1. Enshin OS Feature Assimilation Program（吸収プログラム）の方針

- **全採用方針**: Enshin OS の機能資産は原則すべて「採用候補」として棚卸しする（無条件実装ではない）。
- **無条件実装しない**: 各機能は必ず ①Feature Inventory 登録 → ②369 統合先分類 → ③リスク分類 → ④Phase 分類 → ⑤個別人間承認 の順を通す。
- 369 の既存安全ルール（RBAC・承認制・監査・外部送信制御・非課金原則）が常に優先。Enshin 由来であることは安全条件を緩める理由にならない。

## 2. インベントリの分類軸（Enshin → 369 Mapping の必須項目）

各 Enshin 機能は以下で分類する（Feature Registry doc02 と同じ基準）:

| 分類軸 | 内容 |
|---|---|
| Enshin 機能名 / 概要 | 原名を保持（詳細未確認の場合はその旨明記） |
| Enshin → 369 Mapping | 369 のどの領域（AIOS/BRAIN/SALES/…）・既存モジュールに統合するか |
| Enshin Risk Classification | LOW / MEDIUM / HIGH / BLOCKED（doc02 凡例と同一基準） |
| Enshin Automation Level分類 | L0〜L7（doc08 基準。L5 以上は future/blocked） |
| Enshin UsageEvent分類 | 将来 emit 候補か（現時点で emit 追加しない） |
| Enshin Phase分類 | Phase 2〜9 / future / blocked への送付先 |
| Enshin由来機能のMCP/API分類 | doc06 の Exposure 8区分 |
| Enshin由来機能の課金分類 | doc05 の課金分類（実課金は Phase 8） |
| 証拠レベル | 仕様の確認状況（Level 0: 未確認〜Level 2: 文書確認済み） |

## 3. 現時点のインベントリ（Phase X-RM-01 時点）

| # | Enshin 機能 | Mapping | Risk | AL | Phase | 証拠レベル | 状態 |
|---|---|---|---|---|---|---|---|
| E-000 | （全機能） | 未確定 | 未分類 | 未分類 | 2-F で棚卸し | **Level 0（詳細未確認）** | **証拠不足 — Enshin OS の機能一覧・仕様書が本リポジトリ/セッションに未提供のため、個別登録を行わない** |

> 個別機能を推測で列挙・断定することは既存ルール（推測より証拠）に反するため行わない。行 E-000 は「未取得」という事実の記録である。

## 4. Phase 2-F（Enshin Feature Inventory）の作業計画

1. **入力の受領**: 人間から Enshin OS の機能一覧・仕様・スクリーンショット等の証拠を受け取る（アップロードまたは repo 内 docs 化）。
2. **棚卸し**: 機能ごとに §2 の分類軸で本書の表へ登録（1機能1行）。
3. **統合先分類**: 369 の17領域・既存モジュールへの Mapping を確定。重複機能（369 に既にあるもの）は「吸収済み/差分のみ」と分類。
4. **リスク・Phase 分類**: HIGH/BLOCKED（課金・外部送信・人事・物理）を先に隔離。
5. **人間レビュー**: 分類結果の承認。実装候補は各 Phase の計画に編入（実装はその Phase の個別承認）。

## 5. 安全条件

- Enshin 由来機能の実装は、本インベントリ登録＋分類＋個別承認なしに開始しない。
- Enshin 由来であっても、実課金（Phase 8 前）・MCP/API 公開・L5 以上自動化・ロボット実行・採否/評価/給与判断は本 roadmap の禁止事項に従う。
- 詳細未確認の機能について「ある/ない」「できる/できない」を対外的に断定しない。
