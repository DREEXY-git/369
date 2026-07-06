# 110. 高機密ラベル閲覧判定の純粋関数 実装（候補A）— packages/shared のみ・解禁なし・DB非依存

- 日付: 2026-07-06
- 種別: **Feature実装（候補Aのみ）**。範囲は `packages/shared` 内の純粋関数＋否定系テストのみ。
- Audit Doc: 110
- Product Phase: Data Classification / Security Governance
- Lineage: Data Classification / High Confidential Label Lineage
- Stage: Candidate A Implementation
- Status: GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `f72c4e40b008e69684f262593d538aa29ac6245c`
- Scope: doc109 候補A（AIロール除外の再利用＋Customer Pain 高機密詳細の閲覧可否を判定する純粋関数＋否定系テスト）の最小実装
- Not Included: 解禁・Customer Pain実装（画面/Server Action/DB）・schema変更・migration・RBAC変更・label定義変更・company-brain-reference変更・AI参照条件変更・writeDataAccess/writeAudit 実接続・PII保存・実顧客データ保存・本番確認・push
- Next Action: doc110 push-only（別承認）
- Do Not Start: 高機密ラベル実装・解禁 / Customer Pain画面・Server Action / schema変更 / migration / RBAC変更 / label定義変更 / company-brain-reference変更 / 本番確認

## 1. 非エンジニア向け要約

- doc109 で「A＝守りの判定ロジックとテストだけ／B＝自動見張り／C＝Customer Pain 本実装（別承認）」に分けました。今回はその**一番軽い A だけ**を実装した回です。
- 実装したのは「**この人はこの高機密の詳細を見てよいか**」を判定する**計算式（純粋関数）**と、それが正しく拒否できるかを確かめる**テスト**だけです。
- **DB・画面・保存には一切つないでいません**。**解禁でもありません**。コードは `packages/shared`（純粋ロジック置き場）の中だけで完結し、schema も権限定義もラベル定義も変えていません。
- これは候補Aのみであり、**解禁ではない**。**高機密ラベル解禁なし**・**Customer Pain実装なし**（画面/Server Action/DB なし）・**Data Classification実装なし**。

## 2. これは候補Aのみであること

- 本書は doc109 の**候補A（純粋な権限判定関数＋否定系テスト）**のみの実装記録である。
- 候補B（安全ゲート静的検査）・候補C（Customer Pain schema・画面・Server Action）は**今回やらない**（別承認）。
- 純粋関数の関数名・型名に「CustomerPain」が含まれるが、これは**判定ロジック（設計名）**であり、**Customer Pain の runtime 実装（画面・Server Action・schema）ではない**。両者を区別すること。

## 3. 実装可否判定（すべて満たしたので実装した）

以下をすべて満たすことを read-only 監査で確認した:

- **schema変更なし**（Prisma import なし・DB 型に触れない）
- **migrationなし**
- **RBAC変更なし**（`rbac.ts` の `ROLE_PERMISSIONS` を変更せず、既存 `canForRoles` / `isHumanUser` を利用）
- **label定義変更なし**（`labels.ts` の許可ロールを変更せず、既存 `canAccessLabel` を利用）
- **company-brain-reference変更なし**
- **apps/web runtime 変更なし**（apps 配下に差分ゼロ）
- Customer Pain 画面なし・Server Action なし・**本番確認なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**

## 4. 実装した純粋関数

新規ファイル `packages/shared/src/customer-pain-access.ts`（DB 非依存・Prisma import なし・apps/web 参照なし・company-brain-reference 参照なし）:

- `CUSTOMER_PAIN_LABEL: ConfidentialityLabel = 'CUSTOMER_CONFIDENTIAL'` — Customer Pain が用いる機密ラベル（doc104/doc105 の設計で固定）。
- `CustomerPainViewer` / `CustomerPainRecordMeta` — 判定に必要な最小入力型（PII・本文を含めない。`tenantId` / `roles` と、レコードの `tenantId` / `archivedAt` のみ）。
- `canViewCustomerPainDetail(viewer, record): boolean` — **標準閲覧式（5条件の AND 交差）**。doc105 §6 の擬似コードと同一の意味:
  1. `viewer.tenantId === record.tenantId`（**tenantId** 一致）
  2. `canForRoles(viewer.roles, 'knowledge', 'update')`（**knowledge:update** 以上）
  3. `canAccessLabel(viewer.roles, CUSTOMER_PAIN_LABEL)`（**canAccessLabel**）
  4. `isHumanUser(viewer)`（**AIロール除外**＝既存 `isHumanUser` を**再利用**・AI_AGENT / AI_ASSISTANT を構造的に排除）
  5. `record.archivedAt == null`（未アーカイブ）
  - 1つでも欠けたら false（**OR緩和は禁止**）。
- `evaluateCustomerPainAccess(viewer, record)` — 上と同じ AND 条件を評価し、`{ allowed: true }` または `{ allowed: false; reason }` を返す。`reason` は**安全な列挙値のみ**（`CUSTOMER_PAIN_DENY_REASONS` = `tenant_mismatch` / `ai_role` / `label_role_denied` / `no_knowledge_update` / `archived`）。**自由文・本文断片・PII は理由に入れない**（doc105 §9）。

`isHumanUser` は既存（`packages/shared/src/rbac.ts`・Phase X-05-2）を**再利用し、重複実装していない**。`packages/shared/src/index.ts` に `export * from './customer-pain-access'` を1行追加。

## 5. AND 条件と現行 RBAC/label の関係（設計の裏付け）

doc105 §4 のとおり、`labels.ts` の `CUSTOMER_CONFIDENTIAL` 許可ロールには **AI_AGENT / AI_ASSISTANT / STAFF が含まれる**ため、label 単独では守れない。今回の実装はこれを次の実測事実で否定系テストとして裏付けている:

- `EXECUTIVE` は `CUSTOMER_CONFIDENTIAL` label を満たすが `knowledge:update` を持たない（→ label があっても閲覧不可）。
- `READ_ONLY` は人間だが `CUSTOMER_CONFIDENTIAL` 許可外（→ label 条件で拒否）。
- `['STAFF','AI_AGENT']` は `knowledge:update` も label も満たすが、AI を含むため `isHumanUser` で拒否（混在も拒否）。
- `STAFF` は 5 条件をすべて満たす人間ロールとして閲覧可（superuser でなくても交差を満たせば可）。

## 6. 実装した否定系テスト

新規 `packages/shared/src/__tests__/customer-pain-access.test.ts`（9 ケース・**全 green**）:

1. tenantId 不一致なら閲覧不可（reason `tenant_mismatch`）
2. knowledge:update なしなら閲覧不可（EXECUTIVE＝label 満たすが update なし・reason `no_knowledge_update`）
3. label 許可ロールなしなら閲覧不可（READ_ONLY / EXTERNAL_PARTNER・reason `label_role_denied`）
4. AIロールは権限・ラベルを満たしても閲覧不可（`['STAFF','AI_AGENT']`・reason `ai_role`／純 AI ロール・roles 空も不可）
5. archivedAt ありなら閲覧不可（Date でも ISO 文字列でも・reason `archived`）
6. 全条件を満たす人間ユーザーは allowed（STAFF / DEPARTMENT_MANAGER / ADMIN）
7. **OR 緩和になっていない**（全条件を満たす状態から1条件ずつ崩すと必ず拒否）
8. 拒否理由は**安全な列挙値のみ**（`CUSTOMER_PAIN_DENY_REASONS` に含まれる・自由文/本文断片/PII なし）

## 7. 今回接続しなかったもの（設計どおり）

- **writeDataAccess / writeAudit の実接続はしない**（本純粋関数は「見られるかの判定」まで）。
- 実画面・実データ・実ログ・Customer Pain の器（schema）には接続しない。
- AI 参照経路（company-brain-reference）にも一切触れない。

## 8. 検証結果

すべてローカルで実行・green（本番接触なし）:

- 対象テスト単体: `vitest run packages/shared/src/__tests__/customer-pain-access.test.ts` → **9 passed**。
- 全単体テスト: `pnpm test` → **26 files / 265 tests passed**（既存 256 ＋ 新規 9・回帰なし）。
- 型検査: `pnpm typecheck`（web / worker とも `tsc --noEmit`）→ **exit 0**。
- Lint: `pnpm lint`（eslint）→ **exit 0**（Next.js の "Pages directory" 通知は既存の警告表示で error ではない）。
- `pnpm build`（Next.js web ビルド）は**未実施**。理由: 変更は `packages/shared` の純粋関数に限定され apps/web runtime・schema を変えないこと、`pnpm typecheck` が web / worker を含む全ワークスペースを `tsc` でコンパイル済みであること、build は重量級で本ミッションの範囲（純粋関数）に対して過剰なため。回帰リスクは typecheck＋full test で担保。

## 9. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/feature = `f72c4e40b008e69684f262593d538aa29ac6245c`・working tree clean・`origin/main..HEAD` 空）。
- 設計根拠: doc109（候補A/B/C 分離・A 先行）＋ doc105 §5〜§9・§17〜§19（標準閲覧式・記録粒度・安全ゲート・否定系テスト・事前停止条件）。
- 既存関数の再利用根拠: `packages/shared/src/rbac.ts` の `isHumanUser`（Phase X-05-2・rbac.test.ts で既存テスト済み）・`canForRoles`／`packages/shared/src/labels.ts` の `canAccessLabel`（いずれも定義変更なし）。
- RBAC/label 実測: `EXECUTIVE` に knowledge:update なし・`READ_ONLY` に CUSTOMER_CONFIDENTIAL label なし・`CUSTOMER_CONFIDENTIAL` 許可ロールに AI_AGENT/AI_ASSISTANT/STAFF を含む（labels.ts）。
- 封印維持: company-brain-reference への CaseStudyConsent/CustomerPain 注入 0・`anonymized: true` 2・**apps/packages の Customer Pain runtime 実装 0**（今回の追加は `packages/shared` の純粋関数のみ・画面/Server Action/DB なし）・schema/labels.ts の CUSTOMER_CONFIDENTIAL 各2（不変）。

## 10. Assumption Log

- `evaluateCustomerPainAccess` の評価順（tenant → 人間性 → label → 権限 → 状態）は**診断用**であり、`canViewCustomerPainDetail` の boolean は AND のため評価順に依存しない。理由コードを実運用でどう扱うか（全 denied 記録か攻撃兆候のみか）は候補C（実接続）の別承認で決める。
- `CustomerPainRecordMeta.archivedAt` は Date / ISO 文字列 / null / undefined を受ける最小入力型とした（Prisma 非依存を保つため）。実接続時に実際の列型へ合わせるのは候補C の範囲。
- 純粋関数の入力に PII・本文を含めない設計は調整対象外（doc105 §12・§14）。

## 11. Unknowns Log

- 候補B（安全ゲート静的検査）の実装可否・時期（別承認）。
- 候補C（Customer Pain schema・画面・Server Action・writeDataAccess/writeAudit 実接続）の時期（schema/migration を伴う別の重い人間承認）。
- 高機密ラベル実装・解禁の可否判断の時期（個別人間承認）。
- 現行 RBAC/label では、CUSTOMER_CONFIDENTIAL の label 許可ロール集合が knowledge:update 保有の人間ロールを包含するため、label 条件が「単独の唯一の拒否理由」になるのは READ_ONLY 等の label 非許可ロールに限られる（設計上の冗長な多重防御であり問題ではない）。

## 12. Risk Register

- **純粋関数が実接続で誤用されるリスク**（記録なしで本文を返す等）: 本関数は「見られるか」までで、writeDataAccess/writeAudit 実接続は候補C の別承認。安全ゲート（候補B）で後退検知を用意する順序を doc109 で固定済み。
- **ラベル単独運用への後退リスク**: 5条件 AND を関数として固定＋否定系テスト7（OR緩和なし）で機械的に担保。
- **AIロール混入リスク**: `isHumanUser` を必須条件に含め、`['STAFF','AI_AGENT']` の混在も拒否することをテストで固定。
- **理由コードへの情報漏えいリスク**: reason を安全な列挙値のみに限定し、テスト8で自由文・本文断片が入らないことを担保。
- **未push commit の揮発リスク**: 次の doc110 push-only（別承認）で解消。

## 13. Definition of Done

- [x] 候補A のみを実装（AIロール除外は既存 `isHumanUser` を再利用・Customer Pain 高機密詳細の閲覧可否を判定する純粋関数を新規追加）。
- [x] 5条件 AND（tenantId × knowledge:update × canAccessLabel × AIロール除外 × archivedAt null）・OR緩和禁止・Prisma import なし・DB非依存・apps/web 非参照。
- [x] 否定系テスト（tenant/権限/label/AIロール/archived/allowed/OR緩和/安全な理由列挙）を追加し全 green。
- [x] `pnpm test`（265）・`pnpm typecheck`（exit 0）・`pnpm lint`（exit 0）green。build は未実施（理由 §8）。
- [x] schema/migration/RBAC/label定義/company-brain-reference/apps runtime 無変更。
- [x] doc110・CURRENT_STATE・PROGRESS・vault ノート＋index の正本反映。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 14. 次回推奨プロンプト案

1. **doc110 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **候補B 実装ミッション**（安全ゲート静的検査の追加。`scripts/` の CI スクリプトのみ・実行時挙動不変・標準閲覧式5条件と封印の後退/出現を検知）。
3. 候補C（Customer Pain schema・画面・Server Action・writeDataAccess/writeAudit 実接続）は、schema/migration と高機密ラベル解禁可否判断のあとの**別の重い人間承認**。
4. CI / Test / Release Governance 等の品質基盤強化ミッション（別承認）。

## 15. 判定

**判定: GO**（doc109 候補A の純粋関数＋否定系テストを `packages/shared` 内のみで最小実装し、全検証 green）。

ただし、これは候補Aのみであり**解禁ではない**。**高機密ラベル解禁なし**・**Customer Pain実装なし**（画面/Server Action/DB なし）・**Data Classification実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**company-brain-reference変更なし**・**AI参照条件変更なし**・**PII保存なし**・**実顧客データ保存なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
