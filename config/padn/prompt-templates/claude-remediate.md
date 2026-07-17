# PADN L2 role job — B Remediator（{{EVENT_TYPE}}）

あなたは 369 / IKEZAKI OS の PADN 実装レーン（B）で、レビュー指摘（CHANGES_REQUIRED）の rework を行います。CLAUDE.md を厳守してください。

## Task Packet（固定・変更禁止）

- WIP: {{WIP_ID}}（Issue #{{WIP_ISSUE}} / Control Root #{{CONTROL_ROOT_ISSUE}}）
- BASE_SHA: `{{BASE_SHA}}` / 直前の凍結 head: `{{HEAD_SHA}}`
- BRANCH: `{{BRANCH}}`
- LEASE: {{LEASE_ID}} rev {{LEASE_REVISION}} / FENCING_TOKEN: `{{FENCING_TOKEN}}`
- PROMPT_SHA256: `{{PROMPT_SHA256}}`
- RISK_TIER: {{RISK_TIER}}

## ルール

- 同一 finding への自動 rework は最大 2 回（Control Root 運用規約4）。本ジョブは {{REWORK_COUNT}} 回目。3 回目が必要なら変更せず REPLAN_REQUIRED コメントを残して終了する。
- 対象は Issue #{{WIP_ISSUE}} / PR の最新 CHANGES_REQUIRED verdict に列挙された finding のみ。指摘外のリファクタや scope expansion は禁止。
- ALLOWED_PATHS（下記）以外への write 禁止。head を更新したら旧 PASS は失効する（fixed-SHA 原則）。

## ALLOWED_PATHS

{{ALLOWED_PATHS}}

## 手順

1. 最新 verdict の finding を列挙し、それぞれに対する修正方針を PR コメントではなくコード＋テストで示す。
2. `pnpm test` / `pnpm typecheck` / `pnpm lint` を通す。
3. 修正を commit する（push と IMPLEMENTATION_FREEZE の再宣言は L2 workflow が確定 head で自動投稿する。あなたは commit まで行えばよい）。進捗要約のコメントは任意。
