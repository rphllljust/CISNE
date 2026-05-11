import { PrismaClient, Priority, ServiceOrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { validateInitialPassword } from './seed-password-policy';


const prisma = new PrismaClient();
const permissionsSeed = [
  'users:read',
  'users:write',
  'users:delete',
  'clients:read',
  'clients:write',
  'service-orders:read',
  'service-orders:write',
  'service-orders:transition',
  'dashboard:read',
  'audit:read',
  'reports:read',
  'notifications:manage'
];

const rolesSeed: Array<{ name: string; description: string; permissions: string[] }> = [
  {
    name: 'SUPER_ADMIN',
    description: 'Acesso total � plataforma OMS',
    permissions: permissionsSeed
  },
  {
    name: 'OPERATIONS_MANAGER',
    description: 'Gestor operacional com acesso amplo',
    permissions: [
      'users:read',
      'clients:read',
      'clients:write',
      'service-orders:read',
      'service-orders:write',
      'service-orders:transition',
      'dashboard:read',
      'reports:read'
    ]
  },
  {
    name: 'SUPERVISOR',
    description: 'Supervisor de equipes e execu��o',
    permissions: [
      'users:read',
      'clients:read',
      'service-orders:read',
      'service-orders:write',
      'service-orders:transition',
      'dashboard:read'
    ]
  },
  {
    name: 'TECHNICIAN',
    description: 'T�cnico/operador de campo',
    permissions: ['clients:read', 'service-orders:read', 'service-orders:transition']
  },
  {
    name: 'ATTENDANT',
    description: 'Atendimento e abertura de chamados',
    permissions: ['clients:read', 'clients:write', 'service-orders:read', 'service-orders:write']
  },
  {
    name: 'CLIENT',
    description: 'Acesso restrito para cliente',
    permissions: ['service-orders:read']
  }
];

async function main(): Promise<void> {
  for (const code of permissionsSeed) {
    await prisma.permission.upsert({
      where: { code },
      update: { description: code },
      create: { code, description: code }
    });
  }

  for (const roleSeed of rolesSeed) {
    const role = await prisma.role.upsert({
      where: { name: roleSeed.name },
      update: { description: roleSeed.description },
      create: {
        name: roleSeed.name,
        description: roleSeed.description,
        isSystem: true
      }
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permissionCode of roleSeed.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { code: permissionCode },
        select: { id: true }
      });

      if (!permission) {
        continue;
      }

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'SUPER_ADMIN' },
    select: { id: true }
  });

  const technicianRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'TECHNICIAN' },
    select: { id: true }
  });

  const passwordHash = await bcrypt.hash(
    validateInitialPassword({ password: process.env.SEED_ADMIN_PASSWORD, envName: 'SEED_ADMIN_PASSWORD' }),
    10
  );
  const techPasswordHash = await bcrypt.hash(
    validateInitialPassword({ password: process.env.SEED_TECH_PASSWORD, envName: 'SEED_TECH_PASSWORD' }),
    10
  );

  const admin = await prisma.user.upsert({
    where: { email: 'admin@oms.local' },
    update: {
      fullName: 'Administrador OMS',
      status: 'ACTIVE',
      passwordHash,
      mustChangePassword: true
    },
    create: {
      email: 'admin@oms.local',
      fullName: 'Administrador OMS',
      passwordHash,
      mustChangePassword: true,
      jobTitle: 'Super Admin',
      department: 'TI'
    }
  });

  const technician = await prisma.user.upsert({
    where: { email: 'tecnico@oms.local' },
    update: {
      fullName: 'T�cnico Demo',
      passwordHash: techPasswordHash,
      mustChangePassword: true
    },
    create: {
      email: 'tecnico@oms.local',
      fullName: 'T�cnico Demo',
      passwordHash: techPasswordHash,
      mustChangePassword: true,
      jobTitle: 'T�cnico de Campo',
      department: 'Opera��es'
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: {
      userId: admin.id,
      roleId: superAdminRole.id
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: technician.id, roleId: technicianRole.id } },
    update: {},
    create: {
      userId: technician.id,
      roleId: technicianRole.id
    }
  });

  const defaultSla = await prisma.sLA.upsert({
    where: { name: 'SLA Padr�o 24h' },
    update: {
      responseTimeMinutes: 120,
      resolutionTimeMinutes: 1440,
      warningBeforeMinutes: 180
    },
    create: {
      name: 'SLA Padr�o 24h',
      responseTimeMinutes: 120,
      resolutionTimeMinutes: 1440,
      warningBeforeMinutes: 180,
      description: 'Atendimento com conclus�o em at� 24 horas'
    }
  });

  const team = await prisma.team.upsert({
    where: { code: 'EQ-CAMPO-01' },
    update: {
      name: 'Equipe Campo 01',
      supervisorId: admin.id
    },
    create: {
      code: 'EQ-CAMPO-01',
      name: 'Equipe Campo 01',
      region: 'Zona Sul',
      supervisorId: admin.id
    }
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: technician.id
      }
    },
    update: {
      specialty: 'El�trica',
      isLead: true
    },
    create: {
      teamId: team.id,
      userId: technician.id,
      specialty: 'El�trica',
      isLead: true,
      regionCoverage: 'Zona Sul'
    }
  });

  const client = await prisma.client.upsert({
    where: { taxId: '12345678000199' },
    update: {
      name: 'Empresa Demo LTDA',
      active: true
    },
    create: {
      type: 'BUSINESS',
      name: 'Empresa Demo LTDA',
      legalName: 'Empresa Demo Solu��es LTDA',
      taxId: '12345678000199',
      email: 'contato@empresademo.com',
      phone: '1130000000',
      contactName: 'Maria Gestora'
    }
  });

  const address = await prisma.address.create({
    data: {
      clientId: client.id,
      label: 'Matriz',
      street: 'Av. Paulista',
      number: '1000',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01310000',
      isPrimary: true
    }
  });

  const contract = await prisma.contract.upsert({
    where: { code: 'CTR-2026-001' },
    update: {
      status: 'ACTIVE',
      slaId: defaultSla.id
    },
    create: {
      code: 'CTR-2026-001',
      title: 'Contrato Operacional Anual',
      clientId: client.id,
      slaId: defaultSla.id,
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-12-31T23:59:59Z'),
      status: 'ACTIVE',
      serviceScope: 'Manuten��o corretiva e preventiva'
    }
  });

  const category = await prisma.serviceCategory.upsert({
    where: { code: 'MANUTENCAO' },
    update: { name: 'Manuten��o' },
    create: {
      code: 'MANUTENCAO',
      name: 'Manuten��o',
      description: 'Servi�os de manuten��o em campo'
    }
  });

  const serviceType = await prisma.serviceType.upsert({
    where: { code: 'MANUT-ELETRICA' },
    update: {
      name: 'Manuten��o El�trica',
      categoryId: category.id,
      defaultSlaId: defaultSla.id,
      estimatedDurationMinutes: 180,
      defaultPriority: Priority.HIGH
    },
    create: {
      code: 'MANUT-ELETRICA',
      name: 'Manuten��o El�trica',
      subcategory: 'Quadro de energia',
      categoryId: category.id,
      defaultSlaId: defaultSla.id,
      estimatedDurationMinutes: 180,
      defaultPriority: Priority.HIGH,
      checklistTemplate: {
        items: [
          { key: 'isolar-area', description: 'Isolar a �rea de trabalho', required: true },
          { key: 'epi', description: 'Validar uso de EPI', required: true },
          { key: 'foto-antes', description: 'Registrar foto antes da execu��o', required: false }
        ]
      },
      executionRules: {
        requiresApproval: false,
        requiresCheckIn: true
      }
    }
  });

  const order = await prisma.serviceOrder.create({
    data: {
      clientId: client.id,
      serviceTypeId: serviceType.id,
      contractId: contract.id,
      slaId: defaultSla.id,
      assignedTeamId: team.id,
      assignedTechnicianId: technician.id,
      locationAddressId: address.id,
      title: 'Disjuntor desarmando com frequ�ncia',
      description: 'Cliente reporta queda de energia intermitente no setor administrativo.',
      priority: Priority.HIGH,
      status: ServiceOrderStatus.SCHEDULED,
      openedAt: new Date(),
      scheduledStartAt: new Date(),
      scheduledEndAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
      slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdById: admin.id,
      updatedById: admin.id,
      checklistItems: {
        createMany: {
          data: [
            {
              itemKey: 'isolar-area',
              description: 'Isolar a �rea de trabalho',
              required: true
            },
            {
              itemKey: 'epi',
              description: 'Validar uso de EPI',
              required: true
            }
          ]
        }
      }
    }
  });

  await prisma.serviceOrderStatusHistory.create({
    data: {
      serviceOrderId: order.id,
      fromStatus: ServiceOrderStatus.OPEN,
      toStatus: ServiceOrderStatus.SCHEDULED,
      reason: 'Agendamento inicial criado no seed',
      changedById: admin.id,
      metadata: {
        source: 'seed'
      }
    }
  });

  await prisma.schedule.create({
    data: {
      serviceOrderId: order.id,
      teamId: team.id,
      technicianId: technician.id,
      scheduledStart: new Date(),
      scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
      confirmationStatus: 'CONFIRMED',
      confirmedAt: new Date(),
      notes: 'Visita inicial confirmada.'
    }
  });

  console.log('Seed conclu�do com sucesso.');
}

main()
  .catch((error: unknown) => {
    console.error('Erro ao executar seed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
