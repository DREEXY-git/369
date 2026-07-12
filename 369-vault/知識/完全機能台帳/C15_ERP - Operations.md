---
title: "C15 ERP / Operations"
status: generated-canonical-mirror
area: C15
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C15 ERP / Operations

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

受発注・在庫・購買・原価・業務管理

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:627
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C15-001 | 受注管理 | 受注作成 | normalized-line:1648 |
| C15-002 | 受注管理 | 受注明細 | normalized-line:1649 |
| C15-003 | 受注管理 | 受注ステータス | normalized-line:1650 |
| C15-004 | 受注管理 | 納期管理 | normalized-line:1651 |
| C15-005 | 受注管理 | 出荷予定 | normalized-line:1652 |
| C15-006 | 受注管理 | 出荷実績 | normalized-line:1653 |
| C15-007 | 受注管理 | 顧客別受注 | normalized-line:1654 |
| C15-008 | 受注管理 | 商品別受注 | normalized-line:1655 |
| C15-009 | 受注管理 | 店舗別受注 | normalized-line:1656 |
| C15-010 | 受注管理 | EC受注連携 | normalized-line:1657 |
| C15-011 | 受注管理 | POS受注連携 | normalized-line:1658 |
| C15-012 | 受注管理 | 見積から受注 | normalized-line:1659 |
| C15-013 | 受注管理 | 契約から受注 | normalized-line:1660 |
| C15-014 | 受注管理 | 受注から請求 | normalized-line:1661 |
| C15-015 | 受注管理 | 受注キャンセル | normalized-line:1662 |
| C15-016 | 受注管理 | 返品 | normalized-line:1663 |
| C15-017 | 受注管理 | 交換 | normalized-line:1664 |
| C15-018 | 発注管理 | 発注作成 | normalized-line:1666 |
| C15-019 | 発注管理 | 発注明細 | normalized-line:1667 |
| C15-020 | 発注管理 | 仕入先 | normalized-line:1668 |
| C15-021 | 発注管理 | 発注承認 | normalized-line:1669 |
| C15-022 | 発注管理 | 発注ステータス | normalized-line:1670 |
| C15-023 | 発注管理 | 納期管理 | normalized-line:1671 |
| C15-024 | 発注管理 | 入荷予定 | normalized-line:1672 |
| C15-025 | 発注管理 | 入荷実績 | normalized-line:1673 |
| C15-026 | 発注管理 | 発注点 | normalized-line:1674 |
| C15-027 | 発注管理 | 自動発注候補 | normalized-line:1675 |
| C15-028 | 発注管理 | 発注書PDF | normalized-line:1676 |
| C15-029 | 発注管理 | 発注履歴 | normalized-line:1677 |
| C15-030 | 発注管理 | 仕入価格 | normalized-line:1678 |
| C15-031 | 発注管理 | 発注原価 | normalized-line:1679 |
| C15-032 | 発注管理 | 仕入先評価 | normalized-line:1680 |
| C15-033 | 発注管理 | 発注異常検知 | normalized-line:1681 |
| C15-034 | 発注管理 | ただし発注確定は承認制 | normalized-line:1682 |
| C15-035 | 在庫管理 | 商品在庫 | normalized-line:1684 |
| C15-036 | 在庫管理 | 店舗在庫 | normalized-line:1685 |
| C15-037 | 在庫管理 | 倉庫在庫 | normalized-line:1686 |
| C15-038 | 在庫管理 | 入庫 | normalized-line:1687 |
| C15-039 | 在庫管理 | 出庫 | normalized-line:1688 |
| C15-040 | 在庫管理 | 移動 | normalized-line:1689 |
| C15-041 | 在庫管理 | 棚卸 | normalized-line:1690 |
| C15-042 | 在庫管理 | 欠品 | normalized-line:1691 |
| C15-043 | 在庫管理 | 過剰在庫 | normalized-line:1692 |
| C15-044 | 在庫管理 | 不良在庫 | normalized-line:1693 |
| C15-045 | 在庫管理 | ロット管理 | normalized-line:1694 |
| C15-046 | 在庫管理 | 賞味期限管理 | normalized-line:1695 |
| C15-047 | 在庫管理 | シリアル管理 | normalized-line:1696 |
| C15-048 | 在庫管理 | 在庫評価 | normalized-line:1697 |
| C15-049 | 在庫管理 | 在庫回転率 | normalized-line:1698 |
| C15-050 | 在庫管理 | 需要予測 | normalized-line:1699 |
| C15-051 | 在庫管理 | 安全在庫 | normalized-line:1700 |
| C15-052 | 在庫管理 | 発注点 | normalized-line:1701 |
| C15-053 | 在庫管理 | 在庫アラート | normalized-line:1702 |
| C15-054 | 在庫管理 | 在庫差異 | normalized-line:1703 |
| C15-055 | 在庫管理 | POS連携 | normalized-line:1704 |
| C15-056 | 在庫管理 | EC連携 | normalized-line:1705 |
| C15-057 | 在庫管理 | 会計連携 | normalized-line:1706 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
