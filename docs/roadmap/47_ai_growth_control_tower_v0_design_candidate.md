# 47. AI Growth Opportunity Control Tower v0 設計 Candidate（docs-only）

> 出典＝GitHub 正本 docs＋Phase 3 GO（doc145/roadmap46）＋既存コード read-only 確認。本書は Phase 3 の最初の縦切り **AI Growth Opportunity Control Tower v0** の**設計のみ**（実装はしない）。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only・docs-only）。実装着手は本設計の承認後の別ミッション。

## 0. 位置づけ

Phase 3 GO（doc145/roadmap46）を受けた最初の「動く薄い縦切り」。既存データから成長機会を1画面に集約し、人間が次の一手を判断する **read-only 中心の Control Tower**。**v0 は既存 schema のみで成立させる**方針で、schema/migration/RBAC/seed への影響が生じる場合は実装前に STOP して別承認とする。

## 1. 目的

- 既存データ（LeadMap リード・商談・Company Brain・Golden Path・Finance Bridge・Usage/Audit）から**成長機会を1画面に集約**する。
- 社長（CEO）が **次の一手を判断**するための Control Tower にする。
- **read-only 中心**で始める（新規の書き込み・送信・自動実行を持たない）。
- Phase 3 の最初の**動く薄い縦切り**（重要テーブル/API/UI/デモデータ/権限/監査を一気通貫）にする。

## 2. 非目標（v0 でやらないこと）

- 外部送信自動化はしない。
- 実LLM は使わない（要約・提案文が要るなら FakeLLM の下書きのみ）。
- 課金しない。本番 deploy しない。本番確認しない。
- runtime 解禁しない。`externalAiAllowed` true にしない。`EXTERNAL_SEND_ENABLED` true にしない。
- **新規 schema / migration を先行追加しない**（v0 は既存テーブルの read-only 集約）。
- AI が自動承認・自動削除・自動送信しない（AI は下書きまで）。
- 高機密の生 PII 列を新たに画面に増やさない（Customer 一覧行レベル・Contact 単体は据え置き方針を維持）。

## 3. 対象データ（既存・read-only 集約）

- **LeadMap リード**: `LocalBusinessLead`（schema:2756）＝新規開拓の未追客・高機会シグナル。leadmap 権限系・tenantId スコープ・帰属/期限（source/expiresAt）を踏襲。
- **商談 / 案件**: `Deal`（schema:622）＝停滞商談・低粗利・次回接触。
- **Company Brain**: CompanyPolicy / ProductCatalogItem＝方針・カタログの改善提案の素地（read-only・NORMAL/INTERNAL のみ）。
- **Golden Path**: 既存 `apps/web/lib/domains/operations/golden-path-dashboard.ts`（canViewFinance を使用）＝「今すぐ見るべき案件」「次の一手」ロジックの再利用。
- **Finance Bridge**: 資金繰り・請求・入金（未回収リスク）。財務値は `canViewFinance` で権限どおり出し分け（redaction 踏襲）。
- **Usage / Audit**: `UsageEvent`（tenantId 先頭 index・非課金）・`AuditLog`/`DataAccessLog`＝活動シグナルと監査。
- **既存顧客・Contact**: `Customer`（494）/`Contact`（527）は**高機密方針に従い慎重に扱う**（詳細は `assertCanViewConfidential`＋`canAccessLabel`＋`writeDataAccess` の既存経路のみ・一覧行レベルと Contact 単体は据え置き・生 PII 列を足さない）。
- **OutreachDraft**: `OutreachDraft`（2931）＝「次回接触推奨」から人間承認フロー（/approvals）への接続点（v0 は既存の下書き→承認導線を参照するのみ・新規送信は作らない）。

## 4. 初期カード案（優先度順・read-only 集約）

各カードは既存データの集計結果で、根拠（件数・対象・理由）と「人間が承認して進める次の一手（既存導線への deep link）」を持つ。

- **未追客リード**: 一定期間フォローのない `LocalBusinessLead` 件数 → LeadMap リード詳細/AI分析へ。
- **停滞商談**: `Deal` の stage 停滞（更新なし）件数 → 案件詳細・Golden Path へ。
- **高機会リード**: leadmap の relevance/スコア上位 → リード詳細へ。
- **Company Brain 改善提案**: 参照の多い/欠けている方針・カタログの補充候補 → /brain へ（FakeLLM 下書きのみ・確定は人間）。
- **低粗利改善候補**: Golden Path の低粗利案件（財務権限者のみ実値・非権限者は redaction）→ 案件詳細 #finance-summary へ。
- **未回収リスク**: Finance Bridge の未回収/延滞（financeゲート）→ #dunning・資金繰りへ。
- **次回接触推奨**: 直近接触からの経過 → OutreachDraft 下書き作成→/approvals（既存導線・新規送信なし）。
- **既存顧客追加提案候補**: 既存 Customer の追加提案余地（高機密方針に従い**件数・匿名指標中心**・生 PII を出さない）。
- **社長が見るべき成長機会**: 上記を横断した CEO 向け上位サマリー（金額系は canViewFinance 準拠）。

## 5. 画面設計

- **候補 URL**: `/growth/control-tower`（既存 `/growth`・`/growth/events` の隣・新規サブルート）。ナビは既存 `apps/web/components/shell/nav.ts` の「Growth・DX OS」グループに1行追加（実装時）。
- **1画面概要**: 上部に成長機会サマリー（件数・優先度）、本体に**優先度順のカード**リスト。
- **根拠表示**: 各カードに対象件数・理由・対象期間・出典（どのデータか）を明示。
- **次の一手**: 各カードから既存導線（LeadMap/案件詳細/planning-hokko/#finance-summary/#dunning/approvals）へ deep link。**Control Tower 自体は新規の書き込み・送信を持たない**（承認・下書きは既存フローに委譲）。
- **staff / CEO の表示差**: 財務系（粗利・原価・未回収の実値）は `canViewFinance` 真の社長のみ。スタッフは redaction メッセージ（原価・粗利は財務閲覧権限が必要です（機密情報）。）を踏襲し、実値は非表示。
- **redaction 方針**: 既存 `events/[id]/page.tsx` の `canViewFinance ? 金額 : redaction` を踏襲。金額・PII を含むカードは権限で出し分け、非権限者には件数/存在のみ or redaction。

## 6. 権限設計

- `tenantId` スコープ必須（全クエリ）。
- 認証: 既存 `requireUser`（未認証はリダイレクト）。
- `hasPermission`（`packages/shared/rbac.ts`）: Control Tower 閲覧に必要な権限を既存ロールから割り当て（例: growth/leadmap/deal の read 権限の組合せ・**新規 action/権限は増やさない**方針を優先）。
- `canViewFinance`: 財務系カードの実値表示可否。
- `canAccessLabel` / `assertCanViewConfidential`（`packages/shared/src/policy.ts`）: 顧客・機密ラベル系の表示可否。
- **Customer 一覧行レベル・Contact 単体は据え置き方針を維持**（doc124-127・Phase 3 GO の論点1）。生 PII 列を増やさない。
- AI ロールは Control Tower 上でも外部送信・承認・削除を持たない（既存 `ROLE_PERMISSIONS` 不変）。

## 7. 監査設計

- 画面表示・集計: 通常操作は `writeAudit`（`apps/web/lib/db.ts`）。
- 機密参照（顧客・財務・高機密ラベルに触れる集計）: `writeDataAccess`（DataAccessLog / confidential_view）。
- AI 下書き生成があれば ai_reference をレコードごとに記録（既存 Company Brain AI 参照方針を踏襲）。
- `UsageEvent` は既存方針（非課金・usage_only・metadata に raw/secret/金額/PII を入れない）に従う。**新規 emit を増やす場合も billing=usage_only・固定 metadata のみ**。
- **raw metadata / secret / 金額 / PII を不用意に出さない**（カードの根拠は件数・匿名指標中心）。

## 8. AI 境界

- `LLM_PROVIDER=fake`（FakeLLM 決定論）。実LLM・AIコストなし。
- AI は**外部送信しない・承認しない・削除しない・重要操作を直接実行しない**。
- AI の生成物（改善提案文・要約）は**下書き**のみ。
- 重要操作（送信・契約・請求・支払・削除・エクスポート・人事）は `ApprovalRequest` 経由（Control Tower は既存承認導線へ渡すだけ）。
- 外部LLM 送信前提の機能は v0 に入れない（externalAiAllowed 既定 false・maskText 前提の経路は作らない）。

## 9. schema / migration / RBAC 影響判定（事前停止条件）

- **v0 設計上、既存 schema のみで成立する見込み**（Control Tower は `LocalBusinessLead`・`Deal`・CompanyPolicy/ProductCatalogItem・Golden Path 集計・Finance Bridge・UsageEvent/AuditLog の read-only 集約）。新規テーブル/カラムは想定しない。
- ただし次のいずれかが必要になった時点で**実装前に STOP して別承認**:
  - 「カードの dismiss / スヌーズ / 既読」など**状態を永続化**する必要（→ 新規 schema/migration）。
  - Control Tower 専用の**新規権限 action / ロール**が必要（→ RBAC 変更）。
  - 新規の**デモデータ**が必要（→ seed 追加）。
- 上記に触れない限り、v0 は**既存 schema・既存 RBAC・既存 seed のまま** read-only で実装する。

## 10. テスト方針

- **既存 e2e 72/0 を壊さない**（回帰ゲート維持が最優先）。
- 追加するなら **read-only smoke 相当**（/growth/control-tower が 200 で主要カード見出しが表示される・CEO/スタッフの表示差＝スタッフに金額実値が出ない）。
- **redaction テスト**: スタッフで Control Tower を開き、財務系カードに原価・粗利の実値が出ず redaction メッセージ/件数のみであることを確認（既存 operations:44・planning_hokko:45 と同型の考え方）。
- **security / HCG / Consent / Suppression への回帰なし**（Control Tower は送信・承認・削除を新設しないため、これらのゲートに変更を加えない）。
- テスト追加時も playwright.config.ts・ci.yml は変更しない方針（既存 e2e 枠で追加可能な形にする）。

## 11. 実装フェーズ案（各段は別承認・stop 条件つき）

- **P3-CT-0**: docs-only 設計（本書）。
- **P3-CT-1**: read-only 画面（/growth/control-tower・カード骨格・既存集計の表示・権限/redaction 踏襲・新規書き込みなし）。
- **P3-CT-2**: 優先度ロジック（既存データからのスコアリング・純粋関数を `packages/shared` に・単体テスト）。
- **P3-CT-3**: 監査ログ（writeAudit / 機密参照 writeDataAccess の配線）。
- **P3-CT-4**: AI 下書き（FakeLLM で改善提案の下書き・確定は人間・ai_reference 記録）。
- **P3-CT-5**: 承認導線（既存 /approvals・OutreachDraft への deep link 接続・新規送信は作らない）。
- **P3-CT-6**: e2e（read-only smoke＋redaction・既存 72/0 を壊さない）。
- **P3-CT-7**: push / CI（stage1・stage3_e2e）/ Gate。
- 各段で schema/RBAC/seed 影響が判明したら **STOP → 別承認**。

## 12. Complete Function Coverage Matrix（50カテゴリ）

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

直接＝**C41-C44**（Phase 3 AI Growth 開始）＋**C03/C06/C08/C46**（品質・権限・監査・Golden Path 基盤）。C45 は禁止/Future 隔離（外部発信・実課金・runtime 解禁）。本書は設計のみで、これらの実装はしない。

## 13. Evidence Map / Assumption Log / Unknowns Log / Risk Register

### 13-1. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| Phase 3 GO 済み | doc145／roadmap46 | GO |
| 回帰ゲート緑 | run 28930122157/28934614261/28937029131/28938318122 の 4 run 連続 72/0・stage1/stage3_e2e success・Upload on failure=skipped | 緑 |
| /growth 既存 | `apps/web/app/(app)/growth/page.tsx`・`growth/events/page.tsx`・nav.ts「Growth・DX OS」 | v0 は隣接サブルートで実装可 |
| 権限/機密/監査の既存経路 | rbac.ts(hasPermission)・policy.ts(canViewFinance/canAccessLabel/assertCanViewConfidential)・lib/db.ts(writeAudit/writeDataAccess) | 既存で踏襲可 |
| 対象データ実在 | schema: Deal(622)・LocalBusinessLead(2756)・OutreachDraft(2931)・Customer(494)・Contact(527) | read-only 集約可 |
| redaction 踏襲元 | events/[id]/page.tsx の canViewFinance 出し分け（e2e operations:44/planning_hokko:45 green） | 権限どおり非露出 |

### 13-2. Assumption Log

- v0 は既存 schema のみで read-only 集約が成立する（新規テーブル不要）と仮定。状態永続化が必要になれば STOP・別承認。
- 既存 Golden Path / Finance Bridge の集計ロジックを再利用でき、財務値は canViewFinance で権限どおり出し分けられると仮定。
- Control Tower は既存の下書き→承認（OutreachDraft→/approvals）へ委譲し、新規送信経路を持たないと仮定。

### 13-3. Unknowns Log

- 各カードの優先度スコアリングの具体式（P3-CT-2 で確定・純粋関数＋単体テスト）。
- 「未追客」「停滞」の閾値（日数）と tenant ごとの妥当値（設計/実装時に確定・seed 影響が出れば別承認）。
- Company Brain 改善提案の下書き粒度（FakeLLM 決定論の範囲）。
- 既存顧客追加提案候補で高機密を出さずに有用な指標をどう作るか（件数/匿名指標中心・PII 非表示）。

### 13-4. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | Control Tower で高機密（顧客 PII・原価粗利実値）が非権限者に露出 | 高 | canViewFinance/canAccessLabel/redaction 踏襲・件数中心・生 PII 列を足さない・e2e redaction 追加で担保 |
| R2 | 状態永続化や新規権限が必要になり schema/RBAC 影響 | 中 | 事前停止条件（§9・§11）で STOP→別承認 |
| R3 | 既存 e2e 72/0 の回帰 | 中 | read-only 中心・追加は smoke 相当・回帰ゲートで検知 |
| R4 | AI 提案が実LLM/外部送信に滑る | 中 | FakeLLM・下書きのみ・外部送信/承認/削除は AI 非保持・重要操作は ApprovalRequest |
| R5 | 「機会の可視化」が自動アクションに拡大解釈 | 中 | v0 は read-only＋既存導線への deep link のみ・自動実行なしを明記 |

## 14. 次回推奨プロンプト案

> 「AI Growth Control Tower v0 実装前 Gate / schema 影響判定 / 最小実装計画ミッション（docs-only・commit-only）: 本設計（roadmap47/doc146）を受け、**実装に入る前**に (1) v0 が既存 schema・既存 RBAC・既存 seed のみで成立するかを read-only で最終判定（`LocalBusinessLead`/`Deal`/CompanyPolicy/ProductCatalogItem/Golden Path/Finance Bridge/UsageEvent/AuditLog の集約で状態永続化が要るか）、(2) 要る場合は STOP して別承認事項として明記、(3) 要らない場合の P3-CT-1（read-only 画面）最小実装計画（対象ファイル・既存関数の再利用・権限/redaction/監査の配線・e2e 追加案）を docs 化する。実装コードは書かない。app/tests/seed/schema/ci.yml/playwright.config.ts/package/lock 変更なし・369-vault 非編集・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし。commit-only（push は別承認）。docs/roadmap/48＋docs/audit/147 に記録。」

## 15. 判定

判定: **AI Growth Opportunity Control Tower v0 設計完了（docs-only・設計のみ・実装未着手）**。CI run 28938318122=success（stage1/stage3_e2e success・72/0・4 run 連続）を受けて設計に着手。**v0 は既存 schema のみで read-only 集約する方針**で、schema/migration/RBAC/seed 影響が生じる場合は**実装前に STOP して別承認**。**外部送信・実LLM・課金・本番 deploy は個別承認制を維持**。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。次は Control Tower v0 実装前 Gate / schema 影響判定 / 最小実装計画（docs-only）、または doc146/roadmap47 push-only（別承認）。
