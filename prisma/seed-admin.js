const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {
      description: 'Acesso total',
      isSystem: true
    },
    create: {
      name: 'SUPER_ADMIN',
      description: 'Acesso total',
      isSystem: true
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@oms.local' },
    update: {
      fullName: 'Administrador OMS',
      status: 'ACTIVE',
      passwordHash
    },
    create: {
      email: 'admin@oms.local',
      fullName: 'Administrador OMS',
      passwordHash,
      status: 'ACTIVE',
      jobTitle: 'Super Admin',
      department: 'TI'
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

  console.log('Admin seed aplicado com sucesso.');
}

main()
  .catch((error) => {
    console.error('Falha ao aplicar admin seed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
