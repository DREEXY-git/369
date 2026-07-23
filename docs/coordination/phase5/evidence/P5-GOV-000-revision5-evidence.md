# P5-GOV-000 revision 5 — Final Evidence

このファイルは、P5-GOV-000 revision 5（Entry Gate 最終一点修正：Human Approval Event の comment_id / comment_url 自己参照除去・payload / envelope 分離）の証拠を永続化する append-only 記録である。承認記録ではない。最終 Packet 承認と Codex B/C/D/E/H 再監査は本ファイル作成時点で未実施。rev3 / rev4 Evidence は歴史記録として変更しない。

## 1. Repository / Branch / PR

- repository: `DREEXY-git/369`
- branch: `claude/p5-entry-gate-v1`（既存 branch、通常 push、新規 branch / PR なし）
- target_pr: `https://github.com/DREEXY-git/369/pull/129`（Draft 維持）
- base_sha (origin/main): `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- previous_head（rev4 最終 = Commit M）: `7769ef36c4a8f0e4ebeb42e2f55ecb5dc93c36bc`

## 2. Commit chain（rev5・実在・完全40文字SHA・append-only）

- base: `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- A: `f71837efd5866427f0ba6f3b3b9462fd093286ad`
- B: `509f3b9cc380b961c4e412b3c05056480e285f52`
- C: `6df876ec6bd56982702ef63830a982dccb399dca`
- D: `345c8a4a1a8303874409d3f6a910575d2600675c`
- E: `f0cca809abd6ff37dc5f6182ff44e4cda39269df`
- F: `ade469fb29ebb7a01400a94185f20c92cb13ceef`
- G: `1ca066ef491acc6dbd08d81b4f42ad29f1e67628`
- H: `4225273212cf8adc9973e8deb06bbd34cb2cfe0f`
- I: `41f7823725d09df23f48b087e27ea2859004aa73`
- J: `3f174f4e2303ad09508f99ab6b014860ffde371b`
- K（rev4: 承認イベント統一）: `1ff7fed77ace5f5bab47b1bcf7c3290e87a361d8`
- L（rev4: Packet）: `4612c4f83345d3c56a6b0ee3e8c48a11b74e883c`
- M（rev4: Evidence = rev4 最終 head）: `7769ef36c4a8f0e4ebeb42e2f55ecb5dc93c36bc`
- **N（rev5: Prompt 04/06/07 自己参照除去 + manifest 更新）**: `30e96e260aff60bdaab9ba50bbae24bf93308a37`
- **O（rev5: Revision 5 Packet）**: `0e1a3a510a78ec1593eb4990761f47677b1d1905`
- **P（rev5: 本 Evidence）**: 自身の完全SHAは循環回避のため本文へ記載しない。push 後に PR #129・完了報告・外部 Human Approval Event で固定する。

amend / rebase / reset / force push は不使用。N / O / P は Commit M `7769ef36…` の上に積むだけ。

- Packet 本文 SHA-256（Commit O 時点・外部証拠）: `d930ab1b6b17032a5eaf3a558dab33bed89d73fbf35e0e6da810bb03f9a22ffa`
- Packet 本文は自身のSHA-256を埋め込まない（`packet_sha256: EXTERNAL`）。**本 Evidence 本文も自身のSHA-256を埋め込まない。**
- 「すべての完全SHAを Packet 内部に記録済み」とは表現しない。完全 chain は **Git DAG（親子リンク）と外部 fixed head（Human Approval Event）** で固定する。

## 3. 修正内容 — Human Approval Event の自己参照除去（Commit N・C-P5-GOV-R4-01 / H-P5-R4-APPROVAL-01）

04 / 06 / 07 の Human Approval Event 契約本文を **byte 同一**で次のとおり変更した。

### 3.1 投稿前に確定する comment body payload（7項目のみ・自己参照を含めない）

- `event`（PHASE5_TASK_PACKET_APPROVED）/ `packet_id` / `revision` / `packet_sha256` / `fixed_head_sha` / `human_approver` / `authorization_scope`。
- payload 本文から **除外**したもの: `event_id` / `comment_id` / `comment_url` / payload 自身の hash。

### 3.2 投稿後に GitHub API から取得する本文外 envelope metadata（comment body には書かない）

- `provider` / `repository` / `comment_id` / `comment_url`・`html_url` / `author.login` / `author.type` / `created_at` / `updated_at` / `body_sha256`。

### 3.3 body_sha256 と承認時刻

- `body_sha256` は GitHub API から再取得した `comment.body` の **exact UTF-8 bytes** に対して計算する。trim・改行変換・YAML 再 serialize・Unicode 正規化は行わない。`body_sha256` を同じ comment body へ埋め込まない。
- 承認時刻の正本は GitHub API の `created_at`。`updated_at != created_at` なら編集済みとして fail-closed。
- replay key は `github:<repository>:<comment_id>` で一意化する。

### 3.4 生成手順

- comment body payload を投稿前に確定 → POST は一度だけ → 投稿後の PATCH（編集）禁止 → `comment_id` / `comment_url` を comment body へ追記しない → API envelope は本文外の検証情報。

### 3.5 verifier（GitHub API 再取得で検証・1つでも欠ければ fail-closed）

- `author.login == human_approver`／`author.login == Packet 指定承認者`／`author.type == User`（Bot / App 拒否）／Packet の `packet_id` / `revision` / `packet_sha256` / `fixed_head_sha` / `authorization_scope` 完全一致／再取得 body の `body_sha256` 一致／`updated_at == created_at`／replay key 未使用／stale head 拒否／欠落・取得不能・不一致・AI 自己承認・bot 投稿は fail-closed。

### 3.6 negative test（すべて fail-closed・文書化済み）

- edited comment / bot・app author / author mismatch / stale head / body hash mismatch / duplicate・replayed comment_id / missing API metadata / Packet hash・revision・scope mismatch。

### 3.7 自己参照が 0 件になった証拠（実測）

- 04 / 06 / 07 の承認 payload YAML 内の `event_id:` キー = 0 件。
- `comment_id: <GITHUB_COMMENT_ID>` / `comment_url: <GITHUB_COMMENT_URL>`（旧 payload 埋め込み方式）= 0 件。
- 旧 `approval:` ネスト方式 = 0 件。
- 契約本文（payload + envelope + verifier + negative test）は 04 / 06 / 07 で byte 同一（各1件）。
- （`comment_id` / `comment_url` は §3.2 の本文外 envelope の bullet 項目としてのみ登場し、承認 payload 本文には含まれない。）

## 4. Prompt SHA-256（rev4 → rev5 before/after・Commit N 時点）

| # | File | version | rev4 (before) | rev5 (after, Commit N) | rev5変更 |
|---|---|---|---|---|---|
| 00 | 00_PHASE5_PROMPT_SYSTEM.md | 1.1 | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | no |
| 01 | 01_PHASE5_PROGRAM_CHARTER_V1.md | 1.1 | `0a2a89a30cb3e9381f92f4e7a7e99a3d4951fdc6acb9681645f7b35882dbad8e` | `0a2a89a30cb3e9381f92f4e7a7e99a3d4951fdc6acb9681645f7b35882dbad8e` | no |
| 02 | 02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md | 1.1 | `d5ecf067fe9251f741127f3a7ea2bbfbb21e4d35caa4a877fa6fa5149eae749a` | `d5ecf067fe9251f741127f3a7ea2bbfbb21e4d35caa4a877fa6fa5149eae749a` | no |
| 03 | 03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md | 14.1 | `03cafb8b2b34ddbe3726ce55bcbef8f7ac9d406baf3224d2f0b8b581f72dd5ba` | `03cafb8b2b34ddbe3726ce55bcbef8f7ac9d406baf3224d2f0b8b581f72dd5ba` | no |
| 04 | 04_PHASE5_TASK_PACKET_TEMPLATE_V1.md | 1.2→1.3 | `5b8624cc4937bbb4345642504463e04090b69b404fe3b5862dc9be2ba1ea1149` | `234f650eaa23cf9e59c7332de56c709690daaa91947fefb32fc4a71aacb536ae` | YES (自己参照除去) |
| 05 | 05_PHASE5_BUSINESS_CLOSE_PROMPT_V1.md | 1.1 | `65add1032baaaa595cf4eda63d5b7b10805b720cab6766a1940ff5b794338cad` | `65add1032baaaa595cf4eda63d5b7b10805b720cab6766a1940ff5b794338cad` | no |
| 06 | 06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md | 1.3→1.4 | `2a8b743bfe193801bb0f73fb5bd1e3f41f727f01bb4cc793e80ef91989da26e0` | `6c571c7bcf9726da2892af4e726c7ebadcc040239367bb41003155b6cf29fbe1` | YES (自己参照除去) |
| 07 | 07_PHASE5_CODEX_SINGLE_PROMPT_V15.md | 15.3→15.4 | `8bba350a5de46e03851e0aa52fd0787c3aaf09218e8d523d321d03974a032e01` | `9094e17ed76a684d601c45c380886a4866df5349aa358205f7b6db6f07070e23` | YES (自己参照除去) |
| — | PROMPT_MANIFEST.json | — | `139f8ddad2bf09e45c36be95f0674f6ec49a7f3cd0e33f769438411707c8302d` | `298a342344fd7afd6d5b74ffe9b7dd17c4ef4041a2544c5c6b3dcece2c8c2d7e` | YES |

- manifest cross-check（記載 sha256 == 実ファイル sha256・全8件）: `MANIFEST_ALL_MATCH`。
- manifest は content hash のみ管理。commit SHA を manifest 本文へ書かない（循環参照なし）。

## 5. SHA 表現（Commit O）

- Packet §16 に base と Commit A〜N を完全40文字SHAで記録。
- Commit N 完全SHA（`30e96e26…`）は Packet へ記録可能（N は Commit O=Packet より前に確定）。
- Commit O（Packet 自身を含む）と Commit P（Evidence 自身を含む）は自己SHAを本文へ埋め込まない。
- Commit O 完全SHA `0e1a3a510a78ec1593eb4990761f47677b1d1905` と Packet SHA-256 `d930ab1b6b17032a5eaf3a558dab33bed89d73fbf35e0e6da810bb03f9a22ffa` を本 Evidence へ記録（本項）。
- Commit P 完全SHA と Evidence 本文 SHA-256 は、完了報告と外部 Human Approval Event で固定する（本文へ埋め込まない）。

## 6. 検証結果（実測・exit status）

- `git diff --check f822a73998d0dd936f18ad4ac305d01643ed8f83...HEAD` = exit 0（trailing whitespace / conflict marker 0）。
- 完全SHA = 40文字、SHA-256 = 64桁。
- Prompt 00〜07 hash と manifest が全8件一致（`MANIFEST_ALL_MATCH`）。
- 04 / 06 / 07 の Human Approval Event 契約本文が byte 同一（各1件）・旧自己参照方式（payload 内 event_id / comment_id / comment_url）0 件・旧 `approver` キー 0 件。
- manifest JSON は parse 可能・content-hash-only。
- Packet 本文プレースホルダ（未置換 `<...>`）= 0 件（04 template の `<PACKET_ID>` 等は template の記入例）。
- changed files（N/O/P）= ALLOWED_PATHS 内のみ（`04/06/07`, `PROMPT_MANIFEST.json`, `P5-GOV-000-entry-gate-bootstrap.md`, `P5-GOV-000-revision5-evidence.md`）。ALLOWED_PATHS 外変更 = 0。
- 製品コード（apps / packages / infra）/ DB / schema / migration / seed / backfill / workflow（.github）/ PADN（config/padn）/ RBAC / secrets / env / OAuth / 外部送信 / 実LLM / 課金 = 0・なし。
- 新規 branch / 新規 PR / PR 本文更新 / GitHub 承認コメント投稿 / Draft 解除 / main merge / force push / amend / rebase / reset = なし。
- Draft PR #129 = Draft 維持、auto-merge / merge-on-green 未設定。
- current_head（開始時）= `7769ef36c4a8f0e4ebeb42e2f55ecb5dc93c36bc`（承認の current_head と完全一致）。N→O→P は直列 append。

## 7. Baseline invariance（rev5 環境）

- rev5 の作業は clean な作業 branch `claude/p5-entry-gate-v1` 上でのみ実施。rev5 の作業環境に、編集してはならないユーザー所有の dirty checkout は存在しない。
- rev3 までのローカル dirty checkout baseline（rev3 Evidence §10・別環境）は歴史記録として保持し、rev5 では再取得・変更しない（rev3 / rev4 Evidence は不変）。

## 8. 未実施（Human Gate / 次工程）

- Codex B / C / D / E / H の最終独立再監査（read-only・rev5 fixed head 対象）: 未実施。Critical / High finding だけを Entry Gate blocker とし、安全性・本人確認・権限・scope・fixed head・hash・外部作用に影響しない Medium / Low の文書表現上の指摘は人間が既知制約として受容し非 blocking（Critical / High を隠す・severity を意図的に下げることはしない）。
- 最終 Packet 承認（`PHASE5_TASK_PACKET_APPROVED`）: 未実施。人間（DREEXY-git）のみが、B/C/D/E/H 再監査後に、§3 の payload / envelope 契約に従って行う。GitHub 承認コメントの投稿は本作業では行わない。
- PR 本文更新 / Draft 解除 / main merge / Production: 未実施。人間 Gate。

verdict（rev5 レーン）: `REVISION5_FINAL_READY_FOR_BCDEH`
