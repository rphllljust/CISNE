// Tabela de Códigos de Serviços - LC 116/2003
// Conforme ABRASF NT 2.02
// https://www.abrasf.org.br/

export interface LC116ServiceCode {
  codigo: string;
  descricao: string;
  aliquotaPadrao: number;
}

export const LC116_SERVICE_CODES: Record<string, LC116ServiceCode> = {
  '0101': {
    codigo: '0101',
    descricao: 'Análise e desenvolvimento de sistemas',
    aliquotaPadrao: 0.05
  },
  '0102': {
    codigo: '0102',
    descricao: 'Consultoria em tecnologia da informação',
    aliquotaPadrao: 0.05
  },
  '0103': {
    codigo: '0103',
    descricao: 'Suporte técnico em tecnologia da informação',
    aliquotaPadrao: 0.05
  },
  '0104': {
    codigo: '0104',
    descricao: 'Manutenção e suporte em tecnologia da informação',
    aliquotaPadrao: 0.05
  },
  '0105': {
    codigo: '0105',
    descricao: 'Hospedagem, manutenção e suporte infraestrutura de hardware',
    aliquotaPadrao: 0.05
  },
  '0106': {
    codigo: '0106',
    descricao: 'Suporte em tecnologia da informação - help desk',
    aliquotaPadrao: 0.05
  },
  '0107': {
    codigo: '0107',
    descricao: 'Ouros serviços de informática não especificados anteriormente',
    aliquotaPadrao: 0.05
  },
  '0201': {
    codigo: '0201',
    descricao: 'Serviços de infraestrutura - instalações, acessórios e conexões',
    aliquotaPadrao: 0.05
  },
  '0202': {
    codigo: '0202',
    descricao: 'Reparação e manutenção em geral',
    aliquotaPadrao: 0.05
  },
  '0203': {
    codigo: '0203',
    descricao: 'Limpeza, higienização e desinfecção de instalações',
    aliquotaPadrao: 0.05
  },
  '0204': {
    codigo: '0204',
    descricao: 'Organização de eventos, recepções, convenções, conferências e similares',
    aliquotaPadrao: 0.05
  },
  '0205': {
    codigo: '0205',
    descricao: 'Consultoria em geral',
    aliquotaPadrao: 0.05
  },
  '0206': {
    codigo: '0206',
    descricao: 'Serviços administrativos diversos',
    aliquotaPadrao: 0.05
  },
  '0301': {
    codigo: '0301',
    descricao: 'Serviços de vigilância, segurança, guarda e custódia',
    aliquotaPadrao: 0.05
  },
  '0302': {
    codigo: '0302',
    descricao: 'Limpeza e higiene urbana e similar',
    aliquotaPadrao: 0.05
  },
  '0303': {
    codigo: '0303',
    descricao: 'Coleta, processamento e reciclagem de resíduos',
    aliquotaPadrao: 0.05
  },
  '0304': {
    codigo: '0304',
    descricao: 'Limpeza de fossas sépticas, poços e sumidouros',
    aliquotaPadrao: 0.05
  },
  '0305': {
    codigo: '0305',
    descricao: 'Controle de pragas e outras atividades conexas',
    aliquotaPadrao: 0.05
  },
  '0401': {
    codigo: '0401',
    descricao: 'Publicidade e propaganda',
    aliquotaPadrao: 0.05
  },
  '0402': {
    codigo: '0402',
    descricao: 'Produção cinematográfica, audiovisual, fotográfica e similares',
    aliquotaPadrao: 0.05
  },
  '0403': {
    codigo: '0403',
    descricao: 'Edição e impressão',
    aliquotaPadrao: 0.05
  },
  '0404': {
    codigo: '0404',
    descricao: 'Radiodifusão',
    aliquotaPadrao: 0.05
  },
  '0405': {
    codigo: '0405',
    descricao: 'Serviços de informação, jornalismo e similares',
    aliquotaPadrao: 0.05
  },
  '0501': {
    codigo: '0501',
    descricao: 'Atividades profissionais, científicas, especializadas e técnicas integradas',
    aliquotaPadrao: 0.05
  },
  '0601': {
    codigo: '0601',
    descricao: 'Assessoria em comércio exterior',
    aliquotaPadrao: 0.05
  },
  '0602': {
    codigo: '0602',
    descricao: 'Corretagem de seguros ou crédito',
    aliquotaPadrao: 0.05
  },
  '0603': {
    codigo: '0603',
    descricao: 'Serviços financeiros, bolsa de valores, administração de investimentos',
    aliquotaPadrao: 0.05
  },
  '0604': {
    codigo: '0604',
    descricao: 'Serviços contábeis',
    aliquotaPadrao: 0.05
  },
  '0605': {
    codigo: '0605',
    descricao: 'Serviços de auditoria',
    aliquotaPadrao: 0.05
  },
  '0606': {
    codigo: '0606',
    descricao: 'Serviços de pesquisa e desenvolvimento',
    aliquotaPadrao: 0.05
  },
  '0607': {
    codigo: '0607',
    descricao: 'Serviços de avaliação de bens e perícias',
    aliquotaPadrao: 0.05
  },
  '0608': {
    codigo: '0608',
    descricao: 'Serviços de intermediação',
    aliquotaPadrao: 0.05
  },
  '0609': {
    codigo: '0609',
    descricao: 'Serviços de consultoria especializada',
    aliquotaPadrao: 0.05
  },
  '0701': {
    codigo: '0701',
    descricao: 'Serviços de locação de bens imóveis',
    aliquotaPadrao: 0.05
  },
  '0702': {
    codigo: '0702',
    descricao: 'Locação de máquinas, equipamentos e utensílios',
    aliquotaPadrao: 0.05
  },
  '0703': {
    codigo: '0703',
    descricao: 'Concessão de direito de uso de marcas, patentes, software',
    aliquotaPadrao: 0.05
  },
  '0704': {
    codigo: '0704',
    descricao: 'Aluguel de andaimes, palcos, coberturas e estruturas similares',
    aliquotaPadrao: 0.05
  },
  '0801': {
    codigo: '0801',
    descricao: 'Educação - cursos diversos',
    aliquotaPadrao: 0.05
  },
  '0802': {
    codigo: '0802',
    descricao: 'Educação - profissionalização',
    aliquotaPadrao: 0.05
  },
  '0803': {
    codigo: '0803',
    descricao: 'Ensino regular',
    aliquotaPadrao: 0.05
  },
  '0804': {
    codigo: '0804',
    descricao: 'Educação física e similar',
    aliquotaPadrao: 0.05
  },
  '0805': {
    codigo: '0805',
    descricao: 'Instrução e treinamento não classificado anteriormente',
    aliquotaPadrao: 0.05
  },
  '0901': {
    codigo: '0901',
    descricao: 'Transporte de natureza urbana',
    aliquotaPadrao: 0.05
  },
  '0902': {
    codigo: '0902',
    descricao: 'Transporte de natureza intermunicipal',
    aliquotaPadrao: 0.05
  },
  '0903': {
    codigo: '0903',
    descricao: 'Transporte de natureza interestadual',
    aliquotaPadrao: 0.05
  },
  '0904': {
    codigo: '0904',
    descricao: 'Transporte de natureza internacional',
    aliquotaPadrao: 0.05
  },
  '0905': {
    codigo: '0905',
    descricao: 'Transporte de carga - natureza urbana',
    aliquotaPadrao: 0.05
  },
  '0906': {
    codigo: '0906',
    descricao: 'Transporte de carga - natureza intermunicipal',
    aliquotaPadrao: 0.05
  },
  '0907': {
    codigo: '0907',
    descricao: 'Transporte de carga - natureza interestadual',
    aliquotaPadrao: 0.05
  },
  '0908': {
    codigo: '0908',
    descricao: 'Transporte de carga - natureza internacional',
    aliquotaPadrao: 0.05
  },
  '0909': {
    codigo: '0909',
    descricao: 'Transporte de carga - natureza municipal',
    aliquotaPadrao: 0.05
  },
  '0910': {
    codigo: '0910',
    descricao: 'Transporte de carga não especificado',
    aliquotaPadrao: 0.05
  },
  '0911': {
    codigo: '0911',
    descricao: 'Aluguel de veículos',
    aliquotaPadrao: 0.05
  },
  '0912': {
    codigo: '0912',
    descricao: 'Estacionamento de veículos',
    aliquotaPadrao: 0.05
  },
  '0913': {
    codigo: '0913',
    descricao: 'Estiva e capatazia',
    aliquotaPadrao: 0.05
  },
  '0914': {
    codigo: '0914',
    descricao: 'Agenciamento de transportes',
    aliquotaPadrao: 0.05
  },
  '0915': {
    codigo: '0915',
    descricao: 'Outras atividades complementares do transporte',
    aliquotaPadrao: 0.05
  },
  '0916': {
    codigo: '0916',
    descricao: 'Transporte escolar',
    aliquotaPadrao: 0.05
  },
  '0917': {
    codigo: '0917',
    descricao: 'Viagem, turismo e temporada',
    aliquotaPadrao: 0.05
  },
  '1001': {
    codigo: '1001',
    descricao: 'Hospedagem de curta duração',
    aliquotaPadrao: 0.05
  },
  '1002': {
    codigo: '1002',
    descricao: 'Alimentação',
    aliquotaPadrao: 0.05
  },
  '1003': {
    codigo: '1003',
    descricao: 'Alojamento',
    aliquotaPadrao: 0.05
  },
  '1004': {
    codigo: '1004',
    descricao: 'Buffet e similares',
    aliquotaPadrao: 0.05
  },
  '1005': {
    codigo: '1005',
    descricao: 'Barras, cafeterias, postos de gasolina',
    aliquotaPadrao: 0.05
  },
  '1101': {
    codigo: '1101',
    descricao: 'Serviços de cinema',
    aliquotaPadrao: 0.05
  },
  '1102': {
    codigo: '1102',
    descricao: 'Serviços de diversões - danceteria, discoteca e similares',
    aliquotaPadrao: 0.05
  },
  '1103': {
    codigo: '1103',
    descricao: 'Diversões - prestação de serviços para eventos',
    aliquotaPadrao: 0.05
  },
  '1104': {
    codigo: '1104',
    descricao: 'Recreação - parques temáticos, parques aquáticos',
    aliquotaPadrao: 0.05
  },
  '1105': {
    codigo: '1105',
    descricao: 'Ensino de práticas desportivas',
    aliquotaPadrao: 0.05
  },
  '1106': {
    codigo: '1106',
    descricao: 'Organização de eventos desportivos',
    aliquotaPadrao: 0.05
  },
  '1107': {
    codigo: '1107',
    descricao: 'Cassinos',
    aliquotaPadrao: 0.05
  },
  '1108': {
    codigo: '1108',
    descricao: 'Outros serviços de recreação e lazer não especificados anteriormente',
    aliquotaPadrao: 0.05
  },
  '1109': {
    codigo: '1109',
    descricao: 'Museus, galerias de arte e similares',
    aliquotaPadrao: 0.05
  },
  '1201': {
    codigo: '1201',
    descricao: 'Serviços de saúde - consulta médica',
    aliquotaPadrao: 0.05
  },
  '1202': {
    codigo: '1202',
    descricao: 'Serviços de saúde - enfermagem',
    aliquotaPadrao: 0.05
  },
  '1203': {
    codigo: '1203',
    descricao: 'Serviços de saúde - fisioterapia',
    aliquotaPadrao: 0.05
  },
  '1204': {
    codigo: '1204',
    descricao: 'Serviços de saúde - análises clínicas',
    aliquotaPadrao: 0.05
  },
  '1205': {
    codigo: '1205',
    descricao: 'Serviços de saúde - radiologia',
    aliquotaPadrao: 0.05
  },
  '1206': {
    codigo: '1206',
    descricao: 'Serviços de saúde - ultrassom',
    aliquotaPadrao: 0.05
  },
  '1207': {
    codigo: '1207',
    descricao: 'Serviços de saúde - odontologia',
    aliquotaPadrao: 0.05
  },
  '1208': {
    codigo: '1208',
    descricao: 'Serviços de saúde - psicologia',
    aliquotaPadrao: 0.05
  },
  '1209': {
    codigo: '1209',
    descricao: 'Serviços de saúde - terapia ocupacional',
    aliquotaPadrao: 0.05
  },
  '1210': {
    codigo: '1210',
    descricao: 'Serviços de saúde - acupuntura',
    aliquotaPadrao: 0.05
  },
  '1211': {
    codigo: '1211',
    descricao: 'Serviços de saúde - homeopatia',
    aliquotaPadrao: 0.05
  },
  '1212': {
    codigo: '1212',
    descricao: 'Serviços de saúde - outros não especificados',
    aliquotaPadrao: 0.05
  },
  '1301': {
    codigo: '1301',
    descricao: 'Advocacia',
    aliquotaPadrao: 0.05
  },
  '1302': {
    codigo: '1302',
    descricao: 'Arbitragem',
    aliquotaPadrao: 0.05
  },
  '1303': {
    codigo: '1303',
    descricao: 'Notariado',
    aliquotaPadrao: 0.05
  },
  '1304': {
    codigo: '1304',
    descricao: 'Registros',
    aliquotaPadrao: 0.05
  },
  '1305': {
    codigo: '1305',
    descricao: 'Atividades jurídicas não especificadas anteriormente',
    aliquotaPadrao: 0.05
  },
  '1401': {
    codigo: '1401',
    descricao: 'Serviços de reparação - máquinas, equipamentos e utensílios',
    aliquotaPadrao: 0.05
  },
  '1402': {
    codigo: '1402',
    descricao: 'Reparação e manutenção de computadores, impressoras',
    aliquotaPadrao: 0.05
  },
  '1403': {
    codigo: '1403',
    descricao: 'Reparação e manutenção de eletrodomésticos',
    aliquotaPadrao: 0.05
  },
  '1404': {
    codigo: '1404',
    descricao: 'Reparação e manutenção de calçados',
    aliquotaPadrao: 0.05
  },
  '1405': {
    codigo: '1405',
    descricao: 'Reparação e manutenção de roupas e similares',
    aliquotaPadrao: 0.05
  },
  '1406': {
    codigo: '1406',
    descricao: 'Reparação e manutenção de estofados',
    aliquotaPadrao: 0.05
  },
  '1407': {
    codigo: '1407',
    descricao: 'Reparação e manutenção de vidraças',
    aliquotaPadrao: 0.05
  },
  '1408': {
    codigo: '1408',
    descricao: 'Reparação e manutenção de relógios',
    aliquotaPadrao: 0.05
  },
  '1409': {
    codigo: '1409',
    descricao: 'Reparação e manutenção de joias',
    aliquotaPadrao: 0.05
  },
  '1410': {
    codigo: '1410',
    descricao: 'Reparação e manutenção de veículos',
    aliquotaPadrao: 0.05
  },
  '1411': {
    codigo: '1411',
    descricao: 'Reparação e manutenção de motocicletas',
    aliquotaPadrao: 0.05
  },
  '1412': {
    codigo: '1412',
    descricao: 'Reparação e manutenção de bicicletas',
    aliquotaPadrao: 0.05
  },
  '1413': {
    codigo: '1413',
    descricao: 'Serviços de reparação diversos',
    aliquotaPadrao: 0.05
  },
  '1501': {
    codigo: '1501',
    descricao: 'Serviços de instalação de máquinas e equipamentos',
    aliquotaPadrao: 0.05
  },
  '1502': {
    codigo: '1502',
    descricao: 'Serviços de instalação de acessórios para máquinas e equipamentos',
    aliquotaPadrao: 0.05
  },
  '1503': {
    codigo: '1503',
    descricao: 'Serviços de instalação de estruturas metálicas',
    aliquotaPadrao: 0.05
  },
  '1504': {
    codigo: '1504',
    descricao: 'Serviços de instalação de sistemas de ar condicionado',
    aliquotaPadrao: 0.05
  },
  '1505': {
    codigo: '1505',
    descricao: 'Serviços de instalação de sistemas de aquecimento',
    aliquotaPadrao: 0.05
  },
  '1506': {
    codigo: '1506',
    descricao: 'Serviços de instalação de eletricidade',
    aliquotaPadrao: 0.05
  },
  '1507': {
    codigo: '1507',
    descricao: 'Serviços de instalação de painéis solares',
    aliquotaPadrao: 0.05
  },
  '1508': {
    codigo: '1508',
    descricao: 'Serviços de instalação de placas de sinalização',
    aliquotaPadrao: 0.05
  },
  '1509': {
    codigo: '1509',
    descricao: 'Serviços de instalação diversos',
    aliquotaPadrao: 0.05
  },
  '1601': {
    codigo: '1601',
    descricao: 'Serviços de encanamento',
    aliquotaPadrao: 0.05
  },
  '1602': {
    codigo: '1602',
    descricao: 'Serviços de pintura',
    aliquotaPadrao: 0.05
  },
  '1603': {
    codigo: '1603',
    descricao: 'Serviços de carpintaria',
    aliquotaPadrao: 0.05
  },
  '1604': {
    codigo: '1604',
    descricao: 'Serviços de construção civil',
    aliquotaPadrao: 0.05
  },
  '1605': {
    codigo: '1605',
    descricao: 'Serviços de demolição',
    aliquotaPadrao: 0.05
  },
  '1606': {
    codigo: '1606',
    descricao: 'Serviços de reforma de edifícios',
    aliquotaPadrao: 0.05
  },
  '1607': {
    codigo: '1607',
    descricao: 'Serviços de preparação de canteiro e terraplanagem',
    aliquotaPadrao: 0.05
  },
  '1608': {
    codigo: '1608',
    descricao: 'Serviços de impermeabilização',
    aliquotaPadrao: 0.05
  },
  '1609': {
    codigo: '1609',
    descricao: 'Serviços diversos de construção',
    aliquotaPadrao: 0.05
  },
  '1701': {
    codigo: '1701',
    descricao: 'Confecção de roupas, pessoal - sob encomenda',
    aliquotaPadrao: 0.05
  },
  '1702': {
    codigo: '1702',
    descricao: 'Confecção de outros artigos - sob encomenda',
    aliquotaPadrao: 0.05
  },
  '1703': {
    codigo: '1703',
    descricao: 'Serviços de costura',
    aliquotaPadrao: 0.05
  },
  '1704': {
    codigo: '1704',
    descricao: 'Serviços de tingimento, lavagem e similares',
    aliquotaPadrao: 0.05
  },
  '1705': {
    codigo: '1705',
    descricao: 'Serviços de remoção de manchas',
    aliquotaPadrao: 0.05
  },
  '1706': {
    codigo: '1706',
    descricao: 'Serviços de importação',
    aliquotaPadrao: 0.05
  },
  '1707': {
    codigo: '1707',
    descricao: 'Serviços de exportação',
    aliquotaPadrao: 0.05
  },
  '1708': {
    codigo: '1708',
    descricao: 'Serviços de tecelagem',
    aliquotaPadrao: 0.05
  },
  '1709': {
    codigo: '1709',
    descricao: 'Serviços de encanador',
    aliquotaPadrao: 0.05
  },
  '1710': {
    codigo: '1710',
    descricao: 'Serviços de utilidades públicas - água',
    aliquotaPadrao: 0.05
  },
  '1711': {
    codigo: '1711',
    descricao: 'Serviços de utilidades públicas - eletricidade',
    aliquotaPadrao: 0.05
  },
  '1712': {
    codigo: '1712',
    descricao: 'Serviços de utilidades públicas - gás',
    aliquotaPadrao: 0.05
  },
  '1713': {
    codigo: '1713',
    descricao: 'Serviços de utilidades públicas - telefone',
    aliquotaPadrao: 0.05
  },
  '1714': {
    codigo: '1714',
    descricao: 'Serviços de utilidades públicas - esgoto e limpeza urbana',
    aliquotaPadrao: 0.05
  },
  '1715': {
    codigo: '1715',
    descricao: 'Serviços de utilidades públicas - outros',
    aliquotaPadrao: 0.05
  },
  '1716': {
    codigo: '1716',
    descricao: 'Serviços portuários',
    aliquotaPadrao: 0.05
  },
  '1717': {
    codigo: '1717',
    descricao: 'Serviços aeroportuários',
    aliquotaPadrao: 0.05
  },
  '1718': {
    codigo: '1718',
    descricao: 'Serviços de carga, descarga, movimentação de mercadoria',
    aliquotaPadrao: 0.05
  },
  '1719': {
    codigo: '1719',
    descricao: 'Serviços de limpeza urbana',
    aliquotaPadrao: 0.05
  },
  '1720': {
    codigo: '1720',
    descricao: 'Serviços de silvicultura',
    aliquotaPadrao: 0.05
  },
  '1721': {
    codigo: '1721',
    descricao: 'Serviços de piscicultura',
    aliquotaPadrao: 0.05
  },
  '1722': {
    codigo: '1722',
    descricao: 'Serviços de apicultura',
    aliquotaPadrao: 0.05
  },
  '1723': {
    codigo: '1723',
    descricao: 'Serviços de sericultura',
    aliquotaPadrao: 0.05
  },
  '1724': {
    codigo: '1724',
    descricao: 'Serviços de exploração de salinas',
    aliquotaPadrao: 0.05
  },
  '1725': {
    codigo: '1725',
    descricao: 'Serviços de exploração de pedreiras e minas',
    aliquotaPadrao: 0.05
  },
  '1726': {
    codigo: '1726',
    descricao: 'Serviços de agropecuária',
    aliquotaPadrao: 0.05
  },
  '1727': {
    codigo: '1727',
    descricao: 'Serviços de produção de petróleo e gás natural',
    aliquotaPadrao: 0.05
  },
  '1728': {
    codigo: '1728',
    descricao: 'Serviços de refino de petróleo',
    aliquotaPadrao: 0.05
  },
  '1729': {
    codigo: '1729',
    descricao: 'Serviços de exploração de recursos naturais não especificados',
    aliquotaPadrao: 0.05
  },
  '1730': {
    codigo: '1730',
    descricao: 'Serviços de cessão de bens imóveis',
    aliquotaPadrao: 0.05
  },
  '1731': {
    codigo: '1731',
    descricao: 'Serviços de cessão de máquinas e equipamentos',
    aliquotaPadrao: 0.05
  },
  '1732': {
    codigo: '1732',
    descricao: 'Serviços diversos não especificados',
    aliquotaPadrao: 0.05
  }
};

export function obterServicoLC116(codigo: string): LC116ServiceCode | undefined {
  return LC116_SERVICE_CODES[codigo];
}

export function obterTodosServicos(): LC116ServiceCode[] {
  return Object.values(LC116_SERVICE_CODES);
}

export function obterCodigosServicos(): string[] {
  return Object.keys(LC116_SERVICE_CODES);
}

export function obterAliquotaPadrao(codigo: string): number {
  const servico = obterServicoLC116(codigo);
  return servico?.aliquotaPadrao ?? 0.05;
}
