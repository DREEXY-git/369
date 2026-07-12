# 競合Capability Fit-Gap V72

2026-07-13、Salesforce、Money Forward、freee、人事労務、電子帳簿の公式公開情報を、369完全機能台帳の既存Function IDへ照合した。

## 結論

- Salesforce型CRM/SFAは`C08/C09`に広い要求台帳を持ち、Customer、Lead、Deal、Pipeline等の実装候補もある。ただしFunction ID単位の固定Evidenceが不足し、競合同等とは判定しない。
- 会計・財務は`C10-C14`に見積、契約、請求、入金、仕訳、資金繰り等を持つが、締め、法定帳票、固定資産、税務、外部会計連携は`ROADMAP_ONLY`または`EVIDENCE_GAP`。
- 人事・労務は`C23/C24`に採用、従業員、勤怠、評価を持つ。給与計算、年末調整、社会保険は正式IDと実装証拠の双方が不足し`UNMAPPED_CANDIDATE / ROADMAP_ONLY`。
- 電子帳簿は帳簿、決算書類、スキャナ保存、電子取引保存、インボイスの法的・運用証拠が未整備。専門家と人間Gateが必要。

## Evidence規律

状態は`ROADMAP_ONLY / DRAFT_IMPLEMENTED / CI_VERIFIED / CODEX_VERIFIED / HUMAN_PREVIEW_VERIFIED / MAIN_MERGED / PRODUCTION_VERIFIED / EVIDENCE_GAP`だけを使う。モデルや画面が見えても固定SHAの受入証拠がなければ完成扱いにしない。

## 段階実装

1. Wave 1: 各カテゴリをread-only分析、AI下書き、人間承認、統制実行、成果台帳の順で薄く縦切り。
2. Wave 2: `C08/C09/C26/C27/C28`のCRM/SFA/Service。
3. Wave 3: `C10-C14/C17/C34/C41`の会計、請求、経費、connector。
4. Wave 4: `C23/C24`と給与、年末調整、社会保険、電子帳簿。
5. Wave 5: 外部連携、Marketplace、Enterprise、Global。

実送金、実支払、税務・労務の確定判断、採否・評価・給与確定、OAuth/Secrets、Production syncは人間Gateに残す。

## 公式調査起点

- [Salesforce Sales Cloud](https://www.salesforce.com/content/dam/web/ja_jp/www/cloud-services/documents/Sales_Getting_Started_WithSalesCloud.pdf)
- [Money Forward クラウド会計](https://biz.moneyforward.com/accounting/smb/function/)
- [Money Forward クラウド人事管理](https://biz.moneyforward.com/employee/function/)
- [Money Forward クラウド給与](https://biz.moneyforward.com/payroll/function/)
- [Money Forward クラウド勤怠](https://biz.moneyforward.com/attendance/function/)
- [freee人事労務](https://www.freee.co.jp/hr/features/list/)
- [freee 電子帳簿保存法](https://support.freee.co.jp/hc/ja/articles/4410254921497)
- [国税庁 電子帳簿等保存制度](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/index.htm)

詳細はGitHub正本`docs/coordination/codex/COMPETITOR_FIT_GAP_V72.md`と[[PhaseReadinessMatrixV3]]を参照する。競合のUI、文章、コードは模倣せず、公開capabilityと業務要件から独自実装する。
