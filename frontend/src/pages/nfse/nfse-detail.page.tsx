import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { ExternalLink, Copy, Download } from 'lucide-react';
import { useState } from 'react';

type NfseStatus = 'RASCUNHO' | 'EMITIDA' | 'CANCELADA' | 'REJEITADA_SEFAZ' | 'PENDENTE_SEFAZ';

interface NfseDetailData {
  id: string;
  numero?: number | null;
  serie: string;
  dataEmissao: string;
  statusNfse: NfseStatus;
  codigoVerificacao?: string | null;
  valorServicos: number;
  valorIss: number;
  aliquotaIss: number;
  tomadorCpfCnpj: string;
  tomadorRazaoSocial?: string | null;
  codigoServico: string;
  prestadorCnpj: string;
  discriminacao: string;
  valorDeducoes?: number | null;
  retencaoIrrf?: number | null;
  retencaoPis?: number | null;
  retencaoCofins?: number | null;
  urlNfse?: string | null;
}

export default function NfseDetailPage() {
  const { nfseId } = useParams<{ nfseId: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: nfse, isLoading, refetch } = useQuery({
    queryKey: ['nfse', nfseId],
    queryFn: async (): Promise<NfseDetailData> => {
      const res = await api.get<NfseDetailData>(`/nfse/${nfseId}`);
      return res.data;
    },
    refetchInterval: 5000
  });

  const consultarMutation = useMutation({
    mutationFn: async (): Promise<unknown> => {
      const res = await api.get(`/nfse/consultar/${nfseId}`);
      return res.data;
    },
    onSuccess: () => {
      void refetch();
    }
  });

  const cancelarMutation = useMutation({
    mutationFn: async (motivo: string): Promise<unknown> => {
      const res = await api.delete(`/nfse/${nfseId}?motivo=${encodeURIComponent(motivo)}`);
      return res.data;
    },
    onSuccess: () => {
      void refetch();
    }
  });

  if (isLoading) {
    return <Spinner />;
  }

  if (!nfse) {
    return (
      <Alert variant="destructive">
        <AlertTitle>NFS-e nÃ£o encontrada</AlertTitle>
      </Alert>
    );
  }

  const statusConfig = {
    RASCUNHO: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
    EMITIDA: { label: 'Emitida', color: 'bg-green-100 text-green-800' },
    CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
    REJEITADA_SEFAZ: { label: 'Rejeitada', color: 'bg-red-100 text-red-800' },
    PENDENTE_SEFAZ: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' }
  };

  const status = statusConfig[nfse.statusNfse as keyof typeof statusConfig];
  const isEmitted = nfse.statusNfse === 'EMITIDA';
  const isCanceled = nfse.statusNfse === 'CANCELADA';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">NFS-e #{nfse.numero}</h1>
          <p className="text-muted-foreground mt-2">
            SÃ©rie {nfse.serie} - {new Date(nfse.dataEmissao).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">NÃºmero NFS-e</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nfse.numero}</p>
            <p className="text-xs text-muted-foreground mt-2">DV: {nfse.codigoVerificacao}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Valor da NFS-e</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(nfse.valorServicos)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ISS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(nfse.valorIss)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              AlÃ­quota: {(nfse.aliquotaIss * 100).toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da NFS-e</CardTitle>
          <CardDescription>InformaÃ§Ãµes fiscais e de identificaÃ§Ã£o</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Tomador (CPF/CNPJ)</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {nfse.tomadorCpfCnpj}
                </code>
                <button type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(nfse.tomadorCpfCnpj);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Copy size={16} />
                </button>{copied ? <span style={{ fontSize: 12, marginLeft: 8 }}>Copiado</span> : null}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">RazÃ£o Social Tomador</p>
              <p className="font-medium mt-1">{nfse.tomadorRazaoSocial}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">CÃ³digo de ServiÃ§o</p>
              <p className="font-mono font-medium mt-1">{nfse.codigoServico}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Prestador CNPJ</p>
              <p className="font-mono font-medium mt-1">{nfse.prestadorCnpj}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">DiscriminaÃ§Ã£o</p>
            <p className="mt-2 text-sm leading-relaxed">{nfse.discriminacao}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor de ServiÃ§os</span>
              <span className="font-medium">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(nfse.valorServicos)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DeduÃ§Ãµes</span>
              <span className="font-medium">
                -{new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(nfse.valorDeducoes || 0)}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold">
              <span>Valor LÃ­quido</span>
              <span>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(nfse.valorServicos - (nfse.valorDeducoes || 0))}
              </span>
            </div>
            <div className="pt-3 space-y-2 border-t text-sm">
              {nfse.retencaoIrrf > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IRRF</span>
                  <span>
                    -{new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(nfse.retencaoIrrf)}
                  </span>
                </div>
              )}
              {nfse.retencaoPis > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PIS</span>
                  <span>
                    -{new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(nfse.retencaoPis)}
                  </span>
                </div>
              )}
              {nfse.retencaoCofins > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">COFINS</span>
                  <span>
                    -{new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(nfse.retencaoCofins)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isEmitted && nfse.urlNfse && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Acesso Ã  NFS-e</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              A NFS-e foi emitida com sucesso e pode ser consultada ou baixada atravÃ©s dos links abaixo:
            </p>
            <div className="flex gap-2">
              <Button asChild variant="default">
                <a href={nfse.urlNfse} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2" size={16} />
                  Visualizar no Portal da Prefeitura
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={nfse.urlNfse} download>
                  <Download className="mr-2" size={16} />
                  Download PDF
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {isEmitted && !isCanceled && (
          <>
            <Button
              onClick={() => void consultarMutation.mutate()}
              variant="outline"
              disabled={consultarMutation.isPending}
            >
              {consultarMutation.isPending ? 'Consultando...' : 'Consultar Status na SEFAZ'}
            </Button>
            <Button
              onClick={() => {
                const motivo = prompt('Motivo do cancelamento:');
                if (motivo) {
                  void cancelarMutation.mutate(motivo);
                }
              }}
              variant="destructive"
              disabled={cancelarMutation.isPending}
            >
              {cancelarMutation.isPending ? 'Cancelando...' : 'Cancelar NFS-e'}
            </Button>
          </>
        )}
        <Button onClick={() => navigate(-1)} variant="outline">
          Voltar
        </Button>
      </div>
    </div>
  );
}

