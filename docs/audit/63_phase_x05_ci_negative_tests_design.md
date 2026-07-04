# 63. Phase X-05-ENTRY — CI・否定系テスト設計確認（docs-only・判定 READY / GO）

> 品質基盤強化の**実装前設計確認**。今回は **docs-only** であり、**実装なし・workflow作成なし・test作成なし・code変更なし・package変更なし・lock変更なし・DB操作なし・本番接触なし・push なし（commit-only）**。
> 位置づけ: Phase 2-B 正式完了（doc62）直後・次領域着手前。GO済み基準は **Phase 2-B-5 / `83d35bc`** のまま変更しない。

---

## 1. 非エンジニア向け要約

- Phase 2-B までの安全性は「作るときの規律（ゲート検査・承認フロー）」で守られてきました。次の機能に進む前に、**「時間が経っても・誰が触っても・自動で守られ続ける仕組み」**を入れる設計を確定しました。
- 中身は2つ: **① CI（コードを GitHub に上げるたびにテスト・型・lint が自動で走る仕組み）** と **② 否定系テスト（「AIが書き換えられないこと」「権限のない人が拒否されること」など、"できてはいけないこと" を自動で確かめるテスト）**。
- 調査で分かった最重要事実: **AIロールの書き込み禁止を守っている層（actions 層の isHumanUser）には、自動テストが1本もありません**。権限表（rbac）上は AI_AGENT が knowledge:create を持つ（他機能の下書き用）ため、**actions 層が唯一の砦**なのにテストで守られていない状態です。ここを最優先で塞ぎます。
- 判定: **READY / GO**（設計確定。**GitHub Actions の実装も否定系テストの実装も次ミッションの別承認**）。

## 2. なぜ Phase 2-B 完了後の今やるのか

1. Company Brain 3テーブルが本番稼働に入り、**守るべき資産が確定した**（守る対象が動いている今が固定のタイミング）。
2. 次領域（Case Study / Customer Pain）は**PII・許諾・外部公開に近接**するため、着手前に品質ゲートを敷く方が安全（doc50 の評価どおり）。
3. 検証はこれまで全段 green だが、**実行主体がセッション内の手動実行に依存**しており、別経路の変更には何のチェックも走らない（CI 不在は品質評価で 3/10 と自己評価済みの構造弱点）。

## 3. 既存構成の read-only 確認結果（コードの事実）

| # | 確認対象 | 事実 |
|---|---|---|
| 1 | `.github/workflows` | **存在しない（CI ゼロ）**。`.github` ディレクトリ自体なし |
| 2 | ルート scripts | `test`(vitest run)・`typecheck`(pnpm -r)・`lint`(eslint)・`build`(db:generate→web build)・`db:generate/migrate:deploy/seed`・`test:e2e`(playwright) — **必要なコマンドはすべて既存**。新設不要 |
| 3 | 実行環境 | pnpm workspace・`packageManager: pnpm@10.33.0`・`engines.node >=20`（ローカル実測 Node v22） |
| 4 | 単体テスト | **211 tests / 23 files**（packages/shared 20・ai 2・integrations 1）。DB 非依存 |
| 5 | 統合テスト | `*.itest.ts` 25ファイル（packages/db・要DB） |
| 6 | E2E | Playwright smoke **18本**（`apps/web/tests/e2e/smoke.spec.ts`・要 chromium＋DB＋server） |
| 7 | build | `SKIP_DB_SETUP=1 pnpm build` の前例が全フェーズで実証済み（DB 不要でビルド可能） |
| 8 | 安全境界の実装場所 | **isHumanUser は 3つの actions.ts にローカル定義**（brain/policies・catalog・playbooks。shared には無い）。ALLOWED_LABELS（NORMAL/INTERNAL の label制限）も同3ファイル。externalAiAllowed の入力欄 0件・物理削除（delete/deleteMany）0件は grep で確認済み |
| 9 | 既存の否定系テスト | **rbac 層には存在**（`rbac.test.ts`: AI_AGENT の external_send=false・isAiRole=true 等）。**しかし rbac 上 `AI_AGENT → knowledge:create は true`**（他機能の下書き原則用）であり、**Company Brain 書き込み禁止は actions 層の isHumanUser だけが守っている＝この層のテストはゼロ** |
| 10 | ai_reference | knowledge/search が writeAIDataAccess でレコードごと記録。**purpose は質問先頭80字のみ（本文・PII なし）を実装済み** |
| 11 | 本番確認の型 | doc49（§0テンプレート・未記入なら停止・利用者実測のみ）。script化は未実施のまま |

## 4. CI 導入の推奨段階案（実装は別承認）

GitHub Actions を **3段階**で導入する（一気に全部やらない。各段が green になってから次へ）:

- **Stage 1（最優先・DB不要・数分で完走）**: push / PR 時に `pnpm install` → `pnpm db:generate` → `pnpm test` → `pnpm typecheck` → `pnpm lint`。既存 script のみ使用・新コマンド作成なし。Node 20系・pnpm 10.33.0 を明示。
- **Stage 2**: Stage 1 に `SKIP_DB_SETUP=1 pnpm build` を追加（前例実証済みの DB 不要ビルド）。
- **Stage 3（設計のみ・実装はさらに別承認）**: Playwright smoke 18本。CI 上に PostgreSQL（service container）→ `db:migrate:deploy` → `db:seed` → server 起動 → smoke → 後片付け、という手順設計。chromium DL・DB service・シークレット管理（CI 用 DATABASE_URL はダミーDB・**本番の値は絶対に置かない**）の論点があるため、Stage 1/2 の安定稼働後に判断。
- 備考: Vercel 側の lint/typecheck 分離ルール（CLAUDE.md 既知の落とし穴）とは独立。CI は repo 側のチェックであり vercel.json・prebuild に触れない。

## 5. 否定系テストの対象一覧（実装は別承認・優先順）

「できてはいけないことが、本当にできないこと」を自動で確かめる。**対象は Company Brain 3テーブル共通の安全境界**:

| 優先 | テスト | 何を確かめるか | 推奨レイヤ |
|---|---|---|---|
| ★1 | **AIロール拒否** | AI_AGENT / AI_ASSISTANT は CompanyPolicy / ProductCatalogItem / SalesPlaybookEntry の create/update/archive を実行できない（rbac が knowledge:create=true でも actions 層で一律拒否） | 単体（isHumanUser 判定ロジック）＋E2E |
| ★2 | **権限拒否** | knowledge:create / knowledge:update を持たないユーザーは書き込みできず、一覧にボタンも出ない（denied 導線） | E2E |
| ★3 | **label制限** | 受け付ける label は NORMAL / INTERNAL のみ（高機密値を送ると拒否）・高機密ラベルのフォームは表示されない | 単体（検証ロジック）＋E2E |
| ★4 | **externalAiAllowed 封印** | true にする入力欄が存在しない・create 時は false 固定・update で変更されない | 静的チェック＋E2E |
| ★5 | **物理削除禁止** | archive は archivedAt 設定のみ・brain 3actions に delete/deleteMany が存在しない | 静的チェック＋（可能なら）単体 |
| ★6 | **外部LLMゲート** | 外部LLM時は externalAiAllowed=true のみ＋maskText 必須・true UI が無いため注入は構造的にゼロ | 単体（company-brain-reference のフィルタ） |
| ★7 | **ai_reference の purpose** | 本文・PII を入れない（質問先頭80字のみ）実装が維持される | 単体 or 静的チェック |
| ★8 | tenantId スコープ | 参照・書き込みとも tenantId 必須（越境しない） | 統合（itest・要DB）で確認方針 |

- **設計上の論点（実装ミッションで人間判断）**: isHumanUser と入力検証は現在 actions.ts ローカル定義のため単体テスト不可。実装案は2択 — **A. packages/shared へ純粋関数として抽出して単体テスト**（最小のコード変更が発生・挙動不変を3actionsで検証）／**B. E2E＋静的チェック（grep ゲートの script 化）のみで担保**（コード変更ゼロだが実行コスト高）。推奨は **A**（変更は抽出のみ・ロジック不変・修正 Loop 前例の型で安全に可能）。
- **静的チェックの script 化**: 本プロジェクトが毎回手動で回してきた機械ゲート（delete/deleteMany ゼロ・externalAiAllowed 入力欄ゼロ・ALLOWED_LABELS 2択）を `scripts/` の検査スクリプトにして CI Stage 1 に組み込む案。ゲート文化をそのまま自動化するもので費用対効果が最も高い。
- **外部送信が発生しないことの確認方針**: 単体・E2E とも FakeLLM／log メーラーのローカル実行のみ（既存テストと同じ）。CI からも外部送信なし。本番確認系は従来どおり doc49 の型（**§0 テンプレート未記入なら停止**）を維持し、自動化しない。

## 6. 実装順序と承認ゲート（すべて別承認）

1. **X-05-1: CI Stage 1**（workflow 1ファイル新規のみ・アプリコード無変更）→ 動作は GitHub 上の run green を利用者確認。
2. **X-05-2: 否定系テスト第一弾**（★1〜★5。A案なら shared への抽出を含む・test 211→増加・smoke 18→増加）。
3. **X-05-3: CI Stage 2（build 追加）**。
4. **X-05-4 以降（任意）**: Stage 3（smoke on CI）・doc49 の script 化。
- 各段とも: 実装 → 全検証 green → commit-only → push-only 別承認 → 記録、の既存の型を踏襲。**GitHub Actions 実装は次ミッションの別承認・否定系テスト実装も別承認**。

## 7. 今回やらないこと（docs-only の確認）

- **workflow作成なし・test作成なし・実装なし**・package変更なし・lock変更なし・schema/migration/seed/rbac/labels 変更なし・DB操作なし・本番接触なし。
- **Phase 2-C は別承認**（Case Study / Customer Pain の実装にも進まない。進む場合は doc50 と同じ入口レビューから）。
- 実LLMキー設定なし・externalAiAllowed true UI なし・高機密ラベルなし・3c-5 なし・**Phase 8（実課金）なし**・MCP/API公開なし・**ENSHiN OS 外部発信なし**（口コミ投稿・SNS投稿・顧客の声公開なし）・外部送信なし。
- push なし（main 反映は push-only の別承認）。

## 8. 判定

- **判定: READY / GO**（設計確定。既存 script のみで Stage 1 が構成でき、否定系テストの最大の穴＝actions 層 isHumanUser の無テスト状態と、その塞ぎ方の選択肢 A/B まで特定済み。未知の設計論点は A/B の人間判断のみ）。
- 参照: 完了直後の現在地=doc62／本番確認の型=doc49／安全境界の実装=doc39/40/42/57/60／品質の中立評価（CI 3/10・テスト網羅 5/10 の指摘）はチャット記録。
