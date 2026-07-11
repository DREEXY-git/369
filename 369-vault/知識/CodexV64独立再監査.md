# Codex v6.4 独立再監査

- GitHub監査記録: `docs/coordination/codex/V64_INDEPENDENT_REAUDIT_2026-07-12.md`
- 基準SHA: `ba4a696f0f405546c9e963be87c364d493d6b539`
- 最終監査SHA: `9e72958df31c8ee7f9a2636d1c817013c78ab882`
- 状態: `FINAL / CHANGES_REQUIRED`
- Release Gate: `CHANGES_REQUIRED / HOLD`

## 初期基準 `ba4a696` で確認したこと

- escaped outer quote depth 1とinternal quote depth 3の境界で、comma、space、semicolon、LF、brace、bracketの6条件すべてに架空sentinelが残った。
- 従来のescaped comma、raw LF、CRLF、nested、multiple key、unclosedはマスクされ、問題範囲はdepth 3境界へ限定できた。
- mobile NAVの証拠画像は288 x 63pxでブランド行だけだった。
- AI社員一覧の長い権限表示はdesktop/mobileともカード外へ切れていた。
- 3D Office desktopは非blankで、選択プロフィールが表示されていた。
- stale判定とbuild badgeのrole境界は独立オラクルで期待どおりだった。
- roadmap80には定義外Evidence語彙が37箇所残っている。
- BullMQ実queueは`EVIDENCE_GAP`を維持する。

## 最終監査で改善を確認したこと

- CI run `29163593089`は固定SHAをcheckoutし、unit `423/423`、E2E `121/121`、typecheck、lint、build、safetyがgreen。
- mobile NAV画像は`288 x 844`へ復旧し、深い導線へのscroll/clickとEscape閉鎖が通った。
- AI社員カードの長い権限表示はdesktop/mobileとも見切れが解消した。
- 3D Officeは非blankで、選択したCFOとプロフィールの人物名が一致した。
- stale判定、OWNER/ADMIN build表示境界、roadmap80 Evidence語彙は独立確認してthreadを解決した。

## 未解決の重要事項

1. **P1秘密マスク**: 元のdepth1/depth3 6条件は塞がったが、偽closerと異なるdepthの終端を組み合わせた生成matrixは`84/84`でsentinelが残った。曖昧入力のfail-closed未達。
2. **High tenant分離**: AI社員詳細のnested run/action/memoryは子自身のtenantIdで絞られていない。schemaにも複合tenant FKがないため、不整合child行の別tenant情報混入余地がある。
3. **PII最小取得と参照ログ**: 画面で不要なrun input/output/errorまで取得し、memory/actionを表示する経路にDataAccessLogがない。
4. **人物parity証拠**: 8名のkey/fullName/stateは比較したが、portrait/profile全値は3画面で比較していない。
5. **mobile NAV証拠**: 全高・deep link・Escapeは確認したが、描画67件とoverlay閉鎖のE2Eがない。
6. **3D deep-link同期**: `/ai-office?agent=<id>`をclient-sideで別IDへ切り替えた時、初回stateが残ってURLと表示人物がずれるP2がある。
7. BullMQ実queueとHuman Previewは引き続き`EVIDENCE_GAP`/pending。

## 最終判定

Criticalは確認範囲で0だが、High/P1が2件残るためPASSではない。元8threadのうち3件だけを解決し、後着のdeep-link P2を含め未解決は11件。Matrix V3は作らず、PR #14、main、ProductionをHOLDする。

次はClaudeが(1)一般化depth matrixの全4経路、(2)child tenant/minimal select/DataAccessLog、(3)profile fingerprint・mobile NAV証拠・deep-link同期を修正する。Codexは次の固定SHAで再監査する。main、Production、DB、Secrets、外部送信、実LLM、課金には触れない。
