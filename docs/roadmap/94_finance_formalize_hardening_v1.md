# 会計 formalize hardening v1（仕訳確定・請求確定の原子性＋二重確定防止）

- Stream: **P3-Q2C / 会計（候補→正式化の堅牢化）**
- Branch: `claude/finance-formalize-hardening-v1`（base = main `a758d17`）
- Evidence 段階目標: **CI_VERIFIED**（MAIN_MERGED / PRODUCTION は人間 Gate）
- 外部作用: **なし**。**DB スキーマ変更なし**。

## 背景（本番の穴）
`finance/formalize.ts` の `finalizeJournalCandidate` / `finalizeInvoiceCandidate` は、正式エンティティ作成→
候補 status 更新→監査を **transaction 外で逐次実行**していた。
- 途中失敗で**孤児**（JournalEntry だけ／Invoice だけ）や、候補が未確定のまま残り**再確定で二重計上**。
- 並行/二重確定で **JournalEntry / Invoice の二重作成**（check-then-act TOCTOU）。

## 修正
- 正式エンティティ作成・候補 status 更新・監査を**単一 `$transaction`**で確定（監査は `tx.auditLog.create`）。
- 候補 status の **CAS barrier**（`status≠posted/sent かつ *EntryId/invoiceId=null` のときだけ更新、`count≠1` は
  entry ごと rollback）で並行/二重確定を防止（承認層の executeApprovedAction CAS に加えた多重防御）。
- 敗北 CAS は `FormalizeConflict` sentinel で tx をロールバックしつつ `already` を返す。
- 副次の view ログ・growth event は commit 後（非クリティカル）。

## 検証（実 PostgreSQL・実 UI）
`finance_formalize_evidence.spec.ts`（新規・申請→承認→正式化の実フロー越し）:
- **仕訳確定**: JournalEntry 1件＋明細2行＋候補 posted＋監査1件が原子的。実行 POST replay（二重実行）でも JournalEntry/監査 不変。
- **請求確定**: Invoice(ISSUED)＋lineItem＋Receivable(open)＋候補 sent＋監査1件が原子的。
- 回帰 finance_formalize / finance_bridge 全 green。単体 568・typecheck/lint/build clean。

## 非対象（後続）
アカウント master の重複作成（resolveAccount）の厳密一意化・複数明細の一般化は後続。実送金・税務断定は HUMAN_ONLY。
