/* eslint-disable react-refresh/only-export-components */

import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { AppShellLayout } from './app-shell-layout';
import { ProtectedRoute } from './protected-route';
import { PublicOnlyRoute } from './public-only-route';

import { appRoutes } from '@/shared/constants/routes';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { PageLoader } from '@/shared/ui/page-loader';

const LoginPage = lazy(() => import('@/pages/auth/login/login.page').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password/forgot-password.page').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password/reset-password.page').then((m) => ({ default: m.ResetPasswordPage })));

const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard.page').then((m) => ({ default: m.DashboardPage })));
const ServiceOrdersListPage = lazy(() => import('@/pages/service-orders/list/service-orders-list.page').then((m) => ({ default: m.ServiceOrdersListPage })));
const CreateServiceOrderPage = lazy(() => import('@/pages/service-orders/create/create-service-order.page').then((m) => ({ default: m.CreateServiceOrderPage })));
const EditServiceOrderPage = lazy(() => import('@/pages/service-orders/edit/edit-service-order.page').then((m) => ({ default: m.EditServiceOrderPage })));
const ServiceOrderDetailPage = lazy(() => import('@/pages/service-orders/detail/service-order-detail.page').then((m) => ({ default: m.ServiceOrderDetailPage })));
const ClientsListPage = lazy(() => import('@/pages/clients/list/clients-list.page').then((m) => ({ default: m.ClientsListPage })));
const ClientDetailPage = lazy(() => import('@/pages/clients/detail/client-detail.page').then((m) => ({ default: m.ClientDetailPage })));
const UsersListPage = lazy(() => import('@/pages/users/list/users-list.page').then((m) => ({ default: m.UsersListPage })));
const SchedulesPage = lazy(() => import('@/pages/schedules/calendar/schedules.page').then((m) => ({ default: m.SchedulesPage })));
const ReportsPage = lazy(() => import('@/pages/reports/reports.page').then((m) => ({ default: m.ReportsPage })));
const NotificationsPage = lazy(() => import('@/pages/notifications/notifications.page').then((m) => ({ default: m.NotificationsPage })));
const AuditPage = lazy(() => import('@/pages/audit/audit.page').then((m) => ({ default: m.AuditPage })));
const SettingsPage = lazy(() => import('@/pages/settings/settings.page').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/pages/profile/profile.page').then((m) => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import('@/pages/not-found.page').then((m) => ({ default: m.NotFoundPage })));

function Lazy({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export const appRouter = createBrowserRouter([
  {
    path: appRoutes.login,
    element: (
      <PublicOnlyRoute>
        <Lazy>
          <LoginPage />
        </Lazy>
      </PublicOnlyRoute>
    )
  },
  {
    path: appRoutes.forgotPassword,
    element: (
      <PublicOnlyRoute>
        <Lazy>
          <ForgotPasswordPage />
        </Lazy>
      </PublicOnlyRoute>
    )
  },
  {
    path: appRoutes.resetPassword,
    element: (
      <PublicOnlyRoute>
        <Lazy>
          <ResetPasswordPage />
        </Lazy>
      </PublicOnlyRoute>
    )
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          {
            path: appRoutes.dashboard,
            element: (
              <Lazy>
                <DashboardPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.serviceOrders,
            element: (
              <Lazy>
                <ServiceOrdersListPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.serviceOrderNew,
            element: (
              <Lazy>
                <CreateServiceOrderPage />
              </Lazy>
            )
          },
          {
            path: `${appRoutes.serviceOrders}/:id`,
            element: (
              <Lazy>
                <ServiceOrderDetailPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.serviceOrderEdit,
            element: (
              <Lazy>
                <EditServiceOrderPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.clients,
            element: (
              <Lazy>
                <ClientsListPage />
              </Lazy>
            )
          },
          {
            path: `${appRoutes.clients}/:id`,
            element: (
              <Lazy>
                <ClientDetailPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.users,
            element: (
              <Lazy>
                <UsersListPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.schedules,
            element: (
              <Lazy>
                <SchedulesPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.reports,
            element: (
              <Lazy>
                <ReportsPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.notifications,
            element: (
              <Lazy>
                <NotificationsPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.audit,
            element: <ProtectedRoute roles={['SUPER_ADMIN', 'OPERATIONS_MANAGER']} />,
            children: [
              {
                index: true,
                element: (
                  <Lazy>
                    <AuditPage />
                  </Lazy>
                )
              }
            ]
          },
          {
            path: appRoutes.settings,
            element: (
              <Lazy>
                <SettingsPage />
              </Lazy>
            )
          },
          {
            path: appRoutes.profile,
            element: (
              <Lazy>
                <ProfilePage />
              </Lazy>
            )
          },
          {
            path: '*',
            element: (
              <Lazy>
                <NotFoundPage />
              </Lazy>
            )
          }
        ]
      }
    ]
  }
]);
