# Phase 3 クローズ準備 — 境界クローズ4連 WIP（v5.4・2026-07-11）

オートパイロット v5.4 で、[[Phase3最終Gate判断シートとGO記録|Phase 3（AI Growth Engine）]] のクローズ準備として閲覧境界を4連 WIP でクローズした記録。正本は GitHub docs（roadmap64-68・audit163-167）。

## 完了した WIP

- **WIP-3 /growth 財務境界**: 金額（売上インパクト・削減コスト換算・DX 推定金額）は finance:read のみ DB クエリ段階から取得。finance カテゴリの行・件数・存在シグナルを遮断。無権限で金額を返す Server Action の裏口を削除。/dx 系4ページに marketing:read ゲート。CI #161 88/0。
- **WIP-4 見積/請求/印刷/案件の境界**: 見積の原価・粗利は **quote:read 配下**（値引き承認ルールを含む担当者の業務フローと判断）。請求は FINANCIAL_CONFIDENTIAL の ABAC を fetch 前判定（envelope 先行・実在しない ID に監査ログの偽陽性を残さない）。宛先（顧客名）にも可視ラベルガード。フォームの紐付け ID を server 側でテナント・ラベル検証。CI #162 91/0。
- **WIP-5 承認シグナルの遮断**: Topbar・/dashboard・社長コックピット・AI朝礼レポートの「承認待ち件数」（テナント全体の業務量シグナル）を approval:approve 保持者のみに。取得段階から遮断し、AI 朝報の入力からも redact。CI #163 93/0。
- **WIP-6 PII 経路の機械監査**: Customer/Contact に触れる **29 経路を台帳化**（roadmap67 §1 が正）。Critical 1（/planning-hokko が認証のみで全顧客名を表示）・High 2 を修正。顧客名の可視判定を `customer-visibility.ts` に一本化し、golden-path 系は **fail-closed 既定**（可視ラベル未指定なら顧客名を返さない）。

## 型になった設計原則

1. **取得段階遮断**: 表示条件分岐ではなく DB クエリ（select/where）の段階で権限外データを取らない。
2. **fail-closed 既定**: 可視性引数の省略時は「見せない」に倒す。
3. **判定は fetch より先**: 拒否される閲覧者には ID の存在有無も返さない（存在オラクルの遮断）。
4. **敵対的レビューを push 前に**: 3視点独立・反証志向。v5.4 全体で High 5 件以上を push 前に検出・修正。
5. **e2e は「存在するのに見えない」を検証**: データ不在による空振り合格を作らない。

## Phase 3 の判定（宣言はしない）

達成 = C18（Control Tower v0）・C20（Email/DM 基盤）・C27（承認導線）・C38（同意・プライバシー）。未達 = C19/C21/C22（広告・SEO/PR・紹介）。クローズは案A（残を続行）/案B（v0 完了としてクローズ）を人間 Phase Gate が判断する（roadmap68 §2）。

関連: [[index]] / [[CRM閲覧境界クローズとGrowthEvent成果可視化]] / [[セキュリティと権限]] / [[Phase3最終Gate判断シートとGO記録]]
