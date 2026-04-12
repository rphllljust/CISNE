import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { queryKeys } from '@/shared/constants/query-keys';
import { appRoutes } from '@/shared/constants/routes';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { Alert, Breadcrumbs, Button, Card, Input, PageHeader, Select, Skeleton } from '@/shared/ui';
import { useToastStore } from '@/shared/ui/toast';
import {
  updateServiceOrder,
  useServiceOrderById,
  type UpdateServiceOrderInput
} from '@/features/service-orders/api/service-orders.api';

import '../../pages.css';

const editServiceOrderSchema = z.object({
  title: z.string().min(3, 'Title must have at least 3 chars.'),
  description: z.string().min(10, 'Description must have at least 10 chars.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  scheduledStartAt: z.string().optional(),
  scheduledEndAt: z.string().optional(),
  internalNotes: z.string().optional(),
  customerNotes: z.string().optional()
});

type EditServiceOrderValues = z.infer<typeof editServiceOrderSchema>;

function toInputDateTime(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toIso(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

export function EditServiceOrderPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);

  const serviceOrderQuery = useServiceOrderById(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<EditServiceOrderValues>({
    resolver: zodResolver(editServiceOrderSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      scheduledStartAt: '',
      scheduledEndAt: '',
      internalNotes: '',
      customerNotes: ''
    }
  });

  useEffect(() => {
    if (!serviceOrderQuery.data) {
      return;
    }

    reset({
      title: serviceOrderQuery.data.title,
      description: serviceOrderQuery.data.description,
      priority: serviceOrderQuery.data.priority,
      scheduledStartAt: toInputDateTime(serviceOrderQuery.data.scheduledStartAt),
      scheduledEndAt: toInputDateTime(serviceOrderQuery.data.scheduledEndAt),
      internalNotes: '',
      customerNotes: ''
    });
  }, [reset, serviceOrderQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async (values: EditServiceOrderValues) => {
      const payload: UpdateServiceOrderInput = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        scheduledStartAt: toIso(values.scheduledStartAt),
        scheduledEndAt: toIso(values.scheduledEndAt),
        internalNotes: values.internalNotes?.trim() || undefined,
        customerNotes: values.customerNotes?.trim() || undefined
      };

      return updateServiceOrder(id, payload);
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.serviceOrderById(id) });
      await queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      pushToast({ type: 'success', message: `Service order #${data.orderNumber} updated.` });
      void navigate(`${appRoutes.serviceOrders}/${id}`);
    },
    onError: (error) => {
      pushToast({ type: 'error', message: getApiErrorMessage(error) });
    }
  });

  if (serviceOrderQuery.isLoading) {
    return (
      <section className="page-grid">
        <Skeleton height={72} />
        <Skeleton height={420} />
      </section>
    );
  }

  if (serviceOrderQuery.isError || !serviceOrderQuery.data) {
    return (
      <section className="page-grid">
        <PageHeader title="Editar Ordem de Servico" subtitle="Nao foi possivel carregar os detalhes da ordem de servico." />
        <Alert
          variant="danger"
          message={getApiErrorMessage(serviceOrderQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void navigate(-1)}>
              Voltar
            </Button>
          }
        />
      </section>
    );
  }

  const breadcrumbs = [
    { label: 'Painel', to: appRoutes.dashboard },
    { label: 'Ordens de Servico', to: appRoutes.serviceOrders },
    { label: `OS #${serviceOrderQuery.data.orderNumber}`, to: `${appRoutes.serviceOrders}/${id}` },
    { label: 'Edit' }
  ];

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Operations"
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        title={`Edit OS #${serviceOrderQuery.data.orderNumber}`}
        subtitle="Update service scope, dates and execution notes with full audit trail."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => void navigate(-1)}>
              Cancelar
            </Button>
            <Button disabled={updateMutation.isPending} onClick={() => void handleSubmit((v) => updateMutation.mutate(v))()}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        }
      />

      <Card>
        <form
          className="page-grid"
          onSubmit={(event) => {
            void handleSubmit((values) => updateMutation.mutate(values))(event);
          }}
        >
          <div className="inline-form">
            <Input label="Title" error={errors.title?.message} {...register('title')} />
            <Select
              label="Priority"
              error={errors.priority?.message}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'CRITICAL', label: 'Critical' }
              ]}
              {...register('priority')}
            />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea rows={5} placeholder="Describe the latest operational context..." {...register('description')} />
            {errors.description ? <p className="field-error">{errors.description.message}</p> : null}
          </div>

          <div className="inline-form">
            <Input type="datetime-local" label="Inicio agendado" {...register('scheduledStartAt')} />
            <Input type="datetime-local" label="Fim agendado" {...register('scheduledEndAt')} />
          </div>

          <div className="inline-form">
            <div className="field">
              <label>Internal notes</label>
              <textarea rows={4} placeholder="Internal context and decisions..." {...register('internalNotes')} />
            </div>
            <div className="field">
              <label>Customer notes</label>
              <textarea rows={4} placeholder="Customer-facing notes and updates..." {...register('customerNotes')} />
            </div>
          </div>

          {updateMutation.isError ? (
            <Alert variant="danger" message={getApiErrorMessage(updateMutation.error)} />
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" onClick={() => void navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

