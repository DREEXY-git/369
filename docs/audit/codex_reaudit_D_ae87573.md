# Codex ラウンド3 再監査 — レーンD（AI境界・権限・承認）

- 監査対象: `origin/main`
- 固定SHA: `ae8757328f69f0c210ac387b8f7f9429d2a76951`
- 対象修正: #93 / #96 / #97
- 監査日: 2026-07-22
- 方式: source / commit diff / RBAC / session identity / Server Action / DomainEvent / Outbox の静的追跡
- 判定: **CHANGES_REQUIRED**
- 制約: 指摘のみ。production code、DB、Secrets、外部送信、課金は変更・実行していない。

## 結論

| 項目 | 判定 | 根拠 |
|---|---|---|
| D-01 `decideAiGateAction`（#93） | **解消済み** | permission、`user.isAi`、`isHumanUser`をDB接触前に確認 |
| D-02 event/logistics（#97） | **部分解消 / blocker残存** | 列挙Actionはrole混在を拒否するが、event→finance bridgeの未ガードとsession AI不整合が残る |
| D-03 invoice/dunning実送信（#96） | **解消済み** | 両実行Actionが`user.isAi`と`isHumanUser`を送信claim前に確認 |
| 既知D-04 outreach core防御多重化 | **LIVE（非blocker）** | production入口はguard済みだが、export core自体はhuman/permission情報を受けない |

## 修正確認

### D-01 — 解消済み

`apps/web/app/(app)/approvals/actions.ts:20-26` の `decideAiGateAction` は、
`approval:approve`、`user.isAi === false`、`isHumanUser({ roles: user.roles })` を要求する。
ガードは `gateId` の読取や `decideAiGateCore` 呼出しより前にあり、次をともに拒否する。

- `AI_AGENT/AI_ASSISTANT + OWNER` かつ `isAiAgent=false`（role由来で拒否）
- 人間roleのみかつ `isAiAgent=true`（session boolean由来で拒否）

したがって初回D-01のproduction Actionバイパスは #93 で解消している。

### D-03 — 解消済み

`apps/web/app/(app)/invoices/actions.ts:221-229` と同`333-341` は、invoice/dunning双方で
`invoice:update`、`finance:read`、`user.isAi === false`、`isHumanUser`を要求する。
ガードは `ApprovalRequest` 検索、`executeApprovedAction` のclaim、email core呼出しより前である。
AI role混在とsession AI不整合の両方を遮断するため、#96の対象バイパスは解消している。

## Findings

### D-R3-01 [HIGH] #97が同じevent導線の`bridgeEventToFinanceAction`を取り残している

- file: `apps/web/app/(app)/operations/actions.ts:378-383`
- downstream: `apps/web/lib/domains/finance/finance-bridge.ts:293-325`
- external sink: `apps/web/lib/events.ts:148-171`、`packages/db/src/outbox.ts:9-30,102-123`
- 種別: AI境界 / human-only guard欠落 / Outbox外部送信到達
- 重大度: **HIGH**

`bridgeEventToFinanceAction` は `finance:create` だけを確認し、`user.isAi` も
`isHumanUser({ roles: user.roles })` も確認しない。`packages/shared/src/rbac.ts:73,115-143` の権限和集合により、
`AI_AGENT+OWNER` / `AI_ASSISTANT+OWNER` は `finance:create` を得てこのActionを通過する。

呼出先はFinanceEvent、JournalCandidate、InvoiceCandidate、Auditを作成し、
`emitBridgeGrowthTx` から `EVENT_PROJECT_FINANCE_BRIDGED` のDomainEventとOutboxMessageを作る。
activeなWebhookSubscriptionがあればworkerは `fetch(..., { method: 'POST' })` で外部配送する。
つまり #97 が塞ぐとしたevent→Outbox→Webhook経路が、同じイベント詳細画面のFinance Bridgeから残っている。

修正案: `bridgeEventToFinanceAction` の `requireUser()` 直後に #93/#96 と同型の
`user.isAi || !isHumanUser({ roles: user.roles }) || !hasPermission(...)` を置く。
AI_AGENT / AI_ASSISTANT単独、OWNER混在、`OWNER + isAiAgent=true` の認証済みAction replayで、
FinanceEvent / JournalCandidate / InvoiceCandidate / GrowthEvent / DomainEvent / OutboxMessage / Auditが全て0のままを固定する。

### D-R3-02 [HIGH] event/logisticsのrole-onlyガード（#97を含む）は独立した`user.isAi`信号を見ず、逆向き不整合をfail-closedにしない

- file: `apps/web/app/(app)/operations/actions.ts:285,323,339,350,360,369,404,458,472,490`
- file: `apps/web/app/(app)/operations/logistics/actions.ts:24,56,88`
- identity source: `packages/db/prisma/schema.prisma:146-160`、`apps/web/app/login/actions.ts:31-39`
- classifier: `packages/shared/src/rbac.ts:145-158`
- 種別: AI境界 / dual identity不整合 / fail-open
- 重大度: **HIGH**

#97で追加されたものを含む上記ガードはrole由来 `isHumanUser` だけで、sessionの `user.isAi` を確認しない。
一方 `User.isAiAgent` はUser上の独立Booleanで、UserRoleとのDB整合制約はなく、login時にそのままsessionの
`isAi` へ入る。したがって `roles=['OWNER']` かつ `isAiAgent=true` の主体は、
`isHumanUser=true` かつOWNER permissionでこれらのガードを通過する。

対象Actionのうちevent/logistics完了・作成・risk/staff系はDomainEvent/Outboxを作り、Webhook外部POSTへ到達する。
#93と#96が両信号をOR条件で拒否しているのに対し、#97だけが片側を無視しており、
「AIは外部送信を持たない」という不変条件がデータ不整合時にfail-openになる。

修正案: 人間専用Actionの共通判定を `user.isAi === false && isHumanUser({ roles: user.roles })` に統一し、
各ActionでDB接触前に使用する。少なくとも `OWNER + isAiAgent=true`、
`AI_AGENT+OWNER + isAiAgent=false`、`AI_ASSISTANT+OWNER + isAiAgent=false` を否定matrixへ追加する。

### D-R3-03 [MEDIUM] #93/#96/#97のAction境界に回帰テストがない

- file: `apps/web/tests/e2e/m1b_tenant_ai_boundary_evidence.spec.ts:395-417,496-500`
- 対象source: `apps/web/app/(app)/approvals/actions.ts:20-26`、
  `apps/web/app/(app)/invoices/actions.ts:221-227,333-339`、
  `apps/web/app/(app)/operations/actions.ts:283-490`、
  `apps/web/app/(app)/operations/logistics/actions.ts:22-88`
- 種別: security regression evidence gap
- 重大度: **MEDIUM**

#93/#96/#97はいずれもproduction sourceだけのcommitで、testsには変更がない。現mainのtestsをaction名で検索しても、
`decideAiGateAction`、invoice/dunning実行Action、今回のevent/logistics Actionを直接replayする参照はない。
既存E-06 matrixも `AI_AGENT` と `AI_AGENT+OWNER(isAiAgent=false)` の2種だけで、
`AI_ASSISTANT`系と `OWNER(isAiAgent=true)` を持たない。このためD-R3-01/D-R3-02および将来のguard削除を検出できない。

修正案: 人間OWNERのpositive controlと、上記3種以上のAI否定主体で実Server Action POSTをreplayし、
redirect `denied=1` と関連DB行0を確認する。D-02はDomainEventだけでなくOutboxMessage候補0まで、
D-03はApprovalRequestのexecution claim不変とprovider呼出し0までoracleに含める。

### D-R3-04 [MEDIUM] `decideOutreachApprovalCore`の防御多重化は未実装のまま

- file: `apps/web/lib/domains/leadmap/outreach-send.ts:38-95,98-148`
- guarded caller: `apps/web/app/(app)/approvals/actions.ts:60-69,84-91,243-250`
- 種別: 承認core / defense-in-depth
- 重大度: **MEDIUM**

production呼出し元の `decideApprovalAction` はpermission、`user.isAi`、`isHumanUser`を確認しており、
現時点でブラウザからの直接バイパスは確認していない。一方exportされたcoreはroles、session AI状態、
`approval:approve`を受けず、任意の `userId` で承認状態を確定し、条件が有効ならprovider送信へ進む。
初回監査の防御多重化findingはexact mainでもLIVEである。

修正案: coreへ必須のactor context（roles、sessionIsAi、permission判定済み情報ではなく判定可能な入力）を渡し、
DB接触前にhuman-onlyを再検証する。Action経由とcore直呼び双方の否定テストを置く。

## 到達面まとめ

| 経路 | `AI role + OWNER / isAi=false` | `OWNER / isAi=true` | 判定 |
|---|---:|---:|---|
| `decideAiGateAction` | 拒否 | 拒否 | 解消済み |
| invoice/dunning実送信Action | 拒否 | 拒否 | 解消済み |
| #97で変更したevent/logistics Action | 拒否 | **到達可能** | blocker |
| `bridgeEventToFinanceAction` | **到達可能** | **到達可能** | blocker |
| `decideOutreachApprovalCore`直呼び | actor分類不能 | actor分類不能 | defense-in-depth不足 |

対象範囲でAIからの直接delete実行は確認しなかった。上記HIGH 2件により、固定SHA
`ae8757328f69f0c210ac387b8f7f9429d2a76951` に対するレーンD verdictは **CHANGES_REQUIRED** とする。
