# CI Stage 3 E2E 設計と実装 — 自動チェックに画面通しテストの第3段を足した回（設計 HOLD → CI実装 完了・Phase 3 進入は HOLD）

> 出典（正本）: `369` リポジトリ `docs/audit/129_ci_stage3_e2e_design.md`（判定 HOLD・設計 docs-only 完了）＋ `docs/audit/130_ci_stage3_e2e_implementation.md`（判定 CI実装 完了／e2e 実 green は push→CI で確認・Phase 3 進入は HOLD）。本ノートはその要約。
> 関連: [[PhaseX05静的安全ゲートCI実走確認]] / [[CIStage3E2E失敗修復と72Green化]]

## これは何か

- Phase 3 前の残り宿題「画面通しテスト（e2e）の自動チェック」を GitHub の自動チェック（CI）に足すため、まず**設計図を紙で作り**（doc129）、次にその設計どおり **CI の第3段ジョブ `stage3_e2e` を実際に追加した**（doc130）2回分の記録です。
- 変えたのは CI の設定ファイル1つ（`.github/workflows/ci.yml`）だけ。アプリ本体・データベースの定義・権限は一切変えていません。従来の CI 第1段（安全チェック・自動テスト・型チェック・書式チェック）も不変です。

## どんな仕組みか（やさしい言い換え）

- CI の中に**使い捨ての練習用データベース**（pgvector の一時 Postgres・本番には一切つながない）を立てる。
- そこに既存の migration を適用し、デモデータ（seed）を入れる → アプリを組み立て（build）→ 起動 → **chromium 上で Playwright の画面通しテスト（12 spec）を実走**する。
- 封印された安全設定のまま動かす: メール送信は**しない**（`EXTERNAL_SEND_ENABLED=false`・ログのみ）／AIは本物ではなく**ダミー**（`LLM_PROVIDER=fake`＝FakeLLM）でお金がかからない／秘密情報（secrets）は不要。
- 実装前に「事前停止条件」（seed が外部依存しないか等）を read-only で確認してから着手し、すべて解消済み。

## 変わらない約束

- **schema変更なし・新規 migration作成なし・RBAC変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・本番DB非接続。**
- e2e が本番系に触れない設計（使い捨てDBのみ）を必須条件として明記。安全検証は green。
- GitHub が正本、Obsidian はナレッジ。

## 次の一手（すべて人間判断・別承認）

1. push して GitHub Actions 上で `stage3_e2e` を実際に走らせ、e2e の実 green/red を確認
2. green なら「Phase 3 移行 GO（最終 Phase Gate 承認待ち）」を docs-only で記録、red なら失敗を分類（修正は別承認）
3. Phase 3 進入そのものは、e2e 実 green ＋ 最終の**人間 Phase Gate 承認**がそろってから

## 現在地

現在地は `369` の `tasks/CURRENT_STATE.md`＋git refs を正とする。
