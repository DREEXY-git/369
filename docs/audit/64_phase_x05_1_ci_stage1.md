# 64. Phase X-05-1 — CI Stage 1 実装（判定 GO・commit-only）

> doc63 §4 Stage 1 の設計に従った最小実装。**workflow作成あり（`.github/workflows/ci.yml` の新規1ファイルのみ）**。
> **app code変更なし・package変更なし・lock変更なし・DB操作なし・本番接触なし・secrets使用なし・deployなし・push なし（commit-only）**。
> **GitHub Actions 実走確認は push後の別確認**（本書の時点では未実施・成功扱いしない）。

---

## 1. 非エンジニア向け要約

- **GitHub にコードが上がるたびに、最低限の自動チェック（テスト211本・型チェック・lint）が自動で走る仕組み**を追加しました。壊れた変更は main に入る前に赤信号で分かるようになります。
- 追加したのは設定ファイル**1つだけ**。アプリのコード・データベース・本番環境には一切触れていません。
- まだローカルで確認した段階です。**実際に GitHub 上で動くかの確認（実走確認）は push 後**に行います。

## 2. CI Stage 1 の目的と実装内容

- 目的: 品質を「セッション内の手動実行の規律」から「自動で守られ続ける仕組み」へ移す第一歩（doc63 §2）。DB不要・secrets不要・数分で完走する範囲だけを先に自動化する。
- 実装: `.github/workflows/ci.yml`（新規・約50行）。**doc63 の設計に従い**、以下のとおり:

| 項目 | 内容 |
|---|---|
| トリガー | push（main・claude/**）と pull_request（main） |
| 権限 | contents: read のみ（書き込み権限なし） |
| 実行環境 | ubuntu-latest・timeout 15分・actions/checkout@v4・pnpm/action-setup@v4（**10.33.0**）・actions/setup-node@v4（**node-version: 20**・cache: pnpm） |
| 実行コマンド | `pnpm install --frozen-lockfile` → **`pnpm db:generate`** → **`pnpm test`** → **`pnpm typecheck`** → **`pnpm lint`**（すべて既存 script・新コマンド作成なし） |

- **入れていないもの（設計どおりの除外）**: pnpm build・Playwright・test:e2e・PostgreSQL service・db:migrate:deploy・db:seed・server起動・secrets・DATABASE_URL・deploy・外部API呼び出し。

## 3. ローカル検証結果（Stage 1 相当・全green）

| # | 検証 | 結果 |
|---|---|---|
| 1 | pnpm db:generate | ✅ exit 0 |
| 2 | pnpm test | ✅ **211 passed（23 files）** |
| 3 | pnpm typecheck | ✅ exit 0 |
| 4 | pnpm lint | ✅ exit 0 |
| 5 | actionlint | **未実施**（環境に未インストールのため。成功扱いしない。実走確認で代替） |

- 修正ループ: 0回。
- **GitHub Actions 実走確認は push後**: push（別承認）→ GitHub の Actions タブで run green を利用者確認 → doc65 候補として記録。

## 4. 今回やっていないこと

- **Stage 2（SKIP_DB_SETUP=1 pnpm build の CI 追加）は未実装**（別承認・doc63 §6）。
- **Stage 3（Playwright smoke on CI）は未実装**（別承認）。
- **否定系テストは未実装**（X-05-2・別承認。isHumanUser の A/B 方式は人間判断待ち）。
- app code変更なし・schema/migration/seed/rbac/labels 変更なし・DB操作なし・本番接触なし・env/vercel.json 無変更。
- 外部送信なし・SNS投稿なし・口コミ投稿なし・顧客の声公開なし・**ENSHiN OS外部発信なし**・**Phase 8なし**・MCP/API公開なし。
- **Phase 2-C は別承認**（Case Study / Customer Pain の実装にも進まない）。
- push なし（commit-only・main 反映は push-only の別承認）。

## 5. 判定と次アクション

- **判定 GO**（CI Stage 1 実装完了・ローカル検証 green・commit-only）。
- **GO済み基準は Phase 2-B-5 / `83d35bc` のまま**（CI はアプリの動作を変えないため基準に影響しない）。
- 次アクション（いずれも別承認）:
  1. 本 commit の push-only（feature＋main）。
  2. **GitHub Actions の実走確認**（利用者が GitHub の Actions タブで run green を確認・doc65 候補）。
  3. X-05-2（否定系テスト第一弾）/ Stage 2 の承認判断。
- 参照: 設計=doc63／完了直前の現在地=doc62。
