# 52. Phase 2-B-2 — SalesPlaybookEntry schema変更・migration作成（判定 GO）

> 三段承認の第二段（schema変更）。§0 人間承認: APPROVED（呼称=Phase 2-B のまま／参照構造=ID配列／playbookType=4種）。
> フェーズ: Phase 2-B-2 / 現在位置は git refs を正とする。
> 設計の正: doc51 §4。**本書の変更は schema.prisma への model 追加＋新規 migration 1つのみ。UI・seed・実装なし。**

---

## 1. 非エンジニア向け要約

- 会社の頭脳に3つ目の棚「**営業プレイブック（SalesPlaybookEntry）**」の**器（データベースのテーブル）**を作りました。
- doc51 の設計図どおりで、**既存の棚（会社方針・商品カタログ）には一切触っていません**。既存データが消える種類の変更（DROP / DELETE 等）はゼロです。
- まだ器だけです。画面もデモデータもありません（2-B-3 以降・別承認）。
- ローカル検証はすべて green。**本番への適用は main push（別承認）後に既存の Vercel 経路（migrate deploy）で行われ、本番確認は未実施**です。

## 2. schema変更内容

`packages/db/prisma/schema.prisma` に `model SalesPlaybookEntry` を追加（ProductCatalogItem の直後）。**追加のみ・削除行ゼロ・既存model破壊なし・enum追加なし・ConfidentialityLabel の値追加なし**。

- doc51 §4 のフィールド案 22項目をそのまま採用: title / body / category / **playbookType**（初期候補: approach / objection / preparation / talk_track）/ targetIndustry / targetSituation / objection / recommendedTalkTrack / **doNotSay**（No.1表記・効果保証等の禁止例の蓄積欄）/ relatedPolicyIds / relatedProductCatalogItemIds / tags / label / externalAiAllowed / sourceType / sourceNote / createdById / updatedById / createdAt / updatedAt / archivedAt。
- **relationなしID配列採用**（§0 決定どおり）: relatedPolicyIds / relatedProductCatalogItemIds は String[]。Tenant / CompanyPolicy / ProductCatalogItem への relation は張らない（productAssetId / chunkIds の既存前例と同じ流儀）。既存 model への back relation 追加なし。
- label は ConfidentialityLabel @default(INTERNAL)。**運用は NORMAL / INTERNAL のみ**（2択制限は 2-B-4 の UI/action 層で実装。高機密ラベル対応はしない）。
- **externalAiAllowed false default**（true にする UI を作らない方針を model コメントに明記）。
- status フィールドは doc51 §4 に無いため追加していない（§0 指示どおり）。
- price / invoice / billing / quote / accounting 系フィールドなし。顧客名・会社名・成果数値・口コミ・顧客の声・testimonial 用フィールドなし。
- index 3本: [tenantId, category]・[tenantId, label]・[tenantId, playbookType]。

## 3. migration内容

- 新規 migration ディレクトリ **1つのみ**: `packages/db/prisma/migrations/20260703175140_phase2b2_sales_playbook/`。
- SQL 内容: `CREATE TABLE "SalesPlaybookEntry"`＋`CREATE INDEX` 3本のみ。
- **安全ゲート実測: DROP TABLE / DROP COLUMN / DELETE / TRUNCATE = 0件・既存テーブルへの ALTER TABLE = 0件・FOREIGN KEY / REFERENCES = 0件**（destructive change ゼロ）。
- 既存 migration の編集なし。
- 適用は**ローカルDBのみ**（DATABASE_URL / DIRECT_URL が localhost:5432 を指すことを値非表示で確認してから実行）。本番DBへは接続していない。production migrate deploy は実行していない。
- 実行手順は doc34 固定の再現手順どおり: `pnpm --filter @hokko/db exec dotenv -e ../../.env -- prisma migrate dev --name phase2b2_sales_playbook`（＋Prisma engine 環境変数）。

## 4. 検証結果

| # | 検証 | 結果 |
|---|---|---|
| 1 | DB URL localhost 確認（値非表示） | ✅ DATABASE_URL / DIRECT_URL とも localhost:5432 |
| 2 | prisma validate | ✅ valid |
| 3 | prisma migrate dev（ローカル適用＋client 再生成） | ✅ 成功（generate 込み） |
| 4 | prisma migrate status | ✅ Database schema is up to date! |
| 5 | migration SQL 安全ゲート | ✅ CREATE TABLE＋INDEX 3本のみ・destructive 0 |
| 6 | schema diff（削除行） | ✅ 0行（追加35行のみ・model 追加は SalesPlaybookEntry の1つ・enum 追加なし） |
| 7 | pnpm test | ✅ **211 passed** |
| 8 | pnpm typecheck | ✅ green |
| 9 | pnpm lint | ✅ green |
| 10 | pnpm build（SKIP_DB_SETUP=1） | ✅ green |

未実施の検証（対象外・正直に記録）:
- **E2E / Playwright**: schema-only で UI 変更なしのため未実施（smoke 15本の対象画面に変更なし）。
- **seed**: 今回禁止のため未実行（デモデータは 2-B-3 の別承認）。
- **本番確認: 未実施**（main push 別承認後、doc49 の型で利用者実測）。

## 5. 変更していないもの・発生していないこと

- 既存 model / 既存 migration / enum / rbac.ts / labels.ts / seed.ts / package / lock / .env / vercel.json: **無変更**
- apps/・packages/ai・packages/shared: **無変更**（**UIなし・実装なし**＝Server Action / read-only 画面 / AI参照 / writeAudit / writeDataAccess いずれも未実装）
- **seedなし**・本番DB操作なし・外部送信なし
- **ENSHiN OS外部発信なし・口コミ投稿なし・SNS投稿なし・顧客の声公開なし**
- 外部LLM送信解禁なし・高機密ラベル対応なし・externalAiAllowed true UI なし・**Phase 8なし**・MCP/API公開なし

## 6. 判定と次アクション

- **判定: GO（Phase 2-B-2 schema変更・ローカル検証まで完了）。**
- 「最新の本番確認GO済みプロダクト基準」は **Phase 2-A-3c-2 / `85f1bf3` のまま更新しない**（本 commit は schema 追加であり、本番確認は未実施）。
- 次アクション:
  1. 本 commit の main 反映（push-only・別承認）。Vercel prebuild の migrate deploy で本番DBにテーブルが作られる。
  2. 本番確認（doc49 の型・利用者実測。schema-only のため「既存画面の無回帰」が主な確認点。2-A-2-PROD=doc35 の前例どおり「新画面なしが正常」）。
  3. **Phase 2-B-3（read-only 一覧＋seedデモデータ＋本番確認）の承認判断**。
- **main push は別承認。Phase 2-B-3 以降・3c-5・Phase 8 には勝手に進まない。**
