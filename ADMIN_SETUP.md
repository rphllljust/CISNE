# 🔐 Configuração de Admin - OMS

## Setup Inicial

### 1. Prepare o Banco de Dados

```bash
# Criar banco e rodar migrações
npm run prisma:migrate

# OU sincronizar schema (recomendado para desenvolvimento)
npx prisma db push
```

### 2. Popular Dados Iniciais (Opcional)

```bash
# Seed com 1 cliente demo
npm run prisma:seed

# OU seed com 10 clientes + fluxo completo
npm run prisma:seed:10clients
```

### 3. Criar Admin com Credenciais Personalizadas

```bash
npm run admin:create
```

Você será solicitado a informar:
- **Email**: seu email de admin
- **Nome completo**: seu nome
- **Senha**: senha segura (mínimo 8 caracteres)

**Exemplo:**
```
🔐 Criar Admin do Sistema OMS

Email do admin: meuemail@empresa.com.br
Nome completo: João Silva
Senha (mínimo 8 caracteres): MinhaSenha123!

✅ Admin criado com sucesso!

📋 Credenciais de acesso:
Email: meuemail@empresa.com.br
Senha: MinhaSenha123!
Nome: João Silva
Role: SUPER_ADMIN

💡 Guarde essas credenciais em local seguro.
```

### 4. Iniciar Backend

```bash
npm run start:dev
```

### 5. Iniciar Frontend

```bash
cd frontend
npm run dev
```

---

## 🔄 Alterar Senha de Admin Existente

Se precisar alterar a senha de um admin já criado:

```bash
# Via SQL direto (se souber o hash)
# OU via aplicação (seção Perfil quando logado)
```

---

## 📋 Credenciais Padrão (após seed)

Se rodar `npm run prisma:seed` ou `npm run prisma:seed:10clients`, terá:

| Email | Senha | Função |
|-------|-------|--------|
| admin@oms.local | Admin@123 | Super Admin |
| tecnico@oms.local | Tech@123 | Técnico de Campo |

**⚠️ IMPORTANTE**: Altere essas credenciais em produção!

---

## 🚀 Fluxo Completo de Setup

```bash
# 1. Clonar repo
git clone <repo-url>
cd OS

# 2. Instalar dependências
npm install
cd frontend && npm install && cd ..

# 3. Configurar .env
cp .env.example .env
# Editar .env com seus dados de banco

# 4. Preparar banco
npm run prisma:migrate

# 5. Popular dados (opcional)
npm run prisma:seed:10clients

# 6. Criar seu admin personalizado
npm run admin:create

# 7. Iniciar backend
npm run start:dev

# 8. Em outro terminal, iniciar frontend
cd frontend
npm run dev
```

---

## 🔗 Acessar Sistema

- **Frontend**: http://localhost:5175
- **Backend API**: http://localhost:3000/api/v1
- **Documentação API**: http://localhost:3000/api (swagger)

---

## ⚙️ Variáveis de Ambiente Importantes

```env
# Banco de dados (obrigatório)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Segurança (trocar em produção!)
JWT_ACCESS_SECRET=sua_chave_secreta_longa
JWT_REFRESH_SECRET=sua_chave_secreta_longa_refresh

# Frontend (se diferente do padrão)
CORS_ORIGIN=http://localhost:5173
```

---

## 🆘 Troubleshooting

### Erro: "Can't reach database"
- Verificar se PostgreSQL está rodando
- Verificar DATABASE_URL no .env
- Testar conexão: `psql <DATABASE_URL>`

### Erro: "Migration failed"
- Limpar banco: `npx prisma db push --force-reset`
- Recriar: `npm run prisma:migrate`

### Admin não consegue logar
- Verificar email exato (case-sensitive)
- Resetar senha via script
- Verificar JWT_ACCESS_SECRET

---

## 📝 Estrutura de Roles

```
SUPER_ADMIN
├── Acesso total ao sistema
├── Gerenciar usuários
├── Acessar todos os módulos
└── Ver auditoria

OPERATIONS_MANAGER
├── Gerenciar ordens de serviço
├── Relatórios operacionais
└── Dashboard executivo

SUPERVISOR
├── Supervisar equipes
├── Atribuir tarefas
└── Relatórios limitados

TECHNICIAN
├── Executar ordens
├── Registrar horas
└── Ver dados de clientes

ATTENDANT
├── Abrir chamados
├── Suporte básico
└── Dados de clientes

CLIENT
└── Portal cliente (read-only)
```

---

## 🔒 Boas Práticas de Segurança

1. **Nunca commitar .env** (use .env.example)
2. **Trocar JWT_ACCESS_SECRET em produção**
3. **Usar HTTPS em produção**
4. **Alterar senhas padrão imediatamente**
5. **Ativar 2FA se disponível**
6. **Auditar logs regularmente**

---

**Dúvidas?** Consulte a documentação completa em `README.md` ou abra uma issue.
