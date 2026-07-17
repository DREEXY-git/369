# index — 369 知識ベースの目次

> 369（IKEZAKI OS / LeadMap AI）の思想・プロンプト・知識の入口。まずここから辿る。詳しい趣旨は [[README]]。

## 🧭 このヴォルトについて

- コード本体は別リポジトリ `369`。ここ `369-vault` は **why（思想・判断・言葉）** を保存する場所。
- すべて日本語 Markdown・Obsidian 前提・`[[リンク]]` で相互参照。

## 🪷 思想

- [[369の思想と世界観]] — 何を作り、どんな世界を目指すのか。
- [[安全第一の哲学]] — 「速さ」より「壊さないこと」。証拠主義。
- [[AIの役割と境界]] — AI に何をさせ、何を絶対にさせないか。

## ⌨️ プロンプト

実際に使って効果のあった型を1プロンプト1ファイルで蓄積。

- [[フェーズ実装プロンプトの型]] — 薄い縦切りを安全に実装させる型。
- [[本番確認記録プロンプトの型]] — 実測値だけで GO/HOLD を記録させる型。
- [[push専用プロンプトの型]] — fast-forward push だけを安全に行う型。
- [[状態管理修復プロンプトの型]] — docs の陳腐化・一時状態を安定化させる型。
- [[実装前Gateプロンプトの型]] — 実装前に「既存 schema・RBAC・seed だけで成立するか」を判定し、成立しなければ STOP する型。
- [[CI結果ログ本文確認プロンプトの型]] — success という結論だけで断定せず、CI ログ本文で件数・封印 env・対象 spec を確認する型。
- [[push前敵対的レビューの型]] — push 前の commit を複数視点の独立レビューで総点検し、穴の修正と見張りテスト追加をセットで行う型。

## 📚 知識

- [[用語集]] — このプロダクト特有の言葉の意味。
- [[アーキテクチャ概要]] — 技術スタックとディレクトリの地図。
- [[UsageEvent非課金台帳]] — 利用量記録8種類と非課金の原則。
- [[セキュリティと権限]] — RBAC・機密ラベル・監査・SSRF・承認。
- [[既知の落とし穴とローカル検証]] — 踏み抜きやすい罠と検証手順。
- [[意思決定ログ]] — 重要な判断とその理由の時系列。
- [[状態管理とドキュメント役割]] — PROGRESS/CURRENT_STATE/matrix/vault の役割分担（Phase 1-47 で固定）。
- [[Phase1最終セキュリティ監査]] — Phase 1 を閉じる前の6領域最終点検（Phase 1-48・GO）。
- [[Phase1完了判定]] — Phase 1 を閉じられるかの判定と送り先整理（Phase 1-49・GO）。
- [[Phase1完了記録]] — Phase 1 の正式完了と次Phase=Phase X の選定記録（Phase 1-50）。
- [[PhaseX01検証基盤整理]] — 検証の道具箱の棚卸しと E2E 実行可能性の発見（Phase X-01）。
- [[PhaseX02E2E実行実証]] — 初の E2E 実実行：環境GREEN・smoke 11本RED の教訓（Phase X-02）。
- [[長期構想とPhase2ロードマップ]] — 追加構想17領域の非破壊統合と Phase 2 設計図（Phase X-RM-01）。
- [[PhaseXRM02ロードマップレビュー]] — 追加構想リストとの突合・表記統一・分類23項目の固定（Phase X-RM-02）。
- [[PhaseX03E2EGreen化]] — E2E smoke 初の 11/11 green：red の剥がし方と修正先の見極め（Phase X-03）。
- [[PhaseXRM03Phase2入口条件]] — Phase 2 入口レビュー READY／実装は人間承認待ち（Phase X-RM-03）。
- [[PhaseX完了記録]] — Phase X（短期品質フェーズ）の正式完了と恒久資産の整理（Phase X-CLOSE-01）。
- [[Phase2ACompanyBrain設計]] — Company Brain の schema 設計第一版：2テーブル先行と三段承認（Phase 2-A-1）。
- [[Phase2A2Schema変更]] — 初の schema 変更を破壊ゼロ・全検証 green で実施：migrate コマンドの罠2つ（Phase 2-A-2）。
- [[Phase2A2本番確認]] — Company Brain の器が本番に入った：利用者実測 GO・画面なしが正常（Phase 2-A-2-PROD）。
- [[Phase2A3aCompanyBrain可視化]] — Company Brain が初めて見えた：架空デモデータ＋read-only 2画面＋smoke 12/12（Phase 2-A-3a）。
- [[Phase2A3a本番確認]] — 本番確認は一度 HOLD → 再実測で GO 解消：HOLD を消さず追記で閉じた記録（Phase 2-A-3a-PROD / PROD-2）。
- [[Phase2A3b1CompanyPolicy書き込み]] — 初の書き込み機能：会社方針だけ・3操作だけ・消せない・AIは書き換えられない（Phase 2-A-3b-1）。
- [[Phase2A3b1安全補正]] — push前に境界を締め直す：AI mutation全面禁止・高機密ラベルは参照ログ実装まで保留（Phase 2-A-3b-1-SAFE）。
- [[Phase2A3b1本番確認]] — 会社方針の作成・編集・アーカイブが本番で GO：書き込み第一段の完全クローズ（Phase 2-A-3b-1-PROD）。
- [[Phase2A3b2ProductCatalog書き込み]] — 商品カタログにも書き込み：安全境界を最初から組み込み修正ループ0回・価格メモと課金の分離（Phase 2-A-3b-2）。
- [[Phase2A3b2本番確認]] — 商品カタログの書き込みが本番で GO：Company Brain 2テーブルの人間書き込みが完全クローズ（Phase 2-A-3b-2-PROD）。
- [[Phase2A3cAI参照設計]] — AIに読ませる前に「読んだ記録」と「外に出さない仕組み」を設計：実装は次の承認から（Phase 2-A-3c-1）。
- [[Phase2A3c2CompanyBrainAI参照]] — AIが初めて会社の頭脳を読んだ：ナレッジ検索のみ・記録はレコードごと・外部送信ゼロ（Phase 2-A-3c-2）。
- [[Phase2A3c2本番確認]] — AI参照の本番確認は HOLD：AI回答と参照セクションが本番で未表示・GO済み基準は動かさず read-only 原因調査へ（Phase 2-A-3c-2-PROD）。
- [[Phase2A3c2HOLD解消]] — HOLD解消・再実測GO：原因はバグではなく本番データ前提差。会社方針を本番で作成したら AI参照が全表示（Phase 2-A-3c-2-PROD-2）。
- [[Phase2A完了]] — Phase 2-A 正式完了：会社の頭脳を人間が育て・AIが安全に読み・記録が残る基盤が本番GOまで完成（Phase 2-A-CLOSE・判定 GO）。
- [[PhaseX04本番スモーク定型化]] — 本番確認の型を固定：§0実測テンプレート・GO/HOLD/STOP・本番に実在するデータで確認・ENSHiN OS追加停止条件（Phase X-04）。
- [[Phase2B入口レビュー]] — 会社の頭脳の次の中身は営業プレイブックから：事例・顧客課題は許諾と高機密の部品が揃ってから（Phase 2-B-ENTRY・READY / GO）。
- [[Phase2B1SalesPlaybook設計]] — 営業プレイブックの設計図：顧客名・事例を最初から入れない「売り方の型」の棚・実装は次の承認から（Phase 2-B-1）。
- [[Phase2B2SalesPlaybookSchema変更]] — 営業プレイブックの器が完成：追加のみ・既存無傷・検証全green・本番反映はこれから（Phase 2-B-2）。
- [[Phase2B2本番確認]] — 営業プレイブックの器が本番で GO：build成功＝migration成功・既存画面無回帰・画面なしが正常（Phase 2-B-2-PROD）。
- [[Phase2B3SalesPlaybook可視化]] — 営業プレイブックが初めて見えた：架空の型6件＋閲覧専用一覧＋smoke 16/16・本番確認はこれから（Phase 2-B-3）。
- [[Phase2B3本番確認]] — 営業プレイブックの本番確認は HOLD：詳細実測で「ナビに出ない」の1点に症状を特定・画面直打ちは正常・GO記録は main 反映前に差し止め済み（Phase 2-B-3-PROD）。
- [[Phase2B3ナビ再確認]] — ナビHOLD解消・再実測GO：ハードリロード一発で表示・原因はキャッシュの可能性大・コード修正ゼロ（Phase 2-B-3-PROD-2）。
- [[Phase2B4SalesPlaybook書き込み]] — 営業プレイブックを人間が育てられるようになった：作成・編集・アーカイブ＋AIは書き換え不可＋smoke 17/17・本番確認はこれから（Phase 2-B-4）。
- [[Phase2B4本番確認]] — 営業プレイブックの書き込みが本番で GO：作成→編集→アーカイブ1周＋監査ログ3件＋安全UI確認・HOLDなしの一発GO（Phase 2-B-4-PROD）。
- [[Phase2B5SalesPlaybookAI参照設計]] — AIが営業プレイブックを読む前の安全設計：実証済みの仕組みに3テーブル目を足すだけ・外部送信は構造的にゼロ・実装は次の承認から（Phase 2-B-5-ENTRY）。
- [[Phase2B5SalesPlaybookAI参照実装]] — AIが営業プレイブックを読めるようになった：読むだけ・読んだら記録・外部AIには出ない・smoke 18/18・本番確認はこれから（Phase 2-B-5）。
- [[Phase2B5本番確認]] — AIが営業プレイブックを読むのが本番で GO：参照表示＋AI参照ログを実測確認・「見当たらない」の実体は見る場所の違い・68点はFakeLLM仕様（Phase 2-B-5-PROD）。
- [[Phase2B完了]] — Phase 2-B 正式完了：営業プレイブック全5段が本番GO・会社の頭脳3テーブル体制が完成・HOLD 2件はコード修正ゼロで解消（Phase 2-B-CLOSE）。
- [[PhaseX05CI否定系テスト設計]] — 品質を「規律」から「仕組み」へ：CI 3段階＋否定系テスト8対象の設計・最大の穴は AI書き込み禁止層のテストゼロ・実装は次の承認から（Phase X-05-ENTRY）。
- [[PhaseX05CIStage1実装]] — GitHubに上げるたびに自動チェック：テスト211本・型・lintが自動で走る設定1ファイルを追加・実走確認はpush後（Phase X-05-1）。
- [[PhaseX05CI実走確認]] — 自動チェックがGitHub上で本当に動いた：CI最新runがgreen・品質ゲートが自動で常時稼働する状態に（Phase X-05-1-VERIFY）。
- [[PhaseX05否定系テスト第一弾]] — 「AIが書き換えられないこと」を自動テストで守り始めた：判定を共通化＋否定系テスト5本・テスト216本・挙動不変をE2E 18本で実証（Phase X-05-2）。
- [[PhaseX05否定系テストCI実走確認]] — そのテストがGitHub上で本当に動いた：CI最新runがgreen・「AIが書き換えられない」約束が自動検証で常時稼働（Phase X-05-2-VERIFY）。
- [[PhaseX05静的安全ゲート]] — 「存在してはいけないもの」を機械が見張る：物理削除・高機密ラベル・外部AI送信ボタン・判定コピーの復活を検査する自動ゲートをCIに追加（Phase X-05-3）。
- [[PhaseX05静的安全ゲートCI実走確認]] — 安全の自動見張りがGitHub上で本当に動いた：新step込みでCI green・品質ゲートは4段構えで本稼働（Phase X-05-3-VERIFY）。
- [[Phase2C入口レビュー]] — 品質基盤が固まったので次は事業価値側へ：顧客事例か顧客課題かを絞る設計から・許諾なしに顧客情報を扱わない条件を先に固定（Phase 2-C-ENTRY・READY / GO）。
- [[Phase2C1顧客事例課題詳細設計]] — 顧客事例を先に・顧客課題は後に：許諾なしに扱わない/公開機能を作らない設計を固定・実装は各段別承認（Phase 2-C-1・READY / GO）。
- [[Phase2C2CaseStudySchema設計]] — 顧客事例の器ができた：匿名化・非公開・外部AI禁止が既定値の器だけ追加・画面と書き込みはまだ（Phase 2-C-2・GO）。
- [[Phase2C2CaseStudySchema本番確認]] — 顧客事例の器が本番に入った：build green＝migration成功・既存画面無回帰・画面なしが正常・基準を b012bd0 へ昇格（Phase 2-C-2-PROD・GO）。
- [[Phase2C3CaseStudyReadOnly]] — 顧客事例が初めて見えた：架空4件＋閲覧専用一覧＋smoke 19/19・書き込みとAI参照はまだ（Phase 2-C-3・GO）。
- [[Phase2C3CaseStudyReadOnly本番確認]] — 顧客事例が本番で確認された：ナビ表示・空表示が正常・書けないことも実測・基準を 408857d へ昇格（Phase 2-C-3-PROD・GO）。
- [[Phase2C4CaseStudyWrite]] — 顧客事例を人間が育てられるようになった：許諾なしに匿名化を外せない門番つき・AIは書き換え不可・smoke 20/20（Phase 2-C-4・GO）。
- [[Phase2C4CaseStudyWrite本番確認]] — 顧客事例の書き込みが本番で GO：作成→編集→アーカイブ1周＋許諾の門番も本番で実証・頭脳4テーブル体制が完成・基準を 11e8f51 へ昇格（Phase 2-C-4-PROD・GO）。
- [[Phase2C5CaseStudyAIReference設計]] — AIが顧客事例を読む前に「匿名化済みだけ」と決めた：外部AIは構造的ゼロ・読んだら記録・実装は次の承認から（Phase 2-C-5-ENTRY・READY / GO）。
- [[Phase2C5CaseStudyAIReference実装]] — AIが顧客事例を読めるようになった：匿名化済みだけ・頭脳AI参照4テーブル体制・条件は自動見張り入り・smoke 21/21（Phase 2-C-5・GO）。
- [[Phase2C5CaseStudyAIReference本番確認]] — AIが本番で顧客事例を参照できた：作成→検索→参照表示→記録→片付けの1周を実測・基準を 6d656a3 へ昇格・次は Phase 2-C 完了判定（Phase 2-C-5-PROD・GO）。
- [[Phase2C完了判定]] — 顧客事例の5段階がすべて本番GOになり Phase 2-C を正式クローズ：人間が書き・AIは匿名化済みだけ読み・読んだら記録・外部AIには出ない。ConsentRecord / Customer Pain / 公開活用は後続別承認（Phase 2-C-CLOSE・GO）。
- [[ConsentRecord連携設計]] — 「許諾あり」を自己申告から本物の証拠へ：台帳突合・用途明示・失効時の即遮断・公開5前提を設計固定。連携までは匿名化済みだけAIが読む・実装は別承認（ConsentRecord連携設計・READY / GO）。
- [[ConsentRecord連携器選択]] — 事例許諾は専用台帳 CaseStudyConsent で持つと確定：メール配信同意との混在を避け、追加だけの最小変更に。schema実装は別承認・連携までは匿名化済みだけAIが読む（ConsentRecord連携器選択・READY / GO）。
- [[CaseStudyConsentSchema]] — 許諾台帳の器ができた：追加だけの最小変更・期限必須・証跡は所在説明のみ・登録画面はまだ無く本番は空のまま。UIと突合判定は別承認（CaseStudyConsent schema・GO）。
- [[CaseStudyConsentSchema本番確認]] — 許諾台帳の器が本番に入った：build green・既存画面無回帰・画面なしが正常・基準を 812ae69 へ昇格。台帳UIと突合判定は別承認（CaseStudyConsent schema-PROD・GO）。
- [[CaseStudyConsentUI設計]] — 許諾台帳の画面ルールを実装前に固定：一覧・登録・閲覧・取り消しだけ・人間のみ・証跡は所在説明のみ・期限必須・取り消しは履歴を残す。AIの読み方は変えない・実装は別承認（CaseStudyConsent UI設計・READY / GO）。
- [[CaseStudyConsentUI実装]] — 許諾台帳の画面ができた：4操作のみ・人間のみ・記録つき・行は消えない・AIは台帳を読まない（自動見張りつき）・smoke 22/22。本番確認と突合判定は別承認（CaseStudyConsent UI実装・GO）。
- [[CaseStudyConsentUI本番確認]] — 許諾台帳が本番で1周動いた：架空事例で登録→取り消し→片付けを実測・証跡ガイドも表示・基準を 1913456 へ昇格。AIの読み方は不変・次は突合判定（CaseStudyConsent UI-PROD・GO）。
- [[CaseStudyConsent突合判定設計]] — 「許諾あり」を本物とみなす前の照合ルールを固定：有効な台帳行・期限・取り消し・用途を全部確認して初めて有効。実名解禁ではない・AIの読み方は不変・実装は別承認（突合判定設計・READY / GO）。
- [[CaseStudyConsent突合判定実装]] — 照合の頭脳ができた：理由つきで拒否できる純粋関数＋テスト20本＋こっそり接続・解禁を検知する自動見張り。まだどこにも接続していない＝挙動不変（突合判定実装・GO）。
- [[CaseStudyConsent保存条件接続設計]] — 照合を保存に繋ぐ前の方針決め：3案比較で「接続だけ先行」を推奨・人間が決める5項目を用意。実名解禁ではない・AIの読み方は不変・実装は §0 決定後（保存条件接続設計・READY / GO）。
- [[CaseStudyConsent保存条件接続実装]] — 匿名化を外す保存に台帳の裏付けを必須化：申告だけでは通らなくなった（新規作成では外せない・編集で台帳照合）。実名解禁ではない・AIの読み方は不変・本番確認はこれから（保存条件接続実装・GO）。
- [[CaseStudyConsent保存条件接続本番確認]] — 本番で1周実測：拒否→台帳登録→通る→取り消し→再び拒否。基準は `5e9461f` へ昇格・実名解禁ではない・AIの読み方は不変（保存条件接続本番確認・GO）。
- [[CaseStudyConsent匿名化オフ本格扱い設計]] — 実名寄り事例の見せ方を実装前に設計：3案比較で「社内限定・制限表示」を推奨・人間が決める9項目を用意。AIには読ませない・公開はしない・実装は §0 決定後（匿名化オフ本格扱い設計・READY / GO）。
- [[CaseStudyConsent匿名化オフ本格扱い実装]] — 実名寄り事例はバッジ付き・社内限定・編集権限者のみ閲覧に：自動では匿名化に戻さない・顧客名簿とはつながない。実名解禁ではない・AIの読み方は不変・本番確認はこれから（匿名化オフ本格扱い実装・GO）。
- [[CaseStudyConsent匿名化オフ本格扱い本番確認]] — 本番で実名寄り1周を実測：台帳登録→匿名化オフ保存→3バッジ表示→手動戻し注意→匿名化に戻して片付け。基準は `611e51e` へ昇格・許諾ラインの全段が本番確認済み・実名解禁ではない（匿名化オフ本格扱い本番確認・GO）。
- [[CaseStudyConsentAI参照条件設計]] — 「AIが読む事例は匿名化済みだけ」を今後も続けるかの方針決め：3案比較で現状維持を推奨・台帳の「AI参照OK」用途だけでは解禁しない・人間が決める9項目を用意。変更はまだ・外部AIには何も送らない（AI参照条件設計・READY / GO）。
- [[CaseStudyConsentAI参照条件決定]] — 9項目すべて安全側で正式決定：AIが読む事例は匿名化済みだけを維持・実名寄りは読ませない・台帳の用途だけでは解禁しない・外部AIには送らない。変更ではなく決定記録＝コードは無変更（AI参照条件決定・GO）。
- [[CaseStudyConsent公開活用前提整理]] — 「外に出すための関門」を先に整理：台帳だけでは公開できない・承認手続き＋表現審査＋公開前人間承認＋取り下げ運用が全部必要・ステマや根拠なし数値は許諾があっても禁止。今回も公開はしていない（公開活用前提整理・READY / GO）。
- [[CaseStudyConsent公開活用方針決定]] — 「今は公開しない」を10項目すべて安全側で正式決定：公開系用途だけでは公開できない・将来は関門の詳細設計から再開・恒久禁止は許諾があっても解除されない。変更ではなく決定記録＝コードは無変更（公開活用方針決定・GO）。
- [[CustomerPain入口レビュー高機密ラベル前提整理]] — 顧客の生の悩み（失注理由・クレーム等）は高機密になりやすい：「守り方（ラベル・権限・記録・AI禁止）を先に設計してから作る」を推奨で固定。今回は設計だけ・AIには読ませない・公開しない（Customer Pain 入口レビュー・READY / GO）。
- [[CustomerPain方針決定高機密ラベル先行]] — 「守り方が先」を9項目すべて安全側で正式決定：実装はまだ・個人情報や顧客名は保存しない・AIには読ませない・公開しない・次は高機密ラベル運用の設計（解禁ではない）。変更ではなく決定記録＝コードは無変更（Customer Pain 方針決定・GO）。
- [[CustomerPainデータ分類高機密ラベル運用設計]] — Customer Pain の「守り方の設計」：既定は顧客機密ラベル候補・今のラベル設定はAIや一般スタッフにも許可が及ぶため「ラベルだけに頼らない」3条件交差（編集権限×ラベル許可×人間）で守る・閲覧のたびに参照ログ・本文に個人情報や顧客名は書かせない。解禁ではなく設計のみ・実装はまだ（Data Classification 設計・READY / GO）。
- [[CustomerPainデータ分類方針決定高機密ラベル解禁なし]] — 守り方を12項目すべて安全側で正式決定：解禁ではない・Customer Pain実装なし・高機密ラベルはまだ使い始めない・PII/顧客名/実顧客データは保存しない・AIに読ませない・公開しない。変更ではなく決定記録＝コードは無変更（Data Classification 方針決定・GO）。
- [[CustomerPain高機密ラベル運用詳細設計]] — 守り方を実装できる粒度まで詳細設計：見られる人は「同じ会社×編集権限×ラベル許可×人間×未アーカイブ×記録可能」の全条件・見るたび参照ログ（本文や個人情報はログに入れない）・自動見張り14種と否定系テスト15種の候補まで固定。解禁ではない・実装はまだ（高機密ラベル運用 詳細設計・READY / GO）。
- [[Phase番号体系とLineage整理]] — audit番号は時系列証拠、Phase番号はロードマップ、Lineageは機能ごとの流れとして分けて読むための整理。既存docsは改名せず、ObsidianではLineage別に現在地を追う（Phase番号体系・Lineage整理・READY / GO）。
- [[高機密ラベル解禁可否判断前提整理]] — 高機密ラベルを使い始めてよいかの重い判断に入る前の材料整理：3案（まだ解禁せず最小実装設計＝推奨／限定解禁は別承認後／品質基盤優先）と§0候補10項目を提示。これは解禁ではない・Customer Painはまだ作らない・AIに読ませない・公開しない（解禁可否判断 前提整理・READY / GO）。
- [[高機密ラベル解禁可否方針決定]] — 「まだ解禁しない（案A＝DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN）」を§0の10項目すべて安全側で正式決定：これは解禁ではなく、次は守り方の最小実装設計を紙の上（docs-only）で進める。AIに読ませない・公開しない・個人情報や実顧客データは保存しない。変更ではなく決定記録＝コードは無変更（解禁可否 方針決定・GO）。
- [[高機密ラベル最小実装設計]] — 「まだ解禁しない」決定を受けた最小の作り方の設計：実装候補をA（判定ロジック＋テスト・DBに触らない）／B（自動見張り＝安全ゲート）／C（Customer Pain の器まで含む本実装）に分け、A+Bを先に紙で整理し、schema/migrationが必要なCは別の重い人間承認へ送る。実装ではない・解禁ではない・AIに読ませない・公開しない・個人情報や実顧客データは保存しない＝コードは無変更（最小実装設計・READY / GO）。
- [[高機密ラベル閲覧判定純粋関数実装]] — 候補Aだけを実装：「この人はこの高機密詳細を見てよいか」を判定する純粋関数（同じ会社×編集権限×ラベル許可×人間×未アーカイブの全条件・1つでも欠けたら不可）＋否定系テストを、純粋ロジック置き場の中だけで作成。DB・画面・保存には接続しない・解禁ではない・AIに読ませない・公開しない・権限やラベル定義は無変更（候補A 実装・GO）。
- [[高機密ラベル安全ゲート静的検査]] — 候補Bだけを実装：候補Aの守り（5条件）がこっそり弱められたり、OR緩和や Customer Pain の画面/AI混入が起きたら自動で気づく「見張り」を、既存の安全チェックスクリプトに追記。実行時の新機能・画面・DB・保存はなし・既存チェックは1つも弱めない・解禁ではない・AIに読ませない・公開しない（候補B 安全ゲート・GO）。
- [[高機密ラベル実装解禁可否判断候補AB完了後]] — 候補A（判定ロジック）＋候補B（見張り）が完成した上で、人間が「まだ実際には解禁しない」と正式決定：土台ができただけで解禁の理由にはならない・実データを扱う本実装（候補C＝器/schema）は別の重い人間承認・次は候補C前提設計docs-onlyか品質基盤強化。解禁ではない・AIに読ませない・公開しない・個人情報や実顧客データは保存しない＝コードは無変更（実装解禁 可否判断・GO）。
- [[CustomerPain候補C前提設計]] — Customer Pain を実際にデータとして扱う本実装（候補C）に進む前の紙の設計：入れ物（schema）と migration を作るのが最も重く別の重い人間承認・今回はまだ schema を作らない・個人情報や顧客名は入れない・customerId参照すら別承認・見るたび参照ログ・書くたび監査ログ・AIに読ませない・公開しない。本実装ではない＝コードは無変更（候補C 前提設計・READY / GO）。
- [[CustomerPainスキーマ設計]] — Customer Pain を保存する「入れ物（データベースの表）」の形を紙で設計：持たせる列の候補（ID・会社ID・見出し・本文・分類・状態・機密ラベル・アーカイブ日時・作成/更新者ID）と、絶対に入れない列（顧客名・連絡先・生本文・公開系・顧客ID）を明記・customerIdやenum化は別の重い承認・物理削除なし・AIに読ませない・公開しない・個人情報や実顧客データは保存しない。schema変更もmigrationもしない＝コードは無変更（Customer Pain スキーマ設計・READY / GO）。
- [[CRM最小縦切り方針決定]] — CRM/SFA の最初の範囲を3案（Lead-only／Lead+Deal／＋Pipeline）で比較し「案A: リードだけ」を推奨で固定：Contact PII 最小化・土台集中・停止条件つき。実装ではない＝コードは無変更（CRM最小縦切り 方針決定・READY / GO）。
- [[CRMリードのみ最小設計]] — 推奨案A「リードだけ」を実装判断できる細かさまで紙で設計：会社名・状態・担当・社内メモまでに限定し顧客個人情報は入れない・機密度は NORMAL/INTERNAL のみ・RBAC は変えない。実装ではない＝コードは無変更（CRM Lead-only 最小設計・READY / GO）。
- [[CRMリードのみ実装Gate]] — 「作り始めてよい条件は揃っている」ことを紙で最終判断：範囲は Lead 1テーブル＋最小CRUD＋一覧・PIIなし・既存権限暫定・外部送信なし。着手そのものはさらに別承認（CRM Lead-only 実装Gate・READY / GO）。
- [[CRMLeadMap既存実装突合]] — 新規 Lead を作ろうとしたら本格的な LeadMap（リード〜商談〜顧客）が既に実装済みと判明し停止：既存 LocalBusinessLead / /leadmap を CRM リード正本候補として追認（案A）・doc118〜120 は温存。read-only 監査＝コードは無変更（CRM LeadMap 既存実装突合・READY / GO（案A））。
- [[Phase2完了判定とPhase3Gate]] — Phase 2（会社の頭脳＋CRM/営業）は部分完了・Phase 3（AI Growth Engine）進入は移行条件6項目が未完のため HOLD 推奨を紙で判定：判定の確定は人間の Phase Gate 承認事項＝コードは無変更（Phase 2 完了判定・READY / GO／Phase 3 進入 HOLD）。
- [[Phase2正式完了記録]] — Phase 2 の正式完了記録を紙で固定：頭脳は正式完了・CRM/営業は実装済みだが本番確認/回帰の正式記録が無いため CONDITIONAL COMPLETE（条件付き完了）・完了宣言は人間の Phase Gate 承認事項・Phase 3 残件6条件を明記＝コードは無変更（Phase 2 正式完了記録・READY / GO／CONDITIONAL COMPLETE）。
- [[高機密Runtime統制監査]] — 顧客機密（CUSTOMER_CONFIDENTIAL）が漏れない仕組みを read-only で点検：AI参照経路の封印は二重ガードで閉じていると実測・人間が見る顧客画面側の配線は未確認のため安全側で HOLD・解禁ではない＝コードは無変更（高機密 runtime 統制監査・B — HOLD）。
- [[CustomerContact閲覧統制追加監査]] — doc124 の「未確認」を追加点検し重要訂正：Customer 詳細画面は assertCanViewConfidential（権限＋ラベル判定＋閲覧ログ）で統制済みと確認・顧客一覧の行レベルと Contact 単体経路は未確認のため HOLD 継続・解禁ではない＝コードは無変更（Customer/Contact 閲覧統制 追加監査・B — HOLD）。
- [[Phase3Gate残統制方針と人間判断チェックリスト]] — Phase 3 前に残る決めごと（一覧の機密制御・リード連絡先閲覧・Contactのラベル従属・opt-out正式化・同意記録の用途別分離・回帰ゲート必須化）を紙で整理し、社長が決めるチェックリストにした回。コードは無変更・送信封印とAI境界は維持（Phase 3 Gate 残統制方針＋チェックリスト・HOLD）。
- [[Phase3Gate判断確認]] — 6つの方針を人間が「推奨どおりで承認」と決定し、品質チェックは6つ中5つ合格（欠陥ゼロ）・残るe2eはCIで確認すると決めた回。方針=GO・Phase 3 進入は「e2eのCI合格＋最終承認」の2点がそろうまでHOLD。コードは無変更（Phase 3 Gate 判断確認・方針GO / 進入HOLD）。
- [[CIStage3E2E設計と実装]] — CI第3段 `stage3_e2e` を設計→実装した回：使い捨てのpgvector一時DBにseedを入れ、build→chromium上でPlaywrightの画面通しテストを実走。封印env（fake/log/false）のまま本番DB非接続・変更はci.yml 1ファイルのみ（CI Stage 3 E2E・設計HOLD→実装完了 / Phase 3 進入HOLD）。
- [[CIStage3E2E失敗修復と72Green化]] — E2E 72本中15本失敗から全緑（72 passed / 0 failed）までの長編アーク統合ノート：F1→F1b→F1c→F2→F1d→artifact分析→F1e の時系列と教訓（tests-onlyで直す・ログ本文で確認・分類は証拠で訂正）。真因はすべてテスト側・アプリ不具合0・機密漏えいなし（doc131〜143・stage3_e2e GREEN・Phase 3 は最終Gate承認前 HOLD）。
- [[Phase3最終Gate判断シートとGO記録]] — Phase 3 進入の判断材料を1枚にまとめ（doc144・HOLD）、回帰ゲート3回連続 72/0・機密漏えいなし・封印維持を根拠に人間が GO 判断6件を出した正式記録（doc145）。GO は封印解除でも実装開始でもなく、外部送信・実LLM・課金・本番deployは個別承認制のまま＝コードは無変更（Phase 3 最終 Gate・HOLD → GO）。
- [[ControlTowerV0設計と実装前Gate]] — Phase 3 の最初の縦切り「成長機会の管制塔 v0」を設計し（doc146）、実装前 Gate で「状態永続化なし・既存 schema・RBAC・seed のみで成立」と判定して P3-CT-1 の計画を確定（doc147）。段組みは P3-CT-0〜7 で各段別承認＝コードは無変更（Control Tower v0・設計完了 / Gate PASS）。
- [[P3CT1ReadOnly画面とE2Eセレクタ強化]] — 管制塔 v0 の見るだけ画面 `/growth/control-tower`（9枚カード・スタッフに金額実値なし）を実装し（doc148・単体271件緑）、伏せ字メッセージ2件を件数で厳密確認するようE2Eテストのみ補強（doc149）。書き換えなし・schema/RBAC/seed 無変更（P3-CT-1・実装完了・tests 補強完了）。
- [[P3CT2優先度ロジック]] — Control Tower のカードの並び順を「重要度×(基礎+緊急度)×信頼度」の説明できる式に精緻化した回：純粋ロジックのみ・各カードにスコア内訳を持たせ説明可能に・担当者への金額隠しは不変・schema/RBAC/seed 無変更・単体278件緑（doc150・P3-CT-2 優先度ロジック精緻化・実装完了・commit-only）。
- [[P3CT3監査ログ配線]] — Control Tower の「誰が・いつ・何の目的で見たか」を機密閲覧の帳簿（DataAccessLog）に残す設計→実装の回：財務が伏せられた担当者の閲覧も1件記録・metadata は財務表示有無/カード枚数/要対応数の3項目のみ（金額・カード別件数・個人情報は禁止）・コード変更は1ファイルのみ（doc151〜152・P3-CT-3・設計 Gate PASS→実装完了）。
- [[P3CT4FakeLLM下書き生成]] — Control Tower に「AI 下書きメモ」ボタンを設計→実装前Gate→実装の三段で追加した回：FakeLLMのみ・下書きのみ・人間起点のみ・redactedカードは二重防御で生成拒否。push前の6視点敵対的レビューで high 1件（メモ表示経由の財務件数漏れ）をpush前に発見・修正し e2e 74→77件（doc153〜155・P3-CT-4・Gate PASS→実装完了）。
- [[P3CT4完全クローズとP3CT5準備]] — P3-CT-4 の完成を CI run 29122397143 の「77 passed / 0 failed」をログ本文で確認して正本化した回：76→77 の整合整理・Control Tower 専用テスト5件緑・次段は P3-CT-5（承認導線 deep link 強化・新規送信は作らない）（doc156・P3-CT-4 完全クローズ＋P3-CT-5 準備・docs-only）。
- [[完全機能台帳正本化とカテゴリ番号整合]] — 369 の全機能の住所録（完全機能台帳 v1.0・50カテゴリ＋20大＋19領域＋5本柱＋Global AI Rules＋MVP禁止26項目）を GitHub 正本に固定し、過去 docs の「C41-C44=AI Growth」という番地の書き間違いを追記主義で訂正記録（正: Phase 3 = C18-C22＋C27＋C38）（roadmap58/doc157・正本化完了・docs-only）。
- [[ControlTowerV0完遂とP3CT5承認導線]] — 管制塔の最終段 P3-CT-5（承認導線 deep link・リンクのみ・実行ボタンなし・件数countのみ）を統合オートパイロットで完了し Control Tower v0 が全段完成：push 前レビューで昔からの穴（リード閲覧3ページの権限ゲート欠如）も発見して先に修正・CI「80 passed / 0 failed」をログ本文確認・専用テスト8件体制（roadmap59-60/doc158-159・CT v0 完遂）。
- [[CRM閲覧境界クローズとGrowthEvent成果可視化]] — 顧客管理の7つの穴（無権限の一覧全行表示・判定前取得・拒否画面の顧客名・履歴/インサイトの判定漏れ・ページ表示だけで顧客名＋履歴が AI に送られ得る構造 等）を「先に判定・後に取得」の二段階で全経路クローズし doc125 の HOLD を解消：あわせて管制塔に成果と削減時間（Growth Event Ledger）を read-only 表示・金額は財務権限者のみ・財務件数は引き算復元も遮断・レビュー5視点で critical 1 含む10件を push 前修正・テスト 80→85件（roadmap61-63/doc160-162・WIP1 完全クローズ）。
- [[Phase3クローズ準備_境界クローズ4連WIP]] — Phase 3 のクローズ準備として閲覧境界を4連 WIP でクローズ：/growth・/dx の財務境界、見積/請求/印刷/案件の閲覧境界（原価・粗利は quote:read 配下と明文化・宛先にも可視ラベルガード）、承認待ち件数のシグナル遮断、顧客 PII 29 経路の機械監査台帳と Critical/High 修正。設計原則「取得段階遮断・fail-closed 既定・判定は fetch より先」が型として確立。Phase 3 完了は宣言せず案A/案B を人間 Gate に提示（roadmap64-68/doc163-167・CI 88→91→93 green）。
- [[案Bプラス並行前進とPhase3.5_Phase4開始]] — 人間Gateが案B+を採択：Phase 3 は AI Growth Engine v0 としてクローズ準備・C19/C21/C22 は Phase 3.5 として正本化（捨てない）・Phase 4（AI社員OS/3Dオフィス）と並行前進・Phase 4 完了条件に Growth Channel 接続を必須化。Stream A=広告 read model＋AI下書き（PR #4・CI 96 green）、Stream B=AI社員の証拠由来状態を3Dオフィスで可視化（PR #5）。外部操作は封印のまま・台帳同期は PENDING 継続（roadmap69-71/audit168-170）。
- [[知識/完全機能台帳/index|完全機能台帳 v1（生成鏡像）]] — Codex が原典から再生成した完全機能台帳の Obsidian 閲覧鏡像（50カテゴリ・原子機能2,553件・Stable ID 7,485件・正本は GitHub `docs/function-master/`・PR #7）。
- [[Codex協調統合v58]] — Claude×Codex の協調開発が GitHub 正本で始動：完全機能台帳 v1（Stable ID 7,485）を検証して受領（原典未取得のため SOURCE_RECHECK_WAITING を正直に維持）・自動引き継ぎ Hook 統合・Codex 指摘の High 2件（秘密マスク漏れ・例外握り潰し）を否定テスト付きで修正・境界 Medium 6件対応・3Dオフィスのプロフィール可視化改善（roadmap69§0追補/78・PR #7/#8/#9）。
- [[Codex指摘クローズv62]] — v6.1 復旧を Codex がレビューして CHANGES REQUIRED：値内部 escaped quote の秘密漏れ（High）を bounded scanner へ設計し直し・クラッシュ判定を単一正本に統一・ビルドバッジを OWNER/ADMIN role へ限定・AI社員8名 parity＋実在別テナント404・NAV 明示契約67・証拠段階の言い過ぎ是正・MVP先行/Wave1-5 方針正本化（Codex 再監査まで GO 提案なし・audit176 v6.2/roadmap80/PR #14）。
- [[完全復旧と4軸ロードマップv61]] — 「4機能が消えた」の正体は配信系譜（コードは統合ブランチに存在・利用者画面は main を配信）と判明：復旧ブランチで秘密マスク3経路・クラッシュ残骸の二重実行誤判定・AI社員と3Dオフィスの人物正本を赤テスト先行で修正・NAV 静的契約67＋build識別バッジ・4軸Phase＋AI社員開発環境/Salesforce/MoneyForward台帳を証拠段階と方式で正本化（main/本番は人間GO後のみ・audit176/roadmap80/PR #14）。
- [[三系統前進v56]] — v5.6 で三系統を同時前進：Evidence ID を EVID- 接頭辞に補正（正式 Function ID と混同しない）・C21 SEO/Content v0（未根拠クレームは AI が生成しない・注入で生成中止・CI 99 green）・Agent Control Plane v0（AI 実行の遷移許可表・巻き戻し禁止・stale を働いていると見せない・schema 変更なし・CI 100 green・スクリーンショット artifact 開始）・Work Evidence Cockpit v0（成果は証拠5区分のみ・削減時間は baseline なしでは「計測なし」・PR #6 新規・CI 103 green）・C22 Referral は Gate 設計のみ（roadmap72-76/audit171-174）。

- [[PADNL2イベント駆動オーケストレータ設計]] — チャット手動だった PADN 役割ジョブ（実装・監査・監督）を GitHub イベントで自動起動する L2 オーケストレータの Draft PR 提案：merge しても default-off（人間が変数を設定するまで完全停止）・Lease/fencing/prompt hash/fixed SHA の L1 規律を継承・Human Gate はツール権限レベルで越境不能・自動化レベル L0-L7 とは別軸で AI 権限は不変（369-PADN-L2-AUTONOMY-V11・未採用・採用は人間 Gate）。

## 🔗 コード側の正（source of truth）

- 現在地: `369` リポジトリの `tasks/CURRENT_STATE.md`＋git refs。
- 履歴: `369/tasks/PROGRESS.md`。
- 監査記録: `369/docs/audit/*`。
- ロードマップ: `369/docs/roadmap/*`（長期構想・Phase 2・Feature Registry・各種Matrix）。
- 利用量一覧: `369/docs/audit/usage_event_emit_matrix.md`。
