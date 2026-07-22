# Codex G 横断再監査 — AI境界・外部送信ゲート・機密表示

- 監査日: 2026-07-23 (JST)
- 監査対象: `origin/main` @ `9bff4e91da89ea7739eb72d647671e7c85350783`
- 横断差分: ラウンド4基準 `0ba767a` から上記 SHA まで（#103〜#114）
- 重点対象:
  - PR #109 head `e9ec6ca5b1d5400a7ac8e9d153c1002c381532f4`（merge commit `c1d8d1cbc502901ecfee86a077bcfb43274b514d` と tree 一致）
  - PR #114 head `25d7d317fc948d32896390b74ef88ba15b5f7c05`（main `9bff4e9` と tree 一致）
- 判定: **CHANGES_REQUIRED**

## ひとことで

通常の画面導線では AI の承認・送信実行ガードと `ROLE_PERMISSIONS` の不変条件は残っている。しかし、#109 の production-shared core には人間承認を自分で検証しない経路と `EXTERNAL_SEND_ENABLED=false` を回避する Provider 注入経路がある。また、#114 は顧客の機密ラベルを無視して顧客名を表示し、#106 の AI 実行レシートは広い `dashboard:read` だけで任意 JSON / error を生表示する。よって現 SHA を AI境界・機密表示の観点で GO にはできない。

## Findings

### G-AI-01 — dunning core が AI主体・人間承認を fail-closed に検証しない

- file:line:
  - `apps/web/lib/domains/finance/dunning.ts:18-21`
  - `apps/web/lib/domains/finance/dunning.ts:172-174`
  - `apps/web/lib/domains/finance/dunning.ts:230-258`
  - `apps/web/tests/e2e/m2_dunning_send_evidence.spec.ts:64-83,116-126`
- 種別: AI境界 / 承認バイパス / defense-in-depth
- 重大度: **HIGH**
- なぜ実害か:
  - core の `Actor` は `tenantId/userId` しか持たず、署名 session 由来の `isAi`、roles、actorType を受け取らない。
  - 申請側の `assertAiToolAllowed` は `actorType: 'user'` を固定しているため、AI identity が到達しても `external_send` を拒否できない。
  - 実行側 `executeDunningSend` は `assertAiToolAllowed`、`isHumanUser`、承認済み `ApprovalRequest` のいずれも検証しない。`draft` と `pending_approval` を送信可能状態として受け入れる。
  - #109 の証拠 spec は ApprovalRequest を作らず `pending_approval` の reminder を直接生成し、production-shared core を直に実行している。つまりテスト自身が「承認 callback を通らなくても core が Provider まで到達する」ことを固定している。
  - 現在のブラウザ実行導線 `executeApprovedDunningSendAction` は `user.isAi || !isHumanUser(...)` と `executeApprovedAction` で防御されているため、**現 Server Action から直ちに悪用できる経路ではない**。しかし worker・別 Action・将来の再利用が core を直接呼べば、AI/未承認送信を core が止めず、Audit も `actorType: 'user'` と誤記録する。外部送信の不変条件が呼び出し側の注意だけに依存している。
  - `requestDunningSend` の actorType 固定は #109 より前からの既存欠陥だが、#109 は core 直実行を正式な evidence として追加しながら境界を core に固定していないため、「AI は送信主体になれない不変条件を保持」とは判定できない。
- 修正案:
  - core Actor に署名 session 由来の `sessionIsAi` と roles（または信頼できる actorType）を必須化し、AI role 混在・値欠落を DB 接触前に fail-closed にする。
  - `executeDunningSend` 自体で `external_send` / `execute_approved` の AI禁止を検証し、承認済み ApprovalRequest または改ざん不能な承認実行 capability を必須化する。少なくとも `draft` 単独を送信可能にしない。
  - AI単独、AI+OWNER混在、`isAi=true+OWNER`、roles/actorType 欠落、ApprovalRequest 不在・未承認を core 直呼びする negative evidence を追加する。

### G-AI-02 — #109 のテスト Provider が `EXTERNAL_SEND_ENABLED=false` を回避する

- file:line:
  - `apps/web/lib/domains/finance/dunning.ts:214-227`
  - `apps/web/lib/domains/finance/dunning.ts:283-305`
  - `apps/web/lib/domains/finance/dunning.ts:312-323`
  - `.github/workflows/ci.yml:164-174,205-216`
  - `apps/web/tests/e2e/m2_dunning_send_evidence.spec.ts:116-126`
- 種別: 外部送信ゲート迂回 / テストフックの本番混入
- 重大度: **HIGH**
- なぜ実害か:
  - コメントは「env ゲートには影響しない」と説明するが、実装は `if (testProvider || enabled)` である。Provider が注入されると `enabled === false` でも `email.send(...)` を呼ぶ。
  - CI は `EXTERNAL_SEND_ENABLED=false` を明示しているのに、#109 spec は注入 Provider の call 数が 1 になることを要求し、exact-head CI が成功している。これは迂回が推測ではなく実行済み evidence である（Provider 自体は fake なので CI から外部送信はしていない）。
  - hook の型と引数は production module の公開 API にあり、fake だけに型制約されない。内部 caller が実 Provider を渡せば global OFF 中でも送信できる。
  - さらに final status は `enabled` だけで `logged` / `sent` を決めるため、OFF 中に Provider が実送信しても reminder は `logged` となり、「送っていない」という状態・監査表示と実世界の副作用が食い違う。
  - 現時点で opts を渡す参照は e2e spec のみで、HTTP入力から Provider を注入する経路は見つからない。それでも `EXTERNAL_SEND_ENABLED` が最後の global Human Gate である以上、production-shared core に迂回可能な公開分岐を置くことは release blocker と判断する。
- 修正案:
  - Provider の種類に関係なく、Provider 呼び出しは必ず `enabled === true` の内側に置く。
  - evidence はテスト内で `EXTERNAL_SEND_ENABLED=true` を一時設定し、network を持たない fake Provider を注入して実測するか、global gate より下位の非公開/test-only adapter を検証する。
  - test seam を production signature から分離し、少なくとも production build / `NODE_ENV !== 'test'` では注入を受け付けない。OFF 時に注入 Provider の call 数が 0 である negative test を追加する。

### G-AI-03 — #114 が顧客ラベルと `customer:read` を通さず延滞顧客名を表示する

- file:line:
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:26-29`
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:38-60`
  - `packages/shared/src/finance.ts:173-181`
  - `packages/db/prisma/schema.prisma:494-507`
  - 比較対象: `apps/web/app/(app)/finance/receivables/page.tsx:30-43`
- 種別: 機密ラベル / PII・顧客識別情報の過剰開示
- 重大度: **HIGH**
- なぜ実害か:
  - ページゲートは `finance:read` だけである。#114 は Customer から `name` を取得するが `label` を取得せず、`customer:read` と `canSeeCustomerLabel` / `visibleCustomerLabels` のどれも通していない。
  - `detectProfitLeaks` はその名前を `回収遅延: <顧客名>` として画面に生表示する。表示行には当該顧客の延滞額も並ぶ。
  - `EXTERNAL_EXPERT` は `finance:read` を持つ一方、`customer:read` を持たず、Customer の既定 `CUSTOMER_CONFIDENTIAL` ラベルにもアクセスできない。`READ_ONLY` も `finance:read` は持つが高機密ラベルは fail-closed の対象である。したがって同一テナント内でも、本来は顧客名を見られない role に顧客の存在・名前・延滞額の対応を露出する。
  - 既存の売掛エイジング画面は Customer の `label` を取得し、`customer:read && canSeeCustomerLabel(...)` を満たさない場合に名前を `（非表示）` とする。#114 はこの確立済み規約から回帰している。
- 修正案:
  - Customer の label を取得し、`customer:read` と `canSeeCustomerLabel`（またはクエリ時点の `visibleCustomerLabels`）を満たす場合だけ実名を渡す。
  - 不可視顧客は安全な固定文言へ redaction し、請求番号・Customer ID・Receivable ID にフォールバックして識別子を露出しない。必要なら権限内の件数/合計だけを表示する。
  - `EXTERNAL_EXPERT`、`READ_ONLY`、通常 STAFF、管理職、高機密ラベルを含む表示テストを追加し、不可視顧客名が HTML に含まれないことを証明する。

### G-AI-04 — AI実行レシートが広い `dashboard:read` で任意 output/error を生表示する

- file:line:
  - `apps/web/app/(app)/ai-agents/[id]/runs/[runId]/page.tsx:33-55`
  - `apps/web/app/(app)/ai-agents/[id]/runs/[runId]/page.tsx:60-71`
  - `apps/web/app/(app)/ai-agents/[id]/runs/[runId]/page.tsx:95-112`
  - 比較対象: `apps/web/app/(app)/ai-agents/[id]/page.tsx:54-67`
- 種別: PII / secret / 機密出力の過剰開示
- 重大度: **MEDIUM**
- なぜ実害か:
  - 新規ページは `dashboard:read` だけで `AIAgentRun.output`（任意 JSON）、`error`、Action の `summary/refType/refId` を取得し、そのまま HTML に表示する。task別権限、データラベル、masking、redaction、`audit:read` は無い。
  - `dashboard:read` は STAFF と READ_ONLY を含む広い経営画面権限であり、AI run が参照した顧客・財務・人事・会議等の個別データを見る権限と同義ではない。
  - 親の AI社員詳細ページは `input/output/error` を「payload/PII/secret」と明記して select から外しているのに、レシートが同じ基礎権限で raw output/error を再露出している。
  - `writeDataAccess` は閲覧を後から追跡する監査副作用であり、事前の認可・マスキングにはならない。現 producer の多くは output を空にしているため直近データの露出量は限定的だが、schema は任意 JSON を許し、既存・将来 run の内容を無条件表示するため実データ投入後に顕在化する。
- 修正案:
  - raw output/error を既定で表示せず、レシート用の安全な schema/projection（非PII・非secret・短い要約）を定義する。
  - 詳細出力は `audit:read` または task の元データ権限＋ラベル判定を必須にし、`maskText` 等で redaction する。内部 refId と生 error は人間向け安全文・権限付き監査導線へ分離する。
  - dashboard-only user、task権限なし user、PII/secret を含む fixture の negative display test を追加する。

## 横断確認結果

### AIの外部送信・承認・削除

- `packages/shared/src/rbac.ts` は監査差分で変更されておらず、`AI_AGENT` / `AI_ASSISTANT` に `external_send`、`approve`、`delete` は追加されていない。
- #103/#104 で変更された唯一の Server Action ファイル `growth/referral/records/actions.ts` は、create/update の両方で `user.isAi || !isHumanUser({ roles })` を DB 接触前に拒否する。外部送信・承認・削除は行わない。
- #103〜#114 の新規 page 3本（M2 readiness、AI run receipt、LeadMap attention）に Server Action は無い。他の集計/表示変更にも新規 Action は見つからない。
- `executeApprovedDunningSendAction` は `user.isAi`、AI role 混在、`executeApprovedAction` を通すため、現在の通常ブラウザ導線は人間承認を保持する。ただし G-AI-01/G-AI-02 の core 境界不足を打ち消さない。

### read-only の副作用

- #107 M2 readiness、#112 LeadMap attention、#113 cashflow projection、#114 profit-leaks live aggregation は対象コード上 DB read / 純計算 / 表示のみで、業務状態の書き込みや外部 I/O は追加していない。
- #106 AI run receipt は業務状態を変更しないが、閲覧時に `writeDataAccess` を1件書く。したがって厳密な「副作用ゼロ」ではなく、**business read-only + 監査ログ副作用あり**が正確である。この監査ログ自体は機密参照の安全要件に沿う。
- #105 朝礼の既存 `generateMorningReport` 呼び出しはページ評価時に AI provider を利用し得るが、今回追加の広告/SEO診断は純ロジックであり、新しい外部送信・承認・削除経路は追加していない。

### tenant境界

- #114 の Receivable → Invoice → Customer は各段に `tenantId` があり、tenant越境は確認しなかった。問題は tenant境界の内側にある role/label 境界（G-AI-03）。
- #106 の Agent → Run → Action も各クエリに tenantId を明示しており、別tenantの存在は 404 へ収束する。問題は同一tenant内の過剰表示（G-AI-04）。

## GitHub / CI evidence

- GitHub live state で PR #109/#114 は merged。取得した PR head と squash merge commit はそれぞれ tree が byte-identical。
- PR #109 exact head の CI run `29915885194` は stage1 / stage2_integration / stage3_e2e / release_gate が success。
- PR #114 exact head の CI run `29931881438` も同4 gate が success。
- CI green は型・既存テスト・統合を満たす証拠だが、G-AI-01〜04 の認可・機密境界を否定するものではない。特に #109 CI は `EXTERNAL_SEND_ENABLED=false` 下で注入 Provider が呼ばれることを実証しており、G-AI-02 の再現証拠でもある。

## 結論

**CHANGES_REQUIRED**。少なくとも G-AI-01〜03 の HIGH を解消し、同一 fixed SHA で negative evidence と CI を取り直すまで、AI境界・外部送信 Human Gate・顧客機密表示の観点から完了扱いにしない。今回の監査では実装修正、DB、本番、Secrets、外部送信、課金、main 操作を行っていない。
