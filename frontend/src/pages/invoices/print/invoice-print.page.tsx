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
    }, 100);
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
            ← Voltar
          </Button>
        </div>
        <Alert
          variant="danger"
          title="Nota fiscal não encontrada"
          message={getApiErrorMessage(invoiceQuery.error)}
        />
      </div>
    );
  }

  // Preparar dados para o modelo NFS-e
  const serviceOrder = invoice.serviceOrder;
  const client = invoice.client;
  const company = {
    name: 'Empresa de Serviços Ltda',
    taxId: '12345678000190',
    municipalRegistration: '123456',
    email: 'contato@empresa.com.br',
    phone: '(11) 98765-4321',
    address: 'Avenida Principal',
    addressNumber: '1000',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100'
  };

  const items = [
    {
      description: serviceOrder?.title || 'Serviço prestado',
      quantity: 1,
      unitPrice: invoice.grossAmount,
      total: invoice.grossAmount
    }
  ];

  const bankData = {
    bank: 'Banco do Brasil',
    agency: '0001',
    account: '123456-7',
    accountType: 'Corrente'
  };

  return (
    <div className="invoice-print-page">
      <div className="invoice-print-toolbar">
        <div>
          <Button variant="secondary" onClick={() => navigate(appRoutes.invoices)}>
            ← Voltar para Notas Fiscais
          </Button>
        </div>
        <div className="invoice-print-actions">
          <Button
            variant="primary"
            disabled={isPrinting}
            onClick={handlePrint}
          >
            {isPrinting ? '⏳ Preparando impressão...' : '🖨️ Imprimir'}
          </Button>
        </div>
      </div>

      <div className="invoice-print-container">
        <NFSeModel
          ref={printRef}
          invoiceNumber={invoice.invoiceNumber}
          seriesNumber="1"
          rps={`RPS-${invoice.id.substring(0, 6).toUpperCase()}`}
          issueDate={new Date(invoice.issuedAt)}
          dueDate={invoice.dueDate ? new Date(invoice.dueDate) : undefined}
          company={company}
          client={{
            name: client?.name || '-',
            taxId: client?.taxId || '',
            email: client?.email || '',
            phone: client?.phone || '',
            address: client?.mainAddress?.street || '',
            addressNumber: client?.mainAddress?.number || '',
            addressComplement: client?.mainAddress?.complement || '',
            neighborhood: client?.mainAddress?.neighborhood || '',
            city: client?.mainAddress?.city || '',
            state: client?.mainAddress?.state || '',
            zipCode: client?.mainAddress?.zipCode || ''
          }}
          items={items}
          subtotal={invoice.grossAmount}
          deduction={0}
          discount={invoice.discountAmount}
          tax={invoice.taxAmount}
          total={invoice.total}
          notes={invoice.notes}
          bankData={bankData}
          serviceDescription={serviceOrder?.description}
        />
      </div>

      {/* Estilos de impressão - ocultos até print */}
      <style>{`
        @media print {
          .invoice-print-toolbar {
            display: none !important;
          }
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .invoice-print-page {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
