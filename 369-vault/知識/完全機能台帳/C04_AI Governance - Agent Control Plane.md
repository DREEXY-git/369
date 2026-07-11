---
title: "C04 AI Governance / Agent Control Plane"
status: generated-canonical-mirror
area: C04
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C04 AI Governance / Agent Control Plane

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

AI社員の管理・権限・停止・評価

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:616
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C04-001 | AI社員管理 | AI Employee Registry | normalized-line:871 |
| C04-002 | AI社員管理 | Agent Registry | normalized-line:872 |
| C04-003 | AI社員管理 | Agent Profile | normalized-line:873 |
| C04-004 | AI社員管理 | Agent Role | normalized-line:874 |
| C04-005 | AI社員管理 | Agent Job Description | normalized-line:875 |
| C04-006 | AI社員管理 | Agent Owner | normalized-line:876 |
| C04-007 | AI社員管理 | Agent Department | normalized-line:877 |
| C04-008 | AI社員管理 | Agent Purpose | normalized-line:878 |
| C04-009 | AI社員管理 | Agent Risk Tier | normalized-line:879 |
| C04-010 | AI社員管理 | Agent Version | normalized-line:880 |
| C04-011 | AI社員管理 | Agent Status | normalized-line:881 |
| C04-012 | AI社員管理 | Agent License | normalized-line:882 |
| C04-013 | AI社員管理 | Agent Certification | normalized-line:883 |
| C04-014 | AI社員管理 | Agent Deployment | normalized-line:884 |
| C04-015 | AI社員管理 | Agent Rollback | normalized-line:885 |
| C04-016 | AI社員管理 | Agent Suspension | normalized-line:886 |
| C04-017 | AI社員管理 | Agent Kill Switch | normalized-line:887 |
| C04-018 | AI社員管理 | Agent Cost Limit | normalized-line:888 |
| C04-019 | AI社員管理 | Agent Data Access Scope | normalized-line:889 |
| C04-020 | AI社員管理 | Agent Tool Scope | normalized-line:890 |
| C04-021 | AI社員管理 | Agent External Action Scope | normalized-line:891 |
| C04-022 | AI社員管理 | Agent Approval Requirement | normalized-line:892 |
| C04-023 | AI社員管理 | Agent Memory Policy | normalized-line:893 |
| C04-024 | AI社員管理 | Agent Retention Policy | normalized-line:894 |
| C04-025 | AI社員管理 | Agent Training Data Policy | normalized-line:895 |
| C04-026 | AI社員管理 | Agent Prompt Policy | normalized-line:896 |
| C04-027 | AI社員管理 | Agent Escalation Policy | normalized-line:897 |
| C04-028 | AI社員管理 | Agent Incident History | normalized-line:898 |
| C04-029 | AI社員管理 | Agent Performance History | normalized-line:899 |
| C04-030 | AI社員の状態 | draft | normalized-line:901 |
| C04-031 | AI社員の状態 | testing | normalized-line:902 |
| C04-032 | AI社員の状態 | pending_review | normalized-line:903 |
| C04-033 | AI社員の状態 | approved | normalized-line:904 |
| C04-034 | AI社員の状態 | deployed | normalized-line:905 |
| C04-035 | AI社員の状態 | active | normalized-line:906 |
| C04-036 | AI社員の状態 | paused | normalized-line:907 |
| C04-037 | AI社員の状態 | suspended | normalized-line:908 |
| C04-038 | AI社員の状態 | deprecated | normalized-line:909 |
| C04-039 | AI社員の状態 | archived | normalized-line:910 |
| C04-040 | AI社員の状態 | rollback_required | normalized-line:911 |
| C04-041 | AI社員の状態 | incident_hold | normalized-line:912 |
| C04-042 | AI社員の状態 | marketplace_review | normalized-line:913 |
| C04-043 | AI社員の状態 | enterprise_approved | normalized-line:914 |
| C04-044 | AI社員の権限 | read-only | normalized-line:916 |
| C04-045 | AI社員の権限 | draft-only | normalized-line:917 |
| C04-046 | AI社員の権限 | suggestion-only | normalized-line:918 |
| C04-047 | AI社員の権限 | approval-request-only | normalized-line:919 |
| C04-048 | AI社員の権限 | internal-write | normalized-line:920 |
| C04-049 | AI社員の権限 | external-send-requires-approval | normalized-line:921 |
| C04-050 | AI社員の権限 | budget-change-requires-approval | normalized-line:922 |
| C04-051 | AI社員の権限 | finance-draft-only | normalized-line:923 |
| C04-052 | AI社員の権限 | legal-review-only | normalized-line:924 |
| C04-053 | AI社員の権限 | HR-review-only | normalized-line:925 |
| C04-054 | AI社員の権限 | no-pii | normalized-line:926 |
| C04-055 | AI社員の権限 | masked-pii-only | normalized-line:927 |
| C04-056 | AI社員の権限 | aggregate-only | normalized-line:928 |
| C04-057 | AI社員の権限 | tenant-scoped | normalized-line:929 |
| C04-058 | AI社員の権限 | department-scoped | normalized-line:930 |
| C04-059 | AI社員の権限 | client-scoped | normalized-line:931 |
| C04-060 | AI社員の権限 | store-scoped | normalized-line:932 |
| C04-061 | AI社員の免許制度 | 営業AI免許 | normalized-line:934 |
| C04-062 | AI社員の免許制度 | マーケAI免許 | normalized-line:935 |
| C04-063 | AI社員の免許制度 | 広告AI免許 | normalized-line:936 |
| C04-064 | AI社員の免許制度 | 経理AI免許 | normalized-line:937 |
| C04-065 | AI社員の免許制度 | 請求AI免許 | normalized-line:938 |
| C04-066 | AI社員の免許制度 | 入金照合AI免許 | normalized-line:939 |
| C04-067 | AI社員の免許制度 | 会計補助AI免許 | normalized-line:940 |
| C04-068 | AI社員の免許制度 | 法務AI免許 | normalized-line:941 |
| C04-069 | AI社員の免許制度 | 契約レビューAI免許 | normalized-line:942 |
| C04-070 | AI社員の免許制度 | 採用AI免許 | normalized-line:943 |
| C04-071 | AI社員の免許制度 | 労務AI免許 | normalized-line:944 |
| C04-072 | AI社員の免許制度 | 教育AI免許 | normalized-line:945 |
| C04-073 | AI社員の免許制度 | CS AI免許 | normalized-line:946 |
| C04-074 | AI社員の免許制度 | 個人情報取扱AI免許 | normalized-line:947 |
| C04-075 | AI社員の免許制度 | 外部送信AI免許 | normalized-line:948 |
| C04-076 | AI社員の免許制度 | 高リスク提案AI免許 | normalized-line:949 |
| C04-077 | AI社員の免許制度 | Marketplace公開AI免許 | normalized-line:950 |
| C04-078 | AI社員の免許制度 | Enterprise利用AI免許 | normalized-line:951 |
| C04-079 | AI Action Flight Recorder | AIが参照したデータ | normalized-line:953 |
| C04-080 | AI Action Flight Recorder | AIが使ったプロンプト | normalized-line:954 |
| C04-081 | AI Action Flight Recorder | AIが使ったモデル | normalized-line:955 |
| C04-082 | AI Action Flight Recorder | AIが呼び出したツール | normalized-line:956 |
| C04-083 | AI Action Flight Recorder | AIが判断した理由 | normalized-line:957 |
| C04-084 | AI Action Flight Recorder | AIが出した提案 | normalized-line:958 |
| C04-085 | AI Action Flight Recorder | AIの信頼度 | normalized-line:959 |
| C04-086 | AI Action Flight Recorder | AIのデータ不足判定 | normalized-line:960 |
| C04-087 | AI Action Flight Recorder | AIのCompliance判定 | normalized-line:961 |
| C04-088 | AI Action Flight Recorder | AIのConsent判定 | normalized-line:962 |
| C04-089 | AI Action Flight Recorder | AIが作成した承認依頼 | normalized-line:963 |
| C04-090 | AI Action Flight Recorder | 承認者 | normalized-line:964 |
| C04-091 | AI Action Flight Recorder | 実行結果 | normalized-line:965 |
| C04-092 | AI Action Flight Recorder | 失敗理由 | normalized-line:966 |
| C04-093 | AI Action Flight Recorder | 補償アクション | normalized-line:967 |
| C04-094 | AI Action Flight Recorder | コスト | normalized-line:968 |
| C04-095 | AI Action Flight Recorder | トークン使用量 | normalized-line:969 |
| C04-096 | AI Action Flight Recorder | 実行時間 | normalized-line:970 |
| C04-097 | AI Action Flight Recorder | 事故有無 | normalized-line:971 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
