# Codex レーンC 独立監査 — LeadMap 優先度スコア内訳

## 監査固定点

- 監査日: 2026-07-23（Asia/Tokyo）
- 対象: PR #122 `feat(leadmap): 優先度スコアの内訳をリード詳細に表示`
- 対象branch: `claude/leadmap-score-breakdown-v1`
- 対象commit / GitHub現head: `d3b7ce59a1b6128c27422224d5bc2bb8551a380b`
- PR base / `origin/main`: `989ab677e827915961353aaca5e7ca1606a95e87`
- PR状態: open、未merge、監査時点でhead一致
- 変更ファイル: 3件（`leads.ts`、新規unit test、リード詳細page）

旧監査結果は流用せず、上記commitをdetached worktreeへ固定してsource・schema・保存経路・testを独立確認した。

## 判定

**CHANGES_REQUIRED**

- Critical / High: 0件
- Medium: 2件
- Low: 2件
- tenant越境: **PASS**
- `leadmap:read` guard / PII・機密露出: **PASS**
- 同点整列の決定論: **PASS**
- 現行 `computeLeadScore` keyとmetaの網羅: **PASS**

## Findings

### C-SCORE-01 — 正常な `computeLeadScore` 出力でも表示加点の合計が100点を超える

- file:line: `packages/shared/src/leads.ts:45-47,90-100`、`apps/web/app/(app)/leadmap/leads/[id]/page.tsx:151-166`
- 種別: 説明整合性 / 上限処理
- 重大度: **Medium**
- 再現: `rating=3`, `reviewCount=100`, `hasWebsite=false`, `hasBooking=false`, `hasLine=false`, `hasSocial=false` を対象commitの関数へ渡した。`computeLeadScore` はraw 104を100へcapするが、breakdownは `30+20+15+20+8+6+5=104` のまま。新UIは「合計100点」と各 `+points` を同時に表示する。
- なぜ実害か: 壊れたデータではなく、公開された純関数の正常入力だけで、画面上の加点を足した値と「合計」が一致しない。営業担当に「表示されていない減点がある」「内訳か合計が誤っている」と誤認させ、説明可能性を目的とするカード自体の信頼を損なう。
- 修正案: 100点capを表示契約に含める。例えば `rawTotal` と `cappedScore` の双方を保持して「加点合計104点を上限100点に補正」と明示するか、表示用factorへ上限適用の規律を持たせる。単にfactorを黙って切り捨てると理由を捏造するため、capの明示が安全。
- 必須test: raw合計が99 / 100 / 101超となる正常入力を用意し、UI上の合計説明とfactor表示が数学的に矛盾しないことを確認する。

### C-SCORE-02 — 現行demo seedが `score` と `breakdown` を異なる入力で算出している

- file:line: `packages/db/prisma/seed.ts:519-533`、表示箇所 `apps/web/app/(app)/leadmap/leads/[id]/page.tsx:151-166`
- 種別: 保存データ整合性 / 説明の欠落
- 重大度: **Medium**
- 再現: seedは `priority` / `LeadScore.score` を `mobileFriendly`, `hasBooking`, `hasLine`, `hasSocial` を含む入力で算出する一方、保存 `breakdown` は `rating`, `reviewCount`, `hasWebsite` だけで再計算する。対象commitの `DemoMapProvider` と同じ5 campaign・80件をDB非接続で再現したところ、**76 / 80件**で保存されるscoreとbreakdown加点合計が不一致だった。例: `priority/score=73` に対して保存breakdown合計は55で、`weakMobile +10` と `noBooking +8` が説明から消える。
- なぜ実害か: API key不要の標準demoが本製品の主要動作経路であり、新カードはこの保存済みbreakdownをそのまま「AIが有望と判断した理由」として表示する。実際に加点された営業機会が理由から欠落し、「合計73点」と見える理由55点が同居する。
- 修正案: seedでも本番作成経路 `apps/web/lib/leadmap.ts:52-60,86,116` と同様に `const { score, breakdown } = computeLeadScore(fullInput)` を一度だけ実行し、priority・LeadScore.score・breakdownへ同じ結果を保存する。既に作成済みdemoデータの扱いは別の人間判断とし、本監査ではDB操作を行わない。
- 必須test: DemoMapProviderの全seed入力について、保存予定 `score === min(100, sum(positive breakdown))` または明示したcap契約を満たし、priorityとLeadScore.scoreも一致することをDB非依存testで確認する。

### C-SCORE-03 — 巨大な有限値を正当な加点として表示する

- file:line: `packages/shared/src/leads.ts:93-99`、`apps/web/app/(app)/leadmap/leads/[id]/page.tsx:154-166`
- 種別: malformed persisted JSON / fail-closed不足
- 重大度: **Low**
- 再現: `describeLeadScoreBreakdown({ base: 30, mystery: Number.MAX_VALUE })` は未知factorを `points=1.7976931348623157e+308`, `kind=opportunity` として返す。UIは保存 `latestScore.score` を合計として表示しつつ、この値を有効な「AIが有望と判断した理由」として `+...` 表示する。
- なぜ実害か: `Number.isFinite` はNaN/Infinityを落とすが、現行スコアの取り得る範囲を大幅に超える有限値は通す。schemaの `Json?` 自体にはfactor値の制約がないため、壊れた・旧形式・手動投入済みの行を閲覧すると、カードが壊れた内訳を正当な営業根拠として提示する。
- 修正案: factor単体の許容上限とscore/breakdown整合validationを追加し、逸脱時はカードをfail-closedで隠すか「内訳データ不整合」と明示する。未知keyを維持する場合でも無制限のpointsは許容しない。
- 必須test: `100`, `101`, `Number.MAX_VALUE`, `NaN`, `Infinity` と、保存scoreに一致しないbreakdownをUI契約まで通し、誤った理由を表示しないことを確認する。

### C-SCORE-04 — 一部の未知keyがObject prototypeへ衝突しfallbackを迂回する

- file:line: `packages/shared/src/leads.ts:72,93-97`
- 種別: unknown-key fallback / runtime型破れ
- 重大度: **Low**
- 再現: `JSON.parse('{"constructor":7,"toString":6,"__proto__":5,"mystery":4}')` を渡すと、`mystery` は期待どおりfallbackする。一方、先の3 keyは `LEAD_SCORE_FACTOR_META[key]` がObject prototypeの継承propertyを返し、出力から `label`, `hint`, `kind` が欠落した。TypeScript上の `LeadScoreFactor` 契約もruntimeで破れる。
- なぜ実害か: 有効なJSONの未知keyでありながら、「keyをそのままlabel化し opportunity扱い」という明示契約にならない。UIではbadge文字とfactor labelが空になり、点数だけが理由として表示される。
- 修正案: `Object.hasOwn(LEAD_SCORE_FACTOR_META, key)` でown propertyだけを採用するか、null-prototype map / `Map` を使う。
- 必須test: `constructor`, `toString`, `__proto__` をJSON.parse由来のown keyとして渡し、すべて通常の未知key fallbackになることを確認する。

## 重点観点の確認結果

### 1. 越境参照 — PASS

- 親リードは `findFirst({ where: { id, tenantId: user.tenantId } })`。
- nested `scores` にも `where: { tenantId: user.tenantId }` がある。
- `LeadScore.leadId` が単独FKでも、親と子の双方を同じsession tenantで絞るため、別tenantのLeadScoreはnested resultへ入らない。
- relation include以外のscore queryや、filter後に別IDで再取得する経路は今回の変更にない。

### 2. null・非数値・負値 — PASS / 巨大値はfinding

- `null`, `undefined`, primitive, arrayは空配列。
- 0以下、文字列、null値、NaN、Infinityは除外された。
- 正常なcap超過はC-SCORE-01、seed不一致はC-SCORE-02、巨大な有限値はC-SCORE-03。
- breakdownが空または全項目不正ならcard自体を表示しないため、fallbackの合計だけを捏造する経路はない。

### 3. 情報露出 — PASS

- `leadmap:read` 判定はDB queryより前にあり、権限未保有者にはAccessDeniedだけを返す。
- 現行writerのbreakdownは固定keyと数値だけで、PII・secret・機密ラベルを保存していない。
- 文字列valueは純関数で除外される。未知key labelもReact textとしてescapeされる。
- `READ_ONLY` / `EXTERNAL_PARTNER` 等の `leadmap:read` 保有者は既存画面ですでに評価、口コミ数、Web、電話、メール、住所を閲覧可能であり、今回の内訳はその既存閲覧境界を広げない。

### 4. 決定論 — PASS

`points DESC` の後にkeyの文字列比較を行うため入力列挙順に依存しない。`{ zeta:8, alpha:8 }` と逆順入力の双方が `alpha, zeta` となることを対象commitで独立実行した。

### 5. compute key / meta回帰 — 現行keyはPASS

`base`, `established`, `rating`, `noWebsite`, `weakMobile`, `noBooking`, `noLine`, `noSocial`, `negativeSignal` の9 keyは全てown metaを持つ。通常の未知keyはkey表示＋`opportunity`へ劣化し、描画を停止しない。ただしObject prototype衝突keyはC-SCORE-04のとおり。

### 6. `latestScore.score` と `lead.priority`

通常の作成経路 `discoverLeads` は一回の `computeLeadScore` 結果をpriority・score・breakdownへ同じnested createで保存しており一致する。現在のapp sourceに後続LeadScore追加・priority再計算のwriterは見つからなかった。demo seedもpriorityとscore自体は同じ値だが、breakdownだけがC-SCORE-02のとおり不一致。

## 検証記録

- GitHub PR metadata / patchとlocal refを別経路で取得し、head SHA一致を確認。
- targeted unit: `packages/shared/src/__tests__/lead_score_breakdown.test.ts` — **6 tests passed**。
- 対象TypeScriptを直接実行:
  - 同点・逆入力順: PASS
  - null / primitive / array / 非数値 / 0以下: PASS
  - score cap 100 vs factor合計104: 再現
  - seed相当80件中76件のscore/breakdown不一致: 再現
  - huge finite value: 再現
  - prototype衝突key: 再現
- DB接続、migration、seed実行、本番、Secrets、外部送信、課金操作は行っていない。

## 安全境界

実装コードは変更していない。成果物はこの監査Markdownのみ。main merge、PADN dispatch、PR作成は行わない。
