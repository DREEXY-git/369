# 369 統合AI経営OS + LeadMap AI / AI新規開拓OS

中小企業の経営・営業・顧客対応・会計・財務・人事・在庫・会議・ナレッジ・AI社員を**1つに統合**し、
散らばった情報をAIが繋いで「売上機会・利益漏れ・リスク・次のアクション」を提示する経営OSのMVPです。

中核モジュールとして **LeadMap AI（AI新規開拓OS）** を内蔵します。
地図から営業先を探し、AIが各社の課題を分析し、**会社ごとに最適化した営業メール下書き**まで生成し、
承認・送信・追客・商談化までを1画面で扱える Vertical Sales AI です。

> ⚠️ これは実用レベルの **MVP** です。APIキーが無くても **FakeLLM / DemoMapProvider** でフル機能がデモできます。

---

## 1. 369 とは

会社中に散らばる情報を一元化し、AIが以下を発見し、社長・社員・AI社員に次のアクションを提示します。

- 売上機会 / 利益漏れ / 請求漏れ / 回収漏れ
- タスク遅延 / 顧客対応漏れ / 返信漏れ
- 法務・労務・財務・資金繰りリスク
- 在庫のムダ / リース商品の低稼働 / クレーム予兆 / 顧客離反予兆
- 契約更新漏れ / 見積承認待ちの滞留 / 高優先度リードの未対応

## 2. LeadMap AI とは

> 地図から営業先を探し、AIがその会社の課題を分析し、個別営業メールまで作ってくれる新規開拓支援ツール。

「札幌市 美容室」のように**地域×業種**を入力すると、店舗・会社を抽出し、各社について
評価・口コミ・Webサイト・SNS・連絡先・**営業優先度**を取得。さらにAIが
**強み / 改善余地 / 営業切り口 / 個別営業メール下書き**を生成し、地図CRM・営業パイプラインで管理します。

---

## 3. 機能一覧（実装済み）

| 領域 | 主な機能 |
| --- | --- |
| 経営 | 社長コックピット、AI朝礼レポート、経営異常検知（ルール+AI説明）、アラート、承認フロー |
| CRM | 顧客一覧/詳細、タイムライン、顧客インサイトAI、クレーム/満足度/離反リスク |
| 営業 | 案件、営業パイプライン（カンバン）、ステージ履歴、営業活動 |
| 見積・契約・請求 | 粗利自動計算・低粗利/赤字アラート、契約リスク（法務AIチェック）、請求・延滞・回収 |
| 会計・財務 | 財務サマリー、資金繰り予測（資金ショート予測）、利益漏れ検知AI |
| 在庫・リース | 商品資産、予約重複/在庫不足検知、商品収益性、ダイナミックプライシング |
| 会議・議事録 | テキスト議事録取込→AI議事録/決定事項/アクション自動生成、話者分離、ナレッジ取込 |
| ナレッジ | RAG検索（pgvector対応・FakeEmbedding）、引用付きAI回答、RetrievalLog/AnswerCitation |
| AI社員 | AI社員一覧/詳細、活動ログ、権限・ガードレール（外部送信・承認の禁止） |
| 報連相 | 日次報告・相談ダッシュボード |
| 専門家・補助金 | 士業連携・相談候補、補助金DB・申請可能性・AI申請書下書き |
| プランニングホッコー | イベント案件・商品活用・粗利・次回提案 |
| **LeadMap AI** | キャンペーン作成、リード抽出、Web/口コミAI分析、営業切り口、個別営業メール、承認、送信ログ、返信分類、地図CRM、訪問ルート、配信停止リスト |
| 管理 | 管理コンソール、ユーザー/RBAC、監査ログ・機密参照ログ |

## 4. アーキテクチャ

```
apps/
  web/      Next.js 15 (App Router, RSC + Server Actions) — UI/API/認証
  worker/   BullMQ ワーカー（18種のジョブ）
packages/
  db/       Prisma schema + Client + seed（マルチテナント）
  shared/   純粋ロジック（RBAC/機密ラベル/マスキング/異常検知/財務/在庫/リードスコア/ナレッジ）
  ai/       LLM/Embedding/Transcription Provider抽象化 + Fake実装 + 20+ AIタスク + プロンプト
  integrations/ Maps(Demo/Google)・Email(Log/SMTP)・安全Webフェッチ・Mockコネクタ
infra/docker/  web/worker Dockerfile
```

- **マルチテナント**: 全モデルが `tenantId` を保持。アプリ層で必ずスコープを強制。
- **AI Provider抽象化**: キーが無ければ自動で **FakeLLM / FakeEmbedding** にフォールバック。
- **Maps抽象化**: キーが無ければ **DemoMapProvider**（札幌市デモリードを決定論生成）。
- **ベクトル検索**: 埋め込みは `Float[]` 保持 + JSコサイン類似度（pgvector へ移行可能）。

## 5. 技術スタック

TypeScript strict / pnpm workspace / Next.js 15 / React 19 / Tailwind CSS v3 / Prisma 6 / PostgreSQL(pgvector) /
Redis + BullMQ / S3互換(MinIO) / Mailpit / Zod / Vitest / Playwright / ESLint / Prettier / Docker Compose /
認証は自前（bcrypt + jose 署名Cookie、CSRFはNext Server Actionの同一オリジン保護）。

---

## 6. セットアップ

### 必要要件
Node.js 20+ / pnpm 10 / Docker（インフラ用）

### 環境変数
ルートに `.env` を作成（`.env.example` をコピー）。`.env.example` に実値は含めません。

```bash
cp .env.example .env
```

主要な環境変数:

| 変数 | 既定 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | postgres://app:app@localhost:5432/app369 | PostgreSQL |
| `REDIS_URL` | redis://localhost:6379 | BullMQ |
| `SESSION_SECRET` | （要変更） | セッション署名鍵 |
| `LLM_PROVIDER` | `fake` | `fake`/`openai`/`anthropic`（キー無しは自動fake） |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | 空 | 本物のLLM利用時のみ |
| `EMBEDDING_PROVIDER` | `fake` | `fake`/`openai` |
| `MAPS_PROVIDER` | `demo` | `demo`/`google`（キー無しは自動demo） |
| `GOOGLE_MAPS_API_KEY` | 空 | Places API利用時のみ |
| `MAIL_PROVIDER` | `log` | `log`/`smtp`（開発はMailpit:1025） |
| `EXTERNAL_SEND_ENABLED` | `false` | 外部送信のマスタースイッチ（既定で無効） |
| `LLM_MASK_PII` | `true` | 外部LLM送信前のPIIマスキング |

### 起動方法 A: インフラのみDocker + Web/Workerはローカル（推奨）

```bash
pnpm install
docker compose up -d postgres redis minio mailhog   # インフラのみ
pnpm db:migrate     # マイグレーション
pnpm db:seed        # デモデータ投入
pnpm dev            # Web (http://localhost:3000)
pnpm worker:dev     # 別ターミナルで Worker
```

### 起動方法 B: すべてDocker Composeで

```bash
docker compose --profile full up -d   # postgres/redis/minio/mailpit + web + worker
# 初回のみ:
docker compose exec web pnpm db:migrate
docker compose exec web pnpm db:seed
```

### デモログイン

| メール | パスワード | ロール |
| --- | --- | --- |
| ceo@369.local | password123! | OWNER（社長） |
| sales@369.local | password123! | STAFF（担当者） |
| admin@369.local | password123! | ADMIN（管理者） |
| ai-sales@369.local | password123! | AI_AGENT（AI社員） |

---

## 7. 主要画面（URL）

- `/dashboard/ceo` 社長コックピット / `/reports/morning` AI朝礼 / `/alerts` / `/approvals`
- `/customers` `/customers/[id]` `/customers/[id]/timeline` `/customers/[id]/insights`
- `/deals` `/deals/kanban` `/deals/[id]`
- `/quotes` `/contracts` `/invoices` / `/finance` `/finance/cashflow` `/finance/profit-leaks`
- `/inventory` `/inventory/lease` `/inventory/profitability`
- `/meetings` `/meetings/upload` `/meetings/[id]` `/tasks` / `/knowledge/search`
- `/ai-agents` `/ai-agents/[id]` / `/horenso` / `/experts` `/subsidies` / `/planning-hokko`
- **LeadMap**: `/leadmap/campaigns` `/leadmap/campaigns/new` `/leadmap/campaigns/[id]` `/leadmap/leads` `/leadmap/leads/[id]` `/leadmap/leads/[id]/analysis` `/leadmap/leads/[id]/outreach` `/leadmap/map` `/leadmap/pipeline` `/leadmap/routes` `/leadmap/settings`
- `/admin` `/admin/users` `/admin/audit`

## 8. デモシナリオ

1. `ceo@369.local` でログイン → **社長コックピット**で売上/粗利/承認待ち/利益漏れ/高優先度リードを確認。
2. **AI朝礼レポート**（`/reports/morning`）でAIが当日の要点・経営異常を生成。
3. **LeadMap**: `/leadmap/campaigns/new` で「札幌市 美容室」を作成 → リードが抽出される。
4. リード詳細 → **AIで分析**（強み/改善余地/営業切り口） → **個別営業メール生成**（下書き）。
5. 「承認に出す」→ `/approvals` で承認 → 送信ログが記録（既定は外部送信せず log）。
6. **議事録取込**（`/meetings/upload`）でテキスト貼付→AI議事録・決定事項・タスク自動生成 → ナレッジに取込。
7. `/knowledge/search` で「美容室の営業切り口」を質問 → 引用付きでAIが回答。
8. `/admin/audit` で全操作とAI参照ログを確認。

## 9. AI / Maps / メール Provider 設定

- **AI**: `LLM_PROVIDER=openai` + `OPENAI_API_KEY`（または `anthropic` + `ANTHROPIC_API_KEY`）で本物のLLMへ。未設定なら FakeLLM。`EMBEDDING_PROVIDER=openai` でRAGも本物の埋め込みに切替。
- **Maps**: `MAPS_PROVIDER=google` + `GOOGLE_MAPS_API_KEY` で公式 **Places API (New)** を使用。未設定なら DemoMapProvider。
- **メール**: `MAIL_PROVIDER=smtp`（Mailpit/本番SMTP）。`EXTERNAL_SEND_ENABLED=true` かつ**人間承認**がある場合のみ実送信。

---

## 10. セキュリティ設計

- **認証**: bcryptパスワードハッシュ + jose署名のhttpOnly/SameSite Cookieセッション。
- **CSRF**: Next.js Server Actions の同一オリジン保護。
- **RBAC**: 10ロール × 8アクション（閲覧/作成/編集/削除/承認/エクスポート/AI参照/外部送信）。`packages/shared/rbac.ts`。
- **機密ラベル**: NORMAL〜EXECUTIVE_ONLY の10種。`canAccessLabel()` でロール別フィルタ。
- **監査ログ / AI参照ログ**: 重要操作と機密データ参照（AI含む）を `AuditLog` / `DataAccessLog` に記録。
- **テナント分離**: 全クエリで `tenantId` スコープ。
- **PIIマスキング**: 氏名/メール/電話/住所/健康/家族。外部LLM送信前に適用可（`LLM_MASK_PII`）。
- **外部URLフェッチ**: SSRFガード（内部/予約レンジ拒否）+ allowlist + timeout + サイズ上限。
- **危険操作は承認必須**: 外部送信・顧客向け・契約・請求・支払・削除・エクスポート・人事。
- **AIは外部送信・承認・削除を構造的に不可**（多重防御）。**初期状態で外部送信は無効**。

### LeadMap AI 利用上の注意（コンプライアンス）
- Google Maps/Places由来データは**規約違反のスクレイピングをせず**、公式API/許諾データ/アップロード/デモのみ使用。
- Google由来データには `source/placeId/fetchedAt/expiresAt/attributionRequired/cachePolicy` を保持し、**期限切れを明示**。
- Google由来データは Google Maps 上に**帰属表示付き**で表示し、非Google地図に混在させない（デモは非Google地図）。
- 営業メールは**同意管理・配信停止・送信者情報・送信前承認・送信ログ・抑止リスト**を必須化。AI生成文は必ず**下書き**。配信停止希望の返信を検知したら `SuppressionList` に追加。

## 11. バックアップ・復元

`BackupJob/BackupArtifact/RestorePoint/RestoreJob/ArchivePolicy` と `ExportJob` を実装。
AIに与えたデータは `KnowledgeDocument/Chunk/DataLineage/KnowledgeVersion/KnowledgeRollbackJob` で
取込→分割→ベクトル化→参照までを追跡し、**誤学習の巻き戻し**（チャンク無効化・再生成）に対応する設計です。

## 12. テスト

```bash
pnpm test            # 単体（DB不要）: RBAC/マスキング/異常検知/粗利/在庫/リードスコア/承認/抑止/資金繰り/利益漏れ/FakeLLM 等（51件）
pnpm typecheck       # 全パッケージ/アプリの型チェック
pnpm lint            # ESLint
pnpm --filter @hokko/db test:integration   # 統合（要DB）: ログイン/CRM/見積/請求/会議AI/LeadMap承認/ナレッジ検索/監査（10件）
pnpm test:e2e        # E2E(Playwright)。初回は `npx playwright install chromium` が必要
```

## 13. 今後の拡張ロードマップ

- pgvector ネイティブのANN検索へ移行 / 外部Embeddingの本番運用
- 会計ソフト・Gmail・LINE・Slack・カレンダーの本番コネクタ（現状は Provider interface + Mock）
- 音声/動画の文字起こし（Whisper等 TranscriptionProvider）
- 見積/請求/契約のPDF生成、エクスポート（CSV/Excel/JSON）の実体化
- 細粒度RBAC（リソース単位の所有権/部署スコープ）、SСIM/SSO
- 承認のリアルタイム通知、BullMQ ダッシュボード（Bull Board）

## 14. 本番化する際の注意点

- `SESSION_SECRET` を十分なエントロピーで設定、`NODE_ENV=production`、Cookie Secure。
- DBは管理されたPostgres（pgvector拡張）、Redisは永続化/冗長化。
- オブジェクトストレージは private + 署名URL。アップロードのMIME/サイズ検証を実体化。
- 外部送信を有効化する場合は、同意・配信停止・送信者情報・レート制限・バウンス処理を必ず運用に組込む。
- Google Maps/Places の表示・キャッシュ・帰属は規約を順守。期限切れデータの再取得運用。
- LLM送信前のPIIマスキング/データ最小化、コスト/レート監視（`LLMCallLog`）。

---

🤖 本MVPは FakeLLM / DemoMapProvider により、APIキー無しで全機能をローカルでデモできます。
