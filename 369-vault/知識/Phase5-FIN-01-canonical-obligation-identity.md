# Phase 5 FIN-01 — 予定入出金の正本ID

> Phase 5 最初の製品実装 P5-FIN-001 / FIN-01 を、人が読み返せる形でまとめた知識ノート。現在地の正本は `tasks/CURRENT_STATE.md`、完了契約は `tasks/DELIVERY_CONTRACT.md`、厳密なコード状態は git refs と PR #131。

- **完了日**: 2026-07-24
- **main 統合**: PR #131／squash merge commit `177eb5f`
- **判定**: FIN-01 DONE。Phase 5 は ACTIVE（製品実装開始済み）
- **安全境界**: DB／schema／migration／外部送信／実LLM／課金の変更なし

## 何を解決したか

資金繰り予測では、PO・請求書・請求候補・予定イベントが同じ支払／入金を表すことがあります。名前・金額・期限だけでまとめると、別の取引を誤って一つにしたり、同じ取引を二重に数えたりする危険があります。

FIN-01 は、予定入出金の identity を次の考え方へ固定しました。

- identity は `tenantId` と正本の source ID を含む。
- versioned tuple を決定論的に encode し、文字列 delimiter の曖昧さを作らない。
- 金額・期限・説明・ライフサイクル状態は identity に含めない。
- 同額・同期限でも別の Invoice／PO は別 identity。
- tenant が違えば同じ source ID でも別 identity。
- source を安全に解決できない場合は推測せず、`coverageIncomplete` として安全側に倒す。

これにより、「お金が足りないのに大丈夫と判定する」方向の誤りを避けながら、後続のproducer／reader統一に使える正本ID基盤ができました。

## 実装された範囲

- `packages/shared/src/cashflow-obligation.ts`
  - tenant-scoped canonical identity
  - versioned encoding
  - fail-closed resolver
- `packages/shared/src/__tests__/cashflow_obligation.test.ts`
  - tenant分離、delimiter injection、candidate→invoice収束、別Invoice／別PO、unknown source、reversal／reopenなどの境界テスト
- `apps/web/lib/domains/finance/cashflow.ts`
  - finance reader から selector へ `tenantId` を明示的に渡す

## 証拠

- 承認Packet SHA-256: `a334a1673a2439a35ee1db8f1fb8ba74c72c7ad99fa557e304d52f646b03a5a0`
- 実装 fixed head: `5e343e4de4840ddc8b40f0d9494d3f52dea31776`
- PR exact-head CI: run `30061431731`（4 stage 全成功）
- main CI: run `30062018058`（4 stage 全成功）
- Vercel Production deployment: success
- 独立再検証: 対象テスト 29/29、unit 662/662、typecheck、`git diff --check` が成功

詳細な機械証拠は `docs/coordination/phase5/evidence/P5-FIN-001-post-merge.md` を参照。

## 次に残るもの

FIN-01 は identity 契約の完成です。次は同じPhase 5のまま、別Task Packetと人間承認を通して進めます。

- **FIN-02**: producer側で正本IDを生成・保持する。
- **FIN-03**: unified／bridge readerを同じ正本IDへ統一する。
- schema／migration が必要になった場合は恒久 Human Gate で停止し、個別承認を得る。

FIN-01はDONEとして再オープンせず、新しい課題は新しいTask Packetとして前進させます。Phase 5.1は作りません。

## 関連

- [[Phase3.5と4のBusinessPhaseClose]]
- [[セキュリティと権限]]
- [[状態管理とドキュメント役割]]
