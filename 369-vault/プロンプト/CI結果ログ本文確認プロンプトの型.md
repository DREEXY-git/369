# CI結果ログ本文確認プロンプトの型

> 目次に戻る → [[index]] ／ 関連 → [[push専用プロンプトの型]] ・ [[CIStage3E2E失敗修復と72Green化]] ・ [[安全第一の哲学]]

## 用途

push 後の CI を **read-only** で確認させる型。ポイントは「**success という結論だけで断定しない**」こと。ジョブの conclusion が success でも、**ログ本文**でテスト件数・封印 env・対象 spec の green を直接確認して初めて「緑」と記録する。

## 骨子

```
# 0. 目的
CI run <run-id> を read-only で確認する。rerun・cancel・実装・commit はしない。

# 確認手順
1. run の status=completed・conclusion=success・head_sha=<期待SHA> を確認
2. ジョブ一覧: stage1 success・stage3_e2e success・
   「Upload Playwright report (on failure)」が skipped（=失敗なしの証跡）
3. Run E2E の**ログ本文**を取得し、次を直接確認:
   - `Running <N> tests using <W> workers` → `<N> passed`（failed 0）
   - 封印 env: LLM_PROVIDER=fake / MAIL_PROVIDER=log / EXTERNAL_SEND_ENABLED=false
   - 今回追加・変更した spec の各テスト行が ✓
4. 期待件数 <N> と実測が違えば、差分の理由を特定してから記録する
   （見込み値と確定値がズレた場合は追記主義で整理。→ 76→77 の例）

# 記録
run ID・run number・head_sha・件数・env・対象 spec の実測を docs に正本化。
成功しても「successだから緑」とは書かず、ログ本文の引用を証跡として残す。
```

## 効果

- 「skip されて件数が減っていた」「env が想定と違った」等の見かけ緑を検出できる。
- 記録が実測引用ベースになるので、後から誰でも検証できる（証拠主義）。
