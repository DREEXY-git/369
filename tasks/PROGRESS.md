# PROGRESS — IKEZAKI OS

> 進捗・タスク・完了履歴の最小トラッカー（Claude Code / Codex 共通）。詳細仕様は `docs/`、監査は `docs/audit/`。

> 状態管理メモ: `PROGRESS.md` は履歴・判断メモであり、現在の git 反映状態そのものではありません。現在の push 反映状態は git refs（`git rev-parse HEAD` / `git rev-parse origin/main` / `git log origin/main`）を正とします。今後の Phase 状態行では、原則として `push 未実施` / `人間承認待ち` などの一時状態を永続表現として残さず、必要な場合は最終報告または CURRENT_STATE 系の別記録で扱います。

## 現在地
- 本番系列: `main`（Vercel Production）。**Phase 1-16候補まで本番反映・本番確認完了（`addbd82`）**。
- Phase 1-15「督促（Dunning）」: `9e27a21`＋`ed1c30d` push 済み・Vercel 本番確認 GO。
- Phase 1-16候補「請求・入金系 finance 権限境界統一」: `addbd82` push 済み・Vercel 本番確認 GO。
- Phase 1-17「請求発行 issueInvoiceAction の finance 権限境界統一」: `3ab1435` push 済み・Vercel 本番確認 GO（2026-06-28）。
- Phase 1-18「請求一覧・作成・create を finance 境界に統一（案C）」: `5789516` push 済み・Vercel 本番確認 GO（2026-06-28）。
- Phase 1-19「承認一覧・朝報の finance 閲覧露出を遮断」: `491509a` push 済み・Vercel 本番確認 GO（2026-06-28）。**finance 境界統一ライン（1-15〜1-19）クローズ**。
- Phase 1-20「検証・本番確認フローの定型化」: `de3d054` push 済み（origin/main 上で確認）。本番機能変更なし＝本番確認不要。
- Phase 1-21B「UsageEvent / Monetization 設計の docs-only 記録」: `docs/audit/15_monetization_usage_design.md` 作成（設計のみ・課金実行なし）。`85c79ab` push 済み（origin/main）。コード/schema/migration 変更なし＝本番確認不要。
- Phase 1-22「UsageEvent モデル追加・migration」: `d14ce1d` push 済み・**Vercel 本番確認 GO（2026-06-28）**。schema に `UsageEvent` 追加＋migration `20260628183116_p1_22_usage_event`＋`p1_22_usage_event.itest.ts`。**DB model + test のみ／emit なし／課金なし／決済なし**。
- Phase 1-23「非課金 UsageEvent emit 最小実装」: `399de6f` push 済み・**Vercel 本番確認 GO（2026-06-29）**。`recordUsageEvent` helper＋LeadMap CSV export で `export.generated`（billing=usage_only）を記録。**emit 対象は LeadMap export のみ／課金なし／決済なし／billable_candidate なし／金額なし**。
- Phase 1-24「UsageEvent emit 拡張候補の横断監査・設計のみ」: 監査完了（GO）。次の P0 = AI出力 `saveAIOutputStandard`。ファイル変更なし。
- Phase 1-25「AIOutput の非課金 UsageEvent emit」: `11c224d`（実装）＋`9944f0e`（本番確認記録）push 済み・**Vercel 本番確認 GO（2026-06-29）＝完全クローズ**。`saveAIOutputStandard` で `ai.output.generated`（billing=usage_only・metadata=task/model のみ）を記録。**emit対象は LeadMap export + AIOutput の2種類／課金なし／決済なし／billable_candidate なし／金額なし／helper・LeadMap emit 不変**。※旧 `a9643a4` は揮発環境で失われた未push記録で正式基準ではない。**正式基準 origin/main=`9944f0e`**。
- Phase 1-26「UsageEvent emit 拡張方針の記録・監査（docs-only）」: `057d314` push 済み。Phase 1-25 完了状態を固定（`11c224d`+`9944f0e`、旧 a9643a4 を基準にしない）＋次候補を横断監査。**次の P0 = danger-actions export**。`docs/audit/16` 作成。
- Phase 1-27「admin danger-actions export の非課金 UsageEvent emit」: `35cd384` push 済み・**Vercel 本番確認 GO（2026-06-29）**。`executeApprovedExportAction` で `export.generated`（billing=usage_only・metadata=固定値 scope/format/source）を記録。**emit対象は LeadMap export + AIOutput + admin danger-actions export の3種類／課金なし／決済なし／billable_candidate なし／金額なし／payloadAfter 実値 metadata 不可／helper・LeadMap・AIOutput emit 不変**。
- Phase 1-28「次の UsageEvent emit 拡張候補の横断監査（読み取り専用）」: 監査完了（GO）。次の P0 = approvals outreach 送信。外部送信の分類設計（logged/sent=usage_only emit・suppressed/failed=emit しない）を確定。ファイル変更なし。
- Phase 1-29「approvals outreach 送信の非課金 UsageEvent emit」: `986e738` push 済み・**Vercel 本番確認 GO（2026-06-29）**。`decideApprovalAction` で `external_send.outreach`（billing=usage_only・metadata=channel/status のみ・logged/sent のみ emit）を記録。**emit対象は LeadMap export + AIOutput + admin danger-actions export + approvals outreach の4種類／課金なし／決済なし／billable_candidate なし／金額なし／suppressed・failed は emit しない／helper・既存3 emit 不変**。
- Phase 1-30「次候補（invoice-send/dunning vs Webhook delivery）の横断監査（読み取り専用）」: 監査完了（GO）。次の P0 = invoice-send。Webhook は worker/packages 経路（`processOutboxBatch`）で apps/web helper を使えず URL/secret/payload/retry の共通 helper 設計が必要なため後回し。ファイル変更なし。
- Phase 1-31「invoice-send の非課金 UsageEvent emit」: `b062f68` push 済み・**Vercel 本番確認 GO（2026-06-29）**。`executeInvoiceExternalSend` で `external_send.invoice`（billing=usage_only・metadata=channel/status/kind のみ・logged/sent のみ emit）を記録。**emit対象は 上記4種類 + invoice-send の5種類／課金なし／決済なし／billable_candidate なし／金額なし／failed等は emit しない／既存 finance ロジック・helper・既存4 emit 不変／financeEvent・writeAudit・GrowthEvent 回帰なし**。
- Phase 1-32「次候補（dunning vs Webhook 等）の横断監査（読み取り専用）」: 監査完了（GO）。次の P0 = dunning（invoice-send と同型・FinanceEvent を書かない分さらに安全）。Webhook は worker/packages 経路（`processOutboxBatch`）の共通 helper 設計が必要なため後回し。ファイル変更なし。
- Phase 1-33「dunning の非課金 UsageEvent emit」: `6cefe8f` push 済み・**Vercel 本番確認 GO（2026-06-29）**。`executeDunningSend` で `external_send.dunning`（billing=usage_only・metadata=channel/status/kind のみ・logged/sent のみ emit）を記録。**emit対象は 上記5種類 + dunning の6種類／課金なし／決済なし／billable_candidate なし／金額なし／no-recipient・already-sent・failed等は emit しない／既存 dunning ロジック・helper・既存5 emit 不変／Receivable 不変・collected にしない**。
- Phase 1-34「Webhook/JobRun/worker・packages 経路の次候補 横断監査（読み取り専用）」: 監査完了（GO）。Webhook 本番経路=`packages/db/src/outbox.ts::processOutboxBatch`（worker・admin手動）、JobRun=`packages/db/src/jobrun.ts`（worker は actorId なし）。`recordUsageEvent` は apps/web 専用で worker/packages から import 不可。次は実装ではなく packages/db 層 worker-safe recorder の docs-only 設計と判定。ファイル変更なし。
- Phase 1-35「worker/packages UsageEvent recorder architecture design（docs-only）」: `cca2e5a` push 済み・**本番確認不要（docs-only・コード挙動不変）**。`docs/audit/17_worker_usage_recorder_design.md` 作成＋doc15 §25＋本ファイル。**設計のみ／実装なし／emit 追加なし／emit 対象は6種類のまま／課金なし／決済なし／billable_candidate なし／never_billable runtime 使用なし／schema・migration・package・lock 変更なし**。
- Phase 1-36「worker-safe UsageEvent recorder 実装のみ」: `60a202d` push 済み・**Vercel/CI 本番確認 GO（2026-06-29）**。`packages/db/src/usage.ts` の `recordUsageEventCore`（apps/web 非依存・prisma は `./client`）を追加＋index.ts に export＋DB統合テスト。**runtime emit 追加なし／Webhook emit なし／JobRun emit なし／runtime call site なし（本番挙動不変）／apps/web helper 不変／既存6 emit 不変／emit 対象は6種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／金額なし／schema・migration・package・lock 変更なし**。metadata 禁止 top-level key ガード・P2002 duplicate・missing_required_field・例外を投げない設計。
- Phase 1-37「Webhook send 成功の非課金 UsageEvent emit」: `cc5a433` push 済み・**Vercel/CI 本番確認 GO（2026-06-29）**。`packages/db/src/outbox.ts` の `deliverOne` で Webhook 配送 **success のときだけ** `recordUsageEventCore` を呼び `webhook.delivered`（billing=usage_only・category=webhook・sourceType=WebhookDelivery・sourceId=delivery.id・actorType=system・metadata=eventType のみ）を記録。**emit 対象は 上記6種類 + Webhook success の7種類／failed・dead・retry失敗は emit しない／retry の二重計上を idempotencyKey=usage:webhook.delivered:<eventId>:<subscriptionId> で構造防止（最終成功1回）／metadata に url・secret・signature・payload・statusCode・error・実ID・金額を入れない／既存 Webhook 配送ロジック・recorder・apps/web helper・既存6 emit・apps/worker・jobrun.ts 不変／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・package・lock 変更なし**。
- Phase 1-38「JobRun UsageEvent emit 候補監査・ホワイトリスト設計（docs-only）」: `docs/audit/18_jobrun_usage_event_emit_design.md` 作成＋doc15 §28＋本ファイル。**監査のみ／実装なし／emit 追加なし／JobRun emit なし／emit 対象は7種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・package・lock 変更なし**。実コード監査の結論: JobRun 行は `outbox.ts` の `OUTBOX_DISPATCH`（内部インフラ・tenantId なし・webhook.delivered と二重計上）の1種類のみ＝EXCLUDE_INTERNAL。worker 19 jobType は JobRun を作らない。**P0 実装候補なし＝JobRun emit は HOLD**。`ff188a5` push 済み。
- Phase 1-39「worker 経由 UsageEvent 計測漏れ監査（docs-only）」: `5347ba8` push 済み・**本番確認不要（docs-only・コード挙動不変）**。`docs/audit/19_worker_emit_gap_audit.md` 作成＋doc15 §29＋本ファイル。**監査のみ／実装なし／emit 追加なし／emit 対象は7種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・package・lock 変更なし**。実コード監査の結論: worker が直接 `aIOutput.create`/`exportJob.create` した成果物は apps/web の既存 emit 経路を通らず**未計測（emit-gap）**。**P0 実装候補は1つ＝MORNING_REPORT_JOB の aIOutput emit**（到達性あり・未計測・metadata=task/source のみ・output 本文を入れない・二重計上なし）。本文/PII 近接（lead/outreach/embedding）・金額近接（dynamic pricing/profit leak）は DO_NOT_TOUCH_NOW、内部処理（backup/embedding/anomaly/OUTBOX）は EXCLUDE_INTERNAL。

- Phase 1-40「worker MORNING_REPORT_JOB の AIOutput 非課金 UsageEvent emit」: `c0a563b` push 済み・**Vercel/CI 本番確認 GO（2026-07-01）**。`apps/worker/src/jobs.ts` の `MORNING_REPORT_JOB` で `aIOutput.create` 成功後に `recordUsageEventCore`（`@hokko/db`）を呼び `ai.output.generated`（billing=usage_only・category=ai・sourceType=AIOutput・sourceId=aIOutput.id・actorType=system・metadata=task/source のみ）を記録。**emit 対象は 上記7種類 + worker 朝礼AI出力の8種類／他 jobType emit なし／既存7 emit・usage.ts・outbox.ts・jobrun.ts・apps/web helper 不変／metadata に output 本文・金額・secret・実ID を入れない／二重計上なし（apps/web の AIOutput とは別 id・saveAIOutputStandard 非経由）／skipped・create前失敗は emit しない／実 worker 実行・実AI実行・外部送信なし／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・package・lock 変更なし**。

- Phase 1-41「worker EXPORT_JOB trigger / UsageEvent emit可否監査（docs-only）」: `87635bb` push 済み・**本番確認不要（docs-only・コード挙動不変）**。`docs/audit/20_export_job_trigger_audit.md` 作成＋doc15 §31＋本ファイル。**監査のみ／実装なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・package・lock 変更なし**。実コード監査の結論: `EXPORT_JOB` は `apps/worker/src/jobs.ts` の handler+JOB_NAMES のみで **`queue.add('EXPORT_JOB')` が存在せず未到達（dead）**。apps/web にも enqueue 経路なし。実利用のエクスポート（LeadMap export/admin export）は apps/web の `export.generated` で計測済み＝計測漏れではない。**判定 HOLD**（未到達・本番確認不可）。

- Phase 1-42「UsageEvent 可視化・集計の安全設計（docs-only）」: `docs/audit/21_usage_event_visualization_design.md` 作成＋doc15 §32＋本ファイル。**設計のみ／実装なし／emit 追加なし／UI・API・dashboard 実装なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・package・lock 変更なし**。UsageEvent は全 index が tenantId 先頭で集計は tenant スコープが効く・金額カラムなし・現状書き込み専用。安全方針＝tenantId 必須／raw metadata 非表示／金額なし／usage_only は「非課金記録」と明記。**P0 は tenant admin 向け read-only usage summary（audit:read 流用・件数/quantity 合計のみ・raw metadata/sourceId/金額なし）**、実装は Phase 1-43。docs-only 設計記録完了／本番確認不要（docs-only・コード挙動不変）。反映状態は git refs を正とする。

- Phase 1-43「非課金 UsageEvent 利用量サマリー read-only 最小実装」: `apps/web/app/(app)/admin/usage/page.tsx`（read-only 集計ページ）新規＋`apps/web/app/(app)/admin/page.tsx` に `利用量監査 →` リンク1本＋doc15 §33＋本ファイル。**read-only／書き込みなし／Server Action なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／金額なし／schema・migration・RBAC・package・lock 変更なし**。ガード=`requireUser()`＋`hasPermission(user,'audit','read')`（RBAC 定義変更なし）。**tenantId 必須・直近30日**で `groupBy(eventType)`／`groupBy(category)`（件数＋quantity 合計）＋日別は非PIIの2列（occurredAt/quantity）のみ取得しサーバ側でバケツ化。**raw metadata／sourceId／idempotencyKey／actorId／本文／金額（amount/price/currency）を表示しない**。「この画面は請求額を示すものではありません」明記・`usage_only`=「非課金記録」。**本番確認完了（GO・2026-07-01）** — `b08c939`（implementation `ce858c7`）を利用者が Vercel/CI/本番画面で確認（audit:read ガード・tenantId スコープ・raw metadata/sourceId/本文/金額/secret実値非表示・非課金記録表示・emit対象8種類維持）。詳細 doc14 §37 / doc15 §33.1。反映状態は git refs を正とする。

- Phase 1-46「UsageEvent emit matrix の作成（docs-only）」: `docs/audit/usage_event_emit_matrix.md` 新規＋doc15 §34＋`tasks/CURRENT_STATE.md` 次タスク更新＋本ファイル。**実コード監査に基づき UsageEvent emit 8種類を1表（対象/eventType/category/sourceType/発火場所/idempotencyKey方式/metadata固定キー/発火条件/billing=usage_only/本番GO）に固定**。実装なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・package・lock 変更なし。詳細 `docs/audit/usage_event_emit_matrix.md`。役割固定は Phase 1-47・別承認。反映状態は git refs を正とする。

- Phase 1-47「状態管理ドキュメントの役割固定（docs-only）」: `docs/audit/22_docs_role_definition.md` 新規＋doc15 §35＋`tasks/CURRENT_STATE.md` 次タスク更新＋`369-vault/知識/状態管理とドキュメント役割.md`（index からリンク）＋本ファイル。**PROGRESS=履歴／CURRENT_STATE=現在地／emit matrix=一覧の正本／doc14=本番確認／doc15=詳細設計史／369-vault=思想・プロンプト・知識、の役割と更新タイミング・禁止表現（一時状態の永続化禁止・現在HEAD固定値禁止・未確認GO禁止・secret/PII/課金額禁止）を固定**。実装なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・package・lock 変更なし。詳細 `docs/audit/22_docs_role_definition.md`。次は Phase 1-48・別承認。反映状態は git refs を正とする。

- Phase 1-48「Phase 1 最終セキュリティ・権限・非課金監査（read-only＋docs-only）」: `docs/audit/23_phase1_final_security_audit.md` 新規＋doc15 §36＋`tasks/CURRENT_STATE.md` 次タスク更新＋vault ノート＋本ファイル。**6領域を実コード監査し全 PASS／総合 GO**（UsageEvent 8箇所のみ・全件 usage_only リテラル・billable_candidate/never_billable runtime 使用ゼロ／admin/usage ガード・tenantId・最小select／RBAC=AIに外部送信・承認・削除なし／tenant横断・raw viewer なし／外部送信は logged/sent・delivered のみ記録＋EXTERNAL_SEND_ENABLED・承認ゲート／schema・migration は `d14ce1d`（Phase 1-22）以降不変）。旧Phase一時状態遺物4箇所（1-20 バレット＋1-20/1-21B/1-26 状態行）を push 証拠に基づき整合。**コード修正なし／emit 追加なし／課金なし／決済なし**。詳細 `docs/audit/23_phase1_final_security_audit.md`。次は Phase 1-49・別承認。反映状態は git refs を正とする。

- Phase 1-49「Phase 1 完了判定レポート（docs-only）」: `docs/audit/24_phase1_completion_review.md` 新規＋doc15 §37＋`tasks/CURRENT_STATE.md` 次タスク更新＋vault ノート＋本ファイル。**判定 GO（Phase 1 は閉じられる状態）**。証拠＝本番確認GO 12件（doc14 §26〜§37）＋最終監査GO（doc23）＋証拠不足なし。完了済み12項目（証拠付き）／完了を妨げない未着手（実課金・Stripe・cap・横断dashboard・raw viewer・EXPORT_JOB/JobRun HOLD）／Phase 8 送付（実課金・usage billing・credits・cap/alert・billable_candidate/never_billable runtime 運用）／Phase 2/3/4/6/X/Y 送付先を整理。継続安全条件を明記。**実装なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし**。詳細 `docs/audit/24_phase1_completion_review.md`。**Phase 1-50（完了記録・次Phase選定）は別承認**。反映状態は git refs を正とする。

- Phase 1-50「Phase 1 完了記録・次Phase選定（docs-only）」: `docs/audit/25_phase1_completion_record.md` 新規＋doc15 §38＋`tasks/CURRENT_STATE.md` を Phase 1 完了・次Phase=Phase X へ刷新＋vault ノート＋本ファイル。**Phase 1 を正式完了として記録（判定根拠=doc24 GO・完了基準 commit=`e95f887`）**。次Phase は**人間判断で Phase X（短期品質フェーズ）**を選定（最初の候補=Phase X-01「本番スモーク / E2E / 検証基盤整理」・着手は別承認）。**Phase 8（実課金・Stripe・usage billing・credits・cap/alert）には進まない**。実装なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・RBAC・package・lock 変更なし。詳細 `docs/audit/25_phase1_completion_record.md`。反映状態は git refs を正とする。

- Phase X-01「本番スモーク / E2E / 検証基盤整理（read-only棚卸し＋docs-only）」: `docs/audit/26_phase_x01_verification_baseline.md` 新規＋`tasks/CURRENT_STATE.md` 次タスク更新＋vault ノート＋本ファイル。**検証手段の全量を実ファイル読解で固定**（verify.sh 5段／unit 23ファイル／integration 25ファイル（要 Postgres=B-02）／Playwright E2E 12スペック（従来 B-03 でブラウザ不可）／HTTPスモーク（doc14 §10）／CI は Vercel Native Checks のみ・`.github/` なし）。**新発見: 実行環境に Chromium プリインストール済み（PLAYWRIGHT_BROWSERS_PATH）＝B-03 解消の可能性 → E2E 実証を Phase X-02 の最優先候補（P1）に設定**。改善候補5件を優先度付きで整理。**テスト実行なし／コード変更なし／package・lock 変更なし／dependency install なし／DB・schema・migration なし／課金・決済・外部送信なし**。詳細 `docs/audit/26_phase_x01_verification_baseline.md`。Phase X-02 は別承認。反映状態は git refs を正とする。

- Phase X-02「E2E smoke 実行の実証（第1段）」: `docs/audit/27_phase_x02_e2e_smoke_result.md` 新規＋CURRENT_STATE 次タスク更新＋vault ノート＋本ファイル。**初の E2E 実実行**。環境5段（ローカルPostgres起動→migrate deploy→seed→build→server /login 200）**全GREEN**＋プリインストール Chromium のバージョンシム（/opt/pw-browsers 内 symlink・repo無変更）で**ブラウザ起動成功＝B-03 解消を実証**。テストは **smoke 11本全RED** — 根本原因を DOM 実測で特定: `/login` の label に for / input に id が無く `getByLabel` が構造的に不成立（E2E未実行時代からのセレクタ乖離・アクセシビリティ改善余地）。**約束どおりコード・テスト・設定・package 無修正**（red をそのまま記録）。本番DB・外部送信ゼロ・テスト後にサーバ/Postgres停止済み。修正方針（案A=フォーム label 関連付け付与〈推奨候補〉/ 案B=テスト側変更）は Phase X-03・別承認。詳細 `docs/audit/27_phase_x02_e2e_smoke_result.md`。反映状態は git refs を正とする。

- Phase X-RM-01「長期構想統合・Phase 2 ロードマップ作成（docs-only・既存プロンプト非破壊）」: `docs/roadmap/00〜08`（9本）新規＋`docs/audit/28_long_term_strategy_integration.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/長期構想とPhase2ロードマップ.md`（index からリンク）＋本ファイル。**追加採用済み構想17領域を Feature Registry / Safety Boundary Matrix / Human Boundary Matrix / Monetization Matrix / MCP/API Exposure Matrix / Enshin OS Feature Inventory / Automation Level Taxonomy へ非破壊で分類**し、Phase 2 の目的・入口/出口条件・サブフェーズ 2-A〜2-H を設計（出口条件に E2E smoke green 維持を組み込み）。**既存プロンプト・CLAUDE.md・安全ルール・Phase管理は無変更／実装なし／DB・schema・migration なし／課金・決済なし／MCP/API公開なし／外部送信なし／L5以上自動化・ロボット実行・採否/評価/給与判断は future/blocked/human-only と明記／実課金は Phase 8 送付**。doc27 は X-02 使用済みのため監査記録は doc28。Enshin OS 詳細は未提供のため「証拠不足」と記録（推測断定なし）。次は Phase X-RM-02（Phase 2入口レビュー）または Phase X-03（E2E red 最小修正）・別承認。詳細 `docs/audit/28_long_term_strategy_integration.md`。反映状態は git refs を正とする。

- Phase X-RM-02「Roadmap Review / Gap Reconciliation（docs-only）」: `docs/audit/29_phase_x_rm_02_roadmap_review.md` 新規＋roadmap 最小補完＋CURRENT_STATE 更新＋`369-vault/知識/PhaseXRM02ロードマップレビュー.md`（index からリンク）＋本ファイル。**X-RM-01 の roadmap 一式をユーザー提示の追加構想リストと突合**——17領域・代表機能37個・境界9項目は全反映済みで、差分は Gateway 表記1件のみ。**正式表記を IKEZAKI MCP/API Gateway に統一**（旧表記「369 MCP/API Gateway」6箇所を修正・別名として保持）。doc02 §0.1 に**プロンプト必須分類23項目**、doc07 §1 に **Enshin OS 表記ルール**（大文字ENSHIN＋OS禁止・検査は case-sensitive）を明文化。**実装なし／DB・schema・migration なし／課金・決済・外部送信・MCP/API公開なし／既存プロンプト非破壊**。Enshin OS 個別機能は引き続き証拠不足（仕様提供待ち）。次は Phase X-03 または Phase X-RM-03・人間選択・別承認。詳細 `docs/audit/29_phase_x_rm_02_roadmap_review.md`。反映状態は git refs を正とする。

- Phase X-03「E2E smoke green 化（X-03＋X-03b）」: `apps/web/app/login/page.tsx`（label関連付け・X-03）＋`apps/web/tests/e2e/smoke.spec.ts`（地図CRMセレクタ1行明確化・X-03b）＋`docs/audit/30_phase_x03_e2e_green.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX03E2EGreen化.md`（index からリンク）＋本ファイル。**smoke 0/11 → 10/11 → 11/11 green（初の全green・9.1s）**。red の原因は2つ（アプリ側 label 関連付け欠如／テスト側セレクタ曖昧性）で、それぞれ正しい側を最小修正。test 211・typecheck・lint・build 全green。**schema・migration作成・認証・RBAC・課金・決済・外部送信・package/lock・playwright install: すべてなし／本番接触ゼロ**。E2E は Phase 2 出口条件（smoke green 維持）を支える回帰ゲートとして稼働開始。次は Phase X-04 または Phase X-RM-03・別承認。詳細 `docs/audit/30_phase_x03_e2e_green.md`。反映状態は git refs を正とする。

- Phase X-RM-03「Phase 2入口条件の最終確定・Phase 2-A準備メモ（docs-only）」: `docs/audit/31_phase_x_rm_03_phase2_entry_review.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseXRM03Phase2入口条件.md`（index からリンク）＋本ファイル。**入口条件4項目を証拠付きで判定 — 条件1〜3 GO（smoke 11/11 green=doc30／roadmap main反映＋突合=doc29／安全境界12項目維持）・条件4 HOLD（Phase 2-A 個別人間承認は未取得）。総合=入口レビュー READY・GO、Phase 2-A 実装は HOLD until human approval**。Phase 2-A 準備メモ（Company Brain 5テーブル候補・安全設計・三段承認・禁止7項目）を承認材料として整備。**実装なし／DB・schema・migration なし／課金・決済・外部送信なし／package/lock 変更なし**。次は人間判断（2-A設計 or X-04 or Enshin資料提供）・別承認。詳細 `docs/audit/31_phase_x_rm_03_phase2_entry_review.md`。反映状態は git refs を正とする。

- Phase X-CLOSE-01「Phase X 完了記録・次アクション整理（docs-only）」: `docs/audit/32_phase_x_completion_record.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX完了記録.md`（index からリンク）＋本ファイル。**Phase X を正式完了として記録（判定 GO・完了基準 commit `70d4d06`）**。6タスク全証拠（doc26/27/30/28/29/31）main反映済み・恒久資産11点（E2E回帰ゲート・roadmap 9本・Registry・Matrix群・entry review 等）を整理・残タスク送り先（2-A=人間の個別承認待ち／X-04=任意候補／Enshin=資料待ち／Phase 8=凍結継続）を固定。**実装なし／DB・schema・migration なし／課金・決済・外部送信なし／package/lock 変更なし／Phase 2 実装には進んでいない**。詳細 `docs/audit/32_phase_x_completion_record.md`。反映状態は git refs を正とする。

- Phase 2-A-1「Company Brain schema 設計 docs（docs-only）」: `docs/audit/33_phase2a_company_brain_schema_design.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2ACompanyBrain設計.md`（index からリンク）＋本ファイル。**Phase 2 の最初の作業＝設計案のみ**。CompanyPolicy＋ProductCatalogItem の2テーブル先行案（PII近接3テーブルは後続）・既存 schema/rbac/labels の read-only 実測に基づく整合設計・機密ラベル既存流用・externalAiAllowed 既定false・knowledge 権限流用（AIは参照のみ）・監査/seed/E2E/migration三段承認の段取りを固定。**schema.prisma 無変更／migration なし／DB操作なし／コード実装なし／課金・決済・外部送信・MCP/API公開なし**。次は Phase 2-A-2（schema変更承認）・別承認。詳細 `docs/audit/33_phase2a_company_brain_schema_design.md`。反映状態は git refs を正とする。

- Phase 2-A-2「Company Brain schema 変更・migration 作成」: `schema.prisma` に CompanyPolicy / ProductCatalogItem の2モデル追加＋migration `phase2a_company_brain` 1本＋`docs/audit/34_phase2a2_schema_change.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A2Schema変更.md`（index からリンク）＋本ファイル。**Phase 1-22 以来初の schema 変更を、人間判断5点全遵守・破壊的操作ゼロ（migration 全文検査）・検証全green（test 211／typecheck／lint／build／smoke 11本 green 維持）で完了**。既存195モデル・RBAC・labels 無変更＝AIは新テーブルを読めるが書けない状態を維持。ローカルDBのみ・本番接触ゼロ。**seed・UI・Server Action・API・E2E追加は未実装（2-A-3 別承認）／課金・決済・外部送信なし**。詳細 `docs/audit/34_phase2a2_schema_change.md`。反映状態は git refs を正とする。

- Phase 2-A-2-PROD「Company Brain schema 変更の本番確認記録（docs-only）」: `docs/audit/35_phase2a2_production_confirmation.md` 新規＋doc14 §38 追記＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A2本番確認.md`（index からリンク）＋本ファイル。**commit `ca18450` の本番反映を利用者実測で確認し GO を記録（2026-07-02）**: Vercel Ready / build green・latest commit ca18450・既存画面すべて OK・Company Brain UI 未実装は正常。**AI が本番接続確認したものではない**。コード変更なし・DB操作なし・schema/migration 変更なし・課金・決済・外部送信なし。次は Phase 2-A-3 または Phase X-04・別承認。詳細 `docs/audit/35_phase2a2_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-A-3a-PROD「Company Brain read-only 可視化の本番確認記録（docs-only）」: `docs/audit/37_phase2a3a_production_confirmation.md` 新規＋doc14 §39 追記＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A3a本番確認.md`（index からリンク）＋本ファイル。**commit `9533488` の本番確認は利用者実測で HOLD（2026-07-03）**: Vercel Ready・latest commit 9533488・ログイン／ダッシュボード／既存主要画面すべて正常＝無回帰確認、ただし**ナビ「会社の頭脳」と /brain/policies・/brain/catalog が本番未確認/NG のため GO にしない**。repo側 read-only 実測でコード欠落説・flag/ナビ権限フィルタ説は否定済み（残候補: 本番エイリアス/キャッシュ/確認手順/症状未特定）。**AI が本番接続確認したものではない**。本番確認GO済み基準は Phase 2-A-2/`ca18450` のまま。コード変更なし・DB操作なし・schema/migration 変更なし・課金・決済・外部送信なし。次は read-only 原因調査（別ミッション）・**Phase 2-A-3b は HOLD 解消まで進まない**。詳細 `docs/audit/37_phase2a3a_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-A-3b-1「CompanyPolicy 書き込み最小実装（作成・編集・アーカイブ）」: `apps/web/app/(app)/brain/policies/actions.ts` 新規（create/update/archive の3 Server Action・requireUser→hasPermission（knowledge:create/update）→入力検証→tenantIdスコープ→prisma→writeAudit→revalidatePath）＋`new/page.tsx`・`[id]/edit/page.tsx` 新規＋一覧に権限別ボタン追加＋smoke 末尾1本追加（作成→一覧反映）＋`docs/audit/39_phase2a3b1_company_policy_write.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A3b1CompanyPolicy書き込み.md`（index からリンク）＋本ファイル。**検証全green（test 211・typecheck・lint・build・migrate deploy pendingなし・seed policies:5/catalogItems:8・smoke 13/13 green・既存12本回帰なし・修正ループ0回）**。**物理削除なし（delete/deleteMany 不使用）／externalAiAllowed は UI で true にできない（create は false 固定・update は不変更）／rbac.ts・labels.ts・schema・migration・seed.ts・package/lock 無変更＝AI は knowledge:update を持たず編集・アーカイブ不可のまま／writeDataAccess は次段送り／ProductCatalogItem 書き込みは 2-A-3b-2（別承認）／課金・決済・外部送信・本番接触なし**。詳細 `docs/audit/39_phase2a3b1_company_policy_write.md`。反映状態は git refs を正とする。

- 戦略 Candidate docs 整備「AI Workforce Infrastructure 全体像（docs-only・Candidate）」: `docs/roadmap/09-16`（8ファイル）新規＋CURRENT_STATE 更新＋本ファイル。前回不足の AI社員経済圏・Developer Cloud・Marketplace・PLUG購買・従業員導線・知財moat・Phase 0-26接続を、既存 `docs/roadmap/`（非破壊）に **Candidate** として追加（09 定義8層/4層・10 三系統ロードマップ接続・11 Developer Cloud/Marketplace・12 PLUG/Employee App・13 知財moat・14 Function Master 231-252 Candidates・15 ゼロ広告成長/AI Safety境界・16 GitHub/Obsidian/369-vault役割＋NEXT_ACTIONS/OPEN_RISKS/次回プロンプト）。**GitHub正本・Obsidian閲覧・369-vault直接編集しない・docs/10_obsidian関係は別承認・231-252はCandidate扱い**。**実装なし・schema/migration/RBAC/label定義/company-brain-reference/apps/packages/scripts変更なし・外部送信/実LLM/AIコスト/本番影響なし・369-vault非編集・push なし（commit-only）**。現行 Data Classification / Customer Pain ライン（doc105-114）は正のまま。次は 戦略docs push-only（別承認）または現行ライン継続。反映状態は git refs を正とする。

- Customer Pain schema設計「最小schema候補のdocs-only（判定 READY / GO）」: `docs/audit/114_customer_pain_schema_design_docs_only.md`（doc114）新規＋CURRENT_STATE 更新＋`369-vault/知識/CustomerPainスキーマ設計.md`（index からリンク）＋本ファイル。doc113（候補C前提設計）を受け、本実装に必要になり得る**最小schema候補を紙で設計**（**schema変更なし・migrationなし・schema.prisma変更なし**）。候補フィールド（id/tenantId/title/body/category/severity/status/label/archivedAt/createdAt/updatedAt/createdByUserId/updatedByUserId）を列の意味・PII注意・一覧/詳細可否・writeAudit/writeDataAccess対象で整理。**入れてはいけない列**（customerName/contactName/phone/email/address/raw*Text/rawTranscript/sourceUrl/externalAiAllowed/publishStatus/publicUrl/seoSlug/customerVoice/customerId）を明記。**customerIdは結合リスクで別承認・enum化も別承認**。tenantId必須・archivedAtソフトアーカイブ（物理削除なし）・createdBy/updatedByはuserId参照のみ。標準閲覧式（doc110）を使う前提候補だが**実接続はまだしない**。**AIに読ませない・公開なし（externalAiAllowed/publishStatusなし）**。**3案比較→推奨案A（NO_SCHEMA_CHANGE_AND_DESIGN_ONLY）**。事前停止条件を固定。read-only安全確認 `node scripts/check-company-brain-safety.mjs` exit 0。**解禁なし・Customer Pain本実装/runtime実装0・schema/migration/RBAC/label定義変更なし・company-brain-reference変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc114 push-only**（別承認）→ schema実装可否判断 または品質基盤強化。詳細 `docs/audit/114_customer_pain_schema_design_docs_only.md`。反映状態は git refs を正とする。

- Customer Pain 候補C 前提設計「schema/migration前のdocs-only（判定 READY / GO）」: `docs/audit/113_customer_pain_candidate_c_prerequisite_design.md`（doc113）新規＋CURRENT_STATE 更新＋`369-vault/知識/CustomerPain候補C前提設計.md`（index からリンク）＋本ファイル。doc112（まだruntime解禁しない）を受け、候補C（Customer Pain schema/画面/Server Action/writeDataAccess/writeAudit 実接続）へ進む前の前提を設計。**候補Cは schema/migration を伴うため最も重く別の重い人間承認**。schema要否＝実装するなら最終的に必要だが**今回は決めない（schema変更なし・migrationなし）**・必要と判明したら停止して別承認。最小schema候補は方向性のみ（PII/顧客名/担当者名なし・**customerId参照は別承認**・本文に実顧客情報を複製しない・archivedAt前提・tenantId必須・labelはCUSTOMER_CONFIDENTIAL前提候補だがruntime解禁はまだ）。画面＝一覧プレースホルダ・詳細は候補Aの標準閲覧式を満たす人間のみ・詳細のたび**writeDataAccess**。書き込み＝create/update/archiveのみ・物理削除なし・restore/label変更/customerId変更は別承認・**writeAudit**必須。**AIに読ませない・公開なし（externalAiAllowed/publishStatus UIなし）**。事前停止条件（schema/migration/RBAC/label定義変更・customerId参照・PII保存・AI参照・公開導線・本番確認）を固定。**推奨は案A（候補C schema設計docs-only・schema変更/migrationはしない）**／案B品質基盤／案C保留。read-only安全確認 `node scripts/check-company-brain-safety.mjs` exit 0。**解禁なし・Customer Pain本実装/runtime実装0・schema/migration/RBAC/label定義変更なし・company-brain-reference変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc113 push-only**（別承認）→ Customer Pain schema設計docs-only または品質基盤強化。詳細 `docs/audit/113_customer_pain_candidate_c_prerequisite_design.md`。反映状態は git refs を正とする。

- 高機密ラベル実装・解禁 可否判断（候補A+B完了後）「まだ runtime 解禁しない（docs-only・判定 GO）」: `docs/audit/112_high_confidential_label_enablement_decision_after_candidate_ab.md`（doc112）新規＋CURRENT_STATE 更新＋`369-vault/知識/高機密ラベル実装解禁可否判断候補AB完了後.md`（index からリンク）＋本ファイル。候補A（doc110）＋候補B（doc111）完了を受け、人間が **DO_NOT_ENABLE_RUNTIME_YET_AFTER_CANDIDATE_AB＝候補A+B完了でもまだ runtime 解禁しない** を正式決定。**§0 12項目すべて安全側**（CANDIDATE_A_AND_B_COMPLETED_AS_SAFETY_FOUNDATION／CANDIDATE_C=REQUIRE_SEPARATE_HEAVY_APPROVAL_BECAUSE_SCHEMA_AND_MIGRATION／NEXT_PATH=PREPARE_CANDIDATE_C_PREREQUISITE_DESIGN_DOCS_ONLY_OR_QUALITY_FOUNDATION／DO_NOT_IMPLEMENT_CUSTOMER_PAIN_NOW／NO_SCHEMA_CHANGE_NOW／NO_MIGRATION_NOW／NO_RBAC_CHANGE_NOW／NO_LABEL_DEFINITION_CHANGE_NOW／PROHIBIT_AI_REFERENCE_AND_NO_COMPANY_BRAIN_REFERENCE_CHANGE／PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW／DOCS_ONLY_NOW）。**候補A+B完了は安全の土台であって解禁条件ではない**。**推奨は案A（候補C前提設計docs-only・本実装ではない）／案B品質基盤／案C保留**。read-only安全確認 `node scripts/check-company-brain-safety.mjs` exit 0。**解禁なし・Customer Pain runtime実装0・schema/migration/RBAC/label定義変更なし・company-brain-reference変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc112 push-only**（別承認）→ 候補C前提設計docs-only または品質基盤強化。詳細 `docs/audit/112_high_confidential_label_enablement_decision_after_candidate_ab.md`。反映状態は git refs を正とする。

- 高機密ラベル 安全ゲート静的検査 実装「候補B＝check-company-brain-safety 拡張（実行時機能なし・判定 GO）」: `docs/audit/111_high_confidential_label_static_safety_gate.md`（doc111）新規＋`scripts/check-company-brain-safety.mjs` 拡張（末尾追記・既存ゲート不変）＋CURRENT_STATE 更新＋`369-vault/知識/高機密ラベル安全ゲート静的検査.md`（index からリンク）＋本ファイル。doc110 候補A の守りが後退したら機械検知: **標準閲覧式5条件（tenantId × knowledge:update=canForRoles × canAccessLabel × AIロール除外=isHumanUser × archivedAt null）消失FAIL・OR緩和(`||`)混入FAIL・CUSTOMER_PAIN_LABEL=CUSTOMER_CONFIDENTIAL固定・CUSTOMER_PAIN_DENY_REASONS維持・否定系テスト維持・apps配下へのCustomerPain runtime混入FAIL・company-brain-referenceへのCustomerPain注入FAIL・schema/labelsのCUSTOMER_CONFIDENTIAL各2件不変**。既存の externalAiAllowed/publishStatus はグローバル禁止せず（Customer Pain固有トークンのみ・node_modules等除外）。**検証 green（safety exit 0＝actions4/ui156・pnpm test 265・typecheck 0・lint 0）＋負例でFAILを確認（no-opでない）**。build未実施（.mjs+docs/tasks/vaultのみ・apps runtime不変・理由 doc111 §5）。**解禁なし・Customer Pain runtime実装0・schema/migration/RBAC/label定義変更なし・company-brain-reference変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc111 push-only**（別承認）→ 高機密ラベル実装・解禁の可否判断（まだ解禁しない選択も可）。詳細 `docs/audit/111_high_confidential_label_static_safety_gate.md`。反映状態は git refs を正とする。

- 高機密ラベル閲覧判定の純粋関数 実装「候補A＝標準閲覧式の純粋関数＋否定系テスト（packages/shared のみ・判定 GO）」: `docs/audit/110_high_confidential_label_access_predicate_implementation.md`（doc110）新規＋`packages/shared/src/customer-pain-access.ts` 新規＋`packages/shared/src/__tests__/customer-pain-access.test.ts` 新規＋`packages/shared/src/index.ts` に export 1行＋CURRENT_STATE 更新＋`369-vault/知識/高機密ラベル閲覧判定純粋関数実装.md`（index からリンク）＋本ファイル。doc109 候補A のみを実装: **canViewCustomerPainDetail（tenantId × knowledge:update × canAccessLabel(CUSTOMER_CONFIDENTIAL) × AIロール除外=isHumanUser × archivedAt null の AND・OR緩和禁止）**＋**evaluateCustomerPainAccess（拒否理由は安全な列挙値のみ）**。**AIロール除外は既存 isHumanUser を再利用（重複実装なし）・canForRoles/canAccessLabel も既存利用＝RBAC定義・label定義は変更しない**。**Prisma import なし・DB非依存・apps/web非参照・company-brain-reference非参照**。否定系テスト9ケース（tenant/権限/label/AIロール混在/archived/allowed/OR緩和なし/安全な理由列挙）。**検証 green（pnpm test 265＝既存256+9・回帰なし／typecheck exit 0／lint exit 0）・build 未実施（純粋関数のみ・typecheckで全ワークスペース型検査済み・理由 doc110 §8）**。**writeDataAccess/writeAudit 実接続なし・Customer Pain画面/Server Action/schema/migrationなし・解禁なし・AI参照条件変更なし・company-brain-reference変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc110 push-only**（別承認）→ 候補B 実装可否判断。詳細 `docs/audit/110_high_confidential_label_access_predicate_implementation.md`。反映状態は git refs を正とする。

- 高機密ラベル運用 最小実装設計「範囲・順序・停止条件・安全ゲート・否定系テストの整理（docs-only・判定 READY / GO）」: `docs/audit/109_high_confidential_label_minimum_implementation_design.md`（doc109）新規＋CURRENT_STATE 更新＋`369-vault/知識/高機密ラベル最小実装設計.md`（index からリンク）＋本ファイル。doc108 の決定（DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN）に基づき、将来の最小実装を **A（純粋権限判定関数 isHumanUser/canViewCustomerPainDetail ＋ 否定系テスト・schema/migration不要）／B（安全ゲート静的検査）／C（Customer Pain schema・画面・Server Action 本実装）** に分割。**A+B を先に紙で設計し、schema/migration が必要な C は別の重い人間承認へ送る**方針を推奨。**標準閲覧式（tenantId × knowledge:update × canAccessLabel × AIロール除外=isHumanUser × archivedAt null × writeDataAccess 記録可能の AND）・writeDataAccess / writeAudit の記録粒度（本文・PII を入れない）・安全ゲート14種・否定系テスト15種・事前停止条件**を doc105 から継承・整理。**本書は設計のみで A・B の実装もさらに別承認**。**解禁なし・実装なし・Customer Pain実装なし・schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・company-brain-reference変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc109 push-only**（別承認）→ 候補A+B の実装可否判断。詳細 `docs/audit/109_high_confidential_label_minimum_implementation_design.md`。反映状態は git refs を正とする。

- 高機密ラベル解禁可否 方針決定「DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN＝まだ解禁しない（docs-only・判定 GO）」: `docs/audit/108_high_confidential_label_enablement_policy_decision.md`（doc108）新規＋CURRENT_STATE 更新＋`369-vault/知識/高機密ラベル解禁可否方針決定.md`（index からリンク）＋本ファイル。doc107 の3案・§0候補を受け、人間が **案A（DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN）** を正式決定＝まだ解禁せず次は高機密ラベル運用の**最小実装設計 docs-only** に進む。**§0 10項目すべて安全側決定**（NO_RUNTIME_ENABLEMENT_NOW / CUSTOMER_CONFIDENTIAL_ONLY_LATER / TENANT_KNOWLEDGE_UPDATE_LABEL_HUMAN_AND_ONLY / WRITE_DATA_ACCESS_REQUIRED_LATER / WRITE_AUDIT_REQUIRED_LATER / PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW / PROHIBIT_AI_REFERENCE / PROHIBIT_PUBLIC_USE / DOCS_ONLY_NOW）。承認範囲は docs-only の方針決定記録のみ。**実装なし・解禁なし・Customer Pain実装なし・Data Classification実装なし・DB/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・company-brain-reference変更なし・PII/実顧客データ保存なし・外部公開なし・本番確認なし・push なし（commit-only）**。Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc108 push-only**（別承認）→ 高機密ラベル運用の最小実装設計 docs-only。詳細 `docs/audit/108_high_confidential_label_enablement_policy_decision.md`。反映状態は git refs を正とする。

- 高機密ラベル実装・解禁 可否判断 前提整理「Customer Pain 実装前の重い人間判断に向けた整理（docs-only・判定 READY / GO）」: `docs/audit/107_high_confidential_label_enablement_decision_prerequisite.md`（doc107）新規＋CURRENT_STATE 更新＋`369-vault/知識/高機密ラベル解禁可否判断前提整理.md`（index からリンク）＋本ファイル。doc106 の番号体系に従い **Audit Doc 107 / Product Phase=Data Classification / Security Governance / Lineage=Data Classification / High Confidential Label / Stage=Enablement Decision Prerequisite** を明記。doc105 の**標準閲覧式・安全ゲート・否定系テスト**を判断材料として利用。**3案比較**（案A=DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN・**推奨**／案B=ENABLE_NARROW_SCOPE_AFTER_SEPARATE_APPROVAL／案C=DO_NOT_ENABLE_AND_PRIORITIZE_QUALITY_FOUNDATION）＋**§0 人間決定候補10項目**（推奨すべて安全側）。**解禁なし・実装なし・Customer Pain 実装なし・schema / migration / RBAC / label定義変更なし・AI参照条件変更なし・PII保存なし・実顧客データ保存なし・push なし（commit-only）**。Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc107 push-only**（別承認）→ 解禁可否の §0 人間決定。詳細 `docs/audit/107_high_confidential_label_enablement_decision_prerequisite.md`。反映状態は git refs を正とする。

- Phase番号体系・Lineage整理「audit番号とProduct Phaseを分けて読むための正本化（docs-only・判定 READY / GO）」: `docs/audit/106_phase_numbering_lineage_governance.md`（doc106）新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase番号体系とLineage整理.md`（index からリンク）＋本ファイル。**audit番号=時系列証拠番号・Product Phase=ロードマップ上の意味・Lineage=機能ごとの流れ・Stage=作業種類・commit hash=Git正本状態**の5軸を分離し、「連番が揃わないように見える理由」を明文化。今後は Audit Doc / Product Phase / Lineage / Stage / Baseline Commit / Current HEAD / Next Action を併記するテンプレートを制定。主要 Lineage（Company Brain / CaseStudyConsent / Customer Pain / AI Reference / Public Use / Data Classification）を短整理し、Customer Pain Lineage は doc101〜doc106 を明細化。**既存docs改名なし・HOLD記録削除なし・frontmatter一括適用なし・docs/10_obsidian と 369-vault の関係は別承認・369-vault構造変更なし**。ObsidianではLineage別に見る。実装/DB/schema/migration/RBAC/label定義/AI参照条件/company-brain-reference 変更なし・**push なし（commit-only）**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc106 push-only**（別承認）。詳細 `docs/audit/106_phase_numbering_lineage_governance.md`。反映状態は git refs を正とする。

- Customer Pain 高機密ラベル運用 詳細設計「標準閲覧式・記録粒度・安全ゲート・否定系テスト（docs-only・判定 READY / GO）」: `docs/audit/105_customer_pain_high_confidential_label_operation_detail_design.md`（doc105）新規＋CURRENT_STATE 更新＋`369-vault/知識/CustomerPain高機密ラベル運用詳細設計.md`（index からリンク）＋本ファイル。doc104 決定を実装可能な粒度へ詳細化: **標準閲覧式＝tenantId × knowledge:update × label許可ロール（canAccessLabel）× AIロール除外（isHumanUser）× archivedAt null × writeDataAccess 記録可能の AND 交差**（擬似コード固定・label単独不十分＝labels.ts の既存許可ロールに AI/STAFF が含まれるため）／一覧=非許可者プレースホルダのみ・顧客名/失注理由本文を出さない／詳細=許可判定前に本文非取得候補・**閲覧のたび writeDataAccess**（本文・PII・顧客名・担当者名は記録禁止）／**書き込み writeAudit 必須**（restore・label変更・customerId紐づけ変更は別承認）／**安全ゲート候補14種**（守り消失FAIL＋封印破りFAIL）／**否定系テスト候補15種**／**実装時の事前停止条件16項目**。**高機密ラベル解禁なし・Customer Pain 実装なし・code/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・customerId 参照のみ（実装も別承認）・外部送信なし**。docs-only・doc14 変更なし・**push なし（commit-only）**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc105 push-only**（別承認）→ 高機密ラベル実装・解禁の可否判断（個別人間承認）。詳細 `docs/audit/105_customer_pain_high_confidential_label_operation_detail_design.md`。反映状態は git refs を正とする。

- Customer Pain Data Classification 方針決定「§0 12項目の安全側正式決定・高機密ラベル解禁なし（docs-only・判定 GO）」: `docs/audit/104_customer_pain_data_classification_policy_decision.md`（doc104）新規＋CURRENT_STATE 更新＋`369-vault/知識/CustomerPainデータ分類方針決定高機密ラベル解禁なし.md`（index からリンク）＋本ファイル。doc103 §20 の §0 人間決定12項目を**すべて安全側で正式決定**（CUSTOMER_CONFIDENTIAL_AS_PREREQUISITE_DESIGN_ONLY／DO_NOT_ENABLE_HIGH_CONFIDENTIAL_LABEL_YET／TENANT_AND_KNOWLEDGE_UPDATE_AND_LABEL_ROLE_AND／REQUIRE_WRITE_DATA_ACCESS_DESIGN／KEEP_WRITE_AUDIT_REQUIRED／PROHIBIT_PII_STORAGE_NOW／CUSTOMER_ID_REFERENCE_ONLY_LATER／PROHIBIT_AI_REFERENCE_NOW／PROHIBIT_PUBLIC_USE／REQUIRE_SAFETY_GATE_DESIGN_BEFORE_IMPLEMENTATION／REQUIRE_NEGATIVE_TEST_DESIGN_BEFORE_IMPLEMENTATION／DOCS_ONLY_NOW）。値名と doc103 候補名の差分は**すべて同義または安全側に厳格化**（doc104 §2 対応表・意味変更なし）。決定＝現状維持（Pain 実装 0件・封印維持・ラベル定義不変を read-only 監査で確認）のため**実装不要・コード差分ゼロ**。**高機密ラベル解禁なし・Customer Pain 実装なし・DB/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・PII/顧客名/実顧客データ保存なし・外部送信なし**。docs-only・doc14 変更なし・**push なし（commit-only）**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc104 push-only**（別承認）→ 高機密ラベル運用の詳細設計（docs-only・別承認・解禁ではない）。詳細 `docs/audit/104_customer_pain_data_classification_policy_decision.md`。反映状態は git refs を正とする。

- Customer Pain Data Classification / 高機密ラベル運用設計「守り方の設計（docs-only・判定 READY / GO）」: `docs/audit/103_customer_pain_data_classification_high_confidential_label_design.md`（doc103）新規＋CURRENT_STATE 更新＋`369-vault/知識/CustomerPainデータ分類高機密ラベル運用設計.md`（index からリンク）＋本ファイル。read-only 監査で**中心論点を実測**: labels.ts の CUSTOMER_CONFIDENTIAL 許可ロールに AI_AGENT・AI_ASSISTANT・STAFF が含まれる（CRM 用の既存設計）＝**ラベル単独では守りが不足** → **閲覧は knowledge:update＋label許可ロール＋AIロール除外の3条件 AND 交差**を標準式候補に固定（RBAC・label 定義は変更しない）。**CUSTOMER_CONFIDENTIAL 既定候補**・一覧プレースホルダ／詳細のみ閲覧・**閲覧のたび writeDataAccess（既存 helper 流用・9箇所の使用実績あり）・書き込み writeAudit 必須**・本文への PII/顧客名複製禁止方向・customerId 参照のみ候補・**AIに読ませない**（company-brain-reference 非追加を機械検査候補）・**公開しない**・安全ゲート5種＋否定系テスト7種＋実装前承認ゲート（設計→§0→**高機密ラベル解禁の個別人間承認**→実装→本番確認）＋**§0 候補12項目**＋段階9案。**高機密ラベル解禁は未実施・Customer Pain 実装は未着手・DB/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・PII保存なし・外部送信なし**。docs-only・doc14 変更なし・push なし（commit-only）。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc103 push-only**（別承認）→ Data Classification の §0 人間決定。詳細 `docs/audit/103_customer_pain_data_classification_high_confidential_label_design.md`。反映状態は git refs を正とする。

- Customer Pain 方針決定「HIGH_CONFIDENTIAL_PREREQUISITE_FIRST＝守り方が先 の正式決定（docs-only・判定 GO）」: `docs/audit/102_customer_pain_policy_decision_high_confidential_prerequisite.md`（doc102）新規＋CURRENT_STATE 更新＋`369-vault/知識/CustomerPain方針決定高機密ラベル先行.md`（index からリンク）＋本ファイル。doc101 §14 の §0 人間決定9項目を**すべて安全側で正式決定**（**HIGH_CONFIDENTIAL_PREREQUISITE_FIRST**・REQUIRE_CUSTOMER_CONFIDENTIAL_LABEL_DESIGN・PROHIBIT_PII_NOW・PROHIBIT_CUSTOMER_NAME_NOW・PROHIBIT_AI_REFERENCE_NOW・PROHIBIT_PUBLIC_USE・KNOWLEDGE_UPDATE_ONLY_OR_HIGHER・REQUIRE_ACCESS_LOG_AND_WRITE_AUDIT_DESIGN・DOCS_ONLY_NOW）: **守り方が先＝Data Classification / 高機密ラベル運用設計が次の前提・Customer Pain 実装はまだ**・**PII/顧客名/実顧客データは保存しない・AIに読ませない・公開しない**。決定＝現状維持（Pain 実装 0件・高機密未解禁・封印維持を read-only 監査で確認）のため**実装不要・コード差分ゼロ**。**DB/schema/migration/RBAC/label 定義変更なし・AI参照条件変更なし・外部送信なし**。docs-only・doc14 変更なし・**push なし（commit-only）**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc102 push-only**（別承認）→ Data Classification / 高機密ラベル運用設計（doc103 候補・別承認・解禁ではない）。詳細 `docs/audit/102_customer_pain_policy_decision_high_confidential_prerequisite.md`。反映状態は git refs を正とする。

- Customer Pain 入口レビュー「高機密ラベル前提整理（docs-only・判定 READY / GO）」: `docs/audit/101_customer_pain_entry_review_high_confidential_prerequisite.md`（doc101）新規＋CURRENT_STATE 更新＋`369-vault/知識/CustomerPain入口レビュー高機密ラベル前提整理.md`（index からリンク）＋本ファイル。read-only 監査（Pain 実装ファイル未存在・ConfidentialityLabel enum に CUSTOMER_CONFIDENTIAL 等定義済みだが Company Brain 系は NORMAL/INTERNAL のみで高機密は保留中=doc39・CRM 側は CUSTOMER_CONFIDENTIAL 既定・AI/公開の封印維持を実測）に基づき入口レビュー固定: **Pain は未解決の生データ（失注理由・クレーム・不満・競合比較）で CaseStudy より高リスク**／**3案比較 → 案A（HIGH_CONFIDENTIAL_PREREQUISITE_FIRST・高機密ラベル・権限・監査・AI禁止の前提設計が先）推奨**（案B=社内下書きから・案C=即実装は非推奨）／**AI は原則参照禁止で開始・公開は PROHIBIT_NOW・PII/顧客名/実顧客データは保存しない**／閲覧は knowledge:update 以上＋ラベル許可ロールの交差を候補・**閲覧も writeDataAccess で記録する設計が必要**／**§0 人間決定候補9項目**（推奨すべて安全側）＋実装段階9案（高機密ラベル解禁は個別人間承認の重い判断）。**Customer Pain 実装なし・DB/schema/migration/RBAC/label 定義変更なし・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・外部送信なし**。docs-only・doc14 変更なし・push なし（commit-only）。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc101 push-only**（別承認）→ Customer Pain の §0 人間決定 → Data Classification / 高機密ラベル設計（doc102 候補・別承認）。詳細 `docs/audit/101_customer_pain_entry_review_high_confidential_prerequisite.md`。反映状態は git refs を正とする。

- CaseStudyConsent 公開活用方針決定「PROHIBIT_NOW＝今は公開しない の正式決定（docs-only・判定 GO）」: `docs/audit/100_case_study_consent_public_use_policy_decision.md`（doc100）新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsent公開活用方針決定.md`（index からリンク）＋本ファイル。doc99 §7 の §0 人間決定10項目を**すべて安全側で正式決定**（**PROHIBIT_NOW**・PURPOSE_NOT_SUFFICIENT_ALONE・APPROVAL_REQUEST_REQUIRED_LATER・HUMAN_REVIEW_AND_FACT_CHECK_REQUIRED・EXPLICIT_PERMISSION_REQUIRED・EVIDENCE_REQUIRED_AND_APPROVAL・CUSTOMER_VOICE_PURPOSE_AND_APPROVAL_REQUIRED・TAKEDOWN_REQUIRED_LATER・NO_PR_SEO_SNS_NOW・DOCS_ONLY_NOW）: **今は公開しない**・**公開系 purpose は単独では公開条件にならない**・**ApprovalRequest・表現審査・公開前人間承認・取り下げ運用が将来前提**。決定＝現状（公開機能ゼロ・非公開固定）と完全一致のため**実装不要・コード差分ゼロ**（read-only 監査で確認）。**AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・外部送信なし**。code/schema/migration/package/doc14 変更なし・**push なし（commit-only）**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc100 push-only**（別承認）→ Customer Pain / Stage 2・3・★2・UX / 品質基盤強化。詳細 `docs/audit/100_case_study_consent_public_use_policy_decision.md`。反映状態は git refs を正とする。

- CaseStudyConsent 公開活用判断 前提整理「導入事例・PR・SEO・顧客の声公開の条件設計（docs-only・判定 READY / GO）」: `docs/audit/99_case_study_consent_public_use_policy_design.md`（doc99）新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsent公開活用前提整理.md`（index からリンク）＋本ファイル。read-only 監査（公開系 UI ゼロ実測=`pr` 部分一致は既存 print のみと特定・AI参照条件は doc98 決定済み・封印 UI 0件）に基づき前提整理: **公開活用は未実装のまま・3案比較 → 案A（PROHIBIT_NOW_AND_DESIGN_GATES・今は公開せず関門要件だけ固定）推奨**。**external_publish / pr / seo / customer_voice purpose は単独では公開条件にならない**（必要条件であって十分条件ではない）。**ApprovalRequest・表現審査・公開前人間承認・取り下げ運用・根拠確認が将来前提**。**恒久禁止を明文化**（AI虚偽口コミ・実体験でない体験談・根拠なし成果数値/No.1表記・ステマ・PR/SEO/SNS の自動実行）。**§0 人間決定候補10項目**（推奨すべて安全側）＋段階9案。**AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・外部送信なし**。docs-only・code/schema/migration/seed/package/doc14 変更なし・push なし（commit-only）。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は **doc99 push-only**（別承認）→ 公開活用の §0 人間決定（今は進めない前提）。詳細 `docs/audit/99_case_study_consent_public_use_policy_design.md`。反映状態は git refs を正とする。

- CaseStudyConsent AI参照条件決定「KEEP_ANONYMIZED_TRUE_ONLY 維持（docs-only・判定 GO）」: `docs/audit/98_case_study_consent_ai_reference_policy_decision.md`（doc98）新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsentAI参照条件決定.md`（index からリンク）＋本ファイル。doc97 の §0 人間決定9項目を**すべて安全側で正式決定**（KEEP_ANONYMIZED_TRUE_ONLY / ANONYMIZED_TRUE_ONLY / DO_NOT_INJECT / NOT_SUFFICIENT_ALONE / STRUCTURAL_ZERO / NO_NEW_AI_COST / KEEP_EXISTING_AI_REFERENCE_LOG / KEEP_CURRENT_NON_INJECTION_GATE / DOCS_ONLY_NOW）: **AIが読む事例は anonymized=true のみ**を維持・**anonymized=false は AI 参照対象外**・**CaseStudyConsent は AI 文脈へ注入しない**・**ai_reference purpose は単独では解禁条件にしない**・**外部LLM送信なし・AIコストなし**。決定＝現状維持のため**実装不要・company-brain-reference 変更なし・コード差分ゼロ**（read-only 監査で決定と現状実装の完全一致を確認）。将来の変更は doc97 §8 の段階承認が前提。docs-only・code/schema/migration/seed/package/doc14 変更なし・push なし（commit-only）。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は doc98 push（別承認）→ 公開活用判断 / Customer Pain / Stage 2・3・★2・UX / 品質基盤強化。詳細 `docs/audit/98_case_study_consent_ai_reference_policy_decision.md`。反映状態は git refs を正とする。

- CaseStudyConsent AI参照条件設計「ai_reference purpose と anonymized=false の扱い（docs-only・判定 READY / GO）」: `docs/audit/97_case_study_consent_ai_reference_policy_design.md`（doc97）新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsentAI参照条件設計.md`（index からリンク）＋本ファイル。read-only 監査（AI参照は `anonymized: true` のみ=line 110 実測・select に consent系なし・CaseStudyConsent 注入 0件・非注入/条件維持の機械検査稼働）に基づき設計固定: **3案比較 → 案A（KEEP_ANONYMIZED_TRUE_ONLY・現状維持）推奨**（AIが読む顧客事例は今後も匿名化済みのみ・解禁ゼロ・実装変更ゼロ）／案B=DERIVED_ANONYMIZED_SUMMARY_ONLY（人間承認済み匿名化要約のみ将来候補）／案C=RESTRICTED_REALNAME_AI_REFERENCE_LATER（現時点非推奨）。**不変事項を固定**: ai_reference purpose は単独では解禁条件にしない（NOT_SUFFICIENT_ALONE）・台帳行・証跡・purpose は AI 文脈へ注入しない（DO_NOT_INJECT）・外部LLM送信は構造的ゼロ（STRUCTURAL_ZERO）・AIコスト発生なし。**§0 人間決定候補9項目**（推奨すべて安全側）＋段階案。**AI参照条件変更なし・company-brain-reference 無変更・anonymized=false 未解禁**。docs-only・code/schema/migration/seed/package/doc14 変更なし・push なし（commit-only）。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。次は doc97 push（別承認）→ **AI参照条件の §0 人間決定**（案A なら実装不要=決定の記録のみ）。詳細 `docs/audit/97_case_study_consent_ai_reference_policy_design.md`。反映状態は git refs を正とする。

- CaseStudyConsent anonymized=false 本格扱い-PROD「表示統治の本番確認記録（docs-only・判定 GO）」: `docs/audit/96_case_study_consent_anonymized_false_policy_production_confirmation.md`（doc96）新規＋doc14 §60 追記＋CURRENT_STATE 基準昇格＋`369-vault/知識/CaseStudyConsent匿名化オフ本格扱い本番確認.md`（index からリンク）＋本ファイル。**利用者実測（2026-07-05・チャット提出・NG/不明 0件）**: **Vercel Ready**・latest commit `611e51e`・**build/CI green**・本番ログイン OK・既存主要画面無回帰・**実名寄り1周**（架空・匿名事例作成→internal_view の有効な台帳登録→匿名化オフ保存が通る→一覧に「実名寄り（許諾あり）」「**AI参照対象外**」「**外部公開不可**」バッジ→「自動では匿名化に戻りません」注意→**匿名化に戻して片付け**（アーカイブ））・封印 UI 3種なし・本番DB直接接続なし（※編集権限なしユーザーの「閲覧制限」表示は確認用ユーザーなしのため未実測=Unknowns・GO 阻害ではない）。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**（申告値をそのまま記録）。**判定 GO＝本番確認GO済みプロダクト基準を CaseStudyConsent 保存条件接続 / `5e9461f` → CaseStudyConsent anonymized=false 本格扱い / `611e51e` へ昇格**（前基準は歴史的保持）。**anonymized=false 未解禁（表示統治まで）・AI参照条件変更なし・公開なし**。docs-only・code/schema/migration/seed/package 変更なし・**push なし（commit-only）**。次は doc96 push（別承認）→ AI参照条件判断 / 公開活用判断 / Customer Pain / 品質基盤強化。詳細 `docs/audit/96_case_study_consent_anonymized_false_policy_production_confirmation.md`。反映状態は git refs を正とする。

- CaseStudyConsent anonymized=false 本格扱い実装「社内限定・制限表示の最小実装（判定 GO）」: `apps/web/app/(app)/brain/case-studies/page.tsx`（**badge_only**=実名寄り行に「AI参照対象外」「外部公開不可」バッジ追加＋**knowledge_update_only**=実名寄り行のタイトル・本文断片は `c.anonymized || canUpdate` のときだけ表示・非保有者には「実名寄り事例（閲覧制限）」のみ）＋`[id]/edit/page.tsx`（**require_manual_reanonymize**=許諾が無効になっても自動では匿名化に戻らない注意文言・自動書き換えなし）＋`scripts/check-company-brain-safety.mjs`（**表示統治の機械検査3種**: バッジ消失 FAIL／閲覧制限消失 FAIL／case-studies 画面の `prisma.customer` 参照=PII 表示面拡張で FAIL）＋`apps/web/tests/e2e/smoke.spec.ts`（**23本目=実名寄り1周**: 台帳登録→匿名化オフ保存→バッジ表示→手動戻し注意→匿名化に戻す→片付け）＋doc95 新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsent匿名化オフ本格扱い実装.md`（index からリンク）＋本ファイル。§0 人間決定9項目=**INTERNAL_ONLY_RESTRICTED / knowledge_update_only / badge_only / require_manual_reanonymize / title_body_only_no_customer_master_join / separate_approval_required / separate_customer_voice_purpose_required / keep_anonymized_true_only / prohibit_now**（すべて安全側・矛盾なし・doc94 推奨値どおり）。**anonymized=false は未解禁（表示統治のみ）・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・company-brain-reference 無変更・成果数値/顧客の声/公開系の機能追加なし・Customer マスタ join なし・既存データ自動書き換えなし**。**検証全green（gate passed actions4/ui156・test 256/256・typecheck・lint・build・seed・smoke 23/23 green・既存22本回帰なし・ローカルのみ・修正ループ0回）**。schema/migration/seed/package/lock/doc14 無変更。プロダクト基準は **CaseStudyConsent 保存条件接続 / `5e9461f`** のまま。次は doc95 push（別承認）→ 本番確認（実名寄りバッジ1周）→ AI参照条件/公開活用の判断。詳細 `docs/audit/95_case_study_consent_anonymized_false_policy_implementation.md`。反映状態は git refs を正とする。

- CaseStudyConsent anonymized=false 本格扱い設計「実名寄り事例の運用・表示・閲覧範囲（docs-only・判定 READY / GO）」: `docs/audit/94_case_study_consent_anonymized_false_policy_design.md`（doc94）新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsent匿名化オフ本格扱い設計.md`（index からリンク）＋本ファイル。read-only 監査（doc93=本番確認GO・基準=保存条件接続 `5e9461f`・AI非注入 0件・匿名化門番不変・安全ゲート「承認済み接続の形」検査稼働・本番に実名寄り実データ無し）に基づき設計固定: **3案比較 → 案A（INTERNAL_ONLY_RESTRICTED・社内限定・制限表示）推奨**（badge＋注意文言＋閲覧権限の統治のみ・解禁ゼロ）／**§0 人間決定候補9項目**（ANONYMIZED_FALSE_POLICY・VIEW_PERMISSION_POLICY・LIST_DISPLAY_POLICY・REVOCATION_POLICY・CUSTOMER_NAME_POLICY・OUTCOME_NUMBERS_POLICY・CUSTOMER_VOICE_POLICY・AI_REFERENCE_POLICY・PUBLIC_USE_POLICY）／論点10（表示・閲覧範囲・取り消し時の扱い・バックフィル不要 等）／実装9段階（今回は段階1のみ）。**AI/公開との境界を不変事項として明文化**: anonymized=false は AI に読ませない（AI参照は anonymized=true のみ維持）・external_publish/pr/seo/customer_voice の purpose だけでは公開できない（ApprovalRequest・表現審査・公開前人間承認・取り下げ運用が前提・doc91 §6 段階8/9 の別承認）。**anonymized=false 未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。docs-only・code/schema/migration/seed/package/doc14 変更なし・push なし（commit-only）。プロダクト基準は **CaseStudyConsent 保存条件接続 / `5e9461f`** のまま。次は doc94 push（別承認）→ **§0 人間決定** → UI/表示方針の最小実装承認（doc95 候補）。詳細 `docs/audit/94_case_study_consent_anonymized_false_policy_design.md`。反映状態は git refs を正とする。

- CaseStudyConsent 保存条件接続-PROD「保存条件接続の本番確認記録（docs-only・判定 GO）」: `docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md`（doc93）新規＋doc14 §59 追記＋CURRENT_STATE 基準昇格＋`369-vault/知識/CaseStudyConsent保存条件接続本番確認.md`（index からリンク）＋本ファイル。**利用者実測（2026-07-05・チャット提出・NG/不明 0件）**: Vercel Ready・latest commit `5e9461f`・build green・CI green・本番ログイン OK・既存主要画面無回帰・**保存条件接続の1周実測**（新規作成では「許諾あり」でも匿名化オフ拒否（案内表示）→架空・匿名事例作成→台帳なしで匿名化オフ保存拒否→internal_view の有効な台帳登録（証跡は所在説明のみ・期限入力）→匿名化オフ保存が通る（実名寄り表示）→台帳取り消し（行が残り取り消し済み表示）→再び拒否→匿名化ありに戻す→アーカイブ片付け）・externalAiAllowed true UI なし・publishStatus UI なし・公開系 UI なし・本番DB直接接続なし。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**（申告値をそのまま記録）。**判定 GO＝本番確認GO済みプロダクト基準を CaseStudyConsent UI / `1913456` → 保存条件接続 `5e9461f` へ昇格**（前基準は歴史的保持）。**anonymized=false 未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**のまま。docs-only・code/schema/migration/seed/package 変更なし・push なし（commit-only）。次は doc93 push（別承認）→ anonymized=false 本格扱い判断（doc91 §6 段階7）。詳細 `docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md`。反映状態は git refs を正とする。

- CaseStudyConsent 保存条件接続実装「anonymized=false 保存への突合必須化（CONNECT_ONLY・判定 GO）」: `apps/web/app/(app)/brain/case-studies/actions.ts`（**create は anonymized=false を一律拒否**＋**update は anonymized=false のときだけ** 台帳を `tenantId`/`caseStudyId` スコープで取得・suppressed を actions 層で解決・**validateCaseStudyConsentReconciliation（targetPurpose internal_view）** で照合・拒否は `error=ledger_<reason>` redirect）＋new/edit 画面の reason 別日本語文言（**PII・証跡本文・抑止詳細を出さない**・suppressed 等は一般文言に丸める）＋`packages/shared/src/case-study-consent.ts` に **resolveCaseStudyConsentSuppressed**（純粋関数・customerId 無し=false・Customer 不在=安全側 true・email ドメイン一致含む/phone 照合）＋テスト6本（**test 250→256**）＋`scripts/check-company-brain-safety.mjs` を**「接続禁止」→「承認済み接続の形」検査へ更新**（接続消失/テナント境界/create 拒否/internal_view 変更で FAIL。門番不変・AI 非注入 FAIL・Prisma 混入 FAIL は維持）＋doc92 新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsent保存条件接続実装.md`（index からリンク）＋本ファイル。§0 人間決定5項目=**CONNECT_ONLY / internal_view / CALLER_RESOLVES_SUPPRESSED_BOOLEAN / NO_BACKFILL / REDIRECT_WITH_REASON_CODE**（矛盾なし）。**anonymized=false は未解禁（保存できるだけ・AI/公開に使われない）・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。**検証全green（gate passed actions4/ui156・test 256/256・typecheck・lint・build・migrate status pending なし・seed・smoke 22/22 green・既存21本回帰なし・ローカルのみ・修正ループ0回）**。schema/migration/seed/package/lock/doc14 無変更。プロダクト基準は **CaseStudyConsent UI / `1913456`** のまま。次は doc92 push（別承認）→ 本番確認（拒否→台帳登録→通る→取り消し→拒否の1周）→ anonymized=false 本格扱い判断。詳細 `docs/audit/92_case_study_consent_save_condition_connection.md`。反映状態は git refs を正とする。

- CaseStudyConsent 保存条件接続設計「anonymized=false の扱いと突合判定の接続方針（docs-only・判定 READY / GO）」: `docs/audit/91_case_study_consent_save_condition_connection_design.md`（doc91）新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsent保存条件接続設計.md`（index からリンク）＋本ファイル。read-only 監査（既存門番=actions line 61 稼働・突合判定未接続 0件・AI参照層 0件・段階分離ゲート稼働・本番に実名寄りデータ無し）に基づき設計固定: **3案比較 → 案A（CONNECT_ONLY・接続だけ先行）推奨**（anonymized=false 保存時に有効な台帳行を必須化＝申告値依存の弱点だけを塞ぐ・解禁ゼロ・既存データ影響ゼロ）／**§0 人間決定候補5項目**（SAVE_CONNECTION_POLICY・TARGET_PURPOSE（推奨 internal_view）・SUPPRESSION_CHECK_POLICY・EXISTING_DATA_POLICY（推奨 NO_BACKFILL）・ERROR_UX_POLICY）／論点8（purpose 要件・SuppressionList 照会層・consentRecordId 据え置き・エラー UX・既存データ）／実装9段階（今回は段階1のみ）。**保存条件接続なし・anonymized=false 未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。docs-only・code/schema/migration/seed/package/doc14 変更なし・push なし（commit-only）。プロダクト基準は **CaseStudyConsent UI / `1913456`** のまま。次は doc91 push（別承認）→ **§0 人間決定** → 接続の最小実装承認（doc92 候補）。詳細 `docs/audit/91_case_study_consent_save_condition_connection_design.md`。反映状態は git refs を正とする。

- CaseStudyConsent 突合判定実装「validateCaseStudyConsentReconciliation（純粋関数のみ・判定 GO）」: `packages/shared/src/case-study-consent.ts` に**突合判定の純粋関数を追加**（doc89 §5 の15条件・**DB 読み出しなし**・Prisma import なし・now/suppressed は引数・evidence は存在確認のみ・安定理由コード17種・既存2関数無変更）＋**否定系テスト20本（test 230→250**・肯定1＋否定18＋混在行1・doc89 §11 の17本案を全カバー）＋`scripts/check-company-brain-safety.mjs` に**段階分離の機械検査**（case-studies/actions.ts への接続混入で FAIL／canDisableAnonymization 実装変更で FAIL／company-brain-reference への突合・台帳参照混入で FAIL／shared への Prisma 混入で FAIL）＋doc90 新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsent突合判定実装.md`（index からリンク）＋本ファイル。**どこにも接続していない＝挙動不変**（保存条件接続=段階3・anonymized=false=段階6 はいずれも別承認）。**AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。**検証全green（gate passed actions4/ui156・test 250/250・typecheck・lint・build・ローカルのみ・修正ループ0回。smoke は UI 変更なしのため未実施=成功扱いしない）**。apps/schema/migration/seed/package/lock/doc14 無変更。プロダクト基準は **CaseStudyConsent UI / `1913456`** のまま。次は doc90 push（別承認）→ 保存条件接続 / anonymized=false 扱いの人間判断。詳細 `docs/audit/90_case_study_consent_reconciliation.md`。反映状態は git refs を正とする。

- CaseStudyConsent 突合判定設計「granted の真正性確認の設計（docs-only・判定 READY / GO）」: `docs/audit/89_case_study_consent_reconciliation_design.md`（doc89）新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsent突合判定設計.md`（index からリンク）＋本ファイル。**doc82〜88 を前提**（granted は申告値・台帳は本番稼働済み）に doc83 §9 段階3 を設計固定: **有効条件15項目 AND**（granted＋有効な台帳行＋tenantId/caseStudyId 一致＋非 revoked/expired/suppressed（SuppressionList 照会）＋purpose 対象用途＋archivedAt null・private・NORMAL/INTERNAL＋人間登録＋evidence 存在）／**reject 条件の明示**（不一致・失効・用途なし・unknown・archived・高機密・public・evidence 空・AI mutation）／**purpose 6区分**（公開系は台帳だけでは足りない・今回解禁しない）／**validateCaseStudyConsentReconciliation 案（案B推奨・既存門番を壊さない・DB 読み出しは呼び出し層）**／**否定系テスト17本案**／**安全ゲート案**（匿名化解禁の同時混入で FAIL の段階分離検査含む）／実装8段階（今回は段階1のみ）。**実装は未着手・anonymized=false 未解禁・AI参照条件変更なし**。docs-only・code/schema/migration/seed/package 変更なし・doc14 追記なし・push なし（commit-only）。プロダクト基準は **CaseStudyConsent UI / `1913456`** のまま。次は doc89 push（別承認）→ 実装承認判断（純粋関数＋テスト＋ゲートのみ）。詳細 `docs/audit/89_case_study_consent_reconciliation_design.md`。反映状態は git refs を正とする。

- CaseStudyConsent UI-PROD「許諾台帳UI 本番確認記録（docs-only・**GO**）」: `docs/audit/88_case_study_consent_ui_production_confirmation.md`（doc88）新規＋doc14 §58 追記＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsentUI本番確認.md`（index からリンク）＋本ファイル。**利用者実測（確認日 2026-07-05 申告・チャット提出・§0テンプレート未記入で一度停止→完全記入提出で確定）: Vercel Ready・latest commit `1913456`・build green・CI green（最新 run 1913456）・本番ログイン OK・既存主要画面無回帰・架空・匿名事例で台帳1周＝事例1件作成（実在顧客名/成果数値/顧客の声なし）→ 編集画面「許諾台帳」→ 登録（用途1つ以上・証跡は所在説明のみ・証跡ガイド表示確認・許諾日/有効期限入力）→ 一覧反映 → 詳細表示 → 取り消し（行が残り取り消し済み表示=物理削除禁止が本番で成立）→ テスト事例アーカイブ片付け・externalAiAllowed true UI なし・publishStatus UI なし・公開系 UI なし**。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。**判定 GO＝CaseStudyConsent UI は本番確認まで完全クローズ。本番確認GO済みプロダクト基準を CaseStudyConsent schema/`812ae69` → CaseStudyConsent UI/`1913456` へ昇格**（前基準は歴史的保持）。**CaseStudyConsent は AI 文脈へ注入しない・AI参照条件変更なし・anonymized=false 未解禁**。docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）。次は doc88 の push（別承認）→ **突合判定（doc83 §9 段階3）/ Customer Pain / Stage 2・3・★2・UX の人間選択**。詳細 `docs/audit/88_case_study_consent_ui_production_confirmation.md`。反映状態は git refs を正とする。

- CaseStudyConsent UI実装「許諾台帳の登録・閲覧・取り消し（判定 GO）」: `apps/web/app/(app)/brain/case-studies/[id]/consents/`（一覧 page.tsx・new/page.tsx・[consentId]/page.tsx・actions.ts・purpose-labels.ts）新規＋編集画面に「許諾台帳」導線1リンク＋`packages/shared/src/case-study-consent.ts` 新規（CASE_STUDY_CONSENT_PURPOSES 6区分・validateCaseStudyConsentInput）＋**否定系テスト8本（test 222→230）**＋`scripts/check-company-brain-safety.mjs` に **CaseStudyConsent 検査追加**（consents actions の isHumanUser/writeAudit/**物理削除禁止**/入力検証・証跡ガイド文言・**company-brain-reference に CaseStudyConsent 非存在=AI 非注入の機械検査**・shared テスト存在）＋**smoke 22本目**（事例作成→編集→許諾台帳→登録→一覧→取り消し→アーカイブ片付けの1周＋externalAiAllowed/publishStatus UI 0件確認）＋doc87 新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsentUI実装.md`（index からリンク）＋本ファイル。**doc86 準拠: 4操作のみ・自由編集なし・人間のみ（AIロール不可）・knowledge:update・tenantId・writeAudit は最小情報（証跡本文/PII を入れない）・status は granted 固定・revoke は行を残す・Customer picker なし（PII 非複製）・evidence は所在説明のみ（原本/PII 禁止ガイド明記）・expiresAt 必須（期限逆転拒否）**。**AI参照条件変更なし・anonymized=false 未解禁・ConsentRecord連携までは anonymized=true のみAI参照**。**検証全green（gate passed actions4/ui156・test 230/230・typecheck・lint・build・smoke 22/22・既存21本回帰なし・ローカルPGのみ・本番接触なし・修正ループ0回）**。schema/migration/seed/package/lock/company-brain-reference 無変更。プロダクト基準は **CaseStudyConsent schema / `812ae69`** のまま。次は doc87 の push（別承認）→ 本番確認（架空事例で台帳1周→片付け・doc88 候補）→ 突合判定（doc83 §9 段階3）。詳細 `docs/audit/87_case_study_consent_ui.md`。反映状態は git refs を正とする。

- CaseStudyConsent UI設計「許諾台帳の登録・閲覧・取り消しの安全設計（docs-only・判定 READY / GO）」: `docs/audit/86_case_study_consent_ui_design.md`（doc86）新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsentUI設計.md`（index からリンク）＋本ファイル。**台帳UI（doc83 §9 段階2）の実装前安全設計**。read-only 監査（doc82〜85 正本・CaseStudyConsent schema・2-C-4 actions の型・Customer PII・AI参照層に CaseStudyConsent 参照 0件）に基づき固定: スコープ=**一覧・登録・閲覧・revoke のみ**（ルート案1 `/brain/case-studies/[id]/consents` 推奨・自由編集なし・**物理削除禁止**・誤登録は revoke→再登録）／**人間のみ**（isHumanUser・AIロール不可）・knowledge:update 候補・tenantId・**writeAudit（PII/証跡本文を audit に入れない）**／入力=purpose 6区分（空拒否）・**evidence 所在説明のみ（TEXT_POINTER_ONLY）**・**expiresAt 必須**（grantedAt 以前拒否）・**Customer picker は作らない**（CaseStudy.customerId 自動反映・**PII を複製しない**）／**AI参照条件変更なし**（**CaseStudyConsent は AI 文脈へ注入しない**・**anonymized=false 未解禁**・連携までは anonymized=true のみAI参照）／実装時の否定系テスト・安全ゲート拡張（AI 非注入の機械検査含む）・smoke・停止条件も記録。**docs-only・UI/Server Action 未実装・code/schema/migration/seed/package 変更なし・push なし（commit-only）**。プロダクト基準は **CaseStudyConsent schema / `812ae69`** のまま。次の安全な選択肢: doc86 の push-only 承認 → **台帳UI 実装承認（doc87 候補）**/ 突合判定 / Customer Pain / Stage 2・3・★2・UX。詳細 `docs/audit/86_case_study_consent_ui_design.md`。反映状態は git refs を正とする。

- CaseStudyConsent schema-PROD「CaseStudyConsent schema 本番確認記録（docs-only・**GO**）」: `docs/audit/85_case_study_consent_schema_production_confirmation.md`（doc85）新規＋doc14 §57 追記＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsentSchema本番確認.md`（index からリンク）＋本ファイル。**利用者実測（確認日 2026-07-05 申告・チャット2通で提出・§0テンプレート未記入で2度停止→分割提出で確定）: Vercel Ready・latest commit `812ae69`・build green・CI green・本番ログイン〜主要画面ふだんどおり（既存主要画面無回帰）・/brain/case-studies 正常・CaseStudyConsent 画面なし（登録/編集/削除 UI もなし）＝schema-only のため画面なしが正常・externalAiAllowed true UI なし・publishStatus UI なし・公開系 UI なし・本番DB直接接続なし**。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。**判定 GO＝CaseStudyConsent schema は本番確認まで完全クローズ。本番確認GO済みプロダクト基準を Phase 2-C-5/`6d656a3` → CaseStudyConsent schema/`812ae69` へ昇格**（前基準は歴史的保持）。**追加のみ migration・破壊的SQLなし**の器が本番反映済み・**UI/writeAudit/突合判定は未実装＝書き込み経路ゼロで本番テーブルは空のまま・anonymized=false 未解禁・ConsentRecord連携までは anonymized=true のみAI参照**。docs-only・code/schema/migration/seed 変更なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）。次は doc85 の push（別承認）→ **台帳UI（doc83 §9 段階2）/ 突合判定（段階3）は別承認**。詳細 `docs/audit/85_case_study_consent_schema_production_confirmation.md`。反映状態は git refs を正とする。

- CaseStudyConsent schema「事例許諾専用台帳の器を追加（schema-only・判定 GO）」: `packages/db/prisma/schema.prisma` に **CaseStudyConsent model 1件のみ追加**（doc83 案B準拠・安全方針コメント付き・CaseStudy 直後）＋migration `20260705002819_phase2c_consent_case_study_consent`（**追加のみ・破壊的SQLなし**: CREATE TABLE＋CREATE INDEX 2本のみ・DROP/DELETE/TRUNCATE/ALTER/RENAME/UPDATE=0 を機械確認）＋`docs/audit/84_case_study_consent_schema.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/CaseStudyConsentSchema.md`（index からリンク）＋本ファイル。**§0 人間決定4点**（2026-07-05 チャット提出）: consentRecordId 据え置き／evidence は所在説明のみ（TEXT_POINTER_ONLY・原本/PII を貼らない）／**expiresAt 必須（NULL_NOT_ALLOWED・期限なし許諾は認めない）**／登録は人間のみ（AI 不可・UI 実装時適用）。フィールド: tenantId・caseStudyId・customerId（ID参照のみ・PII複製なし）・status（granted/revoked・expired/suppressed は導出）・purpose 6区分明示・evidence・grantedAt・expiresAt・revokedAt・grantedById。**既存 ConsentRecord/CaseStudy/SuppressionList/Customer 無変更・relation 追加なし**。検証全green（validate・migrate dev＋status・**test 222/222**・typecheck・lint・build・ローカルPGのみ・本番接触なし。smoke は schema-only のため未実施=成功扱いしない）。**UI/writeAudit/突合判定（validateCaseStudyConsent 拡張）は未実装＝書き込み経路ゼロ・本番テーブルは空のまま**（doc83 §9 段階2〜3・別承認）。**ConsentRecord連携までは anonymized=true のみAI参照・anonymized=false は未解禁**。プロダクト基準は **Phase 2-C-5 / `6d656a3`** のまま。次は doc84 の push（別承認）→ 本番確認（画面なしが正常）→ 台帳UI/突合判定の承認判断。詳細 `docs/audit/84_case_study_consent_schema.md`。反映状態は git refs を正とする。

- ConsentRecord連携器選択「CaseStudyConsent 専用モデル推奨（docs-only・判定 READY / GO）」: `docs/audit/83_consent_record_case_study_model_decision.md`（doc83）新規＋CURRENT_STATE 更新＋`369-vault/知識/ConsentRecord連携器選択.md`（index からリンク）＋本ファイル。doc82 の人間選択事項（許諾台帳の器）を **案A（既存 ConsentRecord 拡張）/ 案B（事例許諾専用新モデル）の比較表で確定 → 案B推奨 = CaseStudyConsent**。根拠: 既存 ConsentRecord はメール営業チャネル同意用（配信同意）で事例許諾と意味が異なり、案A は行の意味混在で監査・既存運用リスク／案B は**追加のみ migration・破壊的SQLなし・既存テーブル無変更**・意味単一で監査容易。フィールド案（tenantId・caseStudyId・customerId=ID参照のみ・status granted/revoked・purpose 6区分（internal_view/ai_reference/external_publish/pr/seo/customer_voice・未記載不許可）・evidence・grantedAt・expiresAt・revokedAt。expired/suppressed は導出）＋突合判定＋実装5段階（schema→UI→突合判定→匿名化解除判断→公開活用・各段個別承認）＋schema 承認前の Unknowns 4点を記録。**schema実装は次の別承認・ConsentRecord連携までは anonymized=true のみAI参照・anonymized=false は別承認**・外部公開/PR/SEO/顧客の声公開は禁止のまま。**docs-only・code/schema/migration/seed/package 変更なし・DB操作なし・本番接触なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）**。プロダクト基準は **Phase 2-C-5 / `6d656a3`** のまま。次の安全な選択肢: doc83 の push-only 承認 → CaseStudyConsent schema 実装判断 / Customer Pain 判断 / Stage 2・3・★2・UX。詳細 `docs/audit/83_consent_record_case_study_model_decision.md`。反映状態は git refs を正とする。

- ConsentRecord連携設計「CaseStudy 許諾真正性・匿名化解除・公開活用ゲート（docs-only・判定 READY / GO）」: `docs/audit/82_consent_record_case_study_link_design.md`（doc82）新規＋CURRENT_STATE 更新＋`369-vault/知識/ConsentRecord連携設計.md`（index からリンク）＋本ファイル。**Phase 2-C-CLOSE 後の後続設計第一弾**。read-only 監査（doc81 正本反映・CaseStudy model・ConsentRecord/SuppressionList・actions/shared/company-brain-reference/安全ゲート実測）に基づき設計固定: **consentStatus=granted だけでは真正な許諾証拠として扱わない**（申告値）・真正な許諾は将来 ConsentRecord 突合（用途 purpose・失効 revoked/expired/suppressed・期限・証跡）で確認・**ConsentRecord連携までは anonymized=true のみAI参照を維持**。発見: **既存 ConsentRecord はメール営業チャネル同意用で用途/失効/期限/証跡なし** → 器は案A（既存拡張）/ 案B（事例許諾専用新モデル・**推奨**・追加のみ migration）の人間選択。**anonymized=false の解禁は別承認**（granted＋有効 consentRecordId＋同一tenant＋非失効＋用途明示＋公開系は ApprovalRequest の全条件AND）・取り消し時は anonymized=true へ戻す/AI参照除外/非公開化/writeAudit/ai_reference 履歴保持。**公開活用（外部公開/PR/SEO/SNS/顧客の声）は禁止のまま**（解禁は連携＋表現審査＋公開前人間承認＋取り下げ＋証跡の5前提＋1件ごと承認）。**docs-only・code/schema/migration/seed/package 変更なし・DB操作なし・本番接触なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）**。プロダクト基準は **Phase 2-C-5 / `6d656a3`** のまま。次の安全な選択肢: doc82 の push-only 承認 → ConsentRecord連携の実装判断（段階承認）/ Customer Pain 判断 / Stage 2・3・★2・UX。詳細 `docs/audit/82_consent_record_case_study_link_design.md`。反映状態は git refs を正とする。

- Phase 2-C-CLOSE「Phase 2-C 完了判定（docs-only・**GO**）」: `docs/audit/81_phase2c_close.md`（doc81）新規＋doc14 §56 追記＋CURRENT_STATE 更新（**最新の本番確認GO済みプロダクト基準の表記を Phase 2-B-5 → Phase 2-C-5 / `6d656a3` に修正・2-B-5 の歴史的記録は保持**）＋`369-vault/知識/Phase2C完了判定.md`（index からリンク）＋本ファイル。**doc70〜doc80 と doc14 §52〜§55 を read-only 照合**し、完了条件19項目をすべて充足（2-C-ENTRY〜2-C-5 全段完了・2-C-2〜2-C-5 本番確認GO・匿名化済みのみAI参照・externalAiAllowed true UI なし・publishStatus UI なし・実LLM/外部送信/AIコストなし・未解消HOLDなし・記録整合）→ **Phase 2-C 正式クローズ（判定 GO）**。**本番確認GO済みプロダクト基準: Phase 2-C-5 / `6d656a3`**（doc81 commit は完了判定記録でありプロダクト基準にしない）。後続課題（いずれも別承認・後続課題ゼロではない）: ConsentRecord連携・Customer Pain（高機密ラベル対応が先）・公開活用（PR配信/SEO/SNS/口コミ/顧客の声公開）・Stage 2・3・★2・UX・品質基盤強化。docs-only・code/schema/migration/seed/package 変更なし・DB操作なし・本番接触なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）。次の安全な選択肢: doc81 の push-only 承認判断 → ConsentRecord 連携設計 / Customer Pain 判断 / Stage 2・3・★2・UX の人間選択。詳細 `docs/audit/81_phase2c_close.md`。反映状態は git refs を正とする。

- Phase 2-C-5-PROD「CaseStudy AI参照 本番確認記録（docs-only・**GO**）」: `docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` 新規＋doc14 §55 追記＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C5CaseStudyAIReference本番確認.md`（index からリンク）＋本ファイル。**利用者実測（確認日 2026-07-05 申告・チャット提出・§0テンプレート未記入で一度停止→記入済み提出で確定）: Vercel Ready・latest commit `6d656a3`・build green・CI green・本番ログイン OK・架空・匿名の顧客事例1件作成（実在顧客名/成果数値/顧客の声なし）→ タイトルでナレッジ検索 → AIの回答表示 → 「参照した会社の頭脳」に事例タイトル表示 → /admin/data-access-logs に ai_reference（entityType=CaseStudy）→ テスト事例アーカイブ片付け済み・externalAiAllowed true UI なし・publishStatus UI なし・既存主要画面無回帰**。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。**判定 GO＝Phase 2-C-5 は本番確認まで完全クローズ。本番確認GO済みプロダクト基準を Phase 2-C-4/`11e8f51` → Phase 2-C-5/`6d656a3` へ昇格**。**Company Brain AI参照4テーブル体制が本番確認済み**（AIが読める顧客事例は匿名化済みのみ・外部LLM注入ゼロ）。docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）。次は doc80 の push（別承認）→ **Phase 2-C 完了判定（人間判断・doc81 候補）** / ConsentRecord 連携設計 / Customer Pain / Stage 2・3・★2・UX。詳細 `docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-C-5「CaseStudy AI参照の最小実装（判定 GO）」: `apps/web/lib/company-brain-reference.ts` に**4テーブル目**として CaseStudy を追加（doc78 §3/§5 準拠・既存3テーブル無変更・entityType union に CaseStudy・where = tenantId/archivedAt:null/**publishStatus:private/anonymized:true**/NORMAL・INTERNAL・**sourceNote/customerId/consentRecordId/consentStatus は select せず注入しない**・【顧客事例/業種】prefix・**MAX_TOTAL=5 据え置き**・externalAiAllowed ゲート維持=外部LLM時は構造的ゼロ）＋smoke 21本目（ナレッジ検索で顧客事例の参照元表示・2-B-5 の型）＋`scripts/check-company-brain-safety.mjs` に **CaseStudy AI参照の機械検査4件**（findMany 存在・anonymized:true・publishStatus:private・entityType）を追加＋doc79 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C5CaseStudyAIReference実装.md`（index からリンク）＋本ファイル。**ai_reference は knowledge/search の既存 brainRefs ループでレコード単位自動記録（knowledge/search・audit・db 無変更）**。**検証全green（gate passed actions4/ui151・test 222/222・typecheck・lint・build・smoke 21/21・既存20本回帰なし・ローカルPGのみ・本番接触なし・修正ループ0回）**。schema/migration/seed/package/lock/rbac/labels 無変更。GO済み基準は **Phase 2-C-4/`11e8f51`** のまま。次は doc79 の push（別承認）→ 本番確認（架空事例1件作成→検索→ai_reference 確認→片付け）→ 2-C-5-PROD（doc80 候補）。詳細 `docs/audit/79_phase2c5_case_study_ai_reference.md`。反映状態は git refs を正とする。

- Phase 2-C-5-ENTRY「CaseStudy AI参照の安全設計（docs-only・判定 READY / GO）」: `docs/audit/78_phase2c5_case_study_ai_reference_design.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C5CaseStudyAIReference設計.md`（index からリンク）＋本ファイル。**read-only 監査（company-brain-reference.ts 全文・knowledge/search の ai_reference レコード単位記録・CaseStudy model・safety gate・doc44/59/71/76/77）に基づき、AI が顧客事例を読む条件を実装前に固定**: **anonymized=true のみ参照（第一候補）・anonymized=false は今回参照対象外・publishStatus private のみ・NORMAL/INTERNAL のみ・tenantId/archivedAt:null 必須・consentStatus は参照条件に使わない（granted でも ConsentRecord 未連携のため真正性を慎重扱い）**。company-brain-reference の**4テーブル目候補**として既存の型へ最小追加（MAX_TOTAL=5 据え置き候補・sourceNote/customerId/consentRecordId 注入なし・【顧客事例/業種】prefix 文脈化・Prompt Injection 対策は決定的スコアリング＋prefix 構造の維持）。**外部LLM時は externalAiAllowed ゲートで注入ゼロ（構造的ゼロ）・ai_reference は既存 brainRefs ループでレコード単位自動記録**。**docs-only・実装なし・code/company-brain-reference/schema/migration/seed/package/lock 変更なし・DB操作なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）**。GO済み基準は **Phase 2-C-4/`11e8f51`** のまま。次は doc78 の push（別承認）→ **Phase 2-C-5 実装（doc79 候補）承認判断** or ConsentRecord 連携設計/Stage 2・3・★2・UX の人間選択。詳細 `docs/audit/78_phase2c5_case_study_ai_reference_design.md`。反映状態は git refs を正とする。

- Phase 2-C-4-PROD「CaseStudy 人間書き込み本番確認記録（docs-only・**GO**）」: `docs/audit/77_phase2c4_case_study_write_production_confirmation.md` 新規＋doc14 §54 追記＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C4CaseStudyWrite本番確認.md`（index からリンク）＋本ファイル。**利用者実測（確認日 2026-07-05 申告・チャット提出・§0テンプレート未記入で一度停止→記入済み提出で確定）: Vercel Ready・latest commit `11e8f51`・build green・CI green（最新 run 11e8f51 失敗なし）・本番ログイン OK・ナビ「顧客事例」→ 新規作成画面 OK・作成 OK（架空・匿名のみ・実在顧客名/成果数値/顧客の声なし）→ 編集 OK → アーカイブ OK（一覧から消えることを確認）・許諾状態が「許諾あり」ではない状態での匿名化解除が保存時に拒否（許諾の門番が本番で実証）・externalAiAllowed true UI なし・publishStatus UI なし・既存主要画面無回帰**。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。**判定 GO＝Phase 2-C-4 は本番確認まで完全クローズ。本番確認GO済みプロダクト基準を Phase 2-C-3/`408857d` → Phase 2-C-4/`11e8f51` へ昇格**。**会社の頭脳4テーブルすべてが「人間が書き・AIは書けない・消せない・writeAudit が残る」体制で本番稼働**（顧客事例のみ許諾の門番つき）。docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）。次は doc77 の push（別承認）→ **Phase 2-C-5（AI参照・doc78 候補）/ ConsentRecord 連携設計 / Stage 2・3・★2・UX の人間選択**。詳細 `docs/audit/77_phase2c4_case_study_write_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-C-4「CaseStudy 人間書き込み（作成・編集・アーカイブ・判定 GO）」: `apps/web/app/(app)/brain/case-studies/actions.ts` 新規（Server Action 3操作・requireUser→**isHumanUser（AI mutation禁止）**→hasPermission（knowledge:create/update）→入力検証→tenantIdスコープ→prisma→**writeAudit**→revalidatePath）＋new/edit ページ新規＋一覧に権限別導線＋`packages/shared/src/case-study.ts` 新規（**validateCaseStudyConsent: consentStatus=granted 以外では匿名化解除不可**の純粋判定・X-05-2 A案の型）＋**否定系テスト6本（test 216→222）**＋`scripts/check-company-brain-safety.mjs` を **4actions 体制へ拡張**（CaseStudy の物理削除禁止・label 2択・isHumanUser 共通化・validateCaseStudyConsent 使用・publishStatus private 固定を機械検査）＋smoke 19本目の期待値を意図的更新（doc57 と同じ扱い）＋**20本目=作成→編集→アーカイブ1周**＋doc76 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C4CaseStudyWrite.md`（index からリンク）＋本ファイル。**検証全green（安全ゲート passed actions4/ui151・test 222/222・typecheck・lint・build・smoke 20/20・既存回帰なし・ローカルPGのみ・本番接触なし）**。初回ゲート実行は複合 import の完全一致不一致で意図どおり FAIL→import 分割で解消（修正ループ1回・ゲートが機能する実証）。**externalAiAllowed false 固定・publishStatus private 固定・物理削除禁止・顧客名/取引先名/成果数値/顧客の声は許諾なしに書かない入力ガイド**。schema/migration/seed/labels/RBAC/company-brain-reference/package/lock 無変更。**AI参照は 2-C-5 別承認・ConsentRecord 連携は後続別承認**。GO済み基準は **Phase 2-C-3/`408857d`** のまま。次は doc76 の push（別承認）→ 本番確認 → 2-C-4-PROD（doc77 候補）。詳細 `docs/audit/76_phase2c4_case_study_write.md`。反映状態は git refs を正とする。

- Phase 2-C-3-PROD「CaseStudy read-only 本番確認記録（docs-only・**GO**）」: `docs/audit/75_phase2c3_case_study_readonly_production_confirmation.md` 新規＋doc14 §53 追記＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C3CaseStudyReadOnly本番確認.md`（index からリンク）＋本ファイル。**利用者実測（確認日 2026-07-05 申告・チャット提出・§0未記入で一度停止→提出→一覧表示の二択未選択で再度停止→追補「一覧は空表示でした」で確定）: Vercel Production Ready・対象 commit `408857d`・build green・GitHub Actions CI green・失敗なし・本番ログイン OK・ナビ「顧客事例」表示 OK・`/brain/case-studies` 表示 OK・一覧は EmptyState（空表示）＝本番 seed 未投入のため正常・作成/編集/アーカイブボタンなし・既存主要画面無回帰**。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。**判定 GO＝Phase 2-C-3 は本番確認まで完全クローズ。本番確認GO済みプロダクト基準を Phase 2-C-2/`b012bd0` → Phase 2-C-3/`408857d` へ昇格**。書き込み経路ゼロが本番でも成立＝実顧客情報は本番に存在しない。docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）。次は doc75 の push（別承認）→ **Phase 2-C-4（人間書き込み＋writeAudit＋許諾/匿名化制御・doc76 候補）承認判断**。詳細 `docs/audit/75_phase2c3_case_study_readonly_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-C-3「CaseStudy read-only 画面＋架空 seed（判定 GO）」: `apps/web/app/(app)/brain/case-studies/page.tsx` 新規（閲覧専用一覧・requireUser→knowledge:read→tenantId スコープ・archivedAt:null・**publishStatus=private のみ・label NORMAL/INTERNAL のみ**・作成/編集/削除/アーカイブ UI なし・Server Action なし）＋`apps/web/components/shell/nav.ts` に「顧客事例」1行（BookMarked・最小差分）＋`packages/db/prisma/seed.ts` に**架空 CaseStudy 4件**（全件「（架空）」明記・anonymized=true・consentStatus=none・publishStatus=private・externalAiAllowed=false・実在顧客名/実成果数値/顧客の声/口コミ文なし・既存 seed 無変更）＋smoke 19本目（ナビ経由到達・架空タイトル表示・社内参照専用の注意書き・作成/編集/アーカイブ UI 0件の機械確認）＋`docs/audit/74_phase2c3_case_study_readonly.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C3CaseStudyReadOnly.md`（index からリンク）＋本ファイル。**検証全green（安全ゲート passed ui 148・test 216/216・typecheck・lint・build・smoke 19/19 green・既存18本回帰なし・ローカルPGのみ・本番接触なし）**。**schema/migration/CustomerPain/ConsentRecord/SuppressionList/labels/RBAC/company-brain-reference/package/lock 無変更・writeAudit/AI参照は 2-C-4/2-C-5 の別承認・書き込み経路ゼロのまま**。GO済み基準は **Phase 2-C-2/`b012bd0`** のまま（本番確認前のため昇格しない）。次は doc74 の push（別承認）→ 本番確認（利用者実測）→ 2-C-4 承認判断。詳細 `docs/audit/74_phase2c3_case_study_readonly.md`。反映状態は git refs を正とする。

- Phase 2-C-2-PROD「CaseStudy schema 本番確認記録（docs-only・**GO**）」: `docs/audit/73_phase2c2_case_study_schema_production_confirmation.md` 新規＋doc14 §52 追記＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C2CaseStudySchema本番確認.md`（index からリンク）＋本ファイル。**利用者実測（確認日 2026-07-05 申告・チャット提出・§0未記入で一度停止→再掲例文で提出→AI作業ログの誤提出を一度検知して再停止→実測値で確定）: Vercel Production latest deploy Ready・対象 commit `b012bd0`・build green（migrate ログは直接未確認と申告どおり記録・build 成功＝migration 成功の前例枠組み）・GitHub Actions CI green・失敗なし・既存主要画面正常・CaseStudy 画面なし=schema-only のため正常**。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。**判定 GO＝Phase 2-C-2 は本番確認まで完全クローズ。本番確認GO済みプロダクト基準を Phase 2-B-5/`83d35bc` → Phase 2-C-2/`b012bd0` へ昇格**。書き込み経路ゼロのため本番 CaseStudy テーブルは空のまま安全。docs-only・code/schema/migration 変更なし・本番DBへの直接接続なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）。次は doc73 の push（別承認）→ **Phase 2-C-3（read-only 画面＋架空 seed・doc74 候補）承認判断**。詳細 `docs/audit/73_phase2c2_case_study_schema_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-C-2「CaseStudy schema 追加（schema-only・判定 GO）」: `packages/db/prisma/schema.prisma` に **CaseStudy model 1件のみ追加**（doc71 §6-2 準拠・安全方針コメント付き）＋migration `20260704160836_phase2c2_case_study` 新規（**追加のみ・破壊的SQLなし**: CREATE TABLE＋CREATE INDEX 3本のみ・既存 table/column/enum 無変更）＋`docs/audit/72_phase2c2_case_study_schema.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C2CaseStudySchema設計.md`（index からリンク）＋本ファイル。**安全 default を器に固定: anonymized=true・publishStatus=private・consentStatus=none・externalAiAllowed=false・label INTERNAL（UI/action 側で NORMAL/INTERNAL 2択制限予定）・customerId/consentRecordId は relation なし ID 参照**。**CustomerPain model なし・ConsentRecord/SuppressionList/Customer/ConfidentialityLabel enum/labels.ts/RBAC/company-brain-reference.ts/package/lock 無変更**。検証全green（ローカルのみ・本番接触なし: migrate dev＋migrate status・安全ゲート passed・test 216/216・typecheck・lint・SKIP_DB_SETUP=1 build。smoke は schema-only のため未実施=成功扱いしない）。**seed/UI/Server Action/writeAudit/AI参照なし（2-C-3〜2-C-5 の別承認）**。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま（本番確認前のため昇格しない）。次は doc72 の push（別承認）→ 本番確認（利用者実測）→ 2-C-3 承認判断。詳細 `docs/audit/72_phase2c2_case_study_schema.md`。反映状態は git refs を正とする。

- Phase 2-C-1「Case Study / Customer Pain 絞り込み詳細設計（docs-only・判定 READY / GO）」: `docs/audit/71_phase2c1_case_study_customer_pain_detailed_design.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C1顧客事例課題詳細設計.md`（index からリンク）＋本ファイル。**read-only 監査（doc33/doc50/doc70・schema・labels・ConsentRecord/SuppressionList・brain 3actions・ci.yml 実測）に基づき Case Study 先行・Customer Pain 後続で確定**（3世代の記録が同順序・矛盾なし。Customer Pain は高機密ラベル解禁の重い承認が先）。絶対条件固定: **顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない・公開/SNS投稿/PR配信/SEOページ公開しない・初期スコープに公開機能を作らない・非公開/架空データ/匿名化 default true・label 2択・externalAiAllowed false 固定・AI mutation禁止・物理削除禁止**。CaseStudy field 案（consentStatus/consentRecordId/anonymized/publishStatus=private 固定）と段階計画（2-C-2 schema→2-C-3 read-only→2-C-4 書き込み→2-C-5 AI参照・各段別承認）を doc71 に記録。**実装なし・code/DB/schema/migration/package/lock/workflow 変更なし・本番接触なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）**。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま。次は doc71 の push（別承認）→ 2-C-2 承認判断 or Stage 2/★2/UX の人間選択。詳細 `docs/audit/71_phase2c1_case_study_customer_pain_detailed_design.md`。反映状態は git refs を正とする。

- Phase 2-C-ENTRY「次領域入口レビュー（docs-only・判定 READY / GO）」: `docs/audit/70_phase2c_entry_next_domain_review.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2C入口レビュー.md`（index からリンク）＋本ファイル。**Phase 2-B 正式完了＋X-05 第一波完了後の8候補を read-only 監査に基づき比較**（Case Study / Customer Pain / Stage 2 / Stage 3 / ★2権限拒否E2E / UX改善 / GitHub・Obsidian整備 / v5.1・v5.2 Candidate整理。Candidate は正式昇格させない前提）。**推奨1位 = Phase 2-C-1: Case Study / Customer Pain の絞り込み詳細設計 docs-only**（事業価値側へ戻る好機。ただし**顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない・公開しない・SNS投稿しない・PR配信しない・SEOページ公開しない・非公開/架空/許諾前提の設計から**を絶対条件として先に固定）。推奨2位=Stage 2（軽量・並行可）・3位=★2。重複確認: Case/Pain の実装・schema model は未存在（git 実測）・doc33/doc50 の評価と矛盾なし。**実装なし・code/DB/schema/migration/package/lock/workflow 変更なし・本番接触なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）**。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま。次は doc70 の push（別承認）→ 2-C-1 承認判断 or Stage 2/★2/UX の人間選択。詳細 `docs/audit/70_phase2c_entry_next_domain_review.md`。反映状態は git refs を正とする。

- Phase X-05-3-VERIFY「静的安全ゲート CI実走確認記録（docs-only・**GO**）」: `docs/audit/69_phase_x05_3_static_safety_gate_ci_verify.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX05静的安全ゲートCI実走確認.md`（index からリンク）＋本ファイル。**利用者自身の GitHub Actions 画面実測（確認日 2026-07-04 申告・チャット提出・§0未記入で一度停止→確認手順の平易な案内→追補で確定）: CI 最新 run（commit `58be7c7`）が green・失敗なし・step 一覧に「Company Brain safety checks」があり緑で成功**。**AI が GitHub Actions の実走を直接確認したものではない**。**X-05-3 は完全クローズ＝静的安全ゲートが本稼働**（push のたびに安全境界の存在検査→test 216→typecheck→lint が自動実行）。doc63 §5 の ★1/★3/★4/★5 が CI実走まで完了。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま。docs-only・code/workflow/script 変更なし・DB操作なし・本番接触なし・外部送信なし・実LLM/AIコストなし・push なし（commit-only）。次は doc69 の push（別承認）→ Stage 2 / Stage 3 / ★2 / 次領域入口レビューの人間選択。詳細 `docs/audit/69_phase_x05_3_static_safety_gate_ci_verify.md`。反映状態は git refs を正とする。

- Phase X-05-3「Company Brain 静的安全ゲート第一弾（判定 GO・commit-only・Mode D）」: `scripts/check-company-brain-safety.mjs` 新規（**Node標準ライブラリのみ・package/lock/package.json script 無変更**。★5 物理削除禁止=brain 3actions に delete/deleteMany なし・★3 label制限=ALLOWED_LABELS が NORMAL/INTERNAL 2択×3・isHumanUser 共通 import×3＋ローカル重複ゼロ・★4 externalAiAllowed封印=apps/web/app 配下147ファイルに許可入力欄なし・shared の export function isHumanUser＋否定系テスト存在、を機械検査。**失敗時は破れた安全境界を日本語で表示して exit 1**）＋`.github/workflows/ci.yml` に step「Company Brain safety checks」を1つ追加（**db:generate → 安全ゲート → test → typecheck → lint** の順・Stage 1 の範囲厳守・deploy/secrets/DATABASE_URL/migrate/seed/build/E2E 不使用）＋`docs/audit/68_phase_x05_3_company_brain_static_safety_gate.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX05静的安全ゲート.md`（index からリンク）＋本ファイル。**検証全green（script exit 0・db:generate・test 216・typecheck・lint・build・修正ループ0回。smoke は apps/packages 差分ゼロ=app挙動不変のため未実施＝成功扱いしない）**。doc63 §5 の **★1（単体テスト）＋★3/★4/★5（静的ゲート）が自動検証化完了**。DB操作なし・本番接触なし・外部送信なし・実LLMなし・**push なし（commit-only）**。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま。次は push-only（別承認）→ CI 実走確認（doc69 候補）→ Stage 2 / ★2 の承認判断。詳細 `docs/audit/68_phase_x05_3_company_brain_static_safety_gate.md`。反映状態は git refs を正とする。

- Phase X-05-2-VERIFY「否定系テスト第一弾 CI実走確認記録（docs-only・**GO**）」: `docs/audit/67_phase_x05_2_negative_tests_ci_verify.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX05否定系テストCI実走確認.md`（index からリンク）＋本ファイル。**利用者自身の GitHub Actions 画面実測（確認日 2026-07-04 申告・チャット提出・§0未記入で一度停止→追補で確定）: CI 最新 run（commit `b27a979`）が green・失敗なし**。**AI が GitHub Actions の実走を直接確認したものではない**。ローカル検証（test 216・smoke 18/18・doc66 §5）と CI 実走 green が一致し、**X-05-2 は完全クローズ＝「AIは会社の頭脳を書き換えられない」が push のたびに216本のテストで自動検証され続ける品質ゲートが本稼働**。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま。docs-only・code/workflow 変更なし・DB操作なし・本番接触なし・外部送信なし・push なし（commit-only）。次は doc67 の push（別承認）→ **★2〜★5 / Stage 2 の承認判断**。詳細 `docs/audit/67_phase_x05_2_negative_tests_ci_verify.md`。反映状態は git refs を正とする。

- Phase X-05-2「否定系テスト第一弾（AIロール拒否・判定 GO・commit-only）」: `packages/shared/src/rbac.ts` に isHumanUser を純粋関数として追加（`{ roles }` を受け AIロール含有/空roles は安全側 false・**ROLE_PERMISSIONS/権限表は無変更＝RBAC変更なし・AI_AGENT の knowledge:create も無変更**）＋`rbac.test.ts` に**否定系テスト5本追加**（AI_AGENT/AI_ASSISTANT は人間ではない・混在rolesも拒否・空rolesも拒否・**「AI_AGENT が rbac 上 knowledge:create を持つ」前提もテストで固定**・既存テスト無変更）＋brain 3actions（policies/catalog/playbooks）の**3重複ローカル定義を shared 関数へ差し替え（A案・app code変更はこれのみ・呼び出し箇所/判定順序/redirect 不変）**＋`docs/audit/66_phase_x05_2_negative_tests_ai_role.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX05否定系テスト第一弾.md`（index からリンク）＋本ファイル。**検証全green（db:generate・test 211→216・typecheck・lint・build・PG起動→migrate deploy pendingなし→seed playbooks:6→/login 200→smoke 18/18 green＝書き込みE2E含め挙動不変を実証・後片付け済み・修正ループ0回）**。**doc63 の最大の穴（AI書き込み禁止層のテストゼロ）が解消＝以後 CI が push のたびに AIロール拒否を自動検証**。schema/migration/seed/rbac権限表/package/lock/workflow 無変更・DB操作なし・本番接触なし・外部送信なし・**push なし（commit-only）**。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま。次は push-only（別承認）→ ★2〜★5 / Stage 2 の承認判断。詳細 `docs/audit/66_phase_x05_2_negative_tests_ai_role.md`。反映状態は git refs を正とする。

- Phase X-05-1-VERIFY「CI Stage 1 実走確認記録（docs-only・**GO**）」: `docs/audit/65_phase_x05_1_ci_verify.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX05CI実走確認.md`（index からリンク）＋本ファイル。**利用者が GitHub の Actions タブを実測（確認日 2026-07-04 申告・チャット提出・確認日がプレースホルダのまま一度停止→追補で確定）: CI の最新 run（commit `116efd6`）が green・失敗なし**。**AI が GitHub Actions の実走を直接確認したものではない**。ローカル検証（test 211・typecheck・lint 全green）と CI 実走 green が一致し、**Phase X-05-1 は完全クローズ＝品質ゲートが自動で常時稼働する状態になった**。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま（CI はアプリの動作を変えないため対象外）。docs-only・コード/workflow 変更なし・DB操作なし・本番接触なし・外部送信なし・push なし（commit-only）。次は doc65 の push（別承認）→ **X-05-2（否定系テスト・★1〜★5）/ Stage 2 の承認判断**。詳細 `docs/audit/65_phase_x05_1_ci_verify.md`。反映状態は git refs を正とする。

- Phase X-05-1「CI Stage 1 実装（判定 GO・commit-only）」: `.github/workflows/ci.yml` 新規（**workflow 1ファイルのみ**・doc63 §4 Stage 1 準拠・push[main/claude/**]＋PR[main] で install --frozen-lockfile → db:generate → test → typecheck → lint・pnpm 10.33.0・node 20・cache: pnpm・permissions contents:read・timeout 15分・**build/Playwright/PostgreSQL/migrate/seed/server/secrets/DATABASE_URL/deploy は不使用**）＋`docs/audit/64_phase_x05_1_ci_stage1.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX05CIStage1実装.md`（index からリンク）＋本ファイル。**ローカル検証 green（db:generate 0・test 211・typecheck 0・lint 0・修正ループ0回・actionlint は未インストールのため未実施＝成功扱いしない）**。**app code変更なし・package/lock変更なし・DB操作なし・本番接触なし・外部送信なし・push なし（commit-only）**。**GitHub Actions 実走確認は push後**（利用者が Actions タブで run green を確認・doc65 候補）。Stage 2 build・Stage 3 smoke・否定系テスト（X-05-2）は別承認。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま。次は push-only（別承認）→ 実走確認 → X-05-2 / Stage 2 承認判断。詳細 `docs/audit/64_phase_x05_1_ci_stage1.md`。反映状態は git refs を正とする。

- Phase X-05-ENTRY「CI・否定系テスト設計確認（docs-only・判定 READY / GO）」: `docs/audit/63_phase_x05_ci_negative_tests_design.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX05CI否定系テスト設計.md`（index からリンク）＋本ファイル。**Phase 2-B 完了直後・次領域着手前の品質基盤強化の実装前設計**を read-only 監査に基づき確定: ①`.github/workflows` 不在=CI ゼロを確認・**CI は3段階導入案**（Stage 1=db:generate/test/typecheck/lint・Stage 2=SKIP_DB_SETUP=1 build・Stage 3=smoke on CI は後日判断・既存 script のみで新コマンド作成なし）②否定系テスト8対象を優先順で設計（AIロール拒否・権限拒否・label制限・externalAiAllowed封印・物理削除禁止・外部LLMゲート・ai_reference purpose・tenantId）③**最重要発見: rbac 上 AI_AGENT は knowledge:create=true のため、Company Brain 書き込み禁止は actions 層の isHumanUser（3ファイルローカル定義）だけが守っており、この層の自動テストはゼロ**④実装方式 A（shared へ抽出＋単体テスト・推奨）/ B（E2E＋静的チェック）は実装時の人間判断⑤機械ゲートの script 化案（ゲート文化の自動化）。**docs-only・実装なし・workflow作成なし・test作成なし・package/lock変更なし・DB操作なし・本番接触なし・外部送信なし・push なし（commit-only）**。GO済み基準は **Phase 2-B-5/`83d35bc`** のまま。次は doc63 の push（別承認）→ **X-05-1（CI Stage 1）実装の承認判断**。詳細 `docs/audit/63_phase_x05_ci_negative_tests_design.md`。反映状態は git refs を正とする。

- Phase 2-B-CLOSE「Phase 2-B 全体クローズ判定（docs-only・判定 GO）」: `docs/audit/62_phase2b_completion_record.md` 新規＋doc14 §51 追記（A案承認・2-A-CLOSE=doc48/§45 と同じ型）＋CURRENT_STATE 更新（**Phase 2-B を正式完了に・完了対象の最新本番確認GO済み基準 Phase 2-B-5/`83d35bc`**）＋`369-vault/知識/Phase2B完了.md`（index からリンク）＋本ファイル。**doc50 入口レビュー〜doc61 AI参照本番GOの全実績を完了条件20項目と照合し、すべて証拠付きで充足 → Phase 2-B-CLOSE 判定 GO**: 設計（doc51）→ schema＋本番GO（doc52/53）→ read-only＋本番GO（doc54/55/56）→ 人間書き込み＋本番GO（doc57/58）→ AI参照＋本番GO（doc59/60/61）。**会社の頭脳3テーブルすべてが「人間が書き・AIが読み・読んだら記録・外部AIには出さない」体制で本番稼働**。HOLD 2件（2-B-3 ナビ=キャッシュ起因・2-B-5 ai_reference=表示場所の違い）は追記主義で解消済み・**未解消HOLDなし・どちらもコード修正ゼロ**。smoke は15本→18本に成長。**後続送り（別承認）: 頭脳2画面タブ導線・アーカイブ文言/視認性・実LLMキー設定（外部送信解禁とセット）・CI導入・否定系テスト・doc49 script化・Case Study / Customer Pain・Phase 2-C 相当の次領域入口レビュー・Phase 8・3c-5・高機密・ENSHiN OS外部発信**。docs-only・コード変更なし・DB操作なし・本番接触なし・push なし（commit-only）。次は doc62 の main 反映（push-only・別承認）→ 次領域/改善候補の人間選択。詳細 `docs/audit/62_phase2b_completion_record.md`。反映状態は git refs を正とする。

- Phase 2-B-5-PROD「SalesPlaybookEntry AI参照の本番確認記録（docs-only・**GO**・一度不完全報告→切り分け→再実測で確定）」: `docs/audit/61_phase2b5_production_confirmation.md` 新規＋doc14 §50 追記＋CURRENT_STATE 更新（**GO済み基準を Phase 2-B-5/`83d35bc` に更新**・前基準 2-B-4/`26a7a30` は保持）＋`369-vault/知識/Phase2B5本番確認.md`（index からリンク）＋本ファイル。経緯: 初回報告は「ai_reference が監査ログに見当たらない」「全部68点・テンプレ回答」「Supabase エラーログ」を含み GO 保留 → **read-only 切り分け**（68点=FakeLLM 仕様・信頼度0.68固定／Supabase dashboard 由来ログはアプリ無関係の可能性大・断定しない／ai_reference の表示場所は `/admin/data-access-logs`＝監査ログ本体ではない／アーカイブ済みは参照対象外／頭脳側→プレイブックのリンク無しは現状仕様）→ **利用者再実測（2026-07-04 申告）で全項目 OK**: 本番UIで新規作成「テスト1」（未アーカイブ・架空内容のみ）→検索「test1」→AI回答＋**「参照した会社の頭脳」にタイトル表示**→**`/admin/data-access-logs` に「AI参照」（ai_reference）行・entityType=SalesPlaybookEntry**・既存5画面無回帰・エラー/外部送信/SNS/口コミ/顧客の声公開/ENSHiN OS外部発信なし。**AI が本番接続確認したものではない**。**Phase 2-B-5 は本番確認まで完全クローズ**＝Company Brain 3テーブルすべてが「人間が書き・AIが読み・読んだら記録」体制で本番稼働。改善候補（別承認）: 頭脳2画面→プレイブックのタブ導線・アーカイブ文言/視認性・実LLMキー設定。docs-only・コード変更なし・DB操作なし・push なし（commit-only）。次は doc61 の push（別承認）→ **Phase 2-B 全体クローズ判定（doc62 候補・別承認）**。詳細 `docs/audit/61_phase2b5_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-B-5「SalesPlaybookEntry AI参照の最小実装（判定 GO・commit-only）」: `apps/web/lib/company-brain-reference.ts` 編集（doc59 どおり3テーブル目として SalesPlaybookEntry を追加・**read-only**・tenantId・archivedAt:null・NORMAL/INTERNAL・canAccessLabel・select 最小限で sourceNote は context に入れない・playbookType を「【営業プレイブック/切り口】」形式で明示・**objection=「想定反論:」/recommendedTalkTrack=「推奨トーク:」/doNotSay=「言わない:」プレフィックス**・CONTEXT_TEXT_LIMIT 800字・**related IDs 未展開・MAX_PER_TABLE=3/MAX_TOTAL=5 維持・外部LLM時は externalAiAllowed=true＋maskText のみ=構造的にゼロ**）＋smoke **18本目追加**（ナレッジ検索「美容室 予約 導線 切り口」→ AIの回答＋参照した会社の頭脳＋「美容室向け・予約導線の切り口」表示・+9行のみ・既存17本無変更）＋`docs/audit/60_phase2b5_sales_playbook_ai_reference_impl.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2B5SalesPlaybookAI参照実装.md`（index からリンク）＋本ファイル。**条件付き許可ファイル（knowledge/search/page.tsx・audit.ts・db.ts）は変更不要で完走**＝ai_reference は既存 writeAIDataAccess 流用でレコードごと自動記録。**検証全green（db:generate・test 211・typecheck・lint・build・migrate deploy pendingなし・seed playbooks:6・/login 200・smoke 18/18 green 既存17本回帰なし・検証RED 0回）**。**schema/migration/seed/rbac/labels/package/lock 無変更・AI mutation なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・push なし（commit-only）・本番確認未実施・GO済み基準は Phase 2-B-4/`26a7a30` のまま**。次は push-only（別承認）→ 本番確認（本番に実在する営業プレイブックで・doc61 候補）→ **Phase 2-B 全体クローズ判定**。詳細 `docs/audit/60_phase2b5_sales_playbook_ai_reference_impl.md`。反映状態は git refs を正とする。

- Phase 2-B-5-ENTRY「SalesPlaybookEntry AI参照追加の設計確認（docs-only・判定 READY / GO）」: `docs/audit/59_phase2b5_sales_playbook_ai_reference_design.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2B5SalesPlaybookAI参照設計.md`（index からリンク）＋本ファイル。**AIが営業プレイブックを読む段の実装前設計を、既存コードの read-only 確認に基づいて固定**: ①2-A-3c-2 の AI参照ヘルパー（company-brain-reference.ts・read-only・tenantId・archivedAt:null・NORMAL/INTERNAL・canAccessLabel・各3件/計5件上限・外部LLM時は externalAiAllowed=true＋maskText のみ）に**3テーブル目として追加する最小差分で実現可能**と確認 ②schema変更・migration 不要（必要フィールド・index [tenantId,label] とも既存）③変更は実質1ファイル＋smoke 18本目（knowledge/search は型 union 拡張で変更不要見込み）④監査ログは既存 writeAIDataAccess 流用・レコードごと1件・entityType='SalesPlaybookEntry'・purpose に本文/PII なし ⑤固有注意点: doNotSay は「言わない:」プレフィックス付き文脈化・related IDs の展開はスコープ外・MAX_TOTAL=5 据え置き ⑥外部LLMへの送出は全件 externalAiAllowed=false のため構造的にゼロ。**実装なし・AI参照実行なし・schema/migration/seed/rbac/labels/package/lock 無変更・DB操作なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・push なし（commit-only）**。**GO済み基準は Phase 2-B-4/`26a7a30` のまま**。次は doc59 の push（別承認）→ **Phase 2-B-5 実装の承認判断**。詳細 `docs/audit/59_phase2b5_sales_playbook_ai_reference_design.md`。反映状態は git refs を正とする。

- Phase 2-B-4-PROD「SalesPlaybookEntry 人間書き込みの本番確認記録（docs-only・**GO**）」: `docs/audit/58_phase2b4_production_confirmation.md` 新規＋doc14 §49 追記＋CURRENT_STATE 更新（**GO済み基準を Phase 2-B-4/`26a7a30` に更新**・前基準 2-B-3/`a2bb2b6` は保持）＋`369-vault/知識/Phase2B4本番確認.md`（index からリンク）＋本ファイル。**commit `26a7a30` の本番動作を利用者実測で確認し GO を記録（2026-07-04・実測値はチャット提出・実測日は利用者申告値をそのまま記録）**: Vercel Ready/green・latest commit 26a7a30・ログインOK・ナビOK・一覧OK・**作成→編集→アーカイブの1周 OK**（テスト用タイトル「テスト用・営業プレイブック確認」・架空内容のみ・PII/成果数値/口コミ/顧客の声/実価格なし）・**機密ラベル2択のみ**・**外部AI送信を許可するUIなし**・**入力ガイド表示**・**監査ログに writeAudit 3操作すべて記録**・既存画面（会社方針・商品カタログ・ナレッジ検索・顧客・LeadMap）無回帰・エラー/外部送信/SNS/口コミ/顧客の声公開/ENSHiN OS外部発信なし。**AI が本番接続確認したものではない**。書き込み本番確認は doc41・doc43 に続く3例目（同じ型で完走）。**Phase 2-B-4 は本番確認まで完全クローズ**。docs-only・コード変更なし・DB操作なし・push なし（commit-only）。次は doc58 の push（別承認）→ **Phase 2-B-5（AI参照追加）の承認判断**。詳細 `docs/audit/58_phase2b4_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-B-4「SalesPlaybookEntry 人間書き込み（作成・編集・アーカイブ・判定 GO・commit-only）」: `apps/web/app/(app)/brain/playbooks/actions.ts` 新規（create/update/archive の3 Server Action・**isHumanUser による AI mutation禁止（rbac.ts 無変更）と label 2択（NORMAL/INTERNAL）を最初から組み込み**・requireUser→hasPermission（knowledge:create/update）→入力検証（playbookType 4種のみ）→tenantId＋archivedAt:null スコープ→prisma→**writeAudit 3操作すべて**・**物理削除なし**・**externalAiAllowed は create=false 固定・update 不変更・true UI なし**・relatedPolicyIds/relatedProductCatalogItemIds の参照選択UIは未実装=空のまま将来拡張）＋`new/page.tsx`・`[id]/edit/page.tsx` 新規（**入力ガイド明記: 顧客名・会社名・個人名・成果数値・口コミ・顧客の声・実価格を書かない**・高機密ラベルは編集フォーム非表示）＋一覧 `page.tsx` に権限別ボタン（新規作成/編集/アーカイブ・denied バナー・説明文を「AIは書き換えできません」へ更新）＋smoke **16本目を意図的に期待値更新（ナビ経由確認へ・テスト削除ではない・doc57 §5）＋17本目追加（作成フロー）**＋`docs/audit/57_phase2b4_sales_playbook_write.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2B4SalesPlaybook書き込み.md`（index からリンク）＋本ファイル。**検証全green（db:generate・test 211・typecheck・lint・build 3ルート生成・migrate deploy pendingなし・seed playbooks:6・/login 200・smoke 17/17 green 既存15本回帰なし・修正ループ0回）**。**schema/migration/seed/rbac/labels/package/lock 無変更・writeDataAccess/AI参照なし（2-B-5 別承認）・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・push なし（commit-only・feature push も未実施）・本番確認未実施・GO済み基準は Phase 2-B-3/`a2bb2b6` のまま**。次は push-only（別承認）→ 本番確認（doc49 の型・doc58 候補・作成→編集→アーカイブ1周）→ 2-B-5 承認判断。詳細 `docs/audit/57_phase2b4_sales_playbook_write.md`。反映状態は git refs を正とする。

- Phase 2-B-3-PROD-2「営業プレイブック ナビHOLDの再実測記録（docs-only・**HOLD解消・GO**）」: `docs/audit/56_phase2b3_prod2_nav_recheck.md` 新規＋doc14 §48 追記＋CURRENT_STATE 更新（**GO済み基準を Phase 2-B-3/`a2bb2b6` に更新**・前基準 2-B-2/`811b8c6` は保持）＋`369-vault/知識/Phase2B3ナビ再確認.md`（index からリンク）＋本ファイル。**利用者再実測（2026-07-06）: ハードリロードでナビに「営業プレイブック」が出た＝HOLD の唯一のNGが解消**。直打ちOK・空一覧（本番 seed 未実行のため正常）・ボタンなし・既存画面OK・エラーなし・外部送信/SNS/口コミ/顧客の声公開なし・Vercel Ready。**AI が本番接続確認したものではない**。原因の整理: ハードリロードで解消したため**ブラウザキャッシュ／古いタブのJSバンドル起因の可能性が高い**（repo側は read-only 調査で潔白確認済み・**コード修正は1行も不要だった**・doc37→38 と同型の3例目）。doc55/§47 の HOLD 記録は消さず追記主義で解消。**Phase 2-B-3 は本番確認まで完全クローズ**。次は doc56 の push（別承認）→ **Phase 2-B-4（人間書き込み）承認判断**（smoke へのナビ表示検証追加も改善候補）。詳細 `docs/audit/56_phase2b3_prod2_nav_recheck.md`。反映状態は git refs を正とする。

- Phase 2-B-3-PROD「SalesPlaybookEntry read-only 可視化の本番確認記録（docs-only・**判定 HOLD**・GO記録を main 反映前に差し止め訂正）」: `docs/audit/55_phase2b3_production_confirmation.md`（当初 GO で作成 → **HOLD へ訂正**）＋doc14 §47（HOLD へ訂正・origin/main 比 append-only 維持）＋CURRENT_STATE 更新（**GO済み基準は Phase 2-B-2/`811b8c6` のまま更新しない**）＋`369-vault/知識/Phase2B3本番確認.md`（HOLD へ訂正）＋index＋本ファイル。経緯: 初回報告「全てGO」に基づく GO記録 commit（`6c1b5e9`・feature のみ）作成後、**利用者の追加実測（再確認・2026-07-05）で「営業プレイバックは再確認をしたら表示されていない」= NG** の報告 → GO 条件不成立のため、**main 反映前に HOLD 記録へ訂正**（前回GO記録は main 未反映のまま取り消し相当・履歴は上書きしない）。その後の**最新詳細実測で症状はナビ表示のみに特定**: ナビに「営業プレイブック」が出ない=唯一のNG。**/brain/playbooks 直打ちは開く・空一覧（seed未実行のため正常）・ボタンなし・既存画面・エラーなし・外部送信なし=すべてOK**。**原因は未特定・断定しない**（有力観点: ナビ=共通部品のキャッシュ/反映タイミング=doc37→38 と同型の前例／repo側 nav 表示条件の read-only 確認）。**AI が本番接続確認したものではない**。コード修正なし・DB操作なし・外部送信なし・ENSHiN OS外部発信なし。次は HOLD訂正の main 反映（push-only・別承認）→ **read-only 原因調査** → 再実測 → GO記録（doc56 候補）。**HOLD 解消まで 2-B-4 に進まない**。詳細 `docs/audit/55_phase2b3_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-B-3「SalesPlaybookEntry read-only 可視化（判定 GO・commit-only）」: `packages/db/prisma/seed.ts`（SalesPlaybookEntry 架空デモデータ **6件** 追記のみ・playbookType 4種網羅=approach2/objection2/preparation1/talk_track1・全件 externalAiAllowed=false・NORMAL/INTERNAL のみ・**PII/実顧客名/実会社名/成果数値/実価格/口コミ/顧客の声/testimonial ゼロ**・doNotSay に No.1表記/効果保証/誇大広告の禁止サンプル・件数ログ playbooks 追加）＋`apps/web/app/(app)/brain/playbooks/page.tsx` 新規（**read-only 一覧**・requireUser＋knowledge:read＋tenantId・archivedAt:null のみ・作成/編集/削除/Server Action/ボタンなし）＋`components/shell/nav.ts` に営業プレイブック1行（既存 BookText icon 流用）＋smoke 末尾1本追加（16本目: 一覧表示＋read-only 確認・既存15本無変更）＋`docs/audit/54_phase2b3_sales_playbook_readonly.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2B3SalesPlaybook可視化.md`（index からリンク）＋本ファイル。**検証全green（db:generate・test 211・typecheck・lint・build・migrate deploy pendingなし・seed playbooks:6・/login 200・smoke 16/16 green 既存15本回帰なし・修正ループ0回）**。**schema/migration/rbac/labels/package/lock 無変更・writeAudit/writeDataAccess/AI参照なし（2-B-4/2-B-5 別承認）・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・push なし（commit-only・feature push も未実施）・本番確認未実施**。次は push-only（別承認）→ 本番確認（空一覧が正常・doc55 候補）→ 2-B-4 承認判断。詳細 `docs/audit/54_phase2b3_sales_playbook_readonly.md`。反映状態は git refs を正とする。

- Phase 2-B-2-PROD「SalesPlaybookEntry schema変更の本番確認記録（docs-only・GO）」: `docs/audit/53_phase2b2_production_confirmation.md` 新規＋doc14 §46 追記＋CURRENT_STATE 更新（**GO済み基準を Phase 2-B-2/`811b8c6` に更新**・前基準 2-A-3c-2/`85f1bf3` は保持）＋`369-vault/知識/Phase2B2本番確認.md`（index からリンク）＋本ファイル。**commit `811b8c6` の本番動作を利用者実測で確認し GO を記録（2026-07-05）**: Vercel Ready/green・**build成功（=CREATE TABLE+INDEX のみの migration が本番DBで正常完了）**・latest commit 811b8c6・ログインOK・会社の頭脳/ナレッジ検索/顧客/LeadMap 既存画面無回帰・**Sales Playbook 画面なしが正常（schema-only）**・エラーなし・外部送信/SNS/口コミ/顧客の声公開なし。**AI が本番接続確認したものではない**。コード変更なし・DB手動操作なし・migrate deploy 手動実行なし。**UI・seed・AI参照は未実装（2-B-3 以降・別承認）**。次は doc53 の main 反映（push-only・別承認）→ Phase 2-B-3 承認判断。詳細 `docs/audit/53_phase2b2_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-B-2「SalesPlaybookEntry schema変更・migration作成（判定 GO）」: `packages/db/prisma/schema.prisma` に model SalesPlaybookEntry 追加（追加35行のみ・削除行0・既存model/enum無変更・relation なし・doc51 §4 の22フィールド＋index 3本）＋新規 migration `20260703175140_phase2b2_sales_playbook`（**CREATE TABLE＋INDEX 3本のみ・DROP/DELETE/TRUNCATE/ALTER/FK ゼロ**）＋`docs/audit/52_phase2b2_sales_playbook_schema_change.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2B2SalesPlaybookSchema変更.md`（index からリンク）＋本ファイル。§0 人間承認: APPROVED（呼称=Phase 2-B のまま／参照構造=ID配列／playbookType=approach・objection・preparation・talk_track）。**検証全green: DB URL localhost 確認（値非表示）→ validate → migrate dev（ローカル適用＋generate）→ migrate status up to date → test 211 → typecheck → lint → build**。未実施: E2E（schema-only・UI変更なしのため）・seed（今回禁止）・**本番確認（main push 別承認後に doc49 の型で実施）**。**UIなし・実装なし・seedなし・rbac/labels/package/lock無変更・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし**。次は push-only（別承認）→ 本番確認 → Phase 2-B-3 承認判断。詳細 `docs/audit/52_phase2b2_sales_playbook_schema_change.md`。反映状態は git refs を正とする。

- Phase 2-B-1「SalesPlaybookEntry 設計 docs-only（判定 GO）」: `docs/audit/51_phase2b1_sales_playbook_design.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2B1SalesPlaybook設計.md`（index からリンク）＋本ファイル。**「売り方の型」専用テーブルの設計案を固定（三段承認の第一段）**: 既存 CompanyPolicy / ProductCatalogItem の schema 実定義を read-only 確認し流儀を踏襲（tenantId スカラ・ConfidentialityLabel default INTERNAL・String[] tags・archivedAt・externalAiAllowed false 封印）。フィールド案 22項目＋**関連参照は ID配列案（String[]）を推奨**（relation なし ID 参照 = productAssetId / chunkIds の既存前例と一致・比較表つき・採否は 2-B-2 の人間判断）。**顧客名・会社名・成果数値・口コミ・顧客の声を書かない入力ガイド必須**・書きたくなったら Case Study 領域へ（許諾管理等とセットで別承認）。AI mutation禁止・label 2択・高機密未対応・writeAudit（2-B-4）/ ai_reference（2-B-5）の適用計画・doc49 の本番確認プレイブック適用・三段承認計画（2-B-2 schema→2-B-3 read-only→2-B-4 書き込み→2-B-5 AI参照）。**schema変更なし・migration なし・実装なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8 なし**。次は doc51 の main 反映（push-only・別承認）→ Phase 2-B-2 schema変更の承認判断。詳細 `docs/audit/51_phase2b1_sales_playbook_design.md`。反映状態は git refs を正とする。

- Phase 2-B-ENTRY「Company Brain 後続領域の入口レビュー（docs-only・判定 READY / GO）」: `docs/audit/50_phase2b_entry_review.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2B入口レビュー.md`（index からリンク）＋本ファイル。**doc33 の後続3領域（Case Study / Customer Pain / Sales Playbook）を PII・許諾・外部発信・ENSHiN OS 近接で比較評価**: 推奨 = **Phase 2-B-1: SalesPlaybookEntry 設計 docs-only**（PII最遠・2-A安全境界とdoc49プレイブックを流用可・価値が早い）。Case Study は**顧客の声・testimonial・外部公開に近接するため許諾管理・公開前承認・広告表現チェック・外部発信ログの設計とセットでのみ後続着手**。Customer Pain は PII近接度最高・高機密ラベル対応（別の重い承認）の後で最後。呼称整理を明記（roadmap 01 の 2-B=CRM/Sales AI とは別物・人間判断へ）。Enshin OS 詳細仕様は未提供のまま証拠不足を維持（doc07 方針・推測で断定しない）。**実装なし・schema/migration なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8 なし**。次は doc50 の main 反映（push-only・別承認）→ Phase 2-B-1 承認判断。詳細 `docs/audit/50_phase2b_entry_review.md`。反映状態は git refs を正とする。

- Phase X-04「本番スモーク定型化・本番確認プレイブック作成（docs-only・判定 GO）」: `docs/audit/49_phase_x04_production_smoke_playbook.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/PhaseX04本番スモーク定型化.md`（index からリンク）＋本ファイル。**Phase 2-A の本番確認7回（GO 5・HOLD 2・HOLD解消 2）の実績から「本番確認の型」を固定**: 絶対原則（利用者実測のみ・AI が本番接続確認したものではない注記・捏造禁止）／§0 実測値テンプレート標準形（未記入なら停止・NGは実画面の文言まで記録）／GO・HOLD・STOP 判定ルール／**本番に実在するデータで確認する原則**／テストデータは本番UIのGO済み機能で作りアーカイブで片付ける／docs-only 記録とコード修正の分離／**ENSHiN OS 向け追加停止条件（口コミ・SNS・顧客の声・推薦コメント・ブランディング投稿の自動公開禁止・許諾必須・広告表現は人間法務判断へ）**／Phase 2-B 以降の標準プロンプト骨子。**script化・E2E拡張・本番自動監視は未実装で後続別承認**。docs-only・コード変更なし・本番接触なし・外部送信なし・課金なし。次は doc49 の main 反映（push-only・別承認）→ Phase 2-B / script化 / 3c-5 / ENSHiN OS 資料の人間選択。詳細 `docs/audit/49_phase_x04_production_smoke_playbook.md`。反映状態は git refs を正とする。

- Phase 2-A-CLOSE「Company Brain foundation 全体クローズ判定（docs-only・判定 GO）」: `docs/audit/48_phase2a_completion_record.md` 新規＋doc14 §45 追記＋CURRENT_STATE 更新（Phase 2-A を正式完了に・完了対象の最新本番確認GO済み基準 Phase 2-A-3c-2/`85f1bf3`）＋`369-vault/知識/Phase2A完了.md`（index からリンク）＋本ファイル。**doc31 入口条件・doc33 設計（先行2テーブル）と doc33〜47 の実績を照合し、完了判定15条件すべて証拠付きで充足 → Phase 2-A-CLOSE 判定 GO（2026-07-04）**: 器（schema・`ca18450`）→ read-only 可視化（`9533488`）→ 人間書き込み2テーブル（`706358e`・`aa40f2f`）→ AI参照＋ai_reference ログ（`85f1bf3`）まで全段本番確認GO。HOLD 2件（doc37・doc46）は追記主義（doc38・doc47）で解消済み。**後続送り（別承認）: 高機密ラベル・externalAiAllowed true UI・外部LLM送信解禁・3c-5・後続3テーブル・Phase 8・MCP/API公開・ENSHiN OS外部発信**。docs-only・コード変更なし・外部送信なし・課金なし。次は doc48 の main 反映（push-only・別承認）→ Phase 2-B / X-04 / 3c-5 / ENSHiN OS 資料の人間選択。詳細 `docs/audit/48_phase2a_completion_record.md`。反映状態は git refs を正とする。

- Phase 2-A-3c-2-PROD-2「Company Brain AI参照の本番HOLD解消・再実測GO記録（docs-only）」: `docs/audit/47_phase2a3c2_hold_resolution_go.md` 新規＋doc14 §44 追記＋CURRENT_STATE 更新（**GO済み基準を Phase 2-A-3c-2/`85f1bf3` に更新**・前基準 2-A-3b-2/`aa40f2f` は保持）＋`369-vault/知識/Phase2A3c2HOLD解消.md`（index からリンク）＋本ファイル。**HOLD（doc46＋doc14 §43・記録として保持）後の利用者再実測で GO（2026-07-04）**: 本番一覧に「値引き承認ルール」は**存在せず（NOT_PRESENT）**・初回検索でも実は既存ナレッジ由来の AI回答は表示されていた＝**前回HOLDの原因は本番データ前提差でありコードのバグではない**と実測で確定。本番UI（GO済み機能）で会社方針を作成後、**AI回答・「参照した会社の頭脳」・参照元タイトル・CompanyPolicy の ai_reference ログすべて OK**・既存検索/既存画面OK・外部送信なし。**AI が本番接続確認したものではない**。コード修正なし・DB直接操作なし・schema/migration/rbac/labels 変更なし・外部LLM送信なし・ENSHiN OS外部発信なし。教訓: 本番確認は本番に実在するデータで行う手順にする。次は doc47 の main 反映（push-only・別承認）→ Phase 2-A 全体クローズ判定 or 3c-5 判断。詳細 `docs/audit/47_phase2a3c2_hold_resolution_go.md`。反映状態は git refs を正とする。

- Phase 2-A-3c-2-PROD「Company Brain AI参照の本番確認記録（docs-only・判定 HOLD）」: `docs/audit/46_phase2a3c2_production_confirmation.md` 新規＋doc14 §43 追記＋CURRENT_STATE 更新（**GO済み基準は Phase 2-A-3b-2/`aa40f2f` のまま更新しない**）＋`369-vault/知識/Phase2A3c2本番確認.md`（index からリンク）＋本ファイル。**commit `85f1bf3` の本番確認は利用者実測で HOLD（2026-07-04）**: Vercel Ready・latest commit 85f1bf3・ログインOK・既存ナレッジ検索/既存画面/外部送信不発生は OK（無回帰）だが、**「値引き承認ルール」で AI回答が表示されず「参照した会社の頭脳」セクションも未表示**のため GO にしない。**原因は未特定・断定しない**（参考仮説: 本番は seed 未実行のため該当データ不在の前提差の可能性／AI回答未表示は別要因の可能性＝doc46 §3）。**AI が本番接続確認したものではない**。コード変更なし・DB/schema/migration/rbac/labels 変更なし・外部LLM送信なし・ENSHiN OS外部発信・口コミ・SNS・顧客の声公開なし・**push なし（commit-only）**。次は HOLD記録の main 反映（別承認）→ read-only 原因調査。詳細 `docs/audit/46_phase2a3c2_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-A-3c-2「Company Brain AI参照（取得＋ai_referenceログ＋ナレッジ検索注入）最小実装」: `apps/web/lib/company-brain-reference.ts` 新規（read-only 参照候補取得: tenantId・archivedAt:null・NORMAL/INTERNAL・canAccessLabel・決定的な簡易一致順位付け・各3件/計5件上限・**外部LLM時は externalAiAllowed=true のみ＋maskText＝現状注入ゼロの安全側デフォルト**）＋`knowledge/search/page.tsx` 最小注入（既存ガード/検索/引用は無変更。contexts 追加＋**参照レコードごとの writeAIDataAccess(ai_reference) 記録**＋「参照した会社の頭脳」表示）＋smoke 15本目（既存14本無変更）＋`docs/audit/45_phase2a3c2_company_brain_ai_reference_impl.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A3c2CompanyBrainAI参照.md`（index からリンク）＋本ファイル。**検証全green（test 211・typecheck・lint・build・migrate deploy pendingなし・seed・smoke 15/15 green・既存14本回帰なし・修正ループ0回）**。**AI mutation なし／外部LLM送信なし／高機密未対応のまま／schema・migration・rbac・labels・seed・brain/**・package/lock 無変更／ENSHiN OS外部発信・口コミ・SNS・顧客の声公開なし／本番確認未実施・push未実施（commit-only・push は別承認）**。詳細 `docs/audit/45_phase2a3c2_company_brain_ai_reference_impl.md`。反映状態は git refs を正とする。

- Phase 2-A-3c-1「Company Brain AI参照経路＋writeDataAccess 設計（docs-only）」: `docs/audit/44_phase2a3c_ai_reference_design.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A3cAI参照設計.md`（index からリンク）＋本ファイル。**AI が Company Brain を読む段の設計を、既存コードの read-only 実測に基づいて固定**: ①ナレッジ検索に AI 参照の完成形パターン（safeAiInput→canAccessLabel→回答→writeAIDataAccess(ai_reference)→AnswerCitation 引用）が既存であることを発見・流用 ②参照範囲=tenantId・archivedAt:null・NORMAL/INTERNAL のみ ③externalAiAllowed の3層分岐（内部参照=可／外部LLM=true＋maskText のみ・true UI が無いため構造的にゼロ＝安全側デフォルト）④writeDataAccess はレコードごと1件を推奨（粒度は人間判断）⑤第一接続タスクは**ナレッジ検索を推奨**（4候補比較）⑥3c-2〜3c-5 の分割案と未決定7点を人間判断として列挙。**実装なし・schema/migration/rbac/labels 変更なし・AI参照実行なし・writeDataAccess実行なし・外部LLM送信なし・ENSHiN OS外部発信/口コミ/SNS/顧客の声公開なし**。次は Phase 2-A-3c-2 実装承認判断（別承認）。詳細 `docs/audit/44_phase2a3c_ai_reference_design.md`。反映状態は git refs を正とする。

- Phase 2-A-3b-2-PROD「ProductCatalogItem 書き込み本番確認記録（docs-only）」: `docs/audit/43_phase2a3b2_production_confirmation.md` 新規＋doc14 §42 追記＋CURRENT_STATE 更新（GO済み基準を Phase 2-A-3b-2/`aa40f2f` に更新・前基準 2-A-3b-1/`706358e` は保持）＋`369-vault/知識/Phase2A3b2本番確認.md`（index からリンク）＋本ファイル。**commit `aa40f2f` の本番動作を利用者実測で確認し GO を記録（2026-07-04）**: Vercel Ready・latest commit aa40f2f・作成・編集・アーカイブの1周 OK・**機密ラベル2択（通常/社内限のみ）OK・価格メモの「請求・課金に使わない」注意書き OK**・監査ログに ProductCatalogItem の記録・既存画面回帰なし。**AI が本番接続確認したものではない**。**Company Brain の2テーブル（会社方針＋商品カタログ）の人間書き込みは本番確認まで完全クローズ**。コード変更なし・DB/schema/migration/rbac/labels/seed 無変更・課金・決済・外部送信・SNS投稿・口コミ投稿・顧客の声公開なし。**writeDataAccess と AI参照経路は未実装（別承認）**。詳細 `docs/audit/43_phase2a3b2_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-A-3b-2「ProductCatalogItem 書き込み最小実装（作成・編集・アーカイブ）」: `apps/web/app/(app)/brain/catalog/actions.ts` 新規（create/update/archive の3 Server Action・**isHumanUser による AI mutation禁止と label 2択（NORMAL/INTERNAL）を最初から組み込み**・requireUser→hasPermission（knowledge:create/update）→入力検証→tenantIdスコープ→prisma→writeAudit）＋`new/page.tsx`・`[id]/edit/page.tsx` 新規（高機密ラベルは編集フォーム非表示・priceNote は請求・課金に使わない注記）＋一覧に権限別ボタン＋smoke 末尾1本追加（作成→一覧反映）＋`docs/audit/42_phase2a3b2_product_catalog_write.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A3b2ProductCatalog書き込み.md`（index からリンク）＋本ファイル。**検証全green（test 211・typecheck・lint・build・migrate deploy pendingなし・seed policies:5/catalogItems:8・smoke 14/14 green・既存13本回帰なし・修正ループ0回）**。**物理削除なし／externalAiAllowed は UI で true にできない／productAssetId・在庫・請求・見積連携なし／brain/policies・schema・migration・rbac・labels・seed・nav・package/lock 無変更／本番確認は未実施（main push→利用者実測が次）／writeDataAccess は次段送り／課金・決済・外部送信・ENSHiN OS外部発信なし**。詳細 `docs/audit/42_phase2a3b2_product_catalog_write.md`。反映状態は git refs を正とする。

- Phase 2-A-3b-1-PROD「CompanyPolicy 書き込み本番確認記録（docs-only）」: `docs/audit/41_phase2a3b1_production_confirmation.md` 新規＋doc14 §41 追記＋CURRENT_STATE 更新（GO済み基準を Phase 2-A-3b-1/`706358e` に更新・前基準 2-A-3a/`9533488` は保持）＋`369-vault/知識/Phase2A3b1本番確認.md`（index からリンク）＋本ファイル。**commit `706358e`（実装 `9eea086`＋安全補正）の本番動作を利用者実測で確認し GO を記録（2026-07-04）**: Vercel Ready・latest commit 706358e・作成・編集・アーカイブの1周 OK・**機密ラベルは「通常」「社内限」の2択のみ**・監査ログに CompanyPolicy の記録・既存画面回帰なし。**AI が本番接続確認したものではない**。コード変更なし・DB/schema/migration/rbac/labels/seed 無変更・課金・決済・外部送信・SNS投稿・口コミ投稿・顧客の声公開なし。**ProductCatalogItem 書き込みと writeDataAccess は未実装（2-A-3b-2 以降・別承認）**。詳細 `docs/audit/41_phase2a3b1_production_confirmation.md`。反映状態は git refs を正とする。

- Phase 2-A-3b-1-SAFE「CompanyPolicy 書き込み境界の安全補正」: `brain/policies/actions.ts`（`isHumanUser` 追加=AIロールは create/update/archive を権限判定前に一律拒否・`ALLOWED_LABELS` を NORMAL/INTERNAL のみに縮小）＋`new/page.tsx`・`[id]/edit/page.tsx`（label 選択肢を2択に・高機密ラベルの方針は編集フォーム自体を出さない）＋`docs/audit/40_phase2a3b1_company_policy_safety_patch.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A3b1安全補正.md`（index からリンク）＋本ファイル。**監査で AI_AGENT の knowledge:create（下書き原則・他機能向け）経由の理論経路を特定し、rbac.ts 無変更のまま actions.ts 側で会社方針の mutation を人間専用化**。高機密ラベル（CONFIDENTIAL/STRICT_SECRET/EXECUTIVE_ONLY 等）は **writeDataAccess 実装時まで保留**。**検証全green・smoke 13/13 green 維持（既存12本回帰なし）・rbac/labels/schema/migration/seed/smoke/package 無変更・外部送信・課金・本番接触なし**。詳細 `docs/audit/40_phase2a3b1_company_policy_safety_patch.md`。反映状態は git refs を正とする。

- Phase 2-A-3a-PROD-2「Company Brain 本番確認の HOLD解消・再実測GO記録（docs-only）」: `docs/audit/38_phase2a3a_hold_resolution_go.md` 新規＋doc14 §40 追記＋CURRENT_STATE 更新（GO済み基準を Phase 2-A-3a/`9533488` に更新・前基準 2-A-2/`ca18450` は保持）＋`369-vault/知識/Phase2A3a本番確認.md` 末尾追記＋index 1行更新＋本ファイル。**HOLD（doc37＋doc14 §39・記録として保持）後の利用者再実測で全項目 GO（2026-07-03）**: Vercel Ready・latest commit 9533488・ナビ「会社の頭脳」表示・`/brain/policies`・`/brain/catalog` が開く・作成/編集/削除ボタン無し（read-only で正常）・既存画面すべて正常。seed は本番で自動実行されないため一覧が空でも正常。前回NGの原因はキャッシュ/反映タイミングの可能性が高いが断定しない。**AI が本番接続確認したものではない**。コード変更なし・DB操作なし・schema/migration 変更なし・課金・決済・外部送信なし。**Phase 2-A-3a は本番確認まで完全クローズ**。次は main push（別承認）→ Phase 2-A-3b 承認判断。詳細 `docs/audit/38_phase2a3a_hold_resolution_go.md`。反映状態は git refs を正とする。

- Phase 2-A-3a「Company Brain 最小可視化（seed＋read-only 一覧）」: `packages/db/prisma/seed.ts`（CompanyPolicy 5件＋ProductCatalogItem 8件・全件 externalAiAllowed=false・label は NORMAL/INTERNAL のみ・PII/secret/実価格なし）＋read-only 2画面新規（`/brain/policies`・`/brain/catalog`。requireUser＋knowledge:read＋tenantId スコープ・作成/編集/削除/Server Action なし）＋ナビ1行（`components/shell/nav.ts` に「会社の頭脳」）＋smoke 末尾1本追加＋`docs/audit/36_phase2a3a_company_brain_readonly.md` 新規＋CURRENT_STATE 更新＋`369-vault/知識/Phase2A3aCompanyBrain可視化.md`（index からリンク）＋本ファイル。**検証全green（test 211・typecheck・lint・build・seed policies:5/catalogItems:8・smoke 12/12 green・既存11本回帰なし）**。**schema・migration・RBAC・labels・package/lock 無変更／作成・編集・writeAudit/writeDataAccess 本実装は 2-A-3b へ送り（別承認）／課金・決済・外部送信・本番接触なし**。詳細 `docs/audit/36_phase2a3a_company_brain_readonly.md`。反映状態は git refs を正とする。

## Customer Pain schema設計 — docs-only・schema変更なし・migrationなし・READY / GO

- doc114 新規: `docs/audit/114_customer_pain_schema_design_docs_only.md`。doc113（候補C前提設計）を受け、本実装に必要になり得る**最小schema候補を紙で設計**（実装ではない）。
- **schema変更なし・migrationなし・schema.prisma変更なし**。候補フィールド（id/tenantId/title/body/category/severity/status/label/archivedAt/createdAt/updatedAt/createdByUserId/updatedByUserId）を列の意味・PII注意・一覧/詳細可否・writeAudit/writeDataAccess対象で整理。
- **入れてはいけない列**（customerName/contactName/phone/email/address/生本文/sourceUrl/externalAiAllowed/publishStatus/publicUrl/seoSlug/customerVoice/customerId）を明記。**customerIdは結合リスクで別承認・enum化も別承認**。tenantId必須・archivedAtソフトアーカイブ（物理削除なし）・createdBy/updatedByはuserId参照のみ（個人名複製なし）。
- 標準閲覧式（doc110 canViewCustomerPainDetail）を使う前提候補だが**実接続はまだしない**。**AIに読ませない（company-brain-referenceに入れない・AI参照条件変更なし）・公開なし（externalAiAllowed/publishStatusなし）**。**3案比較→推奨案A（NO_SCHEMA_CHANGE_AND_DESIGN_ONLY）**。事前停止条件（schema/migration/enum追加/customerId参照/PII保存/AI参照/公開導線/本番）を固定。read-only安全確認 `node scripts/check-company-brain-safety.mjs` exit 0。
- **解禁なし・Customer Pain本実装/runtime実装0・schema/migration/RBAC/label定義変更なし・company-brain-reference変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。次は **doc114 push-only**（別承認）→ Customer Pain schema実装可否判断。

## Customer Pain 候補C 前提設計 — schema/migration前のdocs-only・READY / GO

- doc113 新規: `docs/audit/113_customer_pain_candidate_c_prerequisite_design.md`。doc112（まだruntime解禁しない）を受け、候補C（Customer Pain schema/画面/Server Action/writeDataAccess/writeAudit 実接続）へ進む前の前提を設計。
- **候補Cは schema/migration を伴うため最も重く別の重い人間承認**。schema要否＝実装するなら最終的に必要だが**今回は決めない（schema変更なし・migrationなし）**・必要と判明したら停止。最小schema候補は方向性のみ（PII/顧客名/担当者名なし・**customerId参照は別承認**・本文複製なし・archivedAt前提・tenantId必須・labelはCUSTOMER_CONFIDENTIAL前提候補だがruntime解禁はまだ）。
- 画面＝一覧プレースホルダ・詳細は候補Aの標準閲覧式を満たす人間のみ・許可判定前に本文非取得・詳細のたび**writeDataAccess**。書き込み＝create/update/archiveのみ・物理削除なし・restore/label変更/customerId変更は別承認・**writeAudit**必須。**AIに読ませない（company-brain-referenceに入れない・AI参照条件変更なし）・公開なし（PR/SEO/SNS/externalAiAllowed/publishStatus UIなし）**。
- 事前停止条件（schema/migration/RBAC/label定義変更・customerId参照・PII/実顧客データ保存・AI参照・公開導線・本番確認）を固定。**推奨は案A（候補C schema設計docs-only）**／案B品質基盤／案C保留。read-only安全確認 `node scripts/check-company-brain-safety.mjs` exit 0。
- **解禁なし・Customer Pain本実装/runtime実装0・schema/migration/RBAC/label定義変更なし・company-brain-reference変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。次は **doc113 push-only**（別承認）→ Customer Pain schema設計docs-only。

## 高機密ラベル実装・解禁 可否判断（候補A+B完了後）— まだ runtime 解禁しない・docs-only・GO

- doc112 新規: `docs/audit/112_high_confidential_label_enablement_decision_after_candidate_ab.md`。候補A（doc110）＋候補B（doc111）完了後の「高機密ラベルを runtime 解禁してよいか」の §0 方針決定。
- 決定: **DO_NOT_ENABLE_RUNTIME_YET_AFTER_CANDIDATE_AB＝まだ runtime 解禁しない**。§0 12項目すべて安全側（CANDIDATE_A_AND_B_COMPLETED_AS_SAFETY_FOUNDATION／CANDIDATE_C=別の重い承認（schema/migration）／NEXT_PATH=候補C前提設計docs-only または品質基盤／DO_NOT_IMPLEMENT_CUSTOMER_PAIN_NOW／NO_SCHEMA/MIGRATION/RBAC/LABEL_CHANGE_NOW／PROHIBIT_AI_REFERENCE_AND_NO_COMPANY_BRAIN_REFERENCE_CHANGE／PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW／DOCS_ONLY_NOW）。
- 候補A+B完了は**安全の土台であって解禁条件ではない**。runtime解禁＝器(schema)＋実画面/Server Action/writeDataAccess/writeAudit実接続＋本番確認の重い工程。**推奨は案A（候補C前提設計docs-only・本実装ではない）**／案B品質基盤／案C保留。
- read-only安全確認 `node scripts/check-company-brain-safety.mjs` exit 0（actions4/ui156）。**解禁なし・Customer Pain runtime実装0・schema/migration/RBAC/label定義変更なし・company-brain-reference変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。次は **doc112 push-only**（別承認）→ 候補C前提設計docs-only または品質基盤強化。

## 高機密ラベル運用 候補B 安全ゲート静的検査 — scripts/check-company-brain-safety 拡張・GO

- doc111 新規: `docs/audit/111_high_confidential_label_static_safety_gate.md`。doc110 候補A の守りが後退したら機械検知する静的検査を、既存 `scripts/check-company-brain-safety.mjs` に**末尾追記で拡張**（新規script作成なし・既存の安全ゲートは1件も削除/弱体化なし）。
- 追加検査: 標準閲覧式5条件（tenantId × knowledge:update=canForRoles × canAccessLabel × AIロール除外=isHumanUser × archivedAt null）の消失FAIL・OR緩和(`||`)混入FAIL・`CUSTOMER_PAIN_LABEL`=CUSTOMER_CONFIDENTIAL固定・`CUSTOMER_PAIN_DENY_REASONS`維持・否定系テスト維持・**apps配下へのCustomerPain runtime混入FAIL**・**company-brain-referenceへのCustomerPain注入FAIL**・schema/labelsのCUSTOMER_CONFIDENTIAL各2件不変。
- 既存の会社ブレイン/CaseStudyの externalAiAllowed/publishStatus はグローバル禁止せず（Customer Pain固有トークンのみ検知・node_modules/.next/dist除外）。
- 検証: **node safety script exit 0（actions4/ui156）・pnpm test 265・typecheck exit 0・lint exit 0**＋負例（OR緩和/isHumanUser欠落/apps混入/label件数変化）でFAILすることを確認（no-opでない）。build未実施（.mjs+docs/tasks/vaultのみ・apps runtime不変・理由 doc111 §5）。
- **解禁なし・Customer Pain runtime実装0・schema/migration/RBAC/label定義変更なし・company-brain-reference変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。次は **doc111 push-only**（別承認）→ 高機密ラベル実装・解禁の可否判断。

## 高機密ラベル運用 候補A 実装 — 純粋権限判定関数＋否定系テスト

- doc110 新規: `docs/audit/110_high_confidential_label_access_predicate_implementation.md`。doc109 候補A（純粋権限判定関数＋否定系テスト・schema/migration 不要の範囲）のみを `packages/shared` 内で最小実装。
- 実装: 新規 `packages/shared/src/customer-pain-access.ts`（`canViewCustomerPainDetail` boolean＝**tenantId × knowledge:update × canAccessLabel(CUSTOMER_CONFIDENTIAL) × AIロール除外=isHumanUser × archivedAt null の AND・OR緩和禁止**／`evaluateCustomerPainAccess`＝拒否理由は安全な列挙値のみ）＋`index.ts` に export 1行。**AIロール除外は既存 isHumanUser を再利用（重複実装なし）・canForRoles/canAccessLabel も既存利用＝RBAC・label 定義は無変更**。**Prisma import なし・DB非依存・apps/web非参照・company-brain-reference非参照**。
- 否定系テスト新規 `packages/shared/src/__tests__/customer-pain-access.test.ts`（9ケース: tenant不一致／knowledge:updateなし(EXECUTIVE)／label許可なし(READ_ONLY)／AIロール混在(['STAFF','AI_AGENT'])は権限・label満たしても不可／archived／全条件満たす人間は可／OR緩和なし／拒否理由は安全な列挙値のみ）。
- 検証: **pnpm test 265（既存256+9・回帰なし）・typecheck exit 0・lint exit 0**。build は未実施（純粋関数のみ・typecheck で全ワークスペース型検査済み・理由 doc110 §8）。
- **writeDataAccess/writeAudit 実接続なし・Customer Pain画面/Server Action/schema/migrationなし・解禁なし・AI参照条件変更なし・company-brain-reference変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。次は **doc110 push-only**（別承認）→ 候補B 実装可否判断。

## 高機密ラベル運用 最小実装設計 — docs-only・READY / GO

- doc109 新規: `docs/audit/109_high_confidential_label_minimum_implementation_design.md`。doc108 の決定（DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN）に基づく最小実装の範囲・順序・停止条件の設計。
- 実装候補を **A（純粋権限判定関数 isHumanUser/canViewCustomerPainDetail ＋ 否定系テスト・schema/migration不要）／B（安全ゲート静的検査）／C（Customer Pain schema・画面・Server Action 本実装）** に分割し、**A+B 先行設計・schema/migration が必要な C は別の重い人間承認**を推奨。
- doc105 から **標準閲覧式**・**writeDataAccess / writeAudit** の記録粒度（本文・PII を入れない）・**安全ゲート**14種・**否定系テスト**15種・**事前停止条件**を継承・整理。本書は設計のみで A・B の実装もさらに別承認。
- **解禁なし・実装なし・Customer Pain実装なし・DB/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・company-brain-reference変更なし・PII/実顧客データ保存なし・push なし（commit-only）**。次は **doc109 push-only**（別承認）→ 候補A+B の実装可否判断。

## 高機密ラベル解禁可否 方針決定 — DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN（docs-only・GO）

- doc108 新規: `docs/audit/108_high_confidential_label_enablement_policy_decision.md`。doc107 の3案・§0候補を受けた人間の正式決定を記録。**案A（DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN）＝まだ解禁しない・次は高機密ラベル運用の最小実装設計 docs-only**。
- **§0 10項目すべて安全側決定**（HIGH_CONFIDENTIAL_ENABLEMENT_POLICY=DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN / NO_RUNTIME_ENABLEMENT_NOW / CUSTOMER_CONFIDENTIAL_ONLY_LATER / TENANT_KNOWLEDGE_UPDATE_LABEL_HUMAN_AND_ONLY / WRITE_DATA_ACCESS_REQUIRED_LATER / WRITE_AUDIT_REQUIRED_LATER / PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW / PROHIBIT_AI_REFERENCE / PROHIBIT_PUBLIC_USE / DOCS_ONLY_NOW）。承認範囲は docs-only の方針決定記録のみ（実装・解禁・本番反映・外部送信は未承認）。
- **実装なし・解禁なし・Customer Pain実装なし・Data Classification実装なし・DB/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・company-brain-reference変更なし・PII/実顧客データ保存なし・外部公開なし・本番確認なし・push なし（commit-only）**。次は **doc108 push-only**（別承認）→ 高機密ラベル運用の最小実装設計 docs-only。

## 高機密ラベル実装・解禁 可否判断 前提整理 — docs-only・READY / GO

- doc107 新規: `docs/audit/107_high_confidential_label_enablement_decision_prerequisite.md`。doc106 の番号体系に従い **Audit Doc 107 / Product Phase=Data Classification / Security Governance / Lineage=Data Classification / High Confidential Label / Stage=Enablement Decision Prerequisite** を明記。
- doc105 の**標準閲覧式（tenantId × knowledge:update × label許可ロール × AIロール除外）・安全ゲート・否定系テスト**を判断材料として利用。**3案比較**（案A=まだ解禁せず最小実装設計 docs-only・**推奨**／案B=限定解禁は別承認後・今回でない／案C=品質基盤優先）＋**§0 人間決定候補10項目**（推奨すべて安全側）。まだ解禁しない理由（実装/schema/否定系テスト/本番確認がまだ・可逆性）と実装前停止条件、解禁時の最小範囲（CUSTOMER_CONFIDENTIAL × Customer Pain × 限定画面）を記録。
- **解禁なし・実装なし・Customer Pain 実装なし・schema / migration / RBAC / label定義変更なし・AI参照条件変更なし・PII保存なし・実顧客データ保存なし・push なし**。次は **doc107 push-only**（別承認）→ 解禁可否の §0 人間決定。

## Phase番号体系・Lineage整理 — audit番号とProduct Phaseを分けて読むための正本化（docs-only・READY / GO）

- doc106 新規: `docs/audit/106_phase_numbering_lineage_governance.md`。**audit番号は時系列証拠番号**・**Product Phaseはロードマップ上の意味**・**Lineageは機能ごとの流れ**・**Stageは作業種類**・**commit hashはGit正本状態**の5軸を分離し、「連番が揃わないように見える」混乱を防ぐ正本を制定。
- 今後の docs 表記テンプレート（Audit Doc / Product Phase / Lineage / Stage / Status / Baseline Commit / Current HEAD / Scope / Not Included / Next Action / Do Not Start）を固定。主要 Lineage を短整理し Customer Pain Lineage を doc101〜doc106 で明細化。
- **既存docs改名なし・HOLD記録削除なし**・見た目の連番のための歴史改変なし。**ObsidianではLineage別に見る**。**docs/10_obsidian と 369-vault の関係は別承認**。code/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・push なし。次は **doc106 push-only**（別承認）。

## Customer Pain 高機密ラベル運用 詳細設計 — docs-only・READY / GO

- doc105 新規: `docs/audit/105_customer_pain_high_confidential_label_operation_detail_design.md`。doc104 決定が要求する実装前詳細設計を固定（docs-only）: **標準閲覧式＝tenantId × knowledge:update × label許可ロール × AIロール除外（isHumanUser）× archivedAt null × writeDataAccess 記録可能の AND**・擬似コード付き・OR 緩和禁止。
- 記録粒度: 閲覧のたび **writeDataAccess**（targetType=CustomerPain・action=view・purpose=customer_pain_internal_review・result/reasonCode——**本文・PII・顧客名・担当者名は記録禁止**）／書き込みは **writeAudit** 必須（restore・label変更・customerId紐づけ変更は別承認）。
- **安全ゲート候補14種**（tenantId/knowledge:update/canAccessLabel/AIロール除外/writeDataAccess/writeAudit の消失FAIL＋company-brain-reference 注入・AI参照・公開導線・PII混入・ログ本文混入・externalAiAllowed/publishStatus UI 出現FAIL）＋**否定系テスト候補15種**＋**実装時の事前停止条件16項目**。
- **高機密ラベル解禁なし・Customer Pain 実装なし・code/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし・push なし**。次は **doc105 push**（別承認）→ 高機密ラベル実装・解禁の可否判断（個別人間承認・重い判断）。

## Customer Pain Data Classification 方針決定 — 高機密ラベル運用は設計先行・解禁なし（docs-only・GO）

- doc104 新規: `docs/audit/104_customer_pain_data_classification_policy_decision.md`。doc103 §20 の **§0 12項目を安全側で正式決定**（既定=CUSTOMER_CONFIDENTIAL 前提候補・設計のみ／**高機密ラベル解禁なし**／閲覧=tenantId × knowledge:update × label許可ロールの AND 交差（AIロール除外含む）／閲覧=writeDataAccess 設計必須・書き込み=writeAudit 必須／**PII/顧客名/担当者名/実顧客データ保存なし**・将来も customerId 参照のみ／**AIに読ませない**・**公開しない**／実装前に安全ゲート設計＋否定系テスト設計必須／DOCS_ONLY_NOW）。
- 決定＝現状維持で**実装不要・コード差分ゼロ**。**Customer Pain 実装なし・DB/schema/migration/RBAC/label定義変更なし・AI参照条件変更なし**。値名と doc103 候補名の差分は doc104 §2 の対応表に記録（すべて同義または安全側）。
- 次は **doc104 push**（別承認）→ 高機密ラベル運用の詳細設計（docs-only・別承認・解禁ではない）→ 実装・解禁は個別人間承認。

## Customer Pain Data Classification / 高機密ラベル運用設計 — docs-only・READY / GO

状態: **守り方の設計完了（判定 READY / GO・commit-only・push 別承認）／高機密ラベル解禁は未実施・Customer Pain 実装は未着手／プロダクト基準: CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま** — 詳細 `docs/audit/103_customer_pain_data_classification_high_confidential_label_design.md`（doc103）。反映状態は git refs を正とする。

- 🔑 中心論点: 既存ラベル設定では CUSTOMER_CONFIDENTIAL に AI ロール・STAFF まで閲覧許可が及ぶ → **ラベル単独に頼らず「knowledge:update＋label許可ロール＋AIロール除外」の3条件交差**で守る設計を固定（RBAC・label 定義は変更しない）。
- ✅ 設計: **CUSTOMER_CONFIDENTIAL 既定候補**・一覧はプレースホルダ・詳細のみ閲覧・**閲覧のたび writeDataAccess・書き込みは writeAudit**・本文への PII/顧客名複製禁止・customerId 参照のみ候補・安全ゲート5種・否定系テスト7種。
- 🔒 不変: **AIに読ませない・公開しない・PII保存なし**・code/schema/migration/RBAC/label定義変更なし・解禁は設計→§0→**個別人間承認（重い判断）**の後。
- 次の安全な選択肢: **doc103 の push-only 承認判断** → Data Classification の §0 人間決定（12項目・解禁前提条件の決定）。

## Customer Pain 方針決定 — HIGH_CONFIDENTIAL_PREREQUISITE_FIRST（docs-only・GO）

状態: **§0 決定の正式記録完了（判定 GO・commit-only・push 別承認）／Customer Pain 実装は未着手・実装不要（決定＝現状維持・コード差分ゼロ）／プロダクト基準: CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま** — 詳細 `docs/audit/102_customer_pain_policy_decision_high_confidential_prerequisite.md`（doc102）。反映状態は git refs を正とする。

- ✅ 正式決定: **守り方が先**——高機密ラベル・権限・監査・AI禁止の前提設計（Data Classification / 高機密ラベル運用設計）を先に行い、**Customer Pain の実装はまだ**（9項目すべて安全側）。
- 🔒 固定: **PII・顧客名・担当者名・実顧客データは保存しない**・**AI参照なし（AIに読ませない）**・**公開なし**・閲覧は knowledge:update 以上・閲覧記録（writeDataAccess）と書き込み監査（writeAudit）の設計が必要。
- 🤖 不変: AI参照条件変更なし・高機密ラベルは定義済みだが解禁は個別人間承認の重い判断のまま・DB/schema/migration/RBAC/label 定義変更なし。
- 次の安全な選択肢: **doc102 の push-only 承認判断** → Data Classification / 高機密ラベル運用設計（docs-only・解禁ではない）。

## Customer Pain 入口レビュー — 高機密ラベル前提整理（docs-only・READY / GO）

状態: **入口レビュー完了（判定 READY / GO・commit-only・push 別承認）／Customer Pain 実装は未着手・§0 人間決定後の別承認待ち・高機密ラベル対応が先／プロダクト基準: CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま** — 詳細 `docs/audit/101_customer_pain_entry_review_high_confidential_prerequisite.md`（doc101）。反映状態は git refs を正とする。

- 📐 3案比較: 案A=**高機密ラベル・権限・監査・AI禁止の前提設計が先（HIGH_CONFIDENTIAL_PREREQUISITE_FIRST・推奨）**／案B=社内下書きから将来／案C=即実装（非推奨）。
- ⚠️ Pain の性質: 失注理由・クレーム・不満・競合比較などの**未解決の生データ**＝CaseStudy より高リスク。顧客名・担当者名・PII と紐づくと顧客への実害リスク。
- 🔒 固定: **AI は原則参照禁止で開始・公開は PROHIBIT_NOW・PII/顧客名/実顧客データは保存しない**・高機密ラベルは enum 定義済みだが Company Brain での扱いは保留中（解禁は個別人間承認の重い判断）・閲覧も writeDataAccess で記録する設計が必要。
- 🤖 不変: AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・DB/schema/migration 変更なし・外部送信なし。
- 次の安全な選択肢: **doc101 の push-only 承認判断** → Customer Pain の §0 人間決定 → Data Classification / 高機密ラベル設計（別承認）。

## CaseStudyConsent 公開活用方針決定 — PROHIBIT_NOW（今は公開しない）の正式決定（docs-only・GO）

状態: **§0 決定の正式記録完了（判定 GO・commit-only・push 別承認）／公開活用は未実装・実装不要（決定＝現状の非公開状態の維持・コード差分ゼロ）／プロダクト基準: CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま** — 詳細 `docs/audit/100_case_study_consent_public_use_policy_decision.md`（doc100）。反映状態は git refs を正とする。

- ✅ 正式決定: **今は公開しない（PROHIBIT_NOW）**・**公開系 purpose は単独では公開条件にならない**・将来公開には **ApprovalRequest・表現審査・公開前人間承認・取り下げ運用**が前提（10項目すべて安全側）。
- 🔒 不変: **実装不要・code/schema/migration/package/doc14 変更なし**・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・恒久禁止（AI虚偽口コミ・ステマ・根拠なし数値・公開系の自動実行）は許諾があっても解除されない。
- 次の安全な選択肢: **doc100 の push-only 承認判断** → Customer Pain / Stage 2・3・★2・UX / 品質基盤強化（公開活用の再開は詳細設計からの別承認）。

## CaseStudyConsent 公開活用判断 前提整理 — 導入事例・PR・SEO・顧客の声公開の条件設計（docs-only・READY / GO）

状態: **前提整理完了（判定 READY / GO・commit-only・push 別承認）／公開活用は未実装・§0 人間決定後の別承認待ち（今は進めない前提）／プロダクト基準: CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま** — 詳細 `docs/audit/99_case_study_consent_public_use_policy_design.md`（doc99）。反映状態は git refs を正とする。

- 📐 3案比較: 案A=**PROHIBIT_NOW_AND_DESIGN_GATES（今は公開せず関門要件だけ固定・推奨）**／案B=社内下書き＋人間承認のみ将来／案C=公開実装（現時点非推奨）。
- 🔒 固定: **external_publish / pr / seo / customer_voice purpose は単独では公開条件にならない**・**ApprovalRequest・表現審査・公開前人間承認・取り下げ運用・根拠確認が将来前提**・恒久禁止（AI虚偽口コミ・実体験でない体験談・根拠なし成果数値/No.1・ステマ・公開系の自動実行）。
- 🤖 不変: **AI参照条件変更なし（KEEP_ANONYMIZED_TRUE_ONLY のまま）・CaseStudyConsent は AI 文脈へ注入しない・外部送信なし・実装ゼロ**。
- 次の安全な選択肢: **doc99 の push-only 承認判断** → 公開活用の §0 人間決定（今は進めない前提）/ Customer Pain / Stage 2・3・★2・UX / 品質基盤強化。

## CaseStudyConsent AI参照条件決定 — KEEP_ANONYMIZED_TRUE_ONLY 維持（docs-only・GO）

状態: **§0 決定の正式記録完了（判定 GO・commit-only・push 別承認）／実装不要（決定＝現状維持・コード差分ゼロ）／プロダクト基準: CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま** — 詳細 `docs/audit/98_case_study_consent_ai_reference_policy_decision.md`（doc98）。反映状態は git refs を正とする。

- ✅ 正式決定: **AIが読む事例は anonymized=true のみ**を維持・**anonymized=false は AI 参照対象外**・**CaseStudyConsent は AI 文脈へ注入しない**・**ai_reference purpose は単独では解禁条件にしない**（9項目すべて安全側）。
- 🔒 不変: **company-brain-reference 変更なし・実装不要・外部LLM送信なし・AIコストなし**・監査ログ/安全ゲートも現行維持。将来の変更は段階承認（doc97 §8）が前提。
- 次の安全な選択肢: **doc98 の push-only 承認判断** → 公開活用判断（今は進めない）/ Customer Pain / Stage 2・3・★2・UX / 品質基盤強化。

## CaseStudyConsent AI参照条件設計 — ai_reference purpose と anonymized=false の扱い（docs-only・READY / GO）

状態: **設計完了（判定 READY / GO・commit-only・push 別承認）／実装・変更は §0 人間決定後の別承認待ち（推奨案A は現状維持＝変更ゼロ）／プロダクト基準: CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま** — 詳細 `docs/audit/97_case_study_consent_ai_reference_policy_design.md`（doc97）。反映状態は git refs を正とする。

- 📐 3案比較: 案A=**KEEP_ANONYMIZED_TRUE_ONLY（現状維持・推奨）**／案B=人間承認済み匿名化要約のみ将来候補／案C=強い承認・監査・マスキング前提の将来検討（現時点非推奨）。
- 🔒 不変事項を固定: **ai_reference purpose は単独では解禁条件にしない・台帳行・証跡・purpose は AI 文脈へ注入しない・外部LLM送信は構造的ゼロ・AIコスト発生なし**・AIが読む顧客事例は匿名化済み（anonymized=true）のみ。
- 📋 次の §0 候補9項目: AI_REFERENCE_POLICY ほか（推奨はすべて安全側・案A なら実装不要=決定の記録のみ）。
- 次の安全な選択肢: **doc97 の push-only 承認判断** → AI参照条件の §0 人間決定 → （案B/C の場合のみ）詳細設計・実装承認。

## CaseStudyConsent anonymized=false 本格扱い-PROD — 表示統治の本番確認（利用者実測・GO）

状態: **本番確認 GO（利用者実測・2026-07-05・doc96＋doc14 §60・commit-only・push 別承認）／本番確認GO済みプロダクト基準: CaseStudyConsent anonymized=false 本格扱い / `611e51e`（前基準 保存条件接続 `5e9461f` は歴史的保持）** — 詳細 `docs/audit/96_case_study_consent_anonymized_false_policy_production_confirmation.md`（doc96）。反映状態は git refs を正とする。

- ✅ 本番実測1周: 台帳登録 → 匿名化オフ保存が通る → 一覧に実名寄り＋**AI参照対象外**＋**外部公開不可**バッジ → 手動匿名化戻し注意 → **匿名化に戻して片付け**（すべて利用者実測・NG/不明 0件・build/CI green）。
- 🔒 不変: **anonymized=false 未解禁（表示統治まで）・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**・公開なし・封印 UI 3種なし・本番DB直接接続なし。
- 🤖 AI が Vercel / GitHub Actions / 本番を直接確認したものではない（申告値をそのまま記録）。※非 update ロールの「閲覧制限」表示は確認用ユーザーなしのため未実測（Unknowns）。
- 次の安全な選択肢: **doc96 の push-only 承認判断** → AI参照条件判断（doc91 §6 段階8）/ 公開活用判断（段階9）/ Customer Pain / Stage 2・3・★2・UX / 品質基盤強化。

## CaseStudyConsent anonymized=false 本格扱い実装 — 社内限定・制限表示（GO）

状態: **最小実装完了・ローカル検証全green（判定 GO・commit-only・push 別承認）／本番確認はこれから（別承認）／プロダクト基準: CaseStudyConsent 保存条件接続 / `5e9461f` のまま** — 詳細 `docs/audit/95_case_study_consent_anonymized_false_policy_implementation.md`（doc95）。反映状態は git refs を正とする。

- ✅ 表示統治: 一覧は **badge_only**（実名寄り行に AI参照対象外・外部公開不可バッジ）／閲覧は **knowledge_update_only**（実名寄りの内容は編集権限者だけ・他は「閲覧制限」表示）／編集画面に**手動匿名化戻しの注意**（自動書き換えなし）。
- 🔒 不変: **anonymized=false 未解禁（表示統治のみ）・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**・Customer マスタ join なし・成果数値/顧客の声/公開系の追加なし。
- 🛡️ 機械化: 安全ゲートに表示統治の後退検知3種（バッジ・閲覧制限・`prisma.customer` 参照）を追加。
- ✅ 検証: gate・**test 256**・typecheck・lint・build・**smoke 23/23**（23本目=実名寄り1周）全green（ローカルのみ・修正ループ0回）。
- 次の安全な選択肢: **doc95 の push-only 承認判断** → 本番確認（実名寄りバッジ1周） → AI参照条件（doc91 §6 段階8）/ 公開活用（段階9）/ Customer Pain / Stage 2・3・★2・UX。

## CaseStudyConsent anonymized=false 本格扱い設計 — 実名寄り事例の運用・表示・閲覧範囲（docs-only・READY / GO）

状態: **設計完了（判定 READY / GO・commit-only・push 別承認）／実装は §0 人間決定後の別承認待ち／プロダクト基準: CaseStudyConsent 保存条件接続 / `5e9461f` のまま** — 詳細 `docs/audit/94_case_study_consent_anonymized_false_policy_design.md`（doc94）。反映状態は git refs を正とする。

- 📐 3案比較: 案A=**社内限定・制限表示（推奨・INTERNAL_ONLY_RESTRICTED）**／案B=表示拡張／案C=統治整備まで封印。案A は badge＋注意文言＋閲覧権限の統治だけを最小で整える（解禁ゼロ・PII 露出面を増やさない）。
- 📋 次の §0 候補9項目: 表示方針・閲覧権限・一覧表示・取り消し時の扱い（自動書き換えはしない推奨）・顧客名/成果数値/顧客の声の各方針・AI参照（anonymized=true のみ維持推奨）・公開（今は禁止推奨）。
- 🔒 不変: **anonymized=false 未解禁（保存できるだけ）・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**・公開系は purpose があっても ApprovalRequest 等の別承認が前提。
- 次の安全な選択肢: **doc94 の push-only 承認判断** → §0 人間決定 → UI/表示方針の最小実装承認（doc95 候補）。

## CaseStudyConsent 保存条件接続-PROD — 保存条件接続の本番確認（利用者実測・GO）

状態: **本番確認 GO（利用者実測・2026-07-05・doc93＋doc14 §59・commit-only・push 別承認）／本番確認GO済みプロダクト基準: 保存条件接続 `5e9461f`（前基準 CaseStudyConsent UI / `1913456` は歴史的保持）** — 詳細 `docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md`（doc93）。反映状態は git refs を正とする。

- ✅ 本番実測1周: 新規作成では匿名化オフ拒否 → 台帳なしで拒否 → internal_view 登録後に通る → 取り消し後に再び拒否 → 匿名化に戻してアーカイブ片付け（すべて利用者実測・NG/不明 0件）。
- 🔒 不変: **anonymized=false 未解禁（保存できるだけ・AI/公開に使われない）・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**・封印 UI 3種なし・本番DB直接接続なし。
- 🤖 AI が Vercel / GitHub Actions / 本番を直接確認したものではない（申告値をそのまま記録）。
- 次の安全な選択肢: **doc93 の push-only 承認判断** → anonymized=false 本格扱い（doc91 §6 段階7）/ AI参照条件（段階8）/ Customer Pain / Stage 2・3・★2・UX。

## CaseStudyConsent 保存条件接続実装 — 匿名化オフ保存への突合必須化（CONNECT_ONLY・GO）

状態: **接続実装完了・ローカル検証全green（判定 GO・commit-only・push 別承認）／本番確認はこれから（別承認）／プロダクト基準: CaseStudyConsent UI / `1913456` のまま** — 詳細 `docs/audit/92_case_study_consent_save_condition_connection.md`（doc92）。反映状態は git refs を正とする。

- ✅ 接続: **匿名化を外す保存は、granted 申告に加えて許諾台帳の有効な行（internal_view・期限内・取り消しなし・証跡・人間登録）の突合が必須**。create は匿名化オフ拒否（作成→台帳登録→編集で外す運用）。
- ✅ suppressed は actions 層で解決（CALLER_RESOLVES_SUPPRESSED_BOOLEAN・**resolveCaseStudyConsentSuppressed**・Customer 不在は安全側 true）。拒否は reason コード redirect（PII・抑止詳細は画面に出さない）。
- 🔒 不変: **anonymized=false 未解禁（保存できるだけ）・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**・門番 canDisableAnonymization 不変・schema/migration/doc14 無変更。
- ✅ 安全ゲート: 「接続禁止」→「**承認済み接続の形**」検査へ更新（接続消失・テナント境界・create 拒否・internal_view 変更で FAIL）＝更新自体が承認の証跡。
- ✅ 検証: gate・**test 256**・typecheck・lint・build・**smoke 22/22** 全green（ローカルのみ・修正ループ0回）。
- 次の安全な選択肢: **doc92 の push-only 承認判断** → 本番確認（拒否→登録→通る→取り消し→拒否の1周） → anonymized=false 本格扱い / AI参照条件 / Customer Pain / Stage 2・3・★2・UX。

## CaseStudyConsent 保存条件接続設計 — anonymized=false の扱いと接続方針（docs-only・READY / GO）

状態: **設計完了（判定 READY / GO・commit-only・push 別承認）／接続実装は §0 人間決定後の別承認待ち／プロダクト基準: CaseStudyConsent UI / `1913456` のまま** — 詳細 `docs/audit/91_case_study_consent_save_condition_connection_design.md`（doc91）。反映状態は git refs を正とする。

- 📐 3案比較: 案A=**接続だけ先行（推奨・CONNECT_ONLY）**／案B=実名寄り方針とセット／案C=封印寄り。案A は「匿名化オフの保存に有効な台帳行を必須化」＝申告値依存の弱点だけを塞ぐ純粋な安全強化（解禁ゼロ・本番影響ゼロ）。
- 📋 次の §0 候補5項目: SAVE_CONNECTION_POLICY / TARGET_PURPOSE（推奨 internal_view）/ SUPPRESSION_CHECK_POLICY / EXISTING_DATA_POLICY（推奨 NO_BACKFILL）/ ERROR_UX_POLICY。
- 🔒 不変: **保存条件接続なし・anonymized=false 未解禁・AI参照条件変更なし**・CaseStudyConsent は AI 文脈へ注入しない・段階分離ゲート稼働中。
- 次の安全な選択肢: **doc91 の push-only 承認判断** → §0 人間決定 → 接続の最小実装承認（doc92 候補）。

## CaseStudyConsent 突合判定実装 — 純粋関数・テスト・段階分離ゲート（GO）

状態: **純粋関数のみ実装完了・ローカル検証全green（判定 GO・commit-only・push 別承認）／接続・解禁はすべて未着手・別承認待ち／プロダクト基準: CaseStudyConsent UI / `1913456` のまま** — 詳細 `docs/audit/90_case_study_consent_reconciliation.md`（doc90）。反映状態は git refs を正とする。

- ✅ 追加: **validateCaseStudyConsentReconciliation**（doc89 の15条件・DB 読み出しなし・理由コード17種）＋**否定系テスト20本（test 250）**。
- 🔒 段階分離を機械化: 保存条件への接続・匿名化の門番の変更・AI参照への接続が**同じ変更に混ざったら安全ゲートが FAIL**（接続と解禁はそれぞれ別承認のまま）。
- 🤖 不変: **どこにも接続していない＝挙動不変**・anonymized=false 未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない。
- ✅ 検証: gate・test 250・typecheck・lint・build 全green（smoke は UI 変更なしのため未実施）。
- 次の安全な選択肢: **doc90 の push-only 承認判断** → 保存条件接続（段階3）/ anonymized=false 扱い（段階6）/ Customer Pain / Stage 2・3・★2・UX。

## CaseStudyConsent 突合判定設計 — granted の真正性確認（docs-only・READY / GO）

状態: **設計完了（判定 READY / GO・commit-only・push 別承認）／実装は未着手・別承認待ち／プロダクト基準: CaseStudyConsent UI / `1913456` のまま** — 詳細 `docs/audit/89_case_study_consent_reconciliation_design.md`（doc89）。反映状態は git refs を正とする。

- 📐 固定: **有効条件15項目 AND**（granted＋有効な台帳行＋一致確認＋非 revoked/expired/suppressed＋purpose 対象用途＋private/NORMAL・INTERNAL/未アーカイブ＋人間登録＋evidence 存在）と reject 条件・purpose 6区分の扱い。
- 🧰 関数案: **validateCaseStudyConsentReconciliation（案B推奨）**＝新純粋関数で既存の匿名化門番を壊さない・DB 読み出しは呼び出し層。
- 🧪 実装時セット: 否定系テスト17本案＋安全ゲート案（**匿名化解禁が同時に入ったら FAIL** の段階分離検査含む）。
- 🔒 不変: **anonymized=false 未解禁・AI参照条件変更なし**・CaseStudyConsent は AI 文脈へ注入しない・公開系は台帳だけでは足りない（今回解禁しない）。
- 次の安全な選択肢: **doc89 の push-only 承認判断** → 突合判定の実装承認（段階2＋4のみ）/ Customer Pain / Stage 2・3・★2・UX。

## CaseStudyConsent UI-PROD — 許諾台帳UI 本番確認（docs-only・GO）

状態: **本番確認 GO（利用者実測・確認日 2026-07-05 申告）／CaseStudyConsent UI 完全クローズ／本番確認GO済みプロダクト基準は CaseStudyConsent UI/`1913456` へ昇格** — 詳細 `docs/audit/88_case_study_consent_ui_production_confirmation.md`（doc88）・doc14 §58。反映状態は git refs を正とする。

- ✅ 実測: **架空・匿名事例で台帳1周**（作成→登録→一覧→詳細→取り消し→片付け）が本番で成立。Vercel Ready・`1913456`・build/CI green・既存画面無回帰。**AI が直接確認したものではない**。
- 🔒 本番でも成立: 証跡ガイド表示・writeAudit（人間のみ）・**物理削除禁止**（取り消し済み行が残る）・公開系/封印系 UI なし。
- ✅ 昇格: 本番確認GO済みプロダクト基準 `812ae69` → **`1913456`**（前基準は歴史的保持）。
- 🤖 不変: CaseStudyConsent は AI 文脈へ注入しない・**anonymized=false 未解禁**・連携までは匿名化済みのみAI参照。
- 次: doc88 の push（別承認）→ **突合判定（doc83 §9 段階3・別承認）**。

## CaseStudyConsent UI実装 — 許諾台帳の登録・閲覧・取り消し（GO）

状態: **実装完了・ローカル検証全green（判定 GO・commit-only）／本番確認はこれから（push・本番確認とも別承認）／プロダクト基準: CaseStudyConsent schema / `812ae69` のまま** — 詳細 `docs/audit/87_case_study_consent_ui.md`（doc87）。反映状態は git refs を正とする。

- ✅ 追加: 事例単位の許諾台帳UI（一覧・登録・閲覧・revoke の**4操作のみ**）＋Server Action 2本＋shared 入力検証＋否定系テスト8本（**test 230**）。
- 🔒 安全境界: **人間のみ・writeAudit（最小情報）・物理削除禁止・証跡は所在説明のみ・expiresAt 必須・Customer picker なし（PII 非複製）**。すべて安全ゲートの機械検査つき（**AI 非注入検査含む**）。
- 🤖 AI: **AI参照条件変更なし**・CaseStudyConsent は AI 文脈へ注入しない・**anonymized=false 未解禁**。
- ✅ 検証: gate・test 230・typecheck・lint・build・**smoke 22/22** 全green（ローカルのみ・修正ループ0回）。
- 次: doc87 の push（別承認）→ 本番確認（利用者実測・架空事例で1周→片付け）→ **突合判定（doc83 §9 段階3・doc88 以降）**。

## CaseStudyConsent UI設計 — 許諾台帳UIの実装前安全設計（docs-only・READY / GO）

状態: **設計完了（判定 READY / GO・commit-only・push 別承認）／UI・Server Action は未実装・別承認待ち／プロダクト基準: CaseStudyConsent schema / `812ae69` のまま** — 詳細 `docs/audit/86_case_study_consent_ui_design.md`（doc86）。反映状態は git refs を正とする。

- 📐 スコープ: 事例単位の**一覧・登録・閲覧・取り消し（revoke）のみ**（ルート案1 推奨・自由編集なし・物理削除禁止）。
- 🔒 安全境界: **人間のみ**（AIロール不可）・writeAudit 必須（PII/証跡本文は audit に入れない）・**evidence は所在説明のみ**・**expiresAt 必須**・purpose 6区分明示・Customer picker は作らない（PII 複製なし）。
- 🤖 AI: **AI参照条件変更なし**・CaseStudyConsent は AI 文脈へ注入しない・**anonymized=false 未解禁**・連携までは匿名化済みのみAI参照。
- 🧪 実装時セット: 否定系テスト（期限逆転拒否等）＋安全ゲート拡張（AI 非注入の機械検査）＋smoke＋停止条件。
- 次の安全な選択肢: **doc86 の push-only 承認判断** → 台帳UI 実装承認（doc87 候補）/ 突合判定 / Customer Pain / Stage 2・3・★2・UX。

## CaseStudyConsent schema-PROD — 本番確認（docs-only・GO）

状態: **本番確認 GO（利用者実測・確認日 2026-07-05 申告）／CaseStudyConsent schema 完全クローズ／本番確認GO済みプロダクト基準は CaseStudyConsent schema/`812ae69` へ昇格** — 詳細 `docs/audit/85_case_study_consent_schema_production_confirmation.md`（doc85）・doc14 §57。反映状態は git refs を正とする。

- ✅ 実測: Vercel Ready・latest commit `812ae69`・build / CI green・既存画面無回帰・**CaseStudyConsent 画面なしが正常（schema-only）**。**AI が直接確認したものではない**。
- ✅ 昇格: 本番確認GO済みプロダクト基準 `6d656a3` → **`812ae69`**（前基準 Phase 2-C-5 は歴史的保持）。
- 🔒 維持: **追加のみ migration・破壊的SQLなし**・UI/writeAudit/突合判定 未実装＝書き込み経路ゼロ・本番の台帳テーブルは空のまま・anonymized=false 未解禁・連携までは匿名化済みのみAI参照。
- 次: doc85 の push（別承認）→ **台帳UI / 突合判定は別承認**（doc83 §9 段階2〜3）。

## CaseStudyConsent schema — 事例許諾専用台帳の器を追加（schema-only・GO）

状態: **schema 追加完了・ローカル検証全green（判定 GO・commit-only・push 別承認）／UI・突合判定は未実装・別承認待ち／プロダクト基準: Phase 2-C-5 / `6d656a3` のまま** — 詳細 `docs/audit/84_case_study_consent_schema.md`（doc84）。反映状態は git refs を正とする。

- ✅ 追加: **CaseStudyConsent model 1件のみ**＋**追加のみ migration**（CREATE TABLE＋INDEX 2本・**破壊的SQLなし**を機械確認）。既存 ConsentRecord/CaseStudy には一切触れていない。
- 📋 §0 決定の反映: **expiresAt 必須（期限なし許諾は認めない）**・evidence は所在説明のみ・consentRecordId 据え置き・登録は人間のみ（UI 実装時適用）。
- 🔒 維持: **書き込み経路ゼロ（UI なし）＝本番テーブルは空のまま**。**ConsentRecord連携までは anonymized=true のみAI参照・anonymized=false は未解禁**。writeAudit/突合判定は後続別承認。
- ✅ 検証: validate・migrate dev＋status・test 222・typecheck・lint・build 全green（ローカルのみ・smoke は schema-only のため未実施）。
- 次の安全な選択肢: **doc84 の push-only 承認判断** → 本番確認（利用者実測・画面なしが正常）→ 台帳UI / 突合判定（doc83 §9 段階2〜3）の人間選択。

## ConsentRecord連携器選択 — CaseStudyConsent 専用モデル推奨（docs-only・READY / GO）

状態: **器の設計確定（判定 READY / GO・commit-only・push 別承認）／schema実装は未着手・別承認待ち／プロダクト基準: Phase 2-C-5 / `6d656a3` のまま** — 詳細 `docs/audit/83_consent_record_case_study_model_decision.md`（doc83）。反映状態は git refs を正とする。

- ✅ 確定: 許諾台帳の器は **案B推奨 = CaseStudyConsent（事例許諾専用新モデル）**。案A（既存 ConsentRecord 拡張）は配信同意と事例許諾の意味混在リスクで不採用推奨。
- 📐 器の案: tenantId / caseStudyId / customerId（ID参照のみ・PII複製なし）/ status（granted/revoked）/ purpose 6区分明示（用途未記載は不許可）/ evidence / expiresAt / revokedAt。expired/suppressed は導出（SuppressionList は単一情報源のまま）。
- 🪜 実装は5段階の個別承認: schema（追加のみ migration・破壊的SQLなし）→ 台帳UI → 突合判定（validateCaseStudyConsent 拡張＋否定系テスト＋gate）→ 匿名化解除判断 → 公開活用（ApprovalRequest）。
- 🔒 維持: **ConsentRecord連携までは anonymized=true のみAI参照・anonymized=false は別承認**・外部公開/PR/SEO/顧客の声公開は禁止のまま。
- 次の安全な選択肢: **doc83 の push-only 承認判断** → CaseStudyConsent schema 実装判断（Unknowns 4点の人間確定から）/ Customer Pain 判断 / Stage 2・3・★2・UX。

## ConsentRecord連携設計 — CaseStudy 許諾真正性（docs-only・READY / GO）

状態: **設計完了（判定 READY / GO・commit-only・push 別承認）／実装は未着手・別承認待ち／プロダクト基準: Phase 2-C-5 / `6d656a3` のまま** — 詳細 `docs/audit/82_consent_record_case_study_link_design.md`（doc82）。反映状態は git refs を正とする。

- ✅ 固定: **consentStatus=granted は申告値であり真正な許諾証拠として扱わない**。真正な許諾は将来 ConsentRecord 突合（誰が・何の用途で・いつまで・どんな証跡で・失効していないか）で確認。
- 🔒 維持: **ConsentRecord連携までは anonymized=true のみAI参照**。実名寄り事例・成果数値・顧客の声は AI にも公開にも使わない。externalAiAllowed false・publishStatus private・writeAudit・ai_reference は全部そのまま。
- 🔍 発見: 既存 ConsentRecord はメール営業のチャネル同意用（用途・失効・期限・証跡なし）→ 器は案A（既存拡張）/ 案B（事例許諾専用新モデル・推奨）の人間選択（schema 追加＝別承認）。
- 📐 設計: 匿名化解除の全条件AND（§6）・取り消し時の安全側挙動（§7・revoked/expired/suppressed で即時遮断・履歴は消さない）・公開活用の5前提ゲート（§9・現時点は全部禁止のまま）。
- 次の安全な選択肢: **doc82 の push-only 承認判断** → ConsentRecord連携の実装判断（段階承認）/ Customer Pain 判断 / Stage 2・3・★2・UX の人間選択。

## Phase 2-C-CLOSE — Phase 2-C 完了判定（docs-only・GO）

状態: **Phase 2-C 正式クローズ（判定 GO・commit-only・push 別承認）／本番確認GO済みプロダクト基準: Phase 2-C-5 / `6d656a3`** — 詳細 `docs/audit/81_phase2c_close.md`（doc81）・doc14 §56。反映状態は git refs を正とする。

- ✅ 照合: **doc70〜doc80照合**（read-only）＋doc14 §52〜§55。2-C-ENTRY〜2-C-5 の全段が完了し、2-C-2〜2-C-5 は本番確認GO（すべて利用者実測）。未解消HOLDなし。完了条件19項目すべて充足。
- ✅ 到達点: **Company Brain AI参照4テーブル体制が本番確認済み**。顧客事例は「人間が書き・AIは匿名化済み（anonymized=true）だけ読み・読んだら記録・外部AIには出ない」＋許諾の門番（本番実証済み）。
- 📌 基準: プロダクト機能基準は **Phase 2-C-5 / `6d656a3`** のまま（doc81 commit は完了判定記録）。
- 🔭 後続課題（いずれも別承認）: ConsentRecord連携・Customer Pain（高機密ラベル対応が先）・公開活用（PR/SEO/SNS/口コミ/顧客の声公開）・Stage 2・Stage 3・★2・UX改善・品質基盤強化。
- 次の安全な選択肢: **doc81 の push-only 承認判断** → ConsentRecord 連携設計 / Customer Pain 判断 / Stage 2・3・★2・UX の人間選択。

## Phase 2-C-5-PROD — CaseStudy AI参照 本番確認（docs-only・GO）

状態: **本番確認 GO（利用者実測・確認日 2026-07-05 申告）／Phase 2-C-5 完全クローズ／GO済み基準は Phase 2-C-5/`6d656a3` へ昇格** — 詳細 `docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md`・doc14 §55。反映状態は git refs を正とする。

- ✅ 実測: 架空・匿名の事例1件作成 → 検索 → AI回答＋参照元表示 → **ai_reference（entityType=CaseStudy）** → アーカイブ片付け、の end-to-end が本番で成立。Vercel Ready・`6d656a3`・build/CI green・既存画面無回帰。**AI が直接確認したものではない**。
- ✅ 昇格: 本番確認GO済みプロダクト基準 `11e8f51` → **`6d656a3`**。**頭脳4テーブルの AI 参照体制が本番確認済み**。
- 🔒 維持: AIが読めるのは匿名化済みのみ・外部LLM注入ゼロ・本番テーブルは空のまま（テスト事例はアーカイブ済み）。
- 次: doc80 の push（別承認）→ **Phase 2-C 完了判定（Phase 2-C-CLOSE・doc81 候補・人間判断）**。

## Phase 2-C-5 — CaseStudy AI参照の最小実装（GO）

状態: **実装完了・ローカル検証全green（判定 GO・commit-only）／本番確認はこれから（push・本番確認とも別承認）／GO済み基準は Phase 2-C-4/`11e8f51` のまま** — 詳細 `docs/audit/79_phase2c5_case_study_ai_reference.md`。反映状態は git refs を正とする。

- ✅ 追加: company-brain-reference の4テーブル目（既存3テーブル無変更・3ファイル＋docs の最小差分）。
- 🔒 参照条件: **匿名化済み（anonymized=true）・非公開（private）・NORMAL/INTERNAL のみ**。sourceNote/ID参照/consentStatus は注入しない。外部LLM時は externalAiAllowed ゲートで構造的ゼロ。ai_reference はレコード単位自動記録。
- 🤖 自動見張り: 「匿名化済みのみ参照」条件を安全ゲートの機械検査に追加（壊れると CI が検知）。
- ✅ 検証: test 222・typecheck・lint・build・gate・**smoke 21/21** 全green（ローカルのみ）。
- 次: doc79 の push（別承認）→ 本番確認（利用者実測）→ **2-C-5-PROD（doc80 候補）**。

## Phase 2-C-5-ENTRY — CaseStudy AI参照の安全設計（docs-only・READY / GO）

状態: **設計完了（判定 READY / GO・commit-only）／実装は未着手・別承認待ち／GO済み基準は Phase 2-C-4/`11e8f51` のまま** — 詳細 `docs/audit/78_phase2c5_case_study_ai_reference_design.md`。反映状態は git refs を正とする。

- ✅ 参照条件の固定: **AI が読めるのは匿名化済み（anonymized=true）・非公開（private）・NORMAL/INTERNAL のみ**。consentStatus は参照条件に使わない（granted の真正性は ConsentRecord 連携=別承認まで慎重扱い）。
- 🔒 封印・記録の維持: 外部LLM時は externalAiAllowed ゲートで注入ゼロ（構造的ゼロ）・ai_reference はレコード単位で自動記録・sourceNote/ID参照は注入しない。
- 📐 実装形: company-brain-reference の4テーブル目として最小追加（MAX_TOTAL=5 据え置き候補）＋smoke 1本＋静的ゲートに anonymized:true 検査（いずれも実装ミッション=別承認）。
- 次: doc78 の push（別承認）→ **Phase 2-C-5 実装（doc79 候補）承認判断**。

## Phase 2-C-4-PROD — CaseStudy 人間書き込み本番確認（docs-only・GO）

状態: **本番確認 GO（利用者実測・確認日 2026-07-05 申告）／Phase 2-C-4 完全クローズ／GO済み基準は Phase 2-C-4/`11e8f51` へ昇格** — 詳細 `docs/audit/77_phase2c4_case_study_write_production_confirmation.md`・doc14 §54。反映状態は git refs を正とする。

- ✅ 実測: Vercel Ready・`11e8f51`・build green・CI green・**作成→編集→アーカイブの1周（架空・匿名のみ・片付け済み）**・externalAiAllowed/publishStatus UI なし・既存画面無回帰。**AI が直接確認したものではない**。
- 🔒 **許諾の門番が本番で実証**: 許諾なしで匿名化チェックを外して保存 → 拒否された（doc76 の機械制御が本番で稼働）。
- ✅ 昇格: 本番確認GO済みプロダクト基準 `408857d` → **`11e8f51`**。**会社の頭脳4テーブル体制が本番完成**。
- 次: doc77 の push（別承認）→ **Phase 2-C-5（AI参照・別承認）/ ConsentRecord 連携設計 / Stage 2・3・★2・UX の人間選択**。

## Phase 2-C-4 — CaseStudy 人間書き込み（GO）

状態: **実装完了・ローカル検証全green（判定 GO・commit-only）／本番確認はこれから（push・本番確認とも別承認）／GO済み基準は Phase 2-C-3/`408857d` のまま** — 詳細 `docs/audit/76_phase2c4_case_study_write.md`。反映状態は git refs を正とする。

- ✅ 追加: 作成・編集・アーカイブの Server Action 3操作＋new/edit 画面＋一覧の権限別導線（2-B-4 の実証済みの型を流用・9ファイル＋docs）。
- 🔒 許諾の門番: **匿名化を外せるのは consentStatus='granted' のときだけ**（shared 純粋関数で機械拒否・否定系テスト6本・安全ゲートで常時検査）。顧客名・取引先名・成果数値・顧客の声は許諾なしに書かない入力ガイドを両画面に明記。
- 🔒 境界維持: AI mutation禁止・writeAudit 3操作・tenantId・label 2択・externalAiAllowed false 固定・publishStatus private 固定（公開機能なし）・物理削除禁止。**静的安全ゲートは 4actions 体制**。
- ✅ 検証: test 222・typecheck・lint・build・安全ゲート・**smoke 20/20**（20本目=書き込み1周・19本目は意図的期待値更新）全green（ローカルのみ）。
- 次: doc76 の push（別承認）→ 本番確認（利用者実測・書き込み1周＋匿名化拒否の確認）→ **2-C-4-PROD（doc77 候補）** → 2-C-5 AI参照は別承認。

## Phase 2-C-3-PROD — CaseStudy read-only 本番確認（docs-only・GO）

状態: **本番確認 GO（利用者実測・確認日 2026-07-05 申告）／Phase 2-C-3 完全クローズ／GO済み基準は Phase 2-C-3/`408857d` へ昇格** — 詳細 `docs/audit/75_phase2c3_case_study_readonly_production_confirmation.md`・doc14 §53。反映状態は git refs を正とする。

- ✅ 実測: Vercel Ready・`408857d`・build green・CI green・ナビ「顧客事例」表示・`/brain/case-studies` 表示・**一覧は EmptyState（本番 seed 未投入のため正常）**・作成/編集/アーカイブボタンなし・既存画面無回帰。**AI が直接確認したものではない**。
- ✅ 昇格: 本番確認GO済みプロダクト基準 `b012bd0` → **`408857d`**。
- 🔒 本番の CaseStudy テーブルは空のまま＝書き込み経路ゼロが本番でも成立（実顧客情報は本番に1件も存在しない）。
- 次: doc75 の push（別承認）→ **Phase 2-C-4 承認判断**（作成・編集・アーカイブ＋AI mutation禁止＋writeAudit＋consentStatus=granted を前提とする匿名化解除制御＋静的ゲート拡張）。

## Phase 2-C-3 — CaseStudy read-only 画面＋架空 seed（GO）

状態: **実装完了・ローカル検証全green（判定 GO・commit-only）／本番確認はこれから（push・本番確認とも別承認）／GO済み基準は Phase 2-C-2/`b012bd0` のまま** — 詳細 `docs/audit/74_phase2c3_case_study_readonly.md`。反映状態は git refs を正とする。

- ✅ 追加: 閲覧専用一覧 `/brain/case-studies`＋ナビ「顧客事例」＋架空 seed 4件＋smoke 19本目（4ファイル＋docs のみ・最小差分）。
- 🔒 境界維持: 作成/編集/削除/Server Action/writeAudit/AI参照なし＝**書き込み経路ゼロのまま**。表示は非公開（private）・NORMAL/INTERNAL のみ。画面に「社内参照専用・公開しない・外部AI送信禁止・架空デモデータ・許諾なしに扱わない」を明記。
- ✅ 検証: 安全ゲート（ui 148）・test 216・typecheck・lint・build・**smoke 19/19**（既存18本回帰なし）全green（ローカルのみ）。
- 📝 注記: Gate の seed 全文 grep の「口コミ」ヒットは既存プレイブック/カタログ行（今回 diff 外）。今回追加行には該当なし。
- 次: doc74 の push（別承認）→ 本番確認（利用者実測・ナビ表示はハードリロード込み確認を推奨）→ **Phase 2-C-4 承認判断**。

## Phase 2-C-2-PROD — CaseStudy schema 本番確認（docs-only・GO）

状態: **本番確認 GO（利用者実測・確認日 2026-07-05 申告）／Phase 2-C-2 完全クローズ／GO済み基準は Phase 2-C-2/`b012bd0` へ昇格** — 詳細 `docs/audit/73_phase2c2_case_study_schema_production_confirmation.md`・doc14 §52。反映状態は git refs を正とする。

- ✅ 実測: Vercel Ready・`b012bd0`・build green（migrate ログは直接未確認＝build 成功で判定・前例どおり）・CI green・既存画面無回帰・CaseStudy 画面なし=正常。**AI が直接確認したものではない**。
- ✅ 昇格: 本番確認GO済みプロダクト基準 `83d35bc` → **`b012bd0`**。
- 🔒 本番の CaseStudy テーブルは空のまま（seed/UI/Server Action/AI参照なし＝書き込み経路ゼロ）。
- 次: doc73 の push（別承認）→ **Phase 2-C-3 承認判断**（read-only 画面＋架空 seed・2-A-3a/2-B-3 の型を流用）。

## Phase 2-C-2 — CaseStudy schema 追加（schema-only・GO）

状態: **schema 追加＋migration 作成・ローカル検証全green（判定 GO・commit-only）／本番確認はこれから（push・本番反映とも別承認）／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/72_phase2c2_case_study_schema.md`。反映状態は git refs を正とする。

- ✅ 追加: CaseStudy model 1件＋migration 1本のみ（CREATE TABLE＋INDEX 3本・破壊的SQLなし・既存無変更）。
- 🔒 器の安全 default: anonymized=true・publishStatus=private（公開機能なし）・consentStatus=none・externalAiAllowed=false・label INTERNAL（2択制限は 2-C-4 の actions 層で実装予定）・relation なし ID 参照。
- 🚫 未実装のまま（各段別承認）: seed（2-C-3）・read-only 画面（2-C-3）・書き込み＋writeAudit（2-C-4）・AI参照（2-C-5）・CustomerPain（高機密対応後）。書き込み経路が存在しないため実データ混入は構造的に不可能。
- ✅ 検証: migrate dev/status・安全ゲート・test 216・typecheck・lint・build 全green（ローカルのみ・本番DB接続なし）。
- 次: doc72 の push（別承認）→ 本番確認（利用者実測・build成功＝migration反映）→ **Phase 2-C-3 承認判断**。

## Phase 2-C-1 — Case Study / Customer Pain 絞り込み詳細設計（docs-only・READY / GO）

状態: **詳細設計完了（判定 READY / GO・commit-only）／実装は未着手・別承認待ち／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/71_phase2c1_case_study_customer_pain_detailed_design.md`。反映状態は git refs を正とする。

- ✅ 絞り込み: **Case Study（顧客事例）先行・Customer Pain（顧客課題）後続で確定**。根拠 = doc33/doc50/doc70 の3世代の評価が同順序＋read-only 監査で矛盾なし（Customer Pain は CUSTOMER_CONFIDENTIAL 前提＝高機密ラベル解禁の重い承認が先）。
- 🔒 絶対条件: 顧客名・取引先名・成果数値・顧客の声は**許諾なしに扱わない**・公開/SNS投稿/PR配信/SEOページ公開しない・**初期スコープに公開機能を作らない（publishStatus=private 固定）**・非公開/架空データ/匿名化 default true・label 2択（高機密ラベル解禁なし）・externalAiAllowed false 固定・AI mutation禁止・物理削除禁止・writeAudit。
- 📐 設計: CaseStudy field 案（consentStatus none|requested|granted|revoked・consentRecordId 参照・anonymized）＋許諾管理は**既存 ConsentRecord 無変更の第一候補**（営業チャネル同意向け構造のため、事例許諾は CaseStudy 側フィールドで開始）。
- 🪜 段階計画: 2-C-2 schema → 2-C-3 read-only 画面 → 2-C-4 人間書き込み → 2-C-5 AI参照（**各段別承認**・公開機能と ENSHiN OS 連携は Phase 2-C 範囲外）。
- 次: doc71 の push（別承認）→ **Phase 2-C-2 承認判断**（Stage 2/★2/UX は並行可・いずれも別承認）。

## Phase 2-C-ENTRY — 次領域入口レビュー（docs-only・READY / GO）

状態: **入口レビュー完了（判定 READY / GO・commit-only）／実装は未着手・別承認待ち／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/70_phase2c_entry_next_domain_review.md`。反映状態は git refs を正とする。

- ✅ 比較: 8候補を PII/許諾/外部公開/AIコスト/DB変更の有無で比較し推奨順序を固定。**推奨1位 = 2-C-1 絞り込み詳細設計 docs-only**（Case Study 先行が有力だが確定は設計と人間判断）・2位=Stage 2・3位=★2。
- 🔒 絶対条件の先行固定: Case/Pain は**許諾なしに顧客名・成果数値・顧客の声を扱わない・公開/SNS/PR配信/SEO公開しない・非公開/架空/許諾前提の設計から**（doc33/doc50 の評価を維持）。
- 🔎 重複確認: Case/Pain の実装・schema は未存在（git 実測）。docs/10_obsidian は未存在（関係設計は別承認のまま）。
- 次: doc70 の push（別承認）→ **Phase 2-C-1 承認判断**（Stage 2/★2/UX は並行可・いずれも別承認）。

## Phase X-05-3-VERIFY — 静的安全ゲート CI実走確認（docs-only・GO）

状態: **CI実走確認 GO（利用者実測・確認日 2026-07-04 申告）／X-05-3 完全クローズ／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/69_phase_x05_3_static_safety_gate_ci_verify.md`。反映状態は git refs を正とする。

- ✅ 実測: CI 最新 run（commit `58be7c7`）が **green・失敗なし**。**step 一覧に「Company Brain safety checks」があり緑で成功**（利用者の Actions 画面実測・AI が直接確認したものではない）。
- 🏁 意味: **静的安全ゲートが本稼働**。「存在してはいけないもの」（物理削除・高機密ラベル・外部AI送信ボタン・判定コピー復活）の検査が、全 push・PR で自動実行され続ける。
- 🔒 安全確認: docs-only・code/workflow/script 変更なし・DB操作なし・本番接触なし・外部送信なし・**push なし（commit-only）**。
- 次: doc69 の push（別承認）→ **Stage 2 / Stage 3 / ★2 権限拒否E2E / 次領域入口レビューの人間選択**（いずれも別承認）。

## Phase X-05-3 — Company Brain 静的安全ゲート（判定 GO・commit-only）

状態: **実装完了・判定 GO（commit-only・push/CI実走確認 未実施）／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/68_phase_x05_3_company_brain_static_safety_gate.md`。反映状態は git refs を正とする。

- ✅ 実装: 静的チェック script 1本（Node標準のみ）＋CI Stage 1 への1 step。**「できてはいけないこと（物理削除・高機密ラベル・外部AI送信の許可UI・isHumanUser のローカル復活）がコード上に存在しないこと」を push のたびに機械検査**。
- ✅ 検証: script exit 0（3actions＋UI 147ファイル走査）・test 216・typecheck・lint・build 全green。**apps/packages 差分ゼロ＝app挙動不変**（smoke は未実施と明記・成功扱いしない）。
- 🔒 安全確認: package/lock無変更・DB操作なし・本番接触なし・外部送信なし・実LLM/AIコストなし・Stage 2/3 未着手・369-vault 構造変更なし。
- 次: push-only（別承認）→ **CI 実走確認（新 step 込み・利用者・doc69 候補）** → Stage 2 / ★2 権限拒否テスト / 次領域入口レビューの選択。

## Phase X-05-2-VERIFY — 否定系テスト第一弾 CI実走確認（docs-only・GO）

状態: **CI実走確認 GO（利用者実測・確認日 2026-07-04 申告）／X-05-2 完全クローズ／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/67_phase_x05_2_negative_tests_ci_verify.md`。反映状態は git refs を正とする。

- ✅ 実測: GitHub Actions の CI 最新 run（commit `b27a979`）が **green・失敗なし**（利用者の Actions 画面実測・AI が直接確認したものではない）。
- 🏁 意味: **否定系テスト（AIロール拒否）を含む216本が CI で自動実行される品質ゲートとして本稼働確認済み**。
- 🔒 安全確認: docs-only・code/workflow 変更なし・DB操作なし・本番接触なし・外部送信なし・**push なし（commit-only）**。
- 次: doc67 の push（別承認）→ **★2〜★5 追加否定系テスト / Stage 2（build の CI 追加）の承認判断**。

## Phase X-05-2 — 否定系テスト第一弾（AIロール拒否・判定 GO・commit-only）

状態: **実装完了・判定 GO（commit-only・push 未実施）／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/66_phase_x05_2_negative_tests_ai_role.md`。反映状態は git refs を正とする。

- ✅ テスト化したもの: **「AIは会社の頭脳を書き換えられない」判定（isHumanUser）を shared へ共通化し否定系テスト5本を追加（test 216）**。AI_AGENT が rbac 上 knowledge:create を持つ前提までテストで固定＝将来の権限表変更もテストが検知。
- ✅ 挙動不変の実証: typecheck/lint/build green＋**smoke 18/18**（会社方針・商品カタログ・営業プレイブックの作成フローE2E含む）。修正ループ0回。
- ❌ していないこと: RBAC権限表の変更・書き込み挙動の変更・★2〜★5 の追加テスト・Stage 2/3・**push なし**。
- 次: push-only（別承認・CI が新テスト込みで自動実行）→ ★2〜★5 / Stage 2 の承認判断。

## Phase X-05-1-VERIFY — CI Stage 1 実走確認（docs-only・GO）

状態: **実走確認 GO（利用者実測・確認日 2026-07-04 申告）／Phase X-05-1 完全クローズ／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/65_phase_x05_1_ci_verify.md`。反映状態は git refs を正とする。

- ✅ 実測: GitHub Actions の「CI」最新 run（commit `116efd6`）が **green・失敗なし**（利用者の Actions タブ実測・AI が直接確認したものではない）。
- 🏁 意味: **push/PR のたびにテスト211本・型・lint が自動で走る品質ゲートが本稼働**。品質が「手動の規律」に加えて「自動の仕組み」で守られる状態になった。
- 🔒 安全確認: docs-only・コード/workflow 変更なし・DB操作なし・本番接触なし・外部送信なし・**push なし（commit-only）**。
- 次: doc65 の push（別承認）→ **X-05-2（否定系テスト第一弾）/ Stage 2（build 追加）の承認判断**（isHumanUser の A/B 方式は人間判断）。

## Phase X-05-1 — CI Stage 1 実装（判定 GO・commit-only）

状態: **実装完了・判定 GO（commit-only・push/実走確認 未実施）／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/64_phase_x05_1_ci_stage1.md`。反映状態は git refs を正とする。

- ✅ 実装: **workflow 1ファイルのみ**（`.github/workflows/ci.yml`）。push/PR のたびに test 211・typecheck・lint が自動実行される（DB不要・secrets不要・既存 script のみ）。**app code変更なし・package/lock変更なし**。
- ✅ 検証: ローカルで Stage 1 相当4コマンドすべて green（修正ループ0回）。actionlint は環境未インストールのため未実施（成功扱いしない）。
- ⏳ 未実施: push（別承認）・**GitHub Actions 実走確認は push後**（利用者が Actions タブで確認・doc65 候補）。
- 🔒 安全確認: DB操作なし・本番接触なし・deploy なし・外部送信なし・Stage 2/3 未実装・否定系テスト未実装。
- 次: push-only（別承認）→ 実走確認 → **X-05-2（否定系テスト）/ Stage 2 の承認判断**。

## Phase X-05-ENTRY — CI・否定系テスト設計確認（docs-only・READY / GO）

状態: **設計確認済み（判定 READY / GO・commit-only）／実装は未着手・別承認待ち／GO済み基準は Phase 2-B-5/`83d35bc` のまま** — 詳細 `docs/audit/63_phase_x05_ci_negative_tests_design.md`。反映状態は git refs を正とする。

- ✅ 設計の柱: CI 3段階導入（既存 script のみ・新コマンドなし）＋否定系テスト8対象（優先順つき）＋機械ゲートの script 化案。
- 🔎 最重要発見: **AIロールの Company Brain 書き込み禁止は actions 層の isHumanUser が唯一の砦で、自動テストゼロ**（rbac 層の否定系テストは既存だが AI_AGENT は knowledge:create を持つ）。ここを X-05-2 の最優先対象に設定。
- 🔒 安全確認: docs-only・実装なし・workflow作成なし・test作成なし・package/lock変更なし・DB操作なし・本番接触なし・外部送信なし・**push なし（commit-only）**。
- 次: doc63 の push（別承認）→ **X-05-1: CI Stage 1 実装の承認判断** → X-05-2: 否定系テスト第一弾（isHumanUser A/B 方式は人間判断）。**Phase 2-C / Case Study / Customer Pain は別承認**。

## Phase 2-B-CLOSE — Phase 2-B 全体クローズ判定（docs-only・GO）

状態: **Phase 2-B 正式完了（判定 GO・commit-only）／完了対象の最新本番確認GO済み基準 Phase 2-B-5/`83d35bc`** — 詳細 `docs/audit/62_phase2b_completion_record.md`・doc14 §51。反映状態は git refs を正とする。

- ✅ 照合: 完了条件20項目すべて証拠付きで充足（doc50〜doc61 の判定行・GO済み基準・未解消HOLDゼロ・schema/seed/rbac/labels の未承認変更ゼロ・externalAiAllowed true UI ゼロを git/grep 実測で確認）。
- 🏁 成果: 営業プレイブックが「人間が書き・AIが読み・読んだら記録（ai_reference）・外部AIには出さない」で本番稼働。Company Brain 3テーブル体制が完成。smoke 18本。
- 📌 教訓: HOLD 2件はどちらも**コード修正ゼロ**で解消（キャッシュ／ログの見る場所）。「慌てて直さず read-only 調査→再実測」の型が有効。
- 🔒 安全確認: docs-only・push なし・外部送信/SNS/口コミ/顧客の声公開/ENSHiN OS外部発信なし・Phase 8なし。
- 次: doc62＋doc14 §51 の push（別承認）→ 次領域入口レビュー or 改善候補（人間選択）。**Phase 2-C は別承認**。

## Phase 2-B-5-PROD — SalesPlaybookEntry AI参照の本番確認（docs-only・GO）

状態: **本番確認 GO（利用者再実測・2026-07-04 申告）／GO済み基準を Phase 2-B-5/`83d35bc` に更新・Phase 2-B-5 完全クローズ** — 詳細 `docs/audit/61_phase2b5_production_confirmation.md`・doc14 §50。反映状態は git refs を正とする。

- ✅ 実測: 本番UIで作成した「テスト1」→検索「test1」→**「参照した会社の頭脳」にタイトル表示**→**`/admin/data-access-logs` に AI参照（entityType=SalesPlaybookEntry）**・既存5画面無回帰・エラー/外部送信なし。
- 🔎 切り分けの教訓: 初回NGの実体は**表示場所の違い**（ai_reference は監査ログ本体ではなく機密参照ログ/`/admin/data-access-logs`）。**68点=FakeLLM 仕様**（信頼度0.68固定・実LLMキー設定は外部送信解禁とセットの別承認）。Supabase dashboard のエラーログはアプリ無関係の可能性大（断定しない）。
- 📌 注記: **AI が本番接続確認したものではない**（利用者の本番画面実測・チャット提出・実測日は申告値をそのまま記録）。
- 🔒 安全確認: docs-only・コード変更なし・DB操作なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・externalAiAllowed 全件 false 維持・**push なし（commit-only）**。
- 次: doc61 の push（別承認・feature＋main）→ **Phase 2-B 全体クローズ判定（doc62 候補・別承認）**。改善候補（別承認）: 頭脳2画面→プレイブックのタブ導線・アーカイブ文言/視認性・実LLMキー設定。

## Phase 2-B-5 — SalesPlaybookEntry AI参照の最小実装（判定 GO・commit-only）

状態: **実装完了・判定 GO（commit-only・push/本番確認 未実施）／GO済み基準は Phase 2-B-4/`26a7a30` のまま** — 詳細 `docs/audit/60_phase2b5_sales_playbook_ai_reference_impl.md`。反映状態は git refs を正とする。

- ✅ 実装: AI参照ヘルパーに営業プレイブックを3テーブル目として追加（doc59 どおり・read-only・上限5件据え置き・doNotSay「言わない:」プレフィックス・related IDs 未展開・外部LLM時は構造的にゼロ）。ai_reference は既存 writeAIDataAccess 流用でレコードごと自動記録（knowledge/search・audit.ts・db.ts は無変更で完走）。
- ✅ 検証: **test 211・typecheck・lint・build・migrate deploy pendingなし・seed playbooks:6・smoke 18/18 green（18本目=参照元表示・既存17本回帰なし・検証RED 0回）**。
- ⏳ 未実施: push（別承認）・本番確認（doc49 の型・**本番に実在する営業プレイブックで確認**・doc61 候補）。**AI が本番接続確認したものではない**。
- 🔒 安全確認: AI mutation なし（書き込みは人間専用のまま）・schema/migration/seed/rbac/labels/package/lock 無変更・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし。
- 次: push-only（別承認）→ 本番確認 → **Phase 2-B 全体クローズ判定**。

## Phase 2-B-5-ENTRY — SalesPlaybookEntry AI参照追加の設計確認（docs-only・READY / GO）

状態: **設計確認済み（判定 READY / GO・commit-only）／実装は未着手・別承認待ち／GO済み基準は Phase 2-B-4/`26a7a30` のまま** — 詳細 `docs/audit/59_phase2b5_sales_playbook_ai_reference_design.md`。反映状態は git refs を正とする。

- ✅ 設計の柱: 2-A-3c-2 実証済みの型に**3テーブル目を足す最小差分**（schema/migration 不要・変更は実質1ファイル＋smoke 18本目・MAX_TOTAL=5 据え置き）。安全境界は既存と同一（read-only・tenantId・archivedAt:null・NORMAL/INTERNAL・canAccessLabel・ai_reference レコードごと記録・外部LLM時は externalAiAllowed＋maskText ゲート=全件 false のため構造的にゼロ）。
- 🔎 固有の注意点: doNotSay は「言わない:」プレフィックス付きで文脈化／related IDs の展開はスコープ外／本番確認は「本番に実在する営業プレイブックで確認」（2-A-3c-2 HOLD の教訓を最初から適用）。
- 🔒 安全確認: docs-only・実装なし・AI参照実行なし・DB操作なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・**push なし（commit-only）**。
- 次: doc59 の push（別承認・feature＋main）→ **Phase 2-B-5 実装の承認判断**（実装→push→本番確認→Phase 2-B クローズ判定、が残りの道筋）。

## Phase 2-B-4-PROD — SalesPlaybookEntry 人間書き込みの本番確認（docs-only・GO）

状態: **本番確認 GO（利用者実測・2026-07-04）／GO済み基準を Phase 2-B-4/`26a7a30` に更新・Phase 2-B-4 完全クローズ** — 詳細 `docs/audit/58_phase2b4_production_confirmation.md`・doc14 §49。反映状態は git refs を正とする。

- ✅ 実測: **作成→編集→アーカイブの1周 OK**（架空内容のみ・入力安全確認済み）・ラベル2択のみ・外部AI送信UIなし・入力ガイド表示・**監査ログに3操作すべて記録**・既存画面無回帰・エラーなし・Vercel Ready・latest commit `26a7a30`。
- 📌 注記: **AI が本番接続確認したものではない**（利用者の本番画面実測・チャット提出・実測日は利用者申告値をそのまま記録）。今回は HOLD なしの一発 GO（書き込み本番確認の3例目・doc41/doc43 と同じ型）。
- 🔒 安全確認: docs-only・コード変更なし・DB操作なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・**push なし（commit-only）**。
- 次: doc58 の push（別承認・feature＋main）→ **Phase 2-B-5（AI参照追加）の承認判断**（設計 doc51 §6・前例 2-A-3c-1/3c-2）。改善候補（別承認）: CI導入・否定系テスト・doc49 script化。

## Phase 2-B-4 — SalesPlaybookEntry 人間書き込み（作成・編集・アーカイブ）

状態: **実装完了・判定 GO（commit-only・push/本番確認 未実施）／GO済み基準は Phase 2-B-3/`a2bb2b6` のまま** — 詳細 `docs/audit/57_phase2b4_sales_playbook_write.md`。反映状態は git refs を正とする。

- ✅ 実装: 3 Server Action（create/update/archive）＋作成・編集フォーム＋一覧の権限別ボタン。2-A-3b-1/3b-2 の型を流用し、**AI mutation禁止（actions 層・rbac.ts 無変更）・writeAudit 3操作・物理削除なし・label 2択・externalAiAllowed 封印・入力ガイド画面明記**を最初から組み込み。
- ✅ 検証: **test 211・typecheck・lint・build（3ルート生成）・migrate deploy pendingなし・seed playbooks:6・smoke 17/17 green（既存15本回帰なし・修正ループ0回）**。16本目はナビHOLD（doc55→doc56）の教訓を反映してナビ経由確認へ**意図的に期待値更新**（doc57 §5）・17本目=作成フロー追加。
- ⏳ 未実施: push（feature も main も・別承認）・本番確認（doc49 の型・利用者実測・doc58 候補: 作成→編集→アーカイブ1周・doc41 と同形）。**AI が本番接続確認したものではない**。
- 🔒 安全確認: schema/migration/seed/rbac/labels/package/lock 無変更・writeDataAccess/ai_reference 未実装（**AI はまだ営業プレイブックを読まない・2-B-5 別承認**）・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・本番DB操作なし。
- 次: push-only（別承認）→ 本番確認 → **Phase 2-B-5（AI参照追加）の承認判断**。

## Phase 2-B-3-PROD-2 — 営業プレイブック ナビHOLDの再実測（docs-only・HOLD解消・GO）

状態: **HOLD解消・再実測GO（利用者再実測・2026-07-06）／GO済み基準を Phase 2-B-3/`a2bb2b6` に更新・Phase 2-B-3 完全クローズ** — 詳細 `docs/audit/56_phase2b3_prod2_nav_recheck.md`・doc14 §48。反映状態は git refs を正とする。

- ✅ 実測: **ハードリロードでナビに「営業プレイブック」が出た**（HOLD の唯一のNGが解消）。直打ちOK・空一覧=正常・ボタンなし・既存画面無回帰・エラーなし・外部送信なし・Vercel Ready。
- 🔎 原因の整理: ハードリロードで解消＝**ブラウザキャッシュ／古いタブのJSバンドル起因の可能性が高い**。repo側は事前の read-only 調査で潔白確認済みで、**コード修正不要**。キャッシュ同型の HOLD→再実測GO は doc37→38 に続く前例（慌てて修正しない原則が3例目も機能）。
- 📌 注記: **AI が本番接続確認したものではない**（利用者の本番画面実測）。doc55/§47 の HOLD は消さず追記主義で解消。改善候補: smoke にナビ表示検証を追加（別承認）。
- 🔒 安全確認: コード修正なし・nav.ts修正なし・DB操作なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・**push なし（commit-only）**。
- 次: doc56 の push（別承認・feature＋main）→ **Phase 2-B-4（人間書き込み）の承認判断**。

## Phase 2-B-3-PROD — SalesPlaybookEntry read-only 可視化の本番確認（docs-only・判定 HOLD）

状態: **本番確認 HOLD（利用者再確認・2026-07-05）／GO記録を main 反映前に差し止めて HOLD へ訂正／GO済み基準は Phase 2-B-2/`811b8c6` のまま** — 詳細 `docs/audit/55_phase2b3_production_confirmation.md`・doc14 §47。反映状態は git refs を正とする。

- ❌ NG（最新の実測）: **「営業プレイバックは再確認をしたら表示されていない」**。表示されない箇所（ナビか /brain/playbooks 画面か）は未特定。
- 📝 経緯: 初回報告「全てGO」→ GO記録 commit（`6c1b5e9`・feature のみ・main 未反映）→ 追加実測で NG → **main に入る前に HOLD へ訂正**（`461d008`・「矛盾する GO を正史に入れない」が機能）→ **最新の詳細実測で症状をナビ表示のみに特定**（本精密化）。
- 🎯 最新実測（詳細）: **NG はナビ表示の1点のみ**。/brain/playbooks 直打ちは開く・空一覧（本番 seed 未実行のため正常）・ボタンなし・既存画面・エラーなし・外部送信なし=すべてOK（画面・権限ガード・データ表示は本番で正常動作）。
- 🔎 原因は未特定・断定しない: 有力観点=ナビは全画面共通部品のため**キャッシュ/反映タイミング**（doc37→38 と同型の前例・初回に「表示された」報告とも整合し得る）／repo側は nav.ts 該当1行と表示条件の read-only 確認。
- 📌 注記: **AI が本番接続確認したものではない**。コード修正なし・DB操作なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし。
- 次: HOLD訂正の main 反映（push-only・別承認）→ **read-only 原因調査**（コード修正しない）→ 原因特定 → 再実測 → GO記録（doc56 候補）。**HOLD 解消まで Phase 2-B-4 に進まない**。

## Phase 2-B-3 — SalesPlaybookEntry read-only 可視化

状態: **実装完了（判定 GO・smoke 16/16 green・commit-only）／push・本番確認は未実施（別承認）** — 詳細 `docs/audit/54_phase2b3_sales_playbook_readonly.md`。反映状態は git refs を正とする。

- 🔧 変更: seed 6件（4種網羅・安全データのみ）＋read-only 一覧 `/brain/playbooks`＋ナビ1行＋smoke 16本目（許可9ファイルのみ）。
- ✅ 検証: db:generate → test 211 → typecheck → lint → build（/brain/playbooks ルート生成確認）→ migrate deploy pendingなし → seed playbooks:6 → /login 200 → **smoke 16/16 green（13.0s・既存15本回帰なし）** → server/PG 後片付け済み。修正ループ0回。
- 🔒 遵守: read-only 厳守（Server Action/writeAudit/writeDataAccess/AI参照なし）・schema/migration/rbac/labels/package 無変更・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし・**push なし（commit-only）**。
- 📌 本番確認の事前定義（doc49 原則）: 本番は seed 未実行のため**一覧が空で正常**。GO 条件=画面が開く＋空一覧＋ナビ表示＋既存画面無回帰。
- 次: push-only（feature＋main・別承認）→ 本番確認（doc55 候補）→ **Phase 2-B-4（人間書き込み）承認判断**。

## Phase 2-B-2-PROD — SalesPlaybookEntry schema変更の本番確認（docs-only・GO）

状態: **本番確認 GO（利用者実測・2026-07-05）／GO済み基準を Phase 2-B-2/`811b8c6` に更新・Phase 2-B-2 完全クローズ** — 詳細 `docs/audit/53_phase2b2_production_confirmation.md`・doc14 §46。反映状態は git refs を正とする。

- ✅ 実測: Vercel Ready/green・build成功・commit `811b8c6`・ログインOK・既存画面（会社の頭脳・ナレッジ検索・顧客・LeadMap）無回帰・**Sales Playbook 画面なしが正常（schema-only）**・エラーなし・外部送信なし。
- 📌 注記: **AI が本番接続確認したものではない**（利用者の本番画面実測）。build成功＝migration（CREATE TABLE＋INDEX のみ）の本番適用成功の証跡。テーブルの実利用確認は 2-B-3 の read-only 画面実装後の本番確認で行う。
- 🔒 安全確認: コード修正なし・DB手動操作なし・migrate deploy 手動実行なし・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし。
- 次: doc53 の main 反映（push-only・別承認）→ **Phase 2-B-3（read-only 一覧＋seed＋smoke＋本番確認）の承認判断**。

## Phase 2-B-2 — SalesPlaybookEntry schema変更・migration作成

状態: **schema変更完了・ローカル検証全green（判定 GO）／main反映・本番確認は未実施（別承認）／UI・seed・実装は未着手** — 詳細 `docs/audit/52_phase2b2_sales_playbook_schema_change.md`。反映状態は git refs を正とする。

- 🔧 変更: schema.prisma に model 追加（追加のみ・既存無変更）＋新規 migration 1つ（destructive 0）＋doc52＋tasks 2件＋vault 2件。
- ✅ 検証: localhost 確認 → prisma validate → migrate dev（ローカル）→ status up to date → **test 211 / typecheck / lint / build 全green**。修正ループ: PG起動のログパス1回のみ（コマンド側の問題・スキーマ無関係）。
- 📌 未実施（正直に記録）: E2E（UI変更なしのため対象外）・seed（禁止事項）・**本番確認（push-only 別承認後に doc49 の型で。schema-only のため既存画面無回帰が主眼・新画面なしが正常）**。
- 🔒 安全確認: 本番DB接続なし・migrate deploy 実行なし・rbac/labels/seed/package 無変更・外部送信/SNS/口コミ/顧客の声公開なし・Phase 8なし・ENSHiN OS外部発信なし。
- 次: push-only（別承認）→ 本番確認 → **Phase 2-B-3（read-only 一覧＋seed＋smoke＋本番確認）の承認判断**。

## Phase 2-B-1 — SalesPlaybookEntry 設計 docs-only

状態: **設計完了（判定 GO）／実装未着手・schema未変更・次は人間判断（Phase 2-B-2 schema変更の承認）** — 詳細 `docs/audit/51_phase2b1_sales_playbook_design.md`。反映状態は git refs を正とする。

- 📄 変更: doc51 新規＋CURRENT_STATE 更新＋vault note（[[Phase2B1SalesPlaybook設計]]）＋index link＋本ファイル（docs-only 5ファイルのみ）。
- 🧱 設計の柱: ①「売り方の型」専用（顧客事例・顧客の声・testimonial・外部公開素材では**ない**ことを明記）②既存2モデルの流儀踏襲＋関連参照は ID配列案を推奨 ③入力ガイド必須（顧客名・成果数値・口コミを書かない／doNotSay に No.1・効果保証等の禁止例を蓄積）④安全境界は 2-A 流用（AI mutation禁止・label 2択・externalAiAllowed 封印・ソフトアーカイブ）⑤AI参照は 2-B-5 の別承認（ai_reference レコードごと・参照元表示）。
- 🔒 安全確認: schema変更なし・migration なし・実装なし・DB操作なし・外部送信なし・口コミ/SNS/顧客の声公開なし・Phase 8 なし・ENSHiN OS外部発信なし。
- 📌 未決事項（人間判断）: 呼称（Phase 2-B）・参照構造の採否・playbookType 候補・seed 内容・AI参照時期・Case Study 着手時期・ENSHiN OS 資料提供。
- 次: doc51 の main 反映（push-only・別承認）→ **Phase 2-B-2（schema変更）の承認判断**。

## Phase 2-B-ENTRY — Company Brain後続領域の入口レビュー

状態: **入口レビュー完了（判定 READY / GO）／実装・schema・migration は未着手・次は人間判断** — 詳細 `docs/audit/50_phase2b_entry_review.md`。反映状態は git refs を正とする。

- 📄 変更: doc50 新規＋CURRENT_STATE 更新＋vault note（[[Phase2B入口レビュー]]）＋index link＋本ファイル（docs-only 5ファイルのみ）。
- 🔍 評価: 3候補の比較表（PII近接度・許諾要否・ENSHiN OS/外部発信への近さ・2-A安全境界の流用可否）。**推奨順序: ①Sales Playbook（安全・型流用・価値早い）②Case Study（許諾・匿名化・公開前承認とセット）③Customer Pain（高機密対応の後・最後）**。
- 🛡️ ENSHiN OS 安全観点: Case Study は顧客の声・testimonial・紹介・ブランディング素材と構造的に近接 → **許諾管理・公開前人間承認・広告表現チェック（No.1/効果保証は人間法務判断へ）・外部発信ログが同時必須**（doc49 §10 適用）。口コミ投稿・SNS投稿・顧客の声公開は AI 自己判断で行わない原則を再確認。
- 📌 注記: 呼称整理（roadmap 01 の「2-B」= CRM/Sales AI とは別物）を人間判断に送付。Enshin OS 詳細仕様は未提供（証拠不足）のまま。
- 次: doc50 の main 反映（push-only・別承認）→ **Phase 2-B-1（SalesPlaybookEntry 設計 docs-only）の承認判断**。承認後も schema・実装は三段承認の別承認。

## Phase X-04 — 本番スモーク定型化・本番確認プレイブック

状態: **docs-only 完了（判定 GO・2026-07-04）／script化・E2E拡張・本番自動監視は後続別承認** — 詳細 `docs/audit/49_phase_x04_production_smoke_playbook.md`。反映状態は git refs を正とする。

- 📄 変更: doc49 新規＋CURRENT_STATE 更新＋vault note（[[PhaseX04本番スモーク定型化]]）＋index link＋本ファイル（docs-only 5ファイルのみ・doc14 追記なし）。
- 🎯 内容: Phase 2-A の HOLD 2件の教訓を恒久資産化。①本番確認は利用者実測のみ（AI非確認注記必須）②§0 テンプレート標準形（未記入なら停止）③GO / HOLD / STOP 判定ルール④**本番に実在するデータで確認**⑤テストデータは本番UIで作成→アーカイブで片付け⑥docs-only 記録とコード修正の分離⑦ENSHiN OS 追加停止条件（口コミ・SNS・顧客の声・許諾・広告表現）⑧標準プロンプト骨子。
- 🔒 安全確認: コード変更なし・本番接触なし・外部送信なし・課金なし・ENSHiN OS外部発信なし。
- 次: doc49 の main 反映（push-only・別承認）→ Phase 2-B / Phase X-04 script化 / 3c-5 / ENSHiN OS 資料提供の人間選択。

## Phase 2-A-CLOSE — Company Brain foundation 完了判定

状態: **Phase 2-A 正式完了（判定 GO・2026-07-04）** — 詳細 `docs/audit/48_phase2a_completion_record.md`・doc14 §45。反映状態は git refs を正とする。

- 📄 変更: doc48 新規＋doc14 §45 追記＋CURRENT_STATE 更新＋vault note（[[Phase2A完了]]）＋index link＋本ファイル（docs-only 6ファイルのみ）。
- ✅ 判定 GO の根拠: doc31 入口条件・doc33 設計と実績（doc33〜47）を照合し、完了判定15条件すべて証拠付きで充足。**Phase 2-A の到達点＝会社方針・商品カタログを人間が育て、AIが安全に読み、読んだ記録（ai_reference）が残る基盤が本番確認GOまで完成**。最新GO済み基準 Phase 2-A-3c-2/`85f1bf3`。
- 📌 後続送り（個別人間承認まで着手しない）: 高機密ラベル解禁・externalAiAllowed true UI・外部LLM送信解禁・3c-5・後続3テーブル（Case Study 等）・Phase 8課金・MCP/API公開・ENSHiN OS外部発信/口コミ/SNS/顧客の声公開。
- 🔒 安全確認: 外部送信なし・課金なし・ENSHiN OS外部発信なし・コード/DB/schema/rbac/labels 無変更。
- 次: doc48 の main 反映（push-only・別承認）→ Phase 2-B / Phase X-04 / 3c-5 / ENSHiN OS 資料提供の人間選択。

## Phase 2-A-3c-2-PROD-2 — Company Brain AI参照の本番HOLD解消（docs-only・再実測 GO）

状態: **HOLD解消・再実測GO（利用者実測・2026-07-04）／GO済み基準を Phase 2-A-3c-2/`85f1bf3` に更新** — 詳細 `docs/audit/47_phase2a3c2_hold_resolution_go.md`・doc14 §44。反映状態は git refs を正とする。

- ✅ 原因の実測確定: 本番一覧に「値引き承認ルール」は**存在しなかった（NOT_PRESENT）**。初回検索でも既存ナレッジ由来の AI回答は表示されていた（参照セクション非表示は候補0件時の実装どおり）＝**前回HOLDはコードのバグではなく本番データ前提差**。
- ✅ 再実測GO: 本番UI（GO済みの 2-A-3b-1 機能）で会社方針を作成後、AI回答・「参照した会社の頭脳」・参照元タイトル「値引き承認ルール」・CompanyPolicy の ai_reference ログすべて表示。既存検索・既存画面も無回帰。外部送信なし。
- 📌 注記: **AI が本番接続確認したものではない**（利用者の本番画面実測）。doc46/§43 の HOLD 記録は消さず保持（追記主義）。コード修正・DB直接操作・schema/rbac/labels 変更・外部LLM送信・ENSHiN OS外部発信なし。
- 📖 教訓: 本番確認は**本番に実在するデータで確認する手順**にする（seed 前提で確認項目を設計しない）。
- 次: doc47 の main 反映（push-only・別承認）→ **Phase 2-A 全体クローズ判定 or 3c-5 判断**（個別人間承認）。

## Phase 2-A-3c-2-PROD — Company Brain AI参照の本番確認（docs-only・判定 HOLD）

状態: **本番確認 HOLD（利用者実測・2026-07-04）／read-only 原因調査へ** — 詳細 `docs/audit/46_phase2a3c2_production_confirmation.md`・doc14 §43。反映状態は git refs を正とする。

- ✅ 無回帰確認（利用者実測）: Vercel Ready・latest commit `85f1bf3`・ログイン・既存ナレッジ検索・既存画面・外部送信不発生すべて OK。
- ❌ NG: **「値引き承認ルール」で AI回答が表示されない・「参照した会社の頭脳」セクション自体が未表示**。**総合判定 HOLD・GO にしない・GO済み基準は Phase 2-A-3b-2/`aa40f2f` のまま**。
- 🔎 原因は未特定・断定しない: 参考仮説=①本番DBは seed 未実行のため「値引き承認ルール」データが不在（参照セクション非表示は前提データ差の可能性）②AI回答未表示は①では説明できず別要因の可能性（doc46 §3）。次の read-only 調査で切り分け。
- 📌 注記: **AI が本番接続確認したものではない**。コード修正・DB・schema・rbac・labels 変更なし・外部LLM送信なし・ENSHiN OS外部発信なし・push なし（commit-only）。
- 次: HOLD記録の main 反映（push-only・別承認）→ **read-only 原因調査** → 再実測 → GO記録（doc47 候補）。HOLD解消まで 3c-5 に進まない。

## Phase 2-A-3c-2 — Company Brain AI参照（取得＋ai_referenceログ＋ナレッジ検索注入）最小実装

状態: **実装完了（GO・smoke 15/15 green・commit-only）／push・本番確認は別承認で未実施** — 詳細 `docs/audit/45_phase2a3c2_company_brain_ai_reference_impl.md`。反映状態は git refs を正とする。

- 🎯 目的: doc44 設計＋§0 人間判断（タスク=ナレッジ検索のみ・粒度=レコードごと1件）に基づき、AI が Company Brain を読む最初の経路を最小実装する。
- 🔧 変更: 参照ヘルパー新規（read-only・NORMAL/INTERNAL・canAccessLabel・決定的順位付け・件数上限・**外部LLMゲート: externalAiAllowed=true＋maskText のみ＝現状注入ゼロ**）＋ナレッジ検索へ3点だけ追加（contexts 注入・レコードごとの ai_reference 記録・「参照した会社の頭脳」表示）＋smoke 15本目。actorType は既存パターン（'user'）を優先し理由を doc45 に記録。
- ✅ 検証: test 211・typecheck・lint・build 全green → migrate deploy pendingなし → seed → /login 200 → **smoke 15/15 green（11.5s・既存14本回帰なし）** → 後片付け済み。修正ループ0回。
- 🔒 遵守: **AI mutation なし（読む経路のみ）／外部LLM送信なし／高機密未対応のまま／schema・migration・rbac・labels・seed・brain/**・packages/ai provider・package/lock 無変更／ENSHiN OS外部発信なし／git push なし（commit-only）**。
- 次: feature push＋main push（別承認）→ **本番確認（利用者実測・doc46 候補）** → 3c-5（高機密・外部LLM解禁の重い承認）判断。

## Phase 2-A-3c-1 — Company Brain AI参照経路＋writeDataAccess 設計（docs-only）

状態: **設計完了（GO・docs-only）／実装は 2-A-3c-2 の個別承認まで行わない** — 詳細 `docs/audit/44_phase2a3c_ai_reference_design.md`。反映状態は git refs を正とする。

- 🎯 目的: AI が Company Brain を読む段の前に、「読んだ記録（writeDataAccess）」と「外部LLMへ出さない仕組み（externalAiAllowed ゲート＋maskText）」を設計として固定する。
- 🔎 実測に基づく設計: ナレッジ検索画面に AI 参照の完成形パターンが既存（注入ガード・canAccessLabel・ai_reference ログ・引用表示）→ **最小差分での流用を推奨**。getLLMProvider はキー未設定なら FakeLLM（ローカル）＝外部送信は構造的にゼロ。
- 📐 設計の核心: 参照範囲=tenantId・archivedAt:null・**NORMAL/INTERNAL のみ**／外部LLM送信は **externalAiAllowed=true＋maskText 済みのみ**（true UI 無し＝安全側デフォルト）／記録は **action='ai_reference' をレコードごと1件**（推奨・粒度は人間判断）／第一接続タスクは**ナレッジ検索を推奨**／参照元を回答に明示。
- 🧭 段取り: 3c-2（取得＋記録＋注入＋smoke 15本目）→ 3c-4（本番確認）→ 3c-5（高機密・externalAiAllowed true・外部LLM送信の重い承認）。未決定7点は人間判断（doc44 §9）。
- 🔒 遵守: **実装なし／DB・schema・migration・rbac・labels 変更なし／AI参照実行なし／writeDataAccess実行なし／外部LLM送信なし／課金・決済・ENSHiN OS外部発信なし**。
- 次: main push（別承認）→ **doc44 §9 の人間判断 → Phase 2-A-3c-2 実装承認**。

## Phase 2-A-3b-2-PROD — ProductCatalogItem 書き込み本番確認（docs-only）

状態: **本番確認 GO（利用者実測・2026-07-04）／Company Brain の2テーブルの人間書き込みは本番確認まで完全クローズ** — 詳細 `docs/audit/43_phase2a3b2_production_confirmation.md`・doc14 §42。反映状態は git refs を正とする。

- ✅ 利用者実測: Vercel Ready・latest commit `aa40f2f`・商品カタログの**作成→編集→アーカイブの1周 OK**・**ラベル2択（通常/社内限のみ）OK**・**価格メモの「請求・課金に使わない」注意書き OK**・**/admin/audit に ProductCatalogItem の記録 OK**・既存画面回帰なし。
- 📌 注記: **AI が本番接続確認したものではない**。GO済み基準は **Phase 2-A-3b-2 / `aa40f2f`** に更新（前基準 2-A-3b-1/`706358e` は保持）。schema/migration/rbac/labels/seed 無変更・ENSHiN OS 外部発信・口コミ・SNS・顧客の声公開なし。
- 次: main push（push-only・別承認）→ **writeDataAccess＋AI参照経路の設計/実装承認判断**（Company Brain を AI が読む段・別承認）。

## Phase 2-A-3b-2 — ProductCatalogItem 書き込み最小実装（作成・編集・アーカイブ）

状態: **実装完了（GO・smoke 14/14 green）／本番確認は未実施（main push→利用者実測が次）** — 詳細 `docs/audit/42_phase2a3b2_product_catalog_write.md`。反映状態は git refs を正とする。

- 🎯 目的: Company Brain 書き込み第二段。商品カタログに 2-A-3b-1 と同じ型で3操作を追加し、**安全境界（AI mutation禁止・label 2択・externalAiAllowed 封印・ソフトアーカイブ）を最初から組み込む**。
- 🔧 変更: Server Action 3本＋new/edit 画面（label htmlFor/id・注意書き4点・高機密は編集フォーム非表示）＋一覧の権限別ボタン＋writeAudit 全操作＋smoke 14本目（既存13本無変更）。**priceNote は説明テキストのみで請求・課金・見積・会計に接続しない**（画面注記＋コード上も未接続）。productAssetId は UI で扱わない。
- ✅ 検証: test 211・typecheck・lint・build 全green → migrate deploy（pendingなし）→ seed → /login 200 → **smoke 14/14 green（10.1s・既存13本回帰なし）** → 後片付け済み。**修正ループ0回**（境界を先に決めた型の水平展開の効果）。
- 🔒 遵守: **brain/policies・schema・migration・seed.ts・rbac.ts・labels.ts・nav.ts・package/lock 無変更／AI は書けない・消せないまま（権限拡大ゼロ）／delete・deleteMany 不使用／外部送信・課金・決済・本番接触・ENSHiN OS外部発信なし**。
- 次: main push（push-only・別承認）→ **本番確認（利用者実測・doc43 候補）** → writeDataAccess＋AI参照経路の承認判断。

## Phase 2-A-3b-1-PROD — CompanyPolicy 書き込み本番確認（docs-only）

状態: **本番確認 GO（利用者実測・2026-07-04）／Phase 2-A-3b-1 は完全クローズ** — 詳細 `docs/audit/41_phase2a3b1_production_confirmation.md`・doc14 §41。反映状態は git refs を正とする。

- ✅ 利用者実測: Vercel Ready・latest commit `706358e`・ログイン／ダッシュボード／既存主要画面 OK・**作成→編集→アーカイブの1周 OK**・**機密ラベル2択（通常/社内限のみ）OK**・**/admin/audit に CompanyPolicy の記録 OK**。
- 📌 注記: **AI が本番接続確認したものではない**。GO済み基準は **Phase 2-A-3b-1 / `706358e`** に更新（前基準 2-A-3a/`9533488` は保持）。schema/migration/rbac/labels/seed 無変更・ENSHiN OS 外部発信・口コミ・SNS・顧客の声公開なし。
- 次: main push（push-only・別承認）→ **Phase 2-A-3b-2（ProductCatalogItem 書き込み・AI mutation禁止と label 2択を最初から組み込み）** の承認判断。writeDataAccess は次段送りのまま。

## Phase 2-A-3b-1-SAFE — CompanyPolicy 書き込み境界の安全補正

状態: **安全補正完了（GO・smoke 13/13 green 維持）** — 詳細 `docs/audit/40_phase2a3b1_company_policy_safety_patch.md`。反映状態は git refs を正とする。

- 🔒 補正①: **AI mutation禁止** — `isHumanUser`（`isAiRole` を roles 全件に適用・roles 空も拒否）を create/update/archive の3 Action 先頭に追加。rbac.ts 無変更のまま、会社方針の変更を人間専用化。
- 🔒 補正②: **label は NORMAL / INTERNAL のみ** — サーバ側 `ALLOWED_LABELS` 縮小＋フォーム2択化＋高機密ラベルの方針は編集フォーム非表示。**高機密ラベルは writeDataAccess 実装時まで保留**。
- ✅ 維持確認: externalAiAllowed 封印（create false 固定/update 不変更/UI 不可）・物理削除なし・smoke 13/13 green（既存12本回帰なし）。
- 次: main push（`9eea086`＋本補正の2コミット・別承認）→ 本番確認 → **Phase 2-A-3b-2（ProductCatalogItem）** の承認判断。

## Phase 2-A-3b-1 — CompanyPolicy 書き込み最小実装（作成・編集・アーカイブ）

状態: **実装完了（GO・smoke 13/13 green）／ProductCatalogItem 書き込みと writeDataAccess は次段（2-A-3b-2 以降）の個別承認まで未実装** — 詳細 `docs/audit/39_phase2a3b1_company_policy_write.md`。反映状態は git refs を正とする。

- 🎯 目的: Company Brain の書き込み第一段として、CompanyPolicy（会社方針）のみに作成・編集・アーカイブを追加する。
- 🔧 変更: Server Action 3本（create=knowledge:create／update・archive=knowledge:update。物理削除なし・archivedAt ソフトアーカイブのみ・externalAiAllowed は create false 固定/update 不変更）＋new/edit 画面（label htmlFor/id 対応・PII/secret 禁止の注意書き）＋一覧に権限別ボタン（read-only ユーザーは従来どおり閲覧のみ）＋writeAudit 全操作記録＋smoke 13本目（作成→一覧反映・既存12本無変更）。
- ✅ 検証: test 211・typecheck・lint・build 全green → PG起動 → migrate deploy（pendingなし・新migrationなし）→ seed → /login 200 → **smoke 13/13 green（10.7s・既存12本回帰なし）** → 後片付け済み。修正ループ0回。
- 🔒 遵守: **schema・migration・seed.ts・rbac.ts・labels.ts・nav.ts・brain/catalog・package/lock 無変更／AI は knowledge:update を持たず編集・アーカイブ不可のまま（権限拡大ゼロ）／delete・deleteMany 不使用／外部送信・課金・決済・本番接触なし**。
- 次: main push（別承認）→ 本番確認 → **Phase 2-A-3b-2（ProductCatalogItem 書き込み）** の承認判断。writeDataAccess は AI 参照経路実装と同時（次段送り）。

## Phase 2-A-3a-PROD-2 — Company Brain 本番確認の HOLD解消・再実測GO（docs-only）

状態: **HOLD解消・再実測 GO（利用者実測・2026-07-03）／Phase 2-A-3a 本番確認まで完全クローズ** — 詳細 `docs/audit/38_phase2a3a_hold_resolution_go.md`・doc14 §40。反映状態は git refs を正とする。

- ✅ 再実測（HOLD後・ハードリロード/開き直し後）: Vercel Ready・latest commit `9533488`・ナビ「会社の頭脳」**表示OK**・`/brain/policies`・`/brain/catalog` **開くOK**（一覧が空でも正常）・作成/編集/削除ボタン**無し（read-onlyで正常）**・既存主要画面すべて OK。
- 📚 記録の系譜: HOLD=doc37＋doc14 §39（**上書きせず保持**・追記主義）／解消GO=doc38＋doc14 §40。前回NGの原因はキャッシュ/反映タイミングの可能性が高いが直接証拠なしのため断定しない。
- 📌 注記: **AI が本番接続確認したものではない**。GO済み基準は **Phase 2-A-3a / `9533488`** に更新（前基準 2-A-2/`ca18450` は保持）。
- 次: main push（push-only・別承認）→ **Phase 2-A-3b（作成・編集・Server Action・writeAudit・writeDataAccess）の承認判断**（別承認）。

## Phase 2-A-3a-PROD — Company Brain read-only 可視化の本番確認（docs-only）

状態: **本番確認 HOLD（利用者実測・2026-07-03）／read-only 原因調査へ** — 詳細 `docs/audit/37_phase2a3a_production_confirmation.md`・doc14 §39。反映状態は git refs を正とする。

- ✅ 利用者実測（無回帰確認）: Vercel Ready・latest commit `9533488`・ログイン／ダッシュボード／顧客・LeadMap 等の既存主要画面すべて正常。
- ❌ NG: ナビ「会社の頭脳」・`/brain/policies`・`/brain/catalog` が本番で未確認/NG（ボタン無し確認は到達不可）。**総合判定 HOLD・GO にしない**。
- 🔎 repo側 read-only 実測: commit `9533488`＝origin/main にナビ1行＋2画面が含まれ、sidebar/mobile-nav に権限フィルタ・feature flag なし → **コード欠落説・flag説は否定**。残候補=本番エイリアス/キャッシュ/確認手順/直アクセス症状の未特定。
- 📌 注記: **AI が本番接続確認したものではない**。本番確認GO済み基準は **Phase 2-A-2 / `ca18450` のまま更新しない**。
- 次: **read-only 原因調査（別ミッション。DB・認証・RBAC・本番環境・Vercel環境変数は変更しない）** → 再実測 → GO記録。**Phase 2-A-3b は HOLD 解消まで進まない**。

## Phase 2-A-3a — Company Brain 最小可視化（seed＋read-only 一覧）

状態: **read-only 可視化完了（GO・smoke 12/12 green）／作成・編集・Server Action は 2-A-3b の個別承認まで未実装** — 詳細 `docs/audit/36_phase2a3a_company_brain_readonly.md`。反映状態は git refs を正とする。

- 🎯 目的: 2-A-2 で入った Company Brain の「器」に架空デモデータを入れ、read-only 一覧で初めて目に見える状態にする（三段承認の第三段の前半）。
- 🔧 変更: seed に **CompanyPolicy 5件＋ProductCatalogItem 8件**（全件 `externalAiAllowed: false`・NORMAL/INTERNAL のみ・PII/secret/実価格なし）＋**read-only 2画面**（`/brain/policies`・`/brain/catalog`。knowledge:read ガード・tenantId スコープ・作成/編集/削除ボタンなし・Server Action なし）＋**ナビ1行**（`components/shell/nav.ts`。sidebar/mobile 共用の NAV 定義なので1ファイルで両対応）＋**smoke 12本目**（既存11本無変更）。
- ✅ 検証: test 211・typecheck・lint・build 全green → ローカルPG起動 → migrate deploy（pending なし）→ seed（policies:5 / catalogItems:8）→ `/login` 200 → **smoke 12/12 green（10.4s・既存11本回帰なし）** → server/PG 停止済み。修正は EmptyState の prop 名1件のみ（typecheck 検出・即収束）。
- 🔒 遵守: **schema・migration・rbac.ts・labels.ts・package/lock 無変更／既存画面無変更（ナビ1行を除く）／外部送信・課金・決済・本番接触なし／externalAiAllowed の既定 false 維持**。
- 次: main push（別承認）→ **Phase 2-A-3b（作成・編集・アーカイブ＋Server Action＋writeAudit＋writeDataAccess）**の承認判断。

## Phase 2-A-2-PROD — Company Brain schema 変更の本番確認（docs-only）

状態: **本番確認 GO（利用者実測・2026-07-02）** — 詳細 `docs/audit/35_phase2a2_production_confirmation.md`・doc14 §38。反映状態は git refs を正とする。

- ✅ 利用者実測: Vercel Ready / build green・latest commit `ca18450`・ログイン／ダッシュボード／顧客／LeadMap すべて OK・**Company Brain UI は未実装のため見えないのが正常**。
- 📌 注記: **AI が本番接続確認したものではない**（利用者の Vercel・本番画面実測が正）。本番への migration 適用は既存 Vercel prebuild 経路（CREATE×2＋INDEX×7・破壊的操作ゼロ＝doc34 検査済み）。
- これで Phase 2-A-2 は「設計（doc33）→schema変更（doc34）→main反映→**本番確認 GO**」で完全クローズ。
- 次: **Phase 2-A-3（seed・一覧UI・Server Action・監査・E2E経路）または Phase X-04**・別承認。

## Phase 2-A-2 — Company Brain schema 変更・migration 作成

状態: **schema 変更完了（GO）／seed・UI・Server Action は 2-A-3 の個別承認まで未実装** — 詳細 `docs/audit/34_phase2a2_schema_change.md`。反映状態は git refs を正とする。

- 🎯 目的: doc33 確定案＋人間判断5点に基づき、Company Brain の2テーブルを schema に追加する（Phase 1-22 以来初の schema 変更）。
- 🔧 変更: `schema.prisma` に **CompanyPolicy / ProductCatalogItem の2モデルのみ追加**＋migration `20260702185440_phase2a_company_brain` **1本のみ**（CREATE TABLE×2＋INDEX×7・**DROP/RENAME/ALTER ゼロを全文検査**）。既存195モデル・ProductAsset・RBAC・labels: 無変更。
- ✅ 検証: migrate dev（ローカルDB）→ db:generate → **test 211・typecheck・lint・build 全green** → **smoke 11本 green 維持**（seed→本番ビルド→プリインストールChromium・install なし）。本番DB接触ゼロ・テスト後にサーバ/PG停止済み。
- 📌 人間判断5点: category=String／RBAC=knowledge流用／productAssetId スカラーのみ／Knowledge連携後回し／smoke追加は2-A-3判断 — **全遵守**。
- ⚠️ 記録: `pnpm --filter @hokko/db migrate -- --name X` は `--` が余分に渡りハングする。正=`exec dotenv -e ../../.env -- prisma migrate dev --name X`（doc34 §5）。
- 次: main push（別承認）→ **Phase 2-A-3（seed・一覧UI・Server Action・監査・E2E経路）**の承認判断。

## Phase 2-A-1 — Company Brain schema 設計 docs（docs-only）

状態: **設計docs 完了（GO）／schema 変更・実装は 2-A-2 / 2-A-3 の個別承認まで HOLD** — 詳細 `docs/audit/33_phase2a_company_brain_schema_design.md`。反映状態は git refs を正とする。

- 🎯 目的: Phase 2-A（Company Brain foundation）の三段承認の第一段として、schema 変更前の設計案を docs に固定する。
- 📐 設計の核心: **最初の縦切りは CompanyPolicy＋ProductCatalogItem の2テーブル先行**（PII近接の Case Study / Customer Pain / Sales Playbook は後続候補）。既存流儀を read-only 実測（195モデル・cuid・tenantId スカラ・ConfidentialityLabel enum 10種・tenantId 先頭 index・Knowledge 系・ProductAsset との住み分け）して整合。
- 🔒 安全設計: 機密ラベル=既存 enum 流用（新設なし）／externalAiAllowed 既定 false＋maskText 前提＋高機密は送信不可／RBAC=既存 `knowledge` 権限流用案（**AI は read/ai_read のみ＝書けない・消せない・持ち出せない**・AI権限拡大なし）／writeAudit=全変更系・writeDataAccess=機密閲覧＋AI参照全件／seed=デモのみ・PII/secret なし／E2E=smoke green 維持＋新フォームは label 関連付け必須。
- 🧭 段取り: 2-A-1 設計（本件）→ **2-A-2 schema変更・migration 承認** → 2-A-3 実装承認。未決定5点（enum化・専用リソース・参照範囲・Knowledge連携・smoke追加）は 2-A-2 以降で人間確定。
- 🔒 遵守: **schema.prisma 無変更／migration なし／DB操作なし／コード実装なし／課金・決済・外部送信・MCP/API公開なし／package/lock 変更なし**。Enshin OS は証拠不足のため設計に含めない。
- 次: **Phase 2-A-2（schema 変更承認）**・別承認。並行可: Phase X-04・Enshin OS 資料提供。

## Phase X-CLOSE — Phase X 完了記録（docs-only）

状態: **Phase X 完了記録完了（GO）／Phase 2-A 実装は人間の個別承認待ち（HOLD）** — 詳細 `docs/audit/32_phase_x_completion_record.md`。反映状態は git refs を正とする。

- 🎯 目的: Phase X の6タスク（X-01/X-02/X-03/X-RM-01/X-RM-02/X-RM-03）を正式完了として固定し、Phase 2-A へ進む前の状態を安全に記録する。
- ✅ 完了宣言: **Phase X 完了（GO）・完了基準 commit `70d4d06`**（X-RM-03・main反映済み。現在 HEAD ではなく完了基準）。全タスクが「実施→検証→記録→main反映」の4段でクローズ済み（doc26/27/30/28/29/31）。
- 🏆 恒久資産: E2E smoke green 回帰ゲート（11/11）／docs/roadmap 9本／Feature Registry（17領域・23分類）／Safety・Human Boundary・Monetization・MCP/API Exposure の各 Matrix／Enshin OS Inventory 枠組み／Automation Taxonomy（上限L4）／Phase 2 entry review。
- 🔒 維持: Phase 2実装・schema・migration・実課金・決済・MCP/API公開・外部送信・L5以上自動化・ロボット実行——**すべて未実施のまま**（安全境界維持）。
- 次: 人間判断（①Phase 2-A-1 schema設計docs ②Phase X-04 ③Enshin OS 資料提供）・別承認。

## Phase X-RM-03 — Phase 2入口条件の最終確定・Phase 2-A準備メモ（docs-only）

状態: **入口レビュー GO（READY）／Phase 2-A 実装は人間の個別承認待ち（HOLD）・Phase 2実装には進んでいない** — 詳細 `docs/audit/31_phase_x_rm_03_phase2_entry_review.md`。反映状態は git refs を正とする。

- 🎯 目的: doc01 §2 で事前に固定した Phase 2 入口条件4項目を証拠と突合し、Phase 2-A の承認判断材料を人間に渡す。
- ✅ 判定: 条件1（X-03 smoke 11/11 green=doc30）GO／条件2（roadmap main反映＋X-RM-02 全件突合=doc29）GO／条件3（CURRENT_STATE 安全境界12項目の維持）GO／**条件4（Phase 2-A 個別人間承認）HOLD=未取得**。総合=**入口レビュー READY・実装 HOLD**。
- 📄 Phase 2-A 準備メモ: Company Brain 5テーブル候補（Policy DB / Product Catalog / Case Study DB / Customer Pain DB / Sales Playbook）＋安全設計（tenantId・機密ラベル・外部AI送信可否・RBAC・writeDataAccess・label関連付け）＋**三段承認**（設計docs→schema→実装）＋絶対にやらないこと7項目。
- 🔒 遵守: docs/tasks/vault のみ。コード・DB・schema・migration・課金・決済・外部送信・package/lock: **すべてなし**。
- 次: 人間判断（①Phase 2-A 設計へ進む ②先に Phase X-04 ③Enshin OS 資料の提供時期）・別承認。

## Phase X-03 — E2E smoke green 化（X-03＋X-03b）

状態: **green 化完了（GO）／smoke 11/11 passed（初の全green）** — 詳細 `docs/audit/30_phase_x03_e2e_green.md`。反映状態は git refs を正とする。

- 🎯 目的: X-02 で特定した smoke red の根本原因を最小修正し、E2E を「動く回帰ゲート」にする。
- 🔧 X-03（第1段）: `/login` の label に `htmlFor`＋input に `id` を付与（2組・+6/-2行・挙動不変・アクセシビリティ改善込み）→ smoke **0/11 → 10/11**。`getByLabel` 問題は完全解消。残る1本は別原因（テストセレクタ曖昧性）のため成功扱いせず停止し人間承認へ（差分は WIP コミットで保全）。
- 🔧 X-03b（第2段）: `smoke.spec.ts` 42行目の1箇所のみ `getByText('地図CRM')` → `getByRole('heading', { name: '地図CRM' })`（ナビリンクと見出しの2要素一致＝strict mode violation の明確化）→ smoke **11/11 green（9.1s）**。
- ✅ 検証: `pnpm test`（211）／typecheck／lint／build 全green＋DOM実測（for/id 関連付け成立）＋ローカルE2E（ローカルPostgres・migrate deploy pending 0・seed・本番ビルド・プリインストールChromium シム・install なし）。
- 🔒 遵守: playwright.config・vitest.config・他テスト行・他画面・UI文言・DB schema・migration作成・認証・RBAC・課金・外部送信・package/lock: **無変更**。本番接触ゼロ・テスト後にサーバ/Postgres停止済み。
- 次候補: **Phase X-04（本番スモーク定型化・残りE2E段階実行）または Phase X-RM-03（Phase 2 入口条件の最終確定）**・別承認。

## Phase X-RM-02 — Roadmap Review / Gap Reconciliation（docs-only）

状態: **レビュー完了（GO）／差分は Gateway 表記1件のみ・補完済み** — 詳細 `docs/audit/29_phase_x_rm_02_roadmap_review.md`。反映状態は git refs を正とする。

- 🎯 目的: X-RM-01 の roadmap 一式を、ユーザー提示の追加構想リスト（17領域・代表機能37個・境界9項目・分類23項目）と突合し、漏れ・表記ゆれを補完する。
- ✅ 突合結果: 17領域・個別機能名は全反映済み。唯一の差分＝Gateway 旧表記「369 MCP/API Gateway」6箇所 → 正式表記 **IKEZAKI MCP/API Gateway** へ統一（旧表記は別名として保持）。
- 📄 明文化: doc02 §0.1 に**プロンプト必須分類23項目**の正式名称⇔列対応を新設／doc07 §1 に **Enshin OS 表記ルール**（大文字ENSHINにOSを続けない・ID プレフィックス `ENSHIN-` は対象外・検査は case-sensitive）を固定。
- 🔒 遵守: 既存プロンプト・CLAUDE.md・doc14/15/22〜28 無変更。コード・DB・schema・package/lock 無変更。課金・決済・外部送信・MCP/API公開なし。
- 未解決（証拠不足）: Enshin OS の個別機能インベントリは引き続き詳細未確認（ユーザーからの仕様提供待ち・推測断定なし）。
- 次候補: **Phase X-03（E2E red 最小修正・案A推奨候補）または Phase X-RM-03（Phase 2 入口条件の最終確定）**・人間選択・別承認。

## Phase X-RM-01 — 長期構想統合・Phase 2 ロードマップ作成（docs-only）

状態: **統合完了（GO）／実装なし・既存プロンプト非破壊** — 詳細 `docs/audit/28_long_term_strategy_integration.md`。反映状態は git refs を正とする。

- 🎯 目的: チャットで追加採用された長期構想17領域を、既存方針を壊さずロードマップ・Feature Registry・各種 Matrix へ分類し、Phase 2 を安全に始められる設計図を固定する。
- 📄 新規: `docs/roadmap/00_ikezaki_os_long_term_strategy.md`（長期構想全体像）／`01_phase2_master_roadmap.md`（Phase 2 設計図・2-A〜2-H）／`02_feature_registry.md`（17領域・個別機能名全数保持・代表 Feature×18分類列）／`03_safety_boundary_matrix.md`／`04_human_boundary_matrix.md`（L0〜L7・人間専権領域）／`05_monetization_matrix.md`（実課金は Phase 8）／`06_mcp_api_exposure_matrix.md`（公開なし・内部設計のみ）／`07_enshin_os_feature_inventory.md`（詳細未確認＝証拠不足）／`08_automation_level_taxonomy.md`（実装上限 L4）／`docs/audit/28_long_term_strategy_integration.md`。
- 🔒 遵守: 既存プロンプト・CLAUDE.md・既存 docs/audit 無変更。コード・DB・schema・package/lock 無変更。課金・決済・外部送信・MCP/API公開なし。
- 前提整備: 開始時に Phase X-02 コミットが main 未反映（Case A）だったため、承認範囲内で push 前ゲート全 green 確認のうえ prerequisite fast-forward push を実施してから着手。
- 次候補: **Phase X-RM-02（Phase 2 入口計画レビュー）または Phase X-03（E2E red 最小修正・案A推奨候補）**・別承認。

## Phase X-02 — E2E smoke 実行の実証（第1段）

状態: **実行実証 GO（環境GREEN・B-03解消を実証）／テスト結果は smoke 11本 RED（原因特定済み・修正はX-03別承認）** — 詳細 `docs/audit/27_phase_x02_e2e_smoke_result.md`。反映状態は git refs を正とする。

- 🎯 目的: E2E が本当に動かせるかを smoke.spec.ts 1本で実証し、green/red を捏造せず記録する。
- 🧪 実行条件: Playwright 1.61.0／プリインストール Chromium（DL・install なし・シム適用）／ローカル Postgres＋seed／本番ビルド `pnpm start`（/login 200 確認後）。
- ✅ 環境実証: DB起動（socket dir＋ログ出力先の2点を解決）→ migrate deploy（pending なし）→ seed → build → server 全成功。**「Executable doesn't exist」はシムで解消しブラウザ起動**。
- ❌ テスト結果: 11 failed / 0 passed。全件 `login()` の `getByLabel('メールアドレス')` 30s タイムアウト。DOM 実測で **label-for/input-id の関連付け欠如**を確認（アプリのクラッシュではない・サーバログ正常）。
- 🔒 遵守: コード・テスト・設定・package/lock 無変更（git clean 実測）／playwright install 不使用／本番接続ゼロ／後片付け済み。
- 次候補: **Phase X-03 = 修正方針決定（案A: label 関連付け付与を推奨候補）→ 最小修正 → smoke 再実行（別承認）**。

## Phase X-01 — 本番スモーク / E2E / 検証基盤整理（read-only棚卸し＋docs-only）

状態: **棚卸し・記録完了（GO）／実テスト実行の GO ではない／Phase X-02 は別承認** — 詳細 `docs/audit/26_phase_x01_verification_baseline.md`。反映状態は git refs を正とする。

- 🎯 目的: Phase X（短期品質フェーズ）の出発点として、検証基盤の現状・制約・改善候補を証拠付きで1枚に固定する。いきなり修正しない。
- 📄 `docs/audit/26_phase_x01_verification_baseline.md` 新規（検証手段一覧＋安全に実行できる/条件付き/未実行の区分＋BLOCKERS＋スモーク・E2E標準手順案＋非エンジニア確認項目＋改善候補5件・優先度＋禁止事項＋GO判定）。
- 📄 CURRENT_STATE 残タスク表を X-01 棚卸し完了・次=X-02 候補へ／`369-vault/知識/PhaseX01検証基盤整理.md` 新規＋index リンク。
- 棚卸し結果: unit 23ファイル（DB非依存）／integration 25ファイル（`packages/db`・要 live Postgres）／E2E 12スペック（smoke＋ドメイン11・webServer=pnpm start・要 build＋seed済みDB＋chromium）／HTTPスモーク実績（doc14 §10）／verify.sh=generate→typecheck→lint→unit→build の5段／CI=Vercel Native Checks のみ。
- **新発見**: 本実行環境は Chromium プリインストール（`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`・DL不要）→ **B-03（ブラウザDL不可）が事実上解消の可能性**。実証は未実施のため Phase X-02 の P1 候補。
- **read-only＋docs-only／テスト実行なし（未実行を成功扱いしない）／コード・package・lock・DB・schema・migration 変更なし／課金・決済・外部送信なし**。
- 次候補: **Phase X-02 = E2E 実行の実証（smoke.spec.ts 1本から）＋本番スモーク定型化の第1段（別承認）**。

## Phase 1-50 — Phase 1 完了記録・次Phase選定（docs-only）

状態: **Phase 1 正式完了を記録（GO）／次Phase=Phase X（人間判断）／Phase X-01 の着手は別承認** — 詳細 `docs/audit/25_phase1_completion_record.md` / doc15 §38。反映状態は git refs を正とする。

- 🎯 目的: doc24 の判定GOを受けて Phase 1 を正式にクローズし、次Phase の人間判断（Phase X）を記録する。
- 📄 `docs/audit/25_phase1_completion_record.md` 新規（完了宣言＋完了基準 commit `e95f887`＋完了した中核11項目＋継続安全条件＋次Phase選定の理由＋Phase 8 不進行＋GO判定）。
- 📄 doc15 §38 追記／CURRENT_STATE を Phase 1 完了状態・Phase X 残タスク表・次=Phase X-01 へ刷新／`369-vault/知識/Phase1完了記録.md` 新規＋index リンク。
- 次Phase選定理由（人間判断）: 短期間で Phase 1 を一気に閉じたため、Phase 2 拡張の前に品質・E2E・本番スモーク・UI確認・運用基盤を短期で固める Phase X を挟むのが安全。
- **docs-only／実装なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・RBAC・package・lock 変更なし**。
- 次候補: **Phase X-01 = 本番スモーク / E2E / 検証基盤整理（別承認）**。実課金は Phase 8（さらに先・別設計・別承認）。

## Phase 1-49 — Phase 1 完了判定レポート（docs-only）

状態: **docs-only 判定レポート完了（判定 GO）／Phase 1-50 は別承認** — 詳細 `docs/audit/24_phase1_completion_review.md` / doc15 §37。反映状態は git refs を正とする。

- 🎯 目的: Phase 1-48 までの証拠をもとに、Phase 1 を閉じられるかを判定し、Phase 2以降/Phase 8 へ送るものを整理する。
- 📄 `docs/audit/24_phase1_completion_review.md` 新規（要約＋判定GO＋証拠レベル＋完了済み12項目表＋完了を妨げない未着手＋証拠不足なし＋Phase 2/8/X/Y 送付＋継続安全条件＋残リスク＋Phase 1-50 でやること）。
- 📄 doc15 §37 追記／CURRENT_STATE 次タスクを Phase 1-50 へ／`369-vault/知識/Phase1完了判定.md` 新規＋index リンク。
- 判定根拠: 本番確認GO 12件（doc14 §26〜§37・利用者実測）＋最終セキュリティ監査 全6領域 PASS（doc23・GO）＋matrix 8行全GO＋完了判定を妨げる証拠不足なし。
- **docs-only／実装なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・RBAC・package・lock 変更なし**。
- 次候補: **Phase 1-50 = Phase 1 完了記録・次Phase選定（人間判断・別承認）**。実課金はさらに先（Phase 8・別設計・別承認）。

## Phase 1-48 — Phase 1 最終セキュリティ・権限・非課金監査（read-only＋docs-only）

状態: **監査完了（GO）／本番確認不要（read-only＋docs-only・コード挙動不変）** — 詳細 `docs/audit/23_phase1_final_security_audit.md` / doc15 §36。反映状態は git refs を正とする。

- 🎯 目的: Phase 1 を閉じる前に、tenant分離・RBAC・AI権限・UsageEvent非課金原則・metadata安全性・外部送信ゲート・schema不変を実コードで横断確認し、証拠付きで記録する。
- 📄 `docs/audit/23_phase1_final_security_audit.md` 新規（監査方法＋6領域の PASS 証拠＋懸念＋GO判定＋Phase 1-49 送付条件）。
- 📄 doc15 §36 追記／CURRENT_STATE 次タスクを Phase 1-49 へ／`369-vault/知識/Phase1最終セキュリティ監査.md` 新規＋index リンク。
- 監査結果: **全6領域 PASS・総合 GO・重大懸念なし**（軽微2件は記録のみ: 「never_billable 相当」コメント用語の将来整理／doc22 ルールの運用継続）。
- 遺物整合: PROGRESS 旧Phase 4箇所を push 証拠（`de3d054` on origin/main／`85c79ab`／`057d314`）に基づき「push 済み」表現へ最小修正。証拠不足の見送りなし。
- **read-only＋docs-only／コード修正なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・RBAC・package・lock 変更なし**。
- 次候補: Phase 1-49 = Phase 1 完了判定レポート（別承認）。

## Phase 1-47 — 状態管理ドキュメントの役割固定（docs-only）

状態: **docs-only 役割固定完了／本番確認不要（コード挙動不変）** — 詳細 `docs/audit/22_docs_role_definition.md` / doc15 §35。反映状態は git refs を正とする。

- 🎯 目的: Phase 1 終盤で状態管理が崩れないよう、各ドキュメントの役割・更新タイミング・禁止表現を1回だけ決めて固定する（過去の品質低下要因＝一時状態の永続化、の再発防止）。
- 📄 `docs/audit/22_docs_role_definition.md` 新規（非エンジニア向け要約＋役割表＋更新タイミング＋禁止表現＋Source of Truth＋Phase 1 終盤運用＋GO判定）。
- 📄 doc15 §35 追記／`tasks/CURRENT_STATE.md` 残タスク・次タスクを Phase 1-48 へ更新。
- 📄 `369-vault/知識/状態管理とドキュメント役割.md` 新規（doc22 の短縮版）＋`369-vault/index.md` からリンク。
- 役割分担: PROGRESS=履歴／CURRENT_STATE=現在地／`usage_event_emit_matrix.md`=emit一覧／doc14=本番確認（利用者実測のみ）／doc15=詳細設計史／369-vault=思想・プロンプト・知識。**現在の git 反映状態は git refs を正とする**。
- 禁止運用: 一時状態（push未実施・人間承認待ち等）の永続化／現在HEAD固定値（固定可は実装commit・完了基準commitのみ）／未確認GO／secret・PII・raw metadata・課金額。
- **docs-only／実装なし／emit 追加なし／emit 対象は8種類のまま／課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／schema・migration・RBAC・package・lock 変更なし**。
- 次候補: Phase 1-48 = Phase 1 最終セキュリティ・権限・非課金監査（別承認）。

## Phase 1-43 — 非課金 UsageEvent 利用量サマリー read-only 最小実装

状態: **本番確認完了（GO）** — `b08c939`（implementation commit `ce858c7`）の Phase 1-43 read-only 利用量監査画面を利用者が Vercel/CI/本番画面で確認。audit:read ガード・tenantId スコープ・raw metadata/sourceId/本文/金額/secret実値 非表示・非課金記録（usage_only）表示・emit対象8種類維持を確認済み。詳細 `docs/audit/14_release_stabilization.md` §37 / `docs/audit/15_monetization_usage_design.md` §33.1。反映状態は git refs を正とする。

- 🎯 目的: Phase 1-42 §12 の P0（候補A＝tenant admin 向け read-only UsageEvent summary）を、課金せず・PII/本文/金額/secret を出さず・テナント分離を守って最小実装する。
- 📄 `apps/web/app/(app)/admin/usage/page.tsx` 新規（read-only）。`requireUser()`＋`hasPermission(user,'audit','read')` ガード（権限なしは集計を出さず「閲覧権限がありません」表示）。
- 📄 `apps/web/app/(app)/admin/page.tsx` の管理コンソール セキュリティ状況カードに `利用量監査 →` リンクを1本追加（到達性確保）。
- 📄 `docs/audit/15_monetization_usage_design.md` §33 追記。
- 集計: **tenantId 必須・直近30日**。`groupBy(['eventType'])`／`groupBy(['category'])` で件数（`_count`）＋quantity 合計（`_sum.quantity`）。日別は `findMany({ select:{ occurredAt, quantity } })`（非PII2列のみ）を取得しサーバ側で YYYY-MM-DD にバケツ化。既存 index（`[tenantId, occurredAt]`/`[tenantId, eventType]`/`[tenantId, category]`）で効く。
- **表示しない**: raw metadata／sourceId／idempotencyKey／actorId／本文／prompt／output／payload／URL／secret／fileKey／email／顧客名／実ID／**金額（amount/price/currency）**。quantity は `toNumber()` で数量表示（金額ではない）。
- 課金誤認防止: 画面名「利用量監査（非課金 UsageEvent 集計）」＋「この画面は請求額を示すものではありません」明記＋`usage_only`=「非課金記録」。
- **read-only／書き込みなし／Server Action なし／新 API route なし／emit 追加なし／emit 対象は8種類のまま**。課金なし／決済なし／`billable_candidate`・`never_billable` runtime 使用なし／schema・migration・RBAC・package・lock 変更なし。
- 検証: `./scripts/verify.sh`（db:generate/typecheck/lint/unit/build）で確認。本番確認は Phase 1-44 で GO 記録（doc14 §37 / doc15 §33.1）。
- 本番確認（Phase 1-44・GO・2026-07-01）: `b08c939`（implementation `ce858c7`）を利用者が Vercel Production `main`/CI/本番画面で確認。Status Ready・Build 成功・migrate deploy 不要・Runtime error なし。/admin/usage 表示 OK・audit:read あり表示/なし非表示（「閲覧権限がありません」）OK・件数と quantity 合計のみ・「請求額ではありません」表示・tenantId スコープ OK・他テナント非表示・raw metadata/sourceId/idempotencyKey/actorId/本文/URL/secret/fileKey/email/顧客名/各種id/金額 実値非表示 OK・emit対象8種類維持・新規emitなし・課金/決済/サブスクなし・billable_candidate/never_billable runtime 使用なし・本番DB操作/Prisma migrate手動/worker手動/実メール/Webhook実送信なし。総合判定 GO。
- 次候補: **Phase 1-45 = `tasks/CURRENT_STATE.md` 作成**（origin/main・HEAD・未push・本番確認状況・emit対象・次にやることを1枚に集約）／**Phase 1-46 = `docs/audit/usage_event_emit_matrix.md` 作成**（8 emit を1表に固定）。いずれも別承認。実課金はさらに先（別設計・人間承認前提）。

## Phase 1-42 — UsageEvent 可視化・集計の安全設計（docs-only）

状態: **docs-only 設計記録完了／本番確認不要（docs-only・コード挙動不変）** — 詳細 `docs/audit/21_usage_event_visualization_design.md` / `docs/audit/15_monetization_usage_design.md` §32。反映状態は git refs を正とする。

- 🎯 目的: 貯めた UsageEvent 8種類を、非課金のまま・PII/本文/金額/secret を出さず・テナント分離を守って安全に可視化する方針を設計。**実装しない・emit 追加しない・画面/APIを作らない**。
- 📄 `docs/audit/21_usage_event_visualization_design.md` 新規作成（非エンジニア向け要約＋model/index 監査＋安全な集計軸＋tenant 分離＋RBAC＋metadata 表示可否＋課金誤認防止文言＋集計ビュー候補比較＋P0 判定＋DO_NOT_TOUCH_NOW/NEVER＋段階導入＋GO 判定）。
- 📄 `docs/audit/15_monetization_usage_design.md` §32 追記。
- 監査の確定事実: UsageEvent の index は全て tenantId 先頭で**テナントスコープ集計が index で効く**／**金額カラムなし**（quantity は量）／**現状書き込み専用**（読み取りなし）／RBAC は既存 `hasPermission(user,'audit','read')` を流用でき**RBAC 定義変更不要**。
- 安全方針: tenantId 必須（横断表示禁止）／raw metadata 非表示（prompt/output/payload/URL/secret/signature/fileKey/email/顧客名/sourceId を出さない）／金額(amount/price/currency)を混ぜない／`usage_only`=「非課金記録」＋「請求額ではない」注記／集計は eventType/category/日別の件数・quantity 合計のみ。
- **P0_IMPLEMENTABLE_NEXT: tenant admin 向け read-only UsageEvent summary**（`admin/usage` 相当・audit:read ガード・直近30日・groupBy eventType/category・件数/quantity 合計のみ）。実装は Phase 1-43・別承認。
- 除外: platform 横断/billing dashboard/cap・alert/invoice・customer 連動＝DO_NOT_TOUCH_NOW。raw metadata・payload・prompt viewer/secret・URL 表示/金額混在/tenantId なし全件/usage→請求額自動計算＝NEVER。
- 課金なし／決済なし／`billable_candidate`・`never_billable` runtime 使用なし。
- 現在の UsageEvent emit 対象は **8種類のまま**。
- 詳細: `docs/audit/21_usage_event_visualization_design.md`。
- 次候補: Phase 1-43 = read-only tenant-scoped usage summary の最小実装（別承認）。実課金はさらに先（設計 §11 安全条件＋人間承認が前提）。

## Phase 1-41 — worker EXPORT_JOB trigger / UsageEvent emit可否監査（docs-only）

状態: **push完了／本番確認不要（docs-only・コード挙動不変）** — `87635bb` を `main` へ push 済み。詳細 `docs/audit/20_export_job_trigger_audit.md` / `docs/audit/15_monetization_usage_design.md` §31。

- 🎯 目的: worker `EXPORT_JOB` に trigger / enqueue 経路が実在するか、安全に UsageEvent emit 候補へ昇格できるかを実コードで監査。**実装しない・emit 追加しない**。
- 📄 `docs/audit/20_export_job_trigger_audit.md` 新規作成（非エンジニア向け要約＋EXPORT_JOB 構造＋trigger 監査＋既存 export.generated との関係＋metadata 可否＋P0/HOLD 判定＋将来方針）。
- 📄 `docs/audit/15_monetization_usage_design.md` §31 追記。
- 監査の確定事実: `EXPORT_JOB` の参照は `apps/worker/src/jobs.ts` の2箇所のみ（handler+JOB_NAMES）。**`queue.add('EXPORT_JOB', ...)` はリポジトリ全体に存在しない**（worker が積むのは MORNING_REPORT/ANOMALY/PROFIT_LEAK/DYNAMIC_PRICING+OUTBOX のみ／apps/web に BullMQ enqueue なし）。→ worker EXPORT_JOB は**未到達（dead）**。実利用のエクスポートは apps/web の `export.generated`（LeadMap export/admin danger-actions・sourceId=exportJob.id）で計測済み。
- **判定: HOLD**（未到達・本番確認不可）。将来 enqueue 経路が実装されたら `export.generated`/usage_only/sourceType=ExportJob/sourceId=exportJob.id/metadata=scope,format,source のみ（fileKey/CSV本文/顧客情報/金額を入れない）で1箇所 emit を再評価。
- 課金なし／決済なし／`billable_candidate`・`never_billable` runtime 使用なし。
- 現在の UsageEvent emit 対象は **8種類のまま**。
- 詳細: `docs/audit/20_export_job_trigger_audit.md`。
- 次候補: EXPORT_JOB は trigger 実装後に再評価。本文/金額/PII 近接候補は据え置き。実課金はさらに先（設計 §11 安全条件＋人間承認が前提）。

## Phase 1-40 — worker MORNING_REPORT_JOB の AIOutput 非課金 UsageEvent emit

状態: **本番確認完了（GO）** — `c0a563b` を `main` へ push 済み・Vercel/CI 本番確認 GO（2026-07-01・利用者確認）。worker 朝礼AI出力（aIOutput.create 成功時）のみ `ai.output.generated` を記録（skipped/create前失敗は emit しない・metadata=task/source のみ・同一 AIOutput で二重計上なし）。既存7 emit 維持・他jobType emit なし・JobRun emit なし・emit 対象は8種類。詳細 `docs/audit/14` §36 / `docs/audit/15` §30.1。

- 🧩 `apps/worker/src/jobs.ts`: import に `recordUsageEventCore` 追加（`@hokko/db`）。`MORNING_REPORT_JOB` で `aIOutput.create` の戻り値を捕捉し、**成功後に** `recordUsageEventCore` を1回呼ぶ。
  eventType=`ai.output.generated` / category=`ai` / **billing=`usage_only`** / unit=`count` / quantity=`1` / sourceType=`AIOutput` / sourceId=`aIOutput.id` / actorType=`system` / actorId=`null` / tenantId=`JobData.tenantId` / idempotencyKey=`usage:ai.output.generated:<aIOutput.id>` / metadata=`{ task:'generateMorningReport', source:'worker' }`（固定非PII）。
  記録失敗で worker 主処理・recordRun・`return report` を壊さない（recorder は例外を投げない）。**実 worker 実行・実AI実行・外部送信なし**。
- **emit は aIOutput.create 成功後のみ**。**skipped / create前失敗 は emit しない**。
- metadata に output/outputText/レポート本文/report/prompt/inputHash/salesActual/salesTarget/金額/secret/URL/payload/実ID を入れない（sourceId に aIOutput.id は使うが metadata には入れない）。
- **二重計上なし**: apps/web の `ai.output.generated`（saveAIOutputStandard 経由）とは別 aIOutput.id・worker は saveAIOutputStandard を通らない。
- **他 jobType への emit 追加なし**。**JobRun emit なし**。**usage.ts・outbox.ts・jobrun.ts・apps/web helper・既存7 emit は不変**。
- 課金なし／決済なし／`billable_candidate`・`never_billable` runtime 使用なし／金額(amount/price/currency)なし。
- 🧪 `packages/db/src/__tests__/p1_40_usage_event_worker_aioutput.itest.ts`: payload 仕様／metadata=task,source のみ・禁止キーなし／二重計上不可／別tenant独立／金額カラム不在（実 worker/queue/AI なし）。
- schema/migration/RBAC/ABAC/package/lock 変更なし。
- 検証（全 green）: db:generate / 統合 25ファイル160（p1_40 5 含む・回帰）/ `./scripts/verify.sh`（typecheck/lint/unit211/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §30。
- 現在の UsageEvent emit 対象は **8種類**（LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send + dunning + Webhook success + worker 朝礼AI出力）。
- 次候補: EXPORT_JOB（enqueue トリガー実装が前提）／recordRun 系（実体実装後）だが別途監査・承認。実課金はさらに先（設計 §11 安全条件＋人間承認が前提）。

## Phase 1-39 — worker 経由 UsageEvent 計測漏れ監査（docs-only）

状態: **push完了／本番確認不要（docs-only・コード挙動不変）** — `5347ba8` を `main` へ push 済み。詳細 `docs/audit/19_worker_emit_gap_audit.md` / `docs/audit/15_monetization_usage_design.md` §29。

- 🎯 目的: worker が生成する成果物が既存7 emit で計測されているかを監査し、emit-gap と次の P0 候補（最大1つ）を確定。**実装しない・emit 追加しない**。
- 📄 `docs/audit/19_worker_emit_gap_audit.md` 新規作成（非エンジニア向け要約＋既存 emit 発火経路＋jobType 成果物表＋重要候補詳細＋P0/分類＋metadata 可否＋idempotency 方針＋二重計上回避＋次フェーズ方針＋GO 判定）。
- 📄 `docs/audit/15_monetization_usage_design.md` §29 追記。
- 監査の確定事実: 既存 `ai.output.generated` は apps/web `saveAIOutputStandard` のみ・`export.generated` は apps/web 2経路のみで発火。**worker の `MORNING_REPORT_JOB` は `aIOutput.create` を直接呼ぶ（saveAIOutputStandard 非経由）ため未計測**＝安全な emit-gap。worker 定期ジョブは MORNING_REPORT/ANOMALY/PROFIT_LEAK/DYNAMIC_PRICING。
- **P0_IMPLEMENTABLE_NEXT: MORNING_REPORT_JOB の aIOutput emit**（`ai.output.generated`/category=ai/usage_only/sourceType=AIOutput/sourceId=aIOutput.id/idempotencyKey=`usage:ai.output.generated:<aIOutput.id>`/actorType=system/actorId=null/tenantId=JobData.tenantId/metadata=`{task,source}` のみ・**output/outputText 本文は入れない**・succeeded のみ・二重計上なし）。
- 分類: P1=EXPORT_JOB（enqueue トリガー実装が前提）／P2=recordRun 系（実体実装後）／DO_NOT_TOUCH_NOW=lead 分析・outreach 下書き・返信分類（本文/PII）・dynamic pricing・profit leak（金額）／EXCLUDE_INTERNAL=backup・embedding・communication classification・anomaly・OUTBOX（webhook.delivered で計測済み）／NEVER_BILLABLE=failed/skipped/error。
- 課金なし／決済なし／`billable_candidate`・`never_billable` runtime 使用なし。
- 現在の UsageEvent emit 対象は **7種類のまま**。
- 詳細: `docs/audit/19_worker_emit_gap_audit.md`。
- 次候補: Phase 1-40 = MORNING_REPORT_JOB の aIOutput emit 最小実装（別承認）。実課金はさらに先（設計 §11 安全条件＋人間承認が前提）。

## Phase 1-38 — JobRun UsageEvent emit 候補監査・ホワイトリスト設計（docs-only）

状態: **push完了／本番確認不要（docs-only・コード挙動不変）** — `ff188a5` を `main` へ push 済み。詳細 `docs/audit/18_jobrun_usage_event_emit_design.md` / `docs/audit/15_monetization_usage_design.md` §28。

- 🎯 目的: JobRun emit の候補を実コードで監査し、jobType ホワイトリスト（記録してよい／いけない）を設計。**実装しない・emit 追加しない**。
- 📄 `docs/audit/18_jobrun_usage_event_emit_design.md` 新規作成（非エンジニア向け要約＋JobRun/worker 構造＋jobType 分類表＋P0/除外/HOLD＋metadata 可否＋idempotency 方針＋failed/dead 方針＋次フェーズ方針＋GO/HOLD 判定）。
- 📄 `docs/audit/15_monetization_usage_design.md` §28 追記。
- 監査の確定事実: `JobRun` 行を作るのは `packages/db/src/outbox.ts` の **`OUTBOX_DISPATCH` 1箇所のみ**（内部インフラ・tenantId なし・全テナント横断）。その実体（Webhook 配送）は **Phase 1-37 `webhook.delivered` で既に計測済み**＝二重計上になるため **EXCLUDE_INTERNAL**。worker（`apps/worker/src/jobs.ts`）の 19 jobType は `createJobRun`/`finishJobRun` を呼ばず **JobRun 行を作らない**ため JobRun 経由で計測不可。
- 分類: **P0_IMPLEMENTABLE_NEXT なし（HOLD）**／EXCLUDE_INTERNAL（OUTBOX_DISPATCH/BACKUP/EMBEDDING/KNOWLEDGE/ANOMALY/PROFIT_LEAK/DYNAMIC_PRICING）／DO_NOT_TOUCH_NOW（金額・本文・PII 近接）／NEVER_BILLABLE（failed/dead/retry失敗/error/監査ログ）。
- 将来方針: JobRun 計測を進めるなら、まず worker ジョブの JobRun 計装＋既存 emit（ai.output.generated/export.generated/webhook.delivered）との**二重計上回避**の docs-only 設計（P0_DESIGN_ONLY）が前提。実装ではない。
- 課金なし／決済なし／`billable_candidate`・`never_billable` runtime 使用なし。
- 現在の UsageEvent emit 対象は **7種類のまま**。
- 詳細: `docs/audit/18_jobrun_usage_event_emit_design.md`。
- 次候補: P0 が無いため実装プロンプトは作らない。進めるなら JobRun 計装の docs-only 設計フェーズ（別承認）。実課金はさらに先（設計 §11 安全条件＋人間承認が前提）。

## Phase 1-37 — Webhook send 成功の非課金 UsageEvent emit

状態: **本番確認完了（GO）** — `cc5a433` を `main` へ push 済み・Vercel/CI 本番確認 GO（2026-06-29・利用者確認）。Webhook 配送 success のみ `webhook.delivered` を記録（failed/dead/retry失敗は emit しない・retry で二重計上なし・metadata=eventType のみ）。既存6 emit 維持・JobRun emit なし・emit 対象は7種類。詳細 `docs/audit/14` §35 / `docs/audit/15` §27.1。

- 🧩 `packages/db/src/outbox.ts`: `deliverOne` で `webhookDelivery.create` の戻り値を捕捉し、**`delivered===true` のときだけ** `recordUsageEventCore` を1回呼ぶ。`import { recordUsageEventCore } from './usage';` を追加。
  eventType=`webhook.delivered` / category=`webhook` / **billing=`usage_only`** / unit=`count` / quantity=`1` / sourceType=`WebhookDelivery` / sourceId=`delivery.id` / actorType=`system` / actorId=`null` / tenantId=`subscription.tenantId` / idempotencyKey=`usage:webhook.delivered:<eventId>:<subscriptionId>` / metadata=`{ eventType }`（固定非PII）。
  記録失敗で配送主処理・status 更新・retry/dead-letter 制御・戻り値を壊さない（recorder は例外を投げない）。**実Webhook送信は起こさない**（既存配送挙動不変）。
- **emit 条件は success のみ**。**failed / dead / retry失敗 は emit しない**。retry で同じ宛先に再度 success が起きても idempotencyKey が同一なので**二重計上しない（最終成功1回）**。
- metadata に url/secret/signature/payload/body/statusCode/error/eventId/subscriptionId/金額/実ID を入れない（sourceId に delivery.id・idempotencyKey に eventId/subscriptionId は使うが metadata には入れない）。
- **共通 recorder（usage.ts）・jobrun.ts・apps/worker・apps/web helper・既存6 emit は不変**。**JobRun emit なし**。
- 課金なし／決済なし／`billable_candidate`・`never_billable` の runtime 使用なし／金額(amount/price/currency)なし。
- 🧪 `packages/db/src/__tests__/p1_37_usage_event_webhook.itest.ts`: `processOutboxBatch` を実DBで実行・**fetch は mock（実Webhook送信なし）**。success で1件＋payload 仕様／metadata=eventType のみ・禁止キーなし／failed で emit しない／dead で emit しない／retry で最終成功1回（二重計上しない・配送継続）／別tenant独立（計6テスト）。
- schema/migration/RBAC/ABAC/package/lock 変更なし。
- 検証（全 green）: db:generate / 統合 24ファイル155（p1_37 6 含む・回帰）/ `./scripts/verify.sh`（typecheck/lint/unit/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §27。
- 現在の UsageEvent emit 対象は **7種類**（LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send + dunning + Webhook success）。
- 次候補: Phase 1-38 JobRun succeeded emit（対象 jobType ホワイトリスト）だが別途監査・人間承認。実課金はさらに先（設計 §11 安全条件＋人間承認が前提）。

## Phase 1-36 — worker-safe UsageEvent recorder 実装のみ

状態: **本番確認完了（GO）** — `60a202d` を `main` へ push 済み・Vercel/CI 本番確認 GO（2026-06-29・利用者確認）。recorder 追加のみで **runtime emit 呼び出しゼロ＝本番挙動不変**。Webhook/JobRun emit なし・既存6 emit 不変・emit 対象は6種類のまま。詳細 `docs/audit/14` §34 / `docs/audit/15` §26.1。

- 🧩 `packages/db/src/usage.ts` 新規: `recordUsageEventCore`（worker-safe・apps/web 非依存・prisma は `./client` から import・`@/` alias 不使用）。
  - 必須（tenantId/eventType/category/idempotencyKey）欠落で `ok:false / missing_required_field`。
  - metadata 禁止 top-level key ガード（url/secret/signature/payload/body/stack/prompt/transcript/customer/email/subject/amount/price/currency/total/各種実ID/token/apiKey 等）→ `ok:false / forbidden_metadata_key`（create しない）。
  - billing 許可外は **usage_only に丸め**（runtime 使用は usage_only のみ）。actorType 既定 user（worker は将来 system）／unit=count／quantity=1。
  - **P2002 は duplicate 扱い**（ok:true/created:false/duplicate:true）。その他失敗は `ok:false / create_failed`。**例外を外へ投げない**。amount/price/currency は扱わない。
- 🧩 `packages/db/src/index.ts`: `export * from './usage';` を追加（既存 jobrun/outbox と同じ集約パターン）。
- 🧪 `packages/db/src/__tests__/p1_36_usage_recorder.itest.ts`: usage_only 作成／system actor・actorId=null／payload 仕様／forbidden_metadata_key（url/secret/payload・金額キー）で未作成／missing_required_field／二重計上不可／別tenant同key可／invalid billing→usage_only／金額カラム不在。
- **apps/web helper・既存6 emit・outbox.ts・jobrun.ts・apps/worker は不変**。**runtime での新規 emit はゼロ**。
- schema/migration/RBAC/ABAC/package/lock 変更なし。**課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／金額なし**。
- 詳細: `docs/audit/15_monetization_usage_design.md` §26。
- 現在の UsageEvent emit 対象は **6種類のまま**（LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send + dunning）。
- 次候補: Phase 1-37 Webhook success emit（本 recorder を outbox success 確定時に呼ぶ）だが別途監査・人間承認。実課金はさらに先（設計 §11 安全条件＋人間承認が前提）。

## Phase 1-35 — worker/packages UsageEvent recorder architecture design（docs-only）

状態: **push完了／本番確認不要（docs-only・コード挙動不変）** — `cca2e5a` を `main` へ push 済み。詳細 `docs/audit/17_worker_usage_recorder_design.md` / `docs/audit/15_monetization_usage_design.md` §25。

- 🎯 目的: worker/packages 経路でも UsageEvent を安全に記録するための architecture を docs-only で設計・記録（Webhook/JobRun を将来安全に計測する前段階）。**実装しない・emit 追加しない**。
- 📄 `docs/audit/17_worker_usage_recorder_design.md` 新規作成（非エンジニア向け要約＋依存境界図＋Webhook/JobRun 設計＋metadata 可否＋idempotency 規約＋never_billable 方針＋段階導入計画＋リスク対策＋GO判定）。
- 📄 `docs/audit/15_monetization_usage_design.md` §25 追記（Phase 1-35 実装状況）。
- 確定事項: `recordUsageEvent`（apps/web/lib/usage-events.ts）は `@/lib/db` import の apps/web 専用で worker/packages から import 不可。次は packages/db 層に worker-safe recorder（`packages/db/src/usage.ts` 案・prisma は `./client`・apps/web 非依存）を置く設計。
- Webhook 将来設計: `webhook.delivered`/category=webhook/usage_only/**success のみ**/failed・dead は emit しない/sourceType=WebhookDelivery/sourceId=delivery.id/idempotencyKey=`usage:webhook.delivered:<eventId>:<subscriptionId>`/actorType=system/metadata に url・secret・signature・payload を入れない。
- JobRun 将来設計: `job.run.completed`/category=job/usage_only/**succeeded のみ**/failed・dead は emit しない/sourceType=JobRun/sourceId=jobRun.id/idempotencyKey=`usage:job.run:<jobRun.id>`/actorType=system/jobType ホワイトリスト/payload・error・logs を metadata に入れない。
- never_billable / emit しない: webhook failed・dead・retry失敗／job failed・dead／AccessDenied／policy deny／PIIマスク／injection検知／承認却下／監査・セキュリティログ／blocked・suppressed・rejected／no-recipient・already-sent・not-found。現段階は never_billable を runtime で使わず基本 emit しない。
- 段階導入: Phase 1-36 共通 recorder 実装のみ → 1-37 Webhook emit → 1-38 JobRun emit（各別承認）。実課金はさらに先（設計 §11 安全条件＋人間承認が前提）。
- 現在の UsageEvent emit 対象は **6種類のまま**（LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send + dunning）。
- 詳細: `docs/audit/17_worker_usage_recorder_design.md`。

## Phase 1-33 — dunning の非課金 UsageEvent emit

状態: **本番確認完了（GO）** — `6cefe8f` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-29・利用者ブラウザ確認）。詳細 `docs/audit/14` §33 / `docs/audit/15` §24.1。

- 🧩 `apps/web/lib/domains/finance/dunning.ts`: `executeDunningSend` の既存 `collectionReminder.update`/`writeAudit`/`emitGrowthEvent` の後・`return { ok: true }` 前に `recordUsageEvent` を追加。
  eventType=`external_send.dunning` / category=`external_send` / **billing=`usage_only`** / unit=`count` / quantity=`1` / sourceType=`CollectionReminder` / sourceId=`reminderId` / idempotencyKey=`usage:external_send.dunning:<id>` / metadata=`{channel:'email', status: sendStatus, kind:'dunning'}`（非PII）。
  記録失敗で dunning 主処理・戻り値を壊さない（helper は例外を投げない）。**実メール送信は起こさない**（既存挙動不変）。**Receivable は触らない・collected にしない**。
- **emit 条件は `sendStatus === 'logged' || sendStatus === 'sent'` のみ**。**no-recipient / already-sent / not-found / failed / rejected / blocked / suppressed / その他 status は emit しない**（never_billable 相当）。
- metadata に recipient/subject/draftMessage/maskedBody/inv.number/inv.total/reminderId/receivableId/invoiceId/顧客情報/金額/secret を入れない（sourceId に reminderId は使うが metadata には入れない）。
- emit 対象に **dunning** を追加。**既存 dunning ロジック（collectionReminder.update/writeAudit/emitGrowthEvent）・recordUsageEvent helper・既存5 emit は不変**。
- 課金なし／決済なし／`billable_candidate`・`never_billable` の runtime 使用なし／金額(amount/price/currency)なし。
- 🧪 `packages/db/src/__tests__/p1_33_usage_event_dunning.itest.ts`: payload 仕様／metadata=channel,status,kind のみ／usage_only／emit 条件（logged|sent のみ・それ以外 emit しない）／二重計上不可／別tenant同key可。
- schema/migration/RBAC/ABAC/package/lock 変更なし。
- 検証（全 green）: db:generate / p1_33 integration 6 / p1_31 6・p1_29 6・p1_27 5・p1_25 5・p1_23 5・p1_22 6・p1_10 11・p1_15 8 回帰 / 統合 22ファイル140 / `./scripts/verify.sh`（typecheck/lint/unit 23ファイル211/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §24。
- 現在の emit 対象は **LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send + dunning の6種類**。
- 次候補: Webhook delivery（worker/packages 経路の共通 helper 設計が前提）／JobRun だが別途監査・承認。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

## Phase 1-31 — invoice-send の非課金 UsageEvent emit

状態: **本番確認完了（GO）** — `b062f68` を `main` へ push 済み・Vercel 本番確認 GO（2026-06-29・利用者ブラウザ確認）。詳細 `docs/audit/14` §32 / `docs/audit/15` §23.1。
- 実機確認: Vercel `b062f68`/Ready/Build成功・migrate deploy 不要・migration pending なし・engine/runtime/UsageEvent invoice-send error なし。`/login`・OWNERログイン・`/invoices` OK。承認済み請求書外部送信が従来どおり動作・logged/sent 処理・EXTERNAL_SEND_ENABLED=false で実メール送信なしの logged 処理・請求書 SENT 既存挙動 OK・**financeEvent / writeAudit / GrowthEvent 回帰なし**・送信後の画面/runtime error なし・UsageEvent/recordUsageEvent 関連エラーなし。emit対象に invoice-send 追加・既存4 emit 維持・billing=usage_only・billable_candidate 未使用・metadata=channel/status/kind のみ・recipient/inv.number/inv.total/maskedBody/金額/invoiceId/secret 不在・failed/rejected/blocked/suppressed は emit されない。課金/決済/サブスク/各 Monetization 画面の新規表示なし。既存機能（/leadmap・/invoices・/finance・/approvals・/reports/morning・#dunning・LeadMap export CSV・AIOutput生成・admin export・approvals outreach）回帰なし。権限境界維持。実メール送信なし・本番DB直接操作なし・Prisma migrate 手動実行なし。
- **課金なし／決済なし／billable_candidate なし／metadata=channel/status/kind のみ／failed等は emit しない／emit対象は5種類**。既存 finance ロジック・既存機能回帰なし。
- 次候補: dunning ／ Webhook delivery（worker/packages 経路の共通 helper 設計が前提）だが別途監査・承認。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

- 🧩 `apps/web/lib/domains/finance/invoice-send.ts`: `executeInvoiceExternalSend` の既存 `invoice.update(SENT)`/`financeEvent.create`/`writeAudit`/`emitGrowthEvent` の後・`return { ok: true }` 前に `recordUsageEvent` を追加。
  eventType=`external_send.invoice` / category=`external_send` / **billing=`usage_only`** / unit=`count` / quantity=`1` / sourceType=`Invoice` / sourceId=`invoiceId` / idempotencyKey=`usage:external_send.invoice:<invoiceId>` / metadata=`{channel:'email', status: sendStatus, kind:'invoice'}`（非PII）。
  記録失敗で送信主処理・financeEvent・戻り値を壊さない（helper は例外を投げない）。**実メール送信は起こさない**（既存挙動不変）。
- **emit 条件は `sendStatus === 'logged' || sendStatus === 'sent'` のみ**。**`failed` / `rejected` / `blocked` / `suppressed` / その他 status は emit しない**（never_billable 相当）。
- metadata に recipient/customer/email/inv.number/inv.total/maskedBody/amount/price/currency/receivable/invoiceId/secret を入れない（sourceId に invoiceId は使うが metadata には入れない）。
- emit 対象に **invoice-send** を追加。**既存 finance ロジック（invoice.update/financeEvent/writeAudit/emitGrowthEvent）・recordUsageEvent helper・既存4 emit（LeadMap/AIOutput/admin/outreach）は不変**。
- 課金なし／決済なし／`billable_candidate`・`never_billable` の runtime 使用なし／金額(amount/price/currency)なし。
- 🧪 `packages/db/src/__tests__/p1_31_usage_event_invoice_send.itest.ts`: payload 仕様／metadata=channel,status,kind のみ／usage_only／emit 条件（logged|sent のみ・failed/rejected/blocked/suppressed は emit しない）／二重計上不可／別tenant同key可。
- schema/migration/RBAC/ABAC/package/lock 変更なし。
- 検証（全 green）: db:generate / p1_31 integration 6 / p1_29 6・p1_27 5・p1_25 5・p1_23 5・p1_22 6・p1_10 11・p1_15 8 回帰 / 統合 21ファイル134 / `./scripts/verify.sh`（typecheck/lint/unit 23ファイル211/build）。
- 詳細: `docs/audit/15_monetization_usage_design.md` §23。
- 現在の emit 対象は **LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send の5種類**。
- 次候補: dunning ／ Webhook delivery（worker/packages 経路の共通 helper 設計が前提）だが別途監査・承認。実課金はさらに先（設計 §11 の安全条件＋人間承認が前提）。

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

状態: **記録完了（`057d314` push 済み）**／本番確認不要（docs のみ・コード挙動不変）。反映状態は git refs を正とする。

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

状態: **記録完了（`85c79ab` push 済み）**／本番確認 不要（docs のみ・コード/schema/migration 不変）。反映状態は git refs を正とする。

- 📄 `docs/audit/15_monetization_usage_design.md`: Phase 1-21A（監査・設計のみ）の結論を記録。
  目的/現状棚卸し/既存モデル棚卸し表/UsageEvent と既存ログの違い/最小MVP疑似スキーマ（**schema 未追加**）/
  eventType 分類/billing 3分類（usage_only・billable_candidate・never_billable）/保存禁止項目（PII非保持）/
  tenant 分離/RBAC 案/課金前安全条件/実装ステップ案（S0〜S5）/MVP 初回記録候補/やらないこと/リスク/判定GO。
- 設計の中核: **UsageEvent は「量のみ」を記録する非課金の利用台帳**（金額を持たない）。`@@unique([tenantId, idempotencyKey])` で二重計上防止。課金は別 billing 層・人間承認・デフォルト非課金。
- 安全前提: **課金実行なし**／schema.prisma 編集なし／migration なし／アプリコード・package.json・pnpm-lock.yaml 不変／本番DB非接触。
- AI は課金・billing 分類変更・台帳改ざん・外部送信を持たない（ROLE_PERMISSIONS 不変）方針を明記。
- 次候補（P2）: S1（UsageEvent モデル追加・migration）以降は別タスク・別承認で段階導入。案E（STAFF向けマスク請求）、案D（issue承認ゲート）、AutomationLevel は後続。

## Phase 1-20 — 検証・本番確認フローの定型化

状態: **整備完了（`de3d054` push 済み）**／本番確認 不要（docs/scripts のみ・コード挙動不変）。反映状態は git refs を正とする。

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
