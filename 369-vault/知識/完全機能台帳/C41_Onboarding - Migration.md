---
title: "C41 Onboarding / Migration"
status: generated-canonical-mirror
area: C41
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C41 Onboarding / Migration

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

初期設定、CSV移行、業種別セットアップ

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:653
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C41-001 | 初期設定 | Setup Wizard | normalized-line:3124 |
| C41-002 | 初期設定 | 業種選択 | normalized-line:3125 |
| C41-003 | 初期設定 | 会社規模選択 | normalized-line:3126 |
| C41-004 | 初期設定 | 利用目的選択 | normalized-line:3127 |
| C41-005 | 初期設定 | 既存ツール選択 | normalized-line:3128 |
| C41-006 | 初期設定 | モジュール選択 | normalized-line:3129 |
| C41-007 | 初期設定 | 権限テンプレート選択 | normalized-line:3130 |
| C41-008 | 初期設定 | AI社員テンプレート選択 | normalized-line:3131 |
| C41-009 | 初期設定 | KPIテンプレート選択 | normalized-line:3132 |
| C41-010 | 初期設定 | ダッシュボードテンプレート選択 | normalized-line:3133 |
| C41-011 | 初期設定 | 初期同意文面設定 | normalized-line:3134 |
| C41-012 | 初期設定 | 初期承認フロー設定 | normalized-line:3135 |
| C41-013 | 初期設定 | 初期会計設定 | normalized-line:3136 |
| C41-014 | 初期設定 | 初期商品マスタ設定 | normalized-line:3137 |
| C41-015 | 初期設定 | 初期広告媒体設定 | normalized-line:3138 |
| C41-016 | データ移行 | 顧客CSV取込 | normalized-line:3140 |
| C41-017 | データ移行 | 商談CSV取込 | normalized-line:3141 |
| C41-018 | データ移行 | 請求CSV取込 | normalized-line:3142 |
| C41-019 | データ移行 | 入金CSV取込 | normalized-line:3143 |
| C41-020 | データ移行 | 売上CSV取込 | normalized-line:3144 |
| C41-021 | データ移行 | 広告CSV取込 | normalized-line:3145 |
| C41-022 | データ移行 | 商品CSV取込 | normalized-line:3146 |
| C41-023 | データ移行 | 在庫CSV取込 | normalized-line:3147 |
| C41-024 | データ移行 | 従業員CSV取込 | normalized-line:3148 |
| C41-025 | データ移行 | 採用CSV取込 | normalized-line:3149 |
| C41-026 | データ移行 | Google Sheets取込 | normalized-line:3150 |
| C41-027 | データ移行 | Salesforce移行 | normalized-line:3151 |
| C41-028 | データ移行 | HubSpot移行 | normalized-line:3152 |
| C41-029 | データ移行 | kintone移行 | normalized-line:3153 |
| C41-030 | データ移行 | freee移行 | normalized-line:3154 |
| C41-031 | データ移行 | MoneyForward移行 | normalized-line:3155 |
| C41-032 | データ移行 | Shopify移行 | normalized-line:3156 |
| C41-033 | データ移行 | POS移行 | normalized-line:3157 |
| C41-034 | データ移行 | CSV Preview | normalized-line:3158 |
| C41-035 | データ移行 | Column Mapping | normalized-line:3159 |
| C41-036 | データ移行 | Validation | normalized-line:3160 |
| C41-037 | データ移行 | Error Report | normalized-line:3161 |
| C41-038 | データ移行 | Commit | normalized-line:3162 |
| C41-039 | データ移行 | Rollback | normalized-line:3163 |
| C41-040 | データ移行 | Data Quality Report | normalized-line:3164 |
| C41-041 | 導入成功 | 30日導入チェックリスト | normalized-line:3166 |
| C41-042 | 導入成功 | 90日活用ロードマップ | normalized-line:3167 |
| C41-043 | 導入成功 | 初期ROI診断 | normalized-line:3168 |
| C41-044 | 導入成功 | 初期データ品質診断 | normalized-line:3169 |
| C41-045 | 導入成功 | 初期AI提案 | normalized-line:3170 |
| C41-046 | 導入成功 | 初期ダッシュボード | normalized-line:3171 |
| C41-047 | 導入成功 | 管理者チュートリアル | normalized-line:3172 |
| C41-048 | 導入成功 | 現場チュートリアル | normalized-line:3173 |
| C41-049 | 導入成功 | 経営者チュートリアル | normalized-line:3174 |
| C41-050 | 導入成功 | サンプルデータ | normalized-line:3175 |
| C41-051 | 導入成功 | Demo Tenant | normalized-line:3176 |
| C41-052 | 導入成功 | 導入ヘルススコア | normalized-line:3177 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
