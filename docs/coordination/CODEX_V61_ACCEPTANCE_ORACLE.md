# Codex v6.1 独立受入オラクル

- 作成日: 2026-07-12
- 固定参照: PR #12 head `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`
- 対象: Claude `full-recovery-v61` のdelta review
- 状態: `WAITING_FOR_CLAUDE_ACK_AND_RECOVERY_HEAD`
- Codex変更範囲: 本書のみ。Claude管理コード、本番、DB、Secretsは非接触。

## 1. 目的

Claudeの修正版を、説明や画面の印象ではなく、固定された集合・否定ケース・配信SHAで判定する。復旧時に別の既存機能が落ちること、人物正本が再び分岐すること、review threadが証拠なしにresolveされることを防ぐ。

## 2. 2026-07-12 Scout

- PR #12: Draft / open / head `7ef2d9f`。
- PR #13: Draft / open / head `ff36150a`。
- Claude `CLAUDE_ACK`: 未確認。
- Claude recovery branch: 未確認。
- PR #12 unresolved review thread: 4件。
  - P1 stale run: `apps/worker/src/agent-lifecycle.ts:96-100`
  - P1 escaped quote secret: `packages/shared/src/agent-run-lifecycle.ts:79-81`
  - P1 split Cookie header: `packages/shared/src/agent-run-lifecycle.ts:85`
  - P2 Marketing NAV gate: `apps/web/lib/nav-permissions.ts:13-16`

## 3. NAV基準

- 項目数: 67
- グループ数: 12
- 順序付き`label<TAB>href` SHA-256:
  - `2b45b747d1d897dd77c6abca5d5be6c6cfa5279ec63223a800f1d980e819b8cb`

```text
ダッシュボード	/dashboard
社長コックピット	/dashboard/ceo
AI朝礼レポート	/reports/morning
アラート	/alerts
承認待ち	/approvals
成長ダッシュボード	/growth
Growthコントロールタワー	/growth/control-tower
成長イベント台帳	/growth/events
Marketing OS	/marketing
広告・チャネル分析	/marketing/ads
SEO・コンテンツ	/marketing/content
DX OS	/dx
顧客CRM	/customers
案件管理	/deals
営業パイプライン	/deals/kanban
キャンペーン	/leadmap/campaigns
リード一覧	/leadmap/leads
地図CRM	/leadmap/map
パイプライン	/leadmap/pipeline
訪問ルート	/leadmap/routes
見積書	/quotes
契約	/contracts
請求書	/invoices
財務サマリー	/finance
Finance Bridge	/finance/bridge
仕訳候補	/finance/journal-candidates
請求候補	/finance/invoice-candidates
資金繰り	/finance/cashflow
利益漏れ検知	/finance/profit-leaks
経営資産ダッシュボード	/operations
イベント案件	/operations/events
在庫移動台帳	/operations/inventory-movements
棚卸	/operations/stocktakes
発注管理	/operations/purchase-orders
発注点・候補	/operations/reorder
配送・設営・回収	/operations/logistics
在庫・商品	/inventory
リース予約	/inventory/lease
商品収益性	/inventory/profitability
会議・議事録	/meetings
議事録の取込	/meetings/upload
タスク	/tasks
ナレッジ検索	/knowledge/search
会社の頭脳	/brain/policies
営業プレイブック	/brain/playbooks
顧客事例	/brain/case-studies
AI社員	/ai-agents
3Dバーチャルオフィス	/ai-office
コミュニケーション	/communications/inbox
報連相	/horenso
士業連携	/experts
補助金・助成金	/subsidies
プランニングホッコー	/planning-hokko
管理コンソール	/admin
ユーザー・権限	/admin/users
監査ログ	/admin/audit
機密参照ログ	/admin/data-access-logs
AI安全ログ	/admin/ai-safety
AI出力ログ	/admin/ai-outputs
ポリシー判定	/admin/policy-decisions
イベント連動	/admin/events
同意管理	/admin/compliance/consents
危険操作ゲート	/admin/danger-actions
ジョブ実行	/admin/jobs
位置情報アクセス	/admin/location-access
Operations準備	/admin/operations-readiness
Operations実行	/admin/operations-actions
```

### 判定

- recovery後も67件・同一順序・同一hrefを基本契約とする。
- UIの折りたたみやlauncher追加は許可するが、項目削除・改名・href変更は個別理由なしに許可しない。
- 意図的な追加がある場合は、67件をsubsetとして保持し、追加ID、理由、権限、page、testを示す。
- OWNER 67/67。非OWNERのfilterはpage gateと一致すること。

## 4. Page基準

- `apps/web/app/**/page.tsx`: 127件
- sorted path SHA-256:
  - `4eed54c29b3cb55e16aff9d5e85119617088ad8d6760bbbcba9443eb76430e0c`
- mainとの差分で必須の4ページ:
  - `apps/web/app/(app)/growth/control-tower/page.tsx`
  - `apps/web/app/(app)/marketing/ads/page.tsx`
  - `apps/web/app/(app)/marketing/content/page.tsx`
  - `apps/web/app/(app)/ai-office/page.tsx`

### 判定

- recovery headのpage集合が固定127件をすべて含むこと。
- 新しい診断画面等を足す場合は127以上を許可するが、削除はHOLD。
- 67 NAV hrefすべてに静的page実体があり、OWNER E2Eで404/500/Error Boundaryがないこと。

## 5. AI人物正本

- character key数: 8
- key行 SHA-256:
  - `fe133946d09f2f74e0c58af8264497a4de8f50b10c3db0b26aff175e02a22575`
- key/fullName/codeName行 SHA-256:
  - `e74d37bd62ed68355865e3f02e7d2889cd47bed0d79fe522b847c8bdd00877ac`

| key | fullName | codeName | DB運用役割 |
| --- | --- | --- | --- |
| `leadmap_sales` | 蒼井 葵 | アオイ | LeadMap営業AI社員 |
| `sales` | 橘 遼真 | リョウマ | AI営業社員 |
| `cfo` | 氷室 紫苑 | シオン | AI CFO |
| `inventory` | 真田 大和 | ヤマト | AI在庫管理社員 |
| `chief_of_staff` | 九条 雅 | ミヤビ | AI社長室長 |
| `customer` | 花園 心春 | コハル | AI顧客対応社員 |
| `accounting` | 白鳥 環 | タマキ | AI経理社員 |
| `hr` | 桐生 悠人 | ユウト | AI人事社員 |

### 判定

- `/ai-agents`、`/ai-agents/[id]`、`/ai-office`が同じkey→profile正本を使用。
- DB name／roleは運用メタデータとして分離し、人物正本を上書きしない。
- 8名すべてでlist→detail→office→detailのagent同一性を確認。
- unknown key fallback、invalid/cross-tenant非漏洩、tenantId scopeを確認。
- character設定を実測成果として表示しない。

## 6. Shared export基準

次のbarrel exportを保持する。

- `ads`
- `content-seo`
- `ai-workforce`
- `agent-run-lifecycle`
- `outcome-evidence`
- `ai-characters`

競合解消で一方のexportを落とした場合はHOLD。

## 7. P1/P2否定オラクル

### P1 stale run

- stale RUNNING rowがあってもfresh replacement runの`fn`が実行される。
- null `startedAt`をstaleとして安全に扱う。
- fresh rivalだけが収束対象。
- tenant、task、idempotency境界を越えない。
- concurrent create／CAS競合／retryで二重実行しない。

### P1 escaped quote

入力例: `{"password":"abc\\\"SECRET_TOKEN"}`。

- `SECRET_TOKEN`を含む秘密値suffixが保存結果へ残らない。
- escaped backslash、複数escaped quote、JSON nested valueも確認。
- テストは`[masked]`の存在だけでなく、元秘密値の不存在を直接assertする。

### P1 split Cookie

入力例: `Cookie:\nsession=SUPERSECRET`。

- インデントなし、space、tab、CRLF、複数cookie、任意cookie名を確認。
- `SUPERSECRET`と値断片が保存結果へ残らない。

### P2 Marketing NAV gate

- `/marketing`
- `/marketing/ads`
- `/marketing/content`

すべてpageのpre-fetch `marketing:read`とNAV filterを一致させる。OWNERは表示、権限なしroleは非表示または明瞭な制限状態、直接URLは取得前拒否。

## 8. Deploymentオラクル

各確認対象について次を1行で固定する。

| URL | Environment | Deployment ID | Source branch | Source SHA | NAV count | Verified by |
| --- | --- | --- | --- | --- | ---: | --- |

### Gate

- Previewのsource SHAがClaude recovery fixed headと一致。
- Productionは人間GO後のmain release SHAと一致。
- 画面で確認したshort SHA／environmentがdeployment metadataと一致。
- Production 63のまま、古いalias、Preview取り違え、SSO login画面だけの確認は復旧証拠にしない。

## 9. Visualオラクル

必須artifact:

1. desktop initial NAV。
2. desktop launcherで追加4機能を検索。
3. mobile drawer／launcherで追加4機能へ到達。
4. `/growth/control-tower`。
5. `/marketing/ads`。
6. `/marketing/content`。
7. `/ai-office` nonblank canvas。
8. AI社員list／detail／officeの同一人物。
9. profile全体 desktop/mobile。
10. 最終NAV項目`Operations実行`。

文字切れ、横overflow、重なり、極小文字、空canvas、pointer不一致をDOM測定と目視の両方で確認する。

## 10. Review実行順

1. Claude `CLAUDE_ACK`を確認。
2. recovery branchのWORK_CLAIMとfixed headを確認。
3. base `7ef2d9f`からのdeltaだけでなく、mainからの全系譜も確認。
4. unresolved 4 threadの修正と否定テストを確認。
5. NAV／page／character／export集合を本書と比較。
6. unit、typecheck、lint、build、safety、E2Eのjob log本文を確認。
7. Preview deployment source SHAを確認。
8. artifactをdesktop/mobileで目視。
9. Critical/High/Medium/Low/Evidence Gapを記録。
10. 合格時だけ`CODEX_REVIEWED`。main／Productionは別Gate。

## 11. 現在の次アクション

Claudeの`CLAUDE_ACK`とrecovery headを待つ。到着後、本書を変更せず基準としてdelta reviewを開始する。Claudeから新機能追加の明示がある場合のみ、基準追加を別commitで記録する。
