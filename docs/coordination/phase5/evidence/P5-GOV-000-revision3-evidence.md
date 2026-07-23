# P5-GOV-000 revision 3 — Evidence

このファイルは、P5-GOV-000 revision 3（既存Draft PR #129に対するB/H監査finding remediation）の証拠を永続化する append-only 記録である。承認記録ではない。最終Packet承認とCodex B/H再監査は本ファイル作成時点で未実施。

## 1. Repository / Branch / PR

- repository: `DREEXY-git/369`
- branch: `claude/p5-entry-gate-v1`（既存branch、通常push、新規branch/PRなし）
- target_pr: `https://github.com/DREEXY-git/369/pull/129`（Draft維持）
- base_sha (origin/main): `f822a73998d0dd936f18ad4ac305d01643ed8f83`

## 2. Commit chain

- Commit A（bootstrap prompt system, rev2）: `f71837efd5866427f0ba6f3b3b9462fd093286ad`
- Commit B（add rev2 packet）: `509f3b9cc380b961c4e412b3c05056480e285f52`（= rev2 head / previous_head）
- Commit C（remediate prompt system B/H findings, rev3）: `6df876ec6bd56982702ef63830a982dccb399dca`
- Commit D（update packet to revision 3）: `345c8a4a1a8303874409d3f6a910575d2600675c`
- Commit E（this evidence file）: 本コミット自身のSHAは循環回避のため本文へ記載しない。push後にPR #129と報告で提示する。

amend / rebase / reset / force push は使用しない。Commit C/D/E は Commit B の上に積むだけ。

## 3. Baseline invariance（元のdirty checkout不変）

元のローカルcheckout（branch `codex/f1d-e2e-locators`、path `/Users/konishimasayuki/Desktop/369-app/369`）は本作業で一切編集していない。baseline artifactをClaude Code自身が再計算し、live checkoutとbyte単位で比較した。

### baseline artifact SHA-256（再計算値 = 既知baselineと一致）

| artifact | SHA-256 |
|---|---|
| baseline_head.txt | `195ad23d0d1c48d77dd4baed744b1bef66dc2e427d3078031a7d1e8c74b06edf` |
| baseline_status.txt | `849671b72905f224b579f97b09bbe446dc60254a61ab0d4fd7a57d39b1c09060` |
| baseline_diff.txt | `c71846b9a04482b60424fbb1f8a567e01f80061af631f1958817502dff897162` |
| baseline_stash.txt | `4a6e9f923544dc3a406f41bf24675e54202145a67753169eec0f9fb5a2aa09d3` |

### baseline vs live（byte比較 `cmp`）

- HEAD_SAME
- STATUS_SAME
- DIFF_SAME
- STASH_SAME

## 4. Prompt SHA-256（rev2 → rev3 before/after）

| # | File | version | rev2 SHA-256 (before) | rev3 SHA-256 (after) | 変更 |
|---|---|---|---|---|---|
| 00 | 00_PHASE5_PROMPT_SYSTEM.md | 1.0→1.1 | `27330d2b9ad72d19d52dba0dbb0348c7bc6f90642879fb4dd4cdc7e2b7c8caa4` | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | YES |
| 01 | 01_PHASE5_PROGRAM_CHARTER_V1.md | 1.0 | `46b223208a478c470a8f9983910325b1e08abbe2520d0a4c62926c4614a16099` | `46b223208a478c470a8f9983910325b1e08abbe2520d0a4c62926c4614a16099` | no |
| 02 | 02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md | 1.0 | `17631eb65f68afb3bf39fcdfac1b46c30b7411a8db536125903c65c27a03db92` | `17631eb65f68afb3bf39fcdfac1b46c30b7411a8db536125903c65c27a03db92` | no |
| 03 | 03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md | 14.0 | `cba186eb0d5fda3c7b9a99ea0fb6c819e8ba72b6b439b74249ba96fd473fc7c5` | `cba186eb0d5fda3c7b9a99ea0fb6c819e8ba72b6b439b74249ba96fd473fc7c5` | no |
| 04 | 04_PHASE5_TASK_PACKET_TEMPLATE_V1.md | 1.0→1.1 | `9e04893f78762581cee6515420ab3086537f398c41a1832a066cd4c2ef55ca7a` | `0298f5391bfee2c3771e24b7b51aedd08580de4d6cc79a73651a3d9c5720d6b1` | YES |
| 05 | 05_PHASE5_BUSINESS_CLOSE_PROMPT_V1.md | 1.0 | `a5d64bc0e00704d557627c7c5e3390cdec94a6116b6371750c5ed6bb4de538fd` | `a5d64bc0e00704d557627c7c5e3390cdec94a6116b6371750c5ed6bb4de538fd` | no |
| 06 | 06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md | 1.0→1.1 | `e09ce4f1db2da55569ed5b1260d78822792be3cf4b16c185144a6f18135edd6a` | `79e9f070e4e343b5774f0e4390bc6c95895211ea8abe8a64a14f9b53453c3be4` | YES |
| 07 | 07_PHASE5_CODEX_SINGLE_PROMPT_V15.md | 15.0→15.1 | `250ca8199e6273128fc95a41380daf57f41f0733290398d0f3f6525bc2efa5b7` | `9810c9c0fe9476880ca8a3f2207b50127a47e56df04b896743c7de064af068e9` | YES |

## 5. Manifest / Packet hash

- PROMPT_MANIFEST.json content hash: rev2 `8096d57e90e2c3a99ecf1d33265e526e3d25ba8acc442f4808bd8ca6f264e0bb` → rev3 `93c450f1f7ef326f821277fdbe17ffdb7a79890de6d145060a04c5e346fd6dad`
- manifest cross-check（記載sha256 == 実ファイルsha256）: `ALL_MATCH`
- manifestはcontent hashのみ管理。commit SHAをmanifest本文へ書かない（循環参照なし）。
- Packet本文 SHA-256: rev2 `0e9ed7da3799ac38257d6e35e89d35a66d1cb833c319d10075213faf44274835` → rev3 `8631a72567b2161506725ce6de839dbb576d2ff1a61df8f3e0b9a7a95de1d13a`
- Packet本文は自身のhashを埋め込まない（`packet_sha256: EXTERNAL`）。

## 6. Findings remediation（実施内容）

finding逐語テキストは承認で各Commitの「目的」として与えられた。実際に行った変更は次の通り（すべて安全制御を強化・明確化する方向で、いかなる制御も弱めない）。

注記: rev3初版のfinding ID対応には誤りがあった（B-P5-GOV-R3-01）。次はrework2で人間が確定した正しい対応である。

| finding | 正しい対応（内容） | 反映箇所 |
|---|---|---|
| B-P5-GOV-01 | 外部Human Approval Event／Packet immutable | 06/07 §6：`human_approval` を必須欄から除去し外部append-only event（8項目一致検証・fail-closed）へ。04 §使用規則 / 00 §Git経由の原則も外部event方式へ統一 |
| B-P5-GOV-02 | C/D/E Role Route REQUIRED | Packet §19 Role Route：C/D/E = REQUIRED（rev2のNOT_REQUIRED_WITH_REASON廃止）。00 §役割分離 / 04 §使用規則 / 06 §1にもREQUIRED明記 |
| B-P5-GOV-03 | manifest content-hash-only／循環hash解消 | 00 §バージョン管理 / 04 §使用規則 / manifest notes：manifestはcontent hashのみ、commit SHAをmanifestへ書かない、Packetは自身のhashを書かない |
| B-P5-GOV-04 | dirty checkout baseline Evidence | 本ファイル §10：raw diff非保存、hash・手順・cwd・timestamp・encoding・cmp・SAME・証拠限界の人間受容を記録 |
| H-P5-001 | 人間のみ承認／B/Hは独立確認者 | 00 §役割分離 / 04 §使用規則 / 06 §1 / 07 §1・§6：承認者は人間のみ、A〜H（B/H含む）は独立確認者 |
| H-P5-R3-01 | prompt EOF正規化／diff --check exit 0 | 01/02/03/05/06/07のEOF余分空行除去、version/manifest整合、`git diff --check` exit 0 |
| B-P5-GOV-R3-01 | finding ID対応の修正 | 本表とPacket §13/§19のfinding参照を正しい対応へ修正 |

## 7. Scope / boundary evidence

- changed files（`git diff --name-only origin/main...HEAD`）はALLOWED_PATHS内のみ（`369-vault/プロンプト/Phase5/**` と `docs/coordination/phase5/**`）。ALLOWED_PATHS外変更 = 0。
- 製品コード（apps/packages/infra）= 0。DB/schema/migration/seed/backfill = 0/未実行。workflow（.github）/ PADN（config/padn）= 0。RBAC/ABAC/機密ラベル = 0。secrets/env/OAuth/外部送信/実LLM/課金 = なし。
- 新規branch / 新規PR / PR本文更新 / Draft解除 / main merge / force push / amend / rebase / reset = なし。
- Draft PR #129 = Draft維持、auto-merge / merge-on-green 未設定。

## 8. 未実施（Human Gate / 次工程）

- 最終Packet承認（`PHASE5_TASK_PACKET_APPROVED`）: 未実施。人間（DREEXY-git）のみが、Codex B/H再監査後に行う。
- Codex B/H independent re-audit（read-only）: 未実施。B/Hは承認者ではなく独立確認者。
- main merge / Production: 未実施。人間Gate。

verdict（rev3初版レーン）: `REVISION3_READY_FOR_BH_REAUDIT`

---

# Rework 2 — P5-GOV-000 Revision 3 Rework 2

Codex B/Hの独立read-only再監査で、rev3初版（head `f0cca809abd6ff37dc5f6182ff44e4cda39269df`）に対し次の正本判定が確定した。

- B: `B_PRECHECK_NG`
- H: `H_OVERSIGHT_HOLD`

release-blocking findings: B-P5-GOV-01 (HIGH), H-P5-R3-01 (MEDIUM), B-P5-GOV-R3-01 (MEDIUM), B-P5-GOV-04 (Evidence制約)。Rework 2はこれらだけを修正する。人間はRework 2を承認済み。revisionは3のまま維持。承認者は人間のみ、B/Hは独立確認者。

## 9. Pre-rework Attestation（Commit F）

変更を加える前の状態を記録する。

- pre-rework head（=approved_current_head）: `f0cca809abd6ff37dc5f6182ff44e4cda39269df`
- origin/main: `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- pre-rework Packet SHA-256: `8631a72567b2161506725ce6de839dbb576d2ff1a61df8f3e0b9a7a95de1d13a`
- pre-rework manifest content hash: `93c450f1f7ef326f821277fdbe17ffdb7a79890de6d145060a04c5e346fd6dad`
- H-P5-R3-01の実測: `git diff --check f822a73998d0dd936f18ad4ac305d01643ed8f83...f0cca809abd6ff37dc5f6182ff44e4cda39269df` = exit 2（01/02/03/05/06/07に "new blank line at EOF"）。

## 10. Dirty checkout baseline Evidence（B-P5-GOV-04）

元のローカルcheckout（branch `codex/f1d-e2e-locators`）はユーザー所有のdirty環境であり、本作業では一切編集しない。その不変性は、raw diffをGitへ保存せず、次のとおりハッシュと手順で証明する。

### 10.1 対象と環境

- cwd（capture / comparison 実行ディレクトリ）: `/Users/konishimasayuki/Desktop/369-app/369`
- baseline artifact 保存先（リポジトリ外、Git非追跡）: セッションscratchpad配下
- encoding / newline: すべて UTF-8 / LF-only（CRLFなし）
- SHA-256は各コマンド出力の raw bytes（ファイルへリダイレクトした標準出力そのもの）へ適用した。

### 10.2 exact capture commands（作業前に1回実行）

```
git status --porcelain=v2 --branch > baseline_status.txt
git rev-parse HEAD                 > baseline_head.txt
git diff                           > baseline_diff.txt
git stash list                     > baseline_stash.txt
```

### 10.3 exact comparison commands（各再検証で実行）

```
git status --porcelain=v2 --branch > liveN_status.txt
git rev-parse HEAD                 > liveN_head.txt
git diff                           > liveN_diff.txt
git stash list                     > liveN_stash.txt
cmp baseline_head.txt   liveN_head.txt
cmp baseline_status.txt liveN_status.txt
cmp baseline_diff.txt   liveN_diff.txt
cmp baseline_stash.txt  liveN_stash.txt
```

### 10.4 baseline artifact digest / metadata

| artifact | SHA-256 | size(bytes) | filesystem mtime |
|---|---|---|---|
| baseline_head.txt | `195ad23d0d1c48d77dd4baed744b1bef66dc2e427d3078031a7d1e8c74b06edf` | 41 | 2026-07-23T23:09:57+0900 |
| baseline_status.txt | `849671b72905f224b579f97b09bbe446dc60254a61ab0d4fd7a57d39b1c09060` | 1048 | 2026-07-23T23:09:57+0900 |
| baseline_diff.txt | `c71846b9a04482b60424fbb1f8a567e01f80061af631f1958817502dff897162` | 2335 | 2026-07-23T23:09:57+0900 |
| baseline_stash.txt | `4a6e9f923544dc3a406f41bf24675e54202145a67753169eec0f9fb5a2aa09d3` | 43 | 2026-07-23T23:09:57+0900 |

### 10.5 before/after digest と比較結果

- before digest = above baseline SHA-256。
- after digest（Rework 2直前の再取得）= baselineと同一（再計算値がbaselineと一致）。
- `cmp` 結果: 差分なし。
- HEAD_SAME / STATUS_SAME / DIFF_SAME / STASH_SAME。

### 10.6 証拠限界（人間が明示受容）

- raw な `baseline_diff.txt` はユーザー所有の未公開差分を含むため、**Gitへ保存しない**（B-P5-GOV-04）。本リポジトリにはSHA-256とサイズ・手順のみを記録する。
- 記録した `filesystem mtime` は外部のtrusted timestampではなく、ローカルファイルシステムのmtimeにすぎない。
- そのため、生baseline artifactを第三者が完全に再現・独立検証することはできない。これは歴史的証拠としての残存制約であり、人間（DREEXY-git）がこの制約を明示的に受容した。
- 本証拠は「baselineが不変であること」をハッシュ一致で示すものであり、「完全再現可能」ではない。

## 11. Post-rework 状態（Commit H — 最終Evidence）

### 11.1 rework2 commit chain

- Commit F（pre-rework Evidence attestation）: `ade469fb29ebb7a01400a94185f20c92cb13ceef`
- Commit G（prompt EOF + human_approval除去 + manifest再計算）: `1ca066ef491acc6dbd08d81b4f42ad29f1e67628`
- Commit H（Packet更新 + 最終Evidence = 本コミット）: 自身のSHAは循環回避のため本文へ記載しない。push後にPR #129と報告で提示する。

amend / rebase / reset / force push は不使用。F/G/Hはrev3初版head `f0cca809…` の上に積むだけ。

### 11.2 Prompt SHA-256（rev3初版 → rework2 before/after）

| # | File | version | rev3初版 (before) | rework2 (after) | 変更 |
|---|---|---|---|---|---|
| 00 | 00_PHASE5_PROMPT_SYSTEM.md | 1.1 | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | no |
| 01 | 01_PHASE5_PROGRAM_CHARTER_V1.md | 1.0→1.1 | `46b223208a478c470a8f9983910325b1e08abbe2520d0a4c62926c4614a16099` | `0a2a89a30cb3e9381f92f4e7a7e99a3d4951fdc6acb9681645f7b35882dbad8e` | YES (EOF) |
| 02 | 02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md | 1.0→1.1 | `17631eb65f68afb3bf39fcdfac1b46c30b7411a8db536125903c65c27a03db92` | `d5ecf067fe9251f741127f3a7ea2bbfbb21e4d35caa4a877fa6fa5149eae749a` | YES (EOF) |
| 03 | 03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md | 14.0→14.1 | `cba186eb0d5fda3c7b9a99ea0fb6c819e8ba72b6b439b74249ba96fd473fc7c5` | `03cafb8b2b34ddbe3726ce55bcbef8f7ac9d406baf3224d2f0b8b581f72dd5ba` | YES (EOF) |
| 04 | 04_PHASE5_TASK_PACKET_TEMPLATE_V1.md | 1.1 | `0298f5391bfee2c3771e24b7b51aedd08580de4d6cc79a73651a3d9c5720d6b1` | `0298f5391bfee2c3771e24b7b51aedd08580de4d6cc79a73651a3d9c5720d6b1` | no |
| 05 | 05_PHASE5_BUSINESS_CLOSE_PROMPT_V1.md | 1.0→1.1 | `a5d64bc0e00704d557627c7c5e3390cdec94a6116b6371750c5ed6bb4de538fd` | `65add1032baaaa595cf4eda63d5b7b10805b720cab6766a1940ff5b794338cad` | YES (EOF) |
| 06 | 06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md | 1.1→1.2 | `79e9f070e4e343b5774f0e4390bc6c95895211ea8abe8a64a14f9b53453c3be4` | `ee2ea1d9908f473ec91a5fd43169ecc5068ca9365757f7a30b50ec415d81c1eb` | YES (human_approval除去 + EOF) |
| 07 | 07_PHASE5_CODEX_SINGLE_PROMPT_V15.md | 15.1→15.2 | `9810c9c0fe9476880ca8a3f2207b50127a47e56df04b896743c7de064af068e9` | `84ea784c4b1d3ed615bc127572650dfc1c12cdf24ba0800cc18324d8049c68a7` | YES (human_approval除去 + EOF) |

### 11.3 Manifest / Packet hash（rev3初版 → rework2）

- manifest content hash: `93c450f1f7ef326f821277fdbe17ffdb7a79890de6d145060a04c5e346fd6dad` → `73d0fe7a3e7a1ecab3665be042bc0729b2d19d0bae34576f70a980a4aa76e53d`
- manifest cross-check（記載sha256 == 実ファイルsha256、全8件）: `MANIFEST_ALL_MATCH`
- Packet本文 SHA-256: `8631a72567b2161506725ce6de839dbb576d2ff1a61df8f3e0b9a7a95de1d13a` → `dd1497641c0be46f4605bc19da599306a784ed9f161aa735e847e9def2444632`
- Packet本文は自身のhashを埋め込まない（`packet_sha256: EXTERNAL`）。本Evidence本文も自身のhashを埋め込まない。

### 11.4 finding解消の検証

- B-P5-GOV-01: 06/07 §6のTask Packet必須YAMLに `human_approval` が存在しない（除去済み）。外部Human Approval Event（8項目一致検証・mismatch/stale/自己承認はfail-closed）へ置換。
- H-P5-R3-01: `git diff --check f822a73998d0dd936f18ad4ac305d01643ed8f83...1ca066ef491acc6dbd08d81b4f42ad29f1e67628` = exit 0（EOF余分空行を除去）。
- B-P5-GOV-R3-01: 本ファイル §6のfinding ID対応表とPacket §13/§19の参照を、人間確定の正しい対応へ修正。
- B-P5-GOV-04: raw baseline_diffをGitへ保存せず、§10に手順・hash・制約・人間受容を記録。
- B-P5-GOV-02: Packet §19 Role RouteのC/D/E = REQUIRED。
- B-P5-GOV-03 / H-P5-001: manifest content-hash-only・循環hashなし／承認者は人間のみ・B/Hは独立確認者。

### 11.5 Scope / boundary（rework2）

- changed files（`git diff --name-only origin/main...HEAD`）はALLOWED_PATHS内のみ。ALLOWED_PATHS外変更 = 0。
- 製品コード / DB / schema / migration / seed / backfill / workflow(.github) / PADN(config/padn) / RBAC / secrets / 外部送信 / 実LLM / 課金 = 0・なし。
- 新規branch / 新規PR / PR本文更新 / Draft解除 / main merge / force push / amend / rebase / reset = なし。
- Draft PR #129 = Draft維持、auto-merge / merge-on-green 未設定。
- 元のdirty checkout（`codex/f1d-e2e-locators`）: byte比較で HEAD_SAME / STATUS_SAME / DIFF_SAME / STASH_SAME（不変）。

### 11.6 未実施（Human Gate / 次工程）

- 最終Packet承認（`PHASE5_TASK_PACKET_APPROVED`）: 未実施。人間（DREEXY-git）のみが、Codex B/H再監査後に行う。
- Codex B/H independent re-audit（read-only）: 未実施。B/Hは承認者ではなく独立確認者。
- main merge / Production: 未実施。人間Gate。

verdict（rework2レーン）: `REVISION3_REWORK2_READY_FOR_BH_REAUDIT`

---

# Provenance Correction — H-P5-R3-R2-01

rework2 head `4225273212cf8adc9973e8deb06bbd34cb2cfe0f` に対するH再監査finding `H-P5-R3-R2-01`（Packet本文に残っていた古いCommit C/D/Eの将来形・正本表現）を修正した。docs-only。Prompt 00〜07とmanifestは変更しない。revisionは3のまま維持。

## 12. Packet provenance correction（Commit I / J）

### 12.1 修正内容（Packet）

- §5 FACT: rev3初版のCommit C/D/E、rework2のCommit F/G/Hがいずれも完了・push済みであることを正確に記録。hash照合対象を現行Prompt System正本のCommit G（`1ca066ef…`）に統一。
- §6 Scope: 初版Packet=Commit D・初版Evidence=Commit Eという履歴と、現行Packet=Commit H/I・現行Evidence=Commit H/Jを分離。
- §16 Evidence Required: base→A→B→C→D→E→F→G→H→I→J→headの実在commit chainを完全SHAで記録。
- §17 Rollback: 「Commit C/D/Eをこれから積む」という将来形を削除し、実在のchain（A〜J）へ修正。

### 12.2 commit chain（provenance correction）

- Commit I（Packet provenance correction）: `41f7823725d09df23f48b087e27ea2859004aa73`
- Commit J（final Evidence and new Packet hash = 本コミット）: 自身のSHAは循環回避のため本文へ記載しない。push後にPR #129と報告で提示する。

amend / rebase / reset / force push は不使用。I/Jはrework2 head `4225273…` の上に積むだけ。

### 12.3 hash（provenance correction）

- Packet本文 SHA-256: rework2 `dd1497641c0be46f4605bc19da599306a784ed9f161aa735e847e9def2444632` → provenance correction `d5df4db457bbb16ac0c4c772d6d97b9737871d43f951f24652d32696cc87885e`
- Packet本文は自身のhashを埋め込まない（`packet_sha256: EXTERNAL`）。Packet hashはこのEvidenceと外部Human Approval Eventで固定する。本Evidence本文も自身のhashを埋め込まない。
- manifest content hash: `73d0fe7a3e7a1ecab3665be042bc0729b2d19d0bae34576f70a980a4aa76e53d`（**変更前と同一・不変**）。
- Prompt 00〜07のSHA-256: §11.2の rework2 (after) 値から**不変**。manifest cross-check `MANIFEST_ALL_MATCH`。

### 12.4 検証（provenance correction）

- `git diff --check f822a73998d0dd936f18ad4ac305d01643ed8f83...HEAD` = exit 0。
- Prompt 00〜07 hash = 現行manifestと全8件一致（manifest含め cross-check `MANIFEST_ALL_MATCH`）。
- manifest SHA-256 = 変更前と同一（`73d0fe7a…`）。
- ALLOWED_PATHS外変更 = 0（Packet と Evidence のみ）。
- 製品コード / DB / schema / migration / workflow / PADN 変更 = 0。
- 元のdirty checkout（`codex/f1d-e2e-locators`）: HEAD_SAME / STATUS_SAME / DIFF_SAME / STASH_SAME（不変）。
- Draft PR #129 = Draft維持、PR本文未更新、auto-merge未設定。新規branch / 新規PR = なし。

### 12.5 未実施（Human Gate）

- 最終Packet承認（`PHASE5_TASK_PACKET_APPROVED`）: 未実施。人間のみが、Codex B/H再監査後に行う。
- Codex B/H independent re-audit（read-only、新fixed head対象）: 未実施。B/Hは独立確認者。
- main merge / Production: 未実施。人間Gate。

verdict（provenance correctionレーン）: `REVISION3_PROVENANCE_READY_FOR_BH_REAUDIT`
