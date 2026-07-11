---
title: "C16 EC / POS / Reservation"
status: generated-canonical-mirror
area: C16
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C16 EC / POS / Reservation

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

EC、店舗、POS、予約、来店管理

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:628
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C16-001 | EC | 商品ページ | normalized-line:1711 |
| C16-002 | EC | 商品画像 | normalized-line:1712 |
| C16-003 | EC | 商品説明 | normalized-line:1713 |
| C16-004 | EC | 価格 | normalized-line:1714 |
| C16-005 | EC | セール | normalized-line:1715 |
| C16-006 | EC | クーポン | normalized-line:1716 |
| C16-007 | EC | カート | normalized-line:1717 |
| C16-008 | EC | 注文 | normalized-line:1718 |
| C16-009 | EC | 決済 | normalized-line:1719 |
| C16-010 | EC | 配送 | normalized-line:1720 |
| C16-011 | EC | 返品 | normalized-line:1721 |
| C16-012 | EC | キャンセル | normalized-line:1722 |
| C16-013 | EC | レビュー | normalized-line:1723 |
| C16-014 | EC | 顧客購入履歴 | normalized-line:1724 |
| C16-015 | EC | EC流入元 | normalized-line:1725 |
| C16-016 | EC | EC売上 | normalized-line:1726 |
| C16-017 | EC | EC粗利 | normalized-line:1727 |
| C16-018 | EC | EC LTV | normalized-line:1728 |
| C16-019 | EC | 広告別EC売上 | normalized-line:1729 |
| C16-020 | EC | SEO別EC売上 | normalized-line:1730 |
| C16-021 | EC | LINE別EC売上 | normalized-line:1731 |
| C16-022 | EC | 紹介別EC売上 | normalized-line:1732 |
| C16-023 | EC | 商品レコメンド | normalized-line:1733 |
| C16-024 | EC | カゴ落ち | normalized-line:1734 |
| C16-025 | EC | 再購入提案 | normalized-line:1735 |
| C16-026 | EC | Shopify連携 | normalized-line:1736 |
| C16-027 | EC | BASE連携 | normalized-line:1737 |
| C16-028 | EC | STORES連携 | normalized-line:1738 |
| C16-029 | EC | Amazon連携 | normalized-line:1739 |
| C16-030 | EC | 楽天連携 | normalized-line:1740 |
| C16-031 | EC | Yahooショッピング連携 | normalized-line:1741 |
| C16-032 | POS | 店舗売上 | normalized-line:1743 |
| C16-033 | POS | レジ売上 | normalized-line:1744 |
| C16-034 | POS | スタッフ別売上 | normalized-line:1745 |
| C16-035 | POS | 商品別売上 | normalized-line:1746 |
| C16-036 | POS | 時間帯別売上 | normalized-line:1747 |
| C16-037 | POS | 日次締め | normalized-line:1748 |
| C16-038 | POS | レジ締め | normalized-line:1749 |
| C16-039 | POS | 返品 | normalized-line:1750 |
| C16-040 | POS | 値引き | normalized-line:1751 |
| C16-041 | POS | クーポン | normalized-line:1752 |
| C16-042 | POS | ポイント | normalized-line:1753 |
| C16-043 | POS | 顧客連携 | normalized-line:1754 |
| C16-044 | POS | 在庫連携 | normalized-line:1755 |
| C16-045 | POS | POS CSV取込 | normalized-line:1756 |
| C16-046 | POS | スマレジ連携 | normalized-line:1757 |
| C16-047 | POS | Square連携 | normalized-line:1758 |
| C16-048 | POS | Airレジ連携 | normalized-line:1759 |
| C16-049 | 予約 | 予約枠 | normalized-line:1761 |
| C16-050 | 予約 | 予約カレンダー | normalized-line:1762 |
| C16-051 | 予約 | スタッフ別予約 | normalized-line:1763 |
| C16-052 | 予約 | 店舗別予約 | normalized-line:1764 |
| C16-053 | 予約 | サービス別予約 | normalized-line:1765 |
| C16-054 | 予約 | 予約変更 | normalized-line:1766 |
| C16-055 | 予約 | キャンセル | normalized-line:1767 |
| C16-056 | 予約 | キャンセル料 | normalized-line:1768 |
| C16-057 | 予約 | 来店管理 | normalized-line:1769 |
| C16-058 | 予約 | 無断キャンセル | normalized-line:1770 |
| C16-059 | 予約 | リマインド | normalized-line:1771 |
| C16-060 | 予約 | LINE予約 | normalized-line:1772 |
| C16-061 | 予約 | Web予約 | normalized-line:1773 |
| C16-062 | 予約 | 広告経由予約 | normalized-line:1774 |
| C16-063 | 予約 | SEO経由予約 | normalized-line:1775 |
| C16-064 | 予約 | 紹介経由予約 | normalized-line:1776 |
| C16-065 | 予約 | 予約から来店 | normalized-line:1777 |
| C16-066 | 予約 | 来店から購入 | normalized-line:1778 |
| C16-067 | 予約 | 来店からLTV | normalized-line:1779 |
| C16-068 | 予約 | ホットペッパー連携 | normalized-line:1780 |
| C16-069 | 予約 | Googleカレンダー連携 | normalized-line:1781 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
