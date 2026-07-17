// PADN L2 — role job 実行後の ALLOWED_PATHS 逸脱検査。
// 使い方: git diff --name-only BASE..HEAD の出力を stdin で渡し、
//         PADN_ALLOWED_PATHS（カンマ区切り glob）と突合する。逸脱があれば exit 1。
import { checkAllowedPaths } from './locks.mjs';

const allowed = (process.env.PADN_ALLOWED_PATHS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => {
  input += d;
});
process.stdin.on('end', () => {
  const touched = input
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (touched.length === 0) {
    console.log('OK: 変更ファイルなし');
    process.exit(0);
  }
  if (allowed.length === 0) {
    console.error('NG: PADN_ALLOWED_PATHS が空（fail-closed）');
    process.exit(1);
  }
  const { ok, violations } = checkAllowedPaths(touched, allowed);
  if (ok) {
    console.log(`OK: ${touched.length} ファイルすべて ALLOWED_PATHS 内`);
    process.exit(0);
  }
  console.error(`NG: ALLOWED_PATHS 逸脱 ${violations.length} 件:`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
});
