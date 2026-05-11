import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AuditModule } from '../audit/audit.module';
import { NfseService } from './application/services/nfse.service';
import { ServiceCodeSyncService } from './application/services/service-code-sync.service';
import { NfseValidatorService } from './domain/services/nfse-validator.service';
import { NfseXmlGeneratorService } from './domain/services/nfse-xml-generator.service';
import { CertificadoA1Service } from './infrastructure/integrations/certificado-a1.service';
import { SefazIntegrationService } from './infrastructure/integrations/sefaz-integration.service';
import { NfseAuditService } from './infrastructure/services/nfse-audit.service';
import { NfseController } from './presentation/controllers/nfse.controller';
import { ServiceCodesController } from './presentation/controllers/service-codes.controller';

@Module({
  imports: [HttpModule, AuditModule],
  controllers: [NfseController, ServiceCodesController],
  providers: [
    NfseService,
    ServiceCodeSyncService,
    NfseValidatorService,
    NfseXmlGeneratorService,
    CertificadoA1Service,
    SefazIntegrationService,
    NfseAuditService
  ],
  exports: [NfseService, NfseXmlGeneratorService, ServiceCodeSyncService, NfseAuditService]
})
export class NfseModule {}
