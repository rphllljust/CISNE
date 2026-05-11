import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const ContractsListPage = lazy(() => import('@/pages/contracts/contracts-list.page'));

export const contractsRoutes: RouteObject[] = [
  {
    path: '/contracts',
    element: <ContractsListPage />
  }
];
