# 30. Phase X-03 E2E smoke green 化の記録（X-03＋X-03b）

> ローカル検証の実行記録。**E2E smoke 11本が初めて 11/11 green になった**フェーズの正式記録。
> フェーズ: Phase X-03（実装第1段=WIPコミット）＋ X-03b（テストセレクタ明確化・最終green）。現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- **画面の自動テスト（E2E smoke）11本が、初めて全部合格（11/11 green）しました** 🎉。
- Phase X-02 の時点では 0/11（全滅）でした。原因は2つあり、両方とも今回のフェーズで解消しました:
  1. **ログイン画面の部品のラベルと入力欄が「プログラム的に」つながっていなかった**（X-03 で修正。アクセシビリティ=スクリーンリーダー対応の改善も兼ねる）。
  2. **地図ページのテストの探し方が曖昧だった**（「地図CRM」という文字がページ内に2箇所あり、テストがどちらか決められなかった。X-03b でテスト側の1行を「見出しの『地図CRM』」と明確化）。
- これで「コードを変えたら 11 画面の主要動線が壊れていないか」を**自動で確認できる回帰ゲート**が手に入りました。Phase 2 の出口条件（doc01 §3）にもこの green 維持が入っています。

## 2. 目的

Phase X-02 で実証した E2E 実行環境を使い、smoke red の根本原因（label/input 関連付け欠如）を最小修正して green 化し、E2E を「動く資産」にすること。

## 3. 実施内容（2段階）

### X-03（第1段・WIP コミット `524f7c7`）

- `apps/web/app/login/page.tsx`: 「メールアドレス」「パスワード」の label に `htmlFor`、対応する input に `id` を付与（+6/-2行。name/type/autoComplete/value/onChange/required 等の挙動は不変）。
- 結果: smoke **0/11 → 10/11 passed**。`getByLabel` 問題は完全解消（全テストがログイン通過）。
- 残る1本の失敗は別原因（下記）と判明したため、規定どおり成功扱いせず停止し、人間承認を経て X-03b へ。

### X-03b（第2段・本コミット）

- `apps/web/tests/e2e/smoke.spec.ts` 42行目の1箇所のみ: `getByText('地図CRM')` → `getByRole('heading', { name: '地図CRM' })`。
- 理由: `/leadmap/map` には「地図CRM」がナビリンクと見出しの2要素にあり、Playwright strict mode violation（曖昧一致）となっていた。アプリは正常表示であり、テストセレクタ側の明確化が妥当（X-02 の教訓とは逆に、今回はテスト側に非があるケース）。
- 結果: smoke **11/11 passed（9.1s）**。

## 4. 検証結果（証拠）

| 検証 | 結果 |
|---|---|
| `pnpm test` | green（23ファイル・211テスト） |
| `pnpm typecheck` | green（exit 0） |
| `pnpm lint` | green |
| `pnpm build` | green（本番ビルド） |
| DOM 実測 | `label for="email"`↔`input id="email"`・`for="password"`↔`id="password"` 成立を curl で確認 |
| **smoke.spec.ts** | **11 passed / 0 failed（11/11 green・9.1s）** — CEOログイン/顧客/カンバン/在庫/LeadMap一覧+地図/キャンペーン/AI分析/議事録/承認/監査ログ/ナレッジ検索 |

実行条件: ローカル Postgres（localhost・値非表示で事前検証）＋ `migrate deploy`（pending 0）＋ seed ＋ 本番ビルド `pnpm start`（/login 200 確認後）＋ プリインストール Chromium（`PLAYWRIGHT_BROWSERS_PATH`・バージョンシム・**playwright install/DL 不使用**）。テスト後にサーバ・Postgres とも停止済み。

## 5. 変更ファイル（コード）

| ファイル | 内容 | コミット |
|---|---|---|
| `apps/web/app/login/page.tsx` | label関連付け（htmlFor/id 2組） | `524f7c7`（X-03 WIP） |
| `apps/web/tests/e2e/smoke.spec.ts` | 地図CRMセレクタ1行の明確化 | 本コミット（X-03b） |

## 6. 変更していないもの

- playwright.config.ts・vitest.config.ts・他のテスト行・他画面・UI文言: 無変更。
- DB schema・migration 作成・認証・RBAC・課金・決済・外部送信・package/lock・dependency: **一切なし**。
- 本番DB・本番環境: 接触ゼロ（Prisma は `migrate deploy` をローカル localhost DB のみ・pending 0）。

## 7. 残リスク

- バージョンシム（/opt/pw-browsers 内 symlink）はコンテナ揮発領域のため、セッション再作成時は doc27 §9 手順で再構築が必要。
- smoke green は「主要動線が開通している」ことの確認であり、詳細な業務ロジックの検証は unit / integration テストの領域。
- 残り11本のドメイン別 E2E スペックは未実行（段階実行は Phase X-04 候補）。

## 8. 判定

- **GO — E2E smoke 11/11 green**。E2E は「書いてあるだけのテスト」から「動く回帰ゲート」になった。
- 次候補: **Phase X-04**（本番スモーク定型化・残り E2E 段階実行）または **Phase X-RM-03**（Phase 2 入口条件の最終確定。入口条件の1つ「smoke green」は本フェーズで充足）。選択は人間判断・別承認。main 反映は push 専用の別承認。
