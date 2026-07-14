# 完成度ギャップ監査 v1 — 「見かけの本番」vs「実完成度」

- 監査日: 2026-07（並列サブエージェント5系統による read-only 実測）
- 目的: 各"本番稼働"機能について、**成熟商用製品を100%とした実装完成度**・**検証率**・**主要省略**・**原子性リスク**を定量化し、
  「✅本番＝完成」ではなく「MVP縦切りが権限・監査ゲート付きで稼働」である実態を正本化する。
- 基準: 実測（wc/grep/コード読解）。推測は排除。

## 0. サマリ表（完成度・検証・判定）

| ドメイン | 実装完成度 | 検証（E2E/unit/原子性） | 判定 |
|---|---|---|---|
| **Phase4 AI Workforce** | **92%**（安全scope） | E2E 1159行/unit+itest 2203行/**BullMQ実Redis有**/原子性**有** | **Production-ready（安全scope）** |
| 財務 Q2C | 68% | E2E 28本・原子性は経路で混在 | hardened経路=製品水準／入金消込=MVP |
| リース/イベント | 65% | 中 | 実用MVP |
| ナレッジ brain/knowledge | 60% | E2E~10・unit厚・原子性無 | 部分実装 |
| CRM（leadmap/customers/deals） | 60% | leadmap薄/**deals空洞**・原子性無 | leadmap=MVP機能的／deals=未成熟 |
| 在庫 inventory | 55% | E2E薄・**原子性無** | プロトタイプ〜MVP |
| マーケ marketing/growth | 55% | 厚い・ブリッジ原子性有 | ガバナンス=成熟／実行=封印・未実装 |
| 会議 meetings | 50% | E2E 1本・原子性無 | MVP縦切り |
| 調達/購買/物流 | 50% | E2E薄・**非冪等** | MVP未満 |
| **会計 finance（仕訳/元帳）** | **38%** | E2E 10本・formalizeのみ原子性有 | プロトタイプ〜MVP初期 |

**総括**: Phase4（最新・Codex複数周回）が最も厚く、**古い基盤ドメイン（会計・在庫・会議・deals）が最も薄い**。品質は「後半ほど薄い」のではなく「**新しくレビューが締まった領域ほど厚い**」。

## 1. ドメイン別 実装済み/省略/リスク

### Phase4 AI Workforce（92%・Production-ready 安全scope）
- 実装: 4画面すべてread-only・取得段階ガード・`deriveAgentState`正本・`decideAiGateCore`は単一$transaction＋gate CAS＋run遷移count===1＋AI主体forbidden二重防御。
- 検証: `ai_gate_bridge.spec`(355行/実PG re-fetch)・`agent_run_lifecycle.test`(724行/90test)・BullMQ実Redis itest(343行/9)。**リポジトリ唯一の実Redis証拠**。
- 省略: ライブrun産出が朝礼1経路のみ（器は完成・供給薄）。実行系（enqueue→実行→SUCCEEDED化）は**設計上の封印**（危険ではない）。

### 財務 Q2C（68%）
- **堅牢（製品水準）**: 見積作成/見積→請求変換/領収書/請求候補正式化 は単一$transaction＋@unique barrier＋CAS。
- **MVP/本番リスク**: `recordInvoicePayment`（入金消込）は main 上で**非$transaction・status/過入金/冪等ガード無し**（※PR #45 が transaction+FOR UPDATE+VOID/DRAFTガードを追加するが未マージ。過入金・冪等キー・元帳連携は #45 でも未対応）。
- 省略: 請求書PDF/インボイス制度（税率別内訳・登録番号）/見積改訂版管理/銀行明細自動突合/入金取消・請求VOIDの逆操作/Receivable overdue自動遷移（延滞指標が死んでいる）。

### 会計 finance 仕訳/元帳（38%・最弱）
- 実装: FinanceEvent中間台帳・Operations→Finance橋渡し（冪等）・複式候補→承認→正式化（formalizeは$transaction+CAS）・資金繰り予実・利益漏れ検知。
- **致命的省略**: **JournalEntryLine が write-only**（読む集計が皆無）＝総勘定元帳・試算表・P/L・B/S・消費税集計が**生成不能**。仕訳を切っても財務諸表に反映されない。税区分/決算/締め/手動仕訳UI/修正仕訳/電子帳簿もなし。

### 在庫 inventory（55%・プロトタイプ〜MVP）
- 実装: `InventoryMovement`単一台帳（9種）・棚卸差異・発注点・大幅調整承認。
- **構造的省略**: 多拠点不可（quantityが単一スカラ）／**予約しても在庫数が減らない**（status反転のみ・on-hand vs available未分離）／ロット・シリアル・原価計算(移動平均)なし。
- **原子性: `applyInventoryMovement` が非$transaction read-modify-write** → 並行入庫/調整で**lost update＝在庫数破損**。

### 調達/購買/物流（50%・MVP未満）
- 実装: Vendor/PO(draft→received)/入庫在庫加算/物流タスク。
- **省略**: 入荷検品・部分入荷・3-way match・仕入先評価なし。**`receivePurchaseOrder` に status ガード無し＝二重受領で在庫水増し（非冪等）**。

### リース/イベント（65%・実用MVP・operations内で最良）
- 実装: リース予約（重複判定付）→出庫→返却→破損／イベント案件（原価/売上/粗利/人件費/リスク/AI提案/Finance橋渡し）。
- 省略: `assignAssetToEventAction` に在庫超過チェック無し（リースとの二重引当可）／見積・契約・スケジュール・デポジットなし。

### ナレッジ brain/knowledge（60%・部分実装）
- 実装: Brain4種CRUD・顧客許諾台帳（成熟寄り）・意味検索・AI Q&A（引用/信頼度）。
- 省略: 独立記事CRUDなし（会議取込経由のみ）・バージョンUIなし（KnowledgeVersion未使用）・**pgvector不使用**（全テナントchunkをメモリでcosine=O(N)）・参照選択UI未実装。

### CRM leadmap/customers/deals（60%）
- 実装: **leadmap≈80%**（開拓→AI分析→下書き→承認送信→返信分類→顧客/案件化の一気通貫）。customers ABAC二段read gate。
- **空洞（deals≈35%）**: 標準の案件起票UI無し（変換経路のみ）／**活動履歴がseed専用（実行時記録action無し）**／名寄せ・加重予測・予実なし／**dealsのE2Eはsmoke見出し1アサーションのみ**。
- 原子性: `convertLeadToCustomerAction`(6書込)/`requestOutreachApprovalAction`(4書込)が**非$transaction**（孤児Customer・宙吊りPENDINGリスク）。

### マーケ marketing/growth（55%）
- **成熟（設計・検証とも）**: AI下書き→人間承認→社内状態遷移のブリッジは単一$transaction＋CAS＋AI一律拒否＋DB evidence spec複数。
- 省略: セグメント/A-Bテスト/リード育成が丸ごと無し・効果測定は手入力依存・外部配信は封印（設計）。

### 会議 meetings（50%・MVP縦切り）
- 実装: テキスト議事録貼付→AI要約→決定/タスク抽出→RAG投入・機密/同意ゲート。
- 省略: **実音声/動画アップロード不在**（Recordingモデルは未使用・UIの「Whisper差し替え可能」は実体なし）／編集・共有・PDF出力なし／AgendaItem・MeetingRiskFinding未使用／generatedByが実LLM時も'FakeLLM'固定（来歴誤記）。
- 原子性: 約12連続書込が非$transaction。

## 2. 横断で最も危険（機能欠落ではなく"壊れる/整合しない"リスク）

| # | リスク | 影響 | 対応状況 |
|---|---|---|---|
| 1 | 入金消込 非原子＋過入金/status/冪等ガード欠如 | 資金繰り実績の過大計上・売掛水増し | 原子性はPR #45で対応中／過入金・冪等は未対応 |
| 2 | 在庫台帳 非原子 read-modify-write | 並行操作で**在庫数破損（lost update）** | 未着手 |
| 3 | 発注入庫 非冪等（statusガード無し） | 二重受領で在庫水増し | 未着手 |
| 4 | リース/イベント 二重引当（TOCTOU・在庫無検証） | ダブルブッキング | 未着手 |
| 5 | convertLeadToCustomer 6書込 非原子 | 孤児Customer・未変換Lead | 未着手 |
| 6 | 会計 元帳に出口なし | 試算表・P/L・B/S・税集計が生成不能 | 未着手（会計本体の設計要） |
| 7 | Receivable overdue 自動遷移なし | 延滞金額/件数が死んだ指標 | 未着手 |
| 8 | 入金取消/請求VOID の逆操作なし | 誤入金・誤請求を訂正できない | 未着手 |

**operations 33アクション中 `$transaction` は実測0件**。原子性は最近hardeningした finance一部/marketingブリッジ/Phase4 に偏在。

## 3. 是正ロードマップ（危険度×実害 優先）

**Wave 1（データ破損・金額整合の直接リスク・最優先）**
1. 入金消込：過入金/status/冪等ガード追加（#45にFOR UPDATE有・不足分を追補）
2. 在庫 `applyInventoryMovement`：$transaction＋行ロック（在庫破損の根絶）
3. 発注入庫 冪等化（statusガード）／リース・イベント二重引当チェック統一
4. convertLeadToCustomer 等 CRM 6書込の$transaction化

**Wave 2（死んだ指標・逆操作・整合）**
5. Receivable overdue 自動遷移（worker）
6. 入金取消/請求VOID の監査可能な逆操作
7. 会議12書込の$transaction化

**Wave 3（会計本体・検証backfill）**
8. 会計の出口（元帳→試算表→P/L・簡易）＋税区分の設計Gate
9. deals/leadmap/meetings の実DB E2E backfill（薄い所を Phase4/Q2C の証拠バーへ）

**恒久封印/別Gate（速度のために緩めない）**: 実課金・外部送信・実LLM・AI実行系・多拠点/ロット/原価などの大型機能拡張は人間の意思決定。

## 4. 結論
- Phase4 は「雑」ではなく**最も厚い（Production-ready 安全scope）**。品質は右肩上がり。
- 「✅本番」は**MVP縦切りの稼働**であって機能完成ではない（会計38%・会議50%・在庫55%等）。表記が完成度を過大に見せていた点を是正する。
- 最優先は**新機能ではなく Wave 1 のデータ破損リスク（在庫・入金・二重引当）**の原子性hardening。
