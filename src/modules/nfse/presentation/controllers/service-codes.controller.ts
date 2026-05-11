import { Controller, Get, Param, Query } from '@nestjs/common';
import { obterTodosServicos, obterServicoLC116, obterCodigosServicos } from '../../domain/entities/lc116-service-codes';

@Controller('nfse/codigos-servicos')
export class ServiceCodesController {
  @Get()
  obterTodos(@Query('search') search?: string) {
    const servicos = obterTodosServicos();

    if (search) {
      const searchLower = search.toLowerCase();
      return servicos.filter(
        (s) =>
          s.codigo.includes(searchLower) ||
          s.descricao.toLowerCase().includes(searchLower)
      );
    }

    return servicos;
  }

  @Get('codigos')
  obterCodigos() {
    return obterCodigosServicos();
  }

  @Get(':codigo')
  obterPorCodigo(@Param('codigo') codigo: string) {
    const servico = obterServicoLC116(codigo);

    if (!servico) {
      return {
        erro: 'Código de serviço não encontrado',
        codigo
      };
    }

    return servico;
  }
}
