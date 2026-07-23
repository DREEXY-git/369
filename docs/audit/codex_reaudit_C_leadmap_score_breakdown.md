# Codex queue C 独立監査 — LeadMap 優先度スコア内訳

## 固定対象

- queue: `docs/coordination/codex-queue/2026-07-23-C-leadmap-score-breakdown.md`
- queue ref: `origin/claude/codex-queue-setup-v1`
- type: `audit`
- queue target: PR #122 / `claude/leadmap-score-breakdown-v1` / `d3b7ce59a1b6128c27422224d5bc2bb8551a380b`
- push-to: `codex/reaudit-C-leadmap`
- 監査日: 2026-07-23（Asia/Tokyo）

対象commitをdetached worktreeに固定し、旧verdictを流用せずsource・schema・保存writer・targeted testを再確認した。

> SHA注意: 監査時点のPR #122現headは `8dff64f75d69c699d6d1e800ea75080d318c01f9` に更新済み。本レポートはqueueが明示した `d3b7ce5` だけの判定であり、新headへ流用してはならない。

## 判定

**CHANGES_REQUIRED — Medium 2件 / Low 2件**

Critical / High、tenant越境、権限外露出、PII露出は認めなかった。同点整列と現行meta網羅はPASS。

## Findings

### C-Q122-01 — 正常入力で表示factor合計が保存scoreを超える

- file:line: `packages/shared/src/leads.ts:45-47,90-100`、`apps/web/app/(app)/leadmap/leads/[id]/page.tsx:151-166`
- 種別: score説明整合性
- severity: **Medium**
- 再現: `rating=3, reviewCount=100, hasWebsite=false, hasBooking=false, hasLine=false, hasSocial=false` では、raw加点は104、保存scoreは100にcapされる。breakdownは104のままなので、新UIは「合計100点」と `+30,+20,+20,+15,+8,+6,+5`（計104）を同時表示する。
- 実害: 壊れたデータを前提にせず、通常の `computeLeadScore` 入力だけで説明と合計が矛盾する。「内訳で理由を説明する」という機能目的に対し、営業担当が未表示の減点や計算誤りを疑う状態になる。
- 修正案: raw合計と100点capを別値として保持・表示し、「加点104を上限100へ補正」と明示する。理由を黙って削る方式は避ける。
- 必須test: raw 99 / 100 / 101超の3境界で、factor表示と合計説明が数学的に矛盾しないこと。

### C-Q122-02 — demo seedのscoreとbreakdownが異なる入力から作られる

- file:line: `packages/db/prisma/seed.ts:519-533`、表示箇所 `apps/web/app/(app)/leadmap/leads/[id]/page.tsx:151-166`
- 種別: 保存データ整合性
- severity: **Medium**
- 再現: seedはpriority/scoreを `mobileFriendly, hasBooking, hasLine, hasSocial` 込みで算出するが、breakdownはその4入力を省いて再計算する。対象commitの決定論的 `DemoMapProvider` 5 campaign・80件をDB非接続で再実行すると、**76/80件**でscoreとbreakdown加点合計が不一致になった。
- 実害: API key不要demoは標準MVP経路であり、新UIが既存demoを表示すると、実際の加点理由が欠落する。例えばscore 73に対して表示理由は55点分だけとなる。
- 修正案: 本番作成経路 `apps/web/lib/leadmap.ts:52-60,86,116` と同じく、full inputで一度だけ `{ score, breakdown }` を算出し両方を保存する。既存DB補正は本監査外の人間ゲート。
- 必須test: 全demo入力でpriority、LeadScore.score、breakdown（cap契約込み）が同一計算結果であることをDB非依存で検証する。

### C-Q122-03 — 巨大な有限値を正当な営業理由として表示する

- file:line: `packages/shared/src/leads.ts:93-99`、`apps/web/app/(app)/leadmap/leads/[id]/page.tsx:154-166`
- 種別: malformed JSON / fail-closed
- severity: **Low**
- 再現: `{ base:30, mystery:Number.MAX_VALUE }` は `Number.isFinite` を通り、未知factor `+1.7976931348623157e+308` として表示対象になる。
- 実害: `LeadScore.breakdown` は制約のない `Json?` であり、壊れた・旧形式の保存行を開くと、合計scoreと無関係な巨大値を「AIが有望と判断した理由」として提示する。
- 修正案: factor値上限とscore/breakdown整合validationを設け、不整合時はcardをfail-closedにするか「内訳データ不整合」と明示する。
- 必須test: 100、101、`Number.MAX_VALUE`、NaN、Infinity、score不一致の各入力で誤った理由を表示しないこと。

### C-Q122-04 — prototype衝突keyが未知key fallbackを迂回する

- file:line: `packages/shared/src/leads.ts:72,93-97`
- 種別: unknown-key fallback / runtime型破れ
- severity: **Low**
- 再現: `JSON.parse('{"constructor":7,"toString":6,"__proto__":5,"mystery":4}')` では `mystery` のみ正常fallbackし、先の3件は継承propertyをmetaとして拾うため `label/hint/kind` が欠落する。
- 実害: 有効な未知JSON keyで点数だけが表示され、badgeと理由名が空になる。宣言上の `LeadScoreFactor` 型もruntimeで破れる。
- 修正案: `Object.hasOwn(LEAD_SCORE_FACTOR_META, key)`、null-prototype object、または `Map` を使用する。
- 必須test: `constructor`, `toString`, `__proto__` をJSON.parse由来own keyとして通常fallbackできること。

## PASS項目

### tenant境界

- 親lead: `findFirst({ where: { id, tenantId: user.tenantId } })`
- 子scores: `where: { tenantId: user.tenantId }`

親子を同一session tenantで二重に絞っており、`LeadScore.leadId` が単独FKでも別tenant scoreはnested resultへ入らない。

### 権限・情報露出

`leadmap:read` guardはDB queryより前に実行される。現行breakdown writerは固定keyと数値だけでPII/secret/機密ラベルを保存せず、文字列valueは除外される。今回の内訳は既存リード詳細の閲覧境界を広げない。

### 決定論・meta

- `points DESC, key ASC` は入力列挙順に依存せず、逆順入力でも `alpha,zeta` に一致した。
- 現行computeの9 keyは全てown metaを持つ。
- null、undefined、primitive、array、0以下、非数値、NaN、Infinityは除外または空配列になった。

## 独立検証

- targeted Vitest: `lead_score_breakdown.test.ts` — **6/6 PASS**
- exact `d3b7ce5` TypeScript直接実行:
  - score 100 / factor合計104: 再現
  - deterministic demo 80件中76件不一致: 再現
  - huge finite: 再現
  - prototype key fallback不全: 再現
  - 同点逆入力順: PASS
- DB接続、seed実行、migration、本番、Secrets、外部送信、課金は実施していない。

## 安全境界

実装変更なし。成果物は本Markdownのみ。main merge、PR作成、PADN dispatchは行わない。
