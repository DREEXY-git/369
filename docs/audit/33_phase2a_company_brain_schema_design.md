# 33. Phase 2-A-1 Company Brain schema 設計案

> **docs-only / schema 設計案。実装承認ではない。schema.prisma の変更なし・migration なし・DB操作なし。**
> フェーズ: Phase 2-A-1（三段承認の第一段=設計docs） / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- Phase 2-A「Company Brain（会社の頭脳）」の**最初の設計図**を作りました。会社方針・商品・事例・顧客課題・営業ナレッジをDB化して、AIが「うちの会社の文脈」で働けるようにする土台です。
- 提案の核心は「**最初は2テーブルだけ**」: **Policy DB（会社方針）と Product Catalog（商品カタログ）**から始めます。顧客の個人情報に近い Case Study / Customer Pain / Sales Playbook は、安全設計を確かめてからの後続候補にしました。
- 既存の仕組み（195モデル・機密ラベル・権限・監査ログ・ナレッジ検索）を**読んだ上で、その流儀に合わせた設計**です。新しい権限も新しいラベルも増やしません。
- **この文書はまだ「案」**です。次の Phase 2-A-2 で schema 変更をあなたが承認して初めて、実際のDB定義に進みます。

## 2. 本書の位置づけ

- docs-only の **schema 設計案**（三段承認: ①本書=設計docs → ②2-A-2=schema変更・migration承認 → ③2-A-3=実装承認）。
- **実装承認ではない**。schema.prisma 変更なし・migration なし・アプリコード変更なし。
- 入力: doc31 §5（準備メモ）・doc02 BRAIN-001/002・doc01 2-A・既存 `packages/db/prisma/schema.prisma`（read-only 読解）・`packages/shared/src/rbac.ts`・`packages/shared/src/labels.ts`。

## 3. Phase 2-A の目的

会社方針・商品・事例・顧客課題・営業ナレッジを構造化DBにし、Phase 2-B の Sales AI（read-only 分析・下書き・推奨）が「その会社の文脈」を参照できる知識基盤の最初の縦切りを作る。

## 4. 最初の縦切りスコープ案

**推奨: Policy DB＋Product Catalog の2テーブル先行。**

| テーブル候補 | 本縦切り | 理由 |
|---|---|---|
| Policy DB（会社方針） | **今回（先行）** | 純粋な社内知識・PIIゼロ・AIの文脈理解の土台として最重要 |
| Product Catalog（商品カタログ） | **今回（先行）** | 社内知識中心・PIIゼロ・Phase 2-B の商品推奨（SALES-002）の前提 |
| Case Study DB（事例） | 次段候補 | 顧客名・顧客情報を含む可能性 → 先行2テーブルで機密設計を実証してから |
| Customer Pain DB（顧客課題） | 次段候補（最後） | **顧客PII近接度が最も高い** → 最初の縦切りから明示的に除外 |
| Sales Playbook（営業ナレッジ） | 次段候補 | 比較的安全だが、商品・方針を参照する構造のため Product Catalog / Policy DB の後が自然 |

- 理由の要約: **PII 近接度と実装リスクの低い順**に薄く積む。先行2テーブルで「機密ラベル・外部AI送信可否・監査」の型を実証し、その型を後続3テーブルに適用する。
- Enshin OS 由来の機能は**個別仕様未提供（証拠不足）のため本設計に含めない**（doc07 の方針どおり）。

## 5. モデル候補（命名案）

既存の命名流儀（単数形・PascalCase・cuid・tenantId スカラ）に合わせた案:

| 対象 | モデル名案 | 備考 |
|---|---|---|
| Policy DB | **CompanyPolicy** | 既存 `AccessPolicy`（技術的アクセス制御）と役割が異なるため衝突しない |
| Product Catalog | **ProductCatalogItem** | 既存 `ProductAsset`（レンタル在庫・物理資産）や `ProductCategory` と**別物**。「営業提案用の商品・サービス説明」を持つ。ProductAsset への任意参照で連携（§6） |
| Case Study DB（次段） | CaseStudy | Customer への任意参照＋匿名化フラグを次段で設計 |
| Customer Pain DB（次段） | CustomerPain | CUSTOMER_CONFIDENTIAL 前提・次段で設計 |
| Sales Playbook（次段） | SalesPlaybookEntry | CompanyPolicy / ProductCatalogItem 参照を次段で設計 |

## 6. フィールド設計案（先行2テーブル）

### 6-1. CompanyPolicy（会社方針）案

| フィールド | 型（案） | 備考 |
|---|---|---|
| id | String @id @default(cuid()) | 既存流儀 |
| tenantId | String | **必須**・全クエリのスコープ |
| title | String | 方針名 |
| body | String | 本文（Markdown想定） |
| category | String | 例: 経営方針 / 営業方針 / 社内ルール / 品質方針（文字列＋UI選択肢。enum化は次段判断） |
| status | String @default("active") | active / draft / archived |
| tags | String[] | 検索補助 |
| label | ConfidentialityLabel @default(INTERNAL) | **既存 enum を流用**（KnowledgeDocument と同じ列名 `label` で統一） |
| externalAiAllowed | Boolean @default(false) | **外部AI送信可否。デフォルト禁止**（true でも送信時 maskText 前提） |
| sourceType | String? | manual / meeting / document（由来の記録） |
| sourceNote | String? | 由来メモ（例: 会議名。IDや本文は入れない） |
| effectiveFrom | DateTime? | 方針の適用開始（任意） |
| createdById | String? | User への参照（既存流儀に合わせ緩い参照） |
| updatedById | String? | 同上 |
| createdAt | DateTime @default(now()) | |
| updatedAt | DateTime @updatedAt | |
| archivedAt | DateTime? | 論理アーカイブ |

### 6-2. ProductCatalogItem（商品カタログ）案

| フィールド | 型（案） | 備考 |
|---|---|---|
| id / tenantId | 同上 | |
| name | String | 商品・サービス名 |
| description | String | 提案文脈で使う説明 |
| category | String | 商品分類（既存 ProductCategory への任意参照 `productCategoryId String?` も併記可・次段判断） |
| targetPain | String? | どの顧客課題に効くか（テキスト。CustomerPain 構造化は次段） |
| strengths | String? | 強み・差別化ポイント |
| priceNote | String? | 価格の説明テキスト。**金額の計算列は持たない**（請求・会計とは分離。実価格は Quote/Invoice の領域） |
| status | String @default("active") | active / draft / archived |
| tags | String[] | |
| label | ConfidentialityLabel @default(INTERNAL) | |
| externalAiAllowed | Boolean @default(false) | デフォルト禁止 |
| productAssetId | String? | 既存 ProductAsset（在庫実体）への**任意**参照。カタログ＝説明・在庫＝実体の分離を維持 |
| sourceType / sourceNote | String? | |
| createdById / updatedById | String? | |
| createdAt / updatedAt / archivedAt | 同上 | |

- 共通方針: **本文に PII を書かない運用をUI注意書きで明示**（Customer 情報は次段モデルの構造化フィールドで扱う）。

## 7. tenantId / index 方針

- 全モデルに `tenantId`（スカラ・Tenant へのリレーションは張らない=既存ルール）。
- index は既存流儀どおり **tenantId 先頭の複合 index**: `@@index([tenantId, status])`＋`@@index([tenantId, category])`（一覧・絞り込みの主経路）。
- 検索（pgvector/embedding）への接続は、既存 KnowledgeDocument/KnowledgeChunk 経路に**後段で**載せる（Company Brain 側に embedding 列を直接持たせない。`entityType`/`entityId` 参照パターンで KnowledgeDocument 化する案。実装は 2-A-3 以降の判断）。

## 8. RBAC 方針

- **新規権限を作らず、既存 `knowledge` リソースの権限を流用する案を推奨**: 閲覧=`knowledge:read` / AI参照=`knowledge:ai_read` / 作成・更新=`knowledge:create` / `knowledge:update` / 削除=`knowledge:delete`（ADMIN 系のみ）/ エクスポート=`knowledge:export`（承認ゲート対象）。
- 根拠: rbac.ts 実測で `knowledge` リソースと全アクションが定義済み・AI_AGENT / AI_ASSISTANT は `knowledge` の read / ai_read のみ保持（create/update/delete/export なし）→ **AI は Company Brain を「読める」が「書けない・消せない・持ち出せない」が追加変更ゼロで成立**。
- 専用リソース（例: `brain`）の新設が必要と判断される場合は、**次段（2-A-2）の個別承認事項**として送る（本書では流用案を第一候補とする）。
- **AI_AGENT / AI_ASSISTANT の権限は拡大しない**（ROLE_PERMISSIONS 不変の恒久ルール）。

## 9. 監査方針

- **writeAudit 対象**: 作成・更新・アーカイブ・削除・（将来）エクスポートのすべての変更系操作。
- **writeDataAccess 対象**: `label` が CONFIDENTIAL 以上のレコードの閲覧、および **AI（ai_read）による参照はラベルに関わらず全件記録**（既存の機密参照記録の流儀を踏襲）。
- 外部AI送信時（実LLM利用時）は LLMCallLog（既存）＋maskText 適用の記録で追跡可能にする。

## 10. Data Classification / 外部AI送信可否

- 機密ラベルは**既存 ConfidentialityLabel enum（10種）をそのまま使用**（新ラベル追加なし）。既定値: CompanyPolicy / ProductCatalogItem とも **INTERNAL**（labels.ts 実測で AI_AGENT / AI_ASSISTANT の閲覧可・EXTERNAL 系ロールの閲覧不可＝適切）。
- `externalAiAllowed` は**デフォルト false（外部AI送信禁止寄り）**。true の場合でも外部LLM送信前に `maskText` を通す前提（既存 AI ルール）。FakeLLM 動作時は外部送信自体が発生しない。
- STRICT_SECRET / EXECUTIVE_ONLY 等の高機密ラベルが付いたレコードは、externalAiAllowed の値に関わらず**外部AI送信不可**とする実装ルールを 2-A-3 で入れる（設計として明記）。

## 11. seed 方針

- **デモデータのみ**（既存 seed の流儀: 架空の会社方針5件程度・架空の商品カタログ8件程度を想定。件数は実装時確定）。
- **secret 実値・PII・実顧客データ・実価格の機微情報は一切入れない**。既存デモテナント（ikezaki.local 系）配下に生成。
- seed は既存 `pnpm db:seed`（TRUNCATE→再生成）へ統合し、別スクリプトを作らない。

## 12. UI / Server Action / API 方針（今回は実装しない）

- 実装時（2-A-3）は**薄い縦切り**: 一覧（read-only）→詳細→作成/編集フォーム、の順で最小構成。
- Server Action は既存の型を踏襲: `requireUser()` → `hasPermission()` → 入力検証 → DB → `writeAudit` → `revalidatePath`。
- 空画面を作らない（seed デモデータで最初から一覧が埋まる）。
- **MCP/API 公開はしない**（Company Brain API は doc06 のとおり将来の read-only internal 設計。Phase 2-G の docs 設計のみ）。

## 13. E2E 方針

- **smoke 11/11 green を維持**（回帰ゲート・Phase 2 出口条件）。
- 新画面追加時にスモーク経路候補を1本追加: 「ログイン → Company Brain 一覧 200・見出し表示」（実装時に smoke へ追加するかは 2-A-3 で判断・追加時もテスト変更は個別承認範囲に含める）。
- **新規フォームは label 関連付け（htmlFor / id）を最初から実装**（X-03 の教訓・コーディング規約化済み）。

## 14. migration 段取り（三段承認）

1. **本書（2-A-1）= 設計のみ**。schema.prisma 無変更。
2. **2-A-2 = schema 変更承認**: 本書の §5〜7 を確定案にし、schema.prisma への追加（2モデル＋enum 参照＋index）と migration 1本の作成を**個別の人間承認**のうえ実施。ローカル `migrate deploy` 検証→本番反映は既存の Vercel prebuild 経路＋利用者本番確認（doc14 方式）。
3. **2-A-3 = 実装承認**: seed・一覧/詳細/フォーム UI・Server Action・監査・（判断により）smoke 経路追加。

## 15. 危険領域と禁止事項（本設計に含まれないもの）

実課金なし・決済なし・外部送信なし・実メールなし・Webhook実送信なし・**MCP/API公開なし**・schema変更なし（本書時点）・migrationなし・本番DBなし・AI権限拡大なし・L5以上自動化なし・ロボット実行なし・採否/評価/給与判断なし。

## 16. 未決定事項（2-A-2 以降で人間が確定）

1. category を文字列のままにするか enum 化するか（推奨: 当面文字列＋UI選択肢。enum は運用が固まってから）。
2. RBAC を `knowledge` 流用のままにするか専用リソース `brain` を新設するか（推奨: 流用で開始）。
3. ProductCatalogItem ↔ ProductCategory / ProductAsset の参照を初回 migration に含めるか（推奨: productAssetId のみ任意で含め、カテゴリ参照は後回し）。
4. KnowledgeDocument への自動連携（Company Brain → 検索基盤）の時期（推奨: 2-A-3 の後の独立タスク）。
5. smoke への Company Brain 経路追加の時期。

## 17. 推奨次ステップ

1. 本書のレビュー→**Phase 2-A-2（schema 変更・migration の個別承認）**プロンプトの発行。
2. 並行可: Phase X-04（残り E2E 段階実行）・Enshin OS 資料提供。

## 18. GO / HOLD / NG 判定

- **設計docs としての判定: GO**（既存 schema・RBAC・labels の実測に基づく整合設計・スコープは最小の2テーブル）。
- **schema 変更・実装: HOLD until human approval**（2-A-2 / 2-A-3 の個別承認まで一切進まない）。
