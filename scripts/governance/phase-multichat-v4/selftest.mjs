#!/usr/bin/env node
import { basePolicy, validatePolicy } from "./check.mjs";

const clone = (value) => JSON.parse(JSON.stringify(value));
const cases = [
  ["duplicate BP ID", "duplicate BP ID", (p) => { p.businessPhases[1].id = p.businessPhases[0].id; }],
  ["2 active Director", "active Director count", (p) => { p.policyExample.controlRecord.activeDirectors.push("AGENT-DIR-02-SYNTHETIC"); }],
  ["stale fencing token", "stale fencing token", (p) => { p.policyExample.review.fencingToken = "FT-OLD"; }],
  ["DEV self-review", "DEV self-review", (p) => { p.policyExample.review.reviewerRole = p.policyExample.review.authorRole; }],
  ["conflicting WRITE locks", "conflicting locks", (p) => { p.policyExample.locks = [{ resource: "MODEL:Invoice", mode: "WRITE", owner: "A" }, { resource: "MODEL:Invoice", mode: "WRITE", owner: "B" }]; }],
  ["parent/child lock conflict", "conflicting locks", (p) => { p.policyExample.locks = [{ resource: "DIR:apps/web/**", mode: "WRITE", owner: "A" }, { resource: "FILE:apps/web/page.ts", mode: "WRITE", owner: "B" }]; }],
  ["lock upgrade attempt", "lock upgrade attempt", (p) => { p.policyExample.lockUpgradeAttempted = true; }],
  ["4 active write WIPs", "active write WIPs exceed", (p) => { p.policyExample.activeWriteWips = 4; }],
  ["RT3 missing QA-SEC", "RT3 independent reviewers missing", (p) => { p.policyExample.rt3Reviewers.security = null; }],
  ["old PASS after SHA change", "SHA changed while old PASS", (p) => { p.policyExample.review.currentSha = "3333333333333333333333333333333333333333"; }],
  ["illegal state transition", "illegal state transition", (p) => { p.policyExample.attemptedTransition = { from: "ACTIVE", to: "CLOSED", actorRole: "DEV-01..03" }; }],
  ["nondeterministic generatedAt", "nondeterministic generatedAt", (p) => { p.generatedAt = "AUTO_NOW"; }],
  ["missing inverse relationship", "missing inverse relationship", (p) => { delete p.aliases[0].relationship.inverse; }],
  ["unknown record hidden", "unknown record hidden", (p) => { p.policyExample.unknownRecordPolicy.listUnknownRecords = false; }],
  ["forbidden path change", "forbidden path change", (p) => { p.policyExample.changedPaths.push("apps/web/page.tsx"); }],
];

let passed = 0;
for (const [name, expected, mutate] of cases) {
  const policy = clone(basePolicy());
  mutate(policy);
  const errors = validatePolicy(policy);
  if (!errors.some((error) => error.includes(expected))) {
    console.error(`FAIL ${name}: expected ${expected}; received ${errors.join(" | ")}`);
    process.exit(1);
  }
  console.log(`PASS negative self-test: ${name}`);
  passed += 1;
}
console.log(`PASS selftest ${passed}/${cases.length}`);
