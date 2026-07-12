// ビルド識別情報（v6.1・deployment lineage 可視化）。
// 目的: 「今見ている画面がどのビルド（Production/Preview）・どの commit か」を OWNER/ADMIN が安全に確認でき、
// 「新機能が反映された配信を見ているか」を判断できるようにする。
// 安全規約: 露出するのは Vercel が公開する非機密メタ（環境種別・commit SHA・branch 名）のみ。
// Secrets・接続文字列・内部ホスト・env 値は一切含めない。
export interface BuildInfo {
  /** 'production' | 'preview' | 'development' | 'local' */
  env: string;
  /** 短縮 commit SHA（7桁）。不明なら 'unknown'。 */
  shortSha: string;
  /** ソース branch 名（Vercel が公開する場合のみ）。不明なら null。 */
  branch: string | null;
  /** 表示用ラベル（例: 'Production · a1b2c3d'）。 */
  label: string;
}

const ENV_LABEL: Record<string, string> = {
  production: 'Production',
  preview: 'Preview',
  development: 'Development',
  local: 'Local',
};

// build 識別バッジを見せてよい role（v6.2）: OWNER / ADMIN の role key 本体のみ。
// permission（admin:read）は EXECUTIVE/READ_ONLY も持つため使わない。
export function canViewBuildInfo(roles: readonly string[]): boolean {
  return roles.includes('OWNER') || roles.includes('ADMIN');
}

export function getBuildInfo(): BuildInfo {
  const env = process.env.VERCEL_ENV ?? 'local';
  const fullSha = process.env.VERCEL_GIT_COMMIT_SHA ?? '';
  const shortSha = fullSha ? fullSha.slice(0, 7) : 'unknown';
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? null;
  const envLabel = ENV_LABEL[env] ?? env;
  return { env, shortSha, branch, label: `${envLabel} · ${shortSha}` };
}
