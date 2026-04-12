-- MÓDULO 1+2+4+7: Document Automation, WhatsApp Notifications, Automation Metrics
-- Data: 2026-04-11

-- 1. Adicionar campos de automação ao ServiceOrder
ALTER TABLE "ServiceOrder"
  ADD COLUMN IF NOT EXISTS "slaDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "estimatedValue" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "autoCreated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sourceExtractionId" TEXT,
  ADD COLUMN IF NOT EXISTS "budgetRequiresApproval" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "budgetApprovalStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "budgetApprovedById" TEXT,
  ADD COLUMN IF NOT EXISTS "budgetApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "budgetRejectionReason" TEXT;

-- 2. Índices para campos de automação no ServiceOrder
CREATE INDEX IF NOT EXISTS "ServiceOrder_autoCreated_idx" ON "ServiceOrder"("autoCreated");
CREATE INDEX IF NOT EXISTS "ServiceOrder_budgetApprovalStatus_idx" ON "ServiceOrder"("budgetApprovalStatus");

-- 3. FK de aprovação de orçamento (para User)
ALTER TABLE "ServiceOrder"
  ADD CONSTRAINT "ServiceOrder_budgetApprovedById_fkey"
  FOREIGN KEY ("budgetApprovedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

-- 4. Tornar Notification.userId opcional (WhatsApp sem usuário cadastrado)
ALTER TABLE "Notification"
  ALTER COLUMN "userId" DROP NOT NULL;

-- 5. Índice extra em Notification por canal
CREATE INDEX IF NOT EXISTS "Notification_channel_status_idx" ON "Notification"("channel", "status");

-- 6. Criar tabela DocumentExtraction (MÓDULO 1+7)
CREATE TABLE IF NOT EXISTS "DocumentExtraction" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sourceType"        TEXT NOT NULL,
  "rawContent"        TEXT NOT NULL,
  "extractedData"     JSONB NOT NULL,
  "fieldValidations"  JSONB NOT NULL,
  "overallConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isComplete"        BOOLEAN NOT NULL DEFAULT false,
  "missingFields"     TEXT[] NOT NULL DEFAULT '{}',
  "warnings"          TEXT[] NOT NULL DEFAULT '{}',
  "mappedData"        JSONB,
  "autoProcessed"     BOOLEAN NOT NULL DEFAULT false,
  "manuallyCorrectd"  BOOLEAN NOT NULL DEFAULT false,
  "correctedAt"       TIMESTAMP(3),
  "resolvedClientId"  TEXT,
  "serviceOrderId"    TEXT,
  "createdById"       TEXT NOT NULL,
  "correctedById"     TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocumentExtraction_pkey" PRIMARY KEY ("id")
);

-- 7. FK de DocumentExtraction
ALTER TABLE "DocumentExtraction"
  ADD CONSTRAINT "DocumentExtraction_serviceOrderId_fkey"
  FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "DocumentExtraction"
  ADD CONSTRAINT "DocumentExtraction_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "DocumentExtraction"
  ADD CONSTRAINT "DocumentExtraction_correctedById_fkey"
  FOREIGN KEY ("correctedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

-- 8. Índices de DocumentExtraction
CREATE INDEX IF NOT EXISTS "DocumentExtraction_sourceType_idx" ON "DocumentExtraction"("sourceType");
CREATE INDEX IF NOT EXISTS "DocumentExtraction_overallConfidence_idx" ON "DocumentExtraction"("overallConfidence");
CREATE INDEX IF NOT EXISTS "DocumentExtraction_autoProcessed_idx" ON "DocumentExtraction"("autoProcessed");
CREATE INDEX IF NOT EXISTS "DocumentExtraction_manuallyCorrectd_idx" ON "DocumentExtraction"("manuallyCorrectd");
CREATE INDEX IF NOT EXISTS "DocumentExtraction_serviceOrderId_idx" ON "DocumentExtraction"("serviceOrderId");
CREATE INDEX IF NOT EXISTS "DocumentExtraction_createdAt_idx" ON "DocumentExtraction"("createdAt");
