# Codex 多機能消失申告・独立回帰監査

- 監査日: 2026-07-11
- 対象: PR #12 `claude/integration-v59`
- 固定 SHA: `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`
- 判定: `HOLD: MULTI_FEATURE_DISCOVERABILITY`
- Codex の変更範囲: 本書のみ。`apps/**`、`packages/**`、CI、本番、DB、Secrets は非接触。

## 1. 利用者申告

利用者から「3D バーチャルオフィスだけでなく、様々な機能が消えた」と申告された。これはリリース阻害として扱い、修正版 Preview で全機能の発見性と到達性が証明されるまで完了扱いにしない。

## 2. 独立監査で確認した事実

コード上で機能ページが削除された事実はない。

| 検査 | 統合前または main | 統合 SHA | 結果 |
| --- | ---: | ---: | --- |
| `apps/web/app/**/page.tsx` | main 123 | 127 | 4ページ増、削除なし |
| サイドバー `NAV` href | feature base 65 | 68 | 3導線増、削除なし |
| 現在の NAV href とページ実体 | 68 | 68 | 全件に `page.tsx` あり |
| main / feature / Stream A-D 比較 | - | - | `apps/web/**`・`packages/shared/**` の削除ファイル 0 |

現在の NAV は従来 65 件をすべて保持し、次の3件を追加した集合である。

- `/marketing/ads`
- `/marketing/content`
- `/ai-office`

## 3. 再現した主原因

### 3.1 長大なサイドバーの発見性

CI artifact `8249340438` の `ai-office-desktop.png`（1280 x 720）では、68導線・12グループを全展開したサイドバーの冒頭部分しか表示されない。下層には多数の機能が残っているが、次の要因で「消えた」と認識される。

- サイドバーだけが本文と別にスクロールする。
- macOS のオーバーレイスクロールバーでは、thumb の不透明度 `0.12` がほぼ見えない。
- 下に続く件数、フェード、矢印、検索、全機能一覧がない。
- 12グループが常時全展開され、現在地以外の項目で高さを消費する。

これはデータ消失ではないが、主要機能へ到達できないのと同等のユーザー影響を持つ。

### 3.2 権限フィルタの無説明化

Stream B で `allowedHrefs` が導入され、権限外導線はサイドバーとモバイルドロワーから黙って除外される。ページと Server Action の RBAC 境界は維持されているが、利用者には「権限で制限された」のか「機能が削除された」のか区別できない。

既存 E2E は STAFF/OWNER の2リンクだけを確認しており、グループ単位や数十件の導線消失を検知できない。

### 3.3 AI社員画面の二重実装

`/ai-office` は `getAiCharacter(key)` と専用 portrait を使う一方、`/ai-agents` は汎用ロボット表示、`/ai-agents/[id]` は完全プロフィールなしである。この不一致は別コメント `4946781894` で修正要求済みであり、本回帰復旧と同じ受入 Gate に含める。

## 4. Preview・証拠状態

- GitHub CI run `29155325693`: unit 355 passed / 0 failed、E2E 110 passed / 0 failed。
- Vercel Preview は Ready。
- Codex のブラウザは Vercel Authentication で停止したため、ログイン後画面の直接操作は未確認。
- 代替として固定 SHA のGitツリーと CI artifact を独立確認した。
- 現行 CI green は「全68導線が発見・到達可能」を証明していない。

## 5. Claude Code への必須修正要求

1. 単一 `NAV` を正とする、常時利用可能な全機能ランチャー／検索をデスクトップ・モバイルへ追加する。
2. サイドバーを折りたたみ可能なグループへ変更し、現在グループを展開、現在項目を表示領域へ移動する。
3. 高コントラストで常時理解できるスクロール継続表示を追加し、不可視のオーバーレイスクロールバーだけに依存しない。
4. OWNER では12グループ・68導線を必ず表示・検索・到達可能にする。
5. 非 OWNER の RBAC は維持し、制限時は現在ロールと「権限により一部制限」の状態／件数を表示する。保護データは表示しない。
6. 既存68導線と127ページを削除・統合・改名してメニューを短縮しない。
7. `/ai-agents` と `/ai-office` の人物、プロフィール、状態、相互リンクを単一正本で統一する。
8. schema、migration、seed、RBACポリシー、workflow、Secrets、実LLM、外部送信、課金、本番は変更しない。

## 6. 完了に必要な回帰テスト

- 静的契約: 期待する全 NAV href の欠落・重複・ページ実体欠落を検知する。
- OWNER desktop 1280 x 720: 12グループ・68導線を検索可能で、最後の `Operations実行` まで URL 直打ちなしで到達できる。
- OWNER mobile 390 x 844: 最初と最後の機能へ到達でき、横はみ出し・重なりがない。
- ロール行列: OWNER 68/68、STAFF の許可／拒否を維持し、制限表示を確認する。
- 全静的 NAV href smoke: OWNER で 404、500、Error Boundary がなく、期待見出しを表示する。
- AI社員 parity: 一覧、詳細、3D Office で同一人物・同一 portrait・同一プロフィールと双方向 deep link を確認する。
- desktop/mobile の初期表示、全機能ランチャー、最終項目、AI社員 parity を画像 artifact として保存する。
- unit 355、E2E 110 の現行基準を下回らず、新規テストを上積みする。

## 7. 引き継ぎ条件

Claude Code は `7ef2d9f` から別 branch / Draft PR を作成し、修正後の固定 SHA、CI件数、Preview URL、artifact ID、NAV件数、意図的なロール制限一覧を `CODEX_REVIEW_REQUEST` として通知する。

Codex は Claude 管理コードを編集せず、修正版差分、全導線契約、CIログ、画像証拠を独立再監査する。利用者が Preview で確認するまで `HOLD: MULTI_FEATURE_DISCOVERABILITY` を維持する。
