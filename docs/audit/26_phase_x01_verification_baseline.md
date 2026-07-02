# 26. Phase X-01 検証基盤ベースライン — 本番スモーク / E2E / 検証基盤整理

> read-only 棚卸し＋docs-only 記録。**コード・テスト・設定・package の変更、テスト実行、dependency install は含まない。**
> フェーズ: Phase X-01（短期品質フェーズ Phase X の最初のタスク） / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- Phase 1 が完了したので、機能を増やす前に「**壊れていないことを確かめる道具箱**」の中身を全部並べて点検しました（今回は点検のみ。修理・追加はしていません）。
- 道具は揃っています：**ワンショット検証（verify.sh）／単体テスト23ファイル／DB統合テスト25ファイル／画面E2Eテスト12本／本番スモーク手順／Vercelチェック**。
- ただし「すぐ使える道具」と「準備が要る道具」があります。DB統合テストは Postgres の手動起動が必要、画面E2Eはこれまで「ブラウザが入手できない」ため未実行でした。
- **重要な発見**: 現在の実行環境には**ブラウザ（Chromium）がプリインストール済み**で、これまで諦めていた**E2Eテストが動かせる可能性**があります。次のタスク（Phase X-02）で実証するのが最優先候補です。

## 2. 目的

Phase X（品質フェーズ）の出発点として、検証手段の現状・制約・改善候補を証拠付きで1枚に固定し、以後の品質作業（X-02〜）の土台にする。

## 3. 現在の検証手段一覧（read-only 実測）

| 手段 | 実体 | 内容 | 前提 |
|---|---|---|---|
| **scripts/verify.sh** | ワンショット検証 | 5段: db:generate → typecheck → lint → unit test → build（`SKIP_DB_SETUP=1` 既定） | サンドボックスでは B-01 の Prisma エンジン env 設定が必要 |
| **package scripts** | pnpm@10.33.0 | lint / typecheck / test / test:watch / test:e2e / build / db:*（migrate/seed/reset 等）/ format(:check) | — |
| **unit tests** | `*.test.ts` ×23ファイル（shared 20／ai 2／integrations 1） | 純粋ロジック＋FakeLLM。**DB非依存**。root `vitest.config.ts`（itest除外） | なし（即実行可） |
| **integration tests** | `*.itest.ts` ×25ファイル（すべて `packages/db/src/__tests__/`） | P0基盤〜Phase 1-40 UsageEvent まで。`pnpm --filter @hokko/db test:integration`（専用 `vitest.integration.config.ts`・`../../.env` 読込） | **要 live Postgres**（B-02 手動起動＋migrate deploy） |
| **Playwright E2E** | `apps/web/tests/e2e/` ×12スペック | smoke（ログイン→主要画面）＋ドメイン別11本（finance/operations/dunning/security 等）。`apps/web/playwright.config.ts`（baseURL localhost:3000・webServer=`pnpm start`・chromium） | **要 build＋seed済みDB＋chromium**。従来 B-03 でブラウザDL不可 → §7 の新発見参照 |
| **HTTP スモーク（署名Cookie）** | 手順（doc14 §10） | 本番ビルドをローカル起動し、署名Cookie で主要画面の HTTP 200 を確認。E2E 代替として実績あり | 要 build＋seed済みDB＋起動 |
| **Vercel / CI** | Vercel Native Checks のみ（**`.github/` なし＝GitHub Actions 未導入**） | lint/typecheck（pre フックで prisma generate のみ）／build（prebuild で migrate/seed=vercel-setup）。本番確認は**利用者実測**（doc14 の GO 記録方式） | 人間の Vercel 画面確認 |

## 4. 現在安全に実行できるもの（このサンドボックスで）

- read-only の grep / find / cat / git 検査（本棚卸しで使用）。
- `pnpm test`（unit 23ファイル・DB非依存）※B-01 env 設定後。
- `./scripts/verify.sh` 全5段 ※B-01 env 設定後（Phase 1 期間中に複数回 green 実績・unit 211 tests）。

## 5. 条件付きで実行できるもの

- **integration tests**: B-02 の手動 Postgres（initdb → pg_ctl → createdb app369 → migrate deploy）を先に行えば実行可。Phase 1 期間中に複数回 green 実績。
- **Playwright E2E**: ①chromium（§7 の新発見により本環境では入手済みの可能性）②`pnpm build` ③seed 済み Postgres（B-02）④`pnpm start`（webServer が自動起動）— の4条件が揃えば実行可。**未実証**。
- **HTTP スモーク**: ②③④が揃えば実行可（doc14 §10 の手順）。

## 6. 今回実行しなかったものと理由

- `pnpm install / test / typecheck / lint / build / test:e2e`・`playwright install`・`prisma migrate/db push/seed/reset`: **read-only 棚卸し・コード非変更のため実行しない**（本フェーズの承認範囲外）。
- したがって本書の「実行できる」は**過去実績と構成の読解に基づく評価**であり、今回新たに green を取ったものではない（未実行を成功扱いしない）。

## 7. BLOCKERS / 制約（と新発見）

- **B-01**: Prisma エンジン自動DL不可（ECONNRESET）。回避＝既存ローカルエンジンへの env 指定（BLOCKERS.md 記載・Phase 1 で確立済み）。
- **B-02**: 統合テスト用 Postgres は手動起動が必要（フレッシュコンテナは Postgres 未起動・`.env` 無し）。
- **B-03（従来）**: Playwright ブラウザDL不可 → E2E 未実行・HTTPスモークで代替、が既存方針。
- **🔍 新発見（本棚卸し）**: 現在のリモート実行環境には **Chromium がプリインストール済み**（`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` が環境変数で設定済み・`playwright install` 不要）。**B-03 が事実上解消されている可能性が高い**。ただし実証（E2E の実実行）は未実施のため、Phase X-02 の最優先候補とする。プロジェクト側の `@playwright/test` の版が異なる場合は `executablePath` 指定の考慮が必要。

## 8. 本番スモークの今後の標準手順案（案・実施は別承認）

1. B-01 env 設定 → B-02 Postgres 起動 → `pnpm db:migrate:deploy`（ローカルDB）→ `pnpm db:seed`。
2. `pnpm build` → `pnpm start`（ローカル本番ビルド起動）。
3. 署名Cookie を生成し、主要画面（/login・/dashboard・/customers・/invoices・/admin/usage 等）の **HTTP 200＋タイトル文字列**を確認（doc14 §10 の再現）。
4. 結果を「実行した/しない・green/red」で docs に記録。**本番（Vercel）は引き続き利用者実測のみ**。

## 9. E2E / Playwright の今後の標準手順案（案・実施は別承認）

1. §8 の 1〜2 と同じ準備（seed済みDB＋build）。
2. プリインストール Chromium の検出確認（`PLAYWRIGHT_BROWSERS_PATH` 参照・DL しない）。
3. まず **smoke.spec.ts のみ**実行（ログイン→ダッシュボード→顧客→カンバン）。green なら残り11スペックを段階実行。
4. 失敗はコード修正せず記録（修正は別承認の別タスク）。seed データ前提（`ceo@ikezaki.local` 等）はテスト内に既定済み。

## 10. 非エンジニアが確認できる項目

- Vercel: Production の Status=Ready／Build 成功／Latest Deployment Commit（doc14 のチェックリスト方式）。
- 本番画面: /login できる・主要画面が開ける・`/admin/usage` が「請求額ではない」注記付きで見える。
- 報告の読み方: AI の報告で「**実行した検証／未実施の検証**」が分かれているか・「green」と書かれたものにコマンド出力の証拠があるか。

## 11. Phase X の改善候補

| # | 候補 | 内容 |
|---|---|---|
| 1 | E2E 実行の実証 | プリインストール Chromium で smoke.spec.ts を動かし、B-03 の解消を確認（§7/§9） |
| 2 | 本番スモーク手順の定型化 | doc14 §10 を再現可能な手順書（または scripts/）に固定（§8） |
| 3 | 検証準備の script 化 | B-01 env 設定＋B-02 Postgres 起動を1コマンド化（scripts/ 追加＝要承認） |
| 4 | GitHub Actions 導入検討 | 現状 CI は Vercel Native Checks のみ。PR 時 verify 自動化の設計（導入是非は人間判断） |
| 5 | format:check の運用位置決め | verify.sh に含めるか、CI に置くかの整理 |

## 12. 優先度

- **P1**: 候補1（E2E 実証）・候補2（スモーク定型化）— Phase X の本丸。
- **P2**: 候補3（準備 script 化）— P1 の副産物として作ると効率的。
- **P3**: 候補4（CI 導入検討）・候補5（format 運用）— 設計判断が要るため急がない。

## 13. してはいけないこと（Phase X 全体）

- E2E/スモークを通すための**コード側の安易な改変**（テストを通すためにアプリを曲げない。失敗は記録→別承認で修正）。
- `playwright install` などの**ネットワーク DL の強行**・TLS 検証無効化・proxy 迂回。
- 本番DB・本番環境での試験。試験は**ローカル DB / ローカル起動のみ**。
- package.json / lock の変更、dependency install（必要が出たら停止して人間承認）。
- 実課金・決済・外部送信・schema/migration（Phase X スコープ外・従来どおり）。

## 14. GO / HOLD / NG 判定

- **判定: GO（Phase X-01 の棚卸し・記録として）**。
- 検証手段の全量（unit 23／integration 25／E2E 12／smoke／verify.sh／Vercel）と制約（B-01/B-02/B-03）を実ファイル・実設定の読解で固定し、改善候補を優先度付きで整理した。
- **これは「実テスト実行の GO」ではない**。今回テストは一切実行しておらず、実行可否の実証は Phase X-02 以降（別承認）。

## 15. 次にやること

- **Phase X-02（候補・別承認）: E2E 実行の実証＋本番スモーク定型化の第1段**（P1 の2件。まず smoke.spec.ts 1本の実行実証から）。
- その結果を踏まえて X-03 以降（準備 script 化・CI 検討）を確定する。

> 注: 本書は棚卸しの記録であり、テスト実行・修正・環境変更ではない。各改善の実施は別途人間承認が必要。
