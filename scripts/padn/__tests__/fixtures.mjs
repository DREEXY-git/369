// テスト用 fixtures — L1（Issue #66 / #67 / #68）の実フォーマットを模した合成データと Fake GitHub。
export const MAIN_SHA = '7e50a04df6dcc8043689958cbfd9be42e15e1af7';

export function controlRootIssue(number = 66) {
  return {
    number,
    title: '[CONTROL] 369 Paired Autonomous Delivery Network',
    state: 'open',
    created_at: '2026-07-16T23:53:47Z',
    body: [
      '# [CONTROL] 369 Paired Autonomous Delivery Network',
      '',
      '```json',
      JSON.stringify({
        schema: '369-control-root-v1',
        program_id: '369-PADN-V5',
        director_epoch: 1,
        director_pair: 'A',
        control_revision: 1,
        write_capacity: 2,
        active_write_lanes: 0,
        backpressure: false,
        app_main_base: MAIN_SHA,
      }),
      '```',
    ].join('\n'),
  };
}

export function controlEventComment({ at, revision, markers = [], extra = {} }) {
  return {
    id: Math.floor(Math.random() * 1e9),
    created_at: at,
    user: { login: 'DREEXY-git' },
    body: [
      `## ${markers.join(' / ') || 'EVENT'}`,
      '',
      '```json',
      JSON.stringify({ schema: '369-control-event-v1', control_revision: revision, director_epoch: 1, base_sha: MAIN_SHA, ...extra }),
      '```',
      '',
      markers.join(' '),
    ].join('\n'),
  };
}

export function wipIssue({ number, wipId, lane, branch, allowedPaths }) {
  return {
    number,
    title: `[WIP] ${wipId} テスト対象`,
    state: 'open',
    created_at: '2026-07-16T23:54:00Z',
    body: [
      `# ${wipId}`,
      '',
      'Control Root: #66（PROGRAM_ID: 369-PADN-V5 / DIRECTOR_EPOCH 1）',
      '',
      '## Lease（有効）',
      '',
      '| 項目 | 値 |',
      '|---|---|',
      `| LEASE_ID | \`LEASE-369PADN-${lane}-001\` |`,
      '| LEASE_REVISION | 1 |',
      `| FENCING_TOKEN | \`FT-369PADN-E1-${lane}-L1-7e50a04\` |`,
      `| BASE_SHA | \`${MAIN_SHA}\`（main） |`,
      `| BRANCH | \`${branch}\` |`,
      '',
      '## ALLOWED_PATHS（これ以外への write 禁止）',
      '',
      ...allowedPaths.map((p) => `- \`${p}\``),
      '',
      '## Human Gate',
      '',
      'main merge・schema/migration・Production・外部送信・実LLM・課金。',
    ].join('\n'),
  };
}

export function packetComment({ at = '2026-07-16T23:55:00Z', hash, id = 4990000001 }) {
  return {
    id,
    created_at: at,
    user: { login: 'DREEXY-git' },
    body: [
      '## PROMPT_DISPATCHED (EVT-WIP-1)',
      '',
      `PROMPT_SHA256: \`${hash}\``,
      '',
      '```json',
      JSON.stringify({ schema: '369-control-event-v1', event: 'PROMPT_DISPATCHED', prompt_sha256: hash, lease_id: 'LEASE-X', lease_revision: 1, base_sha: MAIN_SHA }),
      '```',
    ].join('\n'),
  };
}

export function simpleComment(at, body) {
  return { id: Math.floor(Math.random() * 1e9), created_at: at, user: { login: 'DREEXY-git' }, body };
}

/** discover / dispatcher が使う GitHubClient 互換の Fake。 */
export class FakeGH {
  constructor({ issues = [], commentsByIssue = {}, pulls = [], branchShas = {} }) {
    this.issues = issues;
    this.commentsByIssue = commentsByIssue;
    this.pulls = pulls;
    this.branchShas = branchShas;
    this.dispatched = [];
    this.commentsPosted = [];
  }
  async listOpenIssues() {
    return this.issues.filter((i) => i.state === 'open');
  }
  async getIssue(number) {
    return this.issues.find((i) => i.number === number) ?? null;
  }
  async listIssueComments(number) {
    return this.commentsByIssue[number] ?? [];
  }
  async listOpenPulls() {
    return this.pulls;
  }
  async getBranchSha(branch) {
    return this.branchShas[branch] ?? null;
  }
  async repositoryDispatch(eventType, clientPayload) {
    this.dispatched.push({ eventType, clientPayload });
  }
  async createIssueComment(number, body) {
    this.commentsPosted.push({ number, body });
  }
  async listWorkflowRuns() {
    return this.workflowRunsResponse ?? { workflow_runs: [] };
  }
}

/** B1 相当（DISPATCHED 未クレーム）＋ B2 相当（PASS 済み READY_FOR_HUMAN_GATE）の標準 snapshot 素材。 */
export function standardWorld({ b1Hash, now = '2026-07-17T03:00:00Z' } = {}) {
  const root = controlRootIssue();
  const rootComments = [
    controlEventComment({ at: '2026-07-16T23:56:53Z', revision: 2, markers: ['SESSION_ONLINE', 'LEASE_GRANTED'] }),
    controlEventComment({ at: '2026-07-17T01:31:23Z', revision: 3, markers: ['PROMPT_DISPATCHED'] }),
    controlEventComment({ at: '2026-07-17T02:42:04Z', revision: 6, markers: ['READY_FOR_HUMAN_GATE'] }),
  ];
  const b1 = wipIssue({
    number: 67,
    wipId: 'WIP-PADN-B1-001',
    lane: 'B1',
    branch: 'claude/padn-b1-contract-child-tenant-v1',
    allowedPaths: [
      'apps/web/app/(app)/contracts/page.tsx',
      'apps/web/lib/domains/legal/**',
      'apps/web/tests/e2e/contract_child_tenant_evidence.spec.ts',
    ],
  });
  const b1Comments = [packetComment({ at: '2026-07-16T23:55:43Z', hash: b1Hash ?? 'a'.repeat(64), id: 5001 })];

  const b2 = wipIssue({
    number: 68,
    wipId: 'WIP-PADN-B2-001',
    lane: 'B2',
    branch: 'claude/padn-b2-cashflow-line-tenant-v1',
    allowedPaths: [
      'apps/web/app/(app)/finance/cashflow/page.tsx',
      'apps/web/lib/domains/finance/cashflow.ts',
      'apps/web/tests/e2e/cashflow_child_tenant_evidence.spec.ts',
    ],
  });
  const B2_HEAD = '95a05dde3b9ce81d4ab4299fa25430fddfd09e5f';
  const b2Comments = [
    packetComment({ at: '2026-07-16T23:56:20Z', hash: 'b'.repeat(64), id: 5002 }),
    simpleComment('2026-07-17T00:43:05Z', 'WIP_CLAIMED — packet hash 一致を確認'),
    simpleComment('2026-07-17T00:43:06Z', 'IMPLEMENTATION_STARTED'),
    simpleComment('2026-07-17T00:57:37Z', 'CHECKPOINT 1 — 実装完了'),
    simpleComment('2026-07-17T01:01:30Z', `IMPLEMENTATION_FREEZE — fixed head ${B2_HEAD}`),
    simpleComment('2026-07-17T01:15:43Z', `REVIEW_PASS — verdict PASS @ head ${B2_HEAD}`),
    simpleComment('2026-07-17T02:16:41Z', 'READY_FOR_HUMAN_GATE'),
  ];

  return {
    now,
    B2_HEAD,
    issues: [root, b1, b2],
    commentsByIssue: { 66: rootComments, 67: b1Comments, 68: b2Comments },
    pulls: [
      {
        number: 69,
        title: 'fix(P3-FIN/資金繰り)…',
        draft: true,
        head: { ref: 'claude/padn-b2-cashflow-line-tenant-v1', sha: B2_HEAD, repo: { full_name: 'DREEXY-git/369' } },
        base: { ref: 'main', repo: { full_name: 'DREEXY-git/369' } },
        updated_at: '2026-07-17T02:15:39Z',
      },
    ],
    branchShas: { main: MAIN_SHA, 'claude/padn-b2-cashflow-line-tenant-v1': B2_HEAD },
  };
}
