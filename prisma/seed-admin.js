const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const blocked = new Set(['Admin@123', 'Tech@123', 'admin123', 'password', '123456']);

function validateInitialPassword(password) {
  if (!password) throw new Error('ADMIN_INITIAL_PASSWORD obrigatoria');
  if (blocked.has(password)) throw new Error('ADMIN_INITIAL_PASSWORD usa senha proibida');
  if (
    password.length < 12 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      'ADMIN_INITIAL_PASSWORD deve ter no minimo 12 caracteres com maiuscula, minuscula, numero e simbolo'
    );
  }
  return password;
}

async function main() {
  const passwordHash = await bcrypt.hash(
    validateInitialPassword(process.env.ADMIN_INITIAL_PASSWORD),
    10
  );

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
      passwordHash,
      mustChangePassword: true
    },
    create: {
      email: 'admin@oms.local',
      fullName: 'Administrador OMS',
      passwordHash,
      mustChangePassword: true,
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
