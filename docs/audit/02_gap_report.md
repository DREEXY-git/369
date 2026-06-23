# 02 — ギャップレポート（優先度付き）

要件規模に対する不足を、**致命度 × 影響範囲**で優先度付けする。

## P0 — 致命的（屋台骨・フラッグシップ・コンプラ必須）

| ID | ギャップ | 根拠 | リスク | 対応 |
|---|---|---|---|---|
| G-01 | **リアルタイム連動基盤が無い** | EventLog/DomainEvent/Outbox/Webhook がスキーマに不在 | 「すべてが連動する経営OS」という中核思想が成立しない | EventLog + Outbox + EventBus + Webhook(署名検証) を新設 |
| G-02 | **会計が見せかけ** | Account/JournalEntry/TrialBalance はモデルのみ、UI/確定/承認皆無 | 会計OSを名乗れない。誤った数字を出す危険 | 仕訳/試算表/決算UI、確定ロック、税理士レビュー導線、AIは断定助言しない |
| G-03 | **看板AI見積が未実装** | SignageEstimate系がスキーマ皆無 | 主要ターゲット業種の目玉機能が無い | 13マスタ+見積ロジック(原価/粗利/最低受注価格)+UI |
| G-04 | **位置情報・録音の同意/明示基盤が無い** | Location系モデル不在、録音同意UI無し | **法令/就業規則リスク（最重要コンプラ）** | Consent/明示表示/閲覧ログ/保存期間/本人開示 を先に作る |
| G-05 | **機密参照ログが薄い (writeDataAccess=3)** | grep 実測 | 機密データ参照の監査が成立しない | 全機密参照(人事/財務/録音/位置/AI参照)に writeDataAccess |

## P1 — 重大（主要業務・課金・拡張の前提）

| ID | ギャップ | 対応 |
|---|---|---|
| G-06 | EC が未実装 | ECStore/Order/Cart/Shipment + 在庫・会計連動(=G-01 上で) |
| G-07 | AIコールセンター未実装 | CallSession/Agent/Script + Telephony/Voice Provider(skeleton) |
| G-08 | 人事・労務・勤怠が見せかけ | 勤怠/シフト/給与/休暇の UI・Action・承認 |
| G-09 | SaaS課金が未実装 | TenantPlan/Subscription/Usage/AIPointLedger + 管理UI |
| G-10 | OCR/自動仕訳が未実装 | OCRProvider(interface+mock) + 仕訳候補生成(承認後確定) |
| G-11 | ABAC/PolicyEngine 未整備、MFA/SSO 設計のみ | rowレベル認可ヘルパ、PolicyEngine、MFA設計 |
| G-12 | Provider不足(Gemini/OCR/Voice/Payment/Accounting/EC/Telephony) | interface + mock + real skeleton |

## P2 — 拡張（密度・運用・体験）

| ID | ギャップ | 対応 |
|---|---|---|
| G-13 | 予実管理/業種テンプレート/導入診断 未実装 | Budget/Scenario, IndustryTemplate, OnboardingDiagnosis |
| G-14 | バックアップ/復元/外部連携 が見せかけ | RestorePoint UI, Sync/Webhook, export(JSON/CSV) |
| G-15 | テスト網羅が極小(6ファイル) | security/業務ロジック/integration/e2e の拡充 |
| G-16 | PWA未対応 | manifest + Service Worker(オフライン読取) |
| G-17 | 旧名称「369」76箇所残存 | 全コード/プロンプト/seed/worker で IKEZAKI OS に統一 |

## 横断的品質ギャップ（Definition of Done 未達）

ほぼ全ドメインで以下が欠落:
- 一覧/詳細/作成/編集/アーカイブ/検索/フィルタの**フルCRUD**が揃っていない
- **error/loading/empty state** の一貫適用
- **unit + integration test**
- **audit / dataAccess ログの網羅**
- **承認ゲート**の業務横断適用（外部送信以外）

## 推奨着手順（このレポートの結論）

1. **G-17 名称統一**（Phase 1 即時・低リスク・要件 §1）← 本セッションで実施
2. **G-04/G-05 コンプラ&監査の土台**（位置/録音同意・機密参照ログ）
3. **G-01 連動基盤**（EventLog/Outbox/Webhook）
4. **G-02 会計** → **G-03 看板見積** → **G-06 EC** …（Phase 2 以降）
