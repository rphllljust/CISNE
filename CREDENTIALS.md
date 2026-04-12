# 🔐 Credenciais de Acesso - OMS System

## Admin Padrão (após seed)

```
EMAIL:    admin@oms.local
SENHA:    Admin@123
ROLE:     SUPER_ADMIN
```

## Técnico Padrão (após seed)

```
EMAIL:    tecnico@oms.local
SENHA:    Tech@123
ROLE:     TECHNICIAN
```

## URLs de Acesso

- **Frontend:** http://localhost:5181 (ou 5173, 5174, 5175, etc - Vite escolhe porta livre)
- **Backend API:** http://localhost:3000/api/v1
- **Swagger API Docs:** http://localhost:3000/api

## Endpoints Principais

### Autenticação
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Ordens de Serviço
- `GET /api/v1/service-orders` - Listar
- `GET /api/v1/service-orders/:id` - Detalhe
- `POST /api/v1/service-orders` - Criar
- `PUT /api/v1/service-orders/:id` - Atualizar

### Relatórios
- `GET /api/v1/reports/dashboard` - Dashboard overview
- `GET /api/v1/reports/service-orders` - Service orders report
- `GET /api/v1/reports/technician-efficiency/:technicianId` - Efficiency by technician

## Como Criar Admin Customizado

```bash
npm run admin:create
```

Será solicitado:
- Email
- Nome completo
- Senha (mínimo 8 caracteres)

## 🔒 Segurança em Produção

⚠️ **IMPORTANTE:**
1. Altere as credenciais padrão imediatamente
2. Gere novas JWT_ACCESS_SECRET e JWT_REFRESH_SECRET
3. Use HTTPS em produção
4. Configure CORS apropriadamente
5. Ative 2FA se disponível

## Base de Dados

- **Engine:** PostgreSQL
- **Database:** Configurado via DATABASE_URL no .env
- **Migrations:** `npm run prisma:migrate`
- **Seed:** `npm run prisma:seed`
- **Seed 10 clientes:** `npm run prisma:seed:10clients`

