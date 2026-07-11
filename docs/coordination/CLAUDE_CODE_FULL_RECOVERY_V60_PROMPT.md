# 369 OS v6.0 Vercel配信系譜・4機能完全復旧・AI社員統合オートパイロット

あなたは369 OSの主実装者・統合責任者です。Codexは独立QA・完全機能台帳・証拠監査担当です。

利用者がVercel上で確認している369 OSから、実装済みの4機能が表示されず、AI社員画面と3Dバーチャルオフィスも連動していません。単なる説明や一時回避ではなく、原因の固定、未解消欠陥の修正、統合Preview、Codex再監査、人間GO後のmain／Production反映、Production再確認までを一つの復旧作業として扱ってください。

このプロンプトを、read-only Scout、専用clean worktree／branch作成、必要な`apps/**`・`packages/**`の修正、テスト追加、ローカル検証、commit、push、Draft PR作成・更新、Vercel Preview確認、GitHubコメント、ロードマップ／進捗／Obsidian同期に対する人間の明示承認として扱ってください。

ただし、**main merge、Production promotion、本番DB、migrate、seed、reset、Secrets、実LLM、外部送信、課金はまだ承認されていません**。安全な作業は途中確認を求めず連続実行し、main／Productionの直前に証拠をまとめて一度だけGO／NO-GOを求めてください。

## 1. 利用者が確認した現在の事象

利用者が2026-07-11 23:46に、同一Vercel画面のサイドバーを上端から最下部まで5枚に分けて撮影しました。

- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.18.png`
- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.25.png`
- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.33.png`
- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.38.png`
- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.43.png`

5枚ではスクロールバーが上から下まで移動し、12グループすべてと最終項目`Operations実行`まで確認できます。それでも次の4導線が存在しません。

| 欠落機能 | 正式href | 本来の統合元 |
| --- | --- | --- |
| Growthコントロールタワー | `/growth/control-tower` | feature / Phase 3 |
| 広告・チャネル分析 | `/marketing/ads` | Stream A |
| SEO・コンテンツ | `/marketing/content` | Stream A |
| 3Dバーチャルオフィス | `/ai-office` | Stream B/D |

さらに、3Dバーチャルオフィス側ではAI社員の人物・プロフィールが表示されますが、メニューの`AI社員`から入る`/ai-agents`と`/ai-agents/[id]`では人物、キャラクター、プロフィールが一致せず、相互遷移もありません。

## 2. Codexが再検証した確定事実

### 2.1 Git／NAV／ページ数

- main: `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`
  - `page.tsx`: 123件
  - NAV項目: 63件
- 現在のfeature: `24782cc933d0af4f532f3d897790cddc0b36c04b`
  - NAV項目: 64件
- PR #12 integration: `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`
  - `page.tsx`: 127件
  - NAV項目: 67件

スクリーンショットに写る63導線はmainのNAVと完全一致します。mainからintegrationへは、上記4ページと4導線が追加され、削除は0です。

したがって、事象の主因は「統合SHAから機能が削除された」ことではなく、**利用者が見ているVercel環境が、少なくともNAVについてmain／旧系譜の内容を配信し、Draftの統合版が反映されていないこと**です。

スクリーンショットにはURLとdeployment metadataがないため、Production URLを見ているのか、古いPreview aliasを見ているのかは未確定です。必ずVercelのdeployment ID、environment、source branch、source commit SHAをread-onlyで確認し、推測で決めないでください。

### 2.2 件数の訂正

Codex初版監査は`href:`の単純検索で型定義`href: string`まで1件と数え、feature 65／integration 68と誤集計しました。正しいNAV項目数はfeature 64／integration 67です。PR #13の訂正版を正として扱ってください。

### 2.3 統合版の既存証拠

- PR #12: https://github.com/DREEXY-git/369/pull/12
- integration head: `7ef2d9f`
- CI run: `29155325693`
- unit: 355 passed / 0 failed
- E2E: 110 passed / 0 failed
- screenshot artifact: `8249340438`
- Vercel PreviewはReady記録あり。ただしCodexのin-app browserではVercel Authenticationで停止し、ログイン後直接操作は未確認。

### 2.4 Codex訂正監査

- PR #13: https://github.com/DREEXY-git/369/pull/13
- branch: `codex/multi-feature-regression-audit-v1`
- 訂正後head: `85a38d32872a494b5f89857944fa03553e7527ac`
- 正本: `docs/coordination/CODEX_MULTI_FEATURE_REGRESSION_AUDIT_2026-07-11.md`
- 状態: `HOLD: DEPLOYMENT_LINEAGE_AND_FULL_RECOVERY`

## 3. Codexが実施した具体的作業

Claude Codeは次の作業を重複せず引き継いでください。

1. dirtyな既存worktreeを避け、`/private/tmp/369-codex-link-audit`のclean worktreeを使用。
2. PR #12を固定SHA`7ef2d9f`でread-only監査。
3. main、feature、Stream A/B/C/D、integration間の`apps/web/**`・`packages/shared/**`削除を比較し、対象削除0を確認。
4. main 123ページ、integration 127ページを確認。
5. NAVを`^\s+\{ label:`で再集計し、main 63、feature 64、integration 67を確定。
6. main→integrationの追加4ページと4導線を固定。
7. CI run`29155325693`のunit 355／E2E 110をログ証拠として確認。
8. artifact`8249340438`を取得し、desktop、mobile、desktop profile、mobile profileの4画像を目視。
9. integration Previewへブラウザ接続を試みたが、Vercel Authenticationで停止したため証拠不足として記録。
10. `/ai-office`は`getAiCharacter(key)`と専用portraitを使い、`/ai-agents`は汎用ロボット、`/ai-agents/[id]`は完全プロフィールなしであることをコードから再現。
11. PR #12へAI社員統一要求をコメント`4946781894`として通知。
12. PR #12へ多機能復旧要求をコメント`4946868384`として通知。
13. 自動通知Hookが検知できるopenな`codex/**` Draft PR #13を作成。
14. ローカルHTTPS pushは403だったため、GitHub connectorでbranch、commit、Draft PRを作成し、GitHub永続化を完了。
15. 利用者の追加スクリーンショット5枚を目視し、初版の件数と「スクロールが主原因」という判定を訂正。

## 4. 未解消のためmain統合前に必ず閉じる項目

PR #12のintegrationをそのままmainへ入れてはいけません。少なくとも次を閉じてください。

### P1-1: stale run競合判定

post-create rival checkが古い実行まで競合候補に含め、正しいrunを誤って収束・抑止しないか確認し、再現テスト付きで修正してください。

### P1-2: escaped quote秘密値

JSON形式の`password`、`authorization`、`cookie`等で値中にescaped quoteがある場合も、秘密値の後半を残さず完全マスクしてください。

### P1-3: 改行Cookie header

`Cookie:\nsession=SUPERSECRET`のように改行直後へインデントなしで値が続く形式でも、任意cookie名を含めて秘密値が保存ログへ残らないようにしてください。

### P2-1: Marketing NAV gate

`/marketing`、`/marketing/ads`、`/marketing/content`をページ側と同じ`marketing:read`へ対応させ、権限のない利用者へ行き止まり導線を出さないでください。

### Evidence Gap: BullMQ

unitのrethrowだけで完全解消とせず、Redis/BullMQ実queue retry・failed telemetryの証拠がなければ`EVIDENCE_GAP`を維持してください。安全なephemeral環境で検証可能なら追加し、本番Redisには触れないでください。

## 5. Phase 0: Read-only Scout

1. `pwd`、`git status`、worktree、remote、branch、HEADを確認。
2. dirtyな既存worktreeは変更せず、Claude専用clean worktreeを使う。
3. PR #3〜#13のopen/closed、Draft、base/head SHA、checks、未解決review、最新commentsを再取得。
4. `git ls-remote`で新しいClaude recovery branchが既に存在しないか確認し、重複branchを作らない。
5. PR #13最新headと訂正版監査を読み、`CLAUDE_ACK`を固定SHA付きで記録。
6. Vercel project `369-web`について、ProductionとPR #12 Previewのdeployment ID、Ready状態、source branch、commit SHA、URL aliasをread-onlyで確認。
7. `.env`やSecrets値は読まない。Vercel設定変更、redeploy、promotionは行わない。
8. `DEPLOYMENT_PROVENANCE`表を作り、次を並べる。
   - 利用者が見ている可能性があるURL
   - Production URL
   - PR #12 Preview URL
   - environment
   - source branch
   - source commit SHA
   - NAV fingerprint 63／67
   - 確定／推定／未確認

スクリーンショットだけでURLを確定できない場合も、他の安全作業は止めないでください。Vercel側の候補を絞り、最終Preview確認時だけ利用者へクリックするURLを1本提示してください。

## 6. Phase 1: Recovery branchと所有権

1. 既存のClaude recovery branchがなければ、`7ef2d9f`から`claude/full-recovery-v60`を作る。
2. PR #12のheadはCodex固定SHAレビュー用に動かさない。
3. Claudeは`apps/**`、`packages/**`、必要なテスト、Claude管理docs/tasksを所有する。
4. CodexはPR #13と独立レビューを所有し、Claude管理コードへ直接pushしない。
5. 各作業開始時にGitHubへ`WORK_CLAIM`を記録し、対象ファイルと依存を明示する。
6. force push、rebaseによる共有履歴改変、mainへの直接pushは禁止。

## 7. Phase 2: P1/P2クローズ

1. §4の各欠陥を最小再現テストで先にred化する。
2. 根本修正を行い、秘密値そのものが結果へ一文字も残らない否定アサーションを置く。
3. stale runは状態、時間、idempotency key、tenant境界を含めて競合条件を明文化する。
4. workerは失敗記録後にマスク済み例外を再throwし、retry/failed telemetryを壊さない。
5. tenantId、RBAC、writeAudit、DataAccessLog、AIの承認／送信／削除禁止を維持する。
6. 修正ごとにunitを実行し、まとめてtypecheck、lint、build、safetyを実行する。

## 8. Phase 3: AI社員と3D Officeの完全統一

1. `AIAgent.key -> getAiCharacter(key)`を全AI社員画面の唯一の人物・外見・静的プロフィール正本にする。
2. DBやseedへプロフィールを複製しない。
3. `/ai-agents`で3D Officeと同じportrait、fullName、kana、codeName、epithet、役割を表示する。
4. `/ai-agents/[id]`でportrait、fullName、kana、codeName、epithet、personality、skills、traits、common mistakes、evaluation noteを表示する。
5. キャラクター設定と、実測・証拠由来の状態／実行回数／成果を明確に分離する。
6. list/detailから`/ai-office?agent=<tenant-scoped-id>`へ「3Dオフィスで見る」を追加する。
7. 3D Officeプロフィールから`/ai-agents/<id>`へ「AI社員詳細で見る」を追加する。
8. queryの対象社員を正しく選択し、invalid/cross-tenant IDは存在を漏らさず安全fallbackする。
9. raw DB statusを3D Officeの証拠由来状態として扱わず、同じ状態算出を使う。
10. unknown keyは決定論的な「設定未作成」fallbackを使い、クラッシュしない。
11. dashboard:readのpre-fetch gate、tenantId、read-only、execute/approve/delete/external-send禁止を維持する。

## 9. Phase 4: 67機能の発見性と配信識別

1. 単一`NAV` manifestを正とし、現行67項目を1件も削除・改名しない。
2. desktop/mobileの全機能ランチャー／検索を追加し、ラベルとグループから全許可機能を検索可能にする。
3. サイドバーグループを折りたたみ可能にし、現在グループを展開、現在項目を表示領域へ移動する。
4. スクロール継続が分かる高コントラストのaffordanceを設け、macOSの不可視overlay scrollbarだけに依存しない。
5. OWNERでは12グループ・67項目をすべて表示・検索・到達可能にする。
6. 非OWNERではRBACを維持し、保護データを漏らさず「現在ロール／権限により一部制限」を明示する。
7. ProductionとPreviewの取り違えを再発させないため、OWNER/ADMINが安全に確認できる環境種別とshort commit SHAのbuild情報を表示または診断画面で確認可能にする。Secrets、token、内部接続先は表示しない。
8. Vercel環境値の利用方法は既存設定と公式仕様を確認し、設定変更が必要なら実装を止めずdocsへ記録し、Production設定変更は人間Gateへ回す。

## 10. Phase 5: 必須テスト

### 静的契約

- NAV期待値67件。
- href重複0、label重複の意図確認。
- 67 hrefすべてに対応するpage実体あり。
- mainとの差分4件を明示固定。
- 代表項目を削除するとテストが確実にredになる。

### E2E

- OWNER desktop 1280 x 720で12グループ・67導線を確認。
- OWNER mobile 390 x 844で最初と最後、欠落4導線へ到達。
- 67の静的NAV hrefをOWNERで巡回し、404、500、Error Boundaryなし、期待見出しあり。
- STAFF等の許可／拒否と制限表示。拒否ページはデータ取得前に遮断。
- `/ai-agents`と`/ai-office`の同一fullName／portrait。
- list→detail→office→detailで同一agentを維持。
- invalid/cross-tenant queryは非漏洩fallback。
- desktop/mobileで横overflow、文字切れ、ヘッダー／プロフィール重なりなし。
- Three.js canvasが非blankで、character、nameplate、選択、cleanup、fallbackが機能する。

### Security

- escaped quote、改行Cookie、Authorization、Bearer、Basic、ApiKey、JWT、sk-/AKIA/ghp_/xox*、URL埋込認証、CRLF/tab/mixed case、1行化、最大長。
- worker rethrow、retry、failed telemetry、二重実行、CAS競合、stale run除外。
- tenantId、RBAC、監査、secret scan。

## 11. Phase 6: Previewと証拠

1. recovery branchをcommit、pushし、PR #12のintegration branchをbaseにDraft PRを作る。
2. exact head SHAを固定してCI完了まで監視する。
3. workflow statusだけでなくjob log本文からunit/E2E件数、typecheck、lint、build、safetyを記録する。
4. Vercel Previewがexact head SHAを配信していることをdeployment metadataで確認する。
5. 次のartifactを保存・目視する。
   - desktop初期NAV
   - desktop全機能ランチャー
   - mobile NAV／ランチャー
   - 欠落4導線
   - 4追加画面
   - AI社員一覧／詳細／3D Office相互遷移
   - 3D canvas pixel check
6. Preview上でNAV 67、page 127、欠落4機能、AI社員統一を確認する。
7. user-facing Preview URLを1本だけ提示し、次の確認手順を添える。
   - Growthコントロールタワーを開く
   - 広告・チャネル分析を開く
   - SEO・コンテンツを開く
   - 3Dバーチャルオフィスを開く
   - AI社員から同一人物の詳細と3D Officeを往復する
   - 画面の環境種別／short SHAが報告値と一致する

## 12. Phase 7: Codex独立再監査

Claude対象PRへ次を含む`@codex CODEX_REVIEW_REQUEST`を投稿してください。

- recovery PR URL
- fixed head SHA
- base SHAと系譜
- 変更ファイル一覧
- 解消したP1/P2一覧
- unit/E2E件数とrun ID
- Preview URLとdeployment ID/source SHA
- artifact ID
- NAV 67／pages 127の契約証拠
- 既知Medium/Low/Evidence Gap

Codexの結果が出るまでmain merge／Production promotionはHOLDです。Codexから変更要求が出た場合は同じrecovery branchで修正し、新しいfixed SHAを再通知してください。

## 13. Phase 8: 1回だけの人間GO Gate

次を1画面で非エンジニア向けに提示してください。

1. 現在Productionが配信しているbranch／SHA。
2. recovery Previewのbranch／SHA。
3. 欠落4機能がPreviewで復旧した画像とURL。
4. AI社員と3D Officeが連動した画像と確認結果。
5. Critical/Highが0であること、または残存項目。
6. CI実測値。
7. mainへ入る差分と影響範囲。
8. rollback先SHAと戻し方。
9. Production反映後に行うsmoke。

その後にだけ、`mainへ統合しProductionへ反映してよいですか（GO / NO-GO）`と一度だけ質問してください。

## 14. Phase 9: 人間GO後のみ実行

1. `git merge-base`、`git merge-tree`、commit ancestryで、PR #3〜#12を個別に重複mergeすべきか、recovery統合headから単一release PRを作るべきかを判定する。
2. 重複コミットや古いStream headを再mergeしない。
3. 最も安全な単一release系譜を作り、main向けPRの最終diffを再確認する。
4. 人間GOの範囲内でのみ非force mergeする。
5. Vercel Production deploymentが承認済みmain SHAをsourceにしてReadyになるまで監視する。
6. ProductionでNAV 67、4追加画面、AI社員往復、主要既存画面、認証、RBAC、監査をsmokeする。
7. Production SHA不一致、CI failure、404/500、4機能欠落、Critical/High再発時は即HOLDし、承認済みrollback手順を提示する。勝手にDB rollbackや設定変更をしない。

## 15. GitHub・ロードマップ・Obsidian同期

各WIP完了時と最終時に、Claude管理正本へ次を同期してください。

- `tasks/CURRENT_STATE.md`
- `tasks/PROGRESS.md`
- 該当roadmap／audit docs
- `369-vault`の進捗・意思決定ノートとindexリンク
- GitHub PR本文／Conversation

記録する状態を分離してください。

- IMPLEMENTED_ON_DRAFT
- TESTED_LOCAL
- CI_GREEN
- PREVIEW_VERIFIED
- CODEX_REVIEWED
- MAIN_MERGED
- PRODUCTION_VERIFIED

Draft実装をmain／Production実装として格上げしないでください。独立vaultへ接続できない場合はin-repo鏡像まで完了し、未同期を明記してください。

## 16. STOP／HOLD条件

次の場合はmain／Productionへ進まず、他の安全な作業を完了してHOLD理由と再開条件を記録してください。

- CriticalまたはHigh未解消。
- exact SHAのCI／Preview証拠なし。
- Vercel deployment source SHA不一致。
- NAV 67契約、4追加画面、AI社員parityのいずれかが不合格。
- unresolved conflict、重複merge、系譜不明。
- Production操作に必要な人間GOなし。
- DB、Secrets、課金、外部送信、実LLM、認証設定変更が必要。

## 17. 最終報告

非エンジニア向け日本語で次を報告してください。

1. 何が起きていたか。
2. 利用者が見ていたVercel deploymentのbranch／SHA。
3. main 63／feature 64／integration 67の意味。
4. 復旧した4機能。
5. AI社員と3D Officeの統一結果。
6. P1/P2修正結果。
7. unit、E2E、typecheck、lint、build、safetyの実測値。
8. Preview／ProductionのURL、deployment ID、source SHA。
9. GitHub PR／commit／Codex review。
10. roadmap／進捗／Obsidian同期結果。
11. 人間が確認した項目と未確認項目。
12. 残存リスクと次の作業。

「脆弱性ゼロ」「完全無欠」「全機能完成」とは断言しないでください。確認した範囲、証拠、未確認点を分けてください。

安全範囲のPhase 0〜7は途中確認を求めず連続実行してください。Scoutだけ、設計だけ、プロンプト提案だけで停止せず、修正、テスト、push、Draft PR、Preview、Codex通知まで進めてください。
