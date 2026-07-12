# 369 OS V70 Codex 独立再監査

- 日付: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- Phase 3固定head: PR #14 `ba01244ae2fb6b75e1ae2b9a718ba4e629a54425`
- Phase 3.5 V70固定head: PR #18 `c8b60651d058b867ba7ad5e07662d75a7f4f1947`
- Phase 3.5 C19固定head: PR #22 `21ccfafe07f3bbfdc2c74a9934ee04c672a3cec6`
- Phase 4先行監査head: `ddfcffefc9e458a002636551e1e42bb5a898c374`
- 判定: `CHANGES_REQUIRED / RELEASE HOLD`
- Matrix V3: 未作成
- RC / vault main / app main / Production: HOLD

## 1. 非エンジニア向け結論

V70でC21の実PostgreSQLテストと、モバイル幅4種類の新しい画面証拠は追加された。Bell、利用者アイコン、ログアウト、build badgeの見切れは解消され、実DBの並行処理も前進した。

しかし、狭い画面でテーマ切替そのものが消えた。実DBテストにも、rollback対象1テーブル、監査の取得範囲、並列テストのtenant分離という3つの証明不足が残る。従ってCI greenだけでRelease PASSにはせず、PR #18はDraft/HOLDを維持する。

C19は別Draft PR #22で、社内review-only承認ブリッジ、加法的migration、実PostgreSQLテストまで前進した。承認ブリッジ本体のtenant CASとtransactionは成立している。一方、改善案生成と必須監査が非原子・非冪等で、Vercel Previewがmigrationをskipしたか隔離DBへ適用したかも未証明である。C19も`CHANGES_REQUIRED / HOLD`とした。

Phase 4には別branchの実装候補が現れたが、固定完了マーカー、専用PR、exact-head CI、実Redis実行証拠がまだない。Phase 3.5の判定とは分離し、途中headへPASSを付けていない。

## 2. Human Preview整合

人間が確認した旧固定headの証拠は有効なまま維持する。

- PR #14 `ba01244...`: build badgeと主要画面を確認済み。
- PR #18旧head `dd54ce94...`: full SHA、branch、Ready、C21承認フロー、外部作用0を確認済み。
- mobile Bell、利用者操作の欠落なしを人間が追加確認済み。
- これはPreviewでありProduction確認ではない。

V70新head `c8b6065...`は、監査中に人間がVercel Previewのbuild badge `c8b6065`先頭一致と画面OKを確認した。従ってlineageと限定画面はHuman Preview確認済みである。ただし、テーマ切替の実操作確認やProduction確認ではない。

同じ人間Gateで、C19 schema案A（`MarketingSuggestion.approvalStatus`追加）が、別branchでのschema差分、migration作成、bridge実装、使い捨て/CI DB検証、Draft PRまで承認された。本番DBへのmigration適用は別承認のまま。comment `4951063085`に記録され、PR #22 fixed head `21ccfafe...`とCIを受領した。ただしC19 PreviewはVercel Authenticationで遮断され、build logからDB分離または`SKIP_DB_SETUP=1`を確認できていない。

## 3. Phase 3.5 C21 実DB監査

exact-head CI run `29190155634`のjob log本文で、`content_review_db_evidence.spec.ts` 12件が実PostgreSQL上で実行され、全件greenであることを確認した。

前進を確認できた範囲:

1. 同一assetの並行2申請は1件へ収束。
2. ApprovalRequest作成失敗はassetと申請をrollback。
3. 並行approve/rejectは一方だけ決定。
4. 二重approve/rejectは冪等。
5. 対象消失時は決定をrollback。
6. cross-tenant実在assetは非開示。
7. AI主体はcore先頭で拒否し、既存mock契約ではDB call 0。
8. 人間の承認・却下・再申請が実DBで成立。
9. 既存outreachのPENDINGへ非干渉。
10. 本文sentinelは現在取得する承認・監査行へ複製されない。
11. 承認bridgeに外部provider importはない。

未解消:

- DataAccessLog失敗ケースは、その直前に作られるAuditLogがrollbackしたことを再取得していない。
- metadata-onlyテストは本文sentinelだけで、decision AuditLogとtitle sentinelを検査していない。asset titleはApprovalRequest titleと監査summaryへ複製されるため、「PII/secretがどこにもない」というテスト名は証拠範囲を超える。
- 外部作用0の`OutreachSendLog`件数は全tenant集計で、2 worker並列時に別specの影響を受け得る。

元P2 thread `r3565885993`には固定SHA付きでHOLD理由を返信した。Release判定は`CODEX_CHANGE_REQUEST_V70` comment `4951029653`。

## 3.1 Phase 3.5 C19 固定head監査

PR #22 fixed head `21ccfafe07f3bbfdc2c74a9934ee04c672a3cec6`を独立監査した。

確認できた範囲:

1. migrationは`MarketingSuggestion.approvalStatus`列とtenant/status indexだけを追加する加法的SQL。
2. 申請はtenant付きCASからApprovalRequest、AuditLog、DataAccessLogまで単一transaction。
3. 決定はPENDING ApprovalRequest CASとsuggestion更新`count === 1`、AuditLogを単一transaction。
4. cross-tenant実在レコードは状態を変えず、AI主体はaction/core双方で拒否。
5. bridgeは広告変更、予算変更、出稿、外部送信、実LLM、課金を呼ばない。
6. exact-head CI run `29192290614`はunit 477件、E2E 154件、failed 0。ephemeral PostgreSQLへ新migrationを適用し、Fake LLM、external send falseで実行。
7. artifact ID `8259933170`、21 PNG、ZIP SHA-256 `b9f8fd1492a5697c5101f6649eec6d818183a747ef725e024ddc364d352005eb`は一致。

未解消:

- `generateAdsImprovementDraftAction`はMarketingSuggestion作成と必須監査が別処理で、監査失敗時の孤児suggestionと再試行重複を防げない。
- rollbackテストはAuditLog/DataAccessLogの0件再取得と実retryをassertせず、decision Audit失敗注入もない。
- metadata検査はdecision Auditを取得せず、title sentinelを検査しない。
- 外部作用0はOutreachSendLogだけで、MarketingCampaignのbudget/spent/metrics before/afterを比較しない。
- UI E2E cleanupはseed tenantのAuditLog/DataAccessLogを除去しない。
- 21枚のartifactにC19の広告画面、承認一覧、approve/reject後画面が含まれない。
- Vercel successは固定SHAへ付いているが、Preview buildで`SKIP_DB_SETUP=1`だったか、Productionと分離したDBだったかを確認できない。`apps/web prebuild`は条件次第で`prisma migrate deploy`とseedを実行するため、人間のbuild log確認までHIGH/HOLD。

固定SHA付きreview `4680088936`と`CODEX_C19_REVIEW_RESULT_V70` comment `4951281950`へ記録した。C19のEvidenceは`DRAFT_IMPLEMENTED / CI_VERIFIED / CHANGES_REQUIRED`であり、Preview、本番migration、RC、main、Productionへ格上げしない。

## 4. CIとartifact

- workflow run: `29190155634`。
- checkout: `c8b60651d058b867ba7ad5e07662d75a7f4f1947`。
- unit: 38 files / 472 passed / 0 failed。
- E2E: 145 passed / 0 failed。
- typecheck、lint、build、Company Brain safety: success。
- sealed env: Fake LLM、log mail、external send false。
- artifact ID: `8259308684`。
- files: 21 PNG。
- ZIP SHA-256: `51dcfa95e71713b5da4a93ac9def0c6ee82b47ae32e69430f96340cafc7efc48`。

全画像を取得して目視した。AI社員一覧、詳細、3D canvas、profile、NAV、desktop/mobile topbarに空画面や新しい重大な重なりは見つからなかった。NAV full画像はdesktop 256x3214、mobile 288x3182で、従来の63pxだけのartifact問題は再現しない。

320/360/390/430pxではBell、avatar、logout、build badgeは画面内に収まる。一方、`ThemeToggle`は`hidden sm:block`となり、mobile NAVにも代替操作がない。これは見切れ解消ではなく別機能の消失で、release-blocking P2とした。

## 5. Phase 4先行監査

branch `claude/p4-human-gate-resume-v1`の途中head `ddfcffe...`をread-only監査した。純粋unit `ai_gate_bridge`と`approval`はCodex環境で12 / 12 greenだった。DB、Redis、migration、seedには接触していない。

実装候補として確認したもの:

- AIApprovalGateのPENDING限定CAS。
- runのtenant/status条件付き遷移。
- ApprovalRequest、AuditLog、DataAccessLogを同一transactionで作る構造。
- action/core双方のAI主体拒否。
- input/output/errorを取得しない最小select。
- BullMQ実Queue向けのloopback Redis専用itestコード。

固定前のP2 / Evidence Gap:

- AIへ誤って承認権限が付くと、actionは拒否するが、一覧はDB取得後にgate reasonと判断フォームを表示する。
- stale NEEDS_APPROVAL runの時間・freshness判定がない。
- approveは実handlerを呼ばずにrunをSUCCEEDEDへ変え、「内部処理で完了」というActionを作るため、承認・再開待ち・実行済みのEvidence区分が混同される。
- downstream失敗注入後のgate/run/action/approval/audit/access全表rollback証拠がない。
- Inbox、詳細、3Dの状態一致、reject、二重submit、AI誤権限のUI E2Eがない。
- BullMQ itestは専用Workerとin-memory LifecycleDbであり、production worker registryの証拠ではない。
- worker restart試験はworker不在からの初回起動で、停止後の再起動やstalled recoveryではない。
- 実Redisの固定ログ、cleanup結果、exact-head CIは未受領。

先行指摘はPR #18 comment `4951050657`へ投稿した。Phase 4の最終マーカーは固定head受領後だけ付ける。

## 6. Phase現在地

| Phase | 実装 | 自動検証 | 独立監査 | Preview | main | Production |
|---|---|---|---|---|---|---|
| Phase 3 Growth Engine v0 | Draft実装あり | `CI_VERIFIED` | V69固定範囲を監査済み | 旧固定SHAで人間確認済み | HOLD | HOLD |
| Phase 3.5 C19 | read-only分析、AI下書き、review-only承認bridgeをPR #22へ実装 | unit 477 / E2E 154 / ephemeral PG green | `CHANGES_REQUIRED` | C19画面未確認、Vercel DB境界未証明 | HOLD | migration・外部広告操作HOLD |
| Phase 3.5 C21 | internal review bridgeあり | V70実PG 12件green | `CHANGES_REQUIRED` | 新head `c8b6065` lineage/画面を人間確認 | HOLD | HOLD |
| Phase 3.5 C22 | 未実装 | なし | `ROADMAP_ONLY` | なし | HOLD | HOLD |
| Phase 4 可視化 | AI社員8名、3D、状態表示 | CI / artifactあり | 主要parity監査済み | 新head `c8b6065` lineage/画面を人間確認 | HOLD | HOLD |
| Phase 4 実行制御 | 途中branchにbridge候補 | unit 12 green、固定CIなし | 先行監査のみ | 未確認 | HOLD | HOLD |

Salesforce、MoneyForward、freee、HR/労務、電子帳簿は段階実装対象から削除していない。現時点で完成・競合同等とは判定しない。

## 7. 永続化とGate

- Codex編集範囲外のコード変更: 0。
- `CODEX_CHANGE_REQUEST_V70`: `4951029653`。
- P2 thread更新: reply `3566237945`、未解決維持。
- `CODEX_P4_PREAUDIT_V70`: `4951050657`。
- PR #22固定review: `4680088936`。
- `CODEX_C19_REVIEW_RESULT_V70`: `4951281950`。
- Matrix V3: Release PASS条件を満たさないため未作成。
- RC: 未作成。
- vault main: 未統合。
- app main / Production: 非接触。
- `CREDENTIAL_ROTATION_REQUIRED`: 人間の失効確認まで維持。

Obsidian semantic scanはin-repo鏡像203 Markdown、wikilink 1,036 occurrenceを検査した。1,032件は解決し、完全機能台帳indexの明白な誤リンク1件を`00_完全機能台帳インデックス`へ修復した。残る4件はREADME/indexの記法例2件と、正本ノート不在で参照先を一意に決められない`残存欠陥クローズと統合v59`の2参照である。V70新規2ノートはindexから解決し、新規orphanは0。曖昧な2参照は変更せず、全体broken link 0とは宣言しない。

次のClaude固定headで、ThemeToggle復旧、C21実DB証拠3点、C19生成原子性・証拠画像・Vercel DB境界、Phase 4の独立P2/Evidence Gapを再監査する。「脆弱性ゼロ」「完全無欠」「完全同期」「Production verified」は宣言しない。
