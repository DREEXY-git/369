# 36. Phase 2-A-3a — Company Brain 最小可視化（seed＋read-only 一覧）実装記録

> Phase 2-A の三段承認（設計docs→schema→実装）の第三段のうち、**read-only 可視化のみ**を実装した記録。
> 作成・編集・削除・Server Action・writeAudit/writeDataAccess の本実装は **Phase 2-A-3b（別承認）** へ送る。
> フェーズ: Phase 2-A-3a / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- Phase 2-A-2 で作った Company Brain の「DBの器」（CompanyPolicy / ProductCatalogItem）に、**架空のデモデータを入れて、画面で見えるようにしました**。
- 入ったのは **会社方針 5件＋商品カタログ 8件**（すべて架空・PIIなし・secretなし・実価格なし）。
- 新しい画面は **2つだけ**（`/brain/policies`＝会社方針一覧・`/brain/catalog`＝商品カタログ一覧）。**どちらも見るだけ（read-only）**で、作成・編集・削除ボタンはありません。
- サイドバーの「会議・ナレッジ」に **「会社の頭脳」** というリンクが1つ増えました。
- E2E smoke テストに Company Brain の1本を追加し、**12/12 green**（既存11本は無変更・回帰なし）。
- **判定: GO** — 作成・編集ができるようにするのは次の Phase 2-A-3b（別承認）です。

## 2. 実装内容

### 2-1. seed デモデータ（`packages/db/prisma/seed.ts`）

| 対象 | 件数 | 内容 |
|---|---|---|
| CompanyPolicy | **5件** | 経営理念／AIと人間の役割分担／値引き承認ルール／顧客情報の取り扱い／品質確認の基本（category: 経営方針・社内ルール・営業方針・品質方針） |
| ProductCatalogItem | **8件** | Web制作パック／MEO対策プラン／予約システム導入支援／イベント企画・運営／音響・照明レンタルプラン／テント・ステージ設営／SNS運用支援／看板・サインデザイン（category: Web支援・イベント・レンタル） |

- **全件 `externalAiAllowed: false`**（既定値の維持。外部AI送信の許可は入れていない）。
- label は **NORMAL / INTERNAL のみ**（CONFIDENTIAL / SECRET は使用しない）。
- **PII・secret・実在情報・実価格なし**。`priceNote` は「規模により個別見積り」等の説明テキストのみ（請求・課金に使わない）。
- seed の `reset()` は既存の動的 TRUNCATE により新テーブルも自動対象（seed 再実行で二重投入しない）。
- seed summary counts に `policies` / `catalogItems` を追加。

### 2-2. read-only 一覧画面（2画面・新規）

| 画面 | パス | 内容 |
|---|---|---|
| 会社の頭脳（会社方針） | `apps/web/app/(app)/brain/policies/page.tsx` | 方針・分類・状態・機密ラベル・外部AI送信可否の一覧 |
| 会社の頭脳（商品カタログ） | `apps/web/app/(app)/brain/catalog/page.tsx` | 商品・分類・解決する課題・価格メモ・機密ラベル・外部AI送信可否の一覧 |

- 両画面とも: `requireUser()` → `hasPermission(user, 'knowledge', 'read')` ガード → **`tenantId` スコープ**の `findMany`（`archivedAt: null`・明示 select）。
- **作成・編集・削除ボタンなし・フォームなし・Server Action なし**（`actions.ts` は作っていない）。
- 機密ラベルは `LABEL_BADGE`（`@hokko/shared`）で表示。外部AI送信可否は「禁止」（既定）／「許可（マスキング必須）」を明示表示。
- 画面上部に「read-only 確認用・作成/編集はまだできません」と明記。2画面間はタブリンクで相互移動。

### 2-3. ナビゲーション（1箇所のみ）

- **対象ファイル: `apps/web/components/shell/nav.ts`**（Scout で特定。PC サイドバー `sidebar.tsx` とモバイルドロワー `mobile-nav.tsx` は同じ `NAV` 定義を描画するため、この1ファイルの変更で両方に反映される）。
- 変更内容: lucide `Brain` アイコンの import 追加＋「会議・ナレッジ」グループ末尾に `{ label: '会社の頭脳', href: '/brain/policies', icon: Brain }` を1行追加。
- 他のナビ項目・他の画面は無変更。

### 2-4. E2E smoke（1本追加のみ）

- `apps/web/tests/e2e/smoke.spec.ts` の**末尾に1本だけ追加**: 「Company Brain の会社方針一覧が表示される」（login → `/brain/policies` → heading「会社の頭脳（会社方針）」＋ seed 固有タイトル「AIと人間の役割分担ポリシー」の可視確認）。
- **既存11本は1行も変更していない。**

## 3. 検証結果（ローカル・全green）

| # | 検証 | 結果 |
|---|---|---|
| 1 | DATABASE_URL が localhost であること（値は非表示で判定のみ） | ✅ true |
| 2 | `pnpm db:generate` | ✅ green |
| 3 | `pnpm test`（単体） | ✅ **211/211 passed** |
| 4 | `pnpm typecheck` | ✅ green |
| 5 | `pnpm lint` | ✅ green |
| 6 | `pnpm build`（SKIP_DB_SETUP=1・`/brain/policies`・`/brain/catalog` の生成物を確認） | ✅ green |
| 7 | ローカル PostgreSQL 起動 → `pnpm db:migrate:deploy` | ✅ 10 migrations / pending なし |
| 8 | `pnpm db:seed` | ✅ summary に `policies: 5, catalogItems: 8` |
| 9 | `pnpm start` → `/login` HTTP 200 | ✅ 200 |
| 10 | E2E smoke（Playwright・chromium shim 経由） | ✅ **12/12 green（10.4s）** |
| 11 | 既存11本の回帰 | ✅ なし（11本すべて green のまま） |
| 12 | 後片付け（server 停止・pg_ctl -m fast stop） | ✅ 完了 |

検証途中の修正は1件のみ: `EmptyState` の prop 名（`description` → `hint`）。typecheck で検出し即修正、同一エラーの再発なし。

## 4. 変更していないもの（安全境界）

- `packages/db/prisma/schema.prisma`: **無変更**
- `packages/db/prisma/migrations/`: **無変更**（新規 migration なし）
- `packages/shared/src/rbac.ts` / `labels.ts`: **無変更**（AI は knowledge の read / ai_read のみのまま）
- package.json / lockfile: **無変更**
- 既存画面・既存 Server Action: **無変更**（ナビ定義 `nav.ts` の1行追加を除く）
- 外部送信・課金・決済・本番DB操作・Prisma migrate 手動実行: **なし**
- `externalAiAllowed` は **seed 全件 false**（既定値の緩和なし）

## 5. Phase 2-A-3b へ送るもの（未実装・別承認)

- CompanyPolicy / ProductCatalogItem の**作成・編集・アーカイブ**（Server Action・入力検証・`writeAudit`）
- 機密参照ログ（`writeDataAccess`）の本実装（AI 参照経路を作る時）
- 詳細画面・検索・Knowledge/AI タスクとの連携（doc33 §7 の後続範囲）

## 6. 判定

- **GO（Phase 2-A-3a 完了・smoke 12/12 green・破壊的変更ゼロ・read-only のみ）。**
- 参照: 設計=doc33／schema変更=doc34／本番確認=doc35＋doc14 §38／本書=read-only 可視化。
- 次: Phase 2-A-3a の main 反映（push は別承認）→ Phase 2-A-3b の承認判断。
