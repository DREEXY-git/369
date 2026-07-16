#!/usr/bin/env node
const scaleEligible = (metrics) => metrics.consecutiveClosedWips >= 10
  && metrics.unplannedPathConflicts === 0
  && metrics.semanticLockMisses === 0
  && metrics.staleWriterPushes === 0
  && metrics.passAfterShaChange === 0
  && metrics.integrationCombinationFailures === 0
  && metrics.escapedHighP1 === 0
  && metrics.governanceVaultDivergence === 0
  && metrics.reviewQueueLimitBreaches === 0
  && metrics.humanApproval === true;

export const schedule = (input) => {
  const reasons = [];
  if (input.staleLeases > 0) reasons.push("STALE_LEASE_FREEZE");
  if (input.securityReviewQueue >= 3) reasons.push("SECURITY_REVIEW_BACKPRESSURE");
  if (input.evidenceReviewQueue >= 3) reasons.push("EVIDENCE_REVIEW_BACKPRESSURE");
  if (input.integrationQueue >= 2) reasons.push("INTEGRATION_BACKPRESSURE");
  if (input.singletonConflict) reasons.push("SINGLETON_CONFLICT");
  if (input.semanticLockConflict) reasons.push("SEMANTIC_LOCK_CONFLICT");
  if (input.nextRiskTier === "RT3" && input.rt3IntegrationActive) reasons.push("RT3_INTEGRATION_ONE_AT_A_TIME");
  if (!input.definitionOfReady) reasons.push("DEFINITION_OF_READY_INCOMPLETE");
  const capacity = scaleEligible(input.pilotMetrics) ? 3 : 2;
  if (input.activeWriteWips >= capacity) reasons.push("WRITE_CAPACITY_FULL");
  return {
    canStart: reasons.length === 0,
    writerCapacity: capacity,
    thirdLaneCandidate: capacity === 3,
    reasons,
  };
};

const cleanMetrics = {
  consecutiveClosedWips: 0,
  unplannedPathConflicts: 0,
  semanticLockMisses: 0,
  staleWriterPushes: 0,
  passAfterShaChange: 0,
  integrationCombinationFailures: 0,
  escapedHighP1: 0,
  governanceVaultDivergence: 0,
  reviewQueueLimitBreaches: 0,
  humanApproval: false,
};
const base = {
  activeWriteWips: 1,
  securityReviewQueue: 0,
  evidenceReviewQueue: 0,
  integrationQueue: 0,
  staleLeases: 0,
  singletonConflict: false,
  semanticLockConflict: false,
  nextRiskTier: "RT2",
  rt3IntegrationActive: false,
  definitionOfReady: true,
  pilotMetrics: cleanMetrics,
};
const scenarios = [
  ["healthy 2-lane", { ...base }, { canStart: true, writerCapacity: 2, reason: null }],
  ["QA backlog backpressure", { ...base, securityReviewQueue: 3 }, { canStart: false, writerCapacity: 2, reason: "SECURITY_REVIEW_BACKPRESSURE" }],
  ["singleton conflict", { ...base, singletonConflict: true }, { canStart: false, writerCapacity: 2, reason: "SINGLETON_CONFLICT" }],
  ["RT3 integration one-at-a-time", { ...base, nextRiskTier: "RT3", rt3IntegrationActive: true }, { canStart: false, writerCapacity: 2, reason: "RT3_INTEGRATION_ONE_AT_A_TIME" }],
  ["stale lease freeze", { ...base, staleLeases: 1 }, { canStart: false, writerCapacity: 2, reason: "STALE_LEASE_FREEZE" }],
  ["10 WIP pilot pass gives 3rd lane candidate", { ...base, activeWriteWips: 2, pilotMetrics: { ...cleanMetrics, consecutiveClosedWips: 10, humanApproval: true } }, { canStart: true, writerCapacity: 3, reason: null }],
];

for (const [name, input, expected] of scenarios) {
  const actual = schedule(input);
  const matches = actual.canStart === expected.canStart
    && actual.writerCapacity === expected.writerCapacity
    && (expected.reason === null || actual.reasons.includes(expected.reason));
  if (!matches) {
    console.error(`FAIL scheduler scenario: ${name}`);
    console.error(JSON.stringify(actual));
    process.exit(1);
  }
  console.log(`PASS scheduler scenario: ${name}`);
}
console.log(`PASS scheduler simulation ${scenarios.length}/${scenarios.length}`);
