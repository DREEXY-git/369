# Codex レーンC 独立監査 - LeadMap 優先度スコア内訳

## 監査固定点

- 監査日: 2026-07-23 (Asia/Tokyo)
- 対象: PR #122 `claude/leadmap-score-breakdown-v1`
- 固定 commit: `d3b7ce5`
- 依頼ファイル: `docs/coordination/codex-queue/2026-07-23-C-leadmap-score-breakdown.md`
- 監査対象:
  - `packages/shared/src/leads.ts`
  - `packages/shared/src/__tests__/lead_score_breakdown.test.ts`
  - `apps/web/app/(app)/leadmap/leads/[id]/page.tsx`
  - `packages/db/prisma/schema.prisma` の `LocalBusinessLead` / `LeadScore`
- 作業境界: read-only source review。main merge、DB、Secrets、本番、外部送信、課金は未実行。

## 判定

**PASS**

実害として扱うべき tenant 越境、権限漏れ、PII 滲み出し、決定論崩れ、または broken JSON による表示破綻は確認しなかった。

残る注意点は「破損した `breakdown` に巨大な有限数が入った場合、factor の `+points` 表示はその値をそのまま出す」こと。ただし同じカードは保存済み `latestScore.score` を合計点として表示しており、`breakdown` 自体も同一 tenant の `LeadScore` からしか読まれない。現変更の実害 finding にはしない。将来の堅牢化では、factor points を `0..100` に clamp する、または score と内訳合計が大きく乖離した場合に「内訳参考値」と明示する余地がある。

## 観点別確認

### 1. tenant 越境参照

`LeadDetailPage` は先に `requireUser()` と `leadmap:read` を確認し、その後 `localBusinessLead.findFirst({ where: { id, tenantId: user.tenantId } })` で親 lead を tenant scope している。追加された nested read も `scores: { where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 1 }` で子側 tenant を明示している。

schema 上 `LeadScore` は `leadId` 単独 FK だが、親 lead が `id + tenantId` で取得され、子 score も `tenantId` で絞られるため、別 tenant の `LeadScore` が親 lead にぶら下がっていても表示されない。逆に `tenantId=user.tenantId` かつ `leadId=対象lead.id` の score は、同一 tenant の対象 lead に対する score として扱われる。

### 2. 捏造しない / 壊れた JSON

`describeLeadScoreBreakdown` は `null` / `undefined` / 非オブジェクト / 配列を空配列にし、0以下、非数値、非有限値を除外する。カードは `scoreFactors.length > 0` の場合だけ表示されるため、未保存または壊れた breakdown から理由を捏造しない。

未知キーは仕様どおり key を label にして `opportunity` 扱いになる。これは `computeLeadScore` の将来キー追加に対する劣化耐性として妥当で、現コードが生成する breakdown key は `LEAD_SCORE_FACTOR_META` とテストで対応確認されている。

`latestScore.score` と `lead.priority` が乖離しても、基本情報の優先度バッジと内訳カードの保存済み score は別の値として表示される。誤った合算値を再計算して見せる実装ではない。

### 3. 情報露出 / 権限

Lead 詳細は店舗情報、営業メモ、下書き導線を含む画面であり、既に `leadmap:read` がない場合は DB fetch 前に `AccessDenied` を返す。追加された score include はこのガードの後にしか実行されない。

`breakdown` の表示内容は label / hint / points / kind のみで、既知キーは評価帯、口コミ数、Web/予約/LINE/SNS/ネガティブ口コミ兆候など LeadMap 画面の既存情報から派生する営業理由に限られる。機密ラベルや PII を新たに参照する経路はない。

### 4. 決定論

`describeLeadScoreBreakdown` は `points` 降順、同点は `key` 昇順で sort する。入力 object の列挙順に依存しないことは `lead_score_breakdown.test.ts` の reversed object case で確認されている。表示側も `key` を React key に使っており、同じ breakdown から同じ順序になる。

### 5. 回帰耐性

`computeLeadScore` が現在保存する既知 key は `LEAD_SCORE_FACTOR_META` に揃っており、テストも全既知 key の meta 欠落を検出する。将来 key が増えて meta 更新を忘れても、未知キー fallback でカード自体は破綻しない。

## テスト確認

既存追加テストを source review で確認した。対象は次を含む。

- `computeLeadScore` の breakdown を日本語 factor に変換
- `points` 降順、同点 `key` 昇順の決定論
- 0以下、非数値の除外
- 未知キー fallback
- `null` / `undefined` / 非オブジェクト / 配列の fail-closed
- 既知キー meta 欠落検出

ローカルでの test command は実行していない。依頼は docs-only / read-only 監査であり、DB・依存取得・Playwright には触れていない。

## 安全境界

コード修正、main push/merge、PR作成、本番・DB・Secrets・外部送信・課金操作は行っていない。本成果物は `codex/reaudit-C-leadmap` 向けの docs-only 監査レポートである。
