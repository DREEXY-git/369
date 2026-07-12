# roadmap86 — Workflow Dry Run v1（v7.2 Lane D・read-only）

> branch `claude/workflow-dry-run-v1`（base = Lane C `claude/p4-control-plane-readonly-v1`）。
> フロー案の生成と dry-run（仮想実行）の表示のみ。**queue enqueue・Server Action 実行・外部送信・
> 実 LLM・DB 更新・課金は一切行わない**（GET のみで完結・変更系 action が存在しない）。

## 1. 設計（shared `workflow-dryrun.ts` が正本）

- 入力は Zod（`WorkflowInputSchema`）で検証: name 80 / condition 300 / actions 1000 文字・10 ステップ上限・
  **超過は黙って切り詰めず拒否**。trigger は allowlist（5種）のみ。
- Action は `WORKFLOW_ACTION_CATALOG`（allowlist）と決定論キーワード突き合わせ:
  - **BLOCKED（必ず停止）**: 支払実行・データ削除・広告予算変更・外部公開（人間 Gate・自動化対象外）
  - **REQUIRES_APPROVAL（承認ステップ挿入・dry-run はここで停止）**: 顧客メール送信・請求正式化・見積発行
  - **DRY_RUN_OK**: AI 下書き（Fake・下書きまで）・社内記録・社内通知・タスク割当
  - **UNRECOGNIZED**: allowlist 外は「実行計画に含めない」（推測で実行可能と表示しない）
- 危険キーワードは catalog 定義順の先勝ちで評価（「支払のメールを送信」→ BLOCKED が勝つ）。
- dry-run は決定論: REQUIRES_APPROVAL / BLOCKED で停止し、以降は NOT_REACHED（承認なしで進む仮想結果を
  作らない）。巨大入力でも 1 秒未満（timeout 相当の性能境界を unit で固定）。

## 2. UI（`/workflows`・dashboard:read）

GET フォーム（a11y: 全入力に label）→ フロー案（Trigger/Condition/Action/Approval Step/Risk）＋
Dry Run 結果。AI ロールは生成不可（閲覧のみ）。導線は NAV 67 契約を変えず /ai-control から deep link。

## 3. 証拠

- unit 15（Zod/上限/malformed/allowlist/先勝ち/決定論/停止規則/性能境界/catalog 網羅）。
- E2E 6（承認停止＋DB 完全不変（audit/send/runs/usage/approvals の before/after 一致）・BLOCKED・
  malformed/XSS 安全・AI 拒否・RBAC 遮断・deep link・mobile 390＋screenshot 3枚）。

本書は「脆弱性ゼロ」「完全無欠」「全機能完成」を宣言しない。
