import type { ClientType } from '@prisma/client';

export interface ClientEntity {
  id: string;
  type: ClientType;
  name: string;
  legalName?: string;
  taxId: string;
  email?: string;
  phone?: string;
  mobile?: string;
  contactName?: string;
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
