# 48. AI Growth Control Tower v0 実装前 Gate / schema 影響判定 / 最小実装計画 Candidate（docs-only）

> 出典＝GitHub 正本 docs＋roadmap47/doc146（設計）＋既存コード read-only 実査（rbac.ts・policy.ts・db.ts・golden-path-dashboard.ts・growth/・nav.ts・seed.ts・schema.prisma）。本書は Control Tower v0 の**実装前 Gate / schema 影響判定 / P3-CT-1 最小実装計画**（docs-only）。**実装コードは書かない**。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only・docs-only）。

## 0. 目的

roadmap47/doc146 の設計を受け、実装に入る前に **v0 が既存 schema・既存 RBAC・既存 seed のみで成立するか**を read-only で最終判定する。成立するなら P3-CT-1（read-only 画面）の最小実装計画を固定する。成立せず schema/migration/RBAC/seed が必要と判明したら **STOP して別承認事項**に落とす。

## 1. 実装前 CI 前提（read-only 実測）

- run 28939408568（run_number 146・event push・head_sha 39edd19）= completed / success・stage1 success・stage3_e2e success・Run E2E step success・Upload report on failure=skipped。stage3_e2e は **5 run 連続で完全 green（72/0）**（28930122157/28934614261/28937029131/28938318122/28939408568）。回帰ゲート緑の上で計画する。

## 2. read-only 実査サマリ（証跡）

- **既存 /growth 読み取りページ**（`apps/web/app/(app)/growth/page.tsx`）: `requireUser()`＋`user.tenantId` スコープ＋`Promise.all` の prisma 読み取り（marketingCampaign/contentAsset/dXOpportunity/marketingSuggestion/aIOutput/growthEvent＋`summarizeGrowthEvents`）。**読み取りページは requireUser（認証）のみで成立**、mutation は `growth/actions.ts` の `hasPermission(user,'marketing','create')` で個別ゲート。
- **RBAC**（`packages/shared/src/rbac.ts`）: `RESOURCES` に `deal`・`finance`・`marketing`・`leadmap`・`customer` 等が定義。`READ_ONLY=[...grant(RESOURCES,['read','ai_read'])]`・各ロールに `read`/`ai_read` 付与。**deal/leadmap/finance/marketing の `read` は既存**＝Control Tower の read-only カードは**既存 read 権限で成立**。
- **財務 redaction**（`apps/web/lib/domains/operations/golden-path-dashboard.ts`＋`packages/shared/golden-path-actions.ts`）: `getGoldenPathExecutiveDashboardData(..., canViewFinance)` が `redactExecutiveFinance` で `canViewFinance=false` 時に金額/粗利/回収を null 化。`visibleGoldenPathActions(actions, canViewFinance)` で finance 系アクションを非表示。**redaction は既存純ロジックで再利用可**。
- **監査**（`apps/web/lib/db.ts`）: `writeAudit`・`writeDataAccess(input: DataAccessInput)`（DataAccessLog/confidential_view）が実在。
- **対象データ seed**（`packages/db/prisma/seed.ts`）: `prisma.deal.create`（seed:237・deals＋dealStageHistory・deal 出現19）・`LocalBusinessLead`（3 refs）・`CompanyPolicy`（2 refs）＋既存 e2e（planning_hokko/operations/finance/golden_path が 72/0 green）で案件・財務・Golden Path データが描画済み。**対象データは既存 seed で存在**。
- **nav**（`apps/web/components/shell/nav.ts`）: 「Growth・DX OS」グループに `成長ダッシュボード /growth`・`成長イベント台帳 /growth/events`・`Marketing OS`・`DX OS`。**Control Tower 行は同グループに1行追加で成立**。

## 3. 判定項目（10項目）

1. **既存 schema のみで成立するか**: **YES**。v0 は既存テーブル（LocalBusinessLead・Deal/dealStageHistory・CompanyPolicy/ProductCatalogItem・dXOpportunity/GrowthEvent・invoice/finance・UsageEvent/AuditLog）の **read-only 集約**。新規テーブル/カラム不要。
2. **新規 table / column が必要か**: **NO**（v0 は計算表示のみ・永続化しない）。
3. **状態永続化が必要か**（dismiss/snooze/read/unread/pin/priority override）: **v0 では不要**。これらは **v0 の非目標として除外**（roadmap47 §2）。将来採用する場合は新規 schema/migration → **その時点で STOP・別承認**。
4. **新規 RBAC action / role が必要か**: **NO**。読み取りページは `requireUser` ＋既存 `read`/`ai_read`（deal/leadmap/finance/marketing）。財務は `canViewFinance`、機密は `canAccessLabel`/`assertCanViewConfidential`。新規 action/role 追加なし。
5. **新規 seed が必要か**: **NO**。対象データは既存 seed に存在（deal/LocalBusinessLead/CompanyPolicy 等）。
6. **既存データだけで初期カード9案を表示できるか**: **YES（8案は既存データで直接、1案は方針つき）**。未追客リード/高機会リード（LocalBusinessLead）・停滞商談（Deal＋dealStageHistory）・Company Brain 改善提案（CompanyPolicy/ProductCatalogItem・FakeLLM 下書き）・低粗利改善候補/未回収リスク/社長が見るべき成長機会（Golden Path/Finance・canViewFinance）・次回接触推奨（既存接触履歴＋OutreachDraft 導線）は既存データで可。**既存顧客追加提案候補は「件数・匿名指標中心」**で PII を出さない方針で成立（生 PII を出す設計は不採用）。
7. **顧客 PII / Contact を増やさず成立するか**: **YES**。Customer 一覧行レベル・Contact 単体は据え置き（doc124-127）。Control Tower は件数/匿名指標中心・生 PII 列を足さない。
8. **財務値は canViewFinance / redaction で制御できるか**: **YES**。`getGoldenPathExecutiveDashboardData`/`redactExecutiveFinance`/`visibleGoldenPathActions` を再利用。スタッフは金額 null 化・redaction。
9. **writeAudit / writeDataAccess の配線方針**: 画面表示・集計は `writeAudit`。顧客・財務・高機密ラベルに触れる集計は `writeDataAccess`（confidential_view）。新規テーブルなしで既存関数を呼ぶ。
10. **e2e 72/0 を壊さないテスト方針**: 追加は read-only smoke（/growth/control-tower 200＋主要カード見出し）＋redaction（スタッフに金額実値が出ない）。既存 12 spec・72 件は不変。playwright.config.ts・ci.yml は変更しない。

## 4. Gate 判定

判定: **PASS（STOP に該当しない）**。**v0 は既存 schema・既存 RBAC・既存 seed のみで成立する**（read-only 集約・状態永続化なし）。したがって P3-CT-1（read-only 画面）の最小実装計画に進んでよい。ただし本書は**計画のみ**で、実装着手・push は別承認。**将来 dismiss/snooze/read/pin/priority override 等の状態永続化・新規権限・新規 seed が必要になった時点で STOP・別承認**（§3-3）。

## 5. P3-CT-1（read-only 画面）最小実装計画

### 5-1. 候補 URL
`/growth/control-tower`（既存 `/growth`・`/growth/events` の隣）。

### 5-2. 追加候補ファイル（実装時・本書では作らない）
- `apps/web/app/(app)/growth/control-tower/page.tsx`（RSC・read-only・requireUser・tenantId 集約・カード描画）。
- `packages/shared/src/growth-control-tower.ts`（純ロジック：カード優先度スコアリング・DB非依存・単体テスト対象）。
- `apps/web/lib/domains/growth/control-tower.ts`（DB 読み取り＋純ロジック呼び出し＋finance redaction 適用のデータ整形層）。

### 5-3. 変更候補ファイル（実装時・最小）
- `apps/web/components/shell/nav.ts`（「Growth・DX OS」グループに `Control Tower` 行1つ追加）。※ nav は app 配下だが「禁止領域＝apps/web/app」の app ルーティング/Server Action とは別のナビ定義。**実装は別承認ミッションで行い、本 docs では変更しない**。

### 5-4. 触らないファイル
`packages/db/prisma/schema.prisma`・`migrations`・`seed.ts`・`packages/shared/src/rbac.ts`・`apps/web/playwright.config.ts`・`.github/workflows/ci.yml`・`package.json`・`pnpm-lock.yaml`・`369-vault`。

### 5-5. 再利用する既存関数
- `requireUser`（`@/lib/auth/current-user`）・`hasPermission`。
- `getGoldenPathExecutiveDashboardData`（`apps/web/lib/domains/operations/golden-path-dashboard.ts`）＝Golden Path/財務の redact 済みデータ。
- `redactExecutiveFinance`・`visibleGoldenPathActions`（`@hokko/shared`）。
- `summarizeGrowthEvents`（`@/lib/growth`）・prisma 読み取り（LocalBusinessLead/Deal/CompanyPolicy/dXOpportunity/invoice/UsageEvent）。
- `writeAudit`・`writeDataAccess`（`@/lib/db`）。UI プリミティブ（`@/components/ui`・charts）。

### 5-6. 権限設計
- `requireUser`（認証）＋`user.tenantId` 全クエリスコープ。
- カード単位で既存 `hasPermission(user, 'leadmap'|'deal'|'finance'|'marketing', 'read')` を尊重（権限のないカードは非表示 or 件数のみ）。
- 財務カードは `canViewFinance`。機密（顧客ラベル）は `canAccessLabel`/`assertCanViewConfidential`。**新規 action/role は追加しない**。
- AI ロールは Control Tower でも外部送信/承認/削除を持たない（`ROLE_PERMISSIONS` 不変）。

### 5-7. redaction 設計
- 既存 `events/[id]/page.tsx` の `canViewFinance ? 金額 : redaction` と `redactExecutiveFinance` を踏襲。スタッフは原価/粗利/未回収の**実値を渡さず**（lib 段階で null 化）、redaction メッセージ or 件数のみ。PII を含むカードは件数/匿名指標中心。

### 5-8. 監査設計
- ページ表示・集計: `writeAudit`（action=read/view・entityType=GrowthControlTower）。
- 顧客・財務・高機密ラベルに触れる集計: `writeDataAccess`（confidential_view）。
- 新規 UsageEvent emit は原則追加しない（追加する場合も billing=usage_only・固定 metadata・raw/secret/金額/PII を入れない）。

### 5-9. AI 境界
- `LLM_PROVIDER=fake`（FakeLLM 決定論・実LLM/AIコストなし）。AI は外部送信/承認/削除/重要操作直接実行なし。改善提案文は**下書き**のみ。重要操作は `ApprovalRequest`。externalAiAllowed 既定 false・EXTERNAL_SEND_ENABLED false。

### 5-10. テスト追加案
- `apps/web/tests/e2e/growth_control_tower.spec.ts`（新規・read-only smoke）: CEO で /growth/control-tower が 200・主要カード見出し表示／スタッフで金額実値が出ず redaction・件数のみ。**既存 72/0 を壊さない**追加のみ（既存 spec は不変）。
- 優先度スコアリングの純ロジックは `packages/shared` に単体テスト（DB非依存）。

### 5-11. STOP 条件（実装中に該当したら停止・別承認）
- 状態永続化（dismiss/snooze/read/pin/priority override）が要る → 新規 schema/migration。
- 新規権限 action/role が要る → RBAC 変更。
- 新規デモデータが要る → seed 追加。
- 財務/PII の実値をスタッフに出す必要が生じる（redaction で塞げない）→ 設計見直し・別承認。
- ci.yml/playwright.config.ts/package/lock の変更が要る → 別承認。

### 5-12. 実装時の Claude Code プロンプト案
> 「P3-CT-1 Control Tower v0 read-only 画面 実装ミッション（別承認・実装あり）: `/growth/control-tower` を read-only RSC で実装。`apps/web/app/(app)/growth/control-tower/page.tsx`＋`packages/shared/src/growth-control-tower.ts`（純ロジック＋単体テスト）＋`apps/web/lib/domains/growth/control-tower.ts`（データ整形＋finance redact）＋nav.ts に1行。requireUser・tenantId スコープ・既存 read 権限・canViewFinance/redactExecutiveFinance・writeAudit/writeDataAccess を再利用。**schema/migration/RBAC/seed 変更なし**（要ると判明したら STOP・別承認）。e2e は growth_control_tower.spec.ts を新規追加（read-only smoke＋redaction・既存 72/0 を壊さない）。`pnpm --filter @hokko/web typecheck`・`pnpm lint`・`node scripts/check-company-brain-safety.mjs`・（可能なら）ローカル e2e を通し、commit-only（push は別承認）。runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集。」

## 6. Complete Function Coverage Matrix（50カテゴリ）

| # | 区分 | # | 区分 | # | 区分 | # | 区分 | # | 区分 |
|---|---|---|---|---|---|---|---|---|---|
| **C41** | 直接(Phase3開始) | **C42** | 直接(Phase3開始) | **C43** | 直接(Phase3開始) | **C44** | 直接(Phase3開始) | **C03** | 直接 |
| **C06** | 直接 | **C08** | 直接 | **C46** | 直接 | C01 | 間接 | C04 | 間接 |
| C05 | 間接 | C07 | 間接 | C09 | 間接 | C10 | 間接 | C11 | 間接 |
| C12 | 間接 | C15 | 間接 | C18 | 間接 | C20 | 間接 | C26 | 間接 |
| C28 | 間接 | C30 | 間接 | C33 | 間接 | C34 | 間接 | C37 | 間接 |
| C38 | 間接 | C39 | 間接 | C40 | 間接 | C48 | 間接 | C02 | 後続 |
| C13 | 後続 | C14 | 後続 | C16 | 後続 | C17 | 後続 | C19 | 後続 |
| C21 | 後続 | C22 | 後続 | C23 | 後続 | C24 | 後続 | C25 | 後続 |
| C27 | 後続 | C29 | 後続 | C31 | 後続 | C32 | 後続 | C35 | 後続 |
| C36 | 後続 | C47 | 後続 | C49 | 後続 | C50 | 後続 | C45 | 禁止/Future隔離 |

## 7. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 実装前 CI 緑 | run 28939408568 conclusion success・stage1/stage3_e2e success・Upload on failure=skipped（5 run 連続 72/0） | 緑 |
| read-only ページは requireUser で成立 | growth/page.tsx（requireUser＋tenantId prisma 読み取り・mutation のみ hasPermission） | 新規権限不要 |
| 既存 read 権限あり | rbac.ts RESOURCES(deal/finance/marketing/leadmap)＋READ_ONLY=grant(RESOURCES,['read','ai_read']) | RBAC 変更不要 |
| finance redaction 再利用可 | golden-path-dashboard.ts getGoldenPathExecutiveDashboardData＋redactExecutiveFinance/visibleGoldenPathActions | 新規 redact コード不要 |
| 監査関数実在 | lib/db.ts writeAudit・writeDataAccess(DataAccessInput) | 既存で配線可 |
| 対象データ seed 済み | seed.ts prisma.deal.create(237)・LocalBusinessLead(3)・CompanyPolicy(2)・deal 出現19＋e2e 72/0 | seed 追加不要 |
| nav 追加位置あり | nav.ts「Growth・DX OS」グループ | 1行追加で成立 |
| v0 は既存 schema のみ | 全カードが read-only 集約・状態永続化は v0 非目標 | schema/migration 不要 |

## 8. Assumption Log

- v0 は「見るだけ」（read-only 集約）で、dismiss/snooze/read/pin/priority override 等の状態を持たないため新規 schema が不要、と仮定。将来採用時は STOP・別承認。
- 既存 `getGoldenPathExecutiveDashboardData` の redact 済みデータと prisma 読み取りだけで 9 カードの根拠（件数・金額 redact 済み）を構成できると仮定。
- 既存 read 権限（deal/leadmap/finance/marketing の read/ai_read）で Control Tower のカード表示ゲートが足りると仮定（新規 action 不要）。

## 9. Unknowns Log

- 優先度スコアリングの具体式・「未追客/停滞」の閾値（P3-CT-1/CT-2 実装時に純ロジックで確定・seed 影響が出れば STOP）。
- 「既存顧客追加提案候補」を PII を出さずに有用化する具体指標（件数/匿名指標の粒度）。
- Company Brain 改善提案の FakeLLM 下書きの表現粒度。
- 実 e2e 追加時の flaky 回避（race-safe waitForURL 等）は実装時に確定。

## 10. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | v0 実装で状態永続化を安易に足し schema 影響 | 中 | STOP 条件（§5-11）で停止・別承認 |
| R2 | 高機密（PII・原価粗利実値）露出 | 高 | canViewFinance/redactExecutiveFinance/canAccessLabel 再利用・件数中心・e2e redaction で担保 |
| R3 | 既存 e2e 72/0 の回帰 | 中 | read-only 追加・既存 spec 不変・回帰ゲートで検知 |
| R4 | nav.ts 変更が app ルーティング/Server Action の禁止領域と混同 | 低 | nav はナビ定義・実装は別承認ミッション・本 docs では未変更 |
| R5 | AI 提案が実LLM/外部送信に滑る | 中 | FakeLLM・下書きのみ・AI は送信/承認/削除なし |

## 11. Definition of Done

- 実装前 Gate（10 判定項目）・schema/RBAC/seed 影響判定（いずれも不要＝PASS）・P3-CT-1 最小実装計画（URL・追加/変更/触らないファイル・再利用関数・権限/redaction/監査/AI 境界・テスト追加案・STOP 条件・実装プロンプト案）を roadmap48＋doc147 に記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／許可5ファイルのみ・369-vault非編集／git diff --check OK・secret NONE・safety exit 0／**app/tests/seed/schema/migration/RBAC/ci.yml/playwright.config.ts/package/lock 変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし**／artifact 非 git add／commit-only（push なし）／**実装コードは書かない・実装未着手／schema/RBAC/seed が必要になれば実装前に別承認を明記**。

## 12. 次回推奨プロンプト案

> 「（先に）doc147/roadmap48 push-only（別承認）→ CI read-only 確認。（その後）P3-CT-1 Control Tower v0 read-only 画面 実装ミッション（別承認・実装あり・§5-12 のプロンプト）: schema/migration/RBAC/seed 変更なしで /growth/control-tower を read-only 実装、e2e read-only smoke＋redaction を追加、既存 72/0 を壊さない。要 schema/RBAC/seed と判明したら STOP・別承認。」

## 13. 判定

判定: **実装前 Gate PASS（STOP 非該当）／v0 は既存 schema・既存 RBAC・既存 seed のみで成立／P3-CT-1 最小実装計画を確定（実装は別承認）／Control Tower v0 は実装未着手**。実装前 CI run 28939408568=success（stage1/stage3_e2e success・5 run 連続 72/0）。**将来 状態永続化・新規権限・新規 seed が必要になれば実装前に STOP・別承認**。**外部送信・実LLM・課金・本番 deploy は個別承認制を維持**。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。次は doc147/roadmap48 push-only（別承認）→ P3-CT-1 read-only 画面 実装（別承認）。
