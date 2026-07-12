# 369 OS V72 競合Capability Fit-Gap監査

- 調査日: 2026-07-13 JST
- 対象: Salesforce Sales Cloud、Money Forward クラウド、freee会計・人事労務、電子帳簿保存
- 比較単位: 公開された業務capabilityと369完全機能台帳の既存Function ID
- 判定資料: `COMPLETE_FUNCTION_LEDGER_V1.md`、`FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md`、公式公開資料
- 禁止: 競合UI・文章・コードの模倣、証拠のない同等以上宣言、正式IDの創作

## 1. 判定方法

状態語彙は次だけを使う。

- `ROADMAP_ONLY`: 台帳・計画はあるが固定実装証拠なし。
- `DRAFT_IMPLEMENTED`: Draft branchに限定実装あり。
- `CI_VERIFIED`: 固定SHAのCI証拠あり。
- `CODEX_VERIFIED`: Codex独立監査済み。
- `HUMAN_PREVIEW_VERIFIED`: 同一SHAのPreviewを人間が確認。
- `MAIN_MERGED`: main統合済み。
- `PRODUCTION_VERIFIED`: Production受入条件を実測。
- `EVIDENCE_GAP`: 実装候補はあるがFunction ID単位の独立証拠不足。

コードにモデルや画面名が見えても、Function Evidenceに固定SHAと受入条件がなければ完成扱いにしない。外部製品の機能名は比較用であり、369では独自UI・独自業務設計として実装する。

## 2. Salesforce型 CRM / SFA

Salesforce公式資料が示す営業基盤の起点を、顧客・リード・商談・活動・pipeline・予測・レポート・自動化・連携に分解した。

| Capability | 369既存ID | V72 Evidence | Fit-Gap | 次の安全な縦切り |
|---|---|---|---|---|
| Account / Customer / Contact | `C08-001`、`C08-003`、`C08-004` | `EVIDENCE_GAP` | モデル・画面候補はあるが、V72固定SHAでCRUD/RBAC/監査をID単位再監査していない | read-only一覧・詳細、tenant/RBAC、PII最小select、DataAccessLog |
| Lead | `C08-002`、`C09-001` | `EVIDENCE_GAP` | LeadMapの既存系譜あり。公式API/許諾/Demo境界を含む最新Evidence不足 | lead取得元、同意、重複候補、担当割当を外部送信なしで監査 |
| Opportunity / Deal | `C09-002`、`C09-003`、`C09-025`〜`C09-045` | `EVIDENCE_GAP` | 案件・pipeline候補はあるがFunction ID別の最新固定証拠不足 | Deal CRUD、stage履歴、金額権限、監査、失注理由 |
| Pipeline / Stage | `C09-004`、`C09-005`、`C09-026` | `EVIDENCE_GAP` | Kanban候補あり。競合race、履歴、RBACの独立証拠不足 | stage CAS、履歴、並行更新、mobile操作 |
| Activity / Task / Meeting | `C09-007`〜`C09-015` | `EVIDENCE_GAP` | タスク・会議・interaction候補はあるが統合timeline証拠不足 | 1顧客timelineのread-only集約、PII/tenant/監査 |
| Forecast / Territory / Quota | `C09-006`、`C09-018`、`C09-020`〜`C09-023` | `ROADMAP_ONLY` | 設定値と実測値を分けた予測Evidenceなし | 決定論的集計、信頼度、根拠、未計測表示 |
| Lead/Customer scoring | `C08-059`、`C08-075`〜`C08-090` | `ROADMAP_ONLY`中心 | AI推奨の根拠、評価、bias、human overrideが未証明 | Fake決定性、説明、下書き、承認、成果台帳 |
| AI Sales assistance | `C09-046`〜`C09-062` | `EVIDENCE_GAP` | 一部AI下書き候補はあるが一括完成ではない | 1用途ずつFake/Zod/根拠/人間承認。送信なし |
| Workflow / Approval | `C03-022`〜`C03-050`、`C27-*` | C21限定`CODEX_VERIFIED` | content reviewは合格。汎用workflow、分岐、timer、retryは未完成 | Workflow Dry Runをpure functionで先行し、危険ActionをBLOCKED |
| Reports / Dashboard | `C28-*` | 限定`CODEX_VERIFIED` | Growth/AI社員の限定dashboardあり。CRM分析全体は未証明 | pipeline、activity、conversionをtenant単位read-only表示 |
| API / Salesforce connector / migration | `C34-012`、`C41-027` | `ROADMAP_ONLY` | OAuth、sync、rate limit、field mapping、conflict未実装 | schema/API/Secretsの人間Gate後にread-only import sandbox |
| Offline / mobile sales | 対応する正式IDは要再突合 | `ROADMAP_ONLY` | responsive UIの一部のみ。offline queue/conflictなし | `UNMAPPED_CANDIDATE`のまま要件化し、正式IDを創作しない |

**結論**: CRM/SFAの骨格候補は存在するが、Salesforce相当の全capabilityを`CODEX_VERIFIED`にはできない。次段はWave 2として、IDごとの薄い縦切りと受入証拠を積む。

## 3. Money Forward / freee型 会計・財務

Money Forward公式は会計、請求、経費、給与等の連携、自動仕訳、帳票、決算、経営レポートを主要機能として示す。freee公式は帳簿、決算、証憑・電子取引保存、人事労務の一体運用を示す。369では会計確定、税務判断、資金移動をAI単独で行わない。

| Capability | 369既存ID | V72 Evidence | Fit-Gap | 人間Gate / 次段 |
|---|---|---|---|---|
| 見積・契約・請求 | `C10-*`、`C11-*`、`C12-*` | `EVIDENCE_GAP` | 既存画面・モデル候補あり。法的文書、番号採番、取消、税、監査の総合証拠不足 | read-only→下書き→承認。契約確定・外部送信は人間 |
| 売掛・入金・消込 | `C13-001`〜`C13-034` | `EVIDENCE_GAP` | 入金候補・消込候補はあるが銀行feedと確定処理未証明 | 実銀行/OAuth/資金移動禁止。CSV sandboxから開始 |
| 仕訳・勘定科目・補助科目 | `C14-001`〜`C14-011` | `EVIDENCE_GAP` | schema/候補実装をFunction ID別に独立検証していない | 仕訳はDraft、承認後も人間確定。税区分は専門家Gate |
| 月次・年次締め | `C14-012`、`C14-013` | `ROADMAP_ONLY` | period lock、再オープン、締め監査、決算受入証拠なし | 会計専門家レビューと実PG整合試験 |
| AR/AP・未収未払 | `C14-017`〜`C14-021` | `EVIDENCE_GAP` | 限定集計候補のみ。総勘定元帳との一致証拠なし | double-entry不変条件とtransaction試験 |
| Cash flow / 予実 / 部門PL | `C14-022`〜`C14-029` | `EVIDENCE_GAP` | read-only画面候補あり。設定値/自己申告/実測の混同を全経路監査していない | 根拠・as-of・単位・未計測を表示 |
| AI会計補助 | `C14-036`〜`C14-048` | `ROADMAP_ONLY`中心 | 仕訳・税区分・異常値の候補を完全実装した証拠なし | Fake/Zod/根拠/信頼度/人間review。自動確定禁止 |
| 監査証跡 | `C14-035`、`C03-*` | 限定`CODEX_VERIFIED` | C21/C19/P4の限定監査は確認。会計ledger全体は未確認 | append-only、before/after、period、actor、export Gate |
| freee / Money Forward連携 | `C14-031`、`C14-032`、`C34-035`、`C34-036` | `ROADMAP_ONLY` | adapter、OAuth、差分sync、conflict、rate limit未実装 | Secrets/OAuthの人間Gate。最初はread-only import |
| CSV移行 | `C14-034`、`C41-030`、`C41-031` | `ROADMAP_ONLY` | mapping、validation、dry-run、rollback未証明 | Workflow Dry Runと隔離tenantで検証 |
| 経費・領収書OCR | `C17-047`、`C35-014`、`C35-015` | `ROADMAP_ONLY` | OCR精度、証憑関連付け、重複、改ざん検知なし | 画像/PII/保存期間の人間Gate。候補出力のみ |
| 固定資産・減価償却 | `UNMAPPED_CANDIDATE` | `ROADMAP_ONLY` | 完全台帳の正式ID再突合が必要。実装証拠なし | 税務・会計専門家とID正本化後に着手 |

**結論**: 369はMoney Forward/freeeを置換済みではない。Wave 3で会計の不変条件、帳票、証憑、外部会計連携を順に実装し、実送金・税務断定・無承認仕訳確定は人間Gateに残す。

## 4. 人事・労務・給与

Money Forwardとfreeeの公式機能は、従業員情報、勤怠、給与、入退社、年末調整、社会保険等を含む。369の完全台帳では採用`C23`、従業員・勤怠・評価`C24`を持つが、給与計算等は正式IDと実装証拠の双方が不足する。

| Capability | 369既存ID | V72 Evidence | Fit-Gap | 人間Gate / 次段 |
|---|---|---|---|---|
| Employee Master / 組織 | `C24-001`、`C24-006`〜`C24-012` | `EVIDENCE_GAP` | user/RBACはあるが労務masterとしての履歴・適用日・PII統制未証明 | read-only employee master、履歴、権限、DataAccessLog |
| 入社・退職・休復職 | `C24-002`〜`C24-005` | `ROADMAP_ONLY` | workflow、書類、権限停止、再雇用の受入証拠なし | PIIと法定書類の人間Gate、dry-run先行 |
| 勤怠・休暇・シフト | `C24-020`〜`C24-029` | `ROADMAP_ONLY`中心 | 打刻、丸め、申請、承認、締め、修正履歴未証明 | 法令/就業規則レビュー、mobile、監査 |
| 給与連携 | `C24-035` | `ROADMAP_ONLY` | 給与master・計算engine・明細・振込未実装 | 実給与確定・振込は人間。外部連携はOAuth Gate |
| 給与計算・年末調整・社会保険 | `UNMAPPED_CANDIDATE` | `ROADMAP_ONLY` | 正式Function ID、法令更新、計算、電子申告の証拠なし | 社労士・税理士・法務レビュー必須 |
| 評価・配置 | `C24-036`〜`C24-049` | `ROADMAP_ONLY`中心 | 評価確定、bias、異議申立、履歴、権限制御未証明 | AIは要約・候補のみ。評価確定は人間 |
| 採用 | `C23-001`〜`C23-038` | `EVIDENCE_GAP` | イベント/案件候補はあるがATS全体の固定証拠なし | 合否自動決定禁止。候補要約と質問下書きから開始 |

## 5. 電子帳簿保存

国税庁は電子帳簿等保存制度を電子帳簿、スキャナ保存、電子取引等の制度として案内している。freee公式ヘルプも帳簿、決算関係書類、紙証憑、電子取引データを区分している。

| 要件群 | 369対応ID | V72 Evidence | Gap |
|---|---|---|---|
| 国税関係帳簿 | `C14-001`〜`C14-035` | `EVIDENCE_GAP` | 法的保存要件、訂正削除履歴、検索、出力、期間保持の総合証拠なし |
| 決算関係書類 | `C14-012`、`C14-013`、関連帳票は要突合 | `ROADMAP_ONLY` | 決算帳票と法的保存の受入証拠なし |
| スキャナ保存 | `C35-014`、`C35-015`、他は`UNMAPPED_CANDIDATE` | `ROADMAP_ONLY` | タイムスタンプ、解像度、検索、訂正履歴、原本運用未設計 |
| 電子取引保存 | `UNMAPPED_CANDIDATE` | `ROADMAP_ONLY` | 受領、真実性、可視性、検索、保存期間、export未実装 |
| インボイス制度 | `UNMAPPED_CANDIDATE` | `ROADMAP_ONLY` | 適格請求書要件、登録番号、税率、端数、訂正の専門家確認が必要 |

法令適合はコードだけで自己宣言しない。制度更新を追う責任者、専門家レビュー、運用規程、保存期間、監査、障害時復旧まで揃って初めてProduction Gateへ進める。

## 6. 外部連携候補と人間Gate

| Gate | AI/Codex/Claudeが人間なしで進められる上限 | 人間が必要な境界 |
|---|---|---|
| Salesforce/freee/Money Forward connector | interface、Fake adapter、mapping、dry-run、否定テスト | OAuth app、Secrets、実tenant、利用規約、API課金、Production sync |
| 会計 | read-only集計、候補、異常検知、説明、承認依頼 | 仕訳確定、月次/年次締め、税務判断、送金、支払 |
| 人事労務 | read-only master、候補、書類下書き、リスク表示 | 採否、評価、給与、懲戒、社会保険・税申告 |
| 電子帳簿 | 要件台帳、データmodel案、検索/保持のpure test | 法令適合判断、運用規程、Production保存、監査対応 |

## 7. 段階ロードマップ

1. **Wave 1**: 各カテゴリで`read-only分析 -> AI下書き -> 人間承認 -> 統制実行 -> 成果台帳`。外部作用は封印。
2. **Wave 2**: `C08/C09/C26/C27/C28`をFunction ID単位でCRM/SFA/Serviceへ拡張。
3. **Wave 3**: `C10-C14/C17/C34/C41`を会計・請求・経費・connectorへ拡張。
4. **Wave 4**: `C23/C24`と正式ID化後の給与・年末調整・社会保険・電子帳簿。
5. **Wave 5**: 外部連携、Marketplace、Enterprise、Global。各外部作用は個別人間Gate。

## 8. 公式資料

- [Salesforce Sales Cloud公式資料](https://www.salesforce.com/content/dam/web/ja_jp/www/cloud-services/documents/Sales_Getting_Started_WithSalesCloud.pdf)
- [Money Forward クラウド会計の機能](https://biz.moneyforward.com/accounting/smb/function/)
- [Money Forward クラウド人事管理の機能](https://biz.moneyforward.com/employee/function/)
- [Money Forward クラウド給与の機能](https://biz.moneyforward.com/payroll/function/)
- [Money Forward クラウド勤怠の機能](https://biz.moneyforward.com/attendance/function/)
- [freee人事労務 機能帳票一覧](https://www.freee.co.jp/hr/features/list/)
- [freee 電子帳簿保存法の概要・手続](https://support.freee.co.jp/hc/ja/articles/4410254921497)
- [国税庁 電子帳簿等保存制度特設サイト](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/index.htm)

本監査は2026-07-13時点の公開情報を比較起点にしたもので、各競合製品の完全な仕様書ではない。369の実装可否は完全機能台帳と固定SHA Evidenceを正とする。
