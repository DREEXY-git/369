# 106. Phase番号体系・Lineage整理 — audit番号とProduct Phaseを分けて読むための正本化（docs-only・判定 READY / GO）

- Audit Doc: 106
- Product Phase: 開発ガバナンス（番号体系・Lineage の整理。特定機能 Phase には属さない横断ドキュメント）
- Lineage: Governance / Documentation Lineage
- Stage: 整理・正本化（docs-only）
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `1372a3598443fff72cebe004ae12d8f2fa8c7922`（doc105・push 済み）
- Scope: Phase番号・audit番号・Lineage・Stage・commit hash の関係整理と、今後の表記テンプレートの制定
- Not Included: 実装・改名・一括整形・既存 audit 改変・docs/10_obsidian と 369-vault の関係確定・push・本番確認
- Next Action: doc106 の push-only（別承認）
- Do Not Start: push / 高機密ラベル実装・解禁 / Customer Pain 実装 / schema変更 / migration / RBAC変更 / label定義変更 / AI参照条件変更 / company-brain-reference変更 / docs/10_obsidian作成 / 369-vault構造変更 / 既存audit改名 / HOLD記録削除 / 本番確認

## 1. 非エンジニア向け要約

- 「doc105 なのに Phase は 2-A-3c で、基準の commit は 611e51e……番号が揃っていない」と見えるのは**異常ではありません**。
- これらは**別々の軸**です。時系列の証拠番号（audit）、ロードマップ上の段階（Phase）、機能ごとの流れ（Lineage）、作業の種類（Stage）、GitHub 正本の状態（commit hash）は、それぞれ違う目的で動きます。
- 本書は「どの番号を、どう見ればよいか」を正式に決め、GitHub 正本に残すための整理です。**改名も削除も一括整形もしません**（追記主義）。

## 2. 結論

- 現在の番号体系は、一般的なソフトウェア開発・監査ログ運用として**異常ではない**。
- ただし、非エンジニアには分かりにくいため、**明確な見方を決める**必要がある。
- **audit番号・Phase番号・Lineage・Stage・commit hash は別の軸**である。無理に揃えない。

## 3. 用語定義

- **Audit Doc番号**: `docs/audit/NNN` の時系列証拠番号。基本的に作業順に増える。
- **Product Phase**: プロダクト上の開発段階。例: Phase 2-A-3c など。
- **Lineage**: ある機能・領域の一連の流れ。例: CaseStudyConsent Lineage、Customer Pain Lineage。
- **Stage**: 設計、方針決定、詳細設計、実装、本番確認、push-only などの作業段階。
- **Commit hash**: GitHub 正本上の実際の状態を示す識別子。
- **Baseline Commit**: 本番確認 GO 済みの基準 commit。現在は CaseStudyConsent anonymized=false 本格扱い / `611e51e`。
- **Current HEAD**: 現在の Git 先端。基準 commit とは別（現在 `1372a35`）。

## 4. 連番が揃わないように見える理由（なぜ連番が揃わないように見えるか）

- **audit番号は時系列**なので、Phase の中身が枝分かれしても増え続ける。
- **Phase番号は機能・ロードマップ上の位置**を表すため、audit番号とは一致しない。
- push-only、設計、方針決定、詳細設計、本番確認などの作業も、それぞれ audit番号を消費する（1つの機能でも複数の audit を使う）。
- CaseStudyConsent、Customer Pain、品質基盤など、**Lineage が並行**するため、単純な1本線の Phase 連番にはならない。
- これは一般的な開発現場でも、audit log・release note・roadmap・commit hash が別軸で管理されるため**自然な構造**である。

## 5. 公式ルール

- `docs/audit/NNN` は**時系列の証拠ログ**として扱う。
- **Product Phase** は開発ロードマップ上の意味として扱う。
- **Lineage** は機能ごとの流れとして扱う。
- **Stage** は作業の種類として扱う。
- **commit hash** は GitHub 正本の状態として扱う。
- **既存docsは改名しない**。
- 過去 HOLD 記録・失敗記録・audit 記録は**削除しない**（**HOLD記録削除なし**）。
- 見た目の連番を整えるための**歴史改変はしない**。
- 今後は docs や CURRENT_STATE で、可能な限り Audit Doc / Product Phase / Lineage / Stage / Baseline Commit / Current HEAD / Next Action を**併記**する。

## 6. 現在の主要Lineage整理

| Lineage | 状態（概略） |
|---|---|
| Company Brain Lineage | 実装・本番確認まで完了（方針/カタログ/AI参照） |
| CaseStudyConsent Lineage | 全段 GO・Baseline `611e51e` |
| Customer Pain Lineage | 設計・方針決定・詳細設計まで（実装は未着手） |
| AI Reference Lineage | 匿名化済みのみ参照・現状維持で決定済み |
| Public Use / Growth Safety Lineage | PROHIBIT_NOW で決定済み（公開なし） |
| Data Classification / High Confidential Label Lineage | 設計・§0決定・詳細設計まで（解禁は未実施） |

補足（表の外に長文で記載）:

- **Company Brain Lineage**: CompanyPolicy / ProductCatalogItem の人間書き込みと、Company Brain の AI 参照（NORMAL/INTERNAL・匿名化条件）まで実装・本番確認 GO 済み。高機密ラベル・externalAiAllowed true UI・外部LLM送信は未解禁。
- **CaseStudyConsent Lineage**: 許諾設計 → 器 → 台帳UI → 突合 → 保存条件接続 → 表示統治 → AI参照条件決定 → 公開活用決定 まで本番確認 GO＋正式決定。Baseline Commit は anonymized=false 本格扱い / `611e51e`。
- **Customer Pain Lineage**: doc101 入口レビュー → doc102 方針決定 → doc103 Data Classification / 高機密ラベル運用設計 → doc104 Data Classification 方針決定 → doc105 高機密ラベル運用 詳細設計 → **doc106 番号体系・Lineage整理**。実装・解禁は未着手（個別人間承認待ち）。
- **AI Reference Lineage**: doc97 設計 → doc98 決定（KEEP_ANONYMIZED_TRUE_ONLY）。AI が読む事例は匿名化済みのみ。company-brain-reference は不変。
- **Public Use / Growth Safety Lineage**: doc99 前提整理 → doc100 決定（PROHIBIT_NOW）。PR・SEO・SNS・顧客の声・導入事例の公開は許諾があっても現状禁止。
- **Data Classification / High Confidential Label Lineage**: doc103 設計 → doc104 §0決定 → doc105 詳細設計。CUSTOMER_CONFIDENTIAL は定義済みだが、Customer Pain 用の解禁は未実施。閲覧は tenantId × knowledge:update × label許可ロール × AIロール除外の AND 交差で設計。

### Customer Pain Lineage（明細・必須記録）

- doc101: 入口レビュー
- doc102: 方針決定
- doc103: Data Classification / 高機密ラベル運用設計
- doc104: Data Classification 方針決定
- doc105: 高機密ラベル運用 詳細設計
- doc106: 番号体系・Lineage整理

## 7. 今後の表記テンプレート

今後の docs 冒頭に、以下のテンプレートを可能な限り入れる（本書 §0 の見出し部が実例）。

```
- Audit Doc:
- Product Phase:
- Lineage:
- Stage:
- Status:
- Baseline Commit:
- Current HEAD:
- Scope:
- Not Included:
- Next Action:
- Do Not Start:
```

## 8. Obsidianでの見方

- Obsidian では、**番号順だけでなく Lineage 別に見る**。
- `369-vault/index.md` には今回のノートを**1行追加するだけ**。
- **369-vault の構造変更はしない**。
- **docs/10_obsidian と 369-vault の関係は今回確定しない**（**別承認**）。
- **docs/10_obsidian の設計は別承認**。
- **GitHub正本**（GitHub が正本）で、Obsidian は見やすくするためのナレッジという位置づけを維持する。

## 9. 今回やらなかったこと

- 既存 audit docs の改名なし（**既存docsは改名しない**）
- 既存 Phase 名の変更なし
- 既存 HOLD 記録の削除なし（**HOLD記録削除なし**）
- **frontmatter一括適用なし**
- docs/10_obsidian 作成なし
- 369-vault 構造変更なし
- 実装なし
- DB変更なし
- schema変更なし
- migrationなし
- AI参照条件変更なし
- company-brain-reference 変更なし
- Customer Pain 実装なし
- 高機密ラベル実装・解禁なし
- 外部送信なし
- 実LLMなし
- AIコストなし
- 本番確認なし
- push なし

## 10. Evidence Map

- 直近の Git 状態は Scout で確認（HEAD=origin/main=origin/feature=`1372a3598443fff72cebe004ae12d8f2fa8c7922`・clean・main..HEAD 空）。
- **doc105 push 済みで3ref一致**。
- CURRENT_STATE / PROGRESS / vault index の現在地が根拠。
- 既存 docs を改名せず、**追記主義**で整理したことが根拠。

## 11. Assumption Log

- audit番号と Phase番号は**別軸**として扱う。
- 既存の番号や名前を変えない方が**監査性が高い**。
- Obsidian では Lineage 別リンクで理解しやすくする。

## 12. Unknowns Log

- docs/10_obsidian と 369-vault の正式な同期ルールは未設計。
- 将来の正式 Phase Map を docs/01_roadmap 等に作るかは別承認。
- 既存全 audit docs へのタグ付け・frontmatter 適用は別承認。

## 13. Risk Register

- 番号を無理に揃えると**履歴改変・証拠性低下リスク**がある。
- Lineage を作らないと**非エンジニアが現在地を見失う**リスクがある。
- Obsidian だけに整理を置くと**GitHub 正本とズレる**リスクがある。

## 14. Definition of Done

- [x] doc106 作成
- [x] CURRENT_STATE 更新
- [x] PROGRESS 更新
- [x] vault ノート作成
- [x] vault index 更新
- [x] 許可5ファイルのみ
- [x] Gate 全 green
- [x] commit 作成
- [x] push なし
- [x] clean 停止

## 15. 判定

**判定: READY / GO**（Phase番号体系・Lineage の整理は完了。既存 docs 改名なし・HOLD記録削除なし・frontmatter一括適用なし・docs/10_obsidian と 369-vault の関係は別承認・実装なし・push なし）。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
