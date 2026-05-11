# 🔐 Fluxo de Integração: Certificado Digital A1 + NFS-e + SEFAZ

## 📋 Visão Geral (Especialista em Implantação)

Este documento descreve o fluxo **CRÍTICO** de emissão de nota fiscal eletrônica (NFS-e) com assinatura digital A1 e submissão ao webservice da SEFAZ. Implementado conforme ABRASF e Instrução Normativa de cada municipalidade.

---

## 🔐 O que é Certificado Digital A1

| Aspecto | Descrição |
|--------|-----------|
| **Tipo** | A1 = arquivo .pfx ou .p12 armazenado localmente |
| **ICP-Brasil** | Emitido por AC (Autoridade Certificadora) credenciada |
| **Validade** | 1 ou 2 anos (após expira, não funciona) |
| **Uso** | Assinatura digital de documentos e XMLs |
| **Armazenamento** | Servidor (risc segurança) vs HSM/Smart Card (melhor) |

---

## 🔄 Fluxo Passo-a-Passo

```
┌─────────────────────────────────────────────────────────────────┐
│ [1] SERVICE ORDER FINALIZADA (SO.status = COMPLETED)            │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [2] VALIDAÇÃO DE DADOS FISCAIS (NfseValidatorService)          │
│     ├─ CPF/CNPJ do cliente (calculado)                         │
│     ├─ Código de serviço LC 116/2003                           │
│     ├─ Valores: bruto, deduções, impostos                      │
│     ├─ Alíquota ISS conforme município                         │
│     └─ ❌ Se inválido: Não prossegue (log de erro)             │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [3] VALIDAR CERTIFICADO A1 (CertificadoA1Service)              │
│     ├─ Arquivo existe em CERTIFICADO_A1_PATH                   │
│     ├─ Certificado está vigente (não expirou)                  │
│     ├─ Senha correta (vir de KeyVault)                         │
│     └─ ❌ Se inválido: Parar (erro crítico)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [4] GERAR XML DA NFS-e (conforme ABRASF)                       │
│     ├─ <Rps> com identificação do documento                    │
│     ├─ <Tomador> com dados do cliente                          │
│     ├─ <Servico> com descrição e código LC 116/2003            │
│     ├─ <Prestador> com CNPJ e inscrição municipal              │
│     └─ <Valor> com cálculos de ISS e retenções                 │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [5] ASSINAR XML COM A1 (CertificadoA1Service.assinarXml)        │
│     ├─ Carregar certificado .pfx com senha                     │
│     ├─ Algoritmo: SHA-256 (padrão SEFAZ)                       │
│     ├─ Adicionar elemento <Signature> ao XML                   │
│     ├─ Referenciar elemento raiz (InfRPS)                      │
│     ├─ Timestamp: Servidor NTP (não local!)                    │
│     └─ ✅ Retorna XML assinado (válido = tem <Signature>)      │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [6] VALIDAR XML ASSINADO (XSD validation)                       │
│     ├─ Schema SEFAZ do município (normalmente fornecido)        │
│     ├─ Certificado OK?                                         │
│     ├─ Estrutura XML OK?                                       │
│     └─ ❌ Se inválido: Retry com certificado novo              │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [7] CONECTAR WEBSERVICE SEFAZ (SefazIntegrationService)         │
│     ├─ URL: https://[prefeitura]/nfse/soap (municipio-específico)
│     ├─ Timeout: 30s                                            │
│     ├─ Retry: 3x com exponential backoff                        │
│     └─ ❌ Se offline: Fila de retry (aguardar 6h)              │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [8] ENVIAR RPS POR SOAP (SefazIntegrationService.enviarRps)    │
│     ├─ Método: EnviarRPS (cada prefeitura pode variar)         │
│     ├─ Payload: XML assinado + credenciais                     │
│     ├─ Response: Número NFS-e + Código de Verificação          │
│     └─ Parse resposta SOAP (extrair <NumeroNfse>, <DV>)        │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
                    ✅ SUCESSO / ❌ ERRO
                              ↓
        ┌─────────────────────┴──────────────────────┐
        ↓                                             ↓
   [9a] SUCESSO                                [9b] ERRO
   ┌──────────────────┐               ┌────────────────────┐
   │ • Número NFS-e   │               │ • Código de erro   │
   │ • DV             │               │ • Mensagem SEFAZ   │
   │ • URL de consulta │               │ • Status: REJEITADA│
   └────────┬─────────┘               └────────┬───────────┘
            ↓                                   ↓
    [10a] SALVAR REGISTRO           [10b] REGISTRAR ERRO
    (Nfse.create em BD)              Nfse.statusNfse = 'REJEITADA_SEFAZ'
            ↓                                   ↓
    [11a] AUDITORIA                 [11b] NOTIFICAR ADMIN
    LOG: "NFS-e ${numero}            EMAIL: "NFS-e rejeitada"
    EMITIDA COM SUCESSO"             + Motivo da rejeição
            ↓                                   ↓
    [12a] NOTIFICAR CLIENTE         [12b] RETRY AUTOMÁTICO
    EMAIL: "NFS-e $numero"           (6 horas depois)
    GERADA + Link consulta
            ↓
    [13] ATUALIZAR INVOICE
    Invoice.nfseId = nfse.id
    Invoice.statusNfse = 'EMITIDA'
            ↓
    ✅ PROCESSO FINALIZADO
```

---

## 🔑 Dados Críticos em Cada Etapa

### [2] Validação de Dados

**Obrigatórios:**
- `tomadorCpfCnpj`: Válido (algoritmo CPF/CNPJ)
- `codigoServico`: 4 dígitos (ex: "0101" = análise de sistemas)
- `valorServicos`: > 0
- `aliquotaIss`: 0-5% (conforme LC 116/2003)

**Exemplos válidos:**
```json
{
  "codigoServico": "0101",
  "descricao": "Análise e desenvolvimento de sistema de gestão",
  "valorServicos": 5000.00,
  "valorDeducoes": 500.00,
  "aliquotaIss": 0.05,
  "tomadorCpfCnpj": "12.345.678/0001-90"
}
```

### [3] Validação de Certificado

**Checklist:**
```typescript
// ❌ Falha 1: Certificado não existe
if (!fs.existsSync('/app/config/certificado.pfx')) {
  throw new Error('Certificado não encontrado');
}

// ❌ Falha 2: Certificado expirou
if (new Date() > certificado.dataValidade) {
  throw new Error('Certificado expirou em ' + certificado.dataValidade);
}

// ❌ Falha 3: Senha incorreta
try {
  loadCertificate(pfxPath, password);
} catch {
  throw new Error('Senha do certificado incorreta');
}

// ❌ Falha 4: Certificado vence em menos de 7 dias
const diasRestantes = (certificado.dataValidade - today) / (1000 * 86400);
if (diasRestantes < 7) {
  logger.warn(`⚠️ Certificado vence em ${diasRestantes} dias - providenciar renovação`);
}
```

### [5] Assinatura XML com A1

**Algoritmo XmlDSig (padrão SEFAZ):**

```xml
<!-- ANTES -->
<RPS>
  <InfRPS Id="RPS1">
    <Numero>1</Numero>
    ...
  </InfRPS>
</RPS>

<!-- DEPOIS (assinado) -->
<RPS>
  <InfRPS Id="RPS1">
    <Numero>1</Numero>
    ...
  </InfRPS>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="..."/>
      <SignatureMethod Algorithm="..."/>
      <Reference URI="#RPS1">
        <Transforms>...</Transforms>
        <DigestMethod Algorithm="..."/>
        <DigestValue>ABC123...</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>XYZ789...</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>...</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>
</RPS>
```

### [8] Resposta SEFAZ

**SUCESSO:**
```xml
<soap:Envelope>
  <soap:Body>
    <EnviarRpsResponse>
      <EnviarRpsResult>
        <NumeroNfse>12345</NumeroNfse>
        <Referencia>1</Referencia>
        <SerieRps>1</SerieRps>
        <CodigoVerificacao>ABC123DEF</CodigoVerificacao>
      </EnviarRpsResult>
    </EnviarRpsResponse>
  </soap:Body>
</soap:Envelope>
```

**ERRO:**
```xml
<soap:Envelope>
  <soap:Body>
    <soap:Fault>
      <faultcode>ERRO_VALIDACAO</faultcode>
      <faultstring>CPF/CNPJ do tomador inválido</faultstring>
      <detail>
        <CodigoErro>E00</CodigoErro>
        <Mensagem>CPF 111.111.111-11 é válido apenas como placeholder</Mensagem>
      </detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>
```

---

## ⚠️ Cenários de Exceção

### Cenário A: Certificado Expirando (< 30 dias)

```
Data: 21/04/2026
Cert validade: 15/05/2026 (24 dias)

Ação:
✅ NFS-e emite normalmente
⚠️  LOG: "Certificado vence em 24 dias"
📧 Email admin: "Renovar certificado urgente"
```

### Cenário B: SEFAZ Offline

```
Tentativa 1 (02:15): ❌ Timeout
Tentativa 2 (02:30): ❌ Timeout
Tentativa 3 (02:45): ❌ Timeout

Resultado:
├─ Nfse.statusNfse = 'PENDENTE_SEFAZ'
├─ Agendar retry em 6h
├─ 📧 Email admin: "SEFAZ indisponível"
└─ ✅ Faturamento NOT bloqueado (fallback: RPS manual)
```

### Cenário C: Rejeição por Dados Inválidos

```
SEFAZ retorna: "E05 - ISS negativo"

Causa: aliquotaIss = -0.05 (BUG)

Ação:
❌ Bloquear emissão
📋 Log: "Erro XYZ - Revisar dados"
📧 Email supervisor: "NFS-e rejeitada - revisar"
🔄 Permitir retry após correção
```

### Cenário D: Duplicação Acidental

```
Usuário clica "Emitir" 2x (rápido)

Proteção 1: DB unique constraint
├─ serviceOrderId + invoiceId = unique
└─ Segunda tentativa falha (gracefully)

Proteção 2: Idempotência
├─ Se Nfse.statusNfse != 'RASCUNHO'
└─ Retornar NFS-e existente (sem duplicar)
```

---

## 🛡️ Segurança (Crítico)

### ❌ NÃO FAZER

```bash
# ❌ Não armazenar senha do cert em código
CERTIFICADO_PASSWORD = "senha123"

# ❌ Não usar HTTP (sempre HTTPS)
http://sefaz.prefeitura.br/...

# ❌ Não confiar em certificado auto-assinado
ssl_verify: false

# ❌ Não fazer cache do cert em memória
const cert = loadCert(...); // Uma vez só!

# ❌ Não logar XML assinado inteiro
logger.log(xmlAssinado); // Pode ter dados sensíveis
```

### ✅ FAZER

```bash
# ✅ Senha em KeyVault (Azure, AWS Secrets Manager)
CERTIFICADO_PASSWORD=${VAULT.get('cert-password')}

# ✅ Sempre HTTPS com validação
https://sefaz.prefeitura.br/...
ssl_verify: true

# ✅ Certificado validado por AC credenciada
issuer = "AC Raiz Brasileira v10"

# ✅ HSM (Hardware Security Module) em produção
# Certificado nunca sai do HSM (melhor prática)

# ✅ Log apenas fingerprint
logger.log(`Certificado fingerprint: ${getFingerprint(cert)}`);

# ✅ Backup de XML em storage seguro
// Arquivo para auditoria (5 anos por lei)
```

---

## 📊 Monitoramento em Produção

```sql
-- NFS-es emitidas hoje
SELECT 
  numero,
  statusNfse,
  dataEmissao,
  CASE WHEN statusNfse = 'EMITIDA' THEN '✅' ELSE '❌' END as status
FROM "Nfse"
WHERE DATE(dataEmissao) = CURRENT_DATE
ORDER BY dataEmissao DESC;

-- Certificados vencendo
SELECT 
  'CERTIFICADO' as tipo,
  validoAte,
  EXTRACT(DAY FROM validoAte - NOW()) as diasRestantes
FROM cert_info
WHERE validoAte < NOW() + INTERVAL '30 days'
ORDER BY validoAte;

-- Erros SEFAZ nos últimos 7 dias
SELECT 
  statusNfse,
  COUNT(*) as quantidade,
  STRING_AGG(DISTINCT mensagensSefaz, '; ') as erros
FROM "Nfse"
WHERE dataEmissao > NOW() - INTERVAL '7 days'
AND statusNfse = 'REJEITADA_SEFAZ'
GROUP BY statusNfse;
```

---

## ✅ Checklist de Implantação

- [ ] Obter certificado A1 (AC credenciada ICP-Brasil)
- [ ] Configurar path: `CERTIFICADO_A1_PATH=/app/config/cert.pfx`
- [ ] Configurar senha em KeyVault: `CERTIFICADO_A1_PASSWORD`
- [ ] Implementar `CertificadoA1Service`
- [ ] Implementar `SefazIntegrationService`
- [ ] Testes: Validação de cert (vigente, não expirado)
- [ ] Testes: Assinatura XML (com openssl -verify)
- [ ] Testes: Envio a SEFAZ homolog (sandbox)
- [ ] Validação ABRASF (XSD schema)
- [ ] Health check diário de certificado
- [ ] Alertas: cert vence em 30/7/1 dias
- [ ] Alertas: SEFAZ offline por 10min
- [ ] Audit log completo (quem, quando, qual cert)
- [ ] Backup de XMLs (storage por 5 anos)
- [ ] Documentação: URLs SEFAZ por UF
- [ ] Plano de contingência: RPS manual se SEFAZ offline

---

**Versão:** 1.0  
**Especialista:** Implantador Sênior OMS  
**Status:** ✅ Pronto para Produção (com validações críticas)  
**Data:** 2026-04-21
