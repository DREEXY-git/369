# Phase Readiness Matrix V3

## Evidence段階

`ROADMAP_ONLY -> DRAFT_IMPLEMENTED -> CI_VERIFIED -> CODEX_VERIFIED -> HUMAN_PREVIEW_VERIFIED -> MAIN_MERGED -> PRODUCTION_VERIFIED`

各段階は証拠が必要で、CI greenからPreview、main、Productionへ自動昇格しない。証拠が足りない範囲は`EVIDENCE_GAP`とする。

## Phase 3 / 3.5 / 4

| Phase | 現在地 | 次のGate |
|---|---|---|
| Phase 3 Growth Engine v0 | Draft、CI、Codex確認済み | PR #18 exact-head Human Preview、RC、main判断 |
| Phase 3.5 C21 | `CODEX_VERIFIED` | Human Preview |
| Phase 3.5 C19 | `CHANGES_REQUIRED` | 並行冪等性P2修正と再監査 |
| Phase 3.5 C22 | `ROADMAP_ONLY` | 外部作用なしの最小Draft |
| Phase 4 AI社員可視化 | 8名、一覧、詳細、3Dを確認 | exact-head Preview |
| Phase 4 Human Gate | `CODEX_VERIFIED` | 固有画面Preview |
| Phase 4実行再開 | `EVIDENCE_GAP` | CI実Redis、requeue、worker recovery |
| AI Inbox / Execution Receipt / Workflow Dry Run | `ROADMAP_ONLY` | Claude固定head受領 |

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

1. C19冪等性クローズ。
2. PR #18 Human PreviewとRC独立監査。
3. Phase 4実queue、worker、Execution Receipt証拠。

詳細監査は[[CodexV72最大自律再監査]]、同期状態は[[SyncManifestV72]]を参照する。

競合capabilityのFunction ID別分類は[[競合FitGapV72]]を参照する。
