# 01. Phase 2 Master Roadmap — Phase X-RM-01

> 既存プロンプト非破壊・docs-only。Phase 2 の実装承認ではなく、Phase 2 を安全に始めるための設計図。
> 上位文書: `docs/roadmap/00_ikezaki_os_long_term_strategy.md`／機能分類の正本: `docs/roadmap/02_feature_registry.md`。

---

## 1. Phase 2 の目的

**「AI が会社の文脈を理解して、読む・下書きする・推奨する」を安全に実現する。**

Phase 1 で作った統合OS（CRM/会計/財務/人事/在庫/会議/ナレッジ/LeadMap）の上に、Company Brain（会社知識基盤）と Sales AI（提案・下書き）を **read-only / draft / recommend の範囲で**載せる。同時に、Phase 3 以降のすべての土台になる分類体系（Human Boundary / Automation Level / Safety / Monetization / MCP/API Exposure）を確立する。

## 2. Phase 2 の入口条件（すべて満たしてから着手）

1. Phase X の主要品質タスクが閉じていること — 特に **Phase X-03（E2E smoke red の最小修正→green 化）**の完了、または人間が「green 化は Phase 2 と並行でよい」と明示判断していること。
2. 本 roadmap（doc00〜08）が main に反映され、人間がレビュー済みであること（Phase X-RM-02: Phase 2入口レビュー）。
3. `tasks/CURRENT_STATE.md` の安全境界（課金なし・決済なし・外部送信なし等）が維持されていること。
4. Phase 2 の最初のサブフェーズ（2-A）に対する個別の人間承認があること。

## 3. Phase 2 の出口条件（クローズ判定）

1. Phase 2 スコープの各サブフェーズ（2-A〜2-H）が「実装完了＋検証済み＋本番確認 GO（利用者実測）」または「人間判断で明示的に次Phaseへ送付」のいずれかで閉じている。
2. **E2E smoke green を維持**していること（Phase X-02 で実証した E2E 基盤を回帰ゲートとして活用。新画面は最低1本のスモーク経路を追加候補として検討）。
3. 新規テーブルはすべて tenantId スコープ＋権限＋監査ログ＋デモデータの「薄い縦切り」を通過している。
4. Feature Registry が Phase 2 実装分の実態と一致するよう更新されている。
5. 実課金ゼロ・決済ゼロ・MCP/API 公開ゼロ・無承認外部送信ゼロが監査で確認できる。
6. Phase 2 完了監査記録（docs/audit）が作成され、人間承認で完了宣言される。

## 4. Phase 2 でやること

- Company Brain の基礎（Policy DB / Product Catalog / Case Study DB / Customer Pain DB / Sales Playbook の設計と最小実装）。
- CRM/リードと Company Brain を使った **Consultative Sales AI（read-only 分析・下書き・推奨のみ）**。
- Human Boundary / Automation Level 分類の全機能への適用。
- Decision & Action Gateway の**設計**（実行基盤は Phase 4）。
- Trust Center baseline（データ分類・外部AI送信可否ラベルの設計）。
- Enshin OS Feature Inventory の作成（実装ではなく棚卸し）。
- MCP/API の**内部 scope 設計**（公開はしない）。
- Workflow / Marketplace / Integration の分類・テンプレート候補整理（実行系は作らない）。

## 5. Phase 2 でやらないこと

- 実課金・実決済・Stripe live 連携・runtime 課金判定（→ Phase 8）。
- MCP/API の外部公開（→ 将来。設計のみ）。
- 無承認の外部送信・実メール送信・Webhook実送信の拡大（既存の承認ゲート付き送信のみ維持）。
- 採否決定・社員評価確定・給与・解雇判断（→ 恒久 human-only）。
- ロボット実行・物理世界操作（→ blocked）。
- Automation Level L5 以上の実行系自動化（→ future / blocked）。
- AI の権限拡大（ROLE_PERMISSIONS の AI_AGENT / AI_ASSISTANT 変更禁止を維持）。

## 6. サブフェーズ構成（2-A〜2-H）

安全な依存順。各サブフェーズは着手前に個別承認・完了時に検証＋記録。

| サブフェーズ | 内容 | 種別 | 主な安全条件 |
|---|---|---|---|
| **2-A Company Brain foundation** | Policy DB / Product Catalog / Case Study DB / Customer Pain DB / Sales Playbook の schema 設計→承認→薄い縦切り実装。ナレッジ種別・機密ラベル・外部AI送信可否ラベルを最初から持たせる | 設計→実装 | tenantId・RBAC・writeDataAccess・maskText。schema 変更は個別承認 |
| **2-B CRM / Sales AI read-only & draft** | Account Brief / Sales Brief Generator / Lead Scoring / Pain Detection / Best Product Suggestion / Talk Track / Follow-up Draft / Objection Handling / Next Best Action。すべて read-only 分析＋下書き（OutreachDraft 準拠）＋推奨まで | 実装 | 外部送信なし。下書き→承認→既存送信フローのみ。FakeLLM でフル動作 |
| **2-C Human Boundary / Automation classification** | 全既存機能＋Phase 2 新機能に Automation Level（L0〜L7）と Human Boundary 分類を付与し、Human-only Task Registry の初版を作る | docs+軽微UI | L5以上は future/blocked のラベルのみ。分類が実行権限を与えない |
| **2-D Action Gateway design** | Decision & Action Gateway 2.0 の設計（Action Escrow / Risk Score / Dry Run / Execution Receipt / Duplicate Guard / Kill Switch / Two-person Approval / Rollback Plan）。既存 ApprovalRequest からの移行パス定義 | docs-only 設計 | 実装は Phase 4。既存承認フローは不変 |
| **2-E Trust Center baseline** | Data Classification（個人情報・高機密の分類体系）／External Send Register 設計／AI Risk Register 初版／Consent Management の現状整理（ConsentRecord 拡張案） | docs+分類 | schema 変更は個別承認。既存 labels.ts と整合 |
| **2-F Enshin Feature Inventory** | Enshin OS 機能の棚卸し→369 統合先分類→リスク・Phase 分類（`docs/roadmap/07_enshin_os_feature_inventory.md` を更新） | docs-only | 詳細未確認の機能は「証拠不足」とし推測で断定しない |
| **2-G MCP/API internal scope design** | IKEZAKI MCP/API Gateway（旧表記: 369 MCP/API Gateway）の内部設計（scope 体系・rate limit・audit・sandbox 方針）。Company Brain API 等の read-only internal 設計 | docs-only 設計 | 公開なし・エンドポイント実装なし |
| **2-H Workflow / Marketplace / Integration classification** | Workflow Fabric のテンプレート候補分類／Marketplace 出品カテゴリ分類／Integration Hub の連携先分類（承認付き外部連携の設計のみ） | docs-only | 実行系・外部連携実装なし |

推奨順序: 2-A → 2-B（価値の縦切り）を先行し、2-C〜2-H（分類・設計）は並行可。ただし**同時に走らせるのは最大2本**とし、各サブフェーズの完了記録を挟む。

## 7. Phase 2 から他 Phase へ送るもの

| 送付先 | 送るもの |
|---|---|
| Phase 3 | Quote-to-Cash / Collection AI / Dunning 拡張 / Cash Forecast / Payment Risk（Revenue & Cash Autopilot 系の実装） |
| Phase 4 | AI社員OS 実行基盤（Agent Registry / Agent Runs / Agent Budget / Agent Performance）／Action Gateway 実装／Workflow 実行系 |
| Phase 5 | Meeting Intelligence 実装（録音・文字起こし・議事録DB・ナレッジ変換） |
| Phase 6 | 経営ダッシュボード / Business Twin / Executive War Room |
| Phase 7 | Marketplace / 業種テンプレート実装 |
| Phase 8 | 実課金・Usage-Based Billing・credits・cap/alert・billable_candidate runtime 運用（**Phase 2 では一切触れない**） |
| Phase 9 | SSO/SAML・SCIM・Data residency・Compliance reports（Global Trust Center 本格化） |
| future/blocked | MCP/API 公開・L5以上自動化・ロボット/物理操作 |

## 8. Phase X-02 の知見の反映（E2E 基盤の活用）

- Phase X-02 で「この環境で E2E は実行できる」ことが実証済み（B-03 解消・`docs/audit/27_phase_x02_e2e_smoke_result.md`）。
- Phase 2 の出口条件に **smoke green の維持**を含める（§3-2）。
- Phase 2 で追加する主要画面（Company Brain 管理・Sales Brief 等）は、実装時にスモーク経路（ログイン→一覧表示 200）の E2E 追加を検討事項とする。
- テストセレクタは `getByLabel` が機能するよう、**新規フォームは label 関連付け（htmlFor/id）を最初から実装する**（X-02 の教訓をコーディング規約化）。

## 9. 判定

- 本 roadmap は docs-only の設計であり、Phase 2 の実装承認ではない。
- 着手は「入口条件（§2）充足＋サブフェーズ個別承認」の二段構え。
