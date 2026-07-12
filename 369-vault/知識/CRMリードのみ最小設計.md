# CRMリードのみ最小設計 — 「リードだけ」を実装判断できる細かさまで紙で設計した回（READY / GO）

> 出典（正本）: `369` リポジトリ `docs/audit/119_crm_lead_only_minimum_design.md`（判定 READY / GO）。本ノートはその要約。
> 関連: [[CRM最小縦切り方針決定]] / [[CRMリードのみ実装Gate]]

## これは何か

- 前回（doc118）で推奨した CRM の最初の範囲「**Lead-only（リードだけ）**」について、**実装に進む判断ができる細かさまで紙で設計しただけ**の回です。
- これは**設計（Candidate）の記録**であり、実装ではありません。**schema変更なし・migrationなし・画面なし・Server Action なし**。コードは1行も変わっていません。
- 設計の正本は `docs/roadmap/20_crm_lead_only_minimum_design_candidate.md` です。

## どんな設計にしたか（やさしい言い換え）

- リード（Lead）に持たせるのは「会社名・拠点名レベル・取得元・状態・担当・社内メモ」**まで**に限定。**顧客の個人情報（Contact PII）は初期範囲に入れません**。必要になったら停止して別承認にします。
- 消すときは物理削除せず「アーカイブ（archivedAt）」。書くたびに監査ログ（writeAudit）。
- Lead-only の間は機密度を **NORMAL/INTERNAL のみ**とし、機密参照ログ（writeDataAccess）は原則不要。PII を扱う段階になったらそこが停止条件です。
- 権限は「`crm:*` を新設するか、既存の knowledge 権限で代替するか」を比較したうえで、**この設計では RBAC を変更せず**、決定は実装時の別承認に委ねました。
- 候補列や status enum は設計案であり、まだデータベースには反映していません。

## 変わらない約束

- **Contact PII を初期範囲に入れない**（必要になったら停止・別承認）。
- **顧客PIIを company-brain-reference（AIへの参照）に注入しない**。AIは下書き・提案のみ・外部送信なし。
- **tenantId 必須・RBAC・writeAudit** を全体前提とする。RBAC 定義・権限定義はこの設計では変えていません。
- GitHub が正本、Obsidian はナレッジ。

## 次の一手（すべて人間判断・別承認）

1. この設計記録（doc119）の push
2. CRM Lead-only 実装スプリント可否の最終判断（schema化・migration・`crm:*` 新設の是非を決める別の重い承認）→ [[CRMリードのみ実装Gate]]
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）

## 現在地

現在地は `369` の `tasks/CURRENT_STATE.md`＋git refs を正とする。
