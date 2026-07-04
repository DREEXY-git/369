# 72. Phase 2-C-2 — CaseStudy schema 追加（schema-only・判定 GO）

> Phase 2-C-1 詳細設計（doc71 参照・Case Study 先行 / Customer Pain 後続）を受けた、CaseStudy model の schema 追加＋migration 作成。Mode E（schema-only の最小実装）。
> **CaseStudy schema 追加のみ。seedなし・UIなし・Server Actionなし・AI参照なし・writeAuditは2-C-4。外部送信なし・実LLMなし・AIコストなし・本番接触なし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- 顧客事例（Case Study）を保存するための**器（データベースの入れ物）だけ**を追加しました。画面・書き込み機能・AI参照はまだありません（各段別承認）。
- 器の時点から安全を固定: **匿名化が既定値（anonymized default true）・非公開が既定値（publishStatus private）・外部AI送信は禁止既定値（externalAiAllowed false）・許諾状態は「なし」から開始（consentStatus none）**。顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない前提の設計コメントを schema 自体に明記しました。
- 既存のデータ・テーブルには一切触っていません（追加のみ・破壊的SQLなし・ローカル検証のみで本番DBには接触していません）。
- 判定: **GO**（ローカル検証まで全 green。本番反映は main push 後の既存経路・push は別承認）。

## 2. 実際の変更

| 変更 | 内容 |
|---|---|
| `packages/db/prisma/schema.prisma` | SalesPlaybookEntry 直後に **CaseStudy model 1件のみ追加**（＋安全方針コメント7行）。既存 model・既存 enum は無変更 |
| `packages/db/prisma/migrations/20260704160836_phase2c2_case_study/migration.sql` | 新規 migration **1本のみ**（CREATE TABLE "CaseStudy"＋CREATE INDEX 3本） |

- **CustomerPain model なし**（Customer Pain 後続・高機密ラベル対応の別の重い承認が先）。
- **ConsentRecord 無変更・SuppressionList 無変更・Customer model 無変更・ConfidentialityLabel enum 無変更・labels.ts 無変更・RBAC 無変更・company-brain-reference.ts 無変更**（doc71 §6-3 の第一候補どおり、許諾は CaseStudy 側の consentStatus + consentRecordId 参照で管理）。

## 3. CaseStudy model の設計（doc71 §6-2 準拠）

- フィールド: id / tenantId / title / body / industry? / challenge? / solution? / outcome? / **anonymized Boolean default true** / **consentStatus String default "none"**（none|requested|granted|revoked）/ consentRecordId?（relation なしの ID 参照）/ customerId?（relation なしの ID 参照・匿名時 null）/ **publishStatus String default "private"** / tags String[] / label ConfidentialityLabel default INTERNAL / **externalAiAllowed Boolean default false** / sourceType? / sourceNote? / createdById? / updatedById? / createdAt / updatedAt / archivedAt?（ソフトアーカイブ・物理削除禁止の前提）。
- index: `[tenantId]`・`[tenantId, label]`・`[tenantId, publishStatus]`（すべて tenantId 先頭・既存命名規則どおり）。
- schema コメントに明記した安全方針: **顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない**／初期スコープは非公開・架空データ・匿名化 default true／publishStatus は private 固定運用から開始（公開機能・PR配信・SEO公開・SNS投稿は Phase 2-C の範囲外＝**公開しない・SNS投稿しない・PR配信しない・SEOページ公開しない**）／externalAiAllowed は false 固定運用／**label NORMAL / INTERNAL 2択は UI/action 側で制限予定**（schema default は既存3テーブルと同じ INTERNAL）／Customer Pain は高機密ラベル対応後の後続／AI参照は 2-C-5 の別承認。

## 4. migration.sql の安全確認（全文検査済み）

| 検査 | 結果 |
|---|---|
| CREATE TABLE "CaseStudy" | あり（1回のみ） |
| CREATE INDEX | 3本（すべて CaseStudy 対象・tenantId 先頭） |
| DROP TABLE / DROP COLUMN / ALTER TABLE ... DROP / TRUNCATE / DELETE FROM / 既存テーブルへの UPDATE | **ゼロ**（**migration 追加のみ・破壊的SQLなし**・既存 table / column / enum への操作なし） |
| 実データ・secret の混入 | なし（DDL のみ） |

## 5. 検証結果（ローカルのみ・本番接触なし）

| 検証 | 結果 |
|---|---|
| DB 接続先の事前確認 | `.env` の接続先は localhost:5432 のみ（値非表示で確認・**ローカルのみ・本番ではない**） |
| prisma migrate dev --name phase2c2_case_study（ローカルDB） | ✅ 成功（作成＋適用＋client 再生成。doc34 固定の再現手順どおり） |
| prisma migrate status | ✅ 12 migrations / Database schema is up to date! |
| node scripts/check-company-brain-safety.mjs | ✅ passed（actions: 3, ui files scanned: 147） |
| pnpm test | ✅ **216/216 passed**（23 files） |
| pnpm typecheck | ✅ 全 workspace green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ 本番ビルド成功 |
| E2E smoke | **未実施・成功扱いしない**（schema-only・UI 変更なしのため。ミッション指示どおり原則未実施） |
| 後片付け | ✅ pg_ctl -m fast stop 完了 |

- 本番DBへの migration 実行はしていない。本番反映は main push（別承認）後の既存経路（build の prebuild = generate + vercel-setup）で行われ、その本番確認は別途利用者実測。

## 6. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「CaseStudy 1件のみ・CustomerPain なし」→ schema grep 実測（CaseStudy model 定義1件・CustomerPain 0件）②「既存無変更」→ git 差分が schema.prisma（追記のみ）＋新規 migration ディレクトリの2点のみ ③「破壊的SQLなし」→ migration.sql 全文検査（§4）④「検証 green」→ §5 の実行結果 ⑤「設計準拠」→ doc71 §6-1/6-2/6-3 との突合（フィールド・default・ID参照方式・index が一致）。
**Assumption Log**: ①本番DBへの適用は Vercel 既存経路（prebuild の migrate）で成功する前提（2-A-2 / 2-B-2 で2回実証済みの型）②label の 2択制限・匿名化解除の前提条件（consentStatus=granted）は 2-C-4 の actions 層で実装される前提（schema 単体では強制されない）。
**Unknowns Log**: ①本番 migrate の実走結果（push 後の利用者確認待ち）②consentStatus の運用フロー詳細（2-C-4 で設計・実装）③AI参照時の anonymized 扱い（2-C-5 の別承認で判断）。
**Risk Register**: 最大リスクは**器だけ先行し中身の安全制御が未実装の期間**（中）→ 対応: 書き込み経路が存在しないため実データ混入は構造的に不可能（Server Action なし・seed なし・UI なし）。次点は本番 migrate 失敗（低・追加のみの DDL のため衝突要素なし）→ 失敗時は HOLD 記録して調査。
**Definition of Done**: Scout 一致 ✅／read-only 監査 ✅／CaseStudy model 追加（1件のみ）✅／migration 追加のみ・破壊的SQLなし ✅／検証 green（generate・test 216・typecheck・lint・build・migrate status）✅／doc72・CURRENT_STATE・PROGRESS・vault 記録 ✅／commit ✅／**push なし** ⏳（別承認）。

## 7. 次回Claude Codeに渡す推奨プロンプト案

> Phase 2-C-2 記録 commit の push-only（feature→main・fast-forward・別承認）。push 後、Vercel の build（prebuild で migrate 反映）と既存画面無回帰を利用者実測で確認（doc49 の型・§0 テンプレート）。その後 Phase 2-C-3（read-only 画面＋架空 seed デモデータ・別承認）の承認判断へ。

## 8. 判定

**GO**（Phase 2-C-2 schema変更・ローカル検証まで完了）。GO済みプロダクト基準は **Phase 2-B-5 / `83d35bc`** のまま（本番確認前のため昇格しない）。**push なし（commit-only）**・Phase 2-C-3 以降はすべて別承認。
