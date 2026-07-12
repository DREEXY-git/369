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
| `C39-009` | `CI_VERIFIED` | Agent lifecycleの秘密形状をdirect・FAILED保存・rethrow・Action要約の4経路でfail-closed mask | PR #14 `ba01244`、独立1,687件＋旧thread 25件、unit 452、CI `29185927436` | Secrets管理全体ではない。BullMQ実queueと未知入力全体はEvidence Gap |
| `C38-016` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsent専用台帳と匿名化オフ保存条件の接続 | `docs/audit/85_case_study_consent_schema_production_confirmation.md`、`docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md` | 外部公開許諾や公開実行は未解禁 |
| `C38-021` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsentの保存・一覧・閲覧・取消 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 汎用Consent Record全体の完成ではない |
| `C38-025` | `PARTIAL_PRODUCTION_EVIDENCE` | 人間による事例許諾登録 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 全同意種別の取得フローではない |
| `C38-026` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsentの取消操作 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 全同意種別の撤回連動ではない |
| `C38-035` | `PARTIAL_PRODUCTION_EVIDENCE` | 有効な許諾なしで匿名化を外す保存を拒否 | `docs/audit/90_case_study_consent_reconciliation.md`、`docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md` | 外部掲載処理そのものは未実装・未解禁 |
| `C19-017` | `CI_VERIFIED` | tenant-scoped MarketingCampaignの広告キャンペーンread model | PR #22 `13793171a8439477f4d8bc08822f2875043b5475`、CI `29195390186`、artifact `8260854749` | 外部広告媒体との接続・変更実行は未実装 |
| `C19-021` | `CI_VERIFIED` | 計画予算の集計表示と改善案生成前後の不変確認 | PR #22 `1379317`、実PG before/after、C19 desktop/mobile画像 | 会計実績ではなくマーケ入力値。finance境界との将来再判定が必要 |
| `C19-024` | `CI_VERIFIED` | 自己申告消化額の集計表示と生成・承認での不変確認 | PR #22 `1379317`、実PG before/after | 広告媒体・会計実績との照合なし |
| `C19-039` | `CI_VERIFIED` | チャネル状態、CTR/CVR/CPAのread modelと指標不変確認 | PR #22 `1379317`、CI 481 unit / 158 E2E | 外部媒体レポートではない |
| `C19-041` | `EVIDENCE_GAP` | FakeLLM固定の広告改善案下書き、suggestion+必須監査transaction、内部review-only承認候補 | PR #22 `1379317`、CI `29195390186`、Codex change request `4951705481` | 同一入力の並行実行でsuggestion/ledger各2件を独立再現。DB一意性とServer Action全体retryが未解消。外部実行なし |
| `C19-051` | `CI_VERIFIED` | 広告変更・予算変更・出稿・外部送信・実LLM・課金を呼ばない構造封印 | PR #22 `1379317`、tenant単位外部作用不変、sealed env | 承認から広告実行への接続は未実装・未承認 |
| `C21-005` | `VERIFIED_REPOSITORY` | SEO記事の見出し構成下書き | PR #4、`docs/roadmap/73_c21_seo_content_gate_candidate.md`、CI #188 99/0 | CMS公開・実検索データなし |
| `C21-006` | `VERIFIED_REPOSITORY` | FakeLLM固定のSEOブリーフ下書き | PR #4、CI #188 | 記事本文完成・外部公開ではない |
| `C21-019` | `VERIFIED_REPOSITORY` | 記録済み記事・LPの決定論的SEO診断 | PR #4、`packages/shared/src/content-seo.ts` | 順位・流入・外部検索なし |
| `C21-020` | `PARTIAL_LOCAL` | 診断結果と人間確認事項の表示 | PR #4、`/marketing/content` | 改善適用・公開なし |
| `C21-021` | `PARTIAL_LOCAL` | No.1・業界初等の禁止表現検出 | PR #4、unit/CI #188 | 全法令・全表現の保証ではない |
| `C22-001` | `ROADMAP_ONLY` | Referral紹介者管理をPhase 3.5の後続laneとして維持 | `COMPLETE_FUNCTION_LEDGER_V1.md`、`PHASE_READINESS_MATRIX_V3.md` | 固定実装head、CI、Previewなし |
| `C22-012` | `ROADMAP_ONLY` | 紹介報酬候補 | `COMPLETE_FUNCTION_LEDGER_V1.md` | 実支払・課金・外部送信は未承認 |
| `C22-013` | `ROADMAP_ONLY` | 紹介承認 | `COMPLETE_FUNCTION_LEDGER_V1.md` | ApprovalRequest接続の実装証拠なし |
| `C22-047` | `ROADMAP_ONLY` | Business Networkの共有同意 | `COMPLETE_FUNCTION_LEDGER_V1.md` | PII共有・外部公開は未承認 |
| `C22-054` | `ROADMAP_ONLY` | Business Networkの外部共有承認 | `COMPLETE_FUNCTION_LEDGER_V1.md` | 外部作用を持たない最小Draftから着手予定 |
| `C28-028` | `VERIFIED_REPOSITORY` | 広告read modelダッシュボード | PR #4、`/marketing/ads` | クライアント共有・出力機能なし |
| `C04-003` | `PARTIAL_LOCAL` | AI社員8名の静的プロフィール（氏名・役割・性格・スキル・注意点）をread-only表示 | PR #9 `9e31bf9`、`packages/shared/src/ai-characters.ts`、CI #220 322 unit / 103 E2E | 永続プロフィール、編集、版管理、実績評価ではない。評価文はキャラクター設定 |
| `C04-011` | `VERIFIED_REPOSITORY` | 証拠由来のAI社員8状態とstale判定 | PR #5、`docs/roadmap/71_ai_workforce_3d_office_gate_candidate.md`、CI #174 97/0 | producer接続は一部ジョブのみ |
| `C28-017` | `HUMAN_PREVIEW_VERIFIED` | AI社員8名の3D/2D read-onlyダッシュボード、canonical profile、2D/canvas選択とURL・back/forward同期、mobile NAV 67導線とtheme永続化 | PR #18 `fa04e74`、CI 472/146、artifact `8260681537`、21 PNG独立目視、Human Preview comment `4951939581` | Previewで人物・profile・state一致、320px theme永続化、Bell/user/logout/NAVを確認。main・Production未確認 |
| `C28-036` | `PARTIAL_LOCAL` | AI社員状態・run件数に加え、生成・成功・失敗・承認待ちを証拠区分付きで表示 | PR #5、PR #6 `188c442`、CI #216 318 unit / 103 E2E | 承認待ち合計にrun/gate二重計上リスク。成果金額・人間削減時間の実測なし |
| `C30-039` | `VERIFIED_REPOSITORY` | `AIAgentRun`に基づく期間内実行回数と成功・失敗件数の表示 | PR #6 `188c442`、`apps/web/lib/domains/ai-workforce/outcomes.ts`、CI #216 | AI社員別給与明細全体、稼働時間、原価ではない |
| `C30-041` | `HUMAN_PREVIEW_VERIFIED` | `AIApprovalGate(PENDING)`の人間approve/reject、approve後`QUEUED`、24時間超stale再確認、AI取得前拒否 | PR #20 `9080df1d4cafcee225775003700b219ac0522d64`、CI 493/159、Codex unit 116/116、Human Preview comment `4951939636` | Previewでapprove後`QUEUED/再開待ち`と成果未記録を確認。実worker requeue、Production queue、main、Production未確認 |
| `C30-046` | `PARTIAL_LOCAL` | baselineなしでは削減時間を`unavailable`とし、推定値を表示しない規律とUI | PR #6 `188c442`、`outcome-evidence.ts`、`/ai-office?tab=outcomes`、CI #216 | baseline収集・削減時間算出・継続計測は未実装。異unit合算helperは未修正 |
| `C30-052` | `EVIDENCE_GAP` | 直近FAILED表示、安全なrethrow、bounded fail-closed mask、loopback Redisの停止/再起動候補 | PR #14 `ba01244`、PR #20 `9080df1`、CI 493/159、ローカルBullMQ 9/9 | CI実Redis、production worker registry、stalled recovery、実requeue未確認。未知入力を含む脆弱性ゼロは宣言しない |
| `C46-002` | `VERIFIED_REPOSITORY` | 既存ロードマップ群と案B+並行ロードマップ | `docs/roadmap/`、`docs/roadmap/69_bplus_parallel_roadmap_canonicalization_candidate.md` | 正式承認・全実装完了を意味しない |
| `C46-003` | `VERIFIED_REPOSITORY` | 現在地の1枚サマリー | `tasks/CURRENT_STATE.md` | git現在値はgit refsを正とする |
| `C46-004` | `VERIFIED_REPOSITORY` | 履歴・判断記録 | `tasks/PROGRESS.md` | 現在地の正本ではない |
| `C46-018` | `VERIFIED_REPOSITORY` | GitHub向け完全機能台帳と実装証拠台帳 | `docs/function-master/`、`SOURCE_MANIFEST_V1.json` | main統合前。原典更新時はv2差分Gateが必要 |
| `C46-019` | `VERIFIED_REPOSITORY` | Obsidianで読める57ファイルの生成鏡像 | `369-vault/知識/完全機能台帳/`、生成器`--check`、独立vault main `0812634` | 総出力60件はGitHub正本3件＋鏡像57件。正しい`00_完全機能台帳インデックス`リンクはV70 app/vault Draftへ同期、vault main未統合 |
| `C46-020` | `VERIFIED_REPOSITORY` | `369-vault`の索引と知識ノート構造 | `369-vault/index.md`、`369-vault/知識/` | 独立private repo化は未確認 |
| `C46-032` | `VERIFIED_REPOSITORY` | Stage 3 E2E greenを複数branchで継続確認 | CI #164 93/0、#182、#188 99/0、#190 100/0 | 各Draft PRのmain統合後に再実行が必要 |
| `C46-033` | `VERIFIED_REPOSITORY` | unit・lint・typecheck・build・E2Eの自動検証資産 | `.github/workflows/ci.yml`、`apps/web/tests/e2e/`、CI #190 | 本番利用者確認とは別 |
| `C49` | `SOURCE_DETAIL_MISSING` | カテゴリ索引の存在だけ確認 | `docs/function-master/SOURCE_MANIFEST_V1.json` | Appendix A詳細節なし。機能完成判定不能 |

## ユーザー追加要件

| Function ID | 状態 | 証拠 | 次の不足 |
|---|---|---|---|
| `USR-001` | `DOCS_DEFINED` | `369-vault/プロンプト/369 Claude Code完全統合マスタープロンプト v4.0.md` | 実運用での継続検証 |
| `USR-002` | `DOCS_DEFINED` | `docs/roadmap/40_369_master_execution_roadmap_candidate.md` | 各実装証拠の継続更新 |
| `USR-003` | `HUMAN_PREVIEW_VERIFIED` | PR #18 `fa04e74`の3D AI Office、8名canonical parity、2D/canvas URL同期、profile全体画像、NAV 67導線、mobile theme | CI `29194789992`、artifact `8260681537`、21 PNG独立目視、Human Preview `4951939581` | exact-head Previewで一覧・詳細・3Dの同一人物/profile/stateを確認。main・Production未確認 |
| `USR-004` | `PARTIAL_LOCAL` | PR #6 `188c442`のOutcome Ledger、証拠5区分、実行/生成件数、baselineなしを`計測なし`とするUI、CI #216 | 人間baseline・成果金額・自己申告入力なし。承認待ち二重計上と異単位合算helperを修正要 |
| `USR-005` | `PARTIAL_LOCAL` | 生成器がGitHub正本とObsidian鏡像を同時生成し、統合プロンプトが毎タスクの同期確認を要求 | 今後の実タスクでの継続運用証拠 |
| `USR-006` | `DOCS_DEFINED` | 統合プロンプトと統合ロードマップ | 実タスクでの継続遵守証拠 |
| `USR-007` | `EVIDENCE_GAP` | PR #14 `ba01244`で既報Grammar P1を独立1,687件＋旧thread 25件の4経路marker 0、PR #20でloopback Redis 9/9候補 | CI実Redis、production worker retry/stalled recovery、第三者診断、未知入力、main/Preview/Productionは未確認。「脆弱性0」は断定しない |
| `USR-008` | `DOCS_DEFINED` | 統合プロンプトの世界一Evidence Gate | 市場指標・比較対象・第三者データ |
| `USR-009` | `VERIFIED_REPOSITORY` | raw SHA固定、7,485 Stable IDs、GitHub台帳、57件のObsidian鏡像、再現可能な生成器、Claude feature統合 `63baa54` | main未統合。Evidence継続更新と各Streamへの伝播が必要 |

## UNMAPPED_CANDIDATE（正式Function IDではない）

| 候補 | 状態 | 証拠 | 境界 |
|---|---|---|---|
| PR #9のキャラクター固有要素（かな・コードネーム・二つ名・業務のクセ・よくあるミス・静的評価文） | `UNMAPPED_CANDIDATE` | `packages/shared/src/ai-characters.ts`、`apps/web/components/ai-office/portrait.tsx` | `C04-003 Agent Profile`の限定証拠には含めるが、`C30-056 今月の評価`の実績証拠へ格上げしない |
| PR #18のC21 `content_review`承認ブリッジ | `UNMAPPED_CANDIDATE` | `fa04e74`、内部ApprovalRequest、実PostgreSQL証拠、CI `29194789992`、Codex pass `4951699871`、Human Preview Gate `4951939581` | Release PathのPreview Gateは完了したが、確認範囲はmobile/NAV/AI社員。C21のDB意味論はCI/Codex証拠を正とし、カテゴリ完成・公開実行へ格上げしない。main/Production未確認 |
| C19 schema案A 承認ブリッジ | `UNMAPPED_CANDIDATE` | PR #22 `1379317`、CI `29195390186` unit 481/E2E 158、artifact `8260854749`、Codex change request `4951705481` | transaction/rollback/画面は改善。並行冪等性P2を独立再現したためHOLD。本番migration、外部広告変更、予算変更、実LLMは未承認。正式IDを創作しない |
| Phase 4 `ai_run_resume` bridge / BullMQ実queue候補 | `UNMAPPED_CANDIDATE` | PR #20 `9080df1`、CI `29196387933`、Codex unit 116/116、ローカルBullMQ 9/9、Human Preview `4951939636` | Previewでapprove後QUEUEDと成果未記録を確認。実queue requeue、CI Redis、production worker、stalled recoveryはEvidence Gap。正式IDを創作しない |
| C22紹介候補分析/Fake下書きpreview | `UNMAPPED_CANDIDATE / EVIDENCE_GAP` | PR #23 `9209ef856523ae2e10a303849dc13a088e1f426c`、Codex change request `4951991026` | read-only Draftは存在。顧客名の取得段階遮断、別tenant実在ID、一覧DataAccessLog、exact-head CIが不足。C22正式IDへ推測格上げしない |
| AI Inbox / Execution Receipt | `UNMAPPED_CANDIDATE / EVIDENCE_GAP` | PR #25 `c28b9bf5eb0f43a54b55890d24bc95ed10ed218d`、Codex change request `4951990981` | run-agent tenant整合、PENDING receipt、payload/summary最小化、DataAccessLog、exact-head CIが不足 |
| Workflow Dry Run | `UNMAPPED_CANDIDATE / EVIDENCE_GAP` | PR #26 `45bde82bc24b61ddcc76de74d2a4c8400468f6c0`、独立fail-open probe、Codex change request `4951991086` | 外部作用0のDraftは存在。未知危険操作をcompletedとする判定とGET URL残存、exact-head CIが不足 |

## 更新ルール

証拠を追加する場合は、Function ID、状態、確認範囲、証拠、未確認範囲を必ずセットで記録します。
証拠が失効・回帰した場合は行を消さず、追記で状態を下げ、原因と日付を残します。

完全機能台帳の生成同期確認:

~~~bash
node scripts/generate-complete-function-ledger.mjs \
  --source /absolute/path/to/pasted-text.txt \
  --check
~~~
