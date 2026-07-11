# 369 OS v6.1 完全復旧・AI社員開発環境・競合製品機能台帳・全体ロードマップ統合オートパイロット

あなたは369 OS / IKEZAKI OSの主実装者・統合責任者です。Codexは独立QA、完全機能台帳、証拠監査、Claudeとの重複防止担当です。

この指令は、次の2つを矛盾なく統合した唯一の実行プロンプトです。

1. Codexが作成したv6.0「Vercel配信系譜・4機能完全復旧・AI社員統合」
2. Claude Code v5.9の実行報告、全体ロードマップ説明、AI社員開発環境、Salesforce／マネーフォワード相当機能のPhase説明

過去のプロンプトや報告を単純連結してはいけません。Git、GitHub、CI、Vercel、正本ドキュメントの実態を優先し、古いSHA、後続レビューと矛盾する完了宣言、Phase番号の混同を訂正しながら進めてください。

このプロンプトを、read-only Scout、専用clean worktree／branch、必要な`apps/**`・`packages/**`の修正、テスト追加、ローカル検証、commit、push、Draft PR、Vercel Preview確認、GitHubコメント、ロードマップ／進捗／Obsidian同期に対する人間の明示承認として扱ってください。

ただし、**main merge、Production promotion、本番DB、migrate、seed、reset、Secrets、実LLM、実外部送信、実課金、実送金は未承認**です。安全な作業は途中確認を求めず連続実行し、main／Production直前に証拠を1画面へまとめ、一度だけGO／NO-GOを求めてください。

## 1. 最優先ミッション

次の順序を変えないでください。

1. 利用者が見ているVercel環境の配信系譜を確定する。
2. 欠落4機能、AI社員画面の不一致、PR #12未解消P1/P2を修復する。
3. exact SHAのCI、Preview、画像、Codex独立再監査を揃える。
4. 人間GO後のみmain／Productionへ反映し、Productionで復旧を確認する。
5. 復旧と並行して、Phaseの混同をなくした全体ロードマップを正本化する。
6. AI社員開発環境、Salesforce相当、マネーフォワード／freee相当を完全機能台帳へ接続し、次の薄い縦切りを決める。

ロードマップ作成だけで実装修復を止めず、実装修復だけでロードマップ正本化を省略しないでください。

## 2. 利用者が確認した現象

利用者は2026-07-11 23:46に、同一Vercel画面のサイドバーを上端から最下部まで5枚に分けて撮影しました。

- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.18.png`
- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.25.png`
- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.33.png`
- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.38.png`
- `/Users/konishimasayuki/Desktop/スクリーンショット 2026-07-11 23.46.43.png`

5枚では12グループと最終項目`Operations実行`まで確認できます。それでも次の4導線がありません。

| 欠落機能 | href | 統合元 |
| --- | --- | --- |
| Growthコントロールタワー | `/growth/control-tower` | feature / Phase 3 Growth |
| 広告・チャネル分析 | `/marketing/ads` | Stream A |
| SEO・コンテンツ | `/marketing/content` | Stream A |
| 3Dバーチャルオフィス | `/ai-office` | Stream B/D |

さらに、3DバーチャルオフィスではAI社員プロフィールを確認できる一方、`/ai-agents`と`/ai-agents/[id]`では人物、portrait、プロフィール、状態が一致せず、相互遷移もありません。

## 3. Codexが固定した現在地

### 3.1 Git／NAV／ページ数

- main `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`
  - `page.tsx`: 123
  - NAV項目: 63
- feature `24782cc933d0af4f532f3d897790cddc0b36c04b`
  - NAV項目: 64
- PR #12 integration `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`
  - `page.tsx`: 127
  - NAV項目: 67

スクリーンショットの63導線はmainと完全一致します。main→integrationで上記4ページ・4導線が追加され、対応ページ削除は0です。

主因は、少なくともNAVについて利用者のVercel画面がmain／旧系譜を配信し、Draft integrationが反映されていないことです。URLとdeployment metadataは画像にないため、Productionか古いPreview aliasかはVercel実態で確定してください。

### 3.2 GitHub

- PR #12: https://github.com/DREEXY-git/369/pull/12
  - Draft / open
  - head `7ef2d9f`
  - CI run `29155325693`
  - unit 355 passed / 0 failed
  - E2E 110 passed / 0 failed
  - artifact `8249340438`
- PR #13: https://github.com/DREEXY-git/369/pull/13
  - Draft / open
  - v6.0基準head `0b6f26d99ced8a8ef6db8f50b2efb76fd0e841dc`
  - 本v6.1追加後はPR #13の最新remote headをScoutで正とする
  - 訂正監査とv6.0復旧プロンプトを保持
- 2026-07-12 Scout時点で新しいClaude recovery branchと`CLAUDE_ACK`は未確認。

### 3.3 件数訂正

Codex初版は型定義`href: string`を1件として数え、feature 65／integration 68と誤集計しました。正値はfeature 64／integration 67です。PR #13訂正版を正としてください。

## 4. Claude v5.9返答の取り扱い

添付されたClaude返答:

`/Users/konishimasayuki/.codex/attachments/4ac57af4-41e0-45e9-8a55-20c59b25ef11/pasted-text.txt`

返答には有用な実績と、後続レビューにより再検証が必要になった主張が混在します。次の分類で扱ってください。

### 4.1 証拠付きで保持する実績候補

- Stream B/C/Dでmask、成果二重計上、異unit合算、3D nameplate、mobile artifactを修正したcommit／CI候補。
- PR #12へA→B→C→Dを統合し、unit 355／E2E 110がgreenになった証拠。
- PR #11をfeatureへ統合した`24782cc`とCI候補。
- CURRENT_STATE、PROGRESS、roadmap69、in-repo `369-vault`を更新した記録。
- main、本番、実DB、Secrets、実LLM、外部送信、課金に触れなかった記録。

各項目は現在のGitHub SHA、job log、差分で再確認してから`VERIFIED`にしてください。

### 4.2 完了宣言を撤回し再検証する項目

Claude返答の「High-1完全修復」「残存欠陥をすべて修復」「完了Gate充足」は、その後のCodex reviewが次を再現したため、そのまま採用しません。

- stale runを競合判定へ含める問題
- escaped quoteを含む秘密値のマスク漏れ
- 改行直後へ値が続くCookie headerのマスク漏れ
- Marketing／Ads／SEOのNAV permission map不足
- BullMQ実queue retry／failed telemetryのEvidence Gap

固定SHAで否定テストとCI証拠を確認するまで、`REOPENED_BY_CODEX_REVIEW`としてください。

### 4.3 Phase番号の矛盾

Claude返答内で`Phase 3`が「AI Growth Engine」と「Quote-to-Cash／会計入口」の両方を指しています。単一のPhase番号で異なるロードマップを混在させないでください。

今後の全ドキュメントと報告は、少なくとも次の4軸を併記してください。

| 軸 | 用途 |
| --- | --- |
| Repository lineage Phase | 実装ブランチ／PRの系譜 |
| Business Phase 0-20 | 事業能力ロードマップ |
| Strategy/PDF Phase | 長期構想・資料上の段階 |
| R Stage | Readiness／Release段階 |

さらに、各workstreamへ固有名を付けてください。例: `P3-GROWTH`、`P3-Q2C`、`P35-CHANNELS`、`P4-WORKFORCE`。以後「Phase 3」だけで報告しないでください。

## 5. Codexが実施した具体的作業

Claudeは次を再実行せず、証拠として利用してください。

1. dirtyな既存worktreeを避け、`/private/tmp/369-codex-link-audit`のclean worktreeを使用。
2. PR #12を`7ef2d9f`へ固定してread-only監査。
3. main、feature、Stream A/B/C/D、integration間の対象削除を比較し、削除0を確認。
4. main 123ページ／integration 127ページを確認。
5. NAVを厳密再集計し、main 63／feature 64／integration 67を確認。
6. main→integrationの追加4ページ・4導線を固定。
7. CI run `29155325693`のunit 355／E2E 110を確認。
8. artifact `8249340438`を取得し4画像を目視。
9. integration Previewへ接続を試みたがVercel Authenticationで停止したため、直接操作を未確認と記録。
10. `/ai-office`と`/ai-agents`の人物正本不一致をコードで再現。
11. PR #12コメント`4946781894`でAI社員統一を要求。
12. PR #12コメント`4946868384`で多機能復旧を要求。
13. openな`codex/**` Draft PR #13を作成してClaude Hook通知を有効化。
14. ローカルpush 403後、GitHub connectorでbranch／commit／PR永続化を完了。
15. 追加スクリーンショット5枚を目視し、初版の件数と主原因を訂正。
16. v6.0完全復旧プロンプトをPR #13へ保存し、固定SHA通知。
17. Claude v5.9返答と最新GitHubを再照合し、本v6.1へ統合。

## 6. Phase 0: Read-only Scout

1. `pwd`、`git status`、worktree、remote、branch、HEADを確認。
2. dirtyな既存worktreeは変更しない。
3. PR #3〜#13のstate、Draft、base/head SHA、checks、未解決review、commentsを再取得。
4. `git ls-remote`で新しいClaude recovery branchを確認し、重複作成しない。
5. PR #13最新headと本v6.1を読み、`CLAUDE_ACK`を固定SHA付きで記録。
6. Vercel `369-web`のProduction／PR #12 Previewについてdeployment ID、environment、source branch、commit SHA、URL aliasをread-only確認。
7. `.env`とSecret値を読まず、Vercel設定、redeploy、promotionを変更しない。
8. `DEPLOYMENT_PROVENANCE`表を作る。

| URL | Environment | Deployment ID | Source branch | Source SHA | NAV fingerprint | Evidence state |
| --- | --- | --- | --- | --- | ---: | --- |

9. ロードマップ正本、Phase Readiness Matrix、完全機能台帳、Feature Registry、CURRENT_STATEを読み、4軸Phase対応表を確定する。
10. 添付Claude返答の主張を`VERIFIED / REOPENED / DOC_ONLY / UNVERIFIED`へ分類する。

## 7. Phase 1: Recovery branchと分業

1. 既存Claude recovery branchがなければ`7ef2d9f`から`claude/full-recovery-v61`を作る。
2. PR #12 headは固定レビュー対象として動かさない。
3. Claudeは`apps/**`、`packages/**`、テスト、Claude管理docs/tasksを所有。
4. CodexはPR #13、完全機能台帳、独立レビューを所有し、Claude branchへpushしない。
5. GitHubへ`WORK_CLAIM`を記録する。
6. force push、共有履歴rebase、main直接pushは禁止。

## 8. Phase 2: P1/P2とEvidence Gapクローズ

### 必須修正

- stale runをpost-create rival checkから正しく除外する。
- JSON escaped quoteを含むpassword／authorization／cookieを完全マスクする。
- `Cookie:\nsession=...`形式を完全マスクする。
- Authorization、Bearer、Basic、ApiKey、JWT、sk-/AKIA/ghp_/xox*、URL認証、CRLF/tab、mixed case、最大長を否定テストする。
- Marketing、Ads、SEOを`marketing:read`のNAV gateへ接続する。
- worker失敗記録後のマスク済みrethrow、retry、failed telemetryを維持する。
- Redis/BullMQ実queue証拠が無ければ`EVIDENCE_GAP`を維持する。

### 不変条件

- tenantId、RBAC、機密ラベル、writeAudit、DataAccessLog。
- AIはapprove、delete、external_send、実支払を持たない。
- external send、実LLM、課金は封印。
- schema、migration、seedが必要なら別Gateへ回す。

各欠陥を先にredテストで再現し、修正後に秘密値が一文字も残らない否定アサーションを置いてください。

## 9. Phase 3: 欠落4機能とNAV完全復旧

1. 単一`NAV` manifestを正とし、現行67項目を削除・改名しない。
2. 次の4hrefとページを保持する。
   - `/growth/control-tower`
   - `/marketing/ads`
   - `/marketing/content`
   - `/ai-office`
3. OWNERで12グループ・67項目を表示、検索、到達可能にする。
4. desktop/mobileへ全機能ランチャー／検索を提供する。
5. サイドバーグループを折りたたみ可能にし、現在項目を表示領域へ移動する。
6. スクロール継続を明示し、不可視overlay scrollbarだけに依存しない。
7. 非OWNERではRBACを維持し、保護データを漏らさず、現在ロールと制限状態を説明する。
8. OWNER/ADMINがProduction／Previewとshort SHAを安全に識別できるbuild情報を表示または診断画面で確認可能にする。Secretや内部接続先は表示しない。

## 10. Phase 4: AI社員と3D Officeの完全統一

1. `AIAgent.key -> getAiCharacter(key)`を人物・外見・静的プロフィールの唯一の正本にする。
2. DB／seedへプロフィールを重複保存しない。
3. `/ai-agents`で3D Officeと同じportrait、fullName、kana、codeName、epithet、役割を表示。
4. `/ai-agents/[id]`でpersonality、skills、traits、common mistakes、evaluation noteまで表示。
5. キャラクター設定と実測状態／実行／成果を分離。
6. list/detail→`/ai-office?agent=<tenant-scoped-id>`を追加。
7. 3D Office→`/ai-agents/<id>`を追加。
8. invalid/cross-tenant IDは存在を漏らさずfallback。
9. raw DB statusを証拠由来状態として扱わず、同じ状態算出を使う。
10. unknown keyは決定論的な「設定未作成」fallback。
11. dashboard:read pre-fetch gate、tenantId、read-only、危険操作禁止を維持。

## 11. Phase 5: Recoveryテスト・Preview・Codex Gate

### 静的契約

- NAV 67、重複0、67 hrefにpage実体あり。
- main 63との差分4件を明示。
- 4ページを削除するとテストがred。

### E2E

- OWNER desktop 1280x720で12グループ・67導線。
- OWNER mobile 390x844で最初、最後、追加4導線。
- 67静的NAV hrefを巡回し、404／500／Error Boundaryなし、期待見出しあり。
- STAFF等の許可／拒否、制限表示、pre-fetch denial。
- AI社員list→detail→office→detailで同一agent。
- invalid/cross-tenant非漏洩。
- desktop/mobile overflow、重なり、文字切れなし。
- Three.js canvas nonblank、nameplate、選択、cleanup、fallback、pixel check。

### CI／Preview

1. unit、typecheck、lint、build、safety、E2Eを実行。
2. exact head SHAを固定し、workflow statusだけでなくjob log本文を確認。
3. Vercel Previewのdeployment source SHA一致を確認。
4. desktop/mobile、4導線、4画面、AI社員往復、3D canvasのartifactを保存・目視。
5. Claude recovery PRへ`@codex CODEX_REVIEW_REQUEST`を投稿。
6. Codex review完了までmain／ProductionをHOLD。

## 12. 全体ロードマップ正本化

復旧作業と並行して、ロードマップを曖昧なPhase名ではなく、固有workstreamと証拠段階で正本化してください。

### 12.1 North Star

完成形は「人間社員とAI社員が一緒に会社を動かす、自己進化型エージェント経営OS」です。3本柱を維持します。

- Company Brain
- Agent Workforce
- Decision & Action Gateway

Human BoundaryとTrust Centerが全体を包みます。人間を労働から解放する度合いは、架空の削減時間ではなく、証拠付きOutcome／Human Time Ledgerで測ります。

### 12.2 証拠段階

各Epic／Functionを次で分離してください。

- REQUIREMENT_ONLY
- SCHEMA_ONLY
- IMPLEMENTED_ON_DRAFT
- TESTED_LOCAL
- CI_GREEN
- PREVIEW_VERIFIED
- CODEX_REVIEWED
- MAIN_MERGED
- PRODUCTION_VERIFIED

完成率を主観で出さず、分母と証拠を併記してください。

### 12.3 基準ロードマップ

| Workstream | 内容 | 現状候補 |
| --- | --- | --- |
| Foundation / Phase 1 | 統合OS、CRM、LeadMap、会計・在庫等のMVP | main／本番証拠を再確認 |
| Quality / Phase X | CI、E2E、安全ゲート | main／CI証拠を再確認 |
| P2-BRAIN | Company Brain、Playbook、Case Study、Consent | 本番証拠を再確認 |
| P3-GROWTH | Growth Control Tower、成果台帳、承認導線 | Draft／HOLDを分離 |
| P3-Q2C | 見積・契約・請求・入金・会計入口 | P3-GROWTHと番号を混同しない |
| P35-CHANNELS | Ads、SEO、紹介 | Ads／SEO Draft、紹介Gate候補 |
| P4-WORKFORCE | AI社員、Control Plane、3D Office、Outcome | recovery最優先 |
| P5-MEETING-INTEL | 高度な会議知能、知識変換 | 基本会議機能と高度化を分離 |
| P6-BUSINESS-TWIN | 経営ダッシュボード／Business Twin | 未着手候補 |
| P7-TEMPLATES-MARKETPLACE | 業種テンプレート、審査済みMarketplace | 未着手候補 |
| P8-BILLING | 369自体の課金・credit・SaaS化 | 凍結 |
| P9-ENTERPRISE | SSO、SCIM、Trust Center本格化 | 未着手候補 |
| Phase Y / GTM | 導入、販売、サポート、事業運営 | 未着手候補 |

各行へowner、依存、DoR、DoD、acceptance、evidence、HOLD、再開条件、次の1件を記録してください。

### 12.4 P4-WORKFORCE Exit Gate

P4-WORKFORCEを完了扱いにするには、次をすべて満たしてください。

1. AI社員基盤と3D Officeがread-only運用可視化としてProductionで確認済み。
2. Ads、SEO、紹介のうち最低1チャネルが`read-only分析 -> AI下書き -> 人間承認`まで接続済み。外部公開・広告費支出・送信は封印のまま。
3. 既知Critical 0 / High 0。Evidence Gapは完了へ格上げしない。
4. 完全機能台帳のGitHub正本とObsidian鏡像が一致し、`ATOMIC_LEDGER_SYNC`のHOLD解除条件を満たす。
5. 外部送信、実LLM、実課金、実送金、MCP外部公開の封印が維持される。
6. Codex review、main系譜、Production証拠を分離して記録する。

## 13. AI社員の開発環境ロードマップ

「AI社員開発環境」を一語で済ませず、次のEpicへ分解し、完全機能台帳IDへ接続してください。

Feature Registry上の候補ID `AIOS-001`、`AIOS-002`、`AIOS-003`、`AIOS-005`、`GATE-002`、`API-001`、`API-002`、`API-003`を実読してください。名称や配置が変わっていれば現行正本へ従い、存在しないIDを新規作成しないでください。

| Epic | 必須能力 | 推奨workstream |
| --- | --- | --- |
| Agent Registry | ID、役割、所属、状態、owner、version | P4-WORKFORCE |
| Persona/Profile | 正本プロフィール、portrait、役割説明 | P4-WORKFORCE |
| Skill Registry | skill定義、version、依存、権限、評価 | P4-WORKFORCE |
| Tool Registry | tool manifest、scope、risk、approval | P4-WORKFORCE / Gateway |
| Prompt Registry | template、version、rollback、review | P4-WORKFORCE |
| Sandbox | fake data、隔離実行、fixture、no external send | P4-WORKFORCE |
| Evaluation Center | golden set、否定系、安全、品質、回帰 | P4-WORKFORCE |
| Run Lifecycle | queue、retry、idempotency、pause/resume | P4-WORKFORCE |
| Memory/Knowledge | Company Brain参照、memory境界、出典 | P4-WORKFORCE / Brain |
| Budget/Cost | budget、usage、上限、警告、実課金なし | P4-WORKFORCE |
| Human Inbox | 承認、差戻し、説明、resume | P4-WORKFORCE / Gateway |
| Observability | logs、trace、outcome、human time、failure | P4-WORKFORCE |
| Release Stages | draft、sandbox、pilot、production、rollback | P4-WORKFORCE |
| 3D Office | evidence-derived live state、task、profile、deep link | P4-WORKFORCE |
| Agent Studio | 人間が役割・skill・guardrailを設定するUI | P4次段 |
| External Developer Platform | SDK、MCP/API、審査、Marketplace | future / P7-P9 Gate |

次の薄い縦切り候補は`Agent Development Console v0`です。ただしrecovery完了後にGateを作り、既存schemaで成立するread-only機能から始めてください。新schema、外部SDK公開、MCP公開は別の人間承認が必要です。

## 14. Salesforce相当機能の競合機能台帳

「Salesforceと同じ機能がある」と断言せず、次のcapabilityごとに完全機能台帳ID、現行実装、証拠段階、欠落、次の薄い縦切りを記録してください。

配置候補は、CRM／営業支援の土台がFoundation / Phase 1、Company Brainと営業AIがP2-BRAIN、広告・SEO・GrowthがP3-GROWTH／P35-CHANNELS、Enterprise／MarketplaceがP7〜P9です。現行Evidenceで再判定してください。

- Account／Customer
- Contact
- Lead
- Opportunity／Deal
- Pipeline／Kanban
- Activity、Task、Meeting、Calendar
- Campaign、Attribution、Growth
- Quote、Contract、Order
- Forecast、Territory、Lead Scoring
- Customer Service／Case／SLA
- Omnichannel Communication
- Reports、Dashboard、Analytics
- Workflow、Approval、Automation
- RBAC、Field Security、Audit、Consent
- Import、Export、Deduplication、Data Quality
- Custom Object／Metadata／API
- App Marketplace／Integration
- Mobile／Offline
- AI Sales Assistant／Copilot

土台がPhase 1に存在しても、schema、UI、automation、integration、enterprise運用を分離してください。Salesforce parityは製品名比較ではなく、capability単位の証拠比較にしてください。

## 15. マネーフォワード／freee相当機能の競合機能台帳

次のcapabilityごとに同じ証拠表を作ってください。

配置候補は、会計・請求・入金・経費のschema／基本UIがFoundation / Phase 1、未回収・督促下書き・入金予測・cash forecastがP3-Q2C、文書知能がP3-Q2C〜P5、公式会計／銀行／決済connectorがfuture Gateです。schemaの存在を完成と扱わず再判定してください。

- Chart of Accounts
- General Ledger／Journal Entry
- Accounts Receivable／Invoice／Collection
- Accounts Payable／Bills／Payment Request
- Expense／Receipt／OCR候補
- Bank／Card Feed
- Reconciliation
- Cash Flow／Forecast／Budget
- Closing／Financial Statements
- Fixed Asset／Depreciation
- Tax／Electronic Books／Invoice制度対応候補
- Payroll／Attendance／HR連携
- Approval／Segregation of Duties
- Audit Trail／External Accountant
- API／Connector／Import Export
- Anomaly Detection／Dunning Draft／Prediction

369は現段階で「検知・予測・下書き・可視化・承認要求」を中心とし、実送金、実支払、実課金、税務断定、会計仕訳の無承認確定を行いません。既存会計製品との公式API連携はfuture Gateとし、資金移動は人間承認と外部システム境界を必須にしてください。

「置き換え済み」とは言わず、`NATIVE / ASSISTIVE / CONNECTOR / NOT_PLANNED / HUMAN_ONLY`の方式を各capabilityへ付けてください。

## 16. 完全機能台帳との接続

1. 既存Stable IDを優先し、新IDを安易に作らない。
2. 対応IDがないものは`UNMAPPED_CANDIDATE`。
3. Draft、main、ProductionのEvidenceを分離。
4. AI社員開発環境、Salesforce matrix、MoneyForward/freee matrixの各行へID、owner、dependency、acceptance、evidence、next actionを付ける。
5. 生成ファイルを手編集せず、generator／manifest／入力正本を更新。
6. GitHub正本とObsidian鏡像を同期し、broken link、orphan、secret scanを確認。

## 17. 人間GO前の統合報告

次を一画面で提示してください。

1. 利用者が見ていたVercel deploymentのbranch／SHA。
2. recovery Previewのbranch／SHA。
3. 欠落4機能の復旧証拠。
4. AI社員と3D Officeの統一証拠。
5. P1/P2／Evidence Gapの状態。
6. CI実測値とartifact。
7. mainへ入るdiff、依存、merge-tree結果。
8. rollback先SHAと手順。
9. 4軸Phase現在地。
10. AI社員開発環境の次の1件。
11. Salesforce／MoneyForward matrixの主要Gap。
12. Production後smoke。

その後にだけ`mainへ統合しProductionへ反映してよいですか（GO / NO-GO）`と一度だけ質問してください。

## 18. 人間GO後のみ

1. ancestry、merge-base、merge-treeで、PR #3〜#12を個別mergeするか、recovery headから単一release PRを作るか判定。
2. 重複commit、古いStream、競合解消漏れを入れない。
3. 最小で安全なmain向けrelease PRを作る。
4. 承認範囲内でのみnon-force merge。
5. Vercel Productionが承認済みmain SHAを配信するまで監視。
6. ProductionでNAV 67、4画面、AI社員往復、主要既存画面、認証、RBAC、監査をsmoke。
7. SHA不一致、CI failure、404／500、4機能欠落、Critical／High再発で即HOLD。
8. 勝手にDB rollback、Vercel設定変更、Secret変更をしない。

## 19. GitHub・進捗・Obsidian出力

各WIPと最終時に次を更新してください。

- `tasks/CURRENT_STATE.md`
- `tasks/PROGRESS.md`
- 4軸ロードマップ正本
- Phase Readiness Matrix
- 完全機能台帳Evidence
- AI社員開発環境matrix
- Salesforce capability matrix
- MoneyForward/freee capability matrix
- 該当audit docs
- `369-vault`ノートとindex
- GitHub PR本文／Conversation

独立vaultへ接続できなければin-repo鏡像まで完了し、未同期を明記してください。

## 20. STOP／HOLD条件

- Critical／High未解消。
- exact SHAのCI／Preview証拠なし。
- Vercel source SHA不一致。
- NAV 67、4画面、AI社員parity不合格。
- unresolved conflict、重複merge、系譜不明。
- main／Productionの人間GOなし。
- DB、Secrets、課金、外部送信、実LLM、認証設定変更が必要。
- ロードマップがPhase番号だけで固有workstreamを識別できない。
- 競合製品parityを証拠なしに「同等」「完成」と記録している。

## 21. 最終報告

非エンジニア向け日本語で次を報告してください。

1. 何が起きていたか。
2. Production／Previewのbranch、SHA、deployment ID。
3. main 63／feature 64／integration 67の意味。
4. 復旧した4機能。
5. AI社員と3D Officeの統一結果。
6. P1/P2／Evidence Gap。
7. unit、E2E、typecheck、lint、build、safety。
8. Codex reviewとGitHub PR。
9. 4軸Phaseの現在地。
10. 完了済み／Draft／未着手。
11. AI社員開発環境の現在地と次の1件。
12. Salesforce／MoneyForward/freeeの実装済み能力と主要Gap。
13. 完全機能台帳／ロードマップ／Obsidian同期。
14. 人間判断が必要な項目。
15. 残存リスクと次回作業。

「脆弱性ゼロ」「完全無欠」「Salesforce／マネーフォワードを超えた」「全機能完成」とは断言しないでください。事実、推測、証拠、未確認を分けてください。

安全範囲のPhase 0〜17は途中確認を求めず連続実行してください。Scout、設計、ロードマップ説明だけで停止せず、修正、テスト、commit、push、Draft PR、Preview、Codex通知、正本同期まで進めてください。
