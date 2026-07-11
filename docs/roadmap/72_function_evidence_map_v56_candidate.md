# 72. Evidence ID 補正と Function ID Evidence Map（v5.6 WIP-0・Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/171_evidence_id_correction.md`
- 前提: `docs/function-master/` 不在（実測）→ **ATOMIC_LEDGER_SYNC=PENDING と PR #3 の main 統合 HOLD を維持**（roadmap69 §0 が正・安全な実装は続行する）。

## 1. Evidence ID 補正（正式 Function ID との混同防止）

roadmap69 §2・roadmap70・audit169 で用いた ID は**台帳原典に存在しない暫定 ID**であり、
正式 Function ID として扱ってはならない。以後 `EVID-` 接頭辞の **Evidence ID** に改称する。

| 旧名称（廃止・リンク互換のため対応表として保持） | 新名称（正） |
|---|---|
| C19-RO-01 | **EVID-C19-RO-01** |
| C21-RO-01 | **EVID-C21-RO-01** |
| C22-GATE-01 | **EVID-C22-GATE-01** |

- 旧名称が残る文書（roadmap69 §2・roadmap70・audit169）は追記主義のため本文を書き換えず、
  **本対応表を正**とする（リンク・grep 互換維持）。新規文書は EVID- のみ使用する。

## 2. Function ID Evidence Map（保守的対応付け・完成扱い禁止）

**規則**: ここに載る Function ID は「v0 実装の証拠が存在する」ことのみを意味する。
**カテゴリ全体・機能全体の「完成」を意味しない**。台帳原典（ATOMIC_LEDGER_SYNC）解除時に照合・再判定する。

### Stream A（C19 Ads read model・EVID-C19-RO-01・PR #4・CI #172 96/0）

| Function ID | 実装証拠（v0・部分） | 証拠所在 |
|---|---|---|
| C19-017 キャンペーン管理 | 既存 MarketingCampaign の read model 表示 | /marketing/ads・roadmap70 |
| C19-021 予算管理 | 予算（計画値）の集計表示（読み取りのみ） | 同上 |
| C19-024 消化額 | 消化（自己申告値）の集計表示・会計実績ではないと明記 | 同上 |
| C19-039 広告レポート | チャネル状態盤＋CTR/CVR/CPA（分母0は未計測） | 同上 |
| C19-041 改善提案 | AI 改善案の下書き（FakeLLM 固定・Zod・根拠/信頼度/データ不足/人間確認） | 同上・audit169 |
| C19-051 自動実行前承認 | **部分**: 実行経路が構造的に不在（封印）＝「自動実行なし」の証拠。承認フロー接続は未実装 | roadmap70 §6-1 |
| C28-028 広告レポート | 同上（ダッシュボード面） | /marketing/ads |

### Stream B（AI Workforce/3D Office・PR #5・CI #174 97/0）

| Function ID | 実装証拠（v0・部分） | 証拠所在 |
|---|---|---|
| C04-001/002/003/004 Agent Registry/Profile/Role | 既存 AIAgent（8体）の read model 表示（登録・編集 UI は未実装） | /ai-office・/ai-agents・roadmap71 |
| C04-007 Department | 部署ゾーン表示・部署フィルタ | /ai-office |
| C04-011 Status | 証拠由来の8状態導出（deriveAgentState・unit 7件） | shared/ai-workforce.ts |
| C04-019/020/021/022 Scope/Approval | **部分**: autonomy 表示＋AIApprovalGate の read（producer 未実装・v5.6 B2 対象） | read-model.ts |
| C04-027 Escalation | **部分**: 承認デスクへの視覚接続＋「次の推奨」表示のみ | /ai-office |
| C28-017 AI Employee Dashboard | 2D 一覧＋詳細パネル | /ai-office |
| C28-036 AI社員レポート | **部分**: 状態集計（byState）のみ | read-model.ts |
| USR-003 3Dバーチャルオフィス | 3D シーン v0（ゾーン/承認デスク/フィルタ/フォールバック）— **原典定義不在のため暫定対応** | roadmap71 |

### 未対応（明示）

- C19 の入札・媒体連携・自動最適化系、C04 の予算/Kill Switch（C05）、C28 の大半、C21/C22 全域は**証拠なし＝未実装**。
- USR-003/004 以外の USR 系は原典不在（PENDING に包含）。

## 3. Gate 判定

- [x] Evidence ID 補正（対応表・リンク互換）
- [x] 保守的 Evidence Map（完成扱い禁止の規則明記）
- [x] ATOMIC_LEDGER_SYNC=PENDING・PR #3 HOLD 維持
