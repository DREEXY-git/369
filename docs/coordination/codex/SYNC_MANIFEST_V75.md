# Codex V75 Sync Manifest

- app audit base: `c8dc1f41658d467eeb9476c3da095142f6684df5`
- PR #35 source: `54dc1148555c51a8b41c34fabaed0f52825de92f`
- Codex audit branch: `codex/v75-post-merge-reaudit`
- status: `CHANGES_REQUIRED / HOLD`
- Phase Matrix: not created because PASS conditions are not met
- app code changed by Codex: `0`
- workflow changed by Codex: `0`
- Production/main merge performed by Codex: `0`
- standalone vault main sync: pending after app-side evidence update
- secret-shaped text introduced by this WIP: `0`

## Evidence

- CI run `29209366462`: success
- unit `540 passed`
- E2E `203 passed / 0 failed`
- artifact `8264847572`
- artifact digest `28e2758e3e69073eb2e123594fdecdc27e5adcd0daecb79db1c6782d5fcc727e`
- GitHub change request comment: `4952902189`

## Draft PR #36 CI recheck

- run `29210476847`: stage1 success / stage3_e2e failure
- E2E `202 passed / 1 failed`
- failing test: `apps/web/tests/e2e/ads_suggestion_bridge.spec.ts:87`
- report artifact `8265067898`
- screenshot artifact `8265068017`
- screenshot digest `1381ddb788f44aef26b87db7e5a3cda711ce3034a69ed03ef7d483843e98f2ed`
- status remains `CHANGES_REQUIRED / HOLD`

## Sync rule

このmanifestは、監査対象SHA、判定、証拠環境を記録する。Claudeの修正後は新しい固定SHAで追補し、古いSHAの判定を再利用しない。
