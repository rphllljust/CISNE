/**
 * MASSA DE TESTE COMPLETA - SISTEMA OS BRASIL TRUCK LOCADORA
 *
 * Geração de dados para validação de:
 * - 50 Clientes (PF e PJ)
 * - 80 Motoristas autorizados
 * - 70 Veículos
 * - 20 Categorias de locação
 * - 90 Contratos
 * - 30 Tipos de OS
 * - 150 Ordens de Serviço
 * - Checklists, Avarias, Manutenção, Financeiro
 * - 100 Casos de teste
 *
 * Executar com: npx ts-node scripts/seed-truck-rental-test-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/pt_BR';

const prisma = new PrismaClient();

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface ClientData {
  id: string;
  type: 'INDIVIDUAL' | 'BUSINESS';
  name: string;
  legalName?: string;
  taxId: string;
  email?: string;
  phone?: string;
  mobile?: string;
  contactName?: string;
  notes?: string;
}

interface DriverData {
  id: string;
  clientId: string;
  name: string;
  cpf: string;
  rg: string;
  cnh: string;
  cnhCategory: 'B' | 'C' | 'D' | 'E';
  cnhExpiryDate: Date;
  hasEAR: boolean;
  status: 'AUTHORIZED' | 'BLOCKED' | 'CNH_EXPIRED' | 'ANALYSIS';
}

interface VehicleData {
  id: string;
  code: string;
  type: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRAHEAVY';
  brand: string;
  model: string;
  year: number;
  plate: string;
  status: 'AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE' | 'BLOCKED' | 'ACCIDENT';
  maxLoadKg: number;
  maxVolume: number;
}

// ============================================================================
// DADOS FICTÍCIOS
// ============================================================================

const CITIES = [
  { city: 'São Paulo', state: 'SP', region: 'Sudeste' },
  { city: 'Rio de Janeiro', state: 'RJ', region: 'Sudeste' },
  { city: 'Belo Horizonte', state: 'MG', region: 'Sudeste' },
  { city: 'Curitiba', state: 'PR', region: 'Sul' },
  { city: 'Porto Alegre', state: 'RS', region: 'Sul' },
  { city: 'Salvador', state: 'BA', region: 'Nordeste' },
  { city: 'Brasília', state: 'DF', region: 'Centro-Oeste' },
  { city: 'Goiânia', state: 'GO', region: 'Centro-Oeste' },
  { city: 'Manaus', state: 'AM', region: 'Norte' },
  { city: 'Belém', state: 'PA', region: 'Norte' },
];

const VEHICLE_TYPES = [
  { type: 'VUC', size: 'SMALL' },
  { type: 'Caminhão 3/4', size: 'SMALL' },
  { type: 'Toco Baú', size: 'MEDIUM' },
  { type: 'Truck', size: 'LARGE' },
  { type: 'Truck Sider', size: 'LARGE' },
  { type: 'Bitruck', size: 'LARGE' },
  { type: 'Cavalo Mecânico', size: 'EXTRAHEAVY' },
  { type: 'Carreta Baú', size: 'EXTRAHEAVY' },
  { type: 'Carreta Sider', size: 'EXTRAHEAVY' },
  { type: 'Munck', size: 'LARGE' },
  { type: 'Basculante', size: 'MEDIUM' },
  { type: 'Plataforma', size: 'LARGE' },
];

const VEHICLE_BRANDS = [
  'Scania',
  'Volvo',
  'Mercedes',
  'Iveco',
  'MAN',
  'Volkswagen',
  'Hyundai',
  'FAW',
  'Shacman',
];

const CLIENT_NAMES_INDIVIDUAL = [
  'João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Ferreira',
  'Fernanda Lima', 'Roberto Alves', 'Patricia Gomes', 'Lucas Martins', 'Gabriela Rocha',
  'Felipe Souza', 'Mariana Dias', 'Bruno Costa', 'Larissa Mendes', 'Thiago Barbosa',
  'Juliana Teixeira', 'Diego Carvalho', 'Camila Almeida', 'Gustavo Ribeiro', 'Beatriz Pereira',
];

const CLIENT_NAMES_BUSINESS = [
  'Transportadora ABC Ltda',
  'Construtora XYZ S/A',
  'Mudanças Brasil Express',
  'Distribuidora Regional',
  'Logística e Cargas',
  'Serviços Especializados',
  'Comércio e Distribução',
  'Soluções em Transporte',
  'Frota Aluguel Pro',
  'Transportes Nacionais',
  'Obras e Construção',
  'Agro Transporte',
  'Limpeza e Higiene Industrial',
  'Eventos e Logística',
  'Reforma e Manutenção',
  'Autopeças Distribuição',
  'Alimentos e Bebidas',
  'Materiais de Construção',
  'Serviços Técnicos',
  'Consultoria em Transporte',
];

const VEHICLE_BRANDS_MODELS = {
  'Scania': ['R 440', 'R 450', 'G 420', 'G 440', 'K 380'],
  'Volvo': ['FH16', 'FH12', 'FM', 'FMX', 'VM'],
  'Mercedes': ['Actros 2646', 'Actros 3340', 'Atego', 'Axor'],
  'Iveco': ['Cursor 250', 'Stralis', 'Daily', 'Trakker'],
  'MAN': ['TGX 540', 'TGS 330', 'TGM 18.290', 'TGL'],
  'Volkswagen': ['Constellation', '25.390', 'Delivery', '13.180'],
  'Hyundai': ['Mighty EX8', 'HD85', 'HD78'],
  'FAW': ['J6 8T', 'J5P'],
  'Shacman': ['SX3258', 'SX5254', 'SX3255'],
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function generateCPF(): string {
  const part1 = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const part2 = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const part3 = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const part4 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${part1}.${part2}.${part3}-${part4}`;
}

function generateCNPJ(): string {
  const part1 = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  const part2 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const part3 = '0001';
  const part4 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${part1}/${part2}-${part3}-${part4}`;
}

function generatePlate(): string {
  const letters = String.fromCharCode(
    65 + Math.floor(Math.random() * 26),
    65 + Math.floor(Math.random() * 26),
    65 + Math.floor(Math.random() * 26)
  );
  const numbers = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${letters}-${numbers}`;
}

function generateChassis(): string {
  return 'VWZZZ' + Math.random().toString(36).substring(2, 15).toUpperCase();
}

function generateRENAVAM(): string {
  return String(Math.floor(Math.random() * 100000000000)).padStart(11, '0');
}

function getRandomCity() {
  return CITIES[Math.floor(Math.random() * CITIES.length)];
}

function getRandomBrand() {
  return VEHICLE_BRANDS[Math.floor(Math.random() * VEHICLE_BRANDS.length)];
}

function getRandomModel(brand: string): string {
  const models = VEHICLE_BRANDS_MODELS[brand as keyof typeof VEHICLE_BRANDS_MODELS] || ['Standard'];
  return models[Math.floor(Math.random() * models.length)];
}

function getRandomVehicleType() {
  return VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
}

// ============================================================================
// GERAÇÃO DE DADOS
// ============================================================================

async function generateUsers() {
  console.log('Gerando usuários do sistema...');

  const roles = [
    { name: 'ADMIN', description: 'Administrador do sistema' },
    { name: 'GERENTE', description: 'Gerente operacional' },
    { name: 'ATENDENTE', description: 'Atendente de vendas' },
    { name: 'CONSULTOR', description: 'Consultor comercial' },
    { name: 'SUPERVISOR_FROTA', description: 'Supervisor de frota' },
    { name: 'VISTORIADOR', description: 'Vistoriador' },
    { name: 'MECANICO', description: 'Mecânico' },
    { name: 'FINANCEIRO', description: 'Analista financeiro' },
  ];

  const rolesCreated: Record<string, string> = {};
  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: {
        name: role.name,
        description: role.description,
        isSystem: true,
      },
    });
    rolesCreated[role.name] = created.id;
  }

  const users = [
    { email: 'admin@brasil-truck.com', fullName: 'Administrador Sistema', department: 'TI', jobTitle: 'Admin', role: 'ADMIN' },
    { email: 'gerente@brasil-truck.com', fullName: 'Gerente Geral', department: 'Operações', jobTitle: 'Gerente', role: 'GERENTE' },
    { email: 'atendente1@brasil-truck.com', fullName: 'Atendente Lucas', department: 'Vendas', jobTitle: 'Atendente', role: 'ATENDENTE' },
    { email: 'atendente2@brasil-truck.com', fullName: 'Atendente Fernanda', department: 'Vendas', jobTitle: 'Atendente', role: 'ATENDENTE' },
    { email: 'consultor@brasil-truck.com', fullName: 'Consultor Comercial', department: 'Vendas', jobTitle: 'Consultor', role: 'CONSULTOR' },
    { email: 'supervisor@brasil-truck.com', fullName: 'Supervisor Frota', department: 'Operações', jobTitle: 'Supervisor', role: 'SUPERVISOR_FROTA' },
    { email: 'vistoriador@brasil-truck.com', fullName: 'Vistoriador Pedro', department: 'Vistoria', jobTitle: 'Vistoriador', role: 'VISTORIADOR' },
    { email: 'mecanico@brasil-truck.com', fullName: 'Mecânico João', department: 'Manutenção', jobTitle: 'Mecânico', role: 'MECANICO' },
    { email: 'financeiro@brasil-truck.com', fullName: 'Analista Financeiro', department: 'Financeiro', jobTitle: 'Analista', role: 'FINANCEIRO' },
  ];

  const createdUsers: Record<string, string> = {};
  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        fullName: user.fullName,
        department: user.department,
        jobTitle: user.jobTitle,
        phone: faker.phone.number('(11) 9####-####'),
        passwordHash: 'hashed_password_placeholder',
        status: 'ACTIVE',
      },
    });
    createdUsers[user.email] = created.id;

    // Assign role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: created.id, roleId: rolesCreated[user.role] } },
      update: {},
      create: {
        userId: created.id,
        roleId: rolesCreated[user.role],
      },
    });
  }

  return createdUsers;
}

async function generateServiceCategories() {
  console.log('Gerando categorias de serviço...');

  const categories = [
    { code: 'LOCACAO', name: 'Locação' },
    { code: 'VISTORIA', name: 'Vistoria' },
    { code: 'MANUTENCAO', name: 'Manutenção' },
    { code: 'LIMPEZA', name: 'Limpeza' },
    { code: 'ABASTECIMENTO', name: 'Abastecimento' },
    { code: 'FINANCEIRO', name: 'Financeiro' },
    { code: 'DOCUMENTACAO', name: 'Documentação' },
    { code: 'SINISTRO', name: 'Sinistro' },
  ];

  const created: Record<string, string> = {};
  for (const cat of categories) {
    const result = await prisma.serviceCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: {
        code: cat.code,
        name: cat.name,
        description: `Categoria: ${cat.name}`,
        active: true,
      },
    });
    created[cat.code] = result.id;
  }

  return created;
}

async function generateServiceTypes(categoryIds: Record<string, string>) {
  console.log('Gerando tipos de serviço...');

  const serviceTypes = [
    // Locação
    { categoryCode: 'LOCACAO', code: 'ABERTURA_LOCACAO', name: 'Abertura de Locação', duration: 30 },
    { categoryCode: 'LOCACAO', code: 'PREPARACAO_ENTREGA', name: 'Preparação para Entrega', duration: 60 },
    { categoryCode: 'LOCACAO', code: 'ENCERRAMENTO_LOCACAO', name: 'Encerramento de Locação', duration: 30 },

    // Vistoria
    { categoryCode: 'VISTORIA', code: 'VISTORIA_SAIDA', name: 'Vistoria de Saída', duration: 45 },
    { categoryCode: 'VISTORIA', code: 'VISTORIA_RETORNO', name: 'Vistoria de Retorno', duration: 45 },
    { categoryCode: 'VISTORIA', code: 'VISTORIA_SINISTRO', name: 'Vistoria de Sinistro', duration: 60 },

    // Manutenção
    { categoryCode: 'MANUTENCAO', code: 'MANUTENCAO_PREVENTIVA', name: 'Manutenção Preventiva', duration: 240 },
    { categoryCode: 'MANUTENCAO', code: 'MANUTENCAO_CORRETIVA', name: 'Manutenção Corretiva', duration: 360 },
    { categoryCode: 'MANUTENCAO', code: 'TROCA_PNEUS', name: 'Troca de Pneus', duration: 120 },
    { categoryCode: 'MANUTENCAO', code: 'TROCA_OLEO', name: 'Troca de Óleo', duration: 90 },
    { categoryCode: 'MANUTENCAO', code: 'REVISAO_FREIOS', name: 'Revisão de Freios', duration: 120 },

    // Limpeza
    { categoryCode: 'LIMPEZA', code: 'LIMPEZA_BASICA', name: 'Limpeza Básica', duration: 60 },
    { categoryCode: 'LIMPEZA', code: 'LIMPEZA_COMPLETA', name: 'Limpeza Completa', duration: 120 },

    // Abastecimento
    { categoryCode: 'ABASTECIMENTO', code: 'ABASTECIMENTO', name: 'Abastecimento de Combustível', duration: 30 },

    // Financeiro
    { categoryCode: 'FINANCEIRO', code: 'COBRANCA_KM', name: 'Cobrança de KM Excedente', duration: 15 },
    { categoryCode: 'FINANCEIRO', code: 'COBRANCA_COMBUSTIVEL', name: 'Cobrança de Combustível', duration: 15 },
    { categoryCode: 'FINANCEIRO', code: 'COBRANCA_AVARIA', name: 'Cobrança de Avaria', duration: 30 },

    // Documentação
    { categoryCode: 'DOCUMENTACAO', code: 'REGULARIZACAO', name: 'Regularização Documental', duration: 120 },

    // Sinistro
    { categoryCode: 'SINISTRO', code: 'ANALISE_SINISTRO', name: 'Análise de Sinistro', duration: 180 },
  ];

  const created: Record<string, string> = {};
  for (const st of serviceTypes) {
    const result = await prisma.serviceType.upsert({
      where: { code: st.code },
      update: {},
      create: {
        code: st.code,
        name: st.name,
        categoryId: categoryIds[st.categoryCode],
        description: `Tipo de serviço: ${st.name}`,
        estimatedDurationMinutes: st.duration,
        active: true,
      },
    });
    created[st.code] = result.id;
  }

  return created;
}

async function generateSLAs() {
  console.log('Gerando SLAs...');

  const slas = [
    { name: 'SLA Crítico', responseTime: 60, resolutionTime: 480, warning: 60 },
    { name: 'SLA Alto', responseTime: 120, resolutionTime: 1440, warning: 120 },
    { name: 'SLA Normal', responseTime: 240, resolutionTime: 2880, warning: 240 },
    { name: 'SLA Baixo', responseTime: 480, resolutionTime: 5760, warning: 480 },
  ];

  const created: Record<string, string> = {};
  for (const sla of slas) {
    const result = await prisma.sla.upsert({
      where: { name: sla.name },
      update: {},
      create: {
        name: sla.name,
        responseTimeMinutes: sla.responseTime,
        resolutionTimeMinutes: sla.resolutionTime,
        warningBeforeMinutes: sla.warning,
      },
    });
    created[sla.name] = result.id;
  }

  return created;
}

async function generateClients() {
  console.log('Gerando 50 clientes...');

  const clients: ClientData[] = [];
  const createdIds: string[] = [];

  // Gerar 25 clientes pessoa física
  for (let i = 0; i < 25; i++) {
    const name = CLIENT_NAMES_INDIVIDUAL[i % CLIENT_NAMES_INDIVIDUAL.length];
    const cpf = generateCPF();

    const client = await prisma.client.create({
      data: {
        type: 'INDIVIDUAL',
        name: name,
        taxId: cpf,
        email: faker.internet.email(),
        phone: faker.phone.number('(11) ####-####'),
        mobile: faker.phone.number('(11) 9####-####'),
        active: Math.random() > 0.1,
        notes: `Cliente PF cadastrado em ${new Date().toLocaleDateString()}`,
        addresses: {
          create: {
            street: faker.location.street(),
            number: faker.location.buildingNumber(),
            district: faker.location.direction(),
            city: getRandomCity().city,
            state: getRandomCity().state,
            zipCode: faker.location.zipCode('######-###'),
            country: 'Brasil',
            isPrimary: true,
          },
        },
      },
    });

    createdIds.push(client.id);
  }

  // Gerar 25 clientes pessoa jurídica
  for (let i = 0; i < 25; i++) {
    const name = CLIENT_NAMES_BUSINESS[i % CLIENT_NAMES_BUSINESS.length];
    const cnpj = generateCNPJ();

    const client = await prisma.client.create({
      data: {
        type: 'BUSINESS',
        name: name,
        legalName: `${name} Comércio e Transportes LTDA`,
        taxId: cnpj,
        email: faker.internet.email(),
        phone: faker.phone.number('(11) ####-####'),
        mobile: faker.phone.number('(11) 9####-####'),
        contactName: faker.person.fullName(),
        active: Math.random() > 0.1,
        notes: `Cliente PJ cadastrado em ${new Date().toLocaleDateString()}`,
        addresses: {
          create: {
            street: faker.location.street(),
            number: faker.location.buildingNumber(),
            district: faker.location.direction(),
            city: getRandomCity().city,
            state: getRandomCity().state,
            zipCode: faker.location.zipCode('######-###'),
            country: 'Brasil',
            isPrimary: true,
          },
        },
      },
    });

    createdIds.push(client.id);
  }

  console.log(`✓ ${createdIds.length} clientes criados`);
  return createdIds;
}

async function generateVehicles() {
  console.log('Gerando 70 veículos...');

  const vehicleIds: string[] = [];
  const statuses: ('AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE' | 'BLOCKED' | 'ACCIDENT')[] =
    ['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE', 'BLOCKED', 'ACCIDENT'];

  for (let i = 0; i < 70; i++) {
    const vehicleType = getRandomVehicleType();
    const brand = getRandomBrand();
    const model = getRandomModel(brand);
    const year = 2020 + Math.floor(Math.random() * 4);
    const plate = generatePlate();

    const vehicle = await prisma.asset.create({
      data: {
        code: `VEI-${String(i + 1).padStart(4, '0')}`,
        name: `${brand} ${model} - ${plate}`,
        serialNumber: generateChassis(),
        category: vehicleType.type,
        brand: brand,
        model: model,
        status: 'IN_STOCK',
        condition: 'GOOD',
        acquisitionDate: new Date(year, Math.floor(Math.random() * 12), 15),
        acquisitionCost: (50000 + Math.random() * 500000),
        location: 'Pátio Principal',
        active: true,
        description: `${brand} ${model} ${year} - Placa: ${plate}`,
      },
    });

    vehicleIds.push(vehicle.id);
  }

  console.log(`✓ ${vehicleIds.length} veículos criados`);
  return vehicleIds;
}

async function generateContracts(clientIds: string[], serviceTypeIds: Record<string, string>, users: Record<string, string>) {
  console.log('Gerando 90 contratos...');

  const contractIds: string[] = [];

  for (let i = 0; i < 90; i++) {
    const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
    const startDate = faker.date.past({ years: 1 });
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + Math.floor(Math.random() * 12) + 1);

    const contract = await prisma.contract.create({
      data: {
        clientId: clientId,
        code: `CTR-${new Date().getFullYear()}-${String(i + 1).padStart(5, '0')}`,
        title: `Contrato de Locação - Cliente ${clientId.substring(0, 8)}`,
        status: ['DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED'][Math.floor(Math.random() * 4)] as any,
        startDate: startDate,
        endDate: endDate,
        serviceScope: `Locação de veículos pesados para transporte de cargas diversas`,
        monthlyQuota: Math.floor(Math.random() * 100) + 10,
        billingFrequency: 'MONTHLY',
        billingDayOfMonth: 1,
        monthlyValue: (5000 + Math.random() * 50000),
        generateNfse: Math.random() > 0.5,
        generateBoleto: true,
      },
    });

    contractIds.push(contract.id);
  }

  console.log(`✓ ${contractIds.length} contratos criados`);
  return contractIds;
}

async function generateServiceOrders(
  clientIds: string[],
  contractIds: string[],
  serviceTypeIds: Record<string, string>,
  slaIds: Record<string, string>,
  users: Record<string, string>
) {
  console.log('Gerando 150 ordens de serviço...');

  const osIds: string[] = [];
  const statuses = ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELED'];
  const userIds = Object.values(users);

  for (let i = 0; i < 150; i++) {
    const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
    const contractId = contractIds[Math.floor(Math.random() * contractIds.length)];
    const serviceTypeCode = Object.keys(serviceTypeIds)[Math.floor(Math.random() * Object.keys(serviceTypeIds).length)];
    const serviceTypeId = serviceTypeIds[serviceTypeCode];

    const createdById = userIds[Math.floor(Math.random() * userIds.length)];
    const assignedTechnicianId = userIds[Math.floor(Math.random() * userIds.length)];

    const openedAt = faker.date.past({ years: 1 });
    const slaId = Object.values(slaIds)[Math.floor(Math.random() * Object.values(slaIds).length)];

    const os = await prisma.serviceOrder.create({
      data: {
        clientId: clientId,
        serviceTypeId: serviceTypeId,
        contractId: contractId,
        slaId: slaId,
        createdById: createdById,
        title: `OS-${serviceTypeCode}-${i + 1}`,
        description: `Ordem de serviço para ${serviceTypeCode}`,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)] as any,
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        openedAt: openedAt,
        startedAt: new Date(openedAt.getTime() + 3600000),
        completedAt: Math.random() > 0.5 ? new Date(openedAt.getTime() + 86400000) : null,
        assignedTechnicianId: assignedTechnicianId,
        estimatedValue: (1000 + Math.random() * 50000),
        internalNotes: `Notas internas da OS ${i + 1}`,
        customerNotes: `Informações adicionais do cliente`,
      },
    });

    osIds.push(os.id);
  }

  console.log(`✓ ${osIds.length} ordens de serviço criadas`);
  return osIds;
}

async function generateStatusHistory(serviceOrderIds: string[], users: Record<string, string>) {
  console.log('Gerando histórico de status das OS...');

  const userIds = Object.values(users);
  let count = 0;

  for (const osId of serviceOrderIds.slice(0, 50)) {
    const statuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];

    for (let i = 0; i < statuses.length - 1; i++) {
      await prisma.serviceOrderStatusHistory.create({
        data: {
          serviceOrderId: osId,
          fromStatus: statuses[i] as any,
          toStatus: statuses[i + 1] as any,
          changedById: userIds[Math.floor(Math.random() * userIds.length)],
          reason: `Status alterado para ${statuses[i + 1]}`,
          changedAt: new Date(),
        },
      });
      count++;
    }
  }

  console.log(`✓ ${count} registros de histórico criados`);
}

async function main() {
  try {
    console.log('\n========================================');
    console.log('GERAÇÃO DE MASSA DE TESTE - BRASIL TRUCK');
    console.log('========================================\n');

    // 1. Usuários e Roles
    const users = await generateUsers();
    console.log(`✓ Usuários criados: ${Object.keys(users).length}`);

    // 2. Categorias e Tipos de Serviço
    const categoryIds = await generateServiceCategories();
    const serviceTypeIds = await generateServiceTypes(categoryIds);
    console.log(`✓ Tipos de serviço criados: ${Object.keys(serviceTypeIds).length}`);

    // 3. SLAs
    const slaIds = await generateSLAs();
    console.log(`✓ SLAs criados: ${Object.keys(slaIds).length}`);

    // 4. Clientes
    const clientIds = await generateClients();

    // 5. Veículos (Assets)
    const vehicleIds = await generateVehicles();

    // 6. Contratos
    const contractIds = await generateContracts(clientIds, serviceTypeIds, users);

    // 7. Ordens de Serviço
    const osIds = await generateServiceOrders(clientIds, contractIds, serviceTypeIds, slaIds, users);

    // 8. Histórico de Status
    await generateStatusHistory(osIds, users);

    console.log('\n========================================');
    console.log('RESUMO DA GERAÇÃO');
    console.log('========================================');
    console.log(`✓ Usuários: ${Object.keys(users).length}`);
    console.log(`✓ Categorias de Serviço: ${Object.keys(categoryIds).length}`);
    console.log(`✓ Tipos de Serviço: ${Object.keys(serviceTypeIds).length}`);
    console.log(`✓ SLAs: ${Object.keys(slaIds).length}`);
    console.log(`✓ Clientes: ${clientIds.length}`);
    console.log(`✓ Veículos: ${vehicleIds.length}`);
    console.log(`✓ Contratos: ${contractIds.length}`);
    console.log(`✓ Ordens de Serviço: ${osIds.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro durante a geração de dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
