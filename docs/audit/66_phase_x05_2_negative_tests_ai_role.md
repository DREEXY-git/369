# 66. Phase X-05-2 — 否定系テスト第一弾（AIロール拒否・判定 GO・commit-only)

> doc63 §5 の否定系テスト設計のうち最優先★1「**AIロール拒否**」を自動テスト化（**A案採用**: actions層に重複していた isHumanUser を packages/shared の純粋関数へ抽出し単体テスト追加）。
> **挙動不変・RBAC変更なし・DB操作なし・schema/migration/seed変更なし・package/lock変更なし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- **「AIは会社の頭脳（会社方針・商品カタログ・営業プレイブック）を書き換えられない」という一番大事な約束を、自動テストで守り始めました。**
- これまでこの約束は、3つのファイルに同じ判定コードが手書きコピーされているだけで、テストが1本もありませんでした（doc63 で特定した最大の穴）。
- 今回: 判定を共通部品1つにまとめ、**5本の否定系テスト**を追加。今後は CI が push のたびに「AIロールは人間扱いされないこと」を自動で検証し続けます。
- 動きは何も変わっていません（テスト216本・E2E 18本すべて green で実証）。

## 2. 今回の目的と、Phase X-05-1 完全クローズ後に行う理由

- 目的: Company Brain 書き込み禁止が **actions層の isHumanUser だけに依存し自動テストゼロ**という品質穴の解消（doc63 §3 の最重要発見）。
- 今やる理由: CI Stage 1 が実走 green で本稼働した（doc65）直後だからこそ、**追加したテストが即座に自動実行され続ける**。次領域（PII近接）に進む前に砦をテストで固める。

## 3. 実装前 read-only 監査の事実（doc66 §Evidence Map も参照）

| # | 事実 | 根拠 |
|---|---|---|
| 1 | isAiRole は rbac.ts:146 に既存（AI_AGENT/AI_ASSISTANT 判定） | packages/shared/src/rbac.ts |
| 2 | **rbac 上 AI_AGENT は knowledge:create を持つ**（rbac.ts:100-104 の grant に 'knowledge'×'create'。他機能の下書き用） | 同上 |
| 3 | よって **actions層の isHumanUser が AIロール拒否の唯一の砦**だった（テストゼロ） | doc63 §3 |
| 4 | ローカル isHumanUser は brain 3actions に**一字一句同一**で重複定義されていた | 3ファイルの grep 実測 |
| 5 | shared の index.ts は `export * from './rbac'`（index 変更不要） | packages/shared/src/index.ts |
| 6 | externalAiAllowed 入力欄 0件・brain 3actions の delete/deleteMany 0件・ALLOWED_LABELS は NORMAL/INTERNAL の2択×3 | grep 実測 |
| 7 | CI Stage 1 workflow は main に存在（追加テストは自動実行対象になる） | git ls-tree |

## 4. 変更内容（挙動不変）

| # | ファイル | 内容 |
|---|---|---|
| 1 | `packages/shared/src/rbac.ts` | **isHumanUser を純粋関数として追加**（`{ roles: RoleKey[] }` を受け、AIロールを1つでも含めば false・空roles も false＝**混在 roles は安全側 false**。ローカル実装と同一ロジック）。**既存の isAiRole・ROLE_PERMISSIONS・権限表は無変更＝RBAC変更なし・AI_AGENT の knowledge:create も無変更** |
| 2 | `packages/shared/src/__tests__/rbac.test.ts` | **否定系テスト5本追加**（既存テストは無変更・削除なし）: ①AI_AGENT は人間ではない＋**「rbac 上 knowledge:create を持つ」前提自体もテストで固定** ②AI_ASSISTANT は人間ではない ③混在 roles（STAFF+AI_AGENT 等）は人間扱いしない ④人間ロールのみは人間扱い ⑤空 roles は安全側 false |
| 3-5 | brain 3actions.ts（policies / catalog / playbooks） | **app code変更は3actionsの共通関数差し替えのみ**: ローカル isHumanUser 定義（3重複）を削除し `import { isHumanUser } from '@hokko/shared'` へ。呼び出し箇所・判定順序・redirect 先は一切変更なし。不要になった isAiRole / CurrentUser の import のみ整理 |

- **変更していないもの**: RBAC権限表・**tenantId制約変更なし**・物理削除なし（追加していない）・externalAiAllowed true UIなし（追加していない）・ALLOWED_LABELS 2択・schema/migration/seed・package/lock・workflow（.github/workflows/ci.yml 無変更）・knowledge/search・company-brain-reference。

## 5. 検証結果（全green・修正ループ0回）

| # | 検証 | 結果 |
|---|---|---|
| 1 | pnpm db:generate | ✅ exit 0 |
| 2 | pnpm test | ✅ **216 passed（211→+5・23 files）** |
| 3 | pnpm typecheck | ✅ exit 0（CurrentUser 除去・shared 型互換も確認） |
| 4 | pnpm lint | ✅ exit 0（未使用 import なし） |
| 5 | SKIP_DB_SETUP=1 pnpm build | ✅ exit 0 |
| 6 | Playwright smoke（ローカルPG起動→migrate deploy「No pending」→seed playbooks:6→/login 200→実行→後片付け） | ✅ **18/18 green（17.4s）＝書き込み系E2E（会社方針・商品カタログ・営業プレイブックの作成フロー）を含めて挙動不変を実証** |

- 未実施検証: なし（必須5種＋任意 smoke まで全実施）。

## 6. Evidence Map / Assumption Log / Unknowns Log / Risk Register / DoD

**Evidence Map**: ①「挙動不変」→ smoke 18/18＋test 216 の実測ログ（§5）②「重複が同一だった」→ 3ファイル grep（§3-4）③「RBAC無変更」→ 変更ファイル一覧に rbac 権限表の diff なし（ROLE_PERMISSIONS 部分に差分なし・関数追加のみ）④「AI_AGENT が knowledge:create を持つ」→ rbac.ts:100-104 ＋ 新テスト内 `canForRoles(['AI_AGENT'],'knowledge','create')===true` で恒久固定。
**Assumption Log**: CurrentUser.roles は RoleKey[] と互換（typecheck exit 0 で検証済み・仮説解消）。
**Unknowns Log**: 本 commit push 後の CI run 結果（未来事象・push は別承認。追加テストが CI で回るのは push 後）。
**Risk Register**: リスク=共通化による将来の意図せぬ変更が3画面同時に波及（重大度低・可能性低）→ 対応=まさにそのために単体テスト5本が変更を検知する構造にした。
**Definition of Done**: 実装＋テスト green ✅／挙動不変の実証（smoke）✅／docs・tasks・vault 反映 ✅／commit 作成 ✅／push は別承認 ⏳。

## 7. 判定と次アクション

- **判定 GO**（否定系テスト第一弾 完了・test 216・smoke 18/18・挙動不変・commit-only）。
- GO済み基準は **Phase 2-B-5 / `83d35bc`** のまま（本変更は挙動不変のリファクタ＋テスト追加のため）。
- 次アクション（いずれも別承認）: 1. **X-05-2 push-only**（push により CI が新テスト込みで自動実行される）2. **Stage 2（build の CI 追加）/ 追加否定系テスト（doc63 §5 ★2〜★5: 権限拒否・label制限・externalAiAllowed封印・物理削除禁止の静的チェック script 化等）の承認判断**。
- 外部送信なし・SNS投稿なし・口コミ投稿なし・顧客の声公開なし・**ENSHiN OS外部発信なし**・**Phase 8なし**・**Phase 2-C / Case Study / Customer Pain は別承認**。
- 参照: 設計=doc63 §5／CI=doc64・doc65／安全補正の起源=doc40（2-A-3b-1）。
