---
title: "C03 Permission / Approval / Audit"
status: generated-canonical-mirror
area: C03
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---

# C03 Permission / Approval / Audit

> GitHub正本 `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` からの生成鏡像です。手動編集禁止。

## 役割

権限、承認、監査、証跡

## 原典状態

- status: `SOURCE_DETAIL_PRESENT`
- summary source: normalized-line:615
- source SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`

## 機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C03-001 | Permission Graph | ユーザー権限 | normalized-line:791 |
| C03-002 | Permission Graph | AI社員権限 | normalized-line:792 |
| C03-003 | Permission Graph | ロール権限 | normalized-line:793 |
| C03-004 | Permission Graph | 部署権限 | normalized-line:794 |
| C03-005 | Permission Graph | 店舗権限 | normalized-line:795 |
| C03-006 | Permission Graph | 顧客単位権限 | normalized-line:796 |
| C03-007 | Permission Graph | 商談単位権限 | normalized-line:797 |
| C03-008 | Permission Graph | 契約単位権限 | normalized-line:798 |
| C03-009 | Permission Graph | 請求単位権限 | normalized-line:799 |
| C03-010 | Permission Graph | 会計単位権限 | normalized-line:800 |
| C03-011 | Permission Graph | 広告アカウント単位権限 | normalized-line:801 |
| C03-012 | Permission Graph | 媒体単位権限 | normalized-line:802 |
| C03-013 | Permission Graph | クライアント単位権限 | normalized-line:803 |
| C03-014 | Permission Graph | プロジェクト単位権限 | normalized-line:804 |
| C03-015 | Permission Graph | データ分類別権限 | normalized-line:805 |
| C03-016 | Permission Graph | 外部送信権限 | normalized-line:806 |
| C03-017 | Permission Graph | AI利用権限 | normalized-line:807 |
| C03-018 | Permission Graph | AI外部送信権限 | normalized-line:808 |
| C03-019 | Permission Graph | Marketplace App権限 | normalized-line:809 |
| C03-020 | Permission Graph | Plugin権限 | normalized-line:810 |
| C03-021 | Permission Graph | Tool権限 | normalized-line:811 |
| C03-022 | Approval Graph | 承認依頼 | normalized-line:813 |
| C03-023 | Approval Graph | 承認者設定 | normalized-line:814 |
| C03-024 | Approval Graph | 承認期限 | normalized-line:815 |
| C03-025 | Approval Graph | 承認ステータス | normalized-line:816 |
| C03-026 | Approval Graph | 承認コメント | normalized-line:817 |
| C03-027 | Approval Graph | 差し戻し | normalized-line:818 |
| C03-028 | Approval Graph | 却下 | normalized-line:819 |
| C03-029 | Approval Graph | 保留 | normalized-line:820 |
| C03-030 | Approval Graph | 二重承認 | normalized-line:821 |
| C03-031 | Approval Graph | 高リスク承認 | normalized-line:822 |
| C03-032 | Approval Graph | 低リスク承認 | normalized-line:823 |
| C03-033 | Approval Graph | 一括承認 | normalized-line:824 |
| C03-034 | Approval Graph | 一括承認禁止条件 | normalized-line:825 |
| C03-035 | Approval Graph | 承認前プレビュー | normalized-line:826 |
| C03-036 | Approval Graph | 実行前プレビュー | normalized-line:827 |
| C03-037 | Approval Graph | 承認後実行Queue | normalized-line:828 |
| C03-038 | Approval Graph | 承認期限切れ | normalized-line:829 |
| C03-039 | Approval Graph | 再申請 | normalized-line:830 |
| C03-040 | Approval Graph | 代理承認 | normalized-line:831 |
| C03-041 | Approval Graph | 例外承認 | normalized-line:832 |
| C03-042 | Approval Graph | 緊急承認 | normalized-line:833 |
| C03-043 | Approval Graph | 承認テンプレート | normalized-line:834 |
| C03-044 | Approval Graph | 業務別承認ルール | normalized-line:835 |
| C03-045 | Approval Graph | 金額別承認ルール | normalized-line:836 |
| C03-046 | Approval Graph | 部門別承認ルール | normalized-line:837 |
| C03-047 | Approval Graph | AI社員別承認ルール | normalized-line:838 |
| C03-048 | Audit Graph | 誰が | normalized-line:840 |
| C03-049 | Audit Graph | いつ | normalized-line:841 |
| C03-050 | Audit Graph | 何を | normalized-line:842 |
| C03-051 | Audit Graph | どの対象に | normalized-line:843 |
| C03-052 | Audit Graph | なぜ | normalized-line:844 |
| C03-053 | Audit Graph | 変更前 | normalized-line:845 |
| C03-054 | Audit Graph | 変更後 | normalized-line:846 |
| C03-055 | Audit Graph | 使用データ | normalized-line:847 |
| C03-056 | Audit Graph | AIが参照した根拠 | normalized-line:848 |
| C03-057 | Audit Graph | AIの出力 | normalized-line:849 |
| C03-058 | Audit Graph | AIの信頼度 | normalized-line:850 |
| C03-059 | Audit Graph | 承認者 | normalized-line:851 |
| C03-060 | Audit Graph | 実行者 | normalized-line:852 |
| C03-061 | Audit Graph | IP / UAハッシュ | normalized-line:853 |
| C03-062 | Audit Graph | 関連approval_id | normalized-line:854 |
| C03-063 | Audit Graph | 関連execution_job_id | normalized-line:855 |
| C03-064 | Audit Graph | 関連business_event_id | normalized-line:856 |
| C03-065 | Audit Graph | 関連customer_id | normalized-line:857 |
| C03-066 | Audit Graph | 関連invoice_id | normalized-line:858 |
| C03-067 | Audit Graph | 関連campaign_id | normalized-line:859 |
| C03-068 | Audit Graph | 関連AI社員 | normalized-line:860 |
| C03-069 | Audit Graph | 失敗理由 | normalized-line:861 |
| C03-070 | Audit Graph | 補償アクション | normalized-line:862 |
| C03-071 | Audit Graph | Security Exception | normalized-line:863 |
| C03-072 | Audit Graph | Consent Check結果 | normalized-line:864 |
| C03-073 | Audit Graph | Compliance Check結果 | normalized-line:865 |

## 関連

- [[00_完全機能台帳インデックス]]
- [[案Bプラス並行前進とPhase3.5_Phase4開始]]
