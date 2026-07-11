# Audit 166: Customer/Contact PII 経路の機械監査と修正（WIP-6）

- 日付: 2026-07-11
- 種別: 機械監査（29経路の台帳化）＋ Critical/High 修正
- 対応 roadmap: `docs/roadmap/67_pii_path_machine_audit_candidate.md`（経路台帳の正本）
- ブランチ: `claude/ci-stage3-e2e-f1d-selectors-hikwbg`

## 変更ファイル

| ファイル | 変更 |
|---|---|
| `apps/web/lib/domains/operations/golden-path-dashboard.ts` | visibleCustomerLabels 引数（fail-closed 既定 []）・顧客名クエリのラベルフィルタ |
| `apps/web/lib/domains/operations/golden-path.ts` | 同上（イベント単体版） |
| `apps/web/app/(app)/planning-hokko/page.tsx` | dashboard:read ゲート＋可視ラベル受け渡し（Critical P-11） |
| `apps/web/app/(app)/dashboard/ceo/page.tsx` | 可視ラベル受け渡し（High P-12） |
| `apps/web/app/(app)/operations/events/[id]/page.tsx` | inventory:read ゲート＋可視ラベル受け渡し（High P-13） |
| `apps/web/lib/domains/finance/invoice-send.ts` | customer include 全列 → select {email}（Medium P-17） |

## 判定の要点

- Critical/High はすべて golden-path 系 lib の顧客名取得（label 非取得・ガードなし）と、
  それを表示する 3 画面のページゲート欠如の組合せ。修正は「可視ラベル集合を lib へ渡し
  取得段階から遮断（省略時 fail-closed）＋ページ基礎権限」で、WIP1/4/5 と同一の統治に一本化。
- 0 Critical / 0 High の根拠: roadmap67 §1 の 29 経路すべてに判定と根拠を記録し、
  Critical/High は本 WIP で修正済み。Medium 2 件は §3 HOLD（server 内部のみ・実害なしを実読確認）。

## 検証

- ローカル電池・レビュー・CI の結果は追補に記録。
