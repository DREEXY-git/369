# 34. Phase 2-A-2 Company Brain schema 変更・migration 作成の記録

> **Phase 1-22 以来初の schema 変更**。三段承認の第二段（設計docs=doc33 → **schema変更=本書** → 実装=2-A-3）。
> フェーズ: Phase 2-A-2 / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- doc33 の設計図どおり、**Company Brain の2テーブル（CompanyPolicy＝会社方針・ProductCatalogItem＝商品カタログ）を DB 定義に追加**しました。
- 変更は**テーブルの新規作成のみ**。既存の195モデル・既存データには一切触れていません（migration の中身を全文検査し、DROP / RENAME / ALTER が**ゼロ**であることを確認済み）。
- 検証は全green: 単体テスト211・型チェック・lint・本番ビルド、そして**画面の自動テスト smoke 11本も green を維持**（schema 変更による回帰なし）。
- 画面・デモデータ・入力機能はまだありません（第三段 2-A-3 の承認後）。本番DBにも触れていません（ローカル検証のみ。本番反映は main push 後の既存 Vercel 経路＋利用者確認）。

## 2. 人間判断5点（本ミッションで固定・全て遵守）

1. category は **String**（enum 化しない）→ 遵守（新 enum ゼロ）。
2. RBAC は**既存 knowledge 権限を流用**（brain リソース新設なし）→ 遵守（rbac.ts 無変更）。
3. ProductCatalogItem ↔ ProductAsset は **productAssetId String? のスカラーのみ**（relation なし・ProductAsset 無変更）→ 遵守（schema diff で確認）。
4. KnowledgeDocument / KnowledgeChunk への自動連携は**後回し** → 遵守（連携コードなし）。
5. smoke への Company Brain 経路追加は **2-A-3 で判断** → 遵守（テスト無変更）。

## 3. 変更範囲

| 変更 | 内容 |
|---|---|
| `packages/db/prisma/schema.prisma` | Knowledge 系セクションの直後に **CompanyPolicy / ProductCatalogItem の2モデルのみ追加**（＋設計参照コメント）。既存モデル・既存 enum は無変更。新 enum なし。ConfidentialityLabel は既存を使用 |
| `packages/db/prisma/migrations/20260702185440_phase2a_company_brain/migration.sql` | 新規 migration **1本のみ** |

- migration 名: `phase2a_company_brain`（タイムスタンプ `20260702185440`）。

## 4. migration.sql の安全確認（全文検査済み）

| 検査 | 結果 |
|---|---|
| CREATE TABLE "CompanyPolicy" | あり（1回） |
| CREATE TABLE "ProductCatalogItem" | あり（1回） |
| CREATE INDEX | 7本（doc33 §7 どおり・すべて tenantId 先頭） |
| DROP TABLE / DROP COLUMN / RENAME / ALTER TABLE | **ゼロ**（既存テーブルへの操作なし） |
| 実データ・secret の混入 | なし（DDL のみ） |

## 5. 検証結果（ローカルのみ・本番接触ゼロ）

| 検証 | 結果 |
|---|---|
| `prisma migrate dev --name phase2a_company_brain`（ローカルDB） | 成功（作成＋適用＋client 再生成） |
| `pnpm db:generate` | green |
| `pnpm test` | green（211テスト） |
| `pnpm typecheck` | green（exit 0） |
| `pnpm lint` | green |
| `pnpm build` | green（本番ビルド） |
| **smoke 11本**（seed→server→プリインストールChromium・install なし） | **11 passed / 0 failed（green 維持・9.0s）** |

- DB は `.env` の localhost を値非表示で事前検証。テスト後にサーバ・Postgres とも停止済み。
- 実行時の注意記録: `pnpm --filter @hokko/db migrate -- --name X` は `--` が prisma に渡り**対話プロンプト待ちでハング**する。正しくは `pnpm --filter @hokko/db exec dotenv -e ../../.env -- prisma migrate dev --name X`（本書の再現手順として固定）。

## 6. 変更していないもの

- 既存195モデル（ProductAsset・ProductCategory・KnowledgeDocument・User・Tenant 含む）: **無変更**。
- ProductAsset への relation / back relation: **なし**（スカラー参照のみ）。
- RBAC（rbac.ts）・機密ラベル（labels.ts）: **無変更**（AI は knowledge:read / ai_read のみ＝Company Brain を書けない・消せない・持ち出せない状態が維持）。
- apps/**・packages/db/src/**・packages/shared/**・package.json・lock: **無変更**。
- seed・UI・Server Action・API・E2E テスト: **未実装・無変更**（2-A-3 スコープ）。
- priceNote は説明テキストであり、課金・請求・会計とは接続しない（金額計算列なし）。

## 7. 本番反映について

- 本書の時点では**ローカルDBのみ**。本番DBへの適用は、main push（別承認）後に既存の Vercel prebuild（`migrate deploy`）経路で行われ、**利用者の本番確認（doc14 方式）が正**となる。
- 適用される変更は §4 のとおり CREATE のみで、既存データへの影響はない。

## 8. 判定

- **Phase 2-A-2: GO**（schema 変更・migration 作成・全検証 green・人間判断5点遵守）。
- **Phase 2-A-3（seed / UI / Server Action / 監査 / E2E 追加）: 未着手・別承認**。
- 次候補: main push（push専用・別承認）→ Phase 2-A-3 の承認判断。
