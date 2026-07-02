# 27. Phase X-02 E2E smoke 実行実証の結果 — 第1段

> ローカル検証の実行記録＋docs-only 記録。**コード・テスト・設定・package・lock の変更は一切していない。**
> フェーズ: Phase X-02 / 種別: local test execution proof / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- 初めて **E2E テスト（画面の自動テスト）を実際に動かしました**。結果は2段階で読んでください：
  1. **実行環境づくり: 成功** 🎉 — ローカルDB起動→デモデータ投入→本番ビルド→サーバ起動→**ブラウザ起動まで全部動いた**。「E2E はブラウザが無くて動かせない」という古い前提（B-03）は**解消**しました。
  2. **テスト自体: 全11本 red（不合格）** — ただし原因はアプリの故障ではなく、**ログイン画面の部品とテストの探し方が噛み合っていない**こと（下記 §6）。E2E は今まで一度も実行されたことがなかったため、今日まで誰も気づけなかったズレです。
- **これは失敗ではなく、Phase X-02 が見つけるべきものを見つけた成果**です。直し方は2通りあり（画面側 or テスト側）、選択は人間承認のうえ次タスクで行います。
- 約束どおり、**コードもテストも一切修正していません**（結果をそのまま記録）。

## 2. 実行環境・実行条件（証拠）

| 項目 | 値 |
|---|---|
| 対象 | `apps/web/tests/e2e/smoke.spec.ts` **1ファイルのみ**（内訳: 11テスト） |
| 実行コマンド | `pnpm exec playwright test tests/e2e/smoke.spec.ts --reporter=list`（apps/web にて） |
| Playwright | **1.61.0**（apps/web devDependency・インストール済みを実測） |
| ブラウザ | プリインストール Chromium（`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`・**ダウンロードなし・playwright install 不使用**） |
| DB | **ローカル** Postgres 16.13（`/var/lib/pg-ikezaki`・localhost:5432。`.env` の接続先がローカルであることを値非表示で事前検証） |
| データ | `pnpm db:migrate:deploy`（9 migrations・pending なし）→ `pnpm db:seed`（users 4 / customers 9 / leads 80 等） |
| アプリ | `pnpm build`（成功）→ `pnpm start`（本番ビルド・`/login` HTTP 200 を確認してからテスト実行） |
| 本番接続 | **なし**（本番DB・Vercel・外部送信ゼロ） |

## 3. セットアップで解決した問題（記録）

1. **Postgres 起動失敗×2 → 解決**: 原因はログファイル出力先が postgres ユーザーから書き込み不可だったこと。`/tmp` 配下のログ指定＋socket ディレクトリ `/var/run/postgresql` の確保で起動成功（既存データは自動リカバリで復旧）。
2. **ブラウザ revision 不一致 → 解決**: Playwright 1.61.0 は `chromium_headless_shell-1228` を要求、プリインストールは `1194`。禁止された `playwright install`／設定変更を使わず、**/opt/pw-browsers 内にバージョンシムのシンボリックリンク**（1228 の期待パス → 実在する 1194 バイナリ）を作成して解決。**repo ファイルは無変更**（コンテナ揮発領域のみ）。1回目の実行で出た「Executable doesn't exist」は2回目で消滅＝**ブラウザ起動成功**。

## 4. 実行結果

- **結果: 11 failed / 0 passed（red）**。
- **全テストが同一箇所で失敗**: `login()` ヘルパの `page.getByLabel('メールアドレス')` が 30秒タイムアウト（全テストがログインを前提とするため連鎖的に全滅）。
- サーバログにエラーなし・`/login` は 200 で描画・ページ自体は正常表示（＝アプリのクラッシュではない）。

## 5. 判定の分解

| 層 | 判定 | 根拠 |
|---|---|---|
| 環境（DB・seed・build・server） | **GREEN** | 各段のコマンド成功＋`/login` 200 |
| ブラウザ起動（B-03 解消） | **GREEN** | シム適用後「Executable doesn't exist」消滅・Chromium がページ操作を実行 |
| テスト（smoke 11本） | **RED** | 全件 `getByLabel` タイムアウト |

## 6. red の根本原因（DOM 実測に基づく）

`/login` の実レンダリング HTML を curl で確認した結果:

- `<label class="...">メールアドレス</label>` に **`for` 属性がない**。
- 直後の `<input type="email" name="email">` に **`id` がない**。label の入れ子でもない。
- → Playwright の `getByLabel()` は「label と input の**プログラム的関連付け**（for/id・aria-label・入れ子）」を要求するため、**構造的に絶対マッチしない**。
- つまり原因は「**テストのセレクタと画面マークアップの乖離**」。E2E が一度も実行されたことがない（旧 B-03）ため、作成時から今日まで検出されなかった。
- 付随する気づき: label 関連付けの欠如は**アクセシビリティ（スクリーンリーダー対応）観点でも改善余地**である。

## 7. 修正の選択肢（実施は別承認・今回は未実施）

| 案 | 内容 | 利点 | 影響 |
|---|---|---|---|
| **A（推奨候補）** | 画面側: ログインフォーム（および同型フォーム）の label に `htmlFor`＋input に `id` を付与 | テストがそのまま通る見込み＋**アクセシビリティ改善**という本質的価値 | apps/web の UI コード変更（要承認・要 verify） |
| B | テスト側: `getByLabel` → `getByRole('textbox')`/`locator('[name=email]')` 等へ変更 | アプリ無変更 | テストが実装詳細に依存し壊れやすくなる。アクセシビリティ改善機会を逃す |

- どちらの場合も、修正後に smoke 11本を再実行して green を確認するのが次の節目。

## 8. してはいけないことの遵守

- コード・テスト・設定・package/lock: **無変更**（git status clean を実測）。
- playwright install・依存DL・TLS迂回: **不使用**（シムはローカル揮発領域のシンボリックリンクのみ）。
- 本番DB・本番環境・外部送信・実メール・Webhook: **接触ゼロ**。テスト後にサーバ・Postgres とも**停止済み**。

## 9. 再現手順（次回用・環境準備の要点）

1. B-01: Prisma エンジン env を export（BLOCKERS.md）。
2. B-02: `/var/run/postgresql` を確保 → `pg_ctl -D /var/lib/pg-ikezaki -l /tmp/pg.log start`（postgres ユーザー・ログは postgres が書ける場所に）。
3. `pnpm db:migrate:deploy && pnpm db:seed`（`.env` はローカル接続を事前検証）。
4. `SKIP_DB_SETUP=1 pnpm build` → `.env` を読み込んで `pnpm start`（/login 200 を確認）。
5. ブラウザシム: `/opt/pw-browsers/chromium_headless_shell-<要求rev>/chrome-headless-shell-linux64/chrome-headless-shell` → 実在 rev の `headless_shell` へ symlink。
6. `pnpm exec playwright test tests/e2e/smoke.spec.ts --reporter=list`。

## 10. GO / HOLD / NG 判定

- **実行実証としての判定: GO** — 「この環境で E2E は実行できる」が証明された（B-03 解消・環境5段 GREEN）。
- **テスト結果: RED（11/11）** — 原因特定済み（§6）。**コード修正はスコープ外のため未実施**。
- 次の意思決定（案A/案B）は人間承認（Phase X-03）。

## 11. 次にやること

- **Phase X-03（候補・別承認）**: 修正方針の決定（案A=フォームの label 関連付け付与を推奨候補）→ 最小修正 → smoke 再実行で green 確認 → 記録。
- その後: 残り11スペックの段階実行、本番スモーク定型化（doc26 §8）へ。

> 注: 本書は実行実証の記録であり、テスト・コードの修正ではない。red の修正は別途人間承認が必要。
