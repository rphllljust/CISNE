export type ClientType = 'INDIVIDUAL' | 'BUSINESS';

export interface Client {
  id: string;
  type: ClientType;
  name: string;
  legalName: string | null;
  taxId: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  contactName: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientAddress {
  id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isPrimary: boolean;
}

export interface ClientContract {
  id: string;
  code: string;
  title: string;
  startDate: string;
  endDate: string | null;
  serviceScope: string | null;
  slaId: string | null;
}

export interface ClientDetail extends Client {
  notes: string | null;
  addresses: ClientAddress[];
  contracts: ClientContract[];
}

