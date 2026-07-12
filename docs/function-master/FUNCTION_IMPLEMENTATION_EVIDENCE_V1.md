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

## 確認済みの限定範囲

| Function ID | 状態 | 確認できた範囲 | 証拠 | 未確認・境界 |
|---|---|---|---|---|
| `C07-041` | `PARTIAL_PRODUCTION_EVIDENCE` | Company Brain 4テーブルを使うナレッジ検索経路 | `tasks/CURRENT_STATE.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | C07の全データ源・全検索方式ではない |
| `C07-043` | `PARTIAL_PRODUCTION_EVIDENCE` | FakeLLMを含むナレッジ質問応答とCompany Brain参照 | `tasks/CURRENT_STATE.md`、`docs/audit/47_phase2a3c2_hold_resolution_go.md` | 実LLM・全質問品質は未確認 |
| `C07-044` | `PARTIAL_PRODUCTION_EVIDENCE` | 「参照した会社の頭脳」と参照元タイトルの表示 | `docs/audit/47_phase2a3c2_hold_resolution_go.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | 全AI出力の根拠表示ではない |
| `C03-056` | `PARTIAL_PRODUCTION_EVIDENCE` | Company Brain参照時の `ai_reference` DataAccessLog | `tasks/CURRENT_STATE.md`、`docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md` | 全AIタスク・全参照元には未接続 |
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
| `C28-017` | `VERIFIED_REPOSITORY` | AI社員の3D/2D read-onlyダッシュボード、初期選択、静的プロフィールパネル | PR #5、PR #9 `9e31bf9`、`/ai-office`、CI #220、artifact `8248710661` | main未統合。3D nameplate非clickable。mobile profile画像はsticky headerで人物ヘッダー上部が欠ける |
| `C28-036` | `PARTIAL_LOCAL` | AI社員状態・run件数に加え、生成・成功・失敗・承認待ちを証拠区分付きで表示 | PR #5、PR #6 `188c442`、CI #216 318 unit / 103 E2E | 承認待ち合計にrun/gate二重計上リスク。成果金額・人間削減時間の実測なし |
| `C30-039` | `VERIFIED_REPOSITORY` | `AIAgentRun`に基づく期間内実行回数と成功・失敗件数の表示 | PR #6 `188c442`、`apps/web/lib/domains/ai-workforce/outcomes.ts`、CI #216 | AI社員別給与明細全体、稼働時間、原価ではない |
| `C30-041` | `BLOCKED` | `ApprovalRequest`と`AIApprovalGate(PENDING)`のread-only取得・一覧表示経路 | PR #5 `4954e9b`、PR #6 `188c442`、`/approvals` / `outcomes.ts` | 同一run/gateを二重計上し得る。`AIApprovalGate`を人間が決定してrunを再開するbridgeがない |
| `C30-046` | `PARTIAL_LOCAL` | baselineなしでは削減時間を`unavailable`とし、推定値を表示しない規律とUI | PR #6 `188c442`、`outcome-evidence.ts`、`/ai-office?tab=outcomes`、CI #216 | baseline収集・削減時間算出・継続計測は未実装。異unit合算helperは未修正 |
| `C30-052` | `VERIFIED_REPOSITORY` | 直近`AIAgentRun=FAILED`の件数と対象AI社員をread-only表示し、worker例外をFAILED記録後に再throw | PR #5 `4954e9b`、PR #6 `188c442`、worker unit、CI #214/#216 | BullMQ実queueのretry/failed telemetry統合証拠なし。エラーマスクにJSON Authorization/Cookie・folded Cookie漏れが残る |
| `C46-002` | `VERIFIED_REPOSITORY` | 既存ロードマップ群と案B+並行ロードマップ | `docs/roadmap/`、`docs/roadmap/69_bplus_parallel_roadmap_canonicalization_candidate.md` | 正式承認・全実装完了を意味しない |
| `C46-003` | `VERIFIED_REPOSITORY` | 現在地の1枚サマリー | `tasks/CURRENT_STATE.md` | git現在値はgit refsを正とする |
| `C46-004` | `VERIFIED_REPOSITORY` | 履歴・判断記録 | `tasks/PROGRESS.md` | 現在地の正本ではない |
| `C46-018` | `VERIFIED_REPOSITORY` | GitHub向け完全機能台帳と実装証拠台帳 | `docs/function-master/`、`SOURCE_MANIFEST_V1.json` | main統合前。原典更新時はv2差分Gateが必要 |
| `C46-019` | `VERIFIED_REPOSITORY` | Obsidianで読める57ファイルの生成鏡像 | `369-vault/知識/完全機能台帳/`、生成器`--check`、独立vault main `0812634` | 総出力60件はGitHub正本3件＋鏡像57件。mainの誤ったindexリンクは独立vault PR #2で修正待ち |
| `C46-020` | `VERIFIED_REPOSITORY` | `369-vault`の索引と知識ノート構造 | `369-vault/index.md`、`369-vault/知識/` | 独立private repo化は未確認 |
| `C46-032` | `VERIFIED_REPOSITORY` | Stage 3 E2E greenを複数branchで継続確認 | CI #164 93/0、#182、#188 99/0、#190 100/0 | 各Draft PRのmain統合後に再実行が必要 |
| `C46-033` | `VERIFIED_REPOSITORY` | unit・lint・typecheck・build・E2Eの自動検証資産 | `.github/workflows/ci.yml`、`apps/web/tests/e2e/`、CI #190 | 本番利用者確認とは別 |
| `C49` | `SOURCE_DETAIL_MISSING` | カテゴリ索引の存在だけ確認 | `docs/function-master/SOURCE_MANIFEST_V1.json` | Appendix A詳細節なし。機能完成判定不能 |

## ユーザー追加要件

| Function ID | 状態 | 証拠 | 次の不足 |
|---|---|---|---|
| `USR-001` | `DOCS_DEFINED` | `369-vault/プロンプト/369 Claude Code完全統合マスタープロンプト v4.0.md` | 実運用での継続検証 |
| `USR-002` | `DOCS_DEFINED` | `docs/roadmap/40_369_master_execution_roadmap_candidate.md` | 各実装証拠の継続更新 |
| `USR-003` | `VERIFIED_REPOSITORY` | PR #9 `9e31bf9`の3D AI Office、8名の人物設定、初期選択、CI #220、artifact `8248710661` | main未統合。nameplate非clickable、mobile profile画像上部欠け、Vercel Previewは本番証拠ではない |
| `USR-004` | `PARTIAL_LOCAL` | PR #6 `188c442`のOutcome Ledger、証拠5区分、実行/生成件数、baselineなしを`計測なし`とするUI、CI #216 | 人間baseline・成果金額・自己申告入力なし。承認待ち二重計上と異単位合算helperを修正要 |
| `USR-005` | `PARTIAL_LOCAL` | 生成器がGitHub正本とObsidian鏡像を同時生成し、統合プロンプトが毎タスクの同期確認を要求 | 今後の実タスクでの継続運用証拠 |
| `USR-006` | `DOCS_DEFINED` | 統合プロンプトと統合ロードマップ | 実タスクでの継続遵守証拠 |
| `USR-007` | `BLOCKED` | 既知Critical 0を固定SHAレビューで確認。High-2の安全なrethrowはコード＋unitで修正候補 | PR #5 `4954e9b`でJSON Authorization/Cookie・folded Cookieの秘密値残存を独立再現。BullMQ実queue retryは証拠不足。脆弱性0を断定しない |
| `USR-008` | `DOCS_DEFINED` | 統合プロンプトの世界一Evidence Gate | 市場指標・比較対象・第三者データ |
| `USR-009` | `VERIFIED_REPOSITORY` | raw SHA固定、7,485 Stable IDs、GitHub台帳、57件のObsidian鏡像、再現可能な生成器、Claude feature統合 `63baa54` | main未統合。Evidence継続更新と各Streamへの伝播が必要 |

## UNMAPPED_CANDIDATE（正式Function IDではない）

| 候補 | 状態 | 証拠 | 境界 |
|---|---|---|---|
| PR #9のキャラクター固有要素（かな・コードネーム・二つ名・業務のクセ・よくあるミス・静的評価文） | `UNMAPPED_CANDIDATE` | `packages/shared/src/ai-characters.ts`、`apps/web/components/ai-office/portrait.tsx` | `C04-003 Agent Profile`の限定証拠には含めるが、`C30-056 今月の評価`の実績証拠へ格上げしない |

## 更新ルール

証拠を追加する場合は、Function ID、状態、確認範囲、証拠、未確認範囲を必ずセットで記録します。
証拠が失効・回帰した場合は行を消さず、追記で状態を下げ、原因と日付を残します。

完全機能台帳の生成同期確認:

~~~bash
node scripts/generate-complete-function-ledger.mjs \
  --source /absolute/path/to/pasted-text.txt \
  --check
~~~
