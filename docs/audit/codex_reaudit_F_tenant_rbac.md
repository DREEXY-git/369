# Codex 横断再監査 — レーンF（tenant境界・RBAC・fail-closed）

## 判定

**PASS — 指定範囲に新規 finding なし。**

監査対象の5ページと1 read-modelモジュールにある Prisma read query site 24箇所は、すべてログイン主体の `tenantId` でスコープされている。各ページはデータ取得前に認証と対象resourceの `read` 権限を検査し、拒否時はDB取得へ進まない。`Receivable → Invoice → Customer` と `CashflowForecast → CashflowForecastLine` のtenant不整合も、foreign relationの存在を値・件数・警告へ反映せず、スコープ内の関連行が存在しない場合と同じ出力になる。

## 固定条件

- Repository: `DREEXY-git/369`
- 取得手順: `git fetch origin main`
- 監査対象ref: `origin/main`
- **監査対象 exact SHA: `9bff4e91da89ea7739eb72d647671e7c85350783`**
- 対象commit: `feat(finance): 利益漏れ検知に「回収遅延」の実データ検知を追加 (#114)`
- 監査日: 2026-07-23（Asia/Tokyo）
- 成果物branch: `codex/reaudit-F-tenant-rbac`
- 方法: source、Prisma schema、対象commit差分、RBAC実装、既存B/C/D監査文書の静的照合
- 境界: 実装修正なし。DB・本番・Secrets・外部送信・課金・main push/mergeには未接触。DB必須E2Eは実行していない。

## 監査結果一覧

| 対象 | 認証・権限ゲート（DB取得前） | Prisma queryのtenant scope | nested / relation境界 | 判定 |
|---|---|---|---|---|
| `leadmap/attention/page.tsx` | `requireUser()` → `leadmap:read`（44-53） | `LocalBusinessLead.count/findMany` の共通`where`に `tenantId`（60-77） | relation取得なし・必要列のみ`select` | PASS |
| `admin/m2-readiness/page.tsx` | `requireUser()` → `admin:read`（35-44） | count 7箇所＋groupBy 1箇所の全`where`に `tenantId`（58-68） | relation取得なし・集計値のみ | PASS |
| `finance/cashflow/page.tsx` | `requireUser()` → `finance:read`（11-14） | 権限通過後にactor `tenantId`だけをread-modelへ渡す（17, 22, 24, 26） | 下記cashflow read-modelで確認 | PASS |
| `finance/profit-leaks/page.tsx` | `requireUser()` → `finance:read`（27-30） | Finding/Receivable/Invoice/Customerの4段すべてに `tenantId`（33-52） | FKのnested includeを使わず、段ごとに同一tenantを再取得 | PASS |
| `growth/referral/records/page.tsx` | `requireUser()` → `marketing:read`（44-53） | groupBy 2箇所、count、findManyの全`where`に `tenantId`（72-78） | relation取得なし。DataAccessLogにもactor `tenantId`（93-104） | PASS |
| `lib/domains/finance/cashflow.ts` | route側の`finance:read`通過後だけproduction利用 | CashAccount/FinanceEvent/Forecast/ForecastLineの全6 query siteに `tenantId`（45-58, 75-79, 119-128, 141-145） | ForecastLineは `forecastId + tenantId` の二重条件 | PASS |

`growth/referral/records` はLeadMapページではなく紹介・マーケティングdomainであり、既存の権限契約どおり `marketing:read` が適切である（`tasks/CODEX_QUEUE.md:113` と一致）。`hasPermission` は未知role・空権限を許可しない集合照合で、権限欠落時のfail-openは確認されなかった（`apps/web/lib/auth/current-user.ts:11-18`、`packages/shared/src/rbac.ts:115-142`）。

## tenant境界の詳細

### 1. `Receivable → Invoice → Customer`（profit-leaks）

- 起点のoverdue Receivableは `where: { tenantId: t, status: 'overdue' }` だけを取得する（40-45）。foreign Receivableは件数・金額・表示のいずれにも入らない。
- Invoiceは起点から得たID群だけでなく `tenantId: t` を併記する（46-49）。own Receivableがforeign Invoiceを指す破損relationでも、そのInvoiceは`invById`へ入らない。
- Customerも同様に `tenantId: t` を併記する（50-55）。own Invoiceがforeign Customerを指しても、foreign名称は`custNameById`へ入らない。
- Invoiceがスコープ内に無い場合はown Receivable ID、Customerがスコープ内に無い場合はown Invoice番号へfallbackする（57-60）。したがってforeign relationの有無は、同一tenant世界で関連先が見つからない場合と同じ出力であり、foreign ID・名称・存在シグナルを表示しない。

結論: Prisma schema上の単独FK（`Receivable.invoiceId`、`Invoice.customerId`）にtenant複合制約がなくても、このread経路は各段をactor tenantで再スコープしてfail-closedになる。

### 2. CashAccount / FinanceEvent / CashflowForecastLine（cashflow）

- ライブ資金ショート予測はCashAccountとFinanceEventを独立したroot queryとして取得し、双方に同じ `tenantId` を必須化する（45-58）。nested includeはなく、foreign account/eventはopening・lineCount・残高推移・ショート警告へ入らない。
- Finance Bridgeと予定対実績もFinanceEventのroot queryに `tenantId` がある（75-79, 141-145）。
- 最新Forecastは `tenantId` で取得し、子Lineは `where: { forecastId: forecast.id, tenantId }` で二重スコープする（119-128）。own Forecastにforeign Lineだけが紐づく場合、返却`lines`は空配列であり、Lineが存在しない場合と同じKPI・表・警告になる。
- 対象ページはForecast本体を表示計算に使わず、tenant-filter済み`lines`だけを使用する（`finance/cashflow/page.tsx:17-20`）。foreign子の存在オラクルは確認されなかった。

結論: 特に指定されたCashAccount/FinanceEventはnested relationを使わずroot tenant filter、Forecast/Lineは親子二重filterでfail-closedである。

## RBAC・fetch順序

5ページすべてで処理順は次のとおりである。

1. `requireUser()`。未認証なら `/login` へredirect。
2. `hasPermission(..., '<resource>', 'read')`。falseなら拒否UIをreturn。
3. actorの `tenantId` を取得し、Prisma queryまたはtenant-scoped read-modelを実行。

拒否分岐より前のPrisma呼び出し、権限判定失敗後も実行されるPromise、catchによる許可へのfallbackは確認されなかった。adminページのデプロイ全体ON/OFF helperも `admin:read` 通過後にだけ評価され、秘密値は表示しない。

## query棚卸し

- 静的 Prisma read query site: **24箇所**
  - LeadMap attention: 2
  - M2 readiness: 8
  - Cashflow read-model: 6
  - Profit leaks: 4
  - Referral records: 4
- `include` / nested relation query: **0箇所**
- tenantId条件欠落: **0箇所**
- 権限判定前のDB fetch: **0箇所**
- foreign relationの存在シグナル: **0箇所**

## 既知未完との重複除外

既存のB/C監査にあるdomain core全般のdefense-in-depth論点、およびD-04（`decideOutreachApprovalCore`のcore内人間性・権限境界）・D-05（AI否定evidence matrix）は確認済みだが、本監査の新規findingとして再起票していない。今回の指定ページ・read queryに、それらとは別の新規tenant/RBAC欠陥は見つからなかった。

## 固定SHA境界

このPASSは `9bff4e91da89ea7739eb72d647671e7c85350783` の指定6ファイルに限定する。`origin/main` または対象ファイルが更新された場合は再監査が必要である。
