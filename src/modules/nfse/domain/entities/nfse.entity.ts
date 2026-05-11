// NFS-e Entity com conformidade fiscal brasileira (LC 116/2003)
export interface NfseEntity {
  id: string;
  numero: number | null;
  serie: string;
  codigoVerificacao: string | null;
  dataEmissao: Date;
  dataCancelamento: Date | null;
  statusNfse: 'RASCUNHO' | 'EMITIDA' | 'CANCELADA' | 'REJEITADA_SEFAZ' | 'PENDENTE_SEFAZ';
  serviceOrderId: string;
  tomadorCpfCnpj: string;
  tomadorRazaoSocial: string | null;
  prestadorCnpj: string;
  inscricaoMunicipal: string | null;
  codigoServico: string;
  discriminacao: string;
  valorServicos: number | any; // Prisma Decimal
  valorDeducoes: number | any; // Prisma Decimal
  aliquotaIss: number | any; // Prisma Decimal
  valorIss: number | any; // Prisma Decimal
  retencaoIrrf: number | any; // Prisma Decimal
  retencaoPis: number | any; // Prisma Decimal
  retencaoCofins: number | any; // Prisma Decimal
  retencaoCsll: number | any; // Prisma Decimal
  retencaoInss: number | any; // Prisma Decimal
  xmlAssinado: string | null;
  urlNfse: string | null;
  mensagensSefaz: string[];
  certificadoA1UsadoEm: Date | null;
  criadoPor: string;
  atualizadoPor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NfseCreateInput {
  serviceOrderId: string;
  tomadorCpfCnpj: string;
  tomadorRazaoSocial: string;
  tomadorEmail: string;
  discriminacao: string;
  codigoServico: string;
  valorServicos: number;
  valorDeducoes?: number;
  aliquotaIss?: number; // Se não fornecido, busca da tabela municipal
  retencaoIrrf?: number;
  retencaoPis?: number;
  retencaoCofins?: number;
  retencaoCsll?: number;
  retencaoInss?: number;
}

export interface NfseValidacao {
  valido: boolean;
  erros: string[];
  avisos?: string[];
}
