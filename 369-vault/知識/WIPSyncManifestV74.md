# WIP Sync Manifest V74

- 作成日時: 2026-07-13 02:35 JST
- app Evidence branch: `codex/v74-phase-completion-gate`
- app main: 未変更
- vault main: 同期処理前
- note正本: `369-vault/知識/CodexV74Phase完了ゲート.md`

自己参照するcommit SHAはMarkdown本文へ埋め込めないため、`app Evidence commit`は最初のEvidence content commit、`independent vault commit`は同内容を載せたvault content commitを指す。後続のmanifest照合commitはGit履歴で追跡する。

| WIP ID | workstream | Claude PR | Claude固定SHA | code tree hash | CI run | artifact ID | Codex verdict | app Evidence commit | in-repo note path | independent vault commit | vault main commit | note SHA-256 | wikilink | secret scan | Human Gate | timestamp | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `P3-R01` | `P3-GROWTH` | #29 | `96172e5d2eec623a514970992ff1afef9d2613a4` | `e0ef935e7aa1075d8a371590c729bef14da5f842` | なし | なし | `CHANGES_REQUIRED` | `d740cf20eb7484442bc333d688fdb694c6ff7d4b` | `369-vault/知識/CodexV74Phase完了ゲート.md` | `PENDING` | `PENDING` | `3e209a04a8a87bd6655082d79149383ea220dea8cc54627848100151af140c1c` | `NEW_LINK_GREEN / baseline 5 missing notes` | `GREEN` | machine blocker解消後768px Preview | 2026-07-13 02:35 JST | `HOLD_SYNC_IN_PROGRESS` |
| `P3-Q2C-01` | `P3-Q2C` | #18 | `fa04e7405cf3ab6cb56f329804fc778dde6470b0` | `e0ef935e7aa1075d8a371590c729bef14da5f842` | `29194789992` | `8260681537`（Q2C専用証拠ではない） | `CHANGES_REQUIRED` | `d740cf20eb7484442bc333d688fdb694c6ff7d4b` | `369-vault/知識/CodexV74Phase完了ゲート.md` | `PENDING` | `PENDING` | `3e209a04a8a87bd6655082d79149383ea220dea8cc54627848100151af140c1c` | `NEW_LINK_GREEN / baseline 5 missing notes` | `GREEN` | machine blocker解消後 | 2026-07-13 02:35 JST | `HOLD_SYNC_IN_PROGRESS` |
| `P35-C19-01` | `P35-CHANNELS` | #22 | `e3c410cdbc3fae7f43fac978ef9ff037ba8cd505` | `4baa4284cc7f1e961d476863d8920ecd9a3a67b7` | `29200855770` | `8262397756` | `CHANGES_REQUIRED` | `d740cf20eb7484442bc333d688fdb694c6ff7d4b` | `369-vault/知識/CodexV74Phase完了ゲート.md` | `PENDING` | `PENDING` | `3e209a04a8a87bd6655082d79149383ea220dea8cc54627848100151af140c1c` | `NEW_LINK_GREEN / baseline 5 missing notes` | `GREEN` | blocker解消後Preview/schema Gate | 2026-07-13 02:35 JST | `HOLD_SYNC_IN_PROGRESS` |
| `P35-C22-01` | `P35-CHANNELS` | #23 | `9209ef856523ae2e10a303849dc13a088e1f426c` | `98a6b63b59c3f7e8eecee80864257b771a11ca9a` | なし | なし | `CHANGES_REQUIRED` | `d740cf20eb7484442bc333d688fdb694c6ff7d4b` | `369-vault/知識/CodexV74Phase完了ゲート.md` | `PENDING` | `PENDING` | `3e209a04a8a87bd6655082d79149383ea220dea8cc54627848100151af140c1c` | `NEW_LINK_GREEN / baseline 5 missing notes` | `GREEN` | schema変更時は人間判断 | 2026-07-13 02:35 JST | `HOLD_SYNC_IN_PROGRESS` |
| `P4-CP-01` | `P4-WORKFORCE` | #25 | `c28b9bf5eb0f43a54b55890d24bc95ed10ed218d` | `29467f53e80ba3462a46eafe409e6ea06620ec3d` | なし | なし | `CHANGES_REQUIRED` | `d740cf20eb7484442bc333d688fdb694c6ff7d4b` | `369-vault/知識/CodexV74Phase完了ゲート.md` | `PENDING` | `PENDING` | `3e209a04a8a87bd6655082d79149383ea220dea8cc54627848100151af140c1c` | `NEW_LINK_GREEN / baseline 5 missing notes` | `GREEN` | machine blocker解消後 | 2026-07-13 02:35 JST | `HOLD_SYNC_IN_PROGRESS` |
| `P4-WF-01` | `P4-WORKFORCE` | #26 | `45bde82bc24b61ddcc76de74d2a4c8400468f6c0` | `c19b505cfa0a1deb94b84e85748f75694280e11b` | なし | なし | `CHANGES_REQUIRED` | `d740cf20eb7484442bc333d688fdb694c6ff7d4b` | `369-vault/知識/CodexV74Phase完了ゲート.md` | `PENDING` | `PENDING` | `3e209a04a8a87bd6655082d79149383ea220dea8cc54627848100151af140c1c` | `NEW_LINK_GREEN / baseline 5 missing notes` | `GREEN` | Production workerは別Human Gate | 2026-07-13 02:35 JST | `HOLD_SYNC_IN_PROGRESS` |

`CHANGES_REQUIRED`でも監査結果をHOLDとして同期する。vault main同期とClaude read-only ACKが終わるまで`completed`にしない。
