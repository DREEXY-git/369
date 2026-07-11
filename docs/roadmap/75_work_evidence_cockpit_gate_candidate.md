# 75. AI Work Evidence Cockpit v0（Phase 4 Stream C1・Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/174_work_evidence_cockpit.md`
- ブランチ: `claude/stream-c-work-evidence-v56`（基準 db71fc8 = Stream B2 完了 SHA から分岐・Draft PR・merge しない）
- 上位: v5.6 §8（Outcome & Human Time Ledger v0＋Human Work Inbox v0）
- Function ID（保守的・v0 証拠のみ・完成扱いにしない）: C30-038 系の可視化基盤（部分）・C27-010 系 Inbox（部分）・
  C04-022/027（部分）・USR-004（暫定）。実装証拠のない ID は対応付けない。

## 1. 設計原則（Gate 回答）

- **証拠区分必須**: 成果はすべて `measured / self_reported / estimated / unverified / unavailable` の
  5区分付きで表示（shared `outcome-evidence.ts`・格上げ禁止）。
- **推定の禁止事項**:
  - AI 実行時間だけから人間の削減時間を推定しない → baseline（人間所要時間の実測/合意値）が無い現状、
    「人間の削減時間」は **常に unavailable（計測なし・値は null）**。`classifyHumanTimeSaving` が規律を固定。
  - baseline なしで「検証済み削減時間」を表示しない（`canDisplayVerifiedTimeSaving`）。
  - 自己申告を実測に合算しない（`sumByEvidenceClass` はバケットを分けたまま返す）。
- **財務金額は finance:read のみ**: 財務行は権限保持者にのみ返す（v0 は金額根拠の台帳未接続のため
  行はあるが値は unavailable・根拠なしに金額を出さない）。
- **Inbox は deep link のみ**: 承認・送信・再実行・削除の実行導線を作らない。承認案件（ApprovalRequest）は
  approval:approve 保持者のみ（/approvals ページゲートと同一条件・取得段階で遮断）。
- **3D 承認デスクと同じ read model**: Inbox の AI 異常項目（error/blocked/stale/no telemetry）は
  `getAiWorkforceReadModel`（B2 の stale 規律込み）から導出。別ロジックを作らない。
- **0 と計測なしを混同しない**: unavailable は value null・表示は「—」＋「計測なし」バッジ。

## 2. 実装

| 層 | 内容 |
|---|---|
| shared | `outcome-evidence.ts`: 5区分・ラベル・`classifyHumanTimeSaving`・`canDisplayVerifiedTimeSaving`・`sumByEvidenceClass`。unit `outcome_evidence.test.ts` 6件 |
| web read model | `outcomes.ts`: UsageEvent（ai.output.generated・直近30日）・AIAgentRun（成功/失敗/承認待ち・母数注記付き）・AIApprovalGate（PENDING）の実測カウント＋削減時間 unavailable＋財務行（finance:read のみ）。`inbox.ts`: 承認案件（approval:approve のみ）・AI 承認ゲート・error/blocked/stale/no telemetry（read-model 由来）を deep link 付き項目に集約 |
| ページ | `/ai-office` にタブ（3Dオフィス / 人間の作業インボックス / 成果台帳・searchParams でサーバー側切替・dashboard:read ゲートは従来どおり取得前） |
| e2e | `work_evidence.spec.ts` 3件: ceo 成果台帳（実測/計測なし/財務行/ボタン0）・ceo Inbox（deep link・実行ボタン0）・sales 境界（承認案件非表示・財務行なし・実測行は見える） |

## 3. スコープ外（v0 で作らないもの）

- 記事/リード等の事業 KPI との接続（C30 の本体）・自己申告値の入力 UI・estimated 系の算出。
  区分の器と規律だけを先に固定し、値の接続は後続 WIP（格上げ事故を構造で防ぐ）。
- Inbox からの直接操作（恒久的に作らない・deep link のみ）。

## 4. Gate 判定

- [x] ローカル電池 green（unit 305/0・tsc 0・lint 0〔警告 0〕・build 0〔/ai-office 148kB〕・safety 0）
- [x] 敵対的レビュー→反映（read model の二重取得を1回化・stale 判定を理由文の文字列一致から
  DerivedAgentState.stale フラグへ変更・stale 時の nextRecommendedAction を実行記録確認へ）
- [x] Draft PR #6 作成・CI green をログ本文で確認: run 29150129654（#196・stage1/stage3_e2e とも success）・
  head ed7d5a7・`103 passed (1.5m)` / 0 failed（期待 103 = 100+3 と一致・work_evidence 3件を CI 上で検証）。
  スクリーンショット artifact `e2e-screenshots-29150129654` も取得
  （https://github.com/DREEXY-git/369/actions/runs/29150129654/artifacts/8247952591 ）

→ **Stream C1（Work Evidence Cockpit v0）クローズ**（Outcome Ledger は「区分の器と規律」まで・
事業 KPI 値の接続は後続 WIP。完成宣言ではない）
