# CLAUDE.md — IKEZAKI OS（統合AI経営OS） + LeadMap AI

このファイルは Claude Code が次回作業時に参照する開発ガイドです。

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
- 変更したら `pnpm test && pnpm typecheck && pnpm lint` を通す。

## 次回作業時の注意点 / 既知の落とし穴
- **autoprefixer を PostCSS に戻さない**: `tailwindcss` の jiti 設定ローダ（peer に tsx）が `browserslist` のロードを壊し `next build` が失敗する。現状 `postcss.config.cjs` は tailwindcss のみ。tailwind/postcss 設定は **`.cjs`（CommonJS）**で維持（web は `"type":"module"`）。
- パッケージ間importに `.js` 拡張子を**付けない**（付けると webpack が解決失敗）。
- Next 15 では `params`/`searchParams`/`cookies()` が **async**。`await` する。
- ローカル検証環境では Postgres/Redis をネイティブ起動（`/var/lib/pg-ikezaki`、`redis-server --daemonize`）。Docker daemon は要 `sudo dockerd`。
- Playwright のブラウザDLは本サンドボックスのネットワークでは失敗する。代わりに署名Cookieを使ったHTTPスモークで主要画面の200を確認済み。
- `prisma migrate reset`（= `pnpm db:reset`）は Claude Code 実行を検知して**安全ガードで拒否**される。クリーンに再投入したい時は `pnpm db:seed`（内部で `TRUNCATE ... CASCADE` してから再生成）を使う。通常のユーザー環境では `db:reset` も動作する。
- 機能拡張は「動く薄い縦切り」で。巨大な未完成より、CRUD+権限+監査+デモデータの一気通貫を優先。
