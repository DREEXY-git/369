---
title: "C39 Security / Zero Trust"
status: generated-canonical-mirror
area: C39
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C39 Security / Zero Trust

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

テナント分離、RLS、暗号化、Secrets、MFA

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:651
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C39-001 | 基本 | Tenant Isolation | normalized-line:3026 |
| C39-002 | 基本 | RLS | normalized-line:3027 |
| C39-003 | 基本 | RBAC | normalized-line:3028 |
| C39-004 | 基本 | ABAC | normalized-line:3029 |
| C39-005 | 基本 | Least Privilege | normalized-line:3030 |
| C39-006 | 基本 | Zero Trust | normalized-line:3031 |
| C39-007 | 基本 | Encryption at Rest | normalized-line:3032 |
| C39-008 | 基本 | Encryption in Transit | normalized-line:3033 |
| C39-009 | 基本 | Secrets Management | normalized-line:3034 |
| C39-010 | 基本 | API Key Rotation | normalized-line:3035 |
| C39-011 | 基本 | OAuth Scope管理 | normalized-line:3036 |
| C39-012 | 基本 | MFA | normalized-line:3037 |
| C39-013 | 基本 | SSO | normalized-line:3038 |
| C39-014 | 基本 | SCIM | normalized-line:3039 |
| C39-015 | 基本 | IP Allowlist | normalized-line:3040 |
| C39-016 | 基本 | Device Policy | normalized-line:3041 |
| C39-017 | 基本 | Session Policy | normalized-line:3042 |
| C39-018 | 基本 | Password Policy | normalized-line:3043 |
| C39-019 | 基本 | Audit Log | normalized-line:3044 |
| C39-020 | 基本 | Security Exception | normalized-line:3045 |
| C39-021 | 基本 | DLP | normalized-line:3046 |
| C39-022 | 基本 | PII Detection | normalized-line:3047 |
| C39-023 | 基本 | Sensitive Label | normalized-line:3048 |
| C39-024 | 基本 | Confidential Label | normalized-line:3049 |
| C39-025 | 基本 | External Send Block | normalized-line:3050 |
| C39-026 | 基本 | AI Kill Switch | normalized-line:3051 |
| C39-027 | 基本 | App Kill Switch | normalized-line:3052 |
| C39-028 | 基本 | Tenant Kill Switch | normalized-line:3053 |
| C39-029 | セキュリティ監査 | ログイン履歴 | normalized-line:3055 |
| C39-030 | セキュリティ監査 | 失敗ログイン | normalized-line:3056 |
| C39-031 | セキュリティ監査 | 管理者操作 | normalized-line:3057 |
| C39-032 | セキュリティ監査 | 権限変更 | normalized-line:3058 |
| C39-033 | セキュリティ監査 | データエクスポート | normalized-line:3059 |
| C39-034 | セキュリティ監査 | 外部送信 | normalized-line:3060 |
| C39-035 | セキュリティ監査 | API利用 | normalized-line:3061 |
| C39-036 | セキュリティ監査 | AI参照データ | normalized-line:3062 |
| C39-037 | セキュリティ監査 | Cross-tenant Access Attempt | normalized-line:3063 |
| C39-038 | セキュリティ監査 | PII Access | normalized-line:3064 |
| C39-039 | セキュリティ監査 | Secret Access | normalized-line:3065 |
| C39-040 | セキュリティ監査 | Marketplace App Access | normalized-line:3066 |
| C39-041 | セキュリティ監査 | Plugin Execution | normalized-line:3067 |
| C39-042 | セキュリティ監査 | Webhook送信 | normalized-line:3068 |
| C39-043 | セキュリティ監査 | Suspicious Activity | normalized-line:3069 |
| C39-044 | セキュリティ監査 | Anomaly Detection | normalized-line:3070 |
| C39-045 | セキュリティ監査 | Security Incident | normalized-line:3071 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
