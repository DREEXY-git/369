-- AlterTable
ALTER TABLE "ApprovalRequest" ADD COLUMN     "approverRoleRequired" "RoleKey",
ADD COLUMN     "auditLogId" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "payloadAfter" JSONB,
ADD COLUMN     "payloadBefore" JSONB,
ADD COLUMN     "reason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "requestedForAction" TEXT;

-- AlterTable
ALTER TABLE "DataAccessLog" ADD COLUMN     "action" TEXT NOT NULL DEFAULT 'read',
ADD COLUMN     "aiAgentId" TEXT,
ADD COLUMN     "consentGrantId" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "llmCallLogId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "policyDecision" TEXT,
ADD COLUMN     "sensitiveReasonId" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "ConsentPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "requiresConsent" BOOLEAN NOT NULL DEFAULT true,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "customerId" TEXT,
    "subjectLabel" TEXT NOT NULL DEFAULT '',
    "policyKey" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'granted',
    "version" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "note" TEXT NOT NULL DEFAULT '',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitiveAccessReason" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "dataType" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL,
    "approvedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensitiveAccessReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDecisionLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "label" "ConfidentialityLabel" NOT NULL DEFAULT 'NORMAL',
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "policyId" TEXT NOT NULL DEFAULT 'abac-v1',
    "matchedRules" TEXT[],
    "purpose" TEXT NOT NULL DEFAULT '',
    "requiredApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiredConsent" BOOLEAN NOT NULL DEFAULT false,
    "requiredReason" BOOLEAN NOT NULL DEFAULT false,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "payload" JSONB,
    "metadata" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'domain',
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusCode" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "signature" TEXT NOT NULL DEFAULT '',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationAccessLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "targetUserId" TEXT,
    "purpose" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "decision" TEXT NOT NULL DEFAULT 'allow',
    "withinBusinessHours" BOOLEAN NOT NULL DEFAULT true,
    "consentStatus" TEXT NOT NULL DEFAULT '',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordingAccessLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "recordingId" TEXT,
    "meetingId" TEXT,
    "purpose" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "decision" TEXT NOT NULL DEFAULT 'allow',
    "consentStatus" TEXT NOT NULL DEFAULT '',
    "external" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordingAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentPolicy_tenantId_idx" ON "ConsentPolicy"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentPolicy_tenantId_key_key" ON "ConsentPolicy"("tenantId", "key");

-- CreateIndex
CREATE INDEX "ConsentGrant_tenantId_policyKey_idx" ON "ConsentGrant"("tenantId", "policyKey");

-- CreateIndex
CREATE INDEX "ConsentGrant_tenantId_subjectUserId_idx" ON "ConsentGrant"("tenantId", "subjectUserId");

-- CreateIndex
CREATE INDEX "ConsentGrant_tenantId_customerId_idx" ON "ConsentGrant"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "SensitiveAccessReason_tenantId_actorId_idx" ON "SensitiveAccessReason"("tenantId", "actorId");

-- CreateIndex
CREATE INDEX "SensitiveAccessReason_tenantId_targetType_targetId_idx" ON "SensitiveAccessReason"("tenantId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "PolicyDecisionLog_tenantId_createdAt_idx" ON "PolicyDecisionLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PolicyDecisionLog_tenantId_decision_idx" ON "PolicyDecisionLog"("tenantId", "decision");

-- CreateIndex
CREATE INDEX "DomainEvent_tenantId_eventType_idx" ON "DomainEvent"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "DomainEvent_tenantId_status_idx" ON "DomainEvent"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DomainEvent_aggregateType_aggregateId_idx" ON "DomainEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainEvent_tenantId_idempotencyKey_key" ON "DomainEvent"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboxMessage_tenantId_status_nextAttemptAt_idx" ON "OutboxMessage"("tenantId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "OutboxMessage_eventId_idx" ON "OutboxMessage"("eventId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_tenantId_active_idx" ON "WebhookSubscription"("tenantId", "active");

-- CreateIndex
CREATE INDEX "WebhookDelivery_tenantId_status_idx" ON "WebhookDelivery"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_subscriptionId_idx" ON "WebhookDelivery"("subscriptionId");

-- CreateIndex
CREATE INDEX "LocationAccessLog_tenantId_createdAt_idx" ON "LocationAccessLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "LocationAccessLog_tenantId_targetUserId_idx" ON "LocationAccessLog"("tenantId", "targetUserId");

-- CreateIndex
CREATE INDEX "RecordingAccessLog_tenantId_createdAt_idx" ON "RecordingAccessLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_requestedForAction_idx" ON "ApprovalRequest"("tenantId", "requestedForAction");

-- CreateIndex
CREATE INDEX "DataAccessLog_tenantId_action_idx" ON "DataAccessLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "DataAccessLog_tenantId_entityType_entityId_idx" ON "DataAccessLog"("tenantId", "entityType", "entityId");
