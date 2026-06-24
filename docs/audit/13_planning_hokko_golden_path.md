# 13 — Planning Hokko Golden Path 監査（Phase 1-11）

プランニングホッコー向けの中心業務フロー（顧客→案件→…→請求→入金→資金繰り→経営可視化）を
「本当にUIから一本で進められるか」で監査し、薄い継ぎ目を最小補強した記録。
方針: 横展開せず、新規DBモデルを追加せず、既存モデルを連結して Golden Path を通す。

## Golden Path 20ステップ 監査結果

判定凡例: ✅ UIから完全に通る / △ 部分的・別画面 / ⚠️ libはあるがUI継ぎ目が弱い / ❌ 未実装

| # | ステップ | 監査前 | 監査後 | 実体 |
|---|---|---|---|---|
| 1 | 顧客作成 | ✅ | ✅ | /customers/new |
| 2 | イベント案件作成 | ✅ | ✅ | /operations/events/new（顧客選択あり＝1と連結） |
| 3 | 商品・備品割当 | ✅ | ✅ | event detail: assignAssetToEventAction |
| 4 | リース予約・在庫予約 | △ | △ | 割当は event detail、リース予約は /inventory/lease（分離。P2で統合余地） |
| 5 | 配送・設営・撤去・回収 | ✅ | ✅ | event detail: createEventLogisticsTasksAction（一括） |
| 6 | 人員配置 | ✅ | ✅ | event detail: assignEventStaffAction |
| 7 | イベントリスク登録 | ✅ | ✅ | event detail: createEventRiskAction（任意ステップ） |
| 8 | 原価登録 | ✅ | ✅ | event detail: recordEventCostAction（財務権限で表示） |
| 9 | 売上登録 | ✅ | ✅ | event detail: recordEventRevenueAction |
| 10 | 粗利計算 | ✅ | ✅ | event detail: calculateEventProfitabilityAction |
| 11 | Finance Bridge作成 | ⚠️ | ✅ | **新規: event detail から bridgeEventToFinanceAction（冪等）**。従来は /finance/bridge のみ |
| 12 | 請求候補作成 | ✅ | ✅ | bridge時に InvoiceCandidate 自動生成 |
| 13 | 仕訳候補作成 | ✅ | ✅ | bridge時に JournalCandidate 自動生成 |
| 14 | 正式請求書化 | ✅ | ✅ | /finance/invoice-candidates → 承認 → 正式化 → /invoices/[id] |
| 15 | 送信承認申請 | ✅ | ✅ | /invoices/[id]（Phase 1-10） |
| 16 | 承認後送信 | ✅ | ✅ | /invoices/[id]（Phase 1-10、executeApprovedAction） |
| 17 | 入金記録 | ✅ | ✅ | /invoices/[id]（Phase 1-10） |
| 18 | 売掛金回収 | ✅ | ✅ | 入金で Receivable.status=collected（Phase 1-10） |
| 19 | 資金繰り反映 | ✅ | ✅ | /finance/cashflow 予定vs実績（Phase 1-10） |
| 20 | 経営ダッシュボード | △ | △ | /dashboard/ceo は Deal中心。EventProject Golden Path 横断指標は未集約（P1残） |

監査前の結論: **データ層は20ステップ全て lib+action+DB が存在**。問題は「継ぎ目の遷移性」と「現在地/次の一手の不在」。

## 監査で補強した内容（Phase 1-11）

- **純ロジック** `packages/shared/src/golden-path.ts` `computeGoldenPath()`:
  既存モデル由来の事実（件数/金額/ステータス）だけを受け取り、各ステップ status・次アクション・進捗％・低粗利警告・全額回収判定を返す純関数（UI/DB非依存）。
- **集約クエリ** `apps/web/lib/domains/operations/golden-path.ts` `getEventGoldenPathStatus()`:
  EventProject の counts ＋ FinanceEvent(event_revenue=bridged) ＋ InvoiceCandidate(sourceType=EventProject) ＋ Invoice(via invoiceId) を横断集約し computeGoldenPath を呼ぶ。
- **bridge 冪等化** `bridgeEventProjectToFinance`:
  既存 InvoiceCandidate(sourceType=EventProject) があれば二重生成しない（event detail / bridge どちらから来ても安全）。
- **event detail UI** `/operations/events/[id]`:
  「Golden Path — 現在地と次の一手」カード（進捗バー、次アクション、Finance Bridge ボタン、請求候補/請求書/資金繰りリンク、顧客表示、低粗利警告）。
- **薄い action** `bridgeEventToFinanceAction`（operations/actions.ts）: 認証→finance権限→lib呼び出し→event詳細へ戻る。
- **入口** `/planning-hokko`: 各案件カードを event detail へリンク、「次の一手」導線を明示。

## まだ残る実務上の不足

- **20 経営ダッシュボード**: CEO コックピットは Deal 中心で、EventProject Golden Path の粗利/回収/資金繰りを横断集計していない（P1残）。
- **4 リース/在庫予約**: event detail の「商品割当」と /inventory/lease の予約が分離（P2）。
- 請求の「候補→正式化」承認と「正式 Invoice の外部送信」承認がともに ApprovalRequest.action='invoice_send'（識別は payload で実施）。可読性のため将来 `invoice_finalize` 分離が望ましい（P2、03 参照）。
- 入金消込が複数 await（非トランザクション）。途中失敗時の整合は将来ハードニング（P2）。

## 営業デモとして使える範囲

- 顧客→案件→商品/物流/人員/原価/売上/粗利→**Finance Bridge（案件詳細から1クリック）**→請求候補→正式請求書→送信承認→入金→資金繰り反映 までを、案件詳細の「現在地と次の一手」に沿って一本で実演可能。
- 財務機密（原価/粗利/請求金額/資金繰り）は権限分離（スタッフは不可視）。

## 本番提供できない理由（正直な評価）

- 実メール送信は既定 OFF（EXTERNAL_SEND_ENABLED=false で監査のみ）。実運用は配信/バウンス/再送設計が未了。
- 本格会計（試算表/決算書）・銀行API入金照合・OCR・契約/給与/労務・AI社員本体は未着手（P2、対象外）。
- 経営ダッシュボードの案件横断 KPI 集約が未了。

## 次Phaseで本当にやるべきこと

1. 経営ダッシュボードに Golden Path KPI（進行中案件の進捗・粗利・未回収・資金繰り影響）を集約（ステップ20の完成）。
2. リース/在庫予約と案件商品割当の統合（ステップ4）。
3. デモシナリオ seed の強化（入金前/入金済の両案件、承認待ち）。
4. 承認種別の `invoice_finalize` / `invoice_send` 分離（可読性・監査性）。
