# 78. Agent Lifecycle ハードニング（v5.8）＋残存課題の設計 Gate

- 日付: 2026-07-11
- ブランチ: `claude/stream-b-ai-office-v55`（Stream B・PR #5）
- 発端: Codex 固定 SHA 独立レビュー（`docs/function-master/PR_3_4_5_READ_ONLY_REVIEW_2026-07-11.md`）＋人間承認の v5.8 指令

## 1. 今回修正したもの（実装済み）

| # | 深刻度 | 内容 | 修正 |
|---|---|---|---|
| High-1 | High | `maskRunError` が `Authorization: Bearer <token>` の token 本体を残す | Authorization/Cookie ヘッダの行末までマスク・Bearer/Basic スキーム値・JWT・quoted JSON 値・改行分割値・代表的鍵生値（sk-/AKIA/ghp_/xox*）を網羅。**否定テスト7件**（秘密値が出力に残らないことを直接検証） |
| High-2 | High | worker 例外を `{ok:false}` で握り潰し BullMQ retry/failed が働かない | FAILED 記録後に**マスク済みメッセージのみの安全な例外を再 throw**（元例外の stack/プロパティは投げない）。mock db 注入の unit で「再 throw される・メッセージに秘密が残らない」を検証 |
| Medium-6 | Medium | `finish()` の false を無視して Gate/Action を作成 | `finish()` を updateMany の **compare-and-set**（許可元 status を where に含める）へ変更し再読→更新の競合窓を排除。CAS 失敗時は Gate/Action を作らず競合例外（テストあり） |
| Medium-1 | Medium | 二重 Run 防止が非原子 | create 後に active を再確認し、先行 run があれば後発の自分を FAILED(重複) にして降りる**収束緩和**を実装（テストあり）。**完全な原子性は §2-1 の schema Gate** |
| Medium-2 | Medium | AIApprovalGate と人間承認 UI の未接続 | `/approvals` に **read-only の AI 承認ゲート一覧**を追加（可視化）。判断導線は §2-2 の bridge 設計 Gate まで提供しない。**needsApproval を返す producer の接続は bridge 実装まで禁止**（コードに明記・現 producer は返さない） |

## 2. 実施しない（schema/設計が必要・別の明示承認が必要）

### 2-1. 二重 Run 防止の完全原子化（schema Gate）
- 案: `AIAgentRun` に partial unique index（`tenantId, agentId, task` where `status in (RUNNING, QUEUED, NEEDS_APPROVAL)`）
  → Prisma は partial index を raw migration で扱う必要がある。もしくは `activeKey` 生成列＋unique。
- 依存条件: schema/migration の明示承認（v5.6 以降の禁止事項）・additive-only・rollback は index drop のみ。
- それまでの残存リスク: 複数 worker 同時起動時に稀に二重 RUNNING が**一時的に**発生し得る（本修正の収束緩和で
  片方が FAILED(重複) に落ちる。完全排除ではない）。単一 worker 運用では実質発生しない。

### 2-2. AIApprovalGate → 人間判断の bridge（設計 Gate）
- 決めるべきこと: 承認後の再開機構（NEEDS_APPROVAL→RUNNING を誰が実行するか＝worker の resume queue が必要）・
  却下時の FAILED 遷移・ApprovalRequest との重複回避（二重台帳にしない）・監査ログ・権限（approval:approve）。
- 依存条件: resume 実行経路の設計（queue 再投入）。承認 UI だけ先に作ると「承認したのに何も起きない」偽 UI になるため、
  **resume 機構と同時にのみ**実装する。
- それまでの措置: read-only 可視化（/approvals・Inbox）＋producer 接続禁止（needsApproval 経路は unit でのみ担保）。
