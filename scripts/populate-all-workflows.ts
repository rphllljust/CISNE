import { PrismaClient, Priority, ServiceOrderStatus, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export type PopulateAllWorkflowsStats = {
  clients: number;
  assets: number;
  suppliers: number;
  serviceOrders: number;
  invoices: number;
  problems: number;
  changes: number;
  articles: number;
};

export async function createOrIgnore<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return null;
    }
    throw error;
  }
}

export async function populateAllWorkflows(
  prismaClient: PrismaClient = prisma
): Promise<PopulateAllWorkflowsStats | null> {
  console.log('📊 Populando todos os módulos com dados dos 10 clientes...');

  // Buscar clientes, tipos de serviço, equipes, usuários
  const clients = await prismaClient.client.findMany({ take: 10 });
  const serviceTypes = await prismaClient.serviceType.findMany();
  const teams = await prismaClient.team.findMany();
  const users = await prismaClient.user.findMany();
  const slas = await prismaClient.sLA.findMany();
  const contracts = await prismaClient.contract.findMany();

  if (!clients.length) {
    console.log('❌ Nenhum cliente encontrado. Execute o seed primeiro.');
    return null;
  }

  console.log(`✅ Encontrados ${clients.length} clientes`);
  console.log(`✅ Encontrados ${serviceTypes.length} tipos de serviço`);
  console.log(`✅ Encontrados ${teams.length} equipes`);
  console.log(`✅ Encontrados ${users.length} usuários`);

  const admin = users.find(u => u.email === 'admin@oms.local');
  const techs = users.filter(u => u.email?.includes('tech'));
  const team = teams[0];
  const sla = slas[0];

  if (!admin || !techs.length || !team) {
    console.log('❌ Dados essenciais não encontrados');
    return null;
  }

  // ============================================================================
  // MÓDULO: ASSETS (Ativos)
  // ============================================================================
  console.log('\n📦 Criando ASSETS para cada cliente...');
  const assetsByClient: Record<string, string[]> = {};

  for (const client of clients) {
    const assets = [
      { name: 'Transformador Principal', model: 'TR-500KVA', serialNumber: `SN${client.id.slice(0, 8)}001`, category: 'Elétrico' },
      { name: 'Quadro de Distribuição', model: 'QD-3F', serialNumber: `SN${client.id.slice(0, 8)}002`, category: 'Elétrico' },
      { name: 'Nobreak 20kVA', model: 'NB-20', serialNumber: `SN${client.id.slice(0, 8)}003`, category: 'Eletrônico' }
    ];

    assetsByClient[client.id] = [];

    for (let idx = 0; idx < assets.length; idx++) {
      const assetData = assets[idx];
      const asset = await createOrIgnore(() => prismaClient.asset.create({
        data: {
          code: `AST-${client.id.slice(0, 6)}-${idx + 1}`,
          name: assetData.name,
          model: assetData.model,
          serialNumber: assetData.serialNumber,
          category: assetData.category,
          status: 'IN_STOCK',
          acquisitionDate: new Date('2024-01-01'),
          active: true
        }
      }));
      if (asset) assetsByClient[client.id].push(asset.id);
    }

    console.log(`  ✅ ${client.name} - 3 ativos criados`);
  }

  // ============================================================================
  // MÓDULO: SUPPLIERS (Fornecedores)
  // ============================================================================
  console.log('\n🏭 Criando SUPPLIERS para cada cliente...');

  for (const client of clients) {
    const suppliers = [
      { name: 'Eletrônicos Premium Ltda', taxId: `${Math.floor(Math.random() * 1000000000000)}.${Math.floor(Math.random() * 100)}` },
      { name: 'Componentes Industriais', taxId: `${Math.floor(Math.random() * 1000000000000)}.${Math.floor(Math.random() * 100)}` },
      { name: 'Peças de Reposição 24h', taxId: `${Math.floor(Math.random() * 1000000000000)}.${Math.floor(Math.random() * 100)}` }
    ];

    for (const supplierData of suppliers) {
      await createOrIgnore(() => prismaClient.supplier.create({
        data: {
          name: supplierData.name,
          taxId: supplierData.taxId,
          email: `contato@${supplierData.name.toLowerCase().replace(/\s+/g, '')}.com.br`,
          phone: '1133334444',
          active: true
        }
      }));
    }

    console.log(`  ✅ ${client.name} - 3 fornecedores criados`);
  }

  // ============================================================================
  // MÓDULO: SERVICE ORDERS - Múltiplos Estados
  // ============================================================================
  console.log('\n📋 Criando SERVICE ORDERS em múltiplos estados...');

  const statuses = [
    ServiceOrderStatus.OPEN,
    ServiceOrderStatus.UNDER_ANALYSIS,
    ServiceOrderStatus.WAITING_APPROVAL,
    ServiceOrderStatus.SCHEDULED,
    ServiceOrderStatus.IN_TRANSIT,
    ServiceOrderStatus.IN_PROGRESS,
    ServiceOrderStatus.PAUSED,
    ServiceOrderStatus.WAITING_PARTS,
    ServiceOrderStatus.WAITING_CUSTOMER,
    ServiceOrderStatus.COMPLETED
  ];

  for (const client of clients) {
    const clientContract = contracts.find(c => c.clientId === client.id);

    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];
      const daysAgo = (statuses.length - i) * 2; // Cada status tem dias diferentes

      const serviceType = serviceTypes[i % serviceTypes.length];
      const tech = techs[i % techs.length];
      const address = await prismaClient.address.findFirst({ where: { clientId: client.id } });

      const order = await prismaClient.serviceOrder.create({
        data: {
          clientId: client.id,
          serviceTypeId: serviceType.id,
          contractId: clientContract?.id,
          slaId: sla.id,
          assignedTeamId: team.id,
          assignedTechnicianId: tech.id,
          locationAddressId: address?.id,
          title: `${client.name} - ${serviceType.name} (${status})`,
          description: `Ordem de serviço em status ${status}`,
          priority: [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL][i % 4],
          status: status,
          estimatedValue: new Decimal(Math.round((3000 + Math.random() * 15000) * 100) / 100),
          openedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          slaDueAt: new Date(Date.now() + (10 - daysAgo) * 24 * 60 * 60 * 1000),
          createdById: admin.id,
          updatedById: admin.id,
          ...(status === ServiceOrderStatus.SCHEDULED || status === ServiceOrderStatus.COMPLETED
            ? {
                scheduledStartAt: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000),
                scheduledEndAt: new Date(Date.now() - (daysAgo - 2) * 24 * 60 * 60 * 1000)
              }
            : {}),
          ...(status === ServiceOrderStatus.IN_PROGRESS ||
          status === ServiceOrderStatus.PAUSED ||
          status === ServiceOrderStatus.COMPLETED
            ? {
                startedAt: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000)
              }
            : {}),
          ...(status === ServiceOrderStatus.COMPLETED
            ? {
                completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
              }
            : {})
        }
      });

      // Criar schedule se agendado
      if (
        status === ServiceOrderStatus.SCHEDULED ||
        status === ServiceOrderStatus.IN_TRANSIT ||
        status === ServiceOrderStatus.IN_PROGRESS ||
        status === ServiceOrderStatus.COMPLETED
      ) {
        await prismaClient.schedule.create({
          data: {
            serviceOrderId: order.id,
            teamId: team.id,
            technicianId: tech.id,
            scheduledStart: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000),
            scheduledEnd: new Date(Date.now() - (daysAgo - 2) * 24 * 60 * 60 * 1000),
            confirmationStatus: 'CONFIRMED'
          }
        });
      }
    }

    console.log(`  ✅ ${client.name} - ${statuses.length} ordens em diferentes estados`);
  }

  // ============================================================================
  // MÓDULO: INVOICES - Múltiplos Estados
  // ============================================================================
  console.log('\n💰 Criando INVOICES em múltiplos estados...');

  const invoiceStatuses = [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.CANCELED];

  for (const client of clients) {
    // Pegar orders completadas sem invoice
    const clientOrders = await prismaClient.serviceOrder.findMany({
      where: { clientId: client.id, status: ServiceOrderStatus.COMPLETED },
      take: 3,
      include: { invoice: true }
    });

    const ordersWithoutInvoice = clientOrders.filter(o => !o.invoice);

    for (let invoiceIdx = 0; invoiceIdx < ordersWithoutInvoice.length; invoiceIdx++) {
      const order = ordersWithoutInvoice[invoiceIdx];
      const status = invoiceStatuses[invoiceIdx % invoiceStatuses.length];

      if (order) {
        const grossAmount = new Decimal(Math.round((4000 + Math.random() * 12000) * 100) / 100);
        const discountAmount = new Decimal(Math.round(Number(grossAmount) * 0.05 * 100) / 100);
        const taxAmount = new Decimal(Math.round((Number(grossAmount) - Number(discountAmount)) * 0.15 * 100) / 100);
        const netAmount = new Decimal(
          Math.round((Number(grossAmount) - Number(discountAmount) + Number(taxAmount)) * 100) / 100
        );

        await createOrIgnore(() => prismaClient.invoice.create({
          data: {
            serviceOrderId: order.id,
            clientId: client.id,
            status: status,
            grossAmount,
            discountAmount,
            taxAmount,
            netAmount,
            description: `Nota Fiscal - ${order.title}`,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            issueDate: new Date(Date.now() - invoiceIdx * 24 * 60 * 60 * 1000),
            ...(status === InvoiceStatus.CANCELED
              ? {
                  canceledAt: new Date(Date.now() - (invoiceIdx + 5) * 24 * 60 * 60 * 1000),
                  cancellationReason: 'Cancelamento por erro no serviço'
                }
              : {})
          }
        }));
      }
    }

    const createdCount = ordersWithoutInvoice.length;
    console.log(`  ✅ ${client.name} - ${createdCount} notas fiscais criadas`);
  }

  // ============================================================================
  // MÓDULO: ITSM - Problems
  // ============================================================================
  console.log('\n🐛 Criando ITSM PROBLEMS para cada cliente...');

  for (let idx = 0; idx < clients.length; idx++) {
    const client = clients[idx];
    const problems = [
      { title: 'Falha intermitente no equipamento', priority: Priority.HIGH },
      { title: 'Vazamento de óleo no transformador', priority: Priority.CRITICAL },
      { title: 'Ruído anormal na operação', priority: Priority.MEDIUM }
    ];

    for (let pIdx = 0; pIdx < problems.length; pIdx++) {
      const problemData = problems[pIdx];
      await createOrIgnore(() => prismaClient.problemRecord.create({
        data: {
          code: `PRB-${client.id.slice(0, 6)}-${idx}-${pIdx}`,
          title: problemData.title,
          description: `Problema identificado em ${client.name}: ${problemData.title}`,
          priority: problemData.priority,
          status: 'OPEN',
          openedById: admin.id
        }
      }));
    }

    console.log(`  ✅ ${client.name} - 3 problemas criados`);
  }

  // ============================================================================
  // MÓDULO: ITSM - Changes
  // ============================================================================
  console.log('\n🔄 Criando ITSM CHANGES para cada cliente...');

  for (let idx = 0; idx < clients.length; idx++) {
    const changeCategories = ['STANDARD', 'NORMAL', 'EMERGENCY'];
    const changes = [
      { title: 'Upgrade de firmware', category: changeCategories[0] },
      { title: 'Atualização de software', category: changeCategories[1] },
      { title: 'Mudança de configuração de rede', category: changeCategories[2] }
    ];

    for (let cIdx = 0; cIdx < changes.length; cIdx++) {
      const changeData = changes[cIdx];
      await createOrIgnore(() => prismaClient.changeRequest.create({
        data: {
          code: `CHG-${clients[idx].id.slice(0, 6)}-${idx}-${cIdx}`,
          title: changeData.title,
          description: `Mudança planejada em ${clients[idx].name}: ${changeData.title}`,
          category: changeData.category as any,
          status: 'APPROVED',
          riskLevel: 'MEDIUM',
          scheduledStartAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          requestedById: admin.id,
          approvedById: admin.id
        }
      }));
    }

    console.log(`  ✅ ${clients[idx].name} - 3 mudanças criadas`);
  }

  // ============================================================================
  // MÓDULO: KNOWLEDGE BASE
  // ============================================================================
  console.log('\n📚 Criando KNOWLEDGE BASE ARTICLES...');

  const categories = [
    'Manutenção Preventiva',
    'Troubleshooting',
    'Procedimentos de Segurança',
    'Guias de Operação',
    'FAQ'
  ];

  for (let idx = 0; idx < clients.length; idx++) {
    const client = clients[idx];
    for (let cIdx = 0; cIdx < categories.length; cIdx++) {
      const category = categories[cIdx];
      await createOrIgnore(() => prismaClient.knowledgeArticle.create({
        data: {
          title: `${category} - ${client.name}`,
          slug: `${category.toLowerCase()}-${client.id}-${idx}-${cIdx}`.replace(/\s+/g, '-'),
          content: `Conteúdo para ${category} aplicável a ${client.name}. Este artigo contém informações detalhadas sobre ${category.toLowerCase()}.`,
          status: 'PUBLISHED',
          tags: [category.toLowerCase(), client.name.toLowerCase()],
          publishedAt: new Date(),
          authorId: admin.id
        }
      }));
    }

    console.log(`  ✅ ${client.name} - 5 artigos criados`);
  }

  // ============================================================================
  // RELATÓRIO FINAL
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('🎉 WORKFLOW COMPLETO POPULADO!');
  console.log('='.repeat(70));

  const stats = {
    clients: clients.length,
    assets: clients.length * 3,
    suppliers: clients.length * 3,
    serviceOrders: clients.length * statuses.length,
    invoices: clients.length * invoiceStatuses.length,
    problems: clients.length * 3,
    changes: clients.length * 3,
    articles: clients.length * categories.length
  };

  console.log('\n📊 ESTATÍSTICAS:');
  console.log(`   Clientes:              ${stats.clients}`);
  console.log(`   Ativos (Assets):       ${stats.assets}`);
  console.log(`   Fornecedores:          ${stats.suppliers}`);
  console.log(`   Ordens de Serviço:     ${stats.serviceOrders} (${statuses.length} em cada estado)`);
  console.log(`   Notas Fiscais:         ${stats.invoices}`);
  console.log(`   Problemas (ITSM):      ${stats.problems}`);
  console.log(`   Mudanças (ITSM):       ${stats.changes}`);
  console.log(`   Artigos (KB):          ${stats.articles}`);
  console.log('\n📈 TOTAL DE REGISTROS CRIADOS:', Object.values(stats).reduce((a, b) => a + b, 0));
  console.log('\n✅ Todos os 10 clientes estão em todos os módulos do sistema!');
  return stats;
}

async function main(): Promise<void> {
  await populateAllWorkflows(prisma);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Erro:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

