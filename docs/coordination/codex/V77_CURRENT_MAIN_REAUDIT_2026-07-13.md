# 369 OS Codex V77 最新main再監査

更新日: 2026-07-13 JST  
監査対象: `main` `a758d176155d2c27c7b50452e508e6e36d48c098`

## 結論

判定: **CHANGES_REQUIRED / RELEASE HOLD**

Claude側はPR #39、#40、#41を`main`へ統合済みで、作業は停止していない。PR #41はC19広告生成フォームのhydration mismatch/E2E flake修正として統合されている。ただし、PR単位のCI greenだけでは最新merge commitの直接CI証拠、Production、実Redis/worker、既存監査指摘の解消を完了とは扱わない。

## Git系譜とCI証拠

| 対象 | 固定SHA | 状態 | 証拠 |
|---|---|---|---|
| main | `a758d176155d2c27c7b50452e508e6e36d48c098` | PR #41統合済み | first-parent履歴 |
| Q2C hardening | `c9b4e0e094499dc3894a247f54b928aaeab4a8c6` | PR #39統合済み | run `29216133896`: unit 558 / E2E 213 |
| 領収書・売掛エイジング・督促 | `7a1889f1d10bdaf127a59a84e430ed1ca7dc5e6e` | PR #40統合済み | run `29220496382`: unit 568 / E2E 218 |
| C19 flake修正 | `691e0535210a15f1d7e10aec78e7706952138e16` | PR #41統合済み | run `29225344638`: unit 568 / E2E 218 |

PR #41のartifactは `8269628648`、digestは `2248e76be47d303b12e4701d55432c14919b9fbb094f978db007dfacfae70093`。これはPR headの証拠であり、Productionの証拠ではない。最新main SHAのPR-triggered workflow runが取得できなかったため、`MAIN_CI_VERIFIED`へ格上げしない。

## Phase 3 / Q2C

- 領収書: tenant境界、金額・状態遷移、承認境界、印刷/表示のPII最小化を最新mainで再確認する。
- 売掛エイジング: 集計のtenant境界、期限計算、権限、実測値と表示値の一致を確認する。
- 督促多段: 下書きと送信申請を分離し、外部送信は承認後のみ、空宛先・抑止・監査を確認する。

状態: PR head単位では `DRAFT_IMPLEMENTED` / `CI_VERIFIED`。Git系譜上のmergeは確認済みだが、`MAIN_CI_VERIFIED` / `PRODUCTION_VERIFIED`ではない。

## Phase 3.5 / C19

PR #41の統合によりhydration mismatchによるE2E flake修正はmain系譜へ入った。しかし、生成の冪等性、tenant境界、監査の原子性、外部作用ゼロ、実LLM/外部送信禁止は別の受入条件であり、flake解消だけで完了宣言しない。

最新mainの静的再監査で、継承候補を確認した。

- `apps/web/lib/domains/growth/control-tower.ts:104,118` に内部表示用ラベル `INTERNAL` が残る。表示根拠と分類の受入条件を格上げしない。
- `apps/web/app/(app)/growth/referral/page.tsx:96,128` に `actorType: 'user'` の監査記録がある。AI/人間の責任主体の仕様と整合するかClaude側で確認が必要。
- `apps/web/app/(app)/growth/referral/page.tsx:120` は `classified.find(...)` による候補選択経路で、tenant-scopedな取得・表示・監査をE2Eで確認する必要がある。

状態: `EVIDENCE_GAP / CHANGES_REQUIRED`。C19をrelease PASSへ格上げしない。

## Phase 4 / AI Workforce

承認、QUEUED/再開待ち、Control Plane、Execution Receipt、AI社員8名parityは、各PR headの証拠と最新mainの系譜を分けて管理する。Production queue/worker、BullMQ実Redis、stalled recovery、実LLM、外部送信、課金は未確認・未実施。

## 次のWIP

1. 最新main `a758d17`に対するCI/artifactの直接証拠を取得する。
2. PR #40のA/B/Cを最新mainで権限・tenant・承認・監査・状態遷移の独立E2Eで再確認する。
3. C19の冪等性・監査原子性を失敗注入、逐次retry、並行競合、cross-tenant fixtureで再確認する。
4. Vercel Previewはdeployment commit SHAを照合し、Production Verifiedへ格上げしない。

旧Codex PR #42は基準SHAが`3ec1527`であり、最新mainの監査記録としては使用しない。

## 制約

本監査では`apps/**`、`packages/**`、workflow、mainの変更、本番、DB migration/seed/reset、Secrets、実LLM、外部送信、課金に触れていない。「脆弱性ゼロ」「完全無欠」「全機能完成」は宣言しない。

