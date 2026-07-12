# CRMリードのみ実装Gate — 作り始めてよいかを紙で最終判断した回（READY / GO）

> 出典（正本）: `369` リポジトリ `docs/audit/120_crm_lead_only_implementation_gate.md`（判定 READY / GO）。本ノートはその要約。roadmap正本は `docs/roadmap/21_crm_lead_only_implementation_gate_candidate.md`。
> 関連: [[CRMリードのみ最小設計]] / [[CRMLeadMap既存実装突合]]

## これは何か

- doc118（3案比較）と doc119（Lead-only 最小設計）を前提に、CRM の「**Lead-only（リードだけ）**」を**次に本当に手を動かして作り始めてよいか、条件が揃っているかを紙で最終判断しただけ**の回です。
- 結論は「**条件は揃っている（READY / GO）**」。ただしこれは「揃っている」の確認であって、**実際に作り始めるのはさらに別の承認（roadmap/21 §30 の別承認文言）が必要**です。
- コードは1行も変わっていません。**schema変更なし・migrationなし・RBAC変更なし**の docs-only（判断の記録）です。

## どんな条件で「GO」なのか（やさしい言い換え）

- 実装範囲は **Lead 1テーブル＋作成/編集/アーカイブ＋一覧**に限定。schema 追加は1・migration は1本まで（実装時・別承認）。
- **顧客の個人情報（Contact PII）は入れない**。機密度は NORMAL/INTERNAL のみ。
- 権限は**既存の knowledge 権限のまま暫定**（RBAC 無変更）。`crm:*` の新設は本格化時の別承認。
- 実装案の選択肢（案X/Y/Z）と推奨判断・停止条件・実装へ進む場合の別承認文言（案）まで roadmap/21 に整理済み。
- 「READY / GO」を「もう実装した」と誤読しないこと。**判定＝条件確認、着手＝別承認**という二段構えです。

## 変わらない約束

- **Contact PII を入れない**・**company-brain-reference（AIへの参照）を変更しない**・**AIロールに mutation（変更権限）を与えない**。
- **外部送信なし**。外部送信・契約などの危険操作は Human Certification Gate（人間承認）・Consent Gate・Security Gate が前提。
- **tenantId 必須・RBAC・writeAudit・Data Classification** を前提とする。
- GitHub が正本、Obsidian は閲覧。

## 次の一手（すべて人間判断・別承認）

1. この判断記録（doc120）の push
2. CRM Lead-only 実装スプリント着手（roadmap/21 §30 の別承認文言に基づく別の重い承認）
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）

## 現在地

現在地は `369` の `tasks/CURRENT_STATE.md`＋git refs を正とする。
