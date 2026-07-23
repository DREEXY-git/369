# Codex 依頼キュー（git経由ディスパッチ）

Claude Code → Codex への依頼を **git で流す**ための軽量キュー。
チャット本文ではなく **repo のこのフォルダが依頼の正本**（CLAUDE.md「正本は GitHub の commit・Draft PR・PR Conversation」）。

## あなた（人間）がやること — 各チャットに1回だけ

Codex の各チャット（A〜G）に、次の1行を貼るだけ：

> repo の `docs/coordination/codex-queue/` を見て、あなた宛（`chat:` が該当英字）の **`status: OPEN`** の依頼を上から処理して。結果は各依頼の `push-to:` の `codex/*` ブランチに push（docs-only レポート／必要なら draft）。**main マージ・本番・DB・Secrets・外部送信・課金には触れない。**

これで、そのチャット宛の未処理依頼を**まとめて**処理できます（タスクごとにプロンプトを貼り直す必要なし）。

## 仕組み（自動で回る部分）

1. Claude（私）が依頼を `YYYY-MM-DD-<chat>-<topic>.md` として commit → main に入る。
2. Codex が読み取り、処理して `codex/*` ブランチへ push。
3. Claude のセッション開始 hook ＋ 毎時スイープが `codex/*` を回収し、有効な実害指摘を修正 PR 化（緑で自動マージ）。
4. 取り込み済みは、その依頼ファイルの `status:` を `DONE` にし、反映 commit / PR を追記する。

## 依頼ファイルの形式

先頭に必ずメタを置く：

- `chat:` 担当チャット（A〜G）
- `type:` audit / design-review / test-adequacy
- `target:` 対象 commit / PR / パス
- `push-to:` 結果を push する `codex/*` ブランチ
- `status:` OPEN / DONE

本文は Codex への自己完結した指示（現コードを実際に読ませる・旧 verdict 流用禁止・実害のみ）。

## 人間ゲート（変えない）

main マージ・本番デプロイ・DB・Secrets・外部送信・課金・schema 変更・アーキ変更は、Codex も Claude も**人間承認まで実行しない**。Codex の出力は独立監査・設計レビューであり、正本コードへの反映は必ず Claude の PR ＋ CI 緑 ＋（重い領域は）人間承認を通す。

## 現在の担当割り（A〜G の目安）

- **B** = 会計・資金繰り（cashflow / finance-event）
- **C** = LeadMap（リード抽出・スコア・営業導線）
- **D** = 紹介・CRM 周辺 / テスト証拠
- **E** = M2 実運用準備
- **F** = テナント分離・RBAC
- **G** = AI 境界・機密表示（PII/権限）

（A は督促など送信コアの評価に使用。役割は固定ではなく、依頼の `chat:` を正とする。）
