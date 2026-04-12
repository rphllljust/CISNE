import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  console.log('\n🔐 Criar Admin do Sistema OMS\n');

  const email = await prompt('Email do admin: ');
  const fullName = await prompt('Nome completo: ');
  const password = await prompt('Senha (mínimo 8 caracteres): ');

  if (!email || !fullName || !password) {
    console.log('❌ Todos os campos são obrigatórios');
    process.exit(1);
  }

  if (password.length < 8) {
    console.log('❌ Senha deve ter no mínimo 8 caracteres');
    process.exit(1);
  }

  try {
    // Buscar role SUPER_ADMIN
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' }
    });

    if (!superAdminRole) {
      console.log('❌ Role SUPER_ADMIN não encontrada. Execute o seed primeiro.');
      process.exit(1);
    }

    // Verificar se admin já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`❌ Usuário com email ${email} já existe`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar admin
    const admin = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        jobTitle: 'Super Admin',
        department: 'TI',
        status: 'ACTIVE',
        userRoles: {
          create: {
            roleId: superAdminRole.id
          }
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log('\n✅ Admin criado com sucesso!\n');
    console.log('📋 Credenciais de acesso:');
    console.log(`Email: ${admin.email}`);
    console.log(`Senha: ${password}`);
    console.log(`Nome: ${admin.fullName}`);
    console.log(`Role: ${admin.userRoles[0]?.role.name}\n`);
    console.log('💡 Guarde essas credenciais em local seguro.\n');

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
