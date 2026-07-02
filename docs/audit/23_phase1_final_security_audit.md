# 23. Phase 1 最終セキュリティ・権限・非課金監査 — Phase 1-48

> read-only 主体の横断監査＋docs-only 記録。**コード修正・emit 追加・課金実装・schema/migration・認証/RBAC 変更は含まない。**
> フェーズ: Phase 1-48 / 種別: read-only audit + docs-only record / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- Phase 1 を閉じる前の**最終安全点検**です。プログラムは1行も変えていません。
- 点検した6領域すべてで、**重大な問題は見つかりませんでした**：
  1. **利用量記録（UsageEvent）**は8種類のまま・全件「非課金記録」・勝手な課金判定なし。
  2. **利用量画面（/admin/usage）**は閲覧専用・権限ガードあり・会社ごとに分離・個人情報や金額を出さない。
  3. **AIの権限**は「読む・下書きを作る」まで。外部送信・承認・削除・権限変更はできない設計のまま。
  4. **会社（テナント）分離**は主要な画面・記録で守られている。他社データを横断で見る画面は無い。
  5. **外部送信（メール・Webhook）**は承認と設定フラグの二重ゲート付き。失敗・抑止分は利用量に数えない。
  6. **データベースの形（schema）**は Phase 1-22 以降変わっていないことを git で確認。
- あわせて、履歴ファイル（PROGRESS）に残っていた古い「push未実施」表現4箇所を、**pushされた証拠を確認したうえで**現状に合う表現へ直しました。
- **判定は GO**（Phase 1-49 完了判定へ進んでよい状態）。

## 2. 目的

Phase 1 完了判定（Phase 1-49）の前提として、tenant分離・RBAC・AI権限・UsageEvent非課金原則・metadata安全性・外部送信ゲート・schema不変を実コードで横断確認し、証拠付きで記録する。

## 3. 非目的（今回やらないこと）

- コード修正・emit 追加・課金/決済実装・schema/migration・認証/RBAC 変更・外部送信の実行・本番DB操作は行わない。
- 監査で懸念が見つかっても、修正せず HOLD 記録に留める（今回は該当なし）。
- Phase 1-49（完了判定）には進まない。

## 4. 現在の Phase 1 基準

- 最新の本番確認GO済みプロダクト基準: Phase 1-44（実装 `ce858c7` / GO記録 `3e3409f`）。
- 状態管理の役割固定: Phase 1-47（doc22）。UsageEvent 一覧の正本: `usage_event_emit_matrix.md`（Phase 1-46）。
- UsageEvent emit 対象: **8種類**・全件 `usage_only`。

## 5. 監査方法

- 実コードの grep / 精読（read-only）。実データ・本番DB・`.env`・secret 実値は読まない。
- git 履歴（origin/main）による schema 不変・push 証拠の確認。
- 各判定は「コマンド出力の証拠がある項目のみ PASS」とする（推測 PASS なし）。

## 6. UsageEvent emit 8種類維持確認 — PASS

- runtime の emit 呼び出し（eventType 指定箇所）は**正確に8箇所**で、`usage_event_emit_matrix.md` の8種類と完全一致（LeadMap export / AIOutput apps/web / admin danger-actions export / approvals outreach / invoice-send / dunning / Webhook success / worker 朝礼AI出力）。追加 emit なし。
- `recordUsageEvent`（apps/web）/ `recordUsageEventCore`（packages/db）の参照は「8 emit サイト＋helper定義2ファイル」のみ。
- **全8箇所が `billing: 'usage_only'` をリテラルで指定**。

## 7. /admin/usage 安全性確認 — PASS

- `requireUser()`＋`hasPermission(user, 'audit', 'read')` ガードあり。
- 全 query が `tenantId: user.tenantId` スコープ・直近30日。
- 取得は `groupBy(['eventType'])`/`groupBy(['category'])`＋`select: { occurredAt, quantity }` のみ。
- **raw metadata / sourceId / idempotencyKey / actorId は取得も表示もしない**（該当語はコメントと安全注意文のみ）。
- write / emit / Server Action（create/update/delete/recordUsageEvent 等）**なし**（grep で不在確認）。

## 8. RBAC / AI権限確認 — PASS

- `packages/shared/src/rbac.ts` にて:
  - **AI_AGENT** = 業務オブジェクトの `read / create / ai_read`＋`finance:ai_read`/`inventory:ai_read` のみ。
  - **AI_ASSISTANT** = `read / ai_read`＋`customer:create`/`meeting:create` のみ。
  - **外部送信・承認（approve）・削除（delete）・export・権限変更・admin 系の権限は両ロールに存在しない**（定義コメントにも「外部送信・承認・削除を持たない」と明記）。
- 危険操作の server-side guard を確認: `approvals/actions.ts` は `approval:approve`、danger-actions の export 実行は `customer:export` を `hasPermission` で検査（UI非表示だけに依存していない）。

## 9. tenant分離確認 — PASS

- 監査系ページ（admin/audit・admin/usage）の全 query が `tenantId: user.tenantId` でスコープ。
- 8 emit サイトすべてが tenantId を明示的に渡す。
- **tenant横断 dashboard / raw viewer ルートは存在しない**（admin 配下に platform/cross/raw 系ルートなし）。doc21/doc22 の方針（横断は別設計・raw viewer は NEVER）と矛盾なし。

## 10. 外部送信 / Webhook / 実メール確認 — PASS

- outreach / invoice-send / dunning の usage 記録は **`sendStatus === 'logged' || 'sent'` のときのみ**（3ファイルで同一ガードを確認）。failed / suppressed / no-recipient は usage に数えない（コメントで never_billable「相当」と説明されるが、**値としては使わず emit しない**実装）。
- Webhook は `if (delivered)` の **success のみ** emit（`packages/db/src/outbox.ts`）。
- 実送信は `EXTERNAL_SEND_ENABLED=true` 時のみで、無効時は logged/監査のみ（invoice-send/dunning のコード・UI注記で確認）。`isSuppressed` による抑止確認も leadmap outreach 経路に存在。
- **本監査で実メール送信・Webhook 実送信は一切実行していない**（grep/読取のみ）。

## 11. metadata / PII / 金額 / secret 非表示確認 — PASS

- 8 emit の metadata は matrix 記載の**固定非PIIキーのみ**（scope/format/hasCampaignFilter/task/model/channel/status/kind/source/eventTypeラベル）。
- 金額（amount/price/currency）カラムは UsageEvent に存在せず、metadata にも入れていない（各サイトの禁止コメントと実装が一致）。

## 12. billable_candidate / never_billable runtime 未使用確認 — PASS

- runtime コード（ts/tsx・テスト除く）での出現は **コメント3箇所＋helper の型/許可リスト定義のみ**。
- **どの emit も billing に `billable_candidate`/`never_billable` を渡していない**（全8箇所 `usage_only` リテラル）。課金判定・請求額計算のコードは存在しない。

## 13. schema / migration / package / lock 不変確認 — PASS

- 作業ツリー clean（本監査開始時点で pending 変更ゼロ）。
- `packages/db/prisma/schema.prisma` と `packages/db/prisma/migrations/` の **origin/main 上の最終変更コミットは `d14ce1d`（Phase 1-22・UsageEvent モデル追加）**＝それ以降変更なしを git で確認。
- 本フェーズでも schema / migration / package.json / pnpm-lock.yaml に一切触れていない。

## 14. docs状態管理確認 — PASS（遺物4箇所を証拠に基づき整合）

- doc22 の役割分担（PROGRESS=履歴／CURRENT_STATE=現在地／matrix=一覧／doc14=本番確認／doc15=設計史／vault=知識）に反する新規記載なし。
- PROGRESS に残っていた旧Phaseの一時状態遺物を、**pushの証拠を確認した4箇所のみ**最小整合:
  - Phase 1-20（現在地バレット＋セクション状態行）: `de3d054` が origin/main 上に存在することを `git log origin/main -- scripts/verify.sh` で確認 → 「push 済み」表現へ。
  - Phase 1-21B（セクション状態行）: 本文バレットに「`85c79ab` push 済み（origin/main）」の記載あり → 整合。
  - Phase 1-26（セクション状態行）: 本文バレットに「`057d314` push 済み」の記載あり → 整合。
- 証拠不足で見送った遺物: **なし**（検出された遺物はすべて証拠あり）。

## 15. 見つかった懸念

- **重大な懸念: なし。**
- 軽微（記録のみ・対応不要〜任意）:
  1. 外部送信系コメントの「never_billable 相当」という表現は概念説明であり実値使用ではないが、将来の読者が「runtime で使っている」と誤読しないよう、実課金設計時に用語を再整理するとよい。
  2. doc22 ルールの継続遵守は運用依存。今後のフェーズプロンプトに「doc22 禁止表現チェック」を含め続けることを推奨。

## 16. GO / HOLD / NG 判定

- **判定: GO（Phase 1 最終セキュリティ・権限・非課金監査として）**。
- 6領域＋docs状態管理のすべてで、コマンド出力に基づく PASS を確認。重大な未確認・危険・矛盾なし。
- コード修正は行っていない（必要もなかった）。

## 17. Phase 1-49 に送る条件

- 本監査 GO を前提に、Phase 1-49（完了判定レポート）へ進んでよい。
- Phase 1-49 で扱うべき素材: doc14（本番確認GO群）／doc15（設計史）／matrix／doc22／本書。
- 実課金・cap・tenant横断 dashboard・raw viewer は引き続き Phase 1 スコープ外（NEVER/DO_NOT_TOUCH_NOW 維持）。

> 注: 本書は read-only 監査の記録であり、実装・是正ではない。Phase 1-49 への進行は別途人間承認が必要。
