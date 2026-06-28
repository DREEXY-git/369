# RELEASE CHECKLIST — IKEZAKI OS

> push と本番反映を「安全に・迷わず・抜け漏れなく」進めるためのチェックリスト。
> 非エンジニアの方でも判断できるよう平易に書く。Phase 1-15〜1-19 の運用を反映。

## 1. 目的
コード/ドキュメントの変更を `origin/main` に反映し、本番（Vercel）へ安全に届けるまでの標準手順を定める。

## 2. このチェックリストで防ぐ事故
- 意図しないファイル/秘密情報/migration の混入
- 検証せずに push してビルド/本番を壊す
- 「push 完了」を「本番で動作確認済み」と誤認する
- 権限の抜け穴（UI で隠れているが直叩き可能 等）の見落とし
- 意図しない実メール送信・本番DB破壊

## 3. push 前確認
1. `./scripts/verify.sh` が **全 green**（db:generate / typecheck / lint / test / build）。
2. 統合テストが関係する変更なら `pnpm --filter @hokko/db test:integration`（ローカル Postgres・`tasks/BLOCKERS.md` B-02）。
3. `git status --short` が **意図した変更のみ**。
4. `git diff --stat origin/main..HEAD` の変更ファイルが**想定どおり**。
5. `git diff --check origin/main..HEAD` が clean（空白/競合マーカーなし）。
6. `package.json` / `pnpm-lock.yaml` / `migration` の差分が**意図したものだけ**（無関係なら混入禁止）。
7. secret / `.env` 値 / DB接続文字列 / 顧客PII が差分に**入っていない**。
8. HEAD と origin/main の関係を確認：
   - `git merge-base --is-ancestor origin/main HEAD` → **origin/main は HEAD の祖先**（= fast-forward 可能）。
   - `git merge-base --is-ancestor HEAD origin/main` → **HEAD はまだ含まれていない**（= push する意味がある）。

## 4. push してよい条件（すべて満たす）
- 人間の **push 承認**がある（`PUSH_APPROVAL: YES` 等）。
- HEAD / origin/main が想定どおりの commit。
- fast-forward 可能（force 不要）。
- 作業ツリー clean。
- §3 の検証がすべて green。
- 差分が意図した範囲のみ。

## 5. push してはいけない条件（1つでも該当なら停止）
- push 承認がない / 承認文字列が正確でない。
- 作業ツリーが dirty。
- origin/main が想定外に進んでいる（要 fetch 再確認）。
- force push が必要（= 履歴改変。原則禁止）。
- 想定外ファイル / migration / package / lock / secret が差分に含まれる。
- 検証が失敗している。

## 6. push コマンド標準形
```
git push origin HEAD:main
```
- **force push 禁止**。push 先は必ず明示（`HEAD:main`）。

## 7. push 後確認
```
git fetch origin --prune
git rev-parse --short HEAD; git rev-parse --short origin/main   # 一致を確認
git merge-base --is-ancestor HEAD origin/main && echo included   # HEAD が origin/main に含まれる
git status --short                                                # clean
```

## 8. 本番確認が必要な場合
- **コード（apps/** や packages/**）の挙動が変わる変更**を push したとき。
- → `docs/release/PROD_VERIFICATION_FORM.md` を人間がブラウザ/Vercel で記入。
- ⚠️ 本サンドボックス（AI）からは本番URL/Vercel に到達不可（egress 403）。**本番確認は人間がブラウザで実施**する。

## 9. 本番確認が不要な場合
- **docs / tasks / scripts のみ**の変更（コード挙動が変わらない）。
- ただし Vercel が再デプロイしても**機能挙動は同一**であることを確認したうえで「本番確認不要」と判断する。

## 10. 本番確認フォームの使い方
- `PROD_VERIFICATION_FORM.md` をコピーし、**実際に見た値だけ**を記入して貼る。
- 空欄禁止。分からない項目は `未確認: 理由`。
- 記入後、レビュー担当（人間）が GO / HOLD / NG を判定。

## 11. GO / HOLD / NG の考え方
- **GO**: 必須項目がすべて実測値で OK。
- **HOLD**: 未確認がある / 値が揃わない / commit や Status が確認できない。→ 追加確認。
- **NG**: 期待と違う（commit 不一致・Build失敗・権限漏れ・意図しない実送信・PII漏えい 等）。→ 原因切り分け。

## 12. rollback 方針
- **push 済み**を戻す: 原則 `git revert <commit>` →（承認後）push（履歴改変を避ける）。
- **ローカルのみ**を戻す: `git reset --hard <安全な commit>`。
- **force push / reset での remote 巻き戻しは原則禁止**。

## 13. 禁止事項
- 本番DB直接操作 / Vercel 環境変数変更 / 実メール送信（`EXTERNAL_SEND_ENABLED=true` での送信）
- secret / APIキー / `.env` 値 / DB接続文字列 / 顧客PII の表示・貼り付け
- force push / 自動 merge / TLS 検証無効化 / proxy 迂回 / 本番DB接続

## 14. 非エンジニア向けの確認ポイント
- 「push 完了 ≠ 本番で動作確認済み」。コード変更なら必ずブラウザ確認。
- 確認フォームは**実際に見た値**を書く。「多分OK」は書かない。
- 数字（金額）・顧客名・メール・secret は貼らない。スクショは隠す。
- 「送信/記録」ボタンは `EXTERNAL_SEND_ENABLED=false` と確認できたときだけ押す。

## 15. Claude Code に貼り返すべき情報
- `git push` の結果 / `git rev-parse --short HEAD` / `origin/main` / `git log --oneline -3 origin/main` / `git status --short`
- `./scripts/verify.sh` の結果（または各検証結果）
- 本番確認した場合は `PROD_VERIFICATION_FORM.md` の記入済みフォーム

## 16. Phase 1-15〜1-19 で学んだ注意点
- 「UI で見えない＝安全」ではない。**Server Action は直叩きされても安全か**を必ず見る。
- finance 機密（請求・売掛・入金・督促・承認一覧・朝報）は `finance:read` / ABAC / 承認権限で server 側ガード。
- 一覧・作成・朝報など「俯瞰画面」が素通しになりがち。詳細だけでなく**一覧/入口も**確認。
- AI 生成（朝報等）に財務値を渡すと画面 redact をすり抜ける。**AI 入力前に redact**。
- 0 を実値と誤解させない（非権限者には固定文/非表示）。
- 督促・外部送信は**必ず承認ゲート＋二重実行防止**、`EXTERNAL_SEND_ENABLED=false` で logged のみ、送信だけで Receivable を collected にしない。
