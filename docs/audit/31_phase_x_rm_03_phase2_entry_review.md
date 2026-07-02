# 31. Phase X-RM-03 Phase 2入口条件の最終確定・Phase 2-A 準備メモ

> docs-only / entry-gate review。**コード・DB・schema・package・lock の変更は一切なし。本書は Phase 2 実装の承認ではない。**
> フェーズ: Phase X-RM-03 / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- 「**Phase 2 に入ってよいか**」を、あらかじめ決めておいた**入口条件4項目**（`docs/roadmap/01_phase2_master_roadmap.md` §2）と証拠を突き合わせて判定しました。
- 結果: **4項目中3項目が証拠付きで充足（GO）**。残る1項目は「Phase 2-A 実装への人間の個別承認」で、これは**性質上、人間にしか出せない承認**のため HOLD（あなたの判断待ち）です。
- つまり「**入口レビューとしては READY / GO。実装開始は人間承認待ち**」——設計どおりの二段構えの状態に到達しました。
- あわせて、承認判断の材料として **Phase 2-A（Company Brain foundation）の準備メモ**（何を作るか・何を守るか・何を絶対にやらないか）を §5〜6 にまとめました。

## 2. Phase 2 入口条件（4項目・doc01 §2 より）

1. **条件1**: Phase X の主要品質タスクが閉じていること（特に Phase X-03 の E2E smoke green 化）。
2. **条件2**: roadmap 一式（doc00〜08）が main に反映され、人間がレビュー済みであること。
3. **条件3**: `tasks/CURRENT_STATE.md` の安全境界（課金なし・決済なし・外部送信なし等）が維持されていること。
4. **条件4**: Phase 2 の最初のサブフェーズ（2-A）に対する個別の人間承認があること。

## 3. 各条件の判定（証拠付き）

| 条件 | 判定 | 証拠 |
|---|---|---|
| 条件1: Phase X 主要品質タスク | **GO** | doc30: **smoke 11/11 green**（X-02 の 0/11 → X-03 で全green・9.1s・11画面の主要動線）。X-01 棚卸し（doc26）・X-02 実証（doc27）・X-03 green化（doc30）がすべて main 反映済み |
| 条件2: roadmap main反映＋レビュー | **GO** | X-RM-01 で roadmap 9本＋doc28 を main 反映、X-RM-02 でユーザー提示の追加構想リストと**全件突合レビュー**（17領域 17/17・代表機能 37/37・doc29）済み。表記統一（IKEZAKI MCP/API Gateway・Enshin OS）と分類23項目も固定済み |
| 条件3: 安全境界の維持 | **GO** | CURRENT_STATE「現在の安全境界」12項目（課金なし・決済なし・サブスクなし・billable_candidate / never_billable runtime 使用なし・schema/migration/package/lock 変更なし・本番DB操作なし・外部送信なし・実メール/Webhook実送信なし等）が維持され、「今は絶対にやらないこと」も現存 |
| 条件4: Phase 2-A の個別人間承認 | **HOLD** | **未取得**。本書 §5〜6 が承認判断の材料。承認は人間のみが行える（AIは判定材料の提示まで） |

## 4. 総合判定

- **Phase 2 入口レビューとしては READY / GO**（客観条件3つはすべて証拠付きで充足）。
- **Phase 2-A 実装は HOLD until human approval**（条件4）。人間が §5 の準備メモを見て「Phase 2-A 設計へ進む」と明示した時点で初めて着手できる。
- 本書は判定の記録であり、**Phase 2 のいかなる実装の承認でもない**。

## 5. Phase 2-A（Company Brain foundation）準備メモ — 承認判断の材料

**目的**: 会社方針・商品・事例・顧客課題・営業ナレッジをDB化し、AI が「その会社の文脈」で働ける知識基盤の最初の縦切りを作る。

### 5-1. 対象テーブル候補（設計→schema 個別承認→薄い縦切り実装の順）

| 候補 | 内容 | 主なデータ種別 |
|---|---|---|
| Policy DB | 会社方針・社内ルール | 社内知識（機密度: 中〜高） |
| Product Catalog | 商品・サービス情報 | 社内知識（機密度: 低〜中） |
| Case Study DB | 導入事例・成功事例 | 社内知識＋顧客情報（機密度: 中） |
| Customer Pain DB | 顧客課題・ニーズ | 顧客PII近接（機密度: 高） |
| Sales Playbook | 営業ナレッジ・切り返し | 社内知識（機密度: 中） |

### 5-2. 最初から持たせる安全設計（Phase 1 の実装ルールを踏襲）

- 全テーブルに **tenantId（スカラ）** — クエリは必ず tenantId スコープ。
- **機密ラベル**（既存 labels.ts 体系）と**外部AI送信可否ラベル**を各レコードに最初から付与（外部LLM送信前 maskText 対象の判定に使う）。
- **RBAC**: 閲覧・編集権限を hasPermission で制御。AI ロールの権限は拡大しない（ROLE_PERMISSIONS 不変）。
- 機密参照は **writeDataAccess**、変更は **writeAudit**。
- 変更系は Server Action（認証→権限→入力検証→DB→監査→revalidate）。
- 薄い縦切り: テーブル＋CRUD＋権限＋監査＋**デモデータ（seed）**＋read-only 一覧UI を一気通貫。
- E2E: 新画面はスモーク経路（ログイン→一覧 200）を追加候補とし、**新規フォームは label 関連付け（htmlFor/id）を最初から実装**（X-03 の教訓）。
- **schema 変更・migration は Phase 2-A 内でも個別の人間承認**を必要とする（本書は schema 承認ではない）。

### 5-3. Feature Registry 上の位置づけ

- BRAIN-001（Policy DB / Product Catalog）・BRAIN-002（Case Study / Customer Pain / Sales Playbook）— doc02 で Phase 2-A・HIGH(schema)・L2(AI Draft)・承認=schema個別承認・監査=要・課金=usage_only と分類済み。

## 6. Phase 2-A で絶対にやらないこと

- 実課金・決済（Phase 8 まで凍結）。
- MCP/API 公開（内部 scope 設計のみ・doc06）。
- 外部送信・実メール送信・Webhook実送信の拡大（既存の承認ゲート付き送信のみ）。
- AI 自動危険操作・AI ロール権限の拡大。
- Automation Level L5 以上の実行系自動化（実装上限 L4・doc08）。
- ロボット実行・物理世界操作（blocked）。
- 採否決定・社員評価確定・給与・解雇判断（恒久 human-only・doc04）。

## 7. 次の人間判断事項

1. **Phase 2-A 設計へ進むか**（本書 §5 の準備メモを承認材料に。進む場合、最初の承認単位は「2-A の schema 設計 docs」→その後 schema 変更承認→実装、の三段が安全）。
2. **先に Phase X-04 を行うか**（本番スモーク定型化・残り E2E 11スペックの段階実行。Phase 2 と並行可否も含め判断）。
3. **Enshin OS 資料をいつ提供するか**（Phase 2-F の入力。現状は証拠不足のままで、分類作業を開始できない）。

## 8. GO / HOLD / NG 判定

- **入口レビュー: GO（READY）** — 条件1〜3 充足・証拠付き。
- **Phase 2-A 実装: HOLD**（条件4=人間の個別承認待ち。承認が出るまで実装・schema設計の確定・migration には一切進まない）。
- 本書の作成に伴うコード・DB・schema・package/lock の変更: **ゼロ**。
