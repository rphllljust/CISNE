# 🚀 GUIA PRÁTICO - INICIAR APLICAÇÃO BRASIL TRUCK

## ❌ PROBLEMA ENCONTRADO

PostgreSQL não está rodando na porta 5432.

---

## ✅ SOLUÇÃO - INICIAR POSTGRESQL

### **Opção 1: Docker (Recomendado)**

**Windows (PowerShell como Admin):**
```powershell
docker run -d `
  --name postgres-oms `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=oms `
  -p 5432:5432 `
  postgres:15-alpine
```

**Aguarde 10-15 segundos para inicializar.**

### **Opção 2: PostgreSQL Instalado Localmente**

**Windows:**
1. Abra `services.msc`
2. Procure por "postgresql"
3. Clique direito → Start

**Mac:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
```

---

## 🎯 PASSO-A-PASSO PARA INICIAR

### **PASSO 1: Abra Terminal 1**

```bash
cd c:\Users\rphll\Desktop\OS

npm run start:dev
```

**Deve exibir:**
```
[Nest] NestJS Application
[NestFactory] Instantiating NestApplication
...
✓ Listening on port 3000
✓ Server running on http://localhost:3000
```

### **PASSO 2: (Opcional) Abra Terminal 2 para Gerar Dados**

```bash
cd c:\Users\rphll\Desktop\OS

npm run prisma:seed:50clients
```

**Deve exibir:**
```
✓ 50 clients created
✓ Seed completed
```

### **PASSO 3: Abrir no Navegador**

```
http://localhost:3000
```

Você verá a página de login. ✅

### **PASSO 4: (Rede Local) Obter seu IP**

Em outro terminal PowerShell:
```powershell
ipconfig | findstr "IPv4"
```

Resultado exemplo:
```
IPv4 Address. . . . . . . . . . : 192.168.1.100
```

### **PASSO 5: Acessar de Outro PC**

Outro computador na mesma rede:
```
http://192.168.1.100:3000
```

---

## 📋 SEQUÊNCIA COMPLETA

```
1️⃣  INICIAR POSTGRESQL
    Windows: docker run ... (ver acima)
    Ou: services.msc → postgresql → Start
    ⏳ Aguarde 15 segundos

2️⃣  TERMINAL 1: INICIAR APP
    npm run start:dev
    ✅ Aguarde mensagem "Listening on port 3000"

3️⃣  TERMINAL 2: GERAR DADOS (OPCIONAL)
    npm run prisma:seed:50clients
    ✅ Aguarde "Seed completed"

4️⃣  NAVEGADOR: ACESSAR
    http://localhost:3000
    ✅ Página de login carrega

5️⃣  REDE LOCAL: OBTER IP
    ipconfig | findstr "IPv4"
    ✅ Anote o IP (ex: 192.168.1.100)

6️⃣  OUTRO PC: ACESSAR
    http://192.168.1.100:3000
    ✅ Login funciona de outro PC
```

---

## 🔧 SE ALGO DER ERRO

### PostgreSQL não inicia
```bash
# Verificar containers
docker ps -a

# Se existir, remover e recriar
docker rm postgres-oms
docker run -d --name postgres-oms ... (ver acima)
```

### Porta 5432 ocupada
```bash
# Encontrar quem está usando
netstat -ano | findstr 5432

# Matar processo (Windows)
taskkill /PID <PID> /F
```

### npm run start:dev não funciona
```bash
# Reinstalar tudo
rm -rf node_modules
npm install
npm run prisma:generate
npm run start:dev
```

### Erro de permissão de pasta
```bash
# Mudar proprietário
icacls "c:\Users\rphll\Desktop\OS" /grant:r "%USERNAME%:F" /t
```

---

## ⏱️ TEMPO TOTAL

| O quê | Tempo |
|------|-------|
| Iniciar PostgreSQL | 2-3 min |
| npm run start:dev | 10-20 seg |
| Abrir navegador | 5 seg |
| Gerar dados (opcional) | 1-2 min |
| **TOTAL** | **5-10 min** |

---

## 📱 ACESSAR NA REDE LOCAL

Após iniciar `npm run start:dev`:

### Obter IP:
```powershell
ipconfig
# Procurar por IPv4 que não seja 127.0.0.1
```

### Acessar:
```
http://192.168.1.100:3000  (seu IP aqui)
```

### Se não funcionar:
1. Testar: `ping 192.168.1.100`
2. Verificar Firewall Windows (permitir Node.js)
3. Verificar se estão na mesma WiFi/LAN

---

## ✅ CHECKLIST

- [ ] PostgreSQL rodando
- [ ] Terminal 1: npm run start:dev
- [ ] Aguardar "Listening on port 3000"
- [ ] Abrir http://localhost:3000
- [ ] Página de login aparece
- [ ] (Opcional) Terminal 2: npm run prisma:seed:50clients
- [ ] Obter IP com ipconfig
- [ ] Acessar de outro PC com http://[IP]:3000

---

**RESUMO:**
1. Iniciar PostgreSQL
2. `npm run start:dev`
3. Abrir http://localhost:3000
4. Pronto! ✅

