# Codex D 独立監査 — 紹介元ランキング / 要フォロー検知

## 判定

**CHANGES_REQUIRED**（MED 1件 / LOW 1件）

- Repository: `DREEXY-git/369`
- 監査対象 main: `9bff4e91da89ea7739eb72d647671e7c85350783`
- 対象実装: PR #108（`2a510e038c11704e8b61b83f58d96dad46d74ad9`）/ PR #110（`a40f80d821b1edde69d894e9c582a9adf6984bd5`）
- 監査日: 2026-07-23
- 方法: fixed SHA の source / Prisma query / schema / unit spec を静的照合。production code は変更していない。
- 安全境界: 本番、DB、migration、Secrets、外部送信、課金には未接触。

## Findings

### D-REF-01 — 全件の要フォロー件数に対し、一覧が最新200件だけなので対象を発見できない

- file:line:
  - `apps/web/app/(app)/growth/referral/records/page.tsx:68-78`
  - `apps/web/app/(app)/growth/referral/records/page.tsx:120-123`
  - `apps/web/app/(app)/growth/referral/records/page.tsx:197-213`
- 種別: **集合集合の不一致 / actionability / bounded list**
- なぜ実害か:
  - `staleFollowUps` は tenant 内の全件を `count` する一方、バッジを描画する `records` は `createdAt desc` の最新200件に限定される。
  - 201件以上あり、要フォロー対象が古い201件目以降にある場合、バナーは「要フォローがN件」と警告するが、案内どおり「下の一覧」を見ても該当行が1件も現れない。
  - #110 の目的は放置紹介を実行可能なフォロー対象に変えることだが、この状態では件数だけ分かり、対象を特定・更新できないため取りこぼしが残る。
- 重大度: **MED**
- 修正案:
  - 同じ tenant/status/cutoff predicate で stale 行を別途 `findMany` し、`updatedAt asc` の「要フォロー一覧」または絞り込み導線として表示する。全件表示が難しければ pagination と総件数を付ける。
  - 通常の最新200件一覧は維持してよいが、全件 count の警告から全 stale 対象へ到達できるようにする。
  - 201件目だけが stale の fixture で、警告件数と到達可能なバッジ/一覧件数が一致する integration test を追加する。

### D-REF-02 — 最後の `localeCompare('ja')` が別文字列にも0を返し、同率行の順序を一意に決めない

- file:line:
  - `packages/shared/src/referral.ts:268-300`
  - `apps/web/app/(app)/growth/referral/records/page.tsx:74,89-92`
  - `packages/shared/src/__tests__/referral_record.test.ts:103-129`
- 種別: **決定論ソート / tie-break不足**
- なぜ実害か:
  - 金額・成約数・紹介総数が同じ場合の最終比較は `referrerName.localeCompare(..., 'ja')` だけである。日本語照合では別文字列でも同値になる組があり、監査環境の Node では `A` と `Ａ`、`は` と `ハ` がいずれも比較結果0だった。
  - DB の `groupBy(['referrerName','status'])` には `orderBy` がなく入力順は保証されない。比較結果0では stable sort がその不定な入力順を保持するため、「同一入力→同一出力」という関数コメントを満たさず、同率が上位10件の境界にあると表示メンバーも揺れ得る。
  - 現在の unit test は金額差による順序と空配列しか確認せず、同率の全 tie-break を実証していない。
- 重大度: **LOW**
- 修正案:
  - 日本語表示用比較の後に、raw code-point/UTF-16 の完全順序（`x.referrerName < y.referrerName ? -1 : ...`）を最終 fallback として加える。
  - 入力順を反転した同率データ、および `localeCompare('ja')===0` だが文字列が異なる名前を使い、出力順が常に同じになる unit test を追加する。

## 指定観点の確認結果（findingなし）

### 1. 紹介元ランキング / 集計

- page の `groupBy({ by: ['referrerName', 'status'] })` は全件を集計し、`count` と `_sum.estimatedValue` を純関数へ正しく渡している。
- `summarizeReferrersByName` の `total` は全status、`won/lost` は該当statusだけを加算する。
- 成約率は `won / (won + lost)` で、未決着を分母に含めず、決着0件は0として0除算を避けている。
- 金額は `status==='won'` の行だけを `wonValue` に加算する。
- 金額降順→成約数降順→紹介総数降順までは正しい。名前の最終 tie-breakだけが D-REF-02。
- `deriveReferralSummary` も全体KPIを `received/inProgress/won/lost` から正しく導出し、決着0件は0%になる。

### 2. 要フォロー判定

- DB count は `status in ['received','in_progress']` かつ `updatedAt < referralStaleBefore(now)`。
- 純関数は同じstatus集合に対して `now-updatedAt > thresholdDays` を使うため、同一 `now` では DB の strict `< cutoff` と一致する。
- `won` / `lost` / unknown status は `isReferralStale` で常に false であり、DB count の対象にも含まれない。
- しきい値ちょうどは両経路とも対象外で一致する。D-REF-01 は判定差ではなく、全件countと表示母集団の差である。

### 3. tenant境界

- page の status groupBy、referrerName/status groupBy、stale count、records findMany はすべて `where: { tenantId: user.tenantId }` を持つ。
- `CustomerReferral` は tenantId スカラだが、本対象の4 queryにID単独・tenant条件なしの経路はなく、別tenantの件数・氏名・金額が混入する直接経路は確認しなかった。

### 4. PII / DataAccessLog

- ランキングと一覧は紹介元名、紹介先名、連絡先、noteを表示するが、既存の `marketing:read` page gate内にある。
- PIIを取得・表示した場合は `writeDataAccess` を実行し、tenant/actor/actorType/purposeを記録する。
- metadata は `shown`、`total`、field名だけで、氏名・連絡先・note本文やランキング値を複製していない。metadata-onlyとして妥当と判定した。

## 検証と証拠範囲

- 静的確認: `referral.ts`、records page、`CustomerReferral` schema、`referral_record.test.ts`、#108/#110 diff。
- 追加確認: bundled Node で `localeCompare('ja')` の同値例（`A`/`Ａ`、`は`/`ハ`）を再現。
- unit test実行: **未実行**。隔離worktreeに依存物が無く、監査制約を広げる依存取得は行わなかった。既存specにはランキング2件・stale3件が定義されていることを静的確認した。

## 固定SHA境界

この判定は `9bff4e91da89ea7739eb72d647671e7c85350783` に限定する。mainまたは対象ファイルのSHAが変わった場合は再監査が必要。
