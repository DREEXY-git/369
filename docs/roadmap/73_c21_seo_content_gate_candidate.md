# 73. C21 SEO/Content read model＋SEO ブリーフ下書き（Phase 3.5 Stream A2・Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/172_c21_seo_content.md`
- ブランチ: `claude/stream-a-growth-channels-v55`（PR #4・Draft・merge しない）
- Evidence ID: **EVID-C21-RO-01**（roadmap72 §1）・上位: roadmap69 §2（C21 DoR/DoD）

## 1. 実装（既存 schema のみ・schema/seed/RBAC/labels 変更なし）

| 対象 Function ID（v0 証拠・完成扱いにしない） | 実装 |
|---|---|
| C21-001 キーワード管理 | SEOブリーフ（AIOutput task='seo_brief'）由来のキーワード read model 表示（検索ボリューム・順位は封印中と明記） |
| C21-004/005/006 記事管理・構成・下書き | ContentAsset（article/lp）一覧＋ブリーフの構成（見出し案）下書き |
| C21-009 メタ情報 | ブリーフの metaTitle/metaDescription 案＋診断のタイトル長検査 |
| C21-019/020 SEO診断・改善提案 | `diagnoseSeoContent`（shared 純関数・タイトル長/本文量/見出し構造/重複タイトル・決定論・外部アクセスなし） |
| C21-021 スパム防止 | `detectForbiddenClaims`（No.1/業界初/一番/満足度数値）— **AI は生成せず**（fakeSeoBrief が本文から除外し人間確認へ回す・unit で実証）＋既存記事の診断でも検出表示 |
| C21-022/023 カレンダー・記事テーマ | 作成月別カレンダー＋テーマ一覧 |

- ページ `/marketing/content`（marketing:read・データ取得前ゲート）。生成 = marketing:create＋人間のみ（AI ロールは UI 非表示＋action 拒否）。
- 生成は **fakeSeoBrief 直呼び**（実 LLM 経路が構造的に不在・Stream A と同型）・Zod（SeoBriefSchema: キーワード/検索意図/構成≥3/メタ案/根拠/信頼度/データ不足/人間確認≥1）・注入検出（keyword/audience/theme・high は中止）・AIOutput/AISafetyLog/DataAccessLog/writeAudit。
- **顧客 PII・CUSTOMER_CONFIDENTIAL を AI に渡さない**: 入力は人間入力の文字列＋ContentAsset タイトルのみ（prisma.customer への参照なし・実装 grep で確認可能）。
- 生成物はすべて下書き・「外部公開不可」バッジ・公開/CMS/PR 配信の導線なし。
- §9 ハードニング: `/marketing` ホームに marketing:read ゲートを追加（予算・消化の表示があるため）。

## 2. テスト

- unit: content-seo 6件（0件/長文/正常/禁止クレーム/重複/通常文）＋ fakeSeoBrief 3件（決定論・**禁止クレーム要求時も生成しない**・長文/重複/読者なしのデータ不足明示）= 9件。
- e2e 3件: 生成フロー（検索意図/人間確認/外部公開不可）・**命令注入で生成中止**（500 にしない）・担当者回帰＋/marketing ホームゲート回帰。
- 期待 CI: 99 = 96+3。

## 3. Gate 判定

- [x] 外部検索・順位取得・公開・CMS 投稿・PR 配信の経路なし（封印表示つき）
- [ ] ローカル電池 green
- [ ] 敵対的レビュー → 指摘反映
- [ ] CI green（99/0）をログ本文で確認
