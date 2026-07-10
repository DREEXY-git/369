# CRMLeadMap既存実装突合 — 新しく作らず既存LeadMapをリード正本と認めた回（READY / GO・案A）

> 出典（正本）: `369` リポジトリ `docs/audit/121_crm_leadmap_existing_implementation_reconciliation.md`（判定 READY / GO（案A））。本ノートはその要約。roadmap正本は `docs/roadmap/22_crm_leadmap_existing_implementation_reconciliation_candidate.md`。
> 関連: [[CRMリードのみ実装Gate]] / [[Phase2完了判定とPhase3Gate]]

## これは何か

- CRM の「リード（Lead）」を新しく作ろうとしたら、**このプロダクトには既に LeadMap という本格的なリード〜商談〜顧客の仕組みが実装済み**だと分かり、二重化を避けるため作らずに停止しました。
- 今回は、その**既存の仕組み（`LocalBusinessLead` / `/leadmap`）を「CRM のリード正本候補」として正式に認める判断（案A）を紙で整理しただけ**の回です。新しいテーブルも画面も作っていません（read-only 監査・docs-only）。

## 何が分かったか（やさしい言い換え）

- 既存の LeadMap には、リード実体（会社ID・名前・業種・取得元・段階・担当・顧客/商談へのつながり等）、顧客・担当者・商談・履歴のフルCRM、一覧/地図/パイプライン等の画面が**すでに揃っている**ことを実測で確認しました。
- 安全の仕組み（認証・権限チェック・会社IDでの分離・監査ログ・外部送信前の人間承認）も既存実装に組み込まれていました。
- doc118〜120 は「まっさらな状態から新規に作る（greenfield）」前提の設計でしたが、実装は既に存在。**doc118〜120 は削除せず設計 Candidate として温存**し、本監査で既存実装との突合結果を正本化しました。
- 注意点: 既存 LeadMap は営業のため**担当者の個人情報（PII）を保持する設計**であり、doc118〜120 の「PIIを入れない」前提とは異なります。この違いも明記されています。
- リードの二重化（新規 Lead モデルと既存の分裂）というリスクを、既存追認（案A）で回避しました。

## 変わらない約束

- **新規 `Lead` モデル・`/crm/leads` は作らない**。既存 `/leadmap` にも今回一切触っていない（read-only）。
- **外部送信は人間承認（Human Certification Gate）必須**・Consent Gate（同意・配信停止）・Security Gate（tenantId/RBAC/writeAudit/PII非注入）は既存の仕組みで充足。
- **Contact PII の追加なし・company-brain-reference（AIへの参照）変更なし**。
- GitHub が正本、Obsidian はナレッジ。

## 次の一手（すべて人間判断・別承認）

1. この監査記録（doc121）の push
2. 既存 `LocalBusinessLead` への薄い補強（archivedAt / internalNote を足すか）の実装可否判断 docs-only（別の重い承認）
3. 高機密ラベル運用の既存 Customer への接続現状監査（docs-only・別承認）

## 現在地

現在地は `369` の `tasks/CURRENT_STATE.md`＋git refs を正とする。
