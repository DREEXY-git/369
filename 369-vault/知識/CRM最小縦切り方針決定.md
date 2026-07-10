# CRM最小縦切り方針決定 — 3案を比較して「リードだけ」を推奨した回（READY / GO）

> 出典（正本）: `369` リポジトリ `docs/audit/118_crm_minimum_vertical_slice_decision.md`（判定 READY / GO）。本ノートはその要約。
> 関連: [[CustomerPainスキーマ設計]] / [[CRMリードのみ最小設計]]

## これは何か

- 今回は、CRM/SFA（顧客管理・営業支援）を最初にどこまで薄く作るかを、**案A: Lead-only（リードだけ）／案B: Lead+Deal（リード＋商談）／案C: Lead+Deal+Pipeline（＋パイプライン）** の3案で比較し、**どれから進めるべきかを紙の上で判断しただけ**の回です。
- **推奨は案A（Lead-only）**。実装は一切しておらず、コードは1行も変わっていません。**schema変更なし・migrationなし**の docs-only（判断の記録）です。

## なぜ案Aなのか（やさしい言い換え）

- 顧客の個人情報（Contact PII）を**最小化**でき、権限・監査・テナント分離という土台に集中できるため。
- 営業デモにも使え、次の段階（Lead+Deal）へ進む条件を設計しやすいため。「薄い縦切り優先」の方針に一番合う安全側の選択です。
- 比較の詳細は `docs/roadmap/19_crm_minimum_vertical_slice_candidate.md` が正本。各案を目的・入れる/入れないデータ・PIIリスク・各Gate・停止条件などで比較しています。
- 過剰設計（いきなり案C）を避け、段階的に進むための**停止条件**も明記されています。

## 変わらない約束

- **Contact PII（顧客の個人情報）は初期範囲に入れない**。必要になったら停止して別承認。
- **顧客PIIを company-brain-reference（AIへの参照）に注入しない**。AIは下書き・提案のみ。
- 外部送信・契約・値引き・請求は **Human Certification Gate（人間承認）必須**（今回は実装していない）。
- 全案共通で **tenantId 必須・RBAC・writeAudit・writeDataAccess・Data Classification** を前提とする。
- GitHub が正本、Obsidian はナレッジ。特定SaaS名は例示に留め、契約判断・実連携はしない。

## 次の一手（すべて人間判断・別承認）

1. この判断記録（doc118）の push
2. 案A Lead-only を実装判断できる粒度まで設計する docs-only（別の重い承認）→ [[CRMリードのみ最小設計]]
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）

## 現在地

現在地は `369` の `tasks/CURRENT_STATE.md`＋git refs を正とする。
