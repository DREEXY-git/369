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
| `PREVIEW_VERIFIED` | 固定SHA lineageを確認したPreviewでread-only確認済み。Productionの証拠ではない |
| `EVIDENCE_GAP` | 実装候補はあるが、受入条件を満たす独立証拠が不足 |

## 確認済みの限定範囲

| Function ID | 状態 | 確認できた範囲 | 証拠 | 未確認・境界 |
|---|---|---|---|---|
| `C07-041` | `PARTIAL_PRODUCTION_EVIDENCE` | Company Brain 4テーブルを使うナレッジ検索経路 | `tasks/CURRENT_STATE.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | C07の全データ源・全検索方式ではない |
| `C07-043` | `PARTIAL_PRODUCTION_EVIDENCE` | FakeLLMを含むナレッジ質問応答とCompany Brain参照 | `tasks/CURRENT_STATE.md`、`docs/audit/47_phase2a3c2_hold_resolution_go.md` | 実LLM・全質問品質は未確認 |
| `C07-044` | `PARTIAL_PRODUCTION_EVIDENCE` | 「参照した会社の頭脳」と参照元タイトルの表示 | `docs/audit/47_phase2a3c2_hold_resolution_go.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | 全AI出力の根拠表示ではない |
| `C03-056` | `PARTIAL_PRODUCTION_EVIDENCE` | Company Brain参照時の `ai_reference` DataAccessLog | `tasks/CURRENT_STATE.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | 全AIタスク・全参照元には未接続 |
| `C03-022` | `CI_VERIFIED` | ContentAssetの下書き・却下状態から内部`ApprovalRequest(content_review)`を1件だけ作る承認依頼 | PR #18 `c8b6065`、実PostgreSQL E2E 12件、CI `29190155634` | Draft限定。Audit rollback未assert等のV70 Evidence Gapがありrelease HOLD。公開・CMS投稿・外部送信・実LLM・課金は未接続 |
| `C03-025` | `CI_VERIFIED` | `PENDING`限定CASと対象ContentAssetの状態を単一transactionで承認・却下へ遷移 | PR #18 `c8b6065`、unit 472、E2E 145、実PG並行approve/reject | 新headのPreview lineage/画面は人間確認済みだがDB意味論の証明ではない。main・Production未確認、全表rollback証拠は未完了 |
| `C03-026` | `CI_VERIFIED` | 人間の決定noteを`decisionNote`へ記録 | PR #18 `c8b6065`、`decideContentReviewCore`、CI `29190155634` | コメント履歴・編集・複数往復の完成ではない |
| `C03-028` | `CI_VERIFIED` | 人間却下でApprovalRequestとContentAssetを同一transaction内の`REJECTED/rejected`へ遷移 | PR #18 `c8b6065`、実PG正常/並行/冪等test | 汎用Approval全typeの却下原子性を意味しない。decision Auditのmetadata-only範囲は追加検証要 |
| `C03-032` | `CI_VERIFIED` | コンテンツreview-only申請を`riskLevel=LOW`として人間承認へ送る限定経路 | PR #18 `c8b6065`、metadata-only payload、CI `29190155634` | リスク自動算定・業務別ルール全体ではない。title/decision auditの否定証拠は追加要 |
| `C03-039` | `CI_VERIFIED` | 却下済みContentAssetをCASで再申請可能にする限定経路 | PR #18 `c8b6065`、実PG rollback後retry / reject後再申請 | 同時再申請全組合せとProductionは未確認 |
| `C03-048` | `EVIDENCE_GAP` | content_review申請・決定の監査へ人間actorIdを記録する実装候補 | PR #18 `c8b6065`、transaction内`auditLog.create`、CI `29190155634` | DataAccess失敗時のAudit rollbackとdecision Audit取得が未assert。全承認type・IP/UA・代理承認の証拠ではない |
| `C03-050` | `EVIDENCE_GAP` | content_review監査へapproval_request / approve / reject actionと対象IDを記録する実装候補 | PR #18 `c8b6065`、実PG suite、CI `29190155634` | title sentinelとdecision Auditを含むmetadata-only否定証拠が不足。変更前後diff・汎用Audit Graph全体ではない |
| `C39-009` | `CI_VERIFIED` | Agent lifecycleの秘密形状をdirect・FAILED保存・rethrow・Action要約の4経路でfail-closed mask | PR #14 `ba01244`、独立1,687件＋旧thread 25件、unit 452、CI `29185927436` | Secrets管理全体ではない。BullMQ実queueと未知入力全体はEvidence Gap |
| `C38-016` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsent専用台帳と匿名化オフ保存条件の接続 | `docs/audit/85_case_study_consent_schema_production_confirmation.md`、`docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md` | 外部公開許諾や公開実行は未解禁 |
| `C38-021` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsentの保存・一覧・閲覧・取消 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 汎用Consent Record全体の完成ではない |
| `C38-025` | `PARTIAL_PRODUCTION_EVIDENCE` | 人間による事例許諾登録 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 全同意種別の取得フローではない |
| `C38-026` | `PARTIAL_PRODUCTION_EVIDENCE` | CaseStudyConsentの取消操作 | `docs/audit/88_case_study_consent_ui_production_confirmation.md` | 全同意種別の撤回連動ではない |
| `C38-035` | `PARTIAL_PRODUCTION_EVIDENCE` | 有効な許諾なしで匿名化を外す保存を拒否 | `docs/audit/90_case_study_consent_reconciliation.md`、`docs/audit/93_case_study_consent_save_condition_connection_production_confirmation.md` | 外部掲載処理そのものは未実装・未解禁 |
| `C19-017` | `VERIFIED_REPOSITORY` | MarketingCampaignの広告キャンペーンread model | PR #4、`docs/roadmap/70_c19_ads_read_model_gate_candidate.md`、CI #172 96/0 | 外部広告媒体との接続・変更実行は未実装 |
| `C19-021` | `PARTIAL_LOCAL` | 計画予算の集計表示 | PR #4、`/marketing/ads` | 会計実績ではなくマーケ入力値。finance境界との将来再判定が必要 |
| `C19-024` | `PARTIAL_LOCAL` | 自己申告消化額の集計表示 | PR #4、`/marketing/ads` | 広告媒体・会計実績との照合なし |
| `C19-039` | `VERIFIED_REPOSITORY` | チャネル状態、CTR/CVR/CPAのread model | PR #4、`docs/audit/169_c19_ads_read_model.md` | 外部媒体レポートではない |
| `C19-041` | `VERIFIED_REPOSITORY` | FakeLLM固定の広告改善案下書き | PR #4、CI #172 | 採否・実行・効果測定は未接続 |
| `C19-051` | `PARTIAL_LOCAL` | 自動実行経路を持たない構造封印 | `docs/roadmap/70_c19_ads_read_model_gate_candidate.md` | 承認から広告実行への接続は未実装 |
| `C21-005` | `VERIFIED_REPOSITORY` | SEO記事の見出し構成下書き | PR #4、`docs/roadmap/73_c21_seo_content_gate_candidate.md`、CI #188 99/0 | CMS公開・実検索データなし |
| `C21-006` | `VERIFIED_REPOSITORY` | FakeLLM固定のSEOブリーフ下書き | PR #4、CI #188 | 記事本文完成・外部公開ではない |
| `C21-019` | `VERIFIED_REPOSITORY` | 記録済み記事・LPの決定論的SEO診断 | PR #4、`packages/shared/src/content-seo.ts` | 順位・流入・外部検索なし |
| `C21-020` | `PARTIAL_LOCAL` | 診断結果と人間確認事項の表示 | PR #4、`/marketing/content` | 改善適用・公開なし |
| `C21-021` | `PARTIAL_LOCAL` | No.1・業界初等の禁止表現検出 | PR #4、unit/CI #188 | 全法令・全表現の保証ではない |
| `C28-028` | `VERIFIED_REPOSITORY` | 広告read modelダッシュボード | PR #4、`/marketing/ads` | クライアント共有・出力機能なし |
| `C04-003` | `PARTIAL_LOCAL` | AI社員8名の静的プロフィール（氏名・役割・性格・スキル・注意点）をread-only表示 | PR #9 `9e31bf9`、`packages/shared/src/ai-characters.ts`、CI #220 322 unit / 103 E2E | 永続プロフィール、編集、版管理、実績評価ではない。評価文はキャラクター設定 |
| `C04-011` | `VERIFIED_REPOSITORY` | 証拠由来のAI社員8状態とstale判定 | PR #5、`docs/roadmap/71_ai_workforce_3d_office_gate_candidate.md`、CI #174 97/0 | producer接続は一部ジョブのみ |
| `C28-017` | `CI_VERIFIED` | AI社員8名の3D/2D read-onlyダッシュボード、canonical profile、2D/canvas選択とURL・back/forward同期 | PR #18 `c8b6065`、CI 472/145、artifact `8259308684`、Human Preview badge lineage/画面OK | Bell/avatar/logout/buildのmobile clipは解消。ThemeToggleがmobileから消失したrelease-blocking P2。main・Production未確認 |
| `C28-036` | `PARTIAL_LOCAL` | AI社員状態・run件数に加え、生成・成功・失敗・承認待ちを証拠区分付きで表示 | PR #5、PR #6 `188c442`、CI #216 318 unit / 103 E2E | 承認待ち合計にrun/gate二重計上リスク。成果金額・人間削減時間の実測なし |
| `C30-039` | `VERIFIED_REPOSITORY` | `AIAgentRun`に基づく期間内実行回数と成功・失敗件数の表示 | PR #6 `188c442`、`apps/web/lib/domains/ai-workforce/outcomes.ts`、CI #216 | AI社員別給与明細全体、稼働時間、原価ではない |
| `C30-041` | `DRAFT_IMPLEMENTED` | `AIApprovalGate(PENDING)`のread-only一覧に人間approve/reject bridge候補を追加 | Phase 4途中head `ddfcffe`、Codex純粋unit 12/12 | 固定PR/CIなし。AI誤権限閲覧、stale run、実行証拠なしSUCCEEDED、全表rollback、detail/3D parityが未解消。main・Preview・Production未確認 |
| `C30-046` | `PARTIAL_LOCAL` | baselineなしでは削減時間を`unavailable`とし、推定値を表示しない規律とUI | PR #6 `188c442`、`outcome-evidence.ts`、`/ai-office?tab=outcomes`、CI #216 | baseline収集・削減時間算出・継続計測は未実装。異unit合算helperは未修正 |
| `C30-052` | `CI_VERIFIED` | 直近`AIAgentRun=FAILED`のread-only表示、FAILED記録後の安全なrethrow、秘密形状のbounded fail-closed mask | PR #14 `ba01244`、独立Grammar 1,687件＋旧thread 25件の4経路marker 0、V70 CI 472/145 | Phase 4途中headにBullMQ itestコードはあるが、実Redis固定ログ、production worker、停止後再起動の独立証拠なし。未知入力を含む脆弱性ゼロは宣言しない |
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
| `USR-003` | `CI_VERIFIED` | PR #18 `c8b6065`に継承された3D AI Office、8名canonical parity、2D/canvas URL同期、profile全体画像、NAV 67導線 | CI `29190155634`、artifact `8259308684`、21 PNG独立目視、Human Preview badge lineage/画面OK | Bell/user control clipは解消したがmobile ThemeToggle消失P2。main・Production未確認 |
| `USR-004` | `PARTIAL_LOCAL` | PR #6 `188c442`のOutcome Ledger、証拠5区分、実行/生成件数、baselineなしを`計測なし`とするUI、CI #216 | 人間baseline・成果金額・自己申告入力なし。承認待ち二重計上と異単位合算helperを修正要 |
| `USR-005` | `PARTIAL_LOCAL` | 生成器がGitHub正本とObsidian鏡像を同時生成し、統合プロンプトが毎タスクの同期確認を要求 | 今後の実タスクでの継続運用証拠 |
| `USR-006` | `DOCS_DEFINED` | 統合プロンプトと統合ロードマップ | 実タスクでの継続遵守証拠 |
| `USR-007` | `EVIDENCE_GAP` | PR #14 `ba01244`で既報Grammar P1を独立1,687件＋旧thread 25件の4経路marker 0まで確認。Phase 4途中headにloopback Redis itest候補あり | 実Redis実行ログ、production worker retry、停止後再起動、第三者診断、未知入力、main/Preview/Productionは未確認。「脆弱性0」は断定しない |
| `USR-008` | `DOCS_DEFINED` | 統合プロンプトの世界一Evidence Gate | 市場指標・比較対象・第三者データ |
| `USR-009` | `VERIFIED_REPOSITORY` | raw SHA固定、7,485 Stable IDs、GitHub台帳、57件のObsidian鏡像、再現可能な生成器、Claude feature統合 `63baa54` | main未統合。Evidence継続更新と各Streamへの伝播が必要 |

## UNMAPPED_CANDIDATE（正式Function IDではない）

| 候補 | 状態 | 証拠 | 境界 |
|---|---|---|---|
| PR #9のキャラクター固有要素（かな・コードネーム・二つ名・業務のクセ・よくあるミス・静的評価文） | `UNMAPPED_CANDIDATE` | `packages/shared/src/ai-characters.ts`、`apps/web/components/ai-office/portrait.tsx` | `C04-003 Agent Profile`の限定証拠には含めるが、`C30-056 今月の評価`の実績証拠へ格上げしない |
| PR #18のC21 `content_review`承認ブリッジ | `UNMAPPED_CANDIDATE` | `c8b6065`、内部ApprovalRequest、実PostgreSQL 12件、CI `29190155634` | 独立監査はEvidence Gap 3件とmobile P2でrelease HOLD。C21台帳に承認workflow固有IDがなく、C21カテゴリ完成・公開実行へ格上げしない |
| C19 schema案A 承認ブリッジ | `UNMAPPED_CANDIDATE` | PR #22 `21ccfafe`、CI `29192290614` unit 477/E2E 154、ephemeral PostgreSQL、artifact `8259933170`、Codex review `4680088936` / comment `4951281950` | tenant CAS/transactionと外部作用封印は確認。生成＋監査の非原子/非冪等、C19画面artifact、Vercel Preview DB境界が未解消。本番migration、外部広告変更、予算変更、実LLMは未承認。正式IDを創作しない |
| Phase 4 `ai_run_resume` bridge / BullMQ実queue候補 | `UNMAPPED_CANDIDATE` | 途中head `ddfcffe`、純粋unit 12/12、itestコードread-only確認 | 固定PR/CI/実Redis証拠なし。実行制御の正式IDを創作せず、C30-041の限定Draft証拠だけに接続する |

## 更新ルール

証拠を追加する場合は、Function ID、状態、確認範囲、証拠、未確認範囲を必ずセットで記録します。
証拠が失効・回帰した場合は行を消さず、追記で状態を下げ、原因と日付を残します。

完全機能台帳の生成同期確認:

~~~bash
node scripts/generate-complete-function-ledger.mjs \
  --source /absolute/path/to/pasted-text.txt \
  --check
~~~
