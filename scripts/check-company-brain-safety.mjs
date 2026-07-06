#!/usr/bin/env node
// Company Brain 静的安全ゲート（Phase X-05-3・doc63 §5 ★3/★4/★5＋isHumanUser維持確認）
// Node.js 標準ライブラリのみ使用（package追加なし）。CI Stage 1 と手元の両方で実行できる。
// 目的: 「できてはいけないこと」がコード上に存在しないことを、push のたびに機械検査する。
//   ★3 label制限:        brain 3actions の ALLOWED_LABELS が NORMAL / INTERNAL の2択のまま
//   ★4 externalAiAllowed封印: 外部AI送信を許可する入力欄が UI に存在しない
//   ★5 物理削除禁止:      brain 3actions に delete / deleteMany が存在しない
//   維持確認:             isHumanUser は @hokko/shared の共通判定を使い、ローカル重複定義が復活していない
// 失敗時は「どの安全境界が破れたか」を非エンジニアにも分かる日本語で表示し exit 1 する。

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;

const BRAIN_ACTIONS = [
  'apps/web/app/(app)/brain/policies/actions.ts',
  'apps/web/app/(app)/brain/catalog/actions.ts',
  'apps/web/app/(app)/brain/playbooks/actions.ts',
  'apps/web/app/(app)/brain/case-studies/actions.ts',
];

const errors = [];

function read(rel) {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// ── brain 3actions のチェック ─────────────────────────────
for (const rel of BRAIN_ACTIONS) {
  let src;
  try {
    src = read(rel);
  } catch {
    errors.push(`【ファイル欠落】 ${rel} が見つかりません。Company Brain の書き込み層が移動/削除されていないか確認してください。`);
    continue;
  }

  // ★5 物理削除禁止: .delete( / .deleteMany( / deleteMany が存在しないこと
  if (src.includes('.delete(') || src.includes('.deleteMany(') || src.includes('deleteMany')) {
    errors.push(`【物理削除禁止が破れています】 ${rel} に delete / deleteMany が見つかりました。Company Brain はアーカイブ（archivedAt）のみ許可です。`);
  }

  // ★3 label制限: ALLOWED_LABELS が NORMAL / INTERNAL の2択のまま各1件
  const labelCount = src.split("ALLOWED_LABELS = ['NORMAL', 'INTERNAL'] as const;").length - 1;
  if (labelCount !== 1) {
    errors.push(`【label制限が破れています】 ${rel} の ALLOWED_LABELS が「NORMAL / INTERNAL の2択」定義ではありません（高機密ラベルの解禁は別承認です）。`);
  }

  // 維持確認: shared の isHumanUser を import していること
  if (!src.includes("import { isHumanUser } from '@hokko/shared';")) {
    errors.push(`【AIロール拒否の共通化が破れています】 ${rel} が @hokko/shared の isHumanUser を import していません。`);
  }

  // 維持確認: ローカル重複定義が復活していないこと
  if (src.includes('function isHumanUser')) {
    errors.push(`【isHumanUser のローカル重複が復活しています】 ${rel} にローカル定義があります。共通判定（packages/shared/src/rbac.ts）だけを使ってください。`);
  }
}

// ── ★4 externalAiAllowed封印: UI に許可入力欄が無いこと ──────────
const uiFiles = walk(join(repoRoot, 'apps/web/app'));
for (const p of uiFiles) {
  const src = readFileSync(p, 'utf8');
  if (src.includes('name="externalAiAllowed"') || src.includes("name='externalAiAllowed'")) {
    errors.push(`【externalAiAllowed封印が破れています】 ${p} に外部AI送信を許可する入力欄があります。true にする UI の追加は個別人間承認が必要です。`);
  }
}

// ── CaseStudy 固有: 許諾なしに匿名化を外せない判定が actions に存在すること（Phase 2-C-4） ──
{
  const rel = 'apps/web/app/(app)/brain/case-studies/actions.ts';
  let src = '';
  try {
    src = read(rel);
  } catch {
    // ファイル欠落は上の BRAIN_ACTIONS ループで検出済み
  }
  if (src && !src.includes('validateCaseStudyConsent')) {
    errors.push(`【許諾・匿名化制御が破れています】 ${rel} が validateCaseStudyConsent（許諾なしに匿名化を外せない判定・@hokko/shared）を使っていません。`);
  }
  if (src && !src.includes("publishStatus: 'private'")) {
    errors.push(`【非公開固定が破れています】 ${rel} の create が publishStatus: 'private' 固定ではありません（公開機能の追加は個別人間承認が必要です）。`);
  }
}

// ── CaseStudy AI参照: 匿名化済み・非公開のみを読む条件が存在すること（Phase 2-C-5・doc78） ──
{
  const rel = 'apps/web/lib/company-brain-reference.ts';
  let src = '';
  try {
    src = read(rel);
  } catch {
    errors.push(`【ファイル欠落】 ${rel} が見つかりません。Company Brain の AI 参照層が移動/削除されていないか確認してください。`);
  }
  if (src) {
    if (!src.includes('prisma.caseStudy.findMany')) {
      errors.push(`【CaseStudy AI参照が見つかりません】 ${rel} に prisma.caseStudy.findMany がありません（Phase 2-C-5 の4テーブル目）。`);
    }
    if (!src.includes('anonymized: true')) {
      errors.push(`【匿名化条件が破れています】 ${rel} の CaseStudy 参照クエリに anonymized: true がありません。AI が読めるのは匿名化済みの事例だけです（doc78 §3）。`);
    }
    if (!src.includes("publishStatus: 'private'")) {
      errors.push(`【非公開条件が破れています】 ${rel} の CaseStudy 参照クエリに publishStatus: 'private' がありません（doc78 §3）。`);
    }
    if (!src.includes("'CaseStudy'")) {
      errors.push(`【entityType が不足しています】 ${rel} の entityType に CaseStudy がありません（ai_reference 記録の対象になりません）。`);
    }
  }
}

// ── CaseStudyConsent 台帳: 人間のみ・writeAudit・物理削除禁止・AI 非注入（doc86） ──
{
  const rel = 'apps/web/app/(app)/brain/case-studies/[id]/consents/actions.ts';
  let src = '';
  try {
    src = read(rel);
  } catch {
    errors.push(`【ファイル欠落】 ${rel} が見つかりません。許諾台帳の書き込み層が移動/削除されていないか確認してください。`);
  }
  if (src) {
    if (!src.includes("import { isHumanUser } from '@hokko/shared';")) {
      errors.push(`【AIロール拒否の共通化が破れています】 ${rel} が @hokko/shared の isHumanUser を import していません（台帳の登録・取り消しは人間のみです）。`);
    }
    if (!src.includes('writeAudit')) {
      errors.push(`【監査記録が破れています】 ${rel} に writeAudit がありません。許諾台帳の登録・取り消しは必ず監査ログに残します（doc86 §7）。`);
    }
    if (src.includes('.delete(') || src.includes('.deleteMany(') || src.includes('deleteMany')) {
      errors.push(`【物理削除禁止が破れています】 ${rel} に delete / deleteMany が見つかりました。許諾台帳の行は削除できません（取り消し=revoke のみ・doc86 §8）。`);
    }
    if (!src.includes('validateCaseStudyConsentInput')) {
      errors.push(`【台帳入力検証が破れています】 ${rel} が validateCaseStudyConsentInput（用途未記載不許可・期限必須・期限逆転拒否・@hokko/shared）を使っていません。`);
    }
  }
  try {
    const newPage = read('apps/web/app/(app)/brain/case-studies/[id]/consents/new/page.tsx');
    if (!newPage.includes('所在説明') || !newPage.includes('原本') || !newPage.includes('個人情報')) {
      errors.push('【証跡ガイドが消えています】 許諾台帳の登録画面に「所在説明のみ・原本や個人情報を貼らない」ガイドが必要です（doc86 §5）。');
    }
  } catch {
    // 画面欠落は運用上 actions 欠落と同時に起きるため、上の欠落検出に委ねる
  }
  const brainRef = read('apps/web/lib/company-brain-reference.ts');
  if (brainRef.includes('caseStudyConsent.findMany') || brainRef.includes('CaseStudyConsent')) {
    errors.push('【AI非注入が破れています】 apps/web/lib/company-brain-reference.ts が CaseStudyConsent を参照しています。許諾台帳は AI 文脈へ注入しません（doc86 §9・解禁は個別人間承認）。');
  }
}

// ── shared 側: 共通判定と否定系テストが存在し続けること ──────────
const rbac = read('packages/shared/src/rbac.ts');
if ((rbac.split('export function isHumanUser').length - 1) !== 1) {
  errors.push('【共通判定が見つかりません】 packages/shared/src/rbac.ts に export function isHumanUser が1件必要です。');
}
const rbacTest = read('packages/shared/src/__tests__/rbac.test.ts');
if (!rbacTest.includes('isHumanUser')) {
  errors.push('【否定系テストが消えています】 packages/shared/src/__tests__/rbac.test.ts に isHumanUser のテストが必要です（AIロール拒否の自動検証）。');
}
try {
  const caseStudyTest = read('packages/shared/src/__tests__/case-study.test.ts');
  if (!caseStudyTest.includes('validateCaseStudyConsent')) {
    errors.push('【否定系テストが消えています】 packages/shared/src/__tests__/case-study.test.ts に validateCaseStudyConsent のテストが必要です（許諾なしに匿名化を外せない自動検証）。');
  }
} catch {
  errors.push('【否定系テストが見つかりません】 packages/shared/src/__tests__/case-study.test.ts が必要です（Phase 2-C-4 の許諾・匿名化制御の自動検証）。');
}
try {
  const consentInputTest = read('packages/shared/src/__tests__/case-study-consent.test.ts');
  if (!consentInputTest.includes('validateCaseStudyConsentInput')) {
    errors.push('【否定系テストが消えています】 packages/shared/src/__tests__/case-study-consent.test.ts に validateCaseStudyConsentInput のテストが必要です（用途未記載不許可・期限必須の自動検証）。');
  }
  if (!consentInputTest.includes('validateCaseStudyConsentReconciliation')) {
    errors.push('【否定系テストが消えています】 packages/shared/src/__tests__/case-study-consent.test.ts に validateCaseStudyConsentReconciliation のテストが必要です（突合判定の reject 条件の自動検証・doc89 §11）。');
  }
} catch {
  errors.push('【否定系テストが見つかりません】 packages/shared/src/__tests__/case-study-consent.test.ts が必要です（許諾台帳の入力検証の自動検証・doc86）。');
}

// ── 突合判定の段階分離（doc89 §12・doc90。保存条件接続のみ doc92 で人間承認済み） ──
// 匿名化の門番の変更・AI 参照条件への接続は引き続き別承認（混入したら FAIL）。
{
  const shared = read('packages/shared/src/case-study-consent.ts');
  if (!shared.includes('export function validateCaseStudyConsentReconciliation')) {
    errors.push('【突合判定関数が見つかりません】 packages/shared/src/case-study-consent.ts に validateCaseStudyConsentReconciliation が必要です（doc89 の設計・doc90 で追加）。');
  }
  if (shared.includes('@prisma') || shared.includes('PrismaClient')) {
    errors.push('【純粋関数の境界が破れています】 packages/shared/src/case-study-consent.ts が Prisma を import しています。突合判定は DB を読まない純粋関数のままにしてください（doc89 §10 案B）。');
  }
  // 保存条件接続（doc92 で人間承認済み・CONNECT_ONLY）: 匿名化を外す保存への突合必須化が
  // 「承認された形」で存在し続けることを検査する（消えたら FAIL・形が変わったら FAIL）。
  // ※この検査自体が doc89 §13 段階5 の「接続禁止 → 承認済み接続の形」への更新＝承認の証跡。
  const caseStudyActions = read('apps/web/app/(app)/brain/case-studies/actions.ts');
  if (!caseStudyActions.includes('validateCaseStudyConsentReconciliation')) {
    errors.push('【保存条件接続が消えています】 case-studies/actions.ts に validateCaseStudyConsentReconciliation が必要です（匿名化を外す保存は許諾台帳との突合必須・doc92 CONNECT_ONLY）。');
  }
  if (!caseStudyActions.includes('where: { tenantId: user.tenantId, caseStudyId: existing.id }')) {
    errors.push('【台帳取得のテナント境界が破れています】 case-studies/actions.ts の許諾台帳取得は tenantId / caseStudyId でスコープしてください（doc92 §5-2）。');
  }
  if (!caseStudyActions.includes('error=ledger_createNotAllowed')) {
    errors.push('【新規作成の匿名化オフ拒否が消えています】 create は anonymized=false を拒否してください（台帳行は作成後にしか登録できないため・doc92 §5-1）。');
  }
  if (!caseStudyActions.includes("targetPurpose: 'internal_view'")) {
    errors.push('【保存条件の対象用途が変更されています】 保存条件の突合は targetPurpose internal_view です（変更は別承認・doc92 §0）。');
  }
  // 段階分離2: anonymized=false 解禁は別承認（匿名化の門番の実装が変わったら FAIL）
  const caseStudyShared = read('packages/shared/src/case-study.ts');
  if (!caseStudyShared.includes("return consentStatus === 'granted';")) {
    errors.push('【匿名化の門番が変更されています】 packages/shared/src/case-study.ts の canDisableAnonymization が既定実装から変わっています。anonymized=false の扱い変更は別承認です（doc89 §8）。');
  }
  // 段階分離3: AI 参照条件への接続は別承認（company-brain-reference の CaseStudyConsent 参照は既存検査でも FAIL するが明示）
  const brainRefSrc = read('apps/web/lib/company-brain-reference.ts');
  if (brainRefSrc.includes('validateCaseStudyConsentReconciliation') || brainRefSrc.includes('caseStudyConsent.findMany')) {
    errors.push('【段階分離が破れています】 company-brain-reference.ts に突合判定/台帳参照が入っています。AI参照条件の変更は別承認です（doc89 §9）。');
  }
}

// ── anonymized=false（実名寄り）の表示統治（doc94 §0・doc95）: INTERNAL_ONLY_RESTRICTED ──
// - 一覧は badge_only: 実名寄り行の注意バッジ（AI参照対象外/外部公開不可）が消えたら FAIL。
// - 閲覧は knowledge_update_only: 実名寄り行の内容制限（c.anonymized || canUpdate）が消えたら FAIL。
// - Customer マスタ join 禁止: case-studies の画面（表示層）が prisma.customer を参照したら FAIL（PII 表示面を増やさない）。
{
  const listPage = read('apps/web/app/(app)/brain/case-studies/page.tsx');
  if (!listPage.includes('AI参照対象外') || !listPage.includes('外部公開不可')) {
    errors.push('【実名寄り表示の統治が消えています】 case-studies 一覧に実名寄り行の注意バッジ（AI参照対象外・外部公開不可）が必要です（doc95・badge_only）。');
  }
  if (!listPage.includes('c.anonymized || canUpdate')) {
    errors.push('【実名寄りの閲覧制限が消えています】 case-studies 一覧の実名寄り行は knowledge:update 保有者だけに内容を表示してください（doc95・knowledge_update_only）。');
  }
  const caseStudyPages = walk(join(repoRoot, 'apps/web/app/(app)/brain/case-studies')).filter((p) => p.endsWith('page.tsx'));
  for (const p of caseStudyPages) {
    const src = readFileSync(p, 'utf8');
    if (src.includes('prisma.customer')) {
      errors.push(`【PII表示面の拡張が検出されました】 ${p} が Customer マスタを参照しています。case-studies の画面は Customer を join しません（doc95・title_body_only_no_customer_master_join）。`);
    }
  }
}

// ── 高機密ラベル 候補A の守り（doc110・doc111 候補B） ──────────
// doc109 候補A（Customer Pain 高機密詳細の閲覧可否を判定する純粋関数）が後退したら FAIL。
// - 標準閲覧式5条件（tenantId × knowledge:update × canAccessLabel × isHumanUser × archivedAt null）の AND が消えたら FAIL。
// - Customer Pain が apps/web runtime・AI参照層（company-brain-reference）へ混入したら FAIL。
// ※ この検査は「見られるかの判定（純粋関数）」の守り。実画面・実データ・writeDataAccess/writeAudit 実接続は候補C の別承認。
function walkSafe(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkSafe(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
{
  const CPA_SRC = 'packages/shared/src/customer-pain-access.ts';
  const CPA_TEST = 'packages/shared/src/__tests__/customer-pain-access.test.ts';
  let cpa = '';
  try {
    cpa = read(CPA_SRC);
  } catch {
    errors.push(`【候補Aが見つかりません】 ${CPA_SRC} が見つかりません。Customer Pain 高機密詳細の閲覧判定（純粋関数・doc110）が移動/削除されていないか確認してください。`);
  }
  if (cpa) {
    // 純粋関数の境界: DB を読まない（Prisma import なし）。
    if (cpa.includes('@prisma') || cpa.includes('PrismaClient')) {
      errors.push(`【純粋関数の境界が破れています】 ${CPA_SRC} が Prisma を import しています。閲覧判定は DB を読まない純粋関数のままにしてください（doc110）。`);
    }
    // 標準閲覧式の関数が存在すること。
    if (!cpa.includes('export function canViewCustomerPainDetail')) {
      errors.push(`【標準閲覧式が消えています】 ${CPA_SRC} に canViewCustomerPainDetail がありません（doc105 §6 の5条件 AND・doc110）。`);
    }
    if (!cpa.includes('export function evaluateCustomerPainAccess')) {
      errors.push(`【拒否理由付き判定が消えています】 ${CPA_SRC} に evaluateCustomerPainAccess がありません（安全な列挙値のみを返す判定・doc110）。`);
    }
    // CUSTOMER_PAIN_LABEL は CUSTOMER_CONFIDENTIAL を指すこと（高機密ラベルの固定）。
    if (!cpa.includes("CUSTOMER_PAIN_LABEL: ConfidentialityLabel = 'CUSTOMER_CONFIDENTIAL'")) {
      errors.push(`【機密ラベルの固定が変更されています】 ${CPA_SRC} の CUSTOMER_PAIN_LABEL は CUSTOMER_CONFIDENTIAL を指す必要があります（label定義変更は別承認・doc104/doc105）。`);
    }
    // 標準閲覧式5条件が式内に存在すること。
    if (!cpa.includes("canForRoles(viewer.roles, 'knowledge', 'update')")) {
      errors.push(`【権限条件が消えています】 ${CPA_SRC} の閲覧式に knowledge:update（canForRoles(viewer.roles, 'knowledge', 'update')）がありません（doc105 §5）。`);
    }
    if (!cpa.includes('canAccessLabel(viewer.roles, CUSTOMER_PAIN_LABEL)')) {
      errors.push(`【ラベル条件が消えています】 ${CPA_SRC} の閲覧式に canAccessLabel がありません（label 許可ロール判定・doc105 §5）。`);
    }
    if (!cpa.includes('isHumanUser(viewer)')) {
      errors.push(`【AIロール除外が消えています】 ${CPA_SRC} の閲覧式に isHumanUser がありません。label 単独では AI/STAFF に開くため人間性の判定が必須です（doc105 §4・§5）。`);
    }
    if (!cpa.includes('record.archivedAt == null')) {
      errors.push(`【アーカイブ判定が消えています】 ${CPA_SRC} の閲覧式に archivedAt null 判定がありません（doc105 §5）。`);
    }
    if (!cpa.includes('viewer.tenantId === record.tenantId')) {
      errors.push(`【テナント境界が消えています】 ${CPA_SRC} の閲覧式に tenantId 一致判定がありません（doc105 §5）。`);
    }
    if (!cpa.includes('CUSTOMER_PAIN_DENY_REASONS')) {
      errors.push(`【拒否理由の列挙が消えています】 ${CPA_SRC} に CUSTOMER_PAIN_DENY_REASONS（安全な列挙値）がありません（doc105 §9）。`);
    }
    // OR緩和の混入検知: canViewCustomerPainDetail の本文に "||" が現れたら FAIL（5条件 AND を緩めない・doc105 §6）。
    const viewStart = cpa.indexOf('export function canViewCustomerPainDetail');
    const viewEnd = cpa.indexOf('export function evaluateCustomerPainAccess');
    const viewBody = viewStart >= 0 && viewEnd > viewStart ? cpa.slice(viewStart, viewEnd) : '';
    if (viewBody.includes('||')) {
      errors.push(`【OR緩和が混入しています】 ${CPA_SRC} の canViewCustomerPainDetail に "||" が見つかりました。標準閲覧式は5条件の AND 交差のみで、OR での緩和は禁止です（doc105 §6）。`);
    }
  }
  // 否定系テストが存在し、主要な拒否理由・OR緩和・列挙値の検査を含み続けること。
  let cpaTest = '';
  try {
    cpaTest = read(CPA_TEST);
  } catch {
    errors.push(`【否定系テストが見つかりません】 ${CPA_TEST} が必要です（tenant/権限/label/AIロール/archived/OR緩和なし/安全な理由列挙の自動検証・doc110）。`);
  }
  if (cpaTest) {
    for (const token of [
      'tenant_mismatch',
      'no_knowledge_update',
      'label_role_denied',
      'ai_role',
      'archived',
      'OR 緩和',
      'CUSTOMER_PAIN_DENY_REASONS',
    ]) {
      if (!cpaTest.includes(token)) {
        errors.push(`【否定系テストが弱体化しています】 ${CPA_TEST} に "${token}" の検証がありません（候補A の守りの後退を検知できません・doc110）。`);
      }
    }
  }
  // Customer Pain が apps/web runtime に混入していないこと（画面/Server Action/DB は候補C の別承認）。
  // ※ 既存の会社ブレイン/CaseStudy の externalAiAllowed / publishStatus は対象外（グローバル禁止しない）。
  //    ここで見るのは Customer Pain 固有トークンだけ。
  const CP_TOKENS = ['CustomerPain', 'customerPain', 'customer_pain'];
  for (const p of walkSafe(join(repoRoot, 'apps'))) {
    const src = readFileSync(p, 'utf8');
    const hit = CP_TOKENS.find((t) => src.includes(t));
    if (hit) {
      errors.push(`【Customer Pain 実装が runtime に混入しています】 ${p} に "${hit}" が現れました。Customer Pain の画面/Server Action/DB は候補C（schema/migration を伴う別の重い人間承認）です。`);
    }
  }
  // AI 参照層（company-brain-reference）に Customer Pain が混入していないこと（AIに読ませない・doc105 §15）。
  {
    const brainRef = read('apps/web/lib/company-brain-reference.ts');
    const hit = CP_TOKENS.find((t) => brainRef.includes(t));
    if (hit) {
      errors.push(`【AI非注入が破れています】 apps/web/lib/company-brain-reference.ts に "${hit}" が現れました。Customer Pain は AI 文脈へ注入しません（AI参照条件変更は別承認・doc105 §15）。`);
    }
  }
  // 機密ラベル定義が既存値のまま（schema / labels.ts の CUSTOMER_CONFIDENTIAL は各2件）。変更は別承認。
  const schemaSrc = read('packages/db/prisma/schema.prisma');
  if ((schemaSrc.split('CUSTOMER_CONFIDENTIAL').length - 1) !== 2) {
    errors.push('【label定義が変更されています】 packages/db/prisma/schema.prisma の CUSTOMER_CONFIDENTIAL が既存の2件ではありません（schema/label定義の変更は別承認）。');
  }
  const labelsSrc = read('packages/shared/src/labels.ts');
  if ((labelsSrc.split('CUSTOMER_CONFIDENTIAL').length - 1) !== 2) {
    errors.push('【label定義が変更されています】 packages/shared/src/labels.ts の CUSTOMER_CONFIDENTIAL が既存の2件ではありません（label定義の変更は別承認）。');
  }
}

// ── 結果 ─────────────────────────────────────────────
if (errors.length > 0) {
  console.error('Company Brain safety checks FAILED:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Company Brain safety checks passed. (actions: ${BRAIN_ACTIONS.length}, ui files scanned: ${uiFiles.length})`);
