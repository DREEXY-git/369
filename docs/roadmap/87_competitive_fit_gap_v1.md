# roadmap87 — 長期 Fit-Gap 正本 v1（Salesforce / MoneyForward / freee / 人事・労務 / 電子帳簿）

> 種別: docs-only（v7.2 Lane F）。branch `claude/competitive-fit-gap-roadmap-v1`（base = PR #18 `fa04e74`）。
> 根拠は**各社の公式公開資料（機能紹介ページ・ヘルプ・法令の公表資料）の一次情報のみ**とし、
> 具体的な仕様数値・画面・文言は引用も模倣もしない。**完成宣言・競合同等以上の宣言はしない。**
> 照合先の正本は `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md`（50カテゴリ・読み取りのみ・非編集）。

## 0. 分類の定義（6区分）

| 区分 | 意味 |
| --- | --- |
| 実装済み | Draft branch 上に動く縦切りがあり CI green（main/Production 未統合＝`DRAFT_IMPLEMENTED`/`CI_VERIFIED` 止まり） |
| 部分実装 | 一部の画面/モデル/純ロジックのみ存在（完成主張しない） |
| 未実装 | コード上の証拠なし |
| ROADMAP_ONLY | 設計/受入条件のみ正本化済み（実装なし） |
| 外部連携候補 | 自前実装せず公式 API 連携が本筋（connector Gate = 人間承認） |
| 人間Gate | 機能の性質上、実装しても最終判断・実行は人間限定（AI 断定・自動実行を恒久的に作らない） |

## 1. Salesforce 級 CRM/SFA（台帳 C08/C09/C10/C12/C26/C28 に対応）

| 機能領域（公式公開資料の粒度） | 369 現状 | 区分 | 依存 / 受入条件 |
| --- | --- | --- | --- |
| 取引先・顧客360（基本情報/活動履歴/タイムライン） | Customer/Contact/Timeline/Interaction 実装・PII 29経路台帳と可視ラベルガード | 部分実装 | 受入=可視ラベル fail-closed 維持・新規表示経路は PII 台帳へ追記 |
| 商談パイプライン（ステージ/確度/金額） | Deal（11 stage・確度・金額）・一覧/詳細 | 部分実装 | 受入=stage 遷移の監査・finance 境界（WIP-3/4）非退行 |
| リード管理・スコアリング | LeadMap AI（地図×リード抽出・stage 管理）実装 | 部分実装 | 受入=同意/抑止/承認送信の封印維持 |
| 見積・CPQ | Quote 実装（原価/粗利は quote:read 境界） | 部分実装 | 高度な構成価格（CPQ）は未実装＝ROADMAP_ONLY |
| 請求 | Invoice 実装（正式化/送付は承認必須） | 部分実装 | 受入=invoice_finalize/send の人間承認不変 |
| レポート/ダッシュボード | Growth OS・Control Tower・BI 断片 | 部分実装 | 自由レポートビルダーは未実装 |
| 売上予測（フォーキャスト） | 未実装（推測値を出さない方針と両立させる設計が必要） | 未実装 | 受入=実測由来と推定の分離表示（outcome-evidence 規律） |
| ワークフロー自動化（Flow 相当） | Workflow **Dry Run のみ**（v7.2 Lane D・実行なし） | 部分実装 | 実行系は schema＋実行 Gate（人間承認）が先 |
| 外部メール/カレンダー連携 | 未実装 | 外部連携候補 | connector Gate（OAuth/Secrets = 人間） |
| AppExchange 級拡張 | C32/C33 台帳のみ | ROADMAP_ONLY | — |

**次の薄い縦切り（優先順）**: ①商談ステージ遷移の監査＋実測ファネル表示（C09・schema 不要）②Quote→Invoice の変換整合テスト強化（C10/C12）③フォーキャストは「実測パイプライン集計のみ」版（推定なし・C28）。

## 2. MoneyForward / freee 級 会計・財務（C12/C13/C14 に対応）

| 機能領域 | 369 現状 | 区分 | 依存 / 受入条件 |
| --- | --- | --- | --- |
| 仕訳帳・元帳・試算表 | Journal 断片（journal_finalize は承認必須）・完全な複式試算表なし | 部分実装 | P5-ACC-01（schema 要・`SCHEMA_CHANGE_APPROVAL_REQUIRED`） |
| 請求書発行・入金管理 | Invoice/入金・督促（dunning は承認必須） | 部分実装 | 外部送信封印不変 |
| 銀行/カード明細の自動取込 | 未実装 | 外部連携候補 | 金融 API connector = 人間 Gate（Secrets/OAuth） |
| 経費精算 | 未実装 | 未実装 | P5-ACC 系 schema 承認後 |
| 決算・申告支援 | 未実装 | 人間Gate | **税務断定は AI 恒久禁止**（リスク提示＋専門家相談まで） |
| 給与計算連携 | 未実装 | 未実装 | C24 と同時設計（payroll_process は承認必須のまま） |

**次の薄い縦切り**: 「仕訳候補の read-only 表示（人間確定・自動記帳なし）」— schema 承認後の最初の1本（roadmap83 §5 の P5-ACC-01 と同一）。

## 3. 人事・労務（C23/C24 に対応）

| 機能領域 | 369 現状 | 区分 | 依存 / 受入条件 |
| --- | --- | --- | --- |
| 従業員台帳 | EmployeeProfile（最小） | 部分実装 | HR_CONFIDENTIAL 境界の維持 |
| 勤怠管理 | 未実装 | 未実装 | P5-HR-01（schema 要） |
| 給与明細・年末調整 | 未実装 | 人間Gate | 支給・控除の確定は人間限定（payroll_process 承認必須） |
| 入退社・社会保険手続き | 未実装 | 人間Gate | 労務助言の AI 断定禁止（確認観点の提示まで） |
| 採用（求人・選考） | 未実装 | 人間Gate | **採否判断は `HUMAN_ONLY` 恒久**（roadmap80 §9 不変） |

**次の薄い縦切り**: 従業員台帳の閲覧境界テスト強化（既存 schema・HR ラベルの否定 E2E）— schema 不要で今すぐ可能。

## 4. 電子帳簿保存（法対応・C14/C37 に対応）

| 要件領域（公表されている制度区分） | 369 現状 | 区分 | 依存 / 受入条件 |
| --- | --- | --- | --- |
| 電子取引データ保存（真実性・可視性） | 未実装 | ROADMAP_ONLY | P5-EBK-01: 保管方針の正本化が先（訂正削除履歴・検索要件は schema 要） |
| スキャナ保存 | 未実装 | 未実装 | 同上＋MinIO 保管ポリシー設計 |
| 検索要件（取引日付・金額・相手先） | Invoice 等に素データはあるが要件準拠の検索/固定は未実装 | 部分実装 | 要件準拠を「準拠」と宣言するのは人間＋専門家確認後 |
| タイムスタンプ/事務処理規程 | 未実装 | 人間Gate | 規程整備は人間・システムは補助のみ |

**注**: 法要件への「対応済み」宣言は本 roadmap では行わない（実装しても専門家確認 = 人間 Gate が最終判断）。

## 5. Phase 0-20 への接続と優先順位

- **現在地**: Phase 3（Growth Engine v0）RC 待ち・Phase 3.5（C19/C21/C22）Draft・Phase 4（Control Plane/実行制御）Draft。
- **W1（RC 後すぐ・schema 不要）**: §1-①②・§3 の境界テスト・C22 の ContentAsset 保存縦切り（roadmap84 §4）。
- **W2（schema 承認後）**: P5-ACC-01（仕訳候補 read-only）→ C22 紹介台帳本体 → C24 勤怠最小。
- **W3（connector Gate 後）**: 銀行明細取込・メール/カレンダー連携・広告 API（C19 本体）。
- **恒久 HUMAN_ONLY（Wave に載せない）**: 実送金・税務/労務断定・採否/評価確定・外部公開の最終判断。

## 6. 安全宣言

本書は docs-only。各社製品の UI・文言・コードの模倣はしない。「競合同等以上」「完成」は宣言しない。
分類は 2026-07-12 時点の Draft branch 群の実態（git refs が正）に基づき、Codex の完全機能台帳
（`docs/function-master/**`・非編集）と ID 粒度の突き合わせは Codex 側の Evidence 更新に委ねる。
