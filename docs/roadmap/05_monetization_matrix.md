# 05. Monetization Matrix（収益化・課金分類マトリクス） — Phase X-RM-01

> 既存プロンプト非破壊・docs-only。**実課金は Phase 8 まで全面凍結**という既存方針を維持したまま、追加構想の課金分類を固定する。
> 既存の正本: `docs/audit/usage_event_emit_matrix.md`（emit 8種類）・`docs/audit/15_monetization_usage_design.md`（設計史）。本書はそれらを変更しない。

---

## 1. 課金ステータス分類（ライフサイクル）

| 分類 | 意味 | 現時点の使用 |
|---|---|---|
| never_billable | 恒久的に課金しない記録（安全装置・監査系など） | schema allowlist・型・コメントのみ（**runtime 使用ゼロ**を維持） |
| usage_only | 非課金の利用量記録 | **現行 UsageEvent 8種類すべてこれ**（金額カラムなし） |
| billable_candidate | 将来課金候補（記録段階） | **runtime 使用ゼロ**を維持（分類ラベルとしてのみ存在） |
| billable_ready | 課金可能と検証済み（future） | Phase 8 まで導入しない |
| reported_to_billing_provider | 課金プロバイダへ報告済み（future） | 同上 |
| invoice_previewed | 請求プレビュー済み（future） | 同上 |
| invoiced | 請求済み（future） | 同上 |
| disputed | 係争中（future） | 同上 |

**遷移原則（future）**: usage_only → billable_candidate → billable_ready → reported_to_billing_provider → invoice_previewed → invoiced（→ disputed）。各遷移は Phase 8 の課金前監査＋人間承認を通過しない限り発生させない。

## 2. 現状の確定事実（変更しない）

- UsageEvent emit は **8種類**・全件 `billing: 'usage_only'` リテラル・金額カラムなし・metadata は固定の非PIIキーのみ。
- `billable_candidate` / `never_billable` の **runtime 使用はゼロ**（Phase 1-48 最終監査で確認済み）。
- 可視化は `/admin/usage`（read-only・「請求額を示すものではありません」明記）。

## 3. Phase 別の課金方針

| Phase | 課金の扱い |
|---|---|
| Phase 1（完了） | usage_only 記録の基盤構築のみ（達成済み） |
| Phase X（現行） | 変更なし。課金関連コードに触れない |
| Phase 2 | **実課金なし**。新機能の UsageEvent 候補を「将来 emit 候補」として Registry に分類するのみ（emit 追加自体も個別承認） |
| Phase 3〜7 | 実課金なし。billable_candidate_future ラベルの付与（docs 分類）まで |
| **Phase 8** | 実課金・Subscription・credits・cap/alert・Stripe 等の検討をここで初めて解禁（課金前監査＋人間承認が入口条件） |

## 4. 追加構想の課金分類（サマリー）

| 構想 | 課金分類 | 備考 |
|---|---|---|
| Usage-Based Billing / Usage Ledger / UsageEvent Taxonomy | 基盤（usage_only 拡張） | Phase 8。既存8種類を壊さない |
| Billing Shadow Ledger / Billing Preview | usage_only（課金の「影」検証） | Phase 8 の課金前監査装置。実請求しない |
| Subscription / Plan / Entitlement / AI Action Unit | billable_candidate_future | Phase 8 |
| Value Meter / ROI Meter / Work Value / Time Saved Meter | usage_only（価値の可視化・非課金） | 課金の根拠説明に将来利用 |
| Metered Trust Center | never_billable（信頼装置） | 課金の透明性を利用者に示す側 |
| Sales AI / Company Brain / Meeting Intelligence 等の AI 出力 | usage_only → billable_candidate_future | 現行 `ai.output.generated` パターン踏襲 |
| 安全装置（Gateway / Kill Switch / 監査 / Trust Center） | **never_billable** | 安全にお金を取らない原則 |
| Marketplace 販売（テンプレ/スキル/パック） | billable_candidate_future | Phase 7-8。出品審査前提 |
| Enshin 由来機能 | 個別分類（doc07 で判定） | 詳細未確認のため未分類扱いから開始 |

## 5. 課金事故防止条件（Phase 8 入口で必須）

1. **課金前監査**: 全 emit サイトの再監査（対象・条件・二重計上・テナント分離）＋Shadow Ledger と実利用の突合。
2. **人間承認**: 実課金解禁は人間の明示判断（HD）。AIは判断材料の提供まで。
3. **billable_candidate の runtime 使用解禁**も Phase 8 の個別承認事項（それまで使用ゼロを維持）。
4. 金額・単価・通貨は UsageEvent metadata に**入れない**原則を維持（課金計算は別層で）。
5. 利用者への透明性: Billing Preview → 利用者確認 → invoiced の順を飛ばさない。disputed の受付経路を先に設計する。
6. 安全装置（監査・停止・Trust Center）は never_billable を維持し、課金障害時も動き続ける。

## 6. 運用

- 新機能の課金分類は Feature Registry（doc02）登録時に必須。未分類のまま実装に入らない。
- 本 Matrix の分類変更（特に never_billable → 課金方向）は人間承認＋監査記録を必要とする。
