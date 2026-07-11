# PR #6/#9 read-only独立レビュー

- 実施日: 2026-07-11
- 対象リポジトリ: `DREEXY-git/369`
- 固定SHA: PR #6 `50259e945e96acb260953529ec2de801b35e2a6f`、PR #9 `af397a52136d34be61b27f9c862ed1c5a8b6b99e`
- 比較境界: PR #6はPR #5 head `db71fc8f`からの純増分、PR #9はPR #6 headからの純増分
- 制約: apps/packages/CIを変更しないread-onlyレビュー。修正はClaude Codeへ要求する。

## 結論

Stream C/D固有差分にCritical/Highは確認していない。ただしPR #5から継承したHigh 2件がPR #6/#9にも残るため、全系譜はHOLD。

既存レビューと重複を除いた集計:

| 重要度 | 全系譜 | 今回新規 |
|---|---:|---:|
| Critical | 0 | 0 |
| High | 2 | 0 |
| Medium | 11 | 5 |
| Low / Open Policy | 5 | 2 |

既存High 2件・Medium 6件・Low/Open 3件は `PR_3_4_5_READ_ONLY_REVIEW_2026-07-11.md` を正とする。

## 継承High（未解消）

### High 1: Bearer/JWTを完全にマスクできない

- PR #9最新系譜 `packages/shared/src/agent-run-lifecycle.ts:61-67`
- `Authorization: Bearer sk-live-SECRET`のtoken本体が残り、DBのrun error/action summaryへ二次保存され得る。
- Bearer、JWT、cookie、quoted JSON、改行headerの否定テストが必要。

### High 2: worker例外を正常終了に変換する

- PR #9最新系譜 `apps/worker/src/agent-lifecycle.ts:75-79`
- FAILED記録後にthrowせず`{ok:false}`を返すため、BullMQ retry/failed telemetryが働かない。
- 安全な例外を再throwし、job failure/retryと新run作成の統合テストが必要。

## 今回追加Medium

### Medium 7: 承認待ちを同一runとgateで二重計上する

- PR #6 `apps/web/lib/domains/ai-workforce/outcomes.ts:70-78`
- lifecycleは`NEEDS_APPROVAL` runと`AIApprovalGate(PENDING)`を同時作成するが、表示値は両countを加算する。
- 1件の判断待ちが2件に見えるため、runIdでdedupeするか別行に分ける。

### Medium 8: 異なるunitを同じ証拠classで合算できる

- PR #6 `packages/shared/src/outcome-evidence.ts:72-83`
- `sumByEvidenceClass`は`件`・`時間`・`円`を区別せず加算できる。現時点ではunit testだけの利用だが、成果集計へ接続すると値が無意味になる。
- `evidenceClass + unit`でgroup化するか、同一unitを型/実行時検証する。

### Medium 9: CI画像がプロフィール主要機能を証明しない

- PR #9 `apps/web/tests/e2e/ai_office.spec.ts:24-64,98-109`
- artifact `8248339408`のdesktopは未選択の凡例、mobileは一覧までで、スキル・性格・ミス・評価が画像内にない。
- 人物選択後のプロフィール全体をdesktop/mobileで撮り、文字切れ・重なりを証拠化する。

### Medium 10: desktop初期表示が空の詳細パネル

- PR #9 `apps/web/components/ai-office/ai-office.tsx:51,72,436-557`
- `selectedId`がnull開始のため、追加した人物プロフィールがfirst viewportに出ない。
- 最初の可視AI社員を安全に初期選択するか、first viewportに人物ロスターを設ける。

### Medium 11: 大きな3D nameplateをクリックしても選択できない

- PR #9 `apps/web/components/ai-office/ai-office.tsx:232-244,258-269`
- raycaster対象は`buildCharacter()`が返す小さなhead/torsoだけで、最も目立つnameplate spriteは`clickable`へ追加されない。
- nameplateをclickableへ含め、canvas選択をE2Eまたはcomponent testで確認する。

## 今回追加Low

- `STATE_ICON`のUnicode emojiはOS/headlessごとに外観が変わる。DOMは既存icon library、Canvasは決定論的glyph/文字を推奨。
- プロフィール本文の10px/11px指定はmobileで読みづらい。主要情報は12px以上相当を推奨。

## PR #7/#8受領監査

- PR #7: 原典raw SHA一致ファイルを再発見し、生成器`--check`成功。50カテゴリ、2,553原子機能、7,485 Stable IDs、C49のみ欠落。
- 数え方訂正: `outputFiles: 60`はGitHub生成正本3件＋Obsidian鏡像57件。PR本文の「鏡像60件」は「鏡像57件／総生成出力60件」へ訂正が必要。
- generated folderのwiki link 164件、broken 0。secret-shaped value 0。
- PR #8: remote/local tree一致、JSON parse、shell syntax、SessionStart検出、UserPromptSubmit dedupe、non-blockingを確認。
- ClaudeはPR #8をACKし、featureへPR #7/#8をnon-force統合済み。feature head `4e2d5eb`。mainには未統合。

## CI・artifact証拠

| PR | head | CI | unit | E2E | artifact |
|---|---|---|---:|---:|---|
| #4 | `5c1a175` | #192 green | 297 | 99 | - |
| #5 | `db71fc8` | #194 green | 299 | 100 | screenshotあり |
| #6 | `50259e9` | #200 green | 305 | 103 | `8248000243` |
| #9 | `af397a5` | #206 green | 309 | 103 | `8248339408` |

CI greenは上記High/Mediumの不在を意味しない。PR #9最新画像でもdesktopのプロフィール未選択、mobileの詳細画面外を目視確認した。

## 統合dry-run

1. feature `4e2d5eb`はPR #7/#8を含む。
2. feature + Stream A `5c1a175`は`merge-tree` clean。
3. その合成結果 + Stream B `db71fc8`は次の2ファイルでcontent conflict。
   - `apps/web/components/shell/nav.ts`: Aの広告/SEO導線とBの3Dオフィス導線を両方保持する必要がある。
   - `packages/shared/src/index.ts`: Aの`ads/content-seo` exportとBの`ai-workforce/agent-run-lifecycle` exportを両方保持する必要がある。
4. B→C、C→Dは各最新headでancestor関係を確認済み。ただしA/B競合解消後にC/Dを再dry-runする。
5. squash/forceを避け、feature→A→B→C→Dのnon-force mergeと各段CIを推奨する。Codexは実mergeしない。

## 必須対応順

1. High 2件をPR #5で修正し、B→C→Dへ伝播する。
2. A/Bの2ファイル競合をClaudeが両機能保持で解消する。
3. PR #6の承認二重計上・異unit合算を修正する。
4. PR #9の初期選択、nameplate click、選択後artifactを修正する。
5. 各最新headでunit/typecheck/lint/build/safety/E2Eを再実行し、Codexへ固定SHA再レビューを依頼する。
