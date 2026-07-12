# 369 OS Codex V75 Post-Merge再監査

## 判定

- 判定: `CHANGES_REQUIRED / HOLD`
- 対象main: `c8dc1f41658d467eeb9476c3da095142f6684df5`
- PR #35 source head: `54dc1148555c51a8b41c34fabaed0f52825de92f`
- Production verified: `NO`
- Phase Matrix昇格: `NO`

この記録は、Claude CodeがC22、C19、Phase 4、AI Control Plane、Workflow Dry Runを統合した後のmainを、Codexが独立確認した結果である。コード所有境界を守り、アプリコード、workflow、main、Production、DB、Secretsは変更していない。

## GitHub・CI証拠

- PR #35: merged
- CI run `29209366462`: stage1 success、stage3_e2e success
- unit: 540 passed（44 test files）
- E2E: 203 passed、failed 0
- artifact: `8264847572`
- artifact digest: `28e2758e3e69073eb2e123594fdecdc27e5adcd0daecb79db1c6782d5fcc727e`
- CIのE2EはPR merge refで実行された証拠であり、post-merge main自身のProduction検証ではない

### Codex Draft PR #36 CI

- run `29210476847`: stage1 success、stage3_e2e failure
- E2E: 202 passed / 1 failed
- failing test: `apps/web/tests/e2e/ads_suggestion_bridge.spec.ts:87`
- failure: generate経路の最終件数期待値が一致しない
- playwright report artifact: `8265067898`
- screenshot artifact: `8265068017`
- screenshot digest: `1381ddb788f44aef26b87db7e5a3cda711ce3034a69ed03ef7d483843e98f2ed`

この失敗は以前のC19並行実行時序問題と同じ候補経路であっても、今回のexact runでは失敗である。再実行で緑になるまでCI証拠を格上げしない。

## Blocking findings

### P2-1: C22 direct previewのeligible境界

`apps/web/app/(app)/growth/referral/page.tsx:120` のdirect previewが、eligible候補だけの`candidates`ではなく全`classified`から対象を検索している。候補外の実在customerIdについて、preview、顧客名、DataAccessLogが発生しないことを対象外fixtureで証明する必要がある。

必要な修正証拠:

- red testで候補外実在IDを再現
- preview本文と顧客名が出ないこと
- preview用DataAccessLogが作成されないこと
- 別tenant・不可視ラベルと同じnot found相当になること

### P2-2: C22 DataAccessLogのactorType固定

同ファイル:96、128で`actorType: 'user'`が固定されている。`user.isAi`に応じて`user`と`ai_agent`等を正しく分離し、AIのpreview拒否と監査値を実値で検証する必要がある。

### P2-3: Control Tower財務機密label

`apps/web/lib/domains/growth/control-tower.ts:104` のfinance-visible `confidential_view`が`INTERNAL`で記録されている。財務機密は`FINANCIAL_CONFIDENTIAL`へ分離し、redacted readの`INTERNAL`は維持する必要がある。監査metadataに金額・顧客名・PIIを入れないことも再確認する。

### P2-4: Control Planeのrelated-agent tenant境界

`apps/web/lib/domains/ai-workforce/control-plane.ts:56-60`および`read-model.ts:49-54`はrunをtenantIdで取得するが、関連する`AIAgent`自身のtenant一致を同じ取得境界で強制していない。壊れたchild fixtureで、次を確認する必要がある。

- own-tenant run → foreign-tenant agent
- foreign-tenant run → own-tenant agent
- foreign sentinelが状態、件数、task、agent名、deep link、auditへ出ないこと
- 正常な同tenant値は表示されること

## 非blocking確認

- C19 migrationは`approvalStatus`列とtenant/status indexの加法的変更であることを確認した。
- C19の生成・申請・決定coreはtransaction、tenant scope、AI拒否、CAS、外部作用封印の構造を確認した。ただしCodex独立の実DB再実行はしていないため、Evidenceは`CI_VERIFIED`止まりとする。
- Phase 4 approveは`NEEDS_APPROVAL`から`QUEUED`へ遷移し、`SUCCEEDED`化・実queue再投入・外部作用を行わない構造を確認した。
- Control PlaneとWorkflowはread-only/fail-closedの実装意図を確認した。ただし上記related-agent境界の修正と、main post-mergeの独立再検証が必要である。
- BullMQ本番worker、stalled recovery、Production queueは未証明であり`EVIDENCE_GAP`を維持する。

## Phase Evidence

| Workstream | 現在のEvidence | 判定 |
|---|---|---|
| Phase 3 C22 | `MAIN_MERGED`だがpost-merge P2あり | `CHANGES_REQUIRED` |
| Phase 3 Growth Control Tower | `MAIN_MERGED`だが財務label P2あり | `CHANGES_REQUIRED` |
| Phase 3.5 C19 | `CI_VERIFIED`、Production証拠なし | `EVIDENCE_GAP` |
| Phase 3.5 C21 | 既存CI/Evidenceを継承、main統合後再監査待ち | `EVIDENCE_GAP` |
| Phase 4 Human Gate | `CI_VERIFIED`、worker/Production未証明 | `EVIDENCE_GAP` |
| Phase 4 Control Plane | `CI_VERIFIED`、related-agent境界修正待ち | `CHANGES_REQUIRED` |
| Phase 4 Workflow | `CI_VERIFIED`、main post-merge独立証拠待ち | `EVIDENCE_GAP` |

`HUMAN_PREVIEW_VERIFIED`、`MAIN_MERGED`、`PRODUCTION_VERIFIED`は、各証拠の対象SHA・環境が一致する場合だけ付与する。CI greenをProduction verifiedへ格上げしない。

## Claudeへの引継ぎ

GitHub PR #35 comment `4952902189` に`CODEX_CHANGE_REQUEST_V75_POST_MERGE`を固定SHA付きで投稿した。Claudeは専用fix-forward branchでred再現、最小修正、否定テスト、全電池、exact-head CI/artifact、freezeを行う。Codexは修正後headを再監査する。

## 人間Gate

Codexはapp mainへの追加merge、Production deploy、Production migration成否確認、Production worker/queue、Secrets/OAuth、実LLM、外部送信、課金を代行しない。
