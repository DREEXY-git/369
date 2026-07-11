# 67. Customer/Contact PII 経路の機械監査と修正（WIP-6）— 経路台帳＋Gate（Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/166_pii_path_machine_audit.md`
- 前提: WIP-5 CI green 確認済み（run 29139617815 #163・`93 passed (1.3m)` / 0 failed・head ea6e0b9）
- 手法: `prisma.customer` / `prisma.contact` / customer include/select / email/phone select を apps/web・apps/worker 全域で機械列挙（29経路）→ 各経路を実読し、到達主体・取得列・出力先・ラベルガード・tenant スコープを判定。

## 1. 経路台帳（要約）

| ID | 経路 | 到達主体 | 出力先 | 判定 |
|---|---|---|---|---|
| P-01〜06 | customers/*（一覧・詳細・編集・timeline・insights・actions） | customer:read＋ABAC | 表示 | OK（WIP1 閉境界） |
| P-07 | deals 系4画面の顧客名 | deal:read＋可視ラベル | 表示 | OK（WIP-4） |
| P-08 | quotes 系＋print の顧客名・候補・action 検証 | quote:read/create | 表示・印刷 | OK（WIP-4） |
| P-09 | invoices 系＋print（envelope→assert→fetch） | FINANCIAL ABAC | 表示・印刷 | OK（WIP-4） |
| P-10 | operations/events/new 候補 | ゲート＋可視ラベル | 表示 | OK（WIP-4） |
| **P-11** | golden-path-dashboard.ts:47 → **/planning-hokko**（全案件の顧客名） | **認証のみ**（外部ロール含む） | 表示 | **Critical → 本 WIP で修正** |
| **P-12** | 同 → /dashboard/ceo（AttentionList 顧客名） | dashboard:read（STAFF/READ_ONLY 含む）・ラベルガードなし | 表示 | **High → 修正** |
| **P-13** | golden-path.ts:33 → operations/events/[id]（「顧客: ○○」） | **認証のみ**・ラベルガードなし | 表示 | **High → 修正** |
| P-14/15 | control-tower・/dashboard の customer.count | ページゲート | 件数のみ | OK |
| P-16 | communications/actions.ts:19（AI 取り込み照合に全顧客 name/email） | communication:create | server 内部のみ（reason/preview に PII 非混入を実読確認） | Medium → HOLD（§3） |
| P-17 | invoice-send.ts:45,79 の include customer:true（実使用は email のみ） | invoice:update∧finance:read＋承認 | 承認後外部送信（maskPii） | Medium → **select {email} へ縮小（本 WIP）** |
| P-18 | dunning.ts（name/email 最小 select・文面に顧客名を永続化） | マネージャ限定 | 表示・承認後送信 | Low（二次保存は HOLD） |
| P-19 | case-studies 抑止突合（email/phone→boolean 縮約） | knowledge:update＋人間 | 内部のみ | OK |
| P-20 | leadmap 商談化（リード→Customer 作成） | customer:create＋deal:create | DB＋監査 | OK |
| P-21 | knowledge 検索（Customer join なし・chunk label 統治） | canAccessLabel | 表示・AI | Low |
| P-22 | leadmap CSV export（リード PII・Customer 非該当） | leadmap:export＋監査 | 外部 DL | OK |
| P-23 | worker（prisma.customer/contact 参照ゼロ） | — | — | OK |
| P-24 | Contact モデル（runtime 参照ゼロ・label 列なし） | 到達経路なし | — | OK（初回利用前の統治設計を HOLD） |
| P-25 | leadmap AI タスク入力（リード PII・Fake 既定） | 人間起点＋safeAiInput | AI（下書きのみ） | Low |
| P-26〜29 | complaint/contract/financeEvent の join 不在・承認 payload の recipient | 各ゲート | — | OK/Low |

統計: 29経路 = Critical 1 / High 2 / Medium 2 / Low・OK 24。

## 2. 本 WIP での修正（Critical/High + 小規模 Medium）

1. **P-11（Critical）** `/planning-hokko` に dashboard:read ゲート（データ取得前）。
2. **P-11/P-12（Critical/High）** `getGoldenPathExecutiveDashboardData` に `visibleCustomerLabels`（省略時 fail-closed=[]）を追加し、顧客名クエリを `label: { in: ... }` で**取得段階から遮断**。呼び出し元（/planning-hokko・/dashboard/ceo）は `customer:read ? visibleCustomerLabels(roles) : []` を渡す。control-tower は件数のみ利用のため既定 [] のまま（名前不要・fail-closed）。
3. **P-13（High）** `getEventGoldenPathStatus` に同じ `visibleCustomerLabels` を追加（不可視は customerName=null・customerId は event 側スカラで進捗判定に不変）。`operations/events/[id]` に inventory:read ページゲートを追加し、可視ラベル集合を渡す。
4. **P-17（Medium・小規模）** invoice-send.ts の `include: { customer: true }` ×2 を `select: { email: true }` に縮小。

- 顧客名の表示可否はすべて `lib/security/customer-visibility.ts` に一本化（WIP1/4/5 と同一判定）。
- e2e への影響: ceo（OWNER=全ラベル可視）・sales（STAFF=CUSTOMER_CONFIDENTIAL 可視・dashboard/inventory:read 保持）とも表示不変 → 既存 93 件は回帰しない（planning_hokko 4件・operations 4件を含む）。

## 3. HOLD リスト（Phase 3 内では判断保留・Phase 4 候補）

- P-16: AI 取り込み照合の全顧客 name/email over-fetch。可視ラベルで絞ると取り込み精度要件と衝突 → 「reason/preview に顧客名を入れない」の機械検査（安全ゲート拡張）を Phase 4 で検討。
- P-24: Contact モデル（label 列なし・未使用）。廃止 or label 追加＋統治設計 = **schema 変更のため HOLD**。
- P-18/P-29: PII の二次保存（督促文面・承認 payload の宛先）の保持期間・削除連動設計。
- include: { customer: true } 全面禁止の lint/安全ゲート化（誤検知設計が必要）。
- P-27: /contracts の contract:read ゲート欠如（LEGAL_CONFIDENTIAL 統治・CRM 境界外の別トラック）。
- /dashboard の監査ログ8件が audit:read なしで可視（WIP-5 レビュー Info）・admin/operations-actions の OPS 承認可視性（同 Low）。

## 4. Gate 判定

- [x] 全経路の機械列挙と実読判定（29経路・台帳化）
- [x] Critical 1・High 2 の修正（取得段階遮断＋ページゲート・fail-closed 既定）
- [x] Medium 小規模（P-17 select 縮小）
- [x] ローカル電池 green（tsc 0 / lint 0 / unit 278/0 / safety 0 / secret NONE）
- [x] レビュー → 指摘反映（§5 追補）
- [x] CI green をログ本文で確認: run 29140473828（#164）・head 8685fc3・`93 passed (1.1m)` / 0 failed
  （テスト数不変・回帰なし・workflow ファイル未変更のため封印 env は #160 の確認と同一）→ **WIP-6 クローズ**

## 5. 追補（レビュー結果・2026-07-11）

独立レビュー（fa01e13 対象・実 DB での Prisma 挙動検証を含む）: **Critical/High 級の欠陥なし**。

- 実証済み: `label: { in: [] }` は findMany=[] / findFirst=null（エラーなし・fail-closed 成立）。
  STAFF 可視集合では CUSTOMER_CONFIDENTIAL のみ返ることも実 DB で確認。呼び出し元3＋1箇所の全列挙、
  customerName の null 許容（AttentionList/summarize は非依存）、customerId・hasCustomer は event
  スカラ由来で進捗判定不変、e2e 93 件のアサーションは顧客名非依存（ceo/sales・seed 全顧客
  CUSTOMER_CONFIDENTIAL 可視）を机上実行で確認。
- Low（反映: 台帳 P-18 の記述を拡張）: 督促下書き（dunning）は label 無フィルタで顧客名を文面に
  埋め込み・二次保存する。到達は invoice:update∧finance:read（実質マネージャ）だが、DM には
  STRICT_SECRET 等が不可視のため同一画面内で宛先ヘッダ（遮断済み）と下書き本文（顧客名あり）の
  不整合が生じ得る → **P-18 HOLD の scope に「ラベル迂回表示」を追加**（督促文面は宛先が本質的
  構成要素であり、修正は保持期間・削除連動と併せて Phase 4 で設計）。
- Info（反映済み）: 可視集合が空のとき顧客クエリ自体を発行しない短絡を追加（control-tower の
  フォールスルー呼び出しで毎回 `in: []` クエリが走っていた）。
- Info（記録のみ）: /operations/events 一覧・/operations は inventory:read 無ゲートだが顧客 PII
  非取得（案件名・会場のみ）→ CRM 境界外・ページゲート統一は Phase 4 UI 整理と併せて判断。
