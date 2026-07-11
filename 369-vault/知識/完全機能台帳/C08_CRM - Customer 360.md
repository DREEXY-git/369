---
title: "C08 CRM / Customer 360"
status: generated-canonical-mirror
area: C08
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C08 CRM / Customer 360

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

顧客・リード・商談・LTV管理

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:620
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C08-001 | 顧客管理 | Customer | normalized-line:1193 |
| C08-002 | 顧客管理 | Lead | normalized-line:1194 |
| C08-003 | 顧客管理 | Account | normalized-line:1195 |
| C08-004 | 顧客管理 | Contact | normalized-line:1196 |
| C08-005 | 顧客管理 | Company | normalized-line:1197 |
| C08-006 | 顧客管理 | Household | normalized-line:1198 |
| C08-007 | 顧客管理 | Person | normalized-line:1199 |
| C08-008 | 顧客管理 | Anonymous Visitor | normalized-line:1200 |
| C08-009 | 顧客管理 | LINE User | normalized-line:1201 |
| C08-010 | 顧客管理 | Email Subscriber | normalized-line:1202 |
| C08-011 | 顧客管理 | EC Buyer | normalized-line:1203 |
| C08-012 | 顧客管理 | Store Visitor | normalized-line:1204 |
| C08-013 | 顧客管理 | Referral Lead | normalized-line:1205 |
| C08-014 | 顧客管理 | Partner Lead | normalized-line:1206 |
| C08-015 | 顧客管理 | Creator Lead | normalized-line:1207 |
| C08-016 | 顧客管理 | Candidate | normalized-line:1208 |
| C08-017 | 顧客管理 | Vendor | normalized-line:1209 |
| C08-018 | 顧客管理 | Client | normalized-line:1210 |
| C08-019 | 顧客属性 | 氏名 | normalized-line:1212 |
| C08-020 | 顧客属性 | 会社名 | normalized-line:1213 |
| C08-021 | 顧客属性 | 部署 | normalized-line:1214 |
| C08-022 | 顧客属性 | 役職 | normalized-line:1215 |
| C08-023 | 顧客属性 | メール | normalized-line:1216 |
| C08-024 | 顧客属性 | 電話 | normalized-line:1217 |
| C08-025 | 顧客属性 | 住所 | normalized-line:1218 |
| C08-026 | 顧客属性 | 業種 | normalized-line:1219 |
| C08-027 | 顧客属性 | 会社規模 | normalized-line:1220 |
| C08-028 | 顧客属性 | 売上規模 | normalized-line:1221 |
| C08-029 | 顧客属性 | 従業員数 | normalized-line:1222 |
| C08-030 | 顧客属性 | 担当者 | normalized-line:1223 |
| C08-031 | 顧客属性 | 流入元 | normalized-line:1224 |
| C08-032 | 顧客属性 | UTM | normalized-line:1225 |
| C08-033 | 顧客属性 | 紹介者 | normalized-line:1226 |
| C08-034 | 顧客属性 | 広告接点 | normalized-line:1227 |
| C08-035 | 顧客属性 | LINE接点 | normalized-line:1228 |
| C08-036 | 顧客属性 | SNS接点 | normalized-line:1229 |
| C08-037 | 顧客属性 | SEO接点 | normalized-line:1230 |
| C08-038 | 顧客属性 | PR接点 | normalized-line:1231 |
| C08-039 | 顧客属性 | 初回接触日 | normalized-line:1232 |
| C08-040 | 顧客属性 | 最終接触日 | normalized-line:1233 |
| C08-041 | 顧客属性 | ステータス | normalized-line:1234 |
| C08-042 | 顧客属性 | タグ | normalized-line:1235 |
| C08-043 | 顧客属性 | セグメント | normalized-line:1236 |
| C08-044 | 顧客属性 | 同意状態 | normalized-line:1237 |
| C08-045 | 顧客属性 | 契約状態 | normalized-line:1238 |
| C08-046 | 顧客属性 | 請求状態 | normalized-line:1239 |
| C08-047 | 顧客属性 | 入金状態 | normalized-line:1240 |
| C08-048 | 顧客属性 | LTV | normalized-line:1241 |
| C08-049 | 顧客属性 | 粗利 | normalized-line:1242 |
| C08-050 | 顧客属性 | 解約リスク | normalized-line:1243 |
| C08-051 | 顧客属性 | CSヘルススコア | normalized-line:1244 |
| C08-052 | 顧客アクション | 顧客登録 | normalized-line:1246 |
| C08-053 | 顧客アクション | 顧客更新 | normalized-line:1247 |
| C08-054 | 顧客アクション | 顧客統合 | normalized-line:1248 |
| C08-055 | 顧客アクション | 顧客分割 | normalized-line:1249 |
| C08-056 | 顧客アクション | 顧客重複検知 | normalized-line:1250 |
| C08-057 | 顧客アクション | 顧客タグ付け | normalized-line:1251 |
| C08-058 | 顧客アクション | 顧客セグメント | normalized-line:1252 |
| C08-059 | 顧客アクション | 顧客スコアリング | normalized-line:1253 |
| C08-060 | 顧客アクション | 顧客ランク付け | normalized-line:1254 |
| C08-061 | 顧客アクション | 顧客メモ | normalized-line:1255 |
| C08-062 | 顧客アクション | 顧客タスク | normalized-line:1256 |
| C08-063 | 顧客アクション | 顧客対応履歴 | normalized-line:1257 |
| C08-064 | 顧客アクション | 顧客ファイル | normalized-line:1258 |
| C08-065 | 顧客アクション | 顧客契約 | normalized-line:1259 |
| C08-066 | 顧客アクション | 顧客請求 | normalized-line:1260 |
| C08-067 | 顧客アクション | 顧客入金 | normalized-line:1261 |
| C08-068 | 顧客アクション | 顧客売上 | normalized-line:1262 |
| C08-069 | 顧客アクション | 顧客粗利 | normalized-line:1263 |
| C08-070 | 顧客アクション | 顧客LTV | normalized-line:1264 |
| C08-071 | 顧客アクション | 顧客別AI提案 | normalized-line:1265 |
| C08-072 | 顧客アクション | 顧客別リスク | normalized-line:1266 |
| C08-073 | 顧客アクション | 顧客別同意 | normalized-line:1267 |
| C08-074 | 顧客アクション | 顧客別外部送信履歴 | normalized-line:1268 |
| C08-075 | AI機能 | 次に連絡すべき顧客提案 | normalized-line:1270 |
| C08-076 | AI機能 | 失注リスク検知 | normalized-line:1271 |
| C08-077 | AI機能 | 解約リスク検知 | normalized-line:1272 |
| C08-078 | AI機能 | アップセル候補 | normalized-line:1273 |
| C08-079 | AI機能 | クロスセル候補 | normalized-line:1274 |
| C08-080 | AI機能 | 顧客要約 | normalized-line:1275 |
| C08-081 | AI機能 | 顧客対応案 | normalized-line:1276 |
| C08-082 | AI機能 | メール返信案 | normalized-line:1277 |
| C08-083 | AI機能 | LINE返信案 | normalized-line:1278 |
| C08-084 | AI機能 | 商談化可能性 | normalized-line:1279 |
| C08-085 | AI機能 | 契約可能性 | normalized-line:1280 |
| C08-086 | AI機能 | LTV予測 | normalized-line:1281 |
| C08-087 | AI機能 | 粗利予測 | normalized-line:1282 |
| C08-088 | AI機能 | 顧客セグメント自動提案 | normalized-line:1283 |
| C08-089 | AI機能 | 顧客重複候補提示 | normalized-line:1284 |
| C08-090 | AI機能 | 顧客名寄せ候補提示 | normalized-line:1285 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
