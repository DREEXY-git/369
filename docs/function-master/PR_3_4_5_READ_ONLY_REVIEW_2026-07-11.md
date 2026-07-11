# PR #3/#4/#5 read-only独立レビュー

- 実施日: 2026-07-11
- 対象リポジトリ: `DREEXY-git/369`
- レビュー固定SHA:
  - PR #3: `027731fd1488b58cc4e017660eb347ce876d5f7b`
  - PR #4: `5c1a1753c9a4513120d419ef8c52512926a7e2d0`
  - PR #5: `db71fc8fe1410c1a6952f94512f32008221f2f81`
- 制約: read-only。対象PRへのcomment、review、commit、push、設定変更は行っていない。

## 判定

既知Criticalは0件。既知Highは2件残存するため、PR #5は現状のままmerge不可。
PR #3/#4にも中優先度の境界・入力検証課題があり、全PRをDraftのまま維持する判断が妥当。

## Findings

### High 1: Bearer tokenがエラーマスク後も残る

- 対象: PR #5 `packages/shared/src/agent-run-lifecycle.ts:61-67`
- `Authorization: Bearer sk-live-SECRET` は `Authorization=[masked] sk-live-SECRET` となり、token本体が残る。
- `runWithAgentLifecycle` はマスク結果を `AIAgentRun.error` と `AIAgentAction.summary` に保存するため、実エラーに認証ヘッダーが含まれるとSecretsがDBへ二次保存される。
- 現行unitは `token=...` だけを検査し、Bearer、quoted JSON、cookie、JWTを検査していない。
- 推奨: 既存の構造化マスキングへ統合し、Bearer/JWT/cookie/quoted JSONの否定系テストを追加する。

### High 2: worker例外を握り潰し、BullMQの失敗・retryを無効化する

- 対象: PR #5 `apps/worker/src/agent-lifecycle.ts:75-79`、`apps/worker/src/jobs.ts` の `MORNING_REPORT_JOB`
- wrapperは失敗を記録した後にthrowせず `{ ok:false }` を返す。handler側もその結果をthrowしないため、BullMQからは正常終了に見える。
- 一時的なDB/AI失敗でもqueue retry・failed job観測が働かず、朝礼レポートが静かに欠落する回帰になる。
- 推奨: lifecycle記録後に元例外または安全な例外を再throwし、retry後に新runが作られる統合テストを追加する。

### Medium 1: 二重Run防止がatomicではない

- 対象: PR #5 `apps/worker/src/agent-lifecycle.ts:36-48`
- 既存run検索とRUNNING作成が別クエリで、schemaに `agentId+task+active status` のunique制約もない。
- 同時起動した2 workerが両方gateを通過し、同じタスクを二重実行できる。
- 推奨: DB advisory lock、transaction、idempotency key等でcheck-and-createをatomic化する。schema変更が必要なら別Gateにする。

### Medium 2: AIApprovalGateの人間判断経路が存在しない

- 対象: PR #5 `apps/worker/src/agent-lifecycle.ts:63-70`、`apps/web/app/(app)/approvals/page.tsx`
- wrapperは `AIApprovalGate(PENDING)` を作るが、既存 `/approvals` は `ApprovalRequest` だけを表示・決定する。
- read modelは `/approvals` を次の行動として案内するため、将来NEEDS_APPROVAL producerを接続すると解消不能な承認待ちになる。
- 推奨: AIApprovalGateからApprovalRequestへの明示的bridge、または専用の人間判断UIを設計するまでproducer接続を禁止する。

### Medium 3: dealId直POSTが顧客label境界を迂回する

- 対象: PR #3 `apps/web/app/(app)/quotes/actions.ts:34-36`、`invoices/actions.ts:36-38`
- 作成フォームではDealを顧客の可視labelで絞る一方、Server ActionはdealIdのtenantだけを確認し、Dealに紐づくCustomer labelを確認しない。
- IDを知る利用者は、画面で選べない顧客のDealをQuote/Invoiceへ紐付けられる。
- 推奨: action側も `deal.customer.label in visibleCustomerLabels` を条件に含め、不可視IDは黙ってnull化せず監査可能な拒否にする。

### Medium 4: customer権限判定前に顧客名を取得している

- 対象例: PR #3 `quotes/[id]/page.tsx:32-42`、`print/quotes/[id]/page.tsx`、`print/invoices/[id]/page.tsx:43-53`
- `quote:read`またはinvoice ABAC後にCustomerの`name+label`をjoin取得し、その後で`customer:read`とlabel可視性を判定している。
- クライアント表示は抑止されるが、「権限外データは取得段階から除外する」というWIP-4の受入条件を満たさない。
- 推奨: customer権限がない場合はcustomer select自体を外し、権限ありでもlabel条件付き別クエリにする。

### Medium 5: SEO自由入力に長さ上限がなく、巨大AIOutputを保存できる

- 対象: PR #4 `marketing/actions.ts:256-271`、`packages/ai/src/schemas.ts:135-147`、`tasks.ts:716-761`
- keyword/audience/themeに入力schema・max lengthがなく、raw keywordはoutputの`keyword`と`rationale`へ保存される。
- 権限保有者が巨大入力を送ると、AIOutput JSON、DataAccessLog、画面renderを不必要に肥大化できる。
- 推奨: action入力をZodで検証し、文字列長、既存タイトル件数・各タイトル長、生成output各フィールドに上限を設定する。

### Medium 6: lifecycle遷移失敗を無視してGate/Actionを書き込む

- 対象: PR #5 `apps/worker/src/agent-lifecycle.ts:50-74`
- `finish()`は遷移不能時にfalseを返すが、呼び出し側は結果を確認せずAIApprovalGate/AIAgentActionを作成する。
- 競合更新時にrun状態とgate/actionが矛盾し得る。
- 推奨: finish falseを例外扱いし、run遷移とgate/action作成をtransactionで一体化する。

### Low / Open Policy

- PR #4の既存記事タイトル取得は`take:100`にorderByがなく、100件超で重複診断の入力集合が不定になる。
- PR #4は広告予算・消化・CPAを`marketing:read`配下とする設計判断を明記している。会計実績ではない点は理解できるが、将来finance実績と接続する前にclassification testを必須化する。
- PR #5のVercel PreviewはReadyだがDeployment ProtectionのSSO配下。本番利用・利用者実測の証拠ではない。

## PR別結論

| PR | 結論 | merge前の必須対応 |
|---|---|---|
| #3 | Draft維持 | dealId ABAC、customer取得段階遮断を修正または明示受容 |
| #4 | Draft維持 | SEO入力/output上限、広告金額classificationの回帰Gate |
| #5 | HOLD | High 2件を修正。二重Run・approval bridge・transaction整合を設計 |

## 統合順序

PR #4/#5はGit履歴上PR #3を含むが、GitHub baseはどちらもmainである。PR #3の修正・merge後に
各branchへmainを取り込み、差分縮小、CI再実行、上記Findingの再レビューを行う。現時点でmainへmergeしない。
