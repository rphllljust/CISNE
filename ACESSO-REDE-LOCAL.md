# 🌐 GUIA COMPLETO - ACESSAR APLICAÇÃO NA REDE LOCAL

## 📋 Sumário Rápido

| Item | Windows | Mac/Linux |
|------|---------|-----------|
| **Script** | `scripts/start-local-network.ps1` | `scripts/start-local-network.sh` |
| **Comando** | Ver seção 2 | Ver seção 2 |
| **Tempo** | 2-5 minutos | 2-5 minutos |

---

## 🚀 OPÇÃO 1: USAR SCRIPT AUTOMÁTICO (RECOMENDADO)

### Windows (PowerShell)

```powershell
# 1. Abrir PowerShell como Administrador
# 2. Ir para diretório do projeto
cd C:\Users\rphll\Desktop\OS

# 3. Permitir scripts (se necessário)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 4. Executar script
.\scripts\start-local-network.ps1
```

**O script fará:**
- ✅ Detectar IP da rede local automaticamente
- ✅ Configurar .env
- ✅ Iniciar PostgreSQL (se necessário)
- ✅ Instalar dependências
- ✅ Aplicar migrations
- ✅ Iniciar aplicação na porta 3000
- ✅ Exibir URLs de acesso

### Mac/Linux (Bash)

```bash
# 1. Ir para diretório do projeto
cd ~/Desktop/OS

# 2. Dar permissão de execução
chmod +x scripts/start-local-network.sh

# 3. Executar script
./scripts/start-local-network.sh
```

---

## 🔧 OPÇÃO 2: MANUAL (PASSO-A-PASSO)

### Passo 1: Configurar Arquivo .env

```bash
# Copiar template
cp .env.example .env

# Editar .env e atualizar:
API_HOST=0.0.0.0
API_PORT=3000
FRONTEND_URL=http://SEU_IP:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oms
```

### Passo 2: Obter IP da Rede Local

**Windows (PowerShell):**
```powershell
ipconfig
# Procurar por "IPv4 Address" que NÃO seja 127.0.0.1
# Ex: 192.168.1.100
```

**Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Ex: inet 192.168.1.100
```

**Linux:**
```bash
hostname -I
# Ex: 192.168.1.100
```

### Passo 3: Iniciar PostgreSQL

**Com Docker:**
```bash
docker run -d \
  --name postgres-oms \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=oms \
  -p 5432:5432 \
  postgres:15-alpine
```

**Ou manualmente:**
```bash
# Certifique-se que PostgreSQL está rodando
# Windows: Services → PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### Passo 4: Instalar Dependências

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
```

### Passo 5: Iniciar Aplicação

```bash
npm run start:dev
```

A aplicação estará disponível em:
- **Localhost**: http://localhost:3000
- **Rede Local**: http://192.168.1.100:3000 (seu IP)

---

## 💻 ACESSAR DE OUTRO COMPUTADOR

### Verificar Conectividade

```bash
# Testar ping para o servidor
ping 192.168.1.100

# Se funcionar:
# Reply from 192.168.1.100: bytes=32 time<1ms TTL=64 ✅
```

### Abrir no Navegador

```
http://192.168.1.100:3000
```

**Esperado:**
- ✅ Aplicação carrega
- ✅ Login disponível
- ✅ Pode fazer requisições para API

### Se não funcionar

1. **Verificar Firewall do Windows:**
   ```powershell
   # Abrir Windows Defender Firewall
   # → Permitir app através do firewall
   # → Permitir node.exe (ou npm)
   ```

2. **Verificar Firewall do Mac:**
   ```bash
   # System Preferences → Security & Privacy → Firewall
   # Permitir conexões de entrada
   ```

3. **Verificar Linux:**
   ```bash
   sudo ufw allow 3000/tcp
   ```

4. **Testes de Conectividade:**
   ```bash
   # Testar if porta está aberta
   netstat -an | grep 3000
   
   # Testar acesso remoto
   curl http://192.168.1.100:3000
   ```

---

## 📱 ACESSAR DE DISPOSITIVOS MÓVEIS

### Mesma Rede WiFi

1. Encontre o IP do PC (ex: `192.168.1.100`)
2. Abra no navegador do celular:
   ```
   http://192.168.1.100:3000
   ```

### Diferentes Redes (Use Ngrok/Tunneling)

```bash
# Instalar ngrok
npm install -g ngrok

# Criar túnel
ngrok http 3000

# URL pública será exibida
# Ex: https://abc123.ngrok.io
```

Então acesse em qualquer lugar:
```
https://abc123.ngrok.io
```

---

## 🔍 DIAGNOSTICAR PROBLEMAS

### Porta Já em Uso

```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000

# Matar processo
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 <PID>
```

### Banco de Dados Não Conecta

```bash
# Verificar se PostgreSQL está rodando
psql -U postgres -d oms -h localhost

# Se não conectar:
docker logs postgres-oms  # Ver logs
docker restart postgres-oms  # Reiniciar
```

### Node Não Inicia

```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install

# Tentar novamente
npm run start:dev
```

### Aplicação Lenta

```bash
# Aumentar memória Node
$env:NODE_OPTIONS = '--max-old-space-size=4096'
npm run start:dev
```

---

## 🎯 VERIFICAR CONFIGURAÇÃO

### Após Iniciar, Validar:

1. **API Respondendo:**
   ```bash
   curl http://localhost:3000/api
   ```
   Esperado: Respostas JSON/Swagger

2. **Banco de Dados Conectado:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Esperado: Status 200 OK

3. **Frontend Carregando:**
   ```
   http://localhost:3000
   ```
   Esperado: Página de login

4. **Desde Outro PC:**
   ```
   http://192.168.1.100:3000
   ```
   Esperado: Mesma página de login

---

## 🛠️ CONFIGURAÇÃO AVANÇADA

### Usar Porta Diferente

```bash
# No .env
API_PORT=8080
FRONTEND_URL=http://192.168.1.100:8080
```

### Ativar HTTPS (Self-signed)

```bash
# Gerar certificado
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Configurar em main.ts
const httpsOptions = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
};
app.listen(3000, '0.0.0.0', () => {
  // https://192.168.1.100:3000
});
```

### Usar IP Específico (não 0.0.0.0)

```bash
# No .env
API_HOST=192.168.1.100  # Seu IP específico
```

---

## 📊 TABELA DE IPs COMUNS

| Rede | Intervalo | Exemplo |
|------|-----------|---------|
| WiFi Doméstica | 192.168.1.x | 192.168.1.100 |
| WiFi Doméstica | 192.168.0.x | 192.168.0.50 |
| Corporativa | 10.0.x.x | 10.0.1.50 |
| Móvel (Hotspot) | 172.20.x.x | 172.20.0.1 |

---

## ✅ CHECKLIST

Antes de considerar pronto:

- [ ] Script executado com sucesso
- [ ] IP da rede exibido corretamente
- [ ] PostgreSQL iniciado
- [ ] Dependências instaladas
- [ ] Migrations aplicadas
- [ ] Aplicação rodando (npm run start:dev)
- [ ] Acesso local: http://localhost:3000 ✅
- [ ] Acesso pela rede: http://192.168.x.x:3000 ✅
- [ ] Firewall permitindo porta 3000
- [ ] Outro PC consegue acessar

---

## 🔐 SEGURANÇA

### Credenciais Padrão (ALTERAR!)

```bash
# .env
JWT_SECRET=change-me-in-production
POSTGRES_PASSWORD=change-me-in-production
```

### Ambiente Local

```bash
# .env
NODE_ENV=development
LOG_LEVEL=debug
```

### Antes de Produção

```bash
# .env
NODE_ENV=production
LOG_LEVEL=error
JWT_SECRET=<gerar-secret-forte>
API_HOST=seu-dominio.com.br
```

---

## 📞 COMANDOS RÁPIDOS

```bash
# Iniciar com script (RECOMENDADO)
.\scripts\start-local-network.ps1  # Windows
./scripts/start-local-network.sh   # Mac/Linux

# Iniciar manual
npm run start:dev

# Ver logs
npm run start:dev 2>&1 | tee app.log

# Parar aplicação
Ctrl+C

# Resetar banco (cuidado!)
npm run prisma:migrate reset

# Gerar dados de teste
npm run data:populate:all

# Seed com 50 clientes
npm run prisma:seed:50clients
```

---

## 🎓 PRÓXIMOS PASSOS

Após subir na rede local:

1. ✅ Verificar acesso de diferentes PCs
2. ✅ Testar API (http://192.168.1.100:3000/api)
3. ✅ Fazer login com usuário padrão
4. ✅ Gerar dados de teste (seed)
5. ✅ Validar funcionalidades

---

## 📚 REFERÊNCIAS

- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Docker Docs](https://docs.docker.com/)

---

**Status**: ✅ Pronto para rede local  
**Última atualização**: Maio/2025  
**Versão**: 1.0
