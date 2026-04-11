# OMS Frontend (React + TypeScript)

Frontend corporativo do **Operations Management System (OMS)**, pronto para expansão em produção e integrado com backend Node.js/TypeScript (NestJS/Express) via API REST versionada.

## 1. Framework recomendado e justificativa

### Escolha: **React + TypeScript + Vite**

Escolha adotada para este OMS por equilíbrio entre velocidade de entrega e governança enterprise:

- Ecossistema maduro para painéis corporativos (roteamento, cache de API, formulários, testes)
- Flexibilidade arquitetural para domínios complexos (OS, agenda, auditoria, SLA)
- Alta produtividade de build com Vite
- Excelente integração com bibliotecas de observabilidade, monitoramento e CI/CD
- Curva de adoção ampla para times de front-end corporativo

### Estratégia de estado

- **TanStack Query** para estado remoto/cache de servidor
- **Zustand** para estado local de sessão/UI (auth, tema, sidebar)

Motivo: separar claramente **estado de negócio remoto** (API) de **estado de interface** (cliente), reduzindo acoplamento e bugs.

## 2. Arquitetura geral

Arquitetura orientada a domínios e escalável:

- `app`: bootstrap, providers globais, roteamento
- `shared`: infraestrutura reutilizável (api, ui base, utilitários, config)
- `entities`: tipos centrais de negócio
- `features`: casos de uso por domínio (auth, service-orders, dashboard, etc.)
- `widgets`: blocos compostos de interface (layout, gráficos)
- `pages`: telas de negócio

Princípios aplicados:

- TypeScript estrito
- Componentização com design system básico
- Rotas protegidas por autenticação e RBAC
- Interceptação HTTP com refresh token automático
- Tratamento padronizado de erros

## 3. Estrutura de pastas

```txt
src/
  app/
    providers/
    router/
    styles/
  shared/
    api/
    config/
    constants/
    lib/
    types/
    ui/
  entities/
    auth/
    client/
    dashboard/
    service-order/
    user/
  features/
    auth/
      api/
      model/
    dashboard/
      api/
    service-orders/
      api/
    clients/
      api/
    users/
      api/
    notifications/
      api/
    audit/
      api/
  widgets/
    layout/
    navigation/
    charts/
  pages/
    auth/
    dashboard/
    service-orders/
    clients/
    users/
    schedules/
    reports/
    notifications/
    audit/
    settings/
```

## 4. Módulos e páginas principais

- **Autenticação**
  - `/login`
  - `/forgot-password`
  - `/reset-password`
- **Dashboard**
  - `/`
- **Ordens de Serviço**
  - `/service-orders`
  - `/service-orders/new`
  - `/service-orders/:id`
- **Clientes**
  - `/clients`
  - `/clients/:id`
- **Usuários e Equipes**
  - `/users`
- **Agenda Operacional**
  - `/schedules`
- **Relatórios**
  - `/reports`
- **Notificações**
  - `/notifications`
- **Auditoria**
  - `/audit`
- **Configurações**
  - `/settings`

## 5. Layout corporativo

Implementado em `widgets/layout`:

- Sidebar com menu por perfil
- Topbar com dados do usuário e alternância claro/escuro
- Área de conteúdo com páginas operacionais
- Comportamento responsivo para desktop/tablet/mobile

## 6. Estratégia de autenticação e permissões

Fluxo implementado:

1. Login (`/auth/login`) retorna `accessToken` + `refreshToken`
2. Tokens persistidos em `localStorage`
3. Interceptor injeta `Bearer` automaticamente
4. Em `401`, interceptor tenta `/auth/refresh` de forma transparente
5. Se refresh falhar, sessão é encerrada e usuário retorna ao login

RBAC:

- Guardas em rota com `roles` opcionais
- Navegação dinâmica (menu) conforme perfis
- Base para controle por `permissions` quando necessário

## 7. Estratégia de integração com API

- API base configurável por ambiente (`VITE_API_BASE_URL`)
- Proxy local para backend (`VITE_PROXY_TARGET`)
- Cliente HTTP centralizado em `shared/api/http-client.ts`
- Hooks de consulta e mutação por domínio (`features/*/api`)
- Mensagens padronizadas de erro

## 8. Design system básico

Componentes reutilizáveis em `shared/ui`:

- `Button`, `Input`, `Select`
- `Card`, `PageHeader`
- `DataTable`, `FilterBar`
- `StatusBadge`, `Skeleton`
- `Modal`, `Toast`
- `ToggleThemeButton`

Tokens visuais centralizados em `app/styles/tokens.css`.

## 9. Build e deploy real

### Variáveis de ambiente

Arquivo: `.env.example`

- `VITE_APP_NAME`
- `VITE_APP_ENV`
- `VITE_API_BASE_URL`
- `VITE_PROXY_TARGET`

### Docker + Nginx

- `Dockerfile`: build multi-stage
- `nginx.conf`: SPA fallback + proxy `/api`
- `docker-compose.yml`: execução local em `:8080`

### CI/CD

Workflow base em `.github/workflows/frontend-ci.yml` com etapas:

- install
- lint
- typecheck
- test
- build

## 10. Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

## 11. Executando localmente

```bash
cp .env.example .env
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend esperado (proxy): `http://localhost:3000`

## 12. Testes

Configuração com Vitest + Testing Library:

- `src/shared/ui/button/button.test.tsx`
- `src/entities/service-order/status-map.test.ts`

Estrutura preparada para crescimento com testes de fluxo crítico e integração de módulos.

## 13. Adaptação da mesma arquitetura para Angular e Vue

### Angular + TypeScript

- `app/core` (auth, interceptors, guards)
- `app/shared` (UI base, pipes, util)
- `app/features/*` lazy-loaded
- Estado com Signals + RxJS (server state por services)
- Roteamento com guards por role e claims

### Vue 3 + TypeScript

- `src/app` (router, plugins)
- `src/shared` (composables, ui base)
- `src/features/*` e `src/pages/*`
- Estado com Pinia (auth/ui) + Vue Query (server state)
- Guardas de rota + navegação por perfil

A modelagem de domínios, segurança e fluxo operacional permanece idêntica, mudando somente a camada de view/composição.

