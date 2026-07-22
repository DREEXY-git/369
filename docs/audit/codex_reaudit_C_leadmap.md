# Codex レーンC 独立再監査 — LeadMap 取りこぼし検知

## 監査固定点

- 監査日: 2026-07-23（Asia/Tokyo）
- 対象: PR #112 `feat(leadmap): 取りこぼし検知ボード（放置・停滞リードのレーダー）`
- PR head: `d0956f4c756f1988b07c93788689977938b7c270`
- PR base: `32f6a58715f1385f16a0a5e684f93e183f03c97f`
- merge commit: `6a3c03b265aba2c30df25d17a85e041f1dba4218`
- `git fetch origin main` 後の監査 HEAD (`origin/main`): `9bff4e91da89ea7739eb72d647671e7c85350783`
- PR head と最新 main の対象2ファイル: 差分なし（`git diff --exit-code` で確認）
- 監査対象:
  - `packages/shared/src/leads.ts`
  - `apps/web/app/(app)/leadmap/attention/page.tsx`

PR #112 は監査時点で merge 済み。PR head は squash merge commit と同一 tree であり、最新 main でも対象コードは変わっていないため、上記最新 main を実監査固定点とした。

## 判定

**CHANGES_REQUIRED（原子性・一貫性）**

- Critical / High: 0件
- Medium: 1件（しきい値境界で純関数とDB件数が不一致）
- Low: 2件（count/list の非同一 snapshot、同優先度内の最終活動順）
- tenant 越境: 確認したクエリには finding なし
- stage 分類: 現行16 stageには finding なし

## Findings

### C-LM-01 — しきい値ちょうどのリードをDBクエリだけ除外する

- file:line: `apps/web/app/(app)/leadmap/attention/page.tsx:67`、対照 `packages/shared/src/leads.ts:115-129,132-134`
- 種別: 境界条件 / 純関数とDB集計の不一致
- 重大度: **Medium**
- 再現:
  1. `now = 2026-07-22T00:00:00.000Z`、`hot_cooling` のしきい値を4日とする。
  2. `REPLIED` の `lastContactAt = 2026-07-18T00:00:00.000Z`（cutoffと完全一致）とする。
  3. `classifyLeadStall` は `floor(4日) >= 4` により `isStale: true` を返す。
  4. DB条件は `lastContactAt: { lt: cutoff }` なので同じ行を数えない。`lastContactAt = null` で `updatedAt = cutoff` の場合も同様。
- なぜ実害か: UI文言と純関数・単体テストは「N日**以上**（ちょうどを含む）」を契約としているのに、count と上位12件は厳密に古い行だけを対象とする。同じ入力を純関数で判定した結果とボード件数が一致せず、境界上の要対応リードが一時的に取りこぼされる。
- 修正案: 現在の契約を維持するなら、両OR枝を `lte: cutoff` にする。逆に `lt` を仕様とするなら `classifyLeadStall` を厳密超過へ変更し、「以上」の文言・コメント・既存境界テストも同時に直す。現状の明示契約からは `lte` が妥当。
- 必須test:
  - `lastContactAt` 非nullについて `cutoff - 1ms / cutoff / cutoff + 1ms` のDB抽出結果と `classifyLeadStall` を比較する。
  - `lastContactAt = null` の `updatedAt` について同じ3境界を比較する。
  - 4 bucketすべてで count と分類結果が一致することを確認する。

### C-LM-02 — count と表示listが同一snapshotではない

- file:line: `apps/web/app/(app)/leadmap/attention/page.tsx:69-77`
- 種別: 読み取り一貫性 / concurrency
- 重大度: **Low**
- 再現: `count` と `findMany(take: 12)` は同じ `where` を使うが、独立した2 statementを `Promise.all` で発行する。両statementの間に送信・接触記録・stage更新が入ると、それぞれが別の PostgreSQL snapshot を見る可能性がある。
- なぜ実害か: `count = 0` なのに `leads.length = 1` なら `b.count > 0` のfilterで実在行をカードごと隠し得る。逆なら空カードと誤った「ほかN件」を表示する。データ破壊やtenant越境はないが、取りこぼし検知画面の瞬間的な自己矛盾になる。
- 修正案: count と list を `REPEATABLE READ` の同一transaction snapshotで取得するか、単一SQL（window count等）で取得する。単に通常の `READ COMMITTED` transactionへ包むだけではstatementごとにsnapshotが変わり得るため不十分。
- 必須test: count後・list前に別connectionから対象行のstageまたは最終活動を更新するbarrier付きrace testを用意し、返るcountとlistが同一snapshot由来であることを確認する。

### C-LM-03 — 同優先度のtie-breakが最終活動（COALESCE）順になっていない

- file:line: `apps/web/app/(app)/leadmap/attention/page.tsx:73-74`
- 種別: 優先度ソート / 上位12件選択
- 重大度: **Low**
- 再現: primary keyは `priority: desc` で正しい。一方、tie-breakは `lastContactAt asc, updatedAt asc` であり、契約上の最終活動 `lastContactAt ?? updatedAt` の昇順ではない。PostgreSQLの昇順ではnullが後ろになるため、同一priorityで `lastContactAt = null, updatedAt = 30日前` のリードが、`lastContactAt = 5日前` のリードより後ろになり得る。さらに完全同値時の `id` tie-breakもない。
- なぜ実害か: 同優先度が13件以上あると、より長く放置された未接触リードが上位12件から外れ、短期間のリードが表示され得る。count自体は正しいが、「今見るべき12件」の選択が最終活動規律と一致せず、同値集合では表示が揺れる。
- 修正案: `priority DESC, COALESCE(lastContactAt, updatedAt) ASC, id ASC` をDBで表現する（必要なら安全なraw query、または明示的な `lastActivityAt` 設計）。primaryの `priority DESC` は維持する。
- 必須test: 同一priorityの `lastContactAt` 有/無を混在させた13件以上を作り、COALESCE相当で古い順の12件が決定的に選ばれることを確認する。

## 観点別確認結果

### 1. 16 stage → bucket と終端除外

現行 `LeadStage` 16値を、schema・shared型・実行結果で照合した。

| bucket | stage |
|---|---|
| `unworked` | `NEW` |
| `draft_pending` | `ANALYZED`, `DRAFTED`, `PENDING_APPROVAL`, `READY` |
| `awaiting_response` | `SENT`, `OPENED`, `CLICKED` |
| `hot_cooling` | `REPLIED`, `APPOINTMENT`, `NEGOTIATING`, `QUOTED` |
| 対象外 | `WON`, `LOST`, `UNSUBSCRIBED`, `EXCLUDED` |

12 active stageは重複なく全件分類され、4 terminal stageは `leadStallBucketForStage` / `classifyLeadStall` で `null`。DB側も各bucketの逆引きstageだけを `in` 条件へ入れるため、現行コードではterminalは抽出されない。

補足リスク: `LEAD_STAGE_TO_STALL_BUCKET` が `Record<string, ...>` のため、将来enumを追加してもcompile時に網羅漏れを検出しない。今回の16値に漏れはないが、`LeadStage` をkeyにした明示的なexhaustive設計か、`LEAD_STAGES` 全値を走査する回帰testが望ましい。

### 2. stale条件とCOALESCE相当

- `lastContactAt < cutoff`
- または `lastContactAt IS NULL AND updatedAt < cutoff`

この2枝は、strict inequalityの範囲では `COALESCE(lastContactAt, updatedAt) < cutoff` と等価であり、`classifyLeadStall` の `lastContactAt ?? updatedAt` と同じ列を選ぶ。差は C-LM-01 の境界演算子だけ。

### 3. tenant境界

`count` と `findMany` の共通 `where` に `tenantId: user.tenantId` があり、selectにもrelation/includeはない。4 bucketすべて同じ構築経路を通るため、確認対象クエリから別tenantリードが混入する経路は認めなかった。

### 4. count / list とpriority

- bucket間のstage集合は排他的で、`totalStale` の二重計上はない。
- count と list は同一 `where` であり、静止データでは `count >= leads.length`、最大12件表示となる。
- `priority` はschema上0–100の営業優先度で、`DESC` は正しい。
- 同時更新とtie-breakについては C-LM-02 / C-LM-03 のとおり。

## 検証記録

- `git fetch origin main` と PR head ref の再取得: 実施
- PR head / 最新 main の対象ファイルdiff: 0
- Node 24のTypeScript type-strippingで対象 `leads.ts` を直接importし、16 stageのmapping・4 bucket逆引き・境界時の `isStale: true` を実行確認
- 既存 `packages/shared/src/__tests__/lead_stall.test.ts` をsource review: 7 tests。純関数の境界「ちょうどはtrue」はあるが、ページのDB predicate、tenant、count/list race、take 12 orderingのテストはない
- Vitestの再実行は、checkoutに実体のある依存がなく既存launcherの参照先 `vitest.mjs` も欠落していたため未実施。依存install、DB接続、schema操作は行っていない

## 安全境界

コード修正、main push/merge、PR作成、本番・DB・Secrets・外部送信・課金操作は行っていない。本成果物は監査指摘のみ。
