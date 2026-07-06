# 116. 組み込み予定SaaSカタログ Candidate — docs/roadmap/17 の記録（docs-only・369-vault非編集）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（戦略カタログの記録。コード差分ゼロ・369-vault非編集・実同期なし）
- Audit Doc: 116
- Product Phase: Strategy / SaaS Catalog / AI Workforce Infrastructure
- Lineage: Strategy / SaaS Catalog
- Stage: Embedded SaaS Catalog Design (Candidate)
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `8070acf5b8ca0b88c7d5ed986f56749588238162`
- Scope: 369が内包・代替・外部連携・Marketplace化・将来候補にするSaaS領域を `docs/roadmap/17` の Candidate カタログとして記録
- Not Included: SaaS契約判断・SaaS連携実装・実装・schema変更・migration・RBAC変更・label定義変更・company-brain-reference変更・外部送信・実LLM・AIコスト・本番確認・push・Marketplace/PLUG/Developer Cloud/Employee App の実装・Function Master 231-252 の正式昇格
- Next Action: doc116 push-only（別承認）または 1カテゴリずつ個別深掘り
- Do Not Start: SaaS契約判断 / SaaS連携実装 / 実装 / schema変更 / migration / 外部送信 / 実LLM / AIコスト / 本番確認 / 231-252正式昇格 / 369-vault編集

## 1. 非エンジニア向け要約

- 今回は、「369 / IKEZAKI OS に **組み込む予定のSaaS / 置き換える予定のSaaSカテゴリ / 外部連携する予定のSaaSカテゴリ / まだCandidate扱いのSaaS領域**」を、**GitHub正本 docs に一覧として整理しただけ**の回です。
- これまでの戦略docs（AI Workforce Infrastructure・Developer Cloud・Marketplace・PLUG・Employee App・IP moat・Obsidian関係）にあった「**組み込み予定SaaS一覧**」の不足を、`docs/roadmap/17` の **Candidate カタログ**として補いました。
- **369-vault は一切触っていません**。**実際のSaaS連携・契約・実装もしていません**。これは**設計（Candidate）の記録**であり、実装ではありません。**実装なし**・**schema変更なし**・**migrationなし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。

## 2. 今回作成した docs（GitHub正本側・Candidate）

- `docs/roadmap/17_embedded_saas_catalog_candidate.md` — 369が **内包・代替 / 外部連携 / Marketplace / PLUG / Employee App / 将来候補 / 禁止** にするSaaS領域を6区分で整理。**内包・代替対象**のSaaSカテゴリ（Core OS/IAM から Docs/Audit まで）を抜け漏れなく列挙し、**外部連携対象**カテゴリ・**収益源**・**moat（IP moat 含む）**・**禁止と安全代替（Human Certification Gate）**・**Phase対応**・**次アクション**を記録。

## 3. 既存docsとの関係

- 補完対象: `docs/roadmap/09-16`（AI Workforce Infrastructure / 三系統ロードマップ / Developer Cloud / Marketplace / PLUG / Employee App / IP moat / 広告費ゼロ成長 / GitHub・Obsidian・369-vault関係）。本書はその**補完カタログ**であり、既存docsを**置換しない**。
- 上位概念: `docs/roadmap/09`（AI Workforce Infrastructure 定義）。Phase接続: `docs/roadmap/10`。
- **Function Master 231-252 は Candidate**扱いのまま（`docs/roadmap/14`）・**正式昇格しない**。

## 4. 明記したルール（恒久）

- 本カタログは **Candidate**。**実装・契約・API連携・DB化・schema化・正式採用ではない**。各カテゴリは1つずつ個別の人間承認を要する。
- **GitHubが正本**・**Obsidianは閲覧**・**369-vaultを直接編集しない**。
- **AI単独の請求 / 送金 / 契約 / 採用合否 / 給与評価 / 会計確定 を禁止**（Human Certification Gate 必須）。
- **虚偽口コミ・ステマ・なりすまし・非開示アフィリエイト禁止**。**外部送信は人間承認**・**実LLM/AIコストは承認制**。
- **従業員の私的購買履歴を会社管理者へ見せない**（PLUG / 369 Employee App の個人購買分離）。
- 特定企業名は**例示に留め**、SaaS契約判断はしない。

## 5. 今回やらなかったこと

- SaaS契約判断・SaaS連携実装・SaaS連携の実装済み扱い・外部API接続・OAuth設定。
- Marketplace / PLUG / Developer Cloud / Employee App の実装。
- Function Master 231-252 の正式昇格。
- docs/roadmap/09-16 の大幅改変・既存 audit docs の一括編集・369-vault編集・docs/10_obsidian と 369-vault の関係確定。
- 実装・DB変更・schema変更・migration・RBAC変更・label定義変更・company-brain-reference変更・外部送信・実LLM・AIコスト・本番確認・push。

## 6. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `8070acf5b8ca0b88c7d5ed986f56749588238162`・working tree clean・`origin/main..HEAD` 空）。
- 補完対象の存在: `docs/roadmap/09-16`（実測・8本存在）。
- 作成物: `docs/roadmap/17_embedded_saas_catalog_candidate.md` を新設。
- 369-vault 非編集: `git status --short -- 369-vault` = 空（実測）。
- 封印維持: company-brain-reference への AI注入 0・`anonymized: true` 2・apps の Customer Pain runtime 0・`node scripts/check-company-brain-safety.mjs` exit 0（実測）。

## 7. Assumption Log

- 本カタログは Candidate であり、**関係・契約・実装の確定ではない**。
- カテゴリ名は `docs/roadmap/09-16` の語彙を踏襲し、既存docsを置換しない補完として追加した。
- 特定企業名は例示に留め、SaaS契約判断はしない。
- 369-vault は未編集（GitHub正本を維持）。Obsidian は閲覧・思考整理・経営ダッシュボードとして扱う。

## 8. Unknowns Log

- 各カテゴリの内包 / 連携 / Marketplace化の優先順位と時期。外部連携の具体的SaaS選定と契約条件。Billing Meter / Revenue Share の料率。Payroll / Evaluation を内包する時期と承認境界。最初に個別深掘り（Lineage独立docs化）するカテゴリ。

## 9. Risk Register

- 「多機能SaaSの寄せ集め」に見えるリスク → AI Workforce Infrastructure という上位概念を先頭に明記。
- Candidate を実装済み・契約済みと誤読するリスク → 全区分に Candidate・別承認を明記。
- 外部連携を実装済み扱いするリスク → 区分②は未実装の候補と明記。
- AI単独で危険操作をさせるリスク → 区分⑥ Do Not Build と Human Certification Gate を明記。
- 従業員私的購買の可視化リスク → 個人購買分離を明記。
- GitHub正本とObsidianメモを混同するリスク → 「GitHubが正本」を明記・369-vault非編集。
- 未push commit の揮発リスク → doc116 push-only（別承認）で解消。

## 10. Definition of Done

- [x] `docs/roadmap/17` に内包・代替 / 外部連携 / Marketplace / PLUG / Employee App / 収益源 / moat / 禁止・安全代替 / Phase対応 / 次アクションを網羅。
- [x] 6区分の分類ルールと区分①のSaaSカテゴリを抜け漏れなく列挙・特定企業名は例示に留めた。
- [x] Candidate・別承認・369-vault非編集・実装なし・231-252はCandidate を明記。
- [x] CURRENT_STATE / PROGRESS にポインタ追記・docs/10_obsidian ダッシュボード入口に1行追記（GitHub docs側のみ）。
- [x] 許可ファイルのみで Gate 全 green・safety script exit 0。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 11. 次回推奨プロンプト案

1. **doc116 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **1カテゴリ個別深掘り**（例: CRM Lineage / Finance Lineage / Procurement Lineage を `docs/roadmap/` に独立 Candidate docs 化・docs-only・別承認）。
3. Customer Pain schema実装可否判断（`docs/audit/114 §18` 停止条件から・別の重い承認）。

## 12. 判定

**判定: READY / GO**（369が内包・代替・外部連携・Marketplace化・将来候補にするSaaS領域を、`docs/roadmap/17` の Candidate カタログとして抜け漏れなく記録した）。

ただし、これは関係・契約・実装の確定ではない。**docs-only**・**Candidate**・**組み込み予定SaaS**・**置き換え対象**・**外部連携対象**を整理しただけであり、**Developer Cloud**・**Marketplace**・**PLUG**・**369 Employee App**・**IP moat** はいずれも Candidate。**Human Certification Gate** 前提。**GitHub正本**・**Obsidian閲覧**・**369-vault非編集**・**231-252はCandidate**・**実装なし**・**schema変更なし**・**migrationなし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
