import { Injectable, Logger } from '@nestjs/common';
import { LC116_SERVICE_CODES } from '../../domain/entities/lc116-service-codes';

/**
 * Serviço para sincronização e validação de códigos LC 116/2003
 * Pode ser estendido para integrar com fonte oficial em futuro
 */
@Injectable()
export class ServiceCodeSyncService {
  private readonly logger = new Logger(ServiceCodeSyncService.name);

  /**
   * Valida se um código de serviço existe na tabela LC 116/2003
   */
  validarCodigoServico(codigo: string): boolean {
    return codigo in LC116_SERVICE_CODES;
  }

  /**
   * Obtém a descrição de um código de serviço
   */
  obterDescricaoServico(codigo: string): string | undefined {
    return LC116_SERVICE_CODES[codigo]?.descricao;
  }

  /**
   * Obtém alíquota padrão para um código de serviço
   */
  obterAliquotaPadrao(codigo: string): number {
    return LC116_SERVICE_CODES[codigo]?.aliquotaPadrao ?? 0.05;
  }

  /**
   * Lista todos os códigos disponíveis
   */
  obterTodosCodigos(): string[] {
    return Object.keys(LC116_SERVICE_CODES).sort();
  }

  /**
   * Busca códigos por padrão de descrição
   */
  buscarPorDescricao(termo: string): Array<{ codigo: string; descricao: string }> {
    const termoLower = termo.toLowerCase();
    return Object.entries(LC116_SERVICE_CODES)
      .filter(([_, servico]) => servico.descricao.toLowerCase().includes(termoLower))
      .map(([codigo, servico]) => ({
        codigo,
        descricao: servico.descricao
      }));
  }

  /**
   * Busca códigos por categoria (primeiros dígitos)
   */
  buscarPorCategoria(categoria: string): Array<{ codigo: string; descricao: string }> {
    return Object.entries(LC116_SERVICE_CODES)
      .filter(([codigo]) => codigo.startsWith(categoria))
      .map(([codigo, servico]) => ({
        codigo,
        descricao: servico.descricao
      }));
  }

  /**
   * Retorna estatísticas dos códigos de serviço
   */
  obterEstatisticas() {
    const codigos = Object.entries(LC116_SERVICE_CODES);

    // Agrupar por categoria (primeiros 2 dígitos)
    const categorias = new Map<string, number>();
    codigos.forEach(([codigo]) => {
      const categoria = codigo.substring(0, 2);
      categorias.set(categoria, (categorias.get(categoria) ?? 0) + 1);
    });

    return {
      totalCodigos: codigos.length,
      totalCategorias: categorias.size,
      aliquotaPadrao: 0.05,
      categorias: Array.from(categorias.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([cat, count]) => ({
          categoria: cat,
          quantidade: count
        }))
    };
  }
}
