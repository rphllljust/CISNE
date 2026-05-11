import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useInvoiceById } from '@/features/invoices/api/invoices.api';
import { NFSeModel } from '@/shared/ui/nfse-model';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { appRoutes } from '@/shared/constants/routes';
import { Alert, Button, Skeleton } from '@/shared/ui';

import './invoice-print.css';

export function InvoicePrintPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceQuery = useInvoiceById(id);
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const invoice = invoiceQuery.data;

  const handlePrint = (): void => {
    if (!printRef.current) return;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 120);
  };

  if (invoiceQuery.isLoading) {
    return (
      <div className="invoice-print-page">
        <div className="invoice-print-toolbar">
          <Skeleton width={200} height={40} />
        </div>
        <Skeleton height={600} />
      </div>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <div className="invoice-print-page">
        <div className="invoice-print-toolbar">
          <Button variant="secondary" onClick={() => navigate(appRoutes.invoices)}>
            Voltar
          </Button>
        </div>
        <Alert
          variant="danger"
          title="Nota fiscal nao encontrada"
          message={getApiErrorMessage(invoiceQuery.error)}
        />
      </div>
    );
  }

  const serviceOrder = invoice.serviceOrder;
  const client = invoice.client;

  return (
    <div className="invoice-print-page">
      <div className="invoice-print-toolbar">
        <div>
          <Button variant="secondary" onClick={() => navigate(appRoutes.invoices)}>
            Voltar para notas fiscais
          </Button>
        </div>
        <div className="invoice-print-actions">
          <Button variant="primary" disabled={isPrinting} onClick={handlePrint}>
            {isPrinting ? 'Preparando impressao...' : 'Imprimir'}
          </Button>
        </div>
      </div>

      <div className="invoice-print-container">
        <NFSeModel
          ref={printRef}
          invoiceNumber={invoice.invoiceNumber}
          series="A"
          issueDate={invoice.issuedAt ? new Date(invoice.issuedAt) : new Date()}
          accessKey="1122 3344 5566 7788 9900 1122 3344 5566 7788 9900 1122"
          issuer={{
            name: 'Cisne Rondonia Comercio e Servicos Ltda',
            taxId: '11897171000108',
            stateRegistration: '___________________',
            address: 'Rua ________________________, No _____',
            city: 'Porto Velho',
            state: 'RO'
          }}
          recipient={{
            name: client?.name ?? '_____________________________________________',
            taxId: client?.taxId,
            address: '_____________________________________________',
            city: '__________________',
            state: '____'
          }}
          items={[
            {
              code: serviceOrder?.orderNumber ? String(serviceOrder.orderNumber) : '',
              description: serviceOrder?.title ?? 'Servico prestado',
              quantity: 1,
              unit: 'UN',
              unitPrice: invoice.subtotal,
              total: invoice.subtotal
            }
          ]}
          subtotal={invoice.subtotal}
          discount={invoice.discount}
          tax={invoice.tax}
          total={invoice.total}
          notes={invoice.notes}
          transport={{}}
        />
      </div>
    </div>
  );
}
