# Codex V74 Post-Release Independent Re-audit

- 監査日時: 2026-07-13 05:51 JST
- 監査者: Codex independent QA
- 対象: PR #32 RC、app mainへの統合、PR #23/#33 C22統合
- 最新app main: `7efb22b43b781e485a4759fab4145792eeabe92e`
- 判定: **POST_RELEASE_CHANGES_REQUIRED / Phase 3・3.5 completion HOLD**
- 新規確認: P2 3件、Critical確認済みとは主張しない

## 1. 固定した系譜

| 対象 | 固定SHA | tree | 確認結果 |
|---|---|---|---|
| PR #32 RC | `8d3ae36f9f036b4125d029c5b7a55cbbc3d04685` | `d4d4ba6b6c20bc62fae55647cdadc9228526454a` | 親は`ba01244`と`d209d5d`、PR #18更新headとbyte一致 |
| Phase 3/C21 main merge | `71e0b4267b66e4213b455a87f9c4641a188deb70` | `d4d4ba6b6c20bc62fae55647cdadc9228526454a` | 旧mainとRCの通常merge、RCとbyte一致 |
| C22 fixed head | `2884949ceb7a018fa7dc4a27ae5d04b2f829a965` | `97c4f7f74ee5c4275543a3b4e6e43e41a82ee0e4` | P2修正候補とCI証拠は存在するが追加P2 2件 |
| PR #33 integration head | `0d6de21b2e08792115737e0b7729525bdffad0e9` | `9206c360d121db6a7a2297ab1a6590eb12dffa0f` | 親は`71e0b426`と`2884949`、C21 E2E競合はRC側blobを保持 |
| 現行app main | `7efb22b43b781e485a4759fab4145792eeabe92e` | `9206c360d121db6a7a2297ab1a6590eb12dffa0f` | PR #33 integration treeとbyte一致 |

旧main `ffd586b8`、RC `8d3ae36`、C22 `2884949`はすべて現行mainのancestorであり、確認範囲ではforce-pushによる履歴欠損を認めない。

## 2. PR #32 Release Candidate証拠

- exact-head CI run `29205251769`: stage1 / stage3_e2e success。
- unit `472 passed / 0 failed`、E2E `151 passed / 0 failed`、typecheck / lint / build / safety success。
- artifact `8263616002`、25 PNG、digest `sha256:2b2776f6295321d03ebafbb1568ed7d00120913e2997c40ac51806e6f4fa486e`。
- 25 PNGを独立目視し、320/375/768/1440 topbar、67導線NAV、AI社員一覧・詳細・3D、プロフィール、canvasに空画面・重大な重なりを認めなかった。
- CI screenshotのbuild badgeはCI環境由来の`unknown`であり、Vercel SHA証拠には使わない。人間はPreviewで`8d3ae36`を照合済み（comment `4952491948`）。
- owner申告ではmain merge、Production Ready、安全側envを確認済み（comments `4952588468`、`4952595476`）。CodexはProductionの変更操作や機能操作をしていない。

## 3. Post-release P2

### P2-1: Control Towerの財務機密閲覧ログが過小分類

固定head `8d3ae36`と現行mainの`apps/web/lib/domains/growth/control-tower.ts:96-108`で、低粗利・未回収リスク等の財務シグナルを読んだ`confidential_view`が`label=INTERNAL`として保存される。

`FINANCIAL_CONFIDENTIAL`を基準に抽出する監査・報告からControl Tower閲覧が漏れるため、財務表示あり経路だけを`FINANCIAL_CONFIDENTIAL`へ修正し、redacted経路の`read + INTERNAL`を維持する必要がある。GitHub change request: PR #32 comment `4952704653`。

### P2-2: C22候補外顧客へ直接previewできる

現行mainの`/growth/referral?preview=<customerId>`は`classified`全体から検索し、`result.eligible`を確認しない。inactive、成約なし等の同tenant・可視顧客でも、最初の50件に含まれれば候補一覧外からFake下書きを生成できる。

preview対象を`candidates`または`eligible=true`へ限定し、候補外・別tenant・不可視を同一notfoundにする必要がある。

### P2-3: AIのC22一覧閲覧を人間として監査する

C22はAIロールのread-only分析閲覧を許可する一方、一覧DataAccessLogを`actorType=user`固定で書く。管理画面・集計でAI閲覧が人間閲覧へ混入するため、`user.isAi`から`ai_agent/user`を分離する必要がある。

P2-2/P2-3のGitHub change request: PR #23 comment `4952715449`、PR #33 post-merge HOLD comment `4952715510`。

## 4. C22の既存証拠と限界

- source fixed head CI run `29204903544`: unit 483、E2E 155、failed 0、sealed envはFake LLM / external send false。
- artifact `8263517090`、digest `sha256:d07c61fa1908048b9ff2dbeab79ae7d1d505496d1139939aa44c9e78f6245882`。
- 旧change requestの顧客名取得段階、別tenant実在ID、metadata-only一覧監査はテスト済み。
- 追加P2 2件は上記155 E2Eの受入範囲外であり、CI greenだけでは否定できない。
- PR #33 integration headと現行mainにはpull-request Actions runがなく、GitHub commit statusはVercel successのみ。source headのCIをmerge headのexact-head CIへ格上げしない。

## 5. Phase判定

| workstream | 現在地 | 判定 |
|---|---|---|
| `P3-GROWTH` | RCとmain統合、Human Preview、Vercel success | Control Tower監査label P2によりcompletion HOLD |
| `P3-Q2C` | mainへ既存限定機能は統合 | V74既報のRBAC・原子性・並行採番Gapを維持 |
| `P35-CHANNELS` | C21とC22がmainへ統合 | C22追加P2 2件、C19別lane HOLDによりcompletion HOLD |
| `P4-WORKFORCE` | mainへ未統合、独立lane | Human Gate限定証拠、Control Plane/Workflow/実queue Gapを維持 |

## 6. 再開条件

1. Claude専用fix-forward laneでP2 3件を修正し、固定SHAをfreezeする。
2. Control Towerは財務あり/なし両経路のDataAccessLog実値、C22は候補外実在IDとAI/human actorTypeを否定・肯定テストする。
3. 対象test、全unit、typecheck、lint、build、safety、full E2E、exact-head CI/artifactを取得する。
4. Codexが固定SHAを再監査し、blocking P2 0を確認する。
5. 新headをmain/Productionへ反映する操作は改めて人間Gateとする。既存ログのbackfillは自動実行しない。

## 7. 安全境界

Codexはapp code、main、Production、DB、migration、Secrets、実LLM、外部送信、広告変更、課金、支払へ触れていない。rollbackも行っていない。今回の結論は限定監査の`CHANGES_REQUIRED`であり、「脆弱性ゼロ」「完全無欠」「全Phase完成」を意味しない。
