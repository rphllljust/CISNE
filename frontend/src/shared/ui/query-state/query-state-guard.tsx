import { AlertCircle, Inbox } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

import './query-state-guard.css';

interface QueryStateGuardProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  errorMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingRows?: number;
  loadingHeight?: number;
  children: React.ReactNode;
}

export function QueryStateGuard({
  isLoading,
  isError,
  isEmpty = false,
  onRetry,
  errorMessage = 'Nao foi possivel carregar os dados. Tente novamente.',
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription = 'Nao ha itens para exibir com os filtros atuais.',
  loadingRows = 3,
  loadingHeight = 56,
  children
}: QueryStateGuardProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <Skeleton key={i} height={loadingHeight} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="qs-error">
        <div className="qs-error-icon">
          <AlertCircle size={18} />
        </div>
        <p className="qs-error-title">Falha no carregamento</p>
        <p className="qs-error-message">{errorMessage}</p>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="qs-empty">
        <div className="qs-empty-icon">
          <Inbox size={18} />
        </div>
        <p className="qs-empty-title">{emptyTitle}</p>
        <p className="qs-empty-description">{emptyDescription}</p>
      </div>
    );
  }

  return <>{children}</>;
}
