# Codex 多機能消失申告・独立回帰監査（訂正版）

- 監査日: 2026-07-11
- 対象: PR #12 `claude/integration-v59`
- 統合固定 SHA: `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`
- main 固定 SHA: `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`
- 判定: `HOLD: DEPLOYMENT_LINEAGE_AND_FULL_RECOVERY`
- Codex の変更範囲: 本書のみ。`apps/**`、`packages/**`、CI、本番、DB、Secrets は非接触。

## 0. 重要訂正

初版では `href:` の単純検索により型定義 `href: string` まで1件として数え、feature 65件・統合68件と誤集計した。NAV項目だけを `^\s+\{ label:` で再集計した正しい件数は次のとおり。

- main: 63件
- 現在の feature: 64件
- PR #12 統合 SHA: 67件

また、初版は「下に隠れていること」を主原因候補としたが、利用者の追加スクリーンショット5枚では最下部までスクロールできており、それでも4導線が存在しない。主原因判定を訂正する。

## 1. 利用者の追加証拠

次の5枚は、同一Vercel画面のサイドバーを上から最下部まで連続撮影したもの。

- `スクリーンショット 2026-07-11 23.46.18.png`
- `スクリーンショット 2026-07-11 23.46.25.png`
- `スクリーンショット 2026-07-11 23.46.33.png`
- `スクリーンショット 2026-07-11 23.46.38.png`
- `スクリーンショット 2026-07-11 23.46.43.png`

撮影された12グループ・63導線は、`main` SHA `ffd586b` の NAV と完全一致する。PR #12 統合 SHAにだけ存在する次の4導線が、スクロール後も表示されない。

| 欠落ラベル | href | 統合元 |
| --- | --- | --- |
| Growthコントロールタワー | `/growth/control-tower` | feature / Phase 3 |
| 広告・チャネル分析 | `/marketing/ads` | Stream A |
| SEO・コンテンツ | `/marketing/content` | Stream A |
| 3Dバーチャルオフィス | `/ai-office` | Stream B/D |

## 2. 確定した事象

これは統合SHA内部で4ファイルが削除された回帰ではない。Git比較では次を確認した。

| 検査 | main | 統合 SHA | 結果 |
| --- | ---: | ---: | --- |
| `apps/web/app/**/page.tsx` | 123 | 127 | 上記4ページが統合側に追加 |
| サイドバー NAV項目 | 63 | 67 | 上記4導線が統合側に追加 |
| main→統合のページ削除 | - | - | 0 |
| main / feature / Stream A-D→統合の対象ファイル削除 | - | - | 0 |

したがって、利用者が見ているVercel画面は、少なくともNAVについては統合SHAではなくmain系統の内容を配信している。PR #12はDraft・main未統合のため、実装済み4機能が本番相当画面へ反映されていない状態と整合する。

URLとVercel deployment metadataがスクリーンショットに含まれないため、「Production URLを見ている」「古いPreview aliasを見ている」のどちらかは未確定。Claude CodeはVercelのsource branch・commit SHA・deployment IDをread-onlyで確認し、推測で確定しないこと。

## 3. 副次的な未解消事項

### 3.1 AI社員と3D Officeの不一致

`/ai-office` は `getAiCharacter(key)` と専用portraitを使うが、`/ai-agents` は汎用ロボット表示、`/ai-agents/[id]` は完全プロフィールを持たない。人物、プロフィール、状態、相互deep linkを単一正本へ統一する必要がある。PR #12 コメント `4946781894` で固定SHA付き要求済み。

### 3.2 PR #12の未解消レビュー

統合SHAには、main統合前に閉じるべきP1/P2指摘が残る。

- stale runを競合判定へ含める問題
- escaped quoteを含む秘密値のマスク漏れ
- 改行直後に値が続くCookie headerのマスク漏れ
- Marketing OS / Ads / SEOのNAV permission map不足

これらを未解消のまま「4導線を出すためだけ」にmainへ統合してはならない。

### 3.3 ナビゲーションの発見性

5枚の追加証拠により、今回の4導線欠落の主因ではない。ただし63〜67導線を全展開する独立スクロールUIは発見性が低い。全機能ランチャー、検索、グループ折りたたみ、明瞭なスクロール継続表示は別のUX改善として維持する。

## 4. Codexが実施した作業

1. dirtyな既存worktreeを避け、`/private/tmp/369-codex-link-audit` のclean worktreeを使用。
2. PR #12を固定SHA `7ef2d9f` でread-only監査。
3. main、feature、Stream A/B/C/D、統合SHA間の削除ファイルを比較し、対象削除0を確認。
4. main 123ページ／統合127ページを確認。
5. NAVを誤差のない条件で再集計し、main 63／feature 64／統合67を確認。
6. main→統合で追加される4ページ・4導線を固定。
7. CI run `29155325693` の unit 355 passed / E2E 110 passedを確認。
8. artifact `8249340438` を取得し、desktop/mobile/プロフィールの4画像を目視。
9. in-app browserで統合Previewへ接続を試みたが、Vercel Authenticationで停止したため、ログイン後の直接操作は未確認と記録。
10. PR #12へAIプロフィール統一要求 `4946781894` と多機能復旧要求 `4946868384` を通知。
11. 自動通知Hookが検知できるCodex Draft PR #13を作成。head `bbca944a5c7750a0bd535492bb4bd4b969e2f4a8`。
12. ローカルHTTPS pushは403だったため、GitHub connectorでbranch・commit・Draft PRを正規作成。GitHubへの永続化は成功。
13. 追加スクリーンショット5枚を目視し、初版の件数と主原因を本書で訂正。

## 5. 完全復旧の必須順序

1. Vercel Production／利用者が見ているURL／PR #12 Previewのdeployment ID、source branch、commit SHAをread-onlyで固定する。
2. `7ef2d9f`から専用Claude recovery branchを作り、P1/P2、AIプロフィール統一、ナビ発見性を修正する。
3. 現行67導線と127ページを保持する静的契約・E2Eを追加する。
4. exact recovery SHAでunit、typecheck、lint、build、safety、E2Eをgreenにする。
5. exact recovery SHAのVercel Previewで、4導線・4画面・AI社員相互連動・desktop/mobileを証明する。
6. Codexへ固定SHA `CODEX_REVIEW_REQUEST` を送り、独立delta reviewを受ける。
7. Critical 0 / High 0、既知Mediumの処置、Preview証拠を提示して、人間へ1回だけmain統合・Production反映のGO/NO-GOを求める。
8. 人間GO後のみ、承認済み統合順でmainへ非force mergeし、Production deploymentのsource SHA一致を確認する。
9. Production上で67導線、4追加画面、AI社員連動、主要既存画面を再確認し、初めて復旧完了とする。

## 6. 必須回帰テスト

- 静的契約: NAV期待値67件、重複0、各hrefのpage実体あり。
- 差分契約: main 63件から欠落4件が追加されることを明示検証。
- OWNER desktop 1280 x 720: 12グループ・67導線が検索／スクロールで到達可能。
- OWNER mobile 390 x 844: 最初と最後の機能、欠落4機能へ到達可能。
- 全静的NAV href smoke: OWNERで404、500、Error Boundaryなし、期待見出しを表示。
- ロール行列: OWNER 67/67。STAFF等はRBACを維持し、意図的制限を説明表示。
- AI社員 parity: `/ai-agents`、`/ai-agents/[id]`、`/ai-office`で同一人物・portrait・プロフィール・状態・双方向link。
- deployment provenance: 画面または安全な診断証拠で環境種別とshort SHAを確認可能にする。Secretsや内部URLは表示しない。
- screenshot artifact: desktop/mobileの全機能ランチャー、欠落4導線、4画面、AI社員相互遷移。
- Production後 smoke: 67導線、4追加画面、既存主要画面、認証、RBACを再確認。

## 7. 完了条件

- 利用者が見ているProductionのsource SHAが承認済みrecovery SHA系譜と一致する。
- 67導線が存在し、4欠落導線と4画面がProductionで確認できる。
- AI社員と3D Officeの人物・プロフィール・状態・相互遷移が一致する。
- Critical 0 / High 0。未解消事項はseverity・owner・再開条件付きで明示。
- main merge、Production反映は人間GO後のみ。
- 「脆弱性ゼロ」「完全無欠」とは断言せず、確認範囲と残存リスクを明記する。
