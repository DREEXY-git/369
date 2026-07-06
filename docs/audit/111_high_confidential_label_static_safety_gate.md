# 111. 高機密ラベル 安全ゲート静的検査 実装（候補B）— scripts/check-company-brain-safety 拡張・実行時機能なし

- 日付: 2026-07-06
- 種別: **Feature実装（候補Bのみ）**。範囲は既存 `scripts/check-company-brain-safety.mjs` の拡張のみ（静的検査＝CIスクリプト・実行時挙動不変）。
- Audit Doc: 111
- Product Phase: Data Classification / Security Governance
- Lineage: Data Classification / High Confidential Label Lineage
- Stage: Candidate B Implementation
- Status: GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `017516f19efb66df1b077b81e95520f112fb7ed7`
- Scope: doc110 候補A（高機密ラベル閲覧判定の純粋関数＋否定系テスト）の守りが後退したら機械検知する**安全ゲート静的検査**の追加
- Not Included: 解禁・Customer Pain実装（画面/Server Action/DB）・schema変更・migration・RBAC変更・label定義変更・company-brain-reference変更・AI参照条件変更・writeDataAccess/writeAudit 実接続・PII保存・実顧客データ保存・本番確認・push
- Next Action: doc111 push-only（別承認）
- Do Not Start: 高機密ラベル実装・解禁 / Customer Pain画面・Server Action / schema変更 / migration / RBAC変更 / label定義変更 / company-brain-reference変更 / 本番確認

## 1. 非エンジニア向け要約

- doc110 で「この人はこの高機密詳細を見てよいか」を判定する**計算式（純粋関数）**を作りました。今回はその**守りが将来こっそり弱められたら自動で気づく「見張り」**を追加した回です（候補B）。
- 追加したのは、既にある安全チェックのスクリプト（`scripts/check-company-brain-safety.mjs`）への**検査項目の追記だけ**です。**新しい実行時機能・画面・DB・保存は一切作っていません**。
- これは**候補Bのみ**であり、**解禁ではない**。**高機密ラベル解禁なし**・**Customer Pain実装なし**（画面/Server Action/DB なし）・**Data Classification実装なし**。既存の会社ブレインや CaseStudy の安全チェックは**一切弱めていません**（追記のみ）。

## 2. 候補Bのみであること

- 本書は doc109 の**候補B（安全ゲート静的検査）**のみの実装記録である。
- 候補A（純粋関数＋否定系テスト）は doc110 で実装・正本反映済み。候補C（Customer Pain schema・画面・Server Action・writeDataAccess/writeAudit 実接続）は**今回やらない**（schema/migration を伴う別の重い人間承認）。
- 追加した検査は**静的検査**（ファイル内容を読んで文字列を確認するだけ）であり、**実行時の挙動・DB・画面・保存には一切触れない**。

## 3. 追加した安全ゲート（`scripts/check-company-brain-safety.mjs` 拡張）

既存スクリプトの末尾（結果出力の直前）に、候補A を守る検査ブロックを**追記**した（既存の全チェックは削除・弱体化せず維持）。追加した検査:

- **候補Aファイルの存在**: `packages/shared/src/customer-pain-access.ts` が存在すること（欠落したら FAIL）。
- **純粋関数の境界**: 同ファイルが `@prisma` / `PrismaClient` を import していないこと（DB を読まない純粋関数のまま）。
- **標準閲覧式の関数**: `canViewCustomerPainDetail` と `evaluateCustomerPainAccess` が存在すること。
- **機密ラベルの固定**: `CUSTOMER_PAIN_LABEL: ConfidentialityLabel = 'CUSTOMER_CONFIDENTIAL'`（CUSTOMER_CONFIDENTIAL を指す）。
- **5条件の存在**: `viewer.tenantId === record.tenantId`（tenantId）／`canForRoles(viewer.roles, 'knowledge', 'update')`（**knowledge:update**）／`canAccessLabel(viewer.roles, CUSTOMER_PAIN_LABEL)`（**canAccessLabel**）／`isHumanUser(viewer)`（**AIロール除外**）／`record.archivedAt == null`（archivedAt）。いずれかが消えたら FAIL。
- **拒否理由の列挙**: `CUSTOMER_PAIN_DENY_REASONS` が存在すること（安全な列挙値のみ）。
- **OR緩和の検知**: `canViewCustomerPainDetail` の本文を抽出し、`||` が混入していたら FAIL（**5条件 AND 交差のみ・OR緩和禁止**）。関数本文は `canViewCustomerPainDetail` 宣言〜`evaluateCustomerPainAccess` 宣言の範囲を抽出して判定（過剰検知しない最小抽出）。
- **否定系テストの維持**: `packages/shared/src/__tests__/customer-pain-access.test.ts` が存在し、`tenant_mismatch` / `no_knowledge_update` / `label_role_denied` / `ai_role` / `archived` / `OR 緩和` / `CUSTOMER_PAIN_DENY_REASONS` の検証を含み続けること。
- **runtime 混入の検知**: `apps` 配下の `.ts/.tsx`（node_modules/.next/dist を除外）に `CustomerPain` / `customerPain` / `customer_pain` が現れたら FAIL（**Customer Pain runtime 実装なし**＝画面/Server Action/DB は候補C の別承認）。
- **AI非注入の検知**: `apps/web/lib/company-brain-reference.ts` に上記トークンが現れたら FAIL（**AIに読ませない**・**AI参照条件変更なし**）。
- **label定義の不変**: `packages/db/prisma/schema.prisma` と `packages/shared/src/labels.ts` の `CUSTOMER_CONFIDENTIAL` が各2件のまま（変更されたら FAIL・**schema変更なし**・**label定義変更なし**）。

## 4. 既存機能を誤検知で落とさない配慮

- 既存の会社ブレイン／CaseStudy にある `externalAiAllowed` / `publishStatus` は**グローバルに禁止していない**（既存の `externalAiAllowed` UI 封印検査はそのまま維持）。今回追加したのは **Customer Pain 固有トークン**（`CustomerPain` / `customerPain` / `customer_pain`）の混入検知のみ。
- `apps` 走査は `node_modules` / `.next` / `dist` を除外する専用ウォーカー（`walkSafe`）を用い、ビルド生成物や依存を誤検知しない。
- 既存の安全ゲート（物理削除禁止・label制限・isHumanUser共通化・CaseStudy許諾/匿名化/表示統治・突合判定の段階分離 等）は**1件も削除・変更していない**（末尾追記のみ）。

## 5. 検証結果

すべてローカルで実行・green（本番接触なし）:

- 安全ゲート: `node scripts/check-company-brain-safety.mjs` → **exit 0**（`Company Brain safety checks passed. (actions: 4, ui files scanned: 156)`）。
- 全単体テスト: `pnpm test` → **26 files / 265 tests passed**（候補A の9件を含む・回帰なし。今回はテスト追加なし＝スクリプト拡張のみ）。
- 型検査: `pnpm typecheck`（web / worker とも `tsc --noEmit`）→ **exit 0**。
- Lint: `pnpm lint`（eslint）→ **exit 0**（Next.js の "Pages directory" 通知は既存の警告表示で error ではない）。
- **ゲートが no-op でないことの確認**: 破損を模したスクラッチ入力で、OR緩和の混入・`isHumanUser` の欠落・`apps` への CustomerPain トークン混入・label定義の件数変化を、いずれも FAIL 判定できることを確認した（守りの後退を実際に検知する）。
- `pnpm build` は**未実施**。理由: 今回の変更は静的検査スクリプト（`.mjs`）と docs/tasks/vault のみで **apps/web runtime・schema を変更しない**こと、`pnpm typecheck` が web / worker を含む全ワークスペースを `tsc` でコンパイル済みであること、build は重量級で本ミッションの範囲（静的検査）に対して過剰なため。回帰リスクは typecheck＋full test＋safety script で担保。

## 6. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/feature = `017516f19efb66df1b077b81e95520f112fb7ed7`・working tree clean・`origin/main..HEAD` 空）。
- 守る対象の根拠: doc110（候補A＝`canViewCustomerPainDetail` / `evaluateCustomerPainAccess` / `CUSTOMER_PAIN_LABEL` / `CUSTOMER_PAIN_DENY_REASONS`）を read-only で確認。設計根拠: doc105 §5〜§9・§15・§17〜§19。
- 既存スクリプトの前例: `scripts/check-company-brain-safety.mjs`（Phase X-05-3・doc68）の「消えたら FAIL / 現れたら FAIL」方式を踏襲。
- 封印維持の実測: company-brain-reference への CustomerPain/CaseStudyConsent 注入 0・`anonymized: true` 2・**apps の Customer Pain runtime 実装 0**・schema/labels.ts の CUSTOMER_CONFIDENTIAL 各2（不変）・rbac.ts / labels.ts 無変更。
- ゲート有効性の実測: スクラッチ負例（OR緩和／isHumanUser欠落／apps混入／label件数変化）でいずれも FAIL 判定を確認。

## 7. Assumption Log

- OR緩和の検知は `canViewCustomerPainDetail` 宣言〜`evaluateCustomerPainAccess` 宣言の範囲抽出で行う（過剰検知を避ける最小抽出）。関数の並び順が変わった場合は抽出範囲を実コードに合わせて調整する（意図の確定は本書、文字列の追従は実装）。
- `apps` 走査は `node_modules` / `.next` / `dist` を除外する。将来ディレクトリ構成が変わっても Customer Pain 固有トークンの混入検知の意図は不変。
- 本検査は静的（文字列一致）であり、意味論的検証は否定系テスト（候補A・vitest）が担う。両者の二層で守る。

## 8. Unknowns Log

- 高機密ラベル実装・解禁の可否判断の時期（候補A+B 完了後の個別人間承認・人間判断待ち）。
- 候補C（Customer Pain schema・画面・Server Action・writeDataAccess/writeAudit 実接続）の時期（schema/migration を伴う別の重い承認）。
- CI（`.github/workflows/ci.yml`）へ本検査ステップが既に組み込まれているか（既存の Company Brain safety step が同スクリプトを実行する想定・.github は本ミッションで変更しない）。

## 9. Risk Register

- **静的検査の文字列追従漏れリスク**: 実コードのリファクタで検査対象文字列が変わると誤検知/検知漏れの可能性 → 否定系テスト（候補A・意味論）と二層で守り、Assumption Log に追従方針を明記。
- **既存ゲートの誤削除リスク**: 末尾追記のみとし、既存チェックは1件も変更しないことで回避（diff で確認）。
- **既存機能の誤検知リスク**: Customer Pain 固有トークンに限定し、`externalAiAllowed` / `publishStatus` はグローバル禁止しない。`node_modules` 等を除外。
- **未push commit の揮発リスク**: 次の doc111 push-only（別承認）で解消。

## 10. Definition of Done

- [x] 既存 `scripts/check-company-brain-safety.mjs` を拡張し、候補A の標準閲覧式5条件・OR緩和禁止・拒否理由列挙・否定系テスト維持・runtime/AI非注入・label定義不変を機械検査。
- [x] 既存の安全ゲートを1件も削除・弱体化していない（末尾追記のみ）。
- [x] `node scripts/check-company-brain-safety.mjs` exit 0・`pnpm test` 265・`pnpm typecheck` exit 0・`pnpm lint` exit 0。build は未実施（理由 §5）。
- [x] ゲートが no-op でないこと（負例で FAIL する）を確認。
- [x] schema/migration/RBAC/label定義/company-brain-reference/apps runtime 無変更。
- [x] doc111・CURRENT_STATE・PROGRESS・vault ノート＋index の正本反映。
- [x] 許可6ファイルのみで commit 1件作成・push なし・working tree clean・未push1件で停止。

## 11. 次回推奨プロンプト案

1. **doc111 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **高機密ラベル実装・解禁の可否判断ミッション**（候補A+B 完了後の個別人間承認・重い判断。承認する場合は「何をもって解禁とするか」の範囲を §0 で明示。まだ解禁しない選択も可）。
3. 候補C（Customer Pain schema・画面・Server Action・実接続）は、高機密ラベル解禁可否判断のあとの schema/migration を伴う別の重い人間承認。
4. CI / Test / Release Governance 等の品質基盤強化ミッション（別承認）。

## 12. 判定

**判定: GO**（doc110 候補A を守る安全ゲート静的検査を既存 `scripts/check-company-brain-safety.mjs` に追記し、全検証 green・負例で FAIL することも確認）。

ただし、これは候補Bのみであり**解禁ではない**。**高機密ラベル解禁なし**・**Customer Pain実装なし**（画面/Server Action/DB なし・**Customer Pain runtime 実装なし**）・**Data Classification実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**company-brain-reference変更なし**・**AI参照条件変更なし**・**PII保存なし**・**実顧客データ保存なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
