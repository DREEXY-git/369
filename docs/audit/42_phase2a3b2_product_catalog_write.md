# 42. Phase 2-A-3b-2 — ProductCatalogItem 書き込み最小実装（作成・編集・アーカイブ）記録

> Phase 2-A-3b（Company Brain 書き込み実装）の第二段。**対象は ProductCatalogItem（商品カタログ）のみ**。
> 2-A-3b-1（会社方針・doc39/40/41）と同じ型の水平展開で、**安全境界（AI mutation禁止・label 2択）を最初から組み込んだ**。
> フェーズ: Phase 2-A-3b-2 / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- 「会社の頭脳（商品カタログ）」にも、会社方針と同じ**書き込み機能**が付きました: **作成・編集・アーカイブの3操作のみ**です。
- **消す機能はありません**（アーカイブは棚から下げるだけ・データは残る）。
- **AIは商品カタログを作成・編集・アーカイブできません**（権限設定は無変更のまま、画面側で一律拒否）。
- **価格メモは説明文だけ**です。価格計算・請求・課金・見積・会計には一切つながっていません（画面にも明記）。
- E2E smoke は **14/14 green**（既存13本は無変更・回帰なし）。**判定: GO**。
- **本番確認はまだ未実施**です（main push → 利用者実測が次の段取り）。

## 2. 実装内容

### 2-1. Server Action（`apps/web/app/(app)/brain/catalog/actions.ts`・新規）

| Action | ガード | 処理 |
|---|---|---|
| `createProductCatalogItemAction` | `isHumanUser`（AIロール一律拒否）→ `knowledge:create` | 入力検証→create（`externalAiAllowed: false` **固定**・`sourceType: 'manual'`）→writeAudit→revalidatePath→redirect |
| `updateProductCatalogItemAction` | `isHumanUser` → `knowledge:update` | tenantId＋archivedAt:null で対象確認→入力検証→update（**externalAiAllowed 不変更**）→writeAudit |
| `archiveProductCatalogItemAction` | `isHumanUser` → `knowledge:update` | 対象確認→`archivedAt: now()` のみ（**ソフトアーカイブ・物理削除なし**）→writeAudit |

- **AI mutation禁止を最初から組み込み**: `isHumanUser`（`isAiRole` を roles 全件に適用・roles 空も拒否）を3 Action すべての先頭（権限判定より前）に配置。rbac.ts は無変更。
- `delete` / `deleteMany` は不使用。`hasPermission` は既存の `create`/`update` のみ（'write' 不使用）。
- **productAssetId は UI で扱わない**（ProductAsset・在庫・請求・見積との連携なし）。

### 2-2. 入力検証

name 必須1〜120／description 必須1〜5000／category 必須1〜80／status は `active`・`draft` のみ／**label は `NORMAL`・`INTERNAL` のみ（サーバ側 ALLOWED_LABELS 2値）**／targetPain・strengths・priceNote は任意・各1000文字以内／tags はカンマ区切り最大10件・各20文字以内。

### 2-3. UI（3画面）

- `brain/catalog/new/page.tsx`（新規）・`brain/catalog/[id]/edit/page.tsx`（新規）: 全項目 label htmlFor / input id 対応。注意書き4点（外部AI送信は許可できない／社内ナレッジ扱い／PII・secret 禁止／**価格メモは請求・課金に使わない**）。label 選択肢は「通常」「社内限」の**2択のみ**。**高機密ラベルの商品は編集フォーム自体を出さない**。
- `brain/catalog/page.tsx`（改修）: `knowledge:create` がある場合のみ「新規作成」・`knowledge:update` がある場合のみ「編集」「アーカイブ」。**read-only ユーザーは従来どおり閲覧のみ**（操作列非表示）。

### 2-4. E2E smoke（1本追加のみ・14本体制）

- 末尾に「Company Brain の商品カタログを作成すると一覧に表示される」を追加（login → `/brain/catalog/new` → 一意商品名で作成 → 一覧反映を確認）。
- **既存13本は1行も変更していない**（削除・skip・期待値変更なし）。

## 3. 検証結果（ローカル・全green・修正ループ0回）

| # | 検証 | 結果 |
|---|---|---|
| 1 | DATABASE_URL / DIRECT_URL localhost 判定（値非表示） | ✅ true |
| 2 | `pnpm db:generate` | ✅ green |
| 3 | `pnpm test` | ✅ **211/211 passed** |
| 4 | `pnpm typecheck` / `pnpm lint` | ✅ green |
| 5 | `pnpm build`（SKIP_DB_SETUP=1・catalog の new/edit ルート生成確認） | ✅ green |
| 6 | ローカルPG起動 → `pnpm db:migrate:deploy` | ✅ pending なし（**新migration作成なし**） |
| 7 | `pnpm db:seed` | ✅ policies:5 / catalogItems:8 |
| 8 | `pnpm start` → `/login` 200 | ✅ |
| 9 | E2E smoke（Playwright install なし・プリインストールChromium） | ✅ **14/14 green（10.1s）・既存13本回帰なし** |
| 10 | 後片付け（server 停止・pg_ctl -m fast stop） | ✅ 完了 |

## 4. 変更していないもの（安全境界）

- `brain/policies/**`（2-A-3b-1 の実装）: **無変更**
- `schema.prisma`・`migrations/`・`seed.ts`・`rbac.ts`・`labels.ts`・`nav.ts`・package/lock: **無変更**
- 物理削除・一括操作・import/export・externalAiAllowed=true にする UI・AI書き込み経路・API/MCP公開: **実装していない**
- **priceNote から価格計算・請求・課金・見積・会計への接続: なし**（説明テキストのみ・画面に注記）
- 課金・決済・外部送信・本番接触: **なし**
- **ENSHiN OS の外部発信・口コミ投稿・SNS投稿・顧客の声公開・推薦コメント掲載・ブランディング投稿: 一切なし**

## 5. 次段へ送るもの

- **ProductCatalogItem の本番確認**（main push → 利用者実測。未実施）。
- **writeDataAccess（機密参照ログ）の本格実装**: AI参照経路の実装と同時（別承認）。
- 高機密ラベルの解禁・復元（unarchive）機能・詳細画面・Knowledge/AI タスク連携（後続候補）。

## 6. 判定

- **GO（Phase 2-A-3b-2 実装完了・smoke 14/14 green・破壊的操作ゼロ・ProductCatalogItem のみ）。**
- これで Company Brain の2テーブルは両方とも「人間が育てられる」状態になった（AI は読めるが書けない・消せない・外に出せない）。
- 参照: 会社方針の書き込み=doc39/40/41／本書=商品カタログの書き込み。
- 次: main push（push-only・別承認）→ **本番確認（利用者実測・doc43 候補）** → writeDataAccess / AI参照経路の承認判断。
