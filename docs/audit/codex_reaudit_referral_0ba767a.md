# Codex ラウンド4 独立監査 — Phase 3.5 紹介スライス

## 判定

**CHANGES_REQUIRED**

`CustomerReferral`の直接CRUDはtenant scopedで、migrationとPrisma schemaの型・indexも一致している。純粋な状態機械と集計テストは通過し、#100朝礼カードは顧客名を取得・表示せず、`DataAccessLog`にも件数だけを記録している。フレーキー修正も`expect.poll(...).toBe(1)`のexact countを維持し、AI/mixed roleの否定検査を変更していない。

ただし、`isHumanUser`はroleだけを判定するため、`isAi=true`と人間roleが不整合なAI主体は紹介作成・更新を実行できる。また、status更新はexpected statusを含まないread→writeで競合し、createには冪等identityがない。PII参照監査、server-side入力制約、tenantを含まないnested Deal、件数上限を全体集計として表示する点にも修正が必要である。

## 固定条件

- Repository: `DREEXY-git/369`
- 監査対象コード: `0ba767ad21f1466c9ca0fe86fd3093a9d656b66d`（#101 merge SHA）
- 対象branch: `codex/reaudit-referral`
- GitHub live確認時の`origin/main`: `0f71d899269975ec4c7b0d114ec7d19226bfca5d`
- `0ba767a..0f71d89`の差分は`tasks/CODEX_QUEUE.md`だけ。ラウンド4が固定した対象SHAは`0ba767a`のため、source監査は同SHAへpinした
- 方法: source / Prisma schema / migration / unit test / evidence specの静的照合
- 実行した検証: `packages/shared/src/__tests__/referral_record.test.ts`（5 tests PASS）
- 境界: 実装変更なし。DB、E2E、migration適用、本番、Secrets、外部送信、課金には未接触

## 指定観点の確認結果

| 観点 | 確認結果 |
|---|---|
| `CustomerReferral` tenant境界 | createはsession tenantを固定、pageは`findMany({tenantId})`、updateは`findFirst/updateMany({id,tenantId})`。直接ID越境は確認なし |
| schema / migration | `Decimal(14,2)`、nullable列、default、`tenantId,status` indexが一致。追加のみ |
| 状態機械 | `received→in_progress/won/lost`、`in_progress→won/lost`、`lost→in_progress`、`won`終端。純ロジックはfail-closed |
| AI境界 | `AI_AGENT` roleおよびAI role混在は`isHumanUser`で拒否。ただし`isAi=true`＋人間role不整合はR4-01 |
| 権限 | page=`marketing:read`、create=`marketing:create`、update=`marketing:update`。OWNER / DEPARTMENT_MANAGER / STAFFの権限表と整合 |
| #100 PII | morning queryは`Customer.name/contact`をselectせず、cardは件数のみ。DataAccess metadataも`scanned/candidates`のみ |
| poll修正 | `apps/web/tests/e2e/m1b_tenant_ai_boundary_evidence.spec.ts:575-590`。positive controlはpoll後も`toBe(1)`、AI/mixedの0件検査は不変。security検査の弱化なし |

## Findings

### R4-01 — `isAi=true`と人間roleが不整合なAI主体が紹介作成・更新を通過する

- file:line:
  - `apps/web/app/(app)/growth/referral/records/actions.ts:12-14,48-50`
  - `apps/web/lib/auth/session.ts:8-15`
  - `packages/shared/src/rbac.ts:99-107,145-157`
- 種別 (class): **AI境界 / actor identity不整合 / human-only bypass**
- なぜ実害か:
  - `isHumanUser`は`roles`だけを見ており、sessionの`isAi`を検査しない。
  - `AI_AGENT` role単独やAI role混在は正しく拒否される一方、DBの`isAiAgent=true`と`roles=['STAFF']`などが不整合なsessionでは`isHumanUser=true`かつ`marketing:create/update=true`になる。
  - その主体はPIIを含む紹介記録の作成とstatus確定を実行でき、`writeAudit`にも`actorType`を渡さないため人間の操作として記録される。
- 重大度: **HIGH**
- 修正案:
  - 両Actionを`user.isAi || !isHumanUser({roles:user.roles}) || !hasPermission(...)`でfail-closed化する。
  - pageの`canCreate/canUpdate`も同じactor判定へ揃える。
  - `AI_AGENT`、AI role混在、`isAi=true`＋人間roleの3否定fixtureでCustomerReferral/Auditが0件であることをproduction Action経由で固定する。

### R4-02 — status更新がexpected statusをCAS条件に含めず、競合遷移と虚偽Auditを許す

- file:line:
  - `apps/web/app/(app)/growth/referral/records/actions.ts:55-67`
  - `packages/shared/src/referral.ts:172-184`
- 種別 (class): **TOCTOU / CAS欠落 / 状態機械の永続化不整合**
- なぜ実害か:
  - 2リクエストが同じ`received`を読み、一方が`won`、他方が`lost`を検証すると両方が状態機械を通過する。
  - update条件は`id + tenantId`だけなので両方が成功し、last writerが最終statusを決める。Auditには相互に両立しない`received→won`と`received→lost`が残る。
  - read後に行が削除された場合も`updateMany`の`count=0`を無視して「更新」Auditと`updated=1`を返す。
  - updateとAuditが同一transactionではないため、Audit失敗時はstatusだけが確定し、再試行は同一遷移として拒否され監査を回復できない。
- 重大度: **MED**
- 修正案:
  - transaction内で`updateMany({where:{id,tenantId,status:rec.status},data:{status:to}})`を実行し、`count===1`の勝者だけがAuditを作る。
  - `count=0`は競合として再読込・明示エラーにし、成功表示を返さない。
  - `received→won`対`received→lost`の並行否定テストで、更新1件・Audit1件だけを保証する。

### R4-03 — createに冪等identityがなく、record作成とAuditも非原子的

- file:line:
  - `apps/web/app/(app)/growth/referral/records/actions.ts:23-44`
  - `apps/web/app/(app)/growth/referral/records/page.tsx:93-121`
  - `packages/db/prisma/schema.prisma:3467-3480`
- 種別 (class): **create冪等性欠落 / transaction欠落 / 二重記録**
- なぜ実害か:
  - formにはrequest keyがなく、二重クリック、通信再送、成功応答消失後の再試行が毎回新しいcuid行を作る。
  - record作成後に別接続の`writeAudit`が失敗するとrecordだけが残り、ユーザーの再試行で重複が増える。
  - 重複は紹介総数、成約率、pipeline/won金額を直接水増しし、同一紹介を別案件として追跡させる。
- 重大度: **MED**
- 修正案:
  - client生成またはserver発行の`requestKey`を持たせ、`@@unique([tenantId, requestKey])`でlogical identityを固定する。
  - createとAuditを単一transactionへ入れ、一意競合時は既存行を返して成功を再現する。
  - 同じrequest keyの直列・並行再送でrecord/Auditが各1件になる証拠を追加する。

### R4-04 — HTML制約だけで、Server Actionが文字数・金額範囲を検証しない

- file:line:
  - `apps/web/app/(app)/growth/referral/records/actions.ts:15-21`
  - `apps/web/app/(app)/growth/referral/records/page.tsx:98-116`
  - `packages/db/prisma/schema.prisma:3470-3475`
- 種別 (class): **入力検証 / handcrafted Action POST / storage・可用性**
- なぜ実害か:
  - `required/maxLength/min/step`はbrowser UIだけの制約で、Server Action POSTを直接組み立てれば回避できる。
  - Action側は必須2項目しか検査せず、氏名・連絡先・noteへ任意長文字列を保存し、氏名はAudit summaryにも複製する。
  - `estimatedValue`は負値を拒否せず0へ丸め、指数表記や`DECIMAL(14,2)`上限超過も受理してDB例外にする。入力誤りと障害が区別されない。
- 重大度: **MED**
- 修正案:
  - server側schemaで氏名1..100、連絡先0..120、note 0..500を検証する。
  - 金額は10進表記・小数桁・`DECIMAL(14,2)`範囲を明示し、負値や上限超過を丸めずvalidation errorにする。
  - browser制約を外したAction POSTの否定テストを追加する。

### R4-05 — 紹介一覧のPII参照がDataAccessLogに残らず、作成Auditへ氏名を複製する

- file:line:
  - `apps/web/app/(app)/growth/referral/records/page.tsx:63-70,132-148`
  - `apps/web/app/(app)/growth/referral/records/actions.ts:35-42`
  - `apps/web/lib/db.ts:17-30,61-82`
- 種別 (class): **PII最小化 / sensitive read audit欠落 / audit logへのPII複製**
- なぜ実害か:
  - 一覧は`findMany`で全列を取り、紹介者名・紹介先名・連絡先・noteを表示するが、誰がPIIを参照したかを`DataAccessLog`へ記録しない。
  - create Auditのsummaryへ両氏名を埋め込み、業務recordとは別の長期監査面へPIIを複製する。
  - #100が採用した「氏名を取得しない・access logはmetadata-only」という境界と、同じ紹介domainの記録ページで扱いが分裂する。
- 重大度: **MED**
- 修正案:
  - pageでは必要列だけをselectし、PII参照時にactor/tenant/purposeと`count/fields`だけのmetadata-only `DataAccessLog`を記録する。氏名・連絡先・note値はmetadataへ入れない。
  - create Audit summaryは`紹介を記録`のような非PII文言にし、entityIdで対象を追跡する。
  - 権限・label方針に照らしてCustomerReferralのPII分類も固定する。

### R4-06 — #100 morningのnested Dealにtenant条件がなく、foreign Dealが候補件数へ混入する

- file:line:
  - `apps/web/app/(app)/reports/morning/page.tsx:68-89`
  - `packages/db/prisma/schema.prisma:494-524,622-649`
- 種別 (class): **nested relation tenant欠落 / aggregate越境**
- なぜ実害か:
  - Customer parentはtenant scopedだが、`deals: {select:{stage:true}}`に`where:{tenantId:t}`がない。
  - schemaのCustomer→Deal relationは`customerId`だけで、Deal.tenantIdとの一致をDBが保証しない。tenant B Dealをtenant A Customerへ接続した破損relationを作れる。
  - foreign Dealが契約以降ならtenant Aの`wonDeals`と朝礼候補件数を増やし、別tenantの成約存在を集計シグナルとして漏らす。
- 重大度: **MED**
- 修正案:
  - nested Dealを`deals:{where:{tenantId:t},select:{stage:true}}`へ限定する。
  - own Customer→foreign Deal fixtureで候補件数が増えないnegative evidenceを追加する。

### R4-07 — `take`した標本を全体件数・全体KPIとして表示する

- file:line:
  - `apps/web/app/(app)/growth/referral/records/page.tsx:63-70,86-90`
  - `apps/web/app/(app)/reports/morning/page.tsx:68-89,196-203`
  - `packages/shared/src/referral.ts:205-230`
- 種別 (class): **集計完全性 / bounded sample / 非決定的表示**
- なぜ実害か:
  - 紹介記録は最新200件だけをpure集計へ渡すため、201件目以降を除外した値を「紹介の総数」「成約率」「見込み金額」と表示する。古い成約・不成立が落ちるほどKPIが偏る。
  - morningは`orderBy`なしでCustomerを50件だけ取得し、その標本の候補数を「今日、紹介を頼める優良顧客（N件）」として表示する。DB返却順により件数が変わり、51件目以降の候補は存在しないように見える。
- 重大度: **MED**
- 修正案:
  - KPIはtenant scoped DB aggregate/groupByで全件を計算し、一覧paginationとは分離する。
  - morningは全件count可能なqueryへ寄せるか、決定的なorder/filterと「先頭50件中」の標本表示を明示する。
  - 201件/51件境界のテストを追加する。

### R4-08 — unit testだけではAction境界・競合・冪等性・PII監査を実証しない

- file:line:
  - `packages/shared/src/__tests__/referral_record.test.ts:9-67`
  - `apps/web/app/(app)/growth/referral/records/actions.ts:12-70`
- 種別 (class): **negative evidence gap / production wiring未検証**
- なぜ実害か:
  - 追加テストはpureな状態機械と集計だけで、実Actionのtenant、permission、AI actor、Audit、concurrencyを通らない。
  - そのためR4-01〜R4-05が残っていても5 unit testsはgreenになる。
- 重大度: **MED**
- 修正案:
  - production Action POSTまたはproduction-shared coreで、foreign id、権限不足、AI role、mixed role、`isAi=true`不整合、並行status、同一request再送、PII metadata-onlyを検証する。
  - security否定ケースはDB不変だけでなくAudit/DataAccessの件数とactorTypeも固定する。

## findingなしとした項目

- migration SQLとPrisma modelの列型、nullability、default、`CustomerReferral_tenantId_status_idx`は一致する。
- CustomerReferralの直接read/writeには`tenantId`があり、ID単独更新はない。
- pure状態機械は同一遷移、不正status、`won`からの遷移、逆行を拒否する。集計式も提示された正常入力では正しい。
- 権限のresource/action分離はpage=`marketing:read`、create=`marketing:create`、update=`marketing:update`で一致する。
- #100 morningはCustomerの氏名・連絡先を取得せず、画面も件数だけを表示する。`DataAccessLog.metadata`も`scanned/candidates`だけでPII値を含まない。
- poll変更はexact assertionを`toBe(1)`のまま待機可能にしただけである。AI/mixed role後のUsage/Movement/GrowthEvent/DomainEvent各0件検査は変更されていない。

## 修正優先順

1. R4-01: `user.isAi`とAI roleの両方をhuman-only Action境界で拒否する。
2. R4-02/03: status CAS、Audit transaction、create idempotencyを一体で設計する。
3. R4-05/06: PII参照監査とmorning nested Deal tenant scopeを閉じる。
4. R4-04/07/08: server入力制約、全体集計、production wiringのnegative evidenceを追加する。

## 固定SHA境界

この判定は`0ba767ad21f1466c9ca0fe86fd3093a9d656b66d`限定である。source SHAが変わった場合は再監査が必要。
