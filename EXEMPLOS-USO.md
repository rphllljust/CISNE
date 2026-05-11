# Exemplos de Uso - NFS-e API

## 1. Buscar Códigos de Serviço

### Listar todos os códigos
```bash
curl -X GET http://localhost:3000/nfse/codigos-servicos
```

**Resposta:**
```json
[
  {
    "codigo": "0101",
    "descricao": "Análise e desenvolvimento de sistemas",
    "aliquotaPadrao": 0.05
  },
  {
    "codigo": "0102",
    "descricao": "Consultoria em tecnologia da informação",
    "aliquotaPadrao": 0.05
  }
]
```

### Buscar por descrição
```bash
curl -X GET "http://localhost:3000/nfse/codigos-servicos?search=análise"
```

### Obter código específico
```bash
curl -X GET http://localhost:3000/nfse/codigos-servicos/0101
```

**Resposta:**
```json
{
  "codigo": "0101",
  "descricao": "Análise e desenvolvimento de sistemas",
  "aliquotaPadrao": 0.05
}
```

---

## 2. Emitir NFS-e

### Request
```bash
curl -X POST http://localhost:3000/nfse/emitir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "serviceOrderId": "uuid-da-so",
    "invoiceId": "uuid-da-invoice"
  }'
```

### Fluxo Completo
1. Sistema busca Service Order e Invoice no banco
2. Valida se SO.status === "COMPLETED"
3. Obtém código de serviço (padrão 0101)
4. Gera XML ABRASF com dados da empresa
5. Assina XML com certificado A1
6. Envia SOAP para SEFAZ (enviarRps)
7. Recebe numero da NFS-e
8. Cria registro no banco (status = EMITIDA)
9. Retorna dados ao cliente

### Response (Sucesso)
```json
{
  "id": "nfse-uuid",
  "numero": 123456,
  "serie": "1",
  "codigoVerificacao": "A1B2C3D4",
  "statusNfse": "EMITIDA",
  "urlNfse": "https://sp.prefeitura/nfse/123456/A1B2C3D4",
  "dataEmissao": "2026-04-23T10:30:00Z",
  "valorServicos": 1000.00,
  "aliquotaIss": 0.05,
  "valorIss": 50.00
}
```

### Possíveis Erros

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Service Order deve estar COMPLETED para emitir NFS-e",
  "error": "BadRequestException"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Service Order não encontrada",
  "error": "NotFoundException"
}
```

---

## 3. Consultar Status da NFS-e

### Request
```bash
curl -X GET "http://localhost:3000/nfse/consultar/nfse-uuid" \
  -H "Authorization: Bearer TOKEN"
```

### Response
```json
{
  "sucesso": true,
  "numeroRps": 1,
  "serieRps": "1",
  "numeroNfse": 123456,
  "codigoVerificacao": "A1B2C3D4",
  "dataEmissao": "2026-04-23T10:30:00Z",
  "url": "https://sp.prefeitura/nfse/123456/A1B2C3D4",
  "mensagens": ["NFS-e localizada"]
}
```

---

## 4. Cancelar NFS-e

### Request
```bash
curl -X DELETE "http://localhost:3000/nfse/nfse-uuid?motivo=Dados%20incorretos%20no%20RPS" \
  -H "Authorization: Bearer TOKEN"
```

### Validações
- Motivo mínimo 10 caracteres
- NFS-e não pode estar em status RASCUNHO
- NFS-e não pode estar já CANCELADA
- Requer justificativa legal

### Response (Sucesso)
```json
{
  "sucesso": true,
  "numeroNfse": 123456,
  "mensagens": ["NFS-e cancelada com sucesso"]
}
```

### Response (Erro)
```json
{
  "sucesso": false,
  "erros": ["Motivo do cancelamento obrigatório (min 10 caracteres)"]
}
```

---

## 5. Emitir Carta de Correção

Máximo 5 cartas de correção por NFS-e

### Request
```bash
curl -X POST "http://localhost:3000/nfse/nfse-uuid/correcao" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "sequencia": 1,
    "textoCorrecao": "Corrigir valor do ISS de 50 para 60"
  }'
```

### Response
```json
{
  "sucesso": true,
  "numeroNfse": 123456,
  "codigoVerificacao": "CC1",
  "mensagens": ["Carta de Correção nº1 emitida"]
}
```

---

## 6. Usar com JavaScript/TypeScript

### Exemplo com Axios
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Emitir NFS-e
async function emitirNfse(serviceOrderId: string, invoiceId: string) {
  try {
    const response = await apiClient.post('/nfse/emitir', {
      serviceOrderId,
      invoiceId
    });

    console.log('NFS-e emitida:', response.data.numero);
    return response.data;
  } catch (error) {
    console.error('Erro ao emitir NFS-e:', error.response?.data);
    throw error;
  }
}

// Buscar códigos
async function buscarCodigos(termo?: string) {
  const params = termo ? { search: termo } : {};
  const response = await apiClient.get('/nfse/codigos-servicos', { params });
  return response.data;
}

// Consultar status
async function consultarStatus(nfseId: string) {
  const response = await apiClient.get(`/nfse/consultar/${nfseId}`);
  return response.data;
}

// Cancelar NFS-e
async function cancelarNfse(nfseId: string, motivo: string) {
  const response = await apiClient.delete(`/nfse/${nfseId}`, {
    params: { motivo }
  });
  return response.data;
}
```

### Exemplo com React
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function NfseEmitir({ serviceOrderId, invoiceId }) {
  const mutation = useMutation({
    mutationFn: ({ soId, invId }) =>
      fetch('/api/nfse/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrderId: soId,
          invoiceId: invId
        })
      }).then(r => r.json())
  });

  return (
    <button onClick={() => mutation.mutate({ soId: serviceOrderId, invId: invoiceId })}>
      Emitir NFS-e
    </button>
  );
}
```

---

## 7. Fluxos de Negócio Completos

### Fluxo 1: Emissão Manual
```
1. Usuário clica em "Emitir NFS-e"
2. Sistema valida Service Order (status = COMPLETED)
3. Sistema gera XML com código 0101
4. Sistema assina XML com certificado A1
5. Sistema envia para SEFAZ via SOAP
6. SEFAZ retorna número da NFS-e
7. Sistema salva no banco
8. Usuário recebe número e link de acesso
9. Sistema registra auditoria
```

### Fluxo 2: Consulta de Status
```
1. Usuário clica em "Verificar Status"
2. Sistema busca NFS-e no banco
3. Sistema consulta SEFAZ via SOAP (consultarNfse)
4. SEFAZ retorna status atual
5. Sistema atualiza status local
6. Usuário vê resultado na tela
```

### Fluxo 3: Cancelamento
```
1. Usuário fornece motivo (min 10 caracteres)
2. Sistema valida permissão (auditoria)
3. Sistema gera XML de cancelamento
4. Sistema assina XML com certificado
5. Sistema envia para SEFAZ via SOAP
6. SEFAZ confirma cancelamento
7. Sistema atualiza status = CANCELADA
8. Sistema registra auditoria com motivo
9. Usuário confirma sucesso
```

### Fluxo 4: Faturamento Recorrente (CRON)
```
[02:00 AM diariamente]
1. Sistema busca contratos com status = ACTIVE
2. Para cada contrato com nextBillingDate <= hoje:
   a. Cria Service Order automaticamente
   b. Marca SO como COMPLETED
   c. Cria Invoice
   d. Emite NFS-e (se generateNfse = true)
   e. Calcula próximo faturamento
   f. Atualiza Contract.nextBillingDate
   g. Registra auditoria
3. Sistema finaliza
```

---

## 8. Códigos de Serviço Mais Comuns

| Código | Descrição | Uso Comum |
|--------|-----------|----------|
| 0101   | Análise e desenvolvimento de sistemas | Desenvolvimento de software |
| 0102   | Consultoria em tecnologia da informação | Consultoria IT |
| 0103   | Suporte técnico em tecnologia da informação | Suporte técnico |
| 0104   | Manutenção e suporte em TI | Manutenção contínua |
| 0605   | Serviços de auditoria | Auditoria contábil |
| 0604   | Serviços contábeis | Contabilidade |
| 0606   | Serviços de pesquisa e desenvolvimento | P&D |

---

## 9. Tratamento de Erros Comuns

### Erro: XML Inválido
```
GET /nfse/emitir com SO não COMPLETED

Resposta:
{
  "statusCode": 400,
  "message": "Service Order deve estar COMPLETED para emitir NFS-e"
}
```

### Erro: SEFAZ Indisponível
```
Resposta:
{
  "statusCode": 503,
  "message": "SEFAZ indisponível no momento"
}
```

### Erro: Certificado Inválido
```
Resposta:
{
  "statusCode": 500,
  "message": "Falha ao assinar NFS-e com certificado"
}
```

---

## 10. Curl Examples

### Test Connection
```bash
curl -X GET http://localhost:3000/health
```

### List All Codes
```bash
curl -X GET http://localhost:3000/nfse/codigos-servicos | jq '.[0:5]'
```

### Search by Code
```bash
curl -X GET "http://localhost:3000/nfse/codigos-servicos/0101" | jq .
```

### Count Total Codes
```bash
curl -X GET http://localhost:3000/nfse/codigos-servicos | jq 'length'
```

---

## Padrão de Resposta

Todos os endpoints seguem o padrão:

**Sucesso (200):**
```json
{
  "id": "...",
  "status": "...",
  "data": { ... }
}
```

**Erro (400+):**
```json
{
  "statusCode": 400,
  "message": "Descrição do erro",
  "error": "NomeDaExcecao"
}
```

---

**Última atualização:** 2026-04-23  
**Versão API:** 2.0
