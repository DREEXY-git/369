---
title: "Appendix A 補足機能・戦略記録"
status: generated-canonical-mirror
area: function-master
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---
# Appendix A 補足機能・戦略記録

> GitHub完全機能台帳からの生成鏡像です。手動編集禁止。

50カテゴリ詳細後の追加機能、追加19領域、差別化、MVP制約、設計docs候補です。

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

## 関連

- [[00_完全機能台帳インデックス]]
