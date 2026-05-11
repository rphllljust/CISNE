import {
  InvoiceStatus,
  Priority,
  PrismaClient,
  ServiceOrderStatus
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { validateInitialPassword } from './seed-password-policy';

const prisma = new PrismaClient();
const TOTAL_CLIENTS = 50;

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

async function ensureAccessModel(): Promise<{
  adminId: string;
  technicianIds: string[];
}> {
  for (const code of permissionsSeed) {
    await prisma.permission.upsert({
      where: { code },
      update: { description: code },
      create: { code, description: code }
    });
  }

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { description: 'Full access profile' },
    create: {
      name: 'SUPER_ADMIN',
      description: 'Full access profile',
      isSystem: true
    }
  });

  const technicianRole = await prisma.role.upsert({
    where: { name: 'TECHNICIAN' },
    update: { description: 'Field technician profile' },
    create: {
      name: 'TECHNICIAN',
      description: 'Field technician profile',
      isSystem: true
    }
  });

  for (const code of permissionsSeed) {
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code },
      select: { id: true }
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id
      }
    });
  }

  const technicianPermissions = ['clients:read', 'service-orders:read', 'service-orders:transition'];
  for (const code of technicianPermissions) {
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code },
      select: { id: true }
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: technicianRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: technicianRole.id,
        permissionId: permission.id
      }
    });
  }

  const adminPasswordHash = await bcrypt.hash(
    validateInitialPassword({ password: process.env.SEED_ADMIN_PASSWORD, envName: 'SEED_ADMIN_PASSWORD' }),
    10
  );
  const admin = await prisma.user.upsert({
    where: { email: 'admin@oms.local' },
    update: {
      fullName: 'Administrador OMS',
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
      mustChangePassword: true,
      jobTitle: 'Super Admin',
      department: 'Operations'
    },
    create: {
      email: 'admin@oms.local',
      fullName: 'Administrador OMS',
      passwordHash: adminPasswordHash,
      mustChangePassword: true,
      jobTitle: 'Super Admin',
      department: 'Operations'
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: superAdminRole.id
    }
  });

  const technicianPasswordHash = await bcrypt.hash(
    validateInitialPassword({ password: process.env.SEED_TECH_PASSWORD, envName: 'SEED_TECH_PASSWORD' }),
    10
  );
  const technicianIds: string[] = [];

  for (let index = 1; index <= 3; index++) {
    const technician = await prisma.user.upsert({
      where: { email: `tecnico${index}@oms.local` },
      update: {
        fullName: `Tecnico ${index}`,
        status: 'ACTIVE',
        passwordHash: technicianPasswordHash,
        mustChangePassword: true,
        jobTitle: 'Field Technician',
        department: 'Operations'
      },
      create: {
        email: `tecnico${index}@oms.local`,
        fullName: `Tecnico ${index}`,
        passwordHash: technicianPasswordHash,
        mustChangePassword: true,
        jobTitle: 'Field Technician',
        department: 'Operations'
      }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: technician.id,
          roleId: technicianRole.id
        }
      },
      update: {},
      create: {
        userId: technician.id,
        roleId: technicianRole.id
      }
    });

    technicianIds.push(technician.id);
  }

  return {
    adminId: admin.id,
    technicianIds
  };
}

async function ensureCatalog(adminId: string): Promise<{
  slaId: string;
  teamId: string;
  serviceTypeId: string;
}> {
  const sla = await prisma.sLA.upsert({
    where: { name: 'SLA Demo 24h' },
    update: {
      responseTimeMinutes: 120,
      resolutionTimeMinutes: 1440,
      warningBeforeMinutes: 180,
      active: true
    },
    create: {
      name: 'SLA Demo 24h',
      responseTimeMinutes: 120,
      resolutionTimeMinutes: 1440,
      warningBeforeMinutes: 180,
      description: 'SLA default for demo data',
      active: true
    }
  });

  const team = await prisma.team.upsert({
    where: { code: 'EQ-DEMO-50' },
    update: {
      name: 'Equipe Demo 50',
      region: 'Centro',
      supervisorId: adminId,
      active: true
    },
    create: {
      code: 'EQ-DEMO-50',
      name: 'Equipe Demo 50',
      region: 'Centro',
      supervisorId: adminId,
      active: true
    }
  });

  const category = await prisma.serviceCategory.upsert({
    where: { code: 'DEMO-MANUT' },
    update: {
      name: 'Demo Maintenance',
      active: true
    },
    create: {
      code: 'DEMO-MANUT',
      name: 'Demo Maintenance',
      description: 'Demo category for seeded flows',
      active: true
    }
  });

  const serviceType = await prisma.serviceType.upsert({
    where: { code: 'DEMO-MANUT-EL' },
    update: {
      categoryId: category.id,
      defaultSlaId: sla.id,
      defaultPriority: Priority.HIGH,
      estimatedDurationMinutes: 180,
      active: true
    },
    create: {
      code: 'DEMO-MANUT-EL',
      name: 'Demo Electrical Maintenance',
      subcategory: 'Panel',
      categoryId: category.id,
      defaultSlaId: sla.id,
      defaultPriority: Priority.HIGH,
      estimatedDurationMinutes: 180,
      checklistTemplate: {
        items: [
          { key: 'isolation', description: 'Isolate work area', required: true },
          { key: 'ppe', description: 'Validate PPE', required: true }
        ]
      },
      executionRules: {
        requiresCheckIn: true
      },
      active: true
    }
  });

  return {
    slaId: sla.id,
    teamId: team.id,
    serviceTypeId: serviceType.id
  };
}

async function ensureTeamMembers(teamId: string, technicianIds: string[]): Promise<void> {
  for (let index = 0; index < technicianIds.length; index++) {
    await prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId: technicianIds[index]
        }
      },
      update: {
        specialty: `Specialty-${index + 1}`,
        isLead: index === 0,
        active: true,
        regionCoverage: 'Centro'
      },
      create: {
        teamId,
        userId: technicianIds[index],
        specialty: `Specialty-${index + 1}`,
        isLead: index === 0,
        active: true,
        regionCoverage: 'Centro'
      }
    });
  }
}

async function seedClientsFlow(input: {
  adminId: string;
  technicianIds: string[];
  slaId: string;
  teamId: string;
  serviceTypeId: string;
}): Promise<void> {
  let createdOrders = 0;
  let createdInvoices = 0;

  for (let index = 1; index <= TOTAL_CLIENTS; index++) {
    const clientNumber = index.toString().padStart(3, '0');
    const taxId = `8899001100${index.toString().padStart(4, '0')}`;
    const clientEmail = `cliente${clientNumber}@demo-oms.local`;
    const contractCode = `CTR-DEMO-50-${clientNumber}`;
    const orderTitle = `[DEMO-50] OS ${clientNumber}`;

    const client = await prisma.client.upsert({
      where: { taxId },
      update: {
        type: 'BUSINESS',
        name: `Cliente Demo ${clientNumber}`,
        legalName: `Cliente Demo ${clientNumber} LTDA`,
        email: clientEmail,
        phone: `659900${index.toString().padStart(4, '0')}`,
        contactName: 'Gestor Demo',
        active: true
      },
      create: {
        type: 'BUSINESS',
        name: `Cliente Demo ${clientNumber}`,
        legalName: `Cliente Demo ${clientNumber} LTDA`,
        taxId,
        email: clientEmail,
        phone: `659900${index.toString().padStart(4, '0')}`,
        contactName: 'Gestor Demo',
        active: true
      }
    });

    const primaryAddress = await prisma.address.findFirst({
      where: { clientId: client.id, isPrimary: true },
      select: { id: true }
    });

    const addressId =
      primaryAddress?.id ??
      (
        await prisma.address.create({
          data: {
            clientId: client.id,
            label: 'Matriz',
            street: 'Avenida Principal',
            number: `${100 + index}`,
            district: 'Centro',
            city: 'Cuiaba',
            state: 'MT',
            zipCode: `7800${index.toString().padStart(3, '0')}`,
            isPrimary: true
          }
        })
      ).id;

    const contract = await prisma.contract.upsert({
      where: { code: contractCode },
      update: {
        clientId: client.id,
        slaId: input.slaId,
        title: `Contrato Demo ${clientNumber}`,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T23:59:59.000Z'),
        serviceScope: 'Preventive and corrective maintenance'
      },
      create: {
        code: contractCode,
        clientId: client.id,
        slaId: input.slaId,
        title: `Contrato Demo ${clientNumber}`,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T23:59:59.000Z'),
        serviceScope: 'Preventive and corrective maintenance'
      }
    });

    let order = await prisma.serviceOrder.findFirst({
      where: {
        clientId: client.id,
        title: orderTitle,
        deletedAt: null
      }
    });

    if (!order) {
      createdOrders += 1;
      const technicianId = input.technicianIds[(index - 1) % input.technicianIds.length];
      const now = new Date();
      const openedAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const scheduledStartAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const scheduledEndAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
      const completedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const grossAmount = 2000 + index * 50;

      order = await prisma.serviceOrder.create({
        data: {
          clientId: client.id,
          serviceTypeId: input.serviceTypeId,
          contractId: contract.id,
          slaId: input.slaId,
          assignedTeamId: input.teamId,
          assignedTechnicianId: technicianId,
          locationAddressId: addressId,
          title: orderTitle,
          description: `Demo service flow for client ${clientNumber}`,
          priority: Priority.HIGH,
          status: ServiceOrderStatus.COMPLETED,
          openedAt,
          scheduledStartAt,
          scheduledEndAt,
          startedAt: scheduledStartAt,
          completedAt,
          slaDueAt: new Date(openedAt.getTime() + 24 * 60 * 60 * 1000),
          estimatedValue: grossAmount,
          createdById: input.adminId,
          updatedById: input.adminId
        }
      });

      await prisma.serviceOrderStatusHistory.createMany({
        data: [
          {
            serviceOrderId: order.id,
            fromStatus: ServiceOrderStatus.OPEN,
            toStatus: ServiceOrderStatus.SCHEDULED,
            reason: 'Scheduled by seed',
            changedById: input.adminId
          },
          {
            serviceOrderId: order.id,
            fromStatus: ServiceOrderStatus.SCHEDULED,
            toStatus: ServiceOrderStatus.IN_TRANSIT,
            reason: 'Transit by seed',
            changedById: technicianId
          },
          {
            serviceOrderId: order.id,
            fromStatus: ServiceOrderStatus.IN_TRANSIT,
            toStatus: ServiceOrderStatus.IN_PROGRESS,
            reason: 'Started by seed',
            changedById: technicianId
          },
          {
            serviceOrderId: order.id,
            fromStatus: ServiceOrderStatus.IN_PROGRESS,
            toStatus: ServiceOrderStatus.COMPLETED,
            reason: 'Completed by seed',
            changedById: technicianId
          }
        ]
      });

      await prisma.schedule.create({
        data: {
          serviceOrderId: order.id,
          teamId: input.teamId,
          technicianId,
          scheduledStart: scheduledStartAt,
          scheduledEnd: scheduledEndAt,
          confirmationStatus: 'CONFIRMED',
          confirmedAt: scheduledStartAt,
          checkInAt: scheduledStartAt,
          checkOutAt: completedAt,
          notes: 'Generated by seed-50-clients'
        }
      });
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { serviceOrderId: order.id },
      select: { id: true }
    });

    if (!existingInvoice) {
      createdInvoices += 1;
      const grossAmount = 2000 + index * 50;
      const discountAmount = Number((grossAmount * 0.04).toFixed(2));
      const taxAmount = Number((grossAmount * 0.12).toFixed(2));
      const netAmount = Number((grossAmount - discountAmount + taxAmount).toFixed(2));

      await prisma.invoice.create({
        data: {
          serviceOrderId: order.id,
          clientId: client.id,
          contractId: contract.id,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          description: `Invoice for ${orderTitle}`,
          grossAmount,
          discountAmount,
          taxAmount,
          netAmount,
          series: 'NFS',
          status: InvoiceStatus.ISSUED,
          createdById: input.adminId,
          issuedById: input.adminId
        }
      });
    }
  }

  const totalClients = await prisma.client.count({
    where: {
      taxId: {
        startsWith: '8899001100'
      },
      deletedAt: null
    }
  });
  const totalOrders = await prisma.serviceOrder.count({
    where: {
      title: {
        startsWith: '[DEMO-50] OS '
      },
      deletedAt: null
    }
  });
  const totalInvoices = await prisma.invoice.count({
    where: {
      description: {
        startsWith: 'Invoice for [DEMO-50] OS '
      }
    }
  });

  console.log(`CLIENTS_TOTAL=${totalClients}`);
  console.log(`ORDERS_TOTAL=${totalOrders}`);
  console.log(`INVOICES_TOTAL=${totalInvoices}`);
  console.log(`ORDERS_CREATED_NOW=${createdOrders}`);
  console.log(`INVOICES_CREATED_NOW=${createdInvoices}`);
}

async function main(): Promise<void> {
  console.log('Starting seed with 50 demo clients and full flow...');

  const accessModel = await ensureAccessModel();
  const catalog = await ensureCatalog(accessModel.adminId);
  await ensureTeamMembers(catalog.teamId, accessModel.technicianIds);
  await seedClientsFlow({
    adminId: accessModel.adminId,
    technicianIds: accessModel.technicianIds,
    slaId: catalog.slaId,
    teamId: catalog.teamId,
    serviceTypeId: catalog.serviceTypeId
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
