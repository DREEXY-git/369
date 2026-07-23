# P5-GOV-000 revision 6 — Final Binding Closure Evidence

このファイルは、P5-GOV-000 revision 6（Entry Gate 最終契約整合修正：canonical Authorization schema・`authorization_scope` 厳密複写・`fixed_head_sha` を対象 PR の live `head.sha` へ一意照合・旧「8項目一致」廃止）の証拠を永続化する append-only 記録である。承認記録ではない。最終 Packet 承認と Codex B/C/D/E/H 再監査は本ファイル作成時点で未実施。rev3 / rev4 / rev5 Evidence は歴史記録として変更しない。

## 1. 解消 finding

- `B-P5-GOV-R5-01`
- `C-P5-GOV-R5-01`
- `D`（Revision 5 で廃止済みの旧「8項目一致」Acceptance Criteria 不整合）
- `H-P5-R5-BIND-01`

Revision 5 で解消済みの Human Approval Event 自己参照（payload / envelope 分離）は再導入しない。`fixed_head_sha` と `authorization_scope` の照合先を一意化する。

## 2. Repository / Branch / PR / preflight

- repository: `DREEXY-git/369`
- branch: `claude/p5-entry-gate-v1`（既存 branch、通常 push、新規 branch / PR なし）
- target_pr: `https://github.com/DREEXY-git/369/pull/129`（Draft 維持）
- base_sha (origin/main): `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- previous_head（rev5 最終 = Commit P）: `6a6b2ab687a557d425919a33c521ccc22203ab24`
- preflight: `git fetch origin --prune` 後に `origin/main == base_sha` かつ `origin/claude/p5-entry-gate-v1 == current_head`（`6a6b2ab…`）を完全一致確認（BASE_MATCH / HEAD_MATCH）。不一致なら STALE_INPUT として停止する規律。

## 3. Commit chain（rev6・実在・完全40文字SHA・append-only）

- base: `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- A `f71837efd5866427f0ba6f3b3b9462fd093286ad` … J `3f174f4e2303ad09508f99ab6b014860ffde371b`（rev1〜rev3・詳細は rev3 Evidence）
- K `1ff7fed77ace5f5bab47b1bcf7c3290e87a361d8` / L `4612c4f83345d3c56a6b0ee3e8c48a11b74e883c` / M `7769ef36c4a8f0e4ebeb42e2f55ecb5dc93c36bc`（rev4・詳細は rev4 Evidence）
- N `30e96e260aff60bdaab9ba50bbae24bf93308a37` / O `0e1a3a510a78ec1593eb4990761f47677b1d1905` / P `6a6b2ab687a557d425919a33c521ccc22203ab24`（rev5・詳細は rev5 Evidence）
- **Q（rev6: Prompt 02/04/06/07 canonical authorization + 承認契約 + manifest 更新）**: `ffd98eed405e6dfd21740db98dc1daf056101cfe`
- **R（rev6: Revision 6 Packet）**: `222bdd66953e5be7817d12fdf751b002035f5b18`
- **S（rev6: 本 Evidence）**: 自身の完全SHAは循環回避のため本文へ記載しない。push 後に PR #129・完了報告・外部 Human Approval Event で固定する。

amend / rebase / reset / force push は不使用。Q / R / S は Commit P `6a6b2ab…` の上に積むだけ（Q→R→S 直列）。

- Packet 本文 SHA-256（Commit R 時点・外部証拠）: `490ed5b528d1a1f6b0796da105c1e0d91c61a12f9a5854810d039dc84bcfd231`
- Packet 本文は自身のSHA-256を埋め込まない（`packet_sha256: EXTERNAL`）。**本 Evidence 本文も自身のSHA-256を埋め込まない。**
- 「すべての完全SHAを Packet 内部に記録済み」とは表現しない。完全 chain は Git DAG（親子リンク）と外部 fixed head（Human Approval Event）で固定する。

## 4. canonical Authorization schema（Commit Q / R）

Prompt 02 / 04 / 06 のテンプレートと実 Packet §10 の Authorization を次の canonical key set へ統一した（旧キー `normal_commit` / `normal_push_to_existing_branch` は現行 schema に 0 件）。

- template（02 / 04 / 06）:

```yaml
authorization:
  repository: <OWNER/REPO>
  branch: <EXISTING_BRANCH>
  existing_branch_only: true
  read_only: true
  edit_local: false
  run_local_checks: false
  commit: false
  push: false
  open_draft_pr: false
```

- P5-GOV-000 実 Packet §10（実値）:

```yaml
authorization:
  repository: DREEXY-git/369
  branch: claude/p5-entry-gate-v1
  existing_branch_only: true
  read_only: true
  edit_local: true
  run_local_checks: true
  commit: true
  push: true
  open_draft_pr: false
```

Human Approval Event の `authorization_scope` は、Packet の `authorization` object を変換・省略・default 補完せず、同じキー・型・値で複写したものとする（canonical key set 一致: `repository` / `branch` / `existing_branch_only` / `read_only` / `edit_local` / `run_local_checks` / `commit` / `push` / `open_draft_pr`）。verifier は strict YAML parse 後に recursive exact semantic equality で比較し、duplicate key / unknown key / missing key / YAML alias・tag / 型不一致 / legacy key / implicit default を拒否する（`read_only` / `repository` / `branch` / `existing_branch_only` も比較対象）。`push: true` でも指定既存 branch 以外への push は許可しない。

## 5. fixed_head_sha の GitHub live head 照合規則（H-P5-R5-BIND-01）

- `fixed_head_sha` は Packet 内フィールドとの比較対象にしない。
- Packet の `repository` / `target_pr` / `branch` を使い GitHub API から対象 PR を再取得し、Event.`fixed_head_sha` が検証時点の対象 PR の live `head.sha` と完全一致することを要求する。
- API の `repository` / PR / `head.ref` も Packet と完全一致させる。head が 1 commit でも変われば stale として fail-closed。
- `fixed_head_sha` を Packet 本文へ埋め込んで循環参照を作らない。
- 3契約（04 / 06 / 07）で live PR head.sha 照合規則は byte 同一。

## 6. Human Approval Event（Revision 5 方式を維持）

- 投稿前 comment body payload は 7 top-level 項目のみ: `event` / `packet_id` / `revision` / `packet_sha256` / `fixed_head_sha` / `human_approver` / `authorization_scope`。`event_id` / `comment_id` / `comment_url` / `body_sha256` を本文に含めない。
- 投稿後 GitHub API envelope（本文外）: `provider` / `repository` / `comment_id` / `comment_url`・`html_url` / `author.login` / `author.type` / `created_at` / `updated_at` / `body_sha256`。
- `body_sha256` は API 再取得 `comment.body` の exact UTF-8 bytes へ計算（trim / 改行変換 / YAML 再 serialize / Unicode 正規化なし）。POST 一度・投稿後 PATCH 禁止・`updated_at != created_at` は fail-closed・replay key `github:<repository>:<comment_id>`。

## 7. negative test（すべて fail-closed・文書化済み）

`fixed_head_sha != live PR head.sha` / repository mismatch / target PR mismatch / branch mismatch / missing authorization key / unknown authorization key / legacy `normal_commit` key / legacy `normal_push_to_existing_branch` key / authorization value・type mismatch / `read_only` omission / `existing_branch_only` omission または false / edited comment / bot・app author / author mismatch / body hash mismatch / duplicate・replayed comment_id / missing API metadata / Packet hash・revision mismatch / AI 自己承認。

## 8. Prompt SHA-256（rev5 → rev6 before/after・Commit Q 時点）

| # | File | version | rev5 (before) | rev6 (after, Commit Q) | rev6変更 |
|---|---|---|---|---|---|
| 00 | 00_PHASE5_PROMPT_SYSTEM.md | 1.1 | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | no |
| 01 | 01_PHASE5_PROGRAM_CHARTER_V1.md | 1.1 | `0a2a89a30cb3e9381f92f4e7a7e99a3d4951fdc6acb9681645f7b35882dbad8e` | `0a2a89a30cb3e9381f92f4e7a7e99a3d4951fdc6acb9681645f7b35882dbad8e` | no |
| 02 | 02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md | 1.1→1.2 | `d5ecf067fe9251f741127f3a7ea2bbfbb21e4d35caa4a877fa6fa5149eae749a` | `558fd6110c287f9f016f1b7656ca4f3d4b98e969b3924497fac04e8d1fc9740e` | YES (canonical authorization) |
| 03 | 03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md | 14.1 | `03cafb8b2b34ddbe3726ce55bcbef8f7ac9d406baf3224d2f0b8b581f72dd5ba` | `03cafb8b2b34ddbe3726ce55bcbef8f7ac9d406baf3224d2f0b8b581f72dd5ba` | no |
| 04 | 04_PHASE5_TASK_PACKET_TEMPLATE_V1.md | 1.3→1.4 | `234f650eaa23cf9e59c7332de56c709690daaa91947fefb32fc4a71aacb536ae` | `b6a479576b787d268be49c6ec80caa9de03bae08251aeda7aed63035190b3c52` | YES (canonical authorization + 承認契約) |
| 05 | 05_PHASE5_BUSINESS_CLOSE_PROMPT_V1.md | 1.1 | `65add1032baaaa595cf4eda63d5b7b10805b720cab6766a1940ff5b794338cad` | `65add1032baaaa595cf4eda63d5b7b10805b720cab6766a1940ff5b794338cad` | no |
| 06 | 06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md | 1.4→1.5 | `6c571c7bcf9726da2892af4e726c7ebadcc040239367bb41003155b6cf29fbe1` | `dfc620dfb0ad3c81918534a9ead8a55b591f3387ea18bd70eda1c261b093123d` | YES (canonical authorization + 承認契約) |
| 07 | 07_PHASE5_CODEX_SINGLE_PROMPT_V15.md | 15.4→15.5 | `9094e17ed76a684d601c45c380886a4866df5349aa358205f7b6db6f07070e23` | `c3a0b25b29efed20787792db5a2d503a69337125f6f236cd2302d5998f433a57` | YES (承認契約) |
| — | PROMPT_MANIFEST.json | — | `298a342344fd7afd6d5b74ffe9b7dd17c4ef4041a2544c5c6b3dcece2c8c2d7e` | `c64a39785cf2d36aa3c78fd7638fce9422f4ceafd1359a1fcf2b02e297d4ec6d` | YES |

- manifest cross-check（記載 sha256 == 実ファイル sha256・全8件）: `MANIFEST_ALL_MATCH`。
- 04 / 06 / 07 の Human Approval Event 契約本文は byte 同一（各1件）。

## 9. before / after dirty checkout 比較（今回 preflight 取得分のみ）

過去セッションの歴史的 baseline artifact は要求しない。今回 preflight で取得した before と、Commit S 完了後の after だけを比較する。

| 対象 | before（作業開始時） | after（Q/R/S 完了後） |
|---|---|---|
| working tree（uncommitted file entries） | 0 件（clean） | 0 件（clean） |
| `git diff`（unstaged tracked, bytes / sha256） | 0 / `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 / 同一 |
| `git stash list`（bytes / sha256） | 0 / `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 / 同一 |
| `git status` file entries | なし | なし |

- 編集してはならないユーザー所有の dirty checkout は本作業環境に存在しない。作業は clean な作業 branch `claude/p5-entry-gate-v1` 上でのみ実施。
- HEAD は sanctioned な Q→R→S の3コミットで前進する（`6a6b2ab…` → S）。uncommitted な dirty 差分・stash は before/after で byte 同一（いずれも空）。
- dirty diff 本文・Secrets は Evidence / Git へ保存しない。

## 10. 検証結果（実測・exit status）

- `git diff --check f822a73998d0dd936f18ad4ac305d01643ed8f83...HEAD` = exit 0（trailing whitespace / conflict marker 0）。
- 完全SHA = 40文字、SHA-256 = 64桁。
- Prompt 00〜07 hash と manifest が全8件一致（`MANIFEST_ALL_MATCH`）。
- Packet.`authorization` と Event.`authorization_scope` の canonical key set 一致（9キー）。旧キー `normal_commit` / `normal_push_to_existing_branch` は現行 schema に 0 件。
- 現行要件としての「8項目一致」= 0 件（歴史記録の言及はすべて「Revision 5 で廃止済みの旧方式」と明記）。
- Event `fixed_head_sha` の Packet 完全一致要求 = 0 件（照合先は live PR head.sha に一意化）。
- 04 / 06 / 07 の承認契約本文 byte 同一・旧自己参照方式（payload 内 event_id / comment_id / comment_url）0 件。
- manifest JSON parse 可能・content-hash-only。Packet placeholder（未置換 `<...>`）= 0 件。
- changed files（Q/R/S）= ALLOWED_PATHS 内のみ（`02/04/06/07`, `PROMPT_MANIFEST.json`, Packet, `revision6-evidence.md`）。ALLOWED_PATHS 外 = 0。
- 製品コード / DB / schema / migration / seed / backfill / workflow(.github) / PADN(config/padn) / RBAC・ABAC / secrets / 外部送信 / 実LLM / 課金 = 0・なし。
- 新規 branch / 新規 PR / PR 本文更新 / GitHub 承認コメント投稿 / Draft 解除 / main merge / force push / amend / rebase / reset = なし。
- current_head（開始時）= `6a6b2ab687a557d425919a33c521ccc22203ab24`（承認の current_head と完全一致）。Q→R→S 直列 append。
- exact-head CI（PR #129・head = Commit S）: push 後に実行し、全 job 結果を完了報告で固定する（本 Evidence 確定時点では未実行）。

## 11. 残存制約

- Codex B / C / D / E / H の最終独立再監査（read-only・rev6 fixed head 対象）: 未実施。Critical / High finding だけを Entry Gate blocker とし、安全性・本人確認・権限・scope・fixed head・hash・外部作用に影響しない Medium / Low の文書表現上の指摘は人間が既知制約として受容し非 blocking（Critical / High を隠す・severity を意図的に下げることはしない）。
- 最終 Packet 承認（`PHASE5_TASK_PACKET_APPROVED`）: 未実施。人間（DREEXY-git）のみが、B/C/D/E/H 再監査後に、§4/§5/§6 の canonical authorization・live-head・payload/envelope 契約に従って行う。GitHub 承認コメントの投稿は本作業では行わない。
- §15 Test Plan の baseline 行が参照する別環境パスは rev3 期の歴史的テスト記述であり、rev6 では該当 dirty checkout が存在しない（§9 の today preflight を正とする）。
- PR 本文更新 / Draft 解除 / main merge / Production: 未実施。人間 Gate。

verdict（rev6 レーン）: `REVISION6_FINAL_READY_FOR_BCDEH`
