# OMS Frontend Architecture

## 1. Architectural Model
- Frontend architecture follows a feature-first structure with clear boundaries between app shell, domain entities, feature logic, UI system and route pages.
- Business data contracts are isolated in `entities/*` and `shared/types`.
- API integration is isolated in `features/*/api` and `shared/api/http-client.ts`.
- Global UX components live in `shared/ui` and are reused by all pages.
- Composition of business screens happens in `pages/*`, keeping visual orchestration separate from domain logic.

## 2. Folder Structure

```text
src/
  app/
    providers/
    router/
    styles/
  entities/
    auth/
    client/
    dashboard/
    service-order/
    user/
  features/
    auth/{api,model,ui}
    users/api
    clients/api
    service-orders/api
    dashboard/api
    notifications/api
    audit/api
  pages/
    auth/
    dashboard/
    service-orders/{list,detail,create,edit}
    clients/{list,detail}
    users/list
    schedules/calendar
    reports
    notifications
    audit
    profile
    settings
  shared/
    api/
    config/
    constants/
    lib/
    types/
    ui/
  widgets/
    layout/
    charts/
  test/
```

## 3. Design System
- Tokens and theme variables are centralized in `app/styles/tokens.css`.
- Base typography, reset and global behavior live in `app/styles/base.css`.
- Reusable components include: `AppShell`, `PageHeader`, `Breadcrumbs`, `DataTable`, `FilterBar`, `Pagination`, `Alert`, `Drawer`, `Modal`, `StatusBadge`, `Skeleton`, `Toast`.
- Components are composable, typed and feature-agnostic.

## 4. Screen Strategy
- Login and password recovery screens are standalone auth flows.
- Operational pages use a consistent shell: breadcrumbs, title/subtitle, actions, filters, table/cards, feedback states.
- Detail pages use two-column composition with summary + timeline/actions.
- Error pages include 404 and runtime fallback (`ErrorBoundary`).

## 5. Backend Integration
- Axios clients:
  - `publicClient` for auth-free calls
  - `httpClient` for authenticated calls
- JWT access token is attached via request interceptor.
- 401 responses trigger refresh flow with automatic retry.
- Feature endpoints are isolated per domain and consumed through typed hooks.

## 6. Authentication and Authorization
- Session state is managed in `features/auth/model/auth.store.ts`.
- Login/refresh/logout/me are centralized in `features/auth/api/auth.api.ts`.
- Route guards:
  - `ProtectedRoute`: session + RBAC/permission checks
  - `PublicOnlyRoute`: prevents authenticated access to auth pages
- Navigation visibility is role-aware (`widgets/navigation/navigation-items.tsx`).

## 7. Error Handling
- API error normalization in `shared/lib/api-error.ts`.
- Global query error handling in `app/providers/query-client.ts`.
- Local page-level feedback through `Alert` component.
- User notifications through centralized toast store.
- Runtime rendering failures handled by `shared/ui/error-boundary`.

## 8. Async State Strategy
- TanStack Query is the async backbone.
- Query keys are centralized in `shared/constants/query-keys.ts`.
- Server state lifecycle uses stale/gc/retry policy at query-client level.
- UI patterns for async states:
  - loading: skeleton/page-loader
  - error: alert with retry
  - empty: empty-state
  - success: table/cards/charts

## 9. Code Quality Rules Applied
- Strict TypeScript mode enabled.
- Feature-level API contracts and entity typing avoid implicit `any`.
- Shared UI primitives prevent duplication and giant components.
- Business/network logic is not coupled into presentational components.
- Build and lint are part of delivery gate.

## 10. Production Readiness
- Build validated with Vite production pipeline.
- Lint validated with ESLint.
- Environment-driven runtime config in `shared/config/env.ts`.
- Router is code-split by route for better performance.
- Layout and components are responsive for desktop/tablet/mobile.

## 11. Mapping to Enterprise Naming Convention
Equivalent mapping to requested naming:
- `components/` -> `shared/ui/`
- `services/` -> `shared/api/` + `features/*/api/`
- `hooks/` -> `features/*/model/` (form/session hooks)
- `lib/` -> `shared/lib/`
- `types/` -> `entities/*/types.ts` + `shared/types/`
- `layouts/` -> `widgets/layout/`
- `pages/` -> `pages/`
- `schemas/` -> Zod schemas inside feature model files (ready to be split if needed)
- `utils/` -> `shared/lib/`

## 12. Evolution Path
- Split `features/*/model` into explicit `hooks/` and `schemas/` subfolders when each feature grows.
- Add `features/*/ui` for domain-specific reusable widgets.
- Introduce contract tests with MSW + Vitest for each feature API.
- Add E2E critical flows (login, create OS, status transition, edit OS).
