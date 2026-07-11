# Audit 175: 3D オフィス キャラクター作り込み＋AI 社員プロフィール（Stream D）

- 日付: 2026-07-11
- 対応 roadmap: `docs/roadmap/77_office_characters_gate_candidate.md`（正本）
- ブランチ: `claude/stream-d-office-characters-v57`（基準 50259e9 = Stream C1 完了 SHA）
- 変更: shared `ai-characters.ts`（8名のキャラクター設定＋unit）/ web `portrait.tsx`（SVG ポートレート）/
  `avatar-3d.ts`（3D 人型・デスク）/ `ai-office.tsx`（オフィス演出・プロフィールパネル・一覧ポートレート）/
  e2e ai_office.spec 更新。
  **schema・migration・seed・RBAC・labels 不変。外部アセット・外部送信・実 LLM・課金なし。read-only 不変。**
- 規律: プロフィールは「キャラクター設定」、稼働状態・実行回数は「実測（証拠由来）」として UI 上で明示分離
  （証拠なき成果を語らない原則と両立）。
- 検証結果・CI は追補に記録。
