import { PrismaClient, Priority, ServiceOrderStatus, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import { validateInitialPassword } from './seed-password-policy';

const prisma = new PrismaClient();
async function main(): Promise<void> {
  console.log('🌱 Iniciando seed com 10 clientes e fluxo completo até emissão de NF...');

  // ===== Permissions =====
  const permissions = [
    'users:read', 'users:write', 'users:delete',
    'clients:read', 'clients:write',
    'service-orders:read', 'service-orders:write', 'service-orders:transition',
    'invoices:read', 'invoices:write',
    'dashboard:read', 'audit:read', 'reports:read', 'notifications:manage'
  ];

  for (const code of permissions) {
    await prisma.permission.create({
      data: { code, description: code }
    });
  }

  // ===== Roles =====
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'SUPER_ADMIN',
      description: 'Acesso total',
      isSystem: true,
      rolePermissions: {
        create: (await Promise.all(permissions.map(code => prisma.permission.findUniqueOrThrow({ where: { code } })))).map(p => ({
          permissionId: p.id
        }))
      }
    }
  });

  const opsRole = await prisma.role.create({
    data: {
      name: 'OPERATIONS_MANAGER',
      description: 'Gestor operacional',
      isSystem: true,
      rolePermissions: {
        create: (await Promise.all(permissions.slice(0, 8).map(code => prisma.permission.findUniqueOrThrow({ where: { code } })))).map(p => ({
          permissionId: p.id
        }))
      }
    }
  });

  const techRole = await prisma.role.create({
    data: {
      name: 'TECHNICIAN',
      description: 'Técnico de campo',
      isSystem: true,
      rolePermissions: {
        create: (await Promise.all(['clients:read', 'service-orders:read', 'service-orders:transition'].map(code => prisma.permission.findUniqueOrThrow({ where: { code } })))).map(p => ({
          permissionId: p.id
        }))
      }
    }
  });

  // ===== Users =====
  const adminHash = await bcrypt.hash(
    validateInitialPassword({ password: process.env.SEED_ADMIN_PASSWORD, envName: 'SEED_ADMIN_PASSWORD' }),
    10
  );
  const techHash = await bcrypt.hash(
    validateInitialPassword({ password: process.env.SEED_TECH_PASSWORD, envName: 'SEED_TECH_PASSWORD' }),
    10
  );

  const admin = await prisma.user.create({
    data: {
      email: 'admin@oms.local',
      fullName: 'Admin Master',
      passwordHash: adminHash,
      mustChangePassword: true,
      jobTitle: 'Super Admin',
      department: 'TI',
      userRoles: { create: { roleId: superAdminRole.id } }
    }
  });

  const techs = [];
  for (let i = 1; i <= 3; i++) {
    const tech = await prisma.user.create({
      data: {
        email: `tech${i}@oms.local`,
        fullName: `Técnico ${i}`,
        passwordHash: techHash,
        mustChangePassword: true,
        jobTitle: 'Técnico de Campo',
        department: 'Operações',
        userRoles: { create: { roleId: techRole.id } }
      }
    });
    techs.push(tech);
  }

  // ===== SLA =====
  const sla = await prisma.sLA.create({
    data: {
      name: 'SLA Padrão 24h',
      responseTimeMinutes: 120,
      resolutionTimeMinutes: 1440,
      warningBeforeMinutes: 180,
      description: 'Atendimento com conclusão em até 24 horas'
    }
  });

  // ===== Team =====
  const team = await prisma.team.create({
    data: {
      code: 'EQ-CAMPO-01',
      name: 'Equipe Campo 01',
      region: 'Zona Sul',
      supervisorId: admin.id
    }
  });

  for (let i = 0; i < techs.length; i++) {
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: techs[i].id,
        specialty: ['Elétrica', 'Hidráulica', 'Mecânica'][i],
        isLead: i === 0,
        regionCoverage: 'Zona Sul'
      }
    });
  }

  // ===== Service Category & Type =====
  const category = await prisma.serviceCategory.create({
    data: {
      code: 'MANUTENCAO',
      name: 'Manutenção',
      description: 'Serviços de manutenção em campo'
    }
  });

  const serviceType = await prisma.serviceType.create({
    data: {
      code: 'MANUT-ELETRICA',
      name: 'Manutenção Elétrica',
      subcategory: 'Quadro de energia',
      categoryId: category.id,
      defaultSlaId: sla.id,
      estimatedDurationMinutes: 180,
      defaultPriority: Priority.HIGH,
      checklistTemplate: {
        items: [
          { key: 'isolar-area', description: 'Isolar a área de trabalho', required: true },
          { key: 'epi', description: 'Validar uso de EPI', required: true }
        ]
      }
    }
  });

  // ===== 10 Clientes com Fluxo Completo =====
  const clients = [
    { name: 'TechCorp Brasil', taxId: '11222333000100', email: 'contato@techcorp.com.br' },
    { name: 'Industrial Solutions LTDA', taxId: '22333444000200', email: 'ops@industrial.com.br' },
    { name: 'Manufatura Avançada SA', taxId: '33444555000300', email: 'manutencao@manufatura.com.br' },
    { name: 'Logística Nacional', taxId: '44555666000400', email: 'tech@logistica.com.br' },
    { name: 'Energia Sustentável', taxId: '55666777000500', email: 'support@energia.com.br' },
    { name: 'Automação Industrial', taxId: '66777888000600', email: 'manutencao@automacao.com.br' },
    { name: 'Transformadores Brasil', taxId: '77888999000700', email: 'operacoes@transformadores.com.br' },
    { name: 'Manutenção Integrada', taxId: '88999000000800', email: 'operacoes@manutencao.com.br' },
    { name: 'Contratos Especializados', taxId: '99000111000900', email: 'contratos@especializados.com.br' },
    { name: 'Gestão Operacional 24h', taxId: '00111222001000', email: 'operacoes@gestao24.com.br' }
  ];

  for (const clientData of clients) {
    const client = await prisma.client.create({
      data: {
        type: 'BUSINESS',
        name: clientData.name,
        legalName: `${clientData.name} - Razão Social Completa`,
        taxId: clientData.taxId,
        email: clientData.email,
        phone: '1133334444',
        contactName: 'Gestor Operacional',
        addresses: {
          create: {
            label: 'Sede',
            street: 'Av. Paulista',
            number: '1000',
            district: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310000',
            isPrimary: true
          }
        }
      }
    });

    // Contract
    const contract = await prisma.contract.create({
      data: {
        code: `CTR-${client.id.slice(0, 8)}-2026`,
        title: 'Contrato de Manutenção Anual',
        clientId: client.id,
        slaId: sla.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'ACTIVE',
        serviceScope: 'Manutenção corretiva e preventiva'
      }
    });

    const address = await prisma.address.findFirst({
      where: { clientId: client.id }
    });

    // Service Order -> Scheduled -> In Progress -> Completed -> Invoice Emitted
    const order = await prisma.serviceOrder.create({
      data: {
        clientId: client.id,
        serviceTypeId: serviceType.id,
        contractId: contract.id,
        slaId: sla.id,
        assignedTeamId: team.id,
        assignedTechnicianId: techs[Math.floor(Math.random() * techs.length)].id,
        locationAddressId: address?.id || undefined,
        title: `${clientData.name} - Manutenção Preventiva`,
        description: `Visita técnica para manutenção preventiva em equipamentos críticos de ${clientData.name}`,
        priority: Priority.HIGH,
        status: ServiceOrderStatus.COMPLETED,
        openedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        scheduledStartAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        scheduledEndAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        slaDueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdById: admin.id,
        updatedById: admin.id
      }
    });

    // Status History: OPEN -> SCHEDULED -> IN_PROGRESS -> COMPLETED
    await prisma.serviceOrderStatusHistory.createMany({
      data: [
        {
          serviceOrderId: order.id,
          fromStatus: ServiceOrderStatus.OPEN,
          toStatus: ServiceOrderStatus.SCHEDULED,
          reason: 'Agendamento confirmado',
          changedById: admin.id
        },
        {
          serviceOrderId: order.id,
          fromStatus: ServiceOrderStatus.SCHEDULED,
          toStatus: ServiceOrderStatus.IN_PROGRESS,
          reason: 'Técnico iniciou trabalho',
          changedById: techs[0].id
        },
        {
          serviceOrderId: order.id,
          fromStatus: ServiceOrderStatus.IN_PROGRESS,
          toStatus: ServiceOrderStatus.COMPLETED,
          reason: 'Serviço concluído com sucesso',
          changedById: techs[0].id
        }
      ]
    });

    // Schedule
    await prisma.schedule.create({
      data: {
        serviceOrderId: order.id,
        teamId: team.id,
        technicianId: techs[0].id,
        scheduledStart: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        confirmationStatus: 'CONFIRMED',
        confirmedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        checkInAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        checkOutAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        notes: 'Inspeção e limpeza concluídas com êxito'
      }
    });

    // Invoice (Nota Fiscal) - ISSUED
    const grossAmount = new Decimal(Math.round((5000 + Math.random() * 10000) * 100) / 100);
    const discountAmount = new Decimal(Math.round(Number(grossAmount) * 0.05 * 100) / 100);
    const taxAmount = new Decimal(Math.round((Number(grossAmount) - Number(discountAmount)) * 0.15 * 100) / 100);
    const netAmount = new Decimal(Math.round((Number(grossAmount) - Number(discountAmount) + Number(taxAmount)) * 100) / 100);

    await prisma.invoice.create({
      data: {
        serviceOrderId: order.id,
        clientId: client.id,
        status: InvoiceStatus.ISSUED,
        grossAmount,
        discountAmount,
        taxAmount,
        netAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        issueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        description: `Faturamento da OS #${order.orderNumber} - ${clientData.name}`
      }
    });

    console.log(`✅ ${clientData.name} - Fluxo completo com NF emitida`);
  }

  console.log('🎉 Seed concluído! 10 clientes com fluxo completo até emissão de NF.');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
