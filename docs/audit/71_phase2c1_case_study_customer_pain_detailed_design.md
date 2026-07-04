# 71. Phase 2-C-1 — Case Study / Customer Pain 絞り込み詳細設計（docs-only・判定 READY / GO）

> Phase 2-C-ENTRY（doc70）の推奨1位を受けた、次領域を1つに絞る詳細設計。Mode B。
> **docs-only・実装なし・code変更なし・DB操作なし・schema変更なし・migration変更なし・package変更なし・lock変更なし・workflow変更なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- 「顧客事例（Case Study）」と「顧客課題（Customer Pain）」のどちらを先に進めるかを、既存の設計記録（doc33・doc50・doc70）と実際のコード・DB設計を read-only で調べたうえで、**顧客事例（Case Study）先行**に絞りました。
- 理由: 顧客課題は**顧客の個人情報にいちばん近く、高機密ラベルの解禁という別の重い承認が先に必要**だからです。顧客事例は、**「許諾・匿名化・非公開」を最初から設計に組み込めば**、会社の頭脳3テーブルで実証済みの安全な型をそのまま流用できます。
- ただし今回は**設計だけ**です。実装・schema変更・画面追加は一切していません。**顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない／公開しない・SNS投稿しない・PR配信しない・SEOページ公開しない／非公開・架空データ・許諾前提**を設計の絶対条件として固定しました。
- 判定: **READY / GO**（次の一歩 = 2-C-2 schema 設計へ進める状態。実装はすべて別承認）。

## 2. 現在地

- Phase 2-B 正式完了（doc62）＋ Phase X-05 第一波完了（doc63〜69・CI 4段ゲート本稼働）＋ Phase 2-C-ENTRY 完了（doc70・push済み）。
- GO済みプロダクト基準: **Phase 2-B-5 / `83d35bc`**（本設計では変更しない）。
- 会社の頭脳3テーブル（会社方針・商品カタログ・営業プレイブック）が「人間が書き・AIが読み・読んだら記録・外部AIには出さない」体制で本番稼働中。この**実証済みの安全の型**が今回の設計の土台。

## 3. read-only 監査結果

1. **doc70（入口レビュー）**: 推奨1位=2-C-1 絞り込み詳細設計。Case Study 先行が有力と予想（確定は本設計）。
2. **doc33（2-A schema 設計）**: Case Study=次段候補（顧客名を含む可能性→先行テーブルで機密設計を実証してから。Customer への任意参照＋匿名化フラグを次段で設計）。Customer Pain=**次段候補の最後**（顧客PII近接度が最も高い・CUSTOMER_CONFIDENTIAL 前提）。
3. **doc50（2-B 入口レビュー）**: Case Study は ENSHiN OS の「顧客の声・導入事例」領域と近接し、**許諾管理（ConsentRecord 連携）・公開前の人間承認・広告表現チェック・外部発信ログの設計が同時必須。それまでは社内参照専用＋匿名化前提に限定**。Customer Pain は**高機密ラベル対応（ラベル解禁自体が別の重い承認）が先。最後に回す**。→ 本設計はこの評価を維持（矛盾なし）。
4. **schema 実測**: `ConsentRecord`（subject=メール/電話・channel=email|line|sms・consent Boolean・source・note・tenantId index）と `SuppressionList`（tenantId+channel+value unique）は**存在する**。ただし ConsentRecord は**営業チャネルの配信同意向け**の構造で、「事例公開の許諾」をそのまま表現できない（用途フィールドがない）。利用実態は LeadMap 設定画面での閲覧＋seed のみで、**同意を登録する Server Action は未実装**。`Customer` model は存在し、default label は CUSTOMER_CONFIDENTIAL。
5. **Case Study / Customer Pain の既存実装**: model・実装ファイルとも**未存在**（git ls-files＋schema grep 実測）→ 新規設計に重複なし。
6. **writeAudit / writeDataAccess / ai_reference**: 2-B-5 で3テーブル目まで本番確認GO済み。AI参照はレコードごとに ai_reference を自動記録する既存方針が確立している。
7. **Company Brain 共通の安全の型**（SalesPlaybookEntry の schema コメントに明文化済み）: tenantId スコープ・label は UI/action 側で NORMAL/INTERNAL の2択・externalAiAllowed false 固定（true にする UI を作らない）・関連参照は relation なしの ID 配列・archivedAt によるソフトアーカイブ（物理削除禁止）・入力ガイドで顧客名等を本文に入れない・AI mutation禁止（actions 層で isHumanUser）・writeAudit 3操作。
8. **labels.ts**: CUSTOMER_CONFIDENTIAL の閲覧可能ロールに AI_AGENT / AI_ASSISTANT が含まれるが、**Company Brain の AI参照は AI_READABLE_LABELS=NORMAL/INTERNAL に制限**しているため高機密は AI に渡らない構造。高機密ラベルの Company Brain 解禁は引き続き別の重い承認（**高機密ラベル解禁なし**を本設計でも維持）。
9. **externalAiAllowed true UI**: 未存在（create=false 固定・update 不変更・表示のみ）。静的安全ゲート（scripts/check-company-brain-safety.mjs）が CI で常時監視中。
10. **Phase X-05 品質ゲート**: ci.yml で「安全境界検査 → test 216 → typecheck → lint」が push のたびに自動実行（doc69 で実走確認GO済み）。
11. **docs/10_obsidian**: 未存在（ls 実測）。369-vault との関係設計は別承認のまま。
12. **v5.1 / v5.2 Candidate（231〜252）**: 正式昇格させない（doc70 の前提を維持）。
13. **requiresApproval（approval.ts）**: 外部送信・エクスポート等は常に承認必須の既存枠組みあり。ただし「事例公開」という action は存在しない → 初期スコープでは**公開機能そのものを作らない**（＝公開事故が構造的に起こらない）。

## 4. Case Study / Customer Pain 比較（深掘り）

| 観点 | Case Study（顧客事例） | Customer Pain（顧客課題） |
|---|---|---|
| 顧客PII近接度 | 中（匿名化・架空データ前提で低減可能） | **最高**（doc33/doc50 とも「最後」と評価） |
| 必要ラベル | NORMAL / INTERNAL で開始可能（匿名化・非公開前提なら） | CUSTOMER_CONFIDENTIAL 前提 = **高機密ラベル解禁（別の重い承認）が先** |
| 既存安全の型の流用 | ◎ そのまま流用可（3テーブルで実証済み） | △ 型は流用できるが高機密対応の設計が別途必要 |
| 許諾の扱い | 許諾管理を**設計段階から**組み込む（実データは許諾があるまで扱わない） | 許諾以前に高機密の器が必要 |
| 公開リスク | ENSHiN OS 領域と近接 → **公開機能を作らないことで遮断** | 公開素材ではない（そもそも非公開） |
| 事業価値 | 営業説得力・提案品質向上（doc70 評価: 高） | 提案的中率向上（doc70 評価: 高） |
| 前提部品の充足 | 会社の頭脳の型＋承認基盤＝**充足**（許諾管理は設計で補う） | 高機密ラベル対応＝**未充足** |

## 5. 絞り込み判断（結論）

- **推奨（確定案）: Case Study（顧客事例）先行。Customer Pain（顧客課題）は後続。**
- **Case Study 先行の理由**: ①doc33→doc50→doc70 の3つの記録が一貫して同順序を支持し、read-only 監査で矛盾が出なかった ②非公開・匿名化・架空データ前提なら NORMAL/INTERNAL の既存2択で開始でき、高機密ラベル解禁が不要 ③会社の頭脳3テーブルで実証済みの安全の型（§3-7）をそのまま流用でき、新規の安全設計がほぼ不要 ④事業価値（営業説得力）への直結度が高い。
- **Customer Pain を後続に残す理由**: ①顧客PII近接度が最も高い（doc33 以来の評価を維持） ②CUSTOMER_CONFIDENTIAL 前提のため、Company Brain への高機密ラベル解禁という**別の重い承認**（AI参照可否・writeDataAccess 運用・閲覧ロール制限の再設計を含む）が先に必要 ③Case Study で「顧客に関する情報を安全に扱う運用」を実証してからの方が安全に段階を踏める。
- 本判断は docs 上の絞り込みであり、**2-C-2 以降の実装着手はすべて別承認**（この設計だけでは何も動かない）。

## 6. Case Study 先行案の詳細設計（2-C-2 以降の叩き台・実装はしない）

### 6-1. 絶対条件（実装前から固定する安全境界）

- **顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない**。許諾が記録されるまでは**匿名化・架空データのみ**。
- **外部に公開しない・SNS投稿しない・PR配信しない・SEOページ公開しない**（口コミ投稿・導入企業ページ公開もしない）。**初期スコープには公開機能そのものを作らない**（publishStatus は 'private' 固定・公開UIなし → 公開事故が構造的に起こらない）。
- **非公開・架空データ前提**: seed デモデータは全件架空（実在顧客・実成果数値・実際の声を一切含めない）。
- **externalAiAllowed は false 固定**（true にする UI を作らない。既存の静的安全ゲートの監視対象に追加する）。
- **高機密ラベル解禁なし**: label は NORMAL / INTERNAL の2択（既存3テーブルと同じ）。
- **AI mutation禁止**（actions 層で isHumanUser・shared の共通判定を使用）・**物理削除禁止**（archivedAt ソフトアーカイブのみ）・**tenantId スコープ必須**・**writeAudit 3操作**（create/update/archive）。

### 6-2. CaseStudy model フィールド案（2-C-2 の schema 設計・別承認で確定）

SalesPlaybookEntry の型を流用: id / tenantId / title / body / industry（業種・汎用表現）/ challenge(課題の型) / solution(提供内容の型) / outcome(定性的な成果表現。**数値は許諾があるまで入れない**) / **anonymized Boolean @default(true)**（匿名化フラグ）/ **consentStatus String @default("none")**（none | requested | granted | revoked）/ **consentRecordId String?**（relation なしの ID 参照・許諾記録との紐付け）/ customerId String?（relation なしの ID・匿名時は null）/ **publishStatus String @default("private")**（初期実装では 'private' 固定・変更UIなし）/ tags / label（NORMAL/INTERNAL 2択）/ externalAiAllowed @default(false) / sourceType / sourceNote / createdById / updatedById / createdAt / updatedAt / archivedAt。

### 6-3. 許諾管理の方針

- 既存 `ConsentRecord` は営業チャネル（email|line|sms）の配信同意向けで、**事例公開の許諾には用途（purpose）の概念が不足**（§3-4 実測）。2-C-2 で「ConsentRecord に purpose 等を追加拡張する案」と「CaseStudy 側の consentStatus + consentRecordId 参照で開始し、許諾登録UIは後続にする案」を比較し、**後者（既存 ConsentRecord 無変更・CaseStudy 側フィールドのみ）を第一候補**とする（既存の同意・配信停止（SuppressionList）の仕組みに触れないため回帰リスクゼロ）。
- **許諾がない限り consentStatus は none のままで、実顧客情報は入力しない**（入力ガイドで明記＋匿名化フラグ default true）。許諾の取得・記録・失効の運用フローは 2-C-2 で設計し、実装は別承認。

### 6-4. 匿名化フラグの方針

- `anonymized @default(true)`: 新規作成は**匿名化が既定値**。匿名化を外す（実名に近づける）操作は consentStatus=granted が前提条件（actions 層で機械的に拒否）。この制約自体を否定系テストの対象にする（X-05 の型を流用）。

### 6-5. 公開前承認の方針

- 初期スコープでは**公開機能を作らない**ため公開前承認は発生しない。将来公開機能を設計する場合は、requiresApproval の常時承認アクションとして「事例公開」を追加し、**人間承認（ApprovalRequest）＋広告表現チェック（No.1表記・効果保証・誇大表現は人間/法務判断）＋外部発信ログ**とセットでのみ別承認（doc50 §評価・doc49 §10 の停止条件を適用）。それまで公開はできない構造を維持する。

### 6-6. AI参照の方針

- **AI参照は後続別承認**（2-C の最終段）。実装する場合は company-brain-reference.ts の4テーブル目として、既存と同一の制約（NORMAL/INTERNAL のみ・externalAiAllowed ゲート・ai_reference 自動記録・MAX_TOTAL 据え置き検討）で設計する。**anonymized=false のレコードを AI 参照対象に含めるかは、その段の承認で個別判断**（安全側の初期値は「含めない」）。

## 7. 段階計画（三段承認型・doc50→doc51 の前例踏襲）

| 段 | 内容 | 承認 |
|---|---|---|
| 2-C-1（本書） | 絞り込み詳細設計（docs-only） | 完了（本書・commit-only） |
| 2-C-2 | CaseStudy schema 設計＋schema変更・migration（**schema変更は次段別承認**） | 別承認 |
| 2-C-3 | read-only 画面＋架空 seed デモデータ | 別承認 |
| 2-C-4 | 人間書き込み（作成・編集・アーカイブ・AI mutation禁止・writeAudit） | 別承認 |
| 2-C-5 | AI参照（ai_reference 記録・外部AI封印。**AI参照は後続別承認**） | 別承認 |

- Customer Pain はこの計画の後（高機密ラベル対応の重い承認が先）。公開機能・ENSHiN OS 連携は Phase 2-C の範囲外（さらに後続の別承認）。
- 変更しないもの: ENSHiN OS外部発信なし・Phase 8なし・MCP/API公開なし・実LLMキー設定なし。

## 8. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「Case/Pain 未実装・model 未存在」→ git ls-files＋schema.prisma grep 実測 ②「順序評価の一貫性」→ doc33 §後続候補表・doc50 §比較と§評価・doc70 §3/§5（3世代の記録が同順序） ③「ConsentRecord の構造と利用実態」→ schema.prisma 432-443行＋leadmap/settings 閲覧のみ＋seed のみ（書き込み action 未実装）を実測 ④「共通安全の型」→ schema.prisma の SalesPlaybookEntry コメント＋brain 3actions＋labels.ts＋company-brain-reference.ts 実測 ⑤「品質ゲート4段稼働」→ ci.yml 実測＋doc69（利用者実測記録） ⑥「docs/10_obsidian 未存在」→ ls 実測。
**Assumption Log**: ①「匿名化・架空前提なら NORMAL/INTERNAL で開始できる」は、実顧客情報を入れない運用が入力ガイド＋匿名化フラグ＋否定系テストで守られる前提 ②ConsentRecord 無変更案が 2-C-2 で成立する前提（成立しなければ拡張案を再比較）。
**Unknowns Log**: ①許諾の取得・失効の実運用フロー（誰がいつどう記録するか）= 2-C-2 で設計 ②anonymized=false レコードの AI 参照可否 = 2-C-5 の承認で個別判断 ③Customer Pain の高機密対応の重さ = 着手時の別承認で評価。
**Risk Register**: 最大リスクは**許諾なしの実顧客情報の混入と公開事故**（重大度高）→ 対応: 公開機能を作らない・匿名化 default true・consentStatus 前提条件・入力ガイド・架空 seed・静的安全ゲート拡張（§6-1）で多層防御。次点は ConsentRecord 流用の設計不整合（中）→ 既存無変更の第一候補で回避。
**Definition of Done**: Scout 一致 ✅／read-only 監査12項目 ✅／比較深掘り ✅／絞り込み判断（Case Study 先行・証拠付き）✅／許諾・匿名化・公開前承認・段階計画の設計 ✅／doc71 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ✅／push ⏳（別承認）。

## 9. 次回Claude Codeに渡す推奨プロンプト案

> Phase 2-C-2 — CaseStudy schema 設計＋schema変更（doc72）。①doc71 §6-2 のフィールド案を確定（ConsentRecord 無変更・CaseStudy 側 consentStatus/consentRecordId 参照の第一候補で設計）②schema.prisma に CaseStudy model 追加＋migration 作成（追加のみ・既存無変更）③統合テスト＋検証全green ④seed・UI・AI参照は含めない（2-C-3 以降の別承認）。本番反映は build の prebuild 経由・commit-only・push別承認。

## 10. 判定

**READY / GO** — Case Study 先行・Customer Pain 後続で確定（docs 上の絞り込み）。read-only 監査で既存記録との矛盾なし・証拠不足なし。実装（2-C-2 以降）はすべて**別承認**。
