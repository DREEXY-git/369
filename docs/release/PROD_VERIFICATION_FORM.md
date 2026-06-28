# PROD VERIFICATION FORM — IKEZAKI OS（汎用 本番確認フォーム）

> 本番（Vercel / `main`）へ反映したコミットが正しく動くかを、人間がブラウザ/Vercel で確認するための汎用フォーム。
> 必要な節をコピーして使う。Phase ごとの固有確認は「対象ページ/操作」を差し替える。

## 1. 使い方
1. push したコミット short SHA を控える（例: `abc1234`）。
2. 下の各節を**実際に見た値だけ**で埋める。
3. レビュー担当（人間）が GO / HOLD / NG を判定。
4. GO なら `docs/audit/14_release_stabilization.md` に確認記録を追記（別タスク）。

## 2. 空欄禁止ルール
- 空欄禁止。選択肢の羅列のまま残さない。
- 分からない/確認できない項目は `未確認: 理由` と書く（推測で OK にしない）。
- 該当しない項目は `N/A: 理由`。

## 3. secret / PII 禁止ルール
- 顧客名・メール・請求金額・社名・APIキー・環境変数の値・DB接続文字列・secret は**書かない/貼らない**。
- スクショは顧客情報・金額・secret を隠す。
- `EXTERNAL_SEND_ENABLED` は `false`/`true`/`未確認` のどれか（値以外の secret は書かない）。

## 4. Vercel確認フォーム
```
Production Branch:                （例: main）
Latest Production Deployment Commit:  （例: abc1234 ＝ 今回 push した SHA）
Status:                          （Ready / Building / Error）
Build:                           （成功 / 失敗）
Prisma migrate:                  （pendingなし・schema変更なし / migration適用成功 / エラー / 未確認）
Prisma engine error:             （なし / あり / 未確認）
Runtime error:                   （なし / あり / 未確認）
```
- commit が今回の SHA でない場合は数分待って再読み込み。それでも違えば HOLD。
- 赤い Error は secret を含まない範囲で1行要約。環境変数一覧スクショは貼らない。

## 5. 本番ブラウザ確認フォーム（基本）
```
/login 表示:                      （OK / NG）
OWNERログイン:                    （OK / NG）
対象ページ（今回の変更箇所）:      （URL/画面名）
OWNERでの主要操作結果:            （OK / NG / 内容）
表示崩れ・エラー:                  （なし / あり）
```

## 6. 外部送信安全確認（外部送信/メール系の変更時）
```
EXTERNAL_SEND_ENABLED:           （false / true / 未確認）
送信/記録実行結果:                （logged・記録のみ / 実送信 / 未実行: 理由）
意図しない実メール送信:           （なし / あり）
```
- 停止条件: `EXTERNAL_SEND_ENABLED=true` または `未確認` のときは「送信/記録」ボタンを**押さない**→ `未実行` と記録し HOLD。
- 実顧客宛に送信される恐れのある操作は禁止（検証用/デモ用データのみ）。

## 7. 権限確認フォーム（RBAC/ABAC 変更時）
```
OWNER（または権限保有ロール）で表示/操作:   （OK / NG）
STAFF（権限なしロール）で表示/操作:         （遮断 / 表示される=NG）
READ_ONLY で確認:                          （遮断 / 未確認: アカウントなし）
EXTERNAL系 で確認:                         （遮断 / 未確認: アカウントなし）
```
- STAFF 等の「見えてはいけない/操作できてはいけない」を**直接URL（直叩き相当）**でも確認。

## 8. finance系確認フォーム（請求・売掛・入金・会計・督促に触れる変更時）
```
finance権限者で finance画面表示:           （OK / NG）
非financeユーザーで finance情報が非表示:     （OK / NG）
請求/売掛/入金の状態が意図せず変わっていない: （OK / NG）
送信だけで Receivable が collected にならない: （OK / NG / N/A）
既存の請求一覧/作成/詳細/発行/外部送信/入金/督促 が壊れていない: （OK / NG）
```

## 9. AI / 朝報 / 承認一覧など 権限差分がある画面の確認欄
```
承認一覧 /approvals（承認者）:             （表示OK / NG）
承認一覧 /approvals（非承認者=STAFF）:      （AccessDenied / 表示される=NG）
AI朝報 /reports/morning（finance権限者）:   （財務指標・AI本文 表示OK / NG）
AI朝報（非financeユーザー）:               （財務非表示・固定安全文・0誤認なし / NG）
AI生成文に機密実値が混ざっていない:         （OK / NG）
```

## 10. GO / HOLD / NG 判定基準
- **GO**: Vercel が今回 commit / Ready / Build成功 / migrate・engine・runtime 異常なし、かつ対象機能が期待どおり、権限境界 OK、意図しない実送信なし、既存機能維持。必須項目に未確認なし。
- **HOLD**: 必須項目に未確認がある / commit・Status が確認できない / 権限者やデータが揃わない。
- **NG**: commit 不一致 / Build失敗 / runtime・engine error / 権限漏れ（非権限者に機密が見える/操作できる）/ 意図しない実送信 / secret・PII 漏えい / 既存機能が壊れている。

## 11. 貼り返しテンプレート（記入して貼る）
```
# 本番確認結果（対象commit: <SHA> / 対象: Phase x-y <概要>）
Production Branch:
Latest Production Deployment Commit:
Status:
Build:
Prisma migrate:
Prisma engine error:
Runtime error:

/login:
OWNERログイン:
対象ページ:
OWNERでの操作結果:
STAFFでの表示/拒否:
READ_ONLY/EXTERNAL確認:
EXTERNAL_SEND_ENABLED:
意図しない実メール送信:
状態（Receivable等）が意図せず変わっていない:
既存機能が壊れていない:
総合判定:        （GO / HOLD / NG）
気になった点:
```

---
注: これは汎用フォーム。直近の参考例として dunning / invoice / approvals / morning の確認項目を §8〜§9 に汎用化して含めている。対象フェーズに応じて「対象ページ/操作」を差し替えて使う。
