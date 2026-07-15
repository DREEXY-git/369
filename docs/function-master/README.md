# 369 / IKEZAKI OS 完全機能台帳

## 目的

添付原典に含まれる機能・候補・禁止事項・安全要件・運用要件を、安定ID付きで追跡します。
ロードマップ、統合プロンプト、Issue、実装、テスト、監査証拠を同じFunction IDで接続し、機能の見落としと場当たり的な実装を防ぎます。

## 正本と鏡像

| 役割 | パス | 編集方法 |
|---|---|---|
| GitHub人間可読正本 | `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md` | 生成のみ |
| GitHub機械可読正本 | `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.json` | 生成のみ |
| 原典指紋・件数 | `docs/function-master/SOURCE_MANIFEST_V1.json` | 生成のみ |
| 実装証拠 | `docs/function-master/FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md` | 証拠確認後に追記 |
| Codex Phase Director現在地 | `docs/coordination/codex/V88_PHASE_DIRECTOR_STATE.md` | 固定SHAのPASS/HOLD後に更新。`V87_*`は履歴として保持 |
| Phase 3欠陥・Gate Matrix | `docs/coordination/codex/V88_PHASE3_DEFECT_AND_GATE_MATRIX.md` | 固定SHAとGitHub判定を記録 |
| GitHub/Obsidian同期Manifest | `docs/coordination/codex/V88_SYNC_MANIFEST.md` | app/vaultの同期段階とhashを記録 |
| v5.8独立再レビュー | `docs/function-master/V58_INDEPENDENT_REREVIEW_2026-07-11.md` | 固定SHA・CI・artifact・統合dry-run確認後に追記 |
| Obsidian閲覧鏡像 | `369-vault/知識/完全機能台帳/` | 生成のみ |
| 生成器 | `scripts/generate-complete-function-ledger.mjs` | レビュー付きで変更 |

GitHubを更新権限のある正本とし、Obsidianには同じ正本内容を分割した閲覧鏡像を置きます。
両者を手で二重管理しません。これにより、内容は双方から読めても、競合する二つの正本は生まれません。

## v1の抽出範囲

- Appendix A: 50カテゴリ、原子機能2,553件
- Appendix A Global AI Rules: 51記録
- Appendix A後半の補足・追加領域・差別化・MVP制約・docs候補: 1,963記録
- Appendix B Function Master: 126領域
- Appendix B FM231-FM252: 22 Candidate群、詳細349件
- Appendix Bの製品構造・ロードマップ・成長・禁止・安全・運用要件: 2,362記録
- 添付後にユーザーが明示した追加要件: 9件

生成器の `outputFiles: 60` は、GitHub生成正本3件とObsidian閲覧鏡像57件の合計です。
「Obsidian鏡像60件」ではありません。実装証拠台帳、README、独立レビュー文書は生成対象外です。

重複して見える原典記録も削除していません。原典忠実性を優先し、正規化・統合判断は別の設計作業として扱います。

## ID系列

| 系列 | 意味 | 例 |
|---|---|---|
| `Cxx-nnn` | Appendix A 50カテゴリの原子機能 | `C07-041` |
| `GAR-nnn` | 全体共通AIルール | `GAR-020` |
| `A-SUP-nnn` | Appendix A後半の補足記録 | `A-SUP-001` |
| `FMR-...` | Function Master領域 | `FMR-V21-001` |
| `FM231`-`FM252` | Candidate群 | `FM237` |
| `FMxxx-nnn` | Candidate内の詳細機能 | `FM237-001` |
| `Bxx-nnn` | Appendix Bの節別要件 | `B36-001` |
| `USR-nnn` | 添付後のユーザー追加要件 | `USR-003` |

## 既知の原典欠落

`C49 App Review / Marketplace Governance` は50カテゴリ索引にはありますが、Appendix Aの詳細節がありません。
したがってC49は `SOURCE_DETAIL_MISSING` が正しい状態です。

- C49を0機能の完成カテゴリとして扱わない
- FM237など別系列のCandidateで、C49を黙って補完しない
- 原典追補を受領した場合はv1を上書きせず、差分レビュー後に新バージョンを作る

## 実装状態の原則

完全機能台帳は「要求が存在する証拠」であり、「実装済みの証拠」ではありません。
`FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md` にFunction ID単位の証拠がない項目は、すべて `IMPLEMENTATION_UNVERIFIED` です。

次を禁止します。

- 画面名やモデル名が似ているだけで実装済みにする
- カテゴリの一部実装からカテゴリ全体を完成扱いする
- テスト未実行をgreen扱いする
- `UNKNOWN` や証拠不足を0件扱いする
- ユーザー実測とAI自身の直接確認を混同する
- Candidateを承認なしに正式Function Masterへ昇格する

## 毎タスクの必須手順

1. read-only scoutでgit refs、作業ツリー、`tasks/CURRENT_STATE.md`を確認する。
2. 本README、完全機能台帳、実装証拠台帳、統合プロンプト、全体ロードマップを読む。
3. 対象Function IDを最低1つ選び、非対象IDと境界も明記する。
4. Definition of Ready、完了条件、検証、停止条件を固定する。
5. WIPを原則1にし、承認範囲だけを実装する。
6. テスト・安全確認・差分確認を実行し、事実と未確認を分ける。
7. 証拠が増えたFunction IDだけ実装証拠台帳へ追記する。
8. 原典台帳を変更していない場合も、生成同期チェックを通す。
9. GitHub正本とObsidian鏡像の同期状態を最終報告する。
10. commit、push、PR、deploy、DB操作、外部送信などは既存の人間承認ゲートに従う。

## 生成と検証

標準:

~~~bash
node scripts/generate-complete-function-ledger.mjs \
  --source /absolute/path/to/pasted-text.txt
node scripts/generate-complete-function-ledger.mjs \
  --source /absolute/path/to/pasted-text.txt \
  --check
~~~

原典はリポジトリへ複製しません。毎回 `--source` を指定するか、同じ絶対パスを
`FUNCTION_LEDGER_SOURCE` に設定してください。生成器は原典SHA-256が一致しない場合に停止します。

生成器は次を満たさない場合に失敗します。

- v1原典のraw SHA-256が一致する
- 50カテゴリと2,553原子機能が一致する
- 詳細節欠落がC49だけである
- Function Masterが126領域である
- FM231-FM252が連番22群、詳細349件である
- 補足・横断要件の件数が固定値と一致する
- `--check` 時に全生成ファイルがバイト単位で同期している

## バージョニング

v1のFunction IDは原典指紋に対して不変です。原典が更新された場合は、v1を再解釈して上書きしません。

1. 新原典のSHA-256を固定する
2. v1との差分表を作る
3. 追加・変更・廃止を人間レビューする
4. v2台帳とID移行表を作る
5. ロードマップ、統合プロンプト、証拠台帳の参照を更新する

## 必須参照先

- `tasks/CURRENT_STATE.md`
- `docs/roadmap/69_bplus_parallel_roadmap_canonicalization_candidate.md`
- `docs/roadmap/72_function_evidence_map_v56_candidate.md`
- `docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md`
- `docs/function-master/FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md`
- `docs/function-master/V58_INDEPENDENT_REREVIEW_2026-07-11.md`

統合プロンプトやロードマップを更新する際は、本台帳と実装証拠台帳を必須参照にしてください。
統合プロンプト自体のGitHub正本化は、この台帳同期PRの対象外です。
