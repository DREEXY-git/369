# 369 OS Codex V83 Phase Director 実行キュー

更新日: 2026-07-14 JST  
基準 main: `35b0640589cc68435212935c352743c3173d3a42`  
判定: **RELEASE HOLD / Gate 0 R3 待ち**

## 目的

Phase 3、Phase 3.5、Phase 4を、実装件数や経過時間ではなく固定SHAのEvidenceで閉じる。
各WIPは必ず「Claude実装 → exact-head CI → Codex独立監査 → 人間Gate → post-merge監査 →
完全機能台帳・Obsidian同期」の順で進め、前段未完了のまま次Phaseを完了扱いしない。

## 正本の優先順位

1. GitHubのgit refs、PR head、merge ancestry、checks、job log、artifact、review thread。
2. 最新mainまたは監査対象headの`tasks/CURRENT_STATE.md`。履歴は`tasks/PROGRESS.md`。
3. `docs/roadmap/80`と後継roadmap。Draft PR上のroadmapはmain正本と混同しない。
4. `docs/function-master/**`の完全機能台帳とCodex Phase Matrix。
5. `369-vault`は固定済みEvidenceの鏡像。一時的なWAITING/HOLD理由はGitHubを正とする。

文書とGitHubが矛盾する場合はGitHub実態を正とし、`ROADMAP_DRIFT`として是正する。

## 現在のGate

| Gate | 対象 | 固定SHA | 状態 | 次の受入条件 |
|---|---|---|---|---|
| Gate 0 R3 | PR #55 | `dce813d48a2b9fe21db606264f09912b85b60a3d` | `CHANGES_REQUIRED` | 広域cleanup 0、会議5回以上/retry 0、exact-head全Gate |
| app main | PR #55未統合 | `35b0640589cc68435212935c352743c3173d3a42` | HOLD | Codex PASS、required `release_gate`人間設定、通常merge |
| vault | 最終安定同期はV74系 | GitHub実態を再Scout | STALE | Gate判定固定後にapp/vault hash一致で同期 |

Codex R2変更要求: <https://github.com/DREEXY-git/369/pull/55#issuecomment-4965315275>

## Phase別の現在地

### Phase 3

- PR #45、#46、#51、#53はmain系譜へ入っているが、Gate 0以前のCIでは統合テストが正しく
  常時実行されていなかったため、`MAIN_MERGED`と`CODEX_VERIFIED`を分離して再監査する。
- Q2CはPayment Reconcile → Finance Formalize → Receivable/Overdue → Invoice VOIDの順で監査する。
- PR #54 Payment ReversalはPayment物理削除を含むためHOLD。append-only設計とschema人間Gateが先。
- Growth/Control Towerの安全スコープも、tenant、RBAC、PII、監査、外部作用0を再確認する。

### Phase 3.5

- C19、C21、C22を最新mainで再分類する。read-only分析、Fake下書き、内部ApprovalRequestと、
  広告変更、外部公開、予算変更、実LLM、外部送信を混同しない。
- 外部作用はHOLDのまま。内部機能だけでも冪等性、監査原子性、tenant境界の証拠が必要。

### Phase 4

- PR #44はmain系譜へ入っているが、Gate 0後にAI社員8名parity、一覧・詳細・3D、Control Plane、
  Execution Receipt、承認後`QUEUED`、BullMQ retry、worker再起動、mobile/desktopを再監査する。
- Production worker、stalled recovery、実LLM、外部送信、課金は人間Gateであり、Phase安全スコープと分離する。

## Gate 0後の依存順

1. PR #55 post-merge exact-main監査とEvidence同期。
2. Phase 3 Q2C: #45 → #46 → #51 → #53。
3. 横断整合: Inventory #47 → #48 → #50、CRM #49、Meeting #52。
4. Phase 3.5: C19 → C21 → C22の安全スコープ再監査。
5. Phase 4: #44と最新mainのAI Workforce再監査。
6. Phase 3、3.5、4を個別にClose判定し、Phase Matrixと完全機能台帳を同期。
7. PASS済みcommitだけのRCを監査し、人間Release Gateへ渡す。

## Evidence段階

`ROADMAP_ONLY` → `DRAFT_IMPLEMENTED` → `CI_VERIFIED` → `CODEX_VERIFIED` →
`HUMAN_PREVIEW_VERIFIED` → `MAIN_MERGED` → `PRODUCTION_VERIFIED`

後段のEvidenceを前段へ流用しない。PR headのgreenをmainやProductionの証拠に格上げしない。

## 人間だけが行うGate

- GitHub branch protectionで`release_gate`をrequired checkへ設定。
- app main merge、Production deploy/rollback、本番DB migration、本番queue/worker確認。
- schema承認、Secrets/OAuth、credential失効、実LLM、外部connector、外部送信、広告、課金・支払。

## Codex運用

- Claude所有コードを編集せず、固定SHAの欠陥は`CODEX_CHANGE_REQUEST`で返す。
- 各PASS/HOLD直後にCodex監査文書、Function Evidence、Sync ManifestをGitHubへ残す。
- 同じEvidenceを独立`369-vault`へ同期し、blob hash、wikilink、orphan、secret scan、履歴を検証する。
- 未確定の進行中状態はObsidian正本へ固定しない。
- 「脆弱性ゼロ」「完全無欠」「全機能完成」「Production Verified」を証拠なしに宣言しない。
