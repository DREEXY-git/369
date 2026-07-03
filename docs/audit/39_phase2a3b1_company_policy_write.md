# 39. Phase 2-A-3b-1 — CompanyPolicy 書き込み最小実装（作成・編集・アーカイブ）記録

> Phase 2-A-3b（Company Brain 書き込み実装）の第一段。**対象は CompanyPolicy（会社方針）のみ**。
> **ProductCatalogItem の書き込みは未実装（Phase 2-A-3b-2・別承認）**。
> フェーズ: Phase 2-A-3b-1 / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- 「会社の頭脳（会社方針）」に、初めて**書き込み機能**が付きました: **作成・編集・アーカイブの3操作のみ**です。
- **消す機能はありません**。アーカイブは「棚から下げて一覧に出さなくする」だけで、データは残ります（物理削除なし）。
- **AI はこの画面から編集・アーカイブできません**（権限設定は無変更のまま、AI は knowledge の update 権限を持たないため）。
- **外部AI送信の許可はこの画面では絶対に変更できません**（新規作成は常に「禁止」で作られ、編集でも変更されません）。
- すべての作成・編集・アーカイブは**監査ログ（writeAudit）に記録**されます。
- E2E smoke は **13/13 green**（既存12本回帰なし・13本目=作成→一覧反映）。**判定: GO**。

## 2. 実装内容

### 2-1. Server Action（`apps/web/app/(app)/brain/policies/actions.ts`・新規）

| Action | 権限 | 処理 |
|---|---|---|
| `createCompanyPolicyAction` | `knowledge:create` | 入力検証→create（`externalAiAllowed: false` **固定**・`sourceType: 'manual'`・createdById/updatedById）→writeAudit→revalidatePath→redirect |
| `updateCompanyPolicyAction` | `knowledge:update` | tenantId＋archivedAt:null で対象確認→入力検証→update（**externalAiAllowed には触れない**・updatedById）→writeAudit→revalidatePath→redirect |
| `archiveCompanyPolicyAction` | `knowledge:update` | tenantId＋archivedAt:null で対象確認→`archivedAt: now()` のみセット（**ソフトアーカイブ・物理削除なし**）→writeAudit→revalidatePath→redirect |

- 共通順序: `requireUser()` → `hasPermission()` → FormData 入力検証 → **tenantId スコープ** → prisma → `writeAudit` → `revalidatePath('/brain/policies')` → redirect（既存 `deals/actions.ts` パターン準拠）。
- `prisma.companyPolicy.delete` / `deleteMany` は**一切使用していない**。
- `hasPermission` の action は既存の `create` / `update` のみ使用（存在しない `write` は不使用・rbac.ts 無変更）。

### 2-2. 入力検証

title 必須1〜120／body 必須1〜5000／category 必須1〜80（enum化しない）／status は `active`・`draft` のみ／label は `NORMAL`・`INTERNAL`・`CONFIDENTIAL`・`STRICT_SECRET`・`EXECUTIVE_ONLY` に限定／tags はカンマ区切り→配列（最大10件・各20文字以内）。検証NGは error パラメータ付きでフォームへ戻す（日本語エラー表示）。

### 2-3. UI（3画面）

- `brain/policies/new/page.tsx`（新規）: 作成フォーム。`knowledge:create` ガード。
- `brain/policies/[id]/edit/page.tsx`（新規）: 編集フォーム。`knowledge:update` ガード。対象が無い/アーカイブ済みなら案内表示。
- `brain/policies/page.tsx`（改修）: `knowledge:create` がある場合のみ「新規作成」・`knowledge:update` がある場合のみ「編集」「アーカイブ」を表示。**read-only ユーザーには従来どおり閲覧のみ**（操作列自体を出さない）。
- フォームは全項目 `label htmlFor` / `input id` を対応付け（E2E セレクタ安定・アクセシビリティ）。
- 3画面に注意書きを明記: 「外部AI送信はこの画面では許可できません」「作成した情報は社内ナレッジとして扱われます」「PII / secret / 実顧客の機微情報を入れないでください」。

### 2-4. E2E smoke（1本追加のみ・13本体制）

- 末尾に「Company Brain の会社方針を作成すると一覧に表示される」を追加: login → `/brain/policies/new` → 一意タイトル（`E2E会社方針-${Date.now()}`）で全項目入力 → 作成 → 一覧に表示を確認。
- **既存12本は1行も変更していない**。編集・アーカイブの E2E は次段候補。

## 3. 検証結果（ローカル・全green）

| # | 検証 | 結果 |
|---|---|---|
| 1 | DATABASE_URL / DIRECT_URL が localhost（値非表示判定） | ✅ true |
| 2 | `pnpm db:generate` | ✅ green |
| 3 | `pnpm test` | ✅ **211/211 passed** |
| 4 | `pnpm typecheck` | ✅ green |
| 5 | `pnpm lint` | ✅ green |
| 6 | `pnpm build`（SKIP_DB_SETUP=1・`/brain/policies/new`・`[id]/edit` の生成物確認） | ✅ green |
| 7 | ローカルPG起動 → `pnpm db:migrate:deploy` | ✅ pending なし（**新migration作成なし**） |
| 8 | `pnpm db:seed` | ✅ policies:5 / catalogItems:8 |
| 9 | `pnpm start` → `/login` 200 | ✅ |
| 10 | E2E smoke | ✅ **13/13 green（10.7s）・既存12本回帰なし** |
| 11 | 後片付け（server 停止・pg_ctl -m fast stop） | ✅ 完了 |

修正ループ: **0回**（一発green）。

## 4. 変更していないもの（安全境界）

- `schema.prisma`・`migrations/`・`seed.ts`: **無変更**
- `rbac.ts`・`labels.ts`: **無変更** — **AI（AI_AGENT/AI_ASSISTANT）は knowledge:update を持たないため、編集・アーカイブは人間のみ**。AI_AGENT の knowledge:create は既存設計（AIの生成物は下書き原則）のままで、今回権限は一切拡大していない。
- `nav.ts`・`brain/catalog/**`・その他既存画面: **無変更**
- package.json / lockfile: **無変更**
- 物理削除・一括操作・import/export・externalAiAllowed=true にする UI・AI書き込み経路・API/MCP公開: **実装していない**
- 課金・決済・外部送信・本番接触: **なし**

## 5. 次段へ送るもの

- **Phase 2-A-3b-2（別承認）**: ProductCatalogItem の作成・編集・アーカイブ。
- **writeDataAccess（機密参照ログ）の本格実装は次段（2-A-3b-2 / 2-A-3c）へ送る**。理由: 今回は CompanyPolicy の書き込み最小実装が目的であり、AI 参照経路がまだ無く、機密参照ログの詳細設計はAI参照実装と同時に行うのが適切なため。
- 編集・アーカイブの E2E 追加、詳細画面・検索、Knowledge/AIタスク連携（doc33 §7 の後続範囲）。

## 6. 判定

- **GO（Phase 2-A-3b-1 完了・smoke 13/13 green・破壊的操作ゼロ・CompanyPolicy のみ）。**
- 参照: 設計=doc33／read-only可視化=doc36／本番確認=doc38＋doc14 §40／本書=書き込み第一段。
- 次: Phase 2-A-3b-1 の main 反映（push-only・別承認）→ 本番確認 → Phase 2-A-3b-2 の承認判断。
