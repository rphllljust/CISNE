import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface RpsData {
  numero: number;
  serie: string;
  tipo: string; // RPS, RPA, NFS-e
  dataEmissao: string;
  status: string;
  codigoServico: string;
  descricao: string;
  valorServicos: number;
  valorDeducoes?: number;
  cpfCnpjTomador: string;
  nomeRazaoTomador: string;
  emailTomador?: string;
  cpfCnpjPrestador: string;
  nomeRazaoPrestador: string;
  inscricaoMunicipal: string;
}

@Injectable()
export class NfseXmlGeneratorService {
  private readonly logger = new Logger(NfseXmlGeneratorService.name);

  /**
   * Gera XML RPS conforme padrão ABRASF
   * Implementação conforme NT 2.02
   */
  gerarXmlRps(data: RpsData): string {
    const timestamp = new Date().toISOString();
    const valorLiquido = data.valorServicos - (data.valorDeducoes || 0);

    // Sanitizar valores para evitar injeção XML
    const descricaoSanitizada = this.sanitizarXml(data.descricao);
    const nomeRazaoSanitizada = this.sanitizarXml(data.nomeRazaoTomador);
    const nomeRazaoPrestadorSanitizada = this.sanitizarXml(data.nomeRazaoPrestador);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RPS xmlns="http://www.abrasf.org.br/nfse">
  <InfRPS Id="RPS${data.numero}">
    <Numero>${data.numero}</Numero>
    <Serie>${this.sanitizarXml(data.serie)}</Serie>
    <Tipo>${this.sanitizarXml(data.tipo || 'RPS')}</Tipo>
    <DataEmissao>${data.dataEmissao}</DataEmissao>
    <Status>${this.sanitizarXml(data.status || '1')}</Status>
    <Tomador>
      <IdentificacaoTomador>
        <CpfCnpj>
          <${data.cpfCnpjTomador.includes('.') || data.cpfCnpjTomador.length > 11 ? 'Cnpj' : 'Cpf'}>${this.removerFormatacao(data.cpfCnpjTomador)}</${data.cpfCnpjTomador.includes('.') || data.cpfCnpjTomador.length > 11 ? 'Cnpj' : 'Cpf'}>
        </CpfCnpj>
      </IdentificacaoTomador>
      <RazaoSocial>${nomeRazaoSanitizada}</RazaoSocial>
      ${data.emailTomador ? `<Email>${this.sanitizarXml(data.emailTomador)}</Email>` : ''}
    </Tomador>
    <Servico>
      <Valores>
        <ValorServicos>${valorLiquido.toFixed(2)}</ValorServicos>
        ${data.valorDeducoes && data.valorDeducoes > 0 ? `<ValorDeducoes>${data.valorDeducoes.toFixed(2)}</ValorDeducoes>` : ''}
      </Valores>
      <ItemServico>
        <Descricao>${descricaoSanitizada}</Descricao>
        <Quantidade>1</Quantidade>
        <Valor>${data.valorServicos.toFixed(2)}</Valor>
      </ItemServico>
      <CodigoServico>${data.codigoServico}</CodigoServico>
      <IssRetido>false</IssRetido>
    </Servico>
    <Prestador>
      <IdentificacaoPrestador>
        <Cnpj>${this.removerFormatacao(data.cpfCnpjPrestador)}</Cnpj>
        <InscricaoMunicipal>${this.sanitizarXml(data.inscricaoMunicipal)}</InscricaoMunicipal>
      </IdentificacaoPrestador>
      <RazaoSocial>${nomeRazaoPrestadorSanitizada}</RazaoSocial>
    </Prestador>
  </InfRPS>
</RPS>`;

    this.logger.log(`✅ XML RPS gerado para serviço ${data.codigoServico}`);
    return xml;
  }

  /**
   * Sanitiza string para evitar injeção XML
   */
  private sanitizarXml(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .substring(0, 2000); // Limitar tamanho
  }

  /**
   * Remove formatação de CPF/CNPJ
   */
  private removerFormatacao(cpfCnpj: string): string {
    return cpfCnpj.replace(/\D/g, '');
  }

  /**
   * Valida XML básico
   */
  validarXml(xml: string): boolean {
    try {
      // Validações básicas
      if (!xml.includes('<?xml')) {
        throw new Error('XML inválido: falta declaração XML');
      }

      if (!xml.includes('<InfRPS')) {
        throw new Error('XML inválido: falta elemento InfRPS');
      }

      if (!xml.includes('<Tomador>')) {
        throw new Error('XML inválido: falta elemento Tomador');
      }

      if (!xml.includes('<Servico>')) {
        throw new Error('XML inválido: falta elemento Servico');
      }

      if (!xml.includes('<Prestador>')) {
        throw new Error('XML inválido: falta elemento Prestador');
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Validação XML falhou: ${message}`);
      throw new BadRequestException(`XML inválido: ${message}`);
    }
  }
}
