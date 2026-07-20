// PADN L2 — L1 snapshot を JSON ファイルへ書き出す（oversight / governance の入力）。
// 併せて oversight prompt を描画できる（--oversight-prompt <out.md>）。read-only。
import { writeFileSync, readFileSync } from 'node:fs';
import { GitHubClient } from './github.mjs';
import { buildSnapshot } from './discover.mjs';
import { loadConfigs, contextFromEnv } from './dispatcher.mjs';
import { renderTemplate } from './prompts.mjs';
import { redactSecrets } from './watchdog.mjs';

export async function main(env = process.env, argv = process.argv) {
  const ctx = contextFromEnv(env);
  const configs = loadConfigs(env.PADN_ROOT ?? '.');
  const gh = new GitHubClient({ token: env.GH_TOKEN || env.GITHUB_TOKEN, repo: ctx.repo });
  const snapshot = await buildSnapshot(gh, configs.policy);

  const outIdx = argv.indexOf('--out');
  const outFile = outIdx >= 0 ? argv[outIdx + 1] : `${env.RUNNER_TEMP ?? '/tmp'}/padn-snapshot.json`;
  writeFileSync(outFile, redactSecrets(JSON.stringify(snapshot, null, 2)), 'utf8');
  console.log(`snapshot → ${outFile} (control_revision=${snapshot.control?.controlRevision ?? 'n/a'})`);

  const promptIdx = argv.indexOf('--oversight-prompt');
  if (promptIdx >= 0) {
    const promptOut = argv[promptIdx + 1];
    const template = readFileSync(`${env.PADN_ROOT ?? '.'}/config/padn/prompt-templates/oversight.md`, 'utf8');
    const rendered = renderTemplate(template, {
      EVENT_TYPE: 'padn_oversight',
      CONTROL_ROOT_ISSUE: String(snapshot.controlRoot?.number ?? ''),
      L1_PROGRAM_ID: snapshot.control?.programId ?? '369-PADN-V5',
      CONTROL_REVISION: String(snapshot.control?.controlRevision ?? ''),
      SNAPSHOT_PATH: outFile,
    });
    writeFileSync(promptOut, rendered, 'utf8');
    console.log(`oversight prompt → ${promptOut}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`padn export-snapshot failed: ${err.message}`);
    process.exit(1);
  });
}
