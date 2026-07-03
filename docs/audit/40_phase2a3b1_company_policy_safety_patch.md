# 40. Phase 2-A-3b-1-SAFE — CompanyPolicy 書き込み境界の安全補正記録

> commit `9eea086`（CompanyPolicy 書き込み実装・doc39）の main 反映前に行った安全補正。
> doc39 本文は変更せず、本書（doc40）で補足する。フェーズ: Phase 2-A-3b-1-SAFE / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- main 反映前の安全監査で、**2つの境界を締め直しました**。
- ①**AI mutation禁止**: AIロール（AI社員/AIアシスタント）は、権限設定にかかわらず**会社方針の作成・編集・アーカイブが一切できない**ようにしました（画面の Server Action 側で一律拒否）。
- ②**label は NORMAL / INTERNAL のみ**: 会社方針の作成・編集で扱える機密ラベルを「通常」「社内限」の2つだけに制限しました。**高機密ラベルは writeDataAccess（機密参照ログ）実装時まで保留**（＝次段送り）です。
- 権限ファイル（rbac.ts）・ラベル定義（labels.ts）・DB構造は**一切変更していません**。
- E2E smoke は **13/13 green 維持**。**判定: GO（安全補正完了）**。

## 2. 監査で見つけた事実（read-only 実測）

| # | 事実 | 判断 |
|---|---|---|
| 1 | `AI_AGENT` は既存 RBAC 設計で `knowledge:create` を保有（AIの生成物は下書き原則。他機能向け） | doc39 時点の実装（knowledge:create ガードのみ）では、**AI_AGENT ロールのセッションが会社方針を作成できてしまう理論経路**があった → 補正① |
| 2 | `AI_ASSISTANT` は knowledge の read / ai_read のみ | mutation 不可（変更なしで安全） |
| 3 | `isAiRole(roleKey)` が `@hokko/shared`（rbac.ts）から export 済み・`CurrentUser.roles: RoleKey[]` あり | **rbac.ts 無変更で actions.ts 側の AI 判定が可能** |
| 4 | doc39 実装の許可 label に CONFIDENTIAL / STRICT_SECRET / EXECUTIVE_ONLY が含まれていた | 高機密の閲覧・参照ログ（writeDataAccess）が未実装のまま高機密データを作れるのは順序が逆 → 補正② |
| 5 | externalAiAllowed: true の設定箇所なし・delete/deleteMany なし | 補正不要（維持確認のみ） |

## 3. 補正内容（最小差分・3ファイルのみ）

### 3-1. AIロールの mutation 禁止（`actions.ts`）

- `isHumanUser(user)` を追加: `user.roles` に AIロール（`isAiRole`）が**1つでも含まれれば false**・roles 空も false。
- `createCompanyPolicyAction` / `updateCompanyPolicyAction` / `archiveCompanyPolicyAction` の**3つ全ての先頭**で `isHumanUser` を検査し、AIロールは権限判定より前に一律 `denied` リダイレクト。
- **rbac.ts は無変更**。AI_AGENT の `knowledge:create`（下書き原則・他機能向け）はそのまま維持し、**会社方針という対象に限って mutation を人間専用**にした。

### 3-2. label を NORMAL / INTERNAL のみに制限

- `actions.ts` の `ALLOWED_LABELS` を `['NORMAL', 'INTERNAL']` に縮小（サーバ側検証。フォーム改ざんでも高機密ラベルは保存不可）。
- `new/page.tsx`・`[id]/edit/page.tsx` の select から高機密3択を削除し、「高機密ラベルは機密参照ログ対応後に扱えるようになります」と注記。
- edit 画面は、**対象方針が高機密ラベルを持つ場合は編集フォーム自体を出さない**（誤ってラベルを下げてしまう事故の防止）。
- **高機密ラベル（CONFIDENTIAL / STRICT_SECRET / EXECUTIVE_ONLY / HR_CONFIDENTIAL / LEGAL_CONFIDENTIAL / FINANCIAL_CONFIDENTIAL / CUSTOMER_CONFIDENTIAL / DINING_RECORD）は writeDataAccess 実装時まで保留**。

### 3-3. externalAiAllowed（維持確認）

- create 時 false 固定・update 時は変更しない・UI から true にできない — **doc39 実装のまま維持**（変更なし・ゲートで再検査済み）。

## 4. 検証結果（全green・smoke 13本維持）

| # | 検証 | 結果 |
|---|---|---|
| 1 | `pnpm test` | ✅ 211/211 |
| 2 | `pnpm typecheck` / `pnpm lint` | ✅ green |
| 3 | `pnpm build` | ✅ green |
| 4 | DB URL localhost（値非表示）→ PG起動 → migrate deploy（pendingなし）→ seed（policies:5/catalogItems:8） | ✅ |
| 5 | `/login` 200 → **E2E smoke 13/13 green・既存12本回帰なし** | ✅ |
| 6 | 後片付け（server / PostgreSQL 停止） | ✅ |

## 5. 変更していないもの

rbac.ts・labels.ts・schema.prisma・migrations・seed.ts・smoke.spec.ts・一覧 page.tsx・brain/catalog・nav.ts・package/lock: **無変更**。物理削除・externalAiAllowed true UI・API/MCP公開・外部送信・課金・本番接触: **なし**。

## 6. 判定

- **GO（安全補正完了・smoke 13/13 green 維持）。**
- Phase 2-A-3b-1 の main 反映対象は `9eea086`＋本補正 commit の**2コミット**となる（push-only は別承認）。
- 次: main push（別承認）→ 本番確認 → Phase 2-A-3b-2（ProductCatalogItem・別承認）。writeDataAccess と高機密ラベル解禁はその後の段。
