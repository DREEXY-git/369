# 63. WIP1（CRM 閲覧境界）＋WIP2（Growth Event Ledger 可視化）クローズ正本化（Candidate・docs-only）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/162_wip1_wip2_closeout.md`
- 実行形態: 連続前進オートパイロット v5.2（WIP 順序厳守・push GO 2回・敵対的レビュー計5視点）

## 1. commit 連鎖と CI

| WIP | 内容 | commit | CI |
|---|---|---|---|
| WIP1 設計+Gate | 全経路監査・Gate 全 PASS（roadmap61/audit160） | `19ff866` | — |
| WIP1 実装 | 閲覧境界7経路クローズ＋e2e 3件（80→83） | `e77870c` | — |
| WIP1 レビュー修正 | critical 1（e2e waitForURL）・medium 2・low 2 | `6961a72` | **run 29135772068 #159 = success・`83 passed (1.2m)`/0 failed・env fake/log/false・customers_boundary 3件 ✓（ログ本文確認）** |
| WIP2 設計+Gate | roadmap62/audit161・Gate 全 PASS | `50afc9c` | — |
| WIP2 実装 | Growth Event Ledger read-only 集計表示＋e2e 2件（83→85） | `662e745` | — |
| WIP2 レビュー修正 | medium 1（finance 件数の算術復元遮断）・low 2 | `8222bcb` | **push 後 CI で 85/0 見込み（確定値は push 後にログ本文で確認し、本書の次版または最終報告に記録）** |
| クローズ正本化 | 本書＋audit162＋CURRENT_STATE/PROGRESS/Dashboard＋vault | 本 commit | 同上 |

## 2. WIP1 で閉じた閲覧境界（要旨・詳細は roadmap61）

7つの穴（一覧の無権限全行表示／詳細の取得後判定／拒否画面の顧客名表示／edit 素通し／timeline・insights の ABAC 欠如／insights の render 時 LLM 送出構造／update の label 判定なし）をすべて閉鎖。**customer:read をデータ取得前に適用・二段階取得（envelope→ABAC→本体・label 固定で TOCTOU 閉鎖）・拒否画面から PII 撤去・render 時 AI 呼び出し撤去・一覧の label クエリ除外（非マネージャは高機密6種も除外）**。Contact = `NO_DIRECT_RUNTIME_SURFACE` 証拠化。**doc125 の HOLD は本証拠で追記クローズ**（Customer 閲覧統制は詳細・一覧・派生3画面・action で閉鎖。「CRM 全体完成」とは呼ばない — join 経路・一覧 DataAccessLog・ページ権限ゲート等の残課題は §5）。

## 3. WIP2 で見えるようになったもの（要旨・詳細は roadmap62）

Control Tower に「成果と削減時間（Growth Event Ledger）」read-only セクション: 直近7日/30日件数・カテゴリ別・売上効果・コスト削減・削減時間（自己申告集計と明記・「検証済み」とは呼ばない）・未計測/データ不足の明示・`/growth/events` への安全リンク。**金額は canViewFinance のみ・非財務閲覧者には finance カテゴリを件数集計から完全除外（算術復元・存在シグナルも遮断）**。イベント発火・状態変更・外部送信・AI 実行なし。

## 4. Function ID 単位 Evidence（roadmap58 暫定正本・`ATOMIC_LEDGER_SYNC_PENDING`）

- C08-001/004/019/020/023/024/025（Customer/Contact/PII 列）: 閲覧境界クローズ済み（roadmap61 §2 監査表＋実装）。
- C03-006/015（顧客単位・データ分類別権限）: 二段階取得＋label クエリ除外＋ABAC 配線で実装済み。
- C39-003/004/038（RBAC/ABAC/PII Access）: 既存定義のまま適用順序を是正・拒否ログ整合。
- GAR-042（PII 外部送信禁止）: render 時 LLM 送出経路を構造遮断（repo 全体で Customer→LLM の render 経路ゼロをレビューで証明）。GAR-051: tenantId 全クエリ維持。GAR-014: 拒否含む監査痕跡を対称化。
- C18-001/031/037・C28-002・USR-004: 既存台帳の read-only 可視化＋データ不足明示＋成果/削減時間表示（自己申告注記つき）。
- C46-032/033/048: CI ログ本文検証・テスト 85 件体制・実装前監査2本（roadmap61/62）。

## 5. 残課題（次の WIP 候補・1件だけ選ぶ）

1. **既存 /growth ページの集計値が権限ゲートなし**（roadmap62 Unknown・金額を含む）— 推奨次 WIP。
2. Control Tower ページ自体の resource 権限ゲート不在（READ_ONLY/EXTERNAL も到達可）。
3. Customer 一覧の DataAccessLog 不在（詳細との粒度差）／join 経路（print/quotes 等）の閲覧統制監査。
4. Topbar の承認件数が全ロールに無ゲート表示（roadmap60 §4 INFO）。

## 6. 判定

**WIP1 = 完全クローズ（CI 83/0 ログ本文確認済み）／WIP2 = 実装・レビュー・修正完了（CI 確定は push 後）／STOP 発動ゼロ／schema・migration・seed・RBAC 定義・label 許可表・ci.yml・package/lockfile 不変／外部送信・実LLM・課金・本番なし**。
