# Roadmap 53 — P3-CT-3 Control Tower 監査ログ配線 実装（Candidate・実装あり・commit-only）

- 日付: 2026-07-08
- 種別: 実装あり（コード変更は `apps/web/lib/domains/growth/control-tower.ts` の1ファイルのみ）・commit-only（push は別承認）
- 対象: AI Growth Opportunity Control Tower v0（`/growth/control-tower`）の監査ログ配線
- 記録: 本書（Candidate）＋ `docs/audit/152_p3_ct3_control_tower_audit_logging_implementation.md`（非エンジニア向け）
- 設計根拠: `docs/roadmap/52`（設計 §6.2 / §8）＋ `docs/audit/151`
- 前提 CI: P3-CT-3 docs push 後 CI **run 28949692213 = success・stage1/stage3_e2e success・Run E2E 74 passed / 0 failed**（env LLM_PROVIDER=fake / MAIL_PROVIDER=log / EXTERNAL_SEND_ENABLED=false・growth_control_tower 2件 green をログ本文で直接確認）。

## 1. 目的

roadmap52 で設計確定した Control Tower の監査ログ配線を、最小差分で実装する。Control Tower 閲覧時の DataAccessLog を「finance 機密に触れた閲覧（confidential_view）」と「redacted 閲覧（read）」の両方について 1閲覧=1件で正確に記録できるようにする。画面表示・純ロジック・redaction 方針は一切変えない。

## 2. 非目標

- 画面表示の変更（page.tsx 不変）・純ロジックの変更（growth-control-tower.ts 不変）・e2e spec の変更なし。
- 状態永続化（dismiss/snooze/read/unread/pin/priority override）なし。
- 外部送信・実LLM・AIコスト・課金・本番 deploy・runtime 解禁・externalAiAllowed true・EXTERNAL_SEND_ENABLED true なし。
- schema/migration/RBAC/seed/ci.yml/playwright.config.ts/package.json/lockfile 変更なし。
- 369-vault 編集なし。

## 3. 変更内容（要点）

`apps/web/lib/domains/growth/control-tower.ts` の `getControlTowerData` 末尾のみを変更:

- `cards` 生成後に `actionableCount = countActionableCards(cards)` を **1回だけ**算出（従来は return 時に算出）。
- DataAccessLog 用 metadata を allowlist 3項目のみに固定: `{ financeVisible: boolean, cardCount: number, actionableCount: number }`。
- **canViewFinance=true**: 既存どおり `action:'confidential_view'`・`entityType:'GrowthControlTower'`・`entityId:null`・`label:'INTERNAL'`・`purpose:'growth_control_tower_view'`＋今回追加 `policyDecision:'allow'`・`metadata`（allowlist 3項目）。
- **canViewFinance=false**: 新規に `action:'read'`・`entityType:'GrowthControlTower'`・`entityId:null`・`label:'INTERNAL'`・`purpose:'growth_control_tower_view'`・`policyDecision:'allow'`・`metadata`（allowlist 3項目）を **1閲覧=1件**記録（従来は無記録）。
- 返却値は既存どおり `{ cards, canViewFinance, actionableCount }`。
- error handling は既存方針どおり `await` 直呼び（独自 try/catch・握りつぶしを追加しない）。

## 4. 設計原則の遵守（roadmap52 との対応）

- **writeAudit 不採用**: AuditLog は mutation・重要操作専用。本画面は read-only のため配線しない（コメントに明記）。
- **UsageEvent / recordUsageEvent 不採用**: 画面閲覧は資源消費ではない。既存 8 emit 不変。
- **既存 action のみ**: `confidential_view` / `read` はいずれも既存 `DataAccessAction` union（`apps/web/lib/db.ts`）・schema.prisma の DataAccessLog.action コメントにも既出。新 action 値の追加なし。
- **metadata allowlist**: financeVisible / cardCount / actionableCount の3項目のみ。denylist（金額・原価・粗利・未回収額・請求額・カード別件数・finance系件数・顧客名/メール/電話/住所・担当者名・placeId・Google由来・secret・env値・token・AIプロンプト・生成文・本文・score・scoreBreakdown・URLクエリ・IP以外の端末詳細）はコメントで明記し、コード上も入れていない。
- **1閲覧=1件**: カード別9件・レコード別にしない。

## 5. redaction / finance / PII の扱い（不変の確認）

- **redaction 不変**: 表示・集計は一切変えていない。担当者（canViewFinance=false）は lib 段階で finance 件数を集計せず（null）、UI は `原価・粗利は財務閲覧権限が必要です（機密情報）。` を表示。今回追加の `read` ログにも finance 値は入らない（metadata は allowlist 3項目のみ）。
- **PII 非増加**: Customer/Contact の生 PII 列は追加せず、metadata にも顧客名・メール・電話・住所・placeId を入れない。既存顧客カードは件数のみ。
- **label**: `INTERNAL` 据え置き（confidential_view の対象は finance 系の件数であり金額実値ではない）。

## 6. STOP 判定（非該当を確認）

新規 schema/table/column/enum/migration・新 DataAccessAction 値・新 RBAC action/role・新 seed・writeAudit の閲覧流用・UsageEvent 新 emit・package/lockfile・ci.yml・playwright.config.ts・redaction で塞げない機密表示・状態永続化・Customer/Contact 生 PII 列・metadata への PII/finance 実値/カード別件数 — **いずれも不要**。既存 `writeDataAccess`・既存 action・既存 schema のみで成立。**STOP 非該当**。

## 7. 検証結果（成功／失敗／未実施）

- 成功: `pnpm test` = **278 passed / 0 failed**（回帰なし・純ロジック不変）／`pnpm --filter @hokko/web typecheck` exit 0／`pnpm --filter @hokko/shared typecheck` exit 0／`pnpm lint` exit 0／`node scripts/check-company-brain-safety.mjs` exit 0（actions 4・ui 157）／`git diff --check` OK／secret NONE／禁止領域差分なし（コード変更は control-tower.ts 1ファイルのみ）／artifact なし／369-vault 差分なし。
- 失敗: なし。
- 未実施: e2e（growth_control_tower＋全 spec）＝本サンドボックスで実走不能。DataAccessLog 書き込みは表示に出ないため既存 e2e（74件）は緑維持見込み。push 後の CI（stage3_e2e）で 74 passed / 0 failed を確認。DataAccessLog の実書き込み確認は DB 依存のため単体テストを追加していない（既存 278 体制を変えない）。

## 8. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| コード変更は1ファイルのみ | `git status --short` = ` M apps/web/lib/domains/growth/control-tower.ts` のみ | 限定 |
| 既存 action のみ使用 | `apps/web/lib/db.ts` の DataAccessAction に read/confidential_view 既存 | 新 enum なし |
| redaction 不変 | 表示・集計コード（finance null 化）不変・追加は監査ログのみ | 担当者に実値なし |
| metadata allowlist | auditMetadata = {financeVisible, cardCount, actionableCount} のみ | 金額/件数/PII なし |
| 単体緑 | pnpm test 278 passed / 0 failed | 回帰なし |
| 型/lint/safety緑 | web/shared typecheck exit 0・lint exit 0・safety exit 0 | 緑 |
| 前提 CI | run 28949692213 = success・74/0（ログ本文確認） | 9 run 連続 green |

## 9. Assumption Log

- 1閲覧=1件で統制説明に足りる（カード別ログは情報増なし）。
- metadata 3項目（financeVisible/cardCount/actionableCount）で運用に足りる。
- confidential_view / read の既存 action で足りる（新 action 不要）。
- redacted 閲覧の read 追加は force-dynamic ページの負荷として無視できる（1 insert/閲覧）。

## 10. Unknowns Log

- 実運用でのログ量・保持期間ポリシー（将来の運用判断）。
- CT 閲覧回数を利用量として可視化したい要望（出たら UsageEvent 設計を別承認）。
- P3-CT-4（FakeLLM 下書き）での writeAudit action 値の確定（P3-CT-4 設計で扱う）。

## 11. Risk Register

| # | リスク | 重大度 | 対応 |
|---|---|---|---|
| R1 | metadata 経由の機密・PII 漏えい | 高 | allowlist 3項目のみ・denylist をコメント明記・finance 値/カード別件数を入れない |
| R2 | 監査過多（閲覧を confidential_view で埋める） | 中 | redacted 閲覧は read に分離・admin「機密閲覧」件数を汚さない |
| R3 | 監査過少（redacted 閲覧が無記録） | 中 | read 記録を追加して解消 |
| R4 | e2e 回帰 | 低 | 表示不変・lib 1ファイルのみ・push 後 CI 74/0 で確認 |
| R5 | schema 必要化 | 低 | 既存 action/テーブルのみで成立・不要 |

## 12. Definition of Done

- コード変更は control-tower.ts 1ファイルのみ／DataAccessLog に confidential_view（finance）＋read（redacted）を1閲覧=1件記録／metadata allowlist 3項目／writeAudit・UsageEvent 不採用／単体 278 passed・型/lint/safety 緑／diff-check・secret・禁止領域・artifact・vault すべてクリア／commit-only（push は別承認）／e2e 実緑は push 後 CI。

## 13. 次回推奨プロンプト案

> 「P3-CT-3 実装 push-only（別承認）: 本 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI を read-only 確認し 74 passed / 0 failed（growth_control_tower 2件 green）を確認。緑なら P3-CT-4（FakeLLM 下書き生成の設計・別承認）を提案。」

## 14. 判定

判定: **P3-CT-3 Control Tower 監査ログ配線 実装完了（commit-only）／コード変更は `apps/web/lib/domains/growth/control-tower.ts` 1ファイルのみ／DataAccessLog に confidential_view（finance 閲覧）＋read（redacted 閲覧）を1閲覧=1件記録／metadata allowlist=financeVisible/cardCount/actionableCount の3項目のみ／writeAudit 不採用・UsageEvent 不採用・既存 action のみ／STOP 非該当**。**業務データ mutation なし・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・labels変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・外部送信/実LLM/AIコスト/課金/本番なし・runtime 解禁なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・状態永続化なし・metadata に金額/カード別件数/PII/secret/本文/scoreBreakdown なし・369-vault非編集・push なし（commit-only）**。前提 CI は run 28949692213（74/0）。次は P3-CT-3 実装 push-only（別承認）→ CI 74/0 確認。
