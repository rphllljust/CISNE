// Serviço principal de NFS-e (orquestração)
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/application/services/audit.service';
import type { JwtUserPayload } from '@/modules/auth/domain/interfaces/jwt-user-payload.interface';
import { NfseValidatorService } from '../../domain/services/nfse-validator.service';
import { NfseXmlGeneratorService } from '../../domain/services/nfse-xml-generator.service';
import { CertificadoA1Service } from '../../infrastructure/integrations/certificado-a1.service';
import { SefazIntegrationService } from '../../infrastructure/integrations/sefaz-integration.service';
import type { NfseCreateInput, NfseEntity } from '../../domain/entities/nfse.entity';
import { obterAliquotaPadrao, obterServicoLC116 } from '../../domain/entities/lc116-service-codes';

@Injectable()
export class NfseService {
  private readonly logger = new Logger(NfseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validatorService: NfseValidatorService,
    private readonly xmlGeneratorService: NfseXmlGeneratorService,
    private readonly certificadoA1Service: CertificadoA1Service,
    private readonly sefazService: SefazIntegrationService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Cria e emite uma NFS-e automaticamente quando SO é finalizada
   * FLUXO CRÍTICO: Integração com módulo de invoices
   */
  async emitirNfseComSo(
    serviceOrderId: string,
    invoiceId: string,
    actor: JwtUserPayload
  ): Promise<NfseEntity> {
    try {
      this.logger.log(`📤 Iniciando emissão de NFS-e para SO ${serviceOrderId}`);

      // 1. Buscar Service Order
      const so = await this.prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: {
          client: true,
          invoice: true
        }
      });

      if (!so) {
        throw new NotFoundException('Service Order não encontrada');
      }

      if (so.status !== 'COMPLETED') {
        throw new BadRequestException('Service Order deve estar COMPLETED para emitir NFS-e');
      }

      // 2. Buscar Invoice
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId }
      });

      if (!invoice) {
        throw new NotFoundException('Invoice não encontrada');
      }

      // 3. Preparar dados da NFS-e - determinar código de serviço e alíquota
      const codigoServico = '0101'; // Padrão: Análise e desenvolvimento de sistemas
      const aliquotaPadrao = obterAliquotaPadrao(codigoServico);
      const servicoInfo = obterServicoLC116(codigoServico);

      const nfseInput: NfseCreateInput = {
        serviceOrderId,
        tomadorCpfCnpj: so.client.taxId,
        tomadorRazaoSocial: so.client.name,
        tomadorEmail: so.client.email || 'nao.informado@example.com',
        discriminacao: so.description || so.title,
        codigoServico,
        valorServicos: Number(invoice.grossAmount),
        valorDeducoes: Number(invoice.discountAmount || 0),
        aliquotaIss: aliquotaPadrao
      };

      // 4. Validar NFS-e
      const validacao = this.validatorService.validar(nfseInput);
      if (!validacao.valido) {
        throw new BadRequestException(`Validação falhou: ${validacao.erros.join(', ')}`);
      }

      if (validacao.avisos) {
        this.logger.warn(`⚠️ Avisos de validação: ${validacao.avisos.join(', ')}`);
      }

      // 5. Gerar XML da NFS-e com gerador ABRASF
      const xml = this.xmlGeneratorService.gerarXmlRps({
        numero: 1,
        serie: '1',
        tipo: 'RPS',
        dataEmissao: new Date().toISOString(),
        status: '1',
        codigoServico: nfseInput.codigoServico,
        descricao: nfseInput.discriminacao,
        valorServicos: Number(nfseInput.valorServicos),
        valorDeducoes: Number(nfseInput.valorDeducoes || 0),
        cpfCnpjTomador: nfseInput.tomadorCpfCnpj,
        nomeRazaoTomador: nfseInput.tomadorRazaoSocial,
        emailTomador: nfseInput.tomadorEmail,
        cpfCnpjPrestador: this.configService.get<string>('COMPANY_CNPJ', '12.345.678/0001-90'),
        nomeRazaoPrestador: this.configService.get<string>('COMPANY_NAME', 'Sua Empresa LTDA'),
        inscricaoMunicipal: this.configService.get<string>('COMPANY_MUNICIPAL_INSCRIPTION', '123456789')
      });

      this.xmlGeneratorService.validarXml(xml);

      // 6. Assinar XML com certificado A1
      const xmlAssinado = await this.certificadoA1Service.assinarXml(xml);

      // 7. Enviar para SEFAZ
      const respuestaSefaz = await this.sefazService.enviarRps(xmlAssinado, xmlAssinado);

      if (!respuestaSefaz.sucesso) {
        throw new BadRequestException(
          `SEFAZ rejeitou: ${respuestaSefaz.erros?.join(', ') || 'Erro desconhecido'}`
        );
      }

      // 8. Criar registro de NFS-e no banco
      const nfse = await this.prisma.nfse.create({
        data: {
          numero: respuestaSefaz.numeroNfse,
          serie: respuestaSefaz.serieRps || '1',
          codigoVerificacao: respuestaSefaz.codigoVerificacao,
          statusNfse: 'EMITIDA',
          serviceOrderId,
          tomadorCpfCnpj: nfseInput.tomadorCpfCnpj,
          tomadorRazaoSocial: nfseInput.tomadorRazaoSocial,
          prestadorCnpj: process.env.COMPANY_CNPJ || '12.345.678/0001-90',
          inscricaoMunicipal: process.env.COMPANY_MUNICIPAL_INSCRIPTION || '123456789',
          discriminacao: nfseInput.discriminacao,
          codigoServico: nfseInput.codigoServico,
          valorServicos: Number(nfseInput.valorServicos),
          valorDeducoes: Number(nfseInput.valorDeducoes || 0),
          aliquotaIss: Number(nfseInput.aliquotaIss || 0.05),
          valorIss: Number((Number(nfseInput.valorServicos) - Number(nfseInput.valorDeducoes || 0)) * Number(nfseInput.aliquotaIss || 0.05)),
          xmlAssinado: xmlAssinado,
          urlNfse: respuestaSefaz.url,
          criadoPor: actor.sub,
          certificadoA1UsadoEm: new Date()
        }
      });

      // 9. Registrar auditoria
      await this.auditService.register({
        actorId: actor.sub,
        action: 'NFSE_EMITIDA',
        resource: 'nfse',
        resourceId: nfse.id
      });

      // 10. Atualizar status da Invoice (opcional)
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { nfseId: nfse.id }
      });

      this.logger.log(`✅ NFS-e ${nfse.numero} emitida com sucesso`);

      return nfse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro ao emitir NFS-e: ${message}`);
      throw error;
    }
  }

  /**
   * Consulta status de NFS-e na SEFAZ
   */
  async consultarStatusNfse(nfseId: string): Promise<any> {
    const nfse = await this.prisma.nfse.findUnique({
      where: { id: nfseId }
    });

    if (!nfse) {
      throw new NotFoundException('NFS-e não encontrada');
    }

    if (!nfse.numero || !nfse.codigoVerificacao) {
      throw new BadRequestException('NFS-e ainda não foi emitida pela SEFAZ');
    }
    return this.sefazService.consultarNfse(nfse.numero, nfse.codigoVerificacao);
  }

  /**
   * Cancela uma NFS-e (operação crítica)
   */
  async cancelarNfse(
    nfseId: string,
    motivo: string,
    actor: JwtUserPayload
  ): Promise<any> {
    const nfse = await this.prisma.nfse.findUnique({
      where: { id: nfseId }
    });

    if (!nfse) {
      throw new NotFoundException('NFS-e não encontrada');
    }

    if (nfse.statusNfse === 'CANCELADA') {
      throw new ConflictException('NFS-e já foi cancelada');
    }

    // Assinar cancelamento
    const xmlAssinado = await this.certificadoA1Service.assinarXml(
      `<CancelamentoNfse><Motivo>${motivo}</Motivo></CancelamentoNfse>`
    );

    // Enviar para SEFAZ
    if (!nfse.numero) {
      throw new BadRequestException('NFS-e não possui número válido');
    }
    const respuesta = await this.sefazService.cancelarNfse(
      nfse.numero,
      motivo,
      xmlAssinado
    );

    if (respuesta.sucesso) {
      await this.prisma.nfse.update({
        where: { id: nfseId },
        data: {
          statusNfse: 'CANCELADA',
          dataCancelamento: new Date()
        }
      });

      await this.auditService.register({
        actorId: actor.sub,
        action: 'NFSE_CANCELADA',
        resource: 'nfse',
        resourceId: nfseId
      });
    }

    return respuesta;
  }

}
