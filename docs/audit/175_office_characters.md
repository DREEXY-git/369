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

## 追補（CI・2026-07-11）

- 実装 commit `52d00d8`。ローカル電池 green（unit 309/0・tsc 0・lint 0・build 0・safety 0）。
- 視覚検証: SVG ポートレート 8名＋3D アバター 8体をローカル実レンダリング（chromium/WebGL）で目視確認。
  修正2件（髪キャップが目を覆う→後方オフセット＋眉上バンド前髪・瞳が頭部球に埋まる→表面より前へ）。
- CI: run 29151401460（#204・stage1/stage3_e2e とも success）・`103 passed (1.5m)` / 0 failed をログ本文で確認。
- artifact: e2e-screenshots-29151401460（desktop/mobile PNG・retention 3日）。blob URL は sandbox proxy で
  取得不可のため、CI 上の見た目確認はピクセル検査（背景乖離>200・色数>12・コンソールエラー0）で代替。
- Draft PR #9（merge しない）。

## 追補2（v5.8・2026-07-11）

- stream-c（v5.8 反映済み）を merge 取り込み後、Codex レビューの Stream D 残課題
  （初期選択・プロフィール screenshot・emoji 依存・本文サイズ・文字切れ検証）を反映（roadmap77 §5）。
- CI 結果は本追補末尾および PR #9 本文で更新。
