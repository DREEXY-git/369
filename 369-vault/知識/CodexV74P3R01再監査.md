# Codex V74 P3-R01 Independent Re-audit

- 監査日時: 2026-07-13 JST
- 対象PR: #18
- 固定head: `d209d5da35fc24ac0c101145126d55850c001f93`
- tree: `d4d4ba6b6c20bc62fae55647cdadc9228526454a`
- 判定: `P3-R01 SCOPE PASS / P3 MACHINE COMPLETE未到達`
- GitHub判定: comment `4952187587`

## 1. 差分とownership

- 親はPR #18旧固定head `fa04e7405cf3ab6cb56f329804fc778dde6470b0`。
- 追加commitは1件、変更は3ファイルだけ。
- `topbar.tsx`と`release_regression.spec.ts`はPR #27 `bc8fbef`の同名ファイルとbyte一致。
- 3つ目はC21 approve/reject E2Eの待機条件修正。Phase 4、C19、C22、Control Plane、Workflowの変更は混入していない。

## 2. C21 race修正

以前の`waitForURL('/approvals')`は、クリック前から同じURLにいるため決定transactionのcommitを待たずに完了していた。後続の`goto('/marketing/content')`が決定を追い越し、reject経路が不安定になった。

固定headは対象PENDING itemのtest idが0件になるまで待つ。これは決定後の再取得結果を待つ条件で、timeout延長、retry、test削除、assert弱体化ではない。approve/reject両経路へ同じ条件を適用した。

## 3. CI

- run: `29202591101`
- checkout: `d209d5da35fc24ac0c101145126d55850c001f93`
- unit: 472 / 472
- E2E: 151 / 151
- failed: 0
- typecheck、lint、build、safety: success
- skip/only/fixme追加: 0
- sealed env: Fake LLM、`EXTERNAL_SEND_ENABLED=false`

CI本文でC21 approve/reject、release regression 5件を個別に確認した。

## 4. artifact

- artifact: `8262874173`
- name: `e2e-screenshots-29202591101`
- PNG: 25 files
- ZIP SHA-256: `e7ee808eff7e4c39c5bc813b12e45dc8e9d04c594a2e3830c72b681e8bfa0934`

25画像を全件目視した。320、375、768、1280、1440pxのtopbarでBell、avatar、logout、状態/テーマ表示に横切れ・重なりは見当たらない。desktop/mobile NAV全高、AI社員一覧・詳細・3D・profileは非blankで、重大な文字切れや空画面は見当たらない。AI Office画像は縮小pixel実測でも非単色だった。

## 5. 証拠境界

ClaudeはC21対象を22反復 x 2 worker = 44/44 greenと報告した。Codexはこのローカル実行を直接再実行していないため、`CLAUDE_LOCAL_VERIFIED`として扱う。Codexが独立確認したのは、test弱体化0、待機条件の根本修正、exact-head CI 1回、全artifactである。

## 6. 判定と次段

P3-R01の限定目的はPASS。次は`P3-R05`としてPR #14と更新PR #18だけで後継RCを作る。別lane混入0、ancestry、duplicate commit、conflict、exact-head CI/artifact、Vercel gitCommitShaを再監査する。

P3-GROWTH machine complete、Human 768 Preview、app main、ProductionはまだHOLD。`CODEX_P3_GROWTH_MACHINE_COMPLETE_V74`は投稿しない。
