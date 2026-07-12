# Phase Readiness Matrix V3

## Evidence段階

`ROADMAP_ONLY -> DRAFT_IMPLEMENTED -> CI_VERIFIED -> CODEX_VERIFIED -> HUMAN_PREVIEW_VERIFIED -> MAIN_MERGED -> PRODUCTION_VERIFIED`

各段階は証拠が必要で、CI greenからPreview、main、Productionへ自動昇格しない。証拠が足りない範囲は`EVIDENCE_GAP`とする。

## Phase 3 / 3.5 / 4

| Phase | 現在地 | 次のGate |
|---|---|---|
| Phase 3 Growth Engine v0 | `HUMAN_PREVIEW_VERIFIED / RC HOLD` | 768px修正、RC R2、main判断 |
| Phase 3.5 C21 | `HUMAN_PREVIEW_VERIFIED`（DB意味論はCodex証拠） | PR #27限定伝播、CI、RC R2 |
| Phase 3.5 C19 | `CHANGES_REQUIRED` | 並行冪等性P2修正と再監査 |
| Phase 3.5 C22 | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | 取得段階PII、tenant、監査、CI |
| Phase 4 AI社員可視化 | `HUMAN_PREVIEW_VERIFIED` | Phase 4独立lane継続 |
| Phase 4 Human Gate | `HUMAN_PREVIEW_VERIFIED` | 実queue/worker証拠 |
| Phase 4実行再開 | `EVIDENCE_GAP` | CI実Redis、requeue、worker recovery |
| AI Inbox / Execution Receipt | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | tenant、receipt状態、payload/監査、CI |
| Workflow Dry Run | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | 未知操作fail-closed、URL非永続、CI |

## V74 workstream checkpoint

| Workstream | 現在地 | blocking Gate |
|---|---|---|
| `P3-GROWTH` | P3-R01 `d209d5d`はCodex限定PASS。旧固定SHA Human Previewは有効。後継RCは未成立 | P3-R05後継RC、exact-head CI/artifact、768px Preview |
| `P3-Q2C` | 見積・契約・請求・入金・仕訳候補・督促下書きの限定実装を初回独立監査 | 契約RBAC、請求/入金/正式化transaction、並行採番 |
| `P35-CHANNELS` | C21限定合格、C19/C22は`CHANGES_REQUIRED` | C19 P2002/key/監査原子性、C22 PII/tenant/監査/schema Gate |
| `P4-WORKFORCE` | AI社員/Human Gate限定合格 | Control Plane、Workflow、実queue/worker、registry/console群 |

Wave 1 AI DX＋Marketing、Wave 2 Salesforce型CRM/SFA、Wave 3 Money Forward/freee型会計、Wave 4 人事労務・電子帳簿、Wave 5 外部連携・Enterpriseは分離して追跡する。将来WaveをPhase 3/3.5/4の完成へ加算しない。

## 競合カテゴリ

Salesforce型CRM/SFA、Money Forward/freee型会計、人事・労務、電子帳簿は段階実装対象から削除しない。ただし現時点は限定実装または`ROADMAP_ONLY`であり、競合同等・完全実装とは判定しない。

公式調査の起点:

- [Salesforce Sales Cloud](https://www.salesforce.com/content/dam/web/ja_jp/www/cloud-services/documents/Sales_Getting_Started_WithSalesCloud.pdf)
- [Money Forward クラウド会計](https://biz.moneyforward.com/accounting/smb/function/)
- [Money Forward クラウド人事管理](https://biz.moneyforward.com/employee/function/)
- [Money Forward クラウド給与](https://biz.moneyforward.com/payroll/function/)
- [freee人事労務](https://www.freee.co.jp/hr/features/list/)
- [freee 電子帳簿保存法](https://support.freee.co.jp/hc/ja/articles/4410254921497)
- [国税庁 電子帳簿等保存制度](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/index.htm)

## 次の3 WIP

1. PR #27限定伝播と後継RC、P3-Q2CのRBAC/原子性/採番を閉じる。
2. C19/C22の独立P2を固定headで閉じる。
3. Control Plane/WorkflowとPhase 4実queue、worker、recovery証拠を閉じる。

V74詳細監査は[[CodexV74Phase完了ゲート]]、WIP同期状態は[[WIPSyncManifestV74]]を参照する。V72以前の経緯は[[CodexV72最大自律再監査]]と[[SyncManifestV72]]を参照する。

競合capabilityのFunction ID別分類は[[競合FitGapV72]]を参照する。
