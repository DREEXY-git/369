# P5-GOV-000 revision 4 — Final Evidence

このファイルは、P5-GOV-000 revision 4（Entry Gate 最後の修正：Prompt 04/06/07 の Human Approval Event 統一・§16 完全SHA・§5 将来形除去）の証拠を永続化する append-only 記録である。承認記録ではない。最終 Packet 承認と Codex B/C/D/E/H 再監査は本ファイル作成時点で未実施。rev3 Evidence（`P5-GOV-000-revision3-evidence.md`）は歴史記録として変更しない。

## 1. Repository / Branch / PR

- repository: `DREEXY-git/369`
- branch: `claude/p5-entry-gate-v1`（既存 branch、通常 push、新規 branch / PR なし）
- target_pr: `https://github.com/DREEXY-git/369/pull/129`（Draft 維持）
- base_sha (origin/main): `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- approved_current_head（rev3 最終 = Commit J）: `3f174f4e2303ad09508f99ab6b014860ffde371b`

## 2. Commit chain（rev4・実在・完全40文字SHA・append-only）

- base: `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- A（bootstrap prompt system）: `f71837efd5866427f0ba6f3b3b9462fd093286ad`
- B（rev2 packet）: `509f3b9cc380b961c4e412b3c05056480e285f52`
- C（rev3 prompt remediation）: `6df876ec6bd56982702ef63830a982dccb399dca`
- D（rev3 packet）: `345c8a4a1a8303874409d3f6a910575d2600675c`
- E（rev3 evidence）: `f0cca809abd6ff37dc5f6182ff44e4cda39269df`
- F（rework2 pre-rework evidence）: `ade469fb29ebb7a01400a94185f20c92cb13ceef`
- G（rework2 prompt + manifest）: `1ca066ef491acc6dbd08d81b4f42ad29f1e67628`
- H（rework2 packet + evidence）: `4225273212cf8adc9973e8deb06bbd34cb2cfe0f`
- I（provenance correction packet）: `41f7823725d09df23f48b087e27ea2859004aa73`
- J（provenance correction evidence = rev3 最終 head）: `3f174f4e2303ad09508f99ab6b014860ffde371b`
- **K（rev4: Prompt 04/06/07 Human Approval Event 統一 + manifest 更新）**: `1ff7fed77ace5f5bab47b1bcf7c3290e87a361d8`
- **L（rev4: Revision 4 Packet）**: `4612c4f83345d3c56a6b0ee3e8c48a11b74e883c`
- **M（rev4: 本 Evidence）**: 自身の完全SHAは循環回避のため本文へ記載しない。push 後に PR #129・完了報告・外部 Human Approval Event で固定する。

amend / rebase / reset / force push は不使用。K / L / M は Commit J `3f174f4…` の上に積むだけ。

- Packet 本文 SHA-256（Commit L 時点・外部証拠）: `aea9a9d2b62f1d1ebcb8fbed3ea1f01e4b18cdceece074a67f6001593bd5ee3f`
- Packet 本文は自身のSHA-256を埋め込まない（`packet_sha256: EXTERNAL`）。**本 Evidence 本文も自身のSHA-256を埋め込まない。**
- 「すべての完全SHAを Packet 内部に記録済み」とは表現しない。完全 chain は **Git DAG（親子リンク）と外部 fixed head（Human Approval Event）** で固定する。

## 3. 最終修正1 — Human Approval Event 統一（Commit K）

- 04 / 06 / 07 に単一スキーマの Human Approval Event を **byte 同一**で配置した（`event: PHASE5_TASK_PACKET_APPROVED` / `approval` 8項目 / `authorization_scope` 5項目 / `event_id` 4項目）。
- 旧キー `approver` を廃止し `human_approver` に統一（04/06/07 とも独立した `approver:` キー 0 件）。
- `approval` 必須8項目（04/06/07 で一致）: `packet_id` / `revision` / `packet_sha256` / `fixed_head_sha` / `human_approver` / `authorization_scope` / `approved_at` / `event_id`。
- GitHub author / event 認証規則（04/06/07 で一致）: `author.login == human_approver`／`author.login == Packet 指定承認者`／`author.type == User`（Bot / App 不可）／`comment_id` と `comment_url` が実在コメントと一致／`updated_at == created_at`（編集済みコメントは無効）／`event_id` の重複・再利用禁止／`packet_id` / `revision` / `packet_sha256` / `fixed_head_sha` 完全一致／`authorization_scope` 完全一致／stale・欠落・不一致・AI自己承認・bot 投稿は fail-closed。
- 承認者は人間のみ。B・H を含む Codex A〜H は独立確認者であり `PHASE5_TASK_PACKET_APPROVED` を付与しない。Claude Code も自己宣言しない。

## 4. 最終修正2 — SHA 表現（Commit L）

- Packet §16 に base と Commit A〜K を完全40文字SHAで記録した。
- Commit K 完全SHA（`1ff7fed7…`）は Packet へ記録可能（K は Commit L=Packet より前に確定）。
- Commit L（Packet 自身を含む）と Commit M（Evidence 自身を含む）は自己SHAを本文へ埋め込まない。
- Commit L 完全SHA `4612c4f83345d3c56a6b0ee3e8c48a11b74e883c` と Packet SHA-256 `aea9a9d2b62f1d1ebcb8fbed3ea1f01e4b18cdceece074a67f6001593bd5ee3f` を本 Evidence へ記録（本項）。
- Commit M 完全SHA と Evidence 本文 SHA-256 は、完了報告と外部 Human Approval Event で固定する（本文へ埋め込まない）。
- Packet §5 から完了済み commit（A〜K）の「これから積む」将来形を除去した。

## 5. Prompt SHA-256（rev3 → rev4 before/after・Commit K 時点）

| # | File | version | rev3 (before) | rev4 (after, Commit K) | rev4変更 |
|---|---|---|---|---|---|
| 00 | 00_PHASE5_PROMPT_SYSTEM.md | 1.1 | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | no |
| 01 | 01_PHASE5_PROGRAM_CHARTER_V1.md | 1.1 | `0a2a89a30cb3e9381f92f4e7a7e99a3d4951fdc6acb9681645f7b35882dbad8e` | `0a2a89a30cb3e9381f92f4e7a7e99a3d4951fdc6acb9681645f7b35882dbad8e` | no |
| 02 | 02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md | 1.1 | `d5ecf067fe9251f741127f3a7ea2bbfbb21e4d35caa4a877fa6fa5149eae749a` | `d5ecf067fe9251f741127f3a7ea2bbfbb21e4d35caa4a877fa6fa5149eae749a` | no |
| 03 | 03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md | 14.1 | `03cafb8b2b34ddbe3726ce55bcbef8f7ac9d406baf3224d2f0b8b581f72dd5ba` | `03cafb8b2b34ddbe3726ce55bcbef8f7ac9d406baf3224d2f0b8b581f72dd5ba` | no |
| 04 | 04_PHASE5_TASK_PACKET_TEMPLATE_V1.md | 1.1→1.2 | `0298f5391bfee2c3771e24b7b51aedd08580de4d6cc79a73651a3d9c5720d6b1` | `5b8624cc4937bbb4345642504463e04090b69b404fe3b5862dc9be2ba1ea1149` | YES (承認イベント統一) |
| 05 | 05_PHASE5_BUSINESS_CLOSE_PROMPT_V1.md | 1.1 | `65add1032baaaa595cf4eda63d5b7b10805b720cab6766a1940ff5b794338cad` | `65add1032baaaa595cf4eda63d5b7b10805b720cab6766a1940ff5b794338cad` | no |
| 06 | 06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md | 1.2→1.3 | `ee2ea1d9908f473ec91a5fd43169ecc5068ca9365757f7a30b50ec415d81c1eb` | `2a8b743bfe193801bb0f73fb5bd1e3f41f727f01bb4cc793e80ef91989da26e0` | YES (承認イベント統一) |
| 07 | 07_PHASE5_CODEX_SINGLE_PROMPT_V15.md | 15.2→15.3 | `84ea784c4b1d3ed615bc127572650dfc1c12cdf24ba0800cc18324d8049c68a7` | `8bba350a5de46e03851e0aa52fd0787c3aaf09218e8d523d321d03974a032e01` | YES (承認イベント統一) |
| — | PROMPT_MANIFEST.json | — | `73d0fe7a3e7a1ecab3665be042bc0729b2d19d0bae34576f70a980a4aa76e53d` | `139f8ddad2bf09e45c36be95f0674f6ec49a7f3cd0e33f769438411707c8302d` | YES |

- manifest cross-check（記載 sha256 == 実ファイル sha256・全8件）: `MANIFEST_ALL_MATCH`。
- manifest は content hash のみ管理。commit SHA を manifest 本文へ書かない（循環参照なし）。

## 6. 検証結果（実測・exit status）

- `git diff --check f822a73998d0dd936f18ad4ac305d01643ed8f83...HEAD` = exit 0（trailing whitespace / conflict marker 0）。
- 完全SHA = 40文字、SHA-256 = 64桁。
- Prompt 00〜07 hash と manifest が全8件一致（`MANIFEST_ALL_MATCH`）。
- 04/06/07 の `approval` 8項目一致・GitHub author 認証規則一致・旧 `approver` キー 0 件・CANON（承認イベント統一ブロック）が 3 ファイルに byte 同一で各1件。
- manifest JSON は parse 可能・content-hash-only。
- Packet 本文プレースホルダ（未置換 `<...>`）= 0 件（04 template の `<PACKET_ID>` 等は template の記入例であり Packet の未置換ではない）。
- changed files（K/L/M）= ALLOWED_PATHS 内のみ（`04/06/07`, `PROMPT_MANIFEST.json`, `P5-GOV-000-entry-gate-bootstrap.md`, `P5-GOV-000-revision4-evidence.md`）。ALLOWED_PATHS 外変更 = 0。
- 製品コード（apps / packages / infra）/ DB / schema / migration / seed / backfill / workflow（.github）/ PADN（config/padn）/ RBAC / secrets / env / OAuth / 外部送信 / 実LLM / 課金 = 0・なし。
- 新規 branch / 新規 PR / PR 本文更新 / Draft 解除 / main merge / force push / amend / rebase / reset = なし。
- Draft PR #129 = Draft 維持、auto-merge / merge-on-green 未設定。

## 7. Baseline invariance（rev4 環境）

- rev4 の作業は clean な作業 branch `claude/p5-entry-gate-v1` 上でのみ実施。rev4 の作業環境に、編集してはならないユーザー所有の dirty checkout は存在しない。
- rev3 までのローカル dirty checkout baseline（rev3 Evidence §10・別環境）は歴史記録として保持し、rev4 では再取得・変更しない（rev3 Evidence は不変）。

## 8. 未実施（Human Gate / 次工程）

- Codex B / C / D / E / H の最終独立再監査（read-only・rev4 fixed head 対象）: 未実施。Critical / High finding だけを Entry Gate blocker とし、安全性・本人確認・権限・scope・fixed head・hash・外部作用に影響しない Medium / Low の文書表現上の指摘は人間が既知制約として受容し非 blocking（Critical / High を隠す・severity を意図的に下げることはしない）。
- 最終 Packet 承認（`PHASE5_TASK_PACKET_APPROVED`）: 未実施。人間（DREEXY-git）のみが、B/C/D/E/H 再監査後に行う。
- PR 本文更新 / Draft 解除 / main merge / Production: 未実施。人間 Gate。

verdict（rev4 レーン）: `REVISION4_FINAL_READY_FOR_BCDEH`
