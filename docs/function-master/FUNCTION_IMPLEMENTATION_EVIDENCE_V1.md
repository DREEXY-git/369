# 369 / IKEZAKI OS 機能実装証拠台帳 v1.0

## 判定原則

このファイルは完全機能台帳の要求を、実装・検証・本番確認の証拠へ接続します。
記載のないFunction IDは、すべて `IMPLEMENTATION_UNVERIFIED` です。

カテゴリの一部に証拠があっても、カテゴリ全体の完成を意味しません。
本番確認のうち「利用者実測」と書かれたものは利用者申告の記録であり、AIが本番へ直接接続して確認したものではありません。
Draft PRや分岐ブランチ上の証拠は `VERIFIED_REPOSITORY` と記録できますが、main統合や本番利用の証拠ではありません。

## 状態語彙

| 状態 | 意味 |
|---|---|
| `VERIFIED_REPOSITORY` | リポジトリ内の実体をread-onlyで確認済み |
| `VERIFIED_LOCAL` | 対象実装とローカル検証の証拠あり |
| `PARTIAL_PRODUCTION_EVIDENCE` | 対象の限定範囲に、利用者実測を含む本番証拠あり |
| `PARTIAL_LOCAL` | 一部だけローカルで成立。未完了範囲あり |
| `DOCS_DEFINED` | 仕様・運用・ロードマップのみ。プロダクト実装ではない |
| `ROADMAP_ONLY` | 将来実装として計画済み |
| `BLOCKED` | 明示されたゲートまたは失敗が未解消 |
| `SOURCE_DETAIL_MISSING` | 原典側に詳細定義がない |
| `IMPLEMENTATION_UNVERIFIED` | 実装証拠なし、または未監査 |
| `DRAFT_IMPLEMENTED` | Draft branchに限定実装あり。main・Preview・Productionは未確認 |
| `CI_VERIFIED` | 固定SHAのCI本文と独立検証で限定範囲を確認。main・Productionの証拠ではない |
| `CODEX_VERIFIED` | 固定SHAをCodexが独立監査し、記載範囲の受入条件を確認。人間Preview・main・Productionは別Gate |
| `HUMAN_PREVIEW_VERIFIED` | 人間が同じ固定SHAのVercel Previewを実操作確認。Productionの証拠ではない |
| `MAIN_MERGED` | 対象commitがGitHub mainへ履歴付きで統合済み |
| `PRODUCTION_VERIFIED` | Productionで対象受入条件を実測。未記載範囲へ一般化しない |
| `EVIDENCE_GAP` | 実装候補はあるが、受入条件を満たす独立証拠が不足 |

## 確認済みの限定範囲

| Function ID | 状態 | 確認できた範囲 | 証拠 | 未確認・境界 |
|---|---|---|---|---|
| `C07-041` | `PARTIAL_PRODUCTION_EVIDENCE` | Company Brain 4テーブルを使うナレッジ検索経路 | `tasks/CURRENT_STATE.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | C07の全データ源・全検索方式ではない |
| `C07-043` | `PARTIAL_PRODUCTION_EVIDENCE` | FakeLLMを含むナレッジ質問応答とCompany Brain参照 | `tasks/CURRENT_STATE.md`、`docs/audit/47_phase2a3c2_hold_resolution_go.md` | 実LLM・全質問品質は未確認 |
| `C07-044` | `PARTIAL_PRODUCTION_EVIDENCE` | 「参照した会社の頭脳」と参照元タイトルの表示 | `docs/audit/47_phase2a3c2_hold_resolution_go.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | 全AI出力の根拠表示ではない |
| `C03-056` | `PARTIAL_PRODUCTION_EVIDENCE` | Company Brain参照時の `ai_reference` DataAccessLog | `tasks/CURRENT_STATE.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | 全AIタスク・全参照元には未接続 |
| `C03-022` | `CODEX_VERIFIED` | ContentAssetの下書き・却下状態から内部`ApprovalRequest(content_review)`を同一tenant・CAS・transactionで1件だけ作る承認依頼 | PR #18 `fa04e7405cf3ab6cb56f329804fc778dde6470b0`、実PostgreSQL E2E、CI `29194789992`、Codex release pass `4951699871` | Draft限定。公開・CMS投稿・外部送信・実LLM・課金は未接続。exact-head Human Preview、main、Production未確認 |
| `C03-025` | `CODEX_VERIFIED` | `PENDING`限定CASとContentAssetを単一transactionで承認・却下し、並行決定を1件へ収束 | PR #18 `fa04e74`、unit 472、E2E 146、実PG並行approve/reject、全表rollback | 汎用Approval全typeではない。Human Preview、main、Production未確認 |
| `C03-026` | `CODEX_VERIFIED` | 人間の決定noteを`decisionNote`へ記録し、decision auditをmetadata-onlyで取得確認 | PR #18 `fa04e74`、`decideContentReviewCore`、CI `29194789992` | コメント履歴・編集・複数往復の完成ではない |
| `C03-028` | `CODEX_VERIFIED` | 人間却下でApprovalRequestとContentAssetを同一transaction内の`REJECTED/rejected`へ遷移 | PR #18 `fa04e74`、実PG正常/並行/冪等/rollback test | 汎用Approval全typeの却下原子性を意味しない |
| `C03-032` | `CODEX_VERIFIED` | コンテンツreview-only申請を`riskLevel=LOW`として人間承認へ送る限定経路 | PR #18 `fa04e74`、metadata-only payload、title/body sentinel否定証拠 | リスク自動算定・業務別ルール全体ではない |
| `C03-039` | `CODEX_VERIFIED` | 却下済みContentAssetをCASで再申請し、rollback後retryへ収束 | PR #18 `fa04e74`、実PG rollback後retry / reject後再申請 | Productionの長期運用・全競合組合せは未確認 |
| `C03-048` | `CODEX_VERIFIED` | content_review申請・決定の監査へ人間actorIdを記録し、DataAccessLog失敗時はAuditを含む全表rollback | PR #18 `fa04e74`、実PG 4表再取得、CI `29194789992` | 全承認type・IP/UA・代理承認の証拠ではない |
| `C03-050` | `CODEX_VERIFIED` | content_review監査へapproval_request / approve / reject actionと対象IDをmetadata-onlyで記録 | PR #18 `fa04e74`、decision Audit取得、title/body sentinel否定証拠 | 変更前後diff・汎用Audit Graph全体ではない |

`C03-022`〜`C03-050`の上記C21限定経路は、後継PR #18 `d209d5d`、RC #32 `8d3ae36`、merge commit `71e0b426`を経てmainへ履歴付きで統合済み。状態は限定範囲の`CODEX_VERIFIED`を維持し、汎用Approval全体またはProduction業務受入へ一般化しない。
| `C39-009` | `CI_VERIFIED` | Agent lifecycleの秘密形状をdirect・FAILED保存・rethrow・Action要約の4経路でfail-closed mask | PR #14 `ba01244`、独立1,687件＋旧thread 25件、unit 452、CI `29185927436` | Secrets管理全体ではない。BullMQ実queueと未知入力全体はEvidence Gap |
| `C38-016` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsent専用台帳と匿名化オフ保存条件の接続 | `docs/audit/85_case_study_consent_schema_production_confirmation.md`、`docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md` | 外部公開許諾や公開実行は未解禁 |
| `C38-021` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsentの保存・一覧・閲覧・取消 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 汎用Consent Record全体の完成ではない |
| `C38-025` | `PARTIAL_PRODUCTION_EVIDENCE` | 人間による事例許諾登録 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 全同意種別の取得フローではない |
| `C38-026` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsentの取消操作 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 全同意種別の撤回連動ではない |
| `C38-035` | `PARTIAL_PRODUCTION_EVIDENCE` | 有効な許諾なしで匿名化を外す保存を拒否 | `docs/audit/90_case_study_consent_reconciliation.md`、`docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md` | 外部掲載処理そのものは未実装・未解禁 |
| `C19-017` | `CI_VERIFIED` | tenant-scoped MarketingCampaignの広告キャンペーンread model | PR #22 `e3c410cdbc3fae7f43fac978ef9ff037ba8cd505`、CI `29200855770`、artifact `8262397756` | 外部広告媒体との接続・変更実行は未実装 |
| `C19-021` | `CI_VERIFIED` | 計画予算の集計表示と改善案生成前後の不変確認 | PR #22 `e3c410c`、実PG before/after、C19 desktop/mobile画像 | 会計実績ではなくマーケ入力値。finance境界との将来再判定が必要 |
| `C19-024` | `CI_VERIFIED` | 自己申告消化額の集計表示と生成・承認での不変確認 | PR #22 `e3c410c`、実PG before/after | 広告媒体・会計実績との照合なし |
| `C19-039` | `CI_VERIFIED` | チャネル状態、CTR/CVR/CPAのread modelと指標不変確認 | PR #22 `e3c410c`、CI 484 unit / 161 E2E | 外部媒体レポートではない |
| `C19-041` | `EVIDENCE_GAP` | FakeLLM固定の広告改善案下書き、suggestion+監査transaction候補、内部review-only承認候補 | PR #22 `e3c410c`、CI `29200855770`、Codex review `4680464389`、change request `4952103318` | 無関係P2002をalready扱い、異なるkeyの同一業務意図が重複、生成全体のAIOutput/DataAccessLogがtransaction外。blocking P2 3件、外部実行なし |
| `C19-051` | `CI_VERIFIED` | 広告変更・予算変更・出稿・外部送信・実LLM・課金を呼ばない構造封印 | PR #22 `e3c410c`、sealed envはFake LLM / mail log / external send false | 承認から広告実行への接続は未実装・未承認 |
| `C10-040` | `VERIFIED_REPOSITORY` | tenant-scoped見積作成Server Actionと一覧・詳細の限定縦切り | PR #18 `fa04e74` code tree、Codex V74 Q2C監査 | 採番がtenant内count依存。並行作成の一意性、create/approval/audit原子性は未証明 |
| `C10-041` | `VERIFIED_REPOSITORY` | 見積明細をserver側で再計算し、tenantId付きで保存 | PR #18 `fa04e74`、finance/approval純粋test 32/32 | DB transaction失敗注入と実PG並行証拠なし |
| `C10-044` | `EVIDENCE_GAP` | 高額または低粗利見積で内部ApprovalRequestを作る候補 | PR #18 `fa04e74`、change request `4952119286` | Quote作成、ApprovalRequest、Auditが単一transactionではなく、承認決定の一気通貫証拠も不足 |
| `C11-004` | `EVIDENCE_GAP` | 契約statusの一覧表示候補 | PR #18 `fa04e74`の`/contracts` | `contract:read`/policy guardなしでDB取得するblocking P2。許可role/拒否role/DataAccessLog証拠なし |
| `C11-005` | `EVIDENCE_GAP` | 契約開始日の一覧表示候補 | PR #18 `fa04e74`の`/contracts` | C11-004と同じRBAC/DataAccess境界が未解消 |
| `C11-006` | `EVIDENCE_GAP` | 契約終了日の一覧表示候補 | PR #18 `fa04e74`の`/contracts` | C11-004と同じRBAC/DataAccess境界が未解消 |
| `C11-007` | `EVIDENCE_GAP` | 自動更新フラグの一覧表示候補 | PR #18 `fa04e74`の`/contracts` | C11-004と同じRBAC/DataAccess境界が未解消 |
| `C11-022` | `EVIDENCE_GAP` | 契約リスクと推奨確認事項のread-only表示候補 | PR #18 `fa04e74`の`/contracts` | 法務断定は避ける表示だが、RBAC/DataAccessLogと入力生成経路の証拠不足 |
| `C12-002` | `VERIFIED_REPOSITORY` | finance権限付き人間によるtenant-scoped請求書作成 | PR #18 `fa04e74` code tree、Codex V74 Q2C監査 | 採番競合、作成とAuditの原子性、実PG失敗注入が未証明 |
| `C12-003` | `VERIFIED_REPOSITORY` | status DRAFTで請求書を保存 | PR #18 `fa04e74` | main/Production未確認 |
| `C12-004` | `VERIFIED_REPOSITORY` | 請求明細をserver側で再計算しtenantId付きで保存 | PR #18 `fa04e74` | transaction・並行作成証拠なし |
| `C12-028` | `EVIDENCE_GAP` | 請求発行時にReceivableを起票する候補 | PR #18 `fa04e74`、change request `4952119286` | Invoice更新、Receivable upsert、Auditが単一transactionでなく、部分成功を独立再現可能な構造 |
| `C12-030` | `EVIDENCE_GAP` | 未完済・未回収請求から督促候補を判定 | PR #18 `fa04e74`、dunning純粋test 6/6 | get-or-createの並行一意性、一覧DataAccess、実PG証拠不足 |
| `C12-031` | `EVIDENCE_GAP` | 威圧・法的断定を避けた決定論的督促文面案 | PR #18 `fa04e74`、dunning純粋test 6/6 | draft保存と必須Auditが単一transactionでなく、外部送信は別Human Gate |
| `C12-032` | `EVIDENCE_GAP` | 請求作成・発行・入金・督促のwriteAudit候補 | PR #18 `fa04e74` | 業務更新と必須Auditがall-or-nothingでない経路が残る |
| `C13-002` | `EVIDENCE_GAP` | 入金実績PaymentとFinanceEventの記録候補 | PR #18 `fa04e74`、finance payment純粋test 9/9 | Payment/Invoice/Receivable/Event/Auditが単一transactionでなく、並行lost updateが未解消 |
| `C13-011` | `EVIDENCE_GAP` | 一部入金時のInvoice/Receivable status算定 | PR #18 `fa04e74`、finance payment純粋test 9/9 | 実PG並行入金、過入金、retry/idempotency証拠なし |
| `C13-023` | `EVIDENCE_GAP` | 入金記録のwriteAudit候補 | PR #18 `fa04e74` | 入金本体とAuditの原子性なし |
| `C14-001` | `VERIFIED_REPOSITORY` | Finance Bridge由来の仕訳候補と貸借一致pure logic | PR #18 `fa04e74`、finance formalize/bridge純粋test 12/12 | 候補生成の全source、実会計連携、main/Production未確認 |
| `C14-002` | `VERIFIED_REPOSITORY` | 仕訳候補正式化前の内部ApprovalRequest経路 | PR #18 `fa04e74`、approval純粋test | 全承認状態・実PG競合証拠不足 |
| `C14-003` | `EVIDENCE_GAP` | 承認済み候補からJournalEntryを作る正式化候補 | PR #18 `fa04e74`、change request `4952119286` | entry/lines作成、candidate更新、Audit/DataAccess/GrowthEventが単一transactionでなく、重複・孤児防止を未証明 |
| `C21-005` | `VERIFIED_REPOSITORY` | SEO記事の見出し構成下書き | PR #4、`docs/roadmap/73_c21_seo_content_gate_candidate.md`、CI #188 99/0 | CMS公開・実検索データなし |
| `C21-006` | `VERIFIED_REPOSITORY` | FakeLLM固定のSEOブリーフ下書き | PR #4、CI #188 | 記事本文完成・外部公開ではない |
| `C21-019` | `VERIFIED_REPOSITORY` | 記録済み記事・LPの決定論的SEO診断 | PR #4、`packages/shared/src/content-seo.ts` | 順位・流入・外部検索なし |
| `C21-020` | `PARTIAL_LOCAL` | 診断結果と人間確認事項の表示 | PR #4、`/marketing/content` | 改善適用・公開なし |
| `C21-021` | `PARTIAL_LOCAL` | No.1・業界初等の禁止表現検出 | PR #4、unit/CI #188 | 全法令・全表現の保証ではない |
| `C22-001` | `ROADMAP_ONLY` | Referral紹介者管理をPhase 3.5の後続laneとして維持 | `COMPLETE_FUNCTION_LEDGER_V1.md`、`PHASE_READINESS_MATRIX_V3.md` | PR #23/#33のread-only候補分析は別`UNMAPPED_CANDIDATE`。紹介者管理・登録・運用の完成証拠へ格上げしない |
| `C22-012` | `ROADMAP_ONLY` | 紹介報酬候補 | `COMPLETE_FUNCTION_LEDGER_V1.md` | 実支払・課金・外部送信は未承認 |
| `C22-013` | `ROADMAP_ONLY` | 紹介承認 | `COMPLETE_FUNCTION_LEDGER_V1.md` | ApprovalRequest接続の実装証拠なし |
| `C22-047` | `ROADMAP_ONLY` | Business Networkの共有同意 | `COMPLETE_FUNCTION_LEDGER_V1.md` | PII共有・外部公開は未承認 |
| `C22-054` | `ROADMAP_ONLY` | Business Networkの外部共有承認 | `COMPLETE_FUNCTION_LEDGER_V1.md` | 外部作用を持たない最小Draftから着手予定 |
| `C28-028` | `VERIFIED_REPOSITORY` | 広告read modelダッシュボード | PR #4、`/marketing/ads` | クライアント共有・出力機能なし |
| `C04-003` | `PARTIAL_LOCAL` | AI社員8名の静的プロフィール（氏名・役割・性格・スキル・注意点）をread-only表示 | PR #9 `9e31bf9`、`packages/shared/src/ai-characters.ts`、CI #220 322 unit / 103 E2E | 永続プロフィール、編集、版管理、実績評価ではない。評価文はキャラクター設定 |
| `C04-011` | `VERIFIED_REPOSITORY` | 証拠由来のAI社員8状態とstale判定 | PR #5、`docs/roadmap/71_ai_workforce_3d_office_gate_candidate.md`、CI #174 97/0 | producer接続は一部ジョブのみ |
| `C28-017` | `MAIN_MERGED` | AI社員8名の3D/2D read-onlyダッシュボード、canonical profile、2D/canvas選択とURL・back/forward同期、mobile NAV 67導線とtheme永続化 | RC #32 `8d3ae36`、CI `29205251769` 472/151、artifact `8263616002` 25 PNG独立目視、Human Preview `4952491948`、main merge `71e0b426` | Previewで人物・profile・stateと768px topbarを確認。ownerのProduction Ready申告はあるが、AI社員のProduction機能受入をCodexが実測した証拠ではない |
| `C28-036` | `PARTIAL_LOCAL` | AI社員状態・run件数に加え、生成・成功・失敗・承認待ちを証拠区分付きで表示 | PR #5、PR #6 `188c442`、CI #216 318 unit / 103 E2E | 承認待ち合計にrun/gate二重計上リスク。成果金額・人間削減時間の実測なし |
| `C30-039` | `VERIFIED_REPOSITORY` | `AIAgentRun`に基づく期間内実行回数と成功・失敗件数の表示 | PR #6 `188c442`、`apps/web/lib/domains/ai-workforce/outcomes.ts`、CI #216 | AI社員別給与明細全体、稼働時間、原価ではない |
| `C30-041` | `HUMAN_PREVIEW_VERIFIED` | `AIApprovalGate(PENDING)`の人間approve/reject、approve後`QUEUED`、24時間超stale再確認、AI取得前拒否 | PR #20 `9080df1d4cafcee225775003700b219ac0522d64`、CI 493/159、Codex unit 116/116、Human Preview comment `4951939636` | Previewでapprove後`QUEUED/再開待ち`と成果未記録を確認。実worker requeue、Production queue、main、Production未確認 |
| `C30-046` | `PARTIAL_LOCAL` | baselineなしでは削減時間を`unavailable`とし、推定値を表示しない規律とUI | PR #6 `188c442`、`outcome-evidence.ts`、`/ai-office?tab=outcomes`、CI #216 | baseline収集・削減時間算出・継続計測は未実装。異unit合算helperは未修正 |
| `C30-052` | `EVIDENCE_GAP` | 直近FAILED表示、安全なrethrow、bounded fail-closed mask、loopback Redisの停止/再起動候補 | PR #14 `ba01244`、PR #20 `9080df1`、CI 493/159、ローカルBullMQ 9/9 | CI実Redis、production worker registry、stalled recovery、実requeue未確認。未知入力を含む脆弱性ゼロは宣言しない |
| `C46-002` | `VERIFIED_REPOSITORY` | 既存ロードマップ群と案B+並行ロードマップ | `docs/roadmap/`、`docs/roadmap/69_bplus_parallel_roadmap_canonicalization_candidate.md` | 正式承認・全実装完了を意味しない |
| `C46-003` | `VERIFIED_REPOSITORY` | 現在地の1枚サマリー | `tasks/CURRENT_STATE.md` | git現在値はgit refsを正とする |
| `C46-004` | `VERIFIED_REPOSITORY` | 履歴・判断記録 | `tasks/PROGRESS.md` | 現在地の正本ではない |
| `C46-018` | `VERIFIED_REPOSITORY` | GitHub向け完全機能台帳と実装証拠台帳 | `docs/function-master/`、`SOURCE_MANIFEST_V1.json` | main統合前。原典更新時はv2差分Gateが必要 |
| `C46-019` | `VERIFIED_REPOSITORY` | Obsidianで読める57ファイルの生成鏡像とV74 WIP監査ノート | `369-vault/知識/完全機能台帳/`、生成器`--check`、独立vault main `de81c0ae72948c78290dd9ac23e81532a47a5b5b` | 総出力60件はGitHub正本3件＋鏡像57件。post-release HOLD監査を履歴付きで同期済み |
| `C46-020` | `VERIFIED_REPOSITORY` | `369-vault`の索引と知識ノート構造 | `369-vault/index.md`、`369-vault/知識/` | 独立private repo化は未確認 |
| `C46-032` | `VERIFIED_REPOSITORY` | Stage 3 E2E greenを複数branchで継続確認 | CI #164 93/0、#182、#188 99/0、#190 100/0 | 各Draft PRのmain統合後に再実行が必要 |
| `C46-033` | `VERIFIED_REPOSITORY` | unit・lint・typecheck・build・E2Eの自動検証資産 | `.github/workflows/ci.yml`、`apps/web/tests/e2e/`、CI #190 | 本番利用者確認とは別 |
| `C49` | `SOURCE_DETAIL_MISSING` | カテゴリ索引の存在だけ確認 | `docs/function-master/SOURCE_MANIFEST_V1.json` | Appendix A詳細節なし。機能完成判定不能 |

## ユーザー追加要件

| Function ID | 状態 | 証拠 | 次の不足 |
|---|---|---|---|
| `USR-001` | `DOCS_DEFINED` | `369-vault/プロンプト/369 Claude Code完全統合マスタープロンプト v4.0.md` | 実運用での継続検証 |
| `USR-002` | `DOCS_DEFINED` | `docs/roadmap/40_369_master_execution_roadmap_candidate.md` | 各実装証拠の継続更新 |
| `USR-003` | `MAIN_MERGED` | RC #32 `8d3ae36`の3D AI Office、8名canonical parity、2D/canvas URL同期、profile全体画像、NAV 67導線、mobile theme | CI `29205251769`、artifact `8263616002`、25 PNG独立目視、Human Preview `4952491948`、main `71e0b426` | exact-head Previewで一覧・詳細・3Dと768px topbarを確認。Production機能受入は未実測 |
| `USR-004` | `PARTIAL_LOCAL` | PR #6 `188c442`のOutcome Ledger、証拠5区分、実行/生成件数、baselineなしを`計測なし`とするUI、CI #216 | 人間baseline・成果金額・自己申告入力なし。承認待ち二重計上と異単位合算helperを修正要 |
| `USR-005` | `PARTIAL_LOCAL` | 生成器のGitHub/Obsidian鏡像と、V74 WIP同期manifest・監査noteをCodex branchで作成 | 独立vault main mergeとClaude同期ACKが終わるまで完了へ格上げしない |
| `USR-006` | `DOCS_DEFINED` | 統合プロンプトと統合ロードマップ | 実タスクでの継続遵守証拠 |
| `USR-007` | `EVIDENCE_GAP` | PR #14 `ba01244`で既報Grammar P1を独立1,687件＋旧thread 25件の4経路marker 0、PR #20でloopback Redis 9/9候補 | CI実Redis、production worker retry/stalled recovery、第三者診断、未知入力、main/Preview/Productionは未確認。「脆弱性0」は断定しない |
| `USR-008` | `DOCS_DEFINED` | 統合プロンプトの世界一Evidence Gate | 市場指標・比較対象・第三者データ |
| `USR-009` | `VERIFIED_REPOSITORY` | raw SHA固定、7,485 Stable IDs、GitHub台帳、57件のObsidian鏡像、再現可能な生成器、Claude feature統合 `63baa54` | main未統合。Evidence継続更新と各Streamへの伝播が必要 |

## UNMAPPED_CANDIDATE（正式Function IDではない）

| 候補 | 状態 | 証拠 | 境界 |
|---|---|---|---|
| PR #9のキャラクター固有要素（かな・コードネーム・二つ名・業務のクセ・よくあるミス・静的評価文） | `UNMAPPED_CANDIDATE` | `packages/shared/src/ai-characters.ts`、`apps/web/components/ai-office/portrait.tsx` | `C04-003 Agent Profile`の限定証拠には含めるが、`C30-056 今月の評価`の実績証拠へ格上げしない |
| PR #18のC21 `content_review`承認ブリッジ | `UNMAPPED_CANDIDATE / MAIN_MERGED` | RC #32 `8d3ae36`、内部ApprovalRequest、実PostgreSQL証拠、CI `29205251769`、Human Preview `4952491948`、main merge `71e0b426` | C21の限定承認経路はmain統合済み。カテゴリ完成、CMS公開、外部送信、Production業務受入へ格上げしない |
| C19 schema案A 承認ブリッジ | `UNMAPPED_CANDIDATE` | PR #22 `e3c410c`、CI `29200855770` unit 484/E2E 161、artifact `8262397756`、Codex review `4680464389`、change request `4952103318` | P2002誤判定、業務意図の安定key、生成全体監査のP2を独立再現。本番migration、外部広告変更、予算変更、実LLMは未承認。正式IDを創作しない |
| Phase 4 `ai_run_resume` bridge / BullMQ実queue候補 | `UNMAPPED_CANDIDATE` | PR #20 `9080df1`、CI `29196387933`、Codex unit 116/116、ローカルBullMQ 9/9、Human Preview `4951939636` | Previewでapprove後QUEUEDと成果未記録を確認。実queue requeue、CI Redis、production worker、stalled recoveryはEvidence Gap。正式IDを創作しない |
| C22紹介候補分析/Fake下書きpreview | `UNMAPPED_CANDIDATE / MAIN_MERGED / EVIDENCE_GAP` | PR #23 `2884949ceb7a018fa7dc4a27ae5d04b2f829a965`、CI `29204903544` unit 483/E2E 155、artifact `8263517090`、Human Preview `4952492876`、PR #33、main `7efb22b` | 顧客名取得段階、別tenant実在ID、一覧metadata監査は追加済み。候補外direct previewとAI actorType誤分類のP2 2件（change request `4952715449`）が現行mainに残る。C22正式IDへ推測格上げしない |
| AI Inbox / Execution Receipt | `UNMAPPED_CANDIDATE / EVIDENCE_GAP` | PR #25 `c28b9bf5eb0f43a54b55890d24bc95ed10ed218d`、unit 9/9、Codex comments `4951990981`、`4952108983` | run-agent tenant整合、PENDING/CANCELLED receipt、payload/summary最小化、DataAccessLog、exact-head CIが不足 |
| Workflow Dry Run | `UNMAPPED_CANDIDATE / EVIDENCE_GAP` | PR #26 `45bde82bc24b61ddcc76de74d2a4c8400468f6c0`、unit 13/13、独立fail-open/否定文probe、Codex comments `4951991086`、`4952109025` | 外部作用0のDraftは存在。未知危険操作をcompletedとする判定、否定文、GET URL残存、exact-head CIが不足 |
| P3-R01 release regression hardening | `UNMAPPED_CANDIDATE / MAIN_MERGED` | PR #18 `d209d5d`、RC #32 `8d3ae36`、CI `29205251769` unit 472/E2E 151、artifact `8263616002`、Human Preview `4952491948`、main `71e0b426` | topbar/回帰/C21 raceの限定範囲は統合済み。Control Tower財務閲覧label P2（change request `4952704653`）によりPhase 3 completionはHOLD。Production機能受入は未確認 |

## 更新ルール

証拠を追加する場合は、Function ID、状態、確認範囲、証拠、未確認範囲を必ずセットで記録します。
証拠が失効・回帰した場合は行を消さず、追記で状態を下げ、原因と日付を残します。

完全機能台帳の生成同期確認:

~~~bash
node scripts/generate-complete-function-ledger.mjs \
  --source /absolute/path/to/pasted-text.txt \
  --check
~~~
