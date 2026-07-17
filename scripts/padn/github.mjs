// PADN L2 — 依存ゼロの最小 GitHub REST クライアント（Node 20 の global fetch を使用）。
// token はログへ出さない。transport を注入できるためテストはネットワーク不要。

export class GitHubClient {
  constructor({ token, repo, apiBase = 'https://api.github.com', fetchImpl = fetch, maxRetries = 3 }) {
    if (!repo || !/^[^/]+\/[^/]+$/.test(repo)) throw new Error('GitHubClient: repo は owner/name 形式');
    this.#token = token ?? null;
    this.repo = repo;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.maxRetries = maxRetries;
  }

  #token;

  get hasToken() {
    return Boolean(this.#token);
  }

  async request(method, path, { body, params } = {}) {
    const url = new URL(`${this.apiBase}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));
    let lastErr;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.fetchImpl(url, {
          method,
          headers: {
            accept: 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
            'user-agent': '369-padn-l2',
            ...(this.#token ? { authorization: `Bearer ${this.#token}` } : {}),
            ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (res.status === 204) return null;
        if (res.ok) return await res.json();
        // 5xx / secondary rate limit は retry。4xx は即時失敗（token は含めない）。
        const retriable = res.status >= 500 || res.status === 429 || res.status === 403;
        const text = await res.text().catch(() => '');
        const err = new Error(`GitHub API ${res.status} ${method} ${path}: ${text.slice(0, 300)}`);
        err.status = res.status;
        if (!retriable || attempt === this.maxRetries) throw err;
        lastErr = err;
      } catch (e) {
        if (e.status && e.status < 500 && e.status !== 429 && e.status !== 403) throw e;
        lastErr = e;
        if (attempt === this.maxRetries) throw lastErr;
      }
      await sleep(500 * 2 ** attempt);
    }
    throw lastErr;
  }

  async paginate(path, params = {}, { maxPages = 20 } = {}) {
    const all = [];
    for (let page = 1; page <= maxPages; page++) {
      const items = await this.request('GET', path, { params: { per_page: 100, page, ...params } });
      if (!Array.isArray(items) || items.length === 0) break;
      all.push(...items);
      if (items.length < 100) break;
    }
    return all;
  }

  // ---- read（discovery / import 用）----
  getIssue(number) {
    return this.request('GET', `/repos/${this.repo}/issues/${number}`);
  }
  listOpenIssues() {
    return this.paginate(`/repos/${this.repo}/issues`, { state: 'open' });
  }
  listIssueComments(number) {
    return this.paginate(`/repos/${this.repo}/issues/${number}/comments`);
  }
  listOpenPulls() {
    return this.paginate(`/repos/${this.repo}/pulls`, { state: 'open' });
  }
  getPull(number) {
    return this.request('GET', `/repos/${this.repo}/pulls/${number}`);
  }
  listPullFiles(number) {
    return this.paginate(`/repos/${this.repo}/pulls/${number}/files`);
  }
  getRef(ref) {
    return this.request('GET', `/repos/${this.repo}/git/ref/${ref}`);
  }
  getBranchSha(branch) {
    return this.getRef(`heads/${branch}`).then((r) => r?.object?.sha ?? null);
  }
  listWorkflowRuns(params) {
    return this.request('GET', `/repos/${this.repo}/actions/runs`, { params });
  }
  listDeploymentStatuses(deploymentId) {
    return this.paginate(`/repos/${this.repo}/deployments/${deploymentId}/statuses`);
  }

  // ---- write（autonomy enabled 時のみ呼ばれる）----
  createIssueComment(number, body) {
    return this.request('POST', `/repos/${this.repo}/issues/${number}/comments`, { body: { body } });
  }
  /**
   * 内部 chaining の正規経路。GITHUB_TOKEN で作られたイベントは新しい workflow run を
   * 起動しない（GitHub の再帰防止仕様）ため、chaining には GitHub App installation token が必須。
   */
  repositoryDispatch(eventType, clientPayload) {
    return this.request('POST', `/repos/${this.repo}/dispatches`, {
      body: { event_type: eventType, client_payload: clientPayload },
    });
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
