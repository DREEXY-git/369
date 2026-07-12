# Roadmap 52 — P3-CT-3 Control Tower 監査ログ配線設計（Candidate・docs-only・実装なし）

- 日付: 2026-07-08
- 種別: docs-only（設計のみ・コード差分ゼロ・実装なし・push なし・commit-only）
- 対象: AI Growth Opportunity Control Tower v0（`/growth/control-tower`）の監査ログ配線（writeAudit / writeDataAccess / UsageEvent の境界）
- 記録: 本書（Candidate）＋ `docs/audit/151_p3_ct3_control_tower_audit_logging_design.md`（非エンジニア向け監査）
- 前提: Phase 3 GO 済み（doc145/roadmap46）・Control Tower v0 設計（roadmap47）・実装前 Gate PASS(roadmap48)・P3-CT-1 実装（roadmap49/50）・P3-CT-2 優先度ロジック精緻化（roadmap51）まで完了。

## 1. 目的

Control Tower の「誰が・いつ・何の目的で・機密（finance 件数）に触れたか」を、既存の監査基盤（`writeAudit` / `writeDataAccess` / `UsageEvent`）の**どれで・どの粒度で**記録するかを、実装前に docs-only で確定する。実装（P3-CT-3 実装段・別承認）が迷いなく最小差分で書けるよう、採用・不採用と metadata 境界を先に固定する。

## 2. 非目標

- 実装しない（コード差分ゼロ）。writeAudit/writeDataAccess/UsageEvent の呼び出し追加・変更は本書では行わない。
- 状態永続化（dismiss/snooze/read/unread/pin/priority override）を設計しない（必要になれば STOP・別承認）。
- 外部送信・実LLM・AIコスト・課金・本番 deploy・runtime 解禁・externalAiAllowed true・EXTERNAL_SEND_ENABLED true はしない。
- schema/migration/RBAC/seed/ci.yml/playwright.config.ts/package.json/lockfile を変更しない。
- 369-vault を編集しない。

## 3. 現在地（read-only 実査による確定）

`apps/web/lib/domains/growth/control-tower.ts` の `getControlTowerData(tenantId, canViewFinance, actorId)` は現在:

- **canViewFinance=true のときのみ** `writeDataAccess({ tenantId, actorId, entityType: 'GrowthControlTower', action: 'confidential_view', label: 'INTERNAL', purpose: 'growth_control_tower_view' })` を**1閲覧=最小1件**記録する（金額・PII・カード別件数は metadata に入れない。metadata 自体を渡していない）。
- **canViewFinance=false（redacted 閲覧）のときは何も記録しない**。
- `writeAudit` は Control Tower のどこからも呼ばれていない（page.tsx にも lib にもなし）。
- `UsageEvent`（`recordUsageEvent`）も Control Tower からは emit していない。
- 画面（`page.tsx`）は RSC・read-only・mutation/Server Action/form/外部送信導線なし（P3-CT-1 のまま）。

## 4. 前提 CI（回帰ゲート）

- P3-CT-1 push 後 CI **run 28944487139**（run_number 148・head_sha `664546c`）= completed / success・stage1 success・stage3_e2e success・**Run E2E 74 passed / 0 failed**・Upload report on failure=skipped・env `LLM_PROVIDER=fake`/`MAIL_PROVIDER=log`/`EXTERNAL_SEND_ENABLED=false`。
- P3-CT-2 push 後 CI **run 28946738844**（head_sha `83bd185`）= completed / success・stage1 success・stage3_e2e success・**Run E2E 74 passed / 0 failed**（growth_control_tower の社長閲覧・担当者 redaction 2件 green）。
- これで stage3_e2e は 8 run 連続 green。本設計はこの緑の上に立つ（設計自体はコード挙動を変えないため回帰リスクなし）。

## 5. 既存監査関数の実査結果（十分性確認）

| 関数/モデル | 場所 | 実査結果 |
|---|---|---|
| `writeAudit(AuditInput)` | `apps/web/lib/db.ts` | AuditLog へ1件 create。フィールド: actorId/actorType/action/entityType/entityId/summary/metadata/ip。**リポジトリ全体で action は create/update/finance_bridge/invoice_send/ai_run 等の mutation・重要操作のみ**。閲覧（view）に使う前例はゼロ。 |
| `writeDataAccess(DataAccessInput)` | `apps/web/lib/db.ts` | DataAccessLog へ1件 create。`DataAccessAction` union に **`read` / `confidential_view`** が既に存在（他: ai_reference/location_view/recording_view/export/external_share）。label/purpose/policyDecision/metadata あり。 |
| `writeConfidentialViewLog` 他 | `apps/web/lib/audit.ts` | `writeDataAccess({action:'confidential_view'})` の薄いラッパ。CT の既存呼び出しは `writeDataAccess` 直呼びで実質同等。 |
| 閲覧ログの前例 | `dx/opportunities/[id]/page.tsx` ほか | 詳細閲覧で `action:'read'`・`label:'INTERNAL'`・purpose 日本語文字列を毎閲覧1件記録する前例あり。 |
| `recordUsageEvent` | `apps/web/lib/usage-events.ts` | UsageEvent へ1件（idempotencyKey unique・失敗しても例外を投げない・billing 許可値以外は usage_only へ丸め）。**既存 emit 8種はすべて資源消費イベント**（ai.output.generated / export.generated / external_send.* / webhook.delivered 等）。画面閲覧の emit 前例はゼロ。metadata は非PII・非金額・非本文のみ（doc15 規約）。 |
| schema | `packages/db/prisma/schema.prisma` | AuditLog/DataAccessLog/UsageEvent とも既存。DataAccessLog.action のコメントに read/confidential_view とも列挙済み。admin 閲覧画面（`admin/data-access-logs`）も confidential_view を「機密閲覧」として表示済み。 |

**結論: 既存関数・既存テーブル・既存 enum（union 型）だけで本設計は完全に成立する。新規追加は不要。**

## 6. 設計方針（採用・不採用の確定）

### 6.1 writeAudit — **不採用（Control Tower の閲覧には配線しない）**

- リポジトリ規約上、`writeAudit`（AuditLog）は「重要操作＝mutation・承認・送信・エクスポート・ai_run」の台帳であり、閲覧の共通シンクは DataAccessLog（`writeDataAccess`）である。実査でも view 系 writeAudit の前例はゼロ。
- Control Tower v0 は read-only（mutation なし）のため、**writeAudit を足す対象操作が存在しない**。閲覧に AuditLog を使うと台帳の意味（重要操作履歴）が薄まり、既存の監査閲覧 UI の前提も崩れる。
- **将来**: P3-CT-4（FakeLLM 下書き生成）等で CT 起点の mutation（AIOutput/OutreachDraft 作成など）が入る段になったら、その Server Action / lib で既存規約どおり `writeAudit`（action=`ai_run`/`create` 等）を配線する。**それは P3-CT-4 の設計・実装（別承認）で扱い、本段では配線しない。**

### 6.2 writeDataAccess — **採用（既存1件を維持しつつ、redacted 閲覧の記録を追加する拡張案）**

実装候補（P3-CT-3 実装段・別承認で適用）:

- **canViewFinance=true（finance 件数に触れた閲覧）**: 既存どおり `action:'confidential_view'`・`entityType:'GrowthControlTower'`・`label:'INTERNAL'`・`purpose:'growth_control_tower_view'` を**1閲覧=1件**（据え置き）。拡張: `policyDecision:'allow'` を明示し、metadata を §8 の allowlist に限って付与。
- **canViewFinance=false（redacted 閲覧）**: 現在は無記録 → **`action:'read'`・`entityType:'GrowthControlTower'`・`label:'INTERNAL'`・`purpose:'growth_control_tower_view'`・`policyDecision:'allow'` を1閲覧=1件追加**。redacted 側も「誰がいつ管制塔を見たか」を残すことで、後日の統制説明（担当者には finance 実値が出ていないことの証跡）が DataAccessLog だけで完結する。`action` を confidential_view と分けるのは「機密に触れていない閲覧」を機密閲覧として過大記録しないため（admin 画面の「機密閲覧」件数を汚さない）。
- 粒度は **1閲覧=1件**（カードごと9件にしない）。理由: カード別件数は metadata に入れない方針（§8）のため per-card 記録に情報増がなく、force-dynamic な RSC でログが9倍に膨らむだけ。
- `entityId` は null 据え置き（CT は単一画面・対象レコードなし）。
- エラー処理は既存パターン踏襲（`await` 直呼び・握りつぶさない）。監査欠落より閲覧失敗を選ぶ既存方針（dx/opportunities 等と同じ）を変えない。

### 6.3 UsageEvent — **不採用（Control Tower からは emit しない）**

- UsageEvent は「非課金の利用量台帳」で、既存 emit 8種はすべて**資源消費**（AI出力・エクスポート・外部送信・webhook 配送）。画面閲覧は資源消費でなく、emit すると台帳ノイズ＋既存 category（ai/export/external_send/webhook…）に合わない新分類の設計が必要になる。
- 閲覧の記録は §6.2 の DataAccessLog で足りる（二重台帳にしない）。
- **将来**: CT 起点で AI 下書き生成（P3-CT-4）が入っても、生成が既存 `saveAIOutputStandard` 経由なら `ai.output.generated` が**既存配線で自動計測**されるため、CT 側に新規 UsageEvent 配線は不要。CT 閲覧回数そのものを利用量として測りたくなった場合のみ、`growth.control_tower.viewed`（billing=usage_only・idempotencyKey 設計含む）を**別承認の設計ミッション**として起こす。本段では起こさない。

## 7. finance・redaction・PII の扱い（不変の確認）

- **redaction 不変**: 本設計は監査ログの配線のみで、表示・集計は一切変えない。担当者（canViewFinance=false）に原価・粗利・未回収・請求金額の実値を見せない方針はそのまま（lib 段階で count=null・`原価・粗利は財務閲覧権限が必要です（機密情報）。` 表示）。redacted 閲覧に `action:'read'` ログを足しても、ログに finance 値は入らない（§8）。
- **PII 非増加**: Customer/Contact の生 PII 列は追加しない。DataAccessLog の metadata にも顧客名・メール・電話・住所・placeId 等を入れない。既存顧客カードは件数のみのまま。
- **label 判断**: `INTERNAL` 据え置き。confidential_view の対象は「finance 系の件数（金額実値ではない）」であり、CONFIDENTIAL へ格上げするとデータ分類を過大申告する。金額実値を扱う段が来たら（来ない設計だが）その時に別承認で再判定。

## 8. metadata 境界（allowlist / denylist）

実装段で metadata を付ける場合は以下に限定する（付けない選択も可。**allowlist 外は一切不可**）:

- **allowlist（非PII・非金額の集計補助のみ）**: `financeVisible`（boolean）／`cardCount`（カード枚数=9・number）／`actionableCount`（要対応カード数 0〜9・number）。
- **denylist（絶対に入れない）**: 金額・原価・粗利・未回収額・請求額などの実値／**カード別件数（特に finance 系の件数）**／顧客名・メール・電話・住所・担当者名などの生PII／placeId・Google由来データ／secret・env 値・トークン／AI プロンプト・生成文・本文／score・scoreBreakdown の生配列（件数を逆算できるため）／URL クエリ・IP 以外の端末情報。
- 既存 `usage-events.ts`・doc15 の metadata 規約（PII/secret/本文/金額 不可）と同じ思想を DataAccessLog 側にも適用する。

## 9. schema / RBAC / seed 影響判定（Gate）

| 判定項目 | 結果 |
|---|---|
| 新規テーブル・カラム・enum（migration） | **不要**（AuditLog/DataAccessLog/UsageEvent 既存・action 'read'/'confidential_view' とも既存 union/コメントに存在） |
| DataAccessAction への新値追加 | **不要**（read/confidential_view の既存値のみ使用） |
| RBAC（新 action/role/権限変更） | **不要**（閲覧権限判定は既存 requireUser＋hasPermission(finance,read) のまま。AI_AGENT/AI_ASSISTANT 不変） |
| seed | **不要**（監査ログはデモデータ不要） |
| 状態永続化 | **不採用**（必要になれば STOP・別承認） |
| admin 閲覧画面 | **変更不要**（data-access-logs は action ラベル既対応） |

**Gate 判定 = PASS（STOP 非該当）。既存 schema・既存関数・既存 RBAC・既存 seed のみで成立。**

## 10. STOP 条件（実装段で該当したら停止・別承認）

- DataAccessAction に新しい値（例: `dashboard_view` 等）を足したくなった場合（schema コメント・admin 画面・union 型に波及）。
- 新規テーブル・カラム・migration が必要になった場合。
- カード別・レコード別の詳細ログで PII や finance 実値を metadata に入れる必要が生じた場合。
- 状態永続化（dismiss/snooze/pin 等）や通知・外部送信をログ起点で自動化したくなった場合。
- writeAudit を閲覧に流用する必要が生じた場合（規約変更＝人間判断）。

## 11. 実装候補（P3-CT-3 実装段・別承認）と触らないファイル

- **変更するのは1ファイルのみ**: `apps/web/lib/domains/growth/control-tower.ts`（writeDataAccess 呼び出し部の拡張: confidential_view に policyDecision/metadata 付与＋redacted 閲覧の `action:'read'` 1件追加）。
- **触らない**: `apps/web/app/(app)/growth/control-tower/page.tsx`（表示不変）／`packages/shared/src/growth-control-tower.ts`＋`packages/shared/src/__tests__/growth-control-tower.test.ts`（純ロジック不変）／`apps/web/tests/e2e/growth_control_tower.spec.ts`（見出し・redaction 不変のため 74/0 維持）／`apps/web/lib/db.ts`・`apps/web/lib/audit.ts`・`apps/web/lib/usage-events.ts`（既存関数を変えない）／schema.prisma・migrations・seed.ts・rbac.ts・labels.ts・ci.yml・playwright.config.ts・package.json/lockfile・369-vault。

## 12. テスト方針（実装段）

- DataAccessLog への書き込みは DB 依存のため**単体テストは追加しない**（既存 278 passed 体制を変えない。純ロジック不変で回帰なし）。
- e2e は表示不変のため既存 74/0 を push 後 CI で確認（growth_control_tower 2件の green 維持）。
- 検証は型（web/shared typecheck）・lint・safety script・既存単体 278 の全緑＋push 後 CI 74/0 で担保。統合テスト（packages/db itest）は apps/web lib が対象外のため追加しない。

## 13. Matrix（50カテゴリ抜粋・本段関連）

| カテゴリ | 状態 |
|---|---|
| C41-44 Phase 3 / Control Tower | P3-CT-1/2 完了（CI 74/0）・P3-CT-3 は**設計のみ完了（本書）**・実装は別承認 |
| 監査（AuditLog/DataAccessLog） | 既存基盤で十分・CT は DataAccessLog 一本化（writeAudit は mutation 段まで温存） |
| UsageEvent / Monetization | CT からの emit 不採用・既存 8 emit 不変・課金なし |
| 機密・redaction | 不変（担当者に finance 実値なし）・ログにも金額/件数を入れない |
| PII | 非増加（metadata denylist で構造的に防止） |

## 14. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 現状 CT は confidential_view のみ・finance 閲覧時のみ | `apps/web/lib/domains/growth/control-tower.ts` 87-96行 read-only 実査 | 確定 |
| writeAudit は mutation 専用の運用 | apps/web 全 grep（action 値: create/update/invoice_send/ai_run 等のみ・view なし） | 前例ゼロ |
| DataAccessAction に read/confidential_view 既存 | `apps/web/lib/db.ts` 33-40行・schema.prisma DataAccessLog.action コメント | 新 enum 不要 |
| 閲覧に action:'read' を使う前例 | `dx/opportunities/[id]/page.tsx` ほか | 整合 |
| UsageEvent は資源消費 emit のみ | `usage-events.ts`＋既存 8 emit（ai.output/export/external_send/webhook） | 閲覧 emit 前例ゼロ |
| 回帰ゲート緑 | run 28944487139・28946738844 = success・74/0 | 8 run 連続 green |

## 15. Assumption Log

- CT v0 は read-only を維持する（mutation が入る P3-CT-4 以降は別設計・別承認）。
- 1閲覧=1件の粒度で統制説明に足りる（カード別ログは情報増なし）。
- redacted 閲覧の `action:'read'` 追加は force-dynamic ページの負荷として無視できる（1 insert/閲覧）。

## 16. Unknowns Log

- 実運用でのログ量（閲覧頻度）と保持期間ポリシー — 将来の運用判断。
- CT 閲覧回数を利用量として可視化したい要望が出るか — 出た時点で UsageEvent 設計を別承認で起こす。
- P3-CT-4（FakeLLM 下書き）での writeAudit action 値の確定 — P3-CT-4 設計で扱う。

## 17. Risk Register

| # | リスク | 重大度 | 対応 |
|---|---|---|---|
| R1 | metadata 経由の機密・PII 漏えい | 高 | §8 denylist を設計段で固定（カード別件数も禁止）・実装段レビューで allowlist 外を拒否 |
| R2 | 監査の過大記録（閲覧を confidential_view で埋める） | 中 | redacted 閲覧は action:'read' に分離・admin「機密閲覧」件数を汚さない |
| R3 | 監査の過少記録（redacted 閲覧が無記録のまま） | 中 | §6.2 で read 記録を追加する設計を確定 |
| R4 | 実装時の e2e 回帰 | 低 | 表示不変・lib 1ファイルのみ・push 後 CI 74/0 で確認 |
| R5 | 新 enum/テーブルが欲しくなる | 低 | §10 STOP 条件で停止・別承認 |

## 18. Definition of Done（本設計ミッション）

- 本書＋doc151 作成／CURRENT_STATE・PROGRESS・Obsidian Dashboard 更新（計5ファイル・docs/tasks のみ）／コード差分ゼロ／Gate（diff-check・secret scan・safety script・禁止領域差分なし・artifact なし・369-vault 差分なし）緑／commit-only（push は別承認）。

## 19. 次回推奨プロンプト案

> 「doc151/roadmap52 push-only（別承認）: 本 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI を read-only 確認し 74/0 を確認。緑なら P3-CT-3 実装ミッション（別承認・変更は `apps/web/lib/domains/growth/control-tower.ts` 1ファイルのみ: confidential_view へ policyDecision/metadata(allowlist) 付与＋redacted 閲覧の action:'read' 1件追加。metadata は financeVisible/cardCount/actionableCount のみ・金額/カード別件数/PII 禁止。schema/RBAC/seed/純ロジック/page/e2e 不変）へ。」

## 20. 判定

判定: **P3-CT-3 監査ログ配線設計 完了（docs-only・実装なし）／Gate PASS（既存 writeAudit・writeDataAccess・UsageEvent 基盤と既存 schema のみで成立・STOP 非該当）／方針確定＝writeAudit 不採用（mutation 段まで温存）・writeDataAccess 採用（confidential_view 据え置き＋redacted 閲覧に action:'read' 追加・1閲覧=1件・metadata は allowlist 3項目のみ）・UsageEvent 不採用（CT から emit しない）**。**schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・状態永続化なし・369-vault非編集・push なし（commit-only）**。前提 CI は run 28944487139 / 28946738844（74/0・8 run 連続 green）。次は doc151/roadmap52 push-only（別承認）→ CI 74/0 確認 → P3-CT-3 実装（別承認）。
