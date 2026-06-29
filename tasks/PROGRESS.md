# PROGRESS — IKEZAKI OS

> 進捗・タスク・完了履歴の最小トラッカー（Claude Code / Codex 共通）。詳細仕様は `docs/`、監査は `docs/audit/`。

## 現在地
- 本番系列: `main`（Vercel Production）。**Phase 1-16候補まで本番反映・本番確認完了（`addbd82`）**。
- Phase 1-15「督促（Dunning）」: `9e27a21`＋`ed1c30d` push 済み・Vercel 本番確認 GO。
- Phase 1-16候補「請求・入金系 finance 権限境界統一」: `addbd82` push 済み・Vercel 本番確認 GO。
- Phase 1-17「請求発行 issueInvoiceAction の finance 権限境界統一」: `3ab1435` push 済み・Vercel 本番確認 GO（2026-06-28）。
- Phase 1-18「請求一覧・作成・create を finance 境界に統一（案C）」: `5789516` push 済み・Vercel 本番確認 GO（2026-06-28）。
- Phase 1-19「承認一覧・朝報の finance 閲覧露出を遮断」: `491509a` push 済み・Vercel 本番確認 GO（2026-06-28）。**finance 境界統一ライン（1-15〜1-19）クローズ**。
- Phase 1-20「検証・本番確認フローの定型化」: ローカル整備・検証完了／push 未実施（人間承認待ち）。本番機能変更なし＝本番確認不要。
- Phase 1-21B「UsageEvent / Monetization 設計の docs-only 記録」: `docs/audit/15_monetization_usage_design.md` 作成（設計のみ・課金実行なし）。`85c79ab` push 済み（origin/main）。コード/schema/migration 変更なし＝本番確認不要。
- Phase 1-22「UsageEvent モデル追加・migration」: `d14ce1d` push 済み・**Vercel 本番確認 GO（2026-06-28）**。schema に `UsageEvent` 追加＋migration `20260628183116_p1_22_usage_event`＋`p1_22_usage_event.itest.ts`。**DB model + test のみ／emit なし／課金なし／決済なし**。
- Phase 1-23「非課金 UsageEvent emit 最小実装」: `399de6f` push 済み・**Vercel 本番確認 GO（2026-06-29）**。`recordUsageEvent` helper＋LeadMap CSV export で `export.generated`（billing=usage_only）を記録。**emit 対象は LeadMap export のみ／課金なし／決済なし／billable_candidate なし／金額なし**。
- Phase 1-24「UsageEvent emit 拡張候補の横断監査・設計のみ」: 監査完了（GO）。次の P0 = AI出力 `saveAIOutputStandard`。ファイル変更なし。
- Phase 1-25「AIOutput の非課金 UsageEvent emit」: `11c224d`（実装）＋`9944f0e`（本番確認記録）push 済み・**Vercel 本番確認 GO（2026-06-29）＝完全クローズ**。`saveAIOutputStandard` で `ai.output.generated`（billing=usage_only・metadata=task/model のみ）を記録。**emit対象は LeadMap export + AIOutput の2種類／課金なし／決済なし／billable_candidate なし／金額なし／helper・LeadMap emit 不変**。※旧 `a9643a4` は揮発環境で失われた未push記録で正式基準ではない。**正式基準 origin/main=`9944f0e`**。
- Phase 1-26「UsageEvent emit 拡張方針の記録・監査（docs-only）」: `057d314` push 済み。Phase 1-25 完了状態を固定（`11c224d`+`9944f0e`、旧 a9643a4 を基準にしない）＋次候補を横断監査。**次の P0 = danger-actions export**。`docs/audit/16` 作成。
- Phase 1-27「admin danger-actions export の非課金 UsageEvent emit」: `35cd384` push 済み・**Vercel 本番確認 GO（2026-06-29）**。`executeApprovedExportAction` で `export.generated`（billing=usage_only・metadata=固定値 scope/format/source）を記録。**emit対象は LeadMap export + AIOutput + admin danger-actions export の3種類／課金なし／決済なし／billable_candidate なし／金額なし／payloadAfter 実値 metadata 不可／helper・LeadMap・AIOutput emit 不変**。
- Phase 1-28「次の UsageEvent emit 拡張候補の横断監査（読み取り専用）」: 監査完了（GO）。次の P0 = approvals outreach 送信。外部送信の分類設計（logged/sent=usage_only emit・suppressed/failed=emit しない）を確定。ファイル変更なし。
- Phase 1-29「approvals outreach 送信の非課金 UsageEvent emit」: `986e738` push 済み・**Vercel 本番確認 GO（2026-06-29）**。`decideApprovalAction` で `external_send.outreach`（billing=usage_only・metadata=channel/status のみ・logged/sent のみ emit）を記録。**emit対象は LeadMap export + AIOutput + admin danger-actions export + approvals outreach の4種類／課金なし／決済なし／billable_candidate なし／金額なし／suppressed・failed は emit しない／helper・既存3 emit 不変**。

## Phase 1-29 — approvals outreach 送信の非課金 UsageEvent emit

状態: **本番確認完了（GO）** — `986e738` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-29・利用者ブラウザ確認）。詳細 `docs/audit/14` §31 / `docs/audit/15` §22.1。
- 実機確認: Vercel `986e738`/Ready/Build成功・migrate deploy 不要・migration pending なし・engine/runtime/UsageEvent/approvals outreach error なし。`/login`・OWNERログイン・`/approvals` OK。outreach_send 承認処理・outreach 送信が logged/sent として従来どおり処理・suppressed は emit されない・処理後の画面/runtime error なし・UsageEvent/recordUsageEvent 関連エラーなし。emit対象に approvals outreach 追加・既存3 emit(LeadMap/AIOutput/admin export)維持・billing=usage_only・billable_candidate 未使用・metadata=channel/status のみ・toAddress/subject/body/draftId/leadId/顧客情報/金額/secret 不在・suppressed/failed/rejected は emit されない。課金/決済/サブスク/各 Monetization 画面の新規表示なし。既存機能（/leadmap・/invoices・/finance・/approvals・/reports/morning・#dunning・LeadMap export CSV・AIOutput生成・admin export）回帰なし。権限境界維持。実メール送信なし・本番DB直接操作なし・Prisma migrate 手動実行なし。
- 🧩 `apps/web/app/(app)/approvals/actions.ts`: `decideApprovalAction`（outreach_send 承認）の `OutreachSendLog.create` を `const outreachLog = ...` で受け、直後・`outreachDraft.update` 前に `recordUsageEvent` を追加。
  eventType=`external_send.outreach` / category=`external_send` / **billing=`usage_only`** / unit=`count` / quantity=`1` / sourceType=`OutreachSendLog` / sourceId=`outreachLog.id` / idempotencyKey=`usage:external_send.outreach:<id>` / metadata=`{channel:'email', status: sendStatus}`（非PII）。
  記録失敗で承認・送信主処理を壊さない（helper は例外を投げない）。**実メール送信は起こさない**（既存挙動不変）。
- **emit 条件は `sendStatus === 'logged' || sendStatus === 'sent'` のみ**。**`suppressed` / `failed` / `rejected` は emit しない**（never_billable 相当）。
- metadata に toAddress/fromAddress/subject/body/draftId/leadId/placeId/顧客情報/金額/secret を入れない。
- emit 対象に **approvals outreach 送信** を追加。**LeadMap export / AIOutput / admin danger-actions export emit・recordUsageEvent helper は不変**。
- 課金なし／決済なし／`billable_candidate`・`never_billable` の runtime 使用なし／金額(amount/price/currency)なし。
- 🧪 `packages/db/src/__tests__/p1_29_usage_event_outreach.itest.ts`: payload 仕様／metadata=channel,status のみ／usage_only／emit 条件（logged|sent のみ・suppressed/failed/rejected は emit しない）／二重計上不可／別tenant同key可。
- schema/migration/RBAC/ABAC/package/lock 変更なし。
- 検証（全 green）: db:generate / p1_29 integration 6 / p1_27 5・p1_25 5・p1_23 5・p1_22 6・p1_10 11・p1_15 8 回帰 / 統合 20ファイル128 / `./scripts/verify.sh`（typecheck/lint/unit 23ファイル211/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §22。
- 現在の emit 対象は **LeadMap export + AIOutput + admin danger-actions export + approvals outreach の4種類**。
- 次候補: A'（invoice-send/dunning）／B（Webhook delivery）だが別途監査・承認。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

## Phase 1-27 — admin danger-actions export の非課金 UsageEvent emit

状態: **本番確認完了（GO）** — `35cd384` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-29・利用者ブラウザ確認）。詳細 `docs/audit/14` §30 / `docs/audit/15` §21.1。
- 実機確認: Vercel `35cd384`/Ready/Build成功・migrate deploy 不要・migration pending なし・engine/runtime/UsageEvent/admin export error なし。admin danger-actions の承認済み export が従来どおり動作・ExportJob 作成 OK。**同一承認リクエストの再実行は already-executed で拒否（正常・二重実行防止）**。UsageEvent/recordUsageEvent 関連エラーなし。emit対象は LeadMap export + AIOutput + admin danger-actions export の3種類・billing=usage_only・billable_candidate 未使用・metadata=固定3値(scope/format/source)のみ・payloadAfter 実値なし。課金/決済/サブスク/UsageEvent管理画面の新規表示なし。既存機能（/leadmap・/invoices・/finance・/approvals・/reports/morning・#dunning・LeadMap export CSV・AIOutput生成）回帰なし。権限境界（STAFF finance機密遮断・請求一覧/作成遮断・/approvals AccessDenied・非finance 朝報財務非表示）維持。実メール送信なし・本番DB直接操作なし・Prisma migrate 手動実行なし。
- **課金なし／決済なし／billable_candidate なし／metadata=固定3値のみ／payloadAfter 実値なし／emit対象は3種類**。既存機能回帰なし。
- 次候補: P1（外部送信 sent / Webhook delivery）だが別途監査・承認。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

- 🧩 `apps/web/app/(app)/admin/danger-actions/actions.ts`: `executeApprovedExportAction` の ExportJob 作成後・既存 `writeAudit` 後・`return job.id` 前に `recordUsageEvent` を1回だけ追加。
  eventType=`export.generated` / category=`export` / **billing=`usage_only`** / unit=`count` / quantity=`1` / sourceType=`ExportJob` / sourceId=`job.id` / idempotencyKey=`usage:export.generated:<job.id>` / metadata=`{scope:'admin_danger_actions_export',format:'csv',source:'admin_danger_actions'}`（固定値・非PII）。
  記録失敗で承認済み export 本処理を壊さない（helper は例外を投げない）。
- emit 対象に **admin danger-actions export** を追加。**LeadMap export emit・AIOutput emit・recordUsageEvent helper は不変**。
- 課金なし／決済なし／`billable_candidate`・`never_billable` の runtime 使用なし／金額(amount/price/currency)なし／`req.payloadAfter` の実値・顧客情報・CSV本文・件数・金額・secret・実IDを metadata に入れない。
- 🧪 `packages/db/src/__tests__/p1_27_usage_event_admin_export.itest.ts`: payload 仕様／metadata=scope,format,source のみ／usage_only／二重計上不可／別tenant同key可。
- schema/migration/RBAC/ABAC/package/lock 変更なし。
- 検証（全 green）: db:generate / p1_27 integration 5 / p1_25 5・p1_23 5・p1_22 6・p1_10 11・p1_15 8 回帰 / 統合 19ファイル122 / `./scripts/verify.sh`（typecheck/lint/unit 23ファイル211/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §21。
- 現在の emit 対象は **LeadMap export + AIOutput + admin danger-actions export の3種類**。
- 次候補: 別途監査・承認（P1=外部送信 sent / Webhook）。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

## Phase 1-26 — UsageEvent emit 拡張方針の記録・監査（docs-only）

状態: **ローカル監査・記録完了／push 未実施（人間承認待ち）**／本番確認不要（docs のみ・コード挙動不変）

- 🔒 状態固定: Phase 1-25 は **`11c224d`（実装）＋`9944f0e`（本番確認記録）でクローズ済み**・本番 GO 済み。旧 `a9643a4` は**未push のまま揮発環境で失われた**もので**正式基準ではない**。**正式基準 origin/main=`9944f0e`**。今後 `a9643a4` を前提にしない。
- 📄 `docs/audit/16_usage_event_emit_expansion_strategy.md`（新規）: 状態固定＋候補A〜G監査＋比較表＋分類（P0/P1/P2/NEVER_BILLABLE/DO_NOT_TOUCH_NOW）＋metadata/idempotency 方針＋Phase 1-27 プロンプト案。
- 現在の emit 対象は **LeadMap export + AIOutput の2種類**。runtime billing=usage_only・billable_candidate 不使用・課金/決済/サブスクなし。
- 次候補を **danger-actions export（admin 承認付きエクスポート・`export.generated`/usage_only・metadata=非PII・sourceId=job.id）** の1つに確定（P1=外部送信 sent / Webhook、P2=JobRun/worker、DO_NOT_TOUCH=seat/finance internal）。
- コード/schema/migration/RBAC/ABAC/package/lock 不変。課金なし／決済なし／emit 追加なし。
- 詳細: `docs/audit/16` / `docs/audit/15` §20。
- 次は別承認で **Phase 1-27**（danger-actions export emit の最小実装・1対象のみ・usage_only・金額なし）。

## Phase 1-25 — AIOutput の非課金 UsageEvent emit（saveAIOutputStandard）

状態: **本番確認完了（GO）** — `11c224d` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-29・利用者ブラウザ確認）。詳細 `docs/audit/14` §29 / `docs/audit/15` §19.1。
- 実機確認: Vercel `11c224d`/Ready/Build成功・migrate deploy 不要・migration pending なし・engine/runtime/UsageEvent/AIOutput error なし。AI出力が発生する既存機能・LeadMap AI分析など `saveAIOutputStandard` 経由のAI生成が従来どおり動作。AIOutput 保存後の画面/runtime error なし。UsageEvent/recordUsageEvent 関連エラーなし。emit対象は LeadMap export + AIOutput の2種類・billing=usage_only・billable_candidate 未使用・metadata=task/model のみ。課金/決済/サブスク/UsageEvent管理画面の新規表示なし。既存機能回帰なし。
- **課金なし／決済なし／billable_candidate なし／metadata=task/model のみ／emit対象は LeadMap export + AIOutput の2種類**。
- ※ 本番確認記録は揮発環境で未push記録コミット（旧 a9643a4）が失われたため、同一の受領実測値で再作成（コード `11c224d` 不変）。
- 次候補: P1 候補（danger-actions export / 外部送信 sent / Webhook）への段階展開（別途承認）。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

- 🧩 `apps/web/lib/ai-safety-server.ts`: `saveAIOutputStandard` の `aIOutput.create` 成功後に `recordUsageEvent` を1回だけ追加。
  eventType=`ai.output.generated` / category=`ai` / **billing=`usage_only`** / unit=`count` / quantity=`1` / sourceType=`AIOutput` / sourceId=`out.id` / idempotencyKey=`usage:ai.output.generated:<out.id>` / metadata=`{task, model}`（非PII）。
  記録失敗で AIOutput 保存・logDataAccess・戻り値を壊さない（helper は例外を投げない）。`actorType` は helper 許可型へキャスト（helper 不変）。
- emit 対象は **AIOutput のみ**。外部送信・dunning・invoice送信・JobRun・Webhook・storage・seat には広げない。**LeadMap export emit は維持／recordUsageEvent helper は不変**。
- 課金なし／決済なし／`billable_candidate`・`never_billable` の runtime 使用なし／金額(amount/price/currency)なし／metadata に input/inputHash/output/outputText/citations/prompt/顧客情報/email/金額/secret を入れない。
- 🧪 `packages/db/src/__tests__/p1_25_usage_event_ai_output.itest.ts`: payload 仕様／metadata=task,model のみ／usage_only／二重計上不可／別tenant同key可。
- schema/migration/RBAC/ABAC/package/lock 変更なし。
- 検証（全 green）: db:generate / p1_25 integration 5 / p1_23 5・p1_22 6・p1_10 11・p1_15 8 回帰 / 統合 18ファイル117 / `./scripts/verify.sh`（typecheck/lint/unit 23ファイル211/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §19。
- 次候補: 他の安全な発火点への段階展開（別途承認）。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

## Phase 1-23 — 非課金 UsageEvent emit 最小実装（LeadMap export のみ）

状態: **本番確認完了（GO）** — `399de6f` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-29・利用者ブラウザ確認）。詳細 `docs/audit/14` §28 / `docs/audit/15` §18.1。
- 実機確認: Vercel `399de6f`/Ready/Build成功・migrate deploy 不要・migration pending なし・engine/runtime/UsageEvent/LeadMap export error なし。LeadMap CSV export が従来どおり動作（ダウンロード/内容/操作後エラーなし）。`/login`・OWNERログイン・`/leadmap`・`/invoices`・`/finance`・`/approvals`・`/reports/morning` すべて OK。emit 対象は LeadMap export のみ・billing=usage_only・billable_candidate 未使用・課金/決済/サブスク/UsageEvent管理画面の新規表示なし。既存 finance/invoice/dunning/approvals/morning 回帰なし。権限境界（STAFF finance機密遮断・請求一覧/作成遮断・/approvals AccessDenied・非finance 朝報財務非表示）維持。意図しない実メール送信なし・本番DB直接操作なし・Prisma migrate 手動実行なし。
- LeadMap CSV export が従来どおり動作・UsageEvent/recordUsageEvent 関連エラーなし。**課金なし／決済なし／billable_candidate なし／emit対象は LeadMap export のみ**。既存機能回帰なし。
- 次候補: 他の安全な発火点への段階展開（別途承認）。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

- 🧩 `apps/web/lib/usage-events.ts`（新規）: `recordUsageEvent` helper。UsageEvent を1件安全に記録するだけ。**金額(amount/price/currency)を扱わない**。tenantId+idempotencyKey の unique 衝突は duplicate 扱い（既存を壊さない）。**記録失敗時も例外を投げず ok:false を返す（主処理を壊さない）**。billing は許可値以外なら usage_only に丸める／quantity 既定1／必須欠落は ok:false。
- 🔌 `apps/web/app/api/leadmap/export/route.ts`: ExportJob 作成後に1回だけ emit。eventType=`export.generated` / category=`export` / **billing=`usage_only`** / unit=`count` / quantity=`1` / sourceType=`ExportJob` / sourceId=`exportJob.id` / idempotencyKey=`usage:export.generated:<id>` / metadata=`{scope:"leadmap_leads",format:"csv",hasCampaignFilter:Boolean(campaignId)}`（非PII）。CSV export 本処理は記録失敗で壊さない。
- emit 対象は **LeadMap export のみ**。AI出力・外部送信・dunning・invoice送信・JobRun・storage・seat には広げない。
- 課金なし／決済なし／`billable_candidate` 不使用／金額なし／metadata に PII・secret・本文・金額・campaignId実値・CSV本文・件数を入れない。
- 🧪 `packages/db/src/__tests__/p1_23_usage_event_emit.itest.ts`: payload 仕様／非PII metadata／usage_only／二重計上不可／別tenant同key可。
- schema/migration/RBAC/ABAC/package/lock 変更なし。
- 検証（全 green）: db:generate / p1_23 integration 5 / p1_22 6・p1_10 11・p1_15 8 回帰 / 統合 17ファイル112 / `./scripts/verify.sh`（typecheck/lint/unit 23ファイル211/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §18。
- 次候補: 他の安全な発火点への段階展開（別途承認）。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

## Phase 1-22 — UsageEvent モデル追加・migration（非課金の利用量台帳）

状態: **本番確認完了（GO）** — `d14ce1d` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-28・利用者ブラウザ確認）。詳細 `docs/audit/14` §27 / `docs/audit/15` §17.1。
- 実機確認: Vercel `d14ce1d`/Ready/Build成功・migrate deploy 成功・migration pending なし・engine/runtime/UsageEvent migration error なし。`/login`・OWNERログイン・`/invoices`・`/approvals`・`/reports/morning`・`/finance`・`/planning-hokko` すべて OK。既存 finance/invoice フロー（一覧/作成/詳細/発行/外部送信申請/入金/#dunning）回帰なし。UsageEvent テーブル追加による画面影響なし・課金/決済/サブスク/UsageEvent管理画面の新規表示なし。課金/決済/サブスク/emit なし・意図しない実メール送信なし・Vercel環境変数変更なし。権限境界（STAFF の finance機密遮断・請求一覧/作成遮断・/approvals AccessDenied・非finance 朝報財務非表示）維持。
- UsageEvent モデル追加・migration 成功。既存機能回帰なし。**課金なし／決済なし／emit なし**（入れ物のみ）。
- 次候補: Phase 1-23「非課金 usage 記録 emit」（別途承認・金額なし）。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

- 🗃 `packages/db/prisma/schema.prisma`: `UsageEvent` モデル追加（非課金の利用量台帳）。
  id/tenantId/actorId/actorType/eventType/category/billing/unit/quantity Decimal(18,4)/sourceType/sourceId/idempotencyKey/occurredAt/metadata Json/createdAt。
  `@@unique([tenantId, idempotencyKey])`（二重計上防止）＋ index 5本。**金額(amount/price/currency)は持たない**。Tenant/User relation なし（スカラ）。
- 🧱 migration `20260628183116_p1_22_usage_event`: **CREATE TABLE と index のみ・非破壊**（既存テーブルの DROP/ALTER なし）。ローカル DB（app369）にのみ適用。
- 🧪 `packages/db/src/__tests__/p1_22_usage_event.itest.ts`: 作成/既定値/二重計上不可/別tenant同key可/tenant分離/billing 3分類。metadata に PII/本文/secret/金額を入れない方針をテストでも遵守。
- 実装範囲は **DB model + migration + test のみ**。emit なし／課金なし／決済なし／請求なし／プラン制御・上限 enforcement なし。
- billing は分類ラベル（usage_only / billable_candidate / never_billable）のみで課金実行ではない。
- 検証（全 green）: db:generate / p1_22 integration 6 / p1_10 11・p1_15 8 回帰 / 統合 16ファイル107 / `./scripts/verify.sh`（typecheck/lint/unit 23ファイル211/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §17。
- 次候補: Phase 1-23「非課金 usage 記録 emit」（別途承認・金額なし）。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

## Phase 1-21B — UsageEvent / Monetization 設計の docs-only 記録

状態: **ローカル記録完了／push 未実施（人間承認待ち）**／本番確認 不要（docs のみ・コード/schema/migration 不変）

- 📄 `docs/audit/15_monetization_usage_design.md`: Phase 1-21A（監査・設計のみ）の結論を記録。
  目的/現状棚卸し/既存モデル棚卸し表/UsageEvent と既存ログの違い/最小MVP疑似スキーマ（**schema 未追加**）/
  eventType 分類/billing 3分類（usage_only・billable_candidate・never_billable）/保存禁止項目（PII非保持）/
  tenant 分離/RBAC 案/課金前安全条件/実装ステップ案（S0〜S5）/MVP 初回記録候補/やらないこと/リスク/判定GO。
- 設計の中核: **UsageEvent は「量のみ」を記録する非課金の利用台帳**（金額を持たない）。`@@unique([tenantId, idempotencyKey])` で二重計上防止。課金は別 billing 層・人間承認・デフォルト非課金。
- 安全前提: **課金実行なし**／schema.prisma 編集なし／migration なし／アプリコード・package.json・pnpm-lock.yaml 不変／本番DB非接触。
- AI は課金・billing 分類変更・台帳改ざん・外部送信を持たない（ROLE_PERMISSIONS 不変）方針を明記。
- 次候補（P2）: S1（UsageEvent モデル追加・migration）以降は別タスク・別承認で段階導入。案E（STAFF向けマスク請求）、案D（issue承認ゲート）、AutomationLevel は後続。

## Phase 1-20 — 検証・本番確認フローの定型化

状態: **ローカル整備・検証完了／push 未実施（人間承認待ち）**／本番確認 不要（docs/scripts のみ・コード挙動不変）

- 🛠 `scripts/verify.sh`: ローカル検証ワンショット（db:generate→typecheck→lint→test→build・ステップ表示・`set -euo pipefail`・本番DB非接続・E2E既定オフ・BLOCKERS参照）。
- 📋 `docs/release/RELEASE_CHECKLIST.md`: push前/push条件/push後/本番確認要否/GO・HOLD・NG/rollback/禁止事項/非エンジニア向けポイント/Phase 1-15〜1-19 の学び。
- 📋 `docs/release/PROD_VERIFICATION_FORM.md`: Vercel/本番ブラウザ/外部送信/権限/finance/AI・朝報・承認の汎用確認フォーム＋GO/HOLD/NG基準＋貼り返しテンプレ。
- コード/ schema/ migration/ RBAC/ABAC 変更なし。package.json は未変更（verify は `./scripts/verify.sh` 直実行）。
- 次候補（P2）: UsageEvent / 課金ログ基盤の**監査・設計のみ**（課金実行なし）。案E（STAFF向けマスク請求）、案D（issue承認ゲート）、AutomationLevel は後続。

## Phase 1-19 — 承認一覧・朝報の finance 閲覧露出を遮断

状態: **本番確認完了（GO）** — `491509a` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-28・利用者ブラウザ確認）。詳細 `docs/audit/14` §26。
- 実機確認: 承認者 `/approvals` 表示OK・STAFF=AccessDenied・finance権限者の朝報従来どおり・非finance は財務非表示/固定安全文/売上機会非表示・既存 finance フロー維持・実送信なし。READ_ONLY/EXTERNAL の /approvals は実機未確定（RBAC テストで担保）。
- **finance 境界統一ライン（Phase 1-15〜1-19）クローズ**。以降は P2（UsageEvent/課金・案E・案D・AutomationLevel・本番E2E）。

- 🔐 `/approvals`: 閲覧を `approval:approve` 必須化（findMany 前に AccessDenied 遮断）。承認 title/summary の請求金額・請求番号が STAFF に漏れる抜け穴（Phase 1-18 の補完）を解消。
- 🔐 `/reports/morning`: 財務指標（売上/原価/粗利/売掛延滞）を `finance:read` 非保有者に redact。**画面だけでなく AI 朝報生成・異常検知の入力からも redact**（すり抜け防止）。非財務指標は維持。
  - UX: 非finance ユーザーには 0 を実績と誤解させないため、AI本文を固定安全文に差し替え＋「売上機会」カード非表示。
- 境界: approvals 閲覧=approval:approve（OWNER/EXECUTIVE/ADMIN/DEPARTMENT_MANAGER 可・STAFF/READ_ONLY/EXTERNAL 不可）／morning 財務=finance:read。
- RBAC/ABAC 定義・schema・action・lib 不変。migration なし。
- テスト: `p1_10_invoice_payment.itest.ts` に approvals/morning の閲覧境界テスト追加。詳細: `docs/audit/03`「Phase 1-19 ローカル是正」。

## Phase 1-18 — 請求一覧・作成・createInvoiceAction の finance 境界統一（案C）

状態: **本番確認完了（GO）** — `5789516` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-28・利用者ブラウザ確認）。詳細 `docs/audit/14` §25。
- 実機確認: OWNER 一覧/作成/下書き OK・STAFF 全面遮断 OK・既存 finance フロー維持・実送信なし。ADMIN/READ_ONLY は実機未確定（RBAC テストで担保）。

- 🔐 `/invoices` 一覧を請求詳細と同じ ABAC（FINANCIAL_CONFIDENTIAL）で保護（データ取得前に遮断・access log 記録）。
- 🔐 `/invoices/new` を `invoice:create` かつ `finance:read` 必須化（顧客/案件取得前に遮断）。
- 🔐 `createInvoiceAction` を `invoice:create` かつ `finance:read` に統一（直叩き遮断）。
- 境界: 一覧閲覧=finance:read（OWNER/EXECUTIVE/ADMIN/DEPARTMENT_MANAGER/READ_ONLY 可・STAFF 不可）／作成=invoice:create かつ finance:read（OWNER/EXECUTIVE/DEPARTMENT_MANAGER 可・他不可）。
- STAFF の請求一覧/作成は一旦停止。営業の下書きは当面 Quote(見積) で担保。STAFF 向けマスク/スコープ請求は将来の案E。
- issueInvoiceAction・詳細・invoice-send/payments/dunning・RBAC/ABAC 定義・schema 不変。migration なし。
- テスト: `p1_10_invoice_payment.itest.ts` に create/一覧の権限境界テスト追加。詳細: `docs/audit/03`「Phase 1-18 ローカル是正」。

## Phase 1-17 — 請求発行(issueInvoiceAction)の finance 権限 server 側統一

状態: **本番確認完了（GO）** — `3ab1435` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-28・利用者ブラウザ確認）。詳細 `docs/audit/14` §24。

- 🔐 発行（DRAFT→ISSUED＋Receivable 起票＝財務確定）を `invoice:update` かつ `finance:read` に統一（dunning/invoice_send/payment と同一境界）。STAFF は finance:read 非保有で直叩き遮断。
- 境界＝OWNER/EXECUTIVE/DEPARTMENT_MANAGER 可、STAFF/ADMIN/READ_ONLY/EXTERNAL 不可。
- `createInvoiceAction` は据置（invoice:create のまま・STAFF の下書き作成維持＝案B）。lib/schema/RBAC/UI 不変・migration なし。
- テスト: `p1_10_invoice_payment.itest.ts` に発行の権限境界テスト追加。
- 詳細: `docs/audit/03_security_audit.md`「Phase 1-17 ローカル是正」。
- フォローアップ: `/invoices` 一覧・`/invoices/new` の finance ABAC、issue の承認ゲート化（案D）、AutomationLevel 化。

## Phase 1-15 — 督促（Dunning）下書き＋承認ゲート＋送信記録

状態: **本番確認完了（GO）** — `origin/main = ed1c30d` push 済み、Vercel 本番確認 GO（2026-06-28・利用者ブラウザ確認）。

### 実装（main 9e27a21・既存）
- 純ロジック `packages/shared/src/dunning.ts`（`buildDunningDraft`/`isDunningEligible`、禁止表現13語をテストで排除）。
- orchestration `apps/web/lib/domains/finance/dunning.ts`（`getDunningContext`/`createDunningDraft`/`requestDunningSend`/`executeDunningSend`）。
- server actions（invoices/actions.ts 3本）、invoice detail #dunning、approvals ラベル、golden-path deep link。
- 承認ゲート `dunning_send`、PIIマスク、`EXTERNAL_SEND_ENABLED=false`で logged のみ、二重実行防止、Receivable 不変、監査ログ、GrowthEvent。

### 本セッションの是正（2026-06-28）
- 🔐 督促 server action 3本に `finance:read` を必須化（`invoice:update` のみ→ STAFF 直叩きを server 側で遮断）。UI 表示条件も同条件に統一。
- 🏷 特定企業名固定 `COMPANY_NAME='プランニングホッコー'` を撤去 → `Tenant.name`（未取得時「請求元」）。
- 🧪 `p1_15_dunning.itest.ts` に権限境界テスト（invoice:update かつ finance:read）追加。unit/integration の companyName を汎用化。

### ローカル検証（全 green・2026-06-28）
- db:generate ✅ / typecheck ✅(web/worker/db) / lint ✅ / unit `pnpm test` ✅ 23ファイル211 / integration ✅ 15ファイル96（`p1_15_dunning` 8 含む）/ build ✅(BUILD_ID生成)
- ※ prisma エンジンはサンドボックスのNodeダウンローダがDL不可のため curl で手動取得して検証（`tasks/BLOCKERS.md` 参照）。

### 本番確認（GO・2026-06-28・利用者ブラウザ/Vercel）
- Vercel Production: Commit `ed1c30d` / Branch `main` / Status Ready / Build 成功 / migrate pendingなし・schema変更なし / engine error なし / runtime error なし。
- 本番スモーク（検証用請求書）: `/login`・OWNERログイン・`/invoices`・`#dunning`表示・督促下書き作成・送信承認申請・`/approvals`に`dunning_send` すべて OK。承認後は `EXTERNAL_SEND_ENABLED=false` のため **logged/記録済み**。**Receivable は collected にならない**。
- STAFF: finance 機密拒否・`#dunning` 非表示・Golden Path 経由でも督促非表示。**意図しない実メール送信なし**。総合判定 **GO**。
- 詳細は `docs/audit/14_release_stabilization.md` §22。

### 残・次の一手
- 別タスク: UsageEvent / 課金連携（現状 TODO）。
- 別タスク: 本番 E2E または手動スモークの定型化。
- 判断要: `createInvoiceAction`/`issueInvoiceAction` の権限方針（STAFF の請求作成/発行を遮断するか＝製品判断）。

## Phase 1-16 候補 — 請求・入金・外部送信 server action の finance 権限 server 側統一

状態: **本番確認完了（GO）** — `addbd82` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-28・利用者ブラウザ確認）。詳細 `docs/audit/14` §23。

- 🔐 Phase 1-15 で確立した同型リスク（UI 非表示でも server action 直叩きで危険）を横展開是正。
  請求の finance 機密 3 アクション（`requestInvoiceExternalSendApprovalAction` / `executeApprovedInvoiceExternalSendAction` / `recordPaymentAction`）に `finance:read` を必須化（`invoice:update` かつ `finance:read`・dunning と統一）。
- 実行可能境界＝OWNER / EXECUTIVE / DEPARTMENT_MANAGER。STAFF は finance:read 非保有で遮断。ADMIN は invoice:update 非保有で従来どおり不可。
- lib（invoice-send / payments）は不変・安全。新規DBモデル/migration なし。
- テスト: `p1_10_invoice_payment.itest.ts` に権限境界テスト追加。
- 検証（全 green）: db:generate / dunning unit 20 / integration 15ファイル97（p1_10/p1_15 含む）/ typecheck / lint / unit 23ファイル211 / build（BUILD_ID 生成）。
- 詳細: `docs/audit/03_security_audit.md`「Phase 1-16 ローカル是正」。
- 範囲外（判断要）: `createInvoiceAction`/`issueInvoiceAction` の STAFF 遮断可否。
