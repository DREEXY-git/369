# 62. Phase 2-B 全体クローズ判定（Sales Playbook / Company Brain 営業領域・判定 GO）

> Phase 2-B-CLOSE（docs-only の全体クローズ判定・commit-only）。
> 範囲: Phase 2-B-ENTRY（doc50）〜 Phase 2-B-5-PROD（doc61）。型は Phase 2-A-CLOSE（doc48・doc14 §45）を踏襲（A案承認・doc14 §51 とセット）。
> 本書は既存記録の read-only 照合による判定であり、コード変更・DB操作・本番接触・push は行っていない。
> 各段の本番確認は利用者実測であり、**AI が本番接続確認したものではない**。

---

## 1. 非エンジニア向け要約

- **Phase 2-B（営業プレイブック）は正式完了です。判定: GO。**
- 完成したこと: 営業プレイブック（売り方の型）という会社の頭脳の3つ目の棚が、「**人間が書き、AIが読み、読んだら記録し、外部AIには出さない**」状態で本番稼働しました。
- 途中で2回つまずきましたが（ナビ表示・ログの見る場所）、どちらも**コード修正ゼロ**で解消し、経緯はすべて記録に残っています。**未解消HOLDなし**。
- 次の領域（Phase 2-C 相当: Case Study / Customer Pain 等）へは、**入口レビューからの別承認**で進みます。**Phase 2-C は別承認**です。

## 2. Phase 2-B の範囲と実績対応表（doc50〜doc61）

| 段 | 内容 | 記録 | 判定 |
|---|---|---|---|
| 2-B-ENTRY | 入口レビュー（3領域比較・Sales Playbook 推奨） | doc50 | READY / GO |
| 2-B-1 | SalesPlaybookEntry 設計（22フィールド・ID配列・入力ガイド方針） | doc51 | GO |
| 2-B-2 | schema / migration（CREATE TABLE＋INDEX 3本のみ・destructive 0） | doc52 | GO |
| 2-B-2-PROD | 本番確認（build成功=migration成功・画面なしが正常） | doc53 | GO |
| 2-B-3 | read-only 可視化（seed 6件・一覧・ナビ） | doc54 | GO |
| 2-B-3-PROD | 本番確認 → **ナビ表示のみNGで HOLD** | doc55 | HOLD（記録として保持） |
| 2-B-3-PROD-2 | 再実測 → **ハードリロードで解消・GO** | doc56 | GO（HOLD解消） |
| 2-B-4 | 人間書き込み（作成・編集・アーカイブ＋writeAudit） | doc57 | GO |
| 2-B-4-PROD | 本番確認（1周＋ラベル2択＋監査ログ3操作） | doc58 | GO |
| 2-B-5-ENTRY | AI参照の設計確認 | doc59 | READY / GO |
| 2-B-5 | AI参照の最小実装（3テーブル目追加・ai_reference） | doc60 | GO |
| 2-B-5-PROD | 本番確認（参照表示＋ai_reference ログ実測） | doc61 | GO |

- **本番確認GO済み基準: Phase 2-B-5 / `83d35bc`**（doc62 の記録 commit はプロダクト基準にしない）。

## 3. 完了条件20項目の照合表（すべて充足・証拠付き）

| # | 条件 | 結果 | 証拠 |
|---|---|---|---|
| 1 | 2-B-ENTRY が READY / GO | ✅ | doc50 |
| 2 | 2-B-1 設計 GO | ✅ | doc51 |
| 3 | 2-B-2 schema/migration GO | ✅ | doc52 |
| 4 | 2-B-2 本番確認 GO | ✅ | doc53・doc14 §46 |
| 5 | 2-B-3 read-only GO | ✅ | doc54 |
| 6 | 2-B-3 本番HOLD が doc56 で解消 | ✅ | doc55（HOLD）→doc56（GO）・doc14 §47→§48 |
| 7 | 2-B-4 書き込み GO | ✅ | doc57 |
| 8 | 2-B-4 本番確認 GO | ✅ | doc58・doc14 §49 |
| 9 | 2-B-5 設計 READY / GO | ✅ | doc59 |
| 10 | 2-B-5 実装 GO | ✅ | doc60 |
| 11 | 2-B-5 本番確認 GO | ✅ | doc61・doc14 §50 |
| 12 | GO済み基準 = Phase 2-B-5 / `83d35bc` | ✅ | CURRENT_STATE 実測 |
| 13 | **未解消HOLDなし** | ✅ | HOLD 2件とも解消記録あり（§4） |
| 14 | schema/seed/rbac/labels/package/lock の未承認変更なし | ✅ | git log 実測（schema 最終変更=2-B-2 `811b8c6`・seed=2-B-3 `a2bb2b6`・rbac/labels=初期のまま） |
| 15 | 外部送信・SNS投稿・口コミ投稿・顧客の声公開・ENSHiN OS外部発信なし | ✅ | 各doc の安全確認欄 |
| 16 | Phase 8 実課金に進んでいない | ✅ | 同上 |
| 17 | externalAiAllowed true UI なし | ✅ | HEAD コード grep 実測（入力欄 0件） |
| 18 | 高機密ラベル対応に進んでいない | ✅ | label 2択維持（doc57・doc60） |
| 19 | 3テーブルが「人間が書き・AIが読み・読んだら記録」 | ✅ | 会社方針/商品カタログ=2-A（doc41/43/47）・営業プレイブック=2-B（doc58/61） |
| 20 | 本番確認は利用者実測・AI非確認注記あり | ✅ | doc53/56/58/61 すべてに明記 |

## 4. 一度 HOLD になったものと解消結果（未解消HOLDなし）

1. **2-B-3 ナビHOLD**（doc55・doc14 §47）: ナビに営業プレイブックが出ない → read-only 調査で repo 潔白確認 → **ハードリロードで解消（doc56・§48）**。ブラウザキャッシュ起因の可能性が高く、**コード修正は不要だった**（doc37→38 と同型の3例目）。
2. **2-B-5 ai_reference 見当たらない問題**（doc61 §2）: 監査ログに AI参照が見えない → read-only 切り分けで**表示場所の違い**（監査ログ本体ではなく `/admin/data-access-logs`）と判明 → 再実測で参照表示＋ログとも確認し **GO（doc61）**。あわせて 68点表示=FakeLLM 仕様（信頼度0.68固定）・Supabase dashboard 由来ログ=アプリ無関係の可能性大（断定しない）と記録。

## 5. Phase 2-B で完成したもの

- **SalesPlaybookEntry 設計**（doc51: 顧客名・事例・口コミ・成果数値を最初から扱わない「売り方の型」専用・ID配列参照）。
- **schema / migration**（追加のみ・22フィールド・index 3本・既存無傷）。
- **read-only 一覧＋ナビ表示**（/brain/playbooks・knowledge:read・tenantId スコープ）。
- **人間書き込み**（作成・編集・アーカイブ＝**物理削除なし**・**writeAudit 3操作**・入力ガイド画面明記・AI mutation禁止）。
- **AI参照**（ナレッジ検索で「参照した会社の頭脳」に表示・**ai_reference を DataAccessLog にレコードごと記録**・**外部LLM送信ゲート**=externalAiAllowed＋maskText 維持）。
- **E2E回帰網の成長**: smoke 15本 → 18本（2-B-3 で 16/16 → 2-B-4 で 17/17 → 2-B-5 で 18/18・各段で既存全本回帰なし）。

## 6. 安全境界（Phase 2-B 全段で維持・変更なし）

- tenantId スコープ必須／archivedAt:null のみ／label は **NORMAL / INTERNAL のみ**（高機密なし）／canAccessLabel。
- **externalAiAllowed false**（全件）・外部LLM時は externalAiAllowed=true＋maskText のみ・**true UI なし**＝外部AIへの送出は構造的にゼロ。
- **物理削除なし**（ソフトアーカイブのみ）・**AI mutation禁止**（actions 層・rbac.ts 無変更）。
- **外部送信なし・SNS投稿なし・口コミ投稿なし・顧客の声公開なし・ENSHiN OS外部発信なし・Phase 8なし**・MCP/API公開なし。

## 7. 検証結果のまとめ（各段の実装時・すべて green）

| 段 | 検証 |
|---|---|
| 2-B-2 | prisma validate・migrate dev（ローカル）・migrate status・test 211・typecheck・lint・build |
| 2-B-3 | db:generate・test 211・typecheck・lint・build・migrate deploy pendingなし・seed playbooks:6・**smoke 16/16** |
| 2-B-4 | 同上フルセット・**smoke 17/17**（16本目はナビ経由確認へ意図的更新） |
| 2-B-5 | 同上フルセット・**smoke 18/18**（18本目=AI参照の参照元表示） |

## 8. 残す改善候補（いずれも別承認・本判定には影響しない）

1. 会社方針・商品カタログ画面 → 営業プレイブックへのタブ導線（現状は片方向）。
2. アーカイブ文言・色/フォントの視認性改善（Company Brain 3画面）。
3. **実LLMキー設定**（テンプレ回答の解消。**外部送信解禁とセットの重い承認**・maskText/externalAiAllowed ゲート再確認込み）。
4. CI 導入（test/typecheck/lint の自動実行）。
5. 安全境界の否定系テスト（AIロール拒否・権限拒否・ラベル制限の自動検証）。
6. doc49（本番確認プレイブック）の script 化。
7. **Case Study / Customer Pain は別承認**（doc50 の評価どおり: Case Study は許諾管理・公開前承認・広告表現チェックの設計とセット、Customer Pain は高機密ラベル対応の後）。

## 9. 今回やらないこと

- Phase 2-C 相当（次領域）の着手・Case Study 実装・Customer Pain 実装。**Phase 2-C は別承認**であり、進む場合は 2-B-ENTRY（doc50）と同じ**入口レビューからの別承認**が必要。
- 外部LLM送信解禁・externalAiAllowed true UI・高機密ラベル・3c-5・Phase 8 実課金・MCP/API公開・ENSHiN OS外部発信・口コミ投稿・SNS投稿・顧客の声公開。
- push（本記録は commit-only・main 反映は push-only の別承認）。

## 10. 次に人間が選ぶべき選択肢

1. 本記録（doc62＋doc14 §51）の push-only（feature＋main）。
2. 次領域の入口レビュー（Case Study / Customer Pain / roadmap 上の別領域 — いずれも docs-only の ENTRY から）。
3. §8 の改善候補の選択（特に CI 導入・否定系テストは 2-B と独立に実施可能で費用対効果が高い）。

- 参照: 完了記録の型=doc48（2-A-CLOSE）／本番確認の型=doc49／入口レビュー=doc50／各段の記録=doc51〜doc61／doc14 §46〜§51。
