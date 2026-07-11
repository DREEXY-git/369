---
title: "C05 AI Safety / Evaluation / Red Team"
status: generated-canonical-mirror
area: C05
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C05 AI Safety / Evaluation / Red Team

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

AI社員の品質保証・暴走防止

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:617
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C05-001 | 評価基盤 | Golden Dataset | normalized-line:976 |
| C05-002 | 評価基盤 | Scenario Test | normalized-line:977 |
| C05-003 | 評価基盤 | Replay Test | normalized-line:978 |
| C05-004 | 評価基盤 | Regression Test | normalized-line:979 |
| C05-005 | 評価基盤 | Prompt Evaluation | normalized-line:980 |
| C05-006 | 評価基盤 | Tool Use Evaluation | normalized-line:981 |
| C05-007 | 評価基盤 | Agent Simulation | normalized-line:982 |
| C05-008 | 評価基盤 | Dry-run | normalized-line:983 |
| C05-009 | 評価基盤 | Sandbox Execution | normalized-line:984 |
| C05-010 | 評価基盤 | Shadow Mode | normalized-line:985 |
| C05-011 | 評価基盤 | Offline Evaluation | normalized-line:986 |
| C05-012 | 評価基盤 | Online Evaluation | normalized-line:987 |
| C05-013 | 評価基盤 | Human Review | normalized-line:988 |
| C05-014 | 評価基盤 | AI Review | normalized-line:989 |
| C05-015 | 評価基盤 | Evaluation Score | normalized-line:990 |
| C05-016 | 評価基盤 | Risk Score | normalized-line:991 |
| C05-017 | 評価基盤 | Quality Score | normalized-line:992 |
| C05-018 | 評価基盤 | Compliance Score | normalized-line:993 |
| C05-019 | 評価基盤 | Safety Score | normalized-line:994 |
| C05-020 | 評価基盤 | Reliability Score | normalized-line:995 |
| C05-021 | 評価基盤 | Cost Score | normalized-line:996 |
| C05-022 | Red Team項目 | Prompt Injection Test | normalized-line:998 |
| C05-023 | Red Team項目 | Tool Injection Test | normalized-line:999 |
| C05-024 | Red Team項目 | Data Exfiltration Test | normalized-line:1000 |
| C05-025 | Red Team項目 | Cross-tenant Access Test | normalized-line:1001 |
| C05-026 | Red Team項目 | PII Leak Test | normalized-line:1002 |
| C05-027 | Red Team項目 | Consent Violation Test | normalized-line:1003 |
| C05-028 | Red Team項目 | Approval Bypass Test | normalized-line:1004 |
| C05-029 | Red Team項目 | Excessive Agency Test | normalized-line:1005 |
| C05-030 | Red Team項目 | Hallucination Test | normalized-line:1006 |
| C05-031 | Red Team項目 | Overconfidence Test | normalized-line:1007 |
| C05-032 | Red Team項目 | Unauthorized External Send Test | normalized-line:1008 |
| C05-033 | Red Team項目 | Unauthorized Budget Change Test | normalized-line:1009 |
| C05-034 | Red Team項目 | Unauthorized Invoice Issue Test | normalized-line:1010 |
| C05-035 | Red Team項目 | Unauthorized Accounting Post Test | normalized-line:1011 |
| C05-036 | Red Team項目 | Infinite Loop Test | normalized-line:1012 |
| C05-037 | Red Team項目 | Cost Explosion Test | normalized-line:1013 |
| C05-038 | Red Team項目 | Malicious Plugin Test | normalized-line:1014 |
| C05-039 | Red Team項目 | Marketplace Abuse Test | normalized-line:1015 |
| C05-040 | Red Team項目 | Fake Review Generation Test | normalized-line:1016 |
| C05-041 | Red Team項目 | Stealth Marketing Test | normalized-line:1017 |
| C05-042 | Red Team項目 | SEO Spam Test | normalized-line:1018 |
| C05-043 | Red Team項目 | Legal / Medical / Tax / Labor Risk Test | normalized-line:1019 |
| C05-044 | AI事故対応 | AI Incident Report | normalized-line:1021 |
| C05-045 | AI事故対応 | AI Incident Timeline | normalized-line:1022 |
| C05-046 | AI事故対応 | Impact Assessment | normalized-line:1023 |
| C05-047 | AI事故対応 | Affected Tenant List | normalized-line:1024 |
| C05-048 | AI事故対応 | Affected Customer List | normalized-line:1025 |
| C05-049 | AI事故対応 | Root Cause Analysis | normalized-line:1026 |
| C05-050 | AI事故対応 | Prompt Diff | normalized-line:1027 |
| C05-051 | AI事故対応 | Model Diff | normalized-line:1028 |
| C05-052 | AI事故対応 | Tool Diff | normalized-line:1029 |
| C05-053 | AI事故対応 | Data Diff | normalized-line:1030 |
| C05-054 | AI事故対応 | Permission Diff | normalized-line:1031 |
| C05-055 | AI事故対応 | Rollback Plan | normalized-line:1032 |
| C05-056 | AI事故対応 | Compensation Action | normalized-line:1033 |
| C05-057 | AI事故対応 | Customer Notification Draft | normalized-line:1034 |
| C05-058 | AI事故対応 | Legal Review | normalized-line:1035 |
| C05-059 | AI事故対応 | Preventive Control | normalized-line:1036 |
| C05-060 | AI事故対応 | Regression Test追加 | normalized-line:1037 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
