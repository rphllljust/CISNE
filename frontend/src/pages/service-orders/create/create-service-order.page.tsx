import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useClients } from '@/features/clients/api/clients.api';
import { createServiceOrder } from '@/features/service-orders/api/service-orders.api';
import { appRoutes } from '@/shared/constants/routes';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { Alert, Breadcrumbs, Button, Card, Input, PageHeader, Select } from '@/shared/ui';
import { useToastStore } from '@/shared/ui/toast';

import '../../pages.css';

const createServiceOrderSchema = z.object({
  clientId: z.string().uuid('Select a valid client.'),
  serviceTypeId: z.string().uuid('Provide a valid service type UUID.'),
  title: z.string().min(3, 'Title must have at least 3 chars.'),
  description: z.string().min(10, 'Description must have at least 10 chars.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
});

type CreateServiceOrderValues = z.infer<typeof createServiceOrderSchema>;

export function CreateServiceOrderPage(): React.JSX.Element {
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);

  const clientsQuery = useClients({ page: 1, limit: 100, active: true });
  const clientOptions = clientsQuery.data?.items ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CreateServiceOrderValues>({
    resolver: zodResolver(createServiceOrderSchema),
    defaultValues: {
      clientId: '',
      serviceTypeId: '',
      title: '',
      description: '',
      priority: 'MEDIUM'
    }
  });

  const createMutation = useMutation({
    mutationFn: createServiceOrder,
    onSuccess: (data) => {
      pushToast({ type: 'success', message: `Service order #${data.orderNumber} created.` });
      void navigate(`${appRoutes.serviceOrders}/${data.id}`);
    },
    onError: (error) => {
      pushToast({ type: 'error', message: getApiErrorMessage(error) });
    }
  });

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Operations"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', to: appRoutes.dashboard },
              { label: 'Service Orders', to: appRoutes.serviceOrders },
              { label: 'New service order' }
            ]}
          />
        }
        title="Create service order"
        subtitle="Register a new operation with full traceability from opening to completion."
        actions={
          <Button variant="secondary" onClick={() => void navigate(appRoutes.serviceOrders)}>
            Cancel
          </Button>
        }
      />

      <Card>
        <form
          className="page-grid"
          onSubmit={(event) => {
            void handleSubmit((values) => createMutation.mutate(values))(event);
          }}
        >
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              Scope and ownership
            </p>
            <div className="inline-form">
              <Select
                label="Client"
                error={errors.clientId?.message}
                options={[
                  { value: '', label: clientsQuery.isLoading ? 'Loading clients...' : 'Select client...' },
                  ...clientOptions.map((c) => ({ value: c.id, label: c.name }))
                ]}
                disabled={clientsQuery.isLoading}
                {...register('clientId')}
              />
              <Input
                label="Service type ID"
                placeholder="UUID of service type"
                error={errors.serviceTypeId?.message}
                {...register('serviceTypeId')}
              />
            </div>
          </div>

          <hr className="section-divider" />

          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              Service details
            </p>
            <div className="page-grid">
              <Input
                label="Title"
                placeholder="Example: Power issue in Area A3"
                error={errors.title?.message}
                {...register('title')}
              />
              <div className="field">
                <label>Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe the issue and field expectations for technicians..."
                  style={{ resize: 'vertical', minHeight: 96 }}
                  {...register('description')}
                />
                {errors.description ? <p className="field-error">{errors.description.message}</p> : null}
              </div>
              <Select
                label="Priority"
                error={errors.priority?.message}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical - immediate impact' }
                ]}
                {...register('priority')}
              />
            </div>
          </div>

          {createMutation.isError ? <Alert variant="danger" message={getApiErrorMessage(createMutation.error)} /> : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Button variant="secondary" onClick={() => void navigate(appRoutes.serviceOrders)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create service order'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

