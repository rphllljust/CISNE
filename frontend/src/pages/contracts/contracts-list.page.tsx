import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { httpClient } from '@/shared/api/http-client';
import { appRoutes } from '@/shared/constants/routes';
import { Alert, Breadcrumbs, Button, Card, DataTable, FilterBar, Input, PageHeader, Pagination, Select, Skeleton, StatusBadge } from '@/shared/ui';

import '../pages/pages.css';

type ContractStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELED';
type BillingFrequency = 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'ANNUAL';

interface ContractListItem {
  id: string;
  code: string;
  title: string;
  status: ContractStatus;
  billingFrequency?: BillingFrequency | null;
  monthlyValue?: number | null;
  nextBillingDate?: string | null;
  generateNfse?: boolean;
  generateBoleto?: boolean;
  client: { name: string };
}

export default function ContractsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', search, statusFilter],
    queryFn: async (): Promise<ContractListItem[]> => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get<ContractListItem[]>(`/contracts?${params}`);
      return res.data;
    }
  });

  const statusConfig = {
    DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
    ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
    SUSPENDED: { label: 'Suspenso', color: 'bg-yellow-100 text-yellow-800' },
    EXPIRED: { label: 'Expirado', color: 'bg-gray-100 text-gray-800' },
    CANCELED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
  };

  const frequencyLabels = {
    MONTHLY: 'Mensal',
    BIMONTHLY: 'Bimestral',
    QUARTERLY: 'Trimestral',
    ANNUAL: 'Anual'
  };

  const isNextBillingToday = (nextBillingDate: string) => {
    const today = new Date().toDateString();
    const billingDate = new Date(nextBillingDate).toDateString();
    return today === billingDate;
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie contratos recorrentes e faturamento automÃ¡tico
          </p>
        </div>
        <Button onClick={() => navigate('/contracts/new')}>
          <Plus className="mr-2" size={16} />
          Novo Contrato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 text-muted-foreground" size={18} />
              <Input
                placeholder="Buscar por cÃ³digo, tÃ­tulo ou cliente..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={statusFilter || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value || null)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Todos os status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="ACTIVE">Ativo</option>
              <option value="SUSPENDED">Suspenso</option>
              <option value="EXPIRED">Expirado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {contracts && contracts.length > 0 ? (
        <div className="grid gap-4">
          {contracts.map((contract) => {
            const status =
              statusConfig[contract.status as keyof typeof statusConfig] ||
              statusConfig.DRAFT;
            const frequency =
              frequencyLabels[contract.billingFrequency as keyof typeof frequencyLabels];
            const isToday = contract.nextBillingDate && isNextBillingToday(contract.nextBillingDate);

            return (
              <Card
                key={contract.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => void navigate(`/contracts/${contract.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{contract.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        CÃ³digo: {contract.code}
                      </p>
                    </div>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Cliente</p>
                      <p className="font-medium">{contract.client.name}</p>
                    </div>

                    {contract.billingFrequency && (
                      <div>
                        <p className="text-muted-foreground mb-1">FrequÃªncia</p>
                        <p className="font-medium">{frequency}</p>
                      </div>
                    )}

                    {contract.monthlyValue && (
                      <div>
                        <p className="text-muted-foreground mb-1 flex items-center">
                          <DollarSign size={14} className="mr-1" />
                          Valor mensal
                        </p>
                        <p className="font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(contract.monthlyValue)}
                        </p>
                      </div>
                    )}

                    {contract.nextBillingDate && (
                      <div>
                        <p className="text-muted-foreground mb-1 flex items-center">
                          <Calendar size={14} className="mr-1" />
                          PrÃ³ximo faturamento
                        </p>
                        <div className="flex items-center gap-2">
                          {isToday && <CheckCircle size={14} className="text-green-600" />}
                          <p className={`font-medium ${isToday ? 'text-green-600' : ''}`}>
                            {new Date(contract.nextBillingDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {contract.generateNfse && (
                    <div className="mt-4 pt-4 border-t">
                      <Badge variant="outline" className="mr-2">
                        Gera NFS-e
                      </Badge>
                      {contract.generateBoleto && (
                        <Badge variant="outline">Gera Boleto</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">Nenhum contrato encontrado</p>
            <Button onClick={() => void navigate('/contracts/new')}>
              <Plus className="mr-2" size={16} />
              Criar novo contrato
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

