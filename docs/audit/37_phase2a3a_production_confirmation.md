# 37. Phase 2-A-3a 本番確認記録 — Company Brain read-only 可視化（利用者実測・判定 HOLD）

> docs-only / production confirmation record。**コード・DB・schema・migration の変更は一切なし。**
> フェーズ: Phase 2-A-3a-PROD / 現在位置は git refs を正とする。
> **判定: HOLD** — 既存画面は全て正常だが、Company Brain 導線（ナビ・2画面）が本番で未確認/NG のため、GO とせず原因調査へ送る。

---

## 1. 非エンジニア向け要約

- Phase 2-A-3a で main に反映した **Company Brain read-only 可視化（commit `9533488`）**の本番確認を、あなた（利用者）の実測に基づいて記録します。
- 良い知らせ: **Vercel は Ready / 最新コミット `9533488`・ログイン・ダッシュボード・既存の主要画面はすべて正常**。今回の変更が既存機能を壊していないことは確認できました。
- 問題: **「会社の頭脳」のナビリンクと `/brain/policies`・`/brain/catalog` の2画面が本番で未確認/NG** でした。
- **判定: HOLD** — 本番確認は GO にできません。ただし壊れたのではなく「新しい導線が見えていない」状態です。次は修正ではなく **read-only の原因調査**から始めます。

## 2. 本番確認記録（commit `9533488`・利用者実測）

**本確認は利用者の Vercel 画面・本番画面の実測によるものであり、AI が本番接続確認したものではない。** AI は本番DB・本番環境に直接触っていない。

| 項目 | 利用者実測値 | 判定 |
|---|---|---|
| Vercel build / deploy | Ready | GO |
| Vercel latest commit | `9533488` | GO |
| 本番ログイン画面 | 正常 | GO |
| 本番ダッシュボード | 正常 | GO |
| 本番 既存主要画面（顧客・LeadMap 等） | 正常 | GO |
| ナビ「会社の頭脳」リンク | **本番未確認 / NG** | **NG** |
| `/brain/policies`（会社方針一覧） | **NG** | **NG** |
| `/brain/catalog`（商品カタログ一覧） | **NG** | **NG** |
| 作成・編集・削除ボタンが無いことの確認 | **到達不可のため未確認** | **NG** |
| **総合判定** | | **HOLD** |

- 補足: 本番の一覧は seed が本番では自動実行されないため、**一覧が空でも正常**（空＝異常ではない）。今回の NG は「空だった」ではなく「導線・画面に到達できなかった」ことによる。

## 3. ローカル実測による原因候補の絞り込み（read-only・repo側の証拠）

HOLD 記録にあたり、リポジトリ側だけで確認できる事実を read-only で実測した（本番には接続していない）:

| # | 実測 | 結果 |
|---|---|---|
| 1 | `git show 9533488 --stat` | `apps/web/components/shell/nav.ts`（+2行）と `brain/policies`・`brain/catalog` の2画面が**コミットに含まれる** |
| 2 | `git show origin/main:apps/web/components/shell/nav.ts` | 「会社の頭脳」（`/brain/policies`）の行が **origin/main に存在する**（146行目） |
| 3 | sidebar.tsx / mobile-nav.tsx の描画ロジック | **権限フィルタ・feature flag・条件分岐なし**（NAV 定義を無条件で全件描画。`hidden` はレスポンシブCSSクラスのみ） |
| 4 | ローカル E2E（Phase 2-A-3a 実装時の実測） | `/brain/policies` はローカル本番ビルドで smoke green（doc36 §3） |

この結果、原因候補は以下に**絞られる**（すべて仮説・本番側の実測が必要）:

| 可能性 | 内容 | repo側の証拠との整合 |
|---|---|---|
| ⭐ 本番ドメインが旧デプロイを指している | Vercel 上は `9533488` のデプロイが Ready でも、Production ドメイン（エイリアス）が旧デプロイに向いたまま | コードは main に入っているので最有力候補の一つ |
| ⭐ ブラウザ/CDN キャッシュ | 旧ビルドの JS/HTML がキャッシュされ、新ナビが出ない | 同上 |
| 確認手順 | サイドバーの「会議・ナレッジ」グループ内の末尾にあるため見落とし・モバイル表示ではドロワーを開く必要 | ナビは無条件描画なので「あるのに見えにくい」可能性 |
| `/brain/*` 直アクセス時の症状が未特定 | NG の内訳（404 / エラー画面 / 権限なし表示 / 真っ白）が不明 | 症状で原因を切り分けられるため次回調査の最重要情報 |
| ~~コード欠落 / deployment差異~~ | ~~期待した変更が commit に無い~~ | **否定**（実測1・2でコミットと origin/main に存在） |
| ~~feature flag / ナビの権限フィルタ~~ | ~~本番でフラグOFF・権限で非表示~~ | **否定**（実測3でナビは無条件描画。RBACが影響するのはページ内の表示内容のみで、リンク自体は消えない） |

## 4. 発生していないこと

コード変更・schema / migration 変更・RBAC / labels 変更・本番DB操作（AIによる）・Prisma migrate 手動実行・実メール送信・Webhook 実送信・外部送信・課金・決済・Vercel 環境変数変更・worker/queue/outbox dispatch 手動実行: **すべてなし**（本記録は docs-only）。

## 5. 判定と次アクション

- **判定: HOLD（Phase 2-A-3a 本番確認・2026-07-03・利用者実測）。** 既存画面の無回帰は確認済み。Company Brain 導線の本番到達性が未確認のため GO にしない。
- CURRENT_STATE の「最新の本番確認GO済みプロダクト基準」は **Phase 2-A-2 / `ca18450` のまま更新しない**。
- 次アクション（優先順）:
  1. **read-only 原因調査**（別ミッション）: 本番で `/brain/policies` を直接開いた際の症状特定（404/権限box/空一覧/エラー）・Vercel Production ドメインが指す deployment の確認・ハードリロード後のナビ再確認。**DB・認証・RBAC・本番環境・Vercel 環境変数は変更しない。**
  2. 原因特定後に最小修正 or 再確認 → 本番確認の再実測 → GO 記録（doc38 候補）。
- **Phase 2-A-3b（作成・編集・Server Action・writeAudit/writeDataAccess）は未着手・別承認**。本 HOLD が解けるまで進まない。
- 参照: 実装=doc36／schema=doc34／前回本番確認=doc35＋doc14 §38／本書=doc14 §39。
