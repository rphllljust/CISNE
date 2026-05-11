import React from 'react';
import './nfse-model.css';

interface PartyData {
  name: string;
  taxId?: string;
  stateRegistration?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface InvoiceItem {
  code?: string;
  description: string;
  ncm?: string;
  cfop?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface NFSeProps {
  invoiceNumber: string;
  series?: string;
  issueDate?: Date;
  accessKey?: string;
  issuer: PartyData;
  recipient: PartyData;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  freight?: number;
  insurance?: number;
  otherExpenses?: number;
  tax?: number;
  total: number;
  notes?: string;
  transport?: {
    name?: string;
    taxId?: string;
    quantity?: string;
    kind?: string;
    brand?: string;
    grossWeight?: string;
    netWeight?: string;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date?: Date): string {
  if (!date) return '_____/_____/__________';
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatCnpjCpf(value?: string): string {
  if (!value) return '__________________________';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return value;
}

const line = '___________________________________';

export const NFSeModel = React.forwardRef<HTMLDivElement, NFSeProps>((props, ref) => {
  const {
    invoiceNumber,
    series = 'A',
    issueDate,
    accessKey,
    issuer,
    recipient,
    items,
    subtotal,
    discount = 0,
    freight = 0,
    insurance = 0,
    otherExpenses = 0,
    tax = 0,
    total,
    notes,
    transport
  } = props;

  const rows = Array.from({ length: 9 }, (_, i) => items[i]);

  return (
    <div ref={ref} className="modelo-a4">
      <header className="nf-hero">
        <div className="hero-left">
          <h1>CISNE RONDONIA</h1>
          <p>Comercio e Servicos Ltda</p>
          <p>CNPJ: {formatCnpjCpf(issuer.taxId)}</p>
          <p>Inscricao Estadual: {issuer.stateRegistration ?? '___________________'}</p>
        </div>
        <div className="hero-right">
          <p className="hero-title">NOTA FISCAL</p>
          <p>MODELO 1-A | SERIE {series}</p>
          <p className="hero-number">No {invoiceNumber}</p>
          <p>Data de Emissao: {formatDate(issueDate)}</p>
          <p>1a Via - Emitente</p>
        </div>
      </header>

      <div className="access-strip">
        <div className="strip-label">CHAVE DE ACESSO NF-e (44 digitos)</div>
        <div className="strip-key">{accessKey ?? '1122 3344 5566 7788 9900 1122 3344 5566 7788 9900 1122'}</div>
      </div>

      <section className="block">
        <h3>EMITENTE</h3>
        <div className="grid three">
          <div><small>RAZAO SOCIAL</small><strong>{issuer.name}</strong></div>
          <div><small>CNPJ</small><strong>{formatCnpjCpf(issuer.taxId)}</strong></div>
          <div><small>INSCRICAO ESTADUAL</small><strong>{issuer.stateRegistration ?? line}</strong></div>
          <div><small>ENDERECO</small><span>{issuer.address ?? line}</span></div>
          <div><small>MUNICIPIO</small><strong>{issuer.city ?? 'Porto Velho'}</strong></div>
          <div><small>UF</small><strong>{issuer.state ?? 'RO'}</strong></div>
        </div>
      </section>

      <section className="block">
        <h3>DESTINATARIO / REMETENTE</h3>
        <div className="grid three">
          <div><small>NOME / RAZAO SOCIAL</small><span>{recipient.name || line}</span></div>
          <div><small>CNPJ / CPF</small><span>{formatCnpjCpf(recipient.taxId)}</span></div>
          <div><small>DATA DE EMISSAO</small><span>{formatDate(issueDate)}</span></div>
          <div><small>ENDERECO</small><span>{recipient.address ?? line}</span></div>
          <div><small>MUNICIPIO</small><span>{recipient.city ?? '__________________'}</span></div>
          <div><small>UF</small><span>{recipient.state ?? '____'}</span></div>
        </div>
      </section>

      <section className="block">
        <h3>PRODUTOS / SERVICOS</h3>
        <table className="nf-table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>CODIGO</th>
              <th>DESCRICAO DO PRODUTO / SERVICO</th>
              <th>NCM / SH</th>
              <th>CFOP</th>
              <th>UN</th>
              <th>QTDE</th>
              <th>VL. UNIT.</th>
              <th>VL. TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it, idx) => (
              <tr key={idx}>
                <td>{String(idx + 1).padStart(2, '0')}</td>
                <td>{it?.code ?? ''}</td>
                <td className="left">{it?.description ?? ''}</td>
                <td>{it?.ncm ?? ''}</td>
                <td>{it?.cfop ?? ''}</td>
                <td>{it?.unit ?? ''}</td>
                <td>{it?.quantity?.toFixed(2).replace('.', ',') ?? ''}</td>
                <td>{it?.unitPrice != null ? formatCurrency(it.unitPrice) : ''}</td>
                <td>{it?.total != null ? formatCurrency(it.total) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="block">
        <h3>CALCULO DO IMPOSTO</h3>
        <div className="calc">
          <div className="calc-left">
            <div><small>BASE CALC. ICMS</small><span>{formatCurrency(subtotal)}</span></div>
            <div><small>VALOR ICMS</small><span>{formatCurrency(tax)}</span></div>
            <div><small>BC ICMS-ST</small><span>{formatCurrency(0)}</span></div>
            <div><small>VALOR ICMS-ST</small><span>{formatCurrency(0)}</span></div>
            <div><small>VALOR PRODUTOS</small><span>{formatCurrency(subtotal)}</span></div>
            <div><small>VALOR FRETE</small><span>{formatCurrency(freight)}</span></div>
            <div><small>VALOR SEGURO</small><span>{formatCurrency(insurance)}</span></div>
            <div><small>OUTRAS DESP.</small><span>{formatCurrency(otherExpenses)}</span></div>
            <div><small>VALOR IPI</small><span>{formatCurrency(0)}</span></div>
            <div><small>VALOR PIS</small><span>{formatCurrency(0)}</span></div>
            <div><small>VALOR COFINS</small><span>{formatCurrency(0)}</span></div>
            <div><small>DESCONTO</small><span>{formatCurrency(discount)}</span></div>
          </div>
          <div className="calc-right">
            <div><label>VALOR TOTAL DOS PRODUTOS</label><span>{formatCurrency(subtotal)}</span></div>
            <div><label>(-) DESCONTOS</label><span>{formatCurrency(discount)}</span></div>
            <div><label>(+) FRETE / SEGURO</label><span>{formatCurrency(freight + insurance)}</span></div>
            <div><label>(+) OUTRAS DESPESAS</label><span>{formatCurrency(otherExpenses)}</span></div>
            <div className="calc-total"><label>VALOR TOTAL DA NOTA</label><strong>{formatCurrency(total)}</strong></div>
          </div>
        </div>
      </section>

      <section className="block">
        <h3>INFORMACOES COMPLEMENTARES / USO DO FISCO</h3>
        <div className="notes">{notes || ' '}</div>
      </section>

      <section className="block">
        <h3>TRANSPORTADOR / VOLUMES TRANSPORTADOS</h3>
        <div className="grid transport">
          <div><small>RAZAO SOCIAL DO TRANSPORTADOR</small><span>{transport?.name ?? line}</span></div>
          <div><small>FRETE POR CONTA</small><span>[ ] EMITENTE    [ ] DESTINATARIO</span></div>
          <div><small>CNPJ DO TRANSPORTADOR</small><span>{formatCnpjCpf(transport?.taxId)}</span></div>
          <div><small>QUANTIDADE</small><span>{transport?.quantity ?? '___________'}</span></div>
          <div><small>ESPECIE</small><span>{transport?.kind ?? '___________'}</span></div>
          <div><small>MARCA</small><span>{transport?.brand ?? '___________'}</span></div>
          <div><small>PESO BRUTO (kg)</small><span>{transport?.grossWeight ?? '___________'}</span></div>
          <div><small>PESO LIQUIDO (kg)</small><span>{transport?.netWeight ?? '___________'}</span></div>
        </div>
      </section>

      <footer className="footer">
        <p>Cisne Rondonia Comercio e Servicos Ltda  ·  CNPJ {formatCnpjCpf(issuer.taxId)}  ·  Porto Velho - RO</p>
        <p>Documento de uso interno / modelo de referencia  ·  Emitido em 21/04/2026</p>
      </footer>
    </div>
  );
});

NFSeModel.displayName = 'NFSeModel';
