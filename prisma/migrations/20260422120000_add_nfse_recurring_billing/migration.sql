-- Add enums for NFS-e and Billing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingFrequency') THEN
    CREATE TYPE "BillingFrequency" AS ENUM ('MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'ANNUAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NfseStatus') THEN
    CREATE TYPE "NfseStatus" AS ENUM ('RASCUNHO', 'EMITIDA', 'CANCELADA', 'REJEITADA_SEFAZ', 'PENDENTE_SEFAZ');
  END IF;
END $$;

-- Update Contract table for recurring billing
ALTER TABLE "Contract"
ADD COLUMN IF NOT EXISTS "billingFrequency" "BillingFrequency",
ADD COLUMN IF NOT EXISTS "billingDayOfMonth" INTEGER,
ADD COLUMN IF NOT EXISTS "billingMonth" INTEGER,
ADD COLUMN IF NOT EXISTS "monthlyValue" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "nextBillingDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastBilledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "generateNfse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "generateBoleto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "defaultTechnicianId" TEXT;

CREATE INDEX IF NOT EXISTS "Contract_nextBillingDate_idx" ON "Contract"("nextBillingDate");

-- Update Invoice table to reference NFS-e
ALTER TABLE "Invoice"
ADD COLUMN IF NOT EXISTS "nfseId" TEXT;

CREATE INDEX IF NOT EXISTS "Invoice_nfseId_idx" ON "Invoice"("nfseId");

-- Create Nfse table
CREATE TABLE IF NOT EXISTS "Nfse" (
  "id"                      TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "numero"                  INTEGER,
  "serie"                   TEXT NOT NULL DEFAULT '1',
  "codigoVerificacao"       TEXT,
  "statusNfse"              "NfseStatus" NOT NULL DEFAULT 'RASCUNHO',
  "serviceOrderId"          TEXT NOT NULL,
  "tomadorCpfCnpj"          TEXT NOT NULL,
  "tomadorRazaoSocial"      TEXT,
  "prestadorCnpj"           TEXT NOT NULL,
  "inscricaoMunicipal"      TEXT,
  "codigoServico"           TEXT NOT NULL,
  "discriminacao"           TEXT NOT NULL,
  "valorServicos"           DECIMAL(12, 2) NOT NULL,
  "valorDeducoes"           DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "aliquotaIss"             DECIMAL(5, 4) NOT NULL,
  "valorIss"                DECIMAL(12, 2) NOT NULL,
  "retencaoIrrf"            DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "retencaoPis"             DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "retencaoCofins"          DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "retencaoCsll"            DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "retencaoInss"            DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "xmlAssinado"             TEXT,
  "urlNfse"                 TEXT,
  "dataEmissao"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataCancelamento"        TIMESTAMP(3),
  "motivoCancelamento"      TEXT,
  "mensagensSefaz"          TEXT[] DEFAULT ARRAY[]::TEXT[],
  "certificadoA1UsadoEm"    TIMESTAMP(3),
  "criadoPor"               TEXT NOT NULL,
  "atualizadoPor"           TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"               TIMESTAMP(3),

  CONSTRAINT "Nfse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Nfse_serviceOrderId_key" ON "Nfse"("serviceOrderId");
CREATE INDEX IF NOT EXISTS "Nfse_numero_idx" ON "Nfse"("numero");
CREATE INDEX IF NOT EXISTS "Nfse_statusNfse_idx" ON "Nfse"("statusNfse");
CREATE INDEX IF NOT EXISTS "Nfse_dataEmissao_idx" ON "Nfse"("dataEmissao");
CREATE INDEX IF NOT EXISTS "Nfse_tomadorCpfCnpj_idx" ON "Nfse"("tomadorCpfCnpj");
CREATE INDEX IF NOT EXISTS "Nfse_codigoServico_idx" ON "Nfse"("codigoServico");

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_nfseId_fkey'
  ) THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_nfseId_fkey"
      FOREIGN KEY ("nfseId") REFERENCES "Nfse"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Nfse_serviceOrderId_fkey'
  ) THEN
    ALTER TABLE "Nfse"
      ADD CONSTRAINT "Nfse_serviceOrderId_fkey"
      FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
