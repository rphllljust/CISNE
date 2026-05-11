// Validador de NFS-e conforme padrões SEFAZ e LC 116/2003
import { Injectable } from '@nestjs/common';
import type { NfseEntity, NfseValidacao } from '../entities/nfse.entity';

@Injectable()
export class NfseValidatorService {
  /**
   * Valida uma NFS-e antes de emitir
   * Conforme ABRASF e Instrução Normativa de cada municipalidade
   */
  validar(nfse: Partial<NfseEntity>): NfseValidacao {
    const erros: string[] = [];
    const avisos: string[] = [];

    // ✅ Validações obrigatórias (CRÍTICAS)
    if (!nfse.serviceOrderId) {
      erros.push('Service Order ID obrigatório');
    }

    if (!nfse.tomadorCpfCnpj || !this.validarCpfCnpj(nfse.tomadorCpfCnpj)) {
      erros.push('CPF/CNPJ do tomador inválido');
    }

    if (nfse.prestadorCnpj && !this.validarCpfCnpj(nfse.prestadorCnpj)) {
      erros.push('CNPJ da prestadora inválido');
    }

    if (!nfse.discriminacao || nfse.discriminacao.length < 10) {
      erros.push('Discriminação do serviço deve ter no mínimo 10 caracteres');
    }

    if (!nfse.codigoServico || !/^\d{4}$/.test(nfse.codigoServico)) {
      erros.push('código de serviço inválido (deve ser 4 dígitos conforme LC 116/2003)');
    }

    // ✅ Validações de valor
    if (!nfse.valorServicos || nfse.valorServicos <= 0) {
      erros.push('valor de serviços deve ser > 0');
    }

    if ((nfse.valorDeducoes ?? 0) < 0) {
      erros.push('Valor de deduções não pode ser negativo');
    }

    if ((nfse.valorDeducoes ?? 0) > (nfse.valorServicos ?? 0)) {
      erros.push('deduções não podem ser maiores que valor de serviços');
    }

    // ✅ Validações de aliquota ISS
    if (nfse.aliquotaIss === null || nfse.aliquotaIss === undefined) {
      erros.push('alíquota ISS obrigatória');
    } else if (nfse.aliquotaIss < 0) {
      erros.push('alíquota ISS não pode ser negativa');
    } else if (nfse.aliquotaIss > 0.05) {
      erros.push('alíquota ISS não pode exceder 5% (LC 116/2003)');
    }

    // ✅ Validações de retenção
    const retencoes = {
      irrf: (nfse.retencaoIrrf ?? 0),
      pis: (nfse.retencaoPis ?? 0),
      cofins: (nfse.retencaoCofins ?? 0),
      csll: (nfse.retencaoCsll ?? 0),
      inss: (nfse.retencaoInss ?? 0)
    };

    Object.entries(retencoes).forEach(([tipo, valor]) => {
      if (valor < 0) {
        erros.push(`Retenção ${tipo.toUpperCase()} não pode ser negativa`);
      }
    });

    // ✅ Validação de retenções totais
    const totalRetencoes = Object.values(retencoes).reduce((a, b) => a + b, 0);
    if (totalRetencoes > (nfse.valorServicos ?? 0)) {
      erros.push('retenção total não pode exceder valor de serviços');
    }

    // ✅ Cálculo final
    const valorNfse = (nfse.valorServicos ?? 0) - (nfse.valorDeducoes ?? 0);
    const valorIss = valorNfse * ((nfse.aliquotaIss ?? 0) / 100);
    const valorFinal = valorNfse + valorIss - totalRetencoes;

    if (valorFinal <= 0) {
      erros.push('Valor final da NFS-e não pode ser zero ou negativo');
    }

    // ✅ Validar dados do tomador
    if (!nfse.tomadorRazaoSocial || nfse.tomadorRazaoSocial.length < 3) {
      erros.push('Razão social do tomador inválida');
    }

    return {
      valido: erros.length === 0,
      erros,
      avisos: avisos.length > 0 ? avisos : undefined
    };
  }

  /**
   * Valida CPF/CNPJ usando algoritmo oficial
   */
  validarCpfCnpj(cpfCnpj: string): boolean {
    const limpo = cpfCnpj.replace(/[^\d]/g, '');

    if (limpo.length === 11) {
      return this.validarCpf(limpo);
    } else if (limpo.length === 14) {
      return this.validarCnpj(limpo);
    }

    return false;
  }

  private validarCpf(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    let resto = 0;

    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10), 10)) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11), 10)) return false;

    return true;
  }

  private validarCnpj(cnpj: string): boolean {
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = 0;

    for (let i = tamanho - 1; i >= 0; i--) {
      pos++;
      soma += parseInt(numeros.charAt(tamanho - pos), 10) * (pos % 8 === 0 ? 5 : pos % 8 === 1 ? 4 : pos % 8);
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = 0;

    for (let i = tamanho - 1; i >= 0; i--) {
      pos++;
      soma += parseInt(numeros.charAt(tamanho - pos), 10) * (pos % 8 === 0 ? 5 : pos % 8 === 1 ? 4 : pos % 8);
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1), 10)) return false;

    return true;
  }

  private validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Calcula alíquota ISS baseado no código de serviço (LC 116/2003)
   * Retorna alíquota padrão - deve ser sobrescrita pela municipalidade
   */
  obterAliquotaPadraoIss(codigoServico: string): number {
    // Tabela simplificada de alíquotas padrão
    // Em produção, isso viria de um serviço externo
    const tabelaIss: Record<string, number> = {
      '0101': 0.05, // Análise e desenvolvimento de sistemas
      '0102': 0.05, // Consultoria em sistemas
      '0201': 0.10, // Serviços de limpeza
      '0202': 0.10, // Serviços de higiene
      // ... mais serviços conforme LC 116/2003
    };

    return tabelaIss[codigoServico] ?? 0.05; // Padrão 5%
  }
}
