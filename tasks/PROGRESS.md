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
