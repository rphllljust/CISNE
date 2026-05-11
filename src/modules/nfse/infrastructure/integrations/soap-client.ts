// Cliente SOAP para integração com SEFAZ
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SoapRequest {
  method: string;
  namespace: string;
  body: Record<string, any>;
}

export interface SoapResponse {
  status: number;
  data: any;
}

export class SoapClient {
  constructor(
    private httpService: HttpService,
    private wsdlUrl: string,
    private timeout: number = 30000
  ) {}

  async call(request: SoapRequest): Promise<SoapResponse> {
    const envelope = this.buildSoapEnvelope(request);

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.wsdlUrl, envelope, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': `${request.namespace}#${request.method}`
          },
          timeout: this.timeout
        })
      );

      return {
        status: response.status,
        data: this.parseSoapResponse(response.data)
      };
    } catch (error) {
      throw new Error(
        `Erro ao chamar serviço SOAP: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private buildSoapEnvelope(request: SoapRequest): string {
    const bodyXml = Object.entries(request.body)
      .map(([key, value]) => `<${key}>${this.escapeXml(String(value))}</${key}>`)
      .join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${request.namespace}">
  <soap:Body>
    <tns:${request.method}>
      ${bodyXml}
    </tns:${request.method}>
  </soap:Body>
</soap:Envelope>`;
  }

  private parseSoapResponse(xmlResponse: string): Record<string, any> {
    // Extrai dados da resposta SOAP
    // Em produção, usar library como 'xml2js' para parsing completo
    const result: Record<string, any> = {};

    const patterns = [
      { tag: 'Numero', key: 'numero' },
      { tag: 'Serie', key: 'serie' },
      { tag: 'CodigoVerificacao', key: 'codigoVerificacao' },
      { tag: 'DataEmissao', key: 'dataEmissao' },
      { tag: 'Url', key: 'url' },
      { tag: 'Mensagem', key: 'mensagem' },
      { tag: 'Erro', key: 'erro' }
    ];

    patterns.forEach(({ tag, key }) => {
      const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g');
      const matches = xmlResponse.match(regex);
      if (matches) {
        result[key] = matches.map((m) => m.replace(/<[^>]*>/g, ''));
      }
    });

    return result;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
