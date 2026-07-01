# push専用プロンプトの型

> 目次に戻る → [[index]] ／ 関連 → [[安全第一の哲学]] ・ [[フェーズ実装プロンプトの型]]

## 用途

すでにローカルにあるコミットを、**新規実装・編集・追加コミットを一切せず**、origin へ **fast-forward で安全に push だけ**行わせる型。

## 骨子

```
# 0. 目的
未pushコミット（列挙: <sha1>, <sha2>, ...）を origin/main へ fast-forward push する。
push 専用フェーズ。新規実装・編集・追加コミットはしない。

# 承認フラグ
PUSH_ALLOWED: YES / FORCE_PUSH_ALLOWED: NO / FILE_CHANGES_ALLOWED: NONE
EXPECTED_LOCAL_HEAD: <sha>
EXPECTED_REMOTE_MAIN: <sha>

# push前検査（必須）
- git status --short が空（clean）
- HEAD / origin/main / branch / HEAD subject が期待どおり
- origin/main が HEAD の祖先（fast-forward 可能）
- 未pushコミットが列挙した SHA と完全一致
- 差分ファイルが期待リストと完全一致（forbidden ファイルなし）
- git diff --check clean
- secret 実値スキャン（禁止文への反応は false positive として triage）

# 停止条件
上記のいずれか不一致なら push せず停止して報告。

# push
すべてOKなら: git push origin HEAD:main
禁止: git push -u origin <branch> / --force / --force-with-lease / rebase / reset / amend

# push後確認
git fetch → origin/main == HEAD == 期待SHA を確認。各コミットが included か確認。
```

## コツ

- push は **`git push origin HEAD:main`**（origin/main を進める）を明示。作業ブランチ push と混同しない。
- **force push は絶対禁止。** fast-forward できないなら止めて報告。
- 差分の「期待ファイルと完全一致」チェックで、混入を機械的に弾く。
- secret スキャンが「secret を表示しない」等の**禁止文**に反応したら、実クレデンシャル値スキャンで裏を取り **false positive** と明記。

## ロールバック

- 戻すときは `git revert --no-edit <sha>...`（前進的取り消し）→ 検証 → push。
- 本番 main への `reset` / force push はしない。

## 関連ノート

- [[フェーズ実装プロンプトの型]] — push対象のコミットを作るフェーズ。
- [[安全第一の哲学]] — push の作法の背景。
