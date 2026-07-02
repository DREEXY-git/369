# Phase2A2Schema変更

> 目次に戻る → [[index]] ／ 関連 → [[Phase2ACompanyBrain設計]] ・ [[安全第一の哲学]] ・ [[既知の落とし穴とローカル検証]]
> コード側の正: `369/docs/audit/34_phase2a2_schema_change.md`（Phase 2-A-2）

## 結論（1行）

**Phase 1-22 以来初の schema 変更を、設計図（doc33）どおり・破壊的操作ゼロ・全検証 green で完了。** Company Brain の2テーブル（会社方針・商品カタログ）が DB 定義に入った。

## 何を守ったか

- **migration は「作成のみ」**: 全文検査で DROP / RENAME / ALTER ゼロを確認。既存195モデル・既存データは無傷。
- **人間判断5点を1つも逸脱しない**: category は文字列・権限は knowledge 流用・在庫との接続はIDメモのみ・検索連携は後回し・テスト追加は次段判断。
- **smoke 11本 green 維持**: schema を変えても11画面の動線が壊れていないことを実測（回帰ゲートが早速仕事をした）。
- **AIの境界は変わらず**: 権限ファイル無変更のため、AIは新テーブルを「読める」が「書けない・消せない・持ち出せない」のまま。

## 学び（次の schema 変更のために）

1. **migrate コマンドの罠**: `pnpm --filter @hokko/db migrate -- --name X` は `--` が余分に渡り、**無言のプロンプト待ちでハング**する。正解は `exec dotenv -e ../../.env -- prisma migrate dev --name X`。「コマンドが静かに止まったら、引数の渡り方を疑う」。
2. **pkill の自己マッチ**: 詰まったプロセスを `pkill -f "コマンド名"` で掃除するとき、**自分のシェルのコマンド文字列にも同じ語が含まれていると自分ごと死ぬ**（exit 144）。プロセス掃除は単独実行で。
3. **migration の全文検査は安い保険**: CREATE だけのはずでも、grep 5本（DROP TABLE / DROP COLUMN / RENAME / ALTER / secret）で数秒。設計と生成物のズレを機械的に潰せる。
4. **「設計図どおりか」の突合が楽**: doc33 に列名まで書いてあったので、schema 追加は転記に近く、判断の余地（＝事故の余地）がほぼなかった。設計docsを先に固定する三段承認の効果。

## 次

- main push（別承認）→ **Phase 2-A-3**（seed・一覧UI・Server Action・監査・E2E経路追加）の承認判断。画面ができて初めて、非エンジニアが Company Brain を目で確認できる。

## 関連ノート

- [[Phase2ACompanyBrain設計]] — この変更の設計図（第一段）。
- [[既知の落とし穴とローカル検証]] — B-01/B-02 とローカルDB検証の手順。
- [[安全第一の哲学]] — 破壊的操作ゼロの検査という習慣。
