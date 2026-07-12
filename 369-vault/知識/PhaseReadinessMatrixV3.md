# Phase Readiness Matrix V3

## Evidence段階

`ROADMAP_ONLY -> DRAFT_IMPLEMENTED -> CI_VERIFIED -> CODEX_VERIFIED -> HUMAN_PREVIEW_VERIFIED -> MAIN_MERGED -> PRODUCTION_VERIFIED`

各段階は証拠が必要で、CI greenからPreview、main、Productionへ自動昇格しません。証拠が足りない範囲は`EVIDENCE_GAP`です。

## 最新Repository lineage

| 対象 | 現在地 | 判定 |
|---|---|---|
| app main | `7efb22b43b781e485a4759fab4145792eeabe92e` | PR #32 Phase 3/C21とPR #33 C22を履歴付きで統合済み |
| Phase 3/C21 RC | `8d3ae36f9f036b4125d029c5b7a55cbbc3d04685` | CI/Human Preview/main統合済み。Control Tower監査label P2 |
| C22 | `2884949ceb7a018fa7dc4a27ae5d04b2f829a965` | source CI/Human Preview/main統合済み。追加P2 2件 |
| C19 | `e3c410cdbc3fae7f43fac978ef9ff037ba8cd505` | `CHANGES_REQUIRED`、独立lane |
| Phase 4 | PR #20/#25/#26 | Human Gate限定証拠、Control Plane/Workflow/実queue Gap |
| vault main | `0517997b386ffdb82034c7d3bbc57e5a0062a30f` | P3-R01まで同期済み。post-release追補中 |

最新独立判定は`POST_RELEASE_CHANGES_REQUIRED`です。mainへ入った事実は保持しますが、P2 3件のfix-forward完了までPhase 3/3.5完成へ格上げしません。

## Phase 3 / 3.5 / 4

| Phase | 現在地 | 次のGate |
|---|---|---|
| Phase 3 Growth Engine v0 | `MAIN_MERGED / POST_RELEASE_CHANGES_REQUIRED` | Control Tower財務閲覧label修正、CI、Codex再監査、再Preview |
| Phase 3 Q2C | mainへ限定機能は統合 | 契約RBAC、請求/入金/正式化transaction、並行採番 |
| Phase 3.5 C21 | `MAIN_MERGED`（内部下書き・承認まで） | CMS公開・外部送信は別Human Gate |
| Phase 3.5 C19 | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | P2002、業務意図key、生成監査原子性 |
| Phase 3.5 C22 | `MAIN_MERGED / CHANGES_REQUIRED` | 候補外preview、AI actorType、merge head CI |
| Phase 4 AI社員可視化 | `MAIN_MERGED / HUMAN_PREVIEW_VERIFIED` | Production機能受入は未実測、Phase 4制御系は独立lane継続 |
| Phase 4 Human Gate | `HUMAN_PREVIEW_VERIFIED` | 実queue/worker証拠 |
| Phase 4実行再開 | `EVIDENCE_GAP` | CI実Redis、requeue、worker recovery |
| AI Inbox / Execution Receipt | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | tenant、receipt状態、payload/監査、CI |
| Workflow Dry Run | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | 未知操作fail-closed、URL非永続、CI |

## V74 workstream checkpoint

| Workstream | 現在地 | blocking Gate |
|---|---|---|
| `P3-GROWTH` | RC #32とmain lineage、CI 472/151、25 PNG、人間Previewを確認 | 財務機密閲覧label P2のfix-forward |
| `P3-Q2C` | 見積・契約・請求・入金・仕訳候補・督促下書きの限定実装 | 契約RBAC、原子性、並行採番 |
| `P35-CHANNELS` | C21/C22はmain、C19は独立lane | C22 P2 2件、C19 P2、外部作用Human Gate |
| `P4-WORKFORCE` | AI社員可視化はmain、Human Gateは独立laneで限定合格 | Control Plane、Workflow、実queue/worker、registry/console群 |

Wave 1 AI DX＋Marketing、Wave 2 Salesforce型CRM/SFA、Wave 3 Money Forward/freee型会計、Wave 4 人事労務・電子帳簿、Wave 5 外部連携・Enterpriseは分離して追跡します。将来WaveをPhase 3/3.5/4の完成へ加算しません。

## 次の3 WIP

1. Control Tower財務閲覧labelをfix-forwardし、P3-Q2CのRBAC/原子性/採番を閉じます。
2. C22の候補外preview/AI actorTypeと、C19のP2002/key/監査原子性を閉じます。
3. Control Plane/WorkflowとPhase 4実queue、worker、recovery証拠を閉じます。

詳細:

- [[CodexV74本番後再監査]]
- [[CodexV74Phase完了ゲート]]
- [[CodexV74P3R01再監査]]
- [[WIPSyncManifestV74]]
- [[競合FitGapV72]]

main統合やVercel successは「脆弱性ゼロ」「全Phase完成」を意味しません。
