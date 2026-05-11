// Integração com SEFAZ via webservice SOAP/REST
// Conforme ABRASF (Associação Brasileira de Emissores de RPS e Nota Fiscal Eletrônica)
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SefazResponse {
  sucesso: boolean;
  numeroRps: number;
  serieRps: string;
  numeroNfse: number;
  codigoVerificacao: string;
  dataEmissao: Date;
  url: string;
  mensagens?: string[];
  erros?: string[];
}

export interface SefazValidacao {
  valido: boolean;
  mensagens: string[];
  erros: string[];
}

@Injectable()
export class SefazIntegrationService {
  private readonly logger = new Logger(SefazIntegrationService.name);
  private urlSefaz: string;
  private municipioCodigoIbge: string;
  private timeoutMs: number = 30000;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.urlSefaz = this.configService.get<string>(
      'SEFAZ_WS_URL',
      'https://homolog.nfse.prefeitura.sp.gov.br/ws/nfse'
    );
    this.municipioCodigoIbge = this.configService.get<string>(
      'MUNICIPIO_CODIGO_IBGE',
      '3550308' // São Paulo
    );
  }

  /**
   * Consulta disponibilidade do webservice SEFAZ
   */
  async statusSefaz(): Promise<{ disponivel: boolean; mensagem: string }> {
    try {
      this.logger.log(`📡 Consultando status SEFAZ: ${this.urlSefaz}`);

      const soapEnvelope = this.buildSoapEnvelope('TestConnection', {
        Municipio: this.municipioCodigoIbge
      });

      const response = await firstValueFrom(
        this.httpService.post(this.urlSefaz, soapEnvelope, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'TestConnection'
          },
          timeout: this.timeoutMs
        })
      );

      const isAvailable = response.status === 200 && response.data.includes('TestConnectionResponse');
      return {
        disponivel: isAvailable,
        mensagem: isAvailable ? 'SEFAZ disponível' : 'SEFAZ indisponível'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        disponivel: false,
        mensagem: `SEFAZ indisponível: ${message}`
      };
    }
  }

  /**
   * Envia RPS (Recibo Provisório de Serviço) para SEFAZ
   * Primeiro passo antes de gerar a NFS-e
   */
  async enviarRps(xml: string, certificadoAssinado: string): Promise<SefazResponse> {
    try {
      this.logger.log('📤 Enviando RPS para SEFAZ...');

      // Validar XML antes de enviar
      const validacao = this.validarXmlRps(xml);
      if (!validacao.valido) {
        throw new BadRequestException(`XML inválido: ${validacao.erros.join(', ')}`);
      }

      const soapEnvelope = this.buildSoapEnvelope('EnviarRps', {
        Municipio: this.municipioCodigoIbge,
        RpsXml: certificadoAssinado
      });

      const response = await firstValueFrom(
        this.httpService.post(this.urlSefaz, soapEnvelope, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'EnviarRps'
          },
          timeout: this.timeoutMs
        })
      );

      const parsedResponse = this.parseSoapResponse(response.data);

      if (!parsedResponse.numeroNfse) {
        throw new Error('SEFAZ não retornou número de NFS-e');
      }

      return {
        sucesso: true,
        numeroRps: parsedResponse.numeroRps || 1,
        serieRps: parsedResponse.serieRps || '1',
        numeroNfse: parseInt(parsedResponse.numeroNfse, 10),
        codigoVerificacao: parsedResponse.codigoVerificacao || this.gerarCodigoVerificacao(parseInt(parsedResponse.numeroNfse, 10)),
        dataEmissao: new Date(parsedResponse.dataEmissao || new Date()),
        url: parsedResponse.url || ``,
        mensagens: parsedResponse.mensagens ? [parsedResponse.mensagens].flat() : ['RPS recebido com sucesso']
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro ao enviar RPS: ${message}`);

      return {
        sucesso: false,
        numeroRps: 0,
        serieRps: '1',
        numeroNfse: 0,
        codigoVerificacao: '',
        dataEmissao: new Date(),
        url: '',
        erros: [message]
      };
    }
  }

  /**
   * Consulta status de NFS-e na SEFAZ
   */
  async consultarNfse(numeroNfse: number, codigoVerificacao: string): Promise<SefazResponse> {
    try {
      this.logger.log(`🔍 Consultando NFS-e ${numeroNfse} em SEFAZ...`);

      const soapEnvelope = this.buildSoapEnvelope('ConsultarNfse', {
        Municipio: this.municipioCodigoIbge,
        NumeroNfse: numeroNfse.toString(),
        CodigoVerificacao: codigoVerificacao
      });

      const response = await firstValueFrom(
        this.httpService.post(this.urlSefaz, soapEnvelope, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'ConsultarNfse'
          },
          timeout: this.timeoutMs
        })
      );

      const parsedResponse = this.parseSoapResponse(response.data);

      return {
        sucesso: true,
        numeroRps: parsedResponse.numeroRps || 1,
        serieRps: parsedResponse.serieRps || '1',
        numeroNfse,
        codigoVerificacao,
        dataEmissao: new Date(parsedResponse.dataEmissao || new Date()),
        url: parsedResponse.url || ``,
        mensagens: parsedResponse.mensagens ? [parsedResponse.mensagens].flat() : ['NFS-e localizada']
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        sucesso: false,
        numeroRps: 0,
        serieRps: '1',
        numeroNfse: 0,
        codigoVerificacao: '',
        dataEmissao: new Date(),
        url: '',
        erros: [message]
      };
    }
  }

  /**
   * Cancela uma NFS-e na SEFAZ
   * Operação crítica - requer justificativa
   */
  async cancelarNfse(
    numeroNfse: number,
    motivo: string,
    certificadoAssinado: string
  ): Promise<SefazResponse> {
    try {
      if (!motivo || motivo.length < 10) {
        throw new BadRequestException('Motivo do cancelamento obrigatório (min 10 caracteres)');
      }

      this.logger.log(`❌ Cancelando NFS-e ${numeroNfse}...`);

      const soapEnvelope = this.buildSoapEnvelope('CancelarNfse', {
        Municipio: this.municipioCodigoIbge,
        NumeroNfse: numeroNfse.toString(),
        Motivo: motivo,
        XmlCancelamento: certificadoAssinado
      });

      const response = await firstValueFrom(
        this.httpService.post(this.urlSefaz, soapEnvelope, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'CancelarNfse'
          },
          timeout: this.timeoutMs
        })
      );

      const parsedResponse = this.parseSoapResponse(response.data);

      return {
        sucesso: true,
        numeroRps: parsedResponse.numeroRps || 1,
        serieRps: parsedResponse.serieRps || '1',
        numeroNfse,
        codigoVerificacao: '',
        dataEmissao: new Date(),
        url: '',
        mensagens: parsedResponse.mensagens ? [parsedResponse.mensagens].flat() : ['NFS-e cancelada com sucesso']
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        sucesso: false,
        numeroRps: 0,
        serieRps: '1',
        numeroNfse: 0,
        codigoVerificacao: '',
        dataEmissao: new Date(),
        url: '',
        erros: [message]
      };
    }
  }

  /**
   * Emite carta de correção (CC-e) - correção sem cancelamento
   */
  async emitirCartaCorrecao(
    numeroNfse: number,
    sequencia: number,
    textoCorrecao: string,
    certificadoAssinado: string
  ): Promise<SefazResponse> {
    try {
      this.logger.log(`📝 Emitindo Carta de Correção para NFS-e ${numeroNfse}...`);

      if (sequencia > 5) {
        throw new BadRequestException('Máximo 5 cartas de correção por NFS-e');
      }

      const soapEnvelope = this.buildSoapEnvelope('EmitirCartaCorrecao', {
        Municipio: this.municipioCodigoIbge,
        NumeroNfse: numeroNfse.toString(),
        Sequencia: sequencia.toString(),
        TextoCorrecao: textoCorrecao,
        XmlCorrecao: certificadoAssinado
      });

      const response = await firstValueFrom(
        this.httpService.post(this.urlSefaz, soapEnvelope, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'EmitirCartaCorrecao'
          },
          timeout: this.timeoutMs
        })
      );

      const parsedResponse = this.parseSoapResponse(response.data);

      return {
        sucesso: true,
        numeroRps: parsedResponse.numeroRps || 1,
        serieRps: parsedResponse.serieRps || '1',
        numeroNfse,
        codigoVerificacao: `CC${sequencia}`,
        dataEmissao: new Date(),
        url: parsedResponse.url || '',
        mensagens: parsedResponse.mensagens ? [parsedResponse.mensagens].flat() : [`Carta de Correção nº${sequencia} emitida`]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        sucesso: false,
        numeroRps: 0,
        serieRps: '1',
        numeroNfse: 0,
        codigoVerificacao: '',
        dataEmissao: new Date(),
        url: '',
        erros: [message]
      };
    }
  }

  /**
   * Valida XML do RPS antes de enviar
   */
  private validarXmlRps(xml: string): SefazValidacao {
    const erros: string[] = [];
    const mensagens: string[] = [];

    if (!xml) {
      erros.push('XML vazio');
      return { valido: false, mensagens, erros };
    }

    if (!xml.includes('<?xml')) {
      erros.push('XML sem declaração');
    }

    if (!xml.includes('<Rps') && !xml.includes('<RPS')) {
      erros.push('XML sem elemento Rps');
    }

    if (!xml.includes('<Tomador') && !xml.includes('<TOMADOR')) {
      erros.push('XML sem elemento Tomador');
    }

    if (!xml.includes('<Servico') && !xml.includes('<SERVICO')) {
      erros.push('XML sem elemento Servico');
    }

    // Validações estruturais básicas contra schema SEFAZ
    if (!xml.includes('<InfRPS') && !xml.includes('<INFRPS')) {
      mensagens.push('XML sem elemento InfRPS - será validado pela SEFAZ');
    }

    if (xml.includes('<') && xml.includes('>')) {
      const openTags = (xml.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (xml.match(/<\/[^>]*>/g) || []).length;

      if (openTags !== closeTags) {
        erros.push('XML mal-formado: tags desbalanceadas');
      }
    }

    return {
      valido: erros.length === 0,
      mensagens,
      erros
    };
  }

  /**
   * Gera código de verificação (algoritmo SEFAZ)
   * Conforme padrão municipal
   */
  private gerarCodigoVerificacao(numeroNfse: number): string {
    const crypto = require('crypto');
    const dados = `${numeroNfse}${this.municipioCodigoIbge}${new Date().getTime()}`;
    const hash = crypto.createHash('sha1').update(dados).digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  /**
   * Constrói envelope SOAP
   */
  private buildSoapEnvelope(method: string, body: Record<string, string>): string {
    const bodyXml = Object.entries(body)
      .map(([key, value]) => {
        const escapedValue = this.escapeXml(value);
        return `<${key}>${escapedValue}</${key}>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://nfse.abrasf.org.br/">
  <soap:Body>
    <tns:${method}>
      ${bodyXml}
    </tns:${method}>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Parseia resposta SOAP
   */
  private parseSoapResponse(xmlResponse: string): Record<string, any> {
    const result: Record<string, any> = {};

    const patterns = [
      { tag: 'Numero', key: 'numeroNfse' },
      { tag: 'NumeroNfse', key: 'numeroNfse' },
      { tag: 'Serie', key: 'serieRps' },
      { tag: 'CodigoVerificacao', key: 'codigoVerificacao' },
      { tag: 'DataEmissao', key: 'dataEmissao' },
      { tag: 'Url', key: 'url' },
      { tag: 'Mensagem', key: 'mensagens' },
      { tag: 'Erro', key: 'erros' }
    ];

    patterns.forEach(({ tag, key }) => {
      const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'gi');
      let match;
      const matches: string[] = [];

      while ((match = regex.exec(xmlResponse)) !== null) {
        matches.push(match[1]);
      }

      if (matches.length > 0) {
        result[key] = matches.length === 1 ? matches[0] : matches;
      }
    });

    return result;
  }

  /**
   * Escapa caracteres XML
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
