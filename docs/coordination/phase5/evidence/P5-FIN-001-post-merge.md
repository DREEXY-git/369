# P5-FIN-001 / FIN-01 — Post-Merge Evidence

このファイルは、Phase 5 最初の製品実装 P5-FIN-001 / FIN-01 が、人間承認・独立監査・CI・main統合を経て完了した事実を固定する post-merge evidence である。新しい承認、製品実装、Phase分割を行う文書ではない。

## 1. 対象

- repository: `DREEXY-git/369`
- pull request: `#131`
- Task Packet: `docs/coordination/phase5/P5-FIN-001-canonical-obligation-identity.md`
- approved Packet revision: `3`
- approved Packet SHA-256: `a334a1673a2439a35ee1db8f1fb8ba74c72c7ad99fa557e304d52f646b03a5a0`
- approved fixed head（実装前）: `9d88e730fa1db6f45817e2051592117fede90e6c`

## 2. Human Approval Event

- GitHub comment ID: `5065412359`
- URL: `https://github.com/DREEXY-git/369/pull/131#issuecomment-5065412359`
- author: `DREEXY-git`（User）
- created_at: `2026-07-24T02:02:13Z`
- updated_at: `2026-07-24T02:02:13Z`
- exact comment body SHA-256: `744aa42856cadc9aeca674c2dbb3a7e29c141f955d44a098245897df3f11d4e5`
- edited判定: `updated_at == created_at` のため未編集

## 3. 実装と統合

- implementation head（PR head）: `5e343e4de4840ddc8b40f0d9494d3f52dea31776`
- squash merge commit（main）: `177eb5fe7deaa9a0eab1c0642197741373024db6`
- merged_at: `2026-07-24T02:35:15Z`

mainへ入った変更は次の4ファイルだけ。

1. `packages/shared/src/cashflow-obligation.ts`
2. `packages/shared/src/__tests__/cashflow_obligation.test.ts`
3. `apps/web/lib/domains/finance/cashflow.ts`
4. `docs/coordination/phase5/P5-FIN-001-canonical-obligation-identity.md`

## 4. 検証

### PR exact-head

- GitHub Actions run: `30061431731`
- head: `5e343e4de4840ddc8b40f0d9494d3f52dea31776`
- stage1: success
- stage2_integration: success
- stage3_e2e: success
- release_gate: success

### main post-merge

- GitHub Actions run: `30062018058`
- head: `177eb5fe7deaa9a0eab1c0642197741373024db6`
- stage1: success
- stage2_integration: success
- stage3_e2e: success
- release_gate: success
- Vercel Production deployment: success
- deployment URL: `https://vercel.com/dreexy-gits-projects/369-web/3Bb686aX4DyibpimbY1uV2ZSjai4`

### 独立ローカル再検証

- target selector tests: `29/29` pass
- full unit tests: `662/662` pass
- typecheck: pass
- `git diff --check`: pass

## 5. 安全境界

- tenantを含むversioned canonical obligation identityを実装。
- 同額・同期限でも別Invoice／別POは別identity。
- source解決不能時は推測せずfail-closed／`coverageIncomplete`。
- DB／schema／migration／seed／backfill変更: 0
- workflow／PADN変更: 0
- Secrets参照・外部送信・実LLM・課金: 0
- FIN-02 producer正本化: 未着手
- FIN-03 reader統一: 未着手

## 6. 判定

`P5_FIN_001_FIN_01_DONE`

FIN-01は完了として再オープンしない。FIN-02／FIN-03は同じPhase 5内の別Task Packetとして、人間承認後に前進させる。Phase 5.1は作らない。
