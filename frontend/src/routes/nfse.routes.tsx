import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const NfseEmitPage = lazy(() => import('@/pages/nfse/nfse-emit.page'));
const NfseDetailPage = lazy(() => import('@/pages/nfse/nfse-detail.page'));

export const nfseRoutes: RouteObject[] = [
  {
    path: '/nfse/emitir/:serviceOrderId/:invoiceId',
    element: <NfseEmitPage />
  },
  {
    path: '/nfse/:nfseId',
    element: <NfseDetailPage />
  }
];
