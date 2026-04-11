import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { PaginationMeta } from '@/shared/types/pagination';
import { Button } from '@/shared/ui/button';

import './pagination.css';

interface PaginationProps {
  meta?: PaginationMeta;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, loading = false, onPageChange }: PaginationProps): React.JSX.Element | null {
  if (!meta || meta.totalPages <= 1) {
    return null;
  }

  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  return (
    <div className="pagination-v2" role="navigation" aria-label="Paginacao">
      <p className="pagination-v2-info">
        {meta.total.toLocaleString('pt-BR')} registros • Pagina {meta.page} de {meta.totalPages}
      </p>

      <div className="pagination-v2-controls">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev || loading}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft size={14} />
          Anterior
        </Button>

        <span className="pagination-v2-current">{meta.page}</span>

        <Button
          variant="secondary"
          size="sm"
          disabled={!canNext || loading}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Proxima
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

