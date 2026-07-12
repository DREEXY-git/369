---
title: "C13 Payment / Reconciliation"
status: generated-canonical-mirror
area: C13
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C13 Payment / Reconciliation

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

入金・消込・支払

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:625
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C13-001 | 入金管理 | 入金予定 | normalized-line:1555 |
| C13-002 | 入金管理 | 入金実績 | normalized-line:1556 |
| C13-003 | 入金管理 | 銀行入金取込 | normalized-line:1557 |
| C13-004 | 入金管理 | Stripe入金 | normalized-line:1558 |
| C13-005 | 入金管理 | PayPal入金 | normalized-line:1559 |
| C13-006 | 入金管理 | クレカ入金 | normalized-line:1560 |
| C13-007 | 入金管理 | 口座振替 | normalized-line:1561 |
| C13-008 | 入金管理 | 振込入金 | normalized-line:1562 |
| C13-009 | 入金管理 | 入金候補マッチング | normalized-line:1563 |
| C13-010 | 入金管理 | 入金消込候補 | normalized-line:1564 |
| C13-011 | 入金管理 | 一部入金 | normalized-line:1565 |
| C13-012 | 入金管理 | 過入金 | normalized-line:1566 |
| C13-013 | 入金管理 | 未入金 | normalized-line:1567 |
| C13-014 | 入金管理 | 入金遅延 | normalized-line:1568 |
| C13-015 | 入金管理 | 入金差額 | normalized-line:1569 |
| C13-016 | 入金管理 | 手数料差引 | normalized-line:1570 |
| C13-017 | 入金管理 | 返金 | normalized-line:1571 |
| C13-018 | 入金管理 | 相殺 | normalized-line:1572 |
| C13-019 | 入金管理 | 入金ステータス | normalized-line:1573 |
| C13-020 | 入金管理 | 顧客別入金履歴 | normalized-line:1574 |
| C13-021 | 入金管理 | 請求別入金履歴 | normalized-line:1575 |
| C13-022 | 入金管理 | 売掛残高 | normalized-line:1576 |
| C13-023 | 入金管理 | 入金監査ログ | normalized-line:1577 |
| C13-024 | AI入金補助 | 入金候補マッチング | normalized-line:1579 |
| C13-025 | AI入金補助 | 名義ゆれ検知 | normalized-line:1580 |
| C13-026 | AI入金補助 | 金額差分検知 | normalized-line:1581 |
| C13-027 | AI入金補助 | 請求書候補提示 | normalized-line:1582 |
| C13-028 | AI入金補助 | 過入金候補 | normalized-line:1583 |
| C13-029 | AI入金補助 | 未入金候補 | normalized-line:1584 |
| C13-030 | AI入金補助 | 督促候補 | normalized-line:1585 |
| C13-031 | AI入金補助 | 支払期限超過検知 | normalized-line:1586 |
| C13-032 | AI入金補助 | 売掛残高異常検知 | normalized-line:1587 |
| C13-033 | AI入金補助 | 入金消込ドラフト | normalized-line:1588 |
| C13-034 | AI入金補助 | ただし消込確定は人間認証 | normalized-line:1589 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
