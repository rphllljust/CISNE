export const appRoutes = {
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/',
  serviceOrders: '/service-orders',
  serviceOrderNew: '/service-orders/new',
  serviceOrderEdit: '/service-orders/:id/edit',
  clients: '/clients',
  users: '/users',
  schedules: '/schedules',
  reports: '/reports',
  notifications: '/notifications',
  audit: '/audit',
  settings: '/settings',
  profile: '/profile',
  // Invoices
  invoices: '/invoices',
  invoiceNew: '/invoices/new',
  invoicePrint: '/invoices/:id/print',
  // Assets
  assets: '/assets',
  assetNew: '/assets/new',
  // Suppliers
  suppliers: '/suppliers',
  supplierNew: '/suppliers/new',
  // ITSM
  itsmProblems: '/itsm/problems',
  itsmProblemNew: '/itsm/problems/new',
  itsmChanges: '/itsm/changes',
  itsmChangeNew: '/itsm/changes/new',
  // Knowledge Base
  knowledgeBase: '/knowledge-base',
  knowledgeBaseNew: '/knowledge-base/new',
} as const;


