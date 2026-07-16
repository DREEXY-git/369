#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  businessPhases,
  changeSurfaceFields,
  environmentLeaseFields,
  lockCompatibility,
  lockModes,
  phaseAliases,
  policyExample,
  queuePolicy,
  resourceHierarchy,
  riskTiers,
  rolePromptDefinitions,
  roles,
  transitions,
} from "./model.mjs";
import { liveStateSnapshot, openPullRequests } from "./inventory.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");
const candidateRoot = resolve(repoRoot, "docs/proposals/phase-governance-multichat-v4");
const allowedPrefixes = ["docs/proposals/phase-governance-multichat-v4/", "scripts/governance/phase-multichat-v4/"];
const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const requiredCandidateFiles = [
  ...["00_README.md", "01_GOVERNANCE_AND_CONTROL_PLANE_CHARTER.md", "02_BUSINESS_PHASE_MAP_CANDIDATE.md", "03_PHASE_ALIAS_MODEL_CANDIDATE.md", "04_ROLE_CATALOG.md", "05_CONTROL_PLANE_STATE_MACHINE.md", "06_FENCED_LEASE_PROTOCOL.md", "07_CHANGE_SURFACE_MANIFEST.md", "08_RESOURCE_LOCK_MODEL.md", "09_EXECUTION_ENVIRONMENT_LEASE.md", "10_RISK_TIER_AND_REQUIRED_GATES.md", "11_WIP_DEFINITION_OF_READY_AND_DONE.md", "12_ADAPTIVE_PARALLELISM_AND_BACKPRESSURE.md", "13_BRANCH_COMMIT_PR_PROTOCOL.md", "14_HANDOFF_AND_REVIEW_PACKET_PROTOCOL.md", "15_INTEGRATION_TRAIN_AND_MERGE_QUEUE.md", "16_FREEZE_AND_INCIDENT_PROTOCOL.md", "17_LIVE_STATE_SNAPSHOT.md", "18_OPEN_PR_DISPOSITION_MATRIX.md", "19_ADOPTION_AND_MIGRATION_PLAN.md", "20_HUMAN_DECISIONS_REQUIRED.md", "21_V4_CHANGELOG_AND_V2_SUPERSESSION.md"],
  ...["governance-model.candidate.json", "business-phases.candidate.json", "phase-aliases.candidate.json", "role-catalog.candidate.json", "control-plane-state-machine.candidate.json", "risk-tier-policy.candidate.json", "queue-policy.candidate.json", "human-decisions.candidate.json", "resource-hierarchy.candidate.json", "live-state-snapshot.json", "open-pr-disposition.json", "manifest.json"].map((name) => `data/${name}`),
  ...["program-control-record.schema.json", "wip-lease.schema.json", "change-surface-manifest.schema.json", "environment-lease.schema.json", "resource-lock.schema.json", "implementation-packet.schema.json", "review-finding.schema.json", "security-review-packet.schema.json", "evidence-review-packet.schema.json", "integration-packet.schema.json", "decision-record.schema.json", "handoff-event.schema.json", "metric-record.schema.json"].map((name) => `schemas/${name}`),
  ...["EXAMPLE_RT0_DOCS_WIP.json", "EXAMPLE_RT2_RUNTIME_WIP.json"].map((name) => `examples/${name}`),
  ...["DIR-01_PROGRAM_DIRECTOR.md", "ARCH-01_DEPENDENCY_SCOUT.md", "OPS-01_ENVIRONMENT_COORDINATOR.md", "DEV-LANE_IMPLEMENTER.md", "QA-SEC_REVIEWER.md", "QA-EVID_REVIEWER.md", "INT-01_INTEGRATION_MANAGER.md", "GOV-01_EVIDENCE_VAULT_SYNC.md", "SCOUT_READONLY_SPECIALIST.md"].map((name) => `prompts/${name}`),
  ...["PROMPT_GOVERNANCE_ADOPTION_V4.md", "PROMPT_CONTROL_ISSUE_BOOTSTRAP_V4.md", "PROMPT_CURRENT_STATE_MIGRATION_V4.md", "PROMPT_VAULT_MIRROR_V4.md", "PROMPT_LEGACY_MAPPING_BATCH_V4.md", "PROMPT_TWO_LANE_PILOT_V4.md"].map((name) => `followups/${name}`),
];
const requiredScripts = ["generate.mjs", "check.mjs", "selftest.mjs", "simulate-scheduler.mjs"];
const expectedSourceLabels = [
  "Core OS / 安全基盤", "Company Brain 基盤", "Salesforce Mini / CRM基盤", "AI Growth Engine",
  "Human Certification Gate / AI安全実行", "Oracle Mini / ERP基盤", "PLUG型 Commerce / Affiliate / 購買エンジン",
  "Commerce / EC / Order Management", "Developer Cloud / 開発環境", "AI社員 Marketplace",
  "Oracle SCM / 在庫 / 調達 / サプライチェーン", "HCM / 採用 / 教育 / 人事", "Data Cloud / BI / Analytics",
  "Service Cloud / Contact Center / Customer Success", "Marketing Cloud / 広告代理店 / 共有ダッシュボード",
  "Industry Cloud / 業界別OS", "従業員配布基盤", "External API / Integration Hub",
  "Billing / Metering / Revenue Share", "Enterprise Governance", "369経済圏 / AI社員OS",
];

const deepClone = (value) => JSON.parse(JSON.stringify(value));
export const basePolicy = () => ({
  businessPhases: deepClone(businessPhases),
  aliases: deepClone(phaseAliases),
  roles: deepClone(roles),
  transitions: deepClone(transitions),
  lockModes: deepClone(lockModes),
  lockCompatibility: deepClone(lockCompatibility),
  resourceHierarchy: deepClone(resourceHierarchy),
  riskTiers: deepClone(riskTiers),
  queuePolicy: deepClone(queuePolicy),
  changeSurfaceFields: deepClone(changeSurfaceFields),
  environmentLeaseFields: deepClone(environmentLeaseFields),
  policyExample: {
    ...deepClone(policyExample),
    lockUpgradeAttempted: false,
    rt3Reviewers: { security: "QA-SEC-01", evidence: "QA-EVID-01" },
    environmentLeases: [
      { executionScope: "SHARED_HOST", host: "HOST-SYNTHETIC-A", database: "db_wip_1", redis: "redis_1", queuePrefix: "q_wip_1", port: "4101", fixture: "fixture_1", artifact: "artifact_1" },
      { executionScope: "SHARED_HOST", host: "HOST-SYNTHETIC-A", database: "db_wip_2", redis: "redis_2", queuePrefix: "q_wip_2", port: "4102", fixture: "fixture_2", artifact: "artifact_2" },
    ],
  },
  generatedAt: null,
});

const writeLike = (mode) => ["INTENT_WRITE", "WRITE", "EXCLUSIVE"].includes(mode);
const resourceParts = (resource) => {
  const index = resource.indexOf(":");
  return index < 0 ? [resource, ""] : [resource.slice(0, index), resource.slice(index + 1)];
};
const resourcesConflict = (left, right) => {
  if (!writeLike(left.mode) || !writeLike(right.mode)) return false;
  if (left.resource === right.resource) return true;
  const [leftType, leftId] = resourceParts(left.resource);
  const [rightType, rightId] = resourceParts(right.resource);
  if (leftType === "DIR" && rightType === "FILE") return rightId.startsWith(leftId.replace(/\*\*$/, ""));
  if (rightType === "DIR" && leftType === "FILE") return leftId.startsWith(rightId.replace(/\*\*$/, ""));
  if (leftType === "MODEL" && rightType === "MODEL_FIELD") return rightId.startsWith(`${leftId}.`);
  if (rightType === "MODEL" && leftType === "MODEL_FIELD") return leftId.startsWith(`${rightId}.`);
  if (leftType === "STATE_MACHINE" && rightType === "STATE_TRANSITION") return rightId.startsWith(`${leftId}:`);
  if (rightType === "STATE_MACHINE" && leftType === "STATE_TRANSITION") return leftId.startsWith(`${rightId}:`);
  return false;
};

export const validatePolicy = (policy) => {
  const errors = [];
  const ids = policy.businessPhases.map((item) => item.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate BP ID");
  if (policy.businessPhases.length !== 21) errors.push("BP count must be 21");
  policy.businessPhases.forEach((item, index) => {
    if (item.id !== `BP${String(index).padStart(2, "0")}`) errors.push(`non-sequential BP at ${index}`);
    if (item.sourceLabel !== expectedSourceLabels[index]) errors.push(`sourceLabel mismatch at ${item.id}`);
  });

  const directors = policy.policyExample.controlRecord.activeDirectors || [];
  if (directors.length !== 1) errors.push("active Director count must be 1");
  const currentToken = policy.policyExample.controlRecord.currentFencingToken;
  if (!currentToken || policy.policyExample.review.fencingToken !== currentToken) errors.push("stale fencing token");
  if (policy.policyExample.review.reviewerRole === policy.policyExample.review.authorRole || String(policy.policyExample.review.reviewerRole).startsWith("DEV")) errors.push("DEV self-review");
  if (policy.policyExample.review.reviewedSha !== policy.policyExample.review.currentSha && policy.policyExample.review.passValid) errors.push("SHA changed while old PASS remains valid");
  if (policy.policyExample.activeWriteWips > policy.queuePolicy.absolute.writeWips) errors.push("active write WIPs exceed absolute capacity");
  if (policy.queuePolicy.initial.writeWips !== 2 || policy.queuePolicy.absolute.writeWips !== 3) errors.push("writer capacity must be initial 2 / absolute 3");
  if (!policy.queuePolicy.backpressure.some((item) => item.includes("security_review_queue >= 3")) || !policy.queuePolicy.backpressure.some((item) => item.includes("integration_queue >= 2"))) errors.push("review/integration backpressure missing");
  if (!policy.policyExample.rt3Reviewers?.security || !policy.policyExample.rt3Reviewers?.evidence) errors.push("RT3 independent reviewers missing");
  if (policy.policyExample.lockUpgradeAttempted) errors.push("lock upgrade attempt forbidden");

  const locks = policy.policyExample.locks || [];
  for (let left = 0; left < locks.length; left += 1) {
    for (let right = left + 1; right < locks.length; right += 1) {
      if (resourcesConflict(locks[left], locks[right])) errors.push(`conflicting locks: ${locks[left].resource} / ${locks[right].resource}`);
    }
  }
  const lockOrder = locks.map((item) => `${item.resource}:${item.mode}`);
  if (lockOrder.join("\n") !== [...lockOrder].sort(compareText).join("\n")) errors.push("lock acquisition order is not canonical");

  const graph = new Map();
  for (const edge of policy.resourceHierarchy) {
    if (!graph.has(edge.parentType)) graph.set(edge.parentType, []);
    graph.get(edge.parentType).push(edge.childType);
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (node) => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const child of graph.get(node) || []) if (visit(child)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  for (const node of graph.keys()) if (visit(node)) errors.push("resource hierarchy cycle");

  for (const mode of policy.lockModes) {
    if (!policy.lockCompatibility[mode]) errors.push(`lock compatibility row missing: ${mode}`);
    for (const requested of policy.lockModes) if (typeof policy.lockCompatibility[mode]?.[requested] !== "boolean") errors.push(`lock compatibility cell missing: ${mode}/${requested}`);
  }

  const attempt = policy.policyExample.attemptedTransition;
  if (!policy.transitions.some((item) => item.from === attempt.from && item.to === attempt.to && item.authority.includes(attempt.actorRole))) errors.push("illegal state transition");
  if (policy.generatedAt !== null) errors.push("nondeterministic generatedAt");
  if (policy.aliases.some((item) => !item.relationship?.inverse)) errors.push("missing inverse relationship");
  if (!policy.policyExample.unknownRecordPolicy.listUnknownRecords) errors.push("unknown record hidden from list");
  for (const path of policy.policyExample.changedPaths || []) if (!allowedPrefixes.some((prefix) => path.startsWith(prefix))) errors.push(`forbidden path change: ${path}`);
  for (const required of ["manifest_id", "wip_id", "primary_bp", "allowed_paths", "resource_locks", "external_side_effects", "schema_impact", "migration_impact"]) if (!policy.changeSurfaceFields.includes(required)) errors.push(`Change Surface Manifest field missing: ${required}`);
  for (const required of ["environment_lease_id", "execution_scope", "execution_host_id", "worktree_id", "database_strategy", "redis_strategy", "queue_prefix", "external_send_enabled", "llm_provider", "production_endpoints_allowed"]) if (!policy.environmentLeaseFields.includes(required)) errors.push(`Environment Lease field missing: ${required}`);

  const leases = policy.policyExample.environmentLeases || [];
  const environmentKeys = ["database", "redis", "queuePrefix", "port", "fixture", "artifact"];
  for (let left = 0; left < leases.length; left += 1) {
    for (let right = left + 1; right < leases.length; right += 1) {
      if (leases[left].executionScope !== leases[right].executionScope || leases[left].host !== leases[right].host) continue;
      for (const key of environmentKeys) if (leases[left][key] && leases[left][key] === leases[right][key]) errors.push(`environment collision: ${key}`);
    }
  }
  return [...new Set(errors)];
};

const walk = async (root) => {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result.sort(compareText);
};

const checkFileSystem = async () => {
  const errors = [];
  const allFiles = await walk(candidateRoot);
  for (const relative of requiredCandidateFiles) if (!existsSync(resolve(candidateRoot, relative))) errors.push(`required candidate file missing: ${relative}`);
  for (const name of requiredScripts) if (!existsSync(resolve(scriptDir, name))) errors.push(`required script missing: ${name}`);
  for (const path of allFiles.filter((item) => extname(item) === ".json")) {
    try { JSON.parse(await readFile(path, "utf8")); } catch { errors.push(`invalid JSON: ${path.slice(repoRoot.length + 1)}`); }
  }

  const markdownFiles = allFiles.filter((item) => extname(item) === ".md");
  for (const path of markdownFiles) {
    const text = await readFile(path, "utf8");
    const rel = path.slice(repoRoot.length + 1);
    if ((text.match(/^# /gm) || []).length !== 1) errors.push(`H1 count must be 1: ${rel}`);
    if ((text.match(/```/g) || []).length % 2 !== 0) errors.push(`unbalanced code fence: ${rel}`);
    if (/^\*\s+-\s+/m.test(text)) errors.push(`malformed bullet: ${rel}`);
    const skipLegacy = ["03_PHASE_ALIAS_MODEL_CANDIDATE.md", "18_OPEN_PR_DISPOSITION_MATRIX.md", "21_V4_CHANGELOG_AND_V2_SUPERSESSION.md"].some((name) => path.endsWith(name));
    if (!skipLegacy && /\bPhase\s+(?:[0-9]+(?:\.[0-9]+)?|X|Y)\b/.test(text)) errors.push(`bare legacy Phase notation outside alias/inventory doc: ${rel}`);
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue;
      if (!existsSync(resolve(dirname(path), target))) errors.push(`broken relative link: ${rel} -> ${target}`);
    }
  }

  const scriptFiles = await walk(scriptDir);
  const publicText = (await Promise.all([...allFiles, ...scriptFiles].map((path) => readFile(path, "utf8")))).join("\n");
  if (/\/Users\/|\/home\/|\/private\/tmp\/|[A-Za-z]:\\\\Users\\\\/.test(publicText)) errors.push("personal absolute path found");
  if (/ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(publicText)) errors.push("secret-shaped value found");
  const forbiddenLegacyPath = ["phase-governance-multichat", "v3"].join("-");
  if (publicText.includes(forbiddenLegacyPath) || /Candidate-Version:\s*3\b/.test(publicText)) errors.push("V3 path/version residue found");

  for (const definition of rolePromptDefinitions) {
    const text = await readFile(resolve(candidateRoot, "prompts", definition.file), "utf8");
    if (!text.includes("Session start / resume handshake") || !text.includes("Untrusted content rule") || !text.includes("FENCING_TOKEN")) errors.push(`role prompt handshake/untrusted rule missing: ${definition.file}`);
  }

  const governance = JSON.parse(await readFile(resolve(candidateRoot, "data/governance-model.candidate.json"), "utf8"));
  if (governance.c49?.detailStatus !== "SOURCE_DETAIL_MISSING" || governance.c49?.inferredCompletionForbidden !== true) errors.push("C49 inference guard missing");
  const prData = JSON.parse(await readFile(resolve(candidateRoot, "data/open-pr-disposition.json"), "utf8"));
  if (prData.total !== 32 || new Set(prData.pullRequests.map((item) => item.number)).size !== prData.pullRequests.length) errors.push("PR inventory count/duplicate error");
  if (prData.pullRequests.some((item) => item.candidatePathCollision)) errors.push("candidate path collision present");
  if (!liveStateSnapshot.openPullRequests.paginationComplete || !liveStateSnapshot.openPullRequests.changedFilenamePaginationComplete) errors.push("PR inventory pagination incomplete");
  if (openPullRequests.some((item) => !/^[0-9a-f]{40}$/.test(item.baseSha) || !/^[0-9a-f]{40}$/.test(item.headSha))) errors.push("PR base/head SHA malformed");

  const status = execFileSync("git", ["status", "--porcelain=v1", "-uall", "-z"], { cwd: repoRoot, encoding: "utf8" });
  const statusPaths = status.split("\0").filter(Boolean).map((entry) => entry.slice(3));
  const committed = execFileSync("git", ["diff", "--name-only", "origin/main...HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  for (const path of [...new Set([...statusPaths, ...committed])]) if (!allowedPrefixes.some((prefix) => path.startsWith(prefix))) errors.push(`forbidden diff path: ${path}`);

  try {
    execFileSync(process.execPath, [resolve(scriptDir, "generate.mjs"), "--check"], { cwd: repoRoot, stdio: "pipe" });
  } catch (error) {
    errors.push(`generated diff: ${String(error.stderr || error.message).trim()}`);
  }
  return errors;
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const errors = [...validatePolicy(basePolicy()), ...await checkFileSystem()];
  if (errors.length > 0) {
    console.error(errors.map((item) => `FAIL ${item}`).join("\n"));
    process.exit(1);
  }
  console.log("PASS checker");
  console.log(`BP=${businessPhases.length} PR=${openPullRequests.length} candidateCollision=0 writerCapacity=${queuePolicy.initial.writeWips}/${queuePolicy.absolute.writeWips}`);
}
