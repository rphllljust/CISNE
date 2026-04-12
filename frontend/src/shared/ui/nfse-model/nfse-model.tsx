import React from 'react';
import './nfse-model.css';

interface ClientData {
  name: string;
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface CompanyData {
  name: string;
  taxId: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  email?: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface NFSeProps {
  invoiceNumber: string;
  seriesNumber?: string;
  rps?: string;
  issueDate: Date;
  dueDate?: Date;
  company: CompanyData;
  client: ClientData;
  items: InvoiceItem[];
  subtotal: number;
  deduction: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  bankData?: {
    bank: string;
    agency: string;
    account: string;
    accountType: string;
  };
  serviceDescription?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatCPFCNPJ(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

export const NFSeModel = React.forwardRef<HTMLDivElement, NFSeProps>(
  ({
    invoiceNumber,
    seriesNumber = '1',
    rps,
    issueDate,
    dueDate,
    company,
    client,
    items,
    subtotal,
    deduction = 0,
    discount = 0,
    tax,
    total,
    notes,
    bankData,
    serviceDescription
  }, ref) => {
    return (
      <div ref={ref} className="nfse-container">
        {/* HEADER COM LOGO E IDENTIFICACAO */}
        <div className="nfse-header">
          <div className="nfse-header-left">
            <div className="nfse-company-logo">
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                {company.name.split(' ')[0].substring(0, 1)}
              </div>
            </div>
            <div>
              <h1 className="nfse-company-name">{company.name}</h1>
              <p className="nfse-company-taxid">CNPJ: {formatCPFCNPJ(company.taxId)}</p>
              {company.municipalRegistration && (
                <p className="nfse-company-registration">
                  Inscrição Municipal: {company.municipalRegistration}
                </p>
              )}
            </div>
          </div>
          <div className="nfse-header-right">
            <div className="nfse-invoice-number">
              <div className="nfse-label">NFS-e Nº</div>
              <div className="nfse-value">{invoiceNumber}</div>
            </div>
            <div className="nfse-invoice-series">
              <div className="nfse-label">Série</div>
              <div className="nfse-value">{seriesNumber}</div>
            </div>
            {rps && (
              <div className="nfse-rps">
                <div className="nfse-label">RPS</div>
                <div className="nfse-value">{rps}</div>
              </div>
            )}
          </div>
        </div>

        {/* LINHA SEPARADORA */}
        <div className="nfse-divider" />

        {/* DADOS DO CLIENTE E DATAS */}
        <div className="nfse-client-section">
          <div className="nfse-client-main">
            <h3 className="nfse-section-title">DADOS DO TOMADOR (CLIENTE)</h3>

            <div className="nfse-client-info">
              <div className="nfse-info-row">
                <div className="nfse-info-col">
                  <span className="nfse-label">Nome/Razão Social</span>
                  <span className="nfse-value-text">{client.name}</span>
                </div>
              </div>

              <div className="nfse-info-row">
                <div className="nfse-info-col">
                  <span className="nfse-label">CPF/CNPJ</span>
                  <span className="nfse-value-text">{formatCPFCNPJ(client.taxId)}</span>
                </div>
                <div className="nfse-info-col">
                  <span className="nfse-label">Email</span>
                  <span className="nfse-value-text">{client.email || '-'}</span>
                </div>
              </div>

              {(client.address || client.neighborhood || client.city) && (
                <div className="nfse-info-row">
                  <div className="nfse-info-col full">
                    <span className="nfse-label">Endereço</span>
                    <span className="nfse-value-text">
                      {client.address}
                      {client.addressNumber ? `, ${client.addressNumber}` : ''}
                      {client.addressComplement ? ` - ${client.addressComplement}` : ''}
                      {client.neighborhood ? `, ${client.neighborhood}` : ''}
                    </span>
                  </div>
                </div>
              )}

              {(client.city || client.state || client.zipCode) && (
                <div className="nfse-info-row">
                  <div className="nfse-info-col">
                    <span className="nfse-label">Cidade/UF/CEP</span>
                    <span className="nfse-value-text">
                      {client.city}/{client.state} {client.zipCode}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="nfse-dates-section">
            <h3 className="nfse-section-title">DATAS</h3>

            <div className="nfse-date-item">
              <span className="nfse-label">Emissão</span>
              <span className="nfse-date-value">{formatDate(issueDate)}</span>
            </div>

            {dueDate && (
              <div className="nfse-date-item">
                <span className="nfse-label">Vencimento</span>
                <span className="nfse-date-value">{formatDate(dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* DADOS DA EMPRESA PRESTADORA */}
        <div className="nfse-company-section">
          <h3 className="nfse-section-title">DADOS DO PRESTADOR DE SERVIÇO</h3>

          <div className="nfse-company-info">
            <div className="nfse-info-row">
              <div className="nfse-info-col">
                <span className="nfse-label">CNPJ</span>
                <span className="nfse-value-text">{formatCPFCNPJ(company.taxId)}</span>
              </div>
              <div className="nfse-info-col">
                <span className="nfse-label">Inscrição Municipal</span>
                <span className="nfse-value-text">{company.municipalRegistration || '-'}</span>
              </div>
            </div>

            {(company.address || company.neighborhood || company.city) && (
              <div className="nfse-info-row">
                <div className="nfse-info-col full">
                  <span className="nfse-label">Endereço</span>
                  <span className="nfse-value-text">
                    {company.address}
                    {company.addressNumber ? `, ${company.addressNumber}` : ''}
                    {company.addressComplement ? ` - ${company.addressComplement}` : ''}
                    {company.neighborhood ? `, ${company.neighborhood}` : ''}
                  </span>
                </div>
              </div>
            )}

            <div className="nfse-info-row">
              <div className="nfse-info-col">
                <span className="nfse-label">Email</span>
                <span className="nfse-value-text">{company.email || '-'}</span>
              </div>
              <div className="nfse-info-col">
                <span className="nfse-label">Telefone</span>
                <span className="nfse-value-text">{company.phone || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* LINHA SEPARADORA */}
        <div className="nfse-divider" />

        {/* DESCRIÇÃO DO SERVIÇO */}
        {serviceDescription && (
          <div className="nfse-service-description">
            <h3 className="nfse-section-title">DESCRIÇÃO DO SERVIÇO</h3>
            <p className="nfse-description-text">{serviceDescription}</p>
          </div>
        )}

        {/* TABELA DE ITENS */}
        <div className="nfse-items-section">
          <table className="nfse-table">
            <thead className="nfse-table-header">
              <tr>
                <th style={{ textAlign: 'left', width: '50%' }}>DESCRIÇÃO DO SERVIÇO</th>
                <th style={{ textAlign: 'right', width: '15%' }}>QTD</th>
                <th style={{ textAlign: 'right', width: '17.5%' }}>VLR UNITÁRIO</th>
                <th style={{ textAlign: 'right', width: '17.5%' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody className="nfse-table-body">
              {items.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'left' }}>{item.description}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LINHA SEPARADORA */}
        <div className="nfse-divider" />

        {/* RESUMO FINANCEIRO */}
        <div className="nfse-financial-summary">
          <div className="nfse-summary-left">
            {notes && (
              <div className="nfse-notes-box">
                <h4 className="nfse-notes-title">OBSERVAÇÕES</h4>
                <p className="nfse-notes-text">{notes}</p>
              </div>
            )}

            {bankData && (
              <div className="nfse-bank-box">
                <h4 className="nfse-bank-title">DADOS BANCÁRIOS</h4>
                <div className="nfse-bank-info">
                  <div>
                    <span className="nfse-label">Banco</span>
                    <span className="nfse-value-text">{bankData.bank}</span>
                  </div>
                  <div>
                    <span className="nfse-label">Agência</span>
                    <span className="nfse-value-text">{bankData.agency}</span>
                  </div>
                  <div>
                    <span className="nfse-label">Conta</span>
                    <span className="nfse-value-text">{bankData.account}</span>
                  </div>
                  <div>
                    <span className="nfse-label">Tipo</span>
                    <span className="nfse-value-text">{bankData.accountType}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="nfse-summary-right">
            <div className="nfse-summary-row">
              <span className="nfse-summary-label">Subtotal:</span>
              <span className="nfse-summary-value">{formatCurrency(subtotal)}</span>
            </div>

            {deduction > 0 && (
              <div className="nfse-summary-row">
                <span className="nfse-summary-label">(-) Deduções:</span>
                <span className="nfse-summary-value">{formatCurrency(deduction)}</span>
              </div>
            )}

            {discount > 0 && (
              <div className="nfse-summary-row">
                <span className="nfse-summary-label">(-) Desconto:</span>
                <span className="nfse-summary-value">{formatCurrency(discount)}</span>
              </div>
            )}

            <div className="nfse-summary-row">
              <span className="nfse-summary-label">Base de Cálculo:</span>
              <span className="nfse-summary-value">
                {formatCurrency(subtotal - deduction - discount)}
              </span>
            </div>

            <div className="nfse-summary-row">
              <span className="nfse-summary-label">Impostos:</span>
              <span className="nfse-summary-value">{formatCurrency(tax)}</span>
            </div>

            <div className="nfse-summary-row nfse-total-row">
              <span className="nfse-summary-label">TOTAL:</span>
              <span className="nfse-summary-value-total">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="nfse-footer">
          <p className="nfse-footer-text">
            Documento emitido por Sistema Eletrônico de Serviços Fiscais (NFS-e)
          </p>
          <p className="nfse-footer-text">
            Esta é uma representação de Nota Fiscal de Serviço Eletrônica.
            A autenticidade pode ser verificada no endereço eletrônico da Prefeitura.
          </p>
        </div>
      </div>
    );
  }
);

NFSeModel.displayName = 'NFSeModel';
