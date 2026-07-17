// PADN L2 — role job の guard & prompt render。
// repository_dispatch payload を静的検証 → GitHub 上のライブ状態と突合（packet hash 再計算・
// head 不動確認）→ テンプレートを描画して prompt ファイルへ書き出す。
// 1 つでも検証に失敗したら exit 1（role job はそこで停止し、write は発生しない）。
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { GitHubClient } from './github.mjs';
import { validatePayload } from './validate.mjs';
import { verifyPacket, renderTemplate } from './prompts.mjs';
import { extractJsonBlocks, foldWipState } from './state.mjs';

/** packet コメント本文に対する検証結果（正準 JSON block の再計算一致 / 散文中の宣言値一致）。 */
export function packetVerification(commentBody, declaredHash) {
  const blocks = extractJsonBlocks(String(commentBody ?? ''));
  const verified = blocks.some((b) => verifyPacket(b, declaredHash).verified);
  const prose = String(commentBody ?? '').includes(String(declaredHash));
  return { verified, prose };
}

/**
 * packet 認証の合否ポリシー（Codex review P1）:
 * write 系は正準 JSON block の再計算一致（verified）が必須。散文中に hash 文字列が
 * あるだけでは通さない（改竄された block + 据え置きの散文 hash を弾く）。
 * read-only 系は宣言値一致まで許容（degraded として記録）。
 */
export function packetAuthOk(isWrite, { verified, prose }) {
  if (verified) return { ok: true, degraded: false };
  if (!isWrite && prose) return { ok: true, degraded: true };
  return { ok: false, degraded: false };
}

/** stale/重複 dispatch 判定（Codex review P2）: event type ごとに許容されるライブ状態。 */
export const EXPECTED_LIVE_STATE = {
  padn_claude_implement: ['DISPATCHED'],
  padn_claude_remediate: ['CHANGES_REQUESTED'],
  padn_claude_test: ['IMPLEMENTING'],
};

/** guard 通過時に投稿し、状態を進めて以後の重複 emit を止める claim marker。 */
export const CLAIM_MARKERS = {
  padn_claude_implement: 'WIP_CLAIMED / IMPLEMENTATION_STARTED',
  padn_claude_remediate: 'REWORK_STARTED',
  padn_claude_test: 'TEST_JOB_STARTED',
};

function fail(msg) {
  console.error(`padn guard NG: ${msg}`);
  process.exit(1);
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${String(value).replaceAll('\n', ' ')}\n`);
}

function setMultilineOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  // delimiter は内容と独立な乱数にする（内容由来だと出力 injection の余地が残る）
  const delimiter = `PADN_EOF_${randomBytes(16).toString('hex')}`;
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

export async function main(env = process.env) {
  const rootDir = env.PADN_ROOT ?? '.';
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!eventPath) fail('GITHUB_EVENT_PATH が無い');
  const raw = JSON.parse(readFileSync(eventPath, 'utf8'));
  const eventType = raw.action;
  const payload = raw.client_payload ?? {};

  // 1) 静的検証
  const staticCheck = validatePayload(payload, rootDir);
  if (!staticCheck.ok) fail(staticCheck.errors.join(' / '));

  const isWrite = ['padn_claude_implement', 'padn_claude_remediate', 'padn_claude_test'].includes(eventType);
  // write 系は fail-closed: packet のライブ hash 再検証を「省略可能な入力」で回避できないようにする
  if (isWrite) {
    if (!/^[0-9a-f]{64}$/.test(String(payload.prompt_sha256 ?? ''))) {
      fail('write 系 event は完全長（64 hex）の prompt_sha256 が必須');
    }
    if (!payload.packet_comment_id) fail('write 系 event は packet_comment_id が必須（ライブ hash 再検証を省略できない）');
    if (!payload.branch) fail('write 系 event は branch が必須');
  }

  // 2) ライブ再検証（正本は GitHub）
  const repo = env.GITHUB_REPOSITORY ?? 'DREEXY-git/369';
  const gh = new GitHubClient({ token: env.GH_TOKEN || env.GITHUB_TOKEN, repo });
  const issue = await gh.getIssue(payload.wip_issue);
  if (!issue || issue.state !== 'open') fail(`WIP Issue #${payload.wip_issue} が open ではない`);

  // packet hash 再計算: packet コメントの json block を正準直列化して宣言 hash と突合
  let liveComments = null;
  if (payload.packet_comment_id && payload.prompt_sha256) {
    liveComments = await gh.listIssueComments(payload.wip_issue);
    const packetComment = liveComments.find((c) => String(c.id) === String(payload.packet_comment_id));
    if (!packetComment) fail(`packet コメント ${payload.packet_comment_id} が見つからない`);
    const auth = packetAuthOk(isWrite, packetVerification(packetComment.body, payload.prompt_sha256));
    if (!auth.ok) {
      fail(
        isWrite
          ? 'write 系は正準 JSON block の再計算一致が必須（PROMPT_PACKET_HASH_MISMATCH — 散文中の hash 文字列一致では開始しない）'
          : 'prompt hash がライブの packet と一致しない（PROMPT_PACKET_HASH_MISMATCH）',
      );
    }
    if (auth.degraded) {
      console.log('padn guard: packet json block での完全再計算はできず、宣言 hash の一致のみ確認（read-only role のため許容）');
    }
  } else if (payload.prompt_sha256 == null) {
    fail('prompt_sha256 が payload に無い');
  }

  // ライブ WIP 状態の再検査（stale/重複 dispatch の破棄）: dispatcher の 30 分 tick が同じ
  // イベントを複数 queue しても、状態が既に先へ進んでいれば clean skip する（run は成功扱い）。
  if (isWrite) {
    const fold = foldWipState(liveComments ?? []);
    const expected = EXPECTED_LIVE_STATE[eventType] ?? [];
    const staleDuplicate =
      !expected.includes(fold.state) || (eventType === 'padn_claude_test' && fold.testJobStarted);
    if (staleDuplicate) {
      console.log(
        `padn guard SKIP: live state=${fold.state} testJobStarted=${fold.testJobStarted} は ${eventType} の対象外（stale/duplicate dispatch を破棄）`,
      );
      setOutput('proceed', 'false');
      return;
    }
  }

  // head 不動確認（review 系 / remediate は fixed head が前提）
  if (payload.head_sha && payload.branch) {
    const liveSha = await gh.getBranchSha(payload.branch).catch(() => null);
    if (liveSha && liveSha !== payload.head_sha) {
      fail(`branch ${payload.branch} の head が payload と不一致（payload=${payload.head_sha} live=${liveSha}）— stale dispatch を破棄`);
    }
  }

  // base drift 確認（write 系）
  const mainSha = await gh.getBranchSha('main').catch(() => null);
  if (isWrite && mainSha && payload.base_sha !== mainSha) {
    fail(`base drift: payload.base_sha=${payload.base_sha} だが main=${mainSha}（Director の再発行が必要）`);
  }

  // 全検証を通過した write 系のみ claim marker を投稿し、WIP 状態を進める（以後の tick は
  // 重複 emit しない）。protocol 上の状態遷移イベントであり PADN_REPORTS_ENABLED とは独立。
  // GITHUB_TOKEN 投稿のため新しい workflow は起動しない（ループなし）。
  if (isWrite) {
    await gh.createIssueComment(
      payload.wip_issue,
      [
        `## ${CLAIM_MARKERS[eventType]} — L2 role job（${eventType}）`,
        '',
        `- packet hash 再計算一致を確認済み / lease \`${payload.lease_id}\` rev ${payload.lease_revision} / fencing \`${payload.fencing_token}\``,
        '',
        '```json',
        JSON.stringify(
          {
            schema: '369-l2-event-v1',
            program_id: '369-PADN-L2-AUTONOMY-V11',
            event_type: `L2_${eventType.toUpperCase()}_STARTED`,
            wip_id: payload.wip_id,
            base_sha: payload.base_sha,
            idempotency_key: payload.idempotency_key,
          },
          null,
          2,
        ),
        '```',
      ].join('\n'),
    );
  }
  setOutput('proceed', 'true');

  // 3) テンプレート描画
  const roles = JSON.parse(readFileSync(`${rootDir}/config/padn/roles.json`, 'utf8'));
  let templateFile = null;
  for (const role of Object.values(roles.roles)) {
    if (role.prompt_templates?.[eventType]) templateFile = role.prompt_templates[eventType];
  }
  if (!templateFile) fail(`event type ${eventType} のテンプレートが roles.json に無い`);
  const template = readFileSync(`${rootDir}/config/padn/prompt-templates/${templateFile}`, 'utf8');
  const allowedPathsList = (payload.allowed_paths ?? []).length
    ? payload.allowed_paths
    : parseAllowedPathsFromIssue(issue.body ?? '');
  const vars = {
    EVENT_TYPE: eventType,
    WIP_ID: payload.wip_id,
    WIP_ISSUE: String(payload.wip_issue),
    CONTROL_ROOT_ISSUE: String(payload.control_root ?? ''),
    BASE_SHA: payload.base_sha,
    HEAD_SHA: payload.head_sha ?? payload.base_sha,
    BRANCH: payload.branch ?? '',
    LEASE_ID: payload.lease_id ?? '',
    LEASE_REVISION: String(payload.lease_revision ?? ''),
    FENCING_TOKEN: payload.fencing_token ?? '',
    PROMPT_SHA256: payload.prompt_sha256 ?? '',
    RISK_TIER: payload.risk_tier ?? '',
    // fold は CHANGES_REQUESTED への遷移時に既に +1 済み（= 1 が「1回目の rework」）。
    // ここで加算すると 2 回目の正当な rework が「3回目」と誤表示され早期 REPLAN を誘発する。
    REWORK_COUNT: String(payload.rework_count ?? 1),
    PACKET_URL: `https://github.com/${repo}/issues/${payload.wip_issue}#issuecomment-${payload.packet_comment_id ?? ''}`,
    ALLOWED_PATHS: allowedPathsList.map((p) => `- \`${p}\``).join('\n') || '- （packet 本文を参照）',
    FORBIDDEN_SUMMARY: 'packet の FORBIDDEN 一覧（WIP Issue 本文）に従う',
    TRAIN_PRS: JSON.stringify(payload.train_prs ?? []),
    L1_PROGRAM_ID: payload.l1_program_id ?? '369-PADN-V5',
    CONTROL_REVISION: String(payload.control_revision ?? ''),
    SNAPSHOT_PATH: env.PADN_SNAPSHOT_PATH ?? '',
  };
  const rendered = renderTemplate(template, vars);
  const outFile = env.PADN_PROMPT_FILE ?? `${env.RUNNER_TEMP ?? '/tmp'}/padn-prompt.md`;
  writeFileSync(outFile, rendered, 'utf8');

  setOutput('prompt_file', outFile);
  setMultilineOutput('prompt', rendered);
  setOutput('branch', payload.branch ?? '');
  setOutput('base_sha', payload.base_sha);
  setOutput('head_sha', payload.head_sha ?? payload.base_sha);
  setOutput('wip_issue', payload.wip_issue);
  setOutput('wip_id', payload.wip_id);
  setOutput('allowed_paths', allowedPathsList.join(','));
  console.log(`padn guard OK: ${eventType} ${payload.wip_id} → ${outFile}`);
}

function parseAllowedPathsFromIssue(body) {
  const sec = /##\s*ALLOWED_PATHS[^\n]*\n([\s\S]*?)(\n##|$)/.exec(body);
  if (!sec) return [];
  const out = [];
  for (const line of sec[1].split('\n')) {
    const m = /^\s*[-*]\s*`([^`]+)`/.exec(line);
    if (m) out.push(m[1].replace(/（[^）]*）/g, '').trim());
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`padn guard failed: ${err.message}`);
    process.exit(1);
  });
}
