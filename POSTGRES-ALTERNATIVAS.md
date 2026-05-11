# 🗄️ ALTERNATIVAS PARA BANCO DE DADOS

## ❌ PROBLEMA

Docker Desktop não está respondendo ou não está instalado.

---

## ✅ SOLUÇÃO 1: POSTGRESQL INSTALADO LOCALMENTE (Recomendado)

### Windows

**Verificar se está instalado:**
```powershell
Get-Service -Name postgresql-* | Format-Table
```

**Se estiver instalado, iniciar:**
```powershell
# Opção A: Script PowerShell
.\POSTGRES-LOCAL.ps1

# Opção B: Services (Manual)
# 1. Pressione Windows + R
# 2. Digite: services.msc
# 3. Procure por "postgresql"
# 4. Clique direito → Start

# Opção C: PowerShell Admin
Start-Service -Name postgresql-x64-15  # ou outra versão
```

**Se NÃO estiver instalado:**
1. Download: https://www.postgresql.org/download/windows/
2. Instale com as configurações padrão
3. Use `.\POSTGRES-LOCAL.ps1`

---

## ✅ SOLUÇÃO 2: USAR SQLITE (SEM BANCO EXTERNO)

Se não tiver PostgreSQL instalado e não quiser instalar:

### Modificar .env

```bash
# COMENTAR esta linha:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oms

# ADICIONAR esta linha:
DATABASE_URL=file:./prisma/dev.db
```

### Executar Aplicação

```bash
npm run prisma:migrate reset
npm run start:dev
```

**Vantagens:**
- ✅ Sem instalação necessária
- ✅ Tudo em um arquivo SQLite
- ✅ Funciona offline

**Desvantagens:**
- ❌ SQLite é mais lento
- ❌ Não recomendado para produção
- ❌ Performance limitada

---

## ✅ SOLUÇÃO 3: DATABASE ONLINE (Supabase/Railway)

### Opção A: Supabase (Gratuito)

1. Acesse: https://supabase.com
2. Clique: "Start your project"
3. Crie conta
4. Crie novo projeto
5. Copie Connection String

No `.env`:
```bash
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[db]
```

Depois:
```bash
npm run prisma:migrate deploy
npm run start:dev
```

### Opção B: Railway (Também Gratuito)

1. Acesse: https://railway.app
2. Clique: "New Project"
3. Selecione: "Provision PostgreSQL"
4. Copie DATABASE_URL

No `.env`:
```bash
DATABASE_URL=[copie do Railway]
```

Depois:
```bash
npm run prisma:migrate deploy
npm run start:dev
```

---

## 🎯 RECOMENDAÇÃO POR SITUAÇÃO

| Situação | Solução | Comando |
|----------|---------|---------|
| PostgreSQL já instalado no Windows | Solução 1 | `.\POSTGRES-LOCAL.ps1` |
| Sem PostgreSQL, rápido teste | Solução 2 (SQLite) | `npm run prisma:migrate reset` |
| Desenvolvimento distribuído | Solução 3 (Online) | Usar Supabase/Railway |
| Produção | PostgreSQL Real | Usar Solução 1 + Docker |

---

## 🚀 PASSO-A-PASSO RÁPIDO (SOLUÇÃO 1 - LOCAL)

### Se PostgreSQL está instalado:

```powershell
# 1. Executar script
.\POSTGRES-LOCAL.ps1

# 2. Aguardar mensagem: ✅ PostgreSQL conectado

# 3. Abrir outro terminal
npm run start:dev

# 4. Abrir navegador
http://localhost:3000
```

---

## 🚀 PASSO-A-PASSO RÁPIDO (SOLUÇÃO 2 - SQLite)

### Se NÃO tem PostgreSQL:

```bash
# 1. Editar .env
# Comentar: DATABASE_URL=postgresql://...
# Adicionar: DATABASE_URL=file:./prisma/dev.db

# 2. Resetar banco
npm run prisma:migrate reset

# 3. Iniciar
npm run start:dev

# 4. Abrir navegador
http://localhost:3000
```

---

## ⚠️ VERIFICAÇÕES

### PostgreSQL Local

```powershell
# Verificar se serviço está rodando
Get-Service postgresql-* | Select Status

# Verificar conexão
Test-NetConnection -ComputerName localhost -Port 5432

# Ou pelo psql
psql -U postgres -h localhost -d oms
```

### SQLite

```bash
# Arquivo será criado em:
# c:\Users\rphll\Desktop\OS\prisma\dev.db

# Verificar se existe
ls prisma/dev.db
```

### Online (Supabase/Railway)

```bash
# Testar conexão
npm run prisma:db push

# Deve retornar sucesso
```

---

## 🎓 PRÓXIMOS PASSOS

1. **Escolha uma solução** acima
2. **Siga o passo-a-passo** dela
3. **Execute:** `npm run start:dev`
4. **Acesse:** http://localhost:3000

---

## 📞 PRECISA DE AJUDA?

**Solução 1 não funciona?**
- PostgreSQL não está instalado → Instale em postgresql.org
- Serviço não inicia → Verifique logs em Event Viewer

**Solução 2 tem performance ruim?**
- Use Solução 1 ou 3

**Solução 3 quer autenticação?**
- Supabase: Use API tokens
- Railway: Use variáveis de ambiente

---

## 📊 COMPARAÇÃO

| Critério | Solução 1 | Solução 2 | Solução 3 |
|----------|-----------|----------|----------|
| **Instalação** | ⏳ Longa | ✅ Nenhuma | ✅ Rápida (Web) |
| **Performance** | ✅ Ótima | ⚠️ Lenta | ✅ Ótima |
| **Produção** | ✅ Sim | ❌ Não | ✅ Sim |
| **Offline** | ✅ Sim | ✅ Sim | ❌ Não |
| **Custo** | Gratuito | Gratuito | Gratuito |
| **Configuração** | Média | Fácil | Fácil |

---

**Escolha a melhor para sua situação e comece! ✨**
