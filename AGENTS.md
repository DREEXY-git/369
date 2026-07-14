# AGENTS.md — IKEZAKI OS（統合AI経営OS） + LeadMap AI

このファイルは Codex が次回作業時に参照する開発・運用ガイドです。
ユーザーの最新指示が常にこのファイルより優先されます。

## Codex運用安全ルール
- 作業開始時は必ず read-only scout から始め、現在フォルダ・主要構成・git status・差分の有無を確認してから判断する。
- ファイル編集・commit・push・PR作成は、ユーザーの明示承認がある場合のみ行う。承認範囲外のファイルは触らない。
- `pnpm db:seed` / `pnpm db:reset` / `pnpm db:migrate` / `pnpm db:push` / `pnpm db:migrate:deploy` / `prisma migrate deploy` は、ユーザーの明示承認なしに実行しない。
- 本番環境、Supabase、Vercel、課金、認証、RBAC、個人情報、外部送信、メール送信、Google Maps本番キー、外部LLM本番キーには、ユーザーの明示承認なしに触らない。
- `.env` や実Secretsは読まない。Secrets / token / API key / 個人情報を発見しても値を出力しない。
- 報告は日本語で、非エンジニアにも分かるように、事実・推測・リスク・次の推奨アクションを分ける。
- 本番DB・外部API・実メール・実LLM・課金・削除・エクスポートを伴う作業は、read-only確認後に必ず停止して人間判断を待つ。

## プロダクト概要
中小企業向けの統合AI経営OS（経営/営業/CRM/会計/財務/人事/在庫/会議/ナレッジ/AI社員）。
中核に **LeadMap AI**（地図×AIの新規開拓OS：リード抽出→AI分析→個別営業メール→承認→送信→追客→商談化）。
APIキー無しでも FakeLLM / DemoMapProvider でフル機能がデモ可能。実用MVP。

## 技術スタック
TypeScript strict, pnpm workspace, Next.js 15 (App Router, RSC + Server Actions), React 19,
Tailwind v3, Prisma 6 + PostgreSQL(pgvector), Redis + BullMQ, MinIO, Mailpit, Zod, Vitest, Playwright.
認証は自前（bcryptjs + jose 署名Cookie）。

## ディレクトリ構成
```
apps/web        Next.js（app/ ルーティング, components/, lib/, app/**/actions.ts がServer Actions）
apps/worker     BullMQ ワーカー（src/jobs.ts に18ジョブ, src/index.ts でブート）
packages/db     Prisma schema(prisma/schema.prisma), client(src/), seed(prisma/seed.ts)
packages/shared 純粋ロジック + 単体テスト（DB非依存）。RBAC/labels/masking/finance/inventory/leads/knowledge/anomaly/approval/suppression/relevance/format
packages/ai     providers/(LLM/Embedding/Transcription, Fake+OpenAI+Anthropic), prompts, schemas(Zod), tasks
packages/integrations maps/(demo,google), email/(log,smtp), web/fetcher(SSRF), connectors/mock
infra/docker    web/worker Dockerfile
```

## 開発コマンド
```
pnpm dev / build / start          # web
pnpm worker:dev / worker:start    # worker
pnpm db:migrate / db:seed / db:generate / db:reset
pnpm test / typecheck / lint / format
pnpm --filter @hokko/db test:integration   # 統合テスト（要DB）
pnpm test:e2e                               # Playwright（要 chromium）
```
DB変更・DB投入・migrate系コマンドは、明示承認なしに実行しない。

## 実装ルール
- **薄い縦切り優先**: 重要テーブル/API/UI/デモデータ/権限/監査ログを必ず通す。
- 全モデルに `tenantId`（スカラ）。クエリは必ず `tenantId` でスコープ。Tenantへのリレーションは張らない。
- 変更系は Server Action（`app/**/actions.ts`）で: 認証→権限(`hasPermission`)→Zod相当の入力検証→DB→`writeAudit`→`revalidatePath`/`redirect`。
- **パッケージ間の相対importは拡張子なし**（webpack/tsc/tsx/vitest 全てで解決させるため）。`.js` を付けない。
- UIは日本語。空画面を作らない。shadcn風プリミティブは `apps/web/components/ui.tsx`。
- Decimal列はUI側で `toNumber()`（`apps/web/lib/utils.ts`）。
- 重要操作は `ApprovalRequest` を作る。AIの生成物は必ず下書き。

## セキュリティルール
- secretは `.env` のみ。`.env.example` に実値を入れない。
- RBAC=`packages/shared/rbac.ts`（10ロール×8アクション、ワイルドカード対応）。機密ラベル=`labels.ts`。
- 監査ログ=`writeAudit`、機密参照（AI含む）=`writeDataAccess`（`apps/web/lib/db.ts`）。
- 外部URLフェッチは `safeFetch`（SSRFガード/allowlist/timeout/サイズ上限）経由のみ。
- 危険操作（外部送信/契約/請求/支払/削除/エクスポート/人事）は `requiresApproval` で承認必須。
- **AIは外部送信・承認・削除を持たない**（`ROLE_PERMISSIONS` の AI_AGENT/AI_ASSISTANT を変更しない）。外部送信は `EXTERNAL_SEND_ENABLED=true` + 人間承認時のみ。

## AI機能のルール
- Provider は `getLLMProvider()/getEmbeddingProvider()/getTranscriptionProvider()`（env未設定で自動Fake）。
- AIタスクは `packages/ai/src/tasks.ts`。各タスクに `fakeX()` 実装があり、実LLM失敗時もfakeにフォールバック。
- 出力は Zod スキーマ（`schemas.ts`）で検証。FakeLLM でも入力データに基づく**それらしい日本語**を返す。
- AIは法務/税務/労務/財務を**断定助言しない**。リスク・確認観点・専門家相談候補に留める。
- AI回答には可能な限り 参照元/根拠/信頼度/推奨アクション を残す。外部LLM送信前に `maskText` 可。
- 新しいAIタスクを足す時はプロンプト（`prompts.ts` の `PROMPT_TEMPLATES`）と seed への登録も検討。

## Google Maps / Places 利用ルール
- 規約違反のスクレイピング禁止。公式API/許諾データ/アップロード/デモのみ。
- リード/スナップショットに `source/placeId/fetchedAt/expiresAt/attributionRequired/cachePolicy` を必ず保持。
- Google由来は Google Maps 上に帰属表示付きで表示し、非Google地図に混在させない（Demoは非Google地図 `components/leadmap/demo-map.tsx`）。
- 期限切れGoogleデータはUIで明示し、再取得/再確認扱い。

## メール営業利用ルール
- 同意管理(`ConsentRecord`)・配信停止(`SuppressionList`)・送信者情報・送信前承認・送信ログ(`OutreachSendLog`)・抑止リストを必須。
- AI生成営業文は必ず `OutreachDraft`（下書き）。送信は `/approvals` 承認後、`decideApprovalAction` 経由。
- 送信前に `isSuppressed` で抑止確認。返信に `detectUnsubscribeRequest` を検知したら `SuppressionList` へ追加。
- 大量迷惑送信を助長する実装にしない。

## テスト方針
- 単体（`*.test.ts`, DB非依存）= `pnpm test`。純粋ロジックとFakeLLMタスクは必ずカバー。
- 統合（`*.itest.ts`, 要DB）= `packages/db` に集約。
- E2E（Playwright）= `apps/web/tests/e2e`。要 chromium。
- 変更後の検証コマンドは、ユーザーの許可範囲と環境制約に従って実行する。依存取得・DB・Playwrightが必要な場合は、明示承認なしに進めない。

## 次回作業時の注意点 / 既知の落とし穴
- **autoprefixer を PostCSS に戻さない**: `tailwindcss` の jiti 設定ローダ（peer に tsx）が `browserslist` のロードを壊し `next build` が失敗する。現状 `postcss.config.cjs` は tailwindcss のみ。tailwind/postcss 設定は **`.cjs`（CommonJS）**で維持（web は `"type":"module"`）。
- パッケージ間importに `.js` 拡張子を**付けない**（付けると webpack が解決失敗）。
- Next 15 では `params`/`searchParams`/`cookies()` が **async**。`await` する。
- ローカル検証環境では Postgres/Redis をネイティブ起動（`/var/lib/pg-ikezaki`、`redis-server --daemonize`）。Docker daemon は要 `sudo dockerd`。起動・DB接続は明示承認後のみ。
- Playwright のブラウザDLは本サンドボックスのネットワークでは失敗する。依存DLやブラウザDLは明示承認後のみ。
- `prisma migrate reset`（= `pnpm db:reset`）は Codex 実行を検知して**安全ガードで拒否**される。クリーンに再投入したい時の `pnpm db:seed` もデータ破壊を伴うため、必ず明示承認後に実行する。
- 機能拡張は「動く薄い縦切り」で。巨大な未完成より、CRUD+権限+監査+デモデータの一気通貫を優先。
- **Vercel デプロイ/チェックの責務分離**: `lint`/`typecheck` は **`prisma generate` のみ**前段で実行し（`prelint`/`pretypecheck`）、`prisma migrate deploy`/`vercel-setup` は実行しない。DB スキーマ反映（migrate/seed）は **`build` の `prebuild`（= generate + vercel-setup）でのみ**実行し、`vercel-setup.mjs` は `VERCEL` 未設定または `SKIP_DB_SETUP=1` でスキップする。typecheck は `@hokko/db` 経由で `@prisma/client` 型に依存するため、生成済みクライアントが無い環境でも落ちないよう pre フックで generate を保証している。**lint/typecheck に migrate/seed を足さない。**

## 知識ベース（369-vault）との同期ルール
- **369の知識・思想・プロンプトを更新・追加したら、その内容を `369-vault` にも Markdown で反映することを検討する。commit / push はユーザーの明示承認後のみ行う。**
- ファイルは **Obsidian で読む前提**で、**日本語・Markdown・`[[リンク]]`** を活用する。新しいノートは必ず `369-vault/index.md` からリンクを張り、迷子ノートを作らない。
- `369-vault` の構成: `index.md`（目次）/ `README.md`（目的）/ `思想/`（思想・哲学・世界観・ビジョン）/ `プロンプト/`（1プロンプト1ファイル）/ `知識/`（設計判断・用語集・意思決定の記録）。
- 一時状態（未push・承認待ち等）はヴォルトに固定しない。**現在地は `tasks/CURRENT_STATE.md`＋git refs を正**とする。
- 補足: `369-vault` は独立 private リポジトリを目指すが、初期構築時点ではセッションのGitHub連携が `369` スコープのみで新規リポジトリを作成できなかったため、`369-vault/` フォルダとして本リポジトリ内に置いている。独立リポジトリへ移行後は、そのリポジトリへ反映する。
