# Phase2A3b1CompanyPolicy書き込み

> 目次に戻る → [[index]] ／ 関連 → [[Phase2A3aCompanyBrain可視化]] ・ [[Phase2A3a本番確認]] ・ [[AIの役割と境界]] ・ [[セキュリティと権限]]
> コード側の正: `369/docs/audit/39_phase2a3b1_company_policy_write.md`（Phase 2-A-3b-1）

## 結論（1行）

**Company Brain に初めての書き込み機能が付いた — ただし会社方針だけ・3操作だけ・消せない・AIは書き換えられない（Phase 2-A-3b-1・smoke 13/13 green）。**

## 何ができるようになったか（非エンジニア向け）

- 「会社の頭脳（会社方針）」で、権限のある人間が**作成・編集・アーカイブ**できるようになった。
- **アーカイブ＝棚から下げるだけ**。データは消えない（物理削除の機能自体が存在しない）。
- すべての変更は**監査ログに自動記録**される（誰が・いつ・どの方針を・何したか）。
- 商品カタログの書き込みは**次の承認（2-A-3b-2）まで実装しない**。

## 設計判断（記録に値するもの）

- **「消す」を作らなかった**: delete/deleteMany をコードに一切書かないことで、「間違えて消した」事故が構造的に起こらない。復元は archivedAt を戻すだけ（次段候補）。
- **AIの書き込み境界は rbac 無変更で実現**: AI は既存設計で knowledge:update を持たない。つまり**権限ファイルに1文字も触れずに「AIは会社方針を書き換えられない」が保証**されている。編集・アーカイブを update 権限に紐付けたのはこのため。
- **externalAiAllowed の UI 封印**: 「外部AIに出してよいか」は書き込みとは別次元の判断なので、作成時 false 固定・編集でも変更不可にした。許可の解禁は別承認の設計事項。
- **段階分けの継続**: read-only（3a）→ 会社方針の書き込み（3b-1）→ 商品カタログの書き込み（3b-2）→ AI参照＋機密参照ログ（3c 候補）。1回の承認範囲を小さく保つ。

## 学び

- **フォームは最初から label htmlFor / input id を対応させる**: Phase X-03 の教訓（label 未関連付けで smoke が red になった）を新規フォームで最初から適用。E2E の 13本目は一発 green だった。
- **既存 Action パターン（deals/actions.ts）の踏襲が最速**: requireUser→hasPermission→tenantId確認→prisma→writeAudit→revalidatePath の型をそのまま使うことで、修正ループ0回で完走。

## 次は人間の判断

1. Phase 2-A-3b-1 の **main 反映（push 承認）**と本番確認。
2. **Phase 2-A-3b-2**: ProductCatalogItem の書き込み（同じ型の水平展開）に進むか。
3. writeDataAccess（機密参照ログ）は AI 参照経路の実装と同時（次段送り）。

## 関連ノート

- [[Phase2A3aCompanyBrain可視化]] — read-only の前段。
- [[AIの役割と境界]] — AIに書かせない・消させない原則。
- [[セキュリティと権限]] — RBAC と監査ログの全体像。
