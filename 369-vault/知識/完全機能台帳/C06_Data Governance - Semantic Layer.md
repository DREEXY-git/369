---
title: "C06 Data Governance / Semantic Layer"
status: generated-canonical-mirror
area: C06
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C06 Data Governance / Semantic Layer

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

企業データをAIが正しく理解する意味辞書

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:618
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C06-001 | Data Catalog | テーブル一覧 | normalized-line:1042 |
| C06-002 | Data Catalog | データセット一覧 | normalized-line:1043 |
| C06-003 | Data Catalog | 外部データソース一覧 | normalized-line:1044 |
| C06-004 | Data Catalog | ファイル一覧 | normalized-line:1045 |
| C06-005 | Data Catalog | ドキュメント一覧 | normalized-line:1046 |
| C06-006 | Data Catalog | カラム定義 | normalized-line:1047 |
| C06-007 | Data Catalog | データオーナー | normalized-line:1048 |
| C06-008 | Data Catalog | データ管理者 | normalized-line:1049 |
| C06-009 | Data Catalog | 更新頻度 | normalized-line:1050 |
| C06-010 | Data Catalog | 最終更新日時 | normalized-line:1051 |
| C06-011 | Data Catalog | データ品質 | normalized-line:1052 |
| C06-012 | Data Catalog | 機密レベル | normalized-line:1053 |
| C06-013 | Data Catalog | PII有無 | normalized-line:1054 |
| C06-014 | Data Catalog | 外部送信可否 | normalized-line:1055 |
| C06-015 | Data Catalog | AI利用可否 | normalized-line:1056 |
| C06-016 | Data Catalog | RAG利用可否 | normalized-line:1057 |
| C06-017 | Data Catalog | Embedding可否 | normalized-line:1058 |
| C06-018 | Data Catalog | エクスポート可否 | normalized-line:1059 |
| C06-019 | Semantic Layer | KPI Dictionary | normalized-line:1061 |
| C06-020 | Semantic Layer | 売上定義 | normalized-line:1062 |
| C06-021 | Semantic Layer | 入金定義 | normalized-line:1063 |
| C06-022 | Semantic Layer | 粗利定義 | normalized-line:1064 |
| C06-023 | Semantic Layer | LTV定義 | normalized-line:1065 |
| C06-024 | Semantic Layer | CPA定義 | normalized-line:1066 |
| C06-025 | Semantic Layer | ROAS定義 | normalized-line:1067 |
| C06-026 | Semantic Layer | 粗利ROAS定義 | normalized-line:1068 |
| C06-027 | Semantic Layer | CV定義 | normalized-line:1069 |
| C06-028 | Semantic Layer | 商談化定義 | normalized-line:1070 |
| C06-029 | Semantic Layer | 契約定義 | normalized-line:1071 |
| C06-030 | Semantic Layer | 解約定義 | normalized-line:1072 |
| C06-031 | Semantic Layer | 予約定義 | normalized-line:1073 |
| C06-032 | Semantic Layer | 来店定義 | normalized-line:1074 |
| C06-033 | Semantic Layer | 採用CV定義 | normalized-line:1075 |
| C06-034 | Semantic Layer | 顧客ステータス定義 | normalized-line:1076 |
| C06-035 | Semantic Layer | 商談ステージ定義 | normalized-line:1077 |
| C06-036 | Semantic Layer | 請求ステータス定義 | normalized-line:1078 |
| C06-037 | Semantic Layer | 広告成果定義 | normalized-line:1079 |
| C06-038 | Semantic Layer | 予算消化定義 | normalized-line:1080 |
| C06-039 | Semantic Layer | 原価定義 | normalized-line:1081 |
| C06-040 | Semantic Layer | 部門別PL定義 | normalized-line:1082 |
| C06-041 | Semantic Layer | 店舗別PL定義 | normalized-line:1083 |
| C06-042 | Data Quality | 欠損検知 | normalized-line:1085 |
| C06-043 | Data Quality | 重複検知 | normalized-line:1086 |
| C06-044 | Data Quality | 異常値検知 | normalized-line:1087 |
| C06-045 | Data Quality | 型不整合検知 | normalized-line:1088 |
| C06-046 | Data Quality | 文字化け検知 | normalized-line:1089 |
| C06-047 | Data Quality | 通貨不整合 | normalized-line:1090 |
| C06-048 | Data Quality | 日付不整合 | normalized-line:1091 |
| C06-049 | Data Quality | タイムゾーン不整合 | normalized-line:1092 |
| C06-050 | Data Quality | 顧客重複 | normalized-line:1093 |
| C06-051 | Data Quality | 法人重複 | normalized-line:1094 |
| C06-052 | Data Quality | 取引先重複 | normalized-line:1095 |
| C06-053 | Data Quality | 商品重複 | normalized-line:1096 |
| C06-054 | Data Quality | 請求重複 | normalized-line:1097 |
| C06-055 | Data Quality | 広告費重複 | normalized-line:1098 |
| C06-056 | Data Quality | CSV重複 | normalized-line:1099 |
| C06-057 | Data Quality | Webhook重複 | normalized-line:1100 |
| C06-058 | Data Quality | Idempotency Key | normalized-line:1101 |
| C06-059 | Data Quality | Data Freshness | normalized-line:1102 |
| C06-060 | Data Quality | Data Completeness | normalized-line:1103 |
| C06-061 | Data Quality | Data Sufficiency | normalized-line:1104 |
| C06-062 | Data Quality | Data Confidence | normalized-line:1105 |
| C06-063 | Data Quality | Source Reliability | normalized-line:1106 |
| C06-064 | Master Data Management | Customer Master | normalized-line:1108 |
| C06-065 | Master Data Management | Company Master | normalized-line:1109 |
| C06-066 | Master Data Management | Employee Master | normalized-line:1110 |
| C06-067 | Master Data Management | Product Master | normalized-line:1111 |
| C06-068 | Master Data Management | Vendor Master | normalized-line:1112 |
| C06-069 | Master Data Management | Partner Master | normalized-line:1113 |
| C06-070 | Master Data Management | Store Master | normalized-line:1114 |
| C06-071 | Master Data Management | Department Master | normalized-line:1115 |
| C06-072 | Master Data Management | Campaign Master | normalized-line:1116 |
| C06-073 | Master Data Management | Channel Master | normalized-line:1117 |
| C06-074 | Master Data Management | Price Master | normalized-line:1118 |
| C06-075 | Master Data Management | Contract Master | normalized-line:1119 |
| C06-076 | Master Data Management | Chart of Accounts | normalized-line:1120 |
| C06-077 | Master Data Management | Tax Code Master | normalized-line:1121 |
| C06-078 | Master Data Management | Role Master | normalized-line:1122 |
| C06-079 | Master Data Management | Permission Master | normalized-line:1123 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
