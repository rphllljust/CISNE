# OMS API (Operations Management System)

Plataforma backend corporativa para gestão completa de operações de serviços, construída com **NestJS + TypeScript + Prisma + PostgreSQL**, pronta para produção, escalável e preparada para integração com frontend moderno.

## 1. Visão Geral da Solução

A solução centraliza o ciclo operacional de serviços em uma única API:

- Autenticação com JWT + Refresh Token rotativo
- RBAC por perfil de negócio
- Gestão de usuários, clientes e ordens de serviço
- Fluxo robusto de status da OS com regras de transição
- Agendamento, check-in/check-out e histórico operacional
- Dashboard gerencial com KPIs e produtividade
- Auditoria imutável + histórico de login
- Notificações internas (com base para e-mail/SMS/WhatsApp)
- Documentação Swagger/OpenAPI
- Docker/Docker Compose
- Seeds iniciais para ambiente de desenvolvimento

## 2. Arquitetura Recomendada

Arquitetura modular com separação por camadas:

- `presentation`: controllers (entrada HTTP, validação, contrato REST)
- `application`: services e use-cases (regras de negócio)
- `domain`: entidades, interfaces, políticas de domínio
- `infrastructure`: repositórios Prisma e integrações técnicas

Padrões aplicados:

- SOLID
- Repository Pattern
- Use Case Pattern (casos críticos)
- Guardas para autenticação/autorização
- Filtro global de exceções
- Interceptor de logging
- Configuração centralizada por ambiente

## 3. Estrutura de Pastas

```txt
src/
  common/
    constants/
    decorators/
    dto/
    filters/
    guards/
    interceptors/
  config/
  infrastructure/
    prisma/
  modules/
    auth/
      application/
      domain/
      presentation/
      strategies/
    users/
      application/
      domain/
      infrastructure/
      presentation/
    clients/
      application/
      domain/
      infrastructure/
      presentation/
    service-orders/
      application/
      domain/
      infrastructure/
      presentation/
    dashboard/
    notifications/
    audit/
    health/
prisma/
  schema.prisma
  seed.ts
test/
```

## 4. Modelagem das Entidades (Prisma)

Entidades principais implementadas:

- `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
- `Client`, `Address`, `Contract`, `SLA`
- `ServiceCategory`, `ServiceType`
- `Team`, `TeamMember`
- `ServiceOrder`, `ServiceOrderStatusHistory`, `ServiceOrderChecklistItem`
- `Schedule`
- `Attachment`, `Comment`
- `Notification`
- `AuditLog`, `LoginHistory`, `RefreshToken`, `PasswordResetToken`

Modelagem inclui:

- Índices para busca/relatórios (`status`, `openedAt`, `slaDueAt`, `taxId`, etc.)
- Constraints de unicidade (`email`, `role`, `permission`, `orderNumber`, `contract.code`)
- Soft delete (`deletedAt`) em entidades de cadastro
- Rastreabilidade completa de transições e autoria

Arquivo: `prisma/schema.prisma`

## 5. Fluxo Operacional da Ordem de Serviço

Status suportados:

- `OPEN`
- `UNDER_ANALYSIS`
- `WAITING_APPROVAL`
- `SCHEDULED`
- `IN_TRANSIT`
- `IN_PROGRESS`
- `PAUSED`
- `WAITING_PARTS`
- `WAITING_CUSTOMER`
- `COMPLETED`
- `CANCELED`
- `REOPENED`

Política de transição implementada em:

- `src/modules/service-orders/domain/services/service-order-status-policy.service.ts`

Toda transição gera histórico imutável em `ServiceOrderStatusHistory` com:

- status de origem/destino
- usuário responsável
- timestamp
- motivo e metadata opcional

## 6. Endpoints Principais (API Base `/api/v1`)\n\n- Base URL local: `http://localhost:3000/api/v1`\n- Swagger local: `http://localhost:3000/docs`\n- Health local: `http://localhost:3000/api/v1/health`\n- Homologacao (exemplo): `https://hmg.seudominio.com/api/v1`\n- Swagger homologacao (exemplo): `https://hmg.seudominio.com/docs`\n- Producao (exemplo): `https://app.seudominio.com/api/v1`\n- Swagger producao (exemplo): `https://app.seudominio.com/docs`

### Health

- `GET /health`

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/logout`
- `GET /auth/me`

### Users

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Clients

- `POST /clients`
- `GET /clients`
- `GET /clients/:id`
- `PATCH /clients/:id`
- `DELETE /clients/:id`

### Service Orders

- `POST /service-orders`
- `GET /service-orders`
- `GET /service-orders/:id`
- `PATCH /service-orders/:id`
- `POST /service-orders/:id/transition-status`
- `POST /service-orders/:id/schedule`
- `POST /service-orders/:id/check-in`
- `POST /service-orders/:id/check-out`
- `GET /service-orders/meta/allowed-transitions/:status`

### Dashboard

- `GET /dashboard/overview`

### Notifications

- `GET /notifications/me`
- `PATCH /notifications/me/read`

### Audit

- `GET /audit-logs`
- `GET /audit-logs/login-history`

## 7. Exemplos Reais de Código (DTO/Service/Controller/Repository)

- DTO: `src/modules/service-orders/application/dto/create-service-order.dto.ts`
- Service: `src/modules/service-orders/application/services/service-orders.service.ts`
- Controller: `src/modules/service-orders/presentation/controllers/service-orders.controller.ts`
- Repository: `src/modules/service-orders/infrastructure/repositories/prisma-service-orders.repository.ts`

Outros exemplos:

- RBAC: `src/common/decorators/roles.decorator.ts` + `src/common/guards/roles.guard.ts`
- JWT guard público/privado: `src/common/guards/jwt-auth.guard.ts`
- Exceções padronizadas: `src/common/filters/http-exception.filter.ts`
- Logging estruturado: `nestjs-pino` em `src/app.module.ts`

## 8. Segurança Implementada

- Hash de senha com `bcrypt`
- JWT access token + refresh token rotativo
- Histórico de login (sucesso/falha)
- Recuperação de senha com token temporário
- RBAC por perfis
- Rate limiting (`@nestjs/throttler`)
- Helmet
- CORS configurável
- Validação global de payload com `ValidationPipe`
- Auditoria de ações críticas

## 9. Observabilidade e Qualidade

- Logs estruturados com `nestjs-pino`
- Interceptor global de requisição
- Testes unitários e e2e base
- ESLint + Prettier
- Swagger/OpenAPI em `/${SWAGGER_PATH:-docs}`

## 10. Como Executar

### Pré-requisitos

- Node.js 22+
- Docker + Docker Compose

### 1) Configurar ambiente

```bash
cp .env.example .env
```

### 2) Subir PostgreSQL com Docker

```bash
docker compose up -d postgres
```

### 3) Instalar dependências

```bash
npm install
```

### 4) Gerar client Prisma + migrar banco

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5) Popular dados iniciais

```bash
npm run prisma:seed
```

### 6) Rodar API

```bash
npm run start:dev
```

Swagger:

- `http://localhost:3000/docs`

## 11. Credenciais Seed (desenvolvimento)

- Nao existem senhas padrao fixas.
- Defina `SEED_ADMIN_PASSWORD` e `SEED_TECH_PASSWORD` antes de rodar seed.
- Politica minima: 12+ caracteres com maiuscula, minuscula, numero e simbolo.
- Usuarios de seed sao criados com `mustChangePassword=true`.

## 12. Scripts Disponíveis

- `npm run start:dev`
- `npm run build`
- `npm run start:prod`
- `npm run lint`
- `npm test`
- `npm run test:e2e`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## 13. DevOps

Arquivos prontos:

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`

Estrutura pronta para CI/CD:

- build
- lint
- testes
- migrations/seed
- deploy containerizado

## 14. Roadmap Recomendado (Próxima Iteração)

- módulo completo de anexos com storage S3/MinIO
- relatórios PDF/Excel com filtros avançados
- fila assíncrona para notificações transacionais
- trilha avançada de SLA com alertas proativos
- integração WhatsApp/SMS
- testes de integração com banco real e contrato OpenAPI


