# 68. Phase X-05-3 — Company Brain 静的安全ゲート第一弾（判定 GO・commit-only）

> Mode D（CI / Test改善）。doc63 §5 の ★3 label制限・★4 externalAiAllowed封印・★5 物理削除禁止＋isHumanUser 共通化の維持確認を、**静的チェック script**（`scripts/check-company-brain-safety.mjs`・Node標準ライブラリのみ）として実装し、**CI Stage 1**（`.github/workflows/ci.yml`）に1 step 追加した。
> **package変更なし・lock変更なし・app挙動変更なし（apps/packages 差分ゼロ）・DB操作なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- このプロジェクトが毎回手動で確認してきた「**できてはいけないことが、コード上に存在しないこと**」の機械検査を、**自動化**しました。
- 具体的に守るもの: ①機密ラベルは通常/社内限の**2択のまま** ②**外部AI送信を許可するボタンが存在しない**まま ③会社の頭脳に**物理削除が存在しない**まま ④「AIは書き換えられない」共通判定が**正しく使われ続けている**こと。
- 今後は GitHub にコードが上がるたびに、この検査が **CI で自動実行**されます。誰かがうっかり（または知らずに）安全境界を壊す変更をしても、**赤信号で止まります**。
- アプリの動きは何も変えていません（apps/ と packages/ の差分はゼロです）。

## 2. 実装内容

| # | ファイル | 内容 |
|---|---|---|
| 1 | `scripts/check-company-brain-safety.mjs` 新規 | Node.js 標準ライブラリのみの静的チェック（package追加なし・package.json script追加なし）。検査項目: ①brain 3actions に **delete/deleteMany（`.delete(` / `deleteMany`）が無い（物理削除禁止）** ②各actionsに **`ALLOWED_LABELS = ['NORMAL', 'INTERNAL'] as const;`（NORMAL / INTERNAL の2択）が各1件** ③各actionsが **`import { isHumanUser } from '@hokko/shared';`** を使用 ④`function isHumanUser` のローカル重複が復活していない ⑤`apps/web/app` 配下（147ファイル走査）に **`name="externalAiAllowed"` / `name='externalAiAllowed'` の入力欄が無い（externalAiAllowed封印）** ⑥shared の `export function isHumanUser` が1件 ⑦rbac.test.ts に isHumanUser テスト（**AIロール拒否**の否定系）が存在。失敗時は**どの安全境界が破れたかを日本語で表示**して exit 1・成功時は `Company Brain safety checks passed.` |
| 2 | `.github/workflows/ci.yml` 編集 | **CI Stage 1** に step「Company Brain safety checks」（`node scripts/check-company-brain-safety.mjs`）を1つ追加。位置: `pnpm db:generate` の後・`pnpm test` の前＝実行順は **install → db:generate → 静的安全ゲート → test → typecheck → lint**。deploy/production/secrets/DATABASE_URL/migrate/seed/build/E2E は従来どおり不使用 |

- **Stage 2 は別承認・Stage 3 は別承認**（build / smoke の CI 追加は今回含まない）。★2（権限拒否の本格E2E）も別承認。

## 3. 検証結果（全green・修正ループ0回）

| # | 検証 | 結果 |
|---|---|---|
| 1 | `node scripts/check-company-brain-safety.mjs` | ✅ exit 0（`Company Brain safety checks passed. (actions: 3, ui files scanned: 147)`） |
| 2 | pnpm db:generate | ✅ exit 0 |
| 3 | pnpm test | ✅ **216 passed（23 files）** |
| 4 | pnpm typecheck | ✅ exit 0 |
| 5 | pnpm lint | ✅ exit 0 |
| 6 | SKIP_DB_SETUP=1 pnpm build | ✅ exit 0 |
| 7 | Playwright smoke | **未実施**（brain actions 等の実コード変更ゼロ＝app挙動不変のため。成功扱いしない） |

- CI 上での実走（新 step 込みの run green）は **push 後の利用者確認**（doc69 候補）。

## 4. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「安全境界は現状すべて健全」→ 実装前 read-only 監査＋script exit 0（実測）②「app挙動不変」→ apps/packages 差分ゼロ（Gate 2 実測）＋test 216/typecheck/lint/build green ③「CI で自動実行される設計」→ ci.yml の step 追加（diff 実測）。
**Assumption Log**: script の走査対象（brain 3actions・apps/web/app 配下の ts/tsx）で ★3/★4/★5 の破れは捕捉できる（現状の実装配置に基づく。配置が変われば script の欠落検知が発動する設計）。
**Unknowns Log**: ①push 後の CI run 結果（未来事象・green 断定しない）②script の**失敗系は実ファイルを壊さず検証できないため未実測**（コードレビューでの確認のみ。故意にファイルを壊すテストは絶対禁止コマンド回避と安全のため実施しない）。
**Risk Register**: ①文字列一致ベースのため、表記変更（例: ラベル定義の書式変更）で偽陽性の可能性（重大度低・その場合は script の意図的更新を別承認で）②偽陰性（別表記での違反）の可能性は残る＝単体テスト（X-05-2）・E2E との多層防御で補完。
**Definition of Done**: script 実装＋exit 0 ✅／CI step 追加 ✅／検証6種 green ✅／docs・tasks・vault 反映 ✅／commit ✅／push ⏳（別承認）／CI 実走確認 ⏳（push 後・利用者）。

## 5. 今回やらないこと・安全確認

- **package変更なし・lock変更なし**・apps/packages 無変更・schema/migration/seed/rbac/labels 無変更・認証/権限/tenantId 制約変更なし。
- **DB操作なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし**・secrets なし。
- **Stage 2 は別承認・Stage 3 は別承認・Phase 2-C は別承認**（Case Study / Customer Pain 実装にも進まない）・Phase 8なし・**ENSHiN OS外部発信なし**・369-vault 構造変更なし。
- **push なし（commit-only）**。

## 6. 判定と次アクション

- **判定 GO**（静的安全ゲート第一弾 実装完了・検証全green・commit-only）。
- doc63 §5 の充足状況: ★1 AIロール拒否=単体テスト（X-05-2）✅／**★3・★4・★5=静的ゲート（本書）✅**／★2 権限拒否 E2E・★6〜★8 は別承認の残候補。
- GO済み基準は **Phase 2-B-5 / `83d35bc`** のまま。
- 次アクション（いずれも別承認）: 1. 本 commit の push-only → CI 実走確認（新 step 込み・doc69 候補）2. Stage 2（build の CI 追加）/ ★2 権限拒否テスト / 次領域入口レビューの選択。
- 参照: 設計=doc63 §5／CI基盤=doc64・65／否定系テスト第一弾=doc66・67。
