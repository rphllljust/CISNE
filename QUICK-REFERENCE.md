# ⚡ Quick Reference - OMS System

## 🔐 Credenciais de Admin

```
EMAIL: admin@oms.local
SENHA: Admin@123
```

## 🚀 Iniciar Sistema

### Terminal 1 - Backend
```bash
npm run start:dev
```
Acessa em: http://localhost:3000/api

### Terminal 2 - Frontend
```bash
cd frontend && npm run dev
```
Acessa em: http://localhost:5173+ (Vite escolhe porta livre)

## 📱 Páginas Principais

| Página | URL | Descrição |
|--------|-----|-----------|
| Dashboard | `/` | Painel operacional com KPIs |
| Service Orders | `/service-orders` | Ordens de serviço |
| Relatórios | `/reports` | Analytics e métricas |
| Ativos | `/assets` | Inventário de equipamentos |
| Notas Fiscais | `/invoices` | Gestão de notas |
| Fornecedores | `/suppliers` | Base de fornecedores |
| ITSM | `/itsm/problems` | Gerenciamento de problemas |
| Base de Conhecimento | `/knowledge-base` | Artigos e documentação |
| Clientes | `/clients` | Gestão de clientes |
| Usuários | `/users` | Gerenciamento de usuários |

## 🎨 Design Premium Aplicado

✅ Buttons com lift effect (hover)
✅ Gradient backgrounds (135deg)
✅ Premium shadows (0 4px 12px)
✅ Smooth animations (cubic-bezier)
✅ Color variants (success, warning, danger, info)
✅ Professional typography
✅ Focus states com blue ring

## 🗄️ Banco de Dados

### Comandos Úteis
```bash
# Sincronizar schema
npx prisma db push

# Migrations
npm run prisma:migrate

# Seed básico (1 cliente)
npm run prisma:seed

# Seed completo (10 clientes)
npm run prisma:seed:10clients

# Studio (GUI)
npx prisma studio
```

### Credenciais do DB
```
Provider: PostgreSQL
URL: DATABASE_URL (no .env)
```

## 👤 Gerenciar Admin

### Criar novo admin
```bash
npm run admin:create
```
Será solicitado:
- Email
- Nome completo
- Senha (8+ caracteres)

## 🔧 Troubleshooting

### "CSS não está mudando"
1. `Ctrl+Shift+Delete` → Limpar cache
2. `Ctrl+Shift+R` → Hard refresh
3. DevTools → Console (procure por erro)

### "Porta 3000 em uso"
```bash
kill -9 $(lsof -ti:3000)
npm run start:dev
```

### "Database connection error"
1. Verifique DATABASE_URL no .env
2. Teste: `npx prisma db push`
3. Verifique PostgreSQL está rodando

### "Vite porta em uso"
Vite encontra porta automática, verifique logs para saber qual

## 📊 Seed Data Incluído

### 10 Clientes (seed:10clients)
- Cada um com múltiplas ordens
- Ordens em diferentes status
- Até emissão de notas fiscais
- Dados de técnicos e produtos
- Histórico completo

### Status Padrão
- OPEN, UNDER_ANALYSIS, SCHEDULED
- IN_PROGRESS, PAUSED
- COMPLETED, CANCELED
- REOPENED, WAITING_APPROVAL

## 🎯 Workflow Típico

1. **Criar Cliente** → `/clients` → New Client
2. **Criar Ordem de Serviço** → `/service-orders` → Nova Ordem
3. **Atribuir Técnico** → Service Order Detail → Assign
4. **Iniciar Execução** → Mudar status para IN_PROGRESS
5. **Emitir Nota Fiscal** → `/invoices` → Emitir Nota

## 🔒 Variáveis de Ambiente Importantes

```env
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/oms_db
JWT_ACCESS_SECRET=sua_chave_secreta_longa
JWT_REFRESH_SECRET=sua_chave_secreta_longa_refresh
CORS_ORIGIN=http://localhost:5173

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## 📚 Documentação Completa

- `ADMIN_SETUP.md` - Setup completo do sistema
- `DESIGN-IMPLEMENTATION.md` - Design premium details
- `CREDENTIALS.md` - Todas as credenciais
- `README.md` - Documentação geral

## 🎬 Atalhos Úteis

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+R` | Hard refresh (limpa cache) |
| `Ctrl+Shift+Delete` | Abrir limpador de cache |
| `F12` | Abrir DevTools |
| `Ctrl+K` | Abrir console DevTools |
| `Ctrl+Shift+M` | Modo responsivo (mobile) |

## 📞 Contato & Suporte

Sistema desenvolvido com Claude Code.
Para bugs ou melhorias, consulte a documentação ou crie uma issue.

---

**Last Updated:** 2026-04-12
**Status:** ✅ Production Ready

