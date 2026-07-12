# 369 OS Phase Readiness Matrix V3

- 基準日: 2026-07-13 JST
- Release Path固定head: PR #18 `fa04e7405cf3ab6cb56f329804fc778dde6470b0`
- Matrixの意味: 実装、CI、独立監査、Preview、main、Productionを分離した現在地
- 完成宣言: しない

## 1. Evidence段階

| 状態 | 意味 |
|---|---|
| `ROADMAP_ONLY` | 計画のみ。実装証拠なし |
| `DRAFT_IMPLEMENTED` | Draft branchに限定実装あり |
| `CI_VERIFIED` | 固定SHAのCI本文で対象試験を確認 |
| `CODEX_VERIFIED` | Codexが固定SHAを独立監査 |
| `HUMAN_PREVIEW_VERIFIED` | 人間が同一SHAのPreviewを実操作確認 |
| `MAIN_MERGED` | GitHub mainへ履歴付きで統合済み |
| `PRODUCTION_VERIFIED` | Productionで受入条件を実測 |
| `EVIDENCE_GAP` | 実装候補はあるが必要証拠が不足 |

上位段階は自動的に継承しない。特にCI greenはPreview、main、Productionの証拠ではない。

## 2. Repository lineage

| 系譜 | 現在地 | 判定 |
|---|---|---|
| app main | `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978` | 現行main。V72 Draft未統合 |
| Phase 3 base | PR #14 `ba01244...` | Draft |
| Release Path / C21 | PR #18 `fa04e74...` | `CODEX_VERIFIED / HUMAN_PREVIEW_REQUIRED` |
| C19 | PR #22 `1379317...` | `CI_VERIFIED / CHANGES_REQUIRED` |
| Phase 4 | PR #20 `9080df1...` | `CODEX_VERIFIED / EVIDENCE_GAP` |
| Codex Evidence | `codex/v72-max-autonomous-reaudit` | Matrix・Evidence同期branch |
| vault main | `0812634...` | V72未統合 |

安全な統合候補順は`PR #14 -> PR #18 -> Codex Evidence`。PR #22とPR #20は独立laneとして、各Gateを満たすまでRelease Pathへ混在させない。

## 3. Phase 3 / 3.5 / 4

| Phase / 機能群 | 実装 | CI | Codex | Preview | main / Production | 現在の意味 |
|---|---|---|---|---|---|---|
| Phase 3 Growth Engine v0 | `DRAFT_IMPLEMENTED` | `CI_VERIFIED` | `CODEX_VERIFIED` | 旧SHAのみ人間確認 | HOLD | 管制塔、read-only分析、AI下書き、安全境界のv0。全Growth Channel完成ではない |
| Phase 3.5 C21 SEO/Content | `DRAFT_IMPLEMENTED` | 472 unit / 146 E2E | `CODEX_VERIFIED` | 新SHA待ち | HOLD | 内部review-only承認まで。CMS公開・外部送信・実LLMなし |
| Phase 3.5 C19 Ads | `DRAFT_IMPLEMENTED` | 481 unit / 158 E2E | `CHANGES_REQUIRED` | 旧DB Gateのみ | HOLD | read-only、AI下書き、内部承認。並行冪等性P2が残る |
| Phase 3.5 C22 Referral | `ROADMAP_ONLY` | なし | 未監査 | なし | HOLD | 外部紹介送信を持たない最小Draftから着手予定 |
| Phase 4 AI社員可視化 | `DRAFT_IMPLEMENTED` | `CI_VERIFIED` | `CODEX_VERIFIED` | 新SHA待ち | HOLD | 8名、一覧、詳細、3D、canonical profile/state |
| Phase 4 Human Gate | `DRAFT_IMPLEMENTED` | 493 unit / 159 E2E | `CODEX_VERIFIED` | 固有画面待ち | HOLD | approveはQUEUED、stale再確認、AI拒否、6表rollback |
| Phase 4 実行再開 | `DRAFT_IMPLEMENTED` | ローカルBullMQ 9/9 | `EVIDENCE_GAP` | なし | HOLD | CI実Redis、production worker、stalled recovery、実requeueが未証明 |
| AI Inbox | `ROADMAP_ONLY` | なし | 未監査 | なし | HOLD | read-only集約から段階着手 |
| Execution Receipt | `ROADMAP_ONLY` | なし | 未監査 | なし | HOLD | 実行結果と監査証拠を結ぶreceipt |
| Workflow Dry Run | `ROADMAP_ONLY` | なし | 未監査 | なし | HOLD | 外部作用なしの事前シミュレーション |

## 4. 4軸ロードマップ対応

| 軸 | 現在地 | 次段 |
|---|---|---|
| Repository lineage | Phase 3 Draft -> Phase 3.5/4並行Draft | Human Preview -> RC監査 -> 人間main Gate |
| Business Phase 0-20 | Phase 3 Growth v0とPhase 4 AI Workforceの入口 | Phase 3.5主要channel接続、Phase 4実行証拠 |
| PDF Phase 2.5-18 | Phase 3承認・監査基盤相当をDraftで強化中 | 実運用Gate、会計/労務/電子帳簿を段階拡張 |
| Strategy 18.5-26 | 未到達。Marketplace、MCP、課金、広域外部連携は封印 | 人間承認後の後続Phase |

この表は異なる番号体系を無理に同じ進捗率へ換算しない。各軸の証拠段階を正とする。

## 5. 競合カテゴリの段階実装

| 分野 | 369 OSの現状 | 公式ベースライン例 | 判定 |
|---|---|---|---|
| Salesforce型CRM/SFA | CRM、案件、pipeline、承認、監査の限定実装あり | Sales Cloudのlead/opportunity/pipeline等 | `PARTIAL / FIT_GAP_REQUIRED` |
| Money Forward型会計 | 見積、契約、請求、財務summary、仕訳候補の限定実装あり | 自動仕訳、帳票、決算、経営レポート、周辺連携 | `PARTIAL / ROADMAP_ONLY` |
| freee型会計 | 会計・請求の限定縦切りあり | 取引、帳簿、決算、証憑、電子保存 | `PARTIAL / ROADMAP_ONLY` |
| 人事・労務 | ユーザー、権限、AI社員はあるが給与・勤怠・社保は未完成 | 従業員情報、勤怠、給与、入退社、年末調整、社会保険 | `ROADMAP_ONLY`中心 |
| 電子帳簿保存 | 一般文書・監査ログはあるが法的保存要件の総合証拠なし | 帳簿、決算書、スキャナ保存、電子取引保存 | `ROADMAP_ONLY / LEGAL_REVIEW_REQUIRED` |

公式調査の起点:

- [Salesforce Sales Cloud公式資料](https://www.salesforce.com/content/dam/web/ja_jp/www/cloud-services/documents/Sales_Getting_Started_WithSalesCloud.pdf)
- [Money Forward クラウド会計の機能](https://biz.moneyforward.com/accounting/smb/function/)
- [Money Forward クラウド人事管理の機能](https://biz.moneyforward.com/employee/function/)
- [Money Forward クラウド給与の機能](https://biz.moneyforward.com/payroll/function/)
- [freee人事労務 機能帳票一覧](https://www.freee.co.jp/hr/features/list/)
- [freee 電子帳簿保存法の概要](https://support.freee.co.jp/hc/ja/articles/4410254921497)
- [国税庁 電子帳簿等保存制度特設サイト](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/index.htm)

これは公開情報を起点にした高水準分類であり、機能単位の完全fit-gapはClaudeの専用lane固定head受領後にEvidenceへ接続する。

Function ID単位のV72詳細分類は`COMPETITOR_FIT_GAP_V72.md`を正とする。専用Claude実装headがない範囲は、そこで`ROADMAP_ONLY`または`EVIDENCE_GAP`に留めた。

## 6. 次の3 WIP

1. **C19冪等性クローズ**: DB一意性またはCAS、並行実PG、Action全体retry、固定SHA再監査。
2. **Human Preview / RC**: PR #18 exact headのmobile theme、C21、NAV、AI社員/3Dを確認し、ancestry・競合・機能消失をRCで再監査。
3. **Phase 4実行証拠**: CI実Redis、approved run requeue、worker restart/stalled recovery、Execution Receipt、固有画面artifact。

C22、AI Inbox、Workflow Dry Run、競合fit-gapは、上記を妨げない別branchで外部作用なしのDraftまで並行可能。

## 7. 人間Gate

人間だけが行うもの:

- 認証付きVercel Previewの実操作とBuild Logs確認。
- app main merge、Production deploy、schema/migrationの本番適用。
- 実Redis/worker運用構成、外部connector、実LLM、課金、実支払の解禁。
- credential失効・ローテーション完了の確認。
- 会計、税務、労務、電子帳簿の法務・専門家レビュー。

それ以外のread-only監査、CI/artifact確認、Evidence更新、Draft同期はCodex/Claudeが継続できる。

## 8. 残存リスク

- C19並行冪等性P2。
- BullMQ/workerの本番相当証拠不足。
- 新固定SHAのHuman Preview未完了。
- main/Production未統合。
- 完全fit-gap未作成。
- credential失効確認待ち。

Matrix V3の作成はRelease Pathの限定合格を可視化するものであり、全Phase、競合機能、セキュリティ、Productionの完成を意味しない。
