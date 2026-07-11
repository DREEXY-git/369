---
title: "C12 Invoice / Billing"
status: generated-canonical-mirror
area: C12
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C12 Invoice / Billing

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

請求・請求書・売掛

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:624
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C12-001 | 請求機能 | 請求先管理 | normalized-line:1491 |
| C12-002 | 請求機能 | 請求書作成 | normalized-line:1492 |
| C12-003 | 請求機能 | 請求書ドラフト | normalized-line:1493 |
| C12-004 | 請求機能 | 請求明細 | normalized-line:1494 |
| C12-005 | 請求機能 | 請求番号 | normalized-line:1495 |
| C12-006 | 請求機能 | 請求日 | normalized-line:1496 |
| C12-007 | 請求機能 | 支払期限 | normalized-line:1497 |
| C12-008 | 請求機能 | 請求ステータス | normalized-line:1498 |
| C12-009 | 請求機能 | 請求承認 | normalized-line:1499 |
| C12-010 | 請求機能 | 請求PDF | normalized-line:1500 |
| C12-011 | 請求機能 | 請求送付 | normalized-line:1501 |
| C12-012 | 請求機能 | 請求送付履歴 | normalized-line:1502 |
| C12-013 | 請求機能 | 請求取消 | normalized-line:1503 |
| C12-014 | 請求機能 | 修正請求 | normalized-line:1504 |
| C12-015 | 請求機能 | 分割請求 | normalized-line:1505 |
| C12-016 | 請求機能 | 定期請求 | normalized-line:1506 |
| C12-017 | 請求機能 | サブスク請求 | normalized-line:1507 |
| C12-018 | 請求機能 | 従量課金請求 | normalized-line:1508 |
| C12-019 | 請求機能 | 成果報酬請求 | normalized-line:1509 |
| C12-020 | 請求機能 | 代理店手数料請求 | normalized-line:1510 |
| C12-021 | 請求機能 | 媒体費精算請求 | normalized-line:1511 |
| C12-022 | 請求機能 | 税区分 | normalized-line:1512 |
| C12-023 | 請求機能 | 消費税 | normalized-line:1513 |
| C12-024 | 請求機能 | 源泉徴収 | normalized-line:1514 |
| C12-025 | 請求機能 | 値引き | normalized-line:1515 |
| C12-026 | 請求機能 | 返金 | normalized-line:1516 |
| C12-027 | 請求機能 | 相殺 | normalized-line:1517 |
| C12-028 | 請求機能 | 売掛管理 | normalized-line:1518 |
| C12-029 | 請求機能 | 未入金管理 | normalized-line:1519 |
| C12-030 | 請求機能 | 督促候補 | normalized-line:1520 |
| C12-031 | 請求機能 | 督促文面案 | normalized-line:1521 |
| C12-032 | 請求機能 | 請求監査ログ | normalized-line:1522 |
| C12-033 | AI請求補助 | 請求ドラフト作成 | normalized-line:1524 |
| C12-034 | AI請求補助 | 請求明細案作成 | normalized-line:1525 |
| C12-035 | AI請求補助 | 契約条件照合 | normalized-line:1526 |
| C12-036 | AI請求補助 | 成果報酬候補計算 | normalized-line:1527 |
| C12-037 | AI請求補助 | 媒体費集計 | normalized-line:1528 |
| C12-038 | AI請求補助 | 代理店手数料計算 | normalized-line:1529 |
| C12-039 | AI請求補助 | 税区分候補 | normalized-line:1530 |
| C12-040 | AI請求補助 | 異常値検知 | normalized-line:1531 |
| C12-041 | AI請求補助 | 請求漏れ検知 | normalized-line:1532 |
| C12-042 | AI請求補助 | 二重請求検知 | normalized-line:1533 |
| C12-043 | AI請求補助 | 金額差分表示 | normalized-line:1534 |
| C12-044 | AI請求補助 | 前月差分表示 | normalized-line:1535 |
| C12-045 | AI請求補助 | 顧客別請求履歴比較 | normalized-line:1536 |
| C12-046 | AI請求補助 | 認証依頼作成 | normalized-line:1537 |
| C12-047 | 以下はAIが勝手に実行してはいけません。 | 請求書正式確定 | normalized-line:1540 |
| C12-048 | 以下はAIが勝手に実行してはいけません。 | 請求書顧客送付 | normalized-line:1541 |
| C12-049 | 以下はAIが勝手に実行してはいけません。 | 請求金額変更 | normalized-line:1542 |
| C12-050 | 以下はAIが勝手に実行してはいけません。 | 修正請求 | normalized-line:1543 |
| C12-051 | 以下はAIが勝手に実行してはいけません。 | 督促送信 | normalized-line:1544 |
| C12-052 | 以下はAIが勝手に実行してはいけません。 | 返金処理 | normalized-line:1545 |
| C12-053 | 以下はAIが勝手に実行してはいけません。 | 相殺処理 | normalized-line:1546 |
| C12-054 | 以下はAIが勝手に実行してはいけません。 | 値引き処理 | normalized-line:1547 |
| C12-055 | 以下はAIが勝手に実行してはいけません。 | 税区分確定 | normalized-line:1548 |
| C12-056 | 以下はAIが勝手に実行してはいけません。 | 成果報酬確定 | normalized-line:1549 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
