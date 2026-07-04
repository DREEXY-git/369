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

// ── shared 側: 共通判定と否定系テストが存在し続けること ──────────
const rbac = read('packages/shared/src/rbac.ts');
if ((rbac.split('export function isHumanUser').length - 1) !== 1) {
  errors.push('【共通判定が見つかりません】 packages/shared/src/rbac.ts に export function isHumanUser が1件必要です。');
}
const rbacTest = read('packages/shared/src/__tests__/rbac.test.ts');
if (!rbacTest.includes('isHumanUser')) {
  errors.push('【否定系テストが消えています】 packages/shared/src/__tests__/rbac.test.ts に isHumanUser のテストが必要です（AIロール拒否の自動検証）。');
}

// ── 結果 ─────────────────────────────────────────────
if (errors.length > 0) {
  console.error('Company Brain safety checks FAILED:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Company Brain safety checks passed. (actions: ${BRAIN_ACTIONS.length}, ui files scanned: ${uiFiles.length})`);
