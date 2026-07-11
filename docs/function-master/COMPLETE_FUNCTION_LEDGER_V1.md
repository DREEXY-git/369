# 369 / IKEZAKI OS 完全機能台帳 v1.0

> GENERATED FILE: 手動編集禁止。原典または会話追加要件を変更し、生成スクリプトを再実行してください。

## 正本ルール

- 本ファイルはGitHub上の人間可読な機能正本です。機械可読版は `COMPLETE_FUNCTION_LEDGER_V1.json` です。
- 実装済みかどうかは本台帳から推測せず、`FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md` の証拠だけで判定します。
- 新規タスク、Issue、PR、ロードマップ項目、統合プロンプトは、対象Function IDを最低1つ参照します。
- C49の詳細機能は原典欠落です。FM237など別系列を根拠に、C49の欠落を勝手に埋めてはいけません。

## 原典指紋

- ファイル名: `pasted-text.txt`
- raw SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`
- normalized SHA-256: `18e3cc79a80bc218b7a619b61b320b6a672ce958a348158efc6aa52f54165ad3`
- normalized lines: 8512
- Appendix A: lines 599-5563
- Appendix B: lines 5568-8510

## 抽出集計

- Appendix Aカテゴリ: 50
- Appendix A原子機能: 2553
- 詳細節欠落カテゴリ: 1（C49）
- Appendix A共通AIルール記録: 51
- Appendix A補足記録: 1963
- Function Master領域: 126
- FM231-FM252候補グループ: 22
- FM231-FM252候補詳細: 349
- Appendix Bその他要件記録: 2362
- 会話追加要件: 9
- 全系列の一意な安定ID: 7485

## 50カテゴリ索引

| Category | 名称 | 役割 | 原子機能数 | 原典状態 | 原典 |
| --- | --- | --- | --- | --- | --- |
| C01 | Core OS / Tenant基盤 | 会社・組織・ユーザー・テナント管理 | 62 | SOURCE_DETAIL_PRESENT | normalized-line:613 |
| C02 | Enterprise Identity / Admin | SSO、SCIM、組織階層、管理者機能 | 50 | SOURCE_DETAIL_PRESENT | normalized-line:614 |
| C03 | Permission / Approval / Audit | 権限、承認、監査、証跡 | 73 | SOURCE_DETAIL_PRESENT | normalized-line:615 |
| C04 | AI Governance / Agent Control Plane | AI社員の管理・権限・停止・評価 | 97 | SOURCE_DETAIL_PRESENT | normalized-line:616 |
| C05 | AI Safety / Evaluation / Red Team | AI社員の品質保証・暴走防止 | 60 | SOURCE_DETAIL_PRESENT | normalized-line:617 |
| C06 | Data Governance / Semantic Layer | 企業データをAIが正しく理解する意味辞書 | 79 | SOURCE_DETAIL_PRESENT | normalized-line:618 |
| C07 | Company Brain / Knowledge OS | 社内ナレッジ、docs、議事録、RAG | 60 | SOURCE_DETAIL_PRESENT | normalized-line:619 |
| C08 | CRM / Customer 360 | 顧客・リード・商談・LTV管理 | 90 | SOURCE_DETAIL_PRESENT | normalized-line:620 |
| C09 | SFA / Sales OS | 営業活動・案件・パイプライン管理 | 62 | SOURCE_DETAIL_PRESENT | normalized-line:621 |
| C10 | Quote / Pricing / Product Master | 見積・価格・商品マスタ | 65 | SOURCE_DETAIL_PRESENT | normalized-line:622 |
| C11 | Contract / Legal Ops | 契約・法務・規約・電子契約 | 54 | SOURCE_DETAIL_PRESENT | normalized-line:623 |
| C12 | Invoice / Billing | 請求・請求書・売掛 | 56 | SOURCE_DETAIL_PRESENT | normalized-line:624 |
| C13 | Payment / Reconciliation | 入金・消込・支払 | 34 | SOURCE_DETAIL_PRESENT | normalized-line:625 |
| C14 | Accounting / Finance | 会計・仕訳・管理会計・資金繰り | 49 | SOURCE_DETAIL_PRESENT | normalized-line:626 |
| C15 | ERP / Operations | 受発注・在庫・購買・原価・業務管理 | 57 | SOURCE_DETAIL_PRESENT | normalized-line:627 |
| C16 | EC / POS / Reservation | EC、店舗、POS、予約、来店管理 | 69 | SOURCE_DETAIL_PRESENT | normalized-line:628 |
| C17 | Procurement / PLUG / Price Compare | 購買最適化、最安値、アフィリエイト | 52 | SOURCE_DETAIL_PRESENT | normalized-line:629 |
| C18 | AD OS / Growth Engine | 広告・SNS・LINE・SEO・PR・紹介・成果分析 | 71 | SOURCE_DETAIL_PRESENT | normalized-line:630 |
| C19 | Ads Management | 広告媒体・予算・成果・改善提案 | 53 | SOURCE_DETAIL_PRESENT | normalized-line:631 |
| C20 | SNS / LINE / Email / DM | 配信・投稿・反応・同意・成果管理 | 60 | SOURCE_DETAIL_PRESENT | normalized-line:632 |
| C21 | SEO / Content / PR | 記事、LP、PR、導入事例、ブランド発信 | 54 | SOURCE_DETAIL_PRESENT | normalized-line:633 |
| C22 | Referral / Affiliate / Creator | 紹介、アフィリエイト、クリエイター、Business Network | 54 | SOURCE_DETAIL_PRESENT | normalized-line:634 |
| C23 | HR / Recruiting | 採用、応募者、面接、採用広報 | 38 | SOURCE_DETAIL_PRESENT | normalized-line:635 |
| C24 | Labor / People Ops | 従業員、勤怠、評価、労務、権限変更 | 49 | SOURCE_DETAIL_PRESENT | normalized-line:636 |
| C25 | Education / Academy | 社内教育、研修、369 Academy、認定 | 39 | SOURCE_DETAIL_PRESENT | normalized-line:637 |
| C26 | Customer Support / CS | 問い合わせ、チケット、FAQ、顧客ポータル | 53 | SOURCE_DETAIL_PRESENT | normalized-line:638 |
| C27 | Project / Task / Workflow | タスク、稟議、プロジェクト、業務自動化 | 51 | SOURCE_DETAIL_PRESENT | normalized-line:639 |
| C28 | BI / Dashboard / Reporting | 経営・営業・広告・財務・AI社員ダッシュボード | 52 | SOURCE_DETAIL_PRESENT | normalized-line:640 |
| C29 | Business Simulator / Digital Twin | 売上・粗利・LTV・広告・採用・在庫シミュレーション | 36 | SOURCE_DETAIL_PRESENT | normalized-line:641 |
| C30 | AI Employee Platform | AI社員そのものの運用基盤 | 57 | SOURCE_DETAIL_PRESENT | normalized-line:642 |
| C31 | AI Employee Development Environment | AI社員・Pluginを誰でも作れる開発環境 | 52 | SOURCE_DETAIL_PRESENT | normalized-line:643 |
| C32 | AI Employee Marketplace | AI社員ストア、審査、販売、収益分配 | 50 | SOURCE_DETAIL_PRESENT | normalized-line:644 |
| C33 | Developer Platform | API、Webhook、SDK、MCP、外部開発者 | 38 | SOURCE_DETAIL_PRESENT | normalized-line:645 |
| C34 | Integration Hub / Adapter | 外部SaaS連携、CSV、Google Sheets、Webhook | 63 | SOURCE_DETAIL_PRESENT | normalized-line:646 |
| C35 | Browser Extension / Desktop / Mobile | PLUG型拡張、スマホ、デスクトップ補助 | 45 | SOURCE_DETAIL_PRESENT | normalized-line:647 |
| C36 | Billing / Metering / FinOps | 従量課金、AI原価、開発者報酬、ユニットエコノミクス | 50 | SOURCE_DETAIL_PRESENT | normalized-line:648 |
| C37 | Trust Center / Compliance Center | セキュリティ、AI安全性、個人情報、契約資料 | 57 | SOURCE_DETAIL_PRESENT | normalized-line:649 |
| C38 | Consent / Privacy / Data Protection | 同意、配信停止、第三者提供、個人情報制御 | 41 | SOURCE_DETAIL_PRESENT | normalized-line:650 |
| C39 | Security / Zero Trust | テナント分離、RLS、暗号化、Secrets、MFA | 45 | SOURCE_DETAIL_PRESENT | normalized-line:651 |
| C40 | Observability / SRE / Incident | 障害監視、ログ、トレース、Status、SLA | 43 | SOURCE_DETAIL_PRESENT | normalized-line:652 |
| C41 | Onboarding / Migration | 初期設定、CSV移行、業種別セットアップ | 52 | SOURCE_DETAIL_PRESENT | normalized-line:653 |
| C42 | Vertical Template Factory | 業界別OSテンプレート量産基盤 | 40 | SOURCE_DETAIL_PRESENT | normalized-line:654 |
| C43 | White-label / Embedded | 他社SaaS、他社OSへの組み込み | 25 | SOURCE_DETAIL_PRESENT | normalized-line:655 |
| C44 | International / Multi-region | 多言語、多通貨、海外、リージョン管理 | 24 | SOURCE_DETAIL_PRESENT | normalized-line:656 |
| C45 | Physical AI / IoT / Robotics | 将来のロボット、店舗、現場、IoT連携 | 32 | SOURCE_DETAIL_PRESENT | normalized-line:657 |
| C46 | Governance Docs / GitHub / Obsidian | 正本docs、ロードマップ、監査、Claude Code連携 | 49 | SOURCE_DETAIL_PRESENT | normalized-line:658 |
| C47 | Sales / Partner / Go-to-market Ops | 営業管理、導入支援、代理店なし成長導線 | 36 | SOURCE_DETAIL_PRESENT | normalized-line:659 |
| C48 | Risk / Insurance / Liability | AI事故、責任分界、補償、事故報告 | 39 | SOURCE_DETAIL_PRESENT | normalized-line:660 |
| C49 | App Review / Marketplace Governance | AI社員・Pluginの審査、停止、互換性 | 0 | SOURCE_DETAIL_MISSING | normalized-line:661 |
| C50 | Community / Ecosystem Analytics | 開発者・導入企業・AI社員経済圏の分析 | 36 | SOURCE_DETAIL_PRESENT | normalized-line:662 |

## C01 Core OS / Tenant基盤

会社・組織・ユーザー・テナント管理

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

## C02 Enterprise Identity / Admin

SSO、SCIM、組織階層、管理者機能

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C02-001 | 認証・認可 | メールログイン | normalized-line:734 |
| C02-002 | 認証・認可 | パスワードレスログイン | normalized-line:735 |
| C02-003 | 認証・認可 | Magic Link | normalized-line:736 |
| C02-004 | 認証・認可 | OAuth | normalized-line:737 |
| C02-005 | 認証・認可 | OIDC | normalized-line:738 |
| C02-006 | 認証・認可 | SAML SSO | normalized-line:739 |
| C02-007 | 認証・認可 | Google Workspace SSO | normalized-line:740 |
| C02-008 | 認証・認可 | Microsoft Entra ID連携 | normalized-line:741 |
| C02-009 | 認証・認可 | Okta連携 | normalized-line:742 |
| C02-010 | 認証・認可 | OneLogin連携 | normalized-line:743 |
| C02-011 | 認証・認可 | SCIM | normalized-line:744 |
| C02-012 | 認証・認可 | JIT Provisioning | normalized-line:745 |
| C02-013 | 認証・認可 | Directory Sync | normalized-line:746 |
| C02-014 | 認証・認可 | MFA | normalized-line:747 |
| C02-015 | 認証・認可 | 2FA | normalized-line:748 |
| C02-016 | 認証・認可 | Passkey | normalized-line:749 |
| C02-017 | 認証・認可 | IP制限 | normalized-line:750 |
| C02-018 | 認証・認可 | デバイス制限 | normalized-line:751 |
| C02-019 | 認証・認可 | セッション管理 | normalized-line:752 |
| C02-020 | 認証・認可 | 強制ログアウト | normalized-line:753 |
| C02-021 | 認証・認可 | 退職者自動停止 | normalized-line:754 |
| C02-022 | 認証・認可 | 休職者アクセス制限 | normalized-line:755 |
| C02-023 | 認証・認可 | ゲスト期限管理 | normalized-line:756 |
| C02-024 | 認証・認可 | 管理者権限委譲 | normalized-line:757 |
| C02-025 | 認証・認可 | Break-glass Admin | normalized-line:758 |
| C02-026 | 認証・認可 | Emergency Access | normalized-line:759 |
| C02-027 | Enterprise Admin | Admin Console | normalized-line:761 |
| C02-028 | Enterprise Admin | User Lifecycle Management | normalized-line:762 |
| C02-029 | Enterprise Admin | Role Template | normalized-line:763 |
| C02-030 | Enterprise Admin | Permission Template | normalized-line:764 |
| C02-031 | Enterprise Admin | Access Review | normalized-line:765 |
| C02-032 | Enterprise Admin | 権限棚卸し | normalized-line:766 |
| C02-033 | Enterprise Admin | 定期アクセスレビュー | normalized-line:767 |
| C02-034 | Enterprise Admin | 管理者操作ログ | normalized-line:768 |
| C02-035 | Enterprise Admin | ユーザー操作ログ | normalized-line:769 |
| C02-036 | Enterprise Admin | セキュリティイベントログ | normalized-line:770 |
| C02-037 | Enterprise Admin | データエクスポートログ | normalized-line:771 |
| C02-038 | Enterprise Admin | 監査ログエクスポート | normalized-line:772 |
| C02-039 | Enterprise Admin | 監査人ロール | normalized-line:773 |
| C02-040 | Enterprise Admin | Legal Hold | normalized-line:774 |
| C02-041 | Enterprise Admin | eDiscovery | normalized-line:775 |
| C02-042 | Enterprise Admin | Data Retention Policy | normalized-line:776 |
| C02-043 | Enterprise Admin | Data Deletion Policy | normalized-line:777 |
| C02-044 | Enterprise Admin | 子会社管理 | normalized-line:778 |
| C02-045 | Enterprise Admin | グループ会社管理 | normalized-line:779 |
| C02-046 | Enterprise Admin | 部門別管理者 | normalized-line:780 |
| C02-047 | Enterprise Admin | 店舗別管理者 | normalized-line:781 |
| C02-048 | Enterprise Admin | クライアント別閲覧者 | normalized-line:782 |
| C02-049 | Enterprise Admin | 外部パートナー権限 | normalized-line:783 |
| C02-050 | Enterprise Admin | 取引先ポータル権限 | normalized-line:784 |

## C03 Permission / Approval / Audit

権限、承認、監査、証跡

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

## C04 AI Governance / Agent Control Plane

AI社員の管理・権限・停止・評価

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

## C05 AI Safety / Evaluation / Red Team

AI社員の品質保証・暴走防止

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

## C06 Data Governance / Semantic Layer

企業データをAIが正しく理解する意味辞書

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

## C07 Company Brain / Knowledge OS

社内ナレッジ、docs、議事録、RAG

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C07-001 | 対象データ | 社内文書 | normalized-line:1128 |
| C07-002 | 対象データ | 仕様書 | normalized-line:1129 |
| C07-003 | 対象データ | マニュアル | normalized-line:1130 |
| C07-004 | 対象データ | 議事録 | normalized-line:1131 |
| C07-005 | 対象データ | 顧客メモ | normalized-line:1132 |
| C07-006 | 対象データ | 営業履歴 | normalized-line:1133 |
| C07-007 | 対象データ | 契約書 | normalized-line:1134 |
| C07-008 | 対象データ | 請求情報 | normalized-line:1135 |
| C07-009 | 対象データ | プロジェクト情報 | normalized-line:1136 |
| C07-010 | 対象データ | 採用情報 | normalized-line:1137 |
| C07-011 | 対象データ | 教育資料 | normalized-line:1138 |
| C07-012 | 対象データ | FAQ | normalized-line:1139 |
| C07-013 | 対象データ | Slack / Chat | normalized-line:1140 |
| C07-014 | 対象データ | メール | normalized-line:1141 |
| C07-015 | 対象データ | Google Drive | normalized-line:1142 |
| C07-016 | 対象データ | Notion | normalized-line:1143 |
| C07-017 | 対象データ | Obsidian | normalized-line:1144 |
| C07-018 | 対象データ | GitHub docs | normalized-line:1145 |
| C07-019 | 対象データ | Claude Code実行結果 | normalized-line:1146 |
| C07-020 | 対象データ | Codex監査結果 | normalized-line:1147 |
| C07-021 | 対象データ | ロードマップ | normalized-line:1148 |
| C07-022 | 対象データ | 意思決定ログ | normalized-line:1149 |
| C07-023 | 対象データ | ADR | normalized-line:1150 |
| C07-024 | 対象データ | 事故報告 | normalized-line:1151 |
| C07-025 | 対象データ | 監査ログ | normalized-line:1152 |
| C07-026 | 機能 | Knowledge Graph | normalized-line:1154 |
| C07-027 | 機能 | Document Registry | normalized-line:1155 |
| C07-028 | 機能 | Source Registry | normalized-line:1156 |
| C07-029 | 機能 | RAG | normalized-line:1157 |
| C07-030 | 機能 | Tenant-aware Retrieval | normalized-line:1158 |
| C07-031 | 機能 | Permission-aware Retrieval | normalized-line:1159 |
| C07-032 | 機能 | Consent-aware Retrieval | normalized-line:1160 |
| C07-033 | 機能 | Sensitive-aware Retrieval | normalized-line:1161 |
| C07-034 | 機能 | Vector Index | normalized-line:1162 |
| C07-035 | 機能 | Embedding管理 | normalized-line:1163 |
| C07-036 | 機能 | Embedding更新 | normalized-line:1164 |
| C07-037 | 機能 | 文書バージョン管理 | normalized-line:1165 |
| C07-038 | 機能 | 文書承認 | normalized-line:1166 |
| C07-039 | 機能 | 文書公開 | normalized-line:1167 |
| C07-040 | 機能 | 文書廃止 | normalized-line:1168 |
| C07-041 | 機能 | ナレッジ検索 | normalized-line:1169 |
| C07-042 | 機能 | AI要約 | normalized-line:1170 |
| C07-043 | 機能 | AI質問応答 | normalized-line:1171 |
| C07-044 | 機能 | AI根拠表示 | normalized-line:1172 |
| C07-045 | 機能 | 引用表示 | normalized-line:1173 |
| C07-046 | 機能 | 社内FAQ生成 | normalized-line:1174 |
| C07-047 | 機能 | 業務マニュアル生成 | normalized-line:1175 |
| C07-048 | 機能 | 議事録要約 | normalized-line:1176 |
| C07-049 | 機能 | タスク抽出 | normalized-line:1177 |
| C07-050 | 機能 | 決定事項抽出 | normalized-line:1178 |
| C07-051 | 機能 | 未決事項抽出 | normalized-line:1179 |
| C07-052 | 機能 | 顧客別履歴要約 | normalized-line:1180 |
| C07-053 | 機能 | 商談別履歴要約 | normalized-line:1181 |
| C07-054 | 機能 | プロジェクト別要約 | normalized-line:1182 |
| C07-055 | 機能 | 新人向け説明生成 | normalized-line:1183 |
| C07-056 | 機能 | 経営者向け説明生成 | normalized-line:1184 |
| C07-057 | 機能 | 非エンジニア向け進捗説明 | normalized-line:1185 |
| C07-058 | 機能 | GitHub正本連携 | normalized-line:1186 |
| C07-059 | 機能 | Obsidian Vault連携 | normalized-line:1187 |
| C07-060 | 機能 | docs正本管理 | normalized-line:1188 |

## C08 CRM / Customer 360

顧客・リード・商談・LTV管理

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

## C09 SFA / Sales OS

営業活動・案件・パイプライン管理

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C09-001 | 営業管理 | Lead Management | normalized-line:1290 |
| C09-002 | 営業管理 | Opportunity Management | normalized-line:1291 |
| C09-003 | 営業管理 | Deal Management | normalized-line:1292 |
| C09-004 | 営業管理 | Pipeline | normalized-line:1293 |
| C09-005 | 営業管理 | Sales Stage | normalized-line:1294 |
| C09-006 | 営業管理 | Forecast | normalized-line:1295 |
| C09-007 | 営業管理 | Activity | normalized-line:1296 |
| C09-008 | 営業管理 | Task | normalized-line:1297 |
| C09-009 | 営業管理 | Call Log | normalized-line:1298 |
| C09-010 | 営業管理 | Meeting Log | normalized-line:1299 |
| C09-011 | 営業管理 | Email Log | normalized-line:1300 |
| C09-012 | 営業管理 | LINE Log | normalized-line:1301 |
| C09-013 | 営業管理 | Proposal Log | normalized-line:1302 |
| C09-014 | 営業管理 | Quote Log | normalized-line:1303 |
| C09-015 | 営業管理 | Contract Log | normalized-line:1304 |
| C09-016 | 営業管理 | Loss Reason | normalized-line:1305 |
| C09-017 | 営業管理 | Competitor | normalized-line:1306 |
| C09-018 | 営業管理 | Sales Territory | normalized-line:1307 |
| C09-019 | 営業管理 | Sales Team | normalized-line:1308 |
| C09-020 | 営業管理 | Sales Target | normalized-line:1309 |
| C09-021 | 営業管理 | Sales Quota | normalized-line:1310 |
| C09-022 | 営業管理 | Sales Performance | normalized-line:1311 |
| C09-023 | 営業管理 | Sales Forecast | normalized-line:1312 |
| C09-024 | 営業管理 | Sales Playbook | normalized-line:1313 |
| C09-025 | 商談機能 | 商談作成 | normalized-line:1315 |
| C09-026 | 商談機能 | 商談ステージ管理 | normalized-line:1316 |
| C09-027 | 商談機能 | 商談金額 | normalized-line:1317 |
| C09-028 | 商談機能 | 受注確度 | normalized-line:1318 |
| C09-029 | 商談機能 | 受注予定日 | normalized-line:1319 |
| C09-030 | 商談機能 | 次回アクション | normalized-line:1320 |
| C09-031 | 商談機能 | 担当者 | normalized-line:1321 |
| C09-032 | 商談機能 | 共同担当者 | normalized-line:1322 |
| C09-033 | 商談機能 | 関連顧客 | normalized-line:1323 |
| C09-034 | 商談機能 | 関連見積 | normalized-line:1324 |
| C09-035 | 商談機能 | 関連契約 | normalized-line:1325 |
| C09-036 | 商談機能 | 関連請求 | normalized-line:1326 |
| C09-037 | 商談機能 | 関連タスク | normalized-line:1327 |
| C09-038 | 商談機能 | 商談メモ | normalized-line:1328 |
| C09-039 | 商談機能 | 商談履歴 | normalized-line:1329 |
| C09-040 | 商談機能 | 商談ファイル | normalized-line:1330 |
| C09-041 | 商談機能 | 商談リスク | normalized-line:1331 |
| C09-042 | 商談機能 | 商談失注理由 | normalized-line:1332 |
| C09-043 | 商談機能 | 競合情報 | normalized-line:1333 |
| C09-044 | 商談機能 | 承認必要な値引き | normalized-line:1334 |
| C09-045 | 商談機能 | 営業マネージャーレビュー | normalized-line:1335 |
| C09-046 | AI営業 | 営業メール下書き | normalized-line:1337 |
| C09-047 | AI営業 | 商談要約 | normalized-line:1338 |
| C09-048 | AI営業 | 商談次アクション | normalized-line:1339 |
| C09-049 | AI営業 | 受注確度推定 | normalized-line:1340 |
| C09-050 | AI営業 | 失注リスク検知 | normalized-line:1341 |
| C09-051 | AI営業 | フォロー漏れ検知 | normalized-line:1342 |
| C09-052 | AI営業 | パイプライン異常検知 | normalized-line:1343 |
| C09-053 | AI営業 | 商談優先順位 | normalized-line:1344 |
| C09-054 | AI営業 | 類似商談検索 | normalized-line:1345 |
| C09-055 | AI営業 | 勝ちパターン提示 | normalized-line:1346 |
| C09-056 | AI営業 | 失注理由分析 | normalized-line:1347 |
| C09-057 | AI営業 | 営業日報自動生成 | normalized-line:1348 |
| C09-058 | AI営業 | 週次営業レポート | normalized-line:1349 |
| C09-059 | AI営業 | 営業トーク改善 | normalized-line:1350 |
| C09-060 | AI営業 | 提案資料構成案 | normalized-line:1351 |
| C09-061 | AI営業 | 見積内容チェック | normalized-line:1352 |
| C09-062 | AI営業 | 値引き妥当性チェック | normalized-line:1353 |

## C10 Quote / Pricing / Product Master

見積・価格・商品マスタ

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C10-001 | 商品マスタ | Product | normalized-line:1358 |
| C10-002 | 商品マスタ | Service | normalized-line:1359 |
| C10-003 | 商品マスタ | SKU | normalized-line:1360 |
| C10-004 | 商品マスタ | Plan | normalized-line:1361 |
| C10-005 | 商品マスタ | Package | normalized-line:1362 |
| C10-006 | 商品マスタ | Option | normalized-line:1363 |
| C10-007 | 商品マスタ | Add-on | normalized-line:1364 |
| C10-008 | 商品マスタ | Bundle | normalized-line:1365 |
| C10-009 | 商品マスタ | Subscription Item | normalized-line:1366 |
| C10-010 | 商品マスタ | One-time Item | normalized-line:1367 |
| C10-011 | 商品マスタ | Usage-based Item | normalized-line:1368 |
| C10-012 | 商品マスタ | Commission Item | normalized-line:1369 |
| C10-013 | 商品マスタ | Agency Fee Item | normalized-line:1370 |
| C10-014 | 商品マスタ | Discount Item | normalized-line:1371 |
| C10-015 | 商品マスタ | Tax Category | normalized-line:1372 |
| C10-016 | 商品マスタ | Cost | normalized-line:1373 |
| C10-017 | 商品マスタ | Margin | normalized-line:1374 |
| C10-018 | 商品マスタ | Inventory Link | normalized-line:1375 |
| C10-019 | 商品マスタ | EC Link | normalized-line:1376 |
| C10-020 | 商品マスタ | POS Link | normalized-line:1377 |
| C10-021 | 価格管理 | 定価 | normalized-line:1379 |
| C10-022 | 価格管理 | 原価 | normalized-line:1380 |
| C10-023 | 価格管理 | 粗利率 | normalized-line:1381 |
| C10-024 | 価格管理 | 割引価格 | normalized-line:1382 |
| C10-025 | 価格管理 | キャンペーン価格 | normalized-line:1383 |
| C10-026 | 価格管理 | 顧客別価格 | normalized-line:1384 |
| C10-027 | 価格管理 | 契約別価格 | normalized-line:1385 |
| C10-028 | 価格管理 | 数量割引 | normalized-line:1386 |
| C10-029 | 価格管理 | 期間限定価格 | normalized-line:1387 |
| C10-030 | 価格管理 | サブスク価格 | normalized-line:1388 |
| C10-031 | 価格管理 | 従量課金価格 | normalized-line:1389 |
| C10-032 | 価格管理 | 成果報酬率 | normalized-line:1390 |
| C10-033 | 価格管理 | 代理店手数料 | normalized-line:1391 |
| C10-034 | 価格管理 | 媒体費マージン | normalized-line:1392 |
| C10-035 | 価格管理 | 最低価格 | normalized-line:1393 |
| C10-036 | 価格管理 | 値引き上限 | normalized-line:1394 |
| C10-037 | 価格管理 | 承認必要値引き | normalized-line:1395 |
| C10-038 | 価格管理 | 価格改定履歴 | normalized-line:1396 |
| C10-039 | 価格管理 | 価格適用期間 | normalized-line:1397 |
| C10-040 | 見積機能 | 見積作成 | normalized-line:1399 |
| C10-041 | 見積機能 | 見積明細 | normalized-line:1400 |
| C10-042 | 見積機能 | 見積テンプレート | normalized-line:1401 |
| C10-043 | 見積機能 | 見積PDF | normalized-line:1402 |
| C10-044 | 見積機能 | 見積承認 | normalized-line:1403 |
| C10-045 | 見積機能 | 見積送付 | normalized-line:1404 |
| C10-046 | 見積機能 | 見積期限 | normalized-line:1405 |
| C10-047 | 見積機能 | 見積バージョン | normalized-line:1406 |
| C10-048 | 見積機能 | 見積差分 | normalized-line:1407 |
| C10-049 | 見積機能 | 値引き申請 | normalized-line:1408 |
| C10-050 | 見積機能 | 値引き承認 | normalized-line:1409 |
| C10-051 | 見積機能 | 見積から契約 | normalized-line:1410 |
| C10-052 | 見積機能 | 見積から請求 | normalized-line:1411 |
| C10-053 | 見積機能 | 見積から商談更新 | normalized-line:1412 |
| C10-054 | 見積機能 | 顧客別見積履歴 | normalized-line:1413 |
| C10-055 | 見積機能 | 商品別見積履歴 | normalized-line:1414 |
| C10-056 | AI機能 | 見積ドラフト | normalized-line:1416 |
| C10-057 | AI機能 | 見積抜け漏れチェック | normalized-line:1417 |
| C10-058 | AI機能 | 原価割れ警告 | normalized-line:1418 |
| C10-059 | AI機能 | 粗利率警告 | normalized-line:1419 |
| C10-060 | AI機能 | 値引き過多警告 | normalized-line:1420 |
| C10-061 | AI機能 | 契約条件との整合 | normalized-line:1421 |
| C10-062 | AI機能 | 過去類似見積比較 | normalized-line:1422 |
| C10-063 | AI機能 | 推奨価格提示 | normalized-line:1423 |
| C10-064 | AI機能 | 承認必要判定 | normalized-line:1424 |
| C10-065 | AI機能 | 顧客別提案パッケージ生成 | normalized-line:1425 |

## C11 Contract / Legal Ops

契約・法務・規約・電子契約

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C11-001 | 契約管理 | 契約書ドラフト | normalized-line:1430 |
| C11-002 | 契約管理 | 契約テンプレート | normalized-line:1431 |
| C11-003 | 契約管理 | 契約条項 | normalized-line:1432 |
| C11-004 | 契約管理 | 契約ステータス | normalized-line:1433 |
| C11-005 | 契約管理 | 契約開始日 | normalized-line:1434 |
| C11-006 | 契約管理 | 契約終了日 | normalized-line:1435 |
| C11-007 | 契約管理 | 自動更新 | normalized-line:1436 |
| C11-008 | 契約管理 | 更新通知 | normalized-line:1437 |
| C11-009 | 契約管理 | 解約通知 | normalized-line:1438 |
| C11-010 | 契約管理 | 契約変更 | normalized-line:1439 |
| C11-011 | 契約管理 | 覚書 | normalized-line:1440 |
| C11-012 | 契約管理 | NDA | normalized-line:1441 |
| C11-013 | 契約管理 | 業務委託契約 | normalized-line:1442 |
| C11-014 | 契約管理 | 利用規約 | normalized-line:1443 |
| C11-015 | 契約管理 | DPA | normalized-line:1444 |
| C11-016 | 契約管理 | SLA | normalized-line:1445 |
| C11-017 | 契約管理 | 発注書 | normalized-line:1446 |
| C11-018 | 契約管理 | 申込書 | normalized-line:1447 |
| C11-019 | 契約管理 | 電子契約連携 | normalized-line:1448 |
| C11-020 | 契約管理 | 契約承認 | normalized-line:1449 |
| C11-021 | 契約管理 | 法務レビュー | normalized-line:1450 |
| C11-022 | 契約管理 | 契約リスク | normalized-line:1451 |
| C11-023 | 契約管理 | 契約差分 | normalized-line:1452 |
| C11-024 | 契約管理 | 契約バージョン | normalized-line:1453 |
| C11-025 | 契約管理 | 契約関連請求 | normalized-line:1454 |
| C11-026 | 契約管理 | 契約関連成果報酬 | normalized-line:1455 |
| C11-027 | 契約管理 | 契約関連AI制約 | normalized-line:1456 |
| C11-028 | Contract-as-Code | 契約条件構造化 | normalized-line:1458 |
| C11-029 | Contract-as-Code | 請求条件構造化 | normalized-line:1459 |
| C11-030 | Contract-as-Code | 成果報酬条件構造化 | normalized-line:1460 |
| C11-031 | Contract-as-Code | 更新条件構造化 | normalized-line:1461 |
| C11-032 | Contract-as-Code | 解約条件構造化 | normalized-line:1462 |
| C11-033 | Contract-as-Code | 返金条件構造化 | normalized-line:1463 |
| C11-034 | Contract-as-Code | SLA条件構造化 | normalized-line:1464 |
| C11-035 | Contract-as-Code | 禁止事項構造化 | normalized-line:1465 |
| C11-036 | Contract-as-Code | 承認条件構造化 | normalized-line:1466 |
| C11-037 | Contract-as-Code | 契約条件から請求ドラフト | normalized-line:1467 |
| C11-038 | Contract-as-Code | 契約条件からアラート | normalized-line:1468 |
| C11-039 | Contract-as-Code | 契約条件からAI実行制約 | normalized-line:1469 |
| C11-040 | Contract-as-Code | 契約条件から成果報酬候補 | normalized-line:1470 |
| C11-041 | Contract-as-Code | 契約条件からリスク判定 | normalized-line:1471 |
| C11-042 | AI法務 | 契約書要約 | normalized-line:1473 |
| C11-043 | AI法務 | リスク箇所抽出 | normalized-line:1474 |
| C11-044 | AI法務 | 重要条項抽出 | normalized-line:1475 |
| C11-045 | AI法務 | 更新期限抽出 | normalized-line:1476 |
| C11-046 | AI法務 | 解約期限抽出 | normalized-line:1477 |
| C11-047 | AI法務 | 請求条件抽出 | normalized-line:1478 |
| C11-048 | AI法務 | 成果報酬条件抽出 | normalized-line:1479 |
| C11-049 | AI法務 | 不利条項候補 | normalized-line:1480 |
| C11-050 | AI法務 | 契約差分説明 | normalized-line:1481 |
| C11-051 | AI法務 | 法務レビュー依頼 | normalized-line:1482 |
| C11-052 | AI法務 | 契約締結前チェック | normalized-line:1483 |
| C11-053 | AI法務 | ただし法的判断の断定は禁止 | normalized-line:1484 |
| C11-054 | AI法務 | 最終判断は人間・専門家承認 | normalized-line:1485 |

## C12 Invoice / Billing

請求・請求書・売掛

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C12-001 | 請求機能 | 請求先管理 | normalized-line:1491 |
| C12-002 | 請求機能 | 請求書作成 | normalized-line:1492 |
| C12-003 | 請求機能 | 請求書ドラフト | normalized-line:1493 |
| C12-004 | 請求機能 | 請求明細 | normalized-line:1494 |
| C12-005 | 請求機能 | 請求番号 | normalized-line:1495 |
| C12-006 | 請求機能 | 請求日 | normalized-line:1496 |
| C12-007 | 請求機能 | 支払期限 | normalized-line:1497 |
| C12-008 | 請求機能 | 請求ステータス | normalized-line:1498 |
| C12-009 | 請求機能 | 請求承認 | normalized-line:1499 |
| C12-010 | 請求機能 | 請求PDF | normalized-line:1500 |
| C12-011 | 請求機能 | 請求送付 | normalized-line:1501 |
| C12-012 | 請求機能 | 請求送付履歴 | normalized-line:1502 |
| C12-013 | 請求機能 | 請求取消 | normalized-line:1503 |
| C12-014 | 請求機能 | 修正請求 | normalized-line:1504 |
| C12-015 | 請求機能 | 分割請求 | normalized-line:1505 |
| C12-016 | 請求機能 | 定期請求 | normalized-line:1506 |
| C12-017 | 請求機能 | サブスク請求 | normalized-line:1507 |
| C12-018 | 請求機能 | 従量課金請求 | normalized-line:1508 |
| C12-019 | 請求機能 | 成果報酬請求 | normalized-line:1509 |
| C12-020 | 請求機能 | 代理店手数料請求 | normalized-line:1510 |
| C12-021 | 請求機能 | 媒体費精算請求 | normalized-line:1511 |
| C12-022 | 請求機能 | 税区分 | normalized-line:1512 |
| C12-023 | 請求機能 | 消費税 | normalized-line:1513 |
| C12-024 | 請求機能 | 源泉徴収 | normalized-line:1514 |
| C12-025 | 請求機能 | 値引き | normalized-line:1515 |
| C12-026 | 請求機能 | 返金 | normalized-line:1516 |
| C12-027 | 請求機能 | 相殺 | normalized-line:1517 |
| C12-028 | 請求機能 | 売掛管理 | normalized-line:1518 |
| C12-029 | 請求機能 | 未入金管理 | normalized-line:1519 |
| C12-030 | 請求機能 | 督促候補 | normalized-line:1520 |
| C12-031 | 請求機能 | 督促文面案 | normalized-line:1521 |
| C12-032 | 請求機能 | 請求監査ログ | normalized-line:1522 |
| C12-033 | AI請求補助 | 請求ドラフト作成 | normalized-line:1524 |
| C12-034 | AI請求補助 | 請求明細案作成 | normalized-line:1525 |
| C12-035 | AI請求補助 | 契約条件照合 | normalized-line:1526 |
| C12-036 | AI請求補助 | 成果報酬候補計算 | normalized-line:1527 |
| C12-037 | AI請求補助 | 媒体費集計 | normalized-line:1528 |
| C12-038 | AI請求補助 | 代理店手数料計算 | normalized-line:1529 |
| C12-039 | AI請求補助 | 税区分候補 | normalized-line:1530 |
| C12-040 | AI請求補助 | 異常値検知 | normalized-line:1531 |
| C12-041 | AI請求補助 | 請求漏れ検知 | normalized-line:1532 |
| C12-042 | AI請求補助 | 二重請求検知 | normalized-line:1533 |
| C12-043 | AI請求補助 | 金額差分表示 | normalized-line:1534 |
| C12-044 | AI請求補助 | 前月差分表示 | normalized-line:1535 |
| C12-045 | AI請求補助 | 顧客別請求履歴比較 | normalized-line:1536 |
| C12-046 | AI請求補助 | 認証依頼作成 | normalized-line:1537 |
| C12-047 | 以下はAIが勝手に実行してはいけません。 | 請求書正式確定 | normalized-line:1540 |
| C12-048 | 以下はAIが勝手に実行してはいけません。 | 請求書顧客送付 | normalized-line:1541 |
| C12-049 | 以下はAIが勝手に実行してはいけません。 | 請求金額変更 | normalized-line:1542 |
| C12-050 | 以下はAIが勝手に実行してはいけません。 | 修正請求 | normalized-line:1543 |
| C12-051 | 以下はAIが勝手に実行してはいけません。 | 督促送信 | normalized-line:1544 |
| C12-052 | 以下はAIが勝手に実行してはいけません。 | 返金処理 | normalized-line:1545 |
| C12-053 | 以下はAIが勝手に実行してはいけません。 | 相殺処理 | normalized-line:1546 |
| C12-054 | 以下はAIが勝手に実行してはいけません。 | 値引き処理 | normalized-line:1547 |
| C12-055 | 以下はAIが勝手に実行してはいけません。 | 税区分確定 | normalized-line:1548 |
| C12-056 | 以下はAIが勝手に実行してはいけません。 | 成果報酬確定 | normalized-line:1549 |

## C13 Payment / Reconciliation

入金・消込・支払

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C13-001 | 入金管理 | 入金予定 | normalized-line:1555 |
| C13-002 | 入金管理 | 入金実績 | normalized-line:1556 |
| C13-003 | 入金管理 | 銀行入金取込 | normalized-line:1557 |
| C13-004 | 入金管理 | Stripe入金 | normalized-line:1558 |
| C13-005 | 入金管理 | PayPal入金 | normalized-line:1559 |
| C13-006 | 入金管理 | クレカ入金 | normalized-line:1560 |
| C13-007 | 入金管理 | 口座振替 | normalized-line:1561 |
| C13-008 | 入金管理 | 振込入金 | normalized-line:1562 |
| C13-009 | 入金管理 | 入金候補マッチング | normalized-line:1563 |
| C13-010 | 入金管理 | 入金消込候補 | normalized-line:1564 |
| C13-011 | 入金管理 | 一部入金 | normalized-line:1565 |
| C13-012 | 入金管理 | 過入金 | normalized-line:1566 |
| C13-013 | 入金管理 | 未入金 | normalized-line:1567 |
| C13-014 | 入金管理 | 入金遅延 | normalized-line:1568 |
| C13-015 | 入金管理 | 入金差額 | normalized-line:1569 |
| C13-016 | 入金管理 | 手数料差引 | normalized-line:1570 |
| C13-017 | 入金管理 | 返金 | normalized-line:1571 |
| C13-018 | 入金管理 | 相殺 | normalized-line:1572 |
| C13-019 | 入金管理 | 入金ステータス | normalized-line:1573 |
| C13-020 | 入金管理 | 顧客別入金履歴 | normalized-line:1574 |
| C13-021 | 入金管理 | 請求別入金履歴 | normalized-line:1575 |
| C13-022 | 入金管理 | 売掛残高 | normalized-line:1576 |
| C13-023 | 入金管理 | 入金監査ログ | normalized-line:1577 |
| C13-024 | AI入金補助 | 入金候補マッチング | normalized-line:1579 |
| C13-025 | AI入金補助 | 名義ゆれ検知 | normalized-line:1580 |
| C13-026 | AI入金補助 | 金額差分検知 | normalized-line:1581 |
| C13-027 | AI入金補助 | 請求書候補提示 | normalized-line:1582 |
| C13-028 | AI入金補助 | 過入金候補 | normalized-line:1583 |
| C13-029 | AI入金補助 | 未入金候補 | normalized-line:1584 |
| C13-030 | AI入金補助 | 督促候補 | normalized-line:1585 |
| C13-031 | AI入金補助 | 支払期限超過検知 | normalized-line:1586 |
| C13-032 | AI入金補助 | 売掛残高異常検知 | normalized-line:1587 |
| C13-033 | AI入金補助 | 入金消込ドラフト | normalized-line:1588 |
| C13-034 | AI入金補助 | ただし消込確定は人間認証 | normalized-line:1589 |

## C14 Accounting / Finance

会計・仕訳・管理会計・資金繰り

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C14-001 | 会計機能 | 仕訳ドラフト | normalized-line:1594 |
| C14-002 | 会計機能 | 仕訳承認 | normalized-line:1595 |
| C14-003 | 会計機能 | 仕訳確定 | normalized-line:1596 |
| C14-004 | 会計機能 | 勘定科目 | normalized-line:1597 |
| C14-005 | 会計機能 | 補助科目 | normalized-line:1598 |
| C14-006 | 会計機能 | 税区分 | normalized-line:1599 |
| C14-007 | 会計機能 | 部門別会計 | normalized-line:1600 |
| C14-008 | 会計機能 | 店舗別会計 | normalized-line:1601 |
| C14-009 | 会計機能 | プロジェクト別会計 | normalized-line:1602 |
| C14-010 | 会計機能 | 顧客別会計 | normalized-line:1603 |
| C14-011 | 会計機能 | 商品別会計 | normalized-line:1604 |
| C14-012 | 会計機能 | 月次締め | normalized-line:1605 |
| C14-013 | 会計機能 | 年次締め | normalized-line:1606 |
| C14-014 | 会計機能 | 売上計上 | normalized-line:1607 |
| C14-015 | 会計機能 | 原価計上 | normalized-line:1608 |
| C14-016 | 会計機能 | 費用計上 | normalized-line:1609 |
| C14-017 | 会計機能 | 前受金 | normalized-line:1610 |
| C14-018 | 会計機能 | 売掛金 | normalized-line:1611 |
| C14-019 | 会計機能 | 買掛金 | normalized-line:1612 |
| C14-020 | 会計機能 | 未払金 | normalized-line:1613 |
| C14-021 | 会計機能 | 未収金 | normalized-line:1614 |
| C14-022 | 会計機能 | 資金繰り | normalized-line:1615 |
| C14-023 | 会計機能 | キャッシュフロー | normalized-line:1616 |
| C14-024 | 会計機能 | 予実管理 | normalized-line:1617 |
| C14-025 | 会計機能 | 部門別PL | normalized-line:1618 |
| C14-026 | 会計機能 | 店舗別PL | normalized-line:1619 |
| C14-027 | 会計機能 | 顧客別PL | normalized-line:1620 |
| C14-028 | 会計機能 | 商品別PL | normalized-line:1621 |
| C14-029 | 会計機能 | プロジェクト別PL | normalized-line:1622 |
| C14-030 | 会計機能 | 会計ソフト連携 | normalized-line:1623 |
| C14-031 | 会計機能 | freee連携 | normalized-line:1624 |
| C14-032 | 会計機能 | MoneyForward連携 | normalized-line:1625 |
| C14-033 | 会計機能 | 弥生連携 | normalized-line:1626 |
| C14-034 | 会計機能 | CSVエクスポート | normalized-line:1627 |
| C14-035 | 会計機能 | 監査証跡 | normalized-line:1628 |
| C14-036 | AI会計補助 | 仕訳ドラフト | normalized-line:1630 |
| C14-037 | AI会計補助 | 勘定科目候補 | normalized-line:1631 |
| C14-038 | AI会計補助 | 税区分候補 | normalized-line:1632 |
| C14-039 | AI会計補助 | 消費税候補 | normalized-line:1633 |
| C14-040 | AI会計補助 | 源泉徴収候補 | normalized-line:1634 |
| C14-041 | AI会計補助 | 会計異常値検知 | normalized-line:1635 |
| C14-042 | AI会計補助 | 月次差分分析 | normalized-line:1636 |
| C14-043 | AI会計補助 | 前年同月比較 | normalized-line:1637 |
| C14-044 | AI会計補助 | 部門別PL要約 | normalized-line:1638 |
| C14-045 | AI会計補助 | 資金繰り予測 | normalized-line:1639 |
| C14-046 | AI会計補助 | 未収・未払候補 | normalized-line:1640 |
| C14-047 | AI会計補助 | 計上漏れ検知 | normalized-line:1641 |
| C14-048 | AI会計補助 | 会計レビュー依頼 | normalized-line:1642 |
| C14-049 | AI会計補助 | ただし仕訳確定・税務判断断定は人間または専門家確認必須 | normalized-line:1643 |

## C15 ERP / Operations

受発注・在庫・購買・原価・業務管理

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C15-001 | 受注管理 | 受注作成 | normalized-line:1648 |
| C15-002 | 受注管理 | 受注明細 | normalized-line:1649 |
| C15-003 | 受注管理 | 受注ステータス | normalized-line:1650 |
| C15-004 | 受注管理 | 納期管理 | normalized-line:1651 |
| C15-005 | 受注管理 | 出荷予定 | normalized-line:1652 |
| C15-006 | 受注管理 | 出荷実績 | normalized-line:1653 |
| C15-007 | 受注管理 | 顧客別受注 | normalized-line:1654 |
| C15-008 | 受注管理 | 商品別受注 | normalized-line:1655 |
| C15-009 | 受注管理 | 店舗別受注 | normalized-line:1656 |
| C15-010 | 受注管理 | EC受注連携 | normalized-line:1657 |
| C15-011 | 受注管理 | POS受注連携 | normalized-line:1658 |
| C15-012 | 受注管理 | 見積から受注 | normalized-line:1659 |
| C15-013 | 受注管理 | 契約から受注 | normalized-line:1660 |
| C15-014 | 受注管理 | 受注から請求 | normalized-line:1661 |
| C15-015 | 受注管理 | 受注キャンセル | normalized-line:1662 |
| C15-016 | 受注管理 | 返品 | normalized-line:1663 |
| C15-017 | 受注管理 | 交換 | normalized-line:1664 |
| C15-018 | 発注管理 | 発注作成 | normalized-line:1666 |
| C15-019 | 発注管理 | 発注明細 | normalized-line:1667 |
| C15-020 | 発注管理 | 仕入先 | normalized-line:1668 |
| C15-021 | 発注管理 | 発注承認 | normalized-line:1669 |
| C15-022 | 発注管理 | 発注ステータス | normalized-line:1670 |
| C15-023 | 発注管理 | 納期管理 | normalized-line:1671 |
| C15-024 | 発注管理 | 入荷予定 | normalized-line:1672 |
| C15-025 | 発注管理 | 入荷実績 | normalized-line:1673 |
| C15-026 | 発注管理 | 発注点 | normalized-line:1674 |
| C15-027 | 発注管理 | 自動発注候補 | normalized-line:1675 |
| C15-028 | 発注管理 | 発注書PDF | normalized-line:1676 |
| C15-029 | 発注管理 | 発注履歴 | normalized-line:1677 |
| C15-030 | 発注管理 | 仕入価格 | normalized-line:1678 |
| C15-031 | 発注管理 | 発注原価 | normalized-line:1679 |
| C15-032 | 発注管理 | 仕入先評価 | normalized-line:1680 |
| C15-033 | 発注管理 | 発注異常検知 | normalized-line:1681 |
| C15-034 | 発注管理 | ただし発注確定は承認制 | normalized-line:1682 |
| C15-035 | 在庫管理 | 商品在庫 | normalized-line:1684 |
| C15-036 | 在庫管理 | 店舗在庫 | normalized-line:1685 |
| C15-037 | 在庫管理 | 倉庫在庫 | normalized-line:1686 |
| C15-038 | 在庫管理 | 入庫 | normalized-line:1687 |
| C15-039 | 在庫管理 | 出庫 | normalized-line:1688 |
| C15-040 | 在庫管理 | 移動 | normalized-line:1689 |
| C15-041 | 在庫管理 | 棚卸 | normalized-line:1690 |
| C15-042 | 在庫管理 | 欠品 | normalized-line:1691 |
| C15-043 | 在庫管理 | 過剰在庫 | normalized-line:1692 |
| C15-044 | 在庫管理 | 不良在庫 | normalized-line:1693 |
| C15-045 | 在庫管理 | ロット管理 | normalized-line:1694 |
| C15-046 | 在庫管理 | 賞味期限管理 | normalized-line:1695 |
| C15-047 | 在庫管理 | シリアル管理 | normalized-line:1696 |
| C15-048 | 在庫管理 | 在庫評価 | normalized-line:1697 |
| C15-049 | 在庫管理 | 在庫回転率 | normalized-line:1698 |
| C15-050 | 在庫管理 | 需要予測 | normalized-line:1699 |
| C15-051 | 在庫管理 | 安全在庫 | normalized-line:1700 |
| C15-052 | 在庫管理 | 発注点 | normalized-line:1701 |
| C15-053 | 在庫管理 | 在庫アラート | normalized-line:1702 |
| C15-054 | 在庫管理 | 在庫差異 | normalized-line:1703 |
| C15-055 | 在庫管理 | POS連携 | normalized-line:1704 |
| C15-056 | 在庫管理 | EC連携 | normalized-line:1705 |
| C15-057 | 在庫管理 | 会計連携 | normalized-line:1706 |

## C16 EC / POS / Reservation

EC、店舗、POS、予約、来店管理

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

## C17 Procurement / PLUG / Price Compare

購買最適化、最安値、アフィリエイト

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C17-001 | 価格比較 | EC横断価格比較 | normalized-line:1786 |
| C17-002 | 価格比較 | 最安値検索 | normalized-line:1787 |
| C17-003 | 価格比較 | 送料込み総額比較 | normalized-line:1788 |
| C17-004 | 価格比較 | ポイント還元込み比較 | normalized-line:1789 |
| C17-005 | 価格比較 | クーポン自動検出 | normalized-line:1790 |
| C17-006 | 価格比較 | クーポン適用候補 | normalized-line:1791 |
| C17-007 | 価格比較 | 代替商品提案 | normalized-line:1792 |
| C17-008 | 価格比較 | 類似商品提案 | normalized-line:1793 |
| C17-009 | 価格比較 | 価格履歴 | normalized-line:1794 |
| C17-010 | 価格比較 | 値下がり通知 | normalized-line:1795 |
| C17-011 | 価格比較 | 在庫通知 | normalized-line:1796 |
| C17-012 | 価格比較 | 購入先比較 | normalized-line:1797 |
| C17-013 | 価格比較 | 購入導線 | normalized-line:1798 |
| C17-014 | 価格比較 | ブラウザ上の価格表示 | normalized-line:1799 |
| C17-015 | 価格比較 | 商品ページ解析 | normalized-line:1800 |
| C17-016 | 価格比較 | ECサイト別価格 | normalized-line:1801 |
| C17-017 | 価格比較 | ECサイト別在庫 | normalized-line:1802 |
| C17-018 | 価格比較 | ECサイト別還元率 | normalized-line:1803 |
| C17-019 | アフィリエイト | アフィリエイトリンク生成 | normalized-line:1805 |
| C17-020 | アフィリエイト | クリック計測 | normalized-line:1806 |
| C17-021 | アフィリエイト | CV計測 | normalized-line:1807 |
| C17-022 | アフィリエイト | 成果計測 | normalized-line:1808 |
| C17-023 | アフィリエイト | 報酬候補 | normalized-line:1809 |
| C17-024 | アフィリエイト | ECサイト別成果 | normalized-line:1810 |
| C17-025 | アフィリエイト | 商品別成果 | normalized-line:1811 |
| C17-026 | アフィリエイト | 従業員別利用 | normalized-line:1812 |
| C17-027 | アフィリエイト | 企業別利用 | normalized-line:1813 |
| C17-028 | アフィリエイト | 部門別節約額 | normalized-line:1814 |
| C17-029 | アフィリエイト | PLUG経由売上 | normalized-line:1815 |
| C17-030 | アフィリエイト | PLUG経由報酬 | normalized-line:1816 |
| C17-031 | アフィリエイト | 成果承認 | normalized-line:1817 |
| C17-032 | アフィリエイト | 不正クリック検知 | normalized-line:1818 |
| C17-033 | アフィリエイト | 自己購入ルール | normalized-line:1819 |
| C17-034 | アフィリエイト | アフィリエイト開示 | normalized-line:1820 |
| C17-035 | アフィリエイト | ステマ防止 | normalized-line:1821 |
| C17-036 | アフィリエイト | 媒体規約管理 | normalized-line:1822 |
| C17-037 | 社内購買 | 備品購入 | normalized-line:1824 |
| C17-038 | 社内購買 | SaaS購入 | normalized-line:1825 |
| C17-039 | 社内購買 | 仕入購買 | normalized-line:1826 |
| C17-040 | 社内購買 | 購買申請 | normalized-line:1827 |
| C17-041 | 社内購買 | 購買承認 | normalized-line:1828 |
| C17-042 | 社内購買 | 予算チェック | normalized-line:1829 |
| C17-043 | 社内購買 | 最安値チェック | normalized-line:1830 |
| C17-044 | 社内購買 | 推奨購入先 | normalized-line:1831 |
| C17-045 | 社内購買 | ベンダー管理 | normalized-line:1832 |
| C17-046 | 社内購買 | 請求書連携 | normalized-line:1833 |
| C17-047 | 社内購買 | 経費精算連携 | normalized-line:1834 |
| C17-048 | 社内購買 | 会計連携 | normalized-line:1835 |
| C17-049 | 社内購買 | コスト削減レポート | normalized-line:1836 |
| C17-050 | 社内購買 | 部門別購買 | normalized-line:1837 |
| C17-051 | 社内購買 | 店舗別購買 | normalized-line:1838 |
| C17-052 | 社内購買 | 従業員向け購買補助 | normalized-line:1839 |

## C18 AD OS / Growth Engine

広告・SNS・LINE・SEO・PR・紹介・成果分析

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C18-001 | Growth基盤 | Growth Event Ledger | normalized-line:1845 |
| C18-002 | Growth基盤 | Business Event Ledger | normalized-line:1846 |
| C18-003 | Growth基盤 | MarketingEvent | normalized-line:1847 |
| C18-004 | Growth基盤 | ConversionEvent | normalized-line:1848 |
| C18-005 | Growth基盤 | RevenueEvent | normalized-line:1849 |
| C18-006 | Growth基盤 | CostEvent | normalized-line:1850 |
| C18-007 | Growth基盤 | ReferralEvent | normalized-line:1851 |
| C18-008 | Growth基盤 | SeoEvent | normalized-line:1852 |
| C18-009 | Growth基盤 | PrEvent | normalized-line:1853 |
| C18-010 | Growth基盤 | NetworkEvent | normalized-line:1854 |
| C18-011 | Growth基盤 | RecommendationEvent | normalized-line:1855 |
| C18-012 | Growth基盤 | ApprovalEvent | normalized-line:1856 |
| C18-013 | Growth基盤 | ExecutionEvent | normalized-line:1857 |
| C18-014 | Growth基盤 | ConsentEvent | normalized-line:1858 |
| C18-015 | Growth基盤 | AuditEvent | normalized-line:1859 |
| C18-016 | Growth基盤 | Attribution | normalized-line:1860 |
| C18-017 | Growth基盤 | IdentityMap | normalized-line:1861 |
| C18-018 | Growth基盤 | GEID | normalized-line:1862 |
| C18-019 | Growth基盤 | Segment | normalized-line:1863 |
| C18-020 | Growth基盤 | Campaign | normalized-line:1864 |
| C18-021 | Growth基盤 | Channel | normalized-line:1865 |
| C18-022 | Growth基盤 | Source | normalized-line:1866 |
| C18-023 | Growth基盤 | UTM | normalized-line:1867 |
| C18-024 | Growth基盤 | Cost | normalized-line:1868 |
| C18-025 | Growth基盤 | Conversion | normalized-line:1869 |
| C18-026 | Growth基盤 | Revenue Linkage | normalized-line:1870 |
| C18-027 | Growth基盤 | Gross Profit Linkage | normalized-line:1871 |
| C18-028 | Growth基盤 | LTV Linkage | normalized-line:1872 |
| C18-029 | Growth基盤 | AI Recommendation | normalized-line:1873 |
| C18-030 | Growth基盤 | AI Confidence Score | normalized-line:1874 |
| C18-031 | Growth基盤 | Data Sufficiency | normalized-line:1875 |
| C18-032 | Growth基盤 | Cold Start Playbook | normalized-line:1876 |
| C18-033 | Growth基盤 | Benchmark Library | normalized-line:1877 |
| C18-034 | Growth基盤 | Compliance Guard | normalized-line:1878 |
| C18-035 | Growth基盤 | Approval Inbox | normalized-line:1879 |
| C18-036 | Growth基盤 | Execution Queue | normalized-line:1880 |
| C18-037 | Growth基盤 | Recommendation Outcome | normalized-line:1881 |
| C18-038 | Growth基盤 | Provider Health Check | normalized-line:1882 |
| C18-039 | Growth基盤 | Fallback Mode | normalized-line:1883 |
| C18-040 | Growth分析 | CPA | normalized-line:1885 |
| C18-041 | Growth分析 | ROAS | normalized-line:1886 |
| C18-042 | Growth分析 | 粗利ROAS | normalized-line:1887 |
| C18-043 | Growth分析 | CAC | normalized-line:1888 |
| C18-044 | Growth分析 | LTV | normalized-line:1889 |
| C18-045 | Growth分析 | LTV / CAC | normalized-line:1890 |
| C18-046 | Growth分析 | CVR | normalized-line:1891 |
| C18-047 | Growth分析 | CTR | normalized-line:1892 |
| C18-048 | Growth分析 | CPC | normalized-line:1893 |
| C18-049 | Growth分析 | CPM | normalized-line:1894 |
| C18-050 | Growth分析 | 売上 | normalized-line:1895 |
| C18-051 | Growth分析 | 粗利 | normalized-line:1896 |
| C18-052 | Growth分析 | 契約数 | normalized-line:1897 |
| C18-053 | Growth分析 | 商談数 | normalized-line:1898 |
| C18-054 | Growth分析 | 問い合わせ数 | normalized-line:1899 |
| C18-055 | Growth分析 | 予約数 | normalized-line:1900 |
| C18-056 | Growth分析 | 購入数 | normalized-line:1901 |
| C18-057 | Growth分析 | LINE登録数 | normalized-line:1902 |
| C18-058 | Growth分析 | SNS反応 | normalized-line:1903 |
| C18-059 | Growth分析 | SEO流入 | normalized-line:1904 |
| C18-060 | Growth分析 | PR閲覧 | normalized-line:1905 |
| C18-061 | Growth分析 | 紹介クリック | normalized-line:1906 |
| C18-062 | Growth分析 | 媒体別成果 | normalized-line:1907 |
| C18-063 | Growth分析 | キャンペーン別成果 | normalized-line:1908 |
| C18-064 | Growth分析 | チャネル別成果 | normalized-line:1909 |
| C18-065 | Growth分析 | 顧客別成果 | normalized-line:1910 |
| C18-066 | Growth分析 | 商品別成果 | normalized-line:1911 |
| C18-067 | Growth分析 | 店舗別成果 | normalized-line:1912 |
| C18-068 | Growth分析 | 月別成果 | normalized-line:1913 |
| C18-069 | Growth分析 | 週別成果 | normalized-line:1914 |
| C18-070 | Growth分析 | 日別成果 | normalized-line:1915 |
| C18-071 | Growth分析 | 施策別成果 | normalized-line:1916 |

## C19 Ads Management

広告媒体・予算・成果・改善提案

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C19-001 | 媒体 | Meta Ads | normalized-line:1921 |
| C19-002 | 媒体 | Google Ads | normalized-line:1922 |
| C19-003 | 媒体 | Yahoo Ads | normalized-line:1923 |
| C19-004 | 媒体 | TikTok Ads | normalized-line:1924 |
| C19-005 | 媒体 | X Ads | normalized-line:1925 |
| C19-006 | 媒体 | YouTube Ads | normalized-line:1926 |
| C19-007 | 媒体 | LINE Ads | normalized-line:1927 |
| C19-008 | 媒体 | SmartNews Ads | normalized-line:1928 |
| C19-009 | 媒体 | DSP | normalized-line:1929 |
| C19-010 | 媒体 | アフィリエイト広告 | normalized-line:1930 |
| C19-011 | 媒体 | リスティング広告 | normalized-line:1931 |
| C19-012 | 媒体 | ディスプレイ広告 | normalized-line:1932 |
| C19-013 | 媒体 | 動画広告 | normalized-line:1933 |
| C19-014 | 媒体 | SNS広告 | normalized-line:1934 |
| C19-015 | 媒体 | リターゲティング広告 | normalized-line:1935 |
| C19-016 | 広告機能 | 広告アカウント管理 | normalized-line:1937 |
| C19-017 | 広告機能 | キャンペーン管理 | normalized-line:1938 |
| C19-018 | 広告機能 | 広告グループ管理 | normalized-line:1939 |
| C19-019 | 広告機能 | クリエイティブ管理 | normalized-line:1940 |
| C19-020 | 広告機能 | ターゲティング管理 | normalized-line:1941 |
| C19-021 | 広告機能 | 予算管理 | normalized-line:1942 |
| C19-022 | 広告機能 | 日予算 | normalized-line:1943 |
| C19-023 | 広告機能 | 月予算 | normalized-line:1944 |
| C19-024 | 広告機能 | 消化額 | normalized-line:1945 |
| C19-025 | 広告機能 | 残予算 | normalized-line:1946 |
| C19-026 | 広告機能 | 消化ペース | normalized-line:1947 |
| C19-027 | 広告機能 | 月末着地見込み | normalized-line:1948 |
| C19-028 | 広告機能 | 予算超過警告 | normalized-line:1949 |
| C19-029 | 広告機能 | 予算未消化警告 | normalized-line:1950 |
| C19-030 | 広告機能 | CPA悪化警告 | normalized-line:1951 |
| C19-031 | 広告機能 | CV急減警告 | normalized-line:1952 |
| C19-032 | 広告機能 | API障害警告 | normalized-line:1953 |
| C19-033 | 広告機能 | クリエイティブ疲労検知 | normalized-line:1954 |
| C19-034 | 広告機能 | LP改善候補 | normalized-line:1955 |
| C19-035 | 広告機能 | ターゲティング改善候補 | normalized-line:1956 |
| C19-036 | 広告機能 | 配信停止候補 | normalized-line:1957 |
| C19-037 | 広告機能 | 予算増額候補 | normalized-line:1958 |
| C19-038 | 広告機能 | 予算減額候補 | normalized-line:1959 |
| C19-039 | 広告機能 | 広告レポート | normalized-line:1960 |
| C19-040 | 広告機能 | クライアント共有レポート | normalized-line:1961 |
| C19-041 | AI広告 | 改善提案 | normalized-line:1963 |
| C19-042 | AI広告 | 予算配分提案 | normalized-line:1964 |
| C19-043 | AI広告 | 予算変更ドラフト | normalized-line:1965 |
| C19-044 | AI広告 | 停止候補提案 | normalized-line:1966 |
| C19-045 | AI広告 | クリエイティブ案 | normalized-line:1967 |
| C19-046 | AI広告 | 広告文案 | normalized-line:1968 |
| C19-047 | AI広告 | LP改善案 | normalized-line:1969 |
| C19-048 | AI広告 | ターゲティング案 | normalized-line:1970 |
| C19-049 | AI広告 | 媒体別勝ち負け分析 | normalized-line:1971 |
| C19-050 | AI広告 | 異常検知 | normalized-line:1972 |
| C19-051 | AI広告 | 自動実行前承認 | normalized-line:1973 |
| C19-052 | AI広告 | 高リスク二重承認 | normalized-line:1974 |
| C19-053 | AI広告 | 実行後効果測定 | normalized-line:1975 |

## C20 SNS / LINE / Email / DM

配信・投稿・反応・同意・成果管理

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C20-001 | SNS | Instagram投稿管理 | normalized-line:1980 |
| C20-002 | SNS | X投稿管理 | normalized-line:1981 |
| C20-003 | SNS | YouTube投稿管理 | normalized-line:1982 |
| C20-004 | SNS | TikTok投稿管理 | normalized-line:1983 |
| C20-005 | SNS | Facebook投稿管理 | normalized-line:1984 |
| C20-006 | SNS | LinkedIn投稿管理 | normalized-line:1985 |
| C20-007 | SNS | 投稿カレンダー | normalized-line:1986 |
| C20-008 | SNS | 投稿予約 | normalized-line:1987 |
| C20-009 | SNS | 投稿下書き | normalized-line:1988 |
| C20-010 | SNS | 投稿承認 | normalized-line:1989 |
| C20-011 | SNS | 投稿反応 | normalized-line:1990 |
| C20-012 | SNS | コメント管理 | normalized-line:1991 |
| C20-013 | SNS | DM管理 | normalized-line:1992 |
| C20-014 | SNS | リプライ管理 | normalized-line:1993 |
| C20-015 | SNS | 炎上リスク検知 | normalized-line:1994 |
| C20-016 | SNS | ブランド表現チェック | normalized-line:1995 |
| C20-017 | SNS | 投稿別CV | normalized-line:1996 |
| C20-018 | SNS | 投稿別売上 | normalized-line:1997 |
| C20-019 | SNS | 投稿別粗利 | normalized-line:1998 |
| C20-020 | SNS | 投稿別LTV | normalized-line:1999 |
| C20-021 | LINE | LINE登録管理 | normalized-line:2001 |
| C20-022 | LINE | LINEタグ | normalized-line:2002 |
| C20-023 | LINE | LINEステップ配信 | normalized-line:2003 |
| C20-024 | LINE | LINE配信下書き | normalized-line:2004 |
| C20-025 | LINE | LINEセグメント | normalized-line:2005 |
| C20-026 | LINE | LINEクリック | normalized-line:2006 |
| C20-027 | LINE | LINE診断 | normalized-line:2007 |
| C20-028 | LINE | LINE予約 | normalized-line:2008 |
| C20-029 | LINE | LINE購入 | normalized-line:2009 |
| C20-030 | LINE | LINE問い合わせ | normalized-line:2010 |
| C20-031 | LINE | LINE配信同意 | normalized-line:2011 |
| C20-032 | LINE | LINE配信停止 | normalized-line:2012 |
| C20-033 | LINE | LINE成果分析 | normalized-line:2013 |
| C20-034 | LINE | LINE経由売上 | normalized-line:2014 |
| C20-035 | LINE | LINE経由LTV | normalized-line:2015 |
| C20-036 | Email / DM | メール配信 | normalized-line:2017 |
| C20-037 | Email / DM | メールテンプレート | normalized-line:2018 |
| C20-038 | Email / DM | ステップメール | normalized-line:2019 |
| C20-039 | Email / DM | セグメントメール | normalized-line:2020 |
| C20-040 | Email / DM | 開封率 | normalized-line:2021 |
| C20-041 | Email / DM | クリック率 | normalized-line:2022 |
| C20-042 | Email / DM | CV | normalized-line:2023 |
| C20-043 | Email / DM | 配信停止 | normalized-line:2024 |
| C20-044 | Email / DM | DM下書き | normalized-line:2025 |
| C20-045 | Email / DM | DM承認 | normalized-line:2026 |
| C20-046 | Email / DM | DM送信履歴 | normalized-line:2027 |
| C20-047 | Email / DM | 大量DM制御 | normalized-line:2028 |
| C20-048 | Email / DM | スパムリスク判定 | normalized-line:2029 |
| C20-049 | Email / DM | 配信同意管理 | normalized-line:2030 |
| C20-050 | AI支援 | 投稿案生成 | normalized-line:2032 |
| C20-051 | AI支援 | 配信案生成 | normalized-line:2033 |
| C20-052 | AI支援 | 返信案生成 | normalized-line:2034 |
| C20-053 | AI支援 | 炎上リスク判定 | normalized-line:2035 |
| C20-054 | AI支援 | ステマ判定 | normalized-line:2036 |
| C20-055 | AI支援 | PR表記チェック | normalized-line:2037 |
| C20-056 | AI支援 | アフィリエイト表記チェック | normalized-line:2038 |
| C20-057 | AI支援 | 配信セグメント提案 | normalized-line:2039 |
| C20-058 | AI支援 | 配信時間提案 | normalized-line:2040 |
| C20-059 | AI支援 | 投稿成果分析 | normalized-line:2041 |
| C20-060 | AI支援 | ただし無承認外部配信は禁止 | normalized-line:2042 |

## C21 SEO / Content / PR

記事、LP、PR、導入事例、ブランド発信

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C21-001 | SEO | キーワード管理 | normalized-line:2047 |
| C21-002 | SEO | 検索順位 | normalized-line:2048 |
| C21-003 | SEO | SEO流入 | normalized-line:2049 |
| C21-004 | SEO | 記事管理 | normalized-line:2050 |
| C21-005 | SEO | 記事構成 | normalized-line:2051 |
| C21-006 | SEO | 記事下書き | normalized-line:2052 |
| C21-007 | SEO | 内部リンク | normalized-line:2053 |
| C21-008 | SEO | 外部リンク | normalized-line:2054 |
| C21-009 | SEO | メタ情報 | normalized-line:2055 |
| C21-010 | SEO | 構造化データ | normalized-line:2056 |
| C21-011 | SEO | LP管理 | normalized-line:2057 |
| C21-012 | SEO | LP別CV | normalized-line:2058 |
| C21-013 | SEO | LP別売上 | normalized-line:2059 |
| C21-014 | SEO | LP別粗利 | normalized-line:2060 |
| C21-015 | SEO | SEO記事別CV | normalized-line:2061 |
| C21-016 | SEO | SEO記事別商談 | normalized-line:2062 |
| C21-017 | SEO | SEO記事別契約 | normalized-line:2063 |
| C21-018 | SEO | SEO記事別売上 | normalized-line:2064 |
| C21-019 | SEO | SEO診断 | normalized-line:2065 |
| C21-020 | SEO | SEO改善提案 | normalized-line:2066 |
| C21-021 | SEO | SEOスパム防止 | normalized-line:2067 |
| C21-022 | Content | コンテンツカレンダー | normalized-line:2069 |
| C21-023 | Content | 記事テーマ | normalized-line:2070 |
| C21-024 | Content | ホワイトペーパー | normalized-line:2071 |
| C21-025 | Content | 導入事例 | normalized-line:2072 |
| C21-026 | Content | お客様の声 | normalized-line:2073 |
| C21-027 | Content | 事例掲載同意 | normalized-line:2074 |
| C21-028 | Content | 成果数値公開同意 | normalized-line:2075 |
| C21-029 | Content | ブログ | normalized-line:2076 |
| C21-030 | Content | メルマガ | normalized-line:2077 |
| C21-031 | Content | 採用広報記事 | normalized-line:2078 |
| C21-032 | Content | 社長ブランディング記事 | normalized-line:2079 |
| C21-033 | Content | SNS再利用 | normalized-line:2080 |
| C21-034 | Content | LP再利用 | normalized-line:2081 |
| C21-035 | Content | 動画台本 | normalized-line:2082 |
| C21-036 | Content | YouTube構成 | normalized-line:2083 |
| C21-037 | Content | セミナー資料 | normalized-line:2084 |
| C21-038 | Content | ウェビナー資料 | normalized-line:2085 |
| C21-039 | PR | PRネタ管理 | normalized-line:2087 |
| C21-040 | PR | プレスリリース下書き | normalized-line:2088 |
| C21-041 | PR | メディアリスト | normalized-line:2089 |
| C21-042 | PR | PR配信候補 | normalized-line:2090 |
| C21-043 | PR | 掲載実績 | normalized-line:2091 |
| C21-044 | PR | PR閲覧 | normalized-line:2092 |
| C21-045 | PR | PR経由問い合わせ | normalized-line:2093 |
| C21-046 | PR | PR経由商談 | normalized-line:2094 |
| C21-047 | PR | PR経由売上 | normalized-line:2095 |
| C21-048 | PR | PR表記 | normalized-line:2096 |
| C21-049 | PR | 広告表記 | normalized-line:2097 |
| C21-050 | PR | 顧客名掲載同意 | normalized-line:2098 |
| C21-051 | PR | 成果数値公開同意 | normalized-line:2099 |
| C21-052 | PR | No.1表記根拠 | normalized-line:2100 |
| C21-053 | PR | 業界初表記根拠 | normalized-line:2101 |
| C21-054 | PR | 医療・法律・金融・税務・労務表現チェック | normalized-line:2102 |

## C22 Referral / Affiliate / Creator

紹介、アフィリエイト、クリエイター、Business Network

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C22-001 | Referral | 紹介者管理 | normalized-line:2107 |
| C22-002 | Referral | 紹介コード | normalized-line:2108 |
| C22-003 | Referral | 紹介リンク | normalized-line:2109 |
| C22-004 | Referral | 紹介クリック | normalized-line:2110 |
| C22-005 | Referral | 紹介CV | normalized-line:2111 |
| C22-006 | Referral | 紹介商談 | normalized-line:2112 |
| C22-007 | Referral | 紹介契約 | normalized-line:2113 |
| C22-008 | Referral | 紹介売上 | normalized-line:2114 |
| C22-009 | Referral | 紹介粗利 | normalized-line:2115 |
| C22-010 | Referral | 紹介LTV | normalized-line:2116 |
| C22-011 | Referral | 紹介者別成果 | normalized-line:2117 |
| C22-012 | Referral | 紹介報酬候補 | normalized-line:2118 |
| C22-013 | Referral | 紹介承認 | normalized-line:2119 |
| C22-014 | Referral | 紹介不正検知 | normalized-line:2120 |
| C22-015 | Referral | 紹介者ポータル | normalized-line:2121 |
| C22-016 | Affiliate | アフィリエイトパートナー | normalized-line:2123 |
| C22-017 | Affiliate | アフィリエイトリンク | normalized-line:2124 |
| C22-018 | Affiliate | 成果計測 | normalized-line:2125 |
| C22-019 | Affiliate | 成果承認 | normalized-line:2126 |
| C22-020 | Affiliate | 報酬候補 | normalized-line:2127 |
| C22-021 | Affiliate | 報酬確定 | normalized-line:2128 |
| C22-022 | Affiliate | 報酬支払候補 | normalized-line:2129 |
| C22-023 | Affiliate | 報酬明細 | normalized-line:2130 |
| C22-024 | Affiliate | アフィリエイト開示 | normalized-line:2131 |
| C22-025 | Affiliate | 媒体規約 | normalized-line:2132 |
| C22-026 | Affiliate | 不正成果検知 | normalized-line:2133 |
| C22-027 | Affiliate | 自己アフィリエイト制御 | normalized-line:2134 |
| C22-028 | Creator | クリエイター管理 | normalized-line:2136 |
| C22-029 | Creator | クリエイター契約 | normalized-line:2137 |
| C22-030 | Creator | 投稿依頼 | normalized-line:2138 |
| C22-031 | Creator | 投稿承認 | normalized-line:2139 |
| C22-032 | Creator | 成果計測 | normalized-line:2140 |
| C22-033 | Creator | 投稿別CV | normalized-line:2141 |
| C22-034 | Creator | 投稿別売上 | normalized-line:2142 |
| C22-035 | Creator | 投稿別粗利 | normalized-line:2143 |
| C22-036 | Creator | クリエイター報酬 | normalized-line:2144 |
| C22-037 | Creator | クリエイターポータル | normalized-line:2145 |
| C22-038 | Creator | PR表記チェック | normalized-line:2146 |
| C22-039 | Creator | ステマ防止 | normalized-line:2147 |
| C22-040 | Creator | 顧客情報共有同意 | normalized-line:2148 |
| C22-041 | Business Network | 企業間紹介 | normalized-line:2150 |
| C22-042 | Business Network | パートナー企業 | normalized-line:2151 |
| C22-043 | Business Network | 相互送客 | normalized-line:2152 |
| C22-044 | Business Network | ビジネスマッチング | normalized-line:2153 |
| C22-045 | Business Network | 案件共有 | normalized-line:2154 |
| C22-046 | Business Network | リード共有 | normalized-line:2155 |
| C22-047 | Business Network | 共有同意 | normalized-line:2156 |
| C22-048 | Business Network | 紹介報酬 | normalized-line:2157 |
| C22-049 | Business Network | 共同提案 | normalized-line:2158 |
| C22-050 | Business Network | 共同商談 | normalized-line:2159 |
| C22-051 | Business Network | パートナー評価 | normalized-line:2160 |
| C22-052 | Business Network | ネットワーク成果 | normalized-line:2161 |
| C22-053 | Business Network | Business Network通知 | normalized-line:2162 |
| C22-054 | Business Network | 外部共有承認 | normalized-line:2163 |

## C23 HR / Recruiting

採用、応募者、面接、採用広報

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C23-001 | 採用管理 | 求人管理 | normalized-line:2168 |
| C23-002 | 採用管理 | 募集職種 | normalized-line:2169 |
| C23-003 | 採用管理 | 採用媒体 | normalized-line:2170 |
| C23-004 | 採用管理 | 採用LP | normalized-line:2171 |
| C23-005 | 採用管理 | 応募者管理 | normalized-line:2172 |
| C23-006 | 採用管理 | 候補者ステータス | normalized-line:2173 |
| C23-007 | 採用管理 | 履歴書 | normalized-line:2174 |
| C23-008 | 採用管理 | 職務経歴書 | normalized-line:2175 |
| C23-009 | 採用管理 | 書類選考 | normalized-line:2176 |
| C23-010 | 採用管理 | 面接日程 | normalized-line:2177 |
| C23-011 | 採用管理 | 面接評価 | normalized-line:2178 |
| C23-012 | 採用管理 | 面接メモ | normalized-line:2179 |
| C23-013 | 採用管理 | 評価シート | normalized-line:2180 |
| C23-014 | 採用管理 | 適性検査 | normalized-line:2181 |
| C23-015 | 採用管理 | 課題提出 | normalized-line:2182 |
| C23-016 | 採用管理 | 内定 | normalized-line:2183 |
| C23-017 | 採用管理 | オファー | normalized-line:2184 |
| C23-018 | 採用管理 | 入社日 | normalized-line:2185 |
| C23-019 | 採用管理 | 不採用理由 | normalized-line:2186 |
| C23-020 | 採用管理 | 採用チャネル | normalized-line:2187 |
| C23-021 | 採用管理 | 採用CPA | normalized-line:2188 |
| C23-022 | 採用管理 | 採用CVR | normalized-line:2189 |
| C23-023 | 採用管理 | 採用広報 | normalized-line:2190 |
| C23-024 | 採用管理 | リファラル採用 | normalized-line:2191 |
| C23-025 | 採用管理 | エージェント管理 | normalized-line:2192 |
| C23-026 | 採用管理 | 採用KPI | normalized-line:2193 |
| C23-027 | AI採用 | 求人票下書き | normalized-line:2195 |
| C23-028 | AI採用 | スカウト文面 | normalized-line:2196 |
| C23-029 | AI採用 | 面接質問案 | normalized-line:2197 |
| C23-030 | AI採用 | 面接評価要約 | normalized-line:2198 |
| C23-031 | AI採用 | 候補者要約 | normalized-line:2199 |
| C23-032 | AI採用 | 採用媒体分析 | normalized-line:2200 |
| C23-033 | AI採用 | 採用チャネル改善 | normalized-line:2201 |
| C23-034 | AI採用 | 内定承諾率改善 | normalized-line:2202 |
| C23-035 | AI採用 | 不採用理由分析 | normalized-line:2203 |
| C23-036 | AI採用 | ただし合否の完全自動決定は禁止 | normalized-line:2204 |
| C23-037 | AI採用 | 労務・差別リスクチェック | normalized-line:2205 |
| C23-038 | AI採用 | 採用文面コンプライアンスチェック | normalized-line:2206 |

## C24 Labor / People Ops

従業員、勤怠、評価、労務、権限変更

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C24-001 | 従業員管理 | Employee Master | normalized-line:2211 |
| C24-002 | 従業員管理 | 入社 | normalized-line:2212 |
| C24-003 | 従業員管理 | 退職 | normalized-line:2213 |
| C24-004 | 従業員管理 | 休職 | normalized-line:2214 |
| C24-005 | 従業員管理 | 復職 | normalized-line:2215 |
| C24-006 | 従業員管理 | 異動 | normalized-line:2216 |
| C24-007 | 従業員管理 | 部署 | normalized-line:2217 |
| C24-008 | 従業員管理 | 役職 | normalized-line:2218 |
| C24-009 | 従業員管理 | 等級 | normalized-line:2219 |
| C24-010 | 従業員管理 | 雇用形態 | normalized-line:2220 |
| C24-011 | 従業員管理 | 契約形態 | normalized-line:2221 |
| C24-012 | 従業員管理 | 組織図 | normalized-line:2222 |
| C24-013 | 従業員管理 | 権限連携 | normalized-line:2223 |
| C24-014 | 従業員管理 | SSO連携 | normalized-line:2224 |
| C24-015 | 従業員管理 | 退職時アクセス停止 | normalized-line:2225 |
| C24-016 | 従業員管理 | 貸与物管理 | normalized-line:2226 |
| C24-017 | 従業員管理 | 社内規程同意 | normalized-line:2227 |
| C24-018 | 従業員管理 | 労務書類 | normalized-line:2228 |
| C24-019 | 従業員管理 | 個人情報管理 | normalized-line:2229 |
| C24-020 | 勤怠・労務 | 出勤 | normalized-line:2231 |
| C24-021 | 勤怠・労務 | 退勤 | normalized-line:2232 |
| C24-022 | 勤怠・労務 | 休憩 | normalized-line:2233 |
| C24-023 | 勤怠・労務 | 残業 | normalized-line:2234 |
| C24-024 | 勤怠・労務 | 有給 | normalized-line:2235 |
| C24-025 | 勤怠・労務 | 欠勤 | normalized-line:2236 |
| C24-026 | 勤怠・労務 | シフト | normalized-line:2237 |
| C24-027 | 勤怠・労務 | 店舗シフト | normalized-line:2238 |
| C24-028 | 勤怠・労務 | 勤怠アラート | normalized-line:2239 |
| C24-029 | 勤怠・労務 | 残業アラート | normalized-line:2240 |
| C24-030 | 勤怠・労務 | 労務リスク | normalized-line:2241 |
| C24-031 | 勤怠・労務 | ハラスメント窓口 | normalized-line:2242 |
| C24-032 | 勤怠・労務 | 相談記録 | normalized-line:2243 |
| C24-033 | 勤怠・労務 | 労務対応履歴 | normalized-line:2244 |
| C24-034 | 勤怠・労務 | 社労士連携 | normalized-line:2245 |
| C24-035 | 勤怠・労務 | 給与連携 | normalized-line:2246 |
| C24-036 | 評価 | 目標管理 | normalized-line:2248 |
| C24-037 | 評価 | OKR | normalized-line:2249 |
| C24-038 | 評価 | MBO | normalized-line:2250 |
| C24-039 | 評価 | 1on1 | normalized-line:2251 |
| C24-040 | 評価 | 評価シート | normalized-line:2252 |
| C24-041 | 評価 | 自己評価 | normalized-line:2253 |
| C24-042 | 評価 | 上長評価 | normalized-line:2254 |
| C24-043 | 評価 | 360度評価 | normalized-line:2255 |
| C24-044 | 評価 | スキルマップ | normalized-line:2256 |
| C24-045 | 評価 | 昇格候補 | normalized-line:2257 |
| C24-046 | 評価 | 教育計画 | normalized-line:2258 |
| C24-047 | 評価 | 人材配置 | normalized-line:2259 |
| C24-048 | 評価 | 離職リスク | normalized-line:2260 |
| C24-049 | 評価 | エンゲージメント | normalized-line:2261 |

## C25 Education / Academy

社内教育、研修、369 Academy、認定

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C25-001 | 社内教育 | オンボーディング | normalized-line:2266 |
| C25-002 | 社内教育 | 研修カリキュラム | normalized-line:2267 |
| C25-003 | 社内教育 | 業務マニュアル | normalized-line:2268 |
| C25-004 | 社内教育 | 動画教材 | normalized-line:2269 |
| C25-005 | 社内教育 | 理解度テスト | normalized-line:2270 |
| C25-006 | 社内教育 | スキルチェック | normalized-line:2271 |
| C25-007 | 社内教育 | ロール別教育 | normalized-line:2272 |
| C25-008 | 社内教育 | 店舗別教育 | normalized-line:2273 |
| C25-009 | 社内教育 | 営業教育 | normalized-line:2274 |
| C25-010 | 社内教育 | 広告教育 | normalized-line:2275 |
| C25-011 | 社内教育 | 経理教育 | normalized-line:2276 |
| C25-012 | 社内教育 | コンプライアンス研修 | normalized-line:2277 |
| C25-013 | 社内教育 | 情報セキュリティ研修 | normalized-line:2278 |
| C25-014 | 社内教育 | AI利用研修 | normalized-line:2279 |
| C25-015 | 社内教育 | 受講履歴 | normalized-line:2280 |
| C25-016 | 社内教育 | 修了証 | normalized-line:2281 |
| C25-017 | 社内教育 | 教育レポート | normalized-line:2282 |
| C25-018 | 369 Academy | 管理者講座 | normalized-line:2284 |
| C25-019 | 369 Academy | 現場担当者講座 | normalized-line:2285 |
| C25-020 | 369 Academy | 経営者講座 | normalized-line:2286 |
| C25-021 | 369 Academy | AI社員管理者講座 | normalized-line:2287 |
| C25-022 | 369 Academy | AD OS運用講座 | normalized-line:2288 |
| C25-023 | 369 Academy | CRM運用講座 | normalized-line:2289 |
| C25-024 | 369 Academy | 経理・請求講座 | normalized-line:2290 |
| C25-025 | 369 Academy | 開発者講座 | normalized-line:2291 |
| C25-026 | 369 Academy | Plugin開発講座 | normalized-line:2292 |
| C25-027 | 369 Academy | AI社員開発講座 | normalized-line:2293 |
| C25-028 | 369 Academy | Marketplace出品講座 | normalized-line:2294 |
| C25-029 | 369 Academy | セキュリティ講座 | normalized-line:2295 |
| C25-030 | 369 Academy | コンプライアンス講座 | normalized-line:2296 |
| C25-031 | 369 Academy | 認定試験 | normalized-line:2297 |
| C25-032 | 369 Academy | 認定バッジ | normalized-line:2298 |
| C25-033 | 369 Academy | 認定開発者 | normalized-line:2299 |
| C25-034 | 369 Academy | 認定導入担当者 | normalized-line:2300 |
| C25-035 | 369 Academy | 認定AI社員 | normalized-line:2301 |
| C25-036 | 369 Academy | 公式教材 | normalized-line:2302 |
| C25-037 | 369 Academy | コミュニティ | normalized-line:2303 |
| C25-038 | 369 Academy | Q&A | normalized-line:2304 |
| C25-039 | 369 Academy | フォーラム | normalized-line:2305 |

## C26 Customer Support / CS

問い合わせ、チケット、FAQ、顧客ポータル

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C26-001 | CS機能 | 問い合わせ管理 | normalized-line:2310 |
| C26-002 | CS機能 | チケット管理 | normalized-line:2311 |
| C26-003 | CS機能 | チケットステータス | normalized-line:2312 |
| C26-004 | CS機能 | 優先度 | normalized-line:2313 |
| C26-005 | CS機能 | SLA | normalized-line:2314 |
| C26-006 | CS機能 | 担当者 | normalized-line:2315 |
| C26-007 | CS機能 | エスカレーション | normalized-line:2316 |
| C26-008 | CS機能 | コメント | normalized-line:2317 |
| C26-009 | CS機能 | 添付ファイル | normalized-line:2318 |
| C26-010 | CS機能 | 顧客履歴 | normalized-line:2319 |
| C26-011 | CS機能 | 契約履歴 | normalized-line:2320 |
| C26-012 | CS機能 | 請求履歴 | normalized-line:2321 |
| C26-013 | CS機能 | 不具合報告 | normalized-line:2322 |
| C26-014 | CS機能 | 返金相談 | normalized-line:2323 |
| C26-015 | CS機能 | 解約相談 | normalized-line:2324 |
| C26-016 | CS機能 | クレーム管理 | normalized-line:2325 |
| C26-017 | CS機能 | FAQ | normalized-line:2326 |
| C26-018 | CS機能 | ナレッジベース | normalized-line:2327 |
| C26-019 | CS機能 | チャット | normalized-line:2328 |
| C26-020 | CS機能 | メール | normalized-line:2329 |
| C26-021 | CS機能 | LINE | normalized-line:2330 |
| C26-022 | CS機能 | 電話メモ | normalized-line:2331 |
| C26-023 | CS機能 | NPS | normalized-line:2332 |
| C26-024 | CS機能 | CSAT | normalized-line:2333 |
| C26-025 | CS機能 | ヘルススコア | normalized-line:2334 |
| C26-026 | CS機能 | 解約予兆 | normalized-line:2335 |
| C26-027 | CS機能 | アップセル候補 | normalized-line:2336 |
| C26-028 | CS機能 | CSレポート | normalized-line:2337 |
| C26-029 | 顧客ポータル | 契約閲覧 | normalized-line:2339 |
| C26-030 | 顧客ポータル | 請求書閲覧 | normalized-line:2340 |
| C26-031 | 顧客ポータル | 支払い | normalized-line:2341 |
| C26-032 | 顧客ポータル | 領収書 | normalized-line:2342 |
| C26-033 | 顧客ポータル | 見積承認 | normalized-line:2343 |
| C26-034 | 顧客ポータル | 進捗確認 | normalized-line:2344 |
| C26-035 | 顧客ポータル | レポート閲覧 | normalized-line:2345 |
| C26-036 | 顧客ポータル | コメント | normalized-line:2346 |
| C26-037 | 顧客ポータル | ファイル共有 | normalized-line:2347 |
| C26-038 | 顧客ポータル | 問い合わせ | normalized-line:2348 |
| C26-039 | 顧客ポータル | チケット | normalized-line:2349 |
| C26-040 | 顧客ポータル | 予約変更 | normalized-line:2350 |
| C26-041 | 顧客ポータル | 同意管理 | normalized-line:2351 |
| C26-042 | 顧客ポータル | 導入事例許諾 | normalized-line:2352 |
| C26-043 | 顧客ポータル | 成果数値公開許諾 | normalized-line:2353 |
| C26-044 | AI CS | 問い合わせ要約 | normalized-line:2355 |
| C26-045 | AI CS | 返信案 | normalized-line:2356 |
| C26-046 | AI CS | FAQ候補 | normalized-line:2357 |
| C26-047 | AI CS | エスカレーション判定 | normalized-line:2358 |
| C26-048 | AI CS | クレームリスク検知 | normalized-line:2359 |
| C26-049 | AI CS | 解約リスク検知 | normalized-line:2360 |
| C26-050 | AI CS | 類似問い合わせ検索 | normalized-line:2361 |
| C26-051 | AI CS | 対応漏れ検知 | normalized-line:2362 |
| C26-052 | AI CS | SLA超過警告 | normalized-line:2363 |
| C26-053 | AI CS | CSレポート生成 | normalized-line:2364 |

## C27 Project / Task / Workflow

タスク、稟議、プロジェクト、業務自動化

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C27-001 | タスク管理 | タスク作成 | normalized-line:2369 |
| C27-002 | タスク管理 | 担当者 | normalized-line:2370 |
| C27-003 | タスク管理 | 期限 | normalized-line:2371 |
| C27-004 | タスク管理 | 優先度 | normalized-line:2372 |
| C27-005 | タスク管理 | ステータス | normalized-line:2373 |
| C27-006 | タスク管理 | コメント | normalized-line:2374 |
| C27-007 | タスク管理 | 添付 | normalized-line:2375 |
| C27-008 | タスク管理 | リマインド | normalized-line:2376 |
| C27-009 | タスク管理 | 繰り返しタスク | normalized-line:2377 |
| C27-010 | タスク管理 | 承認タスク | normalized-line:2378 |
| C27-011 | タスク管理 | AI生成タスク | normalized-line:2379 |
| C27-012 | タスク管理 | 顧客関連タスク | normalized-line:2380 |
| C27-013 | タスク管理 | 商談関連タスク | normalized-line:2381 |
| C27-014 | タスク管理 | 請求関連タスク | normalized-line:2382 |
| C27-015 | タスク管理 | 採用関連タスク | normalized-line:2383 |
| C27-016 | タスク管理 | プロジェクト関連タスク | normalized-line:2384 |
| C27-017 | プロジェクト | プロジェクト作成 | normalized-line:2386 |
| C27-018 | プロジェクト | プロジェクトステータス | normalized-line:2387 |
| C27-019 | プロジェクト | マイルストーン | normalized-line:2388 |
| C27-020 | プロジェクト | カンバン | normalized-line:2389 |
| C27-021 | プロジェクト | ガント | normalized-line:2390 |
| C27-022 | プロジェクト | 担当者 | normalized-line:2391 |
| C27-023 | プロジェクト | 予算 | normalized-line:2392 |
| C27-024 | プロジェクト | 工数 | normalized-line:2393 |
| C27-025 | プロジェクト | 原価 | normalized-line:2394 |
| C27-026 | プロジェクト | 粗利 | normalized-line:2395 |
| C27-027 | プロジェクト | 請求 | normalized-line:2396 |
| C27-028 | プロジェクト | 契約 | normalized-line:2397 |
| C27-029 | プロジェクト | ファイル | normalized-line:2398 |
| C27-030 | プロジェクト | 議事録 | normalized-line:2399 |
| C27-031 | プロジェクト | リスク | normalized-line:2400 |
| C27-032 | プロジェクト | 課題 | normalized-line:2401 |
| C27-033 | プロジェクト | 進捗レポート | normalized-line:2402 |
| C27-034 | Workflow | ワークフロー設計 | normalized-line:2404 |
| C27-035 | Workflow | 稟議 | normalized-line:2405 |
| C27-036 | Workflow | 承認 | normalized-line:2406 |
| C27-037 | Workflow | 条件分岐 | normalized-line:2407 |
| C27-038 | Workflow | 通知 | normalized-line:2408 |
| C27-039 | Workflow | Slack通知 | normalized-line:2409 |
| C27-040 | Workflow | メール通知 | normalized-line:2410 |
| C27-041 | Workflow | LINE通知 | normalized-line:2411 |
| C27-042 | Workflow | Webhook | normalized-line:2412 |
| C27-043 | Workflow | Queue | normalized-line:2413 |
| C27-044 | Workflow | Retry | normalized-line:2414 |
| C27-045 | Workflow | DLQ | normalized-line:2415 |
| C27-046 | Workflow | 実行ログ | normalized-line:2416 |
| C27-047 | Workflow | 失敗ログ | normalized-line:2417 |
| C27-048 | Workflow | 補償アクション | normalized-line:2418 |
| C27-049 | Workflow | AI提案から承認 | normalized-line:2419 |
| C27-050 | Workflow | 承認から実行 | normalized-line:2420 |
| C27-051 | Workflow | 実行から監査 | normalized-line:2421 |

## C28 BI / Dashboard / Reporting

経営・営業・広告・財務・AI社員ダッシュボード

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C28-001 | ダッシュボード | Executive Dashboard | normalized-line:2426 |
| C28-002 | ダッシュボード | Growth Dashboard | normalized-line:2427 |
| C28-003 | ダッシュボード | Sales Dashboard | normalized-line:2428 |
| C28-004 | ダッシュボード | CRM Dashboard | normalized-line:2429 |
| C28-005 | ダッシュボード | Finance Dashboard | normalized-line:2430 |
| C28-006 | ダッシュボード | Accounting Dashboard | normalized-line:2431 |
| C28-007 | ダッシュボード | Cashflow Dashboard | normalized-line:2432 |
| C28-008 | ダッシュボード | HR Dashboard | normalized-line:2433 |
| C28-009 | ダッシュボード | Recruiting Dashboard | normalized-line:2434 |
| C28-010 | ダッシュボード | Education Dashboard | normalized-line:2435 |
| C28-011 | ダッシュボード | CS Dashboard | normalized-line:2436 |
| C28-012 | ダッシュボード | EC Dashboard | normalized-line:2437 |
| C28-013 | ダッシュボード | POS Dashboard | normalized-line:2438 |
| C28-014 | ダッシュボード | Inventory Dashboard | normalized-line:2439 |
| C28-015 | ダッシュボード | Procurement Dashboard | normalized-line:2440 |
| C28-016 | ダッシュボード | PLUG Dashboard | normalized-line:2441 |
| C28-017 | ダッシュボード | AI Employee Dashboard | normalized-line:2442 |
| C28-018 | ダッシュボード | Developer Dashboard | normalized-line:2443 |
| C28-019 | ダッシュボード | Marketplace Dashboard | normalized-line:2444 |
| C28-020 | ダッシュボード | Trust Dashboard | normalized-line:2445 |
| C28-021 | ダッシュボード | Admin Dashboard | normalized-line:2446 |
| C28-022 | ダッシュボード | Client Shared Dashboard | normalized-line:2447 |
| C28-023 | レポート | 日次レポート | normalized-line:2449 |
| C28-024 | レポート | 週次レポート | normalized-line:2450 |
| C28-025 | レポート | 月次レポート | normalized-line:2451 |
| C28-026 | レポート | 経営会議レポート | normalized-line:2452 |
| C28-027 | レポート | 営業レポート | normalized-line:2453 |
| C28-028 | レポート | 広告レポート | normalized-line:2454 |
| C28-029 | レポート | 粗利レポート | normalized-line:2455 |
| C28-030 | レポート | LTVレポート | normalized-line:2456 |
| C28-031 | レポート | 採用レポート | normalized-line:2457 |
| C28-032 | レポート | CSレポート | normalized-line:2458 |
| C28-033 | レポート | 在庫レポート | normalized-line:2459 |
| C28-034 | レポート | 請求レポート | normalized-line:2460 |
| C28-035 | レポート | 入金レポート | normalized-line:2461 |
| C28-036 | レポート | AI社員レポート | normalized-line:2462 |
| C28-037 | レポート | 開発者レポート | normalized-line:2463 |
| C28-038 | レポート | 監査レポート | normalized-line:2464 |
| C28-039 | レポート | セキュリティレポート | normalized-line:2465 |
| C28-040 | レポート | コンプライアンスレポート | normalized-line:2466 |
| C28-041 | 出力 | PDF | normalized-line:2468 |
| C28-042 | 出力 | CSV | normalized-line:2469 |
| C28-043 | 出力 | Excel | normalized-line:2470 |
| C28-044 | 出力 | Google Sheets | normalized-line:2471 |
| C28-045 | 出力 | API | normalized-line:2472 |
| C28-046 | 出力 | Webhook | normalized-line:2473 |
| C28-047 | 出力 | Embedded Dashboard | normalized-line:2474 |
| C28-048 | 出力 | White-label Dashboard | normalized-line:2475 |
| C28-049 | 出力 | クライアント共有URL | normalized-line:2476 |
| C28-050 | 出力 | 閲覧制限付き共有 | normalized-line:2477 |
| C28-051 | 出力 | 粗利非表示共有 | normalized-line:2478 |
| C28-052 | 出力 | 個人情報マスク共有 | normalized-line:2479 |

## C29 Business Simulator / Digital Twin

売上・粗利・LTV・広告・採用・在庫シミュレーション

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C29-001 | シミュレーション対象 | 売上予測 | normalized-line:2484 |
| C29-002 | シミュレーション対象 | 粗利予測 | normalized-line:2485 |
| C29-003 | シミュレーション対象 | LTV予測 | normalized-line:2486 |
| C29-004 | シミュレーション対象 | 広告予算シミュレーション | normalized-line:2487 |
| C29-005 | シミュレーション対象 | CPA予測 | normalized-line:2488 |
| C29-006 | シミュレーション対象 | ROAS予測 | normalized-line:2489 |
| C29-007 | シミュレーション対象 | 採用予測 | normalized-line:2490 |
| C29-008 | シミュレーション対象 | 採用単価予測 | normalized-line:2491 |
| C29-009 | シミュレーション対象 | 在庫需要予測 | normalized-line:2492 |
| C29-010 | シミュレーション対象 | 発注量予測 | normalized-line:2493 |
| C29-011 | シミュレーション対象 | キャッシュフロー予測 | normalized-line:2494 |
| C29-012 | シミュレーション対象 | 値上げ影響 | normalized-line:2495 |
| C29-013 | シミュレーション対象 | 値引き影響 | normalized-line:2496 |
| C29-014 | シミュレーション対象 | 解約率影響 | normalized-line:2497 |
| C29-015 | シミュレーション対象 | 新商品投入 | normalized-line:2498 |
| C29-016 | シミュレーション対象 | 新店舗出店 | normalized-line:2499 |
| C29-017 | シミュレーション対象 | 新規広告媒体 | normalized-line:2500 |
| C29-018 | シミュレーション対象 | 新規採用チャネル | normalized-line:2501 |
| C29-019 | シミュレーション対象 | 人員増減 | normalized-line:2502 |
| C29-020 | シミュレーション対象 | SaaSコスト削減 | normalized-line:2503 |
| C29-021 | シミュレーション対象 | PLUG購買削減効果 | normalized-line:2504 |
| C29-022 | シミュレーション対象 | AI社員導入ROI | normalized-line:2505 |
| C29-023 | AI経営補佐 | What-if分析 | normalized-line:2507 |
| C29-024 | AI経営補佐 | Best Case | normalized-line:2508 |
| C29-025 | AI経営補佐 | Base Case | normalized-line:2509 |
| C29-026 | AI経営補佐 | Worst Case | normalized-line:2510 |
| C29-027 | AI経営補佐 | リスク要因 | normalized-line:2511 |
| C29-028 | AI経営補佐 | 前提条件 | normalized-line:2512 |
| C29-029 | AI経営補佐 | 信頼度 | normalized-line:2513 |
| C29-030 | AI経営補佐 | データ不足表示 | normalized-line:2514 |
| C29-031 | AI経営補佐 | 承認前影響予測 | normalized-line:2515 |
| C29-032 | AI経営補佐 | 施策比較 | normalized-line:2516 |
| C29-033 | AI経営補佐 | 経営会議用シナリオ | normalized-line:2517 |
| C29-034 | AI経営補佐 | 事業計画ドラフト | normalized-line:2518 |
| C29-035 | AI経営補佐 | 予算案ドラフト | normalized-line:2519 |
| C29-036 | AI経営補佐 | 中期計画ドラフト | normalized-line:2520 |

## C30 AI Employee Platform

AI社員そのものの運用基盤

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C30-001 | AI社員カテゴリ | AI CEO補佐 | normalized-line:2525 |
| C30-002 | AI社員カテゴリ | AI COO補佐 | normalized-line:2526 |
| C30-003 | AI社員カテゴリ | AI CFO補佐 | normalized-line:2527 |
| C30-004 | AI社員カテゴリ | AI CMO補佐 | normalized-line:2528 |
| C30-005 | AI社員カテゴリ | AI CTO補佐 | normalized-line:2529 |
| C30-006 | AI社員カテゴリ | AI営業 | normalized-line:2530 |
| C30-007 | AI社員カテゴリ | AI営業マネージャー | normalized-line:2531 |
| C30-008 | AI社員カテゴリ | AIインサイドセールス | normalized-line:2532 |
| C30-009 | AI社員カテゴリ | AIカスタマーサクセス | normalized-line:2533 |
| C30-010 | AI社員カテゴリ | AI問い合わせ対応 | normalized-line:2534 |
| C30-011 | AI社員カテゴリ | AI広告運用 | normalized-line:2535 |
| C30-012 | AI社員カテゴリ | AI SNS担当 | normalized-line:2536 |
| C30-013 | AI社員カテゴリ | AI SEO担当 | normalized-line:2537 |
| C30-014 | AI社員カテゴリ | AI PR担当 | normalized-line:2538 |
| C30-015 | AI社員カテゴリ | AIコンテンツ担当 | normalized-line:2539 |
| C30-016 | AI社員カテゴリ | AI採用担当 | normalized-line:2540 |
| C30-017 | AI社員カテゴリ | AI教育担当 | normalized-line:2541 |
| C30-018 | AI社員カテゴリ | AI人事担当 | normalized-line:2542 |
| C30-019 | AI社員カテゴリ | AI労務担当 | normalized-line:2543 |
| C30-020 | AI社員カテゴリ | AI経理担当 | normalized-line:2544 |
| C30-021 | AI社員カテゴリ | AI請求担当 | normalized-line:2545 |
| C30-022 | AI社員カテゴリ | AI入金確認担当 | normalized-line:2546 |
| C30-023 | AI社員カテゴリ | AI会計補助 | normalized-line:2547 |
| C30-024 | AI社員カテゴリ | AI法務チェック | normalized-line:2548 |
| C30-025 | AI社員カテゴリ | AI契約レビュー | normalized-line:2549 |
| C30-026 | AI社員カテゴリ | AIコンプライアンス | normalized-line:2550 |
| C30-027 | AI社員カテゴリ | AI監査 | normalized-line:2551 |
| C30-028 | AI社員カテゴリ | AIプロジェクトマネージャー | normalized-line:2552 |
| C30-029 | AI社員カテゴリ | AI開発PM | normalized-line:2553 |
| C30-030 | AI社員カテゴリ | AIデータアナリスト | normalized-line:2554 |
| C30-031 | AI社員カテゴリ | AI在庫管理 | normalized-line:2555 |
| C30-032 | AI社員カテゴリ | AI購買担当 | normalized-line:2556 |
| C30-033 | AI社員カテゴリ | AI予約管理 | normalized-line:2557 |
| C30-034 | AI社員カテゴリ | AI店舗運営 | normalized-line:2558 |
| C30-035 | AI社員カテゴリ | AI秘書 | normalized-line:2559 |
| C30-036 | AI社員カテゴリ | AI議事録 | normalized-line:2560 |
| C30-037 | AI社員カテゴリ | AIナレッジ管理 | normalized-line:2561 |
| C30-038 | AI社員の給与明細 | 稼働時間 | normalized-line:2563 |
| C30-039 | AI社員の給与明細 | 実行回数 | normalized-line:2564 |
| C30-040 | AI社員の給与明細 | 提案数 | normalized-line:2565 |
| C30-041 | AI社員の給与明細 | 承認依頼数 | normalized-line:2566 |
| C30-042 | AI社員の給与明細 | 承認率 | normalized-line:2567 |
| C30-043 | AI社員の給与明細 | 却下率 | normalized-line:2568 |
| C30-044 | AI社員の給与明細 | 差し戻し率 | normalized-line:2569 |
| C30-045 | AI社員の給与明細 | 成果金額 | normalized-line:2570 |
| C30-046 | AI社員の給与明細 | 削減工数 | normalized-line:2571 |
| C30-047 | AI社員の給与明細 | 削減コスト | normalized-line:2572 |
| C30-048 | AI社員の給与明細 | AI利用原価 | normalized-line:2573 |
| C30-049 | AI社員の給与明細 | API原価 | normalized-line:2574 |
| C30-050 | AI社員の給与明細 | トークン原価 | normalized-line:2575 |
| C30-051 | AI社員の給与明細 | ROI | normalized-line:2576 |
| C30-052 | AI社員の給与明細 | エラー数 | normalized-line:2577 |
| C30-053 | AI社員の給与明細 | 事故数 | normalized-line:2578 |
| C30-054 | AI社員の給与明細 | 補償アクション数 | normalized-line:2579 |
| C30-055 | AI社員の給与明細 | 人間換算工数 | normalized-line:2580 |
| C30-056 | AI社員の給与明細 | 今月の評価 | normalized-line:2581 |
| C30-057 | AI社員の給与明細 | 推奨改善 | normalized-line:2582 |

## C31 AI Employee Development Environment

AI社員・Pluginを誰でも作れる開発環境

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C31-001 | 開発機能 | AI社員テンプレート | normalized-line:2587 |
| C31-002 | 開発機能 | 職種別テンプレート | normalized-line:2588 |
| C31-003 | 開発機能 | 業種別テンプレート | normalized-line:2589 |
| C31-004 | 開発機能 | Prompt Template | normalized-line:2590 |
| C31-005 | 開発機能 | Tool Template | normalized-line:2591 |
| C31-006 | 開発機能 | Workflow Template | normalized-line:2592 |
| C31-007 | 開発機能 | Permission Template | normalized-line:2593 |
| C31-008 | 開発機能 | Approval Template | normalized-line:2594 |
| C31-009 | 開発機能 | UI Template | normalized-line:2595 |
| C31-010 | 開発機能 | Data Access Template | normalized-line:2596 |
| C31-011 | 開発機能 | Compliance Template | normalized-line:2597 |
| C31-012 | 開発機能 | Sandbox | normalized-line:2598 |
| C31-013 | 開発機能 | Test Environment | normalized-line:2599 |
| C31-014 | 開発機能 | Mock Tenant | normalized-line:2600 |
| C31-015 | 開発機能 | Mock Data | normalized-line:2601 |
| C31-016 | 開発機能 | Local Development | normalized-line:2602 |
| C31-017 | 開発機能 | Cloud Development | normalized-line:2603 |
| C31-018 | 開発機能 | Low-code Builder | normalized-line:2604 |
| C31-019 | 開発機能 | No-code Builder | normalized-line:2605 |
| C31-020 | 開発機能 | SDK | normalized-line:2606 |
| C31-021 | 開発機能 | CLI | normalized-line:2607 |
| C31-022 | 開発機能 | API | normalized-line:2608 |
| C31-023 | 開発機能 | Webhook | normalized-line:2609 |
| C31-024 | 開発機能 | MCP Server | normalized-line:2610 |
| C31-025 | 開発機能 | MCP Tool | normalized-line:2611 |
| C31-026 | 開発機能 | Tool Definition | normalized-line:2612 |
| C31-027 | 開発機能 | Skill Definition | normalized-line:2613 |
| C31-028 | 開発機能 | Agent Definition | normalized-line:2614 |
| C31-029 | 開発機能 | Manifest | normalized-line:2615 |
| C31-030 | 開発機能 | Permission Manifest | normalized-line:2616 |
| C31-031 | 開発機能 | Privacy Manifest | normalized-line:2617 |
| C31-032 | 開発機能 | Risk Manifest | normalized-line:2618 |
| C31-033 | 開発機能 | Versioning | normalized-line:2619 |
| C31-034 | 開発機能 | GitHub連携 | normalized-line:2620 |
| C31-035 | 開発機能 | CI Test | normalized-line:2621 |
| C31-036 | 開発機能 | Security Test | normalized-line:2622 |
| C31-037 | 開発機能 | Compliance Test | normalized-line:2623 |
| C31-038 | 開発機能 | Evaluation Test | normalized-line:2624 |
| C31-039 | 開発機能 | Marketplace Submission | normalized-line:2625 |
| C31-040 | 開発者向け課金 | 開発環境サブスク | normalized-line:2627 |
| C31-041 | 開発者向け課金 | AI実行従量課金 | normalized-line:2628 |
| C31-042 | 開発者向け課金 | テスト実行課金 | normalized-line:2629 |
| C31-043 | 開発者向け課金 | API利用課金 | normalized-line:2630 |
| C31-044 | 開発者向け課金 | Marketplace出品料 | normalized-line:2631 |
| C31-045 | 開発者向け課金 | 売上手数料 | normalized-line:2632 |
| C31-046 | 開発者向け課金 | 収益分配 | normalized-line:2633 |
| C31-047 | 開発者向け課金 | 開発者ダッシュボード | normalized-line:2634 |
| C31-048 | 開発者向け課金 | 売上レポート | normalized-line:2635 |
| C31-049 | 開発者向け課金 | 支払明細 | normalized-line:2636 |
| C31-050 | 開発者向け課金 | 税務書類 | normalized-line:2637 |
| C31-051 | 開発者向け課金 | 返金管理 | normalized-line:2638 |
| C31-052 | 開発者向け課金 | 不正利用管理 | normalized-line:2639 |

## C32 AI Employee Marketplace

AI社員ストア、審査、販売、収益分配

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C32-001 | ストア機能 | AI社員一覧 | normalized-line:2644 |
| C32-002 | ストア機能 | Plugin一覧 | normalized-line:2645 |
| C32-003 | ストア機能 | カテゴリ | normalized-line:2646 |
| C32-004 | ストア機能 | 業種別検索 | normalized-line:2647 |
| C32-005 | ストア機能 | 職種別検索 | normalized-line:2648 |
| C32-006 | ストア機能 | 人気ランキング | normalized-line:2649 |
| C32-007 | ストア機能 | 新着 | normalized-line:2650 |
| C32-008 | ストア機能 | 公式AI社員 | normalized-line:2651 |
| C32-009 | ストア機能 | 認定AI社員 | normalized-line:2652 |
| C32-010 | ストア機能 | サードパーティAI社員 | normalized-line:2653 |
| C32-011 | ストア機能 | 企業専用AI社員 | normalized-line:2654 |
| C32-012 | ストア機能 | Private App | normalized-line:2655 |
| C32-013 | ストア機能 | Internal App | normalized-line:2656 |
| C32-014 | ストア機能 | レビュー | normalized-line:2657 |
| C32-015 | ストア機能 | 評価 | normalized-line:2658 |
| C32-016 | ストア機能 | 導入実績 | normalized-line:2659 |
| C32-017 | ストア機能 | 価格 | normalized-line:2660 |
| C32-018 | ストア機能 | 無料トライアル | normalized-line:2661 |
| C32-019 | ストア機能 | デモ | normalized-line:2662 |
| C32-020 | ストア機能 | 権限表示 | normalized-line:2663 |
| C32-021 | ストア機能 | 読み取りデータ表示 | normalized-line:2664 |
| C32-022 | ストア機能 | 実行可能操作表示 | normalized-line:2665 |
| C32-023 | ストア機能 | 外部送信有無表示 | normalized-line:2666 |
| C32-024 | ストア機能 | 人間承認要否表示 | normalized-line:2667 |
| C32-025 | ストア機能 | リスクラベル | normalized-line:2668 |
| C32-026 | ストア機能 | セキュリティ審査済み | normalized-line:2669 |
| C32-027 | ストア機能 | コンプライアンス審査済み | normalized-line:2670 |
| C32-028 | ストア機能 | Enterprise承認済み | normalized-line:2671 |
| C32-029 | Marketplace Governance | 開発者審査 | normalized-line:2673 |
| C32-030 | Marketplace Governance | KYC | normalized-line:2674 |
| C32-031 | Marketplace Governance | App審査 | normalized-line:2675 |
| C32-032 | Marketplace Governance | セキュリティ審査 | normalized-line:2676 |
| C32-033 | Marketplace Governance | プライバシー審査 | normalized-line:2677 |
| C32-034 | Marketplace Governance | 権限審査 | normalized-line:2678 |
| C32-035 | Marketplace Governance | Tool Scope審査 | normalized-line:2679 |
| C32-036 | Marketplace Governance | Data Access審査 | normalized-line:2680 |
| C32-037 | Marketplace Governance | AI評価 | normalized-line:2681 |
| C32-038 | Marketplace Governance | Red Team | normalized-line:2682 |
| C32-039 | Marketplace Governance | Version Review | normalized-line:2683 |
| C32-040 | Marketplace Governance | Compatibility Check | normalized-line:2684 |
| C32-041 | Marketplace Governance | App Signing | normalized-line:2685 |
| C32-042 | Marketplace Governance | App Kill Switch | normalized-line:2686 |
| C32-043 | Marketplace Governance | App Rollback | normalized-line:2687 |
| C32-044 | Marketplace Governance | Abuse Report | normalized-line:2688 |
| C32-045 | Marketplace Governance | Incident Report | normalized-line:2689 |
| C32-046 | Marketplace Governance | 不正開発者停止 | normalized-line:2690 |
| C32-047 | Marketplace Governance | 低品質AI社員停止 | normalized-line:2691 |
| C32-048 | Marketplace Governance | 規約違反対応 | normalized-line:2692 |
| C32-049 | Marketplace Governance | 返金 | normalized-line:2693 |
| C32-050 | Marketplace Governance | 紛争管理 | normalized-line:2694 |

## C33 Developer Platform

API、Webhook、SDK、MCP、外部開発者

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C33-001 | API / SDK | Public API | normalized-line:2699 |
| C33-002 | API / SDK | Private API | normalized-line:2700 |
| C33-003 | API / SDK | Admin API | normalized-line:2701 |
| C33-004 | API / SDK | Tenant API | normalized-line:2702 |
| C33-005 | API / SDK | CRM API | normalized-line:2703 |
| C33-006 | API / SDK | Growth API | normalized-line:2704 |
| C33-007 | API / SDK | Invoice API | normalized-line:2705 |
| C33-008 | API / SDK | Accounting API | normalized-line:2706 |
| C33-009 | API / SDK | Marketplace API | normalized-line:2707 |
| C33-010 | API / SDK | AI Employee API | normalized-line:2708 |
| C33-011 | API / SDK | Webhook API | normalized-line:2709 |
| C33-012 | API / SDK | SDK TypeScript | normalized-line:2710 |
| C33-013 | API / SDK | SDK Python | normalized-line:2711 |
| C33-014 | API / SDK | SDK JavaScript | normalized-line:2712 |
| C33-015 | API / SDK | CLI | normalized-line:2713 |
| C33-016 | API / SDK | API Keys | normalized-line:2714 |
| C33-017 | API / SDK | OAuth App | normalized-line:2715 |
| C33-018 | API / SDK | Scope管理 | normalized-line:2716 |
| C33-019 | API / SDK | Rate Limit | normalized-line:2717 |
| C33-020 | API / SDK | Quota | normalized-line:2718 |
| C33-021 | API / SDK | Idempotency | normalized-line:2719 |
| C33-022 | API / SDK | Webhook Signing | normalized-line:2720 |
| C33-023 | API / SDK | API Logs | normalized-line:2721 |
| C33-024 | API / SDK | API Health | normalized-line:2722 |
| C33-025 | API / SDK | Developer Docs | normalized-line:2723 |
| C33-026 | API / SDK | API Explorer | normalized-line:2724 |
| C33-027 | API / SDK | Sandbox Tenant | normalized-line:2725 |
| C33-028 | MCP / Tool Platform | MCP Server | normalized-line:2727 |
| C33-029 | MCP / Tool Platform | MCP Client | normalized-line:2728 |
| C33-030 | MCP / Tool Platform | MCP Tool Registry | normalized-line:2729 |
| C33-031 | MCP / Tool Platform | MCP Permission Gateway | normalized-line:2730 |
| C33-032 | MCP / Tool Platform | MCP Audit Gateway | normalized-line:2731 |
| C33-033 | MCP / Tool Platform | MCP Rate Limit | normalized-line:2732 |
| C33-034 | MCP / Tool Platform | MCP Tenant Scope | normalized-line:2733 |
| C33-035 | MCP / Tool Platform | MCP Approval Gate | normalized-line:2734 |
| C33-036 | MCP / Tool Platform | MCP Tool Sandbox | normalized-line:2735 |
| C33-037 | MCP / Tool Platform | MCP Tool Versioning | normalized-line:2736 |
| C33-038 | MCP / Tool Platform | MCP Tool Health Check | normalized-line:2737 |

## C34 Integration Hub / Adapter

外部SaaS連携、CSV、Google Sheets、Webhook

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C34-001 | Adapter | IKEZAKI OS Adapter | normalized-line:2743 |
| C34-002 | Adapter | CSV Adapter | normalized-line:2744 |
| C34-003 | Adapter | Webhook Adapter | normalized-line:2745 |
| C34-004 | Adapter | Google Sheets Adapter | normalized-line:2746 |
| C34-005 | Adapter | Google Drive Adapter | normalized-line:2747 |
| C34-006 | Adapter | Gmail Adapter | normalized-line:2748 |
| C34-007 | Adapter | Google Calendar Adapter | normalized-line:2749 |
| C34-008 | Adapter | Slack Adapter | normalized-line:2750 |
| C34-009 | Adapter | Notion Adapter | normalized-line:2751 |
| C34-010 | Adapter | GitHub Adapter | normalized-line:2752 |
| C34-011 | Adapter | External CRM Adapter | normalized-line:2753 |
| C34-012 | Adapter | Salesforce Adapter | normalized-line:2754 |
| C34-013 | Adapter | HubSpot Adapter | normalized-line:2755 |
| C34-014 | Adapter | kintone Adapter | normalized-line:2756 |
| C34-015 | Adapter | Zoho Adapter | normalized-line:2757 |
| C34-016 | Adapter | POS Adapter | normalized-line:2758 |
| C34-017 | Adapter | Reservation Adapter | normalized-line:2759 |
| C34-018 | Adapter | EC Adapter | normalized-line:2760 |
| C34-019 | Adapter | Shopify Adapter | normalized-line:2761 |
| C34-020 | Adapter | BASE Adapter | normalized-line:2762 |
| C34-021 | Adapter | STORES Adapter | normalized-line:2763 |
| C34-022 | Adapter | Amazon Adapter | normalized-line:2764 |
| C34-023 | Adapter | Rakuten Adapter | normalized-line:2765 |
| C34-024 | Adapter | LINE Adapter | normalized-line:2766 |
| C34-025 | Adapter | Meta Ads Adapter | normalized-line:2767 |
| C34-026 | Adapter | Google Ads Adapter | normalized-line:2768 |
| C34-027 | Adapter | Yahoo Ads Adapter | normalized-line:2769 |
| C34-028 | Adapter | TikTok Ads Adapter | normalized-line:2770 |
| C34-029 | Adapter | X Adapter | normalized-line:2771 |
| C34-030 | Adapter | YouTube Adapter | normalized-line:2772 |
| C34-031 | Adapter | Instagram Adapter | normalized-line:2773 |
| C34-032 | Adapter | SEO Adapter | normalized-line:2774 |
| C34-033 | Adapter | PR Adapter | normalized-line:2775 |
| C34-034 | Adapter | Accounting Adapter | normalized-line:2776 |
| C34-035 | Adapter | freee Adapter | normalized-line:2777 |
| C34-036 | Adapter | MoneyForward Adapter | normalized-line:2778 |
| C34-037 | Adapter | Stripe Adapter | normalized-line:2779 |
| C34-038 | Adapter | Bank Adapter | normalized-line:2780 |
| C34-039 | Integration機能 | 接続設定 | normalized-line:2782 |
| C34-040 | Integration機能 | OAuth | normalized-line:2783 |
| C34-041 | Integration機能 | API Key | normalized-line:2784 |
| C34-042 | Integration機能 | Webhook | normalized-line:2785 |
| C34-043 | Integration機能 | CSV Import | normalized-line:2786 |
| C34-044 | Integration機能 | CSV Export | normalized-line:2787 |
| C34-045 | Integration機能 | Mapping | normalized-line:2788 |
| C34-046 | Integration機能 | Field Mapping | normalized-line:2789 |
| C34-047 | Integration機能 | Identity Mapping | normalized-line:2790 |
| C34-048 | Integration機能 | Sync | normalized-line:2791 |
| C34-049 | Integration機能 | Delta Sync | normalized-line:2792 |
| C34-050 | Integration機能 | Manual Sync | normalized-line:2793 |
| C34-051 | Integration機能 | Scheduled Sync | normalized-line:2794 |
| C34-052 | Integration機能 | Error Handling | normalized-line:2795 |
| C34-053 | Integration機能 | Retry | normalized-line:2796 |
| C34-054 | Integration機能 | DLQ | normalized-line:2797 |
| C34-055 | Integration機能 | Health Check | normalized-line:2798 |
| C34-056 | Integration機能 | Provider Status | normalized-line:2799 |
| C34-057 | Integration機能 | Rate Limit Handling | normalized-line:2800 |
| C34-058 | Integration機能 | Fallback Mode | normalized-line:2801 |
| C34-059 | Integration機能 | Contract Test | normalized-line:2802 |
| C34-060 | Integration機能 | Adapter Versioning | normalized-line:2803 |
| C34-061 | Integration機能 | Breaking Change Alert | normalized-line:2804 |
| C34-062 | Integration機能 | Sync Log | normalized-line:2805 |
| C34-063 | Integration機能 | Data Quality Alert | normalized-line:2806 |

## C35 Browser Extension / Desktop / Mobile

PLUG型拡張、スマホ、デスクトップ補助

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C35-001 | Browser Extension | PLUG型価格比較 | normalized-line:2811 |
| C35-002 | Browser Extension | ECページ解析 | normalized-line:2812 |
| C35-003 | Browser Extension | 最安値表示 | normalized-line:2813 |
| C35-004 | Browser Extension | クーポン表示 | normalized-line:2814 |
| C35-005 | Browser Extension | 購買承認 | normalized-line:2815 |
| C35-006 | Browser Extension | CRM補助 | normalized-line:2816 |
| C35-007 | Browser Extension | 顧客ページ補助 | normalized-line:2817 |
| C35-008 | Browser Extension | メール返信補助 | normalized-line:2818 |
| C35-009 | Browser Extension | SNS投稿補助 | normalized-line:2819 |
| C35-010 | Browser Extension | Webページ要約 | normalized-line:2820 |
| C35-011 | Browser Extension | Company Brain検索 | normalized-line:2821 |
| C35-012 | Browser Extension | AI社員呼び出し | normalized-line:2822 |
| C35-013 | Browser Extension | 承認依頼通知 | normalized-line:2823 |
| C35-014 | Browser Extension | 請求書OCR | normalized-line:2824 |
| C35-015 | Browser Extension | 領収書OCR | normalized-line:2825 |
| C35-016 | Browser Extension | 名刺OCR | normalized-line:2826 |
| C35-017 | Browser Extension | Webクリップ | normalized-line:2827 |
| C35-018 | Browser Extension | SaaS利用検知 | normalized-line:2828 |
| C35-019 | Browser Extension | シャドーIT検知 | normalized-line:2829 |
| C35-020 | Browser Extension | アフィリエイトリンク変換 | normalized-line:2830 |
| C35-021 | Browser Extension | 従業員向け購買補助 | normalized-line:2831 |
| C35-022 | Desktop App | 常駐AI社員 | normalized-line:2833 |
| C35-023 | Desktop App | 通知センター | normalized-line:2834 |
| C35-024 | Desktop App | ファイル解析 | normalized-line:2835 |
| C35-025 | Desktop App | 画面共有補助 | normalized-line:2836 |
| C35-026 | Desktop App | 会議録音 | normalized-line:2837 |
| C35-027 | Desktop App | 議事録作成 | normalized-line:2838 |
| C35-028 | Desktop App | ローカルファイル検索 | normalized-line:2839 |
| C35-029 | Desktop App | セキュアアップロード | normalized-line:2840 |
| C35-030 | Desktop App | 承認通知 | normalized-line:2841 |
| C35-031 | Desktop App | タスク通知 | normalized-line:2842 |
| C35-032 | Mobile App | 経営ダッシュボード | normalized-line:2844 |
| C35-033 | Mobile App | 承認 | normalized-line:2845 |
| C35-034 | Mobile App | タスク | normalized-line:2846 |
| C35-035 | Mobile App | 顧客確認 | normalized-line:2847 |
| C35-036 | Mobile App | 商談メモ | normalized-line:2848 |
| C35-037 | Mobile App | 音声メモ | normalized-line:2849 |
| C35-038 | Mobile App | 名刺スキャン | normalized-line:2850 |
| C35-039 | Mobile App | 領収書スキャン | normalized-line:2851 |
| C35-040 | Mobile App | 店舗チェック | normalized-line:2852 |
| C35-041 | Mobile App | 在庫確認 | normalized-line:2853 |
| C35-042 | Mobile App | 予約確認 | normalized-line:2854 |
| C35-043 | Mobile App | チャット | normalized-line:2855 |
| C35-044 | Mobile App | AI社員呼び出し | normalized-line:2856 |
| C35-045 | Mobile App | プッシュ通知 | normalized-line:2857 |

## C36 Billing / Metering / FinOps

従量課金、AI原価、開発者報酬、ユニットエコノミクス

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C36-001 | 課金対象 | テナント月額 | normalized-line:2862 |
| C36-002 | 課金対象 | ユーザー数 | normalized-line:2863 |
| C36-003 | 課金対象 | AI社員数 | normalized-line:2864 |
| C36-004 | 課金対象 | AI社員稼働時間 | normalized-line:2865 |
| C36-005 | 課金対象 | AI社員実行回数 | normalized-line:2866 |
| C36-006 | 課金対象 | AI提案数 | normalized-line:2867 |
| C36-007 | 課金対象 | AI承認依頼数 | normalized-line:2868 |
| C36-008 | 課金対象 | API Call | normalized-line:2869 |
| C36-009 | 課金対象 | Tool Call | normalized-line:2870 |
| C36-010 | 課金対象 | Token使用量 | normalized-line:2871 |
| C36-011 | 課金対象 | Storage | normalized-line:2872 |
| C36-012 | 課金対象 | Vector Storage | normalized-line:2873 |
| C36-013 | 課金対象 | File Processing | normalized-line:2874 |
| C36-014 | 課金対象 | OCR | normalized-line:2875 |
| C36-015 | 課金対象 | Webhook | normalized-line:2876 |
| C36-016 | 課金対象 | Integration数 | normalized-line:2877 |
| C36-017 | 課金対象 | Marketplace購入 | normalized-line:2878 |
| C36-018 | 課金対象 | Plugin利用 | normalized-line:2879 |
| C36-019 | 課金対象 | PLUG成果 | normalized-line:2880 |
| C36-020 | 課金対象 | Affiliate成果 | normalized-line:2881 |
| C36-021 | 課金対象 | Referral成果 | normalized-line:2882 |
| C36-022 | 課金対象 | Developer Platform利用 | normalized-line:2883 |
| C36-023 | 課金対象 | White-label利用 | normalized-line:2884 |
| C36-024 | 課金対象 | SSO利用 | normalized-line:2885 |
| C36-025 | 課金対象 | Enterprise管理機能 | normalized-line:2886 |
| C36-026 | 課金対象 | Audit Log保持 | normalized-line:2887 |
| C36-027 | 課金対象 | Data Export | normalized-line:2888 |
| C36-028 | FinOps | AI原価管理 | normalized-line:2890 |
| C36-029 | FinOps | モデル別原価 | normalized-line:2891 |
| C36-030 | FinOps | AI社員別原価 | normalized-line:2892 |
| C36-031 | FinOps | テナント別原価 | normalized-line:2893 |
| C36-032 | FinOps | 部門別原価 | normalized-line:2894 |
| C36-033 | FinOps | クライアント別原価 | normalized-line:2895 |
| C36-034 | FinOps | プロジェクト別原価 | normalized-line:2896 |
| C36-035 | FinOps | 利用量予測 | normalized-line:2897 |
| C36-036 | FinOps | 請求予測 | normalized-line:2898 |
| C36-037 | FinOps | 予算上限 | normalized-line:2899 |
| C36-038 | FinOps | Soft Cap | normalized-line:2900 |
| C36-039 | FinOps | Hard Cap | normalized-line:2901 |
| C36-040 | FinOps | Cost Alert | normalized-line:2902 |
| C36-041 | FinOps | 異常利用検知 | normalized-line:2903 |
| C36-042 | FinOps | ROI表示 | normalized-line:2904 |
| C36-043 | FinOps | 粗利表示 | normalized-line:2905 |
| C36-044 | FinOps | Unit Economics | normalized-line:2906 |
| C36-045 | FinOps | LTV / CAC | normalized-line:2907 |
| C36-046 | FinOps | Marketplace GMV | normalized-line:2908 |
| C36-047 | FinOps | Take Rate | normalized-line:2909 |
| C36-048 | FinOps | Developer Payout | normalized-line:2910 |
| C36-049 | FinOps | Affiliate Payout | normalized-line:2911 |
| C36-050 | FinOps | Referral Payout | normalized-line:2912 |

## C37 Trust Center / Compliance Center

セキュリティ、AI安全性、個人情報、契約資料

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C37-001 | Trust Center | Security Overview | normalized-line:2917 |
| C37-002 | Trust Center | Privacy Overview | normalized-line:2918 |
| C37-003 | Trust Center | AI Safety Overview | normalized-line:2919 |
| C37-004 | Trust Center | Data Processing Agreement | normalized-line:2920 |
| C37-005 | Trust Center | Subprocessor List | normalized-line:2921 |
| C37-006 | Trust Center | Data Residency | normalized-line:2922 |
| C37-007 | Trust Center | Data Retention | normalized-line:2923 |
| C37-008 | Trust Center | Data Export Policy | normalized-line:2924 |
| C37-009 | Trust Center | Deletion Policy | normalized-line:2925 |
| C37-010 | Trust Center | Incident Response Policy | normalized-line:2926 |
| C37-011 | Trust Center | Vulnerability Disclosure | normalized-line:2927 |
| C37-012 | Trust Center | Uptime Status | normalized-line:2928 |
| C37-013 | Trust Center | SLA | normalized-line:2929 |
| C37-014 | Trust Center | Backup Policy | normalized-line:2930 |
| C37-015 | Trust Center | RTO / RPO | normalized-line:2931 |
| C37-016 | Trust Center | AI Usage Policy | normalized-line:2932 |
| C37-017 | Trust Center | External AI Send Policy | normalized-line:2933 |
| C37-018 | Trust Center | Human Approval Policy | normalized-line:2934 |
| C37-019 | Trust Center | Audit Log Policy | normalized-line:2935 |
| C37-020 | Trust Center | Marketplace Review Policy | normalized-line:2936 |
| C37-021 | Trust Center | Developer Policy | normalized-line:2937 |
| C37-022 | Trust Center | App Review Guideline | normalized-line:2938 |
| C37-023 | Trust Center | Compliance Evidence Export | normalized-line:2939 |
| C37-024 | Trust Center | セキュリティチェックシート回答 | normalized-line:2940 |
| C37-025 | Trust Center | Enterprise Questionnaire回答 | normalized-line:2941 |
| C37-026 | Trust Center | ISMS準備 | normalized-line:2942 |
| C37-027 | Trust Center | SOC2準備 | normalized-line:2943 |
| C37-028 | Trust Center | ISO27001準備 | normalized-line:2944 |
| C37-029 | Trust Center | ISO/IEC 42001準備 | normalized-line:2945 |
| C37-030 | Trust Center | AI Impact Assessment | normalized-line:2946 |
| C37-031 | Trust Center | DPIA | normalized-line:2947 |
| C37-032 | Trust Center | Risk Register | normalized-line:2948 |
| C37-033 | Compliance Center | ステマ防止 | normalized-line:2950 |
| C37-034 | Compliance Center | PR表記 | normalized-line:2951 |
| C37-035 | Compliance Center | 広告表記 | normalized-line:2952 |
| C37-036 | Compliance Center | アフィリエイト開示 | normalized-line:2953 |
| C37-037 | Compliance Center | 景表法リスク | normalized-line:2954 |
| C37-038 | Compliance Center | 薬機法リスク | normalized-line:2955 |
| C37-039 | Compliance Center | 医療広告リスク | normalized-line:2956 |
| C37-040 | Compliance Center | 金融表現リスク | normalized-line:2957 |
| C37-041 | Compliance Center | 法律表現リスク | normalized-line:2958 |
| C37-042 | Compliance Center | 税務表現リスク | normalized-line:2959 |
| C37-043 | Compliance Center | 労務表現リスク | normalized-line:2960 |
| C37-044 | Compliance Center | 採用差別リスク | normalized-line:2961 |
| C37-045 | Compliance Center | 個人情報保護 | normalized-line:2962 |
| C37-046 | Compliance Center | 第三者提供 | normalized-line:2963 |
| C37-047 | Compliance Center | 越境移転 | normalized-line:2964 |
| C37-048 | Compliance Center | Cookie | normalized-line:2965 |
| C37-049 | Compliance Center | リターゲティング | normalized-line:2966 |
| C37-050 | Compliance Center | 顧客名公開 | normalized-line:2967 |
| C37-051 | Compliance Center | 成果数値公開 | normalized-line:2968 |
| C37-052 | Compliance Center | No.1表記根拠 | normalized-line:2969 |
| C37-053 | Compliance Center | 業界初表記根拠 | normalized-line:2970 |
| C37-054 | Compliance Center | 媒体規約 | normalized-line:2971 |
| C37-055 | Compliance Center | SEOスパム | normalized-line:2972 |
| C37-056 | Compliance Center | 虚偽口コミ禁止 | normalized-line:2973 |
| C37-057 | Compliance Center | なりすましレビュー禁止 | normalized-line:2974 |

## C38 Consent / Privacy / Data Protection

同意、配信停止、第三者提供、個人情報制御

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C38-001 | 同意種別 | 個人情報利用同意 | normalized-line:2980 |
| C38-002 | 同意種別 | メール配信同意 | normalized-line:2981 |
| C38-003 | 同意種別 | LINE配信同意 | normalized-line:2982 |
| C38-004 | 同意種別 | SMS配信同意 | normalized-line:2983 |
| C38-005 | 同意種別 | DM送信同意 | normalized-line:2984 |
| C38-006 | 同意種別 | Cookie同意 | normalized-line:2985 |
| C38-007 | 同意種別 | リターゲティング同意 | normalized-line:2986 |
| C38-008 | 同意種別 | 診断フォーム同意 | normalized-line:2987 |
| C38-009 | 同意種別 | 外部ツール連携同意 | normalized-line:2988 |
| C38-010 | 同意種別 | 外部AI送信同意 | normalized-line:2989 |
| C38-011 | 同意種別 | 第三者提供同意 | normalized-line:2990 |
| C38-012 | 同意種別 | 越境移転同意 | normalized-line:2991 |
| C38-013 | 同意種別 | 紹介者共有同意 | normalized-line:2992 |
| C38-014 | 同意種別 | Creator共有同意 | normalized-line:2993 |
| C38-015 | 同意種別 | Business Network共有同意 | normalized-line:2994 |
| C38-016 | 同意種別 | 導入事例掲載同意 | normalized-line:2995 |
| C38-017 | 同意種別 | 顧客名掲載同意 | normalized-line:2996 |
| C38-018 | 同意種別 | 成果数値公開同意 | normalized-line:2997 |
| C38-019 | 同意種別 | PR掲載同意 | normalized-line:2998 |
| C38-020 | 同意種別 | 採用候補者情報利用同意 | normalized-line:2999 |
| C38-021 | Privacy機能 | Consent Record | normalized-line:3001 |
| C38-022 | Privacy機能 | Consent Version | normalized-line:3002 |
| C38-023 | Privacy機能 | Consent Text | normalized-line:3003 |
| C38-024 | Privacy機能 | Consent Snapshot | normalized-line:3004 |
| C38-025 | Privacy機能 | 同意取得 | normalized-line:3005 |
| C38-026 | Privacy機能 | 同意撤回 | normalized-line:3006 |
| C38-027 | Privacy機能 | オプトアウト | normalized-line:3007 |
| C38-028 | Privacy機能 | 配信停止 | normalized-line:3008 |
| C38-029 | Privacy機能 | 第三者提供停止 | normalized-line:3009 |
| C38-030 | Privacy機能 | 削除要求 | normalized-line:3010 |
| C38-031 | Privacy機能 | 匿名化要求 | normalized-line:3011 |
| C38-032 | Privacy機能 | データエクスポート要求 | normalized-line:3012 |
| C38-033 | Privacy機能 | AI外部送信ブロック | normalized-line:3013 |
| C38-034 | Privacy機能 | 同意なしリターゲティング除外 | normalized-line:3014 |
| C38-035 | Privacy機能 | 同意なし導入事例掲載禁止 | normalized-line:3015 |
| C38-036 | Privacy機能 | 同意なし成果数値公開禁止 | normalized-line:3016 |
| C38-037 | Privacy機能 | 同意なしCreator共有禁止 | normalized-line:3017 |
| C38-038 | Privacy機能 | 同意なしBusiness Network共有禁止 | normalized-line:3018 |
| C38-039 | Privacy機能 | 実行前Consent Gate | normalized-line:3019 |
| C38-040 | Privacy機能 | 撤回後の将来利用停止 | normalized-line:3020 |
| C38-041 | Privacy機能 | 監査ログ保持 | normalized-line:3021 |

## C39 Security / Zero Trust

テナント分離、RLS、暗号化、Secrets、MFA

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

## C40 Observability / SRE / Incident

障害監視、ログ、トレース、Status、SLA

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C40-001 | Observability | Metrics | normalized-line:3076 |
| C40-002 | Observability | Logs | normalized-line:3077 |
| C40-003 | Observability | Traces | normalized-line:3078 |
| C40-004 | Observability | Distributed Trace | normalized-line:3079 |
| C40-005 | Observability | API Health | normalized-line:3080 |
| C40-006 | Observability | Adapter Health | normalized-line:3081 |
| C40-007 | Observability | Queue Health | normalized-line:3082 |
| C40-008 | Observability | Worker Health | normalized-line:3083 |
| C40-009 | Observability | AI Provider Health | normalized-line:3084 |
| C40-010 | Observability | Model Latency | normalized-line:3085 |
| C40-011 | Observability | Model Error Rate | normalized-line:3086 |
| C40-012 | Observability | Tool Execution Trace | normalized-line:3087 |
| C40-013 | Observability | Agent Execution Trace | normalized-line:3088 |
| C40-014 | Observability | Webhook Health | normalized-line:3089 |
| C40-015 | Observability | DB Health | normalized-line:3090 |
| C40-016 | Observability | Storage Health | normalized-line:3091 |
| C40-017 | Observability | Search Health | normalized-line:3092 |
| C40-018 | Observability | Vector DB Health | normalized-line:3093 |
| C40-019 | Observability | Rate Limit Monitor | normalized-line:3094 |
| C40-020 | Observability | Error Rate | normalized-line:3095 |
| C40-021 | Observability | SLA Monitor | normalized-line:3096 |
| C40-022 | Observability | Uptime Monitor | normalized-line:3097 |
| C40-023 | Observability | Cost Monitor | normalized-line:3098 |
| C40-024 | Observability | Usage Monitor | normalized-line:3099 |
| C40-025 | Incident | Status Page | normalized-line:3101 |
| C40-026 | Incident | Incident Timeline | normalized-line:3102 |
| C40-027 | Incident | Alert | normalized-line:3103 |
| C40-028 | Incident | On-call | normalized-line:3104 |
| C40-029 | Incident | Runbook | normalized-line:3105 |
| C40-030 | Incident | Incident Severity | normalized-line:3106 |
| C40-031 | Incident | Root Cause Analysis | normalized-line:3107 |
| C40-032 | Incident | Customer Impact | normalized-line:3108 |
| C40-033 | Incident | Tenant Impact | normalized-line:3109 |
| C40-034 | Incident | Recovery Plan | normalized-line:3110 |
| C40-035 | Incident | Communication Template | normalized-line:3111 |
| C40-036 | Incident | Postmortem | normalized-line:3112 |
| C40-037 | Incident | Preventive Action | normalized-line:3113 |
| C40-038 | Incident | Regression Test | normalized-line:3114 |
| C40-039 | Incident | Backup Restore Test | normalized-line:3115 |
| C40-040 | Incident | Disaster Recovery Drill | normalized-line:3116 |
| C40-041 | Incident | RTO | normalized-line:3117 |
| C40-042 | Incident | RPO | normalized-line:3118 |
| C40-043 | Incident | Error Budget | normalized-line:3119 |

## C41 Onboarding / Migration

初期設定、CSV移行、業種別セットアップ

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

## C42 Vertical Template Factory

業界別OSテンプレート量産基盤

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C42-001 | 共通テンプレート | 業種別CRM項目 | normalized-line:3182 |
| C42-002 | 共通テンプレート | 業種別商談ステージ | normalized-line:3183 |
| C42-003 | 共通テンプレート | 業種別KPI | normalized-line:3184 |
| C42-004 | 共通テンプレート | 業種別ダッシュボード | normalized-line:3185 |
| C42-005 | 共通テンプレート | 業種別広告テンプレート | normalized-line:3186 |
| C42-006 | 共通テンプレート | 業種別LINEテンプレート | normalized-line:3187 |
| C42-007 | 共通テンプレート | 業種別SEOテンプレート | normalized-line:3188 |
| C42-008 | 共通テンプレート | 業種別PRテンプレート | normalized-line:3189 |
| C42-009 | 共通テンプレート | 業種別契約テンプレート | normalized-line:3190 |
| C42-010 | 共通テンプレート | 業種別請求テンプレート | normalized-line:3191 |
| C42-011 | 共通テンプレート | 業種別採用テンプレート | normalized-line:3192 |
| C42-012 | 共通テンプレート | 業種別教育テンプレート | normalized-line:3193 |
| C42-013 | 共通テンプレート | 業種別AI社員 | normalized-line:3194 |
| C42-014 | 共通テンプレート | 業種別承認フロー | normalized-line:3195 |
| C42-015 | 共通テンプレート | 業種別権限 | normalized-line:3196 |
| C42-016 | 共通テンプレート | 業種別同意文面 | normalized-line:3197 |
| C42-017 | 共通テンプレート | 業種別リスクチェック | normalized-line:3198 |
| C42-018 | 共通テンプレート | 業種別禁止表現 | normalized-line:3199 |
| C42-019 | 共通テンプレート | 業種別レポート | normalized-line:3200 |
| C42-020 | 業界パック | 広告代理店OS | normalized-line:3202 |
| C42-021 | 業界パック | 美容室OS | normalized-line:3203 |
| C42-022 | 業界パック | エステOS | normalized-line:3204 |
| C42-023 | 業界パック | 美容クリニックOS | normalized-line:3205 |
| C42-024 | 業界パック | 整骨院OS | normalized-line:3206 |
| C42-025 | 業界パック | 整体院OS | normalized-line:3207 |
| C42-026 | 業界パック | 医療機関OS | normalized-line:3208 |
| C42-027 | 業界パック | 飲食店OS | normalized-line:3209 |
| C42-028 | 業界パック | 小売店OS | normalized-line:3210 |
| C42-029 | 業界パック | EC事業者OS | normalized-line:3211 |
| C42-030 | 業界パック | 士業事務所OS | normalized-line:3212 |
| C42-031 | 業界パック | 採用会社OS | normalized-line:3213 |
| C42-032 | 業界パック | 不動産会社OS | normalized-line:3214 |
| C42-033 | 業界パック | 建設業OS | normalized-line:3215 |
| C42-034 | 業界パック | 製造業OS | normalized-line:3216 |
| C42-035 | 業界パック | フランチャイズ本部OS | normalized-line:3217 |
| C42-036 | 業界パック | 学校法人OS | normalized-line:3218 |
| C42-037 | 業界パック | クリエイター事務所OS | normalized-line:3219 |
| C42-038 | 業界パック | 代理店ネットワークOS | normalized-line:3220 |
| C42-039 | 業界パック | B2B SaaS企業OS | normalized-line:3221 |
| C42-040 | 業界パック | B2C店舗企業OS | normalized-line:3222 |

## C43 White-label / Embedded

他社SaaS、他社OSへの組み込み

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C43-001 | 提供方式 | API提供 | normalized-line:3227 |
| C43-002 | 提供方式 | Webhook提供 | normalized-line:3228 |
| C43-003 | 提供方式 | SDK提供 | normalized-line:3229 |
| C43-004 | 提供方式 | iframe | normalized-line:3230 |
| C43-005 | 提供方式 | Web Component | normalized-line:3231 |
| C43-006 | 提供方式 | Embedded Dashboard | normalized-line:3232 |
| C43-007 | 提供方式 | White-label Dashboard | normalized-line:3233 |
| C43-008 | 提供方式 | OAuth / SSO | normalized-line:3234 |
| C43-009 | 提供方式 | 外部IDマッピング | normalized-line:3235 |
| C43-010 | 提供方式 | 外部OS Adapter | normalized-line:3236 |
| C43-011 | 提供方式 | External CRM Adapter | normalized-line:3237 |
| C43-012 | 提供方式 | External POS Adapter | normalized-line:3238 |
| C43-013 | 提供方式 | External EC Adapter | normalized-line:3239 |
| C43-014 | 提供方式 | External Reservation Adapter | normalized-line:3240 |
| C43-015 | 提供方式 | Partner Console | normalized-line:3241 |
| C43-016 | 提供方式 | Partner Billing | normalized-line:3242 |
| C43-017 | 提供方式 | Partner Usage | normalized-line:3243 |
| C43-018 | 提供方式 | Partner Tenant管理 | normalized-line:3244 |
| C43-019 | 提供方式 | Branding | normalized-line:3245 |
| C43-020 | 提供方式 | Custom Domain | normalized-line:3246 |
| C43-021 | 提供方式 | Theme | normalized-line:3247 |
| C43-022 | 提供方式 | ロゴ差し替え | normalized-line:3248 |
| C43-023 | 提供方式 | 権限差し替え | normalized-line:3249 |
| C43-024 | 提供方式 | 機能ON/OFF | normalized-line:3250 |
| C43-025 | 提供方式 | 契約別制御 | normalized-line:3251 |

## C44 International / Multi-region

多言語、多通貨、海外、リージョン管理

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C44-001 | 国際化 | 多言語 | normalized-line:3256 |
| C44-002 | 国際化 | 日本語 | normalized-line:3257 |
| C44-003 | 国際化 | 英語 | normalized-line:3258 |
| C44-004 | 国際化 | 中国語 | normalized-line:3259 |
| C44-005 | 国際化 | 韓国語 | normalized-line:3260 |
| C44-006 | 国際化 | 多通貨 | normalized-line:3261 |
| C44-007 | 国際化 | 為替レート | normalized-line:3262 |
| C44-008 | 国際化 | 国別税制 | normalized-line:3263 |
| C44-009 | 国際化 | 国別請求書 | normalized-line:3264 |
| C44-010 | 国際化 | 国別個人情報規制 | normalized-line:3265 |
| C44-011 | 国際化 | 国別同意管理 | normalized-line:3266 |
| C44-012 | 国際化 | 国別データ保存 | normalized-line:3267 |
| C44-013 | 国際化 | Data Residency | normalized-line:3268 |
| C44-014 | 国際化 | Multi-region | normalized-line:3269 |
| C44-015 | 国際化 | Region選択 | normalized-line:3270 |
| C44-016 | 国際化 | 海外子会社 | normalized-line:3271 |
| C44-017 | 国際化 | 海外拠点 | normalized-line:3272 |
| C44-018 | 国際化 | 海外従業員 | normalized-line:3273 |
| C44-019 | 国際化 | 海外顧客 | normalized-line:3274 |
| C44-020 | 国際化 | 越境移転同意 | normalized-line:3275 |
| C44-021 | 国際化 | タイムゾーン | normalized-line:3276 |
| C44-022 | 国際化 | 日付形式 | normalized-line:3277 |
| C44-023 | 国際化 | 数値形式 | normalized-line:3278 |
| C44-024 | 国際化 | 住所形式 | normalized-line:3279 |

## C45 Physical AI / IoT / Robotics

将来のロボット、店舗、現場、IoT連携

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C45-001 | IoT | 店舗センサー | normalized-line:3284 |
| C45-002 | IoT | カメラ連携 | normalized-line:3285 |
| C45-003 | IoT | 入退室 | normalized-line:3286 |
| C45-004 | IoT | 温度 | normalized-line:3287 |
| C45-005 | IoT | 湿度 | normalized-line:3288 |
| C45-006 | IoT | 在庫センサー | normalized-line:3289 |
| C45-007 | IoT | POS端末 | normalized-line:3290 |
| C45-008 | IoT | 決済端末 | normalized-line:3291 |
| C45-009 | IoT | 工場設備 | normalized-line:3292 |
| C45-010 | IoT | 車両 | normalized-line:3293 |
| C45-011 | IoT | 倉庫 | normalized-line:3294 |
| C45-012 | IoT | 配送 | normalized-line:3295 |
| C45-013 | IoT | 受付端末 | normalized-line:3296 |
| C45-014 | IoT | サイネージ | normalized-line:3297 |
| C45-015 | IoT | Beacon | normalized-line:3298 |
| C45-016 | IoT | QRチェックイン | normalized-line:3299 |
| C45-017 | Physical AI | 受付AI | normalized-line:3301 |
| C45-018 | Physical AI | 店舗接客AI | normalized-line:3302 |
| C45-019 | Physical AI | 倉庫作業AI | normalized-line:3303 |
| C45-020 | Physical AI | 在庫確認ロボット | normalized-line:3304 |
| C45-021 | Physical AI | 清掃ロボット | normalized-line:3305 |
| C45-022 | Physical AI | 配送ロボット | normalized-line:3306 |
| C45-023 | Physical AI | 工場作業補助 | normalized-line:3307 |
| C45-024 | Physical AI | 現場チェックリスト | normalized-line:3308 |
| C45-025 | Physical AI | 写真解析 | normalized-line:3309 |
| C45-026 | Physical AI | 動画解析 | normalized-line:3310 |
| C45-027 | Physical AI | 音声指示 | normalized-line:3311 |
| C45-028 | Physical AI | ロボット権限 | normalized-line:3312 |
| C45-029 | Physical AI | ロボット実行ログ | normalized-line:3313 |
| C45-030 | Physical AI | ロボット安全停止 | normalized-line:3314 |
| C45-031 | Physical AI | 人間承認 | normalized-line:3315 |
| C45-032 | Physical AI | 事故ログ | normalized-line:3316 |

## C46 Governance Docs / GitHub / Obsidian

正本docs、ロードマップ、監査、Claude Code連携

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C46-001 | Docs | 仕様書 | normalized-line:3321 |
| C46-002 | Docs | ロードマップ | normalized-line:3322 |
| C46-003 | Docs | CURRENT_STATE | normalized-line:3323 |
| C46-004 | Docs | PROGRESS | normalized-line:3324 |
| C46-005 | Docs | ADR | normalized-line:3325 |
| C46-006 | Docs | Risk Register | normalized-line:3326 |
| C46-007 | Docs | Security Policy | normalized-line:3327 |
| C46-008 | Docs | AI Policy | normalized-line:3328 |
| C46-009 | Docs | Data Policy | normalized-line:3329 |
| C46-010 | Docs | API Contract | normalized-line:3330 |
| C46-011 | Docs | DB Schema Docs | normalized-line:3331 |
| C46-012 | Docs | UI Spec | normalized-line:3332 |
| C46-013 | Docs | Test Plan | normalized-line:3333 |
| C46-014 | Docs | Release Note | normalized-line:3334 |
| C46-015 | Docs | Incident Report | normalized-line:3335 |
| C46-016 | Docs | Claude Code Runbook | normalized-line:3336 |
| C46-017 | Docs | Codex Audit | normalized-line:3337 |
| C46-018 | Docs | GitHub正本 | normalized-line:3338 |
| C46-019 | Docs | Obsidian Vault | normalized-line:3339 |
| C46-020 | Docs | 369-vault | normalized-line:3340 |
| C46-021 | Docs | docs正本 | normalized-line:3341 |
| C46-022 | Docs | 変更履歴 | normalized-line:3342 |
| C46-023 | Docs | 意思決定ログ | normalized-line:3343 |
| C46-024 | Docs | 非エンジニア向け説明 | normalized-line:3344 |
| C46-025 | Docs | 営業資料 | normalized-line:3345 |
| C46-026 | Docs | 導入資料 | normalized-line:3346 |
| C46-027 | Docs | Trust資料 | normalized-line:3347 |
| C46-028 | GitHub Ops | Branch管理 | normalized-line:3349 |
| C46-029 | GitHub Ops | PRテンプレート | normalized-line:3350 |
| C46-030 | GitHub Ops | Issueテンプレート | normalized-line:3351 |
| C46-031 | GitHub Ops | Release管理 | normalized-line:3352 |
| C46-032 | GitHub Ops | CI | normalized-line:3353 |
| C46-033 | GitHub Ops | Test | normalized-line:3354 |
| C46-034 | GitHub Ops | Lint | normalized-line:3355 |
| C46-035 | GitHub Ops | Typecheck | normalized-line:3356 |
| C46-036 | GitHub Ops | Build | normalized-line:3357 |
| C46-037 | GitHub Ops | Security Scan | normalized-line:3358 |
| C46-038 | GitHub Ops | Dependency Scan | normalized-line:3359 |
| C46-039 | GitHub Ops | Secret Scan | normalized-line:3360 |
| C46-040 | GitHub Ops | Code Owners | normalized-line:3361 |
| C46-041 | GitHub Ops | Review Rule | normalized-line:3362 |
| C46-042 | GitHub Ops | Changelog | normalized-line:3363 |
| C46-043 | GitHub Ops | Migration管理 | normalized-line:3364 |
| C46-044 | GitHub Ops | Rollback手順 | normalized-line:3365 |
| C46-045 | GitHub Ops | Production Gate | normalized-line:3366 |
| C46-046 | GitHub Ops | Read-only Scout | normalized-line:3367 |
| C46-047 | GitHub Ops | Claude Codeプロンプト生成 | normalized-line:3368 |
| C46-048 | GitHub Ops | 実装前監査 | normalized-line:3369 |
| C46-049 | GitHub Ops | 実装後報告 | normalized-line:3370 |

## C47 Sales / Partner / Go-to-market Ops

営業管理、導入支援、代理店なし成長導線

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C47-001 | 営業 | 見込み企業管理 | normalized-line:3375 |
| C47-002 | 営業 | 商談管理 | normalized-line:3376 |
| C47-003 | 営業 | 導入候補管理 | normalized-line:3377 |
| C47-004 | 営業 | 業種別提案 | normalized-line:3378 |
| C47-005 | 営業 | 会社規模別提案 | normalized-line:3379 |
| C47-006 | 営業 | 課題診断 | normalized-line:3380 |
| C47-007 | 営業 | ROI診断 | normalized-line:3381 |
| C47-008 | 営業 | デモ環境 | normalized-line:3382 |
| C47-009 | 営業 | PoC管理 | normalized-line:3383 |
| C47-010 | 営業 | 契約管理 | normalized-line:3384 |
| C47-011 | 営業 | 導入支援 | normalized-line:3385 |
| C47-012 | 営業 | 初期設定支援 | normalized-line:3386 |
| C47-013 | 営業 | 活用支援 | normalized-line:3387 |
| C47-014 | 営業 | 解約予兆 | normalized-line:3388 |
| C47-015 | 営業 | アップセル | normalized-line:3389 |
| C47-016 | 営業 | クロスセル | normalized-line:3390 |
| C47-017 | 営業 | 事例化 | normalized-line:3391 |
| C47-018 | 営業 | 導入事例同意 | normalized-line:3392 |
| C47-019 | 営業 | 成果数値公開同意 | normalized-line:3393 |
| C47-020 | 代理店なし成長導線 | コンテンツマーケ | normalized-line:3395 |
| C47-021 | 代理店なし成長導線 | SEO | normalized-line:3396 |
| C47-022 | 代理店なし成長導線 | 社長ブランディング | normalized-line:3397 |
| C47-023 | 代理店なし成長導線 | 導入事例 | normalized-line:3398 |
| C47-024 | 代理店なし成長導線 | 比較記事 | normalized-line:3399 |
| C47-025 | 代理店なし成長導線 | 無料診断 | normalized-line:3400 |
| C47-026 | 代理店なし成長導線 | 無料テンプレート | normalized-line:3401 |
| C47-027 | 代理店なし成長導線 | AI社員無料体験 | normalized-line:3402 |
| C47-028 | 代理店なし成長導線 | PLUG型従業員普及 | normalized-line:3403 |
| C47-029 | 代理店なし成長導線 | 開発者経済圏 | normalized-line:3404 |
| C47-030 | 代理店なし成長導線 | Academy | normalized-line:3405 |
| C47-031 | 代理店なし成長導線 | 認定制度 | normalized-line:3406 |
| C47-032 | 代理店なし成長導線 | Marketplace | normalized-line:3407 |
| C47-033 | 代理店なし成長導線 | 口コミではなく正規レビュー | normalized-line:3408 |
| C47-034 | 代理店なし成長導線 | Referral | normalized-line:3409 |
| C47-035 | 代理店なし成長導線 | Business Network | normalized-line:3410 |
| C47-036 | 代理店なし成長導線 | 企業間紹介 | normalized-line:3411 |

## C48 Risk / Insurance / Liability

AI事故、責任分界、補償、事故報告

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C48-001 | リスク管理 | Risk Register | normalized-line:3416 |
| C48-002 | リスク管理 | AI Risk | normalized-line:3417 |
| C48-003 | リスク管理 | Security Risk | normalized-line:3418 |
| C48-004 | リスク管理 | Privacy Risk | normalized-line:3419 |
| C48-005 | リスク管理 | Compliance Risk | normalized-line:3420 |
| C48-006 | リスク管理 | Legal Risk | normalized-line:3421 |
| C48-007 | リスク管理 | Financial Risk | normalized-line:3422 |
| C48-008 | リスク管理 | HR Risk | normalized-line:3423 |
| C48-009 | リスク管理 | Operational Risk | normalized-line:3424 |
| C48-010 | リスク管理 | Marketplace Risk | normalized-line:3425 |
| C48-011 | リスク管理 | Developer Risk | normalized-line:3426 |
| C48-012 | リスク管理 | Plugin Risk | normalized-line:3427 |
| C48-013 | リスク管理 | External API Risk | normalized-line:3428 |
| C48-014 | リスク管理 | Incident Risk | normalized-line:3429 |
| C48-015 | リスク管理 | Vendor Risk | normalized-line:3430 |
| C48-016 | リスク管理 | Customer Risk | normalized-line:3431 |
| C48-017 | リスク管理 | Contract Risk | normalized-line:3432 |
| C48-018 | リスク管理 | Insurance Risk | normalized-line:3433 |
| C48-019 | 事故対応 | 誤送信 | normalized-line:3435 |
| C48-020 | 事故対応 | 誤請求 | normalized-line:3436 |
| C48-021 | 事故対応 | 誤消込 | normalized-line:3437 |
| C48-022 | 事故対応 | 誤仕訳 | normalized-line:3438 |
| C48-023 | 事故対応 | 誤広告変更 | normalized-line:3439 |
| C48-024 | 事故対応 | 誤投稿 | normalized-line:3440 |
| C48-025 | 事故対応 | 誤配信 | normalized-line:3441 |
| C48-026 | 事故対応 | 個人情報漏洩 | normalized-line:3442 |
| C48-027 | 事故対応 | 同意違反 | normalized-line:3443 |
| C48-028 | 事故対応 | 権限違反 | normalized-line:3444 |
| C48-029 | 事故対応 | AI暴走 | normalized-line:3445 |
| C48-030 | 事故対応 | Marketplace App事故 | normalized-line:3446 |
| C48-031 | 事故対応 | Plugin事故 | normalized-line:3447 |
| C48-032 | 事故対応 | Developer不正 | normalized-line:3448 |
| C48-033 | 事故対応 | 原因分析 | normalized-line:3449 |
| C48-034 | 事故対応 | 影響範囲 | normalized-line:3450 |
| C48-035 | 事故対応 | 顧客通知 | normalized-line:3451 |
| C48-036 | 事故対応 | 補償対応 | normalized-line:3452 |
| C48-037 | 事故対応 | 保険会社向け証跡 | normalized-line:3453 |
| C48-038 | 事故対応 | 責任分界 | normalized-line:3454 |
| C48-039 | 事故対応 | 再発防止 | normalized-line:3455 |

## C49 App Review / Marketplace Governance

AI社員・Pluginの審査、停止、互換性

> SOURCE_DETAIL_MISSING: カテゴリ一覧には存在しますが、Appendix Aに詳細節がありません。未定義を実装済み・網羅済みとして扱わないでください。

## C50 Community / Ecosystem Analytics

開発者・導入企業・AI社員経済圏の分析

| Function ID | 小分類・文脈 | 原典機能 | 原典 |
| --- | --- | --- | --- |
| C50-001 | 経済圏指標 | 導入企業数 | normalized-line:3460 |
| C50-002 | 経済圏指標 | 有料企業数 | normalized-line:3461 |
| C50-003 | 経済圏指標 | アクティブ企業数 | normalized-line:3462 |
| C50-004 | 経済圏指標 | ユーザー数 | normalized-line:3463 |
| C50-005 | 経済圏指標 | 従業員利用数 | normalized-line:3464 |
| C50-006 | 経済圏指標 | AI社員導入数 | normalized-line:3465 |
| C50-007 | 経済圏指標 | AI社員稼働時間 | normalized-line:3466 |
| C50-008 | 経済圏指標 | AI社員売上 | normalized-line:3467 |
| C50-009 | 経済圏指標 | AI社員原価 | normalized-line:3468 |
| C50-010 | 経済圏指標 | AI社員ROI | normalized-line:3469 |
| C50-011 | 経済圏指標 | Marketplace GMV | normalized-line:3470 |
| C50-012 | 経済圏指標 | Marketplace Take Rate | normalized-line:3471 |
| C50-013 | 経済圏指標 | Developer Revenue | normalized-line:3472 |
| C50-014 | 経済圏指標 | Developer数 | normalized-line:3473 |
| C50-015 | 経済圏指標 | 認定開発者数 | normalized-line:3474 |
| C50-016 | 経済圏指標 | Plugin数 | normalized-line:3475 |
| C50-017 | 経済圏指標 | App数 | normalized-line:3476 |
| C50-018 | 経済圏指標 | App導入率 | normalized-line:3477 |
| C50-019 | 経済圏指標 | App解約率 | normalized-line:3478 |
| C50-020 | 経済圏指標 | App事故率 | normalized-line:3479 |
| C50-021 | 経済圏指標 | App評価 | normalized-line:3480 |
| C50-022 | 経済圏指標 | PLUG利用数 | normalized-line:3481 |
| C50-023 | 経済圏指標 | PLUG成果報酬 | normalized-line:3482 |
| C50-024 | 経済圏指標 | Referral成果 | normalized-line:3483 |
| C50-025 | 経済圏指標 | Affiliate成果 | normalized-line:3484 |
| C50-026 | 経済圏指標 | Academy受講者 | normalized-line:3485 |
| C50-027 | 経済圏指標 | 認定者数 | normalized-line:3486 |
| C50-028 | 経済圏指標 | Community参加者 | normalized-line:3487 |
| C50-029 | 経済圏指標 | 業種別利用 | normalized-line:3488 |
| C50-030 | 経済圏指標 | 企業規模別利用 | normalized-line:3489 |
| C50-031 | 経済圏指標 | 地域別利用 | normalized-line:3490 |
| C50-032 | 経済圏指標 | 解約理由 | normalized-line:3491 |
| C50-033 | 経済圏指標 | NPS | normalized-line:3492 |
| C50-034 | 経済圏指標 | LTV | normalized-line:3493 |
| C50-035 | 経済圏指標 | CAC | normalized-line:3494 |
| C50-036 | 経済圏指標 | Payback Period | normalized-line:3495 |

## Global AI Rules

| Rule ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| GAR-001 | TEXT | 369 / IKEZAKI OSは、AI社員を使うからこそ、以下を絶対ルールにするべきです。 | normalized-line:3498 |
| GAR-002 | TEXT | AIができること | normalized-line:3499 |
| GAR-003 | BULLET | 読み取り | normalized-line:3500 |
| GAR-004 | BULLET | 要約 | normalized-line:3501 |
| GAR-005 | BULLET | 分析 | normalized-line:3502 |
| GAR-006 | BULLET | 下書き | normalized-line:3503 |
| GAR-007 | BULLET | 候補提示 | normalized-line:3504 |
| GAR-008 | BULLET | 異常検知 | normalized-line:3505 |
| GAR-009 | BULLET | 差分表示 | normalized-line:3506 |
| GAR-010 | BULLET | 承認依頼作成 | normalized-line:3507 |
| GAR-011 | BULLET | リスク判定 | normalized-line:3508 |
| GAR-012 | BULLET | 同意チェック | normalized-line:3509 |
| GAR-013 | BULLET | コンプライアンスチェック | normalized-line:3510 |
| GAR-014 | BULLET | 監査ログ記録 | normalized-line:3511 |
| GAR-015 | BULLET | データ不足表示 | normalized-line:3512 |
| GAR-016 | BULLET | 信頼度表示 | normalized-line:3513 |
| GAR-017 | BULLET | 実行前プレビュー | normalized-line:3514 |
| GAR-018 | BULLET | mock実行 | normalized-line:3515 |
| GAR-019 | BULLET | dry-run | normalized-line:3516 |
| GAR-020 | BULLET | simulation | normalized-line:3517 |
| GAR-021 | TEXT | AIが無承認でしてはいけないこと | normalized-line:3518 |
| GAR-022 | BULLET | 請求書確定 | normalized-line:3519 |
| GAR-023 | BULLET | 請求書送付 | normalized-line:3520 |
| GAR-024 | BULLET | 請求金額変更 | normalized-line:3521 |
| GAR-025 | BULLET | 入金消込確定 | normalized-line:3522 |
| GAR-026 | BULLET | 会計仕訳確定 | normalized-line:3523 |
| GAR-027 | BULLET | 税務判断確定 | normalized-line:3524 |
| GAR-028 | BULLET | 契約締結 | normalized-line:3525 |
| GAR-029 | BULLET | 契約変更 | normalized-line:3526 |
| GAR-030 | BULLET | 返金 | normalized-line:3527 |
| GAR-031 | BULLET | 相殺 | normalized-line:3528 |
| GAR-032 | BULLET | 値引き | normalized-line:3529 |
| GAR-033 | BULLET | 顧客への督促 | normalized-line:3530 |
| GAR-034 | BULLET | 広告予算変更 | normalized-line:3531 |
| GAR-035 | BULLET | 広告停止 | normalized-line:3532 |
| GAR-036 | BULLET | LINE送信 | normalized-line:3533 |
| GAR-037 | BULLET | メール送信 | normalized-line:3534 |
| GAR-038 | BULLET | DM送信 | normalized-line:3535 |
| GAR-039 | BULLET | SNS投稿 | normalized-line:3536 |
| GAR-040 | BULLET | PR配信 | normalized-line:3537 |
| GAR-041 | BULLET | SEO公開 | normalized-line:3538 |
| GAR-042 | BULLET | 個人情報外部送信 | normalized-line:3539 |
| GAR-043 | BULLET | 顧客名公開 | normalized-line:3540 |
| GAR-044 | BULLET | 成果数値公開 | normalized-line:3541 |
| GAR-045 | BULLET | 採用合否決定 | normalized-line:3542 |
| GAR-046 | BULLET | 労務判断確定 | normalized-line:3543 |
| GAR-047 | BULLET | 権限変更 | normalized-line:3544 |
| GAR-048 | BULLET | DBスキーマ変更 | normalized-line:3545 |
| GAR-049 | BULLET | 監査ログ削除 | normalized-line:3546 |
| GAR-050 | BULLET | 同意状態変更 | normalized-line:3547 |
| GAR-051 | BULLET | 他テナント参照 | normalized-line:3548 |

## Appendix A 補足機能・戦略記録

50カテゴリ詳細後にある追加機能、追加19領域、差別化、MVP制約、設計docs候補を省略せず保持します。

| Record ID | 種別 | 原典記録 | 原典 |
| --- | --- | --- | --- |
| A-SUP-001 | TEXT | 1. 369の最終完成形 | normalized-line:3550 |
| A-SUP-002 | TEXT | ここまでをすべて採用した369 / IKEZAKI OSの完成形は、以下です。 | normalized-line:3551 |
| A-SUP-003 | TEXT | 369 / IKEZAKI OSは、企業のすべての正本データを安全に束ね、AI社員が業務を補助・提案・下書き・分析し、重要な外部影響や金銭影響は人間が認証し、その全履歴を監査可能にするAI経営OSである。 | normalized-line:3552 |
| A-SUP-004 | TEXT | さらに、他社が簡単に真似できない強みは以下です。 | normalized-line:3553 |
| A-SUP-005 | TEXT | 参入障壁 内容 | normalized-line:3554 |
| A-SUP-006 | TEXT | 2. 正本データ 顧客・契約・請求・売上・粗利・LTV・在庫・予約・ECを一元化 | normalized-line:3555 |
| A-SUP-007 | TEXT | 3. Business Event Ledger 会社で起きた全業務イベントを時系列で記録 | normalized-line:3556 |
| A-SUP-008 | TEXT | 4. Human Certification Gate AIが危険な確定行為を勝手にできない | normalized-line:3557 |
| A-SUP-009 | TEXT | 5. AI社員管制塔 AI社員の権限・免許・評価・停止・監査を管理 | normalized-line:3558 |
| A-SUP-010 | TEXT | 6. AI Action Flight Recorder AIが何を見て何を判断したかを全記録 | normalized-line:3559 |
| A-SUP-011 | TEXT | 7. AD OS 広告・SNS・LINE・SEO・PR・紹介を売上・粗利・LTVに接続 | normalized-line:3560 |
| A-SUP-012 | TEXT | 8. PLUG型導線 企業だけでなく従業員にも広がる購買・アフィリエイト導線 | normalized-line:3561 |
| A-SUP-013 | TEXT | 9. Developer Platform 外部開発者がAI社員・Pluginを作れる | normalized-line:3562 |
| A-SUP-014 | TEXT | 10. Marketplace AI社員経済圏が形成される | normalized-line:3563 |
| A-SUP-015 | TEXT | 11. Academy / Certification 369を扱える人材市場が育つ | normalized-line:3564 |
| A-SUP-016 | TEXT | 12. Trust Center 企業が安心して導入できる信頼基盤 | normalized-line:3565 |
| A-SUP-017 | TEXT | 13. Vertical Template Factory 業界特化OSを量産できる | normalized-line:3566 |
| A-SUP-018 | TEXT | 14. Embedded / White-label 他社SaaSや他社OSにも組み込める | normalized-line:3567 |
| A-SUP-019 | TEXT | 15. Billing / Metering 従量課金、AI原価、収益分配が成立する | normalized-line:3568 |
| A-SUP-020 | TEXT | 16. Governance Docs 非エンジニアでも開発・運用・監査を管理できる | normalized-line:3569 |
| A-SUP-021 | TEXT | 最終的に369は、企業の業務OSであり、AI社員の労務管理OSであり、開発者経済圏であり、広告・売上・粗利・LTVをつなぐ成長OSであり、企業と従業員の日常に入り込むインフラになります。 | normalized-line:3570 |
| A-SUP-022 | TEXT | 現時点で思い出せる範囲を、**「369 / IKEZAKI OSに組み込もうとしているSaaS的機能群」**として完全棚卸しすると、結論はこうです。 | normalized-line:3571 |
| A-SUP-023 | TEXT | 369 / IKEZAKI OSは、単なるCRMでも、ERPでも、広告管理ツールでも、AIチャットでもなく、企業の経営・営業・マーケ・人事・会計・開発者経済圏・AI社員経済圏まで含めた“AI経営OS / 業務OS / 事業インフラ”を目指している構想です。 | normalized-line:3572 |
| A-SUP-024 | TEXT | 資料上でも、AD OS、旧AI Growth Engineは「単体SaaS」「IKEZAKI OS組み込み」「他社OS・業界特化OSへの組み込み」の3形態を想定しており、広告・SNS・LINE・SEO・PR・紹介・CRM・予約・商談・契約・売上・粗利・LTVをつなぐ共通成長基盤として設計されています。 | normalized-line:3573 |
| A-SUP-025 | TEXT | また、IKEZAKI OS側に正本として置くデータは、顧客・商談・見積・契約・請求・入金・売上・粗利・LTV・在庫・予約・ECで、接続対象にはCRM、Sales、Quote、Contract、Invoice、Payment、Accounting、Inventory、Reservation、EC、Dashboardなどが含まれています。 | normalized-line:3574 |
| A-SUP-026 | TEXT | 1. 全体像：369 / IKEZAKI OSに入れようとしている大カテゴリ | normalized-line:3576 |
| A-SUP-027 | TEXT | 大きく分けると、以下です。 | normalized-line:3577 |
| A-SUP-028 | TEXT | 大カテゴリ 目指しているもの | normalized-line:3578 |
| A-SUP-029 | TEXT | 2. AI経営OS本体 会社の情報・判断・実行・監査を一元管理する基盤 | normalized-line:3579 |
| A-SUP-030 | TEXT | 3. Company Brain / 企業ナレッジ 社内情報、顧客情報、業務履歴、意思決定履歴をAIが理解できる脳 | normalized-line:3580 |
| A-SUP-031 | TEXT | 4. CRM / SFA Salesforce、HubSpot的な顧客・営業・商談管理 | normalized-line:3581 |
| A-SUP-032 | TEXT | 5. ERP / 基幹業務 Oracle、NetSuite的な会計・在庫・受発注・請求・契約管理 | normalized-line:3582 |
| A-SUP-033 | TEXT | 6. AD OS / Growth Engine 広告・SNS・LINE・SEO・PR・紹介・売上・粗利・LTVをつなぐ成長基盤 | normalized-line:3583 |
| A-SUP-034 | TEXT | 7. EC / POS / 予約 / 受発注 Shopify、POS、予約SaaS、受発注管理のような商取引機能 | normalized-line:3584 |
| A-SUP-035 | TEXT | 8. PLUG型購買・価格比較・アフィリエイト 最安値比較、EC横断、購入導線、成果報酬、従業員普及導線 | normalized-line:3585 |
| A-SUP-036 | TEXT | 9. AI社員 / Agent Platform 営業AI、経理AI、採用AI、CS AI、マーケAIなどのAI社員群 | normalized-line:3586 |
| A-SUP-037 | TEXT | 10. AI社員開発環境 誰でもAI社員・プラグインを作れる開発環境、テンプレート、SDK | normalized-line:3587 |
| A-SUP-038 | TEXT | 11. AI社員マーケットプレイス 開発者が作ったAI社員を販売・配布・収益化する経済圏 | normalized-line:3588 |
| A-SUP-039 | TEXT | 12. Developer Platform / Plugin Platform API、Webhook、SDK、拡張機能、外部連携、開発者向け課金 | normalized-line:3589 |
| A-SUP-040 | TEXT | 13. 業務自動化 / Workflow 承認、タスク、通知、実行キュー、監査ログ、例外処理 | normalized-line:3590 |
| A-SUP-041 | TEXT | 14. 人事 / 採用 / 教育 採用、オンボーディング、教育、評価、社内ナレッジ継承 | normalized-line:3591 |
| A-SUP-042 | TEXT | 15. 法務 / 契約 / コンプライアンス 契約、規約、同意、監査、リスク判定、ステマ防止、景表法対応 | normalized-line:3592 |
| A-SUP-043 | TEXT | 16. BI / Dashboard / 経営分析 経営者が1分で状況を見られるダッシュボード | normalized-line:3593 |
| A-SUP-044 | TEXT | 17. 業界特化OS 医療、美容、飲食、士業、学校、広告代理店、FCなどへの横展開 | normalized-line:3594 |
| A-SUP-045 | TEXT | 18. White-label / Embedded 他社SaaSや他社OSに組み込む提供方式 | normalized-line:3595 |
| A-SUP-046 | TEXT | 19. セキュリティ / 権限 / 監査 Permission Graph、Approval Graph、Audit Graph、RLS、Kill Switch | normalized-line:3596 |
| A-SUP-047 | TEXT | 20. 課金 / 従量課金 / ユニットエコノミクス サブスク、従量課金、AI社員稼働課金、開発者収益分配 | normalized-line:3597 |
| A-SUP-048 | TEXT | 21. 将来のフィジカルAI / ロボット連携 現時点では将来構想だが、AI社員の延長線上にある領域 | normalized-line:3598 |
| A-SUP-049 | TEXT | 22. CRM / SFA系：Salesforce・HubSpot的に入れたい機能 | normalized-line:3600 |
| A-SUP-050 | TEXT | ここは、顧客・リード・営業・商談・売上の正本管理です。 | normalized-line:3601 |
| A-SUP-051 | TEXT | 組み込む機能 | normalized-line:3602 |
| A-SUP-052 | BULLET | 顧客管理 | normalized-line:3603 |
| A-SUP-053 | BULLET | 会社管理 | normalized-line:3604 |
| A-SUP-054 | BULLET | 担当者管理 | normalized-line:3605 |
| A-SUP-055 | BULLET | リード管理 | normalized-line:3606 |
| A-SUP-056 | BULLET | 見込み顧客管理 | normalized-line:3607 |
| A-SUP-057 | BULLET | 顧客タグ | normalized-line:3608 |
| A-SUP-058 | BULLET | 顧客ステータス | normalized-line:3609 |
| A-SUP-059 | BULLET | 顧客ランク | normalized-line:3610 |
| A-SUP-060 | BULLET | 顧客セグメント | normalized-line:3611 |
| A-SUP-061 | BULLET | 問い合わせ管理 | normalized-line:3612 |
| A-SUP-062 | BULLET | 資料請求管理 | normalized-line:3613 |
| A-SUP-063 | BULLET | 商談管理 | normalized-line:3614 |
| A-SUP-064 | BULLET | 商談ステージ管理 | normalized-line:3615 |
| A-SUP-065 | BULLET | パイプライン管理 | normalized-line:3616 |
| A-SUP-066 | BULLET | 案件管理 | normalized-line:3617 |
| A-SUP-067 | BULLET | 営業活動履歴 | normalized-line:3618 |
| A-SUP-068 | BULLET | 営業メモ | normalized-line:3619 |
| A-SUP-069 | BULLET | 架電履歴 | normalized-line:3620 |
| A-SUP-070 | BULLET | メール履歴 | normalized-line:3621 |
| A-SUP-071 | BULLET | LINE履歴 | normalized-line:3622 |
| A-SUP-072 | BULLET | 面談履歴 | normalized-line:3623 |
| A-SUP-073 | BULLET | 提案履歴 | normalized-line:3624 |
| A-SUP-074 | BULLET | 見積履歴 | normalized-line:3625 |
| A-SUP-075 | BULLET | 契約履歴 | normalized-line:3626 |
| A-SUP-076 | BULLET | 失注理由管理 | normalized-line:3627 |
| A-SUP-077 | BULLET | 休眠顧客管理 | normalized-line:3628 |
| A-SUP-078 | BULLET | リピート候補管理 | normalized-line:3629 |
| A-SUP-079 | BULLET | クロスセル候補 | normalized-line:3630 |
| A-SUP-080 | BULLET | アップセル候補 | normalized-line:3631 |
| A-SUP-081 | BULLET | 顧客LTV管理 | normalized-line:3632 |
| A-SUP-082 | BULLET | 顧客別粗利管理 | normalized-line:3633 |
| A-SUP-083 | BULLET | 顧客別流入元管理 | normalized-line:3634 |
| A-SUP-084 | BULLET | 顧客別広告接触履歴 | normalized-line:3635 |
| A-SUP-085 | BULLET | 顧客別紹介者管理 | normalized-line:3636 |
| A-SUP-086 | BULLET | 顧客別担当者管理 | normalized-line:3637 |
| A-SUP-087 | BULLET | 顧客別タスク | normalized-line:3638 |
| A-SUP-088 | BULLET | 顧客別AI提案 | normalized-line:3639 |
| A-SUP-089 | BULLET | 顧客別リスク | normalized-line:3640 |
| A-SUP-090 | BULLET | 顧客別同意管理 | normalized-line:3641 |
| A-SUP-091 | TEXT | AIでやりたいこと | normalized-line:3642 |
| A-SUP-092 | BULLET | 営業フォロー候補の提案 | normalized-line:3643 |
| A-SUP-093 | BULLET | 次に連絡すべき顧客の提案 | normalized-line:3644 |
| A-SUP-094 | BULLET | 失注リスクの検知 | normalized-line:3645 |
| A-SUP-095 | BULLET | 商談化しやすいリードのスコアリング | normalized-line:3646 |
| A-SUP-096 | BULLET | 受注確度の推定 | normalized-line:3647 |
| A-SUP-097 | BULLET | 提案文面の下書き | normalized-line:3648 |
| A-SUP-098 | BULLET | メール・LINE返信案 | normalized-line:3649 |
| A-SUP-099 | BULLET | 営業日報の自動要約 | normalized-line:3650 |
| A-SUP-100 | BULLET | 顧客ごとの次アクション提案 | normalized-line:3651 |
| A-SUP-101 | BULLET | 過去の類似商談から勝ちパターン提示 | normalized-line:3652 |
| A-SUP-102 | BULLET | 営業担当者の活動量・成果の分析 | normalized-line:3653 |
| A-SUP-103 | TEXT | 1. Sales / Quote / Contract系：営業から契約まで | normalized-line:3655 |
| A-SUP-104 | TEXT | ここは、Salesforce + 契約管理SaaS + 見積管理SaaSの領域です。 | normalized-line:3656 |
| A-SUP-105 | TEXT | 組み込む機能 | normalized-line:3657 |
| A-SUP-106 | BULLET | 商品・サービスマスタ | normalized-line:3658 |
| A-SUP-107 | BULLET | 料金プラン管理 | normalized-line:3659 |
| A-SUP-108 | BULLET | 見積作成 | normalized-line:3660 |
| A-SUP-109 | BULLET | 見積承認 | normalized-line:3661 |
| A-SUP-110 | BULLET | 見積PDF出力 | normalized-line:3662 |
| A-SUP-111 | BULLET | 見積送付履歴 | normalized-line:3663 |
| A-SUP-112 | BULLET | 見積有効期限管理 | normalized-line:3664 |
| A-SUP-113 | BULLET | 値引き申請 | normalized-line:3665 |
| A-SUP-114 | BULLET | 値引き承認 | normalized-line:3666 |
| A-SUP-115 | BULLET | 契約書ドラフト作成 | normalized-line:3667 |
| A-SUP-116 | BULLET | 契約条件管理 | normalized-line:3668 |
| A-SUP-117 | BULLET | 契約期間管理 | normalized-line:3669 |
| A-SUP-118 | BULLET | 自動更新管理 | normalized-line:3670 |
| A-SUP-119 | BULLET | 解約管理 | normalized-line:3671 |
| A-SUP-120 | BULLET | 契約変更管理 | normalized-line:3672 |
| A-SUP-121 | BULLET | 契約ステータス管理 | normalized-line:3673 |
| A-SUP-122 | BULLET | 電子契約連携 | normalized-line:3674 |
| A-SUP-123 | BULLET | 契約更新アラート | normalized-line:3675 |
| A-SUP-124 | BULLET | 契約別売上管理 | normalized-line:3676 |
| A-SUP-125 | BULLET | 契約別粗利管理 | normalized-line:3677 |
| A-SUP-126 | BULLET | 成果報酬条件管理 | normalized-line:3678 |
| A-SUP-127 | BULLET | 成果報酬計算候補 | normalized-line:3679 |
| A-SUP-128 | BULLET | SLA管理 | normalized-line:3680 |
| A-SUP-129 | BULLET | 契約違反リスク検知 | normalized-line:3681 |
| A-SUP-130 | BULLET | 法務レビュー依頼 | normalized-line:3682 |
| A-SUP-131 | BULLET | 契約テンプレート管理 | normalized-line:3683 |
| A-SUP-132 | TEXT | AIでやりたいこと | normalized-line:3684 |
| A-SUP-133 | BULLET | 見積内容の妥当性チェック | normalized-line:3685 |
| A-SUP-134 | BULLET | 契約条件と請求内容の照合 | normalized-line:3686 |
| A-SUP-135 | BULLET | 値引きしすぎの警告 | normalized-line:3687 |
| A-SUP-136 | BULLET | 契約更新タイミングの通知 | normalized-line:3688 |
| A-SUP-137 | BULLET | 契約書のリスク箇所抽出 | normalized-line:3689 |
| A-SUP-138 | BULLET | 契約条件から請求ドラフト作成 | normalized-line:3690 |
| A-SUP-139 | BULLET | 成果報酬計算の候補提示 | normalized-line:3691 |
| A-SUP-140 | BULLET | ただし契約確定や請求確定は人間承認必須 | normalized-line:3692 |
| A-SUP-141 | TEXT | 1. Invoice / Payment / Accounting系：請求・入金・会計 | normalized-line:3694 |
| A-SUP-142 | TEXT | ここはかなり重要で、AIが勝手にやってはいけない領域として明確に分けるべきです。 | normalized-line:3695 |
| A-SUP-143 | TEXT | 資料上でも、AI側は媒体費台帳、代理店手数料設定、成果報酬候補、請求ドラフト、精算根拠、人間認証履歴、PDF生成履歴を扱い、正式Invoice、請求番号、Payment、Accounting、売掛管理、契約情報、取引先正本はIKEZAKI OS側に置く設計です。 | normalized-line:3696 |
| A-SUP-144 | TEXT | 組み込む機能 | normalized-line:3697 |
| A-SUP-145 | BULLET | 請求先管理 | normalized-line:3698 |
| A-SUP-146 | BULLET | 請求書ドラフト作成 | normalized-line:3699 |
| A-SUP-147 | BULLET | 請求明細案作成 | normalized-line:3700 |
| A-SUP-148 | BULLET | 請求書PDF生成 | normalized-line:3701 |
| A-SUP-149 | BULLET | 請求番号管理 | normalized-line:3702 |
| A-SUP-150 | BULLET | 請求ステータス管理 | normalized-line:3703 |
| A-SUP-151 | BULLET | 請求承認 | normalized-line:3704 |
| A-SUP-152 | BULLET | 請求送付履歴 | normalized-line:3705 |
| A-SUP-153 | BULLET | 入金予定管理 | normalized-line:3706 |
| A-SUP-154 | BULLET | 入金候補マッチング | normalized-line:3707 |
| A-SUP-155 | BULLET | 入金消込候補 | normalized-line:3708 |
| A-SUP-156 | BULLET | 売掛管理 | normalized-line:3709 |
| A-SUP-157 | BULLET | 未入金管理 | normalized-line:3710 |
| A-SUP-158 | BULLET | 督促文面案 | normalized-line:3711 |
| A-SUP-159 | BULLET | 返金候補 | normalized-line:3712 |
| A-SUP-160 | BULLET | 相殺候補 | normalized-line:3713 |
| A-SUP-161 | BULLET | 値引き候補 | normalized-line:3714 |
| A-SUP-162 | BULLET | 税区分候補 | normalized-line:3715 |
| A-SUP-163 | BULLET | 消費税候補 | normalized-line:3716 |
| A-SUP-164 | BULLET | 源泉徴収候補 | normalized-line:3717 |
| A-SUP-165 | BULLET | 仕訳ドラフト | normalized-line:3718 |
| A-SUP-166 | BULLET | 会計ソフト連携 | normalized-line:3719 |
| A-SUP-167 | BULLET | 月次売上集計 | normalized-line:3720 |
| A-SUP-168 | BULLET | 月次粗利集計 | normalized-line:3721 |
| A-SUP-169 | BULLET | 顧客別売上 | normalized-line:3722 |
| A-SUP-170 | BULLET | 顧客別粗利 | normalized-line:3723 |
| A-SUP-171 | BULLET | 商品別売上 | normalized-line:3724 |
| A-SUP-172 | BULLET | 部門別売上 | normalized-line:3725 |
| A-SUP-173 | BULLET | 媒体費精算 | normalized-line:3726 |
| A-SUP-174 | BULLET | 代理店手数料計算 | normalized-line:3727 |
| A-SUP-175 | BULLET | 成果報酬計算 | normalized-line:3728 |
| A-SUP-176 | BULLET | 収益認識管理 | normalized-line:3729 |
| A-SUP-177 | BULLET | 請求・入金・会計監査ログ | normalized-line:3730 |
| A-SUP-178 | TEXT | AIができること | normalized-line:3731 |
| A-SUP-179 | BULLET | 請求ドラフト作成 | normalized-line:3732 |
| A-SUP-180 | BULLET | 請求明細案作成 | normalized-line:3733 |
| A-SUP-181 | BULLET | 媒体費集計 | normalized-line:3734 |
| A-SUP-182 | BULLET | 代理店手数料計算案 | normalized-line:3735 |
| A-SUP-183 | BULLET | 成果報酬候補計算 | normalized-line:3736 |
| A-SUP-184 | BULLET | 税区分候補表示 | normalized-line:3737 |
| A-SUP-185 | BULLET | 入金候補マッチング | normalized-line:3738 |
| A-SUP-186 | BULLET | 仕訳ドラフト作成 | normalized-line:3739 |
| A-SUP-187 | BULLET | 督促文面案作成 | normalized-line:3740 |
| A-SUP-188 | BULLET | 返金・相殺・値引き候補表示 | normalized-line:3741 |
| A-SUP-189 | BULLET | 異常値検知 | normalized-line:3742 |
| A-SUP-190 | BULLET | 契約条件との照合 | normalized-line:3743 |
| A-SUP-191 | BULLET | 差分表示 | normalized-line:3744 |
| A-SUP-192 | BULLET | 認証依頼作成 | normalized-line:3745 |
| A-SUP-193 | TEXT | この範囲は資料でもAIができることとして定義されています。 | normalized-line:3746 |
| A-SUP-194 | TEXT | 人間認証が必須のこと | normalized-line:3747 |
| A-SUP-195 | BULLET | 請求書の正式確定 | normalized-line:3748 |
| A-SUP-196 | BULLET | 請求書の顧客送付 | normalized-line:3749 |
| A-SUP-197 | BULLET | 請求金額変更 | normalized-line:3750 |
| A-SUP-198 | BULLET | 入金消込確定 | normalized-line:3751 |
| A-SUP-199 | BULLET | 会計仕訳確定 | normalized-line:3752 |
| A-SUP-200 | BULLET | 成果報酬確定 | normalized-line:3753 |
| A-SUP-201 | BULLET | 税区分・消費税・源泉等の確定 | normalized-line:3754 |
| A-SUP-202 | BULLET | 督促送信 | normalized-line:3755 |
| A-SUP-203 | BULLET | 返金処理 | normalized-line:3756 |
| A-SUP-204 | BULLET | 相殺処理 | normalized-line:3757 |
| A-SUP-205 | BULLET | 値引き処理 | normalized-line:3758 |
| A-SUP-206 | BULLET | 修正請求 | normalized-line:3759 |
| A-SUP-207 | TEXT | 資料でもこれらは人間認証が必須と定義されています。 | normalized-line:3760 |
| A-SUP-208 | TEXT | 1. AD OS / 旧AI Growth Engine：広告・集客・成長基盤 | normalized-line:3762 |
| A-SUP-209 | TEXT | これは、369 / IKEZAKI OSの中でもかなり重要な差別化ポイントです。 | normalized-line:3763 |
| A-SUP-210 | TEXT | 単なる広告管理ではなく、広告・SNS・LINE・SEO・PR・紹介・CRM・売上・粗利・LTVをつなぎ、AIが改善提案し、人間承認後に実行し、結果を記録する基盤です。資料でも、これは広告管理ツールやSNS投稿ツール、LINE配信ツール、単なるCRMではなく、成長施策を安全に実行できる共通基盤と説明されています。 | normalized-line:3764 |
| A-SUP-211 | TEXT | 組み込む機能 | normalized-line:3765 |
| A-SUP-212 | BULLET | Growth Event Ledger | normalized-line:3766 |
| A-SUP-213 | BULLET | MarketingEvent | normalized-line:3767 |
| A-SUP-214 | BULLET | ConversionEvent | normalized-line:3768 |
| A-SUP-215 | BULLET | RevenueEvent | normalized-line:3769 |
| A-SUP-216 | BULLET | CostEvent | normalized-line:3770 |
| A-SUP-217 | BULLET | ReferralEvent | normalized-line:3771 |
| A-SUP-218 | BULLET | SeoEvent | normalized-line:3772 |
| A-SUP-219 | BULLET | PrEvent | normalized-line:3773 |
| A-SUP-220 | BULLET | NetworkEvent | normalized-line:3774 |
| A-SUP-221 | BULLET | AIRecommendationEvent | normalized-line:3775 |
| A-SUP-222 | BULLET | ApprovalEvent | normalized-line:3776 |
| A-SUP-223 | BULLET | ExecutionEvent | normalized-line:3777 |
| A-SUP-224 | BULLET | Attribution Engine | normalized-line:3778 |
| A-SUP-225 | BULLET | IdentityMap / GEID | normalized-line:3779 |
| A-SUP-226 | BULLET | Segment Engine | normalized-line:3780 |
| A-SUP-227 | BULLET | Campaign Management | normalized-line:3781 |
| A-SUP-228 | BULLET | Channel Management | normalized-line:3782 |
| A-SUP-229 | BULLET | Source Management | normalized-line:3783 |
| A-SUP-230 | BULLET | UTM Management | normalized-line:3784 |
| A-SUP-231 | BULLET | Cost Management | normalized-line:3785 |
| A-SUP-232 | BULLET | Conversion Management | normalized-line:3786 |
| A-SUP-233 | BULLET | Revenue Linkage | normalized-line:3787 |
| A-SUP-234 | BULLET | AI Recommendation | normalized-line:3788 |
| A-SUP-235 | BULLET | AI Confidence Score | normalized-line:3789 |
| A-SUP-236 | BULLET | Data Sufficiency Indicator | normalized-line:3790 |
| A-SUP-237 | BULLET | Cold Start Playbook | normalized-line:3791 |
| A-SUP-238 | BULLET | Benchmark Library | normalized-line:3792 |
| A-SUP-239 | BULLET | Approval Orchestrator | normalized-line:3793 |
| A-SUP-240 | BULLET | Approval Inbox | normalized-line:3794 |
| A-SUP-241 | BULLET | AI Action Status | normalized-line:3795 |
| A-SUP-242 | BULLET | Execution Queue | normalized-line:3796 |
| A-SUP-243 | BULLET | Recommendation Outcome Tracking | normalized-line:3797 |
| A-SUP-244 | BULLET | AuditLog | normalized-line:3798 |
| A-SUP-245 | BULLET | Compliance Guard | normalized-line:3799 |
| A-SUP-246 | BULLET | Disclosure Guard | normalized-line:3800 |
| A-SUP-247 | BULLET | Adapter Versioning | normalized-line:3801 |
| A-SUP-248 | BULLET | Provider Health Check | normalized-line:3802 |
| A-SUP-249 | BULLET | Contract Test | normalized-line:3803 |
| A-SUP-250 | BULLET | Fallback Mode | normalized-line:3804 |
| A-SUP-251 | BULLET | Export / Data Portability | normalized-line:3805 |
| A-SUP-252 | TEXT | これらはCoreに含める要素として資料にも列挙されています。 | normalized-line:3806 |
| A-SUP-253 | TEXT | 広告運用系 | normalized-line:3807 |
| A-SUP-254 | BULLET | Meta広告連携 | normalized-line:3808 |
| A-SUP-255 | BULLET | Google広告連携 | normalized-line:3809 |
| A-SUP-256 | BULLET | Yahoo広告連携 | normalized-line:3810 |
| A-SUP-257 | BULLET | TikTok広告連携 | normalized-line:3811 |
| A-SUP-258 | BULLET | YouTube広告連携 | normalized-line:3812 |
| A-SUP-259 | BULLET | X広告連携 | normalized-line:3813 |
| A-SUP-260 | BULLET | 広告費管理 | normalized-line:3814 |
| A-SUP-261 | BULLET | 媒体費台帳 | normalized-line:3815 |
| A-SUP-262 | BULLET | キャンペーン管理 | normalized-line:3816 |
| A-SUP-263 | BULLET | 広告グループ管理 | normalized-line:3817 |
| A-SUP-264 | BULLET | 広告クリエイティブ管理 | normalized-line:3818 |
| A-SUP-265 | BULLET | 広告予算管理 | normalized-line:3819 |
| A-SUP-266 | BULLET | 日予算管理 | normalized-line:3820 |
| A-SUP-267 | BULLET | 月予算管理 | normalized-line:3821 |
| A-SUP-268 | BULLET | 予算消化率 | normalized-line:3822 |
| A-SUP-269 | BULLET | 残予算 | normalized-line:3823 |
| A-SUP-270 | BULLET | 消化ペース | normalized-line:3824 |
| A-SUP-271 | BULLET | 月末着地見込み | normalized-line:3825 |
| A-SUP-272 | BULLET | CPA | normalized-line:3826 |
| A-SUP-273 | BULLET | ROAS | normalized-line:3827 |
| A-SUP-274 | BULLET | 粗利ROAS | normalized-line:3828 |
| A-SUP-275 | BULLET | CV数 | normalized-line:3829 |
| A-SUP-276 | BULLET | クリック数 | normalized-line:3830 |
| A-SUP-277 | BULLET | 表示回数 | normalized-line:3831 |
| A-SUP-278 | BULLET | CTR | normalized-line:3832 |
| A-SUP-279 | BULLET | CVR | normalized-line:3833 |
| A-SUP-280 | BULLET | 媒体別成果 | normalized-line:3834 |
| A-SUP-281 | BULLET | キャンペーン別成果 | normalized-line:3835 |
| A-SUP-282 | BULLET | 商品別成果 | normalized-line:3836 |
| A-SUP-283 | BULLET | 店舗別成果 | normalized-line:3837 |
| A-SUP-284 | BULLET | 広告改善提案 | normalized-line:3838 |
| A-SUP-285 | BULLET | 予算増減提案 | normalized-line:3839 |
| A-SUP-286 | BULLET | 配信停止提案 | normalized-line:3840 |
| A-SUP-287 | BULLET | クリエイティブ改善提案 | normalized-line:3841 |
| A-SUP-288 | BULLET | LP改善提案 | normalized-line:3842 |
| A-SUP-289 | BULLET | ターゲティング改善提案 | normalized-line:3843 |
| A-SUP-290 | BULLET | 異常検知 | normalized-line:3844 |
| A-SUP-291 | BULLET | CPA悪化アラート | normalized-line:3845 |
| A-SUP-292 | BULLET | CV急減アラート | normalized-line:3846 |
| A-SUP-293 | BULLET | 予算超過アラート | normalized-line:3847 |
| A-SUP-294 | BULLET | API障害検知 | normalized-line:3848 |
| A-SUP-295 | BULLET | CSV fallback | normalized-line:3849 |
| A-SUP-296 | TEXT | SNS / LINE / メール / DM系 | normalized-line:3850 |
| A-SUP-297 | BULLET | SNS投稿管理 | normalized-line:3851 |
| A-SUP-298 | BULLET | SNS投稿予約 | normalized-line:3852 |
| A-SUP-299 | BULLET | SNS分析 | normalized-line:3853 |
| A-SUP-300 | BULLET | Instagram連携 | normalized-line:3854 |
| A-SUP-301 | BULLET | X連携 | normalized-line:3855 |
| A-SUP-302 | BULLET | YouTube連携 | normalized-line:3856 |
| A-SUP-303 | BULLET | TikTok連携 | normalized-line:3857 |
| A-SUP-304 | BULLET | LINE連携 | normalized-line:3858 |
| A-SUP-305 | BULLET | LINE登録数管理 | normalized-line:3859 |
| A-SUP-306 | BULLET | LINE配信案作成 | normalized-line:3860 |
| A-SUP-307 | BULLET | メール配信案作成 | normalized-line:3861 |
| A-SUP-308 | BULLET | DM文面案作成 | normalized-line:3862 |
| A-SUP-309 | BULLET | ステップ配信設計 | normalized-line:3863 |
| A-SUP-310 | BULLET | セグメント配信 | normalized-line:3864 |
| A-SUP-311 | BULLET | 配信承認 | normalized-line:3865 |
| A-SUP-312 | BULLET | 配信履歴 | normalized-line:3866 |
| A-SUP-313 | BULLET | 配信効果測定 | normalized-line:3867 |
| A-SUP-314 | BULLET | SNS反応と売上の接続 | normalized-line:3868 |
| A-SUP-315 | BULLET | LINE登録とLTVの接続 | normalized-line:3869 |
| A-SUP-316 | BULLET | DM・メール・LINEの同意管理 | normalized-line:3870 |
| A-SUP-317 | TEXT | ただし、初期MVPではLINE完全自動配信、DM大量自動送信、AIによる無承認LINE送信、無承認SNS投稿は対象外とされています。 | normalized-line:3871 |
| A-SUP-318 | TEXT | 1. SEO / PR / コンテンツマーケティング系 | normalized-line:3873 |
| A-SUP-319 | TEXT | 組み込む機能 | normalized-line:3874 |
| A-SUP-320 | BULLET | SEO記事管理 | normalized-line:3875 |
| A-SUP-321 | BULLET | SEOキーワード管理 | normalized-line:3876 |
| A-SUP-322 | BULLET | SEO流入管理 | normalized-line:3877 |
| A-SUP-323 | BULLET | 記事別CV管理 | normalized-line:3878 |
| A-SUP-324 | BULLET | 記事別商談化率 | normalized-line:3879 |
| A-SUP-325 | BULLET | 記事別売上貢献 | normalized-line:3880 |
| A-SUP-326 | BULLET | 記事別粗利貢献 | normalized-line:3881 |
| A-SUP-327 | BULLET | LP管理 | normalized-line:3882 |
| A-SUP-328 | BULLET | LP別CV | normalized-line:3883 |
| A-SUP-329 | BULLET | LP別売上 | normalized-line:3884 |
| A-SUP-330 | BULLET | LP改善提案 | normalized-line:3885 |
| A-SUP-331 | BULLET | PRネタ管理 | normalized-line:3886 |
| A-SUP-332 | BULLET | プレスリリース下書き | normalized-line:3887 |
| A-SUP-333 | BULLET | PR配信候補 | normalized-line:3888 |
| A-SUP-334 | BULLET | メディアリスト | normalized-line:3889 |
| A-SUP-335 | BULLET | 掲載実績管理 | normalized-line:3890 |
| A-SUP-336 | BULLET | PR経由問い合わせ管理 | normalized-line:3891 |
| A-SUP-337 | BULLET | PR経由売上管理 | normalized-line:3892 |
| A-SUP-338 | BULLET | 導入事例管理 | normalized-line:3893 |
| A-SUP-339 | BULLET | お客様の声管理 | normalized-line:3894 |
| A-SUP-340 | BULLET | 事例掲載同意管理 | normalized-line:3895 |
| A-SUP-341 | BULLET | 成果数値公開同意管理 | normalized-line:3896 |
| A-SUP-342 | BULLET | 社長ブランディング支援 | normalized-line:3897 |
| A-SUP-343 | BULLET | 代表者の実績発信支援 | normalized-line:3898 |
| A-SUP-344 | BULLET | 採用広報支援 | normalized-line:3899 |
| A-SUP-345 | BULLET | オウンドメディア管理 | normalized-line:3900 |
| A-SUP-346 | BULLET | コンテンツカレンダー | normalized-line:3901 |
| A-SUP-347 | BULLET | AI記事構成案 | normalized-line:3902 |
| A-SUP-348 | BULLET | AI投稿案 | normalized-line:3903 |
| A-SUP-349 | BULLET | ただし虚偽口コミ・なりすましレビュー・ステマ量産は不可 | normalized-line:3904 |
| A-SUP-350 | TEXT | Compliance Guard対象 | normalized-line:3905 |
| A-SUP-351 | BULLET | ステルスマーケティング | normalized-line:3906 |
| A-SUP-352 | BULLET | PR表記漏れ | normalized-line:3907 |
| A-SUP-353 | BULLET | 広告表記漏れ | normalized-line:3908 |
| A-SUP-354 | BULLET | アフィリエイト開示漏れ | normalized-line:3909 |
| A-SUP-355 | BULLET | 虚偽口コミ | normalized-line:3910 |
| A-SUP-356 | BULLET | なりすましレビュー | normalized-line:3911 |
| A-SUP-357 | BULLET | 根拠なしNo.1表記 | normalized-line:3912 |
| A-SUP-358 | BULLET | 根拠なし業界初表記 | normalized-line:3913 |
| A-SUP-359 | BULLET | 根拠なし成果数値 | normalized-line:3914 |
| A-SUP-360 | BULLET | 顧客許諾なし導入事例 | normalized-line:3915 |
| A-SUP-361 | BULLET | 医療・金融・法律・税務・労務表現リスク | normalized-line:3916 |
| A-SUP-362 | BULLET | 個人情報外部共有 | normalized-line:3917 |
| A-SUP-363 | BULLET | 無承認外部送信 | normalized-line:3918 |
| A-SUP-364 | BULLET | SEOスパム | normalized-line:3919 |
| A-SUP-365 | BULLET | 広告審査リスク | normalized-line:3920 |
| A-SUP-366 | BULLET | 媒体規約違反リスク | normalized-line:3921 |
| A-SUP-367 | TEXT | この種のリスク検知は資料上でもCompliance Guardの対象として定義されています。 | normalized-line:3922 |
| A-SUP-368 | TEXT | 1. Referral / Affiliate / Creator Growth / Business Network系 | normalized-line:3924 |
| A-SUP-369 | TEXT | これは、あなたがかなり重視していた広告費ゼロ成長・紹介経済圏・クリエイター経済圏の領域です。 | normalized-line:3925 |
| A-SUP-370 | TEXT | 組み込む機能 | normalized-line:3926 |
| A-SUP-371 | BULLET | 紹介者管理 | normalized-line:3927 |
| A-SUP-372 | BULLET | 紹介コード管理 | normalized-line:3928 |
| A-SUP-373 | BULLET | 紹介リンク管理 | normalized-line:3929 |
| A-SUP-374 | BULLET | 紹介経由CV | normalized-line:3930 |
| A-SUP-375 | BULLET | 紹介経由商談 | normalized-line:3931 |
| A-SUP-376 | BULLET | 紹介経由契約 | normalized-line:3932 |
| A-SUP-377 | BULLET | 紹介経由売上 | normalized-line:3933 |
| A-SUP-378 | BULLET | 紹介経由粗利 | normalized-line:3934 |
| A-SUP-379 | BULLET | 紹介経由LTV | normalized-line:3935 |
| A-SUP-380 | BULLET | 紹介者別契約率 | normalized-line:3936 |
| A-SUP-381 | BULLET | 紹介者別成果 | normalized-line:3937 |
| A-SUP-382 | BULLET | 紹介報酬候補 | normalized-line:3938 |
| A-SUP-383 | BULLET | アフィリエイト管理 | normalized-line:3939 |
| A-SUP-384 | BULLET | クリエイター管理 | normalized-line:3940 |
| A-SUP-385 | BULLET | クリエイター別成果 | normalized-line:3941 |
| A-SUP-386 | BULLET | クリエイター用ダッシュボード | normalized-line:3942 |
| A-SUP-387 | BULLET | 成果承認 | normalized-line:3943 |
| A-SUP-388 | BULLET | 成果報酬候補計算 | normalized-line:3944 |
| A-SUP-389 | BULLET | 報酬支払候補 | normalized-line:3945 |
| A-SUP-390 | BULLET | 金銭アフィリエイト精算 | normalized-line:3946 |
| A-SUP-391 | BULLET | Business Network | normalized-line:3947 |
| A-SUP-392 | BULLET | 企業間紹介 | normalized-line:3948 |
| A-SUP-393 | BULLET | パートナー企業管理 | normalized-line:3949 |
| A-SUP-394 | BULLET | 代理店ではない紹介ネットワーク | normalized-line:3950 |
| A-SUP-395 | BULLET | 口コミ・事例・紹介の合法運用 | normalized-line:3951 |
| A-SUP-396 | BULLET | インセンティブ開示管理 | normalized-line:3952 |
| A-SUP-397 | BULLET | アフィリエイト表記漏れ防止 | normalized-line:3953 |
| A-SUP-398 | BULLET | リード共有同意 | normalized-line:3954 |
| A-SUP-399 | BULLET | Business Network共有同意 | normalized-line:3955 |
| A-SUP-400 | TEXT | 資料上でも、Consent Managementの対象には紹介者・Creatorへのリード共有同意、導入事例掲載同意、成果数値公開同意、PR掲載同意、Business Network共有同意などが含まれています。 | normalized-line:3956 |
| A-SUP-401 | TEXT | 1. PLUG型：価格比較・EC横断・最安値通知・アフィリエイト購買導線 | normalized-line:3958 |
| A-SUP-402 | TEXT | これはあなたが画像付きで話していた、PLUGのようなブラウザ拡張 / EC横断 / アフィリエイト導線です。 | normalized-line:3959 |
| A-SUP-403 | TEXT | 369に組み込む場合の機能 | normalized-line:3960 |
| A-SUP-404 | BULLET | ECサイト横断価格比較 | normalized-line:3961 |
| A-SUP-405 | BULLET | 最安値検出 | normalized-line:3962 |
| A-SUP-406 | BULLET | 送料込み総額比較 | normalized-line:3963 |
| A-SUP-407 | BULLET | ポイント還元込み比較 | normalized-line:3964 |
| A-SUP-408 | BULLET | クーポン自動検出 | normalized-line:3965 |
| A-SUP-409 | BULLET | クーポン適用候補 | normalized-line:3966 |
| A-SUP-410 | BULLET | 購入先レコメンド | normalized-line:3967 |
| A-SUP-411 | BULLET | 商品ページ上での価格表示 | normalized-line:3968 |
| A-SUP-412 | BULLET | 類似商品の価格比較 | normalized-line:3969 |
| A-SUP-413 | BULLET | 代替商品の提案 | normalized-line:3970 |
| A-SUP-414 | BULLET | 価格履歴 | normalized-line:3971 |
| A-SUP-415 | BULLET | 値下がり通知 | normalized-line:3972 |
| A-SUP-416 | BULLET | 在庫通知 | normalized-line:3973 |
| A-SUP-417 | BULLET | 購入導線 | normalized-line:3974 |
| A-SUP-418 | BULLET | アフィリエイトリンク生成 | normalized-line:3975 |
| A-SUP-419 | BULLET | 成果計測 | normalized-line:3976 |
| A-SUP-420 | BULLET | クリック計測 | normalized-line:3977 |
| A-SUP-421 | BULLET | CV計測 | normalized-line:3978 |
| A-SUP-422 | BULLET | 報酬候補 | normalized-line:3979 |
| A-SUP-423 | BULLET | ECサイト別成果 | normalized-line:3980 |
| A-SUP-424 | BULLET | 従業員向け福利厚生的利用 | normalized-line:3981 |
| A-SUP-425 | BULLET | 企業導入先の従業員にも普及する導線 | normalized-line:3982 |
| A-SUP-426 | BULLET | 社内購買のコスト削減 | normalized-line:3983 |
| A-SUP-427 | BULLET | 備品購入の最安値化 | normalized-line:3984 |
| A-SUP-428 | BULLET | 経費削減レポート | normalized-line:3985 |
| A-SUP-429 | BULLET | 企業内購買ルールとの連携 | normalized-line:3986 |
| A-SUP-430 | BULLET | 購買承認フロー | normalized-line:3987 |
| A-SUP-431 | BULLET | 不正購入防止 | normalized-line:3988 |
| A-SUP-432 | BULLET | 購入履歴連携 | normalized-line:3989 |
| A-SUP-433 | BULLET | 会計・経費精算連携 | normalized-line:3990 |
| A-SUP-434 | TEXT | 369における意味 | normalized-line:3991 |
| A-SUP-435 | TEXT | これは単なるアフィリエイト機能ではなく、企業OSの中に「購買最適化」と「成果報酬経済圏」を入れる入口です。 | normalized-line:3992 |
| A-SUP-436 | TEXT | 特に強いのは、導入企業の従業員にも自然に広がる可能性があることです。 | normalized-line:3993 |
| A-SUP-437 | TEXT | 企業が369を導入する → 従業員もブラウザ拡張・購買補助を使う → EC横断の購買データ・節約成果・アフィリエイト成果が発生する → 369経済圏が広がる、という導線になります。 | normalized-line:3994 |
| A-SUP-438 | TEXT | 1. EC / POS / 予約 / 受発注 / 在庫系 | normalized-line:3996 |
| A-SUP-439 | TEXT | ここは、Shopify、BASE、スマレジ、POS、予約SaaS、受発注SaaS、在庫管理SaaSのような領域です。 | normalized-line:3997 |
| A-SUP-440 | TEXT | EC機能 | normalized-line:3998 |
| A-SUP-441 | BULLET | 商品管理 | normalized-line:3999 |
| A-SUP-442 | BULLET | 商品カテゴリ | normalized-line:4000 |
| A-SUP-443 | BULLET | 商品ページ | normalized-line:4001 |
| A-SUP-444 | BULLET | 商品画像管理 | normalized-line:4002 |
| A-SUP-445 | BULLET | 商品説明AI生成 | normalized-line:4003 |
| A-SUP-446 | BULLET | 価格管理 | normalized-line:4004 |
| A-SUP-447 | BULLET | セール価格管理 | normalized-line:4005 |
| A-SUP-448 | BULLET | クーポン管理 | normalized-line:4006 |
| A-SUP-449 | BULLET | カート | normalized-line:4007 |
| A-SUP-450 | BULLET | 注文管理 | normalized-line:4008 |
| A-SUP-451 | BULLET | 決済連携 | normalized-line:4009 |
| A-SUP-452 | BULLET | 配送管理 | normalized-line:4010 |
| A-SUP-453 | BULLET | 返品管理 | normalized-line:4011 |
| A-SUP-454 | BULLET | キャンセル管理 | normalized-line:4012 |
| A-SUP-455 | BULLET | レビュー管理 | normalized-line:4013 |
| A-SUP-456 | BULLET | 購入履歴 | normalized-line:4014 |
| A-SUP-457 | BULLET | 顧客別購入履歴 | normalized-line:4015 |
| A-SUP-458 | BULLET | 商品別売上 | normalized-line:4016 |
| A-SUP-459 | BULLET | 商品別粗利 | normalized-line:4017 |
| A-SUP-460 | BULLET | 商品別LTV | normalized-line:4018 |
| A-SUP-461 | BULLET | EC流入元分析 | normalized-line:4019 |
| A-SUP-462 | BULLET | 広告別EC売上 | normalized-line:4020 |
| A-SUP-463 | BULLET | SEO記事別EC売上 | normalized-line:4021 |
| A-SUP-464 | BULLET | LINE別EC売上 | normalized-line:4022 |
| A-SUP-465 | BULLET | 紹介別EC売上 | normalized-line:4023 |
| A-SUP-466 | TEXT | POS機能 | normalized-line:4024 |
| A-SUP-467 | BULLET | 店舗管理 | normalized-line:4025 |
| A-SUP-468 | BULLET | レジ売上 | normalized-line:4026 |
| A-SUP-469 | BULLET | 店舗別売上 | normalized-line:4027 |
| A-SUP-470 | BULLET | 店舗別粗利 | normalized-line:4028 |
| A-SUP-471 | BULLET | 商品別売上 | normalized-line:4029 |
| A-SUP-472 | BULLET | 商品別在庫 | normalized-line:4030 |
| A-SUP-473 | BULLET | 店舗別在庫 | normalized-line:4031 |
| A-SUP-474 | BULLET | レジ締め | normalized-line:4032 |
| A-SUP-475 | BULLET | 日次売上 | normalized-line:4033 |
| A-SUP-476 | BULLET | スタッフ別売上 | normalized-line:4034 |
| A-SUP-477 | BULLET | POSデータ取込 | normalized-line:4035 |
| A-SUP-478 | BULLET | オフライン売上と広告施策の紐付け | normalized-line:4036 |
| A-SUP-479 | TEXT | 予約機能 | normalized-line:4037 |
| A-SUP-480 | BULLET | 予約枠管理 | normalized-line:4038 |
| A-SUP-481 | BULLET | カレンダー予約 | normalized-line:4039 |
| A-SUP-482 | BULLET | スタッフ別予約 | normalized-line:4040 |
| A-SUP-483 | BULLET | 店舗別予約 | normalized-line:4041 |
| A-SUP-484 | BULLET | サービス別予約 | normalized-line:4042 |
| A-SUP-485 | BULLET | キャンセル管理 | normalized-line:4043 |
| A-SUP-486 | BULLET | 予約リマインド | normalized-line:4044 |
| A-SUP-487 | BULLET | 予約経路分析 | normalized-line:4045 |
| A-SUP-488 | BULLET | LINE予約 | normalized-line:4046 |
| A-SUP-489 | BULLET | Web予約 | normalized-line:4047 |
| A-SUP-490 | BULLET | 広告経由予約 | normalized-line:4048 |
| A-SUP-491 | BULLET | 予約から来店 | normalized-line:4049 |
| A-SUP-492 | BULLET | 来店から購入 | normalized-line:4050 |
| A-SUP-493 | BULLET | 来店からLTV | normalized-line:4051 |
| A-SUP-494 | TEXT | 受発注・在庫機能 | normalized-line:4052 |
| A-SUP-495 | BULLET | 受注管理 | normalized-line:4053 |
| A-SUP-496 | BULLET | 発注管理 | normalized-line:4054 |
| A-SUP-497 | BULLET | 仕入先管理 | normalized-line:4055 |
| A-SUP-498 | BULLET | 仕入価格管理 | normalized-line:4056 |
| A-SUP-499 | BULLET | 在庫管理 | normalized-line:4057 |
| A-SUP-500 | BULLET | 倉庫管理 | normalized-line:4058 |
| A-SUP-501 | BULLET | 入庫 | normalized-line:4059 |
| A-SUP-502 | BULLET | 出庫 | normalized-line:4060 |
| A-SUP-503 | BULLET | 棚卸 | normalized-line:4061 |
| A-SUP-504 | BULLET | 欠品アラート | normalized-line:4062 |
| A-SUP-505 | BULLET | 過剰在庫アラート | normalized-line:4063 |
| A-SUP-506 | BULLET | 発注点管理 | normalized-line:4064 |
| A-SUP-507 | BULLET | 自動発注候補 | normalized-line:4065 |
| A-SUP-508 | BULLET | 原価管理 | normalized-line:4066 |
| A-SUP-509 | BULLET | 粗利管理 | normalized-line:4067 |
| A-SUP-510 | BULLET | 取引先別発注履歴 | normalized-line:4068 |
| A-SUP-511 | BULLET | 商品別回転率 | normalized-line:4069 |
| A-SUP-512 | BULLET | 需要予測 | normalized-line:4070 |
| A-SUP-513 | BULLET | ただし発注確定は承認制 | normalized-line:4071 |
| A-SUP-514 | TEXT | 1. ERP / Oracle的な基幹業務機能 | normalized-line:4073 |
| A-SUP-515 | TEXT | ここは、中小企業から大企業、上場企業まで使える基幹業務OSとして必要な領域です。 | normalized-line:4074 |
| A-SUP-516 | TEXT | 組み込む機能 | normalized-line:4075 |
| A-SUP-517 | BULLET | 会社マスタ | normalized-line:4076 |
| A-SUP-518 | BULLET | 部門管理 | normalized-line:4077 |
| A-SUP-519 | BULLET | 拠点管理 | normalized-line:4078 |
| A-SUP-520 | BULLET | 店舗管理 | normalized-line:4079 |
| A-SUP-521 | BULLET | 権限管理 | normalized-line:4080 |
| A-SUP-522 | BULLET | 勘定科目 | normalized-line:4081 |
| A-SUP-523 | BULLET | 予算管理 | normalized-line:4082 |
| A-SUP-524 | BULLET | 予実管理 | normalized-line:4083 |
| A-SUP-525 | BULLET | 売上管理 | normalized-line:4084 |
| A-SUP-526 | BULLET | 原価管理 | normalized-line:4085 |
| A-SUP-527 | BULLET | 粗利管理 | normalized-line:4086 |
| A-SUP-528 | BULLET | 利益管理 | normalized-line:4087 |
| A-SUP-529 | BULLET | 経費管理 | normalized-line:4088 |
| A-SUP-530 | BULLET | 支払管理 | normalized-line:4089 |
| A-SUP-531 | BULLET | 売掛管理 | normalized-line:4090 |
| A-SUP-532 | BULLET | 買掛管理 | normalized-line:4091 |
| A-SUP-533 | BULLET | 資金繰り | normalized-line:4092 |
| A-SUP-534 | BULLET | キャッシュフロー | normalized-line:4093 |
| A-SUP-535 | BULLET | 月次決算 | normalized-line:4094 |
| A-SUP-536 | BULLET | 年次決算 | normalized-line:4095 |
| A-SUP-537 | BULLET | 管理会計 | normalized-line:4096 |
| A-SUP-538 | BULLET | 部門別PL | normalized-line:4097 |
| A-SUP-539 | BULLET | 店舗別PL | normalized-line:4098 |
| A-SUP-540 | BULLET | 商品別PL | normalized-line:4099 |
| A-SUP-541 | BULLET | 顧客別PL | normalized-line:4100 |
| A-SUP-542 | BULLET | プロジェクト別PL | normalized-line:4101 |
| A-SUP-543 | BULLET | 税務補助 | normalized-line:4102 |
| A-SUP-544 | BULLET | 監査対応 | normalized-line:4103 |
| A-SUP-545 | BULLET | 稟議 | normalized-line:4104 |
| A-SUP-546 | BULLET | ワークフロー | normalized-line:4105 |
| A-SUP-547 | BULLET | 取締役会資料 | normalized-line:4106 |
| A-SUP-548 | BULLET | 経営会議資料 | normalized-line:4107 |
| A-SUP-549 | BULLET | KPI管理 | normalized-line:4108 |
| A-SUP-550 | BULLET | 事業計画 | normalized-line:4109 |
| A-SUP-551 | BULLET | 予算策定 | normalized-line:4110 |
| A-SUP-552 | BULLET | 中期経営計画 | normalized-line:4111 |
| A-SUP-553 | BULLET | 内部統制 | normalized-line:4112 |
| A-SUP-554 | BULLET | J-SOX的な監査証跡 | normalized-line:4113 |
| A-SUP-555 | BULLET | 上場企業向け権限分離 | normalized-line:4114 |
| A-SUP-556 | BULLET | 承認履歴 | normalized-line:4115 |
| A-SUP-557 | BULLET | 証跡保管 | normalized-line:4116 |
| A-SUP-558 | BULLET | データエクスポート | normalized-line:4117 |
| A-SUP-559 | BULLET | データポータビリティ | normalized-line:4118 |
| A-SUP-560 | TEXT | 1. HR / 採用 / 教育 / 労務系 | normalized-line:4120 |
| A-SUP-561 | TEXT | あなたが追加したいと言っていた、採用、教育、コンプライアンスの領域です。 | normalized-line:4121 |
| A-SUP-562 | TEXT | 採用機能 | normalized-line:4122 |
| A-SUP-563 | BULLET | 求人管理 | normalized-line:4123 |
| A-SUP-564 | BULLET | 採用媒体管理 | normalized-line:4124 |
| A-SUP-565 | BULLET | 応募者管理 | normalized-line:4125 |
| A-SUP-566 | BULLET | 候補者ステータス | normalized-line:4126 |
| A-SUP-567 | BULLET | 書類選考管理 | normalized-line:4127 |
| A-SUP-568 | BULLET | 面接日程調整 | normalized-line:4128 |
| A-SUP-569 | BULLET | 面接評価 | normalized-line:4129 |
| A-SUP-570 | BULLET | 採用スコアリング | normalized-line:4130 |
| A-SUP-571 | BULLET | 採用チャネル別成果 | normalized-line:4131 |
| A-SUP-572 | BULLET | 採用単価 | normalized-line:4132 |
| A-SUP-573 | BULLET | 採用CPA | normalized-line:4133 |
| A-SUP-574 | BULLET | 採用広報管理 | normalized-line:4134 |
| A-SUP-575 | BULLET | 採用LP | normalized-line:4135 |
| A-SUP-576 | BULLET | スカウト文面案 | normalized-line:4136 |
| A-SUP-577 | BULLET | 面接質問案 | normalized-line:4137 |
| A-SUP-578 | BULLET | 内定管理 | normalized-line:4138 |
| A-SUP-579 | BULLET | 入社手続き | normalized-line:4139 |
| A-SUP-580 | BULLET | 採用KPIダッシュボード | normalized-line:4140 |
| A-SUP-581 | TEXT | 教育機能 | normalized-line:4141 |
| A-SUP-582 | BULLET | オンボーディング | normalized-line:4142 |
| A-SUP-583 | BULLET | 研修カリキュラム | normalized-line:4143 |
| A-SUP-584 | BULLET | 社内マニュアル | normalized-line:4144 |
| A-SUP-585 | BULLET | 業務手順書 | normalized-line:4145 |
| A-SUP-586 | BULLET | 動画教材管理 | normalized-line:4146 |
| A-SUP-587 | BULLET | テスト・理解度チェック | normalized-line:4147 |
| A-SUP-588 | BULLET | スキルマップ | normalized-line:4148 |
| A-SUP-589 | BULLET | ロール別教育 | normalized-line:4149 |
| A-SUP-590 | BULLET | AIメンター | normalized-line:4150 |
| A-SUP-591 | BULLET | 社内FAQ | normalized-line:4151 |
| A-SUP-592 | BULLET | ナレッジ検索 | normalized-line:4152 |
| A-SUP-593 | BULLET | 業務引き継ぎ | normalized-line:4153 |
| A-SUP-594 | BULLET | 新人教育AI | normalized-line:4154 |
| A-SUP-595 | BULLET | 営業教育AI | normalized-line:4155 |
| A-SUP-596 | BULLET | 管理職教育AI | normalized-line:4156 |
| A-SUP-597 | BULLET | コンプライアンス研修 | normalized-line:4157 |
| A-SUP-598 | TEXT | 労務・評価機能 | normalized-line:4158 |
| A-SUP-599 | BULLET | 従業員管理 | normalized-line:4159 |
| A-SUP-600 | BULLET | 組織図 | normalized-line:4160 |
| A-SUP-601 | BULLET | 勤怠管理 | normalized-line:4161 |
| A-SUP-602 | BULLET | 休暇管理 | normalized-line:4162 |
| A-SUP-603 | BULLET | 評価管理 | normalized-line:4163 |
| A-SUP-604 | BULLET | 目標管理 | normalized-line:4164 |
| A-SUP-605 | BULLET | 1on1管理 | normalized-line:4165 |
| A-SUP-606 | BULLET | 人事異動 | normalized-line:4166 |
| A-SUP-607 | BULLET | 権限付与・剥奪 | normalized-line:4167 |
| A-SUP-608 | BULLET | 退職時アクセス管理 | normalized-line:4168 |
| A-SUP-609 | BULLET | 給与連携 | normalized-line:4169 |
| A-SUP-610 | BULLET | 社内規程管理 | normalized-line:4170 |
| A-SUP-611 | BULLET | ハラスメント相談窓口 | normalized-line:4171 |
| A-SUP-612 | BULLET | 労務リスク検知 | normalized-line:4172 |
| A-SUP-613 | TEXT | 1. AI社員 / AI Agent群 | normalized-line:4174 |
| A-SUP-614 | TEXT | これは369 / IKEZAKI OSの中核です。 | normalized-line:4175 |
| A-SUP-615 | TEXT | 人間の従業員のように、役割ごとのAI社員が動く構想です。 | normalized-line:4176 |
| A-SUP-616 | TEXT | 想定AI社員 | normalized-line:4177 |
| A-SUP-617 | BULLET | AI CEO補佐 | normalized-line:4178 |
| A-SUP-618 | BULLET | AI COO補佐 | normalized-line:4179 |
| A-SUP-619 | BULLET | AI CFO補佐 | normalized-line:4180 |
| A-SUP-620 | BULLET | AI CMO補佐 | normalized-line:4181 |
| A-SUP-621 | BULLET | AI CTO補佐 | normalized-line:4182 |
| A-SUP-622 | BULLET | AI営業担当 | normalized-line:4183 |
| A-SUP-623 | BULLET | AI営業マネージャー | normalized-line:4184 |
| A-SUP-624 | BULLET | AIインサイドセールス | normalized-line:4185 |
| A-SUP-625 | BULLET | AIカスタマーサクセス | normalized-line:4186 |
| A-SUP-626 | BULLET | AI問い合わせ対応 | normalized-line:4187 |
| A-SUP-627 | BULLET | AI広告運用者 | normalized-line:4188 |
| A-SUP-628 | BULLET | AI SNS担当 | normalized-line:4189 |
| A-SUP-629 | BULLET | AI SEO担当 | normalized-line:4190 |
| A-SUP-630 | BULLET | AI PR担当 | normalized-line:4191 |
| A-SUP-631 | BULLET | AI採用担当 | normalized-line:4192 |
| A-SUP-632 | BULLET | AI教育担当 | normalized-line:4193 |
| A-SUP-633 | BULLET | AI経理担当 | normalized-line:4194 |
| A-SUP-634 | BULLET | AI請求担当 | normalized-line:4195 |
| A-SUP-635 | BULLET | AI入金確認担当 | normalized-line:4196 |
| A-SUP-636 | BULLET | AI法務チェック担当 | normalized-line:4197 |
| A-SUP-637 | BULLET | AI契約レビュー担当 | normalized-line:4198 |
| A-SUP-638 | BULLET | AIコンプライアンス担当 | normalized-line:4199 |
| A-SUP-639 | BULLET | AI監査担当 | normalized-line:4200 |
| A-SUP-640 | BULLET | AIプロジェクトマネージャー | normalized-line:4201 |
| A-SUP-641 | BULLET | AI開発PM | normalized-line:4202 |
| A-SUP-642 | BULLET | AIデータアナリスト | normalized-line:4203 |
| A-SUP-643 | BULLET | AI業務改善担当 | normalized-line:4204 |
| A-SUP-644 | BULLET | AI店舗運営担当 | normalized-line:4205 |
| A-SUP-645 | BULLET | AI予約管理担当 | normalized-line:4206 |
| A-SUP-646 | BULLET | AI在庫管理担当 | normalized-line:4207 |
| A-SUP-647 | BULLET | AI購買担当 | normalized-line:4208 |
| A-SUP-648 | BULLET | AI秘書 | normalized-line:4209 |
| A-SUP-649 | BULLET | AI議事録担当 | normalized-line:4210 |
| A-SUP-650 | BULLET | AIナレッジ管理担当 | normalized-line:4211 |
| A-SUP-651 | TEXT | AI社員の共通仕様 | normalized-line:4212 |
| A-SUP-652 | BULLET | 役割定義 | normalized-line:4213 |
| A-SUP-653 | BULLET | 権限定義 | normalized-line:4214 |
| A-SUP-654 | BULLET | 参照可能データ範囲 | normalized-line:4215 |
| A-SUP-655 | BULLET | 実行可能アクション範囲 | normalized-line:4216 |
| A-SUP-656 | BULLET | 承認が必要なアクション | normalized-line:4217 |
| A-SUP-657 | BULLET | 禁止アクション | normalized-line:4218 |
| A-SUP-658 | BULLET | AI Action Status | normalized-line:4219 |
| A-SUP-659 | BULLET | AI提案履歴 | normalized-line:4220 |
| A-SUP-660 | BULLET | AI実行履歴 | normalized-line:4221 |
| A-SUP-661 | BULLET | AI失敗履歴 | normalized-line:4222 |
| A-SUP-662 | BULLET | AIの信頼度 | normalized-line:4223 |
| A-SUP-663 | BULLET | AIの根拠表示 | normalized-line:4224 |
| A-SUP-664 | BULLET | AIのデータ不足表示 | normalized-line:4225 |
| A-SUP-665 | BULLET | 人間への承認依頼 | normalized-line:4226 |
| A-SUP-666 | BULLET | 差し戻し対応 | normalized-line:4227 |
| A-SUP-667 | BULLET | 監査ログ | normalized-line:4228 |
| A-SUP-668 | BULLET | Kill Switch | normalized-line:4229 |
| A-SUP-669 | BULLET | テナント分離 | normalized-line:4230 |
| A-SUP-670 | BULLET | 顧客情報アクセス制御 | normalized-line:4231 |
| A-SUP-671 | BULLET | 外部送信制御 | normalized-line:4232 |
| A-SUP-672 | TEXT | 資料上でも、AI Action Status、Approval Inbox、Execution Queue、AuditLog、Compliance Guard、Provider Health Check、Fallback Modeなどは中核要素として定義されています。 | normalized-line:4233 |
| A-SUP-673 | TEXT | 1. AI社員開発環境 / Plugin開発環境 | normalized-line:4235 |
| A-SUP-674 | TEXT | あなたがかなり明確に話していた重要構想です。 | normalized-line:4236 |
| A-SUP-675 | TEXT | 誰でもAI社員やプラグインを作れる開発環境を用意し、そこで作られたAI社員は369導入が前提。 | normalized-line:4237 |
| A-SUP-676 | TEXT | つまり、AI社員は369のツール・権限・データ・監査ログ・同意管理を使わないと動かない設計にする、という構想です。 | normalized-line:4238 |
| A-SUP-677 | TEXT | 組み込む機能 | normalized-line:4239 |
| A-SUP-678 | BULLET | AI社員テンプレート | normalized-line:4240 |
| A-SUP-679 | BULLET | 業種別テンプレート | normalized-line:4241 |
| A-SUP-680 | BULLET | 職種別テンプレート | normalized-line:4242 |
| A-SUP-681 | BULLET | プロンプトテンプレート | normalized-line:4243 |
| A-SUP-682 | BULLET | ツール接続テンプレート | normalized-line:4244 |
| A-SUP-683 | BULLET | 権限テンプレート | normalized-line:4245 |
| A-SUP-684 | BULLET | 承認フローテンプレート | normalized-line:4246 |
| A-SUP-685 | BULLET | データ参照テンプレート | normalized-line:4247 |
| A-SUP-686 | BULLET | UIテンプレート | normalized-line:4248 |
| A-SUP-687 | BULLET | テスト環境 | normalized-line:4249 |
| A-SUP-688 | BULLET | Sandbox環境 | normalized-line:4250 |
| A-SUP-689 | BULLET | ローカル開発環境 | normalized-line:4251 |
| A-SUP-690 | BULLET | ノーコード/ローコード開発 | normalized-line:4252 |
| A-SUP-691 | BULLET | SDK | normalized-line:4253 |
| A-SUP-692 | BULLET | CLI | normalized-line:4254 |
| A-SUP-693 | BULLET | APIキー管理 | normalized-line:4255 |
| A-SUP-694 | BULLET | Webhook管理 | normalized-line:4256 |
| A-SUP-695 | BULLET | Tool定義 | normalized-line:4257 |
| A-SUP-696 | BULLET | Agent Skill定義 | normalized-line:4258 |
| A-SUP-697 | BULLET | Function Calling定義 | normalized-line:4259 |
| A-SUP-698 | BULLET | テストデータ生成 | normalized-line:4260 |
| A-SUP-699 | BULLET | 権限テスト | normalized-line:4261 |
| A-SUP-700 | BULLET | セキュリティテスト | normalized-line:4262 |
| A-SUP-701 | BULLET | コンプライアンステスト | normalized-line:4263 |
| A-SUP-702 | BULLET | 監査ログテスト | normalized-line:4264 |
| A-SUP-703 | BULLET | 公開前審査 | normalized-line:4265 |
| A-SUP-704 | BULLET | バージョン管理 | normalized-line:4266 |
| A-SUP-705 | BULLET | 配布管理 | normalized-line:4267 |
| A-SUP-706 | BULLET | 課金設定 | normalized-line:4268 |
| A-SUP-707 | BULLET | 利用量計測 | normalized-line:4269 |
| A-SUP-708 | BULLET | 稼働時間計測 | normalized-line:4270 |
| A-SUP-709 | BULLET | エラー率計測 | normalized-line:4271 |
| A-SUP-710 | BULLET | レビュー管理 | normalized-line:4272 |
| A-SUP-711 | BULLET | 開発者ダッシュボード | normalized-line:4273 |
| A-SUP-712 | BULLET | 売上ダッシュボード | normalized-line:4274 |
| A-SUP-713 | BULLET | サポート窓口 | normalized-line:4275 |
| A-SUP-714 | TEXT | 課金モデル | normalized-line:4276 |
| A-SUP-715 | BULLET | 開発環境の一部はサブスクリプション | normalized-line:4277 |
| A-SUP-716 | BULLET | 基本は制作・実行・利用に応じた従量課金 | normalized-line:4278 |
| A-SUP-717 | BULLET | AI社員の稼働時間課金 | normalized-line:4279 |
| A-SUP-718 | BULLET | AI社員のAPI利用量課金 | normalized-line:4280 |
| A-SUP-719 | BULLET | AI社員の成果報酬 | normalized-line:4281 |
| A-SUP-720 | BULLET | 開発者へのレベニューシェア | normalized-line:4282 |
| A-SUP-721 | BULLET | マーケットプレイス販売手数料 | normalized-line:4283 |
| A-SUP-722 | BULLET | 企業側のAI社員利用料 | normalized-line:4284 |
| A-SUP-723 | BULLET | 高度権限・監査・セキュリティ機能の上位プラン | normalized-line:4285 |
| A-SUP-724 | TEXT | 1. AI社員マーケットプレイス / 経済圏 | normalized-line:4287 |
| A-SUP-725 | TEXT | ここは「経済圏を作る側になりたい」「インフラになりたい」と話していた中核です。 | normalized-line:4288 |
| A-SUP-726 | TEXT | 組み込む機能 | normalized-line:4289 |
| A-SUP-727 | BULLET | AI社員ストア | normalized-line:4290 |
| A-SUP-728 | BULLET | プラグインストア | normalized-line:4291 |
| A-SUP-729 | BULLET | 業界別AI社員一覧 | normalized-line:4292 |
| A-SUP-730 | BULLET | 職種別AI社員一覧 | normalized-line:4293 |
| A-SUP-731 | BULLET | 人気ランキング | normalized-line:4294 |
| A-SUP-732 | BULLET | 導入実績 | normalized-line:4295 |
| A-SUP-733 | BULLET | レビュー | normalized-line:4296 |
| A-SUP-734 | BULLET | 評価 | normalized-line:4297 |
| A-SUP-735 | BULLET | 認証済みバッジ | normalized-line:4298 |
| A-SUP-736 | BULLET | セキュリティ審査済みバッジ | normalized-line:4299 |
| A-SUP-737 | BULLET | 公式AI社員 | normalized-line:4300 |
| A-SUP-738 | BULLET | サードパーティAI社員 | normalized-line:4301 |
| A-SUP-739 | BULLET | 企業専用AI社員 | normalized-line:4302 |
| A-SUP-740 | BULLET | ホワイトラベルAI社員 | normalized-line:4303 |
| A-SUP-741 | BULLET | カスタムAI社員 | normalized-line:4304 |
| A-SUP-742 | BULLET | AI社員の購入 | normalized-line:4305 |
| A-SUP-743 | BULLET | AI社員のサブスク | normalized-line:4306 |
| A-SUP-744 | BULLET | AI社員の従量課金 | normalized-line:4307 |
| A-SUP-745 | BULLET | AI社員の成果報酬 | normalized-line:4308 |
| A-SUP-746 | BULLET | 無料トライアル | normalized-line:4309 |
| A-SUP-747 | BULLET | 利用制限 | normalized-line:4310 |
| A-SUP-748 | BULLET | 権限範囲表示 | normalized-line:4311 |
| A-SUP-749 | BULLET | 利用データ範囲表示 | normalized-line:4312 |
| A-SUP-750 | BULLET | 導入前プレビュー | normalized-line:4313 |
| A-SUP-751 | BULLET | 導入後モニタリング | normalized-line:4314 |
| A-SUP-752 | BULLET | 開発者収益管理 | normalized-line:4315 |
| A-SUP-753 | BULLET | レベニューシェア | normalized-line:4316 |
| A-SUP-754 | BULLET | 返金管理 | normalized-line:4317 |
| A-SUP-755 | BULLET | 不正AI社員の停止 | normalized-line:4318 |
| A-SUP-756 | BULLET | Kill Switch | normalized-line:4319 |
| A-SUP-757 | BULLET | マーケットプレイス審査 | normalized-line:4320 |
| A-SUP-758 | BULLET | 規約違反検知 | normalized-line:4321 |
| A-SUP-759 | BULLET | セキュリティ事故対応 | normalized-line:4322 |
| A-SUP-760 | BULLET | バージョンアップ配信 | normalized-line:4323 |
| A-SUP-761 | BULLET | 互換性管理 | normalized-line:4324 |
| A-SUP-762 | BULLET | 369本体アップデートとの互換性確認 | normalized-line:4325 |
| A-SUP-763 | TEXT | 参入障壁になる理由 | normalized-line:4326 |
| A-SUP-764 | BULLET | AI社員が369上でしか動かない | normalized-line:4327 |
| A-SUP-765 | BULLET | データ・権限・監査ログ・承認フローが369に依存する | normalized-line:4328 |
| A-SUP-766 | BULLET | 開発者が369向けにAI社員を作るほど、エコシステムが強くなる | normalized-line:4329 |
| A-SUP-767 | BULLET | 企業がAI社員を導入するほど、369から離れにくくなる | normalized-line:4330 |
| A-SUP-768 | BULLET | ただし「悪いロックイン」ではなく、データエクスポート・API公開・監査ログ出力・解約時データ返却を前提にした価値蓄積型ロックインにする方針が資料にもあります。 | normalized-line:4331 |
| A-SUP-769 | TEXT | 1. Developer Platform / 外部連携 / Embedded化 | normalized-line:4333 |
| A-SUP-770 | TEXT | これは、369を自社サービスだけでなく他社OSや業界特化SaaSにも組み込めるインフラにするための機能です。 | normalized-line:4334 |
| A-SUP-771 | TEXT | 資料上でも、将来的な対象として他社B2B OS、他社B2C OS、CRM、予約システム、POS、EC、業界特化SaaS、フランチャイズ管理、士業向け顧問先管理、学校向けOS、医療・整骨院・美容・飲食向けOS、広告代理店向け管理OSが列挙されています。提供方式もAPI、Webhook、SDK、iframe、Web Component、Embedded Dashboard、White-label Dashboard、OAuth / SSO、外部IDマッピングが想定されています。 | normalized-line:4335 |
| A-SUP-772 | TEXT | 組み込む機能 | normalized-line:4336 |
| A-SUP-773 | BULLET | API | normalized-line:4337 |
| A-SUP-774 | BULLET | Webhook | normalized-line:4338 |
| A-SUP-775 | BULLET | SDK | normalized-line:4339 |
| A-SUP-776 | BULLET | iframe埋め込み | normalized-line:4340 |
| A-SUP-777 | BULLET | Web Component | normalized-line:4341 |
| A-SUP-778 | BULLET | Embedded Dashboard | normalized-line:4342 |
| A-SUP-779 | BULLET | White-label Dashboard | normalized-line:4343 |
| A-SUP-780 | BULLET | OAuth | normalized-line:4344 |
| A-SUP-781 | BULLET | SSO | normalized-line:4345 |
| A-SUP-782 | BULLET | 外部IDマッピング | normalized-line:4346 |
| A-SUP-783 | BULLET | CSV Adapter | normalized-line:4347 |
| A-SUP-784 | BULLET | Webhook Adapter | normalized-line:4348 |
| A-SUP-785 | BULLET | Google Sheets Adapter | normalized-line:4349 |
| A-SUP-786 | BULLET | External CRM Adapter | normalized-line:4350 |
| A-SUP-787 | BULLET | POS Adapter | normalized-line:4351 |
| A-SUP-788 | BULLET | Reservation Adapter | normalized-line:4352 |
| A-SUP-789 | BULLET | EC Adapter | normalized-line:4353 |
| A-SUP-790 | BULLET | LINE Adapter | normalized-line:4354 |
| A-SUP-791 | BULLET | Meta Ads Adapter | normalized-line:4355 |
| A-SUP-792 | BULLET | Google Ads Adapter | normalized-line:4356 |
| A-SUP-793 | BULLET | YouTube Adapter | normalized-line:4357 |
| A-SUP-794 | BULLET | X Adapter | normalized-line:4358 |
| A-SUP-795 | BULLET | Instagram Adapter | normalized-line:4359 |
| A-SUP-796 | BULLET | SEO Adapter | normalized-line:4360 |
| A-SUP-797 | BULLET | PR Adapter | normalized-line:4361 |
| A-SUP-798 | BULLET | Business Network Adapter | normalized-line:4362 |
| A-SUP-799 | BULLET | Adapter Versioning | normalized-line:4363 |
| A-SUP-800 | BULLET | Provider Health Check | normalized-line:4364 |
| A-SUP-801 | BULLET | Contract Test | normalized-line:4365 |
| A-SUP-802 | BULLET | Fallback Mode | normalized-line:4366 |
| A-SUP-803 | BULLET | Data Portability | normalized-line:4367 |
| A-SUP-804 | BULLET | Export API | normalized-line:4368 |
| A-SUP-805 | BULLET | Integration Hub | normalized-line:4369 |
| A-SUP-806 | TEXT | 1. Dashboard / BI / 経営分析 | normalized-line:4371 |
| A-SUP-807 | TEXT | ここは、経営者・現場・クライアントが見る画面です。 | normalized-line:4372 |
| A-SUP-808 | TEXT | 組み込む機能 | normalized-line:4373 |
| A-SUP-809 | BULLET | 経営ダッシュボード | normalized-line:4374 |
| A-SUP-810 | BULLET | Growth Dashboard | normalized-line:4375 |
| A-SUP-811 | BULLET | Sales Dashboard | normalized-line:4376 |
| A-SUP-812 | BULLET | Finance Dashboard | normalized-line:4377 |
| A-SUP-813 | BULLET | HR Dashboard | normalized-line:4378 |
| A-SUP-814 | BULLET | Marketing Dashboard | normalized-line:4379 |
| A-SUP-815 | BULLET | EC Dashboard | normalized-line:4380 |
| A-SUP-816 | BULLET | Inventory Dashboard | normalized-line:4381 |
| A-SUP-817 | BULLET | Project Dashboard | normalized-line:4382 |
| A-SUP-818 | BULLET | AI社員Dashboard | normalized-line:4383 |
| A-SUP-819 | BULLET | Client Shared Dashboard | normalized-line:4384 |
| A-SUP-820 | BULLET | 代理店向け共有ダッシュボード | normalized-line:4385 |
| A-SUP-821 | BULLET | 予算管理ダッシュボード | normalized-line:4386 |
| A-SUP-822 | BULLET | 媒体別成果 | normalized-line:4387 |
| A-SUP-823 | BULLET | キャンペーン別成果 | normalized-line:4388 |
| A-SUP-824 | BULLET | 月別成果 | normalized-line:4389 |
| A-SUP-825 | BULLET | 顧客別売上 | normalized-line:4390 |
| A-SUP-826 | BULLET | 顧客別粗利 | normalized-line:4391 |
| A-SUP-827 | BULLET | 顧客別LTV | normalized-line:4392 |
| A-SUP-828 | BULLET | 商品別成果 | normalized-line:4393 |
| A-SUP-829 | BULLET | 店舗別成果 | normalized-line:4394 |
| A-SUP-830 | BULLET | 部門別成果 | normalized-line:4395 |
| A-SUP-831 | BULLET | AI提案一覧 | normalized-line:4396 |
| A-SUP-832 | BULLET | 承認待ち一覧 | normalized-line:4397 |
| A-SUP-833 | BULLET | リスク順ソート | normalized-line:4398 |
| A-SUP-834 | BULLET | 信頼度表示 | normalized-line:4399 |
| A-SUP-835 | BULLET | データ不足表示 | normalized-line:4400 |
| A-SUP-836 | BULLET | データ鮮度表示 | normalized-line:4401 |
| A-SUP-837 | BULLET | CSV最終取込日時 | normalized-line:4402 |
| A-SUP-838 | BULLET | API最終同期日時 | normalized-line:4403 |
| A-SUP-839 | BULLET | API取得失敗警告 | normalized-line:4404 |
| A-SUP-840 | BULLET | PDF出力 | normalized-line:4405 |
| A-SUP-841 | BULLET | CSV出力 | normalized-line:4406 |
| A-SUP-842 | BULLET | レポート自動生成 | normalized-line:4407 |
| A-SUP-843 | BULLET | 月次レポート | normalized-line:4408 |
| A-SUP-844 | BULLET | 週次レポート | normalized-line:4409 |
| A-SUP-845 | BULLET | 経営会議レポート | normalized-line:4410 |
| A-SUP-846 | TEXT | 資料上でも、初期MVPの準リアルタイムダッシュボードには、本日広告費、今月広告費、設定予算、予算消化額、予算消化率、残予算、消化ペース、月末着地見込み、媒体別消化率、CV数、CPA、ROAS、粗利ROAS、売上、粗利、データ鮮度、API失敗警告、データ不足警告などが含まれています。 | normalized-line:4411 |
| A-SUP-847 | TEXT | 1. Workflow / Approval / Execution / Audit | normalized-line:4413 |
| A-SUP-848 | TEXT | 369の堅牢性を支える、かなり重要な裏側機能です。 | normalized-line:4414 |
| A-SUP-849 | TEXT | 組み込む機能 | normalized-line:4415 |
| A-SUP-850 | BULLET | Approval Inbox | normalized-line:4416 |
| A-SUP-851 | BULLET | Approval Orchestrator | normalized-line:4417 |
| A-SUP-852 | BULLET | 承認待ち一覧 | normalized-line:4418 |
| A-SUP-853 | BULLET | 承認条件 | normalized-line:4419 |
| A-SUP-854 | BULLET | 承認期限 | normalized-line:4420 |
| A-SUP-855 | BULLET | 承認者 | normalized-line:4421 |
| A-SUP-856 | BULLET | 承認履歴 | normalized-line:4422 |
| A-SUP-857 | BULLET | 差し戻し理由 | normalized-line:4423 |
| A-SUP-858 | BULLET | 高リスク判定 | normalized-line:4424 |
| A-SUP-859 | BULLET | 二重承認 | normalized-line:4425 |
| A-SUP-860 | BULLET | 一括承認可否 | normalized-line:4426 |
| A-SUP-861 | BULLET | 承認疲れ防止 | normalized-line:4427 |
| A-SUP-862 | BULLET | 実行前プレビュー | normalized-line:4428 |
| A-SUP-863 | BULLET | 補償アクション | normalized-line:4429 |
| A-SUP-864 | BULLET | Queue | normalized-line:4430 |
| A-SUP-865 | BULLET | Worker | normalized-line:4431 |
| A-SUP-866 | BULLET | Retry | normalized-line:4432 |
| A-SUP-867 | BULLET | Exponential Backoff | normalized-line:4433 |
| A-SUP-868 | BULLET | Jitter | normalized-line:4434 |
| A-SUP-869 | BULLET | Retry-After尊重 | normalized-line:4435 |
| A-SUP-870 | BULLET | Idempotency Key | normalized-line:4436 |
| A-SUP-871 | BULLET | DLQ | normalized-line:4437 |
| A-SUP-872 | BULLET | Circuit Breaker | normalized-line:4438 |
| A-SUP-873 | BULLET | Kill Switch | normalized-line:4439 |
| A-SUP-874 | BULLET | Fallback Mode | normalized-line:4440 |
| A-SUP-875 | BULLET | Provider Health Check | normalized-line:4441 |
| A-SUP-876 | BULLET | AuditLog | normalized-line:4442 |
| A-SUP-877 | BULLET | Execution Log | normalized-line:4443 |
| A-SUP-878 | BULLET | Compensation Log | normalized-line:4444 |
| A-SUP-879 | BULLET | Security Exception Log | normalized-line:4445 |
| A-SUP-880 | BULLET | Data Access Log | normalized-line:4446 |
| A-SUP-881 | BULLET | AI Action Status | normalized-line:4447 |
| A-SUP-882 | TEXT | 本格導入には、人間承認、二重承認、非同期キュー、DLQ、Idempotency Key、監査ログ、補償アクション、Kill Switch、Fallback Mode、Provider Health Checkが必要と資料にも定義されています。 | normalized-line:4448 |
| A-SUP-883 | TEXT | 1. Security / 権限 / テナント分離 / 監査 | normalized-line:4450 |
| A-SUP-884 | TEXT | 組み込む機能 | normalized-line:4451 |
| A-SUP-885 | BULLET | Tenant分離 | normalized-line:4452 |
| A-SUP-886 | BULLET | RLS | normalized-line:4453 |
| A-SUP-887 | BULLET | RBAC | normalized-line:4454 |
| A-SUP-888 | BULLET | Permission Graph | normalized-line:4455 |
| A-SUP-889 | BULLET | Approval Graph | normalized-line:4456 |
| A-SUP-890 | BULLET | Audit Graph | normalized-line:4457 |
| A-SUP-891 | BULLET | AIロール制限 | normalized-line:4458 |
| A-SUP-892 | BULLET | AIはread-onlyまたは提案のみ | normalized-line:4459 |
| A-SUP-893 | BULLET | 高リスク実行は人間承認 | normalized-line:4460 |
| A-SUP-894 | BULLET | 個人情報外部送信は承認制 | normalized-line:4461 |
| A-SUP-895 | BULLET | 機密ラベル付きデータの外部送信禁止 | normalized-line:4462 |
| A-SUP-896 | BULLET | 監査ログ削除禁止 | normalized-line:4463 |
| A-SUP-897 | BULLET | 承認ログ改ざん防止 | normalized-line:4464 |
| A-SUP-898 | BULLET | AI Kill Switch | normalized-line:4465 |
| A-SUP-899 | BULLET | 他テナント参照のSecurity Exception記録 | normalized-line:4466 |
| A-SUP-900 | BULLET | データアクセス監査 | normalized-line:4467 |
| A-SUP-901 | BULLET | 外部API監査 | normalized-line:4468 |
| A-SUP-902 | BULLET | PII検知 | normalized-line:4469 |
| A-SUP-903 | BULLET | Secret管理 | normalized-line:4470 |
| A-SUP-904 | BULLET | API Key管理 | normalized-line:4471 |
| A-SUP-905 | BULLET | OAuth Scope管理 | normalized-line:4472 |
| A-SUP-906 | BULLET | SSO | normalized-line:4473 |
| A-SUP-907 | BULLET | 2FA | normalized-line:4474 |
| A-SUP-908 | BULLET | IP制限 | normalized-line:4475 |
| A-SUP-909 | BULLET | デバイス管理 | normalized-line:4476 |
| A-SUP-910 | BULLET | 操作ログ | normalized-line:4477 |
| A-SUP-911 | BULLET | データエクスポート履歴 | normalized-line:4478 |
| A-SUP-912 | BULLET | 管理者操作履歴 | normalized-line:4479 |
| A-SUP-913 | BULLET | 退職者アクセス遮断 | normalized-line:4480 |
| A-SUP-914 | BULLET | 権限棚卸し | normalized-line:4481 |
| A-SUP-915 | BULLET | 監査レポート | normalized-line:4482 |
| A-SUP-916 | TEXT | 1. Consent Management / 個人情報 / 同意管理 | normalized-line:4484 |
| A-SUP-917 | TEXT | 組み込む機能 | normalized-line:4485 |
| A-SUP-918 | BULLET | 個人情報利用同意 | normalized-line:4486 |
| A-SUP-919 | BULLET | LINE配信同意 | normalized-line:4487 |
| A-SUP-920 | BULLET | メール配信同意 | normalized-line:4488 |
| A-SUP-921 | BULLET | 広告リターゲティング同意 | normalized-line:4489 |
| A-SUP-922 | BULLET | Cookie同意 | normalized-line:4490 |
| A-SUP-923 | BULLET | 診断フォーム同意 | normalized-line:4491 |
| A-SUP-924 | BULLET | 外部ツール連携同意 | normalized-line:4492 |
| A-SUP-925 | BULLET | 第三者提供同意 | normalized-line:4493 |
| A-SUP-926 | BULLET | 越境移転同意 | normalized-line:4494 |
| A-SUP-927 | BULLET | 紹介者・Creatorへのリード共有同意 | normalized-line:4495 |
| A-SUP-928 | BULLET | 導入事例掲載同意 | normalized-line:4496 |
| A-SUP-929 | BULLET | 成果数値公開同意 | normalized-line:4497 |
| A-SUP-930 | BULLET | PR掲載同意 | normalized-line:4498 |
| A-SUP-931 | BULLET | Business Network共有同意 | normalized-line:4499 |
| A-SUP-932 | BULLET | 同意ステータス管理 | normalized-line:4500 |
| A-SUP-933 | BULLET | 同意文面バージョン管理 | normalized-line:4501 |
| A-SUP-934 | BULLET | 同意撤回 | normalized-line:4502 |
| A-SUP-935 | BULLET | 同意撤回後の外部送信停止 | normalized-line:4503 |
| A-SUP-936 | BULLET | 同意履歴 | normalized-line:4504 |
| A-SUP-937 | BULLET | IP/UAハッシュ | normalized-line:4505 |
| A-SUP-938 | BULLET | Consent Gate | normalized-line:4506 |
| A-SUP-939 | BULLET | Consent違反ブロック | normalized-line:4507 |
| A-SUP-940 | TEXT | 1. Project / Task / 社内業務管理 | normalized-line:4509 |
| A-SUP-941 | TEXT | SalesforceやERPだけでは足りない、日々の業務OS部分です。 | normalized-line:4510 |
| A-SUP-942 | TEXT | 組み込む機能 | normalized-line:4511 |
| A-SUP-943 | BULLET | タスク管理 | normalized-line:4512 |
| A-SUP-944 | BULLET | プロジェクト管理 | normalized-line:4513 |
| A-SUP-945 | BULLET | 担当者管理 | normalized-line:4514 |
| A-SUP-946 | BULLET | 期限管理 | normalized-line:4515 |
| A-SUP-947 | BULLET | 優先度管理 | normalized-line:4516 |
| A-SUP-948 | BULLET | ステータス管理 | normalized-line:4517 |
| A-SUP-949 | BULLET | カンバン | normalized-line:4518 |
| A-SUP-950 | BULLET | ガントチャート | normalized-line:4519 |
| A-SUP-951 | BULLET | 業務フロー | normalized-line:4520 |
| A-SUP-952 | BULLET | 稟議 | normalized-line:4521 |
| A-SUP-953 | BULLET | 承認 | normalized-line:4522 |
| A-SUP-954 | BULLET | コメント | normalized-line:4523 |
| A-SUP-955 | BULLET | メンション | normalized-line:4524 |
| A-SUP-956 | BULLET | 通知 | normalized-line:4525 |
| A-SUP-957 | BULLET | ファイル添付 | normalized-line:4526 |
| A-SUP-958 | BULLET | 議事録 | normalized-line:4527 |
| A-SUP-959 | BULLET | 会議管理 | normalized-line:4528 |
| A-SUP-960 | BULLET | カレンダー | normalized-line:4529 |
| A-SUP-961 | BULLET | リマインダー | normalized-line:4530 |
| A-SUP-962 | BULLET | 社内チャット | normalized-line:4531 |
| A-SUP-963 | BULLET | ナレッジリンク | normalized-line:4532 |
| A-SUP-964 | BULLET | 顧客リンク | normalized-line:4533 |
| A-SUP-965 | BULLET | 商談リンク | normalized-line:4534 |
| A-SUP-966 | BULLET | 契約リンク | normalized-line:4535 |
| A-SUP-967 | BULLET | 請求リンク | normalized-line:4536 |
| A-SUP-968 | BULLET | AIタスク生成 | normalized-line:4537 |
| A-SUP-969 | BULLET | AI進捗要約 | normalized-line:4538 |
| A-SUP-970 | BULLET | AI遅延リスク検知 | normalized-line:4539 |
| A-SUP-971 | BULLET | AI次アクション提案 | normalized-line:4540 |
| A-SUP-972 | TEXT | 1. Company Brain / Obsidian Knowledge / ナレッジ管理 | normalized-line:4542 |
| A-SUP-973 | TEXT | あなたが何度も重視していた、GitHub正本・Obsidian連携・docs管理の領域です。 | normalized-line:4543 |
| A-SUP-974 | TEXT | 組み込む機能 | normalized-line:4544 |
| A-SUP-975 | BULLET | Company Brain | normalized-line:4545 |
| A-SUP-976 | BULLET | 社内ナレッジ | normalized-line:4546 |
| A-SUP-977 | BULLET | 仕様書管理 | normalized-line:4547 |
| A-SUP-978 | BULLET | 議事録管理 | normalized-line:4548 |
| A-SUP-979 | BULLET | 顧客メモ | normalized-line:4549 |
| A-SUP-980 | BULLET | 営業ノウハウ | normalized-line:4550 |
| A-SUP-981 | BULLET | 業務マニュアル | normalized-line:4551 |
| A-SUP-982 | BULLET | 社内FAQ | normalized-line:4552 |
| A-SUP-983 | BULLET | プロンプト管理 | normalized-line:4553 |
| A-SUP-984 | BULLET | Claude Codeプロンプト管理 | normalized-line:4554 |
| A-SUP-985 | BULLET | GitHub正本管理 | normalized-line:4555 |
| A-SUP-986 | BULLET | Obsidian連携 | normalized-line:4556 |
| A-SUP-987 | BULLET | 369-vault | normalized-line:4557 |
| A-SUP-988 | BULLET | docs正本 | normalized-line:4558 |
| A-SUP-989 | BULLET | tasks/CURRENT_STATE | normalized-line:4559 |
| A-SUP-990 | BULLET | tasks/PROGRESS | normalized-line:4560 |
| A-SUP-991 | BULLET | 監査docs | normalized-line:4561 |
| A-SUP-992 | BULLET | ロードマップdocs | normalized-line:4562 |
| A-SUP-993 | BULLET | 意思決定ログ | normalized-line:4563 |
| A-SUP-994 | BULLET | ADR | normalized-line:4564 |
| A-SUP-995 | BULLET | 変更履歴 | normalized-line:4565 |
| A-SUP-996 | BULLET | AIが読める知識構造 | normalized-line:4566 |
| A-SUP-997 | BULLET | 非エンジニア向け進捗説明 | normalized-line:4567 |
| A-SUP-998 | BULLET | Claude Codeへの次回プロンプト生成 | normalized-line:4568 |
| A-SUP-999 | BULLET | Codex監査結果管理 | normalized-line:4569 |
| A-SUP-1000 | BULLET | 仕様と実装の差分管理 | normalized-line:4570 |
| A-SUP-1001 | BULLET | Repo Scout Delta | normalized-line:4571 |
| A-SUP-1002 | BULLET | 実装前リスクレポート | normalized-line:4572 |
| A-SUP-1003 | BULLET | 実装後報告テンプレート | normalized-line:4573 |
| A-SUP-1004 | TEXT | 1. Customer Support / CS / 問い合わせ対応 | normalized-line:4575 |
| A-SUP-1005 | TEXT | 組み込む機能 | normalized-line:4576 |
| A-SUP-1006 | BULLET | 問い合わせ管理 | normalized-line:4577 |
| A-SUP-1007 | BULLET | チケット管理 | normalized-line:4578 |
| A-SUP-1008 | BULLET | ステータス管理 | normalized-line:4579 |
| A-SUP-1009 | BULLET | 優先度管理 | normalized-line:4580 |
| A-SUP-1010 | BULLET | SLA管理 | normalized-line:4581 |
| A-SUP-1011 | BULLET | FAQ連携 | normalized-line:4582 |
| A-SUP-1012 | BULLET | チャット対応 | normalized-line:4583 |
| A-SUP-1013 | BULLET | メール対応 | normalized-line:4584 |
| A-SUP-1014 | BULLET | LINE対応 | normalized-line:4585 |
| A-SUP-1015 | BULLET | 電話メモ | normalized-line:4586 |
| A-SUP-1016 | BULLET | クレーム管理 | normalized-line:4587 |
| A-SUP-1017 | BULLET | 返金相談 | normalized-line:4588 |
| A-SUP-1018 | BULLET | 解約理由管理 | normalized-line:4589 |
| A-SUP-1019 | BULLET | 顧客満足度 | normalized-line:4590 |
| A-SUP-1020 | BULLET | NPS | normalized-line:4591 |
| A-SUP-1021 | BULLET | CSAT | normalized-line:4592 |
| A-SUP-1022 | BULLET | サポート履歴 | normalized-line:4593 |
| A-SUP-1023 | BULLET | AI返信案 | normalized-line:4594 |
| A-SUP-1024 | BULLET | AI要約 | normalized-line:4595 |
| A-SUP-1025 | BULLET | エスカレーション | normalized-line:4596 |
| A-SUP-1026 | BULLET | 担当者割当 | normalized-line:4597 |
| A-SUP-1027 | BULLET | 対応漏れ検知 | normalized-line:4598 |
| A-SUP-1028 | BULLET | 解約予兆検知 | normalized-line:4599 |
| A-SUP-1029 | BULLET | アップセル候補 | normalized-line:4600 |
| A-SUP-1030 | BULLET | 顧客ヘルススコア | normalized-line:4601 |
| A-SUP-1031 | TEXT | 1. 業界特化OS | normalized-line:4603 |
| A-SUP-1032 | TEXT | 将来的には、369を横展開して、業界特化SaaS / 業界特化OSにできます。 | normalized-line:4604 |
| A-SUP-1033 | TEXT | 想定業界 | normalized-line:4605 |
| A-SUP-1034 | BULLET | 広告代理店向けOS | normalized-line:4606 |
| A-SUP-1035 | BULLET | 美容室向けOS | normalized-line:4607 |
| A-SUP-1036 | BULLET | エステ・美容クリニック向けOS | normalized-line:4608 |
| A-SUP-1037 | BULLET | 整骨院・整体院向けOS | normalized-line:4609 |
| A-SUP-1038 | BULLET | 医療機関向けOS | normalized-line:4610 |
| A-SUP-1039 | BULLET | 飲食店向けOS | normalized-line:4611 |
| A-SUP-1040 | BULLET | 小売店向けOS | normalized-line:4612 |
| A-SUP-1041 | BULLET | EC事業者向けOS | normalized-line:4613 |
| A-SUP-1042 | BULLET | 士業向け顧問先管理OS | normalized-line:4614 |
| A-SUP-1043 | BULLET | フランチャイズ管理OS | normalized-line:4615 |
| A-SUP-1044 | BULLET | 学校向けOS | normalized-line:4616 |
| A-SUP-1045 | BULLET | 採用会社向けOS | normalized-line:4617 |
| A-SUP-1046 | BULLET | 不動産会社向けOS | normalized-line:4618 |
| A-SUP-1047 | BULLET | 建設業向けOS | normalized-line:4619 |
| A-SUP-1048 | BULLET | 製造業向けOS | normalized-line:4620 |
| A-SUP-1049 | BULLET | B2B企業向けOS | normalized-line:4621 |
| A-SUP-1050 | BULLET | B2C企業向けOS | normalized-line:4622 |
| A-SUP-1051 | BULLET | クリエイター事務所向けOS | normalized-line:4623 |
| A-SUP-1052 | BULLET | 代理店・紹介者ネットワーク向けOS | normalized-line:4624 |
| A-SUP-1053 | TEXT | 資料でも、他OS組み込み対象として、業界特化SaaS、フランチャイズ管理、士業、学校、医療・整骨院・美容・飲食、広告代理店向け管理OSが列挙されています。 | normalized-line:4625 |
| A-SUP-1054 | TEXT | 1. 課金 / Pricing / Unit Economics | normalized-line:4627 |
| A-SUP-1055 | TEXT | 組み込む収益モデル | normalized-line:4628 |
| A-SUP-1056 | BULLET | 月額サブスクリプション | normalized-line:4629 |
| A-SUP-1057 | BULLET | 企業規模別プラン | normalized-line:4630 |
| A-SUP-1058 | BULLET | ユーザー数課金 | normalized-line:4631 |
| A-SUP-1059 | BULLET | AI社員数課金 | normalized-line:4632 |
| A-SUP-1060 | BULLET | AI社員稼働時間課金 | normalized-line:4633 |
| A-SUP-1061 | BULLET | AI実行回数課金 | normalized-line:4634 |
| A-SUP-1062 | BULLET | API利用量課金 | normalized-line:4635 |
| A-SUP-1063 | BULLET | ストレージ課金 | normalized-line:4636 |
| A-SUP-1064 | BULLET | 外部連携数課金 | normalized-line:4637 |
| A-SUP-1065 | BULLET | 高度監査機能の上位プラン | normalized-line:4638 |
| A-SUP-1066 | BULLET | SSO / 権限管理の上位プラン | normalized-line:4639 |
| A-SUP-1067 | BULLET | White-label料金 | normalized-line:4640 |
| A-SUP-1068 | BULLET | Embedded Dashboard料金 | normalized-line:4641 |
| A-SUP-1069 | BULLET | Developer Platform利用料 | normalized-line:4642 |
| A-SUP-1070 | BULLET | AI社員マーケットプレイス手数料 | normalized-line:4643 |
| A-SUP-1071 | BULLET | プラグイン販売手数料 | normalized-line:4644 |
| A-SUP-1072 | BULLET | 成果報酬 | normalized-line:4645 |
| A-SUP-1073 | BULLET | アフィリエイト報酬 | normalized-line:4646 |
| A-SUP-1074 | BULLET | Referral報酬 | normalized-line:4647 |
| A-SUP-1075 | BULLET | Creator報酬 | normalized-line:4648 |
| A-SUP-1076 | BULLET | PLUG型購買成果報酬 | normalized-line:4649 |
| A-SUP-1077 | BULLET | 導入支援費 | normalized-line:4650 |
| A-SUP-1078 | BULLET | PoC費用 | normalized-line:4651 |
| A-SUP-1079 | BULLET | エンタープライズ個別契約 | normalized-line:4652 |
| A-SUP-1080 | BULLET | SLA付きプラン | normalized-line:4653 |
| A-SUP-1081 | BULLET | 専用環境プラン | normalized-line:4654 |
| A-SUP-1082 | TEXT | 1. 初期MVPでは作らない・営業で言ってはいけないもの | normalized-line:4656 |
| A-SUP-1083 | TEXT | 最終構想は巨大ですが、初期MVPで全部を作るわけではありません。 | normalized-line:4657 |
| A-SUP-1084 | TEXT | 資料上でも、初期MVPでは外部API完全連携、広告完全自動運用、LINE完全自動配信、DM大量自動送信、高度multi-touch attribution、高度LTV予測、金銭アフィリエイト精算、PR外部配信自動化、SEOページ自動公開、Business Network外部通知自動化、個人情報の外部共有自動化、AIによる無承認広告変更、無承認LINE送信、無承認SNS投稿、虚偽口コミ生成、なりすましレビュー生成は対象外です。 | normalized-line:4658 |
| A-SUP-1085 | TEXT | 初期MVPで避けるべきもの | normalized-line:4659 |
| A-SUP-1086 | BULLET | 外部API完全連携 | normalized-line:4660 |
| A-SUP-1087 | BULLET | 広告完全自動運用 | normalized-line:4661 |
| A-SUP-1088 | BULLET | LINE完全自動配信 | normalized-line:4662 |
| A-SUP-1089 | BULLET | DM大量自動送信 | normalized-line:4663 |
| A-SUP-1090 | BULLET | SNS完全自動投稿 | normalized-line:4664 |
| A-SUP-1091 | BULLET | PR外部配信自動化 | normalized-line:4665 |
| A-SUP-1092 | BULLET | SEOページ自動公開 | normalized-line:4666 |
| A-SUP-1093 | BULLET | 金銭アフィリエイト精算 | normalized-line:4667 |
| A-SUP-1094 | BULLET | 請求書正式発行の自動化 | normalized-line:4668 |
| A-SUP-1095 | BULLET | 請求書送付の自動化 | normalized-line:4669 |
| A-SUP-1096 | BULLET | 入金消込確定の自動化 | normalized-line:4670 |
| A-SUP-1097 | BULLET | 会計仕訳確定の自動化 | normalized-line:4671 |
| A-SUP-1098 | BULLET | 税務判断の自動断定 | normalized-line:4672 |
| A-SUP-1099 | BULLET | 契約締結の自動化 | normalized-line:4673 |
| A-SUP-1100 | BULLET | 返金・相殺・値引きの自動確定 | normalized-line:4674 |
| A-SUP-1101 | BULLET | 個人情報の外部共有自動化 | normalized-line:4675 |
| A-SUP-1102 | BULLET | 同意なし外部送信 | normalized-line:4676 |
| A-SUP-1103 | BULLET | 虚偽口コミ | normalized-line:4677 |
| A-SUP-1104 | BULLET | なりすましレビュー | normalized-line:4678 |
| A-SUP-1105 | BULLET | ステマ | normalized-line:4679 |
| A-SUP-1106 | BULLET | 成果保証表現 | normalized-line:4680 |
| A-SUP-1107 | BULLET | 完全リアルタイム保証 | normalized-line:4681 |
| A-SUP-1108 | BULLET | 法的適合の断定 | normalized-line:4682 |
| A-SUP-1109 | TEXT | 1. 最終的な整理：369 / IKEZAKI OSに入れる機能を一言でまとめると | normalized-line:4684 |
| A-SUP-1110 | TEXT | 369 / IKEZAKI OSに組み込もうとしているものは、単なるSaaSの寄せ集めではありません。 | normalized-line:4685 |
| A-SUP-1111 | TEXT | Salesforce的なCRM/SFA、HubSpot的なマーケ・営業支援、Oracle的なERP/会計/基幹業務、Shopify/POS/予約SaaS的な商取引機能、PLUG的な購買・アフィリエイト導線、広告運用SaaS的なAD OS、AI社員、AI社員開発環境、AI社員マーケットプレイス、そしてそれらを安全に動かす承認・監査・権限・同意・コンプライアンス基盤を、1つのAI経営OSとして統合する構想です。 | normalized-line:4686 |
| A-SUP-1112 | TEXT | 特に重要なのは、以下の5つです。 | normalized-line:4687 |
| A-SUP-1113 | TEXT | 2. 企業の正本データを369に集約すること | normalized-line:4688 |
| A-SUP-1114 | TEXT | 顧客、商談、契約、請求、入金、売上、粗利、LTV、在庫、予約、ECを正本化する。 | normalized-line:4689 |
| A-SUP-1115 | TEXT | 3. AD OSで成長施策と売上・粗利・LTVをつなぐこと | normalized-line:4690 |
| A-SUP-1116 | TEXT | 広告、SNS、LINE、SEO、PR、紹介が、どの売上・粗利につながったかを見える化する。 | normalized-line:4691 |
| A-SUP-1117 | TEXT | 4. AI社員に業務を任せるが、危険な確定行為は人間承認にすること | normalized-line:4692 |
| A-SUP-1118 | TEXT | AIは提案・下書き・異常検知・承認依頼まで。請求、会計、外部送信、広告変更などは人間承認必須。 | normalized-line:4693 |
| A-SUP-1119 | TEXT | 5. 開発者がAI社員を作れる経済圏を作ること | normalized-line:4694 |
| A-SUP-1120 | TEXT | 369専用のAI社員開発環境、テンプレート、SDK、マーケットプレイス、従量課金、収益分配を作る。 | normalized-line:4695 |
| A-SUP-1121 | TEXT | 6. 企業にも従業員にも広がる導線を持つこと | normalized-line:4696 |
| A-SUP-1122 | TEXT | PLUG型の購買・最安値・アフィリエイト機能は、導入企業の従業員にも広がる可能性があり、369を“会社だけでなく従業員の日常にも入るOS”にできる。 | normalized-line:4697 |
| A-SUP-1123 | TEXT | 現時点の構想を最も正確に表現するなら、**369 / IKEZAKI OSは「AI社員が働き、開発者がAI社員を作り、企業が業務・成長・会計・顧客・購買を一元管理し、その上に経済圏が生まれるAI事業インフラ」**です。 | normalized-line:4698 |
| A-SUP-1124 | TEXT | あります。前回の機能一覧で横幅はかなり網羅できていますが、369 / IKEZAKI OSを本当に「企業インフラ」「AI社員経済圏」「開発者経済圏」にするなら、追加で必要なのは単体機能よりも、管制塔・信頼・導入・標準化・収益管理・データ品質の領域です。 | normalized-line:4699 |
| A-SUP-1125 | TEXT | すでに現構想では、IKEZAKI OS側が Tenant、Company、User、Employee、Customer、Lead、Deal、Quote、Contract、Invoice、Payment、Accounting、Reservation、Order、Inventory、Revenue、Gross Profit、LTV、Business Event Ledger、Permission Graph、Approval Graph、Audit Graph などの正本を持ち、AD OS / Growth Engine側が MarketingEvent、Campaign、Channel、Creative、AdCost、SNSReaction、LineEvent、SeoEvent、PrEvent、ReferralEvent、Attribution、AIRecommendation、AIAction、ExecutionJob、GrowthAuditLog、ConsentRecord などを持つ設計になっています。 | normalized-line:4700 |
| A-SUP-1126 | TEXT | つまり、追加すべきなのは「CRMやERPをもう一つ足す」ではなく、この巨大な正本群・AI社員群・外部連携群を安全に動かすための上位レイヤーです。 | normalized-line:4701 |
| A-SUP-1127 | TEXT | 結論：369に追加で必要な最重要領域 | normalized-line:4703 |
| A-SUP-1128 | TEXT | 優先度順に言うと、追加すべきなのは以下です。 | normalized-line:4704 |
| A-SUP-1129 | TEXT | 優先度 追加領域 369にとっての意味 | normalized-line:4705 |
| A-SUP-1130 | TEXT | S AI Governance / Agent Control Plane AI社員を安全に管理する司令塔 | normalized-line:4706 |
| A-SUP-1131 | TEXT | S Data Governance / Semantic Layer 企業データをAIが正しく理解する土台 | normalized-line:4707 |
| A-SUP-1132 | TEXT | S Enterprise Admin / Identity / SSO / SCIM 大企業・上場企業導入に必須 | normalized-line:4708 |
| A-SUP-1133 | TEXT | S AI Evaluation / Test / Red Team AI社員の品質保証・暴走防止 | normalized-line:4709 |
| A-SUP-1134 | TEXT | S Trust Center / Compliance Center 導入企業が安心して契約できる信頼基盤 | normalized-line:4710 |
| A-SUP-1135 | TEXT | A Observability / SRE / Status / Incident 本番運用・障害対応・SLA対応 | normalized-line:4711 |
| A-SUP-1136 | TEXT | A Billing / Metering / FinOps AI従量課金・開発者収益分配の心臓 | normalized-line:4712 |
| A-SUP-1137 | TEXT | A Marketplace Governance AI社員・プラグイン経済圏の審査・安全管理 | normalized-line:4713 |
| A-SUP-1138 | TEXT | A Onboarding / Migration / Setup Wizard 営業後の導入成功率を上げる | normalized-line:4714 |
| A-SUP-1139 | TEXT | A Vertical Template Factory 業種別OS化・横展開の量産装置 | normalized-line:4715 |
| A-SUP-1140 | TEXT | A Procurement / ITAM / SaaS Management PLUG型購買・社内SaaS管理との相性が高い | normalized-line:4716 |
| A-SUP-1141 | TEXT | A 369 Academy / Certification 非エンジニア・開発者・導入企業を増やす教育基盤 | normalized-line:4717 |
| A-SUP-1142 | TEXT | B Digital Twin / Business Simulator AIが施策実行前に結果を予測する高度基盤 | normalized-line:4718 |
| A-SUP-1143 | TEXT | B Policy-as-Code / Contract-as-Code 契約・権限・承認・規約を機械実行可能にする | normalized-line:4719 |
| A-SUP-1144 | TEXT | B Ecosystem Analytics マーケットプレイス・AI社員・導入企業の経済圏分析 | normalized-line:4720 |
| A-SUP-1145 | TEXT | B Globalization / Multi-region 将来の海外・大企業対応 | normalized-line:4721 |
| A-SUP-1146 | TEXT | B Physical AI / IoT Gateway 将来のAIロボット・店舗・現場連携 | normalized-line:4722 |
| A-SUP-1147 | TEXT | 1. 最優先：AI Governance / Agent Control Plane | normalized-line:4724 |
| A-SUP-1148 | TEXT | これは、369に最も必要です。 | normalized-line:4725 |
| A-SUP-1149 | TEXT | 369は「AI社員が働くOS」を目指しているので、AI社員が増えれば増えるほど、次の問題が必ず出ます。 | normalized-line:4726 |
| A-SUP-1150 | BULLET | どのAI社員が何をしてよいのか | normalized-line:4727 |
| A-SUP-1151 | BULLET | どのデータを読んでよいのか | normalized-line:4728 |
| A-SUP-1152 | BULLET | どのツールを実行してよいのか | normalized-line:4729 |
| A-SUP-1153 | BULLET | どの行為は人間承認が必要なのか | normalized-line:4730 |
| A-SUP-1154 | BULLET | どの行為は絶対禁止なのか | normalized-line:4731 |
| A-SUP-1155 | BULLET | AI社員がなぜその判断をしたのか | normalized-line:4732 |
| A-SUP-1156 | BULLET | AI社員が失敗したとき誰が責任を持つのか | normalized-line:4733 |
| A-SUP-1157 | BULLET | マーケットプレイス上の外部開発AI社員をどこまで信頼するのか | normalized-line:4734 |
| A-SUP-1158 | TEXT | この管制塔がないと、AI社員経済圏は危険です。 | normalized-line:4735 |
| A-SUP-1159 | TEXT | 入れるべき機能 | normalized-line:4736 |
| A-SUP-1160 | BULLET | AI Agent Registry | normalized-line:4737 |
| A-SUP-1161 | BULLET | AI Employee Registry | normalized-line:4738 |
| A-SUP-1162 | BULLET | Tool Registry | normalized-line:4739 |
| A-SUP-1163 | BULLET | Model Registry | normalized-line:4740 |
| A-SUP-1164 | BULLET | Prompt Registry | normalized-line:4741 |
| A-SUP-1165 | BULLET | Skill Registry | normalized-line:4742 |
| A-SUP-1166 | BULLET | Dataset Registry | normalized-line:4743 |
| A-SUP-1167 | BULLET | External Action Registry | normalized-line:4744 |
| A-SUP-1168 | BULLET | Agent Permission Scope | normalized-line:4745 |
| A-SUP-1169 | BULLET | Agent Risk Tier | normalized-line:4746 |
| A-SUP-1170 | BULLET | Agent Intended Purpose | normalized-line:4747 |
| A-SUP-1171 | BULLET | Agent Owner | normalized-line:4748 |
| A-SUP-1172 | BULLET | Agent Version | normalized-line:4749 |
| A-SUP-1173 | BULLET | Agent Deployment History | normalized-line:4750 |
| A-SUP-1174 | BULLET | Agent Runtime Policy | normalized-line:4751 |
| A-SUP-1175 | BULLET | Agent Cost Limit | normalized-line:4752 |
| A-SUP-1176 | BULLET | Agent Data Access Limit | normalized-line:4753 |
| A-SUP-1177 | BULLET | Agent Execution Limit | normalized-line:4754 |
| A-SUP-1178 | BULLET | Agent Kill Switch | normalized-line:4755 |
| A-SUP-1179 | BULLET | Agent Suspension | normalized-line:4756 |
| A-SUP-1180 | BULLET | Agent Rollback | normalized-line:4757 |
| A-SUP-1181 | BULLET | Agent Audit Trail | normalized-line:4758 |
| A-SUP-1182 | BULLET | Agent Explanation Log | normalized-line:4759 |
| A-SUP-1183 | BULLET | Agent Memory Control | normalized-line:4760 |
| A-SUP-1184 | BULLET | Agent Tool Budget | normalized-line:4761 |
| A-SUP-1185 | BULLET | Agent Confidence Threshold | normalized-line:4762 |
| A-SUP-1186 | BULLET | Agent Human Escalation Rule | normalized-line:4763 |
| A-SUP-1187 | BULLET | Agent Incident Report | normalized-line:4764 |
| A-SUP-1188 | BULLET | Agent Certification Status | normalized-line:4765 |
| A-SUP-1189 | BULLET | Agent Marketplace Review Status | normalized-line:4766 |
| A-SUP-1190 | TEXT | 369独自の名前にするなら | normalized-line:4767 |
| A-SUP-1191 | BULLET | AI Employee Control Plane | normalized-line:4768 |
| A-SUP-1192 | BULLET | Agent Governance Graph | normalized-line:4769 |
| A-SUP-1193 | BULLET | AI社員管制塔 | normalized-line:4770 |
| A-SUP-1194 | BULLET | Agent Permission Graph | normalized-line:4771 |
| A-SUP-1195 | BULLET | AI Action Flight Recorder | normalized-line:4772 |
| A-SUP-1196 | BULLET | Human Certification Control Tower | normalized-line:4773 |
| A-SUP-1197 | TEXT | 特に「AI Action Flight Recorder」は強いです。 | normalized-line:4774 |
| A-SUP-1198 | TEXT | 飛行機のブラックボックスのように、AI社員が何を見て、何を判断し、何を実行しようとし、誰が承認したかを全記録する機能です。 | normalized-line:4775 |
| A-SUP-1199 | TEXT | NISTのAI Risk Management Frameworkは、AIリスクを個人・組織・社会に対して管理するための枠組みとして公開されており、ISO/IEC 42001もAIマネジメントシステムとして、AIのリスク・透明性・継続的改善・責任ある利用を扱う標準です。369は最初からこの思想を内部設計に入れるべきです。 | normalized-line:4776 |
| A-SUP-1200 | TEXT | 1. Data Governance / Semantic Layer | normalized-line:4778 |
| A-SUP-1201 | TEXT | 次に重要なのは、データをAIが正しく理解する仕組みです。 | normalized-line:4779 |
| A-SUP-1202 | TEXT | 369はCRM、請求、会計、広告、LINE、EC、在庫、採用、教育などを横断します。 | normalized-line:4780 |
| A-SUP-1203 | TEXT | しかし、AIが参照するデータがぐちゃぐちゃだと、AI社員は賢く見えても間違った提案をします。 | normalized-line:4781 |
| A-SUP-1204 | TEXT | 入れるべき機能 | normalized-line:4782 |
| A-SUP-1205 | BULLET | Data Catalog | normalized-line:4783 |
| A-SUP-1206 | BULLET | Business Glossary | normalized-line:4784 |
| A-SUP-1207 | BULLET | Semantic Layer | normalized-line:4785 |
| A-SUP-1208 | BULLET | KPI Dictionary | normalized-line:4786 |
| A-SUP-1209 | BULLET | Metric Definition | normalized-line:4787 |
| A-SUP-1210 | BULLET | Source of Truth Map | normalized-line:4788 |
| A-SUP-1211 | BULLET | Data Lineage | normalized-line:4789 |
| A-SUP-1212 | BULLET | Data Quality Score | normalized-line:4790 |
| A-SUP-1213 | BULLET | Data Freshness | normalized-line:4791 |
| A-SUP-1214 | BULLET | Data Completeness | normalized-line:4792 |
| A-SUP-1215 | BULLET | Data Duplication Detection | normalized-line:4793 |
| A-SUP-1216 | BULLET | Master Data Management | normalized-line:4794 |
| A-SUP-1217 | BULLET | Customer Merge / Split | normalized-line:4795 |
| A-SUP-1218 | BULLET | Company Merge / Split | normalized-line:4796 |
| A-SUP-1219 | BULLET | Identity Resolution | normalized-line:4797 |
| A-SUP-1220 | BULLET | Data Contract | normalized-line:4798 |
| A-SUP-1221 | BULLET | Schema Versioning | normalized-line:4799 |
| A-SUP-1222 | BULLET | Data Ownership | normalized-line:4800 |
| A-SUP-1223 | BULLET | Data Steward | normalized-line:4801 |
| A-SUP-1224 | BULLET | Data Access Policy | normalized-line:4802 |
| A-SUP-1225 | BULLET | Sensitive Data Classification | normalized-line:4803 |
| A-SUP-1226 | BULLET | PII Detection | normalized-line:4804 |
| A-SUP-1227 | BULLET | Confidential Label | normalized-line:4805 |
| A-SUP-1228 | BULLET | External AI Sendability | normalized-line:4806 |
| A-SUP-1229 | BULLET | RAG Source Permission | normalized-line:4807 |
| A-SUP-1230 | BULLET | Vector Index Permission | normalized-line:4808 |
| A-SUP-1231 | BULLET | Embedding Refresh Policy | normalized-line:4809 |
| A-SUP-1232 | BULLET | Deleted Data Propagation | normalized-line:4810 |
| A-SUP-1233 | BULLET | Consent-aware Retrieval | normalized-line:4811 |
| A-SUP-1234 | BULLET | Tenant-aware Retrieval | normalized-line:4812 |
| A-SUP-1235 | BULLET | Department-aware Retrieval | normalized-line:4813 |
| A-SUP-1236 | BULLET | Role-aware Retrieval | normalized-line:4814 |
| A-SUP-1237 | TEXT | 369における意味 | normalized-line:4815 |
| A-SUP-1238 | TEXT | Company Brainを本当に強くするには、単なるファイル検索では足りません。 | normalized-line:4816 |
| A-SUP-1239 | TEXT | 必要なのは、AIが以下を理解できることです。 | normalized-line:4817 |
| A-SUP-1240 | BULLET | この数字は売上なのか、入金なのか、粗利なのか | normalized-line:4818 |
| A-SUP-1241 | BULLET | この顧客は法人なのか、担当者なのか、リードなのか | normalized-line:4819 |
| A-SUP-1242 | BULLET | この契約は有効なのか、解約済みなのか | normalized-line:4820 |
| A-SUP-1243 | BULLET | この広告成果は売上ベースなのか、問い合わせベースなのか | normalized-line:4821 |
| A-SUP-1244 | BULLET | この情報はAIに渡してよいのか | normalized-line:4822 |
| A-SUP-1245 | BULLET | この情報は外部AIに送ってよいのか | normalized-line:4823 |
| A-SUP-1246 | BULLET | この情報は顧客に見せてよいのか | normalized-line:4824 |
| A-SUP-1247 | TEXT | つまり、369にはAI用の意味辞書が必要です。 | normalized-line:4825 |
| A-SUP-1248 | TEXT | 1. Enterprise Admin / Identity / SSO / SCIM | normalized-line:4827 |
| A-SUP-1249 | TEXT | 中小企業だけなら不要に見えますが、大企業・上場企業・グローバル企業を狙うなら必須です。 | normalized-line:4828 |
| A-SUP-1250 | TEXT | 入れるべき機能 | normalized-line:4829 |
| A-SUP-1251 | BULLET | SSO | normalized-line:4830 |
| A-SUP-1252 | BULLET | SAML | normalized-line:4831 |
| A-SUP-1253 | BULLET | OIDC | normalized-line:4832 |
| A-SUP-1254 | BULLET | SCIM | normalized-line:4833 |
| A-SUP-1255 | BULLET | JIT Provisioning | normalized-line:4834 |
| A-SUP-1256 | BULLET | Directory Sync | normalized-line:4835 |
| A-SUP-1257 | BULLET | 組織階層管理 | normalized-line:4836 |
| A-SUP-1258 | BULLET | 部署管理 | normalized-line:4837 |
| A-SUP-1259 | BULLET | チーム管理 | normalized-line:4838 |
| A-SUP-1260 | BULLET | 拠点管理 | normalized-line:4839 |
| A-SUP-1261 | BULLET | 店舗管理 | normalized-line:4840 |
| A-SUP-1262 | BULLET | 子会社管理 | normalized-line:4841 |
| A-SUP-1263 | BULLET | グループ会社管理 | normalized-line:4842 |
| A-SUP-1264 | BULLET | Delegated Admin | normalized-line:4843 |
| A-SUP-1265 | BULLET | Admin Console | normalized-line:4844 |
| A-SUP-1266 | BULLET | Role Template | normalized-line:4845 |
| A-SUP-1267 | BULLET | Permission Template | normalized-line:4846 |
| A-SUP-1268 | BULLET | Access Review | normalized-line:4847 |
| A-SUP-1269 | BULLET | 権限棚卸し | normalized-line:4848 |
| A-SUP-1270 | BULLET | 退職者自動停止 | normalized-line:4849 |
| A-SUP-1271 | BULLET | 休職者アクセス制限 | normalized-line:4850 |
| A-SUP-1272 | BULLET | ゲストユーザー管理 | normalized-line:4851 |
| A-SUP-1273 | BULLET | 外部パートナー管理 | normalized-line:4852 |
| A-SUP-1274 | BULLET | クライアント閲覧者管理 | normalized-line:4853 |
| A-SUP-1275 | BULLET | IP制限 | normalized-line:4854 |
| A-SUP-1276 | BULLET | デバイス制限 | normalized-line:4855 |
| A-SUP-1277 | BULLET | セッション管理 | normalized-line:4856 |
| A-SUP-1278 | BULLET | 2FA / MFA | normalized-line:4857 |
| A-SUP-1279 | BULLET | 監査ログエクスポート | normalized-line:4858 |
| A-SUP-1280 | BULLET | 管理者操作ログ | normalized-line:4859 |
| A-SUP-1281 | BULLET | データ保持ポリシー | normalized-line:4860 |
| A-SUP-1282 | BULLET | Legal Hold | normalized-line:4861 |
| A-SUP-1283 | BULLET | eDiscovery | normalized-line:4862 |
| A-SUP-1284 | TEXT | SCIMは、複数ドメインや企業クラウド環境でユーザー・グループなどのID管理を標準化し、ユーザー管理コストと複雑性を下げるためのプロトコルです。大企業向けSaaSでは、SSOだけでなくSCIMによる入退社・異動時の自動プロビジョニングが重要になります。 | normalized-line:4863 |
| A-SUP-1285 | TEXT | 1. AI Evaluation / Test / Red Team | normalized-line:4865 |
| A-SUP-1286 | TEXT | AI社員をマーケットプレイス化するなら、AI社員の審査・試験・品質保証が必要です。 | normalized-line:4866 |
| A-SUP-1287 | TEXT | 普通のSaaSならテストは「ボタンを押して動くか」で済みます。 | normalized-line:4867 |
| A-SUP-1288 | TEXT | しかしAI社員は、状況によって違う判断をします。だから専用の評価基盤が必要です。 | normalized-line:4868 |
| A-SUP-1289 | TEXT | 入れるべき機能 | normalized-line:4869 |
| A-SUP-1290 | BULLET | Golden Dataset | normalized-line:4870 |
| A-SUP-1291 | BULLET | Scenario Test | normalized-line:4871 |
| A-SUP-1292 | BULLET | Replay Test | normalized-line:4872 |
| A-SUP-1293 | BULLET | Regression Test | normalized-line:4873 |
| A-SUP-1294 | BULLET | Prompt Injection Test | normalized-line:4874 |
| A-SUP-1295 | BULLET | Tool Misuse Test | normalized-line:4875 |
| A-SUP-1296 | BULLET | Excessive Agency Test | normalized-line:4876 |
| A-SUP-1297 | BULLET | Hallucination Test | normalized-line:4877 |
| A-SUP-1298 | BULLET | Compliance Test | normalized-line:4878 |
| A-SUP-1299 | BULLET | PII Leak Test | normalized-line:4879 |
| A-SUP-1300 | BULLET | Consent Violation Test | normalized-line:4880 |
| A-SUP-1301 | BULLET | Cross-tenant Access Test | normalized-line:4881 |
| A-SUP-1302 | BULLET | Cost Explosion Test | normalized-line:4882 |
| A-SUP-1303 | BULLET | Infinite Loop Test | normalized-line:4883 |
| A-SUP-1304 | BULLET | External Action Test | normalized-line:4884 |
| A-SUP-1305 | BULLET | Approval Bypass Test | normalized-line:4885 |
| A-SUP-1306 | BULLET | Agent Sandbox | normalized-line:4886 |
| A-SUP-1307 | BULLET | Agent Simulation | normalized-line:4887 |
| A-SUP-1308 | BULLET | Agent Dry-run | normalized-line:4888 |
| A-SUP-1309 | BULLET | Agent Risk Score | normalized-line:4889 |
| A-SUP-1310 | BULLET | Agent Quality Score | normalized-line:4890 |
| A-SUP-1311 | BULLET | Agent Certification Test | normalized-line:4891 |
| A-SUP-1312 | BULLET | Marketplace Review Test | normalized-line:4892 |
| A-SUP-1313 | BULLET | AI社員公開前審査 | normalized-line:4893 |
| A-SUP-1314 | BULLET | AI社員更新時再審査 | normalized-line:4894 |
| A-SUP-1315 | BULLET | バージョン差分評価 | normalized-line:4895 |
| A-SUP-1316 | BULLET | 事故再現テスト | normalized-line:4896 |
| A-SUP-1317 | TEXT | OWASPのLLMアプリケーション向けTop 10では、Prompt Injection、Insecure Plugin Design、Excessive Agency、Sensitive Information Disclosure、Overrelianceなどがリスクとして整理されています。369はAI社員・プラグイン・外部ツール実行を扱うため、これらを最初からテスト項目に入れるべきです。 | normalized-line:4897 |
| A-SUP-1318 | TEXT | 1. Trust Center / Compliance Center | normalized-line:4899 |
| A-SUP-1319 | TEXT | 369を企業に売るとき、機能一覧だけでは足りません。 | normalized-line:4900 |
| A-SUP-1320 | TEXT | 企業は必ずこう聞きます。 | normalized-line:4901 |
| A-SUP-1321 | BULLET | 個人情報は安全ですか？ | normalized-line:4902 |
| A-SUP-1322 | BULLET | AIが勝手に実行しませんか？ | normalized-line:4903 |
| A-SUP-1323 | BULLET | 監査ログは残りますか？ | normalized-line:4904 |
| A-SUP-1324 | BULLET | データはどこに保存されますか？ | normalized-line:4905 |
| A-SUP-1325 | BULLET | 退職者アクセスは止められますか？ | normalized-line:4906 |
| A-SUP-1326 | BULLET | 契約書や請求書をAIが勝手に送ることはありませんか？ | normalized-line:4907 |
| A-SUP-1327 | BULLET | 社外AIに機密情報を送りますか？ | normalized-line:4908 |
| A-SUP-1328 | BULLET | 障害時はどうなりますか？ | normalized-line:4909 |
| A-SUP-1329 | BULLET | 解約時にデータを返してくれますか？ | normalized-line:4910 |
| A-SUP-1330 | TEXT | これに答えるために、Trust Centerが必要です。 | normalized-line:4911 |
| A-SUP-1331 | TEXT | 入れるべき機能 | normalized-line:4912 |
| A-SUP-1332 | BULLET | Security Overview | normalized-line:4913 |
| A-SUP-1333 | BULLET | Privacy Overview | normalized-line:4914 |
| A-SUP-1334 | BULLET | AI Safety Overview | normalized-line:4915 |
| A-SUP-1335 | BULLET | Data Processing Agreement | normalized-line:4916 |
| A-SUP-1336 | BULLET | Subprocessor List | normalized-line:4917 |
| A-SUP-1337 | BULLET | Data Residency | normalized-line:4918 |
| A-SUP-1338 | BULLET | Data Retention | normalized-line:4919 |
| A-SUP-1339 | BULLET | Data Export Policy | normalized-line:4920 |
| A-SUP-1340 | BULLET | Deletion Policy | normalized-line:4921 |
| A-SUP-1341 | BULLET | Incident Response Policy | normalized-line:4922 |
| A-SUP-1342 | BULLET | Vulnerability Disclosure | normalized-line:4923 |
| A-SUP-1343 | BULLET | Uptime Status | normalized-line:4924 |
| A-SUP-1344 | BULLET | SLA | normalized-line:4925 |
| A-SUP-1345 | BULLET | Backup Policy | normalized-line:4926 |
| A-SUP-1346 | BULLET | RTO / RPO | normalized-line:4927 |
| A-SUP-1347 | BULLET | AI Usage Policy | normalized-line:4928 |
| A-SUP-1348 | BULLET | External AI Send Policy | normalized-line:4929 |
| A-SUP-1349 | BULLET | Human Approval Policy | normalized-line:4930 |
| A-SUP-1350 | BULLET | Audit Log Policy | normalized-line:4931 |
| A-SUP-1351 | BULLET | Consent Policy | normalized-line:4932 |
| A-SUP-1352 | BULLET | Marketplace Review Policy | normalized-line:4933 |
| A-SUP-1353 | BULLET | Developer Policy | normalized-line:4934 |
| A-SUP-1354 | BULLET | App Review Guideline | normalized-line:4935 |
| A-SUP-1355 | BULLET | Compliance Evidence Export | normalized-line:4936 |
| A-SUP-1356 | BULLET | Enterprise Questionnaire自動回答 | normalized-line:4937 |
| A-SUP-1357 | BULLET | セキュリティチェックシート自動回答 | normalized-line:4938 |
| A-SUP-1358 | BULLET | ISMS / SOC2 / ISO27001準備 | normalized-line:4939 |
| A-SUP-1359 | BULLET | ISO/IEC 42001準備 | normalized-line:4940 |
| A-SUP-1360 | BULLET | AI Impact Assessment | normalized-line:4941 |
| A-SUP-1361 | BULLET | DPIA | normalized-line:4942 |
| A-SUP-1362 | BULLET | リスク台帳 | normalized-line:4943 |
| A-SUP-1363 | TEXT | EU AI Actでは高リスクAIに対して、リスク評価・データ品質・ログ・文書化・利用者への情報提供・人間による監督・堅牢性・サイバーセキュリティ・正確性などが重要になります。採用、労務、教育、重要サービスなどに369を広げるなら、こうした考え方は早期に設計へ組み込むべきです。 | normalized-line:4944 |
| A-SUP-1364 | TEXT | 1. Observability / SRE / Status / Incident | normalized-line:4946 |
| A-SUP-1365 | TEXT | 369が企業インフラになるなら、障害時に何が起きたかを説明できることが必要です。 | normalized-line:4947 |
| A-SUP-1366 | TEXT | 入れるべき機能 | normalized-line:4948 |
| A-SUP-1367 | BULLET | System Health Dashboard | normalized-line:4949 |
| A-SUP-1368 | BULLET | API Health | normalized-line:4950 |
| A-SUP-1369 | BULLET | Adapter Health | normalized-line:4951 |
| A-SUP-1370 | BULLET | Queue Health | normalized-line:4952 |
| A-SUP-1371 | BULLET | Worker Health | normalized-line:4953 |
| A-SUP-1372 | BULLET | Webhook Health | normalized-line:4954 |
| A-SUP-1373 | BULLET | AI Provider Health | normalized-line:4955 |
| A-SUP-1374 | BULLET | Model Latency | normalized-line:4956 |
| A-SUP-1375 | BULLET | Model Error Rate | normalized-line:4957 |
| A-SUP-1376 | BULLET | Tool Execution Trace | normalized-line:4958 |
| A-SUP-1377 | BULLET | Agent Execution Trace | normalized-line:4959 |
| A-SUP-1378 | BULLET | Distributed Trace | normalized-line:4960 |
| A-SUP-1379 | BULLET | Metrics | normalized-line:4961 |
| A-SUP-1380 | BULLET | Logs | normalized-line:4962 |
| A-SUP-1381 | BULLET | Audit Events | normalized-line:4963 |
| A-SUP-1382 | BULLET | Incident Timeline | normalized-line:4964 |
| A-SUP-1383 | BULLET | Status Page | normalized-line:4965 |
| A-SUP-1384 | BULLET | SLA Monitor | normalized-line:4966 |
| A-SUP-1385 | BULLET | Error Budget | normalized-line:4967 |
| A-SUP-1386 | BULLET | Alert Routing | normalized-line:4968 |
| A-SUP-1387 | BULLET | On-call Runbook | normalized-line:4969 |
| A-SUP-1388 | BULLET | DLQ Viewer | normalized-line:4970 |
| A-SUP-1389 | BULLET | Retry Viewer | normalized-line:4971 |
| A-SUP-1390 | BULLET | Failed Job Viewer | normalized-line:4972 |
| A-SUP-1391 | BULLET | Replay Tool | normalized-line:4973 |
| A-SUP-1392 | BULLET | Disaster Recovery Drill | normalized-line:4974 |
| A-SUP-1393 | BULLET | Backup Restore Test | normalized-line:4975 |
| A-SUP-1394 | BULLET | Data Integrity Check | normalized-line:4976 |
| A-SUP-1395 | TEXT | OpenTelemetryは、分散トレース、メトリクス、ログを共通文脈で相関させるオープンなObservabilityフレームワークです。369のようにweb、worker、AI、integration、queueが分かれる設計では、早い段階からOpenTelemetry的な考え方を入れると後で非常に強くなります。 | normalized-line:4977 |
| A-SUP-1396 | TEXT | 1. Billing / Metering / FinOps | normalized-line:4979 |
| A-SUP-1397 | TEXT | 369は、最終的に従量課金にしたい構想でした。 | normalized-line:4980 |
| A-SUP-1398 | TEXT | その場合、利用量を正確に測る仕組みが必要です。 | normalized-line:4981 |
| A-SUP-1399 | TEXT | 入れるべき機能 | normalized-line:4982 |
| A-SUP-1400 | BULLET | Tenant Billing | normalized-line:4983 |
| A-SUP-1401 | BULLET | User Billing | normalized-line:4984 |
| A-SUP-1402 | BULLET | AI Employee Billing | normalized-line:4985 |
| A-SUP-1403 | BULLET | AI Runtime Metering | normalized-line:4986 |
| A-SUP-1404 | BULLET | Token Metering | normalized-line:4987 |
| A-SUP-1405 | BULLET | Tool Call Metering | normalized-line:4988 |
| A-SUP-1406 | BULLET | API Call Metering | normalized-line:4989 |
| A-SUP-1407 | BULLET | Storage Metering | normalized-line:4990 |
| A-SUP-1408 | BULLET | Integration Metering | normalized-line:4991 |
| A-SUP-1409 | BULLET | Queue Job Metering | normalized-line:4992 |
| A-SUP-1410 | BULLET | Marketplace Revenue Share | normalized-line:4993 |
| A-SUP-1411 | BULLET | Developer Payout | normalized-line:4994 |
| A-SUP-1412 | BULLET | Affiliate Payout | normalized-line:4995 |
| A-SUP-1413 | BULLET | Referral Payout | normalized-line:4996 |
| A-SUP-1414 | BULLET | PLUG成果報酬 | normalized-line:4997 |
| A-SUP-1415 | BULLET | Cost Allocation | normalized-line:4998 |
| A-SUP-1416 | BULLET | Cost Center | normalized-line:4999 |
| A-SUP-1417 | BULLET | Department Cost | normalized-line:5000 |
| A-SUP-1418 | BULLET | Client Cost | normalized-line:5001 |
| A-SUP-1419 | BULLET | Project Cost | normalized-line:5002 |
| A-SUP-1420 | BULLET | AI社員別原価 | normalized-line:5003 |
| A-SUP-1421 | BULLET | AI社員別売上 | normalized-line:5004 |
| A-SUP-1422 | BULLET | AI社員別粗利 | normalized-line:5005 |
| A-SUP-1423 | BULLET | AI社員別ROI | normalized-line:5006 |
| A-SUP-1424 | BULLET | Usage Forecast | normalized-line:5007 |
| A-SUP-1425 | BULLET | Spending Limit | normalized-line:5008 |
| A-SUP-1426 | BULLET | Budget Alert | normalized-line:5009 |
| A-SUP-1427 | BULLET | Hard Cap | normalized-line:5010 |
| A-SUP-1428 | BULLET | Soft Cap | normalized-line:5011 |
| A-SUP-1429 | BULLET | Free Trial Limit | normalized-line:5012 |
| A-SUP-1430 | BULLET | Plan Upgrade Prompt | normalized-line:5013 |
| A-SUP-1431 | BULLET | 未払い停止 | normalized-line:5014 |
| A-SUP-1432 | BULLET | 請求明細 | normalized-line:5015 |
| A-SUP-1433 | BULLET | Invoice連携 | normalized-line:5016 |
| A-SUP-1434 | BULLET | Accounting連携 | normalized-line:5017 |
| A-SUP-1435 | BULLET | Unit Economics Dashboard | normalized-line:5018 |
| A-SUP-1436 | TEXT | FinOpsは、クラウド・SaaS・AI・データプラットフォームなどの技術支出を、エンジニアリング・財務・事業チームで可視化し、事業価値と結びつける運用フレームワークです。369がAI従量課金・開発者収益分配・企業別原価管理をやるなら、FinOps的な機能は必須です。 | normalized-line:5019 |
| A-SUP-1437 | TEXT | 1. Marketplace Governance | normalized-line:5021 |
| A-SUP-1438 | TEXT | AI社員マーケットプレイスを作るなら、単なるストアでは足りません。 | normalized-line:5022 |
| A-SUP-1439 | TEXT | 審査・権限・事故対応・収益分配・互換性保証が必要です。 | normalized-line:5023 |
| A-SUP-1440 | TEXT | 入れるべき機能 | normalized-line:5024 |
| A-SUP-1441 | BULLET | Developer Verification | normalized-line:5025 |
| A-SUP-1442 | BULLET | Developer KYC | normalized-line:5026 |
| A-SUP-1443 | BULLET | App Submission | normalized-line:5027 |
| A-SUP-1444 | BULLET | App Review | normalized-line:5028 |
| A-SUP-1445 | BULLET | Security Review | normalized-line:5029 |
| A-SUP-1446 | BULLET | Privacy Review | normalized-line:5030 |
| A-SUP-1447 | BULLET | Compliance Review | normalized-line:5031 |
| A-SUP-1448 | BULLET | Permission Review | normalized-line:5032 |
| A-SUP-1449 | BULLET | Tool Scope Review | normalized-line:5033 |
| A-SUP-1450 | BULLET | Data Access Review | normalized-line:5034 |
| A-SUP-1451 | BULLET | App Privacy Manifest | normalized-line:5035 |
| A-SUP-1452 | BULLET | App Permission Manifest | normalized-line:5036 |
| A-SUP-1453 | BULLET | App Risk Label | normalized-line:5037 |
| A-SUP-1454 | BULLET | App Certification | normalized-line:5038 |
| A-SUP-1455 | BULLET | App Signature | normalized-line:5039 |
| A-SUP-1456 | BULLET | App Versioning | normalized-line:5040 |
| A-SUP-1457 | BULLET | App Compatibility Check | normalized-line:5041 |
| A-SUP-1458 | BULLET | App Runtime Monitoring | normalized-line:5042 |
| A-SUP-1459 | BULLET | App Kill Switch | normalized-line:5043 |
| A-SUP-1460 | BULLET | App Rollback | normalized-line:5044 |
| A-SUP-1461 | BULLET | App Incident Report | normalized-line:5045 |
| A-SUP-1462 | BULLET | App Abuse Report | normalized-line:5046 |
| A-SUP-1463 | BULLET | App Revenue Dashboard | normalized-line:5047 |
| A-SUP-1464 | BULLET | Developer Payout | normalized-line:5048 |
| A-SUP-1465 | BULLET | Marketplace Fee | normalized-line:5049 |
| A-SUP-1466 | BULLET | Refund Management | normalized-line:5050 |
| A-SUP-1467 | BULLET | Dispute Management | normalized-line:5051 |
| A-SUP-1468 | BULLET | Review Management | normalized-line:5052 |
| A-SUP-1469 | BULLET | Rating Management | normalized-line:5053 |
| A-SUP-1470 | BULLET | Featured Listing | normalized-line:5054 |
| A-SUP-1471 | BULLET | Official App | normalized-line:5055 |
| A-SUP-1472 | BULLET | Verified App | normalized-line:5056 |
| A-SUP-1473 | BULLET | Enterprise-approved App | normalized-line:5057 |
| A-SUP-1474 | BULLET | Private App | normalized-line:5058 |
| A-SUP-1475 | BULLET | Internal App | normalized-line:5059 |
| A-SUP-1476 | BULLET | Tenant-only App | normalized-line:5060 |
| A-SUP-1477 | TEXT | 369独自の強みになる設計 | normalized-line:5061 |
| A-SUP-1478 | TEXT | AI社員やプラグインに、以下を必ず表示させると強いです。 | normalized-line:5062 |
| A-SUP-1479 | BULLET | このAI社員が読めるデータ | normalized-line:5063 |
| A-SUP-1480 | BULLET | このAI社員が実行できる操作 | normalized-line:5064 |
| A-SUP-1481 | BULLET | このAI社員が外部送信する可能性 | normalized-line:5065 |
| A-SUP-1482 | BULLET | このAI社員が人間承認なしでできること | normalized-line:5066 |
| A-SUP-1483 | BULLET | このAI社員が人間承認を必要とすること | normalized-line:5067 |
| A-SUP-1484 | BULLET | このAI社員の過去事故 | normalized-line:5068 |
| A-SUP-1485 | BULLET | このAI社員の審査状態 | normalized-line:5069 |
| A-SUP-1486 | BULLET | このAI社員の原価・利用料金 | normalized-line:5070 |
| A-SUP-1487 | BULLET | このAI社員の導入企業数 | normalized-line:5071 |
| A-SUP-1488 | BULLET | このAI社員の更新履歴 | normalized-line:5072 |
| A-SUP-1489 | TEXT | これは参入障壁になります。 | normalized-line:5073 |
| A-SUP-1490 | TEXT | 1. MCP / Integration Platform | normalized-line:5075 |
| A-SUP-1491 | TEXT | 今後のAIエージェント連携では、MCPのような標準プロトコル対応も重要になります。 | normalized-line:5076 |
| A-SUP-1492 | TEXT | 入れるべき機能 | normalized-line:5077 |
| A-SUP-1493 | BULLET | MCP Server | normalized-line:5078 |
| A-SUP-1494 | BULLET | MCP Client | normalized-line:5079 |
| A-SUP-1495 | BULLET | MCP Tool Registry | normalized-line:5080 |
| A-SUP-1496 | BULLET | MCP Connector Catalog | normalized-line:5081 |
| A-SUP-1497 | BULLET | MCP Permission Gateway | normalized-line:5082 |
| A-SUP-1498 | BULLET | MCP Audit Gateway | normalized-line:5083 |
| A-SUP-1499 | BULLET | MCP Rate Limit | normalized-line:5084 |
| A-SUP-1500 | BULLET | MCP Tenant Scope | normalized-line:5085 |
| A-SUP-1501 | BULLET | MCP Tool Approval | normalized-line:5086 |
| A-SUP-1502 | BULLET | MCP Tool Sandbox | normalized-line:5087 |
| A-SUP-1503 | BULLET | MCP Tool Signing | normalized-line:5088 |
| A-SUP-1504 | BULLET | MCP Tool Versioning | normalized-line:5089 |
| A-SUP-1505 | BULLET | MCP Tool Health Check | normalized-line:5090 |
| A-SUP-1506 | BULLET | Webhook Gateway | normalized-line:5091 |
| A-SUP-1507 | BULLET | API Gateway | normalized-line:5092 |
| A-SUP-1508 | BULLET | Integration Catalog | normalized-line:5093 |
| A-SUP-1509 | BULLET | OAuth App Management | normalized-line:5094 |
| A-SUP-1510 | BULLET | External App Review | normalized-line:5095 |
| A-SUP-1511 | BULLET | Adapter Contract Test | normalized-line:5096 |
| A-SUP-1512 | BULLET | Integration Health | normalized-line:5097 |
| A-SUP-1513 | BULLET | Integration Logs | normalized-line:5098 |
| A-SUP-1514 | BULLET | Integration Replay | normalized-line:5099 |
| A-SUP-1515 | BULLET | Integration Fallback | normalized-line:5100 |
| A-SUP-1516 | BULLET | CSV Fallback | normalized-line:5101 |
| A-SUP-1517 | BULLET | Google Sheets Fallback | normalized-line:5102 |
| A-SUP-1518 | BULLET | Manual Import Fallback | normalized-line:5103 |
| A-SUP-1519 | TEXT | MCPは、AIアプリケーションが外部システム、データソース、ツール、ワークフローにつながるためのオープン標準として説明されており、ClaudeやChatGPTなども含む広いエコシステムで使える接続方式を目指しています。369がAI社員経済圏を作るなら、独自APIだけでなく、MCP互換レイヤーを持つ意味は大きいです。 | normalized-line:5104 |
| A-SUP-1520 | TEXT | 1. Onboarding / Migration / Setup Wizard | normalized-line:5106 |
| A-SUP-1521 | TEXT | 営業して契約を取れても、導入が大変だと解約されます。 | normalized-line:5107 |
| A-SUP-1522 | TEXT | 369は機能が巨大なので、導入成功をプロダクト化する必要があります。 | normalized-line:5108 |
| A-SUP-1523 | TEXT | 入れるべき機能 | normalized-line:5109 |
| A-SUP-1524 | BULLET | 初期設定ウィザード | normalized-line:5110 |
| A-SUP-1525 | BULLET | 業種選択 | normalized-line:5111 |
| A-SUP-1526 | BULLET | 会社規模選択 | normalized-line:5112 |
| A-SUP-1527 | BULLET | 利用目的選択 | normalized-line:5113 |
| A-SUP-1528 | BULLET | 既存ツール選択 | normalized-line:5114 |
| A-SUP-1529 | BULLET | CSVテンプレート | normalized-line:5115 |
| A-SUP-1530 | BULLET | 顧客CSV取込 | normalized-line:5116 |
| A-SUP-1531 | BULLET | 商談CSV取込 | normalized-line:5117 |
| A-SUP-1532 | BULLET | 請求CSV取込 | normalized-line:5118 |
| A-SUP-1533 | BULLET | 広告CSV取込 | normalized-line:5119 |
| A-SUP-1534 | BULLET | 売上CSV取込 | normalized-line:5120 |
| A-SUP-1535 | BULLET | 商品CSV取込 | normalized-line:5121 |
| A-SUP-1536 | BULLET | 従業員CSV取込 | normalized-line:5122 |
| A-SUP-1537 | BULLET | 権限テンプレート選択 | normalized-line:5123 |
| A-SUP-1538 | BULLET | AI社員テンプレート選択 | normalized-line:5124 |
| A-SUP-1539 | BULLET | KPIテンプレート選択 | normalized-line:5125 |
| A-SUP-1540 | BULLET | 初期ダッシュボード自動生成 | normalized-line:5126 |
| A-SUP-1541 | BULLET | 初期データ品質チェック | normalized-line:5127 |
| A-SUP-1542 | BULLET | 導入進捗チェックリスト | normalized-line:5128 |
| A-SUP-1543 | BULLET | 管理者向けチュートリアル | normalized-line:5129 |
| A-SUP-1544 | BULLET | 現場担当者向けチュートリアル | normalized-line:5130 |
| A-SUP-1545 | BULLET | 経営者向けチュートリアル | normalized-line:5131 |
| A-SUP-1546 | BULLET | サンプルデータ | normalized-line:5132 |
| A-SUP-1547 | BULLET | デモ環境 | normalized-line:5133 |
| A-SUP-1548 | BULLET | 初期ROI診断 | normalized-line:5134 |
| A-SUP-1549 | BULLET | 30日導入成功プラン | normalized-line:5135 |
| A-SUP-1550 | BULLET | 90日活用ロードマップ | normalized-line:5136 |
| A-SUP-1551 | BULLET | 導入ヘルススコア | normalized-line:5137 |
| A-SUP-1552 | TEXT | かなり重要な理由 | normalized-line:5138 |
| A-SUP-1553 | TEXT | 369は便利な反面、巨大に見えます。 | normalized-line:5139 |
| A-SUP-1554 | TEXT | だから最初の体験では、ユーザーにこう思わせる必要があります。 | normalized-line:5140 |
| A-SUP-1555 | TEXT | 「全部使わなくていい。まずは自社に必要なところだけONにすればいい。」 | normalized-line:5141 |
| A-SUP-1556 | TEXT | このために、モジュール選択型のセットアップが必要です。 | normalized-line:5142 |
| A-SUP-1557 | TEXT | 1. Vertical Template Factory | normalized-line:5144 |
| A-SUP-1558 | TEXT | 業界特化OSを作るなら、個別開発ではなく、テンプレート工場が必要です。 | normalized-line:5145 |
| A-SUP-1559 | TEXT | 入れるべき機能 | normalized-line:5146 |
| A-SUP-1560 | BULLET | 業種別テンプレート | normalized-line:5147 |
| A-SUP-1561 | BULLET | 職種別テンプレート | normalized-line:5148 |
| A-SUP-1562 | BULLET | KPIテンプレート | normalized-line:5149 |
| A-SUP-1563 | BULLET | ダッシュボードテンプレート | normalized-line:5150 |
| A-SUP-1564 | BULLET | CRM項目テンプレート | normalized-line:5151 |
| A-SUP-1565 | BULLET | 商談ステージテンプレート | normalized-line:5152 |
| A-SUP-1566 | BULLET | 契約テンプレート | normalized-line:5153 |
| A-SUP-1567 | BULLET | 請求テンプレート | normalized-line:5154 |
| A-SUP-1568 | BULLET | 広告キャンペーンテンプレート | normalized-line:5155 |
| A-SUP-1569 | BULLET | LINE配信テンプレート | normalized-line:5156 |
| A-SUP-1570 | BULLET | 採用フローテンプレート | normalized-line:5157 |
| A-SUP-1571 | BULLET | 教育フローテンプレート | normalized-line:5158 |
| A-SUP-1572 | BULLET | 承認フローテンプレート | normalized-line:5159 |
| A-SUP-1573 | BULLET | AI社員テンプレート | normalized-line:5160 |
| A-SUP-1574 | BULLET | コンプライアンステンプレート | normalized-line:5161 |
| A-SUP-1575 | BULLET | 権限テンプレート | normalized-line:5162 |
| A-SUP-1576 | BULLET | レポートテンプレート | normalized-line:5163 |
| A-SUP-1577 | BULLET | 業種別禁止表現 | normalized-line:5164 |
| A-SUP-1578 | BULLET | 業種別必要同意 | normalized-line:5165 |
| A-SUP-1579 | BULLET | 業種別リスクチェック | normalized-line:5166 |
| A-SUP-1580 | BULLET | 業種別PL | normalized-line:5167 |
| A-SUP-1581 | BULLET | 業種別LTV | normalized-line:5168 |
| A-SUP-1582 | BULLET | 業種別粗利構造 | normalized-line:5169 |
| A-SUP-1583 | TEXT | 例 | normalized-line:5170 |
| A-SUP-1584 | BULLET | 美容室パック | normalized-line:5171 |
| A-SUP-1585 | BULLET | 整骨院パック | normalized-line:5172 |
| A-SUP-1586 | BULLET | 飲食店パック | normalized-line:5173 |
| A-SUP-1587 | BULLET | 広告代理店パック | normalized-line:5174 |
| A-SUP-1588 | BULLET | 士業事務所パック | normalized-line:5175 |
| A-SUP-1589 | BULLET | 採用会社パック | normalized-line:5176 |
| A-SUP-1590 | BULLET | EC事業者パック | normalized-line:5177 |
| A-SUP-1591 | BULLET | フランチャイズ本部パック | normalized-line:5178 |
| A-SUP-1592 | BULLET | 学校法人パック | normalized-line:5179 |
| A-SUP-1593 | BULLET | クリニックパック | normalized-line:5180 |
| A-SUP-1594 | BULLET | 不動産会社パック | normalized-line:5181 |
| A-SUP-1595 | TEXT | これを作ると、369は「汎用SaaS」ではなく、業界別にすぐ使えるAI OSになります。 | normalized-line:5182 |
| A-SUP-1596 | TEXT | 1. Procurement / ITAM / SaaS Management | normalized-line:5184 |
| A-SUP-1597 | TEXT | PLUG型の構想と相性が非常に良いのが、企業購買・SaaS管理・IT資産管理です。 | normalized-line:5185 |
| A-SUP-1598 | TEXT | 入れるべき機能 | normalized-line:5186 |
| A-SUP-1599 | BULLET | SaaS台帳 | normalized-line:5187 |
| A-SUP-1600 | BULLET | 契約中SaaS一覧 | normalized-line:5188 |
| A-SUP-1601 | BULLET | 月額費用一覧 | normalized-line:5189 |
| A-SUP-1602 | BULLET | 利用ユーザー数 | normalized-line:5190 |
| A-SUP-1603 | BULLET | 未使用アカウント検知 | normalized-line:5191 |
| A-SUP-1604 | BULLET | 重複SaaS検知 | normalized-line:5192 |
| A-SUP-1605 | BULLET | 契約更新日管理 | normalized-line:5193 |
| A-SUP-1606 | BULLET | 解約候補提案 | normalized-line:5194 |
| A-SUP-1607 | BULLET | 値上げ検知 | normalized-line:5195 |
| A-SUP-1608 | BULLET | 請求書取込 | normalized-line:5196 |
| A-SUP-1609 | BULLET | SaaS費用配賦 | normalized-line:5197 |
| A-SUP-1610 | BULLET | 部門別SaaS費用 | normalized-line:5198 |
| A-SUP-1611 | BULLET | SaaS利用率 | normalized-line:5199 |
| A-SUP-1612 | BULLET | シャドーIT検知 | normalized-line:5200 |
| A-SUP-1613 | BULLET | アカウント棚卸し | normalized-line:5201 |
| A-SUP-1614 | BULLET | 備品購買 | normalized-line:5202 |
| A-SUP-1615 | BULLET | 最安値購買 | normalized-line:5203 |
| A-SUP-1616 | BULLET | EC横断比較 | normalized-line:5204 |
| A-SUP-1617 | BULLET | クーポン適用 | normalized-line:5205 |
| A-SUP-1618 | BULLET | 購買承認 | normalized-line:5206 |
| A-SUP-1619 | BULLET | 経費精算連携 | normalized-line:5207 |
| A-SUP-1620 | BULLET | 購買先評価 | normalized-line:5208 |
| A-SUP-1621 | BULLET | 仕入先管理 | normalized-line:5209 |
| A-SUP-1622 | BULLET | ベンダーリスク管理 | normalized-line:5210 |
| A-SUP-1623 | BULLET | Vendor Security Review | normalized-line:5211 |
| A-SUP-1624 | BULLET | DPA管理 | normalized-line:5212 |
| A-SUP-1625 | BULLET | 契約書管理 | normalized-line:5213 |
| A-SUP-1626 | BULLET | 更新交渉AI | normalized-line:5214 |
| A-SUP-1627 | BULLET | コスト削減レポート | normalized-line:5215 |
| A-SUP-1628 | TEXT | これはかなり強いです。 | normalized-line:5216 |
| A-SUP-1629 | TEXT | なぜなら、369は「売上を増やすOS」であると同時に、「コストを下げるOS」にもなれるからです。 | normalized-line:5217 |
| A-SUP-1630 | TEXT | 1. 369 Academy / Certification | normalized-line:5219 |
| A-SUP-1631 | TEXT | 非エンジニア、導入企業、開発者、AI社員制作者を増やすには、教育システムが必要です。 | normalized-line:5220 |
| A-SUP-1632 | TEXT | 入れるべき機能 | normalized-line:5221 |
| A-SUP-1633 | BULLET | 369 Academy | normalized-line:5222 |
| A-SUP-1634 | BULLET | 管理者講座 | normalized-line:5223 |
| A-SUP-1635 | BULLET | AI社員管理者講座 | normalized-line:5224 |
| A-SUP-1636 | BULLET | AD OS運用講座 | normalized-line:5225 |
| A-SUP-1637 | BULLET | CRM運用講座 | normalized-line:5226 |
| A-SUP-1638 | BULLET | 経理・請求運用講座 | normalized-line:5227 |
| A-SUP-1639 | BULLET | 開発者講座 | normalized-line:5228 |
| A-SUP-1640 | BULLET | AI社員開発講座 | normalized-line:5229 |
| A-SUP-1641 | BULLET | Plugin開発講座 | normalized-line:5230 |
| A-SUP-1642 | BULLET | セキュリティ講座 | normalized-line:5231 |
| A-SUP-1643 | BULLET | コンプライアンス講座 | normalized-line:5232 |
| A-SUP-1644 | BULLET | 認定試験 | normalized-line:5233 |
| A-SUP-1645 | BULLET | 認定バッジ | normalized-line:5234 |
| A-SUP-1646 | BULLET | 認定開発者 | normalized-line:5235 |
| A-SUP-1647 | BULLET | 認定導入担当者 | normalized-line:5236 |
| A-SUP-1648 | BULLET | 認定AI社員 | normalized-line:5237 |
| A-SUP-1649 | BULLET | 公式教材 | normalized-line:5238 |
| A-SUP-1650 | BULLET | チュートリアル | normalized-line:5239 |
| A-SUP-1651 | BULLET | ハンズオン | normalized-line:5240 |
| A-SUP-1652 | BULLET | テンプレート配布 | normalized-line:5241 |
| A-SUP-1653 | BULLET | 活用事例 | normalized-line:5242 |
| A-SUP-1654 | BULLET | 導入成功事例 | normalized-line:5243 |
| A-SUP-1655 | BULLET | コミュニティ | normalized-line:5244 |
| A-SUP-1656 | BULLET | フォーラム | normalized-line:5245 |
| A-SUP-1657 | BULLET | Q&A | normalized-line:5246 |
| A-SUP-1658 | BULLET | ナレッジベース | normalized-line:5247 |
| A-SUP-1659 | TEXT | 参入障壁としての意味 | normalized-line:5248 |
| A-SUP-1660 | TEXT | Salesforceが強い理由の一つは、製品だけでなく、学習・認定・人材市場があることです。 | normalized-line:5249 |
| A-SUP-1661 | TEXT | 369も、369を扱える人材が増えるほど、369の市場価値が上がる構造にするべきです。 | normalized-line:5250 |
| A-SUP-1662 | TEXT | 1. Digital Twin / Business Simulator | normalized-line:5252 |
| A-SUP-1663 | TEXT | これは中長期ですが、369のAIらしさを強烈に出せます。 | normalized-line:5253 |
| A-SUP-1664 | TEXT | 入れるべき機能 | normalized-line:5254 |
| A-SUP-1665 | BULLET | 事業シミュレーター | normalized-line:5255 |
| A-SUP-1666 | BULLET | 売上予測 | normalized-line:5256 |
| A-SUP-1667 | BULLET | 粗利予測 | normalized-line:5257 |
| A-SUP-1668 | BULLET | LTV予測 | normalized-line:5258 |
| A-SUP-1669 | BULLET | 広告予算シミュレーション | normalized-line:5259 |
| A-SUP-1670 | BULLET | 採用計画シミュレーション | normalized-line:5260 |
| A-SUP-1671 | BULLET | 在庫需要予測 | normalized-line:5261 |
| A-SUP-1672 | BULLET | キャッシュフロー予測 | normalized-line:5262 |
| A-SUP-1673 | BULLET | 値上げ影響予測 | normalized-line:5263 |
| A-SUP-1674 | BULLET | 値引き影響予測 | normalized-line:5264 |
| A-SUP-1675 | BULLET | 解約率影響予測 | normalized-line:5265 |
| A-SUP-1676 | BULLET | 新店舗出店シミュレーション | normalized-line:5266 |
| A-SUP-1677 | BULLET | 新商品投入シミュレーション | normalized-line:5267 |
| A-SUP-1678 | BULLET | AI施策の事前影響予測 | normalized-line:5268 |
| A-SUP-1679 | BULLET | What-if分析 | normalized-line:5269 |
| A-SUP-1680 | BULLET | Scenario Planning | normalized-line:5270 |
| A-SUP-1681 | BULLET | Risk Simulation | normalized-line:5271 |
| A-SUP-1682 | BULLET | Best / Base / Worst Case | normalized-line:5272 |
| A-SUP-1683 | BULLET | 経営会議用シナリオ生成 | normalized-line:5273 |
| A-SUP-1684 | TEXT | 369らしい使い方 | normalized-line:5274 |
| A-SUP-1685 | TEXT | AI社員が施策を提案する前に、必ずこう出す。 | normalized-line:5275 |
| A-SUP-1686 | TEXT | 「この広告予算を20万円増やした場合、過去90日のデータでは売上+80万円、粗利+32万円の可能性。ただしCV数が少ないため信頼度は中。実行には人間承認が必要です。」 | normalized-line:5276 |
| A-SUP-1687 | TEXT | これは、単なるレポートSaaSではなく、経営判断OSになります。 | normalized-line:5277 |
| A-SUP-1688 | TEXT | 1. Policy-as-Code / Contract-as-Code | normalized-line:5279 |
| A-SUP-1689 | TEXT | これは非常に参入障壁になります。 | normalized-line:5280 |
| A-SUP-1690 | TEXT | 入れるべき機能 | normalized-line:5281 |
| A-SUP-1691 | BULLET | 契約条件を機械可読化 | normalized-line:5282 |
| A-SUP-1692 | BULLET | 承認ルールを機械可読化 | normalized-line:5283 |
| A-SUP-1693 | BULLET | 権限ルールを機械可読化 | normalized-line:5284 |
| A-SUP-1694 | BULLET | 請求条件を機械可読化 | normalized-line:5285 |
| A-SUP-1695 | BULLET | 成果報酬条件を機械可読化 | normalized-line:5286 |
| A-SUP-1696 | BULLET | 同意条件を機械可読化 | normalized-line:5287 |
| A-SUP-1697 | BULLET | 広告出稿ルールを機械可読化 | normalized-line:5288 |
| A-SUP-1698 | BULLET | 禁止表現ルールを機械可読化 | normalized-line:5289 |
| A-SUP-1699 | BULLET | 業種別規制ルール | normalized-line:5290 |
| A-SUP-1700 | BULLET | 社内規程ルール | normalized-line:5291 |
| A-SUP-1701 | BULLET | 稟議ルール | normalized-line:5292 |
| A-SUP-1702 | BULLET | AI実行可否ルール | normalized-line:5293 |
| A-SUP-1703 | BULLET | リスク判定ルール | normalized-line:5294 |
| A-SUP-1704 | BULLET | Policy Engine | normalized-line:5295 |
| A-SUP-1705 | BULLET | Rule Versioning | normalized-line:5296 |
| A-SUP-1706 | BULLET | Rule Test | normalized-line:5297 |
| A-SUP-1707 | BULLET | Rule Simulation | normalized-line:5298 |
| A-SUP-1708 | BULLET | Rule Approval | normalized-line:5299 |
| A-SUP-1709 | BULLET | Rule Audit | normalized-line:5300 |
| A-SUP-1710 | TEXT | 369における意味 | normalized-line:5301 |
| A-SUP-1711 | TEXT | たとえば、契約書にこう書かれているとします。 | normalized-line:5302 |
| A-SUP-1712 | TEXT | 成果報酬は、広告経由の初回契約売上の10%とする。ただし月額上限は30万円。 | normalized-line:5303 |
| A-SUP-1713 | TEXT | これをAIが読んで「請求候補」を作るだけでは弱いです。 | normalized-line:5304 |
| A-SUP-1714 | TEXT | 本当に強いのは、契約条件を構造化して、請求・承認・監査に自動接続することです。 | normalized-line:5305 |
| A-SUP-1715 | TEXT | つまり、369は将来的に、 | normalized-line:5306 |
| A-SUP-1716 | TEXT | 契約 → 請求 → 入金 → 会計 → 成果報酬 → 監査 | normalized-line:5307 |
| A-SUP-1717 | TEXT | を一気通貫できます。 | normalized-line:5308 |
| A-SUP-1718 | TEXT | 1. Ecosystem Analytics | normalized-line:5310 |
| A-SUP-1719 | TEXT | AI社員マーケットプレイスや開発者経済圏を作るなら、経済圏そのものを分析する機能が必要です。 | normalized-line:5311 |
| A-SUP-1720 | TEXT | 入れるべき機能 | normalized-line:5312 |
| A-SUP-1721 | BULLET | AI社員別導入数 | normalized-line:5313 |
| A-SUP-1722 | BULLET | AI社員別稼働時間 | normalized-line:5314 |
| A-SUP-1723 | BULLET | AI社員別売上 | normalized-line:5315 |
| A-SUP-1724 | BULLET | AI社員別粗利 | normalized-line:5316 |
| A-SUP-1725 | BULLET | AI社員別解約率 | normalized-line:5317 |
| A-SUP-1726 | BULLET | AI社員別事故率 | normalized-line:5318 |
| A-SUP-1727 | BULLET | AI社員別承認率 | normalized-line:5319 |
| A-SUP-1728 | BULLET | AI社員別差し戻し率 | normalized-line:5320 |
| A-SUP-1729 | BULLET | AI社員別平均ROI | normalized-line:5321 |
| A-SUP-1730 | BULLET | 開発者別売上 | normalized-line:5322 |
| A-SUP-1731 | BULLET | 開発者別継続率 | normalized-line:5323 |
| A-SUP-1732 | BULLET | プラグイン別導入数 | normalized-line:5324 |
| A-SUP-1733 | BULLET | プラグイン別利用率 | normalized-line:5325 |
| A-SUP-1734 | BULLET | 業種別人気AI社員 | normalized-line:5326 |
| A-SUP-1735 | BULLET | 企業規模別人気AI社員 | normalized-line:5327 |
| A-SUP-1736 | BULLET | Marketplace GMV | normalized-line:5328 |
| A-SUP-1737 | BULLET | Marketplace Take Rate | normalized-line:5329 |
| A-SUP-1738 | BULLET | Developer Revenue | normalized-line:5330 |
| A-SUP-1739 | BULLET | Platform Revenue | normalized-line:5331 |
| A-SUP-1740 | BULLET | Affiliate Revenue | normalized-line:5332 |
| A-SUP-1741 | BULLET | Referral Revenue | normalized-line:5333 |
| A-SUP-1742 | BULLET | PLUG経由売上 | normalized-line:5334 |
| A-SUP-1743 | BULLET | 従業員利用数 | normalized-line:5335 |
| A-SUP-1744 | BULLET | 企業内展開率 | normalized-line:5336 |
| A-SUP-1745 | BULLET | AI社員間連携グラフ | normalized-line:5337 |
| A-SUP-1746 | BULLET | API利用ランキング | normalized-line:5338 |
| A-SUP-1747 | BULLET | 不正利用検知 | normalized-line:5339 |
| A-SUP-1748 | BULLET | スパム開発者検知 | normalized-line:5340 |
| A-SUP-1749 | BULLET | 低品質AI社員検知 | normalized-line:5341 |
| A-SUP-1750 | TEXT | これがあると、369は自分の経済圏を数字で伸ばせます。 | normalized-line:5342 |
| A-SUP-1751 | TEXT | 1. Browser Extension / Desktop Companion / Mobile App | normalized-line:5344 |
| A-SUP-1752 | TEXT | PLUG型や従業員普及を狙うなら、Webアプリだけでは弱いです。 | normalized-line:5345 |
| A-SUP-1753 | TEXT | 入れるべき機能 | normalized-line:5346 |
| A-SUP-1754 | BULLET | Chrome拡張 | normalized-line:5347 |
| A-SUP-1755 | BULLET | Edge拡張 | normalized-line:5348 |
| A-SUP-1756 | BULLET | Safari拡張 | normalized-line:5349 |
| A-SUP-1757 | BULLET | Desktop Companion | normalized-line:5350 |
| A-SUP-1758 | BULLET | Mobile App | normalized-line:5351 |
| A-SUP-1759 | BULLET | 通知センター | normalized-line:5352 |
| A-SUP-1760 | BULLET | クリップ機能 | normalized-line:5353 |
| A-SUP-1761 | BULLET | ページ解析 | normalized-line:5354 |
| A-SUP-1762 | BULLET | EC価格比較 | normalized-line:5355 |
| A-SUP-1763 | BULLET | SaaS利用検知 | normalized-line:5356 |
| A-SUP-1764 | BULLET | 顧客ページ補助 | normalized-line:5357 |
| A-SUP-1765 | BULLET | メール返信補助 | normalized-line:5358 |
| A-SUP-1766 | BULLET | CRM自動補助 | normalized-line:5359 |
| A-SUP-1767 | BULLET | 社内ナレッジ呼び出し | normalized-line:5360 |
| A-SUP-1768 | BULLET | AI社員呼び出し | normalized-line:5361 |
| A-SUP-1769 | BULLET | 画面上の承認依頼 | normalized-line:5362 |
| A-SUP-1770 | BULLET | 請求書OCR | normalized-line:5363 |
| A-SUP-1771 | BULLET | 名刺OCR | normalized-line:5364 |
| A-SUP-1772 | BULLET | 領収書OCR | normalized-line:5365 |
| A-SUP-1773 | BULLET | 音声メモ | normalized-line:5366 |
| A-SUP-1774 | BULLET | 会議録音 | normalized-line:5367 |
| A-SUP-1775 | BULLET | 議事録作成 | normalized-line:5368 |
| A-SUP-1776 | BULLET | 現場写真アップロード | normalized-line:5369 |
| A-SUP-1777 | BULLET | 店舗チェックリスト | normalized-line:5370 |
| A-SUP-1778 | BULLET | 外出営業用CRM | normalized-line:5371 |
| A-SUP-1779 | BULLET | 店舗スタッフ用タスク | normalized-line:5372 |
| A-SUP-1780 | BULLET | 従業員向け購買補助 | normalized-line:5373 |
| A-SUP-1781 | TEXT | 369における意味 | normalized-line:5374 |
| A-SUP-1782 | TEXT | ブラウザ拡張とモバイルアプリは、369を「会社の管理画面」から「毎日使う道具」に変えます。 | normalized-line:5375 |
| A-SUP-1783 | TEXT | 1. Customer-facing Portal | normalized-line:5377 |
| A-SUP-1784 | TEXT | 369は社内OSだけでなく、顧客・取引先・クライアントにも見せる画面が必要です。 | normalized-line:5378 |
| A-SUP-1785 | TEXT | 入れるべき機能 | normalized-line:5379 |
| A-SUP-1786 | BULLET | 顧客ポータル | normalized-line:5380 |
| A-SUP-1787 | BULLET | クライアント共有ダッシュボード | normalized-line:5381 |
| A-SUP-1788 | BULLET | 請求書閲覧 | normalized-line:5382 |
| A-SUP-1789 | BULLET | 契約書閲覧 | normalized-line:5383 |
| A-SUP-1790 | BULLET | 見積承認 | normalized-line:5384 |
| A-SUP-1791 | BULLET | 作業進捗確認 | normalized-line:5385 |
| A-SUP-1792 | BULLET | レポート閲覧 | normalized-line:5386 |
| A-SUP-1793 | BULLET | コメント | normalized-line:5387 |
| A-SUP-1794 | BULLET | ファイル共有 | normalized-line:5388 |
| A-SUP-1795 | BULLET | 問い合わせ | normalized-line:5389 |
| A-SUP-1796 | BULLET | チケット | normalized-line:5390 |
| A-SUP-1797 | BULLET | 予約変更 | normalized-line:5391 |
| A-SUP-1798 | BULLET | 支払い | normalized-line:5392 |
| A-SUP-1799 | BULLET | 領収書ダウンロード | normalized-line:5393 |
| A-SUP-1800 | BULLET | 導入事例許諾 | normalized-line:5394 |
| A-SUP-1801 | BULLET | 成果数値公開許諾 | normalized-line:5395 |
| A-SUP-1802 | BULLET | パートナーポータル | normalized-line:5396 |
| A-SUP-1803 | BULLET | 紹介者ポータル | normalized-line:5397 |
| A-SUP-1804 | BULLET | クリエイターポータル | normalized-line:5398 |
| A-SUP-1805 | BULLET | 開発者ポータル | normalized-line:5399 |
| A-SUP-1806 | TEXT | これは、広告代理店向け・士業向け・制作会社向け・B2B企業向けにかなり重要です。 | normalized-line:5400 |
| A-SUP-1807 | TEXT | 1. Risk / Insurance / Liability Layer | normalized-line:5402 |
| A-SUP-1808 | TEXT | AI社員が業務を支援するほど、事故時の責任問題が出ます。 | normalized-line:5403 |
| A-SUP-1809 | TEXT | 入れるべき機能 | normalized-line:5404 |
| A-SUP-1810 | BULLET | AI事故レポート | normalized-line:5405 |
| A-SUP-1811 | BULLET | 誤送信レポート | normalized-line:5406 |
| A-SUP-1812 | BULLET | 誤請求レポート | normalized-line:5407 |
| A-SUP-1813 | BULLET | 誤提案レポート | normalized-line:5408 |
| A-SUP-1814 | BULLET | データ漏洩疑いレポート | normalized-line:5409 |
| A-SUP-1815 | BULLET | 誤承認レポート | normalized-line:5410 |
| A-SUP-1816 | BULLET | 事故分類 | normalized-line:5411 |
| A-SUP-1817 | BULLET | 影響範囲特定 | normalized-line:5412 |
| A-SUP-1818 | BULLET | 原因分析 | normalized-line:5413 |
| A-SUP-1819 | BULLET | 再発防止策 | normalized-line:5414 |
| A-SUP-1820 | BULLET | 補償アクション | normalized-line:5415 |
| A-SUP-1821 | BULLET | 顧客通知テンプレート | normalized-line:5416 |
| A-SUP-1822 | BULLET | 法務通知テンプレート | normalized-line:5417 |
| A-SUP-1823 | BULLET | 保険会社向け証跡 | normalized-line:5418 |
| A-SUP-1824 | BULLET | AI社員責任分界 | normalized-line:5419 |
| A-SUP-1825 | BULLET | 開発者責任分界 | normalized-line:5420 |
| A-SUP-1826 | BULLET | 導入企業責任分界 | normalized-line:5421 |
| A-SUP-1827 | BULLET | 369責任分界 | normalized-line:5422 |
| A-SUP-1828 | BULLET | Marketplace利用規約 | normalized-line:5423 |
| A-SUP-1829 | BULLET | AI社員利用規約 | normalized-line:5424 |
| A-SUP-1830 | BULLET | 外部開発者規約 | normalized-line:5425 |
| A-SUP-1831 | BULLET | 免責・保証範囲管理 | normalized-line:5426 |
| A-SUP-1832 | TEXT | この領域は、企業導入では非常に大きな安心材料になります。 | normalized-line:5427 |
| A-SUP-1833 | TEXT | 1. 369独自の差別化として特に強い追加機能 | normalized-line:5429 |
| A-SUP-1834 | TEXT | ここからは、単に必要というより、369の勝ち筋・参入障壁になる機能です。 | normalized-line:5430 |
| A-SUP-1835 | TEXT | 2. Human Certification Gate 全社共通化 | normalized-line:5431 |
| A-SUP-1836 | TEXT | 請求・入金・会計だけでなく、以下すべてに共通化する。 | normalized-line:5432 |
| A-SUP-1837 | BULLET | 広告予算変更 | normalized-line:5433 |
| A-SUP-1838 | BULLET | LINE送信 | normalized-line:5434 |
| A-SUP-1839 | BULLET | メール送信 | normalized-line:5435 |
| A-SUP-1840 | BULLET | SNS投稿 | normalized-line:5436 |
| A-SUP-1841 | BULLET | PR公開 | normalized-line:5437 |
| A-SUP-1842 | BULLET | SEO公開 | normalized-line:5438 |
| A-SUP-1843 | BULLET | 契約確定 | normalized-line:5439 |
| A-SUP-1844 | BULLET | 請求確定 | normalized-line:5440 |
| A-SUP-1845 | BULLET | 入金消込 | normalized-line:5441 |
| A-SUP-1846 | BULLET | 会計仕訳 | normalized-line:5442 |
| A-SUP-1847 | BULLET | 採用合否 | normalized-line:5443 |
| A-SUP-1848 | BULLET | 労務判断 | normalized-line:5444 |
| A-SUP-1849 | BULLET | 返金 | normalized-line:5445 |
| A-SUP-1850 | BULLET | 値引き | normalized-line:5446 |
| A-SUP-1851 | BULLET | 個人情報外部送信 | normalized-line:5447 |
| A-SUP-1852 | BULLET | 顧客名公開 | normalized-line:5448 |
| A-SUP-1853 | BULLET | 成果数値公開 | normalized-line:5449 |
| A-SUP-1854 | TEXT | これは「AIに任せるが、危険な確定は人間が認証する」という369の中核思想にできます。 | normalized-line:5450 |
| A-SUP-1855 | TEXT | 3. Business Event Ledger 全社展開 | normalized-line:5451 |
| A-SUP-1856 | TEXT | Growth Event Ledgerだけでなく、会社全体のイベント台帳にする。 | normalized-line:5452 |
| A-SUP-1857 | BULLET | 顧客作成 | normalized-line:5453 |
| A-SUP-1858 | BULLET | リード発生 | normalized-line:5454 |
| A-SUP-1859 | BULLET | 商談化 | normalized-line:5455 |
| A-SUP-1860 | BULLET | 見積 | normalized-line:5456 |
| A-SUP-1861 | BULLET | 契約 | normalized-line:5457 |
| A-SUP-1862 | BULLET | 請求 | normalized-line:5458 |
| A-SUP-1863 | BULLET | 入金 | normalized-line:5459 |
| A-SUP-1864 | BULLET | 会計 | normalized-line:5460 |
| A-SUP-1865 | BULLET | 採用 | normalized-line:5461 |
| A-SUP-1866 | BULLET | 教育 | normalized-line:5462 |
| A-SUP-1867 | BULLET | 在庫 | normalized-line:5463 |
| A-SUP-1868 | BULLET | 受発注 | normalized-line:5464 |
| A-SUP-1869 | BULLET | 広告 | normalized-line:5465 |
| A-SUP-1870 | BULLET | SNS | normalized-line:5466 |
| A-SUP-1871 | BULLET | LINE | normalized-line:5467 |
| A-SUP-1872 | BULLET | EC | normalized-line:5468 |
| A-SUP-1873 | BULLET | 予約 | normalized-line:5469 |
| A-SUP-1874 | BULLET | CS | normalized-line:5470 |
| A-SUP-1875 | BULLET | AI提案 | normalized-line:5471 |
| A-SUP-1876 | BULLET | 承認 | normalized-line:5472 |
| A-SUP-1877 | BULLET | 実行 | normalized-line:5473 |
| A-SUP-1878 | BULLET | 失敗 | normalized-line:5474 |
| A-SUP-1879 | BULLET | 補償 | normalized-line:5475 |
| A-SUP-1880 | TEXT | これにより、369は「すべての業務イベントをAIが読める会社の記録」にできます。 | normalized-line:5476 |
| A-SUP-1881 | TEXT | 4. AI社員の免許制度 | normalized-line:5477 |
| A-SUP-1882 | TEXT | AI社員に「免許」を持たせると強いです。 | normalized-line:5478 |
| A-SUP-1883 | BULLET | 営業AI免許 | normalized-line:5479 |
| A-SUP-1884 | BULLET | 経理AI免許 | normalized-line:5480 |
| A-SUP-1885 | BULLET | 広告AI免許 | normalized-line:5481 |
| A-SUP-1886 | BULLET | 採用AI免許 | normalized-line:5482 |
| A-SUP-1887 | BULLET | 法務AI免許 | normalized-line:5483 |
| A-SUP-1888 | BULLET | 請求AI免許 | normalized-line:5484 |
| A-SUP-1889 | BULLET | 個人情報取扱AI免許 | normalized-line:5485 |
| A-SUP-1890 | BULLET | 外部送信AI免許 | normalized-line:5486 |
| A-SUP-1891 | BULLET | 高リスク提案AI免許 | normalized-line:5487 |
| A-SUP-1892 | TEXT | 免許がないAI社員は、特定の操作ができない。 | normalized-line:5488 |
| A-SUP-1893 | TEXT | これは分かりやすく、非エンジニアにも伝わります。 | normalized-line:5489 |
| A-SUP-1894 | TEXT | 5. AI社員の給与明細 | normalized-line:5490 |
| A-SUP-1895 | TEXT | AI社員ごとに、稼働・成果・コストを見せる。 | normalized-line:5491 |
| A-SUP-1896 | BULLET | 稼働時間 | normalized-line:5492 |
| A-SUP-1897 | BULLET | 実行回数 | normalized-line:5493 |
| A-SUP-1898 | BULLET | 提案数 | normalized-line:5494 |
| A-SUP-1899 | BULLET | 承認率 | normalized-line:5495 |
| A-SUP-1900 | BULLET | 成果金額 | normalized-line:5496 |
| A-SUP-1901 | BULLET | 削減時間 | normalized-line:5497 |
| A-SUP-1902 | BULLET | 削減コスト | normalized-line:5498 |
| A-SUP-1903 | BULLET | AI利用原価 | normalized-line:5499 |
| A-SUP-1904 | BULLET | 人間換算工数 | normalized-line:5500 |
| A-SUP-1905 | BULLET | ROI | normalized-line:5501 |
| A-SUP-1906 | BULLET | 失敗回数 | normalized-line:5502 |
| A-SUP-1907 | BULLET | 差し戻し回数 | normalized-line:5503 |
| A-SUP-1908 | TEXT | これは営業資料として非常に強いです。 | normalized-line:5504 |
| A-SUP-1909 | TEXT | 「このAI社員は今月18時間稼働し、人間換算42時間分の業務を削減し、原価1,240円で、推定12万円分の工数削減をしました」 | normalized-line:5505 |
| A-SUP-1910 | TEXT | という見せ方ができます。 | normalized-line:5506 |
| A-SUP-1911 | TEXT | 6. 369 App Storeではなく「AI社員派遣所」 | normalized-line:5507 |
| A-SUP-1912 | TEXT | 普通のマーケットプレイスではなく、世界観としてはこうです。 | normalized-line:5508 |
| A-SUP-1913 | BULLET | AI社員を雇う | normalized-line:5509 |
| A-SUP-1914 | BULLET | AI社員に権限を与える | normalized-line:5510 |
| A-SUP-1915 | BULLET | AI社員に研修を受けさせる | normalized-line:5511 |
| A-SUP-1916 | BULLET | AI社員に免許を付与する | normalized-line:5512 |
| A-SUP-1917 | BULLET | AI社員の給与明細を見る | normalized-line:5513 |
| A-SUP-1918 | BULLET | AI社員を評価する | normalized-line:5514 |
| A-SUP-1919 | BULLET | AI社員を昇格させる | normalized-line:5515 |
| A-SUP-1920 | BULLET | AI社員を停止する | normalized-line:5516 |
| A-SUP-1921 | BULLET | AI社員を入れ替える | normalized-line:5517 |
| A-SUP-1922 | TEXT | この表現は、非エンジニアにも刺さりやすいです。 | normalized-line:5518 |
| A-SUP-1923 | TEXT | 1. 追加すべきだが、初期MVPでは後回しでよいもの | normalized-line:5520 |
| A-SUP-1924 | TEXT | 以下は重要ですが、今すぐ実装しすぎると開発が重くなります。 | normalized-line:5521 |
| A-SUP-1925 | TEXT | 領域 理由 | normalized-line:5522 |
| A-SUP-1926 | TEXT | 本格SSO / SCIM エンタープライズ営業前でよい | normalized-line:5523 |
| A-SUP-1927 | TEXT | White-label 価値証明後でよい | normalized-line:5524 |
| A-SUP-1928 | TEXT | 他社OS SDK IKEZAKI OS内で価値証明後でよい | normalized-line:5525 |
| A-SUP-1929 | TEXT | クロステナント学習 同意・匿名化・競合除外が難しい | normalized-line:5526 |
| A-SUP-1930 | TEXT | フィジカルAI まずはデジタル業務OSで十分 | normalized-line:5527 |
| A-SUP-1931 | TEXT | 自動会計確定 リスクが高い | normalized-line:5528 |
| A-SUP-1932 | TEXT | 自動契約締結 リスクが高い | normalized-line:5529 |
| A-SUP-1933 | TEXT | 採用合否自動判定 法務・倫理リスクが高い | normalized-line:5530 |
| A-SUP-1934 | TEXT | 医療・法律・税務判断 専門家確認が必要 | normalized-line:5531 |
| A-SUP-1935 | TEXT | 完全自動広告運用 予算消化・媒体規約リスクがある | normalized-line:5532 |
| A-SUP-1936 | TEXT | 資料上でも、初期MVPでは外部API完全連携、広告APIの自動実行、LINE自動配信、SNS自動投稿、DM大量自動送信、高度アトリビューション、クロステナント学習、PR外部配信自動化、SEOページ自動公開、広告予算の完全自動変更、個人情報の外部共有自動化などは実装しない方針になっています。 | normalized-line:5533 |
| A-SUP-1937 | TEXT | 1. 最初に追加すべき「設計docs」 | normalized-line:5535 |
| A-SUP-1938 | TEXT | 実装より先に、以下のdocsを作るべきです。 | normalized-line:5536 |
| A-SUP-1939 | TEXT | 追加docs案 | normalized-line:5537 |
| A-SUP-1940 | BULLET | docs/ai-governance/00_overview.md | normalized-line:5538 |
| A-SUP-1941 | BULLET | docs/ai-governance/01_agent_registry.md | normalized-line:5539 |
| A-SUP-1942 | BULLET | docs/ai-governance/02_tool_registry.md | normalized-line:5540 |
| A-SUP-1943 | BULLET | docs/ai-governance/03_agent_permission_model.md | normalized-line:5541 |
| A-SUP-1944 | BULLET | docs/ai-governance/04_agent_risk_tiers.md | normalized-line:5542 |
| A-SUP-1945 | BULLET | docs/ai-governance/05_ai_flight_recorder.md | normalized-line:5543 |
| A-SUP-1946 | BULLET | docs/ai-governance/06_agent_evaluation.md | normalized-line:5544 |
| A-SUP-1947 | BULLET | docs/ai-governance/07_marketplace_review.md | normalized-line:5545 |
| A-SUP-1948 | BULLET | docs/data-governance/00_semantic_layer.md | normalized-line:5546 |
| A-SUP-1949 | BULLET | docs/data-governance/01_data_catalog.md | normalized-line:5547 |
| A-SUP-1950 | BULLET | docs/data-governance/02_data_quality.md | normalized-line:5548 |
| A-SUP-1951 | BULLET | docs/data-governance/03_sensitive_data_policy.md | normalized-line:5549 |
| A-SUP-1952 | BULLET | docs/trust-center/00_security_privacy_ai_safety.md | normalized-line:5550 |
| A-SUP-1953 | BULLET | docs/billing/00_metering_unit_economics.md | normalized-line:5551 |
| A-SUP-1954 | BULLET | docs/marketplace/00_ai_employee_marketplace.md | normalized-line:5552 |
| A-SUP-1955 | BULLET | docs/onboarding/00_setup_migration_wizard.md | normalized-line:5553 |
| A-SUP-1956 | BULLET | docs/vertical-templates/00_template_factory.md | normalized-line:5554 |
| A-SUP-1957 | TEXT | 1. 369の完成形をさらに強く言語化すると | normalized-line:5556 |
| A-SUP-1958 | TEXT | 前回の定義に、今回の追加領域を加えると、369 / IKEZAKI OSはこう表現できます。 | normalized-line:5557 |
| A-SUP-1959 | TEXT | 369 / IKEZAKI OSは、企業の顧客・営業・広告・請求・会計・人事・購買・EC・在庫・ナレッジを統合し、その上でAI社員が安全に働き、外部開発者がAI社員を供給し、企業と従業員と開発者が同じ経済圏に参加できるAI業務インフラである。 | normalized-line:5558 |
| A-SUP-1960 | TEXT | さらに差別化まで含めるなら、 | normalized-line:5559 |
| A-SUP-1961 | TEXT | 369の本質は、AI社員を“便利なチャット”ではなく、“権限・承認・監査・給与明細・免許・評価・停止・マーケットプレイスを持つデジタル労働力”として扱う点にある。 | normalized-line:5560 |
| A-SUP-1962 | TEXT | ここまで設計できると、かなり強いです。 | normalized-line:5561 |
| A-SUP-1963 | TEXT | 競合がCRM、ERP、広告SaaS、AIチャット、RPA、iPaaS、マーケットプレイスのどれか単体で来ても、369はそれらを束ねるAI経営OSのレイヤーに立てます。 | normalized-line:5562 |

## Function Master 126領域

| Function ID | 系列 | 状態 | 領域 | 原典 |
| --- | --- | --- | --- | --- |
| FMR-CORE-001 | 既存コア領域 | OFFICIAL_EXISTING | 基盤・組織・権限領域 | normalized-line:7626 |
| FMR-CORE-002 | 既存コア領域 | OFFICIAL_EXISTING | CRM・営業領域 | normalized-line:7627 |
| FMR-CORE-003 | 既存コア領域 | OFFICIAL_EXISTING | 見積・契約・請求・入金領域 | normalized-line:7628 |
| FMR-CORE-004 | 既存コア領域 | OFFICIAL_EXISTING | 会計・財務領域 | normalized-line:7629 |
| FMR-CORE-005 | 既存コア領域 | OFFICIAL_EXISTING | 人事・労務・勤怠領域 | normalized-line:7630 |
| FMR-CORE-006 | 既存コア領域 | OFFICIAL_EXISTING | 在庫・倉庫・リース・案件管理領域 | normalized-line:7631 |
| FMR-CORE-007 | 既存コア領域 | OFFICIAL_EXISTING | 会議・録音・議事録・ナレッジ領域 | normalized-line:7632 |
| FMR-CORE-008 | 既存コア領域 | OFFICIAL_EXISTING | コミュニケーション統合領域 | normalized-line:7633 |
| FMR-CORE-009 | 既存コア領域 | OFFICIAL_EXISTING | 経営ダッシュボード領域 | normalized-line:7634 |
| FMR-CORE-010 | 既存コア領域 | OFFICIAL_EXISTING | AI社員・AI Agent領域 | normalized-line:7635 |
| FMR-CORE-011 | 既存コア領域 | OFFICIAL_EXISTING | 課金・SaaS・クレジット領域 | normalized-line:7636 |
| FMR-CORE-012 | 既存コア領域 | OFFICIAL_EXISTING | 業種別テンプレート領域 | normalized-line:7637 |
| FMR-CORE-013 | 既存コア領域 | OFFICIAL_EXISTING | マーケティング・広告・集客・ブランド領域 | normalized-line:7638 |
| FMR-CORE-014 | 既存コア領域 | OFFICIAL_EXISTING | 受発注・購買・調達・ベンダー領域 | normalized-line:7639 |
| FMR-CORE-015 | 既存コア領域 | OFFICIAL_EXISTING | EC・注文・決済・返品・保証領域 | normalized-line:7640 |
| FMR-CORE-016 | 既存コア領域 | OFFICIAL_EXISTING | カスタマーサービス・カスタマーサクセス領域 | normalized-line:7641 |
| FMR-CORE-017 | 既存コア領域 | OFFICIAL_EXISTING | プロダクト管理・ロードマップ・PLG領域 | normalized-line:7642 |
| FMR-CORE-018 | 既存コア領域 | OFFICIAL_EXISTING | GRC・内部統制・法務・コンプライアンス領域 | normalized-line:7643 |
| FMR-CORE-019 | 既存コア領域 | OFFICIAL_EXISTING | IT運用・セキュリティ・Trust領域 | normalized-line:7644 |
| FMR-CORE-020 | 既存コア領域 | OFFICIAL_EXISTING | データ基盤・データガバナンス領域 | normalized-line:7645 |
| FMR-CORE-021 | 既存コア領域 | OFFICIAL_EXISTING | Privacy Ops・個人情報・記録管理領域 | normalized-line:7646 |
| FMR-CORE-022 | 既存コア領域 | OFFICIAL_EXISTING | 上場企業・資本政策・株主・IR領域 | normalized-line:7647 |
| FMR-CORE-023 | 既存コア領域 | OFFICIAL_EXISTING | グローバル・公共・規制産業領域 | normalized-line:7648 |
| FMR-CORE-024 | 既存コア領域 | OFFICIAL_EXISTING | 品質基盤・開発運用・自動検証領域 | normalized-line:7649 |
| FMR-V21-001 | v2.1追加50領域 | OFFICIAL_ADDITION | プロダクト管理 / ロードマップ | normalized-line:7652 |
| FMR-V21-002 | v2.1追加50領域 | OFFICIAL_ADDITION | 顧客の声 / VOC管理 | normalized-line:7653 |
| FMR-V21-003 | v2.1追加50領域 | OFFICIAL_ADDITION | プロダクト利用分析 / PLG | normalized-line:7654 |
| FMR-V21-004 | v2.1追加50領域 | OFFICIAL_ADDITION | 通知・顧客コミュニケーション統制 | normalized-line:7655 |
| FMR-V21-005 | v2.1追加50領域 | OFFICIAL_ADDITION | メール到達率・配信品質管理 | normalized-line:7656 |
| FMR-V21-006 | v2.1追加50領域 | OFFICIAL_ADDITION | Digital Asset Management / ブランド素材管理 | normalized-line:7657 |
| FMR-V21-007 | v2.1追加50領域 | OFFICIAL_ADDITION | Records Management / 記録管理 | normalized-line:7658 |
| FMR-V21-008 | v2.1追加50領域 | OFFICIAL_ADDITION | SOP / 業務標準化 | normalized-line:7659 |
| FMR-V21-009 | v2.1追加50領域 | OFFICIAL_ADDITION | 営業イネーブルメント | normalized-line:7660 |
| FMR-V21-010 | v2.1追加50領域 | OFFICIAL_ADDITION | コミッション / インセンティブ管理 | normalized-line:7661 |
| FMR-V21-011 | v2.1追加50領域 | OFFICIAL_ADDITION | テリトリー / Quota管理 | normalized-line:7662 |
| FMR-V21-012 | v2.1追加50領域 | OFFICIAL_ADDITION | 売上認識 / 繰延収益 | normalized-line:7663 |
| FMR-V21-013 | v2.1追加50領域 | OFFICIAL_ADDITION | 買掛・支払照合 / 3-Way Match | normalized-line:7664 |
| FMR-V21-014 | v2.1追加50領域 | OFFICIAL_ADDITION | 固定資産・減価償却 | normalized-line:7665 |
| FMR-V21-015 | v2.1追加50領域 | OFFICIAL_ADDITION | リース管理 | normalized-line:7666 |
| FMR-V21-016 | v2.1追加50領域 | OFFICIAL_ADDITION | 出張・旅費管理 | normalized-line:7667 |
| FMR-V21-017 | v2.1追加50領域 | OFFICIAL_ADDITION | 第三者リスク管理 / Vendor Risk | normalized-line:7668 |
| FMR-V21-018 | v2.1追加50領域 | OFFICIAL_ADDITION | セキュリティ質問票 / Trust Ops | normalized-line:7669 |
| FMR-V21-019 | v2.1追加50領域 | OFFICIAL_ADDITION | ITSM / 社内ITヘルプデスク | normalized-line:7670 |
| FMR-V21-020 | v2.1追加50領域 | OFFICIAL_ADDITION | IT資産・SaaSライセンス管理 | normalized-line:7671 |
| FMR-V21-021 | v2.1追加50領域 | OFFICIAL_ADDITION | 端末管理 / Device Management | normalized-line:7672 |
| FMR-V21-022 | v2.1追加50領域 | OFFICIAL_ADDITION | CMDB / 構成管理 | normalized-line:7673 |
| FMR-V21-023 | v2.1追加50領域 | OFFICIAL_ADDITION | データ契約 / メトリクス統制 | normalized-line:7674 |
| FMR-V21-024 | v2.1追加50領域 | OFFICIAL_ADDITION | Data Observability / データ観測性 | normalized-line:7675 |
| FMR-V21-025 | v2.1追加50領域 | OFFICIAL_ADDITION | プロダクトイベント計測 | normalized-line:7676 |
| FMR-V21-026 | v2.1追加50領域 | OFFICIAL_ADDITION | Reverse ETL / Activation | normalized-line:7677 |
| FMR-V21-027 | v2.1追加50領域 | OFFICIAL_ADDITION | MLOps / Feature Store | normalized-line:7678 |
| FMR-V21-028 | v2.1追加50領域 | OFFICIAL_ADDITION | LLM運用 / モデルルーティング / AIコスト管理 | normalized-line:7679 |
| FMR-V21-029 | v2.1追加50領域 | OFFICIAL_ADDITION | RAG / ベクトル検索 / ナレッジグラフ統制 | normalized-line:7680 |
| FMR-V21-030 | v2.1追加50領域 | OFFICIAL_ADDITION | AI緊急停止 / Human-in-the-loop | normalized-line:7681 |
| FMR-V21-031 | v2.1追加50領域 | OFFICIAL_ADDITION | 不正利用・詐欺検知 | normalized-line:7682 |
| FMR-V21-032 | v2.1追加50領域 | OFFICIAL_ADDITION | UGC / コミュニティ投稿モデレーション | normalized-line:7683 |
| FMR-V21-033 | v2.1追加50領域 | OFFICIAL_ADDITION | 内部通報制度 | normalized-line:7684 |
| FMR-V21-034 | v2.1追加50領域 | OFFICIAL_ADDITION | 制裁・輸出管理・贈収賄リスク | normalized-line:7685 |
| FMR-V21-035 | v2.1追加50領域 | OFFICIAL_ADDITION | EHS / 労働安全衛生 | normalized-line:7686 |
| FMR-V21-036 | v2.1追加50領域 | OFFICIAL_ADDITION | 株主・資本政策管理 | normalized-line:7687 |
| FMR-V21-037 | v2.1追加50領域 | OFFICIAL_ADDITION | 株主総会・コーポレートアクション | normalized-line:7688 |
| FMR-V21-038 | v2.1追加50領域 | OFFICIAL_ADDITION | 顧客エンタイトルメント管理 | normalized-line:7689 |
| FMR-V21-039 | v2.1追加50領域 | OFFICIAL_ADDITION | エンタープライズ導入・変更管理 | normalized-line:7690 |
| FMR-V21-040 | v2.1追加50領域 | OFFICIAL_ADDITION | Managed Services / 認定パートナー運用 | normalized-line:7691 |
| FMR-V21-041 | v2.1追加50領域 | OFFICIAL_ADDITION | 保証・RMA・返品修理管理 | normalized-line:7692 |
| FMR-V21-042 | v2.1追加50領域 | OFFICIAL_ADDITION | コンタクトセンターWFM / 品質管理 | normalized-line:7693 |
| FMR-V21-043 | v2.1追加50領域 | OFFICIAL_ADDITION | 価格最適化 / Pricing Intelligence | normalized-line:7694 |
| FMR-V21-044 | v2.1追加50領域 | OFFICIAL_ADDITION | 競合・市場インテリジェンス | normalized-line:7695 |
| FMR-V21-045 | v2.1追加50領域 | OFFICIAL_ADDITION | 購買カタログ / PunchOut / 調達ポータル | normalized-line:7696 |
| FMR-V21-046 | v2.1追加50領域 | OFFICIAL_ADDITION | プライバシーOps / DSAR高度管理 | normalized-line:7697 |
| FMR-V21-047 | v2.1追加50領域 | OFFICIAL_ADDITION | 規制業界向けバリデーション管理 | normalized-line:7698 |
| FMR-V21-048 | v2.1追加50領域 | OFFICIAL_ADDITION | Public Sector / 入札・公共調達管理 | normalized-line:7699 |
| FMR-V21-049 | v2.1追加50領域 | OFFICIAL_ADDITION | カスタマーオンボーディング / Time to Value | normalized-line:7700 |
| FMR-V21-050 | v2.1追加50領域 | OFFICIAL_ADDITION | Customer Trust / 顧客向け監査パッケージ | normalized-line:7701 |
| FMR-V40-001 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | PR / 広報自動化・導入発表支援 | normalized-line:7703 |
| FMR-V40-002 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | SEO / コンテンツマーケティング支援 | normalized-line:7704 |
| FMR-V40-003 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | 導入企業認定・公開プロフィール | normalized-line:7705 |
| FMR-V40-004 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | IKEZAKI Business Network | normalized-line:7706 |
| FMR-V40-005 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Trust Passport / 取引準備スコア | normalized-line:7707 |
| FMR-V40-006 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | 導入企業アワード・エコシステムイベント | normalized-line:7708 |
| FMR-V40-007 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Advocate / Affiliate Growth Engine | normalized-line:7709 |
| FMR-V40-008 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Creator Portal | normalized-line:7710 |
| FMR-V40-009 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | White-label Diagnosis Widget | normalized-line:7711 |
| FMR-V40-010 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Certification / Academy | normalized-line:7712 |
| FMR-V40-011 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Challenge / Event Engine | normalized-line:7713 |
| FMR-V40-012 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Template Bounty / Creator Marketplace | normalized-line:7714 |
| FMR-V40-013 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Public Impact Dashboard | normalized-line:7715 |
| FMR-V40-014 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Compliance / Disclosure Guard | normalized-line:7716 |
| FMR-V40-015 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Influencer Sandbox | normalized-line:7717 |
| FMR-V40-016 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Organic Content / Build in Public Engine | normalized-line:7718 |
| FMR-V40-017 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Proof-of-Value / ROI Engine | normalized-line:7719 |
| FMR-V40-018 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Self-Serve Onboarding / Zero-Friction Adoption | normalized-line:7720 |
| FMR-V40-019 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Ecosystem API / Developer Platform | normalized-line:7721 |
| FMR-V40-020 | v4.0 Growth追加領域 | OFFICIAL_ADDITION | Data Portability / Trustworthy Lock-in | normalized-line:7722 |
| FMR-V50-001 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | GitHub Evidence Repository / 開発正本管理 | normalized-line:7724 |
| FMR-V50-002 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | Obsidian Knowledge Graph / 経営ナレッジ管理 | normalized-line:7725 |
| FMR-V50-003 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | Docs / Audit / Prompt Sync Engine | normalized-line:7726 |
| FMR-V50-004 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | GitHub Issue / PR / CODEOWNERS Governance | normalized-line:7727 |
| FMR-V50-005 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | Obsidian Dashboard / 非エンジニア向け現在地可視化 | normalized-line:7728 |
| FMR-V50-006 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | Decision Log / ADR / 経営判断履歴 | normalized-line:7729 |
| FMR-V50-007 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | Prompt History / Claude Code Loop Memory | normalized-line:7730 |
| FMR-V50-008 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | GitHub to Obsidian Sync Rules | normalized-line:7731 |
| FMR-V50-009 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | Obsidian Candidate Notes to GitHub Reflection Flow | normalized-line:7732 |
| FMR-V50-010 | v5.0 GitHub / Obsidian追加領域 | OFFICIAL_ADDITION | Documentation Quality Gate | normalized-line:7733 |
| FMR-V51-001 | v5.1 Candidate | CANDIDATE | Terms / Policy / Consent Governance | normalized-line:7735 |
| FMR-V51-002 | v5.1 Candidate | CANDIDATE | Incident / BCP / Recovery Management | normalized-line:7736 |
| FMR-V51-003 | v5.1 Candidate | CANDIDATE | API / Event / Ledger Version Governance | normalized-line:7737 |
| FMR-V51-004 | v5.1 Candidate | CANDIDATE | Data Migration / Portability / Exit Management | normalized-line:7738 |
| FMR-V51-005 | v5.1 Candidate | CANDIDATE | Customer Success / Support / Education | normalized-line:7739 |
| FMR-V51-006 | v5.1 Candidate | CANDIDATE | Accessibility / Mobile / Field UX | normalized-line:7740 |
| FMR-V51-007 | v5.1 Candidate | CANDIDATE | Marketplace / Creator / Affiliate Quality Governance | normalized-line:7741 |
| FMR-V51-008 | v5.1 Candidate | CANDIDATE | AI Agent / RAG / Prompt Injection Safety | normalized-line:7742 |
| FMR-V51-009 | v5.1 Candidate | CANDIDATE | Growth KPI / Adoption KPI / Referral KPI | normalized-line:7743 |
| FMR-V52-001 | v5.2 Candidate | CANDIDATE | Environment / Release / Deployment Governance | normalized-line:7745 |
| FMR-V52-002 | v5.2 Candidate | CANDIDATE | Supply Chain / Dependency / License Security | normalized-line:7746 |
| FMR-V52-003 | v5.2 Candidate | CANDIDATE | Test Matrix / QA Automation Governance | normalized-line:7747 |
| FMR-V52-004 | v5.2 Candidate | CANDIDATE | SLO / SLA / Observability / Reliability Engineering | normalized-line:7748 |
| FMR-V52-005 | v5.2 Candidate | CANDIDATE | Data Classification / Data Residency / Data Protection Governance | normalized-line:7749 |
| FMR-V52-006 | v5.2 Candidate | CANDIDATE | Enterprise Procurement / Security Review / Sales Ops | normalized-line:7750 |
| FMR-V52-007 | v5.2 Candidate | CANDIDATE | Unit Economics / Pricing / AI Gross Margin Governance | normalized-line:7751 |
| FMR-V52-008 | v5.2 Candidate | CANDIDATE | Global Localization / Tax / E-invoicing Compliance | normalized-line:7752 |
| FMR-V52-009 | v5.2 Candidate | CANDIDATE | Abuse / Spam / Rate Limit / Invite Governance | normalized-line:7753 |
| FMR-V52-010 | v5.2 Candidate | CANDIDATE | Partner Payout / Revenue Share / Tax Governance | normalized-line:7754 |
| FMR-V52-011 | v5.2 Candidate | CANDIDATE | Legal Evidence / eDiscovery / Litigation Support | normalized-line:7755 |
| FMR-V52-012 | v5.2 Candidate | CANDIDATE | Sector-Specific Deep Templates | normalized-line:7756 |
| FMR-V52-013 | v5.2 Candidate | CANDIDATE | Human Organization / RACI / Ownership Governance | normalized-line:7757 |

## FM231-FM252 Candidate

> Candidateのまま保持します。DB・API・画面・正式Function Masterへの昇格は別承認です。

### FM231 Terms / Policy / Consent Governance

- group source: normalized-line:7762

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM231-001 | TEXT | 利用規約 | normalized-line:7764 |
| FM231-002 | TEXT | プライバシーポリシー | normalized-line:7765 |
| FM231-003 | TEXT | Cookieポリシー | normalized-line:7766 |
| FM231-004 | TEXT | AI利用規約 | normalized-line:7767 |
| FM231-005 | TEXT | AI生成物利用方針 | normalized-line:7768 |
| FM231-006 | TEXT | アフィリエイト規約 | normalized-line:7769 |
| FM231-007 | TEXT | 紹介プログラム規約 | normalized-line:7770 |
| FM231-008 | TEXT | Creator規約 | normalized-line:7771 |
| FM231-009 | TEXT | Marketplace規約 | normalized-line:7772 |
| FM231-010 | TEXT | Business Network利用規約 | normalized-line:7773 |
| FM231-011 | TEXT | Trust Passport公開規約 | normalized-line:7774 |
| FM231-012 | TEXT | 導入企業ページ公開許諾 | normalized-line:7775 |
| FM231-013 | TEXT | 導入事例公開許諾 | normalized-line:7776 |
| FM231-014 | TEXT | プレスリリース公開許諾 | normalized-line:7777 |
| FM231-015 | TEXT | 成果数値掲載許諾 | normalized-line:7778 |
| FM231-016 | TEXT | 顧客名掲載許諾 | normalized-line:7779 |
| FM231-017 | TEXT | 取引先名掲載許諾 | normalized-line:7780 |
| FM231-018 | TEXT | ホワイトラベル診断リード共有同意 | normalized-line:7781 |
| FM231-019 | TEXT | オプトイン / オプトアウト | normalized-line:7782 |
| FM231-020 | TEXT | 同意履歴 | normalized-line:7783 |
| FM231-021 | TEXT | 同意バージョン管理 | normalized-line:7784 |
| FM231-022 | TEXT | 同意撤回 | normalized-line:7785 |
| FM231-023 | TEXT | 法務確認フロー | normalized-line:7786 |

### FM232 Incident / BCP / Recovery Management

- group source: normalized-line:7787

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM232-001 | TEXT | インシデント管理 | normalized-line:7789 |
| FM232-002 | TEXT | 障害検知 | normalized-line:7790 |
| FM232-003 | TEXT | 重大度分類 | normalized-line:7791 |
| FM232-004 | TEXT | 影響範囲分析 | normalized-line:7792 |
| FM232-005 | TEXT | AI誤実行検知 | normalized-line:7793 |
| FM232-006 | TEXT | 外部送信事故検知 | normalized-line:7794 |
| FM232-007 | TEXT | 個人情報漏えい疑い検知 | normalized-line:7795 |
| FM232-008 | TEXT | 権限漏れ検知 | normalized-line:7796 |
| FM232-009 | TEXT | tenantId越境疑い検知 | normalized-line:7797 |
| FM232-010 | TEXT | 誤請求検知 | normalized-line:7798 |
| FM232-011 | TEXT | ステータスページ | normalized-line:7799 |
| FM232-012 | TEXT | 顧客通知下書き | normalized-line:7800 |
| FM232-013 | TEXT | 復旧手順 | normalized-line:7801 |
| FM232-014 | TEXT | rollback plan | normalized-line:7802 |
| FM232-015 | TEXT | backup / restore確認 | normalized-line:7803 |
| FM232-016 | TEXT | RPO / RTO | normalized-line:7804 |
| FM232-017 | TEXT | BCP手順 | normalized-line:7805 |
| FM232-018 | TEXT | postmortem | normalized-line:7806 |
| FM232-019 | TEXT | audit記録 | normalized-line:7807 |

### FM233 API / Event / Ledger Version Governance

- group source: normalized-line:7808

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM233-001 | TEXT | API versioning | normalized-line:7810 |
| FM233-002 | TEXT | Event schema versioning | normalized-line:7811 |
| FM233-003 | TEXT | Business Event Ledger versioning | normalized-line:7812 |
| FM233-004 | TEXT | AI Execution Ledger versioning | normalized-line:7813 |
| FM233-005 | TEXT | Webhook versioning | normalized-line:7814 |
| FM233-006 | TEXT | Connector versioning | normalized-line:7815 |
| FM233-007 | TEXT | backward compatibility | normalized-line:7816 |
| FM233-008 | TEXT | deprecation policy | normalized-line:7817 |
| FM233-009 | TEXT | changelog | normalized-line:7818 |
| FM233-010 | TEXT | breaking change approval | normalized-line:7819 |
| FM233-011 | TEXT | migration guide | normalized-line:7820 |
| FM233-012 | TEXT | SDK versioning | normalized-line:7821 |
| FM233-013 | TEXT | API contract tests | normalized-line:7822 |
| FM233-014 | TEXT | Event contract tests | normalized-line:7823 |
| FM233-015 | TEXT | idempotency key | normalized-line:7824 |
| FM233-016 | TEXT | retry policy | normalized-line:7825 |
| FM233-017 | TEXT | outbox pattern | normalized-line:7826 |

### FM234 Data Migration / Portability / Exit Management

- group source: normalized-line:7827

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM234-001 | TEXT | CSV / Excel / PDF OCR取り込み | normalized-line:7829 |
| FM234-002 | TEXT | 既存CRM取り込み | normalized-line:7830 |
| FM234-003 | TEXT | 会計ソフト取り込み | normalized-line:7831 |
| FM234-004 | TEXT | 請求書取り込み | normalized-line:7832 |
| FM234-005 | TEXT | 顧客DB名寄せ | normalized-line:7833 |
| FM234-006 | TEXT | 重複統合 | normalized-line:7834 |
| FM234-007 | TEXT | データ品質スコア | normalized-line:7835 |
| FM234-008 | TEXT | 移行前診断 | normalized-line:7836 |
| FM234-009 | TEXT | 移行リハーサル | normalized-line:7837 |
| FM234-010 | TEXT | ロールバック計画 | normalized-line:7838 |
| FM234-011 | TEXT | データエクスポート | normalized-line:7839 |
| FM234-012 | TEXT | 監査ログエクスポート | normalized-line:7840 |
| FM234-013 | TEXT | AI実行履歴エクスポート | normalized-line:7841 |
| FM234-014 | TEXT | 解約時データ返却 | normalized-line:7842 |
| FM234-015 | TEXT | 解約時データ削除申請 | normalized-line:7843 |
| FM234-016 | TEXT | Legal Hold確認 | normalized-line:7844 |
| FM234-017 | TEXT | データ削除証明 | normalized-line:7845 |

### FM235 Customer Success / Support / Education

- group source: normalized-line:7846

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM235-001 | TEXT | セルフオンボーディング | normalized-line:7848 |
| FM235-002 | TEXT | 初期設定チェックリスト | normalized-line:7849 |
| FM235-003 | TEXT | 業種別導入ガイド | normalized-line:7850 |
| FM235-004 | TEXT | 社長向け / 営業向け / 経理向け / 人事向け / 士業向けガイド | normalized-line:7851 |
| FM235-005 | TEXT | ヘルプセンター | normalized-line:7852 |
| FM235-006 | TEXT | FAQ | normalized-line:7853 |
| FM235-007 | TEXT | チュートリアル | normalized-line:7854 |
| FM235-008 | TEXT | 動画教材 | normalized-line:7855 |
| FM235-009 | TEXT | AIチャットサポート | normalized-line:7856 |
| FM235-010 | TEXT | サポートチケット | normalized-line:7857 |
| FM235-011 | TEXT | 導入成功スコア | normalized-line:7858 |
| FM235-012 | TEXT | 利用定着スコア | normalized-line:7859 |
| FM235-013 | TEXT | 解約予兆 | normalized-line:7860 |
| FM235-014 | TEXT | Time to Value | normalized-line:7861 |
| FM235-015 | TEXT | 30日オンボーディング | normalized-line:7862 |
| FM235-016 | TEXT | 90日活用レビュー | normalized-line:7863 |
| FM235-017 | TEXT | ウェビナー | normalized-line:7864 |
| FM235-018 | TEXT | 認定講座 | normalized-line:7865 |
| FM235-019 | TEXT | CSレポート | normalized-line:7866 |

### FM236 Accessibility / Mobile / Field UX

- group source: normalized-line:7867

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM236-001 | TEXT | モバイル対応 | normalized-line:7869 |
| FM236-002 | TEXT | スマホ完結 | normalized-line:7870 |
| FM236-003 | TEXT | タブレット対応 | normalized-line:7871 |
| FM236-004 | TEXT | 現場モード | normalized-line:7872 |
| FM236-005 | TEXT | オフライン入力候補 | normalized-line:7873 |
| FM236-006 | TEXT | QR入力 | normalized-line:7874 |
| FM236-007 | TEXT | 音声入力 | normalized-line:7875 |
| FM236-008 | TEXT | 写真入力 | normalized-line:7876 |
| FM236-009 | TEXT | 手書きメモOCR | normalized-line:7877 |
| FM236-010 | TEXT | 大きいボタンUI | normalized-line:7878 |
| FM236-011 | TEXT | 非IT企業向けUI | normalized-line:7879 |
| FM236-012 | TEXT | 低回線モード | normalized-line:7880 |
| FM236-013 | TEXT | ダークモード | normalized-line:7881 |
| FM236-014 | TEXT | アクセシビリティ対応 | normalized-line:7882 |
| FM236-015 | TEXT | スクリーンリーダー対応 | normalized-line:7883 |
| FM236-016 | TEXT | 色覚配慮 | normalized-line:7884 |
| FM236-017 | TEXT | 多言語UI | normalized-line:7885 |
| FM236-018 | TEXT | やさしい日本語 | normalized-line:7886 |
| FM236-019 | TEXT | 業種別簡易UI | normalized-line:7887 |
| FM236-020 | TEXT | 社長モード | normalized-line:7888 |
| FM236-021 | TEXT | 現場スタッフモード | normalized-line:7889 |
| FM236-022 | TEXT | 経理モード | normalized-line:7890 |
| FM236-023 | TEXT | 営業モード | normalized-line:7891 |

### FM237 Marketplace / Creator / Affiliate Quality Governance

- group source: normalized-line:7892

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM237-001 | TEXT | Creator審査 | normalized-line:7894 |
| FM237-002 | TEXT | Affiliate審査 | normalized-line:7895 |
| FM237-003 | TEXT | Advisor審査 | normalized-line:7896 |
| FM237-004 | TEXT | Template審査 | normalized-line:7897 |
| FM237-005 | TEXT | App審査 | normalized-line:7898 |
| FM237-006 | TEXT | AI Skill審査 | normalized-line:7899 |
| FM237-007 | TEXT | 禁止コンテンツチェック | normalized-line:7900 |
| FM237-008 | TEXT | 誇大表現チェック | normalized-line:7901 |
| FM237-009 | TEXT | 権利侵害チェック | normalized-line:7902 |
| FM237-010 | TEXT | 著作権チェック | normalized-line:7903 |
| FM237-011 | TEXT | 商標チェック | normalized-line:7904 |
| FM237-012 | TEXT | 個人情報混入チェック | normalized-line:7905 |
| FM237-013 | TEXT | セキュリティチェック | normalized-line:7906 |
| FM237-014 | TEXT | テンプレート品質スコア | normalized-line:7907 |
| FM237-015 | TEXT | 利用者レビュー | normalized-line:7908 |
| FM237-016 | TEXT | 通報 | normalized-line:7909 |
| FM237-017 | TEXT | 公開停止 | normalized-line:7910 |
| FM237-018 | TEXT | 違反履歴 | normalized-line:7911 |
| FM237-019 | TEXT | 報酬停止 | normalized-line:7912 |
| FM237-020 | TEXT | 不正紹介検知 | normalized-line:7913 |
| FM237-021 | TEXT | 架空企業検知 | normalized-line:7914 |
| FM237-022 | TEXT | チャージバック監視 | normalized-line:7915 |
| FM237-023 | TEXT | 紹介報酬上限 | normalized-line:7916 |
| FM237-024 | TEXT | Affiliate開示義務 | normalized-line:7917 |
| FM237-025 | TEXT | Marketplace監査ログ | normalized-line:7918 |

### FM238 AI Agent / RAG / Prompt Injection Safety

- group source: normalized-line:7919

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM238-001 | TEXT | Prompt Injection検知 | normalized-line:7921 |
| FM238-002 | TEXT | RAG権限フィルタ | normalized-line:7922 |
| FM238-003 | TEXT | tenantId付きRAG検索 | normalized-line:7923 |
| FM238-004 | TEXT | 機密ラベル検索制限 | normalized-line:7924 |
| FM238-005 | TEXT | 外部送信前PII検知 | normalized-line:7925 |
| FM238-006 | TEXT | Tool使用権限 | normalized-line:7926 |
| FM238-007 | TEXT | AI Run承認 | normalized-line:7927 |
| FM238-008 | TEXT | AI提案のみモード | normalized-line:7928 |
| FM238-009 | TEXT | AI read-onlyモード | normalized-line:7929 |
| FM238-010 | TEXT | AI Kill Switch | normalized-line:7930 |
| FM238-011 | TEXT | Model Router | normalized-line:7931 |
| FM238-012 | TEXT | 高額モデル承認 | normalized-line:7932 |
| FM238-013 | TEXT | AI Cost Budget | normalized-line:7933 |
| FM238-014 | TEXT | AI出力根拠表示 | normalized-line:7934 |
| FM238-015 | TEXT | AI引用管理 | normalized-line:7935 |
| FM238-016 | TEXT | AI幻覚リスク表示 | normalized-line:7936 |
| FM238-017 | TEXT | RAGソース表示 | normalized-line:7937 |
| FM238-018 | TEXT | AI Execution Ledger | normalized-line:7938 |
| FM238-019 | TEXT | Agent evals | normalized-line:7939 |
| FM238-020 | TEXT | Red team tests | normalized-line:7940 |
| FM238-021 | TEXT | jailbreak tests | normalized-line:7941 |
| FM238-022 | TEXT | unsafe output tests | normalized-line:7942 |
| FM238-023 | TEXT | PII leakage tests | normalized-line:7943 |
| FM238-024 | TEXT | prompt injection tests | normalized-line:7944 |
| FM238-025 | TEXT | tool abuse tests | normalized-line:7945 |
| FM238-026 | TEXT | regression tests | normalized-line:7946 |

### FM239 Growth KPI / Adoption KPI / Referral KPI

- group source: normalized-line:7947

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM239-001 | LABEL | 導入KPI: | normalized-line:7948 |
| FM239-002 | TEXT | 無料診断数 | normalized-line:7949 |
| FM239-003 | TEXT | 診断完了率 | normalized-line:7950 |
| FM239-004 | TEXT | 初回登録率 | normalized-line:7951 |
| FM239-005 | TEXT | Time to First Value | normalized-line:7952 |
| FM239-006 | TEXT | Activation Rate | normalized-line:7953 |
| FM239-007 | TEXT | Onboarding Completion | normalized-line:7954 |
| FM239-008 | TEXT | 初回請求書作成率 | normalized-line:7955 |
| FM239-009 | TEXT | 初回見積作成率 | normalized-line:7956 |
| FM239-010 | TEXT | 初回AI診断完了率 | normalized-line:7957 |
| FM239-011 | TEXT | 初回共有率 | normalized-line:7958 |
| FM239-012 | TEXT | 初回取引先招待率 | normalized-line:7959 |
| FM239-013 | TEXT | 初回士業共有率 | normalized-line:7960 |
| FM239-014 | LABEL | 継続KPI: | normalized-line:7961 |
| FM239-015 | TEXT | Weekly Active Company | normalized-line:7962 |
| FM239-016 | TEXT | Monthly Active Company | normalized-line:7963 |
| FM239-017 | TEXT | Active Users per Company | normalized-line:7964 |
| FM239-018 | TEXT | Feature Adoption | normalized-line:7965 |
| FM239-019 | TEXT | AI Runs per Company | normalized-line:7966 |
| FM239-020 | TEXT | Invoice Volume | normalized-line:7967 |
| FM239-021 | TEXT | Quote Volume | normalized-line:7968 |
| FM239-022 | TEXT | Business Network Transactions | normalized-line:7969 |
| FM239-023 | TEXT | PR Created | normalized-line:7970 |
| FM239-024 | TEXT | SEO Pages Created | normalized-line:7971 |
| FM239-025 | TEXT | Referral Links Created | normalized-line:7972 |
| FM239-026 | TEXT | Reports Shared | normalized-line:7973 |
| FM239-027 | TEXT | Retention | normalized-line:7974 |
| FM239-028 | TEXT | Churn | normalized-line:7975 |
| FM239-029 | TEXT | Expansion | normalized-line:7976 |
| FM239-030 | LABEL | 紹介KPI: | normalized-line:7977 |
| FM239-031 | TEXT | Referral Link Created | normalized-line:7978 |
| FM239-032 | TEXT | Referral Link Clicked | normalized-line:7979 |
| FM239-033 | TEXT | Invite Acceptance Rate | normalized-line:7980 |
| FM239-034 | TEXT | Referral Activation Rate | normalized-line:7981 |
| FM239-035 | TEXT | Referral Conversion Rate | normalized-line:7982 |
| FM239-036 | TEXT | Viral Coefficient | normalized-line:7983 |
| FM239-037 | TEXT | Referrals per Company | normalized-line:7984 |
| FM239-038 | TEXT | Referrals per Creator | normalized-line:7985 |
| FM239-039 | TEXT | Network Invites Sent | normalized-line:7986 |
| FM239-040 | TEXT | Network Invites Accepted | normalized-line:7987 |
| FM239-041 | TEXT | 240-252 Summary | normalized-line:7988 |

### FM240 Environment / Release / Deployment Governance:

- group source: normalized-line:7989

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM240-001 | TEXT | local / preview / staging / production | normalized-line:7990 |
| FM240-002 | TEXT | Feature Flag | normalized-line:7991 |
| FM240-003 | TEXT | Canary | normalized-line:7992 |
| FM240-004 | TEXT | Blue / Green | normalized-line:7993 |
| FM240-005 | TEXT | Rollback | normalized-line:7994 |
| FM240-006 | TEXT | Release checklist | normalized-line:7995 |
| FM240-007 | TEXT | Release approval | normalized-line:7996 |
| FM240-008 | TEXT | Post-release verification | normalized-line:7997 |
| FM240-009 | TEXT | Release HOLD | normalized-line:7998 |

### FM241 Supply Chain / Dependency / License Security:

- group source: normalized-line:7999

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM241-001 | TEXT | dependency policy | normalized-line:8000 |
| FM241-002 | TEXT | package追加承認 | normalized-line:8001 |
| FM241-003 | TEXT | lockfile policy | normalized-line:8002 |
| FM241-004 | TEXT | license check | normalized-line:8003 |
| FM241-005 | TEXT | SAST | normalized-line:8004 |
| FM241-006 | TEXT | SBOM | normalized-line:8005 |
| FM241-007 | TEXT | npm script audit | normalized-line:8006 |
| FM241-008 | TEXT | typosquatting対策 | normalized-line:8007 |
| FM241-009 | TEXT | security advisory tracking | normalized-line:8008 |

### FM242 Test Matrix / QA Automation Governance:

- group source: normalized-line:8009

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM242-001 | TEXT | unit / integration / server action / API / contract / E2E | normalized-line:8010 |
| FM242-002 | TEXT | negative test | normalized-line:8011 |
| FM242-003 | TEXT | tenant isolation | normalized-line:8012 |
| FM242-004 | TEXT | permission | normalized-line:8013 |
| FM242-005 | TEXT | accessibility | normalized-line:8014 |
| FM242-006 | TEXT | AI eval | normalized-line:8015 |
| FM242-007 | TEXT | RAG permission | normalized-line:8016 |
| FM242-008 | TEXT | prompt injection | normalized-line:8017 |
| FM242-009 | TEXT | external sending guard | normalized-line:8018 |
| FM242-010 | TEXT | audit log test | normalized-line:8019 |

### FM243 SLO / SLA / Observability:

- group source: normalized-line:8020

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM243-001 | TEXT | SLO / SLA | normalized-line:8021 |
| FM243-002 | TEXT | Error budget | normalized-line:8022 |
| FM243-003 | TEXT | uptime | normalized-line:8023 |
| FM243-004 | TEXT | latency | normalized-line:8024 |
| FM243-005 | TEXT | error rate | normalized-line:8025 |
| FM243-006 | TEXT | alert policy | normalized-line:8026 |
| FM243-007 | TEXT | runbook | normalized-line:8027 |
| FM243-008 | TEXT | dashboard | normalized-line:8028 |
| FM243-009 | TEXT | traces / logs / metrics | normalized-line:8029 |
| FM243-010 | TEXT | status page | normalized-line:8030 |
| FM243-011 | TEXT | postmortem | normalized-line:8031 |

### FM244 Data Classification / Residency / Protection:

- group source: normalized-line:8032

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM244-001 | TEXT | public / internal / confidential / restricted | normalized-line:8033 |
| FM244-002 | TEXT | PII | normalized-line:8034 |
| FM244-003 | TEXT | employee / financial / contract / health / location / audio data | normalized-line:8035 |
| FM244-004 | TEXT | AI input / output | normalized-line:8036 |
| FM244-005 | TEXT | data residency | normalized-line:8037 |
| FM244-006 | TEXT | retention | normalized-line:8038 |
| FM244-007 | TEXT | deletion | normalized-line:8039 |
| FM244-008 | TEXT | encryption | normalized-line:8040 |
| FM244-009 | TEXT | key management | normalized-line:8041 |
| FM244-010 | TEXT | data access review | normalized-line:8042 |

### FM245 Enterprise Procurement / Security Review / Sales Ops:

- group source: normalized-line:8043

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM245-001 | TEXT | procurement package | normalized-line:8044 |
| FM245-002 | TEXT | vendor registration | normalized-line:8045 |
| FM245-003 | TEXT | security review | normalized-line:8046 |
| FM245-004 | TEXT | legal review | normalized-line:8047 |
| FM245-005 | TEXT | DPA / MSA / SLA | normalized-line:8048 |
| FM245-006 | TEXT | purchase order | normalized-line:8049 |
| FM245-007 | TEXT | InfoSec questionnaire | normalized-line:8050 |
| FM245-008 | TEXT | PoC success criteria | normalized-line:8051 |
| FM245-009 | TEXT | stakeholder map | normalized-line:8052 |
| FM245-010 | TEXT | enterprise onboarding | normalized-line:8053 |

### FM246 Unit Economics / Pricing / AI Gross Margin:

- group source: normalized-line:8054

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM246-001 | TEXT | gross margin | normalized-line:8055 |
| FM246-002 | TEXT | AI COGS | normalized-line:8056 |
| FM246-003 | TEXT | customer-level margin | normalized-line:8057 |
| FM246-004 | TEXT | feature-level margin | normalized-line:8058 |
| FM246-005 | TEXT | free plan cost cap | normalized-line:8059 |
| FM246-006 | TEXT | trial cost cap | normalized-line:8060 |
| FM246-007 | TEXT | referral reward cost | normalized-line:8061 |
| FM246-008 | TEXT | LTV / CAC / NRR | normalized-line:8062 |
| FM246-009 | TEXT | model routing by margin | normalized-line:8063 |
| FM246-010 | TEXT | margin alert | normalized-line:8064 |

### FM247 Global Localization / Tax / E-invoicing:

- group source: normalized-line:8065

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM247-001 | TEXT | country-specific invoicing | normalized-line:8066 |
| FM247-002 | TEXT | VAT / GST / consumption tax | normalized-line:8067 |
| FM247-003 | TEXT | local invoice format | normalized-line:8068 |
| FM247-004 | TEXT | currency rounding | normalized-line:8069 |
| FM247-005 | TEXT | timezone | normalized-line:8070 |
| FM247-006 | TEXT | language | normalized-line:8071 |
| FM247-007 | TEXT | PEPPOL候補 | normalized-line:8072 |
| FM247-008 | TEXT | インボイス制度対応候補 | normalized-line:8073 |
| FM247-009 | TEXT | 電子帳簿保存法対応候補 | normalized-line:8074 |

### FM248 Abuse / Spam / Rate Limit / Invite Governance:

- group source: normalized-line:8075

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM248-001 | TEXT | invite rate limit | normalized-line:8076 |
| FM248-002 | TEXT | referral abuse detection | normalized-line:8077 |
| FM248-003 | TEXT | bot detection | normalized-line:8078 |
| FM248-004 | TEXT | affiliate fraud detection | normalized-line:8079 |
| FM248-005 | TEXT | SEO spam prevention | normalized-line:8080 |
| FM248-006 | TEXT | mass invite approval | normalized-line:8081 |
| FM248-007 | TEXT | trust & safety queue | normalized-line:8082 |
| FM248-008 | TEXT | account suspension | normalized-line:8083 |
| FM248-009 | TEXT | appeal workflow | normalized-line:8084 |

### FM249 Partner Payout / Revenue Share / Tax Governance:

- group source: normalized-line:8085

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM249-001 | TEXT | payout account | normalized-line:8086 |
| FM249-002 | TEXT | revenue share | normalized-line:8087 |
| FM249-003 | TEXT | creator revenue | normalized-line:8088 |
| FM249-004 | TEXT | marketplace fee | normalized-line:8089 |
| FM249-005 | TEXT | affiliate commission | normalized-line:8090 |
| FM249-006 | TEXT | withholding tax | normalized-line:8091 |
| FM249-007 | TEXT | payout hold | normalized-line:8092 |
| FM249-008 | TEXT | dispute | normalized-line:8093 |
| FM249-009 | TEXT | chargeback adjustment | normalized-line:8094 |
| FM249-010 | TEXT | payout audit log | normalized-line:8095 |

### FM250 Legal Evidence / eDiscovery / Litigation Support:

- group source: normalized-line:8096

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM250-001 | TEXT | eDiscovery | normalized-line:8097 |
| FM250-002 | TEXT | legal evidence export | normalized-line:8098 |
| FM250-003 | TEXT | litigation hold | normalized-line:8099 |
| FM250-004 | TEXT | audit trail export | normalized-line:8100 |
| FM250-005 | TEXT | immutable log candidate | normalized-line:8101 |
| FM250-006 | TEXT | chain of custody | normalized-line:8102 |
| FM250-007 | TEXT | legal request workflow | normalized-line:8103 |
| FM250-008 | TEXT | redaction | normalized-line:8104 |
| FM250-009 | TEXT | evidence hash | normalized-line:8105 |

### FM251 Sector-Specific Deep Templates:

- group source: normalized-line:8106

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM251-001 | TEXT | construction | normalized-line:8107 |
| FM251-002 | TEXT | healthcare | normalized-line:8108 |
| FM251-003 | TEXT | beauty salon | normalized-line:8109 |
| FM251-004 | TEXT | restaurant | normalized-line:8110 |
| FM251-005 | TEXT | logistics | normalized-line:8111 |
| FM251-006 | TEXT | manufacturing | normalized-line:8112 |
| FM251-007 | TEXT | EC | normalized-line:8113 |
| FM251-008 | TEXT | SaaS | normalized-line:8114 |
| FM251-009 | TEXT | professional services | normalized-line:8115 |
| FM251-010 | TEXT | education | normalized-line:8116 |
| FM251-011 | TEXT | public sector | normalized-line:8117 |
| FM251-012 | TEXT | regulated industry | normalized-line:8118 |
| FM251-013 | TEXT | franchise | normalized-line:8119 |
| FM251-014 | TEXT | industry KPI | normalized-line:8120 |
| FM251-015 | TEXT | industry workflows | normalized-line:8121 |
| FM251-016 | TEXT | industry AI agents | normalized-line:8122 |

### FM252 Human Organization / RACI / Ownership:

- group source: normalized-line:8123

| Function ID | 種別 | 候補機能 | 原典 |
| --- | --- | --- | --- |
| FM252-001 | TEXT | RACI | normalized-line:8124 |
| FM252-002 | TEXT | owner | normalized-line:8125 |
| FM252-003 | TEXT | approver | normalized-line:8126 |
| FM252-004 | TEXT | reviewer | normalized-line:8127 |
| FM252-005 | TEXT | security owner | normalized-line:8128 |
| FM252-006 | TEXT | data owner | normalized-line:8129 |
| FM252-007 | TEXT | AI safety owner | normalized-line:8130 |
| FM252-008 | TEXT | billing owner | normalized-line:8131 |
| FM252-009 | TEXT | legal owner | normalized-line:8132 |
| FM252-010 | TEXT | growth owner | normalized-line:8133 |
| FM252-011 | TEXT | incident commander | normalized-line:8134 |
| FM252-012 | TEXT | docs owner | normalized-line:8135 |
| FM252-013 | TEXT | prompt owner | normalized-line:8136 |
| FM252-014 | TEXT | Obsidian owner | normalized-line:8137 |
| FM252-015 | TEXT | GitHub owner | normalized-line:8138 |
| FM252-016 | TEXT | escalation path | normalized-line:8139 |
| FM252-017 | TEXT | decision authority | normalized-line:8140 |

## Appendix B 要件

Function MasterとFM231-FM252以外の、製品構造、ロードマップ、成長、安全、禁止、運用ガバナンスを節別に保持します。

### B00 結論

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:5586

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B00-001 | TEXT | 今やるべきことは、コード実装ではなく、GitHub docs の正本整備です。 | normalized-line:5587 |
| B00-002 | TEXT | IKEZAKI OS / 369 は、単なる多機能SaaSではありません。 | normalized-line:5588 |
| B00-003 | TEXT | 正しい定義は以下です。 | normalized-line:5589 |
| B00-004 | TEXT | 369 / IKEZAKI OS は、AI社員・AI補助社員・業務AIエージェントを、作成・配布・実行・管理・評価・課金・改善できる AI Workforce Infrastructure である。 | normalized-line:5590 |
| B00-005 | TEXT | 別の言い方では、 | normalized-line:5591 |
| B00-006 | TEXT | 会社の意思・情報・許可・行動・証跡を、AIが安全に使える形に変換する経営OSである。 | normalized-line:5592 |
| B00-007 | TEXT | 今回の作業では、この定義に沿って、以下をGitHub docs上で追える状態にしてください。 | normalized-line:5593 |
| B00-008 | TEXT | Core OS | normalized-line:5594 |
| B00-009 | TEXT | Company Brain | normalized-line:5595 |
| B00-010 | TEXT | AI社員 / AI補助社員 | normalized-line:5596 |
| B00-011 | TEXT | Human Certification Gate | normalized-line:5597 |
| B00-012 | TEXT | CRM / Salesforce Layer | normalized-line:5598 |
| B00-013 | TEXT | ERP / Oracle Layer | normalized-line:5599 |
| B00-014 | TEXT | AI Growth Engine | normalized-line:5600 |
| B00-015 | TEXT | PLUG Commerce / Procurement Network | normalized-line:5601 |
| B00-016 | TEXT | 369 Employee App | normalized-line:5602 |
| B00-017 | TEXT | Developer Cloud | normalized-line:5603 |
| B00-018 | TEXT | AI Employee Studio | normalized-line:5604 |
| B00-019 | TEXT | Agent Runtime | normalized-line:5605 |
| B00-020 | TEXT | Agent Manifest / Tool Manifest | normalized-line:5606 |
| B00-021 | TEXT | Safety Review / Certification | normalized-line:5607 |
| B00-022 | TEXT | AI社員 Marketplace | normalized-line:5608 |
| B00-023 | TEXT | Revenue Share / Billing Meter | normalized-line:5609 |
| B00-024 | TEXT | 特許・商標・営業秘密・Runtime依存による moat | normalized-line:5610 |
| B00-025 | TEXT | GitHub Evidence Repository | normalized-line:5611 |
| B00-026 | TEXT | Obsidian Knowledge Graph | normalized-line:5612 |
| B00-027 | TEXT | Zero Ad Growth / PR / SEO / Business Network / Advocate / Affiliate / Creator Growth | normalized-line:5613 |
| B00-028 | TEXT | Release / Supply Chain / SLO / Unit Economics / Data Classification / Enterprise Procurement | normalized-line:5614 |

### B01 最重要安全ルール

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:5615

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B01-001 | TEXT | 以下は絶対です。 | normalized-line:5616 |
| B01-002 | TEXT | 明示承認なしに commit しない | normalized-line:5617 |
| B01-003 | TEXT | 明示承認なしに push しない | normalized-line:5618 |
| B01-004 | TEXT | 明示承認なしに deploy しない | normalized-line:5619 |
| B01-005 | TEXT | amend / rebase / force push をしない | normalized-line:5620 |
| B01-006 | TEXT | git reset --hard をしない | normalized-line:5621 |
| B01-007 | TEXT | git clean -fd / git clean -fdx をしない | normalized-line:5622 |
| B01-008 | TEXT | git restore / git checkout -- / git stash -u を勝手に使わない | normalized-line:5623 |
| B01-009 | TEXT | rm -rf を使わない | normalized-line:5624 |
| B01-010 | TEXT | chmod -R 777 / chown -R を使わない | normalized-line:5625 |
| B01-011 | TEXT | package一括更新をしない | normalized-line:5626 |
| B01-012 | TEXT | lockfileを無根拠に再生成しない | normalized-line:5627 |
| B01-013 | TEXT | npm audit fix --force をしない | normalized-line:5628 |
| B01-014 | TEXT | DB migration をしない | normalized-line:5629 |
| B01-015 | TEXT | Prisma migration をしない | normalized-line:5630 |
| B01-016 | TEXT | Supabase RLS を変更しない | normalized-line:5631 |
| B01-017 | TEXT | 認証・権限・tenantId条件を緩めない | normalized-line:5632 |
| B01-018 | TEXT | 本番DBへ接続しない | normalized-line:5633 |
| B01-019 | TEXT | 本番APIへ書き込まない | normalized-line:5634 |
| B01-020 | TEXT | 本番deployしない | normalized-line:5635 |
| B01-021 | TEXT | 実LLMキーを設定しない | normalized-line:5636 |
| B01-022 | TEXT | 実LLM APIを呼び出さない | normalized-line:5637 |
| B01-023 | TEXT | AIコストを発生させない | normalized-line:5638 |
| B01-024 | TEXT | 外部メール、Slack、LINE、Teams、SMS、PR配信、SEO公開、導入企業ページ公開をしない | normalized-line:5639 |
| B01-025 | TEXT | 顧客情報、個人情報、secrets、環境変数、OAuth token、cookie、private key、本番ログ生データを出力しない | normalized-line:5640 |
| B01-026 | TEXT | 既存audit docs、HOLD記録、release check記録を一括改変しない | normalized-line:5641 |
| B01-027 | TEXT | 既存audit docsへfrontmatterを一括適用しない | normalized-line:5642 |
| B01-028 | TEXT | 369-vaultを直接編集しない | normalized-line:5643 |
| B01-029 | TEXT | 369-vaultへファイルを移動しない | normalized-line:5644 |
| B01-030 | TEXT | 369-vaultをGitHub正本として扱わない | normalized-line:5645 |
| B01-031 | TEXT | Obsidianだけで正式判断を完結しない | normalized-line:5646 |
| B01-032 | TEXT | Function Master 231-252 を正式昇格しない | normalized-line:5647 |
| B01-033 | TEXT | Growth関連機能を一括実装しない | normalized-line:5648 |
| B01-034 | TEXT | PLUG型アフィリエイトを不透明なリンク差し替えとして設計しない | normalized-line:5649 |
| B01-035 | TEXT | 従業員の個人購買データを会社管理画面へ出す設計をしない | normalized-line:5650 |
| B01-036 | TEXT | AI社員が請求、送金、契約、外部送信、広告変更、採用評価、会計確定を単独実行する設計をしない | normalized-line:5651 |
| B01-037 | TEXT | 安全な代替は以下です。 | normalized-line:5652 |
| B01-038 | TEXT | mock / stub / dry-run | normalized-line:5653 |
| B01-039 | TEXT | read-only | normalized-line:5654 |
| B01-040 | TEXT | AI提案のみモード | normalized-line:5655 |
| B01-041 | TEXT | サンプルデータのみ | normalized-line:5656 |
| B01-042 | TEXT | 外部送信なしのdocs整理 | normalized-line:5657 |
| B01-043 | TEXT | env.exampleの環境変数名だけ更新 | normalized-line:5658 |
| B01-044 | TEXT | 実装ではなく設計候補docs化 | normalized-line:5659 |
| B01-045 | TEXT | Candidate扱い | normalized-line:5660 |
| B01-046 | TEXT | Human-in-the-loop | normalized-line:5661 |
| B01-047 | TEXT | Approval必須 | normalized-line:5662 |
| B01-048 | TEXT | AuditLog追記 | normalized-line:5663 |
| B01-049 | TEXT | Risk Register追記 | normalized-line:5664 |
| B01-050 | TEXT | HOLD記録 | normalized-line:5665 |

### B02 Scout: 編集前に必ず確認すること

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:5666

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B02-001 | TEXT | 編集前に、まず以下だけを実行・確認してください。 | normalized-line:5667 |
| B02-002 | TEXT | pwd | normalized-line:5668 |
| B02-003 | TEXT | git status --short --branch | normalized-line:5669 |
| B02-004 | TEXT | git branch --show-current | normalized-line:5670 |
| B02-005 | TEXT | git rev-parse --short HEAD | normalized-line:5671 |
| B02-006 | TEXT | git rev-parse --short origin/main | normalized-line:5672 |
| B02-007 | TEXT | git log --oneline --decorate -n 10 | normalized-line:5673 |
| B02-008 | TEXT | git diff --stat | normalized-line:5674 |
| B02-009 | TEXT | 未コミット変更 | normalized-line:5675 |
| B02-010 | TEXT | 未追跡ファイル | normalized-line:5676 |
| B02-011 | TEXT | README / AGENTS.md / CLAUDE.md の有無 | normalized-line:5677 |
| B02-012 | TEXT | docs / tasks / audit / prompts / roadmap / obsidian 関連ディレクトリ | normalized-line:5678 |
| B02-013 | TEXT | .github/workflows の有無 | normalized-line:5679 |
| B02-014 | TEXT | package.json / lockfile の有無 | normalized-line:5680 |
| B02-015 | TEXT | 既存テスト構造 | normalized-line:5681 |
| B02-016 | TEXT | CURRENT_STATE / LAST_VERIFIED / OPEN_RISKS / NEXT_ACTIONS / CLAUDE_CODE_NEXT_PROMPT の有無 | normalized-line:5682 |
| B02-017 | TEXT | 既存ロードマップdocsの場所 | normalized-line:5683 |
| B02-018 | TEXT | 既存Function Master docsの場所 | normalized-line:5684 |
| B02-019 | TEXT | Function Master 231-252 Candidate の有無 | normalized-line:5685 |
| B02-020 | TEXT | docs/08_growth の有無 | normalized-line:5686 |
| B02-021 | TEXT | docs/10_obsidian の有無 | normalized-line:5687 |
| B02-022 | TEXT | OBSIDIAN_INDEX / OBSIDIAN_SYNC_RULES / OBSIDIAN_TAGS の有無 | normalized-line:5688 |
| B02-023 | TEXT | 369-vaultとの関係がdocsに明示されているか | normalized-line:5689 |
| B02-024 | TEXT | 既存audit docsの最大番号 | normalized-line:5690 |
| B02-025 | TEXT | GitHub正本とObsidianメモが衝突していないか | normalized-line:5691 |
| B02-026 | TEXT | 以下なら編集せず停止してください。 | normalized-line:5692 |
| B02-027 | TEXT | 対象リポジトリではない可能性がある | normalized-line:5693 |
| B02-028 | TEXT | docs構造が見つからない | normalized-line:5694 |
| B02-029 | TEXT | 正本docsの位置が判断できない | normalized-line:5695 |
| B02-030 | TEXT | working treeに大量の未確認変更がある | normalized-line:5696 |
| B02-031 | TEXT | ユーザー変更と今回作業が衝突する | normalized-line:5697 |
| B02-032 | TEXT | 実装、DB変更、外部送信、実LLM、AIコスト、本番影響が必要になりそう | normalized-line:5698 |
| B02-033 | TEXT | 既存audit docsの証拠性を壊しそう | normalized-line:5699 |
| B02-034 | TEXT | 369-vault直接編集が必要になりそう | normalized-line:5700 |
| B02-035 | TEXT | 法務・税務・特許・商標の専門判断が必要になりそう | normalized-line:5701 |

### B03 作業モード

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:5702

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B03-001 | TEXT | 今回の主モードは Mode B: Docs整理 です。 | normalized-line:5703 |
| B03-002 | TEXT | ただし、参照チェックリストとして以下の要素も使ってください。 | normalized-line:5704 |
| B03-003 | TEXT | Mode C: GitHub / Obsidian整備 | normalized-line:5705 |
| B03-004 | TEXT | Mode F: Growth docs整理 | normalized-line:5706 |
| B03-005 | TEXT | Mode G: AI Safety設計 | normalized-line:5707 |
| B03-006 | TEXT | Mode K: Function Master Candidate整理 | normalized-line:5708 |
| B03-007 | TEXT | 今回は Mode B が主です。実装モードではありません。 | normalized-line:5709 |
| B03-008 | TEXT | Mode A: Read-only Audit | normalized-line:5710 |
| B03-009 | LABEL | やること: | normalized-line:5711 |
| B03-010 | TEXT | pwd | normalized-line:5712 |
| B03-011 | TEXT | git status | normalized-line:5713 |
| B03-012 | TEXT | branch / HEAD確認 | normalized-line:5714 |
| B03-013 | TEXT | diff確認 | normalized-line:5715 |
| B03-014 | TEXT | package.json確認 | normalized-line:5716 |
| B03-015 | TEXT | docs / tasks確認 | normalized-line:5717 |
| B03-016 | TEXT | CI確認 | normalized-line:5718 |
| B03-017 | TEXT | リスク整理 | normalized-line:5719 |
| B03-018 | LABEL | やらないこと: | normalized-line:5720 |
| B03-019 | TEXT | ファイル編集 | normalized-line:5721 |
| B03-020 | TEXT | 実装 | normalized-line:5722 |
| B03-021 | TEXT | DB変更 | normalized-line:5723 |
| B03-022 | TEXT | package追加 | normalized-line:5724 |
| B03-023 | TEXT | commit / push / deploy | normalized-line:5725 |
| B03-024 | TEXT | Mode B: Docs整理 | normalized-line:5726 |
| B03-025 | LABEL | やること: | normalized-line:5727 |
| B03-026 | TEXT | docs作成 | normalized-line:5728 |
| B03-027 | TEXT | docs追記 | normalized-line:5729 |
| B03-028 | TEXT | tasks整理 | normalized-line:5730 |
| B03-029 | TEXT | prompt履歴整理 | normalized-line:5731 |
| B03-030 | TEXT | Obsidianリンク候補作成 | normalized-line:5732 |
| B03-031 | LABEL | やらないこと: | normalized-line:5733 |
| B03-032 | TEXT | DB変更 | normalized-line:5734 |
| B03-033 | TEXT | 実装 | normalized-line:5735 |
| B03-034 | TEXT | 外部送信 | normalized-line:5736 |
| B03-035 | TEXT | 本番deploy | normalized-line:5737 |
| B03-036 | TEXT | 既存audit一括改変 | normalized-line:5738 |
| B03-037 | TEXT | Mode C: GitHub / Obsidian整備 | normalized-line:5739 |
| B03-038 | LABEL | やること: | normalized-line:5740 |
| B03-039 | TEXT | docs/10_obsidian作成 | normalized-line:5741 |
| B03-040 | TEXT | OBSIDIAN_SYNC_RULES作成 | normalized-line:5742 |
| B03-041 | TEXT | OBSIDIAN_TAGS作成 | normalized-line:5743 |
| B03-042 | TEXT | 369-vault関係設計案作成 | normalized-line:5744 |
| B03-043 | LABEL | やらないこと: | normalized-line:5745 |
| B03-044 | TEXT | 369-vault直接編集 | normalized-line:5746 |
| B03-045 | TEXT | 369-vault同期実行 | normalized-line:5747 |
| B03-046 | TEXT | secrets同期 | normalized-line:5748 |
| B03-047 | TEXT | 個人情報同期 | normalized-line:5749 |
| B03-048 | TEXT | Mode F: Growth docs整理 | normalized-line:5750 |
| B03-049 | LABEL | やること: | normalized-line:5751 |
| B03-050 | TEXT | docs/08_growth作成・更新 | normalized-line:5752 |
| B03-051 | TEXT | candidate整理 | normalized-line:5753 |
| B03-052 | TEXT | KPI整理 | normalized-line:5754 |
| B03-053 | TEXT | MVP案整理 | normalized-line:5755 |
| B03-054 | LABEL | やらないこと: | normalized-line:5756 |
| B03-055 | TEXT | 外部公開 | normalized-line:5757 |
| B03-056 | TEXT | SEOページ公開 | normalized-line:5758 |
| B03-057 | TEXT | PR配信 | normalized-line:5759 |
| B03-058 | TEXT | 個人情報共有 | normalized-line:5760 |
| B03-059 | TEXT | アフィリエイト報酬実装 | normalized-line:5761 |
| B03-060 | TEXT | Mode G: AI Safety設計 | normalized-line:5762 |
| B03-061 | LABEL | やること: | normalized-line:5763 |
| B03-062 | TEXT | AI Safety Policy整理 | normalized-line:5764 |
| B03-063 | TEXT | RAG権限設計 | normalized-line:5765 |
| B03-064 | TEXT | mock設計 | normalized-line:5766 |
| B03-065 | TEXT | Human Certification Gate設計 | normalized-line:5767 |
| B03-066 | LABEL | やらないこと: | normalized-line:5768 |
| B03-067 | TEXT | 実LLM API呼び出し | normalized-line:5769 |
| B03-068 | TEXT | 実LLMキー設定 | normalized-line:5770 |
| B03-069 | TEXT | AIコスト発生 | normalized-line:5771 |
| B03-070 | TEXT | 外部送信 | normalized-line:5772 |
| B03-071 | TEXT | Mode K: Function Master Candidate整理 | normalized-line:5773 |
| B03-072 | LABEL | やること: | normalized-line:5774 |
| B03-073 | TEXT | candidate docs作成 | normalized-line:5775 |
| B03-074 | TEXT | 重複整理 | normalized-line:5776 |
| B03-075 | TEXT | Phase分類 | normalized-line:5777 |
| B03-076 | TEXT | 承認ゲート整理 | normalized-line:5778 |
| B03-077 | TEXT | MVP候補整理 | normalized-line:5779 |
| B03-078 | LABEL | やらないこと: | normalized-line:5780 |
| B03-079 | TEXT | 正式Function Master昇格 | normalized-line:5781 |
| B03-080 | TEXT | DB化 | normalized-line:5782 |
| B03-081 | TEXT | 画面実装 | normalized-line:5783 |
| B03-082 | TEXT | API実装 | normalized-line:5784 |
| B03-083 | TEXT | 外部公開 | normalized-line:5785 |

### B04 Definition of Ready

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:5786

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B04-001 | TEXT | 編集前に以下を満たしているか確認してください。 | normalized-line:5787 |
| B04-002 | TEXT | 今回目的が明確 | normalized-line:5788 |
| B04-003 | TEXT | 作業モードが Mode B として明確 | normalized-line:5789 |
| B04-004 | TEXT | Git状態が確認できる | normalized-line:5790 |
| B04-005 | TEXT | 対象Phaseが明確 | normalized-line:5791 |
| B04-006 | TEXT | 今回やることがdocs整備に限定されている | normalized-line:5792 |
| B04-007 | TEXT | 今回やらないことが明確 | normalized-line:5793 |
| B04-008 | TEXT | 承認ゲートが確認されている | normalized-line:5794 |
| B04-009 | TEXT | 検証コマンド候補が確認されている | normalized-line:5795 |
| B04-010 | TEXT | docs更新対象が明確 | normalized-line:5796 |
| B04-011 | TEXT | Obsidian同期対象が明確 | normalized-line:5797 |
| B04-012 | TEXT | 369-vaultに直接触らないことが明確 | normalized-line:5798 |
| B04-013 | TEXT | DB / 認証 / 権限 / 個人情報 / 外部送信 / AIコスト / 本番影響がない | normalized-line:5799 |
| B04-014 | TEXT | 231-252はCandidate扱い | normalized-line:5800 |
| B04-015 | TEXT | 既存audit docsへfrontmatter一括適用しない | normalized-line:5801 |
| B04-016 | TEXT | GitHub正本とObsidianの役割分担が明確 | normalized-line:5802 |
| B04-017 | TEXT | 満たしていない場合は、編集せず不足情報と次回用最小プロンプト案を出してください。 | normalized-line:5803 |

### B05 GitHub / Obsidian / Claude Code / ChatGPT の役割分担

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:5804

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B05-001 | TEXT | GitHub | normalized-line:5805 |
| B05-002 | TEXT | GitHubは正本・証拠・変更履歴・実装管理です。 | normalized-line:5806 |
| B05-003 | LABEL | GitHubに置くもの: | normalized-line:5807 |
| B05-004 | TEXT | ソースコード | normalized-line:5808 |
| B05-005 | TEXT | package.json | normalized-line:5809 |
| B05-006 | TEXT | lockfile | normalized-line:5810 |
| B05-007 | TEXT | DBスキーマ | normalized-line:5811 |
| B05-008 | TEXT | Prisma schema | normalized-line:5812 |
| B05-009 | TEXT | migration | normalized-line:5813 |
| B05-010 | TEXT | テスト | normalized-line:5814 |
| B05-011 | TEXT | CI | normalized-line:5815 |
| B05-012 | TEXT | GitHub Actions | normalized-line:5816 |
| B05-013 | TEXT | Issue | normalized-line:5817 |
| B05-014 | TEXT | Pull Request | normalized-line:5818 |
| B05-015 | TEXT | 監査ログ | normalized-line:5819 |
| B05-016 | TEXT | docs | normalized-line:5820 |
| B05-017 | TEXT | tasks | normalized-line:5821 |
| B05-018 | TEXT | Claude Code実行記録 | normalized-line:5822 |
| B05-019 | TEXT | HOLD記録 | normalized-line:5823 |
| B05-020 | TEXT | 完了記録 | normalized-line:5824 |
| B05-021 | TEXT | 設計判断 | normalized-line:5825 |
| B05-022 | TEXT | ADR | normalized-line:5826 |
| B05-023 | TEXT | ロードマップ | normalized-line:5827 |
| B05-024 | TEXT | 変更履歴 | normalized-line:5828 |
| B05-025 | TEXT | 品質基準 | normalized-line:5829 |
| B05-026 | TEXT | Security / Privacy / AI Safety方針 | normalized-line:5830 |
| B05-027 | TEXT | Growth Strategy | normalized-line:5831 |
| B05-028 | TEXT | PR / SEO Growth Engine設計 | normalized-line:5832 |
| B05-029 | TEXT | Business Network設計 | normalized-line:5833 |
| B05-030 | TEXT | Advocate / Affiliate / Creator Growth設計 | normalized-line:5834 |
| B05-031 | TEXT | Obsidian同期ルール | normalized-line:5835 |
| B05-032 | TEXT | Release Governance | normalized-line:5836 |
| B05-033 | TEXT | Supply Chain Security | normalized-line:5837 |
| B05-034 | TEXT | Test Matrix | normalized-line:5838 |
| B05-035 | TEXT | SLO / SLA / Observability | normalized-line:5839 |
| B05-036 | TEXT | Unit Economics | normalized-line:5840 |
| B05-037 | TEXT | Data Classification | normalized-line:5841 |
| B05-038 | TEXT | Enterprise Procurement | normalized-line:5842 |
| B05-039 | TEXT | 次回Claude Codeプロンプト | normalized-line:5843 |
| B05-040 | LABEL | GitHubに置いてはいけないもの: | normalized-line:5844 |
| B05-041 | TEXT | secrets | normalized-line:5845 |
| B05-042 | TEXT | .envの実値 | normalized-line:5846 |
| B05-043 | TEXT | 実LLM APIキー | normalized-line:5847 |
| B05-044 | TEXT | OAuth token | normalized-line:5848 |
| B05-045 | TEXT | cookie | normalized-line:5849 |
| B05-046 | TEXT | session情報 | normalized-line:5850 |
| B05-047 | TEXT | private key | normalized-line:5851 |
| B05-048 | TEXT | 本番ログの生データ | normalized-line:5852 |
| B05-049 | TEXT | 個人情報 | normalized-line:5853 |
| B05-050 | TEXT | 顧客許諾なし情報 | normalized-line:5854 |
| B05-051 | TEXT | node_modules | normalized-line:5855 |
| B05-052 | TEXT | build成果物 | normalized-line:5856 |
| B05-053 | TEXT | .next | normalized-line:5857 |
| B05-054 | TEXT | dist | normalized-line:5858 |
| B05-055 | TEXT | coverageの巨大出力 | normalized-line:5859 |
| B05-056 | TEXT | 一時ファイル | normalized-line:5860 |
| B05-057 | TEXT | Obsidian | normalized-line:5861 |
| B05-058 | TEXT | Obsidianは思考整理・経営者向けダッシュボード・ロードマップ・監査ログ閲覧・ナレッジグラフです。 | normalized-line:5862 |
| B05-059 | LABEL | Obsidianで見るべきもの: | normalized-line:5863 |
| B05-060 | TEXT | 現在地 | normalized-line:5864 |
| B05-061 | TEXT | Phase別進捗 | normalized-line:5865 |
| B05-062 | TEXT | 機能マスター | normalized-line:5866 |
| B05-063 | TEXT | 開発ログ | normalized-line:5867 |
| B05-064 | TEXT | 監査ログ | normalized-line:5868 |
| B05-065 | TEXT | HOLD記録 | normalized-line:5869 |
| B05-066 | TEXT | リスク一覧 | normalized-line:5870 |
| B05-067 | TEXT | Claude Codeへの次回指示 | normalized-line:5871 |
| B05-068 | TEXT | 事業戦略 | normalized-line:5872 |
| B05-069 | TEXT | マーケティング戦略 | normalized-line:5873 |
| B05-070 | TEXT | PR / SEO / Business Network構想 | normalized-line:5874 |
| B05-071 | TEXT | Advocate / Affiliate / Creator Growth構想 | normalized-line:5875 |
| B05-072 | TEXT | AI社員構想 | normalized-line:5876 |
| B05-073 | TEXT | 重要な設計判断 | normalized-line:5877 |
| B05-074 | TEXT | 用語集 | normalized-line:5878 |
| B05-075 | TEXT | 競合比較 | normalized-line:5879 |
| B05-076 | TEXT | 非エンジニア向け説明 | normalized-line:5880 |
| B05-077 | TEXT | 経営判断メモ | normalized-line:5881 |
| B05-078 | LABEL | Obsidian最小入口: | normalized-line:5882 |
| B05-079 | TEXT | IKEZAKI_OS_HOME.md | normalized-line:5883 |
| B05-080 | TEXT | CURRENT_STATE.md | normalized-line:5884 |
| B05-081 | TEXT | NEXT_ACTION.md | normalized-line:5885 |
| B05-082 | TEXT | OPEN_RISKS.md | normalized-line:5886 |
| B05-083 | TEXT | CLAUDE_CODE_NEXT_PROMPT.md | normalized-line:5887 |
| B05-084 | LABEL | Obsidian禁止: | normalized-line:5888 |
| B05-085 | TEXT | Obsidianだけに正式情報を置かない | normalized-line:5889 |
| B05-086 | TEXT | Obsidian側draftをGitHub officialと混同しない | normalized-line:5890 |
| B05-087 | TEXT | 369-vaultをClaude Codeが勝手に編集しない | normalized-line:5891 |
| B05-088 | TEXT | secrets、個人情報、本番ログ生データを同期しない | normalized-line:5892 |
| B05-089 | TEXT | Obsidianのcandidateメモは、Claude Code経由でGitHubへ反映してからofficial扱いにする | normalized-line:5893 |
| B05-090 | TEXT | Claude Code | normalized-line:5894 |
| B05-091 | TEXT | Claude Codeは実装・監査・検証・docs更新の実行者です。 | normalized-line:5895 |
| B05-092 | TEXT | ChatGPT | normalized-line:5896 |
| B05-093 | TEXT | ChatGPTは Claude Codeに渡すプロンプト生成・戦略設計・非エンジニア向け判断補助です。 | normalized-line:5897 |

### B06 推奨GitHub docs構造

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:5898

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B06-001 | TEXT | 既存構造がある場合は必ず既存を優先してください。 | normalized-line:5899 |
| B06-002 | TEXT | 存在しない場合は、以下を候補として作成・追記してください。 | normalized-line:5900 |
| B06-003 | TEXT | docs/00_current_state/CURRENT_STATE.md | normalized-line:5901 |
| B06-004 | TEXT | docs/00_current_state/LAST_VERIFIED.md | normalized-line:5902 |
| B06-005 | TEXT | docs/00_current_state/OPEN_RISKS.md | normalized-line:5903 |
| B06-006 | TEXT | docs/01_roadmap/ROADMAP.md | normalized-line:5904 |
| B06-007 | TEXT | docs/01_roadmap/PHASES.md | normalized-line:5905 |
| B06-008 | TEXT | docs/01_roadmap/NEXT_ACTIONS.md | normalized-line:5906 |
| B06-009 | TEXT | docs/01_roadmap/IKEZAKI_OS_ROADMAP_PHASE_0_26_CANDIDATE.md | normalized-line:5907 |
| B06-010 | TEXT | docs/02_function_master/FUNCTION_MASTER_000_150.md | normalized-line:5908 |
| B06-011 | TEXT | docs/02_function_master/FUNCTION_MASTER_151_200.md | normalized-line:5909 |
| B06-012 | TEXT | docs/02_function_master/FUNCTION_MASTER_201_220_GROWTH.md | normalized-line:5910 |
| B06-013 | TEXT | docs/02_function_master/FUNCTION_MASTER_221_230_GITHUB_OBSIDIAN.md | normalized-line:5911 |
| B06-014 | TEXT | docs/02_function_master/FUNCTION_MASTER_231_252_CANDIDATES.md | normalized-line:5912 |
| B06-015 | TEXT | docs/02_function_master/DO_NOT_BUILD.md | normalized-line:5913 |
| B06-016 | TEXT | docs/03_architecture/SYSTEM_OVERVIEW.md | normalized-line:5914 |
| B06-017 | TEXT | docs/03_architecture/COMPANY_IDENTITY.md | normalized-line:5915 |
| B06-018 | TEXT | docs/03_architecture/COMPANY_BRAIN.md | normalized-line:5916 |
| B06-019 | TEXT | docs/03_architecture/BUSINESS_EVENT_LEDGER.md | normalized-line:5917 |
| B06-020 | TEXT | docs/03_architecture/AI_EXECUTION_LEDGER.md | normalized-line:5918 |
| B06-021 | TEXT | docs/03_architecture/PERMISSION_APPROVAL_AUDIT.md | normalized-line:5919 |
| B06-022 | TEXT | docs/03_architecture/HUMAN_CERTIFICATION_GATE.md | normalized-line:5920 |
| B06-023 | TEXT | docs/03_architecture/AGENT_RUNTIME_AND_MANIFEST.md | normalized-line:5921 |
| B06-024 | TEXT | docs/03_architecture/DEVELOPER_CLOUD_ARCHITECTURE_CANDIDATE.md | normalized-line:5922 |
| B06-025 | TEXT | docs/03_architecture/INTEGRATION_HUB.md | normalized-line:5923 |
| B06-026 | TEXT | docs/04_quality/QUALITY_BASELINE.md | normalized-line:5924 |
| B06-027 | TEXT | docs/04_quality/CI_PLAN.md | normalized-line:5925 |
| B06-028 | TEXT | docs/04_quality/TEST_STRATEGY.md | normalized-line:5926 |
| B06-029 | TEXT | docs/04_quality/TEST_MATRIX.md | normalized-line:5927 |
| B06-030 | TEXT | docs/04_quality/SERVER_ACTIONS_NEGATIVE_TESTS.md | normalized-line:5928 |
| B06-031 | TEXT | docs/04_quality/PRODUCTION_CHECK_PLAYBOOK.md | normalized-line:5929 |
| B06-032 | TEXT | docs/04_quality/DOCUMENTATION_QUALITY_GATE.md | normalized-line:5930 |
| B06-033 | TEXT | docs/04_quality/SUPPLY_CHAIN_SECURITY.md | normalized-line:5931 |
| B06-034 | TEXT | docs/04_quality/RELEASE_GOVERNANCE.md | normalized-line:5932 |
| B06-035 | TEXT | docs/04_quality/SLO_SLA_OBSERVABILITY.md | normalized-line:5933 |
| B06-036 | TEXT | docs/05_security/SECURITY_POLICY.md | normalized-line:5934 |
| B06-037 | TEXT | docs/05_security/APPROVAL_GATES.md | normalized-line:5935 |
| B06-038 | TEXT | docs/05_security/PRIVACY_POLICY_NOTES.md | normalized-line:5936 |
| B06-039 | TEXT | docs/05_security/AI_SAFETY_POLICY.md | normalized-line:5937 |
| B06-040 | TEXT | docs/05_security/TRUST_CENTER_PLAN.md | normalized-line:5938 |
| B06-041 | TEXT | docs/05_security/AI_AGENT_RAG_SAFETY.md | normalized-line:5939 |
| B06-042 | TEXT | docs/05_security/DATA_CLASSIFICATION.md | normalized-line:5940 |
| B06-043 | TEXT | docs/06_audit/audit_YYYYMMDD_xxx.md | normalized-line:5941 |
| B06-044 | TEXT | docs/06_audit/hold_YYYYMMDD_xxx.md | normalized-line:5942 |
| B06-045 | TEXT | docs/06_audit/release_check_YYYYMMDD_xxx.md | normalized-line:5943 |
| B06-046 | TEXT | docs/07_prompts/META_PROMPT_LATEST.md | normalized-line:5944 |
| B06-047 | TEXT | docs/07_prompts/META_PROMPT_HISTORY.md | normalized-line:5945 |
| B06-048 | TEXT | docs/07_prompts/CLAUDE_CODE_NEXT_PROMPT.md | normalized-line:5946 |
| B06-049 | TEXT | docs/07_prompts/PROMPT_HISTORY.md | normalized-line:5947 |
| B06-050 | TEXT | docs/07_prompts/PROMPT_DECISION_LOG.md | normalized-line:5948 |
| B06-051 | TEXT | docs/08_growth/ZERO_AD_GROWTH_STRATEGY.md | normalized-line:5949 |
| B06-052 | TEXT | docs/08_growth/PR_SEO_GROWTH_ENGINE.md | normalized-line:5950 |
| B06-053 | TEXT | docs/08_growth/BUSINESS_NETWORK.md | normalized-line:5951 |
| B06-054 | TEXT | docs/08_growth/TRUST_PASSPORT.md | normalized-line:5952 |
| B06-055 | TEXT | docs/08_growth/ADVOCATE_AFFILIATE_ENGINE.md | normalized-line:5953 |
| B06-056 | TEXT | docs/08_growth/CREATOR_PORTAL.md | normalized-line:5954 |
| B06-057 | TEXT | docs/08_growth/WHITE_LABEL_DIAGNOSIS.md | normalized-line:5955 |
| B06-058 | TEXT | docs/08_growth/COMPLIANCE_DISCLOSURE_GUARD.md | normalized-line:5956 |
| B06-059 | TEXT | docs/08_growth/PUBLIC_IMPACT_DASHBOARD.md | normalized-line:5957 |
| B06-060 | TEXT | docs/08_growth/CHALLENGE_EVENT_ENGINE.md | normalized-line:5958 |
| B06-061 | TEXT | docs/08_growth/CREATOR_MARKETPLACE.md | normalized-line:5959 |
| B06-062 | TEXT | docs/08_growth/GROWTH_KPI.md | normalized-line:5960 |
| B06-063 | TEXT | docs/08_growth/ABUSE_RATE_LIMIT_GOVERNANCE.md | normalized-line:5961 |
| B06-064 | TEXT | docs/08_growth/PARTNER_PAYOUT_REVENUE_SHARE_CANDIDATE.md | normalized-line:5962 |
| B06-065 | TEXT | docs/08_growth/PLUG_COMMERCE_EMPLOYEE_APP_STRATEGY_CANDIDATE.md | normalized-line:5963 |
| B06-066 | TEXT | docs/08_growth/AI_WORKFORCE_ECONOMY_STRATEGY_CANDIDATE.md | normalized-line:5964 |
| B06-067 | TEXT | docs/09_decisions/ADR_0001_xxx.md | normalized-line:5965 |
| B06-068 | TEXT | docs/10_obsidian/OBSIDIAN_INDEX.md | normalized-line:5966 |
| B06-069 | TEXT | docs/10_obsidian/OBSIDIAN_SYNC_RULES.md | normalized-line:5967 |
| B06-070 | TEXT | docs/10_obsidian/OBSIDIAN_TAGS.md | normalized-line:5968 |
| B06-071 | TEXT | docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md | normalized-line:5969 |
| B06-072 | TEXT | docs/11_business/UNIT_ECONOMICS.md | normalized-line:5970 |
| B06-073 | TEXT | docs/11_business/ENTERPRISE_PROCUREMENT.md | normalized-line:5971 |
| B06-074 | TEXT | docs/11_business/GLOBAL_TAX_EINVOICING_CANDIDATE.md | normalized-line:5972 |
| B06-075 | TEXT | docs/11_business/AI_EMPLOYEE_MARKETPLACE_BUSINESS_MODEL_CANDIDATE.md | normalized-line:5973 |
| B06-076 | TEXT | docs/11_business/IP_MOAT_STRATEGY_CANDIDATE.md | normalized-line:5974 |
| B06-077 | TEXT | docs/11_business/DEVELOPER_CLOUD_MARKETPLACE_STRATEGY_CANDIDATE.md | normalized-line:5975 |
| B06-078 | TEXT | docs/11_business/RACI_OWNERSHIP.md | normalized-line:5976 |
| B06-079 | TEXT | docs/12_legal/LEGAL_EVIDENCE_EDISCOVERY_CANDIDATE.md | normalized-line:5977 |
| B06-080 | TEXT | docs/12_legal/TERMS_POLICY_CONSENT_GOVERNANCE_CANDIDATE.md | normalized-line:5978 |
| B06-081 | TEXT | docs/13_industry/SECTOR_DEEP_PACKS_CANDIDATE.md | normalized-line:5979 |
| B06-082 | TEXT | tasks/TODO.md | normalized-line:5980 |
| B06-083 | TEXT | tasks/BACKLOG.md | normalized-line:5981 |
| B06-084 | TEXT | tasks/HOLD.md | normalized-line:5982 |
| B06-085 | TEXT | tasks/DONE.md | normalized-line:5983 |
| B06-086 | TEXT | README.md | normalized-line:5984 |
| B06-087 | TEXT | AGENTS.md | normalized-line:5985 |
| B06-088 | TEXT | CLAUDE.md | normalized-line:5986 |
| B06-089 | TEXT | 作成ファイル数が多すぎる場合は、まず以下の最小セットに絞ってください。 | normalized-line:5987 |
| B06-090 | TEXT | docs/01_roadmap/IKEZAKI_OS_ROADMAP_PHASE_0_26_CANDIDATE.md | normalized-line:5988 |
| B06-091 | TEXT | docs/02_function_master/FUNCTION_MASTER_231_252_CANDIDATES.md | normalized-line:5989 |
| B06-092 | TEXT | docs/08_growth/AI_WORKFORCE_ECONOMY_STRATEGY_CANDIDATE.md | normalized-line:5990 |
| B06-093 | TEXT | docs/08_growth/PLUG_COMMERCE_EMPLOYEE_APP_STRATEGY_CANDIDATE.md | normalized-line:5991 |
| B06-094 | TEXT | docs/11_business/DEVELOPER_CLOUD_MARKETPLACE_STRATEGY_CANDIDATE.md | normalized-line:5992 |
| B06-095 | TEXT | docs/11_business/IP_MOAT_STRATEGY_CANDIDATE.md | normalized-line:5993 |
| B06-096 | TEXT | docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md | normalized-line:5994 |
| B06-097 | TEXT | docs/07_prompts/CLAUDE_CODE_NEXT_PROMPT.md | normalized-line:5995 |
| B06-098 | TEXT | docs/00_current_state/OPEN_RISKS.md | normalized-line:5996 |
| B06-099 | TEXT | docs/01_roadmap/NEXT_ACTIONS.md | normalized-line:5997 |

### B07 IKEZAKI OS / 369 の本質

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:5998

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B07-001 | TEXT | 369 / IKEZAKI OS の本当の強みは、機能が多いことではありません。 | normalized-line:5999 |
| B07-002 | TEXT | 本質は以下です。 | normalized-line:6000 |
| B07-003 | TEXT | 会社の情報をAIが扱える構造に変換できる | normalized-line:6001 |
| B07-004 | TEXT | AIにやらせることだけでなく、AIにやらせない境界を設計している | normalized-line:6002 |
| B07-005 | TEXT | Company Brainによって、会社専用の判断基準をAIに持たせられる | normalized-line:6003 |
| B07-006 | TEXT | AI社員が安全に働くための権限・承認・監査・記憶の土台を作っている | normalized-line:6004 |
| B07-007 | TEXT | 使うほど会社の意思決定履歴が蓄積し、乗り換えづらい資産になる | normalized-line:6005 |
| B07-008 | TEXT | LeadMap AIやAI Growth Engineのような入口商品から、OS全体に拡張できる | normalized-line:6006 |
| B07-009 | TEXT | 便利さだけでなく、信用・安全・証跡・法務配慮を売れる | normalized-line:6007 |
| B07-010 | LABEL | 短い定義: | normalized-line:6008 |
| B07-011 | TEXT | AI社員を雇い、育て、働かせ、進化させる経営OS。 | normalized-line:6009 |
| B07-012 | LABEL | 中定義: | normalized-line:6010 |
| B07-013 | TEXT | 人間が主人公であり続けながら、AI社員が24時間365日、事業の全領域を稼働させる AI Workforce Ecosystem。 | normalized-line:6011 |
| B07-014 | LABEL | 事業モデル定義: | normalized-line:6012 |
| B07-015 | TEXT | 自社のあらゆる業務にAI社員を配置し、日々の営みがそのままプロダクト・データ・収益源に転化する自己増殖型ビジネス基盤。 | normalized-line:6013 |

### B08 369は何ではないか

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:6014

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B08-001 | TEXT | 以下ではありません。 | normalized-line:6015 |
| B08-002 | TEXT | 単なる業務自動化ツールではない | normalized-line:6016 |
| B08-003 | TEXT | 単なるチャットボットではない | normalized-line:6017 |
| B08-004 | TEXT | 単なる生成AI活用ではない | normalized-line:6018 |
| B08-005 | TEXT | 単なるRPAではない | normalized-line:6019 |
| B08-006 | TEXT | 単なるSaaSの寄せ集めではない | normalized-line:6020 |
| B08-007 | TEXT | 単なる社内ナレッジシステムではない | normalized-line:6021 |
| B08-008 | TEXT | 単なるERPではない | normalized-line:6022 |
| B08-009 | TEXT | 人件費を置き換えて削るだけのコストカット装置ではない | normalized-line:6023 |
| B08-010 | TEXT | 個別プロジェクトごとに作る受託開発ではない | normalized-line:6024 |
| B08-011 | TEXT | 本質は以下です。 | normalized-line:6025 |
| B08-012 | TEXT | 会社そのものをOS化する | normalized-line:6026 |
| B08-013 | TEXT | 人間とAI社員が役割を分けて協働する | normalized-line:6027 |
| B08-014 | TEXT | 業務・データ・プロダクト・収益が1つのEcosystemとして循環する | normalized-line:6028 |
| B08-015 | TEXT | 「AIを使う」から「AIと働く」へ、経営の前提を書き換える | normalized-line:6029 |

### B09 5つの中核思想

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:6030

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B09-001 | TEXT | 人間が主人公である | normalized-line:6031 |
| B09-002 | TEXT | AI社員は人間を代替しない、人間を強化する | normalized-line:6032 |
| B09-003 | TEXT | 24時間365日、事業は止まらない。ただし危険操作は人間承認必須 | normalized-line:6033 |
| B09-004 | TEXT | 解雇ではなく、停止・置換・再設計 | normalized-line:6034 |
| B09-005 | TEXT | 日々評価し、進化する | normalized-line:6035 |
| B09-006 | LABEL | 人間が決めるもの: | normalized-line:6036 |
| B09-007 | TEXT | 経営ビジョン | normalized-line:6037 |
| B09-008 | TEXT | 戦略・優先順位 | normalized-line:6038 |
| B09-009 | TEXT | 商品・サービスの魂 | normalized-line:6039 |
| B09-010 | TEXT | 価値観・文化 | normalized-line:6040 |
| B09-011 | TEXT | 危険操作の承認 | normalized-line:6041 |
| B09-012 | TEXT | AI社員の停止・置換 | normalized-line:6042 |
| B09-013 | TEXT | 組織構造・体制 | normalized-line:6043 |
| B09-014 | TEXT | 予算配分 | normalized-line:6044 |
| B09-015 | TEXT | 重要取引の合意 | normalized-line:6045 |
| B09-016 | TEXT | 採用と評価の最終判断 | normalized-line:6046 |
| B09-017 | TEXT | お客様との関係の質 | normalized-line:6047 |
| B09-018 | TEXT | 新規事業の意思決定 | normalized-line:6048 |
| B09-019 | TEXT | なぜこの会社が存在するのか | normalized-line:6049 |
| B09-020 | LABEL | AI社員が引き受けるもの: | normalized-line:6050 |
| B09-021 | TEXT | 定型作業 | normalized-line:6051 |
| B09-022 | TEXT | 繰り返し処理 | normalized-line:6052 |
| B09-023 | TEXT | 24時間監視 | normalized-line:6053 |
| B09-024 | TEXT | アラート | normalized-line:6054 |
| B09-025 | TEXT | レポート生成 | normalized-line:6055 |
| B09-026 | TEXT | データ集計 | normalized-line:6056 |
| B09-027 | TEXT | 数値整理 | normalized-line:6057 |
| B09-028 | TEXT | 情報検索 | normalized-line:6058 |
| B09-029 | TEXT | ドキュメント生成 | normalized-line:6059 |
| B09-030 | TEXT | 翻訳 | normalized-line:6060 |
| B09-031 | TEXT | スケジュール・タスク追跡 | normalized-line:6061 |
| B09-032 | LABEL | 危険操作: | normalized-line:6062 |
| B09-033 | TEXT | 送金・支払い実行 | normalized-line:6063 |
| B09-034 | TEXT | 契約締結・解除 | normalized-line:6064 |
| B09-035 | TEXT | 顧客への重要通知 | normalized-line:6065 |
| B09-036 | TEXT | 大量データ削除 | normalized-line:6066 |
| B09-037 | TEXT | 権限設定変更 | normalized-line:6067 |
| B09-038 | TEXT | 外部システムへの書込 | normalized-line:6068 |
| B09-039 | TEXT | 採用・評価確定 | normalized-line:6069 |
| B09-040 | TEXT | 高額購買 | normalized-line:6070 |

### B10 10の理念

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:6071

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B10-001 | TEXT | 人間が主人公 | normalized-line:6072 |
| B10-002 | TEXT | AI社員は仲間 | normalized-line:6073 |
| B10-003 | TEXT | 日々進化する | normalized-line:6074 |
| B10-004 | TEXT | 24時間止まらない | normalized-line:6075 |
| B10-005 | TEXT | 危険操作は必ず承認 | normalized-line:6076 |
| B10-006 | TEXT | 記録は資産 | normalized-line:6077 |
| B10-007 | TEXT | 停止・置換・再設計 | normalized-line:6078 |
| B10-008 | TEXT | 現場から進化 | normalized-line:6079 |
| B10-009 | TEXT | 従量課金で公正 | normalized-line:6080 |
| B10-010 | TEXT | 自社を最初の顧客に | normalized-line:6081 |
| B10-011 | LABEL | 最終目的: | normalized-line:6082 |
| B10-012 | TEXT | 生産性最大化 | normalized-line:6083 |
| B10-013 | TEXT | 売上最大化 | normalized-line:6084 |
| B10-014 | TEXT | コスト最小化 | normalized-line:6085 |
| B10-015 | TEXT | 利益最大化 | normalized-line:6086 |
| B10-016 | LABEL | 削るべきコスト: | normalized-line:6087 |
| B10-017 | TEXT | 定型作業に費やす人件費 | normalized-line:6088 |
| B10-018 | TEXT | SaaSの重複契約 | normalized-line:6089 |
| B10-019 | TEXT | 部門ごとの外注コスト | normalized-line:6090 |
| B10-020 | TEXT | 情報探索・資料検索の時間ロス | normalized-line:6091 |
| B10-021 | TEXT | 会議参加コスト | normalized-line:6092 |
| B10-022 | TEXT | ミスによる手戻り・クレーム対応 | normalized-line:6093 |
| B10-023 | TEXT | 属人化による引継ぎコスト | normalized-line:6094 |
| B10-024 | TEXT | 承認遅延による機会損失 | normalized-line:6095 |
| B10-025 | TEXT | レポート作成工数 | normalized-line:6096 |
| B10-026 | TEXT | 教育・オンボーディング負荷 | normalized-line:6097 |

### B11 AI社員 / AI補助社員 / ツール

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:6098

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B11-001 | TEXT | AI社員の16属性 | normalized-line:6099 |
| B11-002 | TEXT | 氏名 | normalized-line:6100 |
| B11-003 | TEXT | 役職・階層 | normalized-line:6101 |
| B11-004 | TEXT | 配属部門 | normalized-line:6102 |
| B11-005 | TEXT | 目的・ミッション | normalized-line:6103 |
| B11-006 | TEXT | 担当業務 | normalized-line:6104 |
| B11-007 | TEXT | 権限範囲 | normalized-line:6105 |
| B11-008 | TEXT | 上長・承認者 | normalized-line:6106 |
| B11-009 | TEXT | KPI | normalized-line:6107 |
| B11-010 | TEXT | スキル・能力 | normalized-line:6108 |
| B11-011 | TEXT | 性格・トーン | normalized-line:6109 |
| B11-012 | TEXT | 稼働ログ | normalized-line:6110 |
| B11-013 | TEXT | 利用料金 | normalized-line:6111 |
| B11-014 | TEXT | 教育履歴 | normalized-line:6112 |
| B11-015 | TEXT | 評価スコア | normalized-line:6113 |
| B11-016 | TEXT | 停止条件 | normalized-line:6114 |
| B11-017 | TEXT | 後継設計 | normalized-line:6115 |
| B11-018 | TEXT | AI補助社員の位置づけ | normalized-line:6116 |
| B11-019 | TEXT | AI社員が独立した働き手なら、AI補助社員は人に張り付く伴走者です。 | normalized-line:6117 |
| B11-020 | LABEL | 例: | normalized-line:6118 |
| B11-021 | TEXT | 営業補助 | normalized-line:6119 |
| B11-022 | TEXT | カスタマー補助 | normalized-line:6120 |
| B11-023 | TEXT | 経理補助 | normalized-line:6121 |
| B11-024 | TEXT | 現場作業補助 | normalized-line:6122 |
| B11-025 | TEXT | 企画補助 | normalized-line:6123 |
| B11-026 | TEXT | 会議補助 | normalized-line:6124 |
| B11-027 | TEXT | 執筆補助 | normalized-line:6125 |
| B11-028 | TEXT | 学習補助 | normalized-line:6126 |
| B11-029 | TEXT | 経営者補助 | normalized-line:6127 |
| B11-030 | TEXT | ツールの7つの役割 | normalized-line:6128 |
| B11-031 | TEXT | EXECUTE: 実行する | normalized-line:6129 |
| B11-032 | TEXT | RETRIEVE: 取得する | normalized-line:6130 |
| B11-033 | TEXT | TRANSFORM: 加工する | normalized-line:6131 |
| B11-034 | TEXT | MONITOR: 監視する | normalized-line:6132 |
| B11-035 | TEXT | GENERATE: 生成する | normalized-line:6133 |
| B11-036 | TEXT | DECIDE: 判定する | normalized-line:6134 |
| B11-037 | TEXT | DELIVER: 届ける | normalized-line:6135 |
| B11-038 | TEXT | 従量課金単位 | normalized-line:6136 |
| B11-039 | TEXT | AI社員稼働時間 | normalized-line:6137 |
| B11-040 | TEXT | タスク実行件数 | normalized-line:6138 |
| B11-041 | TEXT | トークン消費量 | normalized-line:6139 |
| B11-042 | TEXT | API呼び出し回数 | normalized-line:6140 |
| B11-043 | TEXT | 生成物サイズ | normalized-line:6141 |
| B11-044 | TEXT | 保存データ量 | normalized-line:6142 |
| B11-045 | TEXT | 承認処理件数 | normalized-line:6143 |
| B11-046 | TEXT | アカウント数 | normalized-line:6144 |
| B11-047 | TEXT | Company Brain蓄積量 | normalized-line:6145 |
| B11-048 | TEXT | 人間チェック案件 | normalized-line:6146 |
| B11-049 | LABEL | 注意: | normalized-line:6147 |
| B11-050 | TEXT | ピーク時の消費量スパイクには上限アラートが必要 | normalized-line:6148 |
| B11-051 | TEXT | 部門別コスト配賦ルールが必要 | normalized-line:6149 |
| B11-052 | TEXT | 見積提示時に参考消費量を提示するUIが必要 | normalized-line:6150 |
| B11-053 | TEXT | 稼働ゼロを許容する運用マインドセットが必要 | normalized-line:6151 |

### B12 Company Brain

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:6152

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B12-001 | TEXT | Company Brain は会社の記憶です。 | normalized-line:6153 |
| B12-002 | LABEL | 取り込む対象: | normalized-line:6154 |
| B12-003 | TEXT | 会社方針 | normalized-line:6155 |
| B12-004 | TEXT | 商品・サービス | normalized-line:6156 |
| B12-005 | TEXT | 価格表 | normalized-line:6157 |
| B12-006 | TEXT | 営業プレイブック | normalized-line:6158 |
| B12-007 | TEXT | 顧客事例 | normalized-line:6159 |
| B12-008 | TEXT | FAQ | normalized-line:6160 |
| B12-009 | TEXT | マニュアル | normalized-line:6161 |
| B12-010 | TEXT | 会議 | normalized-line:6162 |
| B12-011 | TEXT | 議事録 | normalized-line:6163 |
| B12-012 | TEXT | 契約ルール | normalized-line:6164 |
| B12-013 | TEXT | ブランドルール | normalized-line:6165 |
| B12-014 | TEXT | 承認ルール | normalized-line:6166 |
| B12-015 | TEXT | 過去の判断履歴 | normalized-line:6167 |
| B12-016 | TEXT | 顧客情報 | normalized-line:6168 |
| B12-017 | TEXT | 案件情報 | normalized-line:6169 |
| B12-018 | TEXT | 売上情報 | normalized-line:6170 |
| B12-019 | TEXT | 失注理由 | normalized-line:6171 |
| B12-020 | TEXT | 社員フィードバック | normalized-line:6172 |
| B12-021 | TEXT | 市場・業界トレンド | normalized-line:6173 |
| B12-022 | TEXT | 競合情報 | normalized-line:6174 |
| B12-023 | TEXT | AI社員自身の稼働ログ | normalized-line:6175 |
| B12-024 | LABEL | 必要な管理: | normalized-line:6176 |
| B12-025 | TEXT | 出所管理 | normalized-line:6177 |
| B12-026 | TEXT | 鮮度管理 | normalized-line:6178 |
| B12-027 | TEXT | 機密ラベル | normalized-line:6179 |
| B12-028 | TEXT | PIIマスキング | normalized-line:6180 |
| B12-029 | TEXT | AI参照可否 | normalized-line:6181 |
| B12-030 | TEXT | 外部送信可否 | normalized-line:6182 |
| B12-031 | TEXT | 参照ログ | normalized-line:6183 |
| B12-032 | TEXT | 引用付き出力 | normalized-line:6184 |
| B12-033 | TEXT | Data Freshness | normalized-line:6185 |
| B12-034 | TEXT | Data Sufficiency | normalized-line:6186 |
| B12-035 | TEXT | Data Quality | normalized-line:6187 |
| B12-036 | TEXT | tenantId分離 | normalized-line:6188 |
| B12-037 | LABEL | 価値: | normalized-line:6189 |
| B12-038 | TEXT | 散らばった情報をAIが読める会社の状態へ変換する | normalized-line:6190 |
| B12-039 | TEXT | 会社専用の判断基準をAIに持たせる | normalized-line:6191 |
| B12-040 | TEXT | 使うほど学習資産が積み上がり、スイッチングコストが上がる | normalized-line:6192 |

### B13 8層構造

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:6193

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B13-001 | TEXT | IKEZAKI OS / 369 は、以下の8層で整理してください。 | normalized-line:6194 |
| B13-002 | TEXT | Core OS | normalized-line:6195 |
| B13-003 | TEXT | 会社 | normalized-line:6196 |
| B13-004 | TEXT | ユーザー | normalized-line:6197 |
| B13-005 | TEXT | 権限 | normalized-line:6198 |
| B13-006 | TEXT | テナント | normalized-line:6199 |
| B13-007 | TEXT | 監査ログ | normalized-line:6200 |
| B13-008 | TEXT | 承認 | normalized-line:6201 |
| B13-009 | TEXT | 通知 | normalized-line:6202 |
| B13-010 | TEXT | 課金 | normalized-line:6203 |
| B13-011 | TEXT | データ分離 | normalized-line:6204 |
| B13-012 | TEXT | セキュリティ | normalized-line:6205 |
| B13-013 | TEXT | Company Brain | normalized-line:6206 |
| B13-014 | TEXT | 会社方針 | normalized-line:6207 |
| B13-015 | TEXT | 商品 | normalized-line:6208 |
| B13-016 | TEXT | 営業プレイブック | normalized-line:6209 |
| B13-017 | TEXT | 顧客事例 | normalized-line:6210 |
| B13-018 | TEXT | FAQ | normalized-line:6211 |
| B13-019 | TEXT | マニュアル | normalized-line:6212 |
| B13-020 | TEXT | 契約ルール | normalized-line:6213 |
| B13-021 | TEXT | ブランドルール | normalized-line:6214 |
| B13-022 | TEXT | Salesforce Layer | normalized-line:6215 |
| B13-023 | TEXT | CRM | normalized-line:6216 |
| B13-024 | TEXT | SFA | normalized-line:6217 |
| B13-025 | TEXT | MA | normalized-line:6218 |
| B13-026 | TEXT | Service | normalized-line:6219 |
| B13-027 | TEXT | Commerce | normalized-line:6220 |
| B13-028 | TEXT | CPQ | normalized-line:6221 |
| B13-029 | TEXT | Partner | normalized-line:6222 |
| B13-030 | TEXT | Customer Data | normalized-line:6223 |
| B13-031 | TEXT | Analytics | normalized-line:6224 |
| B13-032 | TEXT | Oracle Layer | normalized-line:6225 |
| B13-033 | TEXT | 会計 | normalized-line:6226 |
| B13-034 | TEXT | 請求 | normalized-line:6227 |
| B13-035 | TEXT | 入金 | normalized-line:6228 |
| B13-036 | TEXT | 仕訳候補 | normalized-line:6229 |
| B13-037 | TEXT | 調達 | normalized-line:6230 |
| B13-038 | TEXT | 購買 | normalized-line:6231 |
| B13-039 | TEXT | 在庫 | normalized-line:6232 |
| B13-040 | TEXT | 受発注 | normalized-line:6233 |
| B13-041 | TEXT | SCM | normalized-line:6234 |
| B13-042 | TEXT | 人事 | normalized-line:6235 |
| B13-043 | TEXT | 給与 | normalized-line:6236 |
| B13-044 | TEXT | 予算 | normalized-line:6237 |
| B13-045 | TEXT | 経営管理 | normalized-line:6238 |
| B13-046 | TEXT | GRC | normalized-line:6239 |
| B13-047 | TEXT | AI Employee Runtime | normalized-line:6240 |
| B13-048 | TEXT | AI社員 | normalized-line:6241 |
| B13-049 | TEXT | ツール権限 | normalized-line:6242 |
| B13-050 | TEXT | 実行ログ | normalized-line:6243 |
| B13-051 | TEXT | 承認ゲート | normalized-line:6244 |
| B13-052 | TEXT | Human Certification Gate | normalized-line:6245 |
| B13-053 | TEXT | AI評価 | normalized-line:6246 |
| B13-054 | TEXT | 失敗時補償 | normalized-line:6247 |
| B13-055 | TEXT | Developer Cloud | normalized-line:6248 |
| B13-056 | TEXT | SDK | normalized-line:6249 |
| B13-057 | TEXT | CLI | normalized-line:6250 |
| B13-058 | TEXT | テンプレート | normalized-line:6251 |
| B13-059 | TEXT | Agent Manifest | normalized-line:6252 |
| B13-060 | TEXT | Tool Manifest | normalized-line:6253 |
| B13-061 | TEXT | Sandbox | normalized-line:6254 |
| B13-062 | TEXT | テスト | normalized-line:6255 |
| B13-063 | TEXT | 審査 | normalized-line:6256 |
| B13-064 | TEXT | 配布 | normalized-line:6257 |
| B13-065 | TEXT | 従量課金 | normalized-line:6258 |
| B13-066 | TEXT | Marketplace / Economy | normalized-line:6259 |
| B13-067 | TEXT | AI社員マーケットプレイス | normalized-line:6260 |
| B13-068 | TEXT | 業界テンプレート | normalized-line:6261 |
| B13-069 | TEXT | プラグイン販売 | normalized-line:6262 |
| B13-070 | TEXT | 開発者収益分配 | normalized-line:6263 |
| B13-071 | TEXT | 企業導入 | normalized-line:6264 |
| B13-072 | TEXT | 利用量課金 | normalized-line:6265 |
| B13-073 | TEXT | PLUG Commerce / Procurement Network | normalized-line:6266 |
| B13-074 | TEXT | ブラウザ拡張 | normalized-line:6267 |
| B13-075 | TEXT | EC横断価格比較 | normalized-line:6268 |
| B13-076 | TEXT | クーポン | normalized-line:6269 |
| B13-077 | TEXT | ポイント | normalized-line:6270 |
| B13-078 | TEXT | 送料 | normalized-line:6271 |
| B13-079 | TEXT | 納期 | normalized-line:6272 |
| B13-080 | TEXT | 法人購買 | normalized-line:6273 |
| B13-081 | TEXT | 承認購買 | normalized-line:6274 |
| B13-082 | TEXT | アフィリエイト透明化 | normalized-line:6275 |
| B13-083 | TEXT | 社員配布 | normalized-line:6276 |

### B14 4層インフラ構造

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:6277

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B14-001 | TEXT | IKEZAKI OSは「全部入りSaaS」ではなく、4層構造で評価してください。 | normalized-line:6278 |
| B14-002 | TEXT | 第1層: Core Infrastructure | normalized-line:6279 |
| B14-003 | TEXT | Company Identity | normalized-line:6280 |
| B14-004 | TEXT | Tenant / Company / User | normalized-line:6281 |
| B14-005 | TEXT | RBAC / ABAC | normalized-line:6282 |
| B14-006 | TEXT | Approval | normalized-line:6283 |
| B14-007 | TEXT | Audit Log | normalized-line:6284 |
| B14-008 | TEXT | Business Event Ledger | normalized-line:6285 |
| B14-009 | TEXT | AI Execution Ledger | normalized-line:6286 |
| B14-010 | TEXT | Data Contract | normalized-line:6287 |
| B14-011 | TEXT | Security Policy | normalized-line:6288 |
| B14-012 | TEXT | Billing / Entitlement | normalized-line:6289 |
| B14-013 | TEXT | Integration Hub | normalized-line:6290 |
| B14-014 | TEXT | Notification | normalized-line:6291 |
| B14-015 | TEXT | Records Management | normalized-line:6292 |
| B14-016 | TEXT | Trust Passport | normalized-line:6293 |
| B14-017 | TEXT | Growth Engine | normalized-line:6294 |
| B14-018 | TEXT | GitHub Evidence Repository | normalized-line:6295 |
| B14-019 | TEXT | Obsidian Knowledge Graph | normalized-line:6296 |
| B14-020 | TEXT | Release Governance | normalized-line:6297 |
| B14-021 | TEXT | Data Classification | normalized-line:6298 |
| B14-022 | TEXT | SLO / SLA | normalized-line:6299 |
| B14-023 | TEXT | Unit Economics | normalized-line:6300 |
| B14-024 | TEXT | 第2層: Business Modules | normalized-line:6301 |
| B14-025 | TEXT | CRM | normalized-line:6302 |
| B14-026 | TEXT | Sales | normalized-line:6303 |
| B14-027 | TEXT | Quote | normalized-line:6304 |
| B14-028 | TEXT | Contract | normalized-line:6305 |
| B14-029 | TEXT | Invoice | normalized-line:6306 |
| B14-030 | TEXT | Payment | normalized-line:6307 |
| B14-031 | TEXT | Accounting | normalized-line:6308 |
| B14-032 | TEXT | HR | normalized-line:6309 |
| B14-033 | TEXT | Inventory | normalized-line:6310 |
| B14-034 | TEXT | Purchase | normalized-line:6311 |
| B14-035 | TEXT | EC | normalized-line:6312 |
| B14-036 | TEXT | CS | normalized-line:6313 |
| B14-037 | TEXT | Marketing | normalized-line:6314 |
| B14-038 | TEXT | ITSM | normalized-line:6315 |
| B14-039 | TEXT | GRC | normalized-line:6316 |
| B14-040 | TEXT | PR / SEO | normalized-line:6317 |
| B14-041 | TEXT | Business Network | normalized-line:6318 |
| B14-042 | TEXT | Docs / Audit / Prompt Management | normalized-line:6319 |
| B14-043 | TEXT | Enterprise Procurement | normalized-line:6320 |
| B14-044 | TEXT | Customer Success | normalized-line:6321 |
| B14-045 | TEXT | Global Tax / E-invoicing | normalized-line:6322 |
| B14-046 | TEXT | 第3層: AI Agent Layer | normalized-line:6323 |
| B14-047 | TEXT | Sales AI | normalized-line:6324 |
| B14-048 | TEXT | Accounting AI | normalized-line:6325 |
| B14-049 | TEXT | HR AI | normalized-line:6326 |
| B14-050 | TEXT | Legal AI | normalized-line:6327 |
| B14-051 | TEXT | CS AI | normalized-line:6328 |
| B14-052 | TEXT | Executive AI | normalized-line:6329 |
| B14-053 | TEXT | Security AI | normalized-line:6330 |
| B14-054 | TEXT | Data AI | normalized-line:6331 |
| B14-055 | TEXT | PR AI | normalized-line:6332 |
| B14-056 | TEXT | SEO AI | normalized-line:6333 |
| B14-057 | TEXT | Growth AI | normalized-line:6334 |
| B14-058 | TEXT | Documentation AI | normalized-line:6335 |
| B14-059 | TEXT | Audit AI | normalized-line:6336 |
| B14-060 | TEXT | Agent Registry | normalized-line:6337 |
| B14-061 | TEXT | Agent Skills | normalized-line:6338 |
| B14-062 | TEXT | Agent Memory | normalized-line:6339 |
| B14-063 | TEXT | Agent Logs | normalized-line:6340 |
| B14-064 | TEXT | Human Approval | normalized-line:6341 |
| B14-065 | TEXT | Kill Switch | normalized-line:6342 |
| B14-066 | TEXT | AI Execution Ledger | normalized-line:6343 |
| B14-067 | TEXT | Model Router | normalized-line:6344 |
| B14-068 | TEXT | RAG Governance | normalized-line:6345 |
| B14-069 | TEXT | Prompt Injection Safety | normalized-line:6346 |
| B14-070 | TEXT | AI Cost Governance | normalized-line:6347 |
| B14-071 | TEXT | 第4層: Ecosystem | normalized-line:6348 |
| B14-072 | TEXT | API | normalized-line:6349 |
| B14-073 | TEXT | SDK | normalized-line:6350 |
| B14-074 | TEXT | MCP | normalized-line:6351 |
| B14-075 | TEXT | App Marketplace | normalized-line:6352 |
| B14-076 | TEXT | Agent Skill Marketplace | normalized-line:6353 |
| B14-077 | TEXT | Workflow Marketplace | normalized-line:6354 |
| B14-078 | TEXT | Industry Template Marketplace | normalized-line:6355 |
| B14-079 | TEXT | Creator Marketplace | normalized-line:6356 |
| B14-080 | TEXT | Affiliate / Advocate Network | normalized-line:6357 |
| B14-081 | TEXT | Certified Partners | normalized-line:6358 |
| B14-082 | TEXT | Developer Portal | normalized-line:6359 |
| B14-083 | TEXT | Creator Portal | normalized-line:6360 |
| B14-084 | TEXT | Advisor Directory | normalized-line:6361 |
| B14-085 | TEXT | Sandbox | normalized-line:6362 |
| B14-086 | TEXT | Trust Center | normalized-line:6363 |
| B14-087 | TEXT | Partner Review | normalized-line:6364 |
| B14-088 | TEXT | Business Network | normalized-line:6365 |
| B14-089 | TEXT | GitHub / Obsidian Knowledge Sharing | normalized-line:6366 |
| B14-090 | TEXT | Partner Payout Candidate | normalized-line:6367 |
| B14-091 | TEXT | Sector Deep Packs | normalized-line:6368 |

### B15 ロードマップの接続ルール

- classification: `ROADMAP_STRATEGY`
- heading source: normalized-line:6369

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B15-001 | TEXT | 3種類のロードマップを混同しないでください。 | normalized-line:6370 |
| B15-002 | TEXT | PDF上の OS本体ロードマップ | normalized-line:6371 |
| B15-003 | TEXT | Phase 2.5 から Phase 18 | normalized-line:6372 |
| B15-004 | TEXT | 初期MVP、Brain確立、外部提供、エコシステム、自己進化、Marketplace公開 | normalized-line:6373 |
| B15-005 | TEXT | PDF上の 戦略構想ロードマップ | normalized-line:6374 |
| B15-006 | TEXT | Phase 18.5 から Phase 26 | normalized-line:6375 |
| B15-007 | TEXT | Runtime標準化、Company Brain API Public、AI Employee Studio、Block Builder、SDK & Developer Portal、Safety Review、Marketplace、Developer Ecosystem、Open AI Workforce Economy | normalized-line:6376 |
| B15-008 | TEXT | 事業ロードマップ | normalized-line:6377 |
| B15-009 | TEXT | Phase 0 から Phase 20 | normalized-line:6378 |
| B15-010 | TEXT | Salesforce / Oracle / PLUG / Developer Cloud / Marketplace / Enterprise / 369経済圏まで含む | normalized-line:6379 |
| B15-011 | TEXT | 既存docsがある場合は、既存ロードマップを壊さず、以下のように接続してください。 | normalized-line:6380 |
| B15-012 | TEXT | 現行ロードマップ | normalized-line:6381 |
| B15-013 | TEXT | 拡張候補ロードマップ | normalized-line:6382 |
| B15-014 | TEXT | Phase対応表 | normalized-line:6383 |
| B15-015 | TEXT | Candidate扱い | normalized-line:6384 |
| B15-016 | TEXT | 正式採用に必要な承認 | normalized-line:6385 |

### B16 PDFロードマップ Phase 2.5-18

- classification: `ROADMAP_STRATEGY`
- heading source: normalized-line:6386

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B16-001 | TEXT | Phase 2.5: 初期MVP | normalized-line:6387 |
| B16-002 | LABEL | 主目的: | normalized-line:6388 |
| B16-003 | TEXT | 社内でAI社員を実運用する | normalized-line:6389 |
| B16-004 | TEXT | Company Brainの雛形を作る | normalized-line:6390 |
| B16-005 | LABEL | 完了条件: | normalized-line:6391 |
| B16-006 | TEXT | AI社員 5+ | normalized-line:6392 |
| B16-007 | TEXT | 稼働ログ整備 | normalized-line:6393 |
| B16-008 | TEXT | Phase 3: 承認・監査基盤 | normalized-line:6394 |
| B16-009 | LABEL | 主目的: | normalized-line:6395 |
| B16-010 | TEXT | 危険操作の承認と監査ログを実装 | normalized-line:6396 |
| B16-011 | LABEL | 完了条件: | normalized-line:6397 |
| B16-012 | TEXT | 監査ログ 100% | normalized-line:6398 |
| B16-013 | TEXT | 承認フロー稼働 | normalized-line:6399 |
| B16-014 | TEXT | Phase 4: Brain拡充 | normalized-line:6400 |
| B16-015 | LABEL | 主目的: | normalized-line:6401 |
| B16-016 | TEXT | Company Brainの取込対象を20項目まで拡張 | normalized-line:6402 |
| B16-017 | LABEL | 完了条件: | normalized-line:6403 |
| B16-018 | TEXT | 全部門データが流入 | normalized-line:6404 |
| B16-019 | TEXT | Phase 5: AI社員テンプレ化 | normalized-line:6405 |
| B16-020 | LABEL | 主目的: | normalized-line:6406 |
| B16-021 | TEXT | 再利用可能なAI社員テンプレを20+整備 | normalized-line:6407 |
| B16-022 | LABEL | 完了条件: | normalized-line:6408 |
| B16-023 | TEXT | テンプレライブラリ v1公開 | normalized-line:6409 |
| B16-024 | TEXT | Phase 6: 従量課金基盤 | normalized-line:6410 |
| B16-025 | LABEL | 主目的: | normalized-line:6411 |
| B16-026 | TEXT | 消費量計測と課金の全自動化 | normalized-line:6412 |
| B16-027 | LABEL | 完了条件: | normalized-line:6413 |
| B16-028 | TEXT | 請求まで自動連携 | normalized-line:6414 |
| B16-029 | TEXT | Phase 7: Fit-Gap Engine | normalized-line:6415 |
| B16-030 | LABEL | 主目的: | normalized-line:6416 |
| B16-031 | TEXT | 導入前診断を自動化し、標準/カスタム率を提示 | normalized-line:6417 |
| B16-032 | LABEL | 完了条件: | normalized-line:6418 |
| B16-033 | TEXT | 診断レポート自動生成 | normalized-line:6419 |
| B16-034 | TEXT | Phase 8: β外部提供 | normalized-line:6420 |
| B16-035 | LABEL | 主目的: | normalized-line:6421 |
| B16-036 | TEXT | 選定顧客に限定提供し、NPS・実利改善を実測 | normalized-line:6422 |
| B16-037 | LABEL | 完了条件: | normalized-line:6423 |
| B16-038 | TEXT | β顧客 5社 | normalized-line:6424 |
| B16-039 | TEXT | NPS 40+ | normalized-line:6425 |
| B16-040 | TEXT | Phase 9-10: GA / 一般提供 | normalized-line:6426 |
| B16-041 | LABEL | 主目的: | normalized-line:6427 |
| B16-042 | TEXT | 正式提供開始 | normalized-line:6428 |
| B16-043 | TEXT | 顧客支援体制の確立 | normalized-line:6429 |
| B16-044 | LABEL | 完了条件: | normalized-line:6430 |
| B16-045 | TEXT | SLA 99.9% | normalized-line:6431 |
| B16-046 | TEXT | 導入 30社 | normalized-line:6432 |
| B16-047 | TEXT | Phase 11: エコシステム始動 | normalized-line:6433 |
| B16-048 | LABEL | 主目的: | normalized-line:6434 |
| B16-049 | TEXT | パートナー開発SDKと外部AI社員の受入体制 | normalized-line:6435 |
| B16-050 | LABEL | 完了条件: | normalized-line:6436 |
| B16-051 | TEXT | SDK公開 | normalized-line:6437 |
| B16-052 | TEXT | パートナー 10社 | normalized-line:6438 |
| B16-053 | TEXT | Phase 12-13: Studio & Builder | normalized-line:6439 |
| B16-054 | LABEL | 主目的: | normalized-line:6440 |
| B16-055 | TEXT | 現場カスタマイズと独自ツール開発の民主化 | normalized-line:6441 |
| B16-056 | LABEL | 完了条件: | normalized-line:6442 |
| B16-057 | TEXT | 顧客の50%が自製 | normalized-line:6443 |
| B16-058 | TEXT | Phase 14: 自己進化稼働 | normalized-line:6444 |
| B16-059 | LABEL | 主目的: | normalized-line:6445 |
| B16-060 | TEXT | Self-Evolution Pipelineを全稼働し、成果指標を継続改善 | normalized-line:6446 |
| B16-061 | LABEL | 完了条件: | normalized-line:6447 |
| B16-062 | TEXT | 週次で改善リリース | normalized-line:6448 |
| B16-063 | TEXT | Phase 15: 品質・信頼 | normalized-line:6449 |
| B16-064 | LABEL | 主目的: | normalized-line:6450 |
| B16-065 | TEXT | セキュリティ認証 | normalized-line:6451 |
| B16-066 | TEXT | DR演習 | normalized-line:6452 |
| B16-067 | TEXT | 大手対応 | normalized-line:6453 |
| B16-068 | LABEL | 完了条件: | normalized-line:6454 |
| B16-069 | TEXT | SOC2 / ISO27001 取得候補 | normalized-line:6455 |
| B16-070 | TEXT | Phase 16: Marketplace | normalized-line:6456 |
| B16-071 | LABEL | 主目的: | normalized-line:6457 |
| B16-072 | TEXT | サードパーティ流通 | normalized-line:6458 |
| B16-073 | TEXT | 決済 | normalized-line:6459 |
| B16-074 | TEXT | 分配 | normalized-line:6460 |
| B16-075 | TEXT | 審査 | normalized-line:6461 |
| B16-076 | LABEL | 完了条件: | normalized-line:6462 |
| B16-077 | TEXT | 出品 200+ | normalized-line:6463 |
| B16-078 | TEXT | 流通額目標達成 | normalized-line:6464 |
| B16-079 | TEXT | Phase 18: 完成体 | normalized-line:6465 |
| B16-080 | LABEL | 主目的: | normalized-line:6466 |
| B16-081 | TEXT | Apple型経営OSの完成体 | normalized-line:6467 |

### B17 戦略構想ロードマップ Phase 18.5-26

- classification: `ROADMAP_STRATEGY`
- heading source: normalized-line:6468

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B17-001 | TEXT | Phase 18.5: Agent Runtime Standardization | normalized-line:6469 |
| B17-002 | TEXT | Runtimeの標準化 | normalized-line:6470 |
| B17-003 | TEXT | カーネル層の確立 | normalized-line:6471 |
| B17-004 | TEXT | Phase 19: Company Brain API Public | normalized-line:6472 |
| B17-005 | TEXT | 企業知識APIを外部AI会社にも開放 | normalized-line:6473 |
| B17-006 | TEXT | ただし権限・スコープ・監査ログ必須 | normalized-line:6474 |
| B17-007 | TEXT | Phase 20: AI Employee Studio Template | normalized-line:6475 |
| B17-008 | TEXT | テンプレート型スタジオを非エンジニア向けにローンチ | normalized-line:6476 |
| B17-009 | TEXT | Phase 21: Block Builder | normalized-line:6477 |
| B17-010 | TEXT | ノーコード / ローコードのブロック型開発環境 | normalized-line:6478 |
| B17-011 | TEXT | Phase 22: SDK & Developer Portal | normalized-line:6479 |
| B17-012 | TEXT | AI会社・上級開発者向け開発基盤の一般公開 | normalized-line:6480 |
| B17-013 | TEXT | Phase 23: Safety Review & Certification | normalized-line:6481 |
| B17-014 | TEXT | 審査基盤 | normalized-line:6482 |
| B17-015 | TEXT | 認定バッジ制度 | normalized-line:6483 |
| B17-016 | TEXT | Phase 24: 369 Marketplace Launch | normalized-line:6484 |
| B17-017 | TEXT | 流通市場の一般公開 | normalized-line:6485 |
| B17-018 | TEXT | 決済 & 分配運用開始 | normalized-line:6486 |
| B17-019 | TEXT | Phase 25: Developer Ecosystem Expansion | normalized-line:6487 |
| B17-020 | TEXT | パートナー拡大 | normalized-line:6488 |
| B17-021 | TEXT | 国際化 | normalized-line:6489 |
| B17-022 | TEXT | 業界特化パッケージ強化 | normalized-line:6490 |
| B17-023 | TEXT | Phase 26: Open AI Workforce Economy | normalized-line:6491 |
| B17-024 | TEXT | 369経済圏の完成 | normalized-line:6492 |
| B17-025 | TEXT | AI社員経済インフラとして世界標準へ | normalized-line:6493 |
| B17-026 | LABEL | 実行順序: | normalized-line:6494 |
| B17-027 | TEXT | 369本体 | normalized-line:6495 |
| B17-028 | TEXT | Company Brain | normalized-line:6496 |
| B17-029 | TEXT | 従量課金ツール | normalized-line:6497 |
| B17-030 | TEXT | AI補助社員 | normalized-line:6498 |
| B17-031 | TEXT | AI社員 | normalized-line:6499 |
| B17-032 | TEXT | Runtime標準化 | normalized-line:6500 |
| B17-033 | TEXT | AI Employee Studio | normalized-line:6501 |
| B17-034 | TEXT | Marketplace | normalized-line:6502 |
| B17-035 | TEXT | Developer Ecosystem | normalized-line:6503 |

### B18 事業ロードマップ Phase 0-20

- classification: `ROADMAP_STRATEGY`
- heading source: normalized-line:6504

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B18-001 | TEXT | Phase 0: Core OS / 安全基盤 | normalized-line:6505 |
| B18-002 | LABEL | 現在: | normalized-line:6506 |
| B18-003 | TEXT | かなり進行済み候補 | normalized-line:6507 |
| B18-004 | LABEL | 対象: | normalized-line:6508 |
| B18-005 | TEXT | 認証 | normalized-line:6509 |
| B18-006 | TEXT | ユーザー | normalized-line:6510 |
| B18-007 | TEXT | 会社 | normalized-line:6511 |
| B18-008 | TEXT | テナント分離 | normalized-line:6512 |
| B18-009 | TEXT | 権限 | normalized-line:6513 |
| B18-010 | TEXT | Role | normalized-line:6514 |
| B18-011 | TEXT | AuditLog | normalized-line:6515 |
| B18-012 | TEXT | DataAccessLog | normalized-line:6516 |
| B18-013 | TEXT | Approval | normalized-line:6517 |
| B18-014 | TEXT | 機密ラベル | normalized-line:6518 |
| B18-015 | TEXT | Consent | normalized-line:6519 |
| B18-016 | TEXT | Suppression | normalized-line:6520 |
| B18-017 | TEXT | 本番確認記録 | normalized-line:6521 |
| B18-018 | TEXT | CURRENT_STATE管理 | normalized-line:6522 |
| B18-019 | TEXT | テスト / CI | normalized-line:6523 |
| B18-020 | LABEL | 完了条件: | normalized-line:6524 |
| B18-021 | TEXT | tenantId分離 | normalized-line:6525 |
| B18-022 | TEXT | 権限管理 | normalized-line:6526 |
| B18-023 | TEXT | 監査ログ | normalized-line:6527 |
| B18-024 | TEXT | 承認ログ | normalized-line:6528 |
| B18-025 | TEXT | AIロール制限 | normalized-line:6529 |
| B18-026 | TEXT | 危険操作の人間承認 | normalized-line:6530 |
| B18-027 | TEXT | 本番確認の記録文化 | normalized-line:6531 |
| B18-028 | TEXT | 非エンジニアにも現在地が分かる | normalized-line:6532 |
| B18-029 | LABEL | 目安: | normalized-line:6533 |
| B18-030 | TEXT | Day 1-14 | normalized-line:6534 |
| B18-031 | TEXT | Phase 1: Company Brain 基盤 | normalized-line:6535 |
| B18-032 | LABEL | 対象: | normalized-line:6536 |
| B18-033 | TEXT | 会社方針 | normalized-line:6537 |
| B18-034 | TEXT | 商品 / サービスカタログ | normalized-line:6538 |
| B18-035 | TEXT | 営業プレイブック | normalized-line:6539 |
| B18-036 | TEXT | 匿名顧客事例 | normalized-line:6540 |
| B18-037 | TEXT | 社内FAQ | normalized-line:6541 |
| B18-038 | TEXT | 業務マニュアル | normalized-line:6542 |
| B18-039 | TEXT | AI参照ログ | normalized-line:6543 |
| B18-040 | TEXT | 外部送信禁止 | normalized-line:6544 |
| B18-041 | TEXT | 機密ラベル | normalized-line:6545 |
| B18-042 | LABEL | 完了条件: | normalized-line:6546 |
| B18-043 | TEXT | 人間がCompany Brainを書ける | normalized-line:6547 |
| B18-044 | TEXT | AIが安全条件つきで読める | normalized-line:6548 |
| B18-045 | TEXT | AIが勝手に編集できない | normalized-line:6549 |
| B18-046 | TEXT | 外部LLMへ無断送信しない | normalized-line:6550 |
| B18-047 | TEXT | 参照履歴が残る | normalized-line:6551 |
| B18-048 | TEXT | 営業 / 教育 / 提案に使える | normalized-line:6552 |
| B18-049 | LABEL | 目安: | normalized-line:6553 |
| B18-050 | TEXT | Day 7-30 | normalized-line:6554 |
| B18-051 | TEXT | Phase 2: Salesforce Mini / CRM基盤 | normalized-line:6555 |
| B18-052 | LABEL | 最初の完成形: | normalized-line:6556 |
| B18-053 | TEXT | 顧客 | normalized-line:6557 |
| B18-054 | TEXT | 商談 | normalized-line:6558 |
| B18-055 | TEXT | 見積 | normalized-line:6559 |
| B18-056 | TEXT | 契約 | normalized-line:6560 |
| B18-057 | TEXT | 請求候補 | normalized-line:6561 |
| B18-058 | TEXT | 売上 | normalized-line:6562 |
| B18-059 | TEXT | AI分析 | normalized-line:6563 |
| B18-060 | LABEL | 機能候補: | normalized-line:6564 |
| B18-061 | TEXT | 顧客管理 | normalized-line:6565 |
| B18-062 | TEXT | 連絡先管理 | normalized-line:6566 |
| B18-063 | TEXT | リード管理 | normalized-line:6567 |
| B18-064 | TEXT | 商談管理 | normalized-line:6568 |
| B18-065 | TEXT | パイプライン | normalized-line:6569 |
| B18-066 | TEXT | 活動履歴 | normalized-line:6570 |
| B18-067 | TEXT | タスク | normalized-line:6571 |
| B18-068 | TEXT | 見積 | normalized-line:6572 |
| B18-069 | TEXT | 契約 | normalized-line:6573 |
| B18-070 | TEXT | 請求候補 | normalized-line:6574 |
| B18-071 | TEXT | 営業KPI | normalized-line:6575 |
| B18-072 | TEXT | 失注理由 | normalized-line:6576 |
| B18-073 | TEXT | 顧客ランク | normalized-line:6577 |
| B18-074 | TEXT | 次アクション | normalized-line:6578 |
| B18-075 | TEXT | AI営業提案 | normalized-line:6579 |
| B18-076 | TEXT | SFA | normalized-line:6580 |
| B18-077 | TEXT | CPQ | normalized-line:6581 |
| B18-078 | TEXT | Revenue Lifecycle Management | normalized-line:6582 |
| B18-079 | TEXT | Partner管理 | normalized-line:6583 |
| B18-080 | TEXT | Service管理 | normalized-line:6584 |
| B18-081 | TEXT | Contact Center | normalized-line:6585 |
| B18-082 | TEXT | Field Service | normalized-line:6586 |
| B18-083 | TEXT | Marketing Automation | normalized-line:6587 |
| B18-084 | TEXT | CDP / 統合顧客データ | normalized-line:6588 |
| B18-085 | TEXT | Loyalty | normalized-line:6589 |
| B18-086 | TEXT | Commerce | normalized-line:6590 |
| B18-087 | TEXT | Order Management | normalized-line:6591 |
| B18-088 | TEXT | BI / Analytics | normalized-line:6592 |
| B18-089 | LABEL | 目安: | normalized-line:6593 |
| B18-090 | TEXT | Day 15-60: 営業デモ | normalized-line:6594 |
| B18-091 | TEXT | Day 60-120: 中小企業CRMとして販売可能 | normalized-line:6595 |
| B18-092 | TEXT | Day 180-365: Salesforce的広がり | normalized-line:6596 |
| B18-093 | TEXT | Phase 3: AI Growth Engine | normalized-line:6597 |
| B18-094 | LABEL | 位置づけ: | normalized-line:6598 |
| B18-095 | TEXT | Salesforce Layer と Oracle Layer の間 | normalized-line:6599 |
| B18-096 | LABEL | 機能候補: | normalized-line:6600 |
| B18-097 | TEXT | MarketingEvent | normalized-line:6601 |
| B18-098 | TEXT | ConversionEvent | normalized-line:6602 |
| B18-099 | TEXT | RevenueEvent | normalized-line:6603 |
| B18-100 | TEXT | CostEvent | normalized-line:6604 |
| B18-101 | TEXT | Growth Event Ledger | normalized-line:6605 |
| B18-102 | TEXT | 広告費 | normalized-line:6606 |
| B18-103 | TEXT | CV | normalized-line:6607 |
| B18-104 | TEXT | 売上 | normalized-line:6608 |
| B18-105 | TEXT | 粗利 | normalized-line:6609 |
| B18-106 | TEXT | LTV | normalized-line:6610 |
| B18-107 | TEXT | CPA | normalized-line:6611 |
| B18-108 | TEXT | ROAS | normalized-line:6612 |
| B18-109 | TEXT | 粗利ROAS | normalized-line:6613 |
| B18-110 | TEXT | 媒体別成果 | normalized-line:6614 |
| B18-111 | TEXT | キャンペーン別成果 | normalized-line:6615 |
| B18-112 | TEXT | AI Growth Report | normalized-line:6616 |
| B18-113 | TEXT | AI改善提案 | normalized-line:6617 |
| B18-114 | TEXT | Confidence Score | normalized-line:6618 |
| B18-115 | TEXT | Data Sufficiency | normalized-line:6619 |
| B18-116 | TEXT | Recommendation Outcome | normalized-line:6620 |
| B18-117 | LABEL | 完了条件: | normalized-line:6621 |
| B18-118 | TEXT | 数字が見える | normalized-line:6622 |
| B18-119 | TEXT | AIが根拠つきで提案する | normalized-line:6623 |
| B18-120 | TEXT | 成果保証しない | normalized-line:6624 |
| B18-121 | TEXT | データ不足を隠さない | normalized-line:6625 |
| B18-122 | TEXT | 外部実行しない | normalized-line:6626 |
| B18-123 | TEXT | Approvalに接続できる | normalized-line:6627 |
| B18-124 | LABEL | 目安: | normalized-line:6628 |
| B18-125 | TEXT | Day 30-90: MVP | normalized-line:6629 |
| B18-126 | TEXT | Day 90-180: 有料βの中核 | normalized-line:6630 |
| B18-127 | TEXT | Phase 4: Human Certification Gate / AI安全実行 | normalized-line:6631 |
| B18-128 | LABEL | 対象: | normalized-line:6632 |
| B18-129 | TEXT | Approval Inbox | normalized-line:6633 |
| B18-130 | TEXT | Human Certification Gate | normalized-line:6634 |
| B18-131 | TEXT | 二重承認 | normalized-line:6635 |
| B18-132 | TEXT | 差し戻し | normalized-line:6636 |
| B18-133 | TEXT | リスク表示 | normalized-line:6637 |
| B18-134 | TEXT | 承認者表示 | normalized-line:6638 |
| B18-135 | TEXT | 承認理由 | normalized-line:6639 |
| B18-136 | TEXT | AI信頼度 | normalized-line:6640 |
| B18-137 | TEXT | Data Sufficiency | normalized-line:6641 |
| B18-138 | TEXT | Consent Gate | normalized-line:6642 |
| B18-139 | TEXT | Compliance Guard | normalized-line:6643 |
| B18-140 | TEXT | Kill Switch | normalized-line:6644 |
| B18-141 | TEXT | 実行前プレビュー | normalized-line:6645 |
| B18-142 | TEXT | 実行後ログ | normalized-line:6646 |
| B18-143 | TEXT | 補償アクション | normalized-line:6647 |
| B18-144 | LABEL | 承認対象: | normalized-line:6648 |
| B18-145 | TEXT | 営業メール送信 | normalized-line:6649 |
| B18-146 | TEXT | LINE送信 | normalized-line:6650 |
| B18-147 | TEXT | SNS投稿 | normalized-line:6651 |
| B18-148 | TEXT | 広告予算変更 | normalized-line:6652 |
| B18-149 | TEXT | 請求書発行 | normalized-line:6653 |
| B18-150 | TEXT | 請求書送付 | normalized-line:6654 |
| B18-151 | TEXT | 入金消込 | normalized-line:6655 |
| B18-152 | TEXT | 会計仕訳 | normalized-line:6656 |
| B18-153 | TEXT | 値引き | normalized-line:6657 |
| B18-154 | TEXT | 契約変更 | normalized-line:6658 |
| B18-155 | TEXT | 顧客事例公開 | normalized-line:6659 |
| B18-156 | TEXT | 外部AI送信 | normalized-line:6660 |
| B18-157 | TEXT | データエクスポート | normalized-line:6661 |
| B18-158 | TEXT | AI社員による外部実行 | normalized-line:6662 |
| B18-159 | LABEL | 目安: | normalized-line:6663 |
| B18-160 | TEXT | Day 60-120: 初期版 | normalized-line:6664 |
| B18-161 | TEXT | Day 120-240: 本格版 | normalized-line:6665 |
| B18-162 | TEXT | Phase 5: Oracle Mini / ERP基盤 | normalized-line:6666 |
| B18-163 | LABEL | 財務 / 会計: | normalized-line:6667 |
| B18-164 | TEXT | 請求 | normalized-line:6668 |
| B18-165 | TEXT | 入金 | normalized-line:6669 |
| B18-166 | TEXT | 売掛 | normalized-line:6670 |
| B18-167 | TEXT | 買掛 | normalized-line:6671 |
| B18-168 | TEXT | 支払 | normalized-line:6672 |
| B18-169 | TEXT | 経費 | normalized-line:6673 |
| B18-170 | TEXT | 資産 | normalized-line:6674 |
| B18-171 | TEXT | 売上認識 | normalized-line:6675 |
| B18-172 | TEXT | 粗利 | normalized-line:6676 |
| B18-173 | TEXT | 資金繰り | normalized-line:6677 |
| B18-174 | TEXT | 仕訳候補 | normalized-line:6678 |
| B18-175 | TEXT | 会計連携 | normalized-line:6679 |
| B18-176 | TEXT | 月次締め | normalized-line:6680 |
| B18-177 | TEXT | 税区分候補 | normalized-line:6681 |
| B18-178 | LABEL | 調達 / 購買: | normalized-line:6682 |
| B18-179 | TEXT | 仕入先 | normalized-line:6683 |
| B18-180 | TEXT | 発注 | normalized-line:6684 |
| B18-181 | TEXT | 購買申請 | normalized-line:6685 |
| B18-182 | TEXT | 承認購買 | normalized-line:6686 |
| B18-183 | TEXT | 支払予定 | normalized-line:6687 |
| B18-184 | TEXT | 調達契約 | normalized-line:6688 |
| B18-185 | TEXT | 価格比較 | normalized-line:6689 |
| B18-186 | TEXT | 法人購買ポリシー | normalized-line:6690 |
| B18-187 | LABEL | プロジェクト管理: | normalized-line:6691 |
| B18-188 | TEXT | 案件原価 | normalized-line:6692 |
| B18-189 | TEXT | 工数 | normalized-line:6693 |
| B18-190 | TEXT | 外注費 | normalized-line:6694 |
| B18-191 | TEXT | 請求進捗 | normalized-line:6695 |
| B18-192 | TEXT | 利益率 | normalized-line:6696 |
| B18-193 | TEXT | プロジェクト別採算 | normalized-line:6697 |
| B18-194 | LABEL | EPM / 経営管理: | normalized-line:6698 |
| B18-195 | TEXT | 予算 | normalized-line:6699 |
| B18-196 | TEXT | 予実管理 | normalized-line:6700 |
| B18-197 | TEXT | 着地予測 | normalized-line:6701 |
| B18-198 | TEXT | 利益計画 | normalized-line:6702 |
| B18-199 | TEXT | 資金計画 | normalized-line:6703 |
| B18-200 | TEXT | 部門別PL | normalized-line:6704 |
| B18-201 | TEXT | KPI | normalized-line:6705 |
| B18-202 | TEXT | 経営会議レポート | normalized-line:6706 |
| B18-203 | LABEL | GRC / 内部統制: | normalized-line:6707 |
| B18-204 | TEXT | 権限分掌 | normalized-line:6708 |
| B18-205 | TEXT | 職務分離 | normalized-line:6709 |
| B18-206 | TEXT | 承認ルール | normalized-line:6710 |
| B18-207 | TEXT | 監査証跡 | normalized-line:6711 |
| B18-208 | TEXT | 不正検知 | normalized-line:6712 |
| B18-209 | TEXT | 異常取引検知 | normalized-line:6713 |
| B18-210 | TEXT | SOX / 内部統制対応の土台 | normalized-line:6714 |
| B18-211 | LABEL | 目安: | normalized-line:6715 |
| B18-212 | TEXT | Day 90-210: Oracle Mini | normalized-line:6716 |
| B18-213 | TEXT | Day 210-450: 中小企業ERPとして成立 | normalized-line:6717 |
| B18-214 | TEXT | Day 450以降: 大企業向けERP/GRC強化 | normalized-line:6718 |
| B18-215 | TEXT | Phase 6: PLUG型 Commerce / Affiliate / 購買エンジン | normalized-line:6719 |
| B18-216 | TEXT | これは単なるアフィリエイトではなく、導入企業の従業員の日常購買と法人購買に入り込む導線です。 | normalized-line:6720 |
| B18-217 | LABEL | B2C向け: | normalized-line:6721 |
| B18-218 | TEXT | ブラウザ拡張 | normalized-line:6722 |
| B18-219 | TEXT | 商品ページ認識 | normalized-line:6723 |
| B18-220 | TEXT | JAN / ASIN / 型番 / 商品名抽出 | normalized-line:6724 |
| B18-221 | TEXT | 複数ECサイト横断価格比較 | normalized-line:6725 |
| B18-222 | TEXT | 送料込み価格 | normalized-line:6726 |
| B18-223 | TEXT | ポイント込み実質価格 | normalized-line:6727 |
| B18-224 | TEXT | クーポン込み価格 | normalized-line:6728 |
| B18-225 | TEXT | 納期比較 | normalized-line:6729 |
| B18-226 | TEXT | 在庫比較 | normalized-line:6730 |
| B18-227 | TEXT | 価格履歴 | normalized-line:6731 |
| B18-228 | TEXT | 値下げ通知 | normalized-line:6732 |
| B18-229 | TEXT | 最安候補表示 | normalized-line:6733 |
| B18-230 | TEXT | 購入リンク | normalized-line:6734 |
| B18-231 | TEXT | アフィリエイト計測 | normalized-line:6735 |
| B18-232 | TEXT | ユーザー還元 | normalized-line:6736 |
| B18-233 | LABEL | B2B / 法人購買向け: | normalized-line:6737 |
| B18-234 | TEXT | 会社指定ショップ | normalized-line:6738 |
| B18-235 | TEXT | 購買ポリシー | normalized-line:6739 |
| B18-236 | TEXT | 承認購買 | normalized-line:6740 |
| B18-237 | TEXT | 部署別予算 | normalized-line:6741 |
| B18-238 | TEXT | 勘定科目候補 | normalized-line:6742 |
| B18-239 | TEXT | 経費精算連携 | normalized-line:6743 |
| B18-240 | TEXT | 請求書払い対応 | normalized-line:6744 |
| B18-241 | TEXT | 法人価格比較 | normalized-line:6745 |
| B18-242 | TEXT | 購買履歴 | normalized-line:6746 |
| B18-243 | TEXT | 購買コスト削減レポート | normalized-line:6747 |
| B18-244 | TEXT | 仕入先評価 | normalized-line:6748 |
| B18-245 | TEXT | 不正購買検知 | normalized-line:6749 |
| B18-246 | TEXT | 購買申請 → 承認 → 発注 → 請求 → 会計候補 | normalized-line:6750 |
| B18-247 | LABEL | 重要設計ルール: | normalized-line:6751 |
| B18-248 | TEXT | アフィリエイトリンク挿入は明示する | normalized-line:6752 |
| B18-249 | TEXT | ユーザーに利益がある時だけ表示する | normalized-line:6753 |
| B18-250 | TEXT | 元リンクを無断で奪う設計にしない | normalized-line:6754 |
| B18-251 | TEXT | どのリンクで誰に手数料が入るか透明化する | normalized-line:6755 |
| B18-252 | TEXT | 企業管理者が利用範囲を制御できる | normalized-line:6756 |
| B18-253 | TEXT | 購買履歴は個人情報・行動データとして慎重に扱う | normalized-line:6757 |
| B18-254 | TEXT | Chrome拡張の権限は最小化する | normalized-line:6758 |
| B18-255 | TEXT | 拡張機能のセキュリティ審査を必須にする | normalized-line:6759 |
| B18-256 | LABEL | 目安: | normalized-line:6760 |
| B18-257 | TEXT | Day 90-150: PLUG型ミニ版技術検証 | normalized-line:6761 |
| B18-258 | TEXT | Day 150-240: 法人購買版β | normalized-line:6762 |
| B18-259 | TEXT | Day 240-365: 従業員配布版 | normalized-line:6763 |
| B18-260 | TEXT | Day 365以降: 本格アフィリエイト / 購買ネットワーク | normalized-line:6764 |
| B18-261 | TEXT | Phase 7: Commerce / EC / Order Management | normalized-line:6765 |
| B18-262 | LABEL | 機能候補: | normalized-line:6766 |
| B18-263 | TEXT | 商品管理 | normalized-line:6767 |
| B18-264 | TEXT | 価格表 | normalized-line:6768 |
| B18-265 | TEXT | 見積 | normalized-line:6769 |
| B18-266 | TEXT | 注文 | normalized-line:6770 |
| B18-267 | TEXT | 受注 | normalized-line:6771 |
| B18-268 | TEXT | 決済候補 | normalized-line:6772 |
| B18-269 | TEXT | 請求 | normalized-line:6773 |
| B18-270 | TEXT | 発送 | normalized-line:6774 |
| B18-271 | TEXT | 返品 | normalized-line:6775 |
| B18-272 | TEXT | 交換 | normalized-line:6776 |
| B18-273 | TEXT | 在庫 | normalized-line:6777 |
| B18-274 | TEXT | ECページ | normalized-line:6778 |
| B18-275 | TEXT | B2B注文 | normalized-line:6779 |
| B18-276 | TEXT | 法人価格 | normalized-line:6780 |
| B18-277 | TEXT | クーポン | normalized-line:6781 |
| B18-278 | TEXT | キャンペーン | normalized-line:6782 |
| B18-279 | TEXT | 顧客別価格 | normalized-line:6783 |
| B18-280 | TEXT | ポイント / ロイヤルティ | normalized-line:6784 |
| B18-281 | TEXT | POS連携 | normalized-line:6785 |
| B18-282 | TEXT | PLUG連携 | normalized-line:6786 |
| B18-283 | LABEL | 目安: | normalized-line:6787 |
| B18-284 | TEXT | Day 120-240: 簡易版 | normalized-line:6788 |
| B18-285 | TEXT | Day 240-450: EC / Order Managementとして成立 | normalized-line:6789 |
| B18-286 | TEXT | Phase 8: Developer Cloud / 開発環境 | normalized-line:6790 |
| B18-287 | LABEL | 目的: | normalized-line:6791 |
| B18-288 | TEXT | 開発者が369上で作る方が儲かり、速く、安全で、顧客に届く状態を作る | normalized-line:6792 |
| B18-289 | LABEL | 開発者ポータル: | normalized-line:6793 |
| B18-290 | TEXT | 開発者登録 | normalized-line:6794 |
| B18-291 | TEXT | Organization | normalized-line:6795 |
| B18-292 | TEXT | 開発者プロフィール | normalized-line:6796 |
| B18-293 | TEXT | 収益管理 | normalized-line:6797 |
| B18-294 | TEXT | アプリ一覧 | normalized-line:6798 |
| B18-295 | TEXT | AI社員一覧 | normalized-line:6799 |
| B18-296 | TEXT | 審査状況 | normalized-line:6800 |
| B18-297 | TEXT | 利用状況 | normalized-line:6801 |
| B18-298 | TEXT | エラー状況 | normalized-line:6802 |
| B18-299 | TEXT | 売上状況 | normalized-line:6803 |
| B18-300 | LABEL | AI社員開発キット: | normalized-line:6804 |
| B18-301 | TEXT | Agent Template | normalized-line:6805 |
| B18-302 | TEXT | Plugin Template | normalized-line:6806 |
| B18-303 | TEXT | Skill Template | normalized-line:6807 |
| B18-304 | TEXT | Workflow Template | normalized-line:6808 |
| B18-305 | TEXT | Prompt Template | normalized-line:6809 |
| B18-306 | TEXT | Tool Connector Template | normalized-line:6810 |
| B18-307 | TEXT | Data Access Template | normalized-line:6811 |
| B18-308 | TEXT | Approval Template | normalized-line:6812 |
| B18-309 | TEXT | Billing Template | normalized-line:6813 |
| B18-310 | LABEL | SDK / CLI: | normalized-line:6814 |
| B18-311 | TEXT | 369 create agent | normalized-line:6815 |
| B18-312 | TEXT | 369 dev | normalized-line:6816 |
| B18-313 | TEXT | 369 test | normalized-line:6817 |
| B18-314 | TEXT | 369 validate | normalized-line:6818 |
| B18-315 | TEXT | 369 deploy | normalized-line:6819 |
| B18-316 | TEXT | 369 publish | normalized-line:6820 |
| B18-317 | TEXT | 369 logs | normalized-line:6821 |
| B18-318 | TEXT | 369 billing | normalized-line:6822 |
| B18-319 | TEXT | 369 rollback | normalized-line:6823 |
| B18-320 | LABEL | Agent Manifest: | normalized-line:6824 |
| B18-321 | TEXT | 名前 | normalized-line:6825 |
| B18-322 | TEXT | 説明 | normalized-line:6826 |
| B18-323 | TEXT | 対象業務 | normalized-line:6827 |
| B18-324 | TEXT | 必要権限 | normalized-line:6828 |
| B18-325 | TEXT | 読めるデータ | normalized-line:6829 |
| B18-326 | TEXT | 書けるデータ | normalized-line:6830 |
| B18-327 | TEXT | 外部送信有無 | normalized-line:6831 |
| B18-328 | TEXT | Human Certification必要条件 | normalized-line:6832 |
| B18-329 | TEXT | 課金単位 | normalized-line:6833 |
| B18-330 | TEXT | 実行ログ | normalized-line:6834 |
| B18-331 | TEXT | 失敗時処理 | normalized-line:6835 |
| B18-332 | TEXT | 禁止操作 | normalized-line:6836 |
| B18-333 | TEXT | 対応業種 | normalized-line:6837 |
| B18-334 | TEXT | バージョン | normalized-line:6838 |
| B18-335 | TEXT | 開発者情報 | normalized-line:6839 |
| B18-336 | LABEL | Sandbox: | normalized-line:6840 |
| B18-337 | TEXT | 架空データ | normalized-line:6841 |
| B18-338 | TEXT | テスト用テナント | normalized-line:6842 |
| B18-339 | TEXT | モック外部API | normalized-line:6843 |
| B18-340 | TEXT | 危険操作ブロック | normalized-line:6844 |
| B18-341 | TEXT | 請求 / 会計 / 外部送信の疑似実行 | normalized-line:6845 |
| B18-342 | TEXT | 審査前テスト | normalized-line:6846 |
| B18-343 | LABEL | Certification: | normalized-line:6847 |
| B18-344 | TEXT | セキュリティ審査 | normalized-line:6848 |
| B18-345 | TEXT | 個人情報審査 | normalized-line:6849 |
| B18-346 | TEXT | 外部送信審査 | normalized-line:6850 |
| B18-347 | TEXT | 課金審査 | normalized-line:6851 |
| B18-348 | TEXT | AI安全性審査 | normalized-line:6852 |
| B18-349 | TEXT | Human Certification対応審査 | normalized-line:6853 |
| B18-350 | TEXT | 業界別審査 | normalized-line:6854 |
| B18-351 | TEXT | 更新審査 | normalized-line:6855 |
| B18-352 | LABEL | 目安: | normalized-line:6856 |
| B18-353 | TEXT | Day 120-210: Developer Cloud Alpha | normalized-line:6857 |
| B18-354 | TEXT | Day 210-300: 外部開発者β | normalized-line:6858 |
| B18-355 | TEXT | Day 300-450: Marketplace連携 | normalized-line:6859 |
| B18-356 | TEXT | Day 450以降: 開発者経済圏 | normalized-line:6860 |
| B18-357 | TEXT | Phase 9: AI社員 Marketplace | normalized-line:6861 |
| B18-358 | LABEL | 機能候補: | normalized-line:6862 |
| B18-359 | TEXT | AI社員一覧 | normalized-line:6863 |
| B18-360 | TEXT | 業種別カテゴリ | normalized-line:6864 |
| B18-361 | TEXT | 職種別カテゴリ | normalized-line:6865 |
| B18-362 | TEXT | 価格 | normalized-line:6866 |
| B18-363 | TEXT | 評価 | normalized-line:6867 |
| B18-364 | TEXT | 導入数 | normalized-line:6868 |
| B18-365 | TEXT | 権限表示 | normalized-line:6869 |
| B18-366 | TEXT | データ利用範囲表示 | normalized-line:6870 |
| B18-367 | TEXT | 外部送信有無 | normalized-line:6871 |
| B18-368 | TEXT | Human Certification対応 | normalized-line:6872 |
| B18-369 | TEXT | 監査対応 | normalized-line:6873 |
| B18-370 | TEXT | 開発者プロフィール | normalized-line:6874 |
| B18-371 | TEXT | 無料トライアル | normalized-line:6875 |
| B18-372 | TEXT | 有料導入 | normalized-line:6876 |
| B18-373 | TEXT | 従量課金 | normalized-line:6877 |
| B18-374 | TEXT | 収益分配 | normalized-line:6878 |
| B18-375 | TEXT | 返金ルール | normalized-line:6879 |
| B18-376 | TEXT | バージョン管理 | normalized-line:6880 |
| B18-377 | TEXT | 更新通知 | normalized-line:6881 |
| B18-378 | TEXT | 企業管理者による承認導入 | normalized-line:6882 |
| B18-379 | LABEL | AI社員例: | normalized-line:6883 |
| B18-380 | TEXT | 営業AI社員 | normalized-line:6884 |
| B18-381 | TEXT | 問い合わせ対応AI社員 | normalized-line:6885 |
| B18-382 | TEXT | 広告改善AI社員 | normalized-line:6886 |
| B18-383 | TEXT | 請求チェックAI社員 | normalized-line:6887 |
| B18-384 | TEXT | 入金確認AI社員 | normalized-line:6888 |
| B18-385 | TEXT | 経費確認AI社員 | normalized-line:6889 |
| B18-386 | TEXT | 採用スクリーニングAI社員 | normalized-line:6890 |
| B18-387 | TEXT | 研修AI社員 | normalized-line:6891 |
| B18-388 | TEXT | 在庫最適化AI社員 | normalized-line:6892 |
| B18-389 | TEXT | 購買最適化AI社員 | normalized-line:6893 |
| B18-390 | TEXT | 法務チェックAI社員 | normalized-line:6894 |
| B18-391 | TEXT | コンプライアンスAI社員 | normalized-line:6895 |
| B18-392 | TEXT | EC改善AI社員 | normalized-line:6896 |
| B18-393 | TEXT | SNS下書きAI社員 | normalized-line:6897 |
| B18-394 | TEXT | カスタマーサクセスAI社員 | normalized-line:6898 |
| B18-395 | TEXT | 経営会議資料作成AI社員 | normalized-line:6899 |
| B18-396 | LABEL | 完了条件: | normalized-line:6900 |
| B18-397 | TEXT | 外部開発者がAI社員を作れる | normalized-line:6901 |
| B18-398 | TEXT | 審査できる | normalized-line:6902 |
| B18-399 | TEXT | 配布できる | normalized-line:6903 |
| B18-400 | TEXT | 課金できる | normalized-line:6904 |
| B18-401 | TEXT | 利用ログが取れる | normalized-line:6905 |
| B18-402 | TEXT | 企業管理者が導入可否を管理できる | normalized-line:6906 |
| B18-403 | TEXT | 危険操作はHuman Certification Gateに接続される | normalized-line:6907 |
| B18-404 | LABEL | 目安: | normalized-line:6908 |
| B18-405 | TEXT | Day 210-365: Marketplace β | normalized-line:6909 |
| B18-406 | TEXT | Day 365-540: 本格流通 | normalized-line:6910 |
| B18-407 | TEXT | Day 540以降: 経済圏化 | normalized-line:6911 |
| B18-408 | TEXT | Phase 10: Oracle SCM / 在庫 / 調達 / サプライチェーン | normalized-line:6912 |
| B18-409 | LABEL | 機能候補: | normalized-line:6913 |
| B18-410 | TEXT | 商品 / 資産管理 | normalized-line:6914 |
| B18-411 | TEXT | 在庫 | normalized-line:6915 |
| B18-412 | TEXT | 入庫 | normalized-line:6916 |
| B18-413 | TEXT | 出庫 | normalized-line:6917 |
| B18-414 | TEXT | 棚卸 | normalized-line:6918 |
| B18-415 | TEXT | 仕入先 | normalized-line:6919 |
| B18-416 | TEXT | 発注 | normalized-line:6920 |
| B18-417 | TEXT | 購買契約 | normalized-line:6921 |
| B18-418 | TEXT | 物流タスク | normalized-line:6922 |
| B18-419 | TEXT | 配送 | normalized-line:6923 |
| B18-420 | TEXT | 返品 | normalized-line:6924 |
| B18-421 | TEXT | 予約 | normalized-line:6925 |
| B18-422 | TEXT | リース | normalized-line:6926 |
| B18-423 | TEXT | メンテナンス | normalized-line:6927 |
| B18-424 | TEXT | 原価 | normalized-line:6928 |
| B18-425 | TEXT | 粗利 | normalized-line:6929 |
| B18-426 | TEXT | 需要予測 | normalized-line:6930 |
| B18-427 | TEXT | 発注候補 | normalized-line:6931 |
| B18-428 | TEXT | 在庫不足検知 | normalized-line:6932 |
| B18-429 | LABEL | PLUG接続: | normalized-line:6933 |
| B18-430 | TEXT | 社内在庫で足りない → PLUG型購買エンジンが最安/最適購入先を提案 → 購買申請 → 承認 → 発注 → 請求候補 → 会計候補 | normalized-line:6934 |
| B18-431 | LABEL | 目安: | normalized-line:6935 |
| B18-432 | TEXT | Day 180-360: 業種特化版 | normalized-line:6936 |
| B18-433 | TEXT | Day 360以降: SCM / 調達基盤 | normalized-line:6937 |
| B18-434 | TEXT | Phase 11: HCM / 採用 / 教育 / 人事 | normalized-line:6938 |
| B18-435 | LABEL | 機能候補: | normalized-line:6939 |
| B18-436 | TEXT | 求人 | normalized-line:6940 |
| B18-437 | TEXT | 応募者 | normalized-line:6941 |
| B18-438 | TEXT | 面接 | normalized-line:6942 |
| B18-439 | TEXT | 評価 | normalized-line:6943 |
| B18-440 | TEXT | 内定 | normalized-line:6944 |
| B18-441 | TEXT | 入社手続き | normalized-line:6945 |
| B18-442 | TEXT | 研修 | normalized-line:6946 |
| B18-443 | TEXT | マニュアル | normalized-line:6947 |
| B18-444 | TEXT | スキル | normalized-line:6948 |
| B18-445 | TEXT | シフト | normalized-line:6949 |
| B18-446 | TEXT | 勤怠 | normalized-line:6950 |
| B18-447 | TEXT | 休暇 | normalized-line:6951 |
| B18-448 | TEXT | 給与候補 | normalized-line:6952 |
| B18-449 | TEXT | 人件費 | normalized-line:6953 |
| B18-450 | TEXT | 1on1 | normalized-line:6954 |
| B18-451 | TEXT | 離職リスク | normalized-line:6955 |
| B18-452 | TEXT | AI教育担当 | normalized-line:6956 |
| B18-453 | LABEL | 注意: | normalized-line:6957 |
| B18-454 | TEXT | 初期は採用管理・教育・マニュアル・スキル管理に絞る | normalized-line:6958 |
| B18-455 | TEXT | 給与・評価・解雇・労務判断は後半 | normalized-line:6959 |
| B18-456 | TEXT | AI単独で採用合否、給与、評価を確定しない | normalized-line:6960 |
| B18-457 | LABEL | 目安: | normalized-line:6961 |
| B18-458 | TEXT | Day 210-360: 採用 / 教育MVP | normalized-line:6962 |
| B18-459 | TEXT | Day 360-540: HCM基盤 | normalized-line:6963 |
| B18-460 | TEXT | Phase 12: Data Cloud / BI / Analytics | normalized-line:6964 |
| B18-461 | LABEL | 機能候補: | normalized-line:6965 |
| B18-462 | TEXT | 統合データモデル | normalized-line:6966 |
| B18-463 | TEXT | 顧客360 | normalized-line:6967 |
| B18-464 | TEXT | 会社360 | normalized-line:6968 |
| B18-465 | TEXT | 従業員360 | normalized-line:6969 |
| B18-466 | TEXT | 商品360 | normalized-line:6970 |
| B18-467 | TEXT | 案件360 | normalized-line:6971 |
| B18-468 | TEXT | 購買360 | normalized-line:6972 |
| B18-469 | TEXT | 売上360 | normalized-line:6973 |
| B18-470 | TEXT | AI利用ログ | normalized-line:6974 |
| B18-471 | TEXT | Data Quality | normalized-line:6975 |
| B18-472 | TEXT | Data Freshness | normalized-line:6976 |
| B18-473 | TEXT | 指標定義 | normalized-line:6977 |
| B18-474 | TEXT | KPI辞書 | normalized-line:6978 |
| B18-475 | TEXT | BIダッシュボード | normalized-line:6979 |
| B18-476 | TEXT | 経営会議レポート | normalized-line:6980 |
| B18-477 | TEXT | 部門別ダッシュボード | normalized-line:6981 |
| B18-478 | TEXT | AI分析 | normalized-line:6982 |
| B18-479 | TEXT | 予測 | normalized-line:6983 |
| B18-480 | LABEL | 完了条件: | normalized-line:6984 |
| B18-481 | TEXT | どのデータが正本か分かる | normalized-line:6985 |
| B18-482 | TEXT | KPI定義が統一されている | normalized-line:6986 |
| B18-483 | TEXT | AIの根拠表示ができる | normalized-line:6987 |
| B18-484 | LABEL | 目安: | normalized-line:6988 |
| B18-485 | TEXT | Day 120-300: 初期BI | normalized-line:6989 |
| B18-486 | TEXT | Day 300-540: Data Cloud化 | normalized-line:6990 |
| B18-487 | TEXT | Phase 13: Service Cloud / Contact Center / Customer Success | normalized-line:6991 |
| B18-488 | LABEL | 機能候補: | normalized-line:6992 |
| B18-489 | TEXT | 問い合わせ管理 | normalized-line:6993 |
| B18-490 | TEXT | チケット | normalized-line:6994 |
| B18-491 | TEXT | SLA | normalized-line:6995 |
| B18-492 | TEXT | FAQ | normalized-line:6996 |
| B18-493 | TEXT | ナレッジ | normalized-line:6997 |
| B18-494 | TEXT | CSタスク | normalized-line:6998 |
| B18-495 | TEXT | 顧客満足度 | normalized-line:6999 |
| B18-496 | TEXT | NPS | normalized-line:7000 |
| B18-497 | TEXT | CSAT | normalized-line:7001 |
| B18-498 | TEXT | 解約予兆 | normalized-line:7002 |
| B18-499 | TEXT | 契約更新 | normalized-line:7003 |
| B18-500 | TEXT | サポートAI | normalized-line:7004 |
| B18-501 | TEXT | 音声 / チャット / メール統合 | normalized-line:7005 |
| B18-502 | TEXT | 対応品質管理 | normalized-line:7006 |
| B18-503 | TEXT | カスタマーオンボーディング | normalized-line:7007 |
| B18-504 | TEXT | Time to Value | normalized-line:7008 |
| B18-505 | LABEL | 目安: | normalized-line:7009 |
| B18-506 | TEXT | Day 150-300: Service MVP | normalized-line:7010 |
| B18-507 | TEXT | Day 300-540: CS / Contact Center基盤 | normalized-line:7011 |
| B18-508 | TEXT | Phase 14: Marketing Cloud / 広告代理店 / 共有ダッシュボード | normalized-line:7012 |
| B18-509 | LABEL | 機能候補: | normalized-line:7013 |
| B18-510 | TEXT | 広告アカウント連携 | normalized-line:7014 |
| B18-511 | TEXT | 広告費 | normalized-line:7015 |
| B18-512 | TEXT | CV | normalized-line:7016 |
| B18-513 | TEXT | CPA | normalized-line:7017 |
| B18-514 | TEXT | ROAS | normalized-line:7018 |
| B18-515 | TEXT | 粗利ROAS | normalized-line:7019 |
| B18-516 | TEXT | LP別成果 | normalized-line:7020 |
| B18-517 | TEXT | キャンペーン別成果 | normalized-line:7021 |
| B18-518 | TEXT | 代理店共有ダッシュボード | normalized-line:7022 |
| B18-519 | TEXT | AI改善案 | normalized-line:7023 |
| B18-520 | TEXT | PR / SEO Growth | normalized-line:7024 |
| B18-521 | TEXT | SNS下書き | normalized-line:7025 |
| B18-522 | TEXT | メルマガ下書き | normalized-line:7026 |
| B18-523 | TEXT | 顧客セグメント | normalized-line:7027 |
| B18-524 | TEXT | MA | normalized-line:7028 |
| B18-525 | TEXT | 導入事例 | normalized-line:7029 |
| B18-526 | LABEL | 注意: | normalized-line:7030 |
| B18-527 | TEXT | AIが広告予算を単独変更しない | normalized-line:7031 |
| B18-528 | TEXT | PR配信やSEO公開は人間承認 | normalized-line:7032 |
| B18-529 | LABEL | 目安: | normalized-line:7033 |
| B18-530 | TEXT | Day 90-240: 広告 / マーケMVP | normalized-line:7034 |
| B18-531 | TEXT | Day 240-450: Marketing Cloud的拡張 | normalized-line:7035 |
| B18-532 | TEXT | Phase 15: Industry Cloud / 業界別OS | normalized-line:7036 |
| B18-533 | LABEL | 候補業界: | normalized-line:7037 |
| B18-534 | TEXT | 建設 | normalized-line:7038 |
| B18-535 | TEXT | 医療 | normalized-line:7039 |
| B18-536 | TEXT | 美容 | normalized-line:7040 |
| B18-537 | TEXT | 飲食 | normalized-line:7041 |
| B18-538 | TEXT | 士業 | normalized-line:7042 |
| B18-539 | TEXT | EC | normalized-line:7043 |
| B18-540 | TEXT | 製造 | normalized-line:7044 |
| B18-541 | TEXT | 物流 | normalized-line:7045 |
| B18-542 | TEXT | 教育 | normalized-line:7046 |
| B18-543 | TEXT | 不動産 | normalized-line:7047 |
| B18-544 | TEXT | 介護 | normalized-line:7048 |
| B18-545 | TEXT | フランチャイズ | normalized-line:7049 |
| B18-546 | LABEL | 機能候補: | normalized-line:7050 |
| B18-547 | TEXT | 業界テンプレート | normalized-line:7051 |
| B18-548 | TEXT | 業界AI社員 | normalized-line:7052 |
| B18-549 | TEXT | 業界KPI | normalized-line:7053 |
| B18-550 | TEXT | 業界フォーム | normalized-line:7054 |
| B18-551 | TEXT | 業界ワークフロー | normalized-line:7055 |
| B18-552 | TEXT | 業界リスク | normalized-line:7056 |
| B18-553 | TEXT | 業界PR / SEOテンプレート | normalized-line:7057 |
| B18-554 | TEXT | 業界Business Networkカテゴリ | normalized-line:7058 |
| B18-555 | LABEL | 目安: | normalized-line:7059 |
| B18-556 | TEXT | Day 180-360: 3業界 | normalized-line:7060 |
| B18-557 | TEXT | Day 360-540: 10業界 | normalized-line:7061 |
| B18-558 | TEXT | Day 540以降: Marketplaceで拡張 | normalized-line:7062 |
| B18-559 | TEXT | Phase 16: 従業員配布基盤 | normalized-line:7063 |
| B18-560 | LABEL | 機能候補: | normalized-line:7064 |
| B18-561 | TEXT | 369 Employee App | normalized-line:7065 |
| B18-562 | TEXT | 今日のタスク | normalized-line:7066 |
| B18-563 | TEXT | 申請 | normalized-line:7067 |
| B18-564 | TEXT | 承認 | normalized-line:7068 |
| B18-565 | TEXT | 勤怠候補 | normalized-line:7069 |
| B18-566 | TEXT | FAQ | normalized-line:7070 |
| B18-567 | TEXT | AI相談 | normalized-line:7071 |
| B18-568 | TEXT | 社内ナレッジ | normalized-line:7072 |
| B18-569 | TEXT | 福利厚生 | normalized-line:7073 |
| B18-570 | TEXT | キャッシュバック | normalized-line:7074 |
| B18-571 | TEXT | 価格比較 | normalized-line:7075 |
| B18-572 | TEXT | クーポン | normalized-line:7076 |
| B18-573 | TEXT | 通知 | normalized-line:7077 |
| B18-574 | TEXT | 家族利用候補 | normalized-line:7078 |
| B18-575 | TEXT | 個人モード / 会社モード | normalized-line:7079 |
| B18-576 | LABEL | 重要: | normalized-line:7080 |
| B18-577 | TEXT | 会社購買と個人購買を分離する | normalized-line:7081 |
| B18-578 | TEXT | 従業員個人の私的購買履歴を会社が見られない | normalized-line:7082 |
| B18-579 | TEXT | 会社への表示は匿名集計レベルに留める | normalized-line:7083 |
| B18-580 | LABEL | 目安: | normalized-line:7084 |
| B18-581 | TEXT | Day 180-300: 従業員向けMVP | normalized-line:7085 |
| B18-582 | TEXT | Day 300-450: ブラウザ拡張 / 購買配布 | normalized-line:7086 |
| B18-583 | TEXT | Day 450以降: 企業全体に展開 | normalized-line:7087 |
| B18-584 | TEXT | Phase 17: External API / Integration Hub | normalized-line:7088 |
| B18-585 | LABEL | 機能候補: | normalized-line:7089 |
| B18-586 | TEXT | Public API | normalized-line:7090 |
| B18-587 | TEXT | Partner API | normalized-line:7091 |
| B18-588 | TEXT | Webhook | normalized-line:7092 |
| B18-589 | TEXT | Connector | normalized-line:7093 |
| B18-590 | TEXT | OAuth | normalized-line:7094 |
| B18-591 | TEXT | API key | normalized-line:7095 |
| B18-592 | TEXT | Event Bus | normalized-line:7096 |
| B18-593 | TEXT | Rate Limit | normalized-line:7097 |
| B18-594 | TEXT | API versioning | normalized-line:7098 |
| B18-595 | TEXT | Webhook retry | normalized-line:7099 |
| B18-596 | TEXT | Integration logs | normalized-line:7100 |
| B18-597 | TEXT | External App registry | normalized-line:7101 |
| B18-598 | TEXT | MCP候補 | normalized-line:7102 |
| B18-599 | TEXT | SDK | normalized-line:7103 |
| B18-600 | LABEL | 目安: | normalized-line:7104 |
| B18-601 | TEXT | Day 240-450: Partner API | normalized-line:7105 |
| B18-602 | TEXT | Day 450-720: Public API / Integration Hub | normalized-line:7106 |
| B18-603 | TEXT | Phase 18: Billing / Metering / Revenue Share | normalized-line:7107 |
| B18-604 | LABEL | 機能候補: | normalized-line:7108 |
| B18-605 | TEXT | Billing Meter | normalized-line:7109 |
| B18-606 | TEXT | Usage Meter | normalized-line:7110 |
| B18-607 | TEXT | API利用量 | normalized-line:7111 |
| B18-608 | TEXT | AI社員稼働量 | normalized-line:7112 |
| B18-609 | TEXT | Company Brain参照量 | normalized-line:7113 |
| B18-610 | TEXT | Tool API呼び出し量 | normalized-line:7114 |
| B18-611 | TEXT | Marketplace手数料 | normalized-line:7115 |
| B18-612 | TEXT | Revenue Share | normalized-line:7116 |
| B18-613 | TEXT | 開発者分配 | normalized-line:7117 |
| B18-614 | TEXT | Creator分配 | normalized-line:7118 |
| B18-615 | TEXT | Affiliate分配候補 | normalized-line:7119 |
| B18-616 | TEXT | 請求明細 | normalized-line:7120 |
| B18-617 | TEXT | コスト上限 | normalized-line:7121 |
| B18-618 | TEXT | AI Gross Margin | normalized-line:7122 |
| B18-619 | TEXT | 顧客別収益性 | normalized-line:7123 |
| B18-620 | LABEL | 目安: | normalized-line:7124 |
| B18-621 | TEXT | Day 180-300: 内部課金 / 利用量 | normalized-line:7125 |
| B18-622 | TEXT | Day 300-450: Marketplace課金 | normalized-line:7126 |
| B18-623 | TEXT | Day 450以降: 本格Revenue Share | normalized-line:7127 |
| B18-624 | TEXT | Phase 19: Enterprise Governance | normalized-line:7128 |
| B18-625 | LABEL | 機能候補: | normalized-line:7129 |
| B18-626 | TEXT | SSO | normalized-line:7130 |
| B18-627 | TEXT | SCIM | normalized-line:7131 |
| B18-628 | TEXT | Enterprise RBAC | normalized-line:7132 |
| B18-629 | TEXT | ABAC | normalized-line:7133 |
| B18-630 | TEXT | 権限棚卸 | normalized-line:7134 |
| B18-631 | TEXT | 監査ログ保全 | normalized-line:7135 |
| B18-632 | TEXT | SIEM連携 | normalized-line:7136 |
| B18-633 | TEXT | DLP | normalized-line:7137 |
| B18-634 | TEXT | データ保持 | normalized-line:7138 |
| B18-635 | TEXT | データ削除 | normalized-line:7139 |
| B18-636 | TEXT | 電子署名 | normalized-line:7140 |
| B18-637 | TEXT | 契約管理 | normalized-line:7141 |
| B18-638 | TEXT | SOX / 内部統制 | normalized-line:7142 |
| B18-639 | TEXT | 職務分掌 | normalized-line:7143 |
| B18-640 | TEXT | リスク管理 | normalized-line:7144 |
| B18-641 | TEXT | 事業継続 | normalized-line:7145 |
| B18-642 | TEXT | 法務レビュー | normalized-line:7146 |
| B18-643 | TEXT | AIガバナンス | normalized-line:7147 |
| B18-644 | TEXT | モデル利用ログ | normalized-line:7148 |
| B18-645 | LABEL | 目安: | normalized-line:7149 |
| B18-646 | TEXT | Day 360-720: Enterprise対応 | normalized-line:7150 |
| B18-647 | TEXT | Phase 20: 369経済圏 / AI社員OS | normalized-line:7151 |
| B18-648 | LABEL | 機能候補: | normalized-line:7152 |
| B18-649 | TEXT | AI社員開発環境 | normalized-line:7153 |
| B18-650 | TEXT | AI社員ストア | normalized-line:7154 |
| B18-651 | TEXT | 業界別AI社員 | normalized-line:7155 |
| B18-652 | TEXT | 企業別AI社員 | normalized-line:7156 |
| B18-653 | TEXT | 開発者収益 | normalized-line:7157 |
| B18-654 | TEXT | 従量課金 | normalized-line:7158 |
| B18-655 | TEXT | PLUG購買ネットワーク | normalized-line:7159 |
| B18-656 | TEXT | 企業データOS | normalized-line:7160 |
| B18-657 | TEXT | 社員向けブラウザ拡張 | normalized-line:7161 |
| B18-658 | TEXT | 法人購買ネットワーク | normalized-line:7162 |
| B18-659 | TEXT | CRM / ERP / BI / AI統合 | normalized-line:7163 |
| B18-660 | TEXT | パートナー制度 | normalized-line:7164 |
| B18-661 | TEXT | 認定開発者制度 | normalized-line:7165 |
| B18-662 | TEXT | 認定導入支援会社制度 | normalized-line:7166 |
| B18-663 | TEXT | AI社員評価制度 | normalized-line:7167 |
| B18-664 | TEXT | 安全認証制度 | normalized-line:7168 |

### B19 時系列ロードマップ

- classification: `ROADMAP_STRATEGY`
- heading source: normalized-line:7169

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B19-001 | TEXT | Day 6-30: 営業デモの完成 | normalized-line:7170 |
| B19-002 | TEXT | Company Brainを見せやすくする | normalized-line:7171 |
| B19-003 | TEXT | CRM基本画面を整える | normalized-line:7172 |
| B19-004 | TEXT | AI参照元表示 | normalized-line:7173 |
| B19-005 | TEXT | 社長ダッシュボード | normalized-line:7174 |
| B19-006 | TEXT | 顧客 / 案件 / 商品 / 営業プレイブック連携 | normalized-line:7175 |
| B19-007 | TEXT | デモデータ | normalized-line:7176 |
| B19-008 | TEXT | 安全設計ページ | normalized-line:7177 |
| B19-009 | TEXT | 30分デモ導線 | normalized-line:7178 |
| B19-010 | TEXT | Day 31-60: CRM + AI Growth Engine MVP | normalized-line:7179 |
| B19-011 | TEXT | 顧客管理 | normalized-line:7180 |
| B19-012 | TEXT | 案件管理 | normalized-line:7181 |
| B19-013 | TEXT | 売上 / 粗利 | normalized-line:7182 |
| B19-014 | TEXT | 広告費 | normalized-line:7183 |
| B19-015 | TEXT | CV | normalized-line:7184 |
| B19-016 | TEXT | Growth Event Ledger | normalized-line:7185 |
| B19-017 | TEXT | AI Growth Report | normalized-line:7186 |
| B19-018 | TEXT | 基本ダッシュボード | normalized-line:7187 |
| B19-019 | TEXT | AI提案 | normalized-line:7188 |
| B19-020 | TEXT | データ不足表示 | normalized-line:7189 |
| B19-021 | TEXT | Day 61-90: Approval / Human Certification | normalized-line:7190 |
| B19-022 | TEXT | Approval Inbox | normalized-line:7191 |
| B19-023 | TEXT | Human Certification Gate | normalized-line:7192 |
| B19-024 | TEXT | AI提案の承認 | normalized-line:7193 |
| B19-025 | TEXT | 外部送信ブロック | normalized-line:7194 |
| B19-026 | TEXT | 請求 / 会計候補はまだ確定させない | normalized-line:7195 |
| B19-027 | TEXT | 監査ログ | normalized-line:7196 |
| B19-028 | TEXT | リスク表示 | normalized-line:7197 |
| B19-029 | TEXT | Consent Gate | normalized-line:7198 |
| B19-030 | TEXT | Day 91-150: PLUG型ミニ版 + Oracle Mini入口 | normalized-line:7199 |
| B19-031 | TEXT | 商品URL認識 | normalized-line:7200 |
| B19-032 | TEXT | 商品比較DB | normalized-line:7201 |
| B19-033 | TEXT | EC価格比較PoC | normalized-line:7202 |
| B19-034 | TEXT | 購買申請 | normalized-line:7203 |
| B19-035 | TEXT | 会社購買ポリシー | normalized-line:7204 |
| B19-036 | TEXT | 仕入先管理 | normalized-line:7205 |
| B19-037 | TEXT | 発注候補 | normalized-line:7206 |
| B19-038 | TEXT | 請求候補 | normalized-line:7207 |
| B19-039 | TEXT | 会計候補 | normalized-line:7208 |
| B19-040 | TEXT | 経費候補 | normalized-line:7209 |
| B19-041 | TEXT | Day 151-210: Developer Cloud Alpha | normalized-line:7210 |
| B19-042 | TEXT | AI社員テンプレート | normalized-line:7211 |
| B19-043 | TEXT | Plugin Template | normalized-line:7212 |
| B19-044 | TEXT | Agent Manifest | normalized-line:7213 |
| B19-045 | TEXT | Sandbox | normalized-line:7214 |
| B19-046 | TEXT | SDK / CLI初期版 | normalized-line:7215 |
| B19-047 | TEXT | 開発者ポータル | normalized-line:7216 |
| B19-048 | TEXT | 審査チェック | normalized-line:7217 |
| B19-049 | TEXT | AI社員の権限定義 | normalized-line:7218 |
| B19-050 | TEXT | 369 Runtime | normalized-line:7219 |
| B19-051 | TEXT | 監査ログ接続 | normalized-line:7220 |
| B19-052 | TEXT | Marketplace準備 | normalized-line:7221 |
| B19-053 | TEXT | Day 211-300: Marketplace β + PLUG法人購買β | normalized-line:7222 |
| B19-054 | TEXT | AI社員ストアβ | normalized-line:7223 |
| B19-055 | TEXT | 業界テンプレート | normalized-line:7224 |
| B19-056 | TEXT | 開発者登録 | normalized-line:7225 |
| B19-057 | TEXT | AI社員販売 | normalized-line:7226 |
| B19-058 | TEXT | 利用量計測 | normalized-line:7227 |
| B19-059 | TEXT | 収益分配 | normalized-line:7228 |
| B19-060 | TEXT | 法人購買ブラウザ拡張β | normalized-line:7229 |
| B19-061 | TEXT | 購買承認 | normalized-line:7230 |
| B19-062 | TEXT | アフィリエイト透明化 | normalized-line:7231 |
| B19-063 | TEXT | 従業員配布 | normalized-line:7232 |
| B19-064 | TEXT | Day 301-450: Salesforce / Oracle 拡張 | normalized-line:7233 |
| B19-065 | TEXT | Service Cloud的機能 | normalized-line:7234 |
| B19-066 | TEXT | Marketing Cloud的機能 | normalized-line:7235 |
| B19-067 | TEXT | Commerce Cloud的機能 | normalized-line:7236 |
| B19-068 | TEXT | ERP財務 | normalized-line:7237 |
| B19-069 | TEXT | 調達 | normalized-line:7238 |
| B19-070 | TEXT | 在庫 | normalized-line:7239 |
| B19-071 | TEXT | HCM | normalized-line:7240 |
| B19-072 | TEXT | EPM | normalized-line:7241 |
| B19-073 | TEXT | GRC | normalized-line:7242 |
| B19-074 | TEXT | BI | normalized-line:7243 |
| B19-075 | TEXT | API | normalized-line:7244 |
| B19-076 | TEXT | 外部連携 | normalized-line:7245 |
| B19-077 | TEXT | Day 451-720: Enterprise / Platform化 | normalized-line:7246 |
| B19-078 | TEXT | SSO | normalized-line:7247 |
| B19-079 | TEXT | SCIM | normalized-line:7248 |
| B19-080 | TEXT | Enterprise RBAC | normalized-line:7249 |
| B19-081 | TEXT | Public API | normalized-line:7250 |
| B19-082 | TEXT | Integration Hub | normalized-line:7251 |
| B19-083 | TEXT | Developer Marketplace本格化 | normalized-line:7252 |
| B19-084 | TEXT | Revenue Share | normalized-line:7253 |
| B19-085 | TEXT | AI社員認証 | normalized-line:7254 |
| B19-086 | TEXT | Industry Cloud | normalized-line:7255 |
| B19-087 | TEXT | 法人購買ネットワーク | normalized-line:7256 |
| B19-088 | TEXT | 大企業監査対応 | normalized-line:7257 |
| B19-089 | LABEL | 優先順位: | normalized-line:7258 |
| B19-090 | TEXT | Core OS / Company Brain | normalized-line:7259 |
| B19-091 | TEXT | CRM / 営業デモ | normalized-line:7260 |
| B19-092 | TEXT | AI Growth Engine | normalized-line:7261 |
| B19-093 | TEXT | Human Certification Gate | normalized-line:7262 |
| B19-094 | TEXT | PLUG型ミニ購買エンジン | normalized-line:7263 |
| B19-095 | TEXT | Oracle Mini / 財務・調達・請求候補 | normalized-line:7264 |
| B19-096 | TEXT | Developer Cloud Alpha | normalized-line:7265 |
| B19-097 | TEXT | AI社員Marketplace | normalized-line:7266 |
| B19-098 | TEXT | 従業員配布 | normalized-line:7267 |
| B19-099 | TEXT | Salesforce / Oracle拡張 | normalized-line:7268 |
| B19-100 | TEXT | Enterprise Governance | normalized-line:7269 |
| B19-101 | TEXT | 369経済圏 | normalized-line:7270 |

### B20 Developer Cloud 詳細

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:7271

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B20-001 | TEXT | 3タイプ | normalized-line:7272 |
| B20-002 | TEXT | テンプレート型 | normalized-line:7273 |
| B20-003 | TEXT | 非エンジニア | normalized-line:7274 |
| B20-004 | TEXT | 業務担当者 | normalized-line:7275 |
| B20-005 | TEXT | 経営者 | normalized-line:7276 |
| B20-006 | TEXT | 質問に答えるだけでAI社員を調整 | normalized-line:7277 |
| B20-007 | TEXT | ブロックビルダー型 | normalized-line:7278 |
| B20-008 | TEXT | ノーコード制作者 | normalized-line:7279 |
| B20-009 | TEXT | 業務コンサル | normalized-line:7280 |
| B20-010 | TEXT | 情シス | normalized-line:7281 |
| B20-011 | TEXT | 12種ブロックを組み合わせる | normalized-line:7282 |
| B20-012 | TEXT | コード / SDK型 | normalized-line:7283 |
| B20-013 | TEXT | AI会社 | normalized-line:7284 |
| B20-014 | TEXT | 上級開発者 | normalized-line:7285 |
| B20-015 | TEXT | SIer | normalized-line:7286 |
| B20-016 | TEXT | 研究機関 | normalized-line:7287 |
| B20-017 | TEXT | Agent SDK / APIで自由設計 | normalized-line:7288 |
| B20-018 | TEXT | 9種のAI社員テンプレート | normalized-line:7289 |
| B20-019 | TEXT | AI営業 | normalized-line:7290 |
| B20-020 | TEXT | AIマーケター | normalized-line:7291 |
| B20-021 | TEXT | AI秘書 | normalized-line:7292 |
| B20-022 | TEXT | AI社長補佐 | normalized-line:7293 |
| B20-023 | TEXT | AI経理 | normalized-line:7294 |
| B20-024 | TEXT | AI法務 | normalized-line:7295 |
| B20-025 | TEXT | AI採用 | normalized-line:7296 |
| B20-026 | TEXT | AI教育 | normalized-line:7297 |
| B20-027 | TEXT | AI品質管理 | normalized-line:7298 |
| B20-028 | TEXT | 各テンプレートの12要素 | normalized-line:7299 |
| B20-029 | TEXT | 役割 | normalized-line:7300 |
| B20-030 | TEXT | 職務範囲 | normalized-line:7301 |
| B20-031 | TEXT | 権限 | normalized-line:7302 |
| B20-032 | TEXT | 使用ツール | normalized-line:7303 |
| B20-033 | TEXT | Company Brainスコープ | normalized-line:7304 |
| B20-034 | TEXT | KPI | normalized-line:7305 |
| B20-035 | TEXT | 禁止事項 | normalized-line:7306 |
| B20-036 | TEXT | 承認条件 | normalized-line:7307 |
| B20-037 | TEXT | 報告頻度 | normalized-line:7308 |
| B20-038 | TEXT | 出力形式 | normalized-line:7309 |
| B20-039 | TEXT | 評価基準 | normalized-line:7310 |
| B20-040 | TEXT | 課金単位 | normalized-line:7311 |
| B20-041 | TEXT | 12ブロック候補 | normalized-line:7312 |
| B20-042 | TEXT | Trigger | normalized-line:7313 |
| B20-043 | TEXT | Input | normalized-line:7314 |
| B20-044 | TEXT | Company Brain | normalized-line:7315 |
| B20-045 | TEXT | Tool | normalized-line:7316 |
| B20-046 | TEXT | Permission | normalized-line:7317 |
| B20-047 | TEXT | Approval | normalized-line:7318 |
| B20-048 | TEXT | Transform | normalized-line:7319 |
| B20-049 | TEXT | Generate | normalized-line:7320 |
| B20-050 | TEXT | Deliver | normalized-line:7321 |
| B20-051 | TEXT | Monitor | normalized-line:7322 |
| B20-052 | TEXT | Evaluate | normalized-line:7323 |
| B20-053 | TEXT | Billing | normalized-line:7324 |
| B20-054 | TEXT | コード基盤13コンポーネント | normalized-line:7325 |
| B20-055 | TEXT | Agent SDK | normalized-line:7326 |
| B20-056 | TEXT | Tool API | normalized-line:7327 |
| B20-057 | TEXT | Company Brain API | normalized-line:7328 |
| B20-058 | TEXT | Permission API | normalized-line:7329 |
| B20-059 | TEXT | Billing API | normalized-line:7330 |
| B20-060 | TEXT | Evaluation API | normalized-line:7331 |
| B20-061 | TEXT | Sandbox | normalized-line:7332 |
| B20-062 | TEXT | Developer Portal | normalized-line:7333 |
| B20-063 | TEXT | Agent Manifest | normalized-line:7334 |
| B20-064 | TEXT | Tool Manifest | normalized-line:7335 |
| B20-065 | TEXT | テスト環境 | normalized-line:7336 |
| B20-066 | TEXT | 審査フロー | normalized-line:7337 |
| B20-067 | TEXT | Marketplace配布機能 | normalized-line:7338 |

### B21 AI社員パッケージ標準構造

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:7339

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B21-001 | TEXT | AI社員は「動く」だけでなく、「売れる・監査できる・課金できる」までを1パッケージで完結させてください。 | normalized-line:7340 |
| B21-002 | LABEL | 14要素: | normalized-line:7341 |
| B21-003 | TEXT | Agent Manifest | normalized-line:7342 |
| B21-004 | TEXT | Role Definition | normalized-line:7343 |
| B21-005 | TEXT | Tool Permissions | normalized-line:7344 |
| B21-006 | TEXT | Company Brain Scope | normalized-line:7345 |
| B21-007 | TEXT | Prompt Policy | normalized-line:7346 |
| B21-008 | TEXT | Workflow | normalized-line:7347 |
| B21-009 | TEXT | Approval Rules | normalized-line:7348 |
| B21-010 | TEXT | KPI | normalized-line:7349 |
| B21-011 | TEXT | Evaluation Rule | normalized-line:7350 |
| B21-012 | TEXT | Billing Rule | normalized-line:7351 |
| B21-013 | TEXT | Audit Rule | normalized-line:7352 |
| B21-014 | TEXT | Version | normalized-line:7353 |
| B21-015 | TEXT | Template Metadata | normalized-line:7354 |
| B21-016 | TEXT | Marketplace Metadata | normalized-line:7355 |
| B21-017 | LABEL | Agent Manifestには以下を含める候補: | normalized-line:7356 |
| B21-018 | TEXT | name | normalized-line:7357 |
| B21-019 | TEXT | version | normalized-line:7358 |
| B21-020 | TEXT | role | normalized-line:7359 |
| B21-021 | TEXT | runtime | normalized-line:7360 |
| B21-022 | TEXT | tools | normalized-line:7361 |
| B21-023 | TEXT | company_brain_scope | normalized-line:7362 |
| B21-024 | TEXT | permissions | normalized-line:7363 |
| B21-025 | TEXT | approval_required | normalized-line:7364 |
| B21-026 | TEXT | kpi | normalized-line:7365 |
| B21-027 | TEXT | billing | normalized-line:7366 |
| B21-028 | TEXT | audit | normalized-line:7367 |
| B21-029 | TEXT | forbidden_actions | normalized-line:7368 |
| B21-030 | TEXT | developer | normalized-line:7369 |
| B21-031 | TEXT | marketplace | normalized-line:7370 |
| B21-032 | LABEL | 権限は三値で扱う: | normalized-line:7371 |
| B21-033 | TEXT | ai_only | normalized-line:7372 |
| B21-034 | TEXT | human_approval | normalized-line:7373 |
| B21-035 | TEXT | forbidden | normalized-line:7374 |

### B22 Permission & Approval Protocol

- classification: `SAFETY_REQUIREMENT`
- heading source: normalized-line:7375

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B22-001 | TEXT | 操作カテゴリごとに「AI単独 / 人間承認 / 禁止」を定義してください。 | normalized-line:7376 |
| B22-002 | LABEL | 例: | normalized-line:7377 |
| B22-003 | TEXT | 顧客情報読取: AI単独候補 | normalized-line:7378 |
| B22-004 | TEXT | 営業文下書き: AI単独候補 | normalized-line:7379 |
| B22-005 | TEXT | 外部メール送信: 人間承認 | normalized-line:7380 |
| B22-006 | TEXT | 契約リスク整理: AI単独候補 | normalized-line:7381 |
| B22-007 | TEXT | 広告改善案: AI単独候補 | normalized-line:7382 |
| B22-008 | TEXT | 請求下書き: 人間承認 | normalized-line:7383 |
| B22-009 | TEXT | 採用候補整理: 人間承認 | normalized-line:7384 |
| B22-010 | TEXT | 契約締結: 禁止または人間承認必須 | normalized-line:7385 |
| B22-011 | TEXT | 送金: 禁止または人間承認必須 | normalized-line:7386 |
| B22-012 | TEXT | 会計確定: 人間承認必須 | normalized-line:7387 |
| B22-013 | TEXT | 採用合否確定: AI単独禁止 | normalized-line:7388 |
| B22-014 | LABEL | 原則: | normalized-line:7389 |
| B22-015 | TEXT | AI社員が動くほど、監査ログと承認履歴が積み上がる構造にする。 | normalized-line:7390 |

### B23 Evaluation Framework

- classification: `SAFETY_REQUIREMENT`
- heading source: normalized-line:7391

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B23-001 | LABEL | 13評価指標: | normalized-line:7392 |
| B23-002 | LABEL | 定量: | normalized-line:7393 |
| B23-003 | TEXT | タスク完了率 | normalized-line:7394 |
| B23-004 | TEXT | 応答時間 | normalized-line:7395 |
| B23-005 | TEXT | 承認通過率 | normalized-line:7396 |
| B23-006 | TEXT | エラー率 | normalized-line:7397 |
| B23-007 | TEXT | コスト効率 | normalized-line:7398 |
| B23-008 | LABEL | 定性: | normalized-line:7399 |
| B23-009 | TEXT | 回答品質スコア | normalized-line:7400 |
| B23-010 | TEXT | 口調・ブランド適合 | normalized-line:7401 |
| B23-011 | TEXT | 顧客満足度 | normalized-line:7402 |
| B23-012 | TEXT | 上長レビュー評価 | normalized-line:7403 |
| B23-013 | LABEL | 改善: | normalized-line:7404 |
| B23-014 | TEXT | エッジケース収集 | normalized-line:7405 |
| B23-015 | TEXT | A/Bテスト実行 | normalized-line:7406 |
| B23-016 | TEXT | プロンプト自動改善候補 | normalized-line:7407 |
| B23-017 | TEXT | バージョン差分評価 | normalized-line:7408 |
| B23-018 | LABEL | 注意: | normalized-line:7409 |
| B23-019 | TEXT | 自動改善は候補生成に留める | normalized-line:7410 |
| B23-020 | TEXT | 本番反映は人間承認 | normalized-line:7411 |
| B23-021 | TEXT | unsafe output、PII leakage、prompt injection、tool abuse のテストを含める | normalized-line:7412 |

### B24 課金 / Metering / Billing

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:7413

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B24-001 | LABEL | 開発時課金: | normalized-line:7414 |
| B24-002 | TEXT | テンプレ利用料 | normalized-line:7415 |
| B24-003 | TEXT | ブロック使用量 | normalized-line:7416 |
| B24-004 | TEXT | SDK API呼出 | normalized-line:7417 |
| B24-005 | TEXT | Company Brain参照 | normalized-line:7418 |
| B24-006 | TEXT | Sandboxコンピュート | normalized-line:7419 |
| B24-007 | TEXT | テスト実行回数 | normalized-line:7420 |
| B24-008 | TEXT | LLM推論トークン | normalized-line:7421 |
| B24-009 | TEXT | 審査申請費 | normalized-line:7422 |
| B24-010 | TEXT | Marketplace登録費 | normalized-line:7423 |
| B24-011 | TEXT | 認定バッジ取得費 | normalized-line:7424 |
| B24-012 | LABEL | 稼働時課金: | normalized-line:7425 |
| B24-013 | TEXT | タスク実行数 | normalized-line:7426 |
| B24-014 | TEXT | ツール呼出数 | normalized-line:7427 |
| B24-015 | TEXT | Company Brain参照 | normalized-line:7428 |
| B24-016 | TEXT | 承認処理数 | normalized-line:7429 |
| B24-017 | TEXT | LLM推論トークン | normalized-line:7430 |
| B24-018 | TEXT | ストレージ容量 | normalized-line:7431 |
| B24-019 | TEXT | 監査ログ保存 | normalized-line:7432 |
| B24-020 | TEXT | 出力生成回数 | normalized-line:7433 |
| B24-021 | LABEL | 369の収益源: | normalized-line:7434 |
| B24-022 | TEXT | プラットフォーム基本料 | normalized-line:7435 |
| B24-023 | TEXT | 従量API手数料 | normalized-line:7436 |
| B24-024 | TEXT | Runtime稼働費 | normalized-line:7437 |
| B24-025 | TEXT | Marketplace販売手数料 | normalized-line:7438 |
| B24-026 | TEXT | 開発環境サブスク | normalized-line:7439 |
| B24-027 | TEXT | 審査認定料 | normalized-line:7440 |
| B24-028 | TEXT | データ・分析サービス | normalized-line:7441 |
| B24-029 | TEXT | 優先サポート契約 | normalized-line:7442 |
| B24-030 | LABEL | 開発者収益源: | normalized-line:7443 |
| B24-031 | TEXT | Marketplace販売収益 | normalized-line:7444 |
| B24-032 | TEXT | 稼働ロイヤリティ | normalized-line:7445 |
| B24-033 | TEXT | ツール利用料 | normalized-line:7446 |
| B24-034 | TEXT | テンプレ販売収益 | normalized-line:7447 |
| B24-035 | TEXT | カスタマイズ受託 | normalized-line:7448 |
| B24-036 | TEXT | 保守・改善契約 | normalized-line:7449 |
| B24-037 | TEXT | 認定バッジプレミアム | normalized-line:7450 |

### B25 Marketplace

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:7451

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B25-001 | TEXT | Marketplaceは「WordPressのプラグイン市場 × AI社員」です。 | normalized-line:7452 |
| B25-002 | LABEL | 販売カテゴリ: | normalized-line:7453 |
| B25-003 | TEXT | AI社員パッケージ | normalized-line:7454 |
| B25-004 | TEXT | AI補助社員 | normalized-line:7455 |
| B25-005 | TEXT | 業務ツール | normalized-line:7456 |
| B25-006 | TEXT | テンプレート | normalized-line:7457 |
| B25-007 | TEXT | ブロック / ノード | normalized-line:7458 |
| B25-008 | TEXT | ワークフロー | normalized-line:7459 |
| B25-009 | TEXT | Company Brain拡張 | normalized-line:7460 |
| B25-010 | TEXT | 業界特化パッケージ | normalized-line:7461 |
| B25-011 | LABEL | 必要機能: | normalized-line:7462 |
| B25-012 | TEXT | 検索・カテゴリ | normalized-line:7463 |
| B25-013 | TEXT | プレビュー・デモ | normalized-line:7464 |
| B25-014 | TEXT | 認定バッジ表示 | normalized-line:7465 |
| B25-015 | TEXT | レビュー・評価 | normalized-line:7466 |
| B25-016 | TEXT | 価格・プラン | normalized-line:7467 |
| B25-017 | TEXT | ワンクリック導入 | normalized-line:7468 |
| B25-018 | TEXT | トライアル期間 | normalized-line:7469 |
| B25-019 | TEXT | バージョン管理 | normalized-line:7470 |
| B25-020 | TEXT | 互換性チェック | normalized-line:7471 |
| B25-021 | TEXT | 決済・課金統合 | normalized-line:7472 |
| B25-022 | TEXT | 権限表示 | normalized-line:7473 |
| B25-023 | TEXT | データ利用範囲表示 | normalized-line:7474 |
| B25-024 | TEXT | 外部送信有無表示 | normalized-line:7475 |
| B25-025 | TEXT | 返金ルール | normalized-line:7476 |
| B25-026 | TEXT | 企業管理者承認導入 | normalized-line:7477 |
| B25-027 | TEXT | Marketplaceは審査済みのみ。 | normalized-line:7478 |
| B25-028 | TEXT | 信頼が最大の資産です。 | normalized-line:7479 |

### B26 Safety Review / Certification

- classification: `SAFETY_REQUIREMENT`
- heading source: normalized-line:7480

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B26-001 | LABEL | 10審査項目: | normalized-line:7481 |
| B26-002 | TEXT | Manifest整合性検査 | normalized-line:7482 |
| B26-003 | TEXT | ツール権限の妥当性 | normalized-line:7483 |
| B26-004 | TEXT | Company Brainスコープ | normalized-line:7484 |
| B26-005 | TEXT | Prompt Policy審査 | normalized-line:7485 |
| B26-006 | TEXT | エッジケーステスト | normalized-line:7486 |
| B26-007 | TEXT | 監査ログ完全性 | normalized-line:7487 |
| B26-008 | TEXT | 個人情報リーク耐性 | normalized-line:7488 |
| B26-009 | TEXT | 悪意入力耐性 | normalized-line:7489 |
| B26-010 | TEXT | コスト暴走防止 | normalized-line:7490 |
| B26-011 | TEXT | 業界特有規制の遵守 | normalized-line:7491 |
| B26-012 | LABEL | 認定バッジ候補: | normalized-line:7492 |
| B26-013 | TEXT | Safety Verified | normalized-line:7493 |
| B26-014 | TEXT | Privacy Ready | normalized-line:7494 |
| B26-015 | TEXT | SOC2 Ready | normalized-line:7495 |
| B26-016 | TEXT | Finance Certified | normalized-line:7496 |
| B26-017 | TEXT | Legal Approved | normalized-line:7497 |
| B26-018 | TEXT | Enterprise Ready | normalized-line:7498 |
| B26-019 | TEXT | Top Performer | normalized-line:7499 |
| B26-020 | TEXT | 369 Official | normalized-line:7500 |

### B27 Developer Portal

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:7501

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B27-001 | LABEL | 17機能: | normalized-line:7502 |
| B27-002 | TEXT | アカウント / KYC | normalized-line:7503 |
| B27-003 | TEXT | APIキー管理 | normalized-line:7504 |
| B27-004 | TEXT | SDKダウンロード | normalized-line:7505 |
| B27-005 | TEXT | ドキュメント | normalized-line:7506 |
| B27-006 | TEXT | Sandbox環境 | normalized-line:7507 |
| B27-007 | TEXT | Playground | normalized-line:7508 |
| B27-008 | TEXT | テスト自動化 | normalized-line:7509 |
| B27-009 | TEXT | 審査申請 | normalized-line:7510 |
| B27-010 | TEXT | バージョン管理 | normalized-line:7511 |
| B27-011 | TEXT | Marketplace出品 | normalized-line:7512 |
| B27-012 | TEXT | 稼働モニタリング | normalized-line:7513 |
| B27-013 | TEXT | 収益ダッシュボード | normalized-line:7514 |
| B27-014 | TEXT | 請求・入金 | normalized-line:7515 |
| B27-015 | TEXT | サポートチケット | normalized-line:7516 |
| B27-016 | TEXT | コミュニティ | normalized-line:7517 |
| B27-017 | TEXT | パートナー認定 | normalized-line:7518 |
| B27-018 | TEXT | 導入企業マッチング | normalized-line:7519 |
| B27-019 | LABEL | 369がAI会社に選ばれる理由: | normalized-line:7520 |
| B27-020 | TEXT | エンタープライズ顧客に届く | normalized-line:7521 |
| B27-021 | TEXT | Company Brain APIで企業知識に安全アクセスできる | normalized-line:7522 |
| B27-022 | TEXT | Runtimeが監査ログ・承認履歴を蓄積する | normalized-line:7523 |
| B27-023 | TEXT | Billing Meter・決済・分配を代行する | normalized-line:7524 |
| B27-024 | TEXT | Evaluation Frameworkで評価・改善できる | normalized-line:7525 |
| B27-025 | TEXT | Safety Review + 認定バッジで信頼担保 | normalized-line:7526 |
| B27-026 | TEXT | 稼働ロイヤリティでストック収益化できる | normalized-line:7527 |

### B28 PLUG型システムの価値

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:7528

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B28-001 | LABEL | 価値: | normalized-line:7529 |
| B28-002 | TEXT | 従業員に広がる | normalized-line:7530 |
| B28-003 | TEXT | 購買データが取れる | normalized-line:7531 |
| B28-004 | TEXT | 収益が発生する | normalized-line:7532 |
| B28-005 | TEXT | ただし、Honey型の批判を踏まえ、369版は透明性と企業統制を武器にする。 | normalized-line:7533 |
| B28-006 | LABEL | やるべきこと: | normalized-line:7534 |
| B28-007 | TEXT | 会社にも社員にも分かる | normalized-line:7535 |
| B28-008 | TEXT | 安く、正しく、承認された購買 | normalized-line:7536 |
| B28-009 | TEXT | ユーザー利益がある時だけ提示 | normalized-line:7537 |
| B28-010 | TEXT | 会社購買と個人購買を分離 | normalized-line:7538 |
| B28-011 | TEXT | アフィリエイト手数料を開示 | normalized-line:7539 |
| B28-012 | TEXT | 購買ポリシーと連動 | normalized-line:7540 |
| B28-013 | TEXT | 予算・承認・会計候補へ接続 | normalized-line:7541 |
| B28-014 | LABEL | やってはいけないこと: | normalized-line:7542 |
| B28-015 | TEXT | こっそりリンクを差し替える | normalized-line:7543 |
| B28-016 | TEXT | 元リンクを奪う | normalized-line:7544 |
| B28-017 | TEXT | ユーザーメリットなしにcookieを入れる | normalized-line:7545 |
| B28-018 | TEXT | 私的購買履歴を会社へ見せる | normalized-line:7546 |
| B28-019 | TEXT | 拡張機能に過剰権限を持たせる | normalized-line:7547 |

### B29 369 Employee App

- classification: `PRODUCT_ARCHITECTURE`
- heading source: normalized-line:7548

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B29-001 | TEXT | 369を企業向け業務OSで終わらせず、導入企業の従業員にも自然に広げる。 | normalized-line:7549 |
| B29-002 | LABEL | 価値: | normalized-line:7550 |
| B29-003 | TEXT | 経営者: 売上、利益、業務、社員、経費、請求、広告、顧客を一元管理 | normalized-line:7551 |
| B29-004 | TEXT | 管理部門: 経理、人事、労務、購買、承認、契約、請求が楽になる | normalized-line:7552 |
| B29-005 | TEXT | 現場社員: タスク、申請、ナレッジ、AI補助、社内手続きが楽になる | normalized-line:7553 |
| B29-006 | TEXT | 従業員個人: 福利厚生、割引、キャッシュバック、AI生活サポート | normalized-line:7554 |
| B29-007 | LABEL | 機能候補: | normalized-line:7555 |
| B29-008 | TEXT | 今日のタスク | normalized-line:7556 |
| B29-009 | TEXT | 自分の仕事 | normalized-line:7557 |
| B29-010 | TEXT | 申請 | normalized-line:7558 |
| B29-011 | TEXT | 承認待ち | normalized-line:7559 |
| B29-012 | TEXT | 勤怠候補 | normalized-line:7560 |
| B29-013 | TEXT | 社内FAQ | normalized-line:7561 |
| B29-014 | TEXT | マニュアル | normalized-line:7562 |
| B29-015 | TEXT | 研修資料 | normalized-line:7563 |
| B29-016 | TEXT | AI相談 | normalized-line:7564 |
| B29-017 | TEXT | 福利厚生ストア | normalized-line:7565 |
| B29-018 | TEXT | 社員限定キャッシュバック | normalized-line:7566 |
| B29-019 | TEXT | 最安値検索 | normalized-line:7567 |
| B29-020 | TEXT | クーポン自動通知 | normalized-line:7568 |
| B29-021 | TEXT | 給与日前節約サポート | normalized-line:7569 |
| B29-022 | TEXT | AI生活コンシェルジュ | normalized-line:7570 |
| B29-023 | TEXT | 社員紹介特典 | normalized-line:7571 |
| B29-024 | TEXT | 通知 | normalized-line:7572 |
| B29-025 | LABEL | データ分離: | normalized-line:7573 |
| B29-026 | TEXT | 会社購買: 会社管理者が確認可能 | normalized-line:7574 |
| B29-027 | TEXT | 個人購買: 従業員本人だけが確認 | normalized-line:7575 |
| B29-028 | TEXT | 会社への集計表示: 個人を特定しない範囲 | normalized-line:7576 |
| B29-029 | TEXT | キャッシュバック: 会社購買分は会社、個人購買分は従業員 | normalized-line:7577 |
| B29-030 | TEXT | ブラウザ拡張: 仕事用モード / 個人用モード | normalized-line:7578 |
| B29-031 | LABEL | 禁止: | normalized-line:7579 |
| B29-032 | TEXT | 会社が従業員の私的買い物履歴を見られる状態 | normalized-line:7580 |
| B29-033 | TEXT | 従業員個人の閲覧URLや購買履歴が会社管理画面に出る状態 | normalized-line:7581 |
| B29-034 | TEXT | 会社用アカウントで私的購買を強制追跡する状態 | normalized-line:7582 |

### B30 知財 / moat 戦略

- classification: `STRATEGY_REQUIREMENT`
- heading source: normalized-line:7583

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B30-001 | TEXT | 知財は守りです。 | normalized-line:7584 |
| B30-002 | TEXT | 本当の強さは、知財 × データ × 実行基盤 × 開発者経済圏 × 価格戦略 × テンプレート資産 の組み合わせです。 | normalized-line:7585 |
| B30-003 | LABEL | 守るべき中核: | normalized-line:7586 |
| B30-004 | TEXT | テンプレート・ブロック・コードで369専用AI社員を作成し、そのAI社員が369 Runtime、Company Brain、Tool API、Permission Protocol、Evaluation Framework、Billing Meterに依存して稼働し、制作時と稼働時の両方で従量課金され、開発者と369に収益分配されるAI社員開発・流通・実行基盤。 | normalized-line:7587 |
| B30-005 | LABEL | 防御層: | normalized-line:7588 |
| B30-006 | TEXT | 特許 | normalized-line:7589 |
| B30-007 | TEXT | ビジネス関連発明 | normalized-line:7590 |
| B30-008 | TEXT | 商標 | normalized-line:7591 |
| B30-009 | TEXT | 営業秘密 | normalized-line:7592 |
| B30-010 | TEXT | Company Brain | normalized-line:7593 |
| B30-011 | TEXT | Runtime依存 | normalized-line:7594 |
| B30-012 | TEXT | Marketplace | normalized-line:7595 |
| B30-013 | TEXT | テンプレート資産 | normalized-line:7596 |
| B30-014 | TEXT | 認定制度 | normalized-line:7597 |
| B30-015 | TEXT | 価格戦略 | normalized-line:7598 |
| B30-016 | LABEL | 商標候補: | normalized-line:7599 |
| B30-017 | TEXT | 369 AI社員 | normalized-line:7600 |
| B30-018 | TEXT | 369 AI補助社員 | normalized-line:7601 |
| B30-019 | TEXT | 369 AI Employee Studio | normalized-line:7602 |
| B30-020 | TEXT | 369 Agent Runtime | normalized-line:7603 |
| B30-021 | TEXT | 369 Company Brain | normalized-line:7604 |
| B30-022 | TEXT | 369 AI社員マーケット | normalized-line:7605 |
| B30-023 | TEXT | IKEZAKI OS | normalized-line:7606 |
| B30-024 | TEXT | IKEZAKI Workforce OS | normalized-line:7607 |
| B30-025 | LABEL | 特許候補: | normalized-line:7608 |
| B30-026 | TEXT | Agent Manifest 標準仕様 | normalized-line:7609 |
| B30-027 | TEXT | Company Brain スコープ制御 | normalized-line:7610 |
| B30-028 | TEXT | 3値権限プロトコル | normalized-line:7611 |
| B30-029 | TEXT | 稼働単位ロイヤリティ分配 | normalized-line:7612 |
| B30-030 | TEXT | Tool Manifest 標準化 | normalized-line:7613 |
| B30-031 | TEXT | 評価 & 改善自動ループ | normalized-line:7614 |
| B30-032 | TEXT | Safety Review バッジ制度 | normalized-line:7615 |
| B30-033 | TEXT | 監査ログ改ざん耐性設計 | normalized-line:7616 |
| B30-034 | TEXT | テンプレ × ブロック × コードの統合UX | normalized-line:7617 |
| B30-035 | TEXT | 369専用AI社員 作成〜稼働 一貫プロセス | normalized-line:7618 |
| B30-036 | LABEL | 注意: | normalized-line:7619 |
| B30-037 | TEXT | これは法的判断ではない | normalized-line:7620 |
| B30-038 | TEXT | 正式出願は弁理士・弁護士確認が必要 | normalized-line:7621 |
| B30-039 | TEXT | 出願前に公開範囲を確認する | normalized-line:7622 |
| B30-040 | TEXT | 特許化する情報と営業秘密にする情報を分ける | normalized-line:7623 |

### B33 広告費ゼロ成長ループ

- classification: `GROWTH_REQUIREMENT`
- heading source: normalized-line:8141

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B33-001 | TEXT | IKEZAKI OSは広告費なしでも広がる構造を持つ必要があります。 | normalized-line:8142 |
| B33-002 | LABEL | 成長ループ: | normalized-line:8143 |
| B33-003 | TEXT | AI経営診断ループ | normalized-line:8144 |
| B33-004 | TEXT | 請求書・見積書・契約書共有ループ | normalized-line:8145 |
| B33-005 | TEXT | 税理士・社労士・弁護士共有ループ | normalized-line:8146 |
| B33-006 | TEXT | 社員招待ループ | normalized-line:8147 |
| B33-007 | TEXT | 顧客ポータルループ | normalized-line:8148 |
| B33-008 | TEXT | 業種テンプレートSEOループ | normalized-line:8149 |
| B33-009 | TEXT | ベンチマーク共有ループ | normalized-line:8150 |
| B33-010 | TEXT | AI成果レポートループ | normalized-line:8151 |
| B33-011 | TEXT | Trust / 監査レポートループ | normalized-line:8152 |
| B33-012 | TEXT | Marketplace / テンプレート投稿ループ | normalized-line:8153 |
| B33-013 | TEXT | PR / プレスリリースループ | normalized-line:8154 |
| B33-014 | TEXT | SEO / 導入企業ページループ | normalized-line:8155 |
| B33-015 | TEXT | Business Network / 取引先招待ループ | normalized-line:8156 |
| B33-016 | TEXT | Advocate / Affiliateループ | normalized-line:8157 |
| B33-017 | TEXT | Creator / Influencerループ | normalized-line:8158 |
| B33-018 | TEXT | White-label Widgetループ | normalized-line:8159 |
| B33-019 | TEXT | Certification / Academyループ | normalized-line:8160 |
| B33-020 | TEXT | Challenge / Eventループ | normalized-line:8161 |
| B33-021 | TEXT | Public Impact Dashboardループ | normalized-line:8162 |
| B33-022 | TEXT | Build in Publicループ | normalized-line:8163 |
| B33-023 | TEXT | GitHub公開可能docs / 開発透明性ループ | normalized-line:8164 |
| B33-024 | TEXT | Obsidian Knowledge Map / 戦略整理ループ | normalized-line:8165 |
| B33-025 | TEXT | Industry Deep Packループ | normalized-line:8166 |
| B33-026 | TEXT | Customer Success教育ループ | normalized-line:8167 |
| B33-027 | TEXT | Enterprise Procurement Trustループ | normalized-line:8168 |
| B33-028 | LABEL | 重要: | normalized-line:8169 |
| B33-029 | TEXT | 広告を打つのではなく、プロダクトを使う行為そのものが、発信・紹介・招待・事例・診断・取引先導入・ドキュメント資産・知識資産につながる構造にする。 | normalized-line:8170 |

### B34 導入必然性トリガー

- classification: `GROWTH_REQUIREMENT`
- heading source: normalized-line:8171

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B34-001 | TEXT | IKEZAKI OSには、導入企業が「入れた方がいい」ではなく「入れないと損している」と感じるトリガーを入れる。 | normalized-line:8172 |
| B34-002 | LABEL | トリガー候補: | normalized-line:8173 |
| B34-003 | TEXT | 未回収金 | normalized-line:8174 |
| B34-004 | TEXT | 請求漏れ | normalized-line:8175 |
| B34-005 | TEXT | 営業フォロー漏れ | normalized-line:8176 |
| B34-006 | TEXT | 粗利低下 | normalized-line:8177 |
| B34-007 | TEXT | 資金ショート予測 | normalized-line:8178 |
| B34-008 | TEXT | 労務リスク | normalized-line:8179 |
| B34-009 | TEXT | 契約期限 | normalized-line:8180 |
| B34-010 | TEXT | AI外部送信リスク | normalized-line:8181 |
| B34-011 | TEXT | 在庫・リース品リスク | normalized-line:8182 |
| B34-012 | TEXT | 経営判断遅れ | normalized-line:8183 |
| B34-013 | TEXT | SEO流入不足 | normalized-line:8184 |
| B34-014 | TEXT | PR未活用 | normalized-line:8185 |
| B34-015 | TEXT | Trust資料不足 | normalized-line:8186 |
| B34-016 | TEXT | 取引先連携不足 | normalized-line:8187 |
| B34-017 | TEXT | AI成果未可視化 | normalized-line:8188 |
| B34-018 | TEXT | 紹介機会損失 | normalized-line:8189 |
| B34-019 | TEXT | 採用広報不足 | normalized-line:8190 |
| B34-020 | TEXT | 導入事例未公開 | normalized-line:8191 |
| B34-021 | TEXT | 取引準備スコア低下 | normalized-line:8192 |
| B34-022 | TEXT | 競合導入済み | normalized-line:8193 |
| B34-023 | TEXT | GitHub docs未整理 | normalized-line:8194 |
| B34-024 | TEXT | Obsidian現在地不明 | normalized-line:8195 |
| B34-025 | TEXT | 次回Claude Codeプロンプト不明 | normalized-line:8196 |
| B34-026 | TEXT | 監査ログ散逸 | normalized-line:8197 |
| B34-027 | TEXT | 意思決定履歴不足 | normalized-line:8198 |
| B34-028 | TEXT | Release準備不足 | normalized-line:8199 |
| B34-029 | TEXT | SLO / SLA未定義 | normalized-line:8200 |
| B34-030 | TEXT | AI粗利悪化 | normalized-line:8201 |
| B34-031 | TEXT | 依存関係脆弱性 | normalized-line:8202 |
| B34-032 | TEXT | Enterprise調達資料不足 | normalized-line:8203 |
| B34-033 | TEXT | 恐怖訴求だけにしない。 | normalized-line:8204 |
| B34-034 | TEXT | 損失の可視化、改善方法、すぐ始める導線をセットにする。 | normalized-line:8205 |

### B35 紹介したくなる動機

- classification: `GROWTH_REQUIREMENT`
- heading source: normalized-line:8206

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B35-001 | LABEL | 導入企業: | normalized-line:8207 |
| B35-002 | TEXT | 取引先も使うと見積・発注・請求・入金が楽になる | normalized-line:8208 |
| B35-003 | TEXT | 取引先連携率が上がる | normalized-line:8209 |
| B35-004 | TEXT | 自社がAI活用企業として認知される | normalized-line:8210 |
| B35-005 | TEXT | 導入企業ディレクトリに載る | normalized-line:8211 |
| B35-006 | TEXT | PR / SEO / 導入事例で自社集客に使える | normalized-line:8212 |
| B35-007 | TEXT | Network Creditsがもらえる | normalized-line:8213 |
| B35-008 | TEXT | 取引準備スコアが上がる | normalized-line:8214 |
| B35-009 | TEXT | Business Networkで取引機会が増える | normalized-line:8215 |
| B35-010 | LABEL | 士業: | normalized-line:8216 |
| B35-011 | TEXT | 顧問先管理が楽になる | normalized-line:8217 |
| B35-012 | TEXT | 顧問先に無料診断を配れる | normalized-line:8218 |
| B35-013 | TEXT | AI対応士業として認知される | normalized-line:8219 |
| B35-014 | TEXT | 士業プロフィールページができる | normalized-line:8220 |
| B35-015 | TEXT | 顧問先ダッシュボードが使える | normalized-line:8221 |
| B35-016 | TEXT | 士業認定バッジが得られる | normalized-line:8222 |
| B35-017 | TEXT | 顧問先向け提案書が作れる | normalized-line:8223 |
| B35-018 | LABEL | インフルエンサー: | normalized-line:8224 |
| B35-019 | TEXT | フォロワーに無料診断を配れる | normalized-line:8225 |
| B35-020 | TEXT | 投稿ネタになる | normalized-line:8226 |
| B35-021 | TEXT | 専用LPが持てる | normalized-line:8227 |
| B35-022 | TEXT | Public Impact Dashboardで実績化できる | normalized-line:8228 |
| B35-023 | TEXT | 認定バッジが得られる | normalized-line:8229 |
| B35-024 | TEXT | Content Kitが得られる | normalized-line:8230 |
| B35-025 | TEXT | オプトイン同意済み見込み客が増える | normalized-line:8231 |
| B35-026 | TEXT | 将来Marketplaceで収益化できる | normalized-line:8232 |
| B35-027 | LABEL | コンサル: | normalized-line:8233 |
| B35-028 | TEXT | 顧客診断が楽になる | normalized-line:8234 |
| B35-029 | TEXT | 提案書が作りやすい | normalized-line:8235 |
| B35-030 | TEXT | 導入支援案件につながる | normalized-line:8236 |
| B35-031 | TEXT | 認定AI業務設計士として見られる | normalized-line:8237 |
| B35-032 | TEXT | テンプレートを公開できる | normalized-line:8238 |
| B35-033 | LABEL | 開発者・テンプレート作者: | normalized-line:8239 |
| B35-034 | TEXT | Marketplaceに掲載できる | normalized-line:8240 |
| B35-035 | TEXT | テンプレート利用数が実績になる | normalized-line:8241 |
| B35-036 | TEXT | 作者ページができる | normalized-line:8242 |
| B35-037 | TEXT | 将来収益化できる | normalized-line:8243 |
| B35-038 | TEXT | 開発者認定が得られる | normalized-line:8244 |
| B35-039 | LABEL | 社員: | normalized-line:8245 |
| B35-040 | TEXT | 自分の作業が楽になる | normalized-line:8246 |
| B35-041 | TEXT | 個人AI補助が使える | normalized-line:8247 |
| B35-042 | TEXT | 社内貢献として評価される | normalized-line:8248 |
| B35-043 | TEXT | 部署に広げると業務が楽になる | normalized-line:8249 |

### B36 入れてはいけない機能

- classification: `PROHIBITED_REQUIREMENT`
- heading source: normalized-line:8250

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B36-001 | LABEL | 絶対に機能化しないもの: | normalized-line:8251 |
| B36-002 | TEXT | AIによる虚偽口コミ投稿 | normalized-line:8252 |
| B36-003 | TEXT | AIによるなりすましレビュー投稿 | normalized-line:8253 |
| B36-004 | TEXT | AIによる口コミサイトへの量産投稿 | normalized-line:8254 |
| B36-005 | TEXT | AIによるGoogleプロフィールへの虚偽レビュー投稿 | normalized-line:8255 |
| B36-006 | TEXT | AIによるステルスマーケティング投稿 | normalized-line:8256 |
| B36-007 | TEXT | AIによる実体験でない体験談生成・投稿 | normalized-line:8257 |
| B36-008 | TEXT | AIによる採用合否の自動確定 | normalized-line:8258 |
| B36-009 | TEXT | AIによる法務判断の自動確定 | normalized-line:8259 |
| B36-010 | TEXT | AIによる給与・評価の自動確定 | normalized-line:8260 |
| B36-011 | TEXT | AIによる契約締結の自動実行 | normalized-line:8261 |
| B36-012 | TEXT | AIによる広告出稿の自動実行 | normalized-line:8262 |
| B36-013 | TEXT | AIによる高機密データの無承認送信 | normalized-line:8263 |
| B36-014 | TEXT | AIによる個人情報の外部送信 | normalized-line:8264 |
| B36-015 | TEXT | AIによる本番DB変更 | normalized-line:8265 |
| B36-016 | TEXT | AIによる決済・返金の自動実行 | normalized-line:8266 |
| B36-017 | TEXT | AIによる督促送信の無承認実行 | normalized-line:8267 |
| B36-018 | TEXT | AIによる請求書発行の無承認実行 | normalized-line:8268 |
| B36-019 | TEXT | AIによる契約書送信の無承認実行 | normalized-line:8269 |
| B36-020 | TEXT | AIによる株式・投資判断の自動実行 | normalized-line:8270 |
| B36-021 | TEXT | AIによる医療・法律・税務判断の断定 | normalized-line:8271 |
| B36-022 | TEXT | 監査ログを削除できる通常機能 | normalized-line:8272 |
| B36-023 | TEXT | 承認ログを改ざんできる機能 | normalized-line:8273 |
| B36-024 | TEXT | 権限変更を無承認で行う機能 | normalized-line:8274 |
| B36-025 | TEXT | 制裁・反社・輸出管理チェックを無承認で外す機能 | normalized-line:8275 |
| B36-026 | TEXT | Legal Hold対象データを通常削除できる機能 | normalized-line:8276 |
| B36-027 | TEXT | 通報者保護を回避できる機能 | normalized-line:8277 |
| B36-028 | TEXT | 顧客通知をAIが無承認で一斉送信する機能 | normalized-line:8278 |
| B36-029 | TEXT | Feature FlagをAIが無承認で本番有効化する機能 | normalized-line:8279 |
| B36-030 | TEXT | 本番deployをAIが無承認で実行する機能 | normalized-line:8280 |
| B36-031 | TEXT | force pushをAIが無承認で実行する機能 | normalized-line:8281 |
| B36-032 | TEXT | DB migrationをAIが無承認で実行する機能 | normalized-line:8282 |
| B36-033 | TEXT | 実LLMキーをAIが無承認で設定する機能 | normalized-line:8283 |
| B36-034 | TEXT | AIコスト発生処理をAIが無承認で有効化する機能 | normalized-line:8284 |
| B36-035 | TEXT | SEOスパムページ大量生成 | normalized-line:8285 |
| B36-036 | TEXT | 顧客許諾なし導入事例公開 | normalized-line:8286 |
| B36-037 | TEXT | 根拠なしNo.1表記 | normalized-line:8287 |
| B36-038 | TEXT | 根拠なし成果数値掲載 | normalized-line:8288 |
| B36-039 | TEXT | インセンティブ非開示アフィリエイト | normalized-line:8289 |
| B36-040 | TEXT | GitHubの監査ログ削除 | normalized-line:8290 |
| B36-041 | TEXT | HOLD記録削除 | normalized-line:8291 |
| B36-042 | TEXT | Obsidianだけで正式判断を完結 | normalized-line:8292 |
| B36-043 | TEXT | GitHub正本とObsidianメモの混同 | normalized-line:8293 |
| B36-044 | TEXT | secretsや個人情報をObsidianへ同期 | normalized-line:8294 |
| B36-045 | TEXT | 本番ログ生データをObsidianへ同期 | normalized-line:8295 |
| B36-046 | TEXT | 依存関係の無承認一括更新 | normalized-line:8296 |
| B36-047 | TEXT | ライセンス不明packageの導入 | normalized-line:8297 |
| B36-048 | TEXT | SLO/SLAを根拠なく保証する表現 | normalized-line:8298 |
| B36-049 | TEXT | 税務・電子インボイス対応を根拠なく完了扱いすること | normalized-line:8299 |
| B36-050 | TEXT | Partner Payoutの無承認開始 | normalized-line:8300 |

### B37 安全な代替機能

- classification: `SAFETY_REQUIREMENT`
- heading source: normalized-line:8301

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B37-001 | TEXT | 禁止機能の代わりに以下を設計してください。 | normalized-line:8302 |
| B37-002 | TEXT | 正当な口コミ依頼管理 | normalized-line:8303 |
| B37-003 | TEXT | 実在顧客へのレビュー依頼テンプレート作成 | normalized-line:8304 |
| B37-004 | TEXT | レビュー返信支援 | normalized-line:8305 |
| B37-005 | TEXT | 顧客の許諾済み導入事例管理 | normalized-line:8306 |
| B37-006 | TEXT | SNS投稿下書き作成 | normalized-line:8307 |
| B37-007 | TEXT | PR表記付き投稿テンプレート | normalized-line:8308 |
| B37-008 | TEXT | 社長ブランディング投稿の下書き作成 | normalized-line:8309 |
| B37-009 | TEXT | 実績・感謝の声の事実確認フロー | normalized-line:8310 |
| B37-010 | TEXT | 投稿前の人間承認 | normalized-line:8311 |
| B37-011 | TEXT | 採用評価の要約支援 | normalized-line:8312 |
| B37-012 | TEXT | 採用合否の人間承認 | normalized-line:8313 |
| B37-013 | TEXT | 法務レビューの論点抽出 | normalized-line:8314 |
| B37-014 | TEXT | 法務判断の専門家確認フロー | normalized-line:8315 |
| B37-015 | TEXT | 給与・評価の候補作成 | normalized-line:8316 |
| B37-016 | TEXT | 給与・評価の人間承認 | normalized-line:8317 |
| B37-017 | TEXT | 契約リスク候補抽出 | normalized-line:8318 |
| B37-018 | TEXT | 契約締結前承認 | normalized-line:8319 |
| B37-019 | TEXT | 広告文の下書き作成 | normalized-line:8320 |
| B37-020 | TEXT | 広告出稿前承認 | normalized-line:8321 |
| B37-021 | TEXT | 個人情報送信の承認申請 | normalized-line:8322 |
| B37-022 | TEXT | 決済・返金の承認申請 | normalized-line:8323 |
| B37-023 | TEXT | 督促文面下書き | normalized-line:8324 |
| B37-024 | TEXT | 督促送信前承認 | normalized-line:8325 |
| B37-025 | TEXT | 請求書発行前承認 | normalized-line:8326 |
| B37-026 | TEXT | 税務・法務・医療の専門家確認フロー | normalized-line:8327 |
| B37-027 | TEXT | 監査ログの改ざん防止 | normalized-line:8328 |
| B37-028 | TEXT | 承認ログの証跡保存 | normalized-line:8329 |
| B37-029 | TEXT | 通報者保護 | normalized-line:8330 |
| B37-030 | TEXT | Legal Hold確認 | normalized-line:8331 |
| B37-031 | TEXT | AI提案のみモード | normalized-line:8332 |
| B37-032 | TEXT | Human-in-the-loop | normalized-line:8333 |
| B37-033 | TEXT | read-onlyモード | normalized-line:8334 |
| B37-034 | TEXT | AI Kill Switch | normalized-line:8335 |
| B37-035 | TEXT | 外部送信前承認 | normalized-line:8336 |
| B37-036 | TEXT | 本番反映前承認 | normalized-line:8337 |
| B37-037 | TEXT | Feature Flag有効化前承認 | normalized-line:8338 |
| B37-038 | TEXT | 高額処理前承認 | normalized-line:8339 |
| B37-039 | TEXT | AIコスト承認 | normalized-line:8340 |
| B37-040 | TEXT | 実LLMキー未設定前提のmock / stub | normalized-line:8341 |
| B37-041 | TEXT | Compliance / Disclosure Guard | normalized-line:8342 |
| B37-042 | TEXT | 顧客許諾管理 | normalized-line:8343 |
| B37-043 | TEXT | アフィリエイト開示文生成 | normalized-line:8344 |
| B37-044 | TEXT | SEO品質チェック | normalized-line:8345 |
| B37-045 | TEXT | スパムリスクチェック | normalized-line:8346 |
| B37-046 | TEXT | GitHub監査ログ追記主義 | normalized-line:8347 |

### B38 Obsidian Markdown ルール

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8348

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B38-001 | TEXT | docsをObsidianでも読みやすくしてください。 | normalized-line:8349 |
| B38-002 | LABEL | ルール: | normalized-line:8350 |
| B38-003 | TEXT | 1ファイル1テーマ | normalized-line:8351 |
| B38-004 | TEXT | 見出しを明確にする | normalized-line:8352 |
| B38-005 | TEXT | 新規docsにはYAML frontmatterを入れる | normalized-line:8353 |
| B38-006 | TEXT | 今回編集対象docsには必要に応じてfrontmatterを入れる | normalized-line:8354 |
| B38-007 | TEXT | 既存audit docsへfrontmatterを一括適用しない | normalized-line:8355 |
| B38-008 | TEXT | 関連ノートリンク候補を入れる | normalized-line:8356 |
| B38-009 | TEXT | Phaseタグを入れる | normalized-line:8357 |
| B38-010 | TEXT | statusタグを入れる | normalized-line:8358 |
| B38-011 | TEXT | riskタグを入れる | normalized-line:8359 |
| B38-012 | TEXT | areaタグを入れる | normalized-line:8360 |
| B38-013 | TEXT | 日付を入れる | normalized-line:8361 |
| B38-014 | TEXT | 完了 / 未完了 / 証拠不足を分ける | normalized-line:8362 |
| B38-015 | TEXT | 次回Claude Codeへ渡す内容を必ず入れる | normalized-line:8363 |
| B38-016 | TEXT | 長すぎるファイルは分割する | normalized-line:8364 |
| B38-017 | TEXT | 監査ログやHOLD記録は削除しない | normalized-line:8365 |
| B38-018 | TEXT | 追記主義を守る | normalized-line:8366 |
| B38-019 | LABEL | 禁止: | normalized-line:8367 |
| B38-020 | TEXT | 既存audit docsへの一括frontmatter | normalized-line:8368 |
| B38-021 | TEXT | HOLD記録への一括frontmatter | normalized-line:8369 |
| B38-022 | TEXT | release check記録への一括frontmatter | normalized-line:8370 |
| B38-023 | TEXT | 証拠ログ本文の再整形 | normalized-line:8371 |
| B38-024 | TEXT | 大量docsの一括フォーマット変更 | normalized-line:8372 |

### B39 今回作成・更新する成果物

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8373

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B39-001 | TEXT | 実際の既存構造に合わせて調整してください。 | normalized-line:8374 |
| B39-002 | TEXT | なければ以下を候補として作成してください。 | normalized-line:8375 |
| B39-003 | LABEL | 最優先: | normalized-line:8376 |
| B39-004 | TEXT | 拡張ロードマップ Phase 0-26 Candidate | normalized-line:8377 |
| B39-005 | TEXT | AI Workforce Economy Strategy Candidate | normalized-line:8378 |
| B39-006 | TEXT | Developer Cloud / Marketplace Strategy Candidate | normalized-line:8379 |
| B39-007 | TEXT | PLUG Commerce / Employee App Strategy Candidate | normalized-line:8380 |
| B39-008 | TEXT | IP Moat Strategy Candidate | normalized-line:8381 |
| B39-009 | TEXT | Function Master 231-252 Candidates | normalized-line:8382 |
| B39-010 | TEXT | Obsidian Relationship Candidate | normalized-line:8383 |
| B39-011 | TEXT | NEXT_ACTIONS | normalized-line:8384 |
| B39-012 | TEXT | OPEN_RISKS | normalized-line:8385 |
| B39-013 | TEXT | CLAUDE_CODE_NEXT_PROMPT | normalized-line:8386 |
| B39-014 | LABEL | 各docsに必ず入れる: | normalized-line:8387 |
| B39-015 | TEXT | 目的 | normalized-line:8388 |
| B39-016 | TEXT | 背景 | normalized-line:8389 |
| B39-017 | TEXT | 既存docsとの関係 | normalized-line:8390 |
| B39-018 | TEXT | Candidate / Draft / Official の状態 | normalized-line:8391 |
| B39-019 | TEXT | 反映した資料 | normalized-line:8392 |
| B39-020 | TEXT | 反映した要点 | normalized-line:8393 |
| B39-021 | TEXT | やらないこと | normalized-line:8394 |
| B39-022 | TEXT | 承認ゲート | normalized-line:8395 |
| B39-023 | TEXT | リスク | normalized-line:8396 |
| B39-024 | TEXT | 次アクション | normalized-line:8397 |
| B39-025 | TEXT | 人間判断が必要な点 | normalized-line:8398 |

### B40 検証

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8399

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B40-001 | TEXT | 作業後に以下を確認してください。 | normalized-line:8400 |
| B40-002 | TEXT | git diff --stat | normalized-line:8401 |
| B40-003 | TEXT | git status --short | normalized-line:8402 |
| B40-004 | TEXT | rg -n "Phase 26\|Open AI Workforce Economy\|Developer Cloud\|Agent Manifest\|Human Certification Gate\|PLUG\|369 Employee\|IP moat\|Candidate\|Function Master 231\|Safety Review\|Billing Meter\|Revenue Share\|Obsidian\|369-vault" docs | normalized-line:8403 |
| B40-005 | TEXT | rg -n "commit\|push\|deploy\|migration\|実LLM\|AIコスト\|外部送信\|個人情報\|secrets\|force push\|git reset" docs | normalized-line:8404 |
| B40-006 | LABEL | 検証で見たいこと: | normalized-line:8405 |
| B40-007 | TEXT | Phase 0-26が追える | normalized-line:8406 |
| B40-008 | TEXT | Phase 2.5-18とPhase 18.5-26が分かれている | normalized-line:8407 |
| B40-009 | TEXT | Developer Cloudが後ろに置かれすぎていない | normalized-line:8408 |
| B40-010 | TEXT | Marketplaceが安全審査前提になっている | normalized-line:8409 |
| B40-011 | TEXT | PLUG型が透明性前提になっている | normalized-line:8410 |
| B40-012 | TEXT | 従業員個人データが会社に見えない設計になっている | normalized-line:8411 |
| B40-013 | TEXT | IP moatが候補docs化されている | normalized-line:8412 |
| B40-014 | TEXT | 231-252がCandidate扱いになっている | normalized-line:8413 |
| B40-015 | TEXT | GitHub正本とObsidian閲覧の役割が分かれている | normalized-line:8414 |
| B40-016 | TEXT | 369-vault直接編集が禁止されている | normalized-line:8415 |
| B40-017 | TEXT | 実装・DB・外部送信・実LLM・AIコストに進んでいない | normalized-line:8416 |

### B41 Definition of Done

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8417

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B41-001 | LABEL | 完了条件: | normalized-line:8418 |
| B41-002 | TEXT | Scout結果を報告している | normalized-line:8419 |
| B41-003 | TEXT | GitHub正本状態を確認している | normalized-line:8420 |
| B41-004 | TEXT | Obsidian連携状態を確認している | normalized-line:8421 |
| B41-005 | TEXT | docs構造に沿っている | normalized-line:8422 |
| B41-006 | TEXT | 既存audit docsを壊していない | normalized-line:8423 |
| B41-007 | TEXT | 実装ファイルを触っていない | normalized-line:8424 |
| B41-008 | TEXT | DB変更をしていない | normalized-line:8425 |
| B41-009 | TEXT | 外部送信していない | normalized-line:8426 |
| B41-010 | TEXT | 実LLMを使っていない | normalized-line:8427 |
| B41-011 | TEXT | AIコストを発生させていない | normalized-line:8428 |
| B41-012 | TEXT | Phase 0-26ロードマップ候補が追える | normalized-line:8429 |
| B41-013 | TEXT | Phase 2.5-18と18.5-26の関係が追える | normalized-line:8430 |
| B41-014 | TEXT | Developer Cloud / Marketplace / PLUG / Employee App / IP moat が整理されている | normalized-line:8431 |
| B41-015 | TEXT | 231-252 Candidate が整理されている | normalized-line:8432 |
| B41-016 | TEXT | 禁止機能と安全代替機能が明記されている | normalized-line:8433 |
| B41-017 | TEXT | GitHub / Obsidian / 369-vault の関係が明記されている | normalized-line:8434 |
| B41-018 | TEXT | OPEN_RISKS / NEXT_ACTIONS / CLAUDE_CODE_NEXT_PROMPT の更新方針が残っている | normalized-line:8435 |
| B41-019 | TEXT | git diff --stat と git status --short を確認済み | normalized-line:8436 |

### B42 最終報告形式

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8437

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B42-001 | TEXT | 最終報告は、必ず以下17項目で出してください。 | normalized-line:8438 |
| B42-002 | TEXT | 今回の目的 | normalized-line:8439 |
| B42-003 | TEXT | 実際に確認したこと | normalized-line:8440 |
| B42-004 | TEXT | GitHub正本状態 | normalized-line:8441 |
| B42-005 | TEXT | Obsidian連携状態 | normalized-line:8442 |
| B42-006 | TEXT | ロードマップ上の現在地 | normalized-line:8443 |
| B42-007 | TEXT | 実際に変更したこと | normalized-line:8444 |
| B42-008 | TEXT | 変更ファイル | normalized-line:8445 |
| B42-009 | TEXT | できるようになったこと | normalized-line:8446 |
| B42-010 | TEXT | 実行した検証・成功した検証・失敗した検証・未実施の検証 | normalized-line:8447 |
| B42-011 | TEXT | Evidence Map | normalized-line:8448 |
| B42-012 | TEXT | Assumption Log | normalized-line:8449 |
| B42-013 | TEXT | Unknowns Log | normalized-line:8450 |
| B42-014 | TEXT | Risk Register | normalized-line:8451 |
| B42-015 | TEXT | 今回守った安全ルール・触らなかった危険領域 | normalized-line:8452 |
| B42-016 | TEXT | docs / tasks / prompts / Obsidian連携の更新状況 | normalized-line:8453 |
| B42-017 | TEXT | 次にやるべきこと・人間が判断すべきこと | normalized-line:8454 |
| B42-018 | TEXT | Definition of Done確認・次回Claude Codeに渡すべき推奨プロンプト案 | normalized-line:8455 |

### B43 最新値ブロック

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8456

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B43-001 | TEXT | 最終報告末尾に必ず以下を出してください。 | normalized-line:8457 |
| B43-002 | LABEL | EXPECTED_LOCAL_HEAD: | normalized-line:8458 |
| B43-003 | LABEL | EXPECTED_REMOTE_MAIN: | normalized-line:8459 |
| B43-004 | LABEL | EXPECTED_FEATURE_BRANCH_HEAD: | normalized-line:8460 |
| B43-005 | LABEL | EXPECTED_UNPUSHED_COMMITS: | normalized-line:8461 |
| B43-006 | LABEL | WORKING_TREE: | normalized-line:8462 |
| B43-007 | LABEL | NEXT_AUDIT_DOC_NUMBER: | normalized-line:8463 |
| B43-008 | LABEL | NEXT_SAFE_ACTION: | normalized-line:8464 |
| B43-009 | LABEL | DO_NOT_START: | normalized-line:8465 |
| B43-010 | TEXT | 値が分からない場合は UNKNOWN とし、なぜ不明かを書いてください。 | normalized-line:8466 |

### B44 自己採点

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8467

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B44-001 | TEXT | 生成・更新したdocsと最終報告を100点満点で自己採点してください。 | normalized-line:8468 |
| B44-002 | LABEL | 採点項目: | normalized-line:8469 |
| B44-003 | TEXT | 目的適合性 | normalized-line:8470 |
| B44-004 | TEXT | 安全性 | normalized-line:8471 |
| B44-005 | TEXT | 検証充足度 | normalized-line:8472 |
| B44-006 | TEXT | 非エンジニア向け説明性 | normalized-line:8473 |
| B44-007 | TEXT | 構成遵守 | normalized-line:8474 |
| B44-008 | TEXT | GitHub正本運用 | normalized-line:8475 |
| B44-009 | TEXT | Obsidian連携 | normalized-line:8476 |
| B44-010 | TEXT | Roadmap網羅性 | normalized-line:8477 |
| B44-011 | TEXT | Function Master Candidate扱い | normalized-line:8478 |
| B44-012 | TEXT | Growth戦略反映 | normalized-line:8479 |
| B44-013 | TEXT | AI Safety反映 | normalized-line:8480 |
| B44-014 | TEXT | Developer Cloud / Marketplace反映 | normalized-line:8481 |
| B44-015 | TEXT | PLUG / Employee App反映 | normalized-line:8482 |
| B44-016 | TEXT | IP moat反映 | normalized-line:8483 |
| B44-017 | TEXT | 禁止機能除外 | normalized-line:8484 |
| B44-018 | TEXT | 停止条件明確性 | normalized-line:8485 |
| B44-019 | TEXT | 総合評価 | normalized-line:8486 |
| B44-020 | TEXT | 100点未満の場合は、不足点を修正してから最終版を出してください。 | normalized-line:8487 |

### B45 Context Budget / Prompt Compression

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8488

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B45-001 | TEXT | もし文脈が長すぎる場合でも、以下は削らないでください。 | normalized-line:8489 |
| B45-002 | TEXT | Safety Core | normalized-line:8490 |
| B45-003 | TEXT | 承認ゲート | normalized-line:8491 |
| B45-004 | TEXT | 禁止コマンド | normalized-line:8492 |
| B45-005 | TEXT | GitHub正本 / Obsidian役割分担 | normalized-line:8493 |
| B45-006 | TEXT | 369-vault直接編集禁止 | normalized-line:8494 |
| B45-007 | TEXT | Candidate扱い | normalized-line:8495 |
| B45-008 | TEXT | 17項目最終報告 | normalized-line:8496 |
| B45-009 | TEXT | 最新値ブロック | normalized-line:8497 |
| B45-010 | TEXT | Phase 0-26の接続 | normalized-line:8498 |
| B45-011 | TEXT | Developer Cloud / Marketplace / PLUG / Employee App / IP moat | normalized-line:8499 |
| B45-012 | TEXT | AI外部送信禁止 | normalized-line:8500 |
| B45-013 | TEXT | 実LLM / AIコスト禁止 | normalized-line:8501 |
| B45-014 | TEXT | Human Certification Gate | normalized-line:8502 |
| B45-015 | TEXT | 圧縮する場合は、詳細な機能リストを別docsに分け、本文にはリンクと要約を残してください。 | normalized-line:8503 |

### B46 最終指示

- classification: `OPERATING_GOVERNANCE`
- heading source: normalized-line:8504

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B46-001 | TEXT | まずScoutを行い、編集してよい状態か判断してください。 | normalized-line:8505 |
| B46-002 | TEXT | 編集可能なら、既存構造を尊重して最小ファイルセットからdocsを作成・更新してください。 | normalized-line:8506 |
| B46-003 | TEXT | この作業の目的は「開発を進めること」ではありません。 | normalized-line:8507 |
| B46-004 | TEXT | 目的は、IKEZAKI OS / 369 を、AI社員経済圏・Developer Cloud・Marketplace・PLUG購買・従業員導線・知財 moat・GitHub正本・Obsidian連携まで含む法人インフラ構想として、次回以降のClaude Codeが安全に前進できる状態にすることです。 | normalized-line:8508 |
| B46-005 | TEXT | 不明点がある場合は、勝手に補完して実装せず、Assumption Log / Unknowns Log / Risk Register に記録してください。 | normalized-line:8509 |

## 会話追加要件

| Function ID | 名称 | 必須要件 | 原典 |
| --- | --- | --- | --- |
| USR-001 | 単一コピペ統合プロンプト | Claude Codeへ一度貼るだけで使える、分割されていないMarkdown統合プロンプトを維持する。 | user-conversation:2026-07-11 |
| USR-002 | ロードマップ現在地コックピット | 全体ロードマップ、現在の進捗、できるようになったこと、次に可能にすることを毎回明示する。 | user-conversation:2026-07-11 |
| USR-003 | 3Dバーチャルオフィス | AI社員がどこで何をしているか、状態・担当・進捗・承認待ち・異常を3D空間で直感的に確認できるようにする。 | user-conversation:2026-07-11 |
| USR-004 | Outcome & Human Time Ledger | 人間の労働時間削減と成果増加を、推測ではなく証拠付き指標として継続計測する。 | user-conversation:2026-07-11 |
| USR-005 | GitHub・Obsidian毎回同期 | 各作業でGitHub正本とObsidian閲覧鏡像の更新要否を判定し、変更時は両方の同期証拠を残す。 | user-conversation:2026-07-11 |
| USR-006 | WIP制限と確実な前進 | WIPを原則1に制限し、Definition of Ready、完了ゲート、Evidence Map、停止条件で行き当たりばったりを防ぐ。 | user-conversation:2026-07-11 |
| USR-007 | 既知Critical・High脆弱性0 | 既知のCritical・High脆弱性0を出荷条件とし、未検証を0件として扱わずUNKNOWNを明示する。 | user-conversation:2026-07-11 |
| USR-008 | 世界一の証拠ゲート | 世界シェア1位など未検証の主張を禁止し、指標・比較対象・計測日・出典・達成条件を定義して証明する。 | user-conversation:2026-07-11 |
| USR-009 | 完全機能台帳の必須同期 | 原典の全機能を安定ID付きで正本化し、統合プロンプト、ロードマップ、実装証拠から必須参照する。 | user-conversation:2026-07-11 |
