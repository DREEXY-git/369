# Codex V74 本番後再監査

## 結論

Phase 3/C21のRelease CandidateとC22はGitHub mainへ履歴付きで統合され、Vercel statusもsuccessになりました。ただし、Codexの固定SHA再監査で現行mainにP2が3件残ることを確認したため、Phase 3・3.5の「完了」にはしません。

- 最新app main: `7efb22b43b781e485a4759fab4145792eeabe92e`
- 判定: `POST_RELEASE_CHANGES_REQUIRED`
- app main / Production / DBへのCodex操作: なし

## 統合された系譜

- PR #32 RC: `8d3ae36f9f036b4125d029c5b7a55cbbc3d04685`
- Phase 3/C21 main merge: `71e0b4267b66e4213b455a87f9c4641a188deb70`
- C22 fixed head: `2884949ceb7a018fa7dc4a27ae5d04b2f829a965`
- PR #33 integration: `0d6de21b2e08792115737e0b7729525bdffad0e9`
- 現行main: `7efb22b43b781e485a4759fab4145792eeabe92e`

旧main、RC、C22はいずれも現行mainのancestorで、確認範囲では履歴欠損はありません。

## 確認済み証拠

### PR #32

- CI `29205251769`: unit 472、E2E 151、failed 0
- artifact `8263616002`: 25 PNGを独立目視
- 320/375/768/1440 topbar、67導線NAV、AI社員一覧・詳細・3D、プロフィール、canvasを確認
- 人間Previewは同じSHA `8d3ae36`を照合済み
- ownerはProduction Readyと安全側envを申告。ただしCodexがProduction機能を実操作した証拠ではありません

### C22

- source CI `29204903544`: unit 483、E2E 155、failed 0
- artifact `8263517090`
- 旧P2の顧客名取得段階、別tenant実在ID、一覧metadata-only監査はテスト済み
- PR #33 integration headにはexact-head GitHub Actionsがなく、Vercel successだけを確認

## 現行mainに残るP2

1. **Control Towerの財務機密閲覧label**
   - 財務シグナルを読んだ`confidential_view`が`INTERNAL`で記録されます。
   - 財務あり経路を`FINANCIAL_CONFIDENTIAL`、redacted経路を`read + INTERNAL`に分離する必要があります。

2. **C22候補外のdirect preview**
   - 候補一覧に出ない顧客でも、直接URLへIDを入れるとFake下書きを作れます。
   - `eligible=true`または候補集合への所属を必須にします。

3. **C22のAI閲覧を人間として監査**
   - AIロールの一覧閲覧が`actorType=user`で記録されます。
   - `user.isAi`から`ai_agent/user`を分けます。

GitHub change request:

- PR #32 comment `4952704653`
- PR #23 comment `4952715449`
- PR #33 comment `4952715510`

## Phaseの現在地

| Phase | 現在地 |
|---|---|
| Phase 3 | main統合済み。ただし財務閲覧監査P2でcompletion HOLD |
| Phase 3.5 C21 | 限定承認経路はmain統合済み。CMS公開・外部送信なし |
| Phase 3.5 C22 | read-only分析はmain統合済み。追加P2 2件でHOLD |
| Phase 3.5 C19 | 独立laneのP2修正・再監査待ち |
| Phase 4 | main未統合。Human Gate限定証拠、Control Plane/Workflow/実queue Gapを維持 |

## 次の安全な作業

Claudeが専用fix-forward laneで3件を修正し、全test・exact-head CI・artifactを取得します。Codexは固定SHAを独立再監査します。新headのmain/Production反映と既存ログのbackfillは人間Gateです。

関連:

- [[CodexV74Phase完了ゲート]]
- [[CodexV74P3R01再監査]]
- [[PhaseReadinessMatrixV3]]
- [[WIPSyncManifestV74]]

「脆弱性ゼロ」「完全無欠」「Phase 3/3.5/4全完成」は宣言しません。
