// PADN L2 — GitHub イベントの正規化・重複/stale 判定・actor/bot/fork/chain ガード。

/** GitHub Actions のイベント payload を L2 内部イベントへ正規化する。 */
export function normalizeEvent(eventName, payload = {}) {
  const base = { eventName, actor: payload.sender?.login ?? null, ts: null, key: null };
  switch (eventName) {
    case 'workflow_dispatch':
      return { ...base, type: 'manual', inputs: payload.inputs ?? {}, key: 'manual' };
    case 'schedule':
      return { ...base, type: 'tick', key: 'tick' };
    case 'issues':
      return {
        ...base,
        type: 'issue',
        action: payload.action,
        issue: payload.issue?.number ?? null,
        ts: payload.issue?.updated_at ?? null,
        key: `issues:${payload.issue?.number}:${payload.action}:${payload.issue?.updated_at}`,
      };
    case 'issue_comment':
      return {
        ...base,
        type: 'issue_comment',
        action: payload.action,
        issue: payload.issue?.number ?? null,
        commentId: payload.comment?.id ?? null,
        body: payload.comment?.body ?? '',
        ts: payload.comment?.created_at ?? null,
        key: `issue_comment:${payload.comment?.id}`,
      };
    case 'pull_request': {
      const pr = payload.pull_request ?? {};
      return {
        ...base,
        type: 'pull_request',
        action: payload.action,
        pr: pr.number ?? null,
        headSha: pr.head?.sha ?? null,
        headRef: pr.head?.ref ?? null,
        fork: pr.head?.repo?.full_name !== pr.base?.repo?.full_name,
        merged: pr.merged === true,
        ts: pr.updated_at ?? null,
        key: `pull_request:${pr.number}:${payload.action}:${pr.head?.sha}`,
      };
    }
    case 'workflow_run': {
      const run = payload.workflow_run ?? {};
      return {
        ...base,
        type: 'ci',
        workflowName: payload.workflow?.name ?? run.name ?? null,
        runId: run.id ?? null,
        runAttempt: run.run_attempt ?? 1,
        conclusion: run.conclusion ?? null,
        headSha: run.head_sha ?? null,
        event: run.event ?? null,
        branch: run.head_branch ?? null,
        ts: run.updated_at ?? null,
        key: `workflow_run:${run.id}:${run.run_attempt}`,
      };
    }
    case 'deployment_status': {
      const st = payload.deployment_status ?? {};
      return {
        ...base,
        type: 'deployment',
        state: st.state ?? null, // success / failure / pending ...
        environment: st.environment ?? payload.deployment?.environment ?? null,
        sha: payload.deployment?.sha ?? null,
        targetUrl: st.target_url ?? null,
        ts: st.updated_at ?? st.created_at ?? null,
        key: `deployment_status:${payload.deployment?.id}:${st.id}`,
      };
    }
    case 'repository_dispatch':
      return {
        ...base,
        type: 'padn',
        dispatchType: payload.action ?? null, // client_payload の event type
        clientPayload: payload.client_payload ?? {},
        key: `repository_dispatch:${payload.action}:${payload.client_payload?.idempotency_key ?? ''}`,
      };
    default:
      return { ...base, type: 'unknown', key: `unknown:${eventName}` };
  }
}

/** production 環境向け deployment は L2 の対象外（監視のみ・操作もトリガも行わない）。 */
export function isProductionDeployment(event) {
  return event.type === 'deployment' && /prod/i.test(String(event.environment ?? ''));
}

/**
 * actor ガード。
 * - bot（[bot] suffix / ignored_bots）由来イベントは dispatch 判断に使わない（bot ループ防止）。
 * - 人間 actor は allowlist に限定（schedule / workflow_run / repository_dispatch は actor 概念が
 *   薄いので repository owner 前提で許可）。
 */
export function actorAllowed(event, policy, allowlistOverride) {
  if (['tick', 'ci', 'padn', 'deployment'].includes(event.type)) return { allowed: true, kind: 'system' };
  const actor = event.actor ?? '';
  const ignored = policy.actors.ignored_bots ?? [];
  if (ignored.includes(actor)) return { allowed: false, kind: 'bot', reason: `ignored_bot:${actor}` };
  if (policy.actors.ignore_bot_suffix && actor.endsWith(policy.actors.ignore_bot_suffix)) {
    if (!(policy.actors.trusted_bots ?? []).includes(actor)) {
      return { allowed: false, kind: 'bot', reason: `bot_suffix:${actor}` };
    }
  }
  const allowlist = (allowlistOverride && allowlistOverride.length ? allowlistOverride : policy.actors.human_allowlist) ?? [];
  if (!allowlist.includes(actor)) return { allowed: false, kind: 'human', reason: `actor_not_allowlisted:${actor}` };
  return { allowed: true, kind: 'human' };
}

/** fork PR 判定（fork 由来は secrets を渡さない・write もしない）。 */
export function isForkEvent(event) {
  return event.type === 'pull_request' && event.fork === true;
}

/** repository_dispatch の chain depth 超過判定。 */
export function chainDepthExceeded(event, policy) {
  if (event.type !== 'padn') return false;
  const depth = Number(event.clientPayload?.chain_depth ?? 0);
  return depth >= (policy.chain?.max_depth ?? 2);
}

/**
 * stale 判定: イベントが指す head SHA が、snapshot 上の現在 head と一致しない場合は stale。
 * （古い head の CI 完了・重複 webhook の遅配などを破棄する。）
 */
export function isStaleEvent(event, snapshot) {
  const sha = event.headSha ?? event.sha ?? null;
  if (!sha) return false;
  if (event.type === 'ci' && event.event === 'push' && event.branch === 'main') {
    return snapshot.mainSha ? !snapshot.mainSha.startsWith(sha) && sha !== snapshot.mainSha : false;
  }
  const prs = snapshot.prs ?? [];
  const pr = prs.find((p) => p.headSha === sha);
  if (pr) return false;
  if (event.type === 'pull_request' && event.pr != null) {
    const byNumber = prs.find((p) => p.number === event.pr);
    if (byNumber && byNumber.headSha !== sha) return true;
  }
  if (event.type === 'ci' || event.type === 'deployment') {
    if (snapshot.mainSha && (snapshot.mainSha === sha || snapshot.mainSha.startsWith(sha))) return false;
    return !pr; // どの現在 head にも一致しない → stale
  }
  return false;
}

/**
 * 冪等キー。同一イベントの重複配送（同じ delivery の再送・retry）は同じ key になり、
 * 同一 snapshot に対する判断は決定的なので、結果として重複 dispatch は起きない。
 */
export function dedupeKey(event) {
  return event.key;
}
