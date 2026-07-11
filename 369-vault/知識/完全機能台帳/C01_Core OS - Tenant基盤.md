---
title: "C01 Core OS / Tenant基盤"
status: generated-canonical-mirror
area: C01
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C01 Core OS / Tenant基盤

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

会社・組織・ユーザー・テナント管理

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:613
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C01-001 | 管理対象 | Tenant | normalized-line:667 |
| C01-002 | 管理対象 | Company | normalized-line:668 |
| C01-003 | 管理対象 | Organization | normalized-line:669 |
| C01-004 | 管理対象 | Department | normalized-line:670 |
| C01-005 | 管理対象 | Team | normalized-line:671 |
| C01-006 | 管理対象 | Store | normalized-line:672 |
| C01-007 | 管理対象 | Branch | normalized-line:673 |
| C01-008 | 管理対象 | Subsidiary | normalized-line:674 |
| C01-009 | 管理対象 | Group Company | normalized-line:675 |
| C01-010 | 管理対象 | User | normalized-line:676 |
| C01-011 | 管理対象 | Employee | normalized-line:677 |
| C01-012 | 管理対象 | Guest User | normalized-line:678 |
| C01-013 | 管理対象 | Client User | normalized-line:679 |
| C01-014 | 管理対象 | Partner User | normalized-line:680 |
| C01-015 | 管理対象 | Developer User | normalized-line:681 |
| C01-016 | 管理対象 | AI Employee | normalized-line:682 |
| C01-017 | 管理対象 | Integration Worker | normalized-line:683 |
| C01-018 | 管理対象 | Service Account | normalized-line:684 |
| C01-019 | 管理対象 | External App | normalized-line:685 |
| C01-020 | 管理対象 | Marketplace App | normalized-line:686 |
| C01-021 | 管理対象 | Role | normalized-line:687 |
| C01-022 | 管理対象 | Permission | normalized-line:688 |
| C01-023 | 管理対象 | Plan | normalized-line:689 |
| C01-024 | 管理対象 | Subscription | normalized-line:690 |
| C01-025 | 管理対象 | Usage | normalized-line:691 |
| C01-026 | 管理対象 | Billing Account | normalized-line:692 |
| C01-027 | 必要機能 | テナント作成 | normalized-line:694 |
| C01-028 | 必要機能 | テナント設定 | normalized-line:695 |
| C01-029 | 必要機能 | 会社情報登録 | normalized-line:696 |
| C01-030 | 必要機能 | 会社ロゴ | normalized-line:697 |
| C01-031 | 必要機能 | 会社住所 | normalized-line:698 |
| C01-032 | 必要機能 | 請求先情報 | normalized-line:699 |
| C01-033 | 必要機能 | 税務情報 | normalized-line:700 |
| C01-034 | 必要機能 | タイムゾーン設定 | normalized-line:701 |
| C01-035 | 必要機能 | 通貨設定 | normalized-line:702 |
| C01-036 | 必要機能 | 言語設定 | normalized-line:703 |
| C01-037 | 必要機能 | 業種設定 | normalized-line:704 |
| C01-038 | 必要機能 | 会社規模設定 | normalized-line:705 |
| C01-039 | 必要機能 | 拠点管理 | normalized-line:706 |
| C01-040 | 必要機能 | 店舗管理 | normalized-line:707 |
| C01-041 | 必要機能 | 部署管理 | normalized-line:708 |
| C01-042 | 必要機能 | チーム管理 | normalized-line:709 |
| C01-043 | 必要機能 | 組織階層 | normalized-line:710 |
| C01-044 | 必要機能 | ユーザー招待 | normalized-line:711 |
| C01-045 | 必要機能 | ユーザー停止 | normalized-line:712 |
| C01-046 | 必要機能 | ユーザー削除 | normalized-line:713 |
| C01-047 | 必要機能 | 従業員連携 | normalized-line:714 |
| C01-048 | 必要機能 | 外部ユーザー管理 | normalized-line:715 |
| C01-049 | 必要機能 | ゲスト管理 | normalized-line:716 |
| C01-050 | 必要機能 | 開発者アカウント管理 | normalized-line:717 |
| C01-051 | 必要機能 | AI社員アカウント管理 | normalized-line:718 |
| C01-052 | 必要機能 | サービスアカウント管理 | normalized-line:719 |
| C01-053 | 必要機能 | テナント切替 | normalized-line:720 |
| C01-054 | 必要機能 | マルチテナント対応 | normalized-line:721 |
| C01-055 | 必要機能 | テナント分離 | normalized-line:722 |
| C01-056 | 必要機能 | テナント別設定 | normalized-line:723 |
| C01-057 | 必要機能 | テナント別機能ON/OFF | normalized-line:724 |
| C01-058 | 必要機能 | テナント別プラン制御 | normalized-line:725 |
| C01-059 | 必要機能 | テナント別利用量制御 | normalized-line:726 |
| C01-060 | 必要機能 | テナント別データ保持期間 | normalized-line:727 |
| C01-061 | 必要機能 | テナント別バックアップ | normalized-line:728 |
| C01-062 | 必要機能 | テナント別監査ログ | normalized-line:729 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
