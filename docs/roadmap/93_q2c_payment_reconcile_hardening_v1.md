# P3-Q2C 入金消込 hardening v1（原子性・並列直列化・AI拒否）

- Stream: **P3-Q2C（見積〜入金）— 入金消込（Payment Reconciliation）の堅牢化**
- Branch: `claude/q2c-payment-reconcile-v1`（base = main `a758d17`）
- Evidence 段階目標: **CI_VERIFIED**（MAIN_MERGED / PRODUCTION は人間 Gate）
- 外部作用: **なし**（外部送信・実支払・課金・実 LLM・削除ゼロ）。**DB スキーマ変更なし**。

## 背景（本番に既にある入金消込の穴）
`recordInvoicePayment`（`lib/domains/finance/payments.ts`）は Payment 作成・Invoice/Receivable 更新・
FinanceEvent・監査を**逐次実行（transaction 外）**で、`paidAmount = 既存 + amount` の **read-modify-write** だった。
- 途中失敗で「Payment だけ残る／請求だけ PAID」等の不整合が起きうる。
- 同一請求への**二重/並列入金で lost update**（Payment 合計と Invoice.paidAmount が乖離）。
- AI 実行主体の明示拒否なし。

## 修正（P3-Q2C hardening パターン踏襲）
- **単一 `$transaction`**で Payment 作成・Invoice/Receivable 更新・FinanceEvent・監査を確定（原子性）。
- 対象 Invoice 行を **`SELECT ... FOR UPDATE`** でロックし、同一請求への並列入金を直列化。
- `paidAmount` は **Payment 実体の SUM から再導出**（read-modify-write 廃止・lost update を構造的に排除）。
- **AI 拒否**を core（`actorIsAi` で DB 接触前）＋ action（`user.isAi` redirect）の二重防御に。
- **VOID/DRAFT** は入金記録の対象外（発行前・無効化済みに実績を作らない）。
- growth event（成果可視化・非クリティカル）は commit 後に emit。

## 検証（ローカル・実 PostgreSQL・実 UI）
`payment_reconcile_evidence.spec.ts`（新規・実 DB 最終状態 re-fetch）:
- **原子性＋状態遷移**: 一部入金→PARTIALLY_PAID→全額→PAID、Receivable open→collected、監査2件、
  FinanceEvent posted 2件、Payment SUM=paidAmount=10000。
- **lost update 防止**: 同一請求へ**6並列入金**（1000×6）→ paidAmount=Payment SUM=6000 が厳密一致。
- **AI 拒否**: AI ロールは入金フォード不可視・Payment/ paidAmount 不変。
- 回帰: invoice_payment / dunning / quote_to_invoice = 全 green（17/17）。
- 単体 568 passed・typecheck clean・lint clean・build 成功。

## 非対象（後続）
銀行明細の自動突合（auto-matching）・複数請求への一括消込・返金/過入金の返戻フロー・実送金は HUMAN_ONLY。
