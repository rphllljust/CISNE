import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NfseXmlGeneratorService } from './nfse-xml-generator.service';

describe('NfseXmlGeneratorService', () => {
  let service: NfseXmlGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NfseXmlGeneratorService]
    }).compile();

    service = module.get<NfseXmlGeneratorService>(NfseXmlGeneratorService);
  });

  describe('XML generation', () => {
    it('should generate valid RPS XML', () => {
      const xml = service.gerarXmlRps({
        numero: 1,
        serie: '1',
        tipo: 'RPS',
        dataEmissao: '2026-04-22T10:00:00Z',
        status: '1',
        codigoServico: '0101',
        descricao: 'Análise e desenvolvimento de sistemas',
        valorServicos: 1000,
        valorDeducoes: 100,
        cpfCnpjTomador: '12.345.678/0001-90',
        nomeRazaoTomador: 'Cliente XYZ LTDA',
        emailTomador: 'contato@cliente.com',
        cpfCnpjPrestador: '98.765.432/0001-12',
        nomeRazaoPrestador: 'Prestador LTDA',
        inscricaoMunicipal: '123456789'
      });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<RPS');
      expect(xml).toContain('<InfRPS');
      expect(xml).toContain('<Numero>1</Numero>');
      expect(xml).toContain('<Tomador>');
      expect(xml).toContain('<Servico>');
      expect(xml).toContain('<Prestador>');
      expect(xml).toContain('</RPS>');
    });

    it('should sanitize special XML characters in description', () => {
      const xml = service.gerarXmlRps({
        numero: 1,
        serie: '1',
        tipo: 'RPS',
        dataEmissao: '2026-04-22T10:00:00Z',
        status: '1',
        codigoServico: '0101',
        descricao: 'Serviço com <tags> & "caracteres" especiais',
        valorServicos: 1000,
        cpfCnpjTomador: '12345678901',
        nomeRazaoTomador: 'Empresa',
        cpfCnpjPrestador: '98765432000112',
        nomeRazaoPrestador: 'Prestador',
        inscricaoMunicipal: '123456789'
      });

      expect(xml).toContain('&lt;tags&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
      expect(xml).not.toContain('<tags>');
    });

    it('should handle optional fields', () => {
      const xml = service.gerarXmlRps({
        numero: 1,
        serie: '1',
        tipo: 'RPS',
        dataEmissao: '2026-04-22T10:00:00Z',
        status: '1',
        codigoServico: '0101',
        descricao: 'Serviço simples',
        valorServicos: 500,
        // valorDeducoes omitido
        // emailTomador omitido
        cpfCnpjTomador: '12345678901',
        nomeRazaoTomador: 'Empresa',
        cpfCnpjPrestador: '98765432000112',
        nomeRazaoPrestador: 'Prestador',
        inscricaoMunicipal: '123456789'
      });

      expect(xml).toContain('<Numero>1</Numero>');
      expect(xml).not.toContain('<Email></Email>');
    });

    it('should remove formatting from CPF/CNPJ', () => {
      const xml = service.gerarXmlRps({
        numero: 1,
        serie: '1',
        tipo: 'RPS',
        dataEmissao: '2026-04-22T10:00:00Z',
        status: '1',
        codigoServico: '0101',
        descricao: 'Serviço',
        valorServicos: 1000,
        cpfCnpjTomador: '123.456.789-09', // CPF com formatação
        nomeRazaoTomador: 'Pessoa Física',
        cpfCnpjPrestador: '98.765.432/0001-12', // CNPJ com formatação
        nomeRazaoPrestador: 'Prestador',
        inscricaoMunicipal: '123456789'
      });

      expect(xml).toContain('12345678909'); // CPF sem formatação
      expect(xml).toContain('98765432000112'); // CNPJ sem formatação
      expect(xml).not.toContain('123.456.789-09');
      expect(xml).not.toContain('98.765.432/0001-12');
    });
  });

  describe('XML validation', () => {
    it('should accept valid XML', () => {
      const xml = service.gerarXmlRps({
        numero: 1,
        serie: '1',
        tipo: 'RPS',
        dataEmissao: '2026-04-22T10:00:00Z',
        status: '1',
        codigoServico: '0101',
        descricao: 'Serviço',
        valorServicos: 1000,
        cpfCnpjTomador: '12345678901',
        nomeRazaoTomador: 'Empresa',
        cpfCnpjPrestador: '98765432000112',
        nomeRazaoPrestador: 'Prestador',
        inscricaoMunicipal: '123456789'
      });

      expect(() => service.validarXml(xml)).not.toThrow();
    });

    it('should reject XML without declaration', () => {
      const invalidXml = '<RPS><InfRPS>test</InfRPS></RPS>';
      expect(() => service.validarXml(invalidXml)).toThrow(BadRequestException);
    });

    it('should reject XML without required elements', () => {
      const invalidXml = '<?xml version="1.0"?><RPS></RPS>';
      expect(() => service.validarXml(invalidXml)).toThrow(BadRequestException);
    });
  });
});
